// Balance tuning rules: class-cut jackets, the tilt bounty/cut on a win, shop chips staked at their price.
import assert from 'node:assert/strict';
import * as R from '../js/run.js';
import * as D from '../js/data.js';

// level 0 jackets fit only the class they were cut for
for (const [id, cls] of [['long', 'technician'], ['leather', 'hustler'], ['bomber', 'rascal']]) {
  assert.equal(D.JACKETS[id].cls, cls);
  for (const c of Object.keys(D.CLASSES)) {
    assert.equal(R.jacketFits(c, id), c === cls, `${id} on ${c}`);
    assert.equal(R.newRun(c, id, 1).jacket, c === cls ? id : 'standard');
  }
}
assert.ok(R.jacketFits('rascal', 'rain'), 'level 1+ jackets fit everyone');
// a jacket's drawback lands on a 2, never zeroes a 1
for (const id of ['long', 'leather', 'bomber']) {
  const J = D.JACKETS[id], [stat] = Object.entries(J.mods).find(([, n]) => n < 0);
  assert.equal(D.CLASSES[J.cls].c[stat], 2, `${id} drawback on ${stat}`);
}

// tilts: a Challenge pays a bounty, a Cheat takes a cut, both as a share of the opponent's worth
const run = R.newRun('hustler', 'standard', 7); run.floor = 2;
const prep = R.newPrep(run, 'table', 0), opp = { worth: 100 };
R.setTilt(run, prep, 'creature', true);
assert.equal(R.tiltPay({ tiltNet: R.tiltNet(prep), opp }), Math.round(100 * D.TILTS.creature.mult));
R.setTilt(run, prep, 'familiar', true);
assert.equal(R.tiltPay({ tiltNet: R.tiltNet(prep), opp }), Math.round(100 * (D.TILTS.creature.mult - D.TILTS.familiar.mult)));
R.setTilt(run, prep, 'creature', false);
assert.ok(R.tiltPay({ tiltNet: R.tiltNet(prep), opp }) < 0, 'a Cheat alone is a cut');

// shop chips are staked at their shop price and pay the multiplier on a win
assert.equal(R.chipStake({ clay: 2, little: 3 }), 2 * D.shopPrice('clay') + 3 * D.shopPrice('little'));
assert.equal(R.chipStakePay({ resist: { clay: 1 }, mult: 1.5 }), Math.round(D.shopPrice('clay') * 0.5));
assert.equal(R.chipStakePay({ resist: { clay: 1 }, mult: 1 }), 0);

// floor 2 sits between floor 1 and floor 3 on a gentler curve
assert.ok(D.FLOORS[2].worth[0] > D.FLOORS[1].boss && D.FLOORS[2].boss < D.FLOORS[3].worth[0]);
console.log('ok, tuning: jackets, tilt bounty and cut, staked shop chips');
