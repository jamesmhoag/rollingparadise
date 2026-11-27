// Build mode: the chip maker. Made chips are edited term by term; every chip from before the maker is shown in the
// same terms (mapped from the workbook) and can be copied into a made chip. Edits go into the build draft.
import { h, lab, btn, toast } from './core.js';
import { draftForm, pick, numIn, textIn, tick, pairsOf, askId, makerPage, previewCol } from './form.js';
import * as D from '../data.js';
import * as B from '../build/draft.js';
import { chipEl, madeRules } from './parts.js';
import { t } from '../text.js';
import { SOURCES, LASTS, HEIGHT, FOOTPRINT, MUST, ON_TOP, STICKY, IMMUNE, MOVES, REACH, TRIGGERS, ACTIONS, PULL_FROM, NEW_CHIP, MOVE_HOW, MOVE_STEPS, EFFECTS, ARRANGES } from '../content/chipmaker.js';
import { asMade } from '../chipmodel.js';

const path = (id, ...ks) => ks.reduce((p, k) => D.subPath(p, k), D.subPath('MADE_CHIPS', id));
const ask = (def) => askId(t('chipmaker.newId'), def, D.MADE_CHIPS);
export function newChip(from) {
  const id = ask(from ? from.id.replace(/^chip_/, '') : 'my_chip'); if (!id) return null;
  B.setValue(D.subPath('MADE_CHIPS', id), from ? asMade(from) : JSON.parse(JSON.stringify(NEW_CHIP))); return id;
}
const opts = (o) => pairsOf(o, (v) => `${v.name} — ${v.text}`);

