/* Blue Gallery virtual room.

   One engine, two rooms. The page picks the room with data-room on <body>:
   - "first": the first room, kept as it was: oak floor, glowing ceiling grid,
              one floating wall. Its light is painted by hand. Start here to try
              a new direction from scratch.
   - "quiet": the same plan, done the way real galleries do it. One plain floor,
              flat walls with a shadow line, a daylight ceiling, and two muted
              colours. Its light is worked out by tools/bake_light.py, so it has
              real soft shadows and colour that spills from wall to floor.
   Notes are in docs/virtual-gallery-brief.md and docs/gallery-surfaces-research.md.
   Units are metres. */
/* Loaded as a plain script by the page, so it also opens straight from disk. */
(function () {
const THREE = window.THREE;
const ROOM = document.body.dataset.room === "first" ? "first" : "quiet";
const QUIET = ROOM === "quiet";

const W = 9, L = 14;                          /* room: width (x) and length (z) */
const H = QUIET ? 5.6 : 4.5;                  /* height (y). The quiet room is taller, so its ceiling of fins has air under it. */
const HX = W / 2, HZ = L / 2;
const EYE = 1.6, HANG = 1.47;
const UP = new THREE.Vector3(0, 1, 0);

/* both rooms: one floating wall, a doorway and a bench */
const PART = { z: 0.5, w: 4, h: 3.2, t: 0.3, lift: 0.1 };
const DOOR = { w: 2, h: 2.7 };
const SEAT = { x: 0, z: -3.4, w: 2, d: 0.5, h: 0.42 };
/* first room only: a plinth, and track for the spots */
const PLINTH = { x: -1.25, z: -0.95, w: 0.45, h: 1.05 };
const SPOT_BACK = 1.6, TRACK_Y = H - 0.4, BLUE = 0x00aeef;

/* Where each work hangs: title, wall, and distance along that wall. */
const PLAN = [
  ["The Heart Of The Land", "part", 0],
  ["Colors Igniting", "entry", -2.75], ["Reflections In Bloom", "entry", 2.75],
  ["Promises Ahead", "far", -2.1], ["Black & White Quiet", "far", 2.1],
  ["Embraced By Nature's Glee", "left", -4.2], ["Mountains Kiss The Sky", "left", 0], ["Flowers When The Sun Sets", "left", 4.2],
  ["Shadows Under A Golden Sky", "right", -4.2], ["Dreams Around The Trees", "right", 0], ["Flowers Gentle Glow", "right", 4.2],
];
const WALLS = {
  left: (s) => ({ p: [-HX, s], n: [1, 0] }),
  right: (s) => ({ p: [HX, s], n: [-1, 0] }),
  far: (s) => ({ p: [s, -HZ], n: [0, 1] }),
  entry: (s) => ({ p: [s, HZ], n: [0, -1] }),
  part: (s) => ({ p: [s, PART.z + PART.t / 2], n: [0, 1] }),
  partback: (s) => ({ p: [s, PART.z - PART.t / 2], n: [0, -1] }),
};
/* Things the visitor cannot walk through: centre, half width, half depth. */
const BLOCKS = [
  { x: 0, z: PART.z, hw: PART.w / 2, hd: PART.t / 2 },
  { x: SEAT.x, z: SEAT.z, hw: SEAT.w / 2, hd: SEAT.d / 2 },
  ...(QUIET ? [] : [{ x: PLINTH.x, z: PLINTH.z, hw: PLINTH.w / 2, hd: PLINTH.w / 2 }]),
];

/* "53 × 76 1/2 in" -> [height, width] in metres */
const parseIn = (s) => s.replace(" in", "").split("×").map((p) => p.trim().split(" ").reduce((a, t) => a + (t.includes("/") ? t.split("/")[0] / t.split("/")[1] : +t), 0) * 0.0254);
const works = ((window.BG || {}).exhibition || {}).works || [];
const slots = PLAN.map(([title, wall, s]) => {
  const w = works.find((x) => x.title === title);
  const [h, wd] = w ? parseIn(w.in) : [1.47, 1.47];
  const { p, n } = WALLS[wall](s);
  return { title, work: w, w: wd, h, glow: 0, p: new THREE.Vector3(p[0], HANG, p[1]), n: new THREE.Vector3(n[0], 0, n[1]) };
});

/* ---------- Renderer ---------- */
const canvas = document.getElementById("room");
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" }); }
catch (e) { document.getElementById("fail").style.display = "grid"; throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(QUIET ? 0xdedcd7 : 0xe9e5dd);
const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 60);
camera.rotation.order = "YXZ";

/* ---------- Painted textures ---------- */
function paint(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}
const basic = (o) => new THREE.MeshBasicMaterial(o);
/* Every picture file goes through one loader, so the page can wait for all of them before it shows the room. */
const manager = new THREE.LoadingManager();
const loader = new THREE.TextureLoader(manager);
function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

/* The first room's wall: brightest under the ceiling wash, a little shade low
   down and in the corners, and a skirting board. */
const wallTex = paint(512, 512, (g, w, h) => {
  const v = g.createLinearGradient(0, 0, 0, h);
  v.addColorStop(0, "#efece6"); v.addColorStop(0.45, "#e8e4dc"); v.addColorStop(0.9, "#dfdbd3"); v.addColorStop(1, "#d9d5cd");
  g.fillStyle = v; g.fillRect(0, 0, w, h);
  for (const [a, b] of [[0, 0.07], [1, 0.93]]) {
    const s = g.createLinearGradient(a * w, 0, b * w, 0);
    s.addColorStop(0, "rgba(40,34,26,.16)"); s.addColorStop(1, "rgba(40,34,26,0)");
    g.fillStyle = s; g.fillRect(0, 0, w, h);
  }
  const top = g.createLinearGradient(0, 0, 0, h * 0.05);
  top.addColorStop(0, "rgba(40,34,26,.12)"); top.addColorStop(1, "rgba(40,34,26,0)");
  g.fillStyle = top; g.fillRect(0, 0, w, h * 0.05);
  /* skirting board: 12 cm, with a thin shadow line above it */
  const sk = h * (1 - 0.12 / H);
  g.fillStyle = "#e6e2da"; g.fillRect(0, sk, w, h - sk);
  g.fillStyle = "rgba(40,34,26,.22)"; g.fillRect(0, sk - 1, w, 2);
});
const wallMat = basic({ map: wallTex });

/* The pool of light a spot leaves on a wall. */
const poolTex = paint(256, 256, (g, w, h) => {
  /* centred, and gone before the edge of the square, so no side ever shows a cut */
  const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.48);
  r.addColorStop(0, "rgba(255,244,222,1)"); r.addColorStop(0.42, "rgba(255,244,222,.62)"); r.addColorStop(0.8, "rgba(255,244,222,.12)"); r.addColorStop(1, "rgba(255,244,222,0)");
  g.fillStyle = r; g.fillRect(0, 0, w, h);
});

/* ---------- Building blocks ---------- */
const solid = [];      /* things a click can land on */
const afterFonts = [];  /* things to draw once the page's typefaces have arrived */
function plane(w, h, mat, x, y, z, ry = 0, rx = 0, hit = false) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, 0, "YXZ");
  scene.add(m); if (hit) solid.push(m);
  return m;
}
/* A box with its own shade per side, since nothing here is lit: +x, -x, top, bottom, +z, -z */
function box(w, h, d, sides, x, y, z, hit = false) {
  const c = (v) => (v && v.isMaterial ? v : basic({ color: v }));
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [sides.x, sides.x, sides.top, sides.bottom, sides.z, sides.z].map(c));
  m.position.set(x, y, z); scene.add(m); if (hit) solid.push(m);
  return m;
}
const flat = (c) => ({ x: c, z: c, top: c, bottom: c });
/* The quiet room has a polished floor. Its reflection is a second copy of the
   room, upside down under a floor that lets a little of it show through. */
function reflect(m) {
  if (!QUIET) return m;
  const c = m.clone(); c.scale.y *= -1; c.position.y *= -1; scene.add(c);
  return m;
}

function layFloor(mat, shadeTex) {
  const f = plane(W, L, mat, 0, 0, 0, 0, -Math.PI / 2, true); f.renderOrder = 1;
  plane(W, L, basic({ map: shadeTex, transparent: true, depthWrite: false }), 0, 0.004, 0, 0, -Math.PI / 2).renderOrder = 2;
  return f;
}
const S = 48;      /* pixels per metre in the pictures painted over a floor */

let floor;

