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
export const REACH = { inside: 'Chips inside it (lying on it)', all: 'All chips', yours: 'All yours', theirs: 'All theirs', touching: 'Chips it touches', touchingValue: 'Touching chips with value', touchingHits: 'Touching chips with strength',
  sameType: 'Chips of its own type', named: 'Chips with a given name', typed: 'Chips of a given type' };
// triggers: { on, type? (phase, effect), what? (exposed: a chip name or kind) }
// actions: { k, dir? (move: left, right, up, down), n? (value, hits, power), chip? (become) }
export const TRIGGERS = { turn: 'Each turn', created: 'When it is made', removed: 'When it is removed', exposed: 'When a chip is exposed', effect: 'When an effect of a type plays', phase: 'In a phase' };
// row 10: what a chip's effect does to the chips it reaches
export const ACTIONS = { move: 'Move them (left, right, up, down, or to an area)', value: 'Change their coin value', hits: 'Change their strength', power: 'Change their effect value', become: 'Turn them into another chip',
  pull: 'Pull chips out of a Pit (up to an amount, onto its stack)' };
// where a Pull action takes from: the chip's own side's Pit, the other side's, or both (its own first)
export const PULL_FROM = { mine: 'Its own Pit', theirs: 'The other Pit', both: 'Both Pits' };

// a new chip from the maker starts as this
// slip: a wide flat chip slides under the stacks across its footprint instead of needing empty spaces
export const SLIP = { no: 'Needs empty spaces', yes: 'Slips under the stacks there' };
export const NEW_CHIP = { name: 'New chip', text: '', value: 1, hits: 0, source: 'trick', lasts: 'paid', turns: 3, height: 'basic', foot: 'basic', must: 'any', onTop: 'fits', immune: [],
  color: '#7df3ff', move: 'still', reach: { to: 'touching', range: 1 }, triggers: [], actions: [] };

// Chips made in the build mode, by id. The trick maker can make any of them.
export const MADE_CHIPS = {
  // Stir: a wide flat chip that slips under the stacks where it lands (no stack height). When it is made it hands out
  // the roll it was made with, 1¢ at a time, round the value chips lying on it; it is gone at the end of the turn.
  stir: { name: 'Stir', text: 'A flat chip under the stacks: the chips lying on it share the roll it was made with, 1¢ at a time. Gone at the end of the turn.',
    value: 0, hits: 0, source: 'trick', lasts: 'turn', turns: 1, height: 'tiny', foot: 'large', slip: true, must: 'bottom', onTop: 'fits', immune: ['moves'],
    color: '#b98bff', move: 'anchored', reach: { to: 'inside', range: 1 }, triggers: [{ on: 'created' }], actions: [{ k: 'value', n: 'share' }] },
};
