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
export const WALLET_CLASPS = { none: 'No clasp', snap: 'Snap', zip: 'Zip', clip: 'Money clip', chain: 'Chain' };
export const JACKET_COLLARS = { lapel: 'Lapels', stand: 'Stand collar', crew: 'Crew neck', hood: 'Hood' };
// bounds for the numbers a look can set (kept to what the drawn shapes can show)
export const LOOK_BOUNDS = { buttons: [0, 4], flap: [8, 26], round: [2, 14], length: [0, 12], slots: [0, 8], keep: [2, 24], passes: [1, 6] };
const GUESS = [['leather', 'leather'], ['suede', 'suede'], ['velvet', 'velvet'], ['denim', 'denim'], ['silk', 'silk'], ['royal', 'silk'], ['cloth', 'canvas'], ['bomber', 'canvas'], ['tape', 'vinyl'], ['neon', 'vinyl'], ['rain', 'vinyl'],
  ['silver', 'metal'], ['magnetic', 'metal'], ['diamond', 'diamond'], ['down', 'silk'], ['sports', 'silk'], ['long', 'wool'], ['reading', 'wool'], ['standard', 'wool']];
const guessMat = (name, id) => (GUESS.find(([w]) => `${id} ${name}`.toLowerCase().includes(w)) || [0, 'canvas'])[1];
const clamp = (k, v, d) => { const [lo, hi] = LOOK_BOUNDS[k]; const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
// a look's emblem: a symbol, its colour and the material it is made of (none: drawn plain)
const emblem = (L) => (L.symbol?.id ? { id: L.symbol.id, color: L.symbol.color || '#ffffff', mat: FINISHES[L.symbol.mat] ? L.symbol.mat : '' } : null);
export function walletLook(id, W = {}) {
  const L = W.look || {}, nm = `${id} ${W.name || ''}`.toLowerCase();
  return { mat: FINISHES[L.mat] ? L.mat : guessMat(W.name, id), color: L.color || W.color || '#8d8478', trim: L.trim || '', glint: !!L.glint, sparkle: !!L.sparkle, stitch: L.stitch ?? /leather|cloth/.test(nm),
    clasp: WALLET_CLASPS[L.clasp] ? L.clasp : /zip/.test(nm) ? 'zip' : /snap/.test(nm) ? 'snap' : /clip/.test(nm) ? 'clip' : /chain/.test(nm) ? 'chain' : 'none',
    flap: clamp('flap', L.flap, 15), round: clamp('round', L.round, 6), symbol: emblem(L) };
}
export function jacketLook(id, J = {}) {
  const L = J.look || {}, nm = `${id} ${J.name || ''}`.toLowerCase();
  return { mat: FINISHES[L.mat] ? L.mat : guessMat(J.name, id), color: L.color || J.color || '#5b6378', lining: L.lining || '', glint: !!L.glint, sparkle: !!L.sparkle,
    collar: JACKET_COLLARS[L.collar] ? L.collar : /bomber|down/.test(nm) ? 'stand' : /rain/.test(nm) ? 'hood' : /sports/.test(nm) ? 'crew' : 'lapel',
    buttons: clamp('buttons', L.buttons, /long|reading/.test(nm) ? 3 : /leather|bomber|rain|down|sports/.test(nm) ? 0 : 2), length: clamp('length', L.length, /long/.test(nm) ? 10 : 0),
    symbol: emblem(L) };
}
// a new wallet or jacket from the Gear maker starts as this
export const NEW_WALLET = { name: 'New Wallet', color: '#7a4b2a', slots: 2, keep: 8, passes: 1, price: 1000, level: 0, look: { mat: 'leather', clasp: 'snap', stitch: true } };
export const NEW_JACKET = { name: 'New Jacket', color: '#5b6378', effect: 'New · Untested', mods: {}, price: 200, level: 0, look: { mat: 'wool', collar: 'lapel', buttons: 2 } };
