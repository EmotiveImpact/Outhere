# Outhere logo (Rive)

One file, `export/outhere-logo.riv`, with four artboards. Each has a state machine of the same name, a transparent background, and the design system's weight A mark (ring 12, dot 9, space 5, round ends).

| Artboard | Use | Motion |
| --- | --- | --- |
| `Logo` | Large uses, about 96 px and up | The O draws in, the blue out now dot lands with a ping and a glow (2.2 s), then the glow breathes on a 2.8 s loop |
| `Splash` | The opening screen | The same landing, then UTHERE slides out from behind the O and its letters close up (2.5 s), then the glow breathes |
| `Small` | Under about 48 px: app bar, notifications | The same intro without the ping or glow (1.5 s), then still |
| `Loader` | Waiting | The stroke runs round the O and away again while the dot pulses, on a 1.4 s loop. The gap never moves |

`Logo`, `Splash` and `Small` fire a `landed` event as the dot lands (1.1 s), so the app can play a light haptic.

- `build.py` writes `scene.rml`. Edit `build.py`, not the RML.
- `fonts/BarlowCondensed-Bold-UTHERE.ttf` is Barlow Condensed Bold cut down to the letters U, T, H, E and R, embedded in the file (licence in `fonts/OFL.txt`). The whole file is 11 KB.

```bash
python3 build.py
rive . --verify && rive inspect . --summary
rive . --once && cp build/outhere-logo.riv export/
rive . --artboard=Splash --screenshot=frame.png --advance=80   # one frame, 80 frames in
```

The glow is a radial gradient, not a `Feather`, so it draws on every runtime including the web canvas one. No scripts, so the unsigned build plays everywhere.
