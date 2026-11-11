"""Gather one artist's works from bluefineart.com for a room in the virtual gallery.

For each work listed for the artist in assets/js/data.js it reads the work's
page on the live site (medium and size), downloads the picture, and saves
protected WebP copies, as tools/optimize_images.py does for the first room.

Run from the project root:
    python -I tools/make_show.py "Lenner Gogli" gogli
    python -I tools/make_show.py "Iris Eshet Cohen" eshet /art-collections/iris-eshet-cohen-originals-on-canvas
    python -I tools/make_show.py "Marc Lipp" lipp /art-collections/marc-lipp-originals-on-canvas
Writes:
    assets/img/shows/<key>/*.webp      the pictures, 640, 1200 and 1600 px wide
    assets/js/show-<key>.js            the list the room reads (window.BG_SHOW)
The text in SHOWS below is the part a person writes: the room's title and the
lines lettered on its wall.
"""
import hashlib
import html
import io
import json
import re
import sys
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
LIVE = "https://www.bluefineart.com"
WIDTHS = [640, 1200, 1600]

artist, key = sys.argv[1], sys.argv[2]
OUT = ROOT / "assets" / "img" / "shows" / key
OUT.mkdir(parents=True, exist_ok=True)
CACHE = ROOT / ".cache" / "show-src"
CACHE.mkdir(parents=True, exist_ok=True)

data = json.loads(re.search(r"window\.BG = (\{.*\});", (ROOT / "assets/js/data.js").read_text("utf-8"), re.S).group(1))
listed = [w for w in data["newWorks"] if w["artist"] == artist]
COLLECTION = sys.argv[3] if len(sys.argv) > 3 else ""    # optional: the artist's collection page on the live site, for works data.js does not list


def get(url):
    path = CACHE / hashlib.sha1(url.encode()).hexdigest()[:16]
    if not path.exists():
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        path.write_bytes(urllib.request.urlopen(req, timeout=90).read())
    return path.read_bytes()


def page_lines(url):
    t = get(url).decode("utf-8", "ignore")
    t = re.sub(r"<script.*?</script>|<style.*?</style>", "", t, flags=re.S)
    return [x.strip() for x in html.unescape(re.sub(r"<[^>]+>", "\n", t)).split("\n") if x.strip()]


def before(lines, label):
    """The live pages put each value on the line above its label."""
    for i, line in enumerate(lines):
        if line.lower().startswith(label.lower()) and i:
            return lines[i - 1]
    return ""


if COLLECTION:
    page = get(LIVE + COLLECTION).decode("utf-8", "ignore")
    listed = []
    for a in re.finditer(r'<a[^>]+href="(/art/[^"]+)"[^>]*>(.*?)</a>', page, re.S):
        src = re.search(r'src="([^"]+)"', a.group(2))
        if src and a.group(1) not in [x["link"] for x in listed]:
            head = re.search(r"<title>(.*?)</title>", get(LIVE + a.group(1)).decode("utf-8", "ignore"), re.S)      # the work page's own title is the work's name
            title = html.unescape(re.sub(r"<[^>]+>", "", head.group(1))).strip() if head else a.group(1).split("/")[-1].replace("-", " ").title()
            known = [w["title"] for w in data["newWorks"] if w["link"] == a.group(1)]      # data.js has the title as the site prints it
            listed.append({"artist": artist, "title": known[0] if known else title, "img": src.group(1), "link": a.group(1)})

works = []
for w in listed:
    lines = page_lines(LIVE + w["link"])
    medium, size = before(lines, "Art Medium"), before(lines, "Art Size")
    if medium.lower().startswith("originals on"):      # some pages give the collection's name here, not a medium
        medium = "Original on canvas"
    m = re.match(r"\s*(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)", size)
    if not m:
        print("skipped, no size:", w["title"], repr(size))
        continue
    a, b = float(m.group(1)), float(m.group(2))
    im = Image.open(io.BytesIO(get(w["img"]))).convert("RGB")
    W, H = im.size
    # The site gives two numbers and does not say which is the height. The picture's own shape settles it.
    h_in, w_in = (min(a, b), max(a, b)) if W >= H else (max(a, b), min(a, b))
    if abs((w_in / h_in) - (W / H)) > 0.25 * (W / H):
        print("skipped, size does not match the picture:", w["title"], size, im.size)
        continue
    stem = hashlib.sha1(w["img"].encode()).hexdigest()[:12]
    ex = Image.Exif()
    ex[315] = artist
    ex[33432] = f"(c) {artist}. All rights reserved. Courtesy Blue Gallery, bluefineart.com"
    ex[270] = f"{w['title']} by {artist}"
    widths = sorted({min(x, W) for x in WIDTHS})
    for x in widths:
        im.resize((x, round(H * x / W)), Image.LANCZOS).save(OUT / f"{stem}-{x}.webp", "WEBP", quality=82, method=6, exif=ex.tobytes())
    r, g, bl = im.resize((1, 1), Image.BOX).getpixel((0, 0))
    num = lambda v: str(int(v)) if v == int(v) else str(v)
    works.append({
        "title": w["title"], "medium": medium or "Mixed media", "link": w["link"],
        "in": f"{num(h_in)} × {num(w_in)} in", "cm": f"{h_in * 2.54:.1f} × {w_in * 2.54:.1f} cm",
        "ratio": round(W / H, 3),
        "files": {"b": f"assets/img/shows/{key}/{stem}", "w": widths, "c": f"#{r:02x}{g:02x}{bl:02x}"},
    })
    print("ok:", w["title"], "|", medium, "|", works[-1]["in"], "| picture", im.size)

