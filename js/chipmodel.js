// Every chip in the chip maker's terms. Made chips (content/chipmaker.js, MADE_CHIPS) are read as they are; the
// chips that were in the game before the maker are mapped from the workbook's chip list (chiplist.js) and the
// engine's own facts. What a mapped chip does beyond these terms is its `classic` behaviour, named by its text.
import { CHIP_LIST } from './chiplist.js';
import { MADE_CHIPS, NEW_CHIP } from './content/chipmaker.js';
import { SHOP_CHIPS, INSTANCE_SHIELDS, resistsOf } from './data.js';

const SOURCE = { 'Match Prep': 'prep', Spawned: 'chip', 'Chip Conversion': 'chip', 'Stack Conversion': 'chip', 'Space Conversion': 'chip', Encountered: 'encounter' };
const LASTS = { Resiliant: 'paid', Fragile: 'hits', Temporary: 'turns', Match: 'match', Consuming: 'turns', Delicious: 'hits', Limited: 'turns' };
const MUST = { Top: 'top', Base: 'bottom', 'Top || Base': 'any', Max: 'any', 1: 'any', Flying: 'top' };
const num = (w) => { const m = /^(-?\d+)¢$/.exec(String(w || '').trim()); return m ? Number(m[1]) : null; };
const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

// one workbook row as a chip model
function mapRow(row) {
  const L = row.list || {}, show = row.show || {}, shop = show.shop || show.resist, kind = show.kind;
  const value = num(L.worth) ?? (typeof show.value === 'number' ? show.value : 0);
  const immune = new Set(shop && SHOP_CHIPS[shop] ? resistsOf(shop) : []);
  if (L.movable === 'No') immune.add('moves');
  const hits = show.hits || (INSTANCE_SHIELDS.includes(kind) ? 1 : kind === 'block' || kind === 'counter' ? 1 : 0);
  return {
    id: `chip_${slug(row.name)}`, name: row.name, text: row.text || '', classic: true, engine: kind ? { kind, shop: shop || null } : null, status: row.status, note: row.note,
    category: L.type || row.type, value, worthRule: L.worth && num(L.worth) == null ? L.worth : null, hits,
    source: SOURCE[L.source || row.source] || 'chip', lasts: LASTS[L.permanence || row.permanence] || 'paid',
    height: kind === 'little' ? 'tiny' : 'basic', foot: show.big ? 'big' : 'basic', must: MUST[L.stack] || 'any', onTop: kind === 'little' ? 'none' : 'fits',
    immune: [...immune], move: L.stack === 'Flying' ? 'flying' : show.creature ? 'nearest' : L.movable === 'No' ? 'anchored' : 'still',
  };
}
let mapped = null;
export const classicChips = () => (mapped ||= CHIP_LIST.map(mapRow));
// every chip: the made ones first, then the mapped ones
export function allChips() { return [...Object.entries(MADE_CHIPS).map(([id, m]) => ({ ...NEW_CHIP, ...m, id, made: true })), ...classicChips()]; }
export const madeChip = (id) => (MADE_CHIPS[id] ? { ...NEW_CHIP, ...MADE_CHIPS[id], id } : null);
// a mapped chip as the start of a made one: the terms carry over, the classic behaviour does not
export function asMade(m) {
  const { id, classic, engine, status, note, category, worthRule, made, ...rest } = m; void id; void classic; void engine; void status; void note; void category; void worthRule; void made;
  return JSON.parse(JSON.stringify({ ...NEW_CHIP, ...rest, name: `${m.name} (made)` }));
}
