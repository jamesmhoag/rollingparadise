// Grab and spin: press on any die and drag to turn it over in your hand. The die grows into its real solid over
// where it sits, every face showing its value, and turns with the pointer; let go and it keeps rolling a moment,
// then settles back. Grab the solid again to keep turning it. A spin is not a click, so it never picks the die,
// and the hover stays hidden while you spin. Works on every die drawn with parts.js dieEl or the match's dice
// (any element with `_die`).
import { h, box } from './core.js';
import { solidEl } from './solid.js';
import { dieName, faceList } from '../dice.js';

const GRAB = 5, SIZE = 132, SENS = 0.55; // px of drag before a press becomes a spin · solid size · degrees per px
let view = null; // { el, solid, die, vx, vy, raf, held, leave }

const stage = () => document.getElementById('stage');
const scaleOf = () => { const s = stage(); return s.getBoundingClientRect().width / s.offsetWidth || 1; };

function close(now) {
  if (!view) return; const v = view; view = null; cancelAnimationFrame(v.raf); clearTimeout(v.leave);
  document.body.classList.remove('spinning');
  if (now) return v.el.remove();
  v.el.classList.add('out'); setTimeout(() => v.el.remove(), 260);
}
function open(dieNode, d) {
  close(true);
  const b = box(dieNode), solid = solidEl(d, SIZE);
  const shown = dieNode.firstChild?.textContent, at = solid.faceOf(shown); // a rolled die starts with its value toward you
  solid.setRotation((at >= 0 ? solid.faceFront(at) : new DOMMatrix()).preMultiplySelf(new DOMMatrix().rotateSelf(-14, 18, 0)));
  const el = h('div', { class: 'spin-view' }, solid.el, h('div', { class: 'spin-cap' }, h('b', { text: dieName(d) }), h('span', { text: faceList(d).join(' · ') })));
  const W = stage().offsetWidth, H = stage().offsetHeight;
  const x = Math.max(8, Math.min(W - SIZE - 8, b.x + b.w / 2 - SIZE / 2)), y = Math.max(8, Math.min(H - SIZE - 40, b.y + b.h / 2 - SIZE / 2));
  Object.assign(el.style, { left: x + 'px', top: y + 'px' });
  el.addEventListener('pointerdown', (ev) => { if (ev.button !== 0 || !view) return; ev.preventDefault(); ev.stopPropagation(); grab(ev, el); });
  el.addEventListener('pointerenter', () => { if (view) clearTimeout(view.leave); });
  el.addEventListener('pointerleave', () => { if (view && !view.held) { clearTimeout(view.leave); view.leave = setTimeout(() => close(), 450); } });
  stage().append(el); document.body.classList.add('spinning');
  view = { el, node: dieNode, solid, die: d, vx: 0, vy: 0, raf: 0, held: false, leave: 0 };
}
function turn(dx, dy) { const m = new DOMMatrix().rotateSelf(-dy * SENS, dx * SENS, 0).multiplySelf(view.solid.matrix); view.solid.setRotation(m); }
// after you let go: it keeps turning, slows, and closes unless the pointer is on it
function coast() {
  if (!view) return; cancelAnimationFrame(view.raf);
  const step = () => { if (!view || view.held) return; view.vx *= 0.94; view.vy *= 0.94; turn(view.vx, view.vy);
    if (Math.hypot(view.vx, view.vy) > 0.05) view.raf = requestAnimationFrame(step); };
  view.raf = requestAnimationFrame(step);
  clearTimeout(view.leave); view.leave = setTimeout(() => { if (view && !view.held && !view.el.matches(':hover')) close(); }, 1400);
}
// follow the pointer until it is let go
function grab(ev, target) {
  const v = view; v.held = true; cancelAnimationFrame(v.raf); clearTimeout(v.leave);
  let lx = ev.clientX, ly = ev.clientY; const k = scaleOf();
  try { target.setPointerCapture(ev.pointerId); } catch { /* not capturable */ }
  const move = (e) => { if (view !== v) return; const dx = (e.clientX - lx) / k, dy = (e.clientY - ly) / k; lx = e.clientX; ly = e.clientY; v.vx = dx; v.vy = dy; turn(dx, dy); };
  const up = () => { target.removeEventListener('pointermove', move); target.removeEventListener('pointerup', up); target.removeEventListener('pointercancel', up); if (view !== v) return; v.held = false; coast(); };
  target.addEventListener('pointermove', move); target.addEventListener('pointerup', up); target.addEventListener('pointercancel', up);
}
// the click that ends a spin must not reach the die
function swallowClick() {
  const stop = (e) => { e.stopPropagation(); e.preventDefault(); };
  document.addEventListener('click', stop, true); setTimeout(() => document.removeEventListener('click', stop, true), 0);
}

export function initSpin() {
  document.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0) return;
    const node = ev.target.closest?.('.die'); if (!node?._die || node.classList.contains('flipc')) return;
    const x0 = ev.clientX, y0 = ev.clientY, k = scaleOf(); let spinning = false;
    const move = (e) => {
      if (!spinning) { if (Math.hypot(e.clientX - x0, e.clientY - y0) / k < GRAB) return; spinning = true; open(node, node._die); view.held = true; }
      if (!view) return; const dx = e.movementX / k, dy = e.movementY / k; view.vx = dx; view.vy = dy; turn(dx, dy);
    };
    const up = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', up);
      if (!spinning) return; swallowClick(); if (view) { view.held = false; coast(); } };
    document.addEventListener('pointermove', move); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up);
  });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') close(); });
  // a die that leaves the screen (a new scene, a closed panel) takes its spin with it
  new MutationObserver(() => { if (view && !view.held && !document.body.contains(view.node)) close(true); }).observe(stage(), { childList: true, subtree: true });
}
