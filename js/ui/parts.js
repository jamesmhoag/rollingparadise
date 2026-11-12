// Small visual pieces and the tooltip text used across screens.
import { h } from './core.js';
import * as D from '../data.js';
import { cents, cap } from '../util.js';
import { multOf, traitOf } from '../bout.js';
import { facesOf, faceValue } from '../dice.js';
import { traitsOf, traitsHtml } from '../traits.js';

const GLYPH = { opp: '★', block: '▣', counter: '✸', burn: '🔥', acid: '☣', shock: '⚡', corrupt: '☠', poison: '☘', boom: '💣', frost: '❄', lava: '🌋', flower: '✿', petal: '❀', clay: '▤', brick: '▦', dynamite: '🧨', tree: '🌳', wood: '▥', hard: '⛊', sticky: '◍', hive: '⬢', little: '•', egg: '🥚', hat: '🎩', doom: '☠', volcano: '🌋' };
export const chipSig = (ch) => `${ch.kind === 'fx' ? 'k-fx k-std' : 'k-' + ch.kind} v${ch.value}${ch.gold ? ' gold' : ''}${ch.frozen ? ' frozen' : ''}${ch.feather > 0 ? ' feather' : ''}${ch.resist ? ' r-' + ch.resist : ''}${ch.wet > 0 ? ' wet' : ''}${ch.regen > 0 ? ' regen' : ''}${ch.big ? ' big' : ''}${ch.treasure ? ' treasure' : ''}`;
// how a chip looks to the Roller on side `viewer`: Doom chips look like 1¢ chips to their victim, a Spy to its
// owner's opponent, a Cursed chip like Gold to everyone
export function seenAs(ch, side, viewer = 0) {
  if (ch.kind === 'doom' && ch.owner !== viewer && side === viewer) return { id: ch.id, kind: 'std', value: 1 };
  if (ch.shop === 'spy' && side !== viewer) return { id: ch.id, kind: 'std', value: 1 };
  if (ch.cursed) return { id: ch.id, kind: 'std', value: ch.value, gold: true };
  return ch;
}
export const chipGlyph = (ch) => (ch.kind === 'fx' ? D.SHOP_CHIPS[ch.shop]?.glyph || '✦' : ch.kind === 'stray' ? '−' + ch.value : ch.kind === 'sticky' ? '◍' + ch.value : ch.kind === 'egg' ? '🥚' : ch.treasure ? '💰' : ch.big ? String(ch.value) : ch.kind === 'bounty' ? D.CREATURES[ch.creature]?.glyph || '★' : ch.kind === 'resist' ? `r${ch.r}` : ['food', 'dip'].includes(ch.kind) && ch.shop ? D.SHOP_CHIPS[ch.shop]?.glyph || '🍪' : ch.kind === 'std' ? (ch.resist ? (D.SHOP_CHIPS[ch.resist]?.seq ? `${D.SHOP_CHIPS[ch.resist].glyph}${ch.value}` : D.SHOP_CHIPS[ch.resist]?.glyph || '◆') : ch.frozen ? `❄${ch.value}` : D.denomOf(ch.value)?.glyph || String(ch.value)) : ch.kind === 'debt' ? '−' + ch.value : GLYPH[ch.kind] || '');
export function chipName(ch) {
  if (ch.kind === 'debt') return `${ch.value}¢ Debt chip`;
  if (ch.kind === 'stray') return `${ch.value}¢ of Debt on nothing`;
  if (ch.kind === 'hard') return `Hardened chip (${ch.life} turn${ch.life === 1 ? '' : 's'})`;
  if (ch.kind === 'sticky') return `Sticky chip (${ch.value})${ch.stuck ? ` on ${ch.stuck}` : ''}`;
  if (ch.kind === 'egg') return `Dragon Egg${ch.prog ? ` (${ch.prog} of 5 to hatch)` : ''}`;
  if (ch.treasure) return `Treasure chip (${ch.value} Gold)`;
  if (ch.big) return `Big ${ch.value}¢ chip`;
  if (ch.kind === 'bounty') return `${D.CREATURES[ch.creature]?.name} Bounty chip (${ch.value}¢)`;
  if (ch.kind === 'resist') return `Resist chip (r ${ch.r})`;
  if ((ch.kind === 'food' || ch.kind === 'dip') && ch.shop) return D.SHOP_CHIPS[ch.shop]?.name || 'Food chip';
  if (ch.kind === 'fx') return `${D.SHOP_CHIPS[ch.shop]?.name || 'Effect chip'}${ch.life != null && ch.life < 99 ? ` (${ch.life} turn${ch.life === 1 ? '' : 's'})` : ''}`;
  if (ch.kind !== 'std') return D.CHIPS[ch.kind].name;
  if (ch.resist) return D.SHOP_CHIPS[ch.resist]?.name || 'Shop chip';
  if (ch.frozen) return `Frozen ${ch.value}¢ chip`;
  return `${ch.gold ? 'Gold ' : ''}${D.denomOf(ch.value)?.name ? `${D.denomOf(ch.value).name} chip (${ch.value.toLocaleString('en-US')}¢)` : `${ch.value}¢ Royal Paradise chip`}${ch.feather > 0 ? ' (Feathered)' : ''}`;
}
export function chipText(ch) {
  const hits = ch.hits != null && ch.kind !== 'std' ? ` <span class="dim keep">${ch.hits} fee${ch.hits === 1 ? '' : 's'} left in it.</span>` : '';
  if (ch.kind === 'bounty') return D.CHIPS.bounty.text;
  if (ch.kind === 'stray') return `A fee that landed where there is nothing to pay it (${ch.why || 'empty space'}). It comes to nothing when the House settles.`;
  const extra = `${ch.wet > 0 ? ` <span class="keep" style="color:var(--sky)">Wet for ${ch.wet} turn${ch.wet === 1 ? '' : 's'}.</span>` : ''}${ch.regen > 0 ? ` <span class="keep good">Regen for ${ch.regen} turn${ch.regen === 1 ? '' : 's'}: paid to the Stage, it comes straight back.</span>` : ''}`;
  if (ch.treasure) return D.CHIPS.treasure.text + extra;
  if (ch.big) return D.shopText('big') + ` Worth ${ch.value}¢.` + extra;
  if (ch.kind === 'egg') return D.CHIPS.egg.text + hits + extra;
  if (ch.kind === 'resist') return `${D.CHIPS.resist.text} Fees under ${ch.r}¢ on this stack are deterred.`;
  if ((ch.kind === 'food' || ch.kind === 'dip') && ch.shop) return D.shopText(ch.shop) + (ch.dips != null ? ` ${ch.dips} dip${ch.dips === 1 ? '' : 's'} left.` : '');
  if (ch.kind === 'fx') return `${D.shopText(ch.shop)} <span class="keep">Made at the table by ${D.TRICKS[ch.maker]?.name || 'a trick'}${ch.life >= 99 ? '; it lasts the bout' : `; ${ch.life} turn${ch.life === 1 ? '' : 's'} left`}.</span> <span class="v">An effect chip: no worth, takes stack height, cannot be bid. A fee that reaches it, or empties its stack, knocks it off. It does not leave the table with you.</span>`;
  if (ch.kind !== 'std') return D.CHIPS[ch.kind].text + hits + extra + (ch.shop && D.SHOP_CHIPS[ch.shop] ? ` ${D.CHIP_TIERS[D.SHOP_CHIPS[ch.shop].tier].name} shop chip.` : '');
  if (ch.resist) { const X = D.SHOP_CHIPS[ch.resist]; if (!X) return 'Worth 1¢.';
    return `${D.shopText(ch.resist)} Worth ${X.seq ? ch.value : 1}¢${ch.n > 1 ? ` (merged from ${ch.n})` : ''}, ${X.place === 'top' ? 'goes on top of a stack' : 'deployed at the base of your stacks'}, not wagered.${ch.life != null ? ` ${ch.life} turn${ch.life === 1 ? '' : 's'} left.` : ''} ${D.CHIP_TIERS[X.tier].name} tier.${extra}`; }
  if (ch.frozen) return D.CHIPS.frozen.text;
  const feather = ch.feather > 0 ? ` Feathered for ${ch.feather} more turn${ch.feather > 1 ? 's' : ''}: ${D.CHIPS.feather.text.replace(/^A chip turned light for a few turns: /, '')}` : '';
  if (ch.gold) return `Gold. Cannot be bid, but pays double (${ch.value * 2}¢) if it survives the bout.${feather}`;
  return extra + (ch.value === 1 ? 'Basic value chip. Bid it to play a trick this turn.' : `Basic value chip. A fee under ${ch.value}¢ leaves Debt on top of it instead of paying it. Bid it and the trick lingers ${ch.value - 1} turn${ch.value > 2 ? 's' : ''}, growing as it waits.`) + feather;
}
export const chipEl = (ch, cls = '') => h('span', { class: `chip static ${chipSig(ch)} ${cls}` }, h('i', { text: chipGlyph(ch) }));
export const chipTip = (ch, o = {}) => `<b>${chipName(ch)}</b><p>${chipText(ch)}</p>${traitsHtml(traitsOf(ch, o))}`;
export { traitsOf, traitsHtml };

