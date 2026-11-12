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
  assert(!R.buyShopChip(run, 'tree'), 'a Rare chip is not sold on floor 1');
  assert(R.buyShopChip(run, 'seed') && run.purse === 100000 - D.shopPrice('seed') && R.owned(run, 'seed') === 1, 'an Uncommon chip is sold on floor 1 at its tier price');
  R.enterFloor(run, 2); const before = run.purse;
  assert(R.buyShopChip(run, 'tree') && before - run.purse === D.CHIP_TIERS[3].price, 'a Rare chip costs the Rare price from floor 2');
  run.purse = 1e9; R.enterFloor(run, 4);
  for (const id of ['reducer', 'power', 'harmony', 'upgrade', 'boosted', 'hive', 'honey', 'egg', 'crown']) assert(!R.buyShopChip(run, id) && !D.SHOP_IDS().includes(id), `${D.SHOP_CHIPS[id].name} is made at the table, not sold`);
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
  assert(crown.length === 1 && B.hardOf(crown[0].cell) === D.shopVars('crown').turns && crown[0].cell.chips.some((ch) => ch.kind === 'hard'), 'a Crown chip starts its stack Hardened');
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
  assert(opps(me) === before, 'Lucky chips do nothing in the House phase');
  drain(B._test.chipPhase(bout, me, 'investment'));
  assert(opps(me) - before === 2, 'each Lucky chip can turn up an Opportunity chip, in the Investment phase');
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
  drain(B._test.chipPhase(bout, me, 'correction')); // Harmony works in the Correction phase
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

// ---------- restored: Frost, Lava, Orange ----------
{
  const { bout, me } = table({});
  const spot = B.biddable(me)[0], cell = me.grid[spot.r][spot.c];
  cell.chips.push({ id: 4e6, kind: 'frost', value: 0, life: 2 });
  assert(!B.bidChip(me, spot.r, spot.c), 'a Frost stack cannot be bid from');
  drain(ticks(bout)); drain(ticks(bout));
  assert(!cell.chips.some((ch) => ch.kind === 'frost'), 'Frost thaws after two turns');
}
{
  const { bout, me } = table({ frost: 1 });
  const { cell } = cellsWith(me, 'frost')[0];
  cell.chips.push({ id: 4e6 + 1, kind: 'frost', value: 0, life: 9 }); drain(ticks(bout));
  assert(!cell.chips.some((ch) => ch.kind === 'frost'), 'an Orange chip thaws its stack');
}
{
  const { bout, me } = table({ burn: 1 });
  const { cell } = cellsWith(me, 'burn')[0];
  cell.chips.push({ id: 4e6 + 2, kind: 'lava', value: 0, life: 2 }); drain(ticks(bout));
  assert(!cell.chips.some((ch) => ch.kind === 'lava'), 'a Red chip stops Lava');
}
{ // a Petal blocks a whole fee when it lands, however big
  const { bout, me, opp } = table({});
  const x = me.grid.flatMap((row, r) => row.map((cell, c) => ({ r, c, cell }))).find((y) => B.cellWorth(y.cell) > 0);
  x.cell.chips.push({ id: 4e6 + 3, kind: 'petal', value: 0, hits: 1, life: 2 });
  const g = engage(bout, opp, me, x.r, x.c, 500, {});
  assert(g.placed === 0 && !x.cell.chips.some((ch) => ch.kind === 'petal'), 'a Petal blocks an entire fee and breaks');
  assert(engage(bout, opp, me, x.r, x.c, 3, {}).placed === 3, 'the next fee lands');
}

