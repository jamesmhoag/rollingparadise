// The neon sign editor, used in Build mode's Roller and Opponent makers: each Roller's own sign (ROLLERS[id].sign),
// each opponent's (ROSTER[id].sign), and the shared looks they are laid over (D.NEON: you, them, the House).
// Each part of a sign takes colour pairs: the tube's own colour and the glow it throws. The frame takes up to three
// (one tube each, or the colours of a gradient, a strip or the lamps); then its style and motion, a symbol at its
// corners or along it, a large symbol after the name with its own motion, what it is mounted on, and which parts
// blink and how (see sign.js).
import { h, lab, btn } from './core.js';
import * as D from '../data.js';
import * as B from '../build/draft.js';
import { t } from '../text.js';
import { signOf, dressSign, TUBES, STRIPS, LAMPS, MOTIONS, EDGE_AT, CLS_ALIGN, SIGN_FONTS, BLINK_PARTS, BLINKS, MAX_PAIRS, pairsOf, CROWN_PARTS, crownLookOf, FINISH_PARTS, nameSign, signFace } from './sign.js';
import { draftForm, pick, tick, colourIn } from './form.js';
import { finishPicker } from './finish.js';
import { SYMBOLS, SYMBOL_GROUPS } from './symbols.js';

const PARTS = ['border', 'name', 'cls'];
const SAMPLE = { you: () => [D.ROLLERS.owl?.name || 'Owl', D.CLASSES.hustler?.name || 'Hustler'], them: () => ['Low Ball', 'Doorman'], house: () => [t('table.house-sign'), 'Turn 1'] };
const MAX_IMAGE = 300 * 1024; // a mount image read from a file is kept in the build as a data URL

