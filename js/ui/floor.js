// The floor: a map of places to visit between bouts, each opening as a panel.
import { h, syncList, openPanel, closePanel, toast, btn, tween, pulse, swapText } from './core.js';
import { app, hud, oppTip, trickTag, diceSummary } from './app.js';
import { dieEl, dieTip, trickTip, pips, drinkTip, cardTip, chipEl, chipTip, upInfo } from './parts.js';
import * as D from '../data.js';
import * as R from '../run.js';
import { cents } from '../util.js';

const MIN_BUYIN = 5;
let rerender = () => {};

// Floor plans, in a 900 x 620 space. Each floor lays the same features out differently, after the
// workbook's sketch: stairs up behind the head table, game tables in the middle, shops on one
// wall, the House's book and the Lounge on the other, the way in at the bottom by the dodgy corner.
const mirror = (plan) => Object.fromEntries(Object.entries(plan).map(([k, [x, y, w, hh]]) => [k, [900 - x - w, y, w, hh]]));
const BASEMENT = { stairs: [390, 8, 120, 62], boss: [335, 84, 230, 132], kit: [40, 26, 190, 112], t0: [245, 236, 185, 124], t1: [470, 236, 185, 124], t2: [357, 376, 185, 124],
  smith: [690, 26, 190, 122], trader: [690, 160, 190, 122], exchange: [690, 294, 190, 112], book: [20, 164, 200, 150], lounge: [20, 328, 200, 150], exit: [690, 418, 190, 96], search: [716, 528, 164, 82], entry: [380, 544, 140, 66] };