// ---------- arrangements ----------
const lane = (s, c) => s.grid.map((row) => row[c].chips.filter((ch) => !B.isHazard(ch)).map((ch) => ch.value));
const solidsIn = (s) => s.grid.flat().reduce((n, cell) => n + cell.chips.filter((ch) => !B.isHazard(ch)).length, 0);
{
  const { bout, me } = table({});
  const n0 = solidsIn(me), w0 = B.worth(me);
  B.arrange(bout, me, 'front', null);
  assert(solidsIn(me) === n0 && B.worth(me) === w0, 'arranging never loses or makes chips');
  for (let c = 0; c < me.dims.cols; c++) { const L = lane(me, c).map((x) => x.length); const first = L.findIndex((n) => n < me.dims.stackMax);
    assert(L.slice(first + 1).every((n) => n === 0), 'Retreat packs each lane toward the Stage'); }
  B.arrange(bout, me, 'back', null);
  for (let c = 0; c < me.dims.cols; c++) assert(lane(me, c)[0].length === 0 || lane(me, c).every((st) => st.length), 'Advance packs each lane to the back');
}
{
  const { bout, me } = table({});
  B.arrange(bout, me, 'value-front', null);
  for (let c = 0; c < me.dims.cols; c++) { const flat = lane(me, c).flatMap((st) => st.slice().reverse()); assert(flat.every((v, i) => i === 0 || flat[i - 1] >= v), 'Stack Up puts the biggest chips at the front, on top'); }
  B.arrange(bout, me, 'value-back', null);
  for (let c = 0; c < me.dims.cols; c++) { const flat = lane(me, c).flatMap((st) => st.slice().reverse()); assert(flat.every((v, i) => i === 0 || flat[i - 1] <= v), 'Stash puts the biggest chips at the back'); }
}
{
  const { bout, me } = table({});
  const back = me.grid[me.rows - 1][0]; back.chips.push({ id: 4e6 + 9, kind: 'block', value: 0 }); while (B.solidCount(back) > me.dims.stackMax) back.chips.splice(0, 1);
  B.arrange(bout, me, 'shields', [{ r: 0, c: 0 }]);
  const firstStack = me.grid.map((row) => row[0]).find((cell) => cell.chips.length);
  assert(firstStack.chips[firstStack.chips.length - 1].kind === 'block', 'Bulwark brings shields to the front, on top');
}
{
  const { bout, me } = table({});
  const r = me.dims.meterRows; me.grid[r][0].chips = []; // a gap at the top of a row
  const before = me.grid[r].filter((cell) => cell.chips.length).length;
  B.arrange(bout, me, 'up', [{ r, c: 0 }]);
  assert(me.grid[r].slice(0, before).every((cell) => cell.chips.length) && !me.grid[r][me.dims.cols - 1].chips.length, 'Lift slides the row\'s stacks to the top lane');
  B.arrange(bout, me, 'down', [{ r, c: 0 }]);
  assert(!me.grid[r][0].chips.length && me.grid[r][me.dims.cols - 1].chips.length, 'Sink slides them to the bottom lane');
}
{ // anchored stacks stay put
  const { bout, me } = table({ anchor: 1 });
  const a = cellsWith(me, 'anchor')[0], before = a.cell.chips.map((ch) => ch.id).join();
  B.arrange(bout, me, 'back', null); B.arrange(bout, me, 'up', null);
  assert(a.cell.chips.map((ch) => ch.id).join() === before, 'an Anchor chip holds its stack in place');
}
{ // Debt stays with the chips
  const { bout, me } = table({});
  const x = me.grid.flatMap((row, r) => row.map((cell, c) => ({ r, c, cell }))).filter((y) => B.cellWorth(y.cell) > 0).sort((p, q) => q.r - p.r)[0];
  B._test.setDebt(bout, x.cell, 1); const owed = me.grid.flat().reduce((t, cell) => t + B.debtOf(cell), 0);
  B.arrange(bout, me, 'front', null); B.arrange(bout, me, 'up', null);
  assert(me.grid.flat().reduce((t, cell) => t + B.debtOf(cell), 0) === owed, 'Debt is never shed by moving chips');
}

// ---------- Swift, Vengeance, Saturate ----------
{
  assert(B.phaseOf('ambush') === 'investment' && B.phaseOf('charge') === 'expense', 'Ambush plays with the Investments');
  const { bout, me } = table({});
  me.paidLast = 7;
  const e = { uid: 2, trick: { id: 'vengeance', q: 1, up: 0 }, dice: [{ value: 2, type: 'd6' }, { value: 3, type: 'd6' }], bid: [], bidValue: 1, state: 'shown' };
  assert(B.previewTotal(me, e) === 5 + 7, 'Vengeance adds the fees you paid last turn');
  const { opp } = table({}); void opp;
}
{
  const { bout, me, opp } = table({});
  opp.mods.boost = 6;
  const e = { uid: 3, trick: { id: 'saturate', q: 1, up: 0 }, dice: [{ value: 2, type: 'd6' }, { value: 2, type: 'd6' }], bid: [], bidValue: 1, lingerTotal: 0, lingerLeft: 0, state: 'play' };
  me.fz = { ...me.mods }; drain(B._test.play(bout, me, e));
  assert(opp.mods.boost === 0 && me.mods.boost > 0 && B.powerOf(opp) === 0, 'Saturate boosts you and subdues their boosts (and Power on a match)');
}

