import type { Club, OuthereData, Role } from "@outhere/core";
import { MockData } from "@outhere/core/mock";
import { supabaseConfigured, supabaseData } from "./supabase.server";

export { requireMember, sessionMiddleware } from "./supabase.server";

/**
 * One example-data store per server process, so what you do (RSVPs, posts,
 * approvals) sticks while the server runs. Real data replaces it as soon as the
 * Supabase variables are set.
 */
const mock = new MockData();

export const PREVIEW_COOKIE = "oh_preview";

export function previewRole(request: Request): Role {
  const m = /(?:^|;\s*)oh_preview=(member|captain|staff)/.exec(request.headers.get("cookie") ?? "");
  return (m?.[1] as Role | undefined) ?? "staff";
}

export const usingExampleData = (): boolean => !supabaseConfigured();

/** Stands in for the home club of a member who hasn't joined one yet. */
export const NO_CLUB: Club = {
  id: "", slug: "", name: "", nameTop: "", nameBottom: "", borough: "", cover: "", crest: "", verified: false, founding: false,
  members: 0, nextRun: "", tags: [], filters: [], division: "", position: 0, since: 0, tagline: "",
};

export async function getData(request: Request): Promise<OuthereData> {
  if (!usingExampleData()) return supabaseData(request);
  await mock.previewAs(previewRole(request));
  return mock;
}

export function config() {
  return {
    adminUrl: process.env.VITE_ADMIN_URL || "http://localhost:5174",
    publicUrl: process.env.VITE_PUBLIC_URL || "https://weouthere.app",
    example: usingExampleData(),
  };
}
