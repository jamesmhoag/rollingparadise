// Build mode: the test table (row 11). Set up a hero with any tricks and dice, pick an opponent, choose match rules
// or a sandbox, and sit down. At the table, the chip tools add, change or remove chips on any space. Nothing is
// saved to your run.
import { h, lab, btn, toast } from './core.js';
import { fieldRow, pick, numIn, checkIn, typed } from './form.js';
import * as D from '../data.js';
import { t } from '../text.js';
import { diceCounts } from './rostermaker.js';
import { isMade } from '../trickmaker.js';

const KEY = 'rollingparadise.build.test.v1';
const store = () => { try { return globalThis.localStorage || null; } catch { return null; } };
export function loadSetup() {
  let o = null; try { o = JSON.parse(store()?.getItem(KEY) || 'null'); } catch { o = null; }
  return { cls: 'hustler', floor: 1, q: 0, tricks: ['charge', 'block', 'settle'], dice: { d6: 7 }, purse: 500, roster: null, rules: false, ...(o || {}) };
}
const saveSetup = (o) => { try { store()?.setItem(KEY, JSON.stringify(o)); } catch { /* storage unavailable */ } };

export function testTable(redraw, sitDown) {
  const o = loadSetup(), set = (k, v) => { o[k] = v; saveSetup(o); redraw(); };
  const field = (label, el) => fieldRow(label, el);
  const select = (k, list, value) => pick(list, value, (v) => set(k, v), { parse: typed });
  let find = '';
  const trickList = h('div', { class: 'b-checks b-tricks' });
  const drawTricks = () => trickList.replaceChildren(...Object.entries(D.TRICKS).filter(([id, T]) => !find || `${id} ${T.name}`.toLowerCase().includes(find)).map(([id, T]) => h('label', { class: 'b-check' },
    checkIn(o.tricks.includes(id), (yes) => { o.tricks = yes ? [...o.tricks, id] : o.tricks.filter((x) => x !== id); saveSetup(o); count.textContent = t('test.tricks.n', { n: o.tricks.length }); }),
    `${T.name}${isMade(T) ? ' ✦' : ''}`)));
  drawTricks();
  const count = h('span', { class: 'sub', text: t('test.tricks.n', { n: o.tricks.length }) });
  const rosterOpts = [[null, t('test.opp.random')], ...Object.entries(D.ROSTER).sort(([, a], [, b]) => (a.boss - b.boss) || a.name.localeCompare(b.name)).map(([k, X]) => [k, `${X.boss ? '👑 ' : ''}${X.name}`])];
  return h('div', { class: 'b-maker' }, h('div', { class: 'b-fields' },
    h('p', { class: 'sub', text: t('test.about') }),
    h('span', { class: 'cap', text: t('test.part.hero') }),
    field(lab('test.roller'), select('cls', Object.entries(D.ROLLERS).map(([k, X]) => [k, D.heroName(X.cls, k)]), D.rollerOf(o.cls))),
    field(lab('test.floor'), select('floor', [1, 2, 3, 4].map((n) => [n, D.FLOORS[n].name]), o.floor)),
    field(lab('test.purse'), numIn(o.purse, (v) => set('purse', v), { min: 10, blank: 10 })),
    field(lab('test.dice'), diceCounts(o.dice, (out) => { if (!out) { toast(t('test.dice.bad'), 'warn'); return redraw(); } set('dice', out); })),
    field(lab('test.quality'), select('q', [[0, t('test.quality.own')], ...[1, 2, 3, 4].map((n) => [n, D.QNAME[n]])], o.q || 0)),
    field(lab('test.tricks'), h('div', {}, h('input', { class: 'b-filter', placeholder: t('build.filter'), oninput: (e) => { find = e.target.value.toLowerCase(); drawTricks(); } }), trickList, count)),
    h('span', { class: 'cap', text: t('test.part.opp') }),
    field(lab('test.opp'), select('roster', rosterOpts, o.roster)),
    h('span', { class: 'cap', text: t('test.part.rules') }),
    field(lab('test.rules'), select('rules', [[0, t('test.rules.off')], [1, t('test.rules.on')]], o.rules ? 1 : 0))),
  h('div', {}, h('span', { class: 'cap', text: t('test.sit') }), h('div', { class: 'b-card' },
    h('p', { text: t(o.rules ? 'test.rules.on.about' : 'test.rules.off.about') }), h('p', { class: 'dim', text: t('test.tools.about') }),
    btn(t('test.sitDown'), () => { if (!o.tricks.length) return toast(t('test.tricks.none'), 'warn'); sitDown({ ...o, rules: !!o.rules }); }, null, 'go'))));
}
