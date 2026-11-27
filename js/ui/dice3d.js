// Dice, rendered for real (WebGL, three.js). Every die the game shows (in the Pouch, on the Roll, on a trick, spun in
// your hand, thrown across the table) is the same model and the same material, only nearer or farther:
//
//   the model    the die's solid (solid.js geometry) with every edge and corner rounded: a sphere swept round a
//                slightly smaller solid, so the faces stay perfectly flat and the edges turn smoothly. How round
//                depends on the shape and the material (a diamond is cut sharp, bone is worn soft)
//   the faces    pips (on a d6) or numbers, sunken into each face: a height map turned into a normal map, the recess
//                filled with ink and frosted, its rim catching the light
//   materials    physically based, lit by a small neon room (the reflections) and a warm key light:
//                  plastic     glossy, clear-coated, a little soft at the edges
//                  glass       clear, refracting what is behind it, tinted through its depth
//                  metal       polished, mirroring the room
//                  sparkling   glitter: metal flakes, each its own tiny mirror, under a clear coat
//                  glimmering  frosted glass with a fine shimmer in it
//                  swirling    clear resin with a coloured ribbon swirling inside, turning slowly
//                  diamond     cut sharp, high index, splitting light into colour (dispersion), glinting
//                  bone        warm ivory, a little worn
//
// Static dice (dieEl) are rendered once per look and size and cached as images; a die in motion (solidEl) is
// rendered live each frame from the rotation the animation gives it. If WebGL isn't available the CSS dice stay.
import { geometry, d4Rest, d4Corners, tTurn, tApply } from './solid.js';
import { facesOf, faceValue, matOf } from '../dice.js';
import * as D from '../data.js';
import { vsub as sub, vdot as dot, vcross as cross, vnorm as nrm } from '../util.js';

let T = null, Convex = null, ready = null, R3 = null;
export const available = () => !!R3;
// load three.js and set up the renderer (once, on first use)
export function load() {
  if (ready) return ready;
  ready = (async () => {
    if (typeof document === 'undefined' || typeof window === 'undefined') throw new Error('no DOM');
    T = await import('../vendor/three/three.module.min.js');
    Convex = (await import('../vendor/three/addons/ConvexGeometry.js')).ConvexGeometry;
    R3 = init();
  })().catch((e) => { ready = Promise.reject(e); ready.catch(() => {}); throw e; });
  ready.catch(() => {});
  return ready;
}

// ---------- the renderer, the room and the lights ----------
function init() {
  const canvas = document.createElement('canvas');
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08; renderer.outputColorSpace = T.SRGBColorSpace;
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(22, 1, 0.1, 50); camera.position.set(0, 0, 5.6); camera.lookAt(0, 0, 0);
  // the room the dice reflect: dark, with a warm softbox overhead and neon strips round it (pink, cyan, gold)
  const room = new T.Scene(); room.add(new T.Mesh(new T.BoxGeometry(12, 12, 12), new T.MeshBasicMaterial({ color: 0x3d3150, side: T.BackSide })));
  const panel = (w, hgt, color, k, pos, look) => { const m = new T.Mesh(new T.PlaneGeometry(w, hgt), new T.MeshBasicMaterial({ color: new T.Color(color).multiplyScalar(k), side: T.DoubleSide })); m.position.set(...pos); m.lookAt(...look); room.add(m); };
  panel(7, 4, 0xfff3e2, 6, [-1.5, 5.5, 2], [0, 0, 0]);    // the softbox overhead, a little to the left
  panel(10, 6, 0x9a8ab4, 2.6, [0, 0, -5.8], [0, 0, 0]);    // a dim wall behind (what clear dice see through themselves)
  panel(4, 6, 0xffe6cf, 2.5, [-5.5, 1, 3], [0, 0, 0]);  // a broad window of light to one side
  panel(0.35, 6, 0xff5fd2, 5, [-5.8, 0, -1], [0, 0, 0]);  // neon strips
  panel(0.35, 6, 0x5fe8ff, 5, [5.8, 0.5, 1], [0, 0, 0]);
  panel(6, 0.3, 0xffc65f, 4, [0, -5.8, -2], [0, 0, 0]);
  panel(12, 11, 0x8c7fa6, 2.4, [0, 0, 5.9], [0, 0, 0]); // a broad soft light behind you: what a polished face turned to you shows
  panel(2, 2, 0xffffff, 9, [3, 3, 5.5], [0, 0, 0]);       // a small hard light: the glint in every polished face
  panel(1.2, 1.2, 0xbfd8ff, 7, [-4, -2, 5], [0, 0, 0]);
  const pmrem = new T.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(room, 0.015).texture;
  const key = new T.DirectionalLight(0xfff0dc, 2.3); key.position.set(-2.2, 3.2, 4); scene.add(key);
  const rim = new T.DirectionalLight(0x9fd4ff, 0.9); rim.position.set(3, -1.5, -2.5); scene.add(rim);
  return { renderer, scene, camera, canvas };
}

