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
assert(R.forgeWhy(run, 'd4', [run.dice.at(-1).id]), 'Bone dice are never melted in a forge');
assert(R.dieUpgradeBlock(run, run.dice.at(-1), 'boost'), 'the Diesmith will not upgrade a Bone die');
R.enterFloor(run, 3);
assert(R.diceShop(run).length && R.diceShop(run) !== shop, 'each floor restocks the Dice Shop');

if (fails.length) { console.log('FAIL ' + fails.join('\nFAIL ')); process.exit(1); }
console.log('ok, round 18: dice materials, d12, Dice Shop, Bone dice');

// ---------- melting and casting ----------
{
  const F = await import('../js/forge.js');
  const fails2 = [];
  const ok = (c, m) => { if (!c) fails2.push(m); };
  const fixed = (vals) => { let i = 0; return { int: () => vals[i++ % vals.length] - 1 }; }; // rolls these values
  ok(F.meltVolume([{ type: 'd4' }]) === 2 && F.meltVolume([{ type: 'd20' }]) === 10, 'a die melts to half its faces');
  ok(F.castNeed('d6') === 6, 'a cast needs one volume per face');
  ok(F.castFor(['glass']) === 'glass' && F.castFor(['glass', 'metal', 'glass']) === 'sparkling' && F.castFor(['plastic', 'metal', 'glass']) === null && F.castFor(['sparkling', 'glimmering', 'swirling']) === 'diamond', 'materials pick the cast');
  ok(F.forgeBlock({ type: 'd6', melt: [{ type: 'd4', mat: 'glass' }], dyes: [] }), 'too little volume blocks a cast');
  ok(F.forgeBlock({ type: 'd6', melt: [{ type: 'd6', mat: 'bone', bone: 'rigged', up: [] }, { type: 'd6' }], dyes: [] }), 'Bone dice cannot be melted');
  const eq2 = (a, b, m) => ok(a.join() === b.join(), `${m}: ${a.join()} vs ${b.join()}`);
  eq2(F.castFaces(fixed([2]), 'd4', 'glass').faces, [1, 3, 3, 4], 'Glass flips the rolled face (2 → 3 on a d4)');
  eq2(F.castFaces(fixed([3]), 'd6', 'plastic').faces, [1, 2, 0, 4, 5, 6], 'Plastic nullifies the rolled face');
  eq2(F.castFaces(fixed([1]), 'd6', 'metal').faces, [7, 2, 3, 4, 5, 6], 'Metal makes the rolled face lucky 7');
  eq2(F.castFaces(fixed([1, 2]), 'd6', 'metal', ['red']).faces, [7, 1, 3, 4, 5, 6], 'Red takes 1 off the rolled face');
  eq2(F.castFaces(fixed([1, 5, 2]), 'd6', 'metal', ['blue', 'blue']).faces, [7, 3, 3, 4, 4, 6], 'Blue moves faces toward the average');
  eq2(F.castFaces(fixed([1, 5, 2]), 'd6', 'metal', ['orange']).faces, [7, 3, 3, 4, 7, 6], 'Orange: high becomes high+low, low becomes high−low');
  eq2(F.castFaces(fixed([1, 5, 2]), 'd6', 'metal', ['purple']).faces, [7, 7, 3, 4, 5, 6], 'Purple: the lower becomes the sum');
  eq2(F.castFaces(fixed([1, 5, 2]), 'd6', 'metal', ['green']).faces, [7, 2, 3, 4, 3, 6], 'Green: the higher becomes the difference');
  ok(F.castFaces(fixed([1, 4]), 'd6', 'metal', ['yellow']).log[1].missed === false, 'a dye on a face that still shows its value lands');
  ok(F.castFaces(fixed([1, 7 - 6]), 'd6', 'metal', ['yellow']).log[1].missed === true, 'a dye whose value no face shows misses');
  // Diamond patterns
  const pat = (r, n = 6) => F.diamondPattern(r, n)?.id;
  ok(pat([3, 3, 3, 3, 3, 3]) === 'yahtzee' && pat([3, 3, 3, 3, 3, 1]) === 'five' && pat([2, 2, 2, 5, 5, 5]) === 'twinTriplets' && pat([1, 1, 4, 4, 6, 6]) === 'tripleTwins' && pat([1, 2, 3, 4, 6, 6]) === 'continuation' && pat([6, 6, 5, 5, 1, 3]) === 'stretch' && pat([1, 1, 2, 2, 3, 6]) === 'smashed', 'Diamond spots each pattern');
  eq2(F.diamondFaces({ id: 'yahtzee', v: 3 }, [1, 2, 3, 4, 5, 6]), [3, 3, 3, 3, 3, 18], 'Yahtzee: a sixth of the faces are ×6');
  eq2(F.diamondFaces({ id: 'twinTriplets', a: 5, b: 2 }, [1, 2, 3, 4, 5, 6]), [3, 3, 3, 7, 7, 7], 'Twin triplets: half subtracted, half added');
  eq2(F.diamondFaces({ id: 'continuation', top: 4 }, [1, 2, 3, 4, 5, 6]), [5, 6, 7, 8, 9, 10], 'Continuation carries the run on');
  eq2(F.diamondFaces({ id: 'smashed' }, [1, 2, 3, 4, 5, 6]), [1, 2, 3, 1, 2, 3], 'Smashed duplicates the low faces');
  eq2(F.diamondFaces({ id: 'stretch' }, [1, 2, 3, 4, 5, 6]), [4, 5, 6, 4, 5, 6], 'Stretch duplicates the high faces');
  // a whole forge at the Diesmith
  const run2 = R.newRun('rascal', 'standard', 4); R.enterFloor(run2, 1); run2.purse = 1e5;
  const melt = run2.dice.slice(0, 2).map((d) => d.id), before = run2.dice.length, purse = run2.purse;
  ok(!R.forgeWhy(run2, 'd6', melt, ['red']), 'two d6 melt into a d6');
  const res = R.forge(run2, 'd6', melt, ['red']);
  ok(res && res.rolled.length === 2 && res.rolled.every((d) => d.type === 'd6' && !melt.includes(d.id)), 'the cast and the dye each roll a d6 from the pouch');
  ok(res && run2.dice.length === before - 2 - 2 + 1 && run2.dice.includes(res.die) && !res.rolled.some((d) => run2.dice.includes(d)) && res.die.cast === 'plastic' && res.log.length === 2, 'the melted and rolled dice go, the new one joins the pouch');
  ok(run2.purse === purse - R.forgeCost(run2, 'd6', ['red']), 'the forging fee and the dye are paid');
  ok(R.forgeWhy(run2, 'd20', run2.dice.map((d) => d.id)), 'a d20 is not cast on floor 1');
  // the cast's rolls come from the pouch: without spare dice of the new size there is no cast
  const run3 = R.newRun('rascal', 'standard', 5); R.enterFloor(run3, 1); run3.purse = 1e5;
  const d6s = run3.dice.filter((d) => d.type === 'd6'); run3.dice = d6s.slice(0, 2);
  ok(/from your pouch/.test(R.forgeWhy(run3, 'd6', run3.dice.map((d) => d.id)) || ''), 'a cast needs a spare die of its size to roll');
  run3.dice.push({ ...d6s[2], id: 'spare' });
  ok(!R.forgeWhy(run3, 'd6', run3.dice.slice(0, 2).map((d) => d.id)), 'with one spare d6 it casts');
  ok(R.castRollers(run3, 'd6', run3.dice.slice(0, 2).map((d) => d.id))[0] === run3.dice[2], 'the spare d6 is the one rolled');
  // your own die's faces are what it rolls: a die of all 4s always changes the face showing 4
  const fours = { type: 'd6', faces: [4, 4, 4, 4, 4, 4].map((v) => ({ v })) };
  eq2(F.castFaces(fixed([1]), 'd6', 'plastic', [], [fours]).faces, [1, 2, 3, 0, 5, 6], 'a rolled pouch die lands on one of its own faces');
  // two different primaries mix into one dye
  eq2(F.mixDyes(['red', 'yellow']), ['orange'], 'Red + Yellow mix into Orange');
  eq2(F.mixDyes(['red', 'blue', 'yellow']), ['purple', 'yellow'], 'Red + Blue mix into Purple; the Yellow plays alone');
  eq2(F.mixDyes(['red', 'red']), ['red', 'red'], 'the same primary twice does not mix');
  eq2(F.castFaces(fixed([1, 5, 2]), 'd6', 'metal', F.mixDyes(['red', 'yellow'])).faces, [7, 3, 3, 4, 7, 6], 'a Red + Yellow cast plays Orange');
  ok(F.forgeBlock({ type: 'd4', melt: [{ type: 'd8', mat: 'metal' }], dyes: ['orange'] }), 'mixes are not bought: they come from two primaries');
  ok(!F.forgeBlock({ type: 'd4', melt: [{ type: 'd8', mat: 'metal' }], dyes: ['red', 'yellow', 'red', 'blue'] }), 'two mixes fill the two dye slots');
  ok(F.forgeBlock({ type: 'd4', melt: [{ type: 'd8', mat: 'metal' }], dyes: ['red', 'red', 'red'] }), 'three dyes that do not mix is too many');
  ok(R.forgeCost(run2, 'd6', ['red', 'yellow']) === R.forgeCost(run2, 'd6', ['red']) + R.forgeCost(run2, 'd6', ['yellow']) - R.forgeCost(run2, 'd6'), 'a mix costs its two primaries');
  ok(R.dieUpgradeBlock(run2, run2.dice[0], 'boost') === R.RETIRED, 'old upgrades are retired');
  // ---------- mixing: floors, even volumes, matching rolls, doubles, the complex casts and Diamond ----------
  const die = (mat, type = 'd6') => ({ type, mat, id: Math.random() });
  eq2(F.mixDyes(['red', 'red', 'yellow', 'yellow', 'blue', 'blue']).sort(), ['green', 'orange', 'purple'], 'two of each primary mix into Orange, Purple and Green');
  eq2(F.mixDyes(['red', 'yellow'], false), ['red', 'yellow'], 'before dye mixing opens, primaries play alone');
  ok(/opens on floor/.test(F.forgeBlock({ type: 'd6', melt: [die('glass'), die('metal')], floor: 1 }) || ''), 'mixing materials opens on its floor');
  ok(!F.forgeBlock({ type: 'd6', melt: [die('glass'), die('metal')], floor: D.MELT.unlock.mix }), 'Glass and Metal mix once open');
  ok(/same volume/.test(F.forgeBlock({ type: 'd6', melt: [die('glass', 'd8'), die('metal', 'd4')], floor: 4 }) || ''), 'a mix needs equal volumes of each material');
  const pl = F.forgePlan({ type: 'd6', melt: [die('glass'), die('metal')], floor: 4, pouch: [die('glass'), die('glass')] });
  ok(/short: Metal/.test(pl.why || ''), 'a mix rolls one die of each of its materials: no spare Metal d6, no cast');
  const pouch = [die('plastic'), die('metal'), die('glass')], pl2 = F.forgePlan({ type: 'd6', melt: [die('glass'), die('metal')], floor: 4, pouch });
  ok(!pl2.why && pl2.rolled.map((d) => d.mat).join() === 'glass,metal', 'the mix rolls the spare Glass and Metal d6');
  ok(F.castOut('sparkling') === 'sparkling' && F.castOut('glass') === 'glass', 'a mix comes out as its complex material');
  ok(/only melt into a Diamond/.test(F.forgeBlock({ type: 'd6', melt: [die('sparkling'), die('sparkling')], floor: 4 }) || ''), 'complex dice only melt into a Diamond');
  eq2(F.castFaces(fixed([2, 5]), 'd6', 'sparkling').faces, [1, 3, 3, 4, 7, 6], 'Sparkling: the higher becomes the sum, the lower the difference');
  eq2(F.castFaces(fixed([2, 5]), 'd6', 'glimmering').faces, [1, 7, 3, 4, 0, 6], 'Glimmering: the higher becomes 0, the lower 7');
  eq2(F.castFaces(fixed([1, 4]), 'd6', 'swirling').faces, [5, 2, 3, 3, 5, 6], 'Swirling: the face showing the higher roll becomes the difference, the lower the sum');
  { let k = 0; const seq = [3, 3, 3, 3, 2, 6]; const res3 = F.castFaces({ int: () => seq[k++] - 1 }, 'd6', 'glimmering');
    ok(res3.log[0].rolls.join() === '2,6' && /rolled again 2 times/.test(res3.log[0].text), 'doubles in a two-dice cast roll again'); }
  const dia = [die('sparkling'), die('glimmering'), die('swirling')], prim = ['red', 'yellow', 'red', 'blue', 'blue', 'yellow'];
  ok(/opens on floor/.test(F.forgeBlock({ type: 'd6', melt: dia, dyes: prim, floor: D.MELT.unlock.complex - 1 }) || ''), 'Diamond casting opens on its floor');
  ok(/exactly/.test(F.forgeBlock({ type: 'd6', melt: dia, dyes: ['red', 'yellow'], floor: 4 }) || ''), 'a Diamond needs Orange, Purple and Green');
  const pd = F.forgePlan({ type: 'd4', melt: dia, dyes: prim, floor: 4 });
  ok(!pd.why && pd.reqs.length === 6 && pd.reqs.filter((q) => q.mat).map((q) => q.mat).join() === 'sparkling,glimmering,swirling', 'a Diamond rolls one die per complex material and one per secondary dye');
  ok(F.castFaces(fixed([3, 3, 3, 3, 3, 3]), 'd6', 'diamond', pd.played).log[0].text.startsWith('Yahtzee'), 'six of a kind makes a Yahtzee Diamond');
  if (fails2.length) { console.log('FAIL ' + fails2.join('\nFAIL ')); process.exit(1); }
  console.log('ok, round 18: melting, casting, dyes, mixes and Diamond');
}
