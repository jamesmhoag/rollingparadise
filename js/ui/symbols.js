// Neon symbols: each one bent from tube, as a centreline path in a 24 by 24 box (and lamps, `dots`, for pips and
// eyes), so the sign lights it exactly like its frame (sign.js). Used along a sign's edge, as the large symbol at the
// end of a name, and for the High Rollers' crowns. None of them is a font glyph: they look the same on every system.
const star = (n, R, r, cx = 12, cy = 12, rot = -Math.PI / 2) => {
  const pts = []; for (let i = 0; i < n * 2; i++) { const a = rot + (i * Math.PI) / n, k = i % 2 ? r : R; pts.push(`${(cx + Math.cos(a) * k).toFixed(2)} ${(cy + Math.sin(a) * k).toFixed(2)}`); }
  return `M${pts.join('L')}Z`;
};
const circle = (cx, cy, r) => `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`;
const box = 'M7 4H17A3 3 0 0 1 20 7V17A3 3 0 0 1 17 20H7A3 3 0 0 1 4 17V7A3 3 0 0 1 7 4Z';
const PIP = { 1: [[12, 12]], 2: [[8, 8], [16, 16]], 3: [[8, 8], [12, 12], [16, 16]], 4: [[8, 8], [16, 8], [8, 16], [16, 16]], 5: [[8, 8], [16, 8], [12, 12], [8, 16], [16, 16]], 6: [[8, 7.5], [16, 7.5], [8, 12], [16, 12], [8, 16.5], [16, 16.5]] };
const SKULL = 'M12 3C7 3 4 6.5 4 10.5C4 13 5.3 14.8 7 15.8V19H9.5V17.5H11V19H13V17.5H14.5V19H17V15.8C18.7 14.8 20 13 20 10.5C20 6.5 17 3 12 3Z';

// id: { d, dots?, group }
export const SYMBOLS = {
  times: { d: 'M6 6L18 18M18 6L6 18', group: 'math' }, plus: { d: 'M12 4V20M4 12H20', group: 'math' }, minus: { d: 'M4 12H20', group: 'math' },
  divide: { d: 'M5 12H19', dots: [[12, 6], [12, 18]], group: 'math' }, equals: { d: 'M5 9H19M5 15H19', group: 'math' }, infinity: { d: 'M12 12C9 8 4 8 4 12C4 16 9 16 12 12C15 8 20 8 20 12C20 16 15 16 12 12Z', group: 'math' },
  star4: { d: star(4, 10.5, 3.2), group: 'stars' }, sparkle: { d: 'M12 1.5Q13 11 22.5 12Q13 13 12 22.5Q11 13 1.5 12Q11 11 12 1.5Z', group: 'stars' }, star5: { d: star(5, 10.5, 4.3, 12, 12.8), group: 'stars' },
  star6: { d: star(6, 10.5, 5.6), group: 'stars' }, star8: { d: star(8, 10.5, 5.8), group: 'stars' }, burst: { d: 'M12 2V8M12 16V22M2 12H8M16 12H22M5 5L9 9M15 15L19 19M19 5L15 9M9 15L5 19', group: 'stars' },
  starRing: { d: `${circle(12, 12, 10.5)}${star(5, 7.6, 3.1, 12, 12.6)}`, group: 'stars' }, ringStar: { d: `${star(6, 11, 6.2)}${circle(12, 12, 3.4)}`, group: 'stars' },
  starDot: { d: star(5, 10.5, 4.3, 12, 12.8), dots: [[12, 12.8]], group: 'stars' },
  diamond: { d: 'M12 2L21 12L12 22L3 12Z', group: 'shapes' }, gem: { d: 'M12 2L21 12L12 22L3 12ZM12 7L16.5 12L12 17L7.5 12Z', group: 'shapes' }, ring: { d: circle(12, 12, 9), group: 'shapes' },
  target: { d: `${circle(12, 12, 9.5)}${circle(12, 12, 5)}`, dots: [[12, 12]], group: 'shapes' }, ringDiamond: { d: `${circle(12, 12, 10)}M12 6L18 12L12 18L6 12Z`, group: 'shapes' },
  heart: { d: 'M12 20.5C5 15.5 2.5 11.5 2.5 8.2A4.7 4.7 0 0 1 12 6.4A4.7 4.7 0 0 1 21.5 8.2C21.5 11.5 19 15.5 12 20.5Z', group: 'cards' },
  spade: { d: 'M12 2.5C8 7.5 3.5 10 3.5 13.6A4 4 0 0 0 10.8 15.8L9.8 21H14.2L13.2 15.8A4 4 0 0 0 20.5 13.6C20.5 10 16 7.5 12 2.5Z', group: 'cards' },
  club: { d: `${circle(12, 7, 3.7)}${circle(7.2, 13.4, 3.7)}${circle(16.8, 13.4, 3.7)}M12 11L10 21.5H14Z`, group: 'cards' },
  suit: { d: 'M12 2L20 12L12 22L4 12Z', group: 'cards' },
  ...Object.fromEntries([1, 2, 3, 4, 5, 6].map((n) => [`die${n}`, { d: box, dots: PIP[n], group: 'dice' }])),
  skull: { d: `${SKULL}M12 12.8L10.9 14.6H13.1Z`, dots: [[9, 10.4], [15, 10.4]], group: 'more' },
  crossbones: { d: 'M12 2.5C8.6 2.5 6.4 4.9 6.4 7.7C6.4 9.4 7.3 10.6 8.4 11.3V13.2H15.6V11.3C16.7 10.6 17.6 9.4 17.6 7.7C17.6 4.9 15.4 2.5 12 2.5ZM4 15L20 21.5M4 21.5L20 15', dots: [[10, 7.4], [14, 7.4]], group: 'more' },
  crown: { d: 'M3 18H21M3 18L3.5 8L8 12.5L12 5.5L16 12.5L20.5 8L21 18', dots: [[3.5, 7], [12, 4.5], [20.5, 7]], group: 'more' },
  moon: { d: 'M15 3A9 9 0 1 0 21 15A7 7 0 1 1 15 3Z', group: 'more' }, bolt: { d: 'M13.5 2L5 13.5H11L10 22L19 10H13Z', group: 'more' },
  note: { d: `M9 17V5L19 3V15${circle(6.5, 17, 2.5)}${circle(16.5, 15, 2.5)}`, group: 'more' }, horseshoe: { d: 'M6 3.5C2.8 10 3 16 7 19C9 20.6 15 20.6 17 19C21 16 21.2 10 18 3.5', dots: [[5.4, 9], [18.6, 9], [6.4, 15], [17.6, 15]], group: 'more' },
  cherry: { d: `${circle(7, 17.5, 3.3)}${circle(16.5, 16.5, 3.3)}M7 14.2C8.3 9 11 5.5 14 3M16.5 13.2C16 9.5 15 6 14 3M14 3C16.5 2.6 19 3.6 20 5.6C17.5 6 15.5 5 14 3Z`, group: 'more' },
  seven: { d: 'M5 4H19L10.5 21', group: 'more' }, flame: { d: 'M12 2C13 7 18.5 9.2 18.5 14.3A6.5 6.5 0 0 1 5.5 14.3C5.5 11.3 7.5 9.3 8.6 7.2C9.2 10.2 10.6 11.3 12 11.3C11 8.3 11 5 12 2Z', group: 'more' },
  cocktail: { d: 'M4 4H20L12 13V20.5M8 20.5H16', dots: [[15, 7]], group: 'more' }, cent: { d: 'M12 3.5V20.5M16.5 8.6A5.2 5.2 0 1 0 16.5 15.4', group: 'more' },
};
export const SYMBOL_GROUPS = ['math', 'stars', 'shapes', 'cards', 'dice', 'more'];
// the symbols the older signs named by character, so a saved sign keeps its look
export const FROM_CHAR = { '★': 'star5', '☆': 'star5', '✦': 'sparkle', '✧': 'sparkle', '✶': 'star6', '✸': 'star8', '✹': 'star8', '✪': 'starRing', '◆': 'diamond', '◇': 'diamond', '◈': 'gem', '♦': 'suit', '♢': 'suit',
  '♠': 'spade', '♤': 'spade', '♣': 'club', '♧': 'club', '♥': 'heart', '♡': 'heart', '●': 'ring', '○': 'ring', '◎': 'target', '✚': 'plus', '+': 'plus', '×': 'times', '−': 'minus', '÷': 'divide', '=': 'equals', '∞': 'infinity',
  '☾': 'moon', '☽': 'moon', '⚡': 'bolt', '♛': 'crown', '♚': 'crown', '❖': 'gem', '¢': 'cent', '☠': 'crossbones', ':skull': 'skull', '⚀': 'die1', '⚁': 'die2', '⚂': 'die3', '⚃': 'die4', '⚄': 'die5', '⚅': 'die6', '♪': 'note', '♫': 'note' };
