// Every source file parses, and no line comment swallows the code after it. The interface's files are not loaded by the
// rule tests (they need a page), so a slip in one of them would otherwise only show in the browser: this reads each
// file as the module it is.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), files = [];
const walk = (dir) => { for (const f of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, f.name); if (f.isDirectory()) { if (f.name !== 'vendor') walk(p); } else if (/\.(js|mjs|cjs)$/.test(f.name)) files.push(p); } };
walk(path.join(root, 'js')); walk(path.join(root, 'tools')); let bad = 0;
for (const f of files) { const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' }); if (r.status !== 0) { bad++; console.log(`FAIL ${path.relative(root, f)} does not parse: ${(r.stderr || '').split('\n').slice(0, 4).join(' ').trim()}`); } }
// A line comment that swallows code: `stmt; // note stmt; stmt;` parses, and silently drops everything after the note.
// Any line whose comment, after some code, itself reads as statements (it ends a statement and holds a call or an
// assignment after a `;`, or a method call after a closing bracket) is taken for that slip. A note in the middle of a line is written as a block comment.
for (const f of files) fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
  const at = line.search(/(?<![:'"`\\/])\/\/ /); if (at < 0 || !line.slice(0, at).trim() || /^\s*(\/\/|\*)/.test(line)) return;
  const note = line.slice(at + 3); if (/[;)]\s+[\w$.\[\]]+\.\w+\(|;\s+[\w$.\[\]]+\s*(\(|=(?!=)|\+=)/.test(note) && /[;}]\s*$/.test(note)) { bad++; console.log(`FAIL ${path.relative(root, f)}:${i + 1} a line comment seems to swallow code: // ${note.slice(0, 70)}`); } });
if (bad) process.exit(1);
console.log(`ok, ${files.length} source files parse, and no line comment swallows code`);
