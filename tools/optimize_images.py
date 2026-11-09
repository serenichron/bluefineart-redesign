"""Download every remote image the prototype uses and save protected WebP copies.

Why:
- The live Webflow images are large progressive JPEGs (up to 1.4 MB), so they draw
  blurry first and sharpen over seconds. Local WebP files appear in one go.
- Artwork images are capped at 1600 px, too small for a good print. No single file
  is larger than that.
- Zoom uses tiles (Deep Zoom). The close-up loads 1024 px squares, never one big file.
- Every file carries the artist and a copyright notice in its EXIF data.

Run from the project root:  python -I tools/optimize_images.py
Writes:  assets/img/opt/*.webp, assets/img/tiles/<key>_files/..., assets/js/img-manifest.js
Then rewrites <img> tags in index.html and exhibition.html to the local files.
"""
import concurrent.futures as cf
import hashlib
import io
import json
import math
import re
import shutil
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "img" / "opt"
TILES = ROOT / "assets" / "img" / "tiles"
CACHE = ROOT / ".cache" / "img-src"
for d in (OUT, TILES):
    shutil.rmtree(d, ignore_errors=True)
    d.mkdir(parents=True, exist_ok=True)
CACHE.mkdir(parents=True, exist_ok=True)

# Widths per kind of image, each capped at the source width.
# Artworks never go above 1600 px. Gallery photos (hero) may reach 2000.
KINDS = {
    "hero": [960, 1600, 2000],
    "large": [640, 1200, 1600],
    "card": [480, 900],
    "thumb": [240, 480],
    "logo": [300],
}
ZOOM_MAX = 2400   # deepest zoom level, served only as tiles
TILE = 1024
GALLERY = "Blue Gallery, bluefineart.com"

data = json.loads(re.search(r"window\.BG = (\{.*\});", (ROOT / "assets/js/data.js").read_text("utf-8"), re.S).group(1))
jobs = {}   # url -> {"kind", "artist", "title", "tiles"}


def add(url, kind, artist=None, title=None, tiles=False):
    if not (url and url.startswith("http")):
        return
    order = list(KINDS)
    j = jobs.setdefault(url, {"kind": kind, "artist": artist, "title": title, "tiles": tiles})
    if order.index(kind) < order.index(j["kind"]):
        j["kind"] = kind
    j["artist"] = j["artist"] or artist
    j["title"] = j["title"] or title
    j["tiles"] = j["tiles"] or tiles


for h in data["heroImages"]:
    add(h["img"], "hero", "Blue Gallery", h.get("cap"))
for c in data["collections"]:
    artist, _, series = c["title"].partition(" - ")
    add(c["img"], "card", artist.strip(), series.strip())
for a in data["artists"]:
    add(a["img"], "thumb", a["name"])
for w in data["newWorks"]:
    add(w["img"], "card", w["artist"], w["title"])
for p in data["press"]:
    add(p["img"], "card", "Blue Gallery", p["title"])
for s in data["seenIn"]:
    add(s, "logo")
for w in data["exhibition"]["works"]:
    add(w["img"], "large", data["exhibition"]["artist"], w["title"], tiles=True)

# Images written straight into the HTML (remote src, or already rewritten with data-remote).
IMG_TAG = re.compile(r'<img\b[^>]*>')
REMOTE = re.compile(r'(?:data-remote|src)="(https://[^"]+)"')
for page in ["index.html", "exhibition.html"]:
    for tag in IMG_TAG.findall((ROOT / page).read_text("utf-8")):
        m = REMOTE.search(tag)
        if m:
            u = m.group(1)
            kind = "large" if "cloudfront" in u else "hero" if "slider" in u.lower() else "card"
            add(u, kind, "Isaac Maimon" if "cloudfront" in u else "Blue Gallery")


def source_url(url, j):
    # Artsy: build sizes and tiles from the full-resolution file.
    if "cloudfront.net" in url and (j["kind"] == "large" or j["tiles"]):
        return url.replace("/large.jpg", "/normalized.jpg")
    return url


def exif_for(j):
    ex = Image.Exif()
    who = j["artist"] or "Blue Gallery"
    ex[315] = who                                                      # Artist
    ex[33432] = f"(c) {who}. All rights reserved. Courtesy {GALLERY}"  # Copyright
    if j["title"]:
        ex[270] = f"{j['title']} by {who}" if who != "Blue Gallery" else j["title"]  # ImageDescription
    return ex.tobytes()


