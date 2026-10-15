// Where story photos are kept. Everything goes through `storyFiles`, so the
// storage behind it can change without touching screens. Today the files are
// on Cloudflare R2, reached only through the 'story-media' Edge Function: it
// hands out a short-lived upload URL for your own folder, and viewing URLs
// only for stories you're allowed to see. Photos only for now.

import * as ImageManipulator from "expo-image-manipulator";
import { supabase } from "@/lib/supabase";

const MAX_SIDE = 1080;

// Shrinks a photo to about 1080px on its long side and saves it as WebP.
export async function prepareStoryPhoto(uri, { width, height } = {}) {
  const long = Math.max(width || 0, height || 0);
  const resize = !long || long > MAX_SIDE ? [{ resize: (width || 0) >= (height || 0) ? { width: MAX_SIDE } : { height: MAX_SIDE } }] : [];
  const out = await ImageManipulator.manipulateAsync(uri, resize, { compress: 0.8, format: ImageManipulator.SaveFormat.WEBP });
  return out.uri;
}

const call = async (body) => {
  const { data, error } = await supabase.functions.invoke("story-media", { body });
  if (error) {
    let message = error.message;
    try {
      message = (await error.context?.json())?.error || message;
    } catch {}
    throw new Error(message);
  }
  return data;
};

const r2StoryFiles = {
  // Uploads a prepared photo and returns its key for the stories row.
  async upload(localUri) {
    const blob = await (await fetch(localUri)).blob();
    const { key, url, headers } = await call({ action: "upload", contentType: "image/webp", size: blob.size });
    const res = await fetch(url, { method: "PUT", headers, body: blob });
    if (!res.ok) throw new Error("The photo didn't upload. Try again.");
    return key;
  },
  // Viewing URLs for several stories at once: { [storyId]: url }.
  async urls(storyIds) {
    if (!storyIds.length) return {};
    return (await call({ action: "view", storyIds })).urls || {};
  },
  async deleteStory(storyId) {
    await call({ action: "delete", storyId });
  },
  // An upload that never became a story.
  async discard(key) {
    await call({ action: "discard", key });
  },
};

export const storyFiles = supabase ? r2StoryFiles : null;
