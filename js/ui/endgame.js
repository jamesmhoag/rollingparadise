// Suites, the Gift Shop exit, the Paradise Ascent and the end of a run.
import { h, syncList, toast, btn, tween, pulse } from './core.js';
import { app, hud, oppTip, trickTag } from './app.js';
import { jacketTip, trickTip, pips } from './parts.js';
import { planner } from './prep.js';
import * as D from '../data.js';
import * as R from '../run.js';
import { cents } from '../util.js';

function jacketList(onPick, forSale) {
  const run = app.run, meta = app.meta, box = h('div', { class: 'items list' });
  function render() {
    const ids = Object.keys(D.JACKETS).filter((id) => (forSale ? !meta.jackets.includes(id) && id !== 'standard' : meta.jackets.includes(id)));
    syncList(box, ids, (id) => id, (id) => { const J = D.JACKETS[id]; const el = h('div', { class: 'item', tip: () => jacketTip(id) }, h('div', { class: 'main' }, h('b', { text: `🧥 ${J.name}` }), h('small', { text: J.effect })), h('span', { class: 'price' }), btn(forSale ? 'Buy' : 'Wear', () => onPick(id, el), null, 'small')); return el; },
      (el, id) => { const J = D.JACKETS[id]; el.querySelector('.price').textContent = forSale ? (R.jacketAvailable(run, id) ? cents(J.price) : `Reach floor ${J.level + 1}`) : run.jacket === id ? 'Wearing' : '';
        el.classList.toggle('sel', !forSale && run.jacket === id); el.lastChild.classList.toggle('off', forSale ? !R.jacketAvailable(run, id) || run.purse + (meta.debit ? meta.atm : 0) < J.price : run.jacket === id); });
  }
  render(); return { el: box, render };
}

export function suiteScene(root, penthouse) {
  const run = app.run, H = hud(penthouse ? 'Penthouse Suite' : 'Suite', penthouse ? 'The nicest rooms in the Royal Paradise' : `Above floor ${run.floor}`);
  const offer = R.suiteOffer(run), dresser = h('div', { class: 'items list' });
  const J = jacketList((id) => { run.jacket = id; J.render(); H.update(); toast(`You change into the ${D.JACKETS[id].name} jacket.`); });
  function render() {
    syncList(dresser, offer.filter((t) => !t.taken), (t) => t.uid, (t) => { const def = D.TRICKS[t.id]; return h('div', { class: 'item', style: { '--tc': D.TYPES[def.type].color }, tip: () => trickTip(t, run.cls) }, h('div', { class: 'main' }, h('b', { html: `${def.name} <span class="q">${pips(t)}</span>` }), h('small', { text: `${D.TYPES[def.type].name} · left on the dresser` })), btn('Take', () => { t.taken = true; run.tricks.push({ uid: t.uid, id: t.id, q: t.q, up: t.up }); render(); H.update(); toast(`${def.name} added to your Book.`); }, null, 'small')); });
  }
  render();
  const K = D.CLASSES[run.cls];
  root.append(H.el, h('div', { class: 'page cols3' },
    h('div', { class: 'box col' }, h('h2', { text: 'The Dresser' }), h('p', { class: 'sub', text: 'Somebody left these behind. Take what you like.' }), dresser),
    h('div', { class: 'box col scroll' }, h('h2', { text: 'The Wardrobe' }), h('p', { class: 'sub', text: 'Jackets you have unlocked in the Gift Shop. You can only change in a Suite.' }), J.el),
    h('div', { class: 'box col' }, h('h2', { text: penthouse ? 'The Nice Bed' : 'The Bed' }),
      h('p', { class: 'sub', text: penthouse ? `Two bouts of +2 ${D.STATS[K.primary].name}. To leave the Penthouse you must don the Ascension gear: your cards and jacket stay in the room.` : `Rest grants +1 ${D.STATS[K.primary].name} for your next bout. Going to bed is how you leave the Suite.` }),
      h('span', { class: 'grow' }), btn(penthouse ? 'Sleep, then begin the Ascent' : 'Go to bed', () => { R.goToBed(run, penthouse); if (penthouse) { R.buildAscent(run, app.meta); app.nav.ascent(); } else { R.enterFloor(run, run.floor + 1); app.nav.hub(); } }, null, 'big go'))));
}

export function giftScene(root) {
  const run = app.run, meta = app.meta, H = hud('Gift Shop', 'The exit is this way');
  const atm = h('p', { class: 'sub fade-t' }), depBtn = btn('Deposit everything', () => { const n = R.deposit(run, meta); if (!n) return toast('Nothing to deposit.', 'warn'); toast(`${cents(n)} deposited for a future run.`); sync(); }, '<b>ATM</b><p>With a Debit Card, chips you deposit here can pay for Gift Shop unlocks on later runs. They can never go back to the tables.</p>', 'small');
  const J = jacketList((id, el) => { if (!R.buyJacket(run, meta, id)) { toast('You cannot afford that.', 'warn'); return pulse(el, 'shake'); } toast(`${D.JACKETS[id].name} jacket unlocked for every future run.`); sync(); }, true);
  function sync() { H.update(); J.render(); const has = meta.debit || R.hasCard(run, 'debit'); atm.textContent = has ? `ATM balance: ${cents(meta.atm)}. It tops up Gift Shop purchases automatically.` : 'You never found a Debit Card, so the ATM will not talk to you. Search the floors next time.'; depBtn.classList.toggle('off', !has || run.purse <= 0); }
  sync();
  root.append(H.el, h('div', { class: 'page cols2' },
    h('div', { class: 'box col scroll' }, h('h2', { text: 'Jackets' }), h('p', { class: 'sub', text: 'Unlocked for good. Choose one at the start of any run, or change in a Suite.' }), J.el),
    h('div', { class: 'col' }, h('div', { class: 'box col' }, h('h2', { text: 'ATM' }), atm, h('div', { class: 'row' }, depBtn)),
      h('div', { class: 'box col' }, h('h2', { text: 'The Alley' }), h('p', { class: 'sub', text: 'Once you step outside, frenzied Rollers looking for a way back in will take every chip and all the gear you carry. At least you escape with your life, and another shot at the top, one day.' }),
        h('div', { class: 'row' }, btn('Leave through the alley', () => app.nav.summary(), null, 'big danger'))))));
}

