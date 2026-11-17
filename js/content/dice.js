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
