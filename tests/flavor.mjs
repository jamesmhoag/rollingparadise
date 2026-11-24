// Flavour and data-linked text: every thing has a line of flavour to start from, and the words that describe rules
// are written from the numbers (a class's strengths, a Resist Card's r, a High Roller's trait).
import * as D from '../js/data.js';
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
for (const [table, keys] of [['CLASSES', Object.keys(D.CLASSES)], ['TRICKS', Object.keys(D.TRICKS)], ['CREATURES', Object.keys(D.CREATURES)], ['TILTS', Object.keys(D.TILTS)],
  ['FELTS', Object.keys(D.FELTS)], ['JACKETS', Object.keys(D.JACKETS)], ['WALLETS', Object.keys(D.WALLETS)], ['CARDS', Object.keys(D.CARDS)], ['DRINKS', D.DRINKS.map((d) => d.id)],
  ['MATERIALS', Object.keys(D.MATERIALS)], ['ROSTER', Object.keys(D.ROSTER)], ['CALAMITIES', Object.keys(D.CALAMITIES)], ['DIE_UPGRADES', Object.keys(D.DIE_UPGRADES)]])
  for (const k of keys) ok(D.flavorOf(table, k), `${table}.${k} has a line of flavour`);
ok(!Object.values(D.CLASSES).some((K) => 'blurb' in K) && /Draw 3/.test(D.classRule('hustler')) && /back/.test(D.classRule('hustler')), 'a class is described from its numbers, not a hand-written blurb');
const was = D.CLASSES.rascal.tip.trickery; D.CLASSES.rascal.tip.trickery = 4;
ok(/Draws the most tricks \(Draw 4\)/.test(D.classRule('rascal')), 'change the number and the words follow');
D.CLASSES.rascal.tip.trickery = was;
ok(!/\d/.test(JSON.stringify(Object.values(D.CARDS).filter((c) => c.resist).map((c) => c.text || ''))), 'a Resist Card has no number written into its text');
if (fails.length) { console.log('FAIL ' + fails.join('\nFAIL ')); process.exit(1); }
console.log('ok, flavour: every thing has a line, and rule text is written from the numbers');
