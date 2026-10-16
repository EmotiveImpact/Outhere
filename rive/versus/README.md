# Outhere 1v1 card (Rive)

`export/outhere-versus.riv` is the versus screen from the prototype's countdown (.vs9): the screen split on a diagonal, you on the blue side, them on the red, a slammed VS in the middle and the stakes along the bottom. Artboard `Versus`, state machine `Versus`, 390 x 844.

## What the app sets

Everything goes through the `Versus` view model, so one file serves every battle.

| Property | Type | What it is |
| --- | --- | --- |
| `youName`, `youCity`, `themName`, `themCity` | string | Names and areas; long names shrink to fit |
| `title`, `rule` | string | Top bar, for example `1V1 · REMATCH` and `24 hours · most steps` |
| `stake`, `prize`, `clock` | string | The three tiles |
| `youPhoto`, `themPhoto` | image | One photo per runner, any size |
| `youResult`, `themResult` | image | The shot each side swaps to when the result lands (see below) |
| `youHasPack` | boolean | Hides the Add your Fighter Pack pill |
| `win`, `lose`, `replay` | trigger | Play a result, or slam in again; set the result shots first |

The file fires `addPack` when the pill is tapped, so the app can open the Fighter Pack flow.

## Which photo to set

For each runner, in this order:

1. Their Fighter Pack VS shot.
2. Their profile photo.
3. The shadow runner for the gender they chose in onboarding or settings, lightly tinted blue on your side and red on theirs: `images/silhouette-{male,female}-{blue,red}.jpg`. Ship these four with the app.

The file embeds the male shadow runners (blue for you, red for them) as defaults, so it never shows an empty side. Each photo is scaled to cover its box whatever its size. The boxes are big, so each runner fills most of their side: yours fades out towards the bottom and theirs towards the top, melting into the wash colour so ordinary photos have no hard edges. `PHOTO_BOX` and `PHOTO_FADE` in `build.py` set both. Pack shots are cut out on black and drawn with a lighten blend, so their background disappears.

## The result

`win` and `lose` play the winner's moment: VS winds up and bursts, the screen flashes, WINNER slams in like the VS (white with a blue or red shadow) over two shock rings and a burst of sparks, the winner's name kicks and `+prize OUT` pops under it. LOSER drops in grey on the other side as it darkens, and the seam swings toward the loser. Then the winner's glow keeps breathing (`Win Glow` or `Lose Glow`).

Under the flash each side swaps to its result shot. Before firing the trigger, set:

- the winner's `…Result` to their pack's win shot (the celebration pose),
- the loser's `…Result` to their pack's respect shot,
- either one to the same image as its photo when the pack has no such shot, or there is no pack.

## Building

- `build.py` writes `scene.rml`. Edit `build.py`, not the RML.
- The shadow runners come from the Fighter Pack plan's grey runners in `/mnt/project-files/outhere-assets/ai-avatar/silhouette-{male,female}.jpg`. `tools/shade.py SOURCE male|female blue|red OUT.jpg` turns one into a fallback; rerun it for all four when a source changes.
- Fonts are Barlow Condensed (licence in `fonts/OFL.txt`); the ExtraBold Italic is cut down to the letters of VS, WINNER, LOSER and the prize (`VSWINERLOUT+0-9`).

```bash
python3 build.py
rive . --verify && rive inspect . --summary
rive . --once && cp build/outhere-versus.riv export/
rive . --screenshot=frame.png --advance=90
```

## Runtime notes

- A swapped image draws at its own pixel size unless it sits in a layout box, which is why each photo lives in a root-level `LayoutComponent` with `fit="cover"`. A layout box inside a node does not lay out, so the boxes are at the root and clipped by the same shapes as their sides.
- The fade inside a photo box does not follow a box that is moved or scaled, so results leave the photos where they are and move the seam instead.
- The web runtime ignores `fitFontSize`; the name boxes use `fit`.
