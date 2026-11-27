// Headless checks: AI-vs-AI bouts on every floor, then whole runs played by the AI.
import * as R from '../js/run.js';
import * as B from '../js/bout.js';
import { autoTurn } from '../js/ai.js';
import * as D from '../js/data.js';
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exit(1); } };

function playBout(bout) {
  let steps = 0;
  while (!bout.over) {
    autoTurn(bout);
    for (const st of B.resolve(bout)) { steps++; if (steps > 20000) throw new Error('runaway bout'); }
    check(bout);
  }
  return bout;
}
function check(bout) {
  const ids = new Set();
  for (const s of bout.sides) {
    for (const row of s.grid) for (const cell of row) {
      if (cell.hole && cell.chips.length) throw new Error('chips on a hole');
      if (B.solidCount(cell) > s.dims.stackMax) throw new Error(`stack too tall ${B.solidCount(cell)}/${s.dims.stackMax}`);
      const firstHaz = cell.chips.findIndex(B.isHazard);
      if (firstHaz >= 0 && cell.chips.slice(firstHaz).some((ch) => !B.isHazard(ch))) throw new Error('hazard under a chip');
      for (const ch of cell.chips) { if (ids.has(ch.id)) throw new Error('duplicate chip'); ids.add(ch.id); }
    }
    const total = s.book.length + s.run.length + s.tapped.tricks.length; if (total !== s._tricks) throw new Error('trick lost'); // tapped tricks wait to be restored
    const dice = s.pouch.length + s.tapped.dice.length + s.tray.filter((d) => !d.chip).length + s.run.reduce((n, e) => n + e.dice.filter((d) => !d.chip).length, 0); // dice left in the roll stay there if (dice !== s._dice) throw new Error('die lost');
  }
  if (bout.stage.paid.some((v) => v < 0)) throw new Error('negative stage');
}
const tag = (bout) => { for (const s of bout.sides) { s._tricks = s.book.length; s._dice = s.pouch.length; } return bout; };

let runs = 0, crowns = 0, floors = [0, 0, 0, 0, 0, 0], turnSum = 0, bouts = 0, wins = 0;
for (let seed = 1; seed <= 60; seed++) {
  const cls = Object.keys(D.CLASSES)[seed % 3];
  const run = R.newRun(cls, 'standard', seed * 7919);
  const meta = R.loadMeta();
  const fight = (start) => { const { bout, ctx } = start; playBout(tag(bout)); const res = R.settle(run, ctx, bout); bouts++; turnSum += bout.turn; if (res.win) wins++; if (res.prizes) R.claimPrize(run, ctx, res, 'die', [0]); return res; };
  let guard = 0; while (!fight(R.startIntro(run)).win && guard++ < 20);
  let alive = true;
  for (let f = 1; f <= 4 && alive; f++) {
    R.enterFloor(run, f);
    if (run.pendingCard) R.resolvePending(run, R.walletCards(run)[0]);
    if (run.pass < f) throw new Error(`no pass for floor ${f}`);
    // shop a little
    for (const it of run.fs.shop) if (run.purse > it.cost * 3) R.buyTrick(run, it.key);
    for (let q = 4; q >= 1; q--) if (R.packOpen(run, q) && run.purse > R.packCost(run, q) * 4) { R.buyPack(run, q); break; }
    R.buyDrink(run, run.fs.lounge.drinks[0].id); R.searchFloor(run);
    if (run.purse > 50) R.placeBet(run, run.fs.book.events[0].key, 0, run.fs.book.min);
    const path = [0, 1 + (seed % 2)];
    for (let k = 0; k < 2 && alive; k++) {
      const i = path[k], prep = R.newPrep(run, 'table', i); if (run.purse > 400) { R.setTilt(run, prep, 'hazard', true); R.setTilt(run, prep, 'creature', true); }
      if (k === 1 && run.fs.lastWin) prep.dd = true;
      run.plan.counts = null;
      if (!R.canAfford(run, 'table', i)) { assert(R.stranded(run), 'a table you cannot afford, with nothing else to play: shown the door'); alive = false; break; }
      const before = run.purse, w = R.wagerOf(run, 'table', i);
      const start = R.startTable(run, prep); assert(start.ctx.wager === w && start.ctx.kept === before - w - start.ctx.committed && start.ctx.kept >= 0, 'a table takes its own wager; the rest is your Stake or stays in your purse');
      const res = fight(start);
      if (!res.win) assert(run.purse >= start.ctx.kept, 'a loss leaves what you kept in your purse');
      assert(!R.tableOpen(run, i), 'a table is played once, win or lose');
      assert(k > 0 || (R.tableOpen(run, 1) && R.tableOpen(run, 2)), 'playing table 1 opens tables 2 and 3');
      if (guard++ > 400) throw new Error('stuck');
    }
    if (alive) assert(R.bossReady(run) && !R.tableOpen(run, 3 - path[1]), 'playing one of tables 2 and 3 closes the other and brings out the High Roller');
    if (alive && !R.canAfford(run, 'boss')) alive = false;
    if (alive) { const start = R.startTable(run, R.newPrep(run, 'boss')); assert(start.ctx.allIn && start.ctx.kept === 0 && start.ctx.wager === run.purse - start.ctx.committed, 'the High Roller is played all in');
      const res = fight(start); assert(R.stairsOpen(run), 'the stairs open once the High Roller is played');
      if (!res.win) { assert(R.climbAfterLoss(run) === (f < 4 ? 'floor' : null), 'a lost High Roller still lets you climb, but not into the Penthouse'); if (f >= 4 || run.purse <= 0) alive = false; } }
    if (alive && run.fs.boss.beaten && R.nextAfterBoss(run) === 'suite') { R.suiteOffer(run); R.goToBed(run, false); }
    if (alive) floors[f]++;
  }
  if (alive && run.fs.boss.beaten) {
    R.buildAscent(run, meta);
    while (run.phase === 'ascent') fight(R.startAscent(run));
    if (run.phase === 'paradise') crowns++;
    floors[5]++;
  }
  JSON.stringify({ ...run, rng: run.rng.s });
  runs++;
}
console.log(`runs ${runs} | cleared floors 1-4: ${floors.slice(1, 5).join(' ')} | reached ascent ${floors[5]} | crowns ${crowns}`);
console.log(`bouts ${bouts} | win rate ${(wins / bouts * 100).toFixed(0)}% | avg turns ${(turnSum / bouts).toFixed(1)}`);
console.log('ok');
