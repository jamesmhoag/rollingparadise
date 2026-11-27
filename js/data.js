// Static game content, taken from the Rolling Paradise design workbook.

// ---------- Rollers ----------
// TIP = per-turn action limits. BVD = position shape. The rewards for actions left unused (Charisma, Cunning,
// Conviction) have no class base: they are earned at the table by occupying rows (see occBonus in bout.js), and a
// class's own one (`primary`'s reward: Trickery → Charisma, Ingenuity → Cunning, Proficiency → Conviction) earns most.
// A Class is a Roller's attributes: what it does each turn (TIP), the shape of its position (BVD), the attribute it
// leans on (primary), its primary C (rewards: what holding every row of its Stake earns; every Roller starts a turn at
// 0 / 0 / 0 Charisma, Cunning and Conviction), where it deploys from, and its colour. Rollers (content/rollers.js),
// Opponents and High Rollers (content/roster.js) each name a Class.
export const CLASSES = {
  hustler: {
    name: 'Hustler',
    tip: { trickery: 3, ingenuity: 2, proficiency: 2 }, bvd: { balance: 3, versatility: 1, depth: 0 }, primary: 'trickery', rewards: 'charisma', deploy: 'end', color: '#e0a23c',
  },
  rascal: {
    name: 'Rascal',
    tip: { trickery: 2, ingenuity: 3, proficiency: 2 }, bvd: { balance: 0, versatility: 3, depth: 1 }, primary: 'ingenuity', rewards: 'cunning', deploy: 'center', color: '#c0569b',
  },
  technician: {
    name: 'Technician',
    tip: { trickery: 2, ingenuity: 2, proficiency: 3 }, bvd: { balance: 1, versatility: 0, depth: 3 }, primary: 'proficiency', rewards: 'conviction', deploy: 'start', color: '#4aa3c7',
  },
};
import { ROLLERS } from './content/rollers.js';
export { ROLLERS };
// a Roller id from a Roller id or a class id (the first Roller of that class), so old saves and tests that name a class still work
export const rollerOf = (id) => (ROLLERS[id] ? id : Object.keys(ROLLERS).find((k) => ROLLERS[k].cls === id) || Object.keys(ROLLERS)[0]);
// a Roller's hero and class together: 'Owl the Hustler'
// the reward stat for a primary action stat
export const C_OF = { trickery: 'charisma', ingenuity: 'cunning', proficiency: 'conviction' };
export const primaryC = (cls) => (['charisma', 'cunning', 'conviction'].includes(CLASSES[cls]?.rewards) ? CLASSES[cls].rewards : C_OF[CLASSES[cls]?.primary] || 'charisma'); // the class's primary C
// what sets a class apart, written from its numbers: the per-turn action it has most of, the position stat it leans on,
// where it deploys from (its words for the table are its flavour line)
export function classRule(cls) {
  const K = CLASSES[cls]; if (!K) return '';
  const top = (group, k) => Object.values(CLASSES).every((x) => (x[group]?.[k] ?? 0) <= (K[group]?.[k] ?? 0));
  const most = { trickery: 'draws the most tricks', ingenuity: 'bids the most', proficiency: 'rolls the most dice' }, shape = { balance: 'stacks chips tallest', versatility: 'has the deepest Bet', depth: 'has the deepest Stake' };
  const a = Object.keys(most).filter((k) => top('tip', k)).map((k) => `${most[k]} (${STATS[k].name} ${K.tip[k]})`), b = Object.keys(shape).filter((k) => top('bvd', k) && K.bvd[k] > 0).map((k) => shape[k]);
  const from = { start: 'the front', center: 'the centre', end: 'the back' }[K.deploy] || K.deploy;
  const body = [...a, ...b].join(' and ');
  return `${body ? body.charAt(0).toUpperCase() + body.slice(1) + '. ' : ''}Deploys from ${from}.`;
}
export const heroName = (cls, roller) => { const R0 = ROLLERS[roller] || ROLLERS[rollerOf(cls)]; const K = CLASSES[cls] || CLASSES[R0?.cls]; return R0 ? `${R0.name} the ${K?.name || ''}`.trim() : K?.name || ''; };
export const BASE_DIMS = { cols: 5, stackMax: 3, meterRows: 2, barRows: 3 };

// `per`: what each point does, for hover text that says what a +1 or −1 actually changes
export const STATS = {
  trickery: { name: 'Trickery', short: 'Draw', text: 'Tricks you may draw from your Book each turn.', per: (n) => `draw ${n} more trick${n === 1 ? '' : 's'} from your Book each turn, so more tricks are on your Run to roll onto and bid on` },
  ingenuity: { name: 'Ingenuity', short: 'Bid', text: 'Chips you may bid on shown tricks each turn. A trick plays only once bid on, and each chip bid adds its value to the effect.', per: (n) => `bid ${n} more chip${n === 1 ? '' : 's'} each turn, so more tricks play, or bigger effects (each chip bid adds its value)` },
  proficiency: { name: 'Proficiency', short: 'Roll', text: 'Dice you may roll each turn. A die shows its value first; you then choose which shown trick it goes on.', per: (n) => `roll ${n} more ${n === 1 ? 'die' : 'dice'} (or flip ${n === 1 ? 'a chip' : 'chips'}) each turn, so bigger totals and more bonuses` },
  charisma: { name: 'Charisma', short: 'Steal', text: 'For each draw you leave unused, the House steals this many ¢ from the Stage for you with the Expenses. Earned at the table: hold a chip in every Bet row (and, for a Hustler, every Stake row).', per: (n) => `steal ${n} more ¢ from the Stage for every draw you leave unused` },
  cunning: { name: 'Cunning', short: 'Opportunity', text: 'For each bid you leave unused, the House puts this many Opportunity chips on your Bet with the Insurances. Earned at the table: hold a chip in every Bet row (and, for a Rascal, every Stake row).', per: (n) => `gain ${n} more Opportunity chip${n === 1 ? '' : 's'} for every bid you leave unused` },
  conviction: { name: 'Conviction', short: 'Power', text: 'For each roll you leave unused, the House puts this many Power chips on your Bet with the Investments: each adds +1 to your roll effects this turn. Earned at the table: hold a chip in every Bet row (and, for a Technician, every Stake row).', per: (n) => `gain ${n} more Power chip${n === 1 ? '' : 's'} for every roll you leave unused` },
  balance: { name: 'Balance', short: 'Stack height', text: 'Extra chips each space can hold (base 3).', per: (n) => `every space in your position holds ${n} more chip${n === 1 ? '' : 's'} (taller stacks in the Bet and the Stake)` },
  versatility: { name: 'Versatility', short: 'Bet rows', text: 'Extra Bet rows (base 2). The Bet sits in front and only holds chips gained during the bout.', per: (n) => `${n} more Bet row${n === 1 ? '' : 's'}: more room for Blocks, Opportunity and recovered chips, and more cover in front of your Stake` },
  depth: { name: 'Depth', short: 'Stake rows', text: 'Extra Stake rows (base 3). The Stake holds the chips you commit before the bout.', per: (n) => `${n} more Stake row${n === 1 ? '' : 's'}: room to put more chips on the table before the bout` },
};

// ---------- Dice ----------
// Materials, the Dice Shop and Bone dice live in content/dice.js, so they can be edited on their own.
export { MATERIALS, DEFAULT_MAT, BASIC_MATS, COMPLEXITY, DICE_SHOP, BONE, MELT, CASTS, DYES, DIAMOND } from './content/dice.js';
export const DICE = {
  d4: { faces: 4, forge: { dice: 1, chips: 50, floor: 1 }, sell: 20 },
  d6: { faces: 6, forge: { dice: 2, chips: 60, floor: 1 }, sell: 40 },
  d8: { faces: 8, forge: { dice: 4, chips: 120, floor: 1 }, sell: 80 },
  d10: { faces: 10, forge: { dice: 5, chips: 800, floor: 2 }, sell: 200 },
  d12: { faces: 12, forge: { dice: 6, chips: 1200, floor: 2 }, sell: 300 },
  d20: { faces: 20, forge: { dice: 20, chips: 2500, floor: 2 }, sell: 500 },
};
// The workbook's 22 dice upgrades. A die has faces (1 to n to start); most upgrades change them when bought,
// a few change how the die rolls. `target`: the buyer picks a face. `roll`: works when the die is rolled, so it
// cannot be taken twice. `mark`/`color`: the badge the die wears. `floor`: the Diesmith offers it from this floor.
// Numbers the rules read are in DIE_VARS. Faces that change with use (Rig, Enchant, Encase) change for good.
export const DIE_VARS = { bump: 2, rig: 2, enchant: 3, encaseStep: 2, rebalance: 2, gamble: 2, curse: 3 };
export const DIE_UPGRADES = {
  accelerate: { name: 'Accelerate', text: 'Shift every face up by 1.', mark: '+', color: '#7dffb5', floor: 1 },
  deccelerate: { name: 'Deccelerate', text: 'Shift every face down by 1 (not below 0). Good for tricks that want a low total.', mark: '−', color: '#9fb0d8', floor: 1 },
  scatter: { name: 'Scatter', text: 'Empty the target face and share its value evenly over the other faces.', mark: '∴', color: '#ff9f5a', target: true, floor: 1 },
  raise: { name: 'Raise', text: 'Empty the target face into the highest face.', mark: '⤒', color: '#ffd76a', target: true, floor: 1 },
  vow: { name: 'Vow', text: 'Empty the target face into the lowest face.', mark: '⤓', color: '#c9a0ff', target: true, floor: 1 },
  divide: { name: 'Divide', text: 'Fill the target face evenly: every other face gives it 1.', mark: '÷', color: '#63c4ff', target: true, floor: 1 },
  gift: { name: 'Gift', text: 'Fill the target face from the highest: the highest face gives it half its value.', mark: '↑', color: '#ffb3e6', target: true, floor: 1 },
  devour: { name: 'Devour', text: 'Fill the target face from the lowest: the lowest face gives it everything.', mark: '↓', color: '#ff7096', target: true, floor: 1 },
  boost: { name: 'Boost', text: (v) => `Bump the target face up by ${v.bump}.`, mark: '▴', color: '#7dffb5', target: true, floor: 1 },
  bonk: { name: 'Bonk', text: (v) => `Bump the target face down by ${v.bump} (not below 0).`, mark: '▾', color: '#9fb0d8', target: true, floor: 1 },
  stabilize: { name: 'Stabilize', text: 'Pull every face halfway toward the average.', mark: '=', color: '#63c4ff', floor: 1 },
  temper: { name: 'Temper', text: 'Weighted to the lowest: roll twice, keep the lower.', mark: '▼', color: '#9fb0d8', roll: true, floor: 1 },
  escalate: { name: 'Escalate', text: 'Weighted to the highest: roll twice, keep the higher.', mark: '▲', color: '#ffd76a', roll: true, floor: 1 },
  emphasize: { name: 'Emphasize', text: 'Weight the target face: it comes up twice as often.', mark: '!', color: '#ff86ea', target: true, floor: 2 },
  rig: { name: 'Rig', text: (v) => `The target face is worth ×${v.rig}, but it is spent (0) for good after it comes up once.`, mark: '×', color: '#ff5a4a', target: true, floor: 2 },
  enchant: { name: 'Enchant', text: (v) => `The target face is worth ×${v.enchant}, dwindling by 1 for good each time it comes up.`, mark: '✧', color: '#b08cff', target: true, floor: 2 },
  encase: { name: 'Encase', text: (v) => `The target face starts at 0 but grows by ${v.encaseStep} for good each time it comes up.`, mark: '▣', color: '#c9d3e0', target: true, floor: 2 },
  rebalance: { name: 'Rebalance', text: (v) => `The target face is worth ×${v.rebalance}; the opposite face becomes 0.`, mark: '⇅', color: '#ffd76a', target: true, floor: 2 },
  gamble: { name: 'Gamble', text: (v) => `Each roll a random face is worth ×${v.gamble}.`, mark: '?', color: '#7df3ff', roll: true, floor: 2 },
  curse: { name: 'Curse', text: (v) => `Each roll one random face is worth ×${v.curse} and every other face is 0.`, mark: '☠', color: '#b3261e', roll: true, floor: 3 },
  mirror: { name: 'Mirror', text: 'Copy the target face onto a random other face.', mark: '⧉', color: '#eef2f7', target: true, floor: 2 },
  reflect: { name: 'Reflect', text: 'Change the target face into a copy of a random other face.', mark: '↻', color: '#ff86ea', target: true, floor: 2 },
};
export const upgradeText = (u) => { const t = DIE_UPGRADES[u].text; return typeof t === 'function' ? t(DIE_VARS) : t; };

// ---------- Tricks ----------
export const TYPES = {
  investment: { name: 'Investment', order: 0, color: '#8a6fd1', text: 'Resolves first. Modifies every other effect played this turn.' },
  insurance: { name: 'Insurance', order: 1, color: '#4aa3c7', text: 'Resolves second. Prevents, reduces or mitigates expenses.' },
  expense: { name: 'Expense', order: 2, color: '#d9564a', text: 'Resolves third. Charges fees that move chips from a position to the Stage.' },
  correction: { name: 'Correction', order: 3, color: '#5bb174', text: 'Resolves last. Adjusts the placement and state of chips.' },
};
export const QMULT = [0, 1, 2, 3, 4, 5]; // [5]: a Royal trick played a tier stronger (a Foil print, an Upgrade chip)
export const QNAME = ['', 'Common', 'Fine', 'Grand', 'Royal'];
// a trick's quality is shown as a Roman numeral wherever the trick is (the word in its hover)
export const QROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
// A trick's quality level. `q` on a trick (1-4) is set in the Trick maker: every copy of it is made at least that
// good. Left unset, its level is rated from its traits (rateTrick): what its dice roll on average, how far it reaches,
// and what its Bonus asks of the dice. The rating is shown; only a set level changes the copies dealt.
export function rateTrick(def) {
  const avg = def.count * ((DICE[def.die]?.faces || 6) + 1) / 2;
  const reach = def.approach === 'none' ? 1 : Math.max(DIST[def.dist]?.min || 1, ['wave', 'aura', 'cone', 'spiral'].includes(def.roll?.deploy) ? 3 : 1);
  const hard = { match: 1, evens: 1.1, odds: 1.1, run: 1.3 }[def.bonus?.cond] || (String(def.bonus?.cond).startsWith('over:') ? +def.bonus.cond.slice(5) / Math.max(1, avg) : 1);
  const score = avg * (1 + (reach - 1) * 0.35) * hard;
  return score < 7.5 ? 1 : score < 10 ? 2 : score < 14 ? 3 : 4;
}
export const qualityOf = (def) => (def?.q >= 1 && def.q <= 4 ? def.q : rateTrick(def));
export const DIE_UPGRADE_MAX = 2;
// Quality is unlocked by floor. Common and Fine tricks are reliable: they roll only their own small dice (d4, d6,
// d8). Grand and Royal hit harder but less reliably: each time one is drawn it rolls a quality die (d10 or d20). A
// low roll is a dud (the trick plays at Common strength that turn); a high roll sets off its Bonus whatever the dice.
export const QDIE = [null, null, null, { die: 'd10', faces: 10, dud: 1, hot: 10 }, { die: 'd20', faces: 20, dud: 2, hot: 19 }];
export const qdieText = (q) => { const Q = QDIE[q]; return Q ? `Rolls a ${Q.die} when drawn: ${Q.dud === 1 ? '1' : `1–${Q.dud}`} is a dud (Common strength this turn); ${Q.hot === Q.faces ? Q.hot : `${Q.hot}–${Q.faces}`} sets off the Bonus whatever the dice.` : 'Reliable: no quality die.'; };

