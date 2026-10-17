"""Writes scene.rml for the animated Outhere logo, in four artboards:

  Logo     the full intro: the O draws in, the dot lands with a ping and a glow,
           then the glow breathes. For larger uses.
  Small    the same intro without ping or glow, for sizes under about 48 px.
  Splash   the opening screen: the O lands, then UTHERE slides out of it, with
           OUT set larger than HERE.
  Loader   the O draws and undraws itself on a loop while the dot pulses.

The geometry is Outhere.logo() from the design system, weight A: on a 100 grid
the ring is 12 wide with round ends, the dot has radius 9 and sits 5 clear of
the ring ends, in a gap centred on the bottom right (45 degrees). Every
artboard is transparent; every intro fires `landed` as the dot lands.

Run `python3 build.py` after changing anything here, then `rive . --verify`.
Times are frames at 60fps.
"""
import itertools
import math
import pathlib

INK, BLUE = "FFF3F5F8", "FF4F9BFF"

# Easing, as in the design system tokens
EXPO = (0.16, 1, 0.3, 1)       # --ease-out-expo
THUMB = (0.34, 1.56, 0.64, 1)  # --ease-thumb, overshoots
GLIDE = (0.22, 1, 0.36, 1)     # --ease-glide
INOUT = (0.45, 0, 0.55, 1)
OUT = (0, 0, 0.58, 1)

X, Y, ROTATION, SX, SY, OPACITY = 13, 14, 15, 16, 17, 18
TRIM_START, TRIM_END, LETTER_SPACING = 114, 115, 390

ARC = 300 / 360            # the gap is 60 degrees, so the ring is 300
ROT = math.radians(165)    # Rive's ellipse path starts at the top; turn it to start at 75 degrees

_ids = itertools.count(10)


def nid():
    return f"0:{next(_ids)}"


def kf(value, frame, ease=None):
    """A keyframe. `ease` shapes the segment that leaves it; None holds."""
    if ease is None:
        return f'<KeyFrameDouble value="{value:.5f}" frame="{frame}" interpolationType="hold"/>'
    if ease == "linear":
        return f'<KeyFrameDouble value="{value:.5f}" frame="{frame}" interpolationType="linear"/>'
    x1, y1, x2, y2 = ease
    return (f'<KeyFrameDouble value="{value:.5f}" frame="{frame}" interpolationType="cubic">'
            f'<CubicEaseInterpolator x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"/></KeyFrameDouble>')


def prop(key, *frames):
    return f'<KeyedProperty propertyKey="{key}">' + "".join(frames) + "</KeyedProperty>"


def obj(oid, label, *props):
    return f"\n            <!-- {label} -->\n            <KeyedObject objectId=\"{oid}\">" + "".join(props) + "</KeyedObject>"


def callback(event_id, frame):
    return f'<KeyedObject objectId="{event_id}"><KeyedProperty propertyKey="395"><KeyFrameCallback frame="{frame}"/></KeyedProperty></KeyedObject>'


