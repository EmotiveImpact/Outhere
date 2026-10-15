import { describe, expect, it } from "vitest";
import { RESERVED_SLUGS } from "@outhere/core";
import routes from "../app/routes";

type Entry = { path?: string; children?: Entry[] };

function firstSegments(entries: Entry[]): string[] {
  return entries.flatMap((e) => [
    ...(e.path ? [e.path.split("/")[0]] : []),
    ...(e.children ? firstSegments(e.children) : []),
  ]);
}

describe("routes", () => {
  // Club pages live at /:slug, so every app path a club name could take must be reserved.
  it("reserves every top-level app path as a club slug", () => {
    const taken = firstSegments(routes as Entry[]).filter((s) => /^[a-z0-9]{3,40}$/.test(s));
    expect(taken.length).toBeGreaterThan(5);
    expect(taken.filter((s) => !RESERVED_SLUGS.has(s))).toEqual([]);
  });

  it("keeps the club page last so app paths win", () => {
    const top = (routes as Entry[]).map((e) => e.path);
    expect(top.at(-1)).toBe(":slug");
  });
});
