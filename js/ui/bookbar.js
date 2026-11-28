// The Book's filters and sorts, the same wherever the Book is shown (the table, the floor, the Coat Check, the Trick
// Trader). A row of small icon buttons, no words: one for each phase a trick resolves in (its type: Investment,
// Insurance, Expense, Correction), lit when shown; then the sorts: by phase, by the sides of the dice its Bonus asks
// for, by how many dice its Bonus asks for. Click a sort to sort by it, again to turn it round, a third time to stop.
// The choice is the viewer's own and kept (browser storage), and every Book on screen follows it at once.
import { h } from './core.js';
import * as D from '../data.js';
import { t as tx } from '../text.js';

const KEY = 'rp.book';
const read = () => { try { return JSON.parse(globalThis.localStorage?.getItem(KEY) || 'null'); } catch { return null; } };
const write = (v) => { try { globalThis.localStorage?.setItem(KEY, JSON.stringify(v)); } catch { /* storage unavailable */ } };
const fresh = () => ({ hide: [], sort: null, dir: 1 });
let state = { ...fresh(), ...(read() || {}) };
const subs = new Set();
const changed = () => { write(state); for (const f of [...subs]) { if (f.el && !f.el.isConnected) { subs.delete(f); continue; } f.fn(); } };
// call fn whenever the choice changes (while el is on the page)
export const onBook = (el, fn) => subs.add({ el, fn });
export const bookState = () => state;

const SORTS = {
  type: (def) => D.TYPES[def.type]?.order ?? 9,
  sides: (def) => D.DICE[def.die]?.faces ?? 0,
  count: (def) => def.count ?? 0,
};
// a list of tricks (or of things holding one: pick(x) → the trick), as the Book shows it: only the phases shown, in
// the order chosen (ties keep the order they came in)
export function bookView(list, pick = (x) => x) {
  const defOf = (x) => D.defOf(pick(x)), hide = new Set(state.hide);
  const out = list.filter((x) => !hide.has(defOf(x).type));
  const by = SORTS[state.sort]; if (!by) return out;
  return out.map((x, i) => [x, i]).sort((a, b) => (by(defOf(a[0])) - by(defOf(b[0]))) * state.dir || a[1] - b[1]).map(([x]) => x);
}
export const bookHides = (t) => state.hide.includes(D.defOf(t).type);

const SVG = (inner) => `<svg viewBox="0 0 16 16" aria-hidden="true">${inner}</svg>`;
const ICONS = {
  // by phase: four bars, one under the next
  type: SVG('<rect x="2" y="2" width="12" height="2.2" rx="1"/><rect x="2" y="5.4" width="9" height="2.2" rx="1"/><rect x="2" y="8.8" width="6" height="2.2" rx="1"/><rect x="2" y="12.2" width="3" height="2.2" rx="1"/>'),
  // by sides: a die's outline with its sides drawn in
  sides: SVG('<path d="M8 1.5L14 5v6l-6 3.5L2 11V5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M8 1.5v5.5M2 5l6 2 6-2M8 7l-4 6.2M8 7l4 6.2" fill="none" stroke="currentColor" stroke-width=".9"/>'),
  // by count: two dice, one behind the other
  count: SVG('<rect x="1.5" y="5.5" width="8" height="8" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.4"/><rect x="6.5" y="2.5" width="8" height="8" rx="1.6" fill="currentColor" opacity=".55"/><circle cx="4" cy="8" r=".9"/><circle cx="7" cy="11" r=".9"/>'),
};
// the row of buttons
export function bookBar(cls = '') {
  const el = h('div', { class: `book-bar ${cls}` });
  const draw = () => {
    const hide = new Set(state.hide);
    const types = Object.entries(D.TYPES).sort((a, b) => a[1].order - b[1].order).map(([k, T]) => h('button', { class: `bb-type ${hide.has(k) ? 'off' : 'on'}`, style: { '--tc': T.color }, 'aria-label': T.name,
      tip: () => tx('book.filter.tip', { name: T.name, text: T.text }),
      onclick: (ev) => { ev.stopPropagation(); const s = new Set(state.hide); if (s.has(k)) s.delete(k); else s.add(k); if (s.size >= Object.keys(D.TYPES).length) s.clear(); state = { ...state, hide: [...s] }; changed(); } }, h('i')));
    const sorts = Object.keys(SORTS).map((k) => h('button', { class: `bb-sort ${state.sort === k ? `on ${state.dir < 0 ? 'down' : 'up'}` : ''}`, 'aria-label': tx(`book.sort.${k}`), html: ICONS[k],
      tip: () => `<b>${tx(`book.sort.${k}`)}</b><p>${tx('book.sort.tip')}</p>`,
      onclick: (ev) => { ev.stopPropagation(); state = state.sort !== k ? { ...state, sort: k, dir: 1 } : state.dir > 0 ? { ...state, dir: -1 } : { ...state, sort: null, dir: 1 }; changed(); } }));
    el.replaceChildren(...types, h('span', { class: 'bb-gap' }), ...sorts);
  };
  draw(); onBook(el, draw); return el;
}
