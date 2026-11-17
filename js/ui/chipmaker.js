// Build mode: the chip maker. Made chips are edited term by term; every chip from before the maker is shown in the
// same terms (mapped from the workbook) and can be copied into a made chip. Edits go into the build draft.
import { h, btn, toast } from './core.js';
import * as D from '../data.js';
import * as B from '../build/draft.js';
import { chipEl, madeRules } from './parts.js';
import { t } from '../text.js';
import { SOURCES, LASTS, HEIGHT, FOOTPRINT, MUST, ON_TOP, IMMUNE, MOVES, REACH, TRIGGERS, ACTIONS, NEW_CHIP } from '../content/chipmaker.js';
import { asMade } from '../chipmodel.js';

const path = (id, ...ks) => ks.reduce((p, k) => D.subPath(p, k), D.subPath('MADE_CHIPS', id));
const ask = (def) => { const id = (globalThis.prompt?.(t('chipmaker.newId'), def) || '').trim();
  if (!id) return null; if (!/^\w+$/.test(id)) { toast(t('build.duplicate.badId'), 'warn'); return null; }
  if (D.MADE_CHIPS[id]) { toast(t('build.duplicate.taken', { id }), 'warn'); return null; } return id; };
export function newChip(from) {
  const id = ask(from ? from.id.replace(/^chip_/, '') : 'my_chip'); if (!id) return null;
  B.setValue(D.subPath('MADE_CHIPS', id), from ? asMade(from) : JSON.parse(JSON.stringify(NEW_CHIP))); return id;
}
const opts = (o) => Object.entries(o).map(([k, v]) => [k, typeof v === 'string' ? v : `${v.name} — ${v.text}`]);
const planned = () => h('span', { class: 'b-planned', text: t('chipmaker.planned'), tip: t('chipmaker.planned.tip') });

export function chipMaker(id, classic, redraw, onCopy) {
  if (classic) return classicView(classic, onCopy);
  const M = D.MADE_CHIPS[id]; if (!M) return h('p', { class: 'sub', text: t('maker.none') });
  const m = { ...NEW_CHIP, ...M };
  const set = (ks, v) => { B.setValue(path(id, ...ks), v); redraw(); };
  const field = (label, el, ks, extra) => h('div', { class: `b-field ${ks && B.changed(path(id, ...ks)) ? 'ch' : ''}` }, h('label', {}, label, extra || null), el,
    ks && path(id, ...ks) in B.draft.changes ? btn('↺', () => { B.revert(path(id, ...ks)); redraw(); }, null, 'small b-revert') : h('span'));
  const select = (ks, list, value) => h('select', { onchange: (e) => set(ks, e.target.value) }, list.map(([v, l]) => h('option', { value: v, ...(String(v) === String(value) ? { selected: 'selected' } : {}), text: l })));
  const number = (ks, value, min) => h('input', { type: 'number', step: 1, ...(min != null ? { min } : {}), value: value ?? 0, onchange: (e) => set(ks, Math.round(Number(e.target.value) || 0)) });
  const text = (ks, value, area) => h(area ? 'textarea' : 'input', { ...(area ? { rows: 2, text: value } : { type: 'text', value }), onchange: (e) => set(ks, e.target.value) });
  const checks = (ks, o, list) => h('div', { class: 'b-checks' }, Object.entries(o).map(([k, l]) => h('label', { class: 'b-check' },
    h('input', { type: 'checkbox', ...(list.includes(k) ? { checked: 'checked' } : {}), onchange: (e) => set(ks, e.target.checked ? [...list, k] : list.filter((x) => x !== k)) }), l)));
  const trigOn = (m.triggers || []).map((x) => x.on), actOn = (m.actions || []).map((x) => x.k);

  const parts = [
    h('span', { class: 'cap', text: t('chipmaker.part.chip') }),
    field(t('maker.name'), text(['name'], m.name), ['name']),
    field(t('chipmaker.text'), text(['text'], m.text, true), ['text']),
    field(t('chipmaker.color'), h('input', { type: 'color', value: m.color, onchange: (e) => set(['color'], e.target.value) }), ['color']),
    field(t('chipmaker.value'), number(['value'], m.value), ['value']),
    field(t('chipmaker.hits'), number(['hits'], m.hits, 0), ['hits']),
    field(t('chipmaker.source'), select(['source'], opts(SOURCES), m.source), ['source']),
    h('span', { class: 'cap', text: t('chipmaker.part.lasts') }),
    field(t('chipmaker.lasts'), select(['lasts'], opts(LASTS), m.lasts), ['lasts']),
    m.lasts === 'turns' ? field(t('maker.turns'), number(['turns'], m.turns, 1), ['turns']) : null,
    h('span', { class: 'cap', text: t('chipmaker.part.size') }),
    field(t('chipmaker.height'), select(['height'], opts(HEIGHT), m.height), ['height']),
    field(t('chipmaker.foot'), select(['foot'], opts(FOOTPRINT), m.foot), ['foot'], m.foot !== 'basic' ? planned() : null),
    field(t('chipmaker.must'), select(['must'], opts(MUST), m.must), ['must'], ['sandwiched', 'with'].includes(m.must) ? planned() : null),
    field(t('chipmaker.onTop'), select(['onTop'], opts(ON_TOP), m.onTop), ['onTop'], m.onTop === 'anything' ? planned() : null),
    h('span', { class: 'cap', text: t('chipmaker.part.immune') }),
    field(t('chipmaker.immune'), checks(['immune'], IMMUNE, m.immune || []), ['immune'], (m.immune || []).some((k) => ['moves', 'holes', 'buffs', 'debuffs', 'blocks'].includes(k)) ? planned() : null),
    h('span', { class: 'cap' }, t('chipmaker.part.behaviour'), ' ', planned()),
    field(t('chipmaker.move'), select(['move'], opts(MOVES), m.move), ['move']),
    field(t('chipmaker.reach'), h('div', { class: 'row' }, select(['reach', 'to'], opts(REACH), m.reach?.to || 'touching'),
      h('input', { type: 'number', min: 1, max: 5, value: m.reach?.range ?? 1, style: { width: '64px' }, title: t('chipmaker.range'), onchange: (e) => set(['reach', 'range'], Math.max(1, Math.min(5, Math.round(Number(e.target.value) || 1)))) })), ['reach']),
    field(t('chipmaker.triggers'), checks(['triggers'], TRIGGERS, trigOn), null),
    field(t('chipmaker.actions'), checks(['actions'], ACTIONS, actOn), null),
  ];
  // triggers and actions are lists of objects; the checkboxes add or drop whole entries
  parts[parts.length - 2].querySelectorAll('input').forEach((el, i) => { const k = Object.keys(TRIGGERS)[i]; el.onchange = (e) => set(['triggers'], e.target.checked ? [...(m.triggers || []), { on: k }] : (m.triggers || []).filter((x) => x.on !== k)); });
  parts[parts.length - 1].querySelectorAll('input').forEach((el, i) => { const k = Object.keys(ACTIONS)[i]; el.onchange = (e) => set(['actions'], e.target.checked ? [...(m.actions || []), { k }] : (m.actions || []).filter((x) => x.k !== k)); });

  const sample = { kind: 'made', model: id, value: m.value, hits: m.hits, life: m.lasts === 'turns' ? m.turns : undefined };
  return h('div', { class: 'b-maker' }, h('div', { class: 'b-fields' }, parts),
    h('div', {}, h('span', { class: 'cap', text: t('maker.preview') }), h('div', { class: 'b-card' }, h('div', { class: 'row' }, chipEl(sample), h('b', { text: m.name })),
      h('p', { text: m.text || t('chipmaker.noText') }), h('p', { class: 'dim', text: madeRules(m, sample) })),
    h('p', { class: 'sub', text: t('chipmaker.useInTricks') })));
}

