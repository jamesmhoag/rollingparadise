// A painted position: counts come from the layout, it deploys exactly, shop chips go around it, and it is dropped
// when it no longer fits the purse or the position.
import * as R from '../js/run.js'; import * as B from '../js/bout.js';

const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const run = R.newRun('rascal', 'standard', 4); R.enterFloor(run, 2); run.purse = 300; run.chips = { reducer: 2 };
const L = [{ r: 0, c: 1, chips: [5, 5, 2] }, { r: 2, c: 4, chips: [1] }]; run.plan.layout = L; run.plan.resist = { reducer: 1 };
const dims = R.rollerStats(run).dims;
ok(JSON.stringify(R.validLayout(run, dims)) === JSON.stringify(L) && R.planWorth(R.layoutCounts(L)) === 13, 'a painted layout is valid and worth what is painted');
const { bout } = R.startTable(run, R.newPrep(run, 'table', 0)), s = bout.sides[0], m = s.dims.meterRows;
ok(s.grid[m][1].chips.filter((ch) => !ch.resist).map((ch) => ch.value).join() === '5,5,2' && s.grid[m + 2][4].chips.some((ch) => ch.value === 1 && !ch.resist), 'it deploys space by space');
ok(s.grid.flat().some((cell) => cell.chips.some((ch) => ch.resist === 'reducer')), 'and the shop chips go in around it');
ok(B.worth(s) === 13 + 1, 'the position is worth the painted chips (plus the 1¢ Reducer)');
run.purse = 10; { const F = R.validLayout(run, dims);
  ok(F && F.map((sp) => sp.chips.join('+')).join(' ') === '5 1' && R.layoutWorth(F) === 6, 'a layout the purse cannot cover is built from the bottom up while it can be afforded'); }
run.purse = 4; ok(R.validLayout(run, dims) === null, 'and dropped when not even its first chip can be');
run.purse = 300; run.plan.layout = [{ r: 0, c: 0, chips: Array(dims.stackMax + 1).fill(1) }, { r: dims.barRows, c: 0, chips: [1] }]; ok(R.validLayout(run, dims)?.map((sp) => sp.chips.length).join() === String(dims.stackMax), 'a stack taller than the position is cut to fit, and a row outside it left out');
if (fails.length) { console.log('FAIL ' + fails.join('\nFAIL ')); process.exit(1); }
console.log('ok, painted positions: counts, deployment, shop chips and limits');
