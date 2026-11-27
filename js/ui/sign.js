// Neon signs. Each Roller's seat at the table, and the House's sign, is a neon sign built from a sign spec.
//
// One light for everything. Every tube, lamp, symbol and crown on a sign is lit the same way: a soft halo in its glow
// colour (blurred along the tube's own path, so a wavy tube glows wavy), the tube in its colour, and a hot white-ish
// core down its middle. Every motion moves that same light: a chase is a brighter stretch of the same tube running
// round it (and round again, without a seam), a breath dims and lifts all of it, a swap trades its colours, a
// twinkle flickers it lamp by lamp.
//
//   border, more     the frame's colour pairs ([tube, glow]): the border, then up to two more. Plain, wavy and
//                    zigzag frames run one tube per pair, nested; a gradient runs every colour round one tube;
//                    stripes, checks and lamps take turns in them; a twist braids one strand per pair
//   frame            FRAMES: tubes (plain, wave, zigzag, gradient), strips (striped, checkered, twist) or lamps
//                    (dashed, dotted, bulbs, or symbols: the edge symbol all the way round), or none
//   motion           MOTIONS: chase, breathe, swap, twinkle or still
//   edge, edgeAt     a symbol (symbols.js, or any character) at the corners or along the top and bottom. Where one
//                    sits the frame stops short of it, its tube ending round before it and starting again after
//   symbol           { on, id, motion }: a large symbol at the end of the name, the name's last letter just over it
//   crown            { level 1-4 } (set by the table, not stored): a High Roller's crown, tilted off the first letter,
//                    grander floor by floor; also the crown you wear once you have claimed one
//   name, cls        [tube, glow] for the script name and the class under it
//   nameFont, clsFont which of the game's three faces each line wears (SIGN_FONTS): script, display (capitals) or
//                    lines (capitals in parallel lines, like ROLLING on the title sign). Name in script and class in
//                    display unless set; either can wear any of them
//   blinks           { part: { on, pattern } } for the name, class, border, edge, symbol and crown: each part can
//                    blink on its own, in its own pattern (BLINKS)
//   mount            what the sign hangs on: a backing colour and an optional image (any URL or data: URL)
//
// Where a crown or a symbol meets the letters, its tube stops short of them with a rounded end, as a real sign's tube
// does where it passes behind another, and picks up again on the far side. Every motion is slow and soft (well under
// three changes a second, never fully dark) and all of them stop for players who ask their system for reduced motion.
import * as D from '../data.js';
import { SYMBOLS, symbolOf, CROWNS } from './symbols.js';

export const TUBES = ['plain', 'wave', 'zigzag', 'gradient'];
export const STRIPS = ['striped', 'checkered', 'twist'];
export const LAMPS = ['dashed', 'dotted', 'bulbs', 'symbols'];
export const FRAMES = [...TUBES, ...STRIPS, ...LAMPS, 'none'];
export const MOTIONS = ['chase', 'breathe', 'swap', 'twinkle', 'still'];
export const EDGE_AT = ['none', 'corners', 'top', 'bottom', 'edge']; // edge: the top and the bottom
export const CLS_ALIGN = ['right', 'left', 'center'];
export const SIGN_FONTS = ['script', 'display', 'lines']; // --script, --display, --lines in style.css
export const FONT_DEFAULT = { nameFont: 'script', clsFont: 'display' };
export const BLINK_PARTS = ['name', 'cls', 'border', 'edge', 'symbol', 'crown'];
export const BLINKS = ['breathe', 'pulse', 'flicker', 'alternate'];
export const MAX_PAIRS = 3;
const PARTS = ['border', 'name', 'cls'];
const OWN_MOTION = ['striped', 'checkered', 'gradient']; // frames whose chase is their own pattern moving
export const BASE_SIGN = { frame: 'plain', motion: 'chase', radius: 12, more: [], edge: 'star5', edgeAt: 'none', symbol: { on: false, id: 'star5', motion: 'breathe' }, mount: { color: '', image: '' }, blinks: {} };
const OLD_FRAMES = { tube: ['plain', 0], double: ['plain', 1], triple: ['plain', 2], rope: ['twist', 1] };

// the sign a Roller (or the House) shows: the base, then the shared look for its side, then its own
export function signOf(who, own) {
  const side = D.NEON[who] || D.NEON.them, out = { ...BASE_SIGN, ...side, ...(own || {}) };
  out.mount = { ...BASE_SIGN.mount, ...(side.mount || {}), ...(own?.mount || {}) };
  out.symbol = { ...BASE_SIGN.symbol, ...(side.symbol || {}), ...(own?.symbol || {}) };
  for (const p of PARTS) out[p] = (own?.[p] || side[p] || D.NEON.them[p]).slice(0, 2);
  // signs saved before: double and triple tubes are more tube pairs now, a rope is a twist, one blinking part is a toggle
  if (OLD_FRAMES[out.frame]) { const [f, extra] = OLD_FRAMES[out.frame]; out.frame = f; if (!(own?.more || side.more)?.length) out.more = Array.from({ length: extra }, (_, i) => (i % 2 ? out.border : [out.border[1], out.border[0]])); }
  for (const k of ['nameFont', 'clsFont']) if (!SIGN_FONTS.includes(out[k])) out[k] = FONT_DEFAULT[k];
  if (!FRAMES.includes(out.frame)) out.frame = 'plain'; if (!MOTIONS.includes(out.motion)) out.motion = 'chase';
  out.more = (out.more || []).filter((p) => Array.isArray(p) && p.length === 2).slice(0, MAX_PAIRS - 1);
  out.blinks = { ...(side.blinks || {}), ...(own?.blinks || {}) };
  const old = own?.blink || side.blink; if (old?.part && old.part !== 'none' && !Object.keys(out.blinks).length) out.blinks = { [old.part]: { on: true, pattern: old.pattern || 'breathe' } };
  out.edge = symbolOf(out.edge) || [...(out.edge || '')][0] || 'star5';
  out.symbol.id = symbolOf(out.symbol.id) || 'star5'; if (!MOTIONS.includes(out.symbol.motion)) out.symbol.motion = 'breathe';
  return out;
}
export const pairsOf = (spec) => [spec.border, ...(spec.more || [])].slice(0, MAX_PAIRS);
const safeUrl = (u) => (/^(https?:|data:image\/|assets\/)/.test(u || '') ? `url("${String(u).replace(/"/g, '%22')}")` : '');

