// Summarise audit JSONL into per (scenario, class) rows. node tests/audit/aggregate.mjs in.jsonl [more.jsonl ...] out.json
import { readFileSync, writeFileSync } from 'node:fs';
export const readRows = (files) => files.flatMap((f) => readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)));
const STAGES = ['none', 'intro', ...[1, 2, 3, 4].flatMap((f) => [`F${f} T1`, `F${f} T2/3`, `F${f} HR`])];
export function summarize(rows) {
const errors = rows.filter((r) => r.error);
const groups = new Map();
for (const r of rows) { if (r.error) continue; const k = `${r.name}|${r.cls}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / Math.max(1, a.length - 1)); };
const summary = [];
for (const [k, rs] of groups) {
  const [name, cls] = k.split('|'), n = rs.length, stage = rs.map((r) => r.stage), floors = rs.map((r) => Math.min(4, r.floor));
  const cb = rs.reduce((x, r) => x + r.cbouts, 0), cw = rs.reduce((x, r) => x + r.cwins, 0);
  const sorted = stage.slice().sort((a, b) => a - b), median = sorted[Math.floor(n / 2)], best = sorted[n - 1];
  const buys = {}; for (const r of rs) for (const [b, c] of Object.entries(r.buys)) buys[b] = (buys[b] || 0) + c;
  const misses = {}; for (const r of rs) for (const [b, why] of Object.entries(r.misses || {})) { misses[b] ||= {}; misses[b][why] = (misses[b][why] || 0) + 1; }
  const reach = [1, 2, 3, 4].map((f) => rs.filter((r) => r.floor >= f).length / n);
  // first attempt at each table: retries after a loss (which depend on the sell-down policy) are left out
  const LIB = ['none', 'intro', ...[1, 2, 3, 4].flatMap((f) => [`F${f} table 1`, `F${f} table 2/3`, `F${f} High Roller`])];
  const ft = [0, 0, 0, 0, 0].map(() => [0, 0]); // [attempts, first-try wins] overall + per floor
  for (const r of rs) {
    const lost = new Set(r.lossAt.map((x) => LIB.indexOf(x)));
    const last = r.cleared ? 13 : r.died && r.died !== 'intro' ? LIB.indexOf(r.died) : r.stage;
    for (let st = 2; st <= last; st++) { const f = Math.floor((st - 2) / 3) + 1, w = lost.has(st) ? 0 : 1; ft[0][0]++; ft[0][1] += w; ft[f][0]++; ft[f][1] += w; }
  }
  const firstTry = ft.map(([a, w]) => (a ? w / a : null));
  summary.push({ name, cls, group: rs[0].group, n, firstTry,
    winRate: cw / cb, boutsPerRun: cb / n, clearRate: rs.filter((r) => r.cleared).length / n,
    avgStage: mean(stage), seStage: sd(stage) / Math.sqrt(n), medianStage: STAGES[median], bestStage: STAGES[best],
    avgFloor: mean(floors), highestFloor: Math.max(...rs.map((r) => r.floor)), reach,
    totalTurns: rs.reduce((x, r) => x + r.turns, 0), totalWins: rs.reduce((x, r) => x + r.wins, 0), totalPurchases: rs.reduce((x, r) => x + r.purchases, 0),
    turnsPerRun: mean(rs.map((r) => r.turns)), winsPerRun: mean(rs.map((r) => r.wins)), purchasesPerRun: mean(rs.map((r) => r.purchases)),
    turnsPerBout: rs.reduce((x, r) => x + r.turns, 0) / rs.reduce((x, r) => x + r.bouts, 0),
    timeouts: rs.reduce((x, r) => x + r.timeouts, 0), spentPerRun: mean(rs.map((r) => r.spent)), maxPurse: Math.max(...rs.map((r) => r.maxPurse)),
    medPurseF: [1, 2, 3, 4].map((f) => { const v = rs.filter((r) => r.purseAt[f] != null).map((r) => r.purseAt[f]).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : null; }),
    buys, misses, bets: rs.reduce((x, r) => x + r.bets, 0), barfly: rs.reduce((x, r) => [x[0] + r.barfly[0], x[1] + r.barfly[1]], [0, 0]), sold: mean(rs.map((r) => r.sold)) });
}
return { errors: errors.length, errorSample: errors.slice(0, 3), summary };
}
if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const args = process.argv.slice(2), out = args.pop();
  const res = summarize(readRows(args));
  writeFileSync(out, JSON.stringify(res, null, 1));
  console.log('groups', res.summary.length, 'errors', res.errors);
}
