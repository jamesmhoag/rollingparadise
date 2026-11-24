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
  assert(!B.canPlace(bout, me, 'a', e) && B.place(bout, me, 'a', e), 'any size of die can go on a bid trick');
  assert(B.canPlace(bout, me, 'b', e) && B.canPlace(bout, me, 'c', e), 'but then every die on it is that size');
  assert(!B.bonusDice(e).length && !B.bonusMet(me, e), 'a d8 on Charge (2d6) plays, but makes no Bonus');
  B.unplace(bout, me, 'a');
  for (const id of ['c', 'd']) assert(!B.canPlace(bout, me, id, e) && B.place(bout, me, id, e), `d6 ${id} goes on`);
  me.tray.push(die('e', 'd6', 1));
  assert(B.place(bout, me, 'e', e) && e.dice.length > D.TRICKS.charge.count, 'a trick takes more dice than its Bonus count');
  assert(B.bonusDice(e).map((d) => d.id).join() === 'c,d' && B.bonusMet(me, e), 'its Bonus reads the first ones of its own size');
  assert(B.totalParts(me, e).diceSum === 7 && B.totalParts(me, e).bid === 1, 'every die adds its value, and so does the bid');
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
console.log('ok, stacks: bid before dice, one size of dice per trick, Bonus dice, no Trait, bids add value, stacked tricks linger');

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

// ---------- Settle gathers the targeted column toward the targeted space; effects place chips the same for every class ----------
{
  const { bout, me } = table(31), m = me.dims.meterRows, C = me.dims.cols;
  for (let r = 0; r < me.rows; r++) for (let c = 0; c < C; c++) me.grid[r][c].chips = [];
  const last = me.rows - 1, mk = (v) => ({ id: 7e6 + Math.random() * 1e6 | 0, kind: 'std', value: v });
  me.grid[m][1].chips = [mk(1)]; me.grid[last][1].chips = [mk(5), { id: 7.9e6, kind: 'debt', value: 2 }]; me.grid[m][2].chips = [mk(1)];
  const e = { uid: 'st', trick: { id: 'settle', q: 1 }, dice: [die('s1', 'd6', 4)], bid: [], bidValue: 0, paid: [], state: 'play', stack: [], target: { side: 0, r: last, c: 1 } };
  drain(B._test.play(bout, me, e));
  assert(me.grid[last][1].chips.filter((ch) => ch.kind === 'std').length === 2 && !me.grid[m][1].chips.length, 'the column\'s chips gather onto the targeted space');
  assert(!me.grid[last][1].chips.some((ch) => ch.kind === 'debt'), 'its Debt is cleared');
  assert(me.grid[m][2].chips.length === 1, 'other columns are left alone');
  const fox = R.newRun('rascal', 'standard', 32); R.enterFloor(fox, 1); const fb = R.startTable(fox, R.newPrep(fox, 'table', 0)).bout, fs = fb.sides[0];
  for (const x of [me, fs]) for (let r = 0; r < x.dims.meterRows; r++) for (let c = 0; c < x.dims.cols; c++) x.grid[r][c].chips = [];
  B._test.addToMeter(bout, me, [mk(1)]); B._test.addToMeter(fb, fs, [mk(1)]);
  const at = (x) => { for (let r = 0; r < x.dims.meterRows; r++) for (let c = 0; c < x.dims.cols; c++) if (x.grid[r][c].chips.length) return `${r}:${c}`; };
  assert(at(me) === at(fs) && at(me) === '0:0', 'an effect puts chips on the Bet the same way for a Hustler and a Rascal');
}
// ---------- Stir: a wide flat chip that slips under the stacks and shares its roll among the chips on it ----------
{
  const { bout, me } = table(33), m = me.dims.meterRows;
  for (let r = 0; r < me.rows; r++) for (let c = 0; c < me.dims.cols; c++) me.grid[r][c].chips = [];
  const a = { id: 7.1e6, kind: 'std', value: 1 }, b = { id: 7.2e6, kind: 'std', value: 1 }, far = { id: 7.3e6, kind: 'std', value: 1 };
  me.grid[m][0].chips = [a]; me.grid[m + 1][1].chips = [b]; me.grid[m][4].chips = [far];
  const e = { uid: 'sr', trick: { id: 'stir', q: 1 }, dice: [die('x1', 'd6', 4)], bid: [], bidValue: 0, paid: [], state: 'play', stack: [], target: { side: 0, r: m, c: 0 } };
  drain(B._test.play(bout, me, e)); drain(B._test.madeWork(bout, me, 'investment'));
  const stir = me.grid[m][0].chips[0];
  assert(stir?.model === 'stir' && stir.mat?.n === 3 && B.solidCount(me.grid[m][0]) === 1, 'it lies under the stack, 3×3, taking no height');
  assert(a.value + b.value === 2 + 4 && far.value === 1, 'the chips on it share the roll; a chip off it gets nothing');
}
console.log('ok, resolution order: the owner first on a contested space; creatures after both Rollers');
