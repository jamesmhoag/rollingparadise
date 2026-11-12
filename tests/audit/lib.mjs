// Balance audit harness: whole runs played headless, with a configurable board and strategy.
// The board override is applied to D.BASE_DIMS, which both the player (rollerStats) and the
// opponents (genOpponent) read, so a change to the base board applies to everyone at the table.
import * as R from '../../js/run.js';
import * as B from '../../js/bout.js';
import * as AI from '../../js/ai.js';
import * as D from '../../js/data.js';

const DEFAULT_DIMS = { ...D.BASE_DIMS };
export function setBoard(cfg = {}) { Object.assign(D.BASE_DIMS, DEFAULT_DIMS, cfg); }

// ---------------- play: the in-bout planner for side 0, with knobs ----------------
// Knobs (all optional; absent = the shipped AI, exactly):
//   draw: 'max' (draw up to Trickery) | 'one' (draw one, bank Conviction)
//   roll: 'one' (roll one die, bank Cunning) | 'flip' (also flip a chip when dice run short)
//   bid:  'all' (use every bid on dice-loaded tricks, any chip size) | 'one' (one bid, bank Charisma)
const prio = (e) => (D.TRICKS[e.trick.id].type === 'expense' ? 0 : 1);
function planDraw(b, s, k) {
  if (!k.draw) return AI.planPhase(b, s);
  const want = k.draw === 'one' ? 1 : Math.max(1, B.tipOf(s, 'trickery') - s.used.draw);
  const order = s.book.slice().sort((x, y) => ({ expense: 0, insurance: 1, investment: 2, correction: 3 }[D.TRICKS[x.id].type] - { expense: 0, insurance: 1, investment: 2, correction: 3 }[D.TRICKS[y.id].type]) || b.rng.next() - 0.5);
  for (const t of order.slice(0, want)) B.draw(b, s, t.uid);
}
function planRoll(b, s, k) {
  if (!k.roll) return AI.planPhase(b, s);
  const open = s.run.filter((e) => e.state === 'shown' && e.dice.length < D.TRICKS[e.trick.id].count).sort((x, y) => prio(x) - prio(y));
  if (!open.length || !B.canAct(b, s)) return;
  const room = open.reduce((n, e) => n + D.TRICKS[e.trick.id].count - e.dice.length, 0);
  const n = k.roll === 'one' ? 1 : Math.min(room, B.tipOf(s, 'proficiency'));
  const ids = s.pouch.slice().sort((x, y) => +y.type.slice(1) - +x.type.slice(1)).slice(0, n).map((d) => d.id);
  let flips = [];
  if (k.roll === 'flip' && ids.length < n) flips = B.flippable(s).sort((x, y) => y.ch.value - x.ch.value).slice(0, n - ids.length).map((f) => ({ r: f.r, c: f.c }));
  if (!ids.length && !flips.length) { const f = B.flippable(s).sort((x, y) => x.ch.value - y.ch.value)[0]; if (f) flips = [{ r: f.r, c: f.c }]; }
  if (!B.throwDice(b, s, ids, flips)) return;
  for (const e of open) for (const d of s.tray.slice().sort((x, y) => (y.value || 0) - (x.value || 0))) {
    if (e.dice.length >= D.TRICKS[e.trick.id].count) break;
    if (!B.canPlace(b, s, d.id, e)) B.place(b, s, d.id, e);
  }
  if (!B.placedThisTurn(b, s)) for (const d of s.tray.slice()) { const e = s.run.find((x) => !B.canPlace(b, s, d.id, x)); if (e) { B.place(b, s, d.id, e); break; } }
}
function planBid(b, s, k) {
  if (!k.bid) return AI.planPhase(b, s);
  const cheapest = () => B.biddable(s).sort((x, y) => x.ch.value - y.ch.value)[0];
  const ready = s.run.filter((e) => e.state === 'shown').sort((x, y) => (y.dice.length ? 1 : 0) - (x.dice.length ? 1 : 0) || prio(x) - prio(y));
  const cap = k.bid === 'one' ? 1 : B.tipOf(s, 'ingenuity');
  for (const e of ready) {
    if (s.used.bid >= cap) break;
    if (!e.dice.length && k.bid === 'all') continue;
    const spot = cheapest(); if (!spot || B.worth(s) - spot.ch.value <= 1) break;
    B.bid(b, s, e, spot.r, spot.c);
  }
  if (!s.used.bid && B.canAct(b, s)) {
    const e = s.run.filter((x) => x.state !== 'play').sort((x, y) => (y.dice.length ? 1 : 0) - (x.dice.length ? 1 : 0) || prio(x) - prio(y))[0];
    const spot = cheapest(); if (e && spot) B.bid(b, s, e, spot.r, spot.c);
  }
}
function planSide(b, s, k) {
  if (s.idx !== 0 || !k) return AI.planPhase(b, s);
  if (b.phase === 'draw') planDraw(b, s, k); else if (b.phase === 'roll') planRoll(b, s, k); else if (b.phase === 'bid') planBid(b, s, k); else AI.planPhase(b, s);
}
function playBout(bout, knobs) {
  let steps = 0;
  while (!bout.over) {
    if (bout.phase === 'drink') { for (const s of bout.sides) AI.drinkPhase(bout, s); B.nextTurn(bout); }
    while (B.PHASES.includes(bout.phase)) {
      for (const s of bout.sides) planSide(bout, s, knobs);
      if (!B.advance(bout)) B.advance(bout, true);
    }
    for (const _ of B.resolve(bout)) if (++steps > 60000) throw new Error('runaway bout');
  }
  return bout;
}