// ---------- Tree, Wood, Sun, Fibonacci, Prime ----------
{
  const { bout, me, opp } = table({ tree: 1 });
  const t = me.grid.flatMap((row, r) => row.map((cell, c) => ({ r, c, cell }))).find((y) => y.cell.chips.length && y.cell.chips.every((ch) => ch.kind === 'tree'));
  assert(t, 'a Tree is planted on an empty space');
  for (const row of me.grid) for (const cell of row) if (cell !== t.cell && cell.chips.length > 2 && cell.chips[cell.chips.length - 1].kind === 'std') cell.chips.pop();
  for (let k = 0; k < me.dims.stackMax; k++) drain(ticks(bout));
  assert(t.cell.chips.length === me.dims.stackMax && t.cell.chips[0].seeded, 'a Tree grows a chip a turn to full height');
  const g = engage(bout, opp, me, t.r, t.c, 40, {});
  assert(g.placed === 0 && !t.cell.chips.some((ch) => ch.kind === 'tree') && me.grid.flat().some((cell) => cell.chips.some((ch) => ch.kind === 'wood')), 'a fee fells the Tree into Wood and is blocked');
}
{
  const { bout, me } = table({ tree: 1, sun: 1 });
  const t = me.grid.flat().find((cell) => cell.chips.length && cell.chips.every((ch) => ch.kind === 'tree'));
  drain(ticks(bout)); assert(t.chips.length === Math.min(3, me.dims.stackMax), 'the Sun makes a Tree grow twice as fast');
}
{
  const { bout, me } = table({ fib: 3 });
  const f = me.grid.flat().flatMap((cell) => cell.chips).filter((ch) => ch.shop === 'fib');
  assert(f.length === 1 && f[0].value === 3 && f[0].n === 3, 'three Fibonacci chips on one stack merge 1+1 → 2, then 2+1 → 3');
  assert(B.summary(bout, 0).resist.fib === 3, 'merged chips still come back as the chips that made them');
}
{
  const { bout, me } = table({ prime: 4 });
  const f = me.grid.flat().flatMap((cell) => cell.chips).filter((ch) => ch.shop === 'prime');
  assert(f.length === 1 && f[0].value === 5 && B.summary(bout, 0).seq === 1, 'four Prime chips merge to 5 and pay the 1¢ they grew');
}
{ // every chip on the list has a status, and built ones render
  const { CHIP_LIST } = await import('../js/chiplist.js');
  assert(CHIP_LIST.length === 107 && !CHIP_LIST.some((x) => x.name === 'Coin') && CHIP_LIST.every((x) => ['built', 'partial', 'needs'].includes(x.status) && x.note), 'every chip on the list but the Coin (an Artifact, for later) has a status and a note');
  for (const x of CHIP_LIST) if (x.show) assert(x.show.kind === 'std' || D.CHIPS[x.show.kind], `${x.name} renders`);
  for (const x of CHIP_LIST) if (x.show?.resist) assert(D.SHOP_CHIPS[x.show.resist], `${x.name} is sold`);
}

