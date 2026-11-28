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
//   clip      a band over the stack: everything it holds is in plain sight
export const WALLET_TYPES = { billfold: 'Billfold', clasped: 'Clasped', clip: 'Clip' };
export const WALLET_CLASPS = { snap: 'Snap', zip: 'Zip', chain: 'Chain', magnet: 'Magnet' };
export const JACKET_STYLES = { blazer: 'Blazer', bomber: 'Bomber', coat: 'Long coat', parka: 'Parka' };
export const JACKET_COLLARS = { lapel: 'Lapels', stand: 'Stand collar', crew: 'Crew neck', hood: 'Hood' };
export const JACKET_CLOSURES = { buttons: 'Buttons', zip: 'Zip', open: 'Worn open' };
// what a style is unless its look says otherwise
const STYLE = { blazer: { collar: 'lapel', closure: 'buttons', buttons: 2, length: 0, pockets: 2, ribbed: false }, bomber: { collar: 'stand', closure: 'zip', buttons: 0, length: 0, pockets: 2, ribbed: true },
  coat: { collar: 'lapel', closure: 'buttons', buttons: 3, length: 10, pockets: 2, ribbed: false }, parka: { collar: 'hood', closure: 'zip', buttons: 0, length: 5, pockets: 2, ribbed: false } };
// bounds for the numbers a look can set (kept to what the drawn shapes can show)
export const LOOK_BOUNDS = { buttons: [0, 4], flap: [8, 26], round: [2, 14], length: [0, 12], pockets: [0, 2], slots: [0, 8], keep: [2, 24], passes: [1, 6] };
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
  const type = WALLET_TYPES[L.type] ? L.type : /clip/.test(nm) || L.clasp === 'clip' ? 'clip' : /zip|snap|chain|magnet/.test(nm) || WALLET_CLASPS[L.clasp] ? 'clasped' : 'billfold';
  return { type, mat, color, trim: L.trim || '', lining: L.lining || '', glint: !!L.glint, sparkle: !!L.sparkle, stitch: L.stitch ?? /leather|cloth/.test(nm),
    clasp: WALLET_CLASPS[L.clasp] ? L.clasp : /zip/.test(nm) ? 'zip' : /chain/.test(nm) ? 'chain' : /magnet/.test(nm) ? 'magnet' : 'snap',
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
// A drink is a vessel and what is in it. vessel: its shape (DRINK_VESSELS) · mat, color: what the vessel is made of
// (any material) · rim: a band round its lip · liquid: { mat: 'liquid' (you see through it) or 'cream' (you do not),
// color, top: a second colour floating on it } · foam: a head on it (0 to 1) · bubbles: it fizzes · ice: cubes in it ·
// straw: a straw's colour · garnish: 'cherry', 'slice', 'umbrella' · glow: a light in it
export const DRINK_VESSELS = { tumbler: 'Tumbler', tall: 'Tall glass', mug: 'Mug', cup: 'Cup and saucer', goblet: 'Goblet', coupe: 'Coupe' };
export const DRINK_GARNISHES = { cherry: 'A cherry', slice: 'A slice of fruit', umbrella: 'A paper umbrella' };
const DRINK_LOOKS = {
  soda: { vessel: 'tall', bubbles: true, foam: 0.35, straw: '#ff5b6e' },
  water: { vessel: 'tumbler', ice: 3 },
  coffee: { vessel: 'tall', ice: 2, liquid: { top: '#e8d9c2' }, straw: '#2b2b33' },
  milk: { vessel: 'mug', mat: 'plastic', color: '#f3ead8', liquid: { mat: 'cream' }, foam: 0.2 },
  tea: { vessel: 'cup', mat: 'plastic', color: '#f6f1e6', rim: { mat: 'metal', color: '#d9b45a' }, garnish: 'slice' },
  juice: { vessel: 'goblet', garnish: 'slice', straw: '#3fb86b' },
  special: { vessel: 'coupe', garnish: 'umbrella', bubbles: true },
  royal: { vessel: 'goblet', rim: { mat: 'metal', color: '#e8c35a' }, bubbles: true, garnish: 'cherry' },
  diamond: { vessel: 'coupe', mat: 'diamond', glow: true },
};
export function drinkLook(d = {}) {
  const K = { ...(DRINK_LOOKS[d.id] || {}), ...(d.look || {}) }, color = d.color || '#ff86ea';
  return { vessel: DRINK_VESSELS[K.vessel] ? K.vessel : 'tumbler', mat: FINISHES[K.mat] || ['glass', 'diamond'].includes(K.mat) ? K.mat : 'glass', color: K.color || '#dff2ff', rim: K.rim || null,
    liquid: { mat: K.liquid?.mat === 'cream' ? 'cream' : 'liquid', color: K.liquid?.color || color, top: K.liquid?.top || null }, foam: +K.foam || 0, bubbles: !!K.bubbles, ice: K.ice | 0, straw: K.straw || null, garnish: DRINK_GARNISHES[K.garnish] ? K.garnish : null, glow: !!K.glow };
}
