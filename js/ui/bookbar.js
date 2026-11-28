// The Book's and the Pouch's filters and sorts, the same wherever each is shown. A row of small icon buttons, no
// words (each has its hover): filters, lit when what they name is shown; then sorts: click a sort to sort by it, again
// to turn it round, a third time to stop. The choice is the viewer's own and kept (browser storage), and every Book
// (or Pouch) on screen follows it at once.
//   The Book (the table, the floor, the Coat Check, the Trick Trader): a dot for each phase a trick resolves in (its
//   type: Investment, Insurance, Expense, Correction); sorts by phase, by the sides of the dice its Bonus asks for, by
//   how many dice its Bonus asks for.
//   The Pouch (the table, the floor, the Coat Check): a shape for each size of die it holds (shown or hidden), named
//   dice only; sorts by sides, by material, by dyes.
import { h } from './core.js';
import * as D from '../data.js';
import { petName } from '../dice.js';
import { t as tx } from '../text.js';

const read = (k) => { try { return JSON.parse(globalThis.localStorage?.getItem(k) || 'null'); } catch { return null; } };
const write = (k, v) => { try { globalThis.localStorage?.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };
// one kept choice: { hide: [filters off], only: [toggles on], sort, dir }, and who follows it
function choice(key) {
  const c = { key, state: { hide: [], only: [], sort: null, dir: 1, ...(read(key) || {}) }, subs: new Set() };
  c.set = (s) => { c.state = { ...c.state, ...s }; write(key, c.state); for (const f of [...c.subs]) { if (f.el && !f.el.isConnected) { c.subs.delete(f); continue; } f.fn(); } };
  return c;
}
const BOOK = choice('rp.book'), POUCH = choice('rp.pouch');
// in a list's order unless a sort is chosen (ties keep the order they came in)
const sorted = (C, list, by, keyOf) => { const f = by[C.state.sort]; if (!f) return list; return list.map((x, i) => [x, i]).sort((a, b) => (f(keyOf(a[0])) - f(keyOf(b[0]))) * C.state.dir || a[1] - b[1]).map(([x]) => x); };

const BOOK_SORTS = { type: (def) => D.TYPES[def.type]?.order ?? 9, sides: (def) => D.DICE[def.die]?.faces ?? 0, count: (def) => def.count ?? 0 };
const dyeKey = (d) => (d.dyes || []).length * 1000 + Math.min(999, (d.dyes || []).reduce((n, k) => n + Object.keys(D.DYES).indexOf(k) + 1, 0));
const POUCH_SORTS = { sides: (d) => D.DICE[d.type]?.faces ?? 0, mat: (d) => Object.keys(D.MATERIALS).indexOf(d.mat || 'plastic'), dyes: dyeKey };
// call fn whenever the Book's (or the Pouch's) choice changes, while el is on the page
export const onBook = (el, fn) => BOOK.subs.add({ el, fn });
export const onPouch = (el, fn) => POUCH.subs.add({ el, fn });
// a list of tricks (or of things holding one: pick(x) → the trick), as the Book shows it
export function bookView(list, pick = (x) => x) { const hide = new Set(BOOK.state.hide), def = (x) => D.defOf(pick(x)); return sorted(BOOK, list.filter((x) => !hide.has(def(x).type)), BOOK_SORTS, def); }
// a list of dice, as the Pouch shows it
export function pouchView(list) { const hide = new Set(POUCH.state.hide), named = POUCH.state.only.includes('named'); return sorted(POUCH, list.filter((d) => !hide.has(d.type) && (!named || petName(d))), POUCH_SORTS, (d) => d); }

const SVG = (inner) => `<svg viewBox="0 0 16 16" aria-hidden="true">${inner}</svg>`;
const ICONS = {
  // by phase: four bars, one under the next
  type: SVG('<rect x="2" y="2" width="12" height="2.2" rx="1"/><rect x="2" y="5.4" width="9" height="2.2" rx="1"/><rect x="2" y="8.8" width="6" height="2.2" rx="1"/><rect x="2" y="12.2" width="3" height="2.2" rx="1"/>'),
  // by sides: a die's outline with its sides drawn in
  sides: SVG('<path d="M8 1.5L14 5v6l-6 3.5L2 11V5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M8 1.5v5.5M2 5l6 2 6-2M8 7l-4 6.2M8 7l4 6.2" fill="none" stroke="currentColor" stroke-width=".9"/>'),
  // by count: two dice, one behind the other
  count: SVG('<rect x="1.5" y="5.5" width="8" height="8" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.4"/><rect x="6.5" y="2.5" width="8" height="8" rx="1.6" fill="currentColor" opacity=".55"/><circle cx="4" cy="8" r=".9"/><circle cx="7" cy="11" r=".9"/>'),
  // by material: a swatch, half clear and half solid
  mat: SVG('<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 2a6 6 0 0 1 0 12z"/><path d="M4.2 5.6l2 0M4 8h2.4" stroke="currentColor" stroke-width=".9"/>'),
  // by dyes: three drops
  dyes: SVG('<path d="M5 2.5C3.6 4.6 2.5 6 2.5 7.4a2.5 2.5 0 0 0 5 0C7.5 6 6.4 4.6 5 2.5z"/><path d="M11 2.5c-1.4 2.1-2.5 3.5-2.5 4.9a2.5 2.5 0 0 0 5 0c0-1.4-1.1-2.8-2.5-4.9z" opacity=".7"/><path d="M8 8.5c-1.4 2.1-2.5 3.5-2.5 4.9" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M8 8.5c1.4 2.1 2.5 3.5 2.5 4.9a2.5 2.5 0 0 1-5 0" fill="none" stroke="currentColor" stroke-width="1.2"/>'),
  // named only: a tag
  named: SVG('<path d="M2 3.5h6.5L14 8l-5.5 4.5H2z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="5" cy="8" r="1.2"/>'),
};
// a die's size as a shape: its outline, with its number of sides
const SHAPE = { d4: 'M8 2L14.5 13.5H1.5z', d6: 'M2.5 2.5h11v11h-11z', d8: 'M8 1.5L14.5 8 8 14.5 1.5 8z', d10: 'M8 1.5L14 7 8 14.5 2 7z', d12: 'M8 1.5l6.2 4.5-2.4 7.5H4.2L1.8 6z', d20: 'M8 1.5l5.6 3.2v6.6L8 14.5l-5.6-3.2V4.7z' };
const dieIcon = (type) => SVG(`<path d="${SHAPE[type] || SHAPE.d6}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>`);

// the row of buttons: filters ([{ k, cls, style, html, tip, kind: 'hide' (lit unless hidden) | 'only' (lit when on) }]),
// then the sorts
function bar(C, cls, filters, sorts, label) {
  const el = h('div', { class: `book-bar ${cls}` });
  const draw = () => { const S = C.state, fs = filters();
    const fb = fs.map((f) => { const on = f.kind === 'only' ? S.only.includes(f.k) : !S.hide.includes(f.k);
      return h('button', { class: `${f.cls} ${on ? 'on' : 'off'}`, style: f.style, 'aria-label': f.label, html: f.html, tip: f.tip,
        onclick: (ev) => { ev.stopPropagation(); if (f.kind === 'only') { const o = new Set(S.only); if (o.has(f.k)) o.delete(f.k); else o.add(f.k); return C.set({ only: [...o] }); }
          const hd = new Set(S.hide); if (hd.has(f.k)) hd.delete(f.k); else hd.add(f.k); if (fs.filter((x) => x.kind !== 'only').every((x) => hd.has(x.k))) for (const x of fs) hd.delete(x.k); C.set({ hide: [...hd] }); } }); });
    const sb = sorts.map((k) => h('button', { class: `bb-sort ${S.sort === k ? `on ${S.dir < 0 ? 'down' : 'up'}` : ''}`, 'aria-label': label(k), html: ICONS[k], tip: () => `<b>${label(k)}</b><p>${tx('book.sort.tip')}</p>`,
      onclick: (ev) => { ev.stopPropagation(); C.set(S.sort !== k ? { sort: k, dir: 1 } : S.dir > 0 ? { dir: -1 } : { sort: null, dir: 1 }); } }));
    el.replaceChildren(...fb, h('span', { class: 'bb-gap' }), ...sb); };
  draw(); C.subs.add({ el, fn: draw }); return el;
}
// the Book's row
export const bookBar = (cls = '') => bar(BOOK, cls, () => Object.entries(D.TYPES).sort((a, b) => a[1].order - b[1].order).map(([k, T]) => ({ k, cls: 'bb-type', style: { '--tc': T.color }, label: T.name, html: '<i></i>', tip: () => tx('book.filter.tip', { name: T.name, text: T.text }) })),
  Object.keys(BOOK_SORTS), (k) => tx(`book.sort.${k}`));
// the Pouch's row: a shape for each size of die among `dice()` (what it holds now), and named dice only
export const pouchBar = (dice, cls = '') => bar(POUCH, cls, () => [...[...new Set(dice().map((d) => d.type))].sort((a, b) => D.DICE[a].faces - D.DICE[b].faces).map((k) => ({ k, cls: 'bb-die', label: k, html: dieIcon(k), tip: () => tx('pouch.filter.tip', { type: k }) })),
  { k: 'named', kind: 'only', cls: 'bb-named', label: tx('pouch.named'), html: ICONS.named, tip: () => `<b>${tx('pouch.named')}</b><p>${tx('pouch.named.tip')}</p>` }],
  Object.keys(POUCH_SORTS), (k) => tx(`pouch.sort.${k}`));