const PLANS = {
  1: BASEMENT, 2: mirror(BASEMENT),
  3: { smith: [20, 20, 190, 116], trader: [222, 20, 190, 116], exchange: [424, 20, 190, 116], stairs: [760, 14, 120, 62], boss: [656, 92, 224, 140], t0: [44, 176, 185, 124], t1: [244, 176, 185, 124], t2: [444, 176, 185, 124],
    book: [20, 340, 220, 150], lounge: [254, 340, 240, 150], kit: [508, 340, 180, 112], exit: [716, 276, 164, 96], search: [716, 404, 164, 86], entry: [396, 544, 140, 66] },
  4: { stairs: [390, 6, 120, 58], boss: [325, 72, 250, 136], t0: [140, 214, 185, 124], t1: [357, 246, 185, 124], t2: [575, 214, 185, 124], smith: [20, 26, 190, 116], trader: [20, 366, 190, 116], exchange: [690, 26, 190, 116],
    book: [690, 366, 190, 124], lounge: [240, 398, 205, 130], kit: [460, 398, 190, 112], exit: [690, 506, 190, 92], search: [20, 500, 170, 92], entry: [380, 548, 140, 62] },
};
const FLOOR_HUE = { 1: '#7dffb5', 2: '#ff86ea', 3: '#7df3ff', 4: '#ffd76a' };
const at = { floor: 0, k: 'entry' }; // where your Roller is standing
function furniture(kind) {
  const s = (cls, n = 1) => Array.from({ length: n }, () => h('i', { class: cls }));
  switch (kind) {
    case 'table': return [h('i', { class: 'felt' }), ...s('seat', 4), h('i', { class: 'opp' })];
    case 'boss': return [h('i', { class: 'dais' }), h('i', { class: 'felt' }), ...s('seat', 4), h('i', { class: 'opp' })];
    case 'smith': return [h('i', { class: 'forge' }), h('i', { class: 'anvil', text: '⚒' })];
    case 'trader': return [...s('shelf', 3), h('i', { class: 'glyph', text: '🃏' })];
    case 'exchange': return [h('i', { class: 'cage' }), h('i', { class: 'glyph', text: '🪙' })];
    case 'lounge': return [h('i', { class: 'barc' }), ...s('stool', 4), h('i', { class: 'glyph', text: '🍹' })];
    case 'book': return [...s('screen', 4), h('i', { class: 'glyph', text: '🏇' })];
    case 'search': return [h('i', { class: 'lamp' }), h('i', { class: 'glyph', text: '🔎' })];
    case 'kit': return [...s('locker', 4), h('i', { class: 'glyph', text: '🎒' })];
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
  const rooms = {}, me = h('div', { class: 'pawn', style: { '--cc': D.CLASSES[run.cls].color }, tip: () => `<b>You</b> <span class="dim">${D.CLASSES[run.cls].name}</span><p>Click anywhere on the floor to walk there.</p>` }, h('i', {}), h('b', { text: 'YOU' }));
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
      h('div', { class: 'box scroll', style: { flex: '1' } }, h('span', { class: 'cap', text: 'Word on the floor' }), news),
      h('div', { class: 'box' }, h('span', { class: 'cap', text: 'Your book' }), book, hint)))));

  function tiles() {
    const out = [];
    fs.tables.forEach((t, i) => out.push({ k: 't' + i, unseen: !t.seen, cls: `table ${t.beaten ? 'done' : ''}`, ico: '🎴', name: t.seen ? t.opp.name : `Table ${i + 1}`, tag: `${t.felt} felt`,
      sub: t.beaten ? 'Beaten.' : t.seen ? `${D.CLASSES[t.opp.cls].name} · ${cents(t.opp.worth)} on the table` : 'A stranger. Sit down to find out.',
      tip: () => (t.seen ? oppTip(t.opp) : '<b>Unknown Roller</b><p>You have not seen this table play. Their name, gear and attributes stay hidden until you sit down, or until you close the table before it.</p>'),
      on: () => { if (t.beaten) return toast('That table is closed.'); if (run.purse < MIN_BUYIN) return toast(`You need at least ${cents(MIN_BUYIN)} to sit down.`, 'warn'); app.nav.prep('table', i); } }));
    const b = fs.boss;
    out.push({ k: 'boss', cls: `boss ${fs.bossOpen ? '' : 'locked'} ${b.beaten ? 'done' : ''}`, ico: '👑', name: b.opp.name, tag: 'Head table', sub: fs.bossOpen ? `High Roller · ${cents(b.opp.worth)} on the table · wager ×${D.WAGER_BOSS}` : `Close ${R.tablesLeft(run)} more table${R.tablesLeft(run) === 1 ? '' : 's'} first.`,
      tip: () => (fs.bossOpen ? oppTip(b.opp) : `<b>${b.opp.name}</b> <span class="dim">High Roller</span><p>Visible at the head table, but only their name. Close every table, or win a Double Down, and they will see you. Beat them to take the stairs to the next floor.</p>`),
      on: () => { if (!fs.bossOpen) return toast('The High Roller will not see you yet.', 'warn'); if (run.purse < MIN_BUYIN) return toast(`You need at least ${cents(MIN_BUYIN)} to sit down.`, 'warn'); app.nav.prep('boss', 0); } });
    out.push({ k: 'smith', ico: '⚒️', name: 'Diesmith', sub: 'Forge, upgrade and sell dice.', tip: '<b>Diesmith</b><p>Melts several small dice into one bigger die, upgrades dice, and buys the ones you no longer need.</p>', on: () => smithPanel() });
    out.push({ k: 'trader', ico: '🃏', name: 'Trick Trader', sub: `${fs.shop.length} trick${fs.shop.length === 1 ? '' : 's'} on the shelf.`, tag: R.hasCard(run, 'membership') ? 'Member' : null, tip: '<b>Trick Trader</b><p>Buy new tricks, upgrade the ones in your Book, or sell them. Buy 5 on one floor to earn a Membership Card.</p>', on: () => traderPanel() });
    out.push({ k: 'exchange', ico: '🪙', name: 'Chip Exchange', sub: `Chips up to ${R.maxDenom(run.floor)}¢ on this floor.`, tip: '<b>Chip Exchange</b><p>Shows which chip values this floor deals in and sells colourful chips that protect a stack from hazards.</p>', on: () => exchangePanel() });
    out.push({ k: 'lounge', ico: '🍹', name: 'Lounge', sub: fs.lounge.happy ? 'Happy hour! Drinks half price.' : 'A drink for the table.', tag: run.drink ? `${run.drink.name}` : null, tip: '<b>Lounge</b><p>Bring a drink to the table and sip it before a turn for a bonus. Pay for it, or challenge the Roller at the bar: the loser buys.</p>', on: () => loungePanel() });
    const open = fs.book.events.filter((e) => e.bet && !e.done).length;
    out.push({ k: 'book', ico: '🏇', name: 'Sports Book', sub: open ? `${open} ticket${open > 1 ? 's' : ''} riding on the next bout.` : 'Are you here to gamble?', tip: '<b>Sports Book</b><p>Place long bets before you sit down. Games are played while you are at the table, so a winning ticket can fund another try after a loss.</p>', on: () => bookPanel() });
    out.push({ k: 'search', cls: fs.searched ? 'done' : '', ico: '🔎', name: 'Dodgy corner', sub: fs.searched ? 'Nothing else down here.' : 'Somebody always drops something.', tip: '<b>Search the floor</b><p>Once per floor you will find a card for your wallet.</p>',
      on: () => { const id = R.searchFloor(run); if (!id) return toast('You already looked.'); if (run.pendingCard) { render(); return walletFullPanel(); } toast(`Found: ${D.CARDS[id].name}.`); render(); } });
    out.push({ k: 'kit', ico: '🎒', name: 'Coat check', sub: `${run.dice.length} dice · ${run.tricks.length} tricks · ${run.cards.length} cards`, tip: '<b>Coat check</b><p>Your gear is kept here. Look through your Pouch, Book and Wallet.</p>', on: () => kitPanel() });
    out.push({ k: 'exit', cls: 'exit', ico: '🚪', name: 'Exit', sub: 'Through the Gift Shop. Ends the run.', tip: '<b>Exit through the Gift Shop</b><p>Cut your losses. Spend what is left on gear that stays unlocked for future runs, then leave. You cannot come back to the tables.</p>', on: () => exitPanel() });
    out.push({ k: 'stairs', cls: fs.boss.beaten ? '' : 'locked', name: run.floor < 4 ? 'Stairs up' : 'Penthouse lift', sub: run.floor < 4 ? `To ${D.FLOORS[run.floor + 1].name}` : 'To the Penthouse',
      tip: `<b>${run.floor < 4 ? 'Stairs up' : 'Penthouse lift'}</b><p>Behind the head table. The High Roller decides who goes up: beat them and you climb straight away.</p>`, on: () => toast(`${fs.boss.opp.name} is not letting anyone past.`, 'warn') });
    out.push({ k: 'entry', name: run.floor > 1 ? 'Stairs down' : 'Front door', sub: 'The way you came in.', tip: '<b>The way in</b><p>Where you arrived on this floor. There is no going back down.</p>', on: () => toast('No going back. Only up, or out through the Gift Shop.') });
    return out;
  }
  function render() {
    H.update();
    for (const t of tiles()) { const el = rooms[t.k]; if (!el) continue;
      for (const c of ['done', 'locked']) el.classList.toggle(c, (t.cls || '').split(' ').includes(c));
      const [, nm, sub, tag] = el.children; swapText(nm, t.name); swapText(sub, t.sub); if (t.tag) tag.textContent = t.tag; tag.style.opacity = t.tag ? 1 : 0;
      el.classList.toggle('unseen', !!t.unseen); el.onclick = () => visit(t.k, t.on); el._tip = t.tip; el.classList.add('has-tip'); }
    syncList(news, run.news.slice(-7).map((text, i) => ({ text, k: run.news.length - Math.min(7, run.news.length) + i })).reverse(), (n) => n.k, (n) => h('li', { text: n.text }));
    syncList(book, run.tricks, (t) => t.uid + ':' + t.q + ':' + t.up, (t) => trickTag(t, run.cls));
    swapText(hint, R.brokeHint(run) || `${diceSummary(run.dice)} in your pouch.`);
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
  const run = app.run; let sel = null;
  const forgeBox = h('div', { class: 'items list' }), pouch = h('div', { class: 'dicebox list' }), actions = h('div', { class: 'items list', style: { marginTop: '10px' } });
  const done = after(render);
  function render() {
    syncList(forgeBox, Object.keys(D.DICE), (t) => t, (t) => { const el = item(); el.append(btn('Forge', () => { tryDo(R.forge(run, t), el, run.floor < D.DICE[t].forge.floor ? `The Diesmith forges ${t}s from floor ${D.DICE[t].forge.floor}.` : !R.forgeFodder(run, t) ? 'You do not have enough dice to melt down.' : null); sel = null; done(); }, null, 'small')); el.prepend(dieEl({ type: t })); return el; },
      (el, t) => { const f = D.DICE[t].forge, fod = R.forgeFodder(run, t), ok = run.floor >= f.floor && fod && run.purse >= R.forgeCost(run, t);
        setItem(el, `1${t}`, run.floor < f.floor ? `From floor ${f.floor}` : `Melts ${f.dice} of your dice`, `${f.dice} dice + ${cents(R.forgeCost(run, t))}`); el.lastChild.classList.toggle('off', !ok);
        el._tip = () => `<b>Forge a ${t}</b><p>Costs ${cents(R.forgeCost(run, t))} and your ${f.dice} smallest ${f.dice > 1 ? 'dice' : 'die'}${fod ? `: ${diceSummary(fod)}` : ' (you need more dice; you always keep at least one)'}.</p>`; el.classList.add('has-tip'); });
    syncList(pouch, run.dice, (d) => d.id + ':' + d.up.join(), (d) => { const el = dieEl(d); el.onclick = () => { sel = sel === d.id ? null : d.id; render(); }; el._tip = () => dieTip(d, 'Click to sell or upgrade it.'); el.classList.add('has-tip'); return el; }, (el, d) => el.classList.toggle('sel', sel === d.id));
    const d = run.dice.find((x) => x.id === sel), acts = [];
    if (d) { acts.push({ k: 'sell', name: `Sell this ${d.type}`, sub: 'The Diesmith pays in chips.', price: `+${cents(D.DICE[d.type].sell)}`, label: 'Sell', go: () => { tryDo(R.sellDie(run, d.id), null, 'Keep at least one die.'); sel = null; } });
      for (const [u, U] of Object.entries(D.DIE_UPGRADES)) acts.push({ k: u, name: U.name, sub: U.text + (d.up.length >= 2 ? ' This die already has two upgrades.' : ''), price: cents(R.dieUpgradeCost(run, d)), label: 'Upgrade', off: d.up.length >= 2 || (u !== 'accelerate' && d.up.includes(u)), go: () => tryDo(R.upgradeDie(run, d.id, u)) }); }
    syncList(actions, acts, (a) => a.k, (a) => { const el = item(); el.append(btn(a.label, () => { el._go(); done(); }, null, 'small')); return el; }, (el, a) => { setItem(el, a.name, a.sub, a.price); el._go = a.go; el.lastChild.classList.toggle('off', !!a.off); });
  }
  render();
  openPanel(h('div', {}, head('Diesmith', 'Reforges dice into other types and can upgrade your dice as well.'),
    h('div', { class: 'cols2' }, h('div', {}, h('span', { class: 'cap', text: 'Forge' }), forgeBox), h('div', {}, h('span', { class: 'cap', text: 'Your pouch — pick a die' }), pouch, actions))), { wide: true });
}

