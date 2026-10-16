import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { OuthereData } from "@outhere/core";
import { useToast } from "@outhere/ui";
import { getData } from "./data";

/**
 * Every read goes through useLoad, and every write through useAct. A write
 * bumps one shared version number, so every mounted read (the page, the
 * sidebar counts, the audit log) fetches again and shows what the store now
 * holds.
 */
type Version = { version: number; refresh: () => void };
const VersionContext = createContext<Version>({ version: 0, refresh: () => {} });

export function DataProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  return <VersionContext.Provider value={{ version, refresh }}>{children}</VersionContext.Provider>;
}

export type Loaded<T> = { data: T | undefined; error: unknown; loading: boolean; reload: () => void };

/** Runs a read now, again after any write, and again when deps change. Keeps the last data while it reloads. */
export function useLoad<T>(read: (db: OuthereData) => Promise<T>, deps: readonly unknown[] = []): Loaded<T> {
  const { version, refresh } = useContext(VersionContext);
  const [state, setState] = useState<{ data: T | undefined; error: unknown; loading: boolean }>({ data: undefined, error: undefined, loading: true });
  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true }));
    read(getData()).then(
      (data) => live && setState({ data, error: undefined, loading: false }),
      (error: unknown) => live && setState({ data: undefined, error, loading: false }),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, ...deps]);
  return { ...state, reload: refresh };
}

/** Runs a write, then reloads every read. A failed write shows a toast instead of throwing. */
export function useAct() {
  const { refresh } = useContext(VersionContext);
  const toast = useToast();
  return useCallback(
    async (write: (db: OuthereData) => Promise<unknown>, done?: string): Promise<boolean> => {
      try {
        await write(getData());
        if (done) toast(done);
        return true;
      } catch (e) {
        toast(e instanceof Error && e.message === "STAFF_ONLY" ? "Staff only. That wasn't saved." : "That didn't save. Try again in a moment.");
        return false;
      } finally {
        refresh();
      }
    },
    [refresh, toast],
  );
}
