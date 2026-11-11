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
  d6: { faces: 6, forge: { dice: 2, chips: 100, floor: 1 }, sell: 40 },
  d8: { faces: 8, forge: { dice: 4, chips: 200, floor: 1 }, sell: 80 },
  d10: { faces: 10, forge: { dice: 5, chips: 2000, floor: 2 }, sell: 200 },
  d20: { faces: 20, forge: { dice: 20, chips: 5000, floor: 2 }, sell: 500 },
};
// The workbook's 22 dice upgrades. A die has faces (1 to n to start); most upgrades change them when bought,
// a few change how the die rolls. `target`: the buyer picks a face. `roll`: works when the die is rolled, so it
// cannot be taken twice. `mark`/`color`: the badge the die wears. `floor`: the Diesmith offers it from this floor.
// Numbers the rules read are in DIE_VARS. Faces that change with use (Rig, Enchant, Encase) reset each bout.
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
  rig: { name: 'Rig', text: (v) => `The target face is worth ×${v.rig}, but it is spent (0) after it comes up once in a bout.`, mark: '×', color: '#ff5a4a', target: true, floor: 2 },
  enchant: { name: 'Enchant', text: (v) => `The target face is worth ×${v.enchant}, dwindling by 1 each time it comes up in a bout.`, mark: '✧', color: '#b08cff', target: true, floor: 2 },
  encase: { name: 'Encase', text: (v) => `The target face starts each bout at 0 but grows by ${v.encaseStep} each time it comes up.`, mark: '▣', color: '#c9d3e0', target: true, floor: 2 },
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
  // --- Corrections ---
  settle: { name: 'Settle', type: 'correction', cls: null, die: 'd6', count: 1, side: 'none', approach: 'none', dist: 'hit',
    roll: { k: 'settle', text: 'Remove Debt and hazard chips from your position up to the total, then organize your Bar into full stacks.' }, bonus: { cond: 'over:5', k: 'blocks', text: 'Also adds 2 Block chips to your Meter.' } },
  gather: { name: 'Gather', type: 'correction', cls: null, die: 'd6', count: 2, side: 'none', approach: 'none', dist: 'hit',
    roll: { k: 'gather', text: 'Recover up to the total in ¢ from the fees you have paid to the Stage, back onto your Meter.' }, bonus: { cond: 'match', k: 'both', text: 'Takes from your opponent\'s paid fees as well.' } },
  scatter: { name: 'Scatter', type: 'correction', cls: 'rascal', die: 'd6', count: 2, side: 'none', approach: 'none', dist: 'hit',
    roll: { k: 'scatter', text: 'Scatter chips from the front of your opponent\'s position, up to the total, to random spaces. Chips with nowhere to land fall to the Stage.' }, bonus: { cond: 'match', k: 'double', text: 'Scatters twice as many.' } },
  sweep: { name: 'Sweep', type: 'correction', cls: 'technician', die: 'd8', count: 1, side: 'none', approach: 'none', dist: 'hit',
    roll: { k: 'sweep', text: 'Sweep Block, Counter and Opportunity chips off your opponent\'s Meter, up to the total.' }, bonus: { cond: 'over:6', k: 'unharden', text: 'Also removes Hardened from every stack.' } },
  fence: { name: 'Fence', type: 'correction', cls: 'hustler', die: 'd4', count: 2, side: 'none', approach: 'none', dist: 'hit',
    roll: { k: 'fence', text: 'Convert Debt chips on your position, up to the total, into Opportunity chips on your Meter.' }, bonus: { cond: 'match', k: 'blocks', text: 'Also adds 2 Block chips to your Meter.' } },
};
export const TRICK_IDS = Object.keys(TRICKS);