// A trick's condition sets only what it sells for. Wear starts at 100 for Mint and drops 1 each time the trick plays;
// each condition's sale percentage is also its wear threshold. Poor tricks cannot be sold (the Trader trashes them)
// but play forever, just as well as ever. Gem Mint comes only out of foil packs and is Mint until first played.
export const CONDITIONS = {
  gem: { name: 'Gem Mint', at: 100, sell: 2 }, mint: { name: 'Mint', at: 100, sell: 1 }, excellent: { name: 'Excellent', at: 75, sell: 0.75 },
  good: { name: 'Good', at: 50, sell: 0.5 }, poor: { name: 'Poor', at: 0, sell: 0 },
};
export const WEAR = { mint: 100, excellent: 99, good: 74 }; // where each source starts: foil packs, the shelf, your first Book
export const condOf = (t) => { const w = t.wear ?? WEAR.good; return w >= 100 ? (t.gem ? 'gem' : 'mint') : w >= 75 ? 'excellent' : w >= 50 ? 'good' : 'poor'; };

// Rarity. Basic is the plain print. Foil multiplies the roll total in tiers; a Misprint has a modestly changed die or
// Trait value (most of them for the better); a Reprint plays an older rule for its type, restoring a buff.
// A Foil print is the same trick a tier stronger: it plays with the multiplier of the quality above its own.
export const FOIL = [null, { name: 'Foil', tier: 1 }];
export const RARITY = {
  basic: { name: 'Basic', text: 'The plain print.' },
  foil: { name: 'Foil', text: 'A foil print is the same trick a tier stronger: it plays as the quality above its own.' },
  misprint: { name: 'Misprint', text: 'Printed off: one of its values came out wrong (MISPRINTS), and it plays as printed.' },
  reprint: { name: 'Reprint', text: 'A trick brought back to print: an older rule for its type, or a trick no longer printed. Marked with an ankh.' },
};
// the older rule each type's Reprint plays
export const REPRINT = {
  expense: 'Older rule: the roll effect plays once for each die, each instance worth that die (the bid joins the first).',
  insurance: 'Older rule: the roll effect plays once for each die, each instance worth that die (the bid joins the first).',
  investment: 'Older rule: the roll effect plays once for each die, each instance worth that die (the bid joins the first).',
  correction: 'Older rule: the roll effect plays once for each die, each instance worth that die (the bid joins the first).',
};
export const rarityName = (t) => (t.foil ? FOIL[1].name : t.rar && t.rar !== 'basic' ? RARITY[t.rar]?.name || '' : '');
// ---------- Misprints ----------
// A Misprint is a trick printed off: one value on it came out wrong, and it plays as printed. Each kind of fault names
// the value it changes (`field`), how it is rolled (`roll`: a step from the true value), how it changes the trick's
// rules (`apply`), and what looks wrong on the card (`shows`: which part is printed off). Most come out better. More
// kinds can be added here (a colour printed off, a target, a bid...); each pack's rare slot picks one by `weight`.
const STEP_DIE = ['d4', 'd6', 'd8', 'd12', 'd20'];
export const MISPRINTS = {
  die: { name: 'Die size', weight: 3, shows: 'dice', // its Bonus dice printed a size up (or down)
    roll: (rng, def) => { const k = STEP_DIE.indexOf(def.die), up = rng.chance(0.75), to = STEP_DIE[k + (up ? 1 : -1)] || STEP_DIE[k + (up ? -1 : 1)]; return to && to !== def.die ? { die: to } : null; },
    apply: (def, m) => ({ ...def, die: m.die }), text: (def, m, base) => `its Bonus dice are printed ${m.die} instead of ${base.die}` },
  count: { name: 'Dice count', weight: 2, shows: 'dice', // one Bonus die more (or fewer) printed on it
    roll: (rng, def) => { const n = def.count + (rng.chance(0.6) && def.count > 1 ? -1 : 1); return n >= 1 && n <= 9 && n !== def.count ? { count: n } : null; },
    apply: (def, m) => ({ ...def, count: m.count }), text: (def, m, base) => `its Bonus asks ${m.count} dice instead of ${base.count}` },
  trait: { name: 'Effect value', weight: 3, shows: 'roll', // the value its effect adds printed higher (or lower)
    roll: (rng) => { const good = rng.chance(0.75); return { trait: good ? 1 + rng.int(3) : -1 }; },
    apply: (def) => def, text: (def, m) => `its effect is printed ${m.trait > 0 ? '+' : ''}${m.trait}` },
};
// a trick's rules as printed on it: a Misprint's faults applied over the plain print
const printed = new Map();
export function defOf(t) {
  const m = t.mis; if (!m || !TRICKS[t.id]) return TRICKS[t.id];
  const k = t.id + ':' + JSON.stringify(m); if (printed.has(k)) return printed.get(k);
  let def = TRICKS[t.id]; for (const kind of misKinds(m)) def = MISPRINTS[kind].apply(def, m);
  printed.set(k, def); return def;
}
// which kinds of fault a misprint carries (from the values it holds)
export const misKinds = (m) => (m ? Object.keys(MISPRINTS).filter((k) => (k === 'die' && m.die) || (k === 'count' && m.count) || (k === 'trait' && m.trait)) : []);
export const misText = (t) => (!t.mis ? '' : misKinds(t.mis).map((k) => MISPRINTS[k].text(defOf(t), t.mis, TRICKS[t.id])).join(', '));
// ---------- Reprints ----------
// A trick is printed again as a Reprint only if it is marked `reprint` in the Trick maker. A trick taken out of the
// game is not deleted: marked `retired`, it is dealt nowhere (shelves, packs, opponents) but can still come back as a
// Reprint, and every copy already held keeps playing.
export const reprintable = () => Object.keys(TRICKS).filter((id) => TRICKS[id]?.reprint);
// Foil packs: five tricks of the set's quality, all Mint (each may be Gem Mint), one of them a rarer print.
// Better sets cost more and open as the floors do: 200¢ × quality × floor, above what the five sell for at Mint.
export const PACKS = [null,
  { name: 'Common set', q: 1, floor: 1 }, { name: 'Fine set', q: 2, floor: 2 }, { name: 'Grand set', q: 3, floor: 3 }, { name: 'Royal set', q: 4, floor: 4 }];
// (pack size, price and gem chance are in content/tuning.js)

export const APPROACH = {
  front: 'the front-most stack of a column',
  rear: 'the rear-most stack of a column',
  flank: 'any stack in an edge column',
  body: 'the front row of the Stake, skipping the Bet',
  any: 'any stack',
  meter: 'any open Bet space',
  none: 'no space — affects the whole Roller',
};
export const DIST = {
  hit: { name: 'Hit', text: 'Target space only.', min: 1, inc: 0, max: 1 },
  swipe: { name: 'Swipe', text: 'From the target sideways. +1 space per extra die.', min: 2, inc: 1, max: 5 },
  poke: { name: 'Poke', text: 'From the target toward the back. +1 space per extra die.', min: 2, inc: 1, max: 7 },
  hook: { name: 'Hook', text: 'From the target toward the front. +1 space per extra die.', min: 2, inc: 1, max: 7 },
  drop: { name: 'Drop', text: 'The target and the spaces around it. Grows with extra dice.', min: 5, inc: 4, max: 13 },
  burst: { name: 'Burst', text: 'A cone widening toward the back. Grows with extra dice.', min: 4, inc: 5, max: 14 },
  wave: { name: 'Wave', text: 'The whole target row. +1 row per extra die.', min: 5, inc: 5, max: 50 },
  aura: { name: 'Aura', text: 'Every space of the position.', min: 99, inc: 0, max: 99 },
  rain: { name: 'Rain', text: 'Random stacks, one drop per point rolled. Can repeat.', min: 1, inc: 0, max: 99 },
};
export const CONDS = {
  match: 'at least two dice match', evens: 'every die is even', odds: 'every die is odd', run: 'the dice make a run (in sequence, like 2-3-4)',
};
export const condText = (c) => CONDS[c] || (c.startsWith('over:') ? `total is ${c.slice(5)} or more` : `total is ${c.slice(6)} or less`);