# The words on the wall. Taken from the artist's own page on bluefineart.com, not invented here.
SHOWS = {
    "lipp": {
        "artist": "Marc Lipp",
        "title": "Originals on Canvas",     # the name of his collection on the site
        "intro": "Marc Lipp (b. 1962, North Babylon, New York) has been fueled by artistic instinct since childhood. Drawn early to drawing and painting, he discovered airbrushing as a teenager, transforming surfaces into vibrant works of art while earning his first income as a young creative entrepreneur.",
        "quote": "",
        # eleven portraits, chosen from the thirty-six on the site for the sharpest pictures
        "plan": [
            ["Coco's Shine", "part", 0],
            ["Marilyn The Bombshell", "entry", -2.75], ["Grateful Garcia", "entry", 2.75],
            ["Albert's Formula", "far", -2.1], ["Rambo", "far", 2.1],
            ["The Girl In The Red Velvet", "left", -4.2], ["Geisha", "left", 0], ["All You Need Is Love", "left", 4.2],
            ["Deep Thoughts", "right", -4.2], ["Nicholson Pledge", "right", 0], ["Red Harrison", "right", 4.2],
        ],
    },
    "eshet": {
        "artist": "Iris Eshet Cohen",
        "title": "Colors of Life",          # the name of her series, and of her exhibition at the gallery
        "intro": "The newest works of Iris Eshet Cohen, her \"Colors of Life\" series, are a collection of colorful acrylic paintings created in her painterly application of robust colors and linear definition of movement and texture.",
        "quote": "",
        # eight works in a room for eleven: fewer, with more wall around each
        "plan": [
            ["Flumina Lux", "part", 0],
            ["Modern View", "entry", -2.75], ["Rampant & Essential", "entry", 2.75],
            ["Charming Process", "far", 0],
            ["Adventurous", "left", -2.6], ["Perceptions In Blue", "left", 2.6],
            ["Oceanic", "right", -2.6], ["In Epiphania Domini", "right", 2.6],
        ],
    },
    "gogli": {
        "artist": "Lenner Gogli",
        "title": "Abstract Originals",
        "intro": "",          # filled in below from the artist page, if it can be read
        "quote": "",
        # where each work hangs: title, wall, and distance along that wall in metres.
        # The widest canvas takes the floating wall. The four small ones hang in a row.
        "plan": [
            ["Vivid Resonance", "part", 0],
            ["Coral Pulse", "entry", -2.75], ["Their Love Will Shine", "entry", 2.75],
            ["Ignition Of Seeds", "far", -2.1], ["ABSTRACT, Constellations", "far", 2.1],
            ["Guiding Lights", "left", -4.2], ["Blue Angels", "left", 0], ["Jubilee Expressions", "left", 4.2],
            ["ABSTRACT, Earth Vibes", "right", -4.2], ["Greenlight Reverie", "right", 4.2],
            ["Paradise Blooms", "right", -1.5], ["Blossoming Gift", "right", -0.5],
            ["Floral Sandstone", "right", 0.5], ["Quattro In Blue", "right", 1.5],
        ],
    },
}
show = SHOWS.get(key, {"artist": artist, "title": "Selected Works", "intro": "", "quote": ""})
if not show["intro"]:
    try:
        slug = re.sub(r"[^a-z0-9]+", "-", artist.lower()).strip("-")
        lines = page_lines(f"{LIVE}/artist/{slug}")
        # the biography is the longest run of prose on the page: take its first two sentences
        bio = max(lines, key=len)
        show["intro"] = " ".join(re.split(r"(?<=[.!?])\s+", bio)[:2])[:420]
    except Exception as e:      # the room still works without the lines
        print("no biography:", e)
if "plan" in show:
    hung = {row[0] for row in show["plan"]}
    missing = hung - {w["title"] for w in works}
    assert not missing, f"the plan names works that were not found: {missing}"
    works = [w for w in works if w["title"] in hung]
else:
    works = works[:11]      # the room's own plan has eleven places
show["works"] = works
# pictures of works that are not hung do not ship with the site
used = {Path(w["files"]["b"]).name for w in works}
for f in OUT.glob("*.webp"):
    if f.name.rsplit("-", 1)[0] not in used:
        f.unlink()
(ROOT / "assets" / "js" / f"show-{key}.js").write_text(
    f"/* Generated by tools/make_show.py for {artist}. The works and words for one room of the virtual gallery. */\n"
    "window.BG_SHOW = " + json.dumps(show, indent=1, ensure_ascii=False) + ";\n", "utf-8")
print(len(works), "works written. Intro:", show["intro"][:160])
