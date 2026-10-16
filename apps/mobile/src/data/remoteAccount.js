// The member's account over Supabase: the twin of account.js with the same
// names and shapes. Settings live in public.member_settings (cached on the
// phone so the app opens with them offline), date of birth and under 18 mode
// go through set_birth_date and am_i_minor, and the patch picker reads
// public.cities and public.boroughs through patch_places and patch_areas.
// See supabase/migrations/20261015101710_account.sql.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { EngineError } from "./engine";
import { buildSummary, crestLetters, mergeSettings, periodRange } from "./account";
import { dayKey } from "./time";

export const SETTINGS_KEY = "outhere.settings.v1";

const toRow = (me, s) => ({
  user_id: me,
  units: s.units,
  haptics: s.haptics,
  voice_cues: s.voiceCues,
  text_scale: s.textScale,
  sound: s.sound,
  pings: s.pings,
  quiet_hours: s.quietHours,
  ghost_mode: s.privacy.ghost,
  spot_as: s.privacy.spotAs,
  hide_route_ends: s.privacy.hideRouteEnds,
  map_visibility: s.privacy.mapVisibility,
  show_on_leaderboards: s.privacy.showOnLeaderboards,
  show_outside_status: s.privacy.showOutsideStatus,
  step_source: s.stepSource,
  source_requests: s.sourceRequests,
});

const fromRow = (r) =>
  r
    ? {
        units: r.units,
        haptics: r.haptics,
        voiceCues: r.voice_cues,
        textScale: Number(r.text_scale),
        sound: r.sound || {},
        pings: r.pings || {},
        quietHours: r.quiet_hours || {},
        privacy: {
          ghost: r.ghost_mode,
          spotAs: r.spot_as,
          hideRouteEnds: r.hide_route_ends,
          mapVisibility: r.map_visibility,
          showOnLeaderboards: r.show_on_leaderboards,
          showOutsideStatus: r.show_outside_status,
        },
        stepSource: r.step_source,
        sourceRequests: r.source_requests || {},
      }
    : {};

