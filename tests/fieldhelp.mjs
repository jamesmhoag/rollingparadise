// Every field Build mode's tables show has a hover saying what it is for (content/fieldhelp.js), and every
// Gameplay tuner setting has one too.
import * as D from '../js/data.js';
import { fieldDoc, isEntries } from '../js/build/help.js';
import T from '../js/text/en.js';

const fails = [];
const isObj = (x) => x && typeof x === 'object';
const TABLES = ['CLASSES', 'ROLLERS', 'BASE_DIMS', 'STATS', 'TRICKS', 'TYPES', 'CONDITIONS', 'PACKS', 'QDIE', 'CHIPS', 'SHOP_CHIPS', 'CHIP_TIERS', 'CREATURES', 'ORBITALS', 'CALAMITIES',
  'DICE', 'MATERIALS', 'DICE_SHOP', 'BONE', 'MELT', 'CASTS', 'DYES', 'DIAMOND', 'DIE_VARS', 'FLOORS', 'FELTS', 'TILTS', 'TILT_PRESSURE', 'PRIZES', 'DRINKS', 'SPORTS', 'ODDS', 'JACKETS', 'WALLETS', 'PASSES', 'DENOMS', 'WEAR', 'GUIDE', 'BOSS_TRAITS'];
// the fields the editor draws: as build.js fields() walks them (groups to depth 4; plain lists are one field)
const walk = (path, v, depth) => { if (typeof v === 'function') return; if (isObj(v) && depth < 4 && !(Array.isArray(v) && v.every((x) => !isObj(x)))) { for (const [k, x] of Object.entries(v)) { const p = D.subPath(path, k); if (!fieldDoc(p)) fails.push(p); walk(p, x, depth + 1); } } };
for (const tb of TABLES) { const tab = D.TABLES[tb]; if (!tab) continue;
  if (isEntries(tb)) { for (const [id, e] of Object.entries(tab)) if (e != null) walk(D.subPath(tb, id), e, 0); } else walk(tb, tab, 0); }
const shown = [...new Set(fails.map((p) => p.split('.').filter((k, i) => i !== 1 || !isEntries(p.split('.')[0])).join('.')))];
for (const p of shown.slice(0, 40)) console.log('FAIL no hover for', p);
for (const [sec, o] of Object.entries(D.TUNING)) for (const k of Object.keys(o)) if (!T[`help.tuner.${sec}.${k}`]) console.log('FAIL no hover for the tuner setting', `${sec}.${k}`);
let bad = shown.length; for (const [sec, o] of Object.entries(D.TUNING)) for (const k of Object.keys(o)) if (!T[`help.tuner.${sec}.${k}`]) bad++;
if (bad) process.exit(1); console.log('ok, every Build-mode field and tuner setting has a hover');
