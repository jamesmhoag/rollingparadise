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
  ok(B.fits(me, x.cell, chip('pushy', { immune: ['blocks'] })), 'a chip immune to blocking goes on a closed stack'); }
// footprints: a big chip claims n×n empty spaces and frees them when it goes
{ for (const x of cells()) { x.cell.chips = []; delete x.cell.link; delete x.cell.anchor; delete x.cell.hole; }
  B.sandboxChip(bout, 0, 1, 1, { made: chip('slab', { foot: 'large' }).model }, 'add');
  const anchor = cells().find((x) => x.cell.anchor), links = cells().filter((x) => x.cell.link);
  ok(anchor && anchor.cell.anchor.n === 3 && links.length === 8, `a Large chip covers 3×3 spaces (${links.length} linked)`);
  ok(!B.sandboxChip(bout, 0, anchor.r + 1, anchor.c + 1, { kind: 'std', value: 1 }, 'add'), 'nothing goes on a space a big chip covers');
  ok(!B.sandboxChip(bout, 0, 0, 0, { made: chip('slab2', { foot: 'huge' }).model }, 'add'), 'a Huge chip needs 5×5 empty spaces');
  anchor.cell.chips = []; drain(B.resolve(bout));
  ok(!cells().some((x) => x.cell.link || x.cell.anchor?.n), 'its spaces are freed when it goes'); }
// a Sticky chip stops made chips on its stack, unless they are immune to blocking
{ const x = stackOf(2); const pl = chip('pusher', { triggers: [{ on: 'turn' }], actions: [{ k: 'value', n: 1 }], reach: { to: 'touching', range: 1 } });
  x.cell.chips.push(pl, { id: 7e6, kind: 'sticky', value: 1 }); const v = x.cell.chips[1].value;
  drain(B._test.madeWork(bout, me, 'turn', [])); ok(x.cell.chips[1].value === v, 'a glued made chip does nothing');
  D.MADE_CHIPS.pusher.immune = ['blocks']; drain(B._test.madeWork(bout, me, 'turn', [])); ok(x.cell.chips[1].value === v + 1, 'immune to blocking, it works anyway'); }
if (fails.length) { console.log('FAIL ' + fails.join('\nFAIL ')); process.exit(1); }
console.log('ok, chip terms: height rules, big footprints, no height cap and blocking immunity');
