// DOM helpers shared by every screen: element builder, tooltips, scene and panel
// transitions, keyed list syncing with enter/leave/move animation, number tweens.
export const W = 1280, H = 720;
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
let scale = 1;
const $ = (id) => document.getElementById(id);

export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v; else if (k === 'text') el.textContent = v; else if (k === 'html') el.innerHTML = v;
    else if (k === 'tip') tip(el, v); else if (k === 'style') { for (const [p, val] of Object.entries(v)) { if (p.startsWith('--')) el.style.setProperty(p, val); else el.style[p] = val; } }
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
  return el;
}

// ---------- viewport ----------
export function fit() {
  scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  $('stage').style.transform = `translate(-50%, -50%) scale(${scale})`;
}
// pointer position in stage coordinates
function local(ev) { const r = $('stage').getBoundingClientRect(); return { x: (ev.clientX - r.left) / scale, y: (ev.clientY - r.top) / scale }; }
// an element's box in stage coordinates
export function box(el) { const s = $('stage').getBoundingClientRect(), r = el.getBoundingClientRect(); return { x: (r.left - s.left) / scale, y: (r.top - s.top) / scale, w: r.width / scale, h: r.height / scale }; }

// ---------- detail level ----------
// Two levels for every hover and prompt: verbose (explains the rules) and concise (just the facts).
// Right-click anywhere to switch. Markup: `.v` shows only when verbose, `.c` only when concise, and a
// `p.dim` aside counts as verbose. Code can ask `detail.verbose` or use `vc(verbose, concise)`.
const DETAIL_KEY = 'rollingparadise.detail.v1';
export const detail = { verbose: (() => { try { return globalThis.localStorage?.getItem(DETAIL_KEY) !== 'concise'; } catch { return true; } })(), listeners: new Set() };
export const vc = (verbose, concise) => (detail.verbose ? verbose : concise);
export function setDetail(verbose) {
  detail.verbose = verbose; try { globalThis.localStorage?.setItem(DETAIL_KEY, verbose ? 'verbose' : 'concise'); } catch { /* storage unavailable */ }
  document.body.classList.toggle('concise', !verbose); T.el?.classList.toggle('verbose', verbose);
  for (const fn of detail.listeners) fn(verbose);
}

// ---------- tooltips ----------
// tip(el, 'html') or tip(el, () => 'html'). The tooltip fades in and glides after the pointer.
const T = { el: null, cur: null, x: 0, y: 0, tx: 0, ty: 0, timer: 0, on: false };
export function tip(el, content) { el._tip = content; el.classList.add('has-tip'); return el; }
function tipLoop() {
  T.x += (T.tx - T.x) * 0.22; T.y += (T.ty - T.y) * 0.22;
  T.el.style.transform = `translate(${T.x.toFixed(1)}px, ${T.y.toFixed(1)}px)`;
  requestAnimationFrame(tipLoop);
}
function place(ev) {
  const p = local(ev), w = T.el.offsetWidth, hh = T.el.offsetHeight;
  let x = p.x + 18, y = p.y + 20;
  if (x + w > W - 8) x = p.x - w - 14; if (y + hh > H - 8) y = p.y - hh - 12;
  T.tx = Math.max(8, x); T.ty = Math.max(8, y);
}
function findTip(node) { while (node && node !== document.body) { if (node._tip) return node; node = node.parentNode; } return null; }
export function initTips() {
  T.el = $('tooltip'); setDetail(detail.verbose);
  document.addEventListener('contextmenu', (ev) => {
    ev.preventDefault(); setDetail(!detail.verbose);
    toast(detail.verbose ? 'Verbose: hovers and prompts explain the rules. Right-click for concise.' : 'Concise: hovers and prompts show just the facts. Right-click for verbose.');
    if (T.cur) { const el = T.cur, c = typeof el._tip === 'function' ? el._tip() : el._tip; if (c) { if (c.nodeType) T.el.replaceChildren(c); else T.el.innerHTML = c; } }
  });
  document.addEventListener('mousemove', (ev) => {
    const el = findTip(ev.target);
    if (el !== T.cur) {
      T.cur = el; clearTimeout(T.timer); T.el.classList.remove('show');
      if (el) T.timer = setTimeout(() => {
        const c = typeof el._tip === 'function' ? el._tip() : el._tip; if (!c || T.cur !== el) return;
        if (c.nodeType) T.el.replaceChildren(c); else T.el.innerHTML = c;
        place(ev); if (!T.on) { T.x = T.tx; T.y = T.ty; } T.on = true; T.el.classList.add('show');
      }, 110);
      else T.on = false;
    }
    if (T.cur) place(ev);
  });
  document.addEventListener('mousedown', (ev) => { if (ev.button === 2) return; T.el.classList.remove('show'); T.cur = null; T.on = false; });
  tipLoop();
}
export function refreshTip() { T.cur = null; }

