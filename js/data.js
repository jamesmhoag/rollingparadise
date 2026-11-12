// Static game content, taken from the Rolling Paradise design workbook.

// ---------- Rollers ----------
// TIP = per-turn action limits. C = reward for each action left unused. BVD = position shape.
export const CLASSES = {
  hustler: {
    name: 'Hustler', blurb: 'Draws the most tricks and stacks chips tallest. Deploys from the back.',
    tip: { trickery: 3, ingenuity: 2, proficiency: 2 }, c: { charisma: 2, cunning: 1, conviction: 1 },
    bvd: { balance: 3, versatility: 1, depth: 0 }, primary: 'trickery', deploy: 'end',
    dice: { d4: 4, d6: 4 }, tricks: ['charge', 'mug', 'stir', 'block', 'settle'], color: '#e0a23c',
  },
  rascal: {
    name: 'Rascal', blurb: 'Bids the most and has the deepest Meter. Deploys from the centre.',
    tip: { trickery: 2, ingenuity: 3, proficiency: 2 }, c: { charisma: 1, cunning: 2, conviction: 1 },
    bvd: { balance: 0, versatility: 3, depth: 1 }, primary: 'ingenuity', deploy: 'center',
    dice: { d6: 7 }, tricks: ['charge', 'stir', 'bend', 'block', 'settle'], color: '#c0569b',
  },
  technician: {
    name: 'Technician', blurb: 'Rolls the most dice and has the deepest Bar. Deploys from the front.',
    tip: { trickery: 2, ingenuity: 2, proficiency: 3 }, c: { charisma: 1, cunning: 1, conviction: 2 },
    bvd: { balance: 1, versatility: 0, depth: 3 }, primary: 'proficiency', deploy: 'start',
    dice: { d6: 3, d8: 3 }, tricks: ['charge', 'stir', 'block', 'brace', 'settle'], color: '#4aa3c7',
  },
};
export const BASE_DIMS = { cols: 5, stackMax: 3, meterRows: 2, barRows: 3 };

// `per`: what each point does, for hover text that says what a +1 or −1 actually changes
export const STATS = {
  trickery: { name: 'Trickery', short: 'Draw', text: 'Tricks you may draw from your Book each turn.', per: (n) => `draw ${n} more trick${n === 1 ? '' : 's'} from your Book each turn, so more tricks are on your Run to roll onto and bid on` },
  ingenuity: { name: 'Ingenuity', short: 'Bid', text: 'Chips you may bid on shown tricks each turn.', per: (n) => `bid ${n} more chip${n === 1 ? '' : 's'} each turn, so more tricks play (or linger) each turn` },
  proficiency: { name: 'Proficiency', short: 'Roll', text: 'Dice you may roll each turn. A die shows its value first; you then choose which shown trick it goes on.', per: (n) => `roll ${n} more ${n === 1 ? 'die' : 'dice'} (or flip ${n === 1 ? 'a chip' : 'chips'}) each turn, so bigger totals and more bonuses` },
  charisma: { name: 'Charisma', short: 'Steal', text: 'For each bid you leave unused, steal this many ¢ from the Stage onto your Meter.', per: (n) => `steal ${n} more ¢ from the Stage for every bid you leave unused` },
  cunning: { name: 'Cunning', short: 'Opportunity', text: 'For each roll you leave unused, gain this many Opportunity chips on your Meter.', per: (n) => `gain ${n} more Opportunity chip${n === 1 ? '' : 's'} for every roll you leave unused` },
  conviction: { name: 'Conviction', short: 'Power', text: 'For each draw you leave unused, gain this much Power. Power is added to your next roll effect.', per: (n) => `gain ${n} more Power for every draw you leave unused` },
  balance: { name: 'Balance', short: 'Stack height', text: 'Extra chips each space can hold (base 3).', per: (n) => `every space in your position holds ${n} more chip${n === 1 ? '' : 's'} (taller stacks in the Meter and the Bar)` },
  versatility: { name: 'Versatility', short: 'Meter rows', text: 'Extra Meter rows (base 2). The Meter sits in front and only holds chips gained during the bout.', per: (n) => `${n} more Meter row${n === 1 ? '' : 's'}: more room for Blocks, Opportunity and recovered chips, and more cover in front of your Bar` },
  depth: { name: 'Depth', short: 'Bar rows', text: 'Extra Bar rows (base 3). The Bar holds the chips you commit before the bout.', per: (n) => `${n} more Bar row${n === 1 ? '' : 's'}: room to put more chips on the table before the bout` },
};

// ---------- Dice ----------
export const DICE = {
  d4: { faces: 4, forge: { dice: 1, chips: 50, floor: 1 }, sell: 20 },
  d6: { faces: 6, forge: { dice: 2, chips: 60, floor: 1 }, sell: 40 },
  d8: { faces: 8, forge: { dice: 4, chips: 120, floor: 1 }, sell: 80 },
  d10: { faces: 10, forge: { dice: 5, chips: 800, floor: 2 }, sell: 200 },
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
  investment: { name: 'Investment', order: 0, color: '#8a6fd1', text: 'Resolves first. Modifies every other effect played this turn.',
    trait: 'Gain Power', traitText: (m) => `Gain ${m} Power (added to your next roll effect).` },
  insurance: { name: 'Insurance', order: 1, color: '#4aa3c7', text: 'Resolves second. Prevents, reduces or mitigates expenses.',
    trait: 'Block chip', traitText: (m) => `Add ${m} Block chip${m > 1 ? 's' : ''} to your Meter.` },
  expense: { name: 'Expense', order: 2, color: '#d9564a', text: 'Resolves third. Charges fees that move chips from a position to the Stage.',
    trait: 'Debt chip', traitText: (m) => `Place ${m}¢ of Debt on a random front stack of your opponent.` },
  correction: { name: 'Correction', order: 3, color: '#5bb174', text: 'Resolves last. Adjusts the placement and state of chips.',
    trait: 'Cleanse', traitText: (m) => `Remove ${m}¢ of Debt or ${m} hazard chip${m > 1 ? 's' : ''} from your position.` },
};
export const QMULT = [0, 1, 2, 3, 4];
export const QNAME = ['', 'Common', 'Fine', 'Grand', 'Royal'];
export const TRICK_UPGRADE_MAX = 2; export const DIE_UPGRADE_MAX = 2;

export const APPROACH = {
  front: 'the front-most stack of a column',
  rear: 'the rear-most stack of a column',
  flank: 'any stack in an edge column',
  body: 'the front row of the Bar, skipping the Meter',
  any: 'any stack',
  meter: 'any open Meter space',
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
  match: 'at least two dice match', evens: 'every die is even', odds: 'every die is odd',
};
export const condText = (c) => CONDS[c] || (c.startsWith('over:') ? `total is ${c.slice(5)} or more` : `total is ${c.slice(6)} or less`);

