# The finish kit

The prototype's finish (demo-v29.html, "round ten: the new finish" and the
`.oh-*` rules) as React Native pieces. Everything here is exported from
`@/components/ui`. Restyle screens with these rather than hand-rolling
gradients and shadows, so every screen gets the same light.

Live proof of every piece: open `/kit` in any build.

## Rules

- Dark only. Blue acts, red stops: never a red forward action.
- A ring only ever means membership (except the stories row). Blue dot bottom
  right is out now, red is just stopped.
- Medium (Inter 500) or SemiBold (600) for UI text, never Bold.
- No hover effects. Tappable things sink on a spring instead.
- **Top spacing.** The first control on a screen sits at
  `insets.top + TOP_GAP` (8). Use `useScreenTop()` or `<ScreenTop />`; never hard
  code a top offset. On the web the safe area polyfill reserves 14px for the
  status bar, so the same rule lands on the prototype's 22px (`.m-top`, `.fl`).
- **Bottom.** Tab screens leave `TAB_BAR_SPACE` at the bottom. The tab bar
  floats 14px from the sides at `useTabBarBottom()`.
- **Skia.** Never import `@shopify/react-native-skia` in a screen. On the web it
  must not load before CanvasKit (index.web.tsx loads it from `/canvaskit.wasm`).
  The kit keeps all Skia drawing in `skia/parts.jsx` and falls back to plain
  views until `useSkiaReady()` is true. Static canvases hand their WebGL context
  back after drawing (`STILL`), so many on one screen is fine.
- **Shadows.** Use `boxShadow` strings (the prototype's own values, in
  `FINISH`). React Native paints a view's inset shadow under its children, so
  split with `splitShadow()`: the outer part on the frame, the inset part on an
  overlay view above the body. Don't put an outer shadow on a view with
  `overflow: "hidden"`.
- **Icons on the web.** An icon after an absolutely positioned gradient paints
  under it on the web. Wrap it in a `<View>`.

## Tokens (tokens.js)

