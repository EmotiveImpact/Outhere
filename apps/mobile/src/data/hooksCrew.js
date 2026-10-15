// React Query hooks for the Crew tab and stories (see crew.js and
// remoteCrew.js). Same key prefix as hooks.js, so every write refreshes them.

import { useQuery } from "@tanstack/react-query";
import { api as engine, isRemote } from "./source";

const q = (key, fn, options = {}) => ({ queryKey: ["engine", ...key], queryFn: fn, staleTime: 30 * 1000, ...options });

// The chat polls while open; the phone's simulated members reply in seconds.
const CHAT_POLL = isRemote ? 5000 : 2000;

export const useCrewHeader = (id) => useQuery(q(["crewHeader", id], () => engine.getCrewHeader(id), { enabled: !!id }));
export const useCrewRace = (id, period = "week") => useQuery(q(["crewRace", id, period], () => engine.getCrewRace(id, period), { enabled: !!id }));
export const useCrewGoal = (id) => useQuery(q(["crewGoal", id], () => engine.getCrewGoal(id), { enabled: !!id }));
export const useCrewDays = (id) => useQuery(q(["crewDays", id], () => engine.getCrewDays(id), { enabled: !!id }));
export const useCrewChallenges = (id) => useQuery(q(["crewChallenges", id], () => engine.listCrewChallenges(id), { enabled: !!id }));
export const useCrewStats = (id) => useQuery(q(["crewStats", id], () => engine.getCrewStats(id), { enabled: !!id }));
export const useCityBoard = (kind = "crews") => useQuery(q(["cityBoard", kind], () => engine.getCityBoard(kind)));
export const usePostComments = (crewId, postId) => useQuery(q(["postComments", crewId, postId], () => engine.getPostComments(crewId, postId), { enabled: !!crewId && !!postId }));
export const useCrewChat = (id, live = true) =>
  useQuery(q(["crewMessages", id], () => engine.getCrewMessages(id), { enabled: !!id, refetchInterval: live ? CHAT_POLL : false }));
export const useCrewTyping = (id, live = true) => useQuery(q(["crewTyping", id], () => engine.getCrewTyping(id), { enabled: !!id && live, refetchInterval: live ? 1500 : false, staleTime: 0 }));
export const useCrewUnread = (id) => useQuery(q(["crewUnread", id], () => engine.getCrewUnread(id), { enabled: !!id, refetchInterval: 20 * 1000 }));
export const useCrewsNear = () => useQuery(q(["crewsNear"], engine.listCrewsNear));
export const useJoinRequests = (id, enabled = true) => useQuery(q(["joinRequests", id], () => engine.listJoinRequests(id), { enabled: !!id && enabled }));
export const useBlocked = () => useQuery(q(["blocked"], engine.listBlocked));
export const useCrewStories = (id) => useQuery(q(["crewStories", id], () => engine.listCrewStories(id), { enabled: !!id, staleTime: 60 * 1000 }));
export const useClubStories = (id) => useQuery(q(["clubStories", id], () => engine.listClubStories(id), { enabled: !!id, staleTime: 60 * 1000 }));
