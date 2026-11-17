// The chip maker: made chips play by their terms, and every existing chip maps into the same terms.
import * as R from '../js/run.js'; import * as B from '../js/bout.js'; import * as D from '../js/data.js';
import { classicChips, asMade } from '../js/chipmodel.js';
import { CHIP_LIST } from '../js/chiplist.js';
import { NEW_CHIP } from '../js/content/chipmaker.js';
import { NEW_TRICK } from '../js/content/trickmaker.js';

const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const drain = (g) => { for (const _ of g); }; // eslint-disable-line no-unused-vars
const { engage, settleAll, ticks } = B._test;

// every chip on the workbook list maps into the maker's terms
const mapped = classicChips();
ok(mapped.length === CHIP_LIST.length && mapped.every((c) => c.name && c.lasts && c.source && c.height && c.must), 'every workbook chip is mapped');
ok(mapped.find((c) => /^Little/.test(c.name))?.height === 'tiny', 'Little chips map as tiny');
ok(mapped.find((c) => /^Clay/.test(c.name))?.lasts === 'hits', 'Clay maps as lasting until broken');
const copy = asMade(mapped[0]); ok(!copy.classic && !copy.engine && copy.name.endsWith('(made)'), 'a mapped chip copies into a made one');

const chip = (id, over) => { D.MADE_CHIPS[id] = { ...JSON.parse(JSON.stringify(NEW_CHIP)), ...over }; return id; };
function table(seed = 9) { const run = R.newRun('technician', 'standard', seed); R.enterFloor(run, 4); run.purse = 5000; const { bout } = R.startTable(run, R.newPrep(run, 'table', 0)); return { bout, me: bout.sides[0] }; }
const stack = (s) => { const x = s.grid.flatMap((row, r) => row.map((cell, c) => ({ r, c, cell }))).find((y) => y.r >= s.dims.meterRows && y.cell.chips.filter((ch) => ch.kind === 'std').length >= 1); x.cell.chips = [x.cell.chips.find((ch) => ch.kind === 'std')]; return x; };
const fee = (bout, s, x, amt) => { engage(bout, null, s, x.r, x.c, amt, {}); drain(settleAll(bout, 'expense')); };

{ // value, worth and paying
  const { bout, me } = table(), x = stack(me); chip('gem', { value: 5 }); const w = B.worth(me);
  x.cell.chips.push(B.mkMade(bout, 'gem')); ok(B.worth(me) === w + 5, 'a made chip with value counts toward Worth');
  fee(bout, me, x, 5); ok(!x.cell.chips.some((ch) => ch.model === 'gem'), 'a valued made chip pays a fee');
}
{ // negative value
  const { bout, me } = table(), x = stack(me); chip('curse', { value: -3, lasts: 'match' }); const w = B.worth(me);
  x.cell.chips.push(B.mkMade(bout, 'curse')); ok(B.worth(me) === w - 3, 'a negative chip takes from Worth');
}
{ // lasts the match: fees pass it by
  const { bout, me } = table(), x = stack(me); chip('relic', { value: 0, lasts: 'match' });
  const v = x.cell.chips[0].value; x.cell.chips.push(B.mkMade(bout, 'relic')); fee(bout, me, x, v);
  ok(x.cell.chips.some((ch) => ch.model === 'relic') && !x.cell.chips.some((ch) => ch.kind === 'std'), 'a match-long chip stays; the fee reaches the chip under it');
}
{ // strength: a whole fee per hit
  const { bout, me } = table(), x = stack(me); chip('wall', { value: 0, hits: 2, lasts: 'hits' });
  x.cell.chips.push(B.mkMade(bout, 'wall')); fee(bout, me, x, 4); fee(bout, me, x, 4);
  ok(!x.cell.chips.some((ch) => ch.model === 'wall') && x.cell.chips.some((ch) => ch.kind === 'std'), 'strength 2 blocks two whole fees, then breaks');
}
{ // height and what can go on top
  const { me } = table(), x = stack(me); chip('tower', { height: 'tall', onTop: 'none' });
  const before = B.capacityLeft(me, x.cell); x.cell.chips.push({ id: 9e6, kind: 'made', model: 'tower', value: 1 });
  ok(B.solidCount(x.cell) === 3 && B.capacityLeft(me, x.cell) === 0 && before >= 1, 'a tall chip takes two heights and closes its stack');
}
{ // immune to fire: a Burning chip goes out
  const { bout, me } = table(), x = stack(me); chip('asbestos', { immune: ['burn'] });
  const m = B.mkMade(bout, 'asbestos'); x.cell.chips = [m]; x.cell.chips.push({ id: 8e6, kind: 'burn', value: 0, life: 3 }); drain(ticks(bout));
  ok(x.cell.chips.includes(m) && !x.cell.chips.some((ch) => ch.kind === 'burn'), 'a fire-immune chip is not burned and puts the fire out');
}
{ // a made trick makes made chips
  const { bout, me } = table(), x = stack(me); chip('token', { value: 2, color: '#ff00ff' });
  D.TRICKS.t_token = JSON.parse(JSON.stringify({ ...NEW_TRICK, type: 'investment', side: 'self', approach: 'any', roll: { ...NEW_TRICK.roll, chip: 'token', convert: 'precise' }, bonus: { cond: 'over:99', k: 'double' } })); D.refreshDerived();
  const e = { uid: 5, trick: { id: 't_token', q: 1 }, dice: [{ value: 2, type: 'd6' }, { value: 3, type: 'd6' }], bid: [], bidValue: 1, paid: [1], lingerTotal: 0, lingerLeft: 0, state: 'play', target: { side: 0, r: x.r, c: x.c } };
  me.run.push(e); me.fz = { ...me.mods }; drain(B._test.play(bout, me, e));
  ok(x.cell.chips.filter((ch) => ch.model === 'token').length >= 1, 'the trick maker can make a made chip');
}
if (fails.length) { console.log('FAIL ' + fails.join('\nFAIL ')); process.exit(1); }
console.log('ok, chip maker: value, strength, lifespan, height, stacking, immunity, and the workbook mapped');
