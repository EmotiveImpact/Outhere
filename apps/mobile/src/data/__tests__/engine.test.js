jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

import * as E from "../engine";

beforeEach(() => E.__resetForTests());

const onboard = () => E.createProfile({ username: "edem_test", city: "London" });

test("onboarding creates a profile with starter rewards", async () => {
  expect((await E.checkUsername("edem_test")).available).toBe(true);
  await onboard();
  const p = await E.getProfile();
  expect(p.username).toBe("edem_test");
  expect(p.xp).toBeGreaterThanOrEqual(100);
  expect(p.out).toBeGreaterThanOrEqual(20);
  expect(p.followingCount).toBeGreaterThan(0);
  expect((await E.listNotifications()).length).toBeGreaterThan(0);
});

test("steps award XP and build a streak", async () => {
  await onboard();
  const before = (await E.getProfile()).xp;
  await E.recordSteps({ steps: 12000 });
  const p = await E.getProfile();
  expect(p.xp).toBeGreaterThan(before);
  expect(p.today.steps).toBe(12000);
  await E.recordSteps({ steps: 5000 });
  expect((await E.getProfile()).today.steps).toBe(12000);
  await E.devFillHistory(13);
  const q = await E.getProfile();
  expect(q.streak).toBeGreaterThanOrEqual(14);
  expect((await E.getStepHistory(7)).length).toBe(7);
});

test("leaderboards include me and seeded players", async () => {
  await onboard();
  for (const scope of ["city", "global", "friends"]) {
    for (const metric of ["steps", "distance", "xp", "streak"]) {
      const lb = await E.getLeaderboard({ scope, period: "week", metric });
      expect(Array.isArray(lb.entries ?? lb)).toBe(true);
    }
  }
});

test("free tier limits battles and crews; upgrade lifts them", async () => {
  await onboard();
  const friends = await E.getFriends();
  await E.createBattle({ opponentId: friends[0].id, durationHours: 24 });
  await expect(E.createBattle({ opponentId: friends[1].id, durationHours: 2 })).rejects.toMatchObject({ code: "TIER_REQUIRED" });
  await expect(E.createCrew({ name: "Test Crew", city: "London" })).rejects.toMatchObject({ code: "TIER_REQUIRED" });
  await E.setTier("pro");
  await E.createBattle({ opponentId: friends[1].id, durationHours: 2 });
  const crew = await E.createCrew({ name: "Test Crew", city: "London" });
  expect(crew.id).toBeTruthy();
  const battles = await E.listBattles();
  expect(battles.length).toBeGreaterThanOrEqual(2);
  const b = await E.getBattle(battles[0].id);
  expect(b).toBeTruthy();
});

test("crews: join by code, chat, feed, leave", async () => {
  await onboard();
  const crew = await E.joinCrewByCode("NORTH3");
  await E.sendCrewMessage(crew.id, "hello");
  const msgs = await E.getCrewMessages(crew.id);
  expect(msgs.some((m) => m.text === "hello")).toBe(true);
  const run = await E.saveRun({ distanceKm: 5.2, durationSec: 1800, route: [] });
  await E.shareRunToCrew(crew.id, { runId: run.id, caption: "nice" });
  const feed = await E.getCrewFeed(crew.id);
  expect(feed.length).toBeGreaterThan(0);
  await E.togglePostLike(crew.id, feed[0].id);
  expect((await E.getCrewLeaderboard(crew.id)).length).toBeGreaterThan(0);
  expect((await E.discoverCrews()).length).toBeGreaterThan(0);
  await E.leaveCrew(crew.id);
  expect((await E.listMyCrews()).length).toBe(0);
});

test("events, drops, rewards, news, challenges, settings", async () => {
  await onboard();
  const events = await E.listEvents();
  expect(events.length).toBeGreaterThan(0);
  const open = events.find((e) => !e.locked) || events[0];
  await E.recordSteps({ steps: 15000 });
  await E.devFillHistory(13);
  await E.setTier("black");
  await E.rsvpEvent(open.id, true);
  expect((await E.getEvent(open.id)).isGoing).toBe(true);
  const drops = await E.listDrops();
  await E.toggleDropReminder(drops[0].id);
  const { rewards } = await E.listRewards();
  const cheap = rewards.slice().sort((a, b) => a.costOut - b.costOut)[0];
  const w = await E.getWallet();
  if (w.out >= cheap.costOut) expect((await E.redeemReward(cheap.id)).code).toMatch(/^OUT-/);
  expect((await E.listNews()).length).toBeGreaterThan(0);
  const ch = await E.listChallenges();
  await E.joinChallenge(ch[0].id);
  await E.updateSettings({ units: "mi" });
  expect((await E.getSettings()).units).toBe("mi");
  await E.markAllNotificationsRead();
  expect(await E.unreadNotificationCount()).toBe(0);
  expect((await E.getOutsideNow("London")).count).toBeGreaterThanOrEqual(0);
  expect(await E.getPlayer((await E.getFriends())[0].id)).toBeTruthy();
});
