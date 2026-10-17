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
| `ko` | boolean | Makes the next result a knockout (see below) |
| `intro` | enum `Intro` | Which intro opens the card: `strike` (the default), `tape`, `cinematic` or `letsRun` (see below) |
| `youLine`, `themLine` | string | The line under each name in the cinematic, for example `PECKHAM · 11.4K STEPS A DAY` |
| `tape1Label` … `tape5Label` | string | The tale of the tape's five row labels |
| `tape1You`, `tape1Them` … `tape5Them` | string | Each row's two numbers as shown, for example `11.4k` and `9.8k` |
| `tape1YouBar`, `tape1ThemBar` … `tape5ThemBar` | number | Each row's two bars, 0 to 1, as a share of the bigger number; the side at 1 leads |
| `win`, `lose`, `replay` | trigger | Play a result, or play the intro again; set the result shots first |

The file fires `addPack` when the pill is tapped, so the app can open the Fighter Pack flow.

## Which photo to set

For each runner, in this order:

1. Their Fighter Pack VS shot.
2. Their profile photo.
3. The shadow runner for the gender they chose in onboarding or settings, lightly tinted blue on your side and red on theirs: `images/silhouette-{male,female}-{blue,red}.jpg`. Ship these four with the app.

The file embeds the male shadow runners (blue for you, red for them) as defaults, so it never shows an empty side. Each photo is scaled to cover its box whatever its size. The boxes are big, so each runner fills most of their side: yours fades out towards the bottom and theirs towards the top, melting into the wash colour so ordinary photos have no hard edges. `PHOTO_BOX` and `PHOTO_FADE` in `build.py` set both. Pack shots are cut out on black and drawn with a lighten blend, so their background disappears.

## The intros

The card has four intros, and the app picks one per battle with `intro`, so each tells you what kind of battle it is before the card lands. Set `intro` before the card first plays, or set it and fire `replay`.

| `intro` | For | What plays |
| --- | --- | --- |
| `strike` | every everyday battle; the signature | `Strike In`, about 1.7 s |
| `tape` | a rematch, a battle with a stake, or a rival | `Tape In`, then the `Tape` layer, about 3.2 s |
| `cinematic` | the big ones: top of a leaderboard, a club derby, a grudge match | `Cinematic In`, about 3.9 s |
| `letsRun` | event battles, like launch nights and weekly city events | `Lets Run In`, about 4.1 s |

**Seam Strike.** Speed lines race along the seam, blue down your side and red up theirs, while the two halves scissor in along the seam from opposite ends. The seam ignites in a flare that throws sparks, the screen flashes and shakes, and VS slams with its ring. The names, top bar and stake tiles follow, and the Add your Fighter Pack pill waits until the card is up. Each side's wash runs `REACH` points past its outer edge so the scissor never opens a gap at the screen edges.

**Tale of the Tape.** The card comes up from black and VS slams first. At 1.5 s the names give way to the tape, which rises under VS row by row with its bars growing outwards, and stays on screen with the stake tiles; a shade darkens the lower half so it reads over the photos. Each row shows a label and both numbers, and each bar is the app's share of the bigger number; the side whose bar is full leads, its number bright in a glow that follows its digits, the other at half strength. The tape runs on its own state machine layer, `Tape`, and a result blends it away and brings the names back.

**Cinematic.** A slow push in on each runner in turn, full screen on their photo, with their name, a glowing bar and `youLine` or `themLine`. At 2.8 s a white flash cuts to the card as VS slams. Pack shots look best here.

**Let's Run.** Giant outlined names and areas stream across the screen behind two letterbox panels of the runners that wipe open, then the battle's `rule` shows and LET'S RUN slams with a shake. At 3 s a flash cuts to the card as VS slams.

The tape, cinematic and Let's Run land the card the same way (`land()` in `build.py`): the sides settle in from 80 points out while their seam edges hold still, so no gap opens along the seam, then the seam lights, VS slams with a shake and the names, top bar and tiles follow. `Slam In`, the original slide-in, is still in the file but no state plays it.

## The result

`win` and `lose` play the result from your side of the battle, in three beats.

