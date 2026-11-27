// Small visual pieces and the tooltip text used across screens.
import { h } from './core.js';
import * as D from '../data.js';
import * as CM from '../content/chipmaker.js';
import { cents, cap } from '../util.js';
import { multOf } from '../bout.js';
import { facesOf, faceValue, matOf, dieName, petName } from '../dice.js';
import { traitsOf, traitsHtml } from '../traits.js';
import { iconStyle, textureOf } from './icons.js';
import { trickCardHtml, printCls, qMarkHtml } from './trickcard.js';
import { SYMBOLS as SYM, symbolOf } from './symbols.js';
import { finishOn, finishSvg } from './finish.js';
import { walletLook, jacketLook } from '../content/finishes.js';
import { t as tx } from '../text.js';

const GLYPH = { puddle: '💧', opp: '★', block: '▣', counter: '✸', burn: '🔥', acid: '☣', shock: '⚡', corrupt: '☠', poison: '☘', boom: '💣', frost: '❄', lava: '🌋', flower: '✿', petal: '❀', clay: '▤', brick: '▦', dynamite: '🧨', tree: '🌳', wood: '▥', hard: '⛊', sticky: '◍', hive: '⬢', little: '•', egg: '🥚', hat: '🎩', doom: '☠', volcano: '🌋' };
// made chips take their face colour from their MADE_CHIPS entry, through one shared style sheet
let madeCss = '';
function madeColours() {
  const css = Object.entries(D.MADE_CHIPS).map(([id, M]) => `.chip.mc-${id}{--c:${M.color || '#7df3ff'};--rim:#fff}`).join('');
  if (css === madeCss || typeof document === 'undefined') return; madeCss = css;
  let el = document.getElementById('made-chips'); if (!el) { el = document.createElement('style'); el.id = 'made-chips'; document.head.append(el); } el.textContent = css;
}
export const chipSig = (ch) => `${ch.kind === 'made' ? (madeColours(), `mc-${ch.model} `) : ''}${ch.kind === 'fx' ? 'k-fx k-std' : 'k-' + ch.kind} v${ch.value}${ch.gold ? ' gold' : ''}${ch.frozen ? ' frozen' : ''}${ch.feather > 0 ? ' feather' : ''}${ch.resist ? ' r-' + ch.resist : ''}${ch.wet > 0 ? ' wet' : ''}${ch.regen > 0 ? ' regen' : ''}${ch.big ? ' big' : ''}${ch.treasure ? ' treasure' : ''}`;
// how a chip looks to the Roller on side `viewer`: Doom chips look like 1¢ chips to their victim, a Spy to its
// owner's opponent, a Cursed chip like Gold to everyone
export function seenAs(ch, side, viewer = 0) {
  if (ch.kind === 'doom' && ch.owner !== viewer && side === viewer) return { id: ch.id, kind: 'std', value: 1 };
  if (ch.shop === 'spy' && side !== viewer) return { id: ch.id, kind: 'std', value: 1 };
  if (ch.cursed) return { id: ch.id, kind: 'std', value: ch.value, gold: true };
  return ch;
}
export const chipGlyph = (ch) => (ch.kind === 'made' ? (ch.value ? String(ch.value) : (D.MADE_CHIPS[ch.model]?.name || '?')[0]) : ch.kind === 'fx' ? D.SHOP_CHIPS[ch.shop]?.glyph || '✦' : ch.kind === 'stray' ? '−' + ch.value : ch.kind === 'sticky' ? '◍' + ch.value : ch.kind === 'egg' ? '🥚' : ch.treasure ? '💰' : ch.big ? String(ch.value) : ch.kind === 'bounty' ? D.CREATURES[ch.creature]?.glyph || '★' : ch.kind === 'resist' ? `r${ch.r}` : ['food', 'dip'].includes(ch.kind) && ch.shop ? D.SHOP_CHIPS[ch.shop]?.glyph || '🍪' : ch.kind === 'std' ? (ch.resist ? (D.SHOP_CHIPS[ch.resist]?.seq ? `${D.SHOP_CHIPS[ch.resist].glyph}${ch.value}` : D.SHOP_CHIPS[ch.resist]?.glyph || '◆') : ch.frozen ? `❄${ch.value}` : D.denomOf(ch.value)?.glyph || String(ch.value)) : ch.kind === 'debt' ? '−' + ch.value : GLYPH[ch.kind] || '');
export function chipName(ch) {
  if (ch.kind === 'made') return `${D.MADE_CHIPS[ch.model]?.name || tx('parts.made-chip')}${ch.value ? ` (${ch.value}¢)` : ''}`;
  if (ch.kind === 'debt') return tx('parts.debt-chip', { value: ch.value });
  if (ch.kind === 'stray') return tx('parts.of-debt-on-nothing', { value: ch.value });
  if (ch.kind === 'hard') return tx('parts.hardened-chip', { life: ch.life });
  if (ch.kind === 'sticky') return tx('parts.sticky-chip', { value: ch.value, v: ch.stuck ? ` on ${ch.stuck}` : '' });
  if (ch.kind === 'puddle') return ch.ice ? tx('parts.iced-over-puddle-chip') : tx('parts.puddle-chip');
  if (ch.kind === 'egg') return tx('parts.dragon-egg', { v: ch.prog ? tx('parts.of-5-to-hatch', { prog: ch.prog }) : '' });
  if (ch.treasure) return tx('parts.treasure-chip-gold', { value: ch.value });
  if (ch.big) return tx('parts.big-chip', { value: ch.value });
  if (ch.kind === 'bounty') return tx('parts.bounty-chip', { name: D.CREATURES[ch.creature]?.name, value: ch.value });
  if (ch.kind === 'resist') return tx('parts.resist-chip-r', { r: ch.r });
  if ((ch.kind === 'food' || ch.kind === 'dip') && ch.shop) return D.SHOP_CHIPS[ch.shop]?.name || tx('parts.food-chip');
  if (ch.kind === 'fx') return `${D.SHOP_CHIPS[ch.shop]?.name || tx('parts.effect-chip')}${ch.amt ? ` ${ch.amt}¢` : ''}${ch.life != null && ch.life < 99 ? tx('parts.line', { life: ch.life }) : ''}`;
  if (ch.kind !== 'std') return D.CHIPS[ch.kind].name;
  if (ch.resist) return D.SHOP_CHIPS[ch.resist]?.name || tx('parts.shop-chip');
  if (ch.frozen) return tx('parts.frozen-chip', { value: ch.value });
  return `${ch.gold ? 'Gold ' : ''}${D.denomOf(ch.value)?.name ? tx('parts.chip', { name: D.denomOf(ch.value).name, toLocaleString: ch.value.toLocaleString('en-US') }) : tx('parts.royal-paradise-chip', { value: ch.value })}${ch.feather > 0 ? ' (Feathered)' : ''}`;
}
export function chipText(ch) {
  if (ch.kind === 'made') { const M = D.MADE_CHIPS[ch.model] || {};
    return `${M.text || tx('parts.a-chip-made-in')} <span class="dim keep">${madeRules(M, ch)}</span>`; }
  const hits = ch.hits != null && ch.kind !== 'std' ? tx('parts.left-in-it', { hits: ch.hits }) : '';
  if (ch.kind === 'bounty') return D.CHIPS.bounty.text;
  if (ch.kind === 'stray') return tx('parts.a-fee-that-landed', { v: ch.why || 'empty space' });
  const extra = `${ch.wet > 0 ? tx('parts.wet-for', { wet: ch.wet }) : ''}${ch.regen > 0 ? tx('parts.regen-for-paid-to', { regen: ch.regen }) : ''}`;
  if (ch.treasure) return D.CHIPS.treasure.text + extra;
  if (ch.big) return D.shopText('big') + tx('parts.worth', { value: ch.value }) + extra;
  if (ch.kind === 'egg') return D.CHIPS.egg.text + hits + extra;
  if (ch.kind === 'resist') return tx('parts.fees-under-on-this', { text: D.CHIPS.resist.text, r: ch.r });
  if ((ch.kind === 'food' || ch.kind === 'dip') && ch.shop) return D.shopText(ch.shop) + (ch.dips != null ? tx('parts.left', { dips: ch.dips }) : '');
  if (ch.kind === 'fx') return tx('parts.an-effect-chip-no', { shopText: D.shopText(ch.shop), v: ch.maker ? tx('parts.made-at-the-table', { v: D.TRICKS[ch.maker]?.name || 'a trick', v2: ch.life >= 99 ? tx('parts.it-lasts-the-bout') : tx('parts.left-2', { life: ch.life }) }) : ch.amt ? tx('parts.it-carries', { amt: ch.amt }) : ch.resist === 'power' ? tx('parts.added-power-draws-left') : '' });
  if (ch.kind !== 'std') return D.CHIPS[ch.kind].text + hits + extra + (ch.shop && D.SHOP_CHIPS[ch.shop] ? tx('parts.shop-chip-2', { name: D.CHIP_TIERS[D.SHOP_CHIPS[ch.shop].tier].name }) : '');
  if (ch.resist) { const X = D.SHOP_CHIPS[ch.resist]; if (!X) return tx('parts.worth-1');
    return tx('parts.worth-not-wagered-tier', { shopText: D.shopText(ch.resist), v: X.seq ? ch.value : 1, v2: ch.n > 1 ? tx('parts.merged-from', { n: ch.n }) : '', v3: X.place === 'top' ? 'goes on top of a stack' : 'deployed at the base of your stacks', v4: ch.life != null ? tx('parts.left-3', { life: ch.life }) : '', name: D.CHIP_TIERS[X.tier].name, extra }); }
  if (ch.frozen) return D.CHIPS.frozen.text;
  const feather = ch.feather > 0 ? tx('parts.feathered-for-more', { feather: ch.feather, replace: D.CHIPS.feather.text.replace(/^A chip turned light for a few turns: /, '') }) : '';
  if (ch.gold) return tx('parts.gold-cannot-be-bid', { value: ch.value * 2, feather });
  return extra + (ch.value === 1 ? tx('parts.basic-value-chip-bid') : tx('parts.basic-value-chip-a', { value: ch.value })) + feather;
}
// a made chip's rules, in a sentence
export function madeRules(M, ch = {}) {
  const parts = [tx('parts.worth-2', { v: ch.value ?? M.value ?? 0 })];
  const lasts = { paid: 'stays until a fee takes it', match: 'lasts the whole match: hits and fees cannot remove it', turn: 'gone at the end of the turn', turns: `lasts ${ch.life ?? M.turns ?? 3} more turn${(ch.life ?? M.turns) === 1 ? '' : 's'}`, hits: `takes ${ch.hits ?? M.hits} more whole fee${(ch.hits ?? M.hits) === 1 ? '' : 's'}` }[M.lasts];
  if (lasts) parts.push(lasts);
  if (M.height && M.height !== 'basic') parts.push(`${M.height} (${{ tiny: 'no height', short: 'half height', tall: 'double height' }[M.height]})`);
  if (M.must && M.must !== 'any') parts.push(`must sit ${{ top: 'on top', bottom: 'at the bottom', sandwiched: 'between chips', alone: 'alone', with: 'with others' }[M.must]}`);
  if (M.onTop === 'none') parts.push('nothing can go on it');
  if (M.immune?.length) parts.push(`immune to ${M.immune.map((k) => (CM.IMMUNE[k] || k).toLowerCase()).join(', ')}`);
  if (M.move && M.move !== 'still') parts.push(CM.MOVES[M.move].toLowerCase());
  if (M.triggers?.length && M.actions?.length) {
    const when = M.triggers.map((x) => (x.on === 'phase' || x.on === 'effect') && x.type ? `${CM.TRIGGERS[x.on].toLowerCase()} (${D.TYPES[x.type]?.name})` : x.on === 'exposed' && x.what ? `when a ${x.what} is exposed` : CM.TRIGGERS[x.on].toLowerCase()).join(' or ');
    const what = M.actions.map((x) => ({ move: `moves them ${x.dir || 'right'}`, value: `${(x.n ?? 1) >= 0 ? '+' : ''}${x.n ?? 1}¢ value`, hits: tx('parts.strength', { v: (x.n ?? 1) >= 0 ? '+' : '', v2: x.n ?? 1 }), power: tx('parts.effect', { v: (x.n ?? 1) >= 0 ? '+' : '', v2: x.n ?? 1 }), become: `turns them into ${D.MADE_CHIPS[x.chip]?.name || D.CHIPS[x.chip]?.name || tx('library.royal-paradise-chips')}`, pull: tx('parts.pulls-up-to-of', { v: x.n ?? 5, v2: x.from === 'theirs' ? 'the other' : x.from === 'both' ? 'either' : 'its own', v3: x.bids ? tx('parts.bids-too') : '' }) }[x.k])).join(', ');
    parts.push(tx('parts.on', { when, what, toLowerCase: (CM.REACH[M.reach?.to || 'touching'] || '').toLowerCase(), v: M.reach?.to === 'named' ? ` "${M.reach.name}"` : '', v2: (M.reach?.range || 1) > 1 ? ` within ${M.reach.range}` : '' }));
  }
  return parts.join(' · ') + '.';
}
// an effect chip whose icon has a file shows the file over its glyph (js/content/assets.js)
const chipIcon = (ch) => (ch.kind === 'fx' || ch.shop ? iconStyle('chip:' + (ch.shop || ch.kind)) : {});
export const chipEl = (ch, cls = '') => { const st = chipIcon(ch); return h('span', { class: `chip static ${chipSig(ch)} ${cls}` }, h('i', { text: chipGlyph(ch), class: st['--ico'] ? 'has-ico' : null, style: st })); };
// The chip a trick makes, or that stands for what it does, to illustrate it on its card: the effect chip a maker
// places, the hazard an element fee leaves, Debt for a plain fee, and so on, worked out from the trick's own rules.
const CHIP_FOR = { block: { kind: 'block', value: 1 }, fence: { kind: 'counter', value: 1 }, harden: { kind: 'hard' }, sticky: { kind: 'sticky' }, hat: { kind: 'hat' },
  gild: { kind: 'std', value: 5, gold: true }, gather: { kind: 'std', value: 5 }, scatter: { kind: 'std', value: 1 }, settle: { kind: 'counter', value: 1 }, sweep: { kind: 'block', value: 1 },
  doom: { kind: 'dynamite' }, freeze: { kind: 'frost' }, boost: { kind: 'fx', shop: 'power', resist: 'power' }, press: { kind: 'fx', shop: 'power', resist: 'power' }, enfeeble: { kind: 'fx', shop: 'control', resist: 'control' } };
