// Editable tables for dice: materials, the Dice Shop's shelf and prices, and Bone dice.
// Change the numbers here to tune; nothing else needs to change. Every die has a material
// (`mat`); dice saved before materials existed are Plastic.

// ---------- materials ----------
// `cast`: what a die of this material does when it is rolled into a cast at the Diesmith (see the melt and
// cast rules). `melt`: whether it can be melted down. `upgrade`: whether the Diesmith can work on it.
export const MATERIALS = {
  plastic: { name: 'Plastic', color: '#e8e2d4', cast: 'nullified', melt: true, upgrade: true,
    text: 'The everyday die. Light, cheap and easy to melt.' },
  glass: { name: 'Glass', color: '#9fe6ff', cast: 'flip', melt: true, upgrade: true,
    text: 'Clear and cold. Rolled into a cast, it flips the value to the opposite face.' },
  metal: { name: 'Metal', color: '#c9d3e0', cast: 'lucky', melt: true, upgrade: true,
    text: 'Heavy and bright. Rolled into a cast, it comes up lucky seven.' },
  // complex materials: only the Diesmith makes them, by mixing two basic materials in equal volume
  sparkling: { name: 'Sparkling', color: '#ffe9a8', complex: true, from: ['glass', 'metal'], melt: true, upgrade: true,
    text: 'Glass and Metal melted together in equal parts. Only melted again into a Diamond.' },
  glimmering: { name: 'Glimmering', color: '#d6f4ff', complex: true, from: ['glass', 'plastic'], melt: true, upgrade: true,
    text: 'Glass and Plastic melted together in equal parts. Only melted again into a Diamond.' },
  swirling: { name: 'Swirling', color: '#e6d3ff', complex: true, from: ['metal', 'plastic'], melt: true, upgrade: true,
    text: 'Metal and Plastic melted together in equal parts. Only melted again into a Diamond.' },
  diamond: { name: 'Diamond', color: '#f4fbff', complex: true, from: ['sparkling', 'glimmering', 'swirling'], melt: false, upgrade: false,
    text: 'All three complex materials and all three secondary dyes, cast as one. It cannot be melted or modified.' },
  bone: { name: 'Bone', color: '#efe3c2', melt: false, upgrade: false,
    text: 'Old and carved by hand. Each one carries a trait of its own. It cannot be melted or modified.' },
};
export const DEFAULT_MAT = 'plastic';
// the materials the Dice Shop sells as plain dice, and that the Diesmith melts
export const BASIC_MATS = ['glass', 'plastic', 'metal'];
// the complexities (face counts) dice come in, smallest first
export const COMPLEXITY = ['d4', 'd6', 'd8', 'd12', 'd20'];

// ---------- the Dice Shop ----------
// price = base[type] × mat[material] × (floor multiplier). A die type is sold from its `from` floor.
// `basic`: plain dice on the shelf each floor. `bone`: Bone dice on the shelf each floor, priced × boneMult.
export const DICE_SHOP = {
  base: { d4: 30, d6: 45, d8: 70, d12: 160, d20: 320 },
  from: { d4: 1, d6: 1, d8: 1, d12: 2, d20: 3 },
  mat: { plastic: 1, glass: 1.25, metal: 1.5 },
  floorMult: [1, 1, 1.5, 2.25, 3.5],
  basic: 6,
  bone: 2,
  boneMult: 4,
};

