// Sound effects. Every step of play has a sound, and the musical ones are real instruments (short samples rendered
// from a General MIDI soundfont by tools/sfx/render.py: piano, Rhodes, guitars, upright bass, muted trumpet, flute,
// strings, harp, and a jazz kit's brushes, ride, rim, wood blocks, castanets, shaker, triangle) played in the key the
// band is in (musicKey), so they sit inside the music as harmony rather than on top of it. The table's physical
// sounds (a card slid, a chip set down, dice thrown) are wood and clay; only the element textures (fire, acid...)
// are still made of filtered noise.
//
// An action is heard at each stage: a touch on anything you can use, the pick-up (interact), each step of it
// (a die set on a trick, an aim chosen), and its result (locked in, or refused). The House's plays, the board's own
// movements and the opponent's moves have theirs; the opponent's sit to the right of the stereo field, yours to the
// left. Browsers only let sound start after the player touches the page. The 🔊 button turns them on or off.
import { btn } from './core.js';
import { t } from '../text.js';
import { musicKey } from './music.js';

const KEY = 'rollingparadise.sfx', VOL = 0.4;
const saved = () => { try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; } };
const keep = (on) => { try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* storage unavailable */ } };
let ctx = null, out = null, on = saved(), noiseBuf = null;
const last = new Map(); // a sound repeated within a few milliseconds plays once (a whole stack landing is one clatter)
export const SAMPLES = ['piano', 'rhodes', 'nylon', 'guitar', 'bass', 'muted', 'flute', 'horn', 'strings', 'harp', 'ride', 'brush', 'swish', 'rim', 'castanet',
  'block_hi', 'block_lo', 'shaker', 'triangle', 'claves', 'kick', 'tamb', 'crash', 'cabasa', 'conga', 'bongo', 'chimes'];
const buf = new Map();

function audio() {
  if (ctx || typeof window === 'undefined') return ctx;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  ctx = new AC(); out = ctx.createGain(); out.gain.value = VOL; out.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  for (const n of SAMPLES) fetch(`assets/sfx/${n}.mp3`).then((r) => r.arrayBuffer()).then((a) => ctx.decodeAudioData(a)).then((b) => buf.set(n, b)).catch(() => {});
  return ctx;
}
// where a sound goes: straight out, or panned (o.pan: -1 left, your side, to 1 right, theirs)
function dest(o) { if (!o.pan || !ctx.createStereoPanner) return out; const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, o.pan)); p.connect(out); return p; }

// ---------- building blocks ----------
// a sampled instrument; semis: semitones from the sample's own C
function inst(name, semis = 0, o = {}) {
  const b = buf.get(name); if (!b) return false;
  const t0 = ctx.currentTime + (o.at || 0), src = ctx.createBufferSource(), g = ctx.createGain();
  src.buffer = b; src.playbackRate.value = 2 ** (semis / 12) * (o.rate || 1);
  g.gain.setValueAtTime(o.gain ?? 0.5, t0); if (o.len) g.gain.setTargetAtTime(0.0001, t0 + o.len, 0.06);
  src.connect(g).connect(dest(o)); src.start(t0); src.stop(t0 + (o.len ? o.len + 0.4 : b.duration / src.playbackRate.value + 0.05));
  return true;
}
// a note of the scale the band is in: deg = semitones over the key's root (0 = root, 4 = major 3rd, 7 = 5th...),
// put within half an octave of the sample's C so no sample is stretched far
const inKey = (deg) => { let s = ((musicKey() + deg) % 12 + 12) % 12; if (s > 6) s -= 12; return s; };
const note = (name, deg, o = {}) => inst(name, inKey(deg) + (o.oct || 0) * 12, o);
const hit = (name, o = {}) => inst(name, 0, { ...o, rate: (o.rate || 1) * (0.96 + Math.random() * 0.08) });
function noise(dur, o = {}) {
  const t0 = ctx.currentTime + (o.at || 0), src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noiseBuf; f.type = o.filter || 'bandpass'; f.frequency.setValueAtTime(o.freq || 1500, t0); if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + dur); f.Q.value = o.q ?? 1;
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(o.gain ?? 0.3, t0 + (o.attack ?? 0.004)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(dest(o)); src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.05);
}
const rnd = (a, b) => a + Math.random() * (b - a);
const chord = (name, degs, o = {}) => degs.forEach((d, i) => note(name, d, { ...o, at: (o.at || 0) + i * (o.roll ?? 0.035), gain: (o.gain ?? 0.35) * (1 - i * 0.08) }));

