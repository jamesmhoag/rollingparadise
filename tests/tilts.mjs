// The expanded basic chips, and tilts that are switched on and played by the House as the bout goes.
import * as R from '../js/run.js'; import * as B from '../js/bout.js'; import * as D from '../js/data.js';
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exit(1); } };
const { ticks } = B._test; const drain = (g) => { for (const _ of g); }; // eslint-disable-line no-unused-vars

// ---------- denominations ----------
assert(D.DENOM_VALUES.join() === '1,2,5,10,25,50,100,250,500,1000,2500,5000,10000,25000,50000', 'fifteen basic chips, 1¢ to 50,000¢');
assert(D.denomName(25) === 'Royal Paradise 25¢ chip' && D.denomName(1000) === 'Silver chip' && D.denomName(50000) === 'Diamond chip', 'up to 500¢ they are Royal Paradise chips; metal and gem chips go by name');
assert(R.maxDenom(1) === 1 && R.maxDenom(3) === 25 && R.maxDenom(4) === 250 && R.maxDenom(D.ASCENT_FLOOR) === 50000, 'each floor deals bigger chips; the Ascent deals them all');
{ const run = R.newRun('hustler', 'standard', 2); R.enterFloor(run, 4); run.purse = 20000; const st = R.rollerStats(run), c = R.autoCounts(run, st.dims);
  assert(c[250] > 0 && R.planWorth(c) <= 20000 && Object.values(c).reduce((a, n) => a + n, 0) === B.barCapacity(st.dims), 'a big purse that does not fit in 10¢ chips uses the bigger chips the floor allows'); }
{ const run = R.newRun('hustler', 'standard', 2); R.enterFloor(run, 4); const o = run.fs.boss.opp; assert(o.plan.chips.every((g) => g.value <= 10), 'opponents keep their usual chips when the worth fits'); }
{ const run = R.newRun('hustler', 'standard', 2); R.enterFloor(run, 4); const o = R.genOpponent(run, 4, 20000, {}); assert(o.plan.chips.some((g) => g.value > 10) && Math.abs(o.worth - 20000) < 300, 'a rich opponent uses bigger chips to fit its worth'); }

// ---------- tilts ----------
const run = R.newRun('technician', 'standard', 5); R.enterFloor(run, 1); run.purse = 600;
const prep = R.newPrep(run, 'table', 0), m0 = R.multiplier(run, prep);
assert(R.setTilt(run, prep, 'hazard', true) && prep.tilts.hazard === 1, 'a tilt is switched on');
assert(Math.abs(R.multiplier(run, prep) - (m0 + D.TILTS.hazard.mult)) < 1e-9, 'a Challenge tilt that is on adds its share to the multiplier');
assert(!R.setTilt(run, prep, 'calamity', true) && !prep.tilts.calamity, 'a tilt opens on its floor');
R.setTilt(run, prep, 'shield', true); assert(R.multiplier(run, prep) < m0 + D.TILTS.hazard.mult, 'a Cheat tilt lowers it');
{ // the House plays it: harder Challenges the more you lose, stronger Cheats the more your opponent loses
  const { bout } = R.startTable(run, prep); const me = bout.sides[0];
  assert(me.tilts.hazard && me.tilts.shield, 'the tilts that are on go to the table');
  const r0 = B.tiltRate(bout, me, 'hazard'); bout.stage.paid[0] = me.startWorth * 0.6; const r1 = B.tiltRate(bout, me, 'hazard');
  assert(r1 > r0 && Math.abs(r0 - D.TILTS.hazard.base) < 1e-9, 'losing to the House makes Challenges more likely');
  const g0 = B.tiltRate(bout, me, 'shield'); bout.stage.paid[1] = bout.sides[1].startWorth * 0.8; assert(B.tiltRate(bout, me, 'shield') > g0, 'your opponent losing to the House makes Cheats stronger');
  assert(B.effectChips(bout, me).some((x) => x.key === 'tilt-hazard' && /%/.test(x.value)), 'each tilt shows on the table with the House\'s chance this turn');
  const holes0 = me.grid.flat().filter((c) => c.hole).length, blocks0 = me.grid.flat().reduce((n, c) => n + c.chips.filter((ch) => ch.kind === 'block').length, 0); let played = 0;
  for (let t = 2; t < 8; t++) { bout.turn = t; for (const st of ticks(bout)) if (/The House plays/.test(st.text || '')) played++; }
  assert(played > 0 && (me.grid.flat().filter((c) => c.hole).length > holes0 || me.grid.flat().some((c) => c.chips.some((ch) => ch.kind === 'hat')) || me.grid.flat().reduce((n, c) => n + c.chips.filter((ch) => ch.kind === 'block').length, 0) > blocks0), 'the House plays the tilts during the bout');
}
{ // a Calamity can arrive mid-bout
  const run2 = R.newRun('technician', 'standard', 6); R.enterFloor(run2, 3); run2.purse = 3000; const p2 = R.newPrep(run2, 'table', 0); R.setTilt(run2, p2, 'calamity', true);
  const { bout } = R.startTable(run2, p2); const me = bout.sides[0]; bout.stage.paid[0] = me.startWorth; const n0 = me.calamities.length;
  for (let t = 2; t < 30 && me.calamities.length === n0; t++) { bout.turn = t; drain(ticks(bout)); }
  assert(n0 === 1 && me.calamities.length === 2, 'having lost everything, a second Calamity comes');
}
console.log('ok, chips and tilts');
