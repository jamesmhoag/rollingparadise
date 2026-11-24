// Neon signs. Each Roller's seat at the table, and the House's sign, is a neon sign built from a sign spec:
//
//   border, name, cls  [tube colour, glow colour] for the frame, the script name and the class under it
//   frame              how the frame is drawn: FRAMES. Tubes are one continuous line (a tube, two or three, a rope of
//                      both colours, a zigzag, a wave, a gradient); lights are a row of separate lamps (dashes, dots,
//                      bulbs, or the edge symbol itself all the way round)
//   motion             how the frame moves: MOTIONS. Lamps chase, breathe, alternate or twinkle one by one; a tube does
//                      the same along its length (a glint runs round it, it breathes, its colours trade, it shimmers)
//   edge, edgeAt       a symbol (EDGE_GLYPHS, or any character) at the corners or along the top and bottom. Where a
//                      symbol sits, it replaces the frame under it
//   mount              what the sign hangs on: a backing colour and an optional image (any URL or data: URL)
//   blink              one part of the sign that blinks, and how: BLINKS
//
// Every motion and blink is slow and soft (well under three changes a second, never fully dark) so none of them can
// trigger a photosensitive reaction, and all of them stop for players who ask their system for reduced motion.
//
// The frame is drawn as an SVG laid over the sign and redrawn when the sign changes size. The player's sign is
// D.NEON.you (under the Roller's own ROLLERS[id].sign), the House's D.NEON.house, and every opponent's is D.NEON.them
// unless its roster entry has its own `sign`.
import * as D from '../data.js';

export const TUBES = ['tube', 'double', 'triple', 'rope', 'zigzag', 'wave', 'gradient'];
export const LIGHTS = ['dashed', 'dotted', 'bulbs', 'symbols'];
export const FRAMES = [...TUBES, ...LIGHTS, 'none'];
export const MOTIONS = ['chase', 'breathe', 'swap', 'twinkle', 'still'];
export const EDGE_AT = ['none', 'corners', 'edge'];
export const BLINK_PARTS = ['none', 'name', 'cls', 'border', 'edge'];
export const BLINKS = ['breathe', 'pulse', 'flicker', 'alternate'];
// symbols for the edge, by kind. None of them is an emoji (the ones a system might draw as one are shown as text);
// the ones that start with ':' are drawn shapes, for symbols Unicode only has as emoji.
export const GLYPH_GROUPS = {
  math: ['×', '+', '−', '÷', '=', '±', '∞'],
  stars: ['✦', '✧', '★', '☆', '✩', '✪', '✫', '✬', '✭', '✮', '✯', '⍟', '✶', '✡', '✷', '✸', '✹', '✺', '✴', '✵', '❂', '✱', '✳', '❋', '⁂'],
  shapes: ['◆', '◇', '◈', '●', '○', '◉', '◎', '⊕', '⊗', '⊙', '▣', '❖', '⌘', '✚', '✠', '☩'],
  cards: ['♠', '♥', '♦', '♣', '♤', '♡', '♢', '♧', '♛', '♚', '♞', '♜'],
  dice: ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'],
  more: [':skull', '☠', '☾', '☽', '⚡', '✿', '❀', '❁', '⚜', '♪', '♫', '¢', '§'],
};
export const EDGE_GLYPHS = Object.values(GLYPH_GROUPS).flat();
// drawn shapes, in a 12 by 12 box
export const SHAPES = {
  skull: 'M6 1C3.2 1 1.5 3 1.5 5.4c0 1.5.7 2.6 1.7 3.2v1.9h1.3v-.9h.9v.9h1.2v-.9h.9v.9h1.3V8.6c1-.6 1.7-1.7 1.7-3.2C10.5 3 8.8 1 6 1ZM4.1 4.6a1.1 1.1 0 1 0 0 2.2a1.1 1.1 0 1 0 0-2.2ZM7.9 4.6a1.1 1.1 0 1 0 0 2.2a1.1 1.1 0 1 0 0-2.2ZM6 7l-.6 1h1.2Z',
};
const PARTS = ['border', 'name', 'cls'];
export const BASE_SIGN = { frame: 'tube', motion: 'chase', radius: 12, edge: '★', edgeAt: 'none', mount: { color: '', image: '' }, blink: { part: 'none', pattern: 'breathe' } };
const TEXT_STYLE = '︎'; // asks for the text (not emoji) form of a symbol

