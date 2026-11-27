// The build mode's working changes. Pure logic apart from storage: no DOM.
//
// A draft is a set of changes, { 'TABLE.key.path': value }, kept in this browser until you export it. It is laid
// over the content already in the project (content/overrides.js). Export writes a new overrides.js holding both,
// to drop into the project; import loads an exported file (or a plain JSON draft) back into the draft.
import * as D from '../data.js';
import { OVERRIDES } from '../content/overrides.js';

const KEY = 'rollingparadise.build.draft.v1';
const store = () => { try { return globalThis.localStorage || null; } catch { return null; } };
const clone = (v) => (v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v);

// Changes written by an older build of the game: fields the content no longer has are dropped, so an old export or a
// draft kept in a browser still loads cleanly. (A class's `hero`: the Roller is named in ROLLERS now. A card's
// `lanyard`: there is no lanyard, every card takes a wallet slot.)
const GONE = [/^CLASSES\.[^.]+\.hero$/, /^CARDS\.[^.]+\.lanyard$/];
const GONE_IN = { CLASSES: ['hero'], CARDS: ['lanyard'] };
export function migrate(changes) {
  const out = {}, dead = Object.keys(changes || {}).filter((p) => D.isDeletion(p, changes[p]));
  for (const [p, v] of Object.entries(changes || {})) {
    if (GONE.some((re) => re.test(p))) continue;
    if (dead.some((d) => p.startsWith(d + '.'))) continue; // a deleted entry keeps nothing inside it
    const ks = p.split('.'), drop = ks.length === 2 && GONE_IN[ks[0]];
    out[p] = drop && v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).filter(([k]) => !drop.includes(k))) : v;
  }
  return out;
}
export const draft = { changes: {}, orig: {} }; // orig: each changed path's value before the draft touched it
export function loadDraft() {
  try { draft.changes = migrate(JSON.parse(store()?.getItem(KEY) || '{}') || {}); } catch { draft.changes = {}; }
  for (const [p, v] of Object.entries(draft.changes)) { if (!(p in draft.orig)) draft.orig[p] = clone(D.getPath(p)); D.setPath(p, clone(v)); }
  D.refreshDerived(); return draft;
}
const save = () => { try { store()?.setItem(KEY, JSON.stringify(draft.changes)); } catch { /* storage unavailable */ } };

// change one value (a path into D.TABLES)
export function setValue(path, value) {
  if (!(path in draft.orig)) draft.orig[path] = clone(D.getPath(path));
  if (JSON.stringify(value) === JSON.stringify(draft.orig[path])) return revert(path);
  draft.changes[path] = clone(value); D.setPath(path, clone(value)); D.refreshDerived(); save();
}
// undo one change: back to the value the project has
export function revert(path) {
  if (path in draft.orig) { if (draft.orig[path] === undefined) D.deletePath(path); else D.setPath(path, clone(draft.orig[path])); }
  delete draft.changes[path]; D.refreshDerived(); save();
}
// ---------- organising entries: delete, and move up or down ----------
// Deleting an entry is a change (its path set to null): it is exported with the rest, so the entry stays gone when the
// file is merged and when the game's own tables still list it. What the entry held is dropped from the draft with it.
// Returns what still uses it (and does nothing) if anything does.
export function removeEntry(table, id) {
  const used = D.usedBy(table, id); if (used.length) return used;
  const path = D.subPath(table, id);
  for (const p of Object.keys(draft.changes)) if (p.startsWith(path + '.')) revert(p);
  const mine = path in draft.changes && !(path in OVERRIDES) && draft.orig[path] === undefined; // made in this draft and never exported: it simply goes
  if (mine) { revert(path); return []; }
  if (!(path in draft.orig)) draft.orig[path] = clone(D.getPath(path));
  draft.changes[path] = null; D.setPath(path, null);
  const ord = D.ORDER[table]; if (Array.isArray(ord) && ord.includes(id)) setValue(D.subPath('ORDER', table), ord.filter((k) => k !== id));
  D.refreshDerived(); save(); return [];
}
// move an entry one place up (-1) or down (+1) in its table's list
export function moveEntry(table, id, dir) {
  const keys = Object.keys(D.TABLES[table] || {}), i = keys.indexOf(id), j = i + dir; if (i < 0 || j < 0 || j >= keys.length) return false;
  [keys[i], keys[j]] = [keys[j], keys[i]]; setValue(D.subPath('ORDER', table), keys); return true;
}
export const changed = (path) => path in draft.changes || Object.keys(draft.changes).some((p) => p.startsWith(path + '.'));
export const count = () => Object.keys(draft.changes).length;
export function discard() { for (const p of Object.keys(draft.changes)) revert(p); }

// ---------- export and import ----------
const HEAD = `// Content changes made in the build mode. Each line sets one value in the game's content, by its path:
//   'TRICKS.charge.count': 3          a trick's dice count
//   'ROLLERS.fox.name': 'Fox'         a Roller's name
//   'TRICKS.my_trick': { ... }        a whole new entry
// The build mode exports this whole file: replace this one with it to make the changes part of the game.
// (npm run merge-content <file> merges an export into this file instead, keeping changes from both.)
`;
// the changes in the project and in the draft together (the draft wins), sorted so files diff and merge cleanly
export const allChanges = (base = OVERRIDES, extra = draft.changes) => Object.fromEntries(Object.entries({ ...base, ...extra }).sort(([a], [b]) => a.localeCompare(b)));
export function overridesFile(changes = allChanges()) {
  const lines = Object.entries(changes).map(([p, v]) => `  ${JSON.stringify(p)}: ${JSON.stringify(v)},`);
  return `${HEAD}export const OVERRIDES = {\n${lines.join('\n')}${lines.length ? '\n' : ''}};\n`;
}
// read an exported overrides.js or a JSON draft back into a set of changes
export function parseChanges(text) {
  const body = text.includes('OVERRIDES') ? text.slice(text.indexOf('{', text.indexOf('OVERRIDES'))).replace(/;\s*$/, '') : text;
  const json = body.replace(/,(\s*})\s*$/, '$1'); // the trailing comma an export leaves
  const out = JSON.parse(json); if (!out || typeof out !== 'object' || Array.isArray(out)) throw new Error('Not a set of content changes.');
  return migrate(out);
}
// load changes into the draft; only paths into known tables are taken
export function importChanges(changes) {
  let n = 0; for (const [p, v] of Object.entries(changes)) { if (!D.TABLES[D.splitPath(p)[0]]) continue; if (JSON.stringify(OVERRIDES[p]) === JSON.stringify(v) && !(p in draft.changes)) continue; setValue(p, v); n++; }
  return n;
}
