import json
import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional

import psycopg
from psycopg.rows import dict_row


def _encode(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _encode(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_encode(v) for v in value]
    return value


def _parse_dt(value: Any) -> Any:
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            return value
    return value


def _cmp(lhs: Any, rhs: Any, op: str) -> bool:
    left = _parse_dt(lhs)
    right = _parse_dt(rhs)
    if op == "$gt":
        return left > right
    if op == "$gte":
        return left >= right
    if op == "$lt":
        return left < right
    if op == "$lte":
        return left <= right
    if op == "$in":
        return left in right
    return False


def _match_doc(doc: Dict[str, Any], query: Dict[str, Any]) -> bool:
    if not query:
        return True

    for key, expected in query.items():
        if key == "$or":
            return any(_match_doc(doc, sub) for sub in expected)

        actual = doc.get(key)
        if isinstance(expected, dict):
            for op, op_value in expected.items():
                if op == "$in" and isinstance(actual, list):
                    if not any(item in op_value for item in actual):
                        return False
                    continue
                if not _cmp(actual, op_value, op):
                    return False
            continue

        if isinstance(actual, list):
            if expected not in actual:
                return False
            continue

        if actual != expected:
            return False

    return True


class QueryCursor:
    def __init__(self, collection: "Collection", query: Dict[str, Any]):
        self.collection = collection
        self.query = query
        self._limit: Optional[int] = None
        self._sort_field: Optional[str] = None
        self._sort_dir: int = 1

    def sort(self, field: str, direction: int):
        self._sort_field = field
        self._sort_dir = direction
        return self

    def limit(self, limit: int):
        self._limit = limit
        return self

    async def to_list(self, _limit: int):
        docs = await self.collection._load_docs()
        docs = [doc for doc in docs if _match_doc(doc, self.query)]
        if self._sort_field:
            docs.sort(key=lambda d: d.get(self._sort_field), reverse=self._sort_dir < 0)
        limit = self._limit if self._limit is not None else _limit
        return docs[:limit]


class AggregateCursor:
    def __init__(self, collection: "Collection", pipeline: List[Dict[str, Any]]):
        self.collection = collection
        self.pipeline = pipeline

    async def to_list(self, limit: int):
        rows: List[Dict[str, Any]] = await self.collection._load_docs()
        for stage in self.pipeline:
            if "$match" in stage:
                rows = [doc for doc in rows if _match_doc(doc, stage["$match"])]
            elif "$group" in stage:
                group = stage["$group"]
                group_key = group["_id"]
                grouped: Dict[str, Dict[str, Any]] = {}
                for doc in rows:
                    if group_key is None:
                        key = "null"
                        key_value = None
                    elif isinstance(group_key, str) and group_key.startswith("$"):
                        key_value = doc.get(group_key[1:])
                        key = str(key_value)
                    else:
                        key_value = group_key
                        key = str(group_key)

                    if key not in grouped:
                        grouped[key] = {"_id": key_value}
                        for out_field in group:
                            if out_field != "_id":
                                grouped[key][out_field] = 0
                        grouped[key]["__count"] = 0

                    grouped[key]["__count"] += 1
                    for out_field, expr in group.items():
                        if out_field == "_id":
                            continue
                        if "$sum" in expr:
                            target = expr["$sum"]
                            if isinstance(target, str) and target.startswith("$"):
                                grouped[key][out_field] += doc.get(target[1:], 0) or 0
                            elif isinstance(target, int):
                                grouped[key][out_field] += target
                        elif "$avg" in expr:
                            target = expr["$avg"]
                            if isinstance(target, str) and target.startswith("$"):
                                grouped[key][out_field] += doc.get(target[1:], 0) or 0

                for _, g in grouped.items():
                    for out_field, expr in group.items():
                        if out_field == "_id":
                            continue
                        if "$avg" in expr:
                            g[out_field] = g[out_field] / max(1, g["__count"])
                    g.pop("__count", None)
                rows = list(grouped.values())
            elif "$sort" in stage:
                sort_field, direction = next(iter(stage["$sort"].items()))
                rows.sort(key=lambda d: d.get(sort_field), reverse=direction < 0)
            elif "$limit" in stage:
                rows = rows[: stage["$limit"]]
        return rows[:limit]


@dataclass
class UpdateResult:
    matched_count: int


class Collection:
    def __init__(self, db: "PostgresDocStore", name: str):
        self.db = db
        self.name = name

    async def _load_docs(self) -> List[Dict[str, Any]]:
        async with await psycopg.AsyncConnection.connect(self.db.dsn) as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(
                    "SELECT doc_id, data FROM app_documents WHERE collection = %s",
                    (self.name,),
                )
                rows = await cur.fetchall()
        docs = []
        for row in rows:
            data = row["data"] if isinstance(row["data"], dict) else json.loads(row["data"])
            data["_id"] = row["doc_id"]
            docs.append(data)
        return docs

    async def find_one(self, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        docs = await self._load_docs()
        for doc in docs:
            if _match_doc(doc, query):
                return doc
        return None

    async def insert_one(self, doc: Dict[str, Any]):
        doc_id = doc.get("_id", str(uuid.uuid4()))
        payload = _encode({k: v for k, v in doc.items() if k != "_id"})
        async with await psycopg.AsyncConnection.connect(self.db.dsn) as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    INSERT INTO app_documents(collection, doc_id, data)
                    VALUES (%s, %s, %s::jsonb)
                    ON CONFLICT (collection, doc_id) DO UPDATE SET data = EXCLUDED.data
                    """,
                    (self.name, doc_id, json.dumps(payload)),
                )
            await conn.commit()

    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any]) -> UpdateResult:
        doc = await self.find_one(query)
        if not doc:
            return UpdateResult(matched_count=0)

        if "$set" in update:
            doc.update(update["$set"])
        if "$addToSet" in update:
            for key, value in update["$addToSet"].items():
                arr = doc.get(key, [])
                if value not in arr:
                    arr.append(value)
                doc[key] = arr
        if "$pull" in update:
            for key, value in update["$pull"].items():
                arr = doc.get(key, [])
                doc[key] = [item for item in arr if item != value]

        await self.insert_one(doc)
        return UpdateResult(matched_count=1)

    def find(self, query: Optional[Dict[str, Any]] = None) -> QueryCursor:
        return QueryCursor(self, query or {})

    async def count_documents(self, query: Dict[str, Any]) -> int:
        docs = await self._load_docs()
        return len([doc for doc in docs if _match_doc(doc, query)])

    def aggregate(self, pipeline: List[Dict[str, Any]]) -> AggregateCursor:
        return AggregateCursor(self, pipeline)


class PostgresDocStore:
    def __init__(self, dsn: str):
        self.dsn = dsn
        self.users = Collection(self, "users")
        self.steps = Collection(self, "steps")
        self.groups = Collection(self, "groups")
        self.messages = Collection(self, "messages")
        self.challenges = Collection(self, "challenges")
        self.group_challenges = Collection(self, "group_challenges")
        self.daily_checkins = Collection(self, "daily_checkins")
        self.missions = Collection(self, "missions")
        self.battles = Collection(self, "battles")

    async def initialize(self):
        async with await psycopg.AsyncConnection.connect(self.dsn) as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS app_documents (
                      collection TEXT NOT NULL,
                      doc_id TEXT NOT NULL,
                      data JSONB NOT NULL,
                      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                      PRIMARY KEY (collection, doc_id)
                    );
                    """
                )
            await conn.commit()
