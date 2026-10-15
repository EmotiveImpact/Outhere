// Where story photos are kept. Everything goes through `storyFiles`, so the
// files can move (to Cloudflare R2 if video stories arrive) without touching
// screens. Today: Supabase Storage, private 'stories' bucket, read through
// short-lived signed URLs, which the database only signs for people allowed
// to see the story.

import * as ImageManipulator from "expo-image-manipulator";
import { supabase } from "@/lib/supabase";

const BUCKET = "stories";
const MAX_SIDE = 1080;

// Shrinks a photo to about 1080px on its long side and saves it as WebP.
export async function prepareStoryPhoto(uri, { width, height } = {}) {
  const long = Math.max(width || 0, height || 0);
  const resize = long > MAX_SIDE ? [{ resize: width >= height ? { width: MAX_SIDE } : { height: MAX_SIDE } }] : [];
  const out = await ImageManipulator.manipulateAsync(uri, resize, { compress: 0.8, format: ImageManipulator.SaveFormat.WEBP });
  return out.uri;
}

const randomName = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

const supabaseStoryFiles = {
  // Uploads into the member's own folder (storage policy) and returns the path.
  async upload(localUri) {
    const { data: auth } = await supabase.auth.getSession();
    const me = auth.session?.user?.id;
    if (!me) throw new Error("Sign in first.");
    const body = await (await fetch(localUri)).arrayBuffer();
    const path = `${me}/${randomName()}.webp`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType: "image/webp", upsert: false });
    if (error) throw error;
    return path;
  },
  async url(path, seconds = 60 * 60) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, seconds);
    if (error) return null;
    return data.signedUrl;
  },
  async remove(path) {
    await supabase.storage.from(BUCKET).remove([path]);
  },
};

export const storyFiles = supabase ? supabaseStoryFiles : null;
