// The title sign: neon tubes drawn from the design's own pieces (content/titlesign.js, cut by tools/title-sign.py),
// lit one after another. ROLLING a letter at a time, one die then the other, Paradise a run of joined script at a
// time (P, ar, a, di), the s with the swash and the palm's trunk as the one tube they are, the e, then the fronds
// in a sweep. Each tube comes up once, cleanly (no flicker on the way on), over its dark glass, which is always there. Lit, each
// tube hums and now and then buzzes (a quick shiver of brightness) on its own clock; the sign never blinks as a whole.
// The sign comes on in one of three orders, each as likely as the others: a letter and a piece at a time (as above),
// all at once in a wave from the top down, or from the middle of the top down and outward. Every few seconds, lit, a
// pulse runs it in one of the same orders (each as likely, never the same twice running): each tube swells brighter in
// its turn, and with a wave or a burst a light crosses the title behind it.
import { TITLE_SIGN } from '../content/titlesign.js';

const NS = 'http://www.w3.org/2000/svg';
const s = (tag, attrs = {}, ...kids) => { const el = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v); el.append(...kids.filter(Boolean)); return el; };
const at = (p) => `translate(${p.x} ${p.y})`;
const blurId = (n) => `ts-blur-${String(n).replace('.', '_')}`;
// the pause before each tube: a beat between letters, longer where the sign moves on to its next piece
const GAP = { O: 0.2, L1: 0.2, L2: 0.2, I: 0.2, N: 0.2, G: 0.2, die1: 0.42, die2: 0.3, P: 0.5, ar: 0.26, a: 0.26, di: 0.26, s: 0.3, e: 0.5, leaf1: 0.34 };
const LEAF = 0.15, FIRST = 0.35, CHASE_EVERY = 9; // (seconds between the pulses that run a lit sign)

// one tube's drawing: `kind` is 'glass' (unlit, always there) or 'on' (the lit tube with its glow)
function tube(p, kind) {
  const lit = kind === 'on', g = s('g', { class: kind });
  const shapes = (cls, extra = {}) => [
    ...(p.fill || []).map((x) => s('path', { d: x.d, transform: at(x), class: `${cls} f`, fill: lit ? p.color : null, ...extra })),
    ...(p.stroke || []).map((x) => s('path', { d: x.d, transform: at(x), class: `${cls} k`, fill: 'none', stroke: lit ? (p.strokeColor || p.color) : null, 'stroke-width': p.width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...extra }))];
  if (p.body) { // a die: a dark body with edges; lit, the glow fills the body
    if (!lit) g.append(...p.body.map((x) => s('path', { d: x.d, transform: at(x), fill: p.bodyColor })), ...shapes('t'));
    else g.append(s('g', { filter: `url(#${blurId(p.blur)})` }, ...p.lit.map((x) => s('path', { d: x.d, transform: at(x), fill: p.litColor })), ...p.litStroke.map((x) => s('path', { d: x.d, transform: at(x), fill: 'none', stroke: p.litStrokeColor, 'stroke-width': p.width }))), ...shapes('t'));
    return g;
  }
  if (lit) g.append(s('g', { filter: `url(#${blurId(p.blur)})` }, ...shapes('g')));
  g.append(...shapes('t')); return g;
}

