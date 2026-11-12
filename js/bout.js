// Bout engine. Pure logic, no DOM. A bout is two Rollers, each with a Position
// (a grid of chip stacks: Meter rows in front, Bar rows behind), a Book of tricks,
// a Pouch of dice and a Run of shown tricks.
// A turn has three planning phases that both Rollers go through together: Draw, Roll, Bid.
// Each phase needs at least one action (where one is possible) and closing it ends that kind
// of action for the turn. advance() closes a phase for both; after Bid, resolve() plays each
// effect type for both Rollers at once and yields a step after each visible change.
// Fees go out as Debt first; the House then settles every stack that took Debt.
import { RNG, sum, clone, clamp, order1D } from './util.js';
import { rollDie, boutCopy, facesOf, upgrade as upgradeFaces } from './dice.js';
export { rollDie };
import { DIE_UPGRADES, TRICKS, TYPES, DICE, DIST, QMULT, HAZARD_KINDS, CALAMITIES, CREATURES, ORBITALS, FELTS, shopVars, resistsOf, SHOP_CHIPS, INSTANCE_SHIELDS, SEQS } from './data.js';

export const PHASES = ['draw', 'roll', 'bid', 'aim']; // 'aim' is shown as the Bluff
export const LAST_CALL = 8;
export const heat = (turn) => (turn > LAST_CALL ? 1 + 0.25 * (turn - LAST_CALL) : 1);
export const trickMult = (t) => QMULT[t.q] * (1 + 0.25 * (t.up || 0));
const investMult = (t) => 1 + (t.q - 1) * 0.5 + 0.25 * (t.up || 0);
// the multiplier a trick applies to its roll total, and the size of its Trait
export const multOf = (t) => (TRICKS[t.id].type === 'investment' ? investMult(t) : trickMult(t));
export const traitOf = (t) => Math.max(1, Math.round(trickMult(t)));
// a trick as it plays: one upgrade higher for each Upgrade chip bid on it
export const effTrick = (e) => (e.upBoost ? { ...e.trick, up: (e.trick.up || 0) + e.upBoost } : e.trick);
export const isPayable = (ch) => ch.kind === 'std' || ch.kind === 'opp' || ch.kind === 'bounty';
export const isHazard = (ch) => HAZARD_KINDS.includes(ch.kind);
export const isShield = (ch) => ch.kind === 'block' || ch.kind === 'counter' || INSTANCE_SHIELDS.includes(ch.kind);
const SPREAD = { scorch: 'drop' };

// ---------- position helpers ----------
export const cellWorth = (cell) => sum(cell.chips, (ch) => (isPayable(ch) ? ch.value : ch.kind === 'debt' ? -ch.value : 0));
export const debtOf = (cell) => sum(cell.chips, (ch) => (ch.kind === 'debt' ? ch.value : 0));
export const worth = (s) => sum(s.grid.flat(), cellWorth);
export const occupied = (cell, payOnly) => cell.chips.some((ch) => isPayable(ch) || (!payOnly && isShield(ch)));
const tiny = (ch) => ch.kind === 'little'; // Little chips take no height
export const solidCount = (cell) => cell.chips.filter((ch) => !isHazard(ch) && !tiny(ch)).length;
// Holes, the parts of a Big chip or Volcano, Roosts and Puddles take nothing; a dormant Volcano leaves the space lower
export const capacityLeft = (s, cell) => (cell.hole || cell.link || cell.roost || (cell.puddle && !cell.chips.length) ? 0 : Math.max(0, s.dims.stackMax - (cell.cut || 0) - solidCount(cell)));
// Hardened is a chip lying over the stack; its life is the turns left
export const hardOf = (cell) => Math.max(0, ...cell.chips.filter((ch) => ch.kind === 'hard').map((ch) => ch.life));
function setHard(b, cell, n) { const h0 = cell.chips.find((ch) => ch.kind === 'hard'); if (h0) h0.life = Math.max(h0.life, n); else { const h1 = mkChip(b, 'hard', 0, { life: n }); cell.chips.push(h1); b.fx[h1.id] = 'spawn'; } }
const unHard = (b, cell) => { for (const ch of cell.chips.filter((x) => x.kind === 'hard')) { cell.chips.splice(cell.chips.indexOf(ch), 1); b.fx[ch.id] = 'void'; } };
// a Heli-Chipter lifts its stack: it is flying and plays from the bottom
export const lifted = (cell) => cell.chips.some((ch) => ch.shop === 'heli');
export const wet = (cell) => cell.chips.some((ch) => ch.wet > 0);
// Sticky: the first timed modifier on the stack stops counting down
const MODS = ['hard', 'feather', 'regen', 'burn', 'shock', 'corrupt', 'frost', 'lava', 'petal'];
function firstMod(cell) { for (const k of MODS) if (cell.chips.some((ch) => ch.kind === k || ((k === 'feather' || k === 'regen') && ch[k] > 0))) return k; return null; }
export function stuck(cell, what) { const st = cell.chips.find((ch) => ch.kind === 'sticky'); if (!st) return false; if (!st.stuck) st.stuck = firstMod(cell); return st.stuck === what; }
export function frontRow(s, c, payOnly) { for (let r = 0; r < s.rows; r++) if (occupied(s.grid[r][c], payOnly)) return r; return -1; }
export function rearRow(s, c, payOnly) { for (let r = s.rows - 1; r >= 0; r--) if (occupied(s.grid[r][c], payOnly)) return r; return -1; }
const bodyRow = (s, c, payOnly) => { for (let r = s.dims.meterRows; r < s.rows; r++) if (occupied(s.grid[r][c], payOnly)) return r; return -1; };
const topSolid = (cell) => { for (let i = cell.chips.length - 1; i >= 0; i--) if (!isHazard(cell.chips[i])) return i; return -1; };
const topPayableIdx = (cell) => { if (lifted(cell)) { for (let i = 0; i < cell.chips.length; i++) if (isPayable(cell.chips[i])) return i; return -1; } for (let i = cell.chips.length - 1; i >= 0; i--) if (isPayable(cell.chips[i])) return i; return -1; };
// the next chip a fee reaches: the top solid chip, or the bottom one under a Heli-Chipter. Doom chips are skipped.
const nextPay = (cell, pierce) => { if (pierce) return topPayableIdx(cell); const L = lifted(cell), n = cell.chips.length;
  for (let k = 0; k < n; k++) { const i = L ? k : n - 1 - k, ch = cell.chips[i]; if (!isHazard(ch) && ch.kind !== 'doom') return i; } return -1; };
const hasResist = (cell, el) => cell.chips.some((ch) => ch.resist && resistsOf(ch.resist).includes(el));
// a stack topped by a Frozen chip cannot be burned, corrupted, shocked or changed
export const iced = (cell) => { const i = topSolid(cell); return i >= 0 && !!cell.chips[i].frozen; };
const isDynamite = (cell) => cell.chips.length > 0 && cell.chips.every((ch) => ch.kind === 'dynamite');
const isTree = (cell) => cell.chips.length > 0 && cell.chips.every((ch) => ch.kind === 'tree');
const hasShop = (s, id) => s.grid.some((row) => row.some((cell) => cell.chips.some((ch) => ch.shop === id)));
// Fibonacci and Prime chips: two on top of each other merge into the next number after the larger
function mergeSeq(b, cell) {
  let merged = 0;
  for (let i = cell.chips.length - 1; i > 0; i--) {
    const up = cell.chips[i], dn = cell.chips[i - 1];
    if (!up.shop || up.shop !== dn.shop || !SEQS[SHOP_CHIPS[up.shop]?.seq]) continue;
    const seq = SEQS[SHOP_CHIPS[up.shop].seq], top = Math.max(up.value, dn.value);
    dn.value = seq.find((v) => v > top) ?? top * 2; dn.n = (dn.n || 1) + (up.n || 1);
    cell.chips.splice(i, 1); b.fx[up.id] = 'void'; b.fx[dn.id] = 'mutate'; merged++;
  }
  return merged;
}
// shop chips: `resist` holds the SHOP_CHIPS id
export const shopCount = (cell, id) => cell.chips.filter((ch) => ch.resist === id).length;
const anchored = (cell) => shopCount(cell, 'anchor') > 0;
const allCells = (s) => { const out = []; for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.dims.cols; c++) out.push({ r, c, cell: s.grid[r][c] }); return out; };
// solid chips go under the hazards, and under any Little chips unless they are Little themselves
const pushChip = (cell, ch) => { if (isHazard(ch)) cell.chips.push(ch); else { const i = cell.chips.findIndex((x) => isHazard(x) || (!tiny(ch) && tiny(x))); if (i < 0) cell.chips.push(ch); else cell.chips.splice(i, 0, ch); } };
// a Big chip or Volcano covers two spaces by two: the top-left one (`anchor`) holds the stack, the others `link` to it
const homeOf = (s, r, c) => { const l = s.grid[r]?.[c]?.link; return l ? { r: l.r, c: l.c } : { r, c }; };
function freeBlock(s, rows) { for (const r of rows) for (let c = 0; c + 1 < s.dims.cols; c++) { if (r + 1 >= s.rows) continue;
  const q = [s.grid[r][c], s.grid[r + 1][c], s.grid[r][c + 1], s.grid[r + 1][c + 1]]; if (q.every((x) => !x.chips.length && !x.hole && !x.link && !x.roost && !x.anchor)) return { r, c }; } return null; }
function claimBlock(s, r, c) { s.grid[r][c].anchor = true; for (const [dr, dc] of [[1, 0], [0, 1], [1, 1]]) s.grid[r + dr][c + dc].link = { r, c }; }
function freeLinks(s, r, c) { delete s.grid[r][c].anchor; for (const { cell } of allCells(s)) if (cell.link && cell.link.r === r && cell.link.c === c) delete cell.link; }
// electricity: Batteries under a chip in its stack give it one more instance each
const charge = (cell, ch) => { const i = cell.chips.indexOf(ch); return cell.chips.slice(0, Math.max(0, i)).filter((x) => x.shop === 'battery').length; };
// shop chips that are the top solid chip of a stack (Repeater, Mimic, Forgetter, Spy): n is how many chips are under it
function tops(s, id) { const out = []; for (const x of allCells(s)) { const i = topSolid(x.cell); if (i >= 0 && x.cell.chips[i].shop === id) out.push({ ...x, ch: x.cell.chips[i], n: x.cell.chips.slice(0, i).filter((y) => !isHazard(y)).length, charge: charge(x.cell, x.cell.chips[i]) }); } return out; }
export const spying = (s) => tops(s, 'spy').length;
export const sunny = (s) => (s.sky || []).some((o) => o.kind === 'sun');
// a Ghost haunts a row: no trick aims at it and no overkill passes into or through it
export const haunted = (b, side) => new Set((b.creatures || []).filter((cr) => cr.kind === 'ghost' && cr.side === side.idx && !cr.gone && cr.arrive <= b.turn && cr.r >= 0).map((cr) => cr.r));
export const tipOf = (s, k) => Math.max(0, s.tip[k] + (s.turnBonus[k] || 0));
export const cOf = (s, k) => Math.max(0, s.c[k] + (s.turnBonus[k] || 0));

function mkChip(b, kind, value = 0, extra = {}) { return { id: b.nextId++, kind, value, ...extra }; }
const HAZARD_LIFE = { burn: 3, shock: 2, corrupt: 3, boom: 2, acid: 99, poison: 99, frost: 2, lava: 2, hard: 3 };
const mkHazard = (b, kind, life) => mkChip(b, kind, 0, { life: life ?? HAZARD_LIFE[kind] });
// A stack carries at most one Debt marker, showing exactly what it owes. Make it total n (0 removes it).
function setDebt(b, cell, n, how) {
  const cur = cell.chips.filter((ch) => ch.kind === 'debt'), have = sum(cur, (ch) => ch.value);
  if (n === have && cur.length <= 1) return;
  const keep = n > 0 ? cur[0] : null;
  for (const d of cur) { cell.chips.splice(cell.chips.indexOf(d), 1); if (d !== keep) b.fx[d.id] = 'void'; }
  if (n <= 0) return;
  if (keep) { keep.value = n; cell.chips.push(keep); return; }
  const d = mkChip(b, 'debt', n); cell.chips.push(d); if (how) b.fx[d.id] = how;
}
// the chip a stack's Debt is working towards: the top standard or Opportunity chip
export function debtTarget(cell) { const i = topPayableIdx(cell); return i < 0 ? null : cell.chips[i]; }
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
  return cells.filter(({ r, c }) => !s.grid[r][c].hole && !s.grid[r][c].link && !s.grid[r][c].roost);
}
// plan: { chips:[{value,count,resist?}], spacing:'row'|'column'|'random', stacking:'maxed'|'balanced'|'random' }
export function deploy(b, s, plan) {
  const cells = barOrder(s, plan.spacing, b.rng);
  if (!cells.length) return 0;
  const base = [], rest = [], tops = [], spaces = [], meter = [], bigs = [];
  for (const g of plan.chips) for (let i = 0; i < g.count; i++) {
    if (!g.resist) { rest.push(mkChip(b, 'std', g.value)); continue; }
    const X = SHOP_CHIPS[g.resist] || {}, v = X.vars || {}, kind = X.kind || 'std';
    const ch = mkChip(b, kind, X.place === 'big' ? 4 * (b.rules.maxDenom || 1) : kind === 'std' ? g.value : 0, { resist: g.resist, shop: g.resist, ...(v.hits ? { hits: v.hits } : {}), ...(v.turns ? { life: v.turns } : {}), ...(v.dips ? { dips: v.dips } : {}) });
    if (X.place === 'big') ch.big = true;
    if (kind === 'egg') { ch.prog = 0; ch.foe = 1 - s.idx; }
    if (X.place === 'sky') { s.sky.push({ id: ch.id, kind: g.resist, r: -1, c: -1, shop: true }); continue; }
    (X.place === 'top' ? tops : X.place === 'space' ? spaces : X.place === 'meter' ? meter : X.place === 'big' ? bigs : base).push(ch);
  }
  let placed = 0;
  for (const ch of bigs) { // Big chips stack on a Big chip, or take an empty block of two by two
    const on = cells.find((x) => s.grid[x.r][x.c].anchor && s.grid[x.r][x.c].chips.every((y) => y.big) && capacityLeft(s, s.grid[x.r][x.c]) > 0);
    const blk = on || freeBlock(s, [...new Set(cells.map((x) => x.r))].sort((x, y) => y - x));
    if (blk) { if (!on) claimBlock(s, blk.r, blk.c); s.grid[blk.r][blk.c].chips.push(ch); placed += ch.value; }
  }
  const put = (spot, ch) => { s.grid[spot.r][spot.c].chips.push(ch); placed += ch.value; };
  cells.splice(0, cells.length, ...cells.filter((x) => !s.grid[x.r][x.c].link && !s.grid[x.r][x.c].anchor));
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
  // chips that go on top: onto the stacks first, then any open space
  for (const ch of spaces) { // needs an empty space: clear the shortest stack onto the others if there is none
    const hive = ch.kind === 'hive' && cells.find((x) => s.grid[x.r][x.c].chips.length && s.grid[x.r][x.c].chips.every((y) => y.kind === 'hive') && open(x)); // Hive chips stack together
    if (hive) { s.grid[hive.r][hive.c].chips.push(ch); continue; }
    let spot = cells.find((x) => !s.grid[x.r][x.c].chips.length);
    if (!spot) { const short = cells.slice().sort((x, y) => s.grid[x.r][x.c].chips.length - s.grid[y.r][y.c].chips.length)[0], moving = s.grid[short.r][short.c].chips.splice(0);
      for (const m of moving) { const to = cells.find((x) => x !== short && open(x)); if (to) s.grid[to.r][to.c].chips.push(m); else { s.grid[short.r][short.c].chips.push(m); } }
      if (!s.grid[short.r][short.c].chips.length) spot = short; }
    if (spot) s.grid[spot.r][spot.c].chips.push(ch); }
  const D_SEQ = (ch) => !!SEQS[SHOP_CHIPS[ch.shop]?.seq]; // these merge on contact, so a full stack still takes one
  for (const ch of tops) {
    const topOf = (x) => s.grid[x.r][x.c].chips[s.grid[x.r][x.c].chips.length - 1];
    let spot = (ch.shop && D_SEQ(ch) && cells.find((x) => topOf(x)?.shop === ch.shop)) || cells.find((x) => open(x) && solidCount(s.grid[x.r][x.c])); // like chips go together
    const empty = cells.find((x) => open(x) && !solidCount(s.grid[x.r][x.c]));
    if (!spot && empty) { // every stack is full: move one chip to an empty space to make room on top
      const full = cells.find((x) => solidCount(s.grid[x.r][x.c]) >= 2);
      if (full) { s.grid[empty.r][empty.c].chips.push(s.grid[full.r][full.c].chips.pop()); spot = full; }
    }
    spot = spot || empty; if (spot) { s.grid[spot.r][spot.c].chips.push(ch); mergeSeq(b, s.grid[spot.r][spot.c]); }
  }
  if (meter.length) addToMeter(b, s, meter);
  // Resist chips from Resist Cards: at the base of a front Bar stack with room
  for (const r of plan.resistChips || []) {
    const spot = cells.slice().sort((x, y) => x.r - y.r).find((x) => solidCount(s.grid[x.r][x.c]) && open(x) && !s.grid[x.r][x.c].chips.some((ch) => ch.kind === 'resist'));
    if (spot) s.grid[spot.r][spot.c].chips.unshift(mkChip(b, 'resist', 0, { r: Math.min(r, s.dims.stackMax) }));
  }
  return placed;
}
export const barCapacity = (dims, holes = 0) => (dims.barRows * dims.cols - holes) * dims.stackMax;