function trickItem(run, getT) {
  const el = item(); el._tip = () => trickTip(getT(el), run.cls); el.classList.add('has-tip'); return el;
}
const trickLine = (t) => { const def = D.TRICKS[t.id]; return [`${def.name} <span class="q">${pips(t)}</span>`, `${D.TYPES[def.type].name} · ${def.cls ? D.CLASSES[def.cls].name : 'Any class'} · ${def.count}${def.die}`]; };
function traderPanel() {
  const run = app.run, fs = run.fs;
  const shelf = h('div', { class: 'items list' }), mine = h('div', { class: 'items list' }), secret = h('div', { class: 'items list' }), secretWrap = h('div', { class: 'fade-t' }, h('span', { class: 'cap', text: 'Secret shelf — the Trader\'s personal stash' }), secret);
  const restockBtn = btn('', () => { tryDo(R.restock(run), restockBtn); done(); }, '<b>Restock</b><p>Clears the shelf and brings out four new tricks: one for each class and one for anyone. The fee rises each time.</p>', 'small');
  const upLeft = h('span', { class: 'cap fade-t' });
  const done = after(render);
  function render() {
    syncList(shelf, fs.shop, (it) => it.key, (it) => { const el = trickItem(run, (e) => e._t); el.append(btn('Buy', () => { tryDo(R.buyTrick(run, it.key), el); done(); }, null, 'small')); return el; },
      (el, it) => { el._t = it.trick; el.style.setProperty('--tc', D.TYPES[D.TRICKS[it.trick.id].type].color); const [n, s] = trickLine(it.trick); setItem(el, n, s, cents(R.price(run, 'trader', it.cost))); el.lastChild.classList.toggle('off', run.purse < R.price(run, 'trader', it.cost)); });
    syncList(mine, run.tricks, (t) => t.uid, (t) => { const el = trickItem(run, (e) => e._t);
      el.append(btn('Upgrade', () => { tryDo(R.upgradeTrick(run, t.uid), el, t.up >= 2 ? 'A trick can be upgraded twice.' : fs.upgrades <= 0 ? 'No upgrades left on this floor.' : null); done(); }, () => `<b>Upgrade ${D.TRICKS[el._t.id].name}</b>${upInfo(el._t)}<p class="dim">Two upgrades per trick, two upgrades per floor. An upgraded trick shows a ▲ after its quality pips.</p>`, 'small'),
        btn('Sell', () => { tryDo(R.sellTrick(run, t.uid), el, 'Keep at least one trick.'); done(); }, null, 'small danger')); return el; },
      (el, t) => { el._t = t; el.style.setProperty('--tc', D.TYPES[D.TRICKS[t.id].type].color); const [n, s] = trickLine(t); setItem(el, n, s, `↑ ${cents(R.upgradeCost(run, t))} · sells ${cents(R.trickValue(run, t))}`);
        el.children[2].classList.toggle('off', t.up >= 2 || fs.upgrades <= 0 || run.purse < R.upgradeCost(run, t)); el.children[3].classList.toggle('off', run.tricks.length <= 1); });
    const member = R.hasCard(run, 'membership'); secretWrap.classList.toggle('gone', !member);
    if (member) syncList(secret, R.secretShelf(run), (it) => it.key, (it) => { const el = item(); el.append(btn('Buy', () => { tryDo(R.buySecret(run, it.key), el); done(); }, null, 'small')); if (it.trick) { el._tip = () => trickTip(it.trick, run.cls); el.classList.add('has-tip'); } return el; },
      (el, it) => { if (it.die) setItem(el, `1${it.die}`, 'A rare die.', cents(it.cost)); else { const [n, s] = trickLine(it.trick); setItem(el, n, s, cents(it.cost)); } el.lastChild.classList.toggle('off', run.purse < it.cost); });
    swapText(restockBtn, `Restock ${cents(R.restockCost(run))}`); restockBtn.classList.toggle('off', run.purse < R.restockCost(run));
    swapText(upLeft, `Your book — ${fs.upgrades} upgrade${fs.upgrades === 1 ? '' : 's'} left on this floor`);
  }
  render();
  openPanel(h('div', {}, head('Trick Trader', 'Tricks that match your class unlock their bonus. Hover any trick to read it.'),
    h('div', { class: 'cols2' }, h('div', { class: 'col' }, h('div', { class: 'row between' }, h('span', { class: 'cap', text: `On the shelf — ${fs.bought}/5 bought toward membership` }), restockBtn), shelf, secretWrap), h('div', { class: 'col' }, upLeft, mine))), { wide: true });
}

