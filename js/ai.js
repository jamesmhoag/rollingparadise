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
      v += def.tax ? w : Math.min(share, w + shields * 0.4) - (B.hardOf(cell) > 0 ? share * 0.6 : 0); }
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

// What this Roller is allowed to know: the other Roller's table as it stood when the current phase opened.
// Whatever they did in this same phase stays hidden until both have locked it in.
export const seen = (b, s) => ({ ...b, sides: b.sides.map((x) => (x === s || !x.pub ? x : { ...x, grid: x.pub.grid, run: x.pub.run })) });

// Act for one Roller in the bout's current phase (draw, roll or bid). Always takes the phase's
// required action when one is possible, so advance() can close the phase.
export function planPhase(b, s) {
  if (b.phase === 'draw') planDraw(b, s);
  else if (b.phase === 'roll') planRoll(b, s);
  else if (b.phase === 'bid') planBid(b, s);
  else if (b.phase === 'aim') planAim(b, s);
}
// The Bluff: the bids are out; aim each bid trick at the best target as the table stands now.
function planAim(b, s) { const v = seen(b, s); for (const e of s.run) if (e.state === 'bid' && B.needsTarget(e)) { const t = bestTarget(v, s, e); if (t) B.setTarget(b, s, e, t); } }
// Both Rollers play one phase, then it closes. Returns the new phase.
export function autoPhase(b) {
  for (const s of b.sides) planPhase(b, s);
  if (!B.advance(b)) throw new Error(`AI could not close the ${b.phase} phase: ${b.sides.map((s) => B.needOf(b, s)).filter(Boolean).join(' / ')}`);
  return b.phase;
}
// Plan a whole turn for both Rollers, phase by phase, ready for resolve().
// The Drink phase: an AI Roller sips its drink if it has one, and eats a food chip on top of one of its stacks.
export function drinkPhase(b, s) {
  if (s.drink && s.drink.sips > 0 && b.rng.chance(0.7)) B.sip(b, s);
  for (let r = 0; r < s.rows && !s.ate; r++) for (let c = 0; c < s.dims.cols && !s.ate; c++) if (!B.canEat(b, s, r, c)) B.eat(b, s, r, c);
}
export function autoTurn(b) {
  if (b.phase === 'drink') { for (const s of b.sides) drinkPhase(b, s); B.nextTurn(b); }
  while (B.PHASES.includes(b.phase)) autoPhase(b);
}

const prio = (e) => (TRICKS[e.trick.id].type === 'expense' ? 0 : 1);

function planDraw(b, s) {
  const v = seen(b, s), o = v.sides[1 - s.idx], rng = b.rng;
  const chips = s.grid.flat().flatMap((cell) => cell.chips);
  const debts = chips.filter(B.isHazard).length, mine = b.stage.paid[s.idx];
  const oppShields = o.grid.slice(0, o.dims.meterRows).flat().flatMap((cell) => cell.chips).filter((ch) => B.isShield(ch) || ch.kind === 'opp').length;
  const score = (t) => {
    const d = TRICKS[t.id]; let x = { expense: 3, insurance: 1.5, investment: 1.3, correction: 0.6 }[d.type];
    if (d.roll.k === 'settle' || d.roll.k === 'fence') x += debts * 0.5;
    if (d.roll.k === 'gather') x += mine > 4 ? 1.6 : -1;
    if (d.roll.k === 'sweep') x += oppShields * 0.35;
    if (d.roll.k === 'scatter') x += 1;
    if (d.type === 'insurance' && b.turn <= 2) x += 0.8;
    if (d.type === 'investment' && !s.run.some((e) => TRICKS[e.trick.id].type === 'expense') && !s.book.some((y) => TRICKS[y.id].type === 'expense')) x -= 1;
    return x + rng.next() * 1.2;
  };
  const shown = s.run.filter((e) => e.state === 'shown').length;
  const want = Math.max(1, Math.min(B.tipOf(s, 'trickery') - s.used.draw, 3 - shown)); // at least one draw is required
  for (const t of s.book.slice().sort((x, y) => score(y) - score(x)).slice(0, want)) B.draw(b, s, t.uid);
}

function planRoll(b, s) {
  // pick the dice that suit the shown tricks, throw them all, then put the values where they do the most
  const open = s.run.filter((e) => e.state === 'shown' && e.dice.length < TRICKS[e.trick.id].count).sort((x, y) => prio(x) - prio(y) || y.dice.length - x.dice.length);
  if (!open.length || !B.canAct(b, s)) return;
  const wanted = open.map((e) => e.dice.find((d) => !d.chip)?.type || TRICKS[e.trick.id].die);
  const rank = (d) => { const k = wanted.indexOf(d.type); return k < 0 ? 99 - +d.type.slice(1) / 100 : k; };
  const room = open.reduce((n, e) => n + TRICKS[e.trick.id].count - e.dice.length, 0);
  const n = Math.min(room, B.tipOf(s, 'proficiency'));
  const ids = s.pouch.slice().sort((x, y) => rank(x) - rank(y)).slice(0, n).map((d) => d.id);
  let flips = [];
  if (!ids.length) { const f = B.flippable(s).sort((x, y) => x.ch.value - y.ch.value)[0]; if (f) flips = [{ r: f.r, c: f.c }]; } // out of dice: flip a chip
  if (!B.throwDice(b, s, ids, flips)) return;
  for (const e of open) {
    const def = TRICKS[e.trick.id], space = def.count - e.dice.length, tray = s.tray.slice(0, 8);
    if (space <= 0 || !tray.length) continue;
    let best = null, bv = 0;
    for (let mask = 1; mask < 1 << tray.length; mask++) {
      const pick = tray.filter((_, k) => mask >> k & 1); if (pick.length > space) continue;
      if (pick.some((d) => B.canPlace(b, s, d.id, e))) continue;
      const type = e.dice.find((d) => !d.chip)?.type || pick.find((d) => !d.chip)?.type; if (type && pick.some((d) => !d.chip && d.type !== type)) continue;
      const trial = { ...e, dice: [...e.dice, ...pick] };
      const x = B.previewTotal(s, trial) + (B.bonusMet(s, trial) ? 4 : 0) + pick.length * 0.01;
      if (x > bv) { bv = x; best = pick; }
    }
    if (best) for (const d of best) B.place(b, s, d.id, e);
  }
  // one rolled die must end up on a trick
  if (!B.placedThisTurn(b, s)) for (const d of s.tray.slice()) { const e = s.run.find((x) => !B.canPlace(b, s, d.id, x)); if (e) { B.place(b, s, d.id, e); break; } }
}

function planBid(b, s) {
  const v = seen(b, s), rng = b.rng;
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
  }
  // one bid is required each turn: the cheapest chip on the most useful trick
  if (!s.used.bid && B.canAct(b, s)) {
    const e = s.run.filter((x) => x.state !== 'play').sort((x, y) => (y.dice.length ? 1 : 0) - (x.dice.length ? 1 : 0) || prio(x) - prio(y))[0];
    const spot = B.biddable(s).sort((x, y) => x.ch.value - y.ch.value)[0];
    if (e && spot) B.bid(b, s, e, spot.r, spot.c);
  }
}
