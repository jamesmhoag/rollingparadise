// Neon signs: older saved signs keep their look under the new spec; symbols are drawn, not font glyphs.
import { signOf, pairsOf, FRAMES, MAX_PAIRS } from '../js/ui/sign.js';
import { SYMBOLS, symbolOf, CROWNS } from '../js/ui/symbols.js';
import * as D from '../js/data.js';
const ok = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } };
const dbl = signOf('you', { frame: 'double', border: ['#111111', '#222222'] });
ok(dbl.frame === 'plain' && pairsOf(dbl).length === 2, 'a double tube is two tube pairs now');
ok(signOf('you', { frame: 'triple' }).more.length === 2 && signOf('you', { frame: 'rope' }).frame === 'twist', 'a triple is three, a rope a twist');
ok(signOf('you', { more: [['#1', '#2'], ['#3', '#4'], ['#5', '#6'], ['#7', '#8']] }).more.length === MAX_PAIRS - 1, 'no more than three pairs');
const old = signOf('you', { blink: { part: 'name', pattern: 'pulse' } });
ok(old.blinks.name?.on && old.blinks.name.pattern === 'pulse', 'one blinking part becomes that part\'s toggle');
ok(signOf('you', { edge: '♠' }).edge === 'spade' && signOf('you', { edge: '¤' }).edge === '¤', 'a saved character becomes its drawn symbol, or stays a character');
ok(FRAMES.every((f) => !['tube', 'double', 'triple', 'rope'].includes(f)), 'the old tube counts are colour pairs, not styles');
ok(Object.values(SYMBOLS).every((S) => /^M/.test(S.d)) && [1, 2, 3, 4].every((n) => CROWNS[n]) && symbolOf('★') === 'star5' && !Object.keys(SYMBOLS).includes('dollar'), 'every symbol is a drawn path; a crown for each floor');
for (const who of ['you', 'them', 'house']) ok(FRAMES.includes(signOf(who).frame), `${who}'s sign has a known frame`);
void D;
console.log('ok, signs: old signs map onto the new spec; symbols are drawn; a crown per floor');
