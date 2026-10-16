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
  win, lose, replay                                   triggers; set the result shots first
and listens for the `addPack` event (the pill was tapped).

Run `python3 build.py`, then `rive . --verify && rive inspect . --summary`.
Times are frames at 60fps.
"""
import itertools
import math
import pathlib

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

X, Y, ROT, SX, SY, OPACITY, VX = 13, 14, 15, 16, 17, 18, 24

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


def prop(key, *frames):
    return f'<KeyedProperty propertyKey="{key}">' + "".join(frames) + "</KeyedProperty>"


def keyed(oid, *props):
    return f'<KeyedObject objectId="{oid}">' + "".join(props) + "</KeyedObject>"


def tween(key, a, b, f0, f1, ease, hold_from_zero=True):
    """a until f0, then ease to b by f1."""
    frames = []
    if hold_from_zero and f0 > 0:
        frames.append(kf(a, 0))
    frames += [kf(a, f0, ease), kf(b, f1)]
    return prop(key, *frames)


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
for t in ("win", "lose", "replay"):
    vm_prop("Trigger", t)


def path(name):
    return f"{VM}-{props[name][1]}"


def bind_text(name):
    return f'<DataBindContext sourcePathIds="{path(name)}" propertyKey="268"/>'


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
    return xml, photo_xml, dict(group=group, content=content, v=v, photo=photo, dim=dim, shot=shot)


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
            <Shape name="VS Glow" id="{VSGLOW}">
                <Ellipse width="300" height="300" originX="0.5" originY="0.5" name="Path"/>
                <Fill name="Fill"><RadialGradient startX="0" startY="0" endX="150" endY="0" name="G">
                    <GradientStop colorValue="7382B4FF" position="0"/><GradientStop colorValue="2682B4FF" position="0.45"/><GradientStop colorValue="0082B4FF" position="1"/>
                </RadialGradient></Fill>
            </Shape>
            <Shape opacity="0" name="Shock Ring" id="{RING}">
                <Ellipse width="120" height="120" originX="0.5" originY="0.5" name="Path"/>
                <Stroke thickness="3" name="Crisp"><SolidColor colorValue="{WHITE}" name="C"/></Stroke>
                <Stroke thickness="14" name="Halo"><SolidColor colorValue="4082B4FF" name="C"/></Stroke>
            </Shape>
            <Shape opacity="0" name="Flash" id="{FLASH}">
                <Ellipse width="340" height="340" originX="0.5" originY="0.5" name="Path"/>
                <Fill name="Fill"><RadialGradient startX="0" startY="0" endX="170" endY="0" name="G">
                    <GradientStop colorValue="E6FFFFFF" position="0"/><GradientStop colorValue="5982B4FF" position="0.3"/><GradientStop colorValue="0082B4FF" position="0.62"/>
                </RadialGradient></Fill>
            </Shape>
        </Node>'''


# ---------------------------------------------------------------- the result hit
# WINNER slams in like the VS, over a flash, two shock rings and a burst of
# sparks, then the prize pops under the winner's name. LOSER drops in heavy
# and grey on the other side.

HIT_SIZE, LOSER_SIZE = 84, 46
HIT_W = 2.82 * HIT_SIZE              # advance width of WINNER, from the font
LOSER_W = 2.223 * LOSER_SIZE
SIDE_INK = {"you": ("FF1F62FF", "82B4FF", "FF2A6AF0", "FF1A47C2"),   # shadow, glow, chip top, chip bottom
            "them": ("FFD7263A", "FF6670", "FFE5404C", "FFA0182A")}
SPARKS = 16


def hit(who):
    """The winner's moment on one side: ids for the animation, and its xml."""
    you = who == "you"
    shadow, glow_rgb, chip_top, chip_bot = SIDE_INK[who]
    ids = dict(word=nid(), glow=nid(), flash=nid(), rings=(nid(), nid()), sparks=[], spark_nodes=[],
               chip=nid(), loser=nid())
    cx = 16 + HIT_W / 2 if you else W - 16 - HIT_W / 2
    # yours sits under your name and prize, clear of the face in a win shot;
    # theirs sits above their name, over the chest
    cy = 452 if you else 508
    sparks = ""
    for i in range(SPARKS):
        node, bar = nid(), nid()
        ids["spark_nodes"].append(node)
        ids["sparks"].append(bar)
        ang = 2 * math.pi * i / SPARKS + (0.12 if i % 2 else 0)
        colour = WHITE if i % 2 else f"FF{glow_rgb}"
        length = 26 if i % 3 else 40
        sparks += f'''
                <Node rotation="{ang:.4f}" name="Spark {i + 1}" id="{node}">
                    <Shape opacity="0" name="Streak" id="{bar}">
                        <Rectangle width="{length}" height="4" originX="0" originY="0.5" cornerRadiusTL="2" name="Path"/>
                        <Fill name="Fill"><LinearGradient startX="0" startY="0" endX="{length}" endY="0" name="G">
                            <GradientStop colorValue="00{colour[2:]}" position="0"/><GradientStop colorValue="{colour}" position="1"/></LinearGradient></Fill>
                    </Shape>
                </Node>'''
    word = f'''
        <Node x="{cx:.2f}" y="{cy}" rotation="-0.05" name="{"You" if you else "Them"} Win">
            <Node opacity="0" name="Winner" id="{ids["word"]}">
                {text(0, 0, HIT_SIZE, FONT_VS, WHITE, "WINNER", origin=(0.5, 0.5), spacing=-1, name="Winner Face")}
                {text(0, 5, HIT_SIZE, FONT_VS, shadow, "WINNER", origin=(0.5, 0.5), spacing=-1, name="Winner Shadow")}
            </Node>
            <Node scaleX="1.7" scaleY="0.8" name="Sparks">{sparks}
            </Node>
            <Shape opacity="0" scaleY="0.5" name="Glow" id="{ids["glow"]}">
                <Ellipse width="440" height="440" originX="0.5" originY="0.5" name="Path"/>
                <Fill name="Fill"><RadialGradient startX="0" startY="0" endX="220" endY="0" name="G">
                    <GradientStop colorValue="99{glow_rgb}" position="0"/><GradientStop colorValue="33{glow_rgb}" position="0.45"/><GradientStop colorValue="00{glow_rgb}" position="1"/>
                </RadialGradient></Fill>
            </Shape>
            <Shape opacity="0" name="Ring" id="{ids["rings"][0]}">
                <Ellipse width="160" height="160" originX="0.5" originY="0.5" name="Path"/>
                <Stroke thickness="3" name="Crisp"><SolidColor colorValue="{WHITE}" name="C"/></Stroke>
                <Stroke thickness="16" name="Halo"><SolidColor colorValue="44{glow_rgb}" name="C"/></Stroke>
            </Shape>
            <Shape opacity="0" name="Ring 2" id="{ids["rings"][1]}">
                <Ellipse width="160" height="160" originX="0.5" originY="0.5" name="Path"/>
                <Stroke thickness="2" name="Crisp"><SolidColor colorValue="CC{glow_rgb}" name="C"/></Stroke>
            </Shape>
            <Shape opacity="0" name="Flash" id="{ids["flash"]}">
                <Ellipse width="460" height="460" originX="0.5" originY="0.5" name="Path"/>
                <Fill name="Fill"><RadialGradient startX="0" startY="0" endX="230" endY="0" name="G">
                    <GradientStop colorValue="F2FFFFFF" position="0"/><GradientStop colorValue="66{glow_rgb}" position="0.3"/><GradientStop colorValue="00{glow_rgb}" position="0.65"/>
                </RadialGradient></Fill>
            </Shape>
        </Node>'''
    # The prize, under the winner's name and city.
    chip_w = 3.189 * 26 + 28
    chip_x = 18 + chip_w / 2 if you else W - 18 - chip_w / 2
    chip_y = 372 if you else 628
    sid = nid()
    chip = f'''
        <Node x="{chip_x:.2f}" y="{chip_y}" opacity="0" name="{"You" if you else "Them"} Prize" id="{ids["chip"]}">
            <Text originX="0.5" originY="0.5" sizingValue="autoWidth" wrapValue="noWrap" name="Prize">
                <TextStylePaint fontSize="26" fontAssetId="{FONT_VS}" familyName="Barlow Condensed" styleName="ExtraBold Italic" name="Style" id="{sid}">
                    <Fill name="Fill"><SolidColor colorValue="{WHITE}" name="C"/></Fill></TextStylePaint>
                <TextValueRun styleId="{sid}" text="+" name="Plus"/>
                <TextValueRun styleId="{sid}" text="100" name="Amount">{bind_text("prize")}</TextValueRun>
                <TextValueRun styleId="{sid}" text=" OUT" name="Unit"/>
            </Text>
            <Shape name="Chip">
                <Rectangle width="{chip_w:.2f}" height="38" originX="0.5" originY="0.5" cornerRadiusTL="19" name="Path"/>
                <Fill name="Fill"><LinearGradient startX="0" startY="-19" endX="0" endY="19" name="G">
                    <GradientStop colorValue="{chip_top}" position="0"/><GradientStop colorValue="{chip_bot}" position="1"/></LinearGradient></Fill>
                <Stroke thickness="1" name="Edge"><SolidColor colorValue="59FFFFFF" name="C"/></Stroke>
            </Shape>
        </Node>'''
    # LOSER sits on this side when this side loses: above the name, grey and heavy.
    lx = 18 + LOSER_W / 2 if you else W - 18 - LOSER_W / 2
    ly = 268 if you else 524
    loser = f'''
        <Node x="{lx:.2f}" y="{ly}" opacity="0" name="{"You" if you else "Them"} Loser" id="{ids["loser"]}">
            {text(0, 0, LOSER_SIZE, FONT_VS, "B3FFFFFF", "LOSER", origin=(0.5, 0.5), spacing=0, name="Loser Face")}
            {text(0, 3, LOSER_SIZE, FONT_VS, "CC000000", "LOSER", origin=(0.5, 0.5), spacing=0, name="Loser Shadow")}
        </Node>'''
    ids["y"] = ly
    return ids, word, chip + loser


