#!/usr/bin/env python3
"""Build the link-preview card (Sophia (round glasses, raised finger)) and its animated twin.

    pip install pillow numpy scipy opencv-python-headless
    python3 scripts/build-og-card.py

Inputs : public/images/sophia/lab-single-tail.webp  (the lab-section Sophia)
Outputs: assets/og-portfolio.png            (1200x630, picked up by scripts/generate-og.mjs)
         public/og-portfolio-animated.gif   (800x420 loop, same artwork)

Everything, text included, is rasterised here so the card does not depend on
the fonts installed on the build machine. Edit the constants, rerun, commit
the PNG.
"""
import math, random, sys
from pathlib import Path
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy.ndimage import map_coordinates

ROOT = Path(__file__).resolve().parent.parent
W, H = 1200, 630
UP = 3                     # supersample of the sprite while editing
SC = 2.0                   # sprite px -> card px (zoomed in: ears run off the top, like the meme)
X0, Y0 = 550, 340 - 267 * SC   # card x of sprite x=120; card y of sprite y=0 (eyes land at y~340)

EYES = [(232, 256), (309, 277)]   # sprite coords, measured on the 640x640 sheet
LENS_R, FRAME, MAG = 34, 6.5, 1.42
INK = (17, 20, 43, 255)
CAPTION = (124, 200, 245)

def font(name, size):
    for p in (name, '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'):
        try: return ImageFont.truetype(p, size)
        except OSError: pass
INTER = '/usr/share/fonts/opentype/inter/Inter-{}.otf'

# ---------------------------------------------------------------- Sophia head
def load_head():
    sp = Image.open(ROOT / 'public/images/sophia/lab-single-tail.webp').convert('RGBA')
    rgb = cv2.cvtColor(np.array(sp.convert('RGB')), cv2.COLOR_RGB2BGR)
    a = np.array(sp.getchannel('A'))
    mask = np.zeros(a.shape, np.uint8)             # the pen: remove it, the paw stays
    cv2.line(mask, (153, 281), (219, 364), 255, 15)
    cv2.line(mask, (150, 280), (160, 292), 255, 17)
    mask[:, :] = np.where(np.arange(a.shape[0])[:, None] < 366, mask, 0)
    rgb = cv2.inpaint(rgb, mask, 5, cv2.INPAINT_TELEA)
    a = cv2.inpaint(a, mask, 5, cv2.INPAINT_TELEA)
    out = Image.fromarray(cv2.cvtColor(rgb, cv2.COLOR_BGR2RGB)).convert('RGBA')
    out.putalpha(Image.fromarray(a))
    return out.resize((sp.width * UP, sp.height * UP), Image.LANCZOS)

def magnify(img):
    arr = np.array(img).astype(np.float32)
    h, w = arr.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    sx, sy = xx.copy(), yy.copy()
    for ex, ey in EYES:
        cx, cy, r = ex * UP, ey * UP, LENS_R * UP
        d = np.hypot(xx - cx, yy - cy)
        inside = d < r
        k = np.where(inside, 1 / (MAG - .22 * (d / r) ** 2), 1)      # gentle barrel
        sx = np.where(inside, cx + (xx - cx) * k, sx)
        sy = np.where(inside, cy + (yy - cy) * k, sy)
    out = np.stack([map_coordinates(arr[..., c], [sy, sx], order=1, mode='nearest') for c in range(4)], -1)
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))