export function trickChip(def) {
  if (def.make?.chip && D.SHOP_CHIPS[def.make.chip]) return { kind: 'fx', shop: def.make.chip, resist: def.make.chip };
  if (def.roll.k === 'chips' && def.roll.chip) return D.MADE_CHIPS[def.roll.chip] ? { kind: 'made', model: def.roll.chip, value: D.MADE_CHIPS[def.roll.chip].value || 0 } : { kind: def.roll.chip, value: 1 };
  if (def.roll.k === 'fee') return def.element ? { kind: def.element } : def.plant ? { kind: def.plant } : { kind: 'debt', value: def.count };
  return CHIP_FOR[def.roll.k] || null;
}
// a line of flavour for a hover (content/flavor.js), or nothing
const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;');
export const flavorP = (table, id) => { const f = D.flavorOf(table, id); return f ? `<p class="flavor">${esc(f)}</p>` : ''; };
// where a chip's flavour lives: its shop chip, its kind, or nothing for a made chip (its maker writes its text)
const chipFlavor = (ch) => (ch.kind === 'made' ? '' : ch.shop && D.flavorOf('SHOP_CHIPS', ch.shop) ? flavorP('SHOP_CHIPS', ch.shop) : ch.resist && D.flavorOf('SHOP_CHIPS', ch.resist) ? flavorP('SHOP_CHIPS', ch.resist) : flavorP('CHIPS', ch.kind));
export const chipTip = (ch, o = {}) => `<b>${chipName(ch)}</b><p>${chipText(ch)}</p>${chipFlavor(ch)}${traitsHtml(traitsOf(ch, o))}`;
export { traitsOf, traitsHtml };

