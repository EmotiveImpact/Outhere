/**
 * Route Planning Service
 * Primary: Mapbox Directions API (mapbox/walking profile)
 * Fallback: OSRM (free, no key)
 *
 * Mapbox walking profile understands park footpaths, pedestrian zones,
 * steps, and cut-throughs that OSRM misses.
 */

const MAPBOX_BASE_URL = "https://api.mapbox.com/directions/v5/mapbox/walking";
const OSRM_BASE_URL   = "https://router.project-osrm.org/route/v1/foot";

// Hardcoded fallback so Expo env-var inlining issues don't silently break routing.
const MAPBOX_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ||
  "pk.eyJ1IjoiZW1vdGl2ZWltcGFjdCIsImEiOiJjbW02ZDdyYnMwZTh3MnFwOWUwZHZib21tIn0.zNQu0WhiaNg-D2sTtr6KZg";

// ── Mapbox Directions ─────────────────────────────────────────────────────────

async function fetchMapboxRoute(coordinates, options = {}) {
  if (!coordinates || coordinates.length < 2) return null;

  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 6000;
  const controller = new AbortController();
  let timeoutId = null;

  try {
    // Mapbox coords format: lon,lat;lon,lat;...
    const coordString = coordinates
      .map((c) => `${c.longitude},${c.latitude}`)
      .join(";");

    const url =
      `${MAPBOX_BASE_URL}/${coordString}` +
      `?geometries=geojson&overview=full&steps=true&language=en` +
      `&access_token=${MAPBOX_TOKEN}`;

    timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    timeoutId = null;

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.warn("[Mapbox] Error:", response.status, body);
      throw new Error(`Mapbox error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.routes || data.routes.length === 0) throw new Error("No Mapbox route found");

    const route = data.routes[0];

    // GeoJSON geometry: [lon, lat] → { latitude, longitude }
    const mapCoordinates = (route.geometry?.coordinates || []).map(([lon, lat]) => ({
      latitude: lat,
      longitude: lon,
    }));

    // Build steps from legs
    const legs = route.legs || [];
    const steps = legs
      .flatMap((leg) =>
        (leg.steps || []).map((step) => {
          const loc = step.maneuver?.location || [0, 0];
          return {
            location:      { latitude: loc[1], longitude: loc[0] },
            distance:      step.distance || 0,
            duration:      step.duration || 0,
            maneuverType:  step.maneuver?.type || "",
            maneuverModifier: step.maneuver?.modifier || "",
            name:          step.name || "",
            instruction:   step.maneuver?.instruction || "Continue",
          };
        }),
      )
      .filter((s) => Number.isFinite(s.location?.latitude));

    return {
      distance:    route.distance, // metres
      duration:    route.duration, // seconds
      coordinates: mapCoordinates,
      steps,
    };
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    console.warn("[Mapbox] Routing failed, falling back to OSRM:", error.message);
    return null;
  }
}

// ── OSRM Fallback ─────────────────────────────────────────────────────────────

const buildOSRMInstruction = (step, isFinalLeg) => {
  const type     = step?.maneuver?.type || "";
  const modifier = (step?.maneuver?.modifier || "").replace(/_/g, " ");
  const street   = step?.name ? ` onto ${step.name}` : "";

  if (type === "arrive")     return isFinalLeg ? "Arrive at destination" : "Arrive at checkpoint";
  if (type === "depart")     return modifier ? `Head ${modifier}${street}` : `Head out${street}`;
  if (type === "turn")       return modifier ? `Turn ${modifier}${street}` : `Turn${street}`;
  if (type === "continue")   return modifier ? `Continue ${modifier}${street}` : `Continue${street}`;
  if (type === "roundabout") return modifier ? `Enter roundabout, take ${modifier} exit` : "Enter roundabout";
  if (type === "fork")       return modifier ? `Keep ${modifier}${street}` : `Keep${street}`;
  if (type === "new name")   return `Continue${street}`;
  return street ? `Proceed${street}` : "Proceed";
};

async function fetchOSRMRouteInternal(coordinates, options = {}) {
  if (!coordinates || coordinates.length < 2) return null;

  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 5000;
  const controller = new AbortController();
  let timeoutId = null;

  try {
    const coordString = coordinates.map((c) => `${c.longitude},${c.latitude}`).join(";");
    const url = `${OSRM_BASE_URL}/${coordString}?geometries=geojson&overview=full&steps=true`;

    timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    timeoutId = null;

    if (!response.ok) throw new Error(`OSRM error: ${response.status}`);

    const data = await response.json();
    if (data.code !== "Ok" || !data.routes?.length) throw new Error("No OSRM route");

    const route = data.routes[0];
    const legs  = route.legs || [];
    const steps = legs
      .flatMap((leg, legIdx) =>
        (leg.steps || []).map((step) => {
          const loc = step?.maneuver?.location || [];
          return {
            location:      { latitude: loc[1], longitude: loc[0] },
            distance:      step?.distance || 0,
            duration:      step?.duration || 0,
            maneuverType:  step?.maneuver?.type || "",
            maneuverModifier: step?.maneuver?.modifier || "",
            name:          step?.name || "",
            instruction:   buildOSRMInstruction(step, legIdx === legs.length - 1),
          };
        }),
      )
      .filter((s) => Number.isFinite(s.location?.latitude));

    return {
      distance:    route.distance,
      duration:    route.duration,
      coordinates: route.geometry.coordinates.map(([lon, lat]) => ({ latitude: lat, longitude: lon })),
      steps,
    };
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    console.warn("[OSRM] Routing failed:", error.message);
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch a walking route. Uses Mapbox first, falls back to OSRM.
 */
export async function fetchOSRMRoute(coordinates, options = {}) {
  const mapbox = await fetchMapboxRoute(coordinates, options);
  if (mapbox) return mapbox;
  return fetchOSRMRouteInternal(coordinates, options);
}

/**
 * Bounding box for a set of coordinates (to zoom the map).
 */
export function getRouteBoundingBox(coordinates) {
  if (!coordinates?.length) return null;

  let minLat = coordinates[0].latitude,  maxLat = coordinates[0].latitude;
  let minLon = coordinates[0].longitude, maxLon = coordinates[0].longitude;

  coordinates.forEach((c) => {
    if (c.latitude  < minLat) minLat = c.latitude;
    if (c.latitude  > maxLat) maxLat = c.latitude;
    if (c.longitude < minLon) minLon = c.longitude;
    if (c.longitude > maxLon) maxLon = c.longitude;
  });

  return {
    latitude:      (minLat + maxLat) / 2,
    longitude:     (minLon + maxLon) / 2,
    latitudeDelta:  (maxLat - minLat) * 1.5 || 0.01,
    longitudeDelta: (maxLon - minLon) * 1.5 || 0.01,
  };
}
