// Whether this build can play Rive, and the player when it can.
//
// Rive is native code (@rive-app/react-native on Nitro), so it plays in our
// own builds (the EAS development build and the store builds) but not in
// Expo Go, which only carries Expo's own native modules. There the import
// throws, `rive` stays null and every Rive screen draws its older React
// Native version instead. The web has its own player in runtime.web.js.

import Constants, { ExecutionEnvironment } from "expo-constants";

let rive = null;
if (Constants.executionEnvironment !== ExecutionEnvironment.StoreClient) {
  try {
    rive = require("@rive-app/react-native");
  } catch {
    rive = null;
  }
}

export const riveNative = rive;
export const riveAvailable = !!rive;

/**
 * Listens for the file's events (landed, slam, addPack, ...) and returns the
 * function that stops listening, or null where the player has no events.
 * The newer phone runtime, the default in @rive-app/react-native 0.5, throws
 * "Events are not supported" from onEventListener; left uncaught that closed
 * the app as soon as the logo came on screen. Callers stand in with timers.
 */
export function listenForEvents(view, onEvent) {
  try {
    view.onEventListener(onEvent);
  } catch {
    return null;
  }
  return () => {
    try {
      view.removeEventListeners();
    } catch {
      // The view has gone already.
    }
  };
}
