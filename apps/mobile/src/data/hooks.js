// React Query hooks over the data source: Supabase when configured, the local
// engine otherwise (see source.js). Screens use these and never call either
// directly for reads.

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { create } from "zustand";
import { api as engine, isRemote } from "./source";
import { setHapticsEnabled } from "@/services/haptics";
import { toast } from "@/components/ui/Toast";

export { engine, isRemote };

const KEY = "engine";

// ── Upgrade prompt ────────────────────────────────────────────────────────────
// Any mutation that fails with TIER_REQUIRED opens the upgrade sheet, which is
// mounted once at the root (components/ui/UpgradeSheet).

export const useUpgradePrompt = create((set) => ({
  visible: false,
  requiredTier: "pro",
  message: "",
  open: (requiredTier = "pro", message = "") => set({ visible: true, requiredTier, message }),
  close: () => set({ visible: false }),
}));

export const showEngineError = (error) => {
  if (error?.code === "TIER_REQUIRED") {
    useUpgradePrompt.getState().open(error.requiredTier || "pro", error.message);
    return;
  }
  toast.error(error?.message || "Something went wrong.");
};

// ── Bridge: keeps every query in step with the engine ─────────────────────────
// Mount once inside QueryClientProvider. Any engine write invalidates all engine
// queries, and a minute tick keeps simulated players and battle clocks moving.

export function EngineBridge() {
  const qc = useQueryClient();
  useEffect(() => {
    let pending = false;
    const refresh = () => {
      if (pending) return;
      pending = true;
      setTimeout(() => {
        pending = false;
        qc.invalidateQueries({ queryKey: [KEY] });
      }, 0);
    };
    const syncHaptics = () =>
      engine
        .getSettings()
        .then((s) => setHapticsEnabled(s?.haptics))
        .catch(() => {});
    syncHaptics();
    const unsubscribe = engine.subscribe(() => {
      refresh();
      syncHaptics();
    });
    const tick = setInterval(refresh, 60 * 1000);
    return () => {
      unsubscribe();
      clearInterval(tick);
    };
  }, [qc]);
  return null;
}

const q = (key, fn, options = {}) => ({ queryKey: [KEY, ...key], queryFn: fn, staleTime: 30 * 1000, ...options });

// ── Generic mutation ──────────────────────────────────────────────────────────
// const join = useEngineMutation(engine.joinCrew, { success: "You're in" }); join.mutate(crewId)
// Errors show a toast or the upgrade sheet unless `silent` is set. `success` is
// a toast title, or a function of the result returning one (or null for none).

