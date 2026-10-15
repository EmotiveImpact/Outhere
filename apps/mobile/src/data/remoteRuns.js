// Move and runs on Supabase: the twin of runs.js, with the same names, args
// and return shapes. Everything that moves XP or OUT stays in save_run; the
// rest goes through the functions in 20261015101700_runs.sql.

import { climbFor, elevationProfile, ghostTrack, isPoint, periodStart, splitsFor, stepsFor, thin } from "./runMath";
import { withFreshLoops } from "./runs";

const round2 = (n) => Math.round(n * 100) / 100;
const ms = (iso) => (iso ? new Date(iso).getTime() : null);

// Lines are stored as [lat, lng, ...]; the app uses { latitude, longitude }.
const toPoint = (p) => (Array.isArray(p) ? { latitude: Number(p[0]), longitude: Number(p[1]) } : p && { latitude: p.latitude, longitude: p.longitude });
const routePoint = (p) => (Array.isArray(p) ? { ...toPoint(p), ...(Number.isFinite(p[2]) ? { alt: p[2] } : null) } : toPoint(p));
const runPoint = (p) => (Array.isArray(p) ? { ...toPoint(p), ...(Number.isFinite(p[2]) ? { t: p[2] } : null), ...(Number.isFinite(p[3]) ? { alt: p[3] } : null) } : p);

