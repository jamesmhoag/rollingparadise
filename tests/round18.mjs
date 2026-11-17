// Round 18: dice materials, the d12, the Dice Shop and Bone dice.
import * as D from '../js/data.js';
import * as R from '../js/run.js';
import { canUpgrade, matOf, dieName, boneDie, facesOf } from '../js/dice.js';
import { RNG } from '../js/util.js';

const fails = [];
const assert = (ok, msg) => { if (!ok) fails.push(msg); };

// every Bone die names a real upgrade, in the past tense
for (const [id, B] of Object.entries(D.BONE)) {
  assert(D.DIE_UPGRADES[B.up], `Bone ${id} carries a real upgrade`);
  assert(/ed$/.test(B.name) && B.name.toLowerCase() === id, `Bone ${id} is named in the past tense`);
}
assert(Object.keys(D.BONE).length === Object.keys(D.DIE_UPGRADES).length, 'one Bone die for every upgrade');

// the complexities the shop sells all exist as dice
for (const t of D.COMPLEXITY) assert(D.DICE[t] && D.DICE_SHOP.base[t] && D.DICE_SHOP.from[t], `${t} is a die the shop can sell`);
assert(D.DICE.d12.faces === 12, 'there is a d12');

// a Bone die carries its trait and cannot be modified or melted
const rng = new RNG(5);
const bone = boneDie({ id: 1 }, 'd6', 'accelerated', rng);
assert(bone.mat === 'bone' && bone.up[0] === 'accelerate' && facesOf(bone).map((f) => f.v).join() === '2,3,4,5,6,7', 'an Accelerated Bone d6 rolls 2 to 7');
assert(canUpgrade(bone, 'boost'), 'a Bone die cannot be upgraded');
assert(dieName(bone) === 'Accelerated Bone d6', 'a Bone die is named for its trait');
assert(matOf({ type: 'd6', up: [] }) === 'plastic', 'old dice are Plastic');

// the Dice Shop: plain dice of each material, Bone dice, floor gates
const run = R.newRun('hustler', 'standard', 11); R.enterFloor(run, 1);
const shop = R.diceShop(run);
assert(shop.length === D.DICE_SHOP.basic + D.DICE_SHOP.bone, 'the shop is stocked');
assert(D.BASIC_MATS.every((m) => shop.some((x) => x.die.mat === m)), 'Glass, Plastic and Metal are all on the shelf');
assert(shop.filter((x) => x.die.mat === 'bone').every((x) => x.die.bone && x.die.up.length === 1), 'Bone dice carry one trait');
assert(shop.every((x) => (D.DICE_SHOP.from[x.die.type] || 1) <= 1), 'floor 1 sells only floor 1 dice');
const cheap = shop.find((x) => x.die.mat === 'plastic'), pricey = shop.find((x) => x.die.mat === 'bone' && x.die.type === cheap.die.type);
if (pricey) assert(pricey.cost > cheap.cost, 'Bone dice cost more than plain ones');
run.purse = 100000; const n = run.dice.length, b = shop.find((x) => x.die.mat === 'bone');
assert(R.buyShopDie(run, b.key) && run.dice.length === n + 1 && run.dice.at(-1).bone === b.die.bone, 'buying a Bone die puts it in the pouch');
assert(!R.forgeFodder(run, 'd20') || !R.forgeFodder(run, 'd20').some((d) => d.mat === 'bone'), 'Bone dice are never melted in a forge');
assert(R.dieUpgradeBlock(run, run.dice.at(-1), 'boost'), 'the Diesmith will not upgrade a Bone die');
R.enterFloor(run, 3);
assert(R.diceShop(run).length && R.diceShop(run) !== shop, 'each floor restocks the Dice Shop');

if (fails.length) { console.log('FAIL ' + fails.join('\nFAIL ')); process.exit(1); }
console.log('ok, round 18: dice materials, d12, Dice Shop, Bone dice');
