// Melting, casting and forging at the Diesmith. Pure logic, no DOM. The tables are in content/dice.js.
//
// A forge melts dice into volume, then casts a new die of the chosen size. The melted materials pick the cast (one
// material: its cast; two basic materials in equal parts: a complex material; the three complex materials with the
// three secondary dyes: Diamond). Dyes are added on top. Each cast and dye rolls dice of the new size from your
// pouch; the face of the new die showing each rolled value is changed.
import { DICE, MELT, CASTS, DYES, DIAMOND, BASIC_MATS, COMPLEXITY, MATERIALS } from './data.js';
import { matOf, canMelt, facesOf, faceValue } from './dice.js';
import { t as tx } from './text.js';

const facesOfType = (type) => DICE[type].faces;
export const meltVolume = (dice) => dice.reduce((t, d) => t + facesOfType(d.type) * MELT.meltPerFace, 0);
export const castNeed = (type) => facesOfType(type) * MELT.castPerFace;
// the cast a set of melted materials makes, or null
export function castFor(mats) {
  const key = [...new Set(mats)].sort().join('+');
  return Object.keys(CASTS).find((k) => CASTS[k].mats.slice().sort().join('+') === key) || null;
}
// the material a cast's die comes out as
export const castOut = (castKey) => CASTS[castKey]?.out || CASTS[castKey]?.mats[0] || BASIC_MATS[0];
// whether a kind of mixing is open on this floor (MELT.unlock); no floor given means open
export const mixOpen = (tier, floor) => !tier || floor == null || floor >= (MELT.unlock?.[tier] ?? 1);
// volume melted per material
export const volumes = (dice) => { const v = {}; for (const d of dice) v[matOf(d)] = (v[matOf(d)] || 0) + facesOfType(d.type) * MELT.meltPerFace; return v; };

// The dyes as they play. Two different primaries mix into their secondary when mixing is open; the pairing that
// makes the most different secondaries wins (so Red, Red, Yellow, Yellow, Blue, Blue gives Orange, Purple, Green).
export function mixDyes(primaries = [], canMix = true) {
  if (!canMix) return [...primaries];
  let best = null;
  const go = (left, out) => {
    if (!left.length) { const score = out.filter((k) => DYES[k].from).length * 100 + new Set(out).size; if (!best || score > best.score) best = { score, out }; return; }
    const [a, ...rest] = left;
    rest.forEach((b, j) => { const m = mixOf(a, b); if (m) go(rest.filter((_, k) => k !== j), [...out, m]); });
    go(rest, [...out, a]);
  };
  go(primaries.slice(0, 8), []);
  return [...(best?.out || []), ...primaries.slice(8)];
}
export const mixOf = (a, b) => Object.keys(DYES).find((k) => DYES[k].from && DYES[k].from.includes(a) && DYES[k].from.includes(b) && a !== b) || null;
export const dyePrice = (primaries = []) => primaries.reduce((t, k) => t + (DYES[k]?.price || 0), 0);

