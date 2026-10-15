// Outside for the local engine: UK places and the City League, call-ups,
// rising places, area tables, swipe to battle and mystery challengers,
// emotes, boosts and rematches, the Arena season, the drop shop and orders,
// event tickets and fair play. Built by engine.js with its private helpers so
// it reads and writes the same saved world. Reads that move the world on (an
// order shipping, a review decided) use touch.
//
// The same functions exist over Supabase in remoteOutside.js with the same
// names, arguments and shapes; the rules live in the database
// (supabase/migrations/20261015101720_outside.sql). Places a member plays
// for: their city once it has 100 active walkers, their region until then.

import { ACTIVE_TO_GO_LIVE, UK_AREAS, UK_CITIES, UK_REGIONS, areasOf, cityById, divisionFor, findArea, findCity, regionById, sortCities } from "./places";
import { ARENA_SEASONS, CITY_INVITE_CODES, DELIVERY_OUT, DROP_SHOP, EMOTE_CODES, NEIGHBOURHOODS, ORDER_STEPS, SIM_ACTIVE } from "./seedOutside";
import { ORDER_LABELS, addressProblem, analyseRoute, cleanAddress, dropStatus, dropTag, gateFor, ticketQr, waveFor } from "./outsideShared";
import { DAY_MS, HOUR_MS, addDays, dayKey, startOfDay, startOfWeek } from "./time";
import { noise, randomId } from "./random";

