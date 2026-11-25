// A die as a real 3D solid: one CSS face per face of the die, each showing that face's value, dressed in the die's
// material (the .m-* skins in style.css). Used to grab and spin any die (spin.js) and for thrown dice in a match.
// Geometry is plain maths: each solid is its vertices and the outward normals of its faces; a face is the vertices
// that lie furthest along its normal, in order around it.
import { h } from './core.js';
import { facesOf, faceValue, matOf } from '../dice.js';
import { dieStyle } from './parts.js';

const PHI = (1 + Math.sqrt(5)) / 2;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const signs = (xs) => xs.reduce((out, x) => out.flatMap((v) => (x === 0 ? [[...v, 0]] : [[...v, x], [...v, -x]])), [[]]);
const perms = (v) => [[v[0], v[1], v[2]], [v[1], v[2], v[0]], [v[2], v[0], v[1]]];
const cyc = (a, b, c) => perms([a, b, c]).flatMap((p) => signs(p));
const uniq = (vs) => vs.filter((v, i) => vs.findIndex((w) => len(sub(v, w)) < 1e-6) === i);

// faces from normals: the vertices furthest along each normal, sorted around it
function byNormals(verts, normals) {
  return normals.map((n0) => { const n = norm(n0), best = Math.max(...verts.map((v) => dot(v, n)));
    const fs = verts.filter((v) => dot(v, n) > best - 1e-6), c = fs.reduce((a, v) => [a[0] + v[0] / fs.length, a[1] + v[1] / fs.length, a[2] + v[2] / fs.length], [0, 0, 0]);
    const u = norm(sub(fs[0], c)), w = cross(n, u);
    return { n, pts: fs.sort((a, b) => Math.atan2(dot(sub(a, c), w), dot(sub(a, c), u)) - Math.atan2(dot(sub(b, c), w), dot(sub(b, c), u))) }; });
}
// the pentagonal trapezohedron (d10): two rings of five, offset, closed by an apex above and below
function d10() {
  const z0 = 0.105, ring = (k, z, off) => [Math.cos((k * 72 + off) * Math.PI / 180), Math.sin((k * 72 + off) * Math.PI / 180), z];
  const U = (k) => ring(k % 5, z0, 0), L = (k) => ring(k % 5, -z0, 36);
  // the apex height that keeps each kite flat
  const flat = (hgt) => dot(cross(sub(U(0), [0, 0, hgt]), sub(L(0), [0, 0, hgt])), sub(U(1), [0, 0, hgt]));
  let lo = 0.2, hi = 5; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; (flat(lo) > 0) === (flat(m) > 0) ? (lo = m) : (hi = m); }
  const T = [0, 0, lo], B = [0, 0, -lo], out = [];
  for (let k = 0; k < 5; k++) { out.push([T, U(k), L(k), U(k + 1)]); out.push([B, L(k), U(k + 1), L(k + 1)]); }
  return out.map((pts) => { const c = pts.reduce((a, v) => [a[0] + v[0] / 4, a[1] + v[1] / 4, a[2] + v[2] / 4], [0, 0, 0]); let n = norm(cross(sub(pts[1], pts[0]), sub(pts[2], pts[0])));
    if (dot(n, c) < 0) { n = n.map((x) => -x); pts = [...pts].reverse(); } return { n, pts }; });
}
const GEO = {};
// a die type's faces ({ n: outward normal, pts: corners in order }), unit circumradius, in CSS's axes (x right, y down, z toward you)
export function geometry(type) {
  if (GEO[type]) return GEO[type];
  const tet = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
  const ico = uniq(cyc(0, 1, PHI)), dod = uniq([...signs([1, 1, 1]), ...cyc(0, 1 / PHI, PHI)]);
  const make = {
    d4: () => byNormals(tet, tet.map((v) => v.map((x) => -x))),
    d6: () => byNormals(signs([1, 1, 1]), uniq(cyc(1, 0, 0))),
    d8: () => byNormals(uniq(cyc(1, 0, 0)), signs([1, 1, 1])),
    d10: d10,
    d12: () => byNormals(dod, uniq(cyc(0, PHI, 1))), // each solid's faces point at the corners of its dual
    d20: () => byNormals(ico, uniq([...signs([1, 1, 1]), ...cyc(0, PHI, 1 / PHI)])),
  }[type] || (() => byNormals(signs([1, 1, 1]), uniq(cyc(1, 0, 0))));
  const faces = make(), r = Math.max(...faces.flatMap((f) => f.pts.map(len)));
  GEO[type] = faces.map((f) => ({ n: f.n, pts: f.pts.map((p) => p.map((x) => x / r)) })); // unit circumradius
  return GEO[type];
}

