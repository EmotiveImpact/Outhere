// The Supabase side of the Fighter Pack: the RPCs, the avatar-pack Edge
// Function, Black-only poses opening the upgrade sheet on Black, and fighter
// keys becoming public URLs on player views.

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("expo-image-manipulator", () => ({ manipulateAsync: async (uri) => ({ uri: `${uri}#small` }), SaveFormat: { JPEG: "jpeg", WEBP: "webp" } }));

const calls = [];
const result = { data: null, error: null };
const invoked = [];
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
    functions: {
      invoke: async (name, { body }) => {
        invoked.push([name, body]);
        if (body.action === "selfie-url") return { data: { key: `selfies/u1/scan1234/${body.angle}.jpg`, scanId: "scan1234", url: "https://r2/put", headers: { "Content-Type": "image/jpeg" } }, error: null };
        if (body.action === "verify") return { data: { verified: true, verifiedAt: "2026-10-16T10:00:00Z" }, error: null };
        if (body.action === "delete") return { data: { ok: true, state: { status: "none", images: [], picks: {}, fighter: null } }, error: null };
        return { data: { submitted: 8 }, error: null };
      },
    },
    storage: { from: () => ({ getPublicUrl: (p) => ({ data: { publicUrl: `https://cdn/${p}` } }) }) },
  },
}));

process.env.EXPO_PUBLIC_AVATAR_URL = "https://pics.example/";
global.fetch = jest.fn(async (url) => (url === "https://r2/put" ? { ok: true } : { blob: async () => ({ size: 1234 }) }));

const remote = require("../remote");

beforeEach(() => {
  calls.length = 0;
  invoked.length = 0;
  result.data = null;
  result.error = null;
});

const STATE = {
  status: "making",
  packId: "p1",
  consentedAt: "2026-10-16T09:00:00Z",
  verifiedAt: "2026-10-16T09:01:00Z",
  images: [{ slot: "vs", set: "race", pose: "sprint", name: "vs", path: null, status: "pending" }],
  picks: { race: "sprint", win: "fistUp", respect: "nod" },
  fighter: { vs: "avatars/u1/p0/vs.webp", win: "avatars/u1/p0/win.webp" },
};

test("starting a pack goes through start_pack, then asks the function to generate", async () => {
  result.data = STATE;
  const s = await remote.startPack();
  expect(calls.some((c) => c[0] === "rpc" && c[1] === "start_pack")).toBe(true);
  expect(invoked).toContainEqual(["avatar-pack", { action: "generate", packId: "p1" }]);
  expect(s.status).toBe("making");
  expect(s.consentedAt).toBe(Date.parse("2026-10-16T09:00:00Z"));
  expect(s.fighter).toEqual({ vs: "https://pics.example/avatars/u1/p0/vs.webp", win: "https://pics.example/avatars/u1/p0/win.webp" });
  expect(s.images[0]).toMatchObject({ slot: "vs", set: "race", pose: "sprint", url: null, status: "pending" });
});

test("a Black-only pose opens the upgrade sheet on Black", async () => {
  result.error = { message: "TIER_REQUIRED", hint: "black" };
  await expect(remote.setPackPose({ set: "win", pose: "roar" })).rejects.toMatchObject({ code: "TIER_REQUIRED", requiredTier: "black" });
  expect(calls.find((c) => c[0] === "rpc" && c[1] === "set_pack_pose")[2]).toEqual({ p_set: "win", p_pose: "roar" });
  result.error = { message: "TIER_REQUIRED", hint: "pro" };
  await expect(remote.startPack()).rejects.toMatchObject({ code: "TIER_REQUIRED", requiredTier: "pro" });
});

test("pack errors read well", async () => {
  result.error = { message: "NOT_ENOUGH_CREDITS" };
  await expect(remote.rerollPackSlot("vs")).rejects.toMatchObject({ code: "NOT_ENOUGH_CREDITS", message: "Not enough credits for that yet." });
  result.error = { message: "UNDER_18" };
  await expect(remote.recordPackConsent()).rejects.toMatchObject({ code: "UNDER_18" });
});

test("scan shots go up through a presigned link, then the scan is verified", async () => {
  const shot = await remote.uploadScanShot({ angle: "left", uri: "file:///left.jpg" });
  expect(shot).toEqual({ key: "selfies/u1/scan1234/left.jpg" });
  expect(invoked[0][1]).toMatchObject({ action: "selfie-url", angle: "left", size: 1234 });
  expect(global.fetch).toHaveBeenCalledWith("file:///left.jpg#small");
  await remote.uploadScanShot({ angle: "right", uri: "file:///right.jpg" });
  expect(invoked[1][1].scanId).toBe("scan1234");
  const v = await remote.verifyScan({ keys: ["a", "b", "c"] });
  expect(v).toEqual({ verified: true, verifiedAt: Date.parse("2026-10-16T10:00:00Z") });
});

test("credits come from pack_credits with the next grant as a time", async () => {
  result.data = { tier: "pro", locked: false, balance: 4, monthly: 4, cap: 12, nextGrantAt: "2026-11-01T00:00:00Z", packCost: 8, rerollCost: 1 };
  const c = await remote.getPackCredits();
  expect(c).toMatchObject({ tier: "pro", balance: 4, nextGrantAt: Date.parse("2026-11-01T00:00:00Z") });
});

test("deleting goes through the function so the files go too", async () => {
  const s = await remote.deletePack();
  expect(invoked).toContainEqual(["avatar-pack", { action: "delete" }]);
  expect(s.status).toBe("none");
});

test("the runner choice is saved on the profile", async () => {
  await remote.setRunner({ runner: "either", runnerFigure: "woman" });
  expect(calls).toContainEqual(["update", { runner: "either", runner_figure: "woman" }]);
  await expect(remote.setRunner({ runner: "robot" })).rejects.toMatchObject({ code: "BAD_RUNNER" });
});

test("player reads ask for the fighter and turn its keys into URLs", async () => {
  result.data = [{ id: "u2", username: "kemi", display_name: "Kemi", tier: "black", runner: "woman", runner_figure: "man", fighter: { vs: "avatars/u2/p9/vs.webp" } }];
  const people = await remote.searchPlayers("kemi");
  const select = calls.find((c) => c[0] === "select");
  expect(select[1]).toContain("runner, runner_figure, fighter");
  expect(people[0]).toMatchObject({ runner: "woman", runnerFigure: null, fighter: { vs: "https://pics.example/avatars/u2/p9/vs.webp" } });
});
