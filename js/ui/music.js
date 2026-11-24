// The lounge's music: the band's set list (content/music.js, eight kinds of jazz, three tunes each), quietly under
// the game. The set is shuffled so no two tunes of the same kind play back to back, and loops. Browsers only let
// sound start after the player touches the page, so it begins on the first click. The ♪ button in the corner
// turns it on or off (remembered in this browser); its hover names the tune. The tune's key is shared (musicKey),
// so the table's sounds play in the key the band is in.
import { MUSIC } from '../content/assets.js';
import { btn } from './core.js';
import { t } from '../text.js';

const KEY = 'rollingparadise.music', VOL = 0.3;
const saved = () => { try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; } };
const keep = (on) => { try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* storage unavailable */ } };
let current = null, playing = false;
// the key the band is playing in (0 = C ... 11 = B), or C when it is quiet
export const musicKey = () => (playing && current ? current.key || 0 : 0);

// a running order: shuffled, then nudged so a kind of jazz never follows itself
export function setOrder(list = MUSIC, rnd = Math.random) {
  const pool = list.slice().sort(() => rnd() - 0.5), out = [];
  while (pool.length) { const i = pool.findIndex((x) => x.genre !== out[out.length - 1]?.genre); out.push(pool.splice(i < 0 ? 0 : i, 1)[0]); }
  return out;
}

export function initMusic(stage) {
  if (!MUSIC.length || typeof Audio === 'undefined') return;
  let on = saved(), order = setOrder(), at = 0, audio = null;
  const now = () => order[at];
  const next = () => { at++; if (at >= order.length) { order = setOrder(); at = 0; } current = now(); audio.src = current.src; audio.play().catch(() => {}); };
  function play() {
    if (!audio) { audio = new Audio(); audio.volume = VOL; audio.preload = 'auto'; audio.addEventListener('ended', next);
      audio.addEventListener('playing', () => { playing = true; }); audio.addEventListener('pause', () => { playing = false; }); }
    if (!audio.src) { current = now(); audio.src = current.src; }
    audio.play().catch(() => {});
  }
  const button = btn('♪', () => { on = !on; keep(on); if (on) play(); else audio?.pause(); mark(); },
    () => (on ? t('music.playing', { title: now().title, style: now().by }) : t('music.off')), 'small music-btn');
  const mark = () => button.classList.toggle('muted', !on);
  mark(); stage.append(button);
  const first = () => { document.removeEventListener('pointerdown', first, true); if (on) play(); };
  document.addEventListener('pointerdown', first, true);
}