// ---------- Chips ----------
export const DENOMS = [ { value: 1, floor: 1 }, { value: 2, floor: 2 }, { value: 5, floor: 2 }, { value: 10, floor: 3 } ];
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
  feather: { name: 'Feather chip', text: 'A chip turned light for a few turns: any fee larger than its stack\'s worth misses the stack.' },
  flower: { name: 'Flower chip', text: 'Grown from a Seed. Each turn it blooms a Petal on the stacks around it, one per chip it is rooted in (up to 8). Takes one fee to break.' },
  petal: { name: 'Petal chip', text: 'Bloomed by a Flower. Takes one whole fee and breaks. Wilts after 2 turns.' },
  clay: { name: 'Clay chip', text: 'Takes a whole fee and cracks; it breaks after its count of fees. Fire bakes it into Brick.' },
  brick: { name: 'Brick chip', text: 'Baked Clay. Takes twice as many fees as the clay did before it breaks.' },
  dynamite: { name: 'Dynamite', text: 'A stack of sticks on an empty space. One burns down each turn; when the last goes, every chip on the stacks around it is destroyed. Cleansing removes it.' },
};
// Chips no trick or table effect makes are sold at the Chip Exchange. Their price comes from a tier: how strong
// the chip is, or how strong it is meant to feel until it has been tuned. Change a tier's price or floor here
// and every chip in it follows. A chip can set its own `price` to step outside its tier.
export const CHIP_TIERS = [
  null,
  { name: 'Common', price: 20, floor: 1, color: '#c9d3e0' },
  { name: 'Uncommon', price: 120, floor: 1, color: '#7dffb5' },
  { name: 'Rare', price: 600, floor: 2, color: '#63c4ff' },
  { name: 'Epic', price: 3000, floor: 3, color: '#b08cff' },
  { name: 'Royal', price: 15000, floor: 4, color: '#ffd76a' },
];
// Shop chips are worth 1¢ like any other chip, are deployed at the base of your stacks, are not wagered,
// and come back to you after a win if they survive. `resist`: the hazard a stack holding one is immune to.
// `vars`: the numbers each effect reads, kept here so they can be tuned without touching the engine.
// The chip object carries its shop id in `resist` (the field predates the specials) and in `shop`.
// `kind`: a shop chip that is not a value chip (default: a 1¢ Royal Paradise chip). `place`: 'top' puts it on
// top of a stack instead of at the base. `list`: its row in docs/CHIP-LIST.tsv.
export const SHOP_CHIPS = {
  burn: { name: 'Red chip', tier: 1, resist: 'burn', verb: 'extinguishes', glyph: '◆',
    text: 'A stack holding one extinguishes Burning chips and cannot catch fire.' },
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
  reducer: { name: 'Reducer chip', tier: 2, glyph: '◎', vars: { absorb: 1 }, list: 'Reducer Chip',
    text: (v) => `Every fee that lands on its stack is ${v.absorb}¢ smaller. Pierce goes straight through it.` },
  anchor: { name: 'Anchor chip', tier: 2, glyph: '⚓', list: 'Anchor Chip',
    text: () => 'Creatures, Scatter, the Tornado and the Black Hole cannot take chips from its stack.' },
  nest: { name: 'Nest Egg chip', tier: 2, glyph: '◒', vars: { payout: 15 },
    text: (v) => `If it is still on the table when you win, it pays ${v.payout}¢ on top of your winnings.` },
  rebound: { name: 'Rebound chip', tier: 3, glyph: '◐', vars: { reflect: 2 },
    text: (v) => `Each fee on its stack sends ${v.reflect}¢ of Debt back to the attacker's front stack in the same lane. The fee is still charged.` },
  lucky: { name: 'Lucky chip', tier: 3, glyph: '✦', vars: { chance: 0.3 },
    text: (v) => `Each turn, a ${Math.round(v.chance * 100)}% chance to put an Opportunity chip on your Meter.` },
  transpara: { name: 'Transpara-Chip', tier: 3, glyph: '◌', list: 'Transpara-Chip',
    text: () => 'Its stack cannot be aimed at by your opponent. Spreads, rain and hazards (fire, shock, corruption) still reach it.' },
  // from the workbook's chip list
  seed: { name: 'Seed chip', tier: 2, glyph: '❀', place: 'top', list: 'Seed p¢ Chip',
    text: () => 'Goes on top of a stack. If the stack has at least 2 chips when the bout starts, it sprouts into a Flower chip that blooms Petals around it each turn. Each Petal takes a whole fee.' },
  clay: { name: 'Clay chip', tier: 2, glyph: '▤', kind: 'clay', place: 'top', vars: { hits: 2 }, list: 'Clay Chip',
    text: (v) => `Goes on top of a stack. Takes ${v.hits} whole fees, then breaks. Fire on its stack bakes it into a Brick chip that takes twice as many. No worth.` },
  harmony: { name: 'Harmony chip', tier: 3, glyph: '☯', vars: { per: 1 }, list: 'Harmony Chip',
    text: (v) => `Each turn it clears ${v.per} hazard chip or ¢ of Debt from its stack or the stacks around it. A hazard chip it clears is replaced by a 1¢ chip if there is room.` },
  power: { name: 'Power chip', tier: 2, glyph: '⚡︎', vars: { boost: 1, turns: 4 }, list: 'Power Chip',
    text: (v) => `Each turn, your roll effects gain ${v.boost}. After ${v.turns} turns it settles into a plain 1¢ chip.` },
  control: { name: 'Control chip', tier: 2, glyph: '⊘', vars: { enfeeble: 1, turns: 4 }, list: 'Control Chip',
    text: (v) => `Each turn, your opponent's roll effects lose ${v.enfeeble}. After ${v.turns} turns it settles into a plain 1¢ chip.` },
  ward: { name: 'Ward chip', tier: 4, glyph: '⛨', vars: { per: 1 }, list: 'Ward Chip',
    text: (v) => `Each turn the House cancels the ${v.per > 1 ? v.per + ' largest fees' : 'largest fee'} charged to your position.` },
  shadow: { name: 'Shadow chip', tier: 2, glyph: '◗', list: 'Shadow Chip',
    text: () => 'Its stack cannot be aimed at while the stack in front of it in the lane is taller.' },
  crown: { name: 'Crown chip', tier: 4, glyph: '♛', vars: { turns: 3 },
    text: (v) => `Its stack starts the bout Hardened for ${v.turns} turns: each fee takes only one chip.` },
};
// the hazards a shop chip stops: its own `resist` plus any in `also`
export const resistsOf = (id) => { const X = SHOP_CHIPS[id]; return X?.resist ? [X.resist, ...(X.also || [])] : []; };
export const shopVars = (id) => SHOP_CHIPS[id].vars || {};
export const shopText = (id) => { const X = SHOP_CHIPS[id]; return typeof X.text === 'function' ? X.text(shopVars(id)) : X.text; };
export const shopPrice = (id) => SHOP_CHIPS[id].price ?? CHIP_TIERS[SHOP_CHIPS[id].tier].price;
export const shopFloor = (id) => SHOP_CHIPS[id].floor ?? CHIP_TIERS[SHOP_CHIPS[id].tier].floor;
export const HAZARD_KINDS = ['debt', 'burn', 'acid', 'shock', 'corrupt', 'poison', 'boom'];
// shields that take a whole fee per hit (`hits` on the chip), not 1¢ like Block
export const INSTANCE_SHIELDS = ['flower', 'petal', 'clay', 'brick'];
// renamed shop chips, for saves made before the rename
export const SHOP_RENAMES = { bumper: 'reducer', mirror: 'rebound', fog: 'transpara', frozen: null };

