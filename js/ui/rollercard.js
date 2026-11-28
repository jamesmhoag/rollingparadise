// A Roller's card: its neon sign (as it hangs over its seat), its class's rule and flavour, what it gives each turn,
// its primary C, its position, its pouch and its book. The same card on the pick screen and in the Coat Check (there
// with the run's own numbers: gear included, the dice and tricks you hold now).
import { h } from './core.js';
import { statRow, dieEl, dieTip } from './parts.js';
import { trickTag } from './app.js';
import { signOf, dressSign, crownLookOf, nameSign } from './sign.js';
import * as D from '../data.js';
import { t } from '../text.js';
import { bookBar, bookView, onBook } from './bookbar.js';
// rid: the Roller; v: the numbers to show ({ trickery.., balance.. }); dice: die objects; tricks: { id, q }; crown: worn
export function rollerCard({ rid, v, dice, tricks, crown = null, tag = 'div', onclick = null }) {
  const X = D.ROLLERS[rid] || {}, id = X.cls, K = D.CLASSES[id]; if (!K) return h('div');
  const sign = nameSign('you', X.name || K.name, K.name, { ...signOf('you', X.sign), crown: crown ? { level: crown.floor, look: crownLookOf(signOf('them', D.ROSTER[crown.roster]?.sign)), fit: crown.fit } : null }, 'pick-sign');
  const pc = D.primaryC(id);
  return h(tag, { class: 'pick-card roller-card', style: { '--cc': K.color }, onclick },
    sign, h('p', { class: 'sub', text: D.classRule(id) }), D.flavorOf('CLASSES', id) ? h('p', { class: 'sub flavor', text: D.flavorOf('CLASSES', id) }) : null,
    h('span', { class: 'cap', text: t('select.eachTurn') }), statRow(v, ['trickery', 'ingenuity', 'proficiency']),
    h('span', { class: 'cap', text: t('select.primaryC') }), h('div', { class: 'stats' }, h('span', { class: 'stat', tip: () => t('select.primaryC.tip', { stat: D.STATS[pc].name, text: D.STATS[pc].text }) }, h('em', { text: D.STATS[pc].name }))),
    h('span', { class: 'cap', text: t('select.position') }), statRow(v, ['balance', 'versatility', 'depth']),
    h('span', { class: 'cap', text: t('select.pouch') }), h('div', { class: 'dicebox' }, dice.map((d) => { const e = dieEl(d); e._tip = () => dieTip(d); e.classList.add('has-tip'); return e; })),
    ...bookPart(tricks, id, tag !== 'button'));
}
// a Roller as it walks in: its class's numbers, its starting dice and tricks
export const startCard = (rid, onclick) => { const X = D.ROLLERS[rid], K = D.CLASSES[X.cls];
  return rollerCard({ rid, v: { ...K.tip, ...K.bvd }, dice: Object.entries(X.dice || {}).flatMap(([type, n]) => Array.from({ length: n }, () => ({ type }))), tricks: (X.tricks || []).map((id) => ({ id, q: 1 })), tag: 'button', onclick }); };

// the Book on the card: in a button (the pick screen) a plain list; elsewhere with the Book's filters and sorts
function bookPart(tricks, cls, bar) {
  const all = tricks.filter((x) => D.TRICKS[x.id]), inv = h('div', { class: 'inv' });
  const draw = () => inv.replaceChildren(...(bar ? bookView(all) : all).map((x) => trickTag(x, cls)));
  draw(); if (bar) onBook(inv, draw);
  return [bar ? h('div', { class: 'row between book-head' }, h('span', { class: 'cap', text: t('select.book') }), bookBar()) : h('span', { class: 'cap', text: t('select.book') }), inv];
}
