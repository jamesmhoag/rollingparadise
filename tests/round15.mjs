// Round 15: effect chips made by tricks, the shop split, overload, leftover dice, click-undo, bid hands, tilt pressure.
import * as R from '../js/run.js'; import * as B from '../js/bout.js'; import * as D from '../js/data.js';
import { autoTurn } from '../js/ai.js';
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exit(1); } };
const drain = (g) => { const out = []; for (const st of g) out.push(st); return out; };
const { play, placeFx, addToMeter, chipPhase, engage, settleAll, ticks } = B._test;
const cells = (s) => s.grid.flatMap((row, r) => row.map((cell, c) => ({ r, c, cell })));
function table(seed = 4, cls = 'technician') {
  const run = R.newRun(cls, 'standard', seed); R.enterFloor(run, 2); run.purse = 3000;
  const { bout } = R.startTable(run, R.newPrep(run, 'table', 0)); return { run, bout, me: bout.sides[0], opp: bout.sides[1] };
}
// a stack with chips and room on it (positions start full, so take a chip off one)
function roomy(s) { const x = cells(s).find((y) => B.solidCount(y.cell) >= 2); if (B.capacityLeft(s, x.cell) <= 0) x.cell.chips.pop(); return x; }
const entry = (id, vals, extra = {}) => ({ uid: 'x' + id, trick: { id, q: 1, up: 0 }, dice: vals.map((v, i) => ({ id: `d${id}${i}`, type: D.TRICKS[id].die, value: v, up: [] })), bid: [], bidValue: 1, state: 'play', lingerLeft: 0, lingerTotal: 0, ...extra });

// ---------- every moved chip has a maker, and the shop does not sell it ----------
for (const [id, X] of Object.entries(D.SHOP_CHIPS)) {
  if (X.sold !== false) continue;
  assert(X.from, `${X.name} says what makes it`);
  if (X.from.startsWith('trick:')) { const t = D.TRICKS[X.from.slice(6)]; assert(t, `${X.name}'s trick exists`); if (id !== 'crown') assert(t.make?.chip === id, `${t.name} makes ${X.name}s`); }
  assert(D.madeBy(id), `${X.name} names its maker`);
}
for (const id of D.SHOP_IDS()) assert(!D.makerOf(id), `${D.SHOP_CHIPS[id].name} is sold, so no trick makes it`);

// ---------- a maker trick places physical effect chips that work in their phase ----------
{
  const { bout, me } = table();
  const live = roomy(me);
  const e = entry('empower', [6, 6], { target: { side: 0, r: live.r, c: live.c } });
  const before = live.cell.chips.filter((ch) => ch.resist === 'power').length;
  drain(play(bout, me, e));
  const made = live.cell.chips.filter((ch) => B.isFx(ch) && ch.resist === 'power');
  assert(made.length - before >= 1 && made.every((ch) => ch.maker === 'empower' && ch.life >= 2), 'Empower places Power chips on its target, with a lifetime');
  assert(!made.some((ch) => B.isPayable(ch)) && B.bidChip(me, live.r, live.c)?.kind !== 'fx', 'an effect chip has no worth and cannot be bid');
  me.mods.boost = 0; drain(chipPhase(bout, me, 'investment'));
  assert(me.mods.boost === made.length, 'Power chips add to roll effects in the Investment phase');
  const w0 = B.worth(me); assert(B.summary(bout, 0).resist.power == null && B.worth(me) === w0, 'chips made at the table are not yours to keep after the bout');
  // a fee that reaches an effect chip knocks it off
  const cell = live.cell; cell.chips.splice(0, cell.chips.length, ...cell.chips.filter((ch) => B.isFx(ch)).slice(0, 1), { id: 7e6, kind: 'std', value: 1 });
  engage(bout, bout.sides[1], me, live.r, live.c, 3, {}); drain(settleAll(bout, 'expense'));
  assert(!cell.chips.some(B.isFx), 'a fee that reaches an effect chip knocks it off');
}
{ // effect chips wear off
  const { bout, me } = table(6);
  const x = roomy(me);
  assert(placeFx(bout, me, x.cell, 'reducer', 1, 'cushion'), 'an effect chip goes on a stack with room');
  bout.phase = 'bid'; for (const s of bout.sides) for (const e of s.run) e.state = 'shown';
  drain(B.resolve(bout));
  assert(!x.cell.chips.some((ch) => B.isFx(ch) && ch.resist === 'reducer'), 'a one-turn effect chip is gone after the turn');
}

// ---------- overload: full stacks cannot be aimed at, and Meter overflow is lost like overkill ----------
{
  const { bout, me } = table(7);
  const full = cells(me).find((x) => B.solidCount(x.cell) && B.capacityLeft(me, x.cell) <= 0);
  const e = entry('cushion', [3, 4], { state: 'bid' });
  if (full) assert(!B.validTargets(bout, me, e).some((v) => v.r === full.r && v.c === full.c), 'a full stack cannot be aimed at by a trick that adds chips to it');
  const o0 = me.overflow || 0, n = me.dims.meterRows * me.dims.cols * me.dims.stackMax + 3;
  const left = addToMeter(bout, me, Array.from({ length: n }, (_, k) => ({ id: 6e6 + k, kind: 'block', value: 0 })));
  assert(left.length >= 3 && me.overflow - o0 === left.length, 'what does not fit on the Meter is lost and counted');
  assert(B.validTargets(bout, me, entry('block', [2, 2], { state: 'bid' })).length === 0, 'a full Meter cannot be aimed at');
  const st = drain(play(bout, me, entry('block', [2, 2])));
  assert(st.some((x) => /no room/.test(x.text)), 'the trick still plays and says what was lost');
  assert(B.pressure(bout, me).overkill > 0 && B.pressure(bout, me).fill === 1, 'overflow and a full Meter count toward the House\'s pressure');
}

