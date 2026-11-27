// Build mode: the gameplay tuner (row 15). The numbers behind the game's systems, section by section, plus links to
// the tables that tune the rest (drinks, wallets, jackets, sports, odds, chip tiers, floors). Edits go into the
// build draft, and export with everything else.
import { h, btn, lab } from './core.js';
import * as D from '../data.js';
import * as B from '../build/draft.js';
import { draftForm, numIn } from './form.js';
import { t } from '../text.js';
import { LASTS } from '../content/chipmaker.js';

// fields that pick one of a few words: the choices for each section
const CHOICES = { chipLife: ['paid', 'turn', 'match'] };
const choiceName = (section, v) => (section === 'chipLife' ? LASTS[v]?.name : null) || v;

// the tables each section also depends on, opened in the table editor
const RELATED = {
  wager: ['TILTS', 'FLOORS'], penalty: [], shops: ['CHIP_TIERS', 'SHOP_CHIPS', 'DICE_SHOP', 'MELT', 'CASTS', 'DYES', 'PACKS', 'DRINKS'],
  rooms: [], tables: ['BASE_DIMS', 'FLOORS'], chipLife: ['SHOP_CHIPS', 'CHIPS'], drinks: ['DRINKS'], book: ['SPORTS', 'ODDS'], gear: ['WALLETS', 'JACKETS', 'PASSES', 'CARDS'],
};
export const TUNER_SECTIONS = [...Object.keys(D.TUNING), 'gear'];

export function tuner(section, redraw, openTable) {
  const T = D.TUNING[section] || {}, F = draftForm(D.subPath('TUNING', section), redraw);
  const row = (k, el) => F.field(lab(`tuner.${section}.${k}`), el, [k]);
  const input = (k, v) => {
    if (typeof v === 'boolean') return F.check([k], v);
    if (Array.isArray(v)) return F.checks([k], [1, 2, 3, 4].map((n) => [n, D.FLOORS[n].name]), v, { sort: true });
    if (typeof v === 'string') return F.select([k], (CHOICES[section] || [v]).map((o) => [o, choiceName(section, o)]), v, { parse: (x) => x });
    return numIn(v, (n) => n != null && F.set([k], n), { step: 'any' });
  };
  const fields = section === 'gear' ? [h('p', { class: 'sub', text: t('tuner.gear.note') })] : Object.entries(T).map(([k, v]) => row(k, input(k, v)));
  return h('div', { class: 'b-maker' },
    h('div', { class: 'b-fields' }, h('p', { class: 'sub', text: t(`tuner.${section}.about`) }), ...fields),
    h('div', {}, (RELATED[section] || []).length ? h('span', { class: 'cap', text: t('tuner.related') }) : null,
      h('div', { class: 'b-related' }, ...(RELATED[section] || []).filter((tb) => D.TABLES[tb]).map((tb) => btn(t(`build.table.${tb}`), () => openTable(tb), null, 'small')))));
}
