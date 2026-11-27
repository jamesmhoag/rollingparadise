// Build mode: change the game's content, see it in play, and export the changes to put into the project.
// This screen edits any table in D.TABLES field by field. The trick, chip, opponent and tuning tools build on it.
import { h, btn, toast, openPanel, closePanel, guided } from './core.js';
import { app } from './app.js';
import * as D from '../data.js';
import * as B from '../build/draft.js';
import { t } from '../text.js';
import { trickMaker, newTrick } from './trickmaker.js';
import { chipMaker, newChip } from './chipmaker.js';
import { classicChips } from '../chipmodel.js';
import { tuner, TUNER_SECTIONS } from './tuner.js';
import { shopMaker, SHOP_PAGES } from './shopmaker.js';
import { cardMaker, cardList, CORNER } from './cardmaker.js';
import { testTable } from './testtable.js';
import { IMMUNE } from '../content/chipmaker.js';
import { classMaker, newClass, rollerMaker, newRoller, rollerLabel, rollerSub, rosterMaker, newOpponent, rosterLabel, rosterSub, sharedSign, SHARED_SIGNS } from './rostermaker.js';
import { isMade } from '../trickmaker.js';
import { fieldHelp } from '../build/help.js';

// the tables, grouped as the editor lists them
const GROUPS = [
  ['build.group.rollers', ['CLASSES', 'ROLLERS', 'BASE_DIMS', 'STATS']],
  ['build.group.tricks', ['TRICKS', 'TYPES', 'CONDITIONS', 'PACKS', 'QDIE']],
  ['build.group.chips', ['CHIPS', 'SHOP_CHIPS', 'CHIP_TIERS', 'CREATURES', 'ORBITALS', 'CALAMITIES']],
  ['build.group.dice', ['DICE', 'MATERIALS', 'DICE_SHOP', 'BONE', 'MELT', 'CASTS', 'DYES', 'DIAMOND', 'DIE_VARS']],
  ['build.group.floors', ['FLOORS', 'FELTS', 'TILTS', 'TILT_PRESSURE', 'PRIZES']],
  ['build.group.shops', ['DRINKS', 'SPORTS', 'ODDS', 'JACKETS', 'WALLETS', 'PASSES', 'DENOMS', 'WEAR']],
  ['build.group.words', ['TEXT', 'GUIDE']],
];
const isObj = (x) => x && typeof x === 'object';
// a table of entries (each one an object) is listed entry by entry; anything else is edited as one block
const entriesOf = (tb) => { const T = D.TABLES[tb]; const vals = Object.entries(T).filter(([, v]) => v != null);
  return vals.length && vals.filter(([, v]) => isObj(v) && !Array.isArray(v)).length >= vals.length * 0.6 ? vals.map(([k]) => k) : null; };
// What a list's items name, so the list is edited by picking them rather than typing ids: by the field's name, or by
// the table every item already belongs to. Each source gives [[id, label], ...].
const named = (o) => Object.entries(o || {}).map(([k, v]) => [k, typeof v === 'string' ? v : v?.name || k]);
const LIST_REFS = {
  tricks: () => named(D.TRICKS), mats: () => named(D.MATERIALS), from: (path) => (path.startsWith('DYES') ? named(D.DYES) : named(D.MATERIALS)), needs: () => named(D.DYES),
  also: () => named(D.CHIPS), weather: () => [...named(D.ORBITALS), ...named(D.CALAMITIES)], immune: () => named(IMMUNE),
  pair: () => [...new Set(Object.values(D.CASTS).map((c) => c.fx).filter((x) => x && x !== 'pair'))].map((k) => [k, k]),
  floors: () => [1, 2, 3, 4].map((n) => [n, D.FLOORS[n]?.name || `Floor ${n}`]), cards: () => named(D.CARDS), dice: () => Object.keys(D.DICE).map((k) => [k, k]),
};
function listRef(path, v) {
  const key = D.splitPath(path).filter((k) => !/^\d+$/.test(k)).pop();
  if (LIST_REFS[key]) return LIST_REFS[key](path);
  if (v.length && v.every((x) => typeof x === 'string')) { // every item is an id in one table
    const tb = Object.keys(D.TABLES).find((k) => !['TEXT', 'GUIDE', 'FLAVOR', 'TUNING'].includes(k) && isObj(D.TABLES[k]) && !Array.isArray(D.TABLES[k]) && v.every((x) => x in D.TABLES[k]));
    if (tb) return named(D.TABLES[tb]);
  }
  return null;
}
const label = (tb, k) => { const v = D.TABLES[tb][k]; return isObj(v) && typeof v.name === 'string' ? v.name : k; };

