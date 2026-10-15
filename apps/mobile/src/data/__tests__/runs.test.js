// Move and runs on the local engine: route maths (splits, turns, off route,
// ghosts), saving routes, suggestions from where you stand, run history,
// who's outside, your club live and live sharing.

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

const engine = require("../engine");
const m = require("../runMath");

const THURSDAY = new Date(2026, 9, 15, 18, 45).getTime();
// Somewhere that isn't London, to keep the maths honest about place.
const LEEDS = { latitude: 53.7997, longitude: -1.5492 };

beforeEach(() => {
  jest.useFakeTimers({ now: THURSDAY, doNotFake: ["nextTick", "setImmediate"] });
  engine.__resetForTests();
});
afterEach(() => jest.useRealTimers());

const setUp = async (city = "Leeds") => engine.createProfile({ username: "move.test", city });

// A straight line north at a steady pace with a 30 second surge in km 2.
const lineRun = (km = 3.2, secPerKm = 300) => {
  const pts = [];
  let t = 0;
  for (let i = 0; i <= km * 20; i += 1) {
    const d = i * 50;
    const p = m.destination(LEEDS, 0, d);
    if (i > 0) t += (50 / 1000) * secPerKm * 1000 * (d > 1000 && d <= 2000 ? 0.9 : 1);
    pts.push({ ...p, t, alt: 30 + (i % 10 < 5 ? i % 10 : 10 - (i % 10)) * 2 });
  }
  return pts;
};

describe("run maths", () => {
  test("splits come from the recorded track, fastest lit", () => {
    const splits = m.splitsFor(lineRun());
    expect(splits.map((s) => s.km)).toEqual([1, 2, 3]);
    expect(splits[0].sec).toBeCloseTo(300, -1);
    expect(splits[1].sec).toBeCloseTo(270, -1);
    expect(splits.filter((s) => s.fastest)).toHaveLength(1);
    expect(splits[1].fastest).toBe(true);
    expect(m.splitsFor([{ latitude: 1, longitude: 1 }])).toEqual([]);
  });

  test("climb ignores jitter and needs altitude", () => {
    const climb = m.climbFor(lineRun());
    expect(climb).toBeGreaterThan(50);
    expect(m.climbFor([{ latitude: 1, longitude: 1 }, { latitude: 1.1, longitude: 1 }])).toBeNull();
  });

  test("turns, off route and the way back, from the planned line alone", () => {
    const a = LEEDS;
    const b = m.destination(a, 0, 400); // north 400 m
    const c = m.destination(b, 90, 400); // then east: a right turn
    const d = m.destination(c, 0, 300); // then north: a left turn
    const path = [a, b, c, d];
    const turns = m.turnsFor(path);
    expect(turns.map((t) => t.dir)).toEqual(["right", "left"]);
    expect(turns[0].alongM).toBeCloseTo(400, -1);

    const nav = m.navigate(path, m.destination(a, 0, 150), { turns });
    expect(nav.offRoute).toBe(false);
    expect(nav.next.dir).toBe("right");
    expect(nav.next.inM).toBeCloseTo(250, -1);
    expect(nav.remainingM).toBeCloseTo(950, -1);

    const lost = m.navigate(path, m.destination(m.destination(a, 0, 200), 270, 80), { turns });
    expect(lost.offRoute).toBe(true);
    expect(lost.offM).toBeGreaterThan(45);
    expect(lost.back.metres).toBeGreaterThan(70);
    expect(m.wayBackLabel(270, lost.back.bearing)).toBe("Turn right to rejoin the route");
  });

  test("a ghost knows where your best run was at any second", () => {
    const track = m.ghostTrack(lineRun(2, 300));
    expect(m.ghostAt(track, 0)).toBe(0);
    expect(m.ghostAt(track, 300)).toBeCloseTo(1000, -1);
    expect(m.ghostAt(track, 99999)).toBeCloseTo(2000, -1);
  });

  test("a fresh loop starts and ends where you are, about the right length", () => {
    const loop = m.loopAround(LEEDS, 5, "x");
    expect(m.distanceM(loop[0], LEEDS)).toBeLessThan(1);
    expect(m.distanceM(loop[loop.length - 1], LEEDS)).toBeLessThan(1);
    expect(m.lengthM(loop) / 1000).toBeGreaterThan(4);
    expect(m.lengthM(loop) / 1000).toBeLessThan(6);
    // A loop ends where it starts; its corners still read as turns.
    const turns = m.turnsFor(loop);
    expect(turns.length).toBeGreaterThan(3);
    expect(m.navigate(loop, loop[1]).next).not.toBeNull();
  });

  test("hiding the ends drops the first and last 200 m", () => {
    const pts = lineRun(1.5);
    const trimmed = m.trimEnds(pts);
    expect(m.distanceM(pts[0], trimmed[0])).toBeGreaterThanOrEqual(199);
    expect(m.lengthM(trimmed)).toBeLessThan(m.lengthM(pts) - 380);
  });
});