class Mark:
    """The O and its dot, drawn `size` px across and centred on (cx, cy)."""

    def __init__(self, size, cx, cy, glow=True):
        s = size / 100
        self.s, self.cx, self.cy, self.glow = s, cx, cy, glow
        self.r, self.w, self.d = 40 * s, 12 * s, 9 * s
        a = math.radians(45)
        self.dx, self.dy = cx + self.r * math.cos(a), cy + self.r * math.sin(a)
        self.ring, self.trim, self.dot, self.halo, self.ping = nid(), nid(), nid(), nid(), nid()

    def shapes(self):
        """First declared paints on top: dot, glow, ping, ring."""
        halo = 22 * self.s
        out = f'''
        <Shape x="{self.dx:.3f}" y="{self.dy:.3f}" name="Dot" id="{self.dot}">
            <Ellipse width="{2 * self.d:.3f}" height="{2 * self.d:.3f}" originX="0.5" originY="0.5" name="Path"/>
            <Fill name="Fill"><SolidColor colorValue="{BLUE}" name="Color"/></Fill>
        </Shape>'''
        if self.glow:
            out += f'''
        <Shape x="{self.dx:.3f}" y="{self.dy:.3f}" opacity="0.7" name="Dot Glow" id="{self.halo}">
            <Ellipse width="{2 * halo:.3f}" height="{2 * halo:.3f}" originX="0.5" originY="0.5" name="Path"/>
            <Fill name="Glow">
                <RadialGradient startX="0" startY="0" endX="{halo:.3f}" endY="0" name="Halo">
                    <GradientStop colorValue="CC4F9BFF" position="0"/>
                    <GradientStop colorValue="8C4F9BFF" position="0.41"/>
                    <GradientStop colorValue="2E4F9BFF" position="0.66"/>
                    <GradientStop colorValue="004F9BFF" position="1"/>
                </RadialGradient>
            </Fill>
        </Shape>
        <Shape x="{self.dx:.3f}" y="{self.dy:.3f}" opacity="0" name="Ping" id="{self.ping}">
            <Ellipse width="{2 * self.d:.3f}" height="{2 * self.d:.3f}" originX="0.5" originY="0.5" name="Path"/>
            <Stroke thickness="{max(1.5, 0.75 * self.s):.2f}" name="Stroke"><SolidColor colorValue="{BLUE}" name="Color"/></Stroke>
        </Shape>'''
        out += f'''
        <Shape x="{self.cx:.3f}" y="{self.cy:.3f}" rotation="{ROT:.6f}" name="Ring" id="{self.ring}">
            <Ellipse width="{2 * self.r:.3f}" height="{2 * self.r:.3f}" originX="0.5" originY="0.5" name="Path"/>
            <Stroke thickness="{self.w:.3f}" cap="round" join="round" name="Stroke">
                <SolidColor colorValue="{INK}" name="Color"/>
                <TrimPath start="0" end="{ARC:.6f}" offset="0" name="Draw" id="{self.trim}"/>
            </Stroke>
        </Shape>'''
        return out

    def intro(self, t=0, far=None):
        """The draw-in and landing, starting at frame t. Lands at t + 66."""
        far = 20 * self.s if far is None else far
        keys = [
            obj(self.trim, "ring draws on", prop(TRIM_END, kf(0, 0), kf(0, t, EXPO), kf(ARC, t + 90))),
            obj(self.ring, "ring sweeps round as it draws",
                prop(ROTATION, kf(ROT - math.radians(40), 0), kf(ROT - math.radians(40), t, EXPO), kf(ROT, t + 90)),
                prop(OPACITY, kf(0, 0), kf(0, t, OUT), kf(1, t + 6))),
            obj(self.dot, "dot arrives from out along the diagonal and settles in the gap",
                prop(X, kf(self.dx + far, 0), kf(self.dx + far, t + 36, GLIDE), kf(self.dx, t + 70)),
                prop(Y, kf(self.dy + far, 0), kf(self.dy + far, t + 36, GLIDE), kf(self.dy, t + 70)),
                prop(SX, kf(0.3, 0), kf(0.3, t + 36, THUMB), kf(1, t + 76)),
                prop(SY, kf(0.3, 0), kf(0.3, t + 36, THUMB), kf(1, t + 76)),
                prop(OPACITY, kf(0, 0), kf(0, t + 36, OUT), kf(1, t + 46))),
        ]
        if self.glow:
            keys += [
                obj(self.halo, "glow blooms on landing, then settles",
                    prop(OPACITY, kf(0, 0), kf(0, t + 60, OUT), kf(1, t + 76, INOUT), kf(0.7, t + 132)),
                    prop(SX, kf(0.55, 0), kf(0.55, t + 60, OUT), kf(1.3, t + 80, INOUT), kf(1, t + 132)),
                    prop(SY, kf(0.55, 0), kf(0.55, t + 60, OUT), kf(1.3, t + 80, INOUT), kf(1, t + 132))),
                obj(self.ping, "ping ring on landing",
                    prop(SX, kf(1, 0), kf(1, t + 66, OUT), kf(2.6, t + 114)),
                    prop(SY, kf(1, 0), kf(1, t + 66, OUT), kf(2.6, t + 114)),
                    prop(OPACITY, kf(0, 0), kf(0.7, t + 66, OUT), kf(0, t + 114))),
            ]
        return keys

    def breathe(self):
        return [
            obj(self.halo, "glow breathes",
                prop(OPACITY, kf(0.7, 0, INOUT), kf(1, 84, INOUT), kf(0.7, 168)),
                prop(SX, kf(1, 0, INOUT), kf(1.15, 84, INOUT), kf(1, 168)),
                prop(SY, kf(1, 0, INOUT), kf(1.15, 84, INOUT), kf(1, 168))),
            obj(self.dot, "dot breathes, barely",
                prop(SX, kf(1, 0, INOUT), kf(1.04, 84, INOUT), kf(1, 168)),
                prop(SY, kf(1, 0, INOUT), kf(1.04, 84, INOUT), kf(1, 168))),
        ]


