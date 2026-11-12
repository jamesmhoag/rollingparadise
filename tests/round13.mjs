// Round 13 chips: Hardened as a chip, Regen, Sticky, Heli-Chipter, weather and water, Hive and Bees, electricity,
// the Ghost and the Ghost Ship, Treasure and Curses, Repeater, Mimic, Forgetter, Big and Little chips, the Magic Hat,
// Doom, Spy, eggs, Volcano, Tornado, Blizzard, B-52 and the Black Hole.
import * as R from '../js/run.js'; import * as B from '../js/bout.js'; import * as D from '../js/data.js';
import { traitsOf, TRAITS } from '../js/traits.js';
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exit(1); } };
const { engage, settleAll, ticks, play, sidePhase, growth, strike, water, newCreature, setHard, arrange } = B._test;
const drain = (g) => { for (const _ of g); }; // eslint-disable-line no-unused-vars
let nid = 7e6; const chip = (kind, value = 0, x = {}) => ({ id: nid++, kind, value, ...x });
const shop = (id, x = {}) => chip(D.SHOP_CHIPS[id].kind || 'std', D.SHOP_CHIPS[id].kind ? 0 : 1, { shop: id, resist: id, ...x });

function table(chips = {}, seed = 9, felt) {
  const run = R.newRun('technician', 'standard', seed); R.enterFloor(run, 4); run.purse = 5000;
  run.chips = { ...chips }; run.plan.resist = { ...chips };
  const prep = R.newPrep(run, 'table', 0); if (felt) run.fs.tables[0].felt = felt;
  const { bout } = R.startTable(run, prep);
  return { run, bout, me: bout.sides[0], opp: bout.sides[1] };
}
// an empty position with stacks where asked: cells[r][c] = array of chips
function clear(s) { for (const row of s.grid) for (const cell of row) { cell.chips = []; for (const k of ['hole', 'black', 'worm', 'roost', 'link', 'anchor', 'puddle', 'volcano', 'cut']) delete cell[k]; } s.sky = []; s.bees = []; s.calamities = []; }
const std = (v = 1, x = {}) => chip('std', v, x);
const stackOf = (n, v = 1) => Array.from({ length: n }, () => std(v));

