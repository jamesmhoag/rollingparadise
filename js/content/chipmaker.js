// The chip maker: the vocabulary every chip is described in, and the chips made with it.
// Every chip, old or made, can be read in these terms (chipmodel.js maps the existing ones). A made chip plays
// entirely from its entry in MADE_CHIPS, every term included.

// where a chip comes from
export const SOURCES = { prep: 'Match prep (cheats and challenges)', shop: 'Chip shop', trick: 'A trick', chip: 'Another chip', royale: 'Paradise Royale casino', encounter: 'Found at the table' };
// how long it stays in play. Only the one rule applies: a chip that lasts the match cannot be broken or paid away
// (a Hole still takes it); a chip with no value never pays a fee.
export const LASTS = {
  paid: { name: 'Until paid away', text: 'stays until a fee takes it' },
  match: { name: 'The whole match', text: 'stays for the rest of the match: hits and fees cannot remove it' },
  turn: { name: 'This turn', text: 'is gone at the end of the turn' },
  turns: { name: 'Some turns', text: 'is gone after its turns run out' },
  hits: { name: 'Until broken', text: 'takes a whole fee per point of strength, then breaks' },
};
// how tall it stands and how much table it covers (a big chip covers n×n spaces from where it lands, all of them empty)
export const HEIGHT = { tiny: { name: 'Tiny', h: 0, text: 'takes no stack height' }, short: { name: 'Short', h: 0.5, text: 'half a chip high' }, basic: { name: 'Basic', h: 1, text: 'one chip high' }, tall: { name: 'Tall', h: 2, text: 'two chips high' } };
export const FOOTPRINT = { basic: '1 space', big: 'Big, 2×2', large: 'Large, 3×3', huge: 'Huge, 5×5' };
// where it must sit, and what may go on it (only chips of its own footprint stack together)
export const MUST = { any: 'Anywhere in a stack', top: 'On top', bottom: 'At the bottom', sandwiched: 'Sandwiched between chips', alone: 'Alone in its space', with: 'With other chips' };
export const ON_TOP = { anything: 'Anything (no height cap)', fits: 'Anything that fits under the height cap', none: 'Nothing (not even Debt; flying chips hover over it)' };
// Sticky: a trait. A sticky chip binds to the value chips it touches in its stack and their values combine into one.
export const STICKY = { no: 'Not sticky', yes: 'Sticky (binds to the value chips it touches)' };
// what it shrugs off. Elements match the Resist system: a stack holding the chip resists them too.
export const IMMUNE = { burn: 'Fire', frost: 'Ice', shock: 'Electricity', corrupt: 'Corruption', acid: 'Acid', poison: 'Poison', debt: 'Debt (fees pass it by)',
  moves: 'Being moved', holes: 'Falling in Holes', buffs: 'Buffs', debuffs: 'Debuffs', blocks: 'Blocking (Block chips are ignored and its actions apply)' };
// how it moves (in the House phase), and what its effect reaches
export const MOVES = {
  still: 'Does not move', nearest: 'Creature: to the nearest stack', tallest: 'Creature: to the tallest stack', richest: 'Creature: to the highest value', poorest: 'Creature: to the lowest value',
  threat: 'Creature: to the biggest threat', effect: 'Creature: to the biggest effect', empty: 'Creature: to an empty space',
  toTop: 'Sorts to the top when restacked', toBottom: 'Sorts to the bottom when restacked', anchored: 'Anchored: other effects cannot move it', flying: 'Flying: untouched by effects from below',
  spreading: 'Spreading: infects what it touches', jumping: 'Jumping: to a random neighbouring space', shifting: 'Shifting: to the next row', advancing: 'Advancing: forward', retreating: 'Retreating: back',
};
export const REACH = { lane: 'Its row, across the position (front to back)', column: 'Its column (the five spaces level with it)', inside: 'Chips inside it (lying on it)', all: 'All chips', yours: 'All yours', theirs: 'All theirs', touching: 'Chips it touches', touchingValue: 'Touching chips with value', touchingHits: 'Touching chips with strength',
  sameType: 'Chips of its own type', named: 'Chips with a given name', typed: 'Chips of a given type' };
