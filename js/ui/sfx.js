// Sound effects. Every step of play has a sound, and they are real instruments (short samples rendered from a
// General MIDI soundfont by tools/sfx/render.py: piano, Rhodes, guitars, upright bass, muted trumpet, flute, horn,
// strings, harp, and a jazz kit's brushes, ride, rim, wood blocks, castanets, claves, shaker, tambourine, triangle,
// hand drums) played in the key AND the mode the band is in (musicKey, musicMode), so they sit inside the music as
// harmony rather than on top of it: over a minor tune a sound's 3rd, 6th and 7th are the minor ones. A gesture of
// several notes keeps its shape in every key (place): a fall is always a fall. The table's physical sounds (a card
// slid, a chip set down, dice thrown) are wood and clay; the elements are played on the instruments too. Only a
// card's slide and a neon tube's sparks are filtered noise, because that is what they are.
//
// An action is heard at each stage: a touch on a control, the pick-up, each step of it (a die set on a trick, an aim
// chosen), and its result (locked in, or refused). Doing the same thing again straight away climbs the scale
// (climb), so setting four dice is a little run, not one note four times. What happens is heard at its size: a fee's
// thud, a payout's cascade, the purse's clink and a win all grow with the amount or the stakes (o.n, o.tier). The
// House's plays, the board's own movements and the opponent's moves have theirs; the opponent's sit to the right of
// the stereo field, yours to the left. Everything goes through a limiter, so a busy moment cannot clip.
// Browsers only let sound start after the player touches the page. The 🔊 button turns them on or off.
import { btn } from './core.js';
import { t } from '../text.js';
import { musicKey, musicMode } from './music.js';

const KEY = 'rollingparadise.sfx', VOL = 0.36;
const saved = () => { try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; } };
const keep = (on) => { try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* storage unavailable */ } };
let ctx = null, out = null, on = saved(), noiseBuf = null;
const last = new Map(); // a sound repeated within a few milliseconds plays once (a whole stack landing is one clatter)
export const SAMPLES = ['piano', 'rhodes', 'nylon', 'guitar', 'bass', 'muted', 'flute', 'horn', 'strings', 'harp', 'ride', 'brush', 'swish', 'rim', 'castanet',
  'block_hi', 'block_lo', 'shaker', 'triangle', 'claves', 'kick', 'tamb', 'crash', 'cabasa', 'conga', 'bongo', 'chimes'];
const buf = new Map();

// a sample's bytes, fetched once: on the first touch, or ahead of it from the title's idle time (prefetchSfx)
const raw = new Map();
const sample = (n, low) => { if (!raw.has(n)) raw.set(n, fetch(`assets/sfx/${n}.mp3`, low ? { priority: 'low' } : undefined).then((r) => r.arrayBuffer())); return raw.get(n); };
export async function prefetchSfx() { if (typeof fetch === 'undefined') return; for (const n of SAMPLES) await sample(n, true).catch(() => raw.delete(n)); }

function audio() {
  if (ctx || typeof window === 'undefined') return ctx;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  ctx = new AC(); out = ctx.createGain(); out.gain.value = VOL;
  // a limiter on the way out: a resolve step can sound five things at once
  const lim = ctx.createDynamicsCompressor?.();
  if (lim) { lim.threshold.value = -9; lim.knee.value = 6; lim.ratio.value = 10; lim.attack.value = 0.003; lim.release.value = 0.15; out.connect(lim); lim.connect(ctx.destination); }
  else out.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  for (const n of SAMPLES) sample(n).then((a) => ctx.decodeAudioData(a)).then((b) => buf.set(n, b)).catch(() => {});
  return ctx;
}
// where a sound goes: straight out, or panned (o.pan: -1 left, your side, to 1 right, theirs)
function dest(o) { if (!o.pan || !ctx.createStereoPanner) return out; const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, o.pan)); p.connect(out); return p; }

