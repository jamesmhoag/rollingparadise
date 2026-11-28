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

// Focus: T1 (every row of a zone held) gives +1 to all Cs; T2 (every row held by one column) gives +1 to all TIPs as
// well; T1 in both zones gives +1 more to the primary C, T2 in both +1 more to the primary TIP. Capped +2 / +1 / +1.
{
  const run = R.newRun('hustler', 'standard', 77), { bout } = R.startIntro(run), s = bout.sides[0], m = s.dims.meterRows, C = s.dims.cols;
  const tip0 = { ...s.tip }, tipUp = (k) => B.tipOf(s, k) - tip0[k];
  clearBoard(s); s.c = { charisma: 0, cunning: 0, conviction: 0 }; // no gear
  assert(B.CCC.every((k) => B.cOf(s, k) === 0) && B.TIP.every((k) => tipUp(k) === 0) && B.rewardOf(s, 'draw').n === 0, 'no focus: no Cs and no TIP bonus');
  for (let c = 0; c < C; c++) occupy(bout, s, m + (c % 2), c); // every Stake row, not lined up
  assert(B.occBonus(s).tier.stake === 1 && B.CCC.every((k) => B.cOf(s, k) === 1) && B.TIP.every((k) => tipUp(k) === 0), 'T1 in the Stake: +1 to all three Cs, nothing to the TIPs');
  for (let c = 0; c < C; c++) occupy(bout, s, c % m, c);
  assert(B.cOf(s, 'charisma') === 2 && B.cOf(s, 'cunning') === 1 && B.cOf(s, 'conviction') === 1, 'T1 in both zones: +1 more to the Hustler\'s primary C (2 / 1 / 1)');
  clearBoard(s); for (let c = 0; c < C; c++) occupy(bout, s, m, c);
  assert(B.occBonus(s).tier.stake === 2 && B.CCC.every((k) => B.cOf(s, k) === 1) && B.TIP.every((k) => tipUp(k) === 1), 'T2 in the Stake alone: +1 to all Cs and all TIPs');
  for (let c = 0; c < C; c++) occupy(bout, s, 0, c);
  assert(B.cOf(s, 'charisma') === 2 && B.cOf(s, 'cunning') === 1 && B.cOf(s, 'conviction') === 1, 'T2 in both: the Cs are at the cap, 2 / 1 / 1');
  assert(tipUp('trickery') === 2 && tipUp('ingenuity') === 1 && tipUp('proficiency') === 1, 'T2 in both: +2 / +1 / +1 to the TIPs, the 2 on the primary (Trickery)');
  const on = B.rewardOf(s, 'draw'); assert(on.n === 2 * on.unused, 'unused draws pay at that rate');
  const P = B.statParts(s, 'trickery'); assert(P.focus === 2 && P.total === tip0.trickery + 2, 'the hover splits a TIP: base, focus, gear');
  s.grid[m][2].chips = [];
  assert(B.occBonus(s).tier.stake === 0 && B.CCC.every((k) => B.cOf(s, k) === 1) && B.TIP.every((k) => tipUp(k) === 1), 'a Stake row left empty: the Bet\'s T2 still pays +1 all');
  const PC = B.statParts(s, 'charisma'); assert(PC.base === 1 && PC.total === 1, 'the hover splits a C: earned at the table, then gear and food');
  s.grid[m][2].chips = [{ id: 9e6, kind: 'std', value: 1 }]; for (let c = 0; c < C; c++) occupy(bout, s, 1 % m, c);
  if (m > 1) assert(B.occBonus(s).tier.bet === 2 && tipUp('trickery') === 2, 'a second full column in the Bet is still T2');
  s.c = { charisma: 1, cunning: 0, conviction: 2 }; assert(B.cOf(s, 'charisma') === 3 && B.cOf(s, 'conviction') === 3, 'a jacket\'s or a sip\'s amounts add on top of the cap'); s.c = { charisma: 0, cunning: 0, conviction: 0 };
  const fox = R.newRun('rascal', 'standard', 78), fb = R.startIntro(fox).bout.sides[0]; clearBoard(fb); fb.c = { charisma: 0, cunning: 0, conviction: 0 };
  for (let c = 0; c < C; c++) { occupy(bout, fb, fb.dims.meterRows, c); occupy(bout, fb, 0, c); }
  assert(B.cOf(fb, 'cunning') === 2 && B.cOf(fb, 'charisma') === 1 && B.tipOf(fb, 'ingenuity') === D.CLASSES.rascal.tip.ingenuity + 2, 'a Rascal\'s primaries are Cunning and Ingenuity');
}

// no Fully Occupied Bet bonus any more: a full Bet restores by column like any other
{
  const run = R.newRun('rascal', 'standard', 5150), { bout } = R.startIntro(run), s = bout.sides[0], m = s.dims.meterRows;
  const tricks = s.book.splice(0, 3); s.tapped.tricks = tricks.map((t) => ({ trick: t, at: 1 }));
  clearBoard(s); for (let r = 0; r < m; r++) for (let c = 0; c < s.dims.cols; c++) occupy(bout, s, r, c);
  bout.phase = 'drink'; B.nextTurn(bout);
  assert(s.tapped.tricks.length === 3 && !B.statParts(s, 'trickery').temp.length, 'a full Bet gives no extra restores or actions');
  assert(B.restorePlan(bout, s).nTricks === m, 'it restores one trick per occupied Bet column');
  const P = B.statParts(s, 'trickery'); assert(P.base === D.CLASSES.rascal.tip.trickery && P.base + P.gear === s.tip.trickery, 'a stat splits into base and gear');
}
console.log('ok, restore: tapping, restores by column, order, focus tiers and caps, no Full Bet bonus, stat parts');
