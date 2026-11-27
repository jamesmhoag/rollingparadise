// Work for when nothing else is happening. The title screen uses it to make the game's heavy things ready behind the
// sign (main.js) without it showing. A piece of that work (building a die's body, a wallet's) cannot be cut finer
// than some tens of milliseconds, longer than a frame, so the rule is about when it may run, not how small it is:
//   - only in an idle period of the browser, after a frame has gone out;
//   - never while the player is moving the pointer or typing, nor for a moment after;
//   - only while the caller says the screen is `steady`: nothing on it is moving that the main thread draws. On the
//     title that is the sign lit and humming, between its pulses; what does move then (the motes, the grid floor) is
//     animated by the browser's compositor, off the main thread, and keeps its frame rate whatever the page is doing;
//   - and only if pieces of its kind have not been running long (LONGEST): one that would freeze the page noticeably
//     waits for the loading bar instead.
// A piece that may not run is not forced: it waits, and if the player leaves first, the bar does the rest at full
// speed (hurry).
//
// pacer({ steady }) gives one queue's pace: `await pace(ms, kind)` between pieces, telling it how long the last one
// took and what kind the next is. It learns each kind's usual time from that (the middle of its last five).

const QUIET = 350;      // ms with no input before work may go on
const LONGEST = 250;    // a kind of piece that usually takes longer than this is left for the loading bar
let lastInput = -1e9, watching = false;
function watch() {
  if (watching || typeof document === 'undefined') return; watching = true;
  const seen = () => { lastInput = performance.now(); };
  for (const ev of ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart']) document.addEventListener(ev, seen, { passive: true, capture: true });
}
// the browser's next idle period (without requestIdleCallback, Safari: a moment after the next frame)
const idlePeriod = (fn) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(() => fn()) : setTimeout(() => requestAnimationFrame(() => setTimeout(fn, 0)), 60));

// may a piece that usually takes `usual` ms run now?
export function fits({ usual = 0, sinceInput = Infinity, steady = true, hidden = false } = {}) {
  if (hidden) return true;                      // nobody is watching
  return steady && sinceInput >= QUIET && usual <= LONGEST;
}

export function pacer({ steady = () => true } = {}) {
  watch();
  const seen = {}, log = []; let fast = false, kick = null, ran = 0, waited = 0, kind = 'any';
  const usual = (k) => { const r = seen[k]; if (!r?.length) return 0; const m = r.slice().sort((a, b) => a - b); return m[m.length >> 1]; };
  const pace = (took, next = 'any') => {
    if (took != null) { const r = (seen[kind] ||= []); r.push(took); if (r.length > 5) r.shift(); ran++; log.push([kind, Math.round(took * 10) / 10, fast ? 1 : 0]); }
    kind = next;
    if (fast) return new Promise((r) => setTimeout(r, 0));
    return new Promise((resolve) => {
      kick = resolve;
      const look = () => idlePeriod(() => {
        if (fast) return;                         // hurried while waiting: kick has already let it go
        if (fits({ usual: usual(kind), sinceInput: performance.now() - lastInput, steady: !!steady(), hidden: document.hidden })) { kick = null; resolve(); } else { waited++; setTimeout(look, 120); }
      });
      look();
    });
  };
  // the player is waiting on it now: stop being polite
  const hurry = () => { fast = true; const k = kick; kick = null; k?.(); };
  return { pace, hurry, stats: () => ({ ran, waited, fast, usual: Object.fromEntries(Object.keys(seen).map((k) => [k, Math.round(usual(k) * 10) / 10])), log }) }; // (log: each piece's kind, time and whether it ran under the bar, for ?debug)
}
