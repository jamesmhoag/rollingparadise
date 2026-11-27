// Classes, Rollers and Opponents: a Class is attributes (TIP, BVD, a starting CCC); a Roller is a name, a Class and a
// starting inventory; every opponent names a Class; a High Roller's business card is yours once you clear them.
import * as R from '../js/run.js'; import * as B from '../js/bout.js'; import * as D from '../js/data.js';
const ok = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } };

ok(Object.values(D.CLASSES).every((K) => !('hero' in K) && !('tricks' in K) && !('dice' in K) && !('ccc' in K) && ['charisma', 'cunning', 'conviction'].includes(K.rewards)), 'a class holds attributes and a primary C, no CCC of its own');
ok(Object.values(D.ROLLERS).every((X) => D.CLASSES[X.cls] && X.tricks?.length && X.dice), 'every Roller names a class and starts with a Book and a Pouch');
ok(Object.values(D.ROSTER).every((X) => D.CLASSES[X.cls]), 'every opponent and High Roller names a class');
{ const run = R.newRun('fox', 'standard', 5);
  ok(run.cls === 'rascal' && run.roller === 'fox' && run.dice.length === 7 && run.tricks.map((x) => x.id).join() === D.ROLLERS.fox.tricks.join(), 'walking in as a Roller deals its own inventory');
  ok(R.newRun('rascal', 'standard', 5).roller === 'fox' && D.heroName('rascal', 'fox') === 'Fox the Rascal', 'a class id still finds its Roller'); }
{ const run = R.newRun('owl', 'standard', 6), c = R.rollerStats(run).c;
  ok(c.charisma === 0 && c.cunning === 0 && c.conviction === 0, 'with no jacket or sip a Roller starts at 0 / 0 / 0'); }
{ const run = R.newRun('owl', 'standard', 7); R.enterFloor(run, 1);
  const id = Object.keys(D.ROSTER).find((k) => !D.ROSTER[k].boss); const X = D.ROSTER[id]; const was = { tricks: X.tricks, dice: X.dice };
  X.tricks = ['mug', 'jab']; X.dice = { d10: 2 };
  const o = R.genOpponent(run, 1, 50, { roster: id, cls: X.cls });
  ok(o.tricks.map((x) => x.id).join() === 'mug,jab' && o.dice.length === 2 && o.dice.every((d) => d.type === 'd10'), 'an opponent\'s own Book and Pouch replace the generated ones');
  X.tricks = was.tricks; X.dice = was.dice; }
{ // clearing a High Roller hands you their business card, and you play by it
  const run = R.newRun('owl', 'standard', 8); R.enterFloor(run, 1); run.purse = 3000; run.fs.bossOpen = true;
  const { bout, ctx } = R.startTable(run, R.newPrep(run, 'boss', 0)); const card = ctx.opp.trait;
  ok(card && D.BOSS_TRAITS[card], 'the High Roller carries a business card');
  run.cards = []; bout.over = true; bout.winner = 0; R.settle(run, ctx, bout); // (an empty wallet: there is room for it)
  const rid = R.rosterIdOf(ctx.opp), cid = D.bizCardId(rid);
  ok(D.CARDS[cid]?.kind === 'business' && D.CARDS[cid].roller === rid, 'which is a card like any other, carrying its Roller');
  ok(run.cards.includes(cid) && R.walletCards(run).includes(cid) && R.traitsOf(run).join() === card, 'you keep it in a wallet slot, and its trait is yours');
  const me = R.startTable(run, R.newPrep(run, 'table', 1)).bout.sides[0];
  ok(B.bossTrait(me)?.name === D.BOSS_TRAITS[card].name, 'and it plays for you at the next table');
  { const other = Object.keys(D.ROSTER).find((r) => D.ROSTER[r].boss && D.ROSTER[r].trait && D.ROSTER[r].trait !== card); run.cards.push(D.bizCardId(other)); // (past its slots, to hold two for the check)
    const two = R.startTable(run, R.newPrep(run, 'table', 2)).bout.sides[0]; ok(B.bossTraits(two).length === 2 && B.bossTraits(two)[1].name === D.BOSS_TRAITS[D.ROSTER[other].trait].name, 'two business cards: you play by both traits'); run.cards.pop(); }
  { const held = D.CARDS[cid].roller; let met = 0, all = 0; // the High Roller whose card you hold stays away
    for (let seed = 1; seed <= 12; seed++) for (const f of [1, 2, 3]) { const r2 = R.newRun('technician', 'standard', seed); r2.cards = [cid]; R.enterFloor(r2, f); const others = R.rosterFor(f, 'boss').filter((id) => id !== held); if (!others.length) continue; all++; if (R.rosterIdOf(r2.fs.boss.opp) === held) met++; }
    ok(all > 0 && met === 0, `hold a High Roller's card and they do not sit down again (${met} of ${all})`); }
  ok(R.dropCard(run, cid) && R.traitsOf(run).length === 0, 'drop the card and the trait goes with it');
  run.cards = R.walletCards(run).slice(); while (!R.walletFull(run)) run.cards.push(Object.keys(D.CARDS).find((k) => D.CARDS[k].kind === 'note' && !run.cards.includes(k)));
  ok(!R.addCard(run, cid) && run.pendingCard === cid, 'with a full wallet it waits for you to make room, as any card does'); }
{ // a Roller's starting position is the run's first plan; an opponent's is fitted to its own position
  D.ROLLERS.owl.layout = [{ r: 0, c: 2, chips: [5, 1] }]; const run = R.newRun('owl', 'standard', 9);
  ok(JSON.stringify(run.plan.layout) === JSON.stringify(D.ROLLERS.owl.layout) && run.plan.layout !== D.ROLLERS.owl.layout, 'a run starts from its Roller\'s position (a copy)');
  delete D.ROLLERS.owl.layout;
  const dims = R.posDims({ cls: 'hustler' }), deep = R.posDims({ cls: 'technician' });
  ok(deep.barRows > dims.barRows && R.posDims({ cls: 'hustler', boss: true }).stackMax === dims.stackMax + 1, 'the position follows the class and rank');
  ok(R.fitLayout([{ r: deep.barRows - 1, c: 0, chips: [1] }, { r: 0, c: 0, chips: [1] }], dims).length === 1, 'a row the class no longer has is left out'); }
console.log('ok, rollers: classes are attributes, Rollers and opponents name one, business cards are kept');