YOU_HIT, you_hit_xml, you_hit_labels = hit("you")
THEM_HIT, them_hit_xml, them_hit_labels = hit("them")
IMPACT = nid()
# A full-screen flash at the moment of impact, over the photos, under the words.
impact_xml = f'''
        <Shape opacity="0" name="Impact" id="{IMPACT}">
            <Rectangle width="{W}" height="{H}" originX="0" originY="0" name="Path"/>
            <Fill name="Fill"><SolidColor colorValue="FFE6F0FF" name="C"/></Fill>
        </Shape>'''

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
        <Node y="70" opacity="0" name="Top Bar" id="{TOPBAR}">
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
        <Node x="{cx:.2f}" y="{TILE_Y + 32}" opacity="0" name="Tile {bind}" id="{TILES[i]}">
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

# ---------------------------------------------------------------- animations

ANIMS = {}


def anim(name, duration, loop, body):
    aid = nid()
    ANIMS[name] = aid
    return f'<LinearAnimation loopValue="{loop}" duration="{duration}" name="{name}" id="{aid}">' + "".join(body) + "</LinearAnimation>"


def split_keys(dx, f0, f1, ease):
    """Move both seam vertices of both clips and the seam and VS by dx."""
    out = []
    for s in (YOU, THEM):
        out.append(keyed(s["v"][0], tween(VX, TOP, TOP + dx, f0, f1, ease)))
        out.append(keyed(s["v"][1], tween(VX, BOT, BOT + dx, f0, f1, ease)))
    out.append(keyed(SEAM, tween(X, (TOP + BOT) / 2, (TOP + BOT) / 2 + dx, f0, f1, ease)))
    return out


