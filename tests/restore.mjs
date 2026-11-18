// Tapping and restoring: used tricks and dice tap, the end of a turn restores one trick per occupied Bet column and
// one die per occupied Stake column (oldest first, then the tie-breakers), Charisma / Cunning / Conviction pay only
// while every Stake row is occupied, and a Fully Occupied Bet restores everything with +1 Draw, Roll and Bid per Bet
// column. Columns are depth lines (engine rows), rows are lanes (engine columns).
import * as R from '../js/run.js'; import * as B from '../js/bout.js'; import * as D from '../js/data.js';
import { autoTurn } from '../js/ai.js';
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exit(1); } };
const play = (bout) => { autoTurn(bout); for (const st of B.resolve(bout)) void st; };
const chip = (bout, v = 1) => ({ id: bout.nextId++, kind: 'std', value: v });
const clearBoard = (s) => { for (const row of s.grid) for (const cell of row) cell.chips = []; };
const occupy = (bout, s, r, c) => { s.grid[r][c].chips.push(chip(bout)); };

// a bout's tricks and dice are all accounted for, whatever is tapped
for (let seed = 1; seed <= 12; seed++) {
  const run = R.newRun(['hustler', 'rascal', 'technician'][seed % 3], 'standard', seed * 97), { bout } = R.startIntro(run);
  const counts = bout.sides.map((s) => ({ t: s.book.length, d: s.pouch.length }));
  let tapped = 0;
  for (let k = 0; k < 8 && !bout.over; k++) {
    play(bout);
    bout.sides.forEach((s, i) => {
      const t = s.book.length + s.run.length + s.tapped.tricks.length, d = s.pouch.length + s.tapped.dice.length + s.tray.filter((x) => !x.chip).length + s.run.reduce((n, e) => n + e.dice.filter((x) => !x.chip).length, 0);
      assert(t === counts[i].t && d === counts[i].d, `seed ${seed}: tricks and dice are kept (${t}/${counts[i].t}, ${d}/${counts[i].d})`);
      tapped += s.tapped.tricks.length + s.tapped.dice.length;
      for (const x of s.tapped.tricks) assert(!s.book.some((t0) => t0.uid === x.trick.uid), 'a tapped trick cannot be drawn');
    });
    if (bout.phase === 'drink') B.nextTurn(bout);
  }
  if (seed === 12) assert(tapped > 0, 'tricks and dice tap after they play');
}

// restore counts follow occupied columns; order is oldest first, then the tie-breakers
{
  const run = R.newRun('rascal', 'standard', 4242), { bout } = R.startIntro(run), s = bout.sides[0], m = s.dims.meterRows;
  const tricks = s.book.splice(0), dice = s.pouch.splice(0);
  s.tapped.tricks = tricks.map((t, i) => ({ trick: t, at: i < 2 ? 1 : 2 })); s.tapped.dice = dice.map((d, i) => ({ die: d, at: i === 0 ? 3 : 1 }));
  clearBoard(s);
  let p = B.restorePlan(bout, s);
  assert(p.nTricks === 0 && p.nDice === 0 && !p.tricks.length && !p.dice.length, 'an empty Bet restores no tricks and an empty Stake no dice');
  occupy(bout, s, 0, 0); occupy(bout, s, 0, 3); // two chips, one Bet column
  if (m > 1) occupy(bout, s, 1, 2); // a second Bet column
  occupy(bout, s, m, 4); // one Stake column
  p = B.restorePlan(bout, s);
  assert(p.nTricks === Math.min(2, m) && p.nDice === 1, `one restore per occupied column (${p.nTricks} tricks, ${p.nDice} dice)`);
  const q = B.tappedInOrder(s);
  assert(q.tricks[0].at === 1 && q.tricks.at(-1).at === 2, 'the trick tapped longest restores first');
  assert(q.dice.at(-1).at === 3, 'the die tapped last restores last');
  assert(p.tricks.every((uid) => q.tricks.slice(0, p.nTricks).some((x) => x.trick.uid === uid)), 'the plan takes from the front of the order');
  // ties: phase the trick belongs to, then worse quality
  const mk = (id, q) => ({ trick: { uid: id + q, id, q }, at: 9 });
  const inv = Object.keys(D.TRICKS).find((k) => D.TRICKS[k].type === 'investment' && !D.TRICKS[k].early), exp = Object.keys(D.TRICKS).find((k) => D.TRICKS[k].type === 'expense' && !D.TRICKS[k].early);
  const t2 = { tapped: { tricks: [mk(exp, 1), mk(inv, 2), mk(inv, 1)], dice: [{ die: { id: 5, type: 'd8' }, at: 9 }, { die: { id: 6, type: 'd4', up: ['boost'] }, at: 9 }, { die: { id: 7, type: 'd4' }, at: 9 }] } };
  const o2 = B.tappedInOrder(t2);
  assert(o2.tricks.map((x) => x.trick.uid).join() === [inv + 1, inv + 2, exp + 1].join(), 'ties go by phase, then worse quality');
  assert(o2.dice.map((x) => x.die.id).join() === '7,6,5', 'ties go small before large, then plain before fancy');
  // the end of the turn restores what the plan said
  const before = s.book.length, beforeD = s.pouch.length;
  bout.phase = 'resolve'; for (const st of B.resolve(bout)) void st;
  assert(s.book.length >= before + Math.min(2, m) - 0 || bout.over, 'the end of the turn restores tricks by Bet column');
  assert(s.pouch.length >= beforeD, 'the end of the turn restores dice by Stake column');
}

