// The Puddle is a chip with no thickness at the bottom of its space.
import * as R from '../js/run.js'; import * as B from '../js/bout.js'; import * as D from '../js/data.js';
import { NEW_TRICK } from '../js/content/trickmaker.js';

const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const drain = (g) => { for (const _ of g); }; // eslint-disable-line no-unused-vars
const run = R.newRun('technician', 'standard', 3); R.enterFloor(run, 2); run.purse = 3000;
const { bout } = R.startTable(run, R.newPrep(run, 'table', 0)), me = bout.sides[0], opp = bout.sides[1];
const cells = (s) => s.grid.flatMap((row, r) => row.map((cell, c) => ({ r, c, cell })));

// water on an empty space lays a Puddle chip; nothing can be played there
const empty = cells(me).find((x) => !x.cell.chips.length && !x.cell.hole && !x.cell.link) || (() => { const x = cells(me).find((y) => !y.cell.hole && !y.cell.link); x.cell.chips = []; return x; })();
B._test.water(bout, me, empty);
const p = B.puddleOf(empty.cell);
ok(p && p.kind === 'puddle' && p.id != null && p.value === 0, 'water lays a Puddle chip with an id of its own');
ok(!empty.cell.chips.includes(p) && B.solidCount(empty.cell) === 0, 'the Puddle chip has no thickness: it is not part of the stack height');
ok(B.capacityLeft(me, empty.cell) === 0, 'nothing can be played on a Puddle on an empty space');
B._test.water(bout, me, empty);
ok(B.puddleOf(empty.cell).id === p.id, 'more water keeps the same Puddle chip');

// a stack hit by water stands on a Puddle chip, its chips wet; frozen over, it grounds the Frozen chips above it
const stack = cells(me).find((x) => x !== empty && x.cell.chips.filter((ch) => ch.kind === 'std').length >= 2);
const height = B.solidCount(stack.cell);
B._test.water(bout, me, stack);
ok(B.puddleOf(stack.cell) && B.solidCount(stack.cell) === height, 'a stack stands on its Puddle chip and is no taller');
ok(B.capacityLeft(me, stack.cell) === Math.max(0, me.dims.stackMax - height), 'a stack on a Puddle keeps its room');
B._test.freezeTop(bout, stack.cell);
ok(B.puddleOf(stack.cell).ice && B.grounded(stack.cell), 'frozen over, the Puddle chip grounds the Frozen chips above it');

// a made trick can lay Puddle chips under the stacks it reaches
const id = 't_puddles'; D.TRICKS[id] = JSON.parse(JSON.stringify({ ...NEW_TRICK, type: 'correction', side: 'opp', approach: 'any', roll: { ...NEW_TRICK.roll, chip: 'puddle', convert: 'petty', deploy: 'wave' } })); D.refreshDerived?.();
const t = cells(opp).find((x) => x.r >= opp.dims.meterRows && x.cell.chips.length && !x.cell.puddle);
const e = { uid: 91, trick: { id, q: 1 }, dice: [{ value: 3, type: 'd6' }], bid: [], bidValue: 1, paid: [1], lingerTotal: 0, lingerLeft: 0, state: 'play', target: { side: 1, r: t.r, c: t.c } };
me.run.push(e); me.fz = { ...me.mods }; drain(B._test.play(bout, me, e));
const laid = cells(opp).filter((x) => x.r === t.r && x.cell.puddle).length;
ok(laid >= 2, `a Puddle trick lays Puddle chips along the row (laid ${laid})`);
ok(cells(opp).filter((x) => x.cell.puddle && x.cell.chips.length).every((x) => x.cell.chips.some((ch) => ch.wet > 0) || x.cell.chips.every((ch) => B.isHazard?.(ch))), 'the stacks on them are wet');

if (fails.length) { console.log('FAIL ' + fails.join('\nFAIL ')); process.exit(1); }
console.log('ok, Puddle chips: no thickness, at the bottom, made by water and by tricks');
