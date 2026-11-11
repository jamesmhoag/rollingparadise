// Entry point: boots the stage, owns navigation between screens.
import { h, fit, initTips, go, btn, toast, closePanel, openPanel } from './ui/core.js';
import { app } from './ui/app.js';
import { statRow, jacketTip, dieEl, dieTip, trickTip, pips } from './ui/parts.js';
import { hubScene } from './ui/floor.js';
import { prepScene, resultScene } from './ui/prep.js';
import { suiteScene, giftScene, ascentScene, summaryScene, alleyScene, walletTip } from './ui/endgame.js';
import { boutScene } from './ui/boutview.js';
import * as D from './data.js';
import * as R from './run.js';
import { cents } from './util.js';

const nav = app.nav;
nav.title = () => go(titleScene);
nav.select = () => go(selectScene);
nav.hub = () => go(hubScene);
nav.prep = (kind, idx) => go((root) => prepScene(root, kind, idx));
nav.bout = ({ bout, ctx }) => go((root) => { if (window.RP) window.RP.bout = bout; boutScene(root, bout, ctx, () => { const res = R.settle(app.run, ctx, bout); go((r) => resultScene(r, ctx, res)); }); });
nav.intro = () => nav.bout(R.startIntro(app.run));
nav.lounge = (drinkId) => nav.bout(R.startLounge(app.run, drinkId));
nav.suite = (penthouse) => go((root) => suiteScene(root, penthouse));
nav.gift = () => go(giftScene);
nav.ascent = () => { R.saveRun(app.run); go(ascentScene); };
nav.summary = () => go(summaryScene);
nav.alley = () => go(alleyScene);

function titleScene(root) {
  const meta = app.meta = R.loadMeta(), saved = R.loadRun();
  const resume = saved && ['floor', 'ascent'].includes(saved.phase);
  // drifting neon motes; positions are fixed per load so the scene is calm, not noisy
  const motes = Array.from({ length: 26 }, (_, i) => h('span', { class: 'mote', style: { left: `${(i * 37 + 11) % 100}%`, '--mc': i % 3 ? 'var(--gold)' : 'var(--pink)', '--d': `${7 + (i * 13) % 9}s`, '--w': `${-((i * 7) % 12)}s`, '--dx': `${((i * 29) % 120) - 60}px` } }));
  const sign = h('div', { class: 'sign', tip: '<b>Rolling Paradise</b><p>A pair of dice. Say it out loud.</p>' }, h('div', { class: 'glow' }),
    h('img', { class: 'l-pink', src: 'assets/logo-pink.png', alt: '', draggable: 'false' }), h('img', { class: 'l-cyan', src: 'assets/logo-cyan.png', alt: 'Rolling Paradise', draggable: 'false' }), h('img', { class: 'l-dice', src: 'assets/logo-dice.png', alt: '', draggable: 'false' }));
  root.append(h('div', { class: 'title' }, h('div', { class: 'sky' }), h('div', { class: 'gridfloor' }), ...motes, h('div', { class: 'inner' },
    h('div', { class: 'hotel neon-c', text: 'ROYAL PARADISE HOTEL & CASINO' }), sign,
    h('p', { class: 'tagline neon-p', text: 'Gamble your way to the top' }),
    h('div', { class: 'menu' },
      resume ? btn('Continue', () => { app.run = saved; saved.phase === 'ascent' ? nav.ascent() : nav.hub(); }, `<b>Continue</b><p>${D.CLASSES[saved.cls].name}, ${saved.phase === 'ascent' ? 'on the Paradise Ascent' : `floor ${saved.floor}`}, ${cents(saved.purse)} in the purse.</p>`, 'sign-btn') : null,
      btn('New run', () => nav.select(), resume ? '<b>New run</b><p>Starts over. Your saved run is replaced once the new one reaches the first floor.</p>' : null, resume ? 'sign-btn p' : 'sign-btn'),
      btn('How to play', () => howTo(), null, 'sign-btn p')),
    h('div', { class: 'stats records' },
      [['Runs', meta.runs, 'Runs you have finished.'], ['Best floor', meta.best > 4 ? 'Ascent' : meta.best || '—', 'The highest floor any of your Rollers reached.'], ['Crowns', meta.crowns, 'Times you reached the top step of the Paradise Ascent.'], ['Jackets', meta.jackets.length, 'Jackets unlocked in the Gift Shop.'], ['Wallets', (meta.wallets || []).length, 'Wallets unlocked in the Gift Shop.'], ['ATM', cents(meta.atm), 'Chips banked for Gift Shop purchases.']]
        .map(([a, b, t]) => h('span', { class: 'stat', tip: `<b>${a}</b><p>${t}</p>` }, h('em', { text: a }), h('b', { text: b })))))));
}