function mkSide(b, spec, idx) {
  const d = spec.dims, rows = d.meterRows + d.barRows;
  const s = {
    idx, name: spec.name, cls: spec.cls, ai: !!spec.ai, title: spec.title || '', deploy: spec.deploy, why: spec.why || null,
    tip: { ...spec.tip }, c: { ...spec.c }, dims: { ...d }, rows,
    grid: Array.from({ length: rows }, () => Array.from({ length: d.cols }, () => ({ chips: [], hole: false, hard: 0 }))),
    book: spec.tricks.map((t) => ({ ...t })), run: [], pouch: spec.dice.map(boutCopy),
    tray: [], used: { draw: 0, roll: 0, bid: 0 }, power: 0, turnBonus: {}, rolled: {},
    status: { resist: 0, resistNext: 0, evade: null, evadeNext: null, reflect: 0, reflectAll: false, enfeebleNext: 0 },
    mods: { boost: 0, enfeeble: 0, press: 0, bend: null, mul: 1, pierce: false },
    drink: spec.drink ? { ...spec.drink } : null, sipped: false, food: [], roostDragons: 0, sky: [], bees: [], hatsDue: 0, absorbUsed: {}, forgotUsed: {},
    familiars: spec.familiars || 0, interventions: spec.interventions || 0, positionTilt: spec.positionTilt || 0, intervened: false, spawners: spec.spawners || 0, calamities: spec.calamities || [],
    bidsPaid: 0, dealt: 0, destroyed: 0, snap: null,
  };
  // hazard tilts: holes on random spaces
  const spots = b.rng.shuffle(allCells(s)).slice(0, spec.holes || 0);
  for (const { cell } of spots) if (b.rng.chance(1 / 3)) s.hatsDue++; else cell.hole = true; // one in three is a Magic Hat, slipped under a stack once the chips are down
  // calamities that sit on the table take a Bar space of their own
  // Worm Holes open on an empty Meter space; Dragon Roosts (one in two Spawners) take a Bar space
  for (const cal of s.calamities) if (cal === 'wormhole') {
    const free = allCells(s).filter((x) => x.r < d.meterRows && !x.cell.hole); if (free.length) b.rng.pick(free).cell.worm = true;
  }
  let nests = 0;
  for (let k = 0; k < (spec.spawners || 0); k++) {
    const free = allCells(s).filter((x) => x.r >= d.meterRows && !x.cell.hole);
    if (b.rng.chance(0.5) && free.length) { const { cell } = b.rng.pick(free); cell.roost = { id: b.nextId++ }; } else nests++;
  }
  s.spawners = nests;
  for (const cal of s.calamities) if (cal === 'blackhole') {
    const free = allCells(s).filter((x) => x.r >= d.meterRows && !x.cell.hole && !x.cell.roost); if (!free.length) continue;
    const { cell } = b.rng.pick(free); cell.hole = true; cell.black = true;
  } else if (cal === 'volcano') { // a full stack of Volcano chips, two by two where there is room
    const blk = freeBlock(s, b.rng.shuffle([...Array(d.barRows).keys()].map((i) => i + d.meterRows)));
    const at = blk || b.rng.pick(allCells(s).filter((x) => x.r >= d.meterRows && !x.cell.hole && !x.cell.roost && !x.cell.link) || [null]); if (!at) continue;
    if (blk) claimBlock(s, blk.r, blk.c); const cell = s.grid[at.r][at.c]; cell.volcano = 4;
    for (let k = 0; k < d.stackMax; k++) cell.chips.push(mkChip(b, 'volcano', 0));
  } else if (cal === 'tornado') s.sky.push({ id: b.nextId++, kind: 'tornado', r: b.rng.int(rows), c: b.rng.int(d.cols), str: b.rng.range(1, 6) + b.rng.range(1, 6) });
  else if (cal === 'b52') s.sky.push({ id: b.nextId++, kind: 'b52', r: b.rng.int(rows), c: -1 });
  // the table's weather
  for (const w of b.weather) if (w === 'cloud') s.sky.push({ id: b.nextId++, kind: 'cloud', r: b.rng.int(rows), c: b.rng.int(d.cols) }); else if (w === 'sun' || w === 'moon') s.sky.push({ id: b.nextId++, kind: w, r: -1, c: -1 });
  return s;
}

// opts: { seed, a, b, rules:{ maxDenom, maxTurns } }  (a = player side 0, b = opponent side 1)
export function createBout(opts) {
  const b = { rng: new RNG(opts.seed), turn: 1, over: false, winner: null, stage: { paid: [0, 0] }, sides: [], log: [], fx: {}, nextId: 1,
    rules: { maxDenom: 1, maxTurns: 40, ...(opts.rules || {}) }, creatures: [] };
  const F = FELTS[b.rules.felt] || {}; b.weather = F.weather || []; b.cold = !!F.cold;
  b.sides = [mkSide(b, opts.a, 0), mkSide(b, opts.b, 1)];
  [opts.a, opts.b].forEach((spec, i) => {
    const s = b.sides[i];
    deploy(b, s, spec.plan);
    for (const { cell } of allCells(s)) {
      if (shopCount(cell, 'crown')) setHard(b, cell, shopVars('crown').turns);
      const top = cell.chips[cell.chips.length - 1]; // a Seed on a stack of at least 2 sprouts into a Flower
      if (top?.shop === 'seed' && solidCount(cell) >= 2) { top.kind = 'flower'; top.value = 0; top.hits = 1; delete top.resist; }
      mergeSeq(b, cell);
    }
    for (let k = 0; k < s.hatsDue; k++) { const st = allCells(s).filter((x) => x.r >= s.dims.meterRows && solidCount(x.cell) && !x.cell.link && !x.cell.anchor && !x.cell.chips.some((ch) => ch.kind === 'hat'));
      if (st.length) b.rng.pick(st).cell.chips.unshift(mkChip(b, 'hat', 0, { owner: null })); }
    for (let k = 0; k < (spec.shields || 0); k++) addToMeter(b, s, Array.from({ length: s.dims.stackMax }, () => mkChip(b, 'block')));
    for (let k = 0; k < (spec.creatures || 0); k++) b.creatures.push(mkCreature(b, i, b.rng.range(1, 5)));
  });
  startTurn(b);
  return b;
}

// which creatures turn up depends on how big the table plays
function mkCreature(b, side, arrive) {
  const pool = ['ufo', 'fairy', 'dragon', 'mole']; if (b.rules.maxDenom >= 2) pool.push('ghost'); if (b.rules.maxDenom >= 5) pool.push('unicorn'); if (b.rules.maxDenom >= 10) pool.push('mothership', 'ghostship');
  const kind = b.rng.pick(pool);
  return newCreature(b, kind, side, arrive);
}
function newCreature(b, kind, side, arrive, extra = {}) { return { id: b.nextId++, kind, side, r: -1, c: 0, life: CREATURES[kind].life, arrive, dmg: 0, hold: [], ...extra }; }
// A fee instance on a creature takes one of its hits; the last one drives it off and it drops its Bounty
// (a Ghost Ship drops Treasure). Returns true if it is down.
function hurt(b, def, cr, notes) {
  const C = CREATURES[cr.kind]; if (!C.hits) return false;
  cr.dmg = (cr.dmg || 0) + 1; if (cr.dmg < C.hits) { notes.push(`a hit on the ${C.name} (${C.hits - cr.dmg} of ${C.hits} left)`); return false; }
  cr.gone = true; cr.bountied = true;
  const cell = cr.r >= 0 ? def.grid[cr.r][cr.c] : null, drop = [];
  if (C.bounty) drop.push(mkChip(b, 'bounty', C.bounty, { creature: cr.kind }));
  if (cr.kind === 'ghostship') { drop.push(mkChip(b, 'std', b.rng.range(50, 100) + sum(cr.hold, (ch) => ch.value), { gold: true, treasure: true })); if (b.rng.chance(0.1)) drop.push(mkChip(b, 'std', 1, { gold: true, cursed: true })); }
  for (const ch of drop) { if (cell && capacityLeft(def, cell) > 0 && !cell.hole) pushChip(cell, ch); else addToMeter(b, def, [ch], cr.r >= 0 ? { r: cr.r, c: cr.c } : null, 'spawn'); b.fx[ch.id] = b.fx[ch.id] || 'spawn'; }
  notes.push(`the ${C.name} is driven off${C.bounty ? ` and drops a ${C.bounty}¢ Bounty chip` : ''}${cr.kind === 'ghostship' ? ' and its Treasure' : ''}`);
  return true;
}
function startTurn(b) {
  for (const s of b.sides) {
    s.used = { draw: 0, roll: 0, bid: 0 }; s.turnBonus = {}; s.rolled = {}; s.thrown = false; s.heat = heat(b.turn);
    for (const f of s.food || []) { for (const [k, v] of Object.entries(f.mods)) s.turnBonus[k] = (s.turnBonus[k] || 0) + v; f.turns--; } // food still working
    s.food = (s.food || []).filter((f) => f.turns > 0);
    s.mods = { boost: 0, enfeeble: s.status.enfeebleNext, press: 0, bend: null, mul: 1, pierce: false }; s.wardUsed = 0;
    s.paidLast = s.paidTurn || 0; s.paidTurn = 0; // fees paid last turn, for Vengeance
    s.status.enfeebleNext = 0; s.absorbUsed = {}; s.forgotUsed = {};
    const curses = allCells(s).reduce((n, x) => n + x.cell.chips.filter((ch) => ch.cursed).length, 0); s.cursed = curses; // a Cursed chip in your pile: Draw, Roll or Bid 1 lower
    for (let k = 0; k < curses; k++) { const can = ['trickery', 'proficiency', 'ingenuity'].filter((x) => tipOf(s, x) > 1); if (can.length) { const x = b.rng.pick(can); s.turnBonus[x] = (s.turnBonus[x] || 0) - 1; } }
  }
  for (const s of b.sides) { // Power and Control chips on the table
    const pw = sum(allCells(s), (x) => shopCount(x.cell, 'power')), ct = sum(allCells(s), (x) => shopCount(x.cell, 'control'));
    s.mods.boost += pw * (shopVars('power').boost || 0); b.sides[1 - s.idx].mods.enfeeble += ct * (shopVars('control').enfeeble || 0);
  }
  b.creatures = b.creatures.filter((cr) => !cr.gone);
  b.phase = 'draw'; openPhase(b);
}
const snapshot = (s) => { s.snap = clone({ grid: s.grid, run: s.run, book: s.book, pouch: s.pouch, tray: s.tray, used: s.used, thrown: s.thrown, turnBonus: s.turnBonus, food: s.food }); };
// When a phase opens, each Roller's table is recorded as the other may see it (`pub`) until this phase closes,
// and as the point Undo returns to (`snap`).
function openPhase(b) { for (const s of b.sides) { snapshot(s); s.pub = clone({ grid: s.grid, run: s.run }); } }

// ---------- phases ----------
const loose = (e) => e.state !== 'play'; // shown or bid this turn: can still take dice (shown) or bids
const realTypeOf = (e) => e.dice.find((d) => !d.chip)?.type;
const roomOn = (e) => e.state === 'shown' && e.dice.length < TRICKS[e.trick.id].count;
const fitsOn = (d, e) => roomOn(e) && (d.chip || !realTypeOf(e) || realTypeOf(e) === d.type);
const spare = (s, ch) => worth(s) - ch.value > 0; // spending this chip does not leave you broke
export function flippable(s) { const out = []; for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.dims.cols; c++) { const ch = bidChip(s, r, c); if (ch?.kind === 'std' && spare(s, ch)) out.push({ r, c, ch }); } return out; }
export function biddable(s) { const out = []; for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.dims.cols; c++) { const ch = bidChip(s, r, c); if (ch && spare(s, ch)) out.push({ r, c, ch }); } return out; }
// Is the phase's one required action possible at all? If not, the phase can be closed without it.
export function canAct(b, s, phase = b.phase) {
  if (phase === 'aim') return s.run.some((e) => e.state === 'bid' && needsTarget(e) && validTargets(b, s, e).length > 1);
  if (phase === 'draw') return s.book.length > 0 && tipOf(s, 'trickery') > 0;
  if (phase === 'roll') {
    if (s.thrown) return s.tray.some((d) => s.run.some((e) => fitsOn(d, e)));
    if (tipOf(s, 'proficiency') <= 0 || !s.run.some(roomOn)) return false;
    return flippable(s).length > 0 || s.pouch.some((d) => s.run.some((e) => fitsOn(d, e)));
  }
  if (phase === 'bid') return s.run.some(loose) && biddable(s).length > 0;
  return false;
}
export const placedThisTurn = (b, s) => s.run.some((e) => e.dice.some((d) => d.t === b.turn));
// What still stops this Roller closing the current phase, or null.
export function needOf(b, s) {
  if (b.phase === 'draw') return s.used.draw > 0 || !canAct(b, s) ? null : 'Draw at least one trick before you roll.';
  if (b.phase === 'roll') { if (placedThisTurn(b, s) || !canAct(b, s)) return null; return s.thrown ? 'Put at least one rolled die on a trick before you bid.' : 'Pick the dice to roll and roll them first.'; }
  if (b.phase === 'bid') return s.used.bid > 0 || !canAct(b, s) ? null : 'Bid at least one chip before you play.';
  return null;
}
// Close the current phase for both Rollers. Returns false if either still owes its required action (unless forced).
export function advance(b, force = false) {
  if (b.phase === 'drink') return nextTurn(b);
  if (!PHASES.includes(b.phase)) return false;
  if (!force && b.sides.some((s) => needOf(b, s))) return false;
  const i = PHASES.indexOf(b.phase);
  if (b.phase === 'roll') for (const s of b.sides) homeTray(b, s); // dice left in the roll go back to the Pouch
  b.phase = PHASES[i + 1] || 'resolve';
  if (b.phase !== 'resolve') openPhase(b);
  return true;
}
function homeDie(b, s, d) { if (d.chip) addToMeter(b, s, [d.chip], null, 'spawn'); else { const { value, t, ...die } = d; void value; void t; s.pouch.push(die); } } // a flipped chip comes back to the Meter
function homeTray(b, s) { const n = s.tray.length; for (const d of s.tray.splice(0)) homeDie(b, s, d); return n; }

// ---------- food ----------
// Eat a food chip from the top of one of your stacks. Its bonus starts now and runs for its turns.
export function canEat(b, s, r, c) {
  if (b.phase !== 'drink') return 'Eat in the Drink phase, at the end of the round.';
  if (s.ate) return 'One food a round.';
  const cell = s.grid[r]?.[c], i = cell ? topSolid(cell) : -1;
  if (i < 0 || !['food', 'egg'].includes(cell.chips[i].kind)) return 'Only a food chip on top of a stack can be eaten.';
  return null;
}
export function foodOf(s, r, c) { // what eating the top chip here would give: { mods, turns, eat: chips, label }
  const cell = s.grid[r][c], i = topSolid(cell), ch = cell.chips[i], X = SHOP_CHIPS[ch.shop] || {}, F = X.food || { mods: {}, turns: 1 };
  const below = cell.chips.slice(0, i).filter((x) => !isHazard(x));
  if (ch.shop === 'bun' && below.length >= 2 && below[below.length - 1].shop === 'hamburger' && below[below.length - 2].shop === 'bun')
    return { mods: { trickery: 1, proficiency: 1, ingenuity: 1 }, turns: 2, eat: [ch, below[below.length - 1], below[below.length - 2]], label: 'the whole burger' };
  let mods = { ...(F.mods || {}) }, label = X.name || 'it';
  if (F.per) mods = { [F.per]: Math.min(3, below.length) };
  if (F.dip) { const dip = allCells(s).map((x) => x.cell.chips.find((d) => d.kind === 'dip' && d.dips > 0)).find(Boolean);
    if (dip) { mods = Object.fromEntries(Object.entries(mods).map(([k, v]) => [k, v * 2])); label += ', dipped'; return { mods, turns: F.turns || 1, eat: [ch], label, dip }; } }
  return { mods, turns: F.turns || 1, eat: [ch], label };
}
export function eat(b, s, r, c) {
  if (canEat(b, s, r, c)) return null;
  const cell = s.grid[r][c], f = foodOf(s, r, c);
  for (const ch of f.eat) { cell.chips.splice(cell.chips.indexOf(ch), 1); b.fx[ch.id] = 'void'; }
  if (f.dip) { f.dip.dips--; if (f.dip.dips <= 0) for (const x of allCells(s)) { const k = x.cell.chips.indexOf(f.dip); if (k >= 0) { x.cell.chips.splice(k, 1); b.fx[f.dip.id] = 'void'; } } }
  s.ate = true; s.food.push({ mods: f.mods, turns: f.turns, label: f.label }); // works from the next turn
  emptyOut(b, cell);
  return f;
}

