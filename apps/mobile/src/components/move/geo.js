// Geometry and activity helpers for the Move tab. Pure functions only so they
// can be shared by the store, the map and the summary.

import { Bike, Footprints, PersonStanding } from "lucide-react-native";
import { TIER_RULES } from "@/data/engine";

export const DEFAULT_REGION = {
  latitude: 51.5074,
  longitude: -0.1278,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

// kcalPerKm is a rough average for a 70 kg adult. maxSpeed (m/s) drops GPS
// jumps that no human on that activity could manage.
export const ACTIVITIES = {
  walk: { value: "walk", label: "Walk", noun: "walk", icon: Footprints, kcalPerKm: 50, maxSpeed: 4 },
  run: { value: "run", label: "Run", noun: "run", icon: PersonStanding, kcalPerKm: 62, maxSpeed: 9 },
  ride: { value: "ride", label: "Ride", noun: "ride", icon: Bike, kcalPerKm: 25, maxSpeed: 25 },
};
export const ACTIVITY_LIST = Object.values(ACTIVITIES);
export const activityFor = (type) => ACTIVITIES[type] || ACTIVITIES.run;

const toRad = (deg) => (deg * Math.PI) / 180;

/** Great circle distance in metres. */
export const haversine = (a, b) => {
  if (!a || !b) return 0;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

export const pathMetres = (path = []) => {
  let total = 0;
  for (let i = 1; i < path.length; i += 1) total += haversine(path[i - 1], path[i]);
  return total;
};

export const isCoord = (p) => p && Number.isFinite(p.latitude) && Number.isFinite(p.longitude);

/** Region that fits every coordinate, with some breathing room. */
export const regionFor = (coords = [], pad = 1.6) => {
  const valid = coords.filter(isCoord);
  if (!valid.length) return DEFAULT_REGION;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  valid.forEach((c) => {
    minLat = Math.min(minLat, c.latitude);
    maxLat = Math.max(maxLat, c.latitude);
    minLon = Math.min(minLon, c.longitude);
    maxLon = Math.max(maxLon, c.longitude);
  });
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max(0.004, (maxLat - minLat) * pad),
    longitudeDelta: Math.max(0.004, (maxLon - minLon) * pad),
  };
};

export const caloriesFor = (type, km) => Math.round((Number(km) || 0) * activityFor(type).kcalPerKm);

export const paceFor = (km, sec) => (km > 0.01 && sec > 0 ? sec / km : null);

/** XP and OUT a run earns, mirroring engine.saveRun and the tier multiplier. */
export const rewardsFor = (km, tier = "free") => {
  const rounded = Math.round((Number(km) || 0) * 100) / 100;
  const base = Math.round(rounded * 10);
  const mult = TIER_RULES[tier]?.xpMultiplier || 1;
  return { xp: base > 0 ? Math.round(base * mult) : 0, out: base > 0 ? Math.floor(rounded) : 0, multiplier: mult };
};

export const runTitle = (type, ms = Date.now()) => {
  const h = new Date(ms).getHours();
  const part = h < 12 ? "Morning" : h < 17 ? "Afternoon" : h < 21 ? "Evening" : "Night";
  return `${part} ${activityFor(type).noun}`;
};

// Dark Google map style (Android). iOS uses Apple Maps with userInterfaceStyle="dark".
export const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#141414" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#5c5c5c" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#141414" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#222222" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#a0a0a0" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#454545" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#10180f" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#262628" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#101010", weight: 0.5 }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#323234" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3e3e40" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#1d232b" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#2a2a2a" }] },
];
