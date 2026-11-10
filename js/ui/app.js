// Shared state for the screens: the current run, the saved profile, and navigation.
import { h, tween, syncList } from './core.js';
import { statTip, dieTip, trickTip, cardTip, jacketTip, drinkTip, pips } from './parts.js';
import * as D from '../data.js';
import * as R from '../run.js';
import { cents } from '../util.js';

export const app = { run: null, meta: null, nav: {} };

const KEYS6 = ['trickery', 'ingenuity', 'proficiency', 'charisma', 'cunning', 'conviction'];
export const diceSummary = (dice) => { const m = {}; for (const d of dice) m[d.type] = (m[d.type] || 0) + 1; return Object.entries(m).sort((a, b) => a[0].slice(1) - b[0].slice(1)).map(([t, n]) => `${n}${t}`).join(' · '); };
export const trickTag = (t, cls) => h('span', { class: 'tag-t', style: { '--tc': D.TYPES[D.TRICKS[t.id].type].color }, tip: () => trickTip(t, cls) }, D.TRICKS[t.id].name, h('span', { class: 'q', html: pips(t) }));
export function oppTip(o) {
  return `<b>${o.name}</b> <span class="dim">${o.title ? o.title + ' · ' : ''}${D.CLASSES[o.cls].name}</span>
    <p>Worth <b>${cents(o.worth)}</b> on the table. Position ${o.dims.meterRows} Meter + ${o.dims.barRows} Bar rows, stacks ${o.dims.stackMax} high.</p>
    <p>Draw ${o.tip.trickery} · Bid ${o.tip.ingenuity} · Roll ${o.tip.proficiency} per turn.</p>
    <p><span class="k">Dice</span> ${diceSummary(o.dice)}</p><p><span class="k">Tricks</span> ${o.tricks.map((t) => D.TRICKS[t.id].name).join(', ')}</p>`;
}

// top bar: where you are, your attributes, your gear and your purse
export function hud(place, sub) {
  const run = app.run, purse = h('b', { class: 'num' }), stats = h('div', { class: 'stats' }), gear = h('div', { class: 'gear list' });
  const el = h('div', { class: 'hud' }, h('div', { class: 'place' }, h('b', { text: place }), h('span', { class: 'cap', text: sub })), stats, gear,
    h('div', { class: 'purse', tip: '<b>Purse</b><p>Chips you carry between bouts. Spend them in the shops, bet them at the Sports Book, then put them on the table: whatever you do not place in your position is wagered on the bout.</p>' }, h('span', { class: 'cap', text: 'Purse' }), purse));
  function update() {
    const st = R.rollerStats(run).v;
    syncList(stats, KEYS6, (k) => k, (k) => h('span', { class: 'stat', tip: () => statTip(k, R.rollerStats(run).v[k]) }, h('em', { text: D.STATS[k].short }), h('b', {})), (e, k) => { e.lastChild.textContent = st[k]; });
    const items = [
      { k: 'dice', text: `🎲 ${run.dice.length}`, tip: () => `<b>Pouch</b><p>${diceSummary(run.dice)}</p><ul>${run.dice.filter((d) => d.up.length).map((d) => `<li>${dieTip(d)}</li>`).join('')}</ul>` },
      { k: 'tricks', text: `📖 ${run.tricks.length}`, tip: () => `<b>Book</b><ul>${run.tricks.map((t) => `<li>${D.TRICKS[t.id].name} <span class="q">${pips(t)}</span> <span class="dim">${D.TYPES[D.TRICKS[t.id].type].name}</span></li>`).join('')}</ul>` },
      { k: 'cards', text: `🃏 ${run.cards.length}`, tip: () => `<b>Wallet</b>${run.cards.map((c) => `<p>${cardTip(c)}</p>`).join('') || '<p>Empty.</p>'}` },
      { k: 'jacket', text: `🧥 ${D.JACKETS[run.jacket].name}`, tip: () => jacketTip(run.jacket) },
    ];
    if (run.drink) items.push({ k: 'drink', text: `🥤 ${run.drink.sips}`, tip: () => drinkTip(run.drink) });
    if (run.rest && run.rest.bouts > 0) items.push({ k: 'rest', text: `🛏 +${run.rest.amt}`, tip: () => `<b>Rested</b><p>+${run.rest.amt} ${D.STATS[D.CLASSES[run.cls].primary].name} for ${run.rest.bouts} more bout${run.rest.bouts > 1 ? 's' : ''}.</p>` });
    syncList(gear, items, (x) => x.k, (x) => h('span', { class: 'stat', tip: x.tip }), (e, x) => { if (e.textContent !== x.text) e.textContent = x.text; });
    tween(purse, run.purse, cents);
  }
  update();
  return { el, update };
}
