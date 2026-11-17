// Automated Roller. Plans a turn through the same API the player uses.
import { TRICKS, defOf, DEFAULT_BEHAVE, DICE } from './data.js';
import * as B from './bout.js';

// How this Roller plays (Opponent maker): its roster behaviour, with a High Roller's current phase on top
export const behaveOf = (s) => ({ ...DEFAULT_BEHAVE, ...(s.behave || {}), ...(s.phaseBehave || {}) });
// rabid and cowardly Rollers change temper when their Worth runs low (under half of what they sat down with)
function temperOf(s) { const t = behaveOf(s).temper, low = s.startWorth && B.worth(s) < s.startWorth / 2;
  return t === 'rabid' ? (low ? 'aggressive' : 'passive') : t === 'cowardly' ? (low ? 'passive' : 'aggressive') : t; }
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
  const cells = B.affected(b, t, def, tgt, e.dice.length), aim = behaveOf(s).aim;
  if (aim === 'chips' && t !== s) return cells.reduce((n, { r, c }) => n + t.grid[r][c].chips.length, 0);
  if (aim === 'least' && t !== s) return -cells.reduce((n, { r, c }) => n + Math.max(0, B.cellWorth(t.grid[r][c])) + t.grid[r][c].chips.length, 0);
  const total = Math.max(1, B.previewTotal(s, e));
  if (def.type === 'expense') {
    const live = cells.filter(({ r, c }) => B.occupied(t.grid[r][c])); if (!live.length) return -1;
    const share = def.tax ? 99 : total / live.length; let v = 0;
    for (const { r, c } of live) { const cell = t.grid[r][c]; const w = Math.max(0, B.cellWorth(cell)); const shields = cell.chips.filter(B.isShield).length;
      v += def.tax ? w : Math.min(share, w + shields * 0.4) - (B.hardOf(cell) > 0 ? share * 0.6 : 0); }
    return v;
  }
  if (def.make) { // a maker: as many chips placed as it will make (least waste), on the stacks worth protecting
    const n = def.make.n[0] + Math.floor(total / def.make.n[1]); let v = 0;
    for (const { r, c } of cells) { const cell = t.grid[r][c]; v += Math.min(n, B.capacityLeft(t, cell)) * 10 + (def.type === 'investment' ? 0 : Math.max(0, B.cellWorth(cell)) * 0.2); }
    return v - tgt.r * 0.01;
  }
  if (def.approach === 'meter') { let col = 0; for (let r = 0; r < t.rows; r++) col += Math.max(0, B.cellWorth(t.grid[r][tgt.c])); return col - tgt.r * 3; }
  let v = 0; for (const { r, c } of cells) v += Math.max(0, B.cellWorth(t.grid[r][c])); return v + tgt.r * 0.1;
}
// o.noise false: no random tie-break (the player's default aim, which must not touch the bout's dice)
export function bestTarget(b, s, e, o = {}) {
  const valid = B.validTargets(b, s, e); let best = null, bv = -Infinity;
  for (const tgt of valid) { const v = evalTarget(b, s, e, tgt) + (o.noise === false ? 0 : b.rng.next() * 0.5); if (v > bv) { bv = v; best = tgt; } }
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
// The Bluff: the bids are out; put the rolled dice on tricks (bid ones first), then aim each bid trick at the best
// target as the table stands now.
function planAim(b, s) { placeDice(b, s); const v = seen(b, s); for (const e of s.run) if (e.state === 'bid' && B.needsTarget(e)) { const t = bestTarget(v, s, e); if (t) B.setTarget(b, s, e, t); } }
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
    const bh = behaveOf(s), temper = temperOf(s);
    if (bh.draw === 'random') return rng.next();
    if (bh.draw === d.type) x += 2.5;
    if (bh.draw === 'self' && d.side !== 'opp') x += 1.5; if (bh.draw === 'foe' && d.side === 'opp') x += 1.5;
    if (temper === 'aggressive') x += d.type === 'expense' ? 1.5 : 0; if (temper === 'passive') x += d.type === 'expense' ? -1 : d.type === 'insurance' || d.type === 'investment' ? 1 : 0;
    return x + rng.next() * 1.2;
  };
  const shown = s.run.filter((e) => e.state === 'shown').length;
  const want = Math.max(1, Math.min(B.tipOf(s, 'trickery') - s.used.draw, 3 - shown)); // at least one draw is required
  for (const t of s.book.slice().sort((x, y) => score(y) - score(x)).slice(0, want)) B.draw(b, s, t.uid);
}

