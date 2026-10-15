// Outside over Supabase: the same functions as outside.js (local engine) with
// the same names, arguments and shapes. Every rule lives in the database
// (supabase/migrations/20261015101720_outside.sql); this file calls those
// functions and reads a few tables, then reshapes rows for the screens.
// remote.js builds it with its helpers and spreads it into its exports.

import { sortCities } from "./places";
import { ORDER_LABELS, cleanAddress, dropStatus, dropTag, ticketQr } from "./outsideShared";
import { startOfDay } from "./time";

// Database error codes from this area, as the words people see.
const MESSAGES = {
  NOT_IN_SQUAD: "You're not in this squad.",
  KICKED_OFF: "It's already kicked off.",
  ALREADY_LIVE: "That place is already live.",
  MEDALS_GONE: "All 500 medals have gone.",
  ALREADY_USED: "You've already used a friend's code.",
  NEW_MEMBERS_ONLY: "Codes are for people who joined in the last two weeks.",
  NOT_A_PICK: "Pick them on Swipe first.",
  BAD_METRIC: "Pick steps, distance or minutes.",
  BAD_LENGTH: "Pick a day, three days or a week.",
  BAD_STAKE: "Pick a stake.",
  UNDER_18: "Mystery challengers are for over 18s.",
  MYSTERY_OFF: "Switch on mystery challengers first.",
  NO_CHALLENGER: "Nobody near your level is free right now. Try again soon.",
  ALREADY_ANSWERED: "You've already answered.",
  EXPIRED: "Too late, that one's gone.",
  SLOW_DOWN: "Easy, one at a time.",
  ALREADY_BOOSTED: "You've already boosted this one.",
  NOT_FINISHED: "Finish this one first.",
  ALREADY_CLAIMED: "You've already claimed this one.",
  NOT_OPEN: "Not open yet.",
  CLOSED: "This drop has ended.",
  SIZE_REQUIRED: "Pick a size.",
  ADDRESS_REQUIRED: "Add where it's going.",
  NOT_GOING: "Say you're going first.",
  BAD_EMOTE: "Pick an emote.",
};

const ms = (v) => (v ? new Date(v).getTime() : null);
const routePoints = (pts) => (pts || []).map((p) => (Array.isArray(p) ? { latitude: p[0], longitude: p[1] } : p));