// side: whose position is targeted. roll.k is executed by the bout engine.
export const TRICKS = {
  // --- Expenses ---
  charge: { name: 'Charge', type: 'expense', cls: null, die: 'd6', count: 2, side: 'opp', approach: 'front', dist: 'hit',
    roll: { k: 'fee', text: 'Charge a fee equal to the total.' }, bonus: { cond: 'match', k: 'double', text: 'The fee is doubled.' } },
  mug: { name: 'Mug', type: 'expense', cls: 'hustler', die: 'd4', count: 2, side: 'opp', approach: 'front', dist: 'hit',
    roll: { k: 'fee', text: 'Charge a fee equal to the total.' }, bonus: { cond: 'match', k: 'glean', text: 'Chips paid go to your Meter instead of the Stage.' } },
  swipe: { name: 'Swipe', type: 'expense', cls: 'rascal', die: 'd6', count: 2, side: 'opp', approach: 'front', dist: 'swipe',
    roll: { k: 'fee', text: 'Charge a fee equal to the total, shared across the spaces.' }, bonus: { cond: 'evens', k: 'glean', text: 'Chips paid go to your Meter instead of the Stage.' } },
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
    roll: { k: 'fee', text: 'Charge a fee equal to the total, shared across the Bar spaces hit.' }, bonus: { cond: 'over:14', k: 'pierce', text: 'Ignores Block chips, Resist and Hardened stacks.' } },
  infect: { name: 'Infect', type: 'expense', cls: null, die: 'd6', count: 2, side: 'opp', approach: 'any', dist: 'hit', element: 'corrupt',
    roll: { k: 'fee', text: 'Charge a fee equal to the total and leave a Corrupting chip.' }, bonus: { cond: 'odds', k: 'spread', text: 'Hits the neighbouring stack too (Swipe).' } },
  envenom: { name: 'Envenom', type: 'expense', cls: null, die: 'd4', count: 2, side: 'opp', approach: 'rear', dist: 'hit', element: 'poison',
    roll: { k: 'fee', text: 'Charge a fee equal to the total and leave a Poison chip.' }, bonus: { cond: 'under:4', k: 'double', text: 'The fee is doubled.' } },
  rig: { name: 'Rig', type: 'expense', cls: null, die: 'd8', count: 1, side: 'opp', approach: 'any', dist: 'hit', element: 'boom',
    roll: { k: 'fee', text: 'Charge a fee equal to the total and leave a Boom chip.' }, bonus: { cond: 'over:6', k: 'double', text: 'The fee is doubled.' } },
  fuse: { name: 'Fuse', type: 'expense', cls: 'technician', die: 'd8', count: 2, side: 'opp', approach: 'body', dist: 'hit', plant: 'dynamite',
    roll: { k: 'fee', text: 'Charge a fee equal to the total on a Bar stack, then light a stack of Dynamite on the nearest empty space: one stick burns down each turn, then it destroys every chip around it.' }, bonus: { cond: 'over:12', k: 'double', text: 'The fee is doubled.' } },
  frost: { name: 'Frost', type: 'expense', cls: null, die: 'd6', count: 2, side: 'opp', approach: 'front', dist: 'hit', element: 'frost',
    roll: { k: 'fee', text: 'Charge a fee equal to the total and leave a Frost chip: that stack cannot be bid or flipped.' }, bonus: { cond: 'evens', k: 'spread', text: 'Frosts the neighbouring stack too (Swipe).' } },
  erupt: { name: 'Erupt', type: 'expense', cls: 'technician', die: 'd8', count: 2, side: 'opp', approach: 'body', dist: 'hit', element: 'lava',
    roll: { k: 'fee', text: 'Charge a fee equal to the total on a Bar stack and leave a Lava chip.' }, bonus: { cond: 'over:12', k: 'double', text: 'The fee is doubled.' } },
  ambush: { name: 'Ambush', type: 'expense', cls: 'hustler', die: 'd6', count: 2, side: 'opp', approach: 'front', dist: 'hit', early: 'investment',
    roll: { k: 'fee', text: 'Swift: plays with the Investments, before any Insurance this turn is up. Charge a fee equal to the total.' }, bonus: { cond: 'match', k: 'pierce', text: 'Ignores Block chips, Resist and Hardened stacks.' } },
  vengeance: { name: 'Vengeance', type: 'expense', cls: null, die: 'd6', count: 2, side: 'opp', approach: 'front', dist: 'hit', vengeance: true,
    roll: { k: 'fee', text: 'Charge a fee equal to the total plus every ¢ you paid in fees last turn.' }, bonus: { cond: 'over:8', k: 'glean', text: 'Chips paid go to your Meter instead of the Stage.' } },
  // --- Insurances ---
  block: { name: 'Block', type: 'insurance', cls: null, die: 'd6', count: 2, side: 'self', approach: 'meter', dist: 'hit',
    roll: { k: 'block', text: 'Add Block chips equal to the total to your Meter, starting at the target space.' }, bonus: { cond: 'evens', k: 'counter', text: 'They are Counter chips: each one also puts a Debt chip on the attacker.' } },
  brace: { name: 'Brace', type: 'insurance', cls: 'technician', die: 'd8', count: 2, side: 'self', approach: 'any', dist: 'swipe',
    roll: { k: 'harden', text: 'Harden the target stacks: each fee costs them only one chip. Lasts 1 turn per 4 rolled (at least 1).' }, bonus: { cond: 'over:9', k: 'aura', text: 'Hardens your whole position.' } },
  endure: { name: 'Endure', type: 'insurance', cls: null, die: 'd6', count: 1, side: 'none', approach: 'none', dist: 'hit',
    roll: { k: 'resist', text: 'Resist: every fee charged to you this turn is reduced by the total.' }, bonus: { cond: 'over:4', k: 'extend', text: 'Lasts through next turn as well.' } },
  hop: { name: 'Hop', type: 'insurance', cls: 'hustler', die: 'd4', count: 2, side: 'none', approach: 'none', dist: 'hit',
    roll: { k: 'evade', text: 'Evade: this turn, any fee larger than the total misses you entirely. Roll low.' }, bonus: { cond: 'under:4', k: 'extend', text: 'Lasts through next turn as well.' } },
  shine: { name: 'Shine', type: 'insurance', cls: 'rascal', die: 'd6', count: 2, side: 'none', approach: 'none', dist: 'hit',
    roll: { k: 'reflect', text: 'Reflect: up to the total of the next fee charged to you this turn is sent back at the attacker.' }, bonus: { cond: 'evens', k: 'extend', text: 'Reflects every fee this turn, not just the first.' } },
  chill: { name: 'Chill', type: 'insurance', cls: null, die: 'd6', count: 2, side: 'self', approach: 'any', dist: 'hit',
    roll: { k: 'freeze', text: 'Freeze up to the total chips of the target stack into one Frozen chip worth their sum. It cannot be bid, burned, corrupted or shocked, and a fee smaller than it only leaves Debt.' }, bonus: { cond: 'evens', k: 'spread', text: 'Freezes the neighbouring stack too (Swipe).' } },
  float: { name: 'Float', type: 'insurance', cls: 'rascal', die: 'd4', count: 2, side: 'self', approach: 'any', dist: 'hit',
    roll: { k: 'feather', text: 'Turn the top chip of the target stack into a Feather chip for 1 turn per 3 rolled (at least 1): any fee larger than that stack\'s worth misses it.' }, bonus: { cond: 'match', k: 'spread', text: 'Feathers the neighbouring stacks too (Swipe).' } },
  renew: { name: 'Renew', type: 'insurance', cls: null, die: 'd6', count: 2, side: 'self', approach: 'any', dist: 'hit',
    roll: { k: 'regen', text: 'Regen up to the total of the value chips in the target stack, for 1 turn per 4 rolled: a Regen chip paid to the Stage comes straight back to its stack, without its Regen.' }, bonus: { cond: 'match', k: 'spread', text: 'Renews the neighbouring stacks too (Swipe).' } },
  // --- Investments ---
  stir: { name: 'Stir', type: 'investment', cls: null, die: 'd6', count: 1, side: 'none', approach: 'none', dist: 'hit',
    roll: { k: 'boost', text: 'Boost: your other roll effects this turn gain the total.' }, bonus: { cond: 'over:5', k: 'extend', text: 'Also grants that much Power for next turn.' } },
  rattle: { name: 'Rattle', type: 'investment', cls: null, die: 'd6', count: 1, side: 'none', approach: 'none', dist: 'hit',
    roll: { k: 'enfeeble', text: 'Enfeeble: your opponent\'s roll effects this turn lose the total.' }, bonus: { cond: 'over:5', k: 'extend', text: 'They also lose half of it next turn.' } },
  bend: { name: 'Bend', type: 'investment', cls: 'rascal', die: 'd8', count: 1, side: 'none', approach: 'none', dist: 'hit', chooseRoller: true,
    roll: { k: 'bend', text: 'Bend: this roll replaces every die on your own played tricks this turn.' }, bonus: { cond: 'under:3', k: 'bendopp', text: 'A low roll bends your opponent\'s dice instead.' } },
  gild: { name: 'Gild', type: 'investment', cls: 'hustler', die: 'd4', count: 2, side: 'self', approach: 'any', dist: 'hit',
    roll: { k: 'gild', text: 'Gild up to the total chips in the target stack. Gold chips cannot be bid, but pay double if they survive the bout.' }, bonus: { cond: 'match', k: 'spread', text: 'Gilds the neighbouring stacks too (Swipe).' } },
  press: { name: 'Press', type: 'investment', cls: 'technician', die: 'd8', count: 1, side: 'none', approach: 'none', dist: 'hit',
    roll: { k: 'press', text: 'Press: your Expenses this turn gain the total and ignore Block chips, Resist and Hardened stacks.' }, bonus: { cond: 'over:6', k: 'extend', text: 'Also grants half that much Power for next turn.' } },
  parlay: { name: 'Parlay', type: 'investment', cls: 'hustler', die: 'd6', count: 1, side: 'none', approach: 'none', dist: 'hit',
    roll: { k: 'parlay', text: 'Gamble: on an even roll your other roll effects this turn are doubled. On an odd roll they are halved.' }, bonus: { cond: 'over:6', k: 'none', text: 'A six is always even. Nothing more to add.' } },
  saturate: { name: 'Saturate', type: 'investment', cls: 'rascal', die: 'd6', count: 2, side: 'none', approach: 'none', dist: 'hit',
    roll: { k: 'saturate', text: 'Your other roll effects this turn gain the total, and your opponent\'s boosts this turn are subdued to nothing.' }, bonus: { cond: 'match', k: 'extend', text: 'Their Power is drained to nothing as well.' } },
  // --- Corrections ---
  settle: { name: 'Settle', type: 'correction', cls: null, die: 'd6', count: 1, side: 'none', approach: 'none', dist: 'hit',
    roll: { k: 'settle', text: 'Remove Debt and hazard chips from your position up to the total, then organize your Bar into full stacks.' }, bonus: { cond: 'over:5', k: 'blocks', text: 'Also adds 2 Block chips to your Meter.' } },
  gather: { name: 'Gather', type: 'correction', cls: null, die: 'd6', count: 2, side: 'none', approach: 'none', dist: 'hit',
    roll: { k: 'gather', text: 'Recover up to the total in ¢ from the fees you have paid to the Stage, back onto your Meter.' }, bonus: { cond: 'match', k: 'both', text: 'Takes from your opponent\'s paid fees as well.' } },
  scatter: { name: 'Scatter', type: 'correction', cls: 'rascal', die: 'd6', count: 2, side: 'none', approach: 'none', dist: 'hit',
    roll: { k: 'scatter', text: 'Scatter chips from the front of your opponent\'s position, up to the total, to random spaces. Chips with nowhere to land fall to the Stage.' }, bonus: { cond: 'match', k: 'double', text: 'Scatters twice as many.' } },
  sweep: { name: 'Sweep', type: 'correction', cls: 'technician', die: 'd8', count: 1, side: 'none', approach: 'none', dist: 'hit',
    roll: { k: 'sweep', text: 'Sweep Block, Counter and Opportunity chips off your opponent\'s Meter, up to the total.' }, bonus: { cond: 'over:6', k: 'unharden', text: 'Also removes Hardened from every stack.' } },
  // Arrangements: corrections that move chips around a position. `arrange` names the move (see ARRANGE).
  // Lanes run from the Stage to the edge; forward is toward the Stage. They act on the lanes (or, for Lift and
  // Sink, the rows) their spread covers. Anchored stacks, Holes and Dynamite stay put; Debt and hazards stay
  // on their space, or move to the nearest stack in the lane if their space ends up empty.
  retreat: { name: 'Retreat', type: 'correction', cls: 'rascal', die: 'd6', count: 2, side: 'self', approach: 'any', dist: 'swipe', arrange: 'front',
    roll: { k: 'arrange', text: 'Push every chip in the target lanes forward, toward the Stage.' }, bonus: { cond: 'match', k: 'aura', text: 'Pushes your whole position forward.' } },
  advance: { name: 'Advance', type: 'correction', cls: 'hustler', die: 'd6', count: 2, side: 'self', approach: 'any', dist: 'swipe', arrange: 'back',
    roll: { k: 'arrange', text: 'Pull every chip in the target lanes back, away from the Stage.' }, bonus: { cond: 'match', k: 'aura', text: 'Pulls your whole position back.' } },
  lift: { name: 'Lift', type: 'correction', cls: null, die: 'd4', count: 2, side: 'self', approach: 'any', dist: 'wave', arrange: 'up',
    roll: { k: 'arrange', text: 'Shift every stack in the target rows up to the top lane, closing the gaps.' }, bonus: { cond: 'evens', k: 'aura', text: 'Shifts every row.' } },
  sink: { name: 'Sink', type: 'correction', cls: null, die: 'd4', count: 2, side: 'self', approach: 'any', dist: 'wave', arrange: 'down',
    roll: { k: 'arrange', text: 'Shift every stack in the target rows down to the bottom lane, closing the gaps.' }, bonus: { cond: 'evens', k: 'aura', text: 'Shifts every row.' } },
  bulwark: { name: 'Bulwark', type: 'correction', cls: 'technician', die: 'd8', count: 2, side: 'self', approach: 'any', dist: 'swipe', arrange: 'shields',
    roll: { k: 'arrange', text: 'Defensive: in the target lanes, Block, Counter, Petal and Clay chips move to the front, on top, and your value chips fall in behind them.' }, bonus: { cond: 'over:10', k: 'aura', text: 'Arranges your whole position.' } },
  stackup: { name: 'Stack Up', type: 'correction', cls: null, die: 'd6', count: 2, side: 'self', approach: 'any', dist: 'swipe', arrange: 'value-front',
    roll: { k: 'arrange', text: 'In the target lanes, sort chips by value with the biggest at the front: small fees only leave Debt on them.' }, bonus: { cond: 'match', k: 'aura', text: 'Sorts your whole position.' } },
  stash: { name: 'Stash', type: 'correction', cls: null, die: 'd6', count: 2, side: 'self', approach: 'any', dist: 'swipe', arrange: 'value-back',
    roll: { k: 'arrange', text: 'In the target lanes, sort chips by value with the biggest at the back, behind the small ones.' }, bonus: { cond: 'match', k: 'aura', text: 'Sorts your whole position.' } },
  expose: { name: 'Expose', type: 'correction', cls: 'rascal', die: 'd6', count: 2, side: 'opp', approach: 'any', dist: 'swipe', arrange: 'opp-value-front',
    roll: { k: 'arrange', text: 'Aggressive: in your opponent\'s target lanes, drag their biggest chips to the front where your fees land first.' }, bonus: { cond: 'evens', k: 'aura', text: 'Drags their whole position.' } },
  rout: { name: 'Rout', type: 'correction', cls: 'technician', die: 'd8', count: 2, side: 'opp', approach: 'any', dist: 'swipe', arrange: 'opp-shields-back',
    roll: { k: 'arrange', text: 'Aggressive: in your opponent\'s target lanes, push their Block, Counter, Petal and Clay chips to the back, out of the way.' }, bonus: { cond: 'over:10', k: 'aura', text: 'Routs their whole position.' } },
  gum: { name: 'Gum Up', type: 'correction', cls: 'rascal', die: 'd4', count: 2, side: 'opp', approach: 'any', dist: 'hit',
    roll: { k: 'sticky', text: 'Stick a Sticky chip on the target stack: its first timed modifier (a buff or a debuff) stops counting down.' }, bonus: { cond: 'match', k: 'spread', text: 'Gums the neighbouring stacks too (Swipe).' } },
  foretell: { name: 'Foretell', type: 'correction', cls: null, die: 'd6', count: 2, side: 'opp', approach: 'front', dist: 'swipe',
    roll: { k: 'doom', text: 'Plant a Doom chip on top of each target stack, up to the total. Your opponent sees plain 1¢ chips. Once every one of their stacks is topped with Doom, each Doom chip charges 1¢ of Debt a turn.' }, bonus: { cond: 'evens', k: 'aura', text: 'Plants on every stack.' } },
  conjure: { name: 'Conjure', type: 'correction', cls: 'technician', die: 'd8', count: 2, side: 'opp', approach: 'any', dist: 'hit',
    roll: { k: 'hat', text: 'Slip a Magic Hat under the target stack (a total of 8 or more). Each turn the chip on it falls in and is lost.' }, bonus: { cond: 'match', k: 'spread', text: 'Slips Hats under the neighbouring stacks too (Swipe).' } },
  handoff: { name: 'Hand Off', type: 'correction', cls: 'hustler', die: 'd4', count: 1, side: 'opp', approach: 'any', dist: 'hit',
    roll: { k: 'handoff', text: 'Move one of your Uranium chips onto the target stack. Its radiation is their problem now.' }, bonus: { cond: 'over:3', k: 'spread', text: 'Hands off one more Uranium chip next door.' } },
  fence: { name: 'Fence', type: 'correction', cls: 'hustler', die: 'd4', count: 2, side: 'none', approach: 'none', dist: 'hit',
    roll: { k: 'fence', text: 'Convert Debt chips on your position, up to the total, into Opportunity chips on your Meter.' }, bonus: { cond: 'match', k: 'blocks', text: 'Also adds 2 Block chips to your Meter.' } },
  // --- Makers ---
  // A maker places an effect chip where it belongs: Investments that work on your rolls on a Meter space (empty or
  // not), Insurances and Corrections on the stack they protect or clear. You aim it there; it is placed when it plays. The chip is physical: it
  // takes stack height, a fee that reaches it knocks it off, Corrections move it. While it lasts it does its work in
  // its trick's phase each turn. make: { chip, n: [base, per], life: [base, per] }: base + one more per `per` rolled.
  // These chips used to be sold at the Chip Exchange; an effect a trick can make is not sold.
  empower: { name: 'Empower', type: 'investment', cls: null, die: 'd6', count: 2, side: 'self', approach: 'meter', dist: 'hit', make: { chip: 'power', n: [1, 6], life: [2, 4] },
    roll: { k: 'make', text: 'Place Power chips on the target Meter space (1, +1 per 6 rolled). In each Investment phase every Power chip adds 1 to your roll effects. They last 2 turns, +1 per 4 rolled.' }, bonus: { cond: 'match', k: 'spread', text: 'Places them on the neighbouring spaces too (Swipe).' } },
  throttle: { name: 'Throttle', type: 'investment', cls: 'rascal', die: 'd6', count: 2, side: 'self', approach: 'meter', dist: 'hit', make: { chip: 'control', n: [1, 6], life: [2, 4] },
    roll: { k: 'make', text: 'Place Control chips on the target Meter space (1, +1 per 6 rolled). In each Investment phase every Control chip takes 1 off your opponent\'s roll effects. They last 2 turns, +1 per 4 rolled.' }, bonus: { cond: 'evens', k: 'spread', text: 'Places them on the neighbouring spaces too (Swipe).' } },
  load: { name: 'Load', type: 'investment', cls: 'hustler', die: 'd4', count: 2, side: 'self', approach: 'meter', dist: 'hit', make: { chip: 'boosted', n: [1, 8], life: [1, 4] },
    roll: { k: 'make', text: 'Place a Boosted chip on the target Meter space (+1 per 8 rolled): every die you roll shows 1 more per Boosted chip. It lasts 1 turn, +1 per 4 rolled.' }, bonus: { cond: 'match', k: 'spread', text: 'Places them on the neighbouring spaces too (Swipe).' } },
  shave: { name: 'Shave', type: 'investment', cls: 'technician', die: 'd8', count: 2, side: 'self', approach: 'meter', dist: 'hit', make: { chip: 'cheapened', n: [1, 10], life: [1, 5] },
    roll: { k: 'make', text: 'Place a Cheapened chip on the target Meter space (+1 per 10 rolled): every die your opponent rolls shows 1 less per Cheapened chip. It lasts 1 turn, +1 per 5 rolled.' }, bonus: { cond: 'over:12', k: 'spread', text: 'Places them on the neighbouring spaces too (Swipe).' } },
  tinker: { name: 'Tinker', type: 'investment', cls: null, die: 'd6', count: 1, side: 'self', approach: 'meter', dist: 'hit', make: { chip: 'upgrade', n: [1, 99], life: [1, 3] },
    roll: { k: 'make', text: 'Place an Upgrade chip on the target Meter space: while it is there, every die you roll takes a random upgrade (good or bad) for that roll. It lasts 1 turn, +1 per 3 rolled.' }, bonus: { cond: 'over:5', k: 'spread', text: 'Places one on a neighbouring space too (Swipe).' } },
  charm: { name: 'Charm', type: 'investment', cls: 'hustler', die: 'd4', count: 2, side: 'self', approach: 'meter', dist: 'hit', make: { chip: 'lucky', n: [1, 6], life: [2, 4] },
    roll: { k: 'make', text: 'Place Lucky chips on the target Meter space (1, +1 per 6 rolled). In each Investment phase each one has a 30% chance to put an Opportunity chip on your Meter. They last 2 turns, +1 per 4 rolled.' }, bonus: { cond: 'match', k: 'spread', text: 'Places them on the neighbouring spaces too (Swipe).' } },
  stow: { name: 'Stow', type: 'investment', cls: null, die: 'd6', count: 2, side: 'self', approach: 'meter', dist: 'hit', make: { chip: 'nest', n: [1, 7], life: [99, 99] },
    roll: { k: 'make', text: 'Place Nest Egg chips on the target Meter space (1, +1 per 7 rolled). They last the bout; each one still on your table when you win pays 15¢.' }, bonus: { cond: 'evens', k: 'spread', text: 'Places them on the neighbouring spaces too (Swipe).' } },
  echo: { name: 'Echo', type: 'investment', cls: 'rascal', die: 'd8', count: 1, side: 'self', approach: 'any', dist: 'hit', make: { chip: 'mimic', n: [1, 99], life: [1, 3] },
    roll: { k: 'make', text: 'Place a Mimic chip on top of the target stack: each phase while it is on top, one of your tricks of that type plays its roll effect again. It lasts 1 turn, +1 per 3 rolled.' }, bonus: { cond: 'over:6', k: 'spread', text: 'Places one on a neighbouring stack too (Swipe).' } },
  cushion: { name: 'Cushion', type: 'insurance', cls: null, die: 'd6', count: 2, side: 'self', approach: 'any', dist: 'hit', make: { chip: 'reducer', n: [1, 5], life: [2, 4] },
    roll: { k: 'make', text: 'Place Reducer chips on the target stack (1, +1 per 5 rolled): every fee that lands on it is 1¢ smaller per chip. They last 2 turns, +1 per 4 rolled.' }, bonus: { cond: 'match', k: 'spread', text: 'Places them on the neighbouring stacks too (Swipe).' } },
  wardoff: { name: 'Ward Off', type: 'insurance', cls: null, die: 'd8', count: 1, side: 'self', approach: 'any', dist: 'hit', make: { chip: 'ward', n: [1, 99], life: [1, 6] },
    roll: { k: 'make', text: 'Place a Ward chip on the target stack: when the House settles, it cancels the largest fee charged to your position. It lasts 1 turn, +1 per 6 rolled.' }, bonus: { cond: 'over:6', k: 'spread', text: 'Places one on a neighbouring stack too (Swipe).' } },
  recoil: { name: 'Recoil', type: 'insurance', cls: 'rascal', die: 'd6', count: 2, side: 'self', approach: 'any', dist: 'hit', make: { chip: 'rebound', n: [1, 6], life: [2, 4] },
    roll: { k: 'make', text: 'Place Rebound chips on the target stack (1, +1 per 6 rolled): each fee on it sends 2¢ of Debt back to the attacker per chip. They last 2 turns, +1 per 4 rolled.' }, bonus: { cond: 'evens', k: 'spread', text: 'Places them on the neighbouring stacks too (Swipe).' } },
  electrify: { name: 'Electrify', type: 'insurance', cls: 'technician', die: 'd6', count: 2, side: 'self', approach: 'any', dist: 'hit', make: { chip: 'zap', n: [1, 8], life: [2, 4] },
    roll: { k: 'make', text: 'Place a Zap chip on the target stack (+1 per 8 rolled): a fee of 3¢ or less there shocks the attacker; a bigger one shorts it out. It lasts 2 turns, +1 per 4 rolled.' }, bonus: { cond: 'over:9', k: 'spread', text: 'Places them on the neighbouring stacks too (Swipe).' } },
  moor: { name: 'Moor', type: 'insurance', cls: 'hustler', die: 'd4', count: 2, side: 'self', approach: 'any', dist: 'hit', make: { chip: 'anchor', n: [1, 99], life: [2, 3] },
    roll: { k: 'make', text: 'Place an Anchor chip on the target stack: creatures, Scatter, the Tornado and the Black Hole cannot take from it, and Corrections do not move it. It lasts 2 turns, +1 per 3 rolled.' }, bonus: { cond: 'match', k: 'spread', text: 'Anchors the neighbouring stacks too (Swipe).' } },
  veil: { name: 'Veil', type: 'insurance', cls: 'rascal', die: 'd4', count: 2, side: 'self', approach: 'any', dist: 'hit', make: { chip: 'transpara', n: [1, 99], life: [1, 3] },
    roll: { k: 'make', text: 'Place a Transpara-Chip on the target stack: your opponent cannot aim at it (spreads, rain and hazards still reach it). It lasts 1 turn, +1 per 3 rolled.' }, bonus: { cond: 'evens', k: 'spread', text: 'Veils the neighbouring stacks too (Swipe).' } },
  shade: { name: 'Shade', type: 'insurance', cls: null, die: 'd4', count: 2, side: 'self', approach: 'any', dist: 'hit', make: { chip: 'shadow', n: [1, 99], life: [2, 3] },
    roll: { k: 'make', text: 'Place a Shadow chip on the target stack: it cannot be aimed at while the stack in front of it is taller. It lasts 2 turns, +1 per 3 rolled.' }, bonus: { cond: 'match', k: 'spread', text: 'Shades the neighbouring stacks too (Swipe).' } },
  attune: { name: 'Attune', type: 'correction', cls: null, die: 'd6', count: 2, side: 'self', approach: 'any', dist: 'hit', make: { chip: 'harmony', n: [1, 6], life: [2, 4] },
    roll: { k: 'make', text: 'Place Harmony chips on the target stack (1, +1 per 6 rolled). In each Correction phase each one clears a hazard chip or 1¢ of Debt on its stack or the stacks around it, leaving a 1¢ chip in place of a hazard. They last 2 turns, +1 per 4 rolled.' }, bonus: { cond: 'match', k: 'spread', text: 'Places them on the neighbouring stacks too (Swipe).' } },
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
  boom: { name: 'Boom chip', text: 'Hazard. The turn after it lands it goes off: 5¢ of Debt on its stack and on every stack around it.' },
  // conversions and growth from the workbook's chip list. Instance shields take a whole fee each, not 1¢.
  frozen: { name: 'Frozen chip', text: 'Several Royal Paradise chips frozen into one, worth their sum. It cannot be bid or flipped, and cannot be burned, corrupted, shocked or turned into another chip. A fee smaller than it only leaves Debt.' },
  frost: { name: 'Frost chip', text: 'Hazard (Cold). Its stack is frosted over: nothing on it can be bid or flipped. Thaws after 2 turns, or at once if a Burning or Lava chip reaches it.' },
  lava: { name: 'Lava chip', text: 'Hazard (Heat). Each turn it melts the chip beneath it and spills a Burning chip onto a stack next to it. Cools after 2 turns.' },
  feather: { name: 'Feather chip', text: 'A chip turned light for a few turns: any fee larger than its stack\'s worth misses the stack.' },
  flower: { name: 'Flower chip', text: 'Grown from a Seed. Each turn it blooms a Petal on the stacks around it, one per chip it is rooted in (up to 8). Blocks one entire fee and breaks.' },
  petal: { name: 'Petal chip', text: 'Bloomed by a Flower. Blocks one entire fee, however big, and breaks: fee instance defence, where a Block chip only takes 1¢ of a fee\'s cost. Wilts after 2 turns.' },
  clay: { name: 'Clay chip', text: 'Blocks entire fees, one per hit, and breaks after its count of hits. Fire bakes it into Brick.' },
  brick: { name: 'Brick chip', text: 'Baked Clay. Takes twice as many fees as the clay did before it breaks.' },
  stray: { name: 'Stray Debt', text: 'A fee that landed on nothing. It comes to nothing when the House settles.' },
  hard: { name: 'Hardened chip', text: 'Lies over its stack for a few turns: each fee takes only one chip from the stack and nothing carries on. No worth. A piercing fee destroys it; cleansing removes it.' },
  sticky: { name: 'Sticky chip', text: 'Gummed onto a stack by an opponent. The first timed modifier on the stack (Hardened, Feather, Regen, a Burning, Shocking, Corrupting, Frost or Lava chip, or Petals) stops counting down while it stays. Its value is the height of the stack it stuck to. Cleansing removes it.' },
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
    text: (v) => `In each Investment phase, a ${Math.round(v.chance * 100)}% chance to put an Opportunity chip on your Meter.` },
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
    text: () => 'Planted on an empty Bar space. It grows a chip taller each turn; at full height it drops a Seed on each stack around it (one per chip of height, up to 8). A fee that hits it fells it: it blocks that fee and falls into Wood chips on the spaces around it, one per chip of height. No worth.' },
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
  steal: { name: 'Steal chip', tier: 1, sold: false, from: 'stat:charisma', glyph: '🫳', text: () => 'Made from bids left unused (Charisma). In the House phase it steals what it carries from the Stage (your fees first, then your opponent\'s) onto your Meter, then it is gone.' },
  honey: { name: 'Honey Chip', tier: 2, sold: false, from: 'bees', glyph: '🍯', kind: 'food', place: 'top', list: 'Honey Chip', food: { mods: { proficiency: 1, ingenuity: 1 }, turns: 1 },
    text: () => 'Food (sticky, golden). Eat it: +1 Roll and +1 Bid this turn.' },
  chipchip: { name: 'Chip Chip', tier: 1, glyph: '🥔', kind: 'food', place: 'top', list: 'Chip Chip', food: { mods: { charisma: 1 }, turns: 1, dip: true },
    text: () => 'Food. Eat it: +1 Steal this turn, doubled if you have a Dip chip with dip left.' },
  dip: { name: 'Dip Chip', tier: 2, glyph: '🥣', kind: 'dip', place: 'space', vars: { dips: 3 }, list: 'Dip Chip',
    text: (v) => `A bowl on its own empty space. The next ${v.dips} Chip Chips you eat are dipped for twice the bonus.` },
  fishchip: { name: 'Fish ’n Chip', tier: 2, glyph: '🐟', kind: 'food', place: 'top', list: 'Fish "n Chip', food: { per: 'conviction', turns: 1 },
    text: () => 'Food. Eat it: +1 Power-per-draw (Conviction) for every chip under it (n, up to 3) this turn.' },
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
    text: () => 'Lies on your Meter. While it is there, each Upgrade chip puts a random die upgrade (good or bad) on every die you roll, for that roll only. Bid it on a trick and that trick plays one upgrade higher.' },
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
  if (f.startsWith('stat:')) return { charisma: 'bids left unused when the Bid phase is passed (Charisma)' }[f.slice(5)] || f;
  return { bees: 'Bumble Bees pollinating your Flowers', roost: 'a Dragon on its Roost' }[f] || f;
}
// the trick that makes a chip, if any
export const makerOf = (id) => Object.keys(TRICKS).find((k) => TRICKS[k].make?.chip === id) || null;
// the hazards a shop chip stops: its own `resist` plus any in `also`
export const resistsOf = (id) => { const X = SHOP_CHIPS[id]; return X?.resist ? [X.resist, ...(X.also || [])] : []; };
export const shopVars = (id) => SHOP_CHIPS[id].vars || {};
export const shopText = (id) => { const X = SHOP_CHIPS[id]; return typeof X.text === 'function' ? X.text(shopVars(id)) : X.text; };
export const SHOP_CHIP_STAKE = true;
export const shopPrice = (id) => SHOP_CHIPS[id].price ?? CHIP_TIERS[SHOP_CHIPS[id].tier].price;
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
export const CREATURES = {
  ufo: { name: 'UFO', glyph: '🛸', hits: 1, life: 1, layer: 'flying', text: 'Flying. Abducts the top chip of a random stack, stays the turn, then flies home. Chips taken are lost.' },
  fairy: { name: 'Fairy', glyph: '🧚', hits: 1, life: 2, layer: 'flying', text: 'Flying. Converts the top chip of a random stack into a random chip. Chaos reigns!' },
  dragon: { name: 'Dragon', glyph: '🐉', hits: 50, life: 2, layer: 'flying', text: 'Flying. Breathes a Burning chip onto a random stack each turn.' },
  mole: { name: 'Mole', glyph: '🐭', hits: 1, life: 2, layer: 'ground', text: 'Digs up a random empty space and leaves a Hole, then sits in it.' },
  unicorn: { name: 'Unicorn', glyph: '🦄', hits: 1, life: 1, layer: 'ground', text: 'Converts every chip in a random stack into random chips. Chaos reigns!' },
  mothership: { name: 'Mothership', glyph: '👾', hits: 10, life: 5, layer: 'flying', text: 'Flying. Hovers over one stack and beams up a chip every turn until the stack is gone. Chips taken are lost.' },
  ghost: { name: 'Ghost', glyph: '👻', hits: 0, life: 3, layer: 'flying', text: 'Very spooky. Fear: no trick can aim at its row, only spreads reach it. It cannot be damaged, and no overkill passes into or through its row.' },
  ghostship: { name: 'Ghost Ship', glyph: '🏴‍☠️', hits: 100, life: 6, layer: 'flying', text: 'A vehicle that sails across empty spaces to a stack with a Gold chip on top and steals it. Takes 100 fee instances to sink; sunk, it drops a Treasure chip with everything it stole.' },
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
  blackhole: { name: 'Black Hole', text: 'A hole in space on one of your Bar spaces: anything put on it is gone. Every turn, and whenever a Correction moves chips, it consumes the bottom chip of a stack next to it.' },
  volcano: { name: 'Volcano', text: 'A full stack of Volcano chips, two spaces by two where there is room. Nothing can be placed on it. For four turns it launches a Burning chip at one of your stacks, then goes dormant: the space comes back one stack height lower.' },
  tornado: { name: 'Tornado', text: 'A Tornado chip moves over your position. Its strength is rolled on 2d6; a stack under it shorter than that is thrown about, and some of its chips may be lost.' },
  blizzard: { name: 'Blizzard', text: 'Every fourth turn a Blizzard covers your whole table for a turn: stacks shorter than its strength (2d6) freeze into one Frozen chip.' },
  b52: { name: 'B-52', text: 'Launches a B-52 over your position: it flies along a row dropping a 52¢ Boom chip on a stack each turn.' },
};

