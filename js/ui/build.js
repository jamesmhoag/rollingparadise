// Build mode: change the game's content, see it in play, and export the changes to put into the project.
// This screen edits any table in D.TABLES field by field. The trick, chip, opponent and tuning tools build on it.
import { h, btn, toast, openPanel, closePanel } from './core.js';
import { app } from './app.js';
import * as D from '../data.js';
import * as B from '../build/draft.js';
import { t } from '../text.js';
import { trickMaker, newTrick } from './trickmaker.js';
import { chipMaker, newChip } from './chipmaker.js';
import { classicChips } from '../chipmodel.js';
import { classMaker, newClass, rosterMaker, newOpponent, rosterLabel, rosterSub } from './rostermaker.js';
import { isMade } from '../trickmaker.js';

// the tables, grouped as the editor lists them
const GROUPS = [
  ['build.group.rollers', ['CLASSES', 'BASE_DIMS', 'STATS']],
  ['build.group.tricks', ['TRICKS', 'TYPES', 'CONDITIONS', 'PACKS', 'QDIE']],
  ['build.group.chips', ['CHIPS', 'SHOP_CHIPS', 'CHIP_TIERS', 'CREATURES', 'ORBITALS', 'CALAMITIES']],
  ['build.group.dice', ['DICE', 'MATERIALS', 'DICE_SHOP', 'BONE', 'MELT', 'CASTS', 'DYES', 'DIAMOND', 'DIE_VARS']],
  ['build.group.floors', ['FLOORS', 'OPPONENTS', 'BOSSES', 'FELTS', 'TILTS', 'TILT_PRESSURE', 'PRIZES']],
  ['build.group.shops', ['DRINKS', 'SPORTS', 'JACKETS', 'CARDS', 'WALLETS', 'PASSES']],
  ['build.group.words', ['TEXT', 'GUIDE']],
];
const isObj = (x) => x && typeof x === 'object';
// a table of entries (each one an object) is listed entry by entry; anything else is edited as one block
const entriesOf = (tb) => { const T = D.TABLES[tb]; const vals = Object.entries(T).filter(([, v]) => v != null);
  return vals.length && vals.filter(([, v]) => isObj(v) && !Array.isArray(v)).length >= vals.length * 0.6 ? vals.map(([k]) => k) : null; };
const label = (tb, k) => { const v = D.TABLES[tb][k]; return isObj(v) && typeof v.name === 'string' ? v.name : k; };

