import * as R from '../js/run.js'; import * as B from '../js/bout.js'; import { autoTurn } from '../js/ai.js';
const run = R.newRun(process.argv[2] || 'hustler', 'standard', 5); const { bout } = R.startIntro(run);
while (!bout.over && bout.turn <= 8) { autoTurn(bout);
  console.log(`-- turn ${bout.turn} worth ${bout.sides.map(B.worth)} stage ${bout.stage.paid} used`, JSON.stringify(bout.sides.map((s) => s.used)), 'run', bout.sides.map((s) => s.run.map((e) => `${e.trick.id}[${e.dice.map((d) => d.value)}]${e.state}`).join(',')).join(' | '));
  for (const st of B.resolve(bout)) if (st.text) console.log('   ', st.text); }
