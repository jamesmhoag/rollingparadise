// Build mode: the trick maker. Every trick opens here; made tricks (roll.k 'chips') are edited part by part, and
// tricks with a classic roll effect can be converted. Changes go into the build draft like any other edit.
import { h, lab, btn, toast } from './core.js';
import * as D from '../data.js';
import * as B from '../build/draft.js';
import { trickTip } from './parts.js';
import { flavorField } from './rostermaker.js';
import { FOOTPRINT, HEIGHT } from '../content/chipmaker.js';
import { t } from '../text.js';
import { CONVERT, PLACE, DEPLOY, BONUS, AIMS, ZONES, CLASSIC, NEW_TRICK } from '../content/trickmaker.js';
import { isMade, makeName, makeKind, makeChoices, describeRoll, describeBonus, isFxChip, DIST_OF } from '../trickmaker.js';

const path = (id, ...ks) => ks.reduce((p, k) => D.subPath(p, k), D.subPath('TRICKS', id));
const opts = (o, f = (v) => v) => Object.entries(o).map(([k, v]) => [k, typeof v === 'string' ? v : f(v)]);

// keep a made trick's card text in step with its configuration
function rewrite(id) {
  const def = D.TRICKS[id]; if (!isMade(def)) return;
  B.setValue(path(id, 'dist'), DIST_OF[def.roll.deploy] || 'hit');
  B.setValue(path(id, 'roll', 'text'), describeRoll(def)); B.setValue(path(id, 'bonus', 'text'), describeBonus(def));
}
export function newTrick() {
  const id = (globalThis.prompt?.(t('maker.newId'), 'my_trick') || '').trim();
  if (!id) return null; if (!/^\w+$/.test(id)) { toast(t('build.duplicate.badId'), 'warn'); return null; }
  if (D.TRICKS[id]) { toast(t('build.duplicate.taken', { id }), 'warn'); return null; }
  B.setValue(D.subPath('TRICKS', id), JSON.parse(JSON.stringify(NEW_TRICK))); rewrite(id); return id;
}

