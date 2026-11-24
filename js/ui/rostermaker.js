// Build mode: the Class maker, the Roller maker and the Opponent maker.
//   A Class is attributes only: Draw, Bid, Roll (TIP), the position's shape (BVD), a starting Charisma, Cunning and
//   Conviction (CCC), the attribute it leans on and where it deploys from. Every Roller, Opponent and High Roller has one.
//   A Roller (ROLLERS) is a name, a Class and a starting inventory: its Book, Pouch, Worth, wallet and jacket, and its sign.
//   An Opponent (ROSTER) is the same, plus where it sits and how it plays; a High Roller adds a business card and phases.
// The neon signs live here too: each Roller's and Opponent's own, and the shared looks (yours, the opponents', the House's).
import { h, lab, btn, toast } from './core.js';
import * as D from '../data.js';
import * as R from '../run.js';
import * as B from '../build/draft.js';
import { t } from '../text.js';
import { NEW_OPPONENT, NEW_BOSS } from '../content/roster.js';
import { NEW_ROLLER } from '../content/rollers.js';
import { diceSummary } from './app.js';
import { signEditor } from './neonmaker.js';
import { dieEl } from './parts.js';
import { trickTag } from './app.js';
import { stakeBoard } from './stakeboard.js';

// A list of tricks as the tricks themselves: each a tag (its hover is the trick), ✕ to drop it, and a menu to add one.
// The ids are kept in the data; the names and colours come from TRICKS, so renaming a trick renames it here.
function trickPicker(ids, onSet) {
  return h('div', { class: 'b-tricks' }, ...ids.map((id, i) => h('span', { class: 'row b-trick' }, D.TRICKS[id] ? trickTag({ id, q: 1 }) : h('span', { class: 'bad', text: id }),
    btn('✕', () => onSet(ids.filter((_, j) => j !== i)), null, 'small'))),
    h('select', { onchange: (e) => e.target.value && onSet([...ids, e.target.value]) }, h('option', { value: '', text: t('roster.tricks.add') }),
      ...Object.entries(D.TRICKS).sort((a, b) => a[1].name.localeCompare(b[1].name)).map(([k, v]) => h('option', { value: k, text: `${v.name} · ${D.TYPES[v.type].name}` }))));
}
// a thing's line of flavour (content/flavor.js), edited in place
export function flavorField(table, id, redraw) {
  const path = D.subPath(D.subPath('FLAVOR', table), id);
  return h('div', { class: `b-field ${B.changed(path) ? 'ch' : ''}` }, h('label', { text: t('maker.flavor') }),
    h('textarea', { rows: 2, text: D.flavorOf(table, id), placeholder: t('maker.flavor.ph'), onchange: (e) => { B.setValue(path, e.target.value.trim()); redraw(); } }),
    path in B.draft.changes ? btn('↺', () => { B.revert(path); redraw(); }, null, 'small b-revert') : h('span'));
}