/* =====================================================================
   Room: first. The first room, kept as it was: oak floor, a grid of glowing
   ceiling panels, one floating wall, a bench and an empty acrylic plinth.
   Go back to this one to start a new design from scratch.
   ===================================================================== */
if (!QUIET) {
  /* Oak planks, running the length of the room. One tile is 3.6 m square. */
  const TILE = 3.6;
  const floorTex = paint(1024, 1024, (g, w, h) => {
    const N = 24, pw = w / N, rnd = rng(7);
    for (let i = 0; i < N; i++) {
      let y = -rnd() * 500;
      while (y < h) {
        const len = 340 + rnd() * 320, l = 66 + rnd() * 4.5, s = 27 + rnd() * 6, hue = 31 + rnd() * 3;
        g.fillStyle = `hsl(${hue} ${s}% ${l}%)`; g.fillRect(i * pw, y, pw, len);
        for (let k = 0; k < 5; k++) { g.fillStyle = `rgba(90,60,30,${0.03 + rnd() * 0.04})`; g.fillRect(i * pw + rnd() * pw, y, 1, len); }
        g.fillStyle = "rgba(60,40,20,.2)"; g.fillRect(i * pw, y + len - 1, pw, 1.2);
        y += len;
      }
      g.fillStyle = "rgba(60,40,20,.2)"; g.fillRect(i * pw, 0, 1, h);
    }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(W / TILE, L / TILE);

  /* Ceiling grid: three bays across, five along. Each bay holds one glowing panel. */
  const BAY_X = [-3, 0, 3], BAY_Z = [-5.6, -2.8, 0, 2.8, 5.6];
  /* Floor shade: light under each panel, shade along the walls, the rug, and
     soft shadows under everything that stands on the floor. */
  const shadeTex = paint(W * S, L * S, (g, w, h) => {
    const X = (x) => (x + HX) * S, Z = (z) => (z + HZ) * S;
    for (const x of BAY_X) for (const z of BAY_Z) {
      const r = g.createRadialGradient(X(x), Z(z), 0, X(x), Z(z), 1.7 * S);
      r.addColorStop(0, "rgba(255,252,244,.15)"); r.addColorStop(1, "rgba(255,252,244,0)");
      g.fillStyle = r; g.fillRect(0, 0, w, h);
    }
    const edge = (x0, y0, x1, y1) => { const e = g.createLinearGradient(x0, y0, x1, y1); e.addColorStop(0, "rgba(30,22,14,.34)"); e.addColorStop(1, "rgba(30,22,14,0)"); g.fillStyle = e; g.fillRect(0, 0, w, h); };
    const d = 1.1 * S;
    edge(0, 0, d, 0); edge(w, 0, w - d, 0); edge(0, 0, 0, d); edge(0, h, 0, h - d);
    const soft = (x, z, hw, hd, alpha, spread) => {
      for (let i = 0; i < 10; i++) {
        const e = (spread * i) / 9;
        g.fillStyle = `rgba(24,18,12,${alpha / 10})`;
        g.beginPath(); g.roundRect(X(x - hw - e), Z(z - hd - e), (hw + e) * 2 * S, (hd + e) * 2 * S, e * S + 2); g.fill();
      }
    };
    /* rug */
    soft(SEAT.x, SEAT.z, 1.7, 1.25, 0.12, 0.12);
    g.fillStyle = "rgba(178,173,165,.95)"; g.fillRect(X(SEAT.x - 1.7), Z(SEAT.z - 1.25), 3.4 * S, 2.5 * S);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${i % 2 ? 255 : 60},${i % 2 ? 255 : 60},${i % 2 ? 255 : 60},.05)`; g.fillRect(X(SEAT.x - 1.7) + ((i * 7919) % (3.4 * S)), Z(SEAT.z - 1.25) + ((i * 104729) % (2.5 * S)), 2, 2); }
    /* contact shadows */
    soft(SEAT.x, SEAT.z, SEAT.w / 2, SEAT.d / 2, 0.5, 0.3);
    soft(0, PART.z, PART.w / 2, PART.t / 2, 0.5, 0.45);
    soft(PLINTH.x, PLINTH.z, PLINTH.w / 2, PLINTH.w / 2, 0.22, 0.25);
  });
  floor = layFloor(basic({ map: floorTex }), shadeTex);

  plane(L, H, wallMat, -HX, H / 2, 0, Math.PI / 2, 0, true);
  plane(L, H, wallMat, HX, H / 2, 0, -Math.PI / 2, 0, true);
  plane(W, H, wallMat, 0, H / 2, -HZ, 0, 0, true);
  /* entry wall: two sides and a lintel around the doorway */
  const sideW = (W - DOOR.w) / 2;
  plane(sideW, H, wallMat, -(DOOR.w + sideW) / 2, H / 2, HZ, Math.PI, 0, true);
  plane(sideW, H, wallMat, (DOOR.w + sideW) / 2, H / 2, HZ, Math.PI, 0, true);
  plane(DOOR.w, H - DOOR.h, basic({ color: 0xebe8e2 }), 0, DOOR.h + (H - DOOR.h) / 2, HZ, Math.PI);
  /* doorway: daylight beyond, and one line of the gallery's blue around it */
  const dayTex = paint(8, 256, (g, w, h) => { const d = g.createLinearGradient(0, 0, 0, h); d.addColorStop(0, "#f4fafd"); d.addColorStop(0.7, "#fbf8f1"); d.addColorStop(1, "#e9dfcf"); g.fillStyle = d; g.fillRect(0, 0, w, h); });
  plane(DOOR.w, DOOR.h, basic({ map: dayTex }), 0, DOOR.h / 2, HZ + 0.3, Math.PI);
  for (const sx of [-1, 1]) box(0.3, DOOR.h, 0.3, flat(0xf2efe9), sx * (DOOR.w / 2 + 0.15), DOOR.h / 2, HZ + 0.15);
  box(0.03, DOOR.h, 0.03, flat(BLUE), -DOOR.w / 2 + 0.015, DOOR.h / 2, HZ - 0.01);
  box(0.03, DOOR.h, 0.03, flat(BLUE), DOOR.w / 2 - 0.015, DOOR.h / 2, HZ - 0.01);
  box(DOOR.w, 0.03, 0.03, flat(BLUE), 0, DOOR.h - 0.015, HZ - 0.01);
  /* daylight spilling in across the floor */
  const spillTex = paint(128, 256, (g, w, h) => { const s = g.createLinearGradient(0, h, 0, 0); s.addColorStop(0, "rgba(255,250,238,.5)"); s.addColorStop(1, "rgba(255,250,238,0)"); g.fillStyle = s; g.beginPath(); g.moveTo(w * 0.22, h); g.lineTo(w * 0.78, h); g.lineTo(w, 0); g.lineTo(0, 0); g.fill(); });
  plane(3.4, 3.2, basic({ map: spillTex, transparent: true, depthWrite: false }), 0, 0.006, HZ - 1.6, 0, -Math.PI / 2).renderOrder = 3;

  /* ceiling, beams and glowing panels */
  plane(W, L, basic({ color: 0xe4e0d9 }), 0, H, 0, 0, Math.PI / 2);
  const beam = { x: 0xf1eee8, z: 0xf1eee8, top: 0xd8d4cc, bottom: 0xd3cfc7 };
  for (const x of [-4.5, -1.5, 1.5, 4.5]) box(0.24, 0.36, L, beam, x, H - 0.18, 0);
  for (const z of [-7, -4.2, -1.4, 1.4, 4.2, 7]) box(W, 0.36, 0.24, beam, 0, H - 0.18, z);
  const glowTex = paint(128, 128, (g, w, h) => { g.fillStyle = "#f3f2ee"; g.fillRect(0, 0, w, h); const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7); r.addColorStop(0, "#ffffff"); r.addColorStop(0.6, "#ffffff"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, w, h); });
  for (const x of BAY_X) for (const z of BAY_Z) plane(2.5, 2.3, basic({ map: glowTex }), x, H - 0.012, z, 0, Math.PI / 2);

  /* the floating wall: lifted off the floor on a dark, set-back base */
  box(PART.w, PART.h, PART.t, { x: 0xd9d5cd, z: wallMat, top: 0xefece6, bottom: 0x8d8a84 }, 0, PART.lift + PART.h / 2, PART.z, true);
  box(PART.w - 0.3, PART.lift, PART.t - 0.12, flat(0x2a2826), 0, PART.lift / 2, PART.z);

  /* bench */
  box(SEAT.w, 0.16, SEAT.d, { x: 0x77797d, z: 0x84868a, top: 0x9fa1a5, bottom: 0x55575a }, SEAT.x, SEAT.h - 0.08, SEAT.z);
  for (const sx of [-1, 1]) box(0.05, SEAT.h - 0.16, SEAT.d - 0.1, { x: 0x2c2c2c, z: 0x383838, top: 0x2c2c2c, bottom: 0x2c2c2c }, SEAT.x + sx * (SEAT.w / 2 - 0.2), (SEAT.h - 0.16) / 2, SEAT.z);

  /* clear acrylic plinth, empty */
  {
    const geo = new THREE.BoxGeometry(PLINTH.w, PLINTH.h, PLINTH.w);
    const body = new THREE.Mesh(geo, basic({ color: 0xffffff, transparent: true, opacity: 0.1, depthWrite: false }));
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }));
    const cap = new THREE.Mesh(new THREE.PlaneGeometry(PLINTH.w, PLINTH.w), basic({ color: 0xffffff, transparent: true, opacity: 0.28, depthWrite: false }));
    cap.rotation.x = -Math.PI / 2; cap.position.y = PLINTH.h / 2 + 0.001;
    const grp = new THREE.Group(); grp.add(body, edges, cap); grp.position.set(PLINTH.x, PLINTH.h / 2, PLINTH.z); scene.add(grp);
  }

  /* track along every hanging wall; the spots themselves are added with the works */
  const trackMat = flat(0x34322f);
  box(0.035, 0.03, L - 1.2, trackMat, -HX + SPOT_BACK, TRACK_Y, 0);
  box(0.035, 0.03, L - 1.2, trackMat, HX - SPOT_BACK, TRACK_Y, 0);
  box(W - 1.2, 0.03, 0.035, trackMat, 0, TRACK_Y, -HZ + SPOT_BACK);
  box(W - 1.2, 0.03, 0.035, trackMat, 0, TRACK_Y, HZ - SPOT_BACK);
  box(W - 3.2, 0.03, 0.035, trackMat, 0, TRACK_Y, PART.z + PART.t / 2 + SPOT_BACK);
}

/* =====================================================================
   Room: quiet. One floor, flat walls, a daylight ceiling, two muted colours.
   Every large surface wears a picture made by tools/bake_light.py. That
   picture already holds the surface's colour and the light that falls on it.
   ===================================================================== */
if (QUIET) {
  const LIGHT = window.BG_LIGHT || {};
  const lit = (name) => { const t = loader.load(`assets/img/light/${name}.webp`); t.colorSpace = THREE.SRGBColorSpace; return basic({ map: t }); };
  const DARK_LINE = 0x24221f;

  /* --- floor: polished concrete. The light comes from the picture. On top go
     fine joints, and crisp contact shadows right under the wall and the bench. --- */
  const litFloor = lit("floor"); litFloor.transparent = true; litFloor.opacity = 0.9;
  floor = layFloor(litFloor, paint(W * S, L * S, (g, w, h) => {
    const X = (x) => (x + HX) * S, Z = (z) => (z + HZ) * S;
    g.fillStyle = "rgba(30,30,34,.13)";
    for (const x of [-1.5, 1.5]) g.fillRect(X(x), 0, 1, h);
    for (const z of [-4.2, -1.4, 1.4, 4.2]) g.fillRect(0, Z(z), w, 1);
    const soft = (x, z, hw, hd, alpha, spread) => {
      for (let i = 0; i < 10; i++) {
        const e = (spread * i) / 9;
        g.fillStyle = `rgba(20,18,16,${alpha / 10})`;
        g.beginPath(); g.roundRect(X(x - hw - e), Z(z - hd - e), (hw + e) * 2 * S, (hd + e) * 2 * S, e * S + 2); g.fill();
      }
    };
    soft(0, PART.z, PART.w / 2, PART.t / 2, 0.3, 0.16);
    soft(SEAT.x, SEAT.z, SEAT.w / 2, SEAT.d / 2, 0.36, 0.1);
  }));

  /* --- walls: flat, each with its picture. Where a wall meets the floor there
     is no skirting board, only a thin dark line: the shadow gap. --- */
  const line = basic({ color: DARK_LINE });
  function wall(len, name, x, z, ry) {
    reflect(plane(len, H, lit(name), x, H / 2, z, ry, 0, true));
    const g = plane(len, 0.035, line, x, 0.0175, z, ry); g.translateZ(0.002);
  }
  wall(L, "wall-left", -HX, 0, Math.PI / 2);
  wall(L, "wall-right", HX, 0, -Math.PI / 2);
  wall(W, "wall-far", 0, -HZ, 0);                       /* dusk blue */
  /* --- the entry wall, and the way in: a doorway 1.5 m wide and 2.75 m high, cut
     through a thick wall, with one great oak door standing open on a pivot.
     Warm light comes in from the lobby beyond. --- */
  {
    const OW = 1.5, OH = 2.75, THICK = 0.36, BRONZE = 0x2b2623;
    /* the wall is built in three pieces round the opening. Each shows its own part of the wall's picture. */
    const entry = lit("wall-entry");
    function piece(x0, x1, y0, y1) {
      const g = new THREE.PlaneGeometry(x1 - x0, y1 - y0), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, at = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (HX - (cx - at.getX(i))) / W, (cy + at.getY(i)) / H);
      const m = new THREE.Mesh(g, entry); m.position.set(cx, cy, HZ); m.rotation.y = Math.PI;
      scene.add(m); solid.push(m); reflect(m);
      if (y0 === 0) plane(x1 - x0, 0.035, line, cx, 0.0175, HZ - 0.002, Math.PI);
    }
    piece(-HX, -OW / 2, 0, H); piece(OW / 2, HX, 0, H); piece(-OW / 2, OW / 2, OH, H);
    /* the thickness of the wall, lined in dark bronze, with a fine bronze edge on the room side */
    const bronze = flat(BRONZE), lining = { x: 0x3a332e, z: BRONZE, top: BRONZE, bottom: 0x3a332e };
    for (const sx of [-1, 1]) {
      reflect(box(0.06, OH, THICK, lining, sx * (OW / 2 + 0.03), OH / 2, HZ + THICK / 2 + 0.002));
      reflect(box(0.025, OH + 0.025, 0.02, bronze, sx * (OW / 2 + 0.0125), (OH + 0.025) / 2, HZ - 0.01));
    }
    reflect(box(OW + 0.12, 0.06, THICK, lining, 0, OH + 0.03, HZ + THICK / 2 + 0.002));
    reflect(box(OW + 0.05, 0.025, 0.02, bronze, 0, OH + 0.0125, HZ - 0.01));
    /* the lobby beyond: a small bright room, seen past the door */
    const DEEP = 2.2, back = HZ + THICK + DEEP;
    const glowWall = paint(8, 256, (g, w, h) => { const v = g.createLinearGradient(0, 0, 0, h); v.addColorStop(0, "#fffaf0"); v.addColorStop(0.55, "#fbf0dc"); v.addColorStop(1, "#ecd9bb"); g.fillStyle = v; g.fillRect(0, 0, w, h); });
    reflect(plane(OW + 2.4, OH + 0.6, basic({ map: glowWall }), 0, (OH + 0.6) / 2, back, Math.PI));
    for (const sx of [-1, 1]) reflect(plane(DEEP, OH + 0.6, basic({ color: 0xf3e6cf }), sx * (OW / 2 + 1.2), (OH + 0.6) / 2, HZ + THICK + DEEP / 2, sx * -Math.PI / 2));
    plane(OW + 2.4, DEEP + THICK, basic({ color: 0xd9cdb9 }), 0, -0.002, HZ + (DEEP + THICK) / 2, 0, -Math.PI / 2);
    plane(OW + 2.4, DEEP + THICK, basic({ color: 0xfffaf0 }), 0, OH + 0.6, HZ + (DEEP + THICK) / 2, 0, Math.PI / 2);
    /* the door: one slab of oak, nearly as big as the opening, turning on a pivot
       set a quarter of the way along. It stands open, its long side swung out
       into the lobby and its short side just into the room. */
    const oak = paint(512, 1024, (g, w, h) => {
      const rnd = rng(41);
      const v = g.createLinearGradient(0, 0, 0, h);
      v.addColorStop(0, "#b99165"); v.addColorStop(0.5, "#aa835b"); v.addColorStop(1, "#96714e");
      g.fillStyle = v; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 320; i++) {                    /* long, straight grain */
        g.fillStyle = `rgba(${rnd() > 0.5 ? "70,44,22" : "236,204,164"},${0.04 + rnd() * 0.09})`;
        g.fillRect(rnd() * w, 0, 0.6 + rnd() * 1.8, h);
      }
      g.fillStyle = "rgba(40,24,12,.45)";                 /* five boards: four fine joints */
      for (let k = 1; k < 5; k++) g.fillRect((k * w) / 5, 0, 1.2, h);
    });
    const LW = OW - 0.05, LH = OH - 0.03, LT = 0.07, PIVOT = 0.4, SWING = -0.66;
    const face = basic({ map: oak });
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(LW, LH, LT).translate(LW / 2 - PIVOT, 0, 0),
      [basic({ color: 0x8a6746 }), basic({ color: 0x8a6746 }), basic({ color: 0xb99165 }), basic({ color: 0x6f5238 }), face, face]);
    leaf.position.set(-OW / 2 + 0.025 + PIVOT, LH / 2 + 0.012, HZ + THICK / 2); leaf.rotation.y = SWING;
    scene.add(leaf); reflect(leaf);
    /* a long bronze pull on the room side, near the door's free edge */
    const pull = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.3, 0.03), basic({ color: 0x1e1b19 }));
    pull.position.set(LW - PIVOT - 0.16, -LH / 2 + 1.2, -LT / 2 - 0.05); leaf.add(pull);
    for (const y of [-0.55, 0.55]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.05), basic({ color: 0x1e1b19 })); post.position.set(0, y, 0.035); pull.add(post); }
  }

  /* --- ceiling: one soft sheet of light, seen through a field of deep white
     fins. The fins run across the room. Their depth rises and falls in a slow
     wave from the door to the far wall, so the ceiling has a gentle swell.
     Galleries use fins like these to break up daylight (see the Menil
     Collection in docs/gallery-surfaces-research.md). --- */
  {
    reflect(plane(W, L, basic({ color: 0xfbfaf6 }), 0, H, 0, 0, Math.PI / 2));
    /* each fin is lit from above: bright at the top, greyer at its lower edge */
    const finTex = paint(8, 64, (g, w, h) => { const v = g.createLinearGradient(0, 0, 0, h); v.addColorStop(0, "#fdfcf9"); v.addColorStop(0.55, "#eceae5"); v.addColorStop(1, "#d3d1cb"); g.fillStyle = v; g.fillRect(0, 0, w, h); });
    const fin = basic({ map: finTex, side: THREE.DoubleSide });
    const GAP = 0.4;
    for (let z = -HZ + GAP / 2; z < HZ; z += GAP) {
      const deep = 0.55 + 0.22 * Math.sin(z * 0.82 + 0.6);
      /* A real board, 3 cm thick. A flat sheet vanishes when seen exactly edge-on,
         which left a gap in the ceiling right above the visitor's head. */
      reflect(box(W, deep, 0.03, { x: 0xe6e4df, z: fin, top: 0xfdfcf9, bottom: 0xcfcdc7 }, 0, H - deep / 2, z));
    }
  }

  /* --- the floating wall, in a pale blue-grey: lifted off the floor on a dark, set-back base --- */
  const end = basic({ color: LIGHT["part-end-right"] || "#b59987" });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(PART.w, PART.h, PART.t),
    [end, end, basic({ color: LIGHT["part-top"] || "#e6cbbb" }), basic({ color: 0x5f6468 }), lit("part-front"), lit("part-back")]);
  slab.position.set(0, PART.lift + PART.h / 2, PART.z); scene.add(slab); solid.push(slab); reflect(slab);
  box(PART.w - 0.3, PART.lift, PART.t - 0.12, flat(DARK_LINE), 0, PART.lift / 2, PART.z);

  /* --- the back of the floating wall carries the exhibition text, as a gallery
     would letter it on the wall: artist, title, dates, a short introduction, and
     a line for the gallery. The lead work hangs on the front, facing the door. --- */
  {
    const EX = (window.BG || {}).exhibition || {}, TW = 3.4, TH = 2.3, PX = 640;
    const at = new THREE.Vector3(0, PART.lift + PART.h / 2, PART.z - PART.t / 2);
    const mat = basic({ transparent: true, opacity: 0, depthWrite: false });
    const m = plane(TW, TH, mat, at.x, at.y, at.z - 0.004, Math.PI, 0, true);
    m.userData.text = { p: at, n: new THREE.Vector3(0, 0, -1), w: TW, h: TH };
    afterFonts.push(() => {
      mat.map = paint(TW * PX, TH * PX, (g, w, h) => {
        const INK = "#1c2328", X0 = 110, WIDE = 1780;
        const wrap = (text, y, lead) => {
          let line = "";
          for (const word of text.split(/\s+/)) {
            if (line && g.measureText(line + " " + word).width > WIDE) { g.fillText(line, X0, y); y += lead; line = word; }
            else line = line ? line + " " + word : word;
          }
          if (line) { g.fillText(line, X0, y); y += lead; }
          return y;
        };
        g.fillStyle = INK; g.textBaseline = "alphabetic";
        g.font = '500 46px "Inter Tight", system-ui, sans-serif';
        if ("letterSpacing" in g) g.letterSpacing = "9px";
        g.fillText((EX.artist || "Isaac Maimon").toUpperCase(), X0, 190);
        if ("letterSpacing" in g) g.letterSpacing = "0px";
        g.font = 'italic 205px "Instrument Serif", "Times New Roman", serif';
        g.fillText(EX.title || "The Landscape Within", X0 - 8, 410);
        g.fillRect(X0, 478, 190, 3);
        const day = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });
        g.globalAlpha = 0.7; g.font = '400 42px "Inter Tight", system-ui, sans-serif';
        if (EX.start && EX.end) g.fillText(`${day(EX.start)} to ${day(EX.end)}, ${new Date(EX.end).getFullYear()}`, X0, 562);
        g.globalAlpha = 0.92; g.font = '400 49px "Inter Tight", system-ui, sans-serif';
        let y = wrap(EX.intro || "", 700, 76);
        g.globalAlpha = 1; g.font = 'italic 70px "Instrument Serif", "Times New Roman", serif';
        wrap((EX.quote || "").replace(/^"|"$/g, ""), y + 96, 88);
        /* the gallery, in one quiet line at the foot of the wall */
        g.globalAlpha = 0.62; g.font = '500 33px "Inter Tight", system-ui, sans-serif';
        if ("letterSpacing" in g) g.letterSpacing = "6px";
        g.fillText("PRESENTED BY BLUE GALLERY  ·  DELRAY BEACH, FLORIDA  ·  BLUEFINEART.COM", X0, h - 96);
      });
      mat.opacity = 1; mat.needsUpdate = true;
    });
  }

  /* --- bench: one plain block --- */
  reflect(box(SEAT.w, SEAT.h, SEAT.d, { x: LIGHT["seat-right"] || "#b5aa99", z: LIGHT["seat-front"] || "#b9ac9a", top: LIGHT["seat-top"] || "#ece4d6", bottom: 0x55524d }, SEAT.x, SEAT.h / 2, SEAT.z));
}

/* Artwork images: the local WebP copies from tools/optimize_images.py. Phones get the small size. */
const IMG = window.BG_IMG || {};
const TEX_W = Math.min(innerWidth, innerHeight) < 700 ? 640 : 1200;
/* The room stays behind a plain veil until every painting has arrived, so it
   appears once and whole instead of filling in piece by piece. */
const veil = document.getElementById("veil"), veilBar = document.getElementById("veilBar");
let shown = false;
function reveal() {
  if (shown) return;
  shown = true;
  /* hand every picture to the graphics card now, not during the first steps */
  for (const s of slots) if (s.baseTex && s.baseTex.image) renderer.initTexture(s.baseTex);
  tick(0);
  setTimeout(() => { veil.classList.add("gone"); setTimeout(() => veil.remove(), 900); }, 40);
}
manager.onProgress = (url, done, total) => { if (!shown) veilBar.style.transform = `scaleX(${done / total})`; };
manager.onLoad = () => fonts.then(reveal);
manager.onError = () => {};
setTimeout(reveal, 9000);   /* a slow or broken picture never holds the room back for good */
function artTexture(url) {
  const i = IMG[url];
  const src = i && i.w && i.w.length ? `${i.b}-${i.w.find((x) => x >= TEX_W) || i.w[i.w.length - 1]}.webp` : url;
  const t = loader.load(src);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}
/* the soft shadow a canvas throws on the wall behind it */
/* Picture lamps (quiet room). Each painting has a slim bronze lamp on two short
   arms above it, the kind galleries and collectors fit over a canvas. Three
   things make it read as lit: the glowing strip under the lamp, a soft patch
   of light on the wall around it, and a warm wash down the painting itself. */
const washTex = paint(128, 128, (g, w, h) => {
  /* brightest under the lamp, fading down the canvas and towards its ends */
  const v = g.createLinearGradient(0, 0, 0, h);
  v.addColorStop(0, "rgba(255,238,206,1)"); v.addColorStop(0.35, "rgba(255,238,206,.42)"); v.addColorStop(0.8, "rgba(255,238,206,0)");
  g.fillStyle = v; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = "destination-in";
  const side = g.createLinearGradient(0, 0, w, 0);
  side.addColorStop(0, "rgba(0,0,0,.25)"); side.addColorStop(0.22, "rgba(0,0,0,1)"); side.addColorStop(0.78, "rgba(0,0,0,1)"); side.addColorStop(1, "rgba(0,0,0,.25)");
  g.fillStyle = side; g.fillRect(0, 0, w, h);
});
const lampGeo = { arm: new THREE.BoxGeometry(0.012, 0.012, 0.15) };
const lampBronze = basic({ color: 0x2b2623 }), lampGlow = basic({ color: 0xfff3da });
function lamp(s) {
  const len = Math.min(1.1, s.w * 0.55), OUT = 0.15, UP = 0.3;      /* how far the lamp sits above the top of the canvas */
  const bar = new THREE.Mesh(new THREE.BoxGeometry(len, 0.03, 0.05), lampBronze);
  bar.position.copy(s.p).addScaledVector(s.n, OUT); bar.position.y = s.p.y + s.h / 2 + UP;
  bar.lookAt(bar.position.clone().add(s.n));
  const strip = new THREE.Mesh(new THREE.BoxGeometry(len - 0.04, 0.006, 0.032), lampGlow); strip.position.y = -0.018; bar.add(strip);
  for (const sx of [-1, 1]) { const arm = new THREE.Mesh(lampGeo.arm, lampBronze); arm.position.set(sx * len * 0.3, 0, -OUT / 2); bar.add(arm); }
  scene.add(bar); reflect(bar);
  /* light on the wall, behind and around the lamp */
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(len + 0.9, 0.9), basic({ map: poolTex, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.position.copy(s.p).addScaledVector(s.n, 0.007); halo.position.y = s.p.y + s.h / 2 + UP - 0.1;
  halo.lookAt(halo.position.clone().add(s.n)); scene.add(halo);
  /* light down the face of the painting */
  s.wash = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.h), basic({ map: washTex, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.wash.position.copy(s.p).addScaledVector(s.n, 0.012 + DEPTH + 0.002);
  s.wash.lookAt(s.wash.position.clone().add(s.n)); scene.add(s.wash);
}
const dropTex = paint(128, 128, (g, w, h) => {
  for (let i = 0; i < 12; i++) { g.fillStyle = "rgba(20,14,8,.085)"; const e = 4 + i * 2.2; g.beginPath(); g.roundRect(e, e, w - e * 2, h - e * 2, 26 - i * 1.6); g.fill(); }
});
const cardDropTex = paint(256, 128, (g, w, h) => {
  for (let i = 0; i < 6; i++) { g.fillStyle = "rgba(20,14,8,.17)"; g.fillRect(i, i, w - i * 2, h - i * 2); }
});
/* the small card beside each work */
function labelTexture(s) {
  const t = paint(1280, 640, (g, W2, H2) => {
    /* drawn at double size, so the card stays crisp when the view zooms in on it */
    g.scale(2, 2); const w = W2 / 2, h = H2 / 2;
    /* pure white, a shade brighter than the lit wall, with a fine dark edge */
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(20,20,20,.3)"; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2);
    g.fillStyle = "#141414"; g.textBaseline = "top";
    g.font = '500 30px "Inter Tight", system-ui, sans-serif'; g.fillText("Isaac Maimon", 36, 34);
    g.font = 'italic 46px "Instrument Serif", "Times New Roman", serif'; g.fillText(s.title, 36, 82, w - 72);
    g.fillStyle = "#55524d"; g.font = '400 25px "Inter Tight", system-ui, sans-serif';
    g.fillText(s.work ? s.work.medium : "", 36, 160, w - 72);
    g.fillText(s.work ? `${s.work.in}  ·  ${s.work.cm}` : "", 36, 198, w - 72);
    g.fillText("Price on request", 36, 250);
  });
  return t;
}
/* The sharp copy, for the one painting the visitor is standing at. On a large
   screen it is stitched from the deepest zoom tiles (up to 2400 px). A phone
   gets the 1600 px file. Only one sharp copy is kept in memory at a time. */
let sharp = null;
function sharpTexture(url) {
  const i = IMG[url] || {}, t = i.t;
  if (!t || TEX_W < 1200 || Math.max(t.W, t.H) > renderer.capabilities.maxTextureSize) {
    return new Promise((ok, fail) => {
      if (!i.w || !i.w.length) return fail();
      const tex = loader.load(`${i.b}-${i.w[i.w.length - 1]}.webp`, () => ok(tex), undefined, fail);
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    });
  }
  const level = Math.ceil(Math.log2(Math.max(t.W, t.H))), jobs = [];
  const c = document.createElement("canvas"); c.width = t.W; c.height = t.H;
  const g = c.getContext("2d");
  for (let col = 0; col < Math.ceil(t.W / t.s); col++) for (let row = 0; row < Math.ceil(t.H / t.s); row++) {
    jobs.push(new Promise((ok, fail) => {
      const im = new Image();
      im.onload = () => { g.drawImage(im, Math.max(0, col * t.s - t.o), Math.max(0, row * t.s - t.o)); ok(); };
      im.onerror = fail; im.src = `${t.u}${level}/${col}_${row}.webp`;
    }));
  }
  return Promise.all(jobs).then(() => {
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return tex;
  });
}
function sharpen(s) {
  if (sharp && sharp.slot === s) return;
  if (sharp && sharp.tex) { sharp.slot.art.material[4].map = sharp.slot.baseTex; sharp.tex.dispose(); }
  const mine = (sharp = { slot: s, tex: null });
  sharpTexture(s.work.img).then((tex) => {
    if (sharp !== mine) { tex.dispose(); return; }
    mine.tex = tex; s.art.material[4].map = tex;
  }).catch(() => {});
}
/* How far back to stand so a work fills most of the screen. */
function frameDist(s) {
  const t = Math.tan(THREE.MathUtils.degToRad(baseFov / 2));
  return Math.max(0.9, Math.max(s.h / 2 / t, s.w / 2 / (t * camera.aspect)) / 0.86);
}
const CARD = { w: 0.26, h: 0.13, y: 1.22 };
let baseFov = 62, zoom = null;   /* zoom: a narrower field of view, used to read a card */
const DEPTH = 0.04;
const headGeo = new THREE.CylinderGeometry(0.045, 0.05, 0.17, 20).rotateX(Math.PI / 2);
const headMat = basic({ color: 0xf6f4ef }), lensMat = basic({ color: 0xfff6dc });
for (const s of slots) {
  /* pool on the wall */
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(s.w + 1.5, s.h + 1.7), basic({ map: poolTex, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }));
  pool.position.copy(s.p).addScaledVector(s.n, 0.006); pool.position.y += 0.12;
  pool.lookAt(pool.position.clone().add(s.n)); scene.add(pool); s.pool = pool;
  if (!QUIET) {
    /* spot on the track, aimed at the work */
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.copy(s.p).addScaledVector(s.n, SPOT_BACK); head.position.y = TRACK_Y - 0.1;
    head.lookAt(s.p); scene.add(head);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.04, 20), lensMat);
    lens.position.set(0, 0, 0.086); head.add(lens);
    box(0.012, 0.09, 0.012, flat(0x34322f), head.position.x, TRACK_Y - 0.05, head.position.z);
  }
  if (!s.work) continue;
  /* shadow on the wall, then the canvas: a 4 cm deep box with the painting on its face */
  const drop = new THREE.Mesh(new THREE.PlaneGeometry(s.w + 0.2, s.h + 0.2), basic({ map: dropTex, transparent: true, opacity: 0.6, depthWrite: false }));
  drop.position.copy(s.p).addScaledVector(s.n, 0.009); drop.position.y -= 0.035;
  drop.lookAt(drop.position.clone().add(s.n)); scene.add(drop);
  const edge = basic({ color: new THREE.Color((IMG[s.work.img] || {}).c || "#888888").multiplyScalar(0.55) });
  const edgeTop = basic({ color: new THREE.Color((IMG[s.work.img] || {}).c || "#888888").multiplyScalar(0.8) });
  const art = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, DEPTH), [edge, edge, edgeTop, edge, basic({ map: (s.baseTex = artTexture(s.work.img)) }), edge]);
  s.art = art;
  art.position.copy(s.p).addScaledVector(s.n, 0.012 + DEPTH / 2);
  art.lookAt(art.position.clone().add(s.n));
  reflect(art);                   /* before the line below: a copy cannot carry a link back to its own slot */
  art.userData.slot = s; scene.add(art); solid.push(art);
  if (QUIET) lamp(s);
  /* label card, to the right of the work as you face it */
  const right = s.n.clone().negate().cross(UP);
  s.label = new THREE.Mesh(new THREE.PlaneGeometry(CARD.w, CARD.h), basic({ color: 0xffffff }));
  /* Light comes from above, so a card this close to the wall only shows a thin,
     soft line of shadow under its bottom edge. */
  const cardDrop = new THREE.Mesh(new THREE.PlaneGeometry(CARD.w + 0.006, CARD.h + 0.006), basic({ map: cardDropTex, transparent: true, opacity: 0.4, depthWrite: false }));
  s.label.userData.card = s; solid.push(s.label); s.right = right;
  /* an unseen margin round the card, so a click just beside it still counts */
  const reach = new THREE.Mesh(new THREE.PlaneGeometry(CARD.w + 0.12, CARD.h + 0.12), basic({ visible: false }));
  reach.userData.card = s; solid.push(reach); s.reach = reach;
  s.label.position.copy(s.p).addScaledVector(right, s.w / 2 + 0.28).addScaledVector(s.n, 0.012); s.label.position.y = CARD.y;
  s.reach.position.copy(s.label.position).addScaledVector(s.n, -0.002); s.reach.lookAt(s.reach.position.clone().add(s.n)); scene.add(s.reach);
  cardDrop.position.copy(s.label.position).addScaledVector(s.n, -0.004); cardDrop.position.y -= 0.004;
  cardDrop.lookAt(cardDrop.position.clone().add(s.n)); scene.add(cardDrop);
  s.label.lookAt(s.label.position.clone().add(s.n)); scene.add(s.label);
}

/* ---------- Walking ---------- */
const blocks = BLOCKS;
const PAD = 0.45;
const inside = (x, z, b) => Math.abs(x - b.x) < b.hw + PAD && Math.abs(z - b.z) < b.hd + PAD;
/* Keep a point inside the room and out of the furniture. */
function fix(x, z) {
  x = Math.max(-HX + 0.6, Math.min(HX - 0.6, x)); z = Math.max(-HZ + 0.6, Math.min(HZ - 0.6, z));
  for (const b of blocks) if (inside(x, z, b)) {
    const px = b.hw + PAD - Math.abs(x - b.x), pz = b.hd + PAD - Math.abs(z - b.z);
    if (px < pz) x += Math.sign(x - b.x || 1) * px; else z += Math.sign(z - b.z || 1) * pz;
  }
  return [x, z];
}
/* How far along the line from a to b the visitor first runs into block b0. 2 means never. */
const crossAt = (ax, az, bx, bz, b0) => { for (let i = 1; i < 60; i++) { const t = i / 60; if (inside(ax + (bx - ax) * t, az + (bz - az) * t, b0)) return t; } return 2; };

const pos = new THREE.Vector3(0, EYE, HZ - 1.4);
/* The eye glides to the height of whatever the visitor has walked up to. Level
   with the middle of a painting, it sees the painting square-on, with the same
   wall above it as below. Walking about, it returns to standing height. */
let eyeGoal = EYE;
let yaw = 0, pitch = -0.02, yawGoal = null, pitchGoal = 0, path = [];
/* The point the camera keeps in the middle of the view while it walks. Aiming
   at it from every step of the way stops the view dipping and rising again. */
let aim = null;
/* Standing at a painting, the view leans a little towards the mouse. */
let focus = false, leanX = 0, leanY = 0, mouseX = 0, mouseY = 0;
function walkTo(x, z, aimAt = null) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return;
  [x, z] = fix(x, z);
  path = [];
  /* Leg by leg: if something stands in the way, go round its nearer end, then look again. */
  let cx = pos.x, cz = pos.z;
  for (let guard = 0; guard < 6; guard++) {
    let first = null, when = 2;
    for (const b of blocks) { const t = crossAt(cx, cz, x, z, b); if (t < when) { when = t; first = b; } }
    if (!first) break;
    const ends = [-1, 1].map((s) => [first.x + s * (first.hw + PAD + 0.35), first.z]).filter(([ex]) => Math.abs(ex) <= HX - 0.6);
    if (!ends.length) break;
    const cost = ([ex, ez]) => Math.hypot(ex - cx, ez - cz) + Math.hypot(x - ex, z - ez);
    const turn = ends.sort((p, q) => cost(p) - cost(q))[0];
    path.push(turn); [cx, cz] = turn;
  }
  path.push([x, z]);
  aim = aimAt; yawGoal = aimAt ? yaw : null;
}

/* ---------- Pointer: drag to look, click to walk ---------- */
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
const ring = new THREE.Mesh(new THREE.RingGeometry(0.17, 0.21, 48).rotateX(-Math.PI / 2), basic({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false }));
ring.position.y = 0.012; ring.visible = false; scene.add(ring);
const cast = (e, list) => {
  const r = canvas.getBoundingClientRect();
  ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  return ray.intersectObjects(list, false)[0];
};
let down = null;
/* The controls legend opens with the page and folds away the first time the
   visitor moves. After that it only opens or closes when they ask. */
const legend = document.getElementById("legend"), legendTab = document.getElementById("legendTab");
let tucked = false;
const titleCard = document.getElementById("titleCard");
const setLegend = (open) => {
  legend.classList.toggle("open", open); legendTab.setAttribute("aria-expanded", open);
  /* the title card keeps the legend's hours: on show at first, away once the visitor is looking at art */
  if (titleCard) titleCard.classList.toggle("away", !open);
};
const tuck = () => { if (!tucked) { tucked = true; setLegend(false); } };
legendTab.addEventListener("click", () => { tucked = true; setLegend(!legend.classList.contains("open")); });

/* Find a free spot to stand, d metres out from a point on a wall. It steps
   closer until the spot is free, and always works one out: a low, wide work
   on a wide screen wants a distance near one metre. */
function spot(at, n, d) {
  let x, z;
  for (;;) {
    x = at.x + n.x * d; z = at.z + n.z * d;
    const [fx, fz] = fix(x, z);
    if (Math.abs(fx - x) + Math.abs(fz - z) < 0.01 || d <= 0.8) break;
    d = Math.max(0.8, d - 0.2);
  }
  return [x, z];
}
/* Walk up to a painting: stand in front of its centre, far enough back to take it in. */
let reading = null;   /* the work whose details card is being read */
/* Detail view: a second click on a painting the visitor already stands at zooms
   in on the spot that was clicked. */
let detail = null, lastTap = { slot: null, t: 0 }, lastCardTap = { card: null, t: 0 };
const DETAIL_ZOOM = 2.6;
function visit(slot) {
  zoom = null; reading = null; detail = null; focus = true; eyeGoal = slot.p.y;
  sharpen(slot);
  const [x, z] = spot(slot.p, slot.n, frameDist(slot));
  walkTo(x, z, slot.p);
}
/* The small button that leads from a card back to its painting. Escape does the same. */
const backBtn = document.getElementById("stepBack");
let backShown = false;
const stepBack = () => { if (reading) visit(reading); else if (detail) visit(detail); else zoom = null; };
backBtn.addEventListener("click", stepBack);
addEventListener("keydown", (e) => { if (e.code === "Escape" && zoom !== null) stepBack(); });
/* Two fingers on the screen pinch to zoom: spread them to zoom in, bring them
   together to zoom back out. Moving both fingers together turns the view.
   Zooming narrows the field of view. The visitor stays where they stand. */
const fingers = new Map();
let pinch = null;
const MAX_ZOOM = 4.5;
function spread() {
  const [a, b] = [...fingers.values()];
  return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
function zoomTo(fov) {
  fov = Math.max(baseFov / MAX_ZOOM, Math.min(baseFov, fov));
  zoom = fov > baseFov - 0.4 ? null : fov;
  camera.fov = fov; camera.updateProjectionMatrix();
}
canvas.addEventListener("pointerdown", (e) => {
  fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (fingers.size === 2) {
    const now = spread();
    pinch = { d: now.d, fov: camera.fov, x: now.x, y: now.y };
    down = null; canvas.classList.remove("dragging"); ring.visible = false;
    yawGoal = null; aim = null; path = []; tuck();
    return;
  }
  if (fingers.size > 2) return;
  /* What the click lands on is settled now, on the press. By the release the
     view may have shifted a little, and the same pixel would point elsewhere. */
  down = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, t: performance.now(), moved: 0, hit: cast(e, solid) };
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* the pointer has already gone: nothing to hold on to */ }
  canvas.classList.add("dragging"); canvas.focus({ preventScroll: true });
});
canvas.addEventListener("pointermove", (e) => {
  if (fingers.has(e.pointerId)) fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch) {
    if (fingers.size < 2) return;
    const now = spread(), k = (camera.fov / 62) * 0.0034;
    zoomTo(pinch.fov * pinch.d / now.d);
    yaw += (now.x - pinch.x) * k; pitch = Math.max(-0.7, Math.min(0.7, pitch + (now.y - pinch.y) * k));
    pinch.x = now.x; pinch.y = now.y;
    return;
  }
  if (down) {
    const dx = e.clientX - down.lx, dy = e.clientY - down.ly;
    down.lx = e.clientX; down.ly = e.clientY; down.moved += Math.abs(dx) + Math.abs(dy);
    if (down.moved > 6) {
      const k = (camera.fov / 62) * 0.0034;
      yaw += dx * k; pitch = Math.max(-0.7, Math.min(0.7, pitch + dy * k));
      yawGoal = null; aim = null; ring.visible = false; tuck();
    }
  } else if (e.pointerType === "mouse") {
    const r = canvas.getBoundingClientRect();
    mouseX = ((e.clientX - r.left) / r.width) * 2 - 1; mouseY = ((e.clientY - r.top) / r.height) * 2 - 1;
    const over = cast(e, solid);
    canvas.classList.toggle("over", !!over && !!(over.object.userData.card || over.object.userData.slot || over.object.userData.text));
    const h = cast(e, [floor]);
    ring.visible = !!h;
    if (h) { const [x, z] = fix(h.point.x, h.point.z); ring.position.set(x, 0.012, z); }
  }
});
const lift = (e) => {
  fingers.delete(e.pointerId);
  if (pinch) {
    /* the end of a pinch is never a click, even when one finger lifts first */
    if (fingers.size === 0) pinch = null;
    down = null; canvas.classList.remove("dragging");
    return;
  }
  canvas.classList.remove("dragging");
  if (!down) return;
  const click = down.moved <= 6 && performance.now() - down.t < 500, h = down.hit;
  down = null;
  if (!click || e.type === "pointercancel") return;
  if (!h) return;
  tuck();
  const slot = h.object.userData.slot;
  const n = slot ? slot.n : h.face.normal.clone().transformDirection(h.object.matrixWorld);
  /* a details card: step up to it and zoom in until it can be read */
  const card = h.object.userData.card;
  if (card) {
    if (reading === card && zoom !== null) {
      /* already reading this card: a double-click steps back to its painting */
      const now = performance.now(), twice = lastCardTap.card === card && now - lastCardTap.t < 420;
      lastCardTap = { card, t: twice ? 0 : now };
      if (twice) visit(card);
      return;
    }
    lastCardTap = { card, t: 0 };     /* the click that opens a card never counts towards a double-click */
    /* The card takes about a third of the view's width and sits to the right.
       The rest shows the edge of its painting. A tall phone screen gives the card more. */
    const share = camera.aspect < 1 ? 0.55 : 0.3, wide = CARD.w / share;
    const c = card.label.position.clone().addScaledVector(card.right, -(0.42 - share / 2) * wide);
    const [x, z] = fix(c.x + card.n.x * 1.3, c.z + card.n.z * 1.3);
    const far = Math.hypot(x - c.x, z - c.z);
    eyeGoal = c.y;
    zoom = THREE.MathUtils.radToDeg(2 * Math.atan(wide / 2 / (far * camera.aspect)));
    focus = true; reading = card;
    walkTo(x, z, c);
    return;
  }
  /* the exhibition text: walk up until the whole block is in view, level with its middle */
  const text = h.object.userData.text;
  if (text) {
    zoom = null; reading = null; detail = null; focus = true; eyeGoal = text.p.y;
    const [x, z] = spot(text.p, text.n, frameDist(text));
    walkTo(x, z, text.p);
    return;
  }
  /* paintings first: what a click on one means depends on whether the view is zoomed in */
  if (slot) {
    const now = performance.now(), twice = lastTap.slot === slot && now - lastTap.t < 420;
    lastTap = { slot, t: now };
    if (detail === slot && zoom !== null) {
      /* already zoomed in: a double-click steps back out, a single click moves the view to that spot */
      if (twice) { lastTap.t = 0; visit(slot); }
      else { aim = h.point.clone(); yawGoal = yaw; }
      return;
    }
    if (twice && focus && sharp && sharp.slot === slot) {
      /* stay where we stand, and narrow the view onto the clicked spot */
      lastTap.t = 0; detail = slot; reading = null; path = [];
      zoom = baseFov / DETAIL_ZOOM; aim = h.point.clone(); yawGoal = yaw;
      return;
    }
    visit(slot); return;
  }
  zoom = null; reading = null;
  eyeGoal = EYE;
  if (n.y > 0.5) { focus = false; walkTo(h.point.x, h.point.z); return; }
  if (Math.abs(n.y) > 0.5) return;
  /* a bare wall: stand back from that spot and face it */
  focus = false;
  const [x, z] = spot(h.point, n, 2.6);
  walkTo(x, z, new THREE.Vector3(h.point.x, EYE, h.point.z));
};
canvas.addEventListener("pointerup", lift);
canvas.addEventListener("pointercancel", lift);
canvas.addEventListener("pointerleave", () => (ring.visible = false));
/* No right-click menu on the room: it offers "Save image as", which hands out a
   picture of whatever painting is on screen. This stops the casual route only.
   Anyone can still take a screenshot. */
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

/* Wheel: step closer or further back along the line of sight. */
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  /* a pinch on a laptop trackpad arrives as a wheel turn with Ctrl held: zoom, do not walk */
  if (e.ctrlKey) { yawGoal = null; aim = null; zoomTo(camera.fov * Math.exp(e.deltaY * 0.01)); tuck(); return; }
  const step = Math.max(-0.6, Math.min(0.6, -e.deltaY * 0.0025));
  path = []; yawGoal = null; aim = null; zoom = null;
  [pos.x, pos.z] = fix(pos.x - Math.sin(yaw) * step, pos.z - Math.cos(yaw) * step);
  tuck();
}, { passive: false });

const keys = new Set();
const MOVE = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0] };
/* Keys walk the room, but never while the visitor is typing in a field.
   W, A, S and D are walking keys, and they are also letters: without this
   check they could not be typed into the password box. */
const typing = (e) => e.target instanceof Element && !!e.target.closest("input, textarea, select, [contenteditable]");
addEventListener("keydown", (e) => {
  if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
  if (MOVE[e.code] || e.code === "ArrowLeft" || e.code === "ArrowRight") { keys.add(e.code); e.preventDefault(); tuck(); }
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => keys.clear());

/* Label cards are drawn once the page fonts are in, so the titles use the site's serif. */
const fonts = document.fonts ? Promise.all([document.fonts.load('italic 46px "Instrument Serif"'), document.fonts.load('500 30px "Inter Tight"')]).catch(() => {}) : Promise.resolve();
fonts.then(() => { for (const s of slots) if (s.label) { s.label.material.map = labelTexture(s); s.label.material.needsUpdate = true; } afterFonts.forEach((f) => f()); });

/* ---------- Sound ----------
   One piece for piano and strings, played quietly on a loop. Its licence asks
   for a visible credit, which sits at the foot of the controls legend. Full
   credits are in assets/audio/CREDITS.md. A page without the switch has no sound.

   Sound is on by default. A browser will not let a page make sound until the
   visitor has clicked or pressed a key, so the music starts with their first
   move in the room, or right after the password is accepted. If they switch it
   off, the page remembers, and stays silent next time. */
{
  const btn = document.getElementById("soundBtn");
  if (btn) {
    const LEVEL = 0.32, KEY = "bg-gallery-sound";
    const recall = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
    const remember = (v) => { try { localStorage.setItem(KEY, v); } catch (e) { /* private window: nothing to keep */ } };
    let music = null, on = recall() !== "off", fade = 0, canFade = true, started = false;
    const show = () => { btn.setAttribute("aria-pressed", on); btn.lastElementChild.textContent = on ? "Sound on" : "Sound off"; };
    /* Start or stop the music, to match the switch. Gives back a promise of
       whether the browser let it play. A phone refuses unless this runs inside
       a tap, so a refusal is normal and the page simply tries again later. */
    function apply() {
      if (!music) {
        music = new Audio("assets/audio/moonlight.mp3"); music.loop = true;
        /* an iPhone ignores a page's volume setting: find out, and skip the fades there */
        music.volume = 0.5; canFade = Math.abs(music.volume - 0.5) < 0.01;
        music.volume = canFade ? 0 : 1;
      }
      const played = on ? music.play().then(() => true, () => false) : Promise.resolve(true);
      clearInterval(fade);
      if (!canFade) { if (!on) music.pause(); return played; }
      /* glide the volume up or down over about a second, then pause when silent */
      fade = setInterval(() => {
        const goal = on ? LEVEL : 0, step = LEVEL / 20;
        music.volume = Math.max(0, Math.min(LEVEL, music.volume + Math.sign(goal - music.volume) * step));
        if (Math.abs(music.volume - goal) < step / 2) { music.volume = goal; clearInterval(fade); if (!on) music.pause(); }
      }, 50);
      return played;
    }
    /* The music starts with the visitor's first move in the room itself. Nothing
       plays while the password screen is up, or before the room has appeared.

       The events below are the ones a browser counts as a real action by the
       visitor. A finger touching down does not count on a phone, but lifting
       it does. The page keeps listening until the music has truly started. */
    const WAKE = ["pointerup", "click", "touchend", "keydown"];
    const ready = () => shown && !document.documentElement.classList.contains("bg-locked");
    const stopWaiting = () => WAKE.forEach((t) => removeEventListener(t, first, true));
    const begin = () => apply().then((ok) => { if (ok && on) { started = true; stopWaiting(); } });
    function first(e) {
      if (started) { stopWaiting(); return; }
      if (!on || !ready() || btn.contains(e.target)) return;
      begin();
    }
    WAKE.forEach((t) => addEventListener(t, first, true));
    btn.addEventListener("click", () => { on = !on; remember(on ? "on" : "off"); show(); begin(); });
    /* the password screen says when it has let the visitor in: try then, once the room is up */
    addEventListener("bg-unlocked", () => {
      const go = setInterval(() => { if (!ready()) return; clearInterval(go); if (on && !started) begin(); }, 150);
    });
    show();
  }
}

/* ---------- Full screen ----------
   One button, on desktop and on touch screens. It asks the browser to give the
   room the whole screen, and to hand it back. The button only appears where
   the browser allows this. An iPhone does not let a web page do it, so there
   the button stays hidden. (An iPad and Android phones do.) */
{
  const btn = document.getElementById("fullBtn"), el = document.documentElement;
  const enter = el.requestFullscreen || el.webkitRequestFullscreen;
  const leave = document.exitFullscreen || document.webkitExitFullscreen;
  const active = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  if (btn && enter && leave && (document.fullscreenEnabled || document.webkitFullscreenEnabled)) {
    btn.hidden = false;
    const show = () => {
      const on = active();
      btn.setAttribute("aria-pressed", on);
      btn.title = on ? "Leave full screen" : "Full screen";
      btn.setAttribute("aria-label", btn.title);
    };
    btn.addEventListener("click", () => {
      try {
        const done = active() ? leave.call(document) : enter.call(el);
        if (done && done.catch) done.catch(() => {});
      } catch (e) { /* the browser said no: leave the page as it is */ }
    });
    document.addEventListener("fullscreenchange", show);
    document.addEventListener("webkitfullscreenchange", show);
  }
}

/* ---------- Loop ---------- */
function size() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  /* How wide the view is. A wide view shows more of the room, but it stretches
     whatever sits near the edges of the screen. So the view is held to about
     80 degrees from side to side, however wide the screen is. An upright phone
     is narrow, so it is set by height instead. */
  baseFov = w < h ? 66 : Math.max(40, Math.min(54, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(40)) / camera.aspect))));
  if (zoom === null) camera.fov = baseFov;
  camera.updateProjectionMatrix();
}
addEventListener("resize", size); size();

let last = performance.now();
function tick(dt) {
  /* keys */
  let mx = 0, mz = 0;
  for (const k of keys) if (MOVE[k]) { mx += MOVE[k][0]; mz += MOVE[k][1]; }
  if (keys.has("ArrowLeft")) { yaw += 1.6 * dt; yawGoal = null; aim = null; }
  if (keys.has("ArrowRight")) { yaw -= 1.6 * dt; yawGoal = null; aim = null; }
  if (mx || mz) {
    path = []; yawGoal = null; aim = null; focus = false; zoom = null; reading = null; eyeGoal = EYE;
    const c = Math.cos(yaw), s = Math.sin(yaw), v = 2.4 * dt;
    [pos.x, pos.z] = fix(pos.x + (mx * c + mz * s) * v, pos.z + (-mx * s + mz * c) * v);
  }
  /* glide along the path */
  if (path.length) {
    const [tx, tz] = path[0], dx = tx - pos.x, dz = tz - pos.z, dist = Math.hypot(dx, dz);
    const lastLeg = path.length === 1;
    const step = Math.min(3.2, lastLeg ? dist * 3 + 0.35 : 3.2) * dt;
    if (dist <= step) { pos.x = tx; pos.z = tz; path.shift(); }
    else { pos.x += (dx / dist) * step; pos.z += (dz / dist) * step; }
  }
  if (aim) {
    const ax = aim.x - pos.x, az = aim.z - pos.z, flat = Math.hypot(ax, az);
    if (flat > 0.05) { yawGoal = Math.atan2(-ax, -az); pitchGoal = Math.atan2(aim.y - pos.y, flat); }
  }
  if (yawGoal !== null) {
    const d = Math.atan2(Math.sin(yawGoal - yaw), Math.cos(yawGoal - yaw));
    yaw += d * Math.min(1, dt * 4);
    pitch += (pitchGoal - pitch) * Math.min(1, dt * 4);
    if (!path.length && Math.abs(d) < 0.002 && Math.abs(pitchGoal - pitch) < 0.002) { yawGoal = null; aim = null; }
  }
  if (QUIET) {
    /* A work is lit a little more as the visitor nears it. Standing at one work, the others rest. */
    for (const s of slots) {
      if (!s.art) continue;
      const far = Math.hypot(pos.x - (s.p.x + s.n.x * 1.4), pos.z - (s.p.z + s.n.z * 1.4));
      let near = Math.max(0, Math.min(1, 1 - (far - 1.2) / 3.4));
      if (focus && sharp) near = sharp.slot === s ? 1 : near * 0.3;
      s.glow += (near - s.glow) * Math.min(1, dt * 2.4);
      s.pool.material.opacity = 0.05 + 0.1 * s.glow;
      s.wash.material.opacity = 0.1 + 0.12 * s.glow;       /* the lamp seems to warm up as the visitor comes near */
      s.art.material[4].color.setScalar(0.92 + 0.08 * s.glow);
    }
  }
  pos.y += (eyeGoal - pos.y) * Math.min(1, dt * 4);
  camera.position.copy(pos);
  /* zoom in or out, a little after the walk has started */
  if ((zoom !== null) !== backShown) { backShown = zoom !== null; backBtn.classList.toggle("on", backShown); backBtn.tabIndex = backShown ? 0 : -1; }
  const fovGoal = zoom === null ? baseFov : zoom;
  if (Math.abs(camera.fov - fovGoal) > 0.01) { camera.fov += (fovGoal - camera.fov) * Math.min(1, dt * 3.5); camera.updateProjectionMatrix(); }
  const k = Math.min(1, dt * 5), on = focus && !down && !path.length, reach = camera.fov / baseFov;
  /* while the button is held, the lean stays put, so nothing slides under the pointer */
  if (!down) { leanX += ((on ? -mouseX * 0.16 * reach : 0) - leanX) * k; leanY += ((on ? -mouseY * 0.1 * reach : 0) - leanY) * k; }
  camera.rotation.set(pitch + leanY, yaw + leanX, 0);
  renderer.render(scene, camera);
}
function frame(now) {
  tick(Math.min(0.05, (now - last) / 1000)); last = now;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* for tests and for the next phases */
window.BG_ROOM = { scene, camera, slots, walkTo, tick, look: (y, p = 0) => { yaw = y; pitch = p; }, place: (x, z) => { pos.x = x; pos.z = z; path = []; } };
})();
