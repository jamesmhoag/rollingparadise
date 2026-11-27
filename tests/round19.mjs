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
if (fails.length) { console.log('FAIL ' + fails.join('\nFAIL ')); process.exit(1); }
console.log('ok, round 19: stacked tricks bid and split, zero and Debt bids, tapped tricks brought back with a base effect');