// the sign a Roller (or the House) shows: the base, then the shared look for its side, then its own
export function signOf(who, own) {
  const side = D.NEON[who] || D.NEON.them, out = { ...BASE_SIGN, ...side, ...(own || {}) };
  out.mount = { ...BASE_SIGN.mount, ...(side.mount || {}), ...(own?.mount || {}) }; out.blink = { ...BASE_SIGN.blink, ...(side.blink || {}), ...(own?.blink || {}) };
  for (const p of PARTS) out[p] = (own?.[p] || side[p] || D.NEON.them[p]).slice(0, 2);
  if (!FRAMES.includes(out.frame)) out.frame = 'tube'; if (!MOTIONS.includes(out.motion)) out.motion = 'chase';
  return out;
}
const safeUrl = (u) => (/^(https?:|data:image\/|assets\/)/.test(u || '') ? `url("${String(u).replace(/"/g, '%22')}")` : '');
export const glyphOf = (g) => (typeof g === 'string' && g.startsWith(':') ? (SHAPES[g.slice(1)] ? g : '★') : [...(g || '')][0] || '★');

// ---------- the frame's geometry: a rounded rectangle, walked by distance ----------
// at(s): the point s along the outline (clockwise from the top-left corner's end) and the direction it runs there
function outline(w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2)); const a = Math.PI * r / 2, segs = [
    ['line', r, 0, w - r, 0], ['arc', w - r, r, -Math.PI / 2], ['line', w, r, w, h - r], ['arc', w - r, h - r, 0],
    ['line', w - r, h, r, h], ['arc', r, h - r, Math.PI / 2], ['line', 0, h - r, 0, r], ['arc', r, r, Math.PI]];
  const lens = segs.map((sg) => (sg[0] === 'line' ? Math.hypot(sg[3] - sg[1], sg[4] - sg[2]) : a)), L = lens.reduce((x, y) => x + y, 0);
  const at = (s) => { s = ((s % L) + L) % L; for (let i = 0; i < segs.length; i++) { if (s <= lens[i] || i === segs.length - 1) { const sg = segs[i], f = lens[i] ? Math.min(1, s / lens[i]) : 0;
    if (sg[0] === 'line') return { x: sg[1] + (sg[3] - sg[1]) * f, y: sg[2] + (sg[4] - sg[2]) * f, a: Math.atan2(sg[4] - sg[2], sg[3] - sg[1]), side: i / 2 };
    const t0 = sg[3] + f * Math.PI / 2; return { x: sg[1] + r * Math.cos(t0), y: sg[2] + r * Math.sin(t0), a: t0 + Math.PI / 2, side: -1 }; } s -= lens[i]; } };
  const d = `M${r},0H${w - r}A${r},${r} 0 0 1 ${w},${r}V${h - r}A${r},${r} 0 0 1 ${w - r},${h}H${r}A${r},${r} 0 0 1 0,${h - r}V${r}A${r},${r} 0 0 1 ${r},0Z`;
  return { L, at, d, mids: [1, 3, 5, 7].map((i) => lens.slice(0, i).reduce((x, y) => x + y, 0) + lens[i] / 2) };
}
// a line that wanders off the outline: a zigzag or a wave of amplitude amp
function wander(o, amp, step, wave) {
  const n = Math.max(8, Math.round(o.L / step)), pts = [];
  for (let i = 0; i <= n * (wave ? 3 : 1); i++) { const s = (i / (n * (wave ? 3 : 1))) * o.L, p = o.at(s), off = wave ? Math.sin((s / o.L) * n * Math.PI * 2) * amp : (i % 2 ? amp : -amp);
    pts.push(`${(p.x + Math.cos(p.a - Math.PI / 2) * off).toFixed(1)},${(p.y + Math.sin(p.a - Math.PI / 2) * off).toFixed(1)}`); }
  return `M${pts.join('L')}Z`;
}
const NS = 'http://www.w3.org/2000/svg';
const mk = (tag, attrs = {}, kids = []) => { const el = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v); for (const c of kids) el.append(c); return el; };
let uid = 0;

