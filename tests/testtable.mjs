// The test table: a throwaway bout with your choice of hero, tricks, dice and opponent; a sandbox that never ends;
// chips added, changed and removed by hand.
import * as R from '../js/run.js'; import * as B from '../js/bout.js'; import * as D from '../js/data.js';
import { autoTurn } from '../js/ai.js';
import { NEW_CHIP } from '../js/content/chipmaker.js';

const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const drain = (g) => { for (const _ of g); }; // eslint-disable-line no-unused-vars
{ const { bout, ctx } = R.testTable({ cls: 'rascal', floor: 3, tricks: ['charge', 'block'], q: 2, dice: { d8: 4, d12: 1 }, purse: 300, roster: 'gold_bar', rules: false });
  const me = bout.sides[0], o = bout.sides[1];
  ok(ctx.kind === 'test' && ctx.sandbox && bout.rules.sandbox, 'a sandbox test bout');
  ok(me.cls === 'rascal' && me.book.map((t) => t.id).sort().join() === 'block,charge' && me.book.every((t) => t.q === 2), 'the hero has the chosen class and tricks');
  ok(me.pouch.map((d) => d.type).sort().join() === 'd12,d8,d8,d8,d8', 'and the chosen dice');
  ok(o.name === 'Gold Bar', 'the chosen opponent sits across');
  // chips by hand
  const m = o.dims.meterRows, x = { r: m, c: 0 }, cell = o.grid[m][0], n0 = cell.chips.filter((ch) => !B.isHazard(ch)).length;
  ok(B.sandboxChip(bout, 1, x.r, x.c, { kind: 'burn' }, 'add') && cell.chips.some((ch) => ch.kind === 'burn'), 'add a hazard');
  ok(B.sandboxChip(bout, 1, x.r, x.c, { kind: 'debt', value: 3 }, 'add') && B.debtOf(cell) === 3, 'add Debt');
  ok(B.sandboxChip(bout, 1, x.r, x.c, { kind: 'block' }, 'change') && cell.chips.filter((ch) => !B.isHazard(ch)).at(-1).kind === 'block', 'change the top chip');
  D.MADE_CHIPS.t_gem = { ...NEW_CHIP, name: 'Gem', value: 9 };
  ok(B.sandboxChip(bout, 1, x.r, x.c, { made: 't_gem' }, 'change') && cell.chips.some((ch) => ch.model === 't_gem'), 'change it into a made chip');
  ok(B.sandboxChip(bout, 1, x.r, x.c, { shop: 'reducer' }, 'change') && cell.chips.some((ch) => ch.shop === 'reducer'), 'or an effect chip');
  ok(B.sandboxChip(bout, 1, x.r, x.c, null, 'remove') && cell.chips.filter((ch) => !B.isHazard(ch)).length === n0 - 1, 'remove the top chip');
  delete D.MADE_CHIPS.t_gem;
  // a sandbox does not end, even when a side is broke
  for (const row of o.grid) for (const c of row) c.chips = [];
  autoTurn(bout); drain(B.resolve(bout)); ok(!bout.over, 'a sandbox bout goes on when a Roller is broke');
}
{ const { bout } = R.testTable({ cls: 'hustler', floor: 1, tricks: ['charge'], rules: true });
  for (const row of bout.sides[1].grid) for (const c of row) c.chips = [];
  autoTurn(bout); drain(B.resolve(bout)); ok(bout.over, 'with match rules a broke Roller ends the bout');
}
if (fails.length) { console.log('FAIL ' + fails.join('\nFAIL ')); process.exit(1); }
console.log('ok, test table: hero, opponent, sandbox and chips by hand');
