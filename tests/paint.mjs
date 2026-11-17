// A painted position: counts come from the layout, it deploys exactly, shop chips go around it, and it is dropped
// when it no longer fits the purse or the position.
import * as R from '../js/run.js'; import * as B from '../js/bout.js';

const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const run = R.newRun('rascal', 'standard', 4); R.enterFloor(run, 2); run.purse = 300; run.chips = { reducer: 2 };
const L = [{ r: 0, c: 1, chips: [5, 5, 2] }, { r: 2, c: 4, chips: [1] }]; run.plan.layout = L; run.plan.resist = { reducer: 1 };
const dims = R.rollerStats(run).dims;
ok(R.validLayout(run, dims) === L && R.planWorth(R.layoutCounts(L)) === 13, 'a painted layout is valid and worth what is painted');
const { bout } = R.startTable(run, R.newPrep(run, 'table', 0)), s = bout.sides[0], m = s.dims.meterRows;
ok(s.grid[m][1].chips.filter((ch) => !ch.resist).map((ch) => ch.value).join() === '5,5,2' && s.grid[m + 2][4].chips.some((ch) => ch.value === 1 && !ch.resist), 'it deploys space by space');
ok(s.grid.flat().some((cell) => cell.chips.some((ch) => ch.resist === 'reducer')), 'and the shop chips go in around it');
ok(B.worth(s) === 13 + 1, 'the position is worth the painted chips (plus the 1¢ Reducer)');
run.purse = 10; ok(!R.validLayout(run, dims), 'a layout the purse cannot cover is dropped');
run.purse = 300; run.plan.layout = [{ r: 0, c: 0, chips: Array(dims.stackMax + 1).fill(1) }]; ok(!R.validLayout(run, dims), 'so is a stack taller than the position allows');
if (fails.length) { console.log('FAIL ' + fails.join('\nFAIL ')); process.exit(1); }
console.log('ok, painted positions: counts, deployment, shop chips and limits');