// a die's faces as small numbers, with special faces marked
export function faceStrip(d) {
  return facesOf(d).map((f) => { const v = faceValue(f), tag = f.rig ? '×' : f.ench ? '✧' : f.enc != null ? '▣' : f.w > 1 ? '!' : f.x > 1 ? '×' : '';
    return `<span class="face${tag ? ' sp' : ''}">${v}${tag ? `<sup>${tag}</sup>` : ''}</span>`; }).join('');
}
export function dieTip(d, extra = '') {
  const ups = (d.up || []).map((u, k) => `<li><b style="color:${D.DIE_UPGRADES[u].color}">${D.DIE_UPGRADES[u].mark} ${D.DIE_UPGRADES[u].name}</b>${d.tgt?.[k] != null ? ` <span class="dim">face ${d.tgt[k] + 1}</span>` : ''}<span class="v"> — ${D.upgradeText(u)}</span></li>`).join('');
  return `<b>${d.type}</b> <span class="faces">${faceStrip(d)}</span>${ups ? `<ul>${ups}</ul>` : ''}${extra ? `<p>${extra}</p>` : ''}`;
}
// one badge per upgrade, so every upgrade a die carries can be read off the die itself
export const dieMarks = (d) => ((d.up || []).length ? h('span', { class: 'ups' }, d.up.map((u) => h('b', { class: `u-${u}`, style: { '--uc': D.DIE_UPGRADES[u].color }, text: D.DIE_UPGRADES[u].mark }))) : null);
export const dieClass = (d) => `${(d.up || []).length ? 'upg' : ''} ${(d.up || []).map((u) => 'u-' + u).join(' ')}`;
export const dieEl = (d, value, cls = '') => h('span', { class: `die static ${d.type} ${dieClass(d)} ${cls}` }, h('i', { text: value ?? d.type.slice(1) }), dieMarks(d));

