// Bout engine. Pure logic, no DOM. A bout is two Rollers, each with a Position
// (a grid of chip stacks: Meter rows in front, Bar rows behind), a Book of tricks,
// a Pouch of dice and a Run of shown tricks. Both plan a turn, then resolve() plays
// each phase for both Rollers at once and yields a step after each visible change.
// Fees go out as Debt chips first; the House then settles every stack that took Debt.
import { RNG, sum, clone, clamp, order1D } from './util.js';
import { TRICKS, TYPES, DICE, DIST, QMULT, HAZARD_KINDS, CALAMITIES } from './data.js';

export const LAST_CALL = 8;
export const heat = (turn) => (turn > LAST_CALL ? 1 + 0.25 * (turn - LAST_CALL) : 1);
export const trickMult = (t) => QMULT[t.q] * (1 + 0.25 * (t.up || 0));
const investMult = (t) => 1 + (t.q - 1) * 0.5 + 0.25 * (t.up || 0);
// the multiplier a trick applies to its roll total, and the size of its Trait
export const multOf = (t) => (TRICKS[t.id].type === 'investment' ? investMult(t) : trickMult(t));
export const traitOf = (t) => Math.max(1, Math.round(trickMult(t)));
export const isPayable = (ch) => ch.kind === 'std' || ch.kind === 'opp';
export const isHazard = (ch) => HAZARD_KINDS.includes(ch.kind);
export const isShield = (ch) => ch.kind === 'block' || ch.kind === 'counter';
const SPREAD = { scorch: 'drop' };

// ---------- position helpers ----------
export const cellWorth = (cell) => sum(cell.chips, (ch) => (isPayable(ch) ? ch.value : ch.kind === 'debt' ? -ch.value : 0));
export const debtOf = (cell) => sum(cell.chips, (ch) => (ch.kind === 'debt' ? ch.value : 0));
export const worth = (s) => sum(s.grid.flat(), cellWorth);
export const occupied = (cell, payOnly) => cell.chips.some((ch) => isPayable(ch) || (!payOnly && isShield(ch)));
export const solidCount = (cell) => cell.chips.filter((ch) => !isHazard(ch)).length;
export const capacityLeft = (s, cell) => (cell.hole ? 0 : s.dims.stackMax - solidCount(cell));
export function frontRow(s, c, payOnly) { for (let r = 0; r < s.rows; r++) if (occupied(s.grid[r][c], payOnly)) return r; return -1; }
export function rearRow(s, c, payOnly) { for (let r = s.rows - 1; r >= 0; r--) if (occupied(s.grid[r][c], payOnly)) return r; return -1; }
const bodyRow = (s, c, payOnly) => { for (let r = s.dims.meterRows; r < s.rows; r++) if (occupied(s.grid[r][c], payOnly)) return r; return -1; };
const topSolid = (cell) => { for (let i = cell.chips.length - 1; i >= 0; i--) if (!isHazard(cell.chips[i])) return i; return -1; };
const topPayableIdx = (cell) => { for (let i = cell.chips.length - 1; i >= 0; i--) if (isPayable(cell.chips[i])) return i; return -1; };
const hasResist = (cell, el) => cell.chips.some((ch) => ch.resist === el);
const allCells = (s) => { const out = []; for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.dims.cols; c++) out.push({ r, c, cell: s.grid[r][c] }); return out; };
const pushChip = (cell, ch) => { if (isHazard(ch)) cell.chips.push(ch); else { const i = cell.chips.findIndex(isHazard); if (i < 0) cell.chips.push(ch); else cell.chips.splice(i, 0, ch); } };
export const tipOf = (s, k) => Math.max(0, s.tip[k] + (s.turnBonus[k] || 0));
export const cOf = (s, k) => Math.max(0, s.c[k] + (s.turnBonus[k] || 0));

