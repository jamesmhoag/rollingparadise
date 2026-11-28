// Round 25: the Coat Check. Check any mix under one numbered pass (a pass slot), have it back on any floor, lose it
// (thrown away, pushed out by a floor's pass, left behind at the end), find lost ones and High Rollers' in the corner and drawer.
import * as R from '../js/run.js';
import * as D from '../js/data.js';
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exit(1); } };
// pass slots as the tests expect them, whatever the content's tuning
Object.assign(D.WALLETS.velvet_zip, { passes: 3, slots: 2 }); D.WALLETS.worn_cloth.passes = 1;
const meta = () => ({ jackets: ['standard'], wallets: ['worn_cloth'], kept: [], atm: 0, debit: false, ladder: [], runs: 0, best: 0, crowns: 0, lost: [] });

// check a mix: cash, a die, a trick, a card, chips; one pass, a number on it, in a pass slot
{
  const run = R.newRun('hustler', 'standard', 2501, { wallet: 'velvet_zip' }); R.enterFloor(run, 1); run.purse = 500; run.chips.burn = 3;
  run.dice.push({ id: run.nextId++, type: 'd6', mat: 'plastic', up: [] }); run.tricks.push({ ...run.tricks[0], uid: run.nextId++ });
  const d = run.dice[0], tr = run.tricks[0], card = R.walletCards(run)[0], used = R.passSlotsUsed(run), cost = R.checkCost(run);
  assert(R.checkItems(run, {}).why === 'empty', 'nothing picked, nothing checked');
  assert(R.checkItems(run, { dice: run.dice.map((x) => x.id) }).why === 'dice', 'you keep a die');
  const c = R.checkItems(run, { cash: 200, dice: [d.id], tricks: [tr.uid], cards: [card], chips: { burn: 2 } });
  assert(c.no >= 1000 && c.no <= 9999, 'the pass has a four digit number');
  assert(run.purse === 500 - cost - 200 && !run.dice.includes(d) && !run.tricks.includes(tr) && !R.walletCards(run).includes(card) && run.chips.burn === 1, 'all of it goes over the counter, and the check is paid');
  assert(R.passSlotsUsed(run) === used + 1 && R.claimsOf(run).length === 1, 'the pass takes a pass slot');
  // any floor: show it and have it all back, under new ids; the pass is taken
  R.enterFloor(run, 2); const M = meta(), got = R.redeemClaim(run, c.no, M);
  assert(got.cash === 200 && got.dice.length === 1 && got.tricks.length === 1 && got.cards[0] === card && got.chips.burn === 2 && run.chips.burn === 3, 'shown on another floor, it all comes back');
  assert(!R.claimsOf(run).length && run.dice.at(-1).id !== d.id, 'the pass is taken; the dice come back with new ids');
}
// a full wallet: a pass takes the floor pass's slot; climbing with only Coat Check passes pushes the oldest out (lost)
{
  const run = R.newRun('hustler', 'standard', 2502); R.enterFloor(run, 1); R.addPass(run, 1); run.purse = 300;
  assert(R.passCap(run.wallet) === 1 && R.claimCosts(run) === 1, 'a one slot wallet gives up its floor pass for a Coat Check pass');
  const c = R.checkItems(run, { cash: 50 }); assert(c.no && run.pass === 0, 'the pass takes the slot');
  assert(R.climbLosesClaim(run), 'warned: climbing would push it out');
  R.enterFloor(run, 2); R.addPass(run, 2);
  assert(run.pass === 2 && !R.claimsOf(run).length && run.lostClaims?.[0]?.no === c.no, 'the floor pass pushes it out: lost');
  const M = meta(); R.endRun(run, M, 'You'); assert(M.lost.some((x) => x.no === c.no && x.lot.cash === 50), 'a lost pass goes into the lost pile when the run ends');
  // found again: in the corner it is one of yours (when you have lost one) or a High Roller's
  const run2 = R.newRun('hustler', 'standard', 2503, { wallet: 'velvet_zip' }); R.enterFloor(run2, 1);
  const was = { ...D.SHADY }; Object.assign(D.SHADY, { claim: 1e9, mine: 1 }); const f = R.searchFloor(run2, M); Object.assign(D.SHADY, was);
  assert(f === 'claim' && run2.fs.foundClaim.claim.no === c.no && R.claimsOf(run2)[0].no === c.no && !M.lost.length, 'your lost pass, found in the corner');
}
// a High Roller's coat: a note in its voice, and the rest of its lot; kept in a wallet held in the alley
{
  const run = R.newRun('hustler', 'standard', 2504, { wallet: 'velvet_zip' }); R.enterFloor(run, 3); const M = meta();
  const L = R.bossLot(run, 'sunken_treasure');
  assert(L.lot.cards.includes('note_sunken_treasure') && D.CARDS.note_sunken_treasure.kind === 'note', 'a High Roller\'s coat has its note');
  assert(L.lot.cash > 0 && L.lot.tricks.length >= 1 && L.lot.dice[0]?.bone === 'cursed', 'and its lot: cash, tricks, its Bone die');
  run.rng.chance = () => true; const d = R.searchDrawer(run, M); delete run.rng.chance;
  assert(d.claim && D.ROSTER[d.claim.lot.cards[0].slice(5)]?.floors.includes(3), 'the Suite drawer: a High Roller\'s pass from this floor');
  assert(R.searchDrawer(run, M) === null, 'one look a stay');
  const roll = R.alleyRoll(run); R.endRun(run, M, 'You', [], [], roll.claims);
  assert(M.keptClaims.length === 1 && !M.lost.length, 'kept in the alley, the pass is in the wallet next run');
  const next = R.newRun('hustler', 'standard', 2505, { wallet: 'velvet_zip', claims: M.keptClaims });
  assert(R.claimsOf(next)[0].no === d.claim.no, 'and there it is');
}
console.log('ok, round 25: Coat Check passes: check any mix, back on any floor, lost and found, High Rollers\' coats');
