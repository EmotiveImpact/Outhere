"""Writes scene.rml for the Outhere 1v1 versus screen.

Layout follows the prototype's countdown screen (.vs9 in demo-v29): a phone
screen split on a diagonal, you on the blue side top left, them on the red
side bottom right, a slammed VS in the middle and the stakes along the bottom.

The app drives it through the `Versus` view model:
  youName, youCity, themName, themCity, title, rule   strings
  stake, prize, clock                                 strings for the three tiles
  youPhoto, themPhoto                                 images, any size, drawn to
                                                      cover their side. The app sets
                                                      the Fighter Pack shot, else the
                                                      profile photo, else the
                                                      silhouette for the runner's
                                                      gender. The file ships the male
                                                      silhouettes, blue for you and
                                                      red for them.
  youResult, themResult                               the shot that takes over when the
                                                      result lands: the pack's win shot
                                                      for the winner, its respect shot
                                                      for the loser. Without one, set
                                                      the same image as the photo.
  youHasPack                                          hides the Add your Fighter Pack pill
  ko                                                  set before win or lose for a
                                                      knockout (the winner has at least
                                                      double the loser's steps): K.O.
                                                      lands first and shatters the
                                                      loser's side
  win, lose, replay                                   triggers; set the result shots first
and listens for the `addPack` event (the pill was tapped).

A result plays in beats. The VS bursts and the split swings toward the
loser. YOU WIN! slams in with a sunburst and confetti, or YOU LOSE drops in
letter by letter. Then it clears, and WINNER, LOSER and the prize land on
the two sides. A knockout puts K.O. and the broken glass first.

Cue events for sounds and haptics, in the order they fire: impact,
knockout, shatter, youWin, confetti, youLose, thud (each YOU LOSE letter
landing), winner, loser, prize.

Run `python3 build.py`, then `rive . --verify && rive inspect . --summary`.
Times are frames at 60fps.
"""
import itertools
import math
import pathlib
import random

W, H = 390, 844
TOP, BOT = W * 0.66, W * 0.34          # where the split meets the top and bottom edges
SEAM_ANGLE = math.atan2(TOP - BOT, H)  # radians, top leans right
MID = (TOP + BOT) / 2 + (TOP - BOT) * (0.5 - 388 / H), 388  # VS sits on the seam
SHIFT = 72                             # how far the split moves toward the loser

WHITE, OUT, BLUE_HI, ACT = "FFFFFFFF", "FF4F9BFF", "FF82B4FF", "FF2A6AF0"

EASE_SIDE = (0.2, 0.9, 0.2, 1)
SLAM = (0.2, 1.4, 0.4, 1)
THUMB = (0.34, 1.56, 0.64, 1)
OUT_EASE = (0, 0, 0.58, 1)
INOUT = (0.45, 0, 0.55, 1)
SHOCK = (0.1, 0.7, 0.3, 1)
IN_EASE = (0.42, 0, 1, 1)
GRAV = (0.55, 0, 1, 1)                 # falls away, faster and faster
QUAD_IN = (0.333, 0, 0.667, 0.333)     # a fall from rest that reaches full speed
DROP = (0.55, 0, 0.95, 0.6)            # a heavy letter dropping
ZOOM = (0.5, 0, 0.85, 0.6)             # rushing past the camera
LAUNCH_X = (0.25, 0.6, 0.4, 1)         # confetti thrown out and slowed by the air
LAUNCH_Y = (0.1, 0.8, 0.25, 1)

X, Y, ROT, SX, SY, OPACITY, VX = 13, 14, 15, 16, 17, 18, 24
COLOUR, TRIM_END, FIRE = 37, 115, 395

_ids = itertools.count(100)


def nid():
    return f"0:{next(_ids)}"


# ---------------------------------------------------------------- keyframes

def kf(value, frame, ease=None):
    if ease is None:
        return f'<KeyFrameDouble value="{value:.4f}" frame="{frame}" interpolationType="hold"/>'
    if ease == "linear":
        return f'<KeyFrameDouble value="{value:.4f}" frame="{frame}" interpolationType="linear"/>'
    x1, y1, x2, y2 = ease
    return (f'<KeyFrameDouble value="{value:.4f}" frame="{frame}" interpolationType="cubic">'
            f'<CubicEaseInterpolator x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"/></KeyFrameDouble>')


def kfc(colour, frame):
    return f'<KeyFrameColor value="{colour}" frame="{frame}" interpolationType="hold"/>'


def prop(key, *frames):
    return f'<KeyedProperty propertyKey="{key}">' + "".join(frames) + "</KeyedProperty>"


def keyed(oid, *props):
    return f'<KeyedObject objectId="{oid}">' + "".join(props) + "</KeyedObject>"


ANIMS = {}
RESTS = []   # (object, property, value) for everything a result moves, filled in below


class Timeline:
    """One animation: a track per object and property, the last write wins."""

    def __init__(self, name, duration, loop="oneShot"):
        self.name, self.duration, self.loop = name, duration, loop
        self.tracks = {}

    def key(self, oid, key, *frames):
        self.tracks[(oid, key)] = list(frames)

    def path(self, oid, key, points):
        """(frame, value, ease to the next point) in order; the first value holds from frame 0."""
        f0, v0, _ = points[0]
        frames = [kf(v0, 0)] if f0 > 0 else []
        frames += [kf(v, f, e) for f, v, e in points]
        self.tracks[(oid, key)] = frames

    def tween(self, oid, key, a, b, f0, f1, ease):
        self.path(oid, key, [(f0, a, ease), (f1, b, None)])

    def fire(self, event, frame):
        self.tracks.setdefault((event, FIRE), []).append((frame, f'<KeyFrameCallback frame="{frame}"/>'))

    def rest(self):
        """Puts everything a result moves back where it starts, unless keyed here."""
        for oid, key, value in RESTS:
            self.tracks.setdefault((oid, key), [kf(value, 0)])

    def xml(self):
        aid = nid()
        ANIMS[self.name] = aid
        objects = {}
        for (oid, key), frames in self.tracks.items():
            if key == FIRE:
                frames = [x for _, x in sorted(frames)]
            objects.setdefault(oid, []).append(prop(key, *frames))
        body = "".join(keyed(oid, *ps) for oid, ps in objects.items())
        return (f'<LinearAnimation loopValue="{self.loop}" duration="{self.duration}" name="{self.name}" id="{aid}">'
                f'{body}</LinearAnimation>')


# ---------------------------------------------------------------- view model

VM = "0:40"
props = {}
instance_values = []


def vm_prop(kind, name, value=None):
    pid = nid()
    props[name] = (kind, pid)
    if kind == "String":
        instance_values.append(f'<ViewModelInstanceString propertyValue="{value}" viewModelPropertyId="{pid}"/>')
    elif kind == "Boolean":
        instance_values.append(f'<ViewModelInstanceBoolean propertyValue="{value}" viewModelPropertyId="{pid}"/>')
    elif kind == "AssetImage":
        instance_values.append(f'<ViewModelInstanceAssetImage propertyValue="{value}" viewModelPropertyId="{pid}"/>')
    elif kind == "Trigger":
        instance_values.append(f'<ViewModelInstanceTrigger viewModelPropertyId="{pid}"/>')
    return pid


SIL_YOU, SIL_THEM = "0:60", "0:64"
FONT_BOLD, FONT_VS, FONT_MED = "0:61", "0:62", "0:63"

for name, val in [("youName", "Alex"), ("youCity", "Peckham"), ("themName", "Kemi"), ("themCity", "Brixton"),
                  ("title", "1V1 · REMATCH"), ("rule", "24 hours · most steps"),
                  ("stake", "50"), ("prize", "100"), ("clock", "24h")]:
    vm_prop("String", name, val)
vm_prop("AssetImage", "youPhoto", SIL_YOU)
vm_prop("AssetImage", "themPhoto", SIL_THEM)
vm_prop("AssetImage", "youResult", SIL_YOU)
vm_prop("AssetImage", "themResult", SIL_THEM)
vm_prop("Boolean", "youHasPack", "false")
vm_prop("Boolean", "ko", "false")
for t in ("win", "lose", "replay"):
    vm_prop("Trigger", t)


def path(name):
    return f"{VM}-{props[name][1]}"


def bind_text(name):
    return f'<DataBindContext sourcePathIds="{path(name)}" propertyKey="268"/>'


# ---------------------------------------------------------------- events
# Cues for the app's sounds and haptics; none of them changes the scene.

EVENTS = {name: nid() for name in ("addPack", "impact", "knockout", "shatter", "youWin", "confetti",
                                   "youLose", "thud", "winner", "loser", "prize")}

# ---------------------------------------------------------------- drawing helpers

def text(x, y, size, font, colour, value, bind=None, origin=(0, 0), spacing=0, oid=None, opacity=1, name="Text", fit=None):
    sid = nid()
    oid = oid or nid()
    b = bind_text(bind) if bind else ""
    family, style = {FONT_BOLD: ("Barlow Condensed", "Bold"), FONT_VS: ("Barlow Condensed", "ExtraBold Italic"),
                     FONT_MED: ("Barlow Condensed", "Medium")}[font]
    if fit:  # a fixed box the text shrinks to fit, aligned to the side it is anchored on
        align = "right" if origin[0] == 1 else "left"
        sizing = (f'sizingValue="fixed" width="{fit[0]}" height="{fit[1]}" overflowValue="fit" '
                  f'alignValue="{align}" verticalAlignValue="bottom"')
    else:
        sizing = 'sizingValue="autoWidth"'
    return (f'<Text x="{x:.2f}" y="{y:.2f}" originX="{origin[0]}" originY="{origin[1]}" {sizing} '
            f'wrapValue="noWrap" opacity="{opacity}" name="{name}" id="{oid}">'
            f'<TextStylePaint fontSize="{size}" fontAssetId="{font}" familyName="{family}" styleName="{style}" '
            f'letterSpacing="{spacing}" name="Style" id="{sid}">'
            f'<Fill name="Fill"><SolidColor colorValue="{colour}" name="C"/></Fill></TextStylePaint>'
            f'<TextValueRun styleId="{sid}" text="{value}" name="Run">{b}</TextValueRun></Text>')


def poly(points, oid, ids=None):
    vs = []
    for i, (px, py) in enumerate(points):
        vid = f' id="{ids[i]}"' if ids and ids[i] else ""
        vs.append(f'<StraightVertex x="{px:.2f}" y="{py:.2f}"{vid}/>')
    return f'<PointsPath isClosed="true" isClockwise="true" name="Path" id="{oid}">' + "".join(vs) + "</PointsPath>"


def open_path(pts, name="Line"):
    vs = "".join(f'<StraightVertex x="{x:.1f}" y="{y:.1f}"/>' for x, y in pts)
    return f'<PointsPath isClosed="false" name="{name}">{vs}</PointsPath>'


def closed_path(pts, name="Path"):
    vs = "".join(f'<StraightVertex x="{x:.1f}" y="{y:.1f}"/>' for x, y in pts)
    return f'<PointsPath isClosed="true" name="{name}">{vs}</PointsPath>'


def glow(oid, size, rgb, a0="99", a1="33", opacity=0, scale_y=1, name="Glow", blend="srcOver"):
    """A soft radial bloom that fades to nothing at its edge."""
    r = size / 2
    return f'''
            <Shape opacity="{opacity}" scaleY="{scale_y}" blendModeValue="{blend}" name="{name}" id="{oid}">
                <Ellipse width="{size}" height="{size}" originX="0.5" originY="0.5" name="Path"/>
                <Fill name="Fill"><RadialGradient startX="0" startY="0" endX="{r}" endY="0" name="G">
                    <GradientStop colorValue="{a0}{rgb}" position="0"/><GradientStop colorValue="{a1}{rgb}" position="0.45"/><GradientStop colorValue="00{rgb}" position="1"/>
                </RadialGradient></Fill>
            </Shape>'''


def flash(oid, size, rgb, name="Flash"):
    r = size / 2
    return f'''
            <Shape opacity="0" name="{name}" id="{oid}">
                <Ellipse width="{size}" height="{size}" originX="0.5" originY="0.5" name="Path"/>
                <Fill name="Fill"><RadialGradient startX="0" startY="0" endX="{r}" endY="0" name="G">
                    <GradientStop colorValue="F2FFFFFF" position="0"/><GradientStop colorValue="66{rgb}" position="0.3"/><GradientStop colorValue="00{rgb}" position="0.65"/>
                </RadialGradient></Fill>
            </Shape>'''


