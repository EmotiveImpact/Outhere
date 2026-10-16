// React Query hooks for the Fighter Pack: the pack's state (consent, scan,
// pictures, pose picks and the fighter pictures) and the member's credits.
// Re-exported from hooks.js. Write with useEngineMutation(engine.startPack)
// and friends; every write refreshes these.

import { useQuery } from "@tanstack/react-query";
import { api as engine } from "./source";

// Same key root as hooks.js, so every engine write refreshes these too.
const q = (key, fn, options = {}) => ({ queryKey: ["engine", ...key], queryFn: fn, staleTime: 30 * 1000, ...options });

// While pictures are being made (a new pack, a re-roll or a new pose), poll
// every 2 seconds so they appear one by one.
const busy = (state) => !!state && (state.status === "making" || (state.images || []).some((i) => i.status === "pending"));

export const usePackState = () =>
  useQuery(q(["packState"], engine.getPackState, { refetchInterval: (query) => (busy(query.state.data) ? 2000 : false) }));

export const usePackCredits = () => useQuery(q(["packCredits"], engine.getPackCredits));