def make_tiles(im, key, exif):
    """Deep Zoom pyramid: level n is the image scaled to fit 2^n px."""
    W, H = im.size
    s = min(1, ZOOM_MAX / max(W, H))
    im = im.resize((round(W * s), round(H * s)), Image.LANCZOS) if s < 1 else im
    W, H = im.size
    levels = math.ceil(math.log2(max(W, H)))
    for lv in range(levels + 1):
        f = 2 ** (levels - lv)
        w, h = max(1, math.ceil(W / f)), max(1, math.ceil(H / f))
        layer = im.resize((w, h), Image.LANCZOS) if (w, h) != (W, H) else im
        d = TILES / f"{key}_files" / str(lv)
        d.mkdir(parents=True, exist_ok=True)
        for c in range(math.ceil(w / TILE)):
            for r in range(math.ceil(h / TILE)):
                x0, y0 = max(0, c * TILE - 1), max(0, r * TILE - 1)
                x1, y1 = min(w, (c + 1) * TILE + 1), min(h, (r + 1) * TILE + 1)
                layer.crop((x0, y0, x1, y1)).save(d / f"{c}_{r}.webp", "WEBP", quality=80, method=5, exif=exif)
    return {"u": f"assets/img/tiles/{key}_files/", "W": W, "H": H, "s": TILE, "o": 1}


def process(item):
    url, j = item
    key = hashlib.sha1(url.encode()).hexdigest()[:12]
    raw = CACHE / (key + ("-full" if "cloudfront" in url and (j["kind"] == "large" or j["tiles"]) else ""))
    if not raw.exists():
        req = urllib.request.Request(source_url(url, j), headers={"User-Agent": "Mozilla/5.0"})
        raw.write_bytes(urllib.request.urlopen(req, timeout=90).read())
    if url.lower().endswith(".svg"):
        # Vector logos: keep the file as it is, stored locally.
        (OUT / f"{key}.svg").write_bytes(raw.read_bytes())
        return url, {"f": f"assets/img/opt/{key}.svg", "b": f"assets/img/opt/{key}", "w": [], "r": 1, "c": "#ffffff"}
    im = Image.open(io.BytesIO(raw.read_bytes()))
    has_alpha = im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)
    im = im.convert("RGBA" if has_alpha else "RGB")
    W, H = im.size
    exif = exif_for(j)
    widths = sorted({min(w, W) for w in KINDS[j["kind"]]})
    for w in widths:
        im.resize((w, round(H * w / W)), Image.LANCZOS).save(OUT / f"{key}-{w}.webp", "WEBP", quality=82, method=6, exif=exif)
    r, g, b = im.convert("RGB").resize((1, 1), Image.BOX).getpixel((0, 0))
    info = {"b": f"assets/img/opt/{key}", "w": widths, "r": round(W / H, 4), "c": f"#{r:02x}{g:02x}{b:02x}"}
    if j["tiles"]:
        info["t"] = make_tiles(im, key, exif)
    return url, info


manifest = {}
with cf.ThreadPoolExecutor(12) as ex:
    for i, (url, info) in enumerate(ex.map(process, jobs.items()), 1):
        manifest[url] = info
        if i % 50 == 0:
            print(i, "of", len(jobs))

(ROOT / "assets/js/img-manifest.js").write_text(
    "/* Generated by tools/optimize_images.py. Maps each remote image to local WebP sizes and zoom tiles. */\n"
    "window.BG_IMG = " + json.dumps(manifest, separators=(",", ":")) + ";\n", "utf-8")


def srcset(info):
    return ", ".join(f'{info["b"]}-{w}.webp {w}w' for w in info["w"])


def mid(info):
    return f'{info["b"]}-{info["w"][min(1, len(info["w"]) - 1)]}.webp'


def swap(m):
    tag = m.group(0)
    r = REMOTE.search(tag)
    info = manifest.get(r.group(1)) if r else None
    if not info or "f" in info:
        return tag
    url = r.group(1)
    tag = re.sub(r'\s(?:src|srcset|data-remote)="[^"]*"', "", tag)
    tag = re.sub(r'background:#[0-9a-f]{6};?', "", tag)
    tag = tag.replace(' style=""', "")
    tag = tag.replace("<img", f'<img src="{mid(info)}" srcset="{srcset(info)}" data-remote="{url}"', 1)
    if "sizes=" not in tag:
        tag = tag.replace("<img", '<img sizes="(max-width: 900px) 100vw, 50vw"', 1)
    if 'style="' in tag:
        tag = tag.replace('style="', f'style="background:{info["c"]};', 1)
    else:
        tag = tag.replace("<img", f'<img style="background:{info["c"]}"', 1)
    return tag


for page in ["index.html", "exhibition.html"]:
    p = ROOT / page
    p.write_text(IMG_TAG.sub(swap, p.read_text("utf-8")), "utf-8")

files = list(OUT.glob("*.webp")) + list(OUT.glob("*.svg")) + list(TILES.rglob("*.webp"))
print(f"{len(manifest)} images, {len(files)} files, {sum(f.stat().st_size for f in files) / 1e6:.1f} MB")