// ---------- the model ----------
const ROUND = { d4: 0.075, d6: 0.11, d8: 0.08, d10: 0.075, d12: 0.07, d20: 0.06 };
const ROUND_MAT = { diamond: 0.3, metal: 0.75, glass: 0.85, bone: 1.35, plastic: 1 };
const fib = (n) => Array.from({ length: n }, (_, i) => { const y = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - y * y), a = i * Math.PI * (3 - Math.sqrt(5)); return [Math.cos(a) * r, y, Math.sin(a) * r]; });
const DIRS = fib(110);
// each face's own axes (as solid.js: u along it, v down it), its centre, and how far its corners reach
function faceFrames(type) {
  return geometry(type).map((f) => { const n = f.n, top = Math.abs(n[1]) > 0.9 ? [0, 0, -1] : [0, -1, 0], u = nrm(cross(n, top)), v = cross(n, u);
    const c = f.pts.reduce((a, p) => [a[0] + p[0] / f.pts.length, a[1] + p[1] / f.pts.length, a[2] + p[2] / f.pts.length], [0, 0, 0]);
    const R = Math.max(...f.pts.map((p) => Math.hypot(...sub(p, c))));
    // the inscribed radius: the nearest edge to the centre
    const ins = Math.min(...f.pts.map((p, i) => { const q = f.pts[(i + 1) % f.pts.length], e = sub(q, p), t = Math.max(0, Math.min(1, dot(sub(c, p), e) / dot(e, e))); return Math.hypot(...sub(c, [p[0] + e[0] * t, p[1] + e[1] * t, p[2] + e[2] * t])); }));
    return { n, u, v, c, R, ins, d: dot(c, n) }; });
}
const GEOS = new Map();
function roundedGeometry(type, mat) {
  const key = `${type}|${mat}`; if (GEOS.has(key)) return GEOS.get(key);
  const faces = geometry(type), F = faceFrames(type), r = (ROUND[type] || 0.08) * (ROUND_MAT[mat] ?? 1), dmin = Math.min(...F.map((f) => f.d)), s = (dmin - r) / dmin;
  const verts = []; for (const f of faces) for (const p of f.pts) if (!verts.some((q) => Math.hypot(...sub(p, q)) < 1e-6)) verts.push(p);
  const pts = [], origin = new Map(), k3 = (p) => p.map((x) => x.toFixed(5)).join(',');
  for (const v of verts) {
    const c = v.map((x) => x * s), own = F.filter((f) => faces[F.indexOf(f)].pts.some((p) => Math.hypot(...sub(p, v)) < 1e-6)).map((f) => f.n);
    for (const dir of [...own, ...DIRS.filter((d0) => own.some((n) => dot(d0, n) > 0.05))]) { const p = [c[0] + dir[0] * r, c[1] + dir[1] * r, c[2] + dir[2] * r]; pts.push(new T.Vector3(...p)); origin.set(k3(p), c); }
  }
  const g = new Convex(pts), pos = g.attributes.position, nAttr = g.attributes.normal, n = pos.count, uv = new Float32Array(n * 2), atlas = atlasLayout(F.length);
  const P = (i) => [pos.getX(i), pos.getY(i), pos.getZ(i)];
  for (let tri = 0; tri < n; tri += 3) {
    const a = P(tri), b = P(tri + 1), c = P(tri + 2), tn = nrm(cross(sub(b, a), sub(c, a)));
    const fi = F.findIndex((f) => dot(f.n, tn) > 0.9995);
    for (let j = 0; j < 3; j++) {
      const i = tri + j, p = P(i);
      if (fi >= 0) { // a flat face: its own normal, and its tile of the atlas
        const f = F[fi], la = dot(sub(p, f.c), f.u), lb = dot(sub(p, f.c), f.v), [tu, tv] = atlas.tile(fi);
        const x = (tu + 0.5 + la / (2 * f.R) * 0.98) / atlas.G, y = (tv + 0.5 + lb / (2 * f.R) * 0.98) / atlas.G;
        uv[i * 2] = x; uv[i * 2 + 1] = 1 - y; nAttr.setXYZ(i, ...f.n);
      } else { // the rounded edges and corners: smooth, from the sphere they were swept with
        const o = origin.get(k3(p)) || [0, 0, 0], d0 = nrm(sub(p, o)); nAttr.setXYZ(i, ...d0);
        const [tu, tv] = atlas.tile(F.length); uv[i * 2] = (tu + 0.5) / atlas.G; uv[i * 2 + 1] = 1 - (tv + 0.5) / atlas.G;
      }
    }
  }
  g.setAttribute('uv', new T.BufferAttribute(uv, 2));
  // CSS's axes (y down) to three's (y up): mirror y, and turn the triangles round so they still face outward
  g.scale(1, -1, 1); const idx = []; for (let i = 0; i < n; i += 3) idx.push(i, i + 2, i + 1); g.setIndex(idx);
  const out = { g, F, atlas, s }; GEOS.set(key, out); return out;
}
// the atlas: one tile per face, and a plain tile for the edges
function atlasLayout(nFaces) { const G = Math.ceil(Math.sqrt(nFaces + 1)); return { G, tile: (i) => [i % G, Math.floor(i / G)] }; }

