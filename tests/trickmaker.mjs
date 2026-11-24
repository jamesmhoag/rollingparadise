// The trick maker: made tricks (roll.k 'chips') convert, place, deploy and take their Bonus as configured.
import * as R from '../js/run.js'; import * as B from '../js/bout.js'; import * as D from '../js/data.js';
import * as M from '../js/trickmaker.js';
import { NEW_TRICK } from '../js/content/trickmaker.js';

const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const drain = (g) => { for (const _ of g); }; // eslint-disable-line no-unused-vars
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);

// ---------- the pure rules ----------
eq(M.instances('lump', [3, 4], 7), [7], 'lump sum: one instance');
eq(M.instances('precise', [3, 4], 7), [3, 4], 'precise change: one per die');
eq(M.instances('precise', [3, 4], 14), [6, 8], 'precise change carries multipliers');
eq(M.instances('petty', [3, 4], 7).length, 7, 'petty cash: one per point');
eq(M.deployOrder(5, 5, { r: 1, c: 2 }, 'line'), [{ r: 1, c: 2 }, { r: 2, c: 2 }, { r: 3, c: 2 }, { r: 4, c: 2 }], 'a line runs back');
eq(M.deployOrder(5, 5, { r: 2, c: 2 }, 'left').map((x) => x.c), [2, 1, 0], 'left runs along the row');
eq(M.deployOrder(5, 5, { r: 2, c: 2 }, 'sides').map((x) => x.c), [2, 1, 3, 0, 4], 'sides alternate');
ok(M.deployOrder(5, 5, { r: 2, c: 2 }, 'spiral').length === 25 && M.deployOrder(5, 5, { r: 2, c: 2 }, 'spiral').slice(1, 9).every((x) => Math.abs(x.r - 2) <= 1 && Math.abs(x.c - 2) <= 1), 'a spiral covers the first ring before the next');
eq([M.placeIndex('over', 0, 3), M.placeIndex('under', 0, 3), M.placeIndex('precise', 1, 3)], [3, 0, 1], 'over, under and precise placement');
ok(/fee equal to the total/.test(M.describeRoll(NEW_TRICK)) && /doubled/.test(M.describeBonus(NEW_TRICK)), 'the card text is worked out from the configuration');

