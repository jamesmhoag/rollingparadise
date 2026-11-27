// Build mode: Cards. Every card in the game by kind (content/cards.js): discount, punch and membership cards for each
// shop, Suite Keys (one design a floor: the key itself is a pass, named for its room), notes, trading cards and the rest, and the High
// Rollers' business cards (their traits). New discount, punch, membership, note and trading cards are made here. Each
// card's rule is written from its numbers; its print (colours, pattern, border, symbols, ink, font) is designed here
// with a preview. The Dodgy Corner page sets which cards turn up there and how often.
import { h, btn, lab, toast, guided } from './core.js';
import { cardEl, cardRule, cardTip, shopName } from './parts.js';
import { symbolPicker } from './neonmaker.js';
import { flavorField } from './rostermaker.js';
import { traitRule } from '../bout.js';
import * as D from '../data.js';
import * as B from '../build/draft.js';
import { t } from '../text.js';
import { NEW_CARD, CARD_PATTERNS, CARD_BORDERS, CARD_EDGE_AT } from '../content/cards.js';

export const CORNER = '@corner';
const MAKE = ['discount', 'punch', 'membership', 'note', 'trading'];
// the list: grouped by kind, then the business cards
export function cardList(sel, pick, filter = '') {
  const hit = (k, name) => !filter || `${k} ${name}`.toLowerCase().includes(filter);
  const item = (k, name, sub) => h('button', { class: `b-item ${sel === k ? 'on' : ''} ${B.changed(D.subPath('CARDS', k)) ? 'ch' : ''}`, onclick: () => pick(k) }, h('b', { text: name }), h('small', { text: sub }));
  const groups = D.CARD_KINDS.map((kind) => [kind, Object.keys(D.CARDS).filter((k) => D.CARDS[k] && (D.CARDS[k].kind || 'other') === kind && hit(k, D.CARDS[k].name))]);
  return [h('div', { class: 'row wrap' }, ...MAKE.map((kind) => btn(t(`cards.new.${kind}`), () => { const id = newCard(kind); if (id) pick(id); }, t('cards.new.tip', { kind: t(`card.kind.${kind}`) }), 'small go'))),
    h('button', { class: `b-item ${sel === CORNER ? 'on' : ''}`, onclick: () => pick(CORNER) }, h('b', { text: t('cards.corner') }), h('small', { text: t('cards.corner.sub', { n: D.FIND_CARDS.length }) })),
    ...groups.flatMap(([kind, ids]) => (ids.length ? [h('span', { class: 'cap', text: t(`cards.group.${kind}`) }), ...ids.map((k) => item(k, D.CARDS[k].name, D.CARDS[k].shop ? shopName(D.CARDS[k].shop) : D.CARDS[k].kind === 'key' ? D.FLOORS[D.CARDS[k].floor]?.name || '' : k))] : [])),
    h('span', { class: 'cap', text: t('cards.group.business') }), ...Object.entries(D.BOSS_TRAITS).filter(([k, T]) => hit(k, T.name)).map(([k, T]) => item(`biz:${k}`, T.name, T.title))];
}
export function newCard(kind) {
  const id = (globalThis.prompt?.(t('cards.newId'), `${kind}_new`) || '').trim();
  if (!id) return null; if (!/^\w+$/.test(id)) { toast(t('build.duplicate.badId'), 'warn'); return null; }
  if (D.CARDS[id]) { toast(t('build.duplicate.taken', { id }), 'warn'); return null; }
  B.setValue(D.subPath('CARDS', id), JSON.parse(JSON.stringify(NEW_CARD[kind]))); B.setValue(D.subPath(D.subPath('FLAVOR', 'CARDS'), id), ''); return id;
}

