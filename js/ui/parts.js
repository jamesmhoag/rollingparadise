// Small visual pieces and the tooltip text used across screens.
import { h } from './core.js';
import * as D from '../data.js';
import * as CM from '../content/chipmaker.js';
import { cents, cap } from '../util.js';
import { multOf } from '../bout.js';
import { facesOf, faceValue, matOf, dieName } from '../dice.js';
import { traitsOf, traitsHtml } from '../traits.js';
import { iconStyle, textureOf } from './icons.js';
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
  if (M.immune?.length) parts.push(`immune to ${M.immune.join(', ')}`);
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
export const chipTip = (ch, o = {}) => `<b>${chipName(ch)}</b><p>${chipText(ch)}</p>${traitsHtml(traitsOf(ch, o))}`;
export { traitsOf, traitsHtml };

// a die's faces as small numbers, with special faces marked
export function faceStrip(d) {
  return facesOf(d).map((f) => { const v = faceValue(f), tag = f.rig ? '×' : f.ench ? '✧' : f.enc != null ? '▣' : f.w > 1 ? '!' : f.x > 1 ? '×' : '';
    return `<span class="face${tag ? ' sp' : ''}">${v}${tag ? `<sup>${tag}</sup>` : ''}</span>`; }).join('');
}
export function dieTip(d, extra = '') {
  const ups = (d.up || []).map((u, k) => `<li><b style="color:${D.DIE_UPGRADES[u].color}">${D.DIE_UPGRADES[u].mark} ${D.DIE_UPGRADES[u].name}</b>${d.tgt?.[k] != null ? tx('parts.face', { tgt: d.tgt[k] + 1 }) : ''}<span class="v"> — ${D.upgradeText(u)}</span></li>`).join('');
  const M = D.MATERIALS[matOf(d)], B = d.bone && D.BONE[d.bone];
  return `<b>${dieName(d)}</b> <span class="faces">${faceStrip(d)}</span>${B ? tx('parts.carved-with', { name: B.name, name2: D.DIE_UPGRADES[B.up].name, upgradeText: D.upgradeText(B.up) }) : ups ? `<ul>${ups}</ul>` : ''}${d.cast ? tx('parts.cast-by-the-diesmith', { name: D.CASTS[d.cast].name, v: (d.dyes || []).length ? ` with ${d.dyes.map((k) => D.DYES[k].name).join(', ')}` : '' }) : ''}<p class="dim v">${M.text}</p>${extra ? `<p>${extra}</p>` : ''}`;
}
// one badge per upgrade, so every upgrade a die carries can be read off the die itself
export const dieMarks = (d) => ((d.up || []).length ? h('span', { class: 'ups' }, d.up.map((u) => h('b', { class: `u-${u}`, style: { '--uc': D.DIE_UPGRADES[u].color }, text: D.DIE_UPGRADES[u].mark }))) : null);
// the dyes a cast die was made with, as small drops of each colour on its lower left
export const dieDyes = (d) => ((d.dyes || []).length ? h('span', { class: 'dyes' }, d.dyes.map((k) => h('b', { style: { '--yc': D.DYES[k]?.color || '#fff' } }))) : null);
export const dieClass = (d) => `m-${matOf(d)} ${(d.up || []).length ? 'upg' : ''} ${(d.up || []).map((u) => 'u-' + u).join(' ')}`;
// A die's look comes from its material (MATERIALS in content/dice.js): the material's colour, set here from the
// table, and its finish (css .m-*). Its shape alone tells its size. `_die` lets any die be grabbed and spun (spin.js).
export const dieStyle = (d) => ({ '--dc': D.MATERIALS[matOf(d)]?.color || '#e8e2d4' });
export const dieEl = (d, value, cls = '') => { const el = h('span', { class: `die static ${d.type} ${dieClass(d)} ${cls}`, style: dieStyle(d) }, h('i', { text: value ?? d.type.slice(1) }), dieMarks(d), dieDyes(d)); el._die = d; return el; };

