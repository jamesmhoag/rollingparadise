// The floor: a map of places to visit between bouts, each opening as a panel.
import { h, syncList, openPanel, closePanel, toast, btn, tween, pulse, swapText } from './core.js';
import { app, hud, oppTip, trickTag, diceSummary } from './app.js';
import { faceList, dieName, canMelt, matOf } from '../dice.js';
import { meltVolume, castNeed, castFor, mixDyes, mixOpen } from '../forge.js';
import { dieEl, dieTip, trickTip, trickWords, drinkTip, cardTip, chipEl, chipTip, cardEl, walletEl, jacketEl, drinkEl, feltStyle, passEl } from './parts.js';
import * as D from '../data.js';
import * as R from '../run.js';
import { cents } from '../util.js';
import { t } from '../text.js';
import { iconKids } from './icons.js';

const MIN_BUYIN = 5;
let rerender = () => {};

// Floor plans, in a 900 x 620 space. Each floor lays the same features out differently, after the
// workbook's sketch: stairs up behind the head table, game tables in the middle, shops on one
// wall, the House's book and the Lounge on the other, the way in at the bottom by the dodgy corner.
const mirror = (plan) => Object.fromEntries(Object.entries(plan).map(([k, [x, y, w, hh]]) => [k, [900 - x - w, y, w, hh]]));
const BASEMENT = { dice: [20, 494, 200, 96], stairs: [390, 8, 120, 62], boss: [335, 84, 230, 132], kit: [40, 26, 190, 112], t0: [357, 376, 185, 124], t1: [245, 236, 185, 124], t2: [470, 236, 185, 124],
  smith: [690, 26, 190, 122], trader: [690, 160, 190, 122], exchange: [690, 294, 190, 112], book: [20, 164, 200, 150], lounge: [20, 328, 200, 150], exit: [690, 418, 190, 96], search: [716, 528, 164, 82], entry: [380, 544, 140, 66] };
const PLANS = {
  1: BASEMENT, 2: mirror(BASEMENT),
  3: { dice: [716, 500, 164, 100], smith: [20, 20, 190, 116], trader: [222, 20, 190, 116], exchange: [424, 20, 190, 116], stairs: [760, 14, 120, 62], boss: [656, 92, 224, 140], t1: [124, 176, 185, 124], t2: [344, 176, 185, 124], t0: [244, 340, 185, 124],
    book: [20, 500, 210, 104], lounge: [452, 330, 240, 150], kit: [20, 330, 200, 112], exit: [716, 276, 164, 96], search: [716, 404, 164, 86], entry: [396, 544, 140, 66] },
  4: { dice: [20, 152, 112, 200], stairs: [390, 6, 120, 58], boss: [325, 72, 250, 136], t1: [140, 214, 185, 124], t0: [357, 270, 185, 124], t2: [575, 214, 185, 124], smith: [20, 26, 190, 116], trader: [20, 366, 190, 116], exchange: [690, 26, 190, 116],
    book: [690, 366, 190, 124], lounge: [240, 398, 205, 130], kit: [460, 398, 190, 112], exit: [690, 506, 190, 92], search: [20, 500, 170, 92], entry: [380, 548, 140, 62] },
};
const FLOOR_HUE = { 1: '#7dffb5', 2: '#ff86ea', 3: '#7df3ff', 4: '#ffd76a' };
const at = { floor: 0, k: 'entry' }; // where your Roller is standing
function furniture(kind) {
  const s = (cls, n = 1) => Array.from({ length: n }, () => h('i', { class: cls }));
  switch (kind) {
    case 'table': return [h('i', { class: 'felt' }), ...s('seat', 4), h('i', { class: 'opp' })];
    case 'boss': return [h('i', { class: 'dais' }), h('i', { class: 'felt' }), ...s('seat', 4), h('i', { class: 'opp' })];
    case 'smith': return [h('i', { class: 'forge' }), h('i', { class: 'anvil' }, ...iconKids('room:smith', '⚒'))];
    case 'trader': return [...s('shelf', 3), h('i', { class: 'glyph' }, ...iconKids('room:trader', '🃏'))];
    case 'dice': return [...s('shelf', 2), h('i', { class: 'glyph' }, ...iconKids('room:dice', '🎲'))];
    case 'exchange': return [h('i', { class: 'cage' }), h('i', { class: 'glyph' }, ...iconKids('room:exchange', '🪙'))];
    case 'lounge': return [h('i', { class: 'barc' }), ...s('stool', 4), h('i', { class: 'glyph' }, ...iconKids('room:lounge', '🍹'))];
    case 'book': return [...s('screen', 4), h('i', { class: 'glyph' }, ...iconKids('room:book', '🏇'))];
    case 'search': return [h('i', { class: 'lamp' }), h('i', { class: 'glyph' }, ...iconKids('room:search', '🔎'))];
    case 'kit': return [...s('locker', 4), h('i', { class: 'glyph' }, ...iconKids('room:kit', '🎒'))];
    case 'exit': return [h('i', { class: 'door' }), h('i', { class: 'exitsign', text: 'EXIT' })];
    default: return [h('i', { class: 'steps' })];
  }
}

