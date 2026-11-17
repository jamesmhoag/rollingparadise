// Build mode: the Class maker and the Opponent maker (rows 4 and 12). Classes are the Rollers' builds; the roster
// lists every opponent and High Roller with its loadout, behaviour and (for High Rollers) its phases.
import { h, btn, toast, paint } from './core.js';
import * as D from '../data.js';
import * as R from '../run.js';
import * as B from '../build/draft.js';
import { t } from '../text.js';
import { NEW_OPPONENT, NEW_BOSS } from '../content/roster.js';
import { diceSummary } from './app.js';

const isObj = (x) => x && typeof x === 'object';
// small form helpers bound to one entry's path
function form(base, redraw) {
  const P = (...ks) => ks.reduce((p, k) => D.subPath(p, k), base);
  const set = (ks, v) => { B.setValue(P(...ks), v); redraw(); };
  const field = (label, el, ks) => h('div', { class: `b-field ${ks && B.changed(P(...ks)) ? 'ch' : ''}` }, h('label', { text: label }), el,
    ks && P(...ks) in B.draft.changes ? btn('↺', () => { B.revert(P(...ks)); redraw(); }, null, 'small b-revert') : h('span'));
  const select = (ks, list, value, onSet) => h('select', { onchange: (e) => (onSet || ((v) => set(ks, v)))(e.target.value === '' ? null : e.target.value) },
    list.map(([v, l]) => h('option', { value: v ?? '', ...(String(v ?? '') === String(value ?? '') ? { selected: 'selected' } : {}), text: l })));
  const number = (ks, value, o = {}) => h('input', { type: 'number', step: o.step || 1, ...(o.min != null ? { min: o.min } : {}), value: value ?? '', placeholder: o.ph || '', style: o.w ? { width: o.w } : {}, onchange: (e) => (o.on || ((v) => set(ks, v)))(e.target.value === '' ? null : Number(e.target.value)) });
  const text = (ks, value) => h('input', { type: 'text', value: value ?? '', onchange: (e) => set(ks, e.target.value) });
  const checks = (ks, opts, list) => h('div', { class: 'b-checks' }, opts.map(([k, l]) => h('label', { class: 'b-check' },
    h('input', { type: 'checkbox', ...(list.includes(k) ? { checked: 'checked' } : {}), onchange: (e) => set(ks, e.target.checked ? [...list, k].sort() : list.filter((x) => x !== k)) }), l)));
  return { P, set, field, select, number, text, checks };
}
const ask = (label, def, taken) => { const id = (globalThis.prompt?.(label, def) || '').trim();
  if (!id) return null; if (!/^\w+$/.test(id)) { toast(t('build.duplicate.badId'), 'warn'); return null; }
  if (taken[id]) { toast(t('build.duplicate.taken', { id }), 'warn'); return null; } return id; };

// ---------- classes ----------
const GROUPS = [['tip', ['trickery', 'ingenuity', 'proficiency']], ['c', ['charisma', 'cunning', 'conviction']], ['bvd', ['balance', 'versatility', 'depth']]];
export function newClass(from) {
  const id = ask(t('roster.class.newId'), 'my_class', D.CLASSES); if (!id) return null;
  B.setValue(D.subPath('CLASSES', id), { ...JSON.parse(JSON.stringify(D.CLASSES[from || 'hustler'])), name: 'New class', hero: 'Hero' }); return id;
}
export function classMaker(id, redraw) {
  const K = D.CLASSES[id]; if (!K) return h('p', { class: 'sub', text: t('maker.none') });
  const f = form(D.subPath('CLASSES', id), redraw), stat = (k) => D.STATS[k];
  return h('div', { class: 'b-maker' }, h('div', { class: 'b-fields' },
    h('span', { class: 'cap', text: t('roster.part.class') }),
    f.field(t('maker.name'), f.text(['name'], K.name), ['name']), f.field(t('roster.hero'), f.text(['hero'], K.hero), ['hero']),
    f.field(t('chipmaker.text'), h('textarea', { rows: 2, text: K.blurb, onchange: (e) => f.set(['blurb'], e.target.value) }), ['blurb']),
    ...GROUPS.flatMap(([g, ks]) => [h('span', { class: 'cap', text: t(`roster.group.${g}`) }),
      ...ks.map((k) => f.field(`${stat(k).name} (${stat(k).short})`, f.number([g, k], K[g][k], { min: g === 'tip' ? 1 : -3 }), [g, k]))]),
    h('span', { class: 'cap', text: t('roster.part.kit') }),
    f.field(t('roster.primary'), f.select(['primary'], GROUPS[0][1].map((k) => [k, stat(k).name]), K.primary), ['primary']),
    f.field(t('roster.deploy'), f.select(['deploy'], [['start', t('roster.deploy.start')], ['center', t('roster.deploy.center')], ['end', t('roster.deploy.end')]], K.deploy), ['deploy']),
    f.field(t('roster.tricks'), h('input', { type: 'text', value: (K.tricks || []).join(', '), onchange: (e) => { const ids = e.target.value.split(',').map((x) => x.trim()).filter((x) => D.TRICKS[x]); f.set(['tricks'], ids); } }), ['tricks']),
    f.field(t('roster.dice'), h('input', { type: 'text', value: Object.entries(K.dice || {}).map(([k, n]) => `${n}${k}`).join(', '), onchange: (e) => {
      const out = {}; for (const part of e.target.value.split(',')) { const m = /^\s*(\d+)\s*(d\d+)\s*$/.exec(part); if (m && D.DICE[m[2]]) out[m[2]] = (out[m[2]] || 0) + Number(m[1]); } f.set(['dice'], out); } }), ['dice'])),
  h('div', {}, h('span', { class: 'cap', text: t('maker.preview') }), h('div', { class: 'b-card' }, h('b', { text: `${K.hero} the ${K.name}` }), h('p', { text: K.blurb }),
    h('p', { class: 'dim', text: GROUPS.map(([g, ks]) => ks.map((k) => `${stat(k).short} ${K[g][k]}`).join(' · ')).join(' / ') })),
  h('p', { class: 'sub', text: t('roster.class.note') })));
}

