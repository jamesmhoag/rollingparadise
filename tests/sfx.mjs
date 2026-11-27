// The sound effects: every sound the game asks for exists and every sound and sample is used; a sound's notes take
// the band's mode and keep their shape in every key; every sound plays (on a stand-in for Web Audio) without
// stretching a sample far.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import * as D from '../js/data.js';

let failed = 0; const ok = (c, m) => { if (!c) { failed++; console.log('  ✗ ' + m); } };
const ROOT = fileURLToPath(new URL('../js/', import.meta.url));
const files = (dir) => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? (f === 'vendor' ? [] : files(p)) : f.endsWith('.js') ? [p] : []; });

// ---- a stand-in for Web Audio that records what is played
const played = [];
class Param { constructor(v = 0) { this.value = v; } setValueAtTime(v) { this.value = v; } setTargetAtTime() {} exponentialRampToValueAtTime() {} }
const node = (extra = {}) => ({ connect(x) { return x; }, ...extra });
globalThis.window = { AudioContext: class {
  constructor() { this.state = 'running'; this.currentTime = 0; this.sampleRate = 8000; this.destination = node(); }
  createGain() { return node({ gain: new Param(1) }); }
  createDynamicsCompressor() { return node({ threshold: new Param(), knee: new Param(), ratio: new Param(), attack: new Param(), release: new Param() }); }
  createStereoPanner() { return node({ pan: new Param() }); }
  createBiquadFilter() { return node({ frequency: new Param(), Q: new Param() }); }
  createBuffer(c, n) { return { duration: 1, getChannelData: () => new Float32Array(n) }; }
  createBufferSource() { const s = node({ playbackRate: new Param(1), start() { played.push(s); }, stop() {} }); return s; }
  decodeAudioData(a) { return Promise.resolve({ duration: 1, name: a.name }); }
  resume() {}
} };
globalThis.fetch = (src) => Promise.resolve({ arrayBuffer: () => Promise.resolve({ name: src.split('/').pop().replace('.mp3', '') }) });
if (!globalThis.performance) globalThis.performance = { now: () => Date.now() };

const { SOUNDS, SAMPLES, sfx, toneOf, place, rungOf, samplesLoaded } = await import('../js/ui/sfx.js');

// ---- every sound asked for exists; every sound and every sample is used
const src = files(ROOT).filter((p) => !p.endsWith('sfx.js')).map((p) => readFileSync(p, 'utf8')).join('\n');
const asked = new Set([...src.matchAll(/sfx\(([^)]*?)\)/g)].flatMap((m) => [...m[1].split(',')[0].replace(/^[^?]*\?/, '').matchAll(/'([a-z-]+)'/gi)].map((x) => x[1]))); // (a ? b : c: the names are b and c)
asked.add('touch'); // played by sfx.js itself, on a press
for (const n of asked) ok(SOUNDS[n], `the game asks for a sound that does not exist: ${n}`);
// (a House play is sounded by its trick's element, else its type: those names are not written out at a call)
const elements = [...new Set(Object.values(D.TRICKS).map((x) => x.element).filter(Boolean))], byRule = new Set([...Object.keys(D.TYPES), ...elements]);
const view = readFileSync(join(ROOT, 'ui/boutview.js'), 'utf8'), listed = /ELEMENT_SOUND = \[([^\]]*)\]/.exec(view)[1];
for (const e of elements) ok(SOUNDS[e] && listed.includes(`'${e}'`), `an element with no sound of its own: ${e}`);
for (const k of Object.keys(D.TYPES)) ok(SOUNDS[k], `a type of trick with no sound: ${k}`);
for (const n of Object.keys(SOUNDS)) ok(asked.has(n) || byRule.has(n), `a sound nothing plays: ${n}`);
const own = readFileSync(join(ROOT, 'ui/sfx.js'), 'utf8').split('export const SOUNDS')[1];
for (const s of SAMPLES) ok(own.includes(`'${s}'`), `a sample no sound uses: ${s}`);

// ---- the mode: minor takes the minor 3rd, 6th and 7th; the blues the flat 7th; major is as written
ok([0, 4, 7, 9, 11, 16].map((d) => toneOf(d, 'major')).join() === '0,4,7,9,11,16', 'major: as written');
ok([0, 4, 7, 9, 11, 16, 2, 5].map((d) => toneOf(d, 'minor')).join() === '0,3,7,8,10,15,2,5', 'minor: the 3rd, 6th and 7th come down');
ok([4, 11, 23].map((d) => toneOf(d, 'blues')).join() === '4,10,22', 'blues: only the 7th comes down');
// ---- a gesture keeps its shape in every key and is never far from the samples' own pitch
for (let key = 0; key < 12; key++) for (const mode of ['major', 'minor', 'blues']) {
  const fall = place([7, 5, 3], key, mode), roll = place([0, 7, 16], key, mode), one = place([4], key, mode);
  ok(fall[0] > fall[1] && fall[1] > fall[2], `a falling line falls (key ${key}, ${mode})`);
  ok(roll[0] < roll[1] && roll[1] < roll[2] && roll[2] - roll[0] === toneOf(16, mode), `a chord keeps its spread (key ${key}, ${mode})`);
  ok(Math.abs(one[0]) <= 6 && Math.max(...roll.map(Math.abs)) <= 14, `nothing is stretched far (key ${key}, ${mode})`);
  ok(((one[0] - key - toneOf(4, mode)) % 12 + 12) % 12 === 0, `a note is in the key (key ${key}, ${mode})`);
}
ok([0, 1, 2, 3, 4, 5, 9].map((n) => rungOf(n, 'major')).join() === '0,2,4,7,9,12,12' && rungOf(2, 'minor') === 5 && rungOf(1, 'minor') === 3, 'a repeated action climbs a pentatonic scale, and stops at the octave');

// ---- every sound plays, at every size, without stretching a sample past an octave and a half
sfx('chip'); await new Promise((r) => setTimeout(r, 20));
ok(samplesLoaded() === SAMPLES.length, 'every sample loads');
for (const [name, fn] of Object.entries(SOUNDS)) for (const o of [{}, { n: 4, tier: 1, pan: 0.5 }, { n: 30, tier: 2, end: 'paradise', pan: -0.3 }]) {
  const before = played.length;
  try { fn(o); fn(o); fn(o); } catch (e) { ok(false, `${name} throws: ${e.message}`); }
  ok(played.length > before, `${name} makes a sound`);
  const far = played.slice(before).filter((s) => s.buffer?.name && Math.abs(Math.log2(s.playbackRate.value)) > 1.55);
  ok(!far.length, `${name} stretches ${far[0]?.buffer?.name} too far (x${far[0]?.playbackRate.value.toFixed(2)})`);
}
{ const count = (o) => { const b = played.length; SOUNDS.pay(o); return played.length - b; }; ok(count({ n: 1 }) < count({ n: 5 }), 'a bigger payout is a longer cascade'); }
{ const count = (o) => { const b = played.length; SOUNDS.fee(o); return played.length - b; }; ok(count({ n: 1 }) < count({ n: 4 }) && count({ n: 4 }) < count({ n: 12 }), 'a bigger fee lands harder'); }
{ const count = (o) => { const b = played.length; SOUNDS.win(o); return played.length - b; }; ok(count({}) < count({ tier: 1 }) && count({ tier: 1 }) < count({ tier: 2 }), 'a bigger win is a bigger sound'); }

if (failed) { console.log(`${failed} sound check(s) failed`); process.exit(1); }
console.log(`ok, sfx: ${Object.keys(SOUNDS).length} sounds, ${SAMPLES.length} samples, in key and mode`);
