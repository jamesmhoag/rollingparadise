// The gameplay tuner: the system numbers come from TUNING, and changing them changes the game.
import * as R from '../js/run.js'; import * as B from '../js/bout.js'; import * as D from '../js/data.js';
import * as Draft from '../js/build/draft.js';

const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const run = R.newRun('hustler', 'standard', 3); R.enterFloor(run, 2); run.purse = 1e6;
const prep = R.newPrep(run, 'table', 0); for (const k of Object.keys(prep.tilts)) prep.tilts[k] = 0;
const m0 = R.multiplier(run, prep), r0 = R.restockCost(run), p0 = R.packCost(run, 1);
Draft.setValue('TUNING.wager.base', 2.5); Draft.setValue('TUNING.shops.restock', 300); Draft.setValue('TUNING.shops.packPrice', 400);
ok(m0 === 1.5 && R.multiplier(run, prep) === 2.5, 'the table wager multiplier is tuned');
ok(R.restockCost(run) === r0 * 3 && R.packCost(run, 1) === p0 * 2, 'restock and pack prices are tuned');
Draft.setValue('TUNING.shops.discount', 0.5); run.cards.push('discount_trader');
ok(R.restockCost(run) === Math.round(r0 * 3 * 0.5), 'the discount card rate is tuned');
Draft.setValue('TUNING.tables.barCols', 4); R.enterFloor(run, 2);
ok(run.fs.lounge.challenger.dims.cols === 4, 'bar tables are as wide as tuned');
{ // sips a round
  Draft.setValue('TUNING.drinks.sipsPerRound', 2);
  const { bout } = R.startTable(run, R.newPrep(run, 'table', 0)), s = bout.sides[0];
  s.drink = { name: 'Soda Pop', sips: 5, mods: { trickery: 1 } }; bout.phase = 'drink'; s.sipped = 0;
  ok(B.sip(bout, s) && B.sip(bout, s) && !B.sip(bout, s), 'two sips a round when tuned to two');
}
Draft.discard();
ok(R.multiplier(run, prep) === 1.5 && D.TUNING.tables.barCols === 3, 'discarding the draft puts the numbers back');
if (fails.length) { console.log('FAIL ' + fails.join('\nFAIL ')); process.exit(1); }
console.log('ok, tuner: wagers, prices, tables and drinks follow the tuning');
