// Suites, the Gift Shop exit, the Paradise Ascent and the end of a run.
import { h, syncList, toast, btn, tween, pulse, wait } from './core.js';
import { app, hud, oppTip, trickTag } from './app.js';
import { jacketTip, trickTip, trickWords, cardTip, dieTip, passEl } from './parts.js';
import { planner } from './prep.js';
import * as D from '../data.js';
import * as R from '../run.js';
import { cents } from '../util.js';
import { t } from '../text.js';

function jacketList(onPick, forSale) {
  const run = app.run, meta = app.meta, box = h('div', { class: 'items list' });
  function render() {
    const ids = Object.keys(D.JACKETS).filter((id) => (forSale ? !meta.jackets.includes(id) && id !== 'standard' : meta.jackets.includes(id) && R.jacketFits(run.cls, id)));
    syncList(box, ids, (id) => id, (id) => { const J = D.JACKETS[id]; const el = h('div', { class: 'item', tip: () => jacketTip(id) }, h('div', { class: 'main' }, h('b', { text: `🧥 ${J.name}` }), h('small', { text: J.effect })), h('span', { class: 'price' }), btn(t(forSale ? 'shop.buy' : 'end.jacket.wear'), () => onPick(id, el), null, 'small')); return el; },
      (el, id) => { const J = D.JACKETS[id]; el.querySelector('.price').textContent = forSale ? (R.jacketAvailable(run, id) ? cents(J.price) : t('end.reachFloor', { floor: J.level + 1 })) : run.jacket === id ? t('end.jacket.wearing') : '';
        el.classList.toggle('sel', !forSale && run.jacket === id); el.lastChild.classList.toggle('off', forSale ? !R.jacketAvailable(run, id) || run.purse + (meta.debit ? meta.atm : 0) < J.price : run.jacket === id); });
  }
  render(); return { el: box, render };
}

export const walletTip = (id) => { const Wl = D.WALLETS[id]; return t('end.wallet.tip', { name: Wl.name, n: Wl.slots, keep: Wl.keep }); };
function walletList(onBuy) {
  const run = app.run, meta = app.meta, box = h('div', { class: 'items list' });
  function render() {
    syncList(box, Object.keys(D.WALLETS).filter((id) => D.WALLETS[id].price > 0 && !meta.wallets.includes(id)), (id) => id, (id) => { const Wl = D.WALLETS[id]; const el = h('div', { class: 'item', tip: () => walletTip(id) }, h('div', { class: 'main' }, h('b', { text: `👛 ${Wl.name}` }), h('small', { text: t('end.wallet.line', { n: Wl.slots, keep: Wl.keep }) })), h('span', { class: 'price' }), btn(t('shop.buy'), () => onBuy(id, el), null, 'small')); return el; },
      (el, id) => { const Wl = D.WALLETS[id], ok = R.walletAvailable(run, meta, id); el.querySelector('.price').textContent = ok ? cents(Wl.price) : Wl.crown && !meta.crowns ? t('end.wallet.crown') : t('end.reachFloor', { floor: Wl.level + 1 }); el.lastChild.classList.toggle('off', !ok || run.purse + (meta.debit ? meta.atm : 0) < Wl.price); });
  }
  render(); return { el: box, render };
}

export function suiteScene(root, penthouse) {
  const run = app.run, H = hud(t(penthouse ? 'suite.penthouse' : 'suite.title'), penthouse ? t('suite.penthouse.sub') : t('suite.sub', { floor: run.floor }));
  const offer = R.suiteOffer(run), dresser = h('div', { class: 'items list' });
  const J = jacketList((id) => { run.jacket = id; J.render(); H.update(); toast(t('suite.changed', { name: D.JACKETS[id].name })); });
  function render() {
    syncList(dresser, offer.filter((x) => !x.taken), (x) => x.uid, (x) => { const def = D.TRICKS[x.id]; return h('div', { class: 'item', style: { '--tc': D.TYPES[def.type].color }, tip: () => trickTip(x, run.cls) }, h('div', { class: 'main' }, h('b', { html: `${def.name} <span class="q">${trickWords(x)}</span>` }), h('small', { text: t('suite.dresser.line', { type: D.TYPES[def.type].name }) })), btn(t('suite.take'), () => { x.taken = true; run.tricks.push({ uid: x.uid, id: x.id, q: x.q, wear: x.wear, rar: x.rar, ...(x.foil ? { foil: x.foil } : {}) }); render(); H.update(); toast(t('suite.taken', { name: def.name })); }, null, 'small')); });
  }
  render();
  const K = D.CLASSES[run.cls];
  root.append(H.el, h('div', { class: 'page cols3' },
    h('div', { class: 'box col' }, h('h2', { text: t('suite.dresser') }), h('p', { class: 'sub', text: t('suite.dresser.sub') }), dresser),
    h('div', { class: 'box col scroll' }, h('h2', { text: t('suite.wardrobe') }), h('p', { class: 'sub', text: t('suite.wardrobe.sub') }), J.el),
    h('div', { class: 'box col' }, h('h2', { text: t(penthouse ? 'suite.bed.nice' : 'suite.bed') }),
      h('p', { class: 'sub', text: t(penthouse ? 'suite.bed.nice.sub' : 'suite.bed.sub', { stat: D.STATS[K.primary].name }) }),
      h('span', { class: 'grow' }), btn(t(penthouse ? 'suite.sleep.ascent' : 'suite.sleep'), () => { R.goToBed(run, penthouse); if (penthouse) { R.buildAscent(run, app.meta); app.nav.ascent(); } else { R.enterFloor(run, run.floor + 1); app.nav.hub(); } }, null, 'big go'))));
}

