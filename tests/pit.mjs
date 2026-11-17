// The Pit: every chip a Roller loses, kept as it was (value and order), fees as far as the Stage total holds them.
import * as R from '../js/run.js'; import * as B from '../js/bout.js';
import { autoTurn } from '../js/ai.js';
import * as D from '../js/data.js';
import { NEW_TRICK } from '../js/content/trickmaker.js';
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const drain = (g) => { for (const _ of g); }; // eslint-disable-line no-unused-vars
const run = R.newRun('rascal', 'standard', 11); R.enterFloor(run, 2); run.purse = 600;
const { bout } = R.startTable(run, R.newPrep(run, 'table', 0));
for (let k = 0; k < 4 && !bout.over; k++) { autoTurn(bout); drain(B.resolve(bout)); }
for (const si of [0, 1]) {
  const pit = B.pitOf(bout, si), fees = pit.filter((ch) => ch.from === 'fee'), bids = pit.filter((ch) => ch.from === 'bid');
  ok(pit.length > 0, `side ${si} has lost chips in the Pit`);
  ok(fees.reduce((t, ch) => t + ch.value, 0) <= bout.stage.paid[si], `side ${si}: the Pit's fees never exceed the Stage total`);
  ok(bids.reduce((t, ch) => t + ch.value, 0) === bout.sides[si].bidsPaid, `side ${si}: every bid the House took is in the Pit, at its value`);
  ok(pit.every((ch) => ch.value > 0 && ch.turn >= 1 && ch.id), `side ${si}: Pit chips keep their own value, id and turn`);
}
// ---------- pulling chips back out, only through tricks and chips ----------
{
  const r2 = R.newRun('rascal', 'standard', 12); R.enterFloor(r2, 2); r2.purse = 600;
  const { bout: b2 } = R.startTable(r2, R.newPrep(r2, 'table', 0));
  for (let k = 0; k < 5 && !b2.over; k++) { autoTurn(b2); drain(B.resolve(b2)); }
  const si = [0, 1].find((x) => B.pitOf(b2, x).some((ch) => ch.from === 'fee')) ?? 0, before = B.pitOf(b2, si).filter((ch) => ch.from === 'fee'), paid = b2.stage.paid[si];
  const top = before[before.length - 1], got = B.pullPit(b2, si, top.value);
  ok(got.length === 1 && got[0].id === top.id && got[0].value === top.value && got[0].kind === top.kind, 'pullPit takes the real chip, the newest first: same id, kind and value');
  ok(b2.stage.paid[si] === paid - top.value && !B.pitOf(b2, si).some((ch) => ch.id === top.id), 'the chip leaves the Pit and the Stage total');
  const small = B.pitOf(b2, si).filter((ch) => ch.from === 'fee'); const min = Math.min(...small.map((ch) => ch.value));
  ok(!small.length || B.pullPit(b2, si, min - 1).length === 0, 'whole chips only: nothing comes out for less than the smallest chip');
  // a made trick taking chips from your own Pit puts the real chips on your stacks
  const me = b2.sides[si], cells = me.grid.flatMap((row, r) => row.map((cell, c) => ({ r, c, cell }))), room = cells.find((x) => !x.cell.hole && !x.cell.link && x.cell.chips.length && B.capacityLeft(me, x.cell) > 0) || cells.find((x) => !x.cell.hole && !x.cell.link && B.capacityLeft(me, x.cell) > 0);
  const id = 't_pit'; D.TRICKS[id] = JSON.parse(JSON.stringify({ ...NEW_TRICK, type: 'correction', side: 'self', approach: 'any', roll: { ...NEW_TRICK.roll, chip: 'pit:mine', convert: 'lump', deploy: 'hit' } })); D.refreshDerived();
  const heldIds = new Set(B.pitOf(b2, si).filter((ch) => ch.from === 'fee').map((ch) => ch.id)), pitBefore = b2.stage.paid[si];
  const e = { uid: 93, trick: { id, q: 1 }, dice: [{ value: 6, type: 'd6' }, { value: 6, type: 'd6' }], bid: [], bidValue: 1, paid: [1], lingerTotal: 0, lingerLeft: 0, state: 'play', target: { side: si, r: room.r, c: room.c } };
  me.run.push(e); me.fz = { ...me.mods }; drain(B._test.play(b2, me, e));
  const back = cells.flatMap((x) => x.cell.chips).filter((ch) => heldIds.has(ch.id));
  ok(pitBefore === 0 || (back.length > 0 && b2.stage.paid[si] < pitBefore), `a 'from your Pit' trick lays the real lost chips back on the table (${back.length} back)`);
  // a made chip with a Pull action, fired on its trigger
  const opp = b2.sides[1 - si]; for (let k = 0; k < 3; k++) B._test.engage(b2, me, opp, opp.dims.meterRows, k, 3, {}); // put some of their chips in their Pit
  D.MADE_CHIPS.puller = { name: 'Puller', text: '', value: 0, hits: 0, source: 'trick', lasts: 'match', height: 'basic', foot: 'basic', must: 'any', onTop: 'fits', immune: [], triggers: [{ on: 'turn' }], actions: [{ k: 'pull', from: 'theirs', n: 10 }], reach: { to: 'touching', range: 1 } };
  const spot = cells.find((x) => !x.cell.hole && !x.cell.link && B.capacityLeft(me, x.cell) > 2), ch = { id: 9e6, kind: 'made', model: 'puller', value: 0 }; spot.cell.chips.push(ch);
  const theirs = b2.stage.paid[1 - si], n0 = spot.cell.chips.length;
  drain(B._test.madeWork(b2, me, 'turn', []));
  ok(theirs === 0 || (b2.stage.paid[1 - si] < theirs && spot.cell.chips.length > n0), 'a Pull action takes real chips out of the other Pit onto its stack');
}
bout.stage.paid[0] = 0; ok(B.pitOf(bout, 0).every((ch) => ch.from === 'bid'), 'fees taken back leave the Pit');
if (fails.length) { console.log('FAIL ' + fails.join('\nFAIL ')); process.exit(1); }
console.log('ok, the Pit: lost chips kept as they were');
