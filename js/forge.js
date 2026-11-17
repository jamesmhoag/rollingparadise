// Melting, casting and forging at the Diesmith. Pure logic, no DOM. The tables are in content/dice.js.
//
// A forge melts dice into volume, then casts a new die of the chosen size. The melted materials pick the cast
// (one material: its cast; two: a material mix; all three: Diamond). Dyes are added on top. Each cast and dye
// rolls dice of the new die's size; the face of the new die showing each rolled value is changed.
import { DICE, MELT, CASTS, DYES, DIAMOND, BASIC_MATS, COMPLEXITY, MATERIALS } from './data.js';
import { matOf, canMelt, facesOf, faceValue } from './dice.js';

const facesOfType = (type) => DICE[type].faces;
export const meltVolume = (dice) => dice.reduce((t, d) => t + facesOfType(d.type) * MELT.meltPerFace, 0);
export const castNeed = (type) => facesOfType(type) * MELT.castPerFace;
// the cast a set of melted materials makes, or null
export function castFor(mats) {
  const key = [...new Set(mats)].sort().join('+');
  return Object.keys(CASTS).find((k) => CASTS[k].mats.slice().sort().join('+') === key) || null;
}
// the material the new die comes out as: the one with the most volume in the melt (ties go to the first listed)
export function castMaterial(dice) {
  const vol = {}; for (const d of dice) vol[matOf(d)] = (vol[matOf(d)] || 0) + facesOfType(d.type);
  return BASIC_MATS.reduce((best, m) => ((vol[m] || 0) > (vol[best] || 0) ? m : best), BASIC_MATS.find((m) => vol[m]) || BASIC_MATS[0]);
}

// Why this forge cannot happen, or null. o: { type, melt: [dice], dyes: [dye ids] }
export function forgeBlock(o) {
  if (!COMPLEXITY.includes(o.type)) return `The Diesmith does not cast ${o.type}s.`;
  if (!o.melt.length) return 'Pick dice to melt.';
  const bad = o.melt.find((d) => !canMelt(d)); if (bad) return `${MATERIALS[matOf(bad)].name} dice cannot be melted.`;
  if (!castFor(o.melt.map(matOf))) return 'Those materials do not mix.';
  if (meltVolume(o.melt) < castNeed(o.type)) return `A ${o.type} needs ${castNeed(o.type)} volume; that melts to ${meltVolume(o.melt)}.`;
  if ((o.dyes || []).some((k) => !DYES[k] || DYES[k].from)) return 'Add primary dyes; two different ones mix.';
  if (mixDyes(o.dyes || []).length > MELT.maxDyes) return `At most ${MELT.maxDyes} dyes or dye mixes in one cast.`;
  if (MELT.castFromPouch && o.pouch) { const n = rollsNeeded(castFor(o.melt.map(matOf)), o.dyes), have = rollers(o.pouch, o.type, o.melt).length;
    if (have < n) return `The cast rolls ${n} ${o.type}${n > 1 ? 's' : ''} from your pouch; you have ${have} to spare.`; }
  return null;
}

// The dyes as they play: two different primaries pair into their mix (earliest first); the rest play alone.
export function mixDyes(primaries = []) {
  const left = [...primaries], out = [];
  while (left.length) {
    const a = left.shift(), j = left.findIndex((b) => b !== a && mixOf(a, b));
    if (j >= 0) { out.push(mixOf(a, left[j])); left.splice(j, 1); } else out.push(a);
  }
  return out;
}
export const mixOf = (a, b) => Object.keys(DYES).find((k) => DYES[k].from && DYES[k].from.includes(a) && DYES[k].from.includes(b) && a !== b) || null;
export const dyePrice = (primaries = []) => primaries.reduce((t, k) => t + (DYES[k]?.price || 0), 0);
// how many dice of the new size the cast and its dyes roll
export const rollsNeeded = (castKey, primaries = []) => (CASTS[castKey]?.dice || 0) + mixDyes(primaries).reduce((t, k) => t + DYES[k].dice, 0);
// the pouch dice a cast would roll: the new size, not Bone, not being melted; plainest (fewest changed faces) first
export function rollers(pouch, type, melt = []) {
  const plain = (d) => facesOf(d).filter((f, i) => faceValue(f) !== i + 1).length + (d.up ? 10 : 0);
  return pouch.filter((d) => d.type === type && canMelt(d) && !melt.includes(d)).sort((a, b) => plain(a) - plain(b));
}

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
function apply(fx, fs, rolls, pair) {
  const before = fs.slice();
  if (rolls.length === 1) { const i = at(fs, rolls[0]); if (i < 0) return { missed: true }; one(fx, fs, i); return { faces: [i], before, after: fs.slice() }; }
  const hi = Math.max(...rolls), lo = Math.min(...rolls), iH = at(fs, hi), iL = at(fs, lo, iH);
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

// Cast a new die of `type` from a cast and dyes. Returns { faces: [values], log: [{ name, rolls, text, missed? }] }.
// dyes: primaries (they are mixed here). rolled: dice to roll, in order (their own faces); without them, plain rolls.
export function castFaces(rng, type, castKey, dyes = [], rolled = null) {
  const n = facesOfType(type), queue = rolled ? [...rolled] : null;
  const roll = (k) => Array.from({ length: k }, () => { const d = queue?.shift(); if (!d) return 1 + rng.int(n); const fs = facesOf(d); return faceValue(fs[rng.int(fs.length)]); });
  dyes = mixDyes(dyes);
  let fs = Array.from({ length: n }, (_, i) => i + 1); const log = [];
  for (const [k, X] of [[castKey, CASTS[castKey]], ...dyes.map((d) => [d, DYES[d]])]) {
    const rolls = roll(X.dice);
    if (X.fx === 'diamond') {
      const p = diamondPattern(rolls, n), P = p && DIAMOND.find((x) => x.id === p.id);
      if (p) fs = diamondFaces(p, fs);
      log.push({ k, name: X.name, rolls, text: P ? `${P.name} (${P.when}): ${P.text}` : 'No pattern: the faces stay as they are.', missed: !p, after: fs.slice() });
      continue;
    }
    const r = apply(X.fx, fs, rolls, X.pair);
    log.push({ k, name: X.name, rolls, text: r.missed ? `No face shows ${rolls.join(' or ')} any more: nothing changes.` : X.text, missed: !!r.missed, after: fs.slice() });
  }
  return { faces: fs, log };
}