export const symbolOf = (x) => (SYMBOLS[x] ? x : FROM_CHAR[x] || null);

// The High Rollers' crowns, by floor: each floor's is grander than the last. In a 28 by 24 box, in three parts that
// each take their own colour (sign.js): the band it sits on, the prongs rising off it, and the jewels (lamps) on both.
// d and dots are the whole crown in one, for anything that lights it in one colour.
const crown = (band, prongs, jewels) => ({ band, prongs, jewels, d: `${band}${prongs}`, dots: jewels });
export const CROWNS = {
  1: crown('M4 19H24', 'M4 19L5 10L9.5 14.5L14 8L18.5 14.5L23 10L24 19', [[14, 6.6]]),
  2: crown('M3 19H25', 'M3 19L3.5 8.5L8.2 13.4L10.6 6.2L14 12.2L17.4 6.2L19.8 13.4L24.5 8.5L25 19', [[3.5, 7], [10.6, 4.7], [17.4, 4.7], [24.5, 7], [14, 16.2]]),
  3: crown('M3 21H25M3 17.6H25M3 21V17.6M25 21V17.6', 'M3 17.6L2.8 8L8 13L10.5 5.5L14 11L17.5 5.5L20 13L25.2 8L25 17.6',
    [[2.8, 6.5], [10.5, 4], [17.5, 4], [25.2, 6.5], [8, 19.3], [14, 19.3], [20, 19.3]]),
  4: crown('M3.5 22H24.5M3.5 18.6H24.5M3.5 22V18.6M24.5 22V18.6', 'M3.5 18.6L3 10.5L7 13.6M24.5 18.6L25 10.5L21 13.6M6.5 18.6C6.5 11 9.8 7.6 14 7.6C18.2 7.6 21.5 11 21.5 18.6M14 7.6V18.6M14 7.6V2.2M11.8 4.2H16.2',
    [[3, 9], [25, 9], [8.5, 20.3], [14, 20.3], [19.5, 20.3], [10.2, 13.5], [17.8, 13.5]]),
};