function exchangePanel() {
  const run = app.run, list = h('div', { class: 'items list' });
  const done = after(render);
  function render() {
    syncList(list, Object.keys(D.RESIST), (k) => k, (k) => { const X = D.RESIST[k], el = item(); el.prepend(chipEl({ kind: 'std', value: 1, resist: k })); el.append(btn('Buy', () => { tryDo(R.buyResist(run, k), el); done(); }, null, 'small')); el._tip = () => chipTip({ kind: 'std', value: 1, resist: k }); el.classList.add('has-tip'); void X; return el; },
      (el, k) => { const X = D.RESIST[k]; setItem(el, `${X.name} <span class="dim">· you own ${run.chips[k]}</span>`, `A stack holding one ${X.verb} ${D.CHIPS[k].name}s.`, cents(X.price)); el.lastChild.classList.toggle('off', run.purse < X.price); });
  }
  render();
  openPanel(h('div', {}, head('Chip Exchange', 'Your purse is changed into table chips when you set your position.'),
    h('span', { class: 'cap', text: 'Standard chips on this floor' }),
    h('div', { class: 'row wrap', style: { margin: '8px 0 14px' } }, D.DENOMS.map((d) => h('div', { class: `box row ${run.floor < d.floor ? 'off' : ''}`, tip: () => `${chipTip({ kind: 'std', value: d.value })}${run.floor < d.floor ? `<p class="bad">Dealt from floor ${d.floor}.</p>` : ''}` }, chipEl({ kind: 'std', value: d.value }), h('span', {}, `${d.value}¢`, h('small', { class: 'dim', text: run.floor < d.floor ? `  floor ${d.floor}` : '' }))))),
    h('p', { class: 'sub', style: { marginBottom: '12px' }, text: 'A big chip pays a big fee in one go, and a fee smaller than the chip only leaves Debt on top of it. Small chips bid fast; a bigger chip bid on a trick makes it linger and grow.' }),
    h('span', { class: 'cap', text: 'Colourful chips — deployed at the base of your stacks' }), list));
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
  openPanel(h('div', {}, head(`${D.CLASSES[run.cls].name}`, D.CLASSES[run.cls].blurb),
    h('div', { class: 'col' }, h('span', { class: 'cap', text: 'Book' }), h('div', { class: 'inv' }, run.tricks.map((t) => trickTag(t, run.cls))),
      h('span', { class: 'cap', text: 'Pouch' }), h('div', { class: 'dicebox' }, run.dice.map((d) => { const el = dieEl(d); el._tip = () => dieTip(d); el.classList.add('has-tip'); return el; })),
      h('span', { class: 'cap', text: `${R.walletOf(run).name} wallet — ${R.walletCards(run).length}/${R.walletOf(run).slots} slots · passes do not take a slot · click a card twice to drop it` }), h('div', { class: 'inv' }, run.cards.map((c) => { const pass = D.PASS_CARDS.includes(c); const el = h('span', { class: 'tag-t', style: { '--tc': pass ? 'var(--pink)' : 'var(--gold)', cursor: pass ? '' : 'pointer' }, tip: () => cardTip(c) + (pass ? '<p class="dim">A pass. It does not take a wallet slot.</p>' : '<p class="dim">Takes a wallet slot. Click twice to drop it for good.</p>'), text: D.CARDS[c].name });
        el.onclick = () => { if (pass) return; if (!el._armed) { el._armed = true; el.classList.add('armed'); return toast(`Click ${D.CARDS[c].name} again to drop it.`, 'warn'); } if (!R.dropCard(run, c)) return toast('You need that one to get in.', 'warn'); closePanel(); rerender(); toast(`${D.CARDS[c].name} dropped.`); }; return el; })),
      h('span', { class: 'cap', text: 'Position' }), h('p', { class: 'sub', text: `${st.dims.meterRows} Meter rows and ${st.dims.barRows} Bar rows of 5 spaces, stacks up to ${st.dims.stackMax} chips. Your Bar holds ${st.dims.barRows * 5 * st.dims.stackMax} chips.` }))));
}