def reset_keys():
    """Frame 0 of the slam puts back everything a result moved."""
    out = []
    for s in (YOU, THEM):
        out.append(keyed(s["v"][0], prop(VX, kf(TOP, 0))))
        out.append(keyed(s["v"][1], prop(VX, kf(BOT, 0))))
        out.append(keyed(s["content"], prop(OPACITY, kf(1, 0))))
        out.append(keyed(s["photo"], prop(SX, kf(1, 0)), prop(SY, kf(1, 0))))
        out.append(keyed(s["dim"], prop(OPACITY, kf(0, 0))))
        out.append(keyed(s["photo"], prop(OPACITY, kf(1, 0))))
        out.append(keyed(s["shot"], prop(OPACITY, kf(0, 0))))
    out.append(keyed(PILL_HOLD, prop(OPACITY, kf(1, 0))))
    out.append(keyed(SEAM, prop(X, kf((TOP + BOT) / 2, 0))))
    for h in (YOU_HIT, THEM_HIT):
        for oid in (h["word"], h["glow"], h["flash"], h["chip"], h["loser"], *h["rings"], *h["sparks"]):
            out.append(keyed(oid, prop(OPACITY, kf(0, 0))))
    for n in (YOU_NAME, THEM_NAME):
        out.append(keyed(n, prop(SX, kf(1, 0)), prop(SY, kf(1, 0))))
    out.append(keyed(IMPACT, prop(OPACITY, kf(0, 0))))
    out.append(keyed(VSG, prop(X, kf(MID[0], 0))))
    return out


