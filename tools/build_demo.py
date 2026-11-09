"""Build the two publishable concept copies (homepage and exhibition) for artifacts.

The local project stays as it is. Each copy:
- is labelled as a design concept and asks search engines not to index it,
- loads demo.js, which switches off phone, WhatsApp, booking and form actions,
- carries one size per image and only the images that page uses,
- links to the other concept page once its URL is known.

Usage:  python -I tools/build_demo.py <out_dir> [home_url] [exhibition_url]
Writes <out_dir>/home/ and <out_dir>/exhibition/, each with index.html and files.json
(the published-path -> source-path map for the publish call).
"""
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[1]).resolve()
HOME_URL = sys.argv[2] if len(sys.argv) > 2 else ""
EX_URL = sys.argv[3] if len(sys.argv) > 3 else ""

data = json.loads(re.search(r"window\.BG = (\{.*\});", (ROOT / "assets/js/data.js").read_text("utf-8"), re.S).group(1))
manifest = json.loads(re.search(r"window\.BG_IMG = (\{.*\});", (ROOT / "assets/js/img-manifest.js").read_text("utf-8"), re.S).group(1))
MAX_W = 1600
MIN_TILE_LEVEL = 10


def pick(info):
    ok = [w for w in info["w"] if w <= MAX_W]
    return max(ok) if ok else min(info["w"])


PAGES = {
    "home": {
        "src": "index.html",
        "title": "Blue Gallery Homepage Concept",
        "css": ["assets/css/styles.css"],
        "urls": [h["img"] for h in data["heroImages"]] + [c["img"] for c in data["collections"]]
        + [a["img"] for a in data["artists"]] + [w["img"] for w in data["newWorks"]] + data["seenIn"]
        + [p["img"] for p in data["press"] if "Isaac Maimon: The Landscape" not in p["title"]][:6],
    },
    "exhibition": {
        "src": "exhibition.html",
        "title": "The Landscape Within Concept",
        "css": ["assets/css/styles.css", "assets/css/exhibition.css"],
        "urls": [w["img"] for w in data["exhibition"]["works"]]
        + [p["img"] for p in data["press"] if re.search(r"Rina Maimon|David Schluss: Works on Paper|20th Anniversary", p["title"])],
    },
}

for name, cfg in PAGES.items():
    out = OUT / name
    shutil.rmtree(out, ignore_errors=True)
    out.mkdir(parents=True)
    html = (ROOT / cfg["src"]).read_text("utf-8")
    urls = set(cfg["urls"]) | set(re.findall(r'data-remote="(https://[^"]+)"', html))
    files = {}

    # One image size per picture, plus zoom tiles from level 10 up.
    trimmed = {}
    for u in urls:
        info = manifest.get(u)
        if not info:
            continue
        if "f" in info:
            files[info["f"]] = str(ROOT / info["f"])
            trimmed[u] = info
            continue
        w = pick(info)
        rel = f'{info["b"]}-{w}.webp'
        files[rel] = str(ROOT / rel)
        t = dict(info, w=[w])
        if name == "exhibition" and "t" in info:
            tdir = ROOT / info["t"]["u"]
            for lv in tdir.iterdir():
                if int(lv.name) >= MIN_TILE_LEVEL:
                    for f in lv.glob("*.webp"):
                        files[f.relative_to(ROOT).as_posix()] = str(f)
        else:
            t.pop("t", None)
        trimmed[u] = t

    # Rewrite <img data-remote> tags to the single local size.
    def swap(m):
        tag = m.group(0)
        r = re.search(r'data-remote="([^"]+)"', tag)
        info = trimmed.get(r.group(1)) if r else None
        if not info:
            return tag
        tag = re.sub(r'\ssrcset="[^"]*"', "", tag)
        tag = re.sub(r'\ssizes="[^"]*"', "", tag)
        return re.sub(r'\ssrc="[^"]*"', f' src="{info["b"]}-{info["w"][0]}.webp"', tag, count=1)

    html = re.sub(r"<img\b[^>]*>", swap, html)

    # The publish step adds its own doctype, html, head and body: keep only what goes inside.
    body_attrs = dict(re.findall(r'data-([a-z-]+)="([^"]*)"', re.search(r"<body([^>]*)>", html).group(1)))
    head = re.search(r"<head>(.*?)</head>", html, re.S).group(1)
    body = re.search(r"<body[^>]*>(.*)</body>", html, re.S).group(1)
    head = re.sub(r"<meta charset[^>]*>\s*|<meta name=\"viewport\"[^>]*>\s*", "", head)
    head = re.sub(r"<title>.*?</title>", f'<title>{cfg["title"]}</title>\n  <meta name="robots" content="noindex, nofollow">', head)
    ds = "".join(f'document.body.dataset.{re.sub(r"-([a-z])", lambda x: x.group(1).upper(), k)} = {json.dumps(v)}; ' for k, v in body_attrs.items())
    demo_cfg = json.dumps({"page": name, "home": HOME_URL, "exhibition": EX_URL})
    boot = f"<script>{ds}window.BG_DEMO = {demo_cfg};</script>\n"
    body = body.replace('<script src="assets/js/main.js"></script>', '<script src="assets/js/main.js"></script>\n<script src="assets/js/demo.js"></script>')
    (out / "index.html").write_text(head.strip() + "\n" + boot + body.strip() + "\n", "utf-8")

    # Code and the trimmed image map.
    for rel in cfg["css"] + ["assets/js/logo.js", "assets/js/data.js", "assets/js/main.js", "assets/js/demo.js", "assets/img/logo.svg"]:
        files[rel] = str(ROOT / rel)
    mpath = out / "img-manifest.js"
    mpath.write_text("window.BG_IMG = " + json.dumps(trimmed, separators=(",", ":")) + ";\n", "utf-8")
    files["assets/js/img-manifest.js"] = str(mpath)

    (out / "files.json").write_text(json.dumps(files, indent=0), "utf-8")
    size = sum(Path(p).stat().st_size for p in files.values())
    print(f"{name}: {len(files)} files, {size / 1e6:.1f} MB")