function classicView(c, onCopy) {
  const row = (k, v) => h('div', { class: 'b-field' }, h('label', { text: k }), h('span', { text: v }), h('span'));
  return h('div', { class: 'b-maker' }, h('div', { class: 'b-fields' },
    h('span', { class: 'cap', text: t('chipmaker.part.mapped') }),
    row(t('chipmaker.category'), c.category || '—'),
    row(t('chipmaker.value'), c.worthRule ? `${c.worthRule} (${t('chipmaker.worthRule')})` : `${c.value}¢`),
    row(t('chipmaker.hits'), String(c.hits)),
    row(t('chipmaker.source'), SOURCES[c.source] || c.source),
    row(t('chipmaker.lasts'), LASTS[c.lasts]?.name || c.lasts),
    row(t('chipmaker.height'), HEIGHT[c.height]?.name), row(t('chipmaker.foot'), FOOTPRINT[c.foot]),
    row(t('chipmaker.must'), MUST[c.must]), row(t('chipmaker.onTop'), ON_TOP[c.onTop]),
    row(t('chipmaker.immune'), c.immune.map((k) => IMMUNE[k] || k).join(', ') || '—'),
    row(t('chipmaker.move'), MOVES[c.move] || c.move),
    h('span', { class: 'cap', text: t('chipmaker.part.classic') }),
    h('p', { text: c.text }), c.note ? h('p', { class: 'sub', text: c.note }) : null,
    h('p', { class: 'sub', text: t('chipmaker.classic.note') }),
    btn(t('chipmaker.copy'), () => onCopy(c), t('chipmaker.copy.tip'), 'small')),
  h('div', {}, c.engine ? h('div', { class: 'b-card' }, h('div', { class: 'row' }, chipEl({ kind: c.engine.kind, value: c.value || 1, ...(c.engine.shop ? { shop: c.engine.shop, resist: c.engine.shop } : {}) }), h('b', { text: c.name }))) : null));
}