// → { el, light(), off(then), seconds, steady() }: el is the sign; light() runs the sequence from dark
export function titleSign({ label = '' } = {}) {
  const { view, parts, back } = TITLE_SIGN, blurs = [...new Set(parts.map((p) => p.blur))];
  let t = FIRST; const when = parts.map((p, i) => { if (i) t += GAP[p.id] ?? LEAF; return t; }), seconds = t + 0.9;
  const svg = s('svg', { viewBox: view.join(' '), class: 'tsign', role: 'img', 'aria-label': label },
    s('defs', {}, ...blurs.map((n) => s('filter', { id: blurId(n), x: '-30%', y: '-30%', width: '160%', height: '160%', 'color-interpolation-filters': 'sRGB' }, s('feGaussianBlur', { stdDeviation: n })))));
  // stacked as drawn: ROLLING, the palm's dark board, the palm, the script, the dice
  const layer = (z) => parts.map((p, i) => [p, i]).filter(([p]) => p.z === z).map(([p, i]) => { const g = s('g', { class: `tube ${p.tone}${p.long ? ' long' : ''}`, 'data-tube': p.id }, tube(p, 'glass'), tube(p, 'on')); g.style.setProperty('--at', `${when[i].toFixed(2)}s`); g.style.setProperty('--back', `${((parts.length - 1 - i) * 0.035).toFixed(2)}s`);
    /* lit, each tube hums and buzzes to its own clock, so no two shiver together and the sign never blinks as one */
    g.style.setProperty('--i', i); g.style.setProperty('--hum', `${(4.6 + ((i * 37) % 23) / 10).toFixed(1)}s`); g.style.setProperty('--buzz', `${9 + ((i * 53) % 17)}s`); g.style.setProperty('--lag', `${(-((i * 29) % 31) / 2).toFixed(1)}s`); return g; });
  svg.append(...layer(1), ...back.map((x) => s('path', { d: x.d, transform: at(x), class: 'board' })), ...layer(3), ...layer(4), ...layer(5));
  const el = document.createElement('div'); el.className = 'sign'; const glow = document.createElement('div'); glow.className = 'glow'; el.append(glow, svg);
  const tubes = [...svg.querySelectorAll('.tube')].sort((a, b) => a.style.getPropertyValue('--i') - b.style.getPropertyValue('--i')), sweep = document.createElement('i'); sweep.className = 'sweep'; el.append(sweep);
  let timer = 0, round = 0, moving = Infinity; // moving: until when (performance.now) the sign is lighting, pulsing or going dark
  // The orders the sign can run in, each good both for coming on and for the pulse that runs it once lit:
  //   letters  a letter and a piece at a time, as the sign is written
  //   wave     everything at once from the top down: a line of light crossing the sign
  //   burst    from the middle of the top, down and outward to the ends
  // → for each tube (by its place in the sign), when its turn comes, 0 to 1 (null: the sign is not on the page to be measured)
  const ORDERS = ['letters', 'wave', 'burst'];
  const turns = (order) => { if (order === 'letters') return when.map((w) => (w - FIRST) / (when[when.length - 1] - FIRST || 1));
    const box = tubes.map((g) => { try { const r = g.getBBox(); return r.width || r.height ? r : null; } catch { return null; } }); if (box.some((r) => !r)) return null;
    const top = Math.min(...box.map((r) => r.y)), bottom = Math.max(...box.map((r) => r.y + r.height)), left = Math.min(...box.map((r) => r.x)), right = Math.max(...box.map((r) => r.x + r.width)), mid = (left + right) / 2;
    const far = box.map((r) => { const cx = r.x + r.width / 2, cy = r.y + r.height / 2; return order === 'wave' ? (cy - top) / (bottom - top || 1) : Math.hypot((cx - mid) / ((right - left) / 2 || 1), ((cy - top) / (bottom - top || 1)) * 0.8); });
    const most = Math.max(...far) || 1; return far.map((v) => v / most); };
  // each order has the same chance, whether for coming on or for the next pulse (never the same pulse twice running)
  let last = ''; const pick = (not) => { const list = ORDERS.filter((o) => o !== not); return list[Math.floor(Math.random() * list.length)]; };
  const SPAN = { letters: { on: when[when.length - 1] - FIRST, pulse: parts.length * 0.075 }, wave: { on: 1.3, pulse: 0.85 }, burst: { on: 1.5, pulse: 0.95 } };
  // set every tube's turn (`name`: the CSS variable) for an order, over that order's time for coming on or for a pulse (`kind`), from `from` seconds
  // → the order used (letters, if the sign is not on the page to be measured)
  const stage = (order, name, kind, from = 0) => { let T = turns(order); if (!T) { order = 'letters'; T = turns(order); } tubes.forEach((g, i) => g.style.setProperty(name, `${(from + T[i] * SPAN[order][kind]).toFixed(3)}s`)); return order; };
  // the light that crosses the title with a wave or a burst: a band coming down, or a ring opening from the top
  const flash = (order, secs) => { sweep.className = 'sweep'; void sweep.offsetWidth; if (order === 'letters') return; sweep.style.setProperty('--sweep', `${secs.toFixed(2)}s`); sweep.classList.add(order); };
  // lit, a pulse runs the sign now and then: each letter and piece swells brighter in its turn
  const chase = () => { if (!el.isConnected || !el.classList.contains('lit')) return; el.classList.remove('chase'); void el.offsetWidth;
    last = stage(pick(last), '--pd', 'pulse'); const span = SPAN[last].pulse; flash(last, span + 0.5); el.classList.add('chase'); moving = performance.now() + span * 1000 + 800; };
  // coming on from dark, in one of the orders
  let waits = 0;
  const light = () => { clearTimeout(timer); clearInterval(round); el.classList.remove('lit', 'off', 'go', 'chase');
    if (!el.isConnected && waits++ < 40) { timer = setTimeout(light, 25); return; } waits = 0; void el.offsetWidth; // (it is measured to be put in order, so it waits to be on the page)
    last = stage(pick(''), '--at', 'on', FIRST); const span = SPAN[last].on; flash(last, span + 0.6); el.classList.add('go'); moving = Infinity;
    timer = setTimeout(() => { if (!el.isConnected) return; el.classList.add('lit'); moving = performance.now() + 400; round = setInterval(chase, CHASE_EVERY * 1000); setTimeout(chase, 2600); }, (FIRST + span + 0.9) * 1000); };
  // every tube fades down, last lit first; then `then` (usually light again)
  const off = (then) => { clearTimeout(timer); clearInterval(round); el.classList.remove('chase'); el.classList.add('off'); moving = Infinity; timer = setTimeout(() => { if (!el.isConnected) return; then?.(); }, (parts.length * 0.035 + 0.6) * 1000); };
  // steady: the sign is lit and only humming (not lighting up, not mid-pulse, not going dark). Work done behind the
  // title is done then (main.js): nothing on it is moving that a busy moment could be seen in.
  const steady = () => el.isConnected && el.classList.contains('lit') && performance.now() > moving;
  return { el, light, off, seconds, steady };
}