describe("routes", () => {
  test("save a route, then it shows under Mine with its numbers", async () => {
    await setUp();
    await expect(engine.saveRoute({ name: "x", path: lineRun() })).rejects.toMatchObject({ code: "ROUTE_NAME" });
    await expect(engine.saveRoute({ name: "Tiny", path: [LEEDS, m.destination(LEEDS, 0, 50)] })).rejects.toMatchObject({ code: "ROUTE_TOO_SHORT" });
    const r = await engine.saveRoute({ name: "Morning Loop", path: lineRun(), hideEnds: true, shareWithClub: true });
    expect(r.mine).toBe(true);
    expect(r.distanceKm).toBeCloseTo(3.2, 1);
    expect(r.climbM).toBeGreaterThan(0);
    expect(r.clubId).toBeNull(); // not in a club yet
    const mine = await engine.listRoutes({ scope: "mine" });
    expect(mine.map((x) => x.id)).toEqual([r.id]);
  });

  test("club and popular routes loop round wherever you first open the map", async () => {
    await setUp();
    const popular = await engine.listRoutes({ scope: "popular", near: LEEDS });
    expect(popular.length).toBeGreaterThan(2);
    expect(m.distanceM(popular[0].start, LEEDS)).toBeLessThan(5);
    expect(popular[0].runners).toBeGreaterThanOrEqual(popular[1].runners);
    expect(await engine.listRoutes({ scope: "crew", near: LEEDS })).toEqual([]);
    await engine.joinCrew("c_southbank");
    const crew = await engine.listRoutes({ scope: "crew", near: LEEDS });
    expect(crew.length).toBeGreaterThan(0);
    expect(crew[0].clubName).toBe("Southbank Runners");
  });

  test("a run on a route sets your best, earns, and you race its ghost", async () => {
    await setUp();
    const route = await engine.saveRoute({ name: "Line", path: lineRun(3.2) });
    const startedAt = Date.now() - 20 * 60 * 1000;
    const saved = await engine.saveRun({ type: "run", distanceKm: 3.2, durationSec: 940, startedAt, endedAt: startedAt + 940000, route: lineRun(3.2), routeId: route.id, steps: 4200 });
    expect(saved.earned).toEqual({ xp: 32, out: 3 });
    const detail = await engine.getRoute(route.id);
    expect(detail.stats).toMatchObject({ runs: 1, bestSec: 940, bestRunId: saved.id, outEarned: 3 });
    expect(detail.ghost.track.length).toBeGreaterThan(10);
    expect(detail.leaders.some((l) => l.isMe)).toBe(true);
    const leaders = detail.leaders.map((l) => l.sec);
    expect(leaders).toEqual([...leaders].sort((a, b) => a - b));
  });

  test("suggestions start near you, closest distance first, topped up with fresh loops", async () => {
    await setUp();
    const five = await engine.suggestRoutes({ ...LEEDS, km: 5 });
    expect(five.length).toBeGreaterThanOrEqual(3);
    expect(five.every((r) => Math.abs(r.distanceKm - 5) <= 2)).toBe(true);
    expect(five.every((r) => m.distanceM(r.path[0], LEEDS) < 1500)).toBe(true);
    expect(five.every((r) => r.tag && r.note)).toBe(true);
    const ten = await engine.suggestRoutes({ ...LEEDS, km: 10 });
    expect(ten[0].distanceKm).toBeGreaterThan(7);
  });
});

