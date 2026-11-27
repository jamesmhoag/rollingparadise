// Wallets and jackets as bodies, made of the materials (ui/dice3d.js): the very material a die of it has, in the same
// room and light, on the piece's own form. Nothing here knows a material by name: a part is a shape, and what it is
// made of is whatever its look says (content/finishes.js), so any material a die can be, a wallet or a jacket can be,
// and tuning a material once tunes it everywhere.
//
//   soft()    the one way a part gets its form: an outline (in the px of the piece's own drawing) made into a padded
//             body: a slab with rounded edges, swelling toward its middle (a pillow, a sleeve, a lapel)
//   models    walletModel(look) and jacketModel(look): the parts, and a pose (a billfold's cover swung, a flap lifted)
//   embody()  puts a model on its element: a picture at rest, drawn live while it opens or turns under the pointer or
//             in the hand. What a wallet holds stays the real cards and passes, lying in the pockets of the picture.
// Without WebGL the drawn pieces (ui/gear.js) stand as they are.
import { load, three, body, renderGroup } from './dice3d.js';
import { shade } from '../util.js';

let T = null;
const U = 1 / 40; // scene units per px of a piece's own drawing: a wallet sits in the room about as large as a die

// ---------- outlines (px, y down, as the pieces are drawn) ----------
// an SVG path of M L Q C Z (absolute) as points
export function outline(d, seg = 7) {
  const out = [], tok = d.match(/[MLQCZ]|-?\d*\.?\d+/g) || []; let i = 0, cmd = '', x = 0, y = 0; const num = () => parseFloat(tok[i++]);
  const curve = (f) => { for (let k = 1; k <= seg; k++) out.push(f(k / seg)); [x, y] = out[out.length - 1]; };
  while (i < tok.length) {
    if (/[MLQCZ]/.test(tok[i])) { cmd = tok[i++]; if (cmd === 'Z') continue; }
    if (cmd === 'M' || cmd === 'L') { x = num(); y = num(); out.push([x, y]); cmd = 'L'; }
    else if (cmd === 'Q') { const [a, b, c, d2] = [num(), num(), num(), num()], x0 = x, y0 = y; curve((t) => [(1 - t) ** 2 * x0 + 2 * t * (1 - t) * a + t * t * c, (1 - t) ** 2 * y0 + 2 * t * (1 - t) * b + t * t * d2]); }
    else if (cmd === 'C') { const [a, b, c, d2, e, f] = [num(), num(), num(), num(), num(), num()], x0 = x, y0 = y, B = (t, p0, p1, p2, p3) => (1 - t) ** 3 * p0 + 3 * t * (1 - t) ** 2 * p1 + 3 * t * t * (1 - t) * p2 + t ** 3 * p3; curve((t) => [B(t, x0, a, c, e), B(t, y0, b, d2, f)]); }
    else i++;
  }
  const [fx, fy] = out[0], [lx, ly] = out[out.length - 1]; if (Math.hypot(fx - lx, fy - ly) < 1e-6) out.pop();
  return out;
}
// a rounded rectangle; r: one radius, or [top-left, top-right, bottom-right, bottom-left]
export function rrect(x, y, w, h, r = 0) {
  const R = (Array.isArray(r) ? r : [r, r, r, r]).map((v) => Math.max(0, Math.min(v, w / 2, h / 2))), out = [];
  const arc = (cx, cy, rad, a0) => { if (rad < 0.05) return out.push([cx, cy]); for (let k = 0; k <= 5; k++) { const a = a0 + (k / 5) * Math.PI / 2; out.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]); } };
  arc(x + R[0], y + R[0], R[0], Math.PI); arc(x + w - R[1], y + R[1], R[1], -Math.PI / 2); arc(x + w - R[2], y + h - R[2], R[2], 0); arc(x + R[3], y + h - R[3], R[3], Math.PI / 2);
  return out;
}
const mirrored = (pts, about = 0) => pts.map(([x, y]) => [2 * about - x, y]).reverse();