// ---------- Wagers and tilts ----------
// After a win you always keep the money; then pick one prize. `bonus` is the bonus money, as a share of the
// opponent's starting worth, paid with the one-die prize.
export const PRIZES = { bonus: 0.25 };
export const WAGER_BASE = 1.5; export const WAGER_BOSS = 3; export const DD_MAX = 6;
// Tilts are switched on or off for a bout. While one is on, the House may play it during the bout, in the House
// phase. How often and how hard depends on the bout: the more you have lost to the House (your fees paid to the
// Stage, as a share of what you started with) the harder Challenges hit; the more your opponent has lost to the House,
// the stronger your Cheats. `floor`: the first floor that offers it. `mult`: what it adds to (Challenge) or takes from
// (Cheat) the wager multiplier. Early purses sit almost wholly on the table, so the wager alone rarely carries that;
// the same share of the opponent's worth is also paid on a win: a House bounty for a Challenge, a House cut for a Cheat.
// `base` and `per`: the House's chance to play it each turn, base + per × pressure.
export const TILTS = {
  hazard: { kind: 'challenge', name: 'Hazard', floor: 1, mult: 0.25, base: 0.25, per: 0.6, text: 'The House digs Holes in empty spaces of your position (one in three is a Magic Hat slipped under a stack). More of them, more often, the more you have lost to the House.' },
  creature: { kind: 'challenge', name: 'Creature', floor: 1, mult: 0.35, base: 0.2, per: 0.6, text: 'The House sends creatures to your position. The more you have lost to the House, the more often, and the bigger the creatures it can call.' },
  spawner: { kind: 'challenge', name: 'Spawner', floor: 2, mult: 0.4, base: 0.15, per: 0.5, text: 'The House sets nests on your position that send a creature every third turn (every second, once you have lost a third of your chips). One in two is a Dragon Roost: it takes a Bar space and calls a Dragon that lays eggs on it.' },
  calamity: { kind: 'challenge', name: 'Calamity', floor: 3, mult: 0.5, base: 0.12, per: 0.45, text: 'The House starts disasters on your position: a Worm Hole, Inferno, Audit, Black Hole, Volcano, Tornado, Blizzard or B-52. A second one comes once you have lost half your chips.' },
  shield: { kind: 'cheat', name: 'Shield', floor: 1, mult: 0.25, base: 0.3, per: 0.6, text: 'The House drops Block chips on your Meter: more, and more often, the more your opponent has lost to the House.' },
  familiar: { kind: 'cheat', name: 'Familiar', floor: 1, mult: 0.1, base: 0.35, per: 0.6, text: 'The House sends you a little friend that removes one Debt or hazard chip each turn and may chase creatures away. Up to three, as your opponent loses to the House. One play in three sets a Hive on an empty space of your position instead: it sends out Bumble Bees that sting creatures and pollinate your Flowers into Honey.' },
  position: { kind: 'cheat', name: 'Position', floor: 1, mult: 0.15, base: 0, per: 0, text: 'Adds +1 to Balance, Versatility and Depth for this bout. The House plays it when you sit down, so it does not grow during the bout.' },
  intervention: { kind: 'cheat', name: 'Intervention', floor: 3, mult: 0.3, base: 0, per: 0, text: 'Once, when you would go broke, the House restores your paid fees: half of them, up to all of them the more your opponent has lost to the House. It costs half your wager.' },
};
// What the House reads when it plays a tilt: a Roller's pressure is a weighted mix of the share of their starting
// chips they have paid to the House (`lost`), the overkill and Meter overflow wasted on their side as a share of what
// they started with (`overkill`), how full their Meter is (`fill`, 0 to 1) and the worth sitting in it as a share of
// what they started with (`value`). Challenges read your pressure, Cheats your opponent's.
export const TILT_PRESSURE = { lost: 1, overkill: 0.5, fill: 0.2, value: 0.3 };
export const TILT_WORTH_SHARE = 1; // × mult × opponent worth, paid (Challenge) or taken (Cheat) on a win
export const tiltChance = (key, pressure) => Math.min(0.95, TILTS[key].base + TILTS[key].per * pressure);

