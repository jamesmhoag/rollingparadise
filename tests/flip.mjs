// A flipped chip rides a trick as a die of any type, keeps its face through an undo, and returns to the Meter.
import * as R from '../js/run.js'; import * as B from '../js/bout.js'; import { planTurn } from '../js/ai.js';
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exit(1); } };
for (let seed = 1; seed <= 30; seed++) {
  const run = R.newRun('hustler', 'standard', seed), { bout } = R.startIntro(run), me = bout.sides[0];
  const count = () => me.grid.flat().reduce((n, c) => n + c.chips.length, 0), before = count();
  const e = B.draw(bout, me, me.book[0].uid);
  const spot = (() => { for (let r = 0; r < me.rows; r++) for (let c = 0; c < me.dims.cols; c++) if (B.bidChip(me, r, c)?.kind === 'std') return { r, c }; })();
  const d = B.flip(bout, me, spot.r, spot.c, e);
  assert(d && d.chip && (d.value === 0 || d.value === d.chip.value), 'flip lands on 0 or the chip worth');
  assert(count() === before - 1 && me.used.roll === 1, 'flip takes the chip and uses a roll');
  B.resetPlan(bout, me); assert(count() === before, 'undo puts the chip back');
  const e2 = B.draw(bout, me, me.book[0].uid), d2 = B.flip(bout, me, spot.r, spot.c, e2);
  assert(d2.value === d.value, 'the chip keeps its face after an undo');
  const bidAt = (() => { for (let r = me.rows - 1; r >= 0; r--) for (let c = 0; c < me.dims.cols; c++) if (B.bidChip(me, r, c)) return { r, c }; })();
  B.bid(bout, me, e2, bidAt.r, bidAt.c); planTurn(bout, bout.sides[1]);
  for (const _ of B.resolve(bout)); // eslint-disable-line no-unused-vars
  const riding = me.run.flatMap((x) => x.dice).filter((x) => x.chip).length;
  const inMeter = me.grid.slice(0, me.dims.meterRows).flat().flatMap((c) => c.chips).some((ch) => ch.id === d2.chip.id);
  assert(riding === 1 || inMeter || bout.over, 'the flipped chip is on a lingering trick or back on the Meter');
  assert(!me.pouch.some((x) => x.chip), 'a flipped chip never enters the Pouch');
}
// wallets: slots, passes and the alley roll
const run = R.newRun('rascal', 'standard', 5, { wallet: 'duct_tape', kept: ['debit', 'note'] });
assert(R.walletCards(run).length === 1 && run.cards[0] === 'debit', 'a 1-slot wallet starts with one kept card');
assert(R.addCard(run, 'royal') && run.cards.includes('royal'), 'passes do not take a slot');
assert(!R.addCard(run, 'note') && run.pendingCard === 'note', 'a full wallet holds the found card as pending');
R.resolvePending(run, 'debit'); assert(run.cards.includes('note') && !run.cards.includes('debit'), 'dropping a card makes room');
const roll = R.alleyRoll(run); assert(roll.dice.length === 2 && roll.kept === (roll.total >= 10), 'alley roll compares two dice with the wallet threshold');
console.log('ok, flips and wallets');
