// The member's account on the local engine: settings, date of birth and
// under 18 mode, blocked people, the patch picker, the week page and closing
// the account.

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

const engine = require("../engine");
const { buildSummary, crestLetters, mergeSettings, pingsOn } = require("../account");

// Thursday 15 October 2026, 14:00 local.
const THURSDAY = new Date(2026, 9, 15, 14, 0).getTime();

beforeEach(() => {
  jest.useFakeTimers({ now: THURSDAY, doNotFake: ["nextTick", "setImmediate"] });
  engine.__resetForTests();
});
afterEach(() => jest.useRealTimers());

const setUp = async (birthDate = "1994-03-02") => {
  await engine.createProfile({ username: "alexruns", city: "London" });
  if (birthDate) await engine.setBirthDate(birthDate);
};

test("settings start from the demo defaults and merge deeply", async () => {
  await setUp();
  const s = await engine.getSettings();
  expect(s.sound.countdownVoice).toBe("hype");
  expect(s.pings).toEqual({ challenges: true, overtakes: true, club: true, streak: true, drops: false, news: false });
  expect(pingsOn(s)).toBe(5);
  const next = await engine.updateSettings({ pings: { drops: true }, sound: { countdownVoice: "calm" }, textScale: 1.23 });
  expect(next.pings.challenges).toBe(true);
  expect(next.pings.drops).toBe(true);
  expect(next.sound.buzzKm).toBe(true);
  expect(next.sound.countdownVoice).toBe("calm");
  expect(next.textScale).toBe(1.2);
  expect((await engine.getSettings()).privacy.mapVisibility).toBe("friends");
  expect(mergeSettings({}, { textScale: 9 }).textScale).toBe(1.4);
});

test("a date of birth is checked, set once and drives under 18 mode", async () => {
  await setUp(null);
  await expect(engine.setBirthDate("2020-01-01")).rejects.toMatchObject({ code: "TOO_YOUNG" });
  await expect(engine.setBirthDate("2031-01-01")).rejects.toMatchObject({ code: "BAD_DATE" });
  await expect(engine.setBirthDate("2010-02-31")).rejects.toMatchObject({ code: "BAD_DATE" });
  const acc = await engine.setBirthDate("2010-06-01");
  expect(acc.isMinor).toBe(true);
  expect(acc.age).toBe(16);
  await expect(engine.setBirthDate("1990-01-01")).rejects.toMatchObject({ code: "ALREADY_SET" });
  // Never on the map for everyone.
  const s = await engine.updateSettings({ privacy: { mapVisibility: "everyone" } });
  expect(s.privacy.mapVisibility).toBe("friends");
});

test("it lifts on the 18th birthday", async () => {
  await setUp("2008-10-16");
  expect((await engine.getAccount()).isMinor).toBe(true);
  jest.setSystemTime(new Date(2026, 9, 16, 9, 0).getTime());
  expect((await engine.getAccount()).isMinor).toBe(false);
});

test("under 18s battle friends and their club only, and can't order drops", async () => {
  await setUp("2011-01-01");
  const stranger = "p_nia"; // Manchester, not followed
  await expect(engine.createBattle({ opponentId: stranger })).rejects.toMatchObject({ code: "UNDER_18" });
  const friend = (await engine.getFriends())[0].id;
  await expect(engine.createBattle({ opponentId: friend })).resolves.toBeTruthy();
  const drop = (await engine.listDrops())[0];
  await expect(engine.reserveDrop(drop.id)).rejects.toMatchObject({ code: "UNDER_18" });
});

test("a parent can be linked in under 18 mode only", async () => {
  await setUp();
  await expect(engine.linkGuardian({ name: "Mum", contact: "mum@example.com" })).rejects.toMatchObject({ code: "NOT_ALLOWED" });
  engine.__resetForTests();
  await setUp("2012-05-05");
  const acc = await engine.linkGuardian({ name: "Mum", contact: "07700 900123" });
  expect(acc.guardian.name).toBe("Mum");
  expect((await engine.unlinkGuardian()).guardian).toBeNull();
});

test("blocking someone unfollows them and lists them", async () => {
  await setUp();
  const friend = (await engine.getFriends())[0];
  await engine.blockPlayer(friend.id);
  expect((await engine.getFriends()).some((f) => f.id === friend.id)).toBe(false);
  expect((await engine.listBlocked()).map((p) => p.id)).toEqual([friend.id]);
  expect((await engine.getAccount()).blockedCount).toBe(1);
  await engine.unblockPlayer(friend.id);
  expect(await engine.listBlocked()).toEqual([]);
});