// Charisma / Cunning / Conviction pay only while every Stake row (lane) is occupied
{
  const run = R.newRun('hustler', 'standard', 77), { bout } = R.startIntro(run), s = bout.sides[0], m = s.dims.meterRows;
  clearBoard(s); for (let c = 0; c < s.dims.cols; c++) occupy(bout, s, m, c);
  const on = B.rewardOf(s, 'draw');
  assert(!on.gated && on.n === B.cOf(s, 'charisma') * on.unused, 'every Stake row occupied: unused draws pay');
  s.grid[m][2].chips = [];
  const off = B.rewardOf(s, 'draw');
  assert(off.gated && off.n === 0 && off.unused === on.unused, 'a Stake row left empty: no Charisma, Cunning or Conviction rewards');
}

// a Fully Occupied Bet at the end of a turn: next turn restores everything and gives +1 Draw, Roll, Bid per Bet column
{
  const run = R.newRun('rascal', 'standard', 5150), { bout } = R.startIntro(run), s = bout.sides[0], m = s.dims.meterRows;
  const tricks = s.book.splice(0, 3), dice = s.pouch.splice(0, 2);
  s.tapped.tricks = tricks.map((t) => ({ trick: t, at: 1 })); s.tapped.dice = dice.map((d) => ({ die: d, at: 1 }));
  clearBoard(s); for (let r = 0; r < m; r++) for (let c = 0; c < s.dims.cols; c++) occupy(bout, s, r, c);
  for (let r = m; r < s.rows; r++) occupy(bout, s, r, 0);
  assert(B.occupancy(s).full && B.restorePlan(bout, s).fullNext, 'every Bet space occupied is a Fully Occupied Bet');
  const base = { t: s.tip.trickery, p: s.tip.proficiency, i: s.tip.ingenuity };
  s.fullBet = true; bout.phase = 'drink'; B.nextTurn(bout);
  assert(!s.tapped.tricks.length && !s.tapped.dice.length, 'a turn that opens on a Fully Occupied Bet restores everything');
  const P = B.statParts(s, 'trickery');
  assert(P.temp.some((x) => x.from === 'Full Bet' && x.n === m) && B.tipOf(s, 'trickery') >= base.t + m - 1, `+${m} Draw from the Full Bet (one per Bet column)`);
  assert(B.statParts(s, 'proficiency').temp.some((x) => x.from === 'Full Bet') && B.statParts(s, 'ingenuity').temp.some((x) => x.from === 'Full Bet'), '+Roll and +Bid too');
  assert(P.base === D.CLASSES.rascal.tip.trickery && P.base + P.gear === s.tip.trickery, 'a stat splits into base and gear');
  // a Hole in the Bet does not have to be occupied
  s.grid[0][0].chips = []; assert(!B.occupancy(s).full, 'one empty Bet space and the Bet is not full');
  s.grid[0][0].hole = true; assert(B.occupancy(s).full, 'a Hole is not counted');
}
console.log('ok, restore: tapping, restores by column, order, CCC gate on Stake rows, Fully Occupied Bet, stat parts');
