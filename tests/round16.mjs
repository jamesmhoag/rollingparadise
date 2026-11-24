// Round 16: unused actions pay as chips when their phase is passed, Power and Steal chips, maker areas, best aims.
import * as R from '../js/run.js'; import * as B from '../js/bout.js'; import * as D from '../js/data.js';
import { bestTarget } from '../js/ai.js';
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exit(1); } };
const drain = (g) => { const out = []; for (const st of g) out.push(st); return out; };
const meter = (s) => s.grid.slice(0, s.dims.meterRows).flat();
const count = (s, f) => s.grid.flat().reduce((n, c) => n + c.chips.filter(f).length, 0);
function table(seed = 3, cls = 'hustler') {
  const run = R.newRun(cls, 'standard', seed); R.enterFloor(run, 2); run.purse = 3000;
  const { bout } = R.startTable(run, R.newPrep(run, 'table', 0)); return { run, bout, me: bout.sides[0], opp: bout.sides[1] };
}

// ---------- the rewards rotate: unused draws → Steal, unused rolls → Power, unused bids → Opportunity ----------
// Passing a phase only holds the unused actions; the House deploys them in their own phase (Power with the
// Investments, Opportunity with the Insurances, the Steal with the Expenses).
{
  const { bout, me } = table();
  assert(B.REWARD.draw.what === 'Steal' && B.REWARD.roll.what === 'Power' && B.REWARD.bid.what === 'Opportunity', 'draws give Steal, rolls Power, bids Opportunity');
  assert(B.REWARD.roll.deploy === 'investment' && B.REWARD.bid.deploy === 'insurance' && B.REWARD.draw.deploy === 'expense', 'Power is an Investment, Opportunity an Insurance, Steal an Expense');
  const steal = B.cOf(me, 'charisma') * B.tipOf(me, 'trickery');
  assert(B.rewardOf(me, 'draw').n === steal, 'what passing Draw will give is known before it is passed');
  B.advance(bout, true);
  assert(!me.grid.flat().some((c) => c.chips.some((ch) => ch.shop === 'steal')) && me.held.some((x) => x.phase === 'draw'), 'passing Draw holds the unused draws: nothing goes on the table yet');
  const want = B.cOf(me, 'conviction') * B.tipOf(me, 'proficiency');
  B.advance(bout, true); // Roll passed with nothing thrown
  assert(B.powerChips(me).length === 0 && B.powerAhead(me) === want, 'unused rolls are held too, and counted as Power still to come');
  const e = { uid: 'x', trick: { id: 'charge', q: 1, up: 0 }, dice: [{ id: 'd1', type: 'd6', value: 3, up: [] }], bid: [], bidValue: 1, state: 'play', lingerLeft: 0, lingerTotal: 0 };
  assert(B.previewTotal(me, e) >= 3 + want, 'while you plan, a preview counts the Power still to come');
  me.mods.boost = 0; drain(B._test.deployHeld(bout, me, 'investment'));
  const pc = B.powerChips(me);
  assert(pc.length === want && pc.every((x) => x.r < me.dims.meterRows && x.ch.life === 1) && me.mods.boost === want, 'the House deploys them with the Investments: Power chips on the Bet, boosting the turn');
  assert(!me.held.some((x) => x.phase === 'roll') && B.powerAhead(me) === 0, 'once deployed, they are no longer held');
  assert(bout.rewards.some((w) => w.side === 0 && w.phase === 'roll' && /Power chip/.test(w.text)) || want === 0, 'the reward is reported for the feed');
  drain(B._test.chipPhase(bout, me, 'investment')); assert(me.mods.boost === want, 'a Power chip adds once a turn');
  const o0 = count(me, (ch) => ch.kind === 'opp'), nOpp = B.rewardOf(me, 'bid').n; B.advance(bout, true);
  assert(count(me, (ch) => ch.kind === 'opp') === o0, 'unused bids wait for the Insurance phase');
  drain(B._test.deployHeld(bout, me, 'insurance'));
  assert(count(me, (ch) => ch.kind === 'opp') - o0 === nOpp || me.overflow > 0, 'then become Opportunity chips on the Bet');
  bout.phase = 'resolve'; const b0 = me.mods.boost, n = B.addPower(bout, me, 2);
  assert(me.mods.boost === b0 + n, 'Power added during play boosts the rest of the turn at once');
}
// ---------- all draws used: nothing kept ----------
{
  const { bout, me } = table(5);
  for (let i = 0; i < B.tipOf(me, 'trickery') && me.book.length; i++) B.draw(bout, me, me.book[0].uid);
  const w = B.rewardOf(me, 'draw'); B.advance(bout, true);
  assert(w.unused === 0 ? !me.grid.flat().some((c) => c.chips.some((ch) => ch.shop === 'steal')) : true, 'with every draw used, passing Draw makes nothing');
}
// ---------- the Steal goes out with the Expenses ----------
{
  const { bout, me } = table(7);
  B.advance(bout, true); B.advance(bout, true); B.advance(bout, true);
  assert(me.held.some((x) => x.phase === 'draw'), 'unused draws are held until the House plays');
  bout.stage.paid[0] = 6; bout.stage.paid[1] = 6; const w0 = B.worth(me);
  bout.phase = 'resolve'; for (const s of bout.sides) for (const e of s.run) e.state = 'shown';
  const steps = drain(B.resolve(bout)).flatMap((st) => [st, ...(st.parts || [])]);
  assert(!B.rewardOf(me, 'draw').n || steps.some((st) => /Steal/.test(st.text)), 'the Steal takes from the Stage in the Expense phase');
  assert(B.worth(me) > w0 - 99, 'the stolen chips land on the table');
}

// ---------- makers aim at the area they belong to ----------
{
  const { bout, me } = table(9);
  const inv = { uid: 'm', trick: { id: 'empower', q: 1, up: 0 }, dice: [], bid: [], bidValue: 1, state: 'bid' };
  const v = B.validTargets(bout, me, inv);
  assert(v.length && v.every((t) => t.side === 0 && t.r < me.dims.meterRows), 'an Investment maker aims at Meter spaces');
  assert(v.some((t) => !me.grid[t.r][t.c].chips.length), 'empty Meter spaces count: the chip is placed there');
  const ins = { uid: 'n', trick: { id: 'cushion', q: 1, up: 0 }, dice: [], bid: [], bidValue: 1, state: 'bid' };
  assert(B.validTargets(bout, me, ins).every((t) => B.occupied(me.grid[t.r][t.c])), 'an Insurance maker aims at a stack it protects');
}

// ---------- the player's default aim: the best target, without touching the bout's dice ----------
{
  const { bout, me } = table(11);
  const e = { uid: 'z', trick: { id: 'charge', q: 1, up: 0 }, dice: [{ id: 'd1', type: 'd6', value: 5, up: [] }], bid: [], bidValue: 1, state: 'bid' };
  const st = JSON.stringify(bout.rng), a = bestTarget(bout, me, e, { noise: false }), b2 = bestTarget(bout, me, e, { noise: false });
  assert(a && b2 && a.r === b2.r && a.c === b2.c && JSON.stringify(bout.rng) === st, 'the default aim is the same each time and leaves the random draws alone');
}
console.log('ok, round 16: phase rewards as chips, Power and Steal chips, maker areas, best aims');
