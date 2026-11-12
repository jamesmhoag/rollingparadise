// Levers: single changes to a strategy, each in a `slot`. Two levers in the same slot conflict (they set the same
// thing); levers in different slots are treated as independent, so they can be stacked into one combined strategy.
// The one-variable suites (B, C) are standard + one lever; the combination search stacks several.
import * as D from '../../js/data.js';

// "standard": a sensible all-round player. Every buy pattern and lever is measured against it.
export const STANDARD = { buy: ['drink', 'tricks', 'upgrades'], frac: 0.5 };

// the chips the Chip Exchange sells today (chips a trick or the table makes are not sold)
export const SOLD = D.SHOP_IDS();
export const FOOD = ['chocolate', 'chipchip', 'bun', 'hamburger', 'fishchip'].filter((id) => SOLD.includes(id));
export const DEFENCE = ['little', 'clay', 'seed', 'burn', 'acid', 'shock'].filter((id) => SOLD.includes(id));
const cheapFirst = (ids) => ids.filter((id) => D.shopFloor(id) <= 2).sort((a, b) => D.shopPrice(a) - D.shopPrice(b) || a.localeCompare(b));

// A. buy patterns: same play, same budget, only what is bought changes. A pattern is a `base` for combinations.
export const PATTERNS = [
  ['standard (drink + tricks + trick upgrades)', {}],
  ['buy nothing', { buy: [] }],
  ['tricks only', { buy: ['tricks'] }],
  ['tricks + restocks', { buy: ['tricks', 'restock'] }],
  ['trick upgrades only', { buy: ['upgrades'] }],
  ['tricks + trick upgrades', { buy: ['tricks', 'upgrades'] }],
  ['forge dice only', { buy: ['forge'] }],
  ['die upgrades only', { buy: ['dieUpgrades'] }],
  ['drinks only', { buy: ['drink'] }],
  ['shop chips only (defence mix)', { buy: [['chip', DEFENCE]] }],
  ['food chips only', { buy: [['chip', FOOD]] }],
  ['sports bets only', { buy: ['bets'] }],
  ['everything (round robin)', { buy: ['drink', 'tricks', 'upgrades', 'forge', 'dieUpgrades', ['chip', DEFENCE]] }],
];

const L = (name, slot, apply, o = {}) => ({ name, slot, apply, ...o });
const merge = (k) => (v) => (s) => ({ ...s, [k]: { ...(s[k] || {}), ...v } });
const first = (step) => (s) => ({ ...s, buy: [step, ...(s.buy || [])] });
export const LEVERS = [
  // B. play and table choices
  L('budget 25%', 'budget', (s) => ({ ...s, frac: 0.25 })),
  L('budget 10%', 'budget', (s) => ({ ...s, frac: 0.1 })),
  L('budget 90%', 'budget', (s) => ({ ...s, frac: 0.9 })),
  ...['hazard', 'creature', 'spawner', 'calamity'].map((t) => L(`${t} tilt (challenge)`, 'challenge', merge('tilts')({ [t]: 1 }), { tilt: t })),
  ...['shield', 'familiar', 'position', 'intervention'].map((t) => L(`${t} tilt (cheat)`, 'cheat', merge('tilts')({ [t]: 1 }), { tilt: t })),
  L('Double Down on table 2/3', 'dd', (s) => ({ ...s, dd: true })),
  L('challenge the barfly each floor', 'barfly', (s) => ({ ...s, barfly: true })),
  L('prize: two dice (no bonus)', 'prize', (s) => ({ ...s, prize: 'dice' })),
  L('prize: glean a trick (no bonus)', 'prize', (s) => ({ ...s, prize: 'glean' })),
  L('no selling after a loss', 'sell', (s) => ({ ...s, sellDown: false })),
  // level 0 jackets fit one class each, so each is tried on that class only
  ...['long', 'leather', 'bomber'].map((j) => L(`${j} jacket`, 'jacket', (s) => ({ ...s, jacket: j }), { only: [D.JACKETS[j].cls] })),
  L('deploy by column', 'spacing', merge('plan')({ spacing: 'column' })),
  L('balanced stacks', 'stacking', merge('plan')({ stacking: 'balanced' })),
  L('play: draw to max', 'draw', merge('knobs')({ draw: 'max' })),
  L('play: draw one (bank Conviction)', 'draw', merge('knobs')({ draw: 'one' })),
  L('play: roll one (bank Cunning)', 'roll', merge('knobs')({ roll: 'one' })),
  L('play: flip chips to fill rolls', 'roll', merge('knobs')({ roll: 'flip' })),
  L('play: bid every bid', 'bid', merge('knobs')({ bid: 'all' })),
  L('play: bid one (bank Charisma)', 'bid', merge('knobs')({ bid: 'one' })),
  // C. shop add-ons, bought FIRST each visit so the standard buys cannot starve them
  ...['forge', 'dieUpgrades', 'restock', 'bets'].map((x) => L(`buy first: ${x}`, 'first', first(x), { group: 'C' })),
  ...cheapFirst(SOLD).map((id) => L(`buy first: ${id} chips (${D.shopPrice(id)}¢)`, 'first', first(['chip', [id], 0.2]), { group: 'C', chip: id })),
].map((l) => ({ group: 'B', ...l }));

export const byName = Object.fromEntries(LEVERS.map((l) => [l.name, l]));
// two levers stack if they sit in different slots
export const compatible = (names) => new Set(names.map((n) => byName[n].slot)).size === names.length;
export function compose(base, names) { let s = { ...STANDARD, ...base }; for (const n of names) s = byName[n].apply(s); return s; }
