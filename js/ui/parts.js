// Small visual pieces and the tooltip text used across screens.
import { h } from './core.js';
import * as D from '../data.js';
import { cents, cap } from '../util.js';
import { trickMult } from '../bout.js';

const GLYPH = { opp: '★', block: '▣', counter: '✸', debt: '−1', burn: '🔥', acid: '☣', shock: '⚡' };
export const chipSig = (ch) => `k-${ch.kind} v${ch.value}${ch.gold ? ' gold' : ''}${ch.resist ? ' r-' + ch.resist : ''}`;
export const chipGlyph = (ch) => (ch.kind === 'std' ? (ch.resist ? '◆' : String(ch.value)) : GLYPH[ch.kind] || '');
export function chipName(ch) {
  if (ch.kind !== 'std') return D.CHIPS[ch.kind].name;
  if (ch.resist) return D.RESIST[ch.resist].name;
  return `${ch.gold ? 'Gold ' : ''}${ch.value}¢ chip`;
}
export function chipText(ch) {
  if (ch.kind !== 'std') return D.CHIPS[ch.kind].text;
  if (ch.resist) return `Worth 1¢. A stack holding it ${D.RESIST[ch.resist].verb} ${cap(D.CHIPS[ch.resist].name)}s. Deployed at the base of your stacks.`;
  if (ch.gold) return `Gold. Cannot be bid, but pays double (${ch.value * 2}¢) if it survives the bout.`;
  return ch.value === 1 ? 'Standard chip. Bid it to play a trick this turn.' : `Standard chip. A fee under ${ch.value}¢ leaves Debt on top of it instead of paying it. Bid it and the trick lingers ${ch.value - 1} turn${ch.value > 2 ? 's' : ''}, growing as it waits.`;
}
export const chipEl = (ch, cls = '') => h('span', { class: `chip static ${chipSig(ch)} ${cls}` }, h('i', { text: chipGlyph(ch) }));
export const chipTip = (ch) => `<b>${chipName(ch)}</b><p>${chipText(ch)}</p>`;

export function dieTip(d, extra = '') {
  const f = D.DICE[d.type].faces, ups = (d.up || []).map((u) => `<li><b>${D.DIE_UPGRADES[u].name}</b> — ${D.DIE_UPGRADES[u].text}</li>`).join('');
  return `<b>${d.type}</b> <span class="dim">rolls 1–${f}</span>${ups ? `<ul>${ups}</ul>` : ''}${extra ? `<p>${extra}</p>` : ''}`;
}
export const dieEl = (d, value, cls = '') => h('span', { class: `die static ${d.type} ${(d.up || []).length ? 'upg' : ''} ${cls}` }, h('i', { text: value ?? d.type.slice(1) }));

export const pips = (t) => '●'.repeat(t.q) + (t.up ? `<span class="up">${'+'.repeat(t.up)}</span>` : '');
export function trickTip(t, viewerCls, live) {
  const def = D.TRICKS[t.id], T = D.TYPES[def.type], m = trickMult(t), mi = Math.max(1, Math.round(m));
  const classOk = !def.cls || def.cls === viewerCls;
  const tgt = def.approach === 'none' ? (def.dist === 'rain' ? 'Random stacks of your opponent.' : 'No target needed.')
    : `Targets ${D.APPROACH[def.approach]} in ${def.side === 'self' ? 'your own' : "your opponent's"} position. <b>${D.DIST[def.dist].name}</b>: ${D.DIST[def.dist].text}`;
  return `<div class="tt-trick"><div class="tt-head"><b>${def.name}</b><span class="q">${pips(t)} ${D.QNAME[t.q]}</span></div>
    <div class="tt-type" style="color:${T.color}">${T.name}${def.cls ? ' · ' + D.CLASSES[def.cls].name : ' · Any class'} <span class="dim">— ${T.text}</span></div>
    <p><span class="k">Trait</span> Bid a chip: ${T.traitText(mi)}</p>
    <p><span class="k">Roll</span> Bid with up to ${def.count} ${def.die}: ${def.roll.text}</p>
    <p class="${classOk ? '' : 'dim'}"><span class="k">Bonus</span> With ${def.count} ${def.die}${def.count > 1 ? ' dice' : ''}, if ${D.condText(def.bonus.cond)}: ${def.bonus.text}${classOk ? '' : ` <i>(${D.CLASSES[def.cls].name} only)</i>`}</p>
    <p class="dim">${tgt}</p>
    <p class="dim">Quality multiplies the roll total by ×${m % 1 ? m.toFixed(2) : m}. Dice may be loaded over several turns before you bid.</p>${live || ''}</div>`;
}
export function statTip(k, v) { const S = D.STATS[k]; return `<b>${S.name}${v != null ? ' ' + v : ''}</b> <span class="dim">${S.short}</span><p>${S.text}</p>`; }
export function statRow(v, keys) {
  return h('div', { class: 'stats' }, keys.map((k) => h('span', { class: 'stat', tip: () => statTip(k, v[k]) }, h('em', { text: D.STATS[k].short }), h('b', { text: v[k] }))));
}
export const money = (n) => cents(n);
export function drinkTip(d) {
  const mods = Object.entries(d.mods).map(([k, n]) => `+${n} ${D.STATS[k].name}`).join(', ');
  return `<b>${d.name}</b> <span class="dim">${d.verb}</span><p>${mods} for one turn per sip. ${d.sips} sip${d.sips === 1 ? '' : 's'}${d.max ? ' left' : ''}. Sip before you act.</p>`;
}
export function cardTip(id) { const c = D.CARDS[id]; return `<b>${c.name}</b><p>${c.text}</p>`; }
export function jacketTip(id) {
  const J = D.JACKETS[id], mods = Object.entries(J.mods).map(([k, n]) => `${n > 0 ? '+' : ''}${n} ${D.STATS[k].name}`).join(', ') || 'No modifiers';
  return `<b>${J.name} jacket</b> <span class="dim">${J.effect}</span><p>${mods}</p>`;
}
