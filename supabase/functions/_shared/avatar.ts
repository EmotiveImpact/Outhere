// The Fighter Pack's pure helpers: R2 keys, the fixed prompts, the fal.ai
// request, and webhook verification. No I/O here, so the tests run without
// secrets (deno test supabase/functions/_shared/avatar_test.ts).
//
// The slot, set and pose names match apps/mobile/src/constants/pack.js and
// the avatar_slots and avatar_poses tables.

export const FAL_MODEL = "fal-ai/nano-banana/edit";
export const SCAN_ANGLES = ["straight", "left", "right"] as const;
export type ScanAngle = (typeof SCAN_ANGLES)[number];
export const SCAN_MAX_AGE_MS = 10 * 60 * 1000;
export const SELFIE_TTL_MS = 24 * 60 * 60 * 1000;
export const MAX_SELFIE_BYTES = 6 * 1024 * 1024;
export const MAX_PICTURE_BYTES = 12 * 1024 * 1024;
export const MAX_ATTEMPTS = 2;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SCAN_ID = /^[A-Za-z0-9_-]{8,64}$/;

// ── Keys ────────────────────────────────────────────────────────────────────

export const newScanId = () => crypto.randomUUID().replace(/-/g, "");

/** Private bucket: selfies/<member>/<scanId>/<angle>.jpg */
export const selfieKey = (userId: string, scanId: string, angle: string) => {
  if (!UUID.test(userId) || !SCAN_ID.test(scanId) || !SCAN_ANGLES.includes(angle as ScanAngle)) throw new Error("Bad selfie key");
  return `selfies/${userId}/${scanId}/${angle}.jpg`;
};

/** The parts of a selfie key, only when it is in this member's own folder. */
export const parseSelfieKey = (userId: string, key: unknown) => {
  if (typeof key !== "string") return null;
  const m = /^selfies\/([0-9a-f-]{36})\/([A-Za-z0-9_-]{8,64})\/(straight|left|right)\.jpg$/.exec(key);
  if (!m || m[1] !== userId) return null;
  return { userId: m[1], scanId: m[2], angle: m[3] as ScanAngle };
};

/**
 * Public bucket: avatars/<member>/<pack>/<name>.webp, where name is the slot
 * or "set-pose". A re-roll (attempt 2 and on) gets its own file, so a cached
 * old picture is never shown in its place.
 */
export const avatarKey = (userId: string, packId: string, name: string, version = 1, ext = "webp") => {
  if (!UUID.test(userId) || !UUID.test(packId) || !/^[A-Za-z-]{2,30}$/.test(name)) throw new Error("Bad avatar key");
  return `avatars/${userId}/${packId}/${name}${version > 1 ? `-${version}` : ""}.${ext}`;
};

export const EXT_FOR: Record<string, string> = { "image/webp": "webp", "image/png": "png", "image/jpeg": "jpg" };

// ── Prompts ─────────────────────────────────────────────────────────────────
// Fixed by us; members never write a prompt. One art brief for every picture,
// so a pack reads as one shoot, then a line for each slot or pose.

export const ART_BRIEF = [
  "Photograph of the same person as in the reference photo: same face, same features, same skin tone, same hair.",
  "A night and golden-hour city, streets and rooftops, with motion blur in the background lights.",
  "Crushed blacks, cool blue accents, high contrast, cinematic, sharp on the face.",
  "Athletic running kit in plain colours.",
  "No text, no words, no numbers, no logos, no brand marks, no recognisable landmarks.",
  "One person only, an adult, fully clothed, natural proportions.",
].join(" ");

export const PROMPTS: Record<string, { line: string; aspect: string }> = {
  profile: { line: "Head and shoulders portrait, looking straight at the camera, calm and confident.", aspect: "1:1" },
  vs: { line: "Fighting game versus pose, three quarter body, facing right, fists up, ready to race.", aspect: "3:4" },
  vsMirror: { line: "Fighting game versus pose, three quarter body, facing left, fists up, ready to race.", aspect: "3:4" },
  swipe: { line: "Full body standing tall on a city street at night, arms folded, looking at the camera.", aspect: "2:3" },
  sprint: { line: "Mid stride sprinting down an empty street at night, side on, strong motion blur behind.", aspect: "4:5" },
  win: { line: "Winning moment, one fist raised high, big smile, shouting with joy.", aspect: "4:5" },
  respect: { line: "Good sport after a race, a small respectful nod with a hand raised, warm half smile.", aspect: "4:5" },
  background: { line: "Wide shot, small in the frame, running along a rooftop at golden hour, lots of sky.", aspect: "16:9" },
  blackEdition: { line: "Premium portrait in all black running kit, gunmetal light raking across, moody and still.", aspect: "3:4" },
  clubKit: { line: "Three quarter portrait in a plain running club vest, stretching before a club run.", aspect: "4:5" },
  "race-nightRun": { line: "Running towards the camera at night under street lights, focused, breath visible.", aspect: "3:4" },
  "race-hoodUp": { line: "Hood up, head down, walking to the start line at night, intense stare.", aspect: "3:4" },
  "race-finishLean": { line: "Leaning through the finish, chest forward, arms back, face straining.", aspect: "3:4" },
  "win-roar": { line: "Winning roar, both arms out wide, head back, shouting to the sky.", aspect: "4:5" },
  "win-crown": { line: "Winning pose, both hands miming a crown above the head, grinning.", aspect: "4:5" },
  "win-pointUp": { line: "Winning pose, pointing one finger to the sky, eyes up.", aspect: "4:5" },
  "respect-fistBump": { line: "Offering a fist bump towards the camera after a race, friendly.", aspect: "4:5" },
  "respect-handOnHeart": { line: "Hand on heart after a race, slight bow of the head, grateful.", aspect: "4:5" },
  "respect-slowClap": { line: "Slow clap for the winner, smiling, a nod of respect.", aspect: "4:5" },
};

