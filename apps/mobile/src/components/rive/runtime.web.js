// On the web Rive is the canvas runtime (@rive-app/canvas). Its WebAssembly
// file ships in public/ (copied to the site root by the export), so the
// loader looks there rather than on a CDN.

import { RuntimeLoader } from "@rive-app/canvas";

const base = process.env.EXPO_BASE_URL || "";
RuntimeLoader.setWasmUrl(`${base}/rive.wasm`);

export const riveNative = null;
export const riveAvailable = true;
