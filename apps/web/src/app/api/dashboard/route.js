import sql from "@/app/api/utils/sql";

export async function GET() {
  try {
    const dashboardData = await sql.transaction([
      sql`SELECT * FROM users WHERE id = 1 LIMIT 1`, // Mocking current user as John
      sql`SELECT * FROM runs WHERE user_id = 1 ORDER BY created_at DESC LIMIT 1`,
      sql`SELECT u.name, u.avatar_url FROM users u LIMIT 10`,
      sql`SELECT * FROM events ORDER BY created_at DESC LIMIT 5`,
      sql`SELECT * FROM runs WHERE user_id = 1 ORDER BY created_at DESC LIMIT 10`,
    ]);

    return Response.json({
      user: dashboardData[0][0],
      lastRun: dashboardData[1][0],
      stories: dashboardData[2],
      events: dashboardData[3],
      recentRuns: dashboardData[4],
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 },
    );
  }
}
