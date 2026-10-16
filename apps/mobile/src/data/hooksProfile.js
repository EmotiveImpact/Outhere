// React Query hooks for the profile area: membership details, streak and
// freezes, badges, emotes, someone else's profile, search, friends and
// invites, and the OUT history. Re-exported from hooks.js.

import { useQuery } from "@tanstack/react-query";
import { api as engine } from "./source";

// Same key root as hooks.js, so every engine write refreshes these too.
const q = (key, fn, options = {}) => ({ queryKey: ["engine", ...key], queryFn: fn, staleTime: 30 * 1000, ...options });

export const useMembershipDetails = () => useQuery(q(["membershipDetails"], engine.getMembershipDetails));
export const useStreakStatus = () => useQuery(q(["streakStatus"], engine.getStreakStatus));
export const useBadges = () => useQuery(q(["badges"], engine.listBadges));
export const useEmotes = () => useQuery(q(["emotes"], engine.listEmotes));
export const usePlayerCard = (id) => useQuery(q(["playerCard", id], () => engine.getPlayerCard(id), { enabled: !!id }));
export const useSearchAll = (query) => useQuery(q(["searchAll", query], () => engine.searchAll(query), { enabled: !!query?.trim(), placeholderData: (prev) => prev }));
export const useSuggestedPeople = () => useQuery(q(["suggestedPeople"], engine.suggestPeople));
export const useReferrals = () => useQuery(q(["referrals"], engine.getReferrals));
export const useOutHistory = () => useQuery(q(["outHistory"], engine.getOutHistory));