export function makeRemoteAccount({ supabase, run, rpc, uid, requireUid, changed, publicUrl, signOut }) {
  // ── Settings ────────────────────────────────────────────────────────────────

  const cached = async () => {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };
  const cache = (s) => AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s)).catch(() => {});

  const getSettings = async () => {
    const local = await cached();
    const me = await uid();
    if (!me) return mergeSettings(local);
    try {
      const row = await run(supabase.from("member_settings").select("*").eq("user_id", me).maybeSingle());
      const merged = mergeSettings(local, fromRow(row));
      cache(merged);
      return merged;
    } catch {
      // Offline: the phone's copy is good enough to open with.
      return mergeSettings(local);
    }
  };

  const updateSettings = async (patch = {}) => {
    const next = mergeSettings(await getSettings(), patch);
    await cache(next);
    const me = await uid();
    if (me) {
      const row = await run(supabase.from("member_settings").upsert(toRow(me, next)).select().maybeSingle());
      // The database keeps under 18s off the map for everyone.
      if (row) next.privacy.mapVisibility = row.map_visibility;
      await cache(next);
    }
    changed();
    return next;
  };

  const clearSettingsCache = () => AsyncStorage.removeItem(SETTINGS_KEY).catch(() => {});

  // ── Account ─────────────────────────────────────────────────────────────────

  const getAccount = async () => {
    const me = await uid();
    if (!me) return null;
    const [priv, minor, guardian, blocked] = await Promise.all([
      run(supabase.from("profile_private").select("birth_date").eq("id", me).maybeSingle()),
      rpc("am_i_minor", {}),
      run(supabase.from("guardian_links").select("*").eq("child_id", me).maybeSingle()),
      supabase.from("blocks").select("blocked_id", { count: "exact", head: true }).eq("user_id", me),
    ]);
    const birthDate = priv?.birth_date || null;
    let age = null;
    if (birthDate) {
      const [y, m, d] = birthDate.split("-").map(Number);
      const now = new Date();
      age = now.getFullYear() - y - (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d) ? 1 : 0);
    }
    return {
      birthDate,
      age,
      isMinor: !!minor,
      guardian: guardian ? { name: guardian.name, contact: guardian.contact, liveSharing: guardian.live_sharing, linkedAt: new Date(guardian.created_at).getTime() } : null,
      blockedCount: blocked?.count || 0,
    };
  };

  const setBirthDate = async (birthDate) => {
    await requireUid();
    await rpc("set_birth_date", { p_date: birthDate });
    changed();
    return getAccount();
  };

  const linkGuardian = async ({ name, contact, liveSharing = true }) => {
    await rpc("link_guardian", { p_name: name, p_contact: contact, p_live: liveSharing });
    changed();
    return getAccount();
  };

  const unlinkGuardian = async () => {
    await rpc("unlink_guardian", {});
    changed();
    return getAccount();
  };

  // ── Blocked people ──────────────────────────────────────────────────────────

  const listBlocked = async () => {
    const me = await uid();
    if (!me) return [];
    const rows = await run(supabase.from("blocks").select("blocked_id, profiles!blocks_blocked_id_fkey(id, username, display_name, avatar_path, tier, city_id, borough_id)").eq("user_id", me));
    return (rows || [])
      .map((r) => r.profiles)
      .filter(Boolean)
      .map((p) => ({ id: p.id, username: p.username, name: p.display_name, avatar: publicUrl("avatars", p.avatar_path), tier: p.tier, city: p.city_id, area: p.borough_id }));
  };

  const blockPlayer = async (pid) => {
    const me = await requireUid();
    await run(supabase.from("blocks").upsert({ user_id: me, blocked_id: pid }));
    await run(supabase.from("follows").delete().eq("follower_id", me).eq("followee_id", pid));
    changed();
  };

  const unblockPlayer = async (pid) => {
    const me = await requireUid();
    await run(supabase.from("blocks").delete().eq("user_id", me).eq("blocked_id", pid));
    changed();
  };

  // ── Your data ───────────────────────────────────────────────────────────────

  const exportMyData = async () => rpc("export_my_data", {});

  const deleteAccount = async () => {
    await rpc("delete_my_account", {});
    await clearSettingsCache();
    await signOut();
    return true;
  };

  // ── Your patch ──────────────────────────────────────────────────────────────

  const listPatchPlaces = async ({ query = "", lat = null, lng = null } = {}) => {
    const rows = await rpc("patch_places", { p_query: query || null, p_lat: lat, p_lng: lng });
    return (rows || []).map((c) => ({
      id: c.id,
      name: c.name,
      region: c.region,
      kind: c.kind || "city",
      isLive: !!c.is_live,
      playsFor: c.plays_for,
      members: Number(c.members || 0),
      distanceKm: c.distance_km == null ? null : Math.round(c.distance_km),
    }));
  };

  const listPatchAreas = async (cityId, query = "") => {
    if (!cityId) return [];
    const me = await uid();
    const mine = me ? (await run(supabase.from("profiles").select("borough_id").eq("id", me).maybeSingle()))?.borough_id : null;
    const rows = await rpc("patch_areas", { p_city: cityId });
    const q = (query || "").trim().toLowerCase();
    return (rows || [])
      .map((a) => ({ id: a.id, name: a.name, cityId, short: crestLetters(a.name), outNow: Number(a.out_now), weekSteps: Number(a.week_steps), rank: Number(a.week_rank), isMine: a.id === mine }))
      .filter((a) => !q || a.name.toLowerCase().includes(q));
  };

  const setPatch = async ({ cityId, areaId = null }) => {
    const p = await rpc("set_patch", { p_city: cityId, p_area: areaId });
    changed();
    return { city: p?.city_id, area: p?.borough_id };
  };

  // ── Your week ───────────────────────────────────────────────────────────────

  const getWeekSummary = async ({ period = "week", offset = 0 } = {}) => {
    const me = await requireUid();
    const { from: prevFrom } = periodRange(period, offset + 1);
    const { to } = periodRange(period, offset);
    const [rows, ledger, profile] = await Promise.all([
      run(supabase.from("daily_steps").select("day, steps, distance_m, active_minutes").eq("user_id", me).gte("day", dayKey(prevFrom)).lt("day", dayKey(to))),
      run(supabase.from("ledger").select("currency, amount, created_at").eq("user_id", me).gt("amount", 0).gte("created_at", prevFrom.toISOString()).lt("created_at", to.toISOString())),
      run(supabase.from("profiles").select("daily_goal").eq("id", me).maybeSingle()),
    ]);
    const days = Object.fromEntries((rows || []).map((r) => [r.day, { steps: r.steps, distance: r.distance_m / 1000, activeMinutes: r.active_minutes }]));
    const entries = (ledger || []).map((l) => ({ type: l.currency, amount: l.amount, at: new Date(l.created_at).getTime() }));
    return buildSummary({ period, offset, days, ledger: entries, goal: profile?.daily_goal || 10000 });
  };

  // ── Photo ───────────────────────────────────────────────────────────────────

  const setAvatar = async (uri) => {
    const me = await requireUid();
    if (!uri) {
      await run(supabase.from("profiles").update({ avatar_path: null }).eq("id", me));
      changed();
      return { avatar: null };
    }
    const body = await (await fetch(uri)).arrayBuffer();
    const path = `${me}/avatar-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("avatars").upload(path, body, { contentType: "image/jpeg", upsert: true });
    if (error) throw new EngineError("UPLOAD", "Your photo didn't upload. Try again.");
    await run(supabase.from("profiles").update({ avatar_path: path }).eq("id", me));
    changed();
    return { avatar: publicUrl("avatars", path) };
  };

  // ── Apple and Google ────────────────────────────────────────────────────────
  // Supabase OAuth in the system browser, back to outhere://auth. On the web
  // the page itself goes to the provider and comes back signed in.

  const signInWithProvider = async (provider) => {
    if (provider !== "apple" && provider !== "google") throw new EngineError("AUTH", "Pick Apple, Google or email.");
    if (Platform.OS === "web") {
      const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin + "/onboarding" } });
      if (error) throw new EngineError("AUTH", error.message);
      return { signedIn: false, redirected: true };
    }
    const redirectTo = Linking.createURL("auth");
    const { data, error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo, skipBrowserRedirect: true } });
    if (error || !data?.url) throw new EngineError("AUTH", error?.message || `${provider === "apple" ? "Apple" : "Google"} sign in isn't available right now.`);
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== "success" || !result.url) return { signedIn: false, cancelled: true };
    const url = new URL(result.url.replace("#", "?"));
    const code = url.searchParams.get("code");
    const accessToken = url.searchParams.get("access_token");
    const refreshToken = url.searchParams.get("refresh_token");
    const errorText = url.searchParams.get("error_description");
    if (errorText) throw new EngineError("AUTH", errorText);
    if (code) {
      const { error: e } = await supabase.auth.exchangeCodeForSession(code);
      if (e) throw new EngineError("AUTH", "That sign in didn't finish. Try again.");
    } else if (accessToken && refreshToken) {
      const { error: e } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      if (e) throw new EngineError("AUTH", "That sign in didn't finish. Try again.");
    } else {
      throw new EngineError("AUTH", "That sign in didn't finish. Try again.");
    }
    changed();
    return { signedIn: true };
  };

  // The live count for Welcome: the member's city, or the whole UK.
  const getOutsideCount = async ({ cityId = null } = {}) => {
    const n = await rpc("outside_count", { p_city: cityId });
    return { count: Number(n || 0) };
  };

  return {
    getSettings,
    updateSettings,
    clearSettingsCache,
    getAccount,
    setBirthDate,
    linkGuardian,
    unlinkGuardian,
    listBlocked,
    blockPlayer,
    unblockPlayer,
    exportMyData,
    deleteAccount,
    listPatchPlaces,
    listPatchAreas,
    setPatch,
    getWeekSummary,
    setAvatar,
    signInWithProvider,
    getOutsideCount,
  };
}