| Token | Prototype |
| --- | --- |
| `LIT` | `--lit` (#191d24 to #12151a) |
| `FINISH.litEdge` | `--lit-edge` |
| `FINISH.shadowCard` | `--shadow-card` |
| `FINISH.act`, `actStops`, `actShadow` | `--act-grad`, `.oh-btn.primary` |
| `FINISH.stop`, `stopShadow` | `.oh-btn.stop` |
| `FINISH.glass`, `glassEdge` | `.oh-btn.glass`, `.oh-chip.glass` |
| `FINISH.tile` | `.oh-tile` |
| `FINISH.slab`, `slabEdge` | `.oh-slab` |
| `FINISH.tabBar`, `tabBarEdge` | `.oh-tabbar` |
| `FINISH.bar`, `barStops` | `.oh-bar i` |
| `EASE.thumb`, `press`, `expo`, `glide` | `--ease-thumb`, `--ease-out-expo`, `--ease-glide` |
| `GLOWS` (glows.js) | every radial light, named after its CSS rule |
| `MASKS` (glows.js) | the `mask:radial-gradient(circle, ...)` stops |

## Pieces

**Surface** (`.oh-mat`, `.oh-press`, `.oh-spot`). The card body: lit gradient,
1px edge bright at the top, long soft shadow. With `onPress` it sinks to .955
and a blue light blooms where the finger lands.
`tone` lit | blue | glass | sunk, `radius`, `padding`, `onPress`,
`onLongPress`, `pressScale`, `touchGlow`, `shadow`, `style` (layout and size on
the outside, the rest lays out the content), `contentStyle`.
`Card` is a Surface (`highlight` = blue tone).

**IconTile** (`.oh-tile`, `.oh-nudge .ni`). The small lit icon square.
`icon`, `tone` blue | red | gold, `size`, `radius`, `iconSize`.

**GlowButton** (`.oh-btn`). `variant` primary | stop | quiet | glass | outline |
ghost (old names: secondary = quiet, danger = stop), `size` sm 36 | md 54 |
lg 58, `icon`, `iconRight`, `lead` (icon in its own circle, `.lead`), `full`,
`square`, `shine` (the sheen on a loop; on for primary), `loading`,
`disabled`. Every press sweeps the sheen across. `Button` is a GlowButton.
Style can still set `height`, `paddingHorizontal` and a flat `backgroundColor`.

**Meter** (`.oh-bar`). Recessed track, glowing gradient fill that eases to its
value, a band of light flowing along it. `value` 0 to 1, `size` sm 6 | md 10 |
lg 14 or px, `tone` blue | red | gold | grey, `flow`, `cap` (the bright end
dot), `glow`, `duration`, `track`. `ProgressBar` and OutsideKit's `Bar` are
Meters.

**TugBar** (`.oh-tug`). The 1v1 tug of war: blue from the left, red from the
right, white spark between. `share` (yours, 0 to 1), `height`.

**Segment** (`.seg`, `.r10thumb`). Lit track, act gradient thumb that springs
to the choice. Same props as before.

**BlendImage** (`.slab .obj`, `.orb img`, `.bal .c3d`). Objects and products
shot on black, with the black dropped out (Skia shader: lighten or screen) and
a round soft edge. No black boxes. `source`, `size` or `width`/`height` (or
fill its box), `mask` soft | wide | tight | burst | none | [inner, outer],
`mode` lighten | screen, `fit`, `zoom`, `rotate`, `focus`, `grey`, `dim`,
`float` (the 7s bob), `glow` (true or a px size: a breathing blue orb behind).

**GlowBackdrop** (`.slab`, `.oh-show`, `.hveil`, ...). Smooth, dithered radial
light. Fills its parent. `preset` (a `GLOWS` name), or `layers` and `base`,
`breathe`, `opacity`.

**Grain** (`.phone::after`, `.oh-slab::before`). Film grain. Fills its
parent. `amount` (.05 phone, .06 slab, .07 countdown). The root layout already
lays .05 over the whole app.

**PhotoBackground** (`.oh-slab.photo`). A photo darkened at the top, faded to
the floor, lit blue from below, with grain. Fills its parent. `source`, `fade`
slab | hero | card | soft | none | [[pos, alpha]], `to` (floor colour "r,g,b"),
`opacity`, `focus`, `kenBurns` (18s push in), `glow`, `grain`.

**Hero** and OutsideKit's **GlowHero** (`.oh-slab`). The screen slab: radial
light, rounded bottom (34), lit lower edge, grain. `photo` uses
PhotoBackground; `object` floats a BlendImage on the right (`objectSize`,
`objectStyle`; Hero also `objectLeft`). GlowHero's photos now show at full
strength by default (`photoOpacity` 1).

**VersusSplit** (`.vs9`, `.r10vsh`, `.r11fg`). Two fighters split by a slanted
cut with a glowing white seam, each lit from their edge in their colour and
faded to the floor. `left`/`right` { source, focus, tint, zoom }, `height`,
`split`, `slant` (.16 for `.r11fg`, .08 for `.r10vsh`), `seam`, `vs` (label or
null), `vsSize`, `fade`, `fadeFrom`, `animate` (slide in, seam lights), and
children laid over it.

**Spotlight** and **SpotlightNumber** (`.hype`). The countdown stage: veil,
warp rays and shock rings on every beat, GO floods blue, dark rim, grain.
Spotlight: `beat` (change it each count), `go`, `colour` (`hypeColour(n)`),
`photo`, `photoOpacity`, `centreY`, `grain`, children.
SpotlightNumber: `value`, `colour`, `size` (slams in from 2.4x with a ghost).

**TabBar** (`.oh-tabbar`). Frosted glass lit along the top, a blue bloom that
slides behind the active tab, glowing icon, white label, others at .55.
`items` [{ key, label, icon, render }], `current`, `onSelect`, `hidden`,
`floating`. The app's five tabs are in `components/AppTabBar.jsx`:
`TabsTabBar` for the tab navigator and `<StackTabBar current="outside" />` for
a pushed screen the prototype draws with a tab bar.

**Ring** / **Avatar** / **Dot**. Pro ring bright at the top left with a blue
glow, free a grey gradient line, black the travelling light. Photos get a
faint edge and a shaded bottom. The out-now dot glows and pings; red when just
stopped. Stories: thick bright blue ring that glows until watched.

**Layout** (layout.jsx). `TOP_GAP`, `SCREEN_TOP`, `TAB_BAR`, `useScreenTop`,
`useTabBarBottom`, `ScreenTop`, `useLayoutSize`.