export function trickMaker(id, redraw) {
  const def = D.TRICKS[id]; if (!def) return h('p', { class: 'sub', text: t('maker.none') });
  const set = (ks, v) => { B.setValue(path(id, ...ks), v); rewrite(id); redraw(); };
  const field = (label, el, ks) => h('div', { class: `b-field ${ks && B.changed(path(id, ...ks)) ? 'ch' : ''}` }, h('label', {}, label), el,
    ks && path(id, ...ks) in B.draft.changes ? btn('↺', () => { B.revert(path(id, ...ks)); rewrite(id); redraw(); }, null, 'small b-revert') : h('span'));
  const select = (ks, list, value, num) => h('select', { onchange: (e) => set(ks, e.target.value === '' ? null : e.target.value === 'true' ? true : e.target.value === 'false' ? false : num ? Number(e.target.value) : e.target.value) },
    list.map(([v, l]) => h('option', { value: v ?? '', ...(String(v ?? '') === String(value ?? '') ? { selected: 'selected' } : {}), text: l })));
  const number = (ks, value, min = 0) => h('input', { type: 'number', min, step: 1, value: value ?? '', onchange: (e) => set(ks, Math.max(min, Math.round(Number(e.target.value) || 0))) });
  const text = (ks, value) => h('input', { type: 'text', value, onchange: (e) => set(ks, e.target.value) });

  // the Bonus condition: a named pattern, or a total over/under a number
  const cond = def.bonus.cond, [ck, cn] = cond.includes(':') ? cond.split(':') : [cond, ''];
  const condEl = h('div', { class: 'row' }, select(['bonus', 'cond'], [...Object.entries(D.CONDS).map(([k, v]) => [k, v]), ['over', t('maker.cond.over')], ['under', t('maker.cond.under')]].map(([k, v]) => [k === 'over' || k === 'under' ? `${k}:${cn || 8}` : k, v]), ck === 'over' || ck === 'under' ? `${ck}:${cn}` : ck),
    ck === 'over' || ck === 'under' ? h('input', { type: 'number', min: 1, value: cn, style: { width: '70px' }, onchange: (e) => set(['bonus', 'cond'], `${ck}:${Math.max(1, Number(e.target.value) || 1)}`) }) : null);

  const parts = [
    h('span', { class: 'cap', text: t('maker.part.card') }),
    field(lab('maker.name'), text(['name'], def.name), ['name']),
    flavorField('TRICKS', id, redraw),
    field(lab('maker.type'), select(['type'], opts(D.TYPES, (x) => x.name), def.type), ['type']),
    field(lab('maker.cls'), select(['cls'], [[null, t('maker.anyClass')], ...opts(D.CLASSES, (x) => x.name)], def.cls), ['cls']),
    field(lab('maker.die'), select(['die'], D.COMPLEXITY.concat(Object.keys(D.DICE).filter((k) => !D.COMPLEXITY.includes(k))).map((k) => [k, k]), def.die), ['die']),
    field(lab('maker.count'), number(['count'], def.count, 1), ['count']),
    field(lab('maker.quality'), select(['q'], [[null, t('maker.quality.auto', { v: D.QNAME[D.rateTrick(def)] })], ...[1, 2, 3, 4].map((q) => [q, t('maker.quality.set', { v: D.QNAME[q] })])], def.q ?? null, true), ['q']),
    h('span', { class: 'cap', text: t('maker.part.aim') }),
    field(lab('maker.zone'), select(['side'], opts(ZONES), def.side), ['side']),
    field(lab('maker.aim'), select(['approach'], [...opts(AIMS), ['none', t('maker.aim.none')]], def.approach), ['approach']),
  ];
  if (isMade(def)) {
    const R = def.roll, fee = makeKind(R.chip) === 'fee';
    parts.push(h('span', { class: 'cap', text: t('maker.part.chips') }),
      field(lab('maker.chip'), select(['roll', 'chip'], makeChoices().map((k) => [k, makeName(k)]), R.chip), ['roll', 'chip']),
      field(lab('maker.convert'), select(['roll', 'convert'], opts(CONVERT, (x) => `${x.name} — ${x.text}`), R.convert), ['roll', 'convert']),
      fee ? null : field(lab('maker.place'), select(['roll', 'place'], opts(PLACE, (x) => `${x.name} — ${x.text}`), R.place), ['roll', 'place']),
      !fee && R.place === 'precise' ? field(lab('maker.at'), number(['roll', 'at'], R.at ?? 1), ['roll', 'at']) : null,
      field(lab('maker.deploy'), select(['roll', 'deploy'], opts(DEPLOY, (x) => `${x.name} — ${x.text}`), R.deploy), ['roll', 'deploy']),
      null);
    if (D.MADE_CHIPS[R.chip]) { // the size of the chip this trick makes: its width, its thickness, and whether it slips under stacks
      const M = D.MADE_CHIPS[R.chip], foot = R.foot && R.foot !== 'model' ? R.foot : M.foot || 'basic';
      parts.push(field(lab('maker.foot'), select(['roll', 'foot'], [['model', t('maker.foot.model', { v: FOOTPRINT[M.foot || 'basic'] })], ...Object.entries(FOOTPRINT)], R.foot || 'model'), ['roll', 'foot']),
        field(lab('maker.flat'), select(['roll', 'flat'], [[false, t('maker.flat.no', { v: HEIGHT[M.height || 'basic']?.name })], [true, t('maker.flat.yes')]], !!R.flat), ['roll', 'flat']),
        foot !== 'basic' ? field(lab('maker.slip'), select(['roll', 'slip'], [[false, t('maker.slip.no')], [true, t('maker.slip.yes')]], !!(R.slip ?? M.slip)), ['roll', 'slip']) : null);
    }
  } else {
    parts.push(h('span', { class: 'cap', text: t('maker.part.classic') }),
      h('p', { html: `<b>${CLASSIC[def.roll.k] || def.roll.k}</b> — ${def.roll.text}` }),
      h('p', { class: 'sub', text: t('maker.classic.note') }),
      btn(t('maker.convertBtn'), () => { const was = def.roll.text; B.setValue(path(id, 'roll'), { ...NEW_TRICK.roll, chip: def.roll.k === 'fee' ? 'debt' : 'block', text: was });
        if (!BONUS[def.bonus.k]) B.setValue(path(id, 'bonus', 'k'), 'double'); rewrite(id); redraw(); }, t('maker.convertBtn.tip'), 'small'));
  }
  const b = def.bonus, bk = isMade(def) ? b.k : null;
  parts.push(h('span', { class: 'cap', text: t('maker.part.bonus') }), field(lab('maker.cond'), condEl, ['bonus', 'cond']));
  if (isMade(def)) {
    parts.push(field(lab('maker.bonusFx'), select(['bonus', 'k'], opts(BONUS, (x) => x.name), bk), ['bonus', 'k']),
      bk === 'multiply' ? field(lab('maker.times'), number(['bonus', 'x'], b.x ?? 2, 2), ['bonus', 'x']) : null,
      bk === 'extra' ? field(lab('maker.extraChip'), select(['bonus', 'chip'], makeChoices().filter((k) => makeKind(k) !== 'fee').map((k) => [k, makeName(k)]), b.chip ?? 'block'), ['bonus', 'chip']) : null,
      bk === 'extra' ? field(lab('maker.extraN'), number(['bonus', 'n'], b.n ?? 1, 1), ['bonus', 'n']) : null);
  } else parts.push(h('p', { html: `<b>${b.k}</b> — ${b.text}` }));

  const card = h('div', { class: 'b-card' }); card.innerHTML = trickTip({ id, q: 1 }, def.cls || 'hustler');
  return h('div', { class: 'b-maker' }, h('div', { class: 'b-fields' }, parts), h('div', {}, h('span', { class: 'cap', text: t('maker.preview') }), card,
    isMade(def) ? h('p', { class: 'sub', text: t('maker.preview.note') }) : null));
}
