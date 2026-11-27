// Dressing an element in a finish (content/finishes.js). 'fill': the element is made of it. 'text': its letters are.
// The same call takes a finish off again (null). Symbols drawn as SVG take a finish through finishSvg: its colour, and
// the glint and sparkle as light on the strokes.
import { finishOf, FINISHES } from '../content/finishes.js';
import { h } from './core.js';
import { pick, tick, colourIn } from './form.js';
import { t } from '../text.js';

const strip = (el) => { el.classList.remove(...[...el.classList].filter((c) => /^fin(-|$)/.test(c))); el.style.removeProperty('--fc'); };
// take any finish off `el`, then put `f` on: the classes for its material (`cls`), its colour, its glint and sparkle
function dress(el, f, cls) {
  if (!el) return el; strip(el); const F = finishOf(f); if (!F) return el;
  el.classList.add(...cls(F)); if (F.color) el.style.setProperty('--fc', F.color);
  if (F.glint) el.classList.add('fin-glint'); if (F.sparkle) el.classList.add('fin-sparkle');
  return el;
}
export const finishOn = (el, f, mode = 'fill') => dress(el, f, (F) => ['fin', `fin-${F.m}`, mode === 'text' ? 'fin-text' : 'fin-fill']);
export const finishSvg = (el, f) => dress(el, f, (F) => ['fin-svg', `fin-m-${F.m}`]);
export const finishName = (f) => FINISHES[f?.m]?.name || '';

// The one finish picker (Build mode): a material (or none: `none` is what that is called here), then its colour, glint
// and sparkle. F: the finish now ({ m, color, glint, sparkle }); put(change) merges into it; clear() takes it off.
export function finishPicker(F, put, clear, { none, colour = true } = {}) {
  F = F || {};
  return h('span', { class: 'row wrap' }, pick(Object.entries(FINISHES).map(([k, X]) => [k, X.name]), F.m || '', (m) => (m ? put({ m }) : clear()), { head: none }),
    F.m && colour ? colourIn(F.color, (v) => put({ color: v }), { fallback: '#c9d3e0', live: true }) : null,
    F.m ? tick(t('neon.finish.glint'), F.glint, (v) => put({ glint: v })) : null, F.m ? tick(t('neon.finish.sparkle'), F.sparkle, (v) => put({ sparkle: v })) : null);
}