// ---------- Bone dice ----------
// Each Bone die comes carved with one of the Diesmith's upgrades already on it, named in the past tense.
// `up`: the upgrade it carries (see DIE_UPGRADES in data.js). `face`: for upgrades that change one face, which
// face it was carved on ('high' or 'low'); left out, the face that suits the upgrade is used.
export const BONE = {
  accelerated: { name: 'Accelerated', up: 'accelerate' },
  deccelerated: { name: 'Deccelerated', up: 'deccelerate' },
  scattered: { name: 'Scattered', up: 'scatter' },
  raised: { name: 'Raised', up: 'raise' },
  vowed: { name: 'Vowed', up: 'vow' },
  divided: { name: 'Divided', up: 'divide' },
  gifted: { name: 'Gifted', up: 'gift' },
  devoured: { name: 'Devoured', up: 'devour' },
  boosted: { name: 'Boosted', up: 'boost' },
  bonked: { name: 'Bonked', up: 'bonk' },
  stabilized: { name: 'Stabilized', up: 'stabilize' },
  tempered: { name: 'Tempered', up: 'temper' },
  escalated: { name: 'Escalated', up: 'escalate' },
  emphasized: { name: 'Emphasized', up: 'emphasize' },
  rigged: { name: 'Rigged', up: 'rig' },
  enchanted: { name: 'Enchanted', up: 'enchant' },
  encased: { name: 'Encased', up: 'encase' },
  rebalanced: { name: 'Rebalanced', up: 'rebalance' },
  gambled: { name: 'Gambled', up: 'gamble' },
  cursed: { name: 'Cursed', up: 'curse' },
  mirrored: { name: 'Mirrored', up: 'mirror' },
  reflected: { name: 'Reflected', up: 'reflect' },
};

// ---------- melting, casting and forging (the Diesmith) ----------
// Melting a die gives `meltPerFace` volume for each of its faces (a d4 gives 2, a d20 gives 10). Casting a die
// needs `castPerFace` volume for each face of the new die. `maxDyes`: dyes and dye mixes per forge.
// Dice melted together must be one material, or a material mix (two materials) or Diamond (all three).
// `castFromPouch`: the dice each cast and dye rolls come from your pouch (dice of the new die's size, never Bone,
// never ones being melted) and are lost with the melt. Off, the Diesmith rolls its own.
// `maxDyes`: dye slots per forge. A dye mix (two different primaries in one cast) takes one slot.
// `unlock`: the floor each kind of mixing opens on. mix: two basic materials (Sparkling, Glimmering, Swirling) and two
// primary dyes (Orange, Purple, Green). complex: the three complex materials with the three secondary dyes (Diamond).
// `evenMix`: materials in a mix must melt to equal volumes. `rerollDoubles`: a two-dice cast or dye that rolls the
// same value twice rolls again (up to `maxRerolls` times), since it needs a high and a low.
export const MELT = { meltPerFace: 0.5, castPerFace: 1, maxDyes: 2, lucky: 7, castFromPouch: true,
  unlock: { mix: 2, complex: 3 }, evenMix: true, rerollDoubles: true, maxRerolls: 20 };

