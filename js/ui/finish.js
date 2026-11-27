// Dressing an element in a finish (content/finishes.js). 'fill': the element is made of it. 'text': its letters are.
// The same call takes a finish off again (null). Symbols drawn as SVG take a finish through finishSvg: its colour, and
// the glint and sparkle as light on the strokes.
import { finishOf, FINISHES } from '../content/finishes.js';
import { h } from './core.js';
import { swatch } from './dice3d.js';
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
// The material itself is a picture rendered as the dice are (dice3d.js swatch: the same materials, room and light),
// laid on when it is ready; until then, and where there is no renderer, the CSS look of the same name stands in.
const FALLBACK = { plastic: '#c9c2d8', glass: '#bfe6ff', metal: '#c9d3e0', sparkling: '#ffd76a', glimmering: '#cfe9ff', swirling: '#c9a6ff', diamond: '#ffffff', bone: '#efe3c2' };
const pictured = (el, F, then, slot = '_fin') => { const key = `${F.m}|${F.color}`; el[slot] = key; swatch(F.m, F.color || FALLBACK[F.m] || '#b9b2c8').then((url) => { if (url && el[slot] === key) then(url); }).catch(() => {}); }; // slot: an element can carry several pictures, each under its own name
// the material's picture as a CSS variable on `el` (for a thing whose parts take it: an edge, a pocket), once it is ready
export function materialVar(el, f, name = '--fin-tex') { const F = finishOf(f); el.style.removeProperty(name); if (F) pictured(el, F, (url) => el.style.setProperty(name, `url(${url})`), name); return el; }
export const finishOn = (el, f, mode = 'fill') => { el?.style.removeProperty('--fin-tex'); el?.classList.remove('fin-tex'); if (el) el._fin = null;
  const out = dress(el, f, (F) => ['fin', `fin-${F.m}`, mode === 'text' ? 'fin-text' : 'fin-fill']), F = finishOf(f);
  if (el && F) pictured(el, F, (url) => { el.style.setProperty('--fin-tex', `url(${url})`); el.classList.add('fin-tex'); });
  return out; };
// A symbol or a crown (an SVG of tubes or strokes) is painted with the same picture: a pattern over its box that its
// strokes and fills take as their paint. paintSvg puts the pattern back after the SVG is redrawn (ui/sign.js).
let paintN = 0;
export function paintSvg(svg) {
  svg.querySelector(':scope > defs.fin-defs')?.remove(); const url = svg._finUrl; if (!url) { svg.classList.remove('fin-tex'); svg.style.removeProperty('--fin-paint'); return; }
  const NS = 'http://www.w3.org/2000/svg', mk = (tag, a) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(a)) e.setAttribute(k, v); return e; };
  const vb = svg.viewBox?.baseVal, W = (vb && vb.width) || svg.clientWidth || 24, H = (vb && vb.height) || svg.clientHeight || 24, id = `finp${++paintN}`;
  const defs = mk('defs', { class: 'fin-defs' }), pat = mk('pattern', { id, patternUnits: 'userSpaceOnUse', x: vb?.x || 0, y: vb?.y || 0, width: W, height: H });
  pat.append(mk('image', { href: url, x: 0, y: 0, width: W, height: H, preserveAspectRatio: 'none' })); defs.append(pat); svg.prepend(defs);
  svg.style.setProperty('--fin-paint', `url(#${id})`); svg.classList.add('fin-tex');
}
export const finishSvg = (el, f) => { if (el) { el._fin = null; el._finUrl = null; paintSvg(el); }
  const out = dress(el, f, (F) => ['fin-svg', `fin-m-${F.m}`]), F = finishOf(f);
  if (el && F) pictured(el, F, (url) => { el._finUrl = url; paintSvg(el); });
  return out; };
export const finishName = (f) => FINISHES[f?.m]?.name || '';

// The one finish picker (Build mode): a material (or none: `none` is what that is called here), then its colour, glint
// and sparkle. F: the finish now ({ m, color, glint, sparkle }); put(change) merges into it; clear() takes it off.
export function finishPicker(F, put, clear, { none, colour = true } = {}) {
  F = F || {};
  return h('span', { class: 'row wrap' }, pick(Object.entries(FINISHES).map(([k, X]) => [k, X.name]), F.m || '', (m) => (m ? put({ m }) : clear()), { head: none }),
    F.m && colour ? colourIn(F.color, (v) => put({ color: v }), { fallback: '#c9d3e0', live: true }) : null,
    F.m ? tick(t('neon.finish.glint'), F.glint, (v) => put({ glint: v })) : null, F.m ? tick(t('neon.finish.sparkle'), F.sparkle, (v) => put({ sparkle: v })) : null);
}
