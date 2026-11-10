// The floor: a map of places to visit between bouts, each opening as a panel.
import { h, syncList, openPanel, closePanel, toast, btn, tween, pulse, swapText } from './core.js';
import { app, hud, oppTip, trickTag, diceSummary } from './app.js';
import { dieEl, dieTip, trickTip, pips, drinkTip, cardTip, chipEl, chipTip } from './parts.js';
import * as D from '../data.js';
import * as R from '../run.js';
import { cents } from '../util.js';

const MIN_BUYIN = 5;
let rerender = () => {};

export function hubScene(root) {
  const run = app.run, fs = run.fs, F = D.FLOORS[run.floor];
  const H = hud(F.name, `Floor ${run.floor} of 4`);
  const map = h('div', { class: 'map list' }), news = h('ul', { class: 'news list' }), book = h('div', { class: 'inv list' }), hint = h('p', { class: 'sub fade-t' });
  root.append(H.el, h('div', { class: 'page' }, h('div', { class: 'hub' }, map,
    h('div', { class: 'side' },
      h('div', { class: 'box scroll', style: { flex: '1' } }, h('span', { class: 'cap', text: 'Word on the floor' }), news),
      h('div', { class: 'box' }, h('span', { class: 'cap', text: 'Your book' }), book, hint)))));

  function tiles() {
    const out = [];
    fs.tables.forEach((t, i) => out.push({ k: 't' + i, cls: `table ${t.beaten ? 'done' : ''}`, ico: '🎴', name: t.seen ? t.opp.name : `Table ${i + 1}`, tag: `${t.felt} felt`,
      sub: t.beaten ? 'Beaten.' : t.seen ? `${D.CLASSES[t.opp.cls].name} · ${cents(t.opp.worth)} on the table` : 'A stranger. Sit down to find out.',
      tip: () => (t.seen ? oppTip(t.opp) : '<b>Unknown Roller</b><p>You have not seen this table play. Their name, gear and attributes stay hidden until you sit down, or until you close the table before it.</p>'),
      on: () => { if (t.beaten) return toast('That table is closed.'); if (run.purse < MIN_BUYIN) return toast(`You need at least ${cents(MIN_BUYIN)} to sit down.`, 'warn'); app.nav.prep('table', i); } }));
    const b = fs.boss;
    out.push({ k: 'boss', cls: `boss ${fs.bossOpen ? '' : 'locked'} ${b.beaten ? 'done' : ''}`, ico: '👑', name: b.opp.name, tag: 'Head table', sub: fs.bossOpen ? `High Roller · ${cents(b.opp.worth)} on the table · wager ×${D.WAGER_BOSS}` : `High Roller. Close ${R.tablesLeft(run)} more table${R.tablesLeft(run) === 1 ? '' : 's'}, or win a Double Down.`,
      tip: () => (fs.bossOpen ? oppTip(b.opp) : `<b>${b.opp.name}</b> <span class="dim">High Roller</span><p>Visible at the head table, but only their name. Beat them to take the stairs to the next floor.</p>`),
      on: () => { if (!fs.bossOpen) return toast('The High Roller will not see you yet.', 'warn'); if (run.purse < MIN_BUYIN) return toast(`You need at least ${cents(MIN_BUYIN)} to sit down.`, 'warn'); app.nav.prep('boss', 0); } });
    out.push({ k: 'smith', ico: '⚒️', name: 'Diesmith', sub: 'Forge, upgrade and sell dice.', tip: '<b>Diesmith</b><p>Melts several small dice into one bigger die, upgrades dice, and buys the ones you no longer need.</p>', on: () => smithPanel() });
    out.push({ k: 'trader', ico: '🃏', name: 'Trick Trader', sub: `${fs.shop.length} trick${fs.shop.length === 1 ? '' : 's'} on the shelf.`, tag: R.hasCard(run, 'membership') ? 'Member' : null, tip: '<b>Trick Trader</b><p>Buy new tricks, upgrade the ones in your Book, or sell them. Buy 5 on one floor to earn a Membership Card.</p>', on: () => traderPanel() });
    out.push({ k: 'exchange', ico: '🪙', name: 'Chip Exchange', sub: `Chips up to ${R.maxDenom(run.floor)}¢ on this floor.`, tip: '<b>Chip Exchange</b><p>Shows which chip values this floor deals in and sells colourful chips that protect a stack from hazards.</p>', on: () => exchangePanel() });
    out.push({ k: 'lounge', ico: '🍹', name: 'Lounge', sub: fs.lounge.happy ? 'Happy hour! Drinks half price.' : 'A drink for the table.', tag: run.drink ? `${run.drink.name}` : null, tip: '<b>Lounge</b><p>Bring a drink to the table and sip it before a turn for a bonus. Pay for it, or challenge the Roller at the bar: the loser buys.</p>', on: () => loungePanel() });
    const open = fs.book.events.filter((e) => e.bet && !e.done).length;
    out.push({ k: 'book', ico: '🏇', name: 'Sports Book', sub: open ? `${open} ticket${open > 1 ? 's' : ''} riding on the next bout.` : 'Are you here to gamble?', tip: '<b>Sports Book</b><p>Place long bets before you sit down. Games are played while you are at the table, so a winning ticket can fund another try after a loss.</p>', on: () => bookPanel() });
    out.push({ k: 'search', cls: fs.searched ? 'done' : '', ico: '🔎', name: 'Search the floor', sub: fs.searched ? 'Nothing else down here.' : 'Somebody always drops something.', tip: '<b>Search the floor</b><p>Once per floor you will find a card for your wallet.</p>',
      on: () => { const id = R.searchFloor(run); if (!id) return toast('You already looked.'); toast(`Found: ${D.CARDS[id].name}.`); render(); } });
    out.push({ k: 'kit', ico: '🎒', name: 'Your gear', sub: `${run.dice.length} dice · ${run.tricks.length} tricks · ${run.cards.length} cards`, tip: '<b>Your gear</b><p>Look through your Pouch, Book and Wallet.</p>', on: () => kitPanel() });
    out.push({ k: 'exit', cls: 'exit', ico: '🚪', name: 'Exit', sub: 'Through the Gift Shop. Ends the run.', tip: '<b>Exit through the Gift Shop</b><p>Cut your losses. Spend what is left on gear that stays unlocked for future runs, then leave. You cannot come back to the tables.</p>', on: () => exitPanel() });
    return out;
  }
  function render() {
    H.update();
    syncList(map, tiles(), (t) => t.k, () => h('button', { class: 'tile' }, h('span', { class: 'ico' }), h('b', {}), h('small', {}), h('span', { class: 'tag fade-t' })),
      (el, t) => { for (const c of ['table', 'boss', 'exit', 'done', 'locked']) el.classList.toggle(c, (t.cls || '').split(' ').includes(c));
        const [ico, nm, sub, tag] = el.children; ico.textContent = t.ico; swapText(nm, t.name); swapText(sub, t.sub);
        if (t.tag) tag.textContent = t.tag; tag.style.opacity = t.tag ? 1 : 0; el.onclick = t.on; el._tip = t.tip; el.classList.add('has-tip'); });
    syncList(news, run.news.slice(-7).map((text, i) => ({ text, k: run.news.length - Math.min(7, run.news.length) + i })).reverse(), (n) => n.k, (n) => h('li', { text: n.text }));
    syncList(book, run.tricks, (t) => t.uid + ':' + t.q + ':' + t.up, (t) => trickTag(t, run.cls));
    swapText(hint, R.brokeHint(run) || `${diceSummary(run.dice)} in your pouch.`);
    R.saveRun(run);
  }
  rerender = render; render();
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
      el.append(btn('Upgrade', () => { tryDo(R.upgradeTrick(run, t.uid), el, t.up >= 2 ? 'A trick can be upgraded twice.' : fs.upgrades <= 0 ? 'No upgrades left on this floor.' : null); done(); }, '<b>Upgrade</b><p>+25% to the roll total. Two upgrades per trick, two upgrades per floor.</p>', 'small'),
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
      h('span', { class: 'cap', text: 'Wallet' }), h('div', { class: 'inv' }, run.cards.map((c) => h('span', { class: 'tag-t', tip: () => cardTip(c), text: D.CARDS[c].name }))),
      h('span', { class: 'cap', text: 'Position' }), h('p', { class: 'sub', text: `${st.dims.meterRows} Meter rows and ${st.dims.barRows} Bar rows of 5 spaces, stacks up to ${st.dims.stackMax} chips. Your Bar holds ${st.dims.barRows * 5 * st.dims.stackMax} chips.` }))));
}

function exitPanel() {
  const run = app.run;
  openPanel(h('div', { class: 'col' }, h('h2', { text: 'Exit through the Gift Shop?' }),
    h('p', { class: 'sub', text: 'Leaving ends this run. You keep whatever gear you unlock in the Gift Shop for future runs; everything else is lost in the alley.' }),
    h('p', { text: `You would walk in with ${cents(run.purse)}.` }),
    h('div', { class: 'row' }, btn('Stay at the tables', () => closePanel(), null, 'go'), btn('Leave', () => { closePanel(true); app.nav.gift(); }, null, 'danger'))));
}