// ---------- the faces: labels sunken into each one ----------
const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
// `paint`: on a die you can see through, the pips and numbers are filled with opaque white paint (a clear recess in
// clear glass cannot be read once the die is rolled): the paint blocks the light through it and glows a little.
const LOOK = {
  plastic: { ink: '#1b1622', round: 1 }, glass: { ink: '#ffffff', frost: true, paint: true }, metal: { ink: '#14161c' }, sparkling: { ink: '#2a1a05', flakes: 0.9 },
  glimmering: { ink: '#ffffff', frost: true, flakes: 0.35, paint: true }, swirling: { ink: '#ffffff', frost: true, paint: true }, diamond: { ink: '#ffffff', frost: true, paint: true }, bone: { ink: '#4a3420', grain: true },
};
export const CLEAR = Object.keys(LOOK).filter((k) => LOOK[k].paint); // the see-through materials
const MAPS = new Map();
function faceMaps(type, mat, labels, F, atlas, base) {
  const key = `${type}|${mat}|${labels.join(',')}|${base}`; if (MAPS.has(key)) return MAPS.get(key);
  const S = 1024, tile = S / atlas.G, look = LOOK[mat] || LOOK.plastic;
  const hc = document.createElement('canvas'); hc.width = hc.height = S; const hx = hc.getContext('2d'); hx.fillStyle = '#fff'; hx.fillRect(0, 0, S, S); hx.fillStyle = '#000';
  F.forEach((f, i) => {
    const [tu, tv] = atlas.tile(i), cx = (tu + 0.5) * tile, cy = (tv + 0.5) * tile, k = (tile * 0.98) / (2 * f.R) * f.ins * 0.8; // k: the face's inscribed radius in px, less the rounded rim
    const val = String(labels[i] ?? '');
    if (type === 'd4') { // a number at each corner, its top toward the corner: the one at the top point is the roll
      const sc = (tile * 0.98) / (2 * f.R), fsz = k * 0.62; hx.font = `800 ${fsz}px "Rubik", "Inter", "Segoe UI", system-ui, sans-serif`; hx.textAlign = 'center'; hx.textBaseline = 'middle';
      for (const { p, k: vi } of d4Corners(i)) { const la = dot(sub(p, f.c), f.u) * sc, lb = dot(sub(p, f.c), f.v) * sc, L0 = Math.hypot(la, lb) || 1, t = String(labels[vi] ?? '');
        hx.save(); hx.translate(cx + la * 0.5, cy + lb * 0.5); hx.rotate(Math.atan2(la / L0, -lb / L0)); hx.fillText(t, 0, fsz * 0.04);
        if (t === '6' || t === '9') hx.fillRect(-fsz * 0.22, fsz * 0.46, fsz * 0.44, fsz * 0.08); hx.restore(); }
    } else if (type === 'd6' && PIPS[val]) for (const [px, py] of PIPS[val]) { hx.beginPath(); hx.arc(cx + px * k * 0.52, cy + py * k * 0.52, k * 0.17, 0, Math.PI * 2); hx.fill(); }
    else { const fsz = k * (val.length > 2 ? 0.62 : val.length > 1 ? 0.8 : 0.98) * (type === 'd4' ? 0.8 : 1); hx.font = `800 ${fsz}px "Rubik", "Inter", "Segoe UI", system-ui, sans-serif`; hx.textAlign = 'center'; hx.textBaseline = 'middle';
      hx.fillText(val, cx, cy + (type === 'd4' ? k * 0.12 : 0) + fsz * 0.04);
      if (val === '6' || val === '9') hx.fillRect(cx - fsz * 0.22, cy + fsz * 0.46, fsz * 0.44, fsz * 0.08); }
  });
  // soften the recess walls a little (a rounded engraving, not a cut-out)
  const soft = document.createElement('canvas'); soft.width = soft.height = S; const sx = soft.getContext('2d'); sx.filter = `blur(${Math.max(1, tile / 110)}px)`; sx.drawImage(hc, 0, 0);
  const H = sx.getImageData(0, 0, S, S).data, sharp = hx.getImageData(0, 0, S, S).data;
  // glitter: a field of tiny flakes, each tilted its own way
  const flake = new Float32Array(S * S * 2);
  if (look.flakes) { let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let n = 0; n < S * S * 0.06 * look.flakes; n++) { const x = (rnd() * S) | 0, y = (rnd() * S) | 0, ax = (rnd() - 0.5) * 1.6, ay = (rnd() - 0.5) * 1.6, sz = 1 + ((rnd() * 2) | 0);
      for (let j = 0; j < sz; j++) for (let i2 = 0; i2 < sz; i2++) { const p = ((y + j) % S) * S + ((x + i2) % S); flake[p * 2] = ax; flake[p * 2 + 1] = ay; } } }
  const nc = document.createElement('canvas'); nc.width = nc.height = S; const nx = nc.getContext('2d'), N = nx.createImageData(S, S);
  const cc = document.createElement('canvas'); cc.width = cc.height = S; const cx2 = cc.getContext('2d'), C = cx2.createImageData(S, S);
  const rc = document.createElement('canvas'); rc.width = rc.height = S; const rx = rc.getContext('2d'), Rg = rx.createImageData(S, S);
  const pc = look.paint ? document.createElement('canvas') : null, px2 = pc ? (pc.width = pc.height = S, pc.getContext('2d')) : null, Pt = pc ? px2.createImageData(S, S) : null; // paint: white where the recess is
  const tc = look.paint ? document.createElement('canvas') : null, tx2 = tc ? (tc.width = tc.height = S, tc.getContext('2d')) : null, Tr = tc ? tx2.createImageData(S, S) : null; // light through: none where it is painted
  const b = hexRGB(base), ink = look.ink ? hexRGB(look.ink) : null, strength = 3.2;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x, h = (xx, yy) => H[(Math.min(S - 1, Math.max(0, yy)) * S + Math.min(S - 1, Math.max(0, xx))) * 4] / 255;
    let dx = (h(x + 1, y) - h(x - 1, y)) * strength, dy = (h(x, y + 1) - h(x, y - 1)) * strength;
    dx += flake[i * 2]; dy += flake[i * 2 + 1];
    const l = Math.hypot(dx, dy, 1); N.data[i * 4] = ((-dx / l) * 0.5 + 0.5) * 255; N.data[i * 4 + 1] = ((dy / l) * 0.5 + 0.5) * 255; N.data[i * 4 + 2] = ((1 / l) * 0.5 + 0.5) * 255; N.data[i * 4 + 3] = 255;
    const depth = 1 - H[i * 4] / 255, inside = 1 - sharp[i * 4] / 255; // 0 on the face, 1 at the bottom of the recess
    let col = b; if (ink && inside > 0.02) col = mix3(b, ink, Math.min(1, inside * 1.2)); col = mix3(col, [0, 0, 0], depth * 0.18 * (1 - inside)); // the rim of the recess darkens a touch
    if (look.grain) { const gr = (Math.sin(x * 0.07 + Math.sin(y * 0.011) * 9) * 0.5 + 0.5) * 0.06; col = mix3(col, [120, 90, 50], gr); }
    C.data[i * 4] = col[0]; C.data[i * 4 + 1] = col[1]; C.data[i * 4 + 2] = col[2]; C.data[i * 4 + 3] = 255;
    const rough = look.frost ? 0.08 + inside * 0.7 : 0.3 + inside * 0.3; Rg.data[i * 4 + 1] = rough * 255; Rg.data[i * 4] = Rg.data[i * 4 + 2] = 0; Rg.data[i * 4 + 3] = 255;
    if (Pt) { const on = Math.min(1, inside * 1.6) * 255; Pt.data[i * 4] = Pt.data[i * 4 + 1] = Pt.data[i * 4 + 2] = on; Pt.data[i * 4 + 3] = 255;
      Tr.data[i * 4] = Tr.data[i * 4 + 1] = Tr.data[i * 4 + 2] = 255 - on; Tr.data[i * 4 + 3] = 255; }
  }
  nx.putImageData(N, 0, 0); cx2.putImageData(C, 0, 0); rx.putImageData(Rg, 0, 0); if (Pt) { px2.putImageData(Pt, 0, 0); tx2.putImageData(Tr, 0, 0); }
  const tex = (cv, srgb) => { const t = new T.CanvasTexture(cv); t.colorSpace = srgb ? T.SRGBColorSpace : T.NoColorSpace; t.anisotropy = 4; t.generateMipmaps = true; t.minFilter = T.LinearMipmapLinearFilter; return t; };
  const out = { map: tex(cc, true), normalMap: tex(nc, false), roughnessMap: tex(rc, false), ...(pc ? { paintMap: tex(pc, true), transmissionMap: tex(tc, false) } : {}) }; MAPS.set(key, out); return out;
}
const hexRGB = (c) => { const m = /^#?([0-9a-f]{6})$/i.exec(c || '') || [0, 'e8e2d4']; return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)); };
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// ---------- materials ----------
const hi = (c, t) => new T.Color(c).lerp(new T.Color(0xffffff), t);
function material(mat, maps, base) {
  const c = new T.Color(base), common = { map: maps.map, normalMap: maps.normalMap, roughnessMap: maps.roughnessMap, normalScale: new T.Vector2(1, 1),
    ...(maps.paintMap ? { transmissionMap: maps.transmissionMap, emissive: new T.Color(0xffffff), emissiveMap: maps.paintMap, emissiveIntensity: 0.6 } : {}) };
  switch (mat) {
    case 'glass': return new T.MeshPhysicalMaterial({ ...common, color: 0xffffff, transmission: 1, thickness: 0.9, ior: 1.52, roughness: 0.04, attenuationColor: c, attenuationDistance: 2.2, specularIntensity: 1, clearcoat: 0.4, envMapIntensity: 1.8 });
    case 'metal': return new T.MeshPhysicalMaterial({ ...common, color: new T.Color(c).lerp(new T.Color(0xffffff), 0.35), metalness: 1, roughness: 0.22, envMapIntensity: 2.1, clearcoat: 0.25 });
    case 'sparkling': return new T.MeshPhysicalMaterial({ ...common, color: c, metalness: 0.9, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.6 });
    case 'glimmering': return new T.MeshPhysicalMaterial({ ...common, color: 0xffffff, transmission: 0.9, thickness: 1.3, ior: 1.46, roughness: 0.32, attenuationColor: c, attenuationDistance: 1.1, sheen: 0.6, sheenColor: c, clearcoat: 0.7, clearcoatRoughness: 0.05 });
    case 'swirling': return new T.MeshPhysicalMaterial({ ...common, color: 0xffffff, transmission: 1, thickness: 1.6, ior: 1.5, roughness: 0.04, attenuationColor: new T.Color(0xf6f0ff), attenuationDistance: 3, clearcoat: 1, clearcoatRoughness: 0.02 });
    case 'diamond': return new T.MeshPhysicalMaterial({ ...common, color: 0xffffff, transmission: 1, thickness: 0.8, ior: 2.42, dispersion: 1.2, roughness: 0, specularIntensity: 1, envMapIntensity: 3, iridescence: 0.25, iridescenceIOR: 1.6 });
    case 'bone': return new T.MeshPhysicalMaterial({ ...common, color: maps.map ? 0xffffff : c, roughness: 0.55, sheen: 0.5, sheenColor: new T.Color(0xfff2d6), clearcoat: 0.15, clearcoatRoughness: 0.4 });
    // cloth and hide: the weave or grain is the surface's own relief (maps.normalMap from grainMap), the colour its dye
    case 'leather': return new T.MeshPhysicalMaterial({ ...common, color: c, roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.35, sheen: 0.25, sheenColor: hi(c, 0.4), normalScale: new T.Vector2(0.9, 0.9) });
    case 'suede': return new T.MeshPhysicalMaterial({ ...common, color: c, roughness: 1, sheen: 1, sheenRoughness: 0.9, sheenColor: hi(c, 0.5), normalScale: new T.Vector2(0.5, 0.5) });
    case 'velvet': return new T.MeshPhysicalMaterial({ ...common, color: new T.Color(c).multiplyScalar(0.55), roughness: 1, sheen: 1, sheenRoughness: 0.35, sheenColor: hi(c, 0.55), normalScale: new T.Vector2(0.35, 0.35) });
    case 'silk': return new T.MeshPhysicalMaterial({ ...common, color: c, roughness: 0.32, sheen: 1, sheenRoughness: 0.25, sheenColor: hi(c, 0.7), anisotropy: 0.9, anisotropyRotation: 0.6, envMapIntensity: 1.5, normalScale: new T.Vector2(0.25, 0.25) });
    case 'denim': return new T.MeshPhysicalMaterial({ ...common, color: c, roughness: 0.9, sheen: 0.4, sheenColor: hi(c, 0.6), normalScale: new T.Vector2(1.2, 1.2) });
    case 'canvas': return new T.MeshPhysicalMaterial({ ...common, color: c, roughness: 0.95, sheen: 0.2, sheenColor: hi(c, 0.5), normalScale: new T.Vector2(1.3, 1.3) });
    case 'wool': return new T.MeshPhysicalMaterial({ ...common, color: c, roughness: 1, sheen: 0.9, sheenRoughness: 0.8, sheenColor: hi(c, 0.45), normalScale: new T.Vector2(0.9, 0.9) });
    case 'vinyl': return new T.MeshPhysicalMaterial({ ...common, color: c, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.7, normalScale: new T.Vector2(0.15, 0.15) });
    default: return new T.MeshPhysicalMaterial({ ...common, color: maps.map ? 0xffffff : c, roughness: 0.36, clearcoat: 0.6, clearcoatRoughness: 0.12, sheen: 0.15, sheenColor: new T.Color(0xffffff) });
  }
}
// the swirl inside a swirling die: coloured ribbons wound round each other
function swirl(scale, tint) {
  const g = new T.Group(), cols = [tint, '#ffd36e', '#7ae7ff'];
  for (let k = 0; k < 3; k++) {
    const pts = Array.from({ length: 28 }, (_, i) => { const t = i / 27, a = t * Math.PI * 4.2 + (k * Math.PI * 2) / 3, r = 0.42 * Math.sin(Math.PI * (0.12 + t * 0.76)); return new T.Vector3(Math.cos(a) * r, (t - 0.5) * 1.05, Math.sin(a) * r); });
    const tube = new T.TubeGeometry(new T.CatmullRomCurve3(pts), 160, 0.045 - k * 0.008, 10, false);
    g.add(new T.Mesh(tube, new T.MeshPhysicalMaterial({ color: new T.Color(cols[k]), roughness: 0.25, metalness: k === 1 ? 0.7 : 0.1, emissive: new T.Color(cols[k]).multiplyScalar(0.18), clearcoat: 0.5 })));
  }
  g.scale.setScalar(scale); return g;
}

// a die's look: its material and colour, and the labels its faces carry
const lookOf = (d) => { const mat = matOf(d); return { mat: LOOK[mat] ? mat : 'plastic', base: mat === 'diamond' ? '#ffffff' : mat === 'glass' || mat === 'glimmering' || mat === 'swirling' ? '#ffffff' : D.MATERIALS[mat]?.color || '#e8e2d4', tint: D.MATERIALS[mat]?.color || '#e8e2d4' }; };
const MODELS = new Map();
function model(d, labels) {
  const L = lookOf(d), key = `${d.type}|${L.mat}|${labels.join(',')}`; if (MODELS.has(key)) return MODELS.get(key);
  const { g, F, atlas, s } = roundedGeometry(d.type, L.mat), maps = faceMaps(d.type, L.mat, labels, F, atlas, L.base);
  const grp = new T.Group(), mesh = new T.Mesh(g, material(L.mat, maps, L.tint));
  // a clear die shows its own far faces through itself: a mirror-bright shell of them inside, which the front refracts
  if (['glass', 'diamond', 'glimmering', 'swirling'].includes(L.mat)) {
    const inner = new T.Mesh(g, new T.MeshPhysicalMaterial({ side: T.BackSide, color: L.mat === 'diamond' ? 0xffffff : new T.Color(L.tint).lerp(new T.Color(0xffffff), 0.5), metalness: 1, roughness: L.mat === 'glimmering' ? 0.35 : 0.03, envMapIntensity: L.mat === 'diamond' ? 4 : 2.2, emissive: new T.Color(L.mat === 'diamond' ? 0x3a3550 : 0x20283a), normalMap: maps.normalMap }));
    inner.renderOrder = -1; grp.add(inner);
  }
  grp.add(mesh);
  if (L.mat === 'swirling') { const sw = swirl(s * 0.78, L.tint); grp.add(sw); grp.userData.swirl = sw; }
  grp.matrixAutoUpdate = false; MODELS.set(key, grp); return grp;
}

// ---------- a material as a flat surface ----------
// The same materials in the same room and light, as a slab seen face on: what a sign's letters or backing, a card, a
// wallet, a jacket, a symbol or a crown is made of (ui/finish.js). The cloths and hides are materials here too: their
// weave or grain is a relief drawn by GRAIN (a height for each point of a tile, turned into a normal map).
const cell = (x, y, s) => { const n = Math.sin(x * 127.1 * s + y * 311.7 * s) * 43758.5453; return n - Math.floor(n); }; // a steady pseudo-random number for a point
const GRAIN = {
  leather: (u, v) => { let h = 1; for (let k = 0; k < 3; k++) { const f = 9 + k * 7, gx = u * f, gy = v * f, ix = Math.floor(gx), iy = Math.floor(gy); let d = 9; // pebbles: the distance to the nearest of scattered points
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const px = ix + a + cell(ix + a, iy + b, 1 + k), py = iy + b + cell(iy + b, ix + a, 2 + k); d = Math.min(d, Math.hypot(gx - px, gy - py)); } h = Math.min(h, d * (1 + k * 0.6)); } return h; },
  suede: (u, v) => cell(Math.floor(u * 180), Math.floor(v * 180), 1) * 0.5,
  velvet: (u, v) => cell(Math.floor(u * 220), Math.floor(v * 90), 3) * 0.35,
  silk: (u, v) => 0.5 + 0.5 * Math.sin((u * 3 + Math.sin(v * 5) * 0.25) * Math.PI * 2) * 0.25,
  denim: (u, v) => 0.5 + 0.5 * Math.sin((u + v) * Math.PI * 2 * 40) + cell(Math.floor(u * 160), Math.floor(v * 160), 5) * 0.3, // a diagonal twill
  canvas: (u, v) => Math.max(Math.abs(Math.sin(u * Math.PI * 34)), Math.abs(Math.sin(v * Math.PI * 34))), // a plain weave
  wool: (u, v) => cell(Math.floor(u * 70 + Math.sin(v * 40) * 2), Math.floor(v * 70), 7) * 0.6 + cell(Math.floor(u * 200), Math.floor(v * 200), 9) * 0.4,
  vinyl: (u, v) => 0.5 + 0.03 * Math.sin(u * 60) * Math.sin(v * 60),
  sparkling: (u, v) => cell(Math.floor(u * 256), Math.floor(v * 256), 11) * 0.9, // flakes: every point tips its own way
  glimmering: (u, v) => cell(Math.floor(u * 256), Math.floor(v * 256), 13) * 0.3,
};
const GRAINS = new Map();
function grainMap(mat) {
  if (!GRAIN[mat]) return null; if (GRAINS.has(mat)) return GRAINS.get(mat);
  const N = 256, H = new Float32Array(N * N), f = GRAIN[mat]; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) H[y * N + x] = f(x / N, y / N);
  const cv = document.createElement('canvas'); cv.width = cv.height = N; const cx = cv.getContext('2d'), img = cx.createImageData(N, N), at = (x, y) => H[((y + N) % N) * N + ((x + N) % N)];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const n = nrm([(at(x - 1, y) - at(x + 1, y)) * 2.2, (at(x, y - 1) - at(x, y + 1)) * 2.2, 1]), i = (y * N + x) * 4;
    img.data[i] = (n[0] * 0.5 + 0.5) * 255; img.data[i + 1] = (n[1] * 0.5 + 0.5) * 255; img.data[i + 2] = (n[2] * 0.5 + 0.5) * 255; img.data[i + 3] = 255; }
  cx.putImageData(img, 0, 0); const tex = new T.CanvasTexture(cv); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(1.6, 1.6); GRAINS.set(mat, tex); return tex;
}
export const MATERIAL_IDS = [...new Set(['plastic', 'glass', 'metal', 'sparkling', 'glimmering', 'swirling', 'diamond', 'bone', ...Object.keys(GRAIN)])]; // every material the renderer knows
const SWATCHES = new Map();
// A picture of the material in a colour, as a URL (a data: image), or null where the renderer is not there (the CSS
// look stands). The slab is a little pillowed and turned, so the room's lights run across it as they do a die's face.
export async function swatch(mat, color = '#b9b2c8', px = 192) {
  const key = `${mat}|${color}|${px}`; if (SWATCHES.has(key)) return SWATCHES.get(key);
  const job = (async () => { try { await load(); } catch { return null; }
    const { renderer, scene, camera, canvas } = R3, cut = mat === 'diamond'; let g = new T.PlaneGeometry(3.2, 3.2, cut ? 7 : 40, cut ? 7 : 40); const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); pos.setZ(i, -0.11 * (x * x + y * y) + (cut ? 0.34 * cell(x * 3.1, y * 2.7, 1) : 0.02 * Math.sin(x * 2.1 + y * 1.3))); }
    if (cut) g = g.toNonIndexed(); g.computeVertexNormals(); // a cut stone: flat facets, each turned its own way
    const clear = ['glass', 'diamond', 'glimmering', 'swirling'].includes(mat), grp = new T.Group();
    const mesh = new T.Mesh(g, material(mat, { map: null, normalMap: grainMap(mat), roughnessMap: null }, color)); mesh.rotation.set(-0.16, 0.2, 0);
    // what a clear slab is seen against: a bright foil behind it, in its own tint, as a clear die has its far faces
    if (clear) { const back = new T.Mesh(new T.PlaneGeometry(4, 4, 24, 24), new T.MeshPhysicalMaterial({ color: mat === 'diamond' ? 0xffffff : hi(color, 0.45), metalness: 1, roughness: mat === 'glimmering' ? 0.4 : 0.12, envMapIntensity: mat === 'diamond' ? 3.5 : 2 })); back.position.z = -0.7; back.rotation.set(0.3, -0.35, 0.2); grp.add(back); }
    grp.add(mesh); if (mat === 'swirling') { const sw = swirl(1.5, color); sw.rotation.z = 1.2; sw.position.z = -0.3; grp.add(sw); }
    scene.add(grp); if (canvas.width !== px || canvas.height !== px) renderer.setSize(px, px, false);
    renderer.render(scene, camera); scene.remove(grp); const url = canvas.toDataURL('image/png'); g.dispose(); return url;
  })();
  SWATCHES.set(key, job); return job;
}

