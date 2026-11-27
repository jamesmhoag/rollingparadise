// Bout engine. Pure logic, no DOM. A bout is two Rollers, each with a Position
// (a grid of chip stacks: Bet rows in front, Stake rows behind), a Book of tricks,
// a Pouch of dice and a Run of shown tricks.
// A turn has three planning phases that both Rollers go through together: Draw, Roll, Bid.
// Each phase needs at least one action (where one is possible) and closing it ends that kind
// of action for the turn. advance() closes a phase for both; after Bid, resolve() plays each
// effect type for both Rollers at once and yields a step after each visible change.
// Fees go out as Debt first; the House then settles every stack that took Debt.
import { RNG, sum, clone, clamp, order1D, steps, nearestTo } from './util.js';
import { stackEdit } from './stackedit.js';
import { instances, deployOrder, placeIndex, makeKind, isFxChip } from './trickmaker.js';
import { MAKES as MAKES_TABLE } from './content/trickmaker.js';
const MAKES_OF = (chip) => MAKES_TABLE[chip] || {};
import { MADE_CHIPS, HEIGHT } from './content/chipmaker.js';
import { TUNING } from './content/tuning.js';
import { rollDie, boutCopy, facesOf, upgrade as upgradeFaces } from './dice.js';
export { rollDie };
import { CLASSES as CLASS_BASE, DEFAULT_MAT, DIE_UPGRADES, TRICKS, TYPES, QDIE, FOIL, WEAR, defOf, DICE, DIST, QMULT, HAZARD_KINDS, CALAMITIES, CREATURES, ORBITALS, FELTS, TILTS, layWhat, layName, TILT_PRESSURE, tiltFrom, DENOM_VALUES, tiltChance, shopVars, resistsOf, SHOP_CHIPS, INSTANCE_SHIELDS, SEQS, primaryC, BOSS_TRAITS } from './data.js';
import { t as tx } from './text.js';

// The turn: Draw tricks; Roll (pick the dice; they are thrown as the Bid opens); Bid on tricks, seeing both rolls;
// the Bluff ('aim'): put the rolled dice on tricks and confirm aims. Your opponent's dice and aims show as the House plays.
export const PHASES = ['draw', 'roll', 'bid', 'aim']; // 'aim' is shown as the Bluff
export const LAST_CALL = 8;
export const heat = (turn) => (turn > LAST_CALL ? 1 + 0.25 * (turn - LAST_CALL) : 1);
// Quality sets the multiplier. A Foil print, and each Upgrade chip bid on a trick, plays it a tier stronger: as the
// quality above its own (Investments, which multiply everything else, step gently: +0.5 a tier).
const tierUp = (t) => (t.foil ? 1 : 0) + (t.boost || 0);
const playQ = (t) => Math.min(QMULT.length - 1, t.q + tierUp(t));
export const trickMult = (t) => QMULT[playQ(t)];
const investMult = (t) => 1 + (playQ(t) - 1) * 0.5;
// the multiplier a trick applies to its roll total, and the size of its Trait
export const multOf = (t) => (TRICKS[t.id].type === 'investment' ? investMult(t) : trickMult(t));
// a Misprint printed with a changed effect value adds (or takes) this much from every roll effect it plays
export const misPlus = (t) => t?.mis?.trait || 0;
// a Grand or Royal trick's quality die, rolled when it is drawn: 'dud', 'hot' or null
export const qState = (e) => { const Q = QDIE[e.trick.q]; if (!Q || e.qroll == null) return null; return e.qroll <= Q.dud ? 'dud' : e.qroll >= Q.hot ? 'hot' : null; };
// a trick as it plays: a tier stronger for each Upgrade chip bid on it; Common strength on a dud quality die
export const effTrick = (e) => { let t = e.trick; if (e.upBoost) t = { ...t, boost: (t.boost || 0) + e.upBoost }; if (qState(e) === 'dud') t = { ...t, q: 1, foil: 0, boost: 0 }; return t; };
// a chip made in the chip maker (kind 'made'): its rules are its MADE_CHIPS entry
export const madeOf = (ch) => (ch?.kind === 'made' ? MADE_CHIPS[ch.model] || null : null);
// How long a chip stays: a made chip's own `lasts`; chips the table makes (Opportunity, Bounty, Block, Counter) follow
// the tuner's chip lifetimes (TUNING.chipLife): until paid away, the end of the turn, or the end of the match.
export const lastsOf = (ch) => (ch?.kind === 'made' ? madeOf(ch)?.lasts : TUNING.chipLife?.[ch?.kind]);
export const isPayable = (ch) => ch.kind === 'std' || ((ch.kind === 'opp' || ch.kind === 'bounty') && lastsOf(ch) !== 'match') || (ch.kind === 'made' && ch.value > 0 && lastsOf(ch) !== 'match');
// takes a whole fee per hit (fee instance defence): Petals, Clay and the like, and made chips that last until broken
export const isInstance = (ch) => INSTANCE_SHIELDS.includes(ch.kind) || (ch.kind === 'made' && lastsOf(ch) === 'hits' && (ch.hits || 0) > 0);
// fees pass a made chip by when it lasts the match or is immune to Debt; a match chip cannot be destroyed either
const passedBy = (ch) => lastsOf(ch) === 'match' || (ch.kind === 'made' && !!madeOf(ch)?.immune?.includes('debt'));
const immuneTo = (ch, what) => lastsOf(ch) === 'match' || !!madeOf(ch)?.immune?.includes(what);
export const isHazard = (ch) => HAZARD_KINDS.includes(ch.kind);
// an effect chip a maker trick placed: it takes height and does its work in its phase, but has no worth
export const isFx = (ch) => ch.kind === 'fx';
export const isShield = (ch) => ch.kind === 'block' || ch.kind === 'counter' || INSTANCE_SHIELDS.includes(ch.kind);
const SPREAD = { scorch: 'drop' };

// ---------- position helpers ----------
// every chip with a value counts toward Worth, whether or not a fee can take it (a chip that lasts the match too)
export const cellWorth = (cell) => sum(cell.chips, (ch) => (isPayable(ch) ? ch.value : ch.kind === 'debt' ? -ch.value : ch.kind === 'made' || lastsOf(ch) === 'match' ? ch.value || 0 : 0));
export const debtOf = (cell) => sum(cell.chips, (ch) => (ch.kind === 'debt' ? ch.value : 0));
export const worth = (s) => sum(s.grid.flat(), cellWorth);
export const occupied = (cell, payOnly) => cell.chips.some((ch) => isPayable(ch) || (!payOnly && isShield(ch)));
const tiny = (ch) => ch.kind === 'little' || !!ch.flat || madeOf(ch)?.height === 'tiny'; // Little and flat chips take no height
const heightOf = (ch) => (ch.flat ? 0 : HEIGHT[madeOf(ch)?.height]?.h ?? 1); // made chips can be short (½) or tall (2)
export const solidCount = (cell) => cell.chips.reduce((t, ch) => (isHazard(ch) || tiny(ch) ? t : t + heightOf(ch)), 0);
// a made chip that lets nothing on top of it closes its stack while it is the top chip
// Sticky is a trait: a sticky chip binds to the value chips it touches and their values combine into one chip. A
// chip is sticky when it was made sticky (by a Sticky chip it touched, or its made-chip model), or while it is both
// wet and frozen (a conditional binding).
export const isSticky = (ch) => !!(ch.sticky || madeOf(ch)?.sticky || (ch.wet > 0 && ch.frozen));
const binds = (ch) => (ch.kind === 'std' || ch.kind === 'opp' || ch.kind === 'bounty' || (ch.kind === 'made' && ch.value > 0)) && !ch.gold;
// a Sticky chip makes the chips directly above and below it sticky
function stickAround(cell) { // the Sticky chip is an overlay: the chips it touches are the nearest value chips above and below it
  cell.chips.forEach((ch, i) => { if (ch.kind !== 'sticky') return;
    for (const dir of [-1, 1]) for (let j = i + dir; j >= 0 && j < cell.chips.length; j += dir) { const y = cell.chips[j]; if (isHazard(y)) continue; if (binds(y)) y.sticky = true; break; } }); }
// bind: in a stack, two touching value chips where either is sticky become one, the lower taking the upper's value
export function bind(b, cell) {
  stickAround(cell); let n = 0;
  for (let again = true; again;) { again = false; const st = cell.chips.filter((ch) => !isHazard(ch));
    for (let i = 0; i + 1 < st.length; i++) { const lo = st[i], up = st[i + 1];
      if (!binds(lo) || !binds(up) || !(isSticky(lo) || isSticky(up))) continue;
      lo.value += up.value; lo.sticky = true; cell.chips.splice(cell.chips.indexOf(up), 1); b.fx[up.id] = 'void'; b.fx[lo.id] = 'mutate'; n++; again = true; break; } }
  return n;
}
const closed = (cell) => { for (let i = cell.chips.length - 1; i >= 0; i--) { const ch = cell.chips[i]; if (isHazard(ch)) continue; return madeOf(ch)?.onTop === 'none'; } return false; };
// Holes, the parts of a Big chip or Volcano, Roosts and Puddles take nothing; a dormant Volcano leaves the space lower
export const capacityLeft = (s, cell) => (cell.hole || cell.link || cell.roost || (cell.puddle && !cell.chips.length) || closed(cell) ? 0 : cell.chips.some((y) => madeOf(y)?.onTop === 'anything') ? 99 : Math.max(0, Math.floor(s.dims.stackMax - (cell.cut || 0) - solidCount(cell)))); // 'anything on top': no height cap
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
  for (let k = 0; k < n; k++) { const i = L ? k : n - 1 - k, ch = cell.chips[i]; if (!isHazard(ch) && ch.kind !== 'doom' && !passedBy(ch)) return i; } return -1; };
const hasResist = (cell, el) => cell.chips.some((ch) => (ch.resist && resistsOf(ch.resist).includes(el)) || (ch.kind === 'made' && madeOf(ch)?.immune?.includes(el)));
// a stack topped by a Frozen chip cannot be burned, corrupted, shocked or changed
// A Frozen chip is frozen to the ground only when its stack stands in an iced-over Puddle. Anywhere else it is an
// ordinary chip worth what it was made from: it can be bid, flipped, paid, burned or turned into another chip.
export const grounded = (cell) => !!cell?.puddle?.ice && cell.chips.some((ch) => ch.frozen);
export const iced = (cell) => { const i = topSolid(cell); return i >= 0 && !!cell.chips[i].frozen && grounded(cell); };
// Only wet chips freeze together; organic chips (plants and creatures' eggs and hives) freeze where they are.
export const ORGANIC = ['tree', 'flower', 'petal', 'hive', 'egg', 'wood'];
const stuckIce = (ch, cell) => ch.frozen && grounded(cell);
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
const pushChip = (cell, ch) => { if (isHazard(ch)) cell.chips.push(ch); else { const i = cell.chips.findIndex((x) => isHazard(x) || (!tiny(ch) && tiny(x) && madeOf(x)?.must !== 'bottom')); /* a chip that must lie at the bottom stays there */ if (i < 0) cell.chips.push(ch); else cell.chips.splice(i, 0, ch); } };
// a Big chip or Volcano covers two spaces by two: the top-left one (`anchor`) holds the stack, the others `link` to it
const homeOf = (s, r, c) => { const l = s.grid[r]?.[c]?.link; return l ? { r: l.r, c: l.c } : { r, c }; };
function freeBlock(s, rows) { for (const r of rows) for (let c = 0; c + 1 < s.dims.cols; c++) { if (r + 1 >= s.rows) continue;
  const q = [s.grid[r][c], s.grid[r + 1][c], s.grid[r][c + 1], s.grid[r + 1][c + 1]]; if (q.every((x) => !x.chips.length && !x.hole && !x.link && !x.roost && !x.anchor)) return { r, c }; } return null; }
function claimBlock(s, r, c) { s.grid[r][c].anchor = true; for (const [dr, dc] of [[1, 0], [0, 1], [1, 1]]) s.grid[r + dr][c + dc].link = { r, c }; }
function freeLinks(s, r, c) { delete s.grid[r][c].anchor; for (const { cell } of allCells(s)) if (cell.link && cell.link.r === r && cell.link.c === c) delete cell.link; }
// a made chip bigger than one space covers n by n spaces from its anchor (FOOTPRINT: big 2, large 3, huge 5)
// footprint: a chip's own (a trick can make a chip wider: ch.foot), else its model's
export const FOOT_N = { basic: 1, big: 2, large: 3, huge: 5 };
export const footOf = (ch) => FOOT_N[ch?.foot || madeOf(ch)?.foot] || 1;
// A flat chip that slips under: it lies beneath the stacks across its footprint (they keep their spaces and heights)
// instead of claiming empty spaces. It is kept at the bottom of its first space with mat = { r, c, n }.
// the n×n block aimed at (r, c), moved back inside the position if it hangs off an edge; null when it does not fit
// the position or any space in it is taken (a Hole, part of a big chip, a roost, a Black Hole, or `also(space)`)
function blockAt(s, r, c, n, also = () => false) {
  if (n > s.rows || n > s.dims.cols) return null;
  const r0 = Math.max(0, Math.min(r, s.rows - n)), c0 = Math.max(0, Math.min(c, s.dims.cols - n));
  for (let dr = 0; dr < n; dr++) for (let dc = 0; dc < n; dc++) { const x = s.grid[r0 + dr][c0 + dc]; if (x.hole || x.link || x.anchor || x.roost || x.black || also(x)) return null; }
  return { r: r0, c: c0 };
}
function matBlock(s, r, c, n) {
  const at = blockAt(s, r, c, n); if (!at) return null; const { r: r0, c: c0 } = at;
  for (const { cell } of allCells(s)) if (cell.chips.some((ch) => ch.mat && Math.abs(ch.mat.r - r0) < n && Math.abs(ch.mat.c - c0) < n)) return null; // one mat under a space
  return { r: r0, c: c0 };
}
export const inMat = (ch, r, c) => !!ch.mat && r >= ch.mat.r && r < ch.mat.r + ch.mat.n && c >= ch.mat.c && c < ch.mat.c + ch.mat.n;
// the n×n block a big made chip would take: as blockAt, and every space in it empty
const footBlock = (s, r, c, n) => blockAt(s, r, c, n, (x) => x.chips.length > 0);
function claimFoot(s, r, c, n) { s.grid[r][c].anchor = { n }; for (let dr = 0; dr < n; dr++) for (let dc = 0; dc < n; dc++) if (dr || dc) s.grid[r + dr][c + dc].link = { r, c }; }
// big made chips that have gone free their spaces
function tidyFeet(s) { for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.dims.cols; c++) { const cell = s.grid[r][c]; if (cell.anchor?.n && !cell.chips.some((ch) => footOf(ch) > 1)) freeLinks(s, r, c); } }
// Whether a chip fits on a stack. Flying chips always do: they hover, they do not stack. A stack closed by a
// 'nothing on top' chip takes nothing else, not even Debt. Otherwise no-thickness chips (tiny, hazards, Debt) fit;
// a stack with an 'anything on top' chip in it has no height cap; anything else must fit under the cap, half-height
// chips included.
export function fits(s, cell, ch) {
  if (cell.hole || cell.link || cell.roost) return false;
  if (madeOf(ch)?.move === 'flying') return true; // flying chips hover; they do not stack
  if (closed(cell)) return false; // 'nothing on top': not even a chip with no height, Debt included
  const hh = isHazard(ch) || tiny(ch) || ch.kind === 'debt' ? 0 : heightOf(ch);
  if (hh === 0) return true;
  if (cell.chips.some((y) => madeOf(y)?.onTop === 'anything')) return true;
  return solidCount(cell) + hh <= s.dims.stackMax - (cell.cut || 0) + 1e-9;
}
// electricity: Batteries under a chip in its stack give it one more instance each
const charge = (cell, ch) => { const i = cell.chips.indexOf(ch); return cell.chips.slice(0, Math.max(0, i)).filter((x) => x.shop === 'battery').length; };
// shop chips that are the top solid chip of a stack (Repeater, Mimic, Forgetter, Spy): n is how many chips are under it
function tops(s, id) { const out = []; for (const x of allCells(s)) { const i = topSolid(x.cell); if (i >= 0 && x.cell.chips[i].shop === id) out.push({ ...x, ch: x.cell.chips[i], n: x.cell.chips.slice(0, i).filter((y) => !isHazard(y)).length, charge: charge(x.cell, x.cell.chips[i]) }); } return out; }
export const spying = (s) => tops(s, 'spy').length;
export const sunny = (s) => (s.sky || []).some((o) => o.kind === 'sun');
// a Ghost haunts a row: no trick aims at it and no overkill passes into or through it
export const haunted = (b, side) => new Set((b.creatures || []).filter((cr) => cr.kind === 'ghost' && cr.side === side.idx && !cr.gone && cr.arrive <= b.turn && cr.r >= 0).map((cr) => cr.r));
export const tipOf = (s, k) => Math.max(0, s.tip[k] + (s.turnBonus[k] || 0));
// Charisma, Cunning and Conviction: what occupying rows earns (occBonus) plus gear (a jacket: s.c) and food or a sip
export const cOf = (s, k) => Math.max(0, (occBonus(s)[k] || 0) + (s.c[k] || 0) + (s.turnBonus[k] || 0));