def glasses_layer(glint=None):
    """Frames, tint, rim shadow, highlights. glint: 0..1 sweep position or None."""
    L = Image.new('RGBA', (640 * UP, 640 * UP), (0, 0, 0, 0))
    d = ImageDraw.Draw(L)
    (lx, ly), (rx, ry) = EYES
    u = lambda v: v * UP
    # temples + bridge
    ang = math.atan2(ry - ly, rx - lx)
    ca, sa = math.cos(ang), math.sin(ang)
    outer = LENS_R + FRAME / 2
    d.line([(u(lx - ca * outer), u(ly - sa * outer)), (u(lx - ca * outer - 40), u(ly - sa * outer - 12))], fill=INK, width=int(u(5)))
    d.line([(u(rx + ca * outer), u(ry + sa * outer)), (u(rx + ca * outer + 22), u(ry + sa * outer - 4))], fill=INK, width=int(u(5)))
    d.line([(u(lx + ca * outer), u(ly + sa * outer)), (u(rx - ca * outer), u(ry - sa * outer))], fill=INK, width=int(u(7)))
    for (cx, cy) in EYES:
        # glass: faint cool tint + inner shadow ring
        glass = Image.new('RGBA', L.size, (0, 0, 0, 0))
        gd = ImageDraw.Draw(glass)
        gd.ellipse([u(cx - LENS_R), u(cy - LENS_R), u(cx + LENS_R), u(cy + LENS_R)], fill=(200, 225, 255, 34))
        for i in range(7):
            gd.ellipse([u(cx - LENS_R + i * .6), u(cy - LENS_R + i * .6), u(cx + LENS_R - i * .6), u(cy + LENS_R - i * .6)],
                       outline=(10, 14, 40, 20 - i * 2), width=int(u(1.3)))
        L.alpha_composite(glass)
        d.ellipse([u(cx - LENS_R - FRAME / 2), u(cy - LENS_R - FRAME / 2), u(cx + LENS_R + FRAME / 2), u(cy + LENS_R + FRAME / 2)],
                  outline=INK, width=int(u(FRAME)))
        # fixed glare: the two white crescents of the meme
        for r0, a0, a1, wd, al in ((LENS_R - 6, 205, 262, 4.2, 235), (LENS_R - 13, 214, 246, 2.6, 190)):
            d.arc([u(cx - r0), u(cy - r0), u(cx + r0), u(cy + r0)], a0, a1, fill=(255, 255, 255, al), width=int(u(wd)))
        d.ellipse([u(cx + 14), u(cy + 18), u(cx + 21), u(cy + 25)], fill=(255, 255, 255, 120))
        if glint is not None:                              # moving sparkle band
            band = Image.new('RGBA', L.size, (0, 0, 0, 0))
            bd = ImageDraw.Draw(band)
            gx = cx - LENS_R * 1.6 + glint * LENS_R * 3.2
            bd.polygon([(u(gx - 5), u(cy - LENS_R)), (u(gx + 3), u(cy - LENS_R)), (u(gx + 14), u(cy + LENS_R)), (u(gx + 6), u(cy + LENS_R))], fill=(255, 255, 255, 120))
            m = Image.new('L', L.size, 0)
            ImageDraw.Draw(m).ellipse([u(cx - LENS_R), u(cy - LENS_R), u(cx + LENS_R), u(cy + LENS_R)], fill=255)
            band.putalpha(Image.composite(band.getchannel('A'), Image.new('L', L.size, 0), m))
            L.alpha_composite(band)
    return L

PIVOT = (203, 338)
LEAN = 26                  # finger leans toward the nose, like the meme
def finger_layer(angle=0.0):
    """Navy paw finger raised in front of the face (the meme's pointing hand)."""
    size = (640 * UP, 640 * UP)
    u = lambda v: v * UP
    cx, top, bot = 204, 280, 356
    mask = Image.new('L', size, 0)
    md = ImageDraw.Draw(mask)
    md.polygon([(u(cx - 14), u(bot)), (u(cx - 12), u(top + 12)), (u(cx + 11), u(top + 12)), (u(cx + 15), u(bot))], fill=255)
    md.ellipse([u(cx - 12), u(top), u(cx + 11), u(top + 26)], fill=255)
    md.ellipse([u(cx - 15), u(top + 56), u(cx + 17), u(top + 84)], fill=255)          # knuckle swell
    outline = mask.filter(ImageFilter.MaxFilter(UP * 3 + 1 if (UP * 3) % 2 == 0 else UP * 3)).filter(ImageFilter.GaussianBlur(UP * .5))
    mask = mask.filter(ImageFilter.GaussianBlur(UP * .6))
    xs = (np.arange(size[0], dtype=np.float32) / UP - (cx - 15)) / 31.0           # 0..1 across the finger
    xs = np.clip(xs, 0, 1)[None, :].repeat(size[1], 0)
    ramp = lambda a, b, c: a + (b - a) * np.minimum(xs * 2, 1) + (c - b) * np.maximum(xs * 2 - 1, 0)
    ys = (np.arange(size[1], dtype=np.float32)[:, None] / UP - top) / (bot - top)
    rgb = np.stack([ramp(70, 38, 20), ramp(90, 50, 27), ramp(176, 118, 74)], -1) * (1 - .25 * np.clip(ys, 0, 1))[..., None]
    body = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).convert('RGBA'); body.putalpha(mask)
    L = Image.new('RGBA', size, (0, 0, 0, 0))
    edge = Image.new('RGBA', size, (11, 15, 46, 255)); edge.putalpha(outline)
    L.alpha_composite(edge); L.alpha_composite(body)
    d = ImageDraw.Draw(L)
    d.ellipse([u(cx - 6), u(top + 3), u(cx + 6), u(top + 15)], fill=(92, 112, 200, 150))         # tip pad
    d.arc([u(cx - 12), u(top + 52), u(cx + 12), u(top + 66)], 15, 165, fill=(14, 18, 54, 200), width=int(u(1.5)))
    rnd = random.Random(3)                                                                         # a few fur wisps at the base
    for _ in range(26):
        yy = rnd.uniform(bot - 26, bot - 2); sd = rnd.choice((-1, 1)); x = cx + sd * rnd.uniform(11, 15)
        d.line([(u(x), u(yy)), (u(x + sd * rnd.uniform(2, 4)), u(yy - rnd.uniform(2, 5)))], fill=(86, 106, 196, 140), width=int(u(.9)))
    ang = LEAN + angle
    return L.rotate(-ang, resample=Image.BICUBIC, center=(u(PIVOT[0]), u(PIVOT[1])))

