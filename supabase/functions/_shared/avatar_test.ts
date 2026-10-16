// deno test supabase/functions/_shared/avatar_test.ts
import { assert, assertEquals, assertFalse, assertThrows } from "jsr:@std/assert@1";
import {
  ART_BRIEF,
  PROMPTS,
  avatarKey,
  buildPrompt,
  checkWebhookToken,
  falInput,
  falMessage,
  falQueueUrl,
  parseSelfieKey,
  scanProblem,
  selfieKey,
  toHex,
  verifyFalWebhook,
  webhookToken,
} from "./avatar.ts";

const me = "0b6f3c7e-1111-4222-8333-444455556666";
const pack = "9a1b2c3d-1111-4222-8333-444455556666";

// Every picture the app knows about (constants/pack.js): eight base slots, two
// Black slots and the nine extra poses.
const NAMES = [
  "profile", "vs", "vsMirror", "swipe", "sprint", "win", "respect", "background", "blackEdition", "clubKit",
  "race-nightRun", "race-hoodUp", "race-finishLean", "win-roar", "win-crown", "win-pointUp",
  "respect-fistBump", "respect-handOnHeart", "respect-slowClap",
];

Deno.test("there is a prompt for every picture and nothing else", () => {
  assertEquals(Object.keys(PROMPTS).sort(), [...NAMES].sort());
});

Deno.test("every prompt carries the shared art brief and the rules", () => {
  for (const name of NAMES) {
    const p = buildPrompt(name);
    assert(p.startsWith(ART_BRIEF), name);
    for (const must of ["same face", "No text", "no logos", "no recognisable landmarks", "Athletic running kit", "motion blur", "Crushed blacks", "cool blue"]) {
      assert(p.includes(must), `${name}: ${must}`);
    }
  }
  assertThrows(() => buildPrompt("anything the member types"));
});

Deno.test("the fal request is a fixed prompt, one reference photo and WebP out", () => {
  const input = falInput("vs", "https://r2.example/selfie.jpg?sig=1");
  assertEquals(input.image_urls, ["https://r2.example/selfie.jpg?sig=1"]);
  assertEquals(input.output_format, "webp");
  assertEquals(input.num_images, 1);
  assertEquals(input.aspect_ratio, "3:4");
  const u = new URL(falQueueUrl("https://x.supabase.co/functions/v1/avatar-pack?action=webhook&image=1"));
  assertEquals(u.host, "queue.fal.run");
  assertEquals(u.pathname, "/fal-ai/nano-banana/edit");
  assertEquals(u.searchParams.get("fal_webhook"), "https://x.supabase.co/functions/v1/avatar-pack?action=webhook&image=1");
});

Deno.test("selfie keys live in the member's own folder", () => {
  const key = selfieKey(me, "scan12345", "left");
  assertEquals(key, `selfies/${me}/scan12345/left.jpg`);
  assertEquals(parseSelfieKey(me, key), { userId: me, scanId: "scan12345", angle: "left" });
  assertEquals(parseSelfieKey("0b6f3c7e-9999-4222-8333-444455556666", key), null);
  assertEquals(parseSelfieKey(me, `selfies/${me}/../x/left.jpg`), null);
  assertEquals(parseSelfieKey(me, `selfies/${me}/scan12345/up.jpg`), null);
  assertThrows(() => selfieKey(me, "short", "left"));
  assertThrows(() => selfieKey("not-a-uuid", "scan12345", "left"));
});

Deno.test("picture keys: slot or set-pose, and a new file for each re-roll", () => {
  assertEquals(avatarKey(me, pack, "vs"), `avatars/${me}/${pack}/vs.webp`);
  assertEquals(avatarKey(me, pack, "race-hoodUp", 1), `avatars/${me}/${pack}/race-hoodUp.webp`);
  assertEquals(avatarKey(me, pack, "vs", 3), `avatars/${me}/${pack}/vs-3.webp`);
  assertEquals(avatarKey(me, pack, "vs", 1, "png"), `avatars/${me}/${pack}/vs.png`);
  assertThrows(() => avatarKey(me, pack, "../vs"));
  // The same shape the avatar_images.path check accepts.
  assert(/^avatars\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/[A-Za-z0-9-]{2,40}\.(webp|png|jpg)$/.test(avatarKey(me, pack, "respect-slowClap", 2)));
});

Deno.test("the scan passes with three fresh angles from one scan", () => {
  const now = Date.now();
  const shot = (angle: "straight" | "left" | "right", ago = 60_000, scanId = "scan12345") => ({ angle, scanId, uploadedAt: now - ago });
  assertEquals(scanProblem([shot("straight"), shot("left"), shot("right")], now), null);
  assertEquals(scanProblem([shot("straight"), shot("left"), null], now), "MISSING_SHOT");
  assertEquals(scanProblem([shot("straight"), shot("left"), shot("left")], now), "MISSING_ANGLE");
  assertEquals(scanProblem([shot("straight"), shot("left"), shot("right", 60_000, "other1234")], now), "MIXED_SCAN");
  assertEquals(scanProblem([shot("straight", 11 * 60_000), shot("left"), shot("right")], now), "STALE_SHOT");
});

// A stand-in for fal's signing key, to check our side of the scheme.
const signed = async (body: string, at = Math.floor(Date.now() / 1000)) => {
  const pair = (await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"])) as CryptoKeyPair;
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const x = btoa(String.fromCharCode(...raw)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const bytes = new TextEncoder().encode(body);
  const msg = await falMessage("req-1", "fal-user", String(at), bytes);
  const sig = toHex(await crypto.subtle.sign({ name: "Ed25519" }, pair.privateKey, msg));
  const headers = new Headers({
    "X-Fal-Webhook-Request-Id": "req-1",
    "X-Fal-Webhook-User-Id": "fal-user",
    "X-Fal-Webhook-Timestamp": String(at),
    "X-Fal-Webhook-Signature": sig,
  });
  return { headers, bytes, keys: [{ kty: "OKP", crv: "Ed25519", x }] };
};

Deno.test("fal webhook signatures check out, and tampering fails", async () => {
  const body = JSON.stringify({ request_id: "req-1", status: "OK", payload: { images: [{ url: "https://fal.media/x.webp" }] } });
  const { headers, bytes, keys } = await signed(body);
  assert(await verifyFalWebhook(headers, bytes, keys));
  assertFalse(await verifyFalWebhook(headers, new TextEncoder().encode(body.replace("OK", "ERROR")), keys));
  const other = await signed(body);
  assertFalse(await verifyFalWebhook(headers, bytes, other.keys));
  const missing = new Headers(headers);
  missing.delete("X-Fal-Webhook-Signature");
  assertFalse(await verifyFalWebhook(missing, bytes, keys));
});

Deno.test("an old webhook is refused", async () => {
  const { headers, bytes, keys } = await signed("{}", Math.floor(Date.now() / 1000) - 600);
  assertFalse(await verifyFalWebhook(headers, bytes, keys));
});

Deno.test("the webhook token is tied to one picture", async () => {
  const token = await webhookToken("s3cret", "img-1");
  assert(await checkWebhookToken("s3cret", "img-1", token));
  assertFalse(await checkWebhookToken("s3cret", "img-2", token));
  assertFalse(await checkWebhookToken("other", "img-1", token));
  assertFalse(await checkWebhookToken("s3cret", "img-1", null));
});