1. **The hit.** VS winds up and bursts, the screen flashes and each side swaps to its result shot (below).
2. **Your outcome.** A win gets YOU WIN! in white with a blue shadow, over two sets of light rays, two shock rings, sparks and a bloom, while two confetti cannons fire from the bottom corners and a burst comes out of the headline. A loss gets YOU LOSE in grey: the letters drop one at a time like weights and the screen dims. A loss gets no confetti.
3. **The labels.** The headline clears and WINNER slams in on the winner's side (white with a blue or red shadow), the winner's name kicks and `+prize OUT` pops under it with a glint. LOSER drops in grey on the other side, the seam swings toward the loser and the winner's glow keeps breathing (`Win Glow` or `Lose Glow`).

The confetti runs on its own state machine layer, `Confetti`, so it keeps falling while the labels land: about a hundred pieces in white, ice blue, cyan, blue, violet and silver foil, each turning so its darker back shows and the foil flashes. Pieces near the camera are bigger and faster.

For a knockout, set `ko` to true before firing the trigger (our line: the winner has at least double the loser's steps). K.O. slams into the middle first with a red flash and a shake, and the loser's side of the screen cracks like glass: a white-hot impact point, uneven rays and rings, lit facets, two holes and shards falling out. K.O. then moves to the loser's corner in place of LOSER, and YOU WIN! or YOU LOSE follows as usual. Set `ko` back to false for an ordinary result.

Under the flash each side swaps to its result shot. Before firing the trigger, set:

- the winner's `…Result` to their pack's win shot (the celebration pose),
- the loser's `…Result` to their pack's respect shot,
- either one to the same image as its photo when the pack has no such shot, or there is no pack.

## Cues for sound and haptics

The file sends these events as an intro or a result plays. None of them changes the scene, so sounds and haptics can be added in the app later without touching the file.

| Event | When it fires |
| --- | --- |
| `strike` | the seam ignites (Seam Strike) |
| `cutIn` | each runner's cut-in starts (Cinematic, twice) |
| `letsRun` | LET'S RUN slams (Let's Run) |
| `slam` | VS slams, in every intro |
| `tape` | the names hand over to the tape (Tale of the Tape) |
| `impact` | VS bursts, on every result |
| `knockout` | K. lands |
| `shatter` | O. lands and the glass cracks |
| `youWin` | YOU WIN! lands |
| `confetti` | the cannons fire |
| `youLose` | YOU LOSE starts |
| `thud` | each letter of YOU LOSE lands (seven) |
| `winner` | WINNER lands |
| `loser` | LOSER drops (not on a knockout) |
| `prize` | the prize chip pops |
| `addPack` | the Add your Fighter Pack pill is tapped |

## Building

- `build.py` writes `scene.rml`. Edit `build.py`, not the RML.
- The shadow runners come from the Fighter Pack plan's grey runners in `/mnt/project-files/outhere-assets/ai-avatar/silhouette-{male,female}.jpg`. `tools/shade.py SOURCE male|female blue|red OUT.jpg` turns one into a fallback; rerun it for all four when a source changes.
- Fonts are Barlow Condensed (licence in `fonts/OFL.txt`). The ExtraBold Italic draws names in the cinematic and Let's Run, so it is cut down to Latin rather than a few letters: `pyftsubset BarlowCondensed-ExtraBoldItalic.ttf --unicodes="U+0020-007E,U+00A0-017F,U+2010-2044,U+20AC,U+2122"`.

```bash
python3 build.py
rive . --verify && rive inspect . --summary
rive . --once && cp build/outhere-versus.riv export/
rive . --screenshot=frame.png --advance=90
rive . --screenshot=tape.png --advance=200 --data=intro=tape        # another intro
rive . --screenshot=win.png --advance=60 --data=win=true            # a result
rive . --screenshot=ko.png --advance=40 --data=ko=true --data=lose=true  # a knockout
```

## Runtime notes

- A swapped image draws at its own pixel size unless it sits in a layout box, which is why each photo lives in a root-level `LayoutComponent` with `fit="cover"`. A layout box inside a node does not lay out, so the boxes are at the root and clipped by the same shapes as their sides.
- The fade inside a photo box does not follow a box that is moved or scaled, so results leave the photos where they are and move the seam instead.
- An image inside a layout box does scale when its own scale is keyed, which is how the cinematic and Let's Run push in on the photos.
- Rive has no text case, so names show as the app sends them.
- The web runtime ignores `fitFontSize`; the name boxes use `fit`.