// side: whose position is targeted. roll.k is executed by the bout engine.
export const TRICKS = {
  // --- Expenses ---
  charge: { name: 'Charge', type: 'expense', cls: null, die: 'd6', count: 2, side: 'opp', approach: 'front', dist: 'hit',
    roll: { k: 'fee', text: 'Charge a fee equal to the total.' }, bonus: { cond: 'match', k: 'double', text: 'The fee is doubled.' } },
  mug: { name: 'Mug', type: 'expense', cls: 'hustler', die: 'd4', count: 2, side: 'opp', approach: 'front', dist: 'hit',
    roll: { k: 'fee', text: 'Charge a fee equal to the total.' }, bonus: { cond: 'match', k: 'glean', text: 'Chips paid go to your Bet instead of the Stage.' } },
  swipe: { name: 'Swipe', type: 'expense', cls: 'rascal', die: 'd6', count: 2, side: 'opp', approach: 'front', dist: 'swipe',
    roll: { k: 'fee', text: 'Charge a fee equal to the total, shared across the spaces.' }, bonus: { cond: 'evens', k: 'glean', text: 'Chips paid go to your Bet instead of the Stage.' } },
  jab: { name: 'Jab', type: 'expense', cls: 'technician', die: 'd8', count: 2, side: 'opp', approach: 'front', dist: 'poke',
    roll: { k: 'fee', text: 'Charge a fee equal to the total, shared down the column.' }, bonus: { cond: 'over:9', k: 'pierce', text: 'Ignores Block chips, Resist and Hardened stacks.' } },
  scorch: { name: 'Scorch', type: 'expense', cls: null, die: 'd4', count: 3, side: 'opp', approach: 'any', dist: 'hit', element: 'burn',
    roll: { k: 'fee', text: 'Charge a fee equal to the total and leave a Burning chip.' }, bonus: { cond: 'odds', k: 'spread', text: 'Hits the surrounding spaces as well (Drop).' } },
  audit: { name: 'Audit', type: 'expense', cls: 'rascal', die: 'd6', count: 1, side: 'opp', approach: 'any', dist: 'hit', tax: true,
    roll: { k: 'fee', text: 'Tax: charge 10% of the target stack\'s worth per point rolled (never less than the total).' }, bonus: { cond: 'over:5', k: 'spread', text: 'Taxes the neighbouring stack too (Swipe).' } },
  topple: { name: 'Topple', type: 'expense', cls: 'technician', die: 'd8', count: 3, side: 'opp', approach: 'rear', dist: 'hook',
    roll: { k: 'fee', text: 'Charge a fee equal to the total, shared from the rear stack forward.' }, bonus: { cond: 'match', k: 'double', text: 'The fee is doubled.' } },
  zap: { name: 'Zap', type: 'expense', cls: null, die: 'd6', count: 2, side: 'opp', approach: 'none', dist: 'rain', element: 'shock',
    roll: { k: 'fee', text: 'One 1¢ fee per point rolled, each on a random stack.' }, bonus: { cond: 'odds', k: 'element', text: 'Leaves a Shocking chip on the first stack hit.' } },
  melt: { name: 'Melt', type: 'expense', cls: 'hustler', die: 'd4', count: 2, side: 'opp', approach: 'any', dist: 'hit', element: 'acid',
    roll: { k: 'fee', text: 'Charge a fee equal to the total and leave an Acid chip.' }, bonus: { cond: 'under:4', k: 'double', text: 'The fee is doubled.' } },
  collapse: { name: 'Collapse', type: 'expense', cls: null, die: 'd8', count: 3, side: 'opp', approach: 'body', dist: 'drop',
    roll: { k: 'fee', text: 'Charge a fee equal to the total, shared across the Stake spaces hit.' }, bonus: { cond: 'over:14', k: 'pierce', text: 'Ignores Block chips, Resist and Hardened stacks.' } },
  infect: { name: 'Infect', type: 'expense', cls: null, die: 'd6', count: 2, side: 'opp', approach: 'any', dist: 'hit', element: 'corrupt',
    roll: { k: 'fee', text: 'Charge a fee equal to the total and leave a Corrupting chip.' }, bonus: { cond: 'odds', k: 'spread', text: 'Hits the neighbouring stack too (Swipe).' } },
  envenom: { name: 'Envenom', type: 'expense', cls: null, die: 'd4', count: 2, side: 'opp', approach: 'rear', dist: 'hit', element: 'poison',
    roll: { k: 'fee', text: 'Charge a fee equal to the total and leave a Poison chip.' }, bonus: { cond: 'under:4', k: 'double', text: 'The fee is doubled.' } },
  rig: { name: 'Rig', type: 'expense', cls: null, die: 'd8', count: 1, side: 'opp', approach: 'any', dist: 'hit', element: 'boom',
    roll: { k: 'fee', text: 'Charge a fee equal to the total and leave a Boom chip.' }, bonus: { cond: 'over:6', k: 'double', text: 'The fee is doubled.' } },
  fuse: { name: 'Fuse', type: 'expense', cls: 'technician', die: 'd8', count: 2, side: 'opp', approach: 'body', dist: 'hit', plant: 'dynamite',
    roll: { k: 'fee', text: 'Charge a fee equal to the total on a Stake stack, then light a stack of Dynamite on the nearest empty space: one stick burns down each turn, then it destroys every chip around it.' }, bonus: { cond: 'over:12', k: 'double', text: 'The fee is doubled.' } },
  frost: { name: 'Frost', type: 'expense', cls: null, die: 'd6', count: 2, side: 'opp', approach: 'front', dist: 'hit', element: 'frost',
    roll: { k: 'fee', text: 'Charge a fee equal to the total and leave a Frost chip: that stack cannot be bid or flipped.' }, bonus: { cond: 'evens', k: 'spread', text: 'Frosts the neighbouring stack too (Swipe).' } },
  erupt: { name: 'Erupt', type: 'expense', cls: 'technician', die: 'd8', count: 2, side: 'opp', approach: 'body', dist: 'hit', element: 'lava',
    roll: { k: 'fee', text: 'Charge a fee equal to the total on a Stake stack and leave a Lava chip.' }, bonus: { cond: 'over:12', k: 'double', text: 'The fee is doubled.' } },
  ambush: { name: 'Ambush', type: 'expense', cls: 'hustler', die: 'd6', count: 2, side: 'opp', approach: 'front', dist: 'hit', early: 'investment',
    roll: { k: 'fee', text: 'Swift: plays with the Investments, before any Insurance this turn is up. Charge a fee equal to the total.' }, bonus: { cond: 'match', k: 'pierce', text: 'Ignores Block chips, Resist and Hardened stacks.' } },
  vengeance: { name: 'Vengeance', type: 'expense', cls: null, die: 'd6', count: 2, side: 'opp', approach: 'front', dist: 'hit', vengeance: true,
    roll: { k: 'fee', text: 'Charge a fee equal to the total plus every ¢ you paid in fees last turn.' }, bonus: { cond: 'over:8', k: 'glean', text: 'Chips paid go to your Bet instead of the Stage.' } },
  // --- Insurances ---
  block: { name: 'Block', type: 'insurance', cls: null, die: 'd6', count: 2, side: 'self', approach: 'meter', dist: 'hit',
    roll: { k: 'chips', chip: 'guard', convert: 'lump', place: 'under', deploy: 'hit', text: '' }, bonus: { cond: 'evens', k: 'counter', text: 'They are Counter chips: each one also puts a Debt chip on the attacker.' } },
  brace: { name: 'Brace', type: 'insurance', cls: 'technician', die: 'd8', count: 2, side: 'self', approach: 'any', dist: 'swipe',
    roll: { k: 'chips', chip: 'brace', convert: 'lump', place: 'under', deploy: 'hit', text: '' }, bonus: { cond: 'over:9', k: 'aura', text: 'Hardens your whole position.' } },
  endure: { name: 'Endure', type: 'insurance', cls: null, die: 'd6', count: 1, side: 'none', approach: 'none', dist: 'hit',
    roll: { k: 'chips', chip: 'endure', convert: 'lump', place: 'under', deploy: 'hit', text: '' }, bonus: { cond: 'over:4', k: 'extend', text: 'Lasts through next turn as well.' } },
  hop: { name: 'Hop', type: 'insurance', cls: 'hustler', die: 'd4', count: 2, side: 'none', approach: 'none', dist: 'hit',
    roll: { k: 'chips', chip: 'hop', convert: 'lump', place: 'under', deploy: 'hit', text: '' }, bonus: { cond: 'under:4', k: 'extend', text: 'Lasts through next turn as well.' } },
  shine: { name: 'Shine', type: 'insurance', cls: 'rascal', die: 'd6', count: 2, side: 'none', approach: 'none', dist: 'hit',
    roll: { k: 'chips', chip: 'shine', convert: 'lump', place: 'under', deploy: 'hit', text: '' }, bonus: { cond: 'evens', k: 'extend', text: 'Reflects every fee this turn, not just the first.' } },
  chill: { name: 'Chill', type: 'insurance', cls: null, die: 'd6', count: 2, side: 'self', approach: 'any', dist: 'hit',
    roll: { k: 'chips', chip: 'chill', convert: 'lump', place: 'under', deploy: 'hit', text: '' }, bonus: { cond: 'evens', k: 'spread', text: 'Freezes the neighbouring stack too (Swipe).' } },
  float: { name: 'Float', type: 'insurance', cls: 'rascal', die: 'd4', count: 2, side: 'self', approach: 'any', dist: 'hit',
    roll: { k: 'chips', chip: 'float', convert: 'lump', place: 'under', deploy: 'hit', text: '' }, bonus: { cond: 'match', k: 'spread', text: 'Feathers the neighbouring stacks too (Swipe).' } },
  renew: { name: 'Renew', type: 'insurance', cls: null, die: 'd6', count: 2, side: 'self', approach: 'any', dist: 'hit',
    roll: { k: 'chips', chip: 'mend', convert: 'lump', place: 'under', deploy: 'hit', text: '' }, bonus: { cond: 'match', k: 'double', text: '' } }, // Regen as a chip: a Mend chip brings your lost chips back out of your Pit
  // --- Investments ---
  stir: { name: 'Stir', type: 'investment', cls: null, die: 'd6', count: 1, side: 'self', approach: 'any', dist: 'hit',
    roll: { k: 'chips', chip: 'stir', convert: 'lump', place: 'under', deploy: 'hit', foot: 'large', flat: true, slip: true, text: '' }, bonus: { cond: 'over:5', k: 'double', text: '' } },
  rattle: { name: 'Rattle', type: 'investment', cls: null, die: 'd6', count: 1, side: 'none', approach: 'none', dist: 'hit',
    roll: { k: 'chips', chip: 'rattle', convert: 'lump', place: 'under', deploy: 'hit', text: '' }, bonus: { cond: 'over:5', k: 'extend', text: 'They also lose half of it next turn.' } },
  bend: { name: 'Bend', type: 'investment', cls: 'rascal', die: 'd8', count: 1, side: 'none', approach: 'none', dist: 'hit', chooseRoller: true,
    roll: { k: 'chips', chip: 'bend', convert: 'lump', place: 'under', deploy: 'hit', text: '' }, bonus: { cond: 'under:3', k: 'bendopp', text: 'A low roll bends your opponent\'s dice instead.' } },
  gild: { name: 'Gild', type: 'investment', cls: 'hustler', die: 'd4', count: 2, side: 'self', approach: 'any', dist: 'hit',
    roll: { k: 'chips', chip: 'gild', convert: 'lump', place: 'under', deploy: 'hit', text: '' }, bonus: { cond: 'match', k: 'spread', text: 'Gilds the neighbouring stacks too (Swipe).' } },
  press: { name: 'Press', type: 'investment', cls: 'technician', die: 'd8', count: 1, side: 'none', approach: 'none', dist: 'hit',
    roll: { k: 'chips', chip: 'bear', convert: 'lump', place: 'under', deploy: 'hit', text: '' }, bonus: { cond: 'over:6', k: 'extend', text: 'Also grants half that much Power for next turn.' } },
  parlay: { name: 'Parlay', type: 'investment', cls: 'hustler', die: 'd6', count: 1, side: 'none', approach: 'none', dist: 'hit',
    roll: { k: 'chips', chip: 'parlay', convert: 'lump', place: 'under', deploy: 'hit', text: '' }, bonus: { cond: 'over:6', k: 'none', text: 'A six is always even. Nothing more to add.' } },
  saturate: { name: 'Saturate', type: 'investment', cls: 'rascal', die: 'd6', count: 2, side: 'none', approach: 'none', dist: 'hit',
    roll: { k: 'chips', chip: 'saturate', convert: 'lump', place: 'under', deploy: 'hit', text: '' }, bonus: { cond: 'match', k: 'extend', text: 'Their Power is drained to nothing as well.' } },
  // --- Corrections ---
  settle: { name: 'Settle', type: 'correction', cls: null, die: 'd6', count: 1, side: 'self', approach: 'any', dist: 'hit',
    roll: { k: 'chips', chip: 'settle', convert: 'lump', place: 'under', deploy: 'hit', text: '' }, bonus: { cond: 'over:5', k: 'blocks', text: 'Also adds 2 Block chips to your Bet.' } },
  gather: { name: 'Gather', type: 'correction', cls: null, die: 'd6', count: 2, side: 'none', approach: 'none', dist: 'hit',
    roll: { k: 'chips', chip: 'gather', convert: 'lump', place: 'under', deploy: 'hit', text: '' }, bonus: { cond: 'match', k: 'both', text: 'Takes from your opponent\'s paid fees as well.' } },
  scatter: { name: 'Scatter', type: 'correction', cls: 'rascal', die: 'd6', count: 2, side: 'none', approach: 'none', dist: 'hit',
    roll: { k: 'chips', chip: 'scatter', convert: 'lump', place: 'under', deploy: 'hit', text: '' }, bonus: { cond: 'match', k: 'double', text: 'Scatters twice as many.' } },
  sweep: { name: 'Sweep', type: 'correction', cls: 'technician', die: 'd8', count: 1, side: 'none', approach: 'none', dist: 'hit',
    roll: { k: 'chips', chip: 'sweep', convert: 'lump', place: 'under', deploy: 'hit', text: '' }, bonus: { cond: 'over:6', k: 'unharden', text: 'Also removes Hardened from every stack.' } },
  // Arrangements: corrections that move chips around a position. `arrange` names the move (see ARRANGE).
  // Lanes run from the Stage to the edge; forward is toward the Stage. They act on the lanes (or, for Lift and
  // Sink, the rows) their spread covers. Anchored stacks, Holes and Dynamite stay put; Debt and hazards stay
  // on their space, or move to the nearest stack in the lane if their space ends up empty.
  // Movement is chip driven (round 19): each of these lays chips that do the moving (content/chipmaker.js), one for
  // every point of the roll, spreading out from the target: the bigger the roll, the more rows or columns it reaches.
  retreat: { name: 'Retreat', type: 'correction', cls: 'rascal', die: 'd6', count: 2, side: 'self', approach: 'any', dist: 'swipe',
    roll: { k: 'chips', chip: 'press', convert: 'petty', place: 'under', deploy: 'sides', text: '' }, bonus: { cond: 'match', k: 'double', text: '' } },
  advance: { name: 'Advance', type: 'correction', cls: 'hustler', die: 'd6', count: 2, side: 'self', approach: 'any', dist: 'swipe',
    roll: { k: 'chips', chip: 'drawback', convert: 'petty', place: 'under', deploy: 'sides', text: '' }, bonus: { cond: 'match', k: 'double', text: '' } },
  lift: { name: 'Lift', type: 'correction', cls: null, die: 'd4', count: 2, side: 'self', approach: 'any', dist: 'wave',
    roll: { k: 'chips', chip: 'rise', convert: 'petty', place: 'under', deploy: 'line', text: '' }, bonus: { cond: 'evens', k: 'double', text: '' } },
  sink: { name: 'Sink', type: 'correction', cls: null, die: 'd4', count: 2, side: 'self', approach: 'any', dist: 'wave',
    roll: { k: 'chips', chip: 'drop', convert: 'petty', place: 'under', deploy: 'line', text: '' }, bonus: { cond: 'evens', k: 'double', text: '' } },
  // pushing and shoving, tugging and pulling: one stack moved, and what it pushes
  shove: { name: 'Shove', type: 'correction', cls: null, die: 'd6', count: 2, side: 'opp', approach: 'any', dist: 'hit',
    roll: { k: 'chips', chip: 'shove', convert: 'lump', place: 'under', deploy: 'hit', text: '' }, bonus: { cond: 'match', k: 'double', text: '' } },
  tug: { name: 'Tug', type: 'correction', cls: null, die: 'd6', count: 2, side: 'self', approach: 'any', dist: 'hit',
    roll: { k: 'chips', chip: 'tug', convert: 'lump', place: 'under', deploy: 'hit', text: '' }, bonus: { cond: 'match', k: 'double', text: '' } },
  hoist: { name: 'Hoist', type: 'correction', cls: null, die: 'd4', count: 1, side: 'self', approach: 'any', dist: 'hit',
    roll: { k: 'chips', chip: 'hoist', convert: 'lump', place: 'under', deploy: 'hit', text: '' }, bonus: { cond: 'over:3', k: 'extra', chip: 'block', n: 1, text: '' } },
  tuck: { name: 'Tuck', type: 'correction', cls: null, die: 'd4', count: 1, side: 'self', approach: 'any', dist: 'hit',
    roll: { k: 'chips', chip: 'tuck', convert: 'lump', place: 'under', deploy: 'hit', text: '' }, bonus: { cond: 'over:3', k: 'extra', chip: 'block', n: 1, text: '' } },
  bulwark: { name: 'Bulwark', type: 'correction', cls: 'technician', die: 'd8', count: 2, side: 'self', approach: 'any', dist: 'swipe',
    roll: { k: 'chips', chip: 'bulwark', convert: 'lump', place: 'under', deploy: 'hit', text: '' }, bonus: { cond: 'over:10', k: 'aura', text: 'Arranges your whole position.' } },
  stackup: { name: 'Stack Up', type: 'correction', cls: null, die: 'd6', count: 2, side: 'self', approach: 'any', dist: 'swipe',
    roll: { k: 'chips', chip: 'stackup', convert: 'lump', place: 'under', deploy: 'hit', text: '' }, bonus: { cond: 'match', k: 'aura', text: 'Sorts your whole position.' } },
  stash: { name: 'Stash', type: 'correction', cls: null, die: 'd6', count: 2, side: 'self', approach: 'any', dist: 'swipe',
    roll: { k: 'chips', chip: 'stash', convert: 'lump', place: 'under', deploy: 'hit', text: '' }, bonus: { cond: 'match', k: 'aura', text: 'Sorts your whole position.' } },
  expose: { name: 'Expose', type: 'correction', cls: 'rascal', die: 'd6', count: 2, side: 'opp', approach: 'any', dist: 'swipe',
    roll: { k: 'chips', chip: 'expose', convert: 'lump', place: 'under', deploy: 'hit', text: '' }, bonus: { cond: 'evens', k: 'aura', text: 'Drags their whole position.' } },
  rout: { name: 'Rout', type: 'correction', cls: 'technician', die: 'd8', count: 2, side: 'opp', approach: 'any', dist: 'swipe',
    roll: { k: 'chips', chip: 'rout', convert: 'lump', place: 'under', deploy: 'hit', text: '' }, bonus: { cond: 'over:10', k: 'aura', text: 'Routs their whole position.' } },
  gum: { name: 'Gum Up', type: 'correction', cls: 'rascal', die: 'd4', count: 2, side: 'opp', approach: 'any', dist: 'hit',
    roll: { k: 'chips', chip: 'gum', convert: 'lump', place: 'under', deploy: 'hit', text: '' }, bonus: { cond: 'match', k: 'spread', text: 'Gums the neighbouring stacks too (Swipe).' } },
  foretell: { name: 'Foretell', type: 'correction', cls: null, die: 'd6', count: 2, side: 'opp', approach: 'front', dist: 'swipe',
    roll: { k: 'chips', chip: 'foretell', convert: 'lump', place: 'under', deploy: 'hit', text: '' }, bonus: { cond: 'evens', k: 'aura', text: 'Plants on every stack.' } },
  conjure: { name: 'Conjure', type: 'correction', cls: 'technician', die: 'd8', count: 2, side: 'opp', approach: 'any', dist: 'hit',
    roll: { k: 'chips', chip: 'conjure', convert: 'lump', place: 'under', deploy: 'hit', text: '' }, bonus: { cond: 'match', k: 'spread', text: 'Slips Hats under the neighbouring stacks too (Swipe).' } },
  handoff: { name: 'Hand Off', type: 'correction', cls: 'hustler', die: 'd4', count: 1, side: 'opp', approach: 'any', dist: 'hit',
    roll: { k: 'chips', chip: 'handoff', convert: 'lump', place: 'under', deploy: 'hit', text: '' }, bonus: { cond: 'over:3', k: 'spread', text: 'Hands off one more Uranium chip next door.' } },
  fence: { name: 'Fence', type: 'correction', cls: 'hustler', die: 'd4', count: 2, side: 'none', approach: 'none', dist: 'hit',
    roll: { k: 'chips', chip: 'fence', convert: 'lump', place: 'under', deploy: 'hit', text: '' }, bonus: { cond: 'match', k: 'blocks', text: 'Also adds 2 Block chips to your Bet.' } },
  // --- Makers ---
  // A maker places an effect chip where it belongs: Investments that work on your rolls on a Bet space (empty or
  // not), Insurances and Corrections on the stack they protect or clear. You aim it there; it is placed when it plays. The chip is physical: it
  // takes stack height, a fee that reaches it knocks it off, Corrections move it. While it lasts it does its work in
  // its trick's phase each turn. make: { chip, n: [base, per], life: [base, per] }: base + one more per `per` rolled.
  // These chips used to be sold at the Chip Exchange; an effect a trick can make is not sold.
  empower: { name: 'Empower', type: 'investment', cls: null, die: 'd6', count: 2, side: 'self', approach: 'meter', dist: 'hit',
    roll: { k: 'chips', chip: 'power', n: [1, 6], life: [2, 4], convert: 'lump', place: 'over', deploy: 'hit', text: 'Place Power chips on the target Bet space (1, +1 per 6 rolled). In each Investment phase every Power chip adds 1 to your roll effects. They last 2 turns, +1 per 4 rolled.' }, bonus: { cond: 'match', k: 'spread', text: 'Places them on the neighbouring spaces too (Swipe).' } },
  throttle: { name: 'Throttle', type: 'investment', cls: 'rascal', die: 'd6', count: 2, side: 'self', approach: 'meter', dist: 'hit',
    roll: { k: 'chips', chip: 'control', n: [1, 6], life: [2, 4], convert: 'lump', place: 'over', deploy: 'hit', text: 'Place Control chips on the target Bet space (1, +1 per 6 rolled). In each Investment phase every Control chip takes 1 off your opponent\'s roll effects. They last 2 turns, +1 per 4 rolled.' }, bonus: { cond: 'evens', k: 'spread', text: 'Places them on the neighbouring spaces too (Swipe).' } },
  load: { name: 'Load', type: 'investment', cls: 'hustler', die: 'd4', count: 2, side: 'self', approach: 'meter', dist: 'hit',
    roll: { k: 'chips', chip: 'boosted', n: [1, 8], life: [1, 4], convert: 'lump', place: 'over', deploy: 'hit', text: 'Place a Boosted chip on the target Bet space (+1 per 8 rolled): every die you roll shows 1 more per Boosted chip. It lasts 1 turn, +1 per 4 rolled.' }, bonus: { cond: 'match', k: 'spread', text: 'Places them on the neighbouring spaces too (Swipe).' } },
  shave: { name: 'Shave', type: 'investment', cls: 'technician', die: 'd8', count: 2, side: 'self', approach: 'meter', dist: 'hit',
    roll: { k: 'chips', chip: 'cheapened', n: [1, 10], life: [1, 5], convert: 'lump', place: 'over', deploy: 'hit', text: 'Place a Cheapened chip on the target Bet space (+1 per 10 rolled): every die your opponent rolls shows 1 less per Cheapened chip. It lasts 1 turn, +1 per 5 rolled.' }, bonus: { cond: 'over:12', k: 'spread', text: 'Places them on the neighbouring spaces too (Swipe).' } },
  tinker: { name: 'Tinker', type: 'investment', cls: null, die: 'd6', count: 1, side: 'self', approach: 'meter', dist: 'hit',
    roll: { k: 'chips', chip: 'upgrade', n: [1, 99], life: [1, 3], convert: 'lump', place: 'over', deploy: 'hit', text: 'Place an Upgrade chip on the target Bet space: while it is there, every die you roll takes a random upgrade (good or bad) for that roll. It lasts 1 turn, +1 per 3 rolled.' }, bonus: { cond: 'over:5', k: 'spread', text: 'Places one on a neighbouring space too (Swipe).' } },
  charm: { name: 'Charm', type: 'investment', cls: 'hustler', die: 'd4', count: 2, side: 'self', approach: 'meter', dist: 'hit',
    roll: { k: 'chips', chip: 'lucky', n: [1, 6], life: [2, 4], convert: 'lump', place: 'over', deploy: 'hit', text: 'Place Lucky chips on the target Bet space (1, +1 per 6 rolled). In each Investment phase each one has a 30% chance to put an Opportunity chip on your Bet. They last 2 turns, +1 per 4 rolled.' }, bonus: { cond: 'match', k: 'spread', text: 'Places them on the neighbouring spaces too (Swipe).' } },
  stow: { name: 'Stow', type: 'investment', cls: null, die: 'd6', count: 2, side: 'self', approach: 'meter', dist: 'hit',
    roll: { k: 'chips', chip: 'nest', n: [1, 7], life: [99, 99], convert: 'lump', place: 'over', deploy: 'hit', text: 'Place Nest Egg chips on the target Bet space (1, +1 per 7 rolled). They last the bout; each one still on your table when you win pays 15¢.' }, bonus: { cond: 'evens', k: 'spread', text: 'Places them on the neighbouring spaces too (Swipe).' } },
  echo: { name: 'Echo', type: 'investment', cls: 'rascal', die: 'd8', count: 1, side: 'self', approach: 'any', dist: 'hit',
    roll: { k: 'chips', chip: 'mimic', n: [1, 99], life: [1, 3], convert: 'lump', place: 'over', deploy: 'hit', text: 'Place a Mimic chip on top of the target stack: each phase while it is on top, one of your tricks of that type plays its roll effect again. It lasts 1 turn, +1 per 3 rolled.' }, bonus: { cond: 'over:6', k: 'spread', text: 'Places one on a neighbouring stack too (Swipe).' } },
  cushion: { name: 'Cushion', type: 'insurance', cls: null, die: 'd6', count: 2, side: 'self', approach: 'any', dist: 'hit',
    roll: { k: 'chips', chip: 'reducer', n: [1, 5], life: [2, 4], convert: 'lump', place: 'over', deploy: 'hit', text: 'Place Reducer chips on the target stack (1, +1 per 5 rolled): every fee that lands on it is 1¢ smaller per chip. They last 2 turns, +1 per 4 rolled.' }, bonus: { cond: 'match', k: 'spread', text: 'Places them on the neighbouring stacks too (Swipe).' } },
  wardoff: { name: 'Ward Off', type: 'insurance', cls: null, die: 'd8', count: 1, side: 'self', approach: 'any', dist: 'hit',
    roll: { k: 'chips', chip: 'ward', n: [1, 99], life: [1, 6], convert: 'lump', place: 'over', deploy: 'hit', text: 'Place a Ward chip on the target stack: when the House settles, it cancels the largest fee charged to your position. It lasts 1 turn, +1 per 6 rolled.' }, bonus: { cond: 'over:6', k: 'spread', text: 'Places one on a neighbouring stack too (Swipe).' } },
  recoil: { name: 'Recoil', type: 'insurance', cls: 'rascal', die: 'd6', count: 2, side: 'self', approach: 'any', dist: 'hit',
    roll: { k: 'chips', chip: 'rebound', n: [1, 6], life: [2, 4], convert: 'lump', place: 'over', deploy: 'hit', text: 'Place Rebound chips on the target stack (1, +1 per 6 rolled): each fee on it sends 2¢ of Debt back to the attacker per chip. They last 2 turns, +1 per 4 rolled.' }, bonus: { cond: 'evens', k: 'spread', text: 'Places them on the neighbouring stacks too (Swipe).' } },
  electrify: { name: 'Electrify', type: 'insurance', cls: 'technician', die: 'd6', count: 2, side: 'self', approach: 'any', dist: 'hit',
    roll: { k: 'chips', chip: 'zap', n: [1, 8], life: [2, 4], convert: 'lump', place: 'over', deploy: 'hit', text: 'Place a Zap chip on the target stack (+1 per 8 rolled): a fee of 3¢ or less there shocks the attacker; a bigger one shorts it out. It lasts 2 turns, +1 per 4 rolled.' }, bonus: { cond: 'over:9', k: 'spread', text: 'Places them on the neighbouring stacks too (Swipe).' } },
  moor: { name: 'Moor', type: 'insurance', cls: 'hustler', die: 'd4', count: 2, side: 'self', approach: 'any', dist: 'hit',
    roll: { k: 'chips', chip: 'anchor', n: [1, 99], life: [2, 3], convert: 'lump', place: 'over', deploy: 'hit', text: 'Place an Anchor chip on the target stack: creatures, Scatter, the Tornado and the Black Hole cannot take from it, and Corrections do not move it. It lasts 2 turns, +1 per 3 rolled.' }, bonus: { cond: 'match', k: 'spread', text: 'Anchors the neighbouring stacks too (Swipe).' } },
  veil: { name: 'Veil', type: 'insurance', cls: 'rascal', die: 'd4', count: 2, side: 'self', approach: 'any', dist: 'hit',
    roll: { k: 'chips', chip: 'transpara', n: [1, 99], life: [1, 3], convert: 'lump', place: 'over', deploy: 'hit', text: 'Place a Transpara-Chip on the target stack: your opponent cannot aim at it (spreads, rain and hazards still reach it). It lasts 1 turn, +1 per 3 rolled.' }, bonus: { cond: 'evens', k: 'spread', text: 'Veils the neighbouring stacks too (Swipe).' } },
  shade: { name: 'Shade', type: 'insurance', cls: null, die: 'd4', count: 2, side: 'self', approach: 'any', dist: 'hit',
    roll: { k: 'chips', chip: 'shadow', n: [1, 99], life: [2, 3], convert: 'lump', place: 'over', deploy: 'hit', text: 'Place a Shadow chip on the target stack: it cannot be aimed at while the stack in front of it is taller. It lasts 2 turns, +1 per 3 rolled.' }, bonus: { cond: 'match', k: 'spread', text: 'Shades the neighbouring stacks too (Swipe).' } },
  attune: { name: 'Attune', type: 'correction', cls: null, die: 'd6', count: 2, side: 'self', approach: 'any', dist: 'hit',
    roll: { k: 'chips', chip: 'harmony', n: [1, 6], life: [2, 4], convert: 'lump', place: 'over', deploy: 'hit', text: 'Place Harmony chips on the target stack (1, +1 per 6 rolled). In each Correction phase each one clears a hazard chip or 1¢ of Debt on its stack or the stacks around it, leaving a 1¢ chip in place of a hazard. They last 2 turns, +1 per 4 rolled.' }, bonus: { cond: 'match', k: 'spread', text: 'Places them on the neighbouring stacks too (Swipe).' } },
};
export const TRICK_IDS = Object.keys(TRICKS);