// Everything about a forge before it happens. o: { type, melt: [dice], dyes: [primary ids], floor?, pouch? }
// Returns { why (null if it can go), castKey, played (the dyes as they play), reqs (the rolls: [{ mat|null, for }]),
// rolled (pouch dice for each roll, or null where none is spare) }.
export function forgePlan(o) {
  const out = { why: null, castKey: null, played: [], reqs: [], rolled: [] }, no = (why) => { out.why = out.why || why; return out; };
  if (!COMPLEXITY.includes(o.type)) return no(tx('forge.the-diesmith-does-not', { type: o.type }));
  if (!o.melt.length) return no(tx('forge.pick-dice-to-melt'));
  const bad = o.melt.find((d) => !canMelt(d)); if (bad) return no(tx('floor.dice-cannot-be-melted', { name: MATERIALS[matOf(bad)].name }));
  const ck = out.castKey = castFor(o.melt.map(matOf)), C = CASTS[ck];
  if (!C) return no(o.melt.some((d) => MATERIALS[matOf(d)]?.complex) ? tx('forge.comple-dice-only-melt') : tx('forge.those-materials-do-not'));
  if (!mixOpen(C.unlock, o.floor)) return no(tx('forge.opens-on-floor', { v: C.unlock === 'complex' ? tx('forge.diamond-casting') : tx('forge.mixing-materials'), unlock: MELT.unlock[C.unlock] }));
  const vol = volumes(o.melt), total = meltVolume(o.melt);
  if (MELT.evenMix && C.mats.length > 1 && new Set(C.mats.map((m) => vol[m])).size > 1) return no(tx('forge.a-mi-needs-the', { join: C.mats.map((m) => `${MATERIALS[m].name} ${vol[m] || 0}`).join(', ') }));
  if (total < castNeed(o.type)) return no(tx('forge.a-needs-volume-that', { type: o.type, castNeed: castNeed(o.type), total }));
  const dyes = o.dyes || [];
  if (dyes.some((k) => !DYES[k] || DYES[k].from)) return no(tx('forge.add-primary-dyes-two'));
  const played = out.played = mixDyes(dyes, mixOpen('mix', o.floor));
  if (C.needs) {
    if (C.needs.slice().sort().join() !== played.slice().sort().join()) return no(tx('forge.a-diamond-takes-exactly', { join: C.needs.map((k) => DYES[k].name).join(', ') }));
  } else {
    if (played.some((k) => DYES[k].from) && !mixOpen('mix', o.floor)) return no(tx('forge.dye-mixing-opens-on', { mix: MELT.unlock.mix }));
    if (played.length > MELT.maxDyes) return no(tx('forge.at-most-dyes-or', { maxDyes: MELT.maxDyes }));
  }
  // the rolls: one die of each cast material, then the dyes' dice (any material)
  out.reqs = [...C.mats.map((m) => ({ mat: m, for: ck })), ...played.flatMap((k) => Array.from({ length: C.needs ? 1 : DYES[k].dice }, () => ({ mat: null, for: k })))];
  if (MELT.castFromPouch && o.pouch) {
    out.rolled = assignRolls(o.pouch, o.type, o.melt, out.reqs);
    const short = out.reqs.filter((_, i) => !out.rolled[i]);
    if (short.length) return no(tx('forge.the-cast-rolls-s', { type: o.type, join: short.map((q) => (q.mat ? MATERIALS[q.mat].name : 'any')).join(', ') }));
  }
  return out;
}
// the pouch dice for each roll: the new size, never Bone or the dice being melted, plainest first; a roll that
// needs a material takes a die of it, the rest take any
export function assignRolls(pouch, type, melt, reqs) {
  const plain = (d) => facesOf(d).filter((f, i) => faceValue(f) !== i + 1).length + (d.up ? 10 : 0);
  const free = pouch.filter((d) => d.type === type && canMelt(d) && !melt.includes(d)).sort((a, b) => plain(a) - plain(b)), got = reqs.map(() => null);
  reqs.forEach((q, i) => { if (!q.mat) return; const j = free.findIndex((d) => matOf(d) === q.mat); if (j >= 0) got[i] = free.splice(j, 1)[0]; });
  reqs.forEach((q, i) => { if (q.mat) return; const j = free.findIndex((d) => !CASTS_MAT_NEEDED(reqs, got, d)); if (j >= 0) got[i] = free.splice(j, 1)[0]; });
  return got;
}
// keep a die back for a material roll that is still unfilled
const CASTS_MAT_NEEDED = (reqs, got, d) => reqs.some((q, i) => q.mat && !got[i] && matOf(d) === q.mat);
// Why this forge cannot happen, or null.
export const forgeBlock = (o) => forgePlan(o).why;

// ---------- the face changes ----------
const mean = (fs) => fs.reduce((t, v) => t + v, 0) / fs.length;
const at = (fs, v, not = -1) => { const i = fs.findIndex((x, k) => x === v && k !== not); return i; };
function one(fx, fs, i) {
  const n = fs.length;
  switch (fx) {
    case 'flip': fs[i] = fs[n - 1 - i]; break;
    case 'nullify': fs[i] = 0; break;
    case 'lucky': fs[i] = MELT.lucky; break;
    case 'down': fs[i] = Math.max(0, fs[i] - 1); break;
    case 'up': fs[i] += 1; break;
    case 'even': { const m = mean(fs); if (fs[i] < m) fs[i] += 1; else if (fs[i] > m) fs[i] -= 1; break; }
    default: break;
  }
}
// apply a one- or two-die effect for the rolled values; returns what changed, for the log
function apply(fx, fs, rolls, pair, rng) {
  const before = fs.slice();
  if (rolls.length === 1) { const i = at(fs, rolls[0]); if (i < 0) return { missed: true }; one(fx, fs, i); return { faces: [i], before, after: fs.slice() }; }
  const hi = Math.max(...rolls), lo = Math.min(...rolls), iH = at(fs, hi), iL = at(fs, lo, iH);
  if (fx === 'swirl') { // both rolled faces take one value left over on the die, at random: it then shows three times
    if (iH < 0 || iL < 0) return { missed: true };
    const left = fs.filter((_, i) => i !== iH && i !== iL); if (!left.length) return { missed: true };
    const v = left[rng ? rng.int(left.length) : 0]; fs[iH] = v; fs[iL] = v; return { faces: [iH, iL], before, after: fs.slice() }; }
  if (fx === 'reconfigure-low') { if (iH < 0 && iL < 0) return { missed: true }; if (iH >= 0) fs[iH] = hi - lo; if (iL >= 0) fs[iL] = hi + lo; return { faces: [iH, iL].filter((i) => i >= 0), before, after: fs.slice() }; }
  if (iH < 0 && iL < 0) return { missed: true };
  if (fx === 'pair') { if (iH >= 0) one(pair[0], fs, iH); if (iL >= 0) one(pair[1], fs, iL); return { faces: [iH, iL].filter((i) => i >= 0), before, after: fs.slice() }; }
  if (iH < 0 || iL < 0) return { missed: true }; // two-face mixes need both faces
  if (fx === 'reconfigure') { fs[iH] = hi + lo; fs[iL] = hi - lo; }
  else if (fx === 'add') fs[iL] = hi + lo;
  else if (fx === 'subtract') fs[iH] = hi - lo;
  return { faces: [iH, iL], before, after: fs.slice() };
}

