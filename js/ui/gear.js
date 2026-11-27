// Wallets and jackets: drawn from their look (content/finishes.js) and held as things (ui/thing.js: a body as thick as
// what it is made of, the lean under the pointer, the close look).
// A wallet lies open and shows what it holds: the very cards and passes you carry (the same elements drawn anywhere
// else), tucked into it. Three types: a billfold (cards one side, passes the other), a clasped pouch (flap up, clasp
// undone, everything standing in it) and a clip (a band over the stack).
// A jacket is drawn in its style (blazer, bomber, long coat, parka), part by part: body, sleeves, collar and trim,
// closure, pockets, emblem, each made of its own material in its own colour.
import { h } from './core.js';
import * as D from '../data.js';
import { thing } from './thing.js';
import { finishOn, finishSvg, svgPaint } from './finish.js';
import { walletLook, jacketLook, WALLET_TYPES, JACKET_STYLES, FINISHES } from '../content/finishes.js';
import { symEl } from './parts.js';
import { shade } from '../util.js';

const lookFinish = (L, over = {}) => ({ m: L.mat, color: L.color, glint: L.glint, sparkle: L.sparkle, ...over });
// the emblem of a look, in its own material (lit as the piece is)
const emblemEl = (L, cls) => (L.symbol ? finishSvg(symEl(L.symbol.id, L.symbol.color, cls), L.symbol.mat ? lookFinish(L, { m: L.symbol.mat, color: L.symbol.color }) : null) : null);

// ---------- wallets ----------
// things tucked in a row `room` px wide: each laps over the one before by as much as it takes for all to show
function tuck(list, room, cls = '') {
  const row = h('span', { class: `gw-tuck ${cls}` }, list), wide = (el) => (el.classList.contains('th-wide') ? 72 : 52), total = list.reduce((n, el) => n + wide(el), 0);
  const lap = list.length > 1 ? Math.max(-6, (total - room) / (list.length - 1)) : 0; list.forEach((el, i) => { if (i) el.style.marginLeft = `${(-lap).toFixed(1)}px`; });
  return row;
}
// hold: { cards: [el], passes: [el] } (what it shows tucked in it; none: it lies open and empty)
function walletFace(id, cls, hold) {
  const Wl = D.WALLETS[id] || {}, L = walletLook(id, Wl), cards = hold.cards || [], passes = hold.passes || [];
  const made = (c, f = lookFinish(L)) => finishOn(h('i', { class: c }), f), pocket = (c) => made(c, lookFinish(L, { m: L.pocket.mat, color: L.pocket.color })), stitch = () => (L.stitch ? h('i', { class: 'gw-stitch' }) : null);
  const vars = { '--wc': L.color, '--w-flap': `${L.flap}px`, '--w-round': `${L.round}px`, '--w-trim': L.trim || 'color-mix(in srgb, var(--wc) 55%, #000)', '--w-lining': L.lining || 'color-mix(in srgb, var(--wc) 30%, #000)' };
  let kids;
  if (L.type === 'clip') kids = [tuck([...cards, ...passes], 150, 'all'), made('gw-band'), h('i', { class: 'gw-band-shine' })];
  else if (L.type === 'clasped') kids = [made('gw-flap'), h('i', { class: `gw-clasp ${L.clasp}` }), h('i', { class: 'gw-inside' }), tuck([...cards, ...passes], 156, 'all'), pocket('gw-front'), stitch()];
  else { const leaf = (side, list) => h('span', { class: `gw-leaf ${side}` }, made('gw-panel'), h('i', { class: 'gw-inside' }), tuck(list, 100), pocket('gw-front'), stitch()); kids = [leaf('l', cards), h('i', { class: 'gw-spine' }), leaf('r', passes)]; }
  const el = h('span', { class: `gw gw-${L.type} ${Wl.crown ? 'crown' : ''} ${cls}`, style: vars }, ...kids); const em = emblemEl(L, 'wsym'); if (em) el.append(em);
  return el;
}
export function walletEl(id, cls = '', hold = {}) {
  const Wl = D.WALLETS[id] || {}, L = walletLook(id, Wl), copy = (list) => (list || []).map((el) => el.cloneNode(true));
  const clip = L.type === 'clip'; // a clip has no body of its own: it is the band, and what it holds
  return thing(walletFace(id, cls, hold), { mat: L.mat, color: L.color, radius: L.round, scale: 2.2, name: Wl.name || id, sub: WALLET_TYPES[L.type], cls: `th-wallet ${cls}`, ...(clip ? { edge: () => h('span', { class: 'gw gw-clip' }, finishOn(h('i', { class: 'gw-band' }), lookFinish(L))) } : {}),
    back: () => { if (clip) return h('span', { class: 'gw gw-clip' }, finishOn(h('i', { class: 'gw-band' }), lookFinish(L))); const b = finishOn(h('span', { class: `gw-back gw-${L.type}`, style: { '--w-round': `${L.round}px` } }), lookFinish(L)); const em = emblemEl(L, 'wsym big'); if (em) b.append(em); return b; },
    make: () => walletFace(id, cls, { cards: copy(hold.cards), passes: copy(hold.passes) }) });
}

