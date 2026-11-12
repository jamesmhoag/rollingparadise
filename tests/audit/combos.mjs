// Combination search: stack the levers that helped on their own, per class, to look for the best way to play.
// node tests/audit/combos.mjs <singles.json> <runsPerCombo> <out-prefix>
//   singles.json: aggregate.mjs output of the strategies + priority suites (A patterns, B and C levers).
// Writes <out-prefix>.jsonl (every run) and <out-prefix>.json (the ranked view).
//
// Levers in different slots set different things (budget, a tilt, how many to draw, what to buy first...), so they
// are treated as independent and stacked. Each combination is still simulated in full: the view compares what it
// actually scored with what the singles would add up to, so any interaction shows up as the gap.
import { writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { runSuite } from './run.mjs';
import { summarize, readRows } from './aggregate.mjs';
import { STANDARD, PATTERNS, LEVERS, byName, compatible, compose } from './levers.mjs';

const [singlesFile, nArg, prefix] = process.argv.slice(2);
const N = +nArg || 150, OUT = `${prefix}.jsonl`;
const CLASSES = ['hustler', 'rascal', 'technician'];
const STD = PATTERNS[0][0];
const singles = JSON.parse(readFileSync(singlesFile, 'utf8')).summary;
const row = (name, cls) => singles.find((r) => r.name === name && r.cls === cls);
const TOP = 6, MIN_GAIN = 0.05;

// Challenge tilts paired with the thing meant to answer them: a Cheat, or chips bought before the bout. These test
// the risk symmetry: inviting a Challenge and covering it should net a gain, not a wash.
const PAIRS = [
  ['creature tilt (challenge)', 'familiar tilt (cheat)'], ['creature tilt (challenge)', 'shield tilt (cheat)'],
  ['hazard tilt (challenge)', 'shield tilt (cheat)'], ['hazard tilt (challenge)', 'familiar tilt (cheat)'],
  ['spawner tilt (challenge)', 'familiar tilt (cheat)'], ['calamity tilt (challenge)', 'intervention tilt (cheat)'],
  ['hazard tilt (challenge)', LEVERS.find((l) => l.chip === 'little')?.name], ['creature tilt (challenge)', LEVERS.find((l) => l.chip === 'clay')?.name],
].filter((p) => p.every((n) => n && byName[n]));

let done = 0; const results = []; // every simulated combination: { cls, round, base, levers, name }
const label = (base, levers) => [base === STD ? 'standard' : base, ...levers].join(' + ');
async function simulate(round, specs) {
  const fresh = specs.filter((s) => !results.some((r) => r.cls === s.cls && r.name === label(s.base, s.levers)));
  const uniq = [...new Map(fresh.map((s) => [`${s.cls}|${label(s.base, s.levers)}`, s])).values()];
  if (!uniq.length) return;
  const list = uniq.map((s) => ({ name: label(s.base, s.levers), group: `D${round}`, only: [s.cls],
    strat: compose(PATTERNS.find((p) => p[0] === s.base)[1], s.levers) }));
  console.log(`round ${round}: ${list.length} combinations × ${N} runs`);
  await runSuite(list, N, OUT, { append: done++ > 0, quiet: true });
  for (const s of uniq) results.push({ ...s, round, name: label(s.base, s.levers) });
}
const scored = (cls) => {
  const sum = summarize(readRows([OUT])).summary;
  return results.filter((r) => r.cls === cls).map((r) => ({ ...r, ...sum.find((x) => x.name === r.name && x.cls === cls) })).filter((r) => r.n);
};

// candidates per class: levers that beat standard on their own, best one per slot, top TOP slots
const plan = {};
for (const cls of CLASSES) {
  const std = row(`${STD}`, cls);
  const se = (r) => Math.hypot(r.seStage, std.seStage);
  const gains = LEVERS.filter((l) => !l.only || l.only.includes(cls)).map((l) => ({ l, r: row(`+ ${l.name}`, cls) })).filter((x) => x.r)
    .map(({ l, r }) => ({ name: l.name, slot: l.slot, delta: r.avgStage - std.avgStage, z: (r.avgStage - std.avgStage) / se(r) }))
    .filter((x) => x.delta > MIN_GAIN && x.z > 1).sort((a, b) => b.delta - a.delta);
  const perSlot = []; for (const g of gains) if (!perSlot.some((x) => x.slot === g.slot)) perSlot.push(g);
  const cands = perSlot.slice(0, TOP);
  const bestPattern = PATTERNS.map(([p]) => ({ p, r: row(p, cls) })).filter((x) => x.r).sort((a, b) => b.r.avgStage - a.r.avgStage)[0].p;
  plan[cls] = { std: std.avgStage, cands, bestPattern, gains };
  console.log(cls, 'best pattern:', bestPattern, '| levers:', cands.map((c) => `${c.name} (+${c.delta.toFixed(2)})`).join(', ') || 'none');
}

// round 1: every pair of candidates, all candidates stacked, the singles on the best pattern, and the challenge pairs
const r1 = [];
for (const cls of CLASSES) {
  const { cands, bestPattern } = plan[cls], names = cands.map((c) => c.name);
  for (const base of [...new Set([STD, bestPattern])]) {
    for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) if (compatible([names[i], names[j]])) r1.push({ cls, base, levers: [names[i], names[j]] });
    if (names.length > 2) r1.push({ cls, base, levers: names });
    if (base !== STD) for (const n of names) r1.push({ cls, base, levers: [n] });
    if (base !== STD) r1.push({ cls, base, levers: [] });
  }
  for (const p of PAIRS) r1.push({ cls, base: STD, levers: p, pair: true });
}
await simulate(1, r1);

