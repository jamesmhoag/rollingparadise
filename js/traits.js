// Chip traits. The workbook's chip list gives every chip a set of traits (its columns); the engine adds more as it
// treats chips (they are "derived": nothing on the list names them yet). Both are shown in each chip's information
// and in the Library, so they can be compared and the redundant ones dropped.
import * as D from './data.js';
import { CHIP_LIST } from './chiplist.js';
import { t as tx } from './text.js';

export const TRAITS = {
  // ---- from the list's columns ----
  type: { name: 'Type', list: true, text: tx('traits.the-list-s-family') },
  payment: { name: 'Payment', list: true, text: tx('traits.what-the-chip-pays') },
  flip: { name: tx('traits.flip-value'), list: true, text: tx('traits.what-it-lands-as') },
  worth: { name: 'Worth', list: true, text: tx('traits.its-value-in-your') },
  movable: { name: 'Movable', list: true, text: tx('traits.whether-corrections-scatter-and') },
  playable: { name: 'Playable', list: true, text: tx('traits.whether-it-can-be') },
  state: { name: 'State', list: true, text: tx('traits.organic-inorganic-and-so') },
  association: { name: 'Association', list: true, text: tx('traits.an-element-or-group') },
  party: { name: 'Party', list: true, text: tx('traits.who-can-have-it') },
  permanence: { name: 'Permanence', list: true, text: tx('traits.resiliant-fragile-temporary-consuming') },
  pile: { name: 'Pile', list: true, text: tx('traits.whose-pile-it-sits') },
  placement: { name: 'Placement', list: true, text: tx('traits.where-it-can-go') },
  stack: { name: tx('traits.stack-amount'), list: true, text: tx('traits.how-much-stack-height') },
  source: { name: tx('traits.created-from'), list: true, text: tx('traits.what-makes-it-match') },
  // ---- derived: how the engine treats it ----
  pays: { name: tx('traits.pays-fees'), derived: true, text: tx('traits.debt-is-paid-with') },
  biddable: { name: 'Biddable', derived: true, text: tx('traits.it-can-be-bid') },
  flippable: { name: 'Flippable', derived: true, text: tx('traits.it-can-be-flipped') },
  deterrent: { name: 'Deterrent', derived: true, text: tx('traits.takes-1-of-a') },
  hits: { name: tx('traits.hit-instances'), derived: true, text: tx('traits.how-many-whole-fees') },
  height: { name: tx('traits.takes-height'), derived: true, text: tx('traits.whether-it-counts-toward') },
  overlay: { name: tx('traits.lies-over-the-stack'), derived: true, text: tx('traits.sits-over-the-stack') },
  timed: { name: 'Timed', derived: true, text: tx('traits.turns-left-before-it') },
  hazard: { name: 'Hazard', derived: true, text: tx('traits.works-against-the-stack') },
  element: { name: 'Element', derived: true, text: tx('traits.the-hazard-a-stack') },
  electric: { name: 'Electrical', derived: true, text: tx('traits.lightning-a-battery-under') },
  electronic: { name: 'Electronic', derived: true, text: tx('traits.powered-a-battery-under') },
  delicious: { name: 'Delicious', derived: true, text: tx('traits.it-can-be-eaten') },
  wet: { name: 'Wet', derived: true, text: tx('traits.watered-cannot-burn-passes') },
  flying: { name: 'Flying', derived: true, text: tx('traits.off-the-table-ground') },
  orbital: { name: 'Orbital', derived: true, text: tx('traits.in-the-sky-above') },
  spaces: { name: 'Spaces', derived: true, text: tx('traits.how-many-spaces-it') },
  fixed: { name: 'Fixed', derived: true, text: tx('traits.corrections-do-not-move') },
  disguised: { name: 'Disguised', derived: true, text: tx('traits.the-opponent-sees-a') },
  regen: { name: 'Regen', derived: true, text: tx('traits.paid-to-the-stage') },
  spawner: { name: 'Spawner', derived: true, text: tx('traits.it-makes-other-chips') },
  made: { name: tx('traits.made-by'), derived: true, text: tx('traits.the-trick-tilt-or') },
  phase: { name: tx('traits.works-in'), derived: true, text: tx('traits.the-phase-of-the') },
};

