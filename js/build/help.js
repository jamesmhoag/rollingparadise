// The hover on every field in Build mode's tables: what the value is for (content/fieldhelp.js), found from the
// field's path. Text keys say where their words show.
import * as D from '../data.js';
import { FIELD_HELP, textHelp } from '../content/fieldhelp.js';

const isObj = (x) => x && typeof x === 'object';
// a table of entries (each an object) is edited entry by entry: its fields' paths start after the entry's id
export const isEntries = (tb) => { const T = D.TABLES[tb]; if (!isObj(T)) return false; const vals = Object.entries(T).filter(([, v]) => v != null);
  return vals.length > 0 && vals.filter(([, v]) => isObj(v) && !Array.isArray(v)).length >= vals.length * 0.6; };
export function fieldDoc(path) {
  const parts = D.splitPath(path), tb = parts[0];
  if (tb === 'TEXT') return parts.length > 1 ? 'text' : null;
  const rest = parts.slice(isEntries(tb) ? 2 : 1).map((k) => (/^\d+$/.test(k) ? '#' : k)); if (!rest.length) return null;
  const H = FIELD_HELP[tb] || {}, last = rest[rest.length - 1];
  const cands = [rest.join('.'), ...rest.map((_, i) => [...rest.slice(0, i), '*', ...rest.slice(i + 1)].join('.')), [...rest.slice(0, -1), '*'].join('.'), '*'];
  for (const c of cands) if (H[c]) return H[c];
  return FIELD_HELP._[last] || null;
}
// the hover: the field's name, what it is for, and its path
export function fieldHelp(path) {
  const parts = D.splitPath(path);
  if (parts[0] === 'TEXT') return textHelp(parts.slice(1).join('.'));
  const doc = fieldDoc(path); if (!doc) return null;
  return `<b>${parts[parts.length - 1]}</b><p>${doc}</p><p class="dim mono">${path}</p>`;
}
