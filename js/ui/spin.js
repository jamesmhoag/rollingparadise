// Grab and spin: press on a die, or on any thing you hold (a card, a pass, a wallet, a jacket: ui/thing.js), and
// drag to turn it over in your hand. It comes up close over where it sits (a die as its real solid, every face
// showing its value; a thing as its own body, front, back and edge) and turns with the pointer; let go and it keeps
// turning a moment, then settles back. Grab it again to keep turning. A spin is not a click, so it never picks what
// it turns, and the hover stays hidden while you spin. Works on every die (any element with `_die`) and every
// element that offers a look (`_look`).
import { h, box } from './core.js';
import { solidEl } from './solid.js';
import { dieName, faceList } from '../dice.js';

const GRAB = 5, SIZE = 132, SENS = 0.55; // px of drag before a press becomes a spin · solid size · degrees per px
let view = null; // { el, solid, die, vx, vy, raf, held, leave }

const stage = () => document.getElementById('stage');
const scaleOf = () => { const s = stage(); return s.getBoundingClientRect().width / s.offsetWidth || 1; };

function close(now) {
  if (!view) return; const v = view; view = null; cancelAnimationFrame(v.raf); clearTimeout(v.leave); v.solid.close?.(); // what it held goes back where it was
  document.body.classList.remove('spinning'); v.node.classList.remove('lifted'); // it is back where it was
  if (!v.node.matches(':hover')) v.node.dispatchEvent(new PointerEvent('pointerleave')); // and idle there, if the pointer left it while it was up
  if (now) return v.el.remove();
  v.el.classList.add('out'); setTimeout(() => v.el.remove(), 260);
}
// what a node offers for a close look: a die its solid (every face showing its value), anything else its own (`_look`,
// see ui/thing.js). → { el, setRotation(m), matrix, name, sub, start }
function lookOf(node) {
  if (node._look) return node._look(SIZE);
  const d = node._die, solid = solidEl(d, SIZE), shown = node.firstChild?.textContent, at = solid.faceOf(shown); // a rolled die starts with its value toward you
  return { el: solid.el, name: dieName(d), sub: faceList(d).join(' · '), start: (at >= 0 ? solid.faceFront(at) : new DOMMatrix()).preMultiplySelf(new DOMMatrix().rotateSelf(-14, 18, 0)), get matrix() { return solid.matrix; }, setRotation: (m) => solid.setRotation(m) };
}
function open(node) {
  close(true);
  const b = box(node), solid = lookOf(node); solid.setRotation(solid.start);
  const el = h('div', { class: 'spin-view' }, solid.el, h('div', { class: 'spin-cap' }, h('b', { text: solid.name }), h('span', { text: solid.sub })));
  const W = stage().offsetWidth, H = stage().offsetHeight, S = solid.size || SIZE; // (a thing comes up larger than a die: it has print to read)
  const x = Math.max(8, Math.min(W - S - 8, b.x + b.w / 2 - S / 2)), y = Math.max(8, Math.min(H - S - 40, b.y + b.h / 2 - S / 2));
  Object.assign(el.style, { left: x + 'px', top: y + 'px' });
  el.addEventListener('pointerdown', (ev) => { if (ev.button !== 0 || !view) return; ev.stopPropagation(); if (ev.target.closest('.g3-held .thing')) return; // (a card in its slit is that card's own)
    if (!onIt(ev)) return passThrough(ev); // a press where the held thing is not drawn is a press on what is under it
    ev.preventDefault(); grab(ev, el); });
  el.addEventListener('pointerenter', () => { if (view) clearTimeout(view.leave); });
  el.addEventListener('pointerleave', () => { if (view && !view.held && !view.pinned) { clearTimeout(view.leave); view.leave = setTimeout(() => close(), 450); } }); // (clicked, it stays held up until a right click)
  stage().append(el); document.body.classList.add('spinning'); node.classList.add('lifted'); // what is held up is no longer where it was: the one turns into the other
  view = { el, node, solid, vx: 0, vy: 0, raf: 0, held: false, leave: 0 };
  // a view that grows (a wallet opening, at the size it came up at) is kept on the screen
  solid.reflow = () => { const c = solid.canvas; if (!c || !el.isConnected) return; const st = stage().getBoundingClientRect(), k = scaleOf(); el.style.left = x + 'px'; el.style.top = y + 'px';
    const r = c.getBoundingClientRect(), L = (r.left - st.left) / k, T = (r.top - st.top) / k, Rt = L + r.width / k, B = T + r.height / k;
    el.style.left = x + Math.min(0, W - 8 - Rt) + Math.max(0, 8 - L) + 'px'; el.style.top = y + Math.min(0, H - 8 - B) + Math.max(0, 8 - T) + 'px'; };
  solid.reflow();
}
function turn(dx, dy) { if (view.solid.locked?.()) return; const m = new DOMMatrix().rotateSelf(-dy * SENS, dx * SENS, 0).multiplySelf(view.solid.matrix); view.solid.setRotation(m); }
// after you let go: it keeps turning, slows, and closes unless the pointer is on it
function coast() {
  if (!view) return; cancelAnimationFrame(view.raf);
  const step = () => { if (!view || view.held) return; view.vx *= 0.94; view.vy *= 0.94; turn(view.vx, view.vy);
    if (Math.hypot(view.vx, view.vy) > 0.05) view.raf = requestAnimationFrame(step); };
  view.raf = requestAnimationFrame(step);
  clearTimeout(view.leave); view.leave = setTimeout(() => { if (view && !view.held && !view.pinned && !view.el.matches(':hover')) close(); }, 1400);
}
// follow the pointer until it is let go
function grab(ev, target) {
  const v = view; v.held = true; cancelAnimationFrame(v.raf); clearTimeout(v.leave);
  let lx = ev.clientX, ly = ev.clientY, moved = 0; const k = scaleOf();
  try { target.setPointerCapture(ev.pointerId); } catch { /* not capturable */ }
  const move = (e) => { if (view !== v) return; const dx = (e.clientX - lx) / k, dy = (e.clientY - ly) / k; lx = e.clientX; ly = e.clientY; moved += Math.hypot(dx, dy); v.vx = dx; v.vy = dy; turn(dx, dy); };
  const up = () => { target.removeEventListener('pointermove', move); target.removeEventListener('pointerup', up); target.removeEventListener('pointercancel', up); if (view !== v) return; v.held = false;
    if (moved < GRAB && v.solid.click) { v.vx = v.vy = 0; v.pinned = true; v.solid.click(); clearTimeout(v.leave); return; } // a click on it, not a turn: what a click does to it (a wallet opens, or shuts), and it stays held up
    coast(); };
  target.addEventListener('pointermove', move); target.addEventListener('pointerup', up); target.addEventListener('pointercancel', up);
}
// the click that ends a spin must not reach the die
function swallowClick() {
  const stop = (e) => { e.stopPropagation(); e.preventDefault(); };
  document.addEventListener('click', stop, true); setTimeout(() => document.removeEventListener('click', stop, true), 0);
}

