// Guidance: every entry is complete, every way of reaching one points at something real. (npm run check:hovers
// walks every screen in a browser and fails on any hover without guidance.)
import fs from 'node:fs';
import path from 'node:path';
import { GUIDE, GUIDE_BY_CLASS } from '../js/content/guidance.js';
import EN from '../js/text/en.js';

const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
for (const [k, G] of Object.entries(GUIDE)) {
  ok(G.name && G.def && Array.isArray(G.how) && G.how.length && G.how.every((x) => typeof x === 'string' && x.length > 8), `${k}: needs a name, a def and at least one how line`);
  for (const lk of G.labels || []) ok(EN[lk] !== undefined, `${k}: label ${lk} is not in text/en.js`);
}
for (const [cls, k] of GUIDE_BY_CLASS) ok(GUIDE[k], `class rule ${cls} points at ${k}, which has no entry`);
// keys written into the code: guide: '…' props and guided(el, '…')
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.js') ? [path.join(d, e.name)] : []));
let used = 0;
for (const f of [...walk('js/ui'), 'js/main.js']) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/\bguide: '([^']+)'(?!\s*\+)|guided\([^;]*?, '([^']+)'\)/g)) { const k = m[1] || m[2]; used++; ok(GUIDE[k], `${f}: guide key ${k} has no entry`); }
}
// what the game infers from an element's kind
for (const k of ['die', 'chip', 'trick', 'cell', 'record', 'step']) ok(GUIDE[k], `entry ${k} is missing`);
if (fails.length) { console.log('FAIL ' + fails.join('\nFAIL ')); process.exit(1); }
console.log(`ok, guidance: ${Object.keys(GUIDE).length} entries, ${GUIDE_BY_CLASS.length} class rules, ${used} keys in the code`);