// ---------- drawing ----------
const flipY = () => new T.Matrix4().makeScale(1, -1, 1);
// render die d (with these face labels) turned by m (a DOMMatrix in CSS's axes) at px pixels; returns the canvas
function render(d, labels, m, px, time = 0) {
  const { renderer, scene, camera, canvas } = R3, g = model(d, labels);
  const M = new T.Matrix4().fromArray(m.toFloat64Array()), S = flipY(); g.matrix.copy(S).multiply(M).multiply(S);
  if (g.userData.swirl) g.userData.swirl.rotation.y = time * 0.25;
  scene.add(g); if (canvas.width !== px || canvas.height !== px) renderer.setSize(px, px, false);
  renderer.render(scene, camera); scene.remove(g); return canvas;
}
// the turn that shows face i to you, upright (as solid.js), then a little tilt so the die reads as a solid
function frontOf(type, i, tilt = true) {
  if (type === 'd4') return d4Rest(i, tilt); // a d4 shows its roll at its top point
  const F = faceFrames(type), f = F[i % F.length];
  const turn = tTurn, ap = tApply;
  const M = turn(f.n, [0, 0, 1]), v = nrm(ap(M, f.v)), front = turn(v, [0, 1, 0], [0, 0, 1]).multiply(M);
  return tilt ? new DOMMatrix().rotateSelf(-16, 20, 0).multiply(front) : front;
}
const labelsOf = (d, value) => { const L = facesOf(d).map(faceValue); if (value != null && !L.some((x) => String(x) === String(value))) L[0] = value; return L; };