// triggers: { on, type? (phase, effect), what? (exposed: a chip name or kind) }
// actions: { k, dir? (move: left, right, up, down), n? (value, hits, power), chip? (become) }
export const TRIGGERS = { turn: 'Each turn', created: 'When it is made', removed: 'When it is removed', exposed: 'When a chip is exposed', effect: 'When an effect of a type plays', phase: 'In a phase' };
// row 10: what a chip's effect does to the chips it reaches
// How a Move action moves (its `how`): a hop moves each chip it reaches one space on its own; a slide, lift or slip moves
// stacks (bout.js: pushing and shoving). steps: a number of spaces, 'all' (as far as it goes) or 'power' (a space per
// `per` points of the roll the chip was made with). spill: a slide may push stacks off the front, into the Pit.
export const MOVE_HOW = { hop: 'Hop: each chip it reaches, one space', slide: 'Slide: its stack along the felt, pushing the stacks in its way', lift: 'Lift: its top chip onto the next stack', slip: 'Slip: its top chip in under the next stack' };
export const MOVE_STEPS = { 1: '1 space', 2: '2 spaces', 3: '3 spaces', all: 'As far as it goes (closing the gaps)', power: 'A space per 4 rolled' };
export const ACTIONS = { move: 'Move them (left, right, up, down, or to an area)', value: 'Change their coin value', hits: 'Change their strength', power: 'Change their effect value', become: 'Turn them into another chip',
  pull: 'Pull chips out of a Pit (up to an amount, onto its stack)', fx: 'Play a trick effect (as strong as the roll it was made with)' };
// The trick effects a chip can play (an action { k: 'fx', fx }; bout.js FX does the work). Every trick but an Expense
// plays through one of these: it lays the chip, the chip plays the effect. An arrangement also names its order (by).
export const EFFECTS = {
  block: 'Lay Block chips on the Bet', harden: 'Harden stacks', resist: 'Resist fees this turn', evade: 'Evade big fees this turn', reflect: 'Reflect a fee', freeze: 'Freeze chips together', feather: 'Feather a top chip',
  enfeeble: 'Weaken the other Roller\'s rolls', bend: 'Bend the dice in play', gild: 'Gild chips', press: 'Strengthen Expenses and pierce', parlay: 'Double or halve on evens or odds', saturate: 'Boost your rolls and subdue theirs',
  settle: 'Clear a column and pack it', gather: 'Recover fees paid', scatter: 'Scatter front chips', sweep: 'Sweep shields off a Bet', arrange: 'Sort lanes into an order', sticky: 'Gum a stack', doom: 'Plant Doom chips',
  hat: 'Slip a Magic Hat under', handoff: 'Hand off Uranium', fence: 'Fence Debt into Opportunity chips' };
export const ARRANGES = { front: 'Everything forward', back: 'Everything back', shields: 'Shields to the front', 'shields-back': 'Shields to the back', 'value-front': 'Biggest chips at the front', 'value-back': 'Biggest chips at the back' };
// where a Pull action takes from: the chip's own side's Pit, the other side's, or both (its own first)
export const PULL_FROM = { mine: 'Its own Pit', theirs: 'The other Pit', both: 'Both Pits' };

// a new chip from the maker starts as this
// slip: a wide flat chip slides under the stacks across its footprint instead of needing empty spaces
export const SLIP = { no: 'Needs empty spaces', yes: 'Slips under the stacks there' };
export const NEW_CHIP = { name: 'New chip', text: '', value: 1, hits: 0, source: 'trick', lasts: 'paid', turns: 3, height: 'basic', foot: 'basic', must: 'any', onTop: 'fits', immune: [],
  color: '#7df3ff', move: 'still', reach: { to: 'touching', range: 1 }, triggers: [], actions: [] };

