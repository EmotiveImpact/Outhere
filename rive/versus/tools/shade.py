"""Turns a shadow-figure runner photo into the VS card's no-photo fallback.

    python3 tools/shade.py SOURCE.jpg male|female blue|red OUT.jpg

The sources are the Fighter Pack shadow figures in
/mnt/project-files/outhere-assets/ai-avatar/silhouette-{male,female}.jpg.
Each is made grey the way the Fighter Pack mock shows it, then given a light
wash of its side's colour, blue for you and red for them. Rive scales the
result to cover the photo box, so the size only needs to be generous.
"""
import sys

from PIL import Image, ImageEnhance, ImageOps

# grey settings from the mock: male grayscale brightness .75; female brightness 1.1 contrast 1.4
LOOK = {"male": (0.75, 1.0), "female": (1.1, 1.4)}
TINT = {"blue": (79, 155, 255), "red": (255, 77, 85)}
STRENGTH = 0.18   # how much of the side's colour the grey takes on; Edem wants tints light


def shade(src, gender, side, out):
    im = ImageOps.grayscale(Image.open(src).convert("RGB"))
    bright, contrast = LOOK[gender]
    im = ImageEnhance.Contrast(ImageEnhance.Brightness(im).enhance(bright)).enhance(contrast)
    tinted = ImageOps.colorize(im, black=(0, 0, 0), white=TINT[side])
    im = Image.blend(im.convert("RGB"), tinted, STRENGTH)
    w, h = im.size
    if w > 720:
        im = im.resize((720, round(h * 720 / w)), Image.LANCZOS)
    im.save(out, quality=84, optimize=True)


if __name__ == "__main__":
    shade(*sys.argv[1:5])
