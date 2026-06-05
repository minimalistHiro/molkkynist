import argparse
from pathlib import Path
import math
import random
import shutil

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "images" / "generated"
ICLOUD_DOWNLOADS = (
    Path.home() / "Library" / "Mobile Documents" / "com~apple~CloudDocs" / "Downloads"
)

BLACK = (15, 18, 14, 255)
GREEN = (58, 157, 50, 255)
GREEN_DARK = (21, 111, 40, 255)
GREEN_LIGHT = (124, 197, 73, 255)
CREAM = (255, 225, 136, 255)
HORN = (255, 234, 143, 255)
CHEEK = (255, 138, 159, 230)
BROWN = (158, 91, 29, 255)
BROWN_DARK = (97, 54, 24, 255)
BROWN_LIGHT = (198, 128, 44, 255)
WOOD = (196, 138, 74, 255)
WOOD_DARK = (112, 72, 38, 255)
SKY = (231, 245, 236, 255)
GRASS = (109, 205, 63, 255)
GRASS_DARK = (32, 136, 57, 255)
TREE = (20, 122, 70, 255)
TRUNK = (105, 73, 48, 255)


def new_rgba(size, color=(0, 0, 0, 0)):
    return Image.new("RGBA", size, color)


def draw_line(draw, xy, fill=BLACK, width=10):
    draw.line(xy, fill=fill, width=width, joint="curve")


def ellipse(draw, box, fill, outline=BLACK, width=8):
    draw.ellipse(box, fill=fill, outline=outline, width=width)


def polygon(draw, points, fill, outline=BLACK, width=8):
    draw.polygon(points, fill=fill)
    draw.line(points + [points[0]], fill=outline, width=width, joint="curve")


def rounded_rect(draw, box, radius, fill, outline=BLACK, width=7):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def add_paper_texture(img, mask, color, count=900, alpha=28, seed=0):
    random.seed(seed)
    draw = ImageDraw.Draw(img, "RGBA")
    w, h = img.size
    mask_px = mask.load()
    for _ in range(count):
        x = random.randrange(0, w)
        y = random.randrange(0, h)
        if mask_px[x, y] > 0:
            r = random.randint(1, 3)
            c = (*color[:3], random.randint(10, alpha))
            draw.ellipse((x - r, y - r, x + r, y + r), fill=c)


def draw_eye(draw, cx, cy, scale=1.0):
    r = int(23 * scale)
    ellipse(draw, (cx - r, cy - r, cx + r, cy + r), (255, 255, 255, 255), width=int(5 * scale))
    draw.ellipse((cx - r + 8, cy - r + 7, cx + r - 5, cy + r - 4), fill=(29, 39, 33, 255))
    draw.ellipse((cx - r + 14, cy - r + 10, cx - r + 24, cy - r + 20), fill=(255, 255, 255, 255))


def draw_mouth(draw, x, y, w, h):
    draw.arc((x, y, x + w, y + h), 15, 165, fill=BLACK, width=7)
    draw.pieslice((x + w * 0.22, y + h * 0.12, x + w * 0.78, y + h * 1.1), 20, 160, fill=(232, 69, 58, 255), outline=BLACK, width=5)


