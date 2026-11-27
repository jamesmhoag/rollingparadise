// The chip maker's last terms in play: height rules, footprints bigger than one space, 'anything on top' and
// immunity to blocking.
import * as R from '../js/run.js'; import * as B from '../js/bout.js'; import * as D from '../js/data.js';
import { NEW_CHIP } from '../js/content/chipmaker.js';
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const drain = (g) => { for (const _ of g); }; // eslint-disable-line no-unused-vars
const run = R.newRun('technician', 'standard', 21); R.enterFloor(run, 3); run.purse = 2000;
const { bout } = R.startTable(run, R.newPrep(run, 'table', 0)), me = bout.sides[0];
const cells = () => me.grid.flatMap((row, r) => row.map((cell, c) => ({ r, c, cell })));
const chip = (id, over) => { D.MADE_CHIPS[id] = { ...JSON.parse(JSON.stringify(NEW_CHIP)), name: id, ...over }; return { id: Math.round(Math.random() * 1e9), kind: 'made', model: id, value: over.value ?? 0 }; };
const max = me.dims.stackMax;
const stackOf = (n) => { const x = cells().find((y) => !y.cell.hole && !y.cell.link && !y.cell.anchor); x.cell.chips = Array.from({ length: n }, (_, i) => ({ id: 5e6 + i + n * 100, kind: 'std', value: 1 })); return x; };

// height: half-height over the cap does not fit; no thickness and flying always do
{ const x = stackOf(max);
  ok(!B.fits(me, x.cell, chip('half', { height: 'short' })), 'a half-height chip on a full stack does not fit');
  ok(B.fits(me, x.cell, chip('none', { height: 'tiny' })), 'a chip with no thickness fits on a full stack');
  ok(B.fits(me, x.cell, chip('bird', { move: 'flying' })), 'a flying chip fits over the height cap');
  x.cell.chips.pop(); ok(B.fits(me, x.cell, chip('half2', { height: 'short' })), 'a half-height chip fits with half a chip of room');
  ok(!B.fits(me, x.cell, chip('tall', { height: 'tall' })), 'a tall chip needs two of room'); }
// anything on top: no height cap above it
{ const x = stackOf(max - 1); x.cell.chips.unshift(chip('open', { onTop: 'anything', height: 'tiny' }));
  ok(B.fits(me, x.cell, chip('more', {})) && B.capacityLeft(me, x.cell) > 1, "an 'anything on top' chip lifts the stack's height cap"); }
// closed stacks and blocking
{ const x = stackOf(1); x.cell.chips.push(chip('lid', { onTop: 'none' }));
  ok(!B.fits(me, x.cell, chip('plain', {})), 'a closed stack takes nothing');
  ok(!B.fits(me, x.cell, chip('pushy', { immune: ['blocks'] })), 'immunity to blocking does not open a closed stack');
  ok(!B.fits(me, x.cell, chip('flat', { height: 'tiny' })), 'not even a chip with no height goes on a closed stack');
  ok(B.fits(me, x.cell, chip('bird2', { move: 'flying' })), 'a flying chip hovers over a closed stack'); }
// nothing on top refuses Debt: a fee aimed at a closed stack is not laid at all
{ const opp = bout.sides[1], col = 2; for (let r = 0; r < opp.rows; r++) opp.grid[r][col].chips = [];
  const front = opp.grid[opp.dims.meterRows][col], back = opp.grid[opp.dims.meterRows + 1][col];
  front.chips = [{ id: 8e6, kind: 'std', value: 5 }, chip('lid2', { onTop: 'none' })]; back.chips = [{ id: 8e6 + 1, kind: 'std', value: 5 }];
  B._test.engage(bout, me, opp, opp.dims.meterRows, col, 3, {});
  ok(!front.chips.some((ch) => ch.kind === 'debt') && !back.chips.some((ch) => ch.kind === 'debt'), 'Debt cannot sit on a closed stack, and goes nowhere else'); }
