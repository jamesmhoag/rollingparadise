// The bout music: how tense a bout reads from the Rollers' Worth, how that sets the layers, which tune each time round, and which loop plays.
import { tensionOf, stakesOf, layerMix, loopFor, srcOf, bandOf, setlist, TURNS, turnOf } from '../js/ui/music.js';
import { tipBand } from '../js/run.js';
import { TUNING } from '../js/content/tuning.js';
import { LOOPS, MUSIC } from '../js/content/assets.js';
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
// losing and winning do not sound alike: the peril is for your Worth, the surge for your opponent's
ok(stakesOf(bout(25, 100)).mine === 1 && stakesOf(bout(25, 100)).theirs === 0 && stakesOf(bout(100, 25)).theirs === 1, 'each Roller\'s stakes: full a quarter from broke');
{ const b = bout(25, 100), losing = layerMix(tensionOf(b), stakesOf(b)); ok(losing.peril === 1 && losing.surge === 0 && losing.drive === 1, 'you near broke: the peril, no surge'); }
{ const b = bout(100, 25), winning = layerMix(tensionOf(b), stakesOf(b)); ok(winning.surge === 1 && winning.peril === 0 && winning.drive === 1, 'your opponent near broke: the surge, no peril'); }
{ const b = bout(100, 100), even = layerMix(tensionOf(b), stakesOf(b)); ok(even.surge === 0 && even.peril === 0 && even.drive === 0 && even.theme === 1 && even.alt === 1, 'even: the groove and a tune only'); }
for (let x = 0; x < 1; x += 0.05) { const a = layerMix(0, { mine: 0, theirs: x }), b = layerMix(0, { mine: 0, theirs: x + 0.05 }); ok(b.surge >= a.surge && a.peril === 0, `the surge only builds as your opponent falls (${x.toFixed(2)})`); }
// the two tunes take turns: one at a time, neither more than twice running, and some rounds the band just vamps
ok(TURNS.every((k) => ['theme', 'alt', 'rest'].includes(k)) && TURNS[0] === 'theme', 'a loop opens on its theme');
ok(['theme', 'alt', 'rest'].every((k) => TURNS.includes(k)), 'the theme, the second tune and a rest each get a turn');
for (let i = 0; i < TURNS.length * 2; i++) ok(!(turnOf(i) === turnOf(i + 1) && turnOf(i) === turnOf(i + 2)), `no tune three times running (round ${i})`);
ok(turnOf(TURNS.length) === TURNS[0] && turnOf(-1) === TURNS[TURNS.length - 1], 'the turns come round again');
for (const L of LOOPS) ok(L.layers.alt && L.layers.surge && L.layers.alt !== L.layers.theme, `${L.title}: a second tune and a surge`);
for (let f = 1; f <= 5; f++) { ok(loopFor(f, false)?.kind === 'bout' && loopFor(f, false).floor === f, `floor ${f}: a table loop`); ok(loopFor(f, true)?.kind === 'boss' && loopFor(f, true).floor === f, `floor ${f}: a High Roller loop`); }
ok(new Set(LOOPS.map((L) => L.title)).size === LOOPS.length, 'every loop has its own title');
// tipping the band: priced from the purse, refused when it is short, in the ledger; the band's state is the run's
const P = TUNING.band, tipper = (purse) => ({ purse, stats: { spent: 0 }, ledger: [], floor: 1 });
ok(P.skip === 2 && P.request === 2 && P.swap === 5 && P.stop === 10 && P.start === 10, 'a skip or request 2¢, a swap 5¢, stopping or starting 10¢');
{ const r = tipper(6); ok(tipBand(r, 'swap') && r.purse === 1 && r.ledger.length === 1 && r.ledger[0].amt === -5, 'a swap is paid from the purse and ledgered');
  ok(!tipBand(r, 'request', 'Neon Strip') && r.purse === 1, 'a tip the purse cannot cover is refused');
  const s = tipper(20); ok(tipBand(s, 'stop') && tipBand(s, 'start') && s.purse === 0 && s.ledger.length === 2, 'stopping and starting are 10¢ each'); }
{ const r = {}; ok(bandOf(r).mode === 'band' && !bandOf(r).silent && bandOf(r) === r.band, 'a run starts with the band playing'); ok(bandOf(null).mode === 'band', 'no run: the band'); }
{ const list = [{ title: 'A' }, { title: 'B' }, { title: 'C' }]; ok(setlist(list, new Set(['C'])).map((x) => x.title).join() === 'C,A,B', 'favorites top the setlist'); }
for (const M of MUSIC) ok(srcOf(M, 'band') === M.src && srcOf(M, 'chip') === M.chip && M.chip !== M.src, `${M.title}: a band and a chiptune file`);
ok(srcOf({ src: 'a.mp3' }, 'chip') === 'a.mp3', 'a tune with no chiptune version plays the band');
if (fail) process.exit(1);
console.log(`ok, music: tension from Worth, six layers, tunes in turn, ${LOOPS.length} loops`);