// A static die element: render it once for its look and size, and set the picture on it (the CSS die stays until then).
const IMG = new Map(); const queue = []; let busy = false;
export function dress(el, d, value) {
  if (!d?.type || typeof document === 'undefined') return;
  queue.push([el, d, value]); if (!busy) { busy = true; requestAnimationFrame(pump); }
}
async function pump() {
  try { await load(); } catch { queue.length = 0; busy = false; return; }
  const start = performance.now();
  while (queue.length && performance.now() - start < 12) { // a few at a time, so a full Pouch doesn't stall a frame
    const [el, d, value] = queue.shift(); if (!el.isConnected) { if (!el._r3dWait) { el._r3dWait = 1; queue.push([el, d, value]); } continue; }
    const css = Math.max(el.offsetWidth, el.offsetHeight) || 32, px = Math.min(512, Math.ceil((css * Math.min(2, devicePixelRatio || 1) * 1.25) / 16) * 16);
    const labels = labelsOf(d, value ?? d.type.slice(1)), fi = Math.max(0, labels.findIndex((x) => String(x) === String(value ?? d.type.slice(1)))), L = lookOf(d);
    const key = `${d.type}|${L.mat}|${labels.join(',')}|${fi}|${px}`;
    let url = IMG.get(key); if (!url) { url = render(d, labels, frontOf(d.type, fi), px).toDataURL('image/png'); IMG.set(key, url); }
    el.style.setProperty('--r3d', `url("${url}")`); el.classList.add('r3d');
    ambient(el, d, labels, fi);
  }
  if (queue.length) requestAnimationFrame(pump); else busy = false;
}