// ---------- scenes and panels ----------
let scene = null, busy = false;
export async function go(build) {
  if (busy) return; busy = true; closePanel(true);
  const old = scene, el = h('div', { class: 'scene' });
  build(el); $('scene-layer').append(el); scene = el;
  if (old) old.classList.add('out');
  await frame(); el.classList.add('in');
  await wait(old ? 520 : 420); old?.remove(); busy = false;
}
let panel = null;
export async function openPanel(node, { wide, modal } = {}) {
  if (panel) await closePanel();
  const wrap = h('div', { class: 'panel-wrap' }, h('div', { class: 'backdrop', onclick: () => { if (!modal) closePanel(); } }), h('div', { class: 'panel' + (wide ? ' wide' : '') }, node));
  $('overlay-layer').append(wrap); panel = wrap; await frame(); wrap.classList.add('in');
}
export async function closePanel(now) {
  const p = panel; if (!p) return; panel = null; p.classList.remove('in'); p.classList.add('out');
  if (now) { setTimeout(() => p.remove(), 380); return; } await wait(380); p.remove();
}
export function toast(msg, kind = '') {
  const el = h('div', { class: `toast ${kind}`, text: msg }); $('toast-layer').append(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
  setTimeout(() => { el.classList.remove('in'); el.classList.add('out'); setTimeout(() => el.remove(), 450); }, 2600 + msg.length * 18);
}

// ---------- animated updates ----------
// count a number up or down to its new value
export function tween(el, to, fmt = (n) => Math.round(n).toLocaleString('en-US'), ms = 600) {
  const from = el._v ?? to; el._v = to; cancelAnimationFrame(el._raf);
  if (from === to) { el.textContent = fmt(to); return; }
  const t0 = performance.now();
  el.classList.remove('tick-up', 'tick-down'); void el.offsetWidth; el.classList.add(to > from ? 'tick-up' : 'tick-down');
  const tick = (t) => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(from + (to - from) * e); if (k < 1) el._raf = requestAnimationFrame(tick); };
  el._raf = requestAnimationFrame(tick);
}
// cross-fade a text change
export function swapText(el, text) {
  if (el._text === text) return; const first = el._text === undefined; el._text = text;
  if (first) { el.textContent = text; return; }
  el.classList.add('swap'); clearTimeout(el._swap);
  el._swap = setTimeout(() => { el.textContent = el._text; el.classList.remove('swap'); }, 150);
}
export function setOn(el, on) { el.classList.toggle('off', !on); }
export function pulse(el, cls = 'pulse') { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

// Run a DOM change and slide the surviving children from their old places to the new ones.
export function flip(box_, mutate) {
  const kids = [...box_.children].filter((c) => !c._leaving), first = new Map(kids.map((el) => [el, el.getBoundingClientRect()]));
  mutate();
  for (const [el, r0] of first) {
    if (!el.isConnected) continue;
    const r1 = el.getBoundingClientRect(), dx = (r0.left - r1.left) / scale, dy = (r0.top - r1.top) / scale;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
    el.style.transition = 'none'; el.style.transform = `translate(${dx}px, ${dy}px)`;
    requestAnimationFrame(() => requestAnimationFrame(() => { el.style.transition = ''; el.style.transform = ''; }));
  }
}
// Keep a container's children in step with a list of items. New items grow in, removed
// items shrink out, and items that change place slide there.
export function syncList(box_, items, keyOf, create, update) {
  const old = new Map(); for (const el of [...box_.children]) if (!el._leaving) old.set(el._key, el);
  flip(box_, () => {
    let prev = null;
    for (const it of items) {
      const k = keyOf(it); let el = old.get(k);
      if (el) old.delete(k); else { el = create(it); el._key = k; el.classList.add('enter'); requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('enter'))); }
      update?.(el, it);
      let next = prev ? prev.nextSibling : box_.firstChild;
      if (next !== el) box_.insertBefore(el, next);
      prev = el;
    }
  });
  for (const el of old.values()) { el._leaving = true; el.classList.add('leave'); setTimeout(() => flip(box_, () => el.remove()), 300); }
}

export const btn = (label, onclick, tipText, cls = '') => h('button', { class: `btn ${cls}`, onclick, tip: tipText }, label);
export const row = (...kids) => h('div', { class: 'row' }, ...kids);
export const col = (...kids) => h('div', { class: 'col' }, ...kids);
