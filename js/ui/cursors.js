// The game's own pointer: one drawn set of cursors, larger than the system's and in high contrast (a dark body, a bright
// neon edge and a white inner line), used everywhere in place of the browser's. The player picks its colour (in the
// Coat Check, the Suite or the Alley; kept between runs): one of CURSOR_COLORS, or 'scene', where the scene shown
// picks it (a scene can name a theme with data-cursors; the table is 'table'). The whole page takes it, so the
// tooltips, panels and anything carried follow too.
// style.css never names a system cursor directly: every rule says cursor: var(--cur-<kind>, <kind>), and these are
// the --cur-* values. Kinds: default, pointer, help, grab, grabbing, crosshair, not-allowed.
export const CURSOR_PX = 32;
// the colours the player can pick: a neon edge on a dark body of the same hue, with a pale inner line
export const CURSOR_COLORS = [
  { id: 'gold', edge: '#ffd76a' }, { id: 'cyan', edge: '#6ef0ff' }, { id: 'magenta', edge: '#ff5fd2' }, { id: 'red', edge: '#ff5a4a' },
  { id: 'orange', edge: '#ff9a3c' }, { id: 'green', edge: '#5cff8a' }, { id: 'blue', edge: '#5a8cff' }, { id: 'violet', edge: '#b07bff' }, { id: 'white', edge: '#f4f1ff' },
];
const tint = (hex, k) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('');
const lift = (hex) => '#' + [1, 3, 5].map((i) => Math.round(255 - (255 - parseInt(hex.slice(i, i + 2), 16)) * 0.25).toString(16).padStart(2, '0')).join('');
const colorTheme = (id) => { const c = CURSOR_COLORS.find((x) => x.id === id); return c && { edge: c.edge, body: tint(c.edge, 0.11), line: lift(c.edge) }; };
// the player's pick, kept between runs: a colour id, or 'scene'
const PREF = 'rp.cursor';
export const cursorPref = () => { try { return globalThis.localStorage?.getItem(PREF) || 'scene'; } catch { return 'scene'; } };
export const CURSOR_THEMES = {
  default: { edge: '#ffd76a', body: '#160d2e', line: '#fff6d8' }, // gold, as the menus and the floor
  table: { edge: '#6ef0ff', body: '#071a24', line: '#e6fdff' }, // cyan, as the table's tubes
};
// Shapes on a 32×32 grid, with the hotspot each points from.
const SHAPES = {
  default: { hot: [4, 3], d: 'M4 3 L4 26 L10 20.5 L14.5 29.5 L18.6 27.6 L14.2 18.6 L22.4 18.6 Z' },
  pointer: { hot: [13, 3], d: 'M11 5.5a2.5 2.5 0 0 1 5 0V15l.4-.1a2.4 2.4 0 0 1 4.4 1v.6a2.4 2.4 0 0 1 4.4 1.1v1a2.3 2.3 0 0 1 4 1.4V24c0 4.2-3.2 6.8-7.2 6.8h-4.6c-2.9 0-4.9-1.3-6.4-3.7L6.6 20a2.4 2.4 0 0 1 4-2.6l.4.6Z' },
  grab: { hot: [16, 16], d: 'M8 17V9.5a2.2 2.2 0 0 1 4.4 0V15V6.5a2.2 2.2 0 0 1 4.4 0V15V7.5a2.2 2.2 0 0 1 4.4 0V15.5V10a2.2 2.2 0 0 1 4.4 0V21c0 5.2-3.4 8.5-8.4 8.5h-1.8c-3 0-5.1-1.4-6.6-3.9L4.6 20a2.2 2.2 0 0 1 3.4-2.6Z' },
  grabbing: { hot: [16, 16], d: 'M8 14.5c0-2.4 4.4-2.4 4.4 0c0-2.4 4.4-2.4 4.4 0c0-2.4 4.4-2.4 4.4 0c0-2.4 4.4-2.4 4.4 0V21c0 5.2-3.4 8.5-8.4 8.5h-1.8C7.6 29.5 5 26.4 5 22.6v-3.4c0-2.3 1.4-3.6 3-3.6Z' },
  crosshair: { hot: [16, 16], d: 'M16 3v9M16 20v9M3 16h9M20 16h9M16 9.5a6.5 6.5 0 1 1 0 13a6.5 6.5 0 1 1 0-13Z', open: true },
  'not-allowed': { hot: [16, 16], d: 'M16 4a12 12 0 1 1 0 24a12 12 0 1 1 0-24ZM7.6 7.6l16.8 16.8', open: true },
};
// every shape is drawn a little in from the edge, so its glow is never cut off (the hotspot moves with it)
const INSET = 1, FIT = 0.92;
// help: the arrow with a question mark beside it
const HELP_BADGE = '<circle cx="24" cy="24" r="6.6"/><text x="24" y="27.6" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="10" stroke="none">?</text>';

