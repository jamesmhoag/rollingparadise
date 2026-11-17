// Made chips at work: triggers, reach, actions (row 10) and movement.
import * as R from '../js/run.js'; import * as B from '../js/bout.js'; import * as D from '../js/data.js';
import { NEW_CHIP } from '../js/content/chipmaker.js';

const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const drain = (g) => { for (const _ of g); }; // eslint-disable-line no-unused-vars
const { madeWork, placeMade } = B._test;
const chip = (id, over) => { D.MADE_CHIPS[id] = { ...JSON.parse(JSON.stringify(NEW_CHIP)), ...over }; return id; };
function table(seed = 9) { const run = R.newRun('technician', 'standard', seed); R.enterFloor(run, 4); run.purse = 5000; const { bout } = R.startTable(run, R.newPrep(run, 'table', 0)); return { bout, me: bout.sides[0] }; }
// a cleared row of the Bar with one 5¢ chip at column c, for tidy tests
function row(s, cols = [1]) { const r = s.dims.meterRows; for (const cell of s.grid[r]) cell.chips = []; for (const c of cols) s.grid[r][c].chips = [{ id: 7e6 + c, kind: 'std', value: 5 }]; return r; }

{ // each turn: +2 value to the chip it touches
  const { bout, me } = table(), r = row(me); chip('miner', { triggers: [{ on: 'turn' }], actions: [{ k: 'value', n: 2 }], reach: { to: 'touching', range: 1 } });
  me.grid[r][1].chips.push(B.mkMade(bout, 'miner')); drain(madeWork(bout, me, 'turn', false));
  ok(me.grid[r][1].chips[0].value === 7, 'a turn trigger raises the value of the chip it touches');
}
{ // move action: pushes the touching chip one space right
  const { bout, me } = table(), r = row(me); chip('shove', { triggers: [{ on: 'turn' }], actions: [{ k: 'move', dir: 'right' }] });
  me.grid[r][1].chips.push(B.mkMade(bout, 'shove')); drain(madeWork(bout, me, 'turn', false));
  ok(me.grid[r][2].chips.some((ch) => ch.kind === 'std'), 'a move action pushes the touching chip to the right');
}
{ // immune to moves: stays put
  const { bout, me } = table(), r = row(me); chip('shove2', { triggers: [{ on: 'turn' }], actions: [{ k: 'move', dir: 'right' }] }); chip('rock', { immune: ['moves'] });
  me.grid[r][1].chips = [B.mkMade(bout, 'rock'), B.mkMade(bout, 'shove2')]; drain(madeWork(bout, me, 'turn', false));
  ok(me.grid[r][1].chips.some((ch) => ch.model === 'rock'), 'a chip immune to moves is not moved');
}
{ // become: turns its neighbour into a Block chip, in a phase
  const { bout, me } = table(), r = row(me); chip('alch', { triggers: [{ on: 'phase', type: 'correction' }], actions: [{ k: 'become', chip: 'block' }] });
  me.grid[r][1].chips.push(B.mkMade(bout, 'alch')); drain(madeWork(bout, me, 'investment', true));
  ok(me.grid[r][1].chips[0].kind === 'std', 'a phase trigger waits for its phase');
  drain(madeWork(bout, me, 'correction', false)); ok(me.grid[r][1].chips[0].kind === 'block', 'become turns the chip into another kind');
}
{ // reach: all of mine, by name
  const { bout, me } = table(), r = row(me, [0, 3]); chip('king', { triggers: [{ on: 'turn' }], actions: [{ k: 'value', n: 1 }], reach: { to: 'named', name: 'Royal Paradise chip', range: 5 } });
  me.grid[r][1].chips = [B.mkMade(bout, 'king')]; drain(madeWork(bout, me, 'turn', false));
  ok(me.grid[r][0].chips[0].value === 6 && me.grid[r][3].chips[0].value === 6, 'a named reach finds those chips across the position');
}
{ // removed trigger
  const { bout, me } = table(), r = row(me, [0]); chip('martyr', { triggers: [{ on: 'removed' }], actions: [{ k: 'value', n: 10 }], reach: { to: 'yours' } });
  me.grid[r][1].chips = [B.mkMade(bout, 'martyr')]; drain(madeWork(bout, me, 'turn', false));
  me.grid[r][1].chips = []; drain(madeWork(bout, me, 'turn', false));
  ok(me.grid[r][0].chips[0].value === 15, 'a removed trigger fires after the chip is gone');
}
{ // creature: steps toward the richest stack
  const { bout, me } = table(), r = row(me, [3]); me.grid[r][3].chips[0].value = 999; chip('rat', { move: 'richest' });
  const rat = B.mkMade(bout, 'rat'); me.grid[r][0].chips = [{ id: 6e6, kind: 'std', value: 1 }, rat];
  drain(madeWork(bout, me, 'turn', false)); ok(me.grid[r][1].chips.includes(rat), 'a creature chip steps toward the richest stack');
}
{ // sandwiched placement needs two chips
  const { bout, me } = table(), r = row(me); chip('ham', { must: 'sandwiched' });
  ok(!placeMade(me.grid[r][1], B.mkMade(bout, 'ham'), 'over'), 'a sandwiched chip needs a chip above and below');
  me.grid[r][1].chips.push({ id: 6e6 + 1, kind: 'std', value: 1 }); ok(placeMade(me.grid[r][1], B.mkMade(bout, 'ham'), 'over') && me.grid[r][1].chips[1].model === 'ham', 'and goes between them');
}
if (fails.length) { console.log('FAIL ' + fails.join('\nFAIL ')); process.exit(1); }
console.log('ok, chip work: triggers, reach, actions and movement');