const fx = (m) => '×' + (m % 1 ? m.toFixed(2).replace(/0$/, '') : m);
// what a trick's quality and upgrades do, spelled out
export function upInfo(t) {
  const base = { ...t, up: 0 }, T = D.TYPES[D.TRICKS[t.id].type], next = t.up < 2 ? { ...t, up: t.up + 1 } : null;
  const trait = (x) => T.traitText(traitOf(x)).replace(/\.$/, '');
  let s = `<p><span class="k">Power</span> The roll total is multiplied by <b>${fx(multOf(t))}</b>: ${D.QNAME[t.q]} quality gives ${fx(multOf(base))}`;
  s += t.up ? `, and ${t.up === 1 ? 'its upgrade adds' : 'its 2 upgrades add'} <b>+${fx(multOf(t) - multOf(base)).slice(1)}</b> (+0.25 each).</p>` : '. Not upgraded.</p>';
  if (traitOf(t) !== traitOf(base)) s += `<p class="up-line">Upgraded Trait: ${trait(t)} <span class="dim">(was ${traitOf(base)})</span>.</p>`;
  if (next) s += `<p class="dim">Next upgrade at the Trick Trader: roll total ${fx(multOf(t))} → <b>${fx(multOf(next))}</b>${traitOf(next) !== traitOf(t) ? `, Trait ${traitOf(t)} → <b>${traitOf(next)}</b>` : ''}. For example a roll of 6 goes from ${Math.round(6 * multOf(t))} to ${Math.round(6 * multOf(next))}.</p>`;
  else s += '<p class="dim">Fully upgraded (2 of 2).</p>';
  return s;
}
// quality and upgrades are drawn on the trick itself: q1–q4 frames, u1–u2 foil
export const trickLook = (t) => `q${t.q} u${t.up || 0}`;
export const pips = (t) => '●'.repeat(t.q) + (t.up ? `<span class="up">${'▲'.repeat(t.up)}</span>` : '');
export function trickTip(t, viewerCls, live) {
  const def = D.TRICKS[t.id], T = D.TYPES[def.type], mi = traitOf(t);
  const classOk = !def.cls || def.cls === viewerCls;
  const tgt = def.approach === 'none' ? (def.dist === 'rain' ? 'Random stacks of your opponent.' : 'No target needed.')
    : `Targets ${D.APPROACH[def.approach]} in ${def.side === 'self' ? 'your own' : "your opponent's"} position. <b>${D.DIST[def.dist].name}</b>: ${D.DIST[def.dist].text}`;
  return `<div class="tt-trick"><div class="tt-head"><b>${def.name}</b><span class="q">${pips(t)} ${D.QNAME[t.q]}${t.up ? ` · upgraded ${t.up}/2` : ''}</span></div>
    <div class="tt-type" style="color:${T.color}">${T.name}${def.cls ? ' · ' + D.CLASSES[def.cls].name : ' · Any class'} <span class="dim v">— ${T.text}</span></div>
    <p><span class="k">Trait</span> Bid a chip: ${T.traitText(mi)}</p>
    <p><span class="k">Roll</span> Bid with up to ${def.count} ${def.die}: ${def.roll.text}</p>
    <p class="${classOk ? '' : 'dim'}"><span class="k">Bonus</span> With ${def.count} ${def.die}${def.count > 1 ? ' dice' : ''}, if ${D.condText(def.bonus.cond)}: ${def.bonus.text}${classOk ? '' : ` <i>(${D.CLASSES[def.cls].name} only)</i>`}</p>
    <p class="dim">${tgt}</p>
    <div class="v">${upInfo(t)}</div><p class="dim">Dice may be loaded over several turns before you bid.</p>${live || ''}</div>`;
}
export function statTip(k, v) {
  const S = D.STATS[k];
  return `<b>${S.name}${v != null ? ' ' + v : ''}</b> <span class="dim">${S.short}</span><p>${S.text}</p>${S.per ? `<p class="dim">Each point: ${S.per(1)}.</p>` : ''}`;
}
// What a change to an attribute does, said plainly. `cur`: the value now, if known.
export function statChange(k, n, cur) {
  const S = D.STATS[k]; if (!S) return '';
  const t = S.per(Math.abs(n)), what = n > 0 ? t : t.replace(/\bmore\b/, 'fewer');
  return `<li><b>${n > 0 ? '+' : ''}${n} ${S.name}</b>${cur != null ? ` <span class="dim">${cur} → ${cur + n}</span>` : ''}<span class="v"> — you ${what}.</span></li>`;
}
const changes = (mods, v) => `<ul>${Object.entries(mods || {}).map(([k, n]) => statChange(k, n, v?.[k])).join('')}</ul>`;
export function statRow(v, keys) {
  return h('div', { class: 'stats' }, keys.map((k) => h('span', { class: 'stat', tip: () => statTip(k, v[k]) }, h('em', { text: D.STATS[k].short }), h('b', { text: v[k] }))));
}
export const money = (n) => cents(n);
export function drinkTip(d) {
  const mods = Object.entries(d.mods).map(([k, n]) => `+${n} ${D.STATS[k].name}`).join(', ');
  return `<b>${d.name}</b> <span class="dim">${d.verb}</span><p>${mods} for one turn per sip. ${d.sips} sip${d.sips === 1 ? '' : 's'}${d.max ? ' left' : ''}. Sip before you act.</p>`;
}
// v: your current attributes (rollerStats(run).v), so a +1 can say what it changes
export function cardTip(id, v) {
  const c = D.CARDS[id];
  return `<b>${c.name}</b>${c.mods ? changes(c.mods, v) : `<p>${c.text}</p>`}${c.mods ? '<p class="dim">Lose the card and you lose this.</p>' : ''}`;
}
export function jacketTip(id, v) {
  const J = D.JACKETS[id];
  return `<b>${J.name} jacket</b> <span class="dim">${J.effect}</span>${Object.keys(J.mods).length ? changes(J.mods, v) : '<p>No modifiers.</p>'}${J.cls ? `<p class="dim">Cut for the ${D.CLASSES[J.cls].name}; no other class can wear it.</p>` : ''}`;
}

