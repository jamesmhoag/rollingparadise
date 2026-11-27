// The chip painter: the one tool for setting chips on spaces by hand, used wherever a position is painted (your Stake
// before a bout, a Roller's or an opponent's position in Build mode, the test table). A rack of chips to paint with,
// four tools (Add, Insert, Change, Remove: stackedit.js says what each does to a stack), press to apply, hold to keep
// applying, sweep to apply on every space crossed, and the right button always removes.
//
// A surface gives: surface (the element painted on), targetAt(ev) → { key, ... } | null (the space under the pointer,
// with the chip pointed at if any), apply(at, op, item) → null when done, or why not (a line to show, '' for nothing
// to say), items() → what the rack holds ({ cap } entries are headings), look(item) → a chip to draw, tip(item, left).
// Options: left(item) → how many are left to lay (or null), pick { get, set } to remember the chip between visits,
// idle: the tools start switched off and switch off again when pressed twice (a surface that is also played on),
// warn(msg, at): how a refusal is shown (a toast by default, once a stroke).
import { h, btn, paint, guided, toast } from './core.js';
import { chipEl } from './parts.js';
import { PAINT_OPS } from '../stackedit.js';
import { t } from '../text.js';

const keyOf = (it) => (it && typeof it === 'object' ? it.key : it);
export function chipPainter({ surface, targetAt, apply, items, look, tip, left = () => null, pick, onEnd, onTool, idle = false, warn = (msg) => toast(msg, 'warn') }) {
  const st = { it: pick?.get?.() ?? null, op: idle ? null : 'add' };
  const rack = h('div', { class: 'col rack' }), tools = h('div', { class: 'row paint-ops' });
  function draw() {
    const list = items(), real = list.filter((x) => !x?.cap);
    st.it = real.find((x) => keyOf(x) === keyOf(st.it)) ?? real[0]; pick?.set?.(st.it);
    rack.replaceChildren(...list.map((it) => { if (it?.cap) return h('span', { class: 'cap rack-cap', text: it.cap });
      const n = left(it), b = btn('', () => { st.it = it; draw(); }, () => tip(it, n), `rack-chip ${keyOf(st.it) === keyOf(it) ? 'on' : ''}`); guided(b, 'brush');
      b.append(chipEl(look(it))); if (n != null) b.append(h('small', { class: 'num', text: n })); return b; }));
    tools.replaceChildren(...PAINT_OPS.map((op) => btn(t(`paint.${op}`), () => { st.op = idle && st.op === op ? null : op; draw(); onTool?.(st.op); }, t(`paint.${op}.tip`), `small ${st.op === op ? 'on' : ''}`)));
  }
  let warned = false;
  paint(surface, (ev) => (st.op ? targetAt(ev) : null), (at, first, erase) => { if (first) warned = false;
    const why = apply(at, erase ? 'remove' : st.op, st.it); if (why && !warned) { warned = true; warn(why, at); } }, 170, () => onEnd?.(), { right: true });
  draw();
  return { rack, tools, state: st, draw };
}
