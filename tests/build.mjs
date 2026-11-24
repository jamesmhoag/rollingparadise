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

if (fails.length) { console.log('FAIL ' + fails.join('\nFAIL ')); process.exit(1); }
console.log('ok, build: content changes, draft, export, import and merge');
