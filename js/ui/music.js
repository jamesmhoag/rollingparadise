// The lounge's music: the band's set list (content/music.js, eight kinds of jazz, three tunes each), quietly under
// the game. The set is shuffled so no two tunes of the same kind play back to back, and loops. Browsers only let
// sound start after the player touches the page, so it begins on the first click. The ♪ button in the corner
// cycles the band, its chiptune version (every tune and loop again on 8-bit voices, tools/jazz/chiptune.py) and
// off, remembered in this browser; switching between the two keeps the place in the tune. Its hover names the tune.
// The ⏭ beside it skips to the next tune (or, at a table, the next loop).
// The tune's key is shared (musicKey), so the table's sounds play in the key the band is in.
//
// At a table the band plays the floor's bout loop instead (content/loops.js; the High Roller and the Ascent's last
// climb have their own). A loop is four layers played together through Web Audio, sample for sample: the groove and
// the tune always, then the drive and the peril, faded in as either Roller's Worth runs down (tensionOf), so the
// music tightens as the bout does. When the bout is over the loop fades and the lounge band comes back.
import { MUSIC, LOOPS } from '../content/assets.js';
import { btn } from './core.js';
import { t } from '../text.js';
import { worth } from '../bout.js';

const KEY = 'rollingparadise.music', VOL = 0.3, LOOP_VOL = 0.36, LAYERS = ['base', 'theme', 'drive', 'peril'];
// the sound: 'band', 'chip' (the chiptune versions) or 'off'; older saves said 'on'
export const MODES = ['band', 'chip', 'off'];
const saved = () => { try { const m = localStorage.getItem(KEY); return MODES.includes(m) ? m : m === 'off' ? 'off' : 'band'; } catch { return 'band'; } };
const keep = (m) => { try { localStorage.setItem(KEY, m); } catch { /* storage unavailable */ } };
let current = null, playing = false, loop = null, mode = 'band';
const lounge = { play: () => {}, pause: () => {}, on: () => false, touched: false };
// a tune's or a loop layer's file in the current sound
export const srcOf = (tune, m = mode) => (m === 'chip' && tune.chip ? tune.chip : tune.src);
const layerSrc = (L, k, m = mode) => (m === 'chip' && L.chip ? L.chip[k] : L.layers[k]);
// the key the band is playing in (0 = C ... 11 = B), or C when it is quiet
export const musicKey = () => (loop?.live ? loop.L.key : playing && current ? current.key || 0 : 0);

// a running order: shuffled, then nudged so a kind of jazz never follows itself
export function setOrder(list = MUSIC, rnd = Math.random) {
  const pool = list.slice().sort(() => rnd() - 0.5), out = [];
  while (pool.length) { const i = pool.findIndex((x) => x.genre !== out[out.length - 1]?.genre); out.push(pool.splice(i < 0 ? 0 : i, 1)[0]); }
  return out;
}

// ---------- bout loops ----------
// How tense a bout is, 0 to 1: how far the lower Roller has fallen from the Worth they sat down with, full at a
// quarter of it left. Your own Worth counts in full, your opponent's a little less.
export function tensionOf(bout) {
  const low = (s) => (s?.startWorth ? 1 - worth(s) / s.startWorth : 0);
  const [me, opp] = bout.sides;
  return Math.min(1, Math.max(0, Math.max(low(me), 0.85 * low(opp)) / 0.75));
}
// each layer's level at a tension: the groove and the tune always; the drive from a fifth of the way down, full by
// half; the peril from a little past half, full near broke (the tune steps back a touch to make room)
export function layerMix(x) {
  const ramp = (a, b) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
  return { base: 1, theme: 1 - 0.15 * ramp(0.7, 1), drive: ramp(0.2, 0.5), peril: ramp(0.55, 0.85) };
}
// the loop for a floor's tables or its High Roller (floor 5 is the Ascent)
export const loopFor = (floor, boss, list = LOOPS) => list.find((L) => L.floor === floor && L.kind === (boss ? 'boss' : 'bout')) || list.find((L) => L.kind === (boss ? 'boss' : 'bout'));

let ac = null; const buffers = new Map();
const AC = () => globalThis.AudioContext || globalThis.webkitAudioContext;
const audioCtx = () => ac || (ac = new (AC())());
const decode = (src) => { if (!buffers.has(src)) buffers.set(src, fetch(src).then((r) => r.arrayBuffer()).then((b) => audioCtx().decodeAudioData(b))); return buffers.get(src); };

// a bout is starting: play its floor's loop (where: how the hover names the place)
export function boutMusic(bout, { floor, boss, where } = {}) {
  endLoop(0.3, false);
  const L = loopFor(floor, boss); if (!L || !AC() || typeof fetch === 'undefined') return;
  loop = { L, bout, where, x: tensionOf(bout), live: false };
  if (lounge.on() && lounge.touched) startLoop(loop);
}
// the bout is over or left: the loop fades, and the lounge band comes back
export function endBoutMusic() { endLoop(2.5, true); }

