import * as R from '../js/run.js';
import * as B from '../js/bout.js';
import { autoTurn } from '../js/ai.js';
import * as D from '../js/data.js';
const stat = {};
for (let seed = 1; seed <= 150; seed++) {
  for (let f = 0; f <= 4; f++) for (const kind of ['table', 'boss']) {
    if (f === 0 && kind === 'boss') continue;
    const cls = Object.keys(D.CLASSES)[seed % 3];
    const run = R.newRun(cls, 'standard', seed * 31 + f);
    let start;
    if (f === 0) start = R.startIntro(run);
    else {
      // a plausible player build for the floor
      run.purse = [0, 200, 900, 4000, 20000][f];
      for (const t of run.tricks) { t.q = Math.max(1, f); t.up = f > 1 ? 1 : 0; }
      if (f >= 2) run.tricks.push({ uid: run.nextId++, id: 'swipe', q: f, up: 0 }, { uid: run.nextId++, id: 'endure', q: f, up: 0 });
      for (let i = 0; i < (f - 1) * 3; i++) run.dice.push({ id: run.nextId++, type: ['d6', 'd8', 'd10', 'd10'][f - 1], up: [] });
      if (f >= 2) run.cards.push('business_proficiency'); if (f >= 3) run.cards.push('business_ingenuity');
      R.enterFloor(run, f);
      start = R.startTable(run, R.newPrep(run, kind, 1));
    }
    const { bout } = start; let dmg = [0, 0];
    while (!bout.over) { autoTurn(bout); for (const _ of B.resolve(bout)); }
    const k = `F${f} ${kind}`; const st = stat[k] ||= { n: 0, turns: 0, wins: 0, timeouts: 0, w0: 0, w1: 0 };
    st.n++; st.turns += bout.turn; st.wins += bout.winner === 0; st.timeouts += bout.timeout ? 1 : 0; st.w0 += bout.sides[0].dealt / bout.turn; st.w1 += bout.sides[1].dealt / bout.turn;
  }
}
for (const [k, s] of Object.entries(stat)) console.log(k.padEnd(10), 'turns', (s.turns / s.n).toFixed(1).padStart(5), 'win', (s.wins / s.n * 100).toFixed(0).padStart(3) + '%', 'timeouts', String(s.timeouts).padStart(3), 'dmg/turn you', (s.w0 / s.n).toFixed(1), 'opp', (s.w1 / s.n).toFixed(1));