// ---------- every sound, by name ----------
export const SOUNDS = {
  // the table's physical sounds: clay chips, wooden dice, cards on felt
  card: (o) => { noise(0.16, { ...o, freq: 2400, to: 700, q: 0.8, gain: 0.2 }); hit('brush', { ...o, gain: 0.18, at: 0.08 }); },
  stack: (o) => { SOUNDS.card(o); hit('block_lo', { ...o, gain: 0.18, at: 0.15, rate: 1.3 }); },
  chip: (o) => { hit('castanet', { ...o, gain: 0.45, rate: rnd(1, 1.2) }); },
  die: (o) => { hit('block_lo', { ...o, gain: 0.4, rate: rnd(0.85, 1) }); },
  roll: (o) => { hit('shaker', { ...o, gain: 0.3 }); for (let i = 0; i < 8; i++) { const at = 0.06 + i * rnd(0.045, 0.08) + (i > 5 ? 0.08 : 0); hit(i % 3 ? 'block_lo' : 'block_hi', { ...o, at, gain: 0.32 * (1 - i / 11), rate: rnd(0.85, 1.15) }); } },
  land: (o) => { for (let i = 0; i < 3; i++) hit('castanet', { ...o, at: i * 0.04, gain: 0.3, rate: rnd(0.95, 1.2) }); },
  pay: (o) => { for (let i = 0; i < 5; i++) hit('castanet', { ...o, at: i * 0.05, gain: 0.3, rate: 1.25 - i * 0.06 }); note('rhodes', 7, { ...o, at: 0.1, gain: 0.12 }); },
  spawn: (o) => { hit('triangle', { ...o, gain: 0.15, rate: 1.2 }); },
  move: (o) => { hit('shaker', { ...o, gain: 0.22 }); hit('cabasa', { ...o, gain: 0.15, at: 0.08 }); },
  // every stage of your own action
  touch: (o) => { hit('rim', { ...o, gain: 0.07, rate: 1.5 }); }, // a touch on something you can use
  pick: (o) => { note('nylon', 7, { ...o, gain: 0.2, len: 0.35 }); }, // you pick something up or select it
  step: (o) => { note('guitar', 4, { ...o, gain: 0.22, len: 0.4 }); }, // a step of the action: a die set on a trick
  aim: (o) => { note('harp', 9, { ...o, gain: 0.25 }); note('harp', 4, { ...o, gain: 0.18, at: 0.06 }); }, // an aim chosen
  bid: (o) => { SOUNDS.chip(o); chord('rhodes', [4, 7], { ...o, at: 0.03, gain: 0.2, roll: 0.03 }); }, // a chip bid
  confirm: (o) => { chord('piano', [0, 7, 16], { ...o, gain: 0.3, roll: 0.045 }); }, // the result: locked in
  undo: (o) => { note('nylon', 7, { ...o, gain: 0.2 }); note('nylon', 4, { ...o, gain: 0.18, at: 0.09 }); },
  refuse: (o) => { note('bass', 7, { ...o, gain: 0.45, len: 0.18 }); note('bass', 0, { ...o, gain: 0.45, at: 0.16, len: 0.28 }); }, // not allowed: a soft low "uh-uh"
  turn: (o) => { hit('ride', { ...o, gain: 0.22 }); hit('swish', { ...o, gain: 0.18, at: 0.05 }); }, // a new turn opens
  phase: (o) => { hit('brush', { ...o, gain: 0.2 }); }, // a phase of the turn opens
  win: (o) => { chord('piano', [0, 4, 7, 14], { ...o, gain: 0.35, roll: 0.09 }); chord('strings', [4, 11], { ...o, gain: 0.18, at: 0.3 }); hit('crash', { ...o, gain: 0.12, at: 0.35 }); },
  lose: (o) => { note('muted', 7, { ...o, gain: 0.35, len: 0.3 }); note('muted', 5, { ...o, gain: 0.33, at: 0.32, len: 0.3 }); note('muted', 3, { ...o, gain: 0.3, at: 0.64, len: 0.6 }); note('bass', 0, { ...o, gain: 0.35, at: 0.64 }); },
  // the opponent's moves, from across the table
  'opp-draw': (o) => SOUNDS.card({ pan: 0.55, ...o }),
  'opp-roll': (o) => SOUNDS.roll({ pan: 0.55, ...o }),
  'opp-bid': (o) => SOUNDS.bid({ pan: 0.55, ...o }),
  'opp-aim': (o) => { note('guitar', 9, { pan: 0.55, ...o, gain: 0.22, len: 0.4 }); },
  // the House's phases: each type of effect has its own voice
  investment: (o) => { chord('rhodes', [0, 4, 7, 11], { ...o, gain: 0.3, roll: 0.07 }); }, // rising, bright
  insurance: (o) => { note('bass', 0, { ...o, gain: 0.55 }); hit('kick', { ...o, gain: 0.35 }); hit('brush', { ...o, gain: 0.2, at: 0.02 }); }, // a shield's thud
  expense: (o) => { note('muted', 7, { ...o, gain: 0.32, len: 0.16 }); note('muted', 4, { ...o, gain: 0.3, at: 0.16, len: 0.3 }); hit('triangle', { ...o, gain: 0.12 }); }, // the fee is called
  correction: (o) => { chord('nylon', [12, 7, 4, 0], { ...o, gain: 0.25, roll: 0.03 }); hit('swish', { ...o, gain: 0.2 }); }, // a strum across the table
  miss: (o) => { note('bass', 0, { ...o, gain: 0.3, len: 0.25, oct: -1 }); }, // nothing landed
  bonus: (o) => { note('piano', 14, { ...o, gain: 0.3 }); note('piano', 7, { ...o, gain: 0.28, at: 0.09, oct: 1 }); hit('chimes', { ...o, gain: 0.12, at: 0.05 }); },
  settle: (o) => SOUNDS.pay(o),
  // the elements: a texture and an instrument
  burn: (o) => { for (let i = 0; i < 8; i++) noise(0.03, { ...o, at: rnd(0, 0.45), freq: rnd(1500, 4000), gain: rnd(0.06, 0.16) }); noise(0.5, { ...o, freq: 500, filter: 'lowpass', gain: 0.08, attack: 0.1 }); hit('shaker', { ...o, gain: 0.12 }); },
  shock: (o) => { noise(0.15, { ...o, freq: 5000, gain: 0.1 }); note('guitar', 6, { ...o, gain: 0.2, len: 0.12, oct: 1 }); note('guitar', 7, { ...o, gain: 0.2, at: 0.06, len: 0.2, oct: 1 }); },
  frost: (o) => { hit('triangle', { ...o, gain: 0.2, rate: 1.3 }); hit('chimes', { ...o, gain: 0.15, at: 0.05 }); },
  acid: (o) => { noise(0.45, { ...o, freq: 6000, filter: 'highpass', gain: 0.1, attack: 0.05 }); hit('cabasa', { ...o, gain: 0.2 }); },
  boom: (o) => { hit('kick', { ...o, gain: 0.6 }); hit('crash', { ...o, gain: 0.15, at: 0.02 }); note('bass', 0, { ...o, gain: 0.4, oct: -1 }); },
  poison: (o) => { for (let i = 0; i < 4; i++) hit(i % 2 ? 'conga' : 'bongo', { ...o, at: i * 0.09, gain: 0.2, rate: rnd(0.9, 1.2) }); },
  corrupt: (o) => { note('strings', 0, { ...o, gain: 0.22, len: 0.5, oct: -1 }); note('strings', 1, { ...o, gain: 0.16, len: 0.4, oct: -1, at: 0.1 }); }, // a minor 2nd that resolves away
  creature: (o) => { for (let i = 0; i < 4; i++) note('flute', i % 2 ? 9 : 7, { ...o, at: i * 0.07, gain: 0.2, len: 0.1 }); },
  hazard: (o) => SOUNDS.burn(o),
};