test("the patch picker lists UK places, nearest first, and towns play for their region", async () => {
  await setUp();
  const near = await engine.listPatchPlaces({ lat: 53.48, lng: -2.24 });
  expect(near[0].id).toBe("manchester");
  const towns = await engine.listPatchPlaces({ query: "margate" });
  expect(towns).toHaveLength(1);
  expect(towns[0]).toMatchObject({ kind: "town", isLive: false, playsFor: "South East" });
  const areas = await engine.listPatchAreas("london");
  expect(areas.length).toBe(33);
  expect(areas[0].rank).toBe(1);
  expect(areas.find((a) => a.name === "Southwark").short).toBe("SW");
  const southwark = areas.find((a) => a.name === "Southwark");
  const res = await engine.setPatch({ cityId: "london", areaId: southwark.id });
  expect(res).toMatchObject({ city: "London", area: "Southwark", playsFor: null });
  expect((await engine.getProfile()).area).toBe("Southwark");
  await expect(engine.setPatch({ cityId: "manchester", areaId: southwark.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
  const town = await engine.setPatch({ cityId: "margate" });
  expect(town.playsFor).toBe("South East");
  expect((await engine.listPatchAreas("london", "hack")).map((a) => a.name)).toEqual(["Hackney"]);
});

test("your week adds up steps, distance, time, XP and OUT and compares with last week", async () => {
  await setUp();
  // Monday 12 to Thursday 15 October.
  for (const [day, steps] of [["2026-10-12", 6200], ["2026-10-13", 8800], ["2026-10-14", 5400], ["2026-10-15", 10400]]) {
    await engine.recordSteps({ date: day, steps });
  }
  await engine.recordSteps({ date: "2026-10-06", steps: 5000 });
  const week = await engine.getWeekSummary({ period: "week" });
  expect(week.bars.map((b) => b.label)).toEqual(["M", "T", "W", "T", "F", "S", "S"]);
  expect(week.steps).toBe(30800);
  expect(week.best).toEqual({ date: "2026-10-15", steps: 10400 });
  expect(week.counted).toBe(4);
  expect(week.previous.steps).toBe(5000);
  expect(week.change).toBe(516);
  expect(week.beaten).toBe(4);
  expect(week.distanceKm).toBeGreaterThan(20);
  expect(week.xp).toBeGreaterThan(0);
  expect(week.bars[3].today).toBe(true);
  expect(week.bars[4].future).toBe(true);
  const month = await engine.getWeekSummary({ period: "month" });
  expect(month.bars).toHaveLength(31);
  expect(month.steps).toBe(35800);
});

test("buildSummary is the same sum for either data source", () => {
  const s = buildSummary({ period: "week", days: { "2026-10-13": { steps: 1000, distance: 0.8, activeMinutes: 10 } }, ledger: [{ type: "xp", amount: 5, at: new Date(2026, 9, 13, 9).getTime() }] });
  expect(s).toMatchObject({ steps: 1000, distanceKm: 0.8, activeMinutes: 10, xp: 5, out: 0 });
  expect(crestLetters("Tower Hamlets")).toBe("TH");
});

test("export holds your data and closing the account wipes this phone", async () => {
  await setUp();
  const data = await engine.exportMyData();
  expect(data.profile.username).toBe("alexruns");
  expect(data.settings.units).toBe("km");
  await engine.deleteAccount();
  expect(await engine.getProfile()).toBeNull();
});

test("the live count is per city or the whole UK", async () => {
  await setUp();
  const uk = await engine.getOutsideCount();
  const london = await engine.getOutsideCount({ cityId: "london" });
  expect(uk.count).toBeGreaterThanOrEqual(london.count);
});

test("a stranger's waiting invite goes when the member turns out to be under 18", async () => {
  await engine.createProfile({ username: "jadenruns", city: "London" });
  const [invite] = (await engine.listBattles("pending")).filter((b) => b.incoming);
  expect(invite).toBeTruthy();
  await engine.unfollow(invite.opponent.player.id);
  await engine.setBirthDate("2011-05-02");
  expect((await engine.listBattles("pending")).filter((b) => b.incoming)).toHaveLength(0);
});
