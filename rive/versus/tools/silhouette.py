"""Draws the no-photo silhouettes for the VS screen: a dark backlit bust in haze.

    python3 tools/silhouette.py male blue images/silhouette-male-blue.jpg

640x1144, the size of a Fighter Pack VS shot. Blue is your side, red is theirs.
"""
import math
import sys
from PIL import Image, ImageChops, ImageDraw, ImageFilter

W, H, SS = 640, 1144, 3
TINTS = {  # haze colour at full strength, rim colour
    "blue": ((40, 92, 190), (130, 175, 255)),
    "red": ((170, 40, 52), (255, 140, 150)),
}


def bez(p0, p1, p2, p3, n=40):
    return [((1-t)**3*p0[0]+3*(1-t)**2*t*p1[0]+3*(1-t)*t*t*p2[0]+t**3*p3[0],
             (1-t)**3*p0[1]+3*(1-t)**2*t*p1[1]+3*(1-t)*t*t*p2[1]+t**3*p3[1]) for t in [i/n for i in range(n+1)]]


def mirror(pts):
    return [(W - x, y) for x, y in reversed(pts)]


def figure(gender):
    S = lambda pts: [(x * SS, y * SS) for x, y in pts]
    mask = Image.new("L", (W * SS, H * SS), 0)
    d = ImageDraw.Draw(mask)
    if gender == "female":
        # hair falling to just above the shoulders with a small flick, narrower shoulders
        right = (bez((320, 150), (400, 150), (440, 210), (442, 300)) + bez((442, 300), (444, 380), (436, 430), (452, 474))
                 + [(446, 486), (410, 480)] + bez((410, 480), (380, 476), (360, 472), (357, 492))
                 + bez((357, 500), (380, 530), (480, 535), (520, 600)) + bez((520, 600), (560, 660), (585, 780), (600, 900))
                 + [(610, H + 10)])
        d.polygon(S(mirror(right) + right), fill=255)
        return mask.filter(ImageFilter.GaussianBlur(1.2 * SS)).resize((W, H), Image.LANCZOS)
    else:
        head = (bez((320, 168), (420, 168), (414, 330), (372, 392)) + bez((372, 392), (350, 428), (290, 428), (268, 392))
                + bez((268, 392), (226, 330), (220, 168), (320, 168)))
        d.polygon(S(head), fill=255)
        d.polygon(S([(286, 390), (354, 390), (364, 480), (276, 480)]), fill=255)
        left = bez((280, 440), (262, 492), (120, 505), (70, 590)) + bez((70, 590), (30, 650), (10, 760), (-10, 900)) + [(-10, H + 10)]
    d.polygon(S(left + [(W - left[-1][0], H + 10)] + mirror(left)[1:]), fill=255)
    return mask.filter(ImageFilter.GaussianBlur(1.2 * SS)).resize((W, H), Image.LANCZOS)


def draw(gender, tint, out):
    haze, rim_rgb = TINTS[tint]
    mask = figure(gender)
    bg = Image.new("RGB", (W, H))
    px = bg.load()
    for y in range(H):
        for x in range(W):
            k = max(0.0, 1 - math.hypot((x - 320) / 360, (y - 360) / 420)) ** 1.6
            v = min(1.0, k + 0.25 * math.exp(-((y - 980) / 260) ** 2))
            px[x, y] = tuple(int(6 + c * v * 0.55) for c in haze)
    fig = Image.new("RGB", (W, H))
    fp = fig.load()
    for y in range(H):
        t = y / H
        c = (int(14 - 8 * t), int(16 - 9 * t), int(22 - 12 * t))
        for x in range(W):
            fp[x, y] = c
    edge = ImageChops.subtract(mask, mask.filter(ImageFilter.MinFilter(9)))
    rim = edge.filter(ImageFilter.GaussianBlur(2.5)).point(lambda v: min(255, int(v * 1.5)))
    rim = ImageChops.multiply(rim, Image.linear_gradient("L").resize((W, H)).point(lambda v: 255 - v))
    img = Image.composite(fig, bg, mask)
    img = Image.composite(Image.new("RGB", (W, H), rim_rgb), img, rim.point(lambda v: int(v * 0.6)))
    img.save(out, quality=86)


if __name__ == "__main__":
    draw(sys.argv[1], sys.argv[2], sys.argv[3])
