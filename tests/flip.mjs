// A flipped chip rides a trick as a die of any type, keeps its face through an undo, and returns to the Meter.
import * as R from '../js/run.js'; import * as B from '../js/bout.js'; import { planPhase, autoTurn } from '../js/ai.js';
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exit(1); } };
const closeBoth = (bout) => { planPhase(bout, bout.sides[1]); assert(B.advance(bout), `close ${bout.phase}: ${B.needOf(bout, bout.sides[0])}`); };
for (let seed = 1; seed <= 30; seed++) {
  const run = R.newRun('hustler', 'standard', seed), { bout } = R.startIntro(run), me = bout.sides[0];
  const count = () => me.grid.flat().reduce((n, c) => n + c.chips.filter((ch) => ch.kind !== 'fx').length, 0), before = count();
  const e = B.draw(bout, me, me.book[0].uid); closeBoth(bout);
  const spot = B.flippable(me)[0];
  const [d] = B.throwDice(bout, me, [], [spot]);
  assert(me.tray.includes(d) && !B.canPlace(bout, me, d.id, e), 'a flipped chip waits in the roll and fits any trick');
  B.place(bout, me, d.id, e); assert(e.dice.includes(d) && B.unplace(bout, me, d.id) && me.tray.includes(d) && B.place(bout, me, d.id, e), 'a rolled die can be moved while the Roll phase is open');
  assert(d && d.chip && (d.value === 0 || d.value === d.chip.value), 'flip lands on 0 or the chip worth');
  assert(count() === before - 1 && me.used.roll === 1, 'flip takes the chip and uses a roll');
  B.resetPlan(bout, me); assert(me.thrown && me.tray.length === 1 && count() === before - 1, 'undo after the throw keeps the throw');
  assert(B.canThrow(bout, me, [me.pouch[0]?.id].filter(Boolean)), 'rolling is one throw a turn');
  const e2 = me.run.find((x) => x.uid === e.uid); // undo swaps in a copy of the Run
  B.place(bout, me, me.tray[0].id, e2); closeBoth(bout);
  const bidAt = B.biddable(me)[0];
  B.bid(bout, me, e2, bidAt.r, bidAt.c); closeBoth(bout);
  for (const _ of B.resolve(bout)); // eslint-disable-line no-unused-vars
  const riding = me.run.flatMap((x) => x.dice).filter((x) => x.chip).length;
  const inMeter = me.grid.slice(0, me.dims.meterRows).flat().flatMap((c) => c.chips).some((ch) => ch.id === d.chip.id);
  assert(riding === 1 || inMeter || bout.over, 'the flipped chip is on a lingering trick or back on the Meter');
  assert(!me.pouch.some((x) => x.chip), 'a flipped chip never enters the Pouch');
  assert(!me.tray.length && !me.pouch.some((x) => 'value' in x), 'unplaced dice go back to the Pouch unrolled');
  if (!bout.over) autoTurn(bout);
}
// wallets: slots, passes and the alley roll
const run = R.newRun('rascal', 'standard', 5, { wallet: 'duct_tape', kept: ['debit', 'note'] });
assert(R.walletCards(run).length === 1 && run.cards[0] === 'debit', 'a 1-slot wallet starts with one kept card');

assert(R.addCard(run, 'punch') && run.cards.includes('punch'), 'passes do not take a slot');
assert(!R.addCard(run, 'royal') && run.pendingCard === 'royal' && !R.dropCard(run, 'royal'), 'the Royal Card needs a slot');
R.resolvePending(run, null);
assert(!R.addCard(run, 'note') && run.pendingCard === 'note', 'a full wallet holds the found card as pending');
R.resolvePending(run, 'debit'); assert(run.cards.includes('note') && !run.cards.includes('debit'), 'dropping a card makes room');
const roll = R.alleyRoll(run); assert(roll.dice.length === 2 && roll.kept === (roll.total >= 10), 'alley roll compares two dice with the wallet threshold');
console.log('ok, flips and wallets');
