// Made tricks: the pure rules behind the trick maker (content/trickmaker.js has the vocabulary). No DOM.
import { CONVERT, PLACE, DEPLOY, MAKES, BONUS, AIMS, ZONES } from './content/trickmaker.js';
import { SHOP_CHIPS, CONDS, condText, TRICKS } from './data.js';
import { MADE_CHIPS } from './content/chipmaker.js';
import { t as tx } from './text.js';

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
  const what = kind === 'pit' ? tx('trick.take-up-to-the', { v: MAKES[R.chip].pit === 'mine' ? 'your' : 'your opponent\'s' })
    : kind === 'fee' ? (R.convert === 'lump' ? tx('trick.charge-a-fee-equal') : R.convert === 'precise' ? tx('trick.charge-a-fee-for') : tx('trick.charge-a-1-fee'))
    : kind === 'value' ? (R.convert === 'lump' ? tx('trick.make-one-chip-worth') : R.convert === 'precise' ? tx('trick.make-a-chip-for') : tx('trick.make-a-1-chip'))
      : (R.convert === 'lump' ? tx('trick.make-one', { replace: makeName(R.chip).replace(/s$/, '') }) : R.convert === 'precise' ? tx('trick.make-one-per-die', { replace: makeName(R.chip).replace(/s$/, '') }) : tx('trick.make-one-per-point', { replace: makeName(R.chip).replace(/s$/, '') }));
  const where = def.approach === 'none' ? '' : tx('trick.of-position', { text: dep.text, toLowerCase: (AIMS[def.approach] || def.approach).toLowerCase(), v: def.side === 'self' ? 'your' : def.side === 'any' ? 'either' : "your opponent's" });
  const place = kind === 'fee' || kind === 'water' ? (kind === 'water' ? tx('trick.at-the-bottom-of') : '') : `, ${PLACE[R.place]?.text || PLACE.over.text}${R.place === 'precise' ? tx('trick.height', { v: R.at | 0 }) : ''}`;
  const life = isFxChip(R.chip) ? tx('trick.for-turns', { v: SHOP_CHIPS[R.chip]?.life || 3 }) : '';
  const M = MADE_CHIPS[R.chip], foot = R.foot && R.foot !== 'model' ? R.foot : M?.foot, n = { big: 2, large: 3, huge: 5 }[foot] || 1;
  const shape = !M ? '' : [n > 1 ? tx('trick.shape-wide', { n }) : '', R.flat || M.height === 'tiny' ? tx('trick.shape-flat') : '', n > 1 && (R.slip || M.slip) ? tx('trick.shape-slip') : ''].filter(Boolean).join(', ');
  return `${what}${where}${place}${life}${shape ? ` (${shape})` : ''}.${M?.text ? ' ' + M.text : ''}`;
}
export function describeBonus(def) {
  const B = BONUS[def.bonus.k]; if (!B) return def.bonus.text || '';
  const t = B.text({ ...def.bonus, chip: def.bonus.chip || 'block' }, makeName); return t.charAt(0).toUpperCase() + t.slice(1) + '.';
}
// a whole made trick in one line, for lists and the maker's preview
export const summary = (def) => tx('trick.if', { v: ZONES[def.side] || def.side, name: CONVERT[def.roll.convert]?.name, name2: DEPLOY[def.roll.deploy]?.name, condText: condText(def.bonus.cond), describeBonus: describeBonus(def) });

// Built-in tricks that make chips write their card text from their configuration when they have none of their own.
export function fillTexts() {
  for (const def of Object.values(TRICKS)) { if (def.roll?.k !== 'chips') continue;
    if (!def.roll.text) def.roll.text = describeRoll(def); if (!def.bonus.text) def.bonus.text = describeBonus(def); }
}
fillTexts();