// ---------- in a bout ----------
function table(seed = 9) {
  const run = R.newRun('technician', 'standard', seed); R.enterFloor(run, 4); run.purse = 5000;
  const { bout } = R.startTable(run, R.newPrep(run, 'table', 0));
  return { bout, me: bout.sides[0], opp: bout.sides[1] };
}
const made = (id, over) => { D.TRICKS[id] = JSON.parse(JSON.stringify({ ...NEW_TRICK, ...over, roll: { ...NEW_TRICK.roll, ...over.roll }, bonus: { ...NEW_TRICK.bonus, ...over.bonus } })); D.refreshDerived(); return id; };
const entry = (id, dice, tgt, bid = 1) => ({ uid: 77, trick: { id, q: 1 }, dice: dice.map((v) => ({ value: v, type: 'd6' })), bid: [], bidValue: bid, paid: [bid], lingerTotal: 0, lingerLeft: 0, state: 'play', target: tgt });
const playIt = (bout, s, e) => { s.run.push(e); s.fz = { ...s.mods }; drain(B._test.play(bout, s, e)); };
const total = (s) => s.grid.flat().reduce((n, cell) => n + cell.chips.length, 0);
const kind = (s, k) => s.grid.flat().reduce((n, cell) => n + cell.chips.filter((ch) => ch.kind === k).length, 0);
const emptyOf = (s) => s.grid.flatMap((row, r) => row.map((cell, c) => ({ r, c, cell }))).find((x) => !x.cell.hole && !x.cell.chips.length && x.r >= s.dims.meterRows);
const fullOf = (s) => { const x = s.grid.flatMap((row, r) => row.map((cell, c) => ({ r, c, cell }))).find((y) => y.r >= s.dims.meterRows && y.cell.chips.filter((ch) => ch.kind === 'std').length >= 2); for (const cell of s.grid[x.r]) cell.chips = cell.chips.filter((ch) => ch.kind === 'std').slice(0, 1); return x; }; // a row of one-chip stacks, with room
{ // petty cash Block chips over your own stack, spread to the sides
  const { bout, me } = table(), x = fullOf(me), before = kind(me, 'block');
  const id = made('t_blocks', { type: 'insurance', side: 'self', approach: 'any', roll: { chip: 'block', convert: 'petty', deploy: 'sides' }, bonus: { cond: 'over:99', k: 'double' } });
  playIt(bout, me, entry(id, [1, 2], { side: 0, r: x.r, c: x.c }));
  ok(kind(me, 'block') - before >= 3 && kind(me, 'block') - before <= 4, `petty cash makes a chip per point (made ${kind(me, 'block') - before})`); // +1 from the Insurance trait
}
{ // value chips placed under the stack
  const { bout, me } = table(), x = fullOf(me), top = x.cell.chips[x.cell.chips.length - 1];
  const id = made('t_under', { type: 'investment', side: 'self', approach: 'any', roll: { chip: 'std', convert: 'lump', place: 'under', deploy: 'hit' }, bonus: { cond: 'over:99' } });
  playIt(bout, me, entry(id, [3, 3], { side: 0, r: x.r, c: x.c }));
  ok(x.cell.chips[0].kind === 'std' && x.cell.chips[0].value >= 6 && x.cell.chips[0] !== top && x.cell.chips[x.cell.chips.length - 1] === top, 'Under puts the made chip at the bottom of the stack');
}
{ // precise fees down a line on the opponent
  const { bout, me, opp } = table(), before = B.worth(opp);
  const col = [...Array(opp.dims.cols).keys()].find((c) => opp.grid.every((row) => row[c].chips.length));
  const id = made('t_line', { side: 'opp', approach: 'front', roll: { chip: 'debt', convert: 'precise', deploy: 'line' }, bonus: { cond: 'over:99' } });
  const e = entry(id, [2, 5], { side: 1, r: B.frontRowOf ? 0 : 0, c: col ?? 0 }); playIt(bout, me, e);
  ok(B.worth(opp) < before, 'fees from a made Expense take Worth');
}
{ // extra chip bonus, and a trick that aims at either side
  const { bout, me, opp } = table(), x = fullOf(me), b0 = kind(me, 'counter');
  const oc = opp.grid.flat().find((cell) => cell.chips.some((ch) => ch.kind === 'std')); oc.chips.splice(oc.chips.findIndex((ch) => ch.kind === 'std'), 1); // room on one of their stacks
  const id = made('t_any', { type: 'insurance', side: 'any', approach: 'any', roll: { chip: 'block', convert: 'lump', deploy: 'hit' }, bonus: { cond: 'match', k: 'extra', chip: 'counter', n: 2 } });
  const e = entry(id, [4, 4], { side: 0, r: x.r, c: x.c });
  ok(B.validTargets(bout, me, e).some((v) => v.side === 0) && B.validTargets(bout, me, e).some((v) => v.side === 1), 'a trick for either side can aim at both positions');
  playIt(bout, me, e); ok(kind(me, 'counter') - b0 === 2, 'the Extra chip bonus makes the second chip');
}
{ // lingering: plays again with the same roll on later turns
  const { bout, me } = table(), x = fullOf(me);
  const id = made('t_linger', { type: 'investment', side: 'self', approach: 'any', roll: { chip: 'std', convert: 'lump', deploy: 'hit' }, bonus: { cond: 'match', k: 'linger', turns: 2 } });
  playIt(bout, me, entry(id, [2, 2], { side: 0, r: x.r, c: x.c }));
  ok(me.echoes.length === 1 && me.echoes[0].left === 2, 'a Lingering bonus sets up two replays');
  bout.turn++; const n0 = total(me), cx = { phase: 'investment', who: 0, uid: null }; me.fz = { ...me.mods }; me.run = me.run.filter((y) => y.trick.id !== id);
  drain(B._test.sidePhase(bout, me, 'investment', cx));
  ok(total(me) > n0 && me.echoes[0].left === 1, 'the trick plays again next turn with its roll');
}
{ // bid multiplier
  const { bout, me } = table(), x = fullOf(me);
  const id = made('t_bid', { type: 'investment', side: 'self', approach: 'any', roll: { chip: 'std', convert: 'lump', place: 'under', deploy: 'hit' }, bonus: { cond: 'match', k: 'bidmult' } });
  playIt(bout, me, entry(id, [1, 1], { side: 0, r: x.r, c: x.c }, 3)); const v = x.cell.chips[0].value;
  const { bout: b2, me: m2 } = table(), y = fullOf(m2), id2 = made('t_bid1', { ...D.TRICKS[id], bonus: { cond: 'over:99', k: 'bidmult' } });
  playIt(b2, m2, entry(id2, [1, 1], { side: 0, r: y.r, c: y.c }, 3));
  ok(v === y.cell.chips[0].value * 3, `the Bid multiplier multiplies the total by the bid (${v} vs ${y.cell.chips[0].value})`);
}
void emptyOf;
if (fails.length) { console.log('FAIL ' + fails.join('\nFAIL ')); process.exit(1); }
console.log('ok, trick maker: conversion, placement, deployment, zones and bonuses');
