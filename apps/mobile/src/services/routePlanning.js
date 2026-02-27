/**
 * Route Planning Service
 * Uses the free Open Source Routing Machine (OSRM) API to generate
 * realistic walk/run routes snapped to roads and pedestrian paths.
 */

const OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/foot";

const humanizeModifier = (modifier) => {
  if (!modifier) return "";
  return modifier.replace(/_/g, " ");
};

const buildStepInstruction = (step) => {
  const maneuverType = step?.maneuver?.type || "";
  const modifier = humanizeModifier(step?.maneuver?.modifier);
  const streetName = step?.name ? ` onto ${step.name}` : "";

  if (maneuverType === "arrive") return "Arrive at destination";
  if (maneuverType === "depart") return modifier ? `Head ${modifier}${streetName}` : `Head out${streetName}`;
  if (maneuverType === "roundabout") return modifier ? `Enter roundabout and take ${modifier} exit` : "Enter roundabout";
  if (maneuverType === "turn") return modifier ? `Turn ${modifier}${streetName}` : `Turn${streetName}`;
  if (maneuverType === "continue") return modifier ? `Continue ${modifier}${streetName}` : `Continue${streetName}`;
  if (maneuverType === "fork") return modifier ? `Keep ${modifier}${streetName}` : `Keep${streetName}`;
  if (maneuverType === "merge") return modifier ? `Merge ${modifier}${streetName}` : `Merge${streetName}`;
  if (maneuverType === "end of road") return modifier ? `At end of road, turn ${modifier}${streetName}` : `At end of road${streetName}`;
  if (maneuverType === "new name") return `Continue${streetName}`;

  return streetName ? `Proceed${streetName}` : "Proceed";
};

/**
 * Fetches a route connecting an array of [latitude, longitude] coordinates.
 * 
 * @param {Array<{latitude: number, longitude: number}>} coordinates
 * @returns {Promise<{
 *   distance: number, // Total distance in meters
 *   duration: number, // Estimated duration in seconds
 *   geometry: { type: "LineString", coordinates: Array<[number, number]> }, // GeoJSON
 *   steps: Array<{
 *     location: { latitude: number, longitude: number },
 *     distance: number,
 *     duration: number,
 *     maneuverType: string,
 *     maneuverModifier: string,
 *     name: string,
 *     instruction: string,
 *   }>
 * }|null>}
 */
export async function fetchOSRMRoute(coordinates) {
  if (!coordinates || coordinates.length < 2) return null;

  try {
    // OSRM requires coordinates in {longitude},{latitude} format
    const coordString = coordinates
      .map((c) => `${c.longitude},${c.latitude}`)
      .join(";");

    // geometries=geojson returns a direct LineString we can use in react-native-maps
    // overview=full gives us the precise path (false gives a simplified one)
    const url = `${OSRM_BASE_URL}/${coordString}?geometries=geojson&overview=full&steps=true`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`OSRM API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      throw new Error("No route found");
    }

    const route = data.routes[0];
    const steps = (route.legs || []).flatMap((leg) => leg.steps || []).map((step) => {
      const location = step?.maneuver?.location || [];
      return {
        location: {
          latitude: location[1],
          longitude: location[0],
        },
        distance: step?.distance || 0,
        duration: step?.duration || 0,
        maneuverType: step?.maneuver?.type || "",
        maneuverModifier: step?.maneuver?.modifier || "",
        name: step?.name || "",
        instruction: buildStepInstruction(step),
      };
    }).filter((step) => Number.isFinite(step?.location?.latitude) && Number.isFinite(step?.location?.longitude));

    // Convert GeoJSON [lon, lat] back to Maps {latitude, longitude} for easier rendering
    const mapCoordinates = route.geometry.coordinates.map(([lon, lat]) => ({
      latitude: lat,
      longitude: lon,
    }));

    return {
      distance: route.distance, // in meters
      duration: route.duration, // in seconds
      coordinates: mapCoordinates, // { latitude, longitude } array
      steps,
    };
  } catch (error) {
    console.warn("Failed to fetch route:", error);
    return null;
  }
}

/**
 * Computes bounding box for a set of coordinates to zoom map appropriately.
 */
export function getRouteBoundingBox(coordinates) {
  if (!coordinates || coordinates.length === 0) return null;
  
  let minLat = coordinates[0].latitude;
  let maxLat = coordinates[0].latitude;
  let minLon = coordinates[0].longitude;
  let maxLon = coordinates[0].longitude;

  coordinates.forEach(c => {
    if (c.latitude < minLat) minLat = c.latitude;
    if (c.latitude > maxLat) maxLat = c.latitude;
    if (c.longitude < minLon) minLon = c.longitude;
    if (c.longitude > maxLon) maxLon = c.longitude;
  });

  const latitudeDelta = (maxLat - minLat) * 1.5 || 0.01;
  const longitudeDelta = (maxLon - minLon) * 1.5 || 0.01;
  const centerLat = (minLat + maxLat) / 2;
  const centerLon = (minLon + maxLon) / 2;

  return {
    latitude: centerLat,
    longitude: centerLon,
    latitudeDelta,
    longitudeDelta
  };
}
