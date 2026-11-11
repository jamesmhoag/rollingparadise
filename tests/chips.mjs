// Shop chips: tier pricing and floor gates, deployment at the base, and each chip's effect at the table.
import * as R from '../js/run.js'; import * as B from '../js/bout.js'; import * as D from '../js/data.js';
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exit(1); } };
const { engage, ticks } = B._test;
const drain = (g) => { for (const _ of g); }; // eslint-disable-line no-unused-vars

// ---------- pricing ----------
for (const id of Object.keys(D.SHOP_CHIPS)) {
  const X = D.SHOP_CHIPS[id];
  assert(D.CHIP_TIERS[X.tier], `${id} has a tier`);
  assert(D.shopPrice(id) === (X.price ?? D.CHIP_TIERS[X.tier].price), `${id} is priced by its tier`);
  assert(typeof D.shopText(id) === 'string' && D.shopText(id).length > 10, `${id} explains itself`);
}
for (let t = 2; t < D.CHIP_TIERS.length; t++) assert(D.CHIP_TIERS[t].price > D.CHIP_TIERS[t - 1].price, 'higher tiers cost more');
{
  const run = R.newRun('hustler', 'standard', 3); R.enterFloor(run, 1); run.purse = 100000;
  assert(!R.buyShopChip(run, 'rebound'), 'a Rare chip is not sold on floor 1');
  assert(R.buyShopChip(run, 'reducer') && run.purse === 100000 - D.shopPrice('reducer') && R.owned(run, 'reducer') === 1, 'an Uncommon chip is sold on floor 1 at its tier price');
  R.enterFloor(run, 2); const before = run.purse;
  assert(R.buyShopChip(run, 'rebound') && before - run.purse === D.CHIP_TIERS[3].price, 'a Rare chip costs the Rare price from floor 2');
}

// a table bout with the given shop chips placed
function table(chips, seed = 9) {
  const run = R.newRun('technician', 'standard', seed); R.enterFloor(run, 4); run.purse = 5000;
  run.chips = { ...chips }; run.plan.resist = { ...chips };
  const { bout, ctx } = R.startTable(run, R.newPrep(run, 'table', 0));
  return { run, bout, ctx, me: bout.sides[0], opp: bout.sides[1] };
}
const cellsWith = (s, id) => s.grid.flatMap((row, r) => row.map((cell, c) => ({ r, c, cell }))).filter((x) => B.shopCount(x.cell, id));
const opps = (s) => s.grid.flat().reduce((n, cell) => n + cell.chips.filter((ch) => ch.kind === 'opp').length, 0);

// ---------- deployment ----------
{
  const { me, ctx } = table({ crown: 1, burn: 2 });
  const crown = cellsWith(me, 'crown');
  assert(crown.length === 1 && crown[0].cell.hard === D.shopVars('crown').turns, 'a Crown chip starts its stack Hardened');
  assert(crown[0].cell.chips[0].resist === 'crown', 'shop chips go at the base of the stack');
  assert(ctx.felt && D.FELTS[ctx.felt], 'a table bout carries its felt');
}

// ---------- bumper ----------
{
  const { bout, me, opp } = table({ reducer: 1 });
  const { r, c } = cellsWith(me, 'reducer')[0];
  const g = engage(bout, opp, me, r, c, 5, {});
  assert(g.placed === 5 - D.shopVars('reducer').absorb, 'a Reducer chip takes its share off each fee');
  const p = engage(bout, opp, me, r, c, 5, { pierce: true });
  assert(p.placed === 5, 'pierce goes straight through a Reducer chip');
}

// ---------- mirror ----------
{
  const { bout, me, opp } = table({ rebound: 1 });
  const { r, c } = cellsWith(me, 'rebound')[0];
  const before = opp.grid.flat().reduce((n, cell) => n + B.debtOf(cell), 0);
  const g = engage(bout, opp, me, r, c, 4, {});
  const after = opp.grid.flat().reduce((n, cell) => n + B.debtOf(cell), 0);
  assert(g.placed === 4, 'a mirrored fee is still charged');
  assert(after - before === D.shopVars('rebound').reflect, 'a Rebound chip sends Debt back to the attacker');
}

