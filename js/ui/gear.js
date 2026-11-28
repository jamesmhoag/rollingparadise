// Wallets and jackets: drawn from their look (content/finishes.js) and held as things (ui/thing.js: a body as thick as
// what it is made of, the lean under the pointer, the close look).
// A wallet is a padded body that lies shut, with a slot along its top for cash. Under the pointer (or clicked, to
// keep it so) it opens and shows what it holds: the very cards and passes you carry (the same elements drawn
// anywhere else), tucked into its pockets. Three types: a billfold (its cover swings open: cards inside the cover,
// passes in the other leaf), a clasped pouch (its flap lifts off the clasp: everything stands in it) and a clip
// (a band over a folded wad: everything it holds is in plain sight).
// A jacket is drawn in its style (blazer, bomber, long coat, parka), part by part: body, sleeves, collar and trim,
// closure, pockets, emblem, each made of its own material in its own colour, shaded as cloth that hangs.
// What is drawn here is the piece's place and its stand-in: where the renderer is there, each is a body made of its
// materials (ui/gear3d.js: the same material a die of it has), and this drawing gives way to it.
import { h } from './core.js';
import * as D from '../data.js';
import { thing } from './thing.js';
import { finishOn, finishSvg, svgPaint } from './finish.js';
import { walletLook, jacketLook, WALLET_TYPES, JACKET_STYLES, FINISHES } from '../content/finishes.js';
import { symEl } from './parts.js';
import { shade } from '../util.js';
import { embody, JACKET_CUT } from './gear3d.js';

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
// the notes in the cash slot: more of them the more ¢ there is (none: the slot shows empty)
const notesFor = (cash) => (cash > 0 ? Math.min(4, 1 + Math.floor(Math.log10(cash) / 1.4)) : 0);
const cashEl = (cash, cls = '') => h('span', { class: `gw-cash ${cls}` }, h('i', { class: 'gw-slot' }), Array.from({ length: notesFor(cash) }, (_, i) => finishOn(h('i', { class: 'gw-note', style: { '--i': i } }), { m: 'paper', color: ['#8fbf86', '#a5cf9a', '#7fb07a', '#b4d8a6'][i] })));
// hold: { cards: [el], passes: [el], cash: ¢ } (what it shows inside once open; none: its pockets are empty)
function walletFace(id, cls, hold) {
  const Wl = D.WALLETS[id] || {}, L = walletLook(id, Wl), cards = hold.cards || [], passes = hold.passes || [];
  const made = (c, f = lookFinish(L)) => finishOn(h('i', { class: c }), f), pocket = (c) => made(c, lookFinish(L, { m: L.pocket.mat, color: L.pocket.color })), stitch = () => (L.stitch ? h('i', { class: 'gw-stitch' }) : null);
  const vars = { '--wc': L.color, '--w-flap': `${L.flap}px`, '--w-round': `${L.round}px`, '--w-trim': L.trim || 'color-mix(in srgb, var(--wc) 55%, #000)', '--w-lining': L.lining || 'color-mix(in srgb, var(--wc) 30%, #000)' };
  // the outside of a cover or flap: padded, stitched, with the emblem on it · a pocketed inside holding `list`
  const outside = (c, ...more) => h('span', { class: `gw-out ${c}` }, made('gw-skin'), h('i', { class: 'gw-pad' }), stitch(), ...more);
  const well = (list, room) => [h('i', { class: 'gw-inside' }), tuck(list, room), pocket('gw-front'), L.stitch ? h('i', { class: 'gw-stitch low' }) : null];
  let kids;
  if (L.type === 'clip') kids = [h('span', { class: 'gw-wad' }, cashEl(hold.cash || 1, 'folded')), tuck([...cards, ...passes], 138, 'all'), made('gw-band'), h('i', { class: 'gw-band-shine' })];
  else if (L.type === 'clasped') kids = [h('span', { class: 'gw-base' }, made('gw-skin'), cashEl(hold.cash), ...well([...cards, ...passes], 124), L.clasp === 'chain' ? h('i', { class: 'gw-clasp chain' }) : h('i', { class: `gw-stud ${L.clasp}` })),
    h('span', { class: 'gw-flap' }, outside('', L.clasp === 'chain' ? null : h('i', { class: `gw-clasp ${L.clasp}` }), emblemEl(L, 'wsym')), h('span', { class: 'gw-in' }, h('i', { class: 'gw-lining' })))];
  else kids = [h('span', { class: 'gw-base' }, made('gw-skin'), cashEl(hold.cash), ...well(passes, 100)),
    h('span', { class: 'gw-cover' }, outside('', emblemEl(L, 'wsym')), h('span', { class: 'gw-in' }, made('gw-skin'), ...well(cards, 100)))];
  return h('span', { class: `gw gw-${L.type} ${Wl.crown ? 'crown' : ''} ${cls}`, style: vars }, ...kids, L.type === 'clip' ? null : emblemEl(L, 'wsym g3-em'));
}
export function walletEl(id, cls = '', hold = {}) {
  const Wl = D.WALLETS[id] || {}, L = walletLook(id, Wl), copy = (list) => (list || []).map((el) => el.cloneNode(true));
  const clip = L.type === 'clip'; // a clip has no body of its own: it is the band, and what it holds
  const face = walletFace(id, cls, hold);
  const el = thing(face, { mat: L.mat, color: L.color, radius: L.round, depth: clip ? 3 : 7, name: Wl.name || id, sub: WALLET_TYPES[L.type], cls: `th-wallet th-${L.type} ${cls}`, ...(clip ? { edge: () => h('span', { class: 'gw gw-clip' }, finishOn(h('i', { class: 'gw-band' }), lookFinish(L))) } : {}),
    back: () => { if (clip) return h('span', { class: 'gw gw-clip' }, finishOn(h('i', { class: 'gw-band' }), lookFinish(L))); const b = finishOn(h('span', { class: `gw-back gw-${L.type}`, style: { '--w-round': `${L.round}px` } }, h('i', { class: 'gw-pad' })), lookFinish(L)); const em = emblemEl(L, 'wsym big'); if (em) b.append(em); return b; },
    make: () => { const f = walletFace(id, cls, { cards: copy(hold.cards), passes: copy(hold.passes), cash: hold.cash }); f.classList.toggle('pin', face.classList.contains('pin')); return f; } });
  // a click keeps it open, or shuts it again (a click on something it holds is that thing's own)
  if (!clip) el.addEventListener('click', (ev) => { if (ev.target.closest('.thing') === el) face.classList.toggle('pin'); });
  const notes = clip ? notesFor(hold.cash || 1) : notesFor(hold.cash);
  // held up close (ui/gear3d.js heldIn): one slit for each card it can hold and each pass, and the very cards and passes in them
  embody(el, face, { kind: 'wallet', look: L, notes, name: Wl.name || id, sub: WALLET_TYPES[L.type], pinned: () => face.classList.contains('pin'),
    slots: { cards: Math.max(1, Wl.slots || 1), passes: Math.max(1, Wl.passes || 1) }, held: () => ({ cards: hold.cards || [], passes: hold.passes || [] }) });
  return el;
}

