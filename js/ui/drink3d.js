// A drink as a body: its vessel turned on a lathe (a rounded lip, a thick glass base, a ceramic foot with its hollow
// underneath), what is in it, what is on it and in it, and how it lives: fizz rising, ice bobbing, the surface keeping
// level as the glass is turned and sloshing when it moves, a hot drink's steam rising and lingering where it rose
// when the cup moves on, every colour flowing through a chromatic drink with sparks drifting in it.
// Its look (content/finishes.js drinkLook) is made in Build mode's Gear maker. Units are the px of a drink's drawing
// (y down, 34 × 46), scaled into the room by UNIT; the model has no pose. → see drinkModel.
import { three, body, vesselBody } from './dice3d.js';

let T = null;
const W = 34, H = 46, CY = H / 2, UNIT = 1 / 18;
// each: the outside from the foot to the lip (y down) · floor: where the hollow ends · wall: how thick it is ·
// handle: 'mug' or 'cup' · saucer: the saucer's profile (center underneath, out, round its rim, and back across its top)
const VESSELS = {
  tumbler: { out: [[0, 44], [9.4, 44], [10.1, 43.3], [10.5, 42], [12.6, 9]], floor: 39.6, wall: 1.05 },
  tall: { out: [[0, 44], [7.4, 44], [8.1, 43.3], [8.4, 42], [8.8, 28], [11.4, 5]], floor: 40, wall: 1 },
  mug: { out: [[0, 42.9], [8.6, 42.9], [9.2, 43.8], [10.4, 44], [11.2, 43], [11.4, 30], [11.2, 15]], floor: 40.8, wall: 1.5, handle: 'mug' },
  cup: { out: [[0, 41.2], [3.7, 41.2], [4.2, 41.9], [5.5, 41.9], [6.7, 40.7], [11.6, 33.3], [13.6, 25.9]], floor: 39.6, wall: 1.15, handle: 'cup',
    saucer: [[0, 42.8], [6.1, 42.8], [6.5, 43.6], [7.6, 43.7], [14.6, 42.7], [16.4, 41.1], [16.6, 40.4], [16.1, 40.1], [15.3, 40.4], [9.2, 41.5], [7.4, 41.95], [0, 41.95]] },
  goblet: { out: [[0, 44], [7.8, 44], [8.4, 43.2], [1.8, 41.6], [1.4, 31.5], [5.4, 27.6], [10.8, 19], [10.2, 6.5]], floor: 28.6, wall: 0.85 },
  coupe: { out: [[0, 44], [8.4, 44], [9, 43.2], [1.6, 41.6], [1.3, 26.5], [4.4, 23.4], [14.6, 13], [15.4, 10.6]], floor: 24.6, wall: 0.85 },
  martini: { out: [[0, 44], [8.4, 44], [9, 43.2], [1.6, 41.6], [1.2, 25], [2.4, 23.6], [16, 8]], floor: 23.2, wall: 0.85 },
  shot: { out: [[0, 44], [6.6, 44], [7.1, 43.3], [7.4, 40], [8.6, 21]], floor: 38.6, wall: 1.15 },
};
// a polyline with its corners eased (cut again each time), ends kept
const eased = (pts, times = 3) => { let P = pts; for (let k = 0; k < times; k++) { const Q = [P[0]]; for (let i = 0; i + 1 < P.length; i++) { const [ax, ay] = P[i], [bx, by] = P[i + 1]; Q.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]); } Q.push(P[P.length - 1]); P = Q; } return P; };
const spun = (pts, around = 96) => { const g = new T.LatheGeometry(pts.map(([r, y]) => new T.Vector2(Math.max(0, r), -(y - CY))), around); g.computeVertexNormals(); return g; };
const at = (m, x, y, z = 0) => { m.position.set(x, -(y - CY), z); return m; };
const radiusAt = (out) => (y) => { for (let i = 0; i + 1 < out.length; i++) { const [r0, y0] = out[i], [r1, y1] = out[i + 1]; if ((y - y0) * (y - y1) <= 0 && y0 !== y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0); } return out[out.length - 1][0]; };
// the vessel as one turned body: the outside up to the lip, rounded over the lip, and down the inside to its floor; and
// the drink filling it to its level, its top a shallow meniscus
function turned(V, fill) {
  const out = eased(V.out), lip = out[out.length - 1], rOut = radiusAt(out), bowl = out.filter(([, y]) => y < V.floor - 0.4);
  const half = V.wall / 2, roll = Array.from({ length: 9 }, (_, i) => { const a = (i / 8) * Math.PI; return [lip[0] - half + Math.cos(a) * half, lip[1] - Math.sin(a) * half * 0.9]; });
  const inner = [...bowl.map(([r, y]) => [Math.max(0.2, r - V.wall), y]).reverse(), [0, V.floor]];
  const vessel = spun([...out, ...roll.slice(1), ...inner.slice(1)]);
  const rIn = (y) => rOut(y) - V.wall, level = V.floor - Math.max(0, Math.min(1, fill)) * (V.floor - lip[1] - 3.2);
  const side = bowl.filter(([, y]) => y > level).map(([r, y]) => [Math.max(0.1, r - V.wall - 0.12), y]).sort((a, b) => b[1] - a[1]);
  const drink = fill > 0.01 ? spun([[0, V.floor - 0.12], ...side, [rIn(level) - 0.12, level], [rIn(level) * 0.82, level + 0.18], [rIn(level) * 0.4, level + 0.28], [0, level + 0.3]]) : null;
  return { vessel, outside: spun(out), drink, level, rIn, rOut, lip };
}
// a box with its edges and corners rounded (an ice cube)
function roundedBox(s, r, seg = 4) {
  const g = new T.BoxGeometry(s, s, s, seg * 2, seg * 2, seg * 2), P = g.attributes.position, h = s / 2 - r, v = new T.Vector3(), c = new T.Vector3();
  for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); c.set(Math.max(-h, Math.min(h, v.x)), Math.max(-h, Math.min(h, v.y)), Math.max(-h, Math.min(h, v.z))); v.sub(c).normalize().multiplyScalar(r).add(c); P.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return g;
}
// a curve as a tube (a handle, a pick)
const tube = (pts, rad, seg = 64) => new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(([x, y, z = 0]) => new T.Vector3(x, -(y - CY), z)), false, 'centripetal'), seg, rad, 14, false);
// the cut face of a slice of fruit: its segments, pith and rind
function fruitFace(flesh, rind) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d'), m = 64;
  c.fillStyle = rind; c.beginPath(); c.arc(m, m, 63, 0, 7); c.fill(); c.fillStyle = '#fbf6e4'; c.beginPath(); c.arc(m, m, 56, 0, 7); c.fill();
  for (let i = 0; i < 10; i++) { const a0 = (i / 10) * Math.PI * 2 + 0.05, a1 = ((i + 1) / 10) * Math.PI * 2 - 0.05; c.fillStyle = flesh; c.beginPath(); c.moveTo(m + Math.cos((a0 + a1) / 2) * 6, m + Math.sin((a0 + a1) / 2) * 6); c.arc(m, m, 52, a0, a1); c.closePath(); c.fill(); }
  c.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 40; i++) { const a = i * 2.4, q = 14 + (i * 7) % 34; c.fillRect(m + Math.cos(a) * q, m + Math.sin(a) * q, 2, 4); }
  const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; return t;
}
const FRUIT = { lemon: ['#ffe45c', '#f2c200'], lime: ['#a7e26a', '#3c9a2e'], orange: ['#ffad45', '#f07a12'] };
// a soft round puff, for steam
let PUFF = null;
function puffTex() {
  if (PUFF) return PUFF; const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d'), g = c.createRadialGradient(32, 32, 2, 32, 32, 31);
  g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(0.45, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  PUFF = new T.CanvasTexture(cv); return PUFF;
}
const flip = () => new T.Matrix4().makeScale(1, -1, 1);
// the turn a picture is drawn at (a DOMMatrix, as renderGroup takes it), as the model's own matrix
const turnOf = (m) => flip().multiply(new T.Matrix4().fromArray((m || new DOMMatrix()).toFloat64Array())).multiply(flip());

// → { root, pose(), w, h, unit, box, over, rest, state(), frame(state, dt, turn) }: frame lays the drink's life (its slosh,
// its fizz, its steam: in `state`, one for each place it is shown) over the model before a picture of it is drawn
export function drinkModel(L, fill) {
  T = three(); const root = new T.Group(), all = new T.Group(); all.scale.setScalar(UNIT); root.add(all);
  const V = VESSELS[L.vessel] || VESSELS.tumbler, B = turned(V, fill), full = !!B.drink, lipR = B.lip[0], lipY = B.lip[1], level = B.level;
  const clear = full && L.liquid.mat === 'liquid';
  const live = { ice: [], bob: [], top: [] }; let flow = null, bubbles = null, sparks = null, surface = null;
  // ---- what is in it (seen through the vessel) ----
  if (full) {
    const drink = body(B.drink, L.liquid.mat, L.liquid.color); all.add(drink);
    drink.traverse((m) => { if (m.material?.userData?.chromatic) flow = m.material; });
    // the surface: the vertices at the top, kept as made so a tilt can be laid over them
    const P = B.drink.attributes.position, top = -(level + 0.32 - CY), idx = []; for (let i = 0; i < P.count; i++) if (P.getY(i) >= top) idx.push(i);
    surface = { P, idx, base: Float32Array.from(idx.flatMap((i) => [P.getX(i), P.getY(i), P.getZ(i)])) };
    const r = B.rIn(level) - 0.4;
    if (L.liquid.top) { const g = new T.CylinderGeometry(r, B.rIn(level + 4) - 0.4, 4, 64); const m = at(body(g, 'cream', L.liquid.top), 0, level + 2.1); all.add(m); live.top.push(m); }
    if (L.foam) { const g = new T.SphereGeometry(r, 48, 12, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1, 0.25 + L.foam * 0.45, 1); const m = at(body(g, 'cream', '#fffaf0'), 0, level + 0.2); all.add(m); live.top.push(m);
      for (let i = 0; i < 11; i++) { const a = i * 2.4, q = r * (0.2 + 0.65 * ((i * 37) % 10) / 10), b = at(body(new T.SphereGeometry(0.9 + (i % 3) * 0.45, 14, 10), 'cream', '#ffffff'), Math.cos(a) * q, level - 0.4 - L.foam * 1.4, Math.sin(a) * q); all.add(b); live.top.push(b); } }
    // ice: rounded cubes, clear and crazed (seen through, the drink round them),
    const iceTint = '#' + new T.Color(L.liquid.mat === 'liquid' ? L.liquid.color : '#bfe6ff').lerp(new T.Color('#dff4ff'), 0.45).getHexString(); // (floating, their tops just out of the drink)
    for (let i = 0; i < L.ice; i++) { const s = Math.min(5.4, r * 0.75), g = roundedBox(s, s * 0.22); g.rotateX(0.35 + i * 0.9); g.rotateY(0.6 * i + 0.3);
      const a = i * 2.3 + 0.4, q = Math.max(0, Math.min(r - s * 0.7, r * 0.45)), m = at(body(g, 'ice', iceTint), Math.cos(a) * q, level + s * 0.25 + (i % 2) * s * 0.55, Math.sin(a) * q); all.add(m); live.ice.push({ m, y: m.position.y, ph: i * 1.7 }); }
    // a shot glass sunk in it, of another drink (its glass is seen by its lip: the drink in it shows through the one round it)
    if (L.inner && V.floor - lipY > 14) { const k = Math.min(0.5, (B.rIn(V.floor - 3) - 0.6) / 8.6), S = VESSELS.shot, I = turned(S, 0.85), g = new T.Group();
      const lipRing = new T.TorusGeometry(I.lip[0] - S.wall / 2, S.wall * 0.55, 10, 48); lipRing.rotateX(Math.PI / 2); g.add(body(I.drink, 'syrup', L.inner.color), at(body(lipRing, 'ice', '#e6f6ff'), 0, I.lip[1])); g.scale.setScalar(k); g.position.set(0, -(V.floor - CY) + (44 - CY) * k, 0); all.add(g); }
    // fizz: bubbles rising from the floor (each drawn where its state puts it)
    if (L.fizz) { bubbles = new T.InstancedMesh(new T.SphereGeometry(1, 10, 8), new T.MeshStandardMaterial({ color: 0xf6fcff, roughness: 0.05, metalness: 0.4, emissive: 0x6c7c8c }), 34); bubbles.frustumCulled = false; all.add(bubbles); }
    // sparks of every colour, drifting round in it
    if (L.sparkle) { sparks = new T.InstancedMesh(new T.OctahedronGeometry(1.05), new T.MeshBasicMaterial({ color: 0xffffff }), 46); sparks.frustumCulled = false;
      for (let i = 0; i < 46; i++) sparks.setColorAt(i, new T.Color().setHSL((i * 0.137) % 1, 1, 0.68)); all.add(sparks); }
    if (L.glow) { const m = (op, k) => new T.MeshBasicMaterial({ color: new T.Color(L.liquid.color).lerp(new T.Color(0xffffff), k), opacity: op, alphaHash: op < 1 });
      for (const [rad, op, k] of [[1.4, 1, 0.9], [2.5, 0.45, 0.5], [3.8, 0.2, 0.3]]) all.add(at(new T.Mesh(new T.SphereGeometry(rad, 18, 12), m(op, k)), 0, (level + V.floor) / 2 + 1)); }
    // a toy in it: a starfish on the floor, a diver in the middle, a duck on the surface
    if (L.toy) all.add(toy(L, V, B, live));
  }
  // ---- the vessel, and what is fixed to it ----
  all.add(vesselBody(B.vessel, L.mat, L.color, clear, B.outside));
  if (L.rim) { const g = new T.TorusGeometry(lipR - V.wall * 0.5, V.wall * 0.56, 12, 96); g.rotateX(Math.PI / 2); all.add(at(body(g, L.rim.mat, L.rim.color), 0, lipY + 0.6)); }
  if (L.crust) all.add(crust(L.crust, lipR, lipY, V.wall));
  if (V.handle) all.add(vesselBody(handle(V.handle, B), L.mat, L.color, false));
  if (V.saucer) all.add(vesselBody(spun(eased(V.saucer, 2)), L.mat, L.color, false));
  if (L.straw) { const len = H - 8, g = new T.CylinderGeometry(0.85, 0.85, len, 20); g.rotateZ(-0.24); all.add(at(body(g, 'plastic', L.straw), lipR * 0.3, V.floor - 2 - len * 0.5 * Math.cos(0.24), -1.2)); }
  if (L.garnish) all.add(garnish(L, V, B, fill));
  const box = [-12, L.steam ? -40 : L.garnish === 'umbrella' ? -24 : -14, W + 12, H + 6];
  // ---- its life ----
  const state = () => ({ t: Math.random() * 10, s: [0, 0], v: [0, 0], bub: [], puffs: [], last: null, spawn: 0 });
  const inv = new T.Matrix4(), up = new T.Vector3(), dummy = new T.Object3D();
  function frame(S, dt, turn) {
    dt = Math.min(0.1, dt); S.t += dt; const M = turnOf(turn); inv.copy(M).invert();
    // the surface keeps level in the room: the glass's turn tilts it against the glass, and a change of turn sets it rocking
    up.set(0, 1, 0).transformDirection(inv); const tx = Math.max(-0.4, Math.min(0.4, -up.x / Math.max(0.3, up.y))), tz = Math.max(-0.4, Math.min(0.4, -up.z / Math.max(0.3, up.y)));
    if (L.slosh) { if (dt > 0) for (let k = 0; k < 2; k++) { const want = k ? tz : tx; S.v[k] += ((want - S.s[k]) * 70 - S.v[k] * 3.2) * dt; S.s[k] += S.v[k] * dt; } else if (!S.set) { S.s = [tx, tz]; S.set = true; } } else S.s = [tx, tz];
    const ripple = (x, z) => (L.fizz ? 0.12 : 0.05) * Math.sin(S.t * 2.6 + x * 0.6) * Math.cos(S.t * 2.1 + z * 0.5);
    if (surface) { const { P, idx, base } = surface; idx.forEach((i, n) => { const x = base[n * 3], z = base[n * 3 + 2]; P.setY(i, base[n * 3 + 1] + S.s[0] * x + S.s[1] * z + ripple(x, z)); }); P.needsUpdate = true; B.drink.computeVertexNormals(); }
    // (what floats on it tilts with it: a head of foam sits on the surface, not through it)
    for (const m of live.top) { m.rotation.set(-Math.atan(S.s[1]), 0, Math.atan(S.s[0])); }
    for (const c of live.ice) { const lift = Math.sin(S.t * 1.3 + c.ph) * 0.35; c.m.position.y = c.y + lift + S.s[0] * c.m.position.x + S.s[1] * c.m.position.z; c.m.rotation.y += dt * 0.08; }
    for (const b of live.bob) b(S, dt);
    // a chromatic drink: white, then a tint rising through it, then white again, the tint a new colour each time round
    if (flow) { const w = 0.5 - 0.5 * Math.cos(S.t * 1.15), hue = (S.t * 0.05 + (S.hue ??= Math.random())) % 1, tint = new T.Color().setHSL(hue, 0.95, 0.56);
      flow.color.set(0xffffff).lerp(tint, w * 0.92); flow.emissive.set(0xffffff).lerp(tint, w).multiplyScalar(0.55 + 0.45 * w); flow.sheenColor.set(0xffffff).lerp(tint, 0.5 * w); }
    if (bubbles) { const list = S.bub; while (list.length < 34) list.push(newBubble(list.length === 0 ? 0 : Math.random()));
      list.forEach((q, i) => { q.y -= q.v * dt; q.x += Math.sin(S.t * 3 + q.ph) * dt * 0.6; if (q.y < level + 0.6) Object.assign(q, newBubble(0)); const R = Math.max(0.5, B.rIn(q.y) - 1.2), d = Math.hypot(q.x, q.z); if (d > R) { q.x *= R / d; q.z *= R / d; }
        dummy.position.set(q.x, -(q.y - CY), q.z); dummy.scale.setScalar(q.s); dummy.updateMatrix(); bubbles.setMatrixAt(i, dummy.matrix); }); bubbles.instanceMatrix.needsUpdate = true; }
    if (sparks) { for (let i = 0; i < 46; i++) { const a = S.t * (0.25 + (i % 5) * 0.06) + i * 2.4, y = level + 1.5 + (((i * 0.618 + S.t * 0.05) % 1) * (V.floor - level - 2.5)), R = Math.max(0.5, B.rIn(y) - 1.5) * (0.3 + ((i * 37) % 10) / 14);
      dummy.position.set(Math.cos(a) * R, -(y - CY), Math.sin(a) * R); dummy.rotation.set(S.t + i, S.t * 0.7, 0); dummy.scale.setScalar(0.45 + 0.55 * Math.abs(Math.sin(S.t * 3 + i))); dummy.updateMatrix(); sparks.setMatrixAt(i, dummy.matrix); } sparks.instanceMatrix.needsUpdate = true; }
    if (L.steam && full) steam(S, dt, M, inv);
  }
  const newBubble = (y0) => { const y = V.floor - 1 - y0 * (V.floor - level - 2), a = Math.random() * 7, q = Math.random() * Math.max(0.5, B.rIn(y) - 1.5); return { x: Math.cos(a) * q, z: Math.sin(a) * q, y, v: 5 + Math.random() * 7, s: 0.22 + Math.random() * 0.3, ph: Math.random() * 7 }; };
  // steam: puffs rise from the surface and drift in the room, not with the cup: turned away, the cup leaves them behind
  const puffs = new T.Group(); root.add(puffs); const mat = new T.SpriteMaterial({ map: puffTex(), color: 0xffffff, transparent: true, depthWrite: false, opacity: 0 });
  const wv = new T.Vector3();
  function steam(S, dt, M, invM) {
    S.spawn -= dt; if (S.spawn <= 0 && S.puffs.length < 22) { S.spawn = 0.16 + Math.random() * 0.1; const a = Math.random() * 7, q = Math.random() * (B.rIn(level) - 2);
      wv.set(Math.cos(a) * q * UNIT, -(level - 1 - CY) * UNIT, Math.sin(a) * q * UNIT).applyMatrix4(M); S.puffs.push({ p: wv.clone(), age: 0, life: 2.6 + Math.random() * 1.4, dx: (Math.random() - 0.5) * 0.12, sp: new T.Sprite(mat.clone()) }); }
    for (const f of S.puffs) { f.age += dt; f.p.y += dt * 0.32; f.p.x += f.dx * dt + Math.sin((f.age + f.dx * 40) * 2) * dt * 0.05; }
    S.puffs = S.puffs.filter((f) => f.age < f.life);
    puffs.clear(); for (const f of S.puffs) { const k = f.age / f.life; f.sp.position.copy(f.p).applyMatrix4(invM); f.sp.scale.setScalar(0.25 + k * 0.9); f.sp.material.opacity = Math.sin(Math.PI * Math.min(1, k * 1.2)) * 0.5; puffs.add(f.sp); }
  }
  return { root, pose() {}, w: W, h: H, unit: UNIT, box, over: [], rest: [-14, -16], live: !!(L.fizz || L.sparkle || L.steam || flow || (L.slosh && full) || live.bob.length), state, frame };
}
// a handle: a mug's a D from just under the lip to near the foot; a teacup's loops out from under its lip and down,
// and curls back in to meet the cup near its base
function handle(kind, B) {
  const r = (y) => B.rOut(y);
  if (kind === 'mug') { const a = 19, b = 37; return tube([[r(a) - 0.8, a], [r(a) + 3.6, a - 1.1], [r(a) + 7.2, a + 3.2], [r(a) + 7.4, b - 4.5], [r(b) + 3.4, b + 0.6], [r(b) - 0.8, b]], 1.5); }
  const a = 28.8, b = 37.6;
  return tube([[r(a) - 0.6, a], [r(a) + 2.8, a - 1.5], [r(a) + 5.6, a + 1.2], [r(a) + 5, a + 5.2], [r(b) + 3.4, b - 2.2], [r(b) - 0.2, b - 0.8], [r(b) + 1.1, b + 1.1], [r(b) + 2.5, b + 0.2], [r(b) + 1.8, b - 0.9]], 0.95, 96);
}
// salt, sugar or chili crusted round the lip, inside and out
function crust(kind, R, y, wall) {
  const n = 760, g = new T.InstancedMesh(new T.BoxGeometry(0.4, 0.4, 0.4), new T.MeshStandardMaterial({ roughness: kind === 'sugar' ? 0.1 : 0.55, metalness: kind === 'sugar' ? 0.3 : 0 }), n), d = new T.Object3D();
  const col = { salt: ['#ffffff', '#eef2f6'], sugar: ['#fffdf5', '#fff3c4'], chili: ['#d8341f', '#ff7a2e'] }[kind];
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, out = (Math.random() - 0.35) * wall * 2.4, down = Math.random() ** 1.6 * 2.6;
    d.position.set(Math.cos(a) * (R - wall / 2 + out), -(y + down - 0.2 - CY), Math.sin(a) * (R - wall / 2 + out)); d.rotation.set(Math.random() * 3, Math.random() * 3, 0); d.scale.setScalar(0.5 + Math.random() * 0.9); d.updateMatrix();
    g.setMatrixAt(i, d.matrix); g.setColorAt(i, new T.Color(col[i % 2])); }
  g.frustumCulled = false; return g;
}
// on the rim, or in the drink: a cherry, a paper umbrella on its pick, a slice of fruit, an olive on a pick, mint
function garnish(L, V, B, fill) {
  const g = new T.Group(), R = B.lip[0], y = B.lip[1], dip = B.drink ? B.level + 4 : V.floor - 3;
  const pointTo = (m, from, to) => { const d = new T.Vector3(to[0] - from[0], -(to[1] - from[1]), (to[2] || 0) - (from[2] || 0)).normalize(); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d); m.position.set(from[0], -(from[1] - CY), from[2] || 0); return m; };
  if (L.garnish === 'cherry') g.add(at(body(new T.SphereGeometry(2.4, 28, 20), 'plastic', '#d21f3c'), R - 1.6, y - 1.4, 1.2), at(body(tube([[R - 1.6, y - 3.4], [R - 2.4, y - 6], [R - 4.4, y - 7.6]], 0.2, 24), 'plastic', '#5a3a1e'), 0, CY));
  if (L.garnish === 'umbrella') {
    // the canopy, a cone of paper with its ribs underneath, on a pick that goes down through the lip into the drink
    const u = new T.Group(), cone = new T.ConeGeometry(7.2, 3, 24, 1, true); cone.translate(0, -1.5, 0);
    const paper = body(cone, 'paper', L.garnishColor); paper.traverse((m) => { if (m.material) m.material.side = T.DoubleSide; }); u.add(paper);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, rib = new T.CylinderGeometry(0.12, 0.12, 7.4, 5); rib.translate(0, 3.7, 0); const m = body(rib, 'bone', '#e8d9b0'); m.rotation.set(0, -a, Math.PI / 2 + 0.38); m.position.y = -0.2; u.add(m); }
    const apex = [R * 0.62, y - 8, 0.8], foot = [R * 0.18, dip, 0], len = Math.hypot(apex[0] - foot[0], apex[1] - foot[1]) + 1, pick = new T.CylinderGeometry(0.24, 0.24, len, 10); pick.translate(0, -len / 2, 0); u.add(body(pick, 'bone', '#e8d9b0'), body(new T.SphereGeometry(0.45, 10, 8), 'bone', '#e8d9b0'));
    pointTo(u, apex, [2 * apex[0] - foot[0], 2 * apex[1] - foot[1], 2 * apex[2] - foot[2]]); g.add(u);
  }
  if (FRUIT[L.garnish]) { const [flesh, rindC] = FRUIT[L.garnish], tex = fruitFace(flesh, rindC), disc = new T.CylinderGeometry(4.6, 4.6, 0.8, 48);
    const faceM = new T.MeshPhysicalMaterial({ map: tex, roughness: 0.35, clearcoat: 0.6, sheen: 0.3 }), rindM = new T.MeshPhysicalMaterial({ color: rindC, roughness: 0.45, clearcoat: 0.4 });
    const m = new T.Mesh(disc, [rindM, faceM, faceM]); m.rotation.set(Math.PI / 2, 0, 0.5); m.rotateX(0); at(m, R - 0.5, y - 1.2, 0); m.rotation.y = 0.5; g.add(m); }
  if (L.garnish === 'olive') { const o = new T.Group(), ol = new T.SphereGeometry(2, 24, 18); ol.scale(1, 1.3, 1); o.add(body(ol, 'plastic', '#6f8f2e')); const pim = at(body(new T.SphereGeometry(0.8, 14, 10), 'plastic', '#d8341f'), 0, CY - 2.45); o.add(pim);
    const len = dip - y + 12, pick = new T.CylinderGeometry(0.2, 0.2, len, 8); pick.translate(0, len * 0.35, 0); o.add(body(pick, 'metal', '#d9d4c8')); pointTo(o, [R * 0.3, (dip + y) / 2 + 2, 0], [R * 0.9, y - 9, 0]); g.add(o); }
  if (L.garnish === 'mint') for (let i = 0; i < 6; i++) { const leaf = new T.SphereGeometry(2, 16, 10); leaf.scale(1, 0.25, 0.55); const m = at(body(leaf, 'velvet', i % 2 ? '#3fae4a' : '#58c95f'), R * 0.35 + Math.cos(i * 1.7) * 2, y - 1.5 - (i % 3) * 1.2, Math.sin(i * 1.7) * 2); m.rotation.set(i, i * 0.7, 0.6 + i * 0.3); g.add(m); }
  void fill; return g;
}
// a toy in the drink: a starfish lying on the floor, a scuba diver hanging in the middle, a rubber duck afloat
function toy(L, V, B, live) {
  const g = new T.Group(), c = L.toyColor, level = B.level;
  if (L.toy === 'starfish') { const s = new T.Shape(); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 1.7 : 4.2; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const geo = new T.ExtrudeGeometry(s, { depth: 0.6, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.5, bevelSegments: 4, curveSegments: 6 }); geo.rotateX(-Math.PI / 2);
    const m = body(geo, 'plastic', c), k = Math.min(1, (B.rIn(V.floor - 1.5) - 0.5) / 4.6); m.scale.setScalar(Math.max(0.35, k)); at(m, 0.5, V.floor - 1.3, 0.4); m.rotation.z = 0.25; g.add(m); }
  if (L.toy === 'diver') { const d = new T.Group(), suit = '#1d2230', skin = '#f1c29a';
    d.add(at(body(new T.CapsuleGeometry(1.5, 3.4, 6, 16), 'vinyl', suit), 0, CY), at(body(new T.SphereGeometry(1.4, 18, 14), 'plastic', skin), 0, CY - 3.4));
    const mask = new T.BoxGeometry(2.2, 1, 0.9); d.add(at(body(mask, 'glass', '#7fd8ff'), 0, CY - 3.5, 1.1)); const tank = new T.CylinderGeometry(0.9, 0.9, 3.6, 16); d.add(at(body(tank, 'metal', c), 0, CY - 0.3, -1.5));
    for (const sx of [-1, 1]) { const fl = new T.BoxGeometry(1.3, 0.3, 2.6); d.add(at(body(fl, 'vinyl', c), sx * 0.8, CY + 3.6, 0.8)); }
    const k = Math.min(1, (B.rIn((level + V.floor) / 2) - 0.6) / 4); d.scale.setScalar(Math.max(0.4, k)); const y0 = (level + V.floor) / 2; at(d, 0, y0); d.rotation.z = 0.5; g.add(d);
    live.bob.push((S) => { d.position.y = -(y0 - CY) + Math.sin(S.t * 0.9) * 0.9; d.rotation.y = Math.sin(S.t * 0.35) * 0.9; }); }
  if (L.toy === 'duck') { const d = new T.Group(); const bd = new T.SphereGeometry(2.6, 24, 16); bd.scale(1.25, 0.8, 1); d.add(body(bd, 'vinyl', c)); d.add(at(body(new T.SphereGeometry(1.6, 20, 14), 'vinyl', c), 1.8, CY - 2.6));
    const beak = new T.ConeGeometry(0.6, 1.6, 12); beak.rotateZ(-Math.PI / 2); d.add(at(body(beak, 'vinyl', '#ff8a1c'), 3.7, CY - 2.5)); for (const z of [-0.8, 0.8]) d.add(at(body(new T.SphereGeometry(0.26, 8, 6), 'plastic', '#111111'), 2.9, CY - 3.1, z));
    const k = Math.min(1, (B.rIn(level) - 0.6) / 4.2); d.scale.setScalar(Math.max(0.4, k)); at(d, 0, level - 0.2); g.add(d);
    live.bob.push((S) => { d.position.y = -(level - 0.2 - CY) + Math.sin(S.t * 1.6) * 0.3 + S.s[0] * d.position.x; d.rotation.set(-Math.atan(S.s[1]), S.t * 0.15, Math.atan(S.s[0])); }); }
  return g;
}
