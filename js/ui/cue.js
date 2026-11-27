// The rolling light: what can be acted on right now.
// Anything that can be chosen at this moment carries the class `cue` (whoever draws it sets that, and nothing that
// cannot be chosen ever has it). Its edge stays faintly lit, so the whole choice can be read at a glance, and one
// brighter light runs through them all in order, one at a time (`cue-on`), then rests a beat and runs again.
// One chaser serves a whole scene: spaces of a position, tricks and the Run, dice and the Roll alike. The colour is
// the CSS variable --cue-c wherever it is set (style.css: .cue).
const LAP = 1500, REST = 520, FLOOR = 70, CEIL = 300, TRAIL = 2; // ms a lap takes, ms between laps, the shortest and longest step, how many stay lit behind the light
const still = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function chaser(root) {
  let list = [], at = 0, timer = 0;
  // left to right, and down each column: the light sweeps the table the way it is read
  const inOrder = () => [...root.querySelectorAll('.cue')].map((el) => { const b = el.getBoundingClientRect(); return { el, x: Math.round((b.left + b.width / 2) / 12), y: b.top }; })
    .filter((x) => x.el.offsetParent !== null || x.el.getClientRects().length).sort((a, b) => a.x - b.x || a.y - b.y).map((x) => x.el);
  const dark = () => { for (const el of root.querySelectorAll('.cue-on')) el.classList.remove('cue-on'); };
  function step() {
    if (!root.isConnected) return; // the scene is gone: the light stops with it
    if (still()) { dark(); timer = setTimeout(step, 1000); return; }
    if (at >= list.length + TRAIL) { list = inOrder(); at = 0; timer = setTimeout(step, list.length ? REST : 300); return; }
    if (!at) { dark(); list = inOrder(); }
    list[at]?.classList.contains('cue') && list[at].classList.add('cue-on'); list[at - TRAIL]?.classList.remove('cue-on'); at++;
    timer = setTimeout(step, Math.max(FLOOR, Math.min(CEIL, LAP / Math.max(1, list.length))));
  }
  timer = setTimeout(step, 300);
  return { stop() { clearTimeout(timer); dark(); } };
}
// marks `el` as something that can be chosen now, or not
export const cue = (el, on) => { if (!el) return; el.classList.toggle('cue', !!on); if (!on) el.classList.remove('cue-on'); };