// ---------- anchor ----------
{
  const { bout, me } = table({ anchor: 1 });
  // anchor every stack but one, then send a UFO
  const live = me.grid.flatMap((row, r) => row.map((cell, c) => ({ r, c, cell }))).filter((x) => B.solidCount(x.cell));
  for (const x of live.slice(1)) if (!B.shopCount(x.cell, 'anchor')) x.cell.chips.unshift({ id: 9e6 + x.r * 10 + x.c, kind: 'std', value: 1, resist: 'anchor' });
  const free = live[0].cell.chips.some((ch) => ch.resist === 'anchor') ? null : live[0];
  const heights = live.map((x) => x.cell.chips.length);
  bout.creatures.push({ id: 8e6, kind: 'ufo', side: 0, r: -1, c: 0, life: 3, arrive: 1 });
  drain(ticks(bout));
  live.forEach((x, i) => { if (x !== free) assert(x.cell.chips.length >= heights[i], 'creatures cannot take from an anchored stack'); });
}

// ---------- lucky ----------
{
  const keep = D.SHOP_CHIPS.lucky.vars.chance; D.SHOP_CHIPS.lucky.vars.chance = 1;
  const { bout, me } = table({ lucky: 2 });
  const before = opps(me); drain(ticks(bout));
  assert(opps(me) - before === 2, 'each Lucky chip can turn up an Opportunity chip');
  D.SHOP_CHIPS.lucky.vars.chance = keep;
}

// ---------- nest egg ----------
{
  const { bout } = table({ nest: 3 });
  assert(B.summary(bout, 0).nest === 3 * D.shopVars('nest').payout, 'Nest Egg chips on the table count toward the payout');
}

// ---------- resists for the new hazards ----------
for (const el of ['corrupt', 'poison', 'boom']) {
  const { bout, me } = table({ [el]: 1 });
  const { cell } = cellsWith(me, el)[0];
  cell.chips.push({ id: 7e6, kind: el, value: 0, life: 1 });
  const top = cell.chips.filter((ch) => ch.kind === 'std').length;
  drain(ticks(bout));
  assert(!cell.chips.some((ch) => ch.kind === el), `a ${D.SHOP_CHIPS[el].name} clears ${D.CHIPS[el].name}s`);
  assert(cell.chips.filter((ch) => ch.kind === 'std').length === top && !B.debtOf(cell), `the ${D.SHOP_CHIPS[el].name} stops the hazard before it acts`);
}

// ---------- Transpara ----------
{
  const { bout, me, opp } = table({ transpara: 5 });
  const fogged = cellsWith(me, 'transpara').map((x) => x.r + ':' + x.c);
  const e = { trick: { id: 'scorch', q: 1, up: 0 }, dice: [], state: 'shown' };
  const aim = B.validTargets(bout, opp, e).filter((v) => v.side === 0).map((v) => v.r + ':' + v.c);
  assert(fogged.length && !aim.some((k) => fogged.includes(k)), 'an opponent cannot aim at a Transpara stack');
  const self = { trick: { id: 'gild', q: 1, up: 0 }, dice: [], state: 'shown' };
  assert(B.validTargets(bout, me, self).some((v) => fogged.includes(v.r + ':' + v.c)), 'you can still aim at your own Transpara stack');
}