export function initSpin() {
  document.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0 || ev.carried) return; // a die being carried to a trick is not being turned over
    if (ev.target.closest?.('.spin-view')) return; // what is held up is handled there (a card in a wallet's slit is pointed at, not turned)
    const node = ev.target.closest?.('.die, .thing, .gdrink'); if (!node || !(node._die || node._look) || node.classList.contains('flipc')) return;
    const x0 = ev.clientX, y0 = ev.clientY, k = scaleOf(); let spinning = false;
    const move = (e) => {
      if (!spinning) { if (Math.hypot(e.clientX - x0, e.clientY - y0) / k < GRAB) return; spinning = true; open(node); view.held = true; }
      if (!view) return; const dx = e.movementX / k, dy = e.movementY / k; view.vx = dx; view.vy = dy; turn(dx, dy);
    };
    const up = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', up);
      if (!spinning) return; swallowClick(); if (view) { view.held = false; coast(); } };
    document.addEventListener('pointermove', move); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up);
  });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') close(); });
  // a right click anywhere puts back a card pulled out of a wallet held up; else it lets go of what is held up close (and brings up no menu)
  document.addEventListener('contextmenu', (ev) => { if (!view) return; ev.preventDefault(); ev.stopPropagation(); if (!view.solid.back?.()) close(); }, true);
  // a die that leaves the screen (a new scene, a closed panel) takes its spin with it
  new MutationObserver(() => { if (view && !view.held && !document.body.contains(view.node)) close(true); }).observe(stage(), { childList: true, subtree: true });
}
// Hold a thing up close with a click (a wallet): it stays held up until a right click or Esc; open: what a click on
// it does is done at once (a wallet comes up open, what it holds to hand). The one already held goes back first.
export function holdUp(node, o = {}) { if (!(node._look || node._die) || view?.node === node) return; open(node); view.pinned = true; if (o.open) view.solid.click?.(); }
// Is a press on what is drawn of the held thing (not the clear round it: a view grows round an opened wallet)?
function onIt(ev) {
  const t = ev.target; if (t.closest('.g3-held')) return true; if (t.tagName !== 'CANVAS') return false;
  const cx = t.getContext('2d'); if (!cx) return true; const r = t.getBoundingClientRect();
  try { return cx.getImageData(Math.floor((ev.clientX - r.left) * t.width / r.width), Math.floor((ev.clientY - r.top) * t.height / r.height), 1, 1).data[3] > 16; } catch { return true; }
}
// a press beside the held thing lets it go; a wallet under the press comes up in its place, open
function passThrough(ev) {
  const under = document.elementsFromPoint(ev.clientX, ev.clientY).find((e) => !view.el.contains(e) && e !== view.el), node = under?.closest?.('.th-wallet');
  close(); if (node && node._look) { ev.preventDefault(); swallowClick(); holdUp(node, { open: true }); }
}
