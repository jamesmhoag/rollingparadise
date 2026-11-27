// Wallets, jackets and drinks as bodies, made of the materials (ui/dice3d.js): the very material a die of it has, in the same
// room and light, on the piece's own form. Nothing here knows a material by name: a part is a shape, and what it is
// made of is whatever its look says (content/finishes.js), so any material a die can be, a wallet or a jacket can be,
// and tuning a material once tunes it everywhere.
//
//   sewn()    the one way a part gets its form: outlines (in the px of the piece's own drawing) made into one padded
//             surface, each panel swelling toward its middle and meeting the next in a seam (one panel: a pillow)
//   folding() a sheet folded along lines: a wallet is one sheet, and opening it unfolds it
//   turned()  a profile spun round its middle: a glass, a mug, a cup, and the drink that fills it
//   models    walletModel, jacketModel and drinkModel: the parts, and a pose (how far a wallet is unfolded)
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
//   face: which side swells ('front', 'back', 'both') · under: how far the other side swells · seam: how far a seam stands above the edge (0: a deep valley) ·
//   ripple(x, y): folds added to the swell · grooves: [{ pts, depth, width }] lines pressed into it ·
//   grain: tiles per px · cells: how finely it is modelled · smooth: how far the swell is smoothed over · slab: false
//   gives only the swelling face (a second surface over the same panels), not a closed body
// → { parts: [the geometries of each panel], zAt(x, y): the front surface there, zBack(x, y): the back }
// a surface from its points, their place in the grain, and its triangles
const surface = (pos, uvs, idx) => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2)); g.setIndex(idx); g.computeVertexNormals(); return g; };
const up = (pts) => pts.map(([x, y]) => [x, -y]);
// how far inside an outline a point is (less than 0: outside it)
const inside = (P) => (x, y) => { let inn = false, best = 1e9; for (let i = 0; i < P.length; i++) { const [ax, ay] = P[i], [bx, by] = P[(i + 1) % P.length];
  if ((ay > y) !== (by > y) && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inn = !inn;
  const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1))); best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy)); } return inn ? best : -best; };