// ---------- chips from the workbook list ----------
const freeCell = (s) => s.grid.flatMap((row, r) => row.map((cell, c) => ({ r, c, cell }))).find((x) => !x.cell.hole && !x.cell.chips.length);
{ // Frozen: Chill merges chips into one, which cannot be bid or burned
  const { bout, me } = table({});
  const x = me.grid.flatMap((row, r) => row.map((cell, c) => ({ r, c, cell }))).find((y) => y.cell.chips.filter((ch) => ch.kind === 'std').length >= 3);
  const worth = B.cellWorth(x.cell), n = x.cell.chips.length;
  const e = { uid: 1, trick: { id: 'chill', q: 1, up: 0 }, dice: [{ value: 6, type: 'd6' }, { value: 6, type: 'd6' }], bid: [], bidValue: 1, lingerTotal: 0, lingerLeft: 0, state: 'play', target: { side: 0, r: x.r, c: x.c } };
  me.run.push(e); me.fz = { ...me.mods }; drain(B._test.play(bout, me, e));
  const fz = x.cell.chips.find((ch) => ch.frozen);
  assert(fz && x.cell.chips.length < n && B.cellWorth(x.cell) === worth, 'Chill freezes chips into one worth their sum');
  assert(!B.bidChip(me, x.r, x.c), 'a Frozen chip cannot be bid');
  x.cell.chips.push({ id: 5e6, kind: 'burn', value: 0, life: 3 }); drain(ticks(bout));
  assert(x.cell.chips.includes(fz) && !x.cell.chips.some((ch) => ch.kind === 'burn'), 'a Frozen chip cannot be burned');
}
{ // Feather: a fee larger than the stack misses it
  const { bout, me, opp } = table({});
  const x = me.grid.flatMap((row, r) => row.map((cell, c) => ({ r, c, cell }))).find((y) => B.cellWorth(y.cell) > 0);
  x.cell.chips[x.cell.chips.length - 1].feather = 2;
  assert(engage(bout, opp, me, x.r, x.c, B.cellWorth(x.cell) + 1, {}).placed === 0, 'a Feathered stack lets a bigger fee float past');
  assert(engage(bout, opp, me, x.r, x.c, 1, {}).placed === 1, 'a small fee still lands on a Feathered stack');
}
{ // Seed → Flower → Petals; a Petal takes a whole fee
  const { bout, me, opp } = table({ seed: 1 });
  const f = me.grid.flatMap((row, r) => row.map((cell, c) => ({ r, c, cell }))).find((y) => y.cell.chips.some((ch) => ch.kind === 'flower'));
  assert(f, 'a Seed on a stack sprouts into a Flower');
  for (const row of me.grid) for (const cell of row) if (cell !== f.cell && cell.chips.length > 1 && cell.chips[cell.chips.length - 1].kind === 'std') cell.chips.pop(); // room to bloom
  drain(ticks(bout));
  const petal = me.grid.flatMap((row, r) => row.map((cell, c) => ({ r, c, cell }))).find((y) => y.cell.chips[y.cell.chips.length - 1]?.kind === 'petal');
  assert(petal, 'a Flower blooms Petals on the stacks around it');
  const worth = B.cellWorth(petal.cell);
  engage(bout, opp, me, petal.r, petal.c, 9, {}); drain(B._test.settleAll(bout, 'expense'));
  assert(B.cellWorth(petal.cell) === worth && !petal.cell.chips.some((ch) => ch.kind === 'petal'), 'a Petal takes a whole fee and breaks');
}
{ // Clay takes whole fees; fire bakes it into Brick
  const { bout, me, opp } = table({ clay: 1 });
  const c = me.grid.flatMap((row, r) => row.map((cell, cc) => ({ r, c: cc, cell }))).find((y) => y.cell.chips[y.cell.chips.length - 1]?.kind === 'clay');
  assert(c, 'a Clay chip goes on top of a stack');
  const worth = B.cellWorth(c.cell);
  engage(bout, opp, me, c.r, c.c, 7, {}); drain(B._test.settleAll(bout, 'expense'));
  assert(B.cellWorth(c.cell) === worth && c.cell.chips.some((ch) => ch.kind === 'clay'), 'Clay takes a whole fee and holds');
  c.cell.chips.push({ id: 5e6 + 1, kind: 'burn', value: 0, life: 3 }); drain(ticks(bout));
  const brick = c.cell.chips.find((ch) => ch.kind === 'brick');
  assert(brick && brick.hits === 2, 'fire bakes Clay into Brick with twice the hits left');
}
{ // Harmony clears a hazard and leaves a 1¢ chip
  const { bout, me } = table({ harmony: 1 });
  const { cell } = cellsWith(me, 'harmony')[0];
  cell.chips.push({ id: 5e6 + 2, kind: 'poison', value: 0, life: 99 });
  const hz = (x) => x.chips.some((ch) => ch.kind === 'poison');
  drain(ticks(bout)); // poison acts first, then Harmony clears it
  assert(!hz(cell), 'Harmony clears a hazard nearby');
}
{ // Power and Control chips
  const { bout, me, opp } = table({ power: 2, control: 1 });
  drain(B.resolve(bout));
  assert(me.mods.boost >= 2 * D.shopVars('power').boost && opp.mods.enfeeble >= D.shopVars('control').enfeeble, 'Power and Control chips push roll effects each turn');
}
{ // Ward cancels the largest fee
  const { bout, me, opp } = table({ ward: 1 });
  const live = me.grid.flatMap((row, r) => row.map((cell, c) => ({ r, c, cell }))).filter((y) => B.cellWorth(y.cell) > 0);
  const a = live[0], z = live[1], wa = B.cellWorth(a.cell), wz = B.cellWorth(z.cell);
  engage(bout, opp, me, a.r, a.c, 9, {}); engage(bout, opp, me, z.r, z.c, 2, {}); drain(B._test.settleAll(bout, 'expense'));
  assert(B.cellWorth(a.cell) === wa && B.cellWorth(z.cell) < wz, 'a Ward cancels the largest fee and lets the rest through');
}
{ // Shadow: hidden behind a taller stack in its lane
  const { bout, me, opp } = table({});
  const m = me.dims.meterRows, c = 0, back = me.grid[m + 1][c], front = me.grid[m][c];
  back.chips.unshift({ id: 5e6 + 3, kind: 'std', value: 1, resist: 'shadow', shop: 'shadow' });
  while (B.solidCount(back) >= B.solidCount(front) && back.chips.length > 1) back.chips.pop();
  const e = { trick: { id: 'scorch', q: 1, up: 0 }, dice: [], state: 'shown' };
  assert(!B.validTargets(bout, opp, e).some((v) => v.side === 0 && v.r === m + 1 && v.c === c), 'a Shadow stack behind a taller one cannot be aimed at');
}
{ // Dynamite burns down, then destroys every chip around it
  const { bout, me } = table({});
  const spot = freeCell(me); for (let k = 0; k < 2; k++) spot.cell.chips.push({ id: 5e6 + 10 + k, kind: 'dynamite', value: 0 });
  drain(ticks(bout));
  assert(spot.cell.chips.length === 1, 'Dynamite burns down one stick a turn');
  const nearWorth = () => me.grid.flatMap((row, r) => row.map((cell, c) => ({ r, c, cell }))).filter((x) => Math.abs(x.r - spot.r) <= 1 && Math.abs(x.c - spot.c) <= 1 && x.cell !== spot.cell).reduce((t, x) => t + x.cell.chips.length, 0);
  drain(ticks(bout));
  assert(!spot.cell.chips.length && nearWorth() === 0, 'when the last stick goes, the stacks around it are destroyed');
}