{ // Hardened is a chip on the stack: 0 worth, pierced, kept by your own cleanse, washed off by rain
  const { bout, me } = table(); clear(me); const cell = me.grid[3][0]; cell.chips = stackOf(3, 2);
  setHard(bout, cell, 2); assert(cell.chips.some((ch) => ch.kind === 'hard' && ch.value === 0) && B.hardOf(cell) === 2, 'Hardened shows as a chip with its turns');
  assert(B.worth(me) === 6 && B.solidCount(cell) === 3, 'it has no worth and takes no height');
  engage(bout, null, me, 3, 0, 9, {}); drain(settleAll(bout, 'expense')); assert(cell.chips.filter((ch) => ch.kind === 'std').length === 2, 'Hardened: a fee takes only one chip');
  engage(bout, null, me, 3, 0, 1, { pierce: true }); assert(!B.hardOf(cell), 'a piercing fee destroys the Hardened chip');
}
{ // Regen: a paid chip comes straight back, without its Regen
  const { bout, me } = table(); clear(me); const cell = me.grid[3][0]; cell.chips = [std(1), std(5, { regen: 2 })];
  engage(bout, null, me, 3, 0, 5, {}); drain(settleAll(bout, 'expense'));
  const back = cell.chips.find((ch) => ch.value === 5); assert(back && !back.regen && bout.stage.paid[0] === 0, 'a Regen chip paid to the Stage is restored to its position without Regen');
  engage(bout, null, me, 3, 0, 5, {}); drain(settleAll(bout, 'expense')); assert(!cell.chips.some((ch) => ch.value === 5) && bout.stage.paid[0] === 5, 'the second time it goes');
}
{ // Sticky: the first timed modifier stops counting down; its value is the stack height
  const { bout, me, opp } = table(); clear(opp); const cell = opp.grid[3][1]; cell.chips = [...stackOf(3), chip('burn', 0, { life: 3 })];
  const e = { uid: 1, trick: { id: 'gum', q: 1, up: 0 }, dice: [{ value: 2, type: 'd4' }, { value: 1, type: 'd4' }], state: 'play', lingerLeft: 0, lingerTotal: 0, bid: [], bidValue: 1, target: { side: 1, r: 3, c: 1 } };
  bout.turn = 2; drain(play(bout, me, e));
  const st = cell.chips.find((ch) => ch.kind === 'sticky'); assert(st && st.value === 3 && st.stuck === 'burn', 'Gum Up sticks a Sticky chip worth the stack height onto the burn');
  const burn = cell.chips.find((ch) => ch.kind === 'burn'); drain(ticks(bout)); assert(burn.life === 3, 'a stuck Burning chip does not count down');
}
{ // Heli-Chipter: bids from the bottom, fees pay from the bottom up
  const { bout, me } = table(); clear(me); const cell = me.grid[3][0]; cell.chips = [std(1), std(2), std(5), shop('heli')];
  assert(B.lifted(cell) && B.bidChip(me, 3, 0).value === 1, 'a lifted stack bids its bottom chip');
  engage(bout, null, me, 3, 0, 3, {}); drain(settleAll(bout, 'expense')); assert(cell.chips[0].value === 5, 'fees pay from the bottom up');
}
{ // water: Puddles, wet stacks, fire goes out, plants grow faster, Wood floats on a flooded Hole
  const { bout, me } = table(); clear(me); const empty = { r: 3, c: 0, cell: me.grid[3][0] }, st = { r: 3, c: 1, cell: me.grid[3][1] }; st.cell.chips = [...stackOf(2), chip('burn', 0, { life: 3 })];
  water(bout, me, empty); assert(empty.cell.puddle && B.capacityLeft(me, empty.cell) === 0, 'water on an empty space makes a Puddle that cannot be played on');
  water(bout, me, st); assert(B.wet(st.cell) && !st.cell.chips.some((ch) => ch.kind === 'burn'), 'water on a stack wets it and puts the fire out');
  st.cell.chips.push(chip('burn', 0, { life: 3 })); drain(ticks(bout)); assert(st.cell.chips.filter((ch) => ch.kind === 'std').length === 2, 'wet chips cannot burn');
  bout.turn++; drain(ticks(bout)); assert(!empty.cell.puddle, 'a Puddle dries after a turn without water');
}
{ // Cloud weather on an Oceanic table: it rains each turn
  const { bout, me } = table({}, 9, 'oceanic'); assert(me.sky.some((o) => o.kind === 'cloud'), 'an Oceanic table brings a Cloud');
  const cl = me.sky.find((o) => o.kind === 'cloud'); drain(ticks(bout)); const cell = me.grid[cl.r][cl.c];
  assert(cell.puddle || B.wet(cell) || cell.hole || cell.link, 'the Cloud rains on the space under it');
}
{ // electricity: a Battery under a Zap chip shocks one more stack; Absorption soaks; a Tesla sends it back
  const { bout, me, opp } = table(); clear(me); clear(opp);
  for (let c = 0; c < 4; c++) opp.grid[0][c].chips = stackOf(2);
  me.grid[3][0].chips = [std(1), shop('battery'), shop('zap')];
  engage(bout, opp, me, 3, 0, 2, {}); assert(opp.grid.flat().filter((x) => x.chips.some((ch) => ch.kind === 'shock')).length === 2, 'a Battery under a Zap chip zaps back twice');
  clear(me); me.grid[3][0].chips = stackOf(2); me.grid[3][1].chips = [std(1), shop('absorb')];
  assert(strike(bout, me, { r: 3, c: 0, cell: me.grid[3][0] }) === 'absorbed', 'an Absorption chip next door soaks a lightning instance');
  clear(me); me.grid[3][0].chips = stackOf(2); me.grid[4][4].chips = [std(1), shop('tesla')]; bout.turn = 5;
  assert(strike(bout, me, { r: 3, c: 0, cell: me.grid[3][0] }) === 'grabbed' && opp.grid.flat().some((x) => x.chips.some((ch) => ch.kind === 'shock')), 'a Tesla grabs a strike and sends it back');
  me.grid[3][0].chips.forEach((ch) => { ch.wet = 2; }); me.grid[3][1].chips = stackOf(2);
  assert(strike(bout, me, { r: 3, c: 0, cell: me.grid[3][0] }) === 'landed' && me.grid[3][1].chips.some((ch) => ch.kind === 'shock'), 'once a turn: then a wet stack passes the shock next door');
}
{ // Hive and Bumble Bees
  const { bout, me } = table(); clear(me); me.grid[4][0].chips = [shop('hive', { hits: 1 }), shop('hive', { hits: 1 })]; me.grid[3][2].chips = stackOf(2);
  bout.turn = 2; drain(growth(bout, me)); assert(me.bees.length === 2, 'each Hive chip in a stack sends out one bee');
  const cr = newCreature(bout, 'fairy', 0, 1, { r: 3, c: 2 }); bout.creatures.push(cr); drain(growth(bout, me));
  assert(cr.gone && me.grid.flat().some((x) => x.chips.some((ch) => ch.kind === 'bounty')), 'a Bumble Bee stings a creature off your table');
  engage(bout, null, me, 4, 0, 40, {}); assert(me.grid[4][0].chips.filter((ch) => ch.kind === 'hive').length === 1, 'a Hive chip takes a whole fee like a Petal');
}
{ // the Ghost: its row cannot be aimed at, and overkill does not pass into it
  const { bout, me, opp } = table(); clear(opp); for (const r of [3, 4]) opp.grid[r][0].chips = stackOf(2);
  bout.creatures.push(newCreature(bout, 'ghost', 1, 1, { r: 4, c: 0 }));
  const e = { trick: { id: 'scorch', q: 1, up: 0 }, dice: [{ value: 3, type: 'd4' }], state: 'bid' };
  assert(!B.validTargets(bout, me, e).some((v) => v.r === 4), 'no trick can aim at a Ghost\'s row');
  const g = engage(bout, me, opp, 3, 0, 9, {}); assert(g.placed === 2 && !B.debtOf(opp.grid[4][0]), 'overkill stops at the Ghost\'s row');
}
{ // the Ghost Ship: 100 hits, steals Gold, sinks into Treasure
  const { bout, me } = table(); clear(me); me.grid[3][1].chips = [std(1), std(5, { gold: true })];
  const sh = newCreature(bout, 'ghostship', 0, 1, { r: 3, c: 0 }); bout.creatures.push(sh);
  assert(D.CREATURES.ghostship.hits === 100, 'the Ghost Ship takes 100 hit instances');
  drain(ticks(bout)); assert(sh.hold.length === 1 && sh.hold[0].value === 5, 'it steals a Gold chip from a stack it reaches');
  sh.dmg = 99; engage(bout, null, me, sh.r, sh.c, 1, {});
  const t = me.grid.flat().flatMap((x) => x.chips).find((ch) => ch.treasure); assert(sh.gone && t && t.gold && t.value >= 55 && t.value <= 105, 'sunk, it drops a Treasure chip of 50 to 100 Gold plus what it stole');
}
{ // a Cursed chip lowers Draw, Roll or Bid each turn, never to 0
  const { bout, me } = table(); me.grid[3][0].chips.push(std(1, { gold: true, cursed: true }));
  const before = ['trickery', 'proficiency', 'ingenuity'].map((k) => B.tipOf(me, k)); bout.phase = 'drink'; B.nextTurn(bout);
  const after = ['trickery', 'proficiency', 'ingenuity'].map((k) => B.tipOf(me, k));
  assert(after.reduce((a, v) => a + v, 0) === before.reduce((a, v) => a + v, 0) - 1 && after.every((v) => v >= 1), 'a Cursed chip in your pile takes 1 off a random stat');
}
{ // Repeater, Forgetter and Mimic
  const { bout, me, opp } = table(); clear(me); clear(opp); bout.turn = 3;
  me.grid[3][0].chips = [std(1), std(1), std(1), shop('repeater')]; for (let c = 0; c < 4; c++) opp.grid[3][c].chips = stackOf(3);
  const e = { uid: 9, trick: { id: 'gather', q: 1, up: 0 }, dice: [{ value: 1, type: 'd6' }, { value: 2, type: 'd6' }], state: 'play', lingerLeft: 0, lingerTotal: 0, bid: [], bidValue: 1, target: null };
  me.run = [e]; const steps = [...sidePhase(bout, me, B.phaseOf('gather'), {})];
  assert(steps.filter((x) => /Repeater/.test(x.text)).length === 1, 'a Repeater with 3 chips under it repeats a trick whose dice total 3');
  opp.grid[4][0].chips = [std(1), std(1), std(1), shop('forgetter')];
  const s2 = [...sidePhase(bout, me, B.phaseOf('gather'), {})]; assert(s2.some((x) => /forgotten/.test(x.text)) && !s2.some((x) => /Repeater/.test(x.text)), 'an opponent\'s Forgetter with 3 under it negates it');
  clear(opp); me.grid[3][1].chips = [std(1), shop('mimic')]; e.dice = [{ value: 2, type: 'd6' }, { value: 2, type: 'd6' }];
  assert([...sidePhase(bout, me, B.phaseOf('gather'), {})].some((x) => /Mimic/.test(x.text)), 'a Mimic on top repeats one of your tricks that phase');
}
{ // Big chips: two by two, worth 4 basic chips; a fee on any part lands on the one stack
  const { bout, me } = table({ big: 2 }); const anchor = me.grid.flat().find((x) => x.anchor);
  assert(anchor && anchor.chips.filter((ch) => ch.big).length === 2 && anchor.chips[0].value === 4 * bout.rules.maxDenom, 'Big chips stack on a two-by-two block, worth 4 basic chips');
  assert(me.grid.flat().filter((x) => x.link).length === 3, 'they cover three more spaces');
  const at = me.grid.flatMap((row, r) => row.map((x, c) => ({ r, c, x }))); const a = at.find((y) => y.x === anchor), l = at.find((y) => y.x.link);
  const sh = B._test.engage; void sh; const share = B.affected; void share;
  const fee = B._test.feeShares(me, D.TRICKS.collapse, [{ r: a.r, c: a.c }, { r: l.r, c: l.c }], 6, false, bout); assert(fee.length === 1 && fee[0].amt === 6, 'the parts of a Big chip are one stack');
}
{ // Little chips: no height, one whole fee
  const { bout, me } = table(); clear(me); const cell = me.grid[3][0]; cell.chips = [...stackOf(3), shop('little', { hits: 1 })];
  assert(B.solidCount(cell) === 3, 'a Little chip takes no height'); assert(engage(bout, null, me, 3, 0, 9, {}).placed === 0 && B.solidCount(cell) === 3, 'it blocks a whole fee');
}
{ // the Magic Hat: always at the bottom, swallows the chip on it, moves with Corrections
  const { bout, me } = table(); clear(me); me.grid[3][0].chips = [chip('hat'), std(5), std(1)];
  drain(growth(bout, me)); assert(me.grid[3][0].chips.length === 2 && me.grid[3][0].chips[1].value === 1, 'the Hat swallows the chip on it');
  arrange(bout, me, 'back', null); const where = me.grid.flat().find((x) => x.chips.some((ch) => ch.kind === 'hat'));
  assert(where && where.chips[0].kind === 'hat', 'after a Correction it is still at the bottom of its stack');
}
{ // Doom: when every stack is topped with it, one Debt per Doom instance
  const { bout, me } = table(); clear(me); me.grid[3][0].chips = [std(5), chip('doom', 0, { owner: 1 })]; me.grid[3][1].chips = [std(5), chip('doom', 0, { owner: 1 }), chip('doom', 0, { owner: 1 })];
  drain(growth(bout, me)); assert(B.debtOf(me.grid[3][0]) === 1 && B.debtOf(me.grid[3][1]) === 2, 'each Doom chip charges 1¢ once every stack is doomed');
  me.grid[3][2].chips = [std(1)]; me.grid[3][0].chips = me.grid[3][0].chips.filter((ch) => ch.kind !== 'debt'); drain(growth(bout, me)); assert(!B.debtOf(me.grid[3][0]), 'one clean stack holds Doom off');
}
{ // Spy
  const { me } = table(); me.grid[3][0].chips.push(shop('spy')); assert(B.spying(me) === 1, 'a Spy on top of your stack is counted');
}
{ // a shop Egg hatches a Dragon at your opponent; a broken one never does
  const { bout, me } = table(); clear(me); me.grid[3][0].chips = [std(1), shop('egg', { hits: 5, prog: 0, foe: 1 })];
  for (let t = 0; t < 5; t++) drain(growth(bout, me)); assert(bout.creatures.some((cr) => cr.kind === 'dragon' && cr.side === 1), 'an egg hatches after 5 steps, a Dragon at the egg\'s foe');
  me.grid[3][0].chips = [std(1), shop('egg', { hits: 5, prog: 0, foe: 1 })]; for (let k = 0; k < 5; k++) engage(bout, null, me, 3, 0, 1, {});
  assert(!me.grid[3][0].chips.some((ch) => ch.kind === 'egg'), 'five whole fees break it');
}
{ // calamities: Volcano chips, a 2d6 Tornado, a Blizzard, a B-52, a Black Hole
  const run = R.newRun('technician', 'standard', 4); R.enterFloor(run, 4); run.purse = 5000;
  const seen = new Set();
  for (let k = 0; k < 40 && seen.size < 5; k++) { run.rng.s = k * 77 + 3; const prep = R.newPrep(run, 'table', 0); prep.tilts.calamity = 1; const { bout } = R.startTable(run, prep); const me = bout.sides[0], cal = me.calamities[0];
    if (cal === 'volcano' && !seen.has(cal)) { const v = me.grid.flat().find((x) => x.volcano); assert(v.chips.filter((ch) => ch.kind === 'volcano').length === me.dims.stackMax && B.capacityLeft(me, v) === 0, 'a Volcano is a full stack nothing can be placed on'); seen.add(cal); }
    if (cal === 'tornado' && !seen.has(cal)) { const t = me.sky.find((o) => o.kind === 'tornado'); assert(t && t.str >= 2 && t.str <= 12, 'a Tornado chip has a 2d6 strength'); seen.add(cal); }
    if (cal === 'b52' && !seen.has(cal)) { const p = me.sky.find((o) => o.kind === 'b52'); for (const x of me.grid[p.r]) x.chips = stackOf(2); drain(ticks(bout)); assert(me.grid[p.r][0].chips.some((ch) => ch.kind === 'boom' && ch.power === 52), 'a B-52 drops a 52¢ Boom chip'); seen.add(cal); }
    if (cal === 'blizzard' && !seen.has(cal)) { me.sky.push({ id: 1, kind: 'blizzard', r: -1, c: -1, str: 12 }); const before = B.worth(me); drain(ticks(bout)); assert(me.grid.flat().some((x) => x.chips.some((ch) => ch.frozen)) && B.worth(me) <= before, 'a Blizzard freezes short stacks'); seen.add(cal); }
    if (cal === 'blackhole' && !seen.has(cal)) { const at = me.grid.flatMap((row, r) => row.map((x, c) => ({ r, c, x }))).find((y) => y.x.black), n0 = me.grid.flat().reduce((n, x) => n + B.solidCount(x), 0);
      arrange(bout, me, 'front', null); assert(me.grid.flat().reduce((n, x) => n + B.solidCount(x), 0) < n0 || !at, 'a Correction feeds the Black Hole bottom chips'); seen.add(cal); }
  }
  assert(seen.size >= 4, `calamities turn up as chips (${[...seen].join(', ')})`);
}
{ // traits: every chip's information lists its traits, list ones and derived ones
  const t = traitsOf({ kind: 'std', value: 5 }); assert(t.some((x) => x.k === 'worth') && t.some((x) => x.derived), 'a chip shows list traits and derived traits');
  assert(traitsOf(shop('zap')).some((x) => x.k === 'electric'), 'a Zap chip is electric'); assert(traitsOf(shop('repeater')).some((x) => x.k === 'electronic'), 'a Repeater is electronic');
  assert(Object.values(TRAITS).every((x) => x.name && x.text && (x.list || x.derived)), 'every trait says whether it is from the list or derived');
}
console.log('ok, round 13 chips');