// ---------- Floors and opponents ----------
export const FLOORS = [
  null,
  { name: 'Boogey Basement', line: 'These clowns and losers are just the stepping stones to greater Worth.', worth: [36, 44, 52], boss: 64, cut: 10 },
  { name: 'Hustlers Haven', line: 'Beware, these rollers are no slouches. Cinch your purse strings on your way in.', worth: [80, 95, 110], boss: 160, cut: 100 },
  { name: 'Rollers Suite', line: "You're doing it! Time to play with the high rollers. Do you have what it takes?", worth: [250, 300, 350], boss: 500, cut: 1000 },
  { name: 'Royal Paradise', line: 'This room is for royal rollers only. It sure would be a shame to dethrone them.', worth: [450, 550, 650], boss: 740, cut: 100000 },
];
export const OPPONENTS = ['Leather Wallet', 'Designer Purse', 'Money Clip', 'Credit Card', 'Wad of Cash', 'Coin Dispenser', 'Piggy Bank', 'Trained Monkey', 'Tip Jar',
  'Block Chain', 'Gold Chain', 'Platinum Teeth', 'Golden Parachute', 'Phone Scam', 'Phishing Email', 'Long Con', 'Blink Dagger', 'Paper Check', 'Money Order',
  'Championship Trophy', 'Prize Pig', 'Bounty Reward', 'Finders Fee', 'Sly Fox', 'Ceramic Frog', 'Bearish Forecast', 'Bull Market', 'Savings Account', 'College Tuition',
  'Research Grant', 'Student Loan', 'Mortgage Payment', 'Lease Agreement', 'Bank Statement', 'Pyramid Scheme', 'Highway Robber', 'Gambling Addict', 'Inside Job',
  'Chocolate Coins', 'Finance Secretary', 'Certified Accountant', 'Shaken Stirrer', 'Stirred Shaker', 'High Ball', 'Chain Smoker', 'HSA Account', 'Health Benefits',
  'Crinkled IOU', 'Veteran Hustler', 'Vending Machine', 'Low Ball'];