function svg(kind, T) {
  const S = SHAPES[kind === 'help' ? 'default' : kind], open = !!S.open;
  const glow = `<path d="${S.d}" fill="none" stroke="${T.edge}" stroke-opacity=".35" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>`;
  const body = `<path d="${S.d}" fill="${open ? 'none' : T.body}" stroke="${T.edge}" stroke-width="${open ? 3 : 2.2}" stroke-linejoin="round" stroke-linecap="round"/>`
    + (open ? `<path d="${S.d}" fill="none" stroke="${T.line}" stroke-width="1" stroke-linecap="round"/>` : `<path d="${S.d}" fill="none" stroke="${T.line}" stroke-width=".7" stroke-linejoin="round" transform="translate(.6 .6) scale(.96)" stroke-opacity=".7"/>`);
  const badge = kind === 'help' ? `<g fill="${T.body}" stroke="${T.edge}" stroke-width="1.8">${HELP_BADGE.replace('stroke="none"', `fill="${T.line}" stroke="none"`)}</g>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CURSOR_PX}" height="${CURSOR_PX}" viewBox="0 0 32 32"><g transform="translate(${INSET} ${INSET}) scale(${FIT})">${glow}${body}${badge}</g></svg>`;
}
const url = (kind, T) => { const [x, y] = SHAPES[kind === 'help' ? 'default' : kind].hot; return `url("data:image/svg+xml,${encodeURIComponent(svg(kind, T))}") ${Math.round(INSET + x * FIT)} ${Math.round(INSET + y * FIT)}`; };
export const CURSOR_KINDS = ['default', 'pointer', 'help', 'grab', 'grabbing', 'crosshair', 'not-allowed'];
const sets = new Map();
// the --cur-* values for a theme (built once per theme)
export function cursorSet(theme = 'default') {
  if (!sets.has(theme)) { const T = colorTheme(theme) || CURSOR_THEMES[theme] || CURSOR_THEMES.default; sets.set(theme, Object.fromEntries(CURSOR_KINDS.map((k) => [`--cur-${k}`, `${url(k, T)}, ${k}`]))); }
  return sets.get(theme);
}
let current = null, sceneTheme = 'default';
// Put the cursors on the page: the player's colour, or (picking 'scene') the theme the scene asks for.
export function applyCursors(theme = sceneTheme, el = typeof document !== 'undefined' ? document.documentElement : null) {
  if (!el) return; if (el === document.documentElement) { sceneTheme = theme; const pref = cursorPref(); if (pref !== 'scene') theme = pref; if (current === theme) return; current = theme; }
  for (const [k, v] of Object.entries(cursorSet(theme))) el.style.setProperty(k, v);
}
// the theme a scene asks for
export const themeOf = (sceneEl) => sceneEl?.dataset?.cursors || (sceneEl?.classList?.contains('bout') ? 'table' : 'default');
// the player picks a colour (or 'scene'): kept, and on the page at once
export function setCursorPref(id) { try { if (id === 'scene') globalThis.localStorage?.removeItem(PREF); else globalThis.localStorage?.setItem(PREF, id); } catch { /* storage unavailable */ } applyCursors(sceneTheme); }
