import sql from "@/app/api/utils/sql";

const USER_ID = 1;

const clampText = (value, maxLength = 200) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.slice(0, maxLength);
};

const calculateStreaks = (dayRows) => {
  if (!Array.isArray(dayRows) || dayRows.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const days = dayRows
    .map((row) => new Date(row.day))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());

  if (days.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  let currentStreak = 1;
  for (let i = 1; i < days.length; i += 1) {
    const diffDays = Math.round((days[i - 1] - days[i]) / 86400000);
    if (diffDays === 1) currentStreak += 1;
    else break;
  }

  let longestStreak = 1;
  let runningStreak = 1;
  for (let i = 1; i < days.length; i += 1) {
    const diffDays = Math.round((days[i - 1] - days[i]) / 86400000);
    if (diffDays === 1) {
      runningStreak += 1;
      longestStreak = Math.max(longestStreak, runningStreak);
    } else {
      runningStreak = 1;
    }
  }

  return { currentStreak, longestStreak };
};

export async function GET() {
  try {
    const [userRows, summaryRows, streakRows] = await sql.transaction([
      sql`
        SELECT
          id,
          name,
          avatar_url,
          bio,
          location,
          goal,
          total_steps,
          total_distance,
          created_at,
          updated_at
        FROM users
        WHERE id = ${USER_ID}
        LIMIT 1
      `,
      sql`
        SELECT
          COUNT(*)::int AS total_runs,
          COALESCE(SUM(distance), 0) AS total_distance,
          COALESCE(SUM(calories), 0)::int AS total_calories,
          COALESCE(AVG(pace_seconds_per_km), 0)::int AS avg_pace_seconds,
          COALESCE(MAX(distance), 0) AS best_distance,
          COALESCE(MAX(duration_seconds), 0)::int AS longest_duration_seconds,
          COALESCE(MIN(NULLIF(pace_seconds_per_km, 0)), 0)::int AS fastest_pace_seconds,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '6 days')::int AS week_runs,
          COALESCE(SUM(distance) FILTER (WHERE created_at >= NOW() - INTERVAL '6 days'), 0) AS week_distance,
          COALESCE(SUM(calories) FILTER (WHERE created_at >= NOW() - INTERVAL '6 days'), 0)::int AS week_calories
        FROM runs
        WHERE user_id = ${USER_ID}
      `,
      sql`
        SELECT created_at::date AS day
        FROM runs
        WHERE user_id = ${USER_ID}
        GROUP BY created_at::date
        ORDER BY day DESC
        LIMIT 365
      `,
    ]);

    const user = userRows?.[0] || null;
    const summary = summaryRows?.[0] || {
      total_runs: 0,
      total_distance: 0,
      total_calories: 0,
      avg_pace_seconds: 0,
      best_distance: 0,
      longest_duration_seconds: 0,
      fastest_pace_seconds: 0,
      week_runs: 0,
      week_distance: 0,
      week_calories: 0,
    };
    const { currentStreak, longestStreak } = calculateStreaks(streakRows || []);

    return Response.json({
      user,
      summary: {
        totalRuns: Number(summary.total_runs || 0),
        totalDistance: Number(summary.total_distance || 0),
        totalCalories: Number(summary.total_calories || 0),
        avgPaceSeconds: Number(summary.avg_pace_seconds || 0),
        bestDistance: Number(summary.best_distance || 0),
        longestDurationSeconds: Number(summary.longest_duration_seconds || 0),
        fastestPaceSeconds: Number(summary.fastest_pace_seconds || 0),
        weekRuns: Number(summary.week_runs || 0),
        weekDistance: Number(summary.week_distance || 0),
        weekCalories: Number(summary.week_calories || 0),
        currentStreak,
        longestStreak,
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Failed to fetch profile data" },
      { status: 500 },
    );
  }
}

export async function PATCH(request) {
  try {
    const payload = await request.json();

    const name = clampText(payload?.name, 80);
    const avatarUrl = clampText(payload?.avatar_url, 500);
    const bio = clampText(payload?.bio, 240);
    const location = clampText(payload?.location, 120);
    const goal = clampText(payload?.goal, 120);

    await sql.transaction([
      sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT`,
      sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS location TEXT`,
      sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS goal TEXT`,
      sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`,
    ]);

    const updatedRows = await sql`
      UPDATE users
      SET
        name = COALESCE(${name}, name),
        avatar_url = COALESCE(${avatarUrl}, avatar_url),
        bio = COALESCE(${bio}, bio),
        location = COALESCE(${location}, location),
        goal = COALESCE(${goal}, goal),
        updated_at = NOW()
      WHERE id = ${USER_ID}
      RETURNING
        id,
        name,
        avatar_url,
        bio,
        location,
        goal,
        total_steps,
        total_distance,
        created_at,
        updated_at
    `;

    return Response.json({ user: updatedRows?.[0] || null });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
}
