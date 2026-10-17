# The lush layer

Effects that sit on top of the finish kit. Each file here is one demo section
of `/lush` (Settings › The lush layer) and exports a default component that
takes `{ ready }` (Skia ready) and renders its own cards. Keep each section
self contained so they can be built in parallel.

- `ControlsDemo.jsx`: every button and control (takes no props; also the top of `/kit`)
- `ShadersDemo.jsx`: Skia shaders (sheen, aurora, shimmer, foil, liquid, city lights)
- `FeelDemo.jsx`: haptics and rolling numbers
- `ThreeDemo.jsx`: real 3D (globe, coin)