def animation(name, duration, loop, keys):
    aid = nid()
    return aid, (f'\n        <LinearAnimation loopValue="{loop}" duration="{duration}" name="{name}" id="{aid}">'
                 + "".join(keys) + "\n        </LinearAnimation>")


def machine(name, first, then=None):
    """Plays `first`, then loops `then` if given."""
    sm, s1, s2 = nid(), nid(), nid()
    after = (f'<StateTransition stateToId="{s2}" enableExitTime="true" exitTimeIsPercetange="true" exitTime="100"/>'
             if then else "")
    second = f'<AnimationState x="400" y="0" animationId="{then}" id="{s2}"/>' if then else ""
    return sm, f'''
        <StateMachine name="{name}" id="{sm}">
            <StateMachineLayer name="Main" id="{nid()}">
                <EntryState x="0" y="0"><StateTransition stateToId="{s1}"/></EntryState>
                <AnimationState x="200" y="0" animationId="{first}" id="{s1}">{after}</AnimationState>
                {second}
            </StateMachineLayer>
        </StateMachine>'''


def artboard(name, w, h, x, body):
    sm, rest = body
    return f'''
    <Artboard defaultStateMachineId="{sm}" styleId="{nid_style(name)}" x="{x}" y="0" width="{w}" height="{h}" name="{name}">
        <LayoutComponentStyle name="Artboard Style" id="{STYLES[name]}"/>{rest}
    </Artboard>'''


STYLES = {}


def nid_style(name):
    STYLES[name] = nid()
    return STYLES[name]


# ---------------------------------------------------------------- Logo: 400 px mark, glow and ping
def logo():
    m = Mark(400, 240, 240)
    ev = nid()
    intro_id, intro = animation("Intro", 132, "oneShot", m.intro() + [callback(ev, 66)])
    idle_id, idle = animation("Idle", 168, "loop", m.breathe())
    sm, sm_xml = machine("Logo", intro_id, idle_id)
    return sm, f'''
        <!-- Fired when the dot lands, so the app can play a light haptic. -->
        <Event name="landed" id="{ev}"/>{m.shapes()}{sm_xml}{intro}{idle}'''


# ---------------------------------------------------------------- Small: no ping, no glow, no loop
def small():
    m = Mark(100, 60, 60, glow=False)
    ev = nid()
    intro_id, intro = animation("Intro", 90, "oneShot", m.intro(far=12) + [callback(ev, 66)])
    sm, sm_xml = machine("Small", intro_id)
    return sm, f'''
        <Event name="landed" id="{ev}"/>{m.shapes()}{sm_xml}{intro}'''


# ---------------------------------------------------------------- Splash: the O lands, then UTHERE
F = 205                              # font size of OUT
SMALL = 0.78                        # HERE is set smaller, so OUT leads
MARK = 0.74 * F                      # the inline wordmark: the mark stands in for the O
GAP, TRACK = 0.06 * F, 0.06          # .oh-word.inline; tracking is a share of each size
UT_W = (0.479 + 0.468 + 2 * TRACK) * F                    # advance widths from the font
HERE_W = (0.48 + 0.438 + 0.471 + 0.438 + 4 * TRACK) * SMALL * F
WORD_W = UT_W + HERE_W
SPLASH_W, SPLASH_H = 800, 260
LEFT = (SPLASH_W - (MARK + GAP + WORD_W)) / 2


