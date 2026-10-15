// The Crew tab on the local engine: the race and the nudge, the goal split by
// member, crew days, challenges, stats, boards, the feed and comments, the
// chat with route cards, reactions, unread counts and replies, join requests,
// settings, reports and blocks, and the club's stories row.

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

const engine = require("../engine");

// Thursday 15 October 2026, 08:00 local: Southbank run tonight at 19:00.
const THURSDAY = new Date(2026, 9, 15, 8, 0).getTime();
const SEC = 1000;

beforeEach(() => {
  jest.useFakeTimers({ now: THURSDAY, doNotFake: ["nextTick", "setImmediate"] });
  engine.__resetForTests();
});
afterEach(() => jest.useRealTimers());

const later = (ms) => jest.setSystemTime(Date.now() + ms);

const inSouthbank = async () => {
  await engine.createProfile({ username: "crew.runner", city: "London" });
  await engine.joinCrew("c_southbank");
};

test("the week's race ranks every member and nudges me at the one above", async () => {
  await inSouthbank();
  await engine.recordSteps({ steps: 4000 });
  const race = await engine.getCrewRace("c_southbank", "week");
  expect(race.rows).toHaveLength(6);
  expect(race.rows[0].share).toBe(1);
  expect(race.rows.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6]);
  expect(race.me).toBeTruthy();
  if (race.me.rank > 1) {
    const above = race.rows[race.me.rank - 2];
    expect(race.nudge).toMatchObject({ kind: "pass", target: above.player, gap: above.steps - race.me.steps + 1 });
    expect(race.nudge.minutes).toBeGreaterThan(0);
  }
  const all = await engine.getCrewRace("c_southbank", "all");
  expect(all.rows[0].steps).toBeGreaterThanOrEqual(race.rows[0].steps);
});

test("the header knows the crew's city rank and who is out", async () => {
  await inSouthbank();
  const head = await engine.getCrewHeader("c_southbank");
  expect(head.city).toBe("London");
  expect(head.cityRank).toBeGreaterThanOrEqual(1);
  expect(head.cityRank).toBeLessThanOrEqual(head.cityCrews);
  expect(head.memberCount).toBeGreaterThan(200);
});

test("crew goal adds up by member, crew days mark the daily target", async () => {
  await inSouthbank();
  const goal = await engine.getCrewGoal("c_southbank");
  expect(goal.goalKm).toBe(300);
  const sum = goal.contributors.reduce((a, c) => a + c.km, 0);
  expect(Math.abs(sum - goal.km)).toBeLessThan(0.6);
  expect(goal.daysLeft).toBe(4);
  const days = await engine.getCrewDays("c_southbank");
  expect(days.daysIn).toBe(31);
  expect(days.firstDow).toBe(3); // 1 October 2026 is a Thursday
  expect(days.days.filter((d) => !d.future)).toHaveLength(15);
  expect(days.hits).toBe(days.days.filter((d) => d.hit).length);
  expect(days.targetKm).toBeCloseTo(300 / 7, 0);
});

test("crew challenges can be joined and left this week", async () => {
  await inSouthbank();
  const list = await engine.listCrewChallenges("c_southbank");
  expect(list.map((c) => c.id)).toContain("sunrise");
  const before = list.find((c) => c.id === "sunrise");
  await engine.joinCrewChallenge("c_southbank", "sunrise");
  const after = (await engine.listCrewChallenges("c_southbank")).find((c) => c.id === "sunrise");
  expect(after.joined).toBe(true);
  expect(after.count).toBe(before.count + 1);
  await engine.joinCrewChallenge("c_southbank", "sunrise", false);
  expect((await engine.listCrewChallenges("c_southbank")).find((c) => c.id === "sunrise").joined).toBe(false);
  await expect(engine.joinCrewChallenge("c_peckham", "sunrise")).rejects.toMatchObject({ code: "FORBIDDEN" });
});

test("stats show when the crew moves, and boards rank crews and areas", async () => {
  await inSouthbank();
  const stats = await engine.getCrewStats("c_southbank");
  expect(stats.heat).toHaveLength(5);
  expect(stats.heat.every((row) => row.length === 7)).toBe(true);
  expect(Math.max(...stats.heat.flat())).toBe(1);
  expect(stats.runs).toBeGreaterThan(0);
  expect(stats.busiest).toMatch(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) /);
  expect(stats.monthLabel).toBe("October");
  const crews = await engine.getCityBoard("crews");
  expect(crews.place).toBe("London");
  expect(crews.rows.some((r) => r.isMine && r.id === "c_southbank")).toBe(true);
  const areas = await engine.getCityBoard("areas");
  expect(areas.kind).toBe("boroughs");
  expect(areas.rows.length).toBeGreaterThan(3);
});

