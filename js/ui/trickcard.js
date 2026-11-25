// A trick is shown in one of three states, everywhere it appears (in play and in Build mode):
//   1. the list item: its type's colour, its chip, its name (in script), its quality as a Roman numeral with its
//      print's mark, and its Bonus requirement as dice laid out in its pattern. For lists, shelves, books.
//   2. the full card (its hover, and previews): name and numeral, its chip and flavour, then Trick (what it aims at),
//      Roll (what the dice do) and Bonus (what the Bonus dice set off), and a strip of its numbers, each with a mark.
//   3. the played card (at the table): its name strip, its bid ring and the dice area, laid out in its pattern.
// The print shows on all three: Foil is a metallic rainbow that glints now and then; a Misprint's ink is off (black
// splits into cyan, magenta and yellow at an angle) and the value printed wrong shows its true value as a ghost; a
// Reprint carries an ankh and a white aura.
import { h } from './core.js';
import { chipEl, trickChip, flavorP, printRule } from './parts.js';
import * as D from '../data.js';
import { multOf } from '../bout.js';
import { t as tx } from '../text.js';

const esc = (x) => String(x ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
// the print's look: classes for every state
export const printCls = (t) => `q${t.q}${t.foil ? ' foil' : ''}${t.rar === 'misprint' ? ' misprint' : ''}${t.rar === 'reprint' ? ' reprint' : ''}${t.gem ? ' gem' : ''}`;
// the quality numeral with the print's mark (☥ Reprint, ✦ Foil, ✶ Misprint)
export const qMarkHtml = (t) => `<span class="tk-q ${printCls(t)}">${t.rar === 'reprint' ? '<i class="ankh">☥</i>' : t.foil ? '<i class="fmark">✦</i>' : t.rar === 'misprint' ? '<i class="mmark">✶</i>' : ''}<b>${D.QROMAN[t.q] || t.q}</b></span>`;

// A dice pattern: how a trick's Bonus dice are laid out (its `pattern` in the Trick maker): rows (each a count of
// dice, at most 9 in all) and how they line up (left, centre, right). Unset, up to three a row, centred.
export function patternOf(def) {
  const n = Math.max(1, Math.min(9, def.count || 1)), P = def.pattern || {};
  let rows = Array.isArray(P.rows) && P.rows.length ? P.rows.filter((x) => x > 0) : null;
  if (!rows || rows.reduce((a, b) => a + b, 0) !== n) { rows = []; let left = n; while (left > 0) { const k = Math.min(3, left); rows.push(k); left -= k; } if (n === 4) rows = [2, 2]; }
  return { rows, align: ['left', 'center', 'right'].includes(P.align) ? P.align : 'center' };
}
// the dice pattern as HTML: each slot a small die of the trick's size; a misprinted value shows its true one as a ghost
export function diceHtml(t, def = D.defOf(t), cls = '') {
  const base = D.TRICKS[t.id], P = patternOf(def), off = t.rar === 'misprint' && D.misKinds(t.mis).some((k) => D.MISPRINTS[k].shows === 'dice');
  const slot = () => `<i class="tk-slot ${def.die}">${def.die.slice(1)}${off && base.die !== def.die ? `<s>${base.die.slice(1)}</s>` : ''}</i>`;
  return `<span class="tk-dice al-${P.align} ${off ? 'off' : ''} ${cls}">${P.rows.map((n) => `<span class="tk-row">${Array.from({ length: n }, slot).join('')}</span>`).join('')}${off && base.count !== def.count ? `<s class="tk-was">${base.count}</s>` : ''}</span>`;
}

// ---------- 1. the list item ----------
export function trickItem(t, tipFn) {
  const def = D.defOf(t), T = D.TYPES[def.type], ch = trickChip(def);
  const el = h('span', { class: `tag-t trick tk-item ${printCls(t)}`, style: { '--tc': T.color }, ...(tipFn ? { tip: tipFn } : {}) },
    ch ? chipEl(ch, 'mini') : null, h('b', { class: 'tk-name', text: def.name }), h('span', { html: qMarkHtml(t) }), h('span', { class: 'tk-req', html: diceHtml(t, def, 'mini') }));
  return el;
}

// ---------- 2. the full card ----------
// the targeting line: what it aims at, from its approach, side and spread
const aimText = (def) => (def.approach === 'none' ? (def.dist === 'rain' ? tx('parts.random-stacks-of-your') : tx('parts.no-target-needed'))
  : tx('tk.aim', { side: def.side === 'self' ? tx('tk.aim.yours') : tx('tk.aim.theirs'), approach: D.APPROACH[def.approach], dist: D.DIST[def.dist]?.name || '' }));
export function trickCardHtml(t, viewerCls, live = '') {
  const def = D.defOf(t), T = D.TYPES[def.type], cond = D.CONDITIONS[D.condOf(t)], ch = trickChip(def), classOk = !def.cls || def.cls === viewerCls;
  const misRoll = t.rar === 'misprint' && D.misKinds(t.mis).some((k) => D.MISPRINTS[k].shows === 'roll');
  const chipHtml = ch ? chipEl(ch, 'tk-art').outerHTML : `<span class="tk-art none" style="--tc:${T.color}"></span>`;
  const Q = D.QDIE[t.q], fx = (m) => '×' + (m % 1 ? m.toFixed(2).replace(/0$/, '') : m);
  const facts = [
    [`<i class="dot" style="background:${T.color}"></i>`, T.name, T.text],
    ['◈', def.cls ? D.CLASSES[def.cls]?.name : tx('parts.any-class'), classOk ? tx('tk.fact.class') : tx('parts.only', { name: D.CLASSES[def.cls]?.name })],
    ['⚄', `${def.count}${def.die}`, tx('tk.fact.dice', { count: def.count, die: def.die })],
    ['×', fx(multOf(t)), tx('tk.fact.mult', { q: D.QNAME[t.q], roman: D.QROMAN[t.q] })],
    Q ? ['◎', Q.die, D.qdieText(t.q)] : null,
    ['▤', cond.name, tx('tk.fact.cond', { wear: t.wear ?? D.WEAR.good })]].filter(Boolean);
  return `<div class="tk-card ${printCls(t)} ${classOk ? '' : 'wrong-cls'}" style="--tc:${T.color}">
    <div class="tk-head"><b class="tk-name">${esc(def.name)}</b>${qMarkHtml(t)}</div>
    <div class="tk-art-row">${chipHtml}${flavorP('TRICKS', t.id) || `<p class="flavor dim">${esc(T.text)}</p>`}</div>
    <div class="tk-sec"><em>✧ ${tx('tk.trick')} ✧</em><span>${aimText(def)}</span></div>
    <div class="tk-sec ${misRoll ? 'off' : ''}"><em>⚄ ${tx('tk.roll')}</em><span>${esc(def.roll.text)}${t.mis?.trait ? ` <b class="tk-mis">${t.mis.trait > 0 ? '+' : ''}${t.mis.trait}</b>` : ''}</span></div>
    <div class="tk-sec"><em>✪ ${tx('tk.bonus')}</em><span>${esc(D.condText(def.bonus.cond))}: ${esc(def.bonus.text)} ${diceHtml(t, def)}</span></div>
    ${printRule(t) ? `<p class="tk-print">${printRule(t)}</p>` : ''}
    <div class="tk-facts">${facts.map(([ico, v, why]) => `<span class="tk-fact" title="${esc(String(why).replace(/<[^>]+>/g, ''))}"><i>${ico}</i>${esc(v)}</span>`).join('')}</div>
    ${live || ''}</div>`;
}
export const trickCard = (t, viewerCls) => { const el = h('div', { class: 'tk-wrap', html: trickCardHtml(t, viewerCls) }); return el.firstElementChild; };

// ---------- 3. the played card ----------
// as it sits on the table: its name strip, the bid ring, and the dice area laid out in its pattern
export function trickPlayed(t) {
  const def = D.defOf(t), T = D.TYPES[def.type], ch = trickChip(def);
  return h('div', { class: `tk-played ${printCls(t)}`, style: { '--tc': T.color } }, h('div', { class: 'tk-head', html: `<b class="tk-name">${esc(def.name)}</b>${qMarkHtml(t)}` }),
    h('div', { class: 'tk-ring' }, ch ? chipEl(ch) : null), h('div', { class: 'tk-area', html: diceHtml(t, def, 'big') }));
}
