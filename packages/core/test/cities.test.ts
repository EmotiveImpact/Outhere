import { describe, expect, it } from "vitest";
import { MockData } from "../src/mock";

describe("UK-wide cities", () => {
  const data = new MockData();

  it("lists the ten launch cities first", async () => {
    const cities = await data.cities();
    expect(cities.filter((c) => c.launch)).toHaveLength(10);
    expect(cities.slice(0, 10).every((c) => c.launch)).toBe(true);
    expect(cities.find((c) => c.id === "london")).toMatchObject({ areaWord: "borough", hasMap: true });
    expect(cities.find((c) => c.id === "leeds")).toMatchObject({ areaWord: "area", hasMap: false });
  });

  it("filters clubs by city, and leaves the city out for the whole UK", async () => {
    const manc = await data.clubs({ city: "manchester" });
    expect(manc.length).toBeGreaterThan(0);
    expect(manc.every((c) => c.cityId === "manchester" && c.city === "Manchester")).toBe(true);
    const all = await data.clubs();
    expect(new Set(all.map((c) => c.cityId)).size).toBeGreaterThan(5);
  });

  it("puts the viewer's own city first when sorting by closest", async () => {
    const list = await data.clubs({ sort: "closest" });
    const firstAway = list.findIndex((c) => c.cityId !== "london");
    expect(list.slice(firstAway).every((c) => c.cityId !== "london")).toBe(true);
  });

  it("gives each city its own club table and areas", async () => {
    const glasgow = await data.league("glasgow");
    expect(glasgow.city.name).toBe("Glasgow");
    expect(glasgow.clubTable.every((r) => r.club.cityId === "glasgow")).toBe(true);
    const leeds = await data.boroughs("steps", "leeds");
    expect(leeds.map((b) => b.name)).toContain("Kirkstall");
    expect(leeds.every((b) => b.col === 0 && b.row === 0)).toBe(true);
    expect(await data.boroughs("steps")).toHaveLength(32);
  });

  it("marks region sides in the City League", async () => {
    const league = await data.league();
    const rows = league.divisions.flatMap((d) => d.rows);
    expect(rows.some((r) => r.region)).toBe(true);
    expect(league.rising.region).toBe("Yorkshire");
  });
});