// ---------- the roster ----------
export function newOpponent(boss) {
  const id = ask(t('roster.newId'), boss ? 'my_high_roller' : 'my_roller', D.ROSTER); if (!id) return null;
  B.setValue(D.subPath('ROSTER', id), JSON.parse(JSON.stringify(boss ? NEW_BOSS : NEW_OPPONENT))); return id;
}
// what this entry brings to a table on one of its floors, generated the way the game does it
function preview(id) {
  const X = D.ROSTER[id], floor = X.floors?.[0] || 1;
  try {
    const run = R.newRun('hustler', 'standard', 1); run.floor = floor;
    const o = R.genOpponent(run, floor, X.boss ? D.FLOORS[floor].boss : D.FLOORS[floor].worth[(X.tables?.[0]) || 0], { roster: id, name: X.name, ...(X.cls ? { cls: X.cls } : {}), ...(X.boss ? { boss: true } : {}) });
    return h('div', { class: 'b-card' }, h('b', { text: o.name }), h('p', { class: 'dim', text: t('roster.preview.floor', { floor: D.FLOORS[floor].name }) }),
      h('p', { text: `${X.cls ? D.CLASSES[o.cls].name : t('roster.randomClass')} · ${o.worth}¢ · ${o.dims.cols}×${o.dims.barRows} Stake, stacks of ${o.dims.stackMax}` }),
      h('p', { text: `${diceSummary(o.dice)} · ${o.tricks.map((x) => D.TRICKS[x.id]?.name).join(', ')}` }),
      o.drink ? h('p', { text: `${t('roster.drink')}: ${o.drink.name}` }) : null,
      h('p', { class: 'dim', text: Object.entries(o.behave).filter(([k, v]) => v !== D.DEFAULT_BEHAVE[k]).map(([k, v]) => D.BEHAVE[k][v]).join(' · ') || t('roster.balanced') }));
  } catch (err) { return h('p', { class: 'bad', text: String(err.message || err) }); }
}
export function rosterMaker(id, redraw) {
  const X = D.ROSTER[id]; if (!X) return h('p', { class: 'sub', text: t('maker.none') });
  const f = form(D.subPath('ROSTER', id), redraw), beh = { ...D.DEFAULT_BEHAVE, ...(X.behave || {}) };
  const opt = (o, none) => [...(none ? [[null, none]] : []), ...Object.entries(o).map(([k, v]) => [k, typeof v === 'string' ? v : v.name])];
  const chips = Object.entries(X.chips || {});
  const parts = [
    h('span', { class: 'cap', text: t('roster.part.who') }),
    f.field(t('maker.name'), f.text(['name'], X.name), ['name']),
    f.field(t('maker.cls'), f.select(['cls'], opt(D.CLASSES, t('roster.randomClass')), X.cls), ['cls']),
    f.field(t('roster.floors'), f.checks(['floors'], [1, 2, 3, 4].map((n) => [n, D.FLOORS[n].name]), X.floors || [1, 2, 3, 4]), ['floors']),
    X.boss ? null : f.field(t('roster.tables'), f.checks(['tables'], [0, 1, 2].map((n) => [n, t('floor.table.name', { n: n + 1 })]), X.tables || [0, 1, 2]), ['tables']),
    h('span', { class: 'cap', text: t('roster.part.loadout') }),
    f.field(t('roster.purse'), f.number(['purse'], X.purse, { min: 0, ph: t('roster.purse.floor') }), ['purse']),
    f.field(t('roster.wallet'), f.select(['wallet'], opt(D.WALLETS, t('roster.none')), X.wallet), ['wallet']),
    f.field(t('roster.jacket'), f.select(['jacket'], opt(D.JACKETS, t('roster.none')), X.jacket), ['jacket']),
    f.field(t('roster.drink'), f.select(['drink'], [[null, t('roster.none')], ...D.DRINKS.map((d) => [d.id, d.name])], X.drink), ['drink']),
    f.field(t('roster.chips'), h('div', { class: 'b-list' }, ...chips.map(([cid, n]) => h('div', { class: 'row b-list-row' }, h('span', { text: D.SHOP_CHIPS[cid]?.name || cid }),
      f.number(null, n, { min: 0, w: '70px', on: (v) => f.set(['chips'], { ...X.chips, [cid]: Math.max(0, v | 0) }) }),
      btn('✕', () => { const c = { ...X.chips }; delete c[cid]; f.set(['chips'], c); }, null, 'small'))),
      f.select(null, [[null, t('chipmaker.add')], ...Object.entries(D.SHOP_CHIPS).filter(([k]) => !X.chips?.[k]).map(([k, v]) => [k, v.name])], null, (v) => v && f.set(['chips'], { ...(X.chips || {}), [v]: 1 }))), ['chips']),
    f.field(t('roster.spacing'), f.select(['deploy', 'spacing'], [['row', t('roster.sp.row')], ['column', t('roster.sp.column')], ['random', t('roster.sp.random')]], X.deploy?.spacing || 'row'), ['deploy']),
    f.field(t('roster.stacking'), f.select(['deploy', 'stacking'], [['maxed', t('roster.st.maxed')], ['balanced', t('roster.st.balanced')], ['random', t('roster.st.random')]], X.deploy?.stacking || 'maxed'), null),
    f.field(t('roster.layout'), layoutGrid(X, (v) => f.set(['layout'], v), redraw), ['layout']),
    h('span', { class: 'cap', text: t('roster.part.behave') }),
    ...Object.keys(D.BEHAVE).map((k) => f.field(t(`roster.beh.${k}`), f.select(['behave', k], opt(D.BEHAVE[k]), beh[k]), ['behave', k])),
  ];
  if (X.boss) {
    const phases = X.phases || [];
    parts.push(h('span', { class: 'cap', text: t('roster.part.phases') }), h('p', { class: 'sub', text: t('roster.phases.note') }),
      ...phases.map((P, i) => { const upd = (np) => f.set(['phases'], phases.map((y, j) => (j === i ? np : y)));
        return h('div', { class: 'b-phase' }, h('div', { class: 'row' }, h('b', { text: t('roster.phase', { n: i + 1 }) }), h('span', { class: 'sub', text: t('roster.phase.below') }),
          f.number(null, Math.round((P.below ?? 0.5) * 100), { min: 1, w: '70px', on: (v) => upd({ ...P, below: Math.max(0.01, Math.min(1, (v || 50) / 100)) }) }), h('span', { text: '%' }),
          btn('✕', () => f.set(['phases'], phases.filter((_, j) => j !== i)), null, 'small')),
        h('div', { class: 'row wrap' }, ...['temper', 'draw', 'bid', 'bluff', 'aim'].map((k) => f.select(null, [[null, `${t(`roster.beh.${k}`)}: ${t('roster.unchanged')}`], ...opt(D.BEHAVE[k])], P.behave?.[k] ?? null,
          (v) => { const nb = { ...(P.behave || {}) }; if (v) nb[k] = v; else delete nb[k]; upd({ ...P, behave: nb }); }))),
        h('div', { class: 'row' }, h('span', { class: 'sub', text: t('roster.cheat') }), f.number(null, P.cheat?.dice ?? 0, { min: 0, w: '60px', on: (v) => upd({ ...P, cheat: { ...(P.cheat || {}), dice: v | 0 } }) }), h('span', { class: 'sub', text: t('roster.cheat.dice') }),
          f.number(null, P.cheat?.tricks ?? 0, { min: 0, w: '60px', on: (v) => upd({ ...P, cheat: { ...(P.cheat || {}), tricks: v | 0 } }) }), h('span', { class: 'sub', text: t('roster.cheat.tricks') }))); }),
      btn(t('roster.phase.add'), () => f.set(['phases'], [...phases, { below: phases.length ? Math.max(0.05, (phases[phases.length - 1].below || 0.5) / 2) : 0.5, behave: { temper: 'rabid' }, cheat: { dice: 1, tricks: 0 } }]), null, 'small'));
  }
  return h('div', { class: 'b-maker' }, h('div', { class: 'b-fields' }, parts), h('div', {}, h('span', { class: 'cap', text: t('roster.preview') }), preview(id), h('p', { class: 'sub', text: t('roster.preview.note') })));
}
// a precise Stake layout: one box per space, chips as values or effect chip ids, comma-separated. Pick a brush to paint
// instead: click and hold on a space to stack chips at a steady rate, sweep to paint each space you cross.
let layoutBrush = 'type';
function layoutGrid(X, onSet, redraw) {
  const K = X.cls ? D.CLASSES[X.cls] : null, rows = Math.max(1, D.BASE_DIMS.barRows + (K?.bvd.depth || 0)), cols = D.BASE_DIMS.cols;
  const cap = Math.max(1, D.BASE_DIMS.stackMax + (K?.bvd.balance || 0));
  const cur = () => X.layout || [], at = (r, c) => cur().find((x) => x.r === r && x.c === c)?.chips || [];
  const put = (r, c, chips, quiet) => { const rest = cur().filter((x) => !(x.r === r && x.c === c)), next = chips.length ? [...rest, { r, c, chips }].sort((a, b) => a.r - b.r || a.c - b.c) : rest;
    if (quiet) B.setValue(D.subPath(D.subPath('ROSTER', idOf(X)), 'layout'), next.length ? next : null); else onSet(next.length ? next : null); };
  const parse = (txt) => txt.split(',').map((x) => x.trim()).filter(Boolean).map((x) => (/^\d+$/.test(x) ? Number(x) : x)).filter((x) => typeof x === 'number' || D.SHOP_CHIPS[x]);
  const painting = layoutBrush !== 'type';
  const grid = h('div', { class: `b-layout ${painting ? 'painting' : ''}`, style: { gridTemplateColumns: `repeat(${cols}, 1fr)` } },
    ...Array.from({ length: rows * cols }, (_, i) => { const r = Math.floor(i / cols), c = i % cols;
      return h('input', { type: 'text', value: at(r, c).join(', '), placeholder: '·', 'data-rc': `${r}:${c}`, ...(painting ? { readonly: 'readonly' } : {}), title: t('roster.layout.cell', { r: r + 1, c: c + 1 }), onchange: (e) => put(r, c, parse(e.target.value)) }); }));
  if (painting) paint(grid, (ev) => { const el = ev.target.closest?.('[data-rc]'); if (!el) return null; const [r, c] = el.dataset.rc.split(':').map(Number); return { key: el.dataset.rc, r, c, el }; },
    (p) => { const list = at(p.r, p.c).slice(); if (layoutBrush === 'erase') list.pop(); else if (list.length < cap) list.push(/^\d+$/.test(layoutBrush) ? Number(layoutBrush) : layoutBrush); else return;
      put(p.r, p.c, list, true); p.el.value = list.join(', '); }, 170, () => redraw());
  const brushes = h('select', { onchange: (e) => { layoutBrush = e.target.value; redraw(); } },
    ...[['type', t('roster.brush.type')], ...D.DENOM_VALUES.map((v) => [String(v), `${v}¢`]), ...Object.entries(D.SHOP_CHIPS).map(([k, v]) => [k, v.name]), ['erase', t('roster.brush.erase')]]
      .map(([v, l]) => h('option', { value: v, ...(v === layoutBrush ? { selected: 'selected' } : {}), text: l })));
  return h('div', {}, h('div', { class: 'row' }, h('span', { class: 'sub', text: t('roster.brush') }), brushes), grid,
    h('p', { class: 'sub', text: t(cur().length ? 'roster.layout.on' : 'roster.layout.off') }));
}
const idOf = (X) => Object.keys(D.ROSTER).find((k) => D.ROSTER[k] === X);
export const rosterLabel = (id) => { const X = D.ROSTER[id]; return `${X.boss ? '👑 ' : ''}${X.name}`; };
export const rosterSub = (id) => { const X = D.ROSTER[id]; return `${X.cls ? D.CLASSES[X.cls].name : t('roster.randomClass')} · ${(X.floors || [1, 2, 3, 4]).map((n) => 'F' + n).join(' ')}`; };
void isObj;
