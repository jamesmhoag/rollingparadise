// DOM helpers shared by every screen: element builder, tooltips, scene and panel
// transitions, keyed list syncing with enter/leave/move animation, number tweens.
import { STATS } from '../data.js';
import { GUIDE, GUIDE_BY_CLASS } from '../content/guidance.js';
import { t as tx, hasText } from '../text.js';

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
    else if (k === 'tip') tip(el, v); else if (k === 'guide') el.dataset.guide = v; else if (k === 'style') { for (const [p, val] of Object.entries(v)) { if (p.startsWith('--')) el.style.setProperty(p, val); else el.style[p] = val; } }
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
export const stagePoint = local;
// A screen may take the right-click for itself (the table lets go of what is in your hand): return true to keep it.
export const rightClick = { take: null };
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

// ---------- click and hold to paint ----------
// Press to apply once, keep holding to apply again at a steady rate, and sweep to apply on each new target the
// pointer crosses. targetAt(ev) gives the target under the pointer ({ key, ... }) or null.
export function paint(el, targetAt, apply, ms = 170, onEnd) {
  let timer = null, at = null;
  const stop = () => { if (!timer) return; clearInterval(timer); timer = null; at = null; document.removeEventListener('pointerup', stop); onEnd?.(); };
  el.addEventListener('pointerdown', (ev) => { if (ev.button !== 0) return; const t0 = targetAt(ev); if (!t0) return; ev.preventDefault(); at = t0; apply(at, true);
    timer = setInterval(() => { if (at) apply(at, false); }, ms); document.addEventListener('pointerup', stop); });
  el.addEventListener('pointermove', (ev) => { if (!timer) return; const t1 = targetAt(ev); if (t1 && t1.key !== at?.key) apply(t1, false); at = t1; });
  return stop;
}

