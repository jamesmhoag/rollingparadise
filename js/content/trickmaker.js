// The trick maker's vocabulary: every choice a made trick can take, with the words the game uses for it.
// A made trick has roll.k 'chips' and these fields (see bout.js, playChips):
//   roll: { k: 'chips', chip, convert, place, at?, deploy, life? }
//   bonus: { cond, k, turns? | x? | chip?, n? }
//   type (the phase it plays in), side (the zone: self, opp or any), approach (where it aims), die, count
// Tricks made before the maker keep their own roll effect (CLASSIC below); they can be converted.

// Part 1 · how the roll becomes chips
export const CONVERT = {
  lump: { name: 'Lump sum', short: 'one', text: 'The whole total as one instance.' },
  precise: { name: 'Precise change', short: 'per die', text: 'One instance per die, each worth what that die rolled.' },
  petty: { name: 'Petty cash', short: 'per point', text: 'One 1-point instance per point of the total.' },
};
// Part 2 · where the chips go in the stack
export const PLACE = {
  over: { name: 'Over', text: 'on top of the stack' },
  under: { name: 'Under', text: 'at the bottom of the stack' },
  precise: { name: 'Precise', text: 'at a set height in the stack' },
};
// Part 3 · how the chips spread from the target, one instance per space in this order (then round again)
export const DEPLOY = {
  hit: { name: 'Hit', text: 'all on the target space' },
  line: { name: 'Line back', text: 'in a line from the target toward the back' },
  hook: { name: 'Line forward', text: 'in a line from the target toward the front' },
  cone: { name: 'Cone', text: 'in a cone widening toward the back' },
  spiral: { name: 'Spiral', text: 'spiralling out from the target' },
  left: { name: 'Left', text: 'along the row to the left' },
  right: { name: 'Right', text: 'along the row to the right' },
  sides: { name: 'Sides', text: 'out to both sides along the row' },
  wave: { name: 'Wave', text: 'across the whole target row' },
  aura: { name: 'Aura', text: 'over every space of the position' },
};
// what a made trick can put on the table. kind: 'fee' charges Debt (placement does not apply); 'pit' takes real
// chips back out of a Pit (up to the total, whole chips only, newest first); 'value' makes
// chips worth the instance; 'count' makes one chip per instance whatever it is worth.
export const MAKES = {
  debt: { name: 'Debt (a fee)', kind: 'fee' },
  'pit:mine': { name: 'Chips from your Pit', kind: 'pit', pit: 'mine' }, // the real chips you lost, up to the total, newest first
  'pit:theirs': { name: 'Chips from their Pit', kind: 'pit', pit: 'theirs' },
  std: { name: 'Royal Paradise chips', kind: 'value' },
  block: { name: 'Block chips', kind: 'count' },
  counter: { name: 'Counter chips', kind: 'count' },
  burn: { name: 'Burning chips', kind: 'count', hazard: true },
  shock: { name: 'Shocking chips', kind: 'count', hazard: true },
  corrupt: { name: 'Corrupting chips', kind: 'count', hazard: true },
  acid: { name: 'Acid chips', kind: 'count', hazard: true },
  poison: { name: 'Poison chips', kind: 'count', hazard: true },
  frost: { name: 'Frost chips', kind: 'count', hazard: true },
  // any effect chip (SHOP_CHIPS id) can be made too, as kind 'count' with a life in turns
};
// Part 4 · where it aims (the trick's approach) and whose position (its side, the zone)
export const AIMS = { front: 'Front', rear: 'Back', flank: 'Sides', body: 'Stake front', any: 'Any stack', meter: 'Open Bet space' };
export const ZONES = { opp: 'Opponent', self: 'Self', any: 'Either side' };
// the Bonus: a dice requirement (cond, as CONDS in data.js) and what it does
export const BONUS = {
  linger: { name: 'Lingering', text: (b) => `the trick plays again with the same roll for ${b.turns || 2} more turn${(b.turns || 2) > 1 ? 's' : ''}` },
  multiply: { name: 'Multiplied', text: (b) => `×${b.x || 2} instances` },
  bidmult: { name: 'Bid multiplier', text: () => 'the total is multiplied by the chips bid on it' },
  extra: { name: 'Extra chip', text: (b, name) => `also makes ${b.n || 1} ${(b.n || 1) === 1 ? name(b.chip).replace(/s$/, '') : name(b.chip)}` },
  double: { name: 'Doubled', text: () => 'the total is doubled' },
  pierce: { name: 'Piercing', text: () => 'its fees ignore Block chips, Resist and Hardened stacks' },
};
// the roll effects tricks had before the maker, by roll.k, so the maker can name them
export const CLASSIC = {
  fee: 'Fee', block: 'Blocks', harden: 'Harden', resist: 'Resist', evade: 'Evade', reflect: 'Reflect', freeze: 'Freeze', feather: 'Feather',
  regen: 'Regenerate', boost: 'Boost', enfeeble: 'Enfeeble', bend: 'Bend', gild: 'Gild', press: 'Press', parlay: 'Parlay', saturate: 'Saturate',
  settle: 'Settle', gather: 'Gather', scatter: 'Scatter', sweep: 'Sweep', arrange: 'Arrangement', sticky: 'Sticky', doom: 'Doom', hat: 'Magic Hat',
  handoff: 'Handoff', fence: 'Fence', make: 'Make effect chips',
};
// a new trick from the maker starts as this
export const NEW_TRICK = { name: 'New trick', type: 'expense', cls: null, die: 'd6', count: 2, side: 'opp', approach: 'front', dist: 'hit',
  roll: { k: 'chips', chip: 'debt', convert: 'lump', place: 'over', deploy: 'hit', text: '' }, bonus: { cond: 'match', k: 'double', text: '' } };