// ---------- dice upgrades ----------
{
  const { RNG } = await import('../js/util.js'); const X = await import('../js/dice.js');
  const rng = new RNG(4), d6 = () => ({ type: 'd6', up: [] }), vals = (d) => X.faceList(d);
  assert(Object.keys(D.DIE_UPGRADES).length === 22, 'all 22 dice upgrades from the workbook');
  const eq = (a, b, msg) => assert(JSON.stringify(a) === JSON.stringify(b), `${msg}: ${JSON.stringify(a)}`);
  eq(vals(X.upgrade(d6(), 'accelerate')), [2, 3, 4, 5, 6, 7], 'Accelerate');
  eq(vals(X.upgrade(d6(), 'deccelerate')), [0, 1, 2, 3, 4, 5], 'Deccelerate');
  eq(vals(X.upgrade(d6(), 'scatter', 5)), [3, 3, 4, 5, 6, 0], 'Scatter shares the target evenly');
  eq(vals(X.upgrade(d6(), 'raise', 0)), [0, 2, 3, 4, 5, 7], 'Raise empties into the highest');
  eq(vals(X.upgrade(d6(), 'vow', 5)), [7, 2, 3, 4, 5, 0], 'Vow empties into the lowest');
  eq(vals(X.upgrade(d6(), 'divide', 0)), [6, 1, 2, 3, 4, 5], 'Divide fills the target from every face');
  eq(vals(X.upgrade(d6(), 'gift', 0)), [4, 2, 3, 4, 5, 3], 'Gift fills from the highest');
  eq(vals(X.upgrade(d6(), 'devour', 5)), [0, 2, 3, 4, 5, 7], 'Devour fills from the lowest');
  eq(vals(X.upgrade(d6(), 'boost', 2)), [1, 2, 5, 4, 5, 6], 'Boost');
  eq(vals(X.upgrade(d6(), 'bonk', 0)), [0, 2, 3, 4, 5, 6], 'Bonk');
  eq(vals(X.upgrade(d6(), 'stabilize')), [2, 3, 3, 4, 4, 5], 'Stabilize');
  eq(vals(X.upgrade(d6(), 'rebalance', 5)), [0, 2, 3, 4, 5, 12], 'Rebalance');
  const rig = X.boutCopy(X.upgrade(d6(), 'rig', 5)); eq(vals(rig)[5], 12, 'Rig doubles the face');
  for (let k = 0; k < 400 && vals(rig)[5]; k++) X.rollDie(rng, rig);
  assert(vals(rig)[5] === 0, 'Rig: the face is spent after it comes up');
  const enc = X.boutCopy(X.upgrade(d6(), 'encase', 5)); for (let k = 0; k < 400 && !vals(enc)[5]; k++) X.rollDie(rng, enc);
  assert(vals(enc)[5] === D.DIE_VARS.encaseStep, 'Encase grows each time it comes up');
  const fresh = X.upgrade(d6(), 'encase', 5); assert(X.faceList(X.boutCopy(fresh))[5] === 0, 'a bout copy starts the encased face fresh');
  const roll = (d, n = 3000) => { let t = 0; for (let k = 0; k < n; k++) t += X.rollDie(rng, d); return t / n; };
  assert(roll(X.upgrade(d6(), 'escalate')) > 4 && roll(X.upgrade(d6(), 'temper')) < 3, 'Escalate rolls high, Temper rolls low');
  const emph = X.upgrade(d6(), 'emphasize', 5); let sixes = 0; for (let k = 0; k < 3500; k++) if (X.rollDie(rng, emph) === 6) sixes++;
  assert(sixes > 800, 'Emphasize makes the target face come up more often');
  const cur = X.upgrade(d6(), 'curse'); let zeros = 0; for (let k = 0; k < 600; k++) if (X.rollDie(rng, cur) === 0) zeros++;
  assert(zeros > 350, 'Curse zeroes most faces');
  const mir = X.upgrade(d6(), 'mirror', 5, rng); assert(vals(mir).filter((v) => v === 6).length === 2, 'Mirror copies the target face onto another');
  const ref = X.upgrade(d6(), 'reflect', 0, rng); assert(vals(ref)[0] !== 1 && vals(ref).slice(1).includes(vals(ref)[0]), 'Reflect copies another face onto the target');
  assert(X.canUpgrade(X.upgrade(d6(), 'escalate'), 'escalate'), 'roll-time upgrades cannot be doubled');
  assert(!X.canUpgrade(X.upgrade(d6(), 'boost', 1), 'boost'), 'face upgrades can be taken twice');
  // a legacy die from an old save keeps working
  eq(X.faceList({ type: 'd4', up: ['accelerate'] }), [2, 3, 4, 5], 'old saves');
  // the Diesmith: floor gates and targets
  const run = R.newRun('rascal', 'standard', 8); R.enterFloor(run, 1); run.purse = 1e6;
  const d = run.dice[0];
  assert(!R.upgradeDie(run, d.id, 'rig', 0), 'Rig is not offered on floor 1');
  assert(R.upgradeDie(run, d.id, 'boost', 2) && X.faceList(d)[2] === 3 + D.DIE_VARS.bump, 'the Diesmith upgrades the face you pick');
}