export function giftScene(root) {
  const run = app.run, meta = app.meta, H = hud(t('gift.title'), t('gift.sub'));
  const atm = h('p', { class: 'sub fade-t' }), depBtn = btn(t('gift.deposit'), () => { const n = R.deposit(run, meta); if (!n) return toast(t('gift.deposit.none'), 'warn'); toast(t('gift.deposited', { amt: cents(n) })); sync(); }, t('gift.atm.tip'), 'small');
  const J = jacketList((id, el) => { if (!R.buyJacket(run, meta, id)) { toast(t('shop.cantAfford'), 'warn'); return pulse(el, 'shake'); } toast(t('gift.jacket.bought', { name: D.JACKETS[id].name })); sync(); }, true);
  const Wl = walletList((id, el) => { if (!R.buyWallet(run, meta, id)) { toast(t('shop.cantAfford'), 'warn'); return pulse(el, 'shake'); } toast(t('gift.wallet.bought', { name: D.WALLETS[id].name })); sync(); });
  function sync() { H.update(); J.render(); Wl.render(); const has = meta.debit || R.hasCard(run, 'debit'); atm.textContent = has ? t('gift.atm.balance', { amt: cents(meta.atm) }) : t('gift.atm.locked'); depBtn.classList.toggle('off', !has || run.purse <= 0); }
  sync();
  root.append(H.el, h('div', { class: 'page cols3' },
    h('div', { class: 'box col scroll' }, h('h2', { text: t('gift.jackets') }), h('p', { class: 'sub', text: t('gift.jackets.sub') }), J.el),
    h('div', { class: 'box col scroll' }, h('h2', { text: t('gift.wallets') }), h('p', { class: 'sub', text: t('gift.wallets.sub') }), Wl.el),
    h('div', { class: 'col' }, h('div', { class: 'box col' }, h('h2', { text: t('gift.atm') }), atm, h('div', { class: 'row' }, depBtn)),
      h('div', { class: 'box col' }, h('h2', { text: t('alley.title') }), h('p', { class: 'sub', text: t('gift.alley.sub') }),
        h('div', { class: 'row' }, btn(t('gift.leave'), () => app.nav.alley(), null, 'big danger'))))));
}

export function ascentScene(root) {
  const run = app.run, A = run.ascent, rung = A.ladder[A.step], H = hud(t('ascent.title'), t('ascent.sub', { step: A.step + 1, of: A.ladder.length }));
  const ladder = h('div', { class: 'ladder list' });
  const P = planner(() => ({}), () => H.update());
  syncList(ladder, A.ladder.map((l, i) => ({ ...l, i })), (l) => l.i, (l) => h('div', { class: 'rung', tip: () => oppTip(l.opp) }, h('span', {}, h('b', { text: l.name }), h('small', { class: 'dim', text: ` ${l.opp.title}` })), h('span', { class: 'gold-t', text: cents(l.networth) })),
    (el, l) => { el.classList.toggle('cur', l.i === A.step); el.classList.toggle('done', l.i < A.step); });
  root.append(H.el, h('div', { class: 'page', style: { display: 'grid', gridTemplateColumns: '300px 1fr 270px', gap: '16px' } },
    h('div', { class: 'box col scroll' }, h('span', { class: 'cap', tip: t('ascent.steps.tip'), text: t('ascent.steps') }), ladder),
    h('div', { class: 'box' }, P.el),
    h('div', { class: 'col' }, h('div', { class: 'box col', tip: () => oppTip(rung.opp) }, h('span', { class: 'cap', text: t('ascent.holding') }), h('h2', { text: rung.name }), h('p', { class: 'sub', text: t('ascent.holder', { title: rung.opp.title, amt: cents(rung.opp.worth) }) }), h('div', { class: 'inv' }, rung.opp.tricks.map((t) => trickTag(t, rung.opp.cls)))),
      btn(t('ascent.climb'), () => { if (P.worth() < 1) return toast(t('prep.needChip'), 'warn'); app.nav.bout(R.startAscent(run)); }, t('ascent.climb.tip'), 'big go'),
      h('p', { class: 'sub', text: t('ascent.safe') }))));
  P.update();
}