slam = anim("Slam In", 84, "oneShot", reset_keys() + [
    keyed(YOU["group"], tween(X, -W, 0, 0, 42, EASE_SIDE)),
    keyed(THEM["group"], tween(X, W, 0, 0, 42, EASE_SIDE)),
    # a layout box's x is an offset from where layout puts it, so 0 is home
    keyed(YOU["photo"], tween(X, -W, 0, 0, 42, EASE_SIDE)),
    keyed(THEM["photo"], tween(X, W, 0, 0, 42, EASE_SIDE)),
    keyed(SEAM, tween(OPACITY, 0, 0.85, 21, 75, OUT_EASE), tween(SY, 0, 1, 21, 75, EASE_SIDE)),
    keyed(FLASH, prop(OPACITY, kf(0, 0), kf(1, 10, OUT_EASE), kf(0, 52)), tween(SX, 0.2, 1.4, 10, 52, OUT_EASE), tween(SY, 0.2, 1.4, 10, 52, OUT_EASE)),
    keyed(RING, prop(OPACITY, kf(0, 0), kf(1, 10, OUT_EASE), kf(0, 64)), tween(SX, 0.3, 2.6, 10, 64, SHOCK), tween(SY, 0.3, 2.6, 10, 64, SHOCK)),
    keyed(VSTEXT, tween(SX, 2.4, 1, 10, 58, SLAM), tween(SY, 2.4, 1, 10, 58, SLAM), tween(OPACITY, 0, 1, 10, 27, OUT_EASE)),
    keyed(VSG, prop(OPACITY, kf(1, 0))),
    keyed(VSGLOW, tween(OPACITY, 0, 0.8, 18, 60, OUT_EASE)),
    keyed(YOU_NAME, tween(X, -22, 18, 18, 54, EASE_SIDE), tween(OPACITY, 0, 1, 18, 54, OUT_EASE)),
    keyed(THEM_NAME, tween(X, W + 22, W - 18, 27, 63, EASE_SIDE), tween(OPACITY, 0, 1, 27, 63, OUT_EASE)),
    keyed(TOPBAR, tween(OPACITY, 0, 1, 20, 50, OUT_EASE)),
] + [keyed(TILES[i], tween(Y, TILE_Y + 52, TILE_Y + 32, 33 + 4 * i, 63 + 4 * i, EASE_SIDE),
                     tween(OPACITY, 0, 1, 33 + 4 * i, 63 + 4 * i, OUT_EASE)) for i in range(3)])