// Build a die's solid, `size` px across. Returns { el, setRotation(m), faceFront(i) } where m is a DOMMatrix.
// `values` overrides the faces' labels (a thrown die whose roll changed its value shows that value).
export function solidEl(d, size = 120, values) {
  const geo = geometry(d.type), R = size / 2, fs = facesOf(d), labels = values || fs.map(faceValue);
  const rot = h('div', { class: 'solid-rot' });
  const el = h('div', { class: `solid ${d.type} m-${matOf(d)}`, style: { ...dieStyle(d), width: size + 'px', height: size + 'px', '--fs': `${Math.max(9, Math.round(size / (geo.length > 12 ? 7.5 : geo.length > 8 ? 6 : 4.4)))}px` } }, rot);
  const faceEls = geo.map((f, i) => {
    const pts = f.pts.map((p) => p.map((x) => x * R)), c = pts.reduce((a, v) => [a[0] + v[0] / pts.length, a[1] + v[1] / pts.length, a[2] + v[2] / pts.length], [0, 0, 0]);
    // the face's own axes: u along it, v across it (u × v = the outward normal, as CSS expects)
    const n = f.n, top = Math.abs(n[1]) > 0.9 ? [0, 0, -1] : [0, -1, 0], u = norm(cross(n, top)), v = cross(n, u);
    const p2 = pts.map((p) => [dot(sub(p, c), u), dot(sub(p, c), v)]), minX = Math.min(...p2.map((p) => p[0])), minY = Math.min(...p2.map((p) => p[1]));
    const w = Math.max(...p2.map((p) => p[0])) - minX, hh = Math.max(...p2.map((p) => p[1])) - minY;
    const t = [c[0] + minX * u[0] + minY * v[0], c[1] + minX * u[1] + minY * v[1], c[2] + minX * u[2] + minY * v[2]]; // the face's top-left corner
    const val = labels[i % labels.length], txt = String(val ?? '');
    const fe = h('div', { class: 'sface', style: { width: w + 'px', height: hh + 'px', transform: `matrix3d(${[...u, 0, ...v, 0, ...n, 0, ...t, 1].map((x) => +x.toFixed(4)).join(',')})`,
      clipPath: `polygon(${p2.map((p) => `${(p[0] - minX).toFixed(2)}px ${(p[1] - minY).toFixed(2)}px`).join(',')})` } },
    h('b', { class: txt === '6' || txt === '9' ? 'ul' : null, style: { left: -minX + 'px', top: -minY + 'px' }, text: txt }));
    fe._n = n; fe._v = v; rot.append(fe); return fe;
  });
  const light = norm([-0.45, -0.65, 0.75]);
  let m = new DOMMatrix(), live = null; // the die drawn for real (dice3d.js) over the CSS faces, once the renderer is up
  if (typeof document !== 'undefined') import('./dice3d.js').then((M3) => { live = M3.live(el, d, labels, size); live.draw(m); }).catch(() => {});
  function setRotation(next) {
    m = next; rot.style.transform = m.toString(); live?.draw(m);
    for (const fe of faceEls) { const n = fe._n, p = m.transformPoint(new DOMPoint(n[0], n[1], n[2], 0)); fe.style.filter = `brightness(${(0.62 + 0.5 * Math.max(0, dot([p.x, p.y, p.z], light))).toFixed(3)})`; }
  }
  // the rotation that turns face i toward the viewer, upright
  const turn = (a, b, fb = [0, 1, 0]) => { // the shortest rotation taking unit vector a onto unit vector b
    let axis = cross(a, b); const s = len(axis), cos = dot(a, b);
    if (s < 1e-6) return cos > 0 ? new DOMMatrix() : new DOMMatrix().rotateAxisAngleSelf(fb[0], fb[1], fb[2], 180);
    axis = norm(axis); return new DOMMatrix().rotateAxisAngleSelf(axis[0], axis[1], axis[2], Math.atan2(s, cos) * 180 / Math.PI); };
  const apply = (M, a) => { const p = M.transformPoint(new DOMPoint(a[0], a[1], a[2], 0)); return [p.x, p.y, p.z]; };
  function faceFront(i) {
    const fe = faceEls[i % faceEls.length], M = turn(fe._n, [0, 0, 1]), v = norm(apply(M, fe._v));
    return turn(v, [0, 1, 0], [0, 0, 1]).multiply(M); // then spin it about the view so its number stands upright
  }
  // the face (index) whose value is `v`, if the die has one
  const faceOf = (v) => labels.findIndex((x) => String(x) === String(v));
  setRotation(m);
  return { el, setRotation, faceFront, faceOf, get matrix() { return m; } };
}
