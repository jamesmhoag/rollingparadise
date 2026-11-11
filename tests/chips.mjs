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
  assert(!R.buyShopChip(run, 'mirror'), 'a Rare chip is not sold on floor 1');
  assert(R.buyShopChip(run, 'bumper') && run.purse === 100000 - D.shopPrice('bumper') && R.owned(run, 'bumper') === 1, 'an Uncommon chip is sold on floor 1 at its tier price');
  R.enterFloor(run, 2); const before = run.purse;
  assert(R.buyShopChip(run, 'mirror') && before - run.purse === D.CHIP_TIERS[3].price, 'a Rare chip costs the Rare price from floor 2');
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
  const { bout, me, opp } = table({ bumper: 1 });
  const { r, c } = cellsWith(me, 'bumper')[0];
  const g = engage(bout, opp, me, r, c, 5, {});
  assert(g.placed === 5 - D.shopVars('bumper').absorb, 'a Bumper chip takes its share off each fee');
  const p = engage(bout, opp, me, r, c, 5, { pierce: true });
  assert(p.placed === 5, 'pierce goes straight through a Bumper chip');
}

// ---------- mirror ----------
{
  const { bout, me, opp } = table({ mirror: 1 });
  const { r, c } = cellsWith(me, 'mirror')[0];
  const before = opp.grid.flat().reduce((n, cell) => n + B.debtOf(cell), 0);
  const g = engage(bout, opp, me, r, c, 4, {});
  const after = opp.grid.flat().reduce((n, cell) => n + B.debtOf(cell), 0);
  assert(g.placed === 4, 'a mirrored fee is still charged');
  assert(after - before === D.shopVars('mirror').reflect, 'a Mirror chip sends Debt back to the attacker');
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

// ---------- Frozen, Lava, Fog ----------
{
  const { bout, me } = table({});
  const spot = B.biddable(me)[0], cell = me.grid[spot.r][spot.c];
  cell.chips.push({ id: 6e6, kind: 'frozen', value: 0, life: 2 });
  assert(!B.bidChip(me, spot.r, spot.c) && !B.biddable(me).some((x) => x.r === spot.r && x.c === spot.c), 'a Frozen stack cannot be bid from');
  drain(ticks(bout)); drain(ticks(bout));
  assert(!B.frozen(cell), 'Frozen thaws after two turns');
}
{
  const { bout, me } = table({ frozen: 1 });
  const { cell } = cellsWith(me, 'frozen')[0];
  cell.chips.push({ id: 6e6 + 1, kind: 'frozen', value: 0, life: 9 }); drain(ticks(bout));
  assert(!B.frozen(cell), 'an Orange chip thaws its stack');
}
{
  const { bout, me } = table({});
  const live = me.grid.flatMap((row, r) => row.map((cell, c) => ({ r, c, cell }))).filter((x) => B.solidCount(x.cell) >= 2);
  const x = live[Math.floor(live.length / 2)], h0 = B.solidCount(x.cell);
  x.cell.chips.push({ id: 6e6 + 2, kind: 'lava', value: 0, life: 2 });
  const burnsBefore = me.grid.flat().filter((c) => c.chips.some((ch) => ch.kind === 'burn')).length;
  drain(ticks(bout));
  assert(B.solidCount(x.cell) === h0 - 1, 'Lava melts the chip beneath it');
  assert(me.grid.flat().filter((c) => c.chips.some((ch) => ch.kind === 'burn')).length > burnsBefore, 'Lava spills a Burning chip next door');
}
{
  const { bout, me } = table({ burn: 1 });
  const { cell } = cellsWith(me, 'burn')[0];
  cell.chips.push({ id: 6e6 + 3, kind: 'lava', value: 0, life: 2 }); drain(ticks(bout));
  assert(!cell.chips.some((ch) => ch.kind === 'lava'), 'a Red chip stops Lava');
}
{
  const { bout, me, opp } = table({ fog: 5 });
  const fogged = cellsWith(me, 'fog').map((x) => x.r + ':' + x.c);
  const e = { trick: { id: 'scorch', q: 1, up: 0 }, dice: [], state: 'shown' };
  const aim = B.validTargets(bout, opp, e).filter((v) => v.side === 0).map((v) => v.r + ':' + v.c);
  assert(fogged.length && !aim.some((k) => fogged.includes(k)), 'an opponent cannot aim at a Fog stack');
  const self = { trick: { id: 'gild', q: 1, up: 0 }, dice: [], state: 'shown' };
  assert(B.validTargets(bout, me, self).some((v) => fogged.includes(v.r + ':' + v.c)), 'you can still aim at your own Fog stack');
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