// The alley: robbed of everything, with one roll to hold on to the wallet.
export function alleyScene(root) {
  const run = app.run, roll = R.alleyRoll(run), Wl = R.walletOf(run);
  const dice = roll.dice.map((d) => h('span', { class: `die static big ${d.type}`, tip: () => dieTip(d) }, h('i', { text: '?' })));
  const total = h('span', { class: 'total num', text: '—' }), verdict = h('h2', { class: 'fade-t', style: { opacity: 0 } }), kept = h('div', { class: 'inv list' });
  const cont = btn(t('title.continue'), () => { app.kept = roll.kept ? roll.cards : []; app.keptPass = roll.kept ? roll.pass : 0; app.nav.summary(); }, null, 'big go off');
  root.append(h('div', { class: 'page', style: { top: 0, display: 'grid', placeItems: 'center' } }, h('div', { class: 'col', style: { width: '620px', textAlign: 'center', alignItems: 'center', gap: '14px' } },
    h('h1', { class: 'neon-p', text: t('alley.title') }),
    h('p', { class: 'sub', text: t('alley.sub') }),
    h('div', { class: 'box col', style: { alignItems: 'center', width: '100%' }, tip: () => walletTip(run.wallet) }, h('span', { class: 'cap', text: t(roll.pass ? 'alley.wallet.pass' : 'alley.wallet', { name: Wl.name, n: roll.cards.length, pass: roll.pass ? D.PASSES[roll.pass].name : '', need: roll.need }) }),
      h('div', { class: 'row', style: { gap: '18px', margin: '10px 0' } }, dice, h('span', { class: 'dim', text: '=' }), total), verdict, kept), cont)));
  (async () => {
    await wait(900);
    if (!roll.cards.length && !roll.pass) { verdict.textContent = t('alley.empty'); verdict.style.opacity = 1; return cont.classList.remove('off'); }
    for (let i = 0; i < dice.length; i++) { const el = dice[i], d = roll.dice[i], f = D.DICE[d.type].faces; el.classList.add('rolling'); for (let n = 0; n < 12; n++) { el.firstChild.textContent = 1 + Math.floor(Math.random() * f); await wait(70); } el.classList.remove('rolling'); el.firstChild.textContent = d.value; pulse(el); await wait(420); }
    total._v = 0; tween(total, roll.total, undefined, 700); await wait(900);
    verdict.textContent = t(roll.kept ? 'alley.kept' : 'alley.lost'); verdict.className = `fade-t ${roll.kept ? 'neon-c' : 'neon-p'}`; verdict.style.opacity = 1;
    if (roll.kept) syncList(kept, [...(roll.pass ? ['pass'] : []), ...roll.cards], (c) => c, (c) => (c === 'pass' ? passEl(roll.pass) : h('span', { class: 'tag-t', tip: () => cardTip(c), text: D.CARDS[c].name })));
    await wait(500); cont.classList.remove('off');
  })();
}

export function summaryScene(root) {
  const run = app.run, phase = run.phase, sum = R.endRun(run, app.meta, t('end.you'), app.kept || [], app.keptPass || 0); app.run = null; app.kept = null; app.keptPass = null;
  const end = ['ripped', 'paradise', 'fallen'].includes(phase) ? phase : 'alley', head = [t(`end.head.${end}`), t(`end.head.${end}.sub`)];
  const worth = h('span', { class: 'total num' });
  const s = sum.stats, list = h('div', { class: 'scroll', style: { maxHeight: '300px' } }, sum.ledger.slice(-40).reverse().map((l) => h('div', { class: 'line' }, h('span', { text: `${l.floor ? 'F' + Math.min(l.floor, 4) + ' · ' : ''}${l.label}` }), h('span', { class: `amt ${l.amt >= 0 ? 'pos' : 'neg'}`, text: `${l.amt >= 0 ? '+' : '−'}${cents(Math.abs(l.amt))}` }))));
  root.append(h('div', { class: 'page', style: { top: 0, display: 'grid', placeItems: 'center' } }, h('div', { class: 'col', style: { width: '760px' } },
    h('h1', { text: head[0] }), h('p', { class: 'sub', text: head[1] }),
    h('div', { class: 'cols2' }, h('div', { class: 'box col' }, h('span', { class: 'cap', text: t('end.run') }),
      [[t('end.reached'), phase === 'paradise' ? t('end.reached.top') : sum.floor > 4 ? t('ascent.title') : sum.floor ? t('end.reached.floor', { floor: sum.floor, name: D.FLOORS[sum.floor].name }) : t('end.reached.door')], [t('end.bouts'), t('end.bouts.n', { won: s.wins, of: s.bouts })], [t('end.dd'), s.dd], [t('end.turns'), s.turns], [t('end.spent'), cents(s.spent)], [t('end.won'), cents(s.won)]].map(([a, b]) => h('div', { class: 'line' }, h('span', { text: a }), h('b', { text: b }))),
      h('div', { class: 'row between' }, h('span', { class: 'cap', text: t('end.networth') }), worth)),
    h('div', { class: 'box col' }, h('span', { class: 'cap', text: t('end.ledger') }), list)),
    h('div', { class: 'row' }, btn(t('end.street'), () => app.nav.title(), null, 'big go')))));
  worth._v = 0; setTimeout(() => tween(worth, sum.networth, cents, 1400), 500);
}
