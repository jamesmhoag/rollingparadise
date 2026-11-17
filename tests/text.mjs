// Game text: every key the code asks for is in the English text file, and every line fills in cleanly.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { t, fill, keysOf } from '../js/text.js';

const fails = [], keys = new Set(keysOf('en'));
const files = (dir) => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? files(p) : p.endsWith('.js') ? [p] : []; });
const used = new Set();
const src = files('js').filter((f) => !f.endsWith('en.js')).map((f) => readFileSync(f, 'utf8')).join('\n');
for (const m of src.matchAll(/\btt?\('([\w.]+)'/g)) used.add(m[1]); // asked for directly
for (const k of keys) if (src.includes(`'${k}'`)) used.add(k); // or chosen between, t(x ? 'a' : 'b')
const prefixes = [...src.matchAll(/\btt?\(`([\w.]+)\$\{/g)].map((m) => m[1]); // or built, t(`build.table.${id}`)
for (const k of keys) if (prefixes.some((pre) => k.startsWith(pre))) used.add(k);
for (const k of used) if (!keys.has(k)) fails.push(`missing text: ${k}`);
for (const k of keys) if (!used.has(k)) fails.push(`unused text: ${k}`);
if (fill('{n} {n|die|dice}', { n: 1 }) !== '1 die' || fill('{n} {n|die|dice}', { n: 3 }) !== '3 dice') fails.push('plurals');
if (t('floor.stairs.to', { floor: 'X' }) !== 'To X') fails.push('fill');
if (fails.length) { console.log('FAIL ' + fails.join('\nFAIL ')); process.exit(1); }
console.log(`ok, text: ${used.size} lines in text/en.js`);