// a die's faces as small numbers, with special faces marked
export function faceStrip(d) {
  return facesOf(d).map((f) => { const v = faceValue(f), tag = f.rig ? '×' : f.ench ? '✧' : f.enc != null ? '▣' : f.w > 1 ? '!' : f.x > 1 ? '×' : '';
    return `<span class="face${tag ? ' sp' : ''}">${v}${tag ? `<sup>${tag}</sup>` : ''}</span>`; }).join('');
}
export function dieTip(d, extra = '') {
  const ups = (d.up || []).map((u, k) => `<li><b style="color:${D.DIE_UPGRADES[u].color}">${D.DIE_UPGRADES[u].mark} ${D.DIE_UPGRADES[u].name}</b>${d.tgt?.[k] != null ? tx('parts.face', { tgt: d.tgt[k] + 1 }) : ''}<span class="v"> — ${D.upgradeText(u)}</span></li>`).join('');
  const M = D.MATERIALS[matOf(d)], B = d.bone && D.BONE[d.bone];
  const pet = petName(d), head = pet ? `<b class="pet">“${esc(pet)}”</b> <span class="dim">${dieName(d)}</span>` : `<b>${dieName(d)}</b>`; // its pet name, if you gave it one
  return `${head} <span class="faces">${faceStrip(d)}</span>${B ? tx('parts.carved-with', { name: B.name, name2: D.DIE_UPGRADES[B.up].name, upgradeText: D.upgradeText(B.up) }) : ups ? `<ul>${ups}</ul>` : ''}${d.cast ? tx('parts.cast-by-the-diesmith', { name: D.CASTS[d.cast].name, v: (d.dyes || []).length ? ` with ${d.dyes.map((k) => D.DYES[k].name).join(', ')}` : '' }) : ''}<p class="dim v">${M.text}</p>${extra ? `<p>${extra}</p>` : ''}${flavorP('MATERIALS', matOf(d))}`;
}
// one badge per upgrade, so every upgrade a die carries can be read off the die itself
export const dieMarks = (d) => ((d.up || []).length ? h('span', { class: 'ups' }, d.up.map((u) => h('b', { class: `u-${u}`, style: { '--uc': D.DIE_UPGRADES[u].color }, text: D.DIE_UPGRADES[u].mark }))) : null);
// the dyes a cast die was made with, as small drops of each colour on its lower left
export const dieDyes = (d) => ((d.dyes || []).length ? h('span', { class: 'dyes' }, d.dyes.map((k) => h('b', { style: { '--yc': D.DYES[k]?.color || '#fff' } }))) : null);
export const dieClass = (d) => `m-${matOf(d)} ${(d.up || []).length ? 'upg' : ''} ${(d.up || []).map((u) => 'u-' + u).join(' ')}`;
// A die's look comes from its material (MATERIALS in content/dice.js): the material's colour, set here from the
// table, and its finish (css .m-*). Its shape alone tells its size. `_die` lets any die be grabbed and spun (spin.js).
export const dieStyle = (d) => ({ '--dc': D.MATERIALS[matOf(d)]?.color || '#e8e2d4' });
// the die's picture is rendered in 3D (dice3d.js) once the renderer is up; the CSS die shows until then
export const dress3d = (el, d, value) => { if (typeof document !== 'undefined' && !d.chip) import('./dice3d.js').then((m) => m.dress(el, d, value)).catch(() => {}); };
export const dieEl = (d, value, cls = '') => { const el = h('span', { class: `die static ${d.type} ${dieClass(d)} ${cls}`, style: dieStyle(d) }, h('i', { text: value ?? d.type.slice(1) }), dieMarks(d), dieDyes(d)); el._die = d; dress3d(el, d, value); return el; };

