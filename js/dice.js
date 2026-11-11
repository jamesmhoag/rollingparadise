// Dice with faces. A die starts with faces 1..n. Upgrades from the Diesmith change the faces (or how the die
// rolls); see DIE_UPGRADES in data.js. Pure logic, no DOM.
//
// die = { type, up: [upgrade ids], faces?: [{ v, w?, x?, rig?, ench?, enc? }], tgt?: [face index per upgrade] }
//   v: face value · w: weight (how often it comes up) · x: multiplier
//   rig: spent after it comes up · ench: multiplier that dwindles · enc: encased, grows each time it comes up
// A die saved before faces existed has only `up`; its faces are worked out from it.
import { DICE, DIE_UPGRADES, DIE_VARS } from './data.js';

const base = (type) => Array.from({ length: DICE[type].faces }, (_, i) => ({ v: i + 1 }));
const mean = (fs) => fs.reduce((t, f) => t + f.v, 0) / fs.length;
const others = (fs, t) => fs.map((f, i) => i).filter((i) => i !== t);
const highest = (fs, idx) => idx.reduce((a, b) => (fs[b].v > fs[a].v ? b : a));
const lowest = (fs, idx) => idx.reduce((a, b) => (fs[b].v < fs[a].v ? b : a));

// the faces a die rolls on, as plain data
export function facesOf(die) {
  if (die.faces) return die.faces;
  let fs = base(die.type);
  for (const u of die.up || []) if (u === 'accelerate' || u === 'stabilize' || u === 'deccelerate') fs = edit(fs, u, 0);
  return fs;
}
// what a face is worth when it comes up (before any roll-time upgrade)
export const faceValue = (f) => (f.enc != null ? f.enc : Math.round(f.v * (f.x || 1) * (f.ench || 1)));
// The values a die can show, for hover text.
export const faceList = (die) => facesOf(die).map(faceValue);

// One upgrade applied to a list of faces. `t`: the target face; `rng` picks the random face for Mirror and Reflect.
function edit(fs0, u, t, rng) {
  const fs = fs0.map((f) => ({ ...f })), V = DIE_VARS, n = fs.length, rest = others(fs, t);
  const pick = () => rest[rng ? rng.int(rest.length) : 0];
  switch (u) {
    case 'accelerate': for (const f of fs) f.v += 1; break;
    case 'deccelerate': for (const f of fs) f.v = Math.max(0, f.v - 1); break;
    case 'scatter': { const amt = fs[t].v, each = Math.floor(amt / rest.length); let left = amt - each * rest.length; fs[t].v = 0;
      for (const i of rest) { fs[i].v += each + (left > 0 ? 1 : 0); left--; } break; }
    case 'raise': { const h = highest(fs, rest); fs[h].v += fs[t].v; fs[t].v = 0; break; }
    case 'vow': { const l = lowest(fs, rest); fs[l].v += fs[t].v; fs[t].v = 0; break; }
    case 'divide': for (const i of rest) if (fs[i].v > 0) { fs[i].v--; fs[t].v++; } break;
    case 'gift': { const h = highest(fs, rest), g = Math.floor(fs[h].v / 2); fs[h].v -= g; fs[t].v += g; break; }
    case 'devour': { const l = lowest(fs, rest); fs[t].v += fs[l].v; fs[l].v = 0; break; }
    case 'boost': fs[t].v += V.bump; break;
    case 'bonk': fs[t].v = Math.max(0, fs[t].v - V.bump); break;
    case 'stabilize': { const m = mean(fs); for (const f of fs) f.v = Math.round((f.v + m) / 2); break; }
    case 'emphasize': fs[t].w = (fs[t].w || 1) + 1; break;
    case 'rig': fs[t].x = (fs[t].x || 1) * V.rig; fs[t].rig = true; break;
    case 'enchant': fs[t].ench = V.enchant; break;
    case 'encase': fs[t].enc = 0; fs[t].encV = 0; break;
    case 'rebalance': fs[t].x = (fs[t].x || 1) * V.rebalance; fs[n - 1 - t].v = 0; break;
    case 'mirror': fs[pick()].v = fs[t].v; break;
    case 'reflect': fs[t].v = fs[pick()].v; break;
    default: break; // temper, escalate, gamble, curse work when the die is rolled
  }
  return fs;
}

// Can this upgrade go on this die? Returns a reason, or null.
export function canUpgrade(die, u, max = 2) {
  const U = DIE_UPGRADES[u]; if (!U) return 'No such upgrade.';
  if ((die.up || []).length >= max) return `A die takes at most ${max} upgrades.`;
  if (U.roll && die.up.includes(u)) return `${U.name} works when the die is rolled, so it cannot be taken twice.`;
  return null;
}
// Apply an upgrade to a die (mutates it). `t`: target face index, needed for target upgrades.
export function upgrade(die, u, t = 0, rng) {
  const fs = facesOf(die); t = Math.max(0, Math.min(fs.length - 1, t | 0));
  die.faces = edit(fs, u, t, rng);
  die.up = [...(die.up || []), u]; die.tgt = [...(die.tgt || die.up.slice(0, -1).map(() => null)), DIE_UPGRADES[u].target ? t : null];
  return die;
}
// The face a target upgrade would suit: the highest for upgrades that add to it, the lowest for the rest.
export function suggestFace(die, u) {
  const fs = facesOf(die), idx = fs.map((_, i) => i);
  return ['scatter', 'raise', 'vow', 'bonk', 'mirror', 'reflect'].includes(u) ? lowest(fs, idx) : highest(fs, idx);
}

// Roll a die. Faces that change with use (Rig, Enchant, Encase) change on the die passed in, so the bout rolls a
// copy of your dice and they are fresh next bout.
export function rollDie(rng, die) {
  const fs = facesOf(die), ups = die.up || [];
  const pickIdx = () => rng.weighted(fs.map((_, i) => i), (i) => fs[i].w || 1);
  let i = pickIdx();
  if (ups.includes('escalate')) { const j = pickIdx(); if (faceValue(fs[j]) > faceValue(fs[i])) i = j; }
  if (ups.includes('temper')) { const j = pickIdx(); if (faceValue(fs[j]) < faceValue(fs[i])) i = j; }
  let v = faceValue(fs[i]);
  if (ups.includes('gamble') && rng.int(fs.length) === i) v *= DIE_VARS.gamble;
  if (ups.includes('curse')) v = rng.int(fs.length) === i ? v * DIE_VARS.curse : 0;
  if (die.faces) { // faces that change with use
    const f = die.faces[i];
    if (f.rig) { f.v = 0; f.rig = false; }
    if (f.ench) f.ench = Math.max(1, f.ench - 1);
    if (f.enc != null) f.enc += DIE_VARS.encaseStep;
  }
  return v;
}
// a copy of a die for one bout: faces that change with use start fresh from the bought upgrades
export const boutCopy = (die) => ({ ...die, up: [...(die.up || [])], faces: die.faces ? die.faces.map((f) => ({ ...f })) : undefined });
