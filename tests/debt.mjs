// Debt is a chip with a negative value. It owes; it is paid by the chips it reaches, each worth no more than what
// is still owed (a bigger chip is never broken for change); paid off, it is gone. Plain Debt touches only the chip
// under it. A made chip of negative value is a debt chip under its own name, and reaches as the chip maker says.
import * as R from '../js/run.js'; import * as B from '../js/bout.js'; import * as D from '../js/data.js';
import { makeKind, owesPer } from '../js/trickmaker.js';
import { NEW_CHIP } from '../js/content/chipmaker.js';

const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const drain = (g) => { for (const x of g) void x; };
const std = (v, id) => ({ id, kind: 'std', value: v });
function table() { const run = R.newRun('technician', 'standard', 5); R.enterFloor(run, 3); run.purse = 3000; const { bout } = R.startTable(run, R.newPrep(run, 'table', 0));
  const me = bout.sides[0], opp = bout.sides[1]; for (const row of opp.grid) for (const cell of row) cell.chips = []; return { bout, me, opp, r: opp.dims.meterRows, c: 1 }; }
const debts = (cell) => cell.chips.filter((ch) => ch.kind === 'debt');

{ // plain Debt: the chip under it, whole, and only once it owes as much
  const { bout, me, opp, r, c } = table(), cell = opp.grid[r][c]; cell.chips = [std(1, 9001), std(5, 9002)];
  B._test.engage(bout, me, opp, r, c, 3); ok(B.debtOf(cell) === 3 && !debts(cell)[0].model, 'a fee goes out as a Debt chip');
  drain(B._test.settleAll(bout, 'expense')); ok(B.debtOf(cell) === 3 && cell.chips.some((ch) => ch.id === 9002), '3¢ of Debt on a 5¢ chip takes nothing: no change is made');
  B._test.engage(bout, me, opp, r, c, 2); drain(B._test.settleAll(bout, 'expense'));
  ok(!cell.chips.some((ch) => ch.id === 9002) && B.debtOf(cell) === 0 && !debts(cell).length, 'topped up to 5¢ it takes the chip, and paid off it is gone');
  ok(cell.chips.some((ch) => ch.id === 9001), 'the chip beneath is left');
}
D.MADE_CHIPS._lien = { ...NEW_CHIP, name: 'Lien', value: -2, reach: { to: 'touching', range: 2 } };
D.MADE_CHIPS._tab = { ...NEW_CHIP, name: 'Tab', value: -1 };
try {
  ok(makeKind('_lien') === 'fee' && owesPer('_lien') === 2 && owesPer('debt') === 1, 'a made chip with a negative value is laid as a fee: it owes its value for each point');
  { // its own marker, its own name; with the default reach it is paid exactly as Debt is
    const { bout, me, opp, r, c } = table(), cell = opp.grid[r][c]; cell.chips = [std(5, 9001)];
    B._test.engage(bout, me, opp, r, c, 2); B._test.engage(bout, me, opp, r, c, 2, { model: '_tab' });
    ok(debts(cell).length === 2 && debts(cell).find((ch) => ch.model === '_tab')?.value === 2 && B.debtOf(cell) === 4, 'each name of debt chip is its own marker on the stack');
    drain(B._test.settleAll(bout, 'expense')); ok(B.debtOf(cell) === 4 && cell.chips.some((ch) => ch.id === 9001), 'together they owe 4¢: the 5¢ chip stays');
    B._test.engage(bout, me, opp, r, c, 1, { model: '_tab' }); drain(B._test.settleAll(bout, 'expense')); ok(!cell.chips.length, 'at 5¢ the chip is taken and both are paid off');
  }
  { // a wider reach: any chip it reaches that it can cover, never change from a bigger one; it does not spill down the lane
    const { bout, me, opp, r, c } = table(), cell = opp.grid[r][c], side = opp.grid[r][c + 1], behind = opp.grid[r + 1][c];
    cell.chips = [std(25, 9001)]; side.chips = [std(25, 9002), std(1, 9003), std(5, 9004)]; behind.chips = [std(5, 9005)];
    const paid0 = bout.stage.paid[1]; B._test.engage(bout, me, opp, r, c, 7, { model: '_lien' });
    ok(B.debtOf(cell) === 7 && B.debtOf(behind) === 0, 'what it owes stays with it: its reach does the collecting');
    drain(B._test.settleAll(bout, 'expense'));
    const left = [...cell.chips, ...side.chips, ...behind.chips].filter((ch) => ch.kind === 'std').map((ch) => ch.id).sort().join();
    ok(bout.stage.paid[1] - paid0 === 6 && B.debtOf(cell) === 1, `7¢ owed takes 5¢ and 1¢ from the chips it reaches (paid ${bout.stage.paid[1] - paid0}, owes ${B.debtOf(cell)})`);
    ok(left.includes('9001') && left.includes('9002'), 'the 25¢ chips are not broken for change');
  }
  { // laid by hand it is the same chip
    const { bout, opp, r, c } = table(), cell = opp.grid[r][c]; cell.chips = [std(5, 9001)];
    ok(B.sandboxChip(bout, 1, r, c, { made: '_lien' }) && debts(cell)[0]?.model === '_lien' && debts(cell)[0].value === 2, 'painted on a stack, a made debt chip owes its value');
  }
} finally { delete D.MADE_CHIPS._lien; delete D.MADE_CHIPS._tab; }
if (fails.length) { console.log('FAIL ' + fails.join('\nFAIL ')); process.exit(1); }
console.log('ok, debt: a negative-value chip, paid whole by the chips it reaches, gone when paid off');
