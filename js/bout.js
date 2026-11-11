// Bout engine. Pure logic, no DOM. A bout is two Rollers, each with a Position
// (a grid of chip stacks: Meter rows in front, Bar rows behind), a Book of tricks,
// a Pouch of dice and a Run of shown tricks. Both plan a turn, then resolve() plays
// every effect in order and yields a step after each visible change.
import { RNG, sum, clone, clamp, order1D } from './util.js';
import { TRICKS, TYPES, DICE, DIST, QMULT, HAZARD_KINDS, CALAMITIES } from './data.js';

export const LAST_CALL = 8;
export const heat = (turn) => (turn > LAST_CALL ? 1 + 0.25 * (turn - LAST_CALL) : 1);
export const trickMult = (t) => QMULT[t.q] * (1 + 0.25 * (t.up || 0));
const investMult = (t) => 1 + (t.q - 1) * 0.5 + 0.25 * (t.up || 0);
export const isPayable = (ch) => ch.kind === 'std' || ch.kind === 'opp';
export const isHazard = (ch) => HAZARD_KINDS.includes(ch.kind);
export const isShield = (ch) => ch.kind === 'block' || ch.kind === 'counter';
const SPREAD = { scorch: 'drop' };

// ---------- position helpers ----------
export const cellWorth = (cell) => sum(cell.chips, (ch) => (isPayable(ch) ? ch.value : ch.kind === 'debt' ? -1 : 0));
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
// A step carries who acted, which trick, and which phase the House is calling, so the table can show it.
// the player's side is named "You", so fix the grammar once here
const say = (t) => t.replace(/\bYou's\b/g, 'Your').replace(/\bYou (plays|charges|steals|gains|resists|evades|reflects|holds|wins)\b/g, (m, v) => `You ${v.slice(0, -1)}`).replace(/\bYou is\b/g, 'You are').replace(/\bYou has\b/g, 'You have').replace(/(?<=[a-z,:] )Your\b/g, 'your').replace(/^You .*/, (m) => m.replace(/, (gain|steal)s /g, ', $1 '));
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
    used: { draw: 0, roll: 0, bid: 0 }, power: 0, turnBonus: {}, rolled: {},
    status: { resist: 0, resistNext: 0, evade: null, evadeNext: null, reflect: 0, reflectAll: false, enfeebleNext: 0 },
    mods: { boost: 0, enfeeble: 0, press: 0, bend: null, mul: 1, pierce: false },
    drink: spec.drink ? { ...spec.drink } : null, sipped: false,
    familiars: spec.familiars || 0, interventions: spec.interventions || 0, intervened: false, spawners: spec.spawners || 0, calamities: spec.calamities || [],
    bidsPaid: 0, dealt: 0, destroyed: 0, snap: null,
  };
  // hazard tilts: holes on random spaces
  const spots = b.rng.shuffle(allCells(s)).slice(0, spec.holes || 0);
  for (const { cell } of spots) cell.hole = true;
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
    for (let k = 0; k < (spec.creatures || 0); k++) b.creatures.push({ id: b.nextId++, kind: b.rng.pick(['ufo', 'fairy', 'dragon']), side: i, r: -1, c: 0, life: 2, arrive: b.rng.range(1, 5) });
  });
  startTurn(b);
  return b;
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
const snapshot = (s) => { s.snap = clone({ grid: s.grid, run: s.run, book: s.book, pouch: s.pouch, used: s.used }); };

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
export function canRoll(b, s, dieId, e) {
  const def = TRICKS[e.trick.id], die = s.pouch.find((d) => d.id === dieId);
  if (!die) return 'That die is on a trick.';
  if (e.state !== 'shown') return 'A trick that has been bid on cannot take more dice.';
  if (s.used.roll >= tipOf(s, 'proficiency')) return 'No rolls left this turn (Proficiency).';
  if (e.dice.length >= def.count) return `${def.name} holds at most ${def.count} dice.`;
  if (e.dice.length && e.dice[0].type !== die.type) return 'All dice on a trick must be the same type.';
  return null;
}
export function rollDie(rng, die) {
  const f = DICE[die.type].faces; let v = rng.range(1, f);
  if (die.up.includes('escalate')) v = Math.max(v, rng.range(1, f));
  if (die.up.includes('stabilize')) v = Math.max(v, Math.ceil(f / 2));
  v += die.up.filter((u) => u === 'accelerate').length;
  return v;
}
export function roll(b, s, dieId, e) {
  if (canRoll(b, s, dieId, e)) return null;
  const i = s.pouch.findIndex((d) => d.id === dieId), die = s.pouch.splice(i, 1)[0];
  // a die keeps its value for the turn, so undoing a plan never rerolls it
  const value = s.rolled[dieId] ?? (s.rolled[dieId] = rollDie(b.rng, die));
  const d = { ...die, value };
  e.dice.push(d); s.used.roll++;
  return d;
}
// Flip a standard chip onto a shown trick: it lands as 0 or its worth and counts as a die of any type.
export function canFlip(b, s, r, c, e) {
  const def = TRICKS[e.trick.id], ch = bidChip(s, r, c);
  if (!ch || ch.kind !== 'std') return 'Only an uncovered standard chip on top of a stack can be flipped.';
  if (e.state !== 'shown') return 'A trick that has been bid on cannot take more dice.';
  if (s.used.roll >= tipOf(s, 'proficiency')) return 'No rolls left this turn (Proficiency). A flip uses a roll.';
  if (e.dice.length >= def.count) return `${def.name} holds at most ${def.count} dice.`;
  return null;
}
export function flip(b, s, r, c, e) {
  if (canFlip(b, s, r, c, e)) return null;
  const ch = s.grid[r][c].chips.pop(), key = 'c' + ch.id;
  const value = s.rolled[key] ?? (s.rolled[key] = b.rng.next() < 0.5 ? 0 : ch.value); // keeps its face for the turn, like a die
  const d = { id: key, type: e.dice[0]?.type || TRICKS[e.trick.id].die, up: [], value, chip: ch };
  e.dice.push(d); s.used.roll++;
  return d;
}
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
  s.grid = snap.grid; s.run = snap.run; s.book = snap.book; s.pouch = snap.pouch; s.used = snap.used;
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
function* fee(b, att, def, r, c, amount, o = {}) {
  const cell = def.grid[r][c], st = def.status, who = att ? att.name : 'The House';
  if (!o.pierce && !o.carried && st.evade != null && amount > st.evade) { yield step(b, `${def.name} evades a ${amount}¢ fee.`, [ref(def, r, c)], 'miss'); return; }
  if (!o.pierce && !o.reflected && att && st.reflect > 0) {
    const back = Math.min(st.reflect, amount); amount -= back; if (!st.reflectAll) st.reflect = 0;
    let cc = c, fr = frontRow(att, cc); if (fr < 0) { cc = [...Array(att.dims.cols).keys()].find((x) => frontRow(att, x) >= 0) ?? -1; fr = cc < 0 ? -1 : frontRow(att, cc); }
    yield step(b, `${def.name} reflects ${back}¢ back at ${att.name}.`, [ref(def, r, c)], 'reflect');
    if (fr >= 0) yield* fee(b, def, att, fr, cc, back, { reflected: true });
  }
  if (!o.pierce && !o.carried) amount = Math.max(0, amount - st.resist);
  if (amount <= 0) { yield step(b, `${def.name} resists the fee.`, [ref(def, r, c)], 'miss'); return; }
  const debts = cell.chips.filter((ch) => ch.kind === 'debt');
  let pool = amount + debts.length, paid = 0, blocked = 0, counters = 0, hardStop = false;
  while (pool > 0) {
    const i = o.pierce ? topPayableIdx(cell) : topSolid(cell);
    if (i < 0) break;
    const ch = cell.chips[i];
    if (isShield(ch)) { cell.chips.splice(i, 1); b.fx[ch.id] = 'void'; pool--; blocked++; if (ch.kind === 'counter') counters++; continue; }
    if (cell.hard > 0 && !o.pierce) { cell.chips.splice(i, 1); pay(ch); pool = debts.length; hardStop = true; break; }
    if (pool >= ch.value) { cell.chips.splice(i, 1); pool -= ch.value; pay(ch); } else break;
  }
  function pay(ch) {
    paid += ch.value;
    if (o.glean && att && !addToMeter(b, att, [ch], null, null).length) return;
    b.stage.paid[def.idx] += ch.value; b.fx[ch.id] = 'stage';
  }
  // whatever is left over becomes Debt on the chip that could not be paid; overkill on an emptied stack is lost
  const want = topPayableIdx(cell) >= 0 ? Math.min(pool, 9) : 0;
  const now = cell.chips.filter((ch) => ch.kind === 'debt');
  for (let k = now.length; k > want; k--) { const d = now[k - 1]; cell.chips.splice(cell.chips.indexOf(d), 1); b.fx[d.id] = 'void'; }
  for (let k = now.length; k < want; k++) cell.chips.push(mkChip(b, 'debt', 0));
  if (!solidCount(cell)) for (const ch of cell.chips.splice(0)) b.fx[ch.id] = 'void';
  if (o.element && solidCount(cell) && !hasResist(cell, o.element) && !cell.chips.some((ch) => ch.kind === o.element)) {
    cell.chips.push(mkChip(b, o.element, 0, { life: o.element === 'burn' ? 3 : o.element === 'shock' ? 2 : 99 }));
  }
  if (att) att.dealt += paid;
  let spill = !hardStop && !o.noCarry && topPayableIdx(cell) < 0 ? pool : 0, behind = -1;
  if (spill > 0) for (let rr = r + 1; rr < def.rows; rr++) if (occupied(def.grid[rr][c], o.pierce)) { behind = rr; break; }
  if (behind < 0) spill = 0;
  const bits = [];
  if (paid) bits.push(`${paid}¢ paid${o.glean ? ' straight to their Meter' : ''}`);
  if (blocked) bits.push(`${blocked} blocked`);
  if (want > debts.length) bits.push(`${want - debts.length} Debt added`);
  if (hardStop) bits.push('Hardened stack gives up one chip');
  yield step(b, `${who} charges ${def.name} ${amount}¢${bits.length ? ': ' + bits.join(', ') : ''}${spill > 0 ? ' — the rest carries behind' : ''}.`, [ref(def, r, c)], 'fee');
  // overkill carries on to the next stack behind in the same column
  if (spill > 0) yield* fee(b, att, def, behind, c, spill, { ...o, element: null, reflected: true, carried: true });
  for (let k = 0; k < counters && att; k++) {
    const cols = [...Array(att.dims.cols).keys()].filter((x) => frontRow(att, x) >= 0);
    if (cols.length) { const cc = b.rng.pick(cols); yield* fee(b, def, att, frontRow(att, cc), cc, 1, { reflected: true }); }
  }
}
function cleanse(b, s, n) {
  let done = 0;
  for (const { cell } of allCells(s)) for (const ch of cell.chips.filter(isHazard)) { if (done >= n) return done; cell.chips.splice(cell.chips.indexOf(ch), 1); b.fx[ch.id] = 'void'; done++; }
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
    if (cols.length) { const c = b.rng.pick(cols); yield step(b, `${s.name} plays ${def.name}.`, [], 'play'); yield* fee(b, s, o, frontRow(o, c), c, m, {}); }
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
  const vals = e.dice.map((d) => (!own && s.mods.bend != null ? s.mods.bend : d.value));
  const bonus = bonusMet(s, e) ? def.bonus.k : null;
  let total = sum(vals) + e.lingerTotal * e.dice.length;
  if (!inv) { total += s.mods.boost - s.mods.enfeeble + s.power + (def.type === 'expense' ? s.mods.press : 0); s.power = 0; }
  total = Math.max(0, Math.round(total * (inv ? investMult(e.trick) : trickMult(e.trick) * s.mods.mul) * (def.type === 'expense' ? heat(b.turn) : 1)));
  if (bonus === 'double') total *= 2;
  const tag = `${s.name}'s ${def.name} (${vals.join('+')}${bonus ? ', bonus' : ''})`;
  const t = targetSide(b, s, def);
  const pierce = def.type === 'expense' && (s.mods.pierce || bonus === 'pierce');
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
      const opts = { pierce, glean: bonus === 'glean' };
      if (def.dist === 'rain') {
        const live = allCells(o).filter((x) => occupied(x.cell, pierce)); if (!live.length) { yield step(b, `${tag} finds nothing to hit.`, [], 'miss'); return; }
        const counts = new Map(); for (let i = 0; i < Math.min(total, 200); i++) { const x = b.rng.pick(live); counts.set(x, (counts.get(x) || 0) + 1); }
        yield step(b, `${tag} rains ${total} drops.`, [...counts.keys()].map((x) => ref(o, x.r, x.c)), 'play');
        let first = true; for (const [x, n] of counts) { yield* fee(b, s, o, x.r, x.c, n, { ...opts, element: first ? element : null }); first = false; }
        return;
      }
      const hit = cells.filter(({ r, c }) => occupied(o.grid[r][c], pierce));
      if (!hit.length || total <= 0) { yield step(b, `${tag} comes to nothing.`, [], 'miss'); return; }
      yield step(b, `${tag}: ${def.tax ? 'tax' : total + '¢ fee'} over ${hit.length} space${hit.length > 1 ? 's' : ''}.`, hit.map((x) => ref(o, x.r, x.c)), 'play');
      const per = Math.floor(total / hit.length), rem = total % hit.length;
      for (let i = 0; i < hit.length; i++) {
        const { r, c } = hit[i]; let amt = per + (i < rem ? 1 : 0);
        if (def.tax) amt = Math.max(total, Math.ceil(Math.max(0, cellWorth(o.grid[r][c])) * Math.min(1, total / 10)));
        if (amt > 0) yield* fee(b, s, o, r, c, amt, { ...opts, element: i === 0 ? element : null });
      }
      return;
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
    case 'fence': { let n = 0; for (const { cell } of allCells(s)) for (const ch of cell.chips.filter((x) => x.kind === 'debt')) { if (n >= total) break; cell.chips.splice(cell.chips.indexOf(ch), 1); b.fx[ch.id] = 'void'; n++; }
      addToMeter(b, s, Array.from({ length: n }, () => mkChip(b, 'opp', 1)), null, 'spawn');
      if (bonus === 'blocks') addToMeter(b, s, [mkChip(b, 'block'), mkChip(b, 'block')], null, 'spawn');
      yield step(b, `${tag}: ${n} Debt fenced into Opportunity chips.`, [], 'play'); return; }
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
function* ticks(b) {
  for (const s of b.sides) {
    let burned = 0; const touched = [];
    for (const { r, c, cell } of allCells(s)) for (const h of cell.chips.filter((ch) => ch.kind === 'burn' || ch.kind === 'acid' || ch.kind === 'shock')) {
      if (!cell.chips.includes(h)) continue;
      const drop = () => { cell.chips.splice(cell.chips.indexOf(h), 1); b.fx[h.id] = 'void'; };
      if (hasResist(cell, h.kind)) { drop(); touched.push(ref(s, r, c)); continue; }
      if (h.kind === 'shock') {
        const others = allCells(s).filter((x) => x.cell !== cell && occupied(x.cell));
        for (const x of b.rng.shuffle(others).slice(0, 2)) { if (hasResist(x.cell, 'shock')) continue; yield* fee(b, null, s, x.r, x.c, 1, {}); }
        if (--h.life <= 0) drop(); touched.push(ref(s, r, c)); continue;
      }
      const i = topSolid(cell);
      if (i >= 0) { const v = cell.chips.splice(i, 1)[0]; b.fx[v.id] = 'void'; if (isPayable(v)) { s.destroyed += v.value; burned += v.value; } touched.push(ref(s, r, c)); }
      if (h.kind === 'burn') {
        if (b.rng.chance(0.3)) { const adj = allCells(s).filter((x) => Math.abs(x.r - r) + Math.abs(x.c - c) === 1 && solidCount(x.cell) && !hasResist(x.cell, 'burn') && !x.cell.chips.some((ch) => ch.kind === 'burn'));
          if (adj.length) b.rng.pick(adj).cell.chips.push(mkChip(b, 'burn', 0, { life: 2 })); }
        if (--h.life <= 0) drop();
      }
      if (!solidCount(cell)) { const acid = h.kind === 'acid'; for (const ch of cell.chips.splice(0)) b.fx[ch.id] = 'void'; if (acid) cell.hole = true; }
    }
    if (touched.length) yield step(b, `Hazards work through ${s.name}'s position${burned ? `: ${burned}¢ destroyed` : ''}.`, touched, 'hazard');

    for (let k = 0; k < s.familiars; k++) {
      const n = cleanse(b, s, 1); const cr = b.creatures.find((x) => x.side === s.idx && !x.gone && x.r >= 0);
      const chased = cr && b.rng.chance(0.5); if (chased) cr.gone = true;
      if (n || chased) yield step(b, `${s.name}'s Familiar ${n ? 'clears a chip' : ''}${n && chased ? ' and ' : ''}${chased ? 'chases a creature away' : ''}.`, [], 'familiar');
    }
    if (s.spawners && b.turn % 3 === 0) for (let k = 0; k < s.spawners; k++) b.creatures.push({ id: b.nextId++, kind: b.rng.pick(['ufo', 'fairy', 'dragon']), side: s.idx, r: -1, c: 0, life: 2, arrive: b.turn });
    for (const cr of b.creatures.filter((x) => x.side === s.idx && !x.gone && x.arrive <= b.turn)) {
      const live = allCells(s).filter((x) => occupied(x.cell));
      if (!live.length) { cr.gone = true; continue; }
      const x = b.rng.pick(live), i = topSolid(x.cell); cr.r = x.r; cr.c = x.c; let text = '';
      if (cr.kind === 'ufo') { const v = x.cell.chips.splice(i, 1)[0]; b.fx[v.id] = 'abduct'; if (isPayable(v)) s.destroyed += v.value; text = 'A UFO abducts a chip'; }
      else if (cr.kind === 'dragon') { if (!hasResist(x.cell, 'burn') && !x.cell.chips.some((ch) => ch.kind === 'burn')) x.cell.chips.push(mkChip(b, 'burn', 0, { life: 3 })); text = 'A Dragon breathes fire on a stack'; }
      else { const v = x.cell.chips[i]; const kinds = ['std', 'std', 'opp', 'block', 'gold', 'debt']; const k = b.rng.pick(kinds); delete v.gold; delete v.resist;
        if (k === 'gold') { v.kind = 'std'; v.value = Math.max(1, v.value); v.gold = true; } else if (k === 'std') { v.kind = 'std'; v.value = b.rng.pick([1, 2, 5, 10].filter((d) => d <= Math.max(2, b.rules.maxDenom))); }
        else if (k === 'debt') { if (topPayableIdx(x.cell) >= 0 && x.cell.chips.filter(isPayable).length > 1) { x.cell.chips.splice(i, 1); v.kind = 'debt'; v.value = 0; x.cell.chips.push(v); } }
        else { v.kind = k; v.value = k === 'opp' ? 1 : 0; }
        text = 'A Fairy transforms a chip. Chaos reigns!'; }
      if (!solidCount(x.cell)) for (const ch of x.cell.chips.splice(0)) b.fx[ch.id] = 'void';
      if (--cr.life <= 0) cr.gone = true;
      yield step(b, `${text} in ${s.name}'s position${cr.gone ? ', then leaves' : ''}.`, [ref(s, x.r, x.c)], 'creature');
    }
    for (const cal of s.calamities) {
      if (cal === 'inferno') { const live = allCells(s).filter((x) => solidCount(x.cell) && !x.cell.chips.some((ch) => ch.kind === 'burn') && !hasResist(x.cell, 'burn'));
        if (live.length) { const x = b.rng.pick(live); x.cell.chips.push(mkChip(b, 'burn', 0, { life: 3 })); yield step(b, `${CALAMITIES.inferno.name}: a stack catches fire.`, [ref(s, x.r, x.c)], 'hazard'); } }
      if (cal === 'audit' && b.turn % 2 === 0) for (let c = 0; c < s.dims.cols; c++) { const r = frontRow(s, c); if (r >= 0) yield* fee(b, null, s, r, c, 1, {}); }
    }
    // Debt that has reached the value of the chip beneath it collects that chip
    for (const { cell } of allCells(s)) {
      for (;;) { const i = topPayableIdx(cell), d = cell.chips.filter((ch) => ch.kind === 'debt'); if (i < 0 || d.length < cell.chips[i].value || !d.length) break;
        const ch = cell.chips.splice(i, 1)[0]; b.stage.paid[s.idx] += ch.value; b.fx[ch.id] = 'stage';
        for (const x of d.slice(0, ch.value)) { cell.chips.splice(cell.chips.indexOf(x), 1); b.fx[x.id] = 'void'; } }
      if (!solidCount(cell) && cell.chips.length) for (const ch of cell.chips.splice(0)) b.fx[ch.id] = 'void';
    }
  }
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
  const first = b.rng.int(2);
  plays.sort((x, y) => TYPES[TRICKS[x.e.trick.id].type].order - TYPES[TRICKS[y.e.trick.id].type].order || (x.s.idx === first ? 0 : 1) - (y.s.idx === first ? 0 : 1));
  let called = null;
  for (const p of plays) {
    const type = TRICKS[p.e.trick.id].type;
    if (type !== called) { called = type; b.ctx = { phase: type }; yield step(b, `The House calls ${TYPES[type].name}s.`, [], 'phase'); }
    b.ctx = { phase: type, who: p.s.idx, uid: p.e.uid };
    yield* play(b, p.s, p.e);
  }
  b.ctx = { phase: 'house' };
  // finished tricks and their dice go back to the Book and Pouch
  let done = 0;
  for (const { s, e } of plays) {
    if (e.lingerLeft > 0) { e.lingerLeft--; continue; }
    s.run.splice(s.run.indexOf(e), 1); s.book.push(e.trick); done++;
    for (const d of e.dice) { if (d.chip) { delete d.chip.flip; addToMeter(b, s, [d.chip], null, 'spawn'); } else { const { value, ...die } = d; s.pouch.push(die); } } // a flipped chip comes back to the Meter
  }
  if (done) yield step(b, '', [], 'return');
  yield* ticks(b);
  // who is broke?
  for (const s of b.sides) if (worth(s) <= 0 && s.interventions > 0 && b.stage.paid[s.idx] > 0) {
    s.interventions--; s.intervened = true;
    for (const { cell } of allCells(s)) for (const ch of cell.chips.filter(isHazard)) { cell.chips.splice(cell.chips.indexOf(ch), 1); b.fx[ch.id] = 'void'; }
    const chips = makeChange(b, b.stage.paid[s.idx]); let back = 0;
    for (const ch of chips) { const spot = allCells(s).reverse().find((x) => capacityLeft(s, x.cell) > 0); if (!spot) break; spot.cell.chips.push(ch); b.fx[ch.id] = 'from-stage'; back += ch.value; }
    b.stage.paid[s.idx] -= back;
    yield step(b, `Intervention! ${back}¢ of ${s.name}'s fees are restored.`, [], 'bonus');
  }
  // rewards for actions left unused
  for (const s of b.sides) {
    if (b.sides.some((x) => worth(x) <= 0)) break;
    const unbid = Math.max(0, tipOf(s, 'ingenuity') - s.used.bid), unrolled = Math.max(0, tipOf(s, 'proficiency') - s.used.roll), undrawn = Math.max(0, tipOf(s, 'trickery') - s.used.draw);
    const stolen = recoup(b, s, cOf(s, 'charisma') * unbid, true);
    const opps = cOf(s, 'cunning') * unrolled; if (opps) addToMeter(b, s, Array.from({ length: opps }, () => mkChip(b, 'opp', 1)), null, 'spawn');
    const pow = cOf(s, 'conviction') * undrawn; s.power += pow;
    const bits = []; if (stolen) bits.push(`steals ${stolen}¢ from the Stage`); if (opps) bits.push(`gains ${opps} Opportunity`); if (pow) bits.push(`gains ${pow} Power`);
    b.ctx = { phase: 'house', who: s.idx };
    if (bits.length) yield step(b, `${s.name} ${bits.join(', ')}.`, [], 'bonus');
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