export function cardMaker(id, redraw, openTable) {
  if (id === CORNER) return cornerPage(redraw);
  if (id?.startsWith('biz:')) return bizPage(id.slice(4), redraw, openTable);
  const C = D.CARDS[id]; if (!C) return h('p', { class: 'sub', text: t('maker.none') });
  const base = D.subPath('CARDS', id), P = (...ks) => ks.reduce((p, k) => D.subPath(p, k), base);
  const set = (ks, v) => { B.setValue(P(...ks), v); redraw(); };
  const field = (key, el, ks) => h('div', { class: `b-field ${ks && B.changed(P(...ks)) ? 'ch' : ''}` }, lab(`cards.f.${key}`), el,
    ks && P(...ks) in B.draft.changes ? btn('↺', () => { B.revert(P(...ks)); redraw(); }, null, 'small b-revert') : h('span'));
  const select = (ks, list, value) => h('select', { onchange: (e) => set(ks, e.target.value) }, ...list.map(([v, l]) => h('option', { value: v, text: l, ...(String(v) === String(value) ? { selected: 'selected' } : {}) })));
  const num = (ks, value, o = {}) => h('input', { type: 'number', step: o.step || 1, min: o.min ?? 0, value: value ?? '', style: { width: o.w || '80px' }, onchange: (e) => set(ks, e.target.value === '' ? null : Number(e.target.value)) });
  const text = (ks, value, long) => h(long ? 'textarea' : 'input', { ...(long ? { rows: 3, text: value || '' } : { type: 'text', value: value || '' }), onchange: (e) => set(ks, e.target.value) });
  const check = (ks, value) => h('input', { type: 'checkbox', ...(value ? { checked: 'checked' } : {}), onchange: (e) => set(ks, e.target.checked) });
  const colour = (ks, value) => h('input', { type: 'color', value: value || '#ffffff', onchange: (e) => set(ks, e.target.value) });
  const L = C.look || {}, kind = C.kind || 'other', shops = D.CARD_SHOPS.map((k) => [k, shopName(k)]);
  // what a punch card's free item can be: anything, or one thing that shop sells
  const freeOpts = () => [['any', t('card.free.any')], ...(C.shop === 'lounge' ? D.DRINKS.map((d) => [d.id, d.name]) : C.shop === 'exchange' ? D.SHOP_IDS().map((k) => [k, D.SHOP_CHIPS[k].name])
    : C.shop === 'dice' || C.shop === 'diesmith' ? D.COMPLEXITY.map((k) => [k, k]) : C.shop === 'trader' ? Object.entries(D.TRICKS).map(([k, T]) => [k, T.name]) : [])];
  const pctOf = (w) => { const tot = D.FIND_CARDS.reduce((n, k) => n + (D.CARDS[k].corner || 0), 0) + (D.SHADY.nothing || 0); return tot ? Math.round((100 * (w || 0)) / tot) : 0; };
  const rule = [
    field('name', text(['name'], C.name), ['name']),
    h('div', { class: 'b-field' }, lab('cards.f.kind'), h('b', { text: t(`card.kind.${kind}`) }), h('span')),
    ['discount', 'punch', 'membership'].includes(kind) ? field('shop', select(['shop'], shops, C.shop), ['shop']) : null,
    kind === 'discount' || kind === 'membership' ? field('pct', num(['pct'], C.pct, { max: 100 }), ['pct']) : null,
    kind === 'punch' ? field('punches', num(['punches'], C.punches, { min: 1 }), ['punches']) : null,
    kind === 'punch' ? field('per', select(['per'], [['purchase', t('cards.per.purchase')], ['visit', t('cards.per.visit')]], C.per || 'purchase'), ['per']) : null,
    kind === 'punch' ? field('free', select(['free'], freeOpts(), C.free || 'any'), ['free']) : null,
    kind === 'membership' ? field('early', num(['early'], C.early), ['early']) : null,
    kind === 'membership' ? field('earn', num(['earn', 'buys'], C.earn?.buys, { min: 0 }), ['earn']) : null,
    kind === 'membership' ? membersOnly(C.shop, redraw) : null,
    kind === 'key' ? field('floor', select(['floor'], [1, 2, 3, 4].map((f) => [f, D.FLOORS[f]?.name || f]), C.floor), ['floor']) : null,
    ['note', 'trading', 'other'].includes(kind) ? field('text', text(['text'], C.text, true), ['text']) : null,
    field('starter', check(['starter'], C.starter), ['starter']),
    field('corner', h('div', { class: 'row' }, num(['corner'], C.corner, { step: 0.01 }), h('small', { class: 'dim', text: C.corner ? t('cards.corner.pct', { pct: pctOf(C.corner) }) : t('cards.corner.never') })), ['corner']),
    flavorField('CARDS', id, redraw)];
  const LP = (k) => ['look', k];
  const design = [
    h('span', { class: 'cap', text: t('cards.design') }),
    field('bg', h('div', { class: 'row' }, ...[0, 1].map((i) => h('input', { type: 'color', value: (L.bg || [])[i] || '#888888', onchange: (e) => { const bg = [...(L.bg || ['#888888', '#444444'])]; bg[i] = e.target.value; set(LP('bg'), bg); } }))), LP('bg')),
    field('pattern', select(LP('pattern'), CARD_PATTERNS.map((k) => [k, t(`cards.pattern.${k}`)]), L.pattern || 'plain'), LP('pattern')),
    field('border', select(LP('border'), CARD_BORDERS.map((k) => [k, t(`cards.border.${k}`)]), L.border || 'plain'), LP('border')),
    field('borderColor', colour(LP('borderColor'), L.borderColor), LP('borderColor')),
    field('symbol', symbolPicker(L.symbol, (g) => set(LP('symbol'), g)), LP('symbol')),
    field('symColor', colour(LP('symColor'), L.symColor), LP('symColor')),
    field('edgeAt', select(LP('edgeAt'), CARD_EDGE_AT.map((k) => [k, t(`cards.edgeAt.${k}`)]), L.edgeAt || 'none'), LP('edgeAt')),
    L.edgeAt && L.edgeAt !== 'none' ? field('edge', symbolPicker(L.edge, (g) => set(LP('edge'), g)), LP('edge')) : null,
    L.edgeAt && L.edgeAt !== 'none' ? field('edgeColor', colour(LP('edgeColor'), L.edgeColor), LP('edgeColor')) : null,
    field('ink', colour(LP('ink'), L.ink), LP('ink')),
    field('font', select(LP('font'), [['display', t('cards.font.display')], ['script', t('cards.font.script')], ['body', t('cards.font.body')]], L.font || 'display'), LP('font'))];
  const big = cardEl(id, 'big'); big._tip = () => cardTip(id); big.classList.add('has-tip');
  return h('div', { class: 'b-maker' }, h('div', { class: 'b-fields' }, h('span', { class: 'cap', text: t('cards.rule') }), ...rule, ...design),
    h('div', { class: 'col' }, h('span', { class: 'cap', text: t('maker.preview') }), h('div', { class: 'card-preview' }, big), h('p', { class: 'sub', text: cardRule(id) }),
      h('p', { class: 'dim', text: t(C.kind === 'key' ? 'cards.on.pass' : 'cards.on.wallet') })));
}
// the shop's members-only items, switched on and off here (they are kept on the items themselves)
function membersOnly(shop, redraw) {
  const list = shop === 'exchange' ? D.SHOP_IDS().map((k) => [D.subPath(D.subPath('SHOP_CHIPS', k), 'members'), D.SHOP_CHIPS[k].name, !!D.SHOP_CHIPS[k].members])
    : shop === 'lounge' ? D.DRINKS.map((d, i) => [D.subPath(D.subPath('DRINKS', i), 'members'), d.name, !!d.members]) : null;
  if (!list) return h('div', { class: 'b-field' }, lab('cards.f.members'), h('small', { class: 'dim', text: shop === 'trader' ? t('cards.members.trader') : t('cards.members.none') }), h('span'));
  return h('div', { class: 'b-field' }, lab('cards.f.members'), h('div', { class: 'b-checks' }, ...list.map(([path, name, on]) => h('label', { class: 'b-check' },
    h('input', { type: 'checkbox', ...(on ? { checked: 'checked' } : {}), onchange: (e) => { B.setValue(path, e.target.checked || null); redraw(); } }), name))), h('span'));
}
// the Dodgy Corner: each card's chance, and the chance of finding nothing
function cornerPage(redraw) {
  const ids = Object.keys(D.CARDS).filter((k) => D.CARDS[k]), tot = ids.reduce((n, k) => n + (D.CARDS[k].corner || 0), 0) + (D.SHADY.nothing || 0);
  const pct = (w) => (tot ? `${((100 * (w || 0)) / tot).toFixed(1)}%` : '0%');
  const num = (path, v) => h('input', { type: 'number', step: 0.01, min: 0, value: v ?? 0, style: { width: '80px' }, onchange: (e) => { B.setValue(path, Number(e.target.value) || 0); redraw(); } });
  return h('div', { class: 'b-maker' }, h('div', { class: 'b-fields' }, h('p', { class: 'sub', text: t('cards.corner.about') }),
    h('div', { class: 'b-field' }, lab('cards.corner.nothing'), h('div', { class: 'row' }, num('SHADY.nothing', D.SHADY.nothing), h('small', { class: 'dim', text: pct(D.SHADY.nothing) })), h('span')),
    h('table', { class: 'b-shop' }, h('tr', {}, h('th', { text: t('cards.corner.card') }), h('th', { text: t('cards.corner.weight') }), h('th', { text: t('cards.corner.chance') })),
      ...ids.map((k) => { const c = cardEl(k, 'mini'); c._tip = () => cardTip(k); c.classList.add('has-tip');
        return h('tr', {}, h('td', {}, h('span', { class: 'row' }, c, h('b', { text: D.CARDS[k].name }))), h('td', {}, num(D.subPath(D.subPath('CARDS', k), 'corner'), D.CARDS[k].corner)), h('td', { text: D.CARDS[k].corner ? pct(D.CARDS[k].corner) : '—' })); }))), h('div'));
}
// a High Roller's business card: their trait (its rule written from its numbers), title and flavour
function bizPage(id, redraw, openTable) {
  const T = D.BOSS_TRAITS[id]; if (!T) return h('p', { class: 'sub', text: t('maker.none') });
  const tableBtn = () => btn(t('cards.biz.table'), () => openTable('BOSS_TRAITS'), t('cards.biz.table.tip'), 'small');
  const P = (k) => D.subPath(D.subPath('BOSS_TRAITS', id), k), text = (k, long) => h(long ? 'textarea' : 'input', { ...(long ? { rows: 3, text: T[k] || '' } : { type: 'text', value: T[k] || '' }), onchange: (e) => { B.setValue(P(k), e.target.value); redraw(); } });
  const field = (k, el) => h('div', { class: `b-field ${B.changed(P(k)) ? 'ch' : ''}` }, lab(`cards.biz.${k}`), el, h('span'));
  const card = h('span', { class: 'gcard bizcard big', guide: 'boss-trait', tip: () => t('trait.card-tip', { name: '', title: T.title, trait: T.name, rule: traitRule(T), flavor: T.flavor }) }, h('em', { text: t('table.biz-card') }), h('b', { text: T.name }));
  const who = Object.entries(D.ROSTER).filter(([, X]) => X.trait === id).map(([, X]) => X.name);
  return h('div', { class: 'b-maker' }, h('div', { class: 'b-fields' }, h('p', { class: 'sub', text: t('cards.biz.about') }), field('name', text('name')), field('title', text('title')), field('flavor', text('flavor', true)),
    h('div', { class: 'b-field' }, lab('cards.biz.rule'), h('p', { html: traitRule(T) }), h('span')), h('div', { class: 'b-field' }, lab('cards.biz.who'), h('p', { text: who.join(', ') || t('cards.biz.nobody') }), h('span')),
    h('div', { class: 'row' }, guided(tableBtn(), 'build-option'))),
  h('div', { class: 'col' }, h('span', { class: 'cap', text: t('maker.preview') }), h('div', { class: 'card-preview' }, card)));
}