idle = anim("Idle", 240, "loop", [
    keyed(VSGLOW, prop(OPACITY, kf(0.8, 0, INOUT), kf(1, 120, INOUT), kf(0.8, 240)),
          prop(SX, kf(1, 0, INOUT), kf(1.1, 120, INOUT), kf(1, 240)),
          prop(SY, kf(1, 0, INOUT), kf(1.1, 120, INOUT), kf(1, 240))),
    keyed(VSTEXT, prop(SX, kf(1, 0, INOUT), kf(1.025, 120, INOUT), kf(1, 240)),
          prop(SY, kf(1, 0, INOUT), kf(1.025, 120, INOUT), kf(1, 240))),
    keyed(SEAM_GLOW, prop(OPACITY, kf(0.7, 0, INOUT), kf(1, 60, INOUT), kf(0.7, 120, INOUT), kf(1, 180, INOUT), kf(0.7, 240))),
])


HIT = 10   # the frame the result lands


def result(name, dx, winner, loser, hit_ids, lose_ids, name_id):
    """The seam swings toward the loser, VS bursts, WINNER slams in."""
    h = hit_ids
    keys = split_keys(dx, HIT, HIT + 40, EASE_SIDE) + [
        # VS winds up, then bursts as the result lands
        keyed(VSTEXT, prop(SX, kf(1, 0, INOUT), kf(0.86, HIT, OUT_EASE), kf(2.2, HIT + 22)),
              prop(SY, kf(1, 0, INOUT), kf(0.86, HIT, OUT_EASE), kf(2.2, HIT + 22))),
        keyed(VSG, tween(X, MID[0], MID[0] + dx, HIT, HIT + 40, EASE_SIDE), tween(OPACITY, 1, 0, HIT, HIT + 10, OUT_EASE)),
        keyed(IMPACT, prop(OPACITY, kf(0, 0), kf(0, HIT - 1), kf(0.6, HIT, OUT_EASE), kf(0, HIT + 26))),
        keyed(loser["dim"], tween(OPACITY, 0, 0.62, HIT, HIT + 40, OUT_EASE)),
        keyed(winner["dim"], prop(OPACITY, kf(0, 0))),
        keyed(PILL_HOLD, tween(OPACITY, 1, 0, 0, 12, OUT_EASE)),
        # Under the flash each side swaps to its result shot (win or respect).
        # Photos stay put: moving the box would show its edges.
        *(keyed(sd["photo"], prop(X, kf(0, 0)), prop(SX, kf(1, 0)), prop(SY, kf(1, 0)),
                tween(OPACITY, 1, 0, HIT, HIT + 6, OUT_EASE)) for sd in (winner, loser)),
        *(keyed(sd["shot"], tween(OPACITY, 0, 1, HIT, HIT + 4, OUT_EASE)) for sd in (winner, loser)),
        # WINNER slams
        keyed(h["word"], tween(OPACITY, 0, 1, HIT + 2, HIT + 12, OUT_EASE),
              tween(SX, 2.8, 1, HIT + 2, HIT + 36, SLAM), tween(SY, 2.8, 1, HIT + 2, HIT + 36, SLAM)),
        keyed(h["glow"], tween(OPACITY, 0, 1, HIT + 4, HIT + 30, OUT_EASE)),
        keyed(h["flash"], prop(OPACITY, kf(0, 0), kf(0, HIT + 1), kf(1, HIT + 4, OUT_EASE), kf(0, HIT + 40)),
              tween(SX, 0.2, 1.5, HIT + 4, HIT + 40, OUT_EASE), tween(SY, 0.2, 1.5, HIT + 4, HIT + 40, OUT_EASE)),
        keyed(h["rings"][0], prop(OPACITY, kf(0, 0), kf(0, HIT + 3), kf(1, HIT + 6, OUT_EASE), kf(0, HIT + 52)),
              tween(SX, 0.3, 3, HIT + 6, HIT + 52, SHOCK), tween(SY, 0.3, 3, HIT + 6, HIT + 52, SHOCK)),
        keyed(h["rings"][1], prop(OPACITY, kf(0, 0), kf(0, HIT + 13), kf(1, HIT + 16, OUT_EASE), kf(0, HIT + 60)),
              tween(SX, 0.3, 2.4, HIT + 16, HIT + 60, SHOCK), tween(SY, 0.3, 2.4, HIT + 16, HIT + 60, SHOCK)),
        # the winner's name kicks
        keyed(name_id, prop(SX, kf(1, 0), kf(1, HIT + 12, OUT_EASE), kf(1.14, HIT + 20, INOUT), kf(1, HIT + 40)),
              prop(SY, kf(1, 0), kf(1, HIT + 12, OUT_EASE), kf(1.14, HIT + 20, INOUT), kf(1, HIT + 40))),
        # the prize pops under it
        keyed(h["chip"], tween(OPACITY, 0, 1, HIT + 34, HIT + 44, OUT_EASE)),
        # LOSER drops in on the other side and lands heavy
        keyed(lose_ids["loser"], tween(OPACITY, 0, 1, HIT + 22, HIT + 32, OUT_EASE),
              tween(Y, lose_ids["y"] - 34, lose_ids["y"], HIT + 22, HIT + 40, (0.5, 0, 0.8, 1.25)),
              tween(ROT, -0.2, 0.04, HIT + 22, HIT + 40, (0.5, 0, 0.8, 1.25))),
    ]
    # a straight switch from one result to the other clears the first
    keys += [keyed(oid, prop(OPACITY, kf(0, 0))) for oid in
             (lose_ids["word"], lose_ids["glow"], lose_ids["chip"], h["loser"])]
    # sparks fly out from WINNER
    for i, bar in enumerate(h["sparks"]):
        d = i % 3
        keys.append(keyed(bar, prop(OPACITY, kf(0, 0), kf(0, HIT + 3 + d), kf(1, HIT + 5 + d, OUT_EASE), kf(0, HIT + 34 + 2 * d)),
                          tween(X, 30, 120 + 18 * d, HIT + 3 + d, HIT + 34 + 2 * d, OUT_EASE)))
    keys.append(keyed(h["chip"], tween(SX, 0.4, 1, HIT + 34, HIT + 54, THUMB), tween(SY, 0.4, 1, HIT + 34, HIT + 54, THUMB)))
    return anim(name, 90, "oneShot", keys)