// ---------- gear visuals ----------
// Each kind of gear has a small drawn piece. The library and the coat check show them.
const CARD_LOOK = (id) => {
  if (id.startsWith('discount_')) return { c: '#2aa7c4', g: '%', k: 'Discount' };
  if (id.startsWith('business_')) { const st = Object.keys(D.CARDS[id].mods || {})[0]; return { c: '#ffd76a', g: '+1', k: D.STATS[st]?.short || 'Business' }; }
  if (id.startsWith('note')) return { c: '#f4efe2', g: '✉', k: 'Note', ink: '#3a2c14' };
  const m = { royal: ['#7a2d7a', '♛', 'Royal'], paradise: ['#d4a52a', '✺', 'Paradise'], membership: ['#b08cff', 'M', 'Pass'], suite: ['#ff86ea', '⚿', 'Pass'], punch: ['#ff9f3a', '●●', 'Pass'], debit: ['#3c7fc4', '$', 'Debit'], trading: ['#7dffb5', '✧', 'Trading'] }[id] || ['#93a3c8', '?', 'Card'];
  return { c: m[0], g: m[1], k: m[2] };
};
export function cardEl(id, cls = '') {
  const L = CARD_LOOK(id), pass = D.PASS_CARDS.includes(id);
  return h('span', { class: `gcard ${pass ? 'pass' : ''} ${cls}`, style: { '--gc': L.c, '--ink': L.ink || '#fff' } }, h('em', { text: L.k }), h('b', { text: L.g }), h('small', { text: D.CARDS[id].name.replace(/^.*?: /, '') }));
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
export const feltStyle = (id) => { const F = D.feltOf(id); return { '--fa': F.a, '--fb': F.b, '--fr': F.rim }; };
