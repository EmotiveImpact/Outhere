// Turns an image source as the app keeps it (a require() number, { uri } or
// a plain URL) into a URL a Rive player can load. Bundled images go through
// expo-asset: on a phone it copies them to a local file, on the web it gives
// the exported file's hashed URL.

import { Platform } from "react-native";
import { Asset } from "expo-asset";

export async function imageUrl(source) {
  if (source == null) return null;
  if (typeof source === "string") return source;
  if (typeof source === "object" && source.uri) return source.uri;
  if (typeof source !== "number") return null;
  const asset = Asset.fromModule(source);
  if (Platform.OS === "web") return asset.uri;
  await asset.downloadAsync();
  return asset.localUri || asset.uri;
}