// ---------- the padded body ----------
// pts: the outline (px, y down, about the piece's own centre `at`). depth: the slab · bevel: how round its edge is ·
// puff: how far it swells at its middle · round: how far in from the edge the swell reaches (else half its width) ·
// z: where its middle lies · both: swell on the back too · ripple(x, y): folds added to the swell · grain: tiles per px ·
// cells: how finely the swell is modelled · smooth: how far it is smoothed over
// → { geoms, zAt(x, y): its front surface there }
function soft(pts, { depth = 3, puff = 2, bevel = 1, z = 0, both = false, round = null, ripple = null, grain = 0.04, cells = 42, smooth = 4 } = {}) {
  const P = pts.map(([x, y]) => [x, -y]), xs = P.map((p) => p[0]), ys = P.map((p) => p[1]);
  const x0 = Math.min(...xs) - bevel, x1 = Math.max(...xs) + bevel, y0 = Math.min(...ys) - bevel, y1 = Math.max(...ys) + bevel, R = round ?? Math.min(x1 - x0, y1 - y0) / 2;
  const ex = new T.ExtrudeGeometry(new T.Shape(P.map(([x, y]) => new T.Vector2(x, y))), { depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 1, steps: 1 });
  ex.translate(0, 0, z - depth / 2); const uv = ex.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * grain, uv.getY(i) * grain);
  // how far inside the outline a point is (less than 0: outside it)
  const sd = (x, y) => { let inside = false, best = 1e9; for (let i = 0; i < P.length; i++) { const [ax, ay] = P[i], [bx, by] = P[(i + 1) % P.length];
    if ((ay > y) !== (by > y) && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside;
    const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1))); best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy)); } return inside ? best : -best; };
  // the swell over the slab's face: nothing at the outline (it follows the rounded edge just outside it), full at `R` in
  const rise = (x, y, d = sd(x, y)) => { if (d <= 0) { const e = Math.min(1, -d / bevel); return -bevel * (1 - Math.sqrt(1 - e * e)); } const t = Math.min(1, d / R); return puff * Math.sin(t * Math.PI / 2) + (ripple ? ripple(x, y) * t : 0); };
  const top = z + depth / 2 + bevel, geoms = [ex];
  if (puff || ripple) {
    const step = Math.max(x1 - x0, y1 - y0) / cells, nx = Math.ceil((x1 - x0) / step), ny = Math.ceil((y1 - y0) / step), D = new Float32Array((nx + 1) * (ny + 1)), H = new Float32Array(D.length);
    const at = (k) => [x0 + (k % (nx + 1)) * step, y0 + Math.floor(k / (nx + 1)) * step]; // where grid point k is
    for (let k = 0; k < D.length; k++) { const [x, y] = at(k); D[k] = sd(x, y); H[k] = rise(x, y, D[k]); }
    // the swell is smoothed over (the distance to an edge creases where two edges are as near: a pillow has no creases)
    for (let pass = 0, B = new Float32Array(H.length); pass < smooth; pass++) { B.set(H);
      for (let j = 1; j < ny; j++) for (let i = 1; i < nx; i++) { const k = j * (nx + 1) + i; if (D[k] <= 0) continue; let t = 0; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) t += Math.max(0, B[k + a * (nx + 1) + b]); H[k] = t / 9; } }
    const dome = (side) => { const pos = [], uvs = [], idx = [];
      for (let k = 0; k < H.length; k++) { const [x, y] = at(k), hgt = H[k] + 0.02; pos.push(x, y, side > 0 ? top + hgt : 2 * z - top - hgt); uvs.push(x * grain, y * grain); }
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; if (Math.min(D[a], D[b], D[c], D[d]) < -bevel * 0.85) continue; if (side > 0) idx.push(a, b, d, a, d, c); else idx.push(a, d, b, a, c, d); }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2)); g.setIndex(idx); g.computeVertexNormals(); return g; };
    geoms.push(dome(1)); if (both) geoms.push(dome(-1));
  }
  return { geoms, zAt: (x, y) => top + rise(x, -y) };
}
// a part: geometry made of a material in a colour
const part = (S, mat, color) => { const g = new T.Group(); for (const geo of S.geoms || [S]) g.add(body(geo, mat, color)); return g; };
const stuff = (mat, color) => { const b = body(new T.BufferGeometry(), mat, color); return b.children[b.children.length - 1].material; };
// a row of stitches along a closed outline, lying on a surface (zAt)
function stitches(pts, zAt, color = '#efe7d2', gap = 4.2) {
  const at = []; for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length], len = Math.hypot(bx - ax, by - ay), n = Math.floor(len / gap);
    for (let k = 0; k < n; k++) { const t = (k + 0.5) / n; at.push([ax + (bx - ax) * t, ay + (by - ay) * t, Math.atan2(-(by - ay), bx - ax)]); } }
  const m = new T.InstancedMesh(new T.BoxGeometry(2.3, 0.55, 0.5), stuff('canvas', color), at.length), M = new T.Matrix4();
  at.forEach(([x, y, a], i) => { M.makeRotationZ(a); M.setPosition(x, -y, zAt(x, y) + 0.1); m.setMatrixAt(i, M); }); return m;
}
const turned = (g, ry) => { const w = new T.Group(); w.rotation.y = ry; w.add(g); return w; };
const NOTE_GREENS = ['#8fbf86', '#a5cf9a', '#7fb07a', '#b4d8a6'];
const METAL = '#c9d0dc';

