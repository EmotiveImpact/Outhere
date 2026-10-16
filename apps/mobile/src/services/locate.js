// Where the member is, roughly, for picking their patch. Asks only when told
// to; otherwise returns a position only if location is already allowed.

import * as Location from "expo-location";

export async function locationAllowed() {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

// A browser can leave the question unanswered for ever; carry on without it.
const within = (promise, ms, fallback) => Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(fallback), ms))]);

export async function askLocation() {
  try {
    const res = await within(Location.requestForegroundPermissionsAsync(), 30000, { status: "undetermined" });
    return res.status === "granted";
  } catch {
    return false;
  }
}

// { lat, lng } or null.
export async function roughPosition({ ask = false } = {}) {
  try {
    const ok = ask ? await askLocation() : await locationAllowed();
    if (!ok) return null;
    const last = await Location.getLastKnownPositionAsync().catch(() => null);
    const pos = last || (await within(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }), 12000, null));
    return pos ? { lat: pos.coords.latitude, lng: pos.coords.longitude } : null;
  } catch {
    return null;
  }
}