export const BOSSES = [null,
  ['ATM Machine', 'Pile of Cash', 'Exotic Animal', 'Antique Clock'], ['Gold Bar', 'Uncut Gem', 'Luxury Vehicle', 'Lucrative Deal'],
  ['Sunken Treasure', 'Endangered Species', 'Vested 401k', 'Project Funding'], ['Trust Fund', 'The Vault', 'Priceless Painting', 'Ancient Artifact']];
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
export const CARDS = {
  discount_diesmith: { name: 'Discount Card: Diesmith', text: '10% off at the Diesmith.' },
  discount_trader: { name: 'Discount Card: Trick Trader', text: '10% off at the Trick Trader.' },
  discount_lounge: { name: 'Discount Card: Lounge', text: '10% off drinks at the Lounge.' },
  business_trickery: { name: 'Business Card: Dealer', text: '+1 Trickery.', mods: { trickery: 1 } },
  business_ingenuity: { name: 'Business Card: Broker', text: '+1 Ingenuity.', mods: { ingenuity: 1 } },
  business_proficiency: { name: 'Business Card: Shooter', text: '+1 Proficiency.', mods: { proficiency: 1 } },
  business_charisma: { name: 'Business Card: Agent', text: '+1 Charisma.', mods: { charisma: 1 } },
  business_cunning: { name: 'Business Card: Fixer', text: '+1 Cunning.', mods: { cunning: 1 } },
  business_conviction: { name: 'Business Card: Closer', text: '+1 Conviction.', mods: { conviction: 1 } },
  royal: { name: 'Royal Card', text: 'Received after winning your first bout. You need it in your wallet to walk into the casino. Once you are on the floor it does nothing more, and you can drop it to free the slot.' },
  paradise: { name: 'Paradise Card', text: 'Earned by beating the last High Roller. It opens the Paradise Ascent.' },
  membership: { name: 'Membership Card', text: 'Earned by buying 5 tricks on one floor. Opens the Trick Trader\'s Secret Shelf and takes 10% off everything the Trader sells.' },
  suite: { name: 'Suite Key Card', text: 'Earned by winning a Double Down. Opens a Suite after you beat the High Roller.' },
  resist_card: { name: 'Resist Card', text: 'Debt resistance. Each bout starts with a Resist chip (r = 2) at the base of one of your front Bar stacks: fees under 2¢ on that stack are deterred.', resist: 2 },
  resist_card_plus: { name: 'Resist Card: Gold', text: 'Debt resistance. Each bout starts with a Resist chip (r = 3) at the base of one of your front Bar stacks: fees under 3¢ on that stack are deterred.', resist: 3 },
  debit: { name: 'Debit Card', text: 'Found by searching the floor. Lets you use the ATM in the Gift Shop, which keeps chips between runs.' },
  punch: { name: 'Punch Card', text: 'One punch per drink bought. Five punches and the next drink is free.' },
  note: { name: 'Note: on bidding', text: '"Small chips bid fast. Big chips linger. Keep a stack of 1¢ chips at the back."' },
  note_dice: { name: 'Note: on dice', text: '"Roll first, look, then place. A low roll is not wasted: some bonuses want a small total, and a pair of anything is a match."' },
  note_debt: { name: 'Note: on Debt', text: '"Debt only takes a chip it can cover. A 5¢ chip on top shrugs off a 4¢ fee, but the Debt stays and the next fee finishes it."' },
  note_house: { name: 'Note: on the House', text: '"Both arms move at once. What you play this phase cannot change what they play this phase. Insure a turn early, not the same turn."' },
  note_hold: { name: 'Note: on holding back', text: '"A turn with nothing worth playing still pays. Every draw, roll and bid you leave unused earns Power, Opportunity or chips off the Stage."' },
  note_flip: { name: 'Note: on flips', text: '"Out of dice? Flip a chip. It lands on nothing or its worth, fits any trick, and comes back to your Meter afterwards."' },
  trading: { name: "Trading Card: Children of Ae'a", text: 'From a super popular card game. Does not seem to do anything here.' },
};
// Wallets hold the cards that grant benefits. `keep` is the total two of your dice must reach in the alley to retain them.
export const WALLETS = {
  worn_cloth: { name: 'Worn Cloth', color: '#8d8478', slots: 2, keep: 14, price: 0, level: 0 },
  duct_tape: { name: 'Duct Tape', color: '#b5b8bd', slots: 1, keep: 10, price: 0, level: 0 },
  silver_clip: { name: 'Silver Clip', color: '#d6dde6', slots: 4, keep: 14, price: 1000, level: 0 },
  chained_snap: { name: 'Chained Snap', color: '#5a5f6b', slots: 2, keep: 7, price: 1000, level: 0 },
  neon_zip: { name: 'Neon Zip', color: '#ff86ea', slots: 1, keep: 6, price: 1000, level: 0 },
  worn_leather: { name: 'Worn Leather', color: '#7a4b2a', slots: 3, keep: 10, price: 1000, level: 0 },
  diamond_clip: { name: 'Diamond Clip', color: '#bff3ff', slots: 3, keep: 7, price: 100000, level: 2 },
  magnetic_snap: { name: 'Magnetic Snap', color: '#3c4a6b', slots: 1, keep: 4, price: 100000, level: 2 },
  velvet_zip: { name: 'Velvet Zip', color: '#8a2d5a', slots: 2, keep: 6, price: 100000, level: 2 },
  fine_leather: { name: 'Fine Leather', color: '#4a2412', slots: 4, keep: 12, price: 100000, level: 2 },
  royal_luxury: { name: 'Royal Luxury', color: '#ffd76a', slots: 4, keep: 7, price: 10000000, level: 4, crown: true },
};
// passes are clipped to your lanyard and do not take a wallet slot. The Royal Card does take one (Collectables C80).
export const PASS_CARDS = ['membership', 'suite', 'punch', 'paradise'];
export const PURSE_LIMIT = 999e12;
export const STARTER_CARDS = ['discount_diesmith', 'discount_trader', 'discount_lounge', 'business_trickery', 'business_ingenuity', 'business_proficiency',
  'business_charisma', 'business_cunning', 'business_conviction'];
export const FIND_CARDS = ['resist_card', 'resist_card_plus', 'debit', 'note', 'note_dice', 'note_debt', 'note_house', 'note_hold', 'note_flip', 'trading', 'punch'];
export const WALLET_SLOTS = 4;
