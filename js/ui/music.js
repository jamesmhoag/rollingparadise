// The lounge's music: the band's set list (content/music.js, eight kinds of jazz, three tunes each), quietly under
// the game. The set is shuffled so no two tunes of the same kind play back to back, and loops. Browsers only let
// sound start after the player touches the page, so it begins on the first click. The tune's key is shared
// (musicKey), so the table's sounds play in the key the band is in.
//
// The band takes requests, for a price, from the buttons at the foot of the screen, paid from the purse (greyed
// when it cannot cover them; each price is in the button's hover): ♥ hearts the tune playing (free; favorites top
// the setlist), ⏭ tips them on to the next tune, ♫ tips for a request from the setlist, ⇄ pays them to swap their
// instruments for 8-bit chips and back (every tune and loop again on chip voices, tools/jazz/chiptune.py; the place
// in the tune is kept), and ✕ / ▶ pays them to stop or to start again. While they are stopped only ▶ works. What the band is doing belongs to the run (run.band); the favorites to this browser.
//
// At a table the band plays the floor's bout loop instead (content/loops.js; the High Roller and the Ascent's last
// climb have their own). A loop is four layers played together through Web Audio, sample for sample: the groove and
// the tune always, then the drive and the peril, faded in as either Roller's Worth runs down (tensionOf), so the
// music tightens as the bout does. When the bout is over the loop fades and the lounge band comes back.
import { MUSIC, LOOPS } from '../content/assets.js';
import { btn, h, toast, openPanel, closePanel, setOn } from './core.js';
import { t } from '../text.js';
import { worth } from '../bout.js';
import { TUNING } from '../content/tuning.js';
import { cents } from '../util.js';

const FAVS = 'rollingparadise.favorites', VOL = 0.3, LOOP_VOL = 0.36, LAYERS = ['base', 'theme', 'drive', 'peril'];
let current = null, playing = false, loop = null;
const lounge = { play: () => {}, pause: () => {}, on: () => false, touched: false };
// the game's side: the run (whose purse pays and whose band this is) and how to take a tip from it
const game = { run: () => null, tip: () => false };
// what the band is doing: playing on its instruments ('band') or chips ('chip'), or silent
// What the band was last doing is also kept in this browser: it is what plays where there is no run to ask (the title,
// Build mode, the test table) and what a new run's band starts as, so music you switched off stays off.
const BAND = 'rollingparadise.band';
const lastBand = () => { try { const b = JSON.parse(localStorage.getItem(BAND) || 'null'); return { mode: b?.mode === 'chip' ? 'chip' : 'band', silent: !!b?.silent }; } catch { return { mode: 'band', silent: false }; } };
const keepBand = (b) => { try { localStorage.setItem(BAND, JSON.stringify({ mode: b.mode, silent: !!b.silent })); } catch { /* storage unavailable */ } };
const free = { band: null }; // the band with no run: yours to switch for nothing
export const bandOf = (run) => (run ? (run.band ||= lastBand()) : (free.band ||= lastBand()));
const mode = () => { const b = bandOf(game.run()); return b.silent ? 'off' : b.mode; };
// a tune's or a loop layer's file in a sound
export const srcOf = (tune, m = mode()) => (m === 'chip' && tune.chip ? tune.chip : tune.src);
const layerSrc = (L, k, m = mode()) => (m === 'chip' && L.chip ? L.chip[k] : L.layers[k]);
// favorites, by title (tunes and loops alike), kept in this browser
export const favorites = () => { try { return new Set(JSON.parse(localStorage.getItem(FAVS) || '[]')); } catch { return new Set(); } };
const setFavorite = (title, on) => { const f = favorites(); if (on) f.add(title); else f.delete(title); try { localStorage.setItem(FAVS, JSON.stringify([...f])); } catch { /* storage unavailable */ } };
// the setlist for a request: favorites first, then the rest, each in its listed order
export const setlist = (list, favs = favorites()) => [...list.filter((x) => favs.has(x.title)), ...list.filter((x) => !favs.has(x.title))];
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
  const m = mode(), bufs = await Promise.all(LAYERS.map((k) => decode(layerSrc(lp.L, k, m)))).catch(() => null);
  if (!bufs || loop !== lp || lp.live || !lounge.on() || mode() !== m) return;
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

