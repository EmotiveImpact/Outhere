import sql from "@/app/api/utils/sql";

const USER_ID = 1;

const rangeToDays = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  all: null,
};

const parsePositiveInt = (value, fallback, max) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, max);
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const rangeParam = searchParams.get("range") || "30d";
    const range = Object.prototype.hasOwnProperty.call(rangeToDays, rangeParam)
      ? rangeParam
      : "30d";
    const days = rangeToDays[range];

    const limit = Math.max(1, parsePositiveInt(searchParams.get("limit"), 12, 50));
    const offset = parsePositiveInt(searchParams.get("offset"), 0, 2000);

    let runs;
    let countRows;

    if (days === null) {
      [runs, countRows] = await sql.transaction([
        sql`
          SELECT *
          FROM runs
          WHERE user_id = ${USER_ID}
          ORDER BY created_at DESC
          LIMIT ${limit}
          OFFSET ${offset}
        `,
        sql`
          SELECT COUNT(*)::int AS count
          FROM runs
          WHERE user_id = ${USER_ID}
        `,
      ]);
    } else {
      [runs, countRows] = await sql.transaction([
        sql`
          SELECT *
          FROM runs
          WHERE user_id = ${USER_ID}
            AND created_at >= NOW() - (${days} * INTERVAL '1 day')
          ORDER BY created_at DESC
          LIMIT ${limit}
          OFFSET ${offset}
        `,
        sql`
          SELECT COUNT(*)::int AS count
          FROM runs
          WHERE user_id = ${USER_ID}
            AND created_at >= NOW() - (${days} * INTERVAL '1 day')
        `,
      ]);
    }

    const total = Number(countRows?.[0]?.count || 0);
    const nextOffset = offset + runs.length;
    const hasMore = nextOffset < total;

    return Response.json({
      range,
      runs,
      pagination: {
        total,
        limit,
        offset,
        hasMore,
        nextOffset: hasMore ? nextOffset : null,
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Failed to fetch runs" },
      { status: 500 },
    );
  }
}
