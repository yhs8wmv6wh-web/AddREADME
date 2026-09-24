"""Erzeugt alle Standbilder und Texttafeln prozedural (keine Fotos, keine API).
Ausgabe: assets/images/*.png in 3840x2160 (2x, damit Ken Burns sauber bleibt)."""
import math
import os
import random

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

W, H = 3840, 2160
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "assets", "images")
FONTS = os.path.join(HERE, "assets", "fonts")
BEBAS = os.path.join(FONTS, "BebasNeue-Regular.ttf")
SERIF = os.path.join(FONTS, "PlayfairDisplay.ttf")
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
# Letterbox 2.39:1 -> sichtbarer Bereich (bei 4K)
SAFE_TOP, SAFE_BOT = 276, 1884

rng = random.Random(1955)


# ---------- Helfer ----------
def vgrad(stops):
    """Vertikaler Verlauf. stops = [(y 0..1, (r,g,b)), ...]"""
    ys = np.linspace(0, 1, H)
    arr = np.zeros((H, W, 3), np.float32)
    for c in range(3):
        col = np.interp(ys, [s[0] for s in stops], [s[1][c] for s in stops])
        arr[:, :, c] = col[:, None]
    return Image.fromarray(arr.clip(0, 255).astype(np.uint8), "RGB")


def radial(cx, cy, r, color, power=2.0, strength=1.0, sx=1.0, sy=1.0):
    """Additives radiales Licht als RGB-Bild."""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.sqrt(((xx - cx) / (r * sx)) ** 2 + ((yy - cy) / (r * sy)) ** 2)
    a = np.clip(1 - d, 0, 1) ** power * strength
    arr = np.stack([a * color[i] for i in range(3)], -1)
    return Image.fromarray(arr.clip(0, 255).astype(np.uint8), "RGB")


def add(img, light):
    return ImageChops.add(img, light)


def cone(top, width_top, bottom_y, width_bottom, color, alpha=90, blur=60):
    """Lichtkegel (Spot) als additive Ebene."""
    layer = Image.new("RGB", (W, H), 0)
    d = ImageDraw.Draw(layer)
    x, y = top
    c = tuple(int(v * alpha / 255) for v in color)
    d.polygon([(x - width_top / 2, y), (x + width_top / 2, y),
               (x + width_bottom / 2, bottom_y), (x - width_bottom / 2, bottom_y)], fill=c)
    return layer.filter(ImageFilter.GaussianBlur(blur))


