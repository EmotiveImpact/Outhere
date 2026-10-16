# Real 3D

three.js through `@react-three/fiber`, on the web (WebGL 2) and the phone
(expo-gl, which is in Expo Go and every build). One scene in use: the race
globe. Live proof: `/lush`, the 3D tab. A 3D OUT coin was built as well
and turned down, so it was removed (it is in git history at 9567e47).

## Setup

`three@0.185.1` and `@react-three/fiber@9.8.1` (exact) in `apps/mobile`.
Fiber 9 is the React 19 line; its `react-native` entry uses `expo-gl`,
`expo-asset` and `expo-file-system`, all already installed. `expo-three` is
not needed. No Metro or Babel change was needed: Metro picks fiber's
`react-native` entry on iOS and Android and the `module` entry on the web,
and three ships `three.cjs` for the phone and `three.module.js` for the web.

## Rules

- Never import `three` or `@react-three/fiber` from a screen. Everything
  that touches them lives in `scenes/` and is loaded with a dynamic
  `import()` by `loader.js` the first time a screen asks (`useThreeReady()`
  or a `Globe3D`). On the web that is its own chunk; on the phone
  the module body runs only when required. Screens that never ask pay
  nothing.
- Every scene renders through `ThreeView`, which shows the `fallback` (the
  Skia drawing or image the screen already had) until three.js has loaded
  and for good when WebGL is missing.
- Each scene is one fiber `Canvas` (`scenes/Stage.jsx`): transparent,
  antialiased, device pixel ratio capped at 2 on the web, ACES tone mapping.
  The frame loop stops (`frameloop="never"`) when the app is in the
  background, when the screen has lost navigation focus, when the view has
  scrolled off screen (web, IntersectionObserver) or when the parent passes
  `paused`. Geometries, materials and textures made by hand are disposed on
  unmount (`useDispose`); fiber disposes the ones made in JSX.
- On the phone fiber's Canvas lays a touch catcher over the GL view that
  claims every gesture, which would stop a ScrollView. `Stage` turns it off
  (`pointerEvents="none"`) and the scene's own host view takes touches
  (the globe's drag).
- Custom shaders write final sRGB colours with `toneMapped: false`; glows
  are additive with premultiplied alpha. Keep the whole scene under 60k
  triangles and lights as one `Points`.

## API (`components/three`)

- `useThreeReady()`: true once 3D can draw. Starts the load.
- `threeFailed()`, `webglAvailable()`, `loadThree()`.
- `ThreeView({ scene, sceneProps, fallback, paused, style })`.
- `Globe3D({ size, width, height, from, to, spinning, arc, intro, onPins, fallback, paused })`.
  `from`/`to` are `{ lat, lng, name }`. `size` is the globe's diameter in
  px, `width`/`height` the box (default 1.3 x). `onPins` reports
  `[[x, y, facing], [x, y, facing]]` in px when the pins settle or move.
- `useFrameCost()`: `{ globe: { ms, fps, triangles, calls, backend, dpr, renderer, software } }`
  for the live scenes. `software` is true when the browser draws in
  software (SwiftShader, llvmpipe), which says nothing about a phone.

## The scenes

**Globe** (`scenes/Globe3D.jsx`). A 72 x 48 sphere with one shader: deep
navy sea lit from the top left, a fresnel rim, a faint graticule, and the
land as a matrix of soft dots. The dots are not geometry: `scenes/land.js`
builds a small table (one byte per 2 degree cell, rows sized by cos(lat))
from the Skia globe's coastlines in `arena/globeLand.js`, and the fragment
shader finds the cell under each pixel and draws an antialiased disc in it.
A blurred 256 x 128 mask from the same table tints the land faintly.
City lights are one `Points` (about 600, thick in the UK and Europe, from
`CLUSTERS` plus the UK and world city lists) with a twinkle and a limb fade.
Atmosphere: a back-face shell at 1.11 with a fresnel falloff, plus a wide
camera-facing halo quad. Pins: a sphere, a white core, an additive halo and
a ring that pulses outward; blue is you, red is them. The arc is a
`TubeGeometry` on a lifted great circle, revealed with `setDrawRange`, with
a wider additive glow tube and three sparks (one `Points`) running along it.
The intro is the Skia globe's: swing in over 3.4 s, pins at 2.9 s, the arc
draws from 3.3 s, sparks from 4.7 s. Dragging adds to the frame rotation
with inertia; with pins it eases back to the framing after a second.
About 15k triangles, 17 draw calls.

## Where it is applied

- Race lobby (`arena/RaceGlobe.jsx`): `Globe3D` when ready, else the Skia
  globe; the pin cards follow `onPins`.
- `/lush`, 3D tab (`lush/ThreeDemo.jsx`): the globe and the status card.
- The wallet keeps its flat coin image.

## Phone notes

- expo-gl draws at the device's pixel ratio (fiber forces it; a smaller
  canvas is the lever, there is no dpr cap on the phone).
- The environment map needs half-float render targets (WebGL 2 on expo-gl
  has them on current iOS and Android). If a device lacks them a scene
  still renders with the direct lights, duller.
- The GL view is transparent on iOS; on Android expo-gl's TextureView is
  made non-opaque, but check a device before relying on a glow under it.
