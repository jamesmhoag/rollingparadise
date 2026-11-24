// Sound effects, made on the fly with the Web Audio API (no files to load): the table's physical sounds (a card slid
// onto the Run, a chip bid, a die set down, a handful of dice thrown, chips landing) and one for each kind of effect
// the House plays, so you hear what happened as well as see it: Investments ring upward, Insurances thud like a
// shield, Expenses ring the till, Corrections sweep, and each element has its own (fire crackles, a shock zaps, frost
// tinkles, acid fizzes, a Boom thumps, poison bubbles, corruption grinds). Browsers only let sound start after the
// player touches the page. The 🔊 button beside the music's ♪ turns them on or off (remembered in this browser).
import { btn } from './core.js';
import { t } from '../text.js';

const KEY = 'rollingparadise.sfx', VOL = 0.35;
const saved = () => { try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; } };
const keep = (on) => { try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* storage unavailable */ } };
let ctx = null, out = null, on = saved(), noiseBuf = null;
const last = new Map(); // a sound repeated within a few milliseconds plays once (a whole stack landing is one clatter)

function audio() {
  if (ctx || typeof window === 'undefined') return ctx;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  ctx = new AC(); out = ctx.createGain(); out.gain.value = VOL; out.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}
// building blocks: a tone with an envelope, and a burst of filtered noise
function tone(freq, dur, o = {}) {
  const t0 = ctx.currentTime + (o.at || 0), osc = ctx.createOscillator(), g = ctx.createGain();
  osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(freq, t0); if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t0 + dur);
  if (o.detune) osc.detune.value = o.detune;
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(o.gain ?? 0.4, t0 + (o.attack ?? 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(out); osc.start(t0); osc.stop(t0 + dur + 0.05);
}
function noise(dur, o = {}) {
  const t0 = ctx.currentTime + (o.at || 0), src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noiseBuf; f.type = o.filter || 'bandpass'; f.frequency.setValueAtTime(o.freq || 1500, t0); if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + dur); f.Q.value = o.q ?? 1;
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(o.gain ?? 0.3, t0 + (o.attack ?? 0.004)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(out); src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.05);
}
const rnd = (a, b) => a + Math.random() * (b - a);