# ----------------------------------------------------------------- card
def _sparkle(d, x, y, s, c):
    d.polygon([(x, y - s * 1.6), (x + s * .38, y - s * .38), (x + s * 1.6, y), (x + s * .38, y + s * .38),
               (x, y + s * 1.6), (x - s * .38, y + s * .38), (x - s * 1.6, y), (x - s * .38, y - s * .38)], fill=c)

CONSTELLATIONS = [      # (points, lit?) — loose Orion / Cassiopeia-like shapes; kept off the text and behind Sophia
    [(1010, 118), (1066, 84), (1120, 136), (1098, 204), (1152, 250)],
    [(70, 54), (132, 92), (206, 60), (268, 104), (336, 70)],
    [(470, 530), (520, 566), (590, 548), (648, 596)],
]
COMET_HEAD, COMET_DIR, COMET_LEN = (482, 470), (0.86, -0.51), 470     # head, unit vector toward the tail, tail length

def comet_layer(t):
    """A discreet comet: soft blue-white tail curving back toward the upper right, hidden behind Sophia."""
    L = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    dx, dy = COMET_DIR
    drift = 16 * math.sin(t * 2 * math.pi) if t else 0
    hx, hy = COMET_HEAD[0] + dx * drift, COMET_HEAD[1] + dy * drift
    dust = Image.new('RGBA', (W, H), (0, 0, 0, 0)); dd = ImageDraw.Draw(dust)
    core = Image.new('RGBA', (W, H), (0, 0, 0, 0)); cd = ImageDraw.Draw(core)
    n = 90
    for i in range(n):
        u = i / n
        bend = 34 * u * u                                   # the tail curves a little
        x = hx + dx * COMET_LEN * u - dy * bend * -1
        y = hy + dy * COMET_LEN * u + dx * bend * -1
        r = 17 * (1 - u) ** 1.2 + 2
        dd.ellipse([x - r, y - r, x + r, y + r], fill=(120, 150, 255, int(34 * (1 - u) ** 1.5)))
        r2 = 5.5 * (1 - u) ** 1.1 + .6
        cd.ellipse([x - r2, y - r2, x + r2, y + r2], fill=(205, 225, 255, int(190 * (1 - u) ** 1.7)))
    L.alpha_composite(dust.filter(ImageFilter.GaussianBlur(9)))
    L.alpha_composite(core.filter(ImageFilter.GaussianBlur(1.6)))
    halo = Image.new('RGBA', (W, H), (0, 0, 0, 0)); hd = ImageDraw.Draw(halo)
    hd.ellipse([hx - 22, hy - 22, hx + 22, hy + 22], fill=(170, 200, 255, 120))
    L.alpha_composite(halo.filter(ImageFilter.GaussianBlur(10)))
    ImageDraw.Draw(L).ellipse([hx - 4.2, hy - 4.2, hx + 4.2, hy + 4.2], fill=(255, 252, 240, 255))
    return L

