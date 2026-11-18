// The lounge's music: the rags in MUSIC, one after another on a loop, quietly under the game. Browsers only let
// sound start after the player touches the page, so it begins on the first click. The ♪ button in the corner
// turns it on or off (remembered in this browser); its hover names the tune.
import { MUSIC } from '../content/assets.js';
import { btn } from './core.js';
import { t } from '../text.js';

const KEY = 'rollingparadise.music', VOL = 0.3;
const saved = () => { try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; } };
const keep = (on) => { try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* storage unavailable */ } };

export function initMusic(stage) {
  if (!MUSIC.length || typeof Audio === 'undefined') return;
  let on = saved(), at = Math.floor(Math.random() * MUSIC.length), audio = null;
  const now = () => MUSIC[at];
  function play() {
    if (!audio) { audio = new Audio(); audio.volume = VOL; audio.preload = 'auto'; audio.addEventListener('ended', () => { at = (at + 1) % MUSIC.length; audio.src = now().src; audio.play().catch(() => {}); }); }
    if (!audio.src) audio.src = now().src;
    audio.play().catch(() => {});
  }
  const button = btn('♪', () => { on = !on; keep(on); if (on) play(); else audio?.pause(); mark(); },
    () => (on ? t('music.playing', { title: now().title, by: now().by, year: now().year }) : t('music.off')), 'small music-btn');
  const mark = () => button.classList.toggle('muted', !on);
  mark(); stage.append(button);
  const first = () => { document.removeEventListener('pointerdown', first, true); if (on) play(); };
  document.addEventListener('pointerdown', first, true);
}