export const CREATURES = {
  ufo: { name: 'UFO', glyph: '🛸', text: 'Abducts the top chip of a random stack each turn, then flies home. Chips taken are lost.' },
  fairy: { name: 'Fairy', glyph: '🧚', text: 'Converts the top chip of a random stack into a random chip. Chaos reigns!' },
  dragon: { name: 'Dragon', glyph: '🐉', text: 'Breathes a Burning chip onto a random stack each turn.' },
  mole: { name: 'Mole', glyph: '🐭', text: 'Digs up a random empty space and leaves a Hole.' },
  unicorn: { name: 'Unicorn', glyph: '🦄', text: 'Converts every chip in a random stack into random chips. Chaos reigns!' },
  mothership: { name: 'Mothership', glyph: '👾', text: 'Hovers over one stack and beams up a chip every turn until the stack is gone. Chips taken are lost.' },
};
export const CALAMITIES = {
  inferno: { name: 'Inferno', text: 'Really, really hot. A Burning chip lands on one of your stacks every turn.' },
  audit: { name: 'House Audit', text: 'Every second turn, each of your front stacks is charged a 1¢ fee.' },
  blackhole: { name: 'Black Hole', text: 'Takes one of your Bar spaces. Every turn it pulls in a chip from a stack next to it, and that chip is lost.' },
  volcano: { name: 'Volcano', text: 'Takes one of your Bar spaces. For four turns it launches a Burning chip at one of your stacks, then goes dormant and frees the space.' },
  tornado: { name: 'Tornado', text: 'Every turn it hits one of your stacks. A stack under 3 chips high is thrown about, and some of its chips may be lost.' },
};

