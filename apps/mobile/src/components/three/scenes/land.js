// Land and city light data for the 3D globe, built once from the same
// coastlines the Skia globe uses (arena/globeLand.js). Nothing here touches
// three.js: it hands back typed arrays the scene wraps in textures and
// buffers.

import { isLand, toVec, WORLD_CITIES } from "@/components/arena/globeLand";
import { UK_CITIES } from "@/data/places";

const RAD = Math.PI / 180;

// The dot matrix: rows of cells `step` degrees tall from 84°S to 84°N, each
// row holding round(360·cos(lat)/step) cells so the dots sit evenly on the
// sphere, with alternate rows staggered by half a cell. The texture is one
// byte per cell (255 on land), W columns wide (the equator's count) by H
// rows; a row only uses its first n cells. The shader does the same maths
// to find the cell under each pixel and draws a soft disc in it.
let lut = null;
export function landTable(step = 2) {
  if (lut && lut.step === step) return lut;
  const W = Math.round(360 / step);
  const rows = [];
  for (let lat = -84 + step / 2; lat < 84; lat += step) rows.push(lat);
  const H = rows.length;
  const data = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) {
    const lat = rows[j];
    const n = Math.max(1, Math.round((360 * Math.cos(lat * RAD)) / step));
    const dl = 360 / n;
    const off = (j % 2) * dl * 0.5;
    for (let i = 0; i < n; i++) {
      const lng = -180 + off + (i + 0.5) * dl;
      if (isLand(lat, lng > 180 ? lng - 360 : lng)) data[j * W + i] = 255;
    }
  }
  lut = { step, W, H, data, soft: softLand(data, W, H, step) };
  return lut;
}

// A small equirectangular land mask sampled from the table (cheap: array
// lookups, no polygon tests) and blurred, for a faint fill under the dots.
function softLand(table, W, H, step) {
  const w = 256;
  const h = 128;
  const raw = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const lat = -90 + ((y + 0.5) / h) * 180; // row 0 is the south, as the texture's v = 0
    const j = Math.floor((lat + 84) / step);
    if (j < 0 || j >= H) {
      if (lat < -66) for (let x = 0; x < w; x++) raw[y * w + x] = 1;
      continue;
    }
    const latj = -84 + (j + 0.5) * step;
    const n = Math.max(1, Math.round((360 * Math.cos(latj * RAD)) / step));
    const dl = 360 / n;
    const off = (j % 2) * dl * 0.5;
    for (let x = 0; x < w; x++) {
      const lng = -180 + ((x + 0.5) / w) * 360;
      let i = Math.floor((lng + 180 - off) / dl);
      i = ((i % n) + n) % n;
      raw[y * w + x] = table[j * W + i] ? 1 : 0;
    }
  }
  // two passes of a 3x3 box blur, wrapping in longitude
  let src = raw;
  let dst = new Float32Array(w * h);
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let s = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = Math.min(h - 1, Math.max(0, y + dy));
          for (let dx = -1; dx <= 1; dx++) s += src[yy * w + ((x + dx + w) % w)];
        }
        dst[y * w + x] = s / 9;
      }
    }
    [src, dst] = [dst, src];
  }
  const out = new Uint8Array(w * h);
  for (let k = 0; k < out.length; k++) out[k] = Math.round(src[k] * 255);
  return { data: out, w, h };
}

