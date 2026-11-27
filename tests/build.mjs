// Build mode: content changes by path, the draft, export and import, and merging an export into the project.
import * as D from '../js/data.js';
import * as B from '../js/build/draft.js';

const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const before = D.TRICKS.charge.count, hero = D.ROLLERS.fox.name;
B.setValue('TRICKS.charge.count', before + 1);
ok(D.TRICKS.charge.count === before + 1 && B.count() === 1 && B.changed('TRICKS.charge'), 'a change applies at once and is in the draft');
B.setValue('ROLLERS.fox.name', 'Vixen'); ok(D.heroName('rascal') === 'Vixen the Rascal', 'text-like values change too');
B.setValue('TRICKS.charge_copy', { ...JSON.parse(JSON.stringify(D.TRICKS.charge)), name: 'Charge II' });
ok(D.TRICK_IDS.includes('charge_copy') && D.TRICKS.charge_copy.name === 'Charge II', 'a new entry joins the derived lists');
B.setValue('FLOORS.1.name', 'Bargain Basement'); ok(D.FLOORS[1].name === 'Bargain Basement', 'array entries change by index');
B.setValue(D.subPath('TEXT', 'title.tagline'), 'Roll with it'); ok(D.TABLES.TEXT['title.tagline'] === 'Roll with it' && !D.TABLES.TEXT.title, 'text keys with dots change as one key');
B.revert(D.subPath('TEXT', 'title.tagline'));
B.setValue('ROLLERS.fox.name', hero); ok(!('ROLLERS.fox.name' in B.draft.changes), 'setting a value back to the original drops the change');
// export → import round trip
const file = B.overridesFile(), parsed = B.parseChanges(file);
ok(parsed['TRICKS.charge.count'] === before + 1 && parsed['TRICKS.charge_copy'].name === 'Charge II', 'an exported file reads back');
ok(file.indexOf('"FLOORS.1.name"') < file.indexOf('"TRICKS.charge.count"'), 'exports are sorted, one change per line');
B.discard();
ok(D.TRICKS.charge.count === before && !D.TRICK_IDS.includes('charge_copy') && D.TRICKS.charge_copy === undefined && D.FLOORS[1].name !== 'Bargain Basement' && B.count() === 0, 'discard puts everything back');
ok(B.importChanges(parsed) >= 3 && D.TRICKS.charge.count === before + 1, 'import loads an export into the draft');
B.discard();
// merging: the export wins where both set a value
const merged = B.allChanges({ 'A.x': 1, 'A.y': 2 }, { 'A.y': 3, 'A.z': 4 });
ok(merged['A.x'] === 1 && merged['A.y'] === 3 && merged['A.z'] === 4, 'merge keeps both, the export wins');
ok(Object.keys(B.parseChanges('{ "TRICKS.charge.count": 2 }')).length === 1, 'a plain JSON draft reads too');

// ---------- organising: delete for good, and move ----------
{
  B.discard();
  B.setValue('CLASSES.tester', { ...JSON.parse(JSON.stringify(D.CLASSES.hustler)), name: 'Tester' });
  ok(D.CLASSES.tester && B.removeEntry('CLASSES', 'tester').length === 0 && !D.CLASSES.tester && !('CLASSES.tester' in B.draft.changes), 'an entry made in this draft and never exported simply goes');
  const used = B.removeEntry('CLASSES', 'hustler'); ok(used.length > 0 && D.CLASSES.hustler, 'an entry something still uses is not deleted, and what uses it is named');
  ok(D.usedBy('JACKETS', 'standard').length > 0 && D.usedBy('WALLETS', 'worn_cloth').length > 0, 'the jacket and wallet every run starts with cannot go');
  // a stock entry: deleted with a change that stays in the export, and nothing set inside it brings it back
  const id = Object.keys(D.TRICKS).find((k) => !D.usedBy('TRICKS', k).length); B.setValue(`TRICKS.${id}.count`, 3);
  ok(B.removeEntry('TRICKS', id).length === 0 && !D.TRICKS[id] && B.draft.changes[`TRICKS.${id}`] === null && !(`TRICKS.${id}.count` in B.draft.changes) && !D.TRICK_IDS.includes(id), 'a deleted entry leaves the game, and the deletion is one of the changes');
  const file2 = B.overridesFile(), back = B.parseChanges(file2); ok(back[`TRICKS.${id}`] === null && D.isDeletion(`TRICKS.${id}`, null), 'the deletion is exported');
  ok(!(`TRICKS.${id}.count` in B.migrate({ [`TRICKS.${id}`]: null, [`TRICKS.${id}.count`]: 5 })), 'merged with an older file that still changes it, it stays deleted');
  D.applyContent({ [`TRICKS.${id}.name`]: 'Back again', [`TRICKS.${id}`]: null }); ok(!D.TRICKS[id], 'applying changes cannot bring a deleted entry back by setting something inside it');
  B.revert(`TRICKS.${id}`); ok(D.TRICKS[id]?.name, 'until it is exported, undoing the change puts it back');
  // order
  const keys = Object.keys(D.CLASSES), last = keys[keys.length - 1];
  ok(B.moveEntry('CLASSES', last, -1) && Object.keys(D.CLASSES).indexOf(last) === keys.length - 2 && Array.isArray(B.draft.changes['ORDER.CLASSES']), 'moving an entry changes its place in the list, as a change');
  ok(!B.moveEntry('CLASSES', Object.keys(D.CLASSES)[0], -1), 'the first cannot move up');
  B.discard();
}
if (fails.length) { console.log('FAIL ' + fails.join('\nFAIL ')); process.exit(1); }
console.log('ok, build: content changes, draft, export, import and merge');
