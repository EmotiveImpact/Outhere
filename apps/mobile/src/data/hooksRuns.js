// React Query hooks for Move and runs: routes, run history, who's outside on
// the map, club live and live sharing. Same rules as hooks.js: reads here,
// writes through useEngineMutation(engine.fn).

import { useQuery } from "@tanstack/react-query";
import { api as engine } from "./source";

const q = (key, fn, options = {}) => ({ queryKey: ["engine", ...key], queryFn: fn, staleTime: 30 * 1000, ...options });

// Round a position so the query key doesn't change with every GPS wobble.
const spot = (p) => (p && Number.isFinite(p.latitude) ? `${p.latitude.toFixed(3)},${p.longitude.toFixed(3)}` : "none");
const coords = (p) => (p && Number.isFinite(p.latitude) ? { latitude: p.latitude, longitude: p.longitude } : {});

export const useRoutes = (scope = "mine", near = null) => useQuery(q(["routes", scope, spot(near)], () => engine.listRoutes({ scope, near: near ? coords(near) : null })));
export const useRoute = (id) => useQuery(q(["route", id], () => engine.getRoute(id), { enabled: !!id }));
export const useRouteSuggestions = (near, km, enabled = true) =>
  useQuery(q(["routeSuggestions", spot(near), km], () => engine.suggestRoutes({ ...coords(near), km }), { enabled }));

export const useRunHistory = (period = "month") => useQuery(q(["runHistory", period], () => engine.listRunHistory({ period })));
export const useRunDetail = (id) => useQuery(q(["runDetail", id], () => engine.getRunDetail(id), { enabled: !!id }));

export const useOutsideMap = (near, enabled = true) =>
  useQuery(q(["outsideMap", spot(near)], () => engine.getOutsideMap(coords(near)), { enabled, refetchInterval: 60 * 1000 }));
export const useCrewLive = (near, enabled = true) =>
  useQuery(q(["crewLive", spot(near)], () => engine.getCrewLive(coords(near)), { enabled, refetchInterval: 30 * 1000 }));

export const useSafety = () => useQuery(q(["safety"], engine.getSafety));
