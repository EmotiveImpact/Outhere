// The Supabase side of the profile area: paying for a plan goes to the web
// checkout, freezes and the emote tray go through their database functions.

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

test("buying a plan opens the web checkout with the plan and billing", async () => {
  const r = await remote.purchaseMembership({ plan: "black", billing: "yearly" });
  expect(r.done).toBe(false);
  expect(r.checkoutUrl).toBe("https://weouthere.app/membership?plan=black&billing=yearly");
  const pro = await remote.purchaseMembership({ plan: "pro", billing: "monthly" });
  expect(pro.checkoutUrl).toBe("https://weouthere.app/membership?plan=pro&billing=monthly");
});

test("cancelling sends you to manage the plan on the web", async () => {
  const r = await remote.cancelMembership();
  expect(r).toMatchObject({ done: false, manageUrl: "https://weouthere.app/membership/manage" });
});

test("a streak freeze goes through use_streak_freeze and its errors read well", async () => {
  result.error = { message: "NO_FREEZES_LEFT" };
  await expect(remote.spendStreakFreeze()).rejects.toMatchObject({ code: "NO_FREEZES_LEFT" });
  expect(calls.some((c) => c[0] === "rpc" && c[1] === "use_streak_freeze")).toBe(true);
});

test("the emote tray is saved with set_emote_tray", async () => {
  result.error = { message: "TRAY_FULL" };
  await expect(remote.setEmoteTray(["fist", "snail"])).rejects.toMatchObject({ code: "TRAY_FULL" });
  const call = calls.find((c) => c[0] === "rpc" && c[1] === "set_emote_tray");
  expect(call[2]).toEqual({ p_emotes: ["fist", "snail"] });
});