const fx = (m) => '×' + (m % 1 ? m.toFixed(2).replace(/0$/, '') : m);
// what a trick's quality, print and condition do, spelled out
export function printInfo(t) {
  const plain = { id: t.id, q: t.q }, cond = D.CONDITIONS[D.condOf(t)];
  let s = tx('parts.power-the-roll-total', { fx: fx(multOf(t)), QNAME: D.QNAME[t.q], fx2: fx(multOf(plain)) });
  s += t.foil ? tx('parts.and-the-print-makes', { name: D.FOIL[Math.min(3, t.foil)].name, fx: fx(multOf(t)) }) : '.</p>';
  s += `<p><span class="k">${D.QNAME[t.q]}</span> ${D.qdieText(t.q)}</p>`;
  s += tx('parts.wear-100-1-a', { name: cond.name, v: t.wear ?? D.WEAR.good, v2: cond.sell ? `Sells at ${Math.round(cond.sell * 100)}% of its price` : tx('parts.cannot-be-sold-only') });
  return s;
}
// what a Misprint or a Reprint plays differently (always shown: it changes the rules)
export const printRule = (t) => (t.rar === 'misprint' ? tx('parts.misprint', { misText: D.misText(t) }) : t.rar === 'reprint' ? tx('parts.reprint', { REPRINT: D.REPRINT[D.TRICKS[t.id].type] }) : '');
// quality and print are drawn on the trick itself: q1–q4 frames, f1–f3 foil, and a Misprint's or Reprint's look
export const trickLook = (t) => `q${t.q}${t.foil ? ` f${Math.min(3, t.foil)}` : ''}${t.rar === 'misprint' || t.rar === 'reprint' ? ` ${t.rar}` : ''}`;
// the words for a trick's quality and print, in place of marks: "Grand", "Grand Holo", "Fine Misprint"
const rareWord = (t) => (D.rarityName(t) ? `<span class="rw ${trickLook(t)}">${D.rarityName(t)}</span>` : '');
export const trickWords = (t) => `${D.QNAME[t.q]}${D.rarityName(t) ? ' ' + rareWord(t) : ''}`;
// one word where room is short (a compact card): the print if it is rare, else the quality above Common
export const trickWord = (t) => rareWord(t) || (t.q > 1 ? D.QNAME[t.q] : '');
export function trickTip(t, viewerCls, live) {
  const def = D.defOf(t), T = D.TYPES[def.type];
  const classOk = !def.cls || def.cls === viewerCls;
  const tgt = def.approach === 'none' ? (def.dist === 'rain' ? tx('parts.random-stacks-of-your') : tx('parts.no-target-needed'))
    : tx('parts.targets-in-position', { APPROACH: D.APPROACH[def.approach], v: def.side === 'self' ? 'your own' : "your opponent's", name: D.DIST[def.dist].name, text: D.DIST[def.dist].text });
  return tx('parts.trait-bid-a-chip', { name: def.name, trickWords: trickWords(t), name2: D.CONDITIONS[D.condOf(t)].name, color: T.color, name3: T.name, v: def.cls ? ' · ' + D.CLASSES[def.cls].name : tx('parts.any-class'), text: T.text, count: def.count, die: def.die, text2: def.roll.text, v2: classOk ? '' : 'dim', condText: D.condText(def.bonus.cond), text3: def.bonus.text, v3: classOk ? '' : tx('parts.only', { name: D.CLASSES[def.cls].name }), printRule: printRule(t), tgt, printInfo: printInfo(t), v4: live || '' });
}
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
  return h('div', { class: 'stats' }, keys.map((k) => h('span', { class: 'stat', tip: () => statTip(k, v[k]) }, h('em', { text: D.STATS[k].short }), h('b', { text: v[k] }))));
}
export const money = (n) => cents(n);
export function drinkTip(d) {
  const mods = Object.entries(d.mods).map(([k, n]) => `+${n} ${D.STATS[k].name}`).join(', ');
  return tx('parts.for-one-turn-per', { name: d.name, verb: d.verb, mods, sips: d.sips, v: d.max ? ' left' : '' });
}
// v: your current attributes (rollerStats(run).v), so a +1 can say what it changes
export function cardTip(id, v) {
  const c = D.CARDS[id];
  return `<b>${c.name}</b>${c.mods ? changes(c.mods, v) : `<p>${c.text}</p>`}${c.mods ? tx('parts.lose-the-card-and') : ''}`;
}
export function jacketTip(id, v) {
  const J = D.JACKETS[id];
  return tx('parts.jacket', { name: J.name, effect: J.effect, v: Object.keys(J.mods).length ? changes(J.mods, v) : tx('parts.no-modifiers'), v2: J.cls ? tx('parts.cut-for-the-no', { name: D.CLASSES[J.cls].name }) : '' });
}