// ---------- jackets ----------
const NS = 'http://www.w3.org/2000/svg';
const s = (tag, attrs = {}, kids = []) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v); e.append(...kids.filter(Boolean)); return e; };
let shadeN = 0;
// soft shading as SVG gradients: `stops` is [[offset, colour]...], across (x) or down (y) the shape it fills
const grad = (svg, stops, down) => { const id = `gj-g${++shadeN}`; let defs = svg.querySelector('defs'); if (!defs) { defs = s('defs'); svg.prepend(defs); }
  defs.append(s('linearGradient', { id, x1: 0, y1: 0, x2: down ? 0 : 1, y2: down ? 1 : 0 }, stops.map(([o, c]) => s('stop', { offset: o, 'stop-color': c })))); return `url(#${id})`; };
const INK = 'rgba(0,0,0,', LIT = 'rgba(255,255,255,';
// flat: one colour for every part (the outline, for the body's edge and back)
function jacketSvg(L, flat = null) {
  const hem = 52 + L.length, svg = s('svg', { class: 'gj-art', viewBox: `0 0 64 ${hem + 5}`, width: 64, height: hem + 5, 'aria-hidden': 'true' });
  const paint = (P, glint = true) => flat || svgPaint(svg, { m: P.mat, color: P.color, glint: glint && L.glint, sparkle: L.sparkle }, P.color);
  const body = paint(L), arms = paint(L.sleeves), trimC = L.trim.color || shade(L.color, 0.55), trim = flat || (FINISHES[L.trim.mat] && L.trim.color ? svgPaint(svg, { m: L.trim.mat, color: L.trim.color }) : trimC), lining = L.lining || shade(L.color, 0.28);
  const line = { stroke: `${INK}.5)`, 'stroke-width': 0.5, 'stroke-linejoin': 'round' }, P = (d, fill, more = {}) => s('path', { d, fill, ...line, ...more });
  const both = (make) => [make(), s('g', { transform: 'matrix(-1 0 0 1 64 0)' }, [make()])]; // a part and its mirror image
  // the shapes: a sleeve hanging from the shoulder with a bend at the elbow, the torso with sloped shoulders and a waist
  const { sleeve, cuff, lapel: lap, stand, hood, hoodIn } = JACKET_CUT, torso = JACKET_CUT.torso(hem); // the cut is the body's too (ui/gear3d.js)
  if (L.collar === 'hood') svg.append(P(hood, body), flat ? null : P(hoodIn, lining, { stroke: 'none' }), flat ? null : P(hoodIn, grad(svg, [[0, `${INK}.7)`], [1, `${INK}.15)`]], true), { stroke: 'none' }));
  svg.append(...both(() => P(sleeve, arms)), P(torso, body));
  if (flat) return svg;
  // the inside of the back, seen through the neck (with its label), behind everything at the front
  svg.append(P('M24.4 8.3Q32 5.6 39.6 8.3Q32 13.4 24.4 8.3Z', lining, { stroke: 'none' }), s('rect', { x: 30.2, y: 7.3, width: 3.6, height: 1.7, rx: 0.3, fill: `${LIT}.7)` }));
  // how cloth hangs: each sleeve a tube (dark at its edges), the body round across the chest and darker to the hem,
  // the armholes in shadow, and a few folds
  svg.append(...both(() => P(sleeve, grad(svg, [[0, `${INK}.46)`], [0.42, `${LIT}.14)`], [0.75, `${INK}.08)`], [1, `${INK}.4)`]]), { stroke: 'none' })),
    P(torso, grad(svg, [[0, `${INK}.44)`], [0.2, `${INK}.04)`], [0.38, `${LIT}.13)`], [0.62, `${LIT}.08)`], [0.82, `${INK}.06)`], [1, `${INK}.44)`]]), { stroke: 'none' }),
    P(torso, grad(svg, [[0, `${LIT}.12)`], [0.3, `${LIT}0)`], [1, `${INK}.26)`]], true), { stroke: 'none' }),
    ...both(() => s('path', { d: 'M17.4 12.6Q18.6 18 17.6 23', fill: 'none', stroke: `${INK}.2)`, 'stroke-width': 1.1, 'stroke-linecap': 'round' })),
    ...both(() => s('path', { d: `M19.6 ${hem - 15}Q21.4 ${hem - 8} 20.2 ${hem - 1.4}M8.3 29.4Q10.6 30.8 12.8 29.6M6.6 34.6Q8.8 36 11.4 34.9`, fill: 'none', stroke: `${INK}.2)`, 'stroke-width': 0.7, 'stroke-linecap': 'round' })),
    ...both(() => s('path', { d: 'M22.6 8.2L16.4 11.5', fill: 'none', stroke: `${LIT}.28)`, 'stroke-width': 0.6, 'stroke-linecap': 'round' })));
  // cuffs and hem
  const ribs = (x0, x1, y0, y1, n) => Array.from({ length: n }, (_, i) => { const x = x0 + ((x1 - x0) * (i + 0.5)) / n; return s('line', { x1: x, y1: y0, x2: x, y2: y1, stroke: `${INK}.32)`, 'stroke-width': 0.45 }); });
  if (L.ribbed || L.trim.color) svg.append(...both(() => P(cuff, trim)), ...both(() => s('path', { d: 'M3.5 40.4Q7.2 42.6 11.3 42', fill: 'none', stroke: `${INK}.45)`, 'stroke-width': 0.9 })));
  else svg.append(...both(() => s('path', { d: 'M3.4 41.2Q7.2 43.3 11.2 42.7', fill: 'none', stroke: `${INK}.3)`, 'stroke-width': 0.5 })));
  if (L.ribbed) svg.append(P(JACKET_CUT.hem(hem), trim), ...ribs(18.5, 45.5, hem - 3.2, hem + 0.6, 12));
  else svg.append(s('path', { d: `M17.2 ${hem - 1.6}Q32 ${hem + 0.8} 46.8 ${hem - 1.6}`, fill: 'none', stroke: `${INK}.26)`, 'stroke-width': 0.5 }));
  // the closure down the front, under the collar; `open` is how far down the collar opens
  const open = L.collar === 'lapel' ? 24 : 9.6;
  if (L.closure === 'open') svg.append(P(`M29.4 ${open}L34.6 ${open}L36 ${hem + 0.8}Q32 ${hem + 1.6} 28 ${hem + 0.8}Z`, lining), P(`M29.4 ${open}L34.6 ${open}L36 ${hem + 0.8}Q32 ${hem + 1.6} 28 ${hem + 0.8}Z`, grad(svg, [[0, `${INK}.55)`], [0.5, `${INK}.1)`], [1, `${INK}.55)`]]), { stroke: 'none' }));
  else if (L.closure === 'zip') svg.append(s('path', { d: `M30.9 ${open}L30.9 ${hem + 1.3}M33.1 ${open}L33.1 ${hem + 1.3}`, fill: 'none', stroke: `${INK}.34)`, 'stroke-width': 0.5 }), s('line', { x1: 32, y1: open, x2: 32, y2: hem + 1.4, stroke: '#d9dbe6', 'stroke-width': 1, 'stroke-dasharray': '0.7 0.6' }),
    s('rect', { x: 31.1, y: open + 0.6, width: 1.8, height: 2.2, rx: 0.5, fill: '#eceef6', stroke: `${INK}.6)`, 'stroke-width': 0.3 }), s('rect', { x: 31.5, y: open + 2.6, width: 1, height: 3, rx: 0.5, fill: '#c6c9d6', stroke: `${INK}.6)`, 'stroke-width': 0.3 }));
  else svg.append(s('path', { d: `M33.2 ${open}Q34 ${(open + hem) / 2} 33.4 ${hem + 1.2}`, fill: 'none', stroke: `${INK}.5)`, 'stroke-width': 0.6 }), s('path', { d: `M33.9 ${open}Q34.7 ${(open + hem) / 2} 34.1 ${hem + 1.2}`, fill: 'none', stroke: `${LIT}.16)`, 'stroke-width': 0.5 }));
  if (L.closure === 'buttons') for (let i = 0; i < L.buttons; i++) { const y = open + 4 + (L.buttons > 1 ? (i * (hem - open - 10)) / (L.buttons - 1) : (hem - open) * 0.28), c = L.buttonColor || '#f1e7c8';
    svg.append(s('ellipse', { cx: 31.5, cy: y + 0.5, rx: 1.5, ry: 1.3, fill: `${INK}.35)` }), s('circle', { cx: 31.3, cy: y, r: 1.3, fill: c, stroke: `${INK}.6)`, 'stroke-width': 0.35 }), s('circle', { cx: 30.9, cy: y - 0.4, r: 0.5, fill: `${LIT}.6)` }), s('path', { d: `M30.9 ${y}h0.01M31.7 ${y}h0.01`, stroke: `${INK}.7)`, 'stroke-width': 0.35, 'stroke-linecap': 'round' })); }
  // the collar, over the closure, with the shadow it throws on the chest
  if (L.collar === 'lapel') svg.append(P('M25.6 7.6Q32 12 38.4 7.6L32.6 24.2Z', lining), P('M25.6 7.6Q32 12 38.4 7.6L32.6 24.2Z', grad(svg, [[0, `${INK}.6)`], [1, `${INK}.05)`]], true), { stroke: 'none' }),
      ...both(() => s('path', { d: lap, fill: `${INK}.3)`, transform: 'translate(0.5 1.1)' })), ...both(() => P(lap, trim)), ...both(() => P(lap, grad(svg, [[0, `${LIT}.2)`], [0.6, `${LIT}0)`], [1, `${INK}.3)`]]), { stroke: 'none' })),
      ...both(() => s('path', { d: 'M25.9 9Q28.6 16 32 23', fill: 'none', stroke: `${LIT}.2)`, 'stroke-width': 0.45 })));
  else if (L.collar === 'stand') svg.append(P(stand, trim), P(stand, grad(svg, [[0, `${INK}.4)`], [0.5, `${LIT}.14)`], [1, `${INK}.4)`]]), { stroke: 'none' }),
    ...(L.ribbed ? ribs(25, 39, 4.4, 10.4, 9) : []), s('path', { d: 'M24.2 10.4Q32 13.6 39.8 10.4', fill: 'none', stroke: `${INK}.35)`, 'stroke-width': 0.9 }));
  else if (L.collar === 'crew') svg.append(s('path', { d: 'M24.4 8.2Q32 15.6 39.6 8.2', fill: 'none', stroke: `${INK}.35)`, 'stroke-width': 3.4, 'stroke-linecap': 'round', transform: 'translate(0 0.7)' }), s('path', { d: 'M24.4 8.2Q32 15.6 39.6 8.2', fill: 'none', stroke: trim, 'stroke-width': 2.6, 'stroke-linecap': 'round' }), s('path', { d: 'M24.6 7.6Q32 14.6 39.4 7.6', fill: 'none', stroke: `${LIT}.22)`, 'stroke-width': 0.5 }));
  else if (L.collar === 'hood') svg.append(s('path', { d: 'M23.6 9.6Q32 15 40.4 9.6', fill: 'none', stroke: `${INK}.45)`, 'stroke-width': 1 }), ...both(() => s('path', { d: 'M29.4 11.6Q28.8 16 29.6 19.6', fill: 'none', stroke: `${LIT}.75)`, 'stroke-width': 0.5, 'stroke-linecap': 'round' })), ...both(() => s('circle', { cx: 29.6, cy: 20, r: 0.6, fill: '#d9dbe6' })));
  else svg.append(s('path', { d: 'M24.6 8.4Q32 14.4 39.4 8.4', fill: 'none', stroke: `${INK}.4)`, 'stroke-width': 0.8 }));
  // pockets, as the style cuts them: a blazer's and a coat's flaps, a bomber's slanted welts, a parka's patch pockets
  const py = Math.min(hem - 10, 38.5);
  const pocketOf = () => (L.style === 'bomber' ? [s('path', { d: `M19.6 ${py + 4.4}L24.4 ${py - 1.6}`, fill: 'none', stroke: `${INK}.4)`, 'stroke-width': 1.7, 'stroke-linecap': 'round' }), s('path', { d: `M19.6 ${py + 4.4}L24.4 ${py - 1.6}`, fill: 'none', stroke: trim, 'stroke-width': 1, 'stroke-linecap': 'round' })]
    : L.style === 'parka' ? [P(`M19 ${py - 1}h8.4v6.6q-4.2 1.4-8.4 0Z`, body), P(`M19 ${py - 1}h8.4v6.6q-4.2 1.4-8.4 0Z`, grad(svg, [[0, `${LIT}.1)`], [1, `${INK}.26)`]], true), { stroke: 'none' }), P(`M18.6 ${py - 1.6}h9.2v2.6q-4.6 1.2-9.2 0Z`, trim)]
      : [s('path', { d: `M19.2 ${py + 0.2}h8.2v2.5q-4.1 1-8.2 0Z`, fill: `${INK}.3)`, transform: 'translate(0.3 0.8)' }), P(`M19.2 ${py}h8.2v2.5q-4.1 1-8.2 0Z`, trim), s('path', { d: `M19.4 ${py + 0.5}h7.8`, fill: 'none', stroke: `${LIT}.25)`, 'stroke-width': 0.4 })]);
  if (L.pockets > 0) svg.append(s('g', {}, pocketOf())); if (L.pockets > 1) svg.append(s('g', { transform: 'matrix(-1 0 0 1 64 0)' }, pocketOf()));
  if (L.collar === 'lapel' && L.pockets > 0) svg.append(s('path', { d: 'M37.4 21.6l5.6 -0.7', fill: 'none', stroke: `${INK}.42)`, 'stroke-width': 0.9, 'stroke-linecap': 'round' })); // the breast pocket's welt
  return svg;
}
function jacketFace(id, cls) {
  const J = D.JACKETS[id] || {}, L = jacketLook(id, J);
  const el = h('span', { class: `gj gj-${L.style} ${cls}` }, jacketSvg(L));
  const em = emblemEl(L, 'jsym'); if (em) el.append(em); return el;
}
export function jacketEl(id, cls = '') {
  const J = D.JACKETS[id] || {}, L = jacketLook(id, J), dark = shade(L.color, 0.62);
  const face = jacketFace(id, cls), el = thing(face, { mat: L.mat, color: L.color, depth: 4.5, name: J.name || id, sub: `${JACKET_STYLES[L.style]} · ${J.effect || ''}`, cls: `th-jacket ${cls}`,
    edge: () => h('span', { class: 'gj' }, jacketSvg(L, dark)), back: () => { const b = h('span', { class: 'gj gj-backside' }, jacketSvg({ ...L, collar: L.collar === 'hood' ? 'hood' : 'none', closure: 'none', buttons: 0, pockets: 0 })); const em = emblemEl(L, 'jsym big'); if (em) b.append(em); return b; },
    make: () => jacketFace(id, cls) });
  embody(el, face, { kind: 'jacket', look: L, name: J.name || id, sub: `${JACKET_STYLES[L.style]} · ${J.effect || ''}` });
  return el;
}
