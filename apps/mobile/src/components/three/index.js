// Real 3D for Outhere: three.js through @react-three/fiber, on the web
// (WebGL) and the phone (expo-gl). See README.md in this folder.
//
// Nothing here imports three.js. The scenes load on demand the first time a
// screen calls useThreeReady() or renders Globe3D, and every piece shows
// its `fallback` until then.

import React from "react";
import { ThreeView } from "./ThreeView";

export { ThreeView } from "./ThreeView";
export { useThreeReady, threeReady, threeFailed, webglAvailable, loadThree, useFrameCost } from "./loader";

/**
 * A real globe. `size` is the globe's diameter in px; `width` and `height`
 * the box it draws in (default 1.3 x size, room for the glow). `from` and
 * `to` are { lat, lng, name } and get a blue and a red pin with the arc
 * between them. `spinning` keeps it moving (a slow spin with no pins, a
 * gentle sway with them), `arc` draws the arc, `intro` plays the swing in.
 * Drag turns it. `onPins` gets [[x, y, facing], [x, y, facing]] in px when
 * the pins settle or move. `fallback` shows until 3D is ready.
 */
export function Globe3D({ fallback, paused, style, ...props }) {
  return <ThreeView scene="Globe" sceneProps={props} fallback={fallback} paused={paused} style={style} />;
}
