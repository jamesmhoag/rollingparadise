// Automated Roller. Plans a turn through the same API the player uses.
import { TRICKS } from './data.js';
import * as B from './bout.js';

function cheapestBidSpot(s) {
  let best = null;
  for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.dims.cols; c++) {
    const ch = B.bidChip(s, r, c); if (!ch) continue;
    const score = ch.value * 100 - (ch.kind === 'opp' ? 50 : 0) - r;
    if (!best || score < best.score) best = { r, c, ch, score };
  }
  return best;
}

export function evalTarget(b, s, e, tgt) {
  const def = TRICKS[e.trick.id], t = b.sides[tgt.side];
  const cells = B.affected(b, t, def, tgt, e.dice.length);
  const total = Math.max(1, B.previewTotal(s, e));
  if (def.type === 'expense') {
    const live = cells.filter(({ r, c }) => B.occupied(t.grid[r][c])); if (!live.length) return -1;
    const share = def.tax ? 99 : total / live.length; let v = 0;
    for (const { r, c } of live) { const cell = t.grid[r][c]; const w = Math.max(0, B.cellWorth(cell)); const shields = cell.chips.filter(B.isShield).length;
      v += def.tax ? w : Math.min(share, w + shields * 0.4) - (cell.hard > 0 ? share * 0.6 : 0); }
    return v;
  }
  if (def.approach === 'meter') { let col = 0; for (let r = 0; r < t.rows; r++) col += Math.max(0, B.cellWorth(t.grid[r][tgt.c])); return col - tgt.r * 3; }
  let v = 0; for (const { r, c } of cells) v += Math.max(0, B.cellWorth(t.grid[r][c])); return v + tgt.r * 0.1;
}
export function bestTarget(b, s, e) {
  const valid = B.validTargets(b, s, e); let best = null, bv = -Infinity;
  for (const tgt of valid) { const v = evalTarget(b, s, e, tgt) + b.rng.next() * 0.5; if (v > bv) { bv = v; best = tgt; } }
  return best;
}

export function planTurn(b, s) {
  const o = b.sides[1 - s.idx], rng = b.rng;
  if (s.drink && s.drink.sips > 0 && rng.chance(0.6)) B.sip(b, s);
  const chips = s.grid.flat().flatMap((cell) => cell.chips);
  const debts = chips.filter(B.isHazard).length, mine = b.stage.paid[s.idx];
  const oppShields = o.grid.slice(0, o.dims.meterRows).flat().flatMap((cell) => cell.chips).filter((ch) => B.isShield(ch) || ch.kind === 'opp').length;
  const score = (t) => {
    const d = TRICKS[t.id]; let v = { expense: 3, insurance: 1.5, investment: 1.3, correction: 0.6 }[d.type];
    if (d.roll.k === 'settle' || d.roll.k === 'fence') v += debts * 0.5;
    if (d.roll.k === 'gather') v += mine > 4 ? 1.6 : -1;
    if (d.roll.k === 'sweep') v += oppShields * 0.35;
    if (d.roll.k === 'scatter') v += 1;
    if (d.type === 'insurance' && b.turn <= 2) v += 0.8;
    if (d.type === 'investment' && !s.run.some((e) => TRICKS[e.trick.id].type === 'expense') && !s.book.some((x) => TRICKS[x.id].type === 'expense')) v -= 1;
    return v + rng.next() * 1.2;
  };
  // draw
  const shown = s.run.filter((e) => e.state === 'shown').length;
  const want = Math.max(0, Math.min(B.tipOf(s, 'trickery') - s.used.draw, 3 - shown));
  for (const t of s.book.slice().sort((x, y) => score(y) - score(x)).slice(0, want)) B.draw(b, s, t.uid);
  // roll: every die is rolled out first, then the values are put where they do the most
  const prio = (e) => TRICKS[e.trick.id].type === 'expense' ? 0 : 1;
  const open = s.run.filter((e) => e.state === 'shown').sort((x, y) => prio(x) - prio(y) || y.dice.length - x.dice.length);
  if (open.length) {
    const wanted = open.map((e) => e.dice.find((d) => !d.chip)?.type || TRICKS[e.trick.id].die);
    const rank = (d) => { const k = wanted.indexOf(d.type); return k < 0 ? 99 - +d.type.slice(1) / 100 : k; };
    const room = open.reduce((n, e) => n + TRICKS[e.trick.id].count - e.dice.length, 0);
    for (let n = 0; n < room; n++) { const die = s.pouch.slice().sort((x, y) => rank(x) - rank(y))[0]; if (!die || !B.rollOut(b, s, die.id)) break; }
    for (const e of open) {
      const def = TRICKS[e.trick.id], space = def.count - e.dice.length, tray = s.tray.slice(0, 8);
      if (space <= 0 || !tray.length) continue;
      let best = null, bv = 0;
      for (let mask = 1; mask < 1 << tray.length; mask++) {
        const pick = tray.filter((_, k) => mask >> k & 1); if (pick.length > space) continue;
        const type = e.dice.find((d) => !d.chip)?.type || pick[0].type; if (pick.some((d) => d.type !== type)) continue;
        const trial = { ...e, dice: [...e.dice, ...pick] };
        const v = B.previewTotal(s, trial) + (B.bonusMet(s, trial) ? 4 : 0) + pick.length * 0.01;
        if (v > bv) { bv = v; best = pick; }
      }
      if (best) for (const d of best) B.place(b, s, d.id, e);
    }
  }
  // bid
  const ready = s.run.filter((e) => e.state === 'shown').sort((x, y) => (y.dice.length ? 1 : 0) - (x.dice.length ? 1 : 0) || prio(x) - prio(y));
  for (const e of ready) {
    const def = TRICKS[e.trick.id];
    if (s.used.bid >= B.tipOf(s, 'ingenuity')) break;
    if (!e.dice.length && !rng.chance(0.2)) continue;
    if (e.dice.length && e.dice.length < def.count && s.pouch.some((d) => d.type === e.dice[0].type) && rng.chance(0.35)) continue; // keep loading dice
    const spot = cheapestBidSpot(s); if (!spot) break;
    if (B.worth(s) - spot.ch.value <= 1) break;
    if (spot.ch.value > 2 && rng.chance(0.6)) continue; // a big chip would linger for a long time
    B.bid(b, s, e, spot.r, spot.c);
    if (B.needsTarget(e)) { const tgt = bestTarget(b, s, e); if (tgt) e.target = tgt; }
  }
  s.ready = true;
}
