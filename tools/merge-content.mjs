// Merge an export from the build mode into js/content/overrides.js, keeping the changes already there.
//   npm run merge-content -- path/to/overrides.js      (an exported file, or a JSON draft)
// Where both set the same value, the export wins. The result is written back sorted, one change per line.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { OVERRIDES } from '../js/content/overrides.js';
import { parseChanges, allChanges, overridesFile, migrate } from '../js/build/draft.js';
import { TABLES, splitPath } from '../js/data.js';

const file = process.argv[2];
if (!file) { console.log('Usage: npm run merge-content -- <exported overrides.js or draft .json>'); process.exit(1); }
const incoming = parseChanges(readFileSync(file, 'utf8'));
const unknown = Object.keys(incoming).filter((p) => !TABLES[splitPath(p)[0]]);
for (const p of unknown) { console.log(`skipped (no such table): ${p}`); delete incoming[p]; }
const merged = allChanges(migrate(OVERRIDES), incoming); // fields an older build wrote are dropped from both
const target = fileURLToPath(new URL('../js/content/overrides.js', import.meta.url));
writeFileSync(target, overridesFile(merged));
const added = Object.keys(incoming).filter((p) => !(p in OVERRIDES)).length, replaced = Object.keys(incoming).length - added;
console.log(`merged into js/content/overrides.js: ${added} new, ${replaced} replaced, ${Object.keys(merged).length} in all`);
