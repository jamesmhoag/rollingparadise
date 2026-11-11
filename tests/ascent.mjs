// Ascent bouts with a strong build: checks for runaway resolution.
import * as R from '../js/run.js'; import * as B from '../js/bout.js'; import { autoTurn } from '../js/ai.js'; import * as D from '../js/data.js';
let maxSteps = 0, worst = '';
for (let seed = 1; seed <= 40; seed++) {
  const run = R.newRun(Object.keys(D.CLASSES)[seed % 3], 'standard', seed * 101); run.purse = 5000; R.enterFloor(run, 3);
  R.buildAscent(run, R.loadMeta());
  const { bout } = R.startAscent(run);
  while (!bout.over) { autoTurn(bout); let n = 0; const t0 = Date.now();
    for (const st of B.resolve(bout)) { n++; if (n > 5000 || Date.now() - t0 > 4000) { console.log('RUNAWAY seed', seed, 'turn', bout.turn, 'steps', n, st.text); process.exit(1); } }
    if (n > maxSteps) { maxSteps = n; worst = `seed ${seed} turn ${bout.turn}`; } }
}
console.log('ok, most steps in one turn:', maxSteps, worst);