// draw the frame (and its symbols) for an element of size w by h
function drawFrame(svg, spec, w, h, who) {
  svg.replaceChildren(); if (w < 4 || h < 4) return;
  const pad = 2, W = w - pad * 2, H = h - pad * 2, o = outline(W, H, Math.max(0, +spec.radius || 0)), id = `sf${++uid}`;
  svg.setAttribute('viewBox', `${-pad} ${-pad} ${w} ${h}`); svg.style.setProperty('--L', o.L.toFixed(1));
  const g = glyphOf(spec.edge), frame = spec.frame, glyphs = [];
  // where symbols sit: the corners, along the top and bottom, or (for a frame of symbols) all the way round
  if (frame === 'symbols') { const n = Math.max(6, Math.round(o.L / 15)); for (let i = 0; i < n; i++) glyphs.push(o.at((i / n) * o.L)); }
  else if (frame !== 'none' && spec.edge && spec.edgeAt === 'corners') for (const m of o.mids) glyphs.push(o.at(m));
  else if (frame !== 'none' && spec.edge && spec.edgeAt === 'edge') { const n = Math.max(2, Math.floor((W - 2 * (+spec.radius || 0)) / 16)); for (const y of [0, H]) for (let i = 0; i < n; i++) glyphs.push({ x: (+spec.radius || 0) + ((W - 2 * (+spec.radius || 0)) * (i + 0.5)) / n, y, a: 0 }); }
  // a symbol replaces the frame under it: the frame is masked out round each one
  const mask = mk('mask', { id, maskUnits: 'userSpaceOnUse', x: -pad - 20, y: -pad - 20, width: w + 40, height: h + 40 },
    [mk('rect', { x: -pad - 20, y: -pad - 20, width: w + 40, height: h + 40, fill: '#fff' }), ...(frame === 'symbols' ? [] : glyphs.map((p) => mk('circle', { cx: p.x, cy: p.y, r: 7.5, fill: '#000' })))]);
  const defs = mk('defs', {}, [mask]); svg.append(defs);
  const body = mk('g', { class: 'sf-body', mask: glyphs.length && frame !== 'symbols' ? `url(#${id})` : null }); svg.append(body);
  const tube = (d, cls, extra = {}) => body.append(mk('path', { d, class: `sf-tube ${cls || ''}`, ...extra }));
  if (frame === 'tube') tube(o.d, 'a');
  else if (frame === 'double' || frame === 'triple') { const ins = frame === 'triple' ? [-3, 0, 3] : [-2, 2]; ins.forEach((k, i) => tube(outline(W - k * 2, H - k * 2, Math.max(0, (+spec.radius || 0) - k)).d, `thin ${i % 2 ? 'b' : 'a'}`, { transform: `translate(${k},${k})` })); }
  else if (frame === 'rope') { tube(o.d, 'a rope'); tube(o.d, 'b rope rope2'); }
  else if (frame === 'zigzag') tube(wander(o, 2.4, 9, false), 'a thin');
  else if (frame === 'wave') tube(wander(o, 2.2, 16, true), 'a thin');
  else if (frame === 'gradient') { const gid = `${id}g`; defs.append(mk('linearGradient', { id: gid, gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: W, y2: H }, [mk('stop', { offset: '0', 'stop-color': spec.border[0] }), mk('stop', { offset: '0.5', 'stop-color': spec.border[1] }), mk('stop', { offset: '1', 'stop-color': spec.border[0] }),
    mk('animateTransform', { attributeName: 'gradientTransform', type: 'rotate', from: `0 ${W / 2} ${H / 2}`, to: `360 ${W / 2} ${H / 2}`, dur: '9s', repeatCount: 'indefinite' })])); tube(o.d, 'grad', { stroke: `url(#${gid})` }); }
  // tubes: a glint that runs round them (shown for the chase)
  if (TUBES.includes(frame) && frame !== 'gradient') body.append(mk('path', { d: o.d, class: 'sf-glint' }));
  // lights: separate lamps, each with its place in the run (--i of --n) for the chase, the alternation and the twinkle
  const lamps = [];
  if (frame === 'dashed') { const n = Math.max(8, Math.round(o.L / 12)); for (let i = 0; i < n; i++) { const p = o.at((i / n) * o.L), dx = Math.cos(p.a) * 3.2, dy = Math.sin(p.a) * 3.2; lamps.push(mk('line', { x1: p.x - dx, y1: p.y - dy, x2: p.x + dx, y2: p.y + dy, class: 'sf-lamp dash' })); } }
  if (frame === 'dotted') { const n = Math.max(10, Math.round(o.L / 8)); for (let i = 0; i < n; i++) { const p = o.at((i / n) * o.L); lamps.push(mk('circle', { cx: p.x, cy: p.y, r: 1.7, class: 'sf-lamp dot' })); } }
  if (frame === 'bulbs' && who !== 'house') { const n = Math.max(8, Math.round(o.L / 11)); for (let i = 0; i < n; i++) { const p = o.at((i / n) * o.L); lamps.push(mk('circle', { cx: p.x, cy: p.y, r: 2.6, class: 'sf-lamp bulb' })); } }
  // symbols: drawn as text (or as a shape), lamps like the rest
  for (const p of glyphs) {
    const el = g.startsWith(':') ? mk('path', { d: SHAPES[g.slice(1)], class: 'sf-lamp sf-glyph shape', transform: `translate(${(p.x - 5.5).toFixed(1)},${(p.y - 5.5).toFixed(1)}) scale(0.92)` })
      : mk('text', { x: p.x.toFixed(1), y: p.y.toFixed(1), class: 'sf-lamp sf-glyph', 'text-anchor': 'middle', 'dominant-baseline': 'central' });
    if (!g.startsWith(':')) el.textContent = g + TEXT_STYLE; lamps.push(el);
  }
  const lampG = mk('g', { class: 'sf-lamps' }); svg.append(lampG);
  lamps.forEach((el, i) => { el.style.setProperty('--i', i); el.style.setProperty('--n', lamps.length); el.style.setProperty('--r', ((i * 7919) % 13) / 13); if (i % 2) el.classList.add('odd'); lampG.append(el); });
}

