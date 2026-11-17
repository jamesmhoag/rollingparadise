// The Pit: every chip a Roller loses, kept as it was (value and order), fees as far as the Stage total holds them.
import * as R from '../js/run.js'; import * as B from '../js/bout.js';
import { autoTurn } from '../js/ai.js';
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const drain = (g) => { for (const _ of g); }; // eslint-disable-line no-unused-vars
const run = R.newRun('rascal', 'standard', 11); R.enterFloor(run, 2); run.purse = 600;
const { bout } = R.startTable(run, R.newPrep(run, 'table', 0));
for (let k = 0; k < 4 && !bout.over; k++) { autoTurn(bout); drain(B.resolve(bout)); }
for (const si of [0, 1]) {
  const pit = B.pitOf(bout, si), fees = pit.filter((ch) => ch.from === 'fee'), bids = pit.filter((ch) => ch.from === 'bid');
  ok(pit.length > 0, `side ${si} has lost chips in the Pit`);
  ok(fees.reduce((t, ch) => t + ch.value, 0) <= bout.stage.paid[si], `side ${si}: the Pit's fees never exceed the Stage total`);
  ok(bids.reduce((t, ch) => t + ch.value, 0) === bout.sides[si].bidsPaid, `side ${si}: every bid the House took is in the Pit, at its value`);
  ok(pit.every((ch) => ch.value > 0 && ch.turn >= 1 && ch.id), `side ${si}: Pit chips keep their own value, id and turn`);
}
bout.stage.paid[0] = 0; ok(B.pitOf(bout, 0).every((ch) => ch.from === 'bid'), 'fees taken back leave the Pit');
if (fails.length) { console.log('FAIL ' + fails.join('\nFAIL ')); process.exit(1); }
console.log('ok, the Pit: lost chips kept as they were');
