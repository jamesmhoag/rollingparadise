// Runs an audit suite across worker threads and writes one JSON line per run.
// node tests/audit/run.mjs <boards|strategies> <runsPerClass> <out.jsonl>
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { writeFileSync, appendFileSync } from 'node:fs';
import { cpus } from 'node:os';

const CLASSES = ['hustler', 'rascal', 'technician'];
// "standard": a sensible all-round player. Every buy-pattern and one-variable test is measured against it.
export const STANDARD = { buy: ['drink', 'tricks', 'upgrades'], frac: 0.5 };

export const BOARDS = [];
for (const cols of [5, 4, 3]) for (const [v, mods] of [['base', {}], ['bar-1', { barRows: 2 }], ['height-1', { stackMax: 2 }], ['both-1', { barRows: 2, stackMax: 2 }]])
  BOARDS.push({ name: `cols ${cols} · ${v}`, board: { cols, ...mods }, strat: STANDARD });

const S = (name, group, over) => ({ name, group, strat: { ...STANDARD, ...over } });
export const STRATEGIES = [
  // A. buy patterns: same play, same 50% budget, only what is bought changes
  S('standard (drink + tricks + trick upgrades)', 'A', {}),
  S('buy nothing', 'A', { buy: [] }),
  S('tricks only', 'A', { buy: ['tricks'] }),
  S('tricks + restocks', 'A', { buy: ['tricks', 'restock'] }),
  S('trick upgrades only', 'A', { buy: ['upgrades'] }),
  S('forge dice only', 'A', { buy: ['forge'] }),
  S('die upgrades only', 'A', { buy: ['dieUpgrades'] }),
  S('drinks only', 'A', { buy: ['drink'] }),
  S('shop chips only (defence/power mix)', 'A', { buy: [['chip', ['little', 'clay', 'reducer', 'power', 'control', 'nest']]] }),
  S('food chips only', 'A', { buy: [['chip', ['chocolate', 'chipchip', 'bun', 'honey', 'hamburger']]] }),
  S('sports bets only', 'A', { buy: ['bets'] }),
  S('everything (round robin)', 'A', { buy: ['drink', 'tricks', 'upgrades', 'forge', 'dieUpgrades', ['chip', ['little', 'clay', 'reducer', 'power', 'control', 'nest']]] }),
  // B. one variable added to standard
  S('+ budget 25% (was 50%)', 'B', { frac: 0.25 }),
  S('+ budget 90% (was 50%)', 'B', { frac: 0.9 }),
  S('+ forge dice', 'B', { buy: [...STANDARD.buy, 'forge'] }),
  S('+ die upgrades', 'B', { buy: [...STANDARD.buy, 'dieUpgrades'] }),
  S('+ restock the Trader', 'B', { buy: [...STANDARD.buy, 'restock'] }),
  S('+ sports bets', 'B', { buy: [...STANDARD.buy, 'bets'] }),
  ...['little', 'clay', 'reducer', 'power', 'control', 'nest', 'seed', 'shadow', 'zap', 'anchor', 'boosted', 'cheapened', 'lucky', 'rebound', 'transpara', 'harmony', 'ward', 'chocolate', 'honey', 'hamburger']
    .map((id) => S(`+ ${id} chips`, 'B', { buy: [...STANDARD.buy, ['chip', [id], 0.2]] })),
  ...['hazard', 'creature', 'spawner', 'calamity'].map((t) => S(`+ ${t} tilt (challenge)`, 'B', { tilts: { [t]: 1 } })),
  ...['shield', 'familiar', 'position', 'intervention'].map((t) => S(`+ ${t} tilt (cheat)`, 'B', { tilts: { [t]: 1 } })),
  S('+ Double Down on table 2/3', 'B', { dd: true }),
  S('+ challenge the barfly each floor', 'B', { barfly: true }),
  S('+ prize: two dice (no bonus)', 'B', { prize: 'dice' }),
  S('+ prize: glean a trick (no bonus)', 'B', { prize: 'glean' }),
  S('+ no selling after a loss', 'B', { sellDown: false }),
  ...['long', 'leather', 'bomber'].map((j) => S(`+ ${j} jacket`, 'B', { jacket: j })),
  S('+ deploy by column', 'B', { plan: { spacing: 'column' } }),
  S('+ balanced stacks', 'B', { plan: { stacking: 'balanced' } }),
  S('+ play: draw to max', 'B', { knobs: { draw: 'max' } }),
  S('+ play: draw one (bank Conviction)', 'B', { knobs: { draw: 'one' } }),
  S('+ play: roll one (bank Cunning)', 'B', { knobs: { roll: 'one' } }),
  S('+ play: flip chips to fill rolls', 'B', { knobs: { roll: 'flip' } }),
  S('+ play: bid every bid', 'B', { knobs: { bid: 'all' } }),
  S('+ play: bid one (bank Charisma)', 'B', { knobs: { bid: 'one' } }),
];

// C. the same add-ons, bought FIRST each shop visit so the extra item is not starved by the standard buys
export const PRIORITY = [
  ...['forge', 'dieUpgrades', 'restock', 'bets'].map((x) => S(`first: ${x}`, 'C', { buy: [x, ...STANDARD.buy] })),
  ...['little', 'clay', 'reducer', 'power', 'control', 'nest', 'seed', 'shadow', 'zap', 'anchor', 'boosted', 'cheapened', 'lucky', 'rebound', 'transpara', 'harmony', 'ward', 'chocolate', 'chipchip', 'bun', 'honey', 'hamburger']
    .map((id) => S(`first: ${id} chips`, 'C', { buy: [['chip', [id], 0.2], ...STANDARD.buy] })),
];

if (isMainThread) {
  const [suite, nArg, out] = process.argv.slice(2);
  const N = +nArg || 100, list = suite === 'boards' ? BOARDS : suite === 'priority' ? PRIORITY : STRATEGIES;
  const jobs = [];
  for (const x of list) for (const cls of CLASSES) for (let k = 0; k < N; k += 25)
    jobs.push({ name: x.name, group: x.group || '', board: x.board || {}, strat: x.strat, cls, seeds: Array.from({ length: Math.min(25, N - k) }, (_, i) => (k + i + 1) * 7919 + 13) });
  writeFileSync(out, '');
  let next = 0, done = 0; const t0 = Date.now();
  const nW = Math.max(1, cpus().length);
  await Promise.all(Array.from({ length: nW }, () => new Promise((resolve, reject) => {
    const w = new Worker(new URL(import.meta.url), { workerData: {} });
    const feed = () => { if (next >= jobs.length) { w.terminate(); resolve(); } else w.postMessage(jobs[next++]); };
    w.on('message', (rows) => { appendFileSync(out, rows.map((r) => JSON.stringify(r)).join('\n') + '\n'); done++;
      if (done % 20 === 0) console.log(`${done}/${jobs.length} jobs · ${((Date.now() - t0) / 1000).toFixed(0)}s`); feed(); });
    w.on('error', reject); feed();
  })));
  console.log('done', jobs.length, 'jobs in', ((Date.now() - t0) / 1000).toFixed(0), 's');
} else {
  const { runOne, setBoard } = await import('./lib.mjs');
  parentPort.on('message', (job) => {
    setBoard(job.board);
    const rows = job.seeds.map((seed) => {
      try { const m = runOne(job.cls, seed, job.strat); return { name: job.name, group: job.group, ...m }; }
      catch (e) { return { name: job.name, group: job.group, cls: job.cls, seed, error: String(e.stack || e).slice(0, 300) }; }
    });
    parentPort.postMessage(rows);
  });
}
