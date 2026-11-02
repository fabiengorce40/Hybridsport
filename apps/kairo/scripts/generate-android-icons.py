"""Exports ESSAI full bleed. Pillow only; the official neon artwork is never redrawn.

The generated plate extends ONLY the blue/pink/purple scenery. Original pixels
are composited over it, excluding the baked black rounded frame. A smaller
foreground for maskable uses the SAME full-bleed plate, never a black canvas.
"""
from pathlib import Path
import hashlib
import json
import math
from PIL import Image, ImageDraw, ImageFilter, ImageChops

ROOT = Path(__file__).resolve().parents[1] / 'resources/android-test-icons'
source = ROOT / 'source-officielle.png'
image = Image.open(source).convert('RGB')
assert image.size == (1536, 1536)
plate = Image.open(ROOT / 'decor-fullbleed.webp').convert('RGB').resize(image.size, Image.Resampling.LANCZOS)
# Stay inside the original silver rim. Feather only scenery, protect every
# yellow/green pixel (R, luminous circle, leaves) from any generative changes.
alpha = Image.new('L', image.size)
ImageDraw.Draw(alpha).rounded_rectangle((135, 115, 1400, 1395), radius=360, fill=255)
alpha = alpha.filter(ImageFilter.GaussianBlur(12))
neon = Image.new('L', image.size)
pixels = image.load(); n = neon.load()
for y in range(image.height):
    for x in range(image.width):
        r, g, b = pixels[x, y]
        if g > 150 and r > 65 and b < 180 and g-b > 65:
            n[x, y] = 255
protected = neon.filter(ImageFilter.MaxFilter(9))
alpha = ImageChops.lighter(alpha, protected)
# Core stroke and ring remain original pixels, not AI approximations.
assert all(alpha.getpixel((x, y)) == 255 for y in range(1536) for x in range(1536) if neon.getpixel((x, y)))
masters = {}
for purpose, scale in [('any', 1), ('maskable', .78)]:
    side = round(1536*scale); offset = (1536-side)//2
    foreground = image.resize((side, side), Image.Resampling.LANCZOS)
    mask = alpha.resize((side, side), Image.Resampling.LANCZOS)
    canvas = plate.copy()
    canvas.paste(foreground, (offset, offset), mask)
    masters[purpose] = canvas
# Every protected source neon pixel lies within Android's central 40% radius.
radius = max(math.hypot((x+.5)/1536-.5, (y+.5)/1536-.5)*.78
             for y in range(1536) for x in range(1536) if neon.getpixel((x,y)))
assert radius < .40, radius
files = []
for size in (48, 72, 96, 180, 192, 512):
    name = f'icon-{size}.png'
    masters['any'].resize((size, size), Image.Resampling.LANCZOS).save(ROOT/name)
    files.append(name)
for size in (192, 512):
    name = f'icon-{size}-maskable.png'
    masters['maskable'].resize((size, size), Image.Resampling.LANCZOS).save(ROOT/name)
    files.append(name)
masters['any'].save(ROOT/'favicon.ico', sizes=[(16,16),(32,32),(48,48)])
files.append('favicon.ico')
# Detect regressions to a uniform artificial black perimeter. Real dark city
# shadows are allowed; the perimeter must remain spatially varied and colored.
for purpose, master in masters.items():
    samples = [master.getpixel((x, y)) for x in range(1536) for y in (0,1535)]
    samples += [master.getpixel((x, y)) for y in range(1536) for x in (0,1535)]
    assert len(set(samples)) > 500
    assert sum(max(p) > 25 for p in samples)/len(samples) > .3
hashes = {name: hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in files}
metadata = dict(source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
    decor_sha256=hashlib.sha256((ROOT/'decor-fullbleed.webp').read_bytes()).hexdigest(),
    asset_version='rekka-v2-city-fullbleed-v2',
    revision=hashlib.sha256(json.dumps(hashes, sort_keys=True).encode()).hexdigest()[:16],
    maskable_foreground_scale=.78, protected_neon_radius=radius, safe_radius=.4,
    files=hashes)
(ROOT/'icons.json').write_text(json.dumps(metadata,indent=2)+'\n')
# Reproducible contact sheet, actual PNGs at 192 px under Android mask shapes.
qa = ROOT/'qa'; qa.mkdir(exist_ok=True)
sheet = Image.new('RGB', (4*224, 2*252), '#151b2b'); draw = ImageDraw.Draw(sheet)
for row,purpose in enumerate(('any','maskable')):
    tile = masters[purpose].resize((192,192),Image.Resampling.LANCZOS)
    for col,shape in enumerate(('square','rounded','circle','squircle')):
        m=Image.new('L',(192,192),255); d=ImageDraw.Draw(m)
        if shape!='square':
            m.paste(0,(0,0,192,192))
            if shape=='rounded': d.rounded_rectangle((0,0,191,191),radius=40,fill=255)
            elif shape=='circle': d.ellipse((0,0,191,191),fill=255)
            else:
                for y in range(192):
                    for x in range(192):
                        if abs((x+0.5-96)/96)**4+abs((y+0.5-96)/96)**4 <= 1: m.putpixel((x,y),255)
        sheet.paste(tile,(col*224+16,row*252+32),m)
        draw.text((col*224+16,row*252+10),purpose+' / '+shape,fill='white')
sheet.save(qa/'android-masks.png')
print('Full bleed exports OK; protected neon radius:',round(radius,4),'revision:',metadata['revision'])
