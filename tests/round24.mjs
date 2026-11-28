// Round 24: Bone dice one of a kind and set when bought; Bone dice found in the Shady Corner, already rolled.
import * as R from '../js/run.js';
import * as D from '../js/data.js';
import { facesOf } from '../js/dice.js';
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exit(1); } };

// the Shady Corner can turn up a Bone die, already rolled: its trait set, in your pouch
{
  const run = R.newRun('hustler', 'standard', 2401); R.enterFloor(run, 1);
  const was = D.SHADY.bone; D.SHADY.bone = 1e9; const n = run.dice.length, got = R.searchFloor(run); D.SHADY.bone = was;
  const die = run.dice.at(-1);
  assert(got === 'bone' && run.dice.length === n + 1 && die.id === run.fs.foundDie, 'a search can turn up a Bone die, into your pouch');
  assert(die.bone && die.up.length === 1 && !die.unset && facesOf(die).length, 'it comes already rolled: its trait is set on a face');
  assert(R.searchFloor(run) === null, 'a floor is searched once');
}
console.log('ok, round 24: Bone dice set when bought, found already rolled');