// Deterministic pseudo random numbers so the lights sit in the same places
// on every run (mulberry32).
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Where the lights cluster: [lat, lng, spread in degrees, count]. The UK and
// Europe are thick with them, the rest of the world has its big cities.
const CLUSTERS = [
  // United Kingdom and Ireland
  [51.5, -0.12, 0.55, 26],
  [53.4, -2.2, 1.2, 30],
  [52.5, -1.9, 1.0, 14],
  [55.9, -3.6, 1.2, 10],
  [54.6, -5.9, 0.6, 4],
  [53.3, -6.3, 0.5, 5],
  // Europe
  [48.86, 2.35, 0.7, 12],
  [51.2, 4.8, 1.8, 28],
  [50.9, 9.5, 2.6, 26],
  [48.1, 11.6, 1.4, 8],
  [45.5, 9.2, 1.6, 14],
  [41.9, 12.5, 1.2, 6],
  [40.4, -3.7, 1.2, 8],
  [41.4, 2.2, 0.6, 5],
  [38.7, -9.1, 0.6, 4],
  [52.2, 20.0, 2.2, 10],
  [50.1, 14.4, 1.0, 5],
  [47.5, 19.0, 1.0, 5],
  [59.4, 17.5, 3.0, 8],
  [55.7, 12.6, 0.8, 4],
  [60.2, 24.9, 0.8, 3],
  [41.0, 28.9, 1.2, 8],
  [55.75, 37.6, 1.1, 9],
  [50.4, 30.5, 1.0, 4],
  // North America
  [40.7, -74.0, 1.2, 22],
  [39.0, -77.0, 1.6, 10],
  [42.3, -71.1, 0.8, 6],
  [41.8, -87.7, 1.6, 12],
  [33.7, -84.4, 1.4, 6],
  [25.8, -80.2, 0.8, 5],
  [29.8, -95.4, 1.6, 8],
  [32.8, -96.8, 1.0, 5],
  [34.0, -118.2, 1.4, 14],
  [37.6, -122.2, 1.0, 8],
  [47.6, -122.3, 0.8, 4],
  [43.7, -79.4, 1.2, 7],
  [45.5, -73.6, 0.8, 4],
  [19.4, -99.1, 1.0, 6],
  // South America
  [-23.5, -46.6, 1.6, 12],
  [-22.9, -43.2, 0.8, 5],
  [-34.6, -58.4, 1.0, 5],
  [4.7, -74.1, 0.8, 3],
  [-12.0, -77.0, 0.6, 3],
  // Africa and the Middle East
  [6.5, 3.4, 1.4, 12],
  [5.6, -0.2, 0.9, 6],
  [30.0, 31.2, 1.0, 6],
  [-1.3, 36.8, 0.8, 4],
  [-26.2, 28.0, 1.4, 7],
  [-33.9, 18.4, 0.5, 3],
  [33.6, -7.6, 0.8, 3],
  [25.2, 55.3, 1.2, 7],
  [24.7, 46.7, 1.0, 4],
  [32.0, 34.8, 0.8, 4],
  // Asia and Australia
  [19.1, 72.9, 1.0, 8],
  [28.6, 77.2, 1.4, 10],
  [13.0, 77.6, 1.0, 5],
  [22.6, 88.4, 1.0, 5],
  [23.8, 90.4, 0.8, 4],
  [31.2, 121.5, 1.8, 14],
  [39.9, 116.4, 1.6, 10],
  [23.1, 113.5, 1.4, 10],
  [30.6, 104.1, 1.2, 5],
  [35.7, 139.7, 1.2, 14],
  [34.7, 135.5, 1.0, 8],
  [37.5, 127.0, 0.9, 7],
  [25.0, 121.5, 0.6, 4],
  [13.8, 100.5, 1.0, 5],
  [1.35, 103.8, 0.5, 4],
  [3.1, 101.7, 0.8, 3],
  [-6.2, 106.8, 1.0, 5],
  [14.6, 121.0, 0.8, 4],
  [-33.9, 151.2, 1.0, 6],
  [-37.8, 145.0, 0.9, 5],
  [-27.5, 153.0, 0.7, 3],
  [-31.9, 115.9, 0.5, 2],
  [-36.8, 174.8, 0.5, 2],
];

// Gaussian-ish spread: the sum of two uniforms, centred.
const spread = (r) => r() + r() - 1;

let lights = null;
/**
 * City lights as flat typed arrays: positions (unit vectors, three.js axes,
 * x towards 0°E, y north, z towards 90°W), a size per light (world units),
 * a phase for the twinkle and a warmth (0 cool, 1 warm).
 */
export function cityLights() {
  if (lights) return lights;
  const r = rng(2024);
  const pts = [];
  const push = (lat, lng, size, warm) => {
    const v = toVec(lat, lng);
    pts.push(v[0], v[2], -v[1], size, r(), warm);
  };
  for (const [lat, lng, s, n] of CLUSTERS) {
    for (let k = 0; k < n; k++) {
      let placed = false;
      for (let tries = 0; tries < 8 && !placed; tries++) {
        const la = lat + spread(r) * s;
        const lo = lng + (spread(r) * s) / Math.max(0.2, Math.cos(lat * RAD));
        if (isLand(la, lo)) {
          push(la, lo, 0.012 + r() * 0.014, 0.35 + r() * 0.65);
          placed = true;
        }
      }
      if (!placed) push(lat, lng, 0.016, 0.6);
    }
    // the cluster's heart is a brighter light
    push(lat, lng, 0.03, 0.55);
  }
  for (const c of UK_CITIES) push(c.lat, c.lng, 0.018, 0.5);
  for (const key of Object.keys(WORLD_CITIES)) push(WORLD_CITIES[key][0], WORLD_CITIES[key][1], 0.03, 0.5);
  const n = pts.length / 6;
  const position = new Float32Array(n * 3);
  const size = new Float32Array(n);
  const phase = new Float32Array(n);
  const warm = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    position[i * 3] = pts[i * 6];
    position[i * 3 + 1] = pts[i * 6 + 1];
    position[i * 3 + 2] = pts[i * 6 + 2];
    size[i] = pts[i * 6 + 3];
    phase[i] = pts[i * 6 + 4];
    warm[i] = pts[i * 6 + 5];
  }
  lights = { count: n, position, size, phase, warm };
  return lights;
}

/** A lat, lng in degrees as a three.js unit vector [x, y, z] (y north). */
export function toThree(lat, lng) {
  const v = toVec(lat, lng);
  return [v[0], v[2], -v[1]];
}