// what a Misprint or a Reprint plays differently (always shown: it changes the rules)
// a trick's quality and print as classes on whatever shows it (trickcard.js draws them)
export const trickLook = (t) => printCls(t);
// the words for a trick's quality and print: its numeral, then the print if it is rare ("III Foil", "II Misprint")
const rareWord = (t) => (D.rarityName(t) ? `<span class="rw ${printCls(t)}">${D.rarityName(t)}</span>` : '');
export const trickWords = (t) => `${D.QROMAN[t.q]}${D.rarityName(t) ? ' ' + rareWord(t) : ''}`;
// where room is short: the numeral with the print's mark
export const trickWord = (t) => qMarkHtml(t);
// a trick's hover is its full card
export const trickTip = (t, viewerCls, live) => trickCardHtml(t, viewerCls, live);
export function statTip(k, v) {
  const S = D.STATS[k];
  return `<b>${S.name}${v != null ? ' ' + v : ''}</b> <span class="dim">${S.short}</span><p>${S.text}</p>${S.per ? tx('parts.each-point', { per: S.per(1) }) : ''}`;
}
// What a change to an attribute does, said plainly. `cur`: the value now, if known.
export function statChange(k, n, cur) {
  const S = D.STATS[k]; if (!S) return '';
  const t = S.per(Math.abs(n)), what = n > 0 ? t : t.replace(/\bmore\b/, 'fewer');
  return tx('parts.you', { v: n > 0 ? '+' : '', n, name: S.name, v2: cur != null ? ` <span class="dim">${cur} → ${cur + n}</span>` : '', what });
}
const changes = (mods, v) => `<ul>${Object.entries(mods || {}).map(([k, n]) => statChange(k, n, v?.[k])).join('')}</ul>`;
export function statRow(v, keys) {
  return h('div', { class: 'stats' }, keys.map((k) => h('span', { class: 'stat', tip: () => statTip(k, v[k]) }, h('em', { text: D.STATS[k].name }), h('b', { text: v[k] }))));
}
export const money = (n) => cents(n);
export function drinkTip(d) {
  const mods = Object.entries(d.mods).map(([k, n]) => `+${n} ${D.STATS[k].name}`).join(', ');
  return tx('parts.for-one-turn-per', { name: d.name, verb: d.verb, mods, sips: d.sips, v: d.max ? ' left' : '' }) + flavorP('DRINKS', d.id);
}
// v: your current attributes (rollerStats(run).v), so a +1 can say what it changes
// a card's rule: written from its numbers where it has them (a Resist Card's r), else its text
const SHOP_ROOM = { diesmith: 'smith', trader: 'trader', lounge: 'lounge', dice: 'dice', exchange: 'exchange' };
export const shopName = (shop) => tx(`tuner.rooms.${SHOP_ROOM[shop] || shop}`);
// what a punch card's free item is, in words: the next anything, or the item it names (a drink, a chip, a die size, a trick)
const freeName = (c) => { const f = c.free; if (!f || f === 'any') return tx('card.free.any'); const dr = D.DRINKS.find((d) => d.id === f);
  return dr?.name || D.SHOP_CHIPS[f]?.name || D.TRICKS[f]?.name || (D.DICE[f] ? tx('card.free.die', { type: f }) : f); };