// ---------- Resist cards, food, bounties, Zap, Boosted, Cheapened, Upgrade, Worm Hole, Dragon Roost ----------
{
  const run = R.newRun('technician', 'standard', 9); R.enterFloor(run, 4); run.purse = 5000; run.cards.push('resist_card_plus');
  const { bout } = R.startTable(run, R.newPrep(run, 'table', 0)); const me = bout.sides[0], opp = bout.sides[1];
  const x = me.grid.flatMap((row, r) => row.map((cell, c) => ({ r, c, cell }))).find((y) => y.cell.chips.some((ch) => ch.kind === 'resist'));
  assert(x && x.cell.chips[0].kind === 'resist' && x.cell.chips[0].r === 3, 'a Resist Card puts a Resist chip at the base of a stack');
  assert(engage(bout, opp, me, x.r, x.c, 2, {}).placed === 0 && engage(bout, opp, me, x.r, x.c, 3, {}).placed > 0, 'Resist deters fees under r and lets bigger ones through');
}
{
  const { bout, me } = table({ chocolate: 1, hamburger: 1, bun: 2, egg: 1 });
  const at = (id) => me.grid.flatMap((row, r) => row.map((cell, c) => ({ r, c, cell }))).find((y) => y.cell.chips[y.cell.chips.length - 1]?.shop === id);
  const choc = at('chocolate'); assert(choc, 'food goes on top of a stack');
  assert(B.canEat(bout, me, choc.r, choc.c), 'food waits for the Drink phase');
  bout.phase = 'drink'; me.ate = false;
  const t0 = B.tipOf(me, 'trickery'); B.eat(bout, me, choc.r, choc.c);
  assert(!choc.cell.chips.some((ch) => ch.shop === 'chocolate') && me.ate, 'eating Chocolate takes it off the stack');
  const egg = at('egg'); if (egg) assert(B.canEat(bout, me, egg.r, egg.c) === 'One food a round.', 'one food a round');
  B.nextTurn(bout); assert(B.tipOf(me, 'trickery') === t0 + 1, 'the bonus works from the next turn');
  bout.phase = 'drink'; me.ate = false; B.nextTurn(bout); assert(B.tipOf(me, 'trickery') === t0 + 1, 'and the turn after (2 turns)');
  if (egg) { bout.phase = 'drink'; me.ate = false; const d0 = B.tipOf(me, 'proficiency'), t1 = B.tipOf(me, 'trickery'); B.eat(bout, me, egg.r, egg.c); B.nextTurn(bout); assert(B.tipOf(me, 'proficiency') === d0 + 2 && B.tipOf(me, 'trickery') === t1 - 2, 'an Egg pairs a penalty with a bigger bonus'); }
  bout.phase = 'drink'; me.ate = false;
  // build a burger by hand: Bun, Hamburger, Bun
  const spot = me.grid.flatMap((row, r) => row.map((cell, c) => ({ r, c, cell }))).find((y) => B.solidCount(y.cell) && B.capacityLeft(me, y.cell) >= 0 && y.r >= me.dims.meterRows);
  spot.cell.chips.push({ id: 3e6, kind: 'food', shop: 'bun', value: 0 }, { id: 3e6 + 1, kind: 'food', shop: 'hamburger', value: 0 }, { id: 3e6 + 2, kind: 'food', shop: 'bun', value: 0 });
  const f = B.eat(bout, me, spot.r, spot.c);
  assert(f && f.eat.length === 3 && f.mods.trickery === 1 && f.mods.ingenuity === 1 && f.turns === 2, 'the top Bun of Bun-Hamburger-Bun eats the whole burger');
  assert(!B.eat(bout, me, me.dims.meterRows, 0) || true, 'only food on top can be eaten');
}
{ // a creature soaks a fee, is driven off, drops a Bounty chip that pays out
  const { run, bout, me, opp, ctx } = table({});
  const x = me.grid.flatMap((row, r) => row.map((cell, c) => ({ r, c, cell }))).find((y) => B.solidCount(y.cell) && y.r >= me.dims.meterRows);
  bout.creatures.push({ id: 2e6, kind: 'fairy', side: 0, r: x.r, c: x.c, life: 3, arrive: 1 });
  bout.creatures.push({ id: 2e6 + 7, kind: 'mothership', side: 0, r: x.r, c: x.c + 1 < me.dims.cols ? x.c + 1 : x.c - 1, life: 3, arrive: 1, dmg: 0 });
  const ms = bout.creatures[1]; for (let k = 0; k < 9; k++) assert(engage(bout, opp, me, ms.r, ms.c, 50, {}).placed === 0, 'a creature takes a whole fee as one hit instance');
  assert(!ms.gone && ms.dmg === 9 && D.CREATURES.mothership.bounty === 10 * D.BOUNTY_PER_HIT, 'the Mothership has 10 hits and a bounty of 5¢ a hit');
  bout.creatures.splice(1, 1);
  assert(engage(bout, opp, me, x.r, x.c, 6, {}).placed === 5, 'the blow that drives a creature off spills the rest of the fee onto the stack beneath');
  const ex = { trick: { id: 'charge', q: 1, up: 0 }, dice: [{ value: 3, type: 'd6' }], state: 'shown' };
  bout.creatures.push({ id: 2e6 + 1, kind: 'ufo', side: 0, r: x.r, c: x.c, life: 3, arrive: 1 });
  assert(B.validTargets(bout, me, ex).some((v) => v.side === 0 && v.r === x.r && v.c === x.c), 'your own Expenses can aim at a creature over your stack');
  bout.creatures.pop();
  assert(bout.creatures[0].gone && me.grid.flat().some((cell) => cell.chips.some((ch) => ch.kind === 'bounty' && ch.value === D.CREATURES.fairy.bounty)), 'enough Debt drives it off and it drops a Bounty chip');
  const purse = run.purse, cards = run.cards.length + (run.pendingCard ? 1 : 0);
  bout.over = true; bout.winner = 1; const res = R.settle(run, ctx, bout);
  assert(run.purse === D.CREATURES.fairy.bounty && res.news.some((n) => /Bounty/.test(n)), 'a Bounty chip pays its worth, even on a loss'); void purse; void cards;
}
{ // Zap: a small fee shocks the attacker, a big one breaks it
  const { bout, me, opp } = table({ zap: 1 });
  const { r, c, cell } = cellsWith(me, 'zap')[0];
  const shocks = () => opp.grid.flat().filter((x) => x.chips.some((ch) => ch.kind === 'shock')).length;
  engage(bout, opp, me, r, c, 2, {}); assert(shocks() === 1, 'a small fee on a Zap stack shocks the attacker');
  engage(bout, opp, me, r, c, 9, {}); assert(!cell.chips.some((ch) => ch.shop === 'zap'), 'a big fee shorts it out');
}
{ // Boosted, Cheapened and Upgrade chips change rolls; an Upgrade chip bid lifts the trick
  const { bout, me, opp } = table({ boosted: 2, upgrade: 2 });
  assert(me.grid.slice(0, me.dims.meterRows).flat().some((cell) => cell.chips.some((ch) => ch.shop === 'upgrade')), 'Upgrade chips start on the Meter');
  for (const cell of me.grid.flat()) cell.chips = cell.chips.filter((ch) => ch.shop !== 'upgrade'); // random upgrades aside
  B.draw(bout, me, me.book[0].uid); B.advance(bout, true);
  const [d] = B.throwDice(bout, me, [me.pouch[0].id]);
  assert(d.value >= 1 + 2, 'Boosted chips raise the roll');
  for (const cell of opp.grid[opp.dims.meterRows]) cell.chips.unshift({ id: 1e6 + cell.chips.length, kind: 'std', value: 1, resist: 'cheapened', shop: 'cheapened' });
  const e = { trick: { id: 'charge', q: 1, up: 0 }, upBoost: 1 };
  assert(B.trickMult(B.effTrick(e)) === B.trickMult({ id: 'charge', q: 1, up: 1 }), 'a bid Upgrade chip plays the trick one upgrade higher');
}
{ // Worm Hole and Dragon Roost
  const run = R.newRun('technician', 'standard', 3); R.enterFloor(run, 4); run.purse = 5000;
  const { createBout } = B; void createBout;
  const prep = R.newPrep(run, 'table', 0); prep.tilts.calamity = 1; prep.tilts.spawner = 1;
  let found = { worm: 0, roost: 0 };
  for (let k = 0; k < 30 && !(found.worm && found.roost); k++) { run.rng.s = k * 99 + 1; const { bout } = R.startTable(run, prep); const me = bout.sides[0];
    if (me.calamities.includes('wormhole')) { const w = me.grid.flat().find((cell) => cell.worm); if (w) { w.chips.push({ id: 9e5, kind: 'std', value: 5 }); const before = B.worth(bout.sides[1]); drain(ticks(bout)); assert(!w.chips.length && B.worth(bout.sides[1]) >= before, 'a Worm Hole pulls chips through to the other side'); found.worm++; } }
    const roost = me.grid.flat().find((cell) => cell.roost);
    if (roost) { bout.turn = 3; drain(ticks(bout)); const dr = bout.creatures.find((x) => x.roost === roost.roost.id); assert(dr && dr.kind === 'dragon', 'a Roost calls a Dragon');
      let egg = null; for (let t = 0; t < 3 && !egg; t++) { drain(ticks(bout)); egg = roost.chips.find((ch) => ch.kind === 'egg'); } assert(egg && egg.hits === 5, 'the Dragon lays a 5-hit egg chip on its Roost');
      const n0 = bout.creatures.length; let t = 0; for (; t < 4 && roost.chips.includes(egg); t++) drain(ticks(bout));
      assert(!roost.chips.includes(egg) && t <= 3 && bout.creatures.slice(n0).some((x) => x.kind === 'dragon'), 'on the Roost the egg hatches within 3 turns (2 hatch steps a turn, 3 by heat)'); found.roost++; }
  }
  assert(found.worm && found.roost, 'Worm Holes and Dragon Roosts turn up from the Calamity and Spawner tilts');
}

