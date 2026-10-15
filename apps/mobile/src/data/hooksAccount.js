// Hooks for the member's account: under 18 mode, blocked people, the patch
// picker, the week page and the live count. Settings use useSettings in
// hooks.js, which reads the same engine.getSettings.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api as engine } from "./source";
import { mergeSettings } from "./account";
import { showEngineError } from "./hooks";

const q = (key, fn, options = {}) => ({ queryKey: ["engine", ...key], queryFn: fn, staleTime: 30 * 1000, ...options });

export const useAccount = (enabled = true) => useQuery(q(["account"], engine.getAccount, { enabled }));
export const usePatchPlaces = (query = "", at = null) =>
  useQuery(q(["patchPlaces", query, at?.lat ?? null, at?.lng ?? null], () => engine.listPatchPlaces({ query, lat: at?.lat ?? null, lng: at?.lng ?? null })));
export const usePatchAreas = (cityId, query = "") =>
  useQuery(q(["patchAreas", cityId, query], () => engine.listPatchAreas(cityId, query), { enabled: !!cityId }));
export const useWeekSummary = (period = "week", offset = 0) =>
  useQuery(q(["weekSummary", period, offset], () => engine.getWeekSummary({ period, offset })));
export const useOutsideCount = (cityId = null) => useQuery(q(["outsideCount", cityId], () => engine.getOutsideCount({ cityId })));

// Saves a settings change and shows it straight away; a failed save puts the
// old settings back and says why.
export function useUpdateSettings() {
  const qc = useQueryClient();
  const key = ["engine", "settings"];
  return useMutation({
    mutationFn: (patch) => engine.updateSettings(patch),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: key });
      const before = qc.getQueryData(key);
      if (before) qc.setQueryData(key, mergeSettings(before, patch));
      return { before };
    },
    onError: (error, _patch, ctx) => {
      if (ctx?.before) qc.setQueryData(key, ctx.before);
      showEngineError(error);
    },
  });
}