// ---------------- shopping ----------------
// Every pattern gets the same budget: `frac` of the purse each time the Roller visits the shops
// (on entering a floor and between bouts). Whatever is not spent or put on the table is wagered.
const OWN = (run, id) => !D.TRICKS[id].cls || D.TRICKS[id].cls === run.cls;
function track(ctx, cat, ok, cost) { if (ok) { ctx.m.purchases++; ctx.m.buys[cat] = (ctx.m.buys[cat] || 0) + 1; ctx.left -= cost; } return ok; }
const BUY = {
  tricks(run, ctx) {
    if (!run.fs.shop) return;
    for (const it of run.fs.shop.slice().sort((a, b) => (OWN(run, b.trick.id) - OWN(run, a.trick.id)) || a.cost - b.cost)) {
      const p = R.price(run, 'trader', it.cost); if (p > ctx.left) continue;
      track(ctx, 'trick', R.buyTrick(run, it.key), p);
    }
  },
  restock(run, ctx) { const p = R.restockCost(run); if (p <= ctx.left * 0.5 && track(ctx, 'restock', R.restock(run), p)) BUY.tricks(run, ctx); },
  upgrades(run, ctx) {
    for (const t of run.tricks.slice().sort((a, b) => b.q - a.q || a.up - b.up)) {
      if (run.fs.upgrades <= 0 || t.up >= 2) continue; const p = R.upgradeCost(run, t); if (p > ctx.left) continue;
      track(ctx, 'trickUpgrade', R.upgradeTrick(run, t.uid), p);
    }
  },
  forge(run, ctx) {
    for (const type of ['d20', 'd10', 'd8', 'd6']) {
      const F = D.DICE[type].forge; if (run.floor < F.floor) { ctx.miss('forge_' + type, 'floor'); continue; }
      const p = R.forgeCost(run, type); if (p > ctx.left) { ctx.miss('forge_' + type, 'cost'); continue; }
      const fod = R.forgeFodder(run, type); if (!fod || run.dice.length - fod.length + 1 < 5) { ctx.miss('forge_' + type, 'fodder'); continue; }
      if (fod.some((d) => D.DICE[d.type].faces >= D.DICE[type].faces)) continue; // never forge sideways
      if (track(ctx, 'forge_' + type, R.forge(run, type), p)) return;
    }
  },
  dieUpgrades(run, ctx) {
    for (const d of run.dice.slice().sort((a, b) => D.DICE[b.type].faces - D.DICE[a.type].faces)) {
      const up = R.dieUpgradeBlock(run, d, 'accelerate') ? 'escalate' : 'accelerate';
      if (R.dieUpgradeBlock(run, d, up)) continue; const p = R.dieUpgradeCost(run, d); if (p > ctx.left) { ctx.miss('dieUpgrade', 'cost'); return; }
      track(ctx, 'dieUpgrade', R.upgradeDie(run, d.id, up), p);
    }
  },
  drink(run, ctx) {
    if (run.drink) return;
    const ds = run.fs.lounge.drinks.slice().sort((a, b) => R.drinkCost(run, b) - R.drinkCost(run, a));
    for (const d of ds) { const p = R.drinkCost(run, d); if (p > ctx.left) { ctx.miss('drink_' + d.id, 'cost'); continue; } if (track(ctx, 'drink', R.buyDrink(run, d.id), p)) return; }
  },
  bets(run, ctx) {
    for (const ev of run.fs.book.events) {
      if (ev.bet || ev.done) continue; const stake = Math.floor(Math.min(ctx.left, run.purse * 0.25)); if (stake < run.fs.book.min) { ctx.miss('bet', 'cost'); return; }
      const pick = ev.field.reduce((bi, x, i) => (x.p > ev.field[bi].p ? i : bi), 0);
      if (R.placeBet(run, ev.key, pick, stake)) { ctx.m.bets++; ctx.left -= stake; } return;
    }
  },
  chip(run, ctx, ids, capShare = 0.25) {
    const st = R.rollerStats(run), cap = Math.floor(B.barCapacity(st.dims) * capShare);
    for (let guard = 0; guard < 40; guard++) {
      const have = Object.values(run.chips).reduce((n, x) => n + x, 0); if (have >= cap) return;
      let bought = false;
      for (const id of ids) {
        if (!R.shopChipOpen(run, id)) { ctx.miss('chip_' + id, 'floor'); continue; }
        const p = D.shopPrice(id); if (p > ctx.left) { ctx.miss('chip_' + id, 'cost'); continue; }
        if (Object.values(run.chips).reduce((n, x) => n + x, 0) >= cap) return;
        if (track(ctx, 'chip_' + id, R.buyShopChip(run, id), p)) bought = true;
      }
      if (!bought) return;
    }
  },
};