export function chipMaker(id, classic, redraw, onCopy) {
  if (classic) return classicView(classic, onCopy);
  const M = D.MADE_CHIPS[id]; if (!M) return h('p', { class: 'sub', text: t('maker.none') });
  const m = { ...NEW_CHIP, ...M };
  const F = draftForm(path(id), redraw), { set, field } = F;
  const select = (ks, list, value) => F.select(ks, list, value, { parse: (x) => x });
  const number = (ks, value, min) => F.number(ks, value ?? 0, { min, whole: true, blank: 0 });
  const text = (ks, value, long) => F.text(ks, value, { long, rows: 2 });
  const checks = (ks, o, list) => F.checks(ks, Object.entries(o), list);
  const smallSelect = (list, value, on) => pick(list, value, on, { parse: (x) => x });
  const named = (value, on, ph) => { const el = textIn(value, on); el.placeholder = ph; return el; };
  const amount = (value, on, o) => numIn(value, on, { w: '70px', whole: true, ...o });
  const kinds = () => [['std', 'Royal Paradise chip'], ['block', 'Block chip'], ['counter', 'Counter chip'], ...['burn', 'shock', 'corrupt', 'acid', 'poison', 'frost'].map((k) => [k, D.CHIPS[k].name]), ...Object.entries(D.MADE_CHIPS).map(([k, v]) => [k, v.name])];
  // a list of { key: kind, ...params }: one row per entry, a kind picker, its parameters, and remove; plus an add row
  const listEditor = (list, key, vocab, kindKey, params) => h('div', { class: 'b-list' },
    ...list.map((x, i) => { const upd = (nx) => set([key], list.map((y, j) => (j === i ? nx : y)));
      return h('div', { class: 'row b-list-row' }, smallSelect(Object.entries(vocab), x[kindKey], (v) => upd({ [kindKey]: v })), params(x, upd), btn('✕', () => set([key], list.filter((_, j) => j !== i)), null, 'small')); }),
    smallSelect([['', t('chipmaker.add')], ...Object.entries(vocab)], '', (v) => { if (v) set([key], [...list, { [kindKey]: v }]); }));

  const parts = [
    h('span', { class: 'cap', text: t('chipmaker.part.chip') }),
    field(lab('maker.name'), text(['name'], m.name), ['name']),
    field(lab('chipmaker.text'), text(['text'], m.text, true), ['text']),
    field(lab('chipmaker.color'), F.colour(['color'], m.color), ['color']),
    field(lab('chipmaker.value'), number(['value'], m.value), ['value']),
    field(lab('chipmaker.hits'), number(['hits'], m.hits, 0), ['hits']),
    field(lab('chipmaker.source'), select(['source'], opts(SOURCES), m.source), ['source']),
    h('span', { class: 'cap', text: t('chipmaker.part.lasts') }),
    field(lab('chipmaker.lasts'), select(['lasts'], opts(LASTS), m.lasts), ['lasts']),
    m.lasts === 'turns' ? field(lab('maker.turns'), number(['turns'], m.turns, 1), ['turns']) : null,
    h('span', { class: 'cap', text: t('chipmaker.part.size') }),
    field(lab('chipmaker.height'), select(['height'], opts(HEIGHT), m.height), ['height']),
    field(lab('chipmaker.foot'), select(['foot'], opts(FOOTPRINT), m.foot), ['foot']),
    field(lab('chipmaker.must'), select(['must'], opts(MUST), m.must), ['must']),
    field(lab('chipmaker.onTop'), select(['onTop'], opts(ON_TOP), m.onTop), ['onTop']),
    field(lab('chipmaker.sticky'), smallSelect(Object.entries(STICKY), m.sticky ? 'yes' : 'no', (v) => set(['sticky'], v === 'yes' || undefined)), ['sticky']),
    h('span', { class: 'cap', text: t('chipmaker.part.immune') }),
    field(lab('chipmaker.immune'), checks(['immune'], IMMUNE, m.immune || []), ['immune']),
    h('span', { class: 'cap', text: t('chipmaker.part.behaviour') }),
    field(lab('chipmaker.move'), select(['move'], opts(MOVES), m.move), ['move']),
    h('span', { class: 'cap', text: t('chipmaker.part.effect') }),
    field(lab('chipmaker.reach'), h('div', { class: 'row' }, select(['reach', 'to'], opts(REACH), m.reach?.to || 'touching'),
      m.reach?.to === 'named' ? named(m.reach?.name, (v) => set(['reach', 'name'], v), t('chipmaker.reach.name')) : null,
      m.reach?.to === 'typed' ? select(['reach', 'kind'], kinds(), m.reach?.kind || 'std') : null,
      amount(m.reach?.range ?? 1, (v) => set(['reach', 'range'], v), { min: 1, max: 5, w: '64px', blank: 1, title: t('chipmaker.range') })), ['reach']),
    field(lab('chipmaker.triggers'), listEditor(m.triggers || [], 'triggers', TRIGGERS, 'on', (x, upd) => (x.on === 'phase' || x.on === 'effect' ? smallSelect([['', t('chipmaker.anyPhase')], ...Object.entries(D.TYPES).map(([k, v]) => [k, v.name])], x.type || '', (v) => upd({ ...x, type: v || undefined }))
      : x.on === 'exposed' ? named(x.what, (v) => upd({ ...x, what: v || undefined }), t('chipmaker.exposed.what')) : null)), ['triggers']),
    field(lab('chipmaker.actions'), listEditor(m.actions || [], 'actions', ACTIONS, 'k', (x, upd) => (x.k === 'move' ? h('span', { class: 'row wrap' }, smallSelect(Object.entries(MOVE_HOW), x.how || 'hop', (v) => upd({ ...x, how: v === 'hop' ? undefined : v, steps: v === 'hop' ? undefined : x.steps ?? 1 })),
        smallSelect(['left', 'right', 'up', 'down'].map((d) => [d, t(`chipmaker.dir.${d}`)]), x.dir || 'right', (v) => upd({ ...x, dir: v })),
        x.how && x.how !== 'hop' ? smallSelect(Object.entries(MOVE_STEPS).filter(([k]) => x.how === 'slide' || k !== 'all'), String(x.steps ?? 1), (v) => upd({ ...x, steps: /^\d+$/.test(v) ? Number(v) : v })) : null,
        x.how === 'slide' && x.steps !== 'all' ? tick(t('chipmaker.move.spill'), x.spill, (v) => upd({ ...x, spill: v || undefined })) : null,
        x.how === 'lift' || x.how === 'slip' ? tick(t('chipmaker.move.whole'), x.whole, (v) => upd({ ...x, whole: v || undefined })) : null)
      : x.k === 'fx' ? h('span', { class: 'row wrap' }, smallSelect(Object.entries(EFFECTS), x.fx || 'block', (v) => upd({ k: 'fx', fx: v, ...(v === 'arrange' ? { by: 'front' } : {}) })), x.fx === 'arrange' ? smallSelect(Object.entries(ARRANGES), x.by || 'front', (v) => upd({ ...x, by: v })) : null)
      : x.k === 'become' ? smallSelect(kinds(), x.chip || 'std', (v) => upd({ ...x, chip: v }))
      : x.k === 'pull' ? h('span', { class: 'row' }, smallSelect(Object.entries(PULL_FROM), x.from || 'mine', (v) => upd({ ...x, from: v })), amount(x.n ?? 5, (v) => upd({ ...x, n: v }), { min: 1, blank: 1, title: t('chipmaker.pull.amount') }), tick(t('chipmaker.pull.bids'), x.bids, (v) => upd({ ...x, bids: v || undefined })))
        : amount(x.n ?? 1, (v) => upd({ ...x, n: v }), { blank: 0, title: t('chipmaker.amount') }))), ['actions']),
  ];
  const sample = { kind: 'made', model: id, value: m.value, hits: m.hits, life: m.lasts === 'turns' ? m.turns : undefined };
  return makerPage(parts,
    previewCol(h('div', { class: 'b-card' }, h('div', { class: 'row' }, chipEl(sample), h('b', { text: m.name })),
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