// list rows for chips that are not shop chips
const KIND_ROW = { block: tx('traits.block-chip'), counter: tx('traits.counter-chip'), resist: tx('traits.resist-chip'), opp: tx('traits.opportunity-1-chip'), debt: tx('traits.debt-1-chip'), burn: tx('traits.burning-1-chip'), corrupt: tx('traits.corrupting-1-chip'),
  shock: tx('traits.shocking-1-chip'), poison: tx('traits.poison-1-chip'), boom: tx('traits.boom-5-chip'), dynamite: tx('traits.dynamite-chip'), acid: tx('traits.acid-chip'), flower: tx('traits.flower-chip'), petal: tx('traits.petal-chip'), tree: tx('traits.tree-chip'), wood: tx('traits.wood-chip'),
  clay: tx('traits.clay-chip'), brick: tx('traits.brick-chip'), hard: tx('traits.hardened-p-chip'), sticky: tx('traits.sticky-f-chip'), hive: tx('traits.hive-chip'), little: tx('traits.little-chip'), egg: tx('traits.egg-chip'), hat: tx('traits.magic-hat-chip'), doom: tx('traits.doom-chip'), volcano: tx('traits.volcano-chip') };
const BY_NAME = new Map(CHIP_LIST.map((x) => [x.name.replace(/^Royal /, 'Royale ').toLowerCase(), x]).concat(CHIP_LIST.map((x) => [x.name.toLowerCase(), x])));
export function listRow(ch) {
  const X = ch.shop && D.SHOP_CHIPS[ch.shop];
  let name = X?.list || KIND_ROW[ch.kind];
  if (ch.kind === 'bounty') name = tx('traits.bounty-chip', { name: D.CREATURES[ch.creature]?.name });
  if (ch.kind === 'std' && !X) name = ch.cursed ? tx('traits.cursed-chip') : ch.treasure ? tx('traits.treasure-chip') : ch.frozen ? tx('traits.frozen-f-chip') : ch.gold ? tx('traits.golded-2-p-chip') : ch.feather > 0 ? tx('traits.feather-p-chip') : (D.denomOf(ch.value)?.list || tx('traits.royal-paradise-chip', { value: ch.value }));
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
  add(out, 'biddable', pay && !ch.gold && !(ch.frozen && o.cell?.puddle?.ice));
  add(out, 'flippable', ch.kind === 'std' && !ch.gold && !(ch.frozen && o.cell?.puddle?.ice));
  add(out, 'deterrent', ch.kind === 'block' || ch.kind === 'counter');
  add(out, 'hits', D.INSTANCE_SHIELDS.includes(ch.kind) ? ch.hits ?? 1 : null);
  add(out, 'height', OVER.includes(ch.kind) || ch.kind === 'little' ? 'No' : 'Yes');
  add(out, 'overlay', OVER.includes(ch.kind));
  add(out, 'timed', ch.life != null && ch.life < 50 ? tx('feed.line-2', { life: ch.life }) : ch.feather > 0 ? tx('traits.feather', { feather: ch.feather }) : null);
  add(out, 'hazard', ['burn', 'acid', 'shock', 'corrupt', 'poison', 'boom', 'frost', 'lava', 'doom', 'hat', 'cursed'].includes(ch.kind) || ch.cursed || ch.shop === 'uranium');
  add(out, 'element', X?.resist && D.resistsOf(ch.shop).join(', '));
  add(out, 'electric', ch.kind === 'shock' || ELECTRIC(ch.shop).includes('electric'));
  add(out, 'electronic', ELECTRIC(ch.shop).includes('electronic'));
  add(out, 'delicious', ch.kind === 'food' || ch.kind === 'egg');
  add(out, 'wet', ch.wet > 0 ? tx('traits.line', { wet: ch.wet }) : null);
  add(out, 'flying', o.cell ? o.cell.chips.some((x) => x.shop === 'heli') : ch.shop === 'heli');
  add(out, 'spaces', ch.big || ch.kind === 'volcano' ? 4 : null);
  add(out, 'fixed', ch.big || ['volcano', 'tree', 'dynamite'].includes(ch.kind) || ch.shop === 'anchor');
  add(out, 'disguised', ch.kind === 'doom' || ch.shop === 'spy' || ch.cursed ? (ch.cursed ? 'looks like Gold' : tx('traits.looks-like-a-1')) : null);
  add(out, 'regen', ch.regen > 0 ? tx('traits.line-2', { regen: ch.regen }) : null);
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
