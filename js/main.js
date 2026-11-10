// Entry point: boots the stage, owns navigation between screens.
import { h, fit, initTips, go, btn, toast, closePanel, openPanel } from './ui/core.js';
import { app } from './ui/app.js';
import { statRow, jacketTip, dieEl, dieTip, trickTip, pips } from './ui/parts.js';
import { hubScene } from './ui/floor.js';
import { prepScene, resultScene } from './ui/prep.js';
import { suiteScene, giftScene, ascentScene, summaryScene } from './ui/endgame.js';
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

function titleScene(root) {
  const meta = app.meta = R.loadMeta(), saved = R.loadRun();
  const resume = saved && ['floor', 'ascent'].includes(saved.phase);
  root.append(h('div', { class: 'title' }, h('div', {},
    h('div', { class: 'pair' }, h('span', { class: 'die static d6', tip: '<b>A pair of dice</b><p>Say it out loud.</p>' }, h('i', { text: '⚅' })), h('span', { class: 'die static d6' }, h('i', { text: '⚀' }))),
    h('div', { class: 'logo' }, h('small', { text: 'ROYAL PARADISE HOTEL & CASINO' }), 'Rolling Paradise'),
    h('p', { class: 'tagline', text: 'Gamble your way to the top.' }),
    h('div', { class: 'row', style: { justifyContent: 'center' } },
      resume ? btn('Continue run', () => { app.run = saved; saved.phase === 'ascent' ? nav.ascent() : nav.hub(); }, `<b>Continue</b><p>${D.CLASSES[saved.cls].name}, ${saved.phase === 'ascent' ? 'on the Paradise Ascent' : `floor ${saved.floor}`}, ${cents(saved.purse)} in the purse.</p>`, 'big go') : null,
      btn('New run', () => nav.select(), resume ? '<b>New run</b><p>Starts over. Your saved run is replaced once the new one reaches the first floor.</p>' : null, resume ? 'big' : 'big go'),
      btn('How to play', () => howTo(), null, 'big')),
    h('div', { class: 'stats', style: { justifyContent: 'center', marginTop: '26px' } },
      [['Runs', meta.runs, 'Runs you have finished.'], ['Best floor', meta.best > 4 ? 'Ascent' : meta.best || '—', 'The highest floor any of your Rollers reached.'], ['Crowns', meta.crowns, 'Times you reached the top step of the Paradise Ascent.'], ['Jackets', meta.jackets.length, 'Jackets unlocked in the Gift Shop.'], ['ATM', cents(meta.atm), 'Chips banked for Gift Shop purchases.']]
        .map(([a, b, t]) => h('span', { class: 'stat', tip: `<b>${a}</b><p>${t}</p>` }, h('em', { text: a }), h('b', { text: b })))))));
}

function howTo() {
  const p = (t, s) => h('div', {}, h('h3', { text: t }), h('p', { class: 'sub', text: s }));
  openPanel(h('div', { class: 'col' }, h('div', { class: 'row between' }, h('h2', { text: 'How to play' }), btn('Got it', () => closePanel(), null, 'small go')),
    p('The goal', 'Deplete your opponent\'s Worth before they deplete yours. Worth is the chips in your position. Reach zero and you are broke.'),
    p('Your turn', 'Draw tricks from your Book onto your Run. Click a die in your Pouch to roll it onto a shown trick. Click a trick\'s BID slot, then one of your own stacks, to pay a chip and play it. Then press Play. Both Rollers plan at once and every effect resolves in order: Investments, Insurances, Expenses, Corrections.'),
    p('Tricks', 'A bid with no dice plays only the small Trait. A bid with dice plays the Roll effect, scaled by the total. Fill the trick with the right dice and meet its condition for the Bonus. You can load dice over several turns before bidding.'),
    p('Holding back pays', 'Each draw, roll and bid you leave unused earns something: Power for your next roll, Opportunity chips, or chips stolen from the Stage.'),
    p('The Stage', 'Fees move chips from a position to the Stage. The winner takes everything on it. Bids go to the House and are gone.'),
    p('Between bouts', 'Shop, drink, place bets, then set your position. Every chip you do not put on the table is wagered on the bout and comes back multiplied if you win.'),
    p('Anything unclear?', 'Hover it. Every chip, die, trick, number and button explains itself.')));
}

function selectScene(root) {
  const meta = app.meta; let cls = 'hustler', jacket = 'standard';
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
  function sync() { for (const el of els) el.classList.toggle('sel', el._id === cls); for (const b of jb) b.classList.toggle('on', b._id === jacket); }
  sync();
  root.append(h('div', { class: 'page', style: { top: 0, padding: '22px 40px' } }, h('div', { class: 'row between' }, h('div', {}, h('h1', { text: 'Choose a Roller' }), h('p', { class: 'sub', text: 'Hover anything to see what it does. The doorman wants a word before you go in.' })),
    h('div', { class: 'row' }, btn('Back', () => nav.title()), btn('Walk in', () => { app.run = R.newRun(cls, jacket); nav.intro().then(() => { if (app.meta.seenHow) return toast('Beat the doorman to earn your welcome stake.'); app.meta.seenHow = true; R.saveMeta(app.meta); howTo(); }); }, '<b>Walk in</b><p>You start with an intro bout on house chips. Win it and the House stakes you 200¢ to enter floor 1.</p>', 'big go'))),
    h('div', { style: { marginTop: '16px' } }, cards), h('div', { style: { marginTop: '14px' } }, jackets)));
}

window.addEventListener('resize', fit);
fit(); initTips();
app.meta = R.loadMeta();
nav.title();
if (new URLSearchParams(location.search).has('debug')) window.RP = { app, R, D };