// a card's rule, written from its numbers (content/cards.js), so the words always match what it does
export const cardRule = (id) => { const c = D.CARDS[id]; if (!c) return '';
  const shop = c.shop ? shopName(c.shop) : '';
  switch (c.kind) {
    case 'discount': return tx('card.rule.discount', { pct: c.pct || 0, shop });
    case 'punch': return tx(c.per === 'visit' ? 'card.rule.punch.visit' : 'card.rule.punch', { n: c.punches || 5, shop, free: freeName(c) });
    case 'membership': return [c.early ? tx('card.rule.member.early', { n: c.early, shop }) : tx('card.rule.member', { shop }), tx('card.rule.member.only', { shop }), c.pct ? tx('card.rule.member.pct', { pct: c.pct }) : '', c.earn?.buys ? tx('card.rule.member.earn', { n: c.earn.buys, shop }) : ''].filter(Boolean).join(' ');
    case 'key': return tx('card.rule.key', { floor: D.FLOORS[c.floor]?.name || c.floor });
    default: return c.resist ? tx('parts.resist-card', { r: c.resist }) : c.text || '';
  } };
export function cardTip(id, v) {
  const c = D.CARDS[id];
  const rule = cardRule(id);
  return `<b>${c.name}</b>${c.mods ? changes(c.mods, v) : `<p>${rule}</p>`}${c.mods ? tx('parts.lose-the-card-and') : ''}${flavorP('CARDS', id)}`;
}
export function jacketTip(id, v) {
  const J = D.JACKETS[id];
  return tx('parts.jacket', { name: J.name, effect: J.effect, v: Object.keys(J.mods).length ? changes(J.mods, v) : tx('parts.no-modifiers'), v2: J.cls ? tx('parts.cut-for-the-no', { name: D.CLASSES[J.cls].name }) : '' }) + flavorP('JACKETS', id);
}