export function useEngineMutation(fn, { onSuccess, onError, silent = false, success } = {}) {
  return useMutation({
    mutationFn: (args) => (Array.isArray(args) ? fn(...args) : fn(args)),
    onSuccess: (result, ...rest) => {
      const title = typeof success === "function" ? success(result) : success;
      if (title) toast.success(title);
      onSuccess?.(result, ...rest);
    },
    onError: (error, ...rest) => {
      if (!silent) showEngineError(error);
      onError?.(error, ...rest);
    },
  });
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export const useProfile = () => useQuery(q(["profile"], engine.getProfile));
export const useMembership = (enabled = true) => useQuery(q(["membership"], engine.getMembership, { enabled }));
export const useWallet = () => useQuery(q(["wallet"], engine.getWallet));
export const useStepHistory = (days = 7) => useQuery(q(["steps", days], () => engine.getStepHistory(days)));
export const useTodayByHour = () => useQuery(q(["todayByHour"], engine.getTodayByHour));

export const useFriends = () => useQuery(q(["friends"], engine.getFriends));
export const useSearchPlayers = (query) => useQuery(q(["players", query], () => engine.searchPlayers(query)));
export const usePlayer = (id) => useQuery(q(["player", id], () => engine.getPlayer(id), { enabled: !!id }));
export const useOutsideNow = (city) => useQuery(q(["outsideNow", city], () => engine.getOutsideNow(city)));

export const useLeaderboard = ({ scope = "city", period = "week", metric = "steps" } = {}) =>
  useQuery(q(["leaderboard", scope, period, metric], () => engine.getLeaderboard({ scope, period, metric })));

export const useChallenges = () => useQuery(q(["challenges"], engine.listChallenges));

export const useBattles = (status = "all") => useQuery(q(["battles", status], () => engine.listBattles(status)));
export const useBattle = (id) => useQuery(q(["battle", id], () => engine.getBattle(id), { enabled: !!id }));
export const useBattleLimits = () => useQuery(q(["battleLimits"], engine.getBattleLimits));
export const useRivalRoster = () => useQuery(q(["rivalRoster"], engine.getRivalRoster));

export const useMyCrews = () => useQuery(q(["myCrews"], engine.listMyCrews));
export const useDiscoverCrews = (query = "") => useQuery(q(["discoverCrews", query], () => engine.discoverCrews(query)));
export const useCrew = (id) => useQuery(q(["crew", id], () => engine.getCrew(id), { enabled: !!id }));
export const useCrewLimits = () => useQuery(q(["crewLimits"], engine.getCrewLimits));
export const useCrewLeaderboard = (id, period = "week") =>
  useQuery(q(["crewLeaderboard", id, period], () => engine.getCrewLeaderboard(id, period), { enabled: !!id }));
export const useCrewMessages = (id) => useQuery(q(["crewMessages", id], () => engine.getCrewMessages(id), { enabled: !!id }));
export const useCrewFeed = (id) => useQuery(q(["crewFeed", id], () => engine.getCrewFeed(id), { enabled: !!id }));

export const useRuns = (limit = 50) => useQuery(q(["runs", limit], () => engine.listRuns({ limit })));
export const useRun = (id) => useQuery(q(["run", id], () => engine.getRun(id), { enabled: !!id }));

export const useEvents = (city) => useQuery(q(["events", city || "all"], () => engine.listEvents({ city })));
export const useEvent = (id) => useQuery(q(["event", id], () => engine.getEvent(id), { enabled: !!id }));

export const useDrops = () => useQuery(q(["drops"], engine.listDrops));
export const useDrop = (id) => useQuery(q(["drop", id], () => engine.getDrop(id), { enabled: !!id }));

export const useRewards = () => useQuery(q(["rewards"], engine.listRewards));
export const useRedemptions = () => useQuery(q(["redemptions"], engine.listRedemptions));

export const useNews = () => useQuery(q(["news"], engine.listNews));
export const useNewsItem = (id) => useQuery(q(["newsItem", id], () => engine.getNews(id), { enabled: !!id }));

export const useNotifications = () => useQuery(q(["notifications"], engine.listNotifications));
export const useUnreadCount = () => useQuery(q(["unread"], engine.unreadNotificationCount));

export const useSettings = () => useQuery(q(["settings"], engine.getSettings));

export const useStories = (authorId) => useQuery(q(["stories", authorId], () => engine.listStories(authorId), { enabled: !!authorId, staleTime: 60 * 1000 }));

// Run clubs and club v club
export const useFindClubs = (filter = "near", query = "") => useQuery(q(["findClubs", filter, query], () => engine.findClubs({ filter, query })));
export const useClubRuns = (clubId) => useQuery(q(["clubRuns", clubId], () => engine.listClubRuns(clubId), { enabled: !!clubId }));
export const useClubRun = (id) => useQuery(q(["clubRun", id], () => engine.getClubRun(id), { enabled: !!id }));
export const useFounding = (clubId) => useQuery(q(["founding", clubId], () => engine.getFounding(clubId), { enabled: !!clubId }));
export const useMyClaims = () => useQuery(q(["myClaims"], engine.listMyClaims));
export const useClubLeague = () => useQuery(q(["clubLeague"], engine.getClubLeague));
export const useFixture = (id) => useQuery(q(["fixture", id], () => engine.getFixture(id), { enabled: !!id }));
export const useMyFixture = () => useQuery(q(["myFixture"], engine.getMyFixture));
export const useClubBattles = (clubId) => useQuery(q(["clubBattles", clubId], () => engine.listClubBattles(clubId), { enabled: !!clubId }));
export const useClubBattle = (id) => useQuery(q(["clubBattle", id], () => engine.getClubBattle(id), { enabled: !!id }));
export const useClubRoster = (clubId) => useQuery(q(["clubRoster", clubId], () => engine.getClubRoster(clubId), { enabled: !!clubId }));
