// Walking route planning for the Move tab.
// Uses Mapbox Directions when EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN is set, otherwise
// the public OSRM demo server (no key). Both talk to third party routing
// services, not the OutHere backend. Every failure resolves to null so the
// caller can keep its straight line preview.

const MAPBOX_BASE_URL = "https://api.mapbox.com/directions/v5/mapbox/walking";
const OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/foot";
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

const toLatLng = ([lon, lat]) => ({ latitude: lat, longitude: lon });
const coordString = (coords) => coords.map((c) => `${c.longitude},${c.latitude}`).join(";");

async function getJson(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const routeResult = (route) => ({
  distance: route.distance, // metres
  duration: route.duration, // seconds
  coordinates: (route.geometry?.coordinates || []).map(toLatLng),
});

async function mapboxRoute(coords, timeoutMs) {
  if (!MAPBOX_TOKEN) return null;
  try {
    const data = await getJson(
      `${MAPBOX_BASE_URL}/${coordString(coords)}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`,
      timeoutMs,
    );
    return data.routes?.length ? routeResult(data.routes[0]) : null;
  } catch {
    return null;
  }
}

async function osrmRoute(coords, timeoutMs) {
  try {
    const data = await getJson(`${OSRM_BASE_URL}/${coordString(coords)}?geometries=geojson&overview=full`, timeoutMs);
    return data.code === "Ok" && data.routes?.length ? routeResult(data.routes[0]) : null;
  } catch {
    return null;
  }
}

/**
 * Snap waypoints [{ latitude, longitude }] to a walkable route.
 * Resolves { distance, duration, coordinates } or null.
 */
export async function fetchOSRMRoute(coordinates, { timeoutMs = 6000 } = {}) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
  return (await mapboxRoute(coordinates, timeoutMs)) || osrmRoute(coordinates, timeoutMs);
}