def ring(oid, size, crisp, halo_rgb=None, name="Ring"):
    """A shock ring: a soft halo under a crisp line (within a shape the last paint is on top)."""
    halo = f'<Stroke thickness="16" name="Halo"><SolidColor colorValue="44{halo_rgb}" name="C"/></Stroke>' if halo_rgb else ""
    return f'''
            <Shape opacity="0" name="{name}" id="{oid}">
                <Ellipse width="{size}" height="{size}" originX="0.5" originY="0.5" name="Path"/>
                {halo}
                <Stroke thickness="{crisp[0]}" name="Crisp"><SolidColor colorValue="{crisp[1]}" name="C"/></Stroke>
            </Shape>'''


def streaks(n, rgb, long=40, short=26):
    """Sparks: n streaks around a point, each in its own turned node, flying out along it."""
    xml, bars = "", []
    for i in range(n):
        node, bar = nid(), nid()
        bars.append(bar)
        ang = 2 * math.pi * i / n + (0.12 if i % 2 else 0)
        colour = WHITE if i % 2 else f"FF{rgb}"
        length = short if i % 3 else long
        xml += f'''
                <Node rotation="{ang:.4f}" name="Spark {i + 1}" id="{node}">
                    <Shape opacity="0" name="Streak" id="{bar}">
                        <Rectangle width="{length}" height="4" originX="0" originY="0.5" cornerRadiusTL="2" name="Path"/>
                        <Fill name="Fill"><LinearGradient startX="0" startY="0" endX="{length}" endY="0" name="G">
                            <GradientStop colorValue="00{colour[2:]}" position="0"/><GradientStop colorValue="{colour}" position="1"/></LinearGradient></Fill>
                    </Shape>
                </Node>'''
    return xml, bars


def sunburst(oid, rays, half, radius, beam, core=None, name="Rays", offset=0.0):
    """Beams of light from the centre that fade toward their tips, each with a
    brighter core down its middle. They screen over the scene, so they add light."""
    def layer(width, stops, label):
        paths = ""
        for i in range(rays):
            a = 2 * math.pi * i / rays + offset
            paths += poly([(0, 0), (radius * math.cos(a - width), radius * math.sin(a - width)),
                           (radius * math.cos(a + width), radius * math.sin(a + width))], nid())
        st = "".join(f'<GradientStop colorValue="{c}" position="{p}"/>' for p, c in stops)
        return f'''
                <Shape blendModeValue="screen" name="{label}">{paths}
                    <Fill name="Fill"><RadialGradient startX="0" startY="0" endX="{radius}" endY="0" name="G">{st}</RadialGradient></Fill>
                </Shape>'''
    return f'''
            <Node opacity="0" name="{name}" id="{oid}">{layer(half * 0.35, core, "Core") if core else ""}{layer(half, beam, "Beam")}
            </Node>'''


def twinkle(oid, x, y, r):
    """A four-point star with a small bloom, hidden at scale 0."""
    pts = [((r if k % 2 == 0 else r * 0.2) * math.cos(k * math.pi / 4 - math.pi / 2),
            (r if k % 2 == 0 else r * 0.2) * math.sin(k * math.pi / 4 - math.pi / 2)) for k in range(8)]
    return f'''
                <Node x="{x}" y="{y}" scaleX="0" scaleY="0" name="Twinkle" id="{oid}">
                    <Shape name="Star">{poly(pts, nid())}<Fill name="Fill"><SolidColor colorValue="{WHITE}" name="C"/></Fill></Shape>
                    <Shape name="Bloom">
                        <Ellipse width="{r * 2.6:.1f}" height="{r * 2.6:.1f}" originX="0.5" originY="0.5" name="Path"/>
                        <Fill name="Fill"><RadialGradient startX="0" startY="0" endX="{r * 1.3:.1f}" endY="0" name="G">
                            <GradientStop colorValue="B382B4FF" position="0"/><GradientStop colorValue="0082B4FF" position="1"/></RadialGradient></Fill>
                    </Shape>
                </Node>'''


# Advance widths and kerning of the display face, in ems, from the font.
ADV = {"Y": .477, "O": .464, "U": .466, " ": .194, "W": .685, "I": .228, "N": .506, "!": .281,
       "L": .423, "S": .441, "E": .428, "K": .49, ".": .228}
KERN = {("Y", "O"): -.027, ("L", "O"): -.004, ("S", "E"): -.001, ("K", "."): .003, ("O", "."): -.001}


def letters(word, size, tracking):
    """Each letter of a line of text with its centre x and advance, the line centred on 0."""
    x, out = 0.0, []
    for i, ch in enumerate(word):
        adv = ADV[ch] * size
        out.append([ch, x + adv / 2, adv])
        if i + 1 < len(word):
            x += adv + tracking + KERN.get((ch, word[i + 1]), 0) * size
        else:
            x += adv
    for o in out:
        o[1] -= x / 2
    return out


# ---------------------------------------------------------------- the sides

WASH = {  # each side's colour wash: start point, end point, start colour, end colour
    "you": ((120, 0), (250, 600), "0B2A66", "050A16"),
    "them": ((270, 844), (140, 244), "5A1218", "12060A"),
}


def wash_colour(who, x, y):
    """The wash's colour at (x, y), so a photo's fade can melt into it."""
    (sx, sy), (ex, ey), c0, c1 = WASH[who]
    dx, dy = ex - sx, ey - sy
    t = min(1, max(0, ((x - sx) * dx + (y - sy) * dy) / (dx * dx + dy * dy)))
    a, b = bytes.fromhex(c0), bytes.fromhex(c1)
    return "".join(f"{round(p + (q - p) * t):02X}" for p, q in zip(a, b))


# Each runner's photo box (x, y, width, height), about the shape of a pack shot.
# Big enough that the runner fills their side: yours runs from the top of the
# screen, theirs to the bottom, and they overlap behind the seam.
# Each runner is centred in the open part of their side, away from the seam.
PHOTO_BOX = {"you": (-78, 0, 372, 664), "them": (100, 180, 372, 664)}
# Where each photo melts into the wash (position down the box, opacity of the
# wash on top). Yours fades out a long way at the bottom; theirs only softens its top edge, so their head shows.
PHOTO_FADE = {
    "you": [(0, 0.55), (0.12, 0), (0.34, 0), (0.68, 0.85), (0.82, 1), (1, 1)],
    "them": [(0, 1), (0.03, 0.55), (0.1, 0), (0.86, 0), (1, 0.6)],
}


def side(who):
    """One half of the split: its clip and colour wash, plus its photo box.

    The photo sits in a layout box at the root so Rive scales any image to
    cover it; a layout box inside a node does not lay out. The box is clipped
    by the same shape as the wash, and its x is keyed alongside the group's.
    """
    you = who == "you"
    group, clip, content, photo, style, dim, shot = nid(), nid(), nid(), nid(), nid(), nid(), nid()
    v = [nid(), nid()]   # the two vertices on the seam, animated for win and lose
    if you:
        pts, vids = [(0, 0), (TOP, 0), (BOT, H), (0, H)], [None, v[0], v[1], None]
    else:
        pts, vids = [(TOP, 0), (W, 0), (W, H), (BOT, H)], [v[0], None, None, v[1]]
    (sx, sy), (ex, ey), c0, c1 = WASH[who]
    grad = (f'<LinearGradient startX="{sx}" startY="{sy}" endX="{ex}" endY="{ey}" name="Wash">'
            f'<GradientStop colorValue="FF{c0}" position="0"/><GradientStop colorValue="FF{c1}" position="1"/></LinearGradient>')
    bx, by, bw, bh = PHOTO_BOX[who]
    stops = "".join(f'<GradientStop colorValue="{round(a * 255):02X}{wash_colour(who, bx + bw / 2, by + pos * bh)}" position="{pos}"/>'
                    for pos, a in PHOTO_FADE[who])
    xml = f'''
        <Node name="{"You" if you else "Them"}" id="{group}">
            <Shape name="{"You" if you else "Them"} Clip" id="{clip}">
                {poly(pts, nid(), vids)}
            </Shape>
            <Node name="{"You" if you else "Them"} Content" id="{content}">
                <ClippingShape sourceId="{clip}" name="Clip"/>
                <Shape name="Wash">
                    <Rectangle width="{W}" height="{H}" originX="0" originY="0" name="Path"/>
                    <Fill name="Fill">{grad}</Fill>
                </Shape>
            </Node>
        </Node>'''
    def box(oid, sid, bind, name, opacity=1):
        return f'''
        <LayoutComponent width="{bw}" height="{bh}" clip="true" opacity="{opacity}" styleId="{sid}" name="{name}" id="{oid}">
            <LayoutComponentStyle layoutWidthScaleType="fixed" layoutHeightScaleType="fixed" positionTypeValue="absolute"
                positionLeft="{bx}" positionLeftUnitsValue="points" positionTop="{by}" positionTopUnitsValue="points" name="Box" id="{sid}"/>
            <ClippingShape sourceId="{clip}" name="Clip"/>
            <!-- Melts the top and bottom of the photo into the wash, so any photo,
                 a pack shot or an ordinary profile photo, has no hard edges. -->
            <Shape name="Edge Fade">
                <Rectangle width="{bw}" height="{bh}" originX="0" originY="0" name="Path"/>
                <Fill name="Fill"><LinearGradient startX="0" startY="0" endX="0" endY="{bh}" name="G">{stops}</LinearGradient></Fill>
            </Shape>
            <Image assetId="{SIL_YOU if you else SIL_THEM}" fit="cover" alignmentX="0" alignmentY="-0.64" blendModeValue="lighten" name="Photo">
                <LayoutParticipant layoutWidthScaleType="fill" layoutHeightScaleType="fill" name="Fill"/>
                <DataBindContext sourcePathIds="{path(bind)}" propertyKey="206"/>
            </Image>
        </LayoutComponent>'''

    who_name = "You" if you else "Them"
    # The result shot sits over the photo, hidden until the result lands.
    photo_xml = (box(shot, nid(), who + "Result", f"{who_name} Result", opacity=0)
                 + box(photo, style, who + "Photo", f"{who_name} Photo"))
    # The loser's side darkens under this, photo and wash together, so the
    # photo's faded edges still match the wash behind them.
    photo_xml = f'''
        <Node name="{"You" if you else "Them"} Dim">
            <ClippingShape sourceId="{clip}" name="Clip"/>
            <Shape opacity="0" name="Dim" id="{dim}">
                <Rectangle width="{W + 2 * SHIFT}" height="{H}" x="{-SHIFT}" originX="0" originY="0" name="Path"/>
                <Fill name="Fill"><SolidColor colorValue="FF000000" name="C"/></Fill>
            </Shape>
        </Node>''' + photo_xml
    return xml, photo_xml, dict(group=group, clip=clip, content=content, v=v, photo=photo, dim=dim, shot=shot)


you_xml, you_photo_xml, YOU = side("you")
them_xml, them_photo_xml, THEM = side("them")

# ---------------------------------------------------------------- seam, VS, names, tiles

SEAM, SEAM_GLOW = nid(), nid()
seam_xml = f'''
        <Node x="{(TOP + BOT) / 2:.2f}" y="{H / 2}" rotation="{SEAM_ANGLE:.5f}" name="Seam" id="{SEAM}">
            <Shape name="Seam Glow" id="{SEAM_GLOW}">
                <Rectangle width="26" height="{H * 1.2:.0f}" originX="0.5" originY="0.5" name="Path"/>
                <Fill name="Fill"><LinearGradient startX="-13" startY="0" endX="13" endY="0" name="G">
                    <GradientStop colorValue="0082B4FF" position="0"/><GradientStop colorValue="6682B4FF" position="0.5"/><GradientStop colorValue="0082B4FF" position="1"/>
                </LinearGradient></Fill>
            </Shape>
            <Shape name="Seam Line">
                <Rectangle width="3" height="{H * 1.2:.0f}" originX="0.5" originY="0.5" name="Path"/>
                <Fill name="Fill"><LinearGradient startX="0" startY="{-H * 0.6:.0f}" endX="0" endY="{H * 0.6:.0f}" name="G">
                    <GradientStop colorValue="00FFFFFF" position="0"/><GradientStop colorValue="FFFFFFFF" position="0.3"/>
                    <GradientStop colorValue="FFFFFFFF" position="0.7"/><GradientStop colorValue="00FFFFFF" position="1"/>
                </LinearGradient></Fill>
            </Shape>
        </Node>'''

