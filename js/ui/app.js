// Shared state for the screens: the current run, the saved profile, and navigation.
import { h, tween, syncList, btn, tip } from './core.js';
import { openLibrary } from './library.js';
import { statTip, dieTip, trickTip, cardTip, jacketTip, drinkTip, trickWords, trickWord, trickLook } from './parts.js';
import { trickItem } from './trickcard.js';
import * as D from '../data.js';
import * as R from '../run.js';
import { cents } from '../util.js';
import { nameSign, signOf, crownLookOf } from './sign.js';
import { sfx } from './sfx.js';

export const app = { run: null, meta: null, nav: {} };

const KEYS6 = ['trickery', 'ingenuity', 'proficiency', 'charisma', 'cunning', 'conviction'];
export const diceSummary = (dice) => { const m = {}; for (const d of dice) m[d.type] = (m[d.type] || 0) + 1; return Object.entries(m).sort((a, b) => a[0].slice(1) - b[0].slice(1)).map(([t, n]) => `${n}${t}`).join(' · '); };
// a trick in a list: its list item (trickcard.js), its hover the full card
export const trickTag = (t, cls) => trickItem(t, () => trickTip(t, cls));
export function oppTip(o) {
  return `<b>${o.name}</b> <span class="dim">${o.title ? o.title + ' · ' : ''}${D.CLASSES[o.cls].name}</span>
    <p>Worth <b>${cents(o.worth)}</b> on the table. Position ${o.dims.meterRows} Bet + ${o.dims.barRows} Stake rows, stacks ${o.dims.stackMax} high.</p>
    <p>Draw ${o.tip.trickery} · Bid ${o.tip.ingenuity} · Roll ${o.tip.proficiency} per turn.</p>
    <p><span class="k">Dice</span> ${diceSummary(o.dice)}</p><p class="tags"><span class="k">Tricks</span> ${o.tricks.map((t) => trickItem(t).outerHTML).join(' ')}</p>${o.roster && D.flavorOf('ROSTER', o.roster) ? `<p class="flavor">${D.flavorOf('ROSTER', o.roster)}</p>` : ''}`;
}

// Your name tag: your Roller's sign (the one build, ui/sign.js), small, worn at the top left of every room of a run
// (the floor, a table's door, the suite, the shops' ends, the street). At the table it is your seat's sign instead.
export function nameTag(cls = '') { const run = app.run; if (!run) return null; const X = D.ROLLERS[run.roller] || {}, K = D.CLASSES[run.cls]; if (!K) return null; const c = R.crownWorn(run);
  const el = nameSign('you', X.name || K.name, K.name, { ...signOf('you', X.sign), crown: c ? { level: c.floor, look: crownLookOf(signOf('them', D.ROSTER[c.roster]?.sign)), fit: c.fit } : null }, `name-tag ${cls}`);
  return tip(el, () => `<b>${X.name || K.name}</b> <span class="dim">${K.name}</span><p>${D.classRule(run.cls)}</p>`); }
// top bar: who you are, where you are, your attributes, your gear and your purse
export function hud(place, sub) {
  const run = app.run, purse = h('b', { class: 'num' }), stats = h('div', { class: 'stats' }), gear = h('div', { class: 'gear list' });
  const el = h('div', { class: 'hud' }, nameTag(), h('div', { class: 'place' }, h('b', { text: place }), h('span', { class: 'cap', text: sub })), stats, gear,
    btn('Library', () => openLibrary(), '<b>Library</b><p>Every chip, trick, die, card, drink, wallet, jacket and felt, with the upgrades for each. What you own is marked.</p>', 'small'),
    h('div', { class: 'purse', tip: '<b>Purse</b><p>Chips you carry between bouts. Spend them in the shops, bet them at the Sports Book, then put them on the table: whatever you do not place in your position is wagered on the bout.</p>' }, h('span', { class: 'cap', text: 'Purse' }), purse));
  function update() {
    const st = R.rollerStats(run).v;
    syncList(stats, KEYS6, (k) => k, (k) => h('span', { class: 'stat', tip: () => statTip(k, R.rollerStats(run).v[k]) }, h('em', { text: D.STATS[k].name }), h('b', {})), (e, k) => { e.lastChild.textContent = st[k]; });
    const items = [
      { k: 'dice', text: `🎲 ${run.dice.length}`, tip: () => `<b>Pouch</b><p>${diceSummary(run.dice)}</p><ul>${run.dice.filter((d) => d.up.length).map((d) => `<li>${dieTip(d)}</li>`).join('')}</ul>` },
      { k: 'tricks', text: `📖 ${run.tricks.length}`, tip: () => `<b>Book</b><ul>${run.tricks.map((t) => `<li>${trickItem(t).outerHTML} <span class="dim">${D.CONDITIONS[D.condOf(t)].name}</span></li>`).join('')}</ul>` },
      { k: 'cards', text: `🃏 ${run.cards.length}`, tip: () => { const v = R.rollerStats(run).v; return `<b>Wallet</b>${run.cards.map((c) => `<div>${cardTip(c, v)}</div>`).join('') || '<p>Empty.</p>'}`; } },
      { k: 'jacket', text: `🧥 ${D.JACKETS[run.jacket].name}`, tip: () => jacketTip(run.jacket, R.rollerStats(run).v) },
    ];
    if (run.drink) items.push({ k: 'drink', text: `🥤 ${run.drink.sips}`, tip: () => drinkTip(run.drink) });
    if (run.rest && run.rest.bouts > 0) items.push({ k: 'rest', text: `🛏 +${run.rest.amt}`, tip: () => `<b>Rested</b><p>+${run.rest.amt} ${D.STATS[D.CLASSES[run.cls].primary].name} for ${run.rest.bouts} more bout${run.rest.bouts > 1 ? 's' : ''}.</p>` });
    syncList(gear, items, (x) => x.k, (x) => h('span', { class: 'stat', tip: x.tip }), (e, x) => { if (e.textContent !== x.text) e.textContent = x.text; });
    tween(purse, run.purse, cents);
    // the purse is heard when it changes while you watch: chips out, or chips in, at the size of the sum
    if (shown != null && run.purse !== shown) sfx(run.purse < shown ? 'spend' : 'earn', 0, { n: Math.abs(run.purse - shown) });
    shown = run.purse;
  }
  let shown = null; update();
  // developer mode: its button sits by the purse on every screen with this bar (dev.js is loaded only when it is on)
  import('./dev.js').then((M) => { const b = M.devButton(() => { update(); document.dispatchEvent(new Event('rp:dev')); }); if (b) el.append(b); }).catch(() => {});
  const paid = () => { if (!el.isConnected) return document.removeEventListener('rp:purse', paid); update(); }; // a tip to the band
  document.addEventListener('rp:purse', paid);
  return { el, update };
}
