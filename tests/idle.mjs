// The title's idle loading (js/ui/idle.js): when a piece of background work may run. It must not run while the
// player is doing something, while the screen is not steady, or if pieces of its kind are long; it always may when
// nobody is watching.
import { fits } from '../js/ui/idle.js';

let failed = 0; const ok = (c, m) => { if (!c) { failed++; console.log('  ✗ ' + m); } };
ok(fits({ usual: 60, sinceInput: 5000, steady: true }), 'steady, untouched, a short piece: it may run');
ok(!fits({ usual: 60, sinceInput: 100, steady: true }), 'the player has just moved the pointer: it waits');
ok(!fits({ usual: 60, sinceInput: 5000, steady: false }), 'the sign is lighting or pulsing: it waits');
ok(!fits({ usual: 400, sinceInput: 5000, steady: true }), 'pieces of this kind are long: they are left for the loading bar');
ok(fits({ usual: 0, sinceInput: 5000, steady: true }), 'a kind not timed yet may run');
ok(fits({ usual: 400, sinceInput: 0, steady: false, hidden: true }), 'the tab is hidden: nobody is watching');
for (let ms = 0; ms <= 1000; ms += 50) ok(fits({ usual: 20, sinceInput: ms, steady: true }) === (ms >= 350), `quiet for ${ms}ms`);
if (failed) { console.log(`${failed} idle check(s) failed`); process.exit(1); }
console.log('ok, idle: background work waits for a steady, untouched screen');
