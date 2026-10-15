// The Crew tab over Supabase: every local crew function has a twin, and the
// ones that change things call the right database functions.

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

const calls = [];
const result = { data: null, error: null };
const chain = () => {
  const q = new Proxy(
    {},
    {
      get: (_, key) => {
        if (key === "then") return (resolve) => resolve(result);
        return (...args) => {
          calls.push([key, ...args]);
          return q;
        };
      },
    },
  );
  return q;
};

jest.mock("@/lib/supabase", () => ({
  isRemote: true,
  supabase: {
    auth: { getSession: async () => ({ data: { session: { user: { id: "u1" } } } }), onAuthStateChange: () => {} },
    from: (table) => {
      calls.push(["from", table]);
      return chain();
    },
    rpc: (...args) => {
      calls.push(["rpc", ...args]);
      return chain();
    },
    storage: { from: () => ({ getPublicUrl: (p) => ({ data: { publicUrl: `https://cdn/${p}` } }), createSignedUrls: async () => ({ data: [] }) }) },
  },
}));

const remote = require("../remote");
const engine = require("../engine");

beforeEach(() => {
  calls.length = 0;
  result.data = null;
  result.error = null;
});

const rpcCalls = () => calls.filter((c) => c[0] === "rpc").map((c) => [c[1], c[2]]);

test("every Crew tab function on the phone has a database twin", () => {
  const names = [
    "getCrewHeader", "getCrewRace", "getCrewGoal", "getCrewDays", "listCrewChallenges", "joinCrewChallenge", "getCrewStats", "getCityBoard",
    "getCrewFeed", "postToCrew", "shareRunToCrew", "togglePostLike", "getPostComments", "commentOnPost", "deletePost",
    "getCrewMessages", "sendCrewMessage", "shareToCrewChat", "reactToMessage", "toggleChatRun", "getCrewUnread", "markCrewRead", "getCrewTyping",
    "listCrewsNear", "cancelJoinRequest", "listJoinRequests", "decideJoinRequest", "reportContent", "blockPlayer", "unblockPlayer", "listBlocked",
    "listCrewStories", "listClubStories", "cheerStory", "replyToStory",
  ];
  for (const n of names) {
    expect(typeof engine[n]).toBe("function");
    expect(typeof remote[n]).toBe("function");
  }
});

test("a report with a block goes through report_content", async () => {
  await remote.reportContent({ crewId: "c1", targetType: "post", targetId: "p1", authorId: "u2", reason: "unsafe", block: true });
  expect(rpcCalls()).toContainEqual(["report_content", { p_target_type: "post", p_target_id: "p1", p_reason: "unsafe", p_club: "c1", p_block: "u2", p_detail: null }]);
});

test("joining a route and a crew challenge call the database", async () => {
  result.data = true;
  await remote.toggleChatRun("c1", "m1");
  await remote.joinCrewChallenge("c1", "sunrise", false);
  expect(rpcCalls()).toEqual(expect.arrayContaining([["toggle_chat_run", { p_message: "m1" }], ["join_crew_challenge", { p_club: "c1", p_challenge: "sunrise", p_join: false }]]));
});

test("crew settings map to set_crew_settings", async () => {
  result.data = { id: "c1", club_members: [], name: "Crew" };
  await remote.updateCrew("c1", { privacy: "invite", weeklyGoalKm: 500, chatPolicy: "admins" }).catch(() => {});
  expect(rpcCalls()).toContainEqual(["set_crew_settings", { p_club: "c1", p_join_policy: "request", p_weekly_goal_km: 500, p_chat_admins_only: true }]);
});

test("the race turns database rows into the same shape as the phone", async () => {
  result.data = [{ user_id: "u1", steps: 9000, km: 6.8, rank: 1, id: "u1", display_name: "Me", tier: "pro" }];
  const race = await remote.getCrewRace("c1", "week");
  expect(rpcCalls()[0]).toEqual(["crew_race", { p_club: "c1", p_period: "week" }]);
  expect(race.period).toBe("week");
  expect(Array.isArray(race.rows)).toBe(true);
});