// Diamond: what pattern six dice make (see DIAMOND), and the faces it gives a die of n faces
export function diamondPattern(rolls, n) {
  const count = {}; for (const v of rolls) count[v] = (count[v] || 0) + 1;
  const groups = Object.entries(count).map(([v, c]) => ({ v: +v, c })).sort((a, b) => b.c - a.c || b.v - a.v);
  const uniq = [...new Set(rolls)].sort((a, b) => a - b);
  let run = 1, best = 1, top = uniq[0]; for (let i = 1; i < uniq.length; i++) { run = uniq[i] === uniq[i - 1] + 1 ? run + 1 : 1; if (run >= best) { best = run; top = uniq[i]; } }
  const sum = rolls.reduce((t, v) => t + v, 0), avg = rolls.length * (n + 1) / 2;
  if (groups[0].c === 6) return { id: 'yahtzee', v: groups[0].v };
  if (groups[0].c === 5) return { id: 'five', v: groups[0].v, odd: groups[1].v };
  if (groups[0].c === 3 && groups[1]?.c === 3) return { id: 'twinTriplets', a: Math.max(groups[0].v, groups[1].v), b: Math.min(groups[0].v, groups[1].v) };
  if (groups.length === 3 && groups.every((g) => g.c === 2)) return { id: 'tripleTwins', vals: groups.map((g) => g.v).sort((a, b) => a - b) };
  if (best >= 4) return { id: 'continuation', top };
  if (sum > avg) return { id: 'stretch' };
  if (sum < avg) return { id: 'smashed' };
  return null;
}
export function diamondFaces(p, fs) {
  const n = fs.length, sorted = fs.slice().sort((a, b) => a - b), m = mean(fs);
  switch (p.id) {
    case 'yahtzee': { const k = Math.max(1, Math.round(n / 6)); return fs.map((_, i) => (i >= n - k ? p.v * 6 : p.v)); }
    case 'five': return fs.map((_, i) => (i === n - 1 ? p.odd : p.v));
    case 'twinTriplets': return fs.map((_, i) => (i < Math.floor(n / 2) ? p.a - p.b : p.a + p.b));
    case 'tripleTwins': return fs.map((_, i) => p.vals[Math.floor((i * 3) / n)]);
    case 'continuation': return fs.map((_, i) => p.top + 1 + i);
    case 'stretch': { const hi = sorted.filter((v) => v > m); return hi.length ? fs.map((_, i) => hi[i % hi.length]) : fs; }
    case 'smashed': { const lo = sorted.filter((v) => v < m); return lo.length ? fs.map((_, i) => lo[i % lo.length]) : fs; }
    default: return fs;
  }
}

// Cast a new die of `type`. played: the dyes as they play (see mixDyes). rolled: the dice to roll, in the order of the
// plan's rolls (each lands on one of its own faces); without them, plain rolls of the new size.
export function castFaces(rng, type, castKey, played = [], rolled = null) {
  const n = facesOfType(type), queue = rolled ? [...rolled] : null, C = CASTS[castKey];
  const one1 = (d) => { if (!d) return 1 + rng.int(n); const fs = facesOf(d); return faceValue(fs[rng.int(fs.length)]); };
  const take = (k) => Array.from({ length: k }, () => queue?.shift() || null);
  const roll = (dice) => { let rolls = dice.map(one1), again = 0;
    while (MELT.rerollDoubles && rolls.length === 2 && rolls[0] === rolls[1] && again < MELT.maxRerolls) { rolls = dice.map(one1); again++; }
    return { rolls, again }; };
  let fs = Array.from({ length: n }, (_, i) => i + 1); const log = [];
  if (C.fx === 'diamond') { // one die per material and one per secondary dye, all into one pattern
    const { rolls } = roll(take(C.mats.length + (C.needs || []).length));
    const p = diamondPattern(rolls, n), P = p && DIAMOND.find((x) => x.id === p.id);
    if (p) fs = diamondFaces(p, fs);
    log.push({ k: castKey, name: C.name, rolls, text: P ? `${P.name} (${P.when}): ${P.text}` : tx('forge.no-pattern-the-faces'), missed: !p, after: fs.slice() });
    return { faces: fs, log };
  }
  for (const [k, X, dice] of [[castKey, C, C.mats.length], ...played.map((d) => [d, DYES[d], DYES[d].dice])]) {
    const { rolls, again } = roll(take(dice));
    const r = apply(X.fx, fs, rolls, X.pair, rng), re = again ? tx('forge.rolled-again-on-doubles', { v: again === 1 ? 'once' : again + ' times' }) : '';
    log.push({ k, name: X.name, rolls, text: (r.missed ? tx('forge.no-face-shows-any', { join: rolls.join(' or ') }) : X.text) + re, missed: !!r.missed, after: fs.slice() });
  }
  return { faces: fs, log };
}