// ---------- a wallet ----------
// → { root, pose(t) (0 shut … 1 open), box: [x0, y0, x1, y1] the px it needs round its face (0, 0 its top left), w, h,
//     over: the px rectangles of its face that lie over what it holds (pockets, a band), rest: its turn when shut }
function walletModel(L, notes) {
  const root = new T.Group(), all = new T.Group(); all.scale.setScalar(U); root.add(all);
  const lining = L.lining || shade(L.color, 0.3), skin = (S) => part(S, L.mat, L.color), pocket = (S) => part(S, L.pocket.mat, L.pocket.color), r = L.round;
  const cash = (W, H, zs, fold) => { const g = new T.Group(); for (let i = 0; i < notes; i++) g.add(part(soft(fold ? rrect(-W / 2 + 2 + i * 1.5, -H / 2 + 16 + i * 2, W - 4 - i * 3, H - 16 - i * 3.5, 5) : rrect(-W / 2 + 9 + i * 3, -H / 2 - 5 + i * 1.3, W - 18 - i * 5, 30, 1.5), { depth: fold ? 1.4 : 0.35, puff: fold ? 0.9 : 0, bevel: fold ? 0.6 : 0.12, z: zs + i * (fold ? 1.5 : 0.3) }), 'paper', NOTE_GREENS[i])); return g; };
  if (L.type === 'clip') { const W = 150, H = 86;
    all.add(cash(W, H, 0, true), skin(soft(rrect(-10, -H / 2 - 4, 20, H - 6, [5, 5, 9, 9]), { depth: 1.8, puff: 1.5, bevel: 0.9, z: 11 })), skin(soft(rrect(-10, -H / 2 - 4, 20, 10, 5), { depth: 12, puff: 0, bevel: 0.9, z: 5 })));
    return { root, pose() {}, w: W, h: H, box: [-14, -16, W + 14, H + 14], over: [[63, -6, 24, H - 2]], rest: [0, 0], flat: true }; }
  // the inside of a leaf or pouch: its lining, and the pocket over the lower half
  const inside = (W, H, front) => { const g = new T.Group(); g.add(part(soft(rrect(-W / 2 + 5, -H / 2 + 5, W - 10, H - 43, 3), { depth: 0.4, puff: 0, bevel: 0.15, z: 0.3 }), L.pocket.mat, lining));
    if (front) { const S = soft(rrect(-W / 2, H / 2 - 46, W, 46, [2, 2, r, r]), { depth: 0.9, puff: 1.1, bevel: 0.5, z: 1.5, round: 14 }); g.add(pocket(S)); if (L.stitch) g.add(stitches(rrect(-W / 2 + 4, H / 2 - 42, W - 8, 38, [1, 1, Math.max(1, r - 2), Math.max(1, r - 2)]), S.zAt)); }
    return g; };
  if (L.type === 'clasped') { const W = 138, H = 92, fl = L.flap * 1.5 + 30;
    const back = soft(rrect(-W / 2, -H / 2, W, H, [3, 3, r, r]), { depth: 4, puff: 2.6, bevel: 1.2, z: 0, round: 26 }), wall = soft(rrect(-W / 2, H / 2 - 46, W, 46, [2, 2, r, r]), { depth: 1.6, puff: 2.4, bevel: 0.8, z: 6.2, round: 18 });
    const pouch = new T.Group(), ins = inside(W, H, false); ins.position.z = 3.2; pouch.add(turned(skin(back), Math.PI), ins, pocket(wall), cash(W, H, 3.9));
    if (L.stitch) pouch.add(stitches(rrect(-W / 2 + 4, H / 2 - 42, W - 8, 38, [1, 1, Math.max(1, r - 2), Math.max(1, r - 2)]), wall.zAt));
    const hinge = new T.Group(); hinge.position.set(0, H / 2, 9.6);
    const flapPts = outline(`M${-W / 2} 0L${W / 2} 0L${W / 2} ${fl * 0.5}Q${W / 2} ${fl} ${W / 2 - fl * 0.8} ${fl}L${-W / 2 + fl * 0.8} ${fl}Q${-W / 2} ${fl} ${-W / 2} ${fl * 0.5}Z`), flap = soft(flapPts, { depth: 1.5, puff: 2.2, bevel: 0.8, z: 2, round: 20 });
    hinge.add(skin(flap), part(soft(flapPts.map(([x, y]) => [x * 0.95, y * 0.93 + 1]), { depth: 0.3, puff: 0, bevel: 0.12, z: 0.3 }), L.pocket.mat, lining));
    if (L.stitch) hinge.add(stitches(flapPts.map(([x, y]) => [x * 0.93, y * 0.88 + 2.5]), flap.zAt));
    const metal = (geo, x, y, zz, color = METAL) => { const m = body(geo, 'metal', color); m.position.set(x, y, zz); return m; };
    if (L.clasp === 'zip') hinge.add(metal(new T.BoxGeometry(W * 0.8, 2.6, 1.4), 0, -fl + 4, flap.zAt(0, fl - 4)));
    else if (L.clasp === 'magnet') hinge.add(metal(new T.BoxGeometry(14, 8, 2.4), 0, -fl + 9, flap.zAt(0, fl - 9), '#6a7386'));
    else if (L.clasp === 'snap') { const s = metal(new T.SphereGeometry(4.6, 20, 12), 0, -fl + 9, flap.zAt(0, fl - 9)); s.scale.z = 0.5; hinge.add(s); }
    else for (let i = 0; i < 7; i++) { const a = (i / 6) * Math.PI, k = metal(new T.TorusGeometry(3, 0.75, 8, 16), W / 2 + 4 + Math.sin(a) * 9, H / 2 - 30 - i * 5, 5); k.rotation.set(0, i % 2 ? Math.PI / 2 : 0, 0.3); pouch.add(k); }
    all.add(pouch, hinge);
    return { root, pose: (t) => { hinge.rotation.x = -t * 2.86; }, w: W, h: H, box: [-18, -fl - 14, W + 24, H + 16], over: [[0, 46, W, 46]], rest: [10, -14], emblem: [12, 8] }; }
  // a billfold: two leaves; the cover is hinged down the right edge and swings out flat beside the other
  const W = 118, H = 92, pts = rrect(-W / 2, -H / 2, W, H, r), ZC = 5.6;
  const leaf = () => { const g = new T.Group(), S = soft(pts, { depth: 3, puff: 2.8, bevel: 1.3, z: 0, round: 24 }), ins = inside(W, H, true); ins.rotation.y = Math.PI; ins.position.z = -2.8;
    g.add(skin(S), ins); if (L.stitch) g.add(stitches(rrect(-W / 2 + 4, -H / 2 + 4, W - 8, H - 8, Math.max(1, r - 2)), S.zAt)); return g; };
  const base = leaf(); base.rotation.y = Math.PI; base.position.z = -ZC; const notesG = cash(W, H, -ZC + 3.3);
  const hinge = new T.Group(), cover = leaf(); hinge.position.set(W / 2, 0, 0); cover.position.set(-W / 2, 0, ZC); hinge.add(cover);
  const spine = skin(new T.CylinderGeometry(ZC + 2.6, ZC + 2.6, H - 9, 18)); spine.position.set(W / 2 - 2.2, 0, 0); spine.scale.x = 0.5;
  all.add(base, notesG, hinge, spine);
  return { root, pose: (t) => { hinge.rotation.y = t * Math.PI; spine.scale.z = 1 - 0.72 * t; spine.position.z = -ZC * 0.5 * t; }, w: W, h: H, box: [-18, -20, W * 2 + 18, H + 18], over: [[0, 46, W, 46], [W, 46, W, 46]], rest: [10, -14], emblem: [W - 27, H - 27] };
}