def haze(img, amount=18, seed=0):
    r = np.random.default_rng(seed)
    n = r.random((H // 16, W // 16)).astype(np.float32)
    n = Image.fromarray((n * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)
    n = n.filter(ImageFilter.GaussianBlur(40))
    arr = np.asarray(img).astype(np.float32) + (np.asarray(n)[:, :, None] / 255.0 - 0.5) * amount
    return Image.fromarray(arr.clip(0, 255).astype(np.uint8))


def silhouette_layer():
    return Image.new("L", (W, H), 0)


def paste_color(img, mask, color):
    img.paste(Image.new("RGB", (W, H), color), (0, 0), mask)


def font(path, size):
    return ImageFont.truetype(path, size)


def center_text(d, text, f, y, fill, spacing=0):
    if spacing:
        widths = [d.textlength(ch, font=f) for ch in text]
        total = sum(widths) + spacing * (len(text) - 1)
        x = (W - total) / 2
        for ch, w in zip(text, widths):
            d.text((x, y), ch, font=f, fill=fill)
            x += w + spacing
    else:
        w = d.textlength(text, font=f)
        d.text(((W - w) / 2, y), text, font=f, fill=fill)


# ---------- Bilder ----------
def ruhr_dusk():
    img = vgrad([(0, (18, 22, 48)), (0.45, (70, 50, 80)), (0.66, (200, 95, 45)), (0.76, (240, 150, 70)), (1, (40, 20, 20))])
    img = add(img, radial(W * 0.62, H * 0.72, 900, (255, 170, 80), 2.2, 0.8, sy=0.6))
    img = add(img, radial(W * 0.62, H * 0.72, 140, (255, 230, 170), 1.2, 1.0))
    # Rauch
    smoke = Image.new("L", (W, H), 0)
    sd = ImageDraw.Draw(smoke)
    chimneys = [(700, 900), (980, 820), (2900, 760), (3200, 880)]
    for cx, top in chimneys:
        for i in range(14):
            rr = 60 + i * 28
            x = cx + i * 70 + rng.randint(-20, 20)
            y = top - i * 45
            sd.ellipse([x - rr, y - rr * 0.6, x + rr, y + rr * 0.6], fill=max(0, 90 - i * 6))
    smoke = smoke.filter(ImageFilter.GaussianBlur(50))
    img = Image.composite(Image.new("RGB", (W, H), (90, 80, 90)), img, smoke)
    m = silhouette_layer()
    d = ImageDraw.Draw(m)
    ground = int(H * 0.80)
    d.rectangle([0, ground, W, H], fill=255)
    # Häuserreihen
    x = 0
    houses = []
    while x < W:
        w = rng.randint(140, 260)
        h = rng.randint(120, 220)
        d.rectangle([x, ground - h, x + w, ground], fill=255)
        d.polygon([(x - 10, ground - h), (x + w / 2, ground - h - rng.randint(60, 110)), (x + w + 10, ground - h)], fill=255)
        houses.append((x, w, h))
        x += w + rng.randint(0, 30)
    # Schornsteine
    for cx, top in chimneys:
        d.polygon([(cx - 38, ground), (cx - 22, top), (cx + 22, top), (cx + 38, ground)], fill=255)
    # Fördertürme
    for fx, fh in [(1700, 1000), (2350, 880)]:
        base = ground
        topy = base - fh
        lw = 26
        d.line([(fx - 170, base), (fx - 40, topy)], fill=255, width=lw)
        d.line([(fx + 170, base), (fx + 40, topy)], fill=255, width=lw)
        d.line([(fx + 40, topy), (fx + 420, base)], fill=255, width=lw)
        for k in range(1, 7):
            yy = base - fh * k / 7
            t = k / 7
            xl = fx - 170 + 130 * t
            xr = fx + 170 - 130 * t
            d.line([(xl, yy), (xr, yy)], fill=255, width=12)
            d.line([(xl, yy), (xr, yy + fh / 7)], fill=255, width=8)
        d.rectangle([fx - 60, topy - 30, fx + 60, topy + 20], fill=255)
        for wx in (fx - 55, fx + 55):
            d.ellipse([wx - 95, topy - 170, wx + 95, topy + 20], outline=255, width=16)
            d.line([(wx - 95, topy - 75), (wx + 95, topy - 75)], fill=255, width=6)
            d.line([(wx, topy - 170), (wx, topy + 20)], fill=255, width=6)
        d.rectangle([fx - 300, base - 260, fx + 300, base], fill=255)
    paste_color(img, m, (12, 8, 12))
    # beleuchtete Fenster
    d2 = ImageDraw.Draw(img)
    for (hx, hw, hh) in houses:
        for _ in range(rng.randint(0, 2)):
            if rng.random() < 0.55:
                wx = hx + rng.randint(20, max(21, hw - 60))
                wy = ground - rng.randint(40, max(41, hh - 50))
                d2.rectangle([wx, wy, wx + 34, wy + 44], fill=(255, 190, 90))
    glow = img.filter(ImageFilter.GaussianBlur(25))
    img = ImageChops.screen(img, ImageChops.multiply(glow, Image.new("RGB", (W, H), (120, 90, 60))))
    return haze(img, 14, 1)


def window_night():
    img = vgrad([(0, (14, 18, 30)), (1, (8, 10, 18))])
    d = ImageDraw.Draw(img)
    # Ziegelwand
    bh, bw = 70, 220
    for row in range(H // bh + 1):
        off = (row % 2) * bw // 2
        for col in range(-1, W // bw + 2):
            x = col * bw + off
            y = row * bh
            shade = rng.randint(22, 34)
            d.rectangle([x + 6, y + 6, x + bw - 6, y + bh - 6], fill=(shade + 6, shade, shade + 4))
    # Fenster
    wx0, wy0, wx1, wy1 = 1400, 520, 2440, 1640
    d.rectangle([wx0 - 50, wy0 - 50, wx1 + 50, wy1 + 70], fill=(20, 18, 20))
    inner = vgrad([(0, (120, 70, 30)), (0.6, (230, 150, 70)), (1, (150, 80, 35))]).crop((wx0, wy0, wx1, wy1))
    img.paste(inner, (wx0, wy0))
    img = add(img, radial(1700, 900, 500, (255, 200, 120), 1.6, 0.9))
    d = ImageDraw.Draw(img)
    # Klavier (Pianino) im Fenster
    col = (25, 14, 10)
    d.rectangle([1650, 1080, 2250, 1640], fill=col)
    d.rectangle([1600, 1260, 2300, 1310], fill=col)
    d.rectangle([1660, 1300, 1690, 1640], fill=col)
    d.rectangle([2210, 1300, 2240, 1640], fill=col)
    # Notenständer + Lampe
    d.rectangle([1800, 1000, 2100, 1080], fill=col)
    d.line([(2150, 1080), (2150, 900)], fill=col, width=14)
    d.polygon([(2090, 900), (2210, 900), (2180, 830), (2120, 830)], fill=col)
    img = add(img, radial(2150, 910, 160, (255, 230, 170), 1.3, 1.0))
    d = ImageDraw.Draw(img)
    # Fensterkreuz + Vorhang
    fc = (18, 16, 18)
    d.rectangle([wx0 + (wx1 - wx0) // 2 - 22, wy0, wx0 + (wx1 - wx0) // 2 + 22, wy1], fill=fc)
    d.rectangle([wx0, wy0 + 360, wx1, wy0 + 400], fill=fc)
    for i in range(6):
        d.rectangle([wx0 + i * 40, wy0, wx0 + i * 40 + 26, wy1], fill=(90 - i * 8, 40, 30))
    # Lichtfall auf die Wand
    img = add(img, cone((1920, 1640), 1040, 2160, 1900, (255, 170, 90), 60, 80))
    return haze(img, 10, 2)


def piano_keys():
    kw = 180
    n = W * 2 // kw + 2
    base = Image.new("RGB", (W * 2, H), (8, 6, 6))
    d = ImageDraw.Draw(base)
    top, bot = 500, 1900
    for i in range(n):
        x = i * kw
        d.rectangle([x + 4, top, x + kw - 4, bot], fill=(236, 226, 205))
    pattern = [1, 1, 0, 1, 1, 1, 0]
    for i in range(n):
        if pattern[i % 7]:
            x = (i + 1) * kw - 55
            d.rectangle([x, top - 10, x + 110, top + 850], fill=(14, 12, 12))
            d.rectangle([x + 18, top, x + 92, top + 820], fill=(40, 36, 34))
    d.rectangle([0, 0, W * 2, top - 10], fill=(40, 16, 10))
    img = base.resize((W, H), Image.LANCZOS) if False else base.crop((0, 0, W, H))
    # Perspektive: oben schmaler
    coeffs = find_coeffs([(0, 0), (W, 0), (W, H), (0, H)],
                         [(-700, 0), (W + 700, 0), (W, H), (0, H)])
    wide = base.crop((0, 0, W, H))
    img = wide.transform((W, H), Image.PERSPECTIVE, coeffs, Image.BICUBIC)
    # warmes Seitenlicht
    shade = vgrad([(0, (0, 0, 0)), (1, (0, 0, 0))])
    arr = np.asarray(img).astype(np.float32)
    xs = np.linspace(0, 1, W)
    light = (0.25 + 0.95 * np.exp(-((xs - 0.35) ** 2) / 0.08))[None, :, None]
    arr = arr * light * np.array([1.05, 0.88, 0.7])
    img = Image.fromarray(arr.clip(0, 255).astype(np.uint8))
    # Tiefenunschärfe oben
    blur = img.filter(ImageFilter.GaussianBlur(30))
    mask = vgrad([(0, (255, 255, 255)), (0.4, (0, 0, 0)), (1, (0, 0, 0))]).convert("L")
    img = Image.composite(blur, img, mask)
    del shade
    return haze(img, 8, 3)


def find_coeffs(pa, pb):
    matrix = []
    for p1, p2 in zip(pa, pb):
        matrix.append([p1[0], p1[1], 1, 0, 0, 0, -p2[0] * p1[0], -p2[0] * p1[1]])
        matrix.append([0, 0, 0, p1[0], p1[1], 1, -p2[1] * p1[0], -p2[1] * p1[1]])
    A = np.array(matrix, dtype=np.float64)
    B = np.array(pb, dtype=np.float64).reshape(8)
    return np.linalg.solve(A, B).tolist()


def curtains(img, x0, x1, top, bot, color=(120, 12, 18)):
    arr = np.asarray(img).astype(np.float32)
    xs = np.arange(x0, x1)
    fold = 0.45 + 0.55 * (0.5 + 0.5 * np.sin((xs - x0) / 55.0)) ** 1.5
    for c in range(3):
        arr[top:bot, x0:x1, c] = color[c] * fold[None, :]
    return Image.fromarray(arr.clip(0, 255).astype(np.uint8))


def stage_empty():
    img = vgrad([(0, (10, 6, 8)), (1, (6, 4, 6))])
    img = curtains(img, 0, W, 0, 1500, (110, 10, 16))
    d = ImageDraw.Draw(img)
    # Bühnenboden
    for i in range(12):
        y = 1500 + i * 55
        d.rectangle([0, y, W, y + 52], fill=(60 - i * 3, 38 - i * 2, 24 - i))
    d.rectangle([0, 1480, W, 1510], fill=(30, 18, 12))
    # abgedunkelte Ränder
    arr = np.asarray(img).astype(np.float32)
    xs = np.linspace(-1, 1, W)
    arr *= (1 - 0.75 * xs ** 2)[None, :, None]
    img = Image.fromarray(arr.clip(0, 255).astype(np.uint8))
    img = add(img, cone((1920, 0), 200, 1700, 1300, (255, 235, 200), 70, 50))
    img = add(img, radial(1920, 1640, 700, (255, 220, 170), 1.5, 0.7, sy=0.22))
    d = ImageDraw.Draw(img)
    # Hocker
    c = (20, 14, 12)
    d.ellipse([1800, 1360, 2040, 1410], fill=c)
    d.line([(1830, 1390), (1790, 1660)], fill=c, width=16)
    d.line([(2010, 1390), (2050, 1660)], fill=c, width=16)
    d.line([(1920, 1400), (1920, 1640)], fill=c, width=14)
    # Stuhlreihen im Vordergrund
    m = silhouette_layer()
    md = ImageDraw.Draw(m)
    for row, (y, s) in enumerate([(1950, 1.0), (2100, 1.25)]):
        x = -100 + row * 120
        while x < W:
            w = 230 * s
            md.rounded_rectangle([x, y - 260 * s, x + w, y], radius=30, fill=255)
            md.rectangle([x, y - 40 * s, x + w + 20, y + 200], fill=255)
            x += w + 70 * s
    paste_color(img, m, (5, 3, 4))
    return haze(img, 18, 4)


def mic_spot():
    img = Image.new("RGB", (W, H), (6, 5, 8))
    img = add(img, cone((1920, 0), 150, 2000, 1500, (220, 225, 255), 80, 60))
    img = add(img, radial(1920, 900, 800, (120, 110, 150), 1.8, 0.6))
    d = ImageDraw.Draw(img)
    # Mikrofon (Vintage-Form)
    c = (170, 170, 180)
    d.rounded_rectangle([1780, 560, 2060, 1000], radius=140, fill=(140, 140, 150))
    for i in range(12):
        y = 610 + i * 32
        d.line([(1800, y), (2040, y)], fill=(80, 80, 90), width=6)
    d.rectangle([1790, 760, 2050, 800], fill=(200, 200, 210))
    d.rectangle([1890, 1000, 1950, 1120], fill=(90, 90, 100))
    d.line([(1920, 1120), (1920, 2000)], fill=(60, 60, 70), width=28)
    d.ellipse([1720, 1960, 2120, 2060], fill=(30, 30, 36))
    # Glanzlicht
    img = add(img, radial(1860, 650, 90, (255, 255, 255), 1.4, 0.8))
    img = add(img, radial(1920, 2000, 500, (140, 140, 180), 1.6, 0.4, sy=0.2))
    return haze(img, 22, 5)


def kitchen_night():
    img = vgrad([(0, (22, 20, 26)), (1, (12, 10, 12))])
    d = ImageDraw.Draw(img)
    # Fenster hinten mit blauer Nacht
    d.rectangle([2500, 400, 3300, 1300], fill=(14, 22, 48))
    d.rectangle([2890, 400, 2910, 1300], fill=(10, 10, 12))
    d.rectangle([2500, 840, 3300, 860], fill=(10, 10, 12))
    img = add(img, radial(2900, 850, 500, (40, 60, 120), 2, 0.6))
    # Hängelampe
    img = add(img, cone((1500, 560), 300, 1700, 1700, (255, 190, 110), 90, 60))
    img = add(img, radial(1500, 1500, 1100, (255, 170, 90), 2.0, 0.55, sy=0.35))
    d = ImageDraw.Draw(img)
    d.line([(1500, 0), (1500, 430)], fill=(8, 8, 8), width=10)
    d.polygon([(1330, 580), (1670, 580), (1580, 430), (1420, 430)], fill=(30, 26, 20))
    img = add(img, radial(1500, 590, 150, (255, 240, 200), 1.2, 1.0, sy=0.4))
    d = ImageDraw.Draw(img)
    # Tisch
    d.polygon([(200, 1500), (3640, 1500), (3840, 2160), (0, 2160)], fill=(70, 40, 24))
    img = add(img, radial(1500, 1650, 1000, (200, 120, 60), 1.8, 0.6, sy=0.3))
    d = ImageDraw.Draw(img)
    # Kaffeetasse
    cx, cy = 1300, 1640
    d.ellipse([cx - 190, cy + 180, cx + 190, cy + 250], fill=(30, 20, 14))
    d.rounded_rectangle([cx - 150, cy - 100, cx + 150, cy + 220], radius=40, fill=(225, 220, 210))
    d.ellipse([cx - 150, cy - 140, cx + 150, cy - 60], fill=(235, 230, 222))
    d.ellipse([cx - 125, cy - 125, cx + 125, cy - 75], fill=(50, 28, 16))
    d.arc([cx + 110, cy - 30, cx + 260, cy + 140], -90, 90, fill=(225, 220, 210), width=34)
    # Zeitung/Brief
    d.polygon([(1800, 1700), (2600, 1640), (2700, 1900), (1850, 1980)], fill=(200, 190, 170))
    for i in range(7):
        d.line([(1900, 1740 + i * 30), (2550, 1690 + i * 30)], fill=(120, 110, 100), width=6)
    return haze(img, 12, 6)


def silhouette_piano():
    img = Image.new("RGB", (W, H), (5, 4, 6))
    # Gegenlicht von hinten, genau hinter dem Kopf
    img = add(img, radial(1500, 1000, 1400, (255, 200, 140), 1.6, 0.95, sy=0.8))
    img = add(img, radial(1500, 1050, 420, (255, 245, 220), 1.1, 1.0))
    img = add(img, cone((1500, -200), 400, 1600, 2200, (255, 220, 180), 50, 90))
    m = silhouette_layer()
    d = ImageDraw.Draw(m)
    # Flügel rechts, Deckel offen
    d.polygon([(1650, 1480), (3350, 1480), (3450, 1600), (1600, 1600)], fill=255)
    d.polygon([(2100, 1480), (3300, 1480), (3050, 760)], fill=255)
    d.line([(2700, 1480), (2780, 1100)], fill=255, width=18)
    for x in (1700, 3300):
        d.rectangle([x, 1600, x + 60, 2160], fill=255)
    # Bank
    d.rectangle([1150, 1860, 1850, 1930], fill=255)
    d.rectangle([1190, 1930, 1230, 2160], fill=255)
    d.rectangle([1770, 1930, 1810, 2160], fill=255)
    # Person von hinten: Schultern, Kopf, große Haare
    d.polygon([(1140, 1880), (1860, 1880), (1780, 1440), (1220, 1440)], fill=255)
    d.ellipse([1180, 1340, 1820, 1560], fill=255)
    d.polygon([(1760, 1480), (1980, 1500), (1990, 1560), (1760, 1600)], fill=255)  # Arm zur Tastatur
    d.ellipse([1370, 1110, 1630, 1400], fill=255)
    for i in range(70):
        a = rng.uniform(0, 2 * math.pi)
        rr = rng.uniform(150, 250)
        x = 1500 + math.cos(a) * rr * 1.15
        y = 1150 + math.sin(a) * rr * 0.85
        s = rng.randint(60, 130)
        d.ellipse([x - s, y - s, x + s, y + s], fill=255)
    m = m.filter(ImageFilter.GaussianBlur(3))
    # Randlicht (Rim Light)
    edge = m.filter(ImageFilter.GaussianBlur(14))
    rim = ImageChops.subtract(edge, m)
    paste_color(img, m, (4, 3, 4))
    rim_rgb = Image.merge("RGB", [rim.point(lambda v: min(255, v * 3))] * 3)
    img = add(img, ImageChops.multiply(rim_rgb, Image.new("RGB", (W, H), (255, 200, 150))))
    return haze(img, 16, 7)


def crowd():
    img = Image.new("RGB", (W, H), (8, 6, 12))
    img = add(img, radial(1920, 500, 1600, (255, 140, 60), 1.7, 0.9, sy=0.7))
    img = add(img, radial(1920, 500, 300, (255, 240, 210), 1.1, 1.0))
    for ang in (-35, -15, 0, 15, 35):
        x2 = 1920 + math.tan(math.radians(ang)) * 2000
        layer = Image.new("RGB", (W, H), 0)
        ImageDraw.Draw(layer).polygon([(1900, 500), (1940, 500), (x2 + 260, 2400), (x2 - 260, 2400)], fill=(60, 45, 35))
        img = add(img, layer.filter(ImageFilter.GaussianBlur(50)))
    img = add(img, radial(1920, 1250, 2300, (210, 120, 60), 1.3, 0.85, sy=0.3))
    m = silhouette_layer()
    d = ImageDraw.Draw(m)
    for row, (y, s) in enumerate([(1350, 0.9), (1560, 1.2), (1800, 1.6), (2080, 2.1)]):
        x = rng.randint(-100, 0)
        while x < W + 100:
            hw = 95 * s
            hy = y - rng.randint(0, 40) * s
            d.ellipse([x - hw, hy - 130 * s, x + hw, hy + 60 * s], fill=255)
            d.rounded_rectangle([x - 230 * s, hy + 30 * s, x + 230 * s, hy + 700 * s], radius=int(120 * s), fill=255)
            if rng.random() < 0.12:
                ax = x + rng.choice([-1, 1]) * 150 * s
                d.line([(ax, hy + 80 * s), (ax + rng.randint(-60, 60), hy - 450 * s)], fill=255, width=int(55 * s))
                d.ellipse([ax - 45 * s, hy - 520 * s, ax + 45 * s, hy - 400 * s], fill=255)
            x += rng.randint(300, 420) * s
    paste_color(img, m, (6, 4, 8))
    return haze(img, 26, 8)


def cat():
    img = vgrad([(0, (30, 70, 90)), (1, (8, 20, 30))])
    img = add(img, cone((1920, 0), 220, 1750, 1500, (255, 240, 200), 90, 50))
    img = add(img, radial(1920, 1700, 900, (255, 230, 180), 1.6, 0.55, sy=0.2))
    d = ImageDraw.Draw(img)
    # Katzenklo (Schale)
    d.polygon([(1300, 1520), (2540, 1520), (2440, 1800), (1400, 1800)], fill=(200, 60, 40))
    d.rectangle([1280, 1490, 2560, 1540], fill=(230, 80, 55))
    # Streu-Krümel
    for _ in range(150):
        x = rng.randint(1360, 2480)
        y = rng.randint(1500, 1530)
        d.ellipse([x - 8, y - 8, x + 8, y + 8], fill=(210, 200, 180))
    # Katze (sitzend) im Klo
    m = silhouette_layer()
    md = ImageDraw.Draw(m)
    md.ellipse([1640, 980, 2200, 1560], fill=255)            # Körper
    md.ellipse([1720, 620, 2120, 1000], fill=255)            # Kopf
    md.polygon([(1740, 760), (1760, 480), (1900, 650)], fill=255)   # Ohr li
    md.polygon([(2100, 760), (2080, 480), (1940, 650)], fill=255)   # Ohr re
    md.arc([2080, 900, 2560, 1560], 200, 330, fill=255, width=70)  # Schwanz
    paste_color(img, m, (10, 10, 14))
    d = ImageDraw.Draw(img)
    # Augen
    for ex in (1840, 2000):
        d.ellipse([ex - 50, 770, ex + 50, 830], fill=(250, 210, 60))
        d.ellipse([ex - 10, 772, ex + 10, 828], fill=(10, 10, 10))
    img = add(img, radial(1840, 800, 90, (255, 220, 80), 1.5, 0.6))
    img = add(img, radial(2000, 800, 90, (255, 220, 80), 1.5, 0.6))
    return haze(img, 12, 9)


def interview():
    img = vgrad([(0, (26, 24, 30)), (0.7, (40, 34, 36)), (1, (14, 12, 14))])
    img = add(img, radial(1920, 900, 1500, (90, 70, 60), 1.6, 0.8, sy=0.6))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 1560, W, H], fill=(34, 26, 24))
    # Stehlampe
    d.line([(2900, 1560), (2900, 700)], fill=(15, 12, 12), width=18)
    d.polygon([(2760, 720), (3040, 720), (2980, 560), (2820, 560)], fill=(200, 170, 120))
    img = add(img, radial(2900, 760, 600, (255, 200, 130), 1.6, 0.7))
    m = silhouette_layer()
    md = ImageDraw.Draw(m)

    def chair(x, flip):
        s = -1 if flip else 1
        md.rounded_rectangle([x - 260, 1150, x + 260, 1520], radius=60, fill=255)
        md.rounded_rectangle([x + s * 150 - 110, 900, x + s * 150 + 110, 1450], radius=60, fill=255)
        md.rectangle([x - 230, 1500, x - 200, 1620], fill=255)
        md.rectangle([x + 200, 1500, x + 230, 1620], fill=255)

    chair(1150, False)
    chair(2700, True)
    # Interviewerin (links), Zettel in der Hand
    md.ellipse([1040, 700, 1220, 900], fill=255)
    md.polygon([(990, 1250), (1270, 1250), (1230, 900), (1030, 900)], fill=255)
    md.rectangle([1250, 1040, 1420, 1080], fill=255)
    # Gast (rechts), große Haare
    md.polygon([(2590, 1250), (2870, 1250), (2830, 900), (2630, 900)], fill=255)
    md.ellipse([2640, 690, 2820, 900], fill=255)
    for _ in range(30):
        a = rng.uniform(0, 2 * math.pi)
        x = 2730 + math.cos(a) * rng.uniform(80, 150)
        y = 760 + math.sin(a) * rng.uniform(60, 110)
        s = rng.randint(35, 70)
        md.ellipse([x - s, y - s, x + s, y + s], fill=255)
    # Tischchen mit Wasserglas
    md.rectangle([1800, 1300, 2050, 1330], fill=255)
    md.rectangle([1910, 1330, 1940, 1600], fill=255)
    paste_color(img, m, (10, 8, 10))
    d = ImageDraw.Draw(img)
    d.rectangle([1900, 1200, 1950, 1300], fill=(120, 150, 170))
    return haze(img, 12, 10)


# ---------- Texttafeln ----------
def card_text(lines, bg=(0, 0, 0), color=(235, 230, 220), texture=False):
    img = Image.new("RGB", (W, H), bg)
    if texture:
        img = add(img, radial(W / 2, H / 2, 2000, tuple(min(255, c // 2) for c in bg), 1.5, 0.8))
    d = ImageDraw.Draw(img)
    total = sum(l[1] for l in lines) + 60 * (len(lines) - 1)
    y = (H - total) / 2 - 40
    for text, size, fnt, col, sp in lines:
        f = font(fnt, size)
        center_text(d, text, f, y, col or color, sp)
        y += size + 60
    return img


def title():
    img = Image.new("RGB", (W, H), (0, 0, 0))
    img = add(img, radial(W / 2, H / 2, 1600, (70, 45, 15), 1.8, 0.8, sy=0.5))
    # Goldverlauf im Schriftzug
    mask = Image.new("L", (W, H), 0)
    md = ImageDraw.Draw(mask)
    f = font(BEBAS, 720)
    txt = "HELGE"
    sp = 60
    widths = [md.textlength(ch, font=f) for ch in txt]
    x = (W - sum(widths) - sp * (len(txt) - 1)) / 2
    for ch, w in zip(txt, widths):
        md.text((x, 560), ch, font=f, fill=255)
        x += w + sp
    gold = vgrad([(0.25, (255, 235, 170)), (0.45, (220, 160, 60)), (0.6, (140, 85, 25)), (0.7, (240, 200, 120))])
    img = Image.composite(gold, img, mask)
    glow = mask.filter(ImageFilter.GaussianBlur(40))
    img = add(img, Image.merge("RGB", [glow.point(lambda v: v * 0.5), glow.point(lambda v: v * 0.33), glow.point(lambda v: v * 0.1)]))
    d = ImageDraw.Draw(img)
    d.line([(1320, 1390), (2520, 1390)], fill=(160, 120, 60), width=4)
    center_text(d, "EIN LEBEN. MEHRERE INSTRUMENTE.", font(BEBAS, 120), 1440, (215, 200, 170), 18)
    return img


def end_card():
    img = Image.new("RGB", (W, H), (0, 0, 0))
    d = ImageDraw.Draw(img)
    center_text(d, "DEMNÄCHST IM KINO.", font(BEBAS, 300), 720, (235, 230, 220), 20)
    center_text(d, "Vielleicht.", font(SERIF, 170), 1080, (200, 160, 90))
    center_text(d, "Fan-Trailer · fiktive Szenen und Dialoge · nicht autorisiert · keine Originalmusik · keine echten Stimmen",
                font(SANS, 52), 1760, (120, 115, 110))
    return img


CARDS = {
    "no_plan": lambda: card_text([("ER HATTE KEINEN PLAN.", 300, BEBAS, None, 24)]),
    "piano": lambda: card_text([("KLAVIER", 520, BEBAS, (15, 12, 10), 30)], bg=(232, 222, 200), texture=True),
    "sax": lambda: card_text([("SAXOFON", 520, BEBAS, (20, 10, 5), 30)], bg=(214, 150, 40), texture=True),
    "drums": lambda: card_text([("SCHLAGZEUG", 520, BEBAS, (240, 230, 220), 30)], bg=(150, 20, 28), texture=True),
    "guitar": lambda: card_text([("GITARRE", 520, BEBAS, (10, 20, 24), 30)], bg=(40, 150, 160), texture=True),
    "and_then": lambda: card_text([("UND DANN …", 340, BEBAS, None, 30)]),
    "black": lambda: Image.new("RGB", (W, H), 0),
    "title": title,
    "end": end_card,
}

IMAGES = {
    "ruhr_dusk": ruhr_dusk, "window_night": window_night, "piano_keys": piano_keys,
    "stage_empty": stage_empty, "mic_spot": mic_spot, "kitchen_night": kitchen_night,
    "silhouette_piano": silhouette_piano, "crowd": crowd, "cat": cat, "interview": interview,
}


if __name__ == "__main__":
    import sys
    os.makedirs(OUT, exist_ok=True)
    only = set(sys.argv[1:])
    for name, fn in {**IMAGES, **{"card_" + k: v for k, v in CARDS.items()}}.items():
        if only and name not in only:
            continue
        path = os.path.join(OUT, name + ".png")
        fn().save(path, optimize=False, compress_level=3)
        print("ok", path)