// A die in motion (solid.js): draws it live into a canvas on the element each time its rotation changes.
export function live(el, d, labels, size) {
  const cv = document.createElement('canvas'), px = Math.min(512, Math.ceil(size * Math.min(2, devicePixelRatio || 1) * 1.3));
  cv.width = cv.height = px; cv.className = 'r3d-live'; const ctx2 = cv.getContext('2d'); let last = null, on = false;
  const draw = (m) => { last = m; if (!R3) return; ctx2.clearRect(0, 0, px, px); ctx2.drawImage(render(d, labels, m, px, performance.now() / 1000), 0, 0); if (!on) { on = true; el.append(cv); el.classList.add('r3d-on'); } };
  load().then(() => { if (last) draw(last); }).catch(() => {});
  return { draw };
}

// ---------- dice at rest are still lit ----------
// A die lying in the Pouch, the Roll or on a trick is the same model as the one in your hand, so it keeps moving in
// the light: it rocks a touch, glitter and facets glint, a swirl keeps turning. Every die on screen is redrawn in
// turn, a few each frame (never more than AMB_MS of one), the one under the pointer every frame. Until a die's turn
// comes its last picture stays, so nothing ever blanks.
const AMB = [], AMB_PX = 128, AMB_MS = 5; let ambAt = 0, ambRun = false;
export const ambientOn = () => !(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) && globalThis.RP_STILL_DICE !== true;
function ambient(el, d, labels, fi) {
  if (!ambientOn()) return;
  el._amb = { d, labels, base: frontOf(d.type, fi), ph: (AMB.length * 2.399) % 6.283, cv: el._amb?.cv || null, ctx: el._amb?.ctx || null }; // (a die shown again keeps its canvas and what draws on it)
  if (!AMB.includes(el)) AMB.push(el);
  if (!ambRun) { ambRun = true; requestAnimationFrame(ambTick); }
}
function ambDraw(el, t) {
  const a = el._amb; if (!a) return;
  if (!a.cv) { a.cv = document.createElement('canvas'); a.cv.width = a.cv.height = AMB_PX; a.cv.className = 'r3d-amb'; a.ctx = a.cv.getContext('2d'); }
  if (!a.cv.isConnected) { el.append(a.cv); el.classList.add('r3d-amb-on'); }
  const hov = el.matches(':hover'), k = hov ? 2.2 : 1; // under the pointer it turns further, to show itself off
  const m = new DOMMatrix().rotateSelf(Math.sin(t * 0.9 + a.ph) * 4 * k, Math.cos(t * 0.7 + a.ph) * 6 * k, Math.sin(t * 0.5 + a.ph) * 1.5 * k).multiply(a.base);
  a.ctx.clearRect(0, 0, AMB_PX, AMB_PX); a.ctx.drawImage(render(a.d, a.labels, m, AMB_PX, t), 0, 0);
}
const shown = (el) => el.isConnected && el.offsetWidth > 0 && el.style.opacity !== '0';
function ambTick(now) {
  if (!R3 || document.hidden) { requestAnimationFrame(ambTick); return; }
  const t = now / 1000, start = performance.now();
  for (let k = AMB.length - 1; k >= 0; k--) { const el = AMB[k]; if (el.isConnected) el._ambGone = 0; else if ((el._ambGone = (el._ambGone || 0) + 1) > 240) { AMB.splice(k, 1); delete el._amb; } } // gone a few seconds: forgotten
  if (!AMB.length) { ambRun = false; return; }
  for (const el of AMB) if (shown(el) && el.matches(':hover')) ambDraw(el, t);
  for (let n = 0; n < AMB.length && performance.now() - start < AMB_MS; n++) { const el = AMB[ambAt++ % AMB.length]; if (shown(el) && !el.matches(':hover')) ambDraw(el, t); }
  requestAnimationFrame(ambTick);
}

