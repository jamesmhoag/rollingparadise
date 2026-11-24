// The bout music: how tense a bout reads from the Rollers' Worth, how that sets the four layers, and which loop plays.
import { tensionOf, layerMix, loopFor } from '../js/ui/music.js';
import { LOOPS } from '../js/content/assets.js';
import { worth } from '../js/bout.js';

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.error('✗', m); } };
// a Roller with `w`¢ left of the `start`¢ they sat down with, as one stack of a 'made' chip (counted at its value)
const side = (w, start) => ({ startWorth: start, grid: [[{ chips: [{ kind: 'made', value: w }] }]] });
const bout = (a, b) => ({ sides: [side(a, 100), side(b, 100)] });
ok(worth(side(40, 100)) === 40, 'the fixture is worth what it says');
ok(tensionOf(bout(100, 100)) === 0, 'calm while both hold their Worth');
ok(tensionOf(bout(120, 100)) === 0, 'calm when ahead');
ok(tensionOf(bout(25, 100)) === 1, 'full tension a quarter from broke');
ok(tensionOf(bout(100, 25)) > 0.8 && tensionOf(bout(100, 25)) < 1, 'an opponent near broke counts, a little less');
ok(tensionOf(bout(60, 90)) > tensionOf(bout(90, 90)), 'tension rises as your Worth falls');
const calm = layerMix(0), tense = layerMix(1), mid = layerMix(0.5);
ok(calm.base === 1 && calm.theme === 1 && calm.drive === 0 && calm.peril === 0, 'calm: the groove and the tune only');
ok(tense.drive === 1 && tense.peril === 1, 'near broke: everything');
ok(mid.drive === 1 && mid.peril === 0, 'halfway: the drive, not the peril yet');
for (let x = 0; x < 1; x += 0.05) { const a = layerMix(x), b = layerMix(x + 0.05); ok(b.drive >= a.drive && b.peril >= a.peril, `the layers only build as tension rises (${x.toFixed(2)})`); }
for (let f = 1; f <= 5; f++) { ok(loopFor(f, false)?.kind === 'bout' && loopFor(f, false).floor === f, `floor ${f}: a table loop`); ok(loopFor(f, true)?.kind === 'boss' && loopFor(f, true).floor === f, `floor ${f}: a High Roller loop`); }
ok(new Set(LOOPS.map((L) => L.title)).size === LOOPS.length, 'every loop has its own title');
if (fail) process.exit(1);
console.log(`ok, music: tension from Worth, four layers, ${LOOPS.length} loops`);