// ---------- pitch: the band's key and mode ----------
// A sound names its notes as semitones over the key's root in MAJOR (0 root, 4 the 3rd, 7 the 5th, 9 the 6th, 11 the
// 7th, 12 the octave...). toneOf gives the note the tune's mode has there: minor flattens the 3rd, 6th and 7th; the
// blues (a dominant tonic) flattens the 7th.
const FLAT = { minor: { 4: 3, 9: 8, 11: 10 }, blues: { 11: 10 } };
export function toneOf(deg, mode = 'major') { const oct = Math.floor(deg / 12), pc = deg - 12 * oct; return 12 * oct + (FLAT[mode]?.[pc] ?? pc); }
// where a run of notes is played on the samples (semitones from their own C), in a key and mode: its shape is kept,
// and the whole of it is moved by octaves to sit as near the samples' pitch as it can, so nothing is stretched far
export function place(degs, key = 0, mode = 'major') {
  const s = degs.map((d) => key + toneOf(d, mode)), shift = -12 * Math.round((Math.min(...s) + Math.max(...s)) / 24);
  return s.map((x) => x + shift);
}
// the scale a repeated action climbs: pentatonic, so any rung sits over any chord of the tune
const LADDER = { major: [0, 2, 4, 7, 9, 12], minor: [0, 3, 5, 7, 10, 12] };
export const rungOf = (n, mode = 'major') => { const L = LADDER[mode === 'minor' ? 'minor' : 'major']; return L[Math.max(0, Math.min(L.length - 1, n))]; };
// how many times running a sound has been made (each within a couple of seconds of the last): its rung
const runs = new Map();
function climb(name) { const now = performance.now(), r = runs.get(name), n = r && now - r.at < 2600 ? Math.min(5, r.n + 1) : 0; runs.set(name, { n, at: now }); return n; }

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
const at = (degs) => place(degs, musicKey(), musicMode());
// one note of the band's scale
const note = (name, deg, o = {}) => inst(name, at([deg])[0] + (o.oct || 0) * 12, o);
// a gesture: notes one after another, [degree, when, length, gain] each, its shape kept in every key
const line = (name, steps, o = {}) => { const s = at(steps.map((x) => x[0])); steps.forEach(([, when, len, gain], i) => inst(name, s[i] + (o.oct || 0) * 12, { ...o, at: (o.at || 0) + when, len, gain: gain ?? o.gain })); };
// a chord, rolled from its first note to its last
const chord = (name, degs, o = {}) => { const s = at(degs); degs.forEach((_, i) => inst(name, s[i] + (o.oct || 0) * 12, { ...o, at: (o.at || 0) + i * (o.roll ?? 0.035), gain: (o.gain ?? 0.35) * (1 - i * 0.08) })); };
// the next rung of a repeated action
const rung = (name, id, o = {}) => { const m = musicMode(), L = LADDER[m === 'minor' ? 'minor' : 'major']; inst(name, place(L, musicKey(), 'major')[L.indexOf(rungOf(climb(id), m))], o); };
const hit = (name, o = {}) => inst(name, 0, { ...o, rate: (o.rate || 1) * (0.96 + Math.random() * 0.08) });
function noise(dur, o = {}) {
  const t0 = ctx.currentTime + (o.at || 0), src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noiseBuf; f.type = o.filter || 'bandpass'; f.frequency.setValueAtTime(o.freq || 1500, t0); if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + dur); f.Q.value = o.q ?? 1;
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(o.gain ?? 0.3, t0 + (o.attack ?? 0.004)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(dest(o)); src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.05);
}
const rnd = (a, b) => a + Math.random() * (b - a);
// how big: 0 small, 1 middling (o.n at least a), 2 big (at least b)
const size = (o, a, b) => ((o.n || 1) >= b ? 2 : (o.n || 1) >= a ? 1 : 0);

