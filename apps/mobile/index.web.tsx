import '@expo/metro-runtime';
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';
import App from './App';

// Skia on the web is CanvasKit, a WebAssembly build. The export copies
// public/canvaskit.wasm to the site root, so point the loader there rather
// than next to the JS bundle. If it fails or is slow the app still starts:
// the finish kit (components/ui) draws plain views until Skia is ready.
const base = process.env.EXPO_BASE_URL || '';
const skia = LoadSkiaWeb({ locateFile: (file: string) => `${base}/${file}` }).catch((error: unknown) => {
  console.warn('Skia could not load, the finish kit will use plain views.', error);
});
const timeout = new Promise((resolve) => setTimeout(resolve, 5000));

Promise.race([skia, timeout]).then(() => {
  renderRootComponent(App);
});
