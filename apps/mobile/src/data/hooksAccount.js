// Hooks for the member's account: under 18 mode, blocked people, the patch
// picker, the week page and the live count. Settings use useSettings in
// hooks.js, which reads the same engine.getSettings.

import { useQuery } from "@tanstack/react-query";
import { api as engine } from "./source";

const q = (key, fn, options = {}) => ({ queryKey: ["engine", ...key], queryFn: fn, staleTime: 30 * 1000, ...options });

export const useAccount = (enabled = true) => useQuery(q(["account"], engine.getAccount, { enabled }));
export const useBlocked = () => useQuery(q(["blocked"], engine.listBlocked));
export const usePatchPlaces = (query = "", at = null) =>
  useQuery(q(["patchPlaces", query, at?.lat ?? null, at?.lng ?? null], () => engine.listPatchPlaces({ query, lat: at?.lat ?? null, lng: at?.lng ?? null })));
export const usePatchAreas = (cityId, query = "") =>
  useQuery(q(["patchAreas", cityId, query], () => engine.listPatchAreas(cityId, query), { enabled: !!cityId }));
export const useWeekSummary = (period = "week", offset = 0) =>
  useQuery(q(["weekSummary", period, offset], () => engine.getWeekSummary({ period, offset })));
export const useOutsideCount = (cityId = null) => useQuery(q(["outsideCount", cityId], () => engine.getOutsideCount({ cityId })));