// ---------- hover mode ----------
// Two modes for every hover: Context (how it works, its numbers and outcomes) and Guidance (what to do with it and
// when; see content/guidance.js). Scroll the mouse wheel over a hover to switch. Both have the concise and verbose
// levels above: concise shows the name and the essentials, verbose adds what the thing is (its definition).
const MODE_KEY = 'rollingparadise.hovermode.v1';
export const hover = { mode: (() => { try { return globalThis.localStorage?.getItem(MODE_KEY) === 'guidance' ? 'guidance' : 'context'; } catch { return 'context'; } })() };
export function setHoverMode(mode) {
  hover.mode = mode; try { globalThis.localStorage?.setItem(MODE_KEY, mode); } catch { /* storage unavailable */ }
  T.el?.classList.toggle('guidance', mode === 'guidance');
}
const STAT_BY_SHORT = Object.fromEntries(Object.entries(STATS).flatMap(([k, X]) => [[X.short, k], [X.name, k]])); // a stat shown by its name (or its plain word)
// which guidance entry an element shows: data-guide, or worked out from what the element is
// mark an element with the guidance entry it shows (for things with no fixed class or label)
export const guided = (el, key) => { if (el?.dataset) el.dataset.guide = key; return el; };
// a button shows the entry whose `labels` (text keys) give its label, so rewording a button keeps its guidance
function labelGuide(el) {
  const txt = (el.textContent || '').trim(); if (!txt) return null; let best = null;
  for (const [k, G] of Object.entries(GUIDE)) for (const lk of G.labels || []) {
    const s = tx(lk).split('{')[0].trim(); if (!s) continue;
    if ((txt === s || txt.startsWith(s + ' ') || (s.length > 3 && txt.startsWith(s))) && (!best || s.length > best[0].length)) best = [s, k];
  }
  return best?.[1] || null;
}
export function guideKeyOf(el) {
  if (el.dataset?.guide) return el.dataset.guide;
  const c = el.classList; if (!c) return null;
  for (const [cls, key] of GUIDE_BY_CLASS) if (cls.split('.').every((x) => c.contains(x))) return key;
  if (c.contains('die')) return 'die';
  if (c.contains('chip')) return 'chip';
  if (c.contains('tcard') || c.contains('tag-t')) return 'trick';
  if (c.contains('cell')) return 'cell';
  if (c.contains('room')) { const r = [...c].find((x) => x.startsWith('r-')); return r ? 'room:' + r.slice(2) : null; }
  if (c.contains('stat')) { const k = STAT_BY_SHORT[el.querySelector('em')?.textContent]; return k ? 'stat:' + k : 'record'; }
  if (c.contains('pill')) { const name = (el.textContent || '').trim().split(' ')[0]; const k = Object.keys(STATS).find((x) => STATS[x].name === name); return k ? 'stat:' + k : 'step'; }
  if (el.tagName === 'BUTTON') return labelGuide(el);
  return null;
}
const nameOf = (raw) => { if (!raw) return ''; if (raw.nodeType) return raw.querySelector?.('b')?.textContent || ''; const m = /<b[^>]*>(.*?)<\/b>/.exec(raw); return m ? m[1] : ''; };
const modeTag = (mode, other) => `<div class="tt-mode">${mode}<span class="v"> · wheel for ${other}</span></div>`;
// the hover for an element in the current mode and level, as html or a node
export function tipContent(el) {
  const raw = typeof el._tip === 'function' ? el._tip() : el._tip, G = GUIDE[guideKeyOf(el)];
  if (!G) return raw;
  if (hover.mode === 'guidance') {
    const how = detail.verbose ? G.how : G.how.slice(0, 1);
    return `${modeTag('Guidance', 'context')}<b>${nameOf(raw) || G.name}</b>${detail.verbose ? `<p class="def">${G.def}</p>` : ''}<ul class="how">${how.map((x) => `<li>${x}</li>`).join('')}</ul>`;
  }
  if (!raw) return raw;
  const t = document.createElement('template'); if (raw.nodeType) t.content.append(raw.cloneNode(true)); else t.innerHTML = raw;
  const def = document.createElement('p'); def.className = 'def v'; def.innerHTML = G.def;
  const first = t.content.firstElementChild;
  if (first && first.tagName !== 'B') first.after(def); else { let n = t.content.firstChild; while (n && !(n.nodeType === 1 && n.tagName === 'B')) n = n.nextSibling; let m = n?.nextSibling; while (m && m.nodeType === 1 && m.tagName === 'SPAN') m = m.nextSibling; if (m) m.before(def); else t.content.append(def); }
  const tag = document.createElement('template'); tag.innerHTML = modeTag('Context', 'guidance'); t.content.prepend(tag.content);
  return t.content;
}
const show = (c) => { if (c.nodeType) T.el.replaceChildren(c); else T.el.innerHTML = c; };

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
  T.el = $('tooltip'); setDetail(detail.verbose); setHoverMode(hover.mode);
  document.addEventListener('contextmenu', (ev) => {
    ev.preventDefault(); if (rightClick.take?.(ev)) return; setDetail(!detail.verbose);
    toast(detail.verbose ? 'Verbose: hovers and prompts explain the rules. Right-click for concise.' : 'Concise: hovers and prompts show just the facts. Right-click for verbose.');
    if (T.cur) { const c = tipContent(T.cur); if (c) show(c); }
  });
  let lastWheel = 0; // the mouse wheel over a showing hover switches Context and Guidance
  document.addEventListener('wheel', (ev) => {
    if (!T.cur || !T.el.classList.contains('show') || !GUIDE[guideKeyOf(T.cur)]) return;
    ev.preventDefault(); const now = performance.now(); if (now - lastWheel < 400) return; lastWheel = now;
    setHoverMode(hover.mode === 'guidance' ? 'context' : 'guidance'); const c = tipContent(T.cur); if (c) show(c);
  }, { passive: false });
  document.addEventListener('mousemove', (ev) => {
    if (document.body.classList.contains('spinning')) { clearTimeout(T.timer); T.el.classList.remove('show'); T.cur = null; T.on = false; return; } // no hover while a die is spun (spin.js)
    const el = findTip(ev.target);
    if (el !== T.cur) {
      T.cur = el; clearTimeout(T.timer); T.el.classList.remove('show');
      if (el) T.timer = setTimeout(() => {
        const c = tipContent(el); if (!c || T.cur !== el) return;
        show(c);
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
// re-render the tooltip that is showing, in place (for hovers whose content follows the pointer within an element)
export function redrawTip() { const el = T.cur; if (!el || !T.el.classList.contains('show')) return; const c = tipContent(el); if (c) show(c); }

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

// A Build-mode field's label: its text, and (when help.<key> is written) a hover tip saying what the option is for.
export function lab(key, vars) {
  const help = `help.${key}`, has = hasText(help);
  return h('span', { class: `b-lab ${has ? 'has-help' : ''}`, text: tx(key, vars), ...(has ? { tip: tx(`help.${key}`) } : {}) });
}