// rounds 2+: greedy, add one more candidate to the best combination so far while it keeps gaining
for (let round = 2; round <= 4; round++) {
  const next = [];
  for (const cls of CLASSES) {
    const best = scored(cls).filter((r) => !r.pair).sort((a, b) => b.avgStage - a.avgStage)[0]; if (!best) continue;
    plan[cls].best = best;
    for (const c of plan[cls].cands) if (!best.levers.includes(c.name) && compatible([...best.levers, c.name])) next.push({ cls, base: best.base, levers: [...best.levers, c.name] });
  }
  const before = Object.fromEntries(CLASSES.map((c) => [c, plan[c].best?.avgStage ?? -1]));
  await simulate(round, next);
  const gained = CLASSES.some((c) => scored(c).some((r) => r.round === round && r.avgStage > before[c] + MIN_GAIN));
  if (!gained) break;
}

// the view
const view = { N, minGain: MIN_GAIN, classes: {} };
for (const cls of CLASSES) {
  const std = plan[cls].std, single = (n) => plan[cls].gains.find((g) => g.name === n)?.delta ?? (row(`+ ${n}`, cls)?.avgStage ?? std) - std;
  const baseGain = (b) => (b === STD ? 0 : (row(b, cls)?.avgStage ?? std) - std);
  const rows = scored(cls).map((r) => ({ name: r.name, base: r.base, levers: r.levers, round: r.round, pair: !!r.pair,
    avgStage: r.avgStage, seStage: r.seStage, delta: r.avgStage - std, additive: baseGain(r.base) + r.levers.reduce((x, n) => x + single(n), 0),
    firstTry: r.firstTry, reach: r.reach, clearRate: r.clearRate, medianStage: r.medianStage, bestStage: r.bestStage, highestFloor: r.highestFloor,
    medPurseF: r.medPurseF, turnsPerBout: r.turnsPerBout, purchasesPerRun: r.purchasesPerRun }))
    .sort((a, b) => b.avgStage - a.avgStage);
  view.classes[cls] = { standard: std, bestPattern: plan[cls].bestPattern, candidates: plan[cls].cands, best: rows.find((r) => !r.pair), rows };
}
writeFileSync(`${prefix}.json`, JSON.stringify(view, null, 1));
for (const cls of CLASSES) { const b = view.classes[cls].best; console.log(`${cls}: best ${b?.name} → ${b?.avgStage.toFixed(2)} tables (standard ${view.classes[cls].standard.toFixed(2)})`); }
