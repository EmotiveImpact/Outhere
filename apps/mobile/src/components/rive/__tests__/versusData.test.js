// The 1v1 card's data: which intro a battle gets, what the card binds, the
// tape rows and the result from your side.

// fighter.js takes imageSource from the UI kit, whose animation libraries
// Jest doesn't load; this is the same function.
jest.mock("@/components/ui", () => ({ imageSource: (src) => (src == null ? null : typeof src === "string" ? { uri: src } : src) }));

const { BIG_STAKE, cardPhoto, clockFor, pickIntro, stepsShort, tapeRows, versusCard, versusResult } = require("../versusData");
const { SHADOW_RUNNERS } = require("../assets");

// Thursday 15 October 2026, 18:45 local: the fourth day of the week.
const NOW = new Date(2026, 9, 15, 18, 45).getTime();

const me = { id: "me", name: "Alex Mensah", area: "Peckham", runner: "man", fighter: null };
const kemi = { id: "p_kemi", name: "Kemi Ade", area: "Brixton", runner: "woman", fighter: null };
const battle = (extra = {}) => ({
  id: "b1",
  mode: "most_steps",
  metric: "steps",
  modeName: "Most steps",
  durationHours: 24,
  stakeOut: 50,
  status: "active",
  me: { player: me, value: null },
  opponent: { player: kemi, value: null },
  ...extra,
});

describe("pickIntro", () => {
  it("strikes for an everyday battle, including the usual 50 stake", () => {
    expect(pickIntro(battle(), { played: 0, mine: 0, theirs: 0 })).toBe("strike");
    expect(pickIntro(battle(), undefined)).toBe("strike");
  });
  it("runs the tape for a rematch, someone you've met or a big stake", () => {
    expect(pickIntro(battle({ rematchOf: "b0" }), null)).toBe("tape");
    expect(pickIntro(battle(), { played: 1, mine: 1, theirs: 0 })).toBe("tape");
    expect(pickIntro(battle({ stakeOut: BIG_STAKE }), null)).toBe("tape");
  });
  it("goes cinematic for a grudge match, a derby or the top of a leaderboard", () => {
    expect(pickIntro(battle(), { played: 4, mine: 2, theirs: 2 })).toBe("cinematic");
    expect(pickIntro(battle(), { played: 4, mine: 3, theirs: 1 })).toBe("tape");
    expect(pickIntro(battle({ isDerby: true }), null)).toBe("cinematic");
    expect(pickIntro(battle({ isTopOfLeaderboard: true }), null)).toBe("cinematic");
  });
  it("lets run for an event battle, above everything else", () => {
    expect(pickIntro(battle({ eventId: "e1", rematchOf: "b0" }), { played: 5, mine: 2, theirs: 3 })).toBe("letsRun");
  });
});

describe("the numbers", () => {
  it("shortens counts the way the tape shows them", () => {
    expect(stepsShort(11_400)).toBe("11.4k");
    expect(stepsShort(9000)).toBe("9k");
    expect(stepsShort(950)).toBe("950");
    expect(stepsShort(1_250_000)).toBe("1.3m");
  });
  it("writes the clock tile in hours, then days", () => {
    expect(clockFor(24)).toBe("24h");
    expect(clockFor(72)).toBe("3d");
    expect(clockFor(undefined)).toBe("24h");
  });
  it("makes each bar a share of the bigger number", () => {
    const rows = tapeRows({
      you: { weekSteps: 40_000, todaySteps: 9000, streak: 6, xp: 1200 },
      them: { weekSteps: 32_000, todaySteps: 12_000, streak: 0, xp: 0 },
      h2h: { mine: 0, theirs: 0 },
      now: NOW,
    });
    expect(rows.map((r) => r.label)).toEqual(["STEPS A DAY", "TODAY", "DAY STREAK", "XP", "HEAD TO HEAD"]);
    expect(rows[0]).toEqual({ label: "STEPS A DAY", you: "10k", them: "8k", youBar: 1, themBar: 0.8 });
    expect(rows[1].youBar).toBe(0.75);
    expect(rows[1].themBar).toBe(1);
    expect(rows[4]).toMatchObject({ you: "0", them: "0", youBar: 0, themBar: 0 });
  });
});

describe("versusCard", () => {
  it("binds names, places, the rule and the tiles", () => {
    const card = versusCard({ battle: battle({ rematchOf: "b0" }), me, opp: kemi, h2h: null, now: NOW });
    expect(card.intro).toBe("tape");
    expect(card.strings).toMatchObject({ youName: "Alex", youCity: "Peckham", themName: "Kemi", themCity: "Brixton", title: "1V1 · REMATCH", rule: "24h · most steps", stake: "50", prize: "100", clock: "24h" });
    expect(card.strings.tape1Label).toBe("STEPS A DAY");
    expect(card.numbers.tape5YouBar).toBe(0);
    expect(card.booleans.youHasPack).toBe(false);
  });
  it("leaves the tape alone for the other intros", () => {
    const card = versusCard({ battle: battle({ isSurprise: true }), me, opp: kemi, h2h: null, now: NOW });
    expect(card.intro).toBe("strike");
    expect(card.strings.title).toBe("1V1 · MYSTERY");
    expect(card.strings.tape1Label).toBeUndefined();
    expect(card.numbers).toEqual({});
  });
  it("uses the photo, else the female shadow runner, else the card's own male one", () => {
    expect(cardPhoto(me, "you")).toBeNull();
    expect(cardPhoto(kemi, "them")).toBe(SHADOW_RUNNERS.womanThem);
    expect(cardPhoto({ runner: "either", runnerFigure: "woman" }, "you")).toBe(SHADOW_RUNNERS.womanYou);
    expect(cardPhoto({ ...kemi, avatar: "https://x.test/k.jpg" }, "them")).toEqual({ uri: "https://x.test/k.jpg" });
    expect(cardPhoto({ ...kemi, fighter: { vs: "https://x.test/vs.png" } }, "them")).toEqual({ uri: "https://x.test/vs.png" });
  });
});

describe("versusResult", () => {
  const done = (extra) => battle({ status: "complete", ...extra });
  it("has no result before the end, or for a draw", () => {
    expect(versusResult(battle())).toBeNull();
    expect(versusResult(done({ result: "draw" }))).toBeNull();
  });
  it("is a knockout when the winner had at least double", () => {
    const won = done({ result: "won", me: { player: me, value: 20_000 }, opponent: { player: kemi, value: 9000 }, prize: { out: 115 } });
    expect(versusResult(won)).toMatchObject({ outcome: "win", ko: true, prize: "115" });
    const close = done({ result: "lost", me: { player: me, value: 9000 }, opponent: { player: kemi, value: 12_000 } });
    expect(versusResult(close)).toMatchObject({ outcome: "lose", ko: false, prize: null });
  });
  it("never knocks out in a timed race", () => {
    expect(versusResult(done({ mode: "live_race", result: "won", me: { player: me, value: 1500 }, opponent: { player: kemi, value: 3100 } })).ko).toBe(false);
  });
  it("shows the winner's win pose and the loser's respect pose, else their card photo", () => {
    const packed = { ...me, fighter: { vs: "https://x.test/vs.png", win: "https://x.test/win.png", respect: "https://x.test/respect.png" } };
    const r = versusResult(done({ result: "lost", me: { player: packed, value: 1 }, opponent: { player: kemi, value: 2 } }));
    expect(r.youResult).toEqual({ uri: "https://x.test/respect.png" });
    expect(r.themResult).toBe(SHADOW_RUNNERS.womanThem);
  });
});