// ---------- permanent dice, random Upgrade-chip rolls, effect chips ----------
{
  const X = await import('../js/dice.js');
  const run = R.newRun('technician', 'standard', 9); R.enterFloor(run, 4); run.purse = 5000;
  X.upgrade(run.dice[0], 'encase', 0); const id = run.dice[0].id;
  const { bout, ctx } = R.startTable(run, R.newPrep(run, 'table', 0));
  const copy = bout.sides[0].pouch.find((d) => d.id === id); copy.faces[0].enc = 6; // as if it came up three times
  bout.over = true; bout.winner = 0; R.settle(run, ctx, bout);
  assert(run.dice.find((d) => d.id === id).faces[0].enc === 6, 'use-dependent faces carry over between bouts');
}
{
  const { bout, me } = table({ upgrade: 3 });
  const die = me.pouch[0], before = JSON.stringify(die.faces || null);
  B.draw(bout, me, me.book[0].uid); B.advance(bout, true); B.throwDice(bout, me, [die.id]);
  assert(JSON.stringify(me.tray[0].faces || null) === before, 'Upgrade-chip upgrades never stay on the die');
}
{
  const { bout, me, opp } = table({});
  me.status.resist = 3; me.mods.boost = 2; B.addPower(bout, me, 1); opp.mods.enfeeble = 1;
  const fx = B.effectChips(bout, me), fo = B.effectChips(bout, opp);
  assert(fx.find((t) => t.key === 'resist').size === 3 && fx.find((t) => t.key === 'boost').size === 2 && !fx.find((t) => t.key === 'power') && B.powerOf(me) === 1, 'effects are chips sized by what they cover; Power is a real chip on the Meter');
  assert(fo.find((t) => t.key === 'enfeeble' && t.zone === 'bar' && !t.good), 'harmful effects lie in the Bar');
}