export function buildScene(root, opts = {}) {
  const ui = { tool: opts.tool || 'tricks', table: 'CLASSES', key: null, filter: '' }; // tool: 'tricks' (the trick maker) or 'tables'
  const status = h('span', { class: 'sub' }), tables = h('div', { class: 'b-tables' }), entries = h('div', { class: 'b-entries' }), editor = h('div', { class: 'b-editor' });
  const filter = h('input', { class: 'b-filter', placeholder: t('build.filter'), oninput: (e) => { ui.filter = e.target.value.toLowerCase(); drawEntries(); } });
  const fileIn = h('input', { type: 'file', accept: '.js,.json', style: { display: 'none' }, onchange: (e) => importFile(e.target.files[0]) });
  root.append(h('div', { class: 'page build', style: { top: 0, padding: '18px 26px' } },
    h('div', { class: 'row between' }, h('div', {}, h('h1', { text: t('build.title') }), status),
      h('div', { class: 'row' }, btn(t('build.import'), () => fileIn.click(), t('build.import.tip'), 'small'), btn(t('build.export'), () => exportFile(), t('build.export.tip'), 'small go'),
        btn(t('build.discard'), () => discardAll(), t('build.discard.tip'), 'small danger'), btn(t('build.back'), () => app.nav.title(), null, 'small'), fileIn)),
    h('div', { class: 'b-cols' }, tables, h('div', { class: 'b-mid' }, filter, entries), editor)));

  function drawStatus() { const n = B.count(); status.textContent = n ? t('build.status', { n }) : t('build.status.none'); }
  function drawTables() {
    const tool = (k, label) => h('button', { class: `b-item tool ${ui.tool === k ? 'on' : ''}`, text: label, onclick: () => { ui.tool = k; ui.key = null; ui.filter = ''; filter.value = ''; draw(); } });
    tables.replaceChildren(h('span', { class: 'cap', text: t('build.group.makers') }), tool('tricks', t('maker.title')), tool('chips', t('chipmaker.title')), tool('classes', t('roster.class.title')), tool('rollers', t('roster.roller.title')), tool('roster', t('roster.title')), tool('shops', t('shops.title')), tool('cards', t('cards.title')), tool('tuner', t('tuner.title')), tool('test', t('test.title')),
      ...GROUPS.flatMap(([g, list]) => [h('span', { class: 'cap', text: t(g) }),
      ...list.filter((tb) => D.TABLES[tb]).map((tb) => h('button', { class: `b-item ${ui.tool === 'tables' && ui.table === tb ? 'on' : ''} ${B.changed(tb) ? 'ch' : ''}`, text: t(`build.table.${tb}`), onclick: () => { ui.tool = 'tables'; ui.table = tb; ui.key = null; ui.filter = ''; filter.value = ''; draw(); } }))]));
  }
  function drawEntries() {
    if (ui.tool === 'test') { filter.style.display = 'none'; entries.replaceChildren(h('p', { class: 'sub', text: t('test.side') })); return; }
    if (ui.tool === 'cards') {
      filter.style.display = ''; if (!ui.key || !(D.CARDS[ui.key] || ui.key === CORNER || (ui.key.startsWith('biz:') && D.BOSS_TRAITS[ui.key.slice(4)]))) ui.key = Object.keys(D.CARDS)[0];
      entries.replaceChildren(...cardList(ui.key, (k) => { ui.key = k; draw(); }, ui.filter)); return;
    }
    if (ui.tool === 'shops') {
      filter.style.display = 'none'; if (!SHOP_PAGES.includes(ui.key)) ui.key = SHOP_PAGES[0];
      entries.replaceChildren(...SHOP_PAGES.map((k) => h('button', { class: `b-item ${ui.key === k ? 'on' : ''} ${B.changed(D.subPath('SHOPS', k)) ? 'ch' : ''}`, onclick: () => { ui.key = k; draw(); } }, h('b', { text: t(`shops.${k}`) }), h('small', { text: t(`shops.${k}.sub`) }))));
      return;
    }
    if (ui.tool === 'tuner') {
      filter.style.display = 'none'; if (!TUNER_SECTIONS.includes(ui.key)) ui.key = TUNER_SECTIONS[0];
      entries.replaceChildren(...TUNER_SECTIONS.map((k) => h('button', { class: `b-item ${ui.key === k ? 'on' : ''} ${B.changed(D.subPath('TUNING', k)) ? 'ch' : ''}`, onclick: () => { ui.key = k; draw(); } }, h('b', { text: t(`tuner.${k}`) }))));
      return;
    }
    if (ui.tool === 'classes' || ui.tool === 'rollers' || ui.tool === 'roster') {
      const roster = ui.tool === 'roster', rollers = ui.tool === 'rollers', table = roster ? 'ROSTER' : rollers ? 'ROLLERS' : 'CLASSES', T = D[table], keys = Object.keys(T); filter.style.display = '';
      const shared = roster ? ['@them', '@house'] : rollers ? ['@you'] : [];
      if (!ui.key || !(T[ui.key] || shared.includes(ui.key))) ui.key = keys[0];
      const lab = (k) => (roster ? rosterLabel(k) : rollers ? rollerLabel(k) : T[k].name), sub = (k) => (roster ? rosterSub(k) : rollers ? rollerSub(k) : t('roster.class.usedBy', { n: Object.values(D.ROLLERS).concat(Object.values(D.ROSTER)).filter((x) => x.cls === k).length }));
      const item = (k) => h('button', { class: `b-item ${ui.key === k ? 'on' : ''} ${B.changed(D.subPath(table, k)) ? 'ch' : ''}`, onclick: () => { ui.key = k; draw(); } }, h('b', { text: lab(k) }), h('small', { text: sub(k) }));
      const signItem = (k) => h('button', { class: `b-item sign-item ${ui.key === k ? 'on' : ''} ${B.changed(D.subPath('NEON', SHARED_SIGNS[k])) ? 'ch' : ''}`, onclick: () => { ui.key = k; draw(); } }, h('b', { text: t(`neon.list.${SHARED_SIGNS[k]}`) }), h('small', { text: t('neon.list.sub') }));
      const shown = keys.filter((k) => !ui.filter || `${k} ${lab(k)}`.toLowerCase().includes(ui.filter));
      entries.replaceChildren(...(roster ? [btn(t('roster.new'), () => { const id = newOpponent(false); if (id) { ui.key = id; draw(); } }, null, 'small go'), btn(t('roster.newBoss'), () => { const id = newOpponent(true); if (id) { ui.key = id; draw(); } }, null, 'small'),
        h('span', { class: 'cap', text: t('neon.list.cap') }), ...shared.map(signItem),
        h('span', { class: 'cap', text: t('roster.list.tables') }), ...shown.filter((k) => !T[k].boss).map(item),
        ...[1, 2, 3, 4].flatMap((n) => { const bs = shown.filter((k) => T[k].boss && (T[k].floors || []).includes(n)); return bs.length ? [h('span', { class: 'cap', text: t('roster.list.bosses', { floor: D.FLOORS[n].name }) }), ...bs.map(item)] : []; })]
        : rollers ? [btn(t('roster.roller.new'), () => { const id = newRoller(T[ui.key] ? ui.key : null); if (id) { ui.key = id; draw(); } }, null, 'small go'), h('span', { class: 'cap', text: t('neon.list.cap') }), ...shared.map(signItem), h('span', { class: 'cap', text: t('roster.list.rollers') }), ...shown.map(item)]
        : [btn(t('roster.class.new'), () => { const id = newClass(ui.key); if (id) { ui.key = id; draw(); } }, null, 'small go'), ...shown.map(item)]));
      return;
    }
    if (ui.tool === 'chips') {
      const made = Object.keys(D.MADE_CHIPS), old = classicChips(); filter.style.display = '';
      if (!ui.key || (!D.MADE_CHIPS[ui.key] && !old.some((c) => c.id === ui.key))) ui.key = made[0] || old[0]?.id;
      const hit = (k, name) => !ui.filter || `${k} ${name}`.toLowerCase().includes(ui.filter);
      const item = (k, name, sub) => h('button', { class: `b-item ${ui.key === k ? 'on' : ''} ${B.changed(D.subPath('MADE_CHIPS', k)) ? 'ch' : ''}`, onclick: () => { ui.key = k; draw(); } }, h('b', { text: name }), h('small', { text: sub }));
      entries.replaceChildren(btn(t('chipmaker.new'), () => { const id = newChip(); if (id) { ui.key = id; draw(); } }, t('chipmaker.new.tip'), 'small go'),
        h('span', { class: 'cap', text: t('chipmaker.made') }), ...(made.length ? made.filter((k) => hit(k, D.MADE_CHIPS[k].name)).map((k) => item(k, D.MADE_CHIPS[k].name, t('chipmaker.madeSub', { v: D.MADE_CHIPS[k].value ?? 0 }))) : [h('p', { class: 'sub', text: t('chipmaker.noneMade') })]),
        h('span', { class: 'cap', text: t('chipmaker.classic') }), ...old.filter((c) => hit(c.id, c.name)).map((c) => item(c.id, c.name, c.category || '')));
      return;
    }
    if (ui.tool === 'tricks') {
      const keys = Object.keys(D.TRICKS); if (!ui.key || !D.TRICKS[ui.key]) ui.key = keys[0]; filter.style.display = '';
      const shown = keys.filter((k) => !ui.filter || `${k} ${D.TRICKS[k].name}`.toLowerCase().includes(ui.filter));
      entries.replaceChildren(btn(t('maker.new'), () => { const id = newTrick(); if (id) { ui.key = id; draw(); } }, t('maker.new.tip'), 'small go'),
        ...shown.map((k) => h('button', { class: `b-item ${ui.key === k ? 'on' : ''} ${B.changed(D.subPath('TRICKS', k)) ? 'ch' : ''}`, onclick: () => { ui.key = k; draw(); } },
          h('b', { text: D.TRICKS[k].name }), h('small', { text: `${D.TYPES[D.TRICKS[k].type]?.name || D.TRICKS[k].type} · ${isMade(D.TRICKS[k]) ? t('maker.made') : t('maker.classic')}` }))));
      return;
    }
    const keys = entriesOf(ui.table);
    filter.style.display = keys ? '' : 'none';
    if (!keys) { entries.replaceChildren(h('p', { class: 'sub', text: t('build.oneBlock') })); return; }
    if (!ui.key || !keys.includes(ui.key)) ui.key = keys[0];
    const shown = keys.filter((k) => !ui.filter || `${k} ${label(ui.table, k)}`.toLowerCase().includes(ui.filter));
    entries.replaceChildren(...shown.map((k) => h('button', { class: `b-item ${ui.key === k ? 'on' : ''} ${B.changed(D.subPath(ui.table, k)) ? 'ch' : ''}`, onclick: () => { ui.key = k; draw(); } },
      h('b', { text: label(ui.table, k) }), label(ui.table, k) !== k ? h('small', { text: k }) : null)));
  }
  function drawEditor() {
    if (ui.tool === 'test') { editor.replaceChildren(h('h2', { text: t('test.title') }), testTable(draw, (o) => app.nav.test(o))); return; }
    if (ui.tool === 'cards') { const nm = ui.key === CORNER ? t('cards.corner') : ui.key.startsWith('biz:') ? D.BOSS_TRAITS[ui.key.slice(4)].name : D.CARDS[ui.key]?.name || '';
      editor.replaceChildren(h('h2', { text: nm }), h('p', { class: 'sub mono', text: ui.key === CORNER ? 'SHADY · CARDS.*.corner' : ui.key.startsWith('biz:') ? D.subPath('BOSS_TRAITS', ui.key.slice(4)) : D.subPath('CARDS', ui.key) }),
        cardMaker(ui.key, draw, (tb) => { ui.tool = 'tables'; ui.table = tb; ui.key = null; draw(); })); return; }
    if (ui.tool === 'shops') { editor.replaceChildren(h('h2', { text: t(`shops.${ui.key}`) }), h('p', { class: 'sub mono', text: D.subPath('SHOPS', ui.key) }), shopMaker(ui.key, draw, (tb) => { ui.tool = 'tables'; ui.table = tb; ui.key = null; draw(); })); return; }
    if (ui.tool === 'tuner') { editor.replaceChildren(h('h2', { text: t(`tuner.${ui.key}`) }), h('p', { class: 'sub mono', text: ui.key === 'gear' ? '' : D.subPath('TUNING', ui.key) }), tuner(ui.key, draw, (tb) => { ui.tool = 'tables'; ui.table = tb; ui.key = null; draw(); })); return; }
    if ((ui.tool === 'rollers' || ui.tool === 'roster') && SHARED_SIGNS[ui.key]) { editor.replaceChildren(h('h2', { text: t(`neon.list.${SHARED_SIGNS[ui.key]}`) }), h('p', { class: 'sub mono', text: `NEON.${SHARED_SIGNS[ui.key]}` }), sharedSign(ui.key, draw)); return; }
    if (ui.tool === 'classes') { editor.replaceChildren(h('h2', { text: D.CLASSES[ui.key].name }), h('p', { class: 'sub mono', text: D.subPath('CLASSES', ui.key) }), classMaker(ui.key, draw)); return; }
    if (ui.tool === 'rollers') { editor.replaceChildren(h('h2', { text: D.heroName(D.ROLLERS[ui.key].cls, ui.key) }), h('p', { class: 'sub mono', text: D.subPath('ROLLERS', ui.key) }), rollerMaker(ui.key, draw)); return; }
    if (ui.tool === 'roster') { editor.replaceChildren(h('h2', { text: rosterLabel(ui.key) }), h('p', { class: 'sub mono', text: D.subPath('ROSTER', ui.key) }), rosterMaker(ui.key, draw)); return; }
    if (ui.tool === 'chips') {
      const old = classicChips().find((c) => c.id === ui.key), name = D.MADE_CHIPS[ui.key]?.name || old?.name || '';
      editor.replaceChildren(h('h2', { text: name }), h('p', { class: 'sub mono', text: old ? t('chipmaker.mappedFrom') : D.subPath('MADE_CHIPS', ui.key) }),
        chipMaker(ui.key, old, draw, (c) => { const id = newChip(c); if (id) { ui.key = id; draw(); } })); return;
    }
    if (ui.tool === 'tricks') { editor.replaceChildren(h('h2', { text: D.TRICKS[ui.key]?.name || '' }), h('p', { class: 'sub mono', text: D.subPath('TRICKS', ui.key) }), trickMaker(ui.key, draw)); return; }
    const keys = entriesOf(ui.table), path = keys ? D.subPath(ui.table, ui.key) : ui.table, v = D.getPath(path);
    editor.replaceChildren(
      h('div', { class: 'row between' }, h('h2', { text: keys ? label(ui.table, ui.key) : t(`build.table.${ui.table}`) }),
        keys ? btn(t('build.duplicate'), () => duplicate(), t('build.duplicate.tip'), 'small') : null),
      h('p', { class: 'sub mono', text: path }),
      h('div', { class: 'b-fields' }, fields(path, v, 0)));
  }
  // a field's label, with its hover: what the value is for (build/help.js)
  const fieldLabel = (path, k) => { const tipHtml = fieldHelp(path); return h('label', { text: k, class: tipHtml ? 'b-lab has-help' : '', ...(tipHtml ? { tip: tipHtml, guide: 'build-option' } : {}) }); };
  // one field per value: text, number, on/off, a list, or a group of fields
  function fields(path, v, depth) {
    if (typeof v === 'function') return h('p', { class: 'dim', text: t('build.inCode') });
    if (isObj(v) && depth < 4 && !(Array.isArray(v) && v.every((x) => !isObj(x)))) {
      return h('div', { class: 'b-group' }, Object.entries(v).map(([k, x]) => h('div', { class: `b-field ${B.changed(D.subPath(path, k)) ? 'ch' : ''}` },
        fieldLabel(D.subPath(path, k), k), fields(D.subPath(path, k), x, depth + 1), revertBtn(D.subPath(path, k)))));
    }
    return input(path, v);
  }
  function input(path, v) {
    const set = (x) => { B.setValue(path, x); drawStatus(); drawTables(); drawEntries(); drawEditor(); };
    if (typeof v === 'boolean') return h('input', { type: 'checkbox', ...(v ? { checked: 'checked' } : {}), onchange: (e) => set(e.target.checked) });
    if (typeof v === 'number') return h('input', { type: 'number', step: 'any', value: v, onchange: (e) => { const n = Number(e.target.value); if (Number.isFinite(n)) set(n); else toast(t('build.notNumber'), 'warn'); } });
    if (Array.isArray(v)) return listInput(path, v, set);
    if (v == null) return h('input', { type: 'text', value: '', placeholder: t('build.none'), onchange: (e) => set(e.target.value.trim() === '' ? null : e.target.value.trim()) });
    if (isObj(v)) return h('textarea', { class: 'mono', rows: 3, text: JSON.stringify(v), onchange: (e) => { try { set(JSON.parse(e.target.value)); } catch { toast(t('build.notJson'), 'warn'); } } });
    if (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)) return h('div', { class: 'row' }, h('input', { type: 'color', value: v, onchange: (e) => set(e.target.value) }), h('input', { type: 'text', value: v, style: { width: '96px' }, onchange: (e) => (/^#[0-9a-f]{6}$/i.test(e.target.value.trim()) ? set(e.target.value.trim()) : toast(t('build.notColour'), 'warn')) }));
    const long = String(v).length > 48;
    return h(long ? 'textarea' : 'input', { ...(long ? { rows: Math.min(6, Math.ceil(String(v).length / 60)), text: v } : { type: 'text', value: v }), onchange: (e) => set(e.target.value) });
  }
  // a list, item by item: picked from what it names (tricks, materials, chips...), colours as colour pickers, numbers
  // as numbers, and anything else (names, tags) as one box per item, offered the values already used in its table
  function listInput(path, v, set) {
    const ref = listRef(path, v), nums = v.length ? v.every((x) => typeof x === 'number') : ref ? ref.every(([k]) => typeof k === 'number') : false;
    const colours = v.length && v.every((x) => typeof x === 'string' && /^#[0-9a-f]{6}$/i.test(x));
    const put = (i, x) => set(v.map((y, j) => (j === i ? x : y))), drop = (i) => set(v.filter((_, j) => j !== i)), add = (x) => set([...v, x]);
    const nameOf = (x) => ref?.find(([k]) => String(k) === String(x))?.[1];
    const items = v.map((x, i) => h('span', { class: `row b-li ${ref && nameOf(x) == null ? 'bad' : ''}` },
      ref ? h('select', { onchange: (e) => put(i, nums ? Number(e.target.value) : e.target.value) }, ...(nameOf(x) == null ? [h('option', { value: x, text: t('build.list.unknown', { id: x }), selected: 'selected' })] : []),
        ...ref.map(([k, l]) => h('option', { value: k, text: l, ...(String(k) === String(x) ? { selected: 'selected' } : {}) })))
        : colours ? h('input', { type: 'color', value: x, onchange: (e) => put(i, e.target.value) })
        : nums ? h('input', { type: 'number', step: 'any', value: x, style: { width: '84px' }, onchange: (e) => { const n = Number(e.target.value); if (Number.isFinite(n)) put(i, n); else toast(t('build.notNumber'), 'warn'); } })
        : h('input', { type: 'text', value: x, list: `dl-${path}`, onchange: (e) => (e.target.value.trim() ? put(i, e.target.value.trim()) : drop(i)) }),
      colours ? null : btn('✕', () => drop(i), t('build.list.drop'), 'small')));
    const seen = ref || colours || nums ? null : [...new Set(Object.values(D.TABLES[D.splitPath(path)[0]] || {}).flatMap((e) => (isObj(e) ? Object.values(e) : [])).filter(Array.isArray).flat().filter((x) => typeof x === 'string'))];
    const adder = colours ? null : ref ? h('select', { onchange: (e) => e.target.value !== '' && add(nums ? Number(e.target.value) : e.target.value) }, h('option', { value: '', text: t('build.list.add') }), ...ref.filter(([k]) => !v.some((x) => String(x) === String(k))).map(([k, l]) => h('option', { value: k, text: l })))
      : nums ? btn('+', () => add(v.length ? v[v.length - 1] : 0), t('build.list.add'), 'small')
      : h('input', { type: 'text', placeholder: t('build.list.add'), list: `dl-${path}`, onchange: (e) => e.target.value.trim() && add(e.target.value.trim()) });
    return h('div', { class: 'row wrap b-list-edit' }, ...items, adder, seen ? h('datalist', { id: `dl-${path}` }, ...seen.map((x) => h('option', { value: x }))) : null);
  }
  function revertBtn(path) {
    if (!(path in B.draft.changes)) return null;
    return btn('↺', () => { B.revert(path); draw(); }, t('build.revert.tip', { was: JSON.stringify(B.draft.orig[path]) ?? '—' }), 'small b-revert');
  }
  function duplicate() {
    const id = (globalThis.prompt?.(t('build.duplicate.ask'), `${ui.key}_copy`) || '').trim();
    if (!id) return; if (!/^\w+$/.test(id)) return toast(t('build.duplicate.badId'), 'warn');
    if (D.TABLES[ui.table][id] !== undefined) return toast(t('build.duplicate.taken', { id }), 'warn');
    const copy = JSON.parse(JSON.stringify(D.TABLES[ui.table][ui.key])); if (typeof copy.name === 'string') copy.name += ' (copy)';
    B.setValue(D.subPath(ui.table, id), copy); ui.key = id; draw(); toast(t('build.duplicate.done', { id }));
  }
  function exportFile() {
    const text = B.overridesFile(), a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'text/javascript' })), download: 'overrides.js' });
    document.body.append(a); a.click(); a.remove();
    openPanel(h('div', { class: 'col' }, h('h2', { text: t('build.export.title') }), h('p', { html: t('build.export.how', { n: Object.keys(B.allChanges()).length }) }),
      h('textarea', { class: 'mono b-export', rows: 12, readonly: 'readonly', text }), h('div', { class: 'row' }, btn(t('build.export.copy'), () => { globalThis.navigator?.clipboard?.writeText(text); toast(t('build.export.copied')); }, null, 'small'), btn(t('howto.done'), () => closePanel(), null, 'small go'))));
  }
  function importFile(file) {
    if (!file) return; file.text().then((text) => { const n = B.importChanges(B.parseChanges(text)); toast(t('build.import.done', { n })); draw(); }).catch((e) => toast(t('build.import.bad', { why: e.message }), 'warn'));
  }
  function discardAll() {
    if (!B.count()) return toast(t('build.status.none'));
    openPanel(h('div', { class: 'col' }, h('h2', { text: t('build.discard.ask') }), h('p', { class: 'sub', text: t('build.discard.warn', { n: B.count() }) }),
      h('div', { class: 'row' }, btn(t('build.discard.keep'), () => closePanel(), null, 'go'), btn(t('build.discard'), () => { B.discard(); closePanel(); draw(); }, null, 'danger'))));
  }
  // Organise: the entry open in the editor can be moved up or down its list, or deleted. A deleted entry stays deleted
  // (the deletion is exported like any other change). Something still using it is named, and it stays.
  function organise() {
    const table = { classes: 'CLASSES', rollers: 'ROLLERS', roster: 'ROSTER', tricks: 'TRICKS', chips: 'MADE_CHIPS', cards: 'CARDS', tables: ui.table }[ui.tool], id = ui.key;
    if (!table || !D.DELETABLE.includes(table) || !id || !D.TABLES[table]?.[id]) return;
    const keys = Object.keys(D.TABLES[table]), i = keys.indexOf(id), name = D.TABLES[table][id].name || id;
    const move = (dir) => { if (B.moveEntry(table, id, dir)) draw(); };
    const ask = () => openPanel(h('div', { class: 'col' }, h('h2', { text: t('build.delete.ask', { name }) }), h('p', { class: 'sub', text: t('build.delete.warn') }),
      h('div', { class: 'row' }, btn(t('build.discard.keep'), () => closePanel(), null, 'go'), btn(t('build.delete'), () => { const used = B.removeEntry(table, id); closePanel();
        if (used.length) return toast(t('build.delete.used', { name, list: used.slice(0, 4).join(', '), more: used.length > 4 ? t('build.delete.more', { n: used.length - 4 }) : '' }), 'warn');
        ui.key = null; toast(t('build.delete.done', { name })); draw(); }, null, 'danger'))));
    const up = btn('▲', () => move(-1), t('build.move.up'), `small ${i <= 0 ? 'off' : ''}`), down = btn('▼', () => move(1), t('build.move.down'), `small ${i >= keys.length - 1 ? 'off' : ''}`), del = btn(t('build.delete'), ask, t('build.delete.tip'), 'small danger');
    for (const b of [up, down, del]) guided(b, 'build-option');
    const bar = h('div', { class: 'row b-organise' }, h('span', { class: 'cap', text: t('build.organise') }), up, down, del);
    editor.prepend(bar);
  }
  function draw() { drawStatus(); drawTables(); drawEntries(); drawEditor(); organise(); }
  draw();
}