function mkChip(b, kind, value = 0, extra = {}) { return { id: b.nextId++, kind, value, ...extra }; }
const HAZARD_LIFE = { burn: 3, shock: 2, corrupt: 3, boom: 2, acid: 99, poison: 99 };
const mkHazard = (b, kind, life) => mkChip(b, kind, 0, { life: life ?? HAZARD_LIFE[kind] });
// Debt chips come in 1, 2, 5 and 10. Make the Debt on a stack total n, keeping chips where the total is unchanged.
function setDebt(b, cell, n, how) {
  const cur = cell.chips.filter((ch) => ch.kind === 'debt'), have = sum(cur, (ch) => ch.value);
  if (n === have) return;
  let add = n - have;
  if (add < 0) { for (const d of cur) { cell.chips.splice(cell.chips.indexOf(d), 1); b.fx[d.id] = 'void'; } add = n; }
  for (const v of [10, 5, 2, 1]) while (add >= v) { const d = mkChip(b, 'debt', v); cell.chips.push(d); if (how) b.fx[d.id] = how; add -= v; }
}
// A step carries who acted, which trick, and which phase the House is calling, so the table can show it.
// the player's side is named "You", so fix the grammar once here
const say = (t) => t.replace(/\bYou's\b/g, 'Your').replace(/\bYou (plays|pays|charges|steals|gains|resists|evades|reflects|holds|wins|owes|takes)\b/g, (m, v) => `You ${v.slice(0, -1)}`).replace(/\bYou is\b/g, 'You are').replace(/\bYou has\b/g, 'You have').replace(/(?<=[a-z,:] )Your\b/g, 'your').replace(/^You .*/, (m) => m.replace(/, (gain|steal)s /g, ', $1 '));
function step(b, text, cells = [], kind = '') { text = say(text); const st = { text, cells, kind, fx: b.fx, ...(b.ctx || {}) }; b.fx = {}; if (text) b.log.push(text); return st; }
const ref = (s, r, c) => ({ side: s.idx, r, c });

function meterOrder(s) {
  const rs = order1D(s.dims.meterRows, s.deploy), cs = order1D(s.dims.cols, s.deploy), out = [];
  for (const r of rs) for (const c of cs) out.push({ r, c });
  return out;
}
// place chips on the Meter, nearest to origin first (or in the class deployment order). Returns chips that did not fit.
function addToMeter(b, s, chips, origin, from) {
  let cells = meterOrder(s);
  if (origin) cells = cells.slice().sort((x, y) => Math.abs(x.r - origin.r) + Math.abs(x.c - origin.c) - (Math.abs(y.r - origin.r) + Math.abs(y.c - origin.c)));
  const left = [];
  for (const ch of chips) {
    const spot = cells.find(({ r, c }) => capacityLeft(s, s.grid[r][c]) > 0);
    if (!spot) { left.push(ch); b.fx[ch.id] = 'void'; continue; }
    pushChip(s.grid[spot.r][spot.c], ch);
    if (from) b.fx[ch.id] = from;
  }
  return left;
}
function makeChange(b, amount) {
  const out = [];
  for (const v of [10, 5, 2, 1]) { if (v > (b.rules.maxDenom || 1)) continue; while (amount >= v && out.length < 60) { out.push(mkChip(b, 'std', v)); amount -= v; } }
  return out;
}

// ---------- setup ----------
export function barOrder(s, spacing, rng) {
  const { cols, meterRows: m, barRows: n } = s.dims;
  const rs = order1D(n, s.deploy).map((i) => i + m), cs = order1D(cols, s.deploy);
  let cells = [];
  if (spacing === 'column') { for (const c of cs) for (const r of rs) cells.push({ r, c }); } else { for (const r of rs) for (const c of cs) cells.push({ r, c }); }
  if (spacing === 'random') cells = rng.shuffle(cells);
  return cells.filter(({ r, c }) => !s.grid[r][c].hole);
}
// plan: { chips:[{value,count,resist?}], spacing:'row'|'column'|'random', stacking:'maxed'|'balanced'|'random' }
export function deploy(b, s, plan) {
  const cells = barOrder(s, plan.spacing, b.rng);
  if (!cells.length) return 0;
  const base = [], rest = [];
  for (const g of plan.chips) for (let i = 0; i < g.count; i++) (g.resist ? base : rest).push(mkChip(b, 'std', g.value, g.resist ? { resist: g.resist } : {}));
  let placed = 0;
  const put = (spot, ch) => { s.grid[spot.r][spot.c].chips.push(ch); placed += ch.value; };
  const open = (spot) => capacityLeft(s, s.grid[spot.r][spot.c]) > 0;
  base.forEach((ch, i) => { const spot = cells[i % cells.length]; if (open(spot)) put(spot, ch); });
  if (plan.stacking === 'balanced') {
    let i = 0, misses = 0;
    for (const ch of rest) { while (misses < cells.length && !open(cells[i % cells.length])) { i++; misses++; } if (misses >= cells.length) break; put(cells[i % cells.length], ch); i++; misses = 0; }
  } else if (plan.stacking === 'random') {
    for (const ch of rest) { const free = cells.filter(open); if (!free.length) break; put(b.rng.pick(free), ch); }
  } else {
    for (const ch of rest) { const spot = cells.find(open); if (!spot) break; put(spot, ch); }
  }
  return placed;
}
export const barCapacity = (dims, holes = 0) => (dims.barRows * dims.cols - holes) * dims.stackMax;

function mkSide(b, spec, idx) {
  const d = spec.dims, rows = d.meterRows + d.barRows;
  const s = {
    idx, name: spec.name, cls: spec.cls, ai: !!spec.ai, title: spec.title || '', deploy: spec.deploy,
    tip: { ...spec.tip }, c: { ...spec.c }, dims: { ...d }, rows,
    grid: Array.from({ length: rows }, () => Array.from({ length: d.cols }, () => ({ chips: [], hole: false, hard: 0 }))),
    book: spec.tricks.map((t) => ({ ...t })), run: [], pouch: spec.dice.map((x) => ({ ...x, up: [...(x.up || [])] })),
    tray: [], used: { draw: 0, roll: 0, bid: 0 }, power: 0, turnBonus: {}, rolled: {},
    status: { resist: 0, resistNext: 0, evade: null, evadeNext: null, reflect: 0, reflectAll: false, enfeebleNext: 0 },
    mods: { boost: 0, enfeeble: 0, press: 0, bend: null, mul: 1, pierce: false },
    drink: spec.drink ? { ...spec.drink } : null, sipped: false,
    familiars: spec.familiars || 0, interventions: spec.interventions || 0, intervened: false, spawners: spec.spawners || 0, calamities: spec.calamities || [],
    bidsPaid: 0, dealt: 0, destroyed: 0, snap: null,
  };
  // hazard tilts: holes on random spaces
  const spots = b.rng.shuffle(allCells(s)).slice(0, spec.holes || 0);
  for (const { cell } of spots) cell.hole = true;
  // calamities that sit on the table take a Bar space of their own
  for (const cal of s.calamities) if (cal === 'blackhole' || cal === 'volcano') {
    const free = allCells(s).filter((x) => x.r >= d.meterRows && !x.cell.hole); if (!free.length) continue;
    const { cell } = b.rng.pick(free); cell.hole = true; if (cal === 'blackhole') cell.black = true; else cell.volcano = 4;
  }
  return s;
}

// opts: { seed, a, b, rules:{ maxDenom, maxTurns } }  (a = player side 0, b = opponent side 1)
export function createBout(opts) {
  const b = { rng: new RNG(opts.seed), turn: 1, over: false, winner: null, stage: { paid: [0, 0] }, sides: [], log: [], fx: {}, nextId: 1,
    rules: { maxDenom: 1, maxTurns: 40, ...(opts.rules || {}) }, creatures: [] };
  b.sides = [mkSide(b, opts.a, 0), mkSide(b, opts.b, 1)];
  [opts.a, opts.b].forEach((spec, i) => {
    const s = b.sides[i];
    deploy(b, s, spec.plan);
    for (let k = 0; k < (spec.shields || 0); k++) addToMeter(b, s, Array.from({ length: s.dims.stackMax }, () => mkChip(b, 'block')));
    for (let k = 0; k < (spec.creatures || 0); k++) b.creatures.push(mkCreature(b, i, b.rng.range(1, 5)));
  });
  startTurn(b);
  return b;
}

// which creatures turn up depends on how big the table plays
function mkCreature(b, side, arrive) {
  const pool = ['ufo', 'fairy', 'dragon', 'mole']; if (b.rules.maxDenom >= 5) pool.push('unicorn'); if (b.rules.maxDenom >= 10) pool.push('mothership');
  const kind = b.rng.pick(pool);
  return { id: b.nextId++, kind, side, r: -1, c: 0, life: kind === 'mothership' ? 5 : kind === 'unicorn' ? 1 : 2, arrive };
}
function startTurn(b) {
  for (const s of b.sides) {
    s.used = { draw: 0, roll: 0, bid: 0 }; s.turnBonus = {}; s.sipped = false; s.rolled = {}; s.ready = false; s.heat = heat(b.turn);
    s.mods = { boost: 0, enfeeble: s.status.enfeebleNext, press: 0, bend: null, mul: 1, pierce: false };
    s.status.enfeebleNext = 0;
    snapshot(s);
  }
  b.creatures = b.creatures.filter((cr) => !cr.gone);
}
const snapshot = (s) => { s.snap = clone({ grid: s.grid, run: s.run, book: s.book, pouch: s.pouch, tray: s.tray, used: s.used }); };

// ---------- planning ----------
export function sip(b, s) {
  if (!s.drink || s.drink.sips <= 0 || s.sipped) return false;
  s.drink.sips--; s.sipped = true;
  for (const [k, v] of Object.entries(s.drink.mods)) s.turnBonus[k] = (s.turnBonus[k] || 0) + v;
  return true;
}
export function canDraw(b, s, uid) {
  if (s.used.draw >= tipOf(s, 'trickery')) return 'No draws left this turn (Trickery).';
  if (!s.book.some((t) => t.uid === uid)) return 'That trick is in play.';
  return null;
}
export function draw(b, s, uid) {
  if (canDraw(b, s, uid)) return null;
  const i = s.book.findIndex((t) => t.uid === uid), trick = s.book.splice(i, 1)[0];
  const e = { uid, trick, dice: [], bid: [], bidValue: 0, target: null, state: 'shown', lingerLeft: 0, lingerTotal: 0 };
  s.run.push(e); s.used.draw++;
  return e;
}
// Dice are rolled first and placed second: a rolled die waits in the tray, showing its value,
// until you put it on a shown trick. Dice rolled this turn can be moved until their trick is bid.
export function rollDie(rng, die) {
  const f = DICE[die.type].faces; let v = rng.range(1, f);
  if (die.up.includes('escalate')) v = Math.max(v, rng.range(1, f));
  if (die.up.includes('stabilize')) v = Math.max(v, Math.ceil(f / 2));
  v += die.up.filter((u) => u === 'accelerate').length;
  return v;
}
export function canRollOut(b, s, dieId) {
  if (!s.pouch.some((d) => d.id === dieId)) return 'That die has already been rolled.';
  if (s.used.roll >= tipOf(s, 'proficiency')) return 'No rolls left this turn (Proficiency).';
  return null;
}
export function rollOut(b, s, dieId) {
  if (canRollOut(b, s, dieId)) return null;
  const i = s.pouch.findIndex((d) => d.id === dieId), die = s.pouch.splice(i, 1)[0];
  // a die keeps its value for the turn, so undoing a plan never rerolls it
  const d = { ...die, value: s.rolled[dieId] ?? (s.rolled[dieId] = rollDie(b.rng, die)), t: b.turn };
  s.tray.push(d); s.used.roll++;
  return d;
}
// Flip a standard chip: it lands as 0 or its worth and counts as a die of any type.
export function canFlip(b, s, r, c) {
  const ch = bidChip(s, r, c);
  if (!ch || ch.kind !== 'std') return 'Only an uncovered standard chip on top of a stack can be flipped.';
  if (s.used.roll >= tipOf(s, 'proficiency')) return 'No rolls left this turn (Proficiency). A flip uses a roll.';
  return null;
}
export function flip(b, s, r, c) {
  if (canFlip(b, s, r, c)) return null;
  const ch = s.grid[r][c].chips.pop(), key = 'c' + ch.id;
  const d = { id: key, type: 'd6', up: [], value: s.rolled[key] ?? (s.rolled[key] = b.rng.next() < 0.5 ? 0 : ch.value), chip: ch, t: b.turn };
  s.tray.push(d); s.used.roll++;
  return d;
}
const realType = (e) => e.dice.find((d) => !d.chip)?.type;
export const holderOf = (s, dieId) => s.run.find((e) => e.dice.some((d) => d.id === dieId)) || null;
// a die on a trick can still be moved if it was rolled this turn and the trick has not been bid
export const canMove = (b, s, dieId) => { const e = holderOf(s, dieId); return !!e && e.state === 'shown' && e.dice.find((d) => d.id === dieId).t === b.turn; };
export function canPlace(b, s, dieId, e) {
  const def = TRICKS[e.trick.id], d = s.tray.find((x) => x.id === dieId) || (canMove(b, s, dieId) ? holderOf(s, dieId).dice.find((x) => x.id === dieId) : null);
  if (!d) return s.pouch.some((x) => x.id === dieId) ? 'Roll the die first.' : 'That die is committed to its trick.';
  if (e.state !== 'shown') return 'A trick that has been bid on cannot take more dice.';
  if (e.dice.some((x) => x.id === dieId)) return 'That die is already there.';
  if (e.dice.length >= def.count) return `${def.name} holds at most ${def.count} dice.`;
  if (!d.chip && realType(e) && realType(e) !== d.type) return 'All dice on a trick must be the same type.';
  return null;
}
function takeLoose(s, dieId) {
  let i = s.tray.findIndex((d) => d.id === dieId); if (i >= 0) return s.tray.splice(i, 1)[0];
  const e = holderOf(s, dieId); i = e.dice.findIndex((d) => d.id === dieId); return e.dice.splice(i, 1)[0];
}
export function place(b, s, dieId, e) {
  if (canPlace(b, s, dieId, e)) return null;
  const d = takeLoose(s, dieId); e.dice.push(d);
  const type = realType(e) || TRICKS[e.trick.id].die; for (const x of e.dice) if (x.chip) x.type = type; // a flipped chip takes the type of the dice it joins
  return d;
}
export function unplace(b, s, dieId) { if (!canMove(b, s, dieId)) return null; const d = takeLoose(s, dieId); s.tray.push(d); return d; }
// roll a die straight onto a trick (used by tests and simple callers)
export function roll(b, s, dieId, e) { const d = rollOut(b, s, dieId); return d && place(b, s, dieId, e); }
export function bidChip(s, r, c) {
  const cell = s.grid[r]?.[c]; if (!cell || !cell.chips.length) return null;
  const top = cell.chips[cell.chips.length - 1];
  return isPayable(top) && !top.gold ? top : null;
}
export function canBid(b, s, e, r, c) {
  if (e.state === 'play') return 'That trick is already in play.';
  if (s.used.bid >= tipOf(s, 'ingenuity')) return 'No bids left this turn (Ingenuity).';
  if (!bidChip(s, r, c)) return 'Only an uncovered standard or Opportunity chip on top of a stack can be bid.';
  return null;
}
export function bid(b, s, e, r, c) {
  if (canBid(b, s, e, r, c)) return null;
  const ch = s.grid[r][c].chips.pop();
  e.bid.push(ch); e.bidValue += ch.value; e.state = 'bid'; s.used.bid++;
  if (!e.target) e.target = validTargets(b, s, e)[0] || null;
  return ch;
}
export function resetPlan(b, s) {
  const snap = clone(s.snap);
  s.grid = snap.grid; s.run = snap.run; s.book = snap.book; s.pouch = snap.pouch; s.tray = snap.tray; s.used = snap.used;
}
export const needsTarget = (e) => TRICKS[e.trick.id].approach !== 'none' && e.dice.length > 0;
export function targetSide(b, s, def) { return def.side === 'opp' ? b.sides[1 - s.idx] : def.side === 'self' ? s : null; }
export function validTargets(b, s, e, payOnly) {
  const def = TRICKS[e.trick.id], t = targetSide(b, s, def), out = [];
  if (!t || def.approach === 'none') return out;
  const C = t.dims.cols, m = t.dims.meterRows, push = (r, c) => { if (r >= 0) out.push(ref(t, r, c)); };
  switch (def.approach) {
    case 'front': for (let c = 0; c < C; c++) push(frontRow(t, c, payOnly), c); break;
    case 'rear': for (let c = 0; c < C; c++) push(rearRow(t, c, payOnly), c); break;
    case 'body': for (let c = 0; c < C; c++) push(bodyRow(t, c, payOnly), c); break;
    case 'flank': for (const c of [0, C - 1]) for (let r = 0; r < t.rows; r++) if (occupied(t.grid[r][c], payOnly)) push(r, c); break;
    case 'any': for (const { r, c, cell } of allCells(t)) if (occupied(cell, payOnly)) push(r, c); break;
    case 'meter': for (let r = 0; r < m; r++) for (let c = 0; c < C; c++) if (capacityLeft(t, t.grid[r][c]) > 0) push(r, c); break;
  }
  return out;
}
export function setTarget(b, s, e, tgt) {
  if (!validTargets(b, s, e).some((v) => v.side === tgt.side && v.r === tgt.r && v.c === tgt.c)) return false;
  e.target = { side: tgt.side, r: tgt.r, c: tgt.c }; return true;
}
// spaces an effect covers from an origin on side t
export function affected(b, t, def, origin, nDice, o = {}) {
  const dist = o.dist || def.dist, D = DIST[dist], n = Math.min(D.max, D.min + D.inc * Math.max(0, nDice - 1));
  const R = t.rows, C = t.dims.cols, { r, c } = origin, cells = [];
  const add = (rr, cc) => { if (rr >= 0 && rr < R && cc >= 0 && cc < C && !cells.some((x) => x.r === rr && x.c === cc)) cells.push({ r: rr, c: cc }); };
  const lateral = (cc) => (def.approach === 'front' ? frontRow(t, cc, o.payOnly) : def.approach === 'rear' ? rearRow(t, cc, o.payOnly) : def.approach === 'body' ? bodyRow(t, cc, o.payOnly) : r);
  switch (dist) {
    case 'hit': add(r, c); break;
    case 'swipe': add(r, c); for (let d = 1; d < C && cells.length < n; d++) for (const cc of [c + d, c - d]) if (cc >= 0 && cc < C && cells.length < n) add(lateral(cc), cc); break;
    case 'poke': for (let i = 0; i < n; i++) add(r + i, c); break;
    case 'hook': for (let i = 0; i < n; i++) add(r - i, c); break;
    case 'drop': add(r, c); add(r - 1, c); add(r + 1, c); add(r, c - 1); add(r, c + 1);
      if (n > 5) { add(r - 1, c - 1); add(r - 1, c + 1); add(r + 1, c - 1); add(r + 1, c + 1); }
      if (n > 9) { add(r - 2, c); add(r + 2, c); add(r, c - 2); add(r, c + 2); } break;
    case 'burst': { add(r, c); const levels = n <= 4 ? 1 : n <= 9 ? 2 : 3; for (let k = 1; k <= levels; k++) for (let dc = -k; dc <= k; dc++) add(r + k, c + dc); break; }
    case 'wave': for (let i = 0; i < n / 5; i++) for (let cc = 0; cc < C; cc++) add(r + i, cc); break;
    case 'aura': for (let rr = 0; rr < R; rr++) for (let cc = 0; cc < C; cc++) add(rr, cc); break;
  }
  return cells;
}
export function bonusMet(s, e) {
  const def = TRICKS[e.trick.id]; if (!e.dice.length) return false;
  if (def.cls && def.cls !== s.cls) return false;
  if (e.dice.length !== def.count || !e.dice.some((d) => d.type === def.die) || !e.dice.every((d) => d.type === def.die)) return false;
  const vals = e.dice.map((d) => d.value), total = sum(vals), cond = def.bonus.cond;
  if (cond === 'match') return vals.some((v, i) => vals.indexOf(v) !== i);
  if (cond === 'evens') return vals.every((v) => v % 2 === 0);
  if (cond === 'odds') return vals.every((v) => v % 2 === 1);
  if (cond.startsWith('over:')) return total >= +cond.slice(5);
  if (cond.startsWith('under:')) return total <= +cond.slice(6);
  return false;
}
// what a shown trick would do right now (for previews and the AI)
export function previewTotal(s, e) {
  const def = TRICKS[e.trick.id]; if (!e.dice.length) return 0;
  const linger = e.state === 'play' ? e.lingerTotal : clamp(e.bidValue - 1, 0, 20);
  const raw = sum(e.dice, (d) => d.value) + linger * e.dice.length + (def.type === 'investment' ? 0 : s.power);
  const m = def.type === 'investment' ? investMult(e.trick) : trickMult(e.trick);
  return Math.max(0, Math.round(raw * m * (def.type === 'expense' ? s.heat || 1 : 1))) * (bonusMet(s, e) && def.bonus.k === 'double' ? 2 : 1);
}

// ---------- effects ----------
// A fee goes out as Debt chips on the target stack. Nothing is paid until the House settles.
function engage(b, att, def, r, c, amount, o = {}) {
  const cell = def.grid[r][c], st = def.status, notes = [];
  const open = !o.pierce && !o.reflected;
  if (open && st.evade != null && amount > st.evade) return { placed: 0, notes: ['evaded'] };
  if (open && att && st.reflect > 0) {
    const back = Math.min(st.reflect, amount); amount -= back; if (!st.reflectAll) st.reflect = 0;
    const cols = [...Array(att.dims.cols).keys()].filter((x) => frontRow(att, x) >= 0);
    if (cols.length) { const cc = cols.includes(c) ? c : cols[0]; engage(b, def, att, frontRow(att, cc), cc, back, { reflected: true }); }
    notes.push(`${back}¢ reflected`);
  }
  if (open && st.resist > 0) { const cut = Math.min(amount, st.resist); amount -= cut; notes.push(`${cut}¢ resisted`); }
  if (amount <= 0) return { placed: 0, notes };
  markDue(cell, { pierce: o.pierce, glean: o.glean && att ? att.idx : null, element: o.element, att: att ? att.idx : null });
  setDebt(b, cell, debtOf(cell) + amount, 'debt');
  return { placed: amount, notes };
}
function markDue(cell, o) {
  const due = cell.due || (cell.due = { prior: debtOf(cell), pierce: false, glean: null, element: null, att: null });
  if (o.pierce) due.pierce = true; if (o.glean != null) due.glean = o.glean; if (o.element) due.element = o.element; if (o.att != null) due.att = o.att;
}
const anyDue = (s) => allCells(s).some((x) => x.cell.due);
// The House settles one Roller's stacks, front to back: shields absorb, chips are paid while the Debt covers
// them, what is left stays on the stack as Debt, and Debt on an emptied stack carries to the stack behind.
function* settleSide(b, s) {
  for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.dims.cols; c++) {
    const cell = s.grid[r][c], due = cell.due; if (!due) continue; cell.due = null;
    const att = due.att != null ? b.sides[due.att] : null, owed = debtOf(cell);
    let pool = owed, paid = 0, blocked = 0, counters = 0, hardStop = false, carry = 0;
    const pay = (ch) => { paid += ch.value; if (due.glean != null && !addToMeter(b, b.sides[due.glean], [ch], null, null).length) return; b.stage.paid[s.idx] += ch.value; b.fx[ch.id] = 'stage'; };
    while (pool > 0) {
      const i = due.pierce ? topPayableIdx(cell) : topSolid(cell); if (i < 0) break;
      const ch = cell.chips[i];
      if (isShield(ch)) { cell.chips.splice(i, 1); b.fx[ch.id] = 'void'; pool--; blocked++; if (ch.kind === 'counter') counters++; continue; }
      if (cell.hard > 0 && !due.pierce) { cell.chips.splice(i, 1); pay(ch); pool = Math.min(pool, due.prior); hardStop = true; break; }
      if (pool >= ch.value) { cell.chips.splice(i, 1); pool -= ch.value; pay(ch); } else break;
    }
    if (pool > 0 && topPayableIdx(cell) < 0) { // nothing left here to owe against
      let behind = -1; if (!hardStop) for (let rr = r + 1; rr < s.rows; rr++) if (occupied(s.grid[rr][c], due.pierce)) { behind = rr; break; }
      if (behind >= 0) { carry = pool; const nx = s.grid[behind][c]; markDue(nx, { pierce: due.pierce, glean: due.glean, att: due.att }); setDebt(b, nx, debtOf(nx) + carry, 'debt'); }
      pool = 0;
    }
    setDebt(b, cell, pool);
    if (!solidCount(cell)) for (const ch of cell.chips.splice(0)) b.fx[ch.id] = 'void';
    if (due.element && solidCount(cell) && !hasResist(cell, due.element) && !cell.chips.some((ch) => ch.kind === due.element)) cell.chips.push(mkHazard(b, due.element));
    if (att) att.dealt += paid;
    for (let k = 0; k < counters && att; k++) { // each Counter chip sends 1¢ of Debt back; it is settled in the next pass
      const cols = [...Array(att.dims.cols).keys()].filter((x) => frontRow(att, x) >= 0);
      if (cols.length) { const cc = b.rng.pick(cols); engage(b, s, att, frontRow(att, cc), cc, 1, { reflected: true }); }
    }
    const bits = [];
    if (blocked) bits.push(`${blocked} blocked${counters ? ` (${counters} countered)` : ''}`);
    if (hardStop) bits.push('Hardened: one chip only');
    if (pool) bits.push(`${pool}¢ of Debt stays on the stack`);
    if (carry) bits.push(`${carry}¢ of Debt carries behind`);
    const head = paid ? `${s.name} pays ${paid}¢${due.glean != null ? ` straight to ${b.sides[due.glean].name}'s Meter` : ' to the Stage'}` : `${s.name} owes ${owed}¢`;
    yield step(b, `${head}${bits.length ? ': ' + bits.join(', ') : ''}.`, [ref(s, r, c)], paid ? 'fee' : 'debt');
  }
}
// settle both Rollers side by side; Counter chips can add Debt that needs another pass
function* settleAll(b, phase) {
  for (let pass = 0; pass < 4 && b.sides.some(anyDue); pass++) {
    const cxs = b.sides.map((s) => ({ phase, who: s.idx }));
    yield* zip(b, b.sides.map((s) => settleSide(b, s)), cxs);
  }
  for (const s of b.sides) for (const { cell } of allCells(s)) cell.due = null;
}
// Run one generator per Roller in lockstep. Each yield carries both Rollers' steps, so the table
// changes for both at once and neither goes first.
function* zip(b, gens, cxs) {
  const live = gens.map(() => true);
  for (;;) {
    const parts = [];
    gens.forEach((g, i) => { if (!live[i]) return; b.ctx = cxs[i]; const r = g.next(); if (r.done) live[i] = false; else parts.push(r.value); });
    b.ctx = { phase: cxs[0].phase };
    if (!parts.length) return;
    yield parts.length === 1 ? parts[0] : { kind: 'pair', phase: parts[0].phase, parts, text: '', cells: parts.flatMap((p) => p.cells), fx: Object.assign({}, ...parts.map((p) => p.fx)) };
  }
}
function cleanse(b, s, n) {
  let done = 0;
  for (const { cell } of allCells(s)) {
    for (const ch of cell.chips.filter((x) => isHazard(x) && x.kind !== 'debt')) { if (done >= n) return done; cell.chips.splice(cell.chips.indexOf(ch), 1); b.fx[ch.id] = 'void'; done++; }
    const d = debtOf(cell); if (d && done < n) { const take = Math.min(d, n - done); setDebt(b, cell, d - take); done += take; }
  }
  return done;
}
function organize(b, s) {
  const m = s.dims.meterRows, chips = [], haz = [];
  for (let r = m; r < s.rows; r++) for (let c = 0; c < s.dims.cols; c++) {
    const cell = s.grid[r][c]; chips.push(...cell.chips.filter((ch) => !isHazard(ch))); haz.push([cell, cell.chips.filter(isHazard)]); cell.chips = [];
  }
  chips.sort((x, y) => x.value - y.value);
  for (let r = m; r < s.rows && chips.length; r++) for (let c = 0; c < s.dims.cols && chips.length; c++) {
    const cell = s.grid[r][c]; while (capacityLeft(s, cell) > 0 && chips.length) cell.chips.push(chips.shift());
  }
  for (const [cell, hs] of haz) for (const h of hs) { if (solidCount(cell)) cell.chips.push(h); else b.fx[h.id] = 'void'; }
}
function recoup(b, s, n, both) {
  let take = Math.min(n, b.stage.paid[s.idx]); b.stage.paid[s.idx] -= take;
  let take2 = both ? Math.min(n - take, b.stage.paid[1 - s.idx]) : 0; b.stage.paid[1 - s.idx] -= take2;
  const chips = makeChange(b, take + take2);
  const left = addToMeter(b, s, chips, null, 'from-stage');
  const back = sum(left, (ch) => ch.value) + (take + take2 - sum(chips, (ch) => ch.value));
  b.stage.paid[s.idx] += back; // what did not fit stays on the Stage
  return take + take2 - back;
}

