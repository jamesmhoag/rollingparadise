// Build mode: the gameplay tuner (row 15). The numbers behind the game's systems, section by section, plus links to
// the tables that tune the rest (drinks, wallets, jackets, sports, odds, chip tiers, floors). Edits go into the
// build draft, and export with everything else.
import { h, btn } from './core.js';
import * as D from '../data.js';
import * as B from '../build/draft.js';
import { t } from '../text.js';

// the tables each section also depends on, opened in the table editor
const RELATED = {
  wager: ['TILTS', 'FLOORS'], penalty: [], shops: ['CHIP_TIERS', 'SHOP_CHIPS', 'DICE_SHOP', 'MELT', 'CASTS', 'DYES', 'PACKS', 'DRINKS'],
  rooms: [], tables: ['BASE_DIMS', 'FLOORS'], drinks: ['DRINKS'], book: ['SPORTS', 'ODDS'], gear: ['WALLETS', 'JACKETS', 'PASSES', 'CARDS'],
};
export const TUNER_SECTIONS = [...Object.keys(D.TUNING), 'gear'];

export function tuner(section, redraw, openTable) {
  const T = D.TUNING[section] || {}, base = D.subPath('TUNING', section), P = (k) => D.subPath(base, k);
  const set = (k, v) => { B.setValue(P(k), v); redraw(); };
  const row = (k, el) => h('div', { class: `b-field ${B.changed(P(k)) ? 'ch' : ''}` }, h('label', { text: t(`tuner.${section}.${k}`) }), el,
    P(k) in B.draft.changes ? btn('↺', () => { B.revert(P(k)); redraw(); }, t('build.revert.tip', { was: JSON.stringify(B.draft.orig[P(k)]) }), 'small b-revert') : h('span'));
  const input = (k, v) => {
    if (typeof v === 'boolean') return h('input', { type: 'checkbox', ...(v ? { checked: 'checked' } : {}), onchange: (e) => set(k, e.target.checked) });
    if (Array.isArray(v)) return h('div', { class: 'b-checks' }, [1, 2, 3, 4].map((n) => h('label', { class: 'b-check' },
      h('input', { type: 'checkbox', ...(v.includes(n) ? { checked: 'checked' } : {}), onchange: (e) => set(k, e.target.checked ? [...v, n].sort() : v.filter((x) => x !== n)) }), D.FLOORS[n].name)));
    return h('input', { type: 'number', step: 'any', value: v, onchange: (e) => { const n = Number(e.target.value); if (Number.isFinite(n)) set(k, n); } });
  };
  const fields = section === 'gear' ? [h('p', { class: 'sub', text: t('tuner.gear.note') })] : Object.entries(T).map(([k, v]) => row(k, input(k, v)));
  return h('div', { class: 'b-maker' },
    h('div', { class: 'b-fields' }, h('p', { class: 'sub', text: t(`tuner.${section}.about`) }), ...fields),
    h('div', {}, (RELATED[section] || []).length ? h('span', { class: 'cap', text: t('tuner.related') }) : null,
      h('div', { class: 'b-related' }, ...(RELATED[section] || []).filter((tb) => D.TABLES[tb]).map((tb) => btn(t(`build.table.${tb}`), () => openTable(tb), null, 'small')))));
}
