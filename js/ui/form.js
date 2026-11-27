// Build mode's one form kit. Every maker builds its fields from these, so an input behaves the same wherever it is
// and a change to one is a change to all. The inputs take a value and what to do with a new one; draftForm binds
// them to one entry of the draft (paths under `base`), with the changed mark and the revert button on each field.
import { h, btn, toast } from './core.js';
import * as D from '../data.js';
import * as B from '../build/draft.js';
import { t } from '../text.js';

const HEX = /^#[0-9a-f]{6}$/i;
const ticked = (v) => (v ? { checked: 'checked' } : {});
// <option>s for [[value, label], ...], the current one selected; [groupLabel, [[value, label], ...]] makes a group
export const opts = (list, value) => list.map(([v, l]) => (Array.isArray(l) ? h('optgroup', { label: v }, ...opts(l, value)) : h('option', { value: v ?? '', text: l, ...(String(v ?? '') === String(value ?? '') ? { selected: 'selected' } : {}) })));
// [[key, label], ...] for a table of things: a string is its own label, anything else is named by label(v) (its name);
// none: a first choice that means no thing
export const pairsOf = (o, label = (v) => v.name, none) => [...(none ? [[null, none]] : []), ...Object.entries(o).map(([k, v]) => [k, typeof v === 'string' ? v : label(v)])];
// a select. parse: what a picked value becomes ('' is null unless told otherwise); head: a first, empty option's label
export const blankNull = (x) => (x === '' ? null : x);
export const typed = (x) => (x === '' ? null : x === 'true' ? true : x === 'false' ? false : /^-?\d+(\.\d+)?$/.test(x) ? Number(x) : x); // a value as it was listed: a number, true or false stay what they were
export const pick = (list, value, on, { parse = blankNull, head, title } = {}) => h('select', { title, onchange: (e) => on(parse(e.target.value)) }, ...(head != null ? [h('option', { value: '', text: head })] : []), ...opts(list, value));
// a number. Empty (or not a number) gives `blank`; whole rounds; min and max hold it in
export const numIn = (value, on, { min, max, step = 1, w, ph, title, whole = false, blank = null } = {}) => h('input', { type: 'number', step, ...(min != null ? { min } : {}), ...(max != null ? { max } : {}), value: value ?? '', placeholder: ph || '', title, style: w ? { width: w } : {},
  onchange: (e) => { const raw = e.target.value.trim(); let v = raw === '' || !Number.isFinite(Number(raw)) ? blank : Number(raw);
    if (v != null) { if (whole) v = Math.round(v); if (min != null) v = Math.max(min, v); if (max != null) v = Math.min(max, v); } on(v); } });
export const textIn = (value, on, { long = false, rows = 3 } = {}) => h(long ? 'textarea' : 'input', { ...(long ? { rows, text: value ?? '' } : { type: 'text', value: value ?? '' }), onchange: (e) => on(e.target.value) });
export const checkIn = (value, on) => h('input', { type: 'checkbox', ...ticked(value), onchange: (e) => on(e.target.checked) });
// a checkbox with its label beside it
export const tick = (label, value, on, cls = 'b-check') => h('label', { class: cls }, checkIn(value, on), typeof label === 'string' ? h('span', { text: label }) : label);
// one checkbox for each of [[key, label], ...]; list: the keys ticked
export const tickList = (pairs, list, on, { sort = false } = {}) => h('div', { class: 'b-checks' }, pairs.map(([k, l]) => tick(l, list.includes(k), (yes) => on(yes ? (sort ? [...list, k].sort() : [...list, k]) : list.filter((x) => x !== k)))));
// a colour. live: every move of the picker counts, not only letting go
export const colourIn = (value, on, { fallback = '#888888', live = false } = {}) => h('input', { type: 'color', value: HEX.test(value || '') ? value : fallback, [live ? 'oninput' : 'onchange']: (e) => on(e.target.value) });
export const rangeIn = (value, on, { min = 0, max = 100, step = 1 } = {}) => h('span', { class: 'row' }, h('input', { type: 'range', min, max, step, value, oninput: (e) => on(Number(e.target.value)) }), h('b', { class: 'num', text: String(value) }));
// the revert button for a draft path (or an empty cell, when it is unchanged)
export const revertBtn = (path, redraw) => (path in B.draft.changes ? btn('↺', () => { B.revert(path); redraw(); }, t('build.revert.tip', { was: JSON.stringify(B.draft.orig?.[path]) ?? '' }), 'small b-revert') : h('span'));
// a labelled row: label, input, revert. path: the draft path it shows as changed (none: a plain row)
export const fieldRow = (label, el, path, redraw, extra) => h('div', { class: `b-field ${path && B.changed(path) ? 'ch' : ''}` }, typeof label === 'string' ? h('label', {}, label, extra || null) : label, el, path ? revertBtn(path, redraw) : h('span'));

// The fields of one draft entry. base: its path; ks: the keys under it. after(): run on every change, before the redraw.
export function draftForm(base, redraw, { after } = {}) {
  const P = (...ks) => ks.reduce((p, k) => D.subPath(p, k), base);
  const set = (ks, v) => { B.setValue(P(...ks), v); after?.(); redraw(); };
  const on = (ks) => (v) => set(ks, v);
  return { P, set,
    field: (label, el, ks, extra) => fieldRow(label, el, ks ? P(...ks) : null, redraw, extra),
    select: (ks, list, value, o) => pick(list, value, on(ks), o),
    number: (ks, value, o) => numIn(value, on(ks), o),
    text: (ks, value, o) => textIn(value, on(ks), o),
    check: (ks, value, o = {}) => checkIn(value, (v) => set(ks, o.orNull ? v || null : v)),
    colour: (ks, value, o) => colourIn(value, on(ks), o),
    range: (ks, value, o) => rangeIn(value, on(ks), o),
    checks: (ks, pairs, list, o) => tickList(pairs, list, on(ks), o) };
}

// Ask for the id of a new entry: letters, digits and _ only, and not one that is taken. label: the question; def: what
// it suggests; taken: the table it must be new in (or a test of an id). → the id, or null (nothing typed, or refused).
export function askId(label, def, taken) {
  const id = (globalThis.prompt?.(label, def) || '').trim(); if (!id) return null;
  if (!/^\w+$/.test(id)) { toast(t('build.duplicate.badId'), 'warn'); return null; }
  if (typeof taken === 'function' ? taken(id) : taken?.[id] !== undefined) { toast(t('build.duplicate.taken', { id }), 'warn'); return null; }
  return id;
}
// A maker's page: its fields on the left, what they make on the right
export const makerPage = (fields, ...side) => h('div', { class: 'b-maker' }, h('div', { class: 'b-fields' }, fields), ...side);
export const previewCol = (...kids) => h('div', {}, h('span', { class: 'cap', text: t('maker.preview') }), ...kids);
