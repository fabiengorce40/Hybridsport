"""Export technique de la source officielle, sans recadrage ni retouche graphique.

Pillow est nécessaire uniquement pour régénérer les PNG déjà versionnés.
La marge maskable protège tous les pixels visibles (>12/255) de l'image entière
dans le cercle central de rayon 39 %, à l'intérieur de la zone sûre de 40 %.
"""
from pathlib import Path
import hashlib
import json
import math
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / 'resources/android-test-icons'
source = ROOT / 'source-officielle.png'
image = Image.open(source).convert('RGB')
assert image.width == image.height == 1536
radius = max(
    math.hypot((x + .5) / image.width - .5, (y + .5) / image.height - .5)
    for y in range(image.height) for x in range(image.width)
    if max(image.getpixel((x, y))) > 12
)
scale = min(1, .39 / radius)
files = []
for size in (48, 72, 96, 180, 192, 512):
    name = f'icon-{size}.png'
    image.resize((size, size), Image.Resampling.LANCZOS).save(ROOT / name)
    files.append(name)
maskable = Image.new('RGB', (512, 512), '#000000')
side = int(512 * scale)
maskable.paste(image.resize((side, side), Image.Resampling.LANCZOS), ((512-side)//2, (512-side)//2))
maskable.save(ROOT / 'icon-512-maskable.png')
files.append('icon-512-maskable.png')
# Contrôle du contenu visible après rééchantillonnage ; aucune zone essentielle rognée.
assert all(
    math.hypot(x+.5-256, y+.5-256) <= 512*.4
    for y in range(512) for x in range(512)
    if max(maskable.getpixel((x, y))) > 12
)
image.save(ROOT / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
files.append('favicon.ico')
metadata = dict(source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
                maskable_scale=side/512, safe_radius=.4,
                files={name: hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in files})
(ROOT / 'icons.json').write_text(json.dumps(metadata, indent=2)+'\n')
print('Exports officiels OK, marge maskable vérifiée :', side, 'px / 512')
