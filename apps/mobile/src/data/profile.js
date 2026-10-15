// Profile, membership, wallet, friends, badges and emotes for the local
// engine. Built by engine.js with its private helpers (like clubs.js), so it
// reads and writes the same saved world. Remote twins live in
// remoteProfile.js with the same names and return shapes.
//
// Reads that move the world on (a badge reached, a referred friend walking
// their 10k, a cancelled plan running out) use touch, which saves without
// waking every screen.

import { DAY_MS, HOUR_MS, addDays, dayKey, startOfDay, startOfWeek } from "./time";
import { noise } from "./random";
import { PLANS, REFERRAL, TRIAL_DAYS, freezesFor, inviteLink, planOf, priceLabel, BONUS_REASONS } from "@/constants/plans";
import { BADGES, badgeList } from "@/constants/badges";
import { EMOTES, EMOTE_BY_ID, STARTER_EMOTES, TRAY_SIZE } from "@/constants/emotes";

const REFERRAL_WINDOW_MS = 7 * DAY_MS;
const FRIEND_JOINS_AFTER_MS = 2 * 60 * 1000;

const monthKey = (ms = Date.now()) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const addMonths = (ms, n) => {
  const d = new Date(ms);
  d.setMonth(d.getMonth() + n);
  return d.getTime();
};