export function hubScene(root) {
  const run = app.run, fs = run.fs, F = D.FLOORS[run.floor], P = PLANS[run.floor] || BASEMENT;
  const H = hud(F.name, `Floor ${run.floor} of 4`);
  if (at.floor !== run.floor) { at.floor = run.floor; at.k = 'entry'; }
  const news = h('ul', { class: 'news list' }), book = h('div', { class: 'inv list' }), hint = h('p', { class: 'sub fade-t' });
  const plan = h('div', { class: 'plan', style: { '--fc': FLOOR_HUE[run.floor] } }, h('div', { class: 'carpet' }));
  const rooms = {}, me = h('div', { class: 'pawn', style: { '--cc': D.CLASSES[run.cls].color }, tip: () => `<b>You</b> <span class="dim">${D.heroName(run.cls)}</span><p>Click anywhere on the floor to walk there.</p>` }, h('i', {}), h('b', { text: 'YOU' }));
  const spot = (k) => { const [x, y, w, hh] = P[k]; return { x: x + w / 2 - 15, y: y + hh - 34 }; };
  const stand = (k) => { const p = spot(k); me.style.transform = `translate(${p.x}px, ${p.y}px)`; };
  let walking = false;
  function visit(k, fn) { if (walking) return; if (at.k === k) return fn(); walking = true; at.k = k; stand(k); me.classList.add('walk'); setTimeout(() => { walking = false; me.classList.remove('walk'); fn(); }, 720); }
  for (const [k, [x, y, w, hh]] of Object.entries(P)) {
    const kind = /^t\d/.test(k) ? 'table' : k;
    const el = h('div', { class: `room r-${kind}`, role: 'button', style: { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${hh}px` } }, h('span', { class: 'furn' }, furniture(kind)), h('b', { class: 'rname' }), h('small', { class: 'rsub' }), h('span', { class: 'tag fade-t' }));
    rooms[k] = el; plan.append(el);
  }
  plan.append(me); stand(at.k);
  root.append(H.el, h('div', { class: 'page' }, h('div', { class: 'hub' }, plan,
    h('div', { class: 'side' },
      h('div', { class: 'box scroll', style: { flex: '1' } }, h('span', { class: 'cap', text: t('floor.news') }), news),
      h('div', { class: 'box' }, h('span', { class: 'cap', text: t('floor.yourBook') }), book, hint)))));

  function tiles() {
    const out = [], buyin = () => toast(t('floor.buyin', { min: cents(MIN_BUYIN) }), 'warn');
    fs.tables.forEach((tb, i) => { const st = R.tableState(run, i);
      const lock = { later: t('floor.table.later'), passed: t('floor.table.passed') }[st];
      out.push({ k: 't' + i, unseen: !tb.seen, cls: `table ${st === 'beaten' ? 'done' : ''} ${lock ? 'locked' : ''}`, ico: '🎴', name: tb.seen ? tb.opp.name : t('floor.table.name', { n: i + 1 }), tag: t('floor.table.tag', { choice: i ? t('floor.table.choice') : '', felt: D.feltOf(tb.felt).name }), felt: tb.felt,
        sub: st === 'beaten' ? t('floor.table.beaten') : st === 'passed' ? t('floor.table.packed') : st === 'later' ? t('floor.table.opensAfter') : tb.seen ? t('floor.table.seen', { cls: D.CLASSES[tb.opp.cls].name, worth: cents(tb.opp.worth), closes: i ? t('floor.table.closesOther') : '' }) : t('floor.table.stranger'),
        tip: () => `${tb.seen ? oppTip(tb.opp) : t('floor.table.unknown')}${lock ? `<p class="bad keep">${lock}</p>` : `<p class="keep">${t(i ? 'floor.table.choiceTip' : 'floor.table.firstTip')}</p>`}`,
        on: () => { if (st === 'beaten') return toast(t('floor.table.closed')); if (lock) return toast(lock, 'warn'); if (run.purse < MIN_BUYIN) return buyin(); app.nav.prep('table', i); } }); });
    const b = fs.boss;
    out.push({ k: 'boss', felt: b.felt || 'royal', cls: `boss ${fs.bossOpen ? '' : 'locked'} ${b.beaten ? 'done' : ''}`, ico: '👑', name: b.opp.name, tag: t('floor.boss.tag'), sub: fs.bossOpen ? t('floor.boss.open', { worth: cents(b.opp.worth), mult: D.TUNING.wager.boss }) : t(R.tablesLeft(run) === 2 ? 'floor.boss.need2' : 'floor.boss.need1'),
      tip: () => (fs.bossOpen ? oppTip(b.opp) : t('floor.boss.hidden', { name: b.opp.name })),
      on: () => { if (!fs.bossOpen) return toast(t('floor.boss.notYet'), 'warn'); if (run.purse < MIN_BUYIN) return buyin(); app.nav.prep('boss', 0); } });
    out.push({ k: 'smith', ico: '⚒️', name: t('floor.smith.name'), sub: t('floor.smith.sub'), tip: t('floor.smith.tip'), on: () => smithPanel() });
    out.push({ k: 'dice', ico: '🎲', name: t('floor.dice.name'), sub: t('floor.dice.sub', { n: R.diceShop(run).length }), tip: t('floor.dice.tip'), on: () => diceShopPanel() });
    out.push({ k: 'trader', ico: '🃏', name: t('floor.trader.name'), sub: t('floor.trader.sub', { n: fs.shop.length }), tag: R.hasCard(run, 'membership') ? t('floor.trader.member') : null, tip: t('floor.trader.tip'), on: () => traderPanel() });
    out.push({ k: 'exchange', ico: '🪙', name: t('floor.exchange.name'), sub: t('floor.exchange.sub', { max: R.maxDenom(run.floor) }), tip: t('floor.exchange.tip'), on: () => exchangePanel() });
    out.push({ k: 'lounge', ico: '🍹', name: t('floor.lounge.name'), sub: t(fs.lounge.happy ? 'floor.lounge.happy' : 'floor.lounge.sub'), tag: run.drink ? `${run.drink.name}` : null, tip: t('floor.lounge.tip'), on: () => loungePanel() });
    const open = fs.book.events.filter((e) => e.bet && !e.done).length;
    out.push({ k: 'book', ico: '🏇', name: t('floor.book.name'), sub: open ? t('floor.book.riding', { n: open }) : t('floor.book.sub'), tip: t('floor.book.tip'), on: () => bookPanel() });
    out.push({ k: 'search', cls: fs.searched ? 'done' : '', ico: '🔎', name: t('floor.search.name'), sub: t(fs.searched ? 'floor.search.done' : 'floor.search.sub'), tip: t('floor.search.tip'),
      on: () => { const id = R.searchFloor(run); if (!id) return toast(t('floor.search.again')); if (run.pendingCard) { render(); return walletFullPanel(); } toast(t('floor.search.found', { card: D.CARDS[id].name })); render(); } });
    out.push({ k: 'kit', ico: '🎒', name: t('floor.kit.name'), sub: t('floor.kit.sub', { dice: run.dice.length, tricks: run.tricks.length, cards: run.cards.length }), tip: t('floor.kit.tip'), on: () => kitPanel() });
    out.push({ k: 'exit', cls: 'exit', ico: '🚪', name: t('floor.exit.name'), sub: t('floor.exit.sub'), tip: t('floor.exit.tip'), on: () => exitPanel() });
    const up = t(run.floor < 4 ? 'floor.stairs.up' : 'floor.stairs.lift');
    out.push({ k: 'stairs', cls: fs.boss.beaten ? '' : 'locked', name: up, sub: run.floor < 4 ? t('floor.stairs.to', { floor: D.FLOORS[run.floor + 1].name }) : t('floor.stairs.toPenthouse'),
      tip: t('floor.stairs.tip', { name: up }), on: () => toast(t('floor.stairs.blocked', { boss: fs.boss.opp.name }), 'warn') });
    out.push({ k: 'entry', name: t(run.floor > 1 ? 'floor.entry.down' : 'floor.entry.door'), sub: t('floor.entry.sub'), tip: t('floor.entry.tip'),
      on: () => { R.saveRun(run); toast(t('floor.entry.saved')); app.nav.title(); } });
    return out.filter((x) => !D.TUNING.rooms[x.k] || D.TUNING.rooms[x.k].includes(run.floor)); // rooms the tuner keeps off this floor
  }
  function render() {
    H.update();
    const live = tiles(); for (const [k, el] of Object.entries(rooms)) el.style.display = D.TUNING.rooms[k] && !live.some((x) => x.k === k) ? 'none' : '';
    for (const t of live) { const el = rooms[t.k]; if (!el) continue;
      for (const c of ['done', 'locked']) el.classList.toggle(c, (t.cls || '').split(' ').includes(c));
      const [, nm, sub, tag] = el.children; swapText(nm, t.name); swapText(sub, t.sub); if (t.tag) tag.textContent = t.tag; tag.style.opacity = t.tag ? 1 : 0;
      if (t.felt) for (const [p, v] of Object.entries(feltStyle(t.felt))) el.style.setProperty(p, v);
      el.classList.toggle('unseen', !!t.unseen); el.onclick = () => visit(t.k, t.on); el._tip = t.tip; el.classList.add('has-tip'); }
    syncList(news, run.news.slice(-7).map((text, i) => ({ text, k: run.news.length - Math.min(7, run.news.length) + i })).reverse(), (n) => n.k, (n) => h('li', { text: n.text }));
    syncList(book, run.tricks, (t) => t.uid + ':' + t.q + ':' + D.condOf(t), (t) => trickTag(t, run.cls));
    swapText(hint, R.brokeHint(run) || t('floor.pouchHint', { dice: diceSummary(run.dice) }));
    R.saveRun(run);
  }
  rerender = render; render();
  if (run.pendingCard) setTimeout(() => { if (app.run === run && run.pendingCard) walletFullPanel(); }, 700);
}

// ---------- panels ----------
const head = (title, sub) => h('div', { class: 'row between', style: { marginBottom: '12px' } }, h('div', {}, h('h2', { text: title }), h('p', { class: 'sub', text: sub })),
  h('div', { class: 'row' }, purseEl(), btn('Done', () => closePanel(), null, 'small')));
let purseNum = null;
function purseEl() { purseNum = h('b', { class: 'num gold-t' }); tween(purseNum, app.run.purse, cents); return h('span', { class: 'stat' }, h('em', { text: 'Purse' }), purseNum); }
function after(render) { return () => { render(); if (purseNum) tween(purseNum, app.run.purse, cents); rerender(); }; }
const item = (cls = '') => h('div', { class: `item ${cls}` }, h('div', { class: 'main' }, h('b', {}), h('small', {})), h('span', { class: 'price' }));
const setItem = (el, name, sub, price) => { el.querySelector('.main b').innerHTML = name; el.querySelector('.main small').innerHTML = sub; el.querySelector('.price').textContent = price ?? ''; };
function tryDo(ok, el, msg) { if (!ok) { toast(msg || 'You cannot afford that.', 'warn'); if (el) pulse(el, 'shake'); } return ok; }

function smithPanel() {
  const run = app.run; let type = 'd6', melt = [], dyes = [], last = null;
  const sizes = h('div', { class: 'row wrap' }), pouch = h('div', { class: 'dicebox list' }), volume = h('p', { class: 'sub' }), castLine = h('p', {});
  const dyeBox = h('div', { class: 'row wrap' }), chosen = h('div', { class: 'row wrap' }), rollLine = h('p', { class: 'sub' }), go = h('div', { class: 'items list' }), result = h('div', { class: 'forge-log' });
  const done = after(render);
  const pouchEl = new Map(); let curCast = null; // the cast as last shown, for the dye buttons
  const meltDice = () => melt.map((id) => run.dice.find((d) => d.id === id)).filter(Boolean);
  function render() {
    melt = melt.filter((id) => run.dice.some((d) => d.id === id));
    syncList(sizes, D.COMPLEXITY, (t) => t, (t) => { const el = btn('', () => { type = t; render(); }, null, 'small'); el.append(dieEl({ type: t })); return el; },
      (el, t) => { el.classList.toggle('on', t === type); el.classList.toggle('off', run.floor < R.forgeFloor(t)); el._tip = () => `<b>Cast a ${t}</b><p>Needs ${castNeed(t)} melted volume and ${cents(R.forgeCost(run, t))}.${run.floor < R.forgeFloor(t) ? ` From floor ${R.forgeFloor(t)}.` : ''}</p>`; el.classList.add('has-tip'); });
    syncList(pouch, run.dice, (d) => d.id + ':' + faceList(d).join(), (d) => { const el = dieEl(d); pouchEl.set(d.id, el);
      el.onclick = () => { if (!canMelt(d)) return toast(`${D.MATERIALS[d.mat].name} dice cannot be melted.`, 'warn'); melt = melt.includes(d.id) ? melt.filter((x) => x !== d.id) : [...melt, d.id]; render(); };
      el._tip = () => dieTip(d, canMelt(d) ? `Melts to ${meltVolume([d])} volume. Click to add it to the melt.` : 'It cannot be melted.'); el.classList.add('has-tip'); return el; },
    (el, d) => { el.classList.toggle('sel', melt.includes(d.id)); el.classList.toggle('off', !canMelt(d)); });
    const md = meltDice(), vol = meltVolume(md), need = castNeed(type), ck = md.length ? castFor(md.map(matOf)) : null;
    swapText(volume, md.length ? `Melting ${diceSummary(md)}: ${vol} volume of the ${need} a ${type} needs.` : `Pick dice to melt. A ${type} needs ${need} volume; each die melts to half its faces.`);
    const plan = R.forgePlanFor(run, type, melt, dyes), C = ck && D.CASTS[ck], U = D.MELT.unlock; curCast = C;
    castLine.innerHTML = C ? `<span class="k">${C.name}</span> ${C.text} <span class="dim">${t(C.needs ? 'smith.cast.rolls.diamond' : 'smith.cast.rolls', { type, mats: C.mats.map((m) => D.MATERIALS[m].name).join(' + ') })}</span>`
      : `<span class="dim">${t('smith.cast.how')}</span>`;
    castLine.append(h('span', { class: 'dim', html: ` ${t('smith.unlocks', { mix: U.mix, complex: U.complex })}${mixOpen('mix', run.floor) ? '' : ` ${t('smith.unlocks.notYet')}`}` }));
    const primaries = Object.keys(D.DYES).filter((k) => !D.DYES[k].from), mixes = Object.keys(D.DYES).filter((k) => D.DYES[k].from);
    const mixTip = (k) => mixes.filter((m) => D.DYES[m].from.includes(k)).map((m) => t('smith.dye.mixes', { other: D.DYES[D.DYES[m].from.find((x) => x !== k)].name, mix: D.DYES[m].name, text: D.DYES[m].text })).join('');
    syncList(dyeBox, primaries, (k) => k, (k) => btn(D.DYES[k].name, () => { const C = curCast, cap = C?.needs ? C.needs.length * 2 : D.MELT.maxDyes; if ((C?.needs ? dyes.length + 1 : mixDyes([...dyes, k], mixOpen('mix', run.floor)).length) > cap) return toast(t(C?.needs ? 'smith.dye.diamond' : 'smith.dye.full', { n: D.MELT.maxDyes }), 'warn'); dyes = [...dyes, k]; render(); },
      () => `<b>${D.DYES[k].name}</b><p>${D.DYES[k].text}</p>${mixTip(k)}<p class="dim">${t('smith.dye.rolls', { n: D.DYES[k].dice, price: cents(D.DYES[k].price) })}</p>`, 'small dye'), (el, k) => el.style.setProperty('--dye', D.DYES[k].color));
    // what the chosen primaries play as: mixes where two different ones meet
    const played = mixDyes(dyes, mixOpen('mix', run.floor));
    syncList(chosen, played.map((k, i) => ({ k, i })), (x) => x.i + ':' + x.k, (x) => btn(`${D.DYES[x.k].name} ✕`, () => { const take = D.DYES[x.k].from || [x.k]; for (const k of take) { const j = dyes.lastIndexOf(k); if (j >= 0) dyes.splice(j, 1); } dyes = [...dyes]; render(); },
      () => `<b>${D.DYES[x.k].name}</b><p>${D.DYES[x.k].text}</p>${D.DYES[x.k].from ? `<p class="dim">${t('smith.dye.mixed', { a: D.DYES[D.DYES[x.k].from[0]].name, b: D.DYES[D.DYES[x.k].from[1]].name })}</p>` : ''}<p class="dim">${t('smith.dye.remove')}</p>`, 'small dye on'), (el, x) => el.style.setProperty('--dye', D.DYES[x.k].color));
    // the dice the cast rolls, from the pouch
    const rolled = plan.rolled.filter(Boolean), short = plan.reqs.filter((_, i) => !plan.rolled[i]);
    rollLine.innerHTML = !D.MELT.castFromPouch || !plan.reqs.length ? '' : short.length ? t('smith.rolls.short', { type, need: plan.reqs.map((q) => (q.mat ? D.MATERIALS[q.mat].name : t('smith.rolls.any'))).join(', '), missing: short.map((q) => (q.mat ? D.MATERIALS[q.mat].name : t('smith.rolls.any'))).join(', ') })
      : t('smith.rolls', { n: plan.reqs.length, type, dice: diceSummary(rolled) });
    for (const el of pouch.children) el.classList.toggle('rolls', rolled.some((d) => el === pouchEl.get(d.id)));
    const why = R.forgeWhy(run, type, melt, dyes), cost = R.forgeCost(run, type, dyes);
    const acts = [{ k: 'forge', name: `Cast a ${type}`, sub: why ? `<span class="bad">${why}</span>` : `Melts ${diceSummary(md)}${played.length ? `, with ${played.map((k) => D.DYES[k].name).join(', ')}` : ''}.`, price: cents(cost), label: 'Forge', off: !!why,
      go: () => { const r = R.forge(run, type, melt, dyes); if (!r) return toast(why || 'The Diesmith cannot cast that.', 'warn'); last = r; melt = []; dyes = []; } }];
    if (!why && rolled.length) acts[0].sub += ` ${t('smith.rolls.lost', { dice: diceSummary(rolled) })}`;
    if (melt.length === 1) { const d = run.dice.find((x) => x.id === melt[0]); acts.push({ k: 'sell', name: `Sell this ${dieName(d)}`, sub: 'The Diesmith pays in chips.', price: `+${cents(R.dieSellValue(d))}`, label: 'Sell', go: () => { tryDo(R.sellDie(run, d.id), null, 'Keep at least one die.'); melt = []; } }); }
    syncList(go, acts, (a) => a.k, (a) => { const el = item(); el.append(btn(a.label, () => { el._go(); done(); }, null, 'small')); return el; }, (el, a) => { setItem(el, a.name, a.sub, a.price); el._go = a.go; el.lastChild.classList.toggle('off', !!a.off); });
    result.replaceChildren(...(last ? [h('span', { class: 'cap', text: 'Fresh from the forge' }), h('div', { class: 'row' }, dieEl(last.die), h('b', { text: `${dieName(last.die)}: ${faceList(last.die).join(' ')}` })),
      ...last.log.map((l) => h('p', { class: l.missed ? 'dim' : '', html: `<span class="k">${l.name}</span> rolled ${l.rolls.join(', ')}. ${l.text} <span class="dim">→ ${l.after.join(' ')}</span>` }))] : []));
  }
  render();
  openPanel(h('div', {}, head('Diesmith', 'Melts your dice down and casts a new one. Every melt rolls into the cast; dyes add more.'),
    h('div', { class: 'cols2' },
      h('div', {}, h('span', { class: 'cap', text: 'Size to cast' }), sizes, h('span', { class: 'cap', text: 'Your pouch — pick dice to melt' }), pouch, volume, castLine),
      h('div', {}, h('span', { class: 'cap', text: t('smith.dyes', { n: D.MELT.maxDyes }) }), dyeBox, chosen, rollLine, go, result))), { wide: true });
}

function diceShopPanel() {
  const run = app.run, shelf = h('div', { class: 'items list' }), done = after(render);
  function render() {
    syncList(shelf, R.diceShop(run), (it) => it.key, (it) => { const el = item(it.die.mat === 'bone' ? 'bone' : '');
      el.append(btn('Buy', () => { tryDo(R.buyShopDie(run, it.key), el); done(); }, null, 'small')); el.prepend(dieEl(it.die)); el._tip = () => dieTip(it.die); el.classList.add('has-tip'); return el; },
    (el, it) => { const B = it.die.bone && D.BONE[it.die.bone];
      setItem(el, dieName(it.die), B ? `${faceList(it.die).join(' ')} · ${D.upgradeText(B.up)} <span class="dim">Cannot be melted or modified.</span>` : `${faceList(it.die).join(' ')} <span class="dim">${D.MATERIALS[it.die.mat].text}</span>`, cents(R.dieCost(run, it)));
      el.lastChild.classList.toggle('off', run.purse < R.dieCost(run, it)); });
    if (!R.diceShop(run).length) syncList(shelf, [{ k: 0 }], (x) => x.k, () => h('p', { class: 'sub', text: 'Sold out until the next floor.' }));
  }
  render();
  openPanel(h('div', {}, head('Dice Shop', 'Plain dice in Glass, Plastic and Metal, and Bone dice carved with a trait.'), shelf));
}

function trickItem(run, getT) {
  const el = item(); el._tip = () => trickTip(getT(el), run.cls); el.classList.add('has-tip'); return el;
}
const trickLine = (t) => { const def = D.defOf(t); return [`${def.name} <span class="q">${trickWords(t)}</span>`, `${D.TYPES[def.type].name} · ${def.cls ? D.CLASSES[def.cls].name : 'Any class'} · ${def.count}${def.die} · ${D.CONDITIONS[D.condOf(t)].name}`]; };
function traderPanel() {
  const run = app.run, fs = run.fs;
  const shelf = h('div', { class: 'items list' }), mine = h('div', { class: 'items list' }), secret = h('div', { class: 'items list' }), secretWrap = h('div', { class: 'fade-t' }, h('span', { class: 'cap', text: 'Secret shelf — the Trader\'s personal stash' }), secret);
  const restockBtn = btn('', () => { tryDo(R.restock(run), restockBtn); done(); }, '<b>Restock</b><p>Clears the shelf and brings out four new tricks: one for each class and one for anyone. The fee rises each time.</p>', 'small');
  const packs = h('div', { class: 'items list' }), pulled = h('div', { class: 'items list' }), pulledWrap = h('div', { class: 'fade-t' }, h('span', { class: 'cap', text: 'Your last pack — now in your Book' }), pulled);
  const done = after(render);
  function render() {
    syncList(shelf, fs.shop, (it) => it.key, (it) => { const el = trickItem(run, (e) => e._t); el.append(btn('Buy', () => { tryDo(R.buyTrick(run, it.key), el); done(); }, null, 'small')); return el; },
      (el, it) => { el._t = it.trick; el.style.setProperty('--tc', D.TYPES[D.TRICKS[it.trick.id].type].color); const [n, s] = trickLine(it.trick); setItem(el, n, s, cents(R.price(run, 'trader', it.cost))); el.lastChild.classList.toggle('off', run.purse < R.price(run, 'trader', it.cost)); });
    syncList(mine, run.tricks, (t) => t.uid, (t) => { const el = trickItem(run, (e) => e._t);
      el.append(btn('Sell', () => { const poor = !R.canSell(el._t); tryDo(poor ? R.trashTrick(run, t.uid) : R.sellTrick(run, t.uid), el, 'Keep at least one trick.'); done(); },
        () => (R.canSell(el._t) ? `<b>Sell</b><p>${cents(R.trickValue(run, el._t))}: ${D.CONDITIONS[D.condOf(el._t)].name} sells at ${Math.round(D.CONDITIONS[D.condOf(el._t)].sell * 100)}% of its price.</p>` : '<b>Trash</b><p>Poor tricks cannot be sold. The Trader takes it off your hands for nothing.</p>'), 'small danger')); return el; },
      (el, t) => { el._t = t; el.style.setProperty('--tc', D.TYPES[D.TRICKS[t.id].type].color); const [n, s] = trickLine(t); const sells = R.canSell(t);
        setItem(el, n, s, sells ? `sells ${cents(R.trickValue(run, t))}` : 'Poor'); swapText(el.lastChild, sells ? 'Sell' : 'Trash'); el.lastChild.classList.toggle('off', run.tricks.length <= 1); });
    syncList(packs, D.PACKS.slice(1), (P) => P.q, (P) => { const el = item(); el.append(btn('Open', () => { tryDo(R.buyPack(run, P.q), el, !R.packOpen(run, P.q) ? `Sold from floor ${P.floor}.` : null); done(); }, null, 'small'));
      el._tip = () => `<b>${P.name} foil pack</b><p>Five ${D.QNAME[P.q]} tricks, all Mint (each may come out Gem Mint). One is a rarer print: a Misprint, a Reprint, or a Holo or Prism foil.</p><p class="dim">${D.qdieText(P.q)}</p>`; el.classList.add('has-tip'); return el; },
      (el, P) => { const open = R.packOpen(run, P.q); setItem(el, `${P.name} <span class="dim">· foil pack</span>`, `Five ${D.QNAME[P.q]} tricks, Mint, one rarer`, open ? cents(R.packCost(run, P.q)) : `floor ${P.floor}`);
        el.classList.toggle('locked', !open); el.lastChild.classList.toggle('off', !open || run.purse < R.packCost(run, P.q)); });
    const got = fs.pack ? fs.pack.uids.map((u) => run.tricks.find((t) => t.uid === u)).filter(Boolean) : [];
    pulledWrap.classList.toggle('gone', !got.length);
    syncList(pulled, got, (t) => t.uid, (t) => { const el = trickItem(run, (e) => e._t); return el; },
      (el, t) => { el._t = t; el.style.setProperty('--tc', D.TYPES[D.TRICKS[t.id].type].color); const [n, s] = trickLine(t); setItem(el, n, s, D.CONDITIONS[D.condOf(t)].name); });
    const member = R.hasCard(run, 'membership'); secretWrap.classList.toggle('gone', !member);
    if (member) syncList(secret, R.secretShelf(run), (it) => it.key, (it) => { const el = item(); el.append(btn('Buy', () => { tryDo(R.buySecret(run, it.key), el); done(); }, null, 'small')); if (it.trick) { el._tip = () => trickTip(it.trick, run.cls); el.classList.add('has-tip'); } return el; },
      (el, it) => { if (it.die) setItem(el, `1${it.die}`, 'A rare die.', cents(it.cost)); else { const [n, s] = trickLine(it.trick); setItem(el, n, s, cents(it.cost)); } el.lastChild.classList.toggle('off', run.purse < it.cost); });
    swapText(restockBtn, `Restock ${cents(R.restockCost(run))}`); restockBtn.classList.toggle('off', run.purse < R.restockCost(run));
  }
  render();
  openPanel(h('div', {}, head('Trick Trader', 'Tricks that match your class unlock their bonus. Hover any trick to read it.'),
    h('div', { class: 'cols2' }, h('div', { class: 'col' }, h('div', { class: 'row between' }, h('span', { class: 'cap', text: `On the shelf — ${fs.bought}/5 bought toward membership` }), restockBtn), shelf, h('span', { class: 'cap', text: 'Foil packs — better sets open with the floors' }), packs, pulledWrap, secretWrap), h('div', { class: 'col' }, h('span', { class: 'cap', text: 'Your Book' }), mine))), { wide: true });
}

function exchangePanel() {
  const run = app.run, list = h('div', { class: 'items list' });
  const done = after(render);
  const ids = D.SHOP_IDS().sort((a, b) => D.SHOP_CHIPS[a].tier - D.SHOP_CHIPS[b].tier); // effect chips made by tricks, tilts or bees are not sold
  function render() {
    syncList(list, ids, (k) => k, (k) => { const el = item(); el.prepend(chipEl({ kind: 'std', value: 1, resist: k })); el.append(btn('Buy', () => { tryDo(R.buyShopChip(run, k), el, !R.shopChipOpen(run, k) ? `Sold from floor ${D.shopFloor(k)}.` : null); done(); }, null, 'small')); el._tip = () => chipTip({ kind: 'std', value: 1, resist: k }) + (R.shopChipOpen(run, k) ? '' : `<p class="bad">Sold from floor ${D.shopFloor(k)}.</p>`); el.classList.add('has-tip'); return el; },
      (el, k) => { const X = D.SHOP_CHIPS[k], T = D.CHIP_TIERS[X.tier], open = R.shopChipOpen(run, k);
        setItem(el, `${X.name} <span class="tier" style="--tc:${T.color}">${T.name}</span> <span class="dim">· you own ${R.owned(run, k)}</span>`, D.shopText(k), open ? cents(D.shopPrice(k)) : `floor ${D.shopFloor(k)}`);
        el.classList.toggle('locked', !open); el.lastChild.classList.toggle('off', !open || run.purse < D.shopPrice(k)); });
  }
  render();
  openPanel(h('div', {}, head('Chip Exchange', 'Your purse is changed into table chips when you set your position.'),
    h('span', { class: 'cap', text: 'Standard chips on this floor' }),
    h('div', { class: 'row wrap', style: { margin: '8px 0 14px' } }, D.DENOMS.map((d) => h('div', { class: `box row ${run.floor < d.floor ? 'off' : ''}`, tip: () => `${chipTip({ kind: 'std', value: d.value })}${run.floor < d.floor ? `<p class="bad">${d.floor >= D.ASCENT_FLOOR ? 'Dealt in the Paradise Ascent.' : `Dealt from floor ${d.floor}.`}</p>` : ''}` }, chipEl({ kind: 'std', value: d.value }), h('span', {}, `${d.value}¢`, h('small', { class: 'dim', text: run.floor < d.floor ? `  floor ${d.floor}` : '' }))))),
    h('p', { class: 'sub', style: { marginBottom: '12px' }, text: 'A big chip pays a big fee in one go, and a fee smaller than the chip only leaves Debt on top of it. Small chips bid fast; a bigger chip bid on a trick makes it linger and grow.' }),
    h('span', { class: 'cap', tip: `<b>Shop chip tiers</b><p>Priced by tier: ${D.CHIP_TIERS.slice(1).map((t) => `${t.name} ${cents(t.price)}${t.floor > 1 ? ` (floor ${t.floor}+)` : ''}`).join(' · ')}.</p><p class="dim">Each is worth 1¢, goes at the base of a stack, is not wagered, and comes back after a win if it survives.</p>`, text: 'Shop chips — deployed at the base of your stacks, priced by tier' }), list), { wide: true });
}

function loungePanel() {
  const run = app.run, L = run.fs.lounge, list = h('div', { class: 'items list' }), mine = h('p', { class: 'sub fade-t' });
  const done = after(render);
  function render() {
    syncList(list, L.drinks, (d) => d.id, (d) => { const el = item(); el._tip = () => drinkTip(d); el.classList.add('has-tip');
      el.append(btn('Buy', () => { tryDo(R.buyDrink(run, d.id), el); done(); }, null, 'small'),
        btn('Play for it', () => { if (L.challenged) return toast('The barfly has had enough for this floor.', 'warn'); if (run.purse < R.price(run, 'lounge', d.cost)) return toast('You must be able to cover the drink to play for it.', 'warn'); closePanel(true); app.nav.lounge(d.id); },
          () => `<b>Bar bout against ${L.challenger.name}</b><p>A quick match on a small table with house chips. Win and they buy you this drink. Lose and you pay for theirs. Once per floor.</p>${oppTip(L.challenger)}`, 'small')); return el; },
      (el, d) => { const cost = R.drinkCost(run, d); setItem(el, `${d.name} <span class="dim">${d.verb}</span>`, `${Object.entries(d.mods).map(([k, n]) => `+${n} ${D.STATS[k].name}`).join(', ')} per sip · ${d.sips} sips`, cost ? cents(cost) : 'Free (punch card)');
        el.children[2].classList.toggle('off', run.purse < cost); el.children[3].classList.toggle('off', L.challenged); });
    swapText(mine, run.drink ? `In your hand: ${run.drink.name}, ${run.drink.sips} sip${run.drink.sips === 1 ? '' : 's'} left. A new drink replaces it.` : 'You are not carrying a drink.');
  }
  render();
  openPanel(h('div', {}, head('Lounge', L.happy ? 'Happy hour: everything is half price.' : 'Loosen up before your next bout.'), list, mine));
}

function bookPanel() {
  const run = app.run, B = run.fs.book; let stake = Math.min(Math.max(B.min, 0), run.purse);
  const events = h('div', { class: 'col' }), stakeNum = h('b', { class: 'num gold-t' });
  const done = after(render);
  const setStake = (v) => { stake = Math.max(B.min, Math.min(run.purse, Math.round(v))); render(); };
  const rows = B.events.map((ev) => { const sp = D.SPORTS.find((s) => s.id === ev.sport); const field = h('div', { class: 'row wrap list' }); const status = h('small', { class: 'dim fade-t' });
    return { ev, field, status, el: h('div', { class: 'box' }, h('div', { class: 'row between' }, h('div', {}, h('h3', { text: sp.name }), h('small', { class: 'dim', text: `“${sp.line}”` })), status), h('div', { style: { marginTop: '8px' } }, field)) }; });
  function render() {
    tween(stakeNum, stake, cents, 250);
    for (const { ev, field, status } of rows) {
      syncList(field, ev.field.map((x, i) => ({ ...x, i })), (x) => x.i, (x) => btn('', () => { if (ev.bet) return; if (stake > run.purse || stake < B.min) return toast(`The minimum bet is ${cents(B.min)}.`, 'warn'); R.placeBet(run, ev.key, x.i, stake); stake = Math.min(stake, Math.max(B.min, run.purse)); done(); },
        () => `<b>${x.name}</b> <span class="dim">${x.label}</span><p>A winning ${cents(stake)} ticket pays back ${cents(Math.round(stake * (1 + x.pay)))}. One bet per game. Click to place it.</p>`, 'small'),
      (el, x) => { el.innerHTML = `${x.name} <span class="q">${x.label}</span>`; el.classList.toggle('on', !!ev.bet && ev.bet.pick === x.i); el.classList.toggle('off', (!!ev.bet && ev.bet.pick !== x.i) || (!ev.bet && run.purse < B.min)); });
      swapText(status, ev.done ? (ev.winner === ev.bet.pick ? 'Paid out' : `Lost — ${ev.field[ev.winner].name} won`) : ev.bet ? `${cents(ev.bet.stake)} riding on ${ev.field[ev.bet.pick].name}` : 'No bet placed');
    }
  }
  events.append(...rows.map((r) => r.el)); render();
  openPanel(h('div', {}, head('Sports Book', '“Are you here to gamble?” Games are played while you are at the table.'),
    h('div', { class: 'row', style: { marginBottom: '12px' } }, h('span', { class: 'cap', text: 'Stake per ticket' }), btn('−', () => setStake(stake / 2), null, 'small'), stakeNum, btn('+', () => setStake(stake * 2), null, 'small'), btn('Min', () => setStake(B.min), null, 'small'), btn('10% of purse', () => setStake(run.purse * 0.1), null, 'small'), btn('Half', () => setStake(run.purse / 2), null, 'small'),
      h('span', { class: 'dim', text: `Minimum ${cents(B.min)} on this floor` })), events), { wide: true });
}

function kitPanel() {
  const run = app.run, st = R.rollerStats(run);
  openPanel(h('div', {}, head(D.heroName(run.cls), D.CLASSES[run.cls].blurb),
    h('div', { class: 'col' }, h('span', { class: 'cap', text: 'Book' }), h('div', { class: 'inv' }, run.tricks.map((t) => trickTag(t, run.cls))),
      h('span', { class: 'cap', text: 'Pouch' }), h('div', { class: 'dicebox' }, run.dice.map((d) => { const el = dieEl(d); el._tip = () => dieTip(d); el.classList.add('has-tip'); return el; })),
      h('span', { class: 'cap', text: `${R.walletOf(run).name} wallet — ${R.walletCards(run).length}/${R.walletOf(run).slots} slots, plus one pass slot · lanyard cards do not take a slot · click a card twice to drop it` }),
      h('div', { class: 'row wrap', style: { alignItems: 'flex-end' } }, walletEl(run.wallet), run.pass ? passEl(run.pass) : null, jacketEl(run.jacket), run.drink ? drinkEl(run.drink, run.drink.sips, run.drink.max) : null,
        h('div', { class: 'inv', style: { alignItems: 'flex-end' } }, run.cards.map((c) => { const pass = D.LANYARD_CARDS.includes(c); const el = cardEl(c); el.style.cursor = pass ? '' : 'pointer'; el._tip = () => cardTip(c, R.rollerStats(run).v) + (pass ? '<p class="dim">Clipped to your lanyard: it does not take a wallet slot.</p>' : '<p class="dim">Takes a wallet slot. Click twice to drop it for good.</p>'); el.classList.add('has-tip');
        el.onclick = () => { if (pass) return; if (!el._armed) { el._armed = true; el.classList.add('armed'); return toast(`Click ${D.CARDS[c].name} again to drop it.`, 'warn'); } if (!R.dropCard(run, c)) return toast('You need that one to get in.', 'warn'); closePanel(); rerender(); toast(`${D.CARDS[c].name} dropped.`); }; return el; }))),
      h('span', { class: 'cap', text: 'Position' }), h('p', { class: 'sub', text: `${st.dims.meterRows} Bet rows and ${st.dims.barRows} Stake rows of 5 spaces, stacks up to ${st.dims.stackMax} chips. Your Stake holds ${st.dims.barRows * 5 * st.dims.stackMax} chips.` }))));
}

// what you give up by dropping a card, in plain words
function dropText(run, c) {
  const card = D.CARDS[c], v = R.rollerStats(run).v;
  if (!card.mods) return card.text;
  return Object.entries(card.mods).map(([k, n]) => `Drop it and ${D.STATS[k].name} goes ${v[k]} → ${v[k] - n}: you ${D.STATS[k].per(n).replace(/\bmore\b/, 'fewer')}.`).join(' ');
}
// a found card with no free slot: drop one or leave it
function walletFullPanel() {
  const run = app.run, id = run.pendingCard, Wl = R.walletOf(run);
  const done = (drop) => { R.resolvePending(run, drop); closePanel(); rerender(); toast(drop ? `${D.CARDS[id].name} goes in your wallet.` : 'You leave it where it lies.'); };
  openPanel(h('div', { class: 'col' }, h('h2', { text: `Found: ${D.CARDS[id].name}` }), h('p', { class: 'sub', html: D.CARDS[id].mods ? Object.entries(D.CARDS[id].mods).map(([k, n]) => `Keep it and ${D.STATS[k].name} goes ${R.rollerStats(run).v[k]} → ${R.rollerStats(run).v[k] + n}: you ${D.STATS[k].per(n)}.`).join(' ') : D.CARDS[id].text }),
    h('p', { text: `Your ${Wl.name} wallet holds ${Wl.slots} card${Wl.slots > 1 ? 's' : ''} and it is full. Drop one to make room, or leave this one.` }),
    h('div', { class: 'items' }, R.walletCards(run).map((c) => h('div', { class: 'item', tip: () => cardTip(c, R.rollerStats(run).v) }, cardEl(c), h('div', { class: 'main' }, h('b', { text: D.CARDS[c].name }), h('small', { html: dropText(run, c) })), btn('Drop this', () => done(c), null, 'small danger')))),
    h('div', { class: 'row' }, btn('Leave the new card', () => done(null), null, ''))));
}

function exitPanel() {
  const run = app.run;
  openPanel(h('div', { class: 'col' }, h('h2', { text: 'Exit through the Gift Shop?' }),
    h('p', { class: 'sub', text: 'Leaving ends this run. You keep whatever gear you unlock in the Gift Shop for future runs; everything else is lost in the alley.' }),
    h('p', { text: `You would walk in with ${cents(run.purse)}.` }),
    h('div', { class: 'row' }, btn('Stay at the tables', () => closePanel(), null, 'go'), btn('Leave', () => { closePanel(true); app.nav.gift(); }, null, 'danger'))));
}
