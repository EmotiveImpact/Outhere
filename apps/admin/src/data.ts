import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { OuthereData } from "@outhere/core";
import { MockData } from "@outhere/core/mock";
import { SupabaseData, type Database } from "@outhere/core/supabase";

/**
 * Where Outhere HQ reads and writes.
 *
 * With VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set at build time, HQ talks
 * to the Outhere Supabase project as whoever is signed in, and the database
 * decides what staff may see and do. With them empty it runs on one in-memory
 * example store for the whole tab, so a write on one page shows up on every
 * other page (and in the audit log) after a reload.
 */
const url = import.meta.env.VITE_SUPABASE_URL ?? "";
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

/** True when HQ runs on the real project rather than example data. */
export const usingSupabase = !!url && !!anonKey;

/** The browser client, or null on example data. Sessions live in this browser's storage. */
export const supabase: SupabaseClient<Database> | null = usingSupabase
  ? createClient<Database>(url, anonKey, {
      auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

const store: OuthereData = supabase ? new SupabaseData(supabase) : new MockData();

export function getData(): OuthereData {
  return store;
}

/** Forget cached reads, after signing in or out. */
export function resetData(): void {
  if (store instanceof SupabaseData) store.refresh();
}

/** The member web app, for "Back to the app" and club page links. */
export const WEB_URL = (import.meta.env.VITE_WEB_URL || "http://localhost:5173").replace(/\/$/, "");
