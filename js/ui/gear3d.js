// Wallets and jackets as bodies, made of the materials (ui/dice3d.js): the very material a die of it has, in the same
// room and light, on the piece's own form. Nothing here knows a material by name: a part is a shape, and what it is
// made of is whatever its look says (content/finishes.js), so any material a die can be, a wallet or a jacket can be,
// and tuning a material once tunes it everywhere.
//
//   sewn()    the one way a part gets its form: outlines (in the px of the piece's own drawing) made into one padded
//             surface, each panel swelling toward its middle and meeting the next in a seam (one panel: a pillow)
//   folding() a sheet folded along lines: a wallet is one sheet, and opening it unfolds it
//   models    walletModel(look) and jacketModel(look): the parts, and a pose (how far a wallet is unfolded)
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

// ---------- the sewn body ----------
// The one way a part gets its form. Panels (outlines in the px of the piece's drawing, y down) lie side by side as
// one padded surface: each swells toward its own middle and they meet in seams, the way sewn cloth or leather does.
// A single panel is a pillow; several are a garment.
//   depth: the slab · bevel: how round its edge is · puff: how far a panel swells (a panel may give its own) ·
//   round: how far in from an edge the swell reaches (else half the width) · z: where the slab's middle lies ·
//   face: which side swells ('front', 'back', 'both') · seam: how far a seam stands above the edge (0: a deep valley) ·
//   ripple(x, y): folds added to the swell · grooves: [{ pts, depth, width }] lines pressed into it ·
//   grain: tiles per px · cells: how finely it is modelled · smooth: how far the swell is smoothed over · slab: false
//   leaves the edge slab out (a second surface over the same panels)
// → { parts: [the geometries of each panel], zAt(x, y): the front surface there, zBack(x, y): the back }
const up = (pts) => pts.map(([x, y]) => [x, -y]);
// how far inside an outline a point is (less than 0: outside it)
const inside = (P) => (x, y) => { let inn = false, best = 1e9; for (let i = 0; i < P.length; i++) { const [ax, ay] = P[i], [bx, by] = P[(i + 1) % P.length];
  if ((ay > y) !== (by > y) && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inn = !inn;
  const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1))); best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy)); } return inn ? best : -best; };