// a symbol picker: every drawn symbol, by kind, and a box for any other character
// the ✕ beside an extra colour pair
const dropBtn = (fn) => { const b = btn('✕', fn, t('neon.pair.drop'), 'small'); b.dataset.guide = 'build-option'; return b; };
export function symbolPicker(value, onPick, allowChar = true) {
  const icon = (id) => { const S = SYMBOLS[id]; return `<svg viewBox="-1 -1 26 26"><path d="${S.d}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>${(S.dots || []).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="currentColor"/>`).join('')}</svg>`; };
  return h('div', { class: 'col' },
    allowChar ? h('div', { class: 'row' }, h('input', { type: 'text', maxlength: 4, value: SYMBOLS[value] ? '' : value || '', placeholder: t('neon.edge.ph'), style: { width: '64px', textAlign: 'center' }, onchange: (e) => { const g = [...e.target.value.trim()][0]; if (g) onPick(g); } }), h('small', { class: 'dim', text: t('neon.edge.char') })) : null,
    ...SYMBOL_GROUPS.map((k) => h('div', { class: 'glyph-group' }, h('span', { class: 'cap', text: t(`neon.glyphs.${k}`) }),
      ...Object.keys(SYMBOLS).filter((id) => SYMBOLS[id].group === k).map((id) => { const b = btn('', () => onPick(id), () => t('neon.glyph.tip', { g: t(`neon.sym.${id}`) }), `small glyph ${id === value ? 'on' : ''}`); b.innerHTML = icon(id); return b; }))));
}

// A sign editor. base: the content path its values live under ('NEON.you', or 'ROSTER.<id>.sign'); who: whose look it
// starts from ('you', 'them', 'house'); own: the values set there now; sample: the sample's words; crown: a crown to
// show on the sample (a High Roller's floor).
export function signEditor(base, who, own, redraw, sample, crown) {
  const F = draftForm(base, redraw), { P, set, field } = F, spec = signOf(who, base.startsWith('NEON.') ? null : own);
  // a sign's options are named in the text (neon.opt.*; the align- prefix keeps those names apart there). Faces are named once for everything (font.*).
  const named = (list) => list.map((v) => [v, t(`neon.opt.${v}`)]);
  const select = (ks, list, value, groups) => F.select(ks, groups ? groups.map(([g, l]) => [t(`neon.group.${g}`), named(l)]) : named(list), value, { parse: (x) => x.replace(/^align-/, '') });
  const colour = (value, on) => colourIn(value, on);
  const pairEl = (pair, on, i) => h('label', { class: 'neon-in row' }, colour(pair[0], (c) => on([c, pair[1]])), colour(pair[1], (c) => on([pair[0], c])), h('small', { text: i == null ? t('neon.core-glow') : t(`neon.pair.${pairWord()}`, { n: i + 1 }) }));
  const pairWord = () => (spec.frame === 'gradient' ? 'colour' : STRIPS.includes(spec.frame) ? (spec.frame === 'twist' ? 'strand' : 'stripe') : LAMPS.includes(spec.frame) ? 'lamp' : 'tube');
  const pairs = pairsOf(spec), setPairs = (list) => { B.setValue(P('border'), list[0]); B.setValue(P('more'), list.slice(1)); redraw(); };
  const [name, cls] = sample || SAMPLE[who]();
  const prev = who === 'house' ? h('div', { class: 'who them neon-sample' }, signFace(name, cls)) : nameSign(who, name, cls, null, 'neon-sample'); // a Roller's sign is the sign itself
  dressSign(prev, crown ? { ...spec, crown: { level: crown } } : spec, who === 'house' ? 'house' : who);
  if (who === 'house') prev.classList.add('house-preview');
  const readImage = (e) => { const f = e.target.files?.[0]; if (!f) return; if (f.size > MAX_IMAGE) { e.target.value = ''; return globalThis.alert?.(t('neon.image.big')); }
    const r = new FileReader(); r.onload = () => set(['mount', 'image'], String(r.result)); r.readAsDataURL(f); };
  const blinkRow = (part) => { const b = spec.blinks?.[part] || {}, put = (v) => set(['blinks', part], { on: !!b.on, pattern: b.pattern || 'breathe', ...v });
    return h('div', { class: 'row' }, tick(t(`neon.part.${part}`), b.on, (v) => put({ on: v }), 'row'),
      b.on ? pick(named(BLINKS), b.pattern || 'breathe', (v) => put({ pattern: v })) : null); };
  const frameKind = TUBES.includes(spec.frame) || STRIPS.includes(spec.frame) || LAMPS.includes(spec.frame);
  return h('div', { class: 'neon-side' }, prev,
    field(lab('neon.frame'), select(['frame'], null, spec.frame, [['tubes', TUBES], ['strips', STRIPS], ['lamps', LAMPS], ['off', ['none']]]), ['frame']),
    frameKind ? field(lab('neon.pairs'), h('div', { class: 'col' }, ...pairs.map((pair, i) => h('div', { class: 'row' }, pairEl(pair, (pr) => setPairs(pairs.map((x, j) => (j === i ? pr : x))), i),
        i ? dropBtn(() => setPairs(pairs.filter((_, j) => j !== i))) : null)),
      pairs.length < MAX_PAIRS ? btn(t(`neon.pair.add.${pairWord()}`), () => setPairs([...pairs, [pairs[pairs.length - 1][1], pairs[pairs.length - 1][0]]]), null, 'small') : null), ['more']) : null,
    spec.frame === 'none' ? null : field(lab('neon.motion'), select(['motion'], MOTIONS, spec.motion), ['motion']),
    field(lab('neon.radius'), F.number(['radius'], spec.radius, { min: 0, max: 30, w: '70px', blank: 0 }), ['radius']),
    spec.frame === 'none' ? null : field(lab('neon.edge'), symbolPicker(spec.edge, (g) => set(['edge'], g)), ['edge']),
    spec.frame === 'symbols' || spec.frame === 'none' ? null : field(lab('neon.edgeAt'), select(['edgeAt'], EDGE_AT, spec.edgeAt), ['edgeAt']),
    ...PARTS.slice(1).map((part) => field(lab(`neon.${part}`), pairEl(spec[part], (pr) => set([part], pr)), [part])),
    // each line's face: any of the three, for the name and for the class
    ...['nameFont', 'clsFont'].map((k) => field(lab(`neon.${k}`), F.select([k], SIGN_FONTS.map((f) => [f, t(`font.${f}`)]), spec[k]), [k])),
    field(lab('neon.clsAlign'), select(['clsAlign'], CLS_ALIGN.map((a) => `align-${a}`), `align-${spec.clsAlign || 'right'}`), ['clsAlign']),
    field(lab('neon.symbol'), h('div', { class: 'col' }, tick(t('neon.symbol.on'), spec.symbol.on, (v) => set(['symbol', 'on'], v), 'row'),
      spec.symbol.on ? h('div', { class: 'row' }, h('small', { text: t('neon.motion') }), select(['symbol', 'motion'], MOTIONS, spec.symbol.motion)) : null,
      spec.symbol.on ? symbolPicker(spec.symbol.id, (g) => set(['symbol', 'id'], g), false) : null), ['symbol']),
    // a High Roller's crown: its band, prongs and jewels each in their own colours (the crown you take off them)
    crown ? field(lab('neon.crown'), (() => { const look = crownLookOf(spec); return h('div', { class: 'col' },
      ...CROWN_PARTS.map((part) => h('div', { class: 'row' }, pairEl(look[part], (pr) => set(['crownLook', part], pr)), h('small', { text: t(`neon.crown.${part}`) }))),
      btn(t('neon.crown.same'), () => set(['crownLook'], { band: look.band, prongs: look.band, jewels: look.band }), null, 'small')); })(), ['crownLook']) : null,
    field(lab('neon.mount'), h('div', { class: 'row wrap' }, F.colour(['mount', 'color'], spec.mount.color, { fallback: '#07040f' }),
      btn(t('neon.mount.none'), () => set(['mount', 'color'], ''), null, 'small')), ['mount', 'color']),
    field(lab('neon.image'), h('div', { class: 'row wrap' }, h('input', { type: 'text', value: spec.mount.image?.startsWith('data:') ? t('neon.image.file') : spec.mount.image || '', placeholder: t('neon.image.ph'), onchange: (e) => set(['mount', 'image'], e.target.value.trim()) }),
      h('input', { type: 'file', accept: 'image/*', onchange: readImage }), spec.mount.image ? btn(t('neon.mount.none'), () => set(['mount', 'image'], ''), null, 'small') : null), ['mount', 'image']),
    // what each part is made of: plain neon, or a finish (any of the dice materials, or a cloth or hide), in its own colour,
    // with a glint and a sparkle
    field(lab('neon.finish'), h('div', { class: 'col' }, ...FINISH_PARTS.filter((p) => (p !== 'symbol' || spec.symbol.on) && (p !== 'crown' || crown || who === 'you')).map((part) => { const Fn = spec.finish?.[part] || {}, put = (v) => set(['finish', part], { ...Fn, ...v });
      return h('div', { class: 'row wrap' }, h('small', { style: { width: '54px' }, text: t(`neon.part.${part}`) }), finishPicker(Fn, put, () => set(['finish', part], null), { none: t('neon.finish.neon') })); })), ['finish']),
    field(lab('neon.blinks'), h('div', { class: 'col' }, ...BLINK_PARTS.filter((p) => (p !== 'symbol' || spec.symbol.on) && (p !== 'crown' || crown || who === 'you') && (p !== 'edge' || spec.edgeAt !== 'none' || spec.frame === 'symbols')).map(blinkRow)), ['blinks']));
}
