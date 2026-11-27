// No duplicated functionality. The same thing coded twice is twice the work to change and the two drift apart, so this
// fails on any stretch of code (45 tokens or more) that appears twice anywhere in js/, in one file or across files.
// The fix is never to reword one copy: move it to one place and call it from both (ui/form.js for Build-mode inputs,
// ui/chippaint.js for painting chips, util.js for small maths, a function beside its two callers otherwise).
// Left out: vendored code, the text, and files written by tools (the Build-mode export, the title sign, the chip list).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), bin = path.join(root, 'node_modules', '.bin', 'jscpd');
if (!fs.existsSync(bin)) { console.log('FAIL dupes: jscpd is not installed (run npm install)'); process.exit(1); }
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'dupes-'));
const IGNORE = ['**/vendor/**', '**/text/**', '**/content/overrides.js', '**/content/titlesign.js', '**/chiplist.js', '**/content/music.js', '**/content/loops.js'];
spawnSync(bin, [path.join(root, 'js'), '--ignore', IGNORE.join(','), '--min-tokens', '45', '--min-lines', '1', '--mode', 'weak', '--reporters', 'json', '--output', out, '--silent'], { encoding: 'utf8' });
const rep = JSON.parse(fs.readFileSync(path.join(out, 'jscpd-report.json'), 'utf8')), rel = (f) => path.relative(root, f.name);
fs.rmSync(out, { recursive: true, force: true });
for (const d of rep.duplicates) console.log(`FAIL duplicated code: ${rel(d.firstFile)}:${d.firstFile.start} and ${rel(d.secondFile)}:${d.secondFile.start} (${d.lines} lines, ${d.tokens} tokens)`);
if (rep.duplicates.length) process.exit(1);
console.log(`ok, no duplicated code in js/ (${rep.statistics.total.sources} files)`);
