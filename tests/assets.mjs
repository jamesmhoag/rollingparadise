// Row 17: the resource folder. Every file the manifest, the code or the CSS points at must exist, every manifest id
// must match something in the game, and files in assets/ that nothing uses are listed (not a failure).
import fs from 'node:fs';
import path from 'node:path';
import * as D from '../js/data.js';
import { FONTS, MUSIC } from '../js/content/assets.js';

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.error('✗', m); } };
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const exists = (p) => fs.existsSync(path.join(root, p));
const walk = (dir) => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]));

// 1 · files the manifest lists
const listed = new Set();
const want = (p, what) => { if (!p) return; listed.add(p); ok(exists(p), `${what}: missing file ${p}`); };
for (const [k, F] of Object.entries(FONTS)) { F.files.forEach((p) => want(p, `font ${k}`)); want(F.license, `font ${k} licence`); }
for (const [k, p] of Object.entries(D.IMAGES)) want(p, `image ${k}`);
for (const [k, I] of Object.entries(D.ICONS)) { want(I.src, `icon ${k}`); ok(I.src || I.glyph || ['creature', 'orbital', 'chip'].includes(k.split(':')[0]), `icon ${k}: no file and no glyph`); }
for (const [k, p] of Object.entries(D.TEXTURES)) want(p, `texture ${k}`);
for (const M of MUSIC) { want(M.src, `music ${M.title}`); ok(Number.isInteger(M.key) && M.key >= 0 && M.key < 12 && M.genre, `music ${M.title}: a key and a genre`); }
const { SAMPLES } = await import('../js/ui/sfx.js').catch(() => ({ SAMPLES: null }));
for (const n of SAMPLES || []) want(`assets/sfx/${n}.mp3`, `sound sample ${n}`);

// 2 · every manifest id names something in the game
const known = { room: ['smith', 'dice', 'trader', 'exchange', 'lounge', 'book', 'search', 'kit'], creature: [...Object.keys(D.CREATURES), 'bee'], orbital: Object.keys(D.ORBITALS), chip: Object.keys(D.SHOP_CHIPS), felt: Object.keys(D.FELTS) };
for (const k of [...Object.keys(D.ICONS), ...Object.keys(D.TEXTURES)]) { const [kind, id] = k.split(':'); ok(known[kind]?.includes(id), `manifest id ${k} matches nothing in the game`); }
for (const id of Object.keys(D.CREATURES)) ok(D.ICONS['creature:' + id], `creature ${id} has no icon entry`);
for (const id of Object.keys(D.ORBITALS)) ok(D.ICONS['orbital:' + id], `orbital ${id} has no icon entry`);
for (const id of Object.keys(D.FELTS)) ok(('felt:' + id) in D.TEXTURES, `felt ${id} has no texture entry`);

// 3 · paths written straight into the code, CSS or page
const refs = new Set();
for (const f of [...walk('js'), ...walk('css'), 'index.html'].filter((f) => /\.(js|css|html)$/.test(f))) {
  const src = fs.readFileSync(path.join(root, f), 'utf8');
  for (const m of src.matchAll(/(?:\.\.\/)?(assets\/[\w./-]+\.(?:png|jpe?g|webp|svg|gif|woff2?|ttf|otf|txt))/g)) {
    refs.add(m[1]); ok(exists(m[1]), `${f}: missing file ${m[1]}`);
  }
  if (f.startsWith('js/') && !f.startsWith('js/content/')) ok(!/['"]assets\/[^'"]+\.(png|jpe?g|webp|svg)['"]/.test(src), `${f}: image path written in code; list it in js/content/assets.js`);
}
ok(fs.readFileSync(path.join(root, 'index.html'), 'utf8').includes('css/fonts.css'), 'index.html does not load css/fonts.css');
const css = fs.readFileSync(path.join(root, 'css/fonts.css'), 'utf8');
for (const F of Object.values(FONTS)) ok(css.includes(`'${F.family}'`), `css/fonts.css has no @font-face for ${F.family}`);

// 4 · files nothing uses
const unused = walk('assets').filter((f) => !/README\.md$/.test(f) && !listed.has(f) && !refs.has(f));
if (unused.length) console.log(`  unused files in assets/ (${unused.length}):\n${unused.map((f) => '    ' + f).join('\n')}`);

console.log(fail ? `assets: ${fail} problem(s)` : `assets: ok (${listed.size} files listed, ${Object.keys(D.ICONS).length} icons, ${Object.keys(D.TEXTURES).length} textures)`);
process.exit(fail ? 1 : 0);