export function makeRemoteOutside({ supabase, run, rpc: rawRpc, uid, requireUid, publicUrl, changed, getBattle, EngineError }) {
  // Our codes get our words; everything else is left as remote.js made it.
  const rpc = async (fn, args) => {
    try {
      return await rawRpc(fn, args);
    } catch (e) {
      if (e?.code === "SERVER") {
        const code = String(e.message || "").split(/[\s:]/)[0];
        if (MESSAGES[code]) throw new EngineError(code, MESSAGES[code]);
      }
      throw e;
    }
  };
  const act = async (fn, args) => {
    const out = await rpc(fn, args);
    changed();
    return out;
  };

  // ── Places ──────────────────────────────────────────────────────────────────

  const listCities = async ({ query = "", lat, lng } = {}) => {
    const rows = await run(supabase.from("cities").select("id, name, region, region_id, kind, lat, lng, is_live, launch_night"));
    const list = (rows || []).map((c) => ({ id: c.id, name: c.name, regionId: c.region_id, region: c.region, kind: c.kind, lat: c.lat, lng: c.lng, isLive: c.is_live, launchNight: c.launch_night }));
    return sortCities(list, { query, lat, lng });
  };

  const listAreas = async (cityId) => {
    const rows = await run(supabase.from("boroughs").select("id, name, city_id, kind, tile_col, tile_row").eq("city_id", cityId).order("name"));
    return (rows || []).map((a) => ({ id: a.id, name: a.name, cityId: a.city_id, kind: a.kind, col: a.tile_col, row: a.tile_row }));
  };

  const getPlaySide = async () => {
    const p = await rpc("play_side");
    if (!p) return null;
    return { kind: p.kind, id: p.id, name: p.name, cityId: p.city_id, cityName: p.city_name, cityKind: p.city_kind, isLive: p.is_live, launchNight: p.launch_night, regionId: p.region_id, regionName: p.region_name, cityActive: p.city_active, needed: p.needed };
  };

  // ── City League ─────────────────────────────────────────────────────────────

  const getCityLeague = async () => {
    const l = await rpc("city_league");
    return {
      season: l?.season || null,
      side: l?.side || null,
      sides: (l?.sides || []).map((x) => ({ kind: x.kind, id: x.id, name: x.name, active: x.active, score: x.score, division: x.division, squad: x.squad, mine: x.mine })),
      rising: (l?.rising || []).map((x) => ({ id: x.id, name: x.name, kind: x.kind, regionId: x.region_id, region: x.region, active: x.active, mine: x.mine })),
    };
  };

  const sideOf = (x) => x && { entry: x.entry, kind: x.kind, id: x.id, name: x.name, score: x.score, squadAvg: x.squad_avg, turnout: x.turnout, squad: x.squad, active: x.active };

  const getCityFixture = async (id = null) => {
    const f = await rpc("city_fixture_view", { p_fixture: id });
    if (!f) return null;
    return {
      id: f.id,
      week: f.week,
      startsOn: f.starts_on,
      endsOn: f.ends_on,
      division: f.division,
      squadSize: f.squad_size,
      status: f.status,
      home: sideOf(f.home),
      away: sideOf(f.away),
      mine: f.mine ? { side: f.mine.side, number: f.mine.number, answer: f.mine.answer, steps: f.mine.steps, toBeat: f.mine.to_beat } : null,
    };
  };

  const getCallUp = async () => {
    const c = await rpc("my_call_up");
    if (!c) return null;
    return { fixture: c.fixture, startsOn: c.starts_on, kickOff: c.kick_off, division: c.division, side: c.side, sideKind: c.side_kind, opponent: c.opponent, home: c.home, away: c.away, number: c.number, answer: c.answer, squad: c.squad, pool: c.pool, prizeOut: c.prize_out, open: c.open };
  };

  const respondCallUp = async (fixture, goingIn) => act("respond_call_up", { p_fixture: fixture, p_in: !!goingIn });

  // ── Rising places ───────────────────────────────────────────────────────────

  const getRising = async (cityId = null) => {
    const r = await rpc("rising_view", { p_city: cityId });
    return {
      id: r.id, name: r.name, kind: r.kind, regionId: r.region_id, region: r.region, isLive: r.is_live, launchNight: r.launch_night, isHome: r.is_home,
      active: r.active, needed: r.needed, medal: r.medal, medalsClaimed: r.medals_claimed, medalsTotal: r.medals_total,
      inviteCode: r.invite_code, invitesRedeemed: r.invites_redeemed, inviteOut: r.invite_out, callUpWeekend: r.call_up_weekend,
    };
  };
  const claimFoundingMedal = async (cityId = null) => act("claim_founding_medal", { p_city: cityId });
  const getCityInvite = async () => rpc("my_city_invite");
  const redeemCityInvite = async (code) => act("redeem_city_invite", { p_code: code });

  // ── Areas, clubs and friends this week ──────────────────────────────────────

  const getAreaTable = async (cityId = null, week = null) =>
    ((await rpc("area_table", { p_city: cityId, p_week: week })) || []).map((r) => ({
      areaId: r.area_id, name: r.name, kind: r.kind, col: r.tile_col, row: r.tile_row, counted: Number(r.counted), people: r.people, rank: r.rank, mine: r.mine,
    }));

  const getClubWeekTable = async (cityId = null) =>
    ((await rpc("club_week_table", { p_city: cityId })) || []).map((r) => ({
      clubId: r.club_id, name: r.name, logo: publicUrl("club-media", r.logo_path), areaId: r.borough_id, members: r.members, counted: Number(r.counted), mine: r.mine,
    }));

  const getFriendsWeek = async () =>
    ((await rpc("friends_week")) || []).map((r) => ({
      id: r.user_id, name: r.display_name, avatar: publicUrl("avatars", r.avatar_path), tier: r.tier, areaId: r.borough_id, counted: Number(r.counted), isMe: r.is_me,
    }));

  // ── Swipe to battle ─────────────────────────────────────────────────────────

  const card = (c) => ({
    id: c.id, username: c.username, name: c.display_name, avatar: publicUrl("avatars", c.avatar_path), tier: c.tier, level: c.level,
    cityId: c.city_id, city: c.city, area: c.area, avgSteps: Number(c.avg_steps) || 0, wins: c.wins, played: c.played, dot: c.dot || null, fair: c.fair,
  });

  const getSwipeDeck = async (scope = "near", limit = 20) => ((await rpc("swipe_deck", { p_scope: scope, p_limit: limit })) || []).map(card);
  const swipeRival = async (rivalId, pick) => act("swipe_rival", { p_rival: rivalId, p_pick: !!pick });
  const listPicks = async () => ((await rpc("my_picks")) || []).map(card);
  const challengePick = async ({ rivalId, metric = "steps", durationHours = 72, stakeOut = 100 }) => {
    const b = await act("challenge_pick", { p_rival: rivalId, p_metric: metric, p_duration_h: durationHours, p_stake_out: stakeOut });
    return getBattle(b.id);
  };
  const setShowOnSwipe = async (on) => {
    const me = await requireUid();
    await run(supabase.from("profiles").update({ show_on_swipe: !!on }).eq("id", me));
    changed();
    return !!on;
  };
  // ── Mystery challengers ─────────────────────────────────────────────────────

  const settingsOf = (m) => m && { enabled: m.enabled, minor: m.minor, scope: m.scope, levelGap: m.level_gap, perDay: m.per_day, quietStart: m.quiet_start, quietEnd: m.quiet_end, showOnSwipe: m.show_on_swipe };
  const getMysterySettings = async () => settingsOf(await rpc("mystery_settings_view"));
  const setMysterySettings = async (patch = {}) =>
    settingsOf(
      await act("set_mystery_settings", {
        p_enabled: patch.enabled ?? null,
        p_scope: patch.scope ?? null,
        p_level_gap: patch.levelGap ?? null,
        p_per_day: patch.perDay ?? null,
        p_quiet_start: patch.quietStart ?? null,
        p_quiet_end: patch.quietEnd ?? null,
      })
    );

  const offerOf = (o) =>
    o && {
      id: o.id, metric: o.metric, durationHours: o.duration_h, stakeOut: o.stake_out, expiresAt: ms(o.expires_at), createdAt: ms(o.created_at),
      levelLow: o.level_low, levelHigh: o.level_high, where: o.where, whereCity: o.where, myAnswer: o.my_answer, status: o.status, battleId: o.battle_id,
      rival: o.rival ? { id: o.rival.id, name: o.rival.display_name, username: o.rival.username, avatar: publicUrl("avatars", o.rival.avatar_path), tier: o.rival.tier, level: o.rival.level, metBefore: o.rival.met_before } : null,
      me: o.me,
    };
  const findMysteryChallenger = async () => act("find_mystery_challenger");
  const getMysteryOffer = async (id = null) => offerOf(await rpc("mystery_offer_view", { p_offer: id }));
  const answerMystery = async (id, accept) => offerOf(await act("answer_mystery", { p_offer: id, p_accept: !!accept }));

  // ── In a battle ─────────────────────────────────────────────────────────────

  const sendBattleEmote = async (battleId, code) => {
    const e = await act("send_battle_emote", { p_battle: battleId, p_code: code });
    return { id: String(e.id), code: e.code, at: ms(e.created_at), mine: true };
  };
  const listBattleEmotes = async (battleId) => {
    const me = await uid();
    const rows = await run(supabase.from("battle_emotes").select("id, user_id, code, created_at").eq("battle_id", battleId).order("created_at", { ascending: false }).limit(30));
    return (rows || []).map((e) => ({ id: String(e.id), code: e.code, at: ms(e.created_at), mine: e.user_id === me }));
  };
  const boostBattle = async (battleId) => act("boost_battle", { p_battle: battleId });
  const rematchBattle = async (battleId) => {
    const b = await act("rematch_battle", { p_battle: battleId });
    return getBattle(b.id);
  };
  const getHeadToHead = async (otherId) => rpc("head_to_head", { p_other: otherId });

  // ── The Arena season ────────────────────────────────────────────────────────

  const getArenaNow = async () => {
    const a = await rpc("arena_now");
    return a && { season: a.season, name: a.name, headline: a.headline, week: a.week, weeks: a.weeks, endsOn: a.ends_on, outside: a.outside, battlesLive: a.battles_live };
  };
  const resultsOf = (r) =>
    r && {
      season: r.season, name: r.name, rank: r.rank, players: r.players, points: r.points, city: r.city, prizeOut: r.prize_out, badge: r.badge, perk: r.perk, claimed: r.claimed,
      next: r.next ? { number: r.next.number, name: r.next.name, startsOn: r.next.starts_on, headline: r.next.headline } : null,
    };
  const getSeasonResults = async (season = null) => resultsOf(await rpc("my_season_results", { p_season: season }));
  const claimSeasonRewards = async (season) => resultsOf(await act("claim_season_rewards", { p_season: season }));

  // ── The drop shop and orders ────────────────────────────────────────────────

  const shopViews = async (rows) => {
    const me = await uid();
    const ids = rows.map((d) => d.id);
    const [orders, profile] = await Promise.all([
      me && ids.length ? run(supabase.from("drop_orders").select("id, drop_id, status").eq("user_id", me).in("drop_id", ids)) : [],
      me ? run(supabase.from("profiles").select("tier").eq("id", me).maybeSingle()) : null,
    ]);
    const tier = profile?.tier || "free";
    const rank = { free: 0, pro: 1, black: 2 };
    const now = Date.now();
    return rows.map((d) => {
      const opensAt = ms(d.opens_at);
      const earlyAt = opensAt - (d.early_access_h || 0) * 3600 * 1000;
      const closesAt = ms(d.closes_at);
      const hasEarlyAccess = tier !== "free";
      const mine = (orders || []).find((o) => o.drop_id === d.id && o.status !== "cancelled");
      const status = dropStatus({ now, opensAt, earlyAt, closesAt, remaining: d.stock, hasEarlyAccess });
      const tierOk = rank[tier] >= rank[d.tier_required];
      return {
        id: d.id,
        title: d.title,
        subtitle: (d.description || "").split(". ")[0],
        description: d.description || "",
        image: publicUrl("drops", d.image_path),
        gallery: [],
        priceOut: d.price_out,
        sizes: d.sizes || [],
        soldOutSizes: [],
        sizeNote: "",
        total: null,
        remaining: d.stock,
        tierRequired: d.tier_required,
        tierOk,
        earlyAccessHours: d.early_access_h,
        opensAt,
        earlyAt,
        closesAt,
        status,
        tag: dropTag({ status, tierRequired: d.tier_required, opensAt, now }),
        hasEarlyAccess,
        canClaim: !mine && tierOk && (status === "live" || status === "early"),
        claimed: !!mine,
        orderId: mine?.id || null,
        deliveryOut: tier === "black" ? 0 : 150,
      };
    });
  };

  const listDropShop = async () => {
    const order = { live: 0, early: 1, upcoming: 2, soldout: 3, ended: 4 };
    const list = await shopViews((await run(supabase.from("drops").select("*").order("opens_at", { ascending: false }).limit(40))) || []);
    return list.sort((a, b) => order[a.status] - order[b.status] || a.opensAt - b.opensAt);
  };
  const getDropItem = async (id) => {
    const d = await run(supabase.from("drops").select("*").eq("id", id).maybeSingle());
    if (!d) throw new EngineError("NOT_FOUND", "That drop has gone.");
    return (await shopViews([d]))[0];
  };

  const getDeliveryAddress = async () => {
    const me = await uid();
    if (!me) return null;
    const a = await run(supabase.from("delivery_addresses").select("name, line1, line2, town, postcode").eq("user_id", me).maybeSingle());
    return a ? { name: a.name, line1: a.line1, line2: a.line2 || undefined, town: a.town, postcode: a.postcode } : null;
  };

  const orderOf = (o) =>
    o && {
      id: o.id, ref: o.ref, dropId: o.drop_id, title: o.title, image: publicUrl("drops", o.image_path), size: o.size, status: o.status, statusLabel: ORDER_LABELS[o.status] || o.status,
      outSpent: o.out_spent, deliveryOut: o.delivery_out, address: o.address, createdAt: ms(o.created_at),
      arrivesOn: o.arrives_on ? startOfDay(o.arrives_on).getTime() : null,
      history: (o.history || []).map((e) => ({ status: e.status, at: ms(e.at), note: e.note })),
    };

  const claimDrop = async ({ dropId, size = null, address, saveAddress = true }) =>
    orderOf(await act("claim_drop", { p_drop: dropId, p_size: size, p_address: address ? cleanAddress(address) : null, p_save_address: saveAddress }));
  const listOrders = async () => ((await rpc("my_orders")) || []).map(orderOf);
  const getOrder = async (id) => {
    const o = await rpc("order_view", { p_order: id });
    if (!o) throw new EngineError("NOT_FOUND", "We couldn't find that order.");
    return orderOf(o);
  };

  // ── Event tickets ───────────────────────────────────────────────────────────

  const getTicket = async (eventId) => {
    const t = await rpc("my_ticket", { p_event: eventId });
    return { code: t.code, qr: t.qr || ticketQr(t.code), wave: t.wave, gate: t.gate, name: t.name, checkedIn: t.checked_in };
  };
  const getEventGoing = async (eventId, limit = 60) => {
    const g = await rpc("event_going", { p_event: eventId, p_limit: limit });
    return {
      count: g.count,
      friends: g.friends,
      clubCount: g.club_count,
      clubName: g.club_name || null,
      people: (g.people || []).map((p) => ({ id: p.id, name: p.display_name, username: p.username, avatar: publicUrl("avatars", p.avatar_path), tier: p.tier, following: p.following, club: p.club, wave: p.wave, sameClub: p.same_club })),
    };
  };

  // ── Fair play ───────────────────────────────────────────────────────────────

  const reviewOf = (v) =>
    v && {
      runId: v.run_id, checks: v.checks || [], flaggedM: v.flagged_m, fastKmh: v.fast_kmh != null ? Number(v.fast_kmh) : null, countedM: v.counted_m, distanceM: v.distance_m,
      heldXp: v.held_xp, status: v.status, appealNote: v.appeal_note, createdAt: ms(v.created_at), decideBy: ms(v.decide_by), route: routePoints(v.route), fastStretches: [],
    };
  const getRunReview = async (runId) => reviewOf(await rpc("run_review_view", { p_run: runId }));
  const answerRunReview = async (runId, agree, note = null) => reviewOf(await act("answer_run_review", { p_run: runId, p_agree: !!agree, p_note: note }));

  return {
    listCities, listAreas, getPlaySide, getCityLeague, getCityFixture, getCallUp, respondCallUp, getRising, claimFoundingMedal,
    getCityInvite, redeemCityInvite, getAreaTable, getClubWeekTable, getFriendsWeek, getSwipeDeck, swipeRival, listPicks,
    challengePick, setShowOnSwipe, getMysterySettings, setMysterySettings, findMysteryChallenger, getMysteryOffer, answerMystery,
    sendBattleEmote, listBattleEmotes, boostBattle, rematchBattle, getHeadToHead, getArenaNow, getSeasonResults,
    claimSeasonRewards, listDropShop, getDropItem, getDeliveryAddress, claimDrop, listOrders, getOrder, getTicket,
    getEventGoing, getRunReview, answerRunReview,
  };
}