// ---------- the lounge band, and the tip buttons ----------
// run: () => the run in play (or null); tip: (what, title) => true if the purse paid for it
export function initMusic(stage, { run = () => null, tip = () => false } = {}) {
  if (!MUSIC.length || typeof Audio === 'undefined') return;
  Object.assign(game, { run, tip });
  let order = setOrder(), at = 0, audio = null, sounding = null;
  let away = false; // the tab is hidden
  const on = () => mode() !== 'off', now = () => order[at];
  const next = () => { at++; if (at >= order.length) { order = setOrder(); at = 0; } current = now(); audio.src = srcOf(current); if (on() && !away) audio.play().catch(() => {}); };
  function play() {
    if (!on() || away) return; // never start a band that is switched off, or one nobody is in the room to hear
    if (!audio) { audio = new Audio(); audio.volume = VOL; audio.preload = 'auto'; audio.addEventListener('ended', next);
      audio.addEventListener('playing', () => { playing = true; }); audio.addEventListener('pause', () => { playing = false; }); }
    current = now(); const src = srcOf(current);
    if (!audio.src.endsWith(src)) {  // a new tune, or the same one in the other sound: carry on from the same place
      const pos = audio.src && audio.src.split('/').pop().replace('.mp3', '') === src.split('/').pop().replace('.mp3', '') ? audio.currentTime : 0; audio.src = src;
      if (pos) audio.addEventListener('loadedmetadata', () => { audio.currentTime = Math.min(pos, (audio.duration || pos) - 0.5); }, { once: true });
    }
    audio.play().catch(() => {});
  }
  Object.assign(lounge, { play, pause: () => audio?.pause(), on });
  const start = () => { if (!on() || away) return; return loop ? startLoop(loop) : play(); }; // whatever should be playing: the bout's loop, or the band
  // make what is sounding match what the band is doing (after a tip, or when a new run brings a fresh band)
  function sync() {
    if (!lounge.touched) return mark();
    const m = mode(); if (m === sounding) return mark();
    const was = sounding; sounding = m;
    if (m === 'off') { audio?.pause(); if (loop) silence(loop, 0.4); }
    else if (loop) { const pos = loop.live ? ac.currentTime - loop.began : 0; silence(loop, 0.15); startLoop(loop, was === 'off' ? 0 : Math.max(0, pos)); }
    else play();
    mark();
  }
  setInterval(sync, 1000);
  // Leaving the tab pauses whatever is sounding; coming back starts only what should be playing now. (Browsers hold
  // timers and audio differently in a hidden tab: without this a switched-off band could come back on return.)
  document.addEventListener('visibilitychange', () => {
    away = document.hidden;
    if (away) { audio?.pause(); if (loop?.live) silence(loop, 0.2); if (ac?.state === 'running') ac.suspend().catch(() => {}); return; }
    if (!lounge.touched) return;
    sounding = mode(); if (sounding !== 'off') start(); else { audio?.pause(); if (loop?.live) silence(loop, 0.1); }
    mark();
  });

  // the buttons: what each costs, greyed when the purse cannot cover it (or there is no run to pay from)
  const P = TUNING.band, purse = () => game.run()?.purse ?? -1;
  const nowTitle = () => (loop ? loop.L.title : now().title);
  const playingLine = () => (!on() ? t('music.silent') : (loop ? t('music.bout', { title: loop.L.title, where: loop.where || '' }) : t('music.playing', { title: now().title, style: now().by })) + (mode() === 'chip' ? t('music.chipNote') : ''));
  const why = (price) => (!game.run() ? t('music.noRun') : purse() < price ? t('music.broke') : '');
  function pay(what, title) {
    if (!game.run() || purse() < P[what] || !game.tip(what, title)) { toast(t('music.cantTip'), 'warn'); return false; }
    document.dispatchEvent(new Event('rp:purse')); return true;
  }
  // each button's price is in its hover; requests, skips and swaps need the band playing (starting them is its own tip)
  const cost = (what, ok = true) => t('music.price', { price: cents(P[what]) }) + (ok ? why(P[what]) : t('music.onBreak'));
  const can = (what, playingToo = true) => !!game.run() && purse() >= P[what] && (!playingToo || on());
  // hearting a tune is free unless the band charges for it (TUNING.band.favorite); taking a heart off is always free
  const favCost = () => P.favorite || 0;
  const heart = (ti) => { const on = !favorites().has(ti); if (on && favCost() > 0 && !pay('favorite', ti)) return false; setFavorite(ti, on); return true; };
  const fav = btn('♡', () => { heart(nowTitle()); mark(); },
    () => t(favorites().has(nowTitle()) ? 'music.unfav' : 'music.fav', { title: nowTitle(), playing: playingLine() }) + (!favorites().has(nowTitle()) && favCost() > 0 ? cost('favorite') : ''), 'small band-btn fav-btn');
  // skip: in the lounge, on to the next tune; at a table, on to the next loop of its kind (tables' or High Rollers')
  const nextLoop = () => { const same = LOOPS.filter((L) => L.kind === loop.L.kind); return same[(same.indexOf(loop.L) + 1) % same.length]; };
  const upNext = () => (loop ? nextLoop() : order[(at + 1) % order.length]);
  const skip = btn('⏭', () => {
    if (!on()) return; const x = upNext(); if (!pay('skip', x.title)) return;
    if (loop) { const lp = { ...loop, L: x, live: false }; silence(loop, 0.3); loop = lp; startLoop(lp); } else if (audio) next(); else { at = (at + 1) % order.length; play(); }
    mark();
  }, () => t('music.skip', { title: upNext().title }) + cost('skip', on()), 'small band-btn');
  const req = btn('♫', () => openSetlist(), () => t('music.request', { playing: playingLine() }) + cost('request', on()), 'small band-btn');
  const swap = btn('⇄', () => {
    if (!on() || !pay('swap', '')) return; const b = bandOf(game.run()); b.mode = b.mode === 'chip' ? 'band' : 'chip'; keepBand(b);
    toast(t(b.mode === 'chip' ? 'music.toChips' : 'music.toBand')); sync();
  }, () => t(bandOf(game.run()).mode === 'chip' ? 'music.swapToBand' : 'music.swapToChip') + cost('swap', on()), 'small band-btn');
  // the band on and off: each way is a tip
  // with no run (the title, Build mode) there is no purse to tip from, so the switch is free there
  const power = btn('✕', () => {
    const what = on() ? 'stop' : 'start'; if (game.run() && !pay(what, '')) return;
    const b = bandOf(game.run()); b.silent = what === 'stop'; keepBand(b); toast(t(what === 'stop' ? 'music.hushed' : 'music.back')); sync();
  }, () => t(on() ? 'music.stop' : 'music.start', { playing: playingLine() }) + (game.run() ? cost(on() ? 'stop' : 'start') : t('music.freeHere')), 'small band-btn');
  function mark() {
    setOn(skip, can('skip')); setOn(req, can('request')); setOn(swap, can('swap')); setOn(power, !game.run() || can(on() ? 'stop' : 'start', false));
    power.textContent = on() ? '✕' : '▶';
    const f = favorites().has(nowTitle()); fav.textContent = f ? '♥' : '♡'; fav.classList.toggle('on', f);
    swap.classList.toggle('chiptune', bandOf(game.run()).mode === 'chip');
  }
  // a request: the setlist (the lounge band's tunes, or at a table the bout loops), favorites first
  function openSetlist() {
    if (!can('request')) return toast(t('music.cantTip'), 'warn');
    const list = setlist(loop ? LOOPS : MUSIC), favs = favorites();
    const rowOf = (x) => h('div', { class: 'row between setlist-row' },
      btn(favs.has(x.title) ? '♥' : '♡', (e) => { const el = e.currentTarget; if (!heart(x.title)) return; const f = favorites().has(x.title); el.textContent = f ? '♥' : '♡'; el.classList.toggle('on', f); mark(); }, null, 'small fav-btn' + (favs.has(x.title) ? ' on' : '')),
      btn(h('span', {}, h('b', { text: x.title }), ' ', h('span', { class: 'dim', text: loop ? t(x.kind === 'boss' ? 'music.kindBoss' : 'music.kindBout') : x.by })), () => request(x), null, 'setlist-pick'));
    openPanel(h('div', {}, h('h2', { text: t('music.setlist') }), h('p', { class: 'sub', text: t('music.setlistSub', { price: cents(P.request) }) }),
      h('div', { class: 'col setlist' }, ...list.map(rowOf))));
  }
  function request(x) {
    if (!on() || !pay('request', x.title)) return; closePanel();
    if (loop) { const lp = { ...loop, L: x, live: false }; silence(loop, 0.3); loop = lp; startLoop(lp); }
    else { order.splice(at + 1, 0, x); if (!audio) { at++; play(); } else next(); }
    toast(t('music.tipped', { title: x.title })); mark();
  }
  const group = h('div', { class: 'band-btns' }, fav, skip, req, swap, power);
  mark(); stage.append(group);
  document.addEventListener('rp:purse', mark);
  const first = () => { document.removeEventListener('pointerdown', first, true); lounge.touched = true; sounding = mode(); if (on()) start(); mark(); };
  document.addEventListener('pointerdown', first, true);
}
