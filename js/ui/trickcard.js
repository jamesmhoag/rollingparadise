// A trick is shown in one of three states, everywhere it appears (in play and in Build mode):
//   1. the list item: its type's colour, its chip, its name (in script), its quality as a Roman numeral with its
//      print's mark, and its Bonus requirement as dice laid out in its pattern. For lists, shelves, books.
//   2. the full card (its hover, and previews): name and numeral, its chip and flavour, then Trick (what it aims at),
//      Roll (what the dice do) and Bonus (what the Bonus dice set off). Nothing else: no strip of tags, no print rule.
//   3. the played card (at the table): its name strip, its bid ring and the dice area, laid out in its pattern.
// The print shows on all three: Foil is a metallic rainbow that glints now and then; a Misprint's ink is off (black
// splits into cyan, magenta and yellow at an angle) and the value printed wrong shows its true value as a ghost; a
// Reprint carries an ankh and a white aura. Every trick is one size in each state (sizeCards).
import { h } from './core.js';
import { chipEl, trickChip, flavorP } from './parts.js';
import * as D from '../data.js';
import { multOf } from '../bout.js';
import { t as tx } from '../text.js';

const esc = (x) => String(x ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
// the print's look: classes for every state
export const printCls = (t) => `q${t.q}${t.foil ? ' foil' : ''}${t.rar === 'misprint' ? ' misprint' : ''}${t.rar === 'reprint' ? ' reprint' : ''}${t.gem ? ' gem' : ''}`;
// the quality numeral with the print's mark (☥ Reprint, ✦ Foil)
// A Misprint has no mark: it is a faulty card, not a print the House knows about. Its off-register ink is the tell.
export const qMarkHtml = (t) => `<span class="tk-q ${printCls(t)}">${t.rar === 'reprint' ? '<i class="ankh">☥</i>' : t.foil ? '<i class="fmark">✦</i>' : ''}<b>${D.QROMAN[t.q] || t.q}</b></span>`;

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

// What a trick's Bonus asks for, in full: how many dice of which size, and what they must make (and, for a Bonus only
// one class plays, that class). The one wording for the card at the table and the full card.
const NEED = { match: 'tk.need.match', evens: 'tk.need.evens', odds: 'tk.need.odds', run: 'tk.need.run' };
export function needCond(def) { const c = def.bonus.cond; return NEED[c] ? tx(NEED[c]) : c.startsWith('over:') ? tx('tk.need.over', { n: c.slice(5) }) : tx('tk.need.under', { n: c.slice(6) }); }
export function bonusNeed(def) {
  const need = tx('tk.need', { count: def.count, die: def.die, cond: needCond(def) });
  return def.cls ? tx('tk.need.cls', { need, name: D.CLASSES[def.cls]?.name || def.cls }) : need;
}

// ---------- 1. the list item ----------
export function trickItem(t, tipFn) {
  const def = D.defOf(t), T = D.TYPES[def.type], ch = trickChip(def);
  const el = h('span', { class: `tag-t trick tk-item ${printCls(t)}`, style: { '--tc': T.color }, ...(tipFn ? { tip: tipFn } : {}) },
    ch ? chipEl(ch, 'mini') : null, h('b', { class: 'tk-name', text: def.name }), h('span', { class: 'tk-req', html: diceHtml(t, def, 'mini') }), h('span', { html: qMarkHtml(t) })); // (in a row: the dice its Bonus asks for, then its quality at the end)
  return el;
}

// ---------- 2. the full card ----------
// the targeting line: what it aims at, from its approach, side and spread
const aimText = (def) => (def.approach === 'none' ? (def.dist === 'rain' ? tx('parts.random-stacks-of-your') : tx('parts.no-target-needed'))
  : tx('tk.aim', { side: def.side === 'self' ? tx('tk.aim.yours') : tx('tk.aim.theirs'), approach: D.APPROACH[def.approach], dist: D.DIST[def.dist]?.name || '' }));
export function trickCardHtml(t, viewerCls, live = '') {
  const def = D.defOf(t), T = D.TYPES[def.type], ch = trickChip(def), classOk = !def.cls || def.cls === viewerCls;
  const misRoll = t.rar === 'misprint' && D.misKinds(t.mis).some((k) => D.MISPRINTS[k].shows === 'roll');
  const chipHtml = ch ? chipEl(ch, 'tk-art').outerHTML : `<span class="tk-art none" style="--tc:${T.color}"></span>`;
  // The card says what the trick does and nothing else: no strip of tags under it, and no rule for its print (a Foil,
  // Misprint or Reprint shows in how the card is printed). A Bonus only one class can play says so in its heading.
  const bonusFor = def.cls ? ` <i class="tk-for">${esc(tx(classOk ? 'tk.bonus.cls' : 'tk.bonus.cls.only', { name: D.CLASSES[def.cls]?.name || def.cls }))}</i>` : '';
  sizeCards();
  return `<div class="tk-card ${printCls(t)} ${classOk ? '' : 'wrong-cls'}" style="--tc:${T.color}"><div class="tk-body">
    <div class="tk-head"><b class="tk-name">${esc(def.name)}</b>${qMarkHtml(t)}</div>
    <div class="tk-art-row">${chipHtml}${flavorP('TRICKS', t.id) || `<p class="flavor dim">${esc(T.text)}</p>`}</div>
    <div class="tk-sec"><em>✧ ${tx('tk.trick')} ✧</em><span>${aimText(def)}</span></div>
    <div class="tk-sec ${misRoll ? 'off' : ''}"><em>⚄ ${tx('tk.roll')}</em><span>${esc(def.roll.text)}${t.mis?.trait ? ` <b class="tk-mis">${t.mis.trait > 0 ? '+' : ''}${t.mis.trait}</b>` : ''}</span></div>
    <div class="tk-sec tk-bonus"><em>✪ ${tx('tk.bonus')}${bonusFor}</em><span><b class="tk-need">${esc(bonusNeed(def))}</b>: ${esc(def.bonus.text)} ${diceHtml(t, def)}</span></div>
    </div>${live || ''}</div>`;
}
// Every trick is the same size in each of its states (what is said live under a card at the table, its dice and
// bid so far, comes after that fixed part). The full card and the played card are as tall as the longest
// trick needs (measured once from the content, and again after a Build-mode change), so a wordy trick makes every
// card longer instead of standing out; the list item is a fixed strip. WORDY: past this many characters of Roll and
// Bonus text a trick is stretching the cards (the Trick maker says so).
export const WORDY = 150;
export const wordsOf = (def) => String(def?.roll?.text || '').length + String(def?.bonus?.text || '').length;
let sized = '';
export function sizeCards(force = false) {
  if (typeof document === 'undefined' || !document.body) return;
  const ids = Object.keys(D.TRICKS).filter((id) => D.TRICKS[id] && !D.TRICKS[id].retired);
  const sig = ids.map((id) => `${id}:${wordsOf(D.TRICKS[id])}:${D.TRICKS[id].count}`).join('|'); if (!force && sig === sized) return; sized = sig;
  const root = document.documentElement; root.style.removeProperty('--tk-card-h'); root.style.removeProperty('--tk-played-h');
  const box = h('div', { style: { position: 'absolute', left: '-9999px', top: '0', visibility: 'hidden', pointerEvents: 'none' } }); document.body.append(box);
  let card = 0, played = 0;
  for (const id of ids) { const t = { id, q: D.qualityOf(D.TRICKS[id]) };
    const a = h('div', { html: trickCardHtml(t, D.TRICKS[id].cls || '') }).firstElementChild, b = trickPlayed(t); box.append(a, b);
    card = Math.max(card, a.firstElementChild.offsetHeight); played = Math.max(played, b.offsetHeight); a.remove(); b.remove(); }
  box.remove();
  if (card) root.style.setProperty('--tk-card-h', card + 'px'); if (played) root.style.setProperty('--tk-played-h', played + 'px');
}
export const trickCard = (t, viewerCls) => { const el = h('div', { class: 'tk-wrap', html: trickCardHtml(t, viewerCls) }); return el.firstElementChild; };

// ---------- 3. the played card ----------
// as it sits on the table: its name strip, the bid ring, and the dice area laid out in its pattern
export function trickPlayed(t) {
  const def = D.defOf(t), T = D.TYPES[def.type], ch = trickChip(def);
  return h('div', { class: `tk-played ${printCls(t)}`, style: { '--tc': T.color } }, h('div', { class: 'tk-head', html: `<b class="tk-name">${esc(def.name)}</b>${qMarkHtml(t)}` }),
    h('div', { class: 'tk-ring' }, ch ? chipEl(ch) : null), h('div', { class: 'tk-area', html: diceHtml(t, def, 'big') }));
}
