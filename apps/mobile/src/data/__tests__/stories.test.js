// Local stories: seeded people post today, watching turns the ring grey,
// and only paying members can post.

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

const engine = require("../engine");

beforeEach(() => engine.__resetForTests());

test("stories ring goes from unwatched to watched", async () => {
  await engine.createProfile({ username: "story.fan", city: "London" });
  const people = await engine.searchPlayers("");
  const withStory = people.find((p) => p.story);
  expect(withStory).toBeTruthy(); // 24 seeded people, at least 40% post each day
  expect(withStory.story).toBe("unwatched");
  const stories = await engine.listStories(withStory.id);
  expect(stories.length).toBeGreaterThan(0);
  for (const st of stories) await engine.viewStory(st.id);
  const again = (await engine.searchPlayers("")).find((p) => p.id === withStory.id);
  expect(again.story).toBe("watched");
});

test("free members can't post, paying members can", async () => {
  await engine.createProfile({ username: "poster", city: "London" });
  await expect(engine.postStory({ uri: "file:///a.jpg" })).rejects.toMatchObject({ code: "TIER_REQUIRED" });
  await engine.setTier("pro");
  await engine.postStory({ uri: "file:///a.jpg", caption: " Sunrise " });
  const me = await engine.getProfile();
  const mine = await engine.listStories(me.id);
  expect(mine).toHaveLength(1);
  expect(mine[0].caption).toBe("Sunrise");
  await engine.deleteStory(mine[0].id);
  expect(await engine.listStories(me.id)).toHaveLength(0);
});
