// Made tricks: the pure rules behind the trick maker (content/trickmaker.js has the vocabulary). No DOM.
import { CONVERT, PLACE, DEPLOY, MAKES, BONUS, AIMS, ZONES } from './content/trickmaker.js';
import { SHOP_CHIPS, CONDS, condText } from './data.js';
import { MADE_CHIPS } from './content/chipmaker.js';

export const isMade = (def) => def?.roll?.k === 'chips';
export const makeName = (chip) => MAKES[chip]?.name || (MADE_CHIPS[chip] ? MADE_CHIPS[chip].name : SHOP_CHIPS[chip] ? `${SHOP_CHIPS[chip].name}s` : chip);
export const makeKind = (chip) => MAKES[chip]?.kind || 'count';
// an effect chip (SHOP_CHIPS) rather than one of the table's own chips: it is placed with a life in turns
export const isFxChip = (chip) => !MAKES[chip] && !MADE_CHIPS[chip] && !!SHOP_CHIPS[chip];
// the area a deployment pattern covers, as the older DIST shapes (for hovers and highlights)
export const DIST_OF = { hit: 'hit', line: 'poke', hook: 'hook', cone: 'burst', spiral: 'drop', left: 'swipe', right: 'swipe', sides: 'swipe', wave: 'wave', aura: 'aura' };
export const makeChoices = () => [...Object.keys(MAKES), ...Object.keys(MADE_CHIPS), ...Object.keys(SHOP_CHIPS).filter((id) => !MAKES[id])];
export const condChoices = () => [...Object.keys(CONDS), 'over:N', 'under:N'];

// Part 1: the instances a roll makes. vals: each die's value; total: the trick's total after multipliers.
export function instances(convert, vals, total) {
  if (total <= 0) return [];
  if (convert === 'petty') return Array.from({ length: Math.min(total, 200) }, () => 1);
  if (convert === 'precise') { // each die's share of the total, so multipliers carry through; rounding goes to the last
    const raw = vals.reduce((t, v) => t + v, 0) || 1, out = vals.map((v) => Math.floor((v * total) / raw)); out[out.length - 1] += total - out.reduce((t, v) => t + v, 0);
    return out.filter((v) => v > 0);
  }
  return [total];
}
// Part 3: the spaces a pattern covers from an origin, in deployment order (rows R, columns C; row 0 is the front)
export function deployOrder(R, C, origin, deploy) {
  const { r, c } = origin, out = [], add = (rr, cc) => { if (rr >= 0 && rr < R && cc >= 0 && cc < C && !out.some((x) => x.r === rr && x.c === cc)) out.push({ r: rr, c: cc }); };
  add(r, c);
  switch (deploy) {
    case 'line': for (let i = 1; i < R; i++) add(r + i, c); break;
    case 'hook': for (let i = 1; i < R; i++) add(r - i, c); break;
    case 'cone': for (let k = 1; k < R; k++) for (let d = 0; d <= k; d++) { add(r + k, c - d); add(r + k, c + d); } break;
    case 'spiral': for (let k = 1; k < Math.max(R, C); k++) { // ring by ring, clockwise from the front
      for (let dc = -k; dc <= k; dc++) add(r - k, c + dc); for (let dr = -k + 1; dr <= k; dr++) add(r + dr, c + k);
      for (let dc = k - 1; dc >= -k; dc--) add(r + k, c + dc); for (let dr = k - 1; dr > -k; dr--) add(r + dr, c - k); } break;
    case 'left': for (let i = 1; i < C; i++) add(r, c - i); break;
    case 'right': for (let i = 1; i < C; i++) add(r, c + i); break;
    case 'sides': for (let i = 1; i < C; i++) { add(r, c - i); add(r, c + i); } break;
    case 'wave': for (let cc = 0; cc < C; cc++) add(r, cc); break;
    case 'aura': for (let rr = 0; rr < R; rr++) for (let cc = 0; cc < C; cc++) add(rr, cc); break;
    default: break; // hit
  }
  return out;
}
// Part 2: where in a stack of `n` chips a placed chip goes (an index from the bottom)
export const placeIndex = (place, at, n) => (place === 'under' ? 0 : place === 'precise' ? Math.max(0, Math.min(n, at | 0)) : n);

// The words on the card, worked out from the configuration
export function describeRoll(def) {
  const R = def.roll, kind = makeKind(R.chip), dep = DEPLOY[R.deploy] || DEPLOY.hit;
  const what = kind === 'fee' ? (R.convert === 'lump' ? 'Charge a fee equal to the total' : R.convert === 'precise' ? 'Charge a fee for each die, worth what it rolled' : 'Charge a 1¢ fee for each point of the total')
    : kind === 'value' ? (R.convert === 'lump' ? 'Make one chip worth the total' : R.convert === 'precise' ? 'Make a chip for each die, worth what it rolled' : 'Make a 1¢ chip for each point of the total')
      : (R.convert === 'lump' ? `Make one ${makeName(R.chip).replace(/s$/, '')}` : R.convert === 'precise' ? `Make one ${makeName(R.chip).replace(/s$/, '')} per die` : `Make one ${makeName(R.chip).replace(/s$/, '')} per point of the total`);
  const where = def.approach === 'none' ? '' : `, ${dep.text} (${(AIMS[def.approach] || def.approach).toLowerCase()} of ${def.side === 'self' ? 'your' : def.side === 'any' ? 'either' : "your opponent's"} position)`;
  const place = kind === 'fee' ? '' : `, ${PLACE[R.place]?.text || PLACE.over.text}${R.place === 'precise' ? ` (height ${R.at | 0})` : ''}`;
  const life = isFxChip(R.chip) ? `, for ${R.life || 3} turns` : '';
  return `${what}${where}${place}${life}.`;
}
export function describeBonus(def) {
  const B = BONUS[def.bonus.k]; if (!B) return def.bonus.text || '';
  const t = B.text({ ...def.bonus, chip: def.bonus.chip || 'block' }, makeName); return t.charAt(0).toUpperCase() + t.slice(1) + '.';
}
// a whole made trick in one line, for lists and the maker's preview
export const summary = (def) => `${ZONES[def.side] || def.side} · ${CONVERT[def.roll.convert]?.name} · ${DEPLOY[def.roll.deploy]?.name} · if ${condText(def.bonus.cond)}: ${describeBonus(def)}`;