def background(t=0.0):
    ys = np.linspace(0, 1, H)[:, None]; xs = np.linspace(0, 1, W)[None, :]
    base = np.zeros((H, W, 3), np.float32)
    for i, (a, b) in enumerate(zip((6, 8, 28), (20, 26, 66))):
        base[..., i] = a + (b - a) * (0.55 * ys + 0.45 * xs)
    blob = lambda cx, cy, rx, ry: np.exp(-(((xs - cx) / rx) ** 2 + ((ys - cy) / ry) ** 2))
    for (cx, cy, rx, ry), col in (((.72, .52, .34, .62), (70, 52, 30)),      # warm moonlight behind Sophia
                                  ((.12, .10, .30, .30), (46, 28, 96)),      # violet nebula, top left
                                  ((.93, .94, .28, .30), (18, 52, 120)),     # blue nebula, bottom right
                                  ((.50, .02, .28, .16), (96, 30, 70))):     # rose wisp across the top
        g = blob(cx, cy, rx, ry)
        for i, c in enumerate(col): base[..., i] += g * c
    band = np.exp(-(((ys - (1 - xs * .95) - .02) / .09) ** 2))                  # a faint Milky Way diagonal
    for i, c in enumerate((26, 30, 46)): base[..., i] += band * c
    img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8)).convert('RGBA')
    d = ImageDraw.Draw(img)
    rnd = random.Random(11)
    def clear(x, y):          # text column, and the area Sophia covers
        return not ((x < 470 and 130 < y < 430) or (x < 300 and y > 540) or (x > 575 and y > 130))
    for _ in range(260):      # star dust, denser along the Milky Way
        x = rnd.randint(4, W - 4)
        y = rnd.randint(4, H - 4)
        if rnd.random() < .5:
            y = int(min(H - 4, max(4, (1 - x / W * .95) * H + rnd.gauss(0, 46))))
        if not clear(x, y): continue
        r = rnd.choice((.7, .9, 1.1, 1.4))
        a = rnd.randint(70, 190)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(235, 235, 255, a))
    for _ in range(64):       # twinkling sparkles
        x, y, ph, sz = rnd.randint(30, W - 30), rnd.randint(20, H - 20), rnd.random() * 6.28, rnd.choice((3, 4, 5, 7))
        tw = .45 + .55 * (.5 + .5 * math.sin(ph + t * 6.283))
        if clear(x, y): _sparkle(d, x, y, sz, (255, 214, 140, int(190 * tw)))
    img.alpha_composite(comet_layer(t))
    d = ImageDraw.Draw(img)
    for pts in CONSTELLATIONS:
        d.line(pts, fill=(255, 214, 140, 62), width=1)
        for x, y in pts:
            d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=(255, 214, 140, 215))
            d.ellipse([x - 7, y - 7, x + 7, y + 7], outline=(255, 214, 140, 60), width=1)
    return img

def text_layer():
    T = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(T)
    d.text((60, 150), 'Kauê Alencar', font=font('/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf', 58), fill=(255, 247, 232, 255))
    d.line([(62, 238), (150, 238)], fill=(255, 214, 140, 200), width=2)
    sub = font(INTER.format('Regular'), 28)
    for i, line in enumerate(('Technical Writing', 'Gestão da Informação', 'Storytelling')):
        y = 270 + i * 48
        d.polygon([(66, y + 17), (73, y + 10), (80, y + 17), (73, y + 24)], fill=(255, 214, 140, 255))
        d.text((96, y), line, font=sub, fill=(222, 228, 247, 255))
    d.text((62, 560), 'kaue.pages.dev', font=font(INTER.format('Medium'), 22), fill=(255, 214, 140, 235))
    return T

_HEAD = None
def compose(t=None):
    """t=None: static card. Otherwise animation phase 0..1."""
    global _HEAD
    if _HEAD is None:
        _HEAD = magnify(load_head())
    wag = 0.0; glint = None
    if t is not None:
        wag = 8 * math.sin(t * 4 * math.pi) * (1 if t < .62 else math.cos((t - .62) / .38 * math.pi / 2))
        glint = max(0.0, min(1.0, (t - .5) / .4)) if .5 <= t <= .9 else None
    sprite = _HEAD.copy()
    sprite.alpha_composite(glasses_layer(glint))
    sprite.alpha_composite(finger_layer(wag))
    k = SC / UP
    sprite = sprite.resize((round(sprite.width * k), round(sprite.height * k)), Image.LANCZOS)
    # soft contact shadow so she lifts off the sky
    card = background(0 if t is None else t)
    sh = Image.new('RGBA', card.size, (0, 0, 0, 0))
    sh.paste(sprite, (round(X0 - 120 * SC), round(Y0)), sprite)
    shadow = sh.getchannel('A').filter(ImageFilter.GaussianBlur(14))
    dark = Image.new('RGBA', card.size, (4, 6, 24, 0)); dark.putalpha(shadow.point(lambda v: int(v * .55)))
    card.alpha_composite(dark, (0, 10))
    card.alpha_composite(sh)
    card.alpha_composite(text_layer())
    return card.convert('RGB')

if __name__ == '__main__':
    out = ROOT / 'assets/og-portfolio.png'
    compose().save(out, optimize=True)
    print('wrote', out.relative_to(ROOT))
    if '--no-gif' in sys.argv: sys.exit()
    n = 28
    frames = [compose(i / n).resize((800, 420), Image.LANCZOS) for i in range(n)]
    pal = frames[0].quantize(colors=160, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    q = [f.quantize(palette=pal, dither=Image.Dither.NONE) for f in frames]
    gif = ROOT / 'public/og-portfolio-animated.gif'
    q[0].save(gif, save_all=True, append_images=q[1:], duration=90, loop=0, optimize=False, disposal=1)
    print('wrote', gif.relative_to(ROOT), gif.stat().st_size // 1024, 'KB')