// What goes into a cast. Each one rolls `dice` dice of the new die's size; the face of the new die that shows
// each rolled value is then changed by `fx`. `price`: the Diesmith's fee for it, on top of the forging fee.
//   flip: the opposite face (on a d4, 1↔4 and 2↔3) · nullify: 0 · lucky: MELT.lucky
//   down: −1 · up: +1 · even: +1 if below the die's average, −1 if above
//   reconfigure: the higher face becomes high+low, the lower high−low · add: the lower becomes the sum ·
//   subtract: the higher becomes the difference · pair: the first fx on the higher face, the second on the lower
//   diamond: six dice; the pattern they make reshapes every face (DIAMOND below)
// Each cast rolls one die of the new size for each material in `mats`, and that die must be of that material (a Glass
// cast rolls a Glass die from your pouch). `out`: the material the new die comes out as. `unlock`: the MELT.unlock
// tier it needs. Diamond also needs the dyes in `needs`; each of them rolls one more die (any material) instead of
// playing its own effect, so a Diamond rolls six.
export const CASTS = {
  // one material: the cast every forge makes
  glass: { name: 'Glass cast', kind: 'cast', mats: ['glass'], out: 'glass', fx: 'flip', text: 'Flips the rolled face to the opposite face.' },
  plastic: { name: 'Plastic cast', kind: 'cast', mats: ['plastic'], out: 'plastic', fx: 'nullify', text: 'The rolled face becomes 0.' },
  metal: { name: 'Metal cast', kind: 'cast', mats: ['metal'], out: 'metal', fx: 'lucky', text: 'The rolled face becomes lucky 7.' },
  // two basic materials in equal parts: a complex material
  // Sparkling is Orange's opposite: Orange adds into the high face and subtracts into the low; Sparkling subtracts
  // into the high face and adds into the low
  sparkling: { name: 'Sparkling mix', kind: 'cast', mats: ['glass', 'metal'], out: 'sparkling', unlock: 'mix', fx: 'reconfigure-low',
    text: 'Of the two rolled faces, the higher becomes their difference and the lower their sum (the opposite of Orange).' },
  glimmering: { name: 'Glimmering mix', kind: 'cast', mats: ['glass', 'plastic'], out: 'glimmering', unlock: 'mix', fx: 'pair', pair: ['nullify', 'lucky'],
    text: 'Of the two rolled faces, the higher becomes 0 and the lower lucky 7.' },
  swirling: { name: 'Swirling mix', kind: 'cast', mats: ['metal', 'plastic'], out: 'swirling', unlock: 'mix', fx: 'swirl',
    text: 'Both rolled faces take one of the die\'s other values, at random, so that value shows three times.' },
  // the three complex materials with the three secondary dyes
  diamond: { name: 'Diamond', kind: 'cast', mats: ['sparkling', 'glimmering', 'swirling'], out: 'diamond', unlock: 'complex', needs: ['orange', 'purple', 'green'], fx: 'diamond',
    text: 'Rolls six dice (one per complex material, one per secondary dye); the pattern they make reshapes every face.' },
};
// The primaries (red, blue, yellow) are bought. Two different primaries in one cast combine into the mix whose
// `from` they are (Red + Yellow → Orange), which plays instead of them and costs what the two primaries cost.
export const DYES = {
  red: { name: 'Red dye', dice: 1, fx: 'down', price: 20, color: '#e0524a', text: 'The rolled face goes down 1.' },
  blue: { name: 'Blue dye', dice: 1, fx: 'even', price: 20, color: '#4a8fe0', text: 'The rolled face moves 1 toward the average: up if lower, down if higher.' },
  yellow: { name: 'Yellow dye', dice: 1, fx: 'up', price: 20, color: '#f2c94c', text: 'The rolled face goes up 1.' },
  orange: { name: 'Orange (Reconfigure)', dice: 2, fx: 'reconfigure', from: ['red', 'yellow'], color: '#f0913a', text: 'Of the two rolled faces, the higher becomes high + low and the lower becomes high − low.' },
  purple: { name: 'Purple (Add)', dice: 2, fx: 'add', from: ['red', 'blue'], color: '#9a5ad8', text: 'Of the two rolled faces, the lower becomes their sum.' },
  green: { name: 'Green (Subtract)', dice: 2, fx: 'subtract', from: ['blue', 'yellow'], color: '#4fb87a', text: 'Of the two rolled faces, the higher becomes their difference.' },
};
// Diamond: the first pattern the six dice make, in this order, reshapes the new die.
export const DIAMOND = [
  { id: 'yahtzee', name: 'Yahtzee', when: 'six of a kind', text: 'A sixth of the faces are the value × 6; the rest are the value.' },
  { id: 'five', name: '5 of a kind', when: 'five of a kind', text: 'Every face is the repeated value except one, which is the odd value.' },
  { id: 'twinTriplets', name: 'Twin triplets', when: 'two different three of a kinds', text: 'Half the faces are the two values subtracted; the other half are them added.' },
  { id: 'tripleTwins', name: 'Triple twins', when: 'three different pairs', text: 'A third of the faces show each pair\'s value.' },
  { id: 'continuation', name: 'Continuation', when: 'a run of 4 or more', text: 'The faces carry the run on upward from its highest value.' },
  { id: 'stretch', name: 'Stretch', when: 'sum over the average', text: 'The faces above the die\'s average are duplicated over the ones below.' },
  { id: 'smashed', name: 'Smashed', when: 'sum under the average', text: 'The faces below the die\'s average are duplicated over the ones above.' },
];
