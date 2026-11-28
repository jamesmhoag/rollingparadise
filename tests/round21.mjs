// Round 21: your chips are your position; reward chips land on empty spaces first; previews count what will happen.
import * as R from '../js/run.js';
import * as B from '../js/bout.js';
import * as D from '../js/data.js';
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exit(1); } };
const entry = (id, uid) => ({ uid, trick: { uid, id, q: 1 }, dice: [], bid: [], bidValue: 1, target: null, state: 'bid', stack: [] });
const chip = (b, kind, value, extra = {}) => ({ id: b.nextId++, kind, value, ...extra });

// a stack of theirs topped by your Debt is your position: you aim at it, and past it to the stack behind
{
  const run = R.newRun('hustler', 'standard', 21), { bout } = R.startIntro(run), s = bout.sides[0], o = bout.sides[1];
  for (const row of o.grid) for (const cell of row) cell.chips = [];
  o.grid[0][1].chips = [chip(bout, 'std', 2)]; o.grid[1][1].chips = [chip(bout, 'std', 5)];
  bout.phase = 'aim'; const charge = entry('charge', 9001);
  const at = () => B.validTargets(bout, s, charge).filter((x) => x.side === 1 && x.c === 1).map((x) => x.r);
  assert(at().join() === '0', 'a front trick aims at the first stack of the lane');
  o.grid[0][1].chips.push(chip(bout, 'debt', 1, { by: s.idx }));
  assert(at().join() === '0,1', 'with your Debt on top, that stack is yours: you aim at it, or past it to the next');
  o.grid[0][1].chips.pop(); o.grid[0][1].chips.push(chip(bout, 'debt', 1, { by: o.idx }));
  assert(at().join() === '0', 'Debt that is not yours still stands in the way');
  o.grid[0][1].chips.pop();
  // the Debt a fee leaves is the attacker's
  B.setTarget(bout, s, charge, { side: 1, r: 0, c: 1 });
  const top = () => o.grid[0][1].chips.at(-1);
  o.grid[0][1].chips = [chip(bout, 'std', 5)]; charge.dice = [{ id: 1, value: 1 }];
  charge.bidValue = 0; s.held = []; const tot = B.previewTotal(s, charge), fc = B.forecastFee(bout, s, charge, { side: 1, r: 0, c: 1 });
  assert(tot > 0 && tot < 5 && fc && fc[0].owed === tot, `a fee short of the 5¢ chip stays as Debt (${tot})`);
  const bidOnly = { ...charge, dice: [], bidValue: 2 }; assert(B.forecastFee(bout, s, bidOnly, { side: 1, r: 0, c: 1 })?.[0]?.fee === B.previewTotal(s, bidOnly), 'a trick with only a bid on it still forecasts its fee');
  assert(B.ownerOf(o, o.grid[0][1]) === o.idx, 'a stack with no chip of yours on top is theirs');
  // a trick that places chips on your stacks can place them on theirs that you top
  o.grid[0][1].chips.push(chip(bout, 'debt', 1, { by: s.idx }));
  const stir = entry('stir', 9002), aims = B.validTargets(bout, s, stir);
  assert(aims.some((x) => x.side === 1 && x.r === 0 && x.c === 1), 'a stack of theirs your chip tops is yours to place on');
  assert(!aims.some((x) => x.side === 1 && x.r === 1), 'but not their stacks you do not top');
}

// your own stacks: a stack your opponent's chip tops is theirs to lay on top of, not yours; an empty space, or a trick
// that slips its chip under the stack, still can
{
  const run = R.newRun('technician', 'standard', 23), { bout } = R.startIntro(run), s = bout.sides[0], o = bout.sides[1];
  for (const row of s.grid) for (const cell of row) cell.chips = [];
  bout.phase = 'aim';
  s.grid[0][0].chips = [chip(bout, 'std', 3), chip(bout, 'debt', 2, { by: o.idx })]; s.grid[0][1].chips = [chip(bout, 'std', 3)];
  const on = (id) => B.validTargets(bout, s, entry(id, 9100)).filter((x) => x.side === s.idx).map((x) => `${x.r}:${x.c}`);
  const over = on('empower');
  assert(!over.includes('0:0') && over.includes('0:1') && over.includes('0:2'), 'a chip laid on top: not on a stack your opponent tops; yes on your own, and on an empty space');
  assert(on('stir').includes('0:0'), 'a chip slipped under the stack: your opponent topping it does not stop it');
  for (const row of o.grid) for (const cell of row) cell.chips = [];
  o.grid[0][2].chips = [chip(bout, 'std', 2), chip(bout, 'debt', 1, { by: s.idx })];
  const cush = B.validTargets(bout, s, entry('cushion', 9101));
  assert(!cush.some((x) => x.side === o.idx), 'an effect chip (Reducer) never goes on their side, even on a stack you top');
}

// reward chips: a random empty space of the Bet, else the lowest stack with room; Power that will not fit is not counted
{
  const run = R.newRun('rascal', 'standard', 22), { bout } = R.startIntro(run), s = bout.sides[0], m = s.dims.meterRows;
  for (const row of s.grid) for (const cell of row) cell.chips = [];
  const C = s.dims.cols; for (let c = 1; c < C; c++) for (let r = 0; r < m; r++) s.grid[r][c].chips = [chip(bout, 'std', 1)];
  B.addPower(bout, s, 1);
  assert(Array.from({ length: m }, (_, r) => s.grid[r][0].chips.length).every((n) => n > 0) || s.grid.slice(0, m).some((row) => row[0].chips.length), 'the Power chip takes an empty space');
  const empties = () => s.grid.slice(0, m).flat().filter((cell) => !cell.hole && !cell.link && !B.solidCount(cell)).length;
  while (empties()) B.addPower(bout, s, 1);
  const before = s.grid.slice(0, m).flat().map((cell) => B.solidCount(cell)), low = Math.min(...before);
  B.addPower(bout, s, 1); const after = s.grid.slice(0, m).flat().map((cell) => B.solidCount(cell));
  const grew = after.findIndex((n, i) => n !== before[i]); assert(grew >= 0 && before[grew] === low, 'no empty space: the lowest stack takes it');
  s.held = [{ phase: 'roll', unused: 50, turn: bout.turn }];
  assert(B.powerAhead(s) - B.powerOf(s) === Math.min(B.heldAmount(s, 'roll'), B.meterRoom(s)), 'held rolls count as Power only as far as the Bet has room');
}
console.log('ok, round 21: your chips are your position, reward chips fill empty spaces first, Power counted as it will land');