function* play(b, s, e) {
  const def = TRICKS[e.trick.id], o = b.sides[1 - s.idx], inv = def.type === 'investment';
  const m = Math.max(1, Math.round(trickMult(e.trick)));
  // Trait effect: every turn the trick is in play
  if (def.type === 'expense') {
    const cols = [...Array(o.dims.cols).keys()].filter((c) => frontRow(o, c) >= 0);
    if (cols.length) { const c = b.rng.pick(cols), r = frontRow(o, c), g = engage(b, s, o, r, c, m, {});
      yield step(b, `${s.name} plays ${def.name}: ${g.placed ? `${g.placed}¢ of Debt on a front stack` : `the ${m}¢ trait fee is ${g.notes.join(', ') || 'lost'}`}.`, [ref(o, r, c)], 'play'); }
  } else if (def.type === 'insurance') {
    addToMeter(b, s, Array.from({ length: m }, () => mkChip(b, 'block')), null, 'spawn');
    yield step(b, `${s.name} plays ${def.name}: ${m} Block chip${m > 1 ? 's' : ''} to the Meter.`, [], 'play');
  } else if (inv) {
    s.power += m; yield step(b, `${s.name} plays ${def.name}: +${m} Power.`, [], 'play');
  } else {
    const n = cleanse(b, s, m); yield step(b, `${s.name} plays ${def.name}${n ? `: ${n} Debt or hazard chip${n > 1 ? 's' : ''} cleansed` : ''}.`, [], 'play');
  }
  if (e.lingerLeft > 0 || !e.dice.length) return;

  // Roll effect: on the last turn of the linger
  const own = def.roll.k === 'bend' || def.roll.k === 'parlay';
  const fz = s.fz || s.mods; // mods as they stood when the phase was called
  const vals = e.dice.map((d) => (!own && fz.bend != null ? fz.bend : d.value));
  const bonus = bonusMet(s, e) ? def.bonus.k : null;
  let total = sum(vals) + e.lingerTotal * e.dice.length;
  if (!inv) { total += fz.boost - fz.enfeeble + s.power + (def.type === 'expense' ? fz.press : 0); s.power = 0; }
  total = Math.max(0, Math.round(total * (inv ? investMult(e.trick) : trickMult(e.trick) * fz.mul) * (def.type === 'expense' ? heat(b.turn) : 1)));
  if (bonus === 'double') total *= 2;
  const tag = `${s.name}'s ${def.name} (${vals.join('+')}${bonus ? ', bonus' : ''})`;
  const t = targetSide(b, s, def);
  const pierce = def.type === 'expense' && (fz.pierce || bonus === 'pierce');
  // re-find the origin: positions may have changed since the target was picked
  let origin = null;
  if (t && def.approach !== 'none') {
    const valid = validTargets(b, s, e, pierce), want = e.target || valid[0];
    if (valid.length && want) origin = valid.slice().sort((x, y) => Math.abs(x.c - want.c) * 10 + Math.abs(x.r - want.r) - (Math.abs(y.c - want.c) * 10 + Math.abs(y.r - want.r)))[0];
    if (!origin) { yield step(b, `${tag} finds no target and fizzles.`, [], 'miss'); return; }
  }
  const dist = bonus === 'spread' ? SPREAD[e.trick.id] || 'swipe' : bonus === 'aura' ? 'aura' : def.dist;
  const cells = origin ? affected(b, t, def, origin, e.dice.length, { dist, payOnly: pierce }) : [];

  switch (def.roll.k) {
    case 'fee': {
      const element = def.element && (def.bonus.k !== 'element' || bonus === 'element') ? def.element : null;
      const opts = { pierce, glean: bonus === 'glean' }, notes = new Set(); let placed = 0;
      const send = (r, c, amt, el) => { const g = engage(b, s, o, r, c, amt, { ...opts, element: el }); placed += g.placed; for (const n of g.notes) notes.add(n.replace(/^\d+¢ /, '')); };
      const tail = () => (notes.size ? ` — partly ${[...notes].join(', ')}` : '');
      if (def.dist === 'rain') {
        const live = allCells(o).filter((x) => occupied(x.cell, pierce)); if (!live.length) { yield step(b, `${tag} finds nothing to hit.`, [], 'miss'); return; }
        const counts = new Map(); for (let i = 0; i < Math.min(total, 200); i++) { const x = b.rng.pick(live); counts.set(x, (counts.get(x) || 0) + 1); }
        let first = true; for (const [x, n] of counts) { send(x.r, x.c, n, first ? element : null); first = false; }
        yield step(b, `${tag} rains ${total} drops: ${placed}¢ of Debt lands${tail()}.`, [...counts.keys()].map((x) => ref(o, x.r, x.c)), placed ? 'play' : 'miss'); return;
      }
      const hit = cells.filter(({ r, c }) => occupied(o.grid[r][c], pierce));
      if (!hit.length || total <= 0) { yield step(b, `${tag} comes to nothing.`, [], 'miss'); return; }
      const per = Math.floor(total / hit.length), rem = total % hit.length;
      for (let i = 0; i < hit.length; i++) {
        const { r, c } = hit[i]; let amt = per + (i < rem ? 1 : 0);
        if (def.tax) amt = Math.max(total, Math.ceil(Math.max(0, cellWorth(o.grid[r][c])) * Math.min(1, total / 10)));
        if (amt > 0) send(r, c, amt, i === 0 ? element : null);
      }
      yield step(b, placed ? `${tag}: ${placed}¢ of Debt on ${hit.length} stack${hit.length > 1 ? 's' : ''}${tail()}.` : `${tag}: the fee is ${[...notes].join(', ') || 'lost'}.`, hit.map((x) => ref(o, x.r, x.c)), placed ? 'play' : 'miss'); return;
    }
    case 'block': { const kind = bonus === 'counter' ? 'counter' : 'block'; const n = Math.min(total, 60);
      addToMeter(b, s, Array.from({ length: n }, () => mkChip(b, kind)), origin, 'spawn');
      yield step(b, `${tag}: ${n} ${kind === 'counter' ? 'Counter' : 'Block'} chips to the Meter.`, origin ? [origin] : [], 'play'); return; }
    case 'harden': { const turns = clamp(Math.floor(total / 4), 1, 5); for (const { r, c } of cells) if (solidCount(s.grid[r][c])) s.grid[r][c].hard = Math.max(s.grid[r][c].hard, turns);
      yield step(b, `${tag}: stacks Hardened for ${turns} turn${turns > 1 ? 's' : ''}.`, cells.map((x) => ref(s, x.r, x.c)), 'play'); return; }
    case 'resist': s.status.resist += total; if (bonus === 'extend') s.status.resistNext = total;
      yield step(b, `${tag}: Resist ${total}.`, [], 'play'); return;
    case 'evade': s.status.evade = s.status.evade == null ? total : Math.min(s.status.evade, total); if (bonus === 'extend') s.status.evadeNext = total;
      yield step(b, `${tag}: fees over ${total}¢ will miss.`, [], 'play'); return;
    case 'reflect': s.status.reflect = total; s.status.reflectAll = bonus === 'extend';
      yield step(b, `${tag}: Reflect ${total}.`, [], 'play'); return;
    case 'boost': s.mods.boost += total; if (bonus === 'extend') s.power += total;
      yield step(b, `${tag}: other roll effects gain ${total}.`, [], 'play'); return;
    case 'enfeeble': o.mods.enfeeble += total; if (bonus === 'extend') o.status.enfeebleNext = Math.floor(total / 2);
      yield step(b, `${tag}: ${o.name}'s roll effects lose ${total}.`, [], 'play'); return;
    case 'bend': { const v = e.dice[0].value; if (bonus === 'bendopp') o.mods.bend = v; else s.mods.bend = v;
      yield step(b, `${tag}: every die ${bonus === 'bendopp' ? o.name + ' has' : 'they have'} in play counts as ${v}.`, [], 'play'); return; }
    case 'press': s.mods.press += total; s.mods.pierce = true; if (bonus === 'extend') s.power += Math.floor(total / 2);
      yield step(b, `${tag}: Expenses gain ${total} and pierce.`, [], 'play'); return;
    case 'parlay': { const even = e.dice[0].value % 2 === 0; s.mods.mul *= even ? 2 : 0.5;
      yield step(b, `${tag}: ${even ? 'even — effects doubled' : 'odd — effects halved'}.`, [], 'play'); return; }
    case 'gild': { let n = 0; for (const { r, c } of cells) { let left = total; const st = s.grid[r][c].chips;
        for (let i = st.length - 1; i >= 0 && left > 0; i--) if (st[i].kind === 'std' && !st[i].gold) { st[i].gold = true; left--; n++; } }
      yield step(b, `${tag}: ${n} chip${n === 1 ? '' : 's'} turned to Gold.`, cells.map((x) => ref(s, x.r, x.c)), 'play'); return; }
    case 'settle': { const n = cleanse(b, s, total); organize(b, s);
      if (bonus === 'blocks') addToMeter(b, s, [mkChip(b, 'block'), mkChip(b, 'block')], null, 'spawn');
      yield step(b, `${tag}: ${n} cleansed, Bar organized.`, [], 'play'); return; }
    case 'gather': { const n = recoup(b, s, total, bonus === 'both');
      yield step(b, `${tag}: ${n}¢ recovered from the Stage.`, [], 'play'); return; }
    case 'fence': { let n = 0; for (const { cell } of allCells(s)) { const d = debtOf(cell); if (!d || n >= total) continue; const take = Math.min(d, total - n); setDebt(b, cell, d - take); n += take; }
      addToMeter(b, s, Array.from({ length: n }, () => mkChip(b, 'opp', 1)), null, 'spawn');
      if (bonus === 'blocks') addToMeter(b, s, [mkChip(b, 'block'), mkChip(b, 'block')], null, 'spawn');
      yield step(b, `${tag}: ${n}¢ of Debt fenced into Opportunity chips.`, [], 'play'); return; }
    case 'sweep': { let n = 0; for (let r = 0; r < o.dims.meterRows; r++) for (let c = 0; c < o.dims.cols; c++) { const st = o.grid[r][c].chips;
        for (let i = st.length - 1; i >= 0 && n < total; i--) if (isShield(st[i]) || st[i].kind === 'opp') { b.fx[st[i].id] = 'void'; st.splice(i, 1); n++; }
        if (!solidCount(o.grid[r][c])) for (const ch of st.splice(0)) b.fx[ch.id] = 'void'; }
      if (bonus === 'unharden') for (const { cell } of allCells(o)) cell.hard = 0;
      yield step(b, `${tag}: ${n} chip${n === 1 ? '' : 's'} swept off ${o.name}'s Meter.`, [], 'play'); return; }
    case 'scatter': { const picked = [];
      for (let r = 0; r < o.rows && picked.length < total; r++) for (let c = 0; c < o.dims.cols && picked.length < total; c++) { const cell = o.grid[r][c];
        while (picked.length < total && topSolid(cell) >= 0) picked.push(cell.chips.splice(topSolid(cell), 1)[0]);
        if (!solidCount(cell)) for (const ch of cell.chips.splice(0)) b.fx[ch.id] = 'void'; }
      let lost = 0;
      for (const ch of picked) { const free = allCells(o).filter((x) => capacityLeft(o, x.cell) > 0 && b.rng.chance(0.6));
        if (free.length) pushChip(b.rng.pick(free).cell, ch); else if (isPayable(ch)) { b.stage.paid[o.idx] += ch.value; b.fx[ch.id] = 'stage'; lost += ch.value; } else b.fx[ch.id] = 'void'; }
      yield step(b, `${tag}: ${picked.length} chips scattered${lost ? `, ${lost}¢ fell to the Stage` : ''}.`, [], 'play'); return; }
  }
}