// ---------- gear visuals ----------
// Each kind of gear has a small drawn piece. The library and the coat check show them.
// A card is printed from its `look` (content/cards.js): a background in two colours with a pattern over it, a border,
// symbols along its edge (or at its corners), a big symbol in the middle, its ink and its font. Like a neon sign's
// options, but printed: no glow, no motion. The symbols are the signs' own tube shapes (symbols.js), drawn as ink.
const SVGNS = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs = {}, kids = []) => { const e = document.createElementNS(SVGNS, tag); for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v); for (const k of kids) e.append(k); return e; };
let artN = 0;
const KIND_GLYPH = { discount: '%', punch: '●●', membership: 'M', key: '⚿', note: '✉', trading: '✧', other: '?' };
export function cardArt(look = {}, W = 52, H = 72) {
  const id = `ca${++artN}`, L = { bg: ['#93a3c8', '#3a4a6a'], pattern: 'plain', border: 'plain', borderColor: '#ffffff', symColor: '#ffffff', edgeAt: 'none', edgeColor: '#ffffff', ...look };
  const svg = sv('svg', { class: 'card-art', viewBox: `0 0 ${W} ${H}`, width: W, height: H, 'aria-hidden': 'true' });
  const defs = sv('defs', {}, [sv('linearGradient', { id: `${id}g`, x1: 0, y1: 0, x2: 0.6, y2: 1 }, [sv('stop', { offset: 0, 'stop-color': L.bg[0] }), sv('stop', { offset: 1, 'stop-color': L.bg[1] || L.bg[0] })])]);
  const pat = { stripes: () => sv('pattern', { id: `${id}p`, width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(35)' }, [sv('rect', { width: 3, height: 6, fill: '#fff', opacity: 0.12 })]),
    checks: () => sv('pattern', { id: `${id}p`, width: 8, height: 8, patternUnits: 'userSpaceOnUse' }, [sv('rect', { width: 4, height: 4, fill: '#fff', opacity: 0.1 }), sv('rect', { x: 4, y: 4, width: 4, height: 4, fill: '#fff', opacity: 0.1 })]),
    dots: () => sv('pattern', { id: `${id}p`, width: 6, height: 6, patternUnits: 'userSpaceOnUse' }, [sv('circle', { cx: 3, cy: 3, r: 1, fill: '#fff', opacity: 0.18 })]),
    grain: () => sv('pattern', { id: `${id}p`, width: 7, height: 5, patternUnits: 'userSpaceOnUse' }, [sv('path', { d: 'M0 2.5Q1.75 1 3.5 2.5T7 2.5', stroke: '#fff', 'stroke-width': 0.5, fill: 'none', opacity: 0.15 })]) }[L.pattern];
  if (pat) defs.append(pat()); svg.append(defs, sv('rect', { width: W, height: H, rx: 5, fill: `url(#${id}g)` }));
  if (pat) svg.append(sv('rect', { width: W, height: H, rx: 5, fill: `url(#${id}p)` }));
  if (L.pattern === 'rays') for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; svg.append(sv('path', { d: `M${W / 2} ${H * 0.48}L${W / 2 + Math.cos(a) * W} ${H * 0.48 + Math.sin(a) * W}L${W / 2 + Math.cos(a + 0.12) * W} ${H * 0.48 + Math.sin(a + 0.12) * W}Z`, fill: '#fff', opacity: 0.08 })); }
  // the border
  const bc = L.borderColor, inset = 2.5, r = (k) => sv('rect', { x: k, y: k, width: W - 2 * k, height: H - 2 * k, rx: Math.max(1, 4 - k / 2), fill: 'none', stroke: bc });
  const B = { plain: () => [Object.assign(r(inset), {}), null], double: () => [r(inset), r(inset + 2.5)], dashed: () => [r(inset), null], dotted: () => [r(inset), null], stripes: () => [r(inset), r(inset)], notched: () => [sv('path', { d: `M${inset + 5} ${inset}H${W - inset - 5}L${W - inset} ${inset + 5}V${H - inset - 5}L${W - inset - 5} ${H - inset}H${inset + 5}L${inset} ${H - inset - 5}V${inset + 5}Z`, fill: 'none', stroke: bc }), null] }[L.border];
  // the border is cut cleanly where an edge symbol sits on it (a gap a little wider than the symbol), so the symbols are
  // part of the border and not laid over it
  const s7 = 6.5, edgePts = []; if (L.edge && L.edgeAt !== 'none') {
    if (L.edgeAt === 'corners') edgePts.push([7, 7], [W - 7, 7], [7, H - 7], [W - 7, H - 7]);
    if (L.edgeAt === 'top' || L.edgeAt === 'edge') for (let i = 0; i < 4; i++) edgePts.push([7 + (i * (W - 14)) / 3, 7]);
    if (L.edgeAt === 'bottom' || L.edgeAt === 'edge') for (let i = 0; i < 4; i++) edgePts.push([7 + (i * (W - 14)) / 3, H - 7]); }
  const cut = edgePts.length ? sv('mask', { id: `${id}m`, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: W, height: H }, [sv('rect', { width: W, height: H, fill: '#fff' }), ...edgePts.map(([x, y]) => sv('circle', { cx: x, cy: y, r: s7 * 0.72, fill: '#000' }))]) : null;
  if (cut) defs.append(cut);
  const edged = (el) => { if (cut && el) el.setAttribute('mask', `url(#${id}m)`); return el; };
  if (B) { const [a, b2] = B(); edged(a); edged(b2); a.setAttribute('stroke-width', L.border === 'dotted' ? 1.6 : L.border === 'stripes' ? 2.2 : 1.2); if (L.border === 'dashed') a.setAttribute('stroke-dasharray', '4 2.5'); if (L.border === 'dotted') { a.setAttribute('stroke-dasharray', '0.1 3'); a.setAttribute('stroke-linecap', 'round'); }
    svg.append(a); if (b2) { b2.setAttribute('stroke-width', L.border === 'stripes' ? 2.2 : 0.8); if (L.border === 'stripes') { b2.setAttribute('stroke', L.bg[1] || '#000'); b2.setAttribute('stroke-dasharray', '3 3'); } svg.append(b2); } }
  // a symbol: a sign symbol's tube shape as ink, or a character
  const sym = (key, x, y, size, col, w = 2) => { const S = SYM[symbolOf(key)]; if (!S) return sv('text', { x, y: y + size * 0.36, 'text-anchor': 'middle', 'font-size': size, fill: col, 'font-weight': 700 }, [document.createTextNode(key || '')]);
    const g = sv('g', { transform: `translate(${x - size / 2} ${y - size / 2}) scale(${size / 24})`, fill: 'none', stroke: col, 'stroke-width': (w * 24) / size, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [sv('path', { d: S.d })]);
    for (const [dx, dy] of S.dots || []) g.append(sv('circle', { cx: dx, cy: dy, r: 1.6, fill: col, stroke: 'none' })); return g; };
  for (const [x, y] of edgePts) svg.append(sym(L.edge, x, y, s7, L.edgeColor, 0.9));
  if (L.symbol) svg.append(sym(L.symbol, W / 2, H * 0.47, Math.min(W, H) * 0.42, L.symColor, 2));
  return svg;
}
// A punch card shows its punches: a ring for each one it takes, and a real hole through the card for each one made
// (the card is masked there, so whatever is behind it shows through). `o.punched`: how many are made (the run's count).
const PUNCH_AT = (n, W = 52, H = 72) => { const per = Math.min(n, 5), rows = Math.ceil(n / per), out = [];
  for (let i = 0; i < n; i++) { const r = Math.floor(i / per), k = i % per, inRow = Math.min(per, n - r * per); out.push([W / 2 + (k - (inRow - 1) / 2) * 8.4, H - 20 - (rows - 1 - r) * 8.4]); } return out; };
export function cardEl(id, cls = '', o = {}) {
  const c = D.CARDS[id] || {}, L = c.look || {};
  const ea = L.edgeAt || 'none', el = h('span', { class: `gcard art ${c.kind === 'key' ? 'gkey' : ''} ${ea === 'top' || ea === 'edge' ? 'edge-top' : ''} ${ea === 'bottom' || ea === 'edge' ? 'edge-bottom' : ''} ${ea === 'corners' ? 'edge-corners' : ''} ${cls}`, style: { '--ink': L.ink || '#fff', '--cfont': L.font === 'script' ? 'var(--script, "Yellowtail")' : L.font === 'body' ? 'inherit' : 'var(--display)' } },
    h('em', { text: tx(`card.kind.${c.kind || 'other'}`) }), h('b', {}), h('small', { text: o.name || (c.name || id).replace(/^.*?: /, '') }));
  el.prepend(cardArt({ symbol: KIND_GLYPH[c.kind] || '?', ...L }));
  // what the card is made of, and what its lettering is: a finish over its printed backing (content/finishes.js)
  if (L.finish?.bg?.m) { const fb = finishOn(h('i', { class: 'card-fin' }), { color: L.bg?.[0], ...L.finish.bg }); el.querySelector('.card-art').after(fb); }
  if (L.finish?.ink?.m) for (const part of el.querySelectorAll(':scope > em, :scope > small')) finishOn(part, { color: L.ink, ...L.finish.ink }, 'text');
  if (c.kind === 'punch' && c.punches > 0) { const pts = PUNCH_AT(Math.min(15, c.punches)), done = Math.max(0, Math.min(pts.length, o.punched || 0)), R0 = 2.7;
    const rings = sv('svg', { class: 'card-punches', viewBox: '0 0 52 72', 'aria-hidden': 'true' }, pts.map(([x, y], i) => sv('circle', { cx: x, cy: y, r: R0, fill: i < done ? 'none' : 'rgba(0,0,0,.18)', stroke: L.ink || '#fff', 'stroke-width': i < done ? 0.9 : 0.6, 'stroke-dasharray': i < done ? null : '1.4 1.2', opacity: i < done ? 0.9 : 0.7 })));
    el.append(rings); el.classList.add('punch');
    if (done) { const holes = pts.slice(0, done).map(([x, y]) => `radial-gradient(circle ${R0 - 0.4}px at ${(x / 52 * 100).toFixed(2)}% ${(y / 72 * 100).toFixed(2)}%, transparent 97%, #000 100%)`).join(', ');
      for (const k of ['maskImage', 'webkitMaskImage']) el.style[k] = holes; for (const k of ['maskComposite']) el.style[k] = 'intersect'; el.style.webkitMaskComposite = 'source-in'; } }
  return el;
}
// a Suite Key: a pass cut for one room, printed as its floor's key design with the room number for its name
export const keyTip = (k) => tx('parts.suite-key', { room: k.room, floor: D.FLOORS[k.floor]?.name || k.floor }) + flavorP('CARDS', `suite_${k.floor}`);
export function keyEl(k, cls = '') { const el = cardEl(`suite_${k.floor}`, cls, { name: tx('parts.suite-key-room', { room: k.room }) }); el.classList.add('gpasskey'); el._tip = () => keyTip(k); el.classList.add('has-tip'); return el; }
// a pass: not a card, it rides in the wallet's own pass slot
export const passTip = (f) => tx('parts.every-wallet-holds-one', { name: D.PASSES[f].name, text: D.PASSES[f].text }) + flavorP('PASSES', f);
export function passEl(f, cls = '') {
  const P = D.PASSES[f]; const el = h('span', { class: `gcard gpass ${cls}`, style: { '--gc': P.color, '--ink': '#fff' } }, h('em', { text: tx('parts.pass') }), h('b', { text: P.glyph }), h('small', { text: P.name.replace(/ Pass$/, '') }));
  el._tip = () => passTip(f); el.classList.add('has-tip'); return el;
}
// a sign symbol as a small drawing in one colour (for a wallet's or a jacket's emblem)
export function symEl(id, color = '#fff', cls = '') {
  const S = SYM[symbolOf(id)]; if (!S) return h('span', { class: cls, text: id || '' });
  const svg = sv('svg', { class: cls, viewBox: '0 0 24 24', 'aria-hidden': 'true' }, [sv('path', { d: S.d, fill: 'none', stroke: 'currentColor', 'stroke-width': 2.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }), ...(S.dots || []).map(([x, y]) => sv('circle', { cx: x, cy: y, r: 1.8, fill: 'currentColor' }))]);
  svg.style.color = color; return svg;
}
// A wallet and a jacket are drawn from their look (content/finishes.js): what they are made of, their colour and trim,
// a clasp or a collar, stitching or buttons, an emblem. What a look leaves out is read from the entry as it always was.
export function walletEl(id, cls = '') {
  const Wl = D.WALLETS[id] || {}, L = walletLook(id, Wl);
  const el = h('span', { class: `gwallet ${Wl.crown ? 'crown' : ''} ${cls}`, style: { '--wc': L.color, '--w-flap': L.flap + 'px', '--w-round': L.round + 'px', ...(L.trim ? { '--w-trim': L.trim } : {}) } }, h('i', { class: 'flap' }),
    L.stitch ? h('i', { class: 'stitch' }) : null, L.clasp !== 'none' ? h('i', { class: `clasp ${L.clasp}` }) : null,
    h('span', { class: 'slots' }, Array.from({ length: Wl.slots || 0 }, () => h('i'))), h('b', { text: Wl.keep ?? '' }));
  finishOn(el, { m: L.mat, color: L.color, glint: L.glint, sparkle: L.sparkle });
  if (L.symbol) el.append(finishSvg(symEl(L.symbol.id, L.symbol.color, 'wsym'), L.symbol.mat ? { m: L.symbol.mat, color: L.symbol.color, glint: L.glint, sparkle: L.sparkle } : null));
  return el;
}
export function jacketEl(id, cls = '') {
  const J = D.JACKETS[id] || {}, L = jacketLook(id, J);
  const body = finishOn(h('i', { class: 'body' }), { m: L.mat, color: L.color, glint: L.glint, sparkle: L.sparkle });
  const el = h('span', { class: `gjacket ${cls}`, style: { '--jc': L.color, '--j-len': L.length + 'px', ...(L.lining ? { '--j-lining': L.lining } : {}) } }, body, h('i', { class: `lapel c-${L.collar}` }),
    L.buttons ? h('span', { class: 'btns' }, Array.from({ length: L.buttons }, () => h('i'))) : null,
    h('span', { class: 'mods' }, Object.entries(J.mods || {}).map(([k2, n]) => h('b', { class: n > 0 ? 'p' : 'n', text: `${n > 0 ? '+' : ''}${n}` }))));
  if (L.symbol) el.append(finishSvg(symEl(L.symbol.id, L.symbol.color, 'jsym'), L.symbol.mat ? { m: L.symbol.mat, color: L.symbol.color, glint: L.glint, sparkle: L.sparkle } : null));
  return el;
}
// sips left are shown as how full the glass is
export function drinkEl(d, sips = d.sips, max = d.max || d.sips, cls = '') {
  return h('span', { class: `gdrink ${cls}`, style: { '--dk': d.color || '#ff86ea', '--fill': `${Math.round(100 * Math.max(0, sips) / Math.max(1, max))}%` } }, h('i', { class: 'liquid' }), h('b', { text: sips }));
}
export function feltEl(id, cls = '') { const F = D.feltOf(id); return h('span', { class: `gfelt ${cls}`, style: { '--fa': F.a, '--fb': F.b, '--fr': F.rim } }); }
export const feltStyle = (id) => { const F = D.feltOf(id), tex = textureOf('felt:' + id); return { '--fa': F.a, '--fb': F.b, '--fr': F.rim, ...(tex ? { '--ftex': `url("${tex}")` } : {}) }; };
