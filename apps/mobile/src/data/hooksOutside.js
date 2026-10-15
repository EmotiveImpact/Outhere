// Hooks for the Outside area: cities and the City League, swipe and mystery
// challengers, battle extras, the drop shop and orders, tickets and fair
// play. Re-exported from hooks.js. Writes use useEngineMutation from there.

import { useQuery } from "@tanstack/react-query";
import { api as engine } from "./source";

const q = (key, fn, options = {}) => ({ queryKey: ["engine", ...key], queryFn: fn, staleTime: 30 * 1000, ...options });

// Places and the City League
export const useCities = (query = "", lat = null, lng = null) => useQuery(q(["cities", query, lat, lng], () => engine.listCities({ query, lat, lng }), { staleTime: 10 * 60 * 1000 }));
export const useAreas = (cityId) => useQuery(q(["areas", cityId], () => engine.listAreas(cityId), { enabled: !!cityId, staleTime: 10 * 60 * 1000 }));
export const usePlaySide = () => useQuery(q(["playSide"], engine.getPlaySide));
export const useCityLeague = () => useQuery(q(["cityLeague"], engine.getCityLeague));
export const useCityFixture = (id = null) => useQuery(q(["cityFixture", id || "mine"], () => engine.getCityFixture(id)));
export const useCallUp = () => useQuery(q(["callUp"], engine.getCallUp));
export const useRising = (cityId = null) => useQuery(q(["rising", cityId || "mine"], () => engine.getRising(cityId)));
export const useCityInvite = (enabled = true) => useQuery(q(["cityInvite"], engine.getCityInvite, { enabled, staleTime: Infinity }));
export const useAreaTable = (cityId = null, week = null) => useQuery(q(["areaTable", cityId || "mine", week || "now"], () => engine.getAreaTable(cityId, week)));
export const useClubWeekTable = (cityId = null) => useQuery(q(["clubWeekTable", cityId || "mine"], () => engine.getClubWeekTable(cityId)));
export const useFriendsWeek = () => useQuery(q(["friendsWeek"], engine.getFriendsWeek));

// Swipe and mystery challengers
export const useSwipeDeck = (scope = "near") => useQuery(q(["swipeDeck", scope], () => engine.getSwipeDeck(scope, 20), { staleTime: 5 * 60 * 1000 }));
export const usePicks = () => useQuery(q(["picks"], engine.listPicks));
export const useMysterySettings = () => useQuery(q(["mysterySettings"], engine.getMysterySettings));
export const useMysteryOffer = (id = null) => useQuery(q(["mysteryOffer", id || "latest"], () => engine.getMysteryOffer(id), { refetchInterval: 5000 }));

// In a battle
export const useBattleEmotes = (battleId) => useQuery(q(["battleEmotes", battleId], () => engine.listBattleEmotes(battleId), { enabled: !!battleId, refetchInterval: 5000, staleTime: 2000 }));
export const useHeadToHead = (otherId) => useQuery(q(["headToHead", otherId], () => engine.getHeadToHead(otherId), { enabled: !!otherId && otherId !== "me" }));

// The Arena season
export const useArenaNow = () => useQuery(q(["arenaNow"], engine.getArenaNow));
export const useSeasonResults = (season = null) => useQuery(q(["seasonResults", season || "last"], () => engine.getSeasonResults(season)));

// The drop shop and orders
export const useDropShop = () => useQuery(q(["dropShop"], engine.listDropShop));
export const useDropItem = (id) => useQuery(q(["dropItem", id], () => engine.getDropItem(id), { enabled: !!id }));
export const useDeliveryAddress = () => useQuery(q(["deliveryAddress"], engine.getDeliveryAddress));
export const useOrders = () => useQuery(q(["orders"], engine.listOrders));
export const useOrder = (id) => useQuery(q(["order", id], () => engine.getOrder(id), { enabled: !!id }));

// Events
export const useTicket = (eventId, enabled = true) => useQuery(q(["ticket", eventId], () => engine.getTicket(eventId), { enabled: !!eventId && enabled, retry: false }));
export const useEventGoing = (eventId) => useQuery(q(["eventGoing", eventId], () => engine.getEventGoing(eventId, 60), { enabled: !!eventId }));

// Fair play
export const useRunReview = (runId) => useQuery(q(["runReview", runId], () => engine.getRunReview(runId), { enabled: !!runId }));