// The tricks the roll can feed: room left, and a die type that fits
const room = (e) => e.state !== 'play' && e.dice.length < TRICKS[e.trick.id].count;
const takes = (e, d) => { const t = e.dice.find((x) => !x.chip)?.type || defOf(e.trick).die; return d.chip || t === d.type; };
const behaviourRoll = (s) => behaveOf(s);
function planRoll(b, s) {
  // pick the dice that suit the shown tricks; they are thrown as the Bid opens
  const open = s.run.filter(room).sort((x, y) => prio(x) - prio(y) || y.dice.length - x.dice.length);
  if (!open.length || !B.canThrowAny(s)) return;
  const wanted = open.map((e) => e.dice.find((d) => !d.chip)?.type || defOf(e.trick).die);
  const bh = behaviourRoll(s), faces = (d) => DICE[d.type]?.faces || 6;
  const rank = bh.dice === 'highest' ? (d) => -faces(d) : bh.dice === 'lowest' ? (d) => faces(d) : (d) => { const k = wanted.indexOf(d.type); return k < 0 ? 99 - +d.type.slice(1) / 100 : k; };
  const space = bh.roll === 'partial' ? TRICKS[open[0].trick.id].count - open[0].dice.length : open.reduce((n, e) => n + TRICKS[e.trick.id].count - e.dice.length, 0) - s.tray.length;
  const n = Math.max(1, Math.min(bh.roll === 'all' ? Infinity : space, B.tipOf(s, 'proficiency')));
  let ids = s.pouch.slice().sort((x, y) => rank(x) - rank(y)).slice(0, n).map((d) => d.id);
  if (!ids.some((id) => open.some((e) => takes(e, s.pouch.find((d) => d.id === id))))) { const fit = s.pouch.find((d) => open.some((e) => takes(e, d))); if (fit) ids = [fit.id, ...ids.filter((x) => x !== fit.id)].slice(0, n); }
  let flips = [];
  if (!ids.length) { const f = B.flippable(s).sort((x, y) => x.ch.value - y.ch.value)[0]; if (f) flips = [{ r: f.r, c: f.c }]; } // out of dice: flip a chip
  B.setPick(b, s, ids, flips);
}
// In the Bluff: put the values where they do the most, bid tricks first; every die that fits a trick must go on one
function placeDice(b, s) {
  const fill = () => { for (let guard = 0; guard < 20 && B.trayPlaceable(s); guard++) for (const d of s.tray.slice()) { const e = s.run.filter((x) => !B.canPlace(b, s, d.id, x)).sort((x, y) => (y.state === 'bid') - (x.state === 'bid') || prio(x) - prio(y))[0]; if (e) B.place(b, s, d.id, e); } };
  const bh = behaveOf(s), bonusW = bh.bonus === 'no' ? 0 : 4;
  let open = s.run.filter(room).sort((x, y) => (y.state === 'bid') - (x.state === 'bid') || prio(x) - prio(y));
  if (bh.bluff === 'build') open = open.sort((x, y) => y.dice.length - x.dice.length); // keep loading the trick already started
  if (bh.bluff === 'many') { // a die on each trick first, round the tricks
    for (const e of open) { const d = s.tray.find((x) => !B.canPlace(b, s, x.id, e)); if (d) B.place(b, s, d.id, e); }
  }
  if (bh.bluff === 'big' && open.length) open = [open[0], ...open.slice(1)]; // everything that fits goes on the first trick
  for (const e of open) {
    const def = TRICKS[e.trick.id], space = def.count - e.dice.length, tray = s.tray.slice(0, 8);
    if (space <= 0 || !tray.length) continue;
    let best = null, bv = 0;
    for (let mask = 1; mask < 1 << tray.length; mask++) {
      const pick = tray.filter((_, k) => mask >> k & 1); if (pick.length > space) continue;
      if (pick.some((d) => B.canPlace(b, s, d.id, e))) continue;
      const type = e.dice.find((d) => !d.chip)?.type || pick.find((d) => !d.chip)?.type; if (type && pick.some((d) => !d.chip && d.type !== type)) continue;
      const trial = { ...e, dice: [...e.dice, ...pick] };
      const x = B.previewTotal(s, trial) + (B.bonusMet(s, trial) ? bonusW : 0) + pick.length * (bh.bluff === 'big' || bh.bluff === 'build' ? 2 : 0.01);
      if (x > bv) { bv = x; best = pick; }
    }
    if (best) for (const d of best) B.place(b, s, d.id, e);
  }
  fill();
}

function planBid(b, s) {
  const v = seen(b, s), rng = b.rng;
  const fed = (e) => e.dice.length > 0 || s.tray.some((d) => takes(e, d)); // dice on it, or a die in the roll that fits it
  const ready = s.run.filter((e) => e.state === 'shown').sort((x, y) => fed(y) - fed(x) || prio(x) - prio(y));
  const bh = behaveOf(s);
  for (const e of ready) {
    const def = TRICKS[e.trick.id];
    if (s.used.bid >= B.tipOf(s, 'ingenuity')) break;
    if (bh.bid === 'refund' && s.used.bid >= 1) break; // holds the rest back for Opportunity
    if (bh.bid === 'effect' && fed(e)) { // piles its bids onto its best trick, so it lingers
      while (s.used.bid < B.tipOf(s, 'ingenuity')) { const sp = cheapestBidSpot(s); if (!sp || B.worth(s) - sp.ch.value <= 1 || !B.bid(b, s, e, sp.r, sp.c)) break; }
      break;
    }
    if (!fed(e) && !rng.chance(0.2)) continue;
    if (!s.tray.some((d) => takes(e, d)) && e.dice.length && e.dice.length < def.count && s.pouch.some((d) => d.type === e.dice[0].type) && rng.chance(0.35)) continue; // keep loading dice
    const spot = cheapestBidSpot(s); if (!spot) break;
    if (B.worth(s) - spot.ch.value <= 1) break;
    if (spot.ch.value > 2 && rng.chance(0.6)) continue; // a big chip would linger for a long time
    B.bid(b, s, e, spot.r, spot.c);
  }
  // one bid is required each turn: the cheapest chip on the most useful trick
  if (!s.used.bid && B.canAct(b, s)) {
    const e = s.run.filter((x) => x.state !== 'play').sort((x, y) => fed(y) - fed(x) || prio(x) - prio(y))[0];
    const spot = B.biddable(s).sort((x, y) => x.ch.value - y.ch.value)[0];
    if (e && spot) B.bid(b, s, e, spot.r, spot.c);
  }
}
