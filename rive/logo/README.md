# Outhere logo (Rive)

The open O draws in, then the blue out now dot arrives from outside and lands in the gap, with a ping and a glow bloom. After the 2.2 s intro the glow breathes on a 2.8 s loop.

- `build.py` writes `scene.rml`. Edit `build.py`, not the RML.
- `export/outhere-logo.riv` is the built file the apps load (artboard `Logo`, state machine `Logo`).

```bash
python3 build.py
rive . --verify && rive inspect . --summary
rive . --once && cp build/outhere-logo.riv export/
rive . --screenshot=frame.png --advance=80   # one frame, 80 frames in
```

The glow is a radial gradient, not a `Feather`, so it draws on every runtime including the web canvas one. No scripts, so the unsigned build plays everywhere.