// ---------- Wagers and tilts ----------
// After a win you always keep the money; then pick one prize. `bonus` is the bonus money, as a share of the
// opponent's starting worth, paid with the one-die prize.
export const PRIZES = { bonus: 0.25 };
export const WAGER_BASE = 1.5; export const WAGER_BOSS = 3; export const DD_MAX = 6;
export const TILT_TIERS = [
  { inc: 0.01, challenge: 100, cheat: 500 }, { inc: 0.02, challenge: 1000, cheat: 5000 }, { inc: 0.05, challenge: 10000, cheat: 50000 },
  { inc: 0.1, challenge: 100000, cheat: 500000 }, { inc: 0.2, challenge: 1000000, cheat: 5000000 },
];
export const TILTS = {
  hazard: { kind: 'challenge', name: 'Hazard', cap: [6, 6, 3, 0, 0], text: 'Adds a Hole to a random space of your position. Holes cannot hold chips.' },
  creature: { kind: 'challenge', name: 'Creature', cap: [3, 3, 2, 1, 1], text: 'A creature visits your position for a couple of turns, messes with it, then leaves.' },
  spawner: { kind: 'challenge', name: 'Spawner', cap: [1, 1, 1, 1, 1], text: 'A nest that sends a new creature at your position every third turn.' },
  calamity: { kind: 'challenge', name: 'Calamity', cap: [0, 0, 0, 1, 1], text: 'A disaster that lasts the whole bout.' },
  shield: { kind: 'cheat', name: 'Shield', cap: [5, 3, 3, 1, 0], text: 'Start with a full stack of Block chips on your Meter.' },
  familiar: { kind: 'cheat', name: 'Familiar', cap: [2, 2, 2, 1, 1], text: 'A little friend that removes one Debt or hazard chip each turn and may chase creatures away.' },
  position: { kind: 'cheat', name: 'Position', cap: [1, 1, 1, 1, 1], text: 'Adds +1 to Balance, Versatility and Depth in turn for this bout (max +2 each).' },
  intervention: { kind: 'cheat', name: 'Intervention', cap: [0, 0, 0, 1, 1], text: 'Once, when you would go broke, your paid fees are restored to your position. It costs half your wager.' },
};

// ---------- Floors and opponents ----------
export const FLOORS = [
  null,
  { name: 'Boogey Basement', line: 'These clowns and losers are just the stepping stones to greater Worth.', worth: [36, 44, 52], boss: 64, cut: 10 },
  { name: 'Hustlers Haven', line: 'Beware, these rollers are no slouches. Cinch your purse strings on your way in.', worth: [110, 135, 160], boss: 240, cut: 100 },
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
// Table felts. For now a felt only colours the table (a: centre, b: edge, rim: the rail). `effect` is where a
// board effect will go; none is wired yet. `pool: false` felts are not dealt to random tables.
export const FELTS = {
  felt: { name: 'Felt', a: '#1f8a63', b: '#0a3326', rim: '#c9f7df', line: 'Classic green baize.' },
  satin: { name: 'Satin', a: '#a3366f', b: '#3d0c28', rim: '#ffc2e4', line: 'Slick and shiny. Chips slide a little.' },
  buffet: { name: 'Buffet', a: '#b8742a', b: '#4a2808', rim: '#ffe0a8', line: 'Somebody spilled the gravy.' },
  earthen: { name: 'Earthen', a: '#7a5a35', b: '#2c1d0d', rim: '#e6cba4', line: 'Packed clay and old roots.' },
  frosty: { name: 'Frosty', a: '#7fbfe0', b: '#1d4a66', rim: '#f0fbff', line: 'Cold to the touch. Breath fogs over it.' },
  urban: { name: 'Urban', a: '#5b5f6b', b: '#1b1c22', rim: '#cfd3dd', line: 'Asphalt grey with a painted line.' },
  oceanic: { name: 'Oceanic', a: '#1f7fa8', b: '#06263d', rim: '#9fe8ff', line: 'Deep blue, with a tide to it.' },
  molten: { name: 'Molten', a: '#d9531f', b: '#3d0a02', rim: '#ffd36a', line: 'Still warm from the forge.' },
  lunar: { name: 'Lunar', a: '#8d8aa3', b: '#25233a', rim: '#ecebff', line: 'Pale and cratered.' },
  polar: { name: 'Polar', a: '#d8e6f0', b: '#5d7488', rim: '#ffffff', line: 'Snow white and blinding.' },
  galactic: { name: 'Galactic', a: '#5a2fa8', b: '#0d0526', rim: '#d9c2ff', line: 'Stars in the weave.' },
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
export const JACKETS = {
  standard: { name: 'Standard', color: '#5b6378', effect: 'Functional', mods: {}, price: 0, level: 0 },
  long: { name: 'Long', color: '#4b3a2a', effect: 'Concealing · Awkward', mods: { depth: 1, conviction: -1 }, price: 200, level: 0 },
  leather: { name: 'Leather', color: '#1d1d22', effect: 'Rebellious · Inappropriate', mods: { versatility: 1, charisma: -1 }, price: 200, level: 0 },
  bomber: { name: 'Bomber', color: '#5d6b3a', effect: 'Confident · Brutish', mods: { balance: 1, cunning: -1 }, price: 200, level: 0 },
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
export const FIND_CARDS = ['debit', 'note', 'note_dice', 'note_debt', 'note_house', 'note_hold', 'note_flip', 'trading', 'punch'];
export const WALLET_SLOTS = 4;
