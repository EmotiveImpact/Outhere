// Where the Fighter Pack's files go. Everything goes through the
// 'avatar-pack' Edge Function: it hands out a short-lived upload link for
// each scan shot (a private R2 bucket, deleted within 24 hours), checks the
// scan, asks fal.ai for the pictures and deletes them. The finished pictures
// are public, read from EXPO_PUBLIC_AVATAR_URL (the public R2 bucket's
// address) plus the key the database holds.

import * as ImageManipulator from "expo-image-manipulator";
import { supabase } from "@/lib/supabase";

const SCAN_SIDE = 1024;

/** A finished picture's public URL from its key (or an https URL as it is). */
export const packUrl = (path) => {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  const base = (process.env.EXPO_PUBLIC_AVATAR_URL || "").replace(/\/+$/, "");
  return base ? `${base}/${path}` : null;
};

/** { slot: key } from the database as { slot: url }, or null. */
export const fighterUrls = (fighter) => {
  if (!fighter || typeof fighter !== "object") return null;
  const out = {};
  for (const [slot, path] of Object.entries(fighter)) {
    const url = packUrl(path);
    if (url) out[slot] = url;
  }
  return Object.keys(out).length ? out : null;
};

// The function's own error code ("SCAN_FAILED", "CONSENT_REQUIRED" ...) when
// it sends one.
const call = async (body) => {
  const { data, error } = await supabase.functions.invoke("avatar-pack", { body });
  if (error) {
    let message = error.message;
    try {
      message = (await error.context?.json())?.error || message;
    } catch {}
    const e = new Error(message);
    e.code = /^[A-Z_]+$/.test(message) ? message : null;
    throw e;
  }
  return data;
};

// A camera shot shrunk to about 1024px on its long side, as JPEG.
export async function prepareScanShot(uri) {
  const out = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: SCAN_SIDE } }], { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG });
  return out.uri;
}

export const packFiles = supabase
  ? {
      call,
      // Uploads one scan shot and returns { key, scanId }.
      async uploadScanShot({ angle, uri, scanId }) {
        const blob = await (await fetch(uri)).blob();
        const { key, url, headers, scanId: id } = await call({ action: "selfie-url", angle, size: blob.size, scanId });
        const res = await fetch(url, { method: "PUT", headers, body: blob });
        if (!res.ok) throw new Error("The scan photo didn't upload. Try again.");
        return { key, scanId: id };
      },
      verify: (keys) => call({ action: "verify", keys }),
      generate: (packId) => call({ action: "generate", packId }),
      deletePack: () => call({ action: "delete" }),
    }
  : null;