const isObj = (x) => x && typeof x === 'object';
// small form helpers bound to one entry's path
function form(base, redraw) {
  const P = (...ks) => ks.reduce((p, k) => D.subPath(p, k), base);
  const set = (ks, v) => { B.setValue(P(...ks), v); redraw(); };
  const field = (label, el, ks) => h('div', { class: `b-field ${ks && B.changed(P(...ks)) ? 'ch' : ''}` }, h('label', {}, label), el,
    ks && P(...ks) in B.draft.changes ? btn('↺', () => { B.revert(P(...ks)); redraw(); }, null, 'small b-revert') : h('span'));
  const select = (ks, list, value, onSet) => h('select', { onchange: (e) => (onSet || ((v) => set(ks, v)))(e.target.value === '' ? null : e.target.value) },
    list.map(([v, l]) => h('option', { value: v ?? '', ...(String(v ?? '') === String(value ?? '') ? { selected: 'selected' } : {}), text: l })));
  const number = (ks, value, o = {}) => h('input', { type: 'number', step: o.step || 1, ...(o.min != null ? { min: o.min } : {}), value: value ?? '', placeholder: o.ph || '', style: o.w ? { width: o.w } : {}, onchange: (e) => (o.on || ((v) => set(ks, v)))(e.target.value === '' ? null : Number(e.target.value)) });
  const text = (ks, value) => h('input', { type: 'text', value: value ?? '', onchange: (e) => set(ks, e.target.value) });
  const checks = (ks, opts, list) => h('div', { class: 'b-checks' }, opts.map(([k, l]) => h('label', { class: 'b-check' },
    h('input', { type: 'checkbox', ...(list.includes(k) ? { checked: 'checked' } : {}), onchange: (e) => set(ks, e.target.checked ? [...list, k].sort() : list.filter((x) => x !== k)) }), l)));
  return { P, set, field, select, number, text, checks };
}
const ask = (label, def, taken) => { const id = (globalThis.prompt?.(label, def) || '').trim();
  if (!id) return null; if (!/^\w+$/.test(id)) { toast(t('build.duplicate.badId'), 'warn'); return null; }
  if (taken[id]) { toast(t('build.duplicate.taken', { id }), 'warn'); return null; } return id; };

// a Pouch: a count for each size of die
function diceField(f, dice, ks = ['dice']) {
  return f.field(lab('roster.dice'), h('div', { class: 'row wrap b-dice' }, ...Object.keys(D.DICE).map((k) => h('label', { class: 'b-die' }, dieEl({ type: k, up: [] }, '', 'mini'),
    f.number(null, dice?.[k] || 0, { min: 0, w: '52px', on: (v) => { const out = { ...(dice || {}) }; if (v > 0) out[k] = v | 0; else delete out[k]; f.set(ks, Object.keys(out).length ? out : null); } })))), ks);
}
const optsOf = (o, none) => [...(none ? [[null, none]] : []), ...Object.entries(o).map(([k, v]) => [k, typeof v === 'string' ? v : v.name])];
const usersOf = (cls) => [...Object.values(D.ROLLERS).filter((x) => x.cls === cls).map((x) => x.name), ...Object.values(D.ROSTER).filter((x) => x.cls === cls).map((x) => `${x.boss ? '👑 ' : ''}${x.name}`)];

// ---------- classes ----------
// TIP and BVD are each Roller's own every bout; CCC is a base the table's rows add to (bout.js occBonus)
const GROUPS = [['tip', ['trickery', 'ingenuity', 'proficiency']], ['bvd', ['balance', 'versatility', 'depth']], ['ccc', ['charisma', 'cunning', 'conviction']]];
export function newClass(from) {
  const id = ask(t('roster.class.newId'), 'my_class', D.CLASSES); if (!id) return null;
  B.setValue(D.subPath('CLASSES', id), { ...JSON.parse(JSON.stringify(D.CLASSES[from] || D.CLASSES.hustler)), name: 'New class' }); return id;
}
export function classMaker(id, redraw) {
  const K = D.CLASSES[id]; if (!K) return h('p', { class: 'sub', text: t('maker.none') });
  const f = form(D.subPath('CLASSES', id), redraw), stat = (k) => D.STATS[k], ccc = D.cccOf(id), users = usersOf(id);
  const val = (g, k) => (g === 'ccc' ? ccc[k] : K[g]?.[k] ?? 0);
  return h('div', { class: 'b-maker' }, h('div', { class: 'b-fields' },
    h('span', { class: 'cap', text: t('roster.part.class') }),
    f.field(lab('maker.name'), f.text(['name'], K.name), ['name']),
    flavorField('CLASSES', id, redraw),
    f.field(lab('roster.color'), h('input', { type: 'color', value: K.color || '#888888', onchange: (e) => f.set(['color'], e.target.value) }), ['color']),
    ...GROUPS.flatMap(([g, ks]) => [h('span', { class: 'cap', text: t(`roster.group.${g}`) }),
      ...ks.map((k) => f.field(h('span', { class: 'b-lab has-help', text: `${stat(k).name} (${stat(k).short})`, tip: stat(k).text }), f.number([g, k], val(g, k), { min: g === 'tip' ? 1 : -3 }), [g, k]))]),
    h('span', { class: 'cap', text: t('roster.part.lean') }),
    f.field(lab('roster.primary'), f.select(['primary'], GROUPS[0][1].map((k) => [k, t('roster.primary.opt', { stat: stat(k).name, reward: stat(D.C_OF[k]).name })]), K.primary), ['primary']),
    f.field(lab('roster.deploy'), f.select(['deploy'], [['start', t('roster.deploy.start')], ['center', t('roster.deploy.center')], ['end', t('roster.deploy.end')]], K.deploy), ['deploy'])),
  h('div', {}, h('span', { class: 'cap', text: t('maker.preview') }), h('div', { class: 'b-card', style: { '--cc': K.color } }, h('b', { text: K.name }), h('p', { text: D.classRule(id) }), D.flavorOf('CLASSES', id) ? h('p', { class: 'flavor', text: D.flavorOf('CLASSES', id) }) : null,
    h('p', { class: 'dim', text: GROUPS.map(([g, ks]) => ks.map((k) => `${stat(k).short} ${val(g, k)}`).join(' · ')).join(' / ') }),
    h('p', { class: 'dim', text: t('roster.class.rewards', { stat: stat(D.primaryC(id)).name }) })),
  h('span', { class: 'cap', text: t('roster.class.users') }), h('p', { class: 'sub', text: users.length ? users.join(' · ') : t('roster.class.unused') }),
  h('p', { class: 'sub', text: t('roster.class.note') })));
}

