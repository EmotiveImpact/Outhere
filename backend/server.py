from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
import uuid
from datetime import datetime, timedelta
from bson import ObjectId
from postgres_docstore import Collection, PostgresDocStore

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Database connection
supabase_db_url = os.environ.get("SUPABASE_DB_URL")
mongo_url = os.environ.get("MONGO_URL")

if supabase_db_url:
    client = None
    db = PostgresDocStore(supabase_db_url)
elif mongo_url:
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'outere_db')]
else:
    # Local dev fallback: in-memory Mongo mock when MONGO_URL is not configured.
    from mongomock_motor import AsyncMongoMockClient

    client = AsyncMongoMockClient()
    db = client[os.environ.get('DB_NAME', 'outere_db')]

app = FastAPI(title="OUT 'ERE API")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str
    username: str
    city: str = "London"
    borough: str = "Central"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    total_steps: int = 0
    total_distance: float = 0.0
    outside_score: int = 0
    current_streak: int = 0
    longest_streak: int = 0
    checkin_streak: int = 0
    longest_checkin_streak: int = 0
    last_active: datetime = Field(default_factory=datetime.utcnow)
    is_outside: bool = False
    daily_goal: int = 10000
    weekly_goal: int = 70000
    avatar_color: str = "#FF6B35"
    avatar_url: Optional[str] = None
    membership_tier: str = "free"  # free | pro | black
    black_eligible: bool = False
    event_badges: List[dict] = []

class UserCreate(BaseModel):
    device_id: str
    username: str
    city: str = "London"
    borough: str = "Central"
    avatar_url: Optional[str] = None

class UserUpdate(BaseModel):
    username: Optional[str] = None
    city: Optional[str] = None
    borough: Optional[str] = None
    daily_goal: Optional[int] = None
    weekly_goal: Optional[int] = None
    avatar_color: Optional[str] = None
    avatar_url: Optional[str] = None


class MembershipStatusResponse(BaseModel):
    device_id: str
    membership_tier: str
    black_eligible: bool


class MembershipUpgradeRequest(BaseModel):
    device_id: str
    tier: str  # pro | black


class MembershipDowngradeRequest(BaseModel):
    device_id: str

class StepRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    device_id: str
    steps: int
    distance: float
    active_minutes: int = 0
    date: str  # YYYY-MM-DD format
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class StepRecordCreate(BaseModel):
    device_id: str
    steps: int
    distance: float
    active_minutes: int = 0
    date: str

class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    device_id: Optional[str] = None
    username: str
    steps: int
    outside_score: int
    streak: int
    city: str
    borough: str
    avatar_color: str
    avatar_url: Optional[str] = None

