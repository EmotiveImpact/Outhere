// Profile, membership, wallet, friends, badges and emotes over Supabase. Same
// names and return shapes as profile.js; remote.js builds this with its own
// helpers and spreads it into its exports. Anything that moves OUT, tiers or
// streaks goes through a database function (migration 20261015101600).
//
// Membership: in-app purchases aren't set up, so "Go Pro" and "Go Black"
// return the web checkout URL for the screen to open. The website's Stripe
// webhook writes public.subscriptions, which moves the ring.

import { BADGES, badgeList } from "@/constants/badges";
import { EMOTES } from "@/constants/emotes";
import { BONUS_REASONS, MANAGE_URL, REFERRAL, checkoutUrl, freezesFor, inviteLink, priceLabel } from "@/constants/plans";
import { addDays, dayKey, startOfDay, startOfWeek } from "./time";

const ACTIVE_DAY_STEPS = 3000;
const HOUR_MS = 60 * 60 * 1000;
const REFERRAL_WINDOW_MS = 7 * 24 * HOUR_MS;
const RANK = { free: 0, pro: 1, black: 2 };
const ms = (t) => (t ? new Date(t).getTime() : null);

export const makeRemoteProfile = (h) => {
  const { supabase, run, rpc, uid, requireUid, changed, publicUrl, PERSON, playerView, peopleViews, followingSet, cityName, eventViews, levelFromXp, EngineError } = h;

  const count = async (query) => {
    const { count: n, error } = await query;
    if (error) throw new EngineError("SERVER", error.message);
    return n || 0;
  };

  // ── Membership ─────────────────────────────────────────────────────────────

  const liveSub = (subs) =>
    (subs || [])
      .filter((s) => ["trialing", "active", "past_due"].includes(s.status) && ms(s.current_period_end) > Date.now())
      .sort((a, b) => RANK[b.tier] - RANK[a.tier] || ms(a.created_at) - ms(b.created_at))[0] || null;

  const getMembershipDetails = async () => {
    const me = await requireUid();
    const [p, subs, session] = await Promise.all([
      run(supabase.from("profiles").select("tier, username").eq("id", me).single()),
      run(supabase.from("subscriptions").select("*").eq("user_id", me).order("created_at")),
      supabase.auth.getSession(),
    ]);
    const sub = liveSub(subs);
    const since = sub ? ms((subs || []).filter((s) => s.tier === sub.tier)[0]?.created_at || sub.created_at) : null;
    const ledger = since
      ? await run(supabase.from("ledger").select("amount, reason").eq("user_id", me).eq("currency", "out").gt("amount", 0).gte("created_at", new Date(since).toISOString()))
      : [];
    const earned = { base: 0, bonus: 0 };
    for (const t of ledger || []) {
      if (t.reason === "member_bonus") earned.bonus += t.amount;
      else if (BONUS_REASONS.includes(t.reason)) earned.base += t.amount;
    }
    const referral = sub?.provider_ref?.startsWith("referral:");
    const billing = sub ? (sub.yearly ? "yearly" : "monthly") : null;
    return {
      tier: p.tier,
      plan: sub?.tier || p.tier,
      billing,
      status: p.tier === "free" ? null : sub?.status || "active",
      source: referral ? "referral" : sub?.source || null,
      since,
      renewsAt: referral || sub?.status === "cancelled" ? null : ms(sub?.current_period_end),
      endsAt: referral ? ms(sub?.current_period_end) : null,
      trialEndsAt: sub?.status === "trialing" ? ms(sub.current_period_end) : null,
      trialUsed: (subs || []).length > 0,
      price: sub && !referral ? priceLabel(sub.tier, billing) : null,
      account: session?.data?.session?.user?.email || `@${p.username}`,
      earned,
      freezesPerMonth: freezesFor(p.tier),
      checkoutUrl: null,
    };
  };

  const purchaseMembership = async ({ plan, billing = "monthly" } = {}) => {
    await requireUid();
    if (plan !== "pro" && plan !== "black") throw new EngineError("BAD_TIER", "Pick Pro or Black.");
    return { done: false, checkoutUrl: checkoutUrl(plan, billing), tier: plan, membership: null };
  };

  // Web subscriptions are managed on the website (Stripe's portal).
  const cancelMembership = async () => {
    await requireUid();
    return { done: false, manageUrl: MANAGE_URL, membership: null };
  };

  const restorePurchases = async () => {
    changed();
    return getMembershipDetails();
  };

  // ── Streaks and freezes ────────────────────────────────────────────────────

  const getStreakStatus = async () => {
    const me = await requireUid();
    const [p, today, freezes] = await Promise.all([
      run(supabase.from("profiles").select("tier, streak_days, best_streak").eq("id", me).single()),
      run(supabase.from("daily_steps").select("steps").eq("user_id", me).eq("day", dayKey()).maybeSingle()),
      rpc("streak_freeze_status"),
    ]);
    const steps = today?.steps || 0;
    const active = steps >= ACTIVE_DAY_STEPS;
    const frozen = !!freezes?.frozenToday;
    const midnight = addDays(startOfDay(), 1).getTime();
    const left = Math.max(0, ACTIVE_DAY_STEPS - steps);
    const streak = p.streak_days || 0;
    return {
      streak,
      best: Math.max(streak, p.best_streak || 0),
      todaySteps: steps,
      target: ACTIVE_DAY_STEPS,
      stepsLeft: active ? 0 : left,
      minutesToGo: active ? 0 : Math.max(1, Math.ceil(left / 110)),
      endsAt: midnight,
      hoursLeft: Math.max(0, Math.ceil((midnight - Date.now()) / HOUR_MS)),
      safe: active || frozen,
      active,
      frozenToday: frozen,
      atRisk: !active && !frozen && streak > 0,
      freezes: { allowance: freezes?.allowance ?? freezesFor(p.tier), used: freezes?.used ?? 0, left: freezes?.left ?? 0 },
      tier: p.tier,
    };
  };

  const spendStreakFreeze = async () => {
    await rpc("use_streak_freeze");
    changed();
    return getStreakStatus();
  };

  // ── Badges and emotes ──────────────────────────────────────────────────────

  const myStats = async (me) => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const [p, runs, days, wins, clubs, checkins, referrals] = await Promise.all([
      run(supabase.from("profiles").select("streak_days, best_streak, founding_number").eq("id", me).single()),
      run(supabase.from("runs").select("distance_m, started_at, kind").eq("user_id", me).neq("kind", "walk")),
      run(supabase.from("daily_steps").select("steps, flagged").eq("user_id", me)),
      count(supabase.from("battles").select("id", { count: "exact", head: true }).eq("status", "finished").eq("winner_id", me)),
      count(supabase.from("club_members").select("club_id", { count: "exact", head: true }).eq("user_id", me)),
      count(supabase.from("event_rsvps").select("event_id", { count: "exact", head: true }).eq("user_id", me).eq("status", "checked_in")),
      count(supabase.from("referrals").select("referee_id", { count: "exact", head: true }).eq("referrer_id", me).not("qualified_at", "is", null)),
    ]);
    const byMonth = {};
    for (const r of runs || []) {
      const d = new Date(r.started_at);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      byMonth[k] = (byMonth[k] || 0) + r.distance_m / 1000;
    }
    const counted = (days || []).filter((d) => !d.flagged);
    return {
      runs: (runs || []).length,
      longestRunKm: Math.max(0, ...(runs || []).map((r) => r.distance_m / 1000)),
      monthKm: Math.round(Math.max(0, ...Object.values(byMonth)) * 10) / 10,
      nightRun: 0,
      earlyRun: 0,
      bestDaySteps: Math.max(0, ...counted.map((d) => d.steps)),
      totalSteps: counted.reduce((sum, d) => sum + d.steps, 0),
      bestStreak: Math.max(p.streak_days || 0, p.best_streak || 0),
      founding: p.founding_number ? 1 : 0,
      wins,
      winRun: Math.min(wins, 1),
      clubs,
      eventCheckins: checkins,
      derbyWins: 0,
      squadCalls: 0,
      referrals,
    };
  };

  const listBadges = async () => {
    const me = await requireUid();
    const [earnedRows, stats] = await Promise.all([run(supabase.from("member_badges").select("badge_id, earned_at").eq("user_id", me)), myStats(me)]);
    const earnedAt = Object.fromEntries((earnedRows || []).map((r) => [r.badge_id, ms(r.earned_at)]));
    // The server is the judge: only badges it has awarded count as earned.
    const items = badgeList(stats, earnedAt).map((b) => (earnedAt[b.id] ? b : { ...b, earned: false, progress: Math.min(0.99, b.progress), toGo: b.progress >= 1 ? "On its way" : b.toGo }));
    return { total: BADGES.length, earnedCount: items.filter((b) => b.earned).length, items };
  };

  const listEmotes = async () => {
    const me = await requireUid();
    const [owned, tray, counts, stats] = await Promise.all([
      run(supabase.from("member_emotes").select("emote_id, earned_at, seen_at").eq("user_id", me)),
      run(supabase.from("emote_trays").select("emotes").eq("user_id", me).maybeSingle()),
      rpc("emote_counts").catch(() => []),
      myStats(me),
    ]);
    const mine = Object.fromEntries((owned || []).map((r) => [r.emote_id, r]));
    const held = Object.fromEntries((counts || []).map((c) => [c.emote_id, c]));
    const trayIds = tray?.emotes || [];
    const items = EMOTES.map((e, i) => {
      const value = e.stat ? Number(stats[e.stat]) || 0 : 0;
      const c = held[e.id];
      const holders = Number(c?.holders || 0);
      const members = Number(c?.members || 0);
      return {
        id: e.id,
        label: e.label,
        how: e.how,
        source: e.source,
        style: e.style || null,
        sort: i,
        owned: !!mine[e.id],
        earnedAt: ms(mine[e.id]?.earned_at),
        seen: !!mine[e.id]?.seen_at,
        inTray: trayIds.includes(e.id),
        value,
        target: e.target || null,
        progress: mine[e.id] ? 1 : e.target ? Math.min(0.99, value / e.target) : 0,
        rarity: e.source === "starter" || !holders || !members ? null : `1 in ${Math.max(1, Math.round(members / holders))}`,
      };
    });
    const next = items.filter((e) => !e.owned && e.target && e.id !== "crown").sort((a, b) => b.progress - a.progress)[0] || null;
    return {
      total: items.length,
      ownedCount: items.filter((e) => e.owned).length,
      items,
      tray: trayIds,
      next,
      unseen: items.filter((e) => e.owned && !e.seen).map((e) => e.id),
    };
  };

  const setEmoteTray = async (ids = []) => {
    await rpc("set_emote_tray", { p_emotes: ids });
    changed();
    return listEmotes();
  };

  const markEmoteSeen = async (id) => {
    await rpc("mark_emote_seen", { p_emote: id });
    changed();
    return listEmotes();
  };

  // ── People ─────────────────────────────────────────────────────────────────

  const clubBrief = (c, me) =>
    c && {
      id: c.id,
      name: c.name,
      logo: publicUrl("club-media", c.logo_path),
      cover: publicUrl("club-media", c.cover_path),
      accent: c.accent,
      area: cityName(c.borough_id) || cityName(c.city_id),
      city: cityName(c.city_id),
      memberCount: c.member_count || 0,
      verified: c.status === "verified",
      isMember: me ? (c.club_members || []).some((m) => m.user_id === me) : false,
    };

  const CLUB_BRIEF = "id, name, logo_path, cover_path, accent, city_id, borough_id, member_count, status, club_members(user_id)";

  const getPlayerCard = async (pid) => {
    const me = await requireUid();
    const p = await run(supabase.from("profiles").select(PERSON).eq("id", pid).maybeSingle());
    if (!p) throw new EngineError("NOT_FOUND", "Player not found.");
    const weekFrom = dayKey(startOfWeek());
    const [[view], mineRow, week, all, badges, clubs, myClubs, battles] = await Promise.all([
      peopleViews([p], me, await followingSet(me)),
      run(supabase.from("profiles").select(PERSON).eq("id", me).single()),
      run(supabase.from("daily_steps").select("user_id, steps").in("user_id", [me, pid]).gte("day", weekFrom)),
      run(supabase.from("daily_steps").select("steps, distance_m").eq("user_id", pid)),
      count(supabase.from("member_badges").select("badge_id", { count: "exact", head: true }).eq("user_id", pid)),
      run(supabase.from("club_members").select(`clubs(${CLUB_BRIEF})`).eq("user_id", pid)),
      run(supabase.from("club_members").select("club_id").eq("user_id", me)),
      me === pid
        ? []
        : run(
            supabase
              .from("battles")
              .select("status, winner_id")
              .or(`and(challenger_id.eq.${me},opponent_id.eq.${pid}),and(challenger_id.eq.${pid},opponent_id.eq.${me})`)
              .gte("created_at", startOfWeek().toISOString())
              .not("status", "in", "(declined,cancelled,expired)"),
          ),
    ]);
    const sum = (id) => (week || []).filter((d) => d.user_id === id).reduce((n, d) => n + d.steps, 0);
    const theirClubs = (clubs || []).map((m) => m.clubs).filter(Boolean);
    const mineIds = new Set((myClubs || []).map((m) => m.club_id));
    const totalSteps = (all || []).reduce((n, d) => n + d.steps, 0);
    return {
      ...view,
      level: levelFromXp(p.xp || 0),
      streak: p.streak_days || 0,
      club: clubBrief(theirClubs[0], me),
      totals: { steps: totalSteps, km: Math.round((all || []).reduce((n, d) => n + d.distance_m, 0) / 1000), badges },
      week: {
        mine: sum(me),
        theirs: sum(pid),
        battles: (battles || []).length,
        myWins: (battles || []).filter((b) => b.winner_id === me).length,
        theirWins: (battles || []).filter((b) => b.winner_id === pid).length,
      },
      me: playerView(mineRow, me),
      sharedClubId: theirClubs.find((c) => mineIds.has(c.id))?.id || null,
      myCity: cityName(mineRow.city_id),
    };
  };

  const searchAll = async (query = "") => {
    const me = await uid();
    const q = query.trim().toLowerCase().replace(/[%_,()]/g, "");
    if (!q) return { query: "", people: [], crews: [], events: [] };
    const [people, crews, events] = await Promise.all([
      run(supabase.from("profiles").select(PERSON).or(`username.ilike.%${q}%,display_name.ilike.%${q}%`).not("onboarded_at", "is", null).limit(12)),
      run(supabase.from("clubs").select(CLUB_BRIEF).ilike("name", `%${q}%`).limit(12)),
      run(supabase.from("events").select("*, clubs(name)").or(`title.ilike.%${q}%,place_name.ilike.%${q}%`).gte("starts_at", new Date(Date.now() - 3 * HOUR_MS).toISOString()).is("cancelled_at", null).order("starts_at").limit(8)),
    ]);
    const views = await peopleViews(people || [], me, me ? await followingSet(me) : new Set());
    return {
      query: q,
      people: views.map((v, i) => ({ ...v, level: (people || [])[i]?.level || 1 })),
      crews: (crews || []).map((c) => clubBrief(c, me)),
      events: await eventViews(events || [], me),
    };
  };

  const suggestPeople = async () => {
    const me = await requireUid();
    const [mine, following] = await Promise.all([run(supabase.from("profiles").select("city_id, borough_id").eq("id", me).single()), followingSet(me)]);
    const rows = await run(supabase.from("profiles").select(PERSON).eq("city_id", mine.city_id).neq("id", me).not("onboarded_at", "is", null).limit(40));
    const fresh = (rows || []).filter((p) => !following.has(p.id)).sort((a, b) => Number(b.borough_id === mine.borough_id) - Number(a.borough_id === mine.borough_id)).slice(0, 8);
    return peopleViews(fresh, me, following);
  };

  const matchContacts = async (contacts = []) => {
    const me = await requireUid();
    const emails = [...new Set(contacts.flatMap((c) => c.emails || []).map((e) => e.trim().toLowerCase()).filter(Boolean))].slice(0, 500);
    if (!emails.length) return [];
    const ids = (await rpc("match_contacts", { p_emails: emails })) || [];
    if (!ids.length) return [];
    const rows = await run(supabase.from("profiles").select(PERSON).in("id", ids.map((r) => r.id)));
    return peopleViews(rows || [], me, await followingSet(me));
  };

  // ── Invite friends ─────────────────────────────────────────────────────────

  const getReferrals = async () => {
    const me = await requireUid();
    const [p, mine, invitedBy] = await Promise.all([
      run(supabase.from("profiles").select("username, onboarded_at, created_at").eq("id", me).single()),
      run(supabase.from("referrals").select(`referee_id, created_at, qualified_at, profiles!referrals_referee_id_fkey(${PERSON})`).eq("referrer_id", me).order("created_at")),
      run(supabase.from("referrals").select(`referrer_id, profiles!referrals_referrer_id_fkey(${PERSON})`).eq("referee_id", me).maybeSingle()),
    ]);
    const rows = mine || [];
    const pendingIds = rows.filter((r) => !r.qualified_at).map((r) => r.referee_id);
    const from = rows.length ? dayKey(new Date(Math.min(...rows.map((r) => ms(r.created_at))))) : null;
    const [views, steps] = await Promise.all([
      peopleViews(rows.map((r) => r.profiles).filter(Boolean), me),
      pendingIds.length ? run(supabase.from("daily_steps").select("user_id, day, steps").in("user_id", pendingIds).gte("day", from)) : [],
    ]);
    const byId = Object.fromEntries(views.map((v) => [v.id, v]));
    const friends = rows.map((r) => ({
      player: byId[r.referee_id] || null,
      joinedAt: ms(r.created_at),
      qualified: !!r.qualified_at,
      steps: r.qualified_at
        ? REFERRAL.stepsToQualify
        : Math.min(REFERRAL.stepsToQualify, (steps || []).filter((d) => d.user_id === r.referee_id && d.day >= dayKey(new Date(ms(r.created_at)))).reduce((n, d) => n + d.steps, 0)),
    }));
    const qualified = friends.filter((f) => f.qualified);
    const next = REFERRAL.milestones.find((m) => m.friends > qualified.length) || null;
    const joined = ms(p.onboarded_at || p.created_at) || 0;
    return {
      link: inviteLink(p.username),
      code: p.username,
      joined: qualified,
      pending: friends.filter((f) => !f.qualified).sort((a, b) => b.steps - a.steps),
      qualifiedCount: qualified.length,
      joinedCount: friends.length,
      earnedOut: qualified.length * REFERRAL.out,
      target: REFERRAL.stepsToQualify,
      milestones: REFERRAL.milestones.map((m) => ({ ...m, reached: qualified.length >= m.friends })),
      next: next ? { ...next, left: next.friends - qualified.length } : null,
      referredBy: invitedBy?.profiles ? playerView(invitedBy.profiles, me) : null,
      canClaim: !invitedBy && Date.now() - joined < REFERRAL_WINDOW_MS,
    };
  };

  // Friends join through the link on the website; nothing to record here.
  const recordInviteShare = async () => getReferrals();

  const claimReferral = async (username) => {
    await rpc("claim_referral", { p_username: (username || "").trim() });
    changed();
    return getReferrals();
  };

  // ── OUT history ────────────────────────────────────────────────────────────

  const getOutHistory = async () => {
    const me = await requireUid();
    const [w, rows] = await Promise.all([
      run(supabase.from("wallets").select("*").eq("user_id", me).maybeSingle()),
      run(supabase.from("ledger").select("id, amount, label, reason, created_at, available_at").eq("user_id", me).eq("currency", "out").order("created_at", { ascending: false }).limit(300)),
    ]);
    const weekStart = startOfWeek().getTime();
    const items = (rows || []).map((t) => ({ id: String(t.id), amount: t.amount, label: t.label, reason: t.reason, at: ms(t.created_at), heldUntil: ms(t.available_at) > Date.now() ? ms(t.available_at) : null }));
    const week = items.filter((t) => t.at >= weekStart);
    return {
      balance: w?.out_available || 0,
      held: w?.out_held || 0,
      weekEarned: week.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
      weekSpent: week.filter((t) => t.amount < 0).reduce((sum, t) => sum - t.amount, 0),
      spentOnDrops: items.filter((t) => t.amount < 0 && ["drop", "redeem"].includes(t.reason)).reduce((sum, t) => sum - t.amount, 0),
      items,
    };
  };

  return {
    getMembershipDetails,
    purchaseMembership,
    cancelMembership,
    restorePurchases,
    getStreakStatus,
    spendStreakFreeze,
    listBadges,
    listEmotes,
    setEmoteTray,
    markEmoteSeen,
    getPlayerCard,
    searchAll,
    suggestPeople,
    matchContacts,
    getReferrals,
    recordInviteShare,
    claimReferral,
    getOutHistory,
  };
};