// a chip that plays a trick effect when it is made, and is gone at the end of the turn
const fxChip = (name, fx, color, text, more = {}) => ({ name, text, value: 0, hits: 0, source: 'trick', lasts: 'turn', turns: 1, height: 'tiny', foot: 'basic', must: 'bottom', onTop: 'fits', immune: [],
  color, move: 'still', reach: { to: 'touching', range: 1 }, triggers: [{ on: 'created' }], actions: [{ k: 'fx', fx, ...more }] });

// Chips made in the build mode, by id. The trick maker can make any of them.
export const MADE_CHIPS = {
  // Stir: a wide flat chip that slips under the stacks where it lands (no stack height). When it is made it hands out
  // the roll it was made with, 1¢ at a time, round the value chips lying on it; it is gone at the end of the turn.
  // ----- movement, as chips (round 19): the trick lays the chip, the chip does the moving, and is gone at the end of the turn -----
  // Shove and Tug slide the stack they land on; Press, Draw Back, Rise and Drop close a whole row or column up; Hoist
  // and Tuck carry one chip to the next stack, on top of it or in under it.
  shove: { name: 'Shove', text: 'Slides the stack it lands on toward the front, a space per 4 rolled, pushing the stacks ahead of it. A stack pushed off the front falls into the Pit.',
    value: 0, hits: 0, source: 'trick', lasts: 'turn', turns: 1, height: 'tiny', foot: 'basic', must: 'any', onTop: 'fits', immune: [], color: '#ff8a5c', move: 'still', reach: { to: 'touching', range: 1 },
    triggers: [{ on: 'created' }], actions: [{ k: 'move', how: 'slide', dir: 'up', steps: 'power', per: 4, spill: true }] },
  tug: { name: 'Tug', text: 'Slides the stack it lands on toward the back, a space per 4 rolled, pushing the stacks behind it. Nothing can be pushed off the back.',
    value: 0, hits: 0, source: 'trick', lasts: 'turn', turns: 1, height: 'tiny', foot: 'basic', must: 'any', onTop: 'fits', immune: [], color: '#5cc8ff', move: 'still', reach: { to: 'touching', range: 1 },
    triggers: [{ on: 'created' }], actions: [{ k: 'move', how: 'slide', dir: 'down', steps: 'power', per: 4 }] },
  press: { name: 'Squeeze', text: 'Every stack in its row slides forward as far as it goes, closing the gaps. Nothing leaves the position.',
    value: 0, hits: 0, source: 'trick', lasts: 'turn', turns: 1, height: 'tiny', foot: 'basic', must: 'any', onTop: 'fits', immune: [], color: '#ffc478', move: 'still', reach: { to: 'lane', range: 1 },
    triggers: [{ on: 'created' }], actions: [{ k: 'move', how: 'slide', dir: 'up', steps: 'all' }] },
  drawback: { name: 'Draw Back', text: 'Every stack in its row slides back as far as it goes, closing the gaps.',
    value: 0, hits: 0, source: 'trick', lasts: 'turn', turns: 1, height: 'tiny', foot: 'basic', must: 'any', onTop: 'fits', immune: [], color: '#7dc4ff', move: 'still', reach: { to: 'lane', range: 1 },
    triggers: [{ on: 'created' }], actions: [{ k: 'move', how: 'slide', dir: 'down', steps: 'all' }] },
  rise: { name: 'Rise', text: 'Every stack in its column slides up to the top row, closing the gaps.',
    value: 0, hits: 0, source: 'trick', lasts: 'turn', turns: 1, height: 'tiny', foot: 'basic', must: 'any', onTop: 'fits', immune: [], color: '#b9ffb0', move: 'still', reach: { to: 'column', range: 1 },
    triggers: [{ on: 'created' }], actions: [{ k: 'move', how: 'slide', dir: 'left', steps: 'all' }] },
  drop: { name: 'Drop', text: 'Every stack in its column slides down to the bottom row, closing the gaps.',
    value: 0, hits: 0, source: 'trick', lasts: 'turn', turns: 1, height: 'tiny', foot: 'basic', must: 'any', onTop: 'fits', immune: [], color: '#d0b0ff', move: 'still', reach: { to: 'column', range: 1 },
    triggers: [{ on: 'created' }], actions: [{ k: 'move', how: 'slide', dir: 'right', steps: 'all' }] },
  hoist: { name: 'Hoist', text: 'Lifts the top chip of the stack it lands on onto the stack in front of it, if that stack has the height for it.',
    value: 0, hits: 0, source: 'trick', lasts: 'turn', turns: 1, height: 'tiny', foot: 'basic', must: 'any', onTop: 'fits', immune: [], color: '#ffe27a', move: 'still', reach: { to: 'touching', range: 1 },
    triggers: [{ on: 'created' }], actions: [{ k: 'move', how: 'lift', dir: 'up', steps: 1 }] },
  tuck: { name: 'Tuck', text: 'Slips the top chip of the stack it lands on in under the stack behind it, if that stack has the height for it.',
    value: 0, hits: 0, source: 'trick', lasts: 'turn', turns: 1, height: 'tiny', foot: 'basic', must: 'any', onTop: 'fits', immune: [], color: '#c9a37a', move: 'still', reach: { to: 'touching', range: 1 },
    triggers: [{ on: 'created' }], actions: [{ k: 'move', how: 'slip', dir: 'down', steps: 1 }] },
  // ----- every other trick effect, as a chip: the trick lays it (under the stack it is aimed at, or on your Bet), it
  // plays the effect with the roll it was made with, and it is gone at the end of the turn. Laid by anything else
  // (another chip, a tilt, the chip painter) it plays the same effect on the space it sits on. -----
  guard: fxChip('Guard', 'block', '#7fd0ee',
    'Add Block chips equal to the total to your Bet, starting at the target space.'),
  brace: fxChip('Brace', 'harden', '#7fd0ee',
    'Harden the target stacks: each fee costs them only one chip. Lasts 1 turn per 4 rolled (at least 1).'),
  endure: fxChip('Endure', 'resist', '#7fd0ee',
    'Resist: every fee charged to you this turn is reduced by the total.'),
  hop: fxChip('Hop', 'evade', '#7fd0ee',
    'Evade: this turn, any fee larger than the total misses you entirely. Roll low.'),
  shine: fxChip('Shine', 'reflect', '#7fd0ee',
    'Reflect: up to the total of the next fee charged to you this turn is sent back at the attacker.'),
  chill: fxChip('Chill', 'freeze', '#7fd0ee',
    'Wet and freeze up to the total chips of the target stack into one Frozen chip worth their sum, and freeze any plants on it. In an iced-over Puddle the Frozen chip is frozen to the ground: it cannot be bid, burned, corrupted or shocked. A fee smaller than it only leaves Debt.'),
  float: fxChip('Float', 'feather', '#7fd0ee',
    'Turn the top chip of the target stack into a Feather chip for 1 turn per 3 rolled (at least 1): any fee larger than that stack\'s worth misses it.'),
  rattle: fxChip('Rattle', 'enfeeble', '#b9a2ee',
    'Enfeeble: your opponent\'s roll effects this turn lose the total.'),
  bend: fxChip('Bend', 'bend', '#b9a2ee',
    'Bend: this roll replaces every die on your own played tricks this turn.'),
  gild: fxChip('Gild', 'gild', '#b9a2ee',
    'Gild up to the total chips in the target stack. Gold chips cannot be bid, but pay double if they survive the bout.'),
  bear: fxChip('Bear Down', 'press', '#b9a2ee',
    'Press: your Expenses this turn gain the total and ignore Block chips, Resist and Hardened stacks.'),
  parlay: fxChip('Parlay', 'parlay', '#b9a2ee',
    'Gamble: on an even roll your other roll effects this turn are doubled. On an odd roll they are halved.'),
  saturate: fxChip('Saturate', 'saturate', '#b9a2ee',
    'Your other roll effects this turn gain the total, and your opponent\'s boosts this turn are subdued to nothing.'),
  settle: fxChip('Settle', 'settle', '#8fd6a4',
    'In the targeted column, remove Debt and hazard chips up to the total, then gather that column\'s chips into full stacks starting at the targeted space, filling outward from it.'),
  gather: fxChip('Gather', 'gather', '#8fd6a4',
    'Recover up to the total in ¢ from the fees you have paid to the Stage, back onto your Bet.'),
  scatter: fxChip('Scatter', 'scatter', '#8fd6a4',
    'Scatter chips from the front of your opponent\'s position, up to the total, to random spaces. Chips with nowhere to land fall to the Stage.'),
  sweep: fxChip('Sweep', 'sweep', '#8fd6a4',
    'Sweep Block, Counter and Opportunity chips off your opponent\'s Bet, up to the total.'),
  bulwark: fxChip('Bulwark', 'arrange', '#8fd6a4',
    'Defensive: in the target lanes, Block, Counter, Petal and Clay chips move to the front, on top, and your value chips fall in behind them.', { by: 'shields' }),
  stackup: fxChip('Stack Up', 'arrange', '#8fd6a4',
    'In the target lanes, sort chips by value with the biggest at the front: small fees only leave Debt on them.', { by: 'value-front' }),
  stash: fxChip('Stash', 'arrange', '#8fd6a4',
    'In the target lanes, sort chips by value with the biggest at the back, behind the small ones.', { by: 'value-back' }),
  expose: fxChip('Expose', 'arrange', '#8fd6a4',
    'Aggressive: in your opponent\'s target lanes, drag their biggest chips to the front where your fees land first.', { by: 'value-front' }),
  rout: fxChip('Rout', 'arrange', '#8fd6a4',
    'Aggressive: in your opponent\'s target lanes, push their Block, Counter, Petal and Clay chips to the back, out of the way.', { by: 'shields-back' }),
  gum: fxChip('Gum Up', 'sticky', '#8fd6a4',
    'Stick a Sticky chip on the target stack: its first timed modifier (a buff or a debuff) stops counting down.'),
  foretell: fxChip('Foretell', 'doom', '#8fd6a4',
    'Plant a Doom chip on top of each target stack, up to the total. Your opponent sees plain 1¢ chips. Once every one of their stacks is topped with Doom, each Doom chip charges 1¢ of Debt a turn.'),
  conjure: fxChip('Conjure', 'hat', '#8fd6a4',
    'Slip a Magic Hat under the target stack (a total of 8 or more). Each turn the chip on it falls in and is lost.'),
  handoff: fxChip('Hand Off', 'handoff', '#8fd6a4',
    'Move one of your Uranium chips onto the target stack. Its radiation is their problem now.'),
  fence: fxChip('Fence', 'fence', '#8fd6a4',
    'Convert Debt chips on your position, up to the total, into Opportunity chips on your Bet.'),
  // Regen, as a chip: it sits on a stack for two turns and brings your lost chips back out of your Pit onto it, up to the
  // roll it was made with each time (the real chips, newest first, whole chips only).
  mend: { name: 'Mend', text: 'When it is made and at the end of each turn it brings chips back out of your Pit onto its stack, up to the roll it was made with. Gone after 2 turns.',
    value: 0, hits: 0, source: 'trick', lasts: 'turns', turns: 2, height: 'tiny', foot: 'basic', must: 'any', onTop: 'fits', immune: [], color: '#7dffb5', move: 'still', reach: { to: 'touching', range: 1 },
    triggers: [{ on: 'created' }, { on: 'turn' }], actions: [{ k: 'pull', from: 'mine', n: 'power' }] },
  stir: { name: 'Stir', text: 'A flat chip under the stacks: the chips lying on it share the roll it was made with, 1¢ at a time. Gone at the end of the turn.',
    value: 0, hits: 0, source: 'trick', lasts: 'turn', turns: 1, height: 'tiny', foot: 'large', slip: true, must: 'bottom', onTop: 'fits', immune: ['moves'],
    color: '#b98bff', move: 'anchored', reach: { to: 'inside', range: 1 }, triggers: [{ on: 'created' }], actions: [{ k: 'value', n: 'share' }] },
};
