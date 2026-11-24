// Build mode › Neon: the signs at the table (D.NEON): yours, every opponent's (unless one has its own), and the
// House's. The same editor sits in the Opponent maker, where it sets that opponent's own sign (ROSTER[id].sign).
// Each part of a sign (the frame, the script name, the class under it) takes two colours: the tube's own and the glow
// it throws. Then the frame's style, a symbol along the edge or at the corners, what it is mounted on, and one part
// that blinks, slowly and softly (see sign.js).
import { h, lab, btn } from './core.js';
import * as D from '../data.js';
import * as B from '../build/draft.js';
import { t } from '../text.js';
import { signOf, dressSign, FRAMES, EDGE_AT, BLINK_PARTS, BLINKS, EDGE_GLYPHS } from './sign.js';

const PARTS = ['border', 'name', 'cls'];
const SAMPLE = { you: () => [D.CLASSES.hustler?.hero || 'Owl', D.CLASSES.hustler?.name || 'Hustler'], them: () => ['Low Ball', 'Doorman'], house: () => [t('table.house-sign'), 'Turn 1'] };
const MAX_IMAGE = 300 * 1024; // a mount image read from a file is kept in the build as a data URL

// A sign editor. base: the content path its values live under ('NEON.you', or 'ROSTER.<id>.sign'); who: whose look it
// starts from ('you', 'them', 'house'); own: the values set there now; name, cls: the sample's words.
export function signEditor(base, who, own, redraw, sample) {
  const P = (...ks) => ks.reduce((p, k) => D.subPath(p, k), base), spec = signOf(who, base.startsWith('NEON.') ? null : own);
  const set = (ks, v) => { B.setValue(P(...ks), v); redraw(); };
  const field = (label, el, ks) => h('div', { class: `b-field ${B.changed(P(...ks)) ? 'ch' : ''}` }, h('label', {}, label), el,
    P(...ks) in B.draft.changes ? btn('↺', () => { B.revert(P(...ks)); redraw(); }, t('build.revert.tip', { was: JSON.stringify(B.draft.orig[P(...ks)]) }), 'small b-revert') : h('span'));
  const select = (ks, list, value) => h('select', { onchange: (e) => set(ks, e.target.value) }, list.map((v) => h('option', { value: v, text: t(`neon.opt.${v}`), ...(v === value ? { selected: 'selected' } : {}) })));
  const pick = (part, i) => h('label', { class: 'neon-in' }, h('input', { type: 'color', value: spec[part][i], onchange: (e) => { const pair = [...spec[part]]; pair[i] = e.target.value; set([part], pair); } }), h('small', { text: t(i ? 'neon.glow' : 'neon.core') }));
  const [name, cls] = sample || SAMPLE[who]();
  const prev = h('div', { class: `who ${who === 'you' ? 'me' : 'them'} neon-sample` }, h('div', { class: 'name nsign' }, h('b', { class: 'neon-name', text: name }), h('span', { class: 'neon-class', text: cls })));
  dressSign(prev, spec, who === 'house' ? 'house' : who);
  if (who === 'house') prev.classList.add('house-preview');
  const readImage = (e) => { const f = e.target.files?.[0]; if (!f) return; if (f.size > MAX_IMAGE) { e.target.value = ''; return globalThis.alert?.(t('neon.image.big')); }
    const r = new FileReader(); r.onload = () => set(['mount', 'image'], String(r.result)); r.readAsDataURL(f); };
  return h('div', { class: 'neon-side' }, prev,
    ...PARTS.map((part) => field(lab(`neon.${part}`), h('div', { class: 'row' }, pick(part, 0), pick(part, 1)), [part])),
    field(lab('neon.frame'), select(['frame'], FRAMES, spec.frame), ['frame']),
    field(lab('neon.radius'), h('input', { type: 'number', min: 0, max: 30, value: spec.radius, style: { width: '70px' }, onchange: (e) => set(['radius'], Math.max(0, Math.min(30, +e.target.value || 0))) }), ['radius']),
    field(lab('neon.edge'), h('div', { class: 'row wrap' }, h('input', { type: 'text', maxlength: 2, value: spec.edge, style: { width: '48px', textAlign: 'center' }, onchange: (e) => set(['edge'], [...e.target.value][0] || '') }),
      ...EDGE_GLYPHS.map((g) => btn(g, () => set(['edge'], g), null, `small glyph ${g === spec.edge ? 'on' : ''}`))), ['edge']),
    field(lab('neon.edgeAt'), select(['edgeAt'], EDGE_AT, spec.edgeAt), ['edgeAt']),
    field(lab('neon.mount'), h('div', { class: 'row wrap' }, h('input', { type: 'color', value: spec.mount.color || '#07040f', onchange: (e) => set(['mount', 'color'], e.target.value) }),
      btn(t('neon.mount.none'), () => set(['mount', 'color'], ''), null, 'small')), ['mount', 'color']),
    field(lab('neon.image'), h('div', { class: 'row wrap' }, h('input', { type: 'text', value: spec.mount.image?.startsWith('data:') ? t('neon.image.file') : spec.mount.image || '', placeholder: t('neon.image.ph'), onchange: (e) => set(['mount', 'image'], e.target.value.trim()) }),
      h('input', { type: 'file', accept: 'image/*', onchange: readImage }), spec.mount.image ? btn(t('neon.mount.none'), () => set(['mount', 'image'], ''), null, 'small') : null), ['mount', 'image']),
    field(lab('neon.blink'), select(['blink', 'part'], BLINK_PARTS, spec.blink.part), ['blink', 'part']),
    spec.blink.part === 'none' ? null : field(lab('neon.pattern'), select(['blink', 'pattern'], BLINKS, spec.blink.pattern), ['blink', 'pattern']));
}

export function neonMaker(redraw) {
  return h('div', { class: 'col neon-maker' }, h('p', { class: 'sub', text: t('neon.sub') }),
    ...['you', 'them', 'house'].map((who) => h('div', {}, h('h3', { text: t(`neon.${who}`) }), signEditor(`NEON.${who}`, who, D.NEON[who], redraw))));
}
