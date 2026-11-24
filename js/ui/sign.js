// Neon signs. Each Roller's seat at the table, and the House's sign, is a neon sign built from a sign spec:
//
//   border, name, cls  [tube colour, glow colour] for the frame, the script name and the class under it
//   frame              how the frame is drawn: FRAMES
//   edge, edgeAt       a Unicode symbol set along the frame: at the corners, all along the top and bottom edge, or none
//   mount              what the sign hangs on: a backing colour and an optional image (any URL or data: URL)
//   blink              one part of the sign that blinks, and how: BLINKS. Every pattern is slow and soft (well under
//                      three changes a second, never fully dark) so none of them can trigger a photosensitive
//                      reaction, and all of them stop for players who ask their system for reduced motion.
//
// The player's sign is D.NEON.you, the House's D.NEON.house, and every opponent's is D.NEON.them unless its roster
// entry has its own `sign` (any of the fields above), set in Build mode's Opponent maker.
import * as D from '../data.js';

export const FRAMES = ['tube', 'double', 'dashed', 'dotted', 'bulbs', 'none'];
export const EDGE_AT = ['none', 'corners', 'edge'];
export const BLINK_PARTS = ['none', 'name', 'cls', 'border', 'edge'];
export const BLINKS = ['breathe', 'pulse', 'flicker', 'alternate'];
export const EDGE_GLYPHS = ['★', '✦', '◆', '♦', '♠', '♣', '♥', '●', '✚', '☾', '⚡', '♛', '❖', '✿', '$', '¢'];
const PARTS = ['border', 'name', 'cls'];
export const BASE_SIGN = { frame: 'tube', radius: 12, edge: '★', edgeAt: 'none', mount: { color: '', image: '' }, blink: { part: 'none', pattern: 'breathe' } };

// the sign a Roller (or the House) shows: the base, then the shared look for its side, then its own
export function signOf(who, own) {
  const side = D.NEON[who] || D.NEON.them, out = { ...BASE_SIGN, ...side, ...(own || {}) };
  out.mount = { ...BASE_SIGN.mount, ...(side.mount || {}), ...(own?.mount || {}) }; out.blink = { ...BASE_SIGN.blink, ...(side.blink || {}), ...(own?.blink || {}) };
  for (const p of PARTS) out[p] = (own?.[p] || side[p] || D.NEON.them[p]).slice(0, 2);
  return out;
}
const safeUrl = (u) => (/^(https?:|data:image\/|assets\/)/.test(u || '') ? `url("${String(u).replace(/"/g, '%22')}")` : '');

// Dress an element as a sign: its colours (as the --who-part1/2 variables the table's styles read), its frame, mount,
// edge symbols and blink. Can be called again to redress it.
export function dressSign(el, spec, who) {
  for (const p of PARTS) spec[p].forEach((c, i) => el.style.setProperty(`--${who}-${p}${i + 1}`, c));
  el.style.setProperty('--sf1', spec.border[0]); el.style.setProperty('--sf2', spec.border[1]);
  el.style.setProperty('--sign-r', `${Math.max(0, +spec.radius || 0)}px`);
  el.style.setProperty('--mount', spec.mount.color || 'transparent'); el.style.setProperty('--mount-img', safeUrl(spec.mount.image) || 'none');
  el.classList.remove(...[...el.classList].filter((c) => c.startsWith('frame-') || c.startsWith('blink-')));
  el.classList.add('sign', `frame-${FRAMES.includes(spec.frame) ? spec.frame : 'tube'}`);
  if (spec.blink.part !== 'none') el.classList.add(`blink-${spec.blink.part}`, `blink-${BLINKS.includes(spec.blink.pattern) ? spec.blink.pattern : 'breathe'}`);
  for (const old of el.querySelectorAll(':scope > .sign-edge')) old.remove();
  if (spec.edge && spec.edgeAt !== 'none') {
    const g = [...spec.edge][0] || '★', mk = (cls, text) => { const s = document.createElement('span'); s.className = `sign-edge ${cls}`; s.textContent = text; s.setAttribute('aria-hidden', 'true'); el.append(s); };
    if (spec.edgeAt === 'corners') for (const k of ['tl', 'tr', 'bl', 'br']) mk(`corner ${k}`, g);
    else { const run = `${g} `.repeat(48); mk('run top', run); mk('run bottom', run); }
  }
  return el;
}
