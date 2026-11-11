"""Work out the light in the "quiet" room of the virtual gallery, and save it as pictures.

The room in assets/js/gallery.js has no real lights. For the quiet room this
script does the lighting once, ahead of time, the way a renderer would:

- The glowing ceiling is the main source of light. The open doorway adds a little warm light.
- Every surface is cut into small patches, 25 cm across.
- Each patch receives light from every other patch it can see, and passes on
  its own share. A grey floor passes on grey light, a blue wall blue light.
  This is repeated until it settles. The method is called radiosity.
- Things in the way (the floating wall, the bench) block light, so they leave
  soft shadows.

The result is one small picture per surface, already holding its colour and its
light. The page lays those pictures on the walls, floor and ceiling.

Run from the project root:   python -I tools/bake_light.py
Writes:  assets/img/light/*.webp  and  assets/js/light-data.js
The sizes and colours below must match the ones in assets/js/gallery.js.
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "img" / "light"
OUT.mkdir(parents=True, exist_ok=True)

# ---- the room, in metres (same numbers as gallery.js) ----
W, L, H = 9.0, 14.0, 5.6
HX, HZ = W / 2, L / 2
PART = dict(z=0.5, w=4.0, h=3.2, t=0.3, lift=0.1)
SEAT = dict(x=0.0, z=-3.4, w=2.0, d=0.5, h=0.42)
BAY_X, BAY_Z = [-3.0, 0.0, 3.0], [-5.6, -2.8, 0.0, 2.8, 5.6]
PANEL = (2.5, 2.3)                       # each glowing ceiling panel, x by z
CELL = 0.25                              # patch size


def lin(hex_):
    """An sRGB colour like '#73808c' as linear light, which is what the maths needs."""
    c = np.array([int(hex_[i:i + 2], 16) / 255 for i in (1, 3, 5)])
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


# How much light each surface passes on, and in what colour.
WHITE = lin("#f1f0ed")
CEILING = lin("#f3f2f0")
CONCRETE = lin("#a09f9c")
DUSK_BLUE = lin("#73808c")               # the far wall
MIST = lin("#aeb7bd")                    # the floating wall: a pale, greyed cousin of the far wall's blue
BENCH = lin("#d9d4ca")
GLOW = np.array([1.0, 0.99, 0.975])     # the panels: daylight, a touch warm
WARM = np.array([1.0, 0.92, 0.8]) * 1.1    # light coming in through the open doorway
DOORWAY = (1.5, 2.75)                     # its width and height, in the middle of the entry wall

# ---- surfaces: a name, the corner where the picture's bottom-left sits, the
#      direction and length of its width (U) and height (V), and which way it faces ----
surfaces = []


def surface(name, origin, U, V, normal, albedo, save=True):
    U, V = np.array(U, float), np.array(V, float)
    nu, nv = max(1, round(np.linalg.norm(U) / CELL)), max(1, round(np.linalg.norm(V) / CELL))
    surfaces.append(dict(name=name, o=np.array(origin, float), U=U, V=V, n=np.array(normal, float), nu=nu, nv=nv, albedo=albedo, save=save))


# The U and V of each wall follow the way gallery.js lays its planes, so the pictures fit unturned.
surface("floor", (-HX, 0, HZ), (W, 0, 0), (0, 0, -L), (0, 1, 0), CONCRETE)
surface("ceiling", (-HX, H, -HZ), (W, 0, 0), (0, 0, L), (0, -1, 0), CEILING)
surface("wall-left", (-HX, 0, HZ), (0, 0, -L), (0, H, 0), (1, 0, 0), WHITE)
surface("wall-right", (HX, 0, -HZ), (0, 0, L), (0, H, 0), (-1, 0, 0), WHITE)
surface("wall-far", (-HX, 0, -HZ), (W, 0, 0), (0, H, 0), (0, 0, 1), DUSK_BLUE)
surface("wall-entry", (HX, 0, HZ), (-W, 0, 0), (0, H, 0), (0, 0, -1), WHITE)
pz, pw, pt, py0, py1 = PART["z"], PART["w"], PART["t"], PART["lift"], PART["lift"] + PART["h"]
surface("part-front", (-pw / 2, py0, pz + pt / 2), (pw, 0, 0), (0, PART["h"], 0), (0, 0, 1), MIST)
surface("part-back", (pw / 2, py0, pz - pt / 2), (-pw, 0, 0), (0, PART["h"], 0), (0, 0, -1), MIST)
surface("part-end-right", (pw / 2, py0, pz + pt / 2), (0, 0, -pt), (0, PART["h"], 0), (1, 0, 0), MIST, save=False)
surface("part-end-left", (-pw / 2, py0, pz - pt / 2), (0, 0, pt), (0, PART["h"], 0), (-1, 0, 0), MIST, save=False)
surface("part-top", (-pw / 2, py1, pz + pt / 2), (pw, 0, 0), (0, 0, -pt), (0, 1, 0), MIST, save=False)
sx, sz, sw, sd, sh = SEAT["x"], SEAT["z"], SEAT["w"], SEAT["d"], SEAT["h"]
surface("seat-top", (sx - sw / 2, sh, sz + sd / 2), (sw, 0, 0), (0, 0, -sd), (0, 1, 0), BENCH, save=False)
surface("seat-front", (sx - sw / 2, 0, sz + sd / 2), (sw, 0, 0), (0, sh, 0), (0, 0, 1), BENCH, save=False)
surface("seat-back", (sx + sw / 2, 0, sz - sd / 2), (-sw, 0, 0), (0, sh, 0), (0, 0, -1), BENCH, save=False)
surface("seat-right", (sx + sw / 2, 0, sz + sd / 2), (0, 0, -sd), (0, sh, 0), (1, 0, 0), BENCH, save=False)
surface("seat-left", (sx - sw / 2, 0, sz - sd / 2), (0, 0, sd), (0, sh, 0), (-1, 0, 0), BENCH, save=False)

# Solid things that block light: lowest corner, highest corner.
blockers = np.array([
    [[-pw / 2, 0.0, pz - pt / 2], [pw / 2, py1, pz + pt / 2]],
    [[sx - sw / 2, 0.0, sz - sd / 2], [sx + sw / 2, sh, sz + sd / 2]],
])

# ---- cut every surface into patches ----
P, N, A, RHO, E = [], [], [], [], []
for s in surfaces:
    iu, iv = np.meshgrid(np.arange(s["nu"]), np.arange(s["nv"]))
    pts = s["o"] + ((iu[..., None] + 0.5) / s["nu"]) * s["U"] + ((iv[..., None] + 0.5) / s["nv"]) * s["V"]
    s["first"], s["count"] = sum(len(p) for p in P), pts.shape[0] * pts.shape[1]
    P.append(pts.reshape(-1, 3))
    N.append(np.tile(s["n"], (s["count"], 1)))
    A.append(np.full(s["count"], np.linalg.norm(s["U"]) * np.linalg.norm(s["V"]) / s["count"]))
    RHO.append(np.tile(s["albedo"], (s["count"], 1)))
    emit = np.zeros((s["count"], 3))
    if s["name"] == "ceiling":
        emit[:] = GLOW * 0.7          # the whole ceiling is one soft sheet of light, behind the fins
    if s["name"] == "wall-entry":
        flat = pts.reshape(-1, 3)
        emit[(np.abs(flat[:, 0]) < DOORWAY[0] / 2) & (flat[:, 1] < DOORWAY[1])] = WARM
    E.append(emit)
P, N, A, RHO, E = (np.concatenate(x).astype(np.float32) for x in (P, N, A, RHO, E))
n = len(P)
print(n, "patches")

# ---- how much of each patch's light reaches each other patch ----
F = np.zeros((n, n), np.float32)
EPS = 1e-3
for a in range(0, n, 200):
    b = min(n, a + 200)
    D = P[None, :, :] - P[a:b, None, :]                       # from each patch in this slice to every patch
    r2 = (D * D).sum(-1)
    r = np.sqrt(r2) + 1e-9
    cos_i = np.clip((D * N[a:b, None, :]).sum(-1) / r, 0, None)
    cos_j = np.clip(-(D * N[None, :, :]).sum(-1) / r, 0, None)
    f = cos_i * cos_j * A[None, :] / (np.pi * r2 + A[None, :])
    # is the straight line between the two patches blocked?
    O = P[a:b, None, :] + N[a:b, None, :] * EPS
    Dn = np.where(np.abs(D) < 1e-9, 1e-9, D)
    seen = np.ones(f.shape, bool)
    for lo, hi in blockers:
        t1, t2 = (lo + EPS - O) / Dn, (hi - EPS - O) / Dn
        enter, leave = np.minimum(t1, t2).max(-1), np.maximum(t1, t2).min(-1)
        seen &= ~((enter < leave) & (leave > EPS) & (enter < 1 - EPS))
    F[a:b] = f * seen
print("light paths found")

# ---- let the light bounce until it settles ----
B = E.copy()
for bounce in range(40):
    B_new = E + RHO * (F @ B)
    if np.abs(B_new - B).max() < 1e-5:
        break
    B = B_new
print("settled after", bounce + 1, "bounces")

# ---- from light to picture ----
white = np.concatenate([B[s["first"]:s["first"] + s["count"]] for s in surfaces if s["name"] in ("wall-left", "wall-right")])
exposure = 0.74 / np.percentile(white.mean(-1), 60)          # a white wall lands just short of pure white


def to_srgb(x):
    x = np.clip(x * exposure, 0, 1)
    return np.where(x <= 0.0031308, x * 12.92, 1.055 * x ** (1 / 2.4) - 0.055)


flat_colours = {}
for s in surfaces:
    img = to_srgb(B[s["first"]:s["first"] + s["count"]].reshape(s["nv"], s["nu"], 3))
    if not s["save"]:
        r, g, b_ = (img.reshape(-1, 3).mean(0) * 255).round().astype(int)
        flat_colours[s["name"]] = f"#{r:02x}{g:02x}{b_:02x}"
        continue
    im = Image.fromarray((img[::-1] * 255).round().astype(np.uint8), "RGB")      # row 0 of a picture is its top
    # Each patch is one pixel. Enlarge smoothly, so the page never shows the squares.
    # A blur about half a patch wide then removes the last trace of the patch grid.
    # Saved without loss: lossy compression draws its own faint grid on smooth pictures.
    im = im.resize((s["nu"] * 8, s["nv"] * 8), Image.BICUBIC).filter(ImageFilter.GaussianBlur(4))
    im.save(OUT / f"{s['name']}.webp", "WEBP", lossless=True, method=6)
    print(s["name"], im.size)

(ROOT / "assets" / "js" / "light-data.js").write_text(
    "/* Generated by tools/bake_light.py. The lit colour of the small faces that do not get a picture of their own. */\n"
    "window.BG_LIGHT = " + json.dumps(flat_colours, indent=1) + ";\n", "utf-8")
print(flat_colours)
