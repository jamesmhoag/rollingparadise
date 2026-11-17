// Build mode: the trick maker. Every trick opens here; made tricks (roll.k 'chips') are edited part by part, and
// tricks with a classic roll effect can be converted. Changes go into the build draft like any other edit.
import { h, btn, toast } from './core.js';
import * as D from '../data.js';
import * as B from '../build/draft.js';
import { trickTip } from './parts.js';
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
  const field = (label, el, ks) => h('div', { class: `b-field ${ks && B.changed(path(id, ...ks)) ? 'ch' : ''}` }, h('label', { text: label }), el,
    ks && path(id, ...ks) in B.draft.changes ? btn('↺', () => { B.revert(path(id, ...ks)); rewrite(id); redraw(); }, null, 'small b-revert') : h('span'));
  const select = (ks, list, value, num) => h('select', { onchange: (e) => set(ks, e.target.value === '' ? null : num ? Number(e.target.value) : e.target.value) },
    list.map(([v, l]) => h('option', { value: v ?? '', ...(String(v ?? '') === String(value ?? '') ? { selected: 'selected' } : {}), text: l })));
  const number = (ks, value, min = 0) => h('input', { type: 'number', min, step: 1, value: value ?? '', onchange: (e) => set(ks, Math.max(min, Math.round(Number(e.target.value) || 0))) });
  const text = (ks, value) => h('input', { type: 'text', value, onchange: (e) => set(ks, e.target.value) });

  // the Bonus condition: a named pattern, or a total over/under a number
  const cond = def.bonus.cond, [ck, cn] = cond.includes(':') ? cond.split(':') : [cond, ''];
  const condEl = h('div', { class: 'row' }, select(['bonus', 'cond'], [...Object.entries(D.CONDS).map(([k, v]) => [k, v]), ['over', t('maker.cond.over')], ['under', t('maker.cond.under')]].map(([k, v]) => [k === 'over' || k === 'under' ? `${k}:${cn || 8}` : k, v]), ck === 'over' || ck === 'under' ? `${ck}:${cn}` : ck),
    ck === 'over' || ck === 'under' ? h('input', { type: 'number', min: 1, value: cn, style: { width: '70px' }, onchange: (e) => set(['bonus', 'cond'], `${ck}:${Math.max(1, Number(e.target.value) || 1)}`) }) : null);

  const parts = [
    h('span', { class: 'cap', text: t('maker.part.card') }),
    field(t('maker.name'), text(['name'], def.name), ['name']),
    field(t('maker.type'), select(['type'], opts(D.TYPES, (x) => x.name), def.type), ['type']),
    field(t('maker.cls'), select(['cls'], [[null, t('maker.anyClass')], ...opts(D.CLASSES, (x) => x.name)], def.cls), ['cls']),
    field(t('maker.die'), select(['die'], D.COMPLEXITY.concat(Object.keys(D.DICE).filter((k) => !D.COMPLEXITY.includes(k))).map((k) => [k, k]), def.die), ['die']),
    field(t('maker.count'), number(['count'], def.count, 1), ['count']),
    h('span', { class: 'cap', text: t('maker.part.aim') }),
    field(t('maker.zone'), select(['side'], opts(ZONES), def.side), ['side']),
    field(t('maker.aim'), select(['approach'], [...opts(AIMS), ['none', t('maker.aim.none')]], def.approach), ['approach']),
  ];
  if (isMade(def)) {
    const R = def.roll, fee = makeKind(R.chip) === 'fee';
    parts.push(h('span', { class: 'cap', text: t('maker.part.chips') }),
      field(t('maker.chip'), select(['roll', 'chip'], makeChoices().map((k) => [k, makeName(k)]), R.chip), ['roll', 'chip']),
      field(t('maker.convert'), select(['roll', 'convert'], opts(CONVERT, (x) => `${x.name} — ${x.text}`), R.convert), ['roll', 'convert']),
      fee ? null : field(t('maker.place'), select(['roll', 'place'], opts(PLACE, (x) => `${x.name} — ${x.text}`), R.place), ['roll', 'place']),
      !fee && R.place === 'precise' ? field(t('maker.at'), number(['roll', 'at'], R.at ?? 1), ['roll', 'at']) : null,
      field(t('maker.deploy'), select(['roll', 'deploy'], opts(DEPLOY, (x) => `${x.name} — ${x.text}`), R.deploy), ['roll', 'deploy']),
      isFxChip(R.chip) ? field(t('maker.life'), number(['roll', 'life'], R.life ?? 3, 1), ['roll', 'life']) : null);
  } else {
    parts.push(h('span', { class: 'cap', text: t('maker.part.classic') }),
      h('p', { html: `<b>${CLASSIC[def.roll.k] || def.roll.k}</b> — ${def.roll.text}` }),
      h('p', { class: 'sub', text: t('maker.classic.note') }),
      btn(t('maker.convertBtn'), () => { const was = def.roll.text; B.setValue(path(id, 'roll'), { ...NEW_TRICK.roll, chip: def.roll.k === 'fee' ? 'debt' : 'block', text: was });
        if (!BONUS[def.bonus.k]) B.setValue(path(id, 'bonus', 'k'), 'double'); rewrite(id); redraw(); }, t('maker.convertBtn.tip'), 'small'));
  }
  const b = def.bonus, bk = isMade(def) ? b.k : null;
  parts.push(h('span', { class: 'cap', text: t('maker.part.bonus') }), field(t('maker.cond'), condEl, ['bonus', 'cond']));
  if (isMade(def)) {
    parts.push(field(t('maker.bonusFx'), select(['bonus', 'k'], opts(BONUS, (x) => x.name), bk), ['bonus', 'k']),
      bk === 'linger' ? field(t('maker.turns'), number(['bonus', 'turns'], b.turns ?? 2, 1), ['bonus', 'turns']) : null,
      bk === 'multiply' ? field(t('maker.times'), number(['bonus', 'x'], b.x ?? 2, 2), ['bonus', 'x']) : null,
      bk === 'extra' ? field(t('maker.extraChip'), select(['bonus', 'chip'], makeChoices().filter((k) => makeKind(k) !== 'fee').map((k) => [k, makeName(k)]), b.chip ?? 'block'), ['bonus', 'chip']) : null,
      bk === 'extra' ? field(t('maker.extraN'), number(['bonus', 'n'], b.n ?? 1, 1), ['bonus', 'n']) : null);
  } else parts.push(h('p', { html: `<b>${b.k}</b> — ${b.text}` }));

  const card = h('div', { class: 'b-card' }); card.innerHTML = trickTip({ id, q: 1 }, def.cls || 'hustler');
  return h('div', { class: 'b-maker' }, h('div', { class: 'b-fields' }, parts), h('div', {}, h('span', { class: 'cap', text: t('maker.preview') }), card,
    isMade(def) ? h('p', { class: 'sub', text: t('maker.preview.note') }) : null));
}
