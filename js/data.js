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

export const STATS = {
  trickery: { name: 'Trickery', short: 'Draw', text: 'Tricks you may draw from your Book each turn.' },
  ingenuity: { name: 'Ingenuity', short: 'Bid', text: 'Chips you may bid on shown tricks each turn.' },
  proficiency: { name: 'Proficiency', short: 'Roll', text: 'Dice you may roll each turn. A die shows its value first; you then choose which shown trick it goes on.' },
  charisma: { name: 'Charisma', short: 'Steal', text: 'For each bid you leave unused, steal this many ¢ from the Stage onto your Meter.' },
  cunning: { name: 'Cunning', short: 'Opportunity', text: 'For each roll you leave unused, gain this many Opportunity chips on your Meter.' },
  conviction: { name: 'Conviction', short: 'Power', text: 'For each draw you leave unused, gain this much Power. Power is added to your next roll effect.' },
  balance: { name: 'Balance', short: 'Stack height', text: 'Extra chips each space can hold (base 3).' },
  versatility: { name: 'Versatility', short: 'Meter rows', text: 'Extra Meter rows (base 2). The Meter sits in front and only holds chips gained during the bout.' },
  depth: { name: 'Depth', short: 'Bar rows', text: 'Extra Bar rows (base 3). The Bar holds the chips you commit before the bout.' },
};

// ---------- Dice ----------
export const DICE = {
  d4: { faces: 4, forge: { dice: 1, chips: 50, floor: 1 }, sell: 20 },
  d6: { faces: 6, forge: { dice: 2, chips: 100, floor: 1 }, sell: 40 },
  d8: { faces: 8, forge: { dice: 4, chips: 200, floor: 1 }, sell: 80 },
  d10: { faces: 10, forge: { dice: 5, chips: 2000, floor: 2 }, sell: 200 },
  d20: { faces: 20, forge: { dice: 20, chips: 5000, floor: 2 }, sell: 500 },
};
export const DIE_UPGRADES = {
  accelerate: { name: 'Accelerate', text: 'Shift every face value up by 1.' },
  escalate: { name: 'Escalate', text: 'Weighted to the highest face: roll twice, keep the higher.' },
  stabilize: { name: 'Stabilize', text: 'Faces averaged toward the mean: never rolls below half its top face.' },
};

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
  std: { name: 'Royale Paradise chip', text: 'Standard chip. Pays fees up to its value; a smaller fee leaves Debt chips on top instead. Can be bid.' },
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
};
export const RESIST = {
  burn: { color: 'red', name: 'Red chip', verb: 'extinguishes', price: 20, floor: 1 },
  shock: { color: 'blue', name: 'Blue chip', verb: 'absorbs', price: 20, floor: 1 },
  acid: { color: 'yellow', name: 'Yellow chip', verb: 'neutralizes', price: 20, floor: 1 },
};
export const HAZARD_KINDS = ['debt', 'burn', 'acid', 'shock', 'corrupt', 'poison', 'boom'];

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
export const TABLES = ['Felt', 'Satin', 'Buffet', 'Earthen', 'Frosty', 'Urban', 'Oceanic', 'Molten', 'Lunar', 'Polar', 'Galactic'];