export function sfx(name, delay = 0, o = {}) {
  if (!on || !SOUNDS[name]) return;
  if (!audio() || ctx.state !== 'running') { ctx?.resume?.(); if (ctx?.state !== 'running') return; }
  const now = performance.now(); if (now - (last.get(name) || 0) < 45) return; last.set(name, now);
  if (delay) setTimeout(() => SOUNDS[name](o), delay); else SOUNDS[name](o);
}
export const sfxOn = () => on;
export const samplesLoaded = () => buf.size; // how many instrument samples are decoded and ready

// anything you can use answers a touch: buttons, chips, dice, cards, spaces, pickers (the press, before the click)
const TOUCHABLE = 'button, select, input, a, .chip, .die, .tcard, .cell, .item, .gcard, .b-item, .pick-card, [data-act], .has-tip.clickable';
export function initSfx(stage) {
  const button = btn('🔊', () => { on = !on; keep(on); mark(); if (on) { audio(); ctx?.resume?.(); sfx('chip'); } }, () => t(on ? 'sfx.on' : 'sfx.off'), 'small sfx-btn');
  const mark = () => { button.classList.toggle('muted', !on); button.textContent = on ? '🔊' : '🔈'; };
  mark(); stage.append(button);
  const first = () => { document.removeEventListener('pointerdown', first, true); if (on) { audio(); ctx?.resume?.(); } };
  document.addEventListener('pointerdown', first, true);
  stage.addEventListener('pointerdown', (e) => { const el = e.target.closest?.(TOUCHABLE); if (el && !el.disabled && el !== button) sfx('touch'); }, true);
}
