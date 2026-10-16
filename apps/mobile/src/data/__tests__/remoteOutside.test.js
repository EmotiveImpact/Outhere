// Outside over Supabase: rows become the same shapes as the local engine, and
// the database's error codes become readable messages.

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
    storage: { from: () => ({ getPublicUrl: (p) => ({ data: { publicUrl: `https://cdn/${p}` } }) }) },
  },
}));

const remote = require("../remote");

beforeEach(() => {
  calls.length = 0;
  result.data = null;
  result.error = null;
});

test("cities come from public.cities, nearest first", async () => {
  result.data = [
    { id: "london", name: "London", region: "London", region_id: "london", kind: "city", lat: 51.5, lng: -0.12, is_live: true, launch_night: true },
    { id: "leeds", name: "Leeds", region: "Yorkshire", region_id: "yorkshire", kind: "city", lat: 53.8, lng: -1.55, is_live: false, launch_night: true },
  ];
  const list = await remote.listCities({ lat: 53.7, lng: -1.5 });
  expect(list[0]).toEqual(expect.objectContaining({ id: "leeds", regionId: "yorkshire", region: "Yorkshire", isLive: false, launchNight: true }));
  expect(calls).toContainEqual(["from", "cities"]);
});

test("areas come from public.boroughs with their hex tiles", async () => {
  result.data = [{ id: "manchester-ancoats", name: "Ancoats", city_id: "manchester", kind: "area", tile_col: 3, tile_row: 1 }];
  expect(await remote.listAreas("manchester")).toEqual([{ id: "manchester-ancoats", name: "Ancoats", cityId: "manchester", kind: "area", col: 3, row: 1 }]);
  expect(calls).toContainEqual(["eq", "city_id", "manchester"]);
});

test("claiming a drop sends a tidy address to claim_drop", async () => {
  result.data = { id: "o1", ref: "OH-20417", drop_id: "d1", title: "Night Runner 01", status: "claimed", out_spent: 1800, delivery_out: 0, created_at: "2026-10-14T09:02:00Z", arrives_on: "2026-10-17", history: [{ status: "claimed", at: "2026-10-14T09:02:00Z" }] };
  const o = await remote.claimDrop({ dropId: "d1", size: "9", address: { name: " Alex ", line1: "18 Bermondsey St", town: "London", postcode: "se1 3tq" } });
  const call = calls.find((c) => c[0] === "rpc" && c[1] === "claim_drop");
  expect(call[2]).toEqual({ p_drop: "d1", p_size: "9", p_address: { name: "Alex", line1: "18 Bermondsey St", line2: undefined, town: "London", postcode: "SE1 3TQ" }, p_save_address: true });
  expect(o).toEqual(expect.objectContaining({ ref: "OH-20417", statusLabel: "Claimed", outSpent: 1800 }));
  expect(o.history[0].status).toBe("claimed");
});

test("outside error codes read well", async () => {
  result.error = { message: "NOT_A_PICK" };
  await expect(remote.challengePick({ rivalId: "u2" })).rejects.toMatchObject({ code: "NOT_A_PICK", message: "Pick them on Swipe first." });
  result.error = { message: "UNDER_18" };
  await expect(remote.setMysterySettings({ enabled: true })).rejects.toMatchObject({ code: "UNDER_18" });
});

test("call-ups and the city fixture keep the engine's shape", async () => {
  result.data = { fixture: "f1", starts_on: "2026-10-17", kick_off: "06:00", division: "Premier", side: "London", side_kind: "city", opponent: "Manchester", home: "London", away: "Manchester", number: 212, answer: null, squad: 500, pool: 4012, prize_out: 250, open: true };
  expect(await remote.getCallUp()).toEqual(expect.objectContaining({ fixture: "f1", number: 212, pool: 4012, prizeOut: 250, sideKind: "city" }));
  result.data = { id: "f1", status: "live", home: { entry: "e1", kind: "city", id: "london", name: "London", score: 8578, squad_avg: 8240, turnout: 41, squad: 500, active: 4012 }, away: null, mine: { side: "home", number: 212, steps: 6904, to_beat: 2154 } };
  const f = await remote.getCityFixture();
  expect(f.home).toEqual(expect.objectContaining({ squadAvg: 8240, turnout: 41 }));
  expect(f.mine).toEqual(expect.objectContaining({ toBeat: 2154 }));
});
