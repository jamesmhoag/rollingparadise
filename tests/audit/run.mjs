// Runs an audit suite across worker threads and writes one JSON line per run.
// node tests/audit/run.mjs <boards|strategies|priority|all> <runsPerClass> <out.jsonl>
// Combinations are searched by combos.mjs, which uses runSuite below.
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { writeFileSync, appendFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { STANDARD, PATTERNS, LEVERS, compose } from './levers.mjs';

export const CLASSES = ['hustler', 'rascal', 'technician'];
export { STANDARD };

export const BOARDS = [];
for (const cols of [5, 4, 3]) for (const [v, mods] of [['base', {}], ['bar-1', { barRows: 2 }], ['height-1', { stackMax: 2 }], ['both-1', { barRows: 2, stackMax: 2 }]])
  BOARDS.push({ name: `cols ${cols} · ${v}`, board: { cols, ...mods }, strat: STANDARD });

// A. buy patterns, B. one play or table change, C. one shop add-on bought first
export const STRATEGIES = [
  ...PATTERNS.map(([name, over]) => ({ name, group: 'A', strat: { ...STANDARD, ...over } })),
  ...LEVERS.filter((l) => l.group === 'B').map((l) => ({ name: `+ ${l.name}`, group: 'B', strat: compose({}, [l.name]), only: l.only })),
];
export const PRIORITY = LEVERS.filter((l) => l.group === 'C').map((l) => ({ name: `+ ${l.name}`, group: 'C', strat: compose({}, [l.name]), only: l.only }));
// the same seeds for every scenario, so differences come from the change, not the dice
export const seedOf = (i) => (i + 1) * 7919 + 13;

export async function runSuite(list, N, out, { append = false, quiet = false } = {}) {
  const jobs = [];
  for (const x of list) for (const cls of x.only || CLASSES) for (let k = 0; k < N; k += 25)
    jobs.push({ name: x.name, group: x.group || '', board: x.board || {}, strat: x.strat, cls, seeds: Array.from({ length: Math.min(25, N - k) }, (_, i) => seedOf(k + i)) });
  if (!append) writeFileSync(out, '');
  let next = 0, done = 0; const t0 = Date.now();
  const nW = Math.max(1, cpus().length);
  await Promise.all(Array.from({ length: Math.min(nW, jobs.length) }, () => new Promise((resolve, reject) => {
    const w = new Worker(new URL(import.meta.url));
    const feed = () => { if (next >= jobs.length) { w.terminate(); resolve(); } else w.postMessage(jobs[next++]); };
    w.on('message', (rows) => { appendFileSync(out, rows.map((r) => JSON.stringify(r)).join('\n') + '\n'); done++;
      if (!quiet && done % 40 === 0) console.log(`${done}/${jobs.length} jobs · ${((Date.now() - t0) / 1000).toFixed(0)}s`); feed(); });
    w.on('error', reject); feed();
  })));
  if (!quiet) console.log('done', jobs.length, 'jobs in', ((Date.now() - t0) / 1000).toFixed(0), 's');
}

if (isMainThread && process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const [suite, nArg, out] = process.argv.slice(2);
  const N = +nArg || 100;
  const list = { boards: BOARDS, strategies: STRATEGIES, priority: PRIORITY, all: [...STRATEGIES, ...PRIORITY] }[suite];
  if (!list) throw new Error(`unknown suite ${suite}`);
  await runSuite(list, N, out);
} else if (!isMainThread) {
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