VSG, FLASH, RING, VSTEXT, VSGLOW = nid(), nid(), nid(), nid(), nid()
vs_xml = f'''
        <Node x="{MID[0]:.2f}" y="{MID[1]}" name="Middle" id="{VSG}">
            <Node name="VS" id="{VSTEXT}">
                {text(0, 0, 118, FONT_VS, WHITE, "VS", origin=(0.5, 0.5), spacing=-2, name="VS Face")}
                {text(0, 6, 118, FONT_VS, "FF1F62FF", "VS", origin=(0.5, 0.5), spacing=-2, name="VS Shadow")}
            </Node>
            {glow(VSGLOW, 300, "82B4FF", a0="73", a1="26", opacity=1, name="VS Glow")}
            {ring(RING, 120, (3, WHITE), "82B4FF", name="Shock Ring")}
            {flash(FLASH, 340, "82B4FF")}
        </Node>'''


# ---------------------------------------------------------------- WINNER, LOSER and the prize
# After the headline clears, WINNER slams in on the winner's side over a
# flash, two shock rings and a burst of sparks, the prize pops under the
# winner's name, and LOSER drops in heavy and grey on the other side.

HIT_SIZE, LOSER_SIZE = 84, 46
HIT_W = 2.82 * HIT_SIZE              # advance width of WINNER, from the font
LOSER_W = 2.223 * LOSER_SIZE
SIDE_INK = {"you": ("FF1F62FF", "82B4FF", "FF2A6AF0", "FF1A47C2"),   # shadow, glow, chip top, chip bottom
            "them": ("FFD7263A", "FF6670", "FFE5404C", "FFA0182A")}
SPARKS = 16
CHIP_W = 3.189 * 26 + 28
GLINT_FROM, GLINT_TO = -(CHIP_W / 2 + 24), CHIP_W / 2 + 24


def hit(who):
    """The winner's label on one side, and LOSER: ids for the animation, and the xml."""
    you = who == "you"
    who_name = "You" if you else "Them"
    shadow, glow_rgb, chip_top, chip_bot = SIDE_INK[who]
    ids = dict(word=nid(), glow=nid(), flash=nid(), rings=(nid(), nid()), chip=nid(), loser=nid(), glint=nid())
    cx = 16 + HIT_W / 2 if you else W - 16 - HIT_W / 2
    # yours sits under your name and prize, clear of the face in a win shot;
    # theirs sits above their name, over the chest
    cy = 452 if you else 508
    sparks, ids["sparks"] = streaks(SPARKS, glow_rgb)
    word = f'''
        <Node x="{cx:.2f}" y="{cy}" rotation="-0.05" name="{who_name} Win">
            <Node opacity="0" name="Winner" id="{ids["word"]}">
                {text(0, 0, HIT_SIZE, FONT_VS, WHITE, "WINNER", origin=(0.5, 0.5), spacing=-1, name="Winner Face")}
                {text(0, 5, HIT_SIZE, FONT_VS, shadow, "WINNER", origin=(0.5, 0.5), spacing=-1, name="Winner Shadow")}
            </Node>
            <Node scaleX="1.7" scaleY="0.8" name="Sparks">{sparks}
            </Node>
            {glow(ids["glow"], 440, glow_rgb, scale_y=0.5)}
            {ring(ids["rings"][0], 160, (3, WHITE), glow_rgb)}
            {ring(ids["rings"][1], 160, (2, f"CC{glow_rgb}"), name="Ring 2")}
            {flash(ids["flash"], 460, glow_rgb)}
        </Node>'''
    # The prize, under the winner's name and city, with a glint that sweeps it.
    chip_x = 18 + CHIP_W / 2 if you else W - 18 - CHIP_W / 2
    chip_y = 372 if you else 628
    sid, chip_shape = nid(), nid()
    chip = f'''
        <Node x="{chip_x:.2f}" y="{chip_y}" opacity="0" name="{who_name} Prize" id="{ids["chip"]}">
            <Text originX="0.5" originY="0.5" sizingValue="autoWidth" wrapValue="noWrap" name="Prize">
                <TextStylePaint fontSize="26" fontAssetId="{FONT_VS}" familyName="Barlow Condensed" styleName="ExtraBold Italic" name="Style" id="{sid}">
                    <Fill name="Fill"><SolidColor colorValue="{WHITE}" name="C"/></Fill></TextStylePaint>
                <TextValueRun styleId="{sid}" text="+" name="Plus"/>
                <TextValueRun styleId="{sid}" text="100" name="Amount">{bind_text("prize")}</TextValueRun>
                <TextValueRun styleId="{sid}" text=" OUT" name="Unit"/>
            </Text>
            <Node name="Shine">
                <ClippingShape sourceId="{chip_shape}" name="Clip"/>
                <Shape x="{GLINT_FROM:.2f}" rotation="0.4" name="Glint" id="{ids["glint"]}">
                    <Rectangle width="22" height="70" originX="0.5" originY="0.5" name="Path"/>
                    <Fill name="Fill"><LinearGradient startX="-11" startY="0" endX="11" endY="0" name="G">
                        <GradientStop colorValue="00FFFFFF" position="0"/><GradientStop colorValue="C0FFFFFF" position="0.5"/><GradientStop colorValue="00FFFFFF" position="1"/>
                    </LinearGradient></Fill>
                </Shape>
            </Node>
            <Shape name="Chip" id="{chip_shape}">
                <Rectangle width="{CHIP_W:.2f}" height="38" originX="0.5" originY="0.5" cornerRadiusTL="19" name="Path"/>
                <Fill name="Fill"><LinearGradient startX="0" startY="-19" endX="0" endY="19" name="G">
                    <GradientStop colorValue="{chip_top}" position="0"/><GradientStop colorValue="{chip_bot}" position="1"/></LinearGradient></Fill>
                <Stroke thickness="1" name="Edge"><SolidColor colorValue="59FFFFFF" name="C"/></Stroke>
            </Shape>
        </Node>'''
    # LOSER sits on this side when this side loses: above the name, grey and heavy.
    lx = 18 + LOSER_W / 2 if you else W - 18 - LOSER_W / 2
    ly = 268 if you else 524
    loser = f'''
        <Node x="{lx:.2f}" y="{ly}" opacity="0" name="{who_name} Loser" id="{ids["loser"]}">
            {text(0, 0, LOSER_SIZE, FONT_VS, "B3FFFFFF", "LOSER", origin=(0.5, 0.5), spacing=0, name="Loser Face")}
            {text(0, 3, LOSER_SIZE, FONT_VS, "CC000000", "LOSER", origin=(0.5, 0.5), spacing=0, name="Loser Shadow")}
        </Node>'''
    ids["y"] = ly
    ids["loser_x"] = lx
    return ids, word, chip + loser


YOU_HIT, you_hit_xml, you_hit_labels = hit("you")
THEM_HIT, them_hit_xml, them_hit_labels = hit("them")
IMPACT = nid()
# A full-screen flash as the VS bursts, over the photos, under the words.
impact_xml = f'''
        <Shape opacity="0" name="Impact" id="{IMPACT}">
            <Rectangle width="{W}" height="{H}" originX="0" originY="0" name="Path"/>
            <Fill name="Fill"><SolidColor colorValue="FFE6F0FF" name="C"/></Fill>
        </Shape>'''

# ---------------------------------------------------------------- the headlines
# YOU WIN! slams into the middle over a turning sunburst, with rings, sparks
# and twinkles, then rushes past the camera. YOU LOSE drops in letter by
# letter and lands heavy, then the letters fall away off the screen.

HEAD = (W / 2, 388)
HEAD_SIZE = 100
HW = dict(word=nid(), bloom=nid(), flash=nid(), rings=(nid(), nid()), rays=(nid(), nid()), twinkles=[])
head_sparks, HW["sparks"] = streaks(20, "82B4FF", long=46, short=30)
twinkles_xml = ""
for tx, ty, tr in [(-150, -46, 13), (-58, -54, 10), (40, -52, 14), (132, -44, 10), (-182, 16, 9),
                   (176, 20, 12), (-100, 44, 9), (92, 46, 11), (4, -74, 9)]:
    HW["twinkles"].append(nid())
    twinkles_xml += twinkle(HW["twinkles"][-1], tx, ty, tr)
head_win_xml = f'''
        <Node x="{HEAD[0]}" y="{HEAD[1]}" rotation="-0.06" name="You Win">
            <Node name="Twinkles">{twinkles_xml}
            </Node>
            <Node opacity="0" name="Headline" id="{HW["word"]}">
                {text(0, 0, HEAD_SIZE, FONT_VS, WHITE, "YOU WIN!", origin=(0.5, 0.5), spacing=-1.5, name="Face")}
                {text(0, 6, HEAD_SIZE, FONT_VS, "FF1F62FF", "YOU WIN!", origin=(0.5, 0.5), spacing=-1.5, name="Shadow")}
            </Node>
            <Node scaleX="1.9" scaleY="0.85" name="Sparks">{head_sparks}
            </Node>
            <Node scaleY="0.6" name="Rings">
                {ring(HW["rings"][0], 220, (3, WHITE), "82B4FF")}
                {ring(HW["rings"][1], 220, (2, "CC82B4FF"), name="Ring 2")}
            </Node>
            <Node scaleY="0.62" name="Flash Shape">{flash(HW["flash"], 560, "82B4FF")}
            </Node>
            {glow(HW["bloom"], 560, "4F9BFF", a0="A6", a1="40", scale_y=0.5, name="Bloom", blend="screen")}
            {sunburst(HW["rays"][0], 12, 0.075, 430, [(0, "6682B4FF"), (0.3, "2E82B4FF"), (0.7, "0A82B4FF"), (1, "0082B4FF")],
                      [(0, "B3FFFFFF"), (0.25, "66CFE0FF"), (0.6, "1A82B4FF"), (1, "0082B4FF")])}
            {sunburst(HW["rays"][1], 8, 0.16, 360, [(0, "4082B4FF"), (0.4, "149B8CFF"), (1, "009B8CFF")],
                      name="Soft Rays", offset=math.pi / 8)}
        </Node>'''

LETTER_BASE = 0.6 * HEAD_SIZE   # each letter hangs from its foot, so it squashes as it lands
HL = dict(letters=[], gloom=nid())
lose_letters = ""
for ch, lx, _ in letters("YOU LOSE", HEAD_SIZE, -1.5):
    if ch == " ":
        continue
    HL["letters"].append(nid())
    lose_letters += f'''
            <Node x="{lx:.2f}" y="{LETTER_BASE}" opacity="0" name="Letter {ch}" id="{HL["letters"][-1]}">
                {text(0, 0, HEAD_SIZE, FONT_VS, "FFDDE1E8", ch, origin=(0.5, 1), name="Face")}
                {text(0, 6, HEAD_SIZE, FONT_VS, "FF3E4450", ch, origin=(0.5, 1), name="Shadow")}
            </Node>'''
head_lose_xml = f'''
        <Node x="{HEAD[0]}" y="{HEAD[1]}" rotation="-0.04" name="You Lose">{lose_letters}
        </Node>'''
# The screen closes in around YOU LOSE.
gloom_xml = f'''
        <Shape opacity="0" name="Gloom" id="{HL["gloom"]}">
            <Rectangle width="{W}" height="{H}" originX="0" originY="0" name="Path"/>
            <Fill name="Fill"><RadialGradient startX="{HEAD[0]}" startY="{HEAD[1]}" endX="{HEAD[0] + 520}" endY="{HEAD[1]}" name="G">
                <GradientStop colorValue="40000000" position="0"/><GradientStop colorValue="8C000000" position="0.45"/><GradientStop colorValue="E6000000" position="1"/>
            </RadialGradient></Fill>
        </Shape>'''

# ---------------------------------------------------------------- the knockout
# K. and O. slam into the middle one after the other, each with a red flash
# and a screen shake. The first cracks the loser's side of the glass, the
# second shatters it: rings of cracks, lit facets, holes where pieces fall
# out and shards flying at the camera. K.O. then flies to the loser's corner,
# where LOSER would have gone, and the broken glass stays.