export const makeRemoteRuns = ({ supabase, run, rpc, uid, requireUid, publicUrl, cityName, changed, EngineError }) => {
  const person = (p, me) =>
    p && {
      id: p.id,
      username: p.username,
      name: p.id === me ? "You" : p.display_name,
      avatar: publicUrl("avatars", p.avatar_path),
      tier: p.tier,
    };

  const routeView = (j, me) => {
    const path = (j.path || []).map(routePoint).filter(isPoint);
    const climbM = j.climb_m ?? climbFor(path);
    return {
      id: j.id,
      name: j.name,
      mine: !!j.mine,
      owner: j.owner ? person(j.owner, me) : null,
      clubId: j.club_id || null,
      clubName: j.club_name || null,
      visibility: j.club_id ? "club" : "private",
      hideEnds: !!j.hide_ends,
      path: path.map(toPoint),
      waypoints: (j.waypoints || []).map(toPoint).filter(isPoint),
      distanceKm: round2(j.distance_m / 1000),
      climbM,
      elevation: elevationProfile(path, 32),
      note: climbM != null && climbM < 25 ? "flat" : null,
      tag: null,
      runners: Number(j.runners) || 0,
      createdAt: ms(j.created_at),
      start: path[0] ? toPoint(path[0]) : null,
      stats: {
        runs: Number(j.stats?.runs) || 0,
        bestSec: j.stats?.best_s ?? null,
        bestRunId: j.stats?.best_run_id || null,
        outEarned: Number(j.stats?.out_earned) || 0,
        lastRunAt: ms(j.stats?.last_run_at),
      },
    };
  };

  const pointsOf = async (runId) => {
    const row = await run(supabase.from("run_routes").select("points").eq("run_id", runId).maybeSingle());
    return (row?.points || []).map(runPoint).filter(isPoint);
  };

  // ── Routes ─────────────────────────────────────────────────────────────────

  const listRoutes = async ({ scope = "mine" } = {}) => {
    const me = await uid();
    if (!me) return [];
    return ((await rpc("list_routes", { p_scope: scope })) || []).map((j) => routeView(j, me));
  };

  const getRoute = async (id) => {
    const me = await requireUid();
    const j = await rpc("get_route", { p_route: id });
    if (!j) return null;
    const view = routeView(j, me);
    const leaders = (j.leaders || []).map((l) => ({ rank: l.rank, sec: l.sec, isMe: !!l.is_me, player: person(l.player, me) }));
    let ghost = null;
    if (view.stats.bestRunId) {
      const pts = await pointsOf(view.stats.bestRunId);
      ghost = { runId: view.stats.bestRunId, sec: view.stats.bestSec, track: ghostTrack(pts) };
    }
    return { ...view, leaders, ghost };
  };

  const saveRoute = async ({ name, path = [], waypoints = [], climbM = null, hideEnds = true, shareWithClub = false } = {}) => {
    const row = await rpc("save_route", {
      p_name: String(name || "").trim(),
      p_path: path.filter(isPoint).map((p) => (Number.isFinite(p.alt) ? [p.latitude, p.longitude, Math.round(p.alt * 10) / 10] : [p.latitude, p.longitude])),
      p_waypoints: waypoints.filter(isPoint).map((p) => [p.latitude, p.longitude]),
      p_climb_m: Number.isFinite(climbM) ? Math.round(climbM) : null,
      p_hide_ends: !!hideEnds,
      p_share_club: !!shareWithClub,
    });
    changed();
    return getRoute(row.id);
  };

  const renameRoute = async (id, name) => {
    await run(supabase.from("saved_routes").update({ name: String(name || "").trim() }).eq("id", id));
    changed();
    return getRoute(id);
  };

  const deleteRoute = async (id) => {
    await run(supabase.from("saved_routes").delete().eq("id", id));
    changed();
  };

  const suggestRoutes = async ({ latitude, longitude, km = 5 } = {}) => {
    const me = await uid();
    const here = isPoint({ latitude, longitude }) ? { latitude, longitude } : null;
    const rows = me && here ? (await rpc("routes_near", { p_lat: latitude, p_lng: longitude, p_km: km })) || [] : [];
    return here ? withFreshLoops(rows.map((j) => routeView(j, me)), here, km) : rows.map((j) => routeView(j, me));
  };

  // ── Run history ────────────────────────────────────────────────────────────

  const RUN_COLS = "id, title, kind, started_at, ended_at, distance_m, moving_s, avg_pace_s_per_km, steps, elevation_m, route_id, feel";

  const bestPaceId = (rows) => {
    const counted = rows.filter((r) => r.distance_m >= 1000 && r.avg_pace_s_per_km);
    return counted.length ? counted.reduce((b, r) => (r.avg_pace_s_per_km < b.avg_pace_s_per_km ? r : b)).id : null;
  };

  const listRunHistory = async ({ period = "month" } = {}) => {
    const me = await uid();
    const year = new Date().getFullYear();
    if (!me) return { period, year, yearKm: 0, totalKm: 0, count: 0, runs: [] };
    const from = periodStart(period);
    const yearFrom = periodStart("year");
    const [yearRows, allPaces] = await Promise.all([
      run(supabase.from("runs").select(RUN_COLS).eq("user_id", me).gte("started_at", new Date(yearFrom).toISOString()).order("started_at", { ascending: false })),
      run(supabase.from("runs").select("id, distance_m, avg_pace_s_per_km").eq("user_id", me).gte("distance_m", 1000).order("avg_pace_s_per_km", { ascending: true }).limit(1)),
    ]);
    const rows = (yearRows || []).filter((r) => ms(r.started_at) >= from).slice(0, 60);
    const routes = rows.length ? await run(supabase.from("run_routes").select("run_id, points").in("run_id", rows.map((r) => r.id))) : [];
    const lineOf = Object.fromEntries((routes || []).map((r) => [r.run_id, thin((r.points || []).map(toPoint).filter(isPoint), 60)]));
    const pb = bestPaceId(allPaces || []);
    return {
      period,
      year,
      yearKm: round2((yearRows || []).reduce((sum, r) => sum + r.distance_m / 1000, 0)),
      totalKm: round2(rows.reduce((sum, r) => sum + r.distance_m / 1000, 0)),
      count: rows.length,
      runs: rows.map((r) => ({
        id: r.id,
        title: r.title || "Run",
        type: r.kind,
        startedAt: ms(r.started_at),
        distanceKm: round2(r.distance_m / 1000),
        durationSec: r.moving_s,
        paceSecPerKm: r.avg_pace_s_per_km,
        steps: r.steps || stepsFor(r.distance_m / 1000),
        isPb: r.id === pb,
        route: lineOf[r.id] || [],
      })),
    };
  };

  const getRunDetail = async (id) => {
    const me = await requireUid();
    const r = await run(supabase.from("runs").select(RUN_COLS).eq("id", id).eq("user_id", me).maybeSingle());
    if (!r) return null;
    const [points, paid, route, prof, best] = await Promise.all([
      pointsOf(id),
      run(supabase.from("ledger").select("currency, amount").eq("ref_type", "run").eq("ref_id", id)),
      r.route_id ? run(supabase.from("saved_routes").select("name").eq("id", r.route_id).maybeSingle()) : null,
      run(supabase.from("profiles").select("city_id, borough_id").eq("id", me).maybeSingle()),
      run(supabase.from("runs").select("id, distance_m, avg_pace_s_per_km").eq("user_id", me).gte("distance_m", 1000).order("avg_pace_s_per_km", { ascending: true }).limit(1)),
    ]);
    const earned = { xp: 0, out: 0 };
    for (const l of paid || []) earned[l.currency] = (earned[l.currency] || 0) + l.amount;
    const splits = splitsFor(points);
    const km = round2(r.distance_m / 1000);
    return {
      id: r.id,
      title: r.title || "Run",
      type: r.kind,
      startedAt: ms(r.started_at),
      endedAt: ms(r.ended_at),
      distanceKm: km,
      durationSec: r.moving_s,
      paceSecPerKm: r.avg_pace_s_per_km,
      calories: Math.round(km * 62),
      route: points,
      routeId: r.route_id || null,
      steps: r.steps || stepsFor(km),
      splits,
      fastestSplit: splits.find((x) => x.fastest) || null,
      climbM: r.elevation_m ?? climbFor(points),
      earned,
      routeName: route?.name || null,
      area: cityName(prof?.borough_id || prof?.city_id) || null,
      feel: r.feel ?? null,
      isPb: best?.[0]?.id === r.id,
    };
  };

  const rateRun = async (id, feel) => {
    const f = Math.round(Number(feel));
    if (!(f >= 1 && f <= 5)) throw new EngineError("BAD_FEEL", "Pick how it felt.");
    await run(supabase.from("runs").update({ feel: f }).eq("id", id));
    changed();
    return { id, feel: f };
  };

  // ── The live map ───────────────────────────────────────────────────────────

  const getOutsideMap = async ({ latitude, longitude } = {}) => {
    const me = await uid();
    if (!me) return { total: 0, near: 0, area: null, city: null, crew: [], others: [], dots: [] };
    const here = isPoint({ latitude, longitude });
    const j = await rpc("outside_map", { p_lat: here ? latitude : null, p_lng: here ? longitude : null });
    return {
      total: Number(j.total) || 0,
      near: Number(j.near) || 0,
      area: j.area || null,
      city: j.city || null,
      crew: (j.crew || []).map((p) => ({ id: p.id, name: p.display_name, avatar: publicUrl("avatars", p.avatar_path), tier: p.tier, crew: true, latitude: p.lat, longitude: p.lng })),
      others: [],
      dots: (j.dots || []).map(toPoint),
    };
  };

  const getCrewLive = async ({ latitude, longitude } = {}) => {
    const me = await uid();
    if (!me) return { club: null, out: [], count: 0 };
    const here = isPoint({ latitude, longitude });
    const j = await rpc("crew_live", { p_lat: here ? latitude : null, p_lng: here ? longitude : null });
    return {
      club: j.club ? { id: j.club.id, name: j.club.name, logo: publicUrl("club-media", j.club.logo_path) } : null,
      out: (j.out || []).map((p) => ({
        player: { id: p.user_id, username: p.username, name: p.display_name, avatar: publicUrl("avatars", p.avatar_path), tier: p.tier },
        activity: p.kind === "walk" ? "Walking" : "Running",
        km: Number(p.km) || 0,
        awayM: p.away_m ?? null,
        latitude: p.lat,
        longitude: p.lng,
        trail: [],
        waved: false,
      })),
      count: Number(j.count) || 0,
    };
  };

  const waveAt = async (pid) => ({ ok: !!(await rpc("wave_at", { p_user: pid })) });

  const setLivePosition = async ({ on = true, latitude, longitude, km = 0, kind = "run", routeId = null } = {}) => {
    if (!(await uid())) return null;
    if (!on) await rpc("clear_live_position", {});
    else if (isPoint({ latitude, longitude })) await rpc("set_live_position", { p_lat: latitude, p_lng: longitude, p_km: round2(km), p_kind: kind === "walk" ? "walk" : "run", p_route: routeId });
    return { on: !!on };
  };

  // ── Live sharing ───────────────────────────────────────────────────────────

  const shareView = (s) =>
    s ? { id: s.id, token: s.token, startedAt: ms(s.started_at), lastAt: ms(s.last_at), alertedAt: ms(s.alerted_at), link: `https://weouthere.app/live/${s.token}` } : null;

  const getSafety = async () => {
    const me = await uid();
    if (!me) return { contacts: [], nightAuto: false, checkIn: true, share: null };
    const [contacts, settings, share] = await Promise.all([
      run(supabase.from("trusted_contacts").select("*").eq("user_id", me).order("created_at")),
      run(supabase.from("safety_settings").select("*").eq("user_id", me).maybeSingle()),
      run(supabase.from("live_shares").select("*").eq("user_id", me).is("ended_at", null).maybeSingle()),
    ]);
    return {
      contacts: (contacts || []).map((c) => ({ id: c.id, name: c.name, phone: c.phone, mode: c.mode, addedAt: ms(c.created_at), watching: !!share && c.mode === "live" })),
      nightAuto: !!settings?.night_auto,
      checkIn: settings ? !!settings.check_in : true,
      share: shareView(share),
    };
  };

  const addTrustedContact = async ({ name, phone = "", mode = "alerts" } = {}) => {
    const c = await rpc("add_trusted_contact", { p_name: name, p_phone: phone, p_mode: mode });
    changed();
    return { id: c.id, name: c.name, phone: c.phone, mode: c.mode, addedAt: ms(c.created_at) };
  };

  const updateTrustedContact = async (id, { mode } = {}) => {
    await run(supabase.from("trusted_contacts").update({ mode: mode === "live" ? "live" : "alerts" }).eq("id", id));
    changed();
  };

  const removeTrustedContact = async (id) => {
    await run(supabase.from("trusted_contacts").delete().eq("id", id));
    changed();
  };

  const updateSafety = async ({ nightAuto, checkIn } = {}) => {
    await rpc("update_safety", { p_night_auto: nightAuto ?? null, p_check_in: checkIn ?? null });
    changed();
    return getSafety();
  };

  const startLiveShare = async ({ runId = null } = {}) => {
    const s = await rpc("start_live_share", { p_run: runId });
    changed();
    return shareView(s);
  };

  const stopLiveShare = async () => {
    await rpc("stop_live_share", {});
    changed();
  };

  const pingLiveShare = async ({ latitude, longitude, stillSec = 0 } = {}) => {
    if (!isPoint({ latitude, longitude })) return { alerted: false };
    const alerted = !!(await rpc("ping_live_share", { p_lat: latitude, p_lng: longitude, p_still_s: Math.round(stillSec) }));
    if (alerted) changed();
    return { alerted };
  };

  return {
    listRoutes,
    getRoute,
    saveRoute,
    renameRoute,
    deleteRoute,
    suggestRoutes,
    listRunHistory,
    getRunDetail,
    rateRun,
    getOutsideMap,
    getCrewLive,
    waveAt,
    setLivePosition,
    getSafety,
    addTrustedContact,
    updateTrustedContact,
    removeTrustedContact,
    updateSafety,
    startLiveShare,
    stopLiveShare,
    pingLiveShare,
  };
};