def draw_molkky_pin(img, x, y, scale=1.0, number=None, tilt=0):
    w = int(32 * scale)
    h = int(96 * scale)
    pin = new_rgba((w + 24, h + 24))
    pd = ImageDraw.Draw(pin, "RGBA")
    rounded_rect(pd, (12, 12, 12 + w, 12 + h), int(9 * scale), WOOD, WOOD_DARK, int(4 * scale))
    pd.line((17, 28, 10 + w, 18), fill=(240, 185, 103, 255), width=max(2, int(3 * scale)))
    pd.line((17, 48, 10 + w, 39), fill=(149, 91, 45, 120), width=max(1, int(2 * scale)))
    if number is not None:
        pd.text((12 + w * 0.35, 12 + h * 0.14), str(number), fill=WOOD_DARK)
    pin = pin.rotate(tilt, expand=True, resample=Image.Resampling.BICUBIC)
    img.alpha_composite(pin, (int(x - pin.size[0] // 2), int(y - pin.size[1])))


def draw_throwing_baton(img, x, y, length=180, angle=-24, scale=1.0):
    baton = new_rgba((length + 40, 54))
    bd = ImageDraw.Draw(baton, "RGBA")
    rounded_rect(bd, (20, 12, 20 + length, 42), 15, WOOD, WOOD_DARK, 5)
    for i in range(4):
        xx = 34 + i * 42
        bd.line((xx, 15, xx + 18, 39), fill=(127, 78, 43, 110), width=3)
    baton = baton.rotate(angle, expand=True, resample=Image.Resampling.BICUBIC)
    img.alpha_composite(baton, (int(x - baton.size[0] // 2), int(y - baton.size[1] // 2)))


def draw_green_character(size=(760, 760), scene=False):
    img = new_rgba(size)
    draw = ImageDraw.Draw(img, "RGBA")
    s = size[0] / 760
    ox = size[0] * 0.5
    oy = size[1] * 0.53

    shadow_y = oy + 270 * s
    if scene:
        draw.ellipse((ox - 178 * s, shadow_y - 23 * s, ox + 172 * s, shadow_y + 18 * s), fill=(55, 89, 70, 50))

    mask = new_rgba(size, (0, 0, 0, 0))
    md = ImageDraw.Draw(mask)

    body_box = (ox - 116 * s, oy - 20 * s, ox + 118 * s, oy + 282 * s)
    ellipse(draw, body_box, GREEN, width=int(10 * s))
    md.ellipse(body_box, fill=255)
    belly_box = (ox - 64 * s, oy + 95 * s, ox + 67 * s, oy + 230 * s)
    ellipse(draw, belly_box, CREAM, width=int(5 * s))
    md.ellipse(belly_box, fill=255)

    # Legs
    ellipse(draw, (ox - 104 * s, oy + 228 * s, ox - 21 * s, oy + 330 * s), GREEN, width=int(9 * s))
    ellipse(draw, (ox + 22 * s, oy + 218 * s, ox + 105 * s, oy + 324 * s), GREEN, width=int(9 * s))
    for dx in (-82, -55, 46, 75):
        ellipse(draw, (ox + dx * s - 10 * s, oy + 302 * s, ox + dx * s + 13 * s, oy + 333 * s), HORN, width=int(4 * s))

    # Tail
    polygon(
        draw,
        [
            (ox + 96 * s, oy + 124 * s),
            (ox + 205 * s, oy + 74 * s),
            (ox + 127 * s, oy + 174 * s),
        ],
        GREEN,
        width=int(8 * s),
    )

    # Arms: throwing pose.
    draw_line(draw, [(ox - 97 * s, oy + 80 * s), (ox - 182 * s, oy + 5 * s), (ox - 222 * s, oy - 70 * s)], width=int(18 * s))
    ellipse(draw, (ox - 248 * s, oy - 95 * s, ox - 200 * s, oy - 47 * s), GREEN, width=int(8 * s))
    draw_line(draw, [(ox + 100 * s, oy + 86 * s), (ox + 196 * s, oy + 72 * s), (ox + 256 * s, oy + 108 * s)], width=int(18 * s))
    ellipse(draw, (ox + 242 * s, oy + 90 * s, ox + 294 * s, oy + 142 * s), GREEN, width=int(8 * s))

    # Head and frill.
    head_box = (ox - 154 * s, oy - 256 * s, ox + 148 * s, oy + 37 * s)
    ellipse(draw, head_box, GREEN, width=int(10 * s))
    md.ellipse(head_box, fill=255)
    for i in range(16):
        a = math.radians(207 + i * 9.1)
        x = ox + math.cos(a) * 153 * s
        y = oy - 108 * s + math.sin(a) * 143 * s
        ellipse(draw, (x - 23 * s, y - 23 * s, x + 23 * s, y + 23 * s), HORN, width=int(7 * s))
    # Horns
    polygon(draw, [(ox - 92 * s, oy - 214 * s), (ox - 122 * s, oy - 120 * s), (ox - 52 * s, oy - 144 * s)], HORN, width=int(7 * s))
    polygon(draw, [(ox + 92 * s, oy - 214 * s), (ox + 51 * s, oy - 143 * s), (ox + 123 * s, oy - 121 * s)], HORN, width=int(7 * s))
    ellipse(draw, (ox - 24 * s, oy - 81 * s, ox + 28 * s, oy - 33 * s), HORN, width=int(6 * s))

    draw_eye(draw, ox - 60 * s, oy - 95 * s, s)
    draw_eye(draw, ox + 52 * s, oy - 98 * s, s)
    draw.ellipse((ox - 128 * s, oy - 45 * s, ox - 71 * s, oy + 13 * s), fill=CHEEK)
    draw.ellipse((ox + 71 * s, oy - 48 * s, ox + 128 * s, oy + 10 * s), fill=CHEEK)
    draw_mouth(draw, ox - 56 * s, oy - 48 * s, 113 * s, 70 * s)
    for dx in (-108, -72, 72, 108):
        draw.arc((ox + dx * s - 16 * s, oy - 132 * s, ox + dx * s + 18 * s, oy - 76 * s), 105, 245, fill=GREEN_DARK, width=int(4 * s))
    for dx in (-54, 0, 56):
        draw_line(draw, [(ox + dx * s, oy - 203 * s), (ox + dx * s * 0.9, oy - 165 * s)], fill=GREEN_DARK, width=int(5 * s))

    draw_throwing_baton(img, ox - 242 * s, oy - 126 * s, length=int(160 * s), angle=-29, scale=s)
    add_paper_texture(img, mask.convert("L"), GREEN_DARK, count=1100, seed=2)
    return img


def draw_brown_character(size=(760, 760), scene=False, with_props=True):
    img = new_rgba(size)
    draw = ImageDraw.Draw(img, "RGBA")
    s = size[0] / 760
    ox = size[0] * 0.5
    oy = size[1] * 0.55

    if scene:
        draw.ellipse((ox - 166 * s, oy + 258 * s, ox + 168 * s, oy + 303 * s), fill=(55, 89, 70, 50))

    mask = new_rgba(size)
    md = ImageDraw.Draw(mask)

    body = (ox - 116 * s, oy - 16 * s, ox + 118 * s, oy + 282 * s)
    ellipse(draw, body, BROWN, width=int(10 * s))
    md.ellipse(body, fill=255)
    belly = (ox - 73 * s, oy + 87 * s, ox + 75 * s, oy + 236 * s)
    ellipse(draw, belly, CREAM, width=int(5 * s))
    md.ellipse(belly, fill=255)

    ellipse(draw, (ox - 112 * s, oy + 230 * s, ox - 21 * s, oy + 326 * s), BROWN, width=int(9 * s))
    ellipse(draw, (ox + 22 * s, oy + 226 * s, ox + 114 * s, oy + 326 * s), BROWN, width=int(9 * s))
    for dx in (-80, -48, 51, 82):
        ellipse(draw, (ox + dx * s - 11 * s, oy + 299 * s, ox + dx * s + 15 * s, oy + 329 * s), BROWN_LIGHT, width=int(4 * s))

    # Arms: cheering and pointing toward the Mölkky pins.
    draw_line(draw, [(ox - 95 * s, oy + 78 * s), (ox - 184 * s, oy + 30 * s), (ox - 227 * s, oy - 37 * s)], width=int(19 * s))
    ellipse(draw, (ox - 250 * s, oy - 61 * s, ox - 195 * s, oy - 9 * s), BROWN, width=int(8 * s))
    draw_line(draw, [(ox + 95 * s, oy + 83 * s), (ox + 195 * s, oy + 103 * s), (ox + 254 * s, oy + 166 * s)], width=int(19 * s))
    ellipse(draw, (ox + 237 * s, oy + 142 * s, ox + 292 * s, oy + 196 * s), BROWN, width=int(8 * s))

    # Head and ears.
    ellipse(draw, (ox - 162 * s, oy - 275 * s, ox - 72 * s, oy - 183 * s), BROWN, width=int(9 * s))
    ellipse(draw, (ox + 72 * s, oy - 275 * s, ox + 162 * s, oy - 183 * s), BROWN, width=int(9 * s))
    ellipse(draw, (ox - 139 * s, oy - 252 * s, ox - 96 * s, oy - 210 * s), BROWN_LIGHT, width=int(4 * s))
    ellipse(draw, (ox + 96 * s, oy - 252 * s, ox + 139 * s, oy - 210 * s), BROWN_LIGHT, width=int(4 * s))
    head = (ox - 154 * s, oy - 256 * s, ox + 154 * s, oy + 38 * s)
    ellipse(draw, head, BROWN, width=int(10 * s))
    md.ellipse(head, fill=255)
    muzzle = (ox - 58 * s, oy - 98 * s, ox + 60 * s, oy - 12 * s)
    ellipse(draw, muzzle, CREAM, width=int(6 * s))
    draw_eye(draw, ox - 61 * s, oy - 121 * s, s)
    draw_eye(draw, ox + 61 * s, oy - 121 * s, s)
    draw.ellipse((ox - 129 * s, oy - 61 * s, ox - 71 * s, oy - 2 * s), fill=CHEEK)
    draw.ellipse((ox + 71 * s, oy - 61 * s, ox + 129 * s, oy - 2 * s), fill=CHEEK)
    draw.ellipse((ox - 24 * s, oy - 82 * s, ox + 25 * s, oy - 45 * s), fill=BLACK)
    draw_mouth(draw, ox - 52 * s, oy - 55 * s, 104 * s, 69 * s)
    for dx in (-70, -30, 28, 70):
        draw.arc((ox + dx * s - 20 * s, oy - 193 * s, ox + dx * s + 20 * s, oy - 147 * s), 205, 335, fill=BROWN_DARK, width=int(4 * s))

    # Nearby pins for the individual cutout.
    if with_props:
        for i, (px, py, tilt) in enumerate([(-188, 272, -9), (-145, 282, 7), (-103, 268, 3)]):
            draw_molkky_pin(img, ox + px * s, oy + py * s, 0.66 * s, i + 4, tilt)
    add_paper_texture(img, mask.convert("L"), BROWN_DARK, count=1250, seed=7)
    return img


def draw_background(size=(1800, 1050)):
    img = new_rgba(size, SKY)
    draw = ImageDraw.Draw(img, "RGBA")
    w, h = size
    # Soft clouds.
    for cx, cy, sc in [(260, 160, 1.0), (1280, 140, 1.25), (1500, 275, 0.75)]:
        draw.ellipse((cx - 70 * sc, cy - 25 * sc, cx + 32 * sc, cy + 35 * sc), fill=(255, 255, 250, 230), outline=(56, 64, 52, 120), width=3)
        draw.ellipse((cx - 10 * sc, cy - 52 * sc, cx + 86 * sc, cy + 32 * sc), fill=(255, 255, 250, 230), outline=(56, 64, 52, 120), width=3)
        draw.ellipse((cx + 52 * sc, cy - 18 * sc, cx + 142 * sc, cy + 35 * sc), fill=(255, 255, 250, 230), outline=(56, 64, 52, 120), width=3)

    # Trees and hills.
    draw.rectangle((0, h * 0.65, w, h), fill=GRASS)
    draw.polygon([(0, h * 0.69), (330, h * 0.59), (760, h * 0.67), (1160, h * 0.57), (w, h * 0.66), (w, h), (0, h)], fill=(133, 214, 76, 255))
    draw.polygon([(0, h * 0.74), (430, h * 0.64), (950, h * 0.73), (1420, h * 0.62), (w, h * 0.7), (w, h), (0, h)], fill=GRASS)
    for x, y, sc in [(215, 595, 1.2), (415, 630, 0.85), (1310, 595, 1.1), (1540, 640, 0.8)]:
        draw.rectangle((x - 14 * sc, y + 45 * sc, x + 15 * sc, y + 155 * sc), fill=TRUNK, outline=BLACK, width=max(3, int(5 * sc)))
        for dx, dy, r in [(-58, 9, 76), (0, -28, 92), (68, 13, 74), (7, 35, 82)]:
            draw.ellipse((x + dx * sc - r * sc, y + dy * sc - r * sc, x + dx * sc + r * sc, y + dy * sc + r * sc), fill=TREE, outline=BLACK, width=max(3, int(5 * sc)))

    # Mölkky play area.
    draw.ellipse((770, 756, 1185, 888), fill=(45, 122, 45, 45))
    pin_positions = [(895, 766, -7), (937, 777, 5), (979, 760, 3), (1020, 786, -5), (935, 835, -2), (984, 838, 6)]
    for n, (x, y, tilt) in enumerate(pin_positions, start=1):
        draw_molkky_pin(img, x, y, scale=0.78, number=n, tilt=tilt)
    draw_throwing_baton(img, 780, 825, length=155, angle=12, scale=0.9)

    # Grass texture.
    random.seed(11)
    for _ in range(850):
        x = random.randint(0, w)
        y = random.randint(int(h * 0.65), h - 12)
        length = random.randint(8, 24)
        col = random.choice([(34, 134, 51, 90), (220, 237, 73, 70), (26, 110, 48, 80)])
        draw.line((x, y, x + random.randint(-7, 8), y - length), fill=col, width=random.randint(1, 3))
    return img


def paste_center(base, overlay, center, scale=1.0):
    if scale != 1.0:
        overlay = overlay.resize((int(overlay.width * scale), int(overlay.height * scale)), Image.Resampling.LANCZOS)
    x = int(center[0] - overlay.width / 2)
    y = int(center[1] - overlay.height / 2)
    base.alpha_composite(overlay, (x, y))


def write_outputs(copy_icloud=False):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    green = draw_green_character()
    brown = draw_brown_character()
    brown_scene = draw_brown_character(with_props=False)
    bg = draw_background()
    scene = bg.copy()
    paste_center(scene, green, (640, 660), 0.88)
    paste_center(scene, brown_scene, (1225, 682), 0.82)
    scene = scene.filter(ImageFilter.UnsharpMask(radius=1, percent=105, threshold=3))

    files = {
        "molkkynist-molkky-character-green-transparent.png": green,
        "molkkynist-molkky-character-brown-transparent.png": brown,
        "molkkynist-molkky-background.png": bg,
        "molkkynist-molkky-scene.png": scene,
    }
    written = []
    for name, image in files.items():
        path = OUT_DIR / name
        image.save(path)
        written.append(path)

    if copy_icloud and ICLOUD_DOWNLOADS.exists():
        for path in written:
            shutil.copy2(path, ICLOUD_DOWNLOADS / path.name)
    return written


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--copy-icloud", action="store_true")
    args = parser.parse_args()
    for path in write_outputs(copy_icloud=args.copy_icloud):
        print(path)