// ---------- gear visuals ----------
// Each kind of gear has a small drawn piece. The library and the coat check show them.
const CARD_LOOK = (id) => {
  if (id.startsWith('discount_')) return { c: '#2aa7c4', g: '%', k: 'Discount' };
  if (id.startsWith('note')) return { c: '#f4efe2', g: '✉', k: 'Note', ink: '#3a2c14' };
  const m = { paradise: ['#d4a52a', '✺', 'Paradise'], membership: ['#b08cff', 'M', 'Member'], suite: ['#ff86ea', '⚿', 'Key'], punch: ['#ff9f3a', '●●', 'Punch'], debit: ['#3c7fc4', '$', 'Debit'], trading: ['#7dffb5', '✧', 'Trading'] }[id] || ['#93a3c8', '?', 'Card'];
  return { c: m[0], g: m[1], k: m[2] };
};
export function cardEl(id, cls = '') {
  const L = CARD_LOOK(id), lanyard = D.LANYARD_CARDS.includes(id);
  return h('span', { class: `gcard ${lanyard ? 'lanyard' : ''} ${cls}`, style: { '--gc': L.c, '--ink': L.ink || '#fff' } }, h('em', { text: L.k }), h('b', { text: L.g }), h('small', { text: D.CARDS[id].name.replace(/^.*?: /, '') }));
}
// a pass: not a card, it rides in the wallet's own pass slot
export const passTip = (f) => tx('parts.every-wallet-holds-one', { name: D.PASSES[f].name, text: D.PASSES[f].text });
export function passEl(f, cls = '') {
  const P = D.PASSES[f]; const el = h('span', { class: `gcard gpass ${cls}`, style: { '--gc': P.color, '--ink': '#fff' } }, h('em', { text: tx('parts.pass') }), h('b', { text: P.glyph }), h('small', { text: P.name.replace(/ Pass$/, '') }));
  el._tip = () => passTip(f); el.classList.add('has-tip'); return el;
}
export function walletEl(id, cls = '') {
  const Wl = D.WALLETS[id];
  return h('span', { class: `gwallet ${Wl.crown ? 'crown' : ''} ${cls}`, style: { '--wc': Wl.color || '#8d8478' } }, h('i', { class: 'flap' }),
    h('span', { class: 'slots' }, Array.from({ length: Wl.slots }, () => h('i'))), h('b', { text: Wl.keep }));
}
export function jacketEl(id, cls = '') {
  const J = D.JACKETS[id];
  return h('span', { class: `gjacket ${cls}`, style: { '--jc': J.color || '#5b6378' } }, h('i', { class: 'body' }), h('i', { class: 'lapel' }),
    h('span', { class: 'mods' }, Object.entries(J.mods).map(([k, n]) => h('b', { class: n > 0 ? 'p' : 'n', text: `${n > 0 ? '+' : ''}${n}` }))));
}
// sips left are shown as how full the glass is
export function drinkEl(d, sips = d.sips, max = d.max || d.sips, cls = '') {
  return h('span', { class: `gdrink ${cls}`, style: { '--dk': d.color || '#ff86ea', '--fill': `${Math.round(100 * Math.max(0, sips) / Math.max(1, max))}%` } }, h('i', { class: 'liquid' }), h('b', { text: sips }));
}
export function feltEl(id, cls = '') { const F = D.feltOf(id); return h('span', { class: `gfelt ${cls}`, style: { '--fa': F.a, '--fb': F.b, '--fr': F.rim } }); }
export const feltStyle = (id) => { const F = D.feltOf(id), tex = textureOf('felt:' + id); return { '--fa': F.a, '--fb': F.b, '--fr': F.rim, ...(tex ? { '--ftex': `url("${tex}")` } : {}) }; };