// ---------- leftover rolled dice stay in the roll and must be used ----------
{
  const { bout, me } = table(8, 'rascal');
  B.draw(bout, me, me.book[0].uid); B.advance(bout, true);
  const e = me.run[0], room = D.TRICKS[e.trick.id].count;
  const fits = me.pouch.filter((d) => d.type === D.TRICKS[e.trick.id].die).slice(0, Math.min(B.tipOf(me, 'proficiency'), room + 1));
  B.throwDice(bout, me, fits.map((d) => d.id));
  assert(B.needOf(bout, me), 'rolled dice must be put on tricks before Roll can close');
  for (const d of me.tray.slice()) if (!B.canPlace(bout, me, d.id, e)) B.place(bout, me, d.id, e);
  assert(!B.needOf(bout, me), 'once nothing in the roll fits a trick, Roll can close');
  const kept = me.tray.map((d) => d.id + ':' + d.value).join();
  B.advance(bout, true); assert(me.tray.map((d) => d.id + ':' + d.value).join() === kept, 'a die with nowhere to go stays in the roll with its value');
}

// ---------- click-undo: undraw and unbid ----------
{
  const { bout, me } = table(9);
  const n0 = me.book.length, uid = me.book[1].uid, e = B.draw(bout, me, uid);
  assert(!B.canUndraw(bout, me, uid) && B.undraw(bout, me, uid) && me.book.length === n0 && me.book[1].uid === uid && me.used.draw === 0, 'a trick drawn this turn goes back to its place in the Book');
  B.draw(bout, me, uid); B.advance(bout, true); assert(B.canUndraw(bout, me, uid), 'only while the Draw phase is open');
  B.advance(bout, true); void e;
  const t = me.run[0], spot = B.biddable(me)[0], w0 = B.worth(me), h0 = me.grid[spot.r][spot.c].chips.length;
  const ch = B.bid(bout, me, t, spot.r, spot.c);
  assert(B.unbid(bout, me, t, ch.id) && me.grid[spot.r][spot.c].chips.length === h0 && B.worth(me) === w0 && me.used.bid === 0 && t.state === 'shown', 'a bid chip clicked goes back to its stack');
}

// ---------- a hand of bid chips goes on a trick at once ----------
{
  const { bout, me } = table(10, 'rascal');
  B.draw(bout, me, me.book[0].uid); B.advance(bout, true); B.advance(bout, true);
  const t = me.run[0], tall = B.biddable(me).find((x) => B.handChips(me, [x, x])) || B.biddable(me)[0];
  const picks = B.handChips(me, [tall, tall]) ? [tall, tall] : [tall];
  const val = B.handChips(me, picks).reduce((n, x) => n + x.ch.value, 0);
  assert(!B.canBidMany(bout, me, t, picks), 'a hand that fits the bids left can be bid');
  const out = B.bidMany(bout, me, t, picks);
  assert(out.length === picks.length && t.bidValue === val && me.used.bid === picks.length, 'the whole hand is bid at once, one bid per chip');
  assert(B.canBidMany(bout, me, t, Array.from({ length: 9 }, () => B.biddable(me)[0])), 'a hand bigger than the bids left is refused');
}

// ---------- the Familiar tilt can set a Hive ----------
{
  let hives = 0;
  for (let seed = 1; seed <= 12 && !hives; seed++) {
    const run = R.newRun('hustler', 'standard', seed); R.enterFloor(run, 2); run.purse = 3000; const prep = R.newPrep(run, 'table', 0); R.setTilt(run, prep, 'familiar', true);
    const { bout } = R.startTable(run, prep); const me = bout.sides[0]; bout.stage.paid[1] = bout.sides[1].startWorth;
    for (let t = 2; t < 14 && !hives; t++) { bout.turn = t; drain(ticks(bout)); hives = cells(me).filter((x) => x.cell.chips.some((ch) => ch.kind === 'hive')).length; }
  }
  assert(hives > 0, 'the Familiar tilt sets a Hive now and then (Hives are not sold)');
}

// ---------- whole bouts still run with the new tricks in the books ----------
for (let seed = 1; seed <= 6; seed++) {
  const run = R.newRun(['hustler', 'rascal', 'technician'][seed % 3], 'standard', seed * 13); R.enterFloor(run, 2); run.purse = 2000;
  run.tricks.push(...['empower', 'cushion', 'attune', 'tinker', 'echo'].map((id, k) => ({ id, q: 1, up: 0, uid: 'm' + seed + k })));
  const { bout } = R.startTable(run, R.newPrep(run, 'table', 0));
  for (let t = 0; t < 40 && !bout.over; t++) { autoTurn(bout); drain(B.resolve(bout)); }
  assert(bout.over || bout.turn > 5, 'a bout with maker tricks plays through');
}
console.log('ok, round 15: effect chips, overload, leftovers, undo, bid hands, pressure');