class Challenge(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    target_steps: int
    start_date: str
    end_date: str
    city: Optional[str] = None
    reward_points: int = 100
    participants: List[str] = []
    is_active: bool = True

class OutsideStatus(BaseModel):
    device_id: str
    is_outside: bool


class DailyCheckInResponse(BaseModel):
    success: bool
    already_checked_in: bool = False
    reward_points: int = 0
    checkin_streak: int = 0
    longest_checkin_streak: int = 0
    user: UserProfile


class MissionCreate(BaseModel):
    creator_device_id: str
    opponent_device_id: str
    metric: str = "steps"  # steps | distance
    target_value: float
    time_limit_minutes: Optional[int] = 45
    reward_points: int = 100
    title: Optional[str] = None
    require_opponent_outside: bool = False


class MissionParticipantProgress(BaseModel):
    device_id: str
    username: str
    avatar_color: str
    avatar_url: Optional[str] = None
    progress_value: float
    progress_percent: float


class MissionProgressResponse(BaseModel):
    id: str
    title: Optional[str] = None
    status: str
    challenger_device_id: Optional[str] = None
    opponent_device_id: Optional[str] = None
    metric: str
    target_value: float
    reward_points: int
    time_limit_minutes: Optional[int] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    winner_device_id: Optional[str] = None
    remaining_seconds: Optional[int] = None
    challenger: MissionParticipantProgress
    opponent: MissionParticipantProgress


class Battle(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str = "1v1"
    metric: str = "steps"
    creator_device_id: str
    opponent_device_id: str
    start_at: datetime
    end_at: datetime
    status: str = "active"  # pending | active | complete | cancelled
    creator_steps: Optional[int] = None
    opponent_steps: Optional[int] = None
    winner_device_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class BattleCreate(BaseModel):
    creator_device_id: str
    opponent_device_id: str
    duration_hours: Optional[int] = None
    end_at: Optional[datetime] = None
    start_at: Optional[datetime] = None


class Event(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    city: str
    location: str
    start_at: datetime
    end_at: datetime
    capacity: int
    organiser_type: str = "outHere"  # outHere | crew | sponsor
    rsvps: List[str] = []
    checkins: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)


class EventRSVPRequest(BaseModel):
    device_id: str


class EventCheckInRequest(BaseModel):
    device_id: str

# ==================== HELPER FUNCTIONS ====================

def calculate_outside_score(steps: int, streak: int, active_minutes: int) -> int:
    """Calculate the Outside Score - a gamified metric"""
    base_score = steps // 100
    streak_bonus = streak * 50
    activity_bonus = active_minutes * 2
    return base_score + streak_bonus + activity_bonus

async def get_or_create_user(device_id: str) -> dict:
    """Get existing user or return None"""
    user = await db.users.find_one({"device_id": device_id})
    return user


async def calculate_checkin_streak(device_id: str) -> int:
    records = await db.daily_checkins.find({"device_id": device_id}).sort("date", -1).to_list(365)
    if not records:
        return 0

    dates = sorted([r["date"] for r in records], reverse=True)
    streak = 0
    current_date = datetime.utcnow().date()

    for date_str in dates:
        record_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        if record_date == current_date:
            streak += 1
            current_date = current_date - timedelta(days=1)
            continue
        if record_date == current_date - timedelta(days=1):
            streak += 1
            current_date = record_date - timedelta(days=1)
            continue
        break

    return streak


def _mission_progress_value(mission: dict, participant_key: str, user: dict) -> float:
    metric = mission.get("metric", "steps")
    if metric == "distance":
        baseline = float(mission.get(f"{participant_key}_start_distance", 0.0) or 0.0)
        current = float(user.get("total_distance", 0.0) or 0.0)
    else:
        baseline = float(mission.get(f"{participant_key}_start_steps", 0.0) or 0.0)
        current = float(user.get("total_steps", 0.0) or 0.0)
    return max(0.0, current - baseline)


def _mission_progress_percent(progress_value: float, target_value: float) -> float:
    if target_value <= 0:
        return 0.0
    return min(100.0, round((progress_value / target_value) * 100.0, 2))


async def _enrich_mission(mission: dict) -> dict:
    challenger_user = await db.users.find_one({"device_id": mission["challenger_device_id"]})
    opponent_user = await db.users.find_one({"device_id": mission["opponent_device_id"]})
    if not challenger_user or not opponent_user:
        raise HTTPException(status_code=404, detail="Mission participant not found")

    target = float(mission.get("target_value", 0) or 0)
    challenger_value = _mission_progress_value(mission, "challenger", challenger_user)
    opponent_value = _mission_progress_value(mission, "opponent", opponent_user)
    challenger_pct = _mission_progress_percent(challenger_value, target)
    opponent_pct = _mission_progress_percent(opponent_value, target)

    now = datetime.utcnow()
    remaining_seconds = None
    deadline = mission.get("deadline_at")
    if mission.get("status") == "active" and deadline:
        if isinstance(deadline, str):
            deadline = datetime.fromisoformat(deadline)
        remaining_seconds = max(0, int((deadline - now).total_seconds()))

    return {
        "id": mission["id"],
        "title": mission.get("title"),
        "status": mission.get("status", "pending"),
        "challenger_device_id": mission.get("challenger_device_id"),
        "opponent_device_id": mission.get("opponent_device_id"),
        "metric": mission.get("metric", "steps"),
        "target_value": target,
        "reward_points": int(mission.get("reward_points", 100) or 100),
        "time_limit_minutes": mission.get("time_limit_minutes"),
        "started_at": mission.get("started_at"),
        "completed_at": mission.get("completed_at"),
        "winner_device_id": mission.get("winner_device_id"),
        "remaining_seconds": remaining_seconds,
        "challenger": {
            "device_id": challenger_user["device_id"],
            "username": challenger_user.get("username", "Unknown"),
            "avatar_color": challenger_user.get("avatar_color", "#FF6B35"),
            "avatar_url": challenger_user.get("avatar_url"),
            "progress_value": round(challenger_value, 2),
            "progress_percent": challenger_pct,
        },
        "opponent": {
            "device_id": opponent_user["device_id"],
            "username": opponent_user.get("username", "Unknown"),
            "avatar_color": opponent_user.get("avatar_color", "#FF6B35"),
            "avatar_url": opponent_user.get("avatar_url"),
            "progress_value": round(opponent_value, 2),
            "progress_percent": opponent_pct,
        },
    }


async def _evaluate_active_mission(mission: dict) -> dict:
    if mission.get("status") != "active":
        return mission

    challenger_user = await db.users.find_one({"device_id": mission["challenger_device_id"]})
    opponent_user = await db.users.find_one({"device_id": mission["opponent_device_id"]})
    if not challenger_user or not opponent_user:
        return mission

    target = float(mission.get("target_value", 0) or 0)
    challenger_value = _mission_progress_value(mission, "challenger", challenger_user)
    opponent_value = _mission_progress_value(mission, "opponent", opponent_user)

    now = datetime.utcnow()
    deadline = mission.get("deadline_at")
    if isinstance(deadline, str):
        deadline = datetime.fromisoformat(deadline)

    should_complete = False
    completion_reason = None
    winner_device_id = None

    if challenger_value >= target or opponent_value >= target:
        should_complete = True
        completion_reason = "target_reached"
        if challenger_value > opponent_value:
            winner_device_id = mission["challenger_device_id"]
        elif opponent_value > challenger_value:
            winner_device_id = mission["opponent_device_id"]
    elif deadline and now >= deadline:
        should_complete = True
        completion_reason = "time_expired"
        if challenger_value > opponent_value:
            winner_device_id = mission["challenger_device_id"]
        elif opponent_value > challenger_value:
            winner_device_id = mission["opponent_device_id"]

    if not should_complete:
        return mission

    update_payload = {
        "status": "completed",
        "completed_at": now,
        "winner_device_id": winner_device_id,
        "completion_reason": completion_reason,
    }

    reward_points = int(mission.get("reward_points", 100) or 100)
    reward_applied = bool(mission.get("reward_applied", False))
    if winner_device_id and not reward_applied:
        winner_user = await db.users.find_one({"device_id": winner_device_id})
        if winner_user:
            await db.users.update_one(
                {"device_id": winner_device_id},
                {"$set": {"outside_score": int(winner_user.get("outside_score", 0)) + reward_points}},
            )
            update_payload["reward_applied"] = True

    await db.missions.update_one({"id": mission["id"]}, {"$set": update_payload})
    fresh = await db.missions.find_one({"id": mission["id"]})
    return fresh or mission


def _parse_iso_datetime(value: str) -> datetime:
    normalized = value.replace("Z", "+00:00") if value.endswith("Z") else value
    return datetime.fromisoformat(normalized)


def _to_naive_utc(dt_value: datetime) -> datetime:
    if dt_value.tzinfo is not None:
        return dt_value.astimezone().replace(tzinfo=None)
    return dt_value


async def _sum_steps_in_window(device_id: str, start_at: datetime, end_at: datetime) -> int:
    start_date = start_at.strftime("%Y-%m-%d")
    end_date = end_at.strftime("%Y-%m-%d")
    pipeline = [
        {"$match": {
            "device_id": device_id,
            "date": {"$gte": start_date, "$lte": end_date}
        }},
        {"$group": {"_id": None, "total_steps": {"$sum": "$steps"}}}
    ]
    result = await db.steps.aggregate(pipeline).to_list(1)
    if not result:
        return 0
    return int(result[0].get("total_steps", 0) or 0)


async def _evaluate_battle_completion(battle: dict) -> dict:
    if battle.get("status") in ["complete", "cancelled"]:
        return battle

    end_at = battle.get("end_at")
    if isinstance(end_at, str):
        end_at = _parse_iso_datetime(end_at)
    end_at = _to_naive_utc(end_at)

    now = datetime.utcnow()
    start_at = battle.get("start_at")
    if isinstance(start_at, str):
        start_at = _parse_iso_datetime(start_at)
    start_at = _to_naive_utc(start_at)

    if battle.get("status") == "pending" and now >= start_at:
        await db.battles.update_one(
            {"id": battle["id"]},
            {"$set": {"status": "active"}}
        )
        battle["status"] = "active"

    if now <= end_at:
        return battle

    creator_steps = await _sum_steps_in_window(
        battle["creator_device_id"],
        start_at,
        end_at,
    )
    opponent_steps = await _sum_steps_in_window(
        battle["opponent_device_id"],
        start_at,
        end_at,
    )

    winner_device_id = None
    if creator_steps > opponent_steps:
        winner_device_id = battle["creator_device_id"]
    elif opponent_steps > creator_steps:
        winner_device_id = battle["opponent_device_id"]

    battle_win_xp = int(os.environ.get("BATTLE_WIN_XP", "100"))
    battle_win_out = int(os.environ.get("BATTLE_WIN_OUT", "10"))
    battle_participation_xp = int(os.environ.get("BATTLE_PARTICIPATION_XP", "25"))
    battle_participation_out = int(os.environ.get("BATTLE_PARTICIPATION_OUT", "3"))

    if winner_device_id:
        loser_device_id = (
            battle["opponent_device_id"]
            if winner_device_id == battle["creator_device_id"]
            else battle["creator_device_id"]
        )
        await _create_xp_transaction(
            winner_device_id,
            "battle_win",
            battle_win_xp,
            {"battle_id": battle["id"], "result": "winner"},
        )
        await _create_out_transaction(
            winner_device_id,
            "battle_win",
            battle_win_out,
            {"battle_id": battle["id"], "result": "winner"},
        )
        await _create_xp_transaction(
            loser_device_id,
            "battle_participation",
            battle_participation_xp,
            {"battle_id": battle["id"], "result": "participant"},
        )
        await _create_out_transaction(
            loser_device_id,
            "battle_participation",
            battle_participation_out,
            {"battle_id": battle["id"], "result": "participant"},
        )
    else:
        for participant in [battle["creator_device_id"], battle["opponent_device_id"]]:
            await _create_xp_transaction(
                participant,
                "battle_participation",
                battle_participation_xp,
                {"battle_id": battle["id"], "result": "draw"},
            )
            await _create_out_transaction(
                participant,
                "battle_participation",
                battle_participation_out,
                {"battle_id": battle["id"], "result": "draw"},
            )

    await db.battles.update_one(
        {"id": battle["id"]},
        {"$set": {
            "status": "complete",
            "creator_steps": creator_steps,
            "opponent_steps": opponent_steps,
            "winner_device_id": winner_device_id,
        }},
    )
    fresh = await db.battles.find_one({"id": battle["id"]})
    return fresh or battle


async def _create_xp_transaction(
    device_id: str,
    tx_type: str,
    amount: int,
    metadata: Optional[dict] = None,
    created_at: Optional[datetime] = None,
):
    await _xp_collection().insert_one({
        "id": str(uuid.uuid4()),
        "device_id": device_id,
        "type": tx_type,
        "amount": int(amount),
        "metadata": metadata or {},
        "created_at": created_at or datetime.utcnow(),
    })


async def _create_out_transaction(
    device_id: str,
    tx_type: str,
    amount: int,
    metadata: Optional[dict] = None,
    created_at: Optional[datetime] = None,
):
    await _out_collection().insert_one({
        "id": str(uuid.uuid4()),
        "device_id": device_id,
        "type": tx_type,
        "amount": int(amount),
        "metadata": metadata or {},
        "created_at": created_at or datetime.utcnow(),
    })


async def _sum_transaction_amount(collection, device_id: str) -> int:
    result = await collection.aggregate([
        {"$match": {"device_id": device_id}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]).to_list(1)
    if not result:
        return 0
    return int(result[0].get("total", 0) or 0)


def _format_recent_transactions(transactions: List[dict]) -> List[dict]:
    formatted = []
    for tx in transactions:
        formatted.append({
            "id": tx.get("id"),
            "device_id": tx.get("device_id"),
            "type": tx.get("type"),
            "amount": int(tx.get("amount", 0) or 0),
            "metadata": tx.get("metadata", {}),
            "created_at": tx.get("created_at"),
        })
    return formatted


def _xp_collection():
    collection = getattr(db, "xp_transactions", None)
    if collection is not None:
        return collection
    if isinstance(db, PostgresDocStore):
        db.xp_transactions = Collection(db, "xp_transactions")
        return db.xp_transactions
    return db.xp_transactions


def _out_collection():
    collection = getattr(db, "out_transactions", None)
    if collection is not None:
        return collection
    if isinstance(db, PostgresDocStore):
        db.out_transactions = Collection(db, "out_transactions")
        return db.out_transactions
    return db.out_transactions


def _events_collection():
    collection = getattr(db, "events", None)
    if collection is not None:
        return collection
    if isinstance(db, PostgresDocStore):
        db.events = Collection(db, "events")
        return db.events
    return db.events


def _normalize_organiser_type(value: Optional[str]) -> str:
    organiser_type = str(value or "outHere").strip()
    if organiser_type in ["outHere", "crew", "sponsor"]:
        return organiser_type
    lowered = organiser_type.lower()
    if lowered == "outhere":
        return "outHere"
    if lowered in ["crew", "sponsor"]:
        return lowered
    return "outHere"


def _coerce_event_doc(event: Optional[dict]) -> Optional[dict]:
    if not event:
        return event

    normalized = dict(event)
    for key in ["start_at", "end_at", "created_at"]:
        value = normalized.get(key)
        if isinstance(value, str):
            try:
                normalized[key] = _to_naive_utc(_parse_iso_datetime(value))
            except Exception:
                normalized[key] = datetime.utcnow()

    if not isinstance(normalized.get("rsvps"), list):
        normalized["rsvps"] = []
    if not isinstance(normalized.get("checkins"), list):
        normalized["checkins"] = []
    if not isinstance(normalized.get("capacity"), int):
        try:
            normalized["capacity"] = int(normalized.get("capacity", 0) or 0)
        except Exception:
            normalized["capacity"] = 0

    normalized["organiser_type"] = _normalize_organiser_type(
        normalized.get("organiser_type")
    )
    return normalized


async def _ensure_default_events():
    existing_count = await _events_collection().count_documents({})
    if existing_count > 0:
        return

    now = datetime.utcnow()
    defaults = [
        Event(
            title="Tonight's Link-Up",
            description="Easy city run and social warmup with the OutHere squad.",
            city="London",
            location="Southbank",
            start_at=now - timedelta(minutes=30),
            end_at=now + timedelta(hours=2),
            capacity=120,
            organiser_type="outHere",
        ),
        Event(
            title="Crew Tempo Session",
            description="Progressive tempo block hosted by local crew captains.",
            city="London",
            location="Victoria Park",
            start_at=now + timedelta(days=1, hours=2),
            end_at=now + timedelta(days=1, hours=4),
            capacity=60,
            organiser_type="crew",
        ),
        Event(
            title="Sponsor Pop-Up Miles",
            description="Community miles + recovery stand with sponsor giveaways.",
            city="London",
            location="Canary Wharf",
            start_at=now + timedelta(days=3, hours=1),
            end_at=now + timedelta(days=3, hours=3),
            capacity=200,
            organiser_type="sponsor",
        ),
    ]
    for event in defaults:
        await _events_collection().insert_one(event.dict())


async def _award_active_day_and_streak(device_id: str, streak: int, date_str: str):
    active_day_xp = int(os.environ.get("ACTIVE_DAY_XP", "50"))
    active_day_out = int(os.environ.get("ACTIVE_DAY_OUT", "5"))
    streak_bonus_xp_7 = int(os.environ.get("STREAK_BONUS_XP_7", "100"))
    streak_bonus_out_7 = int(os.environ.get("STREAK_BONUS_OUT_7", "10"))
    streak_bonus_xp_14 = int(os.environ.get("STREAK_BONUS_XP_14", "200"))
    streak_bonus_out_14 = int(os.environ.get("STREAK_BONUS_OUT_14", "20"))
    streak_bonus_xp_30 = int(os.environ.get("STREAK_BONUS_XP_30", "400"))
    streak_bonus_out_30 = int(os.environ.get("STREAK_BONUS_OUT_30", "40"))

    day_start = datetime.strptime(date_str, "%Y-%m-%d")
    day_end = day_start + timedelta(days=1)

    active_day_exists = await _xp_collection().find_one({
        "device_id": device_id,
        "type": "active_day",
        "created_at": {"$gte": day_start, "$lt": day_end},
    })
    if not active_day_exists:
        await _create_xp_transaction(
            device_id,
            "active_day",
            active_day_xp,
            {"date": date_str},
            day_start,
        )
        await _create_out_transaction(
            device_id,
            "active_day",
            active_day_out,
            {"date": date_str},
            day_start,
        )

    milestone_rewards = {
        7: (streak_bonus_xp_7, streak_bonus_out_7),
        14: (streak_bonus_xp_14, streak_bonus_out_14),
        30: (streak_bonus_xp_30, streak_bonus_out_30),
    }

    existing_streak_txs = await _xp_collection().find({
        "device_id": device_id,
        "type": "streak_bonus",
    }).to_list(200)

    awarded_milestones = set()
    for tx in existing_streak_txs:
        metadata = tx.get("metadata", {})
        milestone = metadata.get("milestone")
        if isinstance(milestone, int):
            awarded_milestones.add(milestone)
        else:
            try:
                awarded_milestones.add(int(milestone))
            except (TypeError, ValueError):
                pass

    for milestone, (xp_amount, out_amount) in milestone_rewards.items():
        if streak >= milestone and milestone not in awarded_milestones:
            metadata = {"milestone": milestone, "date": date_str}
            await _create_xp_transaction(device_id, "streak_bonus", xp_amount, metadata, day_start)
            await _create_out_transaction(device_id, "streak_bonus", out_amount, metadata, day_start)

# ==================== USER ROUTES ====================

@api_router.post("/users", response_model=UserProfile)
async def create_user(user_data: UserCreate):
    """Create a new user profile"""
    existing = await db.users.find_one({"device_id": user_data.device_id})
    if existing:
        return UserProfile(**existing)
    
    user = UserProfile(**user_data.dict())
    await db.users.insert_one(user.dict())
    logger.info(f"Created new user: {user.username}")
    return user

@api_router.get("/users/{device_id}", response_model=UserProfile)
async def get_user(device_id: str):
    """Get user by device ID"""
    user = await db.users.find_one({"device_id": device_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserProfile(**user)

@api_router.put("/users/{device_id}", response_model=UserProfile)
async def update_user(device_id: str, user_update: UserUpdate):
    """Update user profile"""
    update_data = {k: v for k, v in user_update.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.users.update_one(
        {"device_id": device_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = await db.users.find_one({"device_id": device_id})
    return UserProfile(**user)

@api_router.post("/users/{device_id}/outside-status")
async def update_outside_status(device_id: str, status: OutsideStatus):
    """Update user's outside status"""
    await db.users.update_one(
        {"device_id": device_id},
        {"$set": {"is_outside": status.is_outside, "last_active": datetime.utcnow()}}
    )
    return {"success": True}


@api_router.post("/users/{device_id}/checkin", response_model=DailyCheckInResponse)
async def daily_checkin(device_id: str):
    user = await db.users.find_one({"device_id": device_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    today = datetime.utcnow().strftime("%Y-%m-%d")
    existing = await db.daily_checkins.find_one({"device_id": device_id, "date": today})
    if existing:
        fresh_user = await db.users.find_one({"device_id": device_id})
        return DailyCheckInResponse(
            success=True,
            already_checked_in=True,
            reward_points=0,
            checkin_streak=fresh_user.get("checkin_streak", 0),
            longest_checkin_streak=fresh_user.get("longest_checkin_streak", 0),
            user=UserProfile(**fresh_user),
        )

    reward_points = 50
    await db.daily_checkins.insert_one(
        {
            "id": str(uuid.uuid4()),
            "device_id": device_id,
            "date": today,
            "reward_points": reward_points,
            "created_at": datetime.utcnow(),
        }
    )

    checkin_streak = await calculate_checkin_streak(device_id)
    longest_checkin_streak = max(user.get("longest_checkin_streak", 0), checkin_streak)
    new_outside_score = int(user.get("outside_score", 0)) + reward_points

    await db.users.update_one(
        {"device_id": device_id},
        {
            "$set": {
                "is_outside": True,
                "last_active": datetime.utcnow(),
                "outside_score": new_outside_score,
                "checkin_streak": checkin_streak,
                "longest_checkin_streak": longest_checkin_streak,
            }
        },
    )
    fresh_user = await db.users.find_one({"device_id": device_id})
    return DailyCheckInResponse(
        success=True,
        already_checked_in=False,
        reward_points=reward_points,
        checkin_streak=checkin_streak,
        longest_checkin_streak=longest_checkin_streak,
        user=UserProfile(**fresh_user),
    )


# ==================== MEMBERSHIP ROUTES ====================

@api_router.get("/membership/status/{device_id}", response_model=MembershipStatusResponse)
async def get_membership_status(device_id: str):
    user = await db.users.find_one({"device_id": device_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    tier = user.get("membership_tier", "free")
    if tier not in ["free", "pro", "black"]:
        tier = "free"

    return MembershipStatusResponse(
        device_id=device_id,
        membership_tier=tier,
        black_eligible=bool(user.get("black_eligible", False)),
    )


@api_router.post("/membership/upgrade", response_model=MembershipStatusResponse)
async def upgrade_membership(payload: MembershipUpgradeRequest):
    user = await db.users.find_one({"device_id": payload.device_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    target_tier = payload.tier.lower().strip()
    if target_tier not in ["pro", "black"]:
        raise HTTPException(status_code=400, detail="Invalid upgrade tier")

    current_tier = user.get("membership_tier", "free")
    if current_tier not in ["free", "pro", "black"]:
        current_tier = "free"

    black_eligible = bool(user.get("black_eligible", False))
    if target_tier == "black":
        if current_tier != "pro":
            raise HTTPException(status_code=400, detail="Black upgrade requires Pro membership first")
        if not black_eligible:
            raise HTTPException(status_code=400, detail="User is not yet Black eligible")

    await db.users.update_one(
        {"device_id": payload.device_id},
        {"$set": {"membership_tier": target_tier}},
    )

    updated = await db.users.find_one({"device_id": payload.device_id})
    return MembershipStatusResponse(
        device_id=payload.device_id,
        membership_tier=updated.get("membership_tier", "free"),
        black_eligible=bool(updated.get("black_eligible", False)),
    )


@api_router.post("/membership/downgrade", response_model=MembershipStatusResponse)
async def downgrade_membership(payload: MembershipDowngradeRequest):
    user = await db.users.find_one({"device_id": payload.device_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.users.update_one(
        {"device_id": payload.device_id},
        {"$set": {"membership_tier": "free"}},
    )

    updated = await db.users.find_one({"device_id": payload.device_id})
    return MembershipStatusResponse(
        device_id=payload.device_id,
        membership_tier=updated.get("membership_tier", "free"),
        black_eligible=bool(updated.get("black_eligible", False)),
    )

# ==================== STEP TRACKING ROUTES ====================

@api_router.post("/steps", response_model=StepRecord)
async def record_steps(step_data: StepRecordCreate):
    """Record or update daily steps"""
    user = await db.users.find_one({"device_id": step_data.device_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check for existing record for this date
    existing = await db.steps.find_one({
        "device_id": step_data.device_id,
        "date": step_data.date
    })
    
    if existing:
        # Update existing record
        await db.steps.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "steps": step_data.steps,
                "distance": step_data.distance,
                "active_minutes": step_data.active_minutes,
                "updated_at": datetime.utcnow()
            }}
        )
        record = await db.steps.find_one({"_id": existing["_id"]})
    else:
        # Create new record
        record = StepRecord(
            user_id=user["id"],
            **step_data.dict()
        )
        await db.steps.insert_one(record.dict())
        record = record.dict()
    
    # Update user totals and streak
    total_steps = await db.steps.aggregate([
        {"$match": {"device_id": step_data.device_id}},
        {"$group": {"_id": None, "total": {"$sum": "$steps"}, "distance": {"$sum": "$distance"}}}
    ]).to_list(1)
    
    if total_steps:
        # Calculate streak
        streak = await calculate_streak(step_data.device_id)
        outside_score = calculate_outside_score(
            total_steps[0]["total"],
            streak,
            step_data.active_minutes
        )
        black_eligible = bool(user.get("black_eligible", False) or streak >= 14)
        
        await db.users.update_one(
            {"device_id": step_data.device_id},
            {"$set": {
                "total_steps": total_steps[0]["total"],
                "total_distance": total_steps[0]["distance"],
                "outside_score": outside_score,
                "current_streak": streak,
                "longest_streak": max(user.get("longest_streak", 0), streak),
                "black_eligible": black_eligible,
                "last_active": datetime.utcnow()
            }}
        )

        if step_data.steps > 0:
            await _award_active_day_and_streak(
                step_data.device_id,
                streak,
                step_data.date,
            )
    
    return StepRecord(**record)

async def calculate_streak(device_id: str) -> int:
    """Calculate current streak of consecutive days with steps"""
    records = await db.steps.find(
        {"device_id": device_id, "steps": {"$gt": 0}}
    ).sort("date", -1).to_list(100)
    
    if not records:
        return 0
    
    streak = 0
    today = datetime.utcnow().date()
    current_date = today
    
    dates = sorted([r["date"] for r in records], reverse=True)
    
    for date_str in dates:
        record_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        if record_date == current_date or record_date == current_date - timedelta(days=1):
            streak += 1
            current_date = record_date - timedelta(days=1)
        else:
            break
    
    return streak

@api_router.get("/steps/{device_id}/today")
async def get_today_steps(device_id: str):
    """Get today's step count"""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    record = await db.steps.find_one({"device_id": device_id, "date": today})
    if record:
        return StepRecord(**record)
    return {"steps": 0, "distance": 0, "active_minutes": 0, "date": today}

@api_router.get("/steps/{device_id}/history")
async def get_step_history(device_id: str, days: int = 7):
    """Get step history for the past N days"""
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    records = await db.steps.find({
        "device_id": device_id,
        "date": {
            "$gte": start_date.strftime("%Y-%m-%d"),
            "$lte": end_date.strftime("%Y-%m-%d")
        }
    }).sort("date", 1).to_list(days)
    
    return [StepRecord(**r) for r in records]

@api_router.get("/steps/{device_id}/weekly-summary")
async def get_weekly_summary(device_id: str):
    """Get weekly step summary"""
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=7)
    
    pipeline = [
        {
            "$match": {
                "device_id": device_id,
                "date": {
                    "$gte": start_date.strftime("%Y-%m-%d"),
                    "$lte": end_date.strftime("%Y-%m-%d")
                }
            }
        },
        {
            "$group": {
                "_id": None,
                "total_steps": {"$sum": "$steps"},
                "total_distance": {"$sum": "$distance"},
                "total_active_minutes": {"$sum": "$active_minutes"},
                "days_active": {"$sum": 1},
                "avg_steps": {"$avg": "$steps"}
            }
        }
    ]
    
    result = await db.steps.aggregate(pipeline).to_list(1)
    
    if result:
        return {
            "total_steps": result[0]["total_steps"],
            "total_distance": round(result[0]["total_distance"], 2),
            "total_active_minutes": result[0]["total_active_minutes"],
            "days_active": result[0]["days_active"],
            "avg_steps": round(result[0]["avg_steps"], 0)
        }
    return {
        "total_steps": 0,
        "total_distance": 0,
        "total_active_minutes": 0,
        "days_active": 0,
        "avg_steps": 0
    }

# ==================== LEADERBOARD ROUTES ====================

@api_router.get("/leaderboard")
async def get_leaderboard(
    period: str = "daily",
    city: Optional[str] = None,
    borough: Optional[str] = None,
    limit: int = 50
):
    """Get leaderboard - daily, weekly, or all-time"""
    match_query = {}
    if city:
        match_query["city"] = city
    if borough:
        match_query["borough"] = borough
    
    if period == "daily":
        today = datetime.utcnow().strftime("%Y-%m-%d")
        # Get today's steps per user
        pipeline = [
            {"$match": {"date": today}},
            {"$group": {
                "_id": "$device_id",
                "steps": {"$sum": "$steps"}
            }},
            {"$sort": {"steps": -1}},
            {"$limit": limit}
        ]
        step_results = await db.steps.aggregate(pipeline).to_list(limit)
        
        leaderboard = []
        for idx, entry in enumerate(step_results):
            user = await db.users.find_one({"device_id": entry["_id"]})
            if user and (not city or user.get("city") == city):
                leaderboard.append(LeaderboardEntry(
                    rank=idx + 1,
                    user_id=user["id"],
                    device_id=user.get("device_id"),
                    username=user["username"],
                    steps=entry["steps"],
                    outside_score=user.get("outside_score", 0),
                    streak=user.get("current_streak", 0),
                    city=user.get("city", "Unknown"),
                    borough=user.get("borough", "Unknown"),
                    avatar_color=user.get("avatar_color", "#FF6B35"),
                    avatar_url=user.get("avatar_url"),
                ))
        return leaderboard
    
    elif period == "weekly":
        start_date = (datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%d")
        pipeline = [
            {"$match": {"date": {"$gte": start_date}}},
            {"$group": {
                "_id": "$device_id",
                "steps": {"$sum": "$steps"}
            }},
            {"$sort": {"steps": -1}},
            {"$limit": limit}
        ]
        step_results = await db.steps.aggregate(pipeline).to_list(limit)
        
        leaderboard = []
        for idx, entry in enumerate(step_results):
            user = await db.users.find_one({"device_id": entry["_id"]})
            if user and (not city or user.get("city") == city):
                leaderboard.append(LeaderboardEntry(
                    rank=idx + 1,
                    user_id=user["id"],
                    device_id=user.get("device_id"),
                    username=user["username"],
                    steps=entry["steps"],
                    outside_score=user.get("outside_score", 0),
                    streak=user.get("current_streak", 0),
                    city=user.get("city", "Unknown"),
                    borough=user.get("borough", "Unknown"),
                    avatar_color=user.get("avatar_color", "#FF6B35"),
                    avatar_url=user.get("avatar_url"),
                ))
        return leaderboard
    
    else:  # all-time
        if match_query:
            users = await db.users.find(match_query).sort("outside_score", -1).limit(limit).to_list(limit)
        else:
            users = await db.users.find().sort("outside_score", -1).limit(limit).to_list(limit)
        
        return [
            LeaderboardEntry(
                rank=idx + 1,
                user_id=user["id"],
                device_id=user.get("device_id"),
                username=user["username"],
                steps=user.get("total_steps", 0),
                outside_score=user.get("outside_score", 0),
                streak=user.get("current_streak", 0),
                city=user.get("city", "Unknown"),
                borough=user.get("borough", "Unknown"),
                avatar_color=user.get("avatar_color", "#FF6B35"),
                avatar_url=user.get("avatar_url"),
            )
            for idx, user in enumerate(users)
        ]

@api_router.get("/leaderboard/cities")
async def get_city_leaderboard():
    """Get aggregated city rankings"""
    pipeline = [
        {"$group": {
            "_id": "$city",
            "total_steps": {"$sum": "$total_steps"},
            "total_score": {"$sum": "$outside_score"},
            "user_count": {"$sum": 1}
        }},
        {"$sort": {"total_score": -1}},
        {"$limit": 20}
    ]
    
    results = await db.users.aggregate(pipeline).to_list(20)
    return [
        {
            "rank": idx + 1,
            "city": r["_id"],
            "total_steps": r["total_steps"],
            "total_score": r["total_score"],
            "user_count": r["user_count"]
        }
        for idx, r in enumerate(results)
    ]

# ==================== COMMUNITY ROUTES ====================

@api_router.get("/community/outside-now")
async def get_outside_now(city: Optional[str] = None):
    """Get count of users currently outside"""
    # Users active in last 15 minutes are considered "outside"
    threshold = datetime.utcnow() - timedelta(minutes=15)
    
    match_query = {
        "is_outside": True,
        "last_active": {"$gte": threshold}
    }
    if city:
        match_query["city"] = city
    
    count = await db.users.count_documents(match_query)
    
    # Add some simulated users for demo purposes
    import random
    simulated_boost = random.randint(50, 200)
    
    return {
        "count": count + simulated_boost,
        "city": city or "Global",
        "last_updated": datetime.utcnow().isoformat()
    }

# ==================== CHALLENGES ROUTES ====================

@api_router.get("/challenges")
async def get_challenges(city: Optional[str] = None):
    """Get active challenges"""
    query = {"is_active": True}
    if city:
        query["$or"] = [{"city": city}, {"city": None}]
    
    challenges = await db.challenges.find(query).to_list(20)
    
    # If no challenges, create default ones
    if not challenges:
        default_challenges = [
            Challenge(
                title="Weekend Warrior",
                description="Hit 30,000 steps this weekend",
                target_steps=30000,
                start_date=datetime.utcnow().strftime("%Y-%m-%d"),
                end_date=(datetime.utcnow() + timedelta(days=2)).strftime("%Y-%m-%d"),
                reward_points=200
            ),
            Challenge(
                title="Early Bird",
                description="Get 5,000 steps before noon for 3 days",
                target_steps=15000,
                start_date=datetime.utcnow().strftime("%Y-%m-%d"),
                end_date=(datetime.utcnow() + timedelta(days=3)).strftime("%Y-%m-%d"),
                reward_points=150
            ),
            Challenge(
                title="City Champion",
                description="Be in the top 10 of your city this week",
                target_steps=70000,
                start_date=datetime.utcnow().strftime("%Y-%m-%d"),
                end_date=(datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d"),
                reward_points=500
            )
        ]
        for c in default_challenges:
            await db.challenges.insert_one(c.dict())
        return default_challenges
    
    return [Challenge(**c) for c in challenges]

@api_router.post("/challenges/{challenge_id}/join")
async def join_challenge(challenge_id: str, device_id: str):
    """Join a challenge"""
    result = await db.challenges.update_one(
        {"id": challenge_id},
        {"$addToSet": {"participants": device_id}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Challenge not found")
    return {"success": True}

# ==================== GROUPS MODELS ====================

class GroupCreate(BaseModel):
    name: str
    description: str = ""
    creator_device_id: str
    avatar_color: str = "#FF6B35"
    tagline: str = ""
    privacy: str = "public"  # public | request | invite

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    avatar_color: Optional[str] = None


class GroupSettingsUpdate(BaseModel):
    device_id: str
    name: Optional[str] = None
    tagline: Optional[str] = None
    description: Optional[str] = None
    privacy: Optional[str] = None  # public | request | invite


class GroupLogoUploadRequest(BaseModel):
    device_id: str
    logo_url: str
    mime_type: str
    width: int
    height: int
    size_bytes: int

class Group(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    tagline: str = ""
    description: str = ""
    privacy: str = "public"  # public | request | invite
    creator_device_id: str
    members: List[str] = []  # List of device_ids
    roles: Dict[str, str] = {}  # device_id -> owner | mod | member
    logo_url: Optional[str] = None
    tier_badge: str = "starter"
    weekly_active_members: int = 0
    crew_xp: int = 0
    avatar_color: str = "#FF6B35"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    invite_code: str = Field(default_factory=lambda: str(uuid.uuid4())[:8].upper())


def _normalize_membership_tier(tier: Optional[str]) -> str:
    safe_tier = str(tier or "free").lower().strip()
    if safe_tier in ["pro", "black"]:
        return safe_tier
    return "free"


def _ownership_limit_for_tier(tier: str) -> int:
    if tier == "black":
        return 3
    if tier == "pro":
        return 1
    return 0


def _normalize_privacy(value: Optional[str]) -> str:
    safe_privacy = str(value or "public").lower().strip()
    if safe_privacy in ["public", "request", "invite"]:
        return safe_privacy
    return "public"


def _compute_crew_tier_badge(weekly_active_members: int, crew_xp: int) -> str:
    if weekly_active_members >= 20 and crew_xp >= 5000:
        return "legend"
    if weekly_active_members >= 10 and crew_xp >= 2000:
        return "elite"
    if weekly_active_members >= 5 and crew_xp >= 500:
        return "rising"
    return "starter"


async def _enrich_group(group: dict) -> dict:
    if not group:
        return group

    members = list(group.get("members", []) or [])
    creator_device_id = group.get("creator_device_id")

    roles = group.get("roles")
    if not isinstance(roles, dict):
        roles = {}
    roles = dict(roles)

    if creator_device_id:
        roles[creator_device_id] = "owner"
    for member_id in members:
        if roles.get(member_id) not in ["owner", "mod", "member"]:
            roles[member_id] = "member"

    if roles != group.get("roles"):
        await db.groups.update_one(
            {"id": group.get("id")},
            {"$set": {"roles": roles}},
        )
    group["roles"] = roles

    if not members:
        group["weekly_active_members"] = 0
        group["crew_xp"] = 0
        group["tier_badge"] = _compute_crew_tier_badge(0, 0)
        return group

    week_start = (datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%d")
    active_rows = await db.steps.aggregate([
        {
            "$match": {
                "device_id": {"$in": members},
                "date": {"$gte": week_start},
                "steps": {"$gt": 0},
            }
        },
        {"$group": {"_id": "$device_id"}},
    ]).to_list(len(members))
    weekly_active_members = len(active_rows)

    xp_rows = await _xp_collection().aggregate([
        {"$match": {"device_id": {"$in": members}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]).to_list(1)
    crew_xp = int(xp_rows[0].get("total", 0) or 0) if xp_rows else 0

    group["weekly_active_members"] = weekly_active_members
    group["crew_xp"] = crew_xp
    group["tier_badge"] = _compute_crew_tier_badge(weekly_active_members, crew_xp)
    return group

class GroupChallenge(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    group_id: str
    title: str
    description: str
    target_steps: int
    start_date: str
    end_date: str
    creator_device_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class GroupChallengeCreate(BaseModel):
    group_id: str
    title: str
    description: str
    target_steps: int
    end_date: str
    creator_device_id: str

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    group_id: str
    sender_device_id: str
    sender_username: str
    message_type: str = "text"  # text, image, voice
    content: str  # text content or base64 for media
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ChatMessageCreate(BaseModel):
    group_id: str
    sender_device_id: str
    message_type: str = "text"
    content: str

# ==================== GROUPS ROUTES ====================

@api_router.post("/groups", response_model=Group)
async def create_group(group_data: GroupCreate):
    """Create a new group"""
    user = await db.users.find_one({"device_id": group_data.creator_device_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    membership_tier = _normalize_membership_tier(user.get("membership_tier"))
    ownership_limit = _ownership_limit_for_tier(membership_tier)
    if ownership_limit == 0:
        raise HTTPException(status_code=403, detail="Free membership cannot create crews")

    owned_crews = await db.groups.count_documents({"creator_device_id": group_data.creator_device_id})
    if owned_crews >= ownership_limit:
        raise HTTPException(
            status_code=403,
            detail=f"Crew ownership limit reached for {membership_tier} tier",
        )

    privacy = _normalize_privacy(group_data.privacy)
    group = Group(
        name=group_data.name.strip(),
        tagline=group_data.tagline.strip(),
        description=group_data.description,
        privacy=privacy,
        creator_device_id=group_data.creator_device_id,
        members=[group_data.creator_device_id],
        roles={group_data.creator_device_id: "owner"},
        avatar_color=group_data.avatar_color
    )
    await db.groups.insert_one(group.dict())
    logger.info(f"Created new group: {group.name}")
    stored_group = await db.groups.find_one({"id": group.id})
    enriched_group = await _enrich_group(stored_group or group.dict())
    return Group(**enriched_group)

@api_router.get("/groups/{group_id}", response_model=Group)
async def get_group(group_id: str):
    """Get group by ID"""
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    enriched_group = await _enrich_group(group)
    return Group(**enriched_group)

@api_router.get("/groups/user/{device_id}")
async def get_user_groups(device_id: str):
    """Get all groups a user is a member of"""
    groups = await db.groups.find({"members": device_id}).to_list(50)
    enriched = []
    for group in groups:
        enriched.append(Group(**(await _enrich_group(group))))
    return enriched

@api_router.post("/groups/{group_id}/join")
async def join_group(group_id: str, device_id: str):
    """Join a group by ID"""
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    members = list(group.get("members", []) or [])
    if device_id in members:
        return {"success": True, "message": "Already a member"}

    roles = group.get("roles")
    if not isinstance(roles, dict):
        roles = {}
    roles = dict(roles)

    members.append(device_id)
    if roles.get(device_id) not in ["owner", "mod"]:
        roles[device_id] = "member"

    await db.groups.update_one(
        {"id": group_id},
        {"$set": {"members": members, "roles": roles}}
    )
    return {"success": True, "message": "Joined group"}

@api_router.post("/groups/join-by-code")
async def join_group_by_code(invite_code: str, device_id: str):
    """Join a group using invite code"""
    group = await db.groups.find_one({"invite_code": invite_code.upper()})
    if not group:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    
    members = list(group.get("members", []) or [])
    if device_id in members:
        enriched_group = await _enrich_group(group)
        return {"success": True, "message": "Already a member", "group": Group(**enriched_group)}

    roles = group.get("roles")
    if not isinstance(roles, dict):
        roles = {}
    roles = dict(roles)

    members.append(device_id)
    if roles.get(device_id) not in ["owner", "mod"]:
        roles[device_id] = "member"

    await db.groups.update_one(
        {"invite_code": invite_code.upper()},
        {"$set": {"members": members, "roles": roles}}
    )
    updated_group = await db.groups.find_one({"invite_code": invite_code.upper()})
    enriched_group = await _enrich_group(updated_group)
    return {"success": True, "message": "Joined group", "group": Group(**enriched_group)}

@api_router.post("/groups/{group_id}/leave")
async def leave_group(group_id: str, device_id: str):
    """Leave a group"""
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    members = [member_id for member_id in (group.get("members", []) or []) if member_id != device_id]
    roles = group.get("roles")
    if not isinstance(roles, dict):
        roles = {}
    roles = dict(roles)
    departed_role = roles.pop(device_id, None)

    if departed_role == "owner" and members:
        next_owner = members[0]
        roles[next_owner] = "owner"

    await db.groups.update_one(
        {"id": group_id},
        {"$set": {"members": members, "roles": roles}}
    )
    return {"success": True}

@api_router.get("/groups/{group_id}/members")
async def get_group_members(group_id: str):
    """Get all members of a group with their step data"""
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    today = datetime.utcnow().strftime("%Y-%m-%d")
    roles = group.get("roles")
    if not isinstance(roles, dict):
        roles = {}
    members_data = []
    
    for device_id in group.get("members", []):
        user = await db.users.find_one({"device_id": device_id})
        if user:
            # Get today's steps
            today_steps = await db.steps.find_one({"device_id": device_id, "date": today})
            members_data.append({
                "device_id": device_id,
                "username": user.get("username", "Unknown"),
                "avatar_color": user.get("avatar_color", "#FF6B35"),
                "avatar_url": user.get("avatar_url"),
                "today_steps": today_steps.get("steps", 0) if today_steps else 0,
                "total_steps": user.get("total_steps", 0),
                "current_streak": user.get("current_streak", 0),
                "outside_score": user.get("outside_score", 0),
                "is_creator": device_id == group.get("creator_device_id"),
                "role": roles.get(
                    device_id,
                    "owner" if device_id == group.get("creator_device_id") else "member"
                ),
            })
    
    # Sort by today's steps
    members_data.sort(key=lambda x: x["today_steps"], reverse=True)
    return members_data

@api_router.get("/groups/{group_id}/leaderboard")
async def get_group_leaderboard(group_id: str, period: str = "daily"):
    """Get group leaderboard"""
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    members = group.get("members", [])
    if not members:
        return []
    
    if period == "daily":
        today = datetime.utcnow().strftime("%Y-%m-%d")
        pipeline = [
            {"$match": {"device_id": {"$in": members}, "date": today}},
            {"$group": {"_id": "$device_id", "steps": {"$sum": "$steps"}}},
            {"$sort": {"steps": -1}}
        ]
    elif period == "weekly":
        start_date = (datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%d")
        pipeline = [
            {"$match": {"device_id": {"$in": members}, "date": {"$gte": start_date}}},
            {"$group": {"_id": "$device_id", "steps": {"$sum": "$steps"}}},
            {"$sort": {"steps": -1}}
        ]
    else:  # all-time
        leaderboard = []
        for device_id in members:
            user = await db.users.find_one({"device_id": device_id})
            if user:
                leaderboard.append({
                    "device_id": device_id,
                    "username": user.get("username"),
                    "steps": user.get("total_steps", 0),
                    "avatar_color": user.get("avatar_color", "#FF6B35"),
                    "avatar_url": user.get("avatar_url"),
                })
        leaderboard.sort(key=lambda x: x["steps"], reverse=True)
        return [{"rank": i+1, **entry} for i, entry in enumerate(leaderboard)]
    
    step_results = await db.steps.aggregate(pipeline).to_list(len(members))
    
    leaderboard = []
    for idx, entry in enumerate(step_results):
        user = await db.users.find_one({"device_id": entry["_id"]})
        if user:
            leaderboard.append({
                "rank": idx + 1,
                "device_id": entry["_id"],
                "username": user.get("username"),
                "steps": entry["steps"],
                "avatar_color": user.get("avatar_color", "#FF6B35"),
                "avatar_url": user.get("avatar_url"),
            })
    
    return leaderboard


@api_router.post("/groups/{group_id}/logo")
async def upload_group_logo(group_id: str, payload: GroupLogoUploadRequest):
    """Upload or update a crew logo URL with constraints."""
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    roles = group.get("roles")
    if not isinstance(roles, dict):
        roles = {}
    caller_role = roles.get(payload.device_id)
    if payload.device_id == group.get("creator_device_id"):
        caller_role = "owner"

    if caller_role != "owner":
        raise HTTPException(status_code=403, detail="Only crew owners can upload logos")

    user = await db.users.find_one({"device_id": payload.device_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    membership_tier = _normalize_membership_tier(user.get("membership_tier"))
    if membership_tier not in ["pro", "black"]:
        raise HTTPException(status_code=403, detail="Pro or Black membership required for logo upload")

    supported_mime = ["image/png", "image/jpeg", "image/jpg"]
    mime_type = str(payload.mime_type or "").lower().strip()
    if mime_type not in supported_mime:
        raise HTTPException(status_code=400, detail="Logo must be PNG or JPG")

    if payload.width <= 0 or payload.height <= 0 or payload.width != payload.height:
        raise HTTPException(status_code=400, detail="Logo must be square")

    max_logo_size_bytes = 2 * 1024 * 1024
    if payload.size_bytes <= 0 or payload.size_bytes > max_logo_size_bytes:
        raise HTTPException(status_code=400, detail="Logo exceeds max size (2MB)")

    if payload.width > 2048:
        raise HTTPException(status_code=400, detail="Logo dimensions exceed 2048x2048 limit")

    logo_url = payload.logo_url.strip()
    if not logo_url:
        raise HTTPException(status_code=400, detail="Logo URL is required")
    lower_logo_url = logo_url.lower()
    is_supported_ext = lower_logo_url.endswith(".png") or lower_logo_url.endswith(".jpg") or lower_logo_url.endswith(".jpeg")
    is_supported_data_uri = lower_logo_url.startswith("data:image/png") or lower_logo_url.startswith("data:image/jpeg")
    if not is_supported_ext and not is_supported_data_uri:
        raise HTTPException(status_code=400, detail="Logo must be PNG or JPG")

    await db.groups.update_one(
        {"id": group_id},
        {"$set": {"logo_url": logo_url}},
    )
    updated = await db.groups.find_one({"id": group_id})
    enriched_group = await _enrich_group(updated)
    return {"success": True, "group": Group(**enriched_group), "logo_url": logo_url}


@api_router.patch("/groups/{group_id}/settings", response_model=Group)
async def update_group_settings(group_id: str, payload: GroupSettingsUpdate):
    """Update crew settings. Owner/mod only."""
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    roles = group.get("roles")
    if not isinstance(roles, dict):
        roles = {}
    caller_role = roles.get(payload.device_id)
    if payload.device_id == group.get("creator_device_id"):
        caller_role = "owner"

    if caller_role not in ["owner", "mod"]:
        raise HTTPException(status_code=403, detail="Owner or mod role required")

    updates = {}
    if payload.name is not None:
        safe_name = payload.name.strip()
        if len(safe_name) < 3 or len(safe_name) > 30:
            raise HTTPException(status_code=400, detail="Name must be 3-30 characters")
        updates["name"] = safe_name

    if payload.tagline is not None:
        safe_tagline = payload.tagline.strip()
        if len(safe_tagline) > 80:
            raise HTTPException(status_code=400, detail="Tagline must be <= 80 characters")
        updates["tagline"] = safe_tagline

    if payload.description is not None:
        safe_description = payload.description.strip()
        if len(safe_description) > 280:
            raise HTTPException(status_code=400, detail="Description must be <= 280 characters")
        updates["description"] = safe_description

    if payload.privacy is not None:
        updates["privacy"] = _normalize_privacy(payload.privacy)

    if updates:
        await db.groups.update_one(
            {"id": group_id},
            {"$set": updates},
        )

    updated = await db.groups.find_one({"id": group_id})
    enriched_group = await _enrich_group(updated)
    return Group(**enriched_group)


@api_router.get("/groups/{group_id}/roles")
async def get_group_roles(group_id: str, device_id: Optional[str] = None):
    """Get crew roles mapping and optional caller role."""
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    enriched_group = await _enrich_group(group)
    roles = enriched_group.get("roles", {}) if isinstance(enriched_group.get("roles"), dict) else {}
    caller_role = roles.get(device_id) if device_id else None
    return {
        "group_id": group_id,
        "roles": roles,
        "caller_role": caller_role,
    }

# ==================== GROUP CHAT ROUTES ====================

@api_router.post("/groups/{group_id}/messages")
async def send_message(group_id: str, message_data: ChatMessageCreate):
    """Send a message to group chat"""
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if message_data.sender_device_id not in group.get("members", []):
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    user = await db.users.find_one({"device_id": message_data.sender_device_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    message = ChatMessage(
        group_id=group_id,
        sender_device_id=message_data.sender_device_id,
        sender_username=user.get("username", "Unknown"),
        message_type=message_data.message_type,
        content=message_data.content
    )
    await db.messages.insert_one(message.dict())
    return message

@api_router.get("/groups/{group_id}/messages")
async def get_messages(group_id: str, limit: int = 50, before: Optional[str] = None):
    """Get messages from group chat"""
    query = {"group_id": group_id}
    if before:
        query["created_at"] = {"$lt": datetime.fromisoformat(before)}
    
    messages = await db.messages.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    messages.reverse()  # Return in chronological order
    return [ChatMessage(**m) for m in messages]

# ==================== GROUP CHALLENGES ROUTES ====================

@api_router.post("/groups/{group_id}/challenges")
async def create_group_challenge(group_id: str, challenge_data: GroupChallengeCreate):
    """Create a challenge for the group"""
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    challenge = GroupChallenge(
        group_id=group_id,
        title=challenge_data.title,
        description=challenge_data.description,
        target_steps=challenge_data.target_steps,
        start_date=datetime.utcnow().strftime("%Y-%m-%d"),
        end_date=challenge_data.end_date,
        creator_device_id=challenge_data.creator_device_id
    )
    await db.group_challenges.insert_one(challenge.dict())
    return challenge

@api_router.get("/groups/{group_id}/challenges")
async def get_group_challenges(group_id: str):
    """Get all challenges for a group"""
    challenges = await db.group_challenges.find({
        "group_id": group_id,
        "is_active": True
    }).sort("created_at", -1).to_list(20)
    return [GroupChallenge(**c) for c in challenges]

@api_router.get("/groups/{group_id}/challenges/{challenge_id}/progress")
async def get_challenge_progress(group_id: str, challenge_id: str):
    """Get progress of all members in a group challenge"""
    challenge = await db.group_challenges.find_one({"id": challenge_id, "group_id": group_id})
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Get steps for each member during challenge period
    progress = []
    for device_id in group.get("members", []):
        user = await db.users.find_one({"device_id": device_id})
        if user:
            pipeline = [
                {"$match": {
                    "device_id": device_id,
                    "date": {
                        "$gte": challenge["start_date"],
                        "$lte": challenge["end_date"]
                    }
                }},
                {"$group": {"_id": None, "total_steps": {"$sum": "$steps"}}}
            ]
            result = await db.steps.aggregate(pipeline).to_list(1)
            steps = result[0]["total_steps"] if result else 0
            
            progress.append({
                "device_id": device_id,
                "username": user.get("username"),
                "avatar_color": user.get("avatar_color", "#FF6B35"),
                "avatar_url": user.get("avatar_url"),
                "steps": steps,
                "target": challenge["target_steps"],
                "progress_percent": min(100, round((steps / challenge["target_steps"]) * 100, 1)),
                "completed": steps >= challenge["target_steps"]
            })
    
    progress.sort(key=lambda x: x["steps"], reverse=True)
    return progress

# ==================== MISSIONS ROUTES ====================

@api_router.post("/missions")
async def create_mission(payload: MissionCreate):
    creator = await db.users.find_one({"device_id": payload.creator_device_id})
    opponent = await db.users.find_one({"device_id": payload.opponent_device_id})
    if not creator or not opponent:
        raise HTTPException(status_code=404, detail="Mission participants not found")
    if payload.creator_device_id == payload.opponent_device_id:
        raise HTTPException(status_code=400, detail="Cannot challenge yourself")
    if payload.metric not in ["steps", "distance"]:
        raise HTTPException(status_code=400, detail="Metric must be 'steps' or 'distance'")
    if payload.target_value <= 0:
        raise HTTPException(status_code=400, detail="Target value must be positive")
    if payload.require_opponent_outside and not opponent.get("is_outside", False):
        raise HTTPException(status_code=400, detail="Opponent is not currently outside")

    mission_id = str(uuid.uuid4())
    now = datetime.utcnow()
    mission = {
        "id": mission_id,
        "title": payload.title or f"Race to {int(payload.target_value):,} {payload.metric}",
        "creator_device_id": payload.creator_device_id,
        "challenger_device_id": payload.creator_device_id,
        "opponent_device_id": payload.opponent_device_id,
        "metric": payload.metric,
        "target_value": float(payload.target_value),
        "time_limit_minutes": payload.time_limit_minutes,
        "reward_points": max(0, int(payload.reward_points)),
        "status": "pending",
        "created_at": now,
        "updated_at": now,
        "started_at": None,
        "deadline_at": None,
        "completed_at": None,
        "winner_device_id": None,
        "reward_applied": False,
        "challenger_start_steps": float(creator.get("total_steps", 0) or 0),
        "opponent_start_steps": float(opponent.get("total_steps", 0) or 0),
        "challenger_start_distance": float(creator.get("total_distance", 0.0) or 0.0),
        "opponent_start_distance": float(opponent.get("total_distance", 0.0) or 0.0),
    }

    await db.missions.insert_one(mission)
    return {"success": True, "mission": await _enrich_mission(mission)}


@api_router.get("/missions/user/{device_id}")
async def list_user_missions(device_id: str, status: Optional[str] = None, limit: int = 20):
    query = {
        "$or": [
            {"challenger_device_id": device_id},
            {"opponent_device_id": device_id},
        ]
    }
    if status:
        query["status"] = status

    missions = await db.missions.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    enriched = []
    for mission in missions:
        mission = await _evaluate_active_mission(mission)
        enriched.append(await _enrich_mission(mission))
    return enriched


@api_router.get("/missions/{mission_id}")
async def get_mission(mission_id: str):
    mission = await db.missions.find_one({"id": mission_id})
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    mission = await _evaluate_active_mission(mission)
    return await _enrich_mission(mission)


@api_router.post("/missions/{mission_id}/accept")
async def accept_mission(mission_id: str, device_id: str):
    mission = await db.missions.find_one({"id": mission_id})
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    if mission.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Mission is not pending")
    if mission.get("opponent_device_id") != device_id:
        raise HTTPException(status_code=403, detail="Only challenged user can accept")

    challenger = await db.users.find_one({"device_id": mission["challenger_device_id"]})
    opponent = await db.users.find_one({"device_id": mission["opponent_device_id"]})
    if not challenger or not opponent:
        raise HTTPException(status_code=404, detail="Mission participant not found")

    now = datetime.utcnow()
    deadline_at = None
    if mission.get("time_limit_minutes"):
        deadline_at = now + timedelta(minutes=int(mission["time_limit_minutes"]))

    await db.missions.update_one(
        {"id": mission_id},
        {
            "$set": {
                "status": "active",
                "started_at": now,
                "deadline_at": deadline_at,
                "updated_at": now,
                "challenger_start_steps": float(challenger.get("total_steps", 0) or 0),
                "opponent_start_steps": float(opponent.get("total_steps", 0) or 0),
                "challenger_start_distance": float(challenger.get("total_distance", 0.0) or 0.0),
                "opponent_start_distance": float(opponent.get("total_distance", 0.0) or 0.0),
            }
        },
    )
    fresh = await db.missions.find_one({"id": mission_id})
    return {"success": True, "mission": await _enrich_mission(fresh)}


@api_router.post("/missions/{mission_id}/decline")
async def decline_mission(mission_id: str, device_id: str):
    mission = await db.missions.find_one({"id": mission_id})
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    if mission.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Mission is not pending")
    if mission.get("opponent_device_id") != device_id:
        raise HTTPException(status_code=403, detail="Only challenged user can decline")

    await db.missions.update_one(
        {"id": mission_id},
        {"$set": {"status": "declined", "declined_by": device_id, "updated_at": datetime.utcnow()}},
    )
    fresh = await db.missions.find_one({"id": mission_id})
    return {"success": True, "mission": await _enrich_mission(fresh)}


@api_router.post("/missions/{mission_id}/forfeit")
async def forfeit_mission(mission_id: str, device_id: str):
    mission = await db.missions.find_one({"id": mission_id})
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    if mission.get("status") != "active":
        raise HTTPException(status_code=400, detail="Mission is not active")
    if device_id not in [mission.get("challenger_device_id"), mission.get("opponent_device_id")]:
        raise HTTPException(status_code=403, detail="Only mission participants can forfeit")

    winner = mission["opponent_device_id"] if device_id == mission["challenger_device_id"] else mission["challenger_device_id"]
    reward_points = int(mission.get("reward_points", 100) or 100)
    winner_user = await db.users.find_one({"device_id": winner})
    if winner_user and not mission.get("reward_applied", False):
        await db.users.update_one(
            {"device_id": winner},
            {"$set": {"outside_score": int(winner_user.get("outside_score", 0)) + reward_points}},
        )

    await db.missions.update_one(
        {"id": mission_id},
        {
            "$set": {
                "status": "completed",
                "completed_at": datetime.utcnow(),
                "winner_device_id": winner,
                "completion_reason": "forfeit",
                "forfeit_device_id": device_id,
                "updated_at": datetime.utcnow(),
                "reward_applied": True,
            }
        },
    )
    fresh = await db.missions.find_one({"id": mission_id})
    return {"success": True, "mission": await _enrich_mission(fresh)}


@api_router.get("/missions/{mission_id}/progress", response_model=MissionProgressResponse)
async def get_mission_progress(mission_id: str):
    mission = await db.missions.find_one({"id": mission_id})
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    mission = await _evaluate_active_mission(mission)
    enriched = await _enrich_mission(mission)
    return MissionProgressResponse(**enriched)


# ==================== BATTLES ROUTES ====================

@api_router.post("/battles", response_model=Battle)
async def create_battle(payload: BattleCreate):
    creator = await db.users.find_one({"device_id": payload.creator_device_id})
    opponent = await db.users.find_one({"device_id": payload.opponent_device_id})
    if not creator or not opponent:
        raise HTTPException(status_code=404, detail="Battle participants not found")
    if payload.creator_device_id == payload.opponent_device_id:
        raise HTTPException(status_code=400, detail="Cannot battle yourself")
    if payload.duration_hours is None and payload.end_at is None:
        raise HTTPException(status_code=400, detail="Provide duration_hours or end_at")

    now = datetime.utcnow()
    start_at = _to_naive_utc(payload.start_at or now)
    if payload.end_at is not None:
        end_at = _to_naive_utc(payload.end_at)
    else:
        hours = int(payload.duration_hours or 0)
        if hours <= 0:
            raise HTTPException(status_code=400, detail="duration_hours must be greater than 0")
        end_at = start_at + timedelta(hours=hours)
    if end_at <= start_at:
        raise HTTPException(status_code=400, detail="end_at must be after start_at")

    daily_limit = int(os.environ.get("BATTLE_DAILY_CREATE_LIMIT", "3"))
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    created_today = await db.battles.count_documents({
        "creator_device_id": payload.creator_device_id,
        "created_at": {"$gte": today_start, "$lt": today_end},
    })
    if created_today >= daily_limit:
        raise HTTPException(status_code=429, detail="Daily battle creation limit reached")

    battle = Battle(
        creator_device_id=payload.creator_device_id,
        opponent_device_id=payload.opponent_device_id,
        start_at=start_at,
        end_at=end_at,
        status="pending" if start_at > now else "active",
    )
    await db.battles.insert_one(battle.dict())
    stored = await db.battles.find_one({"id": battle.id})
    return Battle(**stored)


@api_router.get("/battles/{battle_id}", response_model=Battle)
async def get_battle(battle_id: str):
    battle = await db.battles.find_one({"id": battle_id})
    if not battle:
        raise HTTPException(status_code=404, detail="Battle not found")
    battle = await _evaluate_battle_completion(battle)
    return Battle(**battle)


@api_router.get("/battles/user/{device_id}")
async def list_user_battles(device_id: str, status: str = "all", limit: int = 50):
    query = {
        "$or": [
            {"creator_device_id": device_id},
            {"opponent_device_id": device_id},
        ]
    }
    if status in ["active", "complete", "pending", "cancelled"]:
        query["status"] = status
    elif status != "all":
        raise HTTPException(status_code=400, detail="Invalid status filter")

    battles = await db.battles.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    normalized = []
    for battle in battles:
        battle = await _evaluate_battle_completion(battle)
        normalized.append(Battle(**battle))
    return normalized


@api_router.post("/battles/{battle_id}/cancel")
async def cancel_battle(battle_id: str, device_id: str):
    battle = await db.battles.find_one({"id": battle_id})
    if not battle:
        raise HTTPException(status_code=404, detail="Battle not found")
    if battle.get("creator_device_id") != device_id:
        raise HTTPException(status_code=403, detail="Only creator can cancel this battle")
    if battle.get("status") not in ["pending", "active"]:
        raise HTTPException(status_code=400, detail="Battle cannot be cancelled")

    await db.battles.update_one(
        {"id": battle_id},
        {"$set": {"status": "cancelled"}}
    )
    fresh = await db.battles.find_one({"id": battle_id})
    return {"success": True, "battle": Battle(**fresh)}


@api_router.get("/wallet/{device_id}")
async def get_wallet(device_id: str):
    user = await db.users.find_one({"device_id": device_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    xp_total = await _sum_transaction_amount(_xp_collection(), device_id)
    out_balance = await _sum_transaction_amount(_out_collection(), device_id)

    recent_xp = await _xp_collection().find(
        {"device_id": device_id}
    ).sort("created_at", -1).limit(20).to_list(20)
    recent_out = await _out_collection().find(
        {"device_id": device_id}
    ).sort("created_at", -1).limit(20).to_list(20)

    return {
        "xp_total": xp_total,
        "out_balance": out_balance,
        "recent_xp": _format_recent_transactions(recent_xp),
        "recent_out": _format_recent_transactions(recent_out),
    }


# ==================== EVENTS ROUTES ====================

@api_router.get("/events", response_model=List[Event])
async def get_events(city: Optional[str] = None):
    await _ensure_default_events()

    query = {}
    if city:
        query["city"] = city

    events = await _events_collection().find(query).sort("start_at", 1).limit(100).to_list(100)
    return [Event(**_coerce_event_doc(event)) for event in events]


@api_router.get("/events/{event_id}", response_model=Event)
async def get_event(event_id: str):
    await _ensure_default_events()

    event = await _events_collection().find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return Event(**_coerce_event_doc(event))


@api_router.post("/events/{event_id}/rsvp")
async def rsvp_event(event_id: str, payload: EventRSVPRequest):
    user = await db.users.find_one({"device_id": payload.device_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    event = await _events_collection().find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    normalized_event = _coerce_event_doc(event)
    rsvps = list(normalized_event.get("rsvps", []))

    if payload.device_id in rsvps:
        return {
            "success": True,
            "already_rsvped": True,
            "event": Event(**normalized_event),
        }

    capacity = int(normalized_event.get("capacity", 0) or 0)
    if capacity > 0 and len(rsvps) >= capacity:
        raise HTTPException(status_code=400, detail="Event capacity reached")

    rsvps.append(payload.device_id)
    await _events_collection().update_one(
        {"id": event_id},
        {"$set": {"rsvps": rsvps}},
    )

    updated_event = await _events_collection().find_one({"id": event_id})
    return {
        "success": True,
        "already_rsvped": False,
        "event": Event(**_coerce_event_doc(updated_event)),
    }


@api_router.post("/events/{event_id}/checkin")
async def checkin_event(event_id: str, payload: EventCheckInRequest):
    user = await db.users.find_one({"device_id": payload.device_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    event = await _events_collection().find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    normalized_event = _coerce_event_doc(event)
    now = datetime.utcnow()
    start_at = normalized_event.get("start_at")
    end_at = normalized_event.get("end_at")

    checkin_window_start = start_at - timedelta(hours=1)
    checkin_window_end = end_at + timedelta(hours=1)
    if now < checkin_window_start or now > checkin_window_end:
        raise HTTPException(
            status_code=400,
            detail="Check-in is only available from 1 hour before start until 1 hour after end",
        )

    checkins = list(normalized_event.get("checkins", []))
    rsvps = list(normalized_event.get("rsvps", []))
    if payload.device_id in checkins:
        return {
            "success": True,
            "already_checked_in": True,
            "xp_awarded": 0,
            "out_awarded": 0,
            "event": Event(**normalized_event),
            "user": UserProfile(**user),
        }

    if payload.device_id not in rsvps:
        rsvps.append(payload.device_id)
    checkins.append(payload.device_id)

    await _events_collection().update_one(
        {"id": event_id},
        {"$set": {"rsvps": rsvps, "checkins": checkins}},
    )

    xp_reward = int(os.environ.get("EVENT_CHECKIN_XP", "120"))
    out_reward = int(os.environ.get("EVENT_CHECKIN_OUT", "12"))

    metadata = {
        "event_id": normalized_event.get("id"),
        "event_title": normalized_event.get("title"),
    }
    await _create_xp_transaction(payload.device_id, "event_checkin", xp_reward, metadata)
    await _create_out_transaction(payload.device_id, "event_checkin", out_reward, metadata)

    event_badges = list(user.get("event_badges", []) or [])
    already_has_badge = any(
        isinstance(badge, dict) and badge.get("event_id") == event_id
        for badge in event_badges
    )
    if not already_has_badge:
        event_badges.append(
            {
                "id": f"event-{event_id}",
                "event_id": event_id,
                "title": normalized_event.get("title", "Event"),
                "city": normalized_event.get("city", ""),
                "awarded_at": now,
                "type": "event_checkin",
            }
        )

    await db.users.update_one(
        {"device_id": payload.device_id},
        {"$set": {"event_badges": event_badges}},
    )

    updated_event = await _events_collection().find_one({"id": event_id})
    updated_user = await db.users.find_one({"device_id": payload.device_id})
    return {
        "success": True,
        "already_checked_in": False,
        "xp_awarded": xp_reward,
        "out_awarded": out_reward,
        "event": Event(**_coerce_event_doc(updated_event)),
        "user": UserProfile(**updated_user),
    }

# ==================== STATS ROUTES ====================

@api_router.get("/stats/{device_id}")
async def get_user_stats(device_id: str):
    """Get comprehensive user statistics"""
    user = await db.users.find_one({"device_id": device_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get weekly data
    weekly = await get_weekly_summary(device_id)
    
    # Get monthly stats
    month_start = (datetime.utcnow().replace(day=1)).strftime("%Y-%m-%d")
    monthly_pipeline = [
        {"$match": {"device_id": device_id, "date": {"$gte": month_start}}},
        {"$group": {
            "_id": None,
            "total_steps": {"$sum": "$steps"},
            "total_distance": {"$sum": "$distance"}
        }}
    ]
    monthly_result = await db.steps.aggregate(monthly_pipeline).to_list(1)
    monthly_steps = monthly_result[0]["total_steps"] if monthly_result else 0
    
    return {
        "user": UserProfile(**user),
        "weekly": weekly,
        "monthly_steps": monthly_steps,
        "streak": user.get("current_streak", 0),
        "longest_streak": user.get("longest_streak", 0),
        "outside_score": user.get("outside_score", 0),
        "total_steps": user.get("total_steps", 0),
        "total_distance": round(user.get("total_distance", 0), 2)
    }

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "OUT 'ERE API - WE OUTSIDE", "status": "running"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    if client is not None:
        client.close()


@app.on_event("startup")
async def startup_db():
    if isinstance(db, PostgresDocStore):
        await db.initialize()