// Dress an element as a sign: its colours (as the --who-part1/2 variables the table's styles read), its frame, mount,
// edge symbols, motion and blink. Can be called again to redress it.
export function dressSign(el, spec, who) {
  for (const p of PARTS) spec[p].forEach((c, i) => el.style.setProperty(`--${who}-${p}${i + 1}`, c));
  el.style.setProperty('--sf1', spec.border[0]); el.style.setProperty('--sf2', spec.border[1]);
  el.style.setProperty('--sign-r', `${Math.max(0, +spec.radius || 0)}px`);
  el.style.setProperty('--mount', spec.mount.color || 'transparent'); el.style.setProperty('--mount-img', safeUrl(spec.mount.image) || 'none');
  el.classList.remove(...[...el.classList].filter((c) => c.startsWith('frame-') || c.startsWith('blink-') || c.startsWith('motion-')));
  el.classList.add('neonsign', `frame-${spec.frame}`, `motion-${spec.motion}`);
  if (spec.blink.part !== 'none') el.classList.add(`blink-${spec.blink.part}`, `blink-${BLINKS.includes(spec.blink.pattern) ? spec.blink.pattern : 'breathe'}`);
  for (const old of el.querySelectorAll(':scope > .sign-edge, :scope > .sign-frame')) old.remove();
  el._signObs?.disconnect();
  if (spec.frame === 'none' && !(spec.edge && spec.edgeAt !== 'none')) return el;
  const svg = mk('svg', { class: 'sign-frame', 'aria-hidden': 'true' }); el.append(svg);
  let last = '';
  const redraw = () => { const w = el.offsetWidth, h = el.offsetHeight, key = `${w}x${h}`; if (key === last) return; last = key; drawFrame(svg, spec, w, h, who); };
  if (typeof ResizeObserver !== 'undefined') { el._signObs = new ResizeObserver(redraw); el._signObs.observe(el); }
  requestAnimationFrame?.(redraw);
  return el;
}
