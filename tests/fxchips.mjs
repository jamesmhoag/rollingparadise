// Every trick effect is a chip's work (note 35). A trick is either an Expense charging a fee (Debt chips) or lays
// chips (roll.k 'chips'): a made chip that moves or pulls, an effect's chip (action fx), or a maker's effect chips.
// The effect belongs to the chip: laid by a trick it plays with the trick's roll, spread and Bonus; laid by anything
// else (here the chip painter) it plays the same effect on the space it sits on.
import * as R from '../js/run.js'; import * as B from '../js/bout.js'; import * as D from '../js/data.js';
import { EFFECTS, ARRANGES, ACTIONS } from '../js/content/chipmaker.js';

const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const drain = (g) => { for (const x of g) void x; };
function table(seed = 5) { const run = R.newRun('technician', 'standard', seed); R.enterFloor(run, 3); run.purse = 3000; const { bout } = R.startTable(run, R.newPrep(run, 'table', 0)); return { bout, me: bout.sides[0], opp: bout.sides[1] }; }

for (const [id, T] of Object.entries(D.TRICKS)) ok(T.roll.k === 'chips' || (T.roll.k === 'fee' && T.type === 'expense'), `${id}: an Expense's fee, or chips`);
const fxTricks = Object.entries(D.TRICKS).filter(([, T]) => B.fxOf(T)), makers = Object.entries(D.TRICKS).filter(([, T]) => B.makeOf(T));
ok(fxTricks.length >= 27 && makers.length >= 16, `effects (${fxTricks.length}) and makers (${makers.length}) all lay chips`);
ok(Object.keys(EFFECTS).sort().join() === B.FX_KINDS.filter((k) => k !== 'make').sort().join(), 'every effect the engine plays is named for the chip maker, and no other');
ok(ACTIONS.fx, 'the chip maker has the action');
for (const [id, M] of Object.entries(D.MADE_CHIPS)) for (const A of M.actions || []) if (A.k === 'fx') { ok(EFFECTS[A.fx], `${id}: a known effect`); ok(A.fx !== 'arrange' || ARRANGES[A.by], `${id}: a known order`); ok(M.text, `${id}: says what it does`); }
for (const [id, T] of fxTricks) ok(T.roll.text && T.roll.text === D.MADE_CHIPS[T.roll.chip].text, `${id}: its card reads what its chip does`);

{ // a trick lays its effect's chip under the stack it is aimed at; the effect is played once, by the chip
  const { bout, me } = table(), x = me.grid.flatMap((row, r) => row.map((cell, c) => ({ r, c, cell }))).find((y) => B.solidCount(y.cell) >= 2);
  const e = { uid: 1, trick: { id: 'brace', q: 1 }, dice: [{ value: 6, type: 'd8' }, { value: 6, type: 'd8' }], bid: [], bidValue: 0, lingerTotal: 0, lingerLeft: 0, state: 'play', target: { side: 0, r: x.r, c: x.c } };
  me.run.push(e); me.fz = { ...me.mods }; drain(B._test.play(bout, me, e));
  const mark = x.cell.chips[0];
  ok(mark?.model === 'brace' && mark.spent && mark.power >= 12, 'Brace lays a Brace chip at the bottom of its target, made with the roll');
  ok(B.hardOf(x.cell) > 0, 'and the chip hardens the stack');
  ok(B.bidChip(me, x.r, x.c)?.model !== 'brace', "an effect's chip is not a chip to bid");
  const hard = B.hardOf(x.cell); drain(B._test.madeWork(bout, me, 'insurance', true)); ok(B.hardOf(x.cell) === hard, 'it does not play twice');
}
{ // an effect with no aim: its chip goes on its Roller's Bet
  const { bout, me } = table();
  const e = { uid: 1, trick: { id: 'endure', q: 1 }, dice: [{ value: 4, type: 'd6' }], bid: [], bidValue: 0, lingerTotal: 0, lingerLeft: 0, state: 'play', target: null };
  me.run.push(e); me.fz = { ...me.mods }; drain(B._test.play(bout, me, e));
  ok(me.status.resist >= 4, 'Endure resists by its roll');
  ok(me.grid.slice(0, me.dims.meterRows).flat().some((cell) => cell.chips.some((ch) => ch.model === 'endure')), 'and its chip sits on the Bet');
}
{ // the same chip, laid by the painter: it plays when it is made, for the Roller whose space it is on, at strength 1
  const { bout, me } = table(), m = me.dims.meterRows;
  ok(B.sandboxChip(bout, 0, 0, 0, { made: 'endure' }, 'add'), 'the painter can lay an effect chip');
  const r0 = me.status.resist; drain(B._test.madeWork(bout, me, 'insurance', false));
  ok(me.status.resist === r0 + 1, 'a painted Endure chip resists 1');
  const x = me.grid.flatMap((row, r) => row.map((cell, c) => ({ r, c, cell }))).find((y) => y.r >= m && y.cell.chips.filter((ch) => ch.kind === 'std').length >= 2);
  B.sandboxChip(bout, 0, x.r, x.c, { made: 'gild' }, 'insert'); drain(B._test.madeWork(bout, me, 'investment', false));
  ok(x.cell.chips.some((ch) => ch.gold), 'a painted Gild chip gilds a chip of its stack');
}
{ // a maker still places its effect chips, so many and for so long by the roll
  const { bout, me } = table(), m = me.dims.meterRows, x = me.grid.flatMap((row, r) => row.map((cell, c) => ({ r, c, cell }))).find((y) => y.r >= m && B.solidCount(y.cell) >= 1); x.cell.chips = x.cell.chips.slice(0, 1);
  const e = { uid: 1, trick: { id: 'cushion', q: 1 }, dice: [{ value: 5, type: 'd6' }, { value: 5, type: 'd6' }], bid: [], bidValue: 0, lingerTotal: 0, lingerLeft: 0, state: 'play', target: { side: 0, r: x.r, c: x.c } };
  me.run.push(e); me.fz = { ...me.mods }; drain(B._test.play(bout, me, e));
  ok(x.cell.chips.filter((ch) => ch.shop === 'reducer').length >= 2, 'Cushion places Reducer chips (1, +1 per 5 rolled)');
}
if (fails.length) { console.log('FAIL ' + fails.join('\nFAIL ')); process.exit(1); }
console.log(`ok, every trick effect is a chip's work: ${fxTricks.length} effect chips, ${makers.length} makers, laid by tricks or by hand`);
