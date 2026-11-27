// The content the game ships with: the Build-mode changes in content/overrides.js, laid over the tables.
import * as D from '../js/data.js';
import { OVERRIDES } from '../js/content/overrides.js';
import { migrate } from '../js/build/draft.js';
import * as R from '../js/run.js';

const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
const stock = globalThis.process?.env?.RP_CONTENT === 'stock';
// every change lands in a table the game has, and reads back as written
for (const [p, v] of Object.entries(OVERRIDES)) {
  ok(D.TABLES[D.splitPath(p)[0]], `${p} names a table the game has`);
  if (!stock && !Object.keys(OVERRIDES).some((q) => q !== p && q.startsWith(p + '.'))) ok(JSON.stringify(D.getPath(p)) === JSON.stringify(v), `${p} reads back as written`);
}
ok(JSON.stringify(migrate(OVERRIDES)) === JSON.stringify(OVERRIDES), 'no fields from an older build are left in overrides.js (npm run merge-content cleans them)');
ok(Object.keys(migrate({ 'CLASSES.x.hero': 'Owl', 'CLASSES.y': { name: 'Y', hero: 'Owl' } })).join() === 'CLASSES.y' && !('hero' in migrate({ 'CLASSES.y': { name: 'Y', hero: 'Owl' } })['CLASSES.y']), 'an older export loses the fields the content no longer has');
// every class is whole, and every Roller can start a run
for (const [id, K] of Object.entries(D.CLASSES)) ok(K.name && K.tip && K.bvd && D.STATS[K.primary] !== undefined && ['charisma', 'cunning', 'conviction'].includes(K.rewards), `class ${id} is whole`);
for (const id of Object.keys(D.ROLLERS)) { let run = null; try { run = R.newRun(D.ROLLERS[id].cls, D.ROLLERS[id].jacket || 'standard', 7); } catch (e) { ok(false, `Roller ${id} starts a run: ${e.message}`); } ok(!run || D.CLASSES[run.cls], `Roller ${id} has a class`); }
for (const [id, t] of Object.entries(D.TRICKS)) ok(t && D.TYPES[t.type] && D.DICE[t.die], `trick ${id} has a type and a die`);
for (const [id, w] of Object.entries(D.WALLETS)) ok(w.name && w.slots >= 0, `wallet ${id} is whole`);
if (fails.length) { console.log('FAIL ' + fails.join('\nFAIL ')); process.exit(1); }
console.log(`ok, content: ${Object.keys(OVERRIDES).length} Build-mode changes over the tables, ${Object.keys(D.CLASSES).length} classes, ${Object.keys(D.TRICKS).length} tricks`);