test("a smaller town gets the places board instead of boroughs", async () => {
  await engine.createProfile({ username: "town.runner", city: "Bristol" });
  const areas = await engine.getCityBoard("areas");
  expect(areas.kind).toBe("towns");
  expect(areas.rows.some((r) => r.name === "Bristol" && r.isMine)).toBe(true);
});

test("feed: photo and run posts, kudos and comments, delete", async () => {
  await inSouthbank();
  const feed = await engine.getCrewFeed("c_southbank");
  const big = feed.find((p) => p.kind === "photo");
  expect(big.others).toBe(4);
  expect(big.comments).toBe(6);
  expect(feed.some((p) => p.kind === "run" && p.route?.length > 10)).toBe(true);
  const liked = await engine.togglePostLike("c_southbank", big.id);
  expect(liked).toEqual({ liked: true, count: big.likeCount + 1 });
  await engine.commentOnPost("c_southbank", big.id, "  Class  ");
  const comments = await engine.getPostComments("c_southbank", big.id);
  expect(comments[comments.length - 1]).toMatchObject({ text: "Class", isMine: true });
  const run = await engine.saveRun({ distanceKm: 5.06, durationSec: 1531, route: [[51.5, -0.1], [51.51, -0.11]] });
  const post = await engine.postToCrew("c_southbank", { kind: "route", runId: run.id, text: "Run this with me" });
  expect(post).toMatchObject({ kind: "route", km: 5.06, paceSec: 303, isMine: true });
  await expect(engine.postToCrew("c_southbank", { kind: "text", text: "  " })).rejects.toMatchObject({ code: "BAD_POST" });
  await expect(engine.deletePost("c_southbank", big.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
  await engine.deletePost("c_southbank", post.id);
  expect((await engine.getCrewFeed("c_southbank")).some((p) => p.id === post.id)).toBe(false);
});

test("chat: route cards to join, reactions, battle cards, unread and a reply", async () => {
  await inSouthbank();
  const msgs = await engine.getCrewMessages("c_southbank");
  const route = msgs.find((m) => m.kind === "route");
  expect(route.data.title).toBe("Bridges at Night");
  expect(route.reactions[0]).toMatchObject({ emoji: "flame", count: 4, mine: false });
  expect(await engine.toggleChatRun("c_southbank", route.id)).toMatchObject({ going: true, count: 3 });
  const photo = msgs.find((m) => m.kind === "photo");
  const reacted = await engine.reactToMessage("c_southbank", photo.id, "heart");
  expect(reacted.reactions.find((r) => r.emoji === "heart")).toMatchObject({ count: 7, mine: true });
  expect(msgs.some((m) => m.kind === "battle" && m.data.won)).toBe(true);

  await engine.markCrewRead("c_southbank");
  expect(await engine.getCrewUnread("c_southbank")).toBe(0);
  const sent = await engine.sendCrewMessage("c_southbank", "Who's in tonight?");
  expect(sent.isMine).toBe(true);
  later(3 * SEC);
  const typing = await engine.getCrewTyping("c_southbank");
  later(6 * SEC);
  const after = await engine.getCrewMessages("c_southbank");
  if (typing) {
    expect(after[after.length - 1].isMine).toBe(false);
    expect(await engine.getCrewUnread("c_southbank")).toBeGreaterThanOrEqual(1);
  }
});

test("sharing a finished battle and my last run into the chat", async () => {
  await inSouthbank();
  const run = await engine.saveRun({ distanceKm: 6, durationSec: 1800, route: [[51.5, -0.1], [51.51, -0.11]] });
  const card = await engine.shareToCrewChat("c_southbank", { kind: "route", runId: run.id });
  expect(card).toMatchObject({ kind: "route", imGoing: true, going: 1 });
  await expect(engine.shareToCrewChat("c_southbank", { kind: "battle", battleId: "nope" })).rejects.toMatchObject({ code: "NOT_FOUND" });
});

test("admins-only chat, ask to join, and answering requests", async () => {
  await engine.createProfile({ username: "captain", city: "London" });
  await engine.setTier("pro");
  const crew = await engine.createCrew({ name: "Rye Lane Runners" });
  await engine.updateCrew(crew.id, { privacy: "request", weeklyGoalKm: 500, chatPolicy: "admins" });
  const updated = await engine.getCrew(crew.id);
  expect(updated).toMatchObject({ joinPolicy: "request", chatPolicy: "admins", weeklyGoalKm: 500 });
  await expect(engine.updateCrew(crew.id, { weeklyGoalKm: 2 })).rejects.toMatchObject({ code: "BAD_GOAL" });
  const reqs = await engine.listJoinRequests(crew.id);
  expect(reqs).toHaveLength(2);
  await engine.decideJoinRequest(crew.id, reqs[0].id, true);
  await engine.decideJoinRequest(crew.id, reqs[1].id, false);
  const after = await engine.getCrew(crew.id);
  expect(after.members.map((m) => m.player.id)).toContain(reqs[0].player.id);
  expect(after.members.map((m) => m.player.id)).not.toContain(reqs[1].player.id);
  await expect(engine.decideJoinRequest(crew.id, reqs[0].id, true)).rejects.toMatchObject({ code: "NOT_FOUND" });
});

test("asking to join a crew that says yes first", async () => {
  await engine.createProfile({ username: "asker", city: "London" });
  const near = await engine.listCrewsNear();
  expect(near.find((c) => c.id === "c_peckham").joinPolicy).toBe("request");
  const asked = await engine.joinCrew("c_peckham");
  expect(asked).toMatchObject({ isMember: false, requested: true });
  later(45 * SEC);
  await engine.listCrewsNear();
  expect((await engine.listMyCrews()).map((c) => c.id)).toContain("c_peckham");
  const note = (await engine.listNotifications())[0];
  expect(note.title).toBe("You're in");
});

test("report a post and block the person: their posts, messages and stories go", async () => {
  await inSouthbank();
  const feed = await engine.getCrewFeed("c_southbank");
  const kemi = feed.find((p) => p.author.id === "p_kemi");
  await expect(engine.reportContent({ crewId: "c_southbank", targetType: "post", targetId: kemi.id, authorId: "p_kemi", reason: "rude" })).rejects.toMatchObject({ code: "BAD_REASON" });
  await engine.reportContent({ crewId: "c_southbank", targetType: "post", targetId: kemi.id, authorId: "p_kemi", reason: "unsafe", block: true });
  expect((await engine.getCrewFeed("c_southbank")).some((p) => p.author.id === "p_kemi")).toBe(false);
  expect((await engine.getCrewMessages("c_southbank")).some((m) => m.authorId === "p_kemi")).toBe(false);
  expect(await engine.listStories("p_kemi")).toEqual([]);
  expect((await engine.listBlocked()).map((p) => p.id)).toEqual(["p_kemi"]);
  await engine.unblockPlayer("p_kemi");
  expect((await engine.getCrewFeed("c_southbank")).some((p) => p.author.id === "p_kemi")).toBe(true);
});

test("the club posts a story on run day, and I'm coming tonight", async () => {
  await inSouthbank();
  later(5 * 60 * 60 * SEC); // 13:00
  const row = await engine.listCrewStories("c_southbank");
  const club = row.find((r) => r.kind === "club");
  expect(club).toMatchObject({ story: "unwatched", crewId: "c_southbank" });
  const [story] = await engine.listClubStories("c_southbank");
  expect(story.caption).toMatch(/^Club run tonight\. \d+ of us on the Southwark, meet at Gabriel's Wharf at 7pm\.$/);
  await engine.rsvpClubRun(story.clubRun.id, true);
  expect((await engine.listClubStories("c_southbank"))[0].clubRun.isGoing).toBe(true);
  await engine.viewStory(story.id);
  expect((await engine.listCrewStories("c_southbank")).find((r) => r.kind === "club").story).toBe("watched");
});

test("cheers once, replies, and stickers on my own story", async () => {
  await inSouthbank();
  await expect(engine.replyToStory("p_kemi:x", "p_kemi", " ")).rejects.toMatchObject({ code: "BAD_POST" });
  expect(await engine.cheerStory("p_kemi:x", "p_kemi")).toEqual({ cheered: true });
  expect(await engine.cheerStory("p_kemi:x", "p_kemi")).toMatchObject({ already: true });
  await engine.setTier("pro");
  const run = await engine.saveRun({ distanceKm: 5.06, durationSec: 1531, route: [] });
  await engine.postStory({ uri: "file:///a.jpg", audience: "club", clubId: "c_southbank", runId: run.id, stickers: ["route", "confetti", "club"] });
  const me = await engine.getProfile();
  const [mine] = await engine.listStories(me.id);
  expect(mine).toMatchObject({ audience: "club", clubId: "c_southbank", stickers: ["route", "club"], run: { km: 5.06, seconds: 1531 } });
  await expect(engine.postStory({ uri: "file:///b.jpg", audience: "club", clubId: "c_peckham" })).rejects.toMatchObject({ code: "FORBIDDEN" });
});
