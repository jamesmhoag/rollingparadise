// Chip traits. The workbook's chip list gives every chip a set of traits (its columns); the engine adds more as it
// treats chips (they are "derived": nothing on the list names them yet). Both are shown in each chip's information
// and in the Library, so they can be compared and the redundant ones dropped.
import * as D from './data.js';
import { CHIP_LIST } from './chiplist.js';

export const TRAITS = {
  // ---- from the list's columns ----
  type: { name: 'Type', list: true, text: 'The list\'s family: Basic, Defense, Hazard, Utility, Creature, Consumable…' },
  payment: { name: 'Payment', list: true, text: 'What the chip pays toward a fee.' },
  flip: { name: 'Flip value', list: true, text: 'What it lands as when flipped into a roll (0 or its worth).' },
  worth: { name: 'Worth', list: true, text: 'Its value in your position.' },
  movable: { name: 'Movable', list: true, text: 'Whether Corrections, Scatter and the like can move it.' },
  playable: { name: 'Playable', list: true, text: 'Whether it can be bid on a trick.' },
  state: { name: 'State', list: true, text: 'Organic, Inorganic and so on.' },
  association: { name: 'Association', list: true, text: 'An element or group it belongs to.' },
  party: { name: 'Party', list: true, text: 'Who can have it: All, a class…' },
  permanence: { name: 'Permanence', list: true, text: 'Resiliant, Fragile, Temporary, Consuming…' },
  pile: { name: 'Pile', list: true, text: 'Whose pile it sits in: the Roller\'s, the opponent\'s or both.' },
  placement: { name: 'Placement', list: true, text: 'Where it can go: Versatile, an Empty Space, a Targeted Stack…' },
  stack: { name: 'Stack amount', list: true, text: 'How much stack height it takes.' },
  source: { name: 'Created from', list: true, text: 'What makes it: Match Prep, a Chip Conversion, Spawned…' },
  // ---- derived: how the engine treats it ----
  pays: { name: 'Pays fees', derived: true, text: 'Debt is paid with it, whole chips only. (Overlaps the list\'s Payment.)' },
  biddable: { name: 'Biddable', derived: true, text: 'It can be bid from the top of a stack. (Overlaps the list\'s Playable.)' },
  flippable: { name: 'Flippable', derived: true, text: 'It can be flipped into a roll. (Overlaps the list\'s Flip value.)' },
  deterrent: { name: 'Deterrent', derived: true, text: 'Takes 1¢ of a fee and breaks (fee cost defence).' },
  hits: { name: 'Hit instances', derived: true, text: 'How many whole fees it takes, whatever their size (fee instance defence).' },
  height: { name: 'Takes height', derived: true, text: 'Whether it counts toward the stack\'s height. (Overlaps the list\'s Stack amount.)' },
  overlay: { name: 'Lies over the stack', derived: true, text: 'Sits over the stack instead of in it: no height, stays on top, cleansed like a hazard.' },
  timed: { name: 'Timed', derived: true, text: 'Turns left before it fades or settles. (Overlaps the list\'s Permanence: Temporary.)' },
  hazard: { name: 'Hazard', derived: true, text: 'Works against the stack it is on each turn. (Overlaps the list\'s Type.)' },
  element: { name: 'Element', derived: true, text: 'The hazard a stack holding it is immune to. (Overlaps the list\'s Association.)' },
  electric: { name: 'Electrical', derived: true, text: 'Lightning: a Battery under it adds instances; Tesla and Absorption chips catch it.' },
  electronic: { name: 'Electronic', derived: true, text: 'Powered: a Battery under it adds instances.' },
  delicious: { name: 'Delicious', derived: true, text: 'It can be eaten from the top of a stack in the Drink phase.' },
  wet: { name: 'Wet', derived: true, text: 'Watered: cannot burn, passes electricity on, freezes in the cold, grows plants faster.' },
  flying: { name: 'Flying', derived: true, text: 'Off the table: ground effects (Tornado, holes, puddles) do not reach it.' },
  orbital: { name: 'Orbital', derived: true, text: 'In the sky above the flying layer: weather and vehicles.' },
  spaces: { name: 'Spaces', derived: true, text: 'How many spaces it covers (Big chips and Volcanoes cover four).' },
  fixed: { name: 'Fixed', derived: true, text: 'Corrections do not move it. (Overlaps the list\'s Movable.)' },
  disguised: { name: 'Disguised', derived: true, text: 'The opponent sees a different chip.' },
  regen: { name: 'Regen', derived: true, text: 'Paid to the Stage, it comes straight back (once).' },
  spawner: { name: 'Spawner', derived: true, text: 'It makes other chips or creatures.' },
  made: { name: 'Made by', derived: true, text: 'The trick, tilt or creature that puts it on the table. Chips made at the table are not sold.' },
  phase: { name: 'Works in', derived: true, text: 'The phase of the turn it does its work in.' },
};