// ---------- colour ----------
const hex = (c) => { const m = /^#?([0-9a-f]{6})$/i.exec(c || ''); return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : [255, 255, 255]; };
const mix = (a, b, t) => { const x = hex(a), y = hex(b); return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`; };
const hot = (c) => mix(c, '#ffffff', 0.55);

// ---------- SVG ----------
const NS = 'http://www.w3.org/2000/svg';
const mk = (tag, attrs = {}, kids = []) => { const el = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v); for (const c of kids) el.append(c); return el; };
let uid = 0;
const still = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches; // no motion asked for
function defsFor(svg) { const id = `ns${++uid}`, blur = mk('filter', { id: `${id}b`, x: '-50%', y: '-50%', width: '200%', height: '200%' }, [mk('feGaussianBlur', { stdDeviation: '2.6' })]);
  const defs = mk('defs', {}, [blur]); svg.append(defs); return { id, defs, blur: `url(#${id}b)` }; }
// one light: halo, tube, hot core, all along the same path. kind 'stroke' for a tube, 'fill' for a lamp (a dot).
function light(parent, ctx, d, core, glow, o = {}) {
  const w = o.w ?? 2.4, g = mk('g', { class: `lt ${o.cls || ''}` });
  if (o.fill) {
    g.append(mk('path', { d, fill: glow, opacity: 0.75, filter: ctx.blur, class: 'halo' }), mk('path', { d, fill: core, class: 'tube' }), ...(o.hotD ? [mk('path', { d: o.hotD, fill: hot(core), class: 'hot' })] : []));
  } else {
    const base = { d, fill: 'none', 'stroke-linecap': o.cap || 'round', 'stroke-linejoin': 'round', ...(o.dash ? { 'stroke-dasharray': o.dash } : {}), ...(o.offset != null ? { 'stroke-dashoffset': o.offset } : {}) };
    g.append(mk('path', { ...base, stroke: glow, 'stroke-width': w + 5, opacity: o.dim ? 0.3 : 0.6, filter: ctx.blur, class: 'halo' }));
    if (!o.haloOnly) g.append(mk('path', { ...base, stroke: core, 'stroke-width': w, opacity: o.dim ? 0.45 : 1, class: 'tube' }),
      mk('path', { ...base, stroke: hot(core), 'stroke-width': Math.max(0.7, w * 0.36), opacity: o.dim ? 0.3 : 0.9, class: 'hot' }));
  }
  if (o.style) for (const [k, v] of Object.entries(o.style)) g.style.setProperty(k, v);
  parent.append(g); return g;
}
const dotD = (x, y, r) => `M${(x - r).toFixed(2)} ${y.toFixed(2)}a${r} ${r} 0 1 0 ${(2 * r).toFixed(2)} 0a${r} ${r} 0 1 0 ${(-2 * r).toFixed(2)} 0Z`;

// ---------- the frame's geometry: a rounded rectangle, walked by distance ----------
function outline(w, h, r) {
  r = Math.max(0, Math.min(r, w / 2 - 1, h / 2 - 1)); const a = Math.PI * r / 2;
  const segs = [['line', r, 0, w - r, 0], ['arc', w - r, r, -Math.PI / 2], ['line', w, r, w, h - r], ['arc', w - r, h - r, 0], ['line', w - r, h, r, h], ['arc', r, h - r, Math.PI / 2], ['line', 0, h - r, 0, r], ['arc', r, r, Math.PI]];
  const lens = segs.map((sg) => (sg[0] === 'line' ? Math.hypot(sg[3] - sg[1], sg[4] - sg[2]) : a)), L = lens.reduce((x, y) => x + y, 0);
  const starts = lens.map((_, i) => lens.slice(0, i).reduce((x, y) => x + y, 0));
  const at = (s) => { s = ((s % L) + L) % L; for (let i = 0; i < segs.length; i++) { if (s <= lens[i] + 1e-9 || i === segs.length - 1) { const sg = segs[i], f = lens[i] ? Math.min(1, s / lens[i]) : 0;
    if (sg[0] === 'line') return { x: sg[1] + (sg[3] - sg[1]) * f, y: sg[2] + (sg[4] - sg[2]) * f, a: Math.atan2(sg[4] - sg[2], sg[3] - sg[1]) };
    const t0 = sg[3] + f * Math.PI / 2; return { x: sg[1] + r * Math.cos(t0), y: sg[2] + r * Math.sin(t0), a: t0 + Math.PI / 2 }; } s -= lens[i]; } };
  return { L, at, r, starts, lens, mids: [1, 3, 5, 7].map((i) => starts[i] + lens[i] / 2) };
}
// a point s along the outline, pushed off it by `off` (outward positive)
const off = (o, s, k) => { const p = o.at(s); return { x: p.x + Math.sin(p.a) * k, y: p.y - Math.cos(p.a) * k, a: p.a }; };
// a stretch of the outline [s0, s1], pushed off by f(s), as a path
function trace(o, s0, s1, f, step = 1.5, closed = false) {
  const n = Math.max(2, Math.ceil((s1 - s0) / step)), pts = [];
  for (let i = 0; i <= n; i++) { const s = s0 + ((s1 - s0) * i) / n, p = off(o, s, f(s)); pts.push(`${p.x.toFixed(2)} ${p.y.toFixed(2)}`); }
  return `M${pts.join('L')}${closed ? 'Z' : ''}`;
}
// the stretches of the loop the frame is drawn along: all of it, or what is left between the symbols on it
function runsOf(L, gaps) {
  if (!gaps.length) return [[0, L, true]];
  const g = gaps.map(([a, b]) => [((a % L) + L) % L, ((a % L) + L) % L + (b - a)]).sort((x, y) => x[0] - y[0]), out = [];
  for (let i = 0; i < g.length; i++) { const end = g[i][1], next = i + 1 < g.length ? g[i + 1][0] : g[0][0] + L; if (next - end > 3) out.push([end, next, false]); }
  return out;
}
const tri = (s, p) => { const x = s / p; return 4 * Math.abs(x - Math.floor(x + 0.5)) - 1; }; // -1..1, sharp

// ---------- a symbol, lit: a path in a 24 (or crown 28 x 24) box placed at x, y, sized k, turned deg, and cut short
// (with rounded ends) where it would cross any of `avoid` (boxes the tube passes behind)
function sampleSub(svg, d) { const p = mk('path', { d }); svg.append(p); let L = 0; try { L = p.getTotalLength(); } catch { L = 0; } const pts = []; for (let s = 0; s <= L; s += 0.6) { const q = p.getPointAtLength(s); pts.push([q.x, q.y]); } p.remove(); return pts; }
export function litSymbol(parent, ctx, sym, place, core, glow, o = {}) {
  const S = typeof sym === 'string' ? SYMBOLS[sym] : sym, g = mk('g', { class: `sym ${o.cls || ''}` }); parent.append(g); if (!S) return g;
  const M = new DOMMatrix().translate(place.x, place.y).rotate(place.deg || 0).scale(place.k).translate(-(place.cx ?? 12), -(place.cy ?? 12));
  const avoid = o.avoid || [], inside = (x, y) => avoid.some((b) => x > b.l && x < b.r && y > b.t && y < b.b), w = o.w ?? 2.2, trim = w / 2 + 1.2;
  const runs = [];
  for (const sub of S.d.split(/(?=M)/).filter(Boolean)) {
    const pts = sampleSub(ctx.svg, sub).map(([x, y]) => { const q = M.transformPoint(new DOMPoint(x, y)); return [q.x, q.y]; });
    if (!avoid.length) { runs.push({ pts, closed: /Z\s*$/i.test(sub) }); continue; }
    let cur = []; for (const p of pts) { if (inside(p[0], p[1])) { if (cur.length) runs.push({ pts: cur, cut: true }); cur = []; } else cur.push(p); } if (cur.length) runs.push({ pts: cur, cut: true });
  }
  for (const run of runs) {
    let pts = run.pts;
    if (run.cut) { const len = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]); let k = 0, acc = 0; while (k < pts.length - 1 && acc < trim) { acc += len(pts[k], pts[k + 1]); k++; } let j = pts.length - 1; acc = 0; while (j > k && acc < trim) { acc += len(pts[j], pts[j - 1]); j--; } pts = pts.slice(k, j + 1); }
    if (pts.length < 3) continue;
    if (o.sep) g.append(mk('path', { d: `M${pts.map((p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join('L')}${run.closed ? 'Z' : ''}`, fill: 'none', stroke: o.sep, 'stroke-width': w + 4.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', class: 'sep' }));
    light(g, ctx, `M${pts.map((p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join('L')}${run.closed ? 'Z' : ''}`, core, glow, { w, style: { '--i': g.childElementCount } });
  }
  for (const [x, y] of S.dots || []) { const q = M.transformPoint(new DOMPoint(x, y)); if (inside(q.x, q.y)) continue; const r = Math.max(1.1, 1.3 * place.k); if (o.sep) g.append(mk('path', { d: dotD(q.x, q.y, r + 1.8), fill: o.sep, class: 'sep' })); light(g, ctx, dotD(q.x, q.y, r), core, glow, { fill: true, hotD: dotD(q.x, q.y, r * 0.45) }); }
  return g;
}
// a character that is not one of the drawn symbols: set as text, lit the same way
function litChar(parent, ctx, ch, x, y, size, core, glow) {
  const g = mk('g', { class: 'sym' }); parent.append(g);
  const t = (attrs) => { const e = mk('text', { x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': size, ...attrs }); e.textContent = `${ch}︎`; return e; };
  g.append(t({ fill: glow, opacity: 0.7, filter: ctx.blur, class: 'halo' }), t({ fill: core, class: 'tube' }), t({ fill: 'none', stroke: hot(core), 'stroke-width': 0.5, class: 'hot' })); return g;
}
const glyph = (parent, ctx, g, p, size, core, glow) => (SYMBOLS[g] ? litSymbol(parent, ctx, g, { x: p.x, y: p.y, k: size / 24 }, core, glow, { w: 1.8 }) : litChar(parent, ctx, g, p.x, p.y, size, core, glow));

// ---------- the frame ----------
function drawFrame(svg, spec, w, h, who) {
  svg.replaceChildren(); if (w < 8 || h < 8) return;
  const ctx = defsFor(svg); ctx.svg = svg;
  const pad = 3, W = w - pad * 2, H = h - pad * 2, o = outline(W, H, Math.max(0, +spec.radius || 0)), frame = spec.frame, pairs = pairsOf(spec), N = pairs.length;
  svg.setAttribute('viewBox', `${-pad} ${-pad} ${w} ${h}`);
  const lights = mk('g', { class: 'lights' }); svg.append(lights);
  // the symbols on the edge, and the gaps the frame leaves for them
  const marks = [], G = 7.5; // a symbol's half-width on the edge
  if (frame === 'symbols') { const n = Math.max(6, Math.round(o.L / 17)); for (let i = 0; i < n; i++) marks.push((i / n) * o.L); }
  else if (frame !== 'none' && spec.edgeAt === 'corners') marks.push(...o.mids);
  else if (frame !== 'none' && ['edge', 'top', 'bottom'].includes(spec.edgeAt)) { for (const seg of spec.edgeAt === 'top' ? [0] : spec.edgeAt === 'bottom' ? [4] : [0, 4]) { const n = Math.max(2, Math.floor(o.lens[seg] / 18)); for (let i = 0; i < n; i++) marks.push(o.starts[seg] + (o.lens[seg] * (i + 0.5)) / n); } }
  const runs = frame === 'symbols' ? [] : runsOf(o.L, marks.map((s) => [s - G, s + G]));
  const body = mk('g', { class: 'frame-body' }); lights.append(body);
  const spots = []; // paths a chase runs along: [d, core, glow, total length of its loop, where this stretch starts in it]
  const runLen = (r) => r[1] - r[0];
  // tubes: one per colour pair, nested a little inside each other
  if (frame === 'plain' || frame === 'wave' || frame === 'zigzag') pairs.forEach(([core, glow], i) => {
    const k = -i * 3.8, f = frame === 'wave' ? (s) => k + 2.2 * Math.sin((2 * Math.PI * s) / 15) : frame === 'zigzag' ? (s) => k + 2.4 * tri(s, 10) : () => k;
    for (const r of runs) { const d = trace(o, r[0], r[1], f, frame === 'zigzag' ? 2.5 : 1.5, r[2]); light(body, ctx, d, core, glow, { cls: `tube-${i}` }); spots.push([d, core, glow, i]); }
  });
  if (frame === 'gradient') { // every colour round one tube, turning slowly
    const gid = `${ctx.id}g`, hid = `${ctx.id}h`, cores = pairs.map((p) => p[0]), glows = pairs.map((p) => p[1]);
    const grad = (id, cs) => mk('linearGradient', { id, gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: W, y2: H }, [...[...cs, ...cs.slice(0, 1)].map((c, i, all) => mk('stop', { offset: (i / (all.length - 1)).toFixed(3), 'stop-color': c })),
      ...(still() ? [] : [mk('animateTransform', { attributeName: 'gradientTransform', type: 'rotate', from: `0 ${W / 2} ${H / 2}`, to: `360 ${W / 2} ${H / 2}`, dur: '12s', repeatCount: 'indefinite' })])]);
    const two = cores.length > 1 ? cores : [cores[0], glows[0]], twoG = glows.length > 1 ? glows : [glows[0], cores[0]];
    ctx.defs.append(grad(gid, two), grad(hid, twoG));
    for (const r of runs) { const d = trace(o, r[0], r[1], () => 0, 1.5, r[2]); light(body, ctx, d, `url(#${gid})`, `url(#${hid})`, { w: 2.8 }); spots.push([d, '#ffffff', twoG[0], 0]); }
  }
  if (frame === 'striped' || frame === 'checkered') { // a strip: bands (or checks) of the colours, flowing along it when it chases
    const cols = N > 1 ? pairs.map((p) => p[0]) : [pairs[0][0], pairs[0][1]], wS = 5, P = wS * cols.length;
    for (const r of runs) { const d = trace(o, r[0], r[1], () => 0, 1.5, r[2]);
      light(body, ctx, d, cols[cols.length - 1], pairs[0][1], { w: 4.6 });
      if (frame === 'striped') cols.slice(0, -1).forEach((c, j) => light(body, ctx, d, c, pairs[0][1], { w: 4.6, cap: 'butt', dash: `${wS} ${P - wS}`, cls: 'flow', style: { '--o': `${-j * wS}px`, '--P': `${P}px` }, offset: -j * wS }));
      else [-1.2, 1.2].forEach((k, lane) => { const dl = trace(o, r[0], r[1], () => k, 1.5, r[2]); light(body, ctx, dl, cols[0], pairs[0][1], { w: 2.3, cap: 'butt', dash: '4 4', cls: 'flow', style: { '--o': `${lane * 4}px`, '--P': '8px' }, offset: lane * 4 }); });
      spots.push([d, cols[0], pairs[0][1], 0]); }
  }
  if (frame === 'twist') { // a braid: one strand per colour pair (one strand wraps a faint rod), passing over and under
    const n = N, A = 2.7, lam = 13, back = mk('g', { class: 'twist-back' }), front = mk('g', { class: 'twist-front' }); body.append(back, front);
    for (const r of runs) {
      if (n === 1) light(back, ctx, trace(o, r[0], r[1], () => 0, 1.5, r[2]), pairs[0][1], pairs[0][1], { w: 1.6, dim: true });
      pairs.forEach(([core, glow], i) => {
        const ph = (2 * Math.PI * i) / Math.max(2, n), th = (s) => (2 * Math.PI * s) / lam + ph, step = 0.9;
        let seg = [], isFront = null; const flush = () => { if (seg.length > 1) { const d = `M${seg.join('L')}`; if (isFront) { front.append(mk('path', { d, fill: 'none', stroke: spec.mount.color || '#07040f', 'stroke-width': 5.4, 'stroke-linecap': 'round', class: 'sep' })); light(front, ctx, d, core, glow, { w: 2.2 }); } else light(back, ctx, d, core, glow, { w: 2, dim: true }); } };
        for (let s = r[0]; s <= r[1] + 1e-6; s += step) { const f = Math.cos(th(s)) > 0, p = off(o, s, A * Math.sin(th(s))), pt = `${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
          if (isFront !== null && f !== isFront) { seg.push(pt); flush(); seg = [pt]; } else seg.push(pt); isFront = f; }
        flush();
      });
      spots.push([trace(o, r[0], r[1], () => 0, 1.5, r[2]), pairs[0][0], pairs[0][1], 0, true]); // a braid's chase is a glow passing along it
    }
  }
  // lamps: separate lights round the edge, taking turns in the colour pairs
  const lamps = [];
  if (frame === 'dashed' || frame === 'dotted' || (frame === 'bulbs' && who !== 'house')) {
    const gap = frame === 'dashed' ? 11 : frame === 'dotted' ? 7.5 : 11;
    for (const r of runs) { const n = Math.max(1, Math.round(runLen(r) / gap)); for (let i = 0; i < n; i++) { const s = r[0] + (runLen(r) * (i + (r[2] ? 0 : 0.5))) / n, p = o.at(s);
      lamps.push({ p, s, d: frame === 'dashed' ? `M${(p.x - Math.cos(p.a) * 3.4).toFixed(2)} ${(p.y - Math.sin(p.a) * 3.4).toFixed(2)}L${(p.x + Math.cos(p.a) * 3.4).toFixed(2)} ${(p.y + Math.sin(p.a) * 3.4).toFixed(2)}` : null, r: frame === 'dotted' ? 1.6 : 2.6 }); } }
  }
  const lampG = mk('g', { class: 'lamps' }); body.append(lampG);
  lamps.sort((a, b) => a.s - b.s).forEach((l, i) => { const [core, glow] = pairs[i % N];
    const g = l.d ? light(lampG, ctx, l.d, core, glow, { w: 2.6 }) : light(lampG, ctx, dotD(l.p.x, l.p.y, l.r), core, glow, { fill: true, hotD: dotD(l.p.x, l.p.y, l.r * 0.45) });
    g.classList.add('lamp'); g.style.setProperty('--i', i); g.style.setProperty('--n', lamps.length); g.style.setProperty('--r', ((i * 7919) % 13) / 13); if (i % 2) g.classList.add('odd'); });
  // the symbols, lit like lamps (they chase, breathe and twinkle with the frame)
  const edgeG = mk('g', { class: 'edge-syms' }); lights.append(edgeG);
  marks.forEach((s, i) => { const [core, glow] = pairs[i % N], g = glyph(edgeG, ctx, spec.edge, o.at(s), frame === 'symbols' ? 12 : 13, core, glow);
    g.classList.add('lamp'); g.style.setProperty('--i', i); g.style.setProperty('--n', marks.length); g.style.setProperty('--r', ((i * 7919) % 13) / 13); if (i % 2) g.classList.add('odd'); });
  // the chase: a brighter stretch of the same light running round each tube, seamlessly (its dash pattern is exactly
  // the loop's length, and each stretch between symbols starts where it falls in the loop)
  if (spots.length && !OWN_MOTION.includes(frame)) { // a strip's flow and a gradient's turn are their own chase: no second one over them
    const spotG = mk('g', { class: 'spots' }); body.append(spotG);
    const byTube = new Map(); for (const sp of spots) { if (!byTube.has(sp[3])) byTube.set(sp[3], []); byTube.get(sp[3]).push(sp); }
    for (const list of byTube.values()) {
      const lens = list.map(([d]) => { const p = mk('path', { d }); svg.append(p); let L = 0; try { L = p.getTotalLength(); } catch { L = 0; } p.remove(); return L; }), total = lens.reduce((a, b) => a + b, 0) || 1;
      let at = 0; list.forEach(([d, core, glow, , haloOnly], i) => { const g = Math.min(total * 0.12, 70);
        light(spotG, ctx, d, hot(core === '#ffffff' ? glow : core), glow, { w: haloOnly ? 7 : 2.8, haloOnly, cls: 'spot', dash: `${g.toFixed(1)} ${(total - g).toFixed(1)}`, offset: at.toFixed(1), style: { '--L': `${total.toFixed(1)}px`, '--s0': `${at.toFixed(1)}px` } }); at += lens[i]; });
    }
  }
  // a swap: the tubes trade colours (the next pair's, or the glow's), fading across and back
  if (spec.motion === 'swap' && spots.length) {
    const swapG = mk('g', { class: 'swaps' }); body.append(swapG);
    for (const [d, , , i] of spots) { const [core, glow] = N > 1 ? pairs[(i + 1) % N] : [pairs[0][1], pairs[0][0]]; light(swapG, ctx, d, core, glow, { w: frame === 'striped' || frame === 'checkered' ? 4.6 : 2.4 }); }
  }
  if (spec.blinks?.border?.on) body.classList.add('bk', `bk-${spec.blinks.border.pattern || 'breathe'}`);
  if (spec.blinks?.edge?.on) edgeG.classList.add('bk', `bk-${spec.blinks.edge.pattern || 'breathe'}`);
}

// ---------- the name's decorations: the large symbol after it and the crown off its first letter ----------
function letterBoxes(nameEl, origin, fs, k = 1) { // k: how much the page is scaled (the stage fits the window)
  const node = [...nameEl.childNodes].find((n) => n.nodeType === 3) || nameEl.firstChild; if (!node?.textContent) return [];
  const out = [], range = document.createRange(), caps = getComputedStyle(nameEl).textTransform === 'uppercase'; // a capitals face: every letter is a capital
  for (let i = 0; i < node.textContent.length; i++) { if (/\s/.test(node.textContent[i])) continue; range.setStart(node, i); range.setEnd(node, i + 1); const r = range.getBoundingClientRect(); if (!r.width) continue;
    // the ink, not the font's whole line: estimated from the letter's shape (capitals and tall letters reach about
    // 0.72em over the baseline, the rest about 0.48em; g, j, p, q, y hang below it)
    const ch = node.textContent[i], base = (r.bottom - origin.top) / k - fs * 0.24, top = caps || /[A-Z0-9bdfhklt]/.test(ch) ? 0.72 : 0.48, low = !caps && /[gjpqyf]/.test(ch) ? 0.2 : 0.02;
    out.push({ l: (r.left - origin.left) / k + fs * 0.05, r: (r.right - origin.left) / k - fs * 0.05, t: base - fs * top, b: base + fs * low, i, cap: top > 0.6 }); }
  return out;
}
// measure the name's letters in an svg's own coordinates
function nameIn(svg, el) {
  const nameEl = el.querySelector('.neon-name'); if (!nameEl) return null;
  const origin = svg.getBoundingClientRect(), fs = parseFloat(getComputedStyle(nameEl).fontSize) || 27, k = origin.width / (svg.clientWidth || origin.width || 1) || 1;
  const boxes = letterBoxes(nameEl, origin, fs, k); return boxes.length ? { fs, boxes } : null;
}
// the symbol after the name: behind the letters, its tube stopping short of them
function drawDeco(svg, el, spec) {
  svg.replaceChildren(); const N = nameIn(svg, el); if (!N || !spec.symbol?.on || !SYMBOLS[spec.symbol.id]) return;
  const ctx = defsFor(svg); ctx.svg = svg; const { fs, boxes } = N, [core, glow] = spec.name;
  const avoid = boxes.map((b) => ({ l: b.l - 1.5, r: b.r + 1.5, t: b.t - 1.5, b: b.b + 1.5 }));
  // and the class line under it: the symbol's tube stops short of its letters too
  const clsEl = el.querySelector('.neon-class'); if (clsEl?.textContent) { const o = svg.getBoundingClientRect(), q = clsEl.getBoundingClientRect(), kk = o.width / (svg.clientWidth || o.width || 1) || 1;
    avoid.push({ l: (q.left - o.left) / kk - 2, r: (q.right - o.left) / kk + 2, t: (q.top - o.top) / kk + q.height / kk * 0.12 - 1.5, b: (q.bottom - o.top) / kk - q.height / kk * 0.12 + 1.5 }); }
  // it fits inside the frame, top and bottom: moved down a little first, then made smaller
  const last = boxes[boxes.length - 1], sv = svg.getBoundingClientRect(), er = el.getBoundingClientRect(), kk = sv.width / (svg.clientWidth || sv.width || 1) || 1, room = frameRoom(spec) + 1.5;
  const top = (er.top - sv.top) / kk + room, bot = (er.bottom - sv.top) / kk - room, half = (sz) => sz * 0.44 + 2.6; // the symbol's reach from its centre, glow and all
  let size = fs * 1.15, y = (last.t + last.b) / 2;
  if (y - half(size) < top) y = Math.min(top + half(size), Math.max(y, (top + bot) / 2));
  size = Math.max(fs * 0.5, Math.min(size, ((y - top - 2.6) / 0.44), ((bot - y - 2.6) / 0.44)));
  const x = last.r + size * 0.3;
  const g = litSymbol(svg, ctx, spec.symbol.id, { x, y, k: size / 24 }, spec.symbol.colors?.[0] || core, spec.symbol.colors?.[1] || glow, { avoid, w: 2.4, cls: `name-sym motion-${spec.symbol.motion}` });
  if (spec.blinks?.symbol?.on) g.classList.add('bk', `bk-${spec.blinks.symbol.pattern || 'breathe'}`);
}
// The first letter's ink, in an svg's coordinates: its left and right, and the top of the ink in each column (drawn
// with the name's own font onto a canvas, so a script capital's real shape is used, not its box)
function inkOf(svg, el) {
  const nameEl = el.querySelector('.neon-name'), node = nameEl && ([...nameEl.childNodes].find((n) => n.nodeType === 3) || nameEl.firstChild); if (!node?.textContent) return null;
  const i = [...node.textContent].findIndex((c) => !/\s/.test(c)); if (i < 0) return null;
  const range = document.createRange(); range.setStart(node, i); range.setEnd(node, i + 1); const r = range.getBoundingClientRect(); if (!r.width) return null;
  const sv = svg.getBoundingClientRect(), kk = sv.width / (svg.clientWidth || sv.width || 1) || 1, cs = getComputedStyle(nameEl), fs = parseFloat(cs.fontSize) || 27;
  const cv = document.createElement('canvas'), W = Math.ceil(r.width / kk + fs * 1.6), H = Math.ceil(fs * 2.4); cv.width = W; cv.height = H;
  const c = cv.getContext('2d', { willReadFrequently: true }); c.font = `${cs.fontStyle} ${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
  const ch = cs.textTransform === 'uppercase' ? node.textContent[i].toUpperCase() : node.textContent[i], mt = c.measureText(ch), asc = mt.fontBoundingBoxAscent || fs * 0.9, x0 = fs * 0.6, y0 = asc + fs * 0.3; c.fillText(ch, x0, y0);
  const px = c.getImageData(0, 0, W, H).data, tops = new Array(W).fill(null); let l = Infinity, rr = -Infinity;
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) if (px[(y * W + x) * 4 + 3] > 110) { tops[x] = y; l = Math.min(l, x); rr = Math.max(rr, x); break; }
  if (rr < l) return null;
  const penX = (r.left - sv.left) / kk, topY = (r.top - sv.top) / kk - (y0 - asc), toSvg = (x) => penX + x - x0;
  return { l: toSvg(l), r: toSvg(rr), top: (x) => { const col = Math.round(x - penX + x0); return tops[col] == null ? null : topY + tops[col]; } };
}
// The crown's colours: its band, its prongs and its jewels, each a [tube, glow] pair. A sign can set them
// (crownLook); otherwise they come from the sign itself, so every High Roller's crown is their own, and it is the
// one you take from them.
export const CROWN_PARTS = ['band', 'prongs', 'jewels'];
export function crownLookOf(spec) {
  const own = spec?.crownLook || {}, ok = (p) => Array.isArray(p) && p.length === 2 && p.every((c) => /^#[0-9a-f]{6}$/i.test(c));
  const from = { band: spec?.border, prongs: spec?.name, jewels: spec?.more?.[0] || spec?.symbol?.colors || spec?.cls };
  return Object.fromEntries(CROWN_PARTS.map((k) => [k, ok(own[k]) ? own[k] : ok(from[k]) ? from[k] : ['#ffd76a', '#ff9a3c']]));
}
// The crown: set down on the first letter, leaning well left, in front of the letter and the frame. Its band and
// prongs are tubes and its jewels are bulbs, each part in its own colours, blending where they meet. Where it
// crosses the letter and the frame, they stop short of it (a mask cut round its tubes), as a tube behind another does.
const CROWN_LEAN = -44;
function drawCrown(svg, el, spec) {
  svg.replaceChildren(); const lvl = spec.crown?.level, N = nameIn(svg, el), C = CROWNS[lvl]; if (!N || !C) return clearCut(el);
  const ctx = defsFor(svg); ctx.svg = svg; const { fs, boxes } = N, first = boxes[0], hgt = fs * (0.5 + lvl * 0.06), k = hgt / 24;
  // its glow blurs over a fixed region (a short straight tube's own box is too thin to hold its blur)
  ctx.defs.append(mk('filter', { id: `${ctx.id}cb`, filterUnits: 'userSpaceOnUse', x: -400, y: -400, width: 3000, height: 1400 }, [mk('feGaussianBlur', { stdDeviation: '2.6' })])); ctx.blur = `url(#${ctx.id}cb)`;
  const look = spec.crown.look || (spec.crown.colors ? { band: spec.crown.colors, prongs: spec.crown.colors, jewels: spec.crown.colors } : crownLookOf(spec));
  // set down on the letter's ink: the band's underside just touching the top of the letter where it rests (so the
  // cut round it trims the letter a little and no more), its middle over the letter's left third
  const R0 = new DOMMatrix().rotate(CROWN_LEAN).scale(k).translate(-14, -21), w0 = Math.max(1.6, 2.1 * Math.min(1.2, k / 1.1));
  const ink = inkOf(svg, el), band = C.band.split(/(?=M)/).filter(Boolean).flatMap((sub) => sampleSub(svg, sub)).map(([x, y]) => { const q = R0.transformPoint(new DOMPoint(x, y)); return [q.x, q.y]; });
  let ax = first.l + (first.r - first.l) * 0.32, ay = first.t + fs * 0.04;
  if (ink) { ax = ink.l + (ink.r - ink.l) * 0.3; let dy = Infinity; for (const [x, y] of band) { const top = ink.top(ax + x); if (top != null) dy = Math.min(dy, top - (y + w0 / 2) + 0.6); } if (dy < Infinity) ay = dy; }
  const M = new DOMMatrix().translate(ax, ay).multiply(R0);
  const P = (x, y) => { const q = M.transformPoint(new DOMPoint(x, y)); return [q.x, q.y]; };
  const g = mk('g', { class: `crown crown-${lvl}` }); svg.append(g);
  // the gradients: up the prongs (from the band's colour into theirs, touched by the jewels' at the tips), along the band
  const lin = (id, a, b, stops) => { ctx.defs.append(mk('linearGradient', { id: `${ctx.id}${id}`, gradientUnits: 'userSpaceOnUse', x1: a[0].toFixed(2), y1: a[1].toFixed(2), x2: b[0].toFixed(2), y2: b[1].toFixed(2) },
    stops.map(([o, c]) => mk('stop', { offset: o, 'stop-color': c })))); return `url(#${ctx.id}${id})`; };
  const [bc, bg] = look.band, [pc, pg] = look.prongs, [jc, jg] = look.jewels, up = [P(14, 20), P(14, 3)], along = [P(2, 19), P(26, 19)];
  const prongCore = lin('pc', ...up, [[0, mix(bc, pc, 0.25)], [0.3, pc], [0.8, pc], [1, mix(pc, jc, 0.35)]]), prongGlow = lin('pg', ...up, [[0, bg], [0.45, pg], [1, mix(pg, jg, 0.4)]]);
  const bandCore = lin('bc', ...along, [[0, bc], [0.3, mix(bc, pc, 0.3)], [0.5, bc], [0.7, mix(bc, jc, 0.3)], [1, bc]]), bandGlow = lin('bg', ...along, [[0, bg], [0.5, mix(bg, pg, 0.35)], [1, bg]]);
  const w = w0, runs = [];
  const tube = (d, core, glow, cls) => { for (const sub of d.split(/(?=M)/).filter(Boolean)) { const pts = sampleSub(svg, sub).map(([x, y]) => P(x, y)); if (pts.length < 2) continue;
    const pd = `M${pts.map((p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join('L')}`; runs.push(pd); light(g, ctx, pd, core, glow, { w, cls }); } };
  tube(C.prongs, prongCore, prongGlow, 'crown-prongs');
  tube(C.band, bandCore, bandGlow, 'crown-band');
  // a brighter stretch of light climbing the prongs, and running along the band
  const run = (d, col, dur) => { const p = mk('path', { d }); svg.append(p); let L = 0; try { L = p.getTotalLength(); } catch { L = 0; } p.remove(); if (L < 4) return;
    const seg = Math.min(L * 0.18, 14); light(g, ctx, d, hot(col), col, { w: w * 1.15, cls: 'crown-run', dash: `${seg.toFixed(1)} ${(L - seg).toFixed(1)}`, offset: 0, style: { '--L': `${L.toFixed(1)}px`, '--s0': '0px', '--d': `${dur}s` } }); };
  runs.forEach((d, i) => run(d, i < C.prongs.split(/(?=M)/).length ? pc : bc, 3.6 + (i % 3) * 0.7));
  // the jewels: bulbs, a soft halo of their glow, a glass of their colour, a white-hot heart, each twinkling on its own
  const r = Math.max(1.3, 1.45 * k), bulbs = [];
  C.jewels.forEach(([x, y], i) => { const [cx, cy] = P(x, y), id = `${ctx.id}j${i}`;
    ctx.defs.append(mk('radialGradient', { id, cx: '38%', cy: '35%', r: '70%' }, [mk('stop', { offset: 0, 'stop-color': '#ffffff' }), mk('stop', { offset: 0.35, 'stop-color': hot(jc) }), mk('stop', { offset: 0.75, 'stop-color': jc }), mk('stop', { offset: 1, 'stop-color': mix(jc, pc, 0.35) })]));
    const b = mk('g', { class: 'lt crown-jewel' }); b.style.setProperty('--i', i); b.style.setProperty('--r', ((i * 7919) % 13) / 13);
    b.append(mk('circle', { cx, cy, r: r * 2.6, fill: jg, opacity: 0.35, filter: ctx.blur, class: 'halo' }), mk('circle', { cx, cy, r: r * 1.5, fill: mix(jg, pg, 0.3), opacity: 0.55, filter: ctx.blur, class: 'halo' }),
      mk('circle', { cx, cy, r, fill: `url(#${id})`, class: 'tube' }), mk('circle', { cx: cx - r * 0.28, cy: cy - r * 0.3, r: r * 0.3, fill: '#ffffff', opacity: 0.9, class: 'hot' }));
    g.append(b); bulbs.push([cx, cy]); });
  if (spec.blinks?.crown?.on) g.classList.add('bk', `bk-${spec.blinks.crown.pattern || 'breathe'}`);
  cutUnder(el, svg, runs, w + 3.4, bulbs, r + 1.6);
}
// Cut the letters and the frame where the crown's tubes and bulbs pass in front of them: a mask, the same shape for each,
// laid over the sign's box. The tubes behind end at the cut, a short way off the crown's own tube. (A mask clips to
// the element's box, so the name is padded out, padding taken back by its margin, to keep its glow inside it.)
function cutUnder(el, svg, runs, sw, bulbs, br) {
  const W = el.offsetWidth, H = el.offsetHeight, m = 60, sv = svg.getBoundingClientRect(), kk = sv.width / (svg.clientWidth || sv.width || 1) || 1;
  const img = `<svg xmlns="http://www.w3.org/2000/svg" width="${W + 2 * m}" height="${H + 2 * m}" viewBox="${-m} ${-m} ${W + 2 * m} ${H + 2 * m}"><defs><filter id="f" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="0.45"/></filter><mask id="c" maskUnits="userSpaceOnUse" x="${-m}" y="${-m}" width="${W + 2 * m}" height="${H + 2 * m}"><rect x="${-m}" y="${-m}" width="${W + 2 * m}" height="${H + 2 * m}" fill="#fff"/><g filter="url(#f)"><g fill="none" stroke="#000" stroke-width="${sw.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round">${runs.map((d) => `<path d="${d}"/>`).join('')}</g>${bulbs.map(([x, y]) => `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${br.toFixed(2)}"/>`).join('')}</g></mask></defs><rect x="${-m}" y="${-m}" width="${W + 2 * m}" height="${H + 2 * m}" fill="#000" mask="url(#c)"/></svg>`;
  const url = `url("data:image/svg+xml,${encodeURIComponent(img)}")`;
  const lay = (node) => { if (!node) return; node.classList.add('crown-cut'); const r = node.getBoundingClientRect(), ox = (r.left - sv.left) / kk, oy = (r.top - sv.top) / kk;
    Object.assign(node.style, { maskImage: url, webkitMaskImage: url, maskRepeat: 'no-repeat', webkitMaskRepeat: 'no-repeat', maskSize: `${W + 2 * m}px ${H + 2 * m}px`, webkitMaskSize: `${W + 2 * m}px ${H + 2 * m}px`,
      maskPosition: `${(-m - ox).toFixed(2)}px ${(-m - oy).toFixed(2)}px`, webkitMaskPosition: `${(-m - ox).toFixed(2)}px ${(-m - oy).toFixed(2)}px`, }); };
  lay(el.querySelector(':scope > .sign-frame')); lay(el.querySelector('.neon-name'));
}
function clearCut(el) { for (const n of el.querySelectorAll('.crown-cut')) { for (const p of ['maskImage', 'webkitMaskImage', 'maskRepeat', 'webkitMaskRepeat', 'maskSize', 'webkitMaskSize', 'maskPosition', 'webkitMaskPosition']) n.style[p] = ''; n.classList.remove('crown-cut'); } }
// how much room the frame takes inside the sign's edge: its tubes (nested inward) and any symbols along it
export function frameRoom(spec) {
  if (spec.frame === 'none') return 4;
  const tubes = ['plain', 'wave', 'zigzag'].includes(spec.frame) ? pairsOf(spec).length - 1 : 0, strip = STRIPS.includes(spec.frame) ? 2 : 0;
  const sym = spec.frame === 'symbols' || ['edge', 'top', 'bottom'].includes(spec.edgeAt) ? 6 : 0;
  return Math.round(6 + tubes * 3.8 + strip + sym);
}

// Dress an element as a sign: its colours (as the --who-part1/2 variables the table's styles read), its frame, mount,
// symbols, crown, motion and blinks. Can be called again to redress it.
export function dressSign(el, spec, who) {
  for (const p of PARTS) spec[p].forEach((c, i) => el.style.setProperty(`--${who}-${p}${i + 1}`, c));
  el.style.setProperty('--sf1', spec.border[0]); el.style.setProperty('--sf2', spec.border[1]);
  el.style.setProperty('--sign-r', `${Math.max(0, +spec.radius || 0)}px`);
  el.style.setProperty('--mount', spec.mount.color || 'transparent'); el.style.setProperty('--mount-img', safeUrl(spec.mount.image) || 'none');
  el.classList.remove(...[...el.classList].filter((c) => /^(frame|motion|blink|bk)-/.test(c)));
  el.classList.add('neonsign', `frame-${spec.frame}`, `motion-${spec.motion}`);
  for (const part of ['name', 'cls']) { const b = spec.blinks?.[part]; if (b?.on) el.classList.add(`blink-${part}`, `bk-${part}-${BLINKS.includes(b.pattern) ? b.pattern : 'breathe'}`); }
  for (const old of el.querySelectorAll(':scope > .sign-frame, :scope > .sign-crown, .sign-deco')) old.remove();
  clearCut(el);
  el.style.setProperty('--sign-room', `${frameRoom(spec)}px`);
  el._signObs?.disconnect();
  const nsign = el.querySelector('.nsign'); if (nsign) { nsign.classList.toggle('has-symbol', !!spec.symbol?.on); nsign.classList.toggle('has-crown', !!spec.crown?.level); nsign.classList.remove(...CLS_ALIGN.map((a) => `cls-${a}`)); nsign.classList.add(`cls-${CLS_ALIGN.includes(spec.clsAlign) ? spec.clsAlign : 'right'}`);
    nsign.classList.remove(...SIGN_FONTS.flatMap((f) => [`nf-${f}`, `cf-${f}`])); nsign.classList.add(`nf-${SIGN_FONTS.includes(spec.nameFont) ? spec.nameFont : 'script'}`, `cf-${SIGN_FONTS.includes(spec.clsFont) ? spec.clsFont : 'display'}`); }
  const svg = spec.frame === 'none' && spec.edgeAt === 'none' ? null : mk('svg', { class: 'sign-frame', 'aria-hidden': 'true' }); if (svg) el.append(svg);
  const deco = nsign && spec.symbol?.on ? mk('svg', { class: 'sign-deco', 'aria-hidden': 'true' }) : null; if (deco) nsign.append(deco);
  const crown = nsign && spec.crown?.level ? mk('svg', { class: 'sign-crown', 'aria-hidden': 'true' }) : null; if (crown) el.append(crown);
  let last = '';
  const redraw = () => { const w = el.offsetWidth, h = el.offsetHeight, key = `${w}x${h}`; if (key === last) return; last = key; if (svg) drawFrame(svg, spec, w, h, who); if (deco) drawDeco(deco, el, spec); if (crown) drawCrown(crown, el, spec); };
  el._signRedraw = () => { last = ''; redraw(); }; // after something inside the sign changes size (its name is fitted)
  if (typeof ResizeObserver !== 'undefined') { el._signObs = new ResizeObserver(redraw); el._signObs.observe(el); }
  requestAnimationFrame?.(redraw);
  document.fonts?.ready?.then(() => { last = ''; redraw(); }); // the script face changes the letters' shapes once it loads
  return el;
}

// A sign going dark: its Roller is out of the match. Every lit part sparks and fails (the name, the class line, the
// frame's tubes and bulbs, the symbols, the crown), then stays off: grey glass on a dull mount, a crack run through
// the plate, a few pieces of it on the floor. `celebrate` is the other sign's lap of honour while it happens.
export function killSign(el) {
  if (!el || el.classList.contains('sign-dead')) return;
  el.classList.add('sign-dying');
  const W = el.offsetWidth || 196, H = el.offsetHeight || 88;
  for (let i = 0; i < 18; i++) { // sparks from the frame, where the tubes are
    const edge = i % 4, x = edge < 2 ? Math.random() * W : edge === 2 ? 0 : W, y = edge === 0 ? 0 : edge === 1 ? H : Math.random() * H, a = Math.random() * Math.PI * 2, d = 14 + Math.random() * 30;
    const sp = document.createElement('i'); sp.className = 'sign-spark'; sp.style.cssText = `left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;--dx:${(Math.cos(a) * d).toFixed(1)}px;--dy:${(Math.sin(a) * d + 16).toFixed(1)}px;animation-delay:${(Math.random() * 0.9).toFixed(2)}s`;
    el.append(sp); setTimeout(() => sp.remove(), 2200);
  }
  setTimeout(() => {
    el.classList.remove('sign-dying'); el.classList.add('sign-dead');
    // the crack: one jagged line across the plate with two branches, and three shards that drop away
    const pts = [[0.08, 0.3], [0.24, 0.42], [0.37, 0.33], [0.5, 0.56], [0.66, 0.47], [0.8, 0.66], [0.94, 0.58]].map(([x, y]) => `${(x * W).toFixed(1)},${(y * H).toFixed(1)}`).join(' ');
    const svg = mk('svg', { class: 'sign-crack', viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' });
    svg.append(mk('polyline', { points: pts }), mk('polyline', { points: `${(0.37 * W).toFixed(1)},${(0.33 * H).toFixed(1)} ${(0.43 * W).toFixed(1)},${(0.1 * H).toFixed(1)}` }), mk('polyline', { points: `${(0.66 * W).toFixed(1)},${(0.47 * H).toFixed(1)} ${(0.72 * W).toFixed(1)},${(0.9 * H).toFixed(1)}` }));
    el.append(svg);
    for (let i = 0; i < 3; i++) { const sh = document.createElement('i'); sh.className = 'sign-shard'; sh.style.cssText = `left:${(20 + i * 30 + Math.random() * 10).toFixed(0)}%;top:${(40 + Math.random() * 30).toFixed(0)}%;--r:${(Math.random() * 120 - 60).toFixed(0)}deg;animation-delay:${(i * 0.12).toFixed(2)}s`; el.append(sh); setTimeout(() => sh.remove(), 1800); }
  }, 1250);
}
export function celebrateSign(el, ms = 2800) { if (!el) return; el.classList.add('sign-victory'); setTimeout(() => el.classList.remove('sign-victory'), ms); }
