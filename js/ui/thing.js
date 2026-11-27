// A thing you hold: a card, a pass, a key, a wallet, a jacket. Each is a body with thickness, made of a material: a
// face, a back, and the edge between them (as thick as its material is, content/finishes.js `thick`). Under the
// pointer it lifts and leans toward you so the edge shows; press and drag it and it comes up for a close look, to be
// turned over in the hand (ui/spin.js: the same look a die gets). One body for every thing: a drawing only has to
// supply its face, its back, and the shape of its outline.
import { h } from './core.js';
import { FINISHES } from '../content/finishes.js';
import { materialVar } from './finish.js';

const UNIT = 1.15; // px of thickness for card stock at a card's own size
// face: the element shown. o: { back: () => el, mat, color (what it is made of), depth (px, else by the material),
//   radius (px, of the outline's corners) or edge: () => el (the outline as an element, for a shape that is not a
//   rounded box), make: () => a fresh face (for the close look; else the face is copied), name, sub (its caption up close),
//   lift: false for a thing that should not lean under the pointer (it holds other things that do) }
export function thing(face, o = {}) {
  const depth = Math.max(1, o.depth ?? (FINISHES[o.mat]?.thick || 1) * UNIT * (o.scale || 1)), n = Math.max(2, Math.min(8, Math.round(depth / 0.9)));
  const body = h('span', { class: 'th-body' }), el = h('span', { class: `thing ${o.lift === false ? 'th-still' : ''} ${o.cls || ''}`, style: { '--th-d': `${depth.toFixed(2)}px`, '--th-r': `${o.radius ?? 6}px`, '--th-c': o.color || '#d9d2c2' } }, body);
  face.classList.add('th-face');
  for (let i = 1; i <= n; i++) { const e = o.edge ? o.edge() : h('i'); e.classList.add('th-edge'); e.style.transform = `translateZ(${(-depth * i / (n + 1)).toFixed(2)}px)`; body.append(e); }
  const back = h('span', { class: 'th-back' }, o.back ? o.back() : (o.edge ? o.edge() : null)); body.append(back, face);
  if (o.mat) materialVar(el, { m: o.mat, color: o.color }, '--th-tex');
  el._thing = { face, o };
  el._look = (size) => closeLook(el, size);
  return el;
}
// The thing brought up close: a fresh copy at `size`, free to turn. → { el, setRotation(m), matrix, name, sub, start }
const LOOK = 250; // how large a thing is brought up for a close look (its print has to be read)
function closeLook(src, least) {
  const size = Math.max(least, LOOK), { face, o } = src._thing, w = face.offsetWidth || 52, hh = face.offsetHeight || 72, k = Math.min((size * 0.92) / w, (size * 0.92) / hh);
  const big = thing(o.make ? o.make() : face.cloneNode(true), { ...o, lift: false }), body = big.firstChild;
  const el = h('div', { class: 'th-look', style: { width: `${size}px`, height: `${size}px` } }, h('div', { class: 'th-zoom', style: { transform: `scale(${k.toFixed(3)})` } }, big));
  let M = new DOMMatrix();
  return { el, size, name: o.name || '', sub: o.sub || '', start: new DOMMatrix().rotateSelf(-10, 22, 0), get matrix() { return M; }, setRotation(m) { M = m; body.style.transform = m.toString(); } };
}
// Under the pointer a thing leans toward where the pointer is on it (so each edge can be looked along)
export function initThings() {
  document.addEventListener('pointermove', (ev) => { const el = ev.target.closest?.('.thing:not(.th-still)'); if (!el) return; const r = el.getBoundingClientRect(); if (!r.width) return;
    const x = (ev.clientX - r.left) / r.width - 0.5, y = (ev.clientY - r.top) / r.height - 0.5; el.style.setProperty('--th-ry', `${(x * 34).toFixed(1)}deg`); el.style.setProperty('--th-rx', `${(-y * 28).toFixed(1)}deg`); }, { passive: true });
}
