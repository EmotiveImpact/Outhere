// Skia readiness. On iOS and Android Skia is always there. On the web it is
// CanvasKit, which index.web.tsx loads from /canvaskit.wasm before the app
// starts (or gives up on after five seconds).
//
// Skia's web module reads global.CanvasKit once, when it is first imported,
// so nothing in the app may import "@shopify/react-native-skia" before it has
// loaded. The kit keeps every Skia drawing in components/ui/skia/ and pulls it
// in with skiaParts() only once useSkiaReady() says yes. Screens should use
// the kit pieces rather than import Skia themselves.

import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { Asset } from "expo-asset";

export const skiaReady = () => Platform.OS !== "web" || typeof globalThis.CanvasKit !== "undefined";

/** True once Skia can draw. Re-renders the caller when CanvasKit arrives late. */
export function useSkiaReady() {
  const [ready, setReady] = useState(skiaReady);
  useEffect(() => {
    if (ready) return undefined;
    let tries = 0;
    const id = setInterval(() => {
      tries += 1;
      if (skiaReady()) {
        setReady(true);
        clearInterval(id);
      } else if (tries > 150) clearInterval(id);
    }, 200);
    return () => clearInterval(id);
  }, [ready]);
  return ready;
}

/** The kit's Skia drawings. Only call after useSkiaReady() returns true. */
export const skiaParts = () => require("./skia/parts");

/**
 * An image source Skia can load. On the web Skia guesses a bundled image's
 * URL without the hash the export adds to file names, so resolve it through
 * expo-asset; everywhere else require() numbers work as they are.
 */
export function skiaSource(source) {
  if (source == null) return source;
  if (typeof source === "object" && source.uri) return source.uri; // { uri } as expo-image takes it
  if (Platform.OS === "web" && typeof source === "number") return Asset.fromModule(source).uri;
  return source;
}

// On the web each live Skia canvas holds a WebGL context and browsers allow
// about sixteen. Still pictures render once and hand the context back.
export const STILL = Platform.OS === "web" ? { __destroyWebGLContextAfterRender: true } : null;
