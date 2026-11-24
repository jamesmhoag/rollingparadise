// Trick rules: bid before dice, any dice on a bid trick, Bonus dice, no Trait, the bid adds to the effect, and
// lingering by stacking copies of a trick (each copy plays a turn, with its own print).
import * as R from '../js/run.js'; import * as B from '../js/bout.js'; import * as D from '../js/data.js';
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exit(1); } };
const drain = (g) => { const out = []; for (const st of g) out.push(st); return out; };
function table(seed = 11) {
  const run = R.newRun('hustler', 'standard', seed); R.enterFloor(run, 1); run.purse = 3000;
  const { bout } = R.startTable(run, R.newPrep(run, 'table', 0)); return { run, bout, me: bout.sides[0], opp: bout.sides[1] };
}
const die = (id, type, value) => ({ id, type, value, up: [], t: 1 });

// ---------- dice go on a trick only once it is bid on; any number, any size ----------
{
  const { bout, me } = table();
  const charge = me.book.find((t) => t.id === 'charge'); const e = B.draw(bout, me, charge.uid);
  bout.phase = 'aim'; me.tray.push(die('a', 'd8', 5), die('b', 'd4', 2), die('c', 'd6', 3), die('d', 'd6', 3));
  assert(B.canPlace(bout, me, 'a', e), 'a shown trick with no bid takes no dice');
  e.state = 'bid'; e.bidValue = 1; e.bid = [{ id: 1, kind: 'std', value: 1 }];
  for (const id of ['a', 'b', 'c', 'd']) assert(!B.canPlace(bout, me, id, e) && B.place(bout, me, id, e), `die ${id} goes on the bid trick, whatever its size`);
  assert(e.dice.length === 4 && e.dice.length > D.TRICKS.charge.count, 'a trick takes more dice than its Bonus count');
  assert(B.bonusDice(e).map((d) => d.id).join() === 'c,d', 'its Bonus dice are the first of its own size (Charge: 2d6)');
  assert(B.bonusMet(me, e), 'the two d6 match, so the Bonus is met even with other dice on it');
  assert(B.totalParts(me, e).diceSum === 13 && B.totalParts(me, e).bid === 1, 'every die adds its value, and so does the bid');
}
// ---------- no Trait: a bid trick with no dice plays its roll effect at the bid's value ----------
{
  const { bout, me, opp } = table(12);
  const e = { uid: 'z', trick: { id: 'charge', q: 1 }, dice: [], bid: [], bidValue: 3, paid: [3], state: 'play', stack: [], target: B.validTargets(bout, me, { trick: { id: 'charge', q: 1 }, dice: [], state: 'bid' })[0] };
  const w0 = B.worth(opp), st = drain(B._test.play(bout, me, e));
  assert(st.some((x) => /Charge \(3¢ bid\)/.test(x.text)), 'the fee is the bid\'s value');
  assert(!D.TYPES.expense.trait && !D.TYPES.insurance.traitText, 'types carry no Trait any more');
  void w0;
}
// ---------- lingering: stacked copies, one bid, a copy a turn ----------
{
  const { bout, me } = table(13);
  const [a, b] = [0, 1].map((k) => ({ uid: 900 + k, id: 'charge', q: 1, wear: 74, rar: k ? 'foil' : 'basic', ...(k ? { foil: 1 } : {}) }));
  me.book.push(a, b); me.tip.trickery = 5;
  const e = B.draw(bout, me, a.uid);
  assert(!B.canStackOn(me, { id: 'mug', q: 1 }, e) && !B.canStackOn(me, { id: 'charge', q: 2 }, e), 'only a copy at the same quality stacks');
  assert(B.draw(bout, me, b.uid, e.uid) === e && e.trick.uid === b.uid && e.stack.length === 1, 'drawing a copy onto it stacks it: the new copy on top');
  B.undraw(bout, me, e.uid); assert(e.trick.uid === a.uid && !e.stack.length && me.book.includes(b), 'undo takes the top copy back');
  B.draw(bout, me, b.uid, e.uid);
  for (const s of bout.sides) for (const x of s.run.filter((y) => y !== e)) x.state = 'shown';
  e.state = 'bid'; e.bidValue = 1; e.bid = [{ id: 5e6, kind: 'std', value: 1 }]; e.dice = [die('p', 'd6', 4)]; e.target = B.validTargets(bout, me, e)[0];
  bout.phase = 'resolve'; drain(B.resolve(bout));
  assert(me.run.includes(e) && e.trick.uid === a.uid && e.lingerLeft === 0, 'after the first turn the top copy taps and the next one waits in play');
  assert(me.tapped.tricks.some((x) => x.trick.uid === b.uid) && e.dice.length === 1, 'the copy that played tapped; the dice stay for the next copy');
  if (!bout.over) { bout.phase = 'resolve'; drain(B.resolve(bout));
    assert(!me.run.includes(e) && me.tapped.tricks.some((x) => x.trick.uid === a.uid), 'the last copy plays, then it and its dice tap'); }
}
console.log('ok, stacks: bid before dice, any dice, Bonus dice, no Trait, bids add value, stacked tricks linger');

// ---------- the owner of a contested space plays on it first; creatures act after both Rollers ----------
{
  const { bout, me, opp } = table(21);
  const tgt = { side: 0, r: me.dims.meterRows, c: 1 };
  const mine = { uid: 'm', trick: { id: 'cushion', q: 1 }, dice: [die('m1', 'd6', 3)], bid: [], bidValue: 1, paid: [1], state: 'play', stack: [], target: { ...tgt, side: 0 } };
  const theirs = { uid: 't', trick: { id: 'charge', q: 1 }, dice: [die('t1', 'd6', 3)], bid: [], bidValue: 1, paid: [1], state: 'play', stack: [], target: { side: 0, r: tgt.r, c: tgt.c } };
  const first = B.ownerFirst(bout, [{ s: me, e: mine }, { s: opp, e: theirs }]);
  assert(first.has(mine) && !first.has(theirs), 'two tricks reach one of your spaces: yours plays on it first');
  const far = { ...theirs, target: { side: 0, r: tgt.r, c: (tgt.c + 2) % me.dims.cols } };
  assert(!B.ownerFirst(bout, [{ s: me, e: mine }, { s: opp, e: far }]).size, 'no shared space: both play together');
  assert(['ufo', 'dragon', 'mothership'].every((k) => B.creatureType(k) === 'expense') && B.creatureType('fairy') === 'correction', 'each creature acts in the House phase of its type');
  void opp;
}
console.log('ok, resolution order: the owner first on a contested space; creatures after both Rollers');