// ---------- Chips ----------
// The basic value chips. `floor`: the first floor whose tables deal them (5 = the Paradise Ascent). Up to 500¢ they
// are Royal Paradise chips named by value; from 1000¢ the metal and gem chips go by name, with a short `glyph`.
// `color`: the chip list's colour for it.
export const DENOMS = [
  { value: 1, floor: 1, color: 'White' }, { value: 2, floor: 2, color: 'Blue' }, { value: 5, floor: 2, color: 'Red' }, { value: 10, floor: 3, color: 'Yellow' },
  { value: 25, floor: 3, color: 'Green' }, { value: 50, floor: 4, color: 'Purple' }, { value: 100, floor: 4, color: 'Orange' }, { value: 250, floor: 4, color: 'Black' },
  { value: 500, floor: 5, color: 'White' }, { value: 1000, floor: 5, name: 'Silver', glyph: '1K' }, { value: 2500, floor: 5, name: 'Ruby', glyph: '2.5K' },
  { value: 5000, floor: 5, name: 'Emerald', glyph: '5K' }, { value: 10000, floor: 5, name: 'Sapphire', glyph: '10K' }, { value: 25000, floor: 5, name: 'Amber', glyph: '25K' },
  { value: 50000, floor: 5, name: 'Diamond', glyph: '50K' },
];
for (const d of DENOMS) if (d.value >= 25) d.list = d.value === 10000 ? 'Saphire Chip' : `${d.name || d.color} Chip`; // their rows on the chip list
export const DENOM_VALUES = DENOMS.map((d) => d.value);
export const denomOf = (v) => DENOMS.find((d) => d.value === v) || null;
export const denomName = (v) => (denomOf(v)?.name ? `${denomOf(v).name} chip` : `Royal Paradise ${v}¢ chip`);
export const ASCENT_FLOOR = 5;
export const CHIPS = {
  std: { name: 'Royal Paradise chip', type: 'Basic', text: 'Basic value chip. Pays fees up to its value; a smaller fee leaves Debt chips on top instead. Can be bid.' },
  opp: { name: 'Opportunity chip', text: 'Earned during a bout for unused rolls. Worth 1¢ and can be bid. Fragile: lost at the end, but each one left pays a bonus chip if you win.' },
  block: { name: 'Block chip', text: 'Deterrent. Absorbs 1¢ of a fee and breaks. No worth. Fragile.' },
  counter: { name: 'Counter chip', text: 'Deterrent. Absorbs 1¢ of a fee and puts a Debt chip on the attacker. No worth. Fragile.' },
  debt: { name: 'Debt chip', text: 'A fee waiting to be paid, shown as one marker with the exact amount. It already counts against Worth and blocks bidding from this stack. It pays the chip beneath once it reaches that chip\'s value, from any later fee.' },
  burn: { name: 'Burning chip', text: 'Hazard. Each turn it destroys the chip beneath it and has a 30% chance to spread to a neighbouring stack. Burns out after 3 turns.' },
  acid: { name: 'Acid chip', text: 'Hazard. Each turn it destroys the chip beneath it. When it reaches the table it leaves a Hole.' },
  shock: { name: 'Shocking chip', text: 'Hazard. Each turn it puts 1¢ of Debt on two other stacks. Fades after 2 turns.' },
  corrupt: { name: 'Corrupting chip', text: 'Hazard. Each turn it puts 1¢ of Debt on its stack and has a 60% chance to spread to another stack. Fades after 3 turns.' },
  poison: { name: 'Poison chip', text: 'Hazard. Each turn it puts 1¢ of Debt on its stack. It lingers until the stack is gone or it is cleansed.' },
  puddle: { name: 'Puddle chip', type: 'Ground', text: 'Water with no thickness, always at the bottom of its space. On an empty space nothing can be played until it dries, after a turn without water. Wets the stack on it. Frozen over, it grounds the Frozen chips above it.' },
  boom: { name: 'Boom chip', text: 'Hazard. The turn after it lands it goes off: 5¢ of Debt on its stack and on every stack around it.' },
  // conversions and growth from the workbook's chip list. Instance shields take a whole fee each, not 1¢.
  frozen: { name: 'Frozen chip', text: 'Several wet Royal Paradise chips frozen into one, worth their sum. Anywhere else it is an ordinary chip of that value. Standing in an iced-over Puddle it is frozen to the ground: it cannot be bid or flipped, and cannot be burned, corrupted, shocked or turned into another chip. A fee smaller than it only leaves Debt.' },
  frost: { name: 'Frost chip', text: 'Hazard (Cold). Its stack is frosted over: nothing on it can be bid or flipped. Thaws after 2 turns, or at once if a Burning or Lava chip reaches it.' },
  lava: { name: 'Lava chip', text: 'Hazard (Heat). Each turn it melts the chip beneath it and spills a Burning chip onto a stack next to it. Cools after 2 turns.' },
  feather: { name: 'Feather chip', text: 'A chip turned light for a few turns: any fee larger than its stack\'s worth misses the stack.' },
  flower: { name: 'Flower chip', text: 'Grown from a Seed. Each turn it blooms a Petal on the stacks around it, one per chip it is rooted in (up to 8). Blocks one entire fee and breaks.' },
  petal: { name: 'Petal chip', text: 'Bloomed by a Flower. Blocks one entire fee, however big, and breaks: fee instance defence, where a Block chip only takes 1¢ of a fee\'s cost. Wilts after 2 turns.' },
  clay: { name: 'Clay chip', text: 'Blocks entire fees, one per hit, and breaks after its count of hits. Fire bakes it into Brick.' },
  brick: { name: 'Brick chip', text: 'Baked Clay. Takes twice as many fees as the clay did before it breaks.' },
  stray: { name: 'Stray Debt', text: 'A fee that landed on nothing. It comes to nothing when the House settles.' },
  hard: { name: 'Hardened chip', text: 'Lies over its stack for a few turns: each fee takes only one chip from the stack and nothing carries on. No worth. A piercing fee destroys it; cleansing removes it.' },
  sticky: { name: 'Sticky chip', text: 'Gummed onto a stack by an opponent. The first timed modifier on the stack (Hardened, Feather, Regen, a Burning, Shocking, Corrupting, Frost or Lava chip, or Petals) stops counting down while it stays. Its value is the height of the stack it stuck to. It is Sticky, and makes the chip it touches sticky: sticky chips bind to the value chips they touch and their values combine into one, so the stack fuses. Cleansing removes it.' },
  hive: { name: 'Hive chip', text: 'A spawner. Every second turn each Hive chip in a stack sends out a Bumble Bee (your familiar). Takes damage like a Petal: each whole fee breaks one Hive chip.' },
  little: { name: 'Little chip', text: 'Tiny: takes no stack height and has no worth. Blocks one whole fee (one hit instance). Only other Little chips can go on top of it.' },
  egg: { name: 'Dragon Egg', text: 'Hatches a Dragon after 5 hatch steps: one a turn, one more on a Dragon Roost, one more next to heat (fire, lava, a Sun overhead). Takes 5 whole fees before it breaks, and a broken egg never hatches. Edible.' },
  hat: { name: 'Magic Hat', text: 'A hole you can move. It always sits at the bottom of its stack and each turn the chip on it falls in and is lost. Corrections move it like a chip. Dangerous to its owner, so it is planted on the opponent.' },
  doom: { name: 'Doom chip', text: 'Planted by Foretell. Its victim sees a plain 1¢ chip. While every one of the victim\'s stacks has a Doom chip on top, each Doom chip charges 1¢ of Debt every turn (instance debt). Any fee knocks it off.' },
  volcano: { name: 'Volcano chip', text: 'A Calamity in chip form: a full stack, two spaces by two where there is room. Nothing can be placed on it. For four turns it launches Burning chips, then goes dormant; the space returns with one less stack height.' },
  treasure: { name: 'Treasure chip', text: 'A chest of 50 to 100 Gold chips, dropped by a sunk Ghost Ship. Gold: it cannot be bid but pays double if it survives the bout. One in ten carries a Cursed chip with it.' },
  cursed: { name: 'Cursed chip', text: 'Looks like a Gold chip. While it is in your pile, every turn one of Draw, Roll or Bid is 1 lower (never below 1). The curse lifts when it leaves your pile.' },
  resist: { name: 'Resist chip', text: 'Debt resistance, made by Resist Cards. Fees smaller than its r on its stack are deterred entirely, the way a Red chip keeps fire off. It cannot exceed the stack height.' },
  food: { name: 'Food chip', text: 'Delicious. Double-click it while it is on top of one of your stacks to eat it for a bonus to your attributes.' },
  dip: { name: 'Dip chip', text: 'A bowl of dip on its own space. Each Chip Chip you eat is dipped first for twice the bonus, until the dip runs out.' },
  bounty: { name: 'Bounty chip', text: 'Dropped by a creature driven off by Debt. Worth its bounty and can be bid, but it is fragile: any fee that reaches it breaks it. Still on your table when the bout ends, it pays its worth, win or lose.' },
  tree: { name: 'Tree chip', text: 'A tree growing on its own space, one chip taller a turn. At full height it seeds the stacks around it. A fee that hits it fells it into Wood.' },
  wood: { name: 'Wood chip', text: 'Fell from a Tree. Blocks two entire fees, one per hit, then breaks.' },
  dynamite: { name: 'Dynamite', text: 'A stack of sticks on an empty space. One burns down each turn; when the last goes, every chip on the stacks around it is destroyed. Cleansing removes it.' },
};
// Chips no trick or table effect makes are sold at the Chip Exchange. Their price comes from a tier: how strong
// the chip is, or how strong it is meant to feel until it has been tuned. Change a tier's price or floor here
// and every chip in it follows. A chip can set its own `price` to step outside its tier.
export const CHIP_TIERS = [
  null,
  { name: 'Common', price: 20, floor: 1, color: '#c9d3e0' },
  { name: 'Uncommon', price: 80, floor: 1, color: '#7dffb5' },
  { name: 'Rare', price: 300, floor: 2, color: '#63c4ff' },
  { name: 'Epic', price: 1500, floor: 3, color: '#b08cff' },
  { name: 'Royal', price: 15000, floor: 4, color: '#ffd76a' },
];
// Shop chips are worth 1¢ like any other chip and are deployed at the base of your stacks. They are staked at
// their shop price: a win pays the wager multiplier on that stake (SHOP_CHIP_STAKE), and the chips that survive
// come back to you. A loss takes them, as before. `resist`: the hazard a stack holding one is immune to.
// `vars`: the numbers each effect reads, kept here so they can be tuned without touching the engine.
// The chip object carries its shop id in `resist` (the field predates the specials) and in `shop`.
// `kind`: a shop chip that is not a value chip (default: a 1¢ Royal Paradise chip). `place`: 'top' puts it on
// top of a stack instead of at the base. `list`: its row in docs/CHIP-LIST.tsv.
export const SHOP_CHIPS = {
  burn: { name: 'Red chip', tier: 1, resist: 'burn', also: ['lava'], verb: 'extinguishes', glyph: '◆',
    text: 'A stack holding one extinguishes Burning and Lava chips and cannot catch fire.' },
  frost: { name: 'Orange chip', tier: 2, resist: 'frost', verb: 'thaws', glyph: '◆',
    text: 'A stack holding one thaws Frost chips, so it can always be bid from.' },
  shock: { name: 'Blue chip', tier: 1, resist: 'shock', verb: 'absorbs', glyph: '◆',
    text: 'A stack holding one absorbs Shocking chips and is skipped by their Debt.' },
  acid: { name: 'Yellow chip', tier: 1, resist: 'acid', verb: 'neutralizes', glyph: '◆',
    text: 'A stack holding one neutralizes Acid chips.' },
  corrupt: { name: 'Violet chip', tier: 2, resist: 'corrupt', verb: 'purifies', glyph: '◆',
    text: 'A stack holding one purifies Corrupting chips and cannot be corrupted.' },
  poison: { name: 'Green chip', tier: 2, resist: 'poison', verb: 'cures', glyph: '◆',
    text: 'A stack holding one cures Poison chips.' },
  boom: { name: 'Black chip', tier: 3, resist: 'boom', verb: 'defuses', glyph: '◆',
    text: 'A stack holding one defuses Boom chips before they go off. It still takes Debt from a blast next door.' },
  reducer: { name: 'Reducer chip', tier: 2, sold: false, from: 'trick:cushion', glyph: '◎', vars: { absorb: 1 }, list: 'Reducer Chip',
    text: (v) => `Every fee that lands on its stack is ${v.absorb}¢ smaller. Pierce goes straight through it.` },
  anchor: { name: 'Anchor chip', tier: 2, sold: false, from: 'trick:moor', glyph: '⚓', list: 'Anchor Chip',
    text: () => 'Creatures, Scatter, the Tornado and the Black Hole cannot take chips from its stack.' },
  nest: { name: 'Nest Egg chip', tier: 2, sold: false, from: 'trick:stow', glyph: '◒', vars: { payout: 15 },
    text: (v) => `If it is still on the table when you win, it pays ${v.payout}¢ on top of your winnings.` },
  rebound: { name: 'Rebound chip', tier: 3, sold: false, from: 'trick:recoil', glyph: '◐', vars: { reflect: 2 },
    text: (v) => `Each fee on its stack sends ${v.reflect}¢ of Debt back to the attacker's front stack in the same lane. The fee is still charged.` },
  lucky: { name: 'Lucky chip', tier: 3, sold: false, from: 'trick:charm', glyph: '✦', vars: { chance: 0.3 },
    text: (v) => `In each Investment phase, a ${Math.round(v.chance * 100)}% chance to put an Opportunity chip on your Bet.` },
  transpara: { name: 'Transpara-Chip', tier: 3, sold: false, from: 'trick:veil', glyph: '◌', list: 'Transpara-Chip',
    text: () => 'Its stack cannot be aimed at by your opponent. Spreads, rain and hazards (fire, shock, corruption) still reach it.' },
  // from the workbook's chip list
  seed: { name: 'Seed chip', tier: 2, glyph: '❀', place: 'top', list: 'Seed p¢ Chip',
    text: () => 'Goes on top of a stack. If the stack has at least 2 chips when the bout starts, it sprouts into a Flower chip that blooms Petals around it each turn. Each Petal takes a whole fee.' },
  clay: { name: 'Clay chip', tier: 2, glyph: '▤', kind: 'clay', place: 'top', vars: { hits: 2 }, list: 'Clay Chip',
    text: (v) => `Goes on top of a stack. Blocks ${v.hits} entire fees, one per hit, then breaks. Fire on its stack bakes it into a Brick chip that takes twice as many. No worth.` },
  harmony: { name: 'Harmony chip', tier: 3, sold: false, from: 'trick:attune', glyph: '☯', vars: { per: 1 }, list: 'Harmony Chip',
    text: (v) => `In each Correction phase it clears ${v.per} hazard chip or ¢ of Debt from its stack or the stacks around it. A hazard chip it clears is replaced by a 1¢ chip if there is room.` },
  power: { name: 'Power chip', tier: 2, sold: false, from: 'trick:empower', glyph: '⚡︎', vars: { boost: 1, turns: 4 }, list: 'Power Chip',
    text: (v) => `Your roll effects gain ${v.boost} for each turn it is on the table (from the Investment phase, or at once if it arrives during play).` },
  control: { name: 'Control chip', tier: 2, sold: false, from: 'trick:throttle', glyph: '⊘', vars: { enfeeble: 1, turns: 4 }, list: 'Control Chip',
    text: (v) => `In each Investment phase your opponent's roll effects lose ${v.enfeeble}.` },
  ward: { name: 'Ward chip', tier: 4, sold: false, from: 'trick:wardoff', glyph: '⛨', vars: { per: 1 }, list: 'Ward Chip',
    text: (v) => `Each turn the House cancels the ${v.per > 1 ? v.per + ' largest fees' : 'largest fee'} charged to your position.` },
  shadow: { name: 'Shadow chip', tier: 2, sold: false, from: 'trick:shade', glyph: '◗', list: 'Shadow Chip',
    text: () => 'Its stack cannot be aimed at while the stack in front of it in the lane is taller.' },
  tree: { name: 'Tree chip', tier: 3, glyph: '🌳', kind: 'tree', place: 'space', list: 'Tree Chip',
    text: () => 'Planted on an empty Stake space. It grows a chip taller each turn; at full height it drops a Seed on each stack around it (one per chip of height, up to 8). A fee that hits it fells it: it blocks that fee and falls into Wood chips on the spaces around it, one per chip of height. No worth.' },
  sun: { name: 'Sun chip', tier: 3, glyph: '☀', place: 'sky', list: 'Sun Chip',
    text: () => 'Orbital: it goes up into your sky, not onto a stack. While it shines your Flowers bloom twice as many Petals, your Trees grow twice as fast, Puddles dry and eggs hatch faster.' },
  heli: { name: 'Heli-Chipter', tier: 3, glyph: '🚁', place: 'top', list: 'Heli-Chipter',
    text: () => 'Goes on top of a stack and lifts it: the stack is flying and plays from the bottom. Bids take its bottom chip and fees pay from the bottom up to the Heli-Chipter.' },
  hive: { name: 'Hive chip', tier: 3, sold: false, from: 'tilt:familiar', glyph: '🐝', kind: 'hive', place: 'space', vars: { hits: 1, every: 2, max: 6 }, list: 'Hive Chip',
    text: (v) => `A spawner on its own space (Hive chips stack together). Every ${v.every} turns each Hive chip in the stack sends out a Bumble Bee, up to ${v.max} bees. Each Hive chip takes one whole fee, like a Petal.` },
  battery: { name: 'Battery chip', tier: 3, glyph: '🔋', list: 'Battery Chip', tags: ['electric'],
    text: () => 'Energizes the electrical and electronic chips above it in its stack: each gets one more instance a turn (a Zap shocks one more stack, a Repeater repeats once more, a Forgetter forgets once more…).' },
  repeater: { name: 'Repeater chip', tier: 4, glyph: '⟳', place: 'top', list: 'Repeater Chip', tags: ['electronic'],
    text: () => 'Electronic. On top of a stack with n chips under it: each of your tricks whose dice total n plays its roll effect again (once more per Battery under it).' },
  mimic: { name: 'Mimic chip', tier: 4, sold: false, from: 'trick:echo', glyph: '🎭', place: 'top', list: 'Mimic Chip',
    text: () => 'While it is on top of one of your stacks, each phase of the turn one of your tricks of that type, picked at random, plays its roll effect again. One repeat per Mimic on top.' },
  forgetter: { name: 'Forgetter chip', tier: 4, glyph: '⌀', place: 'top', list: 'Forgetter Chip', tags: ['electronic'],
    text: () => 'Electronic. On top of a stack with n chips under it: the first of your opponent\'s tricks each turn whose dice total n is forgotten (its roll effect does nothing). One more per Battery under it.' },
  tesla: { name: 'Tesla chip', tier: 4, glyph: '⚡', list: 'Tesla Chip', tags: ['electronic'],
    text: () => 'Electronic. Lightning (Zap, Shocking chips, a Cloud\'s strike) that would hit your position is grabbed, once a turn, and sent back as 2 Shocking chips on random enemy stacks (one more per Battery under it).' },
  absorb: { name: 'Absorption chip', tier: 3, glyph: '◉', list: 'Absorbtion Chip', tags: ['electronic'],
    text: () => 'Electronic. Absorbs up to 2 lightning instances a turn on its stack and the stacks around it (one more per Battery under it). An absorbed Shocking chip burns out.' },
  sprinkler: { name: 'Sprinkler chip', tier: 2, glyph: '⛲', place: 'top', list: 'Sprinkler Chip', tags: ['electronic'],
    text: () => 'Electronic. Each turn it shoots water at the farthest space from it: an empty space becomes a Puddle, a stack gets wet (it cannot burn, but passes electricity on). One more space per Battery under it.' },
  uranium: { name: 'Uranium chip', tier: 3, glyph: '☢', list: 'Uranium Chip',
    text: () => 'Radioactive. Each turn it mutates one chip on a stack next to it into a random chip. Hand it Off (a Correction) onto your opponent.' },
  big: { name: 'Big chip', tier: 4, glyph: '⬤', kind: 'std', place: 'big', list: 'Big Chip',
    text: () => 'A value chip two spaces by two, worth 4 basic chips of the table (4¢, 8¢, 20¢ or 40¢). Big chips stack only on Big chips or an empty block; any chip can go on top. Too big to fall in a hole or be moved by Corrections.' },
  little: { name: 'Little chip', tier: 1, glyph: '·', kind: 'little', place: 'top', vars: { hits: 1 }, list: 'Little Chip',
    text: () => 'Tiny: no worth and no height. Goes on top of a stack and blocks one whole fee. Only other Little chips go on top of it.' },
  spy: { name: 'Spy chip', tier: 3, glyph: '🕵', place: 'top', list: 'Spy Chip',
    text: () => 'Looks like a plain 1¢ chip to your opponent. While it is on top of one of your stacks, your opponent makes each phase\'s plays first and you see them, aims included, before you commit.' },
  fib: { name: 'Fibonacci chip', tier: 3, glyph: 'φ', place: 'top', seq: 'fib', list: 'Fibonacci Chip',
    text: () => 'Goes on top of a stack. Two on top of each other merge into one worth the next Fibonacci number after the larger (1, 2, 3, 5, 8, 13…). On a win, what it grew beyond the chips that made it is paid out.' },
  prime: { name: 'Prime chip', tier: 3, glyph: 'ℙ', place: 'top', seq: 'prime', list: 'Prime Chip',
    text: () => 'Goes on top of a stack. Two on top of each other merge into one worth the next prime after the larger (2, 3, 5, 7, 11…). On a win, what it grew beyond the chips that made it is paid out.' },
  // food: eaten from the top of a stack for attribute bonuses that last `turns`. Some pair a penalty with a bigger bonus.
  chocolate: { name: 'Chocolate Chip', tier: 1, glyph: '🍫', kind: 'food', place: 'top', list: 'Chocolate Chip', food: { mods: { trickery: 1 }, turns: 2 },
    text: () => 'Food. Eat it from the top of a stack: +1 Draw for 2 turns.' },
  // Made when a phase is passed with actions left unused (see REWARD in bout.js); they carry their amount (`amt`).
  steal: { name: 'Steal chip', tier: 1, sold: false, from: 'stat:charisma', glyph: '🫳', text: () => 'Made from draws left unused (Charisma). In the House phase it steals what it carries from the Stage (your fees first, then your opponent\'s) onto your Bet, then it is gone.' },
  honey: { name: 'Honey Chip', tier: 2, sold: false, from: 'bees', glyph: '🍯', kind: 'food', place: 'top', list: 'Honey Chip', food: { mods: { proficiency: 1, ingenuity: 1 }, turns: 1 },
    text: () => 'Food (sticky, golden). Eat it: +1 Roll and +1 Bid this turn.' },
  chipchip: { name: 'Chip Chip', tier: 1, glyph: '🥔', kind: 'food', place: 'top', list: 'Chip Chip', food: { mods: { charisma: 1 }, turns: 1, dip: true },
    text: () => 'Food. Eat it: +1 Steal this turn, doubled if you have a Dip chip with dip left.' },
  dip: { name: 'Dip Chip', tier: 2, glyph: '🥣', kind: 'dip', place: 'space', vars: { dips: 3 }, list: 'Dip Chip',
    text: (v) => `A bowl on its own empty space. The next ${v.dips} Chip Chips you eat are dipped for twice the bonus.` },
  fishchip: { name: 'Fish ’n Chip', tier: 2, glyph: '🐟', kind: 'food', place: 'top', list: 'Fish "n Chip', food: { per: 'conviction', turns: 1 },
    text: () => 'Food. Eat it: +1 Power per unused roll (Conviction) for every chip under it (n, up to 3) this turn.' },
  hamburger: { name: 'Hamburger Chip', tier: 2, glyph: '🍔', kind: 'food', place: 'top', list: 'Hamburger Chip', food: { mods: { proficiency: 2, ingenuity: -1 }, turns: 1 },
    text: () => 'Food. Eat it plain: +2 Roll but −1 Bid this turn. On a Bun and topped with a Bun, eat the top Bun for the whole burger: +1 Draw, Roll and Bid for 2 turns.' },
  bun: { name: 'Bun Chip', tier: 1, glyph: '🍞', kind: 'food', place: 'top', list: 'Bun Chip', food: { mods: { conviction: 1 }, turns: 1 },
    text: () => 'Food. Eat it: +1 Conviction this turn. On top of a Hamburger that sits on a Bun, it is the whole burger.' },
  egg: { name: 'Egg Chip', tier: 2, sold: false, from: 'roost', glyph: '🥚', kind: 'egg', place: 'top', vars: { hits: 5, hatch: 5 }, list: 'Egg Chip', food: { mods: { proficiency: 2, trickery: -1 }, turns: 2 },
    text: () => 'A Dragon egg. Eat it raw: +2 Roll but −1 Draw for 2 turns. Leave it and it hatches a Dragon at your opponent after 5 hatch steps (one a turn, one more next to heat). It takes 5 whole fees before it breaks; broken, it never hatches.' },
  zap: { name: 'Zap chip', tier: 2, sold: false, from: 'trick:electrify', glyph: 'ϟ', vars: { s: 3 }, list: 'Zap Chip', tags: ['electric'],
    text: (v) => `Electric deterrent. A fee of ${v.s}¢ or less on its stack shocks the attacker: a Shocking chip lands on one of their front stacks (one more per Battery under it). A bigger fee breaks it.` },
  boosted: { name: 'Boosted chip', tier: 3, sold: false, from: 'trick:load', glyph: '⇡', vars: { die: 1 }, list: 'Boosted Chip',
    text: (v) => `Every die you roll shows ${v.die} more for each Boosted chip in your position.` },
  cheapened: { name: 'Cheapened chip', tier: 3, sold: false, from: 'trick:shave', glyph: '⇣', vars: { die: 1 }, list: 'Cheapened Chip',
    text: (v) => `Every die your opponent rolls shows ${v.die} less (not below 0) for each Cheapened chip in your position.` },
  upgrade: { name: 'Upgrade chip', tier: 4, sold: false, from: 'trick:tinker', glyph: '⬆', place: 'meter', list: 'Upgrade Chip',
    text: () => 'Lies on your Bet. While it is there, each Upgrade chip puts a random die upgrade (good or bad) on every die you roll, for that roll only. Bid it on a trick and that trick plays one upgrade higher.' },
  crown: { name: 'Crown chip', tier: 4, sold: false, from: 'trick:brace', glyph: '♛', vars: { turns: 3 },
    text: (v) => `Its stack starts the bout Hardened for ${v.turns} turns: each fee takes only one chip.` },
};
// Chips a trick, a tilt or the table makes are not sold (`sold: false`); `from` says what makes them:
// 'trick:<id>', 'tilt:<id>', 'bees' or 'roost'. They still deploy if an old save owns some.
export const soldInShop = (id) => !!SHOP_CHIPS[id] && SHOP_CHIPS[id].sold !== false;
export const SHOP_IDS = () => Object.keys(SHOP_CHIPS).filter(soldInShop);
export function madeBy(id) {
  const f = SHOP_CHIPS[id]?.from; if (!f) return null;
  if (f.startsWith('trick:')) { const T = TRICKS[f.slice(6)]; return T ? `the ${T.name} trick (${TYPES[T.type].name}${T.cls ? ', ' + CLASSES[T.cls].name : ''})` : null; }
  if (f.startsWith('tilt:')) return `the ${TILTS[f.slice(5)]?.name || f.slice(5)} tilt`;
  if (f.startsWith('stat:')) return { charisma: 'draws left unused when the Draw phase is passed (Charisma)' }[f.slice(5)] || f;
  return { bees: 'Bumble Bees pollinating your Flowers', roost: 'a Dragon on its Roost' }[f] || f;
}
// the trick that makes a chip, if any
export const makerOf = (id) => Object.keys(TRICKS).find((k) => TRICKS[k].roll?.n && TRICKS[k].roll.chip === id) || null;
// the hazards a shop chip stops: its own `resist` plus any in `also`
export const resistsOf = (id) => { const X = SHOP_CHIPS[id]; return X?.resist ? [X.resist, ...(X.also || [])] : []; };
export const shopVars = (id) => SHOP_CHIPS[id].vars || {};
export const shopText = (id) => { const X = SHOP_CHIPS[id]; return typeof X.text === 'function' ? X.text(shopVars(id)) : X.text; };
export const SHOP_CHIP_STAKE = true;
// a shop chip's price: its own price or its tier's; on a floor, × the Exchange's multiplier, or the chip's own price for it
export const shopPrice = (id, floor = 0) => { const own = SHOPS.exchange.chips?.[id], base = SHOP_CHIPS[id].price ?? CHIP_TIERS[SHOP_CHIPS[id].tier].price;
  if (!floor) return base; const p = own?.price ? perFloor(own.price, floor, null) : null; return p != null ? p : Math.round(base * perFloor(SHOPS.exchange.priceMult, floor, 1)); };