export function buildScene(root) {
  const ui = { tool: 'tricks', table: 'CLASSES', key: null, filter: '' }; // tool: 'tricks' (the trick maker) or 'tables'
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
    tables.replaceChildren(h('span', { class: 'cap', text: t('build.group.makers') }), tool('tricks', t('maker.title')), tool('chips', t('chipmaker.title')), tool('classes', t('roster.class.title')), tool('roster', t('roster.title')),
      ...GROUPS.flatMap(([g, list]) => [h('span', { class: 'cap', text: t(g) }),
      ...list.filter((tb) => D.TABLES[tb]).map((tb) => h('button', { class: `b-item ${ui.tool === 'tables' && ui.table === tb ? 'on' : ''} ${B.changed(tb) ? 'ch' : ''}`, text: t(`build.table.${tb}`), onclick: () => { ui.tool = 'tables'; ui.table = tb; ui.key = null; ui.filter = ''; filter.value = ''; draw(); } }))]));
  }
  function drawEntries() {
    if (ui.tool === 'classes' || ui.tool === 'roster') {
      const roster = ui.tool === 'roster', T = roster ? D.ROSTER : D.CLASSES, keys = Object.keys(T); filter.style.display = '';
      if (!ui.key || !T[ui.key]) ui.key = keys[0];
      const lab = (k) => (roster ? rosterLabel(k) : `${T[k].hero} the ${T[k].name}`), sub = (k) => (roster ? rosterSub(k) : k);
      const item = (k) => h('button', { class: `b-item ${ui.key === k ? 'on' : ''} ${B.changed(D.subPath(roster ? 'ROSTER' : 'CLASSES', k)) ? 'ch' : ''}`, onclick: () => { ui.key = k; draw(); } }, h('b', { text: lab(k) }), h('small', { text: sub(k) }));
      const shown = keys.filter((k) => !ui.filter || `${k} ${lab(k)}`.toLowerCase().includes(ui.filter));
      entries.replaceChildren(...(roster ? [btn(t('roster.new'), () => { const id = newOpponent(false); if (id) { ui.key = id; draw(); } }, null, 'small go'), btn(t('roster.newBoss'), () => { const id = newOpponent(true); if (id) { ui.key = id; draw(); } }, null, 'small'),
        h('span', { class: 'cap', text: t('roster.list.tables') }), ...shown.filter((k) => !T[k].boss).map(item),
        ...[1, 2, 3, 4].flatMap((n) => { const bs = shown.filter((k) => T[k].boss && (T[k].floors || []).includes(n)); return bs.length ? [h('span', { class: 'cap', text: t('roster.list.bosses', { floor: D.FLOORS[n].name }) }), ...bs.map(item)] : []; })]
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
    if (ui.tool === 'classes') { editor.replaceChildren(h('h2', { text: `${D.CLASSES[ui.key].hero} the ${D.CLASSES[ui.key].name}` }), h('p', { class: 'sub mono', text: D.subPath('CLASSES', ui.key) }), classMaker(ui.key, draw)); return; }
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
  // one field per value: text, number, on/off, a list, or a group of fields
  function fields(path, v, depth) {
    if (typeof v === 'function') return h('p', { class: 'dim', text: t('build.inCode') });
    if (isObj(v) && depth < 4 && !(Array.isArray(v) && v.every((x) => !isObj(x)))) {
      return h('div', { class: 'b-group' }, Object.entries(v).map(([k, x]) => h('div', { class: `b-field ${B.changed(D.subPath(path, k)) ? 'ch' : ''}` },
        h('label', { text: k }), fields(D.subPath(path, k), x, depth + 1), revertBtn(D.subPath(path, k)))));
    }
    return input(path, v);
  }
  function input(path, v) {
    const set = (x) => { B.setValue(path, x); drawStatus(); drawTables(); drawEntries(); drawEditor(); };
    if (typeof v === 'boolean') return h('input', { type: 'checkbox', ...(v ? { checked: 'checked' } : {}), onchange: (e) => set(e.target.checked) });
    if (typeof v === 'number') return h('input', { type: 'number', step: 'any', value: v, onchange: (e) => { const n = Number(e.target.value); if (Number.isFinite(n)) set(n); else toast(t('build.notNumber'), 'warn'); } });
    if (Array.isArray(v)) return h('input', { type: 'text', value: v.join(', '), onchange: (e) => { const parts = e.target.value.split(',').map((s) => s.trim()).filter((s) => s !== ''); set(v.length && v.every((x) => typeof x === 'number') ? parts.map(Number) : parts); } });
    if (v == null) return h('input', { type: 'text', value: '', placeholder: t('build.none'), onchange: (e) => set(e.target.value.trim() === '' ? null : e.target.value.trim()) });
    if (isObj(v)) return h('textarea', { class: 'mono', rows: 3, text: JSON.stringify(v), onchange: (e) => { try { set(JSON.parse(e.target.value)); } catch { toast(t('build.notJson'), 'warn'); } } });
    const long = String(v).length > 48;
    return h(long ? 'textarea' : 'input', { ...(long ? { rows: Math.min(6, Math.ceil(String(v).length / 60)), text: v } : { type: 'text', value: v }), onchange: (e) => set(e.target.value) });
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
  function draw() { drawStatus(); drawTables(); drawEntries(); drawEditor(); }
  draw();
}