/** The full prompt for a picture. Throws for a name we don't make. */
export const buildPrompt = (name: string) => {
  const p = PROMPTS[name];
  if (!p) throw new Error(`No prompt for ${name}`);
  return `${ART_BRIEF} ${p.line}`;
};

/** The JSON body for one fal.ai queue request. */
export const falInput = (name: string, referenceUrl: string) => ({
  prompt: buildPrompt(name),
  image_urls: [referenceUrl],
  num_images: 1,
  output_format: "webp",
  aspect_ratio: PROMPTS[name].aspect,
});

/** The queue URL, with our webhook. */
export const falQueueUrl = (webhookUrl: string) => `https://queue.fal.run/${FAL_MODEL}?fal_webhook=${encodeURIComponent(webhookUrl)}`;

// ── Webhook verification ────────────────────────────────────────────────────

export type Bytes = Uint8Array<ArrayBuffer>;
const enc = new TextEncoder();
export const toHex = (bytes: ArrayBuffer | Uint8Array) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
export const fromHex = (hex: string) => {
  if (!/^(?:[0-9a-f]{2})*$/i.test(hex)) return null;
  return new Uint8Array(hex.match(/../g)?.map((h) => parseInt(h, 16)) ?? []);
};
export const fromBase64Url = (s: string) => {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "="));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};
export const sha256Hex = async (body: Bytes) => toHex(await crypto.subtle.digest("SHA-256", body));

/** The message fal signs: request id, user id, timestamp and sha256(body), on separate lines. */
export const falMessage = async (requestId: string, userId: string, timestamp: string, body: Bytes) =>
  enc.encode([requestId, userId, timestamp, await sha256Hex(body)].join("\n"));

export const FAL_JWKS_URL = "https://rest.fal.ai/.well-known/jwks.json";
export type Jwk = { kty?: string; crv?: string; x: string };

/**
 * fal.ai's webhook signature: ED25519 over falMessage(...), hex in
 * X-Fal-Webhook-Signature, checked against any key in their JWKS. The
 * timestamp must be within 5 minutes.
 */
export async function verifyFalWebhook(headers: Headers, body: Bytes, keys: Jwk[], now = Date.now()) {
  const requestId = headers.get("x-fal-webhook-request-id");
  const userId = headers.get("x-fal-webhook-user-id");
  const timestamp = headers.get("x-fal-webhook-timestamp");
  const signature = headers.get("x-fal-webhook-signature");
  if (!requestId || !userId || !timestamp || !signature) return false;
  if (!/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const sig = fromHex(signature);
  if (!sig || sig.byteLength !== 64) return false;
  const message = await falMessage(requestId, userId, timestamp, body);
  for (const k of keys) {
    try {
      const key = await crypto.subtle.importKey("raw", fromBase64Url(k.x), { name: "Ed25519" }, false, ["verify"]);
      if (await crypto.subtle.verify({ name: "Ed25519" }, key, sig, message)) return true;
    } catch {
      // not this key
    }
  }
  return false;
}

/**
 * Our own check on top: the webhook URL carries a token, an HMAC of the
 * picture's id with AVATAR_WEBHOOK_SECRET, so a URL for one picture can't be
 * used for another.
 */
export const webhookToken = async (secret: string, imageId: string) => {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(`avatar-webhook:${imageId}`)));
};

export const sameText = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

export const checkWebhookToken = async (secret: string, imageId: string, token: string | null) =>
  !!token && sameText(await webhookToken(secret, imageId), token);

// ── The scan ────────────────────────────────────────────────────────────────

export type Shot = { angle: ScanAngle; scanId: string; uploadedAt: number | null } | null;

/**
 * Today's scan rule: one shot for each angle, all from one scan, all uploaded
 * within the last 10 minutes. Returns null when it passes, or the reason.
 */
export const scanProblem = (shots: Shot[], now = Date.now()) => {
  if (shots.some((s) => !s)) return "MISSING_SHOT";
  const list = shots as NonNullable<Shot>[];
  if (new Set(list.map((s) => s.scanId)).size !== 1) return "MIXED_SCAN";
  if (SCAN_ANGLES.some((a) => !list.some((s) => s.angle === a))) return "MISSING_ANGLE";
  if (list.some((s) => !s.uploadedAt || now - s.uploadedAt > SCAN_MAX_AGE_MS || s.uploadedAt > now + 60 * 1000)) return "STALE_SHOT";
  return null;
};