KO_SIZE = 132
KO_SMALL = 0.62
KO = dict(node=nid(), k=nid(), o=nid(), glow=nid())
_ko = letters("K.O.", KO_SIZE, -2)
K_X = (_ko[0][1] - _ko[0][2] / 2 + _ko[1][1] + _ko[1][2] / 2) / 2
O_X = (_ko[2][1] - _ko[2][2] / 2 + _ko[3][1] + _ko[3][2] / 2) / 2
ko_xml = f'''
        <Node x="{MID[0]:.2f}" y="{MID[1]}" opacity="0" rotation="-0.08" name="KO" id="{KO["node"]}">
            <Node x="{K_X:.2f}" opacity="0" name="K" id="{KO["k"]}">
                {text(0, 0, KO_SIZE, FONT_VS, WHITE, "K.", origin=(0.5, 0.5), name="Face")}
                {text(0, 7, KO_SIZE, FONT_VS, "FFD7263A", "K.", origin=(0.5, 0.5), name="Shadow")}
            </Node>
            <Node x="{O_X:.2f}" opacity="0" name="O" id="{KO["o"]}">
                {text(0, 0, KO_SIZE, FONT_VS, WHITE, "O.", origin=(0.5, 0.5), name="Face")}
                {text(0, 7, KO_SIZE, FONT_VS, "FFD7263A", "O.", origin=(0.5, 0.5), name="Shadow")}
            </Node>
            {glow(KO["glow"], 380, "FF4A55", opacity=1, name="KO Glow")}
        </Node>'''
KO_IMPACT = nid()
ko_impact_xml = f'''
        <Shape opacity="0" name="KO Impact" id="{KO_IMPACT}">
            <Rectangle width="{W}" height="{H}" originX="0" originY="0" name="Path"/>
            <Fill name="Fill"><SolidColor colorValue="FFE0303C" name="C"/></Fill>
        </Shape>'''

CRACK_AT = {"you": (86, 170), "them": (330, 410)}   # where the hit lands on each side
RING_R = (18, 44, 80, 128)                           # the rings of the web
RAY_R = (0, 8, 18, 30, 44, 60, 80, 104, 128, 170, 230, 310, 400, 500)
REVEALS = []   # trims that draw the cracks on, kept at the artboard root


def reveal(name):
    gid, tid = nid(), nid()
    REVEALS.append(f'<GroupEffect name="{name}" id="{gid}"><TrimPath start="0" end="0" modeValue="synchronized" '
                   f'name="Trim" id="{tid}"/></GroupEffect>')
    return gid, tid


def stroke(thickness, colour, effect, name="Line"):
    return (f'<Stroke thickness="{thickness}" cap="round" join="round" name="{name}">'
            f'<SolidColor colorValue="{colour}" name="C"/><TargetEffect targetId="{effect}" name="Reveal"/></Stroke>')


def crack(who, clip):
    """A spider web of cracks on one side, clipped to it, and the glass that flies off."""
    rng = random.Random(5 if who == "you" else 9)
    who_name = "You" if who == "you" else "Them"
    cx, cy = CRACK_AT[who]
    n = 13
    base = rng.uniform(0, 2 * math.pi)
    rays, ends = [], []
    for i in range(n):
        a = base + 2 * math.pi * i / n + rng.uniform(-0.22, 0.22)
        drift, pts = 0.0, []
        for r in RAY_R:
            drift += rng.uniform(-0.05, 0.05)
            rr = r * rng.uniform(0.82, 1.18) if r in RING_R else r
            pts.append((rr * math.cos(a + drift), rr * math.sin(a + drift)))
        # some cracks stop short instead of running to the edge
        ends.append(len(RAY_R) if rng.random() < 0.7 else rng.randint(RAY_R.index(80), len(RAY_R) - 2))
        rays.append(pts[:ends[-1]])
    ring_at = [RAY_R.index(r) for r in RING_R]
    joins, ring_paths = {}, []
    for k, vi in enumerate(ring_at):
        for i in range(n):
            j = (i + 1) % n
            if vi < ends[i] and vi < ends[j] and rng.random() < (1, 0.75, 0.5, 0.3)[k]:
                a, b = rays[i][vi], rays[j][vi]
                # rings bow in toward the hit and kink twice on the way across
                bow = rng.uniform(0.03, 0.12)
                mids = []
                for f in (rng.uniform(0.28, 0.4), rng.uniform(0.6, 0.72)):
                    mx, my = a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f
                    mids.append((mx * (1 - bow) + rng.uniform(-2.5, 2.5), my * (1 - bow) + rng.uniform(-2.5, 2.5)))
                joins[(i, k)] = mids
                ring_paths.append([a, *mids, b])
    branches = []
    for ray in rays:
        for vi, r in enumerate(RAY_R[:len(ray)]):
            if r >= 60 and rng.random() < 0.3:
                x0, y0 = ray[vi]
                a = math.atan2(y0, x0) + rng.choice((-1, 1)) * rng.uniform(0.45, 0.9)
                ln = rng.uniform(18, 50)
                mid = (x0 + ln * 0.5 * math.cos(a) + rng.uniform(-3, 3), y0 + ln * 0.5 * math.sin(a) + rng.uniform(-3, 3))
                a2 = a + rng.uniform(-0.25, 0.25)
                branches.append([(x0, y0), mid, (x0 + ln * math.cos(a2), y0 + ln * math.sin(a2))])
    # a few cracks that start from a ring rather than the hit
    for (i, k), mids in list(joins.items()):
        if k >= 1 and rng.random() < 0.35:
            x0, y0 = mids[0]
            a = math.atan2(y0, x0) + rng.uniform(-0.3, 0.3)
            pts, r0 = [(x0, y0)], math.hypot(x0, y0)
            for step in range(1, 4):
                rr = r0 + step * rng.uniform(30, 60)
                a += rng.uniform(-0.08, 0.08)
                pts.append((rr * math.cos(a), rr * math.sin(a)))
            branches.append(pts)
    crush = []
    for _ in range(22):
        r, u = rng.uniform(0, 15), rng.uniform(0, 2 * math.pi)
        p = (r * math.cos(u), r * math.sin(u))
        ln, v = rng.uniform(4, 10), rng.uniform(0, 2 * math.pi)
        crush.append([p, (p[0] + ln * math.cos(v), p[1] + ln * math.sin(v))])

    def cell(i, k):
        """The piece of glass between two rays and two rings."""
        j = (i + 1) % n
        lo, hi = ring_at[k], ring_at[k + 1]
        return ([rays[i][lo], *joins[(i, k)], rays[j][lo]] + rays[j][lo + 1:hi] +
                [rays[j][hi], *joins[(i, k + 1)][::-1], rays[i][hi]] + rays[i][lo + 1:hi][::-1])

    cells = [(i, k) for k in range(3) for i in range(n) if (i, k) in joins and (i, k + 1) in joins]
    rng.shuffle(cells)
    holes = [c for c in cells if c[1] >= 1][:2]
    facets, holes_xml, loose = "", "", ""
    ids = dict(node=nid(), flash=nid(), crush=nid(), powder=nid(), bruise=nid(), facets=nid(), holes=nid(),
               glint=nid(), falls=[], flies=[], at=(cx, cy))
    for c in cells:
        pts = cell(*c)
        if c in holes:
            # the piece falls out and leaves a dark hole with a bright edge
            holes_xml += f'''
                <Shape name="Hole">{closed_path(pts)}
                    <Fill name="Fill"><SolidColor colorValue="F2030405" name="C"/></Fill>
                    <Stroke thickness="1.2" join="round" name="Edge"><SolidColor colorValue="CCFFFFFF" name="C"/></Stroke>
                </Shape>'''
            mx = sum(p[0] for p in pts) / len(pts)
            my = sum(p[1] for p in pts) / len(pts)
            s = dict(node=nid(), x=cx + mx, y=cy + my, dx=rng.uniform(-30, 30), spin=rng.uniform(-1.6, 1.6))
            ids["falls"].append(s)
            loose += f'''
        <Node x="{s["x"]:.1f}" y="{s["y"]:.1f}" opacity="0" name="Falling Glass" id="{s["node"]}">
            <Shape name="Glass">{closed_path([(px - mx, py - my) for px, py in pts])}
                <Fill name="Fill"><LinearGradient startX="-20" startY="-20" endX="20" endY="20" name="G">
                    <GradientStop colorValue="73FFFFFF" position="0"/><GradientStop colorValue="1AD6E4FF" position="1"/></LinearGradient></Fill>
                <Stroke thickness="1" join="round" name="Edge"><SolidColor colorValue="D9FFFFFF" name="C"/></Stroke>
            </Shape>
        </Node>'''
            continue
        roll = rng.random()
        mx = sum(p[0] for p in pts) / len(pts)
        my = sum(p[1] for p in pts) / len(pts)
        if roll < 0.6:
            # a facet tipped toward the light, which comes from the top left, so
            # those on that side of the hit shine most; each catches it at its own angle
            lit = 0.5 + 0.5 * math.cos(math.atan2(my, mx) + 2.36)
            alpha = int(0x18 + lit * 0x60 * rng.uniform(0.6, 1))
            a = math.atan2(my, mx) + rng.uniform(-1, 1)
            facets += f'''
                <Shape name="Facet">{closed_path(pts)}
                    <Fill name="Fill"><LinearGradient startX="{mx - 30 * math.cos(a):.1f}" startY="{my - 30 * math.sin(a):.1f}" endX="{mx + 30 * math.cos(a):.1f}" endY="{my + 30 * math.sin(a):.1f}" name="G">
                        <GradientStop colorValue="{alpha:02X}FFFFFF" position="0"/><GradientStop colorValue="05FFFFFF" position="1"/></LinearGradient></Fill>
                </Shape>'''
        elif roll < 0.72:
            facets += f'''
                <Shape name="Shade">{closed_path(pts)}
                    <Fill name="Fill"><SolidColor colorValue="47000000" name="C"/></Fill>
                </Shape>'''
    # shards that fly out at the camera
    for _ in range(14):
        a, dist, size = rng.uniform(0, 2 * math.pi), rng.uniform(70, 200), rng.uniform(5, 14)
        t0 = rng.uniform(0, 2 * math.pi)
        tri = [(size * math.cos(t0 + d) * rng.uniform(0.6, 1), size * math.sin(t0 + d) * rng.uniform(0.6, 1))
               for d in (0, 2.1 + rng.uniform(-0.4, 0.4), 4.2 + rng.uniform(-0.4, 0.4))]
        s = dict(node=nid(), dx=dist * math.cos(a), dy=dist * math.sin(a), spin=rng.uniform(-3, 3))
        ids["flies"].append(s)
        loose += f'''
        <Node x="{cx}" y="{cy}" opacity="0" name="Flying Glass" id="{s["node"]}">
            <Shape name="Glass">{closed_path(tri)}
                <Fill name="Fill"><LinearGradient startX="{-size:.1f}" startY="{-size:.1f}" endX="{size:.1f}" endY="{size:.1f}" name="G">
                    <GradientStop colorValue="99FFFFFF" position="0"/><GradientStop colorValue="0DCFE0FF" position="1"/></LinearGradient></Fill>
                <Stroke thickness="1" join="round" name="Edge"><SolidColor colorValue="E6FFFFFF" name="C"/></Stroke>
            </Shape>
        </Node>'''
    ray_fx, ids["ray_trim"] = reveal(f"{who_name} Rays")
    ring_fx, ids["ring_trim"] = reveal(f"{who_name} Rings")
    branch_fx, ids["branch_trim"] = reveal(f"{who_name} Branches")
    xml = f'''
        <Node x="{cx}" y="{cy}" opacity="0" name="{who_name} Crack" id="{ids["node"]}">
            <ClippingShape sourceId="{clip}" name="Clip"/>
            <Shape opacity="0" name="Hit Flash" id="{ids["flash"]}">
                <Ellipse width="180" height="180" originX="0.5" originY="0.5" name="Path"/>
                <Fill name="Fill"><RadialGradient startX="0" startY="0" endX="90" endY="0" name="G">
                    <GradientStop colorValue="FFFFFFFF" position="0"/><GradientStop colorValue="66FFFFFF" position="0.3"/><GradientStop colorValue="00FFFFFF" position="1"/>
                </RadialGradient></Fill>
            </Shape>
            <Shape x="-280" rotation="0.5" opacity="0" name="Glint" id="{ids["glint"]}">
                <Rectangle width="70" height="1400" originX="0.5" originY="0.5" name="Path"/>
                <Fill name="Fill"><LinearGradient startX="-35" startY="0" endX="35" endY="0" name="G">
                    <GradientStop colorValue="00FFFFFF" position="0"/><GradientStop colorValue="2EFFFFFF" position="0.5"/><GradientStop colorValue="00FFFFFF" position="1"/>
                </LinearGradient></Fill>
            </Shape>
            <Shape opacity="0" name="Crush" id="{ids["crush"]}">
                {"".join(open_path(p) for p in crush)}
                <Stroke thickness="1" cap="round" name="Line"><SolidColor colorValue="E6FFFFFF" name="C"/></Stroke>
            </Shape>
            <Shape opacity="0" name="Powder" id="{ids["powder"]}">
                <Ellipse width="46" height="46" originX="0.5" originY="0.5" name="Path"/>
                <Fill name="Fill"><RadialGradient startX="0" startY="0" endX="23" endY="0" name="G">
                    <GradientStop colorValue="D9FFFFFF" position="0"/><GradientStop colorValue="4DFFFFFF" position="0.5"/><GradientStop colorValue="00FFFFFF" position="1"/>
                </RadialGradient></Fill>
            </Shape>
            <Shape name="Core">
                {"".join(open_path(r[:5]) for r in rays)}
                {stroke(2.4, WHITE, ray_fx)}
            </Shape>
            <Shape name="Rays">
                {"".join(open_path(r) for i, r in enumerate(rays) if i % 3)}
                {stroke(5, "12FFFFFF", ray_fx, "Shine")}
                {stroke(3, "59000000", ray_fx, "Shadow")}
                {stroke(1.4, "F2FFFFFF", ray_fx)}
            </Shape>
            <Shape name="Fainter Rays">
                {"".join(open_path(r) for i, r in enumerate(rays) if not i % 3)}
                {stroke(2.6, "40000000", ray_fx, "Shadow")}
                {stroke(1.1, "A6FFFFFF", ray_fx)}
            </Shape>
            <Shape name="Rings">
                {"".join(open_path(p) for p in ring_paths)}
                {stroke(2.6, "40000000", ring_fx, "Shadow")}
                {stroke(1.1, "D9FFFFFF", ring_fx)}
            </Shape>
            <Shape name="Branches">
                {"".join(open_path(p) for p in branches)}
                {stroke(0.9, "B3FFFFFF", branch_fx)}
            </Shape>
            <Node opacity="0" name="Holes" id="{ids["holes"]}">{holes_xml}
            </Node>
            <Node opacity="0" name="Facets" id="{ids["facets"]}">{facets}
            </Node>
            {glow(ids["bruise"], 360, "000000", a0="8C", a1="40", name="Bruise")}
        </Node>'''
    return ids, xml, loose