// a found card with no free slot: drop one or leave it
function walletFullPanel() {
  const run = app.run, id = run.pendingCard, Wl = R.walletOf(run);
  const must = id === 'royal';
  const done = (drop) => { R.resolvePending(run, drop); closePanel(); rerender(); toast(drop ? `${D.CARDS[id].name} goes in your wallet.` : 'You leave it where it lies.'); };
  openPanel(h('div', { class: 'col' }, h('h2', { text: `${must ? 'The doorman hands you a' : 'Found:'} ${D.CARDS[id].name}` }), h('p', { class: 'sub', text: D.CARDS[id].text }),
    h('p', { text: `Your ${Wl.name} wallet holds ${Wl.slots} card${Wl.slots > 1 ? 's' : ''} and it is full. ${must ? 'You need the Royal Card to walk in, so one of these has to go.' : 'Drop one to make room, or leave this one.'}` }),
    h('div', { class: 'items' }, R.walletCards(run).map((c) => h('div', { class: 'item', tip: () => cardTip(c) }, h('div', { class: 'main' }, h('b', { text: D.CARDS[c].name }), h('small', { text: D.CARDS[c].text })), btn('Drop this', () => done(c), null, 'small danger')))),
    must ? null : h('div', { class: 'row' }, btn('Leave the new card', () => done(null), null, ''))), must ? { modal: true } : undefined);
}

function exitPanel() {
  const run = app.run;
  openPanel(h('div', { class: 'col' }, h('h2', { text: 'Exit through the Gift Shop?' }),
    h('p', { class: 'sub', text: 'Leaving ends this run. You keep whatever gear you unlock in the Gift Shop for future runs; everything else is lost in the alley.' }),
    h('p', { text: `You would walk in with ${cents(run.purse)}.` }),
    h('div', { class: 'row' }, btn('Stay at the tables', () => closePanel(), null, 'go'), btn('Leave', () => { closePanel(true); app.nav.gift(); }, null, 'danger'))));
}
