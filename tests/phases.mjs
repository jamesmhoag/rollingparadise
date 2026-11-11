// The phased turn (draw, roll, bid), hidden same-phase moves, and Debt: one marker per stack, settled
// chip by chip, overkill down the lane, and a forecast that matches what the House actually does.
import * as R from '../js/run.js'; import * as B from '../js/bout.js'; import * as D from '../js/data.js';
import { planPhase, seen, autoTurn } from '../js/ai.js';
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exit(1); } };

for (let seed = 1; seed <= 25; seed++) {
  const run = R.newRun(['hustler', 'rascal', 'technician'][seed % 3], 'standard', seed * 31), { bout } = R.startIntro(run);
  const [me, opp] = bout.sides;
  // Draw
  assert(bout.phase === 'draw', 'a turn opens on Draw');
  assert(B.canThrow(bout, me, [me.pouch[0].id]), 'no rolling while drawing');
  assert(!B.advance(bout) && B.needOf(bout, me), 'a draw is required before rolling');
  const e = B.draw(bout, me, me.book[0].uid);
  planPhase(bout, opp); const theirDraws = opp.run.length;
  assert(seen(bout, me).sides[1].run.length === opp.pub.run.length && opp.pub.run.length < theirDraws + 1, 'their same-phase draws are not in what you may see');
  assert(B.advance(bout) && bout.phase === 'roll', 'Draw closes for both');
  assert(B.canDraw(bout, me, me.book[0]?.uid), 'rolling ends drawing');
  // Roll: one throw, then place
  assert(B.needOf(bout, me), 'a roll is required before bidding');
  const n = B.tipOf(me, 'proficiency');
  assert(B.canThrow(bout, me, me.pouch.slice(0, n + 1).map((d) => d.id)) || me.pouch.length <= n, 'a throw is capped by Proficiency');
  const thrown = B.throwDice(bout, me, me.pouch.slice(0, Math.min(n, 2)).map((d) => d.id));
  assert(thrown && me.thrown && me.tray.length === thrown.length, 'every picked die lands in the roll together');
  assert(B.needOf(bout, me) && !B.advance(bout), 'a rolled die must go on a trick');
  assert(!B.place(bout, me, me.tray[0].id, e) === false, 'a die goes on a shown trick');
  planPhase(bout, opp);
  assert(B.advance(bout) && bout.phase === 'bid', 'Roll closes for both');
  assert(!me.tray.length, 'dice left in the roll go back when rolling closes');
  assert(B.canPlace(bout, me, e.dice[0].id, e), 'bidding ends moving dice');
  // Bid: more than one chip on the same trick
  assert(B.needOf(bout, me), 'a bid is required before playing');
  const spots = B.biddable(me);
  B.bid(bout, me, e, spots[0].r, spots[0].c);
  const again = B.biddable(me)[0];
  if (again && B.tipOf(me, 'ingenuity') > 1) { assert(B.bid(bout, me, e, again.r, again.c) && e.bid.length === 2, 'a trick that has a bid can take another'); }
  B.resetPlan(bout, me); assert(!me.used.bid && me.run.find((x) => x.uid === e.uid).state === 'shown', 'undo in Bid takes back only the bids');
  const e3 = me.run.find((x) => x.uid === e.uid), s3 = B.biddable(me)[0]; B.bid(bout, me, e3, s3.r, s3.c);
  planPhase(bout, opp); assert(B.advance(bout) && bout.phase === 'resolve', 'Bid closes and the House plays');
  for (const _ of B.resolve(bout)); // eslint-disable-line no-unused-vars
  assert(bout.over || bout.phase === 'draw', 'the next turn opens on Draw');
  let guard = 0; while (!bout.over && guard++ < 50) { autoTurn(bout); for (const _ of B.resolve(bout)); } // eslint-disable-line no-unused-vars
  assert(bout.over, 'bouts still finish');
}

// ---------- Debt ----------
const { engage, settleAll, setDebt } = B._test;
const fresh = (seed) => { const { bout } = R.startIntro(R.newRun('hustler', 'standard', seed)); bout.sides[1].grid.forEach((row) => row.forEach((cell) => { cell.chips = []; cell.hard = 0; })); return bout; };
const std = (bout, v) => ({ id: bout.nextId++, kind: 'std', value: v });
const settle = (bout) => { for (const _ of settleAll(bout, 'expense')); }; // eslint-disable-line no-unused-vars