const MIN_MS = 60 * 1000;
const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export function makeOutside(h) {
  const { read, write, touch, requireMe, notify, award, balance, EngineError, ME, PLAYERS, myDay, myStepsBetween, playerDayTotal, playerStepsBetween, playerIsOutside, levelFromXp, tierAtLeast } = h;
  const playerById = Object.fromEntries(PLAYERS.map((p) => [p.id, p]));

  const box = (s) => {
    s.outside ||= {};
    const o = s.outside;
    o.picks ||= [];
    o.passes ||= [];
    o.mystery ||= { settings: null, offers: [] };
    o.emotes ||= {};
    o.callUps ||= {};
    o.medals ||= {};
    o.invite ||= { code: null, redeemed: null, redemptions: 0 };
    o.orders ||= [];
    o.reviews ||= {};
    o.seasonClaims ||= {};
    return o;
  };

  // ── Me ──────────────────────────────────────────────────────────────────────

  const myCity = (s) => findCity(s.me?.city) || cityById("london");
  const areaFor = (cityId, name) => {
    if (!name) return null;
    const direct = findArea(cityId, name);
    if (direct) return direct;
    const mapped = NEIGHBOURHOODS[slug(name)];
    const a = mapped ? UK_AREAS.find((x) => x.id === mapped) : null;
    return a && a.cityId === cityId ? a : null;
  };
  const myArea = (s) => {
    const c = myCity(s);
    return areaFor(c.id, s.me?.area) || (c.id === "london" ? UK_AREAS.find((a) => a.id === "southwark") : areasOf(c.id)[0]) || null;
  };
  const myLevel = (s) => levelFromXp(balance(s, "xp"));
  const isMinor = (s) => {
    const me = s.me || {};
    if (me.minor === true || me.isMinor === true) return true;
    if (!me.dob) return false;
    const dob = new Date(me.dob);
    const at18 = new Date(dob.getFullYear() + 18, dob.getMonth(), dob.getDate());
    return Date.now() < at18.getTime();
  };
  const isActiveMe = (s) => {
    let n = 0;
    for (let i = 0; i < 7; i += 1) if (myDay(s, dayKey(addDays(new Date(), -i))).steps >= 3000) n += 1;
    return n >= 3;
  };
  const playerCity = (p) => findCity(p.city);
  const playerArea = (p) => {
    const c = playerCity(p);
    return c ? areaFor(c.id, p.area) : null;
  };

  // ── Places and sides ────────────────────────────────────────────────────────

  const cityActive = (s, id) => {
    const base = SIM_ACTIVE[id] ?? Math.floor(3 + noise(`active:${id}`) * 40);
    return base + (s.me && myCity(s).id === id && isActiveMe(s) ? 1 : 0);
  };
  const cityLive = (s, c) => c.isLive || cityActive(s, c.id) >= ACTIVE_TO_GO_LIVE;
  const regionName = (id) => regionById(id)?.name || id;
  const sideOfCity = (s, c) => (cityLive(s, c) ? { kind: "city", id: c.id, name: c.name } : { kind: "region", id: c.regionId, name: regionName(c.regionId) });
  const regionActive = (s, rid) => UK_CITIES.filter((c) => c.regionId === rid && !cityLive(s, c)).reduce((sum, c) => sum + cityActive(s, c.id), 0);
  const weekKey = () => dayKey(startOfWeek());
  const sideScore = (kind, id) => Math.round(7800 + noise(`score:${kind}:${id}:${weekKey()}`) * 1400);

  const leagueSides = (s) => {
    const sides = [
      ...UK_CITIES.filter((c) => cityLive(s, c)).map((c) => ({ kind: "city", id: c.id, name: c.name, active: cityActive(s, c.id) })),
      ...UK_REGIONS.map((r) => ({ kind: "region", id: r.id, name: r.name, active: regionActive(s, r.id) })),
    ];
    return sides.map((x) => {
      const d = divisionFor(x.active);
      return { ...x, score: sideScore(x.kind, x.id), division: d ? d.key : "rising", squad: d ? d.squad : 0 };
    });
  };
  const mySide = (s) => sideOfCity(s, myCity(s));
  const sameSide = (a, b) => a && b && a.kind === b.kind && a.id === b.id;

  const listCities = async ({ query = "", lat, lng } = {}) =>
    read((s) => sortCities(UK_CITIES.map((c) => ({ ...c, region: regionName(c.regionId), isLive: cityLive(s, c) })), { query, lat, lng }));

  const listAreas = async (cityId) => areasOf(cityId).map((a) => ({ ...a }));

  const getPlaySide = async () =>
    read((s) => {
      requireMe(s);
      const c = myCity(s);
      const side = sideOfCity(s, c);
      return { ...side, cityId: c.id, cityName: c.name, cityKind: c.kind, isLive: cityLive(s, c), launchNight: c.launchNight, regionId: c.regionId, regionName: regionName(c.regionId), cityActive: cityActive(s, c.id), needed: ACTIVE_TO_GO_LIVE };
    });

  // City League seasons run six weeks from 28 September 2026.
  const CITY_SEASON_START = new Date(2026, 8, 28).getTime();
  const citySeason = () => {
    const weeks = Math.floor((startOfWeek().getTime() - CITY_SEASON_START) / (7 * DAY_MS));
    if (weeks < 0) return null;
    return { number: Math.floor(weeks / 6) + 1, name: `Season ${Math.floor(weeks / 6) + 1}`, week: (weeks % 6) + 1, weeks: 6 };
  };

  const getCityLeague = async () =>
    read((s) => {
      requireMe(s);
      const mine = mySide(s);
      const c = myCity(s);
      const sides = leagueSides(s);
      const rising = UK_CITIES.filter((x) => !cityLive(s, x))
        .map((x) => ({ id: x.id, name: x.name, kind: x.kind, regionId: x.regionId, region: regionName(x.regionId), active: cityActive(s, x.id), mine: x.id === c.id, launchNight: x.launchNight }))
        .sort((a, b) => b.mine - a.mine || b.active - a.active || b.launchNight - a.launchNight || a.name.localeCompare(b.name))
        .slice(0, 8)
        .map(({ launchNight, ...rest }) => rest);
      return {
        season: citySeason(),
        side: mine,
        sides: sides
          .filter((x) => x.division !== "rising")
          .map((x) => ({ ...x, mine: sameSide(x, mine) }))
          .sort((a, b) => b.score - a.score || b.active - a.active),
        rising,
      };
    });

  // ── City v city ─────────────────────────────────────────────────────────────

  const ORDER = { premier: 0, championship: 1, "league-one": 2 };
  const saturday = () => addDays(startOfWeek(), 5);
  const kickOff = () => saturday().getTime() + 6 * HOUR_MS;

  const pairings = (s) => {
    const list = leagueSides(s)
      .filter((x) => x.division !== "rising")
      .sort((a, b) => ORDER[a.division] - ORDER[b.division] || b.score - a.score);
    const pairs = [];
    for (let i = 0; i + 1 < list.length; i += 2) pairs.push([list[i], list[i + 1]]);
    return pairs;
  };
  const fixtureId = (home, away) => `cf_${weekKey()}_${home.kind}-${home.id}_${away.kind}-${away.id}`;
  const fixtureStatus = () => {
    const today = dayKey();
    const sat = dayKey(saturday());
    return today < sat ? "upcoming" : today === sat ? "live" : "done";
  };
  const saturdayShare = () => {
    const st = fixtureStatus();
    if (st === "upcoming") return 0;
    if (st === "done") return 1;
    const hr = new Date().getHours() + new Date().getMinutes() / 60;
    return clamp((hr - 6) / 16, 0, 1);
  };

  const myCallUp = (s, fid, sideObj, squad) => {
    if (!isActiveMe(s)) return null;
    const answer = box(s).callUps[fid]?.answer;
    if (answer === "passed") return null;
    return { number: 1 + Math.floor(noise(`num:${fid}:${s.me.username}`) * Math.max(1, squad)), answer: answer || null };
  };

  const sideView = (s, fid, x, divisionSquad) => {
    const squad = Math.min(divisionSquad, x.active);
    const share = saturdayShare();
    const squadAvg = Math.round(x.score * share * (0.92 + noise(`sat:${fid}:${x.id}`) * 0.16));
    const turnout = Math.round(30 + noise(`turn:${fid}:${x.id}`) * 30);
    return { entry: `${x.kind}-${x.id}`, kind: x.kind, id: x.id, name: x.name, score: Math.round(squadAvg * (1 + 0.1 * (turnout / 100))), squadAvg, turnout, squad, active: x.active };
  };

  const fixtureView = (s, pair) => {
    const [home, away] = pair;
    const fid = fixtureId(home, away);
    const div = divisionFor(home.active) || divisionFor(away.active);
    const homeV = sideView(s, fid, home, div.squad);
    const awayV = sideView(s, fid, away, div.squad);
    const mine = mySide(s);
    const mineSide = sameSide(home, mine) ? "home" : sameSide(away, mine) ? "away" : null;
    let me = null;
    if (mineSide) {
      const call = myCallUp(s, fid, mine, (mineSide === "home" ? homeV : awayV).squad);
      if (call) {
        const steps = fixtureStatus() === "upcoming" ? 0 : myDay(s, dayKey(saturday())).steps;
        const other = mineSide === "home" ? awayV : homeV;
        me = { side: mineSide, number: call.number, answer: call.answer, steps, toBeat: Math.max(0, other.squadAvg - steps) };
      }
    }
    return {
      id: fid,
      week: citySeason()?.week || 1,
      startsOn: dayKey(saturday()),
      endsOn: dayKey(saturday()),
      division: div.name,
      squadSize: div.squad,
      status: fixtureStatus(),
      home: homeV,
      away: awayV,
      mine: me,
    };
  };

  const findPair = (s, id) => {
    const pairs = pairings(s);
    if (id) return pairs.find((p) => fixtureId(p[0], p[1]) === id) || null;
    const mine = mySide(s);
    return pairs.find((p) => sameSide(p[0], mine) || sameSide(p[1], mine)) || null;
  };

  const getCityFixture = async (id = null) =>
    read((s) => {
      requireMe(s);
      const pair = findPair(s, id);
      if (!pair) {
        if (id) throw new EngineError("NOT_FOUND", "That fixture has gone.");
        return null;
      }
      return fixtureView(s, pair);
    });

  const callUpView = (s, pair) => {
    const f = fixtureView(s, pair);
    if (!f.mine || f.status === "done") return null;
    const mineV = f.mine.side === "home" ? f.home : f.away;
    const them = f.mine.side === "home" ? f.away : f.home;
    return {
      fixture: f.id,
      startsOn: f.startsOn,
      kickOff: "06:00",
      division: f.division,
      side: mineV.name,
      sideKind: mineV.kind,
      opponent: them.name,
      home: f.home.name,
      away: f.away.name,
      number: f.mine.number,
      answer: f.mine.answer,
      squad: mineV.squad,
      pool: mineV.active,
      prizeOut: 250,
      open: Date.now() < kickOff(),
    };
  };

  const getCallUp = async () =>
    read((s) => {
      requireMe(s);
      const pair = findPair(s, null);
      return pair ? callUpView(s, pair) : null;
    });

  const respondCallUp = async (fixture, goingIn) =>
    write((s) => {
      requireMe(s);
      const pair = findPair(s, fixture);
      const view = pair ? callUpView(s, pair) : null;
      if (!view || view.fixture !== fixture) throw new EngineError("NOT_IN_SQUAD", "You're not in this squad.");
      if (Date.now() >= kickOff()) throw new EngineError("KICKED_OFF", "It's already kicked off.");
      if (goingIn) {
        box(s).callUps[fixture] = { answer: "in", at: Date.now() };
        return { status: "in", number: view.number };
      }
      box(s).callUps[fixture] = { answer: "passed", at: Date.now() };
      notify(s, { type: "battles", title: "Passed to a reserve", body: `A reserve has #${view.number} for ${view.side}. No harm done.`, link: "/cities" });
      return { status: "passed", reserve: true };
    });

  // ── Rising places ───────────────────────────────────────────────────────────

  const medalsBase = (s, id) => Math.min(499, Math.floor(cityActive(s, id) * 0.65));

  const getRising = async (cityId = null) =>
    read((s) => {
      requireMe(s);
      const home = myCity(s);
      const c = cityId ? cityById(cityId) : home;
      if (!c) throw new EngineError("NOT_FOUND", "We couldn't find that place.");
      const o = box(s);
      const medal = o.medals[c.id] || null;
      const dow = new Date().getDay();
      return {
        id: c.id,
        name: c.name,
        kind: c.kind,
        regionId: c.regionId,
        region: regionName(c.regionId),
        isLive: cityLive(s, c),
        launchNight: c.launchNight,
        isHome: c.id === home.id,
        active: cityActive(s, c.id),
        needed: ACTIVE_TO_GO_LIVE,
        medal,
        medalsClaimed: medalsBase(s, c.id) + (medal ? 1 : 0),
        medalsTotal: 500,
        inviteCode: o.invite.code,
        invitesRedeemed: o.invite.redemptions || 0,
        inviteOut: 1000,
        callUpWeekend: dow === 5 || dow === 6 || dow === 0,
      };
    });

  const claimFoundingMedal = async (cityId = null) =>
    write((s) => {
      requireMe(s);
      const c = myCity(s);
      if (cityId && cityId !== c.id) throw new EngineError("NOT_ALLOWED", "Medals are for your own place.");
      const o = box(s);
      if (o.medals[c.id]) return o.medals[c.id];
      if (cityLive(s, c)) throw new EngineError("ALREADY_LIVE", `${c.name} is already live.`);
      const n = medalsBase(s, c.id) + 1;
      if (n > 500) throw new EngineError("MEDALS_GONE", "All 500 medals have gone.");
      o.medals[c.id] = n;
      notify(s, { type: "rewards", title: `Founding medal #${n}`, body: `One of ${c.name}'s first 500. It's yours for good.`, link: "/cities/rising" });
      return n;
    });

  const getCityInvite = async () =>
    touch((s) => {
      const me = requireMe(s);
      const o = box(s);
      if (!o.invite.code) o.invite.code = `${slug(me.username).replace(/-/g, "").toUpperCase().slice(0, 4)}${Math.floor(1000 + noise(`invite:${me.username}`) * 9000)}`;
      return o.invite.code;
    });

  const redeemCityInvite = async (code) =>
    write((s) => {
      const me = requireMe(s);
      const o = box(s);
      const c = String(code || "").trim().toUpperCase();
      if (c && c === o.invite.code) throw new EngineError("NOT_ALLOWED", "That's your own code.");
      const inviter = CITY_INVITE_CODES[c];
      if (!inviter) throw new EngineError("CODE_INVALID", "That code didn't work.");
      if (o.invite.redeemed) throw new EngineError("ALREADY_USED", "You've already used a friend's code.");
      if (me.createdAt && Date.now() - me.createdAt > 14 * DAY_MS) throw new EngineError("NEW_MEMBERS_ONLY", "Codes are for people who joined in the last two weeks.");
      const theirCity = findCity(playerById[inviter]?.city);
      if (theirCity && cityLive(s, theirCity)) throw new EngineError("ALREADY_LIVE", `${theirCity.name} is already live.`);
      o.invite.redeemed = { code: c, by: inviter, at: Date.now() };
      award(s, { out: 1000, label: "Call-up weekend", reason: "invite", refId: c });
      notify(s, { type: "rewards", title: "1,000 OUT is yours", body: `You and ${playerById[inviter]?.name || "your friend"} both got 1,000 OUT.`, link: "/cities/rising" });
      return { out: 1000 };
    });

  // ── Areas, clubs and friends this week ──────────────────────────────────────

  const weekBounds = (week) => {
    const from = week ? startOfDay(week).getTime() : startOfWeek().getTime();
    return { from, to: Math.min(Date.now(), from + 7 * DAY_MS), days: Math.max(0.2, (Math.min(Date.now(), from + 7 * DAY_MS) - from) / DAY_MS) };
  };

  const getAreaTable = async (cityId = null, week = null) =>
    read((s) => {
      requireMe(s);
      const c = cityId ? cityById(cityId) : myCity(s);
      if (!c) throw new EngineError("NOT_FOUND", "We couldn't find that place.");
      const areas = areasOf(c.id);
      if (!areas.length) return [];
      const mine = myArea(s);
      const { from, to, days } = weekBounds(week);
      const wk = dayKey(new Date(from));
      const perArea = cityActive(s, c.id) / areas.length;
      const rows = areas.map((a) => {
        const people = Math.max(3, Math.round(perArea * (0.6 + noise(`people:${a.id}`) * 0.8)));
        let counted = Math.round(people * 8000 * days * (0.85 + noise(`area:${a.id}:${wk}`) * 0.3));
        if (mine && a.id === mine.id) counted += myStepsBetween(s, from, to);
        return { areaId: a.id, name: a.name, kind: a.kind, col: a.col, row: a.row, counted, people, mine: !!mine && a.id === mine.id };
      });
      rows.sort((a, b) => b.counted - a.counted || a.name.localeCompare(b.name));
      return rows.map((r, i) => ({ ...r, rank: i + 1 }));
    });

  const getClubWeekTable = async (cityId = null) =>
    read((s) => {
      requireMe(s);
      const c = cityId ? cityById(cityId) : myCity(s);
      const { from, to, days } = weekBounds(null);
      return Object.values(s.crews)
        .filter((crew) => findCity(crew.city)?.id === c?.id)
        .map((crew) => {
          const members = crew.members.length + (crew.extraMembers || 0);
          const known = crew.members.reduce((sum, m) => sum + (m.id === ME ? myStepsBetween(s, from, to) : playerStepsBetween(m.id, from, to)), 0);
          const counted = known + Math.round((crew.extraMembers || 0) * 7500 * days * (0.8 + noise(`club:${crew.id}`) * 0.4));
          return { clubId: crew.id, name: crew.name, logo: crew.logo || null, areaId: areaFor(c.id, crew.area)?.id || null, members, counted, mine: crew.members.some((m) => m.id === ME) };
        })
        .sort((a, b) => b.counted - a.counted)
        .slice(0, 30);
    });

  const getFriendsWeek = async () =>
    read((s) => {
      const me = requireMe(s);
      const { from, to } = weekBounds(null);
      const rows = [
        { id: ME, name: me.name, avatar: me.avatar, tier: me.tier, areaId: myArea(s)?.id || null, counted: myStepsBetween(s, from, to), isMe: true },
        ...s.following
          .filter((pid) => playerById[pid])
          .map((pid) => {
            const p = playerById[pid];
            return { id: pid, name: p.name, avatar: p.avatar, tier: p.tier, areaId: playerArea(p)?.id || null, counted: playerStepsBetween(pid, from, to), isMe: false };
          }),
      ];
      return rows.sort((a, b) => b.counted - a.counted);
    });

  // ── Swipe to battle ─────────────────────────────────────────────────────────

  const simLevel = (s, pid) => Math.max(1, myLevel(s) + Math.round((noise(`lvl:${pid}`) - 0.5) * 9));
  const avgSteps = (pid) => {
    let sum = 0;
    for (let i = 1; i <= 14; i += 1) sum += playerDayTotal(pid, dayKey(addDays(new Date(), -i)));
    return Math.round(sum / 14);
  };
  const rivalCard = (s, pid) => {
    const p = playerById[pid];
    const c = playerCity(p);
    const level = simLevel(s, pid);
    const played = 4 + Math.floor(noise(`played:${pid}`) * 30);
    return {
      id: pid,
      username: p.username,
      name: p.name,
      avatar: p.avatar,
      tier: p.tier,
      level,
      cityId: c?.id || null,
      city: c?.name || p.city,
      area: playerArea(p)?.name || p.area,
      avgSteps: avgSteps(pid),
      wins: Math.floor(played * (0.3 + noise(`wins:${pid}`) * 0.5)),
      played,
      dot: playerIsOutside(pid) ? "out" : null,
      fair: Math.abs(level - myLevel(s)) <= 3,
    };
  };
  const openWith = (s, pid) => s.battles.some((b) => ["pending", "active"].includes(b.status) && (b.creatorId === pid || b.opponentId === pid));
  const hidden = (s, pid) => (s.rosterHidden || []).includes(pid);
  const tileGap = (a, b) => (a && b ? Math.abs(a.col - b.col) + Math.abs(a.row - b.row) : 99);

  const getSwipeDeck = async (scope = "near", limit = 20) =>
    read((s) => {
      requireMe(s);
      if (isMinor(s)) return [];
      const o = box(s);
      const city = myCity(s);
      const area = myArea(s);
      const mine = mySide(s);
      const myDiv = leagueSides(s).find((x) => sameSide(x, mine))?.division || "rising";
      const divOf = (c) => {
        const side = sideOfCity(s, c);
        return leagueSides(s).find((x) => sameSide(x, side))?.division || "rising";
      };
      const pool = PLAYERS.filter((p) => {
        const c = playerCity(p);
        if (!c || o.passes.includes(p.id) || o.picks.some((x) => x.id === p.id) || hidden(s, p.id) || openWith(s, p.id)) return false;
        if (scope === "near" || scope === "city") return c.id === city.id;
        if (scope === "division") return c.id !== city.id && divOf(c) === myDiv;
        return false;
      });
      const lvl = myLevel(s);
      return pool
        .map((p) => ({ p, gap: scope === "near" ? tileGap(playerArea(p), area) : 0, lv: Math.abs(simLevel(s, p.id) - lvl) }))
        .sort((a, b) => a.gap - b.gap || a.lv - b.lv || noise(`deck:${a.p.id}`) - noise(`deck:${b.p.id}`))
        .slice(0, Math.max(1, Math.min(50, limit)))
        .map(({ p }) => rivalCard(s, p.id));
    });

  const swipeRival = async (rivalId, pick) =>
    write((s) => {
      requireMe(s);
      if (!playerById[rivalId] || hidden(s, rivalId)) throw new EngineError("NOT_ALLOWED", "You can't pick them.");
      if (isMinor(s)) throw new EngineError("NOT_ALLOWED", "You can't pick them.");
      const o = box(s);
      if (pick) {
        if (!o.picks.some((x) => x.id === rivalId)) o.picks.unshift({ id: rivalId, at: Date.now() });
      } else if (!o.passes.includes(rivalId)) o.passes.push(rivalId);
      return o.picks.length;
    });

  const listPicks = async () =>
    read((s) => {
      requireMe(s);
      const weekAgo = Date.now() - 7 * DAY_MS;
      return box(s).picks.filter((x) => x.at > weekAgo && playerById[x.id]).map((x) => rivalCard(s, x.id));
    });

  const challengePick = async ({ rivalId, metric = "steps", durationHours = 72, stakeOut = 100 }) => {
    await read((s) => {
      requireMe(s);
      if (!box(s).picks.some((x) => x.id === rivalId)) throw new EngineError("NOT_A_PICK", "Pick them on Swipe first.");
      if (!["steps", "distance", "minutes"].includes(metric)) throw new EngineError("BAD_METRIC", "Pick steps, distance or minutes.");
      if (![24, 72, 168].includes(durationHours)) throw new EngineError("BAD_LENGTH", "Pick a day, three days or a week.");
      if (![0, 50, 100, 250].includes(stakeOut)) throw new EngineError("BAD_STAKE", "Pick a stake.");
    });
    const battle = await h.createBattle({ opponentId: rivalId, mode: "most_steps", durationHours, stakeOut, metric });
    await write((s) => {
      const o = box(s);
      o.picks = o.picks.filter((x) => x.id !== rivalId);
    });
    return battle;
  };

  // Show me on Swipe: off means only friends and your club can challenge you.
  const setShowOnSwipe = async (on) =>
    write((s) => {
      const me = requireMe(s);
      me.showOnSwipe = !!on;
      return me.showOnSwipe;
    });

  // ── Mystery challengers ─────────────────────────────────────────────────────

  const DEFAULT_MYSTERY = { enabled: true, scope: "city", levelGap: 3, perDay: 3, quietStart: 22, quietEnd: 7 };
  const mysterySettings = (s) => {
    const set = { ...DEFAULT_MYSTERY, ...(box(s).mystery.settings || {}) };
    const minor = isMinor(s);
    return { ...set, enabled: set.enabled && !minor, minor, showOnSwipe: s.me?.showOnSwipe !== false };
  };

  const getMysterySettings = async () =>
    read((s) => {
      requireMe(s);
      return mysterySettings(s);
    });

  const setMysterySettings = async (patch = {}) =>
    write((s) => {
      requireMe(s);
      if (patch.enabled && isMinor(s)) throw new EngineError("UNDER_18", "Mystery challengers are for over 18s.");
      const o = box(s);
      const cur = { ...DEFAULT_MYSTERY, ...(o.mystery.settings || {}) };
      const next = { ...cur };
      if (patch.enabled != null) next.enabled = !!patch.enabled;
      if (["area", "city", "uk"].includes(patch.scope)) next.scope = patch.scope;
      if (patch.levelGap != null) next.levelGap = clamp(Math.round(patch.levelGap), 1, 10);
      if (patch.perDay != null) next.perDay = clamp(Math.round(patch.perDay), 1, 5);
      if (patch.quietStart != null) next.quietStart = clamp(Math.round(patch.quietStart), 0, 23);
      if (patch.quietEnd != null) next.quietEnd = clamp(Math.round(patch.quietEnd), 0, 23);
      o.mystery.settings = next;
      return mysterySettings(s);
    });

  const theirAnswer = (offer) => noise(`yes:${offer.id}`) > 0.12;
  const offerStatus = (offer) => {
    if (offer.battleId) return "revealed";
    if (offer.closedAt || offer.myAnswer === false) return "closed";
    if (offer.expiresAt <= Date.now()) return "expired";
    return "open";
  };
  const offerView = (s, offer) => {
    const lvl = myLevel(s);
    const theirs = offer.level;
    const p = playerById[offer.rivalId];
    const revealed = !!offer.battleId;
    return {
      id: offer.id,
      metric: offer.metric,
      durationHours: offer.durationHours,
      stakeOut: offer.stakeOut,
      expiresAt: offer.expiresAt,
      createdAt: offer.createdAt,
      levelLow: Math.min(lvl, theirs),
      levelHigh: Math.max(lvl, theirs),
      where: playerArea(p)?.name || p?.area || p?.city || "",
      whereCity: playerCity(p)?.name || p?.city || "",
      myAnswer: offer.myAnswer ?? null,
      status: offerStatus(offer),
      battleId: offer.battleId || null,
      rival: revealed && p ? { id: p.id, name: p.name, username: p.username, avatar: p.avatar, tier: p.tier, level: theirs, metBefore: s.battles.some((b) => b.id !== offer.battleId && (b.creatorId === p.id || b.opponentId === p.id)) } : null,
      me: { level: lvl, tier: s.me.tier },
    };
  };

  const findMysteryChallenger = async () =>
    write((s) => {
      requireMe(s);
      if (isMinor(s)) throw new EngineError("UNDER_18", "Mystery challengers are for over 18s.");
      const set = mysterySettings(s);
      if (!set.enabled) throw new EngineError("MYSTERY_OFF", "Switch on mystery challengers first.");
      const o = box(s);
      const open = o.mystery.offers.find((x) => offerStatus(x) === "open");
      if (open) return open.id;
      const city = myCity(s);
      const area = myArea(s);
      const pool = PLAYERS.filter((p) => {
        const c = playerCity(p);
        if (!c || hidden(s, p.id) || openWith(s, p.id)) return false;
        if (set.scope === "area") return playerArea(p)?.id === area?.id || c.id === city.id;
        if (set.scope === "city") return c.id === city.id;
        return true;
      });
      if (!pool.length) throw new EngineError("NO_CHALLENGER", "Nobody near your level is free right now. Try again soon.");
      const p = pool[Math.floor(Math.random() * pool.length)];
      const out = balance(s, "out");
      const lvl = myLevel(s);
      const offer = {
        id: randomId("mo"),
        rivalId: p.id,
        level: Math.max(1, lvl + Math.round((Math.random() - 0.5) * 2 * Math.min(set.levelGap, 3))),
        metric: "steps",
        durationHours: 72,
        stakeOut: out >= 100 ? 100 : out >= 50 ? 50 : 0,
        createdAt: Date.now(),
        expiresAt: Date.now() + 5 * MIN_MS,
        myAnswer: null,
        battleId: null,
        closedAt: null,
      };
      o.mystery.offers.unshift(offer);
      o.mystery.offers = o.mystery.offers.slice(0, 20);
      notify(s, { type: "battles", title: "Here comes a new challenger", body: "Someone near your level. Answer in 5 minutes.", link: `/swipe/challenger?offer=${offer.id}` });
      return offer.id;
    });

  const getMysteryOffer = async (id = null) =>
    read((s) => {
      requireMe(s);
      const offers = box(s).mystery.offers;
      const offer = id ? offers.find((x) => x.id === id) : offers[0];
      if (!offer) return null;
      return offerView(s, offer);
    });

  const answerMystery = async (id, accept) =>
    write((s) => {
      requireMe(s);
      const offer = box(s).mystery.offers.find((x) => x.id === id);
      if (!offer) throw new EngineError("NOT_ALLOWED", "That challenge has gone.");
      if (offer.closedAt || offer.battleId) throw new EngineError("ALREADY_ANSWERED", "You've already answered.");
      if (offer.expiresAt <= Date.now()) throw new EngineError("EXPIRED", "Too late, that one's gone.");
      offer.myAnswer = !!accept;
      if (!accept || !theirAnswer(offer)) {
        offer.closedAt = Date.now();
        return offerView(s, offer);
      }
      const stake = balance(s, "out") >= offer.stakeOut ? offer.stakeOut : 0;
      const now = Date.now();
      const b = {
        id: randomId("b"),
        mode: "most_steps",
        metric: offer.metric,
        creatorId: offer.rivalId,
        opponentId: ME,
        durationHours: offer.durationHours,
        stakeOut: stake,
        status: "active",
        phase: "live",
        ready: {},
        entries: {},
        isSurprise: true,
        createdAt: now,
        startAt: now,
        endAt: now + offer.durationHours * HOUR_MS,
      };
      if (stake) award(s, { out: -stake, label: "Battle stake held", reason: "battle_stake", refId: b.id });
      s.battles.push(b);
      offer.battleId = b.id;
      offer.closedAt = now;
      notify(s, { type: "battles", title: "Challenger revealed", body: "You both said yes. See who.", link: `/swipe/reveal?offer=${offer.id}` });
      return offerView(s, offer);
    });

  // ── In a battle: emotes, boosts, rematches, head to head ───────────────────

  const battleOf = (s, id) => {
    const b = s.battles.find((x) => x.id === id);
    if (!b) throw new EngineError("NOT_ALLOWED", "That battle has gone.");
    return b;
  };
  const rivalIdOf = (b) => (b.creatorId === ME ? b.opponentId : b.creatorId);
  const REPLIES = ["fire", "too_slow", "line_catch_me", "respect", "line_respect", "speed"];

  const sendBattleEmote = async (battleId, code) =>
    write((s) => {
      requireMe(s);
      if (!EMOTE_CODES.includes(code)) throw new EngineError("BAD_EMOTE", "Pick an emote.");
      const b = battleOf(s, battleId);
      if (!["pending", "active", "complete"].includes(b.status)) throw new EngineError("BATTLE_CLOSED", "This battle is closed.");
      const o = box(s);
      const list = (o.emotes[battleId] ||= []);
      const last = list.find((e) => e.mine);
      if (last && Date.now() - last.at < 2000) throw new EngineError("SLOW_DOWN", "Easy, one at a time.");
      const e = { id: randomId("em"), code, at: Date.now(), mine: true };
      list.unshift(e);
      if (Math.random() < 0.55) list.unshift({ id: randomId("em"), code: REPLIES[Math.floor(Math.random() * REPLIES.length)], at: Date.now() + 4000 + Math.random() * 12000, mine: false });
      o.emotes[battleId] = list.slice(0, 60);
      return e;
    });

  const listBattleEmotes = async (battleId) =>
    read((s) => {
      requireMe(s);
      const now = Date.now();
      return (box(s).emotes[battleId] || []).filter((e) => e.at <= now).sort((a, b) => b.at - a.at).slice(0, 30);
    });

  const boostBattle = async (battleId) =>
    write((s) => {
      requireMe(s);
      const b = battleOf(s, battleId);
      if (b.status !== "active" || (b.endAt && b.endAt <= Date.now())) throw new EngineError("BATTLE_CLOSED", "This battle is closed.");
      if (b.boosted) throw new EngineError("ALREADY_BOOSTED", "You've already boosted this one.");
      if (balance(s, "out") < 20) throw new EngineError("NOT_ENOUGH_OUT", "A boost costs 20 OUT.");
      b.boosted = true;
      award(s, { out: -20, label: "Battle boost", reason: "battle_boost", refId: b.id });
      return true;
    });

  const rematchBattle = async (battleId) => {
    const plan = await read((s) => {
      requireMe(s);
      const b = battleOf(s, battleId);
      if (!["complete", "cancelled", "declined", "expired"].includes(b.status)) throw new EngineError("NOT_FINISHED", "Finish this one first.");
      const rival = rivalIdOf(b);
      const lostLately = b.winnerId === rival && b.completedAt && Date.now() - b.completedAt < DAY_MS;
      const stake = lostLately ? Math.floor((b.stakeOut || 0) / 2) : b.stakeOut || 0;
      return { opponentId: rival, mode: b.mode || "most_steps", durationHours: b.durationHours, distanceM: b.distanceM, stakeOut: stake, metric: b.metric || "steps" };
    });
    const view = await h.createBattle(plan);
    return write((s) => {
      const nb = s.battles.find((x) => x.id === view.id);
      if (nb) nb.rematchOf = battleId;
      return { ...view, rematchOf: battleId };
    });
  };

  const getHeadToHead = async (otherId) =>
    read((s) => {
      requireMe(s);
      const done = s.battles.filter((b) => b.status === "complete" && (b.creatorId === otherId || b.opponentId === otherId));
      return { mine: done.filter((b) => b.winnerId === ME).length, theirs: done.filter((b) => b.winnerId === otherId).length, played: done.length };
    });

  // ── The Arena season ────────────────────────────────────────────────────────

  const today = () => dayKey();
  const seasonNow = () => ARENA_SEASONS.find((x) => x.startsOn <= today() && today() <= x.endsOn) || null;

  // A Black week from season rewards ends on its own.
  const endBlackWeek = (s) => {
    if (s.me?.blackWeekUntil && Date.now() > s.me.blackWeekUntil) {
      s.me.tier = s.me.tierBeforeBlackWeek || "free";
      delete s.me.blackWeekUntil;
      delete s.me.tierBeforeBlackWeek;
    }
  };

  const getArenaNow = async () =>
    touch((s) => {
      endBlackWeek(s);
      const x = seasonNow();
      if (!x) return null;
      const city = s.me ? myCity(s) : cityById("london");
      const hr = new Date().getHours();
      const dayShape = hr < 6 || hr > 22 ? 0.12 : 0.3 + 0.2 * Math.sin(((hr - 6) / 16) * Math.PI);
      const mineLive = s.battles.filter((b) => b.status === "active").length;
      return {
        season: x.number,
        name: x.name,
        headline: x.headline,
        week: Math.max(1, Math.floor((startOfDay().getTime() - startOfDay(x.startsOn).getTime()) / (7 * DAY_MS)) + 1),
        weeks: Math.floor(Math.round((startOfDay(x.endsOn).getTime() - startOfDay(x.startsOn).getTime()) / DAY_MS) / 7) + 1,
        endsOn: x.endsOn,
        outside: Math.round(cityActive(s, city.id) * dayShape * (0.9 + noise(`out:${dayKey()}:${hr}`) * 0.2)),
        battlesLive: Math.round(280 + noise(`live:${dayKey()}:${hr}`) * 60) + mineLive,
      };
    });

  const lastClosedSeason = () => [...ARENA_SEASONS].reverse().find((x) => x.endsOn < today()) || null;

  const seasonResult = (s, n) => {
    const x = ARENA_SEASONS.find((y) => y.number === n);
    if (!x || x.endsOn >= today()) return null;
    const city = myCity(s);
    const players = Math.max(12, Math.round(cityActive(s, city.id) * 0.78));
    const rank = Math.max(1, Math.round(players * (0.008 + noise(`season:${n}:${s.me.username}`) * 0.03)));
    const top5 = rank <= Math.max(1, Math.ceil(players * 0.05));
    const top25 = rank <= Math.max(1, Math.ceil(players * 0.25));
    const next = ARENA_SEASONS.find((y) => y.number === n + 1);
    return {
      season: x.number,
      name: x.name,
      rank,
      players,
      points: 12 + Math.floor(noise(`pts:${n}:${s.me.username}`) * 40),
      city: city.name,
      prizeOut: top5 ? 1500 : top25 ? 500 : 100,
      badge: `${x.name} finisher`,
      perk: top5 ? "black_week" : null,
      claimed: !!box(s).seasonClaims[n],
      next: next ? { number: next.number, name: next.name, startsOn: next.startsOn, headline: next.headline } : null,
    };
  };

  const getSeasonResults = async (season = null) =>
    touch((s) => {
      requireMe(s);
      endBlackWeek(s);
      const n = season || lastClosedSeason()?.number;
      return n ? seasonResult(s, n) : null;
    });

  const claimSeasonRewards = async (season) =>
    write((s) => {
      const me = requireMe(s);
      const r = seasonResult(s, season);
      if (!r) throw new EngineError("NOT_FOUND", "No results for that season.");
      if (r.claimed) throw new EngineError("ALREADY_CLAIMED", "You've already picked these up.");
      box(s).seasonClaims[season] = Date.now();
      if (r.prizeOut) award(s, { out: r.prizeOut, label: `Season ${season} prize`, reason: "season", refId: String(season) });
      if (r.perk === "black_week" && me.tier !== "black") {
        me.tierBeforeBlackWeek = me.tier;
        me.tier = "black";
        me.blackWeekUntil = Date.now() + 7 * DAY_MS;
      }
      notify(s, { type: "rewards", title: `${r.name} rewards`, body: `${r.prizeOut.toLocaleString("en-GB")} OUT${r.perk ? " and a week of Black" : ""} are yours.`, link: "/battles/season" });
      return seasonResult(s, season);
    });

  // ── The drop shop and orders ────────────────────────────────────────────────

  const dropTimes = (s, d) => {
    const opensAt = s.seededAt + d.opensInHours * HOUR_MS;
    return { opensAt, earlyAt: opensAt - (d.earlyAccessHours || 0) * HOUR_MS, closesAt: d.closesInHours != null ? s.seededAt + d.closesInHours * HOUR_MS : null };
  };
  const myOrderFor = (s, dropId) => box(s).orders.find((o) => o.dropId === dropId && o.status !== "cancelled");
  const dropView = (s, d) => {
    const now = Date.now();
    const { opensAt, earlyAt, closesAt } = dropTimes(s, d);
    const tier = s.me?.tier || "free";
    const hasEarlyAccess = tier !== "free";
    const sinceOpen = Math.max(0, (now - opensAt) / HOUR_MS);
    const mine = myOrderFor(s, d.id);
    const sold = d.stock > 0 ? Math.floor(sinceOpen * (d.stock / 240)) : 0;
    const remaining = d.stock <= 0 ? 0 : Math.max(d.stock > 5 ? 3 : 1, d.stock - sold) - (mine ? 1 : 0);
    const status = dropStatus({ now, opensAt, earlyAt, closesAt, remaining, hasEarlyAccess });
    const tierOk = tierAtLeast(tier, d.tierRequired);
    return {
      id: d.id,
      title: d.title,
      subtitle: d.subtitle,
      description: d.description,
      image: d.image,
      gallery: d.gallery || [],
      priceOut: d.priceOut,
      sizes: d.sizes,
      soldOutSizes: d.soldOutSizes || [],
      sizeNote: d.sizeNote || "",
      total: d.total,
      remaining: Math.max(0, remaining),
      tierRequired: d.tierRequired,
      tierOk,
      earlyAccessHours: d.earlyAccessHours,
      opensAt,
      earlyAt,
      closesAt,
      status,
      tag: dropTag({ status, tierRequired: d.tierRequired, opensAt, now }),
      hasEarlyAccess,
      canClaim: !mine && tierOk && (status === "live" || status === "early"),
      claimed: !!mine,
      orderId: mine?.id || null,
      deliveryOut: tier === "black" ? 0 : DELIVERY_OUT,
    };
  };

  const listDropShop = async () =>
    read((s) => {
      const order = { live: 0, early: 1, upcoming: 2, soldout: 3, ended: 4 };
      return DROP_SHOP.map((d) => dropView(s, d)).sort((a, b) => order[a.status] - order[b.status] || a.opensAt - b.opensAt);
    });

  const getDropItem = async (id) =>
    read((s) => {
      const d = DROP_SHOP.find((x) => x.id === id);
      if (!d) throw new EngineError("NOT_FOUND", "That drop has gone.");
      return dropView(s, d);
    });

  const getDeliveryAddress = async () => read((s) => box(s).address || null);

  const orderStatusAt = (o, now = Date.now()) => {
    if (o.status === "cancelled") return { status: "cancelled", history: o.history };
    const history = ORDER_STEPS.filter((st) => now >= o.createdAt + st.afterHours * HOUR_MS).map((st) => ({ status: st.status, at: o.createdAt + st.afterHours * HOUR_MS, note: null }));
    return { status: history[history.length - 1]?.status || "claimed", history };
  };
  const orderView = (s, o) => {
    const d = DROP_SHOP.find((x) => x.id === o.dropId);
    const { status, history } = orderStatusAt(o);
    return {
      id: o.id,
      ref: o.ref,
      dropId: o.dropId,
      title: d?.title || "Drop",
      image: d?.image || null,
      size: o.size || null,
      status,
      statusLabel: ORDER_LABELS[status],
      outSpent: o.outSpent,
      deliveryOut: o.deliveryOut,
      address: o.address,
      createdAt: o.createdAt,
      arrivesOn: ["delivered", "cancelled"].includes(status) ? null : startOfDay(addDays(new Date(o.createdAt), 3)).getTime(),
      history,
    };
  };

  const claimDrop = async ({ dropId, size = null, address, saveAddress = true }) =>
    write((s) => {
      const me = requireMe(s);
      const d = DROP_SHOP.find((x) => x.id === dropId);
      if (!d) throw new EngineError("NOT_FOUND", "That drop has gone.");
      if (myOrderFor(s, dropId)) throw new EngineError("ALREADY_CLAIMED", "You've already claimed this one.");
      const v = dropView(s, d);
      if (!v.tierOk) throw new EngineError("TIER_REQUIRED", "This drop is for Black members.", { requiredTier: d.tierRequired });
      if (v.status === "upcoming") throw new EngineError("NOT_OPEN", "Not open yet.");
      if (v.status === "ended") throw new EngineError("CLOSED", "This drop has ended.");
      if (v.status === "soldout") throw new EngineError("SOLD_OUT", "Sold out.");
      if (d.sizes.length && (!size || !d.sizes.includes(size) || (d.soldOutSizes || []).includes(size))) throw new EngineError("SIZE_REQUIRED", "Pick a size.");
      if (addressProblem(address)) throw new EngineError("ADDRESS_REQUIRED", "Add where it's going.");
      const addr = cleanAddress(address);
      const delivery = me.tier === "black" ? 0 : DELIVERY_OUT;
      if (balance(s, "out") < d.priceOut + delivery) throw new EngineError("NOT_ENOUGH_OUT", "Not enough OUT for that yet.");
      const o = {
        id: randomId("ord"),
        ref: `OH-${Math.floor(10000 + Math.random() * 89999)}`,
        dropId,
        size: d.sizes.length ? size : null,
        outSpent: d.priceOut,
        deliveryOut: delivery,
        address: addr,
        status: "claimed",
        createdAt: Date.now(),
      };
      box(s).orders.unshift(o);
      if (saveAddress) box(s).address = addr;
      award(s, { out: -(d.priceOut + delivery), label: d.title, reason: "drop", refId: d.id });
      notify(s, { type: "drops", title: `${d.title} is yours`, body: `Order ${o.ref}. We'll tell you as it moves.`, link: `/orders/${o.id}`, image: d.image });
      return orderView(s, o);
    });

  const listOrders = async () => read((s) => box(s).orders.map((o) => orderView(s, o)));
  const getOrder = async (id) =>
    read((s) => {
      const o = box(s).orders.find((x) => x.id === id);
      if (!o) throw new EngineError("NOT_FOUND", "We couldn't find that order.");
      return orderView(s, o);
    });

  // ── Event tickets and who's going ───────────────────────────────────────────

  const eventFor = (s, id) => {
    const ev = h.EVENTS.find((e) => e.id === id);
    if (!ev) throw new EngineError("EVENT_NOT_FOUND", "That event has gone.");
    return { ev, view: h.eventView(s, ev) };
  };

  const getTicket = async (eventId) =>
    read((s) => {
      const me = requireMe(s);
      const { view } = eventFor(s, eventId);
      if (!view.isGoing) throw new EngineError("NOT_GOING", "Say you're going first.");
      const position = Math.max(1, view.rsvpCount);
      const wave = waveFor(position);
      const code = Array.from({ length: 18 }, (_, i) => "0123456789abcdef"[Math.floor(noise(`ticket:${view.occurrenceId}:${me.username}:${i}`) * 16)]).join("");
      return { code, qr: ticketQr(code), wave, gate: gateFor(wave), name: me.name, checkedIn: !!view.checkedIn };
    });

  const getEventGoing = async (eventId, limit = 60) =>
    read((s) => {
      requireMe(s);
      const { view } = eventFor(s, eventId);
      const myClubs = Object.values(s.crews).filter((c) => c.members.some((m) => m.id === ME));
      const clubOf = (pid) => Object.values(s.crews).find((c) => c.members.some((m) => m.id === pid));
      const going = PLAYERS.filter((p) => findCity(p.city) && noise(`going:${view.occurrenceId}:${p.id}`) < 0.55).map((p, i) => {
        const club = clubOf(p.id);
        return {
          id: p.id,
          name: p.name,
          username: p.username,
          avatar: p.avatar,
          tier: p.tier,
          following: s.following.includes(p.id),
          club: club?.name || null,
          wave: waveFor(1 + Math.floor(noise(`wave:${view.occurrenceId}:${p.id}`) * Math.max(1, view.rsvpCount))),
          sameClub: !!club && myClubs.some((c) => c.id === club.id),
          order: i,
        };
      });
      going.sort((a, b) => b.following - a.following || b.sameClub - a.sameClub || a.order - b.order);
      const extraClub = myClubs.length ? 6 + Math.floor(noise(`clubgoing:${view.occurrenceId}`) * 8) : 0;
      return {
        count: view.rsvpCount,
        friends: going.filter((p) => p.following).length,
        clubCount: going.filter((p) => p.sameClub).length + extraClub,
        clubName: myClubs[0]?.name || null,
        people: going.slice(0, Math.max(1, limit)).map(({ order, ...rest }) => rest),
      };
    });

  // ── Fair play ───────────────────────────────────────────────────────────────

  // Called by saveRun inside its write.
  const reviewRun = (s, saved, points) => {
    const result = analyseRoute(points, { distanceM: Math.round(saved.distanceKm * 1000), steps: saved.steps || 0 });
    if (!result) return null;
    const o = box(s);
    o.reviews[saved.id] = { runId: saved.id, ...result, distanceM: Math.round(saved.distanceKm * 1000), status: "open", appealNote: null, createdAt: Date.now(), answeredAt: null };
    if (result.heldXp > 0) award(s, { xp: -result.heldXp, label: "Held while we check a run", reason: "review", refId: saved.id });
    notify(s, { type: "rewards", title: "We're checking a run", body: "Part of it looks like a bus or a bike. Only that part is held.", link: `/battles/review/${saved.id}` });
    return o.reviews[saved.id];
  };

  const reviewView = (s, r) => {
    const run = s.runs.find((x) => x.id === r.runId);
    return {
      runId: r.runId,
      checks: r.checks,
      flaggedM: r.flaggedM,
      fastKmh: r.fastKmh,
      countedM: r.countedM,
      distanceM: r.distanceM,
      heldXp: r.heldXp,
      status: r.status,
      appealNote: r.appealNote,
      createdAt: r.createdAt,
      decideBy: r.createdAt + DAY_MS,
      route: run?.route || [],
      fastStretches: r.fastStretches || [],
    };
  };

  // Here staff are simulated: an appeal is looked at within a couple of minutes.
  const decideAppeals = (s) => {
    for (const r of Object.values(box(s).reviews)) {
      if (r.status === "appealed" && r.answeredAt && Date.now() - r.answeredAt > 2 * MIN_MS) {
        r.status = "cleared";
        r.decidedAt = Date.now();
        if (r.heldXp > 0) award(s, { xp: r.heldXp, label: "Run cleared", reason: "review", refId: r.runId });
        notify(s, { type: "rewards", title: "Your run is cleared", body: "All of it counts. Sorry for the wait.", link: `/battles/review/${r.runId}` });
      }
    }
  };

  const getRunReview = async (runId) =>
    touch((s) => {
      decideAppeals(s);
      const r = box(s).reviews[runId];
      return r ? reviewView(s, r) : null;
    });

  const answerRunReview = async (runId, agree, note = null) =>
    write((s) => {
      requireMe(s);
      const r = box(s).reviews[runId];
      if (!r) throw new EngineError("NOT_ALLOWED", "That review has gone.");
      if (r.status !== "open") throw new EngineError("ALREADY_ANSWERED", "You've already answered.");
      r.status = agree ? "accepted" : "appealed";
      r.appealNote = agree ? null : String(note || "").trim() || null;
      r.answeredAt = Date.now();
      return reviewView(s, r);
    });

  return {
    listCities,
    listAreas,
    getPlaySide,
    getCityLeague,
    getCityFixture,
    getCallUp,
    respondCallUp,
    getRising,
    claimFoundingMedal,
    getCityInvite,
    redeemCityInvite,
    getAreaTable,
    getClubWeekTable,
    getFriendsWeek,
    getSwipeDeck,
    swipeRival,
    listPicks,
    challengePick,
    setShowOnSwipe,
    getMysterySettings,
    setMysterySettings,
    findMysteryChallenger,
    getMysteryOffer,
    answerMystery,
    sendBattleEmote,
    listBattleEmotes,
    boostBattle,
    rematchBattle,
    getHeadToHead,
    getArenaNow,
    getSeasonResults,
    claimSeasonRewards,
    listDropShop,
    getDropItem,
    getDeliveryAddress,
    claimDrop,
    listOrders,
    getOrder,
    getTicket,
    getEventGoing,
    getRunReview,
    answerRunReview,
    // engine only
    reviewRun,
  };
}
