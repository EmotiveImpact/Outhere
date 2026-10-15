import { describe, expect, it } from "vitest";
import {
  battleLengths, canPostStory, clubShare, countdown, countedSteps, isValidClubSlug, ordinal, priceSplit, ringClass, rolesFor, storyRing,
} from "../src/rules";
import { seed } from "../src/mock";

describe("counted steps", () => {
  it("counts everything to 10k", () => {
    expect(countedSteps(9_840)).toBe(9_840);
    expect(countedSteps(10_000)).toBe(10_000);
  });
  it("counts half from 10k to 20k and caps at 15k", () => {
    expect(countedSteps(14_000)).toBe(12_000);
    expect(countedSteps(20_000)).toBe(15_000);
    expect(countedSteps(62_000)).toBe(15_000);
  });
  it("never counts negative steps", () => {
    expect(countedSteps(-50)).toBe(0);
  });
});

describe("money", () => {
  it("matches the £5.99 Pro split on the membership page", () => {
    expect(priceSplit(5.99, "pro", "web")).toEqual({ vat: 1, fees: 0.29, club: 1, outhere: 3.7 });
  });
  it("gives the club 50p through the app and three times for Black", () => {
    expect(clubShare("pro", "app")).toBe(0.5);
    expect(clubShare("black", "web")).toBe(3);
    expect(clubShare("free", "web")).toBe(0);
  });
});

describe("rings and dots", () => {
  it("shows membership everywhere outside the stories row", () => {
    expect(ringClass("free")).toBe("t-free");
    expect(ringClass("black")).toBe("t-black");
  });
  it("shows only the story state in the stories row", () => {
    expect(storyRing(false)).toEqual({ ring: "t-story", state: "new" });
    expect(storyRing(true)).toEqual({ ring: "t-story", state: "seen" });
  });
});

describe("battles", () => {
  it("asks how far for distance modes and how long for time modes", () => {
    const live = seed.BATTLE_MODES.find((m) => m.key === "live")!;
    const last = seed.BATTLE_MODES.find((m) => m.key === "last")!;
    expect(battleLengths(live).question).toBe("How far?");
    expect(battleLengths(last).options).toContain("Until someone drops");
  });
});

describe("club slugs", () => {
  it("rejects the app's own paths", () => {
    expect(isValidClubSlug("feed")).toBe(false);
    expect(isValidClubSlug("peckhampacers")).toBe(true);
    expect(isValidClubSlug("Peckham Pacers")).toBe(false);
  });
  it("gives every seed club a valid slug", () => {
    for (const c of seed.CLUBS) expect(isValidClubSlug(c.slug)).toBe(true);
  });
});

describe("helpers", () => {
  it("formats ordinals", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd"]);
  });
  it("formats countdowns", () => {
    const now = Date.UTC(2026, 9, 17, 12, 0, 0);
    expect(countdown(now + ((2 * 24 + 7) * 3600 + 14 * 60 + 22) * 1000, now)).toBe("2d 07:14:22");
    expect(countdown(now + (31 * 3600) * 1000, now, true)).toBe("1d 07h");
  });
  it("gives staff every role", () => {
    expect(rolesFor("staff")).toEqual(["member", "captain", "staff"]);
    expect(rolesFor("member")).toEqual(["member"]);
  });
});

describe("canPostStory", () => {
  it("lets paying members post and keeps Free to watching", () => {
    expect(canPostStory({ tier: "pro" })).toBe(true);
    expect(canPostStory({ tier: "black" })).toBe(true);
    expect(canPostStory({ tier: "free" })).toBe(false);
  });
});