// ---------- a jacket ----------
// the shapes a jacket is cut from (px of its own drawing, 64 wide; hem: how long it is). ui/gear.js draws the same ones.
export const JACKET_CUT = {
  sleeve: 'M17.2 10.6C11.5 11.6 7.6 16 6.6 23L2.9 44.4Q6.4 47.4 10.3 46.2L14.2 29.5Q15.6 25.6 17.4 22.6Z',
  cuff: 'M3.5 40.4Q7.2 42.6 11.3 42L10.3 46.2Q6.4 47.4 2.9 44.4Z',
  torso: (hem) => `M23 7.6L15.6 11.6Q17.4 17 17.3 23Q18.6 ${(hem + 23) / 2} 16.8 ${hem}Q32 ${hem + 2.4} 47.2 ${hem}Q45.4 ${(hem + 23) / 2} 46.7 23Q46.6 17 48.4 11.6L41 7.6Q32 4.4 23 7.6Z`,
  hem: (hem) => `M17 ${hem - 4.2}Q32 ${hem - 2.4} 47 ${hem - 4.2}L47.2 ${hem}Q32 ${hem + 2.4} 16.8 ${hem}Z`,
  lapel: 'M25.6 7.4Q23.4 8.2 22.4 9.6L20.6 16.2L24.4 17.4L23.4 19.2L32.6 24.4Q29 15 25.6 7.4Z',
  stand: 'M24 9.6Q23.4 5.4 25.4 4.4Q32 2.6 38.6 4.4Q40.6 5.4 40 9.6Q32 12.6 24 9.6Z',
  hood: 'M19.4 11.4C15.4 -5.6 48.6 -5.6 44.6 11.4Z', hoodIn: 'M23.4 10.6C21.6 -0.6 42.4 -0.6 40.6 10.6Z',
};
function jacketModel(L) {
  const hem = 52 + L.length, CX = 32, CY = (hem + 5) / 2, root = new T.Group(), all = new T.Group(); all.scale.setScalar(U); root.add(all);
  const O = (d) => outline(d).map(([x, y]) => [x - CX, y - CY]), G = { grain: 0.05, cells: 46, smooth: 2 }, small = { ...G, cells: 16, smooth: 1 };
  const trimC = L.trim.color || shade(L.color, 0.55), lining = L.lining || shade(L.color, 0.28), cloth = (S) => part(S, L.mat, L.color), trim = (S) => part(S, L.trim.mat, trimC), both = (make) => [make(1), make(-1)];
  const side = (pts, s) => (s > 0 ? pts : mirrored(pts));
  // the back (its own swell, turned away), and the lining seen through the neck
  const torso = O(JACKET_CUT.torso(hem));
  all.add(turned(cloth(soft(torso, { ...G, depth: 1.2, puff: 2.2, bevel: 0.7, z: 1.4, round: 12 })), Math.PI), part(soft(torso.map(([x, y]) => [x * 0.9, y * 0.95]), { depth: 0.3, puff: 0, bevel: 0.1, z: -0.4 }), L.mat, lining));
  all.add(part(soft(rrect(-1.8, 7.3 - CY, 3.6, 1.7, 0.3), { depth: 0.2, puff: 0, bevel: 0.08, z: 0 }), 'paper', '#f1ede2')); // its label
  // the two fronts: each from the shoulder down, meeting down the middle; how far down the neck opens is the collar's doing
  const open = L.collar === 'lapel' ? 24 : 9.8, mid = L.closure === 'open' ? 29.4 : 33, fold = (x, y) => 0.3 * Math.sin(x * 0.9 + y * 0.1) * Math.max(0, Math.min(1, -y / 14)); // folds gather toward the hem
  const frontPts = O(`M25.4 7.9L15.6 11.6Q17.4 17 17.3 23Q18.6 ${(hem + 23) / 2} 16.8 ${hem}Q25 ${hem + 1.9} ${mid} ${hem + 2.3}L${mid} ${open}Z`);
  const fronts = both((s) => soft(side(frontPts, s), { ...G, depth: 1, puff: 2.3, bevel: 0.6, z: 1.4 + (s > 0 ? 0.25 : 0), round: 11, ripple: fold }));
  for (const F of fronts) all.add(cloth(F));
  const zF = (x, y) => Math.max(fronts[0].zAt(x - CX, y - CY), fronts[1].zAt(x - CX, y - CY)), on = (m, x, y, lift = 0) => { m.position.set(x - CX, -(y - CY), zF(x, y) + lift); return m; };
  // sleeves: tubes hanging from the shoulders, with their cuffs
  const sleeve = O(JACKET_CUT.sleeve), cuff = O(JACKET_CUT.cuff);
  for (const s of [1, -1]) { all.add(part(soft(side(sleeve, s), { ...G, depth: 2, puff: 2.1, bevel: 0.9, z: 0.3, both: true, round: 4.2, ripple: (x, y) => 0.3 * Math.sin(y * 0.75) }), L.sleeves.mat, L.sleeves.color));
    if (L.ribbed || L.trim.color) all.add(trim(soft(side(cuff, s), { ...small, cells: 22, depth: 2.4, puff: 2.2, bevel: 0.9, z: 0.3, both: true, round: 3, ripple: L.ribbed ? (x) => 0.28 * Math.sin(x * 4.4) : null }))); }
  if (L.ribbed) all.add(trim(soft(O(JACKET_CUT.hem(hem)), { ...G, cells: 40, depth: 2.6, puff: 1.6, bevel: 0.8, z: 1.2, both: true, round: 2.6, ripple: (x) => 0.3 * Math.sin(x * 2.6) })));
  // the collar
  if (L.collar === 'lapel') { const lap = O(JACKET_CUT.lapel); for (const s of [1, -1]) { const S = soft(side(lap, s), { ...small, cells: 26, depth: 0.5, puff: 0.9, bevel: 0.35, z: 0, round: 3.4 }), g = trim(S); g.position.z = zF(24, 14) + 0.5; all.add(g); } }
  else if (L.collar === 'stand') { const g = trim(soft(O(JACKET_CUT.stand), { ...small, cells: 26, depth: 1.6, puff: 1.3, bevel: 0.6, z: 0, both: true, round: 3, ripple: L.ribbed ? (x) => 0.25 * Math.sin(x * 4) : null })); g.position.z = 2.6; all.add(g); }
  else if (L.collar === 'hood') { const g = cloth(soft(O(JACKET_CUT.hood), { ...G, depth: 1.6, puff: 2.6, bevel: 0.8, z: -1.2, both: true, round: 8 })), inn = part(soft(O(JACKET_CUT.hoodIn), { depth: 0.3, puff: 0, bevel: 0.1, z: 0.6 }), L.mat, lining); all.add(g, inn);
    for (const s of [1, -1]) all.add(on(body(new T.CylinderGeometry(0.3, 0.3, 8, 8), 'canvas', '#f1ede2'), CX - s * 2.6, 15.6, 0.3), on(body(new T.SphereGeometry(0.65, 10, 8), 'metal', METAL), CX - s * 2.6, 19.8, 0.5)); }
  else if (L.collar === 'crew') { const curve = new T.QuadraticBezierCurve3(new T.Vector3(24.4 - CX, -(8.2 - CY), 2.2), new T.Vector3(0, -(15.6 - CY), 3.6), new T.Vector3(39.6 - CX, -(8.2 - CY), 2.2)); all.add(part(new T.TubeGeometry(curve, 24, 1.3, 10, false), L.trim.mat, trimC)); }
  // the closure down the front
  if (L.closure === 'zip') { all.add(on(body(new T.BoxGeometry(1.1, hem - open + 1.2, 0.5), 'metal', METAL), CX, (open + hem + 1.2) / 2, 0.05), on(body(new T.BoxGeometry(1.9, 2.3, 0.8), 'metal', METAL), CX, open + 1.7, 0.4), on(body(new T.BoxGeometry(1, 3, 0.5), 'metal', METAL), CX, open + 4.2, 0.5)); }
  if (L.closure === 'buttons') for (let i = 0; i < L.buttons; i++) { const y = open + 4 + (L.buttons > 1 ? (i * (hem - open - 10)) / (L.buttons - 1) : (hem - open) * 0.28), b = body(new T.CylinderGeometry(1.3, 1.3, 0.6, 20), 'plastic', L.buttonColor || '#f1e7c8'); b.children.forEach((m) => { m.rotation.x = Math.PI / 2; }); all.add(on(b, 31.3, y, 0.3)); }
  // pockets, as the style cuts them
  const py = Math.min(hem - 10, 38.5);
  for (let i = 0; i < L.pockets; i++) { const s = i ? -1 : 1, px = (x) => (s > 0 ? x : 64 - x), lay = (S, x, y, mat, color) => { const g = part(S, mat, color); g.position.z = zF(px(x), y) + 0.15; return g; }, R = (x, y, w, h, rad) => side(rrect(x - CX, y - CY, w, h, rad), s);
    if (L.style === 'bomber') { const w = body(new T.BoxGeometry(7.6, 1, 0.5), L.trim.mat, trimC); w.rotation.z = s * 0.9; all.add(on(w, px(22), py + 1.4, 0.2)); }
    else if (L.style === 'parka') all.add(lay(soft(R(19, py - 1, 8.4, 6.8, 1.2), { ...small, depth: 0.4, puff: 0.9, bevel: 0.3, z: 0, round: 2.4 }), 23, py + 2, L.mat, L.color), lay(soft(R(18.6, py - 1.6, 9.2, 2.6, 0.8), { ...small, depth: 0.35, puff: 0.5, bevel: 0.25, z: 0.9, round: 1.2 }), 23, py, L.trim.mat, trimC));
    else all.add(lay(soft(R(19.2, py, 8.2, 2.6, 0.7), { ...small, depth: 0.35, puff: 0.5, bevel: 0.25, z: 0, round: 1.2 }), 23, py + 1, L.trim.mat, trimC)); }
  return { root, pose() {}, w: 64, h: hem + 5, box: [-9, -9, 73, hem + 14], over: [], rest: [7, -16] };
}