// how many of a shop chip the Exchange has on a floor
export const shopStock = (id, floor) => { const own = SHOPS.exchange.chips?.[id], n = own?.stock ? perFloor(own.stock, floor, null) : null; return n != null ? n : perFloor(SHOPS.exchange.stock, floor, 0); };
export const shopFloor = (id) => SHOP_CHIPS[id].floor ?? CHIP_TIERS[SHOP_CHIPS[id].tier].floor;
// chips that lie over a stack rather than in it: they take no height, stay on top and are cleansed like hazards.
// stray: a fee shown landing on nothing · hard: the Hardened chip · sticky: the Sticky chip
export const HAZARD_KINDS = ['debt', 'burn', 'acid', 'shock', 'corrupt', 'poison', 'boom', 'frost', 'lava', 'stray', 'hard', 'sticky'];
// shields that take a whole fee per hit (`hits` on the chip), not 1¢ like Block
export const INSTANCE_SHIELDS = ['flower', 'petal', 'clay', 'brick', 'wood', 'tree', 'hive', 'little', 'egg'];
export const SEQS = { fib: [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377], prime: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53] };
// renamed shop chips, for saves made before the rename
export const SHOP_RENAMES = { bumper: 'reducer', mirror: 'rebound', fog: 'transpara', frozen: 'frost' };

