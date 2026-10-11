// Feeds the phone's pedometer into the local engine. Mounted once at the root
// (StepSync in app/_layout.jsx); screens read steps from the engine hooks.
//
// iOS can query step counts for past ranges, so we backfill the last week.
// Android (and Expo Go on Android) can only watch live steps, so today's total
// there is whatever the engine already had plus steps counted while open.

import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import { Pedometer } from "expo-sensors";
import { create } from "zustand";
import * as engine from "@/data/engine";
import { addDays, dayKey, startOfDay } from "@/data/time";

const STEP_KM = 0.000762;
const SYNC_MS = 30 * 1000;

export const useStepStatus = create((set) => ({
  available: null, // null while checking
  permission: "pending", // pending | granted | denied
  liveSteps: null,
  set: (patch) => set(patch),
}));

const record = (steps, date = dayKey()) =>
  engine
    .recordSteps({ date, steps, distance: Math.round(steps * STEP_KM * 100) / 100, activeMinutes: Math.floor(steps / 110) })
    .catch(() => {});

export function useStepSync(enabled) {
  useEffect(() => {
    if (!enabled || Platform.OS === "web") {
      useStepStatus.getState().set({ available: false, permission: "denied" });
      return undefined;
    }
    let sub = null;
    let timer = null;
    let latest = 0;
    let lastSent = 0;
    let cancelled = false;
    const status = useStepStatus.getState().set;

    const flush = () => {
      if (latest > lastSent) {
        lastSent = latest;
        record(latest);
      }
    };

    (async () => {
      try {
        const available = await Pedometer.isAvailableAsync();
        if (!available) return status({ available: false, permission: "denied" });
        const { status: perm } = await Pedometer.requestPermissionsAsync();
        if (perm !== "granted") return status({ available: true, permission: "denied" });
        status({ available: true, permission: "granted" });

        let base = (await engine.getProfile().catch(() => null))?.today?.steps || 0;
        if (Platform.OS === "ios") {
          try {
            const today = await Pedometer.getStepCountAsync(startOfDay(), new Date());
            base = Math.max(base, today.steps);
            for (let i = 1; i <= 6; i += 1) {
              const from = addDays(new Date(), -i);
              const day = await Pedometer.getStepCountAsync(from, addDays(new Date(), -i + 1));
              if (day.steps > 0) record(day.steps, dayKey(from));
            }
          } catch {
            // Range queries can fail on some devices; live counting still works.
          }
        }
        if (cancelled) return;
        latest = base;
        flush();
        status({ liveSteps: base });

        let day = dayKey();
        sub = Pedometer.watchStepCount((result) => {
          if (dayKey() !== day) {
            // Midnight passed while open: start a fresh day from zero.
            flush();
            day = dayKey();
            base = -result.steps;
            latest = 0;
            lastSent = 0;
          }
          latest = Math.max(latest, base + result.steps);
          status({ liveSteps: latest });
        });
        timer = setInterval(flush, SYNC_MS);
      } catch (e) {
        status({ available: false, permission: "denied" });
      }
    })();

    const appSub = AppState.addEventListener("change", (s) => {
      if (s !== "active") flush();
    });

    return () => {
      cancelled = true;
      flush();
      sub?.remove();
      if (timer) clearInterval(timer);
      appSub.remove();
    };
  }, [enabled]);
}