// ---------- on the element ----------
const MODELS = new Map(), queue = []; let busy = false;
const modelFor = (key, make) => { if (!MODELS.has(key)) MODELS.set(key, make()); return MODELS.get(key); };
const still = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
// spec: { kind: 'wallet' | 'jacket', key, look, notes, name, sub, pinned(): is it kept open }. face: the drawn piece
// (it keeps its place and what it holds; its own drawing gives way to the body). el: the thing it is held as.
export function embody(el, face, spec) { if (typeof document === 'undefined') return; queue.push([el, face, spec, 0]); if (!busy) { busy = true; requestAnimationFrame(pump); } }
async function pump() {
  try { await load(); T = three(); } catch { queue.length = 0; busy = false; return; }
  const start = performance.now();
  while (queue.length && performance.now() - start < 14) { const job = queue.shift(), [el, face, spec] = job;
    if (!el.isConnected || !face.getBoundingClientRect().width) { if (++job[3] < 600) queue.push(job); break; } // not on the page yet: its turn comes round again
    try { dress(el, face, spec); } catch (e) { console.error('gear3d', spec.key, e); } }
  if (queue.length) requestAnimationFrame(pump); else busy = false;
}
function dress(el, face, spec) {
  const make = () => (spec.kind === 'wallet' ? walletModel(spec.look, spec.notes) : jacketModel(spec.look)), M = modelFor(spec.key, make);
  const [bx0, by0, bx1, by1] = M.box, bw = bx1 - bx0, bh = by1 - by0, k = Math.min(1100 / Math.max(bw, bh), (face.getBoundingClientRect().width / M.w) * Math.min(2, devicePixelRatio || 1) * 1.15);
  const canvasAt = (cls) => { const cv = document.createElement('canvas'); cv.width = Math.round(bw * k); cv.height = Math.round(bh * k); cv.className = cls; Object.assign(cv.style, { left: `${bx0}px`, top: `${by0}px`, width: `${bw}px`, height: `${bh}px` }); return cv; };
  const under = canvasAt('g3-under'), over = canvasAt('g3-over'), ux = under.getContext('2d'), ox = over.getContext('2d');
  const view = [(bx0 - M.w / 2) * U, -(by1 - M.h / 2) * U, (bx1 - M.w / 2) * U, -(by0 - M.h / 2) * U];
  const st = { t: 0, want: 0, raf: 0, lean: null, hover: false };
  // one picture: the model as it is at t (how far open), turned as it rests (less so the further open: open, it lies flat)
  const draw = () => { const [rx, ry] = st.lean || M.rest, e = 1 - st.t, turn = new DOMMatrix().rotateSelf(e * rx, e * ry, 0);
    M.pose(st.t); ux.clearRect(0, 0, under.width, under.height); ux.drawImage(renderGroup(M.root, { w: under.width, h: under.height, view, turn }), 0, 0);
    const shown = st.t >= 1 || !!M.flat; ox.clearRect(0, 0, over.width, over.height);
    if (shown) for (const [x, y, w, h] of M.over) { const a = [(x - bx0) * k, (y - by0) * k, w * k, h * k]; ox.drawImage(under, ...a, ...a); } // what lies over the things it holds
    face.classList.toggle('shown', shown); face.classList.toggle('shut', st.t <= 0 && !M.flat); };
  const run = () => { cancelAnimationFrame(st.raf); let last = performance.now();
    const tick = (now) => { const d = (now - last) / 420; last = now; st.t = st.want > st.t ? Math.min(st.want, st.t + d) : Math.max(st.want, st.t - d); draw(); if (st.t !== st.want && el.isConnected) st.raf = requestAnimationFrame(tick); };
    if (still()) { st.t = st.want; draw(); } else st.raf = requestAnimationFrame(tick); };
  const aim = () => { const want = !M.flat && spec.kind === 'wallet' && (st.hover || spec.pinned?.()) ? 1 : 0; if (want !== st.want) { st.want = want; run(); } };
  face.querySelector(':scope > .g3-under')?.remove(); face.querySelector(':scope > .g3-over')?.remove(); face.prepend(under); face.append(over);
  face.classList.add('g3d'); el.classList.add('g3d', 'th-still');
  if (M.emblem) face.style.setProperty('--g3-ex', `${M.emblem[0]}px`), face.style.setProperty('--g3-ey', `${M.emblem[1]}px`);
  el.addEventListener('pointerenter', () => { st.hover = true; aim(); }); el.addEventListener('pointerleave', () => { st.hover = false; st.lean = null; aim(); if (spec.kind === 'jacket') draw(); });
  el.addEventListener('click', () => requestAnimationFrame(aim));
  // a jacket turns toward the pointer on it, as a card leans
  if (spec.kind === 'jacket') el.addEventListener('pointermove', (ev) => { const r = el.getBoundingClientRect(); if (!r.width || still()) return; const x = (ev.clientX - r.left) / r.width - 0.5, y = (ev.clientY - r.top) / r.height - 0.5;
    st.lean = [-y * 30, x * 44]; cancelAnimationFrame(st.raf); st.raf = requestAnimationFrame(draw); }, { passive: true });
  // in the hand (ui/spin.js): the body itself, turned freely
  el._look = (least) => { const size = Math.max(least, 250), half = (Math.max(M.w, M.h) * 0.62 + 10) * U, px = Math.round(size * Math.min(2, devicePixelRatio || 1)), cv = document.createElement('canvas'); cv.width = cv.height = px; Object.assign(cv.style, { width: `${size}px`, height: `${size}px` });
    const cx = cv.getContext('2d'), wrap = document.createElement('div'); wrap.className = 'g3-look'; wrap.append(cv); let R = new DOMMatrix();
    return { el: wrap, size, name: spec.name, sub: spec.sub, start: new DOMMatrix().rotateSelf(-10, 24, 0), get matrix() { return R; },
      setRotation(m) { R = m; M.pose(0); cx.clearRect(0, 0, px, px); cx.drawImage(renderGroup(M.root, { w: px, h: px, view: [-half, -half, half, half], turn: m }), 0, 0); } }; };
  aim(); draw();
}