// Creatures are chips over the table. `hits`: how many fee instances (whole fees, whatever their size) bring it
// down; then it drops a Bounty chip worth `bounty` (BOUNTY_PER_HIT a hit). `layer`: 'flying' or 'ground'.
// `life`: turns it stays. A creature with no hits (the Ghost) cannot be damaged.
export const BOUNTY_PER_HIT = 5;
// `type`: the House phase the creature acts in, after both Rollers (what its action is: an Expense takes or burns
// chips, a Correction changes them, an Insurance guards a row)
export const CREATURES = {
  ufo: { name: 'UFO', glyph: '🛸', type: 'expense', hits: 1, life: 1, layer: 'flying', text: 'Flying. Abducts the top chip of a random stack, stays the turn, then flies home. Chips taken are lost.' },
  fairy: { name: 'Fairy', glyph: '🧚', type: 'correction', hits: 1, life: 2, layer: 'flying', text: 'Flying. Converts the top chip of a random stack into a random chip. Chaos reigns!' },
  dragon: { name: 'Dragon', glyph: '🐉', type: 'expense', hits: 50, life: 2, layer: 'flying', text: 'Flying. Breathes a Burning chip onto a random stack each turn.' },
  mole: { name: 'Mole', glyph: '🐭', type: 'correction', hits: 1, life: 2, layer: 'ground', text: 'Digs up a random empty space and leaves a Hole, then sits in it.' },
  unicorn: { name: 'Unicorn', glyph: '🦄', type: 'correction', hits: 1, life: 1, layer: 'ground', text: 'Converts every chip in a random stack into random chips. Chaos reigns!' },
  mothership: { name: 'Mothership', glyph: '👾', type: 'expense', hits: 10, life: 5, layer: 'flying', text: 'Flying. Hovers over one stack and beams up a chip every turn until the stack is gone. Chips taken are lost.' },
  ghost: { name: 'Ghost', glyph: '👻', type: 'insurance', hits: 0, life: 3, layer: 'flying', text: 'Very spooky. Fear: no trick can aim at its row, only spreads reach it. It cannot be damaged, and no overkill passes into or through its row.' },
  ghostship: { name: 'Ghost Ship', glyph: '🏴‍☠️', type: 'expense', hits: 100, life: 6, layer: 'flying', text: 'A vehicle that sails across empty spaces to a stack with a Gold chip on top and steals it. Takes 100 fee instances to sink; sunk, it drops a Treasure chip with everything it stole.' },
};
for (const C of Object.values(CREATURES)) C.bounty = C.hits * BOUNTY_PER_HIT;
CREATURES.ghostship.bounty = 0; // it drops Treasure instead
// Orbital chips: weather and vehicles in the sky, above the flying layer. Weather comes with the table's felt.
// `size`: spaces it covers ('table' = all of them).
export const ORBITALS = {
  cloud: { name: 'Cloud', glyph: '☁', size: 1, text: 'Weather. Drifts a space each turn and rains on what is under it: an empty space becomes a Puddle, a stack gets wet and its fire, frost and corruption wash off. Plants under it grow faster. One turn in four it throws lightning: a Shocking chip on a random stack.' },
  sun: { name: 'Sun', glyph: '☀', size: 'table', text: 'Weather. While it shines your Flowers bloom twice as many Petals and your Trees grow twice as fast; Puddles dry, ice thaws and eggs hatch faster.' },
  moon: { name: 'Moon', glyph: '☾', size: 'table', text: 'Weather. The tide: each turn a Puddle spreads to an empty space next to it, and Ghosts come out. (Proposed: the list gives the Moon no effect yet.)' },
  blizzard: { name: 'Blizzard', glyph: '❄', size: 'table', text: 'Weather as big as the table, for one turn. At its end every stack shorter than its strength freezes into one Frozen chip, wet chips freeze and Puddles turn to ice.' },
  b52: { name: 'B-52', glyph: '✈', size: 1, text: 'A vehicle launched by a Calamity. Flies one space along a row each turn and drops a 52¢ Boom chip on the stack beneath.' },
  tornado: { name: 'Tornado', glyph: '🌪', size: 1, text: 'Moves to a space next to it each turn. A stack under it shorter than its strength (2d6) is thrown about, and some of its chips may be lost.' },
};
export const CALAMITIES = {
  wormhole: { name: 'Worm Hole', text: 'Opens on an empty space of your position. Any chips that land on it are pulled through to an empty space on your opponent\'s side.' },
  inferno: { name: 'Inferno', text: 'Really, really hot. A Burning chip lands on one of your stacks every turn.' },
  audit: { name: 'House Audit', text: 'Every second turn, each of your front stacks is charged a 1¢ fee.' },
  blackhole: { name: 'Black Hole', text: 'A hole in space on one of your Stake spaces: anything put on it is gone. Every turn, and whenever a Correction moves chips, it consumes the bottom chip of a stack next to it.' },
  volcano: { name: 'Volcano', text: 'A full stack of Volcano chips, two spaces by two where there is room. Nothing can be placed on it. For four turns it launches a Burning chip at one of your stacks, then goes dormant: the space comes back one stack height lower.' },
  tornado: { name: 'Tornado', text: 'A Tornado chip moves over your position. Its strength is rolled on 2d6; a stack under it shorter than that is thrown about, and some of its chips may be lost.' },
  blizzard: { name: 'Blizzard', text: 'Every fourth turn a Blizzard covers your whole table for a turn: stacks shorter than its strength (2d6) freeze into one Frozen chip.' },
  b52: { name: 'B-52', text: 'Launches a B-52 over your position: it flies along a row dropping a 52¢ Boom chip on a stack each turn.' },
};