// ---------- Rollers: the heroes ----------
export function newRoller(from) {
  const id = ask(t('roster.roller.newId'), 'my_roller', D.ROLLERS); if (!id) return null;
  B.setValue(D.subPath('ROLLERS', id), { ...JSON.parse(JSON.stringify(D.ROLLERS[from] || NEW_ROLLER)), name: 'New Roller' }); return id;
}
export function rollerMaker(id, redraw) {
  const X = D.ROLLERS[id]; if (!X) return h('p', { class: 'sub', text: t('maker.none') });
  const f = form(D.subPath('ROLLERS', id), redraw), K = D.CLASSES[X.cls];
  const dice = Object.entries(X.dice || {}).flatMap(([type, n]) => Array.from({ length: n }, () => type));
  return h('div', { class: 'b-maker' }, h('div', { class: 'b-fields' },
    h('span', { class: 'cap', text: t('roster.part.roller') }),
    f.field(lab('roster.rollerName'), f.text(['name'], X.name), ['name']),
    f.field(lab('maker.cls'), f.select(['cls'], optsOf(D.CLASSES), X.cls), ['cls']),
    h('span', { class: 'cap', text: t('roster.part.inventory') }),
    f.field(lab('roster.tricks'), trickPicker(X.tricks || [], (ids) => f.set(['tricks'], ids)), ['tricks']),
    diceField(f, X.dice),
    f.field(lab('roster.worth'), f.number(['worth'], X.worth ?? 200, { min: 1 }), ['worth']),
    f.field(lab('roster.wallet'), f.select(['wallet'], optsOf(D.WALLETS), X.wallet || 'worn_cloth'), ['wallet']),
    f.field(lab('roster.jacket'), f.select(['jacket'], Object.entries(D.JACKETS).filter(([, J]) => !J.cls || J.cls === X.cls).map(([k, J]) => [k, J.name]), X.jacket || 'standard'), ['jacket']),
    f.field(lab('roster.rollerLayout'), stakeBoard({ dims: R.posDims(X), layout: X.layout, set: (v) => B.setValue(D.subPath(D.subPath('ROLLERS', id), 'layout'), v), done: redraw, who: 'roller' }), ['layout']),
    h('span', { class: 'cap', text: t('roster.part.sign') }), h('p', { class: 'sub', text: t('roster.sign.you') }),
    signEditor(D.subPath(D.subPath('ROLLERS', id), 'sign'), 'you', X.sign, redraw, [X.name, K?.name || ''])),
  h('div', {}, h('span', { class: 'cap', text: t('maker.preview') }), h('div', { class: 'b-card', style: { '--cc': K?.color } }, h('b', { text: D.heroName(X.cls, id) }), h('p', { text: D.classRule(X.cls) }),
    h('p', { text: t('roster.roller.walksIn', { worth: X.worth ?? 200, wallet: D.WALLETS[X.wallet]?.name || '', jacket: D.JACKETS[X.jacket]?.name || '' }) }),
    h('div', { class: 'dicebox' }, dice.map((type) => dieEl({ type }, '', 'mini'))), h('div', { class: 'row wrap tags' }, ...(X.tricks || []).filter((k) => D.TRICKS[k]).map((k) => trickTag({ id: k, q: 1 }, X.cls)))),
  h('p', { class: 'sub', text: t('roster.roller.note') })));
}
export const rollerLabel = (id) => D.ROLLERS[id]?.name || id;
export const rollerSub = (id) => D.CLASSES[D.ROLLERS[id]?.cls]?.name || t('roster.noClass');