// ---------- every sound, by name ----------
export const SOUNDS = {
  // the table's physical sounds: clay chips, wooden dice, cards on felt
  card: (o) => { noise(0.16, { ...o, freq: 2400, to: 700, q: 0.8, gain: 0.2 }); hit('brush', { ...o, gain: 0.18, at: 0.08 }); },
  // foil in the hand: a crumple of bright noise; a strip of it torn: a short rip
  crinkle: (o) => { for (let i = 0; i < 3; i++) noise(0.05 + Math.random() * 0.05, { ...o, at: i * 0.03 + Math.random() * 0.02, freq: 5200 + Math.random() * 2600, q: 2.5, gain: 0.08 }); },
  tear: (o) => { noise(0.12, { ...o, freq: 1800, to: 4200, q: 1.4, gain: 0.22 }); noise(0.05, { ...o, at: 0.06, freq: 6000, q: 3, gain: 0.1 }); },
  stack: (o) => { SOUNDS.card(o); hit('block_lo', { ...o, gain: 0.18, at: 0.15, rate: 1.3 }); },
  chip: (o) => { hit('castanet', { ...o, gain: 0.45, rate: rnd(1, 1.2) }); },
  die: (o) => { hit('block_lo', { ...o, gain: 0.4, rate: rnd(0.85, 1) }); },
  roll: (o) => { hit('shaker', { ...o, gain: 0.3 }); for (let i = 0; i < 8; i++) { const when = 0.06 + i * rnd(0.045, 0.08) + (i > 5 ? 0.08 : 0); hit(i % 3 ? 'block_lo' : 'block_hi', { ...o, at: when, gain: 0.32 * (1 - i / 11), rate: rnd(0.85, 1.15) }); } },
  hot: (o) => { hit('chimes', { ...o, gain: 0.1 }); line('piano', [[7, 0, 0.3, 0.2], [12, 0.08, 0.5, 0.24]], o); }, // a die comes up on its top face
  land: (o) => { for (let i = 0; i < 3; i++) hit('castanet', { ...o, at: i * 0.04, gain: 0.3, rate: rnd(0.95, 1.2) }); },
  // chips paid away: one clack a chip (o.n of them, to five), the Rhodes only when it is a real payout
  pay: (o) => { const k = Math.min(5, Math.max(1, o.n || 1)); for (let i = 0; i < k; i++) hit('castanet', { ...o, at: i * 0.05, gain: 0.3, rate: 1.25 - i * 0.06 }); if (k >= 3) note('rhodes', 7, { ...o, at: 0.1, gain: 0.12 }); },
  // chips with nowhere to go, lost down the middle: they clatter away, falling in pitch
  lost: (o) => { for (let i = 0; i < 4; i++) hit('castanet', { ...o, at: i * 0.07, gain: 0.28 - i * 0.04, rate: 1 - i * 0.14 }); hit('conga', { ...o, at: 0.3, gain: 0.2, rate: 0.6 }); },
  spawn: (o) => { hit('triangle', { ...o, gain: 0.15, rate: 1.2 }); },
  move: (o) => { hit('shaker', { ...o, gain: 0.22 }); hit('cabasa', { ...o, gain: 0.15, at: 0.08 }); },
  // every stage of your own action
  touch: (o) => { hit('rim', { ...o, gain: 0.07, rate: 1.5 }); }, // a touch on a control
  pick: (o) => { rung('nylon', 'pick', { ...o, gain: 0.2, len: 0.35 }); }, // you pick something up or select it
  step: (o) => { rung('guitar', 'step', { ...o, gain: 0.22, len: 0.4 }); }, // a step of the action: a die set on a trick
  aim: (o) => { line('harp', [[9, 0, 0, 0.25], [4, 0.06, 0, 0.18]], o); }, // an aim chosen
  bid: (o) => { SOUNDS.chip(o); rung('rhodes', 'bid', { ...o, at: 0.03, gain: 0.2 }); }, // a chip bid
  confirm: (o) => { chord('piano', [0, 7, 16], { ...o, gain: 0.3, roll: 0.045 }); }, // the result: locked in
  undo: (o) => { line('nylon', [[7, 0, 0, 0.2], [4, 0.09, 0, 0.18]], o); },
  // not allowed: the same low note twice, stopped short, and a wooden tick. It does not resolve.
  refuse: (o) => { line('bass', [[7, 0, 0.1, 0.42], [7, 0.15, 0.14, 0.42]], o); hit('claves', { ...o, gain: 0.1, rate: 0.8 }); },
  sit: (o) => { hit('swish', { ...o, gain: 0.2 }); hit('brush', { ...o, gain: 0.16, at: 0.12 }); chord('rhodes', [0, 7], { ...o, gain: 0.14, at: 0.16, roll: 0.05 }); }, // a bout opens: the cards are squared, the band nods
  turn: (o) => { hit('ride', { ...o, gain: 0.22 }); hit('swish', { ...o, gain: 0.18, at: 0.05 }); }, // a new turn opens
  // the last turn: the same ride, and the horn calls it (up a fourth, to the root) over a kick
  lastturn: (o) => { SOUNDS.turn(o); hit('kick', { ...o, gain: 0.3, at: 0.1 }); line('horn', [[7, 0.1, 0.16, 0.24], [12, 0.28, 0.5, 0.28]], o); },
  phase: (o) => { hit('brush', { ...o, gain: 0.2 }); }, // a phase of the turn opens
  // a bout won, at its stakes (o.tier): a table; a High Roller (the horn takes the chord up, chimes); the House itself
  // at the top of the Ascent (all of that, a second chord an octave over it, and the tambourine)
  win: (o) => {
    const k = o.tier || 0;
    chord('piano', [0, 4, 7, 14], { ...o, gain: 0.35, roll: 0.09 }); chord('strings', [4, 11], { ...o, gain: 0.18 + 0.04 * k, at: 0.3 }); hit('crash', { ...o, gain: 0.12 + 0.05 * k, at: 0.35 });
    if (k) { line('horn', [[0, 0.3, 0.14, 0.24], [4, 0.44, 0.14, 0.24], [7, 0.58, 0.6, 0.3]], o); hit('chimes', { ...o, gain: 0.14, at: 0.6 }); }
    if (k > 1) { chord('piano', [12, 16, 19, 24], { ...o, gain: 0.3, roll: 0.06, at: 0.9 }); hit('crash', { ...o, gain: 0.2, at: 0.9 }); for (let i = 0; i < 6; i++) hit('tamb', { ...o, gain: 0.16, at: 0.9 + i * 0.08 }); }
  },
  lose: (o) => { line('muted', [[7, 0, 0.3, 0.35], [5, 0.32, 0.3, 0.33], [3, 0.64, 0.6, 0.3]], o); note('bass', 0, { ...o, gain: 0.35, at: 0.64 }); },
  // the opponent's moves, from across the table
  'opp-draw': (o) => SOUNDS.card({ pan: 0.55, ...o }),
  'opp-roll': (o) => SOUNDS.roll({ pan: 0.55, ...o }),
  'opp-bid': (o) => { SOUNDS.chip({ pan: 0.55, ...o }); chord('rhodes', [4, 7], { pan: 0.55, ...o, at: 0.03, gain: 0.2, roll: 0.03 }); },
  'opp-aim': (o) => { note('guitar', 9, { pan: 0.55, ...o, gain: 0.22, len: 0.4 }); },
  // the House's phases: each type of effect has its own voice
  investment: (o) => { chord('rhodes', [0, 4, 7, 11], { ...o, gain: 0.3, roll: 0.07 }); }, // rising, bright
  insurance: (o) => { note('bass', 0, { ...o, gain: 0.55 }); hit('kick', { ...o, gain: 0.35 }); hit('brush', { ...o, gain: 0.2, at: 0.02 }); }, // a shield's thud
  expense: (o) => { line('muted', [[7, 0, 0.16, 0.32], [4, 0.16, 0.3, 0.3]], o); hit('triangle', { ...o, gain: 0.12 }); }, // the fee is called
  correction: (o) => { chord('nylon', [12, 7, 4, 0], { ...o, gain: 0.25, roll: 0.03 }); hit('swish', { ...o, gain: 0.2 }); }, // a strum across the table
  // the fee lands: a knock and the bass for a chip or two; from 3¢ the kick is under it; from 8¢ the room hears it
  fee: (o) => {
    const k = size(o, 3, 8);
    hit('block_lo', { ...o, gain: 0.3, rate: 0.8 }); note('bass', 0, { ...o, gain: 0.3 + 0.1 * k, len: 0.16 + 0.08 * k, oct: k ? -1 : 0 });
    if (k) { hit('kick', { ...o, gain: 0.3 + 0.15 * k }); hit('brush', { ...o, gain: 0.18, at: 0.02 }); }
    if (k > 1) { hit('crash', { ...o, gain: 0.1, at: 0.03 }); hit('conga', { ...o, gain: 0.25, at: 0.09, rate: 0.7 }); }
  },
  block: (o) => { hit('rim', { ...o, gain: 0.3, rate: 0.85 }); hit('block_hi', { ...o, gain: 0.25, at: 0.03 }); hit('triangle', { ...o, gain: 0.08, at: 0.03, rate: 1.5, len: 0.08 }); }, // a shield takes it: a knock that goes nowhere
  debt: (o) => { line('horn', [[3, 0, 0.22, 0.24], [0, 0.2, 0.45, 0.24]], { ...o, oct: -1 }); hit('claves', { ...o, gain: 0.12, rate: 0.7 }); note('bass', 0, { ...o, gain: 0.3, at: 0.2, oct: -1, len: 0.4 }); }, // it could not be paid: the House writes it down
  miss: (o) => { note('bass', 0, { ...o, gain: 0.3, len: 0.25, oct: -1 }); }, // nothing landed
  lit: (o) => { noise(0.04, { ...o, freq: 3200, gain: 0.06 }); noise(0.05, { ...o, at: 0.1, freq: 3600, gain: 0.07 }); hit('triangle', { ...o, at: 0.2, gain: 0.07, rate: 1.6 }); }, // a bid trick's tube strikes on
  spent: (o) => { for (let i = 0; i < 7; i++) noise(0.025, { ...o, at: rnd(0, 0.28), freq: rnd(2500, 6500), gain: rnd(0.05, 0.12) }); noise(0.3, { ...o, at: 0.22, freq: 320, filter: 'lowpass', gain: 0.07 }); }, // a played trick sparks and goes out
  bonus: (o) => { line('piano', [[14, 0, 0, 0.3], [19, 0.09, 0, 0.28]], o); hit('chimes', { ...o, gain: 0.12, at: 0.05 }); },
  // the elements, each on the band's own instruments
  burn: (o) => { for (let i = 0; i < 9; i++) hit(i % 3 ? 'castanet' : 'claves', { ...o, at: rnd(0, 0.45), gain: rnd(0.05, 0.16), rate: rnd(1.5, 2.4) }); hit('swish', { ...o, gain: 0.16, rate: 0.6 }); hit('shaker', { ...o, gain: 0.12 }); }, // it crackles: dry wood ticks over a slow brush
  lava: (o) => { for (let i = 0; i < 3; i++) hit('conga', { ...o, at: i * 0.16, gain: 0.26 - i * 0.04, rate: 0.55 + i * 0.04 }); hit('kick', { ...o, gain: 0.3 }); hit('swish', { ...o, gain: 0.18, rate: 0.45 }); hit('cabasa', { ...o, gain: 0.1, at: 0.3, rate: 0.7 }); }, // it rolls: slow, low drums and a long hiss
  shock: (o) => { hit('tamb', { ...o, gain: 0.14, rate: 2 }); line('guitar', [[6, 0, 0.12, 0.2], [7, 0.06, 0.2, 0.2]], { ...o, oct: 1 }); },
  frost: (o) => { hit('triangle', { ...o, gain: 0.2, rate: 1.3 }); hit('chimes', { ...o, gain: 0.15, at: 0.05 }); },
  acid: (o) => { for (let i = 0; i < 4; i++) hit('cabasa', { ...o, at: i * (0.11 - i * 0.02), gain: 0.2 - i * 0.03, rate: 1.1 + i * 0.15 }); hit('tamb', { ...o, gain: 0.1, at: 0.05, rate: 1.7 }); hit('chimes', { ...o, gain: 0.07, at: 0.12, rate: 1.8, len: 0.25 }); }, // it fizzes: quickening, rising
  boom: (o) => { hit('kick', { ...o, gain: 0.6 }); hit('crash', { ...o, gain: 0.15, at: 0.02 }); note('bass', 0, { ...o, gain: 0.4, oct: -1 }); },
  poison: (o) => { line('muted', [[0, 0, 0.18, 0.22], [6, 0.16, 0.34, 0.24]], { ...o, oct: -1 }); hit('shaker', { ...o, gain: 0.12, at: 0.05, rate: 0.7 }); hit('bongo', { ...o, gain: 0.14, at: 0.34, rate: 0.6 }); }, // it creeps: a low tritone on the muted trumpet, one slow bubble
  corrupt: (o) => { note('strings', 0, { ...o, gain: 0.22, len: 0.5, oct: -1 }); note('strings', 1, { ...o, gain: 0.16, len: 0.4, oct: -1, at: 0.1 }); }, // a minor 2nd that resolves away
  creature: (o) => { const s = at([7, 9]); for (let i = 0; i < 4; i++) inst('flute', s[i % 2], { ...o, at: i * 0.07, gain: 0.2, len: 0.1 }); },
  hazard: (o) => { line('horn', [[7, 0, 0.12, 0.22], [6, 0.14, 0.3, 0.22]], o); hit('claves', { ...o, gain: 0.16 }); hit('claves', { ...o, gain: 0.14, at: 0.14 }); }, // the board itself bites: a warning on the horn
  // away from the table
  // the purse: chips out (they tick away, falling) or in (they stack up, rising, and from 10¢ the Rhodes and a tambourine)
  spend: (o) => { const k = 1 + size(o, 5, 20); for (let i = 0; i < k; i++) hit('castanet', { ...o, at: i * 0.06, gain: 0.3, rate: 1.15 - i * 0.12 }); hit('cabasa', { ...o, gain: 0.12, at: 0.04 }); },
  earn: (o) => { const k = 2 + size(o, 10, 40); for (let i = 0; i < k; i++) hit('castanet', { ...o, at: i * 0.055, gain: 0.3, rate: 1 + i * 0.1 }); if (k > 2) { line('rhodes', [[7, 0.1, 0, 0.16], [12, 0.2, 0, 0.18]], o); hit('tamb', { ...o, gain: 0.12, at: 0.2 }); } },
  floor: (o) => { const L = [0, 2, 4, 7, 9, 12, 14, 16]; line('harp', L.map((d, i) => [d, i * 0.05, 0, 0.2]), o); hit('chimes', { ...o, gain: 0.14, at: 0.3 }); chord('rhodes', [0, 7, 16], { ...o, gain: 0.2, at: 0.45, roll: 0.05 }); }, // up to the next floor: the harp runs up the scale
  // a run ends: at the top of Paradise, the biggest win; anywhere else, the band sees you out, slow and low
  runend: (o) => { if (o.end === 'paradise') return SOUNDS.win({ ...o, tier: 2 });
    line('muted', [[7, 0, 0.4, 0.3], [5, 0.45, 0.4, 0.28], [3, 0.9, 0.4, 0.26], [0, 1.35, 0.9, 0.26]], o); chord('strings', [0, 3], { ...o, gain: 0.16, at: 1.35, oct: -1 }); note('bass', 0, { ...o, gain: 0.35, at: 1.35, oct: -1 }); },
};

