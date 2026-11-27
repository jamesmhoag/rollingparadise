// Round 19 rules: bids of any value (zero and Debt), bidding on a tapped trick to bring it back, base effects,
// taking a stack apart.
import * as R from '../js/run.js'; import * as B from '../js/bout.js'; import * as D from '../js/data.js';
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
const drain = (g) => { const out = []; for (const st of g) out.push(st); return out; };
function table(seed = 11) {
  const run = R.newRun('hustler', 'standard', seed); R.enterFloor(run, 1); run.purse = 3000;
  const { bout } = R.startTable(run, R.newPrep(run, 'table', 0)); return { run, bout, me: bout.sides[0], opp: bout.sides[1] };
}
const std = (bout, v) => ({ id: bout.nextId++, kind: 'std', value: v });
const spot = (me) => { for (let r = 0; r < me.rows; r++) for (let c = 0; c < me.dims.cols; c++) if (B.bidChip(me, r, c)) return { r, c }; return null; };
const clear = (me) => { for (const row of me.grid) for (const cell of row) cell.chips = []; };

// ---------- a stacked trick can be bid on, and a stack can be taken apart ----------
{
  const { bout, me } = table();
  const a = me.book.find((t) => t.id === 'charge'), twin = { ...a, uid: 'twin' }; me.book.push(twin);
  me.tip.trickery = 5; const e = B.draw(bout, me, a.uid); ok(B.draw(bout, me, 'twin', e.uid) === e && e.stack.length === 1 && e.trick.uid === 'twin', 'a copy draws onto its twin');
  ok(me.run.length === 1 && me.run[0].uid === a.uid, 'the stack is one entry on the Run, under its first copy\'s uid');
  bout.phase = 'bid'; const s0 = spot(me);
  ok(!B.canBid(bout, me, e, s0.r, s0.c) && B.bid(bout, me, e, s0.r, s0.c) && e.state === 'bid', 'a stacked trick takes a bid');
  B.unbid(bout, me, e, e.bid[0].id);
  ok(!B.canUnstack(bout, me, e.uid), 'a stack that is only shown can be taken apart');
  const n = B.unstack(bout, me, e.uid);
  ok(n && me.run.length === 2 && !e.stack.length && e.trick.uid === a.uid && n.trick.uid === 'twin' && n.uid === 'twin', 'the top copy comes off as its own entry');
  ok(!B.canBid(bout, me, n, s0.r, s0.c) && B.bid(bout, me, n, s0.r, s0.c) && !B.canBid(bout, me, e, ...Object.values(spot(me))), 'each copy can then be bid on its own');
  ok(B.canUnstack(bout, me, e.uid), 'a single trick is not a stack');
}
// ---------- any chip with a value can be bid: zero, and a stack's Debt ----------
{
  const { bout, me } = table(); clear(me);
  me.grid[0][0].chips = [std(bout, 5), { id: bout.nextId++, kind: 'debt', value: 3 }]; me.grid[0][1].chips = [std(bout, 10)];
  const w0 = B.worth(me); ok(w0 === 12, 'Debt counts against Worth');
  const e = B.draw(bout, me, me.book.find((t) => t.id === 'charge').uid); bout.phase = 'bid'; me.tip.ingenuity = 4;
  ok(B.bidChip(me, 0, 0)?.kind === 'debt' && B.bidVal(B.bidChip(me, 0, 0)) === -3, 'a stack\'s Debt marker is its top chip to bid, worth minus its value');
  B.bid(bout, me, e, 0, 0); ok(e.bidValue === -3 && e.state === 'bid' && me.used.bid === 1 && B.debtOf(me.grid[0][0]) === 0 && B.worth(me) === 15, 'bidding it clears the Debt and counts as the turn\'s bid');
  ok(B.previewTotal(me, e) === 0, 'a trick bid below nothing does nothing');
  B.bid(bout, me, e, 0, 1); ok(e.bidValue === 7, 'further bids add up with it');
  B.unbid(bout, me, e, e.bid[0].id); ok(B.debtOf(me.grid[0][0]) === 3 && e.bidValue === 10, 'taken back, the Debt returns to its stack');
  B.bid(bout, me, e, 0, 0); bout.phase = 'resolve';
  const pit0 = B.pitOf(bout, 0).length; drain(B.resolve(bout));
  ok(B.pitOf(bout, 0).filter((x) => x.from === 'bid').length === 1 && B.pitOf(bout, 0).length >= pit0, 'the House keeps the chip; the Debt is simply gone');
  ok(B.isBiddable({ kind: 'made', model: 'fart_chip', value: 0 }) === (D.MADE_CHIPS.fart_chip?.value === 0) && !B.isBiddable({ kind: 'made', model: 'none', value: 0 }), 'a made chip is a bid when its value is set to 0, not when it has none');
}
// ---------- bid on a tapped trick to bring it back; the difference is its base effect ----------
{
  const { bout, me } = table(); clear(me);
  me.grid[me.dims.meterRows][0].chips = [std(bout, 1), std(bout, 2)]; me.grid[me.dims.meterRows][1].chips = [std(bout, 25)]; // the Stake only: no Bet column, so nothing restores tricks
  const t = me.book.splice(me.book.findIndex((x) => x.id === 'charge'), 1)[0]; t.q = 1; me.tapped.tricks.push({ trick: t, at: 1 });
  me.run = []; bout.sides[1].run = []; bout.phase = 'roll'; B.advance(bout, true); me.tip.ingenuity = 2; // the Bid phase opens: Undo returns to here
  ok(B.restorePlan(bout, me).tricks.length === 0 && B.revivable(bout, me).length === 1, 'a tapped trick the restore will not reach can be bid on');
  ok(B.canAct(bout, me, 'bid') && B.needOf(bout, me), 'with nothing on the Run, that is the bid the phase asks for');
  const r0 = me.dims.meterRows; ok(B.reviveCost(t) === 1, 'bringing a quality I trick back takes 1');
  ok(B.revive(bout, me, t.uid, r0, 0)?.value === 2 && me.used.bid === 1 && !B.needOf(bout, me), 'a 2 chip bid on it uses a bid and passes the phase');
  ok(B.canRevive(bout, me, t.uid, r0, 1) && B.restorePlan(bout, me).tricks.includes(t.uid), 'it joins this turn\'s restore, once');
  B.unrevive(bout, me, t.uid); ok(me.used.bid === 0 && me.grid[r0][0].chips.length === 2 && !B.restorePlan(bout, me).tricks.length, 'the bid can be taken back');
  B.revive(bout, me, t.uid, r0, 0); B.resetPlan(bout, me); ok(!(me.revive || []).length && me.grid[r0][0].chips.length === 2, 'Undo takes it back too');
  B.revive(bout, me, t.uid, r0, 0); bout.phase = 'resolve'; drain(B.resolve(bout));
  ok(me.book.some((x) => x.uid === t.uid) && !me.tapped.tricks.length && t.base === 1 && B.pitOf(bout, 0).some((x) => x.from === 'bid' && x.value === 2), 'at the end of the turn it is back in the Book with a base effect of +1; the House has the chip');
  // next turn: a 0-value bid and no roll plays it at its base
  bout.phase = 'draw'; me.used = { draw: 0, roll: 0, bid: 0 }; me.tip.trickery = 3; const e = B.draw(bout, me, t.uid); bout.phase = 'bid'; me.grid[r0][2].chips = [{ id: bout.nextId++, kind: 'opp', value: 0 }];
  B.bid(bout, me, e, r0, 2); ok(e.bidValue === 0 && B.totalParts(me, e).base === 1 && B.previewTotal(me, e) === 1, 'a 0 bid and no roll: the trick plays for its base effect');
  bout.phase = 'resolve'; const steps = drain(B.resolve(bout));
  ok(steps.some((x) => /Charge/.test(x.text)) && !('base' in t), 'it plays, and the base effect is spent');
  // a chip smaller than the quality level brings it back weaker
  const t2 = { ...t, uid: 'weak', q: 2 }; me.tapped.tricks = [{ trick: t2, at: 9 }]; me.revive = []; bout.phase = 'bid'; me.used.bid = 0; for (const row of me.grid.slice(0, me.dims.meterRows)) for (const cell of row) cell.chips = [];
  me.grid[r0][3].chips = [std(bout, 1)]; B.revive(bout, me, 'weak', r0, 3);
  ok(me.revive[0]?.base === -1, 'a 1 chip on a quality II trick: back, at -1');
}
// ---------- pushing and shoving: slides push the stacks in their way; the front edge is the Pit ----------
{
  const { bout, me } = table(); clear(me);
  const col = () => me.grid.map((row) => row[0].chips.map((c) => c.value).join('') || '.').join(' ');
  me.grid[0][0].chips = [std(bout, 1)]; me.grid[1][0].chips = [std(bout, 2), std(bout, 2)]; me.grid[2][0].chips = [std(bout, 3)];
  const last = me.rows - 1;
  ok(B.slidePath(me, 0, 0, 1, 0).line.length === 3 && B.slide(bout, me, 0, 0, 1, 0)?.moved === 3 && col().startsWith('. 1 22 3'), 'a slide pushes the whole line of stacks ahead of it one space');
  for (let r = 0; r < me.rows; r++) me.grid[r][1].chips = [std(bout, 1)];
  ok(!B.canSlide(me, 0, 1, 1, 0) && !B.slide(bout, me, 0, 1, 1, 0) && me.grid[last][1].chips.length === 1, 'nothing is pushed off the back');
  for (let c = 0; c < me.dims.cols; c++) if (!me.grid[last][c].chips.length) me.grid[last][c].chips = [std(bout, 1)];
  ok(!B.canSlide(me, last, 1, 0, -1) && !B.canSlide(me, last, 1, 0, 1), 'or off the top or bottom rows');
  ok(B.canSlide(me, 1, 1, -1, 0) && !B.canSlide(me, 1, 1, -1, 0, { spill: false }), 'the front is the Pit: a slide may push a stack off it, when it is allowed to spill');
  const paid = bout.stage.paid[0], pit = B.pitOf(bout, 0).length, res = B.slide(bout, me, 1, 1, -1, 0);
  ok(res?.spilled === 1 && bout.stage.paid[0] === paid + 1 && B.pitOf(bout, 0).length === pit + 1 && me.grid[0][1].chips.length === 1, 'the stack pushed off the front falls into the Pit, lost as a fee is');
  // lifts and slips
  clear(me); me.grid[1][2].chips = [std(bout, 5), std(bout, 7)]; me.grid[0][2].chips = [std(bout, 1)];
  ok(B.lift(bout, me, { r: 1, c: 2 }, { r: 0, c: 2 }) && me.grid[0][2].chips.map((c) => c.value).join() === '1,7', 'a lift sets the top chip on top of the next stack');
  ok(B.slip(bout, me, { r: 1, c: 2 }, { r: 0, c: 2 }) && me.grid[0][2].chips.map((c) => c.value).join() === '5,1,7' && !me.grid[1][2].chips.length, 'a slip puts it in under the stack');
  me.grid[0][2].chips = Array.from({ length: me.dims.stackMax }, () => std(bout, 1)); me.grid[1][2].chips = [std(bout, 9)];
  ok(!B.canLift(me, { r: 1, c: 2 }, { r: 0, c: 2 }) && !B.lift(bout, me, { r: 1, c: 2 }, { r: 0, c: 2 }) && !B.slip(bout, me, { r: 1, c: 2 }, { r: 0, c: 2 }), 'neither makes a stack taller than its height');
}
// ---------- movement is chip driven: the trick lays a chip, the chip moves the stacks ----------
{
  const play = (id, vals, tgt, setup) => { const T = table(), { bout, me, opp } = T; clear(me); clear(opp); setup(T);
    const e = { uid: 900, trick: { id, q: 1 }, dice: vals.map((v) => ({ value: v, type: 'd6' })), bid: [], bidValue: 1, paid: [1], lingerLeft: 0, state: 'play', target: tgt };
    me.run.push(e); me.fz = { ...me.mods }; drain(B._test.play(bout, me, e)); drain(B._test.madeWork(bout, me, 'correction', true)); drain(B._test.madeWork(bout, opp, 'correction', true)); return T; };
  ok(['retreat', 'advance', 'lift', 'sink', 'renew', 'shove', 'tug', 'hoist', 'tuck'].every((id) => D.TRICKS[id].roll.k === 'chips' && D.MADE_CHIPS[D.TRICKS[id].roll.chip]), 'the movement and Regen tricks each lay a chip that does the work');
  // Shove: their stack slides toward the Pit, a space per 4 rolled; what is pushed off the front is lost to their Pit
  { const { bout, opp } = play('shove', [2, 3], { side: 1, r: 1, c: 0 }, ({ bout: b, opp: o }) => { o.grid[0][0].chips = [std(b, 2)]; o.grid[1][0].chips = [std(b, 5)]; });
    ok(opp.grid[0][0].chips.some((c) => c.value === 5) && !opp.grid[1][0].chips.some((c) => c.kind === 'std') && B.pitOf(bout, 1).some((x) => x.value === 2), 'Shove (6, a space per 4): the stack slides to the front, and the stack that was there goes into their Pit'); }
  // Retreat: Press chips close each row they land in up to the front, and nothing leaves the position
  { const { me } = play('retreat', [1, 2], { side: 0, r: 2, c: 2 }, ({ bout: b, me: m }) => { m.grid[2][2].chips = [std(b, 1)]; m.grid[4][2].chips = [std(b, 2)]; });
    ok(me.grid[0][2].chips.some((c) => c.value === 1) && me.grid[1][2].chips.some((c) => c.value === 2) && B.worth(me) === 3, 'Retreat: the stacks in the row close up to the front'); }
  // Renew: a Mend chip brings your lost chips back out of your Pit
  { const { bout, me } = play('renew', [3, 3], { side: 0, r: 2, c: 1 }, ({ bout: b, me: m }) => { m.grid[2][1].chips = [std(b, 1)]; for (const v of [2, 2, 5]) B._test.toPit(b, 0, std(b, v), 'fee'); b.stage.paid[0] += 9; });
    ok(me.grid[2][1].chips.filter((c) => c.kind === 'std').length >= 2 && bout.stage.paid[0] < 9, 'Renew: the Mend chip pulls chips back out of your Pit onto its stack'); }
}
// ---------- the Pit: columns of stacks either side of a bottomless middle ----------
{
  const { bout } = table(); const P = B.pitDims(bout), cap = B.pitCapacity(bout);
  ok(P.cols === D.TUNING.pit.cols && P.rows === 5 && cap === P.cols * 5 * P.stackMax, 'the Pit is columns × five rows × a stack height, from the tuner');
  for (let k = 0; k < cap; k++) { bout.stage.paid[0] += 1; B._test.toPit(bout, 0, std(bout, 1), 'fee'); }
  const pit = B.pitOf(bout, 0), front = pit.slice(0, 5 * P.stackMax);
  ok(pit.length === cap && front.every((x) => x.col === 0) && pit.slice(5 * P.stackMax).every((x) => x.col === 1), 'lost chips fill the front column first, then the one behind it');
  ok([0, 1, 2, 3, 4].every((row) => pit.filter((x) => x.col === 0 && x.row === row).length === P.stackMax) && B.pitRoom(bout, 0) === 0, 'each row\'s stack fills to the stack height');
  bout.stage.paid[0] += 7; B._test.toPit(bout, 0, std(bout, 7), 'fee');
  ok(B.pitOf(bout, 0).length === cap && B.goneOf(bout, 0).length === 1 && bout.stage.paid[0] === cap && B.summary(bout, 0).gone === 7, 'with no room left a lost chip falls in the middle and is gone for good: it leaves the Stage total');
  ok(B.pitRoom(bout, 1) === cap, 'each Roller has a side of their own');
}
// ---------- the test table's chip tools work on the chip pointed at ----------
{
  const { bout, me } = table(); clear(me); const cell = me.grid[0][0]; cell.chips = [std(bout, 1), std(bout, 2), std(bout, 3)]; const mid = cell.chips[1].id;
  ok(B.sandboxChip(bout, 0, 0, 0, { kind: 'std', value: 9 }, 'add', mid) && cell.chips.map((c) => c.value).join() === '1,9,2,3', 'Add inserts below the chip pointed at');
  ok(B.sandboxChip(bout, 0, 0, 0, null, 'remove', mid) && cell.chips.map((c) => c.value).join() === '1,9,3', 'Remove takes the chip pointed at');
  ok(B.sandboxChip(bout, 0, 0, 0, { kind: 'std', value: 4 }, 'add') && cell.chips[cell.chips.length - 1].value === 4 && B.sandboxChip(bout, 0, 0, 0, null, 'remove') && cell.chips.map((c) => c.value).join() === '1,9,3', 'with no chip pointed at they work on the top of the stack');
}
if (fails.length) { console.log('FAIL ' + fails.join('\nFAIL ')); process.exit(1); }
console.log('ok, round 19: stacked tricks bid and split, zero and Debt bids, tapped tricks brought back, slides lifts and slips, movement by chips, the Pit grid');