const along = (P) => (x, y) => { let best = 1e9; for (let i = 0; i + 1 < P.length; i++) { const [ax, ay] = P[i], [bx, by] = P[i + 1], dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1))); best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy)); } return best; };
function sewn(panels, { depth = 3, puff = 2, bevel = 1, z = 0, face = 'front', round = null, seam = 0.5, ripple = null, grooves = [], grain = 0.04, cells = 42, smooth = 3, slab = true } = {}) {
  const Ps = panels.map((p) => up(p.pts)), cut = grooves.map((g) => ({ ...g, d: along(up(g.pts)) }));
  // (a point well outside a panel's box is far outside the panel: no need to measure)
  const sds = Ps.map((P) => { const f = inside(P), ax = Math.min(...P.map((p) => p[0])) - 6, bx = Math.max(...P.map((p) => p[0])) + 6, ay = Math.min(...P.map((p) => p[1])) - 6, by = Math.max(...P.map((p) => p[1])) + 6; return (x, y) => (x < ax || x > bx || y < ay || y > by ? -99 : f(x, y)); });
  const xs = Ps.flat().map((p) => p[0]), ys = Ps.flat().map((p) => p[1]), x0 = Math.min(...xs) - bevel, x1 = Math.max(...xs) + bevel, y0 = Math.min(...ys) - bevel, y1 = Math.max(...ys) + bevel;
  const reach = Ps.map((P, i) => panels[i].round ?? round ?? Math.min(Math.max(...P.map((p) => p[0])) - Math.min(...P.map((p) => p[0])), Math.max(...P.map((p) => p[1])) - Math.min(...P.map((p) => p[1]))) / 2);
  // at a point: which panel it is on (a later panel lies over an earlier one), how far inside the whole it is, and its height
  const read = (x, y) => { let on = -1, all = -1e9; const s = sds.map((f) => f(x, y)); s.forEach((v, i) => { if (v > 0) on = i; if (v > all) all = v; });
    if (on < 0) { const e = Math.min(1, -all / bevel); return { on: s.indexOf(all), all, h: -bevel * (1 - Math.sqrt(1 - e * e)) }; }
    let d = all, near = -1, by = 1e9; s.forEach((v, i) => { if (i !== on && Math.abs(v) < by) { by = Math.abs(v); near = i; } }); d = Math.min(d, seam + by); // a seam: where another panel's edge runs
    const t = Math.min(1, d / reach[on]); let h = (panels[on].puff ?? puff) * Math.sin(t * Math.PI / 2) + (ripple ? ripple(x, y) * t : 0);
    for (const g of cut) h -= g.depth * Math.exp(-((g.d(x, y) / g.width) ** 2)) * Math.min(1, all / (g.width * 2));
    return { on, all, h, near, off: near < 0 ? 0 : s[near] }; };
  const top = z + depth / 2 + bevel, parts = panels.map(() => []);
  if (slab) Ps.forEach((P, i) => { const ex = new T.ExtrudeGeometry(new T.Shape(P.map(([x, y]) => new T.Vector2(x, y))), { depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 1, steps: 1 });
    ex.translate(0, 0, z - depth / 2); const uv = ex.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * grain, uv.getY(k) * grain); parts[i].push(ex); });
  const step = Math.max(x1 - x0, y1 - y0) / cells, nx = Math.ceil((x1 - x0) / step), ny = Math.ceil((y1 - y0) / step), n = (nx + 1) * (ny + 1), D = new Float32Array(n), H = new Float32Array(n), ON = new Int8Array(n);
  const X = new Float32Array(n), Y = new Float32Array(n), at = (k) => [X[k], Y[k]]; // where grid point k is
  for (let k = 0; k < n; k++) { X[k] = x0 + (k % (nx + 1)) * step; Y[k] = y0 + Math.floor(k / (nx + 1)) * step; let r = read(X[k], Y[k]);
    // a point that falls beside a seam is moved onto it, so the seam runs clean through the surface and not in steps
    if (r.all > step && r.near >= 0 && Math.abs(r.off) < step * 0.5) { const f = sds[r.near], e = 0.2, gx = (f(X[k] + e, Y[k]) - f(X[k] - e, Y[k])) / (2 * e), gy = (f(X[k], Y[k] + e) - f(X[k], Y[k] - e)) / (2 * e), g2 = gx * gx + gy * gy || 1;
      X[k] -= (r.off * gx) / g2; Y[k] -= (r.off * gy) / g2; r = read(X[k], Y[k]); }
    D[k] = r.all; H[k] = r.h; ON[k] = r.on; }
  // smoothed over (the distance to an edge creases where two edges are as near: a pillow has no such creases), but never across a seam
  for (let pass = 0, B = new Float32Array(n); pass < smooth; pass++) { B.set(H);
    for (let j = 1; j < ny; j++) for (let i = 1; i < nx; i++) { const k = j * (nx + 1) + i; if (D[k] <= 0) continue; let t = 0, c = 0; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const q = k + a * (nx + 1) + b; if (ON[q] === ON[k]) { t += Math.max(0, B[q]); c++; } } H[k] = t / c; } }
  const dome = (side, on) => { const pos = [], uvs = [], idx = [];
    for (let k = 0; k < n; k++) { const [x, y] = at(k), hgt = H[k] + 0.02; pos.push(x, y, side > 0 ? top + hgt : 2 * z - top - hgt); uvs.push(x * grain, y * grain); }
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; if (Math.min(D[a], D[b], D[c], D[d]) < -bevel * 0.85) continue;
      const here = ON[a] === ON[b] && ON[b] === ON[c] && ON[c] === ON[d] ? ON[a] : read((X[a] + X[d]) / 2, (Y[a] + Y[d]) / 2).on; if (here !== on) continue; /* (a cell on a seam: whichever panel its middle is on) */ if (side > 0) idx.push(a, b, d, a, d, c); else idx.push(a, d, b, a, c, d); }
    if (!idx.length) return null;
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2)); g.setIndex(idx); g.computeVertexNormals(); return g; };
  panels.forEach((p, i) => { for (const side of face === 'both' ? [1, -1] : [face === 'back' ? -1 : 1]) { const g = dome(side, i); if (g) parts[i].push(g); } });
  const zAt = (x, y) => top + read(x, -y).h;
  return { parts, zAt, zBack: (x, y) => 2 * z - zAt(x, y) };
}
// one panel: a pillow
const soft = (pts, o = {}) => { const S = sewn([{ pts }], o); return { geoms: S.parts[0], zAt: S.zAt, zBack: S.zBack }; };
// a part: geometry made of a material in a colour
const part = (S, mat, color) => { const g = new T.Group(); for (const geo of S.geoms || [S]) g.add(body(geo, mat, color)); return g; };
const lighter = (hex, k) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - k) + 255 * k).toString(16).padStart(2, '0')).join('');
// the thread a colour is sewn with: darker on a light piece, lighter on a dark one
const thread = (hex) => { if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return '#e9e2d0'; const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? shade(hex, 0.6) : lighter(hex, 0.5); };
// A row of stitches along a line (px, y down), lying on a surface z(x, y): one geometry, each stitch a tiny bar.
// closed: the line runs back to its start · gap: px from stitch to stitch · under: it lies on the back of the piece
function stitches(pts, z, color, { closed = true, gap = 4.2, long = 2.3, thick = 0.5, under = false } = {}) {
  const box = new T.BoxGeometry(long, thick * 1.1, thick).toNonIndexed(), bp = box.attributes.position.array, bn = box.attributes.normal.array, pos = [], nor = [], n = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length], len = Math.hypot(bx - ax, by - ay), m = Math.floor(len / gap), a = Math.atan2(-(by - ay), bx - ax), c = Math.cos(a), s = Math.sin(a);
    for (let k = 0; k < m; k++) { const t = (k + 0.5) / m, x = ax + (bx - ax) * t, y = ay + (by - ay) * t, zz = z(x, y) + (under ? -0.1 : 0.1);
      for (let v = 0; v < bp.length; v += 3) { pos.push(x + bp[v] * c - bp[v + 1] * s, -y + bp[v] * s + bp[v + 1] * c, zz + bp[v + 2]); nor.push(bn[v] * c - bn[v + 1] * s, bn[v] * s + bn[v + 1] * c, bn[v + 2]); } } }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  return body(g, 'canvas', color);
}
// a small solid thing set at a place: its geometry is moved there (so a fold carries it with the sheet it sits on)
const set = (geo, mat, color, x, y, z, scale = [1, 1, 1]) => { geo.scale(...scale); geo.translate(x, -y, z); return body(geo, mat, color); };

