// Finishes: what a thing is made of, for everything that can be dressed (a sign's name, class line and backing, a
// card's backing and ink, a wallet, a jacket, their symbols and a crown). The eight dice materials are here as
// finishes, drawn in CSS to stand beside the rendered dice, and with them the cloths and hides gear is cut from.
// A finish is { m, color, glint, sparkle }: the material, its base colour, a highlight that sweeps across it now and
// then, and points of light that twinkle on it. Any finish can go on any part. Drawn in css/style.css (.fin-*).
// breaks: how a thing made of it fails when its sign goes dark (ui/sign.js): 'shatter' (pieces fall, what is left is
// broken through), 'crack' (it stays, split), 'dent' (it dulls and buckles), 'dull' (it only goes dark and limp).
// thick: how thick a card, a pass, a wallet or a jacket of it is, against card stock at 1 (ui/thing.js).
export const FINISHES = {
  // the dice materials
  plastic: { name: 'Plastic', kind: 'dice', breaks: 'crack', thick: 1.6, text: 'Glossy and even, a soft highlight.' },
  glass: { name: 'Glass', kind: 'dice', breaks: 'shatter', thick: 2.6, text: 'Clear, tinted through its depth; what is behind it shows.' },
  metal: { name: 'Metal', kind: 'dice', breaks: 'dent', thick: 1.4, text: 'Polished, banded with what it reflects.' },
  sparkling: { name: 'Sparkling', kind: 'dice', breaks: 'crack', thick: 1.8, text: 'Glitter under a clear coat.' },
  glimmering: { name: 'Glimmering', kind: 'dice', breaks: 'shatter', thick: 2.4, text: 'Frosted, with a fine shimmer in it.' },
  swirling: { name: 'Swirling', kind: 'dice', breaks: 'shatter', thick: 2.6, text: 'Clear resin with ribbons of colour turning inside.' },
  diamond: { name: 'Diamond', kind: 'dice', breaks: 'shatter', thick: 3, text: 'Cut in facets that split the light.' },
  bone: { name: 'Bone', kind: 'dice', breaks: 'crack', thick: 2, text: 'Warm ivory, a little worn, with a grain.' },
  // paper
  paper: { name: 'Card stock', kind: 'paper', breaks: 'dull', thick: 1, text: 'Pressed paper with a fine tooth: what a printed card is.' },
  // cloth, hide, skin and fur
  leather: { name: 'Leather', kind: 'cloth', breaks: 'dull', thick: 2.2, text: 'Pebbled hide with a low sheen.' },
  croc: { name: 'Crocodile', kind: 'cloth', breaks: 'dull', thick: 2.6, text: 'Big square scales with deep seams between.' },
  snake: { name: 'Snakeskin', kind: 'cloth', breaks: 'dull', thick: 1.8, text: 'Small overlapping scales in rows.' },
  suede: { name: 'Suede', kind: 'cloth', breaks: 'dull', thick: 2, text: 'Brushed and matte: it drinks the light.' },
  velvet: { name: 'Velvet', kind: 'cloth', breaks: 'dull', thick: 2, text: 'Deep pile, bright where it turns to the light.' },
  fur: { name: 'Fur', kind: 'cloth', breaks: 'dull', thick: 3.4, text: 'Long soft hair, lying one way.' },
  silk: { name: 'Silk', kind: 'cloth', breaks: 'dull', thick: 1, text: 'Smooth, with long soft bands of light.' },
  denim: { name: 'Denim', kind: 'cloth', breaks: 'dull', thick: 1.6, text: 'A diagonal twill.' },
  canvas: { name: 'Canvas', kind: 'cloth', breaks: 'dull', thick: 1.6, text: 'A plain open weave.' },
  wool: { name: 'Wool', kind: 'cloth', breaks: 'dull', thick: 2.4, text: 'Soft and flecked.' },
  vinyl: { name: 'Vinyl', kind: 'cloth', breaks: 'crack', thick: 1.4, text: 'Slick and shiny, a hard highlight.' },
};

