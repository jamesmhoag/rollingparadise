// Round 17: trick condition (wear, sale price), rarity (Foil tiers, Misprint, Reprint), quality dice, foil packs.
import * as R from '../js/run.js'; import * as B from '../js/bout.js'; import * as D from '../js/data.js';
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exit(1); } };
const drain = (g) => { const out = []; for (const st of g) out.push(st); return out; };
function table(seed = 3, cls = 'hustler', floor = 2) {
  const run = R.newRun(cls, 'standard', seed); R.enterFloor(run, floor); run.purse = 30000;
  const { bout } = R.startTable(run, R.newPrep(run, 'table', 0)); return { run, bout, me: bout.sides[0], opp: bout.sides[1] };
}
const entry = (trick, vals, extra = {}) => ({ uid: 'x' + trick.id, trick, dice: vals.map((v, i) => ({ id: `d${trick.id}${i}`, type: D.defOf(trick).die, value: v, up: [] })), bid: [], bidValue: 1, state: 'play', lingerLeft: 0, lingerTotal: 0, ...extra });

// ---------- condition: wear thresholds and sale prices ----------
{
  const c = (wear, gem) => D.condOf({ wear, gem });
  assert(c(100, true) === 'gem' && c(100) === 'mint' && c(99) === 'excellent' && c(75) === 'excellent' && c(74) === 'good' && c(50) === 'good' && c(49) === 'poor' && c(0) === 'poor', 'wear thresholds: Mint 100, Excellent 75, Good 50, Poor below');
  const run = R.newRun('hustler', 'standard', 2); R.enterFloor(run, 1);
  assert(run.tricks.every((t) => D.condOf(t) === 'good' && t.rar === 'basic'), 'your first Book is Good, plain prints');
  assert(run.fs.shop.every((it) => D.condOf(it.trick) === 'excellent'), 'tricks off the shelf are Excellent');
  const t = { id: 'charge', q: 2, wear: 100 }, base = 25 * run.floor * 2;
  assert(R.trickValue(run, t) === base && R.trickValue(run, { ...t, gem: true }) === base * 2 && R.trickValue(run, { ...t, wear: 80 }) === Math.round(base * 0.75) && R.trickValue(run, { ...t, wear: 60 }) === base * 0.5, 'Mint sells at the base, Gem Mint 200%, Excellent 75%, Good 50%');
  run.tricks[0].wear = 10; const n = run.tricks.length, uid = run.tricks[0].uid;
  assert(!R.sellTrick(run, uid) && run.tricks.length === n, 'a Poor trick cannot be sold');
  assert(R.trashTrick(run, uid) && run.tricks.length === n - 1, 'the Trader trashes it instead');
  assert(!R.trashTrick(run, run.tricks[0].uid), 'only Poor tricks are trashed');
}
// ---------- wear: one per play, kept after the bout; condition never changes power ----------
{
  const { run, bout, me } = table(4);
  const t = me.book[0], w0 = t.wear, m0 = B.multOf(t);
  B.draw(bout, me, t.uid); B.advance(bout, true); B.advance(bout, true);
  const spot = B.biddable(me)[0]; B.bid(bout, me, me.run[0], spot.r, spot.c);
  bout.phase = 'aim'; drain(B.resolve(bout));
  assert(t.wear === w0 - 1 && B.multOf(t) === m0, 'a trick loses 1 wear each time it plays, and plays just as hard');
  R.settle(run, { kind: 'intro' }, bout);
  assert(run.tricks.find((x) => x.uid === t.uid).wear === w0 - 1, 'the wear stays with the trick after the bout');
  const poor = { id: 'charge', q: 1, wear: 0 }; assert(B.multOf(poor) === B.multOf({ id: 'charge', q: 1, wear: 100 }), 'a Poor trick plays forever, at full strength');
}
// ---------- rarity: foil tiers multiply; Upgrade chips step the foil ----------
{
  assert(B.trickMult({ id: 'charge', q: 2, foil: 1 }) === 2.5 && B.trickMult({ id: 'charge', q: 2, foil: 2 }) === 3 && B.trickMult({ id: 'charge', q: 2, foil: 3 }) === 4, 'Foil ×1.25, Holo ×1.5, Prism ×2');
  assert(B.trickMult(B.effTrick({ trick: { id: 'charge', q: 1, foil: 1 }, upBoost: 1 })) === 1.5, 'an Upgrade chip bid plays the trick one foil tier higher');
}
// ---------- Misprints: a changed die or Trait ----------
{
  const t = { id: 'charge', q: 1, rar: 'misprint', mis: { die: 'd8', trait: 3 } };
  assert(D.defOf(t).die === 'd8' && D.TRICKS.charge.die === 'd6', 'a Misprint prints its own die; the plain print is untouched');
  assert(B.traitOf(t) === B.traitOf({ id: 'charge', q: 1 }) + 3, 'a Misprint changes the Trait value');
  const { bout, me } = table(5);
  const e = entry(t, [3, 3], { dice: [{ id: 'a', type: 'd6', value: 3 }, { id: 'b', type: 'd6', value: 3 }] }); assert(!B.bonusMet(me, e) && B.bonusMet(me, entry(t, [3, 3])), 'its Bonus asks for its printed die');
  void bout;
}
// ---------- Reprints: older rules ----------
{
  const { bout, me, opp } = table(6);
  const plain = { id: 'charge', q: 1 }, re = { ...plain, rar: 'reprint' }, m = B.traitOf(plain);
  assert(B.previewTotal(me, entry(re, [2, 3])) === B.previewTotal(me, entry(plain, [2, 3])) + 2 * m * (me.heat || 1), 'a Reprint Expense counts the Trait value on each die');
  const st = drain(B._test.play(bout, me, entry(re, [2, 3])));
  assert(st.filter((x) => /Charge \(\d \+\d Trait/.test(x.text)).length === 2, 'a Reprint Expense plays once per die, each die plus the Trait value');
  const blocks = (s) => s.grid.flat().reduce((n, c) => n + c.chips.filter((ch) => ch.kind === 'block').length, 0);
  const b0 = blocks(me); drain(B._test.play(bout, me, entry({ id: 'block', q: 1, rar: 'reprint' }, [1, 1], { lingerLeft: 1 })));
  assert(blocks(me) - b0 === 2 * B.traitOf({ id: 'block', q: 1 }) || me.overflow > 0, 'a Reprint Insurance plays its Trait once per die');
  void opp;
}
// ---------- quality: Grand and Royal roll a quality die when drawn ----------
{
  const { bout, me } = table(7, 'hustler', 3);
  const t = me.book[0]; t.q = 3; const e = B.draw(bout, me, t.uid);
  assert(e.qroll >= 1 && e.qroll <= 10, 'a Grand trick rolls a d10 when drawn');
  const r = e.qroll; B.undraw(bout, me, t.uid); assert(B.draw(bout, me, t.uid).qroll === r, 'drawing it again this turn keeps the roll');
  const x = entry({ id: 'charge', q: 3 }, [1, 2]);
  assert(B.trickMult(B.effTrick({ ...x, qroll: 1 })) === 1 && B.trickMult(B.effTrick({ ...x, qroll: 5 })) === 3, 'a dud plays at Common strength; otherwise full Grand strength');
  assert(B.bonusMet(me, { ...x, qroll: 10 }) && !B.bonusMet(me, { ...x, qroll: 5 }), 'a hot quality die sets off the Bonus whatever the dice');
  const c = me.book.find((y) => y.q < 3); if (c) assert(B.draw(bout, me, c.uid).qroll == null, 'Common and Fine tricks are reliable: no quality die');
}
// ---------- foil packs ----------
{
  const run = R.newRun('rascal', 'standard', 8); R.enterFloor(run, 2); run.purse = 50000;
  assert(R.packOpen(run, 2) && !R.packOpen(run, 3), 'better sets open with the floors');
  assert(R.packCost(run, 2) > R.packCost(run, 1), 'better sets cost more');
  for (const q of [1, 2]) assert(R.packCost(run, q) > 5 * R.trickValue(run, { id: 'charge', q, wear: 100 }), 'a pack costs more than its five tricks sell for at Mint');
  let rare = 0, gems = 0, all = 0;
  for (let k = 0; k < 40; k++) {
    const got = R.buyPack(run, 1 + (k % 2));
    assert(got.length === 5 && got.every((t) => t.wear === 100 && t.q === 1 + (k % 2)), 'a pack holds five Mint tricks of its set\'s quality');
    assert(['misprint', 'reprint'].includes(got[4].rar) || got[4].foil >= 2, 'one of them is a rarer print');
    rare += got.filter((t) => t.rar !== 'basic').length; gems += got.filter((t) => t.gem).length; all += 5;
  }
  assert(gems > 0 && gems < all / 4, 'Gem Mint comes now and then');
  assert(!R.buyPack(run, 4), 'a set not open yet cannot be bought');
  assert(typeof R.upgradeTrick === 'undefined', 'the Trader no longer upgrades tricks');
}
// ---------- an old save: upgrades become the foil they played as ----------
{
  const run = R.newRun('hustler', 'standard', 9); run.tricks = [{ uid: 1, id: 'charge', q: 2, up: 2 }];
  globalThis.localStorage = { s: {}, getItem(k) { return this.s[k] ?? null; }, setItem(k, v) { this.s[k] = v; }, removeItem(k) { delete this.s[k]; } };
  R.saveRun(run); const back = R.loadRun();
  assert(back, 'the save loads'); { const t = back.tricks[0]; assert(t.foil === 2 && t.rar === 'foil' && t.up === undefined && t.wear === D.WEAR.good && B.trickMult(t) === 3, 'an upgraded trick loads as a Holo foil, at the same strength'); }
}
console.log('ok, round 17: condition, rarity, quality dice, foil packs');
