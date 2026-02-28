import sql from "@/app/api/utils/sql";

export async function GET() {
  try {
    const leaderboard = await sql`
      SELECT id, name, avatar_url, total_steps, total_distance 
      FROM users 
      ORDER BY total_distance DESC 
      LIMIT 20
    `;
    return Response.json(leaderboard);
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 },
    );
  }
}