describe("run history", () => {
  test("week, month and year with splits, PB and feel", async () => {
    await setUp();
    const now = Date.now();
    const a = await engine.saveRun({ type: "run", distanceKm: 3.2, durationSec: 960, startedAt: now - 3600e3, endedAt: now - 2600e3, route: lineRun(3.2, 300) });
    await engine.saveRun({ type: "walk", distanceKm: 2, durationSec: 1500, startedAt: now - 7200e3, endedAt: now - 5600e3, route: lineRun(2, 750) });
    const month = await engine.listRunHistory({ period: "month" });
    expect(month.count).toBe(2);
    expect(month.totalKm).toBeCloseTo(5.2, 1);
    expect(month.yearKm).toBeCloseTo(5.2, 1);
    expect(month.runs.find((r) => r.id === a.id).isPb).toBe(true);
    expect(month.runs[0].route.length).toBeGreaterThan(1);
    const detail = await engine.getRunDetail(a.id);
    expect(detail.splits).toHaveLength(3);
    expect(detail.fastestSplit.km).toBe(2);
    expect(detail.earned.xp).toBe(32);
    expect(detail.area).toBe("Leeds");
    await expect(engine.rateRun(a.id, 9)).rejects.toMatchObject({ code: "BAD_FEEL" });
    await engine.rateRun(a.id, 4);
    expect((await engine.getRunDetail(a.id)).feel).toBe(4);
  });
});

describe("live map and safety", () => {
  test("who's outside and your club live, around wherever you are", async () => {
    await setUp();
    await engine.joinCrew("c_southbank");
    const map = await engine.getOutsideMap(LEEDS);
    expect(map.total).toBeGreaterThan(0);
    expect(map.area).toBe("Leeds");
    for (const p of [...map.crew, ...map.others]) expect(m.distanceM(p, LEEDS)).toBeLessThan(6000);
    const live = await engine.getCrewLive(LEEDS);
    expect(live.club.name).toBe("Southbank Runners");
    for (const p of live.out) {
      expect(p.awayM).toBeGreaterThan(0);
      expect(["Running", "Walking"]).toContain(p.activity);
    }
    if (live.out[0]) {
      await engine.waveAt(live.out[0].player.id);
      expect((await engine.getCrewLive(LEEDS)).out[0].waved).toBe(true);
    }
  });

  test("trusted contacts, a live share and the ten minute check", async () => {
    await setUp();
    await expect(engine.startLiveShare()).rejects.toMatchObject({ code: "NO_CONTACTS" });
    await expect(engine.addTrustedContact({ name: "Mum", phone: "12" })).rejects.toMatchObject({ code: "BAD_PHONE" });
    const mum = await engine.addTrustedContact({ name: "Mum", phone: "+44 7700 900123", mode: "live" });
    await engine.addTrustedContact({ name: "Dan", phone: "07700 900456" });
    await engine.updateSafety({ nightAuto: true });
    const share = await engine.startLiveShare();
    expect(share.link).toContain(share.token);
    let safety = await engine.getSafety();
    expect(safety.nightAuto).toBe(true);
    expect(safety.contacts.find((c) => c.id === mum.id).watching).toBe(true);
    expect(safety.contacts.find((c) => c.name === "Dan").watching).toBe(false);
    expect((await engine.pingLiveShare({ ...LEEDS, stillSec: 30 })).alerted).toBe(false);
    expect((await engine.pingLiveShare({ ...LEEDS, stillSec: 620 })).alerted).toBe(true);
    expect((await engine.pingLiveShare({ ...LEEDS, stillSec: 900 })).alerted).toBe(false);
    const notes = await engine.listNotifications();
    expect(notes[0].title).toBe("We checked on you");
    await engine.stopLiveShare();
    safety = await engine.getSafety();
    expect(safety.share).toBeNull();
  });
});