// ---------- end of turn ----------
const around = (s, r, c) => allCells(s).filter((x) => (x.r !== r || x.c !== c) && Math.abs(x.r - r) <= 1 && Math.abs(x.c - c) <= 1);
const emptyOut = (b, cell) => { if (!solidCount(cell) && cell.chips.length) for (const ch of cell.chips.splice(0)) b.fx[ch.id] = 'void'; };
// a Fairy or Unicorn turns a chip into a random chip of any type
function transform(b, cell, i) {
  const v = cell.chips[i], k = b.rng.pick(['std', 'std', 'opp', 'block', 'counter', 'gold', 'debt', 'poison', 'boom']); delete v.gold; delete v.resist;
  if (k === 'gold') { v.kind = 'std'; v.value = Math.max(1, v.value); v.gold = true; }
  else if (k === 'std') { v.kind = 'std'; v.value = b.rng.pick([1, 2, 5, 10].filter((d) => d <= Math.max(2, b.rules.maxDenom))); }
  else if (k === 'debt' || k === 'poison' || k === 'boom') { if (cell.chips.filter(isPayable).length > 1) { cell.chips.splice(i, 1); v.kind = k; v.value = k === 'debt' ? 1 : 0; v.life = HAZARD_LIFE[k]; cell.chips.push(v); } }
  else { v.kind = k; v.value = k === 'opp' ? 1 : 0; }
}
function* ticks(b) {
  for (const s of b.sides) {
    b.ctx = { phase: 'house', who: s.idx };
    let burned = 0, boomed = 0; const touched = [];
    const HZ = ['burn', 'acid', 'shock', 'corrupt', 'poison', 'boom'];
    for (const { r, c, cell } of allCells(s)) for (const h of cell.chips.filter((ch) => HZ.includes(ch.kind))) {
      if (!cell.chips.includes(h)) continue;
      const drop = () => { cell.chips.splice(cell.chips.indexOf(h), 1); b.fx[h.id] = 'void'; };
      if (hasResist(cell, h.kind)) { drop(); touched.push(ref(s, r, c)); continue; }
      touched.push(ref(s, r, c));
      if (h.kind === 'shock') { // 1¢ of Debt on two other stacks
        const others = allCells(s).filter((x) => x.cell !== cell && occupied(x.cell) && !hasResist(x.cell, 'shock'));
        for (const x of b.rng.shuffle(others).slice(0, 2)) engage(b, null, s, x.r, x.c, 1, {});
        if (--h.life <= 0) drop(); continue;
      }
      if (h.kind === 'corrupt' || h.kind === 'poison') { // 1¢ of Debt on its own stack every turn
        if (topPayableIdx(cell) >= 0) engage(b, null, s, r, c, 1, {});
        if (h.kind === 'corrupt') {
          if (b.rng.chance(0.6)) { const free = allCells(s).filter((x) => x.cell !== cell && solidCount(x.cell) && !x.cell.chips.some((ch) => ch.kind === 'corrupt')); if (free.length) b.rng.pick(free).cell.chips.push(mkHazard(b, 'corrupt', 2)); }
          if (--h.life <= 0) drop();
        }
        continue;
      }
      if (h.kind === 'boom') { // goes off the turn after it lands: 5¢ to its stack and every stack around it
        if (--h.life > 0) continue;
        drop(); boomed++;
        for (const x of [{ r, c, cell }, ...around(s, r, c)]) if (occupied(x.cell)) { engage(b, null, s, x.r, x.c, 5, {}); touched.push(ref(s, x.r, x.c)); }
        continue;
      }
      const i = topSolid(cell);
      if (i >= 0) { const v = cell.chips.splice(i, 1)[0]; b.fx[v.id] = 'void'; if (isPayable(v)) { s.destroyed += v.value; burned += v.value; } }
      if (h.kind === 'burn') {
        if (b.rng.chance(0.3)) { const adj = allCells(s).filter((x) => Math.abs(x.r - r) + Math.abs(x.c - c) === 1 && solidCount(x.cell) && !hasResist(x.cell, 'burn') && !x.cell.chips.some((ch) => ch.kind === 'burn'));
          if (adj.length) b.rng.pick(adj).cell.chips.push(mkHazard(b, 'burn', 2)); }
        if (--h.life <= 0) drop();
      }
      if (!solidCount(cell)) { const acid = h.kind === 'acid'; for (const ch of cell.chips.splice(0)) b.fx[ch.id] = 'void'; if (acid) cell.hole = true; }
    }
    if (touched.length) yield step(b, `Hazards work through ${s.name}'s position${burned ? `: ${burned}¢ destroyed` : ''}${boomed ? `${burned ? ',' : ':'} ${boomed} Boom chip${boomed > 1 ? 's go' : ' goes'} off` : ''}.`, touched, 'hazard');

    for (let k = 0; k < s.familiars; k++) {
      const n = cleanse(b, s, 1); const cr = b.creatures.find((x) => x.side === s.idx && !x.gone && x.r >= 0);
      const chased = cr && b.rng.chance(0.5); if (chased) cr.gone = true;
      if (n || chased) yield step(b, `${s.name}'s Familiar ${n ? 'clears a chip' : ''}${n && chased ? ' and ' : ''}${chased ? 'chases a creature away' : ''}.`, [], 'familiar');
    }
    if (s.spawners && b.turn % 3 === 0) for (let k = 0; k < s.spawners; k++) b.creatures.push(mkCreature(b, s.idx, b.turn));
    for (const cr of b.creatures.filter((x) => x.side === s.idx && !x.gone && x.arrive <= b.turn)) {
      let text = '', at = null;
      if (cr.kind === 'mole') { // digs up an empty space
        const free = allCells(s).filter((x) => !x.cell.hole && !x.cell.chips.length);
        if (free.length) { at = b.rng.pick(free); at.cell.hole = true; text = 'A Mole digs a Hole'; } else text = 'A Mole finds nowhere to dig';
      } else {
        const live = allCells(s).filter((x) => solidCount(x.cell));
        if (!live.length) { cr.gone = true; continue; }
        const stay = cr.kind === 'mothership' && cr.r >= 0 && solidCount(s.grid[cr.r][cr.c]) ? { r: cr.r, c: cr.c, cell: s.grid[cr.r][cr.c] } : null;
        at = stay || b.rng.pick(live); const i = topSolid(at.cell);
        if (cr.kind === 'ufo' || cr.kind === 'mothership') { const v = at.cell.chips.splice(i, 1)[0]; b.fx[v.id] = 'abduct'; if (isPayable(v)) s.destroyed += v.value; text = cr.kind === 'ufo' ? 'A UFO abducts a chip' : 'The Mothership beams up a chip'; if (cr.kind === 'mothership' && !solidCount(at.cell)) cr.life = 1; }
        else if (cr.kind === 'dragon') { if (!hasResist(at.cell, 'burn') && !at.cell.chips.some((ch) => ch.kind === 'burn')) at.cell.chips.push(mkHazard(b, 'burn')); text = 'A Dragon breathes fire on a stack'; }
        else if (cr.kind === 'unicorn') { for (let k = at.cell.chips.length - 1; k >= 0; k--) if (!isHazard(at.cell.chips[k])) transform(b, at.cell, k); text = 'A Unicorn transforms a whole stack. Chaos reigns!'; }
        else { transform(b, at.cell, i); text = 'A Fairy transforms a chip. Chaos reigns!'; }
        emptyOut(b, at.cell);
      }
      if (at) { cr.r = at.r; cr.c = at.c; }
      if (--cr.life <= 0) cr.gone = true;
      yield step(b, `${text} in ${s.name}'s position${cr.gone ? ', then leaves' : ''}.`, at ? [ref(s, at.r, at.c)] : [], 'creature');
    }
    for (const cal of s.calamities) {
      if (cal === 'inferno') { const live = allCells(s).filter((x) => solidCount(x.cell) && !x.cell.chips.some((ch) => ch.kind === 'burn') && !hasResist(x.cell, 'burn'));
        if (live.length) { const x = b.rng.pick(live); x.cell.chips.push(mkHazard(b, 'burn')); yield step(b, `${CALAMITIES.inferno.name}: a stack catches fire.`, [ref(s, x.r, x.c)], 'hazard'); } }
      if (cal === 'audit' && b.turn % 2 === 0) { const hit = []; for (let c = 0; c < s.dims.cols; c++) { const r = frontRow(s, c); if (r >= 0 && engage(b, null, s, r, c, 1, {}).placed) hit.push(ref(s, r, c)); }
        if (hit.length) yield step(b, `${CALAMITIES.audit.name}: 1¢ of Debt on each of ${s.name}'s front stacks.`, hit, 'hazard'); }
      if (cal === 'tornado') { const live = allCells(s).filter((x) => solidCount(x.cell)); if (!live.length) continue;
        const x = b.rng.pick(live); let moved = 0, lost = 0;
        if (solidCount(x.cell) < 3) { // short stacks are thrown about; tall ones hold
          for (const ch of x.cell.chips.splice(0)) { const free = allCells(s).filter((y) => y.cell !== x.cell && capacityLeft(s, y.cell) > 0);
            if (isHazard(ch) || !free.length || b.rng.chance(0.3)) { b.fx[ch.id] = 'void'; if (isPayable(ch)) { s.destroyed += ch.value; lost += ch.value; } } else { pushChip(b.rng.pick(free).cell, ch); moved++; } } }
        yield step(b, `${CALAMITIES.tornado.name}: ${moved || lost ? `${moved} chip${moved === 1 ? '' : 's'} thrown across ${s.name}'s position${lost ? `, ${lost}¢ lost` : ''}` : 'a tall stack holds firm'}.`, [ref(s, x.r, x.c)], 'hazard'); }
    }
    for (const { r, c, cell } of allCells(s)) {
      if (cell.black) { const near = around(s, r, c).filter((x) => solidCount(x.cell)); if (!near.length) continue;
        const x = b.rng.pick(near), v = x.cell.chips.splice(topSolid(x.cell), 1)[0]; b.fx[v.id] = 'void'; if (isPayable(v)) s.destroyed += v.value; emptyOut(b, x.cell);
        yield step(b, `${CALAMITIES.blackhole.name}: a chip is pulled in from ${s.name}'s position and lost.`, [ref(s, x.r, x.c), ref(s, r, c)], 'hazard'); }
      if (cell.volcano > 0) { const live = allCells(s).filter((x) => solidCount(x.cell) && !x.cell.chips.some((ch) => ch.kind === 'burn') && !hasResist(x.cell, 'burn'));
        const x = live.length ? b.rng.pick(live) : null; if (x) x.cell.chips.push(mkHazard(b, 'burn'));
        if (--cell.volcano <= 0) cell.hole = false;
        yield step(b, `${CALAMITIES.volcano.name}: ${x ? 'a Burning chip lands on a stack' : 'it rumbles'}${cell.volcano <= 0 ? ', then it goes dormant' : ''}.`, x ? [ref(s, x.r, x.c), ref(s, r, c)] : [ref(s, r, c)], 'hazard'); }
    }
    // the House settles whatever Debt the hazards placed
    if (anyDue(s)) yield* settleSide(b, s);
    // Debt that has reached the value of the chip beneath it collects that chip
    for (const { cell } of allCells(s)) {
      for (;;) { const i = topPayableIdx(cell), d = debtOf(cell); if (i < 0 || !d || d < cell.chips[i].value) break;
        const ch = cell.chips.splice(i, 1)[0]; b.stage.paid[s.idx] += ch.value; b.fx[ch.id] = 'stage'; setDebt(b, cell, d - ch.value); }
      emptyOut(b, cell);
    }
  }
}

function* sidePhase(b, s, type, cx) {
  for (const e of s.run.filter((x) => x.state === 'play' && TRICKS[x.trick.id].type === type)) { cx.uid = e.uid; yield* play(b, s, e); }
}
export function* resolve(b) {
  // bids go to the House; a bid above 1¢ makes the trick linger
  let any = false;
  for (const s of b.sides) for (const e of s.run) if (e.state === 'bid') {
    e.lingerTotal = clamp(e.bidValue - 1, 0, 20); e.lingerLeft = e.lingerTotal; e.state = 'play';
    for (const ch of e.bid) b.fx[ch.id] = 'house'; s.bidsPaid += e.bidValue; e.bid = []; any = true;
  }
  b.ctx = { phase: 'bids' };
  if (any) yield step(b, 'The House collects the bids.', [], 'bid');
  const plays = []; for (const s of b.sides) for (const e of s.run) if (e.state === 'play') plays.push({ s, e });
  // Each phase is played for both Rollers at once. What a trick is worth is read from the table as it
  // stood when the phase was called, so neither Roller's play changes the other's in the same phase.
  for (const type of Object.keys(TYPES).sort((x, y) => TYPES[x].order - TYPES[y].order)) {
    if (!plays.some((p) => TRICKS[p.e.trick.id].type === type)) continue;
    b.ctx = { phase: type }; yield step(b, `The House calls ${TYPES[type].name}s.`, [], 'phase');
    for (const s of b.sides) s.fz = { ...s.mods };
    const cxs = b.sides.map((s) => ({ phase: type, who: s.idx, uid: null }));
    yield* zip(b, b.sides.map((s, i) => sidePhase(b, s, type, cxs[i])), cxs);
    if (type === 'expense' && b.sides.some(anyDue)) { b.ctx = { phase: type }; yield step(b, 'The House settles the Debt.', [], 'settle'); yield* settleAll(b, type); }
  }
  for (const s of b.sides) s.fz = null;
  b.ctx = { phase: 'house' };
  // finished tricks and their dice go back to the Book and Pouch
  let done = 0;
  const home = (s, d) => { if (d.chip) addToMeter(b, s, [d.chip], null, 'spawn'); else { const { value, t, ...die } = d; s.pouch.push(die); } }; // a flipped chip comes back to the Meter
  for (const { s, e } of plays) {
    if (e.lingerLeft > 0) { e.lingerLeft--; continue; }
    s.run.splice(s.run.indexOf(e), 1); s.book.push(e.trick); done++;
    for (const d of e.dice) home(s, d);
  }
  for (const s of b.sides) { if (s.tray.length) done++; for (const d of s.tray.splice(0)) home(s, d); } // rolled but never placed
  if (done) yield step(b, '', [], 'return');
  yield* ticks(b);
  b.ctx = { phase: 'house' };
  // who is broke?
  for (const s of b.sides) if (worth(s) <= 0 && s.interventions > 0 && b.stage.paid[s.idx] > 0) {
    s.interventions--; s.intervened = true;
    for (const { cell } of allCells(s)) for (const ch of cell.chips.filter(isHazard)) { cell.chips.splice(cell.chips.indexOf(ch), 1); b.fx[ch.id] = 'void'; }
    const chips = makeChange(b, b.stage.paid[s.idx]); let back = 0;
    for (const ch of chips) { const spot = allCells(s).reverse().find((x) => capacityLeft(s, x.cell) > 0); if (!spot) break; spot.cell.chips.push(ch); b.fx[ch.id] = 'from-stage'; back += ch.value; }
    b.stage.paid[s.idx] -= back;
    yield step(b, `Intervention! ${back}¢ of ${s.name}'s fees are restored.`, [], 'bonus');
  }
  // rewards for actions left unused, paid to both Rollers together
  if (!b.sides.some((x) => worth(x) <= 0)) {
    const cxs = b.sides.map((s) => ({ phase: 'house', who: s.idx }));
    yield* zip(b, b.sides.map((s) => (function* () {
      const unbid = Math.max(0, tipOf(s, 'ingenuity') - s.used.bid), unrolled = Math.max(0, tipOf(s, 'proficiency') - s.used.roll), undrawn = Math.max(0, tipOf(s, 'trickery') - s.used.draw);
      const stolen = recoup(b, s, cOf(s, 'charisma') * unbid, true);
      const opps = cOf(s, 'cunning') * unrolled; if (opps) addToMeter(b, s, Array.from({ length: opps }, () => mkChip(b, 'opp', 1)), null, 'spawn');
      const pow = cOf(s, 'conviction') * undrawn; s.power += pow;
      const bits = []; if (stolen) bits.push(`steals ${stolen}¢ from the Stage`); if (opps) bits.push(`gains ${opps} Opportunity`); if (pow) bits.push(`gains ${pow} Power`);
      if (bits.length) yield step(b, `${s.name} ${bits.join(', ')}.`, [], 'bonus');
    })()), cxs);
  }
  for (const s of b.sides) {
    const st = s.status; st.resist = st.resistNext; st.resistNext = 0; st.evade = st.evadeNext; st.evadeNext = null; st.reflect = 0; st.reflectAll = false;
    for (const { cell } of allCells(s)) if (cell.hard > 0) cell.hard--;
  }
  b.ctx = { phase: 'house' };
  const w = b.sides.map(worth);
  if (w[0] <= 0 || w[1] <= 0 || b.turn >= b.rules.maxTurns) {
    b.over = true; b.winner = w[0] > w[1] ? 0 : 1; b.timeout = w[0] > 0 && w[1] > 0;
    yield step(b, b.timeout ? `Last call. ${b.sides[b.winner].name} holds the most Worth.` : `${b.sides[1 - b.winner].name} is broke. ${b.sides[b.winner].name} wins the bout.`, [], 'over');
    return;
  }
  b.turn++; startTurn(b); b.ctx = null;
  yield step(b, '', [], 'turn');
}

// what each side walks away with
export function summary(b, idx) {
  const s = b.sides[idx], chips = s.grid.flat().flatMap((cell) => cell.chips);
  const std = chips.filter((ch) => ch.kind === 'std');
  return {
    win: b.winner === idx, turns: b.turn, timeout: !!b.timeout,
    survivors: sum(std.filter((ch) => !ch.resist), (ch) => ch.value) + sum(s.run.flatMap((e) => e.dice), (d) => (d.chip ? d.chip.value : 0)), gold: sum(std.filter((ch) => ch.gold), (ch) => ch.value),
    resist: std.filter((ch) => ch.resist).reduce((m, ch) => { m[ch.resist] = (m[ch.resist] || 0) + 1; return m; }, {}),
    opportunity: chips.filter((ch) => ch.kind === 'opp').length,
    ownFees: b.stage.paid[idx], oppFees: b.stage.paid[1 - idx], bids: s.bidsPaid,
    pendingBids: sum(s.run.filter((e) => e.state === 'play'), (e) => e.bidValue) + sum(s.run.filter((e) => e.state === 'bid'), (e) => e.bidValue),
    destroyed: s.destroyed, intervened: s.intervened, dealt: s.dealt,
  };
}