function howTo() {
  const p = (t, s) => h('div', {}, h('h3', { text: t }), h('p', { class: 'sub', text: s }));
  openPanel(h('div', { class: 'col' }, h('div', { class: 'row between' }, h('h2', { text: 'How to play' }), btn('Got it', () => closePanel(), null, 'small go')),
    p('The goal', 'Deplete your opponent\'s Worth before they deplete yours. Worth is the chips in your position. Reach zero and you are broke.'),
    p('Your turn: three steps', '1 · Draw: click tricks in your Book to show them on your Run. Draw at least one, then lock in. 2 · Roll: pick dice from your Pouch (or a top chip to flip as a coin-toss die) and press Roll. Everything you picked lands in the roll at once, showing its value. Put at least one on a shown trick and leave the rest. 3 · Bid: click one of your stacks to pick up its top chip, then click a trick to pay it. Keep going until you are out of bids; a trick can take more than one. Then press Play. Each step closes the one before it.'),
    p('You do not see their move until you make yours', 'Your opponent goes through the same three steps. What they draw, roll and bid in a step is shown only once you have locked in the same step, and they cannot see yours either.'),
    p('The House runs the table', 'Once both Rollers have bid, the House calls each effect type in order: Investments, Insurances, Expenses, Corrections. It has two arms, one for each Roller, and plays both sides of a phase together, so nothing you play changes what your opponent plays in the same phase. The feed under the table posts both calls.'),
    p('Tricks', 'A bid with no dice plays only the small Trait. A bid with dice plays the Roll effect, scaled by the total. Fill the trick with the right dice and meet its condition for the Bonus. You can load dice over several turns before bidding.'),
    p('Holding back pays', 'Each draw, roll and bid you leave unused earns something: Power for your next roll, Opportunity chips, or chips stolen from the Stage.'),
    p('Debt', 'An Expense is a fee on the stacks it hits. The House pays it from the top of each stack, one whole chip at a time. What cannot cover the next chip stays on that stack as Debt, shown as one red marker with the amount; it already counts against Worth, and the chip goes once later fees bring the Debt up to its value. If a stack runs out of chips, the rest (overkill) moves to the next stack behind it in the same lane, never sideways. While aiming, the stacks show what the fee will pay, leave and carry.'),
    p('The Stage', 'Settled fees are stacked on the Stage in front of the House. The winner takes everything on it. Bids go to the House and are gone.'),
    p('Between bouts', 'Shop, drink, place bets, then set your position. Every chip you do not put on the table is wagered on the bout and comes back multiplied if you win.'),
    p('Anything unclear?', 'Hover it. Every chip, die, trick, number and button explains itself.')));
}