const along = (P) => (x, y) => { let best = 1e9; for (let i = 0; i + 1 < P.length; i++) { const [ax, ay] = P[i], [bx, by] = P[i + 1], dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1))); best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy)); } return best; };
function sewn(panels, { depth = 3, puff = 2, bevel = 1, z = 0, face = 'front', round = null, seam = 0.5, ripple = null, grooves = [], grain = 0.04, cells = 42, smooth = 3, slab = true, under = 0 } = {}) {
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
  // the rim of an outline: its edge rounded over from one face to the other, in short lengths
  const rim = (P, most) => { const pts = [], area = P.reduce((t, [x, y], i) => t + x * P[(i + 1) % P.length][1] - P[(i + 1) % P.length][0] * y, 0), out = area > 0 ? 1 : -1;
    P.forEach(([ax, ay], i) => { const [bx, by] = P[(i + 1) % P.length], m = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / most)); for (let k = 0; k < m; k++) pts.push([ax + ((bx - ax) * k) / m, ay + ((by - ay) * k) / m]); });
    const A = 8, pos = [], uvs = [], idx = [], N = pts.length;
    pts.forEach(([x, y], i) => { const [px, py] = pts[(i + N - 1) % N], [qx, qy] = pts[(i + 1) % N], tx = qx - px, ty = qy - py, l = Math.hypot(tx, ty) || 1, nx2 = (out * ty) / l, ny2 = (-out * tx) / l;
      for (let a = 0; a <= A; a++) { const ang = (a / A - 0.5) * Math.PI, o = bevel * Math.cos(ang); pos.push(x + nx2 * o, y + ny2 * o, z + (a < A / 2 ? -1 : a > A / 2 ? 1 : 0) * (depth / 2) + bevel * Math.sin(ang)); uvs.push((x + y) * grain, (a / A) * grain * 4); } });
    for (let i = 0; i < N; i++) for (let a = 0; a < A; a++) { const p0 = i * (A + 1) + a, p1 = ((i + 1) % N) * (A + 1) + a; if (out > 0) idx.push(p0, p1, p0 + 1, p1, p1 + 1, p0 + 1); else idx.push(p0, p0 + 1, p1, p1, p0 + 1, p1 + 1); }
    return surface(pos, uvs, idx); };
  const step = Math.max(x1 - x0, y1 - y0) / cells, nx = Math.ceil((x1 - x0) / step), ny = Math.ceil((y1 - y0) / step), n = (nx + 1) * (ny + 1), D = new Float32Array(n), H = new Float32Array(n), ON = new Int8Array(n);
  const X = new Float32Array(n), Y = new Float32Array(n), at = (k) => [X[k], Y[k]]; // where grid point k is
  for (let k = 0; k < n; k++) { X[k] = x0 + (k % (nx + 1)) * step; Y[k] = y0 + Math.floor(k / (nx + 1)) * step; let r = read(X[k], Y[k]);
    // a point that falls beside a seam is moved onto it, so the seam runs clean through the surface and not in steps
    if (r.all > step && r.near >= 0 && Math.abs(r.off) < step * 0.5) { const f = sds[r.near], e = 0.2, gx = (f(X[k] + e, Y[k]) - f(X[k] - e, Y[k])) / (2 * e), gy = (f(X[k], Y[k] + e) - f(X[k], Y[k] - e)) / (2 * e), g2 = gx * gx + gy * gy || 1;
      X[k] -= (r.off * gx) / g2; Y[k] -= (r.off * gy) / g2; r = read(X[k], Y[k]); }
    // a point just outside the outline is drawn in onto it, so each face runs right out to its rim and nothing shows between
    if (r.all < 0 && r.all > -step * 1.5) { const f = (x, y) => Math.max(...sds.map((g) => g(x, y))), e = 0.2, gx = (f(X[k] + e, Y[k]) - f(X[k] - e, Y[k])) / (2 * e), gy = (f(X[k], Y[k] + e) - f(X[k], Y[k] - e)) / (2 * e), gl = Math.hypot(gx, gy) || 1;
      X[k] -= (r.all * gx) / gl; Y[k] -= (r.all * gy) / gl; const on = r.on; r = read(X[k], Y[k]); if (r.all < 0.05) r = { ...r, all: 0, h: 0, on: r.on < 0 ? on : r.on }; }
    D[k] = r.all; H[k] = r.h; ON[k] = r.on; }
  // smoothed over (the distance to an edge creases where two edges are as near: a pillow has no such creases), but never across a seam
  for (let pass = 0, B = new Float32Array(n); pass < smooth; pass++) { B.set(H);
    for (let j = 1; j < ny; j++) for (let i = 1; i < nx; i++) { const k = j * (nx + 1) + i; if (D[k] <= 0.05) continue; let t = 0, c = 0; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const q = k + a * (nx + 1) + b; if (ON[q] === ON[k]) { t += Math.max(0, B[q]); c++; } } H[k] = t / c; } }
  // one face of a panel: swelling, or flat (its edge rounded over either way)
  const dome = (side, on, swell) => { const pos = [], uvs = [], idx = [];
    for (let k = 0; k < n; k++) { const [x, y] = at(k), hgt = (swell || D[k] <= 0 ? H[k] : under * Math.min(1, D[k] / 6)) + 0.02; pos.push(x, y, side > 0 ? top + hgt : 2 * z - top - hgt); uvs.push(x * grain, y * grain); }
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; if (Math.min(D[a], D[b], D[c], D[d]) < 0) continue;
      const here = ON[a] === ON[b] && ON[b] === ON[c] && ON[c] === ON[d] ? ON[a] : read((X[a] + X[d]) / 2, (Y[a] + Y[d]) / 2).on; if (here !== on) continue; /* (a cell on a seam: whichever panel its middle is on) */ if (side > 0) idx.push(a, b, d, a, d, c); else idx.push(a, d, b, a, c, d); }
    if (!idx.length) return null;
    return surface(pos, uvs, idx); };
  // the body is closed all round: both faces, and a rounded rim along each panel's outline. Every part of it is made
  // of points close together, so the whole can be folded (see folding) without a face cutting across the fold.
  const swells = (side) => face === 'both' || (side > 0 ? face === 'front' : face === 'back');
  panels.forEach((p, i) => { for (const side of [1, -1]) { if (!slab && !swells(side)) continue; const g = dome(side, i, swells(side)); if (g) parts[i].push(g); } if (slab) parts[i].push(rim(Ps[i], step)); });
  const hAt = (x, y, side) => { const r = read(x, -y); return swells(side) || r.all <= 0 ? r.h : under * Math.min(1, r.all / 6); };
  return { parts, zAt: (x, y) => top + hAt(x, y, 1), zBack: (x, y) => 2 * z - top - hAt(x, y, -1) };
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
  const liningC = L.lining || shade(L.color, 0.3), sew = thread(L.color), r = L.round;
  const skin = (S) => part(S, L.mat, L.color), pocket = (S) => part(S, L.pocket.mat, L.pocket.color), lining = (S) => part(S, 'silk', liningC);
  // The sheet. Outside and lining are sewn together round the edge, so it is thin at its edge and swells from there:
  // well on the outside (the back of it as it lies open), a little on the inside; a valley where each fold will be.
  // Its inside lies at z 0.
  const sheet = (pts, valleys, o = {}) => soft(pts, { depth: 0.5, bevel: 0.55, z: -0.8, puff: 2.9, under: 0, face: 'back', round: 16, cells: 72, ripple: (x, y) => -valleys.reduce((t, [axis, at, wide]) => t + 3.1 * Math.exp(-((((axis === 'x' ? x : y) - at) / wide) ** 2)), 0), ...o });
  // a flat piece of something, lying at z
  const plate = (pts, z, thick = 0.3, o = {}) => soft(pts, { depth: thick, bevel: thick * 0.4, puff: 0, z, cells: 10, smooth: 0, ...o });
  const hem = (x0, x1, y, zAt, color) => stitches([[x0, y], [x1, y]], zAt, thread(color), { closed: false });
  const cash = (x, y, w) => { const g = new T.Group(); for (let i = 0; i < notes; i++) g.add(part(plate(rrect(x + i * 3, y + i * 1.3, w - i * 5, 30, 1.5), 0.55 + i * 0.3, 0.22), 'paper', NOTE_GREENS[i])); return g; };
  // the long pocket behind everything, for the cash: a piece of the lining from just under the top edge down, hemmed along its top
  const sleeve = (x, w, H, cells) => { const g = new T.Group(), P = plate(rrect(x, -H / 2 + 8, w, H - 10, 2), 0.95, 0.3, { cells }); g.add(lining(P), hem(x + 3, x + w - 3, -H / 2 + 10.4, P.zAt, liningC)); return g; };
  // card slots: pockets one over the next like shingles, each hemmed along its top, from `y` down to the leaf's foot
  const slots = (x, W, yFoot, y, n) => { const g = new T.Group(); for (let i = 0; i < n; i++) { const top = y + i * 11, S = soft(rrect(x + 3, top, W - 6, yFoot - 2 - top, [1.5, 1.5, 3, 3]), { depth: 0.3, bevel: 0.3, puff: 0.7, z: 1.5 + i * 0.75, round: 9, cells: 26 });
    g.add(pocket(S), hem(x + 6, x + W - 6, top + 2.2, S.zAt, L.pocket.color)); } return g; };
  if (L.type === 'clip') { const W = 150, H = 86, arm = H - 12, F = 17, wide = 20, top = -H / 2 + 2; // a strip bent back on itself: one arm under the wad, the bend at the top, the other arm over everything
    for (let i = 0; i < notes; i++) all.add(part(soft(rrect(-W / 2 + 2 + i * 1.5, -H / 2 + 16 + i * 2, W - 4 - i * 3, H - 16 - i * 3.5, 5), { depth: 0.8, puff: 0.9, bevel: 0.5, z: 1.9 + i * 1.5, face: 'both', cells: 24 }), 'paper', NOTE_GREENS[i]));
    all.add(skin(soft(rrect(-wide / 2, top - F - arm, wide, arm * 2 + F, [9, 9, 6, 6]), { depth: 1, bevel: 0.6, z: -1.1, puff: 0.5, face: 'back', round: 6, cells: 90 })));
    folding(all, [{ axis: 'y', from: -top, len: F, sign: 1 }])([Math.PI]);
    return { root, pose() {}, w: W, h: H, box: [-14, -20, W + 14, H + 14], over: [[W / 2 - wide / 2 + 0.5, -20, wide - 1, arm + 26]], rest: [0, 0], flat: true }; }
  if (L.type === 'clasped') { const W = 138, H = 92, wall = 46, Fb = 12, Ft = 23, fl = L.flap * 1.5 + 30, yTop = -H / 2 - Ft - fl, yEnd = H / 2 + Fb + wall, tip = Math.min(fl * 0.7, 34);
    const S = sheet(rrect(-W / 2, yTop, W, yEnd - yTop, [tip, tip, 3, 3]), [['y', H / 2 + Fb / 2, 6], ['y', -H / 2 - Ft / 2, 8]]); all.add(skin(S));
    if (L.stitch) all.add(stitches(rrect(-W / 2 + 2.6, yTop + 2.6, W - 5.2, yEnd - yTop - 5.2, [tip - 2, tip - 2, 2, 2]), S.zBack, sew, { under: true }));
    // inside: lined from the flap's tip to the wall's top, a hemmed pocket across the back for the cash, and slots for cards
    all.add(lining(plate(rrect(-W / 2 + 3, yTop + 3, W - 6, yEnd - yTop - 6, [tip - 2, tip - 2, 2, 2]), 0.15, 0.25, { cells: 70 })), cash(-W / 2 + 9, -H / 2 - 4, W - 18));
    all.add(sleeve(-W / 2 + 4, W - 8, H, 20));
    all.add(slots(-W / 2, W, H / 2, -H / 2 + 26, 2));
    const out = (y) => S.zBack(0, y) - 0.6, tipY = yTop + 10, studY = Math.min(yEnd - 12, yEnd - wall + fl - 10);
    if (L.clasp === 'zip') all.add(set(new T.BoxGeometry(W * 0.8, 2.6, 1.4), 'metal', METAL, 0, yTop + 4.5, out(yTop + 5)));
    else if (L.clasp === 'magnet') all.add(set(new T.BoxGeometry(14, 8, 2.4), 'metal', '#6a7386', 0, tipY, out(tipY) - 0.6));
    else if (L.clasp === 'snap') all.add(set(new T.SphereGeometry(4.6, 20, 12), 'metal', METAL, 0, tipY, out(tipY) - 0.4, [1, 1, 0.5]), set(new T.SphereGeometry(3.2, 16, 10), 'metal', '#8d95a6', 0, studY, out(studY), [1, 1, 0.4]));
    else for (let i = 0; i < 7; i++) { const a = (i / 6) * Math.PI, g = new T.TorusGeometry(3, 0.75, 8, 16); if (i % 2) g.rotateY(Math.PI / 2); g.rotateZ(0.3); all.add(set(g, 'metal', METAL, W / 2 + 4 + Math.sin(a) * 9, -H / 2 + 30 + i * 5, -3)); }
    const fold = folding(all, [{ axis: 'y', from: -H / 2, len: Fb, sign: -1 }, { axis: 'y', from: H / 2, len: Ft, sign: 1 }]);
    // the gussets: a pleat of the lining at each side, between the back and the wall folded up in front of it (set after the fold: they do not fold)
    const deep = (2 * Fb) / Math.PI; for (const sx of [1, -1]) for (const half of [0, 1]) { const g = new T.BoxGeometry(0.5, wall - 3, deep * 0.62); g.rotateY(sx * (half ? -0.6 : 0.6)); all.add(set(g, 'silk', liningC, sx * (W / 2 - 3.2), H / 2 - wall / 2 + 1, deep * (half ? 0.74 : 0.26))); }
    return { root, pose: (t) => fold([Math.PI, Math.PI * (1 - t) + 0.22 * t]), w: W, h: H, box: [-18, -Ft - fl - 16, W + 24, H + 18], over: [[0, H - wall + 1, W, wall]], rest: [10, -14], emblem: [12, 8] }; }
  // a billfold: the two leaves are one sheet, folded down its middle
  const W = 118, H = 92, F = 14, S = sheet(rrect(-W / 2, -H / 2, W * 2 + F, H, r), [['x', W / 2 + F / 2, 7]]); all.add(skin(S));
  if (L.stitch) all.add(stitches(rrect(-W / 2 + 2.6, -H / 2 + 2.6, W * 2 + F - 5.2, H - 5.2, Math.max(1, r - 2)), S.zBack, sew, { under: true }));
  // inside: lined all over; behind everything the long pocket for the cash, hemmed along its top; on each leaf three card slots
  all.add(lining(plate(rrect(-W / 2 + 3, -H / 2 + 3, W * 2 + F - 6, H - 6, Math.max(1, r - 2)), 0.15, 0.25, { cells: 80 })), cash(-W / 2 + 9, -H / 2 - 4, W - 18));
  all.add(sleeve(-W / 2 + 4, W * 2 + F - 8, H, 80));
  all.add(slots(-W / 2, W, H / 2, -H / 2 + 46, 3), slots(W / 2 + F, W, H / 2, -H / 2 + 46, 3));
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
  all.add(part(soft(torso.map(([x, y]) => [x * 0.9, y * 0.95]), { depth: 0.3, puff: 0, bevel: 0.1, z: -0.2, cells: 14, smooth: 0 }), L.mat, lining), part(soft(rrect(-1.8, 7.3 - CY, 3.6, 1.7, 0.3), { depth: 0.2, puff: 0, bevel: 0.08, z: 0.2, cells: 6, smooth: 0 }), 'paper', '#f1ede2'));
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
  else if (L.collar === 'hood') { all.add(part(soft(O(JACKET_CUT.hood), { ...G, cells: 40, depth: 1.6, puff: 2.6, bevel: 0.8, z: -1.2, face: 'both', round: 8 }), L.mat, L.color), part(soft(O(JACKET_CUT.hoodIn), { depth: 0.3, puff: 0, bevel: 0.1, z: 0.6, cells: 12, smooth: 0 }), L.mat, lining));
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

// ---------- a drink ----------
// The third way a part gets its form: turned. A profile ([radius, y] in the px of the piece's drawing, y down, from
// the foot up the outside) is spun round its middle: a glass, a mug, a cup, a saucer. turned() gives the vessel (its
// wall `wall` thick, hollow down to `floor`) and what fills it (to `fill` of its depth, 0 to 1), as two geometries.
const VESSELS = { // each: the outside from the foot to the lip · floor: where the hollow ends · wall: how thick it is
  tumbler: { out: [[0, 44], [9.4, 44], [10, 42.5], [12.6, 9]], floor: 40.5, wall: 0.9 },
  tall: { out: [[0, 44], [7.4, 44], [8, 42.5], [8.8, 28], [11.4, 5]], floor: 40.5, wall: 0.9 },
  mug: { out: [[0, 44], [10.4, 44], [11.2, 42.6], [11.4, 30], [11.2, 15]], floor: 41, wall: 1.5, handle: [12.6, 29, 6.2, 1.5] },
  cup: { out: [[0, 39.5], [5, 39.5], [6.4, 38.4], [11.6, 31], [13.6, 23.5]], floor: 37.4, wall: 1.2, handle: [13.4, 30.5, 3.6, 1], saucer: [[0, 43.4], [14.6, 42.6], [16.6, 40.6], [15.6, 40.2], [8, 41.4], [0, 41.4]] },
  goblet: { out: [[0, 44], [7.8, 44], [8.4, 43.2], [1.7, 41.6], [1.4, 31.5], [5.4, 27.6], [10.8, 19], [10.2, 6.5]], floor: 28.6, wall: 0.8 },
  coupe: { out: [[0, 44], [8.4, 44], [9, 43.2], [1.5, 41.6], [1.3, 26.5], [4.4, 23.4], [14.6, 13], [15.4, 10.6]], floor: 24.6, wall: 0.8 },
};
// a polyline with its corners eased (twice cut), ends kept
const eased = (pts, times = 2) => { let P = pts; for (let k = 0; k < times; k++) { const Q = [P[0]]; for (let i = 0; i + 1 < P.length; i++) { const [ax, ay] = P[i], [bx, by] = P[i + 1]; Q.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]); } Q.push(P[P.length - 1]); P = Q; } return P; };
const spun = (pts, CY, around = 48) => { const g = new T.LatheGeometry(pts.map(([r, y]) => new T.Vector2(Math.max(0, r), -(y - CY))), around); g.computeVertexNormals(); return g; };
function turned(V, fill, CY) {
  const out = eased(V.out), lip = out[out.length - 1], bowl = out.filter(([, y]) => y < V.floor - 0.4), rAt = (y) => { for (let i = 0; i + 1 < out.length; i++) { const [r0, y0] = out[i], [r1, y1] = out[i + 1]; if ((y - y0) * (y - y1) <= 0 && y0 !== y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0); } return lip[0]; };
  const inner = [...bowl.map(([r, y]) => [r - V.wall, y]).reverse(), [0, V.floor]], vessel = spun([...out, [lip[0] - V.wall * 0.5, lip[1] - V.wall * 0.5], ...inner], CY);
  const level = V.floor - Math.max(0, Math.min(1, fill)) * (V.floor - lip[1] - 3.2), body = bowl.filter(([, y]) => y > level).map(([r, y]) => [r - V.wall - 0.12, y]);
  const drink = fill > 0.01 ? spun([[0, V.floor - 0.12], ...body.reverse().map((p) => p).reverse().sort((a, b) => b[1] - a[1]), [rAt(level) - V.wall - 0.12, level], [(rAt(level) - V.wall) * 0.6, level + 0.25], [0, level + 0.3]], CY) : null;
  return { vessel, drink, level, rAt: (y) => rAt(y) - V.wall, lip };
}
// → the same shape of thing as a wallet or jacket model (see walletModel); it has no pose
function drinkModel(L, fill) {
  const W = 34, H = 46, CY = H / 2, UNIT = 1 / 18, root = new T.Group(), all = new T.Group(); all.scale.setScalar(UNIT); root.add(all);
  const V = VESSELS[L.vessel] || VESSELS.tumbler, B = turned(V, fill, CY), at = (m, x, y, z = 0) => { m.position.set(x, -(y - CY), z); return m; };
  // what is in it first (it is seen through the vessel): the drink, a second colour floating on it, its head, ice, fizz, a light
  if (B.drink) { all.add(body(B.drink, L.liquid.mat, L.liquid.color));
    const r = B.rAt(B.level) - 0.3;
    if (L.liquid.top) { const g = new T.CylinderGeometry(r, B.rAt(B.level + 5) - 0.3, 5, 40); all.add(at(body(g, 'cream', L.liquid.top), 0, B.level + 2.6)); }
    if (L.foam) { const g = new T.SphereGeometry(r, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1, 0.3 + L.foam * 0.5, 1); all.add(at(body(g, 'cream', '#fffaf0'), 0, B.level + 0.2));
      for (let i = 0; i < 9; i++) { const a = i * 2.4, q = r * (0.25 + 0.6 * ((i * 37) % 10) / 10); all.add(at(body(new T.SphereGeometry(1 + (i % 3) * 0.5, 12, 8), 'cream', '#ffffff'), Math.cos(a) * q, B.level - 0.5 - L.foam * 1.5, Math.sin(a) * q)); } }
    for (let i = 0; i < L.ice; i++) { const g = new T.BoxGeometry(5, 5, 5, 2, 2, 2), a = i * 2.2 + 0.4, q = Math.min(r - 3.6, 3.4); g.rotateX(0.5 + i); g.rotateY(0.7 * i + 0.3); all.add(at(body(g, 'plastic', '#eef8ff'), Math.cos(a) * q, B.level + 0.6 + (i % 2) * 2.4, Math.sin(a) * q)); } // (ice is solid to the eye: nothing clear shows inside a clear drink)
    if (L.bubbles) { const m = new T.MeshBasicMaterial({ color: 0xffffff }); for (let i = 0; i < 26; i++) { const y = B.level + 1 + ((i * 53) % 100) / 100 * (V.floor - B.level - 2), a = i * 1.9, q = (B.rAt(y) - 1) * (0.2 + 0.75 * ((i * 29) % 10) / 10), b = new T.Mesh(new T.SphereGeometry(0.24 + (i % 3) * 0.12, 8, 6), m); all.add(at(b, Math.cos(a) * q, y, Math.sin(a) * q)); } }
    if (L.glow) { const m = (op, k) => new T.MeshBasicMaterial({ color: new T.Color(L.liquid.color).lerp(new T.Color(0xffffff), k), opacity: op, alphaHash: op < 1 }); for (const [rad, op, k] of [[1.6, 1, 0.9], [2.8, 0.45, 0.5], [4.2, 0.2, 0.3]]) all.add(at(new T.Mesh(new T.SphereGeometry(rad, 16, 12), m(op, k)), 0, (B.level + V.floor) / 2 + 1)); } }
  // then the vessel round it, and what is fixed to the vessel
  all.add(body(B.vessel, L.mat, L.color, true));
  if (L.rim) { const g = new T.TorusGeometry(B.lip[0] - V.wall * 0.25, V.wall * 0.62, 10, 48); g.rotateX(Math.PI / 2); all.add(at(body(g, L.rim.mat, L.rim.color), 0, B.lip[1])); }
  if (V.handle) { const [x, y, rad, thick] = V.handle, g = new T.TorusGeometry(rad, thick, 10, 28, Math.PI * 1.15); g.rotateZ(-Math.PI * 0.575); all.add(at(body(g, L.mat, L.color, true), x - 1.2, y)); }
  if (V.saucer) all.add(body(spun(eased(V.saucer, 1), CY), L.mat, L.color, true));
  if (L.straw) { const len = H - 10, g = new T.CylinderGeometry(0.85, 0.85, len, 14); g.rotateZ(-0.22); all.add(at(body(g, 'plastic', L.straw), 2.6, V.floor - 2 - len * 0.5 * Math.cos(0.22), -1)); }
  const rimX = B.lip[0] - 1, rimY = B.lip[1];
  if (L.garnish === 'cherry') all.add(at(body(new T.SphereGeometry(2.5, 20, 14), 'plastic', '#d21f3c'), rimX - 1.2, rimY - 1.2, 1), at(body(new T.CylinderGeometry(0.18, 0.18, 6, 6).rotateZ(0.5), 'plastic', '#5a3a1e'), rimX - 2.6, rimY - 5, 1));
  if (L.garnish === 'slice') { const g = new T.CylinderGeometry(4.6, 4.6, 0.9, 28), rind = new T.TorusGeometry(4.6, 0.5, 8, 28); g.rotateX(Math.PI / 2); g.rotateY(0.5); rind.rotateY(0.5); all.add(at(body(g, 'plastic', lighter(/^#[0-9a-f]{6}$/i.test(L.liquid.color) ? L.liquid.color : '#ffb347', 0.35)), rimX, rimY - 1), at(body(rind, 'plastic', '#f08a1c'), rimX, rimY - 1)); }
  if (L.garnish === 'umbrella') { const cone = new T.ConeGeometry(7.5, 3.4, 10, 1, true), pick = new T.CylinderGeometry(0.25, 0.25, 15, 6); for (const g of [cone, pick]) g.rotateZ(-0.45); all.add(at(body(cone, 'paper', '#ff5fa8'), rimX - 1.5, rimY - 9.5), at(body(pick, 'bone', '#e8d9b0'), rimX - 4.6, rimY - 3.2)); }
  return { root, pose() {}, w: W, h: H, unit: UNIT, box: [-10, -14, W + 10, H + 6], over: [], rest: [-15, -18] };
}

// ---------- on the element ----------
const MODELS = new Map(), queue = []; let busy = false;
const modelOf = (spec) => { const key = `${spec.kind}|${JSON.stringify(spec.look)}|${spec.notes || 0}`; if (!MODELS.has(key)) MODELS.set(key, spec.kind === 'wallet' ? walletModel(spec.look, spec.notes || 0) : spec.kind === 'drink' ? drinkModel(spec.look, (spec.notes || 0) / 100) : jacketModel(spec.look)); return MODELS.get(key); };
// make these ready ahead of being shown (specs as embody takes): each is built, and drawn once so its shaders are compiled
export async function prepare(specs, onProgress = () => {}) { await load(); T = three(); let done = 0;
  for (const spec of specs) { try { const M = modelOf({ ...spec, notes: spec.notes ?? (spec.kind === 'drink' ? 100 : spec.look.type === 'clip' ? 1 : 0) }); M.pose(0); renderGroup(M.root, { w: 96, h: 96, view: [-3, -3, 3, 3] }); } catch (e) { console.error('gear3d', e); }
    onProgress(++done / specs.length); await new Promise((r) => setTimeout(r, 0)); } }
const still = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
// spec: { kind: 'wallet' | 'jacket' | 'drink', look, notes (a wallet's cash notes; how full a drink is, of 100), name, sub,
// pinned(): is it kept open }. face: the drawn piece
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
  const u = M.unit || U, view = [(bx0 - M.w / 2) * u, -(by1 - M.h / 2) * u, (bx1 - M.w / 2) * u, -(by0 - M.h / 2) * u];
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
  el.addEventListener('pointerenter', () => { st.hover = true; aim(); }); el.addEventListener('pointerleave', () => { st.hover = false; st.lean = null; aim(); if (spec.kind !== 'wallet') draw(); });
  el.addEventListener('click', () => requestAnimationFrame(aim));
  // a jacket or a drink turns toward the pointer on it, as a card leans
  if (spec.kind !== 'wallet') el.addEventListener('pointermove', (ev) => { const r = el.getBoundingClientRect(); if (!r.width || still()) return; const x = (ev.clientX - r.left) / r.width - 0.5, y = (ev.clientY - r.top) / r.height - 0.5;
    st.lean = [-y * 30, x * 44]; cancelAnimationFrame(st.raf); st.raf = requestAnimationFrame(draw); }, { passive: true });
  // in the hand (ui/spin.js): the body itself, turned freely
  el._look = (least) => { const size = Math.max(least, 250), half = (Math.max(M.w, M.h) * 0.62 + 10) * u, px = Math.round(size * Math.min(2, devicePixelRatio || 1)), cv = document.createElement('canvas'); cv.width = cv.height = px; Object.assign(cv.style, { width: `${size}px`, height: `${size}px` });
    const cx = cv.getContext('2d'), wrap = document.createElement('div'); wrap.className = 'g3-look'; wrap.append(cv); let R = new DOMMatrix();
    return { el: wrap, size, name: spec.name, sub: spec.sub, start: new DOMMatrix().rotateSelf(-10, 24, 0), get matrix() { return R; },
      setRotation(m) { R = m; M.pose(0); cx.clearRect(0, 0, px, px); cx.drawImage(renderGroup(M.root, { w: px, h: px, view: [-half, -half, half, half], turn: m }), 0, 0); } }; };
  aim(); draw();
}
