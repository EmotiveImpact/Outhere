// deno test supabase/functions/_shared/r2_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1";
import { AwsClient } from "npm:aws4fetch@1.0.20";
import { ownsKey, r2, storyKey } from "./r2.ts";

const me = "0b6f3c7e-1111-4222-8333-444455556666";
const deleted: string[] = [];
const signer = new AwsClient({ accessKeyId: "AKID", secretAccessKey: "SECRET", service: "s3", region: "auto" });
const files = r2(
  { sign: signer.sign.bind(signer), fetch: (url: string) => (deleted.push(url), Promise.resolve(new Response(null, { status: 204 }))) },
  { accountId: "acc", bucket: "outhere-stories" },
);

Deno.test("keys live in the owner's folder and match the table's check", () => {
  const key = storyKey(me, "webp");
  assert(ownsKey(me, key));
  assert(!ownsKey("someone-else", key));
  assert(!ownsKey(me, `${me}/../x.webp`));
});

Deno.test("upload URLs pin type and size and expire in five minutes", async () => {
  const url = new URL(await files.presignPut(storyKey(me, "webp"), "image/webp", 1234));
  assertEquals(url.host, "acc.r2.cloudflarestorage.com");
  assertEquals(url.searchParams.get("X-Amz-Expires"), "300");
  assertEquals(url.searchParams.get("X-Amz-SignedHeaders"), "content-length;content-type;host");
  assert(url.searchParams.get("X-Amz-Signature"));
});

Deno.test("viewing URLs last an hour", async () => {
  const url = new URL(await files.presignGet(storyKey(me, "webp")));
  assertEquals(url.searchParams.get("X-Amz-Expires"), "3600");
});

Deno.test("delete goes to the object", async () => {
  const key = storyKey(me, "webp");
  await files.remove(key);
  assert(deleted.at(-1)!.endsWith(`/outhere-stories/${key}`));
});
