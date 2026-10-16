// The Supabase adapter: database errors become friendly engine errors, and a
// signed in member who hasn't picked a username yet still sees onboarding.

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
    from: () => chain(),
    rpc: (...args) => {
      calls.push(["rpc", ...args]);
      return chain();
    },
    storage: { from: () => ({ getPublicUrl: (p) => ({ data: { publicUrl: `https://cdn/${p}` } }) }) },
  },
}));

const remote = require("../remote");

beforeEach(() => {
  calls.length = 0;
  result.data = null;
  result.error = null;
});

test("profile is null until onboarding is finished", async () => {
  result.data = { id: "u1", username: "mover", onboarded_at: null };
  expect(await remote.getProfile()).toBeNull();
});

test("database error codes become readable messages", async () => {
  result.error = { message: "NOT_ENOUGH_OUT" };
  await expect(remote.reserveDrop("d1")).rejects.toMatchObject({ code: "NOT_ENOUGH_OUT", message: "Not enough OUT for that yet." });
  result.error = { message: "TIER_REQUIRED", hint: "active_battles" };
  await expect(remote.createBattle({ opponentId: "u2" })).rejects.toMatchObject({ code: "TIER_REQUIRED", requiredTier: "pro" });
});

test("onboarding goes through finish_onboarding", async () => {
  result.data = null;
  await remote.createProfile({ username: "Alex.Out", city: "London" }).catch(() => null);
  const rpcCall = calls.find((c) => c[0] === "rpc" && c[1] === "finish_onboarding");
  expect(rpcCall[2]).toEqual({ p_username: "alex.out", p_display_name: "Alex.Out", p_city: "london" });
});

test("steps are sent as metres and whole numbers", async () => {
  result.data = { steps: 4200, distance_m: 3150 };
  const out = await remote.recordSteps({ date: "2026-10-15", steps: 4200.4, distance: 3.15 });
  expect(calls.find((c) => c[0] === "rpc")[2]).toEqual({ p_day: "2026-10-15", p_steps: 4200, p_distance_m: 3150, p_active_minutes: 42 });
  expect(out).toEqual({ steps: 4200, distance: 3.15 });
});