// ---------- jackets ----------
const NS = 'http://www.w3.org/2000/svg';
const s = (tag, attrs = {}, kids = []) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v); e.append(...kids.filter(Boolean)); return e; };
const mirror = (pts) => pts.map(([x, y]) => [64 - x, y]), poly = (pts) => pts.map(([x, y]) => `${x},${y}`).join(' ');
// flat: one colour for every part (the outline, for the body's edge and back)
function jacketSvg(L, flat = null) {
  const hem = 52 + L.length, svg = s('svg', { class: 'gj-art', viewBox: `0 0 64 ${hem + 4}`, width: 64, height: hem + 4, 'aria-hidden': 'true' });
  const paint = (P, glint = true) => flat || svgPaint(svg, { m: P.mat, color: P.color, glint: glint && L.glint, sparkle: L.sparkle }, P.color);
  const body = paint(L), arms = paint(L.sleeves), trimC = L.trim.color || shade(L.color, 0.55), trim = flat || (FINISHES[L.trim.mat] && L.trim.color ? svgPaint(svg, { m: L.trim.mat, color: L.trim.color }) : trimC);
  const line = { stroke: 'rgba(0,0,0,.42)', 'stroke-width': 0.6, 'stroke-linejoin': 'round' }, P = (pts, fill, more = {}) => s('polygon', { points: poly(pts), fill, ...line, ...more });
  const sleeve = [[17, 11], [7, 18], [3, 45], [10, 47], [15, 27], [16.5, 24]], cuff = [[3.4, 41], [10.5, 43.2], [10, 47], [3, 45]], torso = [[22, 8], [42, 8], [48, 13], [47, hem], [17, hem], [16, 13]];
  if (L.collar === 'hood') svg.append(s('path', { d: 'M20 11C17 -5 47 -5 44 11Z', fill: body, ...line }), flat ? null : s('path', { d: 'M24 10C23 0 41 0 40 10Z', fill: L.lining || 'rgba(0,0,0,.45)' }));
  svg.append(P(sleeve, arms), P(mirror(sleeve), arms), P(torso, body));
  if (flat) return svg;
  if (L.ribbed || L.trim.color) svg.append(P(cuff, trim), P(mirror(cuff), trim));
  if (L.ribbed) svg.append(s('rect', { x: 17, y: hem - 4, width: 30, height: 4, fill: trim, ...line }), ...Array.from({ length: 9 }, (_, i) => s('line', { x1: 19 + i * 3.3, y1: hem - 3.6, x2: 19 + i * 3.3, y2: hem - 0.4, stroke: 'rgba(0,0,0,.3)', 'stroke-width': 0.5 })));
  // the collar, and how far down the front opens under it
  let open = 10;
  if (L.collar === 'lapel') { open = 24; const lap = [[26, 8], [32, 24], [23.5, 17.5], [22, 9]]; svg.append(P([[26, 8], [38, 8], [32, 23]], L.lining || 'rgba(0,0,0,.5)'), P(lap, trim), P(mirror(lap), trim)); }
  else if (L.collar === 'stand') svg.append(s('rect', { x: 24.5, y: 4.5, width: 15, height: 5.5, rx: 1.2, fill: trim, ...line }));
  else if (L.collar === 'crew') svg.append(s('path', { d: 'M25 8Q32 15 39 8', fill: 'none', stroke: trim, 'stroke-width': 2.6, 'stroke-linecap': 'round' }));
  else svg.append(s('path', { d: 'M25 9Q32 15 39 9', fill: 'none', stroke: 'rgba(0,0,0,.4)', 'stroke-width': 0.8 }));
  // the closure down the front
  if (L.closure === 'open') svg.append(P([[29.5, open], [34.5, open], [35.5, hem], [28.5, hem]], L.lining || 'rgba(0,0,0,.5)'));
  else if (L.closure === 'zip') svg.append(s('line', { x1: 32, y1: open, x2: 32, y2: hem, stroke: 'rgba(255,255,255,.75)', 'stroke-width': 0.9, 'stroke-dasharray': '0.9 0.7' }), s('rect', { x: 31, y: open + 1, width: 2, height: 3.4, rx: 0.6, fill: '#e8e8f2', stroke: 'rgba(0,0,0,.5)', 'stroke-width': 0.3 }));
  else svg.append(s('line', { x1: 32, y1: open, x2: 32, y2: hem, stroke: 'rgba(0,0,0,.45)', 'stroke-width': 0.7 }));
  if (L.closure === 'buttons') for (let i = 0; i < L.buttons; i++) { const y = open + 4 + i * ((hem - open - 8) / Math.max(1, L.buttons - 1 || 1)) * (L.buttons > 1 ? 1 : 0.3); svg.append(s('circle', { cx: 34.2, cy: y, r: 1.25, fill: L.buttonColor || '#f1e7c8', stroke: 'rgba(0,0,0,.55)', 'stroke-width': 0.35 })); }
  for (let i = 0; i < L.pockets; i++) { const x = i ? 37 : 20, y = Math.min(hem - 9, 39); svg.append(s('rect', { x, y, width: 7, height: 1.8, rx: 0.5, fill: trim, ...line })); }
  // a fold of shade down each side, so the cloth reads as cloth
  svg.append(s('path', { d: `M17.6 16L18.4 ${hem - 1}M46.4 16L45.6 ${hem - 1}`, fill: 'none', stroke: 'rgba(0,0,0,.18)', 'stroke-width': 1.4 }));
  return svg;
}
function jacketFace(id, cls) {
  const J = D.JACKETS[id] || {}, L = jacketLook(id, J);
  const el = h('span', { class: `gj gj-${L.style} ${cls}` }, jacketSvg(L), h('span', { class: 'mods' }, Object.entries(J.mods || {}).map(([k, n]) => h('b', { class: n > 0 ? 'p' : 'n', text: `${n > 0 ? '+' : ''}${n}` }))));
  const em = emblemEl(L, 'jsym'); if (em) el.append(em); return el;
}
export function jacketEl(id, cls = '') {
  const J = D.JACKETS[id] || {}, L = jacketLook(id, J), dark = shade(L.color, 0.62);
  return thing(jacketFace(id, cls), { mat: L.mat, color: L.color, scale: 1.8, name: J.name || id, sub: `${JACKET_STYLES[L.style]} · ${J.effect || ''}`, cls: `th-jacket ${cls}`,
    edge: () => h('span', { class: 'gj' }, jacketSvg(L, dark)), back: () => { const b = h('span', { class: 'gj gj-backside' }, jacketSvg({ ...L, collar: L.collar === 'hood' ? 'hood' : 'none', closure: 'none', buttons: 0, pockets: 0 })); const em = emblemEl(L, 'jsym big'); if (em) b.append(em); return b; },
    make: () => jacketFace(id, cls) });
}
