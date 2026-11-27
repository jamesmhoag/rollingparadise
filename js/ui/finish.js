// Dressing an element in a finish (content/finishes.js). 'fill': the element is made of it. 'text': its letters are.
// The same call takes a finish off again (null). Symbols drawn as SVG take a finish through finishSvg: its colour, and
// the glint and sparkle as light on the strokes.
import { finishOf, FINISHES } from '../content/finishes.js';

const drop = (el) => { el.classList.remove(...[...el.classList].filter((c) => /^fin(-|$)/.test(c))); el.style.removeProperty('--fc'); };
export function finishOn(el, f, mode = 'fill') {
  if (!el) return el; drop(el); const F = finishOf(f); if (!F) return el;
  el.classList.add('fin', `fin-${F.m}`, mode === 'text' ? 'fin-text' : 'fin-fill'); if (F.color) el.style.setProperty('--fc', F.color);
  if (F.glint) el.classList.add('fin-glint'); if (F.sparkle) el.classList.add('fin-sparkle');
  return el;
}
export function finishSvg(el, f) {
  if (!el) return el; el.classList.remove('fin-svg', 'fin-glint', 'fin-sparkle', ...[...el.classList].filter((c) => /^fin-m-/.test(c))); const F = finishOf(f); if (!F) return el;
  el.classList.add('fin-svg', `fin-m-${F.m}`); if (F.color) el.style.setProperty('--fc', F.color); if (F.glint) el.classList.add('fin-glint'); if (F.sparkle) el.classList.add('fin-sparkle');
  return el;
}
export const finishName = (f) => FINISHES[f?.m]?.name || '';