// ---------- getting ready ----------
// Building a die the first time takes a moment (its rounded solid, its engraved faces, its material's shaders), which
// used to land the first time you picked one up. preload builds every size in every material up front, a die at a
// time between frames, reporting how far along it is (0 to 1); the game's opening curtain waits on it.
export async function preload(onProgress = () => {}, { types = Object.keys(D.DICE), mats = Object.keys(LOOK), budgetMs = 9000 } = {}) {
  try { await load(); } catch { onProgress(1); return false; }
  const jobs = []; for (const mat of mats) for (const type of types) jobs.push({ type, mat });
  jobs.sort((a, b) => (a.mat === D.DEFAULT_MAT ? 0 : 1) - (b.mat === D.DEFAULT_MAT ? 0 : 1)); // the dice you start with first
  const t0 = performance.now(); let done = 0;
  for (const j of jobs) {
    if (performance.now() - t0 > budgetMs) break; // a slow machine is not held at the door: the rest build as they are met
    try { const d = { type: j.type, mat: j.mat, up: [] }, labels = labelsOf(d, j.type.slice(1)); render(d, labels, frontOf(j.type, 0), AMB_PX); } catch { /* a die that will not build falls back to its CSS look */ }
    onProgress(++done / jobs.length); await new Promise((r) => setTimeout(r, 0));
  }
  onProgress(1); return done === jobs.length;
}
