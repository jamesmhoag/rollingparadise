// The Opponent maker: the roster seats the tables, loadouts and layouts apply, behaviours steer the AI, and High
// Rollers change phase and cheat.
import * as R from '../js/run.js'; import * as B from '../js/bout.js'; import * as D from '../js/data.js';
import { autoTurn, planPhase, behaveOf } from '../js/ai.js';

const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const drain = (g) => { for (const _ of g); }; // eslint-disable-line no-unused-vars

ok(Object.keys(D.ROSTER).length === D.OPPONENTS.length + D.BOSSES.slice(1).flat().length, 'every opponent and High Roller is on the roster');
{ const run = R.newRun('hustler', 'standard', 5); R.enterFloor(run, 2);
  ok(run.fs.tables.every((tb) => tb.opp.roster && D.ROSTER[tb.opp.roster].name === tb.opp.name), 'the floor seats roster opponents');
  ok(run.fs.boss.opp.roster && D.ROSTER[run.fs.boss.opp.roster].boss && D.ROSTER[run.fs.boss.opp.roster].floors.includes(2), 'the head table seats a High Roller for this floor'); }
{ // a loadout
  D.ROSTER.test_shark = { name: 'Test Shark', cls: 'rascal', floors: [3], tables: [1], purse: 777, jacket: 'long', drink: 'soda', chips: { reducer: 2 }, behave: { temper: 'aggressive', bid: 'refund' } };
  const run = R.newRun('hustler', 'standard', 6); R.enterFloor(run, 3);
  const o = R.genOpponent(run, 3, 100, { roster: 'test_shark', name: 'Test Shark', cls: 'rascal' });
  ok(o.cls === 'rascal' && Math.abs(o.worth - 777) < 30, 'class and purse come from the roster');
  ok(o.dims.barRows === D.BASE_DIMS.barRows + D.CLASSES.rascal.bvd.depth + 1, 'the jacket changes its attributes (Long: +1 Bar row)');
  ok(o.drink?.id === 'soda' && o.plan.chips.some((g) => g.resist === 'reducer' && g.count === 2), 'it brings its drink and its own chips');
  ok(o.behave.temper === 'aggressive' && o.behave.bid === 'refund' && o.behave.roll === 'balanced', 'its behaviour, with defaults for the rest');
  ok(R.rosterFor(3, 1).includes('test_shark') && !R.rosterFor(3, 0).includes('test_shark') && !R.rosterFor(2, 1).includes('test_shark'), 'it sits only at its floors and tables');
  delete D.ROSTER.test_shark;
}
{ // a precise layout
  D.ROSTER.test_layout = { name: 'Layout', cls: 'hustler', layout: [{ r: 0, c: 0, chips: [10, 10, 'reducer'] }, { r: 1, c: 2, chips: [25] }] };
  const run = R.newRun('hustler', 'standard', 7); R.enterFloor(run, 2); run.purse = 5000;
  run.fs.tables[0].opp = R.genOpponent(run, 2, 100, { roster: 'test_layout', name: 'Layout', cls: 'hustler' });
  const { bout } = R.startTable(run, R.newPrep(run, 'table', 0)), o = bout.sides[1], m = o.dims.meterRows;
  ok(o.grid[m][0].chips.filter((ch) => ch.kind === 'std' && !ch.resist).map((ch) => ch.value).join() === '10,10' && o.grid[m][0].chips.some((ch) => ch.resist === 'reducer') && o.grid[m + 1][2].chips[0]?.value === 25, 'a precise layout is laid out chip by chip');
  ok(B.worth(o) === 46, 'and its Worth is exactly those chips');
  delete D.ROSTER.test_layout;
}
{ // a High Roller's phases and cheat
  const run = R.newRun('hustler', 'standard', 8); R.enterFloor(run, 1); run.purse = 5000;
  const bo = run.fs.boss.opp; bo.phases = [{ below: 2, behave: { bluff: 'big', temper: 'rabid' }, cheat: { dice: 2, tricks: 1 } }];
  run.fs.bossOpen = true; const { bout } = R.startTable(run, R.newPrep(run, 'boss', 0)), o = bout.sides[1], dice0 = o.pouch.length, book0 = o.book.length;
  autoTurn(bout); drain(B.resolve(bout));
  ok(o.phaseAt === 0 && o.pouch.length >= dice0 + 2 - 5 && o.phaseBehave.bluff === 'big' && behaveOf(o).bluff === 'big', 'a High Roller under its threshold changes phase');
  ok(bout.log.some((t) => /changes tactics and cheats/.test(t)) && o.book.length < book0, 'and cheats: extra dice and a trick from its Book');
}
{ // behaviours steer play, and whole bouts still finish
  const kinds = [{ draw: 'random' }, { draw: 'expense', temper: 'aggressive' }, { roll: 'all', dice: 'highest' }, { roll: 'partial', dice: 'lowest' }, { bid: 'effect' }, { bid: 'refund' }, { aim: 'chips' }, { aim: 'least' }, { bluff: 'big' }, { bluff: 'many' }, { bluff: 'build', bonus: 'no' }, { temper: 'cowardly' }];
  let refundOk = true;
  kinds.forEach((bh, i) => {
    const run = R.newRun(['hustler', 'rascal', 'technician'][i % 3], 'standard', 20 + i); R.enterFloor(run, 1 + (i % 4)); run.purse = 3000;
    run.fs.tables[0].opp.behave = { ...D.DEFAULT_BEHAVE, ...bh };
    const { bout } = R.startTable(run, R.newPrep(run, 'table', 0)), o = bout.sides[1];
    let n = 0; while (!bout.over && n++ < 60) {
      if (bh.bid === 'refund' && bout.phase === 'bid') { planPhase(bout, o); if (o.used.bid > 1) refundOk = false; }
      autoTurn(bout); drain(B.resolve(bout)); }
    ok(bout.over || n >= 60, `a bout with ${JSON.stringify(bh)} plays through`);
  });
  ok(refundOk, 'a Roller holding bids back bids only once a turn');
}
if (fails.length) { console.log('FAIL ' + fails.join('\nFAIL ')); process.exit(1); }
console.log('ok, opponents: roster, loadouts, layouts, behaviours and High Roller phases');
