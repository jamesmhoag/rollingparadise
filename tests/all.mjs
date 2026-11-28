// npm test: every test, one after another.
// The rule tests name stock numbers (a 2¢ skip, a 25¢ chip on floor 3), so they run on the content as the tables have
// it (RP_CONTENT=stock). The whole-game tests then run again on the content the game ships with (content/overrides.js laid
// over it), so a Build-mode export that breaks a run, a hover or the text is caught here.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const STOCK = ['sim', 'round19', 'round21', 'round24', 'fieldhelp', 'rollers', 'signs', 'ascent', 'flip', 'phases', 'chips', 'round13', 'tilts', 'round15', 'round16', 'round17', 'tuning', 'round18', 'text', 'build',
  'trickmaker', 'chipmaker', 'chipwork', 'opponents', 'tuner', 'testtable', 'paint', 'pit', 'assets', 'chipterms', 'puddle', 'guidance', 'restore', 'stacks', 'flavor', 'music', 'sfx', 'idle', 'fxchips', 'debt', 'dupes', 'syntax'];
const SHIPPED = ['sim', 'fieldhelp', 'ascent', 'text', 'build', 'assets', 'guidance', 'content', 'fxchips'];
const only = process.argv.slice(2);
let failed = 0;
for (const [label, list, env] of [['stock content', STOCK, { RP_CONTENT: 'stock' }], ['shipped content', SHIPPED, { RP_CONTENT: '' }]]) {
  console.log(`\n== ${label} ==`);
  for (const name of list) {
    if (only.length && !only.includes(name)) continue;
    const r = spawnSync(process.execPath, [fileURLToPath(new URL(`./${name}.mjs`, import.meta.url))], { env: { ...process.env, ...env }, encoding: 'utf8' });
    process.stdout.write(r.stdout || ''); process.stderr.write(r.stderr || '');
    if (r.status !== 0) { failed++; console.log(`FAILED: ${name} (${label})`); }
  }
}
if (failed) { console.log(`\n${failed} test file(s) failed`); process.exit(1); }
console.log('\nall tests passed');