export const FINISH_IDS = Object.keys(FINISHES);
export const finishOf = (f) => (f && FINISHES[f.m] ? { m: f.m, color: /^#[0-9a-f]{6}$/i.test(f.color || '') ? f.color : '', glint: !!f.glint, sparkle: !!f.sparkle } : null);

// ---------- wallets and jackets ----------
// What a wallet or a jacket can be made to look like (its `look`), within what their shapes allow. Anything left out is
// read from the entry as it was before looks: its colour, and a material guessed from its name.
// A wallet is one of three types, and a jacket one of a few styles; within each, its parts can be set: what each is
// made of and its colour, and the details its shape has.
//   billfold  folds in two; its cover swings open: your cards inside the cover, your passes in the other leaf
//   clasped   a pouch with a flap, held shut by its clasp; the flap lifts: cards and passes stand in it
//   clutch    long and low, hinged along its bottom edge: it opens like a hot dog bun, passes in the back, cards in the front
// Hardware adorns it rather than being what it is made of: its closure (a clasped pouch's or a clutch's: a snap with
// its cap outside and its socket under it, a sewn button, a magnet, a zip, a turn-lock clasp), a chain hanging from a
// ring at its side, and rivets at its corners, each of a material and colour (look.hardware, look.chain) and a size.
//   clip      a band over the stack: everything it holds is in plain sight
export const WALLET_TYPES = { billfold: 'Billfold', clasped: 'Clasped', clutch: 'Clutch', clip: 'Clip' };
export const WALLET_CLASPS = { snap: 'Snap', button: 'Button', magnet: 'Magnet', zip: 'Zip', turnlock: 'Turn-lock clasp', none: 'None' };
export const JACKET_STYLES = { blazer: 'Blazer', bomber: 'Bomber', coat: 'Long coat', parka: 'Parka' };
export const JACKET_COLLARS = { lapel: 'Lapels', stand: 'Stand collar', crew: 'Crew neck', hood: 'Hood' };
export const JACKET_CLOSURES = { buttons: 'Buttons', zip: 'Zip', open: 'Worn open' };
// what a style is unless its look says otherwise
const STYLE = { blazer: { collar: 'lapel', closure: 'buttons', buttons: 2, length: 0, pockets: 2, ribbed: false }, bomber: { collar: 'stand', closure: 'zip', buttons: 0, length: 0, pockets: 2, ribbed: true },
  coat: { collar: 'lapel', closure: 'buttons', buttons: 3, length: 10, pockets: 2, ribbed: false }, parka: { collar: 'hood', closure: 'zip', buttons: 0, length: 5, pockets: 2, ribbed: false } };
// bounds for the numbers a look can set (kept to what the drawn shapes can show)
export const LOOK_BOUNDS = { hwSize: [0.6, 1.6], links: [8, 40], buttons: [0, 4], flap: [8, 26], round: [2, 14], length: [0, 12], pockets: [0, 2], slots: [0, 8], keep: [2, 24], passes: [1, 6] };
const GUESS = [['leather', 'leather'], ['suede', 'suede'], ['velvet', 'velvet'], ['denim', 'denim'], ['silk', 'silk'], ['royal', 'silk'], ['cloth', 'canvas'], ['bomber', 'canvas'], ['tape', 'vinyl'], ['neon', 'vinyl'], ['rain', 'vinyl'],
  ['silver', 'metal'], ['magnetic', 'metal'], ['diamond', 'diamond'], ['down', 'silk'], ['sports', 'silk'], ['long', 'wool'], ['reading', 'wool'], ['standard', 'wool']];
const guessMat = (name, id) => (GUESS.find(([w]) => `${id} ${name}`.toLowerCase().includes(w)) || [0, 'canvas'])[1];
const clamp = (k, v, d) => { const [lo, hi] = LOOK_BOUNDS[k]; const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
// a look's emblem: a symbol, its colour and the material it is made of (none: drawn plain)
const emblem = (L) => (L.symbol?.id ? { id: L.symbol.id, color: L.symbol.color || '#ffffff', mat: FINISHES[L.symbol.mat] ? L.symbol.mat : '' } : null);
// a part of a piece ({ mat, color }): its own, or the piece's
const part = (P, mat, color) => ({ mat: FINISHES[P?.mat] ? P.mat : mat, color: P?.color || color });
export function walletLook(id, W = {}) {
  const L = W.look || {}, nm = `${id} ${W.name || ''}`.toLowerCase(), mat = FINISHES[L.mat] ? L.mat : guessMat(W.name, id), color = L.color || W.color || '#8d8478';
  const type = WALLET_TYPES[L.type] ? L.type : /clutch/.test(nm) ? 'clutch' : /clip/.test(nm) || L.clasp === 'clip' ? 'clip' : /zip|snap|chain|magnet/.test(nm) || WALLET_CLASPS[L.clasp] ? 'clasped' : 'billfold';
  return { type, mat, color, trim: L.trim || '', lining: L.lining || '', glint: !!L.glint, sparkle: !!L.sparkle, stitch: L.stitch ?? /leather|cloth/.test(nm),
    clasp: WALLET_CLASPS[L.clasp] ? L.clasp : /zip/.test(nm) ? 'zip' : /magnet/.test(nm) ? 'magnet' : 'snap', // (a chain was once a clasp: it is a chain on a snap now)
    hardware: { ...part(L.hardware, 'metal', '#d4dae4'), size: clamp('hwSize', L.hardware?.size, 1) },
    chain: (L.chain?.on ?? (L.clasp === 'chain' || /chain/.test(nm))) ? { ...part(L.chain, FINISHES[L.hardware?.mat] ? L.hardware.mat : 'metal', L.hardware?.color || '#d4dae4'), links: clamp('links', L.chain?.links, 22) } : null,
    rivets: !!L.rivets,
    flap: clamp('flap', L.flap, 15), round: clamp('round', L.round, 6), pocket: part(L.pocket, mat, color), symbol: emblem(L),
    wad: L.wad?.on ? part(L.wad, 'paper', '#8fbf86') : null }; // a clip's wad under its arm: off unless the look turns it on (any material)
}
export function jacketLook(id, J = {}) {
  const L = J.look || {}, nm = `${id} ${J.name || ''}`.toLowerCase(), mat = FINISHES[L.mat] ? L.mat : guessMat(J.name, id), color = L.color || J.color || '#5b6378';
  const style = JACKET_STYLES[L.style] ? L.style : /long|reading|regal/.test(nm) ? 'coat' : /bomber|down|sports|leather/.test(nm) ? 'bomber' : /rain/.test(nm) ? 'parka' : 'blazer', S = STYLE[style];
  return { style, mat, color, lining: L.lining || '', glint: !!L.glint, sparkle: !!L.sparkle, ribbed: L.ribbed ?? S.ribbed,
    collar: JACKET_COLLARS[L.collar] ? L.collar : S.collar, closure: JACKET_CLOSURES[L.closure] ? L.closure : S.closure, buttons: clamp('buttons', L.buttons, S.buttons), buttonColor: L.buttonColor || '',
    length: clamp('length', L.length, S.length), pockets: clamp('pockets', L.pockets, S.pockets), sleeves: part(L.sleeves, mat, color), trim: part(L.trim, mat, L.lining || ''), symbol: emblem(L) };
}
// a new wallet or jacket from the Gear maker starts as this
export const NEW_WALLET = { name: 'New Wallet', color: '#7a4b2a', slots: 2, keep: 8, passes: 1, price: 1000, level: 0, look: { type: 'billfold', mat: 'leather', stitch: true } };
export const NEW_JACKET = { name: 'New Jacket', color: '#5b6378', effect: 'New · Untested', mods: {}, price: 200, level: 0, look: { style: 'blazer', mat: 'wool' } };

// ---------- drinks ----------
// A drink is a vessel and what is in it, and everything made in Build mode's Gear maker (Drinks):
//   vessel: its shape (DRINK_VESSELS) · mat, color: what the vessel is made of (any finish) · rim: { mat, color } a band
//   round its lip · crust: salt, sugar or chili round the lip
//   liquid: { mat (DRINK_LIQUIDS), color, top: a second colour floating on it (layer: on or off) } (rim, inner: on or
//   off as well, and strawOn) · foam: a head on it (0 to 1)
//   ice: cubes in it (0 to 4) · inner: { color } a shot glass sunk in it, of another drink · glow: a light in it
//   fizz: bubbles rise through it · sparkle: points of every colour drift in it · steam: it is hot · slosh: it moves
//   with the glass (on unless turned off) · straw: its colour · garnish (DRINK_GARNISHES) and garnishColor (an
//   umbrella's paper, a cherry, an olive, the fruit, the mint) · toy (DRINK_TOYS) and toyColor: something in it ·
//   crustColor, fizzColor, foamColor
export const DRINK_VESSELS = { tumbler: 'Tumbler', tall: 'Tall glass', mug: 'Mug', cup: 'Teacup and saucer', goblet: 'Goblet', coupe: 'Coupe', martini: 'Martini glass', shot: 'Shot glass' };
export const DRINK_LIQUIDS = { liquid: 'Clear (see through it)', cream: 'Creamy', syrup: 'Glossy and deep', chromatic: 'Every colour at once' };
export const DRINK_GARNISHES = { cherry: 'A cherry', umbrella: 'A paper umbrella', lemon: 'A slice of lemon', lime: 'A slice of lime', orange: 'A slice of orange', olive: 'An olive on a pick', mint: 'A sprig of mint' };
export const DRINK_CRUSTS = { salt: 'Salt', sugar: 'Sugar', chili: 'Chili' };
export const DRINK_TOYS = { starfish: 'A starfish', diver: 'A scuba diver', duck: 'A rubber duck' };
// each garnish's and crust's own colour, until one is chosen
const GARNISH_COLORS = { cherry: '#d21f3c', umbrella: '#ff5fa8', lemon: '#ffe45c', lime: '#a7e26a', orange: '#ffad45', olive: '#6f8f2e', mint: '#3fae4a' };
const CRUST_COLORS = { salt: '#ffffff', sugar: '#fffdf5', chili: '#d8341f' };
const DRINK_LOOKS = {
  soda: { vessel: 'tall', fizz: true, foam: 0.35, straw: '#ff5b6e', ice: 2 },
  water: { vessel: 'tumbler', ice: 3, garnish: 'lemon' },
  coffee: { vessel: 'tall', ice: 2, liquid: { top: '#e8d9c2' }, straw: '#2b2b33' },
  milk: { vessel: 'mug', mat: 'plastic', color: '#f3ead8', liquid: { mat: 'cream' }, foam: 0.2, steam: true },
  tea: { vessel: 'cup', mat: 'plastic', color: '#f6f1e6', rim: { mat: 'metal', color: '#d9b45a' }, garnish: 'lemon', steam: true },
  juice: { vessel: 'goblet', garnish: 'orange', straw: '#3fb86b', crust: 'sugar' },
  special: { vessel: 'coupe', garnish: 'umbrella', fizz: true, toy: 'starfish' },
  royal: { vessel: 'goblet', rim: { mat: 'metal', color: '#e8c35a' }, fizz: true, garnish: 'cherry' },
  diamond: { vessel: 'coupe', mat: 'diamond', liquid: { mat: 'chromatic' }, sparkle: true, fizz: true, glow: true },
};
const hex = (c, d) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : d);
export function drinkLook(d = {}) {
  const K = { ...(DRINK_LOOKS[d.id] || {}), ...(d.look || {}) }, color = d.color || '#ff86ea';
  const pick = (o, k) => (o[k] ? k : null), seeThrough = ['glass', 'diamond', 'glimmering', 'swirling'];
  return { vessel: DRINK_VESSELS[K.vessel] ? K.vessel : 'tumbler', mat: FINISHES[K.mat] || seeThrough.includes(K.mat) ? K.mat : 'glass', color: hex(K.color, '#dff2ff'),
    rim: K.rim && K.rim.on !== false && (K.rim.on || K.rim.mat || K.rim.color) ? { mat: FINISHES[K.rim.mat] || ['glass', 'diamond'].includes(K.rim.mat) ? K.rim.mat : 'metal', color: hex(K.rim.color, '#e8c35a') } : null, crust: pick(DRINK_CRUSTS, K.crust),
    liquid: { mat: DRINK_LIQUIDS[K.liquid?.mat] ? K.liquid.mat : 'liquid', color: hex(K.liquid?.color, color), top: K.liquid?.layer !== false && (K.liquid?.top || K.liquid?.layer) ? hex(K.liquid.top, '#ffffff') : null },
    foam: Math.max(0, Math.min(1, +K.foam || 0)), ice: Math.max(0, Math.min(4, K.ice | 0)), inner: K.inner && K.inner.on !== false && (K.inner.on || K.inner.color) ? { color: hex(K.inner.color, '#ff3b6b') } : null, glow: !!K.glow,
    fizz: !!(K.fizz ?? K.bubbles), sparkle: !!K.sparkle, steam: !!K.steam, slosh: K.slosh !== false,
    straw: K.strawOn !== false && (K.strawOn || K.straw) ? hex(K.straw, '#ff5b6e') : null, garnish: pick(DRINK_GARNISHES, K.garnish), garnishColor: hex(K.garnishColor, GARNISH_COLORS[K.garnish] || '#ff5fa8'),
    crustColor: hex(K.crustColor, CRUST_COLORS[K.crust] || '#ffffff'), fizzColor: hex(K.fizzColor, '#f6fcff'), foamColor: hex(K.foamColor, '#fffaf0'),
    toy: pick(DRINK_TOYS, K.toy), toyColor: hex(K.toyColor, K.toy === 'diver' ? '#ffd23d' : K.toy === 'duck' ? '#ffd23d' : '#ff7a45') };
}

// ---------- foil packs ----------
// A foil pack is a sealed pillow of foil, crimped shut at the top and the bottom, with a printed label across its
// front (the set's name and an emblem). Any finish can be the foil, the label and the crimps. A pack's look:
//   mat, color: the wrapper (metal is foil) · print: { pattern (PACK_PATTERNS), colors: [ink, second ink], clear: how
//   much foil shows through the second ink (0 to 1), shine: how metallic the print is (0 to 1) }: printed over the whole
//   front · label: { color }: the band across it · ink: the band's lettering · crimp: { mat, color }
//   (the seals; else as the wrapper) · symbol: { id, color } (id null: none) · wrinkle: how crumpled the foil is
//   (0 to 1) · tear: the colour of the notch you tear it from
const PACK_COLORS = ['#c9d0dc', '#5fa2ff', '#c46cff', '#ffcf5a'];
const PACK_SYMBOLS = ['star4', 'star5', 'star8', 'crown'];
export const PACK_PATTERNS = { burst: 'Sunburst', stripes: 'Stripes', dots: 'Halftone dots', waves: 'Waves', diamonds: 'Diamonds', plain: 'Plain' };
const PACK_PRINTS = [['#2b6cff', '#7fe3ff'], ['#ff3d8b', '#ffd23d'], ['#7b2cff', '#22e0c8'], ['#ff8a00', '#ff2e63']];
const unit = (v, d) => (Number.isFinite(+v) && v !== '' && v != null ? Math.max(0, Math.min(1, +v)) : d);
export function packLook(q, P = {}) {
  const L = P.look || {}, i = Math.max(0, Math.min(3, (q || 1) - 1)), mat = FINISHES[L.mat] ? L.mat : 'metal', color = L.color || P.color || PACK_COLORS[i];
  const pr = L.print || {}, inks = PACK_PRINTS[i];
  const print = { pattern: PACK_PATTERNS[pr.pattern] ? pr.pattern : 'burst', colors: [pr.colors?.[0] || inks[0], pr.colors?.[1] || inks[1]], clear: unit(pr.clear, 0.45), shine: unit(pr.shine, 0.55) };
  return { mat, color, print, label: part(L.label, 'paper', '#160f2a'), ink: L.ink || '#ffffff', crimp: part(L.crimp, mat, color),
    symbol: L.symbol && 'id' in L.symbol && !L.symbol.id ? null : emblem(L) || { id: PACK_SYMBOLS[i], color: L.ink || color, mat: '' },
    wrinkle: Math.max(0, Math.min(1, Number.isFinite(+L.wrinkle) ? +L.wrinkle : 0.4)), tear: L.tear || '#ff5f6a', name: P.name || '' };
}