{ // the worked example in docs/DESIGN.md
  const bout = fresh(1), [me, opp] = bout.sides, m = opp.dims.meterRows;
  const front = opp.grid[m][0], back = opp.grid[m + 1][0];
  front.chips = [std(bout, 5), std(bout, 5), std(bout, 1)]; back.chips = [std(bout, 2), std(bout, 2), std(bout, 2)];
  engage(bout, me, opp, m, 0, 14, {}); settle(bout);
  assert(!front.chips.length && bout.stage.paid[1] === 13, '14¢ on 5,5,1 pays all three chips (11¢), and 2¢ more behind');
  assert(B.debtOf(back) === 1 && back.chips.filter((c) => c.kind === 'std').length === 2, 'the 3¢ overkill goes to the stack behind: one 2¢ chip paid, 1¢ stays as Debt');
  assert(back.chips.filter((c) => c.kind === 'debt').length === 1, 'a stack shows one Debt marker with the exact amount');
  engage(bout, me, opp, m + 1, 0, 1, {}); settle(bout);
  assert(!B.debtOf(back) && back.chips.length === 1 && bout.stage.paid[1] === 15, 'a later 1¢ fee tops the Debt up to 2¢ and the next chip is paid');
  const side = opp.grid[m][1]; side.chips = [std(bout, 1)];
  engage(bout, me, opp, m, 1, 6, {}); settle(bout);
  assert(!opp.grid[m][2].chips.length && !opp.grid[m][0].chips.length, 'overkill never moves sideways');
  const cell = opp.grid[m][3]; cell.chips = [std(bout, 1)]; setDebt(bout, cell, 7); setDebt(bout, cell, 3);
  assert(cell.chips.filter((c) => c.kind === 'debt').length === 1 && B.debtOf(cell) === 3, 'setting Debt keeps one marker');
}

// the forecast is exactly what the House does
const fees = Object.entries(D.TRICKS).filter(([, d]) => d.roll.k === 'fee' && d.dist !== 'rain' && d.side === 'opp').map(([id]) => id);
let checked = 0;
for (let seed = 1; seed <= 200; seed++) {
  const { bout } = R.startIntro(R.newRun('technician', 'standard', seed)), [me, opp] = bout.sides;
  for (const { cell } of opp.grid.flat().map((cell) => ({ cell }))) if (cell.chips.length && bout.rng.chance(0.3)) setDebt(bout, cell, bout.rng.range(1, 4));
  if (seed % 3 === 0) opp.grid[0][bout.rng.int(opp.dims.cols)].chips.push({ id: bout.nextId++, kind: 'block', value: 0 });
  const id = fees[seed % fees.length], def = D.TRICKS[id];
  const e = { uid: 9999, trick: { id, q: 1 + (seed % 3), up: 0, uid: 9999 }, dice: Array.from({ length: 1 + (seed % def.count) }, (_, i) => ({ id: 'x' + i, type: def.die, value: 1 + ((seed * (i + 3)) % 12), t: 1, up: [] })), bid: [], bidValue: 1, state: 'play', lingerLeft: 0, lingerTotal: 0, target: null };
  const origin = B.validTargets(bout, me, e)[0]; if (!origin) continue;
  const fc = B.forecastFee(bout, me, e, origin), plan = B.feePlan(bout, me, e, origin);
  if (!fc || plan.shares.some(() => false)) continue;
  const before = new Map(opp.grid.flat().flatMap((cell) => cell.chips).map((ch) => [ch.id, ch]));
  for (const { r, c, amt } of plan.shares) engage(bout, me, opp, r, c, amt, { pierce: plan.pierce }); settle(bout);
  const after = new Set(opp.grid.flat().flatMap((cell) => cell.chips).map((ch) => ch.id));
  const paidReal = [...before.values()].filter((ch) => B.isPayable(ch) && !after.has(ch.id)).reduce((n, ch) => n + ch.value, 0);
  const paidFc = fc.reduce((n, x) => n + x.paid, 0);
  assert(paidReal === paidFc, `forecast paid ${paidFc}¢, House took ${paidReal}¢ (${id}, seed ${seed})`);
  for (const x of fc) assert(B.debtOf(opp.grid[x.r][x.c]) === x.owed, `forecast Debt on ${x.r},${x.c} is ${x.owed}, real ${B.debtOf(opp.grid[x.r][x.c])} (${id}, seed ${seed})`);
  checked++;
}
assert(checked > 100, 'enough forecasts checked');
console.log(`ok, phases and debt (${checked} forecasts matched the House)`);
