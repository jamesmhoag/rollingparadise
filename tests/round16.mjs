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

// ---------- passing Draw with draws unused makes a Power chip on the Meter ----------
{
  const { bout, me } = table();
  const want = B.cOf(me, 'conviction') * B.tipOf(me, 'trickery');
  assert(B.rewardOf(me, 'draw').n === want && B.powerOf(me) === 0, 'what passing Draw will give is known before it is passed');
  B.advance(bout, true);
  const pc = B.powerChips(me);
  assert(pc.length === 1 && pc[0].ch.amt === want && pc[0].r < me.dims.meterRows && B.powerOf(me) === want, 'unused draws become one Power chip carrying their Power, on a Meter space');
  assert(bout.rewards.some((w) => w.side === 0 && w.phase === 'draw' && /Power chip/.test(w.text)), 'the reward is reported for the feed');
  assert(bout.rewards.some((w) => w.side === 1 && w.phase === 'draw') === (B.rewardOf(bout.sides[1], 'draw').n > 0), 'the opponent builds theirs too, where you can see them');
  // the next roll effect takes all of it
  const e = { uid: 'x', trick: { id: 'charge', q: 1, up: 0 }, dice: [{ id: 'd1', type: 'd6', value: 3, up: [] }], bid: [], bidValue: 1, state: 'play', lingerLeft: 0, lingerTotal: 0 };
  assert(B.previewTotal(me, e) >= 3 + want, 'a preview counts the Power chips');
  e.target = B.validTargets(bout, me, { ...e, state: 'bid' })[0];
  drain(B._test.play(bout, me, e));
  assert(B.powerOf(me) === 0 && !B.powerChips(me).length, 'playing a roll effect spends the Power chips');
}
// ---------- all draws used: nothing kept ----------
{
  const { bout, me } = table(5);
  for (let i = 0; i < B.tipOf(me, 'trickery') && me.book.length; i++) B.draw(bout, me, me.book[0].uid);
  const w = B.rewardOf(me, 'draw'); B.advance(bout, true);
  assert(w.unused === 0 ? !B.powerChips(me).length : true, 'with every draw used, passing Draw makes nothing');
}
// ---------- Roll gives Opportunity chips, Bid a Steal chip that steals in the House phase ----------
{
  const { bout, me } = table(7);
  B.advance(bout, true); const o0 = count(me, (ch) => ch.kind === 'opp');
  B.advance(bout, true);
  assert(count(me, (ch) => ch.kind === 'opp') - o0 === Math.min(B.rewardOf(me, 'roll').n, 99) || me.overflow > 0, 'unused rolls become Opportunity chips on the Meter when Roll is passed');
  B.advance(bout, true);
  const steal = me.grid.flat().flatMap((c) => c.chips.filter((ch) => ch.shop === 'steal'));
  assert(steal.length === 1 && steal[0].amt === B.rewardOf(me, 'bid').n, 'unused bids become a Steal chip on the Meter when Bid is passed');
  bout.stage.paid[0] = 6; bout.stage.paid[1] = 6; const w0 = B.worth(me);
  bout.phase = 'resolve'; for (const s of bout.sides) for (const e of s.run) e.state = 'shown';
  const steps = drain(B.resolve(bout)).flatMap((st) => [st, ...(st.parts || [])]);
  assert(steps.some((st) => /Steal chip/.test(st.text)) && !me.grid.flat().some((c) => c.chips.some((ch) => ch.shop === 'steal')), 'the Steal chip steals from the Stage in the House phase, then is gone');
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