async function startLoop(lp, at = 0) {  // at: where in the loop to come in, in seconds (a switch of sound keeps its place)
  const a = audioCtx(); if (a.state === 'suspended') a.resume().catch(() => {});
  const m = mode, bufs = await Promise.all(LAYERS.map((k) => decode(layerSrc(lp.L, k, m)))).catch(() => null);
  if (!bufs || loop !== lp || lp.live || !lounge.on() || mode !== m) return;
  lounge.pause();
  const master = a.createGain(), when = a.currentTime + 0.08, mix = layerMix(lp.x);
  master.gain.value = 0; master.connect(a.destination); master.gain.setTargetAtTime(LOOP_VOL, when, at ? 0.15 : 0.6);
  lp.nodes = LAYERS.map((k, i) => {
    const g = a.createGain(), s = a.createBufferSource(); g.gain.value = mix[k]; g.connect(master);
    s.buffer = bufs[i]; s.loop = true; s.loopStart = lp.L.start; s.loopEnd = lp.L.start + lp.L.length; s.connect(g); s.start(when, lp.L.start + (at % lp.L.length));
    return { k, g, s };
  });
  lp.master = master; lp.live = true; lp.began = when - at;
  lp.timer = setInterval(() => follow(lp), 250);
}
// four times a second: ease toward the bout's tension (about two seconds to catch up) and set the layers
function follow(lp) {
  if (loop !== lp) return;
  if (lp.bout.over || !document.querySelector('.bout')) return endBoutMusic();
  lp.x += (tensionOf(lp.bout) - lp.x) * 0.12;
  const mix = layerMix(lp.x), now = ac.currentTime;
  for (const n of lp.nodes) n.g.gain.setTargetAtTime(mix[n.k], now, 0.4);
}
function silence(lp, secs) {
  clearInterval(lp.timer); if (!lp.live) return;
  const now = ac.currentTime; lp.master.gain.cancelScheduledValues(now); lp.master.gain.setValueAtTime(lp.master.gain.value, now); lp.master.gain.setTargetAtTime(0, now, secs / 4);
  for (const n of lp.nodes) n.s.stop(now + secs);
  lp.live = false; lp.nodes = null;
}
function endLoop(secs, back) { const lp = loop; loop = null; if (lp) silence(lp, secs); if (back && lp && lounge.on()) lounge.play(); }

// ---------- the lounge band, and the button ----------
export function initMusic(stage) {
  if (!MUSIC.length || typeof Audio === 'undefined') return;
  let order = setOrder(), at = 0, audio = null; mode = saved();
  const on = () => mode !== 'off', now = () => order[at];
  const next = () => { at++; if (at >= order.length) { order = setOrder(); at = 0; } current = now(); audio.src = srcOf(current); audio.play().catch(() => {}); };
  function play() {
    if (!audio) { audio = new Audio(); audio.volume = VOL; audio.preload = 'auto'; audio.addEventListener('ended', next);
      audio.addEventListener('playing', () => { playing = true; }); audio.addEventListener('pause', () => { playing = false; }); }
    current = now(); const src = srcOf(current);
    if (!audio.src.endsWith(src)) {  // a new tune, or the same one in the other sound: carry on from the same place
      const pos = audio.src ? audio.currentTime : 0; audio.src = src;
      if (pos) audio.addEventListener('loadedmetadata', () => { audio.currentTime = Math.min(pos, (audio.duration || pos) - 0.5); }, { once: true });
    }
    audio.play().catch(() => {});
  }
  Object.assign(lounge, { play, pause: () => audio?.pause(), on });
  const start = () => (loop ? startLoop(loop) : play()); // whatever should be playing: the bout's loop, or the band
  const tip = () => {
    if (!on()) return t('music.off');
    const chip = mode === 'chip' ? t('music.chipNote') : '', next = mode === 'chip' ? t('music.toOff') : t('music.toChip');
    if (loop) return t('music.bout', { title: loop.L.title, where: loop.where || '', chip, next });
    return t('music.playing', { title: now().title, style: now().by, chip, next });
  };
  const turn = () => {  // band -> chiptune -> off -> band
    mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length]; keep(mode);
    if (!on()) { audio?.pause(); if (loop) silence(loop, 0.4); }
    else if (loop) { const pos = loop.live ? ac.currentTime - loop.began : 0; silence(loop, 0.15); startLoop(loop, Math.max(0, pos)); }
    else play();
    mark();
  };
  // skip: in the lounge, on to the next tune; at a table, on to the next loop of its kind (tables' or High Rollers')
  const nextLoop = () => { const same = LOOPS.filter((L) => L.kind === loop.L.kind); return same[(same.indexOf(loop.L) + 1) % same.length]; };
  const skip = () => {
    if (!on()) return;
    if (loop) { const lp = { ...loop, L: nextLoop(), live: false }; silence(loop, 0.3); loop = lp; startLoop(lp); }
    else if (audio) next(); else { at = (at + 1) % order.length; play(); }
  };
  const skipTip = () => (!on() ? t('music.skipOff') : t('music.skip', { title: loop ? nextLoop().title : order[(at + 1) % order.length].title }));
  const button = btn('♪', turn, tip, 'small music-btn'), skipper = btn('⏭', skip, skipTip, 'small skip-btn');
  const mark = () => { for (const b of [button, skipper]) b.classList.toggle('muted', !on()); button.classList.toggle('chiptune', mode === 'chip'); };
  mark(); stage.append(skipper, button);
  const first = () => { document.removeEventListener('pointerdown', first, true); lounge.touched = true; if (on()) start(); };
  document.addEventListener('pointerdown', first, true);
}
