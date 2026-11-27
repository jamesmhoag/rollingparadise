// Build mode: the Gear maker. Wallets and jackets: their names, what they do (a wallet's card slots, pass slots and
// alley roll; a jacket's stat changes, its class and when it is sold), and how they look: what they are made of (any
// finish: the dice materials, and the cloths and hides), their colour and trim, a clasp or a collar, stitching or
// buttons, an emblem, a glint and a sparkle. The look is drawn as you change it, three times its size. Numbers keep to
// what the drawn shapes can show (LOOK_BOUNDS).
import { h, btn, toast, lab, guided } from './core.js';
import * as D from '../data.js';
import * as B from '../build/draft.js';
import { t } from '../text.js';
import { walletEl, jacketEl } from './parts.js';
import { finishOn } from './finish.js';
import { FINISHES, WALLET_CLASPS, JACKET_COLLARS, LOOK_BOUNDS, walletLook, jacketLook, NEW_WALLET, NEW_JACKET } from '../content/finishes.js';
import { SYMBOLS } from './symbols.js';

const STATS = ['trickery', 'ingenuity', 'proficiency', 'charisma', 'cunning', 'conviction', 'balance', 'versatility', 'depth'];
export const gearKeys = () => [...Object.keys(D.WALLETS).map((k) => `w:${k}`), ...Object.keys(D.JACKETS).map((k) => `j:${k}`)];
export function gearList(sel, pick, filter = '') {
  const hit = (k, n) => !filter || `${k} ${n}`.toLowerCase().includes(filter);
  const item = (key, name, sub) => h('button', { class: `b-item ${sel === key ? 'on' : ''} ${B.changed(D.subPath(key[0] === 'w' ? 'WALLETS' : 'JACKETS', key.slice(2))) ? 'ch' : ''}`, onclick: () => pick(key) }, h('b', { text: name }), h('small', { text: sub }));
  return [h('div', { class: 'row' }, btn(t('gear.new.wallet'), () => { const id = newGear('WALLETS'); if (id) pick(`w:${id}`); }, null, 'small go'), btn(t('gear.new.jacket'), () => { const id = newGear('JACKETS'); if (id) pick(`j:${id}`); }, null, 'small go')),
    h('span', { class: 'cap', text: t('gear.wallets') }), ...Object.entries(D.WALLETS).filter(([k, W]) => hit(k, W.name)).map(([k, W]) => item(`w:${k}`, W.name, t('gear.wallet.sub', { slots: W.slots, passes: W.passes ?? 1, keep: W.keep }))),
    h('span', { class: 'cap', text: t('gear.jackets') }), ...Object.entries(D.JACKETS).filter(([k, J]) => hit(k, J.name)).map(([k, J]) => item(`j:${k}`, J.name, J.effect || ''))];
}
export function newGear(table) {
  const id = (globalThis.prompt?.(t('gear.newId'), table === 'WALLETS' ? 'new_wallet' : 'new_jacket') || '').trim();
  if (!id) return null; if (!/^\w+$/.test(id)) { toast(t('build.duplicate.badId'), 'warn'); return null; }
  if (D.TABLES[table][id]) { toast(t('build.duplicate.taken', { id }), 'warn'); return null; }
  B.setValue(D.subPath(table, id), JSON.parse(JSON.stringify(table === 'WALLETS' ? NEW_WALLET : NEW_JACKET))); B.setValue(D.subPath(D.subPath('FLAVOR', table), id), ''); return id;
}
export function gearMaker(key, redraw) {
  const wallet = key?.[0] === 'w', table = wallet ? 'WALLETS' : 'JACKETS', id = key?.slice(2), X = D.TABLES[table]?.[id]; if (!X) return h('p', { class: 'sub', text: t('maker.none') });
  const base = D.subPath(table, id), P = (...ks) => ks.reduce((p, k) => D.subPath(p, k), base), L = wallet ? walletLook(id, X) : jacketLook(id, X);
  const set = (ks, v) => { B.setValue(P(...ks), v); redraw(); };
  const field = (k, el, ks) => h('div', { class: `b-field ${ks && B.changed(P(...ks)) ? 'ch' : ''}` }, lab(`gear.f.${k}`), el, ks && P(...ks) in B.draft.changes ? btn('↺', () => { B.revert(P(...ks)); redraw(); }, null, 'small b-revert') : h('span'));
  const text = (ks, v) => h('input', { type: 'text', value: v ?? '', onchange: (e) => set(ks, e.target.value) });
  const num = (ks, v, lo = 0, hi = 1e12, step = 1) => h('input', { type: 'number', min: lo, max: hi, step, value: v ?? 0, style: { width: '110px' }, onchange: (e) => set(ks, Math.max(lo, Math.min(hi, Number(e.target.value) || 0))) });
  const bounded = (ks, v, b) => h('span', { class: 'row' }, h('input', { type: 'range', min: LOOK_BOUNDS[b][0], max: LOOK_BOUNDS[b][1], step: 1, value: v, oninput: (e) => set(ks, Number(e.target.value)) }), h('b', { class: 'num', text: String(v) }));
  const select = (ks, list, v) => h('select', { onchange: (e) => set(ks, e.target.value === '' ? null : e.target.value) }, ...list.map(([k, l]) => h('option', { value: k ?? '', text: l, ...(String(k ?? '') === String(v ?? '') ? { selected: 'selected' } : {}) })));
  const colour = (ks, v) => h('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(v || '') ? v : '#888888', oninput: (e) => set(ks, e.target.value) });
  const check = (ks, v) => h('input', { type: 'checkbox', ...(v ? { checked: 'checked' } : {}), onchange: (e) => set(ks, e.target.checked) });
  // every finish, as a swatch in this piece's colour: click one to make the piece of it
  const mats = (ks, cur, col) => h('div', { class: 'row wrap fin-pick' }, ...Object.entries(FINISHES).map(([k, F]) => { const sw = finishOn(h('span', { class: 'fin-swatch' }), { m: k, color: col });
    const b = btn('', () => set(ks, k), `<b>${F.name}</b><p>${F.text}</p>`, `small fin-btn ${cur === k ? 'on' : ''}`); b.append(sw, h('small', { text: F.name })); return guided(b, 'build-option'); }));
  const syms = [[null, t('gear.symbol.none')], ...Object.keys(SYMBOLS).map((k) => [k, k])];
  const lookFields = [
    h('span', { class: 'cap', text: t('gear.part.made') }),
    field('mat', mats(['look', 'mat'], L.mat, L.color), ['look', 'mat']),
    field('color', colour(['look', 'color'], L.color), ['look', 'color']),
    field('glint', check(['look', 'glint'], L.glint), ['look', 'glint']), field('sparkle', check(['look', 'sparkle'], L.sparkle), ['look', 'sparkle']),
    h('span', { class: 'cap', text: t('gear.part.cut') }),
    ...(wallet ? [field('trim', colour(['look', 'trim'], L.trim || L.color), ['look', 'trim']), field('clasp', select(['look', 'clasp'], Object.entries(WALLET_CLASPS), L.clasp), ['look', 'clasp']),
      field('stitch', check(['look', 'stitch'], L.stitch), ['look', 'stitch']), field('flap', bounded(['look', 'flap'], L.flap, 'flap'), ['look', 'flap']), field('round', bounded(['look', 'round'], L.round, 'round'), ['look', 'round'])]
      : [field('lining', colour(['look', 'lining'], L.lining || '#000000'), ['look', 'lining']), field('collar', select(['look', 'collar'], Object.entries(JACKET_COLLARS), L.collar), ['look', 'collar']),
        field('buttons', bounded(['look', 'buttons'], L.buttons, 'buttons'), ['look', 'buttons']), field('length', bounded(['look', 'length'], L.length, 'length'), ['look', 'length'])]),
    h('span', { class: 'cap', text: t('gear.part.emblem') }),
    field('symbol', select(['look', 'symbol', 'id'], syms, L.symbol?.id || null), ['look', 'symbol']),
    L.symbol ? field('symbolColor', colour(['look', 'symbol', 'color'], L.symbol.color), ['look', 'symbol', 'color']) : null,
    L.symbol ? field('symbolMat', select(['look', 'symbol', 'mat'], [[null, t('gear.symbol.plain')], ...Object.entries(FINISHES).map(([k, F]) => [k, F.name])], L.symbol.mat || null), ['look', 'symbol', 'mat']) : null];
  const rules = wallet ? [
    field('name', text(['name'], X.name), ['name']),
    field('slots', bounded(['slots'], Math.min(LOOK_BOUNDS.slots[1], X.slots ?? 0), 'slots'), ['slots']), field('passes', bounded(['passes'], Math.max(1, Math.min(LOOK_BOUNDS.passes[1], X.passes ?? 1)), 'passes'), ['passes']),
    field('keep', bounded(['keep'], Math.max(LOOK_BOUNDS.keep[0], Math.min(LOOK_BOUNDS.keep[1], X.keep ?? 10)), 'keep'), ['keep']),
    field('price', num(['price'], X.price), ['price']), field('level', num(['level'], X.level, 0, 4), ['level']), field('crown', check(['crown'], X.crown), ['crown'])]
    : [field('name', text(['name'], X.name), ['name']), field('effect', text(['effect'], X.effect), ['effect']),
      field('mods', h('div', { class: 'row wrap' }, ...STATS.map((k) => h('label', { class: 'b-check' }, D.STATS[k]?.name || k, h('input', { type: 'number', min: -3, max: 3, step: 1, value: X.mods?.[k] ?? 0, style: { width: '52px' },
        onchange: (e) => { const m = { ...(X.mods || {}) }, n = Math.max(-3, Math.min(3, Math.round(Number(e.target.value) || 0))); if (n) m[k] = n; else delete m[k]; set(['mods'], m); } })))), ['mods']),
      field('cls', select(['cls'], [[null, t('maker.anyClass')], ...Object.entries(D.CLASSES).map(([k, K]) => [k, K.name])], X.cls || null), ['cls']),
      field('price', num(['price'], X.price), ['price']), field('level', num(['level'], X.level, 0, 4), ['level'])];
  const preview = h('div', { class: 'gear-preview' }, wallet ? walletEl(id) : jacketEl(id));
  return h('div', { class: 'b-maker' }, h('div', { class: 'b-fields' }, h('span', { class: 'cap', text: t('gear.part.rules') }), ...rules, ...lookFields.filter(Boolean)),
    h('div', {}, h('span', { class: 'cap', text: t('maker.preview') }), preview, h('p', { class: 'sub', text: t(wallet ? 'gear.preview.wallet' : 'gear.preview.jacket') })));
}