function mkChip(b, kind, value = 0, extra = {}) { return { id: b.nextId++, kind, value, ...extra }; }
const HAZARD_LIFE = { burn: 3, shock: 2, corrupt: 3, boom: 2, acid: 99, poison: 99, frost: 2, lava: 2, hard: 3 };
const mkHazard = (b, kind, life) => mkChip(b, kind, 0, { life: life ?? HAZARD_LIFE[kind] });
// The Puddle is a chip with no thickness that always sits at the bottom of its space (cell.puddle), under any stack.
// On an empty space nothing can be played until it dries; frozen over (ice), it grounds the Frozen chips above it.
export const puddleOf = (cell) => cell?.puddle || null;
function setPuddle(b, cell, ice) { const p = cell.puddle; cell.puddle = p ? { ...p, t: b.turn, ice: ice ?? p.ice } : mkChip(b, 'puddle', 0, { t: b.turn, ice: !!ice }); return cell.puddle; }
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
const say = (t) => t.replace(/\bYou's\b/g, 'Your').replace(/\bYou (plays|pays|charges|steals|gains|resists|evades|reflects|holds|wins|owes|takes|restores)\b/g, (m, v) => tx('feed.you', { slice: v.slice(0, -1) })).replace(/\bYou is\b/g, 'You are').replace(/\bYou has\b/g, 'You have').replace(/(?<=[a-z,:] )Your\b/g, 'your').replace(/^You .*/, (m) => m.replace(/, (gain|steal)s /g, ', $1 '));
function step(b, text, cells = [], kind = '') { text = say(text); const st = { text, cells, kind, fx: b.fx, ...(b.ctx || {}) }; b.fx = {}; if (text) b.log.push(text); return st; }
const ref = (s, r, c) => ({ side: s.idx, r, c });

// Chips an effect puts on the Bet go front to back, left to right, the same for every Roller: a class's deployment
// shapes only its own starting position, never the outcome of an effect.
function meterOrder(s) {
  const rs = order1D(s.dims.meterRows, 'start'), cs = order1D(s.dims.cols, 'start'), out = [];
  for (const r of rs) for (const c of cs) out.push({ r, c });
  return out;
}
// place chips on the Bet, nearest to origin first (else front to back). Returns chips that did not fit.
function addToMeter(b, s, chips, origin, from) {
  let cells = meterOrder(s);
  if (origin) cells = cells.slice().sort(nearestTo(origin));
  const left = [];
  for (const ch of chips) {
    const spot = cells.find(({ r, c }) => capacityLeft(s, s.grid[r][c]) > 0);
    if (!spot) { left.push(ch); b.fx[ch.id] = 'void'; continue; }
    pushChip(s.grid[spot.r][spot.c], ch);
    if (from) b.fx[ch.id] = from;
  }
  if (left.length) s.overflow = (s.overflow || 0) + left.length; // an overloaded Bet: like overkill, the effect plays but the extra is lost
  return left;
}
const overText = (left) => (left.length ? tx('feed.had-no-room-on', { leftN: left.length }) : '');
// Put an effect chip a maker trick made onto a stack: on top for chips that work from the top (Mimic), otherwise at
// the base (above a Magic Hat). A full stack takes nothing: the chip is lost, like overkill.
// a made chip, fresh from its MADE_CHIPS entry
export function mkMade(b, id) { const M = MADE_CHIPS[id]; return mkChip(b, 'made', M.value || 0, { model: id, hits: M.hits || 0, life: M.lasts === 'turns' ? M.turns || 3 : undefined, name: M.name }); }
function placeMade(cell, ch, place, at) {
  const M = madeOf(ch), solid = cell.chips.filter((y) => !isHazard(y)).length;
  if ((M.must === 'sandwiched' && solid < 2) || (M.must === 'with' && solid < 1)) return false;
  const i = M.must === 'top' ? cell.chips.length : M.must === 'bottom' ? 0 : M.must === 'sandwiched' ? 1 : placeIndex(place, at, solid);
  cell.chips.splice(i, 0, ch); return true;
}
// how long an effect chip a trick makes stays: the chip's own life (SHOP_CHIPS), not the trick's
export const fxLife = (id) => SHOP_CHIPS[id]?.life || 3;
function placeFx(b, s, cell, id, life, maker) {
  if (capacityLeft(s, cell) <= 0 || cell.hole || cell.link) { s.overflow = (s.overflow || 0) + 1; return false; }
  const ch = mkChip(b, 'fx', 0, { shop: id, resist: id, life, maker });
  if (SHOP_CHIPS[id]?.place === 'top') pushChip(cell, ch); else cell.chips.splice(cell.chips[0]?.kind === 'hat' ? 1 : 0, 0, ch);
  b.fx[ch.id] = 'spawn'; return true;
}
function makeChange(b, amount) {
  const out = [];
  for (const v of DENOM_VALUES.slice().reverse()) { if (v > (b.rules.maxDenom || 1)) continue; while (amount >= v && out.length < 60) { out.push(mkChip(b, 'std', v)); amount -= v; } }
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
// A precise layout (Opponent maker): [{ r, c, chips: [a value, or an effect chip id] }], r counted from the Stake's front.
// Anything that does not fit, or lands on a Hole, is left out.
function deployLayout(b, s, plan) {
  let placed = 0;
  for (const spot of plan.layout) {
    const r = s.dims.meterRows + (spot.r | 0), c = spot.c | 0, cell = s.grid[r]?.[c]; if (!cell || cell.hole || cell.link) continue;
    for (const it of spot.chips || []) { if (capacityLeft(s, cell) <= 0) break;
      if (typeof it === 'number') { cell.chips.push(mkChip(b, 'std', it)); placed++; continue; }
      const X = SHOP_CHIPS[it]; if (!X) continue; const v = X.vars || {}, kind = X.kind || 'std';
      cell.chips.push(mkChip(b, kind, kind === 'std' ? 1 : 0, { resist: it, shop: it, ...(v.hits ? { hits: v.hits } : {}), ...(v.turns ? { life: v.turns } : {}) })); placed++; }
  }
  return placed;
}
// plan: { chips:[{value,count,resist?}], spacing:'row'|'column'|'random', stacking:'maxed'|'balanced'|'random' }
export function deploy(b, s, plan) {
  if (plan.layout?.length) { // a painted layout, then any shop chips around it
    const n = deployLayout(b, s, plan), inLayout = {}; for (const sp of plan.layout) for (const x of sp.chips || []) if (typeof x !== 'number') inLayout[x] = (inLayout[x] || 0) + 1;
    // shop chips laid in the layout itself are not laid again around it
    const rest = plan.chips.filter((g) => g.resist).map((g) => ({ ...g, count: Math.max(0, g.count - (inLayout[g.resist] || 0)) })).filter((g) => g.count > 0);
    return n + (rest.length ? deploy(b, s, { ...plan, layout: null, chips: rest }) : 0);
  }
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
  // Resist chips from Resist Cards: at the base of a front Stake stack with room
  for (const r of plan.resistChips || []) {
    const front = cells.slice().sort((x, y) => x.r - y.r), free = (x) => open(x) && !s.grid[x.r][x.c].chips.some((ch) => ch.kind === 'resist');
    const spot = front.find((x) => solidCount(s.grid[x.r][x.c]) && free(x)) || front.find(free); // every stack full: it starts a stack of its own
    if (spot) s.grid[spot.r][spot.c].chips.unshift(mkChip(b, 'resist', 0, { r: Math.min(r, s.dims.stackMax) }));
  }
  return placed;
}
export const barCapacity = (dims, holes = 0) => (dims.barRows * dims.cols - holes) * dims.stackMax;

function mkSide(b, spec, idx) {
  const d = spec.dims, rows = d.meterRows + d.barRows;
  const s = {
    idx, name: spec.name, cls: spec.cls, roller: spec.roller || null, crown: spec.crown || null, floor: spec.floor || null, roster: spec.roster || null, ai: !!spec.ai, traits: [].concat(spec.trait || []).filter((t, i, a) => BOSS_TRAITS[t] && a.indexOf(t) === i), get trait() { return this.traits[0] || null; }, boss: !!spec.boss, sign: spec.sign || null, title: spec.title || '', deploy: spec.deploy, why: spec.why || null,
    tip: { ...spec.tip }, c: { ...spec.c }, dims: { ...d }, rows,
    grid: Array.from({ length: rows }, () => Array.from({ length: d.cols }, () => ({ chips: [], hole: false, hard: 0 }))),
    book: spec.tricks.map((t) => ({ ...t })), run: [], pouch: spec.dice.map(boutCopy), tapped: { tricks: [], dice: [] }, turnSrc: [], held: [],
    tray: [], used: { draw: 0, roll: 0, bid: 0 }, turnBonus: {}, rolled: {},
    status: { resist: 0, resistNext: 0, evade: null, evadeNext: null, reflect: 0, reflectAll: false, enfeebleNext: 0 },
    mods: { boost: 0, enfeeble: 0, press: 0, bend: null, mul: 1, pierce: false },
    behave: spec.behave || null, phases: spec.phases || null, phaseAt: -1, phaseBehave: null,
    drink: spec.drink ? { ...spec.drink } : null, sipped: false, food: [], roostDragons: 0, sky: [], bees: [], hatsDue: 0, absorbUsed: {}, forgotUsed: {}, echoes: [],
    familiars: spec.familiars || 0, interventions: spec.interventions || 0, positionTilt: spec.positionTilt || 0, intervened: false, spawners: spec.spawners || 0, calamities: spec.calamities || [],
    bidsPaid: 0, dealt: 0, destroyed: 0, snap: null,
  };
  // hazard tilts: holes on random spaces
  const spots = b.rng.shuffle(allCells(s)).slice(0, spec.holes || 0);
  for (const { cell } of spots) if (b.rng.chance(1 / 3)) s.hatsDue++; else cell.hole = true; // one in three is a Magic Hat, slipped under a stack once the chips are down
  // the tilts that are on: each opens the bout once; the House may play them again later (houseTilts)
  s.tilts = spec.tilts || {};
  const cals = s.calamities; s.calamities = []; s.spawners = 0;
  for (let k = 0; k < (spec.spawners || 0); k++) placeSpawner(b, s);
  for (const cal of cals) placeCalamity(b, s, cal);
  // the table's weather
  for (const w of b.weather) if (w === 'cloud') s.sky.push({ id: b.nextId++, kind: 'cloud', r: b.rng.int(rows), c: b.rng.int(d.cols) }); else if (w === 'sun' || w === 'moon') s.sky.push({ id: b.nextId++, kind: w, r: -1, c: -1 });
  return s;
}

// Calamities and Spawners can arrive when the bout starts or later, when the House plays the tilt. Those that sit
// on the table need empty spaces: Worm Holes a Bet space, Black Holes, Roosts and Volcanoes Stake spaces.
const emptyBar = (s) => allCells(s).filter((x) => x.r >= s.dims.meterRows && !x.cell.chips.length && !x.cell.hole && !x.cell.roost && !x.cell.link && !x.cell.anchor && !x.cell.puddle);
function placeSpawner(b, s) {
  const free = emptyBar(s);
  if (b.rng.chance(0.5) && free.length) { tiltSpots(b, s, 'spawner', free)[0].cell.roost = { id: b.nextId++ }; return 'a Dragon Roost'; }
  s.spawners++; return 'a Nest';
}
function placeCalamity(b, s, cal) {
  const d = s.dims;
  if (cal === 'wormhole') { const free = allCells(s).filter((x) => x.r < d.meterRows && !x.cell.hole && !x.cell.chips.length && !x.cell.worm); if (!free.length) return false; b.rng.pick(free).cell.worm = true; }
  else if (cal === 'blackhole') { const free = emptyBar(s); if (!free.length) return false; const { cell } = b.rng.pick(free); cell.hole = true; cell.black = true; }
  else if (cal === 'volcano') { // a full stack of Volcano chips, two by two where there is room
    const blk = freeBlock(s, b.rng.shuffle([...Array(d.barRows).keys()].map((i) => i + d.meterRows))), at = blk || b.rng.pick(emptyBar(s)); if (!at) return false;
    if (blk) claimBlock(s, blk.r, blk.c); const cell = s.grid[at.r][at.c]; cell.volcano = 4;
    for (let k = 0; k < d.stackMax; k++) cell.chips.push(mkChip(b, 'volcano', 0));
  } else if (cal === 'tornado') s.sky.push({ id: b.nextId++, kind: 'tornado', r: b.rng.int(s.rows), c: b.rng.int(d.cols), str: b.rng.range(1, 6) + b.rng.range(1, 6) });
  else if (cal === 'b52') s.sky.push({ id: b.nextId++, kind: 'b52', r: b.rng.int(s.rows), c: -1 });
  s.calamities.push(cal); return true;
}
// How the bout is going for a Roller: `lost` is the share of what they started with that they have paid to the
// House (it drives their Challenges), `gain` the share their opponent has paid (it drives their Cheats).
export const lostShare = (b, s) => clamp(b.stage.paid[s.idx] / Math.max(1, s.startWorth || 1), 0, 1);
export const gainShare = (b, s) => lostShare(b, b.sides[1 - s.idx]);
// What the House reads off a Roller's table when it plays a tilt (weights in TILT_PRESSURE): what they have lost to
// the House, the overkill and Bet overflow wasted on their side, how full their Bet is and the worth in it.
const meterCells = (s) => allCells(s).filter((x) => x.r < s.dims.meterRows);
export const meterFill = (s) => { const cells = meterCells(s), cap = cells.length * s.dims.stackMax; return cap ? clamp(sum(cells, (x) => solidCount(x.cell)) / cap, 0, 1) : 0; };
export const meterWorth = (s) => sum(meterCells(s), (x) => Math.max(0, cellWorth(x.cell)));
export function pressure(b, s) {
  const start = Math.max(1, s.startWorth || 1);
  const parts = { lost: lostShare(b, s), overkill: clamp(((s.wasted || 0) + (s.overflow || 0)) / start, 0, 1), fill: meterFill(s), value: clamp(meterWorth(s) / start, 0, 1) };
  return { ...parts, total: clamp(sum(Object.keys(TILT_PRESSURE), (k) => TILT_PRESSURE[k] * parts[k]), 0, 1) };
}
// Challenges read your pressure, Cheats your opponent's
export const tiltPressure = (b, s, key) => pressure(b, TILTS[key].kind === 'challenge' ? s : b.sides[1 - s.idx]);
export function tiltRate(b, s, key) { return tiltChance(key, tiltPressure(b, s, key).total, b.turn); } // (before its first turn the House does not play it: houseTilts)
// the spaces a tilt may lay something on, in the order its `where` asks (random among equals)
function tiltSpots(b, s, key, list) {
  const w = TILTS[key].where || 'random', m = s.dims.meterRows, out = b.rng.shuffle(list);
  const rank = { front: (x) => x.r, back: (x) => -x.r, bet: (x) => (x.r < m ? 0 : 1), stake: (x) => (x.r < m ? 1 : 0) }[w];
  return rank ? out.map((x, i) => ({ x, i })).sort((a, c) => rank(a.x) - rank(c.x) || a.i - c.i).map((y) => y.x) : out;
}
// The House plays the tilts that are on, in the House phase from the second turn.
function* houseTilts(b, s) {
  if (b.turn < 2) return; // (each tilt's own first turn is read by tiltRate)
  const L = pressure(b, s).total, G = pressure(b, b.sides[1 - s.idx]).total, rolled = {};
  // one roll a tilt a turn, whoever asks: its usual play and the chips set for it go together
  const plays = (k) => (rolled[k] ??= !!(s.tilts?.[k] && b.turn >= tiltFrom(k) && b.rng.chance(tiltRate(b, s, k)))), on = (k) => plays(k) && TILTS[k].own !== false;
  for (const [k, T] of Object.entries(TILTS)) { if (!T.chips?.length || !plays(k)) continue; // the chips set for it, laid where it lays
    const n = Math.max(1, Math.round((T.count ?? 1) + (T.countPer || 0) * (T.kind === 'challenge' ? L : G))), by = T.kind === 'challenge' ? 1 - s.idx : s.idx, hit = []; let laid = 0;
    for (let i = 0; i < n; i++) { const what = layWhat(T.chips[i % T.chips.length]);
      const x = tiltSpots(b, s, k, allCells(s).filter((y) => !y.cell.hole && !y.cell.link)).find((y) => sandboxChip(b, s.idx, y.r, y.c, what, 'add', null, by)); if (x) { laid++; hit.push(ref(s, x.r, x.c)); } }
    if (laid) yield step(b, tx('feed.the-house-plays', { name: T.name, what: tx('feed.tilt-chips', { n: laid, names: [...new Set(T.chips.map(layName))].join(', ') }) }), hit, T.kind === 'challenge' ? 'hazard' : 'bonus'); }
  const say = (k, what, kind) => step(b, tx('feed.the-house-plays', { name: TILTS[k].name, what }), [], kind);
  if (on('hazard')) { const n = 1 + Math.floor(L * 3), free = tiltSpots(b, s, 'hazard', allCells(s).filter((x) => !x.cell.chips.length && !x.cell.hole && !x.cell.roost && !x.cell.link && !x.cell.worm)); let holes = 0, hats = 0;
    for (let k = 0; k < n; k++) { if (b.rng.chance(1 / 3)) { const st = allCells(s).filter((x) => solidCount(x.cell) && capacityLeft(s, x.cell) > 0 && !x.cell.link && !x.cell.anchor && !x.cell.roost && !x.cell.chips.some((ch) => ch.kind === 'hat'));
        if (st.length) { const h0 = mkChip(b, 'hat', 0); tiltSpots(b, s, 'hazard', st)[0].cell.chips.unshift(h0); b.fx[h0.id] = 'spawn'; hats++; continue; } }
      const x = free.shift(); if (x) { x.cell.hole = true; delete x.cell.puddle; holes++; } }
    if (holes || hats) yield say('hazard', [holes ? tx('feed.line', { holes }) : '', hats ? tx('feed.magic', { hats }) : ''].filter(Boolean).join(' and '), 'hazard'); }
  if (on('creature') && b.creatures.filter((cr) => cr.side === s.idx && !cr.gone).length < 1 + Math.floor(L * 3)) {
    const cr = mkCreature(b, s.idx, b.turn + 1); if (L >= 0.5 && b.rng.chance(L)) cr.kind = b.rng.pick(['dragon', 'mothership']), cr.life = CREATURES[cr.kind].life; b.creatures.push(cr);
    yield say('creature', `a ${CREATURES[cr.kind].name} is on its way`, 'creature'); }
  if (on('spawner') && s.spawners + allCells(s).filter((x) => x.cell.roost).length < 1 + Math.floor(L * 2)) yield say('spawner', placeSpawner(b, s), 'hazard');
  if (on('calamity') && s.calamities.length < 1 + (L >= 0.5 ? 1 : 0)) { const cal = b.rng.pick(Object.keys(CALAMITIES).filter((k) => !s.calamities.includes(k)));
    if (cal && placeCalamity(b, s, cal)) yield say('calamity', CALAMITIES[cal].name, 'hazard'); }
  if (on('shield')) { const n = 1 + Math.floor(G * 4); addToMeter(b, s, Array.from({ length: n }, () => mkChip(b, 'block')), null, 'spawn'); yield say('shield', tx('feed.block-on-your-bet', { n }), 'bonus'); }
  if (on('familiar')) { // one play in three sets a Hive (Bumble Bees, and Honey from your Flowers) instead of a Familiar
    const hives = allCells(s).some((x) => x.cell.chips.some((ch) => ch.kind === 'hive')), free = emptyBar(s).concat(meterCells(s).filter((x) => !x.cell.chips.length && !x.cell.hole && !x.cell.worm && !x.cell.puddle));
    if (!hives && free.length && b.rng.chance(1 / 3)) { const x = tiltSpots(b, s, 'familiar', free)[0], n = 1 + Math.floor(G * 2);
      for (let k = 0; k < Math.min(n, s.dims.stackMax); k++) { const hv = mkChip(b, 'hive', 0, { hits: 1, shop: 'hive', resist: 'hive' }); x.cell.chips.push(hv); b.fx[hv.id] = 'spawn'; }
      yield step(b, tx('feed.the-house-plays-a', { name: TILTS.familiar.name, n: Math.min(n, s.dims.stackMax) }), [ref(s, x.r, x.c)], 'familiar'); }
    else if (s.familiars < 1 + Math.floor(G * 2)) { s.familiars++; yield say('familiar', `a Familiar joins (${s.familiars})`, 'familiar'); } }
}

// opts: { seed, a, b, rules:{ maxDenom, maxTurns } }  (a = player side 0, b = opponent side 1)
export function createBout(opts) {
  const b = { rng: new RNG(opts.seed), turn: 1, over: false, winner: null, stage: { paid: [0, 0] }, pit: [[], []], sides: [], log: [], fx: {}, nextId: 1,
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
    traitStart(b, s);
    s.startWorth = worth(s);
    for (let k = 0; k < s.hatsDue; k++) { const st = allCells(s).filter((x) => x.r >= s.dims.meterRows && solidCount(x.cell) && capacityLeft(s, x.cell) > 0 && !x.cell.link && !x.cell.anchor && !x.cell.chips.some((ch) => ch.kind === 'hat'));
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
  notes.push(`the ${C.name} is driven off${C.bounty ? tx('feed.and-drops-a-bounty', { bounty: C.bounty }) : ''}${cr.kind === 'ghostship' ? ' and its Treasure' : ''}`);
  return true;
}
function startTurn(b) {
  for (const s of b.sides) {
    s.used = { draw: 0, roll: 0, bid: 0 }; s.held = []; s.turnBonus = {}; s.rolled = {}; s.thrown = false; s.pick = { dice: [], flips: [] }; s.heat = heat(b.turn);
    s.turnSrc = []; const temp = (k, n, from) => { if (!n) return; s.turnBonus[k] = (s.turnBonus[k] || 0) + n; s.turnSrc.push({ k, n, from }); };
    for (const f of s.food || []) { for (const [k, v] of Object.entries(f.mods)) temp(k, v, f.label || 'Food'); f.turns--; } // food and drink still working
    s.food = (s.food || []).filter((f) => f.turns > 0);
    s.mods = { boost: 0, enfeeble: s.status.enfeebleNext, press: 0, bend: null, mul: 1, pierce: false }; s.wardUsed = 0; for (const x of powerChips(s)) delete x.ch.on;
    s.paidLast = s.paidTurn || 0; s.paidTurn = 0; // fees paid last turn, for Vengeance
    s.status.enfeebleNext = 0; s.absorbUsed = {}; s.forgotUsed = {};
    const curses = allCells(s).reduce((n, x) => n + x.cell.chips.filter((ch) => ch.cursed).length, 0); s.cursed = curses; // a Cursed chip in your pile: Draw, Roll or Bid 1 lower
    let hold = 0; for (const T of bossTraits(s)) { // every trait it plays by, turn by turn (a High Roller's own; yours, one for each business card in your wallet)
      if (T.k === 'tempo' && b.turn % Math.max(2, T.vars.every || 3) === 0) for (const k of ['trickery', 'proficiency', 'ingenuity']) temp(k, 1, T.name);
      if (T.k === 'resist') hold += T.vars.n || 1; }
    if (hold) s.status.resist = Math.max(s.status.resist || 0, hold);
    for (let k = 0; k < curses; k++) { const can = ['trickery', 'proficiency', 'ingenuity'].filter((x) => tipOf(s, x) > 1); if (can.length) temp(b.rng.pick(can), -1, 'Curse'); }
  }
  b.creatures = b.creatures.filter((cr) => !cr.gone);
  b.phase = 'draw'; openPhase(b);
}
const snapshot = (s) => { s.snap = clone({ grid: s.grid, run: s.run, book: s.book, pouch: s.pouch, tray: s.tray, used: s.used, thrown: s.thrown, pick: s.pick, turnBonus: s.turnBonus, food: s.food, revive: s.revive || [] }); };
// When a phase opens, each Roller's table is recorded as the other may see it (`pub`) until this phase closes,
// and as the point Undo returns to (`snap`).
function openPhase(b) { for (const s of b.sides) { snapshot(s); s.pub = clone({ grid: s.grid, run: s.run }); } }

// ---------- phases ----------
const loose = (e) => e.state !== 'play'; // shown or bid this turn: can still take dice (shown) or bids
// Dice go only on a trick bid on this turn, any number and any size; the first `count` dice of the trick's own die
// size (flipped chips count as any size) are its Bonus dice (bonusDice).
const roomOn = (e) => e.state !== 'play'; // shown or bid this turn: could still be bid, then take dice
const fitsOn = (d, e) => e.state === 'bid' && (d.chip || !sizeOn(e) || sizeOn(e) === d.type);
// All the dice on one trick are one size: the first real die put on it sets the size (a flipped chip joins any size).
// No size is required to play; only the trick's own size makes its Bonus.
export const sizeOn = (e) => e.dice.find((d) => !d.chip)?.type || null;
// What a chip adds to the trick it is bid on: its value; a Debt chip takes its value away (bidding it clears the debt
// off the stack: the trick pays for it); a chip whose value is a true 0 adds nothing but is still a bid.
export const bidVal = (ch) => (ch.kind === 'debt' ? -ch.value : ch.value || 0);
// A chip that can be bid: anything a fee could take, a stack's Debt marker, and a made chip whose value is set to 0
// (a value left unset is no value at all, and cannot be bid).
export const isBiddable = (ch) => isPayable(ch) || ch.kind === 'debt' || (ch.kind === 'made' && madeOf(ch)?.value === 0 && lastsOf(ch) !== 'match' && !fxAction(ch.model)); // an effect's chip is at work: it is not yours to bid
const spare = (s, ch) => worth(s) - bidVal(ch) > 0; // spending this chip does not leave you broke
export function flippable(s) { const out = []; for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.dims.cols; c++) { const ch = bidChip(s, r, c); if (ch?.kind === 'std' && spare(s, ch)) out.push({ r, c, ch }); } return out; }
export function biddable(s) { const out = []; for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.dims.cols; c++) { const ch = bidChip(s, r, c); if (ch && spare(s, ch)) out.push({ r, c, ch }); } return out; }
// Is the phase's one required action possible at all? If not, the phase can be closed without it.
export function canAct(b, s, phase = b.phase) {
  if (phase === 'aim') return trayPlaceable(s) || s.run.some((e) => e.state === 'bid' && (needsTarget(e) || TRICKS[e.trick.id].approach !== 'none') && validTargets(b, s, e).length > 1);
  if (phase === 'draw') return s.book.length > 0 && tipOf(s, 'trickery') > 0;
  if (phase === 'roll') return canThrowAny(s);
  if (phase === 'bid') return (s.run.some(loose) || revivable(b, s).length > 0) && biddable(s).length > 0;
  return false;
}
export const placedThisTurn = (b, s) => s.run.some((e) => e.dice.some((d) => d.t === b.turn));
// Dice in the roll are kept: each Bluff you put at least one on a trick (when one fits), and the rest stay in the
// roll, keeping their values, turn after turn, to pick from later, like tricks waiting on your Run (never rerolled).
export const trayPlaceable = (s) => s.tray.some((d) => s.run.some((e) => fitsOn(d, e)));
export const canThrowAny = (s) => !s.thrown && tipOf(s, 'proficiency') > 0 && s.run.some(roomOn) && (flippable(s).length > 0 || s.pouch.length > 0);
// The dice a trick's Bonus reads: the first `count` on it of its own die size (a flipped chip counts as any size).
export function bonusDice(e) { const def = defOf(e.trick), sz = sizeOn(e); if (sz && sz !== def.die) return []; return e.dice.slice(0, def.count); }
// Bonus dice still wanted on a trick
export const bonusRoom = (e) => Math.max(0, defOf(e.trick).count - bonusDice(e).length);
// What still stops this Roller closing the current phase, or null.
export function needOf(b, s) {
  if (b.phase === 'draw') return s.used.draw > 0 || !canAct(b, s) ? null : tx('feed.draw-at-least-one');
  if (b.phase === 'roll') return s.thrown || !canThrowAny(s) || s.pick.dice.length + s.pick.flips.length ? null : tx('feed.pick-at-least-one');
  if (b.phase === 'bid') return s.used.bid > 0 || !canAct(b, s) ? null : tx('feed.bid-at-least-one');
  if (b.phase === 'aim') return !trayPlaceable(s) || placedThisTurn(b, s) ? null : tx('feed.put-a-die-in');
  return null;
}
// Close the current phase for both Rollers. Returns false if either still owes its required action (unless forced).
export function advance(b, force = false) {
  if (b.phase === 'drink') return nextTurn(b);
  if (!PHASES.includes(b.phase)) return false;
  if (!force && b.sides.some((s) => needOf(b, s))) return false;
  const i = PHASES.indexOf(b.phase);
  if (b.phase === 'roll') for (const s of b.sides) throwPicked(b, s); // the picked dice are thrown as the Bid opens
  phaseRewards(b, b.phase);
  b.phase = PHASES[i + 1] || 'resolve';
  if (b.phase !== 'resolve') openPhase(b);
  return true;
}
// ---------- what a passed phase gives back ----------
// Draws, rolls and bids left unused pay as soon as their phase is passed, as chips on the Bet at random spaces with
// room: unused draws make a Steal chip (Charisma) that steals from the Stage in the House phase, unused rolls Power
// chips (Conviction) for the turn, unused bids Opportunity chips (Cunning). What has no room is lost, like overkill.
// `deploy`: the House phase the chips go out in (Power is an Investment, Opportunity an Insurance, Steal an Expense)
export const REWARD = { draw: { stat: 'trickery', c: 'charisma', what: 'Steal', deploy: 'expense' }, roll: { stat: 'proficiency', c: 'conviction', what: 'Power', deploy: 'investment' }, bid: { stat: 'ingenuity', c: 'cunning', what: 'Opportunity', deploy: 'insurance' } };
export function rewardOf(s, phase) {
  const R = REWARD[phase]; if (!R) return null;
  const used = s.used[phase] + (phase === 'roll' && !s.thrown && s.pick ? s.pick.dice.length + s.pick.flips.length : 0); // dice picked count before they are thrown
  const unused = Math.max(0, tipOf(s, R.stat) - used), n = cOf(s, R.c) * unused;
  return { phase, unused, n, what: R.what, total: tipOf(s, R.stat), deploy: R.deploy };
}
// Passing a phase with actions left unused only records them (`held`): the chips are not on the table yet. The House
// deploys them in their own phase, at what Charisma, Cunning or Conviction is worth then: Power chips with the
// Investments, Opportunity chips with the Insurances, and the Steal with the Expenses.
function phaseRewards(b, phase) {
  for (const s of b.sides) { const w = rewardOf(s, phase); if (!w || !w.unused) continue; (s.held ||= []).push({ phase, unused: w.unused, turn: b.turn }); }
}
export const heldIn = (s, type) => (s.held || []).filter((x) => REWARD[x.phase].deploy === type);
// what the held actions would deploy as the table stands now
export const heldAmount = (s, phase) => sum((s.held || []).filter((x) => x.phase === phase), (x) => x.unused) * cOf(s, REWARD[phase].c);
function* deployHeld(b, s, type) {
  b.rewards = b.rewards || [];
  for (const x of heldIn(s, type)) {
    const R = REWARD[x.phase], n = cOf(s, R.c) * x.unused; s.held.splice(s.held.indexOf(x), 1);
    const u = tx('feed.unused', { unused: x.unused, phase: x.phase });
    if (!n) { yield step(b, tx('feed.held-nothing', { name: s.name, u, what: R.what }), [], 'miss'); continue; }
    if (R.what === 'Steal') { const stolen = recoup(b, s, n, true);
      yield step(b, tx('feed.s-steal', { name: s.name, stN: 1, v: stolen ? tx('feed.stolen-from-the-stage', { stolen }) : 'nothing on the Stage to steal', v2: stolen < n && stolen ? tx('feed.of', { want: n }) : '' }), [], 'bonus'); continue; }
    const chips = R.what === 'Power' ? Array.from({ length: n }, () => powerChip(b)) : Array.from({ length: n }, () => mkChip(b, 'opp', 1));
    const { left, at } = toMeterAtRandom(b, s, chips), got = n - left.length;
    if (R.what === 'Power') { for (const ch of chips) if (!left.includes(ch)) ch.on = true; s.mods.boost += got * (shopVars('power').boost || 1); }
    const text = `${tx('feed.on-the-bet', { u, got, what: R.what })}${left.length ? tx('feed.had-no-room-and', { leftN: left.length }) : ''}.`;
    b.rewards.push({ side: s.idx, phase: x.phase, turn: b.turn, text, cells: at.map((y) => ref(s, y.r, y.c)) });
    yield step(b, `${s.name}: ${text}`, at.map((y) => ref(s, y.r, y.c)), 'bonus');
  }
}
// chips onto the Bet, each at a random space with room
function toMeterAtRandom(b, s, chips) {
  const left = [], at = [];
  for (const ch of chips) {
    const room = allCells(s).filter((x) => x.r < s.dims.meterRows && !x.cell.hole && !x.cell.link && capacityLeft(s, x.cell) > 0);
    if (!room.length) { left.push(ch); b.fx[ch.id] = 'void'; continue; }
    const x = b.rng.pick(room); pushChip(x.cell, ch); b.fx[ch.id] = 'spawn'; at.push(x);
  }
  if (left.length) s.overflow = (s.overflow || 0) + left.length;
  return { left, at };
}
// Added Power is Power chips on the Bet: the same chip Empower makes, one per point of Power. Each adds its +1 to
// your roll effects for the turn (in the Investment phase, or at once if it arrives during play), and these last that
// turn. `on`: it has already added its +1 this turn.
const powerChip = (b) => mkChip(b, 'fx', 0, { shop: 'power', resist: 'power', life: 1 });
export const powerChips = (s) => allCells(s).flatMap((x) => x.cell.chips.filter((ch) => ch.resist === 'power').map((ch) => ({ ...x, ch })));
// Power still to join this turn's roll effects (shown on the cards while you plan)
export const powerOf = (s) => sum(powerChips(s), (x) => (x.ch.on ? 0 : shopVars('power').boost || 1));
// Power a trick will get this turn: chips on the Bet still to add, and unused rolls the House will deploy as Power
export const powerAhead = (s) => powerOf(s) + heldAmount(s, 'roll') * (shopVars('power').boost || 1);
export function addPower(b, s, n) {
  if (n <= 0) return 0;
  const { at } = toMeterAtRandom(b, s, Array.from({ length: n }, () => powerChip(b)));
  if (b.phase === 'resolve') { const placed = powerChips(s).filter((x) => !x.ch.on && at.some((y) => y.cell === x.cell)); for (const x of placed) x.ch.on = true; s.mods.boost += placed.length * (shopVars('power').boost || 1); }
  return at.length;
}
// Saturate's bonus knocks off the Power your opponent added (Empower's chips stay)
function dropPower(b, s) { for (const x of powerChips(s)) if (!x.ch.maker) { x.cell.chips.splice(x.cell.chips.indexOf(x.ch), 1); b.fx[x.ch.id] = 'void'; } }
function homeDie(b, s, d, at) { if (d.chip) addToMeter(b, s, [d.chip], null, 'spawn'); else { const { value, t, ...die } = d; void value; void t; s.tapped.dice.push({ die, at }); } } // a flipped chip comes back to the Bet; a die taps

// ---------- occupancy, tapping and restoring ----------
// Words: a space is OCCUPIED with at least one chip in it (FILLED would mean its stack is at full height). On the
// table a Bet or Stake COLUMN is one depth line (engine row r, its 5 spaces across the lanes) and a ROW is a lane
// (engine column c). Columns vary with Versatility and Depth; rows are always 5.
// A space covered by a big chip's footprint counts as its home space; a Hole holds no chips, so the Bet does not
// need it to be Fully Occupied.
const holds = (s, r, c) => !s.grid[r][c].hole;
export const spaceOccupied = (s, r, c) => { const h0 = homeOf(s, r, c); return s.grid[h0.r][h0.c].chips.some((ch) => ch.kind !== 'stray'); };
export function occupancy(s) {
  const m = s.dims.meterRows, cols = s.dims.cols, betCols = [], stakeCols = [], stakeRows = [];
  for (let r = 0; r < s.rows; r++) { let n = 0, of = 0; for (let c = 0; c < cols; c++) { if (holds(s, r, c)) of++; if (spaceOccupied(s, r, c)) n++; } (r < m ? betCols : stakeCols).push({ r, n, of }); }
  const betRows = [];
  for (let c = 0; c < cols; c++) { let n = 0, nb = 0; for (let r = 0; r < s.rows; r++) if (spaceOccupied(s, r, c)) { if (r < m) nb++; else n++; } stakeRows.push({ c, n }); betRows.push({ c, n: nb }); }
  const betSpaces = sum(betCols, (x) => x.n), betTotal = sum(betCols, (x) => x.of);
  // aligned: one column holds a chip in every row
  const aligned = (list) => list.find((x) => x.n >= cols)?.r ?? -1;
  return { betCols, stakeCols, stakeRows, betRows, betSpaces, betTotal, betColsOcc: betCols.filter((x) => x.n > 0).length, stakeColsOcc: stakeCols.filter((x) => x.n > 0).length,
    stakeCovered: stakeRows.every((x) => x.n > 0), betCovered: betRows.every((x) => x.n > 0), stakeAligned: aligned(stakeCols), betAligned: aligned(betCols),
    full: betTotal > 0 && betSpaces >= betTotal };
}
// What occupying rows earns (a Roller has no Charisma, Cunning or Conviction of its own: 0 / 0 / 0, plus what a jacket,
// food or a sip adds for as long as it lasts). A chip in every row (lane) of the Stake: +1 to the class's primary C.
// A chip in every row of the Bet: +1 to all three. A zone counts on its own: its rows can't be split between the Stake
// and the Bet. Both: +2 primary / +1 / +1. And focus in both zones (each zone's rows all held by one column of it):
// +1 more to the primary and +1 more to all three, +4 / +2 / +2. Amounts: TUNING.occupancy.
export const CCC = ['charisma', 'cunning', 'conviction'];
export function occBonus(s, o = occupancy(s)) {
  const T = { covered: 1, focus: 1, ...(TUNING.occupancy || {}) }, out = { charisma: 0, cunning: 0, conviction: 0, parts: [] }, k = primaryC(s.cls);
  if (o.stakeCovered) { out[k] += T.covered; out.parts.push({ zone: 'stake', n: T.covered, keys: [k] }); }
  if (o.betCovered) { for (const x of CCC) out[x] += T.covered; out.parts.push({ zone: 'bet', n: T.covered, keys: CCC }); }
  if (o.stakeCovered && o.betCovered && o.stakeAligned >= 0 && o.betAligned >= 0) { out[k] += T.focus; for (const x of CCC) out[x] += T.focus; out.parts.push({ zone: 'focus', n: T.focus, keys: [k], all: true }); }
  return out;
}
// Restore order: tapped longest first. Ties: tricks by the phase they belong to, worse quality, basic before exotic
// prints; dice smaller before larger, plain before fancy; then the one you got first.
const RAR = { basic: 0, misprint: 1, reprint: 2, foil: 3 };
const exotic = (t) => (t.foil ? 4 : RAR[t.rar] || 0) + (t.gem ? 1 : 0);
const fancy = (d) => (d.up?.length || 0) + (d.mat && d.mat !== DEFAULT_MAT ? 1 : 0) + (d.bone ? 1 : 0) + (d.cast ? 1 : 0) + (d.faces ? 1 : 0);
const cmp = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1; return 0; };
const trickKey = (x) => [x.at, TYPES[phaseOf(x.trick.id)]?.order ?? 9, x.trick.q || 1, exotic(x.trick), String(x.trick.uid)];
const dieKey = (x) => [x.at, DICE[x.die.type]?.faces ?? 99, fancy(x.die), x.die.id];
export const tappedInOrder = (s) => ({ tricks: s.tapped.tricks.slice().sort((a, b) => cmp(trickKey(a), trickKey(b))), dice: s.tapped.dice.slice().sort((a, b) => cmp(dieKey(a), dieKey(b))) });
// What the end of this turn restores if the table stays as it is now: one trick per occupied Bet column, one die per
// occupied Stake column. The UI calls this after every action, so it follows the board as effects change it.
export function restorePlan(b, s) {
  const o = occupancy(s), q = tappedInOrder(s);
  const paid = (s.revive || []).map((x) => x.uid), rest = q.tricks.filter((x) => !paid.includes(x.trick.uid));
  return { o, nTricks: o.betColsOcc, nDice: o.stakeColsOcc, revived: paid, tricks: [...paid, ...rest.slice(0, o.betColsOcc).map((x) => x.trick.uid)], dice: q.dice.slice(0, o.stakeColsOcc).map((x) => x.die.id) };
}
// ---------- bidding on a tapped trick (resuscitating it) ----------
// In the Bid phase a chip can be bid on one of your tapped tricks instead of a trick on your Run. It is a bid like any
// other (it uses one, and it passes the phase). The trick is brought back by this turn's restore, on top of what your
// Bet columns restore. Bringing a trick back takes its quality level in chip value (I 1, II 2, III 3, IV 4, a Foil a
// level more): any chip will do it, and the difference between the chip and that level stays on the trick as a base
// effect for its next play: +1 for a 2¢ chip on a quality I trick, -1 for a 0¢ chip on it (weaker, but back in the Book).
// A trick the restore is already bringing back cannot be bid on: the chip would be wasted.
export const reviveCost = (t) => playQ(t);
export const revivable = (b, s) => { const coming = restorePlan(b, s).tricks; return s.tapped.tricks.filter((x) => !coming.includes(x.trick.uid)).map((x) => x.trick); };
export function canRevive(b, s, uid, r, c) {
  const gate = phaseGate(b, 'bid'); if (gate) return gate;
  if (!s.tapped.tricks.some((x) => x.trick.uid === uid)) return tx('feed.revive-not-tapped');
  if ((s.revive || []).some((x) => x.uid === uid)) return tx('feed.revive-already-bid');
  if (restorePlan(b, s).tricks.includes(uid)) return tx('feed.revive-already-restoring');
  if (s.used.bid >= tipOf(s, 'ingenuity')) return tx('table.no-bids-left-this-2');
  const ch = r == null ? null : bidChip(s, r, c);
  if (r != null && !ch) return tx('feed.only-an-uncovered-standard');
  if (ch && !spare(s, ch)) return tx('feed.that-would-bid-your');
  return null;
}
// the chip a space bids leaves its stack, remembering where it came from (a bid taken back goes home)
function takeBid(s, r, c) { const ch = bidChip(s, r, c), cell = s.grid[r][c]; cell.chips.splice(cell.chips.indexOf(ch), 1); ch.from = { r, c, base: lifted(cell) }; return ch; }
export function revive(b, s, uid, r, c) {
  if (r == null || canRevive(b, s, uid, r, c)) return null;
  const ch = takeBid(s, r, c), t = s.tapped.tricks.find((x) => x.trick.uid === uid).trick;
  (s.revive ||= []).push({ uid, ch, base: bidVal(ch) - reviveCost(t) }); s.used.bid++;
  return ch;
}
export function canUnrevive(b, s, uid) { if (b.phase !== 'bid') return tx('feed.bids-can-be-taken'); return (s.revive || []).some((x) => x.uid === uid && !x.paid) ? null : tx('feed.that-chip-was-not'); }
export function unrevive(b, s, uid) {
  if (canUnrevive(b, s, uid)) return null;
  const x = s.revive.splice(s.revive.findIndex((y) => y.uid === uid), 1)[0], from = x.ch.from; delete x.ch.from;
  bidHome(b, s, x.ch, from); s.used.bid--;
  return x.ch;
}
function untap(s, plan) {
  const tr = s.tapped.tricks.filter((x) => plan.tricks.includes(x.trick.uid)), di = s.tapped.dice.filter((x) => plan.dice.includes(x.die.id));
  for (const x of s.revive || []) { const t = tr.find((y) => y.trick.uid === x.uid)?.trick; if (t) { if (x.base) t.base = x.base; else delete t.base; } } // the difference rides on the trick
  s.revive = [];
  s.tapped.tricks = s.tapped.tricks.filter((x) => !tr.includes(x)); s.tapped.dice = s.tapped.dice.filter((x) => !di.includes(x));
  for (const x of tappedSort(tr, trickKey)) s.book.push(x.trick); for (const x of tappedSort(di, dieKey)) s.pouch.push(x.die);
  return { tricks: tr.length, dice: di.length, revived: plan.revived?.length || 0 };
}
const tappedSort = (list, key) => list.slice().sort((a, b) => cmp(key(a), key(b)));
// End of turn: restore by column, then note whether the Bet is Fully Occupied for the start of the next turn.
function* restorePhase(b) {
  const cxs = b.sides.map((s) => ({ phase: 'house', who: s.idx }));
  yield* zip(b, b.sides.map((s) => (function* () {
    const plan = restorePlan(b, s), got = untap(s, plan);
    const left = s.tapped.tricks.length + s.tapped.dice.length;
    if (!got.tricks && !got.dice && !left) return;
    const cells = []; for (const col of [...plan.o.betCols, ...plan.o.stakeCols]) if (col.n) for (let c = 0; c < s.dims.cols; c++) if (spaceOccupied(s, col.r, c)) cells.push(ref(s, col.r, c));
    yield step(b, tx('feed.restores', { name: s.name, tricks: got.tricks, dice: got.dice, bet: plan.o.betColsOcc, betOf: plan.o.betCols.length, stake: plan.o.stakeColsOcc, stakeOf: plan.o.stakeCols.length })
, cells, 'bonus');
    if (got.revived) yield step(b, tx('feed.revived', { name: s.name, n: got.revived }), [], 'bonus');
  })()), cxs);
}
// A stat as it stands this turn: the class's base, what gear and the run add (jacket, cards, rest, floor), and each
// temporary change with where it came from (food, drink, Full Bet, Curse).
export function statParts(s, k) {
  const inTip = k in s.tip, base = inTip ? CLASS_BASE[s.cls]?.tip?.[k] ?? s.tip[k] : occBonus(s)[k] || 0; // CCC: what occupying rows earns now
  const own = inTip ? s.tip[k] : base + (s.c[k] || 0), temp = (s.turnSrc || []).filter((x) => x.k === k);
  return { k, base, gear: own - base, temp, tempN: sum(temp, (x) => x.n), total: inTip ? tipOf(s, k) : cOf(s, k) };
}

// ---------- food ----------
// Eat a food chip from the top of one of your stacks. Its bonus starts now and runs for its turns.
export function canEat(b, s, r, c) {
  if (b.phase !== 'drink') return tx('feed.eat-in-the-drink');
  if (s.ate) return tx('feed.one-food-a-round');
  const cell = s.grid[r]?.[c], i = cell ? topSolid(cell) : -1;
  if (i < 0 || !['food', 'egg'].includes(cell.chips[i].kind)) return tx('feed.only-a-food-chip');
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
    if (dip) { mods = Object.fromEntries(Object.entries(mods).map(([k, v]) => [k, v * 2])); label += tx('feed.dipped'); return { mods, turns: F.turns || 1, eat: [ch], label, dip }; } }
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
export const canSip = (b, s) => (b.phase !== 'drink' ? tx('feed.sip-in-the-drink') : !s.drink || s.drink.sips <= 0 ? tx('feed.nothing-left-to-sip') : (s.sipped || 0) >= TUNING.drinks.sipsPerRound ? tx('feed.a-round', { v: TUNING.drinks.sipsPerRound === 1 ? tx('feed.one-sip') : tx('feed.sips', { sipsPerRound: TUNING.drinks.sipsPerRound }) }) : null);
export function sip(b, s) {
  if (canSip(b, s)) return false;
  s.drink.sips--; s.sipped = (s.sipped || 0) + 1;
  s.food.push({ mods: { ...s.drink.mods }, turns: TUNING.drinks.sipTurns, label: s.drink.name });
  return true;
}
// is there anything to do in the Drink phase?
export const drinkUseful = (b, s) => !canSip(b, s) || allCells(s).some(({ r, c }) => !canEat(b, s, r, c));
// close the Drink phase and start the next turn
export function nextTurn(b) { if (b.phase !== 'drink' || b.over) return false; b.turn++; startTurn(b); return true; }
const phaseGate = (b, want) => (b.phase === want ? null : PHASES.indexOf(b.phase) < PHASES.indexOf(want) ? tx('feed.lock-in-your-s', { PHASES: PHASES[PHASES.indexOf(want) - 1] }) : tx('feed.is-over-for-this', { v: want === 'draw' ? 'Drawing' : want === 'roll' ? 'Rolling' : 'Bidding' }));
export function canDraw(b, s, uid) {
  const gate = phaseGate(b, 'draw'); if (gate) return gate;
  if (s.used.draw >= tipOf(s, 'trickery')) return tx('feed.no-draws-left-this');
  if (!s.book.some((t) => t.uid === uid)) return tx('feed.that-trick-is-in');
  return null;
}
// Copies of one trick (the same trick at the same quality; any print or condition) can be drawn onto each other on
// the Run. A stack plays with one bid: the top copy this turn, the next one the turn after with the same roll and
// target, and so on, each copy playing with its own print. That is how a trick lingers.
export const canStackOn = (s, t, e) => !!e && !!t && e.state === 'shown' && !e.dice.length && e.trick.id === t.id && (e.trick.q || 1) === (t.q || 1);
export function draw(b, s, uid, ontoUid = null) {
  if (canDraw(b, s, uid)) return null;
  const onto = ontoUid != null ? s.run.find((x) => x.uid === ontoUid) : null, t0 = s.book.find((t) => t.uid === uid);
  if (ontoUid != null && !canStackOn(s, t0, onto)) return null;
  const i = s.book.findIndex((t) => t.uid === uid), trick = s.book.splice(i, 1)[0];
  if (onto) { (onto.stack ||= []).unshift(onto.trick); (onto.layers ||= [{ drawn: onto.drawn, bookAt: onto.bookAt }]).unshift({ drawn: b.turn, bookAt: i }); onto.trick = trick; s.used.draw++; return onto; }
  const e = { uid, trick, dice: [], bid: [], bidValue: 0, target: null, state: 'shown', stack: [], lingerLeft: 0, drawn: b.turn, bookAt: i };
  const Q = QDIE[trick.q]; if (Q) e.qroll = s.rolled['q' + uid] ?? (s.rolled['q' + uid] = 1 + b.rng.int(Q.faces)); // the same roll if drawn again this turn
  s.run.push(e); s.used.draw++;
  return e;
}
// Take the top copy off a stack to play on its own (while the stack is only shown: no bid, no dice). It costs nothing:
// the copy was already drawn. It can be stacked again by putting it back in the Book and drawing it onto its twin.
export function canUnstack(b, s, uid) {
  const e = s.run.find((x) => x.uid === uid); if (!e?.stack?.length) return tx('feed.unstack-none');
  if (b.phase !== 'draw' && b.phase !== 'bid') return tx('feed.unstack-when');
  if (e.state !== 'shown' || e.dice.length) return tx('feed.that-trick-has-dice');
  return null;
}
export function unstack(b, s, uid) {
  if (canUnstack(b, s, uid)) return null;
  const e = s.run.find((x) => x.uid === uid), top = e.trick, L = (e.layers || []).shift() || { drawn: e.drawn, bookAt: e.bookAt };
  e.trick = e.stack.shift();
  // the stack answers to its first-drawn copy's uid (it is still in the stack), so the copy taken off uses its own
  const n = { uid: top.uid, trick: top, dice: [], bid: [], bidValue: 0, target: null, state: 'shown', stack: [], lingerLeft: 0, drawn: L.drawn, bookAt: L.bookAt };
  const Q = QDIE[top.q]; if (Q) n.qroll = s.rolled['q' + top.uid] ?? (s.rolled['q' + top.uid] = 1 + b.rng.int(Q.faces));
  s.run.splice(s.run.indexOf(e) + 1, 0, n);
  return n;
}
// Click a trick drawn this turn to put it back in the Book, while the Draw phase is open.
export function canUndraw(b, s, uid) {
  if (b.phase !== 'draw') return tx('feed.tricks-go-back-to');
  const e = s.run.find((x) => x.uid === uid);
  if (!e || (e.layers?.[0]?.drawn ?? e.drawn) !== b.turn) return 'Only a trick drawn this turn can go back to the Book.';
  if (e.dice.length || e.state !== 'shown') return tx('feed.that-trick-has-dice');
  return null;
}
export function undraw(b, s, uid) {
  if (canUndraw(b, s, uid)) return null;
  const top = s.run.find((x) => x.uid === uid);
  if (top.stack?.length) { const L = top.layers.shift(); s.book.splice(Math.min(L.bookAt ?? s.book.length, s.book.length), 0, top.trick); top.trick = top.stack.shift(); s.used.draw--; return top; } // the top copy goes back
  const e = s.run.splice(s.run.findIndex((x) => x.uid === uid), 1)[0];
  s.book.splice(Math.min(e.bookAt ?? s.book.length, s.book.length), 0, e.trick); s.used.draw--;
  return e;
}
// Rolling is one throw a turn. In the Roll phase you pick the dice (and any top chips to flip); they are thrown
// together as the Bid opens, so both Rollers bid seeing both rolls. In the Bluff you put them on tricks.
// (throwDice throws at once: the engine's own step, used when the Roll phase closes.)
export function canRollOut(b, s, dieId) {
  const gate = phaseGate(b, 'roll'); if (gate) return gate;
  if (s.thrown) return tx('table.you-have-rolled-this');
  if (!s.pouch.some((d) => d.id === dieId)) return tx('feed.that-die-has-already');
  if (s.used.roll >= tipOf(s, 'proficiency')) return tx('feed.no-rolls-left-this');
  return null;
}
// dieIds: dice from the Pouch; flips: [{r,c}] stacks whose top chip is flipped. All land in the roll together.
export function canThrow(b, s, dieIds = [], flips = []) {
  const gate = phaseGate(b, 'roll'); if (gate) return gate;
  if (s.thrown) return tx('table.you-have-rolled-this');
  const n = dieIds.length + flips.length, max = tipOf(s, 'proficiency');
  if (!n) return tx('feed.pick-at-least-one-2');
  if (n > max) return tx('feed.you-can-roll-this', { max });
  if (dieIds.some((id) => !s.pouch.some((d) => d.id === id))) return tx('feed.that-die-is-not');
  if (new Set(flips.map((f) => f.r + ':' + f.c)).size < flips.length) return tx('feed.each-stack-can-flip');
  if (flips.some(({ r, c }) => bidChip(s, r, c)?.kind !== 'std')) return tx('table.only-an-uncovered-standard');
  if (flips.length && worth(s) - sum(flips, ({ r, c }) => bidChip(s, r, c).value) <= 0) return tx('feed.flipping-those-would-leave');
  return null;
}
export function canPick(b, s, dieIds = [], flips = []) { if (!dieIds.length && !flips.length) return phaseGate(b, 'roll') || (s.thrown ? tx('table.you-have-rolled-this') : null); return canThrow(b, s, dieIds, flips); }
// what will be thrown when the Roll phase closes
export function setPick(b, s, dieIds = [], flips = []) { if (canPick(b, s, dieIds, flips)) return false; s.pick = { dice: dieIds.slice(), flips: flips.map(({ r, c }) => ({ r, c })) }; return true; }
function throwPicked(b, s) {
  if (s.thrown) return; const { dice, flips } = s.pick || { dice: [], flips: [] }; s.pick = { dice: [], flips: [] };
  const ok = dice.filter((id) => s.pouch.some((d) => d.id === id)), fl = flips.filter(({ r, c }) => bidChip(s, r, c)?.kind === 'std');
  if (ok.length + fl.length && !canThrow(b, s, ok, fl)) throwDice(b, s, ok, fl);
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
// A die as your table rolls it: Upgrade chips on your Bet upgrade every roll; Boosted chips in your position
// raise every die, Cheapened chips in your opponent's lower it.
const countShop = (s, id, rows) => sum(allCells(s).filter((x) => !rows || x.r < s.dims.meterRows), (x) => x.cell.chips.filter((ch) => ch.shop === id).length);
function rollWith(b, s, die) {
  const o = b.sides[1 - s.idx], U = countShop(s, 'upgrade', true);
  let v;
  if (U) { // each Upgrade chip on your Bet puts a random upgrade on this roll only: a risk as much as a help
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
  if (s.thrown) return tx('table.you-have-rolled-this');
  const ch = bidChip(s, r, c);
  if (!ch || ch.kind !== 'std') return tx('table.only-an-uncovered-standard');
  if (s.used.roll >= tipOf(s, 'proficiency')) return tx('feed.no-rolls-left-this-2');
  return null;
}
export function flip(b, s, r, c) {
  if (canFlip(b, s, r, c)) return null;
  const ch = bidChip(s, r, c), key = 'c' + ch.id; s.grid[r][c].chips.splice(s.grid[r][c].chips.indexOf(ch), 1);
  const d = { id: key, type: 'd6', up: [], value: s.rolled[key] ?? (s.rolled[key] = b.rng.next() < 0.5 ? 0 : ch.value), chip: ch, t: b.turn };
  s.tray.push(d); s.used.roll++;
  return d;
}
export const holderOf = (s, dieId) => s.run.find((e) => e.dice.some((d) => d.id === dieId)) || null;
// a die on a trick can still be moved while the Roll phase is open, if it was rolled this turn
// Dice rolled this turn are put on tricks, and can be moved between them, in the Bluff.
const editing = (b) => b.phase === 'aim';
export const canMove = (b, s, dieId) => { const e = holderOf(s, dieId); return editing(b) && !!e && e.state !== 'play' && e.dice.find((d) => d.id === dieId).t === b.turn; };
export function canPlace(b, s, dieId, e) {
  if (b.phase !== 'aim') return b.phase === 'roll' || b.phase === 'bid' || b.phase === 'draw' ? tx('table.dice-go-on-tricks') : tx('feed.the-turn-is-in');
  const def = TRICKS[e.trick.id], d = s.tray.find((x) => x.id === dieId) || (canMove(b, s, dieId) ? holderOf(s, dieId).dice.find((x) => x.id === dieId) : null);
  if (!d) return s.pouch.some((x) => x.id === dieId) ? tx('feed.roll-the-die-first') : tx('feed.that-die-is-committed');
  if (e.state === 'play') return tx('table.that-trick-is-already');
  if (e.state !== 'bid') return tx('feed.bid-before-dice', { name: def.name });
  if (e.dice.some((x) => x.id === dieId)) return tx('feed.that-die-is-already');
  const sz = sizeOn(e); if (!d.chip && sz && sz !== d.type) return tx('feed.all-dice-one-size', { name: def.name, die: sz });
  return null;
}
function takeLoose(s, dieId) {
  let i = s.tray.findIndex((d) => d.id === dieId); if (i >= 0) return s.tray.splice(i, 1)[0];
  const e = holderOf(s, dieId); i = e.dice.findIndex((d) => d.id === dieId); return e.dice.splice(i, 1)[0];
}
export function place(b, s, dieId, e) {
  if (canPlace(b, s, dieId, e)) return null;
  const d = takeLoose(s, dieId); e.dice.push(d); d.t = b.turn;
  const sz = sizeOn(e) || defOf(e.trick).die; for (const x of e.dice) if (x.chip) x.type = sz; // a flipped chip takes the size of the dice it joins
  return d;
}
export function unplace(b, s, dieId) { if (!canMove(b, s, dieId)) return null; const d = takeLoose(s, dieId); s.tray.push(d); return d; }
export function bidChip(s, r, c) {
  const cell = s.grid[r]?.[c]; if (!cell || !cell.chips.length || cell.chips.some((ch) => ch.kind === 'frost')) return null;
  const top = lifted(cell) ? cell.chips.find((ch) => !isHazard(ch)) : cell.chips[cell.chips.length - 1]; // a lifted stack bids from the bottom
  return top && isBiddable(top) && !top.gold && !stuckIce(top, cell) ? top : null;
}
// A trick can take any number of bids this turn (one chip per bid); their value adds to its effect.
export function canBid(b, s, e, r, c) {
  const gate = phaseGate(b, 'bid'); if (gate) return gate;
  if (e.state === 'play') return tx('table.that-trick-is-already');
  if (s.used.bid >= tipOf(s, 'ingenuity')) return tx('table.no-bids-left-this-2');
  if (!bidChip(s, r, c)) return tx('feed.only-an-uncovered-standard');
  return null;
}
export function bid(b, s, e, r, c) {
  if (canBid(b, s, e, r, c)) return null;
  const ch = takeBid(s, r, c);
  e.bid.push(ch); e.bidValue += bidVal(ch); e.state = 'bid'; s.used.bid++; if (ch.shop === 'upgrade') e.upBoost = (e.upBoost || 0) + 1;
  if (!e.target) e.target = validTargets(b, s, e)[0] || null;
  return ch;
}
// Click a chip bid this turn to take it back to the stack it came from (the Bet if that stack is full).
export function canUnbid(b, s, e, chipId) {
  if (b.phase !== 'bid') return tx('feed.bids-can-be-taken');
  if (!e || e.state !== 'bid' || !e.bid.some((ch) => ch.id === chipId)) return tx('feed.that-chip-was-not');
  return null;
}
// a chip taken back from a bid goes to the stack it came from (the Bet if that stack is full); a Debt marker goes
// back on its stack whatever its height
function bidHome(b, s, ch, from) {
  const cell = from && s.grid[from.r]?.[from.c];
  if (ch.kind === 'debt') { if (cell) setDebt(b, cell, debtOf(cell) + ch.value); return; }
  if (cell && capacityLeft(s, cell) > 0 && !cell.hole) { if (from.base) cell.chips.unshift(ch); else pushChip(cell, ch); } else addToMeter(b, s, [ch]);
}
export function unbid(b, s, e, chipId) {
  if (canUnbid(b, s, e, chipId)) return null;
  const ch = e.bid.splice(e.bid.findIndex((x) => x.id === chipId), 1)[0], from = ch.from; delete ch.from;
  bidHome(b, s, ch, from);
  e.bidValue -= bidVal(ch); s.used.bid--; if (ch.shop === 'upgrade') e.upBoost = Math.max(0, (e.upBoost || 0) - 1);
  if (!e.bid.length) { e.state = 'shown'; e.target = null; }
  return ch;
}
// A hand of bid chips: picks [{r,c}], one per chip; picking a stack again takes the next chip down. Returns the chips
// the hand would take, in order, or null if a pick reaches a chip that cannot be bid.
export function handChips(s, picks) {
  const taken = new Map(), out = [];
  for (const { r, c } of picks) {
    const cell = s.grid[r]?.[c], k = taken.get(r + ':' + c) || 0; if (!cell || cell.chips.some((ch) => ch.kind === 'frost')) return null;
    const order = lifted(cell) ? cell.chips.filter((x) => !isHazard(x)) : cell.chips.slice().reverse(), ch = order[k];
    if (!ch || !isBiddable(ch) || ch.gold || stuckIce(ch, cell)) return null;
    out.push({ r, c, ch }); taken.set(r + ':' + c, k + 1);
  }
  return out;
}
export function canBidMany(b, s, e, picks) {
  const gate = phaseGate(b, 'bid'); if (gate) return gate;
  if (!picks.length) return tx('feed.pick-up-at-least');
  if (e.state === 'play') return tx('table.that-trick-is-already');
  if (s.used.bid + picks.length > tipOf(s, 'ingenuity')) return tx('feed.you-have-left-this', { max: Math.max(0, tipOf(s, 'ingenuity') - s.used.bid), tipOf: tipOf(s, 'ingenuity') - s.used.bid });
  const hand = handChips(s, picks); if (!hand) return tx('table.only-uncovered-standard-or');
  if (worth(s) - sum(hand, (x) => bidVal(x.ch)) <= 0) return tx('feed.that-would-bid-your');
  return null;
}
// Bid a whole hand on one trick at once: each chip is a bid.
export function bidMany(b, s, e, picks) {
  if (canBidMany(b, s, e, picks)) return null;
  return picks.map(({ r, c }) => bid(b, s, e, r, c));
}
// Undo: back to where the current phase opened (or, in the Roll phase, to just after the throw).
export function resetPlan(b, s) {
  const snap = clone(s.snap);
  s.grid = snap.grid; s.run = snap.run; s.book = snap.book; s.pouch = snap.pouch; s.tray = snap.tray; s.used = snap.used; s.thrown = snap.thrown; s.pick = snap.pick || { dice: [], flips: [] }; s.turnBonus = snap.turnBonus; s.food = snap.food; s.revive = snap.revive || [];
}
export const needsTarget = (e) => TRICKS[e.trick.id].approach !== 'none' && (e.dice.length > 0 || e.state !== 'shown');
export function targetSide(b, s, def) { return def.side === 'opp' ? b.sides[1 - s.idx] : def.side === 'self' ? s : null; }
// the sides a trick can aim at: its own zone, or both for a trick that plays on either side
const aimSides = (b, s, def) => (def.side === 'any' ? [b.sides[1 - s.idx], s] : [targetSide(b, s, def)].filter(Boolean));
export function validTargets(b, s, e, payOnly) {
  const def = TRICKS[e.trick.id];
  if (def.side === 'any') return aimSides(b, s, def).flatMap((t) => validOn(b, s, def, t, payOnly));
  const t = targetSide(b, s, def); if (!t || def.approach === 'none') return [];
  return validOn(b, s, def, t, payOnly);
}
function validOn(b, s, def, t, payOnly) {
  const out = [];
  if (def.approach === 'none') return out;
  const C = t.dims.cols, m = t.dims.meterRows, hidden = t !== s;
  // your opponent cannot aim at a Transpara stack, or a Shadow stack behind a taller one
  const fear = haunted(b, t); // a Ghost's row cannot be aimed at, by either Roller
  const veiled = (r, c) => fear.has(r) || (hidden && (shopCount(t.grid[r][c], 'transpara') > 0 || (shopCount(t.grid[r][c], 'shadow') > 0 && r > 0 && solidCount(t.grid[r - 1][c]) > solidCount(t.grid[r][c]))));
  const full = (r, c) => addsChips(def) && capacityLeft(t, t.grid[r][c]) <= 0; // an overloaded stack cannot be aimed at by a trick that adds to it
  const push = (r, c) => { if (r >= 0 && !veiled(r, c) && !full(r, c)) out.push(ref(t, r, c)); };
  if (def.type === 'expense' && def.side === 'opp' && def.approach !== 'none') // creatures over your own stacks can be attacked too
    for (const cr of b.creatures || []) if (cr.side === s.idx && !cr.gone && cr.r >= 0 && cr.arrive <= b.turn && CREATURES[cr.kind]?.hits) out.push(ref(s, cr.r, cr.c));
  switch (def.approach) {
    case 'front': for (let c = 0; c < C; c++) push(frontRow(t, c, payOnly), c); break;
    case 'rear': for (let c = 0; c < C; c++) push(rearRow(t, c, payOnly), c); break;
    case 'body': for (let c = 0; c < C; c++) push(bodyRow(t, c, payOnly), c); break;
    case 'flank': for (const c of [0, C - 1]) for (let r = 0; r < t.rows; r++) if (occupied(t.grid[r][c], payOnly)) push(r, c); break;
    case 'any': for (const { r, c, cell } of allCells(t)) if (occupied(cell, payOnly)) push(r, c); break;
    case 'meter': for (let r = 0; r < m; r++) for (let c = 0; c < C; c++) if (capacityLeft(t, t.grid[r][c]) > 0 && !t.grid[r][c].hole && !t.grid[r][c].link) push(r, c); break;
  }
  return out;
}
// tricks whose roll effect puts chips on the stack they aim at
export const addsChips = (def) => !!makeOf(def) || ['doom', 'hat', 'handoff', 'block'].includes(fxOf(def)) || (def.roll.k === 'chips' && !fxOf(def) && !['fee', 'water'].includes(makeKind(def.roll.chip))); // a Puddle has no thickness: it needs no room
export function setTarget(b, s, e, tgt) {
  if (b.phase !== 'aim' && b.phase !== 'bid') return false;
  if (!validTargets(b, s, e).some((v) => v.side === tgt.side && v.r === tgt.r && v.c === tgt.c)) return false;
  e.target = { side: tgt.side, r: tgt.r, c: tgt.c }; return true;
}
// Where a trick's chips will land, for the table to show before it plays: [{ side, r, c, n, chip }] in the order they
// are laid. A made trick (roll 'chips') lays its instances round its deployment pattern from the target, so each space's
// count is known as soon as the roll is (n is 0 until there is a total: the spaces are still right). Other tricks that
// add chips name the spaces they cover.
export function landing(b, s, e, at) {
  const def = TRICKS[e.trick.id], R = def.roll, t = at ? b.sides[at.side] : null; if (!t) return [];
  if (R.k !== 'chips' || fxOf(def) || makeOf(def)) return addsChips(def) ? affected(b, t, def, at, e.dice.length).map((x) => ({ side: t.idx, r: x.r, c: x.c, n: 0, chip: makeOf(def)?.chip || fxOf(def) })) : []; // an effect or a maker covers its spread
  const total = previewTotal(s, e), vals = e.dice.map((d) => d.value);
  let inst = total > 0 ? instances(R.convert, vals.length ? vals : [total], total) : []; if (bonusMet(s, e) && def.bonus.k === 'multiply') inst = Array.from({ length: def.bonus.x || 2 }, () => inst).flat();
  const spaces = deployOrder(t.rows, t.dims.cols, at, R.deploy).filter(({ r, c }) => !t.grid[r][c].hole && !t.grid[r][c].link); if (!spaces.length) return [];
  const out = new Map(); const add = (sp, n) => { const k = sp.r + ':' + sp.c; if (!out.has(k)) out.set(k, { side: t.idx, r: sp.r, c: sp.c, n: 0, chip: R.chip }); out.get(k).n += n; };
  if (!inst.length) for (const sp of R.convert === 'lump' ? spaces.slice(0, 1) : spaces) add(sp, 0);
  inst.forEach((_, i) => add(spaces[i % spaces.length], 1));
  return [...out.values()];
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
  const def = defOf(e.trick); if (!e.dice.length) return false;
  if (def.cls && def.cls !== s.cls) return false;
  if (qState(e) === 'hot') return true; // a hot quality die sets off the Bonus whatever the dice
  const bd = bonusDice(e); if (bd.length < def.count || !bd.some((d) => !d.chip)) return false;
  const vals = bd.map((d) => d.value), total = sum(vals), cond = def.bonus.cond;
  if (cond === 'match') return vals.some((v, i) => vals.indexOf(v) !== i);
  if (cond === 'evens') return vals.every((v) => v % 2 === 0);
  if (cond === 'odds') return vals.every((v) => v % 2 === 1);
  if (cond === 'run') { const u = [...new Set(vals)].sort((x, y) => x - y); return vals.length > 1 && u.length === vals.length && u[u.length - 1] - u[0] === u.length - 1; } // a straight: 2-3-4
  if (cond.startsWith('over:')) return total >= +cond.slice(5);
  if (cond.startsWith('under:')) return total <= +cond.slice(6);
  return false;
}
// What a trick's total is made of: the dice, the value of the chips bid on it, Power, Vengeance, a Misprint's
// changed value, the multiplier (quality and print), Last call, a doubling bonus. Boost and Enfeeble join when the
// trick plays, so the card shows them as they stand now.
const bidOf = (e) => (e.state === 'play' ? sum(e.paid || []) : e.bidValue) || 0;
// a trick brought back with a bigger chip than it needed carries the difference as a base effect on its next play
// (less than it needed: a penalty). See revive.
export const baseOf = (e) => e?.trick?.base || 0;
// bid on at all this turn (a 0 or negative bid still plays the trick)
const isBid = (e) => e.state === 'bid' || e.state === 'play';
export function totalParts(s, e) {
  const def = TRICKS[e.trick.id], inv = def.type === 'investment';
  const dice = sum(e.dice, (d) => d.value), bid = bidOf(e), power = inv ? 0 : powerAhead(s), venge = def.vengeance ? s.paidLast || 0 : 0;
  const mult = inv ? investMult(effTrick(e)) : trickMult(effTrick(e)), heatX = def.type === 'expense' ? s.heat || 1 : 1, double = bonusMet(s, e) && def.bonus.k === 'double';
  return { dice: e.dice.map((d) => d.value), diceSum: dice, bid, base: baseOf(e), power, venge, plus: misPlus(e.trick), mult, heat: heatX, double, total: previewTotal(s, e),
    turns: (e.stack || []).length, stack: 1 + (e.stack || []).length };
}
// what a shown trick would do right now (for previews and the AI): nothing until it is bid on
export function previewTotal(s, e) {
  const def = TRICKS[e.trick.id]; if (!e.dice.length && !bidOf(e) && !(isBid(e) && baseOf(e))) return 0;
  const raw = sum(e.dice, (d) => d.value) + bidOf(e) + baseOf(e) + (def.type === 'investment' ? 0 : powerAhead(s)) + (def.vengeance ? s.paidLast || 0 : 0) + misPlus(e.trick);
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
  if (!cell.puddle) b.fx[setPuddle(b, cell).id] = 'spawn'; else setPuddle(b, cell); // a stack hit by water stands on a Puddle chip until it dries
  if (!solidCount(cell)) return;
  for (const ch of cell.chips) if (!isHazard(ch)) ch.wet = 2;
  for (const ch of cell.chips.filter((y) => y.kind === 'burn' || y.kind === 'lava')) { cell.chips.splice(cell.chips.indexOf(ch), 1); b.fx[ch.id] = 'void'; }
}
// freeze the top run of value chips on a stack into one Frozen chip (wet ones, or all of them in a Blizzard)
function freezeTop(b, cell) {
  if (cell.puddle) cell.puddle.ice = true;
  let org = 0; for (const ch of cell.chips) if (ORGANIC.includes(ch.kind) && !ch.frozen) { ch.frozen = true; org++; }
  const take = []; for (let i = cell.chips.length - 1; i >= 0; i--) { const ch = cell.chips[i]; if (isHazard(ch) || ORGANIC.includes(ch.kind)) continue; if (ch.kind !== 'std' || ch.gold || ch.resist || ch.big || ch.frozen || !(ch.wet > 0)) break; take.push(ch); }
  if (take.length < 2) return org; // one wet chip has nothing to freeze together with
  for (const ch of take) { cell.chips.splice(cell.chips.indexOf(ch), 1); b.fx[ch.id] = 'void'; }
  pushChip(cell, mkChip(b, 'std', sum(take, (ch) => ch.value), { frozen: true })); return take.length;
}
// What a stack can pay before a fee spills on down the lane: its chips and 1¢ shields, less the Debt it already owes.
const canTake = (cell, pierce) => sum(cell.chips, (ch) => (isPayable(ch) ? ch.value : !pierce && (ch.kind === 'block' || ch.kind === 'counter') ? 1 : 0)) - debtOf(cell);
function engage(b, att, def, r, c, amount, o = {}) {
  ({ r, c } = homeOf(def, r, c));
  if (closed(def.grid[r][c])) { // 'nothing on top': no Debt can sit on it, so the fee goes on down the lane
    for (let rr = r + 1; rr < def.rows; rr++) if (occupied(def.grid[rr][c]) && !closed(def.grid[rr][c])) { const x = engage(b, att, def, rr, c, amount, o); return { ...x, notes: [tx('feed.closed-past'), ...(x.notes || [])] }; }
    return { placed: 0, notes: [tx('feed.closed-stops')] };
  }
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
    if (!o.pierce && top && isInstance(top)) { top.hits = (top.hits || 1) - 1; if (top.hits <= 0) { cell.chips.splice(ti, 1); b.fx[top.id] = 'void'; } return { placed: 0, notes: [`blocked whole by a ${top.kind[0].toUpperCase() + top.kind.slice(1)} chip`] }; }
  }
  // part of a fee sent back at the attacker: down the same lane when it holds chips, else their first lane that does
  const sendBack = (back) => { const cols = [...Array(att.dims.cols).keys()].filter((x) => frontRow(att, x) >= 0); if (!cols.length) return false;
    const cc = cols.includes(c) ? c : cols[0]; engage(b, def, att, frontRow(att, cc), cc, back, { reflected: true }); return true; };
  if (open && att && st.reflect > 0) {
    const back = Math.min(st.reflect, amount); amount -= back; if (!st.reflectAll) st.reflect = 0;
    sendBack(back); notes.push(tx('feed.reflected', { back }));
  }
  if (open && st.resist > 0) { const cut = Math.min(amount, st.resist); amount -= cut; notes.push(tx('feed.resisted', { cut })); }
  const bumpers = open ? shopCount(cell, 'reducer') : 0;
  if (bumpers && amount > 0) { const cut = Math.min(amount, bumpers * shopVars('reducer').absorb); amount -= cut; notes.push(tx('feed.reduced', { cut })); }
  const mirrors = !o.reflected && att ? shopCount(cell, 'rebound') : 0;
  if (mirrors && amount > 0) { // the fee is still charged; the mirror sends some back down the same lane
    const back = mirrors * shopVars('rebound').reflect; if (sendBack(back)) notes.push(tx('feed.mirrored', { back }));
  }
  if (amount <= 0) return { placed: 0, notes };
  { const ti = topSolid(cell); if (ti >= 0 && cell.chips[ti].kind === 'bounty') { b.fx[cell.chips[ti].id] = 'void'; cell.chips.splice(ti, 1); notes.push('a Bounty chip breaks'); } }
  const zaps = att && !o.reflected ? cell.chips.filter((ch) => ch.shop === 'zap') : [];
  if (zaps.length) {
    if (amount <= (shopVars('zap').s || 0)) { const cols = b.rng.shuffle([...Array(att.dims.cols).keys()].filter((x) => frontRow(att, x) >= 0));
      const n = 1 + charge(cell, zaps[0]); for (const cc of cols.slice(0, n)) strike(b, att, { r: frontRow(att, cc), c: cc, cell: att.grid[frontRow(att, cc)][cc] });
      if (cols.length) notes.push(n > 1 ? tx('feed.zapped-back-times', { n }) : tx('feed.zapped-back')); }
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
    if (left > 0 && next != null) { b.trace?.push({ side: def.idx, r: y, c, owed: 0, paid: 0, paidChips: [], blocked: 0, left: debtOf(x), carry: left, behind: next, lost: 0 }); if (k === 0) notes.push(tx('feed.overkill-spills-down-the', { left })); }
  }
  if (left > 0) { // nothing behind: the overkill is wasted, shown on the space past the last stack
    const back = [...Array(def.rows).keys()].filter((y) => y > last && (stop == null || y < stop) && !def.grid[y][c].hole && !def.grid[y][c].link && !def.grid[y][c].chips.length)[0];
    if (back != null) stray(b, def, back, c, left, stop != null ? 'a Ghost stops it passing on' : 'overkill with no stack behind');
    def.wasted = (def.wasted || 0) + left;
    b.trace?.push({ side: def.idx, r: last, c, owed: 0, paid: 0, paidChips: [], blocked: 0, left: debtOf(def.grid[last][c]), carry: 0, behind: -1, lost: left });
    notes.push(tx('feed.overkill-wasted', { left }));
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
    yield step(b, tx('feed.s-ward-cancels-a', { name: s.name, add: best.add }), [ref(s, best.r, best.c)], 'bonus');
  }
}
function* settleSide(b, s) {
  clearStrays(b, s); tidyFeet(s);
  yield* ward(b, s);
  for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.dims.cols; c++) {
    const cell = s.grid[r][c], due = cell.due; if (!due) continue; cell.due = null;
    const att = due.att != null ? b.sides[due.att] : null, owed = debtOf(cell);
    let pool = owed, blocked = 0, counters = 0, hardStop = false, carry = 0, behind = -1, knocked = 0;
    const paidChips = [], shieldNames = []; let regen = [];
    while (pool > 0) {
      const i = nextPay(cell, due.pierce); if (i < 0) break;
      const ch = cell.chips[i];
      if (isInstance(ch)) { blocked += pool; pool = 0; ch.hits = (ch.hits || 1) - 1; if (ch.hits <= 0) { cell.chips.splice(i, 1); b.fx[ch.id] = 'void'; } shieldNames.push(ch.kind); break; }
      if (isShield(ch)) { cell.chips.splice(i, 1); b.fx[ch.id] = 'void'; pool--; blocked++; if (ch.kind === 'counter') counters++; continue; }
      if (isFx(ch)) { cell.chips.splice(i, 1); b.fx[ch.id] = 'void'; knocked++; continue; } // an effect chip is knocked off; it pays nothing
      if (hardOf(cell) > 0 && !due.pierce) { cell.chips.splice(i, 1); paidChips.push(ch); pool = Math.min(pool, due.prior); hardStop = true; break; }
      if (pool >= ch.value) { cell.chips.splice(i, 1); pool -= ch.value; paidChips.push(ch); } else break;
    }
    const paid = sum(paidChips, (ch) => ch.value); s.paidTurn = (s.paidTurn || 0) + paid;
    regen = paidChips.filter((ch) => ch.regen > 0); // Regen: a paid chip comes straight back, without its Regen
    for (const ch of regen) { paidChips.splice(paidChips.indexOf(ch), 1); delete ch.regen; if (capacityLeft(s, cell) > 0) pushChip(cell, ch); else addToMeter(b, s, [ch], { r, c }, null); b.fx[ch.id] = 'mutate'; }
    for (const ch of paidChips) { if (due.glean != null && !addToMeter(b, b.sides[due.glean], [ch], null, null).length) continue; b.stage.paid[s.idx] += ch.value; b.fx[ch.id] = 'stage'; toPit(b, s.idx, ch, 'fee'); }
    if (pool > 0 && topPayableIdx(cell) < 0) { // nothing left here to owe against: overkill goes down the lane
      const fear = haunted(b, s); if (!hardStop && !fear.has(r)) for (let rr = r + 1; rr < s.rows; rr++) { if (fear.has(rr)) break; if (occupied(s.grid[rr][c], due.pierce)) { behind = rr; break; } }
      if (behind >= 0) { carry = pool; const nx = s.grid[behind][c]; markDue(nx, { pierce: due.pierce, glean: due.glean, att: due.att }); setDebt(b, nx, debtOf(nx) + carry, 'debt'); }
      pool = 0;
    }
    if (paidChips.length && topPayableIdx(cell) < 0) for (const ch of cell.chips.filter(isFx)) { cell.chips.splice(cell.chips.indexOf(ch), 1); b.fx[ch.id] = 'void'; knocked++; } // a stack paid out drops its effect chips
    const lost = owed - paid - blocked - pool - carry - sum(regen, (ch) => ch.value); // overkill with nowhere to go, or stopped by Hardening
    if (lost > 0 && !hardStop) s.wasted = (s.wasted || 0) + lost;
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
    if (blocked) bits.push(shieldNames.length ? tx('feed.taken-by-a-chip', { blocked, shieldNames: shieldNames[0] }) : tx('feed.blocked', { blocked, v: counters ? tx('feed.countered', { counters }) : '' }));
    if (hardStop) bits.push(tx('feed.hardened-one-chip-only'));
    if (knocked) bits.push(tx('feed.effect-knocked-off', { knocked }));
    if (regen.length) bits.push(tx('feed.regen-chip-straight-back', { regenN: regen.length, v: regen.length > 1 ? 's come' : ' comes' }));
    if (pool) bits.push(tx('feed.stays-as-debt', { pool, v: next ? tx('feed.until-it-reaches-the', { value: next.value }) : '' }));
    if (carry) bits.push(tx('feed.overkill-carries-to-the', { carry }));
    else if (lost > 0 && !hardStop) bits.push(tx('feed.overkill-has-no-stack', { lost }));
    const list = paidChips.length > 1 ? ` (${paidChips.map((ch) => ch.value).join(' + ')})` : '';
    const head = paid ? tx('feed.pays', { name: s.name, paid, list, v: due.glean != null ? ` straight to ${b.sides[due.glean].name}'s Bet` : ' to the Stage' })
      : tx('feed.owes', { name: s.name, owed, v: next && pool ? tx('feed.short-of-the-chip', { value: next.value }) : '' });
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
  'shields-back': { dir: 'back', key: (ch) => (isShield(ch) ? 0 : 1) },
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
// Settle: in the targeted column of the zone it aims at (the Bet or the Stake), Debt and hazards are cleared up to the
// total, then that column's chips gather into full stacks starting at the targeted space and filling out from it,
// nearest first (the biggest chips closest to it). Anchored stacks, Holes and big chips stay where they are.
function settleColumn(b, s, tgt, total) {
  const m = s.dims.meterRows, tr = tgt?.r ?? m, c = tgt?.c ?? 0, [r0, r1] = tr < m ? [0, m] : [m, s.rows];
  const rows = []; for (let r = r0; r < r1; r++) { const cell = s.grid[r][c]; if (!cell.hole && !cell.link && !cell.anchor && !cell.roost && !anchored(cell)) rows.push(r); }
  let done = 0;
  for (const r of rows) { const cell = s.grid[r][c];
    for (const ch of cell.chips.filter((x) => (isHazard(x) && x.kind !== 'debt' && x.kind !== 'hard') || x.kind === 'dynamite' || x.kind === 'doom')) { if (done >= total) break; cell.chips.splice(cell.chips.indexOf(ch), 1); b.fx[ch.id] = 'void'; done++; }
    const d = debtOf(cell); if (d && done < total) { const take = Math.min(d, total - done); setDebt(b, cell, d - take); done += take; } }
  const chips = [], haz = [];
  for (const r of rows) { const cell = s.grid[r][c]; chips.push(...cell.chips.filter((ch) => !isHazard(ch) && !ch.mat)); haz.push([cell, cell.chips.filter((ch) => isHazard(ch) || ch.mat)]); cell.chips = cell.chips.filter((ch) => ch.mat); }
  chips.sort((x, y) => y.value - x.value);
  const order = rows.slice().sort((a, b2) => Math.abs(a - tr) - Math.abs(b2 - tr) || a - b2);
  for (const r of order) { const cell = s.grid[r][c]; while (chips.length && capacityLeft(s, cell) > 0) { const ch = chips.shift(); cell.chips.push(ch); b.fx[ch.id] = 'move'; } }
  for (const [cell, hs] of haz) for (const h of hs) { if (h.mat || solidCount(cell)) { if (!cell.chips.includes(h)) cell.chips.push(h); } else b.fx[h.id] = 'void'; }
  if (chips.length) addToMeter(b, s, chips, { r: Math.min(tr, m - 1), c }, 'move'); // what the column cannot hold goes to the Bet
  return done;
}
// ---------- the Pit ----------
// Every chip a Roller loses, kept as it was (value, order and count), under the House's arms: fees paid (which
// make up their Stage total, so Gather, Steal and the like work on that total) and bids taken by the House.
// ---------- the Pit ----------
// A grid between the two positions. Each Roller's side has TUNING.pit.cols columns of five spaces (one a row), each a
// stack up to TUNING.pit.stackMax high; col 0 is the front column, by the middle. A lost chip lands in the front-most
// column with room, on a row picked among that column's rows with room (by the chip itself, so a bout replays the
// same). Down the middle is the bottomless pit: with every space full, a lost chip falls in and is gone for good
// (b.gone): it leaves the Stage total, so a win does not restore it and nobody is paid it.
export const pitDims = (b) => { const P = TUNING.pit || {}; return { cols: Math.max(1, Math.round(P.cols ?? 2)), rows: b?.sides?.[0]?.dims?.cols || 5, stackMax: Math.max(1, Math.round(P.stackMax ?? 6)), bottomless: P.bottomless !== false }; };
export const pitCapacity = (b) => { const P = pitDims(b); return P.cols * P.rows * P.stackMax; };
const pitHeights = (b, si) => { const m = new Map(); for (const ch of pitOf(b, si)) if (ch.col != null) m.set(ch.col + ':' + ch.row, (m.get(ch.col + ':' + ch.row) || 0) + 1); return m; };
// where the next chip a side loses would land: { col, row }, or null when its side of the Pit is full
export function pitSpot(b, si, seed = 0) {
  const P = pitDims(b), hts = pitHeights(b, si);
  for (let col = 0; col < P.cols; col++) { const open = []; for (let row = 0; row < P.rows; row++) if ((hts.get(col + ':' + row) || 0) < P.stackMax) open.push(row);
    if (open.length) return { col, row: open[Math.abs((seed * 2654435761) | 0) % open.length] }; }
  return null;
}
export const pitRoom = (b, si) => pitCapacity(b) - [...pitHeights(b, si).values()].reduce((a, n) => a + n, 0);
// what a side has lost for good down the middle: [{ id, kind, value, from, turn }]
export const goneOf = (b, si) => b.gone?.[si] || [];
function toPit(b, si, ch, from) {
  if (!b.pit) return;
  const rec = { id: ch.id, kind: ch.kind, value: ch.value, ...(ch.resist ? { resist: ch.resist, shop: ch.shop } : {}), ...(ch.gold ? { gold: true } : {}), from, turn: b.turn };
  const P = pitDims(b), spot = pitSpot(b, si, ch.id + b.turn * 7);
  if (!spot && P.bottomless) { // no room: down the middle, for good
    (b.gone ||= [[], []])[si].push(rec); if (from === 'fee') b.stage.paid[si] -= ch.value; // (the caller has just added it to the Stage total)
    b.fx[ch.id] = 'gone'; return;
  }
  if (spot) { rec.col = spot.col; rec.row = spot.row; }
  b.pit[si].push(rec);
}
// what is in a Roller's Pit now: their fees, oldest first, as far as their Stage total still holds them (chips taken
// back leave from the top), then every bid the House has taken
export function pitOf(b, si) {
  const out = []; let left = b.stage.paid[si];
  for (const ch of (b.pit?.[si] || []).filter((x) => x.from === 'fee')) { if (ch.value > left) break; out.push(ch); left -= ch.value; }
  return out.concat((b.pit?.[si] || []).filter((x) => x.from === 'bid'));
}
// Chips come back out of the Pit only through tricks and chips. pullPit takes the actual chips (the same value, kind
// and id they were lost as), newest first, up to `want`¢ and whole chips only: a chip worth more than what is left
// to take stays. o.bids: also bids the House took (after the fees). Returns the chips, as live chips again.
export function pullPit(b, si, want, o = {}) {
  const held = pitOf(b, si), fees = held.filter((x) => x.from === 'fee').reverse(), bids = o.bids ? held.filter((x) => x.from === 'bid').reverse() : [];
  const out = []; let left = Math.max(0, want | 0);
  for (const rec of [...fees, ...bids]) {
    if (left <= 0) break; if (rec.value > left || rec.value <= 0) continue;
    const i = b.pit[si].indexOf(rec); if (i < 0) continue; b.pit[si].splice(i, 1);
    if (rec.from === 'fee') b.stage.paid[si] -= rec.value;
    const { from, turn, ...ch } = rec; void from; void turn; out.push({ ...ch }); b.fx[ch.id] = 'from-pit'; left -= rec.value;
  }
  return out;
}
// chips that came out of the Pit and found no room go back in, as they were
function backToPit(b, si, chips) { for (const ch of chips) { b.stage.paid[si] += ch.value; toPit(b, si, ch, 'fee'); } }
// Gather and Steal: the real chips out of your Pit (and, with both, your opponent's), onto your Bet
function recoup(b, s, n, both) {
  const mine = pullPit(b, s.idx, n), theirs = both ? pullPit(b, 1 - s.idx, n - sum(mine, (ch) => ch.value)) : [];
  const left = addToMeter(b, s, [...mine, ...theirs], null, 'from-pit');
  backToPit(b, s.idx, left.filter((ch) => mine.includes(ch))); backToPit(b, 1 - s.idx, left.filter((ch) => theirs.includes(ch))); // what did not fit stays in the Pit
  return sum(mine, (ch) => ch.value) + sum(theirs, (ch) => ch.value) - sum(left, (ch) => ch.value);
}

// opt.again: a Repeater or Mimic plays the roll effect once more (no trait) · opt.forgotten: a Forgetter negates it
// A made trick (trick maker, roll.k 'chips'): the roll becomes instances (lump sum, precise change or petty cash),
// each dealt to the next space of the deployment pattern from the target and placed over, under or at a height
// in that stack. A fee instance charges Debt there instead. Bonuses: multiply (more instances), bid multiplier (in the total), extra chip (more of another chip).
function* playChips(b, s, e, def, x) {
  const R = def.roll, t = x.t, origin = x.origin || { r: 0, c: 0 };
  const A = fxAction(R.chip), M0 = makeOf(def);
  if (A || M0) { // an effect's chip, or a maker's effect chips: the chip is laid and does its work now
    const ctx = { b, s, o: x.o || b.sides[1 - s.idx], t, cells: x.cells || [], total: x.total, bonus: x.bonus, e, origin: x.origin, tag: x.tag, by: A?.by, make: M0 };
    if (A) layFx(b, s, t, x.origin, R.chip, x.total);
    yield* FX[A ? A.fx : 'make'](ctx); return;
  }
  let inst = instances(R.convert, x.vals, x.total);
  if (x.bonus === 'multiply') inst = Array.from({ length: def.bonus.x || 2 }, () => inst).flat();
  const spaces = deployOrder(t.rows, t.dims.cols, origin, R.deploy).filter(({ r, c }) => !t.grid[r][c].hole && !t.grid[r][c].link);
  const make = (chip, list) => { let made = 0, fees = 0, lost = 0; const hit = new Map();
    list.forEach((amt, i) => { const sp = spaces[i % (spaces.length || 1)]; if (!sp) { lost++; return; } const cell = t.grid[sp.r][sp.c]; hit.set(`${sp.r}:${sp.c}`, sp);
      const kind = makeKind(chip);
      if (kind === 'fee') { fees += engage(b, s, t, sp.r, sp.c, amt, { pierce: x.pierce }).placed; return; }
      if (kind === 'water') { if (cell.puddle) { lost++; return; } water(b, t, { cell, r: sp.r, c: sp.c }); made++; return; } // a Puddle chip goes under the stack
      if (isFxChip(chip)) { if (placeFx(b, t, cell, chip, fxLife(chip), e.trick.id)) made++; else lost++; return; }
      if (MADE_CHIPS[chip]) { const mc = mkMade(b, chip); mc.power = amt; // the instance it was made with: what a 'share' action hands out
        if (R.foot && R.foot !== 'model') mc.foot = R.foot; if (R.flat) mc.flat = true; if (R.slip) mc.slip = true; // the trick's own size for it
        const n = footOf(mc);
        if (n > 1 && (mc.slip || MADE_CHIPS[chip].slip)) { const at = matBlock(t, sp.r, sp.c, n); if (!at) { lost++; return; } // slips under the stacks there
          mc.mat = { r: at.r, c: at.c, n }; t.grid[at.r][at.c].chips.unshift(mc); b.fx[mc.id] = 'spawn'; made++; (t.madeNew ||= []).push(mc.id); return; }
        if (n > 1) { const at = footBlock(t, sp.r, sp.c, n); if (!at) { lost++; return; } claimFoot(t, at.r, at.c, n); t.grid[at.r][at.c].chips.push(mc); b.fx[mc.id] = 'spawn'; made++; (t.madeNew ||= []).push(mc.id); return; }
        if (!fits(t, cell, mc) || (MADE_CHIPS[chip].must === 'alone' && solidCount(cell)) || !placeMade(cell, mc, R.place, R.at)) { lost++; return; } b.fx[mc.id] = 'spawn'; made++; (t.madeNew ||= []).push(mc.id); return; }
      if (capacityLeft(t, cell) <= 0) { lost++; return; }
      const ch = HAZARD_LIFE[chip] ? mkHazard(b, chip) : mkChip(b, chip, kind === 'value' ? amt : chip === 'block' || chip === 'counter' ? 1 : 0);
      if (isHazard(ch)) cell.chips.push(ch); else cell.chips.splice(placeIndex(R.place, R.at, cell.chips.filter((y) => !isHazard(y)).length), 0, ch);
      b.fx[ch.id] = 'spawn'; made++; });
    return { made, fees, lost, cells: [...hit.values()] }; };
  // chips back out of a Pit: the real chips, up to the total, dealt along the pattern; no room and they go back
  const fromPit = (chip) => { const P = MAKES_OF(chip), si = P.pit === 'mine' ? s.idx : 1 - s.idx, got = pullPit(b, si, x.total * (x.bonus === 'multiply' ? def.bonus.x || 2 : 1)); let made = 0, lost = 0; const hit = new Map();
    got.forEach((ch, i) => { const sp = spaces[i % (spaces.length || 1)], cell = sp && t.grid[sp.r][sp.c];
      if (!cell || capacityLeft(t, cell) <= 0) { backToPit(b, si, [ch]); lost++; return; }
      cell.chips.splice(placeIndex(R.place, R.at, cell.chips.filter((y) => !isHazard(y)).length), 0, ch); hit.set(`${sp.r}:${sp.c}`, sp); b.fx[ch.id] = 'from-pit'; made++; });
    return { made, fees: 0, lost, cells: [...hit.values()], pulled: sum(got, (ch) => ch.value) - 0 }; };
  const main = makeKind(R.chip) === 'pit' ? fromPit(R.chip) : make(R.chip, inst);
  let extra = null; if (x.bonus === 'extra') extra = make(def.bonus.chip || 'block', Array.from({ length: def.bonus.n || 1 }, () => 1));
  const kind = makeKind(R.chip), refs = [...main.cells, ...(extra?.cells || [])].map((p) => ref(t, p.r, p.c));
  const said = kind === 'pit' ? tx('feed.back-out-of-the', { made: main.made }) : kind === 'fee' ? tx('feed.of-debt-on', { fees: main.fees, cellN: main.cells.length }) : tx('feed.made', { made: main.made });
  yield step(b, `${x.tag}: ${inst.length ? said : 'nothing to make'}${extra ? tx('feed.and-extra', { made: extra.made }) : ''}${main.lost ? tx('feed.had-no-room', { lost: main.lost }) : ''}${x.bonus === 'linger' && !x.again ? tx('feed.it-will-play-again', { v: def.bonus.turns || 2 }) : ''}.`, refs, main.made || main.fees || extra?.made ? 'play' : 'miss');
}
// A trick plays its roll effect: the dice plus the value bid on it, and whatever adds to them. A Reprint plays its
// older rule: the roll effect once for each die, each worth that die (the bid's value joins the first).
function* play(b, s, e, opt = {}) {
  const def = TRICKS[e.trick.id], o = b.sides[1 - s.idx], inv = def.type === 'investment', reprint = e.trick.rar === 'reprint';
  if (!e.dice.length && !bidOf(e) && !baseOf(e) && !opt.instance) return;
  if (opt.forgotten) { yield step(b, tx('feed.s-is-forgotten-s', { name: s.name, name2: def.name, join: e.dice.map((d) => d.value).join('+') || '0', name3: o.name }), [], 'miss'); return; }
  if (reprint && !opt.instance && e.dice.length > 1) {
    const bonus = bonusMet(s, e) ? def.bonus.k : null;
    for (const [i, d] of e.dice.entries()) yield* play(b, s, { ...e, dice: [d] }, { ...opt, instance: true, bonus, bid: i === 0 ? bidOf(e) : 0 });
    return;
  }

  // Roll effect
  const own = ['bend', 'parlay'].includes(fxOf(def));
  const fz = s.fz || s.mods; // mods as they stood when the phase was called
  const vals = e.dice.map((d) => (!own && fz.bend != null ? fz.bend : d.value));
  const bonus = opt.bonus !== undefined ? opt.bonus : bonusMet(s, e) ? def.bonus.k : null;
  const bidV = opt.bid ?? bidOf(e);
  const baseV = opt.instance && opt.bid === 0 ? 0 : baseOf(e); // a Reprint's dice play apart: the base rides with the first
  let total = sum(vals) + bidV + baseV + misPlus(e.trick);
  if (!inv) { total += fz.boost - fz.enfeeble + 0 + (def.type === 'expense' ? fz.press : 0) + (def.vengeance ? s.paidLast || 0 : 0); }
  total = Math.max(0, Math.round(total * (inv ? investMult(effTrick(e)) : trickMult(effTrick(e)) * fz.mul) * (def.type === 'expense' ? heat(b.turn) : 1)));
  if (bonus === 'double') total *= 2;
  if (bonus === 'bidmult') total *= Math.max(1, sum(e.paid || []) || e.bidValue || 1);
  const tag = `${opt.again ? `${opt.again}: ` : ''}${s.name}'s ${def.name} (${[...vals, ...(bidV ? [tx('feed.bid-part', { n: bidV })] : [])].join('+') || '0'}${bonus ? tx('feed.bonus') : ''})`;
  if (total >= 10 && !opt.again) for (const { cell } of allCells(s)) if (cell.roost) for (const egg of cell.chips.filter((ch) => ch.kind === 'egg')) { // a big trick hatches the eggs on your Roost
    cell.chips.splice(cell.chips.indexOf(egg), 1); b.fx[egg.id] = 'void'; b.creatures.push(newCreature(b, 'dragon', o.idx, b.turn + 1));
    yield step(b, tx('feed.hatches-an-egg-on', { tag, name: s.name, name2: o.name }), [], 'bonus'); }
  let t = targetSide(b, s, def);
  const pierce = def.type === 'expense' && (fz.pierce || bonus === 'pierce');
  // re-find the origin: positions may have changed since the target was picked
  let origin = null;
  if ((t || def.side === 'any') && def.approach !== 'none') {
    const valid = validTargets(b, s, e, pierce), want = e.target || valid[0];
    const far = (x) => (x.side !== want.side ? 1000 : 0) + Math.abs(x.c - want.c) * 10 + Math.abs(x.r - want.r);
    const lane = ['front', 'rear', 'body'].includes(def.approach);
    // the trick keeps its aim: the same lane for front/rear/body, the same space otherwise
    if (valid.length && want) origin = lane ? valid.filter((x) => x.side === want.side && x.c === want.c)[0] : valid.find((x) => x.side === want.side && x.r === want.r && x.c === want.c);
    if (!origin && valid.length && !e.target) origin = valid.slice().sort((x, y) => far(x) - far(y))[0];
    if (!origin) {
      if (def.roll.k === 'fee' && want) { const ws = b.sides[want.side]; stray(b, ws, want.r, want.c, total, 'its target is gone');
        yield step(b, tx('feed.lands-on-an-empty', { tag, total }), [ref(ws, want.r, want.c)], 'miss'); return; }
      yield step(b, tx('feed.finds-no-target-and', { tag }), [], 'miss'); return; }
    t = b.sides[origin.side]; // an Expense aimed at a creature over your own stack lands on your side
  }
  const dist = bonus === 'spread' ? SPREAD[e.trick.id] || 'swipe' : bonus === 'aura' ? 'aura' : def.dist;
  const cells = origin ? affected(b, t, def, origin, e.dice.length, { dist, payOnly: pierce }) : [];

  switch (def.roll.k) {
    case 'fee': {
      const element = def.element && (def.bonus.k !== 'element' || bonus === 'element') ? def.element : null;
      const opts = { pierce, glean: bonus === 'glean' }, notes = new Set(); let placed = 0;
      const send = (r, c, amt, el) => { const g = engage(b, s, t || o, r, c, amt, { ...opts, element: el }); placed += g.placed; for (const n of g.notes) notes.add(n.replace(/^\d+¢ /, '')); };
      const tail = () => (notes.size ? tx('feed.partly', { join: [...notes].join(', ') }) : '');
      if (def.dist === 'rain') {
        const live = allCells(o).filter((x) => occupied(x.cell, pierce)); if (!live.length) { yield step(b, tx('feed.finds-nothing-to-hit', { tag }), [], 'miss'); return; }
        const counts = new Map(); for (let i = 0; i < Math.min(total, 200); i++) { const x = b.rng.pick(live); counts.set(x, (counts.get(x) || 0) + 1); }
        let first = true; for (const [x, n] of counts) { send(x.r, x.c, n, first ? element : null); first = false; }
        yield step(b, tx('feed.rains-drops-of-debt', { tag, total, placed, tail: tail() }), [...counts.keys()].map((x) => ref(o, x.r, x.c)), placed ? 'play' : 'miss'); return;
      }
      const hit = feeShares(t || o, def, cells, total, pierce, b);
      if (!hit.length) { yield step(b, tx('feed.comes-to-nothing', { tag }), [], 'miss'); return; }
      hit.forEach(({ r, c, amt }, i) => send(r, c, amt, i === 0 ? element : null));
      if (def.plant === 'dynamite') { // light a stack of sticks on the empty space nearest the target
        const free = allCells(o).filter((x) => !x.cell.hole && !x.cell.chips.length).sort(nearestTo(origin));
        if (free.length) { const n = clamp(Math.floor(total / 4), 2, o.dims.stackMax); for (let k = 0; k < n; k++) free[0].cell.chips.push(mkChip(b, 'dynamite')); notes.add(`${n} sticks of Dynamite lit`); }
      }
      yield step(b, placed ? tx('feed.of-debt-on-2', { tag, placed, hitN: hit.length, tail: tail() }) : tx('feed.the-fee-is', { tag, v: [...notes].join(', ') || 'lost' }), hit.map((x) => ref(t || o, x.r, x.c)), placed || notes.size ? 'play' : 'miss'); return;
    }
    default: yield* playChips(b, s, e, def, { t: t || o, o, origin, cells, total, vals, bonus, pierce, tag, again: opt.again }); return;
  }
}

// ---------- trick effects, as chip effects ----------
// Every effect a trick has (but an Expense's fee, which is Debt chips already) is the work of a chip: the trick lays
// the chip (content/chipmaker.js, an action { k: 'fx', fx }) and the chip does this. Anything that lays the chip gets
// the effect: a trick, another chip, a tilt, the chip painter. x: s the Roller it works for, o the other, t the position
// it works on, cells the spaces it reaches there, total its strength (the roll it was made with), bonus the trick's
// Bonus when met, origin the space it was aimed at, tag who to name in the feed; e the trick's Run entry (none when
// no trick laid it), by an arrangement's name, make a maker's { chip, n, life }.
const FX = {
  block: function* ({ b, s, o, t, cells, total, bonus, e, origin, tag, by, make }) { const kind = bonus === 'counter' ? 'counter' : 'block'; const n = Math.min(total, 60);
        const left = addToMeter(b, s, Array.from({ length: n }, () => mkChip(b, kind)), origin, 'spawn');
        yield step(b, tx('feed.chips-to-the-bet', { tag, n, v: kind === 'counter' ? 'Counter' : 'Block', overText: overText(left) }), origin ? [origin] : [], 'play'); return; },
  make: function* ({ b, s, o, t, cells, total, bonus, e, origin, tag, by, make }) { // effect chips on the target stacks; a full stack takes none (the overflow is lost, like overkill)
        const M = make, X = SHOP_CHIPS[M.chip], n = M.n[0] + Math.floor(total / M.n[1]), life = M.life[0] + Math.floor(total / M.life[1]); let put = 0, over = 0;
        for (const { r, c } of cells) { const cell = s.grid[r][c]; let k = 0; while (k < n && placeFx(b, s, cell, M.chip, life, e?.trick.id ?? null)) k++; put += k; over += n - k; }
        yield step(b, tx('feed.placed', { tag, put, name: X.name, v: put ? ` for ${life >= 99 ? 'the bout' : tx('feed.line-2', { life })}` : '', v2: over ? tx('feed.had-no-room-and-3', { over }) : '' }), cells.map((x) => ref(s, x.r, x.c)), put ? 'play' : 'miss'); return; },
  harden: function* ({ b, s, o, t, cells, total, bonus, e, origin, tag, by, make }) { const turns = clamp(Math.floor(total / 4), 1, 5); for (const { r, c } of cells) if (solidCount(s.grid[r][c])) setHard(b, s.grid[r][c], turns);
        yield step(b, tx('feed.stacks-hardened-for', { tag, turns }), cells.map((x) => ref(s, x.r, x.c)), 'play'); return; },
  resist: function* ({ b, s, o, t, cells, total, bonus, e, origin, tag, by, make }) { s.status.resist += total; if (bonus === 'extend') s.status.resistNext = total;
        yield step(b, tx('feed.resist', { tag, total }), [], 'play'); return; },
  evade: function* ({ b, s, o, t, cells, total, bonus, e, origin, tag, by, make }) { s.status.evade = s.status.evade == null ? total : Math.min(s.status.evade, total); if (bonus === 'extend') s.status.evadeNext = total;
        yield step(b, tx('feed.fees-over-will-miss', { tag, total }), [], 'play'); return; },
  reflect: function* ({ b, s, o, t, cells, total, bonus, e, origin, tag, by, make }) { s.status.reflect = total; s.status.reflectAll = bonus === 'extend';
        yield step(b, tx('feed.reflect', { tag, total }), [], 'play'); return; },
  enfeeble: function* ({ b, s, o, t, cells, total, bonus, e, origin, tag, by, make }) { o.mods.enfeeble += total; if (bonus === 'extend') o.status.enfeebleNext = Math.floor(total / 2);
        yield step(b, tx('feed.s-roll-effects-lose', { tag, name: o.name, total }), [], 'play'); return; },
  bend: function* ({ b, s, o, t, cells, total, bonus, e, origin, tag, by, make }) { const v = e?.dice[0]?.value ?? total; // no die on it: the total stands in if (bonus === 'bendopp') o.mods.bend = v; else s.mods.bend = v;
        yield step(b, tx('feed.every-die-in-play', { tag, v: bonus === 'bendopp' ? o.name + ' has' : 'they have', v2: v }), [], 'play'); return; },
  press: function* ({ b, s, o, t, cells, total, bonus, e, origin, tag, by, make }) { s.mods.press += total; s.mods.pierce = true; if (bonus === 'extend') addPower(b, s, Math.floor(total / 2));
        yield step(b, tx('feed.expenses-gain-and-pierce', { tag, total }), [], 'play'); return; },
  parlay: function* ({ b, s, o, t, cells, total, bonus, e, origin, tag, by, make }) { const even = (e?.dice[0]?.value ?? total) % 2 === 0; s.mods.mul *= even ? 2 : 0.5;
        yield step(b, `${tag}: ${even ? tx('feed.even-effects-doubled') : tx('feed.odd-effects-halved')}.`, [], 'play'); return; },
  freeze: function* ({ b, s, o, t, cells, total, bonus, e, origin, tag, by, make }) { let n = 0;
        for (const { r, c } of cells) { const st = s.grid[r][c].chips, take = [];
          for (let i = st.length - 1; i >= 0 && take.length < total; i--) { const ch = st[i]; if (isHazard(ch) || ch.kind === 'debt') continue; if (ch.kind !== 'std' || ch.gold || ch.resist) break; take.push(ch); } // Chill brings its own water: it wets what it freezes
          for (const ch of st) if (ORGANIC.includes(ch.kind) && !ch.frozen) { ch.frozen = true; n++; }
          if (take.length < 2) continue;
          if (s.grid[r][c].puddle) s.grid[r][c].puddle.ice = true;
          const sumv = sum(take, (ch) => ch.value); for (const ch of take) { st.splice(st.indexOf(ch), 1); b.fx[ch.id] = 'void'; }
          pushChip(s.grid[r][c], mkChip(b, 'std', sumv, { frozen: true })); n += take.length; }
        yield step(b, `${tag}: ${n ? tx('feed.chips-frozen-together', { n }) : 'nothing to freeze'}.`, cells.map((x) => ref(s, x.r, x.c)), n ? 'play' : 'miss'); return; },
  sticky: function* ({ b, s, o, t, cells, total, bonus, e, origin, tag, by, make }) { let n = 0;
        for (const { r, c } of cells) { const cell = t.grid[r][c]; if (!solidCount(cell) || cell.chips.some((ch) => ch.kind === 'sticky')) continue;
          const st = mkChip(b, 'sticky', solidCount(cell), { stuck: firstMod(cell) }); cell.chips.push(st); b.fx[st.id] = 'spawn'; bind(b, cell); n++; }
        yield step(b, tx('feed.gummed-with-a-sticky', { tag, n }), cells.map((x) => ref(t, x.r, x.c)), n ? 'play' : 'miss'); return; },
  doom: function* ({ b, s, o, t, cells, total, bonus, e, origin, tag, by, make }) { let n = 0; const list = bonus === 'aura' ? allCells(t) : cells.map(({ r, c }) => ({ r, c, cell: t.grid[r][c] }));
        for (const x of list) { if (n >= total || !solidCount(x.cell) || capacityLeft(t, x.cell) <= 0 || x.cell.chips[topSolid(x.cell)]?.kind === 'doom') continue; const d = mkChip(b, 'doom', 0, { owner: s.idx }); pushChip(x.cell, d); b.fx[d.id] = 'spawn'; n++; }
        yield step(b, tx('feed.planted', { tag, n }), list.map((x) => ref(t, x.r, x.c)), n ? 'play' : 'miss'); return; },
  hat: function* ({ b, s, o, t, cells, total, bonus, e, origin, tag, by, make }) { let n = 0; if (total >= 8) for (const { r, c } of cells) { const cell = t.grid[r][c]; if (!solidCount(cell) || capacityLeft(t, cell) <= 0 || cell.chips.some((ch) => ch.kind === 'hat') || cell.link || cell.anchor) continue; const hat = mkChip(b, 'hat', 0, { owner: s.idx }); cell.chips.unshift(hat); b.fx[hat.id] = 'spawn'; n++; }
        yield step(b, `${tag}: ${n ? tx('feed.magic-slipped-under-s', { n, name: o.name }) : 'the trick needs a total of 8'}.`, cells.map((x) => ref(t, x.r, x.c)), n ? 'play' : 'miss'); return; },
  handoff: function* ({ b, s, o, t, cells, total, bonus, e, origin, tag, by, make }) { let n = 0;
        for (const { r, c } of cells) { const cell = t.grid[r][c], from = allCells(s).find((x) => x.cell.chips.some((ch) => ch.shop === 'uranium')); if (!from || capacityLeft(t, cell) <= 0) continue;
          const u = from.cell.chips.find((ch) => ch.shop === 'uranium'); from.cell.chips.splice(from.cell.chips.indexOf(u), 1); emptyOut(b, from.cell); pushChip(cell, u); n++; }
        yield step(b, `${tag}: ${n ? tx('feed.uranium-handed-to', { n, name: o.name }) : 'no Uranium to hand off'}.`, cells.map((x) => ref(t, x.r, x.c)), n ? 'play' : 'miss'); return; },
  feather: function* ({ b, s, o, t, cells, total, bonus, e, origin, tag, by, make }) { const turns = Math.max(1, Math.floor(total / 3)); let n = 0;
        for (const { r, c } of cells) { const i = topPayableIdx(s.grid[r][c]); if (i < 0) continue; const ch = s.grid[r][c].chips[i]; ch.feather = Math.max(ch.feather || 0, turns); n++; }
        yield step(b, tx('feed.feathered-for', { tag, n, turns }), cells.map((x) => ref(s, x.r, x.c)), n ? 'play' : 'miss'); return; },
  saturate: function* ({ b, s, o, t, cells, total, bonus, e, origin, tag, by, make }) { s.mods.boost += total; const had = o.mods.boost; o.mods.boost = 0; o.mods.subdued = true; if (bonus === 'extend') dropPower(b, o);
        yield step(b, tx('feed.other-roll-effects-gain-2', { tag, total, name: o.name, v: had ? ` (${had})` : '', v2: bonus === 'extend' ? ' and their Power drained' : '' }), [], 'play'); return; },
  arrange: function* ({ b, s, o, t, cells, total, bonus, e, origin, tag, by, make }) { const side = t, all = bonus === 'aura';
        const moved = arrange(b, side, by, all ? null : cells);
        yield step(b, tx('feed.moved-in-s-position', { tag, moved, name: side.name }), moved ? (all ? allCells(side) : cells).map((x) => ref(side, x.r, x.c)) : [], moved ? 'play' : 'miss'); return; },
  gild: function* ({ b, s, o, t, cells, total, bonus, e, origin, tag, by, make }) { let n = 0; for (const { r, c } of cells) { let left = total; const st = s.grid[r][c].chips;
          for (let i = st.length - 1; i >= 0 && left > 0; i--) if (st[i].kind === 'std' && !st[i].gold && !stuckIce(st[i], s.grid[r][c])) { st[i].gold = true; left--; n++; } }
        yield step(b, tx('feed.turned-to-gold', { tag, n }), cells.map((x) => ref(s, x.r, x.c)), 'play'); return; },
  settle: function* ({ b, s, o, t, cells, total, bonus, e, origin, tag, by, make }) { const n = settleColumn(b, s, origin, total);
        if (bonus === 'blocks') addToMeter(b, s, [mkChip(b, 'block'), mkChip(b, 'block')], null, 'spawn');
        yield step(b, tx('feed.cleansed-stake-organized', { tag, n }), [], 'play'); return; },
  gather: function* ({ b, s, o, t, cells, total, bonus, e, origin, tag, by, make }) { const n = recoup(b, s, total, bonus === 'both');
        yield step(b, tx('feed.recovered-from-the-stage', { tag, n }), [], 'play'); return; },
  fence: function* ({ b, s, o, t, cells, total, bonus, e, origin, tag, by, make }) { let n = 0; for (const { cell } of allCells(s)) { const d = debtOf(cell); if (!d || n >= total) continue; const take = Math.min(d, total - n); setDebt(b, cell, d - take); n += take; }
        const left = addToMeter(b, s, Array.from({ length: n }, () => mkChip(b, 'opp', 1)), null, 'spawn');
        if (bonus === 'blocks') left.push(...addToMeter(b, s, [mkChip(b, 'block'), mkChip(b, 'block')], null, 'spawn'));
        yield step(b, tx('feed.of-debt-fenced-into', { tag, n, overText: overText(left) }), [], 'play'); return; },
  sweep: function* ({ b, s, o, t, cells, total, bonus, e, origin, tag, by, make }) { let n = 0; for (let r = 0; r < o.dims.meterRows; r++) for (let c = 0; c < o.dims.cols; c++) { const st = o.grid[r][c].chips;
          for (let i = st.length - 1; i >= 0 && n < total; i--) if (isShield(st[i]) || st[i].kind === 'opp') { b.fx[st[i].id] = 'void'; st.splice(i, 1); n++; }
          if (!solidCount(o.grid[r][c])) for (const ch of st.splice(0)) b.fx[ch.id] = 'void'; }
        if (bonus === 'unharden') for (const { cell } of allCells(o)) unHard(b, cell);
        yield step(b, tx('feed.swept-off-s-bet', { tag, n, name: o.name }), [], 'play'); return; },
  scatter: function* ({ b, s, o, t, cells, total, bonus, e, origin, tag, by, make }) { const picked = [];
        for (let r = 0; r < o.rows && picked.length < total; r++) for (let c = 0; c < o.dims.cols && picked.length < total; c++) { const cell = o.grid[r][c]; if (anchored(cell)) continue;
          while (picked.length < total && topSolid(cell) >= 0) picked.push(cell.chips.splice(topSolid(cell), 1)[0]);
          if (!solidCount(cell)) for (const ch of cell.chips.splice(0)) b.fx[ch.id] = 'void'; }
        let lost = 0;
        for (const ch of picked) { const free = allCells(o).filter((x) => capacityLeft(o, x.cell) > 0 && b.rng.chance(0.6));
          if (free.length) pushChip(b.rng.pick(free).cell, ch); else if (isPayable(ch)) { b.stage.paid[o.idx] += ch.value; b.fx[ch.id] = 'stage'; toPit(b, o.idx, ch, 'fee'); lost += ch.value; } else b.fx[ch.id] = 'void'; }
        yield step(b, tx('feed.chips-scattered', { tag, pickedN: picked.length, v: lost ? tx('feed.fell-to-the-stage', { lost }) : '' }), [], 'play'); return; },
};
export const FX_KINDS = Object.keys(FX);
// the effect a chip model plays, if it is one of these ({ k: 'fx', fx, by? }), and the effect a trick lays
export const fxAction = (chip) => MADE_CHIPS[chip]?.actions?.find((A) => A.k === 'fx' && FX[A.fx]) || null;
export const fxOf = (def) => (def?.roll?.k === 'chips' ? fxAction(def.roll.chip)?.fx || null : null);
// a maker: a trick that lays effect chips, so many and for so long by the roll (roll: { chip, n: [base, per], life: [base, per] })
export const makeOf = (def) => (def?.roll?.k === 'chips' && def.roll.n && SHOP_CHIPS[def.roll.chip] ? def.roll : null);
// Lay an effect's chip: under the stack it was aimed at, or (an effect with no aim) on the first space of its Roller's
// Bet. It has done its work when a trick lays it (spent), and is gone at the end of the turn like any chip that lasts one.
function layFx(b, s, t, origin, chip, total) {
  const side = origin ? t : s, at = origin || meterOrder(s).find(({ r, c }) => !s.grid[r][c].hole && !s.grid[r][c].link); if (!at) return null;
  const mc = mkMade(b, chip); mc.power = total; mc.by = s.idx; mc.spent = true; side.grid[at.r][at.c].chips.unshift(mc); b.fx[mc.id] = 'spawn'; return mc;
}

// ---------- end of turn ----------
const around = (s, r, c) => allCells(s).filter((x) => (x.r !== r || x.c !== c) && Math.abs(x.r - r) <= 1 && Math.abs(x.c - c) <= 1);
const emptyOut = (b, cell) => { if (!solidCount(cell) && cell.chips.length) for (const ch of cell.chips.splice(0)) b.fx[ch.id] = 'void'; };
// a Fairy or Unicorn turns a chip into a random chip of any type
function transform(b, cell, i) {
  const v = cell.chips[i]; if (!v || stuckIce(v, cell) || v.big || ['volcano', 'hat', 'egg', 'hive', 'doom', 'fx'].includes(v.kind)) return; // a grounded Frozen chip and Big chips cannot be turned into another chip
  const k = b.rng.pick(['std', 'std', 'opp', 'block', 'counter', 'gold', 'debt', 'poison', 'boom']); delete v.gold; delete v.resist; delete v.shop;
  if (k === 'gold') { v.kind = 'std'; v.value = Math.max(1, v.value); v.gold = true; }
  else if (k === 'std') { v.kind = 'std'; v.value = b.rng.pick(DENOM_VALUES.filter((d) => d <= Math.max(2, b.rules.maxDenom))); }
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
      if (spots.length) yield step(b, tx('feed.s-tree-is-fully', { name: s.name, spotN: spots.length }), spots.map((x) => ref(s, x.r, x.c)), 'bonus');
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
  if (bloomed.length) yield step(b, tx('feed.s-flower-blooms', { name: s.name, bloomedN: bloomed.length }), bloomed, 'bonus');
  // eggs hatch: a step a turn, one more on a Roost, one more by heat. A hatched Dragon flies at the egg's foe.
  const hot = sunny(s) || s.calamities.some((k) => k === 'inferno' || k === 'volcano');
  for (const { r, c, cell } of cellsNow) for (const egg of cell.chips.filter((ch) => ch.kind === 'egg')) {
    egg.prog = (egg.prog || 0) + 1 + (cell.roost ? 1 : 0) + (hot || cell.chips.some((ch) => ch.kind === 'burn' || ch.kind === 'lava') ? 1 : 0);
    if (egg.prog < (shopVars('egg').hatch || 5)) continue;
    cell.chips.splice(cell.chips.indexOf(egg), 1); b.fx[egg.id] = 'void'; if (!cell.roost) emptyOut(b, cell);
    const foe = b.sides[egg.foe ?? s.idx]; b.creatures.push(newCreature(b, 'dragon', foe.idx, b.turn + 1));
    yield step(b, tx('feed.an-egg-hatches-in', { name: s.name, name2: foe.name }), [ref(s, r, c)], 'creature');
  }
  // a Magic Hat swallows the chip sitting on it
  for (const { r, c, cell } of cellsNow) { if (cell.chips[0]?.kind !== 'hat') continue; const v = cell.chips.findIndex((ch, i) => i > 0 && !isHazard(ch)); if (v < 0 || immuneTo(cell.chips[v], 'holes') || madeOf(cell.chips[v])?.move === 'flying') continue;
    const ch = cell.chips.splice(v, 1)[0]; b.fx[ch.id] = 'abduct'; if (isPayable(ch)) s.destroyed += ch.value;
    yield step(b, tx('feed.a-magic-hat-in', { name: s.name, v: isPayable(ch) ? ch.value + '¢ ' : '' }), [ref(s, r, c)], 'hazard'); }
  // Uranium mutates a chip next to it
  for (const { r, c, cell } of cellsNow) for (let k = 0; k < cell.chips.filter((ch) => ch.shop === 'uranium').length; k++) {
    const near = around(s, r, c).filter((x) => solidCount(x.cell) && !iced(x.cell)); if (!near.length) continue;
    const x = b.rng.pick(near), idx = b.rng.pick(x.cell.chips.map((ch, i) => i).filter((i) => !isHazard(x.cell.chips[i]))); transform(b, x.cell, idx); emptyOut(b, x.cell); b.fx[x.cell.chips[idx]?.id] = 'mutate';
    yield step(b, tx('feed.uranium-in-s-position', { name: s.name }), [ref(s, x.r, x.c), ref(s, r, c)], 'hazard'); }
  // Sprinklers shoot water at the farthest space
  for (const { r, c, cell } of cellsNow) for (const sp of cell.chips.filter((ch) => ch.shop === 'sprinkler')) {
    const d = (x) => Math.max(Math.abs(x.r - r), Math.abs(x.c - c)), far = allCells(s).filter((x) => !x.cell.link), top = Math.max(...far.map(d));
    const hit = b.rng.shuffle(far.filter((x) => d(x) >= top - 1)).slice(0, 1 + charge(cell, sp)); for (const x of hit) water(b, s, x);
    if (hit.length) yield step(b, tx('feed.s-sprinkler-waters-far', { name: s.name, hitN: hit.length }), hit.map((x) => ref(s, x.r, x.c)), 'bonus'); }
  // Hives send out Bumble Bees; bees sting creatures over your table and pollinate your Flowers into Honey
  const HV = shopVars('hive');
  if (b.turn % (HV.every || 2) === 0) for (const { r, c, cell } of cellsNow) { const n = cell.chips.filter((ch) => ch.kind === 'hive').length;
    for (let k = 0; k < n && s.bees.length < (HV.max || 6); k++) s.bees.push({ id: b.nextId++, r, c, life: 3 }); }
  for (const bee of s.bees) {
    const cr = (b.creatures || []).find((x) => x.side === s.idx && !x.gone && x.r >= 0 && x.arrive <= b.turn && CREATURES[x.kind].hits), notes = [];
    if (cr) { bee.r = cr.r; bee.c = cr.c; hurt(b, s, cr, notes); yield step(b, tx('feed.a-bumble-bee-stings', { join: notes.join(', ') }), [ref(s, cr.r, cr.c)], 'familiar'); }
    else if (cellsNow.some((x) => x.cell.chips.some((ch) => ch.kind === 'flower')) && b.rng.chance(0.5)) {
      const spot = b.rng.shuffle(cellsNow.filter((x) => solidCount(x.cell) && capacityLeft(s, x.cell) > 0))[0];
      if (spot) { const hn = mkChip(b, 'food', 0, { shop: 'honey', resist: 'honey' }); pushChip(spot.cell, hn); b.fx[hn.id] = 'spawn'; bee.r = spot.r; bee.c = spot.c;
        yield step(b, tx('feed.a-bumble-bee-pollinates', { name: s.name }), [ref(s, spot.r, spot.c)], 'familiar'); } }
    bee.life--;
  }
  s.bees = s.bees.filter((x) => x.life > 0);
  // Doom: once every one of your stacks is topped with an opponent's Doom chip, each Doom chip charges 1¢ (instance debt)
  { const st = cellsNow.filter((x) => solidCount(x.cell)), doomed = st.filter((x) => { const i = topSolid(x.cell); return i >= 0 && x.cell.chips[i].kind === 'doom' && x.cell.chips[i].owner !== s.idx; });
    if (st.length && doomed.length === st.length) { for (const x of doomed) engage(b, null, s, x.r, x.c, x.cell.chips.filter((ch) => ch.kind === 'doom').length, { reflected: true });
      yield step(b, tx('feed.doom-every-one-of', { name: s.name, sum: sum(doomed, (x) => x.cell.chips.filter((ch) => ch.kind === 'doom').length) }), doomed.map((x) => ref(s, x.r, x.c)), 'hazard'); } }
  // dynamite burns down a stick a turn, then goes off
  for (const { r, c, cell } of cellsNow) {
    if (!isDynamite(cell)) continue;
    const stick = cell.chips.pop(); b.fx[stick.id] = 'void';
    if (cell.chips.length) { yield step(b, tx('feed.dynamite-on-s-side', { name: s.name, chipN: cell.chips.length }), [ref(s, r, c)], 'hazard'); continue; }
    let lost = 0; const hit = [];
    for (const x of around(s, r, c)) { if (!x.cell.chips.length) continue; for (const ch of x.cell.chips.splice(0)) { b.fx[ch.id] = 'void'; if (isPayable(ch)) lost += ch.value; } hit.push(ref(s, x.r, x.c)); }
    s.destroyed += lost;
    yield step(b, tx('feed.the-dynamite-goes-off', { name: s.name, lost }), [ref(s, r, c), ...hit], 'hazard');
  }
}
// Orbital chips: weather and vehicles in the sky over a Roller's table, above the flying layer.
function* sky(b, s) {
  // a thing in the sky drifts to a space next to it (or stays): → the space it is over now
  const drift = (o) => { const to = b.rng.pick(allCells(s).filter((x) => steps(x, o) <= 1)); o.r = to.r; o.c = to.c; return { r: o.r, c: o.c, cell: s.grid[o.r][o.c] }; };
  for (const o of s.sky.slice()) {
    if (o.kind === 'cloud') { // drift, then rain: puddles, wet stacks, fire and frost washed off; lightning one turn in four
      const x = drift(o);
      for (const ch of x.cell.chips.filter((y) => ['burn', 'lava', 'frost', 'corrupt', 'hard', 'sticky'].includes(y.kind))) { x.cell.chips.splice(x.cell.chips.indexOf(ch), 1); b.fx[ch.id] = 'void'; }
      if (x.cell.puddle?.ice) x.cell.puddle.ice = false; water(b, s, x);
      let bolt = ''; if (b.rng.chance(0.25)) { const live = allCells(s).filter((y) => solidCount(y.cell)); if (live.length) { const y = b.rng.pick(live); bolt = tx('feed.and-lightning-strikes', { strike: strike(b, s, y) }); } }
      yield step(b, tx('feed.a-cloud-rains-on', { name: s.name, bolt }), [ref(s, o.r, o.c)], 'weather');
    } else if (o.kind === 'moon') { // the tide: a Puddle spreads
      const p = allCells(s).filter((x) => x.cell.puddle && !x.cell.puddle.ice); if (!p.length) continue;
      const x = b.rng.pick(p), to = allCells(s).filter((y) => Math.abs(y.r - x.r) + Math.abs(y.c - x.c) === 1 && !y.cell.chips.length && !y.cell.puddle && !y.cell.link);
      if (to.length) { const y = b.rng.pick(to); setPuddle(b, y.cell, false); x.cell.puddle.t = b.turn; yield step(b, tx('feed.the-tide-rises-under', { name: s.name }), [ref(s, y.r, y.c)], 'weather'); }
    } else if (o.kind === 'blizzard') { // at the end of its turn: short stacks freeze solid, wet chips freeze, Puddles ice over
      let n = 0; for (const { cell } of allCells(s)) { if (cell.puddle) cell.puddle.ice = true; if (solidCount(cell) && solidCount(cell) < o.str) for (const ch of cell.chips) if (!isHazard(ch)) ch.wet = Math.max(ch.wet || 0, 1); // its snow wets short stacks
        if (solidCount(cell) && wet(cell)) n += freezeTop(b, cell) ? 1 : 0; }
      s.sky.splice(s.sky.indexOf(o), 1);
      yield step(b, tx('feed.the-blizzard-strength-passes', { str: o.str, name: s.name, n }), [], 'weather');
    } else if (o.kind === 'b52') { // flies one space along its row, dropping a 52¢ Boom chip
      o.c++; if (o.c >= s.dims.cols) { s.sky.splice(s.sky.indexOf(o), 1); yield step(b, tx('feed.the-b-52-leaves', { name: s.name }), [], 'weather'); continue; }
      const cell = s.grid[o.r][o.c]; let hit = false; if (solidCount(cell) && !cell.chips.some((ch) => ch.kind === 'boom')) { const bm = mkHazard(b, 'boom'); bm.power = 52; cell.chips.push(bm); b.fx[bm.id] = 'spawn'; hit = true; }
      yield step(b, tx('feed.a-b-52-flies', { name: s.name, v: hit ? tx('feed.and-drops-a-52') : '' }), [ref(s, o.r, o.c)], 'hazard');
    } else if (o.kind === 'tornado') { // moves next door, and throws a stack shorter than its strength about
      const x = drift(o); let moved = 0, lost = 0;
      if (solidCount(x.cell) && solidCount(x.cell) < o.str && !anchored(x.cell) && !fixedCell(x.cell) && !lifted(x.cell)) {
        for (const ch of x.cell.chips.splice(0)) { const free = allCells(s).filter((y) => y.cell !== x.cell && capacityLeft(s, y.cell) > 0);
          if (isHazard(ch) || !free.length || b.rng.chance(0.3)) { b.fx[ch.id] = 'void'; if (isPayable(ch)) { s.destroyed += ch.value; lost += ch.value; } } else { pushChip(b.rng.pick(free).cell, ch); moved++; } } }
      yield step(b, tx('feed.strength', { name: CALAMITIES.tornado.name, str: o.str, v: moved || lost ? tx('feed.thrown-across-s-position', { moved, name: s.name, v: lost ? tx('feed.lost', { lost }) : '' }) : solidCount(x.cell) ? 'the stack holds firm' : 'it whirls over an empty space' }), [ref(s, o.r, o.c)], 'hazard');
    }
  }
  // the next turn's Blizzard: a polar table now and then, a Blizzard calamity every fourth turn
  const str = () => b.rng.range(1, 6) + b.rng.range(1, 6);
  if (!s.sky.some((o) => o.kind === 'blizzard') && ((b.weather.includes('blizzard') && b.rng.chance(0.2)) || (s.calamities.includes('blizzard') && b.turn % 4 === 3)))
    { s.sky.push({ id: b.nextId++, kind: 'blizzard', r: -1, c: -1, str: str() }); yield step(b, tx('feed.a-blizzard-rolls-in', { name: s.name }), [], 'weather'); }
}
// ---------- High Roller traits (content/bosstraits.js) ----------
// the traits a Roller plays by (bossTrait: the first of them, the one a High Roller's card is named for)
export const bossTraits = (s) => (s?.traits || []).map((t) => BOSS_TRAITS[t]).filter(Boolean);
export const bossTrait = (s) => bossTraits(s)[0] || null;
const fireproof = (s) => bossTraits(s).some((T) => T.k === 'fireproof');
// what a trait does, written from its rule and numbers
export const traitRule = (T) => (T ? tx(`trait.${T.k}`, { ...T.vars }) : '');
function traitStart(b, s) { for (const T of bossTraits(s)) traitBegins(b, s, T); }
function traitBegins(b, s, T) {
  if (T.k === 'fireproof') for (const { cell } of allCells(s)) if (solidCount(cell) && !cell.chips.some((ch) => ch.kind === 'burn')) cell.chips.push(mkHazard(b, 'burn', 99));
  if (T.k === 'wet') for (const { cell } of allCells(s)) for (const ch of cell.chips) if (!isHazard(ch)) ch.wet = 99;
  if (T.k === 'hardened') for (let c = 0; c < s.dims.cols; c++) { const r = frontRow(s, c); if (r >= 0) setHard(b, s.grid[r][c], T.vars.turns || 3); }
}
function* traitTurn(b, s) { if (worth(s) > 0) for (const T of bossTraits(s)) yield* traitPlays(b, s, T); }
function* traitPlays(b, s, T) {
  if (T.k === 'pitback') { const back = pullPit(b, s.idx, T.vars.n || 1, { bids: true }), left = addToMeter(b, s, back, null, 'from-pit'); backToPit(b, s.idx, left); // fees or bids, its own
    const got = sum(back.filter((ch) => !left.includes(ch)), (ch) => ch.value); if (got) yield step(b, tx('feed.trait-pitback', { name: s.name, trait: T.name, n: got }), [], 'bonus'); }
  if (T.k === 'interest') { const n = Math.min(T.vars.max || 3, Math.floor(worth(s) / Math.max(1, T.vars.per || 20)));
    const { at } = n ? toMeterAtRandom(b, s, Array.from({ length: n }, () => mkChip(b, 'std', 1))) : { at: [] };
    if (at.length) yield step(b, tx('feed.trait-interest', { name: s.name, trait: T.name, n: at.length }), at.map((x) => ref(s, x.r, x.c)), 'bonus'); }
}

// ---------- creatures: a third hand in each House phase ----------
// A creature acts in the House phase of its type (CREATURES[kind].type: what its action is, an Investment, Insurance,
// Expense or Correction), after both Rollers have played theirs, so a trick aimed at it or its stack lands first and
// what it does is something you answer in the next turn's plays.
export const creatureType = (kind) => CREATURES[kind]?.type || 'expense';
const actingIn = (b, type) => (b.creatures || []).filter((x) => !x.gone && x.arrive <= b.turn && x.acted !== b.turn && creatureType(x.kind) === type);
function* creaturePhase(b, type) {
  for (const cr of actingIn(b, type)) { const s = b.sides[cr.side]; b.ctx = { phase: type, who: cr.side, creature: true }; cr.acted = b.turn; yield* creatureAct(b, s, cr); }
}
function* creatureAct(b, s, cr) {
  let text = '', at = null;
    if (cr.kind === 'mole') { // digs up an empty space
      const free = allCells(s).filter((x) => !x.cell.hole && !x.cell.chips.length && !x.cell.link && !x.cell.roost);
      if (free.length) { at = b.rng.pick(free); at.cell.hole = true; delete at.cell.puddle; text = tx('feed.a-mole-digs-a'); } else text = tx('feed.a-mole-finds-nowhere');
    } else if (cr.kind === 'ghost') { // haunts a row with stacks in it
      if (cr.r < 0) { const rows = [...new Set(allCells(s).filter((x) => solidCount(x.cell)).map((x) => x.r))]; cr.r = rows.length ? b.rng.pick(rows) : 0; cr.c = Math.floor(s.dims.cols / 2); }
      at = { r: cr.r, c: cr.c }; text = tx('feed.a-ghost-haunts-a');
    } else if (cr.kind === 'ghostship') { // sails across empty spaces to a Gold-topped stack and steals the Gold
      const gold = allCells(s).filter((x) => { const i = topSolid(x.cell); return i >= 0 && x.cell.chips[i].gold && !x.cell.chips[i].treasure; });
      const empty = allCells(s).filter((x) => !x.cell.chips.length && !x.cell.hole && !x.cell.link && !x.cell.roost);
      if (cr.r < 0) { const st = b.rng.pick(empty.length ? empty : allCells(s)); cr.r = st.r; cr.c = st.c; }
      const d = (x, y) => Math.max(Math.abs(x.r - y.r), Math.abs(x.c - y.c)), goal = gold.sort((x, y) => d(x, cr) - d(y, cr))[0];
      if (goal && d(goal, cr) <= 1) { const i = topSolid(goal.cell), v = goal.cell.chips.splice(i, 1)[0]; cr.hold.push(v); b.fx[v.id] = 'abduct'; s.destroyed += v.value; emptyOut(b, goal.cell); text = tx('feed.the-ghost-ship-steals', { value: v.value }); at = { r: cr.r, c: cr.c }; }
      else { const step1 = empty.filter((x) => d(x, cr) === 1).sort((x, y) => (goal ? d(x, goal) - d(y, goal) : b.rng.next() - 0.5))[0];
        if (step1) { cr.r = step1.r; cr.c = step1.c; } at = { r: cr.r, c: cr.c }; text = goal ? tx('feed.the-ghost-ship-sails') : tx('feed.the-ghost-ship-drifts'); }
    } else {
      const live = allCells(s).filter((x) => solidCount(x.cell) && (cr.kind === 'dragon' || !anchored(x.cell)));
      if (!live.length) { cr.gone = true; return; }
      const stay = cr.kind === 'mothership' && cr.r >= 0 && solidCount(s.grid[cr.r][cr.c]) && !anchored(s.grid[cr.r][cr.c]) ? { r: cr.r, c: cr.c, cell: s.grid[cr.r][cr.c] } : null;
      at = stay || b.rng.pick(live); const i = topSolid(at.cell);
      if (cr.kind === 'ufo' || cr.kind === 'mothership') { const v = at.cell.chips.splice(i, 1)[0]; b.fx[v.id] = 'abduct'; if (isPayable(v)) s.destroyed += v.value; text = cr.kind === 'ufo' ? tx('feed.a-ufo-abducts-a') : tx('feed.the-mothership-beams-up'); if (cr.kind === 'mothership' && !solidCount(at.cell)) cr.life = 1; }
      else if (cr.kind === 'dragon') { if (!hasResist(at.cell, 'burn') && !at.cell.chips.some((ch) => ch.kind === 'burn')) at.cell.chips.push(mkHazard(b, 'burn')); text = tx('feed.a-dragon-breathes-fire'); }
      else if (cr.kind === 'unicorn') { for (let k = at.cell.chips.length - 1; k >= 0; k--) if (!isHazard(at.cell.chips[k])) transform(b, at.cell, k); text = tx('feed.a-unicorn-transforms-a'); }
      else { transform(b, at.cell, i); text = tx('feed.a-fairy-transforms-a'); }
      emptyOut(b, at.cell);
    }
    if (at) { cr.r = at.r; cr.c = at.c; }
    if (--cr.life <= 0) cr.gone = true;
    const nest = cr.gone && cr.roost && !cr.bountied ? allCells(s).find((x) => x.cell.roost?.id === cr.roost) : null;
    if (nest) { nest.cell.chips.push(mkChip(b, 'egg', 0, { shop: 'egg', hits: shopVars('egg').hits || 5, prog: 0, foe: s.idx })); text += tx('feed.nests-and-lays-an'); }
    yield step(b, tx('feed.in-s-position', { text, name: s.name, v: cr.gone ? tx('feed.then-leaves') : '' }), at ? [ref(s, at.r, at.c)] : [], 'creature');
}
function* ticks(b) {
  for (const s of b.sides) {
    b.ctx = { phase: 'house', who: s.idx };
    let burned = 0, boomed = 0; const touched = [];
    const HZ = ['burn', 'acid', 'shock', 'corrupt', 'poison', 'boom', 'frost', 'lava'];
    for (const { r, c, cell } of allCells(s)) for (const h of cell.chips.filter((ch) => HZ.includes(ch.kind))) {
      if (!cell.chips.includes(h)) continue;
      const drop = () => { cell.chips.splice(cell.chips.indexOf(h), 1); b.fx[h.id] = 'void'; };
      if (fireproof(s) && (h.kind === 'burn' || h.kind === 'lava')) continue; // it burns, and burns nothing
      if (hasResist(cell, h.kind) || (fireproof(s) && h.kind === 'acid')) { drop(); touched.push(ref(s, r, c)); continue; }
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
      if (i >= 0 && immuneTo(cell.chips[i], h.kind)) { drop(); continue; } // an immune chip puts the hazard out
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
    if (touched.length) yield step(b, tx('feed.hazards-work-through-s', { name: s.name, v: burned ? tx('feed.destroyed', { burned }) : '', v2: boomed ? tx('feed.boom-chip-off', { v: burned ? ',' : ':', boomed, v2: boomed > 1 ? 's go' : ' goes' }) : '' }), touched, 'hazard');

    yield* growth(b, s);
    for (let k = 0; k < s.familiars; k++) {
      const n = cleanse(b, s, 1); const cr = b.creatures.find((x) => x.side === s.idx && !x.gone && x.r >= 0);
      const chased = cr && b.rng.chance(0.5); if (chased) cr.gone = true;
      if (n || chased) yield step(b, tx('feed.s-familiar', { name: s.name, v: n ? 'clears a chip' : '', v2: n && chased ? ' and ' : '', v3: chased ? 'chases a creature away' : '' }), [], 'familiar');
    }
    yield* houseTilts(b, s);
    if (s.spawners && b.turn % (s.tilts?.spawner && pressure(b, s).total >= 1 / 3 ? 2 : 3) === 0) for (let k = 0; k < s.spawners; k++) b.creatures.push(mkCreature(b, s.idx, b.turn));
    for (const { cell } of allCells(s)) if (cell.roost && !cell.chips.some((ch) => ch.kind === 'egg') && b.turn % 3 === 0 && !b.creatures.some((x) => x.roost === cell.roost.id && !x.gone))
      b.creatures.push(newCreature(b, 'dragon', s.idx, b.turn, { roost: cell.roost.id }));
    if (s.sky.some((o) => o.kind === 'moon') && b.turn % 4 === 0) b.creatures.push(newCreature(b, 'ghost', s.idx, b.turn)); // the Moon brings Ghosts out
    for (const { r, c, cell } of allCells(s)) if (cell.worm && cell.chips.length) { // pulled through to the other side
      const o = b.sides[1 - s.idx], free = allCells(o).filter((x) => !x.cell.hole && !x.cell.chips.length), moving = cell.chips.splice(0);
      if (free.length) { const x = b.rng.pick(free); x.cell.chips = moving; yield step(b, tx('feed.chip-pulled-through-to', { name: CALAMITIES.wormhole.name, movingN: moving.length, name2: o.name }), [ref(s, r, c), ref(o, x.r, x.c)], 'hazard'); }
      else { for (const ch of moving) { b.fx[ch.id] = 'void'; if (isPayable(ch)) s.destroyed += ch.value; } yield step(b, tx('feed.chips-are-lost-in', { name: CALAMITIES.wormhole.name }), [ref(s, r, c)], 'hazard'); }
    }
    for (const cal of s.calamities) {
      if (cal === 'inferno') { const live = allCells(s).filter((x) => solidCount(x.cell) && !x.cell.chips.some((ch) => ch.kind === 'burn') && !hasResist(x.cell, 'burn'));
        if (live.length) { const x = b.rng.pick(live); x.cell.chips.push(mkHazard(b, 'burn')); yield step(b, tx('feed.a-stack-catches-fire', { name: CALAMITIES.inferno.name }), [ref(s, x.r, x.c)], 'hazard'); } }
      if (cal === 'audit' && b.turn % 2 === 0) { const hit = []; for (let c = 0; c < s.dims.cols; c++) { const r = frontRow(s, c); if (r >= 0 && engage(b, null, s, r, c, 1, {}).placed) hit.push(ref(s, r, c)); }
        if (hit.length) yield step(b, tx('feed.1-of-debt-on', { name: CALAMITIES.audit.name, name2: s.name }), hit, 'hazard'); }
    }
    yield* sky(b, s);
    for (const { r, c, cell } of allCells(s)) {
      if (cell.black) { const near = around(s, r, c).filter((x) => solidCount(x.cell) && !anchored(x.cell) && !fixedCell(x.cell)); if (!near.length) continue;
        const x = b.rng.pick(near), v = x.cell.chips.splice(x.cell.chips.findIndex((ch) => !isHazard(ch)), 1)[0]; // it takes the bottom chip b.fx[v.id] = 'void'; if (isPayable(v)) s.destroyed += v.value; emptyOut(b, x.cell);
        yield step(b, tx('feed.a-chip-is-pulled', { name: CALAMITIES.blackhole.name, name2: s.name }), [ref(s, x.r, x.c), ref(s, r, c)], 'hazard'); }
      if (cell.volcano > 0) { const live = allCells(s).filter((x) => solidCount(x.cell) && !x.cell.chips.some((ch) => ch.kind === 'burn') && !hasResist(x.cell, 'burn'));
        const x = live.length ? b.rng.pick(live) : null; if (x) x.cell.chips.push(mkHazard(b, 'burn'));
        if (--cell.volcano <= 0) { for (const ch of cell.chips.filter((y) => y.kind === 'volcano')) { cell.chips.splice(cell.chips.indexOf(ch), 1); b.fx[ch.id] = 'void'; }
          const L = allCells(s).filter((y) => y.cell.link && y.cell.link.r === r && y.cell.link.c === c); freeLinks(s, r, c); for (const y of [{ cell }, ...L]) y.cell.cut = (y.cell.cut || 0) + 1; } // dormant: one stack height lower
        yield step(b, `${CALAMITIES.volcano.name}: ${x ? 'a Burning chip lands on a stack' : 'it rumbles'}${cell.volcano <= 0 ? tx('feed.then-it-goes-dormant') : ''}.`, x ? [ref(s, x.r, x.c), ref(s, r, c)] : [ref(s, r, c)], 'hazard'); }
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
        const ch = cell.chips.splice(i, 1)[0]; b.stage.paid[s.idx] += ch.value; b.fx[ch.id] = 'stage'; toPit(b, s.idx, ch, 'fee'); setDebt(b, cell, d - ch.value); }
      emptyOut(b, cell);
    }
  }
}


// ---------- the test table (Build mode) ----------
// What the test table can put on a space: a Royal Paradise chip of a value, a Block or Counter chip, a hazard, an
// effect chip (lasting the bout) or a made chip. op is one of the chip painter's four (stackedit.js): 'add' on top,
// 'insert' below the chip pointed at, 'change' that chip into it, 'remove' it. `at`: the id of the chip pointed at in
// that stack; without it Change and Remove work on the top chip (hazards aside) and Insert goes under the stack.
export function sandboxChip(b, side, r, c, what, op = 'add', at = null, by = null) { // by: the Roller a made chip works for (the House's tilts: against you, or for you)
  const s = b.sides[side], cell = s.grid[r]?.[c]; if (!cell) return false;
  const atI = at == null ? -1 : cell.chips.findIndex((ch) => ch.id === at);
  const topI = (() => { for (let i = cell.chips.length - 1; i >= 0; i--) if (!isHazard(cell.chips[i])) return i; return cell.chips.length - 1; })();
  if (op === 'remove') { const e = stackEdit(cell.chips, 'remove', null, atI, topI); if (!e) return false; b.fx[e.old.id] = 'void'; if (e.old.kind === 'puddle') delete cell.puddle; return true; }
  const make = () => {
    if (what.made && MADE_CHIPS[what.made]) { const mc = mkMade(b, what.made); if (by != null) mc.by = by; return mc; }
    if (what.shop && SHOP_CHIPS[what.shop]) return mkChip(b, 'fx', 0, { shop: what.shop, resist: what.shop, life: 99, maker: null });
    if (what.kind && HAZARD_LIFE[what.kind]) return mkHazard(b, what.kind);
    if (what.kind === 'debt') return null;
    return mkChip(b, what.kind || 'std', what.kind === 'block' || what.kind === 'counter' ? 0 : Math.max(1, what.value | 0 || 1));
  };
  if (what.kind === 'debt') { if (!occupied(cell)) return false; setDebt(b, cell, debtOf(cell) + Math.max(1, what.value | 0 || 1)); return true; }
  if (what.kind === 'puddle') { if (cell.link) return false; if (op === 'change' && cell.puddle) { delete cell.puddle; return true; } water(b, s, { cell, r, c }); return true; } // the Puddle chip goes under the stack
  const ch = make(); if (!ch) return false;
  if (op === 'change') { const e = stackEdit(cell.chips, 'change', ch, atI, topI); if (!e) return false; b.fx[e.old.id] = 'void'; b.fx[ch.id] = 'mutate'; return true; }
  if (ch.kind === 'made') (s.madeNew ||= []).push(ch.id); // it fires 'when made' at the end of the phase, like any other
  if (ch.kind === 'made' && footOf(ch) > 1) { const at = footBlock(s, r, c, footOf(ch)); if (!at) return false; claimFoot(s, at.r, at.c, footOf(ch)); s.grid[at.r][at.c].chips.push(ch); b.fx[ch.id] = 'spawn'; return true; }
  if (ch.kind === 'made' ? !fits(s, cell, ch) : (cell.hole || cell.link || (!isHazard(ch) && capacityLeft(s, cell) <= 0))) return false;
  if (op === 'add' && ch.kind === 'made') placeMade(cell, ch, 'over') || cell.chips.push(ch); // a made chip takes the place its own rules give it
  else stackEdit(cell.chips, op, ch, atI);
  b.fx[ch.id] = 'spawn'; return true;
}

// ---------- High Roller phases (Opponent maker) ----------
// A High Roller with phases changes how it plays as its Worth falls: each phase starts when Worth drops below
// `below` of what it sat down with. A phase can cheat: extra dice of its best kind join the pouch, and tricks come
// straight from the Book onto the Run, shown to the table.
function* bossPhase(b, s) {
  if (!s.phases?.length || !s.startWorth) return;
  const frac = worth(s) / s.startWorth;
  let k = s.phaseAt; for (let i = s.phaseAt + 1; i < s.phases.length; i++) if (frac < s.phases[i].below) k = i;
  if (k === s.phaseAt) return;
  s.phaseAt = k; const P = s.phases[k]; s.phaseBehave = { ...(s.phaseBehave || {}), ...(P.behave || {}) };
  const got = [];
  if (P.cheat?.dice > 0 && s.pouch.length) { const best = s.pouch.slice().sort((x, y) => DICE[y.type].faces - DICE[x.type].faces)[0];
    for (let n = 0; n < P.cheat.dice; n++) s.pouch.push({ ...boutCopy(best), id: 9e6 + b.nextId++ }); got.push(tx('feed.extra', { dice: P.cheat.dice, type: best.type })); }
  if (P.cheat?.tricks > 0) { let n = 0; for (; n < P.cheat.tricks && s.book.length; n++) { const t = s.book.shift(); s.run.push({ uid: t.uid, trick: t, dice: [], bid: [], bidValue: 0, target: null, state: 'shown', stack: [], lingerLeft: 0, drawn: b.turn, bookAt: 0, cheat: true }); got.push(TRICKS[t.id].name); } }
  yield step(b, tx('feed.changes-tactics', { name: s.name, v: got.length ? tx('feed.and-cheats-revealed', { join: got.join(', ') }) : '' }), [], 'tilt');
}

// ---------- made chips at work (chip maker: movement, reach, triggers, actions) ----------
// A made chip's triggers fire in a phase (when tricks of that type played, or always for 'phase'), each turn in the
// House phase, when it is made, when it is removed, or when a chip it watches is exposed on top of a stack. When one
// fires, its actions work on every chip its reach covers. In the House phase it then moves by its movement rule.
const findMade = (s, id) => { for (const x of allCells(s)) { const i = x.cell.chips.findIndex((ch) => ch.id === id); if (i >= 0) return { ...x, i, ch: x.cell.chips[i] }; } return null; };
const topNon = (cell) => { for (let i = cell.chips.length - 1; i >= 0; i--) if (!isHazard(cell.chips[i])) return cell.chips[i]; return null; };
const nameOfChip = (ch) => madeOf(ch)?.name || CHIP_KIND_NAMES[ch.kind] || ch.kind;
const CHIP_KIND_NAMES = { std: tx('feed.royal-paradise-chip'), block: tx('feed.block-chip'), counter: tx('feed.counter-chip'), debt: tx('feed.debt-chip'), opp: tx('feed.opportunity-chip') };
// the chips a made chip's reach covers: [{ x (where), ch }], never the chip itself
function reachOf(b, s, at, M) {
  const R = M.reach || { to: 'touching', range: 1 }, range = Math.max(1, Math.min(5, R.range || 1)), out = [];
  const near = (x) => Math.max(Math.abs(x.r - at.r), Math.abs(x.c - at.c)) < range;
  const sides = R.to === 'all' ? b.sides : R.to === 'theirs' ? [b.sides[1 - s.idx]] : [s];
  if (R.to === 'inside') { // the chips lying on it, across its footprint
    for (const x of allCells(s)) if (at.ch.mat ? inMat(at.ch, x.r, x.c) : x.cell === at.cell) for (const ch of x.cell.chips) if (ch !== at.ch && !isHazard(ch)) out.push({ x, ch });
    return out;
  }
  if (R.to === 'lane' || R.to === 'column') { // every chip in its row across the position (its lane), or in its depth line (its column)
    for (const x of allCells(s)) if (R.to === 'lane' ? x.c === at.c : x.r === at.r) for (const ch of x.cell.chips) if (ch !== at.ch && !isHazard(ch)) out.push({ x, ch });
    return out;
  }
  if (R.to === 'touching' || R.to === 'touchingValue' || R.to === 'touchingHits') { // above and below in its stack, and the stacks within range
    const cells = range > 1 ? allCells(s).filter(near) : [at];
    for (const x of cells) x.cell.chips.forEach((ch, i) => { if (ch === at.ch || isHazard(ch)) return; if (x.cell === at.cell && range === 1 && Math.abs(i - at.i) !== 1) return;
      if (R.to === 'touchingValue' && !(ch.value > 0)) return; if (R.to === 'touchingHits' && !(ch.hits > 0)) return; out.push({ x, ch }); });
    return out;
  }
  for (const t of sides) for (const x of allCells(t)) {
    if (['sameType', 'named', 'typed'].includes(R.to) && (t !== s || !near(x)) && range < 5) continue;
    for (const ch of x.cell.chips) { if (ch === at.ch || isHazard(ch)) continue;
      if (R.to === 'sameType' && !(ch.kind === at.ch.kind && ch.model === at.ch.model)) continue;
      if (R.to === 'named' && nameOfChip(ch).toLowerCase() !== String(R.name || '').toLowerCase()) continue;
      if (R.to === 'typed' && ch.kind !== R.kind && ch.model !== R.kind) continue;
      out.push({ x: { ...x, side: t }, ch }); }
  }
  return out;
}
// ---------- pushing and shoving, tugging and pulling ----------
// Three ways a stack moves. A SLIDE moves it along the felt one space: a stack in its way is pushed on ahead of it, and
// the one ahead of that, as far as the line of stacks goes. Nothing can be pushed off the back of a position or off
// its top or bottom rows, so a slide that would do that does not happen; the front is different: the Pit is there, and
// a stack pushed off the front falls into it (its chips are lost as fees are). A LIFT picks chips up and sets them on
// top of another space's stack; a SLIP slides them in under it. Neither can make a stack taller than its limit.
// Anchored stacks, Holes, big chips, Trees and the like hold their ground: they do not move and nothing moves through them.
const isStack = (cell) => solidCount(cell) > 0;
const carried = (ch) => !immuneTo(ch, 'moves') && !['anchored', 'flying'].includes(madeOf(ch)?.move) && footOf(ch) === 1 && !ch.mat;
const holdsGround = (cell) => fixedCell(cell) || cell.chips.some((ch) => !isHazard(ch) && !carried(ch) && !tiny(ch));
// the line of stacks a slide from (r, c) would push, and how it ends: 'room' (an empty space takes the last one),
// 'pit' (the last one goes off the front), or a reason it cannot happen
export function slidePath(s, r, c, dr, dc) {
  const line = []; let rr = r, cc = c;
  for (;;) {
    const cell = s.grid[rr]?.[cc];
    if (rr < 0) return { line, end: line.length ? 'pit' : 'none' };
    if (!cell || cc < 0 || cc >= s.dims.cols || rr >= s.rows) return { line, end: 'edge' };
    if (cell.hole || cell.link) return { line, end: 'blocked' };
    if (!isStack(cell)) return { line, end: line.length ? 'room' : 'none', to: { r: rr, c: cc } };
    if (holdsGround(cell)) return { line, end: 'blocked' };
    line.push({ r: rr, c: cc }); rr += dr; cc += dc;
  }
}
export const canSlide = (s, r, c, dr, dc, o = {}) => { const P = slidePath(s, r, c, dr, dc); return P.end === 'room' || (P.end === 'pit' && o.spill !== false); };
// slide the stack at (r, c) one space; returns { moved (stacks), spilled (¢ into the Pit), cells } or null
export function slide(b, s, r, c, dr, dc, o = {}) {
  const P = slidePath(s, r, c, dr, dc); if (!(P.end === 'room' || (P.end === 'pit' && o.spill !== false))) return null;
  const cells = P.line.map((x) => ref(s, x.r, x.c)); let spilled = 0;
  const carry = (cell) => { const go = cell.chips.filter((ch) => isHazard(ch) || carried(ch) || tiny(ch)); cell.chips = cell.chips.filter((ch) => !go.includes(ch)); return go; }; // a Puddle stays with its space
  let load = null;
  for (const at of P.line) { const cell = s.grid[at.r][at.c], out = carry(cell); if (load) cell.chips.push(...load); load = out; }
  if (P.end === 'room') { s.grid[P.to.r][P.to.c].chips.push(...load); cells.push(ref(s, P.to.r, P.to.c)); }
  else for (const ch of load) { // off the front: into the Pit
    if (isPayable(ch)) { b.stage.paid[s.idx] += ch.value; b.fx[ch.id] = 'stage'; toPit(b, s.idx, ch, 'fee'); spilled += ch.value; } else b.fx[ch.id] = 'void'; }
  for (const x of P.line) emptyOut(b, s.grid[x.r][x.c]);
  return { moved: P.line.length, spilled, cells };
}
// the chips a lift or a slip picks up from a space: its top chip (or, whole, every chip that can be carried)
const pickUp = (cell, whole) => { const able = cell.chips.filter((ch) => !isHazard(ch) && !tiny(ch) && carried(ch)); return whole ? able : able.slice(-1); };
const tallOf = (chips) => chips.reduce((t, ch) => t + heightOf(ch), 0);
export function canLift(s, from, to, o = {}) {
  const a = s.grid[from.r]?.[from.c], z = s.grid[to.r]?.[to.c]; if (!a || !z || a === z) return false;
  const up = pickUp(a, o.whole); if (!up.length || fixedCell(a) || z.hole || z.link || holdsGround(z)) return false;
  return solidCount(z) + tallOf(up) <= s.dims.stackMax; // never over a stack's height
}
function carryTo(b, s, from, to, o, under) {
  if (!canLift(s, from, to, o)) return null;
  const a = s.grid[from.r][from.c], z = s.grid[to.r][to.c], up = pickUp(a, o.whole); a.chips = a.chips.filter((ch) => !up.includes(ch));
  if (under) z.chips.splice(z.chips.findIndex((ch) => !ch.mat && !tiny(ch)) < 0 ? z.chips.filter((ch) => ch.mat || tiny(ch)).length : z.chips.findIndex((ch) => !ch.mat && !tiny(ch)), 0, ...up); // under the stack, over anything flat lying there
  else for (const ch of up) pushChip(z, ch);
  emptyOut(b, a); return { moved: up.length, cells: [ref(s, from.r, from.c), ref(s, to.r, to.c)] };
}
export const lift = (b, s, from, to, o = {}) => carryTo(b, s, from, to, o, false);
export const slip = (b, s, from, to, o = {}) => carryTo(b, s, from, to, o, true);
// A made chip's Move action, as a slide, a lift or a slip (A.how). A.dir: up (toward the front), down (back), left,
// right. A.steps: a number of spaces, 'all' (as far as it goes), or 'power' (one space per A.per points of the roll it
// was made with, at least one). A slide by steps moves the chip's own stack, pushing what is ahead (A.spill: it may
// push stacks off the front into the Pit); a slide 'all' closes every stack its reach covers up in that direction and
// spills nothing. A lift or slip carries the top chip of its stack (A.whole: the stack) that many spaces over.
function moveStacks(b, s, at, A, list) {
  const [dr, dc] = DIRS[A.dir || 'up'] || DIRS.up, pw = Math.max(1, Math.floor((at.ch.power || 0) / Math.max(1, A.per || 4)));
  const steps = A.steps === 'all' ? 99 : A.steps === 'power' ? pw : Math.max(1, Math.round(A.steps || 1));
  if (A.how === 'slide' && A.steps === 'all') {
    const side = list[0]?.x.side || s, cells = [...new Map([{ x: { r: at.r, c: at.c } }, ...list].map((tg) => [tg.x.r + ':' + tg.x.c, { r: tg.x.r, c: tg.x.c }])).values()];
    cells.sort((p, q) => (dr ? (p.r - q.r) * dr : (p.c - q.c) * dc) * -1); // the one furthest along goes first
    let n = 0; for (const p of cells) { let r = p.r, c = p.c; while (isStack(side.grid[r][c]) && slidePath(side, r, c, dr, dc).line.length === 1 && slide(b, side, r, c, dr, dc, { spill: false })) { r += dr; c += dc; n++; } }
    return n;
  }
  if (A.how === 'slide') { let r = at.r, c = at.c, n = 0; for (let k = 0; k < steps; k++) { const res = slide(b, s, r, c, dr, dc, { spill: !!A.spill }); if (!res) break; n += res.moved; r += dr; c += dc; if (r < 0) break; } return n; }
  const to = { r: at.r + dr * steps, c: at.c + dc * steps }, res = A.how === 'slip' ? slip(b, s, at, to, { whole: !!A.whole }) : lift(b, s, at, to, { whole: !!A.whole });
  return res ? res.moved : 0;
}
// move a chip one space; false if it cannot go there
function moveChip(b, s, from, ch, dr, dc) {
  const r = from.r + dr, c = from.c + dc; if (r < 0 || r >= s.rows || c < 0 || c >= s.dims.cols) return false;
  const to = s.grid[r][c]; if (footOf(ch) > 1) return false; // a big chip holds its ground
  if (ch.kind === 'made' ? !fits(s, to, ch) : (to.hole || to.link || capacityLeft(s, to) <= 0)) return false;
  const i = from.cell.chips.indexOf(ch); if (i < 0) return false; from.cell.chips.splice(i, 1);
  const M = madeOf(ch); if (M?.move === 'toBottom' || M?.must === 'bottom') to.chips.unshift(ch); else if (M) placeMade(to, ch, 'over') || to.chips.push(ch); else pushChip(to, ch);
  return true;
}
const DIRS = { left: [0, -1], right: [0, 1], up: [-1, 0], down: [1, 0], front: [-1, 0], back: [1, 0] };
const buff = (n) => (n > 0 ? 'buffs' : 'debuffs');
function act(b, s, A, target, M) {
  const ch = target.ch, side = target.x.side || s;
  switch (A.k) {
    case 'move': { if (immuneTo(ch, 'moves') || ['anchored', 'flying'].includes(madeOf(ch)?.move)) return 0; const [dr, dc] = DIRS[A.dir || 'right'] || DIRS.right; return moveChip(b, side, target.x, ch, dr, dc) ? 1 : 0; }
    case 'value': { const n = A.n ?? 1; if (immuneTo(ch, buff(n)) || !(isPayable(ch) || ch.kind === 'made')) return 0; ch.value = ch.kind === 'made' ? ch.value + n : Math.max(1, ch.value + n); b.fx[ch.id] = 'mutate'; return 1; }
    case 'hits': { const n = A.n ?? 1; if (immuneTo(ch, buff(n)) || !(ch.hits > 0 || isInstance(ch) || ch.kind === 'made')) return 0; ch.hits = Math.max(0, (ch.hits || 0) + n); b.fx[ch.id] = 'mutate'; return 1; }
    case 'power': { const n = A.n ?? 1; if (immuneTo(ch, buff(n))) return 0; ch.power = Math.max(0, (ch.power || 0) + n); b.fx[ch.id] = 'mutate'; return 1; }
    case 'become': { const to = A.chip || 'std'; if (lastsOf(ch) === 'match' || ch.kind === 'debt') return 0;
      if (MADE_CHIPS[to]) { const m = mkMade(b, to); Object.assign(ch, { kind: 'made', model: to, value: m.value, hits: m.hits, life: m.life, name: m.name }); }
      else { for (const k of ['model', 'name', 'life', 'hits', 'power']) delete ch[k]; ch.kind = to; if (to === 'block' || to === 'counter') ch.value = 0; if (HAZARD_LIFE[to]) { ch.value = 0; ch.life = HAZARD_LIFE[to]; } }
      b.fx[ch.id] = 'mutate'; return 1; }
    default: return 0;
  }
  void M;
}
// A Block or Counter chip in a stack on the other side stops one of a made chip's actions there (and is used up),
// unless the made chip is immune to blocking: then the Block chip is ignored and the action applies.
function blockedBy(b, s, tg, M) {
  const side = tg.x.side || s; if (side === s || lastsOfModel(M) === 'match' || (M.immune || []).includes('blocks')) return false;
  const cell = tg.x.cell, i = cell.chips.findIndex((ch) => ch.kind === 'block' || ch.kind === 'counter'); if (i < 0) return false;
  const sh = cell.chips[i]; cell.chips.splice(i, 1); b.fx[sh.id] = 'void'; return true;
}
const lastsOfModel = (M) => M.lasts;
// one made chip's triggered work: its actions on everything its reach covers
function fire(b, s, at, M) { let n = 0; const list = reachOf(b, s, at, M);
  for (const A of M.actions || []) { if (A.k === 'pull') { n += pullTo(b, s, at, A); continue; }
    if (A.k === 'fx') { if (at.ch.spent || !FX[A.fx]) continue; at.ch.spent = true; // laid by something other than a trick: it works for the Roller it was laid for, on the space it sits on
      const me = b.sides[at.ch.by ?? s.idx], x = { b, s: me, o: b.sides[1 - me.idx], t: s, cells: [{ r: at.r, c: at.c }], total: Math.max(1, at.ch.power || M.value || 1), bonus: null, e: null, origin: { side: s.idx, r: at.r, c: at.c }, tag: M.name, by: A.by, make: null };
      for (const st of FX[A.fx](x)) void st; n++; continue; }
    if (A.k === 'move' && A.how && A.how !== 'hop') { n += moveStacks(b, s, at, A, list); continue; } // slides, lifts and slips work on stacks
    if (A.n === 'share') { // the amount it was made with, handed out 1 at a time round the chips it reaches that can take it
      const takers = list.filter((tg) => !blockedBy(b, s, tg, M) && (A.k !== 'value' || isPayable(tg.ch) || tg.ch.kind === 'made'));
      for (let k = 0; k < (at.ch.power || 0) && takers.length; k++) n += act(b, s, { ...A, n: 1 }, takers[k % takers.length], M);
      continue; }
    for (const tg of list) { if (blockedBy(b, s, tg, M)) continue; n += act(b, s, A, tg, M); } }
  return { n, refs: [...new Set(list.map((tg) => tg.x))].map((x) => ref(x.side || s, x.r, x.c)) }; }
// a made chip's Pull action: up to A.n¢ of real chips out of a Pit (A.from: mine, theirs or both), onto the chip's
// stack under it, then the Bet; what finds no room goes back
function pullTo(b, s, at, A) {
  const n = A.n === 'power' ? Math.max(1, at.ch.power || 1) : Math.max(1, A.n ?? 1), from = A.from || 'mine', o = 1 - s.idx, side = new Map(); // 'power': as much as the roll it was made with
  const take = (si, amt) => { for (const ch of pullPit(b, si, amt, { bids: !!A.bids })) side.set(ch, si); };
  if (from !== 'theirs') take(s.idx, n);
  if (from !== 'mine') take(o, n - sum([...side.keys()], (ch) => ch.value));
  const rest = []; for (const ch of side.keys()) { if (!at.cell.hole && capacityLeft(s, at.cell) > 0) { at.cell.chips.splice(Math.max(0, at.cell.chips.indexOf(at.ch)), 0, ch); b.fx[ch.id] = 'from-pit'; } else rest.push(ch); }
  const left = rest.length ? addToMeter(b, s, rest, { r: at.r, c: at.c }, 'from-pit') : [];
  for (const ch of left) backToPit(b, side.get(ch), [ch]);
  return side.size - left.length;
}
// where a creature chip heads: a space next to it, one step toward its goal
function creatureStep(b, s, at, M) {
  const others = allCells(s).filter((x) => x.cell !== at.cell && !x.cell.hole && !x.cell.link);
  const dist = (x) => Math.abs(x.r - at.r) + Math.abs(x.c - at.c);
  const score = { nearest: (x) => (solidCount(x.cell) ? -dist(x) : -Infinity), tallest: (x) => solidCount(x.cell), richest: (x) => cellWorth(x.cell), poorest: (x) => (solidCount(x.cell) ? -cellWorth(x.cell) : -Infinity),
    threat: (x) => x.cell.chips.filter(isHazard).length + debtOf(x.cell), effect: (x) => x.cell.chips.filter((ch) => ch.kind === 'made' || isFx(ch)).length, empty: (x) => (solidCount(x.cell) ? -Infinity : -dist(x)) }[M.move];
  if (!score || !others.length) return null;
  const goal = others.reduce((best, x) => (score(x) > score(best) || (score(x) === score(best) && dist(x) < dist(best)) ? x : best), others[0]);
  if (score(goal) === -Infinity) return null;
  return [Math.sign(goal.r - at.r), Math.sign(goal.c - at.c)];
}
function moveByRule(b, s, at, M) {
  if (immuneTo(at.ch, 'moves')) return false;
  if (['nearest', 'tallest', 'richest', 'poorest', 'threat', 'effect', 'empty'].includes(M.move)) { const st = creatureStep(b, s, at, M); return st ? moveChip(b, s, at, at.ch, st[0], st[1]) || (st[0] && st[1] ? moveChip(b, s, at, at.ch, st[0], 0) || moveChip(b, s, at, at.ch, 0, st[1]) : false) : false; }
  if (M.move === 'jumping') { const opts = b.rng.shuffle([[0, 1], [0, -1], [1, 0], [-1, 0]]); return opts.some(([dr, dc]) => moveChip(b, s, at, at.ch, dr, dc)); }
  if (M.move === 'shifting') return moveChip(b, s, at, at.ch, 0, 1) || moveChip(b, s, at, at.ch, 0, -1);
  if (M.move === 'advancing') return moveChip(b, s, at, at.ch, -1, 0);
  if (M.move === 'retreating') return moveChip(b, s, at, at.ch, 1, 0);
  if (M.move === 'spreading') { // a copy of itself on a neighbouring stack that does not have one
    const nb = allCells(s).filter((x) => Math.abs(x.r - at.r) + Math.abs(x.c - at.c) === 1 && solidCount(x.cell) && capacityLeft(s, x.cell) > 0 && !x.cell.chips.some((ch) => ch.model === at.ch.model));
    if (!nb.length) return false; const x = b.rng.pick(nb), cp = mkMade(b, at.ch.model); if (!placeMade(x.cell, cp, 'over')) return false; b.fx[cp.id] = 'spawn'; return true; }
  return false;
}
function* madeWork(b, s, when, tricksPlayed) {
  const has = (M, on) => (M.triggers || []).some((tg) => tg.on === on && (on !== 'phase' && on !== 'effect' ? true : !tg.type || tg.type === when));
  const mine = () => allCells(s).flatMap((x) => x.cell.chips.map((ch, i) => ({ ...x, i, ch }))).filter((y) => y.ch.kind === 'made' && madeOf(y.ch));
  const said = [];
  // made this phase
  for (const id of s.madeNew || []) { const at = findMade(s, id); if (!at) continue; const M = madeOf(at.ch); if (has(M, 'created')) { const f = fire(b, s, at, M); if (f.n) said.push({ M, f, why: 'made' }); } }
  s.madeNew = [];
  if (when !== 'turn') for (const at of mine()) { const M = madeOf(at.ch);
    if (has(M, 'phase') || (tricksPlayed && has(M, 'effect'))) { const f = fire(b, s, at, M); if (f.n) said.push({ M, f, why: TYPES[when]?.name || when }); } }
  if (when === 'turn') {
    // removed since last turn, and newly exposed on top
    const now = new Map(mine().map((at) => [at.ch.id, at])), last = s.madeSeen || new Map();
    for (const [id, was] of last) if (!now.has(id)) { const M = MADE_CHIPS[was.model]; const cell = s.grid[was.r]?.[was.c];
      if (M && cell && (M.triggers || []).some((tg) => tg.on === 'removed')) { const f = fire(b, s, { r: was.r, c: was.c, cell, i: -1, ch: { id, kind: 'made', model: was.model } }, M); if (f.n) said.push({ M, f, why: 'removed' }); } }
    const tops = new Set(allCells(s).map((x) => topNon(x.cell)).filter(Boolean)), lastTops = s.topsSeen || new Set(), exposed = [...tops].filter((ch) => !lastTops.has(ch.id));
    for (const at of mine()) { const M = madeOf(at.ch);
      if (has(M, 'turn')) { const f = fire(b, s, at, M); if (f.n) said.push({ M, f, why: 'turn' }); }
      const w = (M.triggers || []).find((tg) => tg.on === 'exposed');
      if (w && exposed.some((ch) => !w.what || nameOfChip(ch).toLowerCase() === String(w.what).toLowerCase() || ch.kind === w.what || ch.model === w.what)) { const f = fire(b, s, at, M); if (f.n) said.push({ M, f, why: 'exposed' }); } }
    let moved = 0; for (const at of mine()) { const M = madeOf(at.ch); if (M.move && M.move !== 'still' && !['anchored', 'flying', 'toTop', 'toBottom'].includes(M.move)) { const at2 = findMade(s, at.ch.id); if (at2 && moveByRule(b, s, at2, M)) moved++; } }
    if (moved) said.push({ M: { name: tx('feed.made-2', { moved }) }, f: { n: moved, refs: [] }, why: 'move' });
    s.madeSeen = new Map(mine().map((at) => [at.ch.id, { r: at.r, c: at.c, model: at.ch.model }]));
    s.topsSeen = new Set(allCells(s).map((x) => topNon(x.cell)?.id).filter(Boolean));
  }
  for (const x of said) yield step(b, x.why === 'move' ? tx('feed.in-s-position-2', { name: x.M.name, n: x.f.n, name2: s.name }) : tx('feed.s-works-on', { name: s.name, name2: x.M.name, why: x.why, n: x.f.n }), x.f.refs, 'familiar');
}

// ---------- effect chips at work ----------
// Effect chips (made by maker tricks, or brought from the shop in an old save) do their work in the phase of the
// trick type they belong to: Power, Control and Lucky in the Investment phase, Harmony in the Correction phase.
// (Reducer, Ward, Rebound, Zap, Anchor, Transpara and Shadow work when a fee or a move reaches them; Boosted,
// Cheapened and Upgrade when you roll; Mimic after each phase's tricks.)
const CHIP_PHASE = { power: 'investment', control: 'investment', lucky: 'investment', harmony: 'correction' };
const chipsAt = (s, id) => allCells(s).flatMap((x) => x.cell.chips.filter((ch) => ch.resist === id).map((ch) => ({ ...x, ch })));
export const chipWorkIn = (s, type) => Object.keys(CHIP_PHASE).some((id) => CHIP_PHASE[id] === type && chipsAt(s, id).length);
function* chipPhase(b, s, type) {
  const o = b.sides[1 - s.idx];
  if (type === 'investment') {
    const pw = chipsAt(s, 'power'), ct = chipsAt(s, 'control'), lk = chipsAt(s, 'lucky');
    const fresh = pw.filter((x) => !x.ch.on); for (const x of fresh) x.ch.on = true;
    if (fresh.length) { const n = fresh.length * (shopVars('power').boost || 1); s.mods.boost += n; yield step(b, tx('feed.s-power-roll-effects', { name: s.name, freshN: fresh.length, n }), fresh.map((x) => ref(s, x.r, x.c)), 'bonus'); }
    if (ct.length) { const n = ct.length * (shopVars('control').enfeeble || 1); o.mods.enfeeble += n; yield step(b, tx('feed.s-control-s-roll', { name: s.name, ctN: ct.length, name2: o.name, n }), ct.map((x) => ref(s, x.r, x.c)), 'bonus'); }
    if (lk.length) { let luck = 0; for (let k = 0; k < lk.length; k++) if (b.rng.chance(shopVars('lucky').chance)) luck++;
      const left = luck ? addToMeter(b, s, Array.from({ length: luck }, () => mkChip(b, 'opp', 1)), null, 'spawn') : [];
      if (luck) yield step(b, tx('feed.s-lucky-chip-up', { name: s.name, v: lk.length > 1 ? 's turn' : ' turns', luck, overText: overText(left) }), lk.map((x) => ref(s, x.r, x.c)), 'bonus'); }
  }
  if (type === 'correction') { // Harmony clears hazards nearby, leaving a 1¢ chip in place of a hazard chip
    let cleared = 0; const calm = [];
    for (const { r, c, cell } of allCells(s)) for (let k = 0; k < shopCount(cell, 'harmony') * (shopVars('harmony').per || 1); k++) {
      const near = [{ r, c, cell }, ...around(s, r, c)];
      const hz = near.find((x) => x.cell.chips.some((ch) => (isHazard(ch) && ch.kind !== 'debt' && ch.kind !== 'hard') || ch.kind === 'dynamite'));
      if (hz) { const ch = hz.cell.chips.find((x) => (isHazard(x) && x.kind !== 'debt' && x.kind !== 'hard') || x.kind === 'dynamite'); hz.cell.chips.splice(hz.cell.chips.indexOf(ch), 1); b.fx[ch.id] = 'void';
        if (capacityLeft(s, hz.cell) > 0 && solidCount(hz.cell)) pushChip(hz.cell, mkChip(b, 'std', 1)); cleared++; calm.push(ref(s, hz.r, hz.c)); continue; }
      const dx = near.find((x) => debtOf(x.cell) > 0); if (dx) { setDebt(b, dx.cell, debtOf(dx.cell) - 1); cleared++; calm.push(ref(s, dx.r, dx.c)); }
    }
    if (cleared) yield step(b, tx('feed.s-harmony-chip', { name: s.name, v: cleared > 1 ? 's clear' : ' clears', cleared }), calm, 'familiar');
  }
}

// the phase a trick plays in: its type, unless it is Swift (`early`)
export const phaseOf = (id) => TRICKS[id].early || TRICKS[id].type;
// Each trick of this type plays. A Forgetter on the opponent negates a trick whose dice total its count; a Repeater
// on your side plays a trick whose dice total its count again; each Mimic on top plays one of them again.
// The spaces a play reaches, as { side, r, c } keys
function reach(b, s, e) {
  const def = TRICKS[e.trick.id]; if (!e.target || def.approach === 'none') return [];
  const t = b.sides[e.target.side]; return affected(b, t, def, e.target, e.dice.length).map((x) => `${t.idx}:${x.r}:${x.c}`);
}
// Plays that reach a space the other Roller's play in the same phase also reaches, when the space is the player's own:
// the owner of a contested space plays on it first.
export function ownerFirst(b, plays) {
  const out = new Set(), R = plays.map((p) => ({ ...p, keys: new Set(reach(b, p.s, p.e)) }));
  for (const x of R) for (const y of R) if (x.s !== y.s) for (const k of x.keys) if (y.keys.has(k) && +k.split(':')[0] === x.s.idx) out.add(x.e);
  return out;
}
function* sidePhase(b, s, type, cx, keep = () => true, firstPass = false) {
  const o = b.sides[1 - s.idx], done = [];
  for (const e of s.run.filter((x) => x.state === 'play' && phaseOf(x.trick.id) === type && keep(x))) {
    cx.uid = e.uid; const roll = e.dice.length ? sum(e.dice, (d) => d.value) : null;
    const fg = roll != null && tops(o, 'forgetter').find((x) => x.n === roll && (o.forgotUsed[x.ch.id] || 0) < 1 + x.charge);
    if (fg) o.forgotUsed[fg.ch.id] = (o.forgotUsed[fg.ch.id] || 0) + 1;
    yield* play(b, s, e, { forgotten: !!fg });
    if (roll == null || fg) continue; done.push(e);
    for (const rp of tops(s, 'repeater').filter((x) => x.n === roll)) for (let k = 0; k <= rp.charge; k++) yield* play(b, s, e, { again: 'Repeater' });
  }
  if (firstPass) return; // Mimics and lingering made tricks play once, with the rest
  for (const mm of tops(s, 'mimic')) { void mm; if (!done.length) break; const e = b.rng.pick(done); cx.uid = e.uid; yield* play(b, s, e, { again: 'Mimic' }); }
  for (const ec of s.echoes.filter((x) => x.phase === type && x.from !== b.turn)) { // lingering made tricks play again with the same roll
    cx.uid = ec.e.uid; yield* play(b, s, ec.e, { again: 'Lingering' }); ec.left--; }
  s.echoes = s.echoes.filter((x) => x.left > 0);
}
// a bid goes to the House: into the Pit as it was; a Debt marker is simply cleared
function payBid(b, s, ch) { delete ch.from; if (ch.kind === 'debt') { b.fx[ch.id] = 'void'; return; } b.fx[ch.id] = 'house'; toPit(b, s.idx, ch, 'bid'); }
export function* resolve(b) {
  b.phase = 'resolve';
  // bids go to the House; a stack of copies of a trick plays one copy a turn, so it lingers a turn per copy under the top
  let any = false;
  for (const s of b.sides) for (const e of s.run) if (e.state === 'bid') {
    e.lingerLeft = (e.stack || []).length; e.state = 'play';
    e.trick.wear = Math.max(0, (e.trick.wear ?? WEAR.good) - 1); // each play wears the trick (its condition, not its power)
    for (const ch of e.bid) payBid(b, s, ch); e.paid = e.bid.map(bidVal); s.bidsPaid += Math.max(0, e.bidValue); e.bid = []; any = true;
  }
  // chips bid on tapped tricks go to the House with the rest; the tricks come back when the turn's restore is called
  for (const s of b.sides) for (const x of s.revive || []) { payBid(b, s, x.ch); s.bidsPaid += Math.max(0, bidVal(x.ch)); x.paid = true; any = true; }
  b.ctx = { phase: 'bids' };
  if (any) yield step(b, tx('feed.the-house-collects-the'), [], 'bid');
  const plays = []; for (const s of b.sides) for (const e of s.run) if (e.state === 'play') plays.push({ s, e });
  // Each phase is played for both Rollers at once. What a trick is worth is read from the table as it
  // stood when the phase was called, so neither Roller's play changes the other's in the same phase.
  for (const type of Object.keys(TYPES).sort((x, y) => TYPES[x].order - TYPES[y].order)) {
    if (!plays.some((p) => phaseOf(p.e.trick.id) === type) && !b.sides.some((s) => chipWorkIn(s, type) || heldIn(s, type).length) && !actingIn(b, type).length) continue;
    b.ctx = { phase: type }; yield step(b, tx('feed.the-house-calls-s', { name: TYPES[type].name }), [], 'phase');
    if (b.sides.some((s) => heldIn(s, type).length)) yield* zip(b, b.sides.map((s) => deployHeld(b, s, type)), b.sides.map((s) => ({ phase: type, who: s.idx }))); // the held rewards go out
    if (b.sides.some((s) => chipWorkIn(s, type))) yield* zip(b, b.sides.map((s) => chipPhase(b, s, type)), b.sides.map((s) => ({ phase: type, who: s.idx })));
    for (const s of b.sides) s.fz = { ...s.mods };
    // a space both Rollers' tricks reach: its owner's trick plays (and resolves) first, then the rest play together
    const first = ownerFirst(b, plays.filter((p) => phaseOf(p.e.trick.id) === type));
    if (first.size) { const c1 = b.sides.map((s) => ({ phase: type, who: s.idx, uid: null })); yield* zip(b, b.sides.map((s, i) => sidePhase(b, s, type, c1[i], (e) => first.has(e), true)), c1); }
    const cxs = b.sides.map((s) => ({ phase: type, who: s.idx, uid: null }));
    yield* zip(b, b.sides.map((s, i) => sidePhase(b, s, type, cxs[i], (e) => !first.has(e))), cxs);
    if (actingIn(b, type).length) yield* creaturePhase(b, type); // then the creatures whose action is of this type
    if (type === 'expense' && b.sides.some(anyDue)) { b.ctx = { phase: type }; yield step(b, tx('feed.the-house-settles-the'), [], 'settle'); yield* settleAll(b, type); }
    for (const s of b.sides) { b.ctx = { phase: type, who: s.idx }; yield* madeWork(b, s, type, plays.some((p) => p.s === s && phaseOf(p.e.trick.id) === type)); }
  }
  for (const s of b.sides) s.fz = null;
  b.ctx = { phase: 'house' };
  // finished tricks and their dice tap: they wait in the tapped piles until restored (flipped chips still come home)
  let done = 0; const at = b.tapClock = (b.tapClock || 0) + 1; // one stamp for everything tapped in this action
  for (const { s, e } of plays) {
    delete e.trick.base; // a base effect lasts one play
    s.tapped.tricks.push({ trick: e.trick, at }); done++; // the copy that played taps
    if (e.stack?.length) { e.trick = e.stack.shift(); e.lingerLeft = e.stack.length; continue; } // the next copy plays next turn, with the same roll and target
    s.run.splice(s.run.indexOf(e), 1);
    for (const d of e.dice) homeDie(b, s, d, at);
  }
  if (done) yield step(b, '', [], 'return');
  for (const s of b.sides) { b.ctx = { phase: 'house', who: s.idx }; yield* madeWork(b, s, 'turn', false); }
  for (const s of b.sides) { b.ctx = { phase: 'house', who: s.idx }; yield* bossPhase(b, s); }
  yield* ticks(b);
  b.ctx = { phase: 'house' };
  // who is broke?
  for (const s of b.sides) if (worth(s) <= 0 && s.interventions > 0 && b.stage.paid[s.idx] > 0) {
    s.interventions--; s.intervened = true;
    for (const { cell } of allCells(s)) for (const ch of cell.chips.filter(isHazard)) { cell.chips.splice(cell.chips.indexOf(ch), 1); b.fx[ch.id] = 'void'; }
    const share = Math.min(1, 0.5 + gainShare(b, s)), chips = makeChange(b, Math.round(b.stage.paid[s.idx] * share)); let back = 0;
    for (const ch of chips) { const spot = allCells(s).reverse().find((x) => capacityLeft(s, x.cell) > 0); if (!spot) break; spot.cell.chips.push(ch); b.fx[ch.id] = 'from-stage'; back += ch.value; }
    b.stage.paid[s.idx] -= back;
    yield step(b, tx('feed.intervention-of-s-fees', { back, name: s.name }), [], 'bonus');
  }
  for (const s of b.sides) {
    tidyFeet(s); for (const { cell } of allCells(s)) bind(b, cell); // sticky chips bind to the chips they touch
    const st = s.status; st.resist = st.resistNext; st.resistNext = 0; st.evade = st.evadeNext; st.evadeNext = null; st.reflect = 0; st.reflectAll = false;
    for (const { cell } of allCells(s)) {
      if (!stuck(cell, 'hard')) for (const h0 of cell.chips.filter((ch) => ch.kind === 'hard')) if (--h0.life <= 0) { cell.chips.splice(cell.chips.indexOf(h0), 1); b.fx[h0.id] = 'void'; }
      for (const m0 of cell.chips.filter((ch) => lastsOf(ch) === 'turn' || (ch.kind === 'made' && lastsOf(ch) === 'turns'))) if (lastsOf(m0) === 'turn' || --m0.life <= 0) { cell.chips.splice(cell.chips.indexOf(m0), 1); b.fx[m0.id] = 'void'; } // made chips run out
      for (const f0 of cell.chips.filter((ch) => isFx(ch) && ch.life < 99)) if (--f0.life <= 0) { cell.chips.splice(cell.chips.indexOf(f0), 1); b.fx[f0.id] = 'void'; } // effect chips wear off
      emptyOut(b, cell);
      for (const ch of cell.chips) { if (ch.feather > 0 && !stuck(cell, 'feather')) ch.feather--; if (ch.regen > 0 && !stuck(cell, 'regen') && --ch.regen <= 0) delete ch.regen; }
    }
  }
  b.ctx = { phase: 'house' };
  yield* restorePhase(b);
  for (const s of b.sides) { b.ctx = { phase: 'house', who: s.idx }; yield* traitTurn(b, s); }
  b.ctx = { phase: 'house' };
  const w = b.sides.map(worth);
  if (!b.rules.sandbox && (w[0] <= 0 || w[1] <= 0 || b.turn >= b.rules.maxTurns)) { // a sandbox bout (test table) runs until you leave it
    b.over = true; b.winner = w[0] > w[1] ? 0 : 1; b.timeout = w[0] > 0 && w[1] > 0;
    yield step(b, b.timeout ? tx('feed.last-call-holds-the', { name: b.sides[b.winner].name }) : tx('feed.is-broke-wins-the', { name: b.sides[1 - b.winner].name, name2: b.sides[b.winner].name }), [], 'over');
    return;
  }
  b.phase = 'drink'; for (const s of b.sides) { s.sipped = 0; s.ate = false; } b.ctx = null; openPhase(b);
  yield step(b, '', [], 'drink');
}

// ---------- effect chips ----------
// Every effect, investment and tilt at work on a Roller, as a chip lying on their table. `size` is how many spaces
// square it covers: effects on one thing are 1, effects on every roll effect are 2, effects on the whole position
// are 3. Only chips of the same size stack together. `zone`: the Bet for help, the Stake for harm.
const STAT_SHORT = { trickery: 'Draw', ingenuity: 'Bid', proficiency: 'Roll', charisma: 'Steal', cunning: 'Opp', conviction: 'Power' };
export function effectChips(b, s) {
  const out = [], add = (key, name, glyph, value, size, good, text) => out.push({ key, name, glyph, value, size, zone: good ? 'meter' : 'bar', good, text });
  const m = s.mods, st = s.status;
  if (m.boost) add('boost', 'Boost', '↑', m.boost, 2, true, 'Every other roll effect this turn gains this much.');
  if (m.press) add('press', 'Press', '⇶', m.press, 2, true, 'Your Expenses this turn gain this much and pierce.');
  else if (m.pierce) add('pierce', 'Pierce', '➹', '', 2, true, 'Your Expenses this turn ignore Block chips, Resist and Hardened stacks.');
  if (m.bend != null) add('bend', 'Bend', '∿', m.bend, 2, true, 'Every die on these played tricks counts as this.');
  if (m.mul && m.mul !== 1) add('parlay', 'Parlay', m.mul > 1 ? '×2' : '½', '', 2, m.mul > 1, `Your other roll effects this turn are ${m.mul > 1 ? 'doubled' : 'halved'}.`);
  if (m.enfeeble) add('enfeeble', 'Enfeebled', '↓', m.enfeeble, 2, false, 'Every roll effect this turn loses this much.');
  if (m.subdued) add('subdued', 'Subdued', '⊖', '', 2, false, 'Your boosts this turn were subdued to nothing by your opponent\'s Saturate.');
  if (st.enfeebleNext) add('enfeeble-next', 'Enfeebled next turn', '↓', st.enfeebleNext, 2, false, 'Next turn every roll effect loses this much.');
  if (st.resist) add('resist', 'Resist', '⛉', st.resist, 3, true, 'Every fee charged to this position is reduced by this much.');
  if (st.evade != null) add('evade', 'Evade', '〰', st.evade, 3, true, 'Any fee larger than this misses the position.');
  if (st.reflect) add('reflect', 'Reflect', '◑', st.reflect, 3, true, `Up to this much of ${st.reflectAll ? 'every fee' : 'the next fee'} is sent back.`);
  if (st.resistNext) add('resist-next', 'Resist next turn', '⛉', st.resistNext, 3, true, 'Endure\'s bonus: next turn every fee charged here is reduced by this much.');
  if (st.evadeNext != null) add('evade-next', 'Evade next turn', '〰', st.evadeNext, 3, true, 'Hop\'s bonus: next turn any fee larger than this misses.');
  for (const [k, v] of Object.entries(s.turnBonus || {})) if (v) add('tb-' + k, `${v > 0 ? '+' : ''}${v} ${STAT_SHORT[k] || k}`, v > 0 ? '+' : '−', Math.abs(v), 1, v > 0, `This turn, from ${(s.turnSrc || []).filter((x) => x.k === k).map((x) => `${x.from} ${x.n > 0 ? '+' : ''}${x.n}`).join(', ') || 'food or drink'}.`);
  (s.food || []).forEach((f, i) => add('food-' + i, f.label || 'Food', '🍴', f.turns, 1, true, `${Object.entries(f.mods).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${STAT_SHORT[k] || k}`).join(', ')} for ${f.turns} more turn${f.turns > 1 ? 's' : ''}.`));
  if (s.familiars) add('familiar', 'Familiar', '🐾', s.familiars, 1, true, 'Clears a Debt or hazard chip each turn and may chase creatures away.');
  if (s.bees?.length) add('bees', 'Bumble Bees', '🐝', s.bees.length, 1, true, 'Familiars from your Hive: they sting creatures over your table and pollinate your Flowers into Honey.');
  if (s.cursed) add('curse', 'Curse', '☠', s.cursed, 2, false, 'Something in your pile is cursed: every turn one of Draw, Roll or Bid is 1 lower (never below 1).');
  if (spying(s)) add('spy', 'Spy', '🕵', spying(s), 1, true, 'Your opponent plays each phase first, and you see it before you commit.');
  if (s.interventions) add('intervention', 'Intervention', '✚', s.interventions, 1, true, 'Once, when you would go broke, your paid fees are restored.');
  if (s.positionTilt) add('position', 'Position', '⊞', s.positionTilt, 2, true, 'Balance, Versatility and Depth raised for this bout.');
  if (s.spawners) add('nest', 'Nest', '🪹', s.spawners, 1, false, 'Sends a creature every third turn.');
  for (const cal of new Set(s.calamities)) if (['inferno', 'audit', 'tornado'].includes(cal)) add('cal-' + cal, CALAMITIES[cal].name, { inferno: '🔥', audit: '§', tornado: '🌪' }[cal], s.calamities.filter((x) => x === cal).length, cal === 'audit' ? 2 : 3, false, CALAMITIES[cal].text);
  for (const k of Object.keys(s.tilts || {})) { const T = TILTS[k], ch = T.base || T.per ? `${Math.round(tiltRate(b, s, k) * 100)}%` : 'on', P = tiltPressure(b, s, k), pc = (x) => `${Math.round(x * 100)}%`;
    add('tilt-' + k, `${T.name} tilt`, T.kind === 'challenge' ? '⚠' : '✚', ch, 1, T.kind === 'cheat', `${T.text} ${T.base || T.per ? tx('feed.the-house-s-chance', { ch, v: T.kind === 'challenge' ? 'your' : 'your opponent\'s', pc: pc(P.total), pc2: pc(P.lost), pc3: pc(P.overkill), pc4: pc(P.fill), pc5: pc(P.value) }) : ''}`); }
  if (s.heat > 1) add('heat', 'Last call', '⏳', `×${s.heat.toFixed(2)}`, 3, false, 'Every Expense is multiplied; more each turn.');
  return out;
}

// what each side walks away with
export function summary(b, idx) {
  const s = b.sides[idx], chips = s.grid.flat().flatMap((cell) => cell.chips);
  const std = chips.filter((ch) => ch.kind === 'std');
  return {
    win: b.winner === idx, turns: b.turn, timeout: !!b.timeout,
    survivors: sum(std.filter((ch) => !ch.resist), (ch) => ch.value) + sum([...s.run.flatMap((e) => e.dice), ...s.tray], (d) => (d.chip ? d.chip.value : 0)), gold: sum(std.filter((ch) => ch.gold), (ch) => ch.value),
    resist: chips.filter((ch) => ch.shop && ch.resist && !isFx(ch)).reduce((m, ch) => { m[ch.shop] = (m[ch.shop] || 0) + (ch.n || 1); return m; }, {}), // chips made at the table stay there
    seq: sum(std.filter((ch) => ch.n > 1), (ch) => Math.max(0, ch.value - ch.n)),
    nest: chips.filter((ch) => ch.resist === 'nest' && (ch.kind === 'std' || isFx(ch))).length * (shopVars('nest').payout || 0),
    opportunity: chips.filter((ch) => ch.kind === 'opp').length,
    made: sum(chips.filter((ch) => ch.kind === 'made' && ch.value > 0), (ch) => ch.value), // every chip with a value counts back to your worth
    bounties: chips.filter((ch) => ch.kind === 'bounty').map((ch) => ({ creature: ch.creature, value: ch.value })),
    ownFees: b.stage.paid[idx], oppFees: b.stage.paid[1 - idx], bids: s.bidsPaid,
    pendingBids: sum(s.run.filter((e) => e.state === 'play'), (e) => e.bidValue) + sum(s.run.filter((e) => e.state === 'bid'), (e) => e.bidValue),
    destroyed: s.destroyed, intervened: s.intervened, dealt: s.dealt, gone: sum(goneOf(b, idx), (x) => x.value),
  };
}

// internals the tests drive directly
export const _test = { moveStacks, toPit, addToMeter, deployHeld, creaturePhase, blockedBy, madeWork, placeMade, engage, settleAll, feeShares, setDebt, ticks, play, sidePhase, growth, strike, water, freezeTop, newCreature, setHard, arrange, chipPhase, placeFx, addToMeter };