// the shared looks: every Roller's seat, every opponent's (unless it has its own) and the House's sign
export const SHARED_SIGNS = { '@you': 'you', '@them': 'them', '@house': 'house' };
export function sharedSign(key, redraw) {
  const who = SHARED_SIGNS[key];
  return h('div', { class: 'col neon-maker' }, h('p', { class: 'sub', text: t(`neon.sub.${who}`) }), signEditor(`NEON.${who}`, who, D.NEON[who], redraw));
}

// ---------- the roster ----------
export function newOpponent(boss) {
  const id = ask(t('roster.newId'), boss ? 'my_high_roller' : 'my_roller', D.ROSTER); if (!id) return null;
  B.setValue(D.subPath('ROSTER', id), JSON.parse(JSON.stringify(boss ? NEW_BOSS : NEW_OPPONENT))); return id;
}
// what this entry brings to a table on one of its floors, generated the way the game does it
function preview(id) {
  const X = D.ROSTER[id], floor = X.floors?.[0] || 1;
  try {
    const run = R.newRun('hustler', 'standard', 1); run.floor = floor;
    const o = R.genOpponent(run, floor, X.boss ? D.FLOORS[floor].boss : D.FLOORS[floor].worth[(X.tables?.[0]) || 0], { roster: id, name: X.name, ...(X.cls ? { cls: X.cls } : {}), ...(X.boss ? { boss: true } : {}) });
    return h('div', { class: 'b-card' }, h('b', { text: o.name }), h('p', { class: 'dim', text: t('roster.preview.floor', { floor: D.FLOORS[floor].name }) }),
      h('p', { text: `${D.CLASSES[o.cls].name} · ${o.worth}¢ · ${o.dims.cols}×${o.dims.barRows} Stake, stacks of ${o.dims.stackMax}` }),
      h('p', { text: diceSummary(o.dice) }), h('div', { class: 'row wrap tags' }, ...o.tricks.filter((x) => D.TRICKS[x.id]).map((x) => trickTag(x, o.cls))),
      o.drink ? h('p', { text: `${t('roster.drink')}: ${o.drink.name}` }) : null,
      h('p', { class: 'dim', text: Object.entries(o.behave).filter(([k, v]) => v !== D.DEFAULT_BEHAVE[k]).map(([k, v]) => D.BEHAVE[k][v]).join(' · ') || t('roster.balanced') }));
  } catch (err) { return h('p', { class: 'bad', text: String(err.message || err) }); }
}
export function rosterMaker(id, redraw) {
  const X = D.ROSTER[id]; if (!X) return h('p', { class: 'sub', text: t('maker.none') });
  const f = form(D.subPath('ROSTER', id), redraw), beh = { ...D.DEFAULT_BEHAVE, ...(X.behave || {}) };
  const opt = (o, none) => [...(none ? [[null, none]] : []), ...Object.entries(o).map(([k, v]) => [k, typeof v === 'string' ? v : v.name])];
  const chips = Object.entries(X.chips || {});
  const parts = [
    h('span', { class: 'cap', text: t('roster.part.who') }),
    f.field(lab('roster.oppName'), f.text(['name'], X.name), ['name']),
    flavorField('ROSTER', id, redraw),
    f.field(lab('maker.cls'), f.select(['cls'], [...(X.cls && D.CLASSES[X.cls] ? [] : [[null, t('roster.pickClass')]]), ...opt(D.CLASSES)], X.cls), ['cls']),
    f.field(lab('roster.floors'), f.checks(['floors'], [1, 2, 3, 4].map((n) => [n, D.FLOORS[n].name]), X.floors || [1, 2, 3, 4]), ['floors']),
    X.boss ? f.field(lab('roster.trait'), f.select(['trait'], opt(D.BOSS_TRAITS, t('roster.none')), X.trait), ['trait']) : null,
    X.boss ? null : f.field(lab('roster.tables'), f.checks(['tables'], [0, 1, 2].map((n) => [n, t('floor.table.name', { n: n + 1 })]), X.tables || [0, 1, 2]), ['tables']),
    h('span', { class: 'cap', text: t('roster.part.inventory') }),
    f.field(lab('roster.ownTricks'), h('div', {}, trickPicker(X.tricks || [], (ids) => f.set(['tricks'], ids.length ? ids : null)), h('p', { class: 'sub', text: t(X.tricks?.length ? 'roster.ownTricks.on' : 'roster.ownTricks.off') })), ['tricks']),
    diceField(f, X.dice),
    f.field(lab('roster.purse'), f.number(['purse'], X.purse, { min: 0, ph: t('roster.purse.floor') }), ['purse']),
    f.field(lab('roster.wallet'), f.select(['wallet'], opt(D.WALLETS, t('roster.none')), X.wallet), ['wallet']),
    f.field(lab('roster.jacket'), f.select(['jacket'], opt(D.JACKETS, t('roster.none')), X.jacket), ['jacket']),
    f.field(lab('roster.drink'), f.select(['drink'], [[null, t('roster.none')], ...D.DRINKS.map((d) => [d.id, d.name])], X.drink), ['drink']),
    f.field(lab('roster.chips'), h('div', { class: 'b-list' }, ...chips.map(([cid, n]) => h('div', { class: 'row b-list-row' }, h('span', { text: D.SHOP_CHIPS[cid]?.name || cid }),
      f.number(null, n, { min: 0, w: '70px', on: (v) => f.set(['chips'], { ...X.chips, [cid]: Math.max(0, v | 0) }) }),
      btn('✕', () => { const c = { ...X.chips }; delete c[cid]; f.set(['chips'], c); }, null, 'small'))),
      f.select(null, [[null, t('chipmaker.add')], ...Object.entries(D.SHOP_CHIPS).filter(([k]) => !X.chips?.[k]).map(([k, v]) => [k, v.name])], null, (v) => v && f.set(['chips'], { ...(X.chips || {}), [v]: 1 }))), ['chips']),
    f.field(lab('roster.spacing'), f.select(['deploy', 'spacing'], [['row', t('roster.sp.row')], ['column', t('roster.sp.column')], ['random', t('roster.sp.random')]], X.deploy?.spacing || 'row'), ['deploy']),
    f.field(lab('roster.stacking'), f.select(['deploy', 'stacking'], [['maxed', t('roster.st.maxed')], ['balanced', t('roster.st.balanced')], ['random', t('roster.st.random')]], X.deploy?.stacking || 'maxed'), null),
    f.field(lab('roster.layout'), stakeBoard({ dims: R.posDims(X), layout: X.layout, set: (v) => B.setValue(D.subPath(D.subPath('ROSTER', id), 'layout'), v), done: redraw, effects: true, who: 'opponent' }), ['layout']),
    h('span', { class: 'cap', text: t('roster.part.behave') }),
    ...Object.keys(D.BEHAVE).map((k) => f.field(lab(`roster.beh.${k}`), f.select(['behave', k], opt(D.BEHAVE[k]), beh[k]), ['behave', k])),
    // its neon sign at the table: laid over the opponents' shared look (the first entry in this list)
    h('span', { class: 'cap', text: t('roster.part.sign') }), h('p', { class: 'sub', text: t('roster.sign.note') }),
    signEditor(D.subPath(D.subPath('ROSTER', id), 'sign'), 'them', X.sign, redraw, [X.name, X.boss ? t('run.high-roller') : D.CLASSES[X.cls]?.name || '']),
  ];
  if (X.boss) {
    const phases = X.phases || [];
    parts.push(h('span', { class: 'cap', text: t('roster.part.phases') }), h('p', { class: 'sub', text: t('roster.phases.note') }),
      ...phases.map((P, i) => { const upd = (np) => f.set(['phases'], phases.map((y, j) => (j === i ? np : y)));
        return h('div', { class: 'b-phase' }, h('div', { class: 'row' }, h('b', { text: t('roster.phase', { n: i + 1 }) }), h('span', { class: 'sub', text: t('roster.phase.below') }),
          f.number(null, Math.round((P.below ?? 0.5) * 100), { min: 1, w: '70px', on: (v) => upd({ ...P, below: Math.max(0.01, Math.min(1, (v || 50) / 100)) }) }), h('span', { text: '%' }),
          btn('✕', () => f.set(['phases'], phases.filter((_, j) => j !== i)), null, 'small')),
        h('div', { class: 'row wrap' }, ...['temper', 'draw', 'bid', 'bluff', 'aim'].map((k) => f.select(null, [[null, `${t(`roster.beh.${k}`)}: ${t('roster.unchanged')}`], ...opt(D.BEHAVE[k])], P.behave?.[k] ?? null,
          (v) => { const nb = { ...(P.behave || {}) }; if (v) nb[k] = v; else delete nb[k]; upd({ ...P, behave: nb }); }))),
        h('div', { class: 'row' }, h('span', { class: 'sub', text: t('roster.cheat') }), f.number(null, P.cheat?.dice ?? 0, { min: 0, w: '60px', on: (v) => upd({ ...P, cheat: { ...(P.cheat || {}), dice: v | 0 } }) }), h('span', { class: 'sub', text: t('roster.cheat.dice') }),
          f.number(null, P.cheat?.tricks ?? 0, { min: 0, w: '60px', on: (v) => upd({ ...P, cheat: { ...(P.cheat || {}), tricks: v | 0 } }) }), h('span', { class: 'sub', text: t('roster.cheat.tricks') }))); }),
      btn(t('roster.phase.add'), () => f.set(['phases'], [...phases, { below: phases.length ? Math.max(0.05, (phases[phases.length - 1].below || 0.5) / 2) : 0.5, behave: { temper: 'rabid' }, cheat: { dice: 1, tricks: 0 } }]), null, 'small'));
  }
  return h('div', { class: 'b-maker' }, h('div', { class: 'b-fields' }, parts), h('div', {}, h('span', { class: 'cap', text: t('roster.preview') }), preview(id), h('p', { class: 'sub', text: t('roster.preview.note') })));
}
const idOf = (X) => Object.keys(D.ROSTER).find((k) => D.ROSTER[k] === X);
export const rosterLabel = (id) => { const X = D.ROSTER[id]; return `${X.boss ? '👑 ' : ''}${X.name}`; };
export const rosterSub = (id) => { const X = D.ROSTER[id]; return `${D.CLASSES[X.cls]?.name || t('roster.noClass')} · ${(X.floors || [1, 2, 3, 4]).map((n) => 'F' + n).join(' ')}`; };
void isObj;