CRACKS = {}
crack_xml, loose_glass_xml = "", ""
for who, sd in (("you", YOU), ("them", THEM)):
    CRACKS[who], cx_, lx_ = crack(who, sd["clip"])
    crack_xml += cx_
    loose_glass_xml += lx_

# ---------------------------------------------------------------- confetti
# Only for your win. Two cannons fire from the bottom corners and a burst
# pops out of YOU WIN!. The pieces tumble, showing their darker backs, sway
# and flutter down; foil ones flash white as they turn to face you. A
# quarter sit in front of the headline, nearer the camera, so they are bigger
# and fall faster. The Confetti layer of the state machine plays them.

CONF_T = 250
PALETTE = [("FFFFFFFF", "FFAFBCD6"), ("FFDCE8FF", "FF8AA0CC"), ("FF5CE1FF", "FF1F8DB5"),
           ("FF4F9BFF", "FF2356B5"), ("FF2A6AF0", "FF163A94"), ("FF9B8CFF", "FF5544BD")]   # front, back
FOIL = ("FFD3DCEC", "FF7A8496")
BITS = []


def confetti():
    rng = random.Random(21)

    def piece(start, apex, t0, t_up):
        kind = rng.choices(("strip", "chip", "dot", "long", "streamer"), (46, 16, 12, 16, 10))[0]
        near = rng.random() < 0.25
        foil = kind in ("strip", "chip") and rng.random() < 0.22
        front, back = FOIL if foil else rng.choice(PALETTE)
        fall = {"strip": (1.6, 2.6), "chip": (1.9, 2.9), "dot": (1.9, 2.9), "long": (1.5, 2.3), "streamer": (1.0, 1.6)}[kind]
        flip = {"strip": (14, 30), "chip": (18, 34), "dot": (20, 40), "long": (14, 28), "streamer": (30, 50)}[kind]
        slow = 0.5 if kind == "streamer" else 1
        BITS.append(dict(
            node=nid(), piece=nid(), colour=nid(), kind=kind, near=near, foil=foil, front=front, back=back,
            start=start, apex=apex, t0=t0, t_up=t_up,
            depth=rng.uniform(1.25, 1.55) if near else rng.uniform(0.7, 1.0),
            v=rng.uniform(*fall) * (1.25 if near else 1),
            sway=rng.uniform(14, 30) if kind == "streamer" else rng.uniform(8, 26),
            half=rng.randint(30, 44) if kind == "streamer" else rng.randint(20, 36),
            drift=rng.uniform(-4, 4), r0=rng.uniform(0, 2 * math.pi),
            spin_up=rng.choice((-1, 1)) * rng.uniform(2, 5) * slow,
            spin_fall=rng.choice((-1, 1)) * rng.uniform(1, 4) * slow,
            flip=max(8, rng.randint(*flip) // 2), flip_from=rng.choice((1, 0.06)),
            wobble=rng.randint(15, 30) if kind in ("chip", "dot", "streamer") else 0))

    for left in (True, False):
        for _ in range(36):
            apex = (rng.uniform(24, 300) if left else rng.uniform(90, 366), 70 + 400 * rng.random() ** 1.3)
            piece((-8 if left else W + 8, H - 96 + rng.uniform(-6, 6)), apex, rng.randint(0, 5), rng.randint(26, 42))
    for _ in range(28):
        a = rng.uniform(-math.pi, 0) if rng.random() < 0.8 else rng.uniform(0, math.pi)
        d = rng.uniform(70, 210)
        x0, y0 = HEAD[0] + rng.uniform(-90, 90), HEAD[1] + rng.uniform(-14, 14)
        piece((x0, y0), (x0 + d * math.cos(a), y0 + 0.8 * d * math.sin(a)), rng.randint(0, 3), rng.randint(18, 28))

    front_xml, back_xml = "", ""
    for i, b in enumerate(BITS):
        paint = f'<SolidColor colorValue="{b["front"]}" name="C" id="{b["colour"]}"/>'
        if b["kind"] == "streamer":
            curl = [(6 * math.sin(k * math.pi / 2.5), -20 + k * 40 / 8) for k in range(9)]
            body = open_path(curl, "Path") + f'<Stroke thickness="2.8" cap="round" join="round" name="Paint">{paint}</Stroke>'
        elif b["kind"] == "dot":
            body = f'<Ellipse width="9" height="9" originX="0.5" originY="0.5" name="Path"/><Fill name="Paint">{paint}</Fill>'
        else:
            w, h = {"strip": (7, 16), "chip": (10, 10), "long": (5, 22)}[b["kind"]]
            body = (f'<Rectangle width="{w}" height="{h}" originX="0.5" originY="0.5" cornerRadiusTL="1.2" name="Path"/>'
                    f'<Fill name="Paint">{paint}</Fill>')
        x, y = b["start"]
        xml = f'''
            <Node x="{x:.1f}" y="{y:.1f}" rotation="{b["r0"]:.3f}" scaleX="{b["depth"]:.2f}" scaleY="{b["depth"]:.2f}" name="Bit {i + 1}" id="{b["node"]}">
                <Shape opacity="0" name="Piece" id="{b["piece"]}">{body}</Shape>
            </Node>'''
        if b["near"]:
            front_xml += xml
        else:
            back_xml += xml
    return (f'<Node name="Confetti Front">{front_xml}\n        </Node>',
            f'<Node name="Confetti Back">{back_xml}\n        </Node>')


confetti_front_xml, confetti_back_xml = confetti()

YOU_NAME, THEM_NAME = nid(), nid()
names_xml = f'''
        <Node x="18" y="300" name="You Name" id="{YOU_NAME}">
            {text(0, 0, 34, FONT_BOLD, WHITE, "Alex", bind="youName", name="Name", fit=(170, 38))}
            {text(1, 38, 12, FONT_MED, "B3FFFFFF", "Peckham", bind="youCity", spacing=0.3, name="City")}
        </Node>
        <Node x="{W - 18}" y="556" name="Them Name" id="{THEM_NAME}">
            {text(0, 0, 34, FONT_BOLD, WHITE, "Kemi", bind="themName", origin=(1, 0), name="Name", fit=(170, 38))}
            {text(-1, 38, 12, FONT_MED, "B3FFFFFF", "Brixton", bind="themCity", origin=(1, 0), spacing=0.3, name="City")}
        </Node>'''

TOPBAR = nid()
top_xml = f'''
        <Node y="70" name="Top Bar" id="{TOPBAR}">
            {text(18, 0, 12, FONT_BOLD, BLUE_HI, "1V1 · REMATCH", bind="title", spacing=1.6, name="Title")}
            {text(W - 18, 0, 12, FONT_MED, "BFFFFFFF", "24 hours · most steps", bind="rule", origin=(1, 0), name="Rule")}
        </Node>'''

TILE_W = (W - 36 - 16) / 3
TILE_Y = H - 40 - 64
TILES = [nid(), nid(), nid()]
tiles_xml = ""
for i, (bind, label) in enumerate([("stake", "OUT each"), ("prize", "to the winner"), ("clock", "on the clock")]):
    cx = 18 + TILE_W / 2 + i * (TILE_W + 8)
    tiles_xml += f'''
        <Node x="{cx:.2f}" y="{TILE_Y + 32}" name="Tile {bind}" id="{TILES[i]}">
            {text(0, -7, 24, FONT_BOLD, WHITE, {"stake": "50", "prize": "100", "clock": "24h"}[bind], bind=bind, origin=(0.5, 0.5), name="Value")}
            {text(0, 16, 11, FONT_MED, "B3FFFFFF", label, origin=(0.5, 0.5), spacing=0.2, name="Label")}
            <Shape name="Card">
                <Rectangle width="{TILE_W:.2f}" height="64" originX="0.5" originY="0.5" cornerRadiusTL="16" name="Path"/>
                <Fill name="Fill"><SolidColor colorValue="17FFFFFF" name="C"/></Fill>
                <Stroke thickness="1" name="Edge"><LinearGradient startX="0" startY="-32" endX="0" endY="32" name="G">
                    <GradientStop colorValue="29FFFFFF" position="0"/><GradientStop colorValue="05FFFFFF" position="1"/></LinearGradient></Stroke>
            </Shape>
        </Node>'''

PILL, PILL_HIT, PILL_HOLD = nid(), nid(), nid()
# The holder hides the pill while a result shows (the WINNER tag sits there);
# the Pack Prompt layer drives the pill itself from youHasPack.
pill_xml = f'''
        <Node name="Add Pack Holder" id="{PILL_HOLD}">
        <Node x="{18 + 92}" y="{258}" name="Add Pack" id="{PILL}">
            {text(0, 0.5, 14, FONT_MED, WHITE, "+ Add your Fighter Pack", origin=(0.5, 0.5), spacing=0.2, name="Label")}
            <Shape name="Pill" id="{PILL_HIT}">
                <Rectangle width="184" height="34" originX="0.5" originY="0.5" cornerRadiusTL="17" name="Path"/>
                <Fill name="Fill"><SolidColor colorValue="1FFFFFFF" name="C"/></Fill>
                <Stroke thickness="1" name="Edge"><SolidColor colorValue="40FFFFFF" name="C"/></Stroke>
            </Shape>
        </Node>
        </Node>'''

# ---------------------------------------------------------------- what a result moves, at rest

SHAKE_FRONT, SHAKE_BACK = nid(), nid()


def rests():
    out = []
    for s in (YOU, THEM):
        out += [(s["v"][0], VX, TOP), (s["v"][1], VX, BOT), (s["dim"], OPACITY, 0),
                (s["photo"], OPACITY, 1), (s["shot"], OPACITY, 0)]
        out += [(oid, k, 0) for oid in (s["photo"], s["shot"]) for k in (X, Y)]
    out += [(PILL_HOLD, OPACITY, 1), (SEAM, X, (TOP + BOT) / 2), (VSG, X, MID[0]), (VSG, OPACITY, 1),
            (VSTEXT, SX, 1), (VSTEXT, SY, 1), (IMPACT, OPACITY, 0), (KO_IMPACT, OPACITY, 0)]
    out += [(n, k, 0) for n in (SHAKE_FRONT, SHAKE_BACK) for k in (X, Y)]
    for h in (YOU_HIT, THEM_HIT):
        out += [(oid, OPACITY, 0) for oid in (h["word"], h["glow"], h["flash"], h["chip"], h["loser"], *h["rings"], *h["sparks"])]
        out += [(h["word"], SX, 1), (h["word"], SY, 1), (h["glint"], X, GLINT_FROM)]
    out += [(n, k, 1) for n in (YOU_NAME, THEM_NAME) for k in (SX, SY)]
    out += [(KO["node"], OPACITY, 0), (KO["node"], X, MID[0]), (KO["node"], Y, MID[1]), (KO["node"], SX, 1),
            (KO["node"], SY, 1), (KO["k"], OPACITY, 0), (KO["o"], OPACITY, 0), (KO["glow"], OPACITY, 1)]
    for c in CRACKS.values():
        out += [(c[k], OPACITY, 0) for k in ("node", "flash", "crush", "powder", "bruise", "facets", "holes", "glint")]
        out += [(c[k], TRIM_END, 0) for k in ("ray_trim", "ring_trim", "branch_trim")]
        out += [(s["node"], OPACITY, 0) for s in c["falls"] + c["flies"]]
    out += [(HW["word"], OPACITY, 0), (HW["word"], SX, 1), (HW["word"], SY, 1), (HW["bloom"], OPACITY, 0), (HW["flash"], OPACITY, 0)]
    out += [(oid, OPACITY, 0) for oid in (*HW["rings"], *HW["sparks"], *HW["rays"])]
    out += [(tw, k, 0) for tw in HW["twinkles"] for k in (SX, SY)]
    out += [(lid, OPACITY, 0) for lid in HL["letters"]] + [(HL["gloom"], OPACITY, 0)]
    return out


RESTS.extend(rests())

# ---------------------------------------------------------------- animations

def slam_in():
    t = Timeline("Slam In", 84)
    t.tween(YOU["group"], X, -W, 0, 0, 42, EASE_SIDE)
    t.tween(THEM["group"], X, W, 0, 0, 42, EASE_SIDE)
    # a layout box's x is an offset from where layout puts it, so 0 is home
    t.tween(YOU["photo"], X, -W, 0, 0, 42, EASE_SIDE)
    t.tween(THEM["photo"], X, W, 0, 0, 42, EASE_SIDE)
    t.tween(SEAM, OPACITY, 0, 0.85, 21, 75, OUT_EASE)
    t.tween(SEAM, SY, 0, 1, 21, 75, EASE_SIDE)
    t.path(FLASH, OPACITY, [(0, 0, None), (10, 1, OUT_EASE), (52, 0, None)])
    t.tween(FLASH, SX, 0.2, 1.4, 10, 52, OUT_EASE)
    t.tween(FLASH, SY, 0.2, 1.4, 10, 52, OUT_EASE)
    t.path(RING, OPACITY, [(0, 0, None), (10, 1, OUT_EASE), (64, 0, None)])
    t.tween(RING, SX, 0.3, 2.6, 10, 64, SHOCK)
    t.tween(RING, SY, 0.3, 2.6, 10, 64, SHOCK)
    t.tween(VSTEXT, SX, 2.4, 1, 10, 58, SLAM)
    t.tween(VSTEXT, SY, 2.4, 1, 10, 58, SLAM)
    t.tween(VSTEXT, OPACITY, 0, 1, 10, 27, OUT_EASE)
    t.tween(VSGLOW, OPACITY, 0, 0.8, 18, 60, OUT_EASE)
    t.tween(YOU_NAME, X, -22, 18, 18, 54, EASE_SIDE)
    t.tween(YOU_NAME, OPACITY, 0, 1, 18, 54, OUT_EASE)
    t.tween(THEM_NAME, X, W + 22, W - 18, 27, 63, EASE_SIDE)
    t.tween(THEM_NAME, OPACITY, 0, 1, 27, 63, OUT_EASE)
    t.tween(TOPBAR, OPACITY, 0, 1, 20, 50, OUT_EASE)
    for i in range(3):
        t.tween(TILES[i], Y, TILE_Y + 52, TILE_Y + 32, 33 + 4 * i, 63 + 4 * i, EASE_SIDE)
        t.tween(TILES[i], OPACITY, 0, 1, 33 + 4 * i, 63 + 4 * i, OUT_EASE)
    t.rest()
    return t.xml()


def idle():
    t = Timeline("Idle", 240, "loop")
    t.path(VSGLOW, OPACITY, [(0, 0.8, INOUT), (120, 1, INOUT), (240, 0.8, None)])
    for k in (SX, SY):
        t.path(VSGLOW, k, [(0, 1, INOUT), (120, 1.1, INOUT), (240, 1, None)])
        t.path(VSTEXT, k, [(0, 1, INOUT), (120, 1.025, INOUT), (240, 1, None)])
    t.path(SEAM_GLOW, OPACITY, [(0, 0.7, INOUT), (60, 1, INOUT), (120, 0.7, INOUT), (180, 1, INOUT), (240, 0.7, None)])
    return t.xml()


HIT = 10          # the frame the result lands and the VS bursts
HEAD_GAP = 12     # then the headline, a beat later
HEAD_KO = 62      # or after the knockout has cleared the middle

SHAKE = [(0, 0), (-11, 6), (10, -7), (-9, 5), (8, -4), (-6, 4), (5, -2), (-3, 2), (2, -1), (0, 0)]   # every 3 frames


def shake_points(hits, axis):
    """Offsets for decaying shakes added together; each hit is (frame, x strength, y strength)."""
    start = min(f for f, _, _ in hits)
    end = max(f for f, _, _ in hits) + 3 * (len(SHAKE) - 1)
    pts = []
    for f in range(start, end + 1, 2):
        v = 0.0
        for f0, *strength in hits:
            u = (f - f0) / 3
            if 0 <= u <= len(SHAKE) - 1:
                i = min(int(u), len(SHAKE) - 2)
                a, b = SHAKE[i][axis], SHAKE[i + 1][axis]
                v += (a + (b - a) * (u - i)) * strength[axis]
        pts.append((f, v, "linear"))
    pts.append((pts[-1][0] + 2, 0, None))
    return pts


def split_keys(t, dx, f0, f1):
    """Move both seam vertices of both clips, and the seam, by dx."""
    for s in (YOU, THEM):
        t.tween(s["v"][0], VX, TOP, TOP + dx, f0, f1, EASE_SIDE)
        t.tween(s["v"][1], VX, BOT, BOT + dx, f0, f1, EASE_SIDE)
    t.tween(SEAM, X, (TOP + BOT) / 2, (TOP + BOT) / 2 + dx, f0, f1, EASE_SIDE)


def win_head(t, h0, x0):
    """YOU WIN! slams in at h0, holds while the rays turn, and rushes past the camera at x0."""
    t.path(HW["word"], OPACITY, [(h0, 0, OUT_EASE), (h0 + 6, 1, None), (x0, 1, OUT_EASE), (x0 + 10, 0, None)])
    for k in (SX, SY):
        t.path(HW["word"], k, [(h0, 2.6, SLAM), (h0 + 28, 1, INOUT), (h0 + 50, 1.035, INOUT), (x0, 1, ZOOM), (x0 + 10, 1.6, None)])
    t.path(HW["bloom"], OPACITY, [(h0 + 2, 0, OUT_EASE), (h0 + 24, 1, INOUT), (h0 + 48, 0.7, INOUT), (x0, 1, OUT_EASE), (x0 + 12, 0, None)])
    t.path(HW["flash"], OPACITY, [(h0 + 1, 0, OUT_EASE), (h0 + 4, 1, OUT_EASE), (h0 + 40, 0, None)])
    for k in (SX, SY):
        t.path(HW["flash"], k, [(h0 + 4, 0.3, OUT_EASE), (h0 + 40, 1.5, None)])
    for i, r in enumerate(HW["rings"]):
        f = h0 + 3 + 10 * i
        t.path(r, OPACITY, [(f, 0, OUT_EASE), (f + 3, 1, OUT_EASE), (f + 48, 0, None)])
        for k in (SX, SY):
            t.path(r, k, [(f + 3, 0.3, SHOCK), (f + 48, 3.2 - 0.6 * i, None)])
    for i, bar in enumerate(HW["sparks"]):
        d = i % 3
        t.path(bar, OPACITY, [(h0 + 3 + d, 0, OUT_EASE), (h0 + 5 + d, 1, OUT_EASE), (h0 + 36 + 2 * d, 0, None)])
        t.path(bar, X, [(h0 + 3 + d, 40, OUT_EASE), (h0 + 36 + 2 * d, 150 + 20 * d, None)])
    end = x0 + 14
    for oid, spin in zip(HW["rays"], (0.012, -0.007)):
        t.path(oid, OPACITY, [(h0, 0, OUT_EASE), (h0 + 18, 1, None), (x0, 1, OUT_EASE), (end, 0, None)])
        for k in (SX, SY):
            t.path(oid, k, [(h0, 0.3, OUT_EASE), (h0 + 30, 1, None), (x0, 1, ZOOM), (end, 1.6, None)])
        t.path(oid, ROT, [(h0, 0, "linear"), (end, spin * (end - h0), None)])
    rng = random.Random(17)
    for i, tw in enumerate(HW["twinkles"]):
        f = h0 + 10 + i * (x0 - h0 - 30) // len(HW["twinkles"]) + rng.randint(0, 6)
        for k in (SX, SY):
            t.path(tw, k, [(f, 0, OUT_EASE), (f + 7, 1, INOUT), (f + 18, 0, None)])
        t.path(tw, ROT, [(f, 0, "linear"), (f + 18, 0.9, None)])


def lose_head(t, h0, x0):
    """YOU LOSE drops in a letter at a time from h0, then falls away from x0. Returns the landings."""
    rng = random.Random(4)
    order = list(range(len(HL["letters"])))
    rng.shuffle(order)
    lands = []
    for i, lid in enumerate(HL["letters"]):
        s = h0 + 3 * i
        land = s + 12
        lands.append(land)
        out = x0 + 2 * order[i]
        r0, r1 = rng.uniform(-0.5, 0.5), rng.uniform(-0.08, 0.08)
        spin = rng.choice((-1, 1)) * rng.uniform(0.8, 1.8)
        base = LETTER_BASE
        t.path(lid, OPACITY, [(s, 0, OUT_EASE), (s + 3, 1, None), (out + 30, 0, None)])
        t.path(lid, Y, [(s, base - 480, DROP), (land, base, OUT_EASE), (land + 6, base - 16, IN_EASE),
                        (land + 12, base, OUT_EASE), (land + 15, base - 4, IN_EASE), (land + 18, base, None),
                        (out, base, OUT_EASE), (out + 6, base - 14, GRAV), (out + 30, base + 640, None)])
        t.path(lid, ROT, [(s, r0, OUT_EASE), (land + 12, r1, None), (out + 6, r1, IN_EASE), (out + 30, r1 + spin, None)])
        t.path(lid, SX, [(land - 1, 1, OUT_EASE), (land + 1, 1.16, INOUT), (land + 9, 1, None)])
        t.path(lid, SY, [(land - 1, 1, OUT_EASE), (land + 1, 0.8, INOUT), (land + 9, 1, None)])
    t.path(HL["gloom"], OPACITY, [(h0, 0, OUT_EASE), (h0 + 16, 0.9, INOUT), (h0 + 40, 0.7, None), (x0, 0.7, OUT_EASE), (x0 + 30, 0, None)])
    return lands


def label_keys(t, h, l0):
    """WINNER slams in on its side at l0."""
    t.tween(h["word"], OPACITY, 0, 1, l0 + 2, l0 + 10, OUT_EASE)
    for k in (SX, SY):
        t.tween(h["word"], k, 2.4, 1, l0 + 2, l0 + 32, SLAM)
    t.tween(h["glow"], OPACITY, 0, 1, l0 + 4, l0 + 28, OUT_EASE)
    t.path(h["flash"], OPACITY, [(l0 + 1, 0, OUT_EASE), (l0 + 4, 1, OUT_EASE), (l0 + 40, 0, None)])
    for k in (SX, SY):
        t.path(h["flash"], k, [(l0 + 4, 0.2, OUT_EASE), (l0 + 40, 1.5, None)])
    for i, r in enumerate(h["rings"]):
        f = l0 + 3 + 10 * i
        t.path(r, OPACITY, [(f, 0, OUT_EASE), (f + 3, 1, OUT_EASE), (f + 46, 0, None)])
        for k in (SX, SY):
            t.path(r, k, [(f + 3, 0.3, SHOCK), (f + 46, 3 - 0.6 * i, None)])
    for i, bar in enumerate(h["sparks"]):
        d = i % 3
        t.path(bar, OPACITY, [(l0 + 3 + d, 0, OUT_EASE), (l0 + 5 + d, 1, OUT_EASE), (l0 + 34 + 2 * d, 0, None)])
        t.path(bar, X, [(l0 + 3 + d, 30, OUT_EASE), (l0 + 34 + 2 * d, 120 + 18 * d, None)])


def crack_keys(t, c, k, o):
    """The glass cracks at k and shatters at o, and stays broken."""
    cx, cy = c["at"]
    t.path(c["node"], OPACITY, [(k - 1, 0, None), (k, 1, None)])
    t.tween(c["bruise"], OPACITY, 0, 1, k, k + 6, OUT_EASE)
    t.path(c["flash"], OPACITY, [(k, 0, OUT_EASE), (k + 1, 1, OUT_EASE), (k + 12, 0, None),
                                 (o - 1, 0, OUT_EASE), (o, 0.8, OUT_EASE), (o + 14, 0, None)])
    for key in (SX, SY):
        t.path(c["flash"], key, [(k, 0.4, OUT_EASE), (k + 12, 1.4, None), (o - 1, 0.5, OUT_EASE), (o + 14, 1.2, None)])
    t.path(c["crush"], OPACITY, [(k - 1, 0, None), (k, 1, None)])
    t.path(c["powder"], OPACITY, [(k - 1, 0, None), (k, 1, OUT_EASE), (k + 20, 0.75, None)])
    t.tween(c["ray_trim"], TRIM_END, 0, 1, k, k + 7, OUT_EASE)
    t.tween(c["ring_trim"], TRIM_END, 0, 1, o, o + 6, OUT_EASE)
    t.tween(c["branch_trim"], TRIM_END, 0, 1, o + 1, o + 9, OUT_EASE)
    t.tween(c["facets"], OPACITY, 0, 1, o, o + 5, OUT_EASE)
    t.path(c["holes"], OPACITY, [(o, 0, None), (o + 1, 1, None)])
    t.path(c["glint"], OPACITY, [(o + 20, 0, INOUT), (o + 30, 1, None), (o + 46, 1, INOUT), (o + 58, 0, None)])
    t.tween(c["glint"], X, -280, 280, o + 20, o + 58, INOUT)
    for s in c["falls"]:
        t.path(s["node"], OPACITY, [(o, 0, None), (o + 1, 1, None), (o + 26, 1, OUT_EASE), (o + 44, 0, None)])
        t.tween(s["node"], Y, s["y"], s["y"] + 460, o + 1, o + 44, GRAV)
        t.tween(s["node"], X, s["x"], s["x"] + s["dx"], o + 1, o + 44, "linear")
        t.tween(s["node"], ROT, 0, s["spin"], o + 1, o + 44, "linear")
        for key in (SX, SY):
            t.tween(s["node"], key, 1, 1.2, o + 1, o + 44, "linear")
    for s in c["flies"]:
        t.path(s["node"], OPACITY, [(o - 1, 0, None), (o, 1, None), (o + 10, 1, OUT_EASE), (o + 20, 0, None)])
        t.tween(s["node"], X, cx, cx + s["dx"], o, o + 20, OUT_EASE)
        t.tween(s["node"], Y, cy, cy + s["dy"], o, o + 20, OUT_EASE)
        for key in (SX, SY):
            t.tween(s["node"], key, 0.6, 1.8, o, o + 20, OUT_EASE)
        t.tween(s["node"], ROT, 0, s["spin"], o, o + 20, OUT_EASE)


def result(name, you_win, ko):
    """The split swings toward the loser and VS bursts; K.O. first when ko;
    then the headline, and last WINNER, LOSER and the prize."""
    t = Timeline(name, 0)
    dx = SHIFT if you_win else -SHIFT
    loser = THEM if you_win else YOU
    wh, lh = (YOU_HIT, THEM_HIT) if you_win else (THEM_HIT, YOU_HIT)
    h0 = HIT + (HEAD_KO if ko else HEAD_GAP)
    x0 = h0 + (72 if you_win else 78)       # the headline clears
    l0 = x0 + (8 if you_win else 30)        # WINNER lands once it has gone
    shakes = []

    split_keys(t, dx, HIT, HIT + 40)
    for k in (SX, SY):
        t.path(VSTEXT, k, [(0, 1, INOUT), (HIT, 0.86, OUT_EASE), (HIT + 22, 2.2, None)])
    t.tween(VSG, X, MID[0], MID[0] + dx, HIT, HIT + 40, EASE_SIDE)
    if ko:
        # Hard cut: the VS vanishes as the K. lands so no ghost sits behind it.
        t.path(VSG, OPACITY, [(HIT, 1, None), (HIT + 1, 0, None)])
    else:
        t.tween(VSG, OPACITY, 1, 0, HIT, HIT + 10, OUT_EASE)
    t.tween(loser["dim"], OPACITY, 0, 0.62, HIT, HIT + 40, OUT_EASE)
    t.tween(PILL_HOLD, OPACITY, 1, 0, 0, 12, OUT_EASE)
    # Under the flash each side swaps to its result shot (win or respect).
    for sd in (YOU, THEM):
        t.tween(sd["shot"], OPACITY, 0, 1, HIT, HIT + 4, OUT_EASE)
        t.tween(sd["photo"], OPACITY, 1, 0, HIT, HIT + 6, OUT_EASE)
    t.fire(EVENTS["impact"], HIT)

    if ko:
        k, o = HIT, HIT + 8
        t.path(KO_IMPACT, OPACITY, [(k, 0, OUT_EASE), (k + 3, 0.55, OUT_EASE), (o, 0.14, OUT_EASE),
                                    (o + 3, 0.4, OUT_EASE), (o + 30, 0, None)])
        t.path(KO["node"], OPACITY, [(k - 1, 0, None), (k, 1, None)])
        for part, f in ((KO["k"], k), (KO["o"], o)):
            t.tween(part, OPACITY, 0, 1, f, f + 4, OUT_EASE)
            t.tween(part, SX, 3.2, 1, f, f + 16, SLAM)
            t.tween(part, SY, 3.2, 1, f, f + 16, SLAM)
        fly = HIT + 48
        t.path(KO["glow"], OPACITY, [(k, 0, OUT_EASE), (k + 6, 1, None), (fly - 4, 1, OUT_EASE), (fly + 14, 0, None)])
        t.tween(KO["node"], X, MID[0], lh["loser_x"], fly, fly + 22, EASE_SIDE)
        t.tween(KO["node"], Y, MID[1], lh["y"], fly, fly + 22, EASE_SIDE)
        t.tween(KO["node"], SX, 1, KO_SMALL, fly, fly + 22, EASE_SIDE)
        t.tween(KO["node"], SY, 1, KO_SMALL, fly, fly + 22, EASE_SIDE)
        crack_keys(t, CRACKS["them" if you_win else "you"], k + 2, o + 2)
        shakes += [(k + 2, 1, 1), (o + 2, 1.2, 1.2)]
        t.fire(EVENTS["knockout"], k + 2)
        t.fire(EVENTS["shatter"], o + 2)
    else:
        t.path(IMPACT, OPACITY, [(HIT, 0, OUT_EASE), (HIT + 2, 0.5 if you_win else 0.3, OUT_EASE), (HIT + 26, 0, None)])

    if you_win:
        win_head(t, h0, x0)
        shakes.append((h0 + 2, 0.4, 0.4))
        t.fire(EVENTS["youWin"], h0 + 2)
        t.fire(EVENTS["confetti"], h0 + 2)
    else:
        lands = lose_head(t, h0, x0)
        shakes.append((lands[0], 0.15, 0.6))
        t.fire(EVENTS["youLose"], lands[0])
        for f in lands:
            t.fire(EVENTS["thud"], f)

    label_keys(t, wh, l0)
    t.fire(EVENTS["winner"], l0 + 8)
    # the winner's name kicks
    for k in (SX, SY):
        t.path(YOU_NAME if you_win else THEM_NAME, k, [(l0 + 10, 1, OUT_EASE), (l0 + 18, 1.14, INOUT), (l0 + 38, 1, None)])
    if not ko:
        # LOSER drops in on the other side and lands heavy
        f = l0 + 14
        t.tween(lh["loser"], OPACITY, 0, 1, f, f + 10, OUT_EASE)
        t.tween(lh["loser"], Y, lh["y"] - 34, lh["y"], f, f + 18, (0.5, 0, 0.8, 1.25))
        t.tween(lh["loser"], ROT, -0.2, 0.04, f, f + 18, (0.5, 0, 0.8, 1.25))
        t.fire(EVENTS["loser"], f + 18)
    # the prize pops under the winner's name and a glint runs across it
    c = l0 + 28
    t.tween(wh["chip"], OPACITY, 0, 1, c, c + 10, OUT_EASE)
    t.tween(wh["chip"], SX, 0.4, 1, c, c + 20, THUMB)
    t.tween(wh["chip"], SY, 0.4, 1, c, c + 20, THUMB)
    t.tween(wh["glint"], X, GLINT_FROM, GLINT_TO, c + 18, c + 46, INOUT)
    t.fire(EVENTS["prize"], c + 2)

    xs, ys = shake_points(shakes, 0), shake_points(shakes, 1)
    for oid in (SHAKE_FRONT, SHAKE_BACK, YOU["photo"], YOU["shot"], THEM["photo"], THEM["shot"]):
        t.path(oid, X, xs)
        t.path(oid, Y, ys)
    t.duration = c + 64
    t.rest()
    return t.xml()


def glow_loop(name, h):
    """After the result the winner's glow keeps breathing and the prize glints now and then."""
    t = Timeline(name, 180, "loop")
    t.path(h["glow"], OPACITY, [(0, 1, INOUT), (90, 0.65, INOUT), (180, 1, None)])
    for k in (SX, SY):
        t.path(h["word"], k, [(0, 1, INOUT), (90, 1.03, INOUT), (180, 1, None)])
    t.path(h["glint"], X, [(0, GLINT_FROM, None), (60, GLINT_FROM, INOUT), (90, GLINT_TO, None)])
    return t.xml()


def confetti_burst():
    t = Timeline("Confetti", CONF_T)
    for b in BITS:
        t0 = b["t0"]
        ta = t0 + b["t_up"]
        (x0, y0), (x1, y1) = b["start"], b["apex"]
        # thrown out, then swaying from side to side as it falls
        xs, f, side, cx, step = [(t0, x0, LAUNCH_X), (ta, x1, INOUT)], ta, 1, x1, b["half"] // 2
        while f < CONF_T:
            f = min(f + step, CONF_T)
            cx += b["drift"]
            xs.append((f, cx + side * b["sway"], INOUT))
            side, step = -side, b["half"]
        t.path(b["node"], X, xs)
        fall0 = ta + 20
        ym = y1 + b["v"] * 10
        t.path(b["node"], Y, [(t0, y0, LAUNCH_Y), (ta, y1, QUAD_IN), (fall0, ym, "linear"),
                              (CONF_T, ym + b["v"] * (CONF_T - fall0), None)])
        r1 = b["r0"] + b["spin_up"]
        t.path(b["node"], ROT, [(t0, b["r0"], OUT_EASE), (ta, r1, "linear"), (CONF_T, r1 + b["spin_fall"], None)])
        # tumbling: edge on, then over to its back, and round again
        v, sxs, cols, facing = b["flip_from"], [], [(t0, b["front"])], True
        f = t0
        while f <= CONF_T:
            sxs.append((f, v, INOUT))
            if f > t0 and v < 1:
                facing = not facing
                cols.append((f, b["front"] if facing else b["back"]))
            elif f > t0 + 2 and b["foil"]:
                cols += [(f - 2, WHITE), (f + 2, b["front"] if facing else b["back"])]
            v = 0.06 if v == 1 else 1
            f += b["flip"]
        t.path(b["piece"], SX, sxs)
        if b["wobble"]:
            f, v, sys_ = t0, 1, []
            while f <= CONF_T:
                sys_.append((f, v, INOUT))
                v = 0.5 if v == 1 else 1
                f += b["wobble"]
            t.path(b["piece"], SY, sys_)
        shown = [(t0 - 1, 0, None), (t0, 1, None)] if t0 else [(0, 1, None)]
        t.path(b["piece"], OPACITY, shown + [(CONF_T - 30, 1, "linear"), (CONF_T, 0, None)])
        t.key(b["colour"], COLOUR, *(kfc(col, f) for f, col in cols if f <= CONF_T))
    return t.xml()


def confetti_hidden(name, duration):
    t = Timeline(name, duration)
    for b in BITS:
        t.key(b["piece"], OPACITY, kf(0, 0))
    return t.xml()


def prompt(name, a, b, duration):
    t = Timeline(name, duration)
    t.tween(PILL, OPACITY, a, b, 0, duration, OUT_EASE)
    return t.xml()


animations = [
    slam_in(), idle(),
    result("Win", True, False), result("Lose", False, False),
    result("KO Win", True, True), result("KO Lose", False, True),
    glow_loop("Win Glow", YOU_HIT), glow_loop("Lose Glow", THEM_HIT),
    confetti_burst(), confetti_hidden("Confetti Off", 1),
    confetti_hidden("Confetti Wait", HIT + HEAD_GAP + 2), confetti_hidden("Confetti Wait KO", HIT + HEAD_KO + 2),
    prompt("Prompt Shown", 0, 1, 18), prompt("Prompt Hidden", 1, 0, 12),
]


# ---------------------------------------------------------------- state machine

def on_trigger(name, to):
    return f'''<StateTransition stateToId="{to}">
                        <TransitionViewModelCondition>
                            <TransitionPropertyViewModelComparator>
                                <BindablePropertyTrigger><DataBindContext sourcePathIds="{path(name)}" propertyKey="686"/></BindablePropertyTrigger>
                            </TransitionPropertyViewModelComparator>
                            <TransitionValueTriggerComparator/>
                        </TransitionViewModelCondition>
                    </StateTransition>'''


def on_trigger_if(name, flag, value, to):
    """A trigger that only counts while a boolean has a given value."""
    return f'''<StateTransition stateToId="{to}">
                        <TransitionViewModelCondition>
                            <TransitionPropertyViewModelComparator>
                                <BindablePropertyTrigger><DataBindContext sourcePathIds="{path(name)}" propertyKey="686"/></BindablePropertyTrigger>
                            </TransitionPropertyViewModelComparator>
                            <TransitionValueTriggerComparator/>
                        </TransitionViewModelCondition>
                        <TransitionViewModelCondition>
                            <TransitionPropertyViewModelComparator>
                                <BindablePropertyBoolean><DataBindContext sourcePathIds="{path(flag)}" propertyKey="634"/></BindablePropertyBoolean>
                            </TransitionPropertyViewModelComparator>
                            <TransitionValueBooleanComparator value="{value}"/>
                        </TransitionViewModelCondition>
                    </StateTransition>'''


def on_bool(name, value, to):
    return f'''<StateTransition stateToId="{to}">
                        <TransitionViewModelCondition>
                            <TransitionPropertyViewModelComparator>
                                <BindablePropertyBoolean><DataBindContext sourcePathIds="{path(name)}" propertyKey="634"/></BindablePropertyBoolean>
                            </TransitionPropertyViewModelComparator>
                            <TransitionValueBooleanComparator value="{value}"/>
                        </TransitionViewModelCondition>
                    </StateTransition>'''


def after(to):
    return f'<StateTransition stateToId="{to}" enableExitTime="true" exitTimeIsPercetange="true" exitTime="100"/>'


(S_SLAM, S_IDLE, S_WIN, S_LOSE, S_ON, S_OFF, S_WIN_GLOW, S_LOSE_GLOW, S_KO_WIN, S_KO_LOSE,
 S_C_OFF, S_C_WAIT, S_C_WAIT_KO, S_C_BURST) = (nid() for _ in range(14))
machine = f'''
        <StateMachine name="Versus" id="0:7">
            <StateMachineLayer name="Main" id="{nid()}">
                <AnyState x="0" y="-160">
                    {on_trigger("replay", S_SLAM)}
                    {on_trigger_if("win", "ko", "true", S_KO_WIN)}
                    {on_trigger_if("lose", "ko", "true", S_KO_LOSE)}
                    {on_trigger_if("win", "ko", "false", S_WIN)}
                    {on_trigger_if("lose", "ko", "false", S_LOSE)}
                </AnyState>
                <ExitState x="600" y="-160"/>
                <EntryState x="0" y="0"><StateTransition stateToId="{S_SLAM}"/></EntryState>
                <AnimationState x="200" y="0" animationId="{ANIMS["Slam In"]}" reset="true" id="{S_SLAM}">{after(S_IDLE)}</AnimationState>
                <AnimationState x="400" y="0" animationId="{ANIMS["Idle"]}" id="{S_IDLE}"/>
                <AnimationState x="400" y="160" animationId="{ANIMS["Win"]}" reset="true" id="{S_WIN}">{after(S_WIN_GLOW)}</AnimationState>
                <AnimationState x="400" y="320" animationId="{ANIMS["Lose"]}" reset="true" id="{S_LOSE}">{after(S_LOSE_GLOW)}</AnimationState>
                <AnimationState x="400" y="480" animationId="{ANIMS["KO Win"]}" reset="true" id="{S_KO_WIN}">{after(S_WIN_GLOW)}</AnimationState>
                <AnimationState x="400" y="640" animationId="{ANIMS["KO Lose"]}" reset="true" id="{S_KO_LOSE}">{after(S_LOSE_GLOW)}</AnimationState>
                <AnimationState x="600" y="160" animationId="{ANIMS["Win Glow"]}" id="{S_WIN_GLOW}"/>
                <AnimationState x="600" y="320" animationId="{ANIMS["Lose Glow"]}" id="{S_LOSE_GLOW}"/>
            </StateMachineLayer>
            <StateMachineLayer name="Confetti" id="{nid()}">
                <AnyState x="0" y="-160">
                    {on_trigger("replay", S_C_OFF)}
                    {on_trigger("lose", S_C_OFF)}
                    {on_trigger_if("win", "ko", "false", S_C_WAIT)}
                    {on_trigger_if("win", "ko", "true", S_C_WAIT_KO)}
                </AnyState>
                <ExitState x="600" y="-160"/>
                <EntryState x="0" y="0"><StateTransition stateToId="{S_C_OFF}"/></EntryState>
                <AnimationState x="200" y="0" animationId="{ANIMS["Confetti Off"]}" id="{S_C_OFF}"/>
                <AnimationState x="200" y="160" animationId="{ANIMS["Confetti Wait"]}" reset="true" id="{S_C_WAIT}">{after(S_C_BURST)}</AnimationState>
                <AnimationState x="200" y="320" animationId="{ANIMS["Confetti Wait KO"]}" reset="true" id="{S_C_WAIT_KO}">{after(S_C_BURST)}</AnimationState>
                <AnimationState x="400" y="240" animationId="{ANIMS["Confetti"]}" reset="true" id="{S_C_BURST}"/>
            </StateMachineLayer>
            <StateMachineLayer name="Pack Prompt" id="{nid()}">
                <AnyState x="0" y="-160"/>
                <ExitState x="600" y="-160"/>
                <EntryState x="0" y="0">
                    {on_bool("youHasPack", "false", S_ON)}
                    {on_bool("youHasPack", "true", S_OFF)}
                </EntryState>
                <AnimationState x="200" y="0" animationId="{ANIMS["Prompt Shown"]}" id="{S_ON}">
                    {on_bool("youHasPack", "true", S_OFF)}
                </AnimationState>
                <AnimationState x="200" y="160" animationId="{ANIMS["Prompt Hidden"]}" id="{S_OFF}">
                    {on_bool("youHasPack", "false", S_ON)}
                </AnimationState>
            </StateMachineLayer>
            <StateMachineListenerSingle targetId="{PILL_HIT}" listenerTypeValue="click" name="Add Pack Tap" id="{nid()}">
                <ListenerFireEvent eventId="{EVENTS["addPack"]}"/>
            </StateMachineListenerSingle>
        </StateMachine>'''

# ---------------------------------------------------------------- the file

INSTANCE = nid()
rml = f'''<Rive version="1" kind="fragment">
    <!-- Generated by build.py. Edit that, not this. -->
    <Artboard defaultStateMachineId="0:7" viewModelId="{VM}" viewModelInstanceId="{INSTANCE}" styleId="0:5" width="{W}" height="{H}" name="Versus" id="0:2">
        <LayoutComponentStyle name="Artboard Style" id="0:5"/>
        <Fill name="Background"><SolidColor colorValue="FF04060B" name="Color"/></Fill>
        <!-- addPack fires when the Add your Fighter Pack pill is tapped; the
             rest are cues for sounds and haptics as a result plays. -->
        {"".join(f'<Event name="{n}" id="{i}"/>' for n, i in EVENTS.items())}
        <!-- Trims that draw the cracks on. -->
        {"".join(REVEALS)}

        <!-- First declared paints on top. -->
        <!-- Everything but the photo boxes sits in two shake nodes; a shake
             moves them and the photo boxes together. -->
        <Node name="Shake Front" id="{SHAKE_FRONT}">
        {loose_glass_xml}
        {confetti_front_xml}
        {ko_xml}
        {head_win_xml}
        {head_lose_xml}
        {gloom_xml}
        {pill_xml}
        {top_xml}
        {tiles_xml}
        {you_hit_xml}
        {them_hit_xml}
        {you_hit_labels}
        {them_hit_labels}
        {names_xml}
        {vs_xml}
        {confetti_back_xml}
        {ko_impact_xml}
        {impact_xml}
        {crack_xml}
        {seam_xml}
        </Node>
        <!-- Photos paint over the washes; lighten keeps their black backgrounds out. -->
        {you_photo_xml}
        {them_photo_xml}
        <Node name="Shake Back" id="{SHAKE_BACK}">
        {them_xml}
        {you_xml}
        </Node>
        {machine}
        {"".join(animations)}
    </Artboard>

    <ImageAsset file="images/silhouette-male-blue.jpg" name="silhouette you" id="{SIL_YOU}"/>
    <ImageAsset file="images/silhouette-male-red.jpg" name="silhouette them" id="{SIL_THEM}"/>
    <FontAsset file="fonts/BarlowCondensed-Bold.ttf" name="Barlow Condensed Bold" id="{FONT_BOLD}"/>
    <FontAsset file="fonts/BarlowCondensed-ExtraBoldItalic-Display.ttf" name="Barlow Condensed ExtraBold Italic" id="{FONT_VS}"/>
    <FontAsset file="fonts/BarlowCondensed-Medium.ttf" name="Barlow Condensed Medium" id="{FONT_MED}"/>

    <ViewModel defaultInstanceId="{INSTANCE}" name="Versus" id="{VM}">
        {"".join(f'<ViewModelProperty{k} name="{n}" id="{pid}"/>' for n, (k, pid) in props.items())}
        <ViewModelInstance exports="true" name="Default" id="{INSTANCE}">
            {"".join(instance_values)}
        </ViewModelInstance>
    </ViewModel>
</Rive>
'''

if __name__ == "__main__":
    pathlib.Path(__file__).with_name("scene.rml").write_text(rml)