// ---------- Wagers and tilts ----------
// After a win you always keep the money; then pick one prize. `bonus` is the bonus money, as a share of the
// opponent's starting worth, paid with the one-die prize.
export const PRIZES = { bonus: 0.25 };
// (wager multipliers are in content/tuning.js)
// Tilts are switched on or off for a bout. While one is on, the House may play it during the bout, in the House
// phase. How often and how hard depends on the bout: the more you have lost to the House (your fees paid to the
// Stage, as a share of what you started with) the harder Challenges hit; the more your opponent has lost to the House,
// the stronger your Cheats. `floor`: the first floor that offers it. `mult`: what it adds to (Challenge) or takes from
// (Cheat) the wager multiplier. Early purses sit almost wholly on the table, so the wager alone rarely carries that;
// the same share of the opponent's worth is also paid on a win: a House bounty for a Challenge, a House cut for a Cheat.
// `base` and `per`: the House's chance to play it each turn, base + per × pressure.
export const TILTS = {
  hazard: { kind: 'challenge', name: 'Hazard', floor: 1, mult: 0.25, base: 0.25, per: 0.6, from: 2, ramp: 0, cap: 0.95, where: 'random', text: 'The House digs Holes in empty spaces of your position (one in three is a Magic Hat slipped under a stack). More of them, more often, the more you have lost to the House.' },
  creature: { kind: 'challenge', name: 'Creature', floor: 1, mult: 0.35, base: 0.2, per: 0.6, from: 2, ramp: 0, cap: 0.95, where: 'random', text: 'The House sends creatures to your position. The more you have lost to the House, the more often, and the bigger the creatures it can call.' },
  spawner: { kind: 'challenge', name: 'Spawner', floor: 2, mult: 0.4, base: 0.15, per: 0.5, from: 2, ramp: 0, cap: 0.95, where: 'random', text: 'The House sets nests on your position that send a creature every third turn (every second, once you have lost a third of your chips). One in two is a Dragon Roost: it takes a Stake space and calls a Dragon that lays eggs on it.' },
  calamity: { kind: 'challenge', name: 'Calamity', floor: 3, mult: 0.5, base: 0.12, per: 0.45, from: 2, ramp: 0, cap: 0.95, where: 'random', text: 'The House starts disasters on your position: a Worm Hole, Inferno, Audit, Black Hole, Volcano, Tornado, Blizzard or B-52. A second one comes once you have lost half your chips.' },
  shield: { kind: 'cheat', name: 'Shield', floor: 1, mult: 0.25, base: 0.3, per: 0.6, from: 2, ramp: 0, cap: 0.95, where: 'random', text: 'The House drops Block chips on your Bet: more, and more often, the more your opponent has lost to the House.' },
  familiar: { kind: 'cheat', name: 'Familiar', floor: 1, mult: 0.1, base: 0.35, per: 0.6, from: 2, ramp: 0, cap: 0.95, where: 'random', text: 'The House sends you a little friend that removes one Debt or hazard chip each turn and may chase creatures away. Up to three, as your opponent loses to the House. One play in three sets a Hive on an empty space of your position instead: it sends out Bumble Bees that sting creatures and pollinate your Flowers into Honey.' },
  position: { kind: 'cheat', name: 'Position', floor: 1, mult: 0.15, base: 0, per: 0, text: 'Adds +1 to Balance, Versatility and Depth for this bout. The House plays it when you sit down, so it does not grow during the bout.' },
  intervention: { kind: 'cheat', name: 'Intervention', floor: 3, mult: 0.3, base: 0, per: 0, text: 'Once, when you would go broke, the House restores your paid fees: half of them, up to all of them the more your opponent has lost to the House. It costs half your wager.' },
};
// What the House reads when it plays a tilt: a Roller's pressure is a weighted mix of the share of their starting
// chips they have paid to the House (`lost`), the overkill and Bet overflow wasted on their side as a share of what
// they started with (`overkill`), how full their Bet is (`fill`, 0 to 1) and the worth sitting in it as a share of
// what they started with (`value`). Challenges read your pressure, Cheats your opponent's.
export const TILT_PRESSURE = { lost: 1, overkill: 0.5, fill: 0.2, value: 0.3 };
// A tilt's chance over the bout, and where what it lays lands (each tilt's own, in the TILTS table):
//   from    the first turn the House may play it (2 unless set)
//   ramp    chance added for every turn past `from`: the curve over the bout (0: flat; negative: it fades)
//   cap     the most its chance reaches (0.95 unless set)
//   where   where its Holes, hats, nests and Hives land: 'random', 'front' (nearest the Pit first), 'back', 'bet' (Bet
//           spaces first) or 'stake'. Among equals the pick is still random.
export const TILT_WHERE = ['random', 'front', 'back', 'bet', 'stake'];
export const tiltFrom = (key) => Math.max(1, Math.round(TILTS[key].from ?? 2));
export const tiltChance = (key, pressure, turn = 0) => { const T = TILTS[key]; if (!(T.base || T.per || T.ramp)) return 0;
  return Math.max(0, Math.min(T.cap ?? 0.95, T.base + T.per * pressure + (T.ramp || 0) * Math.max(0, turn - tiltFrom(key)))); };

// ---------- Floors and opponents ----------
// `worth`: each table's opponent's worth; `wager`: what each table costs to sit at (the wager the multiplier pays on);
// `boss`: the High Roller's worth; `cut`: what the House advises you keep to carry on.
export const FLOORS = [
  null,
  { name: 'Boogey Basement', line: 'These clowns and losers are just the stepping stones to greater Worth.', worth: [36, 44, 52], wager: [5, 10, 15], boss: 64, cut: 10 },
  { name: 'Hustlers Haven', line: 'Beware, these rollers are no slouches. Cinch your purse strings on your way in.', worth: [80, 95, 110], wager: [30, 45, 60], boss: 160, cut: 100 },
  { name: 'Rollers Suite', line: "You're doing it! Time to play with the high rollers. Do you have what it takes?", worth: [250, 300, 350], wager: [150, 225, 300], boss: 500, cut: 1000 },
  { name: 'Royal Paradise', line: 'This room is for royal rollers only. It sure would be a shame to dethrone them.', worth: [450, 550, 650], wager: [600, 900, 1200], boss: 740, cut: 100000 },
];
// The names dealt at the tables and the High Rollers on each floor come from the roster (content/roster.js), so a
// renamed or new opponent is dealt under its own name. Both lists are rebuilt from it (refreshDerived).
export const OPPONENTS = [];
export const BOSSES = [null, [], [], [], []];
export const ASCENT_NAMES = ['Shop Keeper', 'Veteran Hustler', 'Golden Parachute', 'Diamond Hands', 'The House'];
// Table felts (a: centre, b: edge, rim: the rail). `weather`: the orbital weather the table brings (see ORBITALS);
// `cold`: wet chips and Puddles on it freeze. `pool: false` felts are not dealt to random tables.
export const FELTS = {
  felt: { name: 'Felt', a: '#1f8a63', b: '#0a3326', rim: '#c9f7df', line: 'Classic green baize.' },
  satin: { name: 'Satin', a: '#a3366f', b: '#3d0c28', rim: '#ffc2e4', line: 'Slick and shiny. Chips slide a little.' },
  buffet: { name: 'Buffet', a: '#b8742a', b: '#4a2808', rim: '#ffe0a8', line: 'Somebody spilled the gravy.' },
  earthen: { name: 'Earthen', a: '#7a5a35', b: '#2c1d0d', rim: '#e6cba4', line: 'Packed clay and old roots.', weather: ['cloud'] },
  frosty: { name: 'Frosty', a: '#7fbfe0', b: '#1d4a66', rim: '#f0fbff', line: 'Cold to the touch. Breath fogs over it.', weather: ['cloud'], cold: true },
  urban: { name: 'Urban', a: '#5b5f6b', b: '#1b1c22', rim: '#cfd3dd', line: 'Asphalt grey with a painted line.' },
  oceanic: { name: 'Oceanic', a: '#1f7fa8', b: '#06263d', rim: '#9fe8ff', line: 'Deep blue, with a tide to it.', weather: ['cloud'] },
  molten: { name: 'Molten', a: '#d9531f', b: '#3d0a02', rim: '#ffd36a', line: 'Still warm from the forge.', weather: ['sun'] },
  lunar: { name: 'Lunar', a: '#8d8aa3', b: '#25233a', rim: '#ecebff', line: 'Pale and cratered.', weather: ['moon'] },
  polar: { name: 'Polar', a: '#d8e6f0', b: '#5d7488', rim: '#ffffff', line: 'Snow white and blinding.', weather: ['blizzard'], cold: true },
  galactic: { name: 'Galactic', a: '#5a2fa8', b: '#0d0526', rim: '#d9c2ff', line: 'Stars in the weave.', weather: ['moon'] },
  royal: { name: 'Royal', a: '#7a2d7a', b: '#22082b', rim: '#ffd76a', line: 'The High Roller\'s own cloth.', pool: false },
  house: { name: 'House', a: '#2b2f6b', b: '#0b0b26', rim: '#7df3ff', line: 'The doorman and the barfly play on this.', pool: false },
  paradise: { name: 'Paradise', a: '#d4a52a', b: '#3a2604', rim: '#fff3bf', line: 'Gold thread. For the Ascent.', pool: false },
};
export const FELT_POOL = Object.keys(FELTS).filter((k) => FELTS[k].pool !== false);
// a table saved before felts had ids stored the felt's name
export const feltOf = (x) => FELTS[x] || Object.values(FELTS).find((f) => f.name === x) || FELTS.felt;
export const feltId = (x) => (FELTS[x] ? x : Object.keys(FELTS).find((k) => FELTS[k].name === x) || 'felt');

// ---------- Lounge ----------
export const DRINKS = [
  { id: 'soda', color: '#ff86ea', name: 'Soda Pop', verb: 'tickles', stat: 'trickery', amt: 1, cost: 500, sips: 5 },
  { id: 'water', color: '#9fe8ff', name: 'Spring Water', verb: 'refreshes', stat: 'proficiency', amt: 1, cost: 500, sips: 5 },
  { id: 'coffee', color: '#8a5a35', name: 'Iced Coffee', verb: 'focuses', stat: 'ingenuity', amt: 1, cost: 500, sips: 5 },
  { id: 'milk', color: '#f4efe2', name: 'Warm Milk', verb: 'comforts', stat: 'conviction', amt: 1, cost: 500, sips: 5 },
  { id: 'tea', color: '#c98a2e', name: 'Hot Tea', verb: 'calms', stat: 'cunning', amt: 1, cost: 500, sips: 5 },
  { id: 'juice', color: '#ff9f3a', name: 'Fruit Juice', verb: 'brightens', stat: 'charisma', amt: 1, cost: 500, sips: 5 },
  { id: 'special', color: '#7dffb5', name: 'Paradise Special', verb: 'strengthens', stat: 'random', amt: 2, cost: 10000, sips: 3 },
  { id: 'royal', color: '#b08cff', name: 'Royal Blend', verb: 'empowers', stat: 'tip', amt: 1, cost: 10000, sips: 3 },
  { id: 'diamond', color: '#e6fbff', name: 'Diamond Drop', verb: 'enlightens', stat: 'all', amt: 2, cost: 200000, sips: 1 },
];

// ---------- Sports book ----------
export const SPORTS = [
  { id: 'gridiron', name: 'Gridiron', line: 'The best sport.', field: 2, unit: 'team' },
  { id: 'kickball', name: 'Kickball', line: '9 innings of kicking balls.', field: 2, unit: 'team' },
  { id: 'xoccer', name: 'Xoccer', line: 'Also known widely as Kickball or Kekbol.', field: 2, unit: 'team' },
  { id: 'dribblehoops', name: 'Dribblehoops', line: 'And 1.', field: 2, unit: 'team' },
  { id: 'fastcar', name: 'Fastcar 500', line: 'Feel the excitement of right hand turns.', field: 12, unit: 'driver' },
  { id: 'beast', name: 'Beast Racing', line: 'Tiny jockeys compete on frothing beasts.', field: 12, unit: 'beast' },
  { id: 'packing', name: 'Prize Packing', line: 'Gratuitous violence as a poorly named sport.', field: 2, unit: 'packer' },
];
// chance bracket -> payout (profit per 1 staked), straight from the odds table
export const ODDS = [[0.005, 500, '500:1'], [0.01, 250, '250:1'], [0.02, 100, '100:1'], [0.03, 50, '50:1'], [0.05, 20, '20:1'], [0.1, 10, '10:1'],
  [0.25, 5, '5:1'], [0.42, 2, '2:1'], [0.48, 1, '1:1'], [0.52, 0.5, '1:2'], [0.58, 1 / 3, '1:3']];
export const TEAM_WORDS = [['Burien', 'Paradise', 'Basement', 'Haven', 'Royal', 'Alley', 'Lunar', 'Molten', 'Felt', 'Satin', 'Polar', 'Urban'],
  ['Boogeys', 'Rollers', 'Hustlers', 'Rascals', 'Sharks', 'Pips', 'Snake Eyes', 'Boxcars', 'High Rollers', 'Antes', 'Markers', 'Pit Bosses']];
export const RACER_WORDS = ['Lucky Seven', 'Hard Eight', 'Loose Change', 'Double Down', 'Cold Streak', 'Hot Hand', 'Long Shot', 'Sure Thing', 'Snake Eyes', 'Boxcar',
  'Little Joe', 'Big Red', 'Yo Eleven', 'Easy Six', 'Midnight', 'Ace Deuce', 'House Edge', 'Bad Beat'];