// list rows for chips that are not shop chips
const KIND_ROW = { block: 'Block Chip', counter: 'Counter Chip', resist: 'Resist Chip', opp: 'Opportunity 1¢ Chip', debt: 'Debt -1¢ Chip', burn: 'Burning -1¢ Chip', corrupt: 'Corrupting -1¢ Chip',
  shock: 'Shocking -1¢ Chip', poison: 'Poison -1¢  Chip', boom: 'Boom -5¢ Chip', dynamite: 'Dynamite Chip', acid: 'Acid Chip', flower: 'Flower Chip', petal: 'Petal Chip', tree: 'Tree Chip', wood: 'Wood Chip',
  clay: 'Clay Chip', brick: 'Brick Chip', hard: 'Hardened p¢ Chip', sticky: 'Sticky f¢ Chip', hive: 'Hive Chip', little: 'Little Chip', egg: 'Egg Chip', hat: 'Magic Hat Chip', doom: 'Doom Chip', volcano: 'Volcano Chip' };
const BY_NAME = new Map(CHIP_LIST.map((x) => [x.name.replace(/^Royal /, 'Royale ').toLowerCase(), x]).concat(CHIP_LIST.map((x) => [x.name.toLowerCase(), x])));
export function listRow(ch) {
  const X = ch.shop && D.SHOP_CHIPS[ch.shop];
  let name = X?.list || KIND_ROW[ch.kind];
  if (ch.kind === 'bounty') name = `${D.CREATURES[ch.creature]?.name} Bounty Chip`;
  if (ch.kind === 'std' && !X) name = ch.cursed ? 'Cursed Chip' : ch.treasure ? 'Treasure Chip' : ch.frozen ? 'Frozen f¢ Chip' : ch.gold ? 'Golded 2*p¢ Chip' : ch.feather > 0 ? 'Feather p¢ Chip' : (D.denomOf(ch.value)?.list || `Royal Paradise ${ch.value}¢ chip`);
  return name ? BY_NAME.get(name.toLowerCase()) || null : null;
}
const ELECTRIC = (id) => D.SHOP_CHIPS[id]?.tags || [];
// when each effect chip does its work
const PHASE_OF = { power: 'Investment', control: 'Investment', lucky: 'Investment', mimic: 'every phase', boosted: 'your roll', cheapened: 'their roll', upgrade: 'your roll', harmony: 'Correction', reducer: 'a fee landing', ward: 'the settle', rebound: 'a fee landing', zap: 'a fee landing', anchor: 'any move', transpara: 'their aim', shadow: 'their aim', nest: 'a win' };
const OVER = ['debt', 'burn', 'acid', 'shock', 'corrupt', 'poison', 'boom', 'frost', 'lava', 'stray', 'hard', 'sticky'];
const add = (out, k, v) => { if (v === undefined || v === null || v === false || v === '') return; out.push({ k, v: v === true ? 'Yes' : String(v), ...TRAITS[k] }); };
// every trait a chip has, list ones first. o.cell: the stack it is in (for Wet), o.foe: seen by the opponent
export function traitsOf(ch, o = {}) {
  const out = [], row = listRow(ch);
  if (row?.list) for (const [k, v] of Object.entries(row.list)) add(out, k, v);
  const pay = ch.kind === 'std' || ch.kind === 'opp' || ch.kind === 'bounty', X = ch.shop && D.SHOP_CHIPS[ch.shop];
  if (X?.from || ch.kind === 'fx') add(out, 'made', ch.maker ? D.TRICKS[ch.maker]?.name : D.madeBy(ch.shop));
  if (X && PHASE_OF[ch.shop]) add(out, 'phase', PHASE_OF[ch.shop]);
  add(out, 'pays', pay ? `${ch.value}¢` : 'No');
  add(out, 'biddable', pay && !ch.gold && !ch.frozen);
  add(out, 'flippable', ch.kind === 'std' && !ch.gold && !ch.frozen);
  add(out, 'deterrent', ch.kind === 'block' || ch.kind === 'counter');
  add(out, 'hits', D.INSTANCE_SHIELDS.includes(ch.kind) ? ch.hits ?? 1 : null);
  add(out, 'height', OVER.includes(ch.kind) || ch.kind === 'little' ? 'No' : 'Yes');
  add(out, 'overlay', OVER.includes(ch.kind));
  add(out, 'timed', ch.life != null && ch.life < 50 ? `${ch.life} turn${ch.life === 1 ? '' : 's'}` : ch.feather > 0 ? `${ch.feather} turn${ch.feather === 1 ? '' : 's'} (Feather)` : null);
  add(out, 'hazard', ['burn', 'acid', 'shock', 'corrupt', 'poison', 'boom', 'frost', 'lava', 'doom', 'hat', 'cursed'].includes(ch.kind) || ch.cursed || ch.shop === 'uranium');
  add(out, 'element', X?.resist && D.resistsOf(ch.shop).join(', '));
  add(out, 'electric', ch.kind === 'shock' || ELECTRIC(ch.shop).includes('electric'));
  add(out, 'electronic', ELECTRIC(ch.shop).includes('electronic'));
  add(out, 'delicious', ch.kind === 'food' || ch.kind === 'egg');
  add(out, 'wet', ch.wet > 0 ? `${ch.wet} turn${ch.wet === 1 ? '' : 's'}` : null);
  add(out, 'flying', o.cell ? o.cell.chips.some((x) => x.shop === 'heli') : ch.shop === 'heli');
  add(out, 'spaces', ch.big || ch.kind === 'volcano' ? 4 : null);
  add(out, 'fixed', ch.big || ['volcano', 'tree', 'dynamite'].includes(ch.kind) || ch.shop === 'anchor');
  add(out, 'disguised', ch.kind === 'doom' || ch.shop === 'spy' || ch.cursed ? (ch.cursed ? 'looks like Gold' : 'looks like a 1¢ chip') : null);
  add(out, 'regen', ch.regen > 0 ? `${ch.regen} turn${ch.regen === 1 ? '' : 's'}` : null);
  add(out, 'spawner', ch.kind === 'hive' || ch.kind === 'tree' || ch.kind === 'flower' || ch.kind === 'egg');
  return out;
}
// traits of creatures and orbital chips
export function flyerTraits(kind, sky) {
  const out = [];
  if (sky) { const O = D.ORBITALS[kind]; add(out, 'orbital', true); add(out, 'spaces', O.size === 'table' ? 'the whole table' : O.size); return out; }
  const C = D.CREATURES[kind]; add(out, 'flying', C.layer === 'flying'); add(out, 'hits', C.hits || 'cannot be damaged'); if (C.bounty) add(out, 'pays', `${C.bounty}¢ Bounty`); add(out, 'timed', `${C.life} turn${C.life === 1 ? '' : 's'}`);
  return out;
}
// a chip's traits as properties: key and value, two columns, only in verbose hovers (o.always: the Library)
export const traitsHtml = (list, o = {}) => (list.length ? `<dl class="props${o.always ? '' : ' v'}">${o.title ? `<dt class="head">${o.title}</dt>` : ''}${list.map((t) => `<div class="${t.derived ? 'der' : 'lst'}" title="${t.text}"><dt>${t.name}</dt><dd>${t.v}</dd></div>`).join('')}</dl>` : '');
