import { useCallback } from "react";
import { useFetcher } from "react-router";
import type { Act } from "./routes/act";

/** Send a write to the server. Pages re-load their data once it lands. */
export function useAct<Extra = object>() {
  const fetcher = useFetcher<{ ok: boolean; error?: string } & Partial<Extra>>();
  const act = useCallback(
    (a: Act) => fetcher.submit(a as never, { method: "post", action: "/act", encType: "application/json" }),
    [fetcher],
  );
  /** The write in flight, if any, so buttons can show the new state straight away. */
  const pending = fetcher.state === "idle" ? undefined : (fetcher.json as Act | undefined);
  return { act, state: fetcher.state, result: fetcher.data, pending };
}