// ---------- Lounge ----------
export const DRINKS = [
  { id: 'soda', name: 'Soda Pop', verb: 'tickles', stat: 'trickery', amt: 1, cost: 500, sips: 5 },
  { id: 'water', name: 'Spring Water', verb: 'refreshes', stat: 'proficiency', amt: 1, cost: 500, sips: 5 },
  { id: 'coffee', name: 'Iced Coffee', verb: 'focuses', stat: 'ingenuity', amt: 1, cost: 500, sips: 5 },
  { id: 'milk', name: 'Warm Milk', verb: 'comforts', stat: 'conviction', amt: 1, cost: 500, sips: 5 },
  { id: 'tea', name: 'Hot Tea', verb: 'calms', stat: 'cunning', amt: 1, cost: 500, sips: 5 },
  { id: 'juice', name: 'Fruit Juice', verb: 'brightens', stat: 'charisma', amt: 1, cost: 500, sips: 5 },
  { id: 'special', name: 'Paradise Special', verb: 'strengthens', stat: 'random', amt: 2, cost: 10000, sips: 3 },
  { id: 'royal', name: 'Royal Blend', verb: 'empowers', stat: 'tip', amt: 1, cost: 10000, sips: 3 },
  { id: 'diamond', name: 'Diamond Drop', verb: 'enlightens', stat: 'all', amt: 2, cost: 200000, sips: 1 },
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
  standard: { name: 'Standard', effect: 'Functional', mods: {}, price: 0, level: 0 },
  long: { name: 'Long', effect: 'Concealing · Awkward', mods: { depth: 1, conviction: -1 }, price: 200, level: 0 },
  leather: { name: 'Leather', effect: 'Rebellious · Inappropriate', mods: { versatility: 1, charisma: -1 }, price: 200, level: 0 },
  bomber: { name: 'Bomber', effect: 'Confident · Brutish', mods: { balance: 1, cunning: -1 }, price: 200, level: 0 },
  rain: { name: 'Rain', effect: 'Practical · Unnecessary', mods: { cunning: 2, versatility: -1 }, price: 20000, level: 1 },
  sports: { name: 'Sports', effect: 'Fashionable · Expected', mods: { charisma: 2, depth: -1 }, price: 20000, level: 1 },
  suede: { name: 'Suede', effect: 'Luxurious · Uncomfortable', mods: { conviction: 2, balance: -1 }, price: 20000, level: 1 },
  down: { name: 'Down', effect: 'Comfortable · Fluffy', mods: { versatility: 2, conviction: -1 }, price: 2000000, level: 2 },
  reading: { name: 'Reading', effect: 'Thoughtful · Tattered', mods: { depth: 2, cunning: -1 }, price: 2000000, level: 2 },
  denim: { name: 'Denim', effect: 'Unique · Convoluted', mods: { balance: 2, charisma: -1 }, price: 2000000, level: 2 },
  regal: { name: 'Regal', effect: 'Royal · Privileged', mods: { balance: 2, versatility: 2, depth: 2 }, price: 20000000000, level: 4 },
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
  worn_cloth: { name: 'Worn Cloth', slots: 2, keep: 14, price: 0, level: 0 },
  duct_tape: { name: 'Duct Tape', slots: 1, keep: 10, price: 0, level: 0 },
  silver_clip: { name: 'Silver Clip', slots: 4, keep: 14, price: 1000, level: 0 },
  chained_snap: { name: 'Chained Snap', slots: 2, keep: 7, price: 1000, level: 0 },
  neon_zip: { name: 'Neon Zip', slots: 1, keep: 6, price: 1000, level: 0 },
  worn_leather: { name: 'Worn Leather', slots: 3, keep: 10, price: 1000, level: 0 },
  diamond_clip: { name: 'Diamond Clip', slots: 3, keep: 7, price: 100000, level: 2 },
  magnetic_snap: { name: 'Magnetic Snap', slots: 1, keep: 4, price: 100000, level: 2 },
  velvet_zip: { name: 'Velvet Zip', slots: 2, keep: 6, price: 100000, level: 2 },
  fine_leather: { name: 'Fine Leather', slots: 4, keep: 12, price: 100000, level: 2 },
  royal_luxury: { name: 'Royal Luxury', slots: 4, keep: 7, price: 10000000, level: 4, crown: true },
};
// passes are clipped to your lanyard and do not take a wallet slot. The Royal Card does take one (Collectables C80).
export const PASS_CARDS = ['membership', 'suite', 'punch', 'paradise'];
export const PURSE_LIMIT = 999e12;
export const STARTER_CARDS = ['discount_diesmith', 'discount_trader', 'discount_lounge', 'business_trickery', 'business_ingenuity', 'business_proficiency',
  'business_charisma', 'business_cunning', 'business_conviction'];
export const FIND_CARDS = ['debit', 'note', 'note_dice', 'note_debt', 'note_house', 'note_hold', 'note_flip', 'trading', 'punch'];
export const WALLET_SLOTS = 4;
