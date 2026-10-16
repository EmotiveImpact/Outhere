// Cloudflare R2 over its S3 API: presigned PUT and GET URLs, heads, server
// side uploads and deletes.
// The signing client is passed in so this file runs the same under Deno (the
// Edge Function) and Node (the tests).

export type Signer = {
  sign(input: string, init: { method: string; headers?: Record<string, string>; aws: Record<string, unknown> }): Promise<Request>;
  fetch(
    input: string,
    init: { method: string; headers?: Record<string, string>; body?: BodyInit; aws?: Record<string, unknown> },
  ): Promise<Response>;
};

export type R2Config = { accountId: string; bucket: string };

export const MAX_STORY_BYTES = 3 * 1024 * 1024;
export const STORY_TYPES: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg" };

const encodeKey = (key: string) => key.split("/").map(encodeURIComponent).join("/");

export function r2(signer: Signer, { accountId, bucket }: R2Config) {
  const base = `https://${accountId}.r2.cloudflarestorage.com/${bucket}`;
  const objectUrl = (key: string, seconds: number) => `${base}/${encodeKey(key)}?X-Amz-Expires=${seconds}`;

  return {
    // The phone must send exactly this Content-Type and Content-Length, so a
    // URL can't be reused for a bigger or different file.
    async presignPut(key: string, contentType: string, size: number, seconds = 300) {
      const req = await signer.sign(objectUrl(key, seconds), {
        method: "PUT",
        headers: { "Content-Type": contentType, "Content-Length": String(size) },
        aws: { signQuery: true, allHeaders: true },
      });
      return req.url;
    },

    async presignGet(key: string, seconds = 3600) {
      const req = await signer.sign(objectUrl(key, seconds), { method: "GET", aws: { signQuery: true } });
      return req.url;
    },

    // Size and upload time of an object, or null when there is none.
    async head(key: string) {
      const res = await signer.fetch(`${base}/${encodeKey(key)}`, { method: "HEAD" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`R2 head failed (${res.status}) for ${key}`);
      const modified = res.headers.get("Last-Modified");
      return { size: Number(res.headers.get("Content-Length") ?? 0), uploadedAt: modified ? new Date(modified).getTime() : null };
    },

    // A server side upload (the Fighter Pack's finished pictures).
    async put(key: string, body: Uint8Array<ArrayBuffer>, contentType: string) {
      const res = await signer.fetch(`${base}/${encodeKey(key)}`, {
        method: "PUT",
        headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable" },
        body,
      });
      if (!res.ok) throw new Error(`R2 put failed (${res.status}) for ${key}`);
    },

    async remove(key: string) {
      const res = await signer.fetch(`${base}/${encodeKey(key)}`, { method: "DELETE" });
      // S3 answers 204 whether or not the object existed.
      if (!res.ok && res.status !== 404) throw new Error(`R2 delete failed (${res.status}) for ${key}`);
    },
  };
}

// '<uuid>/<name>.webp', the shape the stories table accepts.
export const storyKey = (userId: string, ext: string) => `${userId}/${crypto.randomUUID().replace(/-/g, "")}.${ext}`;

export const ownsKey = (userId: string, key: string) =>
  typeof key === "string" && key.startsWith(`${userId}/`) && /^[0-9a-f-]{36}\/[A-Za-z0-9_-]{8,64}\.(webp|jpg)$/.test(key);
