// Opening a foil pack. The pack comes up before you, a body of foil (ui/gear3d.js packStage) in its set's look
// (content/finishes.js packLook, set in Build mode's Gear maker). Take hold of the top and drag across it: the crimp
// tears off a strip at a time as far as you have pulled, and the foil crinkles under your hand. Torn all the way, the
// strip flies off, and the tricks slide up out of it into your hand, fanned. Point at one and it comes forward. The
// rare one is always at the back, as it is packed. Without WebGL the tricks come straight out.
import { h, btn } from './core.js';
import { packStage } from './gear3d.js';
import { trickCard } from './trickcard.js';
import { packLook } from '../content/finishes.js';
import { sfx } from './sfx.js';
import * as D from '../data.js';
import { t as tx } from '../text.js';

const STRIPS = 9, DONE_AT = 0.92;
const still = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const anim = (ms, step) => new Promise((res) => { const t0 = performance.now(); const f = (now) => { const k = Math.min(1, (now - t0) / ms); step(k); if (k < 1) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });

// got: the tricks pulled (the rare one last, as rollPack makes them). → a promise, settled when the hand is put away.
export function openPack(q, got, cls) {
  const P = D.PACKS[q] || {}, look = packLook(q, P);
  return new Promise((done) => {
    const hint = h('p', { class: 'pack-hint', text: tx('pack.hint') }), stage = h('div', { class: 'pack-stage' }), fan = h('div', { class: 'pack-fan' });
    const finish = btn(tx('pack.done'), () => { root.classList.add('leaving'); setTimeout(() => { root.remove(); done(); }, still() ? 0 : 260); }, null, 'big go off');
    const skip = btn(tx('pack.tear-button'), () => tearAll(), null, 'small');
    const root = h('div', { class: 'pack-open' }, h('h2', { class: 'pack-title', text: tx('pack.title', { name: P.name || '' }) }), stage, hint, h('div', { class: 'row pack-buttons' }, skip, finish), fan);
    document.body.append(root);
    let S = null, torn = 0, opened = false;
    // the hand fanned: the first in front, each after it a little behind, the rare one at the very back
    const reveal = async () => {
      if (opened) return; opened = true; hint.textContent = tx('pack.fanned'); skip.remove(); root.classList.add('fanned');
      const n = got.length;
      got.forEach((tr, i) => {
        const card = trickCard(tr, cls), c = i - (n - 1) / 2, wrap = h('div', { class: `fan-card ${i === n - 1 ? 'rare' : ''}` }, card);
        wrap.style.setProperty('--x', `${c * 92}px`); wrap.style.setProperty('--y', `${Math.abs(c) * Math.abs(c) * 9}px`); wrap.style.setProperty('--r', `${c * 7}deg`);
        wrap.style.zIndex = String(n - i); wrap.style.transitionDelay = `${(n - 1 - i) * 90}ms`;
        fan.append(wrap);
      });
      requestAnimationFrame(() => requestAnimationFrame(() => fan.classList.add('out')));
      sfx('card'); finish.classList.remove('off');
    };
    async function tearAll() {
      if (opened) return;
      if (S) { for (let p = torn; p <= 1.0001; p += 1 / STRIPS) { S.tear(p); sfx('tear'); if (!still()) await anim(45, () => {}); } torn = 1;
        if (!still()) await anim(460, (k) => S.fly(k * k)); stage.classList.add('opened'); }
      reveal();
    }
    packStage(look, Math.min(300, Math.round(innerHeight * 0.42))).then((st) => {
      S = st; if (!S) { stage.remove(); hint.remove(); return reveal(); }
      stage.append(S.canvas);
      // the hand on it: where the pull started, how fast it moves (the crinkle), and the lean toward it
      let hold = null, crumple = 0, phase = 0, raf = 0, lastSound = 0, lastStrip = 0, lean = [0, 0];
      const turn = () => new DOMMatrix().rotateSelf(-8 + lean[0], 16 + lean[1], 0);
      const settle = () => { cancelAnimationFrame(raf); const f = () => { crumple *= 0.86; phase += 0.04; S.crinkle(crumple, phase); S.draw(turn()); if (crumple > 0.01) raf = requestAnimationFrame(f); else { S.crinkle(0, 0); S.draw(turn()); } }; raf = requestAnimationFrame(f); };
      const at = (ev) => { const r = S.canvas.getBoundingClientRect(); return [(ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height]; };
      S.canvas.addEventListener('pointerdown', (ev) => { if (opened) return; const [x, y] = at(ev); hold = { x, y, t: performance.now(), px: ev.clientX, py: ev.clientY, top: y < 0.42 };
        S.canvas.setPointerCapture(ev.pointerId); crumple = Math.min(1.2, crumple + 0.5); sfx('crinkle'); settle(); });
      S.canvas.addEventListener('pointermove', (ev) => {
        const [x, y] = at(ev); lean = [(y - 0.5) * -14, (x - 0.5) * 22];
        if (!hold) { if (!opened) S.draw(turn()); return; }
        const now = performance.now(), dt = Math.max(8, now - hold.t), sp = Math.hypot(ev.clientX - hold.px, ev.clientY - hold.py) / dt;
        hold.t = now; hold.px = ev.clientX; hold.py = ev.clientY; crumple = Math.min(1.4, crumple + sp * 0.35); phase += sp * 0.2;
        if (now - lastSound > 110 && sp > 0.15) { lastSound = now; sfx('crinkle'); }
        // a pull from the top tears along it as far as the hand has gone, from the notch on the left
        if (hold.top) { const p = Math.max(0, Math.min(1, (x - 0.12) / 0.76)); if (p > torn) { torn = p; S.tear(p); const k = Math.floor(p * STRIPS); if (k > lastStrip) { lastStrip = k; sfx('tear'); } }
          hint.textContent = torn > 0.05 ? tx('pack.keep-going') : tx('pack.hint'); if (torn >= DONE_AT) { hold = null; tearAll(); return; } }
        settle(); });
      const let_go = () => { hold = null; settle(); };
      S.canvas.addEventListener('pointerup', let_go); S.canvas.addEventListener('pointercancel', let_go);
      S.canvas.addEventListener('pointerleave', () => { lean = [0, 0]; if (!opened) S.draw(turn()); });
    });
  });
}
