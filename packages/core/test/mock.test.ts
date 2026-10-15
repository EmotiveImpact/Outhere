import { beforeEach, describe, expect, it } from "vitest";
import { MockData, nextReveal } from "../src/mock";

let data: MockData;
beforeEach(() => {
  data = new MockData();
});

describe("mock data source", () => {
  it("toggles a reaction on and off", async () => {
    const before = (await data.feed()).posts.find((p) => p.id === "p-recap");
    await data.react("p-recap", "fire");
    let after = (await data.feed()).posts.find((p) => p.id === "p-recap");
    expect(after && "reactions" in after && after.reactions.fire).toBe(before && "reactions" in before && before.reactions.fire + 1);
    await data.react("p-recap", "fire");
    after = (await data.feed()).posts.find((p) => p.id === "p-recap");
    expect(after && "reactions" in after && after.reactions.mine).toEqual([]);
  });

  it("moves a poll vote rather than counting it twice", async () => {
    await data.votePoll("peckham-pacers", "general", "g6", 0);
    await data.votePoll("peckham-pacers", "general", "g6", 2);
    const general = (await data.chat("peckham-pacers")).channels.find((c) => c.key === "general")!;
    const poll = general.items.find((i) => i.kind === "message" && i.id === "g6");
    expect(poll && poll.kind === "message" && poll.poll?.options.map((o) => o.votes)).toEqual([11, 7, 16]);
  });

  it("hides the leaders channel from members", async () => {
    await data.previewAs("member");
    const chat = await data.chat("peckham-pacers");
    expect(chat.channels.find((c) => c.key === "run-leaders")?.items).toEqual([]);
    await expect(data.sendChat("peckham-pacers", "run-leaders", "hi")).rejects.toThrow("LEADERS_ONLY");
  });

  it("keeps staff pages for staff", async () => {
    await data.previewAs("captain");
    await expect(data.adminOverview()).rejects.toThrow("STAFF_ONLY");
  });

  it("adds an approved guest to the members", async () => {
    await data.decideJoinRequest("peckham-pacers", "jr-mei", true);
    const view = await data.members("peckham-pacers");
    expect(view.requests.map((r) => r.id)).not.toContain("jr-mei");
    expect(view.members.some((m) => m.personId === "mei")).toBe(true);
    expect(view.club.members).toBe(413);
  });

  it("won't verify a club until every check is done", async () => {
    await expect(data.verifyClub("v1")).rejects.toThrow("CHECKS_INCOMPLETE");
    for (const i of [3, 4]) await data.setVerificationCheck("v1", i, true);
    await data.verifyClub("v1");
    expect((await data.clubBySlug("walthamstowdawn"))?.verified).toBe(true);
    expect((await data.audit())[0]?.target).toBe("Walthamstow Dawn Walkers");
  });

  it("refuses a full pick-up and a reserved slug", async () => {
    await expect(data.updateClubPage("peckham-pacers", { slug: "feed" })).rejects.toThrow("BAD_SLUG");
    const p = await data.postPickup({ type: "run", title: "", at: "", when: "Today 18:00", visibility: "Anyone nearby" });
    expect(p.title).toBe("Easy 5k after work");
    expect(p.imIn).toBe(true);
  });

  it("finds clubs by borough and filter", async () => {
    const walks = await data.clubs({ filters: ["walk"], borough: "Lewisham" });
    expect(walks.map((c) => c.id)).toEqual(["lewisham-buggy"]);
  });

  it("puts the reveal on a Sunday at 20:00 London time", () => {
    const at = new Date(nextReveal(new Date("2026-10-15T10:00:00Z")));
    expect(at.getUTCDay()).toBe(0);
    expect(at.toISOString()).toBe("2026-10-18T19:00:00.000Z");
    expect(nextReveal(new Date("2026-12-01T10:00:00Z"))).toBe("2026-12-06T20:00:00.000Z");
  });
});