// ---------- Gear ----------
// `cls`: a level 0 jacket is cut for one class: its drawback lands on that class's strongest Coin stat (2 → 1)
// rather than zeroing a 1. Other classes cannot wear it.
export const JACKETS = {
  standard: { name: 'Standard', color: '#5b6378', effect: 'Functional', mods: {}, price: 0, level: 0 },
  long: { name: 'Long', color: '#4b3a2a', effect: 'Concealing · Awkward', mods: { depth: 1, conviction: -1 }, price: 200, level: 0, cls: 'technician' },
  leather: { name: 'Leather', color: '#1d1d22', effect: 'Rebellious · Inappropriate', mods: { versatility: 1, charisma: -1 }, price: 200, level: 0, cls: 'hustler' },
  bomber: { name: 'Bomber', color: '#5d6b3a', effect: 'Confident · Brutish', mods: { balance: 1, cunning: -1 }, price: 200, level: 0, cls: 'rascal' },
  rain: { name: 'Rain', color: '#e2c21c', effect: 'Practical · Unnecessary', mods: { cunning: 2, versatility: -1 }, price: 20000, level: 1 },
  sports: { name: 'Sports', color: '#c8463d', effect: 'Fashionable · Expected', mods: { charisma: 2, depth: -1 }, price: 20000, level: 1 },
  suede: { name: 'Suede', color: '#a8744a', effect: 'Luxurious · Uncomfortable', mods: { conviction: 2, balance: -1 }, price: 20000, level: 1 },
  down: { name: 'Down', color: '#e8edf5', effect: 'Comfortable · Fluffy', mods: { versatility: 2, conviction: -1 }, price: 2000000, level: 2 },
  reading: { name: 'Reading', color: '#6b3f6b', effect: 'Thoughtful · Tattered', mods: { depth: 2, cunning: -1 }, price: 2000000, level: 2 },
  denim: { name: 'Denim', color: '#3c5f9e', effect: 'Unique · Convoluted', mods: { balance: 2, charisma: -1 }, price: 2000000, level: 2 },
  regal: { name: 'Regal', color: '#7a2d7a', effect: 'Royal · Privileged', mods: { balance: 2, versatility: 2, depth: 2 }, price: 20000000000, level: 4 },
};
import { CARDS, SHADY, CARD_SHOPS, CARD_KINDS } from './content/cards.js';
export { CARDS, SHADY, CARD_SHOPS, CARD_KINDS };
// Wallets hold the cards that grant benefits. `slots`: cards it holds. `passes`: passes it holds, each in its own pass
// slot (cards never use them). `keep` is the total two of your dice must reach in the alley to retain them.
export const WALLETS = {
  worn_cloth: { name: 'Worn Cloth', color: '#8d8478', slots: 2, keep: 14, passes: 1, price: 0, level: 0 },
  duct_tape: { name: 'Duct Tape', color: '#b5b8bd', slots: 1, keep: 10, passes: 1, price: 0, level: 0 },
  silver_clip: { name: 'Silver Clip', color: '#d6dde6', slots: 4, keep: 14, passes: 1, price: 1000, level: 0 },
  chained_snap: { name: 'Chained Snap', color: '#5a5f6b', slots: 2, keep: 7, passes: 1, price: 1000, level: 0 },
  neon_zip: { name: 'Neon Zip', color: '#ff86ea', slots: 1, keep: 6, passes: 1, price: 1000, level: 0 },
  worn_leather: { name: 'Worn Leather', color: '#7a4b2a', slots: 3, keep: 10, passes: 1, price: 1000, level: 0 },
  diamond_clip: { name: 'Diamond Clip', color: '#bff3ff', slots: 3, keep: 7, passes: 1, price: 100000, level: 2 },
  magnetic_snap: { name: 'Magnetic Snap', color: '#3c4a6b', slots: 1, keep: 4, passes: 1, price: 100000, level: 2 },
  velvet_zip: { name: 'Velvet Zip', color: '#8a2d5a', slots: 2, keep: 6, passes: 1, price: 100000, level: 2 },
  fine_leather: { name: 'Fine Leather', color: '#4a2412', slots: 4, keep: 12, passes: 1, price: 100000, level: 2 },
  royal_luxury: { name: 'Royal Luxury', color: '#ffd76a', slots: 4, keep: 7, passes: 1, price: 10000000, level: 4, crown: true },
};
// Card lists worked out from CARDS: dealt at the start (starter), found in the Dodgy Corner (corner > 0). Rebuilt after
// changes. (LANYARD_CARDS is always empty now: the lanyard is gone, and everything collected is a card or a pass.)
export const LANYARD_CARDS = [];
// Passes are not cards: every wallet holds one, in its own slot. The Casino Pass is won from the Doorman and each
// floor has its own pass, given as you reach it (it takes the slot from the last). Once you are in, a pass is not
// needed again unless you leave: coming back to a saved run, the pass for your floor (or a higher one) walks you
// straight in. Without it the Bouncer stops you, and beating him gets you back in at the Boogey Basement with all
// your run's things. The pass stays with the wallet: keep the wallet in the alley and it is in your next run, where
// it takes you past the floor checks to its floor; lose the wallet and the pass goes with it.
export const PASSES = [null,
  { name: 'Casino Pass', glyph: '♛', color: '#7a2d7a', text: 'Gets you through the casino doors. Won from the Doorman.' },
  { name: 'Hustlers Haven Pass', glyph: '2', color: '#3c7fc4', text: 'Gets you onto Hustlers Haven, floor 2.' },
  { name: 'Rollers Suite Pass', glyph: '3', color: '#ff86ea', text: 'Gets you onto the Rollers Suite, floor 3.' },
  { name: 'Royal Paradise Pass', glyph: '4', color: '#d4a52a', text: 'Gets you onto Royal Paradise, floor 4.' }];
export const PURSE_LIMIT = 999e12;
export const STARTER_CARDS = [];
// Business Cards no longer raise your attributes: each High Roller carries one, and it is their trait (BOSS_TRAITS).
export const RETIRED_CARDS = ['business_trickery', 'business_ingenuity', 'business_proficiency', 'business_charisma', 'business_cunning', 'business_conviction', 'paradise', 'resist_card', 'resist_card_plus'];
export const FIND_CARDS = [];
export const WALLET_SLOTS = 4;

// ---------- content you can edit ----------
// The tables the build mode can change, by name. Changes are stored as { 'TABLE.key.path': value } (see
// content/overrides.js); applyContent sets each one, then rebuilds the lists worked out from the tables.
import { OVERRIDES } from './content/overrides.js';
import { MADE_CHIPS } from './content/chipmaker.js';
export { MADE_CHIPS };
import { ROSTER, BEHAVE, DEFAULT_BEHAVE } from './content/roster.js';
export { ROSTER, BEHAVE, DEFAULT_BEHAVE };
import { BOSS_TRAITS } from './content/bosstraits.js';
export { BOSS_TRAITS };
import { FLAVOR } from './content/flavor.js';
export { FLAVOR };
// a thing's line of flavour (content/flavor.js), by the table it lives in and its id; '' when it has none
export const flavorOf = (table, id) => FLAVOR[table]?.[id] || '';
import { TUNING } from './content/tuning.js';
import { SHOPS, perFloor } from './content/shops.js';
export { TUNING, SHOPS, perFloor };
import { GUIDE } from './content/guidance.js';
import { FONTS, IMAGES, ICONS, TEXTURES, NEON } from './content/assets.js';
export { FONTS, IMAGES, ICONS, TEXTURES, NEON };
import TEXT from './text/en.js';
import { MATERIALS as _MAT, DICE_SHOP as _DS, BONE as _BONE, MELT as _MELT, CASTS as _CASTS, DYES as _DYES, DIAMOND as _DIA } from './content/dice.js';
// The order entries are listed in, where Build mode has moved them: { TABLE: [ids, first to last] }. Ids not named keep
// their own order after the named ones.
export const ORDER = {};
export const TABLES = { ORDER, CLASSES, ROLLERS, BASE_DIMS, STATS, DICE, MATERIALS: _MAT, DICE_SHOP: _DS, BONE: _BONE, MELT: _MELT, CASTS: _CASTS, DYES: _DYES, DIAMOND: _DIA, DIE_VARS,
  TYPES, TRICKS, CHIPS, SHOP_CHIPS, CHIP_TIERS, CREATURES, ORBITALS, CALAMITIES, TILTS, TILT_PRESSURE, FELTS, FLOORS, DRINKS, SPORTS, JACKETS, CARDS, WALLETS,
  PASSES, CONDITIONS, PACKS, QDIE, PRIZES, GUIDE, TEXT, MADE_CHIPS, ROSTER, BOSS_TRAITS, FLAVOR, TUNING, SHOPS, SHADY, ODDS, DENOMS, WEAR, IMAGES, ICONS, TEXTURES, NEON };
const isObj = (x) => x && typeof x === 'object';
// a path's steps: keys are joined by '.', and a '.' inside a key (as in text keys) is written '\\.'
export const splitPath = (path) => path.split(/(?<!\\)\./).map((k) => k.replace(/\\\./g, '.'));
export const subPath = (path, key) => `${path}.${String(key).replace(/\./g, '\\.')}`;
export function getPath(path) { let o = TABLES; for (const k of splitPath(path)) { if (!isObj(o)) return undefined; o = o[k]; } return o; }
// set one value; the containers on the way are made if missing. Returns the value it replaced.
// Tables whose entries Build mode can delete. A deleted entry is a change like any other: its path set to null
// ('CLASSES.angler': null). That stays in the exported file, so the entry does not come back when the file is merged
// or the game's own tables still list it (deleted is not the same as hidden: a retired trick is only hidden).
export const DELETABLE = ['CLASSES', 'ROLLERS', 'ROSTER', 'TRICKS', 'MADE_CHIPS', 'CARDS', 'WALLETS', 'JACKETS'];
export const isDeletion = (path, value) => value === null && splitPath(path).length === 2 && DELETABLE.includes(splitPath(path)[0]);
// the entries the game cannot run without, and what still uses an entry (so deleting it would leave a hole)
const KEEP = { JACKETS: ['standard'], WALLETS: ['worn_cloth'] };
export function usedBy(table, id) {
  const out = [], rollers = Object.entries(ROLLERS), roster = Object.entries(ROSTER);
  if ((KEEP[table] || []).includes(id)) out.push('the game (every run starts with it)');
  if (table === 'CLASSES') { for (const [k, x] of rollers) if (x.cls === id) out.push(`Roller ${x.name || k}`); for (const [k, x] of roster) if (x.cls === id) out.push(`${x.boss ? 'High Roller' : 'opponent'} ${x.name || k}`);
    for (const [k, x] of Object.entries(TRICKS)) if (x?.cls === id) out.push(`trick ${x.name || k}`); for (const [k, x] of Object.entries(JACKETS)) if (x?.cls === id) out.push(`jacket ${x.name || k}`);
    if (Object.keys(CLASSES).length <= 1) out.push('the game (it needs one class)'); }
  if (table === 'TRICKS') { for (const [k, x] of [...rollers, ...roster]) if ((x.tricks || []).includes(id)) out.push(`${x.name || k}'s Book`); }
  if (table === 'MADE_CHIPS') { for (const [k, x] of Object.entries(TRICKS)) if (x?.roll?.chip === id || x?.bonus?.chip === id) out.push(`trick ${x.name || k}`);
    for (const [k, x] of Object.entries(MADE_CHIPS)) if (k !== id && (x.actions || []).some((a) => a.chip === id)) out.push(`chip ${x.name || k}`); }
  if (table === 'ROLLERS' && Object.keys(ROLLERS).length <= 1) out.push('the game (it needs one Roller)');
  if (table === 'WALLETS' || table === 'JACKETS') { const f = table === 'WALLETS' ? 'wallet' : 'jacket'; for (const [k, x] of [...rollers, ...roster]) if (x[f] === id) out.push(`${x.name || k}`); }
  return [...new Set(out)];
}
// put a table's entries in a given order (ids not named follow, in the order they had)
export function orderTable(tb, ids = []) {
  const T = TABLES[tb]; if (!isObj(T) || Array.isArray(T)) return; const keys = Object.keys(T), want = [...ids.filter((k) => k in T), ...keys.filter((k) => !ids.includes(k))];
  if (want.join() === keys.join()) return; const copy = {}; for (const k of want) copy[k] = T[k]; for (const k of keys) delete T[k]; Object.assign(T, copy);
}
export function setPath(path, value) {
  if (isDeletion(path, value)) { const [tb, id] = splitPath(path), was = TABLES[tb]?.[id]; if (TABLES[tb]) delete TABLES[tb][id]; return was; }
  const ks = splitPath(path), last = ks.pop(); let o = TABLES;
  for (const k of ks) { if (!isObj(o[k])) o[k] = {}; o = o[k]; }
  const was = o[last]; o[last] = value; return was;
}
export function deletePath(path) { const ks = splitPath(path), last = ks.pop(); let o = TABLES; for (const k of ks) { o = o?.[k]; } if (isObj(o)) delete o[last]; }
// lists worked out from the tables when the game loads, rebuilt after changes
export function refreshDerived() {
  for (const [tb, ids] of Object.entries(ORDER)) if (Array.isArray(ids)) orderTable(tb, ids); // Build mode's own order
  TRICK_IDS.splice(0, TRICK_IDS.length, ...Object.keys(TRICKS).filter((id) => !TRICKS[id]?.retired)); // retired tricks are dealt nowhere
  const C0 = Object.entries(CARDS).filter(([, c]) => c && c.kind !== 'key'); // a Suite Key is a pass: never dealt or found as a card
  LANYARD_CARDS.splice(0, LANYARD_CARDS.length); // there is no lanyard: every card takes a wallet slot, every pass a pass slot
  STARTER_CARDS.splice(0, STARTER_CARDS.length, ...C0.filter(([, c]) => c.starter).map(([k]) => k));
  FIND_CARDS.splice(0, FIND_CARDS.length, ...C0.filter(([, c]) => (c.corner || 0) > 0).map(([k]) => k));
  FELT_POOL.splice(0, FELT_POOL.length, ...Object.keys(FELTS).filter((k) => FELTS[k].pool !== false));
  const R0 = Object.values(ROSTER);
  OPPONENTS.splice(0, OPPONENTS.length, ...R0.filter((x) => !x.boss && x.name).map((x) => x.name));
  for (let f = 1; f <= 4; f++) BOSSES[f] = R0.filter((x) => x.boss && x.name && (x.floors || [1, 2, 3, 4]).includes(f)).map((x) => x.name);
}
export function applyContent(changes = {}) {
  // deleted entries stay deleted: nothing set inside one brings it back, and the deletions are applied last
  const gone = Object.keys(changes).filter((p) => isDeletion(p, changes[p]));
  for (const [path, v] of Object.entries(changes)) if (TABLES[splitPath(path)[0]] && !gone.includes(path) && !gone.some((g) => path.startsWith(g + '.'))) setPath(path, isObj(v) ? JSON.parse(JSON.stringify(v)) : v);
  for (const path of gone) setPath(path, null);
  refreshDerived();
}
// RP_CONTENT=stock (tests of the rules): the content as written in the tables, without the Build-mode changes
applyContent(globalThis.process?.env?.RP_CONTENT === 'stock' ? {} : OVERRIDES);