def glow_loop(name, h):
    """After the hit the winner's glow keeps breathing."""
    return anim(name, 120, "loop", [
        keyed(h["glow"], prop(OPACITY, kf(1, 0, INOUT), kf(0.65, 60, INOUT), kf(1, 120))),
        keyed(h["word"], prop(SX, kf(1, 0, INOUT), kf(1.03, 60, INOUT), kf(1, 120)),
              prop(SY, kf(1, 0, INOUT), kf(1.03, 60, INOUT), kf(1, 120))),
    ])


win = result("Win", SHIFT, YOU, THEM, YOU_HIT, THEM_HIT, YOU_NAME)
lose = result("Lose", -SHIFT, THEM, YOU, THEM_HIT, YOU_HIT, THEM_NAME)
win_glow = glow_loop("Win Glow", YOU_HIT)
lose_glow = glow_loop("Lose Glow", THEM_HIT)
prompt_on = anim("Prompt Shown", 18, "oneShot", [keyed(PILL, tween(OPACITY, 0, 1, 0, 18, OUT_EASE))])
prompt_off = anim("Prompt Hidden", 12, "oneShot", [keyed(PILL, tween(OPACITY, 1, 0, 0, 12, OUT_EASE))])


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


def on_bool(name, value, to):
    return f'''<StateTransition stateToId="{to}">
                        <TransitionViewModelCondition>
                            <TransitionPropertyViewModelComparator>
                                <BindablePropertyBoolean><DataBindContext sourcePathIds="{path(name)}" propertyKey="634"/></BindablePropertyBoolean>
                            </TransitionPropertyViewModelComparator>
                            <TransitionValueBooleanComparator value="{value}"/>
                        </TransitionViewModelCondition>
                    </StateTransition>'''