export function sfx(name, delay = 0, o = {}) {
  if (!on || !SOUNDS[name]) return;
  if (!audio() || ctx.state !== 'running') { ctx?.resume?.(); if (ctx?.state !== 'running') return; }
  const now = performance.now(); if (now - (last.get(name) || 0) < 45) return; last.set(name, now);
  if (delay) setTimeout(() => SOUNDS[name](o), delay); else SOUNDS[name](o);
}
export const sfxOn = () => on;
export const samplesLoaded = () => buf.size; // how many instrument samples are decoded and ready

// a control answers a touch (the press, before the click): buttons, pickers, things on a shelf. The table's own
// pieces (chips, dice, tricks, spaces) do not: each has the sound of what you do with it.
const TOUCHABLE = 'button, select, input, a, .item, .gcard, .b-item, .pick-card, [data-act], .has-tip.clickable';
export function initSfx(stage) {
  const button = btn('🔊', () => { on = !on; keep(on); mark(); if (on) { audio(); ctx?.resume?.(); sfx('chip'); } }, () => t(on ? 'sfx.on' : 'sfx.off'), 'small sfx-btn');
  const mark = () => { button.classList.toggle('muted', !on); button.textContent = on ? '🔊' : '🔈'; };
  mark(); stage.append(button);
  const first = () => { document.removeEventListener('pointerdown', first, true); if (on) { audio(); ctx?.resume?.(); } };
  document.addEventListener('pointerdown', first, true);
  stage.addEventListener('pointerdown', (e) => { const el = e.target.closest?.(TOUCHABLE); if (el && !el.disabled && el !== button && !el.closest('.chip, .die, .tcard, .cell')) sfx('touch'); }, true);
}