def splash():
    m = Mark(MARK, LEFT + MARK / 2, SPLASH_H / 2)
    ev, word, style, small, clip = nid(), nid(), nid(), nid(), nid()
    tx = LEFT + MARK + GAP
    baseline = SPLASH_H / 2 + 0.35 * F       # cap height is 0.7 em, centred on the mark
    word_xml = f'''
        <Node x="{tx:.2f}" y="{baseline:.2f}" opacity="0" name="Word" id="{word}">
            <ClippingShape sourceId="{clip}" name="Reveal"/>
            <Text originValue="baseline" sizingValue="autoWidth" wrapValue="noWrap" name="UTHERE">
                <TextStylePaint fontSize="{F}" fontAssetId="0:3" familyName="Barlow Condensed" styleName="Bold"
                                letterSpacing="{TRACK * F:.2f}" name="Out Style" id="{style}">
                    <Fill name="Fill"><SolidColor colorValue="{INK}" name="Color"/></Fill>
                </TextStylePaint>
                <TextStylePaint fontSize="{SMALL * F:.2f}" fontAssetId="0:3" familyName="Barlow Condensed" styleName="Bold"
                                letterSpacing="{TRACK * SMALL * F:.2f}" name="Here Style" id="{small}">
                    <Fill name="Fill"><SolidColor colorValue="{INK}" name="Color"/></Fill>
                </TextStylePaint>
                <TextValueRun styleId="{style}" text="UT" name="Out"/>
                <TextValueRun styleId="{small}" text="HERE" name="Here"/>
            </Text>
        </Node>
        <!-- The word only shows to the right of the O, so it appears to slide out of it. -->
        <Shape x="{tx - 4:.2f}" y="0" name="Reveal Mask" id="{clip}">
            <Rectangle width="{SPLASH_W - tx + 4:.2f}" height="{SPLASH_H}" originX="0" originY="0" name="Path"/>
        </Shape>'''
    keys = m.intro() + [callback(ev, 66),
        obj(word, "UTHERE slides out of the O as the dot lands",
            prop(X, kf(tx - 0.9 * WORD_W, 0), kf(tx - 0.9 * WORD_W, 70, EXPO), kf(tx, 130)),
            prop(OPACITY, kf(0, 0), kf(0, 70, OUT), kf(1, 84))),
        obj(style, "tracking settles as it arrives",
            prop(LETTER_SPACING, kf(0.3 * F, 0), kf(0.3 * F, 70, EXPO), kf(TRACK * F, 140))),
        obj(small, "HERE settles with it",
            prop(LETTER_SPACING, kf(0.3 * SMALL * F, 0), kf(0.3 * SMALL * F, 70, EXPO), kf(TRACK * SMALL * F, 140)))]
    intro_id, intro = animation("Intro", 150, "oneShot", keys)
    idle_id, idle = animation("Idle", 168, "loop", m.breathe())
    sm, sm_xml = machine("Splash", intro_id, idle_id)
    return sm, f'''
        <Event name="landed" id="{ev}"/>{word_xml}{m.shapes()}{sm_xml}{intro}{idle}'''


# ---------------------------------------------------------------- Loader: the O draws and undraws
def loader():
    m = Mark(100, 60, 60, glow=False)
    keys = [
        # The ring stays still, so the gap and the dot never move; only the stroke runs round.
        obj(m.trim, "the end runs ahead, the start chases it",
            prop(TRIM_END, kf(0, 0, INOUT), kf(ARC, 54)),
            prop(TRIM_START, kf(0, 0), kf(0, 30, INOUT), kf(ARC, 84))),
        obj(m.dot, "the dot pulses while it waits",
            prop(SX, kf(1, 0, INOUT), kf(0.8, 42, INOUT), kf(1, 84)),
            prop(SY, kf(1, 0, INOUT), kf(0.8, 42, INOUT), kf(1, 84)),
            prop(OPACITY, kf(1, 0, INOUT), kf(0.6, 42, INOUT), kf(1, 84))),
    ]
    spin_id, spin = animation("Spin", 84, "loop", keys)
    sm, sm_xml = machine("Loader", spin_id)
    return sm, f"{m.shapes()}{sm_xml}{spin}"


rml = f'''<Rive version="1" kind="fragment">
    <!-- Generated by build.py. Edit that, not this. -->{artboard("Logo", 480, 480, 0, logo())}{artboard("Small", 120, 120, 540, small())}{artboard("Splash", SPLASH_W, SPLASH_H, 720, splash())}{artboard("Loader", 120, 120, 1580, loader())}

    <FontAsset file="fonts/BarlowCondensed-Bold-UTHERE.ttf" name="Barlow Condensed Bold" id="0:3"/>
</Rive>
'''

if __name__ == "__main__":
    pathlib.Path(__file__).with_name("scene.rml").write_text(rml)
