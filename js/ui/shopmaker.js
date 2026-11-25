// Build mode: the Shops. Every shop's prices and stock, floor by floor, in one place (content/shops.js), with what
// each one sells laid out the way the player will see it on each floor: the price it will cost there and how many
// are in stock. A blank floor keeps the shop's default for it. The tables a shop sells from (chip tiers, the dice and
// their materials, drinks, foil packs) are linked from each page.
import { h, btn, lab, guided } from './core.js';
import { chipEl, dieEl } from './parts.js';
import * as D from '../data.js';
import * as B from '../build/draft.js';
import { t } from '../text.js';

export const SHOP_PAGES = ['exchange', 'dice', 'trader', 'lounge', 'smith', 'door'];
const RELATED = { exchange: ['SHOP_CHIPS', 'CHIP_TIERS'], dice: ['DICE_SHOP', 'MATERIALS', 'BONE'], trader: ['PACKS', 'CONDITIONS'], lounge: ['DRINKS'], smith: ['DICE', 'DYES', 'MELT'], door: ['ROLLERS'] };
const FLOORS = [1, 2, 3, 4];

export function shopMaker(page, redraw, openTable) {
  const base = D.subPath('SHOPS', page), S = D.SHOPS[page] || {};
  const relBtn = (tb) => btn(t(`build.table.${tb}`), () => openTable(tb), t('shops.related.tip'), 'small');
  const P = (...ks) => ks.reduce((p, k) => D.subPath(p, k), base);
  const revert = (path) => (path in B.draft.changes ? btn('↺', () => { B.revert(path); redraw(); }, t('build.revert.tip', { was: JSON.stringify(B.draft.orig[path]) ?? '—' }), 'small b-revert') : h('span'));
  const num = (v, on, ph = '', w = '64px') => h('input', { type: 'number', step: 'any', value: v ?? '', placeholder: ph, style: { width: w }, onchange: (e) => { const x = e.target.value.trim(); on(x === '' ? null : Number(x)); } });
  // a value for each floor: [f1, f2, f3, f4]
  const floors = (k) => { const v = S[k], arr = Array.isArray(v) ? v : FLOORS.map(() => v);
    return h('div', { class: `b-field ${B.changed(P(k)) ? 'ch' : ''}` }, lab(`shops.${page}.${k}`),
      h('div', { class: 'row b-floors' }, ...FLOORS.map((f, i) => h('label', { class: 'b-floor' }, h('small', { text: D.FLOORS[f]?.name || f }), num(arr[i], (x) => { const out = arr.slice(); out[i] = x ?? 0; B.setValue(P(k), out); redraw(); })))), revert(P(k))); };
  const one = (k) => { const v = S[k];
    return h('div', { class: `b-field ${B.changed(P(k)) ? 'ch' : ''}` }, lab(`shops.${page}.${k}`),
      typeof v === 'boolean' ? h('input', { type: 'checkbox', ...(v ? { checked: 'checked' } : {}), onchange: (e) => { B.setValue(P(k), e.target.checked); redraw(); } }) : num(v, (x) => { B.setValue(P(k), x ?? 0); redraw(); }, '', '90px'), revert(P(k))); };
  const head = h('div', { class: 'b-fields' }, h('p', { class: 'sub', text: t(`shops.${page}.about`) }), ...Object.entries(S).filter(([k]) => k !== 'chips').map(([k, v]) => (Array.isArray(v) ? floors(k) : one(k))));
  // what the player sees, floor by floor
  const cols = h('tr', {}, h('th', { text: t('shops.item') }), ...FLOORS.map((f) => h('th', { text: D.FLOORS[f]?.name || `${f}` })));
  let rows = [];
  if (page === 'exchange') rows = D.SHOP_IDS().sort((a, b) => D.SHOP_CHIPS[a].tier - D.SHOP_CHIPS[b].tier).map((id) => {
    const own = S.chips?.[id] || {}, path = (k) => D.subPath(D.subPath(P('chips'), id), k), X = D.SHOP_CHIPS[id], T = D.CHIP_TIERS[X.tier];
    const setOwn = (k, i, x) => { const arr = FLOORS.map((_, j) => own[k]?.[j] ?? null); arr[i] = x; B.setValue(path(k), arr.every((y) => y == null) ? null : arr); redraw(); };
    return h('tr', { class: B.changed(D.subPath(P('chips'), id)) ? 'ch' : '' }, h('td', {}, h('span', { class: 'row' }, chipEl({ kind: 'std', value: 1, resist: id }, 'sm'), h('b', { text: X.name }), h('small', { class: 'tier', style: { '--tc': T.color }, text: T.name }))),
      ...FLOORS.map((f, i) => { const open = f >= D.shopFloor(id);
        return h('td', { class: open ? '' : 'dim' }, open ? h('span', { class: 'col b-cell' },
          h('label', { class: 'row', guide: 'build-option', tip: t('shops.cell.price.tip') }, h('small', { text: '¢' }), num(own.price?.[i], (x) => setOwn('price', i, x), D.shopPrice(id, f), '70px')),
          h('label', { class: 'row', guide: 'build-option', tip: t('shops.cell.stock.tip') }, h('small', { text: '×' }), num(own.stock?.[i], (x) => setOwn('stock', i, x), D.shopStock(id, f), '70px'))) : h('small', { text: t('shops.notYet', { floor: D.shopFloor(id) }) })); })); });
  if (page === 'dice') rows = D.COMPLEXITY.flatMap((type) => [...D.BASIC_MATS, 'bone'].map((mat) => h('tr', {}, h('td', {}, h('span', { class: 'row' }, dieEl({ type, mat: mat === 'bone' ? 'bone' : mat, up: [] }, '', 'mini'), h('b', { text: `${type} ${mat === 'bone' ? t('shops.bone') : D.MATERIALS[mat]?.name || mat}` }))),
    ...FLOORS.map((f) => (f >= (D.DICE_SHOP.from[type] || 1) ? h('td', { text: `${Math.round(D.DICE_SHOP.base[type] * (mat === 'bone' ? D.DICE_SHOP.boneMult : D.DICE_SHOP.mat[mat] || 1) * D.perFloor(S.priceMult, f, 1))}¢ ×${D.perFloor(S.stock, f, 1)}` }) : h('td', { class: 'dim', text: '—' }))))));
  if (page === 'trader') rows = [1, 2, 3, 4].map((q) => h('tr', {}, h('td', { text: t('shops.trader.q', { q: D.QNAME[q] }) }), ...FLOORS.map((f) => h('td', { text: `${D.perFloor(S.price, f, 50) * q}¢ ×${D.perFloor(S.stock, f, 1)}` }))))
    .concat(D.PACKS.slice(1).map((Pk) => h('tr', {}, h('td', { text: Pk.name }), ...FLOORS.map((f) => (f >= Pk.floor ? h('td', { text: `${D.perFloor(S.packPrice, f, 200) * Pk.q}¢ ×${D.perFloor(S.packStock, f, 1)}` }) : h('td', { class: 'dim', text: '—' }))))));
  if (page === 'lounge') rows = D.DRINKS.map((d) => h('tr', {}, h('td', { text: d.name }), ...FLOORS.map((f) => h('td', { text: `${Math.round(d.cost * D.perFloor(S.priceMult, f, 1))}¢ ×${D.perFloor(S.stock, f, 3)}` }))));
  if (page === 'smith') rows = Object.entries(D.DICE).filter(([, X]) => X.forge).map(([k, X]) => h('tr', {}, h('td', { text: t('shops.smith.cast', { type: k }) }), ...FLOORS.map((f) => (f >= X.forge.floor ? h('td', { text: `${Math.round(X.forge.chips * D.perFloor(S.priceMult, f, 1))}¢` }) : h('td', { class: 'dim', text: '—' })))));
  if (page === 'door') rows = Object.entries(D.ROLLERS).map(([k, X]) => h('tr', {}, h('td', { text: X.name }), h('td', { colspan: 4, text: X.worth != null ? t('shops.door.own', { n: X.worth }) : t('shops.door.default', { n: S.welcome }) })));
  return h('div', { class: 'b-maker' }, h('div', {}, head, h('span', { class: 'cap', text: t('shops.preview') }), h('table', { class: 'b-shop' }, cols, ...rows)),
    h('div', {}, h('span', { class: 'cap', text: t('tuner.related') }), h('div', { class: 'b-related' }, ...(RELATED[page] || []).filter((tb) => D.TABLES[tb]).map((tb) => guided(relBtn(tb), 'build-option')))));
}