export function ascentScene(root) {
  const run = app.run, A = run.ascent, rung = A.ladder[A.step], H = hud('Paradise Ascent', `Step ${A.step + 1} of ${A.ladder.length}`);
  const ladder = h('div', { class: 'ladder list' });
  const P = planner(() => ({}), () => H.update());
  syncList(ladder, A.ladder.map((l, i) => ({ ...l, i })), (l) => l.i, (l) => h('div', { class: 'rung', tip: () => oppTip(l.opp) }, h('span', {}, h('b', { text: l.name }), h('small', { class: 'dim', text: ` ${l.opp.title}` })), h('span', { class: 'gold-t', text: cents(l.networth) })),
    (el, l) => { el.classList.toggle('cur', l.i === A.step); el.classList.toggle('done', l.i < A.step); });
  root.append(H.el, h('div', { class: 'page', style: { display: 'grid', gridTemplateColumns: '300px 1fr 270px', gap: '16px' } },
    h('div', { class: 'box col scroll' }, h('span', { class: 'cap', tip: '<b>The Ascent</b><p>Each step is held by the build of a Roller who made it here. No shops, no wagers, no tilts. Lose once and the run is over. Your own finished builds join this ladder for future runs.</p>', text: 'The steps' }), ladder),
    h('div', { class: 'box' }, P.el),
    h('div', { class: 'col' }, h('div', { class: 'box col', tip: () => oppTip(rung.opp) }, h('span', { class: 'cap', text: 'Holding this step' }), h('h2', { text: rung.name }), h('p', { class: 'sub', text: `${rung.opp.title} · ${cents(rung.opp.worth)} on the table` }), h('div', { class: 'inv' }, rung.opp.tricks.map((t) => trickTag(t, rung.opp.cls)))),
      btn('Climb', () => { if (P.worth() < 1) return toast('Put at least one chip in your position.', 'warn'); app.nav.bout(R.startAscent(run)); }, '<b>Climb</b><p>Chips you leave out of your position are safe. Win and you take the step; lose and the run ends here.</p>', 'big go'),
      h('p', { class: 'sub', text: 'On the Ascent, chips kept off the table are not wagered and cannot be lost.' }))));
  P.update();
}

export function summaryScene(root) {
  const run = app.run, phase = run.phase, sum = R.endRun(run, app.meta); app.run = null;
  const head = phase === 'paradise' ? ['Paradise', 'There are no more Rollers. You are the best.'] : phase === 'fallen' ? ['The long way down', 'Your build stays on the steps, waiting for the next Roller.'] : ['The alley', 'They took the chips, the dice and the book. You kept your life.'];
  const worth = h('span', { class: 'total num' });
  const s = sum.stats, list = h('div', { class: 'scroll', style: { maxHeight: '300px' } }, sum.ledger.slice(-40).reverse().map((l) => h('div', { class: 'line' }, h('span', { text: `${l.floor ? 'F' + Math.min(l.floor, 4) + ' · ' : ''}${l.label}` }), h('span', { class: `amt ${l.amt >= 0 ? 'pos' : 'neg'}`, text: `${l.amt >= 0 ? '+' : '−'}${cents(Math.abs(l.amt))}` }))));
  root.append(h('div', { class: 'page', style: { top: 0, display: 'grid', placeItems: 'center' } }, h('div', { class: 'col', style: { width: '760px' } },
    h('h1', { text: head[0] }), h('p', { class: 'sub', text: head[1] }),
    h('div', { class: 'cols2' }, h('div', { class: 'box col' }, h('span', { class: 'cap', text: 'The run' }),
      [['Reached', phase === 'paradise' ? 'The top step' : sum.floor > 4 ? 'Paradise Ascent' : sum.floor ? `Floor ${sum.floor}: ${D.FLOORS[sum.floor].name}` : 'The front door'], ['Bouts won', `${s.wins} of ${s.bouts}`], ['Double Downs won', s.dd], ['Turns played', s.turns], ['Chips spent', cents(s.spent)], ['Chips won', cents(s.won)]].map(([a, b]) => h('div', { class: 'line' }, h('span', { text: a }), h('b', { text: b }))),
      h('div', { class: 'row between' }, h('span', { class: 'cap', text: 'Net worth at the end' }), worth)),
    h('div', { class: 'box col' }, h('span', { class: 'cap', text: 'Every transaction' }), list)),
    h('div', { class: 'row' }, btn('Back to the street', () => app.nav.title(), null, 'big go')))));
  worth._v = 0; setTimeout(() => tween(worth, sum.networth, cents, 1400), 500);
}