S_SLAM, S_IDLE, S_WIN, S_LOSE, S_ON, S_OFF, S_WIN_GLOW, S_LOSE_GLOW = (nid() for _ in range(8))
EVENT = nid()
machine = f'''
        <StateMachine name="Versus" id="0:7">
            <StateMachineLayer name="Main" id="{nid()}">
                <AnyState x="0" y="-160">
                    {on_trigger("replay", S_SLAM)}
                    {on_trigger("win", S_WIN)}
                    {on_trigger("lose", S_LOSE)}
                </AnyState>
                <ExitState x="600" y="-160"/>
                <EntryState x="0" y="0"><StateTransition stateToId="{S_SLAM}"/></EntryState>
                <AnimationState x="200" y="0" animationId="{ANIMS["Slam In"]}" reset="true" id="{S_SLAM}">
                    <StateTransition stateToId="{S_IDLE}" enableExitTime="true" exitTimeIsPercetange="true" exitTime="100"/>
                </AnimationState>
                <AnimationState x="400" y="0" animationId="{ANIMS["Idle"]}" id="{S_IDLE}"/>
                <AnimationState x="400" y="160" animationId="{ANIMS["Win"]}" reset="true" id="{S_WIN}">
                    <StateTransition stateToId="{S_WIN_GLOW}" enableExitTime="true" exitTimeIsPercetange="true" exitTime="100"/>
                </AnimationState>
                <AnimationState x="400" y="320" animationId="{ANIMS["Lose"]}" reset="true" id="{S_LOSE}">
                    <StateTransition stateToId="{S_LOSE_GLOW}" enableExitTime="true" exitTimeIsPercetange="true" exitTime="100"/>
                </AnimationState>
                <AnimationState x="600" y="160" animationId="{ANIMS["Win Glow"]}" id="{S_WIN_GLOW}"/>
                <AnimationState x="600" y="320" animationId="{ANIMS["Lose Glow"]}" id="{S_LOSE_GLOW}"/>
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
                <ListenerFireEvent eventId="{EVENT}"/>
            </StateMachineListenerSingle>
        </StateMachine>'''

# ---------------------------------------------------------------- the file

INSTANCE = nid()
rml = f'''<Rive version="1" kind="fragment">
    <!-- Generated by build.py. Edit that, not this. -->
    <Artboard defaultStateMachineId="0:7" viewModelId="{VM}" viewModelInstanceId="{INSTANCE}" styleId="0:5" width="{W}" height="{H}" name="Versus" id="0:2">
        <LayoutComponentStyle name="Artboard Style" id="0:5"/>
        <Fill name="Background"><SolidColor colorValue="FF04060B" name="Color"/></Fill>
        <!-- Fired when the Add your Fighter Pack pill is tapped. -->
        <Event name="addPack" id="{EVENT}"/>

        <!-- First declared paints on top. -->
        {pill_xml}
        {top_xml}
        {tiles_xml}
        {you_hit_xml}
        {them_hit_xml}
        {you_hit_labels}
        {them_hit_labels}
        {names_xml}
        {vs_xml}
        {impact_xml}
        {seam_xml}
        <!-- Photos paint over the washes; lighten keeps their black backgrounds out. -->
        {you_photo_xml}
        {them_photo_xml}
        {them_xml}
        {you_xml}
        {machine}
        {slam}
        {idle}
        {win}
        {lose}
        {win_glow}
        {lose_glow}
        {prompt_on}
        {prompt_off}
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