// ---------- the floor path and prizes ----------
{
  const run = R.newRun('hustler', 'standard', 11); R.enterFloor(run, 1);
  assert(R.tableOpen(run, 0) && !R.tableOpen(run, 1) && !R.tableOpen(run, 2), 'only table 1 is open at first');
  run.fs.tables[0].beaten = true;
  assert(R.tableOpen(run, 1) && R.tableOpen(run, 2) && R.tablesLeft(run) === 1, 'table 1 opens tables 2 and 3');
  run.fs.tables[2].beaten = true;
  assert(!R.tableOpen(run, 1) && R.tableState(run, 1) === 'passed' && R.tablesLeft(run) === 0, 'beating one of tables 2 and 3 closes the other');
}
{
  const ctx = { opp: { worth: 200 } };
  assert(R.prizeBonus(ctx) === Math.round(200 * D.PRIZES.bonus), 'the bonus is a share of the opponent\'s worth');
  const res = { base: 100, winnings: 50, prizes: { dice: [{ type: 'd6' }, { type: 'd8' }], tricks: [{ id: 'charge', q: 1, up: 0 }] } };
  for (const [choice, extra] of [['die', R.prizeBonus(ctx)], ['dice', 0], ['glean', 0]]) {
    const run = R.newRun('rascal', 'standard', 2); run.purse = 0; const c2 = { ...ctx, committed: 0, wager: 0 };
    R.claimPrize(run, c2, res, choice, [0, 1]);
    assert(run.purse === 150 + extra, `the winnings are kept with the ${choice} prize`);
  }
}

// ---------- felts ----------
for (const [id, F] of Object.entries(D.FELTS)) assert(/^#[0-9a-f]{6}$/i.test(F.a) && /^#[0-9a-f]{6}$/i.test(F.b) && /^#[0-9a-f]{6}$/i.test(F.rim), `${id} felt has colours`);
assert(D.feltOf('Satin') === D.FELTS.satin && D.feltId('Satin') === 'satin', 'a felt saved by name still resolves');
{ const run = R.newRun('rascal', 'standard', 5); R.enterFloor(run, 1); assert(run.fs.tables.every((t) => D.FELT_POOL.includes(t.felt)), 'tables are dealt felts from the pool'); }

console.log('ok, shop chips and felts');