// footprints: a big chip claims n×n empty spaces and frees them when it goes
{ for (const x of cells()) { x.cell.chips = []; delete x.cell.link; delete x.cell.anchor; delete x.cell.hole; }
  B.sandboxChip(bout, 0, 1, 1, { made: chip('slab', { foot: 'large' }).model }, 'add');
  const anchor = cells().find((x) => x.cell.anchor), links = cells().filter((x) => x.cell.link);
  ok(anchor && anchor.cell.anchor.n === 3 && links.length === 8, `a Large chip covers 3×3 spaces (${links.length} linked)`);
  ok(!B.sandboxChip(bout, 0, anchor.r + 1, anchor.c + 1, { kind: 'std', value: 1 }, 'add'), 'nothing goes on a space a big chip covers');
  ok(!B.sandboxChip(bout, 0, 0, 0, { made: chip('slab2', { foot: 'huge' }).model }, 'add'), 'a Huge chip needs 5×5 empty spaces');
  anchor.cell.chips = []; drain(B.resolve(bout));
  ok(!cells().some((x) => x.cell.link || x.cell.anchor?.n), 'its spaces are freed when it goes'); }
// immune to blocking: a Block chip on the other side stops a made chip's action (and is used up), unless immune
{ const opp = bout.sides[1], x = me.grid[me.dims.meterRows][0], y = opp.grid[opp.dims.meterRows][0];
  x.cell = x; y.chips = [{ id: 9e6, kind: 'std', value: 4 }, { id: 9e6 + 1, kind: 'block', value: 0 }];
  const hit = chip('jab', { actions: [{ k: 'value', n: -1 }] }), M = D.MADE_CHIPS.jab, tg = [{ ch: y.chips[0], x: { side: opp, cell: y, r: opp.dims.meterRows, c: 0 } }];
  ok(B._test.blockedBy(bout, me, tg[0], M) && !y.chips.some((ch) => ch.kind === 'block'), 'a Block chip stops the action and is used up');
  y.chips.push({ id: 9e6 + 2, kind: 'block', value: 0 }); M.immune = ['blocks'];
  ok(!B._test.blockedBy(bout, me, tg[0], M) && y.chips.some((ch) => ch.kind === 'block'), 'immune to blocking: the Block chip is ignored and the action applies'); void hit; }
// sticky: touching value chips where either is sticky combine into one
{ const x = stackOf(0); x.cell.chips = [{ id: 6e6, kind: 'std', value: 5 }, { id: 6e6 + 1, kind: 'std', value: 2, sticky: true }, { id: 6e6 + 2, kind: 'std', value: 1 }];
  B.bind(bout, x.cell); ok(x.cell.chips.length === 1 && x.cell.chips[0].value === 8 && x.cell.chips[0].sticky, `sticky chips bind the chips they touch into one (${x.cell.chips.map((c) => c.value)})`);
  x.cell.chips = [{ id: 6e6 + 3, kind: 'std', value: 5 }, { id: 6e6 + 5, kind: 'std', value: 1 }, { id: 6e6 + 6, kind: 'std', value: 1 }, { id: 6e6 + 4, kind: 'sticky', value: 3 }];
  B.bind(bout, x.cell); ok(x.cell.chips.map((c) => c.kind + c.value).join() === 'std7,sticky3', `a Sticky chip makes the chip it touches sticky, and the stack binds into one (${x.cell.chips.map((c) => c.kind + c.value)})`);
  x.cell.chips = [{ id: 6e6 + 7, kind: 'std', value: 3, wet: 1, frozen: true }, { id: 6e6 + 8, kind: 'std', value: 2 }];
  B.bind(bout, x.cell); ok(x.cell.chips.length === 1 && x.cell.chips[0].value === 5, 'a wet chip that freezes binds too');
  x.cell.chips = [{ id: 6e6 + 9, kind: 'std', value: 3, wet: 1 }, { id: 6e6 + 10, kind: 'std', value: 2 }];
  B.bind(bout, x.cell); ok(x.cell.chips.length === 2, 'wet alone does not bind');
  const glue = chip('gluey', { sticky: true, value: 2 }); glue.value = 2; x.cell.chips = [{ id: 6e6 + 11, kind: 'std', value: 3 }, glue];
  B.bind(bout, x.cell); ok(x.cell.chips.length === 1 && x.cell.chips[0].value === 5, 'a made chip with the Sticky term binds'); }
if (fails.length) { console.log('FAIL ' + fails.join('\nFAIL ')); process.exit(1); }
console.log('ok, chip terms: height rules, big footprints, no height cap and blocking immunity');