// ---------- folding ----------
// A sheet lies flat and is folded along lines: everything past a line (px, y up; `sign`: which side of it) is carried
// round an arc `len` long and on, rigidly, toward the viewer. → pose([angle of each fold]): the whole model, folded so
// (every geometry in `root`, from its flat shape each time, normals turned with it)
function folding(root, folds) {
  const geos = new Set(); root.traverse((m) => { if (m.isMesh) { geos.add(m.geometry); m.frustumCulled = false; } });
  const flat = [...geos].filter((g) => g.attributes.position && g.attributes.normal).map((g) => ({ g, p: g.attributes.position.array.slice(), n: g.attributes.normal.array.slice() }));
  return (angles) => { for (const { g, p, n } of flat) { const P = g.attributes.position.array, N = g.attributes.normal.array;
    for (let i = 0; i < p.length; i += 3) { const v = [p[i], p[i + 1], p[i + 2]], w = [n[i], n[i + 1], n[i + 2]];
      folds.forEach((f, k) => { const th = angles[k], ax = f.axis === 'x' ? 0 : 1, u = f.sign * (v[ax] - f.from); if (u <= 0 || th < 1e-4) return;
        const r = f.len / th, phi = th * Math.min(1, u / f.len), c = Math.cos(phi), s = Math.sin(phi), z = v[2], past = Math.max(0, u - f.len), rho = r - (past ? 0 : z);
        v[ax] = f.from + f.sign * (past ? r * s + past * c - z * s : rho * s); v[2] = past ? r * (1 - c) + past * s + z * c : r - rho * c;
        const nu = f.sign * w[ax], nz = w[2]; w[ax] = f.sign * (nu * c - nz * s); w[2] = nu * s + nz * c; });
      P[i] = v[0]; P[i + 1] = v[1]; P[i + 2] = v[2]; N[i] = w[0]; N[i + 1] = w[1]; N[i + 2] = w[2]; }
    g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true; } };
}
const NOTE_GREENS = ['#8fbf86', '#a5cf9a', '#7fb07a', '#b4d8a6'];
const METAL = '#c9d0dc';