function selectScene(root) {
  const meta = app.meta; let cls = 'hustler', jacket = 'standard', wallet = meta.wallets.includes(meta.lastWallet) ? meta.lastWallet : 'worn_cloth';
  const cards = h('div', { class: 'cols3' }), jackets = h('div', { class: 'row wrap' });
  const els = Object.entries(D.CLASSES).map(([id, K]) => {
    const dice = Object.entries(K.dice).flatMap(([type, n]) => Array.from({ length: n }, () => type));
    const el = h('button', { class: 'pick-card', style: { '--cc': K.color }, onclick: () => { cls = id; sync(); } },
      h('h2', { text: K.name }), h('p', { class: 'sub', text: K.blurb }),
      h('span', { class: 'cap', text: 'Each turn' }), statRow(K.tip, ['trickery', 'ingenuity', 'proficiency']),
      h('span', { class: 'cap', text: 'For each one left unused' }), statRow(K.c, ['charisma', 'cunning', 'conviction']),
      h('span', { class: 'cap', text: 'Position bonus' }), statRow(K.bvd, ['balance', 'versatility', 'depth']),
      h('span', { class: 'cap', text: 'Pouch' }), h('div', { class: 'dicebox' }, dice.map((type) => { const d = dieEl({ type }); d._tip = () => dieTip({ type }); d.classList.add('has-tip'); return d; })),
      h('span', { class: 'cap', text: 'Book' }), h('div', { class: 'inv' }, K.tricks.map((tid) => { const t = { id: tid, q: 1, up: 0 }; return h('span', { class: 'tag-t', style: { '--tc': D.TYPES[D.TRICKS[tid].type].color }, tip: () => trickTip(t, id) }, D.TRICKS[tid].name, h('span', { class: 'q', html: pips(t) })); })));
    el._id = id; return el; });
  cards.append(...els);
  const jb = meta.jackets.map((id) => { const b = btn(`🧥 ${D.JACKETS[id].name}`, () => { jacket = id; sync(); }, () => jacketTip(id), 'small'); b._id = id; return b; });
  jackets.append(h('span', { class: 'cap', text: 'Jacket' }), ...jb);
  const wb = meta.wallets.map((id) => { const b = btn(`👛 ${D.WALLETS[id].name}`, () => { wallet = id; sync(); }, () => walletTip(id), 'small'); b._id = id; return b; });
  const keptEl = h('span', { class: 'sub fade-t' });
  jackets.append(h('span', { class: 'cap', style: { marginLeft: '18px' }, text: 'Wallet' }), ...wb, keptEl);
  function sync() { for (const el of els) el.classList.toggle('sel', el._id === cls); for (const b of jb) b.classList.toggle('on', b._id === jacket); for (const b of wb) b.classList.toggle('on', b._id === wallet);
    const k = (meta.kept || []).slice(0, D.WALLETS[wallet].slots); keptEl.textContent = k.length ? `On the dresser from your last run: ${k.map((c) => D.CARDS[c].name).join(', ')}` : ''; }
  sync();
  root.append(h('div', { class: 'page', style: { top: 0, padding: '22px 40px' } }, h('div', { class: 'row between' }, h('div', {}, h('h1', { text: 'Choose a Roller' }), h('p', { class: 'sub', text: 'Hover anything to see what it does. The doorman wants a word before you go in.' })),
    h('div', { class: 'row' }, btn('Back', () => nav.title()), btn('Walk in', () => { app.run = R.newRun(cls, jacket, undefined, { wallet, kept: meta.kept }); meta.kept = []; meta.lastWallet = wallet; R.saveMeta(meta); nav.intro().then(() => { if (app.meta.seenHow) return toast('Beat the doorman to earn your welcome stake.'); app.meta.seenHow = true; R.saveMeta(app.meta); howTo(); }); }, '<b>Walk in</b><p>You start with an intro bout on house chips. Win it and the House stakes you 200¢ to enter floor 1.</p>', 'big go'))),
    h('div', { style: { marginTop: '16px' } }, cards), h('div', { style: { marginTop: '14px' } }, jackets)));
}

window.addEventListener('resize', fit);
fit(); initTips();
app.meta = R.loadMeta();
nav.title();
if (new URLSearchParams(location.search).has('debug')) window.RP = { app, R, D };