// ---------- planning ----------
// The Drink phase closes each round: each Roller may sip their drink once and eat one food chip. What they take
// works from the next turn.
export const canSip = (b, s) => (b.phase !== 'drink' ? 'Sip in the Drink phase, at the end of the round.' : !s.drink || s.drink.sips <= 0 ? 'Nothing left to sip.' : s.sipped ? 'One sip a round.' : null);
export function sip(b, s) {
  if (canSip(b, s)) return false;
  s.drink.sips--; s.sipped = true;
  s.food.push({ mods: { ...s.drink.mods }, turns: 1, label: s.drink.name });
  return true;
}
// is there anything to do in the Drink phase?
export const drinkUseful = (b, s) => !canSip(b, s) || allCells(s).some(({ r, c }) => !canEat(b, s, r, c));
// close the Drink phase and start the next turn
export function nextTurn(b) { if (b.phase !== 'drink' || b.over) return false; b.turn++; startTurn(b); return true; }
const phaseGate = (b, want) => (b.phase === want ? null : PHASES.indexOf(b.phase) < PHASES.indexOf(want) ? `Lock in your ${PHASES[PHASES.indexOf(want) - 1]}s first.` : `${want === 'draw' ? 'Drawing' : want === 'roll' ? 'Rolling' : 'Bidding'} is over for this turn.`);
export function canDraw(b, s, uid) {
  const gate = phaseGate(b, 'draw'); if (gate) return gate;
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
// Rolling is one throw a turn: pick the dice (and any top chips to flip), then throw them all into the roll,
// where each shows its value. Then put them on shown tricks or leave them; at least one must go on a trick.
// Dice can be moved between tricks until the Roll phase closes.
export function canRollOut(b, s, dieId) {
  const gate = phaseGate(b, 'roll'); if (gate) return gate;
  if (s.thrown) return 'You have rolled this turn. Rolling is one throw.';
  if (!s.pouch.some((d) => d.id === dieId)) return 'That die has already been rolled.';
  if (s.used.roll >= tipOf(s, 'proficiency')) return 'No rolls left this turn (Proficiency).';
  return null;
}
// dieIds: dice from the Pouch; flips: [{r,c}] stacks whose top chip is flipped. All land in the roll together.
export function canThrow(b, s, dieIds = [], flips = []) {
  const gate = phaseGate(b, 'roll'); if (gate) return gate;
  if (s.thrown) return 'You have rolled this turn. Rolling is one throw.';
  const n = dieIds.length + flips.length, max = tipOf(s, 'proficiency');
  if (!n) return 'Pick at least one die (or a chip to flip) first.';
  if (n > max) return `You can roll ${max} this turn (Proficiency).`;
  if (dieIds.some((id) => !s.pouch.some((d) => d.id === id))) return 'That die is not in your Pouch.';
  if (new Set(flips.map((f) => f.r + ':' + f.c)).size < flips.length) return 'Each stack can flip one chip.';
  if (flips.some(({ r, c }) => bidChip(s, r, c)?.kind !== 'std')) return 'Only an uncovered standard chip on top of a stack can be flipped.';
  if (flips.length && worth(s) - sum(flips, ({ r, c }) => bidChip(s, r, c).value) <= 0) return 'Flipping those would leave you with nothing.';
  return null;
}
export function throwDice(b, s, dieIds = [], flips = []) {
  if (canThrow(b, s, dieIds, flips)) return null;
  const out = [...dieIds.map((id) => rollOut(b, s, id)), ...flips.map(({ r, c }) => flip(b, s, r, c))];
  s.thrown = true; snapshot(s); // Undo now goes back to the throw, never before it
  return out;
}
export function rollOut(b, s, dieId) {
  if (canRollOut(b, s, dieId)) return null;
  const i = s.pouch.findIndex((d) => d.id === dieId), die = s.pouch.splice(i, 1)[0];
  // a die keeps its value for the turn, so undoing a plan never rerolls it
  const d = { ...die, value: s.rolled[dieId] ?? (s.rolled[dieId] = rollWith(b, s, die)), t: b.turn };
  s.tray.push(d); s.used.roll++;
  return d;
}
// A die as your table rolls it: Upgrade chips on your Meter upgrade every roll; Boosted chips in your position
// raise every die, Cheapened chips in your opponent's lower it.
const countShop = (s, id, rows) => sum(allCells(s).filter((x) => !rows || x.r < s.dims.meterRows), (x) => x.cell.chips.filter((ch) => ch.shop === id).length);
function rollWith(b, s, die) {
  const o = b.sides[1 - s.idx], U = countShop(s, 'upgrade', true);
  let v;
  if (U) { // each Upgrade chip on your Meter puts a random upgrade on this roll only: a risk as much as a help
    const ids = Object.keys(DIE_UPGRADES), temp = boutCopy(die); temp.faces = facesOf(die).map((f) => ({ ...f }));
    for (let k = 0; k < U; k++) { const u = b.rng.pick(ids); temp.faces = upgradeFaces({ ...temp, up: [] }, u, b.rng.int(temp.faces.length), b.rng).faces; if (DIE_UPGRADES[u].roll && !temp.up.includes(u)) temp.up.push(u); }
    v = rollDie(b.rng, temp);
  } else v = rollDie(b.rng, die);
  v += countShop(s, 'boosted') * (shopVars('boosted').die || 0) - countShop(o, 'cheapened') * (shopVars('cheapened').die || 0);
  return Math.max(0, v);
}
// Flip a standard chip: it lands as 0 or its worth and counts as a die of any type.
export function canFlip(b, s, r, c) {
  const gate = phaseGate(b, 'roll'); if (gate) return gate;
  if (s.thrown) return 'You have rolled this turn. Rolling is one throw.';
  const ch = bidChip(s, r, c);
  if (!ch || ch.kind !== 'std') return 'Only an uncovered standard chip on top of a stack can be flipped.';
  if (s.used.roll >= tipOf(s, 'proficiency')) return 'No rolls left this turn (Proficiency). A flip uses a roll.';
  return null;
}
export function flip(b, s, r, c) {
  if (canFlip(b, s, r, c)) return null;
  const ch = bidChip(s, r, c), key = 'c' + ch.id; s.grid[r][c].chips.splice(s.grid[r][c].chips.indexOf(ch), 1);
  const d = { id: key, type: 'd6', up: [], value: s.rolled[key] ?? (s.rolled[key] = b.rng.next() < 0.5 ? 0 : ch.value), chip: ch, t: b.turn };
  s.tray.push(d); s.used.roll++;
  return d;
}
const realType = realTypeOf;
export const holderOf = (s, dieId) => s.run.find((e) => e.dice.some((d) => d.id === dieId)) || null;
// a die on a trick can still be moved while the Roll phase is open, if it was rolled this turn
// Dice rolled this turn can be moved between tricks until the turn is played (through Roll and Bid).
const editing = (b) => b.phase === 'roll' || b.phase === 'bid';
export const canMove = (b, s, dieId) => { const e = holderOf(s, dieId); return editing(b) && !!e && e.state !== 'play' && e.dice.find((d) => d.id === dieId).t === b.turn; };
export function canPlace(b, s, dieId, e) {
  const gate = b.phase === 'bid' ? null : phaseGate(b, 'roll'); if (gate) return gate;
  const def = TRICKS[e.trick.id], d = s.tray.find((x) => x.id === dieId) || (canMove(b, s, dieId) ? holderOf(s, dieId).dice.find((x) => x.id === dieId) : null);
  if (!d) return s.pouch.some((x) => x.id === dieId) ? 'Roll the die first.' : 'That die is committed to its trick.';
  if (e.state === 'play') return 'That trick is already in play.';
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
export function bidChip(s, r, c) {
  const cell = s.grid[r]?.[c]; if (!cell || !cell.chips.length || cell.chips.some((ch) => ch.kind === 'frost')) return null;
  const top = lifted(cell) ? cell.chips.find((ch) => !isHazard(ch)) : cell.chips[cell.chips.length - 1]; // a lifted stack bids from the bottom
  return top && isPayable(top) && !top.gold && !top.frozen ? top : null;
}
// A trick can take any number of bids this turn (one chip per bid); each 1¢ over the first adds a turn of linger.
export function canBid(b, s, e, r, c) {
  const gate = phaseGate(b, 'bid'); if (gate) return gate;
  if (e.state === 'play') return 'That trick is already in play.';
  if (s.used.bid >= tipOf(s, 'ingenuity')) return 'No bids left this turn (Ingenuity).';
  if (!bidChip(s, r, c)) return 'Only an uncovered standard or Opportunity chip on top of a stack can be bid.';
  return null;
}
export function bid(b, s, e, r, c) {
  if (canBid(b, s, e, r, c)) return null;
  const ch = bidChip(s, r, c); s.grid[r][c].chips.splice(s.grid[r][c].chips.indexOf(ch), 1);
  e.bid.push(ch); e.bidValue += ch.value; e.state = 'bid'; s.used.bid++; if (ch.shop === 'upgrade') e.upBoost = (e.upBoost || 0) + 1;
  if (!e.target) e.target = validTargets(b, s, e)[0] || null;
  return ch;
}
// Undo: back to where the current phase opened (or, in the Roll phase, to just after the throw).
export function resetPlan(b, s) {
  const snap = clone(s.snap);
  s.grid = snap.grid; s.run = snap.run; s.book = snap.book; s.pouch = snap.pouch; s.tray = snap.tray; s.used = snap.used; s.thrown = snap.thrown; s.turnBonus = snap.turnBonus; s.food = snap.food;
}
export const needsTarget = (e) => TRICKS[e.trick.id].approach !== 'none' && e.dice.length > 0;
export function targetSide(b, s, def) { return def.side === 'opp' ? b.sides[1 - s.idx] : def.side === 'self' ? s : null; }
export function validTargets(b, s, e, payOnly) {
  const def = TRICKS[e.trick.id], t = targetSide(b, s, def), out = [];
  if (!t || def.approach === 'none') return out;
  const C = t.dims.cols, m = t.dims.meterRows, hidden = t !== s;
  // your opponent cannot aim at a Transpara stack, or a Shadow stack behind a taller one
  const fear = haunted(b, t); // a Ghost's row cannot be aimed at, by either Roller
  const veiled = (r, c) => fear.has(r) || (hidden && (shopCount(t.grid[r][c], 'transpara') > 0 || (shopCount(t.grid[r][c], 'shadow') > 0 && r > 0 && solidCount(t.grid[r - 1][c]) > solidCount(t.grid[r][c]))));
  const push = (r, c) => { if (r >= 0 && !veiled(r, c)) out.push(ref(t, r, c)); };
  if (def.type === 'expense' && def.side === 'opp' && def.approach !== 'none') // creatures over your own stacks can be attacked too
    for (const cr of b.creatures || []) if (cr.side === s.idx && !cr.gone && cr.r >= 0 && cr.arrive <= b.turn && CREATURES[cr.kind]?.hits) out.push(ref(s, cr.r, cr.c));
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
  if (b.phase !== 'aim' && b.phase !== 'bid') return false;
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
// What a trick's total is made of: dice, linger from the bid, Power, Vengeance, the multiplier, Last call, a
// doubling bonus. Boost and Enfeeble join when the trick plays, so the card shows them as they stand now.
export function totalParts(s, e) {
  const def = TRICKS[e.trick.id], inv = def.type === 'investment';
  const dice = sum(e.dice, (d) => d.value), turns = e.state === 'play' ? e.lingerTotal : clamp(e.bidValue - 1, 0, 20);
  const linger = turns * e.dice.length, power = inv ? 0 : s.power, venge = def.vengeance ? s.paidLast || 0 : 0;
  const mult = inv ? investMult(effTrick(e)) : trickMult(effTrick(e)), heatX = def.type === 'expense' ? s.heat || 1 : 1, double = bonusMet(s, e) && def.bonus.k === 'double';
  return { dice: e.dice.map((d) => d.value), diceSum: dice, turns, linger, power, venge, mult, heat: heatX, double, total: previewTotal(s, e) };
}
// what a shown trick would do right now (for previews and the AI)
export function previewTotal(s, e) {
  const def = TRICKS[e.trick.id]; if (!e.dice.length) return 0;
  const linger = e.state === 'play' ? e.lingerTotal : clamp(e.bidValue - 1, 0, 20);
  const raw = sum(e.dice, (d) => d.value) + linger * e.dice.length + (def.type === 'investment' ? 0 : s.power) + (def.vengeance ? s.paidLast || 0 : 0);
  const m = def.type === 'investment' ? investMult(effTrick(e)) : trickMult(effTrick(e));
  return Math.max(0, Math.round(raw * m * (def.type === 'expense' ? s.heat || 1 : 1))) * (bonusMet(s, e) && def.bonus.k === 'double' ? 2 : 1);
}

// ---------- effects ----------
// How a fee total is split over the stacks it covers: evenly, the first stacks taking the odd cents.
function feeShares(o, def, cells, total, pierce, b) {
  cells = cells.map(({ r, c }) => homeOf(o, r, c)).filter((x, i, a) => a.findIndex((y) => y.r === x.r && y.c === x.c) === i); // the parts of a Big chip are one stack
  const hit = cells.filter(({ r, c }) => occupied(o.grid[r][c], pierce) || (b?.creatures || []).some((cr) => cr.side === o.idx && !cr.gone && cr.r === r && cr.c === c)); if (!hit.length || total <= 0) return [];
  const per = Math.floor(total / hit.length), rem = total % hit.length;
  return hit.map(({ r, c }, i) => ({ r, c, amt: def.tax ? Math.max(total, Math.ceil(Math.max(0, cellWorth(o.grid[r][c])) * Math.min(1, total / 10))) : per + (i < rem ? 1 : 0) })).filter((x) => x.amt > 0);
}
// Where a fee trick would land from an origin, as the table stands now.
export function feePlan(b, s, e, origin) {
  const def = TRICKS[e.trick.id]; if (def.roll.k !== 'fee' || def.dist === 'rain' || !e.dice.length || !origin || origin.side === s.idx) return null;
  const o = b.sides[1 - s.idx], bonus = bonusMet(s, e) ? def.bonus.k : null;
  const pierce = s.mods.pierce || bonus === 'pierce', total = previewTotal(s, e);
  const dist = bonus === 'spread' ? SPREAD[e.trick.id] || 'swipe' : bonus === 'aura' ? 'aura' : def.dist;
  const cells = affected(b, o, def, origin, e.dice.length, { dist, payOnly: pierce });
  return { total, pierce, shares: feeShares(o, def, cells, total, pierce) };
}
// Forecast what a fee trick does to each stack, by running the House's own settle on a copy of the table.
// Returns [{ r, c, fee, paid, paidChips, owed, carryIn, carryOut, blocked, lost }] for every stack it touches.
export function forecastFee(b, s, e, origin) {
  const plan = feePlan(b, s, e, origin); if (!plan) return null;
  const lite = (x) => ({ idx: x.idx, name: x.name, dims: x.dims, rows: x.rows, deploy: x.deploy, grid: clone(x.grid), status: clone(x.status), dealt: 0, destroyed: 0 });
  const sim = { rng: new RNG(1), fx: {}, log: [], nextId: 1e9, turn: b.turn, stage: { paid: [0, 0] }, rules: b.rules, sides: b.sides.map(lite), trace: [], creatures: clone(b.creatures || []) };
  const att = sim.sides[s.idx], def = sim.sides[1 - s.idx], out = new Map();
  const at = (r, c) => { const k = r + ':' + c; if (!out.has(k)) out.set(k, { r, c, fee: 0, paid: 0, paidChips: [], owed: 0, carryIn: 0, carryOut: 0, blocked: 0, lost: 0 }); return out.get(k); };
  for (const { r, c, amt } of plan.shares) at(r, c).fee += engage(sim, att, def, r, c, amt, { pierce: plan.pierce }).placed;
  for (let pass = 0; pass < 4 && anyDue(def); pass++) for (const _ of settleSide(sim, def)); // eslint-disable-line no-unused-vars
  for (const t of sim.trace) {
    if (t.side !== def.idx) continue;
    const x = at(t.r, t.c); x.paid += t.paid; x.paidChips.push(...t.paidChips); x.blocked += t.blocked; x.owed = t.left; x.lost += Math.max(0, t.lost);
    if (t.carry) { x.carryOut += t.carry; at(t.behind, t.c).carryIn += t.carry; }
  }
  return [...out.values()];
}
// A fee goes out as Debt chips on the target stack. Nothing is paid until the House settles.
// a Debt chip that lands where there is nothing to pay it: shown, then gone when the House settles
function stray(b, side, r, c, amount, why) {
  const cell = side.grid[r]?.[c]; if (!cell || cell.hole) return;
  const g = mkChip(b, 'stray', amount, { why }); cell.chips.push(g); b.fx[g.id] = 'debt';
}
const clearStrays = (b, s) => { for (const { cell } of allCells(s)) for (const ch of cell.chips.filter((x) => x.kind === 'stray')) { cell.chips.splice(cell.chips.indexOf(ch), 1); b.fx[ch.id] = 'void'; } };
// ---------- lightning and water ----------
// Lightning (a Shocking chip, a Zap's strike, a Cloud's bolt) landing on stack x of side s. Absorption chips on or
// around the stack soak it; a Tesla grabs one strike a turn and sends it back several times; a wet stack passes
// one more instance to a stack next to it. Returns what happened.
function absorbs(b, s, r, c) {
  for (const x of [{ r, c, cell: s.grid[r][c] }, ...around(s, r, c)]) for (const ch of x.cell.chips.filter((y) => y.shop === 'absorb')) {
    const cap = 2 + charge(x.cell, ch); if ((s.absorbUsed[ch.id] || 0) < cap) { s.absorbUsed[ch.id] = (s.absorbUsed[ch.id] || 0) + 1; return true; } }
  return false;
}
function strike(b, s, x, o = {}) {
  if (absorbs(b, s, x.r, x.c)) return 'absorbed';
  if (!o.bounce) { const t = allCells(s).flatMap((y) => y.cell.chips.filter((ch) => ch.shop === 'tesla').map((ch) => ({ ...y, ch })))[0];
    if (t && s.teslaTurn !== b.turn) { s.teslaTurn = b.turn; const foe = b.sides[1 - s.idx], n = 2 + charge(t.cell, t.ch);
      for (const y of b.rng.shuffle(allCells(foe).filter((z) => solidCount(z.cell))).slice(0, n)) strike(b, foe, y, { bounce: true });
      return 'grabbed'; } }
  const cell = x.cell; if (!solidCount(cell) || hasResist(cell, 'shock') || iced(cell) || cell.chips.some((ch) => ch.kind === 'shock')) return 'resisted';
  const h = mkHazard(b, 'shock'); cell.chips.push(h); b.fx[h.id] = 'spawn';
  if (wet(cell) && !o.hop) { const adj = allCells(s).filter((y) => Math.abs(y.r - x.r) + Math.abs(y.c - x.c) === 1 && solidCount(y.cell)); if (adj.length) strike(b, s, b.rng.pick(adj), { ...o, hop: true }); }
  return 'landed';
}
// Water: an empty space (or a Hole) fills into a Puddle, a stack gets wet. Wet chips cannot burn, pass electricity
// on, freeze in the cold and make plants grow faster.
function water(b, s, x) {
  const cell = x.cell; if (cell.link) return;
  if (!solidCount(cell)) { cell.puddle = { t: b.turn, ice: cell.puddle?.ice || false }; return; }
  for (const ch of cell.chips) if (!isHazard(ch)) ch.wet = 2;
  for (const ch of cell.chips.filter((y) => y.kind === 'burn' || y.kind === 'lava')) { cell.chips.splice(cell.chips.indexOf(ch), 1); b.fx[ch.id] = 'void'; }
}
// freeze the top run of value chips on a stack into one Frozen chip (wet ones, or all of them in a Blizzard)
function freezeTop(b, cell, all) {
  const take = []; for (let i = cell.chips.length - 1; i >= 0; i--) { const ch = cell.chips[i]; if (isHazard(ch)) continue; if (ch.kind !== 'std' || ch.gold || ch.resist || ch.big || ch.frozen || (!all && !(ch.wet > 0))) break; take.push(ch); }
  if (!take.length) return 0;
  for (const ch of take) { cell.chips.splice(cell.chips.indexOf(ch), 1); b.fx[ch.id] = 'void'; }
  pushChip(cell, mkChip(b, 'std', sum(take, (ch) => ch.value), { frozen: true })); return take.length;
}
// What a stack can pay before a fee spills on down the lane: its chips and 1¢ shields, less the Debt it already owes.
const canTake = (cell, pierce) => sum(cell.chips, (ch) => (isPayable(ch) ? ch.value : !pierce && (ch.kind === 'block' || ch.kind === 'counter') ? 1 : 0)) - debtOf(cell);
function engage(b, att, def, r, c, amount, o = {}) {
  ({ r, c } = homeOf(def, r, c));
  const cell = def.grid[r][c], st = def.status, notes = [];
  if (o.pierce && hardOf(cell)) { unHard(b, cell); notes.push('the Hardened chip is pierced'); }
  const open = !o.pierce && !o.reflected;
  if (open && st.evade != null && amount > st.evade) return { placed: 0, notes: ['evaded'] };
  if (open && cell.chips.some((ch) => ch.feather > 0) && amount > cellWorth(cell)) return { placed: 0, notes: ['floated past a Feather'] };
  const rr = Math.max(0, ...cell.chips.filter((ch) => ch.kind === 'resist').map((ch) => ch.r));
  if (open && amount < rr) return { placed: 0, notes: [`deterred by a Resist chip (r ${rr})`] };
  { // a creature over the stack takes the fee as one hit instance; the blow that drives it off spills the rest of
    // the fee onto the stack beneath (overkill)
    const cr = (b.creatures || []).find((x) => x.side === def.idx && !x.gone && x.r === r && x.c === c && x.arrive <= (b.turn ?? 0) && CREATURES[x.kind]?.hits);
    if (cr && !o.pierce) { if (!hurt(b, def, cr, notes)) return { placed: 0, notes }; amount -= 1; if (amount <= 0 || !occupied(cell, o.pierce)) return { placed: 0, notes }; }
  }
  { // a Petal, Flower, Clay or Brick on top blocks the entire fee, however big (fee instance defence)
    const ti = nextPay(cell), top = ti >= 0 ? cell.chips[ti] : null; // a lifted stack meets the fee at its bottom
    if (!o.pierce && top && top.kind === 'tree') return { placed: 0, notes: [fell(b, def, r, c)] };
    if (!o.pierce && top && INSTANCE_SHIELDS.includes(top.kind)) { top.hits = (top.hits || 1) - 1; if (top.hits <= 0) { cell.chips.splice(ti, 1); b.fx[top.id] = 'void'; } return { placed: 0, notes: [`blocked whole by a ${top.kind[0].toUpperCase() + top.kind.slice(1)} chip`] }; }
  }
  if (open && att && st.reflect > 0) {
    const back = Math.min(st.reflect, amount); amount -= back; if (!st.reflectAll) st.reflect = 0;
    const cols = [...Array(att.dims.cols).keys()].filter((x) => frontRow(att, x) >= 0);
    if (cols.length) { const cc = cols.includes(c) ? c : cols[0]; engage(b, def, att, frontRow(att, cc), cc, back, { reflected: true }); }
    notes.push(`${back}¢ reflected`);
  }
  if (open && st.resist > 0) { const cut = Math.min(amount, st.resist); amount -= cut; notes.push(`${cut}¢ resisted`); }
  const bumpers = open ? shopCount(cell, 'reducer') : 0;
  if (bumpers && amount > 0) { const cut = Math.min(amount, bumpers * shopVars('reducer').absorb); amount -= cut; notes.push(`${cut}¢ reduced`); }
  const mirrors = !o.reflected && att ? shopCount(cell, 'rebound') : 0;
  if (mirrors && amount > 0) { // the fee is still charged; the mirror sends some back down the same lane
    const back = mirrors * shopVars('rebound').reflect, cols = [...Array(att.dims.cols).keys()].filter((x) => frontRow(att, x) >= 0);
    if (cols.length) { const cc = cols.includes(c) ? c : cols[0]; engage(b, def, att, frontRow(att, cc), cc, back, { reflected: true }); notes.push(`${back}¢ mirrored`); }
  }
  if (amount <= 0) return { placed: 0, notes };
  { const ti = topSolid(cell); if (ti >= 0 && cell.chips[ti].kind === 'bounty') { b.fx[cell.chips[ti].id] = 'void'; cell.chips.splice(ti, 1); notes.push('a Bounty chip breaks'); } }
  const zaps = att && !o.reflected ? cell.chips.filter((ch) => ch.shop === 'zap') : [];
  if (zaps.length) {
    if (amount <= (shopVars('zap').s || 0)) { const cols = b.rng.shuffle([...Array(att.dims.cols).keys()].filter((x) => frontRow(att, x) >= 0));
      const n = 1 + charge(cell, zaps[0]); for (const cc of cols.slice(0, n)) strike(b, att, { r: frontRow(att, cc), c: cc, cell: att.grid[frontRow(att, cc)][cc] });
      if (cols.length) notes.push(n > 1 ? `Zapped back ${n} times` : 'Zapped back'); }
    else { cell.chips.splice(cell.chips.indexOf(zaps[0]), 1); b.fx[zaps[0].id] = 'void'; notes.push('a Zap chip shorts out'); }
  }
  const due = { pierce: o.pierce, glean: o.glean && att ? att.idx : null, att: att ? att.idx : null };
  // overkill spreads right away: what this stack cannot pay goes on down the lane to the stacks behind it
  const fear = haunted(b, def), past = [...Array(def.rows).keys()].filter((y) => y > r), stop = fear.has(r) ? r : past.find((y) => fear.has(y)); // no overkill into or through a Ghost's row
  const lane = [r, ...past.filter((y) => (stop == null || y < stop) && !def.grid[y][c].hole && !def.grid[y][c].link && occupied(def.grid[y][c], o.pierce))];
  let left = amount, last = r;
  for (let k = 0; k < lane.length && left > 0; k++) {
    const y = lane[k], x = def.grid[y][c], hard = hardOf(x) > 0 && !o.pierce;
    const keep = hard ? left : Math.min(left, Math.max(0, canTake(x, o.pierce)));
    if (k === 0 || keep > 0) markDue(x, { ...due, element: k === 0 ? o.element : null });
    if (keep > 0) setDebt(b, x, debtOf(x) + keep, 'debt');
    left -= keep; last = y;
    if (hard) { left = 0; break; }
    const next = lane[k + 1];
    if (left > 0 && next != null) { b.trace?.push({ side: def.idx, r: y, c, owed: 0, paid: 0, paidChips: [], blocked: 0, left: debtOf(x), carry: left, behind: next, lost: 0 }); if (k === 0) notes.push(`${left}¢ overkill spills down the lane`); }
  }
  if (left > 0) { // nothing behind: the overkill is wasted, shown on the space past the last stack
    const back = [...Array(def.rows).keys()].filter((y) => y > last && (stop == null || y < stop) && !def.grid[y][c].hole && !def.grid[y][c].link && !def.grid[y][c].chips.length)[0];
    if (back != null) stray(b, def, back, c, left, stop != null ? 'a Ghost stops it passing on' : 'overkill with no stack behind');
    b.trace?.push({ side: def.idx, r: last, c, owed: 0, paid: 0, paidChips: [], blocked: 0, left: debtOf(def.grid[last][c]), carry: 0, behind: -1, lost: left });
    notes.push(`${left}¢ overkill wasted`);
  }
  return { placed: amount - left, notes };
}
function markDue(cell, o) {
  const due = cell.due || (cell.due = { prior: debtOf(cell), pierce: false, glean: null, element: null, att: null });
  if (o.pierce) due.pierce = true; if (o.glean != null) due.glean = o.glean; if (o.element) due.element = o.element; if (o.att != null) due.att = o.att;
}
const anyDue = (s) => allCells(s).some((x) => x.cell.due);
// The House settles one Roller's stacks, front to back. On each stack that owes:
//   1. shields on top absorb 1¢ each;
//   2. chips are paid from the top, each only if the Debt covers its whole value;
//   3. what cannot cover the next chip stays on the stack as Debt, until a later fee tops it up;
//   4. if the stack runs out of chips, the rest (overkill) moves to the next stack behind it in the same lane
//      (column). It never moves sideways. A Hardened stack pays one chip a fee and nothing carries on.
// Ward chips: the House cancels the largest fees charged to this position this turn before settling.
function* ward(b, s) {
  const per = shopVars('ward').per || 1, have = sum(allCells(s), (x) => shopCount(x.cell, 'ward')) * per;
  while ((s.wardUsed || 0) < have) {
    let best = null;
    for (const x of allCells(s)) if (x.cell.due) { const add = debtOf(x.cell) - x.cell.due.prior; if (add > 0 && (!best || add > best.add)) best = { ...x, add }; }
    if (!best) return;
    s.wardUsed = (s.wardUsed || 0) + 1; setDebt(b, best.cell, best.cell.due.prior); best.cell.due = null;
    yield step(b, `${s.name}'s Ward cancels a ${best.add}¢ fee.`, [ref(s, best.r, best.c)], 'bonus');
  }
}
function* settleSide(b, s) {
  clearStrays(b, s);
  yield* ward(b, s);
  for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.dims.cols; c++) {
    const cell = s.grid[r][c], due = cell.due; if (!due) continue; cell.due = null;
    const att = due.att != null ? b.sides[due.att] : null, owed = debtOf(cell);
    let pool = owed, blocked = 0, counters = 0, hardStop = false, carry = 0, behind = -1;
    const paidChips = [], shieldNames = []; let regen = [];
    while (pool > 0) {
      const i = nextPay(cell, due.pierce); if (i < 0) break;
      const ch = cell.chips[i];
      if (INSTANCE_SHIELDS.includes(ch.kind)) { blocked += pool; pool = 0; ch.hits = (ch.hits || 1) - 1; if (ch.hits <= 0) { cell.chips.splice(i, 1); b.fx[ch.id] = 'void'; } shieldNames.push(ch.kind); break; }
      if (isShield(ch)) { cell.chips.splice(i, 1); b.fx[ch.id] = 'void'; pool--; blocked++; if (ch.kind === 'counter') counters++; continue; }
      if (hardOf(cell) > 0 && !due.pierce) { cell.chips.splice(i, 1); paidChips.push(ch); pool = Math.min(pool, due.prior); hardStop = true; break; }
      if (pool >= ch.value) { cell.chips.splice(i, 1); pool -= ch.value; paidChips.push(ch); } else break;
    }
    const paid = sum(paidChips, (ch) => ch.value); s.paidTurn = (s.paidTurn || 0) + paid;
    regen = paidChips.filter((ch) => ch.regen > 0); // Regen: a paid chip comes straight back, without its Regen
    for (const ch of regen) { paidChips.splice(paidChips.indexOf(ch), 1); delete ch.regen; if (capacityLeft(s, cell) > 0) pushChip(cell, ch); else addToMeter(b, s, [ch], { r, c }, null); b.fx[ch.id] = 'mutate'; }
    for (const ch of paidChips) { if (due.glean != null && !addToMeter(b, b.sides[due.glean], [ch], null, null).length) continue; b.stage.paid[s.idx] += ch.value; b.fx[ch.id] = 'stage'; }
    if (pool > 0 && topPayableIdx(cell) < 0) { // nothing left here to owe against: overkill goes down the lane
      const fear = haunted(b, s); if (!hardStop && !fear.has(r)) for (let rr = r + 1; rr < s.rows; rr++) { if (fear.has(rr)) break; if (occupied(s.grid[rr][c], due.pierce)) { behind = rr; break; } }
      if (behind >= 0) { carry = pool; const nx = s.grid[behind][c]; markDue(nx, { pierce: due.pierce, glean: due.glean, att: due.att }); setDebt(b, nx, debtOf(nx) + carry, 'debt'); }
      pool = 0;
    }
    const lost = owed - paid - blocked - pool - carry - sum(regen, (ch) => ch.value); // overkill with nowhere to go, or stopped by Hardening
    setDebt(b, cell, pool);
    const next = debtTarget(cell);
    if (!solidCount(cell)) for (const ch of cell.chips.splice(0)) b.fx[ch.id] = 'void';
    if (due.element === 'shock') strike(b, s, { r, c, cell });
    else if (due.element && solidCount(cell) && !iced(cell) && !hasResist(cell, due.element) && !cell.chips.some((ch) => ch.kind === due.element) && !(wet(cell) && (due.element === 'burn' || due.element === 'lava'))) cell.chips.push(mkHazard(b, due.element));
    if (due.element === 'frost' && (wet(cell) || b.cold)) freezeTop(b, cell);
    if (att) att.dealt += paid;
    b.trace?.push({ side: s.idx, r, c, owed, paid, paidChips: paidChips.map((ch) => ch.value), blocked, left: pool, carry, behind, lost, hardStop });
    for (let k = 0; k < counters && att; k++) { // each Counter chip sends 1¢ of Debt back; it is settled in the next pass
      const cols = [...Array(att.dims.cols).keys()].filter((x) => frontRow(att, x) >= 0);
      if (cols.length) { const cc = b.rng.pick(cols); engage(b, s, att, frontRow(att, cc), cc, 1, { reflected: true }); }
    }
    const bits = [];
    if (blocked) bits.push(shieldNames.length ? `${blocked}¢ taken by a ${shieldNames[0]} chip` : `${blocked} blocked${counters ? ` (${counters} countered)` : ''}`);
    if (hardStop) bits.push('Hardened: one chip only');
    if (regen.length) bits.push(`${regen.length} Regen chip${regen.length > 1 ? 's come' : ' comes'} straight back`);
    if (pool) bits.push(`${pool}¢ stays as Debt${next ? ` until it reaches the ${next.value}¢ chip's value` : ''}`);
    if (carry) bits.push(`${carry}¢ overkill carries to the stack behind`);
    else if (lost > 0 && !hardStop) bits.push(`${lost}¢ overkill has no stack behind it`);
    const list = paidChips.length > 1 ? ` (${paidChips.map((ch) => ch.value).join(' + ')})` : '';
    const head = paid ? `${s.name} pays ${paid}¢${list}${due.glean != null ? ` straight to ${b.sides[due.glean].name}'s Meter` : ' to the Stage'}`
      : `${s.name} owes ${owed}¢${next && pool ? `, short of the ${next.value}¢ chip on top` : ''}`;
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
    for (const ch of cell.chips.filter((x) => (isHazard(x) && x.kind !== 'debt' && x.kind !== 'hard') || x.kind === 'dynamite' || x.kind === 'doom')) { if (done >= n) return done; cell.chips.splice(cell.chips.indexOf(ch), 1); b.fx[ch.id] = 'void'; done++; }
    const d = debtOf(cell); if (d && done < n) { const take = Math.min(d, n - done); setDebt(b, cell, d - take); done += take; }
  }
  return done;
}
// ---------- arrangements ----------
// Move chips around a position. Lane moves (forward, back, by type, by value) re-deal the solid chips of each
// lane into its spaces in a new order; row moves (up, down) slide whole stacks along a row. Anchored stacks,
// Holes, Black Holes, Volcanoes and Dynamite stay put. Debt and hazards stay on their space, or follow the
// chips to the nearest stack in the lane if their space ends up empty. Returns how many chips changed space.
const fixedCell = (cell) => cell.hole || cell.black || cell.volcano > 0 || cell.link || cell.anchor || cell.roost || anchored(cell) || isDynamite(cell) || isTree(cell);
const valueOf = (ch) => (isPayable(ch) ? ch.value : 0);
const ARRANGE = {
  front: { dir: 'front', key: () => 0 },
  back: { dir: 'back', key: () => 0 },
  shields: { dir: 'front', key: (ch) => (isShield(ch) ? 0 : 1) },
  'value-front': { dir: 'front', key: (ch) => -valueOf(ch) },
  'value-back': { dir: 'front', key: (ch) => valueOf(ch) },
  'opp-value-front': { dir: 'front', key: (ch) => -valueOf(ch) },
  'opp-shields-back': { dir: 'back', key: (ch) => (isShield(ch) ? 0 : 1) },
};
export function arrange(b, s, mode, cells) {
  if (mode === 'up' || mode === 'down') return slideRows(b, s, mode, cells);
  const A = ARRANGE[mode], lanes = cells ? [...new Set(cells.map((x) => x.c))] : [...Array(s.dims.cols).keys()];
  let moved = 0;
  for (const c of lanes) {
    const rows = [...Array(s.rows).keys()].filter((r) => !fixedCell(s.grid[r][c]));
    if (A.dir === 'back') rows.reverse(); // the end the chips gather at comes first
    const where = new Map(), solids = [], loose = [];
    for (const r of rows) { const cell = s.grid[r][c];
      for (let i = cell.chips.length - 1; i >= 0; i--) { const ch = cell.chips[i]; if (isHazard(ch)) loose.push({ r, ch }); else { solids.push(ch); where.set(ch, r); } }
      cell.chips = []; }
    const order = solids.map((ch, i) => ({ ch, i })).sort((x, y) => A.key(x.ch) - A.key(y.ch) || x.i - y.i).map((x) => x.ch);
    let k = 0;
    for (const r of rows) { const cell = s.grid[r][c], put = order.slice(k, k + s.dims.stackMax); k += put.length;
      for (const ch of put.reverse()) { cell.chips.push(ch); if (where.get(ch) !== r) moved++; } } // first in order ends on top
    for (const { r, ch } of loose.reverse()) { // Debt and hazards: their own space, or the nearest stack in the lane
      const home = s.grid[r][c].chips.some((x) => !isHazard(x)) ? r : rows.filter((rr) => s.grid[rr][c].chips.some((x) => !isHazard(x))).sort((x, y) => Math.abs(x - r) - Math.abs(y - r))[0];
      if (home == null) { b.fx[ch.id] = 'void'; continue; }
      if (ch.kind === 'debt') setDebt(b, s.grid[home][c], debtOf(s.grid[home][c]) + ch.value); else s.grid[home][c].chips.push(ch);
    }
    for (const r of rows) hatDown(s.grid[r][c]);
  }
  return moved + consumeBlack(b, s);
}
// a Magic Hat always sits at the bottom of its stack
const hatDown = (cell) => { const i = cell.chips.findIndex((ch) => ch.kind === 'hat'); if (i > 0) cell.chips.unshift(cell.chips.splice(i, 1)[0]); };
// when a Correction moves chips, a Black Hole consumes the bottom chip of every stack next to it
function consumeBlack(b, s) { let n = 0;
  for (const { r, c, cell } of allCells(s)) if (cell.black) for (const x of around(s, r, c)) { if (!solidCount(x.cell) || anchored(x.cell) || fixedCell(x.cell)) continue;
    const i = x.cell.chips.findIndex((ch) => !isHazard(ch)), v = x.cell.chips.splice(i, 1)[0]; b.fx[v.id] = 'void'; if (isPayable(v)) s.destroyed += v.value; emptyOut(b, x.cell); n++; }
  return n; }
function slideRows(b, s, mode, cells) {
  const rows = cells ? [...new Set(cells.map((x) => x.r))] : [...Array(s.rows).keys()]; let moved = 0;
  for (const r of rows) {
    let lanes = [...Array(s.dims.cols).keys()].filter((c) => !fixedCell(s.grid[r][c]));
    if (mode === 'down') lanes = lanes.reverse();
    const stacks = lanes.map((c) => ({ c, chips: s.grid[r][c].chips, puddle: s.grid[r][c].puddle })).filter((x) => x.chips.length);
    for (const c of lanes) { if (s.grid[r][c].chips.length) delete s.grid[r][c].puddle; s.grid[r][c].chips = []; }
    stacks.forEach((x, i) => { const cell = s.grid[r][lanes[i]]; cell.chips = x.chips; if (lanes[i] !== x.c) moved += x.chips.length; });
  }
  return moved + consumeBlack(b, s);
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

// opt.again: a Repeater or Mimic plays the roll effect once more (no trait) · opt.forgotten: a Forgetter negates it
function* play(b, s, e, opt = {}) {
  const def = TRICKS[e.trick.id], o = b.sides[1 - s.idx], inv = def.type === 'investment';
  const m = Math.max(1, Math.round(trickMult(effTrick(e))));
  // Trait effect: every turn the trick is in play
  if (opt.again) { /* the roll effect only */ } else if (def.type === 'expense') {
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
  if (opt.forgotten) { yield step(b, `${s.name}'s ${def.name} (${e.dice.map((d) => d.value).join('+')}) is forgotten: ${o.name}'s Forgetter negates it.`, [], 'miss'); return; }

  // Roll effect: on the last turn of the linger
  const own = def.roll.k === 'bend' || def.roll.k === 'parlay';
  const fz = s.fz || s.mods; // mods as they stood when the phase was called
  const vals = e.dice.map((d) => (!own && fz.bend != null ? fz.bend : d.value));
  const bonus = bonusMet(s, e) ? def.bonus.k : null;
  let total = sum(vals) + e.lingerTotal * e.dice.length;
  if (!inv) { total += fz.boost - fz.enfeeble + (opt.again ? 0 : s.power) + (def.type === 'expense' ? fz.press : 0) + (def.vengeance ? s.paidLast || 0 : 0); if (!opt.again) s.power = 0; }
  total = Math.max(0, Math.round(total * (inv ? investMult(effTrick(e)) : trickMult(effTrick(e)) * fz.mul) * (def.type === 'expense' ? heat(b.turn) : 1)));
  if (bonus === 'double') total *= 2;
  const tag = `${opt.again ? `${opt.again}: ` : ''}${s.name}'s ${def.name} (${vals.join('+')}${bonus ? ', bonus' : ''})`;
  if (total >= 10 && !opt.again) for (const { cell } of allCells(s)) if (cell.roost) for (const egg of cell.chips.filter((ch) => ch.kind === 'egg')) { // a big trick hatches the eggs on your Roost
    cell.chips.splice(cell.chips.indexOf(egg), 1); b.fx[egg.id] = 'void'; b.creatures.push(newCreature(b, 'dragon', o.idx, b.turn + 1));
    yield step(b, `${tag} hatches an egg on ${s.name}'s Dragon Roost: a Dragon flies at ${o.name}.`, [], 'bonus'); }
  let t = targetSide(b, s, def);
  const pierce = def.type === 'expense' && (fz.pierce || bonus === 'pierce');
  // re-find the origin: positions may have changed since the target was picked
  let origin = null;
  if (t && def.approach !== 'none') {
    const valid = validTargets(b, s, e, pierce), want = e.target || valid[0];
    const far = (x) => (x.side !== want.side ? 1000 : 0) + Math.abs(x.c - want.c) * 10 + Math.abs(x.r - want.r);
    const lane = ['front', 'rear', 'body'].includes(def.approach);
    // the trick keeps its aim: the same lane for front/rear/body, the same space otherwise
    if (valid.length && want) origin = lane ? valid.filter((x) => x.side === want.side && x.c === want.c)[0] : valid.find((x) => x.side === want.side && x.r === want.r && x.c === want.c);
    if (!origin && valid.length && !e.target) origin = valid.slice().sort((x, y) => far(x) - far(y))[0];
    if (!origin) {
      if (def.roll.k === 'fee' && want) { const ws = b.sides[want.side]; stray(b, ws, want.r, want.c, total, 'its target is gone');
        yield step(b, `${tag} lands on an empty space: ${total}¢ of Debt on nothing.`, [ref(ws, want.r, want.c)], 'miss'); return; }
      yield step(b, `${tag} finds no target and fizzles.`, [], 'miss'); return; }
    t = b.sides[origin.side]; // an Expense aimed at a creature over your own stack lands on your side
  }
  const dist = bonus === 'spread' ? SPREAD[e.trick.id] || 'swipe' : bonus === 'aura' ? 'aura' : def.dist;
  const cells = origin ? affected(b, t, def, origin, e.dice.length, { dist, payOnly: pierce }) : [];

  switch (def.roll.k) {
    case 'fee': {
      const element = def.element && (def.bonus.k !== 'element' || bonus === 'element') ? def.element : null;
      const opts = { pierce, glean: bonus === 'glean' }, notes = new Set(); let placed = 0;
      const send = (r, c, amt, el) => { const g = engage(b, s, t || o, r, c, amt, { ...opts, element: el }); placed += g.placed; for (const n of g.notes) notes.add(n.replace(/^\d+¢ /, '')); };
      const tail = () => (notes.size ? ` — partly ${[...notes].join(', ')}` : '');
      if (def.dist === 'rain') {
        const live = allCells(o).filter((x) => occupied(x.cell, pierce)); if (!live.length) { yield step(b, `${tag} finds nothing to hit.`, [], 'miss'); return; }
        const counts = new Map(); for (let i = 0; i < Math.min(total, 200); i++) { const x = b.rng.pick(live); counts.set(x, (counts.get(x) || 0) + 1); }
        let first = true; for (const [x, n] of counts) { send(x.r, x.c, n, first ? element : null); first = false; }
        yield step(b, `${tag} rains ${total} drops: ${placed}¢ of Debt lands${tail()}.`, [...counts.keys()].map((x) => ref(o, x.r, x.c)), placed ? 'play' : 'miss'); return;
      }
      const hit = feeShares(t || o, def, cells, total, pierce, b);
      if (!hit.length) { yield step(b, `${tag} comes to nothing.`, [], 'miss'); return; }
      hit.forEach(({ r, c, amt }, i) => send(r, c, amt, i === 0 ? element : null));
      if (def.plant === 'dynamite') { // light a stack of sticks on the empty space nearest the target
        const free = allCells(o).filter((x) => !x.cell.hole && !x.cell.chips.length).sort((x, y) => Math.abs(x.r - origin.r) + Math.abs(x.c - origin.c) - (Math.abs(y.r - origin.r) + Math.abs(y.c - origin.c)));
        if (free.length) { const n = clamp(Math.floor(total / 4), 2, o.dims.stackMax); for (let k = 0; k < n; k++) free[0].cell.chips.push(mkChip(b, 'dynamite')); notes.add(`${n} sticks of Dynamite lit`); }
      }
      yield step(b, placed ? `${tag}: ${placed}¢ of Debt on ${hit.length} stack${hit.length > 1 ? 's' : ''}${tail()}.` : `${tag}: the fee is ${[...notes].join(', ') || 'lost'}.`, hit.map((x) => ref(t || o, x.r, x.c)), placed || notes.size ? 'play' : 'miss'); return;
    }
    case 'block': { const kind = bonus === 'counter' ? 'counter' : 'block'; const n = Math.min(total, 60);
      addToMeter(b, s, Array.from({ length: n }, () => mkChip(b, kind)), origin, 'spawn');
      yield step(b, `${tag}: ${n} ${kind === 'counter' ? 'Counter' : 'Block'} chips to the Meter.`, origin ? [origin] : [], 'play'); return; }
    case 'harden': { const turns = clamp(Math.floor(total / 4), 1, 5); for (const { r, c } of cells) if (solidCount(s.grid[r][c])) setHard(b, s.grid[r][c], turns);
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
    case 'freeze': { let n = 0;
      for (const { r, c } of cells) { const st = s.grid[r][c].chips, take = [];
        for (let i = st.length - 1; i >= 0 && take.length < total; i--) { const ch = st[i]; if (isHazard(ch) || ch.kind === 'debt') continue; if (ch.kind !== 'std' || ch.gold || ch.resist) break; take.push(ch); }
        if (take.length < 2) continue;
        const sumv = sum(take, (ch) => ch.value); for (const ch of take) { st.splice(st.indexOf(ch), 1); b.fx[ch.id] = 'void'; }
        pushChip(s.grid[r][c], mkChip(b, 'std', sumv, { frozen: true })); n += take.length; }
      yield step(b, `${tag}: ${n ? `${n} chips frozen together` : 'nothing to freeze'}.`, cells.map((x) => ref(s, x.r, x.c)), n ? 'play' : 'miss'); return; }
    case 'regen': { const turns = Math.max(1, Math.floor(total / 4)); let n = 0;
      for (const { r, c } of cells) { const st = s.grid[r][c].chips; for (let i = st.length - 1, left = total; i >= 0 && left > 0; i--) if (isPayable(st[i])) { st[i].regen = Math.max(st[i].regen || 0, turns); left -= st[i].value; n++; } }
      yield step(b, `${tag}: ${n} chip${n === 1 ? '' : 's'} Regen for ${turns} turn${turns > 1 ? 's' : ''}.`, cells.map((x) => ref(s, x.r, x.c)), n ? 'play' : 'miss'); return; }
    case 'sticky': { let n = 0;
      for (const { r, c } of cells) { const cell = t.grid[r][c]; if (!solidCount(cell) || cell.chips.some((ch) => ch.kind === 'sticky')) continue;
        const st = mkChip(b, 'sticky', solidCount(cell), { stuck: firstMod(cell) }); cell.chips.push(st); b.fx[st.id] = 'spawn'; n++; }
      yield step(b, `${tag}: ${n} stack${n === 1 ? '' : 's'} gummed with a Sticky chip.`, cells.map((x) => ref(t, x.r, x.c)), n ? 'play' : 'miss'); return; }
    case 'doom': { let n = 0; const list = bonus === 'aura' ? allCells(t) : cells.map(({ r, c }) => ({ r, c, cell: t.grid[r][c] }));
      for (const x of list) { if (n >= total || !solidCount(x.cell) || capacityLeft(t, x.cell) <= 0 || x.cell.chips[topSolid(x.cell)]?.kind === 'doom') continue; const d = mkChip(b, 'doom', 0, { owner: s.idx }); pushChip(x.cell, d); b.fx[d.id] = 'spawn'; n++; }
      yield step(b, `${tag}: ${n} chip${n === 1 ? '' : 's'} planted.`, list.map((x) => ref(t, x.r, x.c)), n ? 'play' : 'miss'); return; }
    case 'hat': { let n = 0; if (total >= 8) for (const { r, c } of cells) { const cell = t.grid[r][c]; if (!solidCount(cell) || cell.chips.some((ch) => ch.kind === 'hat') || cell.link || cell.anchor) continue; const hat = mkChip(b, 'hat', 0, { owner: s.idx }); cell.chips.unshift(hat); b.fx[hat.id] = 'spawn'; n++; }
      yield step(b, `${tag}: ${n ? `${n} Magic Hat${n > 1 ? 's' : ''} slipped under ${o.name}'s stacks` : 'the trick needs a total of 8'}.`, cells.map((x) => ref(t, x.r, x.c)), n ? 'play' : 'miss'); return; }
    case 'handoff': { let n = 0;
      for (const { r, c } of cells) { const cell = t.grid[r][c], from = allCells(s).find((x) => x.cell.chips.some((ch) => ch.shop === 'uranium')); if (!from || capacityLeft(t, cell) <= 0) continue;
        const u = from.cell.chips.find((ch) => ch.shop === 'uranium'); from.cell.chips.splice(from.cell.chips.indexOf(u), 1); emptyOut(b, from.cell); pushChip(cell, u); n++; }
      yield step(b, `${tag}: ${n ? `${n} Uranium chip${n > 1 ? 's' : ''} handed to ${o.name}` : 'no Uranium to hand off'}.`, cells.map((x) => ref(t, x.r, x.c)), n ? 'play' : 'miss'); return; }
    case 'feather': { const turns = Math.max(1, Math.floor(total / 3)); let n = 0;
      for (const { r, c } of cells) { const i = topPayableIdx(s.grid[r][c]); if (i < 0) continue; const ch = s.grid[r][c].chips[i]; ch.feather = Math.max(ch.feather || 0, turns); n++; }
      yield step(b, `${tag}: ${n} stack${n === 1 ? '' : 's'} Feathered for ${turns} turn${turns > 1 ? 's' : ''}.`, cells.map((x) => ref(s, x.r, x.c)), n ? 'play' : 'miss'); return; }
    case 'saturate': { s.mods.boost += total; const had = o.mods.boost; o.mods.boost = 0; if (bonus === 'extend') o.power = 0;
      yield step(b, `${tag}: other roll effects gain ${total}; ${o.name}'s boosts${had ? ` (${had})` : ''} are subdued${bonus === 'extend' ? ' and their Power drained' : ''}.`, [], 'play'); return; }
    case 'arrange': { const side = def.side === 'opp' ? o : s, all = bonus === 'aura';
      const moved = arrange(b, side, def.arrange, all ? null : cells);
      yield step(b, `${tag}: ${moved} chip${moved === 1 ? '' : 's'} moved in ${side.name}'s position.`, moved ? (all ? allCells(side) : cells).map((x) => ref(side, x.r, x.c)) : [], moved ? 'play' : 'miss'); return; }
    case 'gild': { let n = 0; for (const { r, c } of cells) { let left = total; const st = s.grid[r][c].chips;
        for (let i = st.length - 1; i >= 0 && left > 0; i--) if (st[i].kind === 'std' && !st[i].gold && !st[i].frozen) { st[i].gold = true; left--; n++; } }
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
      if (bonus === 'unharden') for (const { cell } of allCells(o)) unHard(b, cell);
      yield step(b, `${tag}: ${n} chip${n === 1 ? '' : 's'} swept off ${o.name}'s Meter.`, [], 'play'); return; }
    case 'scatter': { const picked = [];
      for (let r = 0; r < o.rows && picked.length < total; r++) for (let c = 0; c < o.dims.cols && picked.length < total; c++) { const cell = o.grid[r][c]; if (anchored(cell)) continue;
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
  const v = cell.chips[i]; if (!v || v.frozen || v.big || ['volcano', 'hat', 'egg', 'hive', 'doom'].includes(v.kind)) return; // Frozen and Big chips cannot be turned into another chip
  const k = b.rng.pick(['std', 'std', 'opp', 'block', 'counter', 'gold', 'debt', 'poison', 'boom']); delete v.gold; delete v.resist; delete v.shop;
  if (k === 'gold') { v.kind = 'std'; v.value = Math.max(1, v.value); v.gold = true; }
  else if (k === 'std') { v.kind = 'std'; v.value = b.rng.pick([1, 2, 5, 10].filter((d) => d <= Math.max(2, b.rules.maxDenom))); }
  else if (k === 'debt') { if (cell.chips.filter(isPayable).length > 1) { cell.chips.splice(i, 1); b.fx[v.id] = 'void'; setDebt(b, cell, debtOf(cell) + 1, 'debt'); } }
  else if (k === 'poison' || k === 'boom') { if (cell.chips.filter(isPayable).length > 1) { cell.chips.splice(i, 1); v.kind = k; v.value = 0; v.life = HAZARD_LIFE[k]; cell.chips.push(v); } }
  else { v.kind = k; v.value = k === 'opp' ? 1 : 0; }
}
// A fee fells a Tree: it falls into Wood chips on the spaces around it, one per chip of height.
function fell(b, s, r, c) {
  const cell = s.grid[r][c], h = cell.chips.length; for (const ch of cell.chips.splice(0)) b.fx[ch.id] = 'void';
  const spots = b.rng.shuffle(around(s, r, c).filter((x) => (x.cell.hole && x.cell.puddle && !x.cell.black) || (!x.cell.hole && !x.cell.black && !x.cell.puddle && capacityLeft(s, x.cell) > 0))).slice(0, Math.min(8, h)); // Wood floats on a flooded Hole
  if (spots.length < Math.min(8, h)) spots.push({ r, c, cell }); // the stump takes one too
  for (const x of spots) pushChip(x.cell, mkChip(b, 'wood', 0, { hits: 2 }));
  return `felled a Tree into ${spots.length} Wood chip${spots.length === 1 ? '' : 's'}`;
}
// What chips do on their own each turn: Flowers bloom, Petals wilt, Harmony clears, Dynamite burns down,
// and temporary chips (Power, Control) settle into plain chips.
function* growth(b, s) {
  const cellsNow = allCells(s);
  // petals wilt, temporary shop chips settle
  for (const { cell } of cellsNow) for (const ch of cell.chips.slice()) {
    if (ch.kind === 'petal' && !stuck(cell, 'petal') && --ch.life <= 0) { cell.chips.splice(cell.chips.indexOf(ch), 1); b.fx[ch.id] = 'void'; }
    else if (ch.life != null && ch.shop && ch.kind === 'std' && --ch.life <= 0) { delete ch.resist; delete ch.shop; delete ch.life; b.fx[ch.id] = 'mutate'; }
  }
  // trees grow; at full height they seed the stacks around them
  const sun = sunny(s) || hasShop(s, 'sun') ? 2 : 1;
  for (const { r, c, cell } of cellsNow) {
    if (!isTree(cell) || cell.chips[0].seeded) continue;
    for (let k = 0; k < sun + (wet(cell) ? 1 : 0) && cell.chips.length < s.dims.stackMax; k++) cell.chips.push(mkChip(b, 'tree', 0, { hits: 1 }));
    if (cell.chips.length >= s.dims.stackMax) {
      cell.chips[0].seeded = true;
      const spots = around(s, r, c).filter((x) => solidCount(x.cell) >= 2 && capacityLeft(s, x.cell) > 0 && !x.cell.chips.some((ch) => ch.kind === 'flower')).slice(0, Math.min(8, cell.chips.length));
      for (const x of spots) pushChip(x.cell, mkChip(b, 'flower', 0, { hits: 1 }));
      if (spots.length) yield step(b, `${s.name}'s Tree is fully grown and seeds ${spots.length} Flower${spots.length > 1 ? 's' : ''}.`, spots.map((x) => ref(s, x.r, x.c)), 'bonus');
    }
  }
  // fibonacci and prime chips merge
  for (const { cell } of cellsNow) mergeSeq(b, cell);
  // flowers bloom one petal per chip they are rooted in, on the stacks around them
  const bloomed = [];
  for (const { r, c, cell } of cellsNow) {
    const fi = cell.chips.findIndex((ch) => ch.kind === 'flower'); if (fi < 0) continue;
    const roots = Math.min(8, cell.chips.slice(0, fi).filter((ch) => !isHazard(ch)).length * sun + (wet(cell) ? 1 : 0)); // watered plants grow faster
    const spots = b.rng.shuffle(around(s, r, c).filter((x) => !x.cell.hole && solidCount(x.cell) && capacityLeft(s, x.cell) > 0 && !x.cell.chips.some((ch) => ch.kind === 'petal' || ch.kind === 'flower'))).slice(0, roots);
    for (const x of spots) { pushChip(x.cell, mkChip(b, 'petal', 0, { hits: 1, life: 2 })); bloomed.push(ref(s, x.r, x.c)); }
  }
  if (bloomed.length) yield step(b, `${s.name}'s Flower blooms ${bloomed.length} Petal${bloomed.length > 1 ? 's' : ''}.`, bloomed, 'bonus');
  // harmony clears hazards nearby, leaving a 1¢ chip in place of a hazard chip
  let cleared = 0; const calm = [];
  for (const { r, c, cell } of cellsNow) for (let k = 0; k < shopCount(cell, 'harmony') * (shopVars('harmony').per || 1); k++) {
    const near = [{ r, c, cell }, ...around(s, r, c)];
    const hz = near.find((x) => x.cell.chips.some((ch) => (isHazard(ch) && ch.kind !== 'debt') || ch.kind === 'dynamite'));
    if (hz) { const ch = hz.cell.chips.find((x) => (isHazard(x) && x.kind !== 'debt') || x.kind === 'dynamite'); hz.cell.chips.splice(hz.cell.chips.indexOf(ch), 1); b.fx[ch.id] = 'void';
      if (capacityLeft(s, hz.cell) > 0 && solidCount(hz.cell)) pushChip(hz.cell, mkChip(b, 'std', 1)); cleared++; calm.push(ref(s, hz.r, hz.c)); continue; }
    const dx = near.find((x) => debtOf(x.cell) > 0); if (dx) { setDebt(b, dx.cell, debtOf(dx.cell) - 1); cleared++; calm.push(ref(s, dx.r, dx.c)); }
  }
  if (cleared) yield step(b, `${s.name}'s Harmony chip${cleared > 1 ? 's clear' : ' clears'} ${cleared} hazard${cleared > 1 ? 's' : ''}.`, calm, 'familiar');
  // eggs hatch: a step a turn, one more on a Roost, one more by heat. A hatched Dragon flies at the egg's foe.
  const hot = sunny(s) || s.calamities.some((k) => k === 'inferno' || k === 'volcano');
  for (const { r, c, cell } of cellsNow) for (const egg of cell.chips.filter((ch) => ch.kind === 'egg')) {
    egg.prog = (egg.prog || 0) + 1 + (cell.roost ? 1 : 0) + (hot || cell.chips.some((ch) => ch.kind === 'burn' || ch.kind === 'lava') ? 1 : 0);
    if (egg.prog < (shopVars('egg').hatch || 5)) continue;
    cell.chips.splice(cell.chips.indexOf(egg), 1); b.fx[egg.id] = 'void'; if (!cell.roost) emptyOut(b, cell);
    const foe = b.sides[egg.foe ?? s.idx]; b.creatures.push(newCreature(b, 'dragon', foe.idx, b.turn + 1));
    yield step(b, `An egg hatches in ${s.name}'s position: a Dragon flies at ${foe.name}.`, [ref(s, r, c)], 'creature');
  }
  // a Magic Hat swallows the chip sitting on it
  for (const { r, c, cell } of cellsNow) { if (cell.chips[0]?.kind !== 'hat') continue; const v = cell.chips.findIndex((ch, i) => i > 0 && !isHazard(ch)); if (v < 0) continue;
    const ch = cell.chips.splice(v, 1)[0]; b.fx[ch.id] = 'abduct'; if (isPayable(ch)) s.destroyed += ch.value;
    yield step(b, `A Magic Hat in ${s.name}'s position swallows a ${isPayable(ch) ? ch.value + '¢ ' : ''}chip.`, [ref(s, r, c)], 'hazard'); }
  // Uranium mutates a chip next to it
  for (const { r, c, cell } of cellsNow) for (let k = 0; k < cell.chips.filter((ch) => ch.shop === 'uranium').length; k++) {
    const near = around(s, r, c).filter((x) => solidCount(x.cell) && !iced(x.cell)); if (!near.length) continue;
    const x = b.rng.pick(near), idx = b.rng.pick(x.cell.chips.map((ch, i) => i).filter((i) => !isHazard(x.cell.chips[i]))); transform(b, x.cell, idx); emptyOut(b, x.cell); b.fx[x.cell.chips[idx]?.id] = 'mutate';
    yield step(b, `Uranium in ${s.name}'s position mutates a chip next to it.`, [ref(s, x.r, x.c), ref(s, r, c)], 'hazard'); }
  // Sprinklers shoot water at the farthest space
  for (const { r, c, cell } of cellsNow) for (const sp of cell.chips.filter((ch) => ch.shop === 'sprinkler')) {
    const d = (x) => Math.max(Math.abs(x.r - r), Math.abs(x.c - c)), far = allCells(s).filter((x) => !x.cell.link), top = Math.max(...far.map(d));
    const hit = b.rng.shuffle(far.filter((x) => d(x) >= top - 1)).slice(0, 1 + charge(cell, sp)); for (const x of hit) water(b, s, x);
    if (hit.length) yield step(b, `${s.name}'s Sprinkler waters ${hit.length} far space${hit.length > 1 ? 's' : ''}.`, hit.map((x) => ref(s, x.r, x.c)), 'bonus'); }
  // Hives send out Bumble Bees; bees sting creatures over your table and pollinate your Flowers into Honey
  const HV = shopVars('hive');
  if (b.turn % (HV.every || 2) === 0) for (const { r, c, cell } of cellsNow) { const n = cell.chips.filter((ch) => ch.kind === 'hive').length;
    for (let k = 0; k < n && s.bees.length < (HV.max || 6); k++) s.bees.push({ id: b.nextId++, r, c, life: 3 }); }
  for (const bee of s.bees) {
    const cr = (b.creatures || []).find((x) => x.side === s.idx && !x.gone && x.r >= 0 && x.arrive <= b.turn && CREATURES[x.kind].hits), notes = [];
    if (cr) { bee.r = cr.r; bee.c = cr.c; hurt(b, s, cr, notes); yield step(b, `A Bumble Bee stings: ${notes.join(', ')}.`, [ref(s, cr.r, cr.c)], 'familiar'); }
    else if (cellsNow.some((x) => x.cell.chips.some((ch) => ch.kind === 'flower')) && b.rng.chance(0.5)) {
      const spot = b.rng.shuffle(cellsNow.filter((x) => solidCount(x.cell) && capacityLeft(s, x.cell) > 0))[0];
      if (spot) { const hn = mkChip(b, 'food', 0, { shop: 'honey', resist: 'honey' }); pushChip(spot.cell, hn); b.fx[hn.id] = 'spawn'; bee.r = spot.r; bee.c = spot.c;
        yield step(b, `A Bumble Bee pollinates ${s.name}'s Flowers and leaves a Honey chip.`, [ref(s, spot.r, spot.c)], 'familiar'); } }
    bee.life--;
  }
  s.bees = s.bees.filter((x) => x.life > 0);
  // Doom: once every one of your stacks is topped with an opponent's Doom chip, each Doom chip charges 1¢ (instance debt)
  { const st = cellsNow.filter((x) => solidCount(x.cell)), doomed = st.filter((x) => { const i = topSolid(x.cell); return i >= 0 && x.cell.chips[i].kind === 'doom' && x.cell.chips[i].owner !== s.idx; });
    if (st.length && doomed.length === st.length) { for (const x of doomed) engage(b, null, s, x.r, x.c, x.cell.chips.filter((ch) => ch.kind === 'doom').length, { reflected: true });
      yield step(b, `Doom! Every one of ${s.name}'s stacks is topped with Doom: ${sum(doomed, (x) => x.cell.chips.filter((ch) => ch.kind === 'doom').length)}¢ of Debt.`, doomed.map((x) => ref(s, x.r, x.c)), 'hazard'); } }
  // dynamite burns down a stick a turn, then goes off
  for (const { r, c, cell } of cellsNow) {
    if (!isDynamite(cell)) continue;
    const stick = cell.chips.pop(); b.fx[stick.id] = 'void';
    if (cell.chips.length) { yield step(b, `Dynamite on ${s.name}'s side burns down: ${cell.chips.length} stick${cell.chips.length > 1 ? 's' : ''} left.`, [ref(s, r, c)], 'hazard'); continue; }
    let lost = 0; const hit = [];
    for (const x of around(s, r, c)) { if (!x.cell.chips.length) continue; for (const ch of x.cell.chips.splice(0)) { b.fx[ch.id] = 'void'; if (isPayable(ch)) lost += ch.value; } hit.push(ref(s, x.r, x.c)); }
    s.destroyed += lost;
    yield step(b, `The Dynamite goes off in ${s.name}'s position: ${lost}¢ destroyed.`, [ref(s, r, c), ...hit], 'hazard');
  }
}
// Orbital chips: weather and vehicles in the sky over a Roller's table, above the flying layer.
function* sky(b, s) {
  const near = (o) => allCells(s).filter((x) => Math.abs(x.r - o.r) + Math.abs(x.c - o.c) <= 1);
  for (const o of s.sky.slice()) {
    if (o.kind === 'cloud') { // drift, then rain: puddles, wet stacks, fire and frost washed off; lightning one turn in four
      const to = b.rng.pick(near(o)); o.r = to.r; o.c = to.c; const x = { r: o.r, c: o.c, cell: s.grid[o.r][o.c] };
      for (const ch of x.cell.chips.filter((y) => ['burn', 'lava', 'frost', 'corrupt', 'hard', 'sticky'].includes(y.kind))) { x.cell.chips.splice(x.cell.chips.indexOf(ch), 1); b.fx[ch.id] = 'void'; }
      if (x.cell.puddle?.ice) x.cell.puddle.ice = false; water(b, s, x);
      let bolt = ''; if (b.rng.chance(0.25)) { const live = allCells(s).filter((y) => solidCount(y.cell)); if (live.length) { const y = b.rng.pick(live); bolt = `, and lightning strikes (${strike(b, s, y)})`; } }
      yield step(b, `A Cloud rains on ${s.name}'s position${bolt}.`, [ref(s, o.r, o.c)], 'weather');
    } else if (o.kind === 'moon') { // the tide: a Puddle spreads
      const p = allCells(s).filter((x) => x.cell.puddle && !x.cell.puddle.ice); if (!p.length) continue;
      const x = b.rng.pick(p), to = allCells(s).filter((y) => Math.abs(y.r - x.r) + Math.abs(y.c - x.c) === 1 && !y.cell.chips.length && !y.cell.puddle && !y.cell.link);
      if (to.length) { const y = b.rng.pick(to); y.cell.puddle = { t: b.turn, ice: false }; x.cell.puddle.t = b.turn; yield step(b, `The tide rises under the Moon: a Puddle spreads in ${s.name}'s position.`, [ref(s, y.r, y.c)], 'weather'); }
    } else if (o.kind === 'blizzard') { // at the end of its turn: short stacks freeze solid, wet chips freeze, Puddles ice over
      let n = 0; for (const { cell } of allCells(s)) { if (cell.puddle) cell.puddle.ice = true; if (solidCount(cell) && solidCount(cell) < o.str) n += freezeTop(b, cell, true) ? 1 : 0; else if (wet(cell)) n += freezeTop(b, cell) ? 1 : 0; }
      s.sky.splice(s.sky.indexOf(o), 1);
      yield step(b, `The Blizzard (strength ${o.str}) passes over ${s.name}'s table: ${n} stack${n === 1 ? '' : 's'} frozen.`, [], 'weather');
    } else if (o.kind === 'b52') { // flies one space along its row, dropping a 52¢ Boom chip
      o.c++; if (o.c >= s.dims.cols) { s.sky.splice(s.sky.indexOf(o), 1); yield step(b, `The B-52 leaves ${s.name}'s airspace.`, [], 'weather'); continue; }
      const cell = s.grid[o.r][o.c]; let hit = false; if (solidCount(cell) && !cell.chips.some((ch) => ch.kind === 'boom')) { const bm = mkHazard(b, 'boom'); bm.power = 52; cell.chips.push(bm); b.fx[bm.id] = 'spawn'; hit = true; }
      yield step(b, `A B-52 flies over ${s.name}'s position${hit ? ' and drops a 52¢ Boom chip' : ''}.`, [ref(s, o.r, o.c)], 'hazard');
    } else if (o.kind === 'tornado') { // moves next door, and throws a stack shorter than its strength about
      const to = b.rng.pick(near(o)); o.r = to.r; o.c = to.c; const x = { r: o.r, c: o.c, cell: s.grid[o.r][o.c] }; let moved = 0, lost = 0;
      if (solidCount(x.cell) && solidCount(x.cell) < o.str && !anchored(x.cell) && !fixedCell(x.cell) && !lifted(x.cell)) {
        for (const ch of x.cell.chips.splice(0)) { const free = allCells(s).filter((y) => y.cell !== x.cell && capacityLeft(s, y.cell) > 0);
          if (isHazard(ch) || !free.length || b.rng.chance(0.3)) { b.fx[ch.id] = 'void'; if (isPayable(ch)) { s.destroyed += ch.value; lost += ch.value; } } else { pushChip(b.rng.pick(free).cell, ch); moved++; } } }
      yield step(b, `${CALAMITIES.tornado.name} (strength ${o.str}): ${moved || lost ? `${moved} chip${moved === 1 ? '' : 's'} thrown across ${s.name}'s position${lost ? `, ${lost}¢ lost` : ''}` : solidCount(x.cell) ? 'the stack holds firm' : 'it whirls over an empty space'}.`, [ref(s, o.r, o.c)], 'hazard');
    }
  }
  // the next turn's Blizzard: a polar table now and then, a Blizzard calamity every fourth turn
  const str = () => b.rng.range(1, 6) + b.rng.range(1, 6);
  if (!s.sky.some((o) => o.kind === 'blizzard') && ((b.weather.includes('blizzard') && b.rng.chance(0.2)) || (s.calamities.includes('blizzard') && b.turn % 4 === 3)))
    { s.sky.push({ id: b.nextId++, kind: 'blizzard', r: -1, c: -1, str: str() }); yield step(b, `A Blizzard rolls in over ${s.name}'s table.`, [], 'weather'); }
}
function* ticks(b) {
  for (const s of b.sides) {
    b.ctx = { phase: 'house', who: s.idx };
    let burned = 0, boomed = 0; const touched = [];
    const HZ = ['burn', 'acid', 'shock', 'corrupt', 'poison', 'boom', 'frost', 'lava'];
    for (const { r, c, cell } of allCells(s)) for (const h of cell.chips.filter((ch) => HZ.includes(ch.kind))) {
      if (!cell.chips.includes(h)) continue;
      const drop = () => { cell.chips.splice(cell.chips.indexOf(h), 1); b.fx[h.id] = 'void'; };
      if (hasResist(cell, h.kind)) { drop(); touched.push(ref(s, r, c)); continue; }
      if (iced(cell) && h.kind !== 'boom') { drop(); touched.push(ref(s, r, c)); continue; } // a Frozen chip shrugs it off
      touched.push(ref(s, r, c));
      if (h.kind === 'shock') { // 1¢ of Debt on two other stacks (one more next to a Battery, or from a wet stack); Absorption soaks instances
        const others = allCells(s).filter((x) => x.cell !== cell && occupied(x.cell) && !hasResist(x.cell, 'shock') && !iced(x.cell));
        const n = 2 + cell.chips.filter((ch) => ch.shop === 'battery').length + (wet(cell) ? 1 : 0); let soaked = false;
        for (const x of b.rng.shuffle(others).slice(0, n)) { if (absorbs(b, s, x.r, x.c)) soaked = true; else engage(b, null, s, x.r, x.c, 1, {}); }
        if (soaked || (!stuck(cell, 'shock') && --h.life <= 0)) drop(); continue; // an absorbed shock cannot repeat
      }
      if (h.kind === 'corrupt' || h.kind === 'poison') { // 1¢ of Debt on its own stack every turn
        if (topPayableIdx(cell) >= 0) engage(b, null, s, r, c, 1, {});
        if (h.kind === 'corrupt') {
          if (b.rng.chance(0.6)) { const free = allCells(s).filter((x) => x.cell !== cell && solidCount(x.cell) && !hasResist(x.cell, 'corrupt') && !x.cell.chips.some((ch) => ch.kind === 'corrupt')); if (free.length) b.rng.pick(free).cell.chips.push(mkHazard(b, 'corrupt', 2)); }
          if (!stuck(cell, 'corrupt') && --h.life <= 0) drop();
        }
        continue;
      }
      if (h.kind === 'frost') { // thaws with time, or at once next to heat
        if (wet(cell) || b.cold) freezeTop(b, cell); // wet chips freeze under frost
        if (cell.chips.some((ch) => ch.kind === 'burn' || ch.kind === 'lava') || (!stuck(cell, 'frost') && --h.life <= 0)) drop();
        continue;
      }
      if (h.kind === 'boom') { // goes off the turn after it lands: 5¢ to its stack and every stack around it
        if (--h.life > 0) continue;
        drop(); boomed++;
        for (const x of [{ r, c, cell }, ...around(s, r, c)]) if (occupied(x.cell)) { engage(b, null, s, x.r, x.c, h.power || 5, {}); touched.push(ref(s, x.r, x.c)); }
        continue;
      }
      if ((h.kind === 'burn' || h.kind === 'lava') && wet(cell)) { drop(); for (const ch of cell.chips) delete ch.wet; continue; } // wet chips cannot burn: the fire goes out and dries them
      const i = topSolid(cell);
      if (i >= 0 && h.kind === 'burn' && cell.chips[i].kind === 'clay') { // fire bakes Clay into Brick
        const cl = cell.chips[i]; cl.kind = 'brick'; cl.hits = (cl.hits || 1) * 2; drop(); continue; }
      if (i >= 0) { const v = cell.chips.splice(i, 1)[0]; b.fx[v.id] = 'void'; if (isPayable(v)) { s.destroyed += v.value; burned += v.value; } }
      if (h.kind === 'lava') { // spills a Burning chip next door
        const adj = allCells(s).filter((x) => Math.abs(x.r - r) + Math.abs(x.c - c) === 1 && solidCount(x.cell) && !iced(x.cell) && !hasResist(x.cell, 'burn') && !x.cell.chips.some((ch) => ch.kind === 'burn'));
        if (adj.length) { const x = b.rng.pick(adj); x.cell.chips.push(mkHazard(b, 'burn', 2)); touched.push(ref(s, x.r, x.c)); }
        if (!stuck(cell, 'lava') && --h.life <= 0) drop();
      }
      if (h.kind === 'burn') {
        if (b.rng.chance(0.3)) { const adj = allCells(s).filter((x) => Math.abs(x.r - r) + Math.abs(x.c - c) === 1 && solidCount(x.cell) && !wet(x.cell) && !hasResist(x.cell, 'burn') && !x.cell.chips.some((ch) => ch.kind === 'burn'));
          if (adj.length) b.rng.pick(adj).cell.chips.push(mkHazard(b, 'burn', 2)); }
        if (!stuck(cell, 'burn') && --h.life <= 0) drop();
      }
      if (!solidCount(cell)) { const acid = h.kind === 'acid'; for (const ch of cell.chips.splice(0)) b.fx[ch.id] = 'void'; if (acid) cell.hole = true; }
    }
    if (touched.length) yield step(b, `Hazards work through ${s.name}'s position${burned ? `: ${burned}¢ destroyed` : ''}${boomed ? `${burned ? ',' : ':'} ${boomed} Boom chip${boomed > 1 ? 's go' : ' goes'} off` : ''}.`, touched, 'hazard');

    yield* growth(b, s);
    for (let k = 0; k < s.familiars; k++) {
      const n = cleanse(b, s, 1); const cr = b.creatures.find((x) => x.side === s.idx && !x.gone && x.r >= 0);
      const chased = cr && b.rng.chance(0.5); if (chased) cr.gone = true;
      if (n || chased) yield step(b, `${s.name}'s Familiar ${n ? 'clears a chip' : ''}${n && chased ? ' and ' : ''}${chased ? 'chases a creature away' : ''}.`, [], 'familiar');
    }
    const lucky = sum(allCells(s), (x) => shopCount(x.cell, 'lucky')); let luck = 0;
    for (let k = 0; k < lucky; k++) if (b.rng.chance(shopVars('lucky').chance)) luck++;
    if (luck) luck -= addToMeter(b, s, Array.from({ length: luck }, () => mkChip(b, 'opp', 1)), null, 'spawn').length;
    if (luck) yield step(b, `${s.name}'s Lucky chip${lucky > 1 ? 's turn' : ' turns'} up ${luck} Opportunity chip${luck > 1 ? 's' : ''}.`, [], 'bonus');
    if (s.spawners && b.turn % 3 === 0) for (let k = 0; k < s.spawners; k++) b.creatures.push(mkCreature(b, s.idx, b.turn));
    for (const { cell } of allCells(s)) if (cell.roost && !cell.chips.some((ch) => ch.kind === 'egg') && b.turn % 3 === 0 && !b.creatures.some((x) => x.roost === cell.roost.id && !x.gone))
      b.creatures.push(newCreature(b, 'dragon', s.idx, b.turn, { roost: cell.roost.id }));
    if (s.sky.some((o) => o.kind === 'moon') && b.turn % 4 === 0) b.creatures.push(newCreature(b, 'ghost', s.idx, b.turn)); // the Moon brings Ghosts out
    for (const cr of b.creatures.filter((x) => x.side === s.idx && !x.gone && x.arrive <= b.turn)) {
      let text = '', at = null;
      if (cr.kind === 'mole') { // digs up an empty space
        const free = allCells(s).filter((x) => !x.cell.hole && !x.cell.chips.length && !x.cell.link && !x.cell.roost);
        if (free.length) { at = b.rng.pick(free); at.cell.hole = true; delete at.cell.puddle; text = 'A Mole digs a Hole'; } else text = 'A Mole finds nowhere to dig';
      } else if (cr.kind === 'ghost') { // haunts a row with stacks in it
        if (cr.r < 0) { const rows = [...new Set(allCells(s).filter((x) => solidCount(x.cell)).map((x) => x.r))]; cr.r = rows.length ? b.rng.pick(rows) : 0; cr.c = Math.floor(s.dims.cols / 2); }
        at = { r: cr.r, c: cr.c }; text = 'A Ghost haunts a row: nothing can aim at it';
      } else if (cr.kind === 'ghostship') { // sails across empty spaces to a Gold-topped stack and steals the Gold
        const gold = allCells(s).filter((x) => { const i = topSolid(x.cell); return i >= 0 && x.cell.chips[i].gold && !x.cell.chips[i].treasure; });
        const empty = allCells(s).filter((x) => !x.cell.chips.length && !x.cell.hole && !x.cell.link && !x.cell.roost);
        if (cr.r < 0) { const st = b.rng.pick(empty.length ? empty : allCells(s)); cr.r = st.r; cr.c = st.c; }
        const d = (x, y) => Math.max(Math.abs(x.r - y.r), Math.abs(x.c - y.c)), goal = gold.sort((x, y) => d(x, cr) - d(y, cr))[0];
        if (goal && d(goal, cr) <= 1) { const i = topSolid(goal.cell), v = goal.cell.chips.splice(i, 1)[0]; cr.hold.push(v); b.fx[v.id] = 'abduct'; s.destroyed += v.value; emptyOut(b, goal.cell); text = `The Ghost Ship steals a ${v.value}¢ Gold chip`; at = { r: cr.r, c: cr.c }; }
        else { const step1 = empty.filter((x) => d(x, cr) === 1).sort((x, y) => (goal ? d(x, goal) - d(y, goal) : b.rng.next() - 0.5))[0];
          if (step1) { cr.r = step1.r; cr.c = step1.c; } at = { r: cr.r, c: cr.c }; text = goal ? 'The Ghost Ship sails toward a Gold chip' : 'The Ghost Ship drifts, looking for Gold'; }
      } else {
        const live = allCells(s).filter((x) => solidCount(x.cell) && (cr.kind === 'dragon' || !anchored(x.cell)));
        if (!live.length) { cr.gone = true; continue; }
        const stay = cr.kind === 'mothership' && cr.r >= 0 && solidCount(s.grid[cr.r][cr.c]) && !anchored(s.grid[cr.r][cr.c]) ? { r: cr.r, c: cr.c, cell: s.grid[cr.r][cr.c] } : null;
        at = stay || b.rng.pick(live); const i = topSolid(at.cell);
        if (cr.kind === 'ufo' || cr.kind === 'mothership') { const v = at.cell.chips.splice(i, 1)[0]; b.fx[v.id] = 'abduct'; if (isPayable(v)) s.destroyed += v.value; text = cr.kind === 'ufo' ? 'A UFO abducts a chip' : 'The Mothership beams up a chip'; if (cr.kind === 'mothership' && !solidCount(at.cell)) cr.life = 1; }
        else if (cr.kind === 'dragon') { if (!hasResist(at.cell, 'burn') && !at.cell.chips.some((ch) => ch.kind === 'burn')) at.cell.chips.push(mkHazard(b, 'burn')); text = 'A Dragon breathes fire on a stack'; }
        else if (cr.kind === 'unicorn') { for (let k = at.cell.chips.length - 1; k >= 0; k--) if (!isHazard(at.cell.chips[k])) transform(b, at.cell, k); text = 'A Unicorn transforms a whole stack. Chaos reigns!'; }
        else { transform(b, at.cell, i); text = 'A Fairy transforms a chip. Chaos reigns!'; }
        emptyOut(b, at.cell);
      }
      if (at) { cr.r = at.r; cr.c = at.c; }
      if (--cr.life <= 0) cr.gone = true;
      const nest = cr.gone && cr.roost && !cr.bountied ? allCells(s).find((x) => x.cell.roost?.id === cr.roost) : null;
      if (nest) { nest.cell.chips.push(mkChip(b, 'egg', 0, { shop: 'egg', hits: shopVars('egg').hits || 5, prog: 0, foe: s.idx })); text += ', nests and lays an egg on its Roost'; }
      yield step(b, `${text} in ${s.name}'s position${cr.gone ? ', then leaves' : ''}.`, at ? [ref(s, at.r, at.c)] : [], 'creature');
    }
    for (const { r, c, cell } of allCells(s)) if (cell.worm && cell.chips.length) { // pulled through to the other side
      const o = b.sides[1 - s.idx], free = allCells(o).filter((x) => !x.cell.hole && !x.cell.chips.length), moving = cell.chips.splice(0);
      if (free.length) { const x = b.rng.pick(free); x.cell.chips = moving; yield step(b, `${CALAMITIES.wormhole.name}: ${moving.length} chip${moving.length > 1 ? 's are' : ' is'} pulled through to ${o.name}'s side.`, [ref(s, r, c), ref(o, x.r, x.c)], 'hazard'); }
      else { for (const ch of moving) { b.fx[ch.id] = 'void'; if (isPayable(ch)) s.destroyed += ch.value; } yield step(b, `${CALAMITIES.wormhole.name}: chips are lost in the void.`, [ref(s, r, c)], 'hazard'); }
    }
    for (const cal of s.calamities) {
      if (cal === 'inferno') { const live = allCells(s).filter((x) => solidCount(x.cell) && !x.cell.chips.some((ch) => ch.kind === 'burn') && !hasResist(x.cell, 'burn'));
        if (live.length) { const x = b.rng.pick(live); x.cell.chips.push(mkHazard(b, 'burn')); yield step(b, `${CALAMITIES.inferno.name}: a stack catches fire.`, [ref(s, x.r, x.c)], 'hazard'); } }
      if (cal === 'audit' && b.turn % 2 === 0) { const hit = []; for (let c = 0; c < s.dims.cols; c++) { const r = frontRow(s, c); if (r >= 0 && engage(b, null, s, r, c, 1, {}).placed) hit.push(ref(s, r, c)); }
        if (hit.length) yield step(b, `${CALAMITIES.audit.name}: 1¢ of Debt on each of ${s.name}'s front stacks.`, hit, 'hazard'); }
    }
    yield* sky(b, s);
    for (const { r, c, cell } of allCells(s)) {
      if (cell.black) { const near = around(s, r, c).filter((x) => solidCount(x.cell) && !anchored(x.cell) && !fixedCell(x.cell)); if (!near.length) continue;
        const x = b.rng.pick(near), v = x.cell.chips.splice(x.cell.chips.findIndex((ch) => !isHazard(ch)), 1)[0]; // it takes the bottom chip b.fx[v.id] = 'void'; if (isPayable(v)) s.destroyed += v.value; emptyOut(b, x.cell);
        yield step(b, `${CALAMITIES.blackhole.name}: a chip is pulled in from ${s.name}'s position and lost.`, [ref(s, x.r, x.c), ref(s, r, c)], 'hazard'); }
      if (cell.volcano > 0) { const live = allCells(s).filter((x) => solidCount(x.cell) && !x.cell.chips.some((ch) => ch.kind === 'burn') && !hasResist(x.cell, 'burn'));
        const x = live.length ? b.rng.pick(live) : null; if (x) x.cell.chips.push(mkHazard(b, 'burn'));
        if (--cell.volcano <= 0) { for (const ch of cell.chips.filter((y) => y.kind === 'volcano')) { cell.chips.splice(cell.chips.indexOf(ch), 1); b.fx[ch.id] = 'void'; }
          const L = allCells(s).filter((y) => y.cell.link && y.cell.link.r === r && y.cell.link.c === c); freeLinks(s, r, c); for (const y of [{ cell }, ...L]) y.cell.cut = (y.cell.cut || 0) + 1; } // dormant: one stack height lower
        yield step(b, `${CALAMITIES.volcano.name}: ${x ? 'a Burning chip lands on a stack' : 'it rumbles'}${cell.volcano <= 0 ? ', then it goes dormant' : ''}.`, x ? [ref(s, x.r, x.c), ref(s, r, c)] : [ref(s, r, c)], 'hazard'); }
    }
    // Puddles dry after a turn without water (at once under the Sun); wet chips dry off; on a cold table they freeze
    for (const { cell } of allCells(s)) {
      if (cell.puddle && (sunny(s) || (!cell.puddle.ice && b.turn - cell.puddle.t >= 1))) delete cell.puddle;
      if (cell.puddle && b.cold) cell.puddle.ice = true;
      if (b.cold && wet(cell)) freezeTop(b, cell);
      for (const ch of cell.chips) if (ch.wet > 0 && --ch.wet <= 0) delete ch.wet;
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

// the phase a trick plays in: its type, unless it is Swift (`early`)
export const phaseOf = (id) => TRICKS[id].early || TRICKS[id].type;
// Each trick of this type plays. A Forgetter on the opponent negates a trick whose dice total its count; a Repeater
// on your side plays a trick whose dice total its count again; each Mimic on top plays one of them again.
function* sidePhase(b, s, type, cx) {
  const o = b.sides[1 - s.idx], done = [];
  for (const e of s.run.filter((x) => x.state === 'play' && phaseOf(x.trick.id) === type)) {
    cx.uid = e.uid; const roll = e.lingerLeft <= 0 && e.dice.length ? sum(e.dice, (d) => d.value) : null;
    const fg = roll != null && tops(o, 'forgetter').find((x) => x.n === roll && (o.forgotUsed[x.ch.id] || 0) < 1 + x.charge);
    if (fg) o.forgotUsed[fg.ch.id] = (o.forgotUsed[fg.ch.id] || 0) + 1;
    yield* play(b, s, e, { forgotten: !!fg });
    if (roll == null || fg) continue; done.push(e);
    for (const rp of tops(s, 'repeater').filter((x) => x.n === roll)) for (let k = 0; k <= rp.charge; k++) yield* play(b, s, e, { again: 'Repeater' });
  }
  for (const mm of tops(s, 'mimic')) { void mm; if (!done.length) break; const e = b.rng.pick(done); cx.uid = e.uid; yield* play(b, s, e, { again: 'Mimic' }); }
}
export function* resolve(b) {
  b.phase = 'resolve';
  // bids go to the House; a bid above 1¢ makes the trick linger
  let any = false;
  for (const s of b.sides) for (const e of s.run) if (e.state === 'bid') {
    e.lingerTotal = clamp(e.bidValue - 1, 0, 20); e.lingerLeft = e.lingerTotal; e.state = 'play';
    for (const ch of e.bid) b.fx[ch.id] = 'house'; e.paid = e.bid.map((ch) => ch.value); s.bidsPaid += e.bidValue; e.bid = []; any = true;
  }
  b.ctx = { phase: 'bids' };
  if (any) yield step(b, 'The House collects the bids.', [], 'bid');
  const plays = []; for (const s of b.sides) for (const e of s.run) if (e.state === 'play') plays.push({ s, e });
  // Each phase is played for both Rollers at once. What a trick is worth is read from the table as it
  // stood when the phase was called, so neither Roller's play changes the other's in the same phase.
  for (const type of Object.keys(TYPES).sort((x, y) => TYPES[x].order - TYPES[y].order)) {
    if (!plays.some((p) => phaseOf(p.e.trick.id) === type)) continue;
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
  for (const { s, e } of plays) {
    if (e.lingerLeft > 0) { e.lingerLeft--; continue; }
    s.run.splice(s.run.indexOf(e), 1); s.book.push(e.trick); done++;
    for (const d of e.dice) homeDie(b, s, d);
  }
  for (const s of b.sides) if (homeTray(b, s)) done++; // rolled but never placed
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
    for (const { cell } of allCells(s)) {
      if (!stuck(cell, 'hard')) for (const h0 of cell.chips.filter((ch) => ch.kind === 'hard')) if (--h0.life <= 0) { cell.chips.splice(cell.chips.indexOf(h0), 1); b.fx[h0.id] = 'void'; }
      for (const ch of cell.chips) { if (ch.feather > 0 && !stuck(cell, 'feather')) ch.feather--; if (ch.regen > 0 && !stuck(cell, 'regen') && --ch.regen <= 0) delete ch.regen; }
    }
  }
  b.ctx = { phase: 'house' };
  const w = b.sides.map(worth);
  if (w[0] <= 0 || w[1] <= 0 || b.turn >= b.rules.maxTurns) {
    b.over = true; b.winner = w[0] > w[1] ? 0 : 1; b.timeout = w[0] > 0 && w[1] > 0;
    yield step(b, b.timeout ? `Last call. ${b.sides[b.winner].name} holds the most Worth.` : `${b.sides[1 - b.winner].name} is broke. ${b.sides[b.winner].name} wins the bout.`, [], 'over');
    return;
  }
  b.phase = 'drink'; for (const s of b.sides) { s.sipped = false; s.ate = false; } b.ctx = null; openPhase(b);
  yield step(b, '', [], 'drink');
}

// ---------- effect chips ----------
// Every effect, investment and tilt at work on a Roller, as a chip lying on their table. `size` is how many spaces
// square it covers: effects on one thing are 1, effects on every roll effect are 2, effects on the whole position
// are 3. Only chips of the same size stack together. `zone`: the Meter for help, the Bar for harm.
const STAT_SHORT = { trickery: 'Draw', ingenuity: 'Bid', proficiency: 'Roll', charisma: 'Steal', cunning: 'Opp', conviction: 'Power' };
export function effectChips(b, s) {
  const out = [], add = (key, name, glyph, value, size, good, text) => out.push({ key, name, glyph, value, size, zone: good ? 'meter' : 'bar', good, text });
  const m = s.mods, st = s.status;
  if (s.power) add('power', 'Power', '⚡', s.power, 1, true, 'Added to your next roll effect, then spent.');
  if (m.boost) add('boost', 'Boost', '↑', m.boost, 2, true, 'Every other roll effect this turn gains this much.');
  if (m.press) add('press', 'Press', '⇶', m.press, 2, true, 'Your Expenses this turn gain this much and pierce.');
  else if (m.pierce) add('pierce', 'Pierce', '➹', '', 2, true, 'Your Expenses this turn ignore Block chips, Resist and Hardened stacks.');
  if (m.bend != null) add('bend', 'Bend', '∿', m.bend, 2, true, 'Every die on these played tricks counts as this.');
  if (m.mul && m.mul !== 1) add('parlay', 'Parlay', m.mul > 1 ? '×2' : '½', '', 2, m.mul > 1, `Your other roll effects this turn are ${m.mul > 1 ? 'doubled' : 'halved'}.`);
  if (m.enfeeble) add('enfeeble', 'Enfeebled', '↓', m.enfeeble, 2, false, 'Every roll effect this turn loses this much.');
  if (st.resist) add('resist', 'Resist', '⛉', st.resist, 3, true, 'Every fee charged to this position is reduced by this much.');
  if (st.evade != null) add('evade', 'Evade', '〰', st.evade, 3, true, 'Any fee larger than this misses the position.');
  if (st.reflect) add('reflect', 'Reflect', '◑', st.reflect, 3, true, `Up to this much of ${st.reflectAll ? 'every fee' : 'the next fee'} is sent back.`);
  for (const [k, v] of Object.entries(s.turnBonus || {})) if (v) add('tb-' + k, `${v > 0 ? '+' : ''}${v} ${STAT_SHORT[k] || k}`, v > 0 ? '+' : '−', Math.abs(v), 1, v > 0, 'From a drink or food, this turn.');
  (s.food || []).forEach((f, i) => add('food-' + i, f.label || 'Food', '🍴', f.turns, 1, true, `${Object.entries(f.mods).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${STAT_SHORT[k] || k}`).join(', ')} for ${f.turns} more turn${f.turns > 1 ? 's' : ''}.`));
  if (s.familiars) add('familiar', 'Familiar', '🐾', s.familiars, 1, true, 'Clears a Debt or hazard chip each turn and may chase creatures away.');
  if (s.bees?.length) add('bees', 'Bumble Bees', '🐝', s.bees.length, 1, true, 'Familiars from your Hive: they sting creatures over your table and pollinate your Flowers into Honey.');
  if (s.cursed) add('curse', 'Curse', '☠', s.cursed, 2, false, 'Something in your pile is cursed: every turn one of Draw, Roll or Bid is 1 lower (never below 1).');
  if (spying(s)) add('spy', 'Spy', '🕵', spying(s), 1, true, 'Your opponent plays each phase first, and you see it before you commit.');
  if (s.interventions) add('intervention', 'Intervention', '✚', s.interventions, 1, true, 'Once, when you would go broke, your paid fees are restored.');
  if (s.positionTilt) add('position', 'Position', '⊞', s.positionTilt, 2, true, 'Balance, Versatility and Depth raised for this bout.');
  if (s.spawners) add('nest', 'Nest', '🪹', s.spawners, 1, false, 'Sends a creature every third turn.');
  for (const cal of new Set(s.calamities)) if (['inferno', 'audit', 'tornado'].includes(cal)) add('cal-' + cal, CALAMITIES[cal].name, { inferno: '🔥', audit: '§', tornado: '🌪' }[cal], s.calamities.filter((x) => x === cal).length, cal === 'audit' ? 2 : 3, false, CALAMITIES[cal].text);
  if (s.heat > 1) add('heat', 'Last call', '⏳', `×${s.heat.toFixed(2)}`, 3, false, 'Every Expense is multiplied; more each turn.');
  return out;
}

// what each side walks away with
export function summary(b, idx) {
  const s = b.sides[idx], chips = s.grid.flat().flatMap((cell) => cell.chips);
  const std = chips.filter((ch) => ch.kind === 'std');
  return {
    win: b.winner === idx, turns: b.turn, timeout: !!b.timeout,
    survivors: sum(std.filter((ch) => !ch.resist), (ch) => ch.value) + sum(s.run.flatMap((e) => e.dice), (d) => (d.chip ? d.chip.value : 0)), gold: sum(std.filter((ch) => ch.gold), (ch) => ch.value),
    resist: chips.filter((ch) => ch.shop && ch.resist).reduce((m, ch) => { m[ch.shop] = (m[ch.shop] || 0) + (ch.n || 1); return m; }, {}),
    seq: sum(std.filter((ch) => ch.n > 1), (ch) => Math.max(0, ch.value - ch.n)),
    nest: std.filter((ch) => ch.resist === 'nest').length * (shopVars('nest').payout || 0),
    opportunity: chips.filter((ch) => ch.kind === 'opp').length,
    bounties: chips.filter((ch) => ch.kind === 'bounty').map((ch) => ({ creature: ch.creature, value: ch.value })),
    ownFees: b.stage.paid[idx], oppFees: b.stage.paid[1 - idx], bids: s.bidsPaid,
    pendingBids: sum(s.run.filter((e) => e.state === 'play'), (e) => e.bidValue) + sum(s.run.filter((e) => e.state === 'bid'), (e) => e.bidValue),
    destroyed: s.destroyed, intervened: s.intervened, dealt: s.dealt,
  };
}

// internals the tests drive directly
export const _test = { engage, settleAll, feeShares, setDebt, ticks, play, sidePhase, growth, strike, water, newCreature, setHard, arrange };