// ---------- a wallet ----------
// One sheet of what it is made of, padded, stitched round its edge, and folded: a billfold in half, a pouch up from
// the bottom with its flap down over the front, a clip back on itself round the wad. Opening it unfolds the sheet.
// → { root, pose(t) (0 shut … 1 open), box: [x0, y0, x1, y1] the px it needs round its face (0, 0 its top left), w, h,
//     over: the px rectangles of its face that lie over what it holds (pockets, the clip's arm), rest: its turn when
//     shut, gutter: px between a billfold's leaves when it lies open }
function walletModel(L, notes) {
  const root = new T.Group(), all = new T.Group(); all.scale.setScalar(U); root.add(all);
  const lining = L.lining || shade(L.color, 0.3), sew = thread(L.color), r = L.round;
  const skin = (S) => part(S, L.mat, L.color), pocket = (S) => part(S, L.pocket.mat, L.pocket.color);
  // the sheet: its outside swells (the back of it as it lies open), a valley where each fold will be; its inside is at z 0
  const sheet = (pts, valleys, o = {}) => soft(pts, { depth: 2.2, bevel: 1.1, z: -2.2, puff: 2.6, face: 'back', round: 20, cells: 64, ripple: (x, y) => -valleys.reduce((t, [axis, at, wide]) => t + 2.9 * Math.exp(-((((axis === 'x' ? x : y) - at) / wide) ** 2)), 0), ...o });
  const cash = (x, y, w) => { const g = new T.Group(); for (let i = 0; i < notes; i++) g.add(part(soft(rrect(x + i * 3, y + i * 1.3, w - i * 5, 30, 1.5), { depth: 0.35, puff: 0, bevel: 0.12, z: 0.7 + i * 0.3 }), 'paper', NOTE_GREENS[i])); return g; };
  // the inside of a leaf: its lining, and (front) the pocket over the lower half, stitched down
  const inner = (x, W, H, front) => { const g = new T.Group(); g.add(part(soft(rrect(x + 5, -H / 2 + 5, W - 10, H - 43, 3), { depth: 0.4, puff: 0, bevel: 0.15, z: 0.3 }), L.pocket.mat, lining));
    if (front) { const S = soft(rrect(x, H / 2 - 46, W, 46, [2, 2, 3, 3]), { depth: 0.9, puff: 1.1, bevel: 0.5, z: 1.5, round: 14 }); g.add(pocket(S)); if (L.stitch) g.add(stitches(rrect(x + 4, H / 2 - 42, W - 8, 38, 2), S.zAt, thread(L.pocket.color))); }
    return g; };
  if (L.type === 'clip') { const W = 150, H = 86, arm = H - 12, F = 17, wide = 20, top = -H / 2 + 2; // a strip bent back on itself: one arm under the wad, the bend at the top, the other arm over everything
    for (let i = 0; i < notes; i++) all.add(part(soft(rrect(-W / 2 + 2 + i * 1.5, -H / 2 + 16 + i * 2, W - 4 - i * 3, H - 16 - i * 3.5, 5), { depth: 1.2, puff: 0.9, bevel: 0.6, z: 1.9 + i * 1.5, face: 'both' }), 'paper', NOTE_GREENS[i]));
    const strip = sheet(rrect(-wide / 2, top - F - arm, wide, arm * 2 + F, [9, 9, 6, 6]), [], { depth: 1.2, bevel: 0.7, z: -1.3, puff: 0.5, round: 6, cells: 80 }); all.add(skin(strip));
    folding(all, [{ axis: 'y', from: -top, len: F, sign: 1 }])([Math.PI]);
    return { root, pose() {}, w: W, h: H, box: [-14, -20, W + 14, H + 14], over: [[W / 2 - wide / 2 + 0.5, -20, wide - 1, arm + 26]], rest: [0, 0], flat: true }; }
  if (L.type === 'clasped') { const W = 138, H = 92, wall = 46, Fb = 12, Ft = 23, fl = L.flap * 1.5 + 30, yTop = -H / 2 - Ft - fl, yEnd = H / 2 + Fb + wall;
    const pts = rrect(-W / 2, yTop, W, yEnd - yTop, [Math.min(fl * 0.7, 34), Math.min(fl * 0.7, 34), 3, 3]), S = sheet(pts, [['y', H / 2 + Fb / 2, 7], ['y', -H / 2 - Ft / 2, 9]]); all.add(skin(S));
    if (L.stitch) all.add(stitches(rrect(-W / 2 + 4, yTop + 4, W - 8, yEnd - yTop - 8, [Math.min(fl * 0.7, 34) - 3, Math.min(fl * 0.7, 34) - 3, 2, 2]), S.zBack, sew, { under: true }));
    all.add(inner(-W / 2, W, H, false), cash(-W / 2 + 9, -H / 2 - 5, W - 18));
    all.add(part(soft(rrect(-W / 2 + 4, yTop + 4, W - 8, fl - 4, [Math.min(fl * 0.7, 34) - 3, Math.min(fl * 0.7, 34) - 3, 2, 2]), { depth: 0.3, puff: 0, bevel: 0.12, z: 0.25 }), L.pocket.mat, lining)); // the flap's lining
    const out = (y) => S.zBack(0, y) - 0.6, tipY = yTop + 10, studY = yEnd - wall + fl - 10 > yEnd - 8 ? yEnd - 12 : yEnd - wall + fl - 10;
    if (L.clasp === 'zip') all.add(set(new T.BoxGeometry(W * 0.8, 2.6, 1.4), 'metal', METAL, 0, yTop + 4.5, out(yTop + 5)));
    else if (L.clasp === 'magnet') all.add(set(new T.BoxGeometry(14, 8, 2.4), 'metal', '#6a7386', 0, tipY, out(tipY) - 0.6));
    else if (L.clasp === 'snap') all.add(set(new T.SphereGeometry(4.6, 20, 12), 'metal', METAL, 0, tipY, out(tipY) - 0.4, [1, 1, 0.5]), set(new T.SphereGeometry(3.2, 16, 10), 'metal', '#8d95a6', 0, studY, out(studY), [1, 1, 0.4]));
    else for (let i = 0; i < 7; i++) { const a = (i / 6) * Math.PI, g = new T.TorusGeometry(3, 0.75, 8, 16); if (i % 2) g.rotateY(Math.PI / 2); g.rotateZ(0.3); all.add(set(g, 'metal', METAL, W / 2 + 4 + Math.sin(a) * 9, -H / 2 + 30 + i * 5, -3)); }
    const fold = folding(all, [{ axis: 'y', from: -H / 2, len: Fb, sign: -1 }, { axis: 'y', from: H / 2, len: Ft, sign: 1 }]);
    return { root, pose: (t) => fold([Math.PI, Math.PI * (1 - t) + 0.22 * t]), w: W, h: H, box: [-18, -Ft - fl - 16, W + 24, H + 18], over: [[0, H - wall + 1, W, wall]], rest: [10, -14], emblem: [12, 8] }; }
  // a billfold: the two leaves are one sheet, folded down its middle
  const W = 118, H = 92, F = 14, pts = rrect(-W / 2, -H / 2, W * 2 + F, H, r), S = sheet(pts, [['x', W / 2 + F / 2, 8]]); all.add(skin(S));
  if (L.stitch) all.add(stitches(rrect(-W / 2 + 4, -H / 2 + 4, W * 2 + F - 8, H - 8, Math.max(1, r - 2)), S.zBack, sew, { under: true }));
  all.add(inner(-W / 2, W, H, true), inner(W / 2 + F, W, H, true), cash(-W / 2 + 9, -H / 2 - 5, W - 18));
  const fold = folding(all, [{ axis: 'x', from: W / 2, len: F, sign: 1 }]);
  return { root, pose: (t) => fold([Math.PI * (1 - t)]), w: W, h: H, box: [-18, -22, W * 2 + F + 18, H + 20], over: [[0, 46, W, 46], [W + F, 46, W, 46]], rest: [10, -14], emblem: [W - 27, H - 27], gutter: F };
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
// One garment: its panels (fronts, sleeves, cuffs, hem band) sewn into one surface, front and back, with a seam where
// each meets the next and a row of stitching beside it; the collar, the pockets and the fastenings are sewn on top.
function jacketModel(L) {
  const hem = 52 + L.length, CX = 32, CY = (hem + 5) / 2, root = new T.Group(), all = new T.Group(); all.scale.setScalar(U); root.add(all);
  const O = (d) => outline(d).map(([x, y]) => [x - CX, y - CY]), C = (x, y) => [x - CX, y - CY], G = { grain: 0.05 }, small = { ...G, cells: 18, smooth: 1 };
  const trimC = L.trim.color || shade(L.color, 0.55), lining = L.lining || shade(L.color, 0.28), sew = thread(L.color), trim = (S) => part(S, L.trim.mat, trimC), cuffed = L.ribbed || !!L.trim.color;
  // the panels. The front is cut away at the neck (down to where the collar lets it open), and down the middle if worn open
  const open = L.collar === 'lapel' ? 24 : 9.8, gap = L.closure === 'open' ? 2.6 : 0;
  const neck = gap ? `L${CX + gap} ${hem + 2.3}L${CX + gap} ${open}L38.6 7.9` : 'L38.6 7.9';
  const front = O(`M25.4 7.9L15.6 11.6Q17.4 17 17.3 23Q18.6 ${(hem + 23) / 2} 16.8 ${hem}Q25 ${hem + 1.9} ${CX - gap} ${hem + 2.3}${gap ? `L${CX - gap} ${open}Z` : `Q40 ${hem + 1.9} 47.2 ${hem}Q45.4 ${(hem + 23) / 2} 46.7 23Q46.6 17 48.4 11.6${neck}L${CX} ${open}Z`}`);
  const sleeve = O(JACKET_CUT.sleeve), cuff = O(JACKET_CUT.cuff), band = O(JACKET_CUT.hem(hem)), torso = O(JACKET_CUT.torso(hem));
  const cloth = { mat: L.mat, color: L.color }, arm = { mat: L.sleeves.mat, color: L.sleeves.color, puff: 1.9, round: 4.4 }, rib = { mat: L.trim.mat, color: trimC };
  const panels = (body) => [...body.map((pts) => ({ pts, ...cloth, round: 12 })), { pts: sleeve, ...arm }, { pts: mirrored(sleeve), ...arm },
    ...(cuffed ? [{ pts: cuff, ...rib, puff: 2.1, round: 3 }, { pts: mirrored(cuff), ...rib, puff: 2.1, round: 3 }] : []), ...(L.ribbed ? [{ pts: band, ...rib, puff: 1.9, round: 2.8 }] : [])];
  const folds = (x, y) => 0.26 * Math.sin(x * 0.85 + y * 0.1) * Math.max(0, Math.min(1, -y / 12)) + (L.ribbed && y < -(hem - 4.6 - CY) ? 0.28 * Math.sin(x * 2.6) : 0);
  const placket = gap || L.closure === 'zip' ? [] : [{ pts: [C(33.4, open), C(33.6, hem + 2)], depth: 0.9, width: 0.55 }];
  const shape = { ...G, depth: 1.6, bevel: 0.8, puff: 2.3, seam: 0.35, cells: 66, smooth: 2, ripple: folds };
  const F = sewn(panels(gap ? [front, mirrored(front)] : [front]), { ...shape, grooves: placket }), B = sewn(panels([torso]), { ...shape, face: 'back', slab: false });
  for (const S of [F, B]) S.parts.forEach((geoms, i) => { const p = (S === F ? panels(gap ? [front, mirrored(front)] : [front]) : panels([torso]))[i]; all.add(part({ geoms }, p.mat, p.color)); });
  const zF = (x, y) => F.zAt(x - CX, y - CY), run = (pts, o) => stitches(pts.map(([x, y]) => C(x, y)), F.zAt, sew, { gap: 1.5, long: 0.85, thick: 0.2, closed: false, ...o });
  // the lining, seen through the neck (and down the front, worn open), with its label
  all.add(part(soft(torso.map(([x, y]) => [x * 0.9, y * 0.95]), { depth: 0.3, puff: 0, bevel: 0.1, z: -0.2 }), L.mat, lining), part(soft(rrect(-1.8, 7.3 - CY, 3.6, 1.7, 0.3), { depth: 0.2, puff: 0, bevel: 0.08, z: 0.2 }), 'paper', '#f1ede2'));
  // top-stitching: beside each armhole seam, round the hem, beside the front edge
  for (const s of [1, -1]) { const m = (pts) => (s > 0 ? pts : pts.map(([x, y]) => [64 - x, y]));
    all.add(run(m([[18.5, 12.6], [19.3, 17], [18.9, 22.4]])), run(m([[19, hem - (L.ribbed ? 5.4 : 1.6)], [25, hem - (L.ribbed ? 4.4 : 0.4)], [31, hem - (L.ribbed ? 3.9 : 0.1)]])));
    if (!cuffed) all.add(run(m([[4.1, 41.3], [7.2, 42.9], [10.6, 42.4]]))); }
  if (!gap) all.add(run([[34.5, open + 1], [34.7, hem + 0.6]]));
  // the collar
  const edge = (pts, zAt, o) => stitches(pts, zAt, thread(trimC), { gap: 1.5, long: 0.85, thick: 0.2, ...o });
  if (L.collar === 'lapel') for (const s of [1, -1]) { const lap = s > 0 ? O(JACKET_CUT.lapel) : mirrored(O(JACKET_CUT.lapel)), z0 = zF(24, 14) + 0.25, S = soft(lap, { ...small, cells: 30, depth: 0.45, puff: 0.7, bevel: 0.3, z: z0, round: 3.4 });
    all.add(trim(S), edge(lap.map(([x, y]) => [x * 0.94 + (s > 0 ? -0.35 : 0.35), y * 0.95 - 0.5]), S.zAt)); }
  else if (L.collar === 'stand') { const S = soft(O(JACKET_CUT.stand), { ...small, cells: 30, depth: 1.4, puff: 1.2, bevel: 0.6, z: 2.4, face: 'both', round: 3, ripple: L.ribbed ? (x) => 0.25 * Math.sin(x * 4) : null }); all.add(trim(S)); if (!L.ribbed) all.add(edge(O(JACKET_CUT.stand).map(([x, y]) => [x * 0.93, (y + CY - 7.4) * 0.8 + 7.4 - CY]), S.zAt)); }
  else if (L.collar === 'hood') { all.add(part(soft(O(JACKET_CUT.hood), { ...G, cells: 40, depth: 1.6, puff: 2.6, bevel: 0.8, z: -1.2, face: 'both', round: 8 }), L.mat, L.color), part(soft(O(JACKET_CUT.hoodIn), { depth: 0.3, puff: 0, bevel: 0.1, z: 0.6 }), L.mat, lining));
    for (const s of [1, -1]) all.add(set(new T.CylinderGeometry(0.3, 0.3, 8, 8), 'canvas', '#f1ede2', -s * 2.6, 15.6 - CY, zF(CX - s * 2.6, 15.6) + 0.3), set(new T.SphereGeometry(0.65, 10, 8), 'metal', METAL, -s * 2.6, 19.8 - CY, zF(CX - s * 2.6, 19.8) + 0.5)); }
  else if (L.collar === 'crew') all.add(part(new T.TubeGeometry(new T.QuadraticBezierCurve3(new T.Vector3(24.4 - CX, -(8.2 - CY), 2.2), new T.Vector3(0, -(15.6 - CY), 3.6), new T.Vector3(39.6 - CX, -(8.2 - CY), 2.2)), 24, 1.3, 10, false), L.trim.mat, trimC));
  // the fastening down the front
  if (L.closure === 'zip') { const tape = rrect(-1.5, open - CY, 3, hem - open + 1.6, 0.4), S = soft(tape, { ...small, depth: 0.2, puff: 0.15, bevel: 0.1, z: zF(CX, (open + hem) / 2) + 0.05, round: 1 }); all.add(trim(S));
    for (let y = open + 0.6; y < hem + 1; y += 0.9) all.add(set(new T.BoxGeometry(1.15, 0.45, 0.4), 'metal', METAL, 0, y - CY, zF(CX, y) + 0.35));
    all.add(set(new T.BoxGeometry(1.9, 2.3, 0.8), 'metal', METAL, 0, open + 1.7 - CY, zF(CX, open + 1.7) + 0.7), set(new T.BoxGeometry(1, 3, 0.45), 'metal', METAL, 0, open + 4.2 - CY, zF(CX, open + 4.2) + 0.8)); }
  if (L.closure === 'buttons') for (let i = 0; i < L.buttons; i++) { const y = open + 4 + (L.buttons > 1 ? (i * (hem - open - 10)) / (L.buttons - 1) : (hem - open) * 0.28), g = new T.CylinderGeometry(1.3, 1.3, 0.6, 20); g.rotateX(Math.PI / 2);
    all.add(set(g, 'plastic', L.buttonColor || '#f1e7c8', 31.3 - CX, y - CY, zF(31.3, y) + 0.3), stitches([C(30.8, y), C(31.8, y)], () => zF(31.3, y) + 0.62, sew, { closed: false, gap: 1, long: 0.9, thick: 0.18 })); }
  // pockets, as the style cuts them, each sewn on
  const py = Math.min(hem - 10, 38.5);
  for (let i = 0; i < L.pockets; i++) { const s = i ? -1 : 1, px = (x) => (s > 0 ? x : 64 - x), R = (x, y, w, h, rad) => { const q = rrect(x - CX, y - CY, w, h, rad); return s > 0 ? q : mirrored(q); }, z0 = (x, y) => zF(px(x), y) + 0.12;
    const sewOn = (q, o, mat, color) => { const S = soft(q, { ...small, ...o }); all.add(part(S, mat, color), stitches(q.map(([x, y]) => [x * 0.9 + (q[0][0] + q[Math.floor(q.length / 2)][0]) * 0.05, y * 0.8 + (q[0][1] + q[Math.floor(q.length / 2)][1]) * 0.1]), S.zAt, thread(color), { gap: 1.3, long: 0.75, thick: 0.18 })); };
    if (L.style === 'bomber') { const g = new T.BoxGeometry(7.6, 1, 0.5); g.rotateZ(s * 0.9); all.add(set(g, L.trim.mat, trimC, px(22) - CX, py + 1.4 - CY, z0(22, py + 1.4) + 0.2)); }
    else if (L.style === 'parka') { sewOn(R(19, py - 1, 8.4, 6.8, 1.2), { depth: 0.35, puff: 0.8, bevel: 0.25, z: z0(23, py + 2), round: 2.4 }, L.mat, L.color); sewOn(R(18.6, py - 1.6, 9.2, 2.6, 0.8), { depth: 0.3, puff: 0.45, bevel: 0.2, z: z0(23, py) + 0.9, round: 1.2 }, L.trim.mat, trimC); }
    else sewOn(R(19.2, py, 8.2, 2.6, 0.7), { depth: 0.3, puff: 0.45, bevel: 0.2, z: z0(23, py + 1), round: 1.2 }, L.trim.mat, trimC); }
  return { root, pose() {}, w: 64, h: hem + 5, box: [-9, -9, 73, hem + 14], over: [], rest: [7, -16] };
}

// ---------- on the element ----------
const MODELS = new Map(), queue = []; let busy = false;
const modelOf = (spec) => { const key = `${spec.kind}|${JSON.stringify(spec.look)}|${spec.notes || 0}`; if (!MODELS.has(key)) MODELS.set(key, spec.kind === 'wallet' ? walletModel(spec.look, spec.notes || 0) : jacketModel(spec.look)); return MODELS.get(key); };
// make these ready ahead of being shown (specs as embody takes): each is built, and drawn once so its shaders are compiled
export async function prepare(specs, onProgress = () => {}) { await load(); T = three(); let done = 0;
  for (const spec of specs) { try { const M = modelOf({ ...spec, notes: spec.notes ?? (spec.look.type === 'clip' ? 1 : 0) }); M.pose(0); renderGroup(M.root, { w: 96, h: 96, view: [-3, -3, 3, 3] }); } catch (e) { console.error('gear3d', e); }
    onProgress(++done / specs.length); await new Promise((r) => setTimeout(r, 0)); } }
const still = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
// spec: { kind: 'wallet' | 'jacket', look, notes, name, sub, pinned(): is it kept open }. face: the drawn piece
// (it keeps its place and what it holds; its own drawing gives way to the body). el: the thing it is held as.
export function embody(el, face, spec) { if (typeof document === 'undefined') return; queue.push([el, face, spec, 0]); if (!busy) { busy = true; requestAnimationFrame(pump); } }
async function pump() {
  try { await load(); T = three(); } catch { queue.length = 0; busy = false; return; }
  const start = performance.now();
  while (queue.length && performance.now() - start < 14) { const job = queue.shift(), [el, face, spec] = job;
    if (!el.isConnected || !face.getBoundingClientRect().width) { if (++job[3] < 600) queue.push(job); break; } // not on the page yet: its turn comes round again
    try { dress(el, face, spec); } catch (e) { console.error('gear3d', spec.kind, e); } }
  if (queue.length) requestAnimationFrame(pump); else busy = false;
}
function dress(el, face, spec) {
  const M = modelOf(spec);
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
  face.style.setProperty('--g3-gutter', `${M.gutter || 0}px`);
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
