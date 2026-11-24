// The game's resources: fonts, images, icons and textures, by id. Everything listed here is a file in assets/ or
// a fallback the game draws itself. To change one, edit or replace its file; to give an icon or texture a file of
// its own, put the file in assets/ and set its src here. The game uses the file when src is set and the glyph
// (or its own gradient) when it is not. npm test checks that every src exists and lists files nothing uses.

export const FONTS = {
  display: { family: "Didact Gothic", files: ["assets/fonts/didact-gothic-latin-400-normal.woff2", "assets/fonts/didact-gothic-latin-ext-400-normal.woff2"], license: "assets/fonts/OFL-didact-gothic.txt" },
  script: { family: "Yellowtail", files: ["assets/fonts/yellowtail-latin-400-normal.woff2"], license: "assets/fonts/OFL-yellowtail.txt" },
};

// Each Roller's neon sign at the table, and the House's, set in Build mode (Neon): a pair of colours for each part (the
// tube's own and the glow it throws), the frame's style, a symbol along its edge or at its corners, what it is mounted
// on (a colour, an image), and one part that blinks, slowly and softly. See js/ui/sign.js. An opponent's own sign
// (ROSTER[id].sign, Opponent maker) is laid over `them`.
export const NEON = {
  you: { border: ["#6ef0ff", "#4d6bff"], name: ["#ff6edc", "#b98bff"], cls: ["#fff36e", "#ffa13d"], frame: "tube", edge: "★", edgeAt: "none", mount: { color: "", image: "" }, blink: { part: "none", pattern: "breathe" } },
  them: { border: ["#ff4d6a", "#ffa13d"], name: ["#9dff6e", "#2fd0ff"], cls: ["#b98bff", "#ff6edc"], frame: "tube", edge: "★", edgeAt: "none", mount: { color: "", image: "" }, blink: { part: "none", pattern: "breathe" } },
  // the House's sign is one of these too: a frame of bulbs (which twinkle, chase and flash as the House plays)
  house: { border: ["#ffd76a", "#ff9a2e"], name: ["#ffb84d", "#ff7a1a"], cls: ["#fff4d6", "#ffd76a"], frame: "bulbs", edge: "♦", edgeAt: "none", mount: { color: "#0b0716", image: "" }, blink: { part: "none", pattern: "breathe" } },
};

// the lounge band's set, played in turn on a loop: original tunes written for Rolling Paradise, one per corner of
// Vegas jazz from the 1940s to the 1980s, composed and rendered by tools/jazz (FluidR3 GM soundfont, MIT licence)
export { MUSIC } from './music.js'; // the lounge band's set list (written by tools/jazz/render.py)

export const IMAGES = {
  logoPink: "assets/logo-pink.png", logoCyan: "assets/logo-cyan.png", logoDice: "assets/logo-dice.png",
};

// icons: { src: a file in assets/icons (png, svg or webp), or null } and, for things with no table of their own, the
// glyph drawn when there is no file. Creatures, orbitals and chips take their glyph from their own table (CREATURES,
// ORBITALS, SHOP_CHIPS), so change it there.
export const ICONS = {
  // the floor's rooms
  "room:smith": { glyph: "⚒", src: null },
  "room:dice": { glyph: "🎲", src: null },
  "room:trader": { glyph: "🃏", src: null },
  "room:exchange": { glyph: "🪙", src: null },
  "room:lounge": { glyph: "🍹", src: null },
  "room:book": { glyph: "🏇", src: null },
  "room:search": { glyph: "🔎", src: null },
  "room:kit": { glyph: "🎒", src: null },
  // creatures and things in the sky
  "creature:ufo": { src: null },
  "creature:fairy": { src: null },
  "creature:dragon": { src: null },
  "creature:mole": { src: null },
  "creature:unicorn": { src: null },
  "creature:mothership": { src: null },
  "creature:ghost": { src: null },
  "creature:ghostship": { src: null },
  "orbital:cloud": { src: null },
  "orbital:sun": { src: null },
  "orbital:moon": { src: null },
  "orbital:blizzard": { src: null },
  "orbital:b52": { src: null },
  "orbital:tornado": { src: null },
  "creature:bee": { glyph: "🐝", src: null },
  // effect chips (the mark on the chip)
  "chip:burn": { src: null },
  "chip:frost": { src: null },
  "chip:shock": { src: null },
  "chip:acid": { src: null },
  "chip:corrupt": { src: null },
  "chip:poison": { src: null },
  "chip:boom": { src: null },
  "chip:reducer": { src: null },
  "chip:anchor": { src: null },
  "chip:nest": { src: null },
  "chip:rebound": { src: null },
  "chip:lucky": { src: null },
  "chip:transpara": { src: null },
  "chip:seed": { src: null },
  "chip:clay": { src: null },
  "chip:harmony": { src: null },
  "chip:power": { src: null },
  "chip:control": { src: null },
  "chip:ward": { src: null },
  "chip:shadow": { src: null },
  "chip:tree": { src: null },
  "chip:sun": { src: null },
  "chip:heli": { src: null },
  "chip:hive": { src: null },
  "chip:battery": { src: null },
  "chip:repeater": { src: null },
  "chip:mimic": { src: null },
  "chip:forgetter": { src: null },
  "chip:tesla": { src: null },
  "chip:absorb": { src: null },
  "chip:sprinkler": { src: null },
  "chip:uranium": { src: null },
  "chip:big": { src: null },
  "chip:little": { src: null },
  "chip:spy": { src: null },
  "chip:fib": { src: null },
  "chip:prime": { src: null },
  "chip:chocolate": { src: null },
  "chip:steal": { src: null },
  "chip:honey": { src: null },
  "chip:chipchip": { src: null },
  "chip:dip": { src: null },
  "chip:fishchip": { src: null },
  "chip:hamburger": { src: null },
  "chip:bun": { src: null },
  "chip:egg": { src: null },
  "chip:zap": { src: null },
  "chip:boosted": { src: null },
  "chip:cheapened": { src: null },
  "chip:upgrade": { src: null },
  "chip:crown": { src: null },
};

// textures laid over what the game draws: felts by felt id ("felt:<id>"), and the table
export const TEXTURES = {
  "felt:felt": null,
  "felt:satin": null,
  "felt:buffet": null,
  "felt:earthen": null,
  "felt:frosty": null,
  "felt:urban": null,
  "felt:oceanic": null,
  "felt:molten": null,
  "felt:lunar": null,
  "felt:polar": null,
  "felt:galactic": null,
  "felt:royal": null,
  "felt:house": null,
  "felt:paradise": null,
};