export const makeProfile = (h) => {
  const {
    read,
    write,
    touch,
    requireMe,
    notify,
    award,
    EngineError,
    ME,
    PLAYERS,
    ACTIVE_DAY_STEPS,
    STEP_KM,
    computeStreak,
    computeLongestStreak,
    myDay,
    balance,
    myStepsBetween,
    playerStepsBetween,
    playerStreak,
    playerXp,
    personView,
    meAsPlayer,
    levelFromXp,
    eventViews,
    crewBrief,
  } = h;

  const playerById = Object.fromEntries(PLAYERS.map((p) => [p.id, p]));

  // Older saved worlds don't have these yet.
  const ensure = (s) => {
    s.streakFreezes = s.streakFreezes || {};
    s.badgeEarned = s.badgeEarned || {};
    s.emoteState = s.emoteState || { owned: {}, seen: {}, tray: [] };
    s.referrals = s.referrals || { shares: [], friends: [], referredBy: null, milestones: {} };
    return s;
  };

  // ── Membership ─────────────────────────────────────────────────────────────

  // A cancelled plan runs to the end of what was paid for, then drops to Free.
  const settleMembership = (s) => {
    const m = s.membership;
    if (!m || !s.me) return false;
    const now = Date.now();
    if (m.status === "trialing" && m.trialEndsAt && now >= m.trialEndsAt && !m.cancelAt) {
      m.status = "active";
      m.renewsAt = m.billing === "yearly" ? addMonths(m.trialEndsAt, 12) : addMonths(m.trialEndsAt, 1);
      return true;
    }
    if (m.cancelAt && now >= m.cancelAt && m.status !== "expired") {
      m.status = "expired";
      s.me.tier = "free";
      notify(s, { type: "rewards", title: `Your ${planOf(m.plan).name} membership has ended`, body: "You're on Free now. Your streak, badges and OUT are all still yours.", link: "/membership" });
      return true;
    }
    if (m.status === "active" && m.renewsAt && now >= m.renewsAt && !m.cancelAt) {
      m.renewsAt = m.billing === "yearly" ? addMonths(m.renewsAt, 12) : addMonths(m.renewsAt, 1);
      return true;
    }
    return false;
  };

  const earnedSince = (s, since) => {
    let base = 0;
    let bonus = 0;
    for (const t of s.ledger) {
      if (t.type !== "out" || t.amount <= 0 || (since && t.at < since)) continue;
      if (t.reason === "member_bonus") bonus += t.amount;
      else if (BONUS_REASONS.includes(t.reason)) base += t.amount;
    }
    return { base, bonus };
  };

  const membershipView = (s) => {
    const me = requireMe(s);
    const m = s.membership && s.membership.status !== "expired" ? s.membership : null;
    const tier = me.tier || "free";
    const plan = m?.plan || tier;
    return {
      tier,
      plan,
      billing: m?.billing || null,
      status: tier === "free" ? null : m?.status || "active",
      source: m?.source || (tier === "free" ? null : "local"),
      since: m?.since || null,
      renewsAt: m?.cancelAt ? null : m?.renewsAt || null,
      endsAt: m?.cancelAt || null,
      trialEndsAt: m?.status === "trialing" ? m.trialEndsAt : null,
      trialUsed: !!s.membershipTrialUsed,
      price: m?.billing ? priceLabel(plan, m.billing) : null,
      account: `@${me.username}`,
      earned: earnedSince(s, m?.since || null),
      freezesPerMonth: freezesFor(tier),
      checkoutUrl: null,
    };
  };

  const getMembershipDetails = async () => touch((s) => (settleMembership(ensure(s)), membershipView(s)));

  // In-app purchases aren't set up, so here checkout is simulated: the first
  // paid plan gets the free week, then the plan starts at once.
  const purchaseMembership = async ({ plan, billing = "monthly" } = {}) =>
    write((s) => {
      const me = requireMe(ensure(s));
      if (!PLANS[plan] || plan === "free") throw new EngineError("BAD_TIER", "Pick Pro or Black.");
      const now = Date.now();
      const current = s.membership && s.membership.status !== "expired" ? s.membership : null;
      if (current && current.plan === plan && current.billing === billing && !current.cancelAt) throw new EngineError("ALREADY", `You're already on ${planOf(plan).name}.`);
      const trial = !s.membershipTrialUsed;
      s.membershipTrialUsed = true;
      s.membership = {
        plan,
        billing,
        source: "local",
        status: trial ? "trialing" : "active",
        since: current?.since || now,
        trialEndsAt: trial ? now + TRIAL_DAYS * DAY_MS : null,
        renewsAt: trial ? now + TRIAL_DAYS * DAY_MS : billing === "yearly" ? addMonths(now, 12) : addMonths(now, 1),
        cancelAt: null,
      };
      me.tier = plan;
      if (plan === "black") grantEmote(s, "crown");
      notify(s, { type: "rewards", title: `Welcome to ${planOf(plan).name}`, body: `${planOf(plan).outMultiplier}x OUT on every km is live.`, link: "/membership/manage" });
      return { done: true, checkoutUrl: null, tier: plan, membership: membershipView(s) };
    });

  const cancelMembership = async () =>
    write((s) => {
      requireMe(ensure(s));
      const m = s.membership;
      if (!m || m.status === "expired" || s.me.tier === "free") throw new EngineError("NOT_FOUND", "You're on Free already.");
      m.cancelAt = m.status === "trialing" ? m.trialEndsAt : m.renewsAt || Date.now();
      m.status = "cancelled";
      return { done: true, manageUrl: null, membership: membershipView(s) };
    });

  const restorePurchases = async () => getMembershipDetails();

  // ── Streaks and freezes ────────────────────────────────────────────────────

  const freezeAllowance = (s) => {
    const allowance = freezesFor(s.me?.tier);
    const month = monthKey();
    const used = Object.keys(s.streakFreezes).filter((k) => k.startsWith(month)).length;
    return { allowance, used, left: Math.max(0, allowance - used) };
  };

  const streakView = (s) => {
    requireMe(s);
    const key = dayKey();
    const today = myDay(s, key);
    const steps = today.steps || 0;
    const active = !!today.checkedIn || steps >= ACTIVE_DAY_STEPS;
    const frozen = !!s.streakFreezes[key];
    const streak = computeStreak(s);
    const midnight = addDays(startOfDay(), 1).getTime();
    const left = Math.max(0, ACTIVE_DAY_STEPS - steps);
    return {
      streak,
      best: Math.max(streak, computeLongestStreak(s)),
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
      freezes: freezeAllowance(s),
      tier: s.me.tier,
    };
  };

  const getStreakStatus = async () => read((s) => streakView(ensure(s)));

  // Keeps today safe without the steps. Pro has 1 a month, Black 3.
  const spendStreakFreeze = async () =>
    write((s) => {
      const me = requireMe(ensure(s));
      const view = streakView(s);
      if (me.tier === "free") throw new EngineError("TIER_REQUIRED", "Streak freezes come with Pro and Black.", { requiredTier: "pro" });
      if (view.active) throw new EngineError("NOT_NEEDED", "Today's already done. Your streak is safe.");
      if (view.frozenToday) throw new EngineError("ALREADY_FROZEN", "Today is already frozen.");
      if (view.streak === 0) throw new EngineError("NO_STREAK", "There's no streak to protect yet.");
      if (view.freezes.left <= 0) throw new EngineError("NO_FREEZES_LEFT", `You've used your ${view.freezes.allowance === 1 ? "freeze" : "freezes"} this month.`);
      s.streakFreezes[dayKey()] = Date.now();
      return streakView(s);
    });

  // ── Badges and emotes ──────────────────────────────────────────────────────

  const myClubIds = (s) => Object.values(s.crews).filter((c) => c.members.some((m) => m.id === ME)).map((c) => c.id);

  const winRun = (s) => {
    const done = s.battles.filter((b) => b.status === "complete").sort((a, b) => (a.completedAt || 0) - (b.completedAt || 0));
    let best = 0;
    let run = 0;
    for (const b of done) {
      run = b.winnerId === ME ? run + 1 : 0;
      best = Math.max(best, run);
    }
    return best;
  };

  const qualifiedReferrals = (s) => s.referrals.friends.filter((f) => f.qualifiedAt).length;

  const myStats = (s) => {
    const runs = s.runs || [];
    const byMonth = {};
    for (const r of runs) byMonth[monthKey(r.startedAt)] = (byMonth[monthKey(r.startedAt)] || 0) + r.distanceKm;
    const hourOf = (r) => new Date(r.startedAt).getHours();
    const days = Object.values(s.days);
    const clubs = myClubIds(s);
    return {
      runs: runs.length,
      longestRunKm: Math.max(0, ...runs.map((r) => r.distanceKm)),
      monthKm: Math.round(Math.max(0, ...Object.values(byMonth)) * 10) / 10,
      nightRun: runs.some((r) => hourOf(r) >= 22 || hourOf(r) < 4) ? 1 : 0,
      earlyRun: runs.some((r) => hourOf(r) >= 4 && hourOf(r) < 7) ? 1 : 0,
      bestDaySteps: Math.max(0, ...days.map((d) => d.steps || 0)),
      totalSteps: days.reduce((sum, d) => sum + (d.steps || 0), 0),
      bestStreak: Math.max(computeStreak(s), computeLongestStreak(s)),
      founding: s.me?.foundingNumber ? 1 : 0,
      wins: s.battles.filter((b) => b.status === "complete" && b.winnerId === ME).length,
      winRun: winRun(s),
      clubs: clubs.length,
      eventCheckins: Object.values(s.events).filter((e) => e.checkedIn).length + Object.values(s.clubRuns || {}).filter((r) => r.checkedIn).length,
      derbyWins: (s.clubBattles || []).filter((b) => b.status === "finished" && b.result?.winner && clubs.includes(b.result.winner)).length,
      squadCalls: 0,
      referrals: qualifiedReferrals(s),
    };
  };

  const grantEmote = (s, id) => {
    const st = s.emoteState;
    if (st.owned[id] || !EMOTE_BY_ID[id]) return false;
    st.owned[id] = Date.now();
    if (STARTER_EMOTES.includes(id)) {
      st.seen[id] = true;
      return true;
    }
    notify(s, { type: "rewards", title: `New emote: ${EMOTE_BY_ID[id].label}`, body: "Add it to your tray.", link: `/emotes?new=${id}` });
    return true;
  };

  // Records badges and emotes as they're reached. Returns true if anything new.
  const syncAwards = (s) => {
    ensure(s);
    if (!s.me) return false;
    let changedAny = false;
    const stats = myStats(s);
    for (const b of BADGES) {
      if (s.badgeEarned[b.id] || (Number(stats[b.stat]) || 0) < b.target) continue;
      s.badgeEarned[b.id] = Date.now();
      notify(s, { type: "rewards", title: `New badge: ${b.label}`, body: b.description, link: "/badges" });
      changedAny = true;
    }
    for (const id of STARTER_EMOTES) changedAny = grantEmote(s, id) || changedAny;
    for (const e of EMOTES) {
      if (!e.stat) continue;
      if ((Number(stats[e.stat]) || 0) >= e.target) changedAny = grantEmote(s, e.id) || changedAny;
    }
    if (s.me.tier === "black") changedAny = grantEmote(s, "crown") || changedAny;
    const st = s.emoteState;
    if (!st.tray.length) st.tray = Object.keys(st.owned).slice(0, TRAY_SIZE);
    return changedAny;
  };

  const badgesView = (s) => {
    const items = badgeList(myStats(s), s.badgeEarned);
    return { total: items.length, earnedCount: items.filter((b) => b.earned).length, items };
  };

  const listBadges = async () => touch((s) => (syncAwards(s), badgesView(s)));

  // How rare an emote is among simulated players: harder rules, rarer.
  const rarityOf = (e) => {
    if (e.source === "starter") return null;
    const per = { flame: 2, bolt: 3, wings: 12, watch: 6, crown: 9, inferno: 15 }[e.id] || 8;
    return `1 in ${per}`;
  };

  const emotesView = (s) => {
    const st = s.emoteState;
    const stats = myStats(s);
    const items = EMOTES.map((e, i) => {
      const value = e.stat ? Number(stats[e.stat]) || 0 : 0;
      return {
        id: e.id,
        label: e.label,
        how: e.how,
        source: e.source,
        style: e.style || null,
        sort: i,
        owned: !!st.owned[e.id],
        earnedAt: st.owned[e.id] || null,
        seen: !!st.seen[e.id],
        inTray: st.tray.includes(e.id),
        value,
        target: e.target || null,
        progress: st.owned[e.id] ? 1 : e.target ? Math.min(1, value / e.target) : 0,
        rarity: rarityOf(e),
      };
    });
    const locked = items.filter((e) => !e.owned && e.target && e.id !== "crown");
    const next = locked.sort((a, b) => b.progress - a.progress)[0] || null;
    return {
      total: items.length,
      ownedCount: items.filter((e) => e.owned).length,
      items: items.sort((a, b) => a.sort - b.sort),
      tray: [...st.tray],
      next,
      unseen: items.filter((e) => e.owned && !e.seen).map((e) => e.id),
    };
  };

  const listEmotes = async () => touch((s) => (syncAwards(s), emotesView(s)));

  const setEmoteTray = async (ids = []) =>
    write((s) => {
      requireMe(ensure(s));
      syncAwards(s);
      const clean = [...new Set(ids)];
      if (clean.length > TRAY_SIZE) throw new EngineError("TRAY_FULL", `Your tray holds ${TRAY_SIZE}.`);
      if (clean.some((id) => !s.emoteState.owned[id])) throw new EngineError("NOT_OWNED", "You haven't earned that one yet.");
      s.emoteState.tray = clean;
      for (const id of clean) s.emoteState.seen[id] = true;
      return emotesView(s);
    });

  const markEmoteSeen = async (id) =>
    write((s) => {
      requireMe(ensure(s));
      s.emoteState.seen[id] = true;
      return emotesView(s);
    });

  // ── People ─────────────────────────────────────────────────────────────────

  const sharedClubWith = (s, pid) => Object.values(s.crews).find((c) => c.members.some((m) => m.id === ME) && c.members.some((m) => m.id === pid)) || null;

  // Someone else's profile: the head to head this week above their numbers.
  const getPlayerCard = async (pid) =>
    read((s) => {
      const me = requireMe(ensure(s));
      const person = personView(s, pid);
      if (!person) throw new EngineError("NOT_FOUND", "Player not found.");
      const weekStart = startOfWeek().getTime();
      const now = Date.now();
      const p = playerById[pid];
      const days = 120 + Math.round(noise(`${pid}:joined`) * 260);
      const totalSteps = pid === ME ? Object.values(s.days).reduce((sum, d) => sum + (d.steps || 0), 0) : Math.round(p.base * days * 0.92);
      const vs = s.battles.filter((b) => [b.creatorId, b.opponentId].includes(pid) && (b.startAt || b.createdAt) >= weekStart && b.status !== "declined");
      const xp = pid === ME ? balance(s, "xp") : playerXp(pid);
      const shared = sharedClubWith(s, pid);
      const clubs = Object.values(s.crews).filter((c) => c.members.some((m) => m.id === pid));
      return {
        ...person,
        level: levelFromXp(xp),
        streak: pid === ME ? computeStreak(s) : playerStreak(pid),
        club: clubs[0] ? crewBrief(clubs[0]) : null,
        totals: {
          steps: totalSteps,
          km: Math.round(totalSteps * STEP_KM),
          badges: pid === ME ? Object.keys(s.badgeEarned).length : 4 + Math.round(noise(`${pid}:badges`) * 12),
        },
        week: {
          mine: myStepsBetween(s, weekStart, now),
          theirs: pid === ME ? myStepsBetween(s, weekStart, now) : playerStepsBetween(pid, weekStart, now),
          battles: vs.length,
          myWins: vs.filter((b) => b.status === "complete" && b.winnerId === ME).length,
          theirWins: vs.filter((b) => b.status === "complete" && b.winnerId === pid).length,
        },
        me: meAsPlayer(s),
        sharedClubId: shared?.id || null,
        myCity: me.city,
      };
    });

  // One search across people, clubs and events.
  const searchAll = async (query = "") =>
    read((s) => {
      ensure(s);
      const q = query.trim().toLowerCase();
      if (!q) return { query: "", people: [], crews: [], events: [] };
      const has = (...xs) => xs.some((x) => (x || "").toLowerCase().includes(q));
      const people = PLAYERS.filter((p) => has(p.name, p.username, p.area))
        .slice(0, 12)
        .map((p) => ({ ...personView(s, p.id), level: levelFromXp(playerXp(p.id)).level }));
      const crews = Object.values(s.crews)
        .filter((c) => has(c.name, c.area, c.city))
        .slice(0, 12)
        .map((c) => crewBrief(c));
      const events = eventViews(s)
        .filter((e) => has(e.title, e.location))
        .slice(0, 8);
      return { query: q, people, crews, events };
    });

  // People you might know: your area first, then your city.
  const suggestPeople = async () =>
    read((s) => {
      const me = requireMe(ensure(s));
      return PLAYERS.filter((p) => p.city === me.city && !s.following.includes(p.id))
        .sort((a, b) => Number(b.area === me.area) - Number(a.area === me.area))
        .slice(0, 8)
        .map((p) => personView(s, p.id));
    });

  // Contacts on this phone who are on Outhere. The local world matches by
  // first name; the server matches email addresses.
  const matchContacts = async (contacts = []) =>
    read((s) => {
      ensure(s);
      const names = new Set(contacts.map((c) => (c.name || "").trim().split(/\s+/)[0].toLowerCase()).filter(Boolean));
      return PLAYERS.filter((p) => names.has(p.name.toLowerCase())).map((p) => personView(s, p.id));
    });

  // ── Invite friends ─────────────────────────────────────────────────────────

  // Each share brings a simulated friend in a couple of minutes later. Their
  // steps since joining count towards the 10k that pays you 500 OUT.
  const settleReferrals = (s) => {
    const r = s.referrals;
    let any = false;
    const now = Date.now();
    const taken = new Set([...r.friends.map((f) => f.pid), r.referredBy].filter(Boolean));
    for (const at of r.shares) {
      if (r.friends.length >= 12 || now < at + FRIEND_JOINS_AFTER_MS || r.friends.some((f) => f.shareAt === at)) continue;
      const pick = PLAYERS.find((p) => !taken.has(p.id) && p.city === s.me.city) || PLAYERS.find((p) => !taken.has(p.id));
      if (!pick) break;
      taken.add(pick.id);
      r.friends.push({ pid: pick.id, shareAt: at, joinedAt: at + FRIEND_JOINS_AFTER_MS, qualifiedAt: null });
      notify(s, { type: "rewards", title: `${pick.name} joined from your link`, body: "When they walk 10k you both get 500 OUT.", link: "/friends/invite" });
      any = true;
    }
    for (const f of r.friends) {
      if (f.qualifiedAt) continue;
      if (playerStepsBetween(f.pid, f.joinedAt, now) >= REFERRAL.stepsToQualify) {
        f.qualifiedAt = now;
        const name = playerById[f.pid]?.name || "A friend";
        award(s, { out: REFERRAL.out, label: `${name} walked their 10k`, reason: "referral", refId: f.pid });
        notify(s, { type: "rewards", title: `${name} walked their 10k`, body: `${REFERRAL.out} OUT is yours.`, link: "/friends/invite" });
        any = true;
      }
    }
    const count = qualifiedReferrals(s);
    for (const m of REFERRAL.milestones) {
      if (!m.tier || count < m.friends || r.milestones[m.friends]) continue;
      r.milestones[m.friends] = now;
      const rank = ["free", "pro", "black"];
      if (rank.indexOf(s.me.tier) < rank.indexOf(m.tier)) {
        s.membership = { plan: m.tier, billing: "monthly", source: "referral", status: "active", since: now, renewsAt: null, trialEndsAt: null, cancelAt: addMonths(now, 1) };
        s.me.tier = m.tier;
      }
      notify(s, { type: "rewards", title: `A free ${planOf(m.tier).name} month`, body: `${m.friends} friends joined from your link. Thank you.`, link: "/membership/manage" });
      any = true;
    }
    if (any) syncAwards(s);
    return any;
  };

  const referralsView = (s) => {
    const me = s.me;
    const r = s.referrals;
    const now = Date.now();
    const friends = r.friends.map((f) => ({
      player: personView(s, f.pid),
      joinedAt: f.joinedAt,
      qualified: !!f.qualifiedAt,
      steps: f.qualifiedAt ? REFERRAL.stepsToQualify : Math.min(REFERRAL.stepsToQualify, playerStepsBetween(f.pid, f.joinedAt, now)),
    }));
    const qualified = friends.filter((f) => f.qualified);
    const next = REFERRAL.milestones.find((m) => m.friends > qualified.length) || null;
    return {
      link: inviteLink(me.username),
      code: me.username,
      joined: qualified,
      pending: friends.filter((f) => !f.qualified).sort((a, b) => b.steps - a.steps),
      qualifiedCount: qualified.length,
      joinedCount: friends.length,
      earnedOut: qualified.length * REFERRAL.out,
      target: REFERRAL.stepsToQualify,
      milestones: REFERRAL.milestones.map((m) => ({ ...m, reached: qualified.length >= m.friends })),
      next: next ? { ...next, left: next.friends - qualified.length } : null,
      referredBy: r.referredBy ? personView(s, r.referredBy) : null,
      canClaim: !r.referredBy && now - (me.createdAt || 0) < REFERRAL_WINDOW_MS,
    };
  };

  const getReferrals = async () =>
    touch((s) => {
      requireMe(ensure(s));
      settleReferrals(s);
      return referralsView(s);
    });

  const recordInviteShare = async () =>
    write((s) => {
      requireMe(ensure(s));
      s.referrals.shares = [...s.referrals.shares, Date.now()].slice(-20);
      return referralsView(s);
    });

  // Joined from a friend's link: tell us who, within a week of joining.
  const claimReferral = async (username) =>
    write((s) => {
      const me = requireMe(ensure(s));
      const name = (username || "").trim().replace(/^@/, "").toLowerCase();
      const p = PLAYERS.find((x) => x.username === name);
      if (name === me.username) throw new EngineError("SELF", "That's your own name.");
      if (!p) throw new EngineError("NOT_FOUND", "No one has that username.");
      if (s.referrals.referredBy) throw new EngineError("ALREADY_REFERRED", "You've already said who invited you.");
      if (Date.now() - (me.createdAt || 0) > REFERRAL_WINDOW_MS) throw new EngineError("TOO_LATE", "Invites count in your first week.");
      s.referrals.referredBy = p.id;
      award(s, { out: REFERRAL.out, label: `Invited by ${p.name}`, reason: "referral", refId: p.id });
      if (!s.following.includes(p.id)) s.following.push(p.id);
      return referralsView(s);
    });

  // ── OUT history ────────────────────────────────────────────────────────────

  const getOutHistory = async () =>
    read((s) => {
      requireMe(s);
      const weekStart = startOfWeek().getTime();
      const items = s.ledger
        .filter((t) => t.type === "out")
        .sort((a, b) => b.at - a.at)
        .slice(0, 300)
        .map((t) => ({ id: t.id, amount: t.amount, label: t.label, reason: t.reason, at: t.at, heldUntil: null }));
      const week = items.filter((t) => t.at >= weekStart);
      return {
        balance: balance(s, "out"),
        held: 0,
        weekEarned: week.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
        weekSpent: week.filter((t) => t.amount < 0).reduce((sum, t) => sum - t.amount, 0),
        spentOnDrops: items.filter((t) => t.amount < 0 && ["drop", "redeem"].includes(t.reason)).reduce((sum, t) => sum - t.amount, 0),
        items,
      };
    });

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
    // for engine.js
    syncAwards,
  };
};