// A strategy: { buy: [...steps], frac, tilts:{}, dd, prize, barfly, jacket, knobs, plan:{spacing,stacking}, sellDown }
// steps are names in BUY or ['chip', [ids]]
function shop(run, strat, m, miss) {
  const ctx = { m, left: Math.floor(run.purse * (strat.frac ?? 0.5)), miss };
  for (const step of strat.buy || []) { if (Array.isArray(step)) BUY.chip(run, ctx, step[1], step[2]); else BUY[step](run, ctx); }
  run.plan.resist = { ...run.chips }; // deploy every shop chip owned
}

// ---------------- a whole run ----------------
export const STAGES = ['none', 'intro', ...[1, 2, 3, 4].flatMap((f) => [`F${f} table 1`, `F${f} table 2/3`, `F${f} High Roller`])];
export function runOne(cls, seed, strat = {}) {
  const run = R.newRun(cls, strat.jacket || 'standard', seed);
  if (strat.plan) Object.assign(run.plan, strat.plan);
  const m = { cls, seed, bouts: 0, wins: 0, cbouts: 0, cwins: 0, turns: 0, timeouts: 0, purchases: 0, bets: 0, buys: {}, spent: 0, floor: 0, stage: 0, cleared: false,
    maxPurse: 0, purseAt: {}, misses: {}, sold: 0, barfly: [0, 0], died: '', lossAt: [] };
  const miss = (what, why) => { m.misses[what] ||= why; };
  const knobs = strat.knobs || null;
  const fight = (start, casino = true) => {
    const { bout, ctx } = start; playBout(bout, knobs); const res = R.settle(run, ctx, bout);
    m.bouts++; m.turns += bout.turn; if (bout.timeout) m.timeouts++; if (res.win) m.wins++;
    if (casino) { m.cbouts++; if (res.win) m.cwins++; }
    if (res.prizes) {
      const choice = strat.prize || 'die';
      if (choice === 'glean') R.claimPrize(run, ctx, res, 'glean', [res.prizes.tricks.reduce((bi, t, i, a) => (OWN(run, t.id) && !OWN(run, a[bi].id)) || t.q > a[bi].q ? i : bi, 0)]);
      else { const order = res.prizes.dice.map((d, i) => [D.DICE[d.type].faces, i]).sort((a, b) => b[0] - a[0]).map((x) => x[1]); R.claimPrize(run, ctx, res, choice, order.slice(0, 2)); }
    }
    m.maxPurse = Math.max(m.maxPurse, run.purse);
    return res;
  };
  // the doorman
  let ok = false; for (let i = 0; i < 20 && !ok; i++) ok = fight(R.startIntro(run), false).win;
  if (!ok) { m.died = 'intro'; return m; }
  m.stage = 1;
  m.spent = 0;
  const recover = (oppWorth) => { // after a loss: sell surplus tricks and dice to raise a stake
    if (strat.sellDown === false) return run.purse > 0;
    const target = oppWorth;
    while (run.purse < target) {
      const t = run.tricks.length > 4 ? run.tricks.slice().sort((a, b) => R.trickValue(run, a) - R.trickValue(run, b))[0] : null;
      if (t) { R.sellTrick(run, t.uid); m.sold++; continue; }
      const d = run.dice.length > 4 ? run.dice.slice().sort((a, b) => D.DICE[a.type].sell - D.DICE[b.type].sell)[0] : null;
      if (d) { R.sellDie(run, d.id); m.sold++; continue; }
      break;
    }
    return run.purse >= Math.max(6, oppWorth * 0.3);
  };
  let losses = 0;
  for (let f = 1; f <= 4; f++) {
    R.enterFloor(run, f); m.floor = f; m.purseAt[f] = run.purse;
    if (run.pendingCard) R.resolvePending(run, R.walletCards(run).find((id) => id !== 'royal') || null);
    R.searchFloor(run);
    if (run.pendingCard) R.resolvePending(run, R.hasCard(run, 'royal') ? 'royal' : null);
    if (strat.barfly && run.purse > 0) {
      const d = run.fs.lounge.drinks.slice().sort((a, b) => a.cost - b.cost)[0];
      const res = fight(R.startLounge(run, d.id), false); m.barfly[res.win ? 0 : 1]++;
    }
    shop(run, strat, m, miss);
    const path = [0, 1 + (seed % 2), 'boss'];
    for (let k = 0; k < 3; k++) {
      const boss = path[k] === 'boss', prep = boss ? R.newPrep(run, 'boss') : R.newPrep(run, 'table', path[k]);
      for (const [t, on] of Object.entries(strat.tilts || {})) if (on) { if (!R.setTilt(run, prep, t, true)) miss('tilt_' + t, 'floor'); }
      if (strat.dd && k === 1 && run.fs.lastWin) prep.dd = true;
      run.plan.counts = null; run.plan.resist = { ...run.chips };
      const opp = boss ? run.fs.boss.opp : run.fs.tables[path[k]].opp;
      const before = run.stats.spent;
      const res = fight(R.startTable(run, prep));
      if (res.win) { m.stage = 2 + (f - 1) * 3 + k; if (k < 2 || f < 4) shop(run, strat, m, miss); }
      else {
        losses++; m.lossAt.push(STAGES[2 + (f - 1) * 3 + k]);
        if (losses > 12 || !recover(opp.worth)) { m.died = STAGES[2 + (f - 1) * 3 + k]; m.spent = run.stats.spent; return m; }
        k--; // try the same table again
      }
      void before;
    }
    if (f < 4 && R.nextAfterBoss(run) === 'suite') { R.suiteOffer(run); R.goToBed(run, false); }
  }
  m.cleared = true; m.floor = 5; m.spent = run.stats.spent;
  return m;
}