// every sound, by name
export const SOUNDS = {
  card: () => { noise(0.16, { freq: 2400, to: 700, q: 0.8, gain: 0.22 }); noise(0.03, { at: 0.13, freq: 900, gain: 0.12 }); }, // a card slid onto the Run
  stack: () => { SOUNDS.card(); noise(0.05, { at: 0.16, freq: 600, filter: 'lowpass', gain: 0.25 }); }, // a copy laid on another
  chip: () => { const f = rnd(2900, 3500); noise(0.02, { freq: 4000, gain: 0.25 }); tone(f, 0.09, { gain: 0.16 }); tone(f * 1.48, 0.06, { gain: 0.08 }); }, // ceramic clack
  bid: () => { SOUNDS.chip(); tone(1760, 0.25, { at: 0.04, gain: 0.07 }); }, // a chip bid, with a small ring
  die: () => { tone(rnd(170, 230), 0.07, { type: 'triangle', gain: 0.35 }); noise(0.04, { freq: 900, filter: 'lowpass', gain: 0.2 }); }, // a die set down on wood
  roll: () => { for (let i = 0; i < 9; i++) { const at = i * rnd(0.04, 0.075) + (i > 5 ? 0.08 : 0); tone(rnd(160, 320), 0.05, { type: 'triangle', at, gain: 0.25 * (1 - i / 12) }); noise(0.03, { at, freq: rnd(700, 1600), gain: 0.12 }); } },
  land: () => { for (let i = 0; i < 3; i++) { const f = rnd(2700, 3400); tone(f, 0.07, { at: i * 0.035, gain: 0.08 }); } }, // chips landing on a stack
  pay: () => { for (let i = 0; i < 5; i++) tone(2400 - i * 180, 0.12, { at: i * 0.05, gain: 0.08 }); }, // chips paid away to the Stage
  // the House's phases: each type of effect has its own voice
  investment: () => { [523, 659, 784].forEach((f, i) => tone(f, 0.35, { at: i * 0.07, gain: 0.14 })); }, // rising, a little bright
  insurance: () => { tone(110, 0.35, { type: 'triangle', gain: 0.4 }); noise(0.08, { freq: 300, filter: 'lowpass', gain: 0.3 }); tone(220, 0.25, { at: 0.02, gain: 0.08 }); }, // a shield's thud
  expense: () => { tone(2093, 0.4, { gain: 0.12 }); tone(2637, 0.35, { at: 0.03, gain: 0.1 }); noise(0.06, { freq: 3500, gain: 0.15 }); }, // the till rings
  correction: () => noise(0.4, { freq: 400, to: 2600, q: 2, gain: 0.2, attack: 0.08 }), // a sweep across the table
  miss: () => tone(140, 0.18, { type: 'triangle', to: 90, gain: 0.2 }), // nothing landed
  bonus: () => { tone(988, 0.2, { gain: 0.1 }); tone(1319, 0.3, { at: 0.08, gain: 0.1 }); },
  settle: () => SOUNDS.pay(),
  // elements
  burn: () => { for (let i = 0; i < 8; i++) noise(0.03, { at: rnd(0, 0.45), freq: rnd(1500, 4000), gain: rnd(0.08, 0.2) }); noise(0.5, { freq: 500, filter: 'lowpass', gain: 0.1, attack: 0.1 }); },
  shock: () => { tone(1400, 0.18, { type: 'sawtooth', to: 120, gain: 0.12 }); noise(0.15, { freq: 5000, gain: 0.12 }); },
  frost: () => { for (let i = 0; i < 6; i++) tone(rnd(2500, 4200), 0.25, { at: i * 0.05, gain: 0.05 }); },
  acid: () => noise(0.45, { freq: 6000, filter: 'highpass', gain: 0.12, attack: 0.05 }),
  boom: () => { tone(90, 0.5, { to: 35, gain: 0.5 }); noise(0.4, { freq: 300, filter: 'lowpass', gain: 0.35 }); },
  poison: () => { for (let i = 0; i < 4; i++) tone(rnd(300, 500), 0.12, { at: i * 0.09, to: rnd(600, 900), gain: 0.08 }); },
  corrupt: () => { tone(110, 0.4, { type: 'sawtooth', detune: 30, gain: 0.08 }); tone(116, 0.4, { type: 'sawtooth', gain: 0.08 }); },
  creature: () => { tone(300, 0.35, { to: 600, type: 'triangle', gain: 0.12 }); tone(450, 0.3, { at: 0.12, to: 250, type: 'triangle', gain: 0.1 }); },
  hazard: () => SOUNDS.burn(),
};

export function sfx(name, delay = 0) {
  if (!on || !SOUNDS[name]) return;
  if (!audio() || ctx.state !== 'running') { ctx?.resume?.(); if (ctx?.state !== 'running') return; }
  const now = performance.now(); if (now - (last.get(name) || 0) < 45) return; last.set(name, now);
  if (delay) setTimeout(() => SOUNDS[name](), delay); else SOUNDS[name]();
}
export const sfxOn = () => on;

export function initSfx(stage) {
  const button = btn('🔊', () => { on = !on; keep(on); mark(); if (on) { audio(); ctx?.resume?.(); sfx('chip'); } }, () => t(on ? 'sfx.on' : 'sfx.off'), 'small sfx-btn');
  const mark = () => { button.classList.toggle('muted', !on); button.textContent = on ? '🔊' : '🔈'; };
  mark(); stage.append(button);
  const first = () => { document.removeEventListener('pointerdown', first, true); if (on) { audio(); ctx?.resume?.(); } };
  document.addEventListener('pointerdown', first, true);
}