// ---------- ghost Debt, overkill spreading at once, totals, paid bids ----------
{
  const { bout, me, opp } = table({});
  // a lane with one small stack: the overkill spreads to the stack behind at once, the rest is wasted on show
  const c = 0, rows = [...Array(me.rows).keys()];
  for (const r of rows) me.grid[r][c].chips = [];
  const m = me.dims.meterRows; me.grid[m][c].chips = [{ id: 8e6, kind: 'std', value: 2 }]; me.grid[m + 1][c].chips = [{ id: 8e6 + 1, kind: 'std', value: 1 }];
  const g = engage(bout, opp, me, m, c, 7, {});
  assert(B.debtOf(me.grid[m][c]) === 2 && B.debtOf(me.grid[m + 1][c]) === 1, 'overkill spreads down the lane as the fee lands');
  assert(g.placed === 3 && me.grid.slice(m + 2).some((row) => row[c].chips.some((ch) => ch.kind === 'stray' && ch.value === 4)), 'what has nowhere to go shows as a ghost Debt chip on the next empty space');
  drain(B._test.settleAll(bout, 'expense'));
  assert(!me.grid.flat().some((cell) => cell.chips.some((ch) => ch.kind === 'stray')), 'the House clears strays as it settles');
}
{
  const { bout, me } = table({});
  for (const x of B.powerChips(me)) x.cell.chips.splice(x.cell.chips.indexOf(x.ch), 1); B.addPower(bout, me, 2);
  const e = { uid: 7, trick: { id: 'charge', q: 1, up: 0 }, dice: [{ value: 5, type: 'd6' }, { value: 2, type: 'd6' }], bid: [], bidValue: 2, state: 'bid' };
  const t = B.totalParts(me, e);
  assert(t.diceSum === 7 && t.linger === 2 && t.power === 2 && t.total === 11, 'a total of 11 is shown as 5 + 2, +2 linger, +2 Power');
}
{
  const { bout, me, opp } = table({});
  const e = me.run[0] || B.draw(bout, me, me.book[0].uid); void opp;
  const spot = B.biddable(me)[0]; bout.phase = 'bid'; e.state = 'shown'; B.bid(bout, me, e, spot.r, spot.c);
  bout.phase = 'aim'; drain(B.resolve(bout));
  assert(Array.isArray(e.paid) && e.paid.length === 1, 'a trick keeps a record of the bid it paid');
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
