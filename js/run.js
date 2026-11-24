// A run: one Roller climbing the Royal Paradise. Everything outside a bout lives here —
// floors, opponents, shops, the lounge, the sports book, wagers and tilts, winnings and the Ascent.
import { RNG, sum, clamp } from './util.js';
import * as D from './data.js';
import { createBout, summary, barCapacity } from './bout.js';
import { rollDie, boutCopy, matOf, dieName, boneDie } from './dice.js';
import { forgePlan, castOut, castFaces, dyePrice } from './forge.js';
import { t as tx } from './text.js';

const META_KEY = 'rollingparadise.meta.v1', RUN_KEY = 'rollingparadise.run.v1';
const store = () => { try { return globalThis.localStorage || null; } catch { return null; } };
export function loadMeta() {
  const base = { jackets: ['standard'], wallets: ['worn_cloth', 'duct_tape'], kept: [], atm: 0, debit: false, ladder: [], runs: 0, best: 0, crowns: 0 };
  try { return { ...base, ...JSON.parse(store()?.getItem(META_KEY) || '{}') }; } catch { return base; }
}
export const saveMeta = (m) => { try { store()?.setItem(META_KEY, JSON.stringify(m)); } catch { /* storage unavailable */ } };
export const saveRun = (run) => { try { store()?.setItem(RUN_KEY, JSON.stringify({ ...run, rng: run.rng.s })); } catch { /* storage unavailable */ } };
export const clearRun = () => { try { store()?.removeItem(RUN_KEY); } catch { /* storage unavailable */ } };
// shop chips renamed after the workbook's chip list: carry owned counts over to the new ids
function migrate(run) {
  if (run.pass == null) { // the Royal Card became the Casino Pass; a run already on a floor holds that floor's pass, unless the card was dropped
    run.pass = run.cards?.includes('royal') ? Math.max(1, run.floor || 0) : 0; if (run.cards) run.cards = run.cards.filter((c) => c !== 'royal'); }
  if (run.cards) run.cards = run.cards.filter((c) => !D.RETIRED_CARDS.includes(c)); // Business Cards became High Roller traits
  if (!Array.isArray(run.passes)) run.passes = run.pass ? [run.pass] : []; // a wallet can hold more than one pass
  for (const t of run.tricks || []) { // Trick Trader upgrades are gone: an upgraded trick becomes the foil it played as
    if (t.wear == null) t.wear = D.WEAR.good;
    if (t.up) { t.foil = Math.max(t.foil || 0, t.up); t.rar = 'foil'; } delete t.up; if (!t.rar) t.rar = t.foil ? 'foil' : 'basic'; }
  for (const box of [run.chips, run.plan?.resist]) { if (!box) continue;
    for (const [old, now] of Object.entries(D.SHOP_RENAMES)) if (old in box) { if (now) box[now] = (box[now] || 0) + box[old]; delete box[old]; } }
}
export function loadRun() {
  try { const raw = store()?.getItem(RUN_KEY); if (!raw) return null; const run = JSON.parse(raw); const s = run.rng; run.rng = new RNG(0); run.rng.s = s; migrate(run); return run; } catch { return null; }
}

// A trick: its quality (q), wear (its condition), and its print: rarity, foil tier, a Misprint's changes, Gem Mint.
const mkTrick = (run, id, q = 1, o = {}) => { q = Math.max(q, D.TRICKS[id]?.q || 1); const t = { uid: run.nextId++, id, q, wear: o.wear ?? D.WEAR.good, rar: o.rar || (o.foil ? 'foil' : 'basic') };
  if (o.foil) t.foil = o.foil; if (o.mis) t.mis = o.mis; if (o.gem) t.gem = true; return t; };
const printOf = (t) => ({ foil: t.foil, rar: t.rar, mis: t.mis }); // a copy keeps the print, not the wear
const mkDie = (run, type, mat = D.DEFAULT_MAT) => ({ id: run.nextId++, type, mat, up: [] });
const ledger = (run, label, amt) => { run.ledger.push({ label, amt, floor: run.floor }); if (run.ledger.length > 200) run.ledger.shift(); };
export const hasCard = (run, id) => run.cards.includes(id);
// wallet: benefit cards take a slot, passes do not
export const walletCards = (run) => run.cards.filter((id) => !D.LANYARD_CARDS.includes(id));
export const walletOf = (run) => D.WALLETS[run.wallet] || D.WALLETS.worn_cloth;
export const walletFull = (run) => walletCards(run).length >= walletOf(run).slots;
// returns false and holds the card as pending when the wallet has no room
export function addCard(run, id) {
  if (hasCard(run, id)) return true;
  if (!D.LANYARD_CARDS.includes(id) && walletFull(run)) { run.pendingCard = id; return false; }
  run.cards.push(id); return true;
}
export function resolvePending(run, dropId) {
  const id = run.pendingCard; run.pendingCard = null; if (!id || !dropId) return;
  run.cards = run.cards.filter((x) => x !== dropId); run.cards.push(id);
}
export function dropCard(run, id) { if (!hasCard(run, id) || D.LANYARD_CARDS.includes(id)) return false; run.cards = run.cards.filter((x) => x !== id); return true; }
// the Membership Card carries the Trader's discount as well; the two do not stack
export const price = (run, shop, base) => Math.max(1, Math.round(base * (hasCard(run, `discount_${shop}`) || (shop === 'trader' && hasCard(run, 'membership')) ? D.TUNING.shops.discount : 1)));
function spend(run, amt, label) { if (run.purse < amt) return false; run.purse -= amt; run.stats.spent += amt; ledger(run, label, -amt); return true; }

// who: a Roller id (ROLLERS), or a class id for the first Roller of that class
export function newRun(who, jacketReq = 'standard', seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0, gear = {}) {
  const roller = D.rollerOf(who), Rl = D.ROLLERS[roller], cls = Rl.cls;
  const jacket = jacketFits(cls, jacketReq) ? jacketReq : 'standard'; // a level 0 jacket only fits the class it was cut for
  const kept = [].concat(gear.passes ?? gear.pass ?? []).filter((f) => f > 0);
  const run = { v: 1, rng: new RNG(seed), seed, cls, roller, worth0: Rl.worth ?? 200, bizCards: [], trait: null, crownCase: [], wearing: null, jacket, wallet: gear.wallet || 'worn_cloth', pass: 0, passes: [], pendingCard: null, floor: 0, purse: 0, nextId: 1, dice: [], tricks: [], chips: {},
    drink: null, cards: [], punches: 0, rest: null, suiteKey: false, phase: 'intro', fs: null, bets: [], news: [], ledger: [], ascent: null,
    plan: { spacing: 'row', stacking: 'maxed', counts: null, resist: {}, layout: Rl.layout?.length ? JSON.parse(JSON.stringify(Rl.layout)) : null }, // your Roller's own position, to change before each bout
    stats: { bouts: 0, wins: 0, losses: 0, spent: 0, won: 0, turns: 0, dd: 0 } };
  for (const f of kept) addPass(run, f);
  for (const [type, n] of Object.entries(Rl.dice || {})) for (let i = 0; i < n; i++) run.dice.push(mkDie(run, type));
  run.tricks = (Rl.tricks || []).filter((id) => D.TRICKS[id]).map((id) => mkTrick(run, id));
  // cards kept from the last run are on the dresser; starters top the wallet up to two
  const slots = walletOf(run).slots; run.cards = (gear.kept || []).filter((id) => D.CARDS[id]).slice(0, slots);
  for (const id of run.rng.shuffle(D.STARTER_CARDS)) { if (run.cards.length >= Math.min(2, slots)) break; if (!run.cards.includes(id)) run.cards.push(id); }
  return run;
}

// Where Balance, Versatility and Depth come from, for the position's hover text: [[source, amount], ...]
export function dimsWhy(run, extra = {}) {
  const K = D.CLASSES[run.cls], out = { balance: [], versatility: [], depth: [] };
  const add = (src, mods) => { for (const k of Object.keys(out)) if (mods?.[k]) out[k].push([src, mods[k]]); };
  add(`${K.name} class`, K.bvd); add(`${D.JACKETS[run.jacket]?.name} jacket`, D.JACKETS[run.jacket]?.mods);
  for (const id of run.cards) add(D.CARDS[id]?.name, D.CARDS[id]?.mods);
  const keys = Object.keys(out); for (let i = 0; i < (extra.position || 0); i++) add('Position tilt', { [keys[i % 3]]: 1 });
  return out;
}
// effective attributes: class + jacket + cards + rest + cheat tilts
export function rollerStats(run, extra = {}) {
  const K = D.CLASSES[run.cls], v = { ...K.tip, charisma: 0, cunning: 0, conviction: 0, ...K.bvd }; // CCC: only what gear adds (the table earns the rest)
  const add = (mods) => { for (const [k, n] of Object.entries(mods || {})) v[k] = (v[k] || 0) + n; };
  add(D.JACKETS[run.jacket]?.mods); for (const id of run.cards) add(D.CARDS[id]?.mods);
  if (run.rest && run.rest.bouts > 0) add({ [K.primary]: run.rest.amt });
  const bvdKeys = ['balance', 'versatility', 'depth'];
  for (let i = 0; i < (extra.position || 0); i++) v[bvdKeys[i % 3]] += 1;
  const dims = { cols: D.BASE_DIMS.cols, stackMax: Math.max(1, D.BASE_DIMS.stackMax + v.balance), meterRows: Math.max(1, D.BASE_DIMS.meterRows + v.versatility), barRows: Math.max(1, D.BASE_DIMS.barRows + v.depth) };
  return { v, dims, tip: { trickery: Math.max(1, v.trickery), ingenuity: Math.max(1, v.ingenuity), proficiency: Math.max(1, v.proficiency) },
    c: { charisma: v.charisma, cunning: v.cunning, conviction: v.conviction } }; // can be below 0: a jacket's cost comes off what the table earns
}
export const maxDenom = (floor) => Math.max(...D.DENOMS.filter((d) => d.floor <= Math.max(1, floor)).map((d) => d.value));
export const denomsFor = (floor) => D.DENOMS.filter((d) => d.floor <= Math.max(1, floor)).map((d) => d.value);
export const noCounts = () => Object.fromEntries(D.DENOM_VALUES.map((v) => [v, 0]));
// the floor a run's chips come from: the Ascent opens every chip
export const chipFloor = (run) => (run.phase === 'ascent' ? D.ASCENT_FLOOR : run.floor || 1);

// ---------- opponents ----------
// The roster (content/roster.js): the opponents who can sit at a floor's tables, or at its head table
export const rosterFor = (floor, table) => Object.entries(D.ROSTER).filter(([, X]) => (table === 'boss' ? X.boss : !X.boss) && (!X.floors || X.floors.includes(floor)) && (table === 'boss' || !X.tables || X.tables.includes(table))).map(([id]) => id);
// the generation options a roster entry sets
// a High Roller dealt by name from BOSSES (no roster entry) takes the trait of the roster entry with that name
const bossTraitByName = (name) => Object.values(D.ROSTER).find((x) => x.boss && x.name === name)?.trait || null;
function rosterOpts(id, o = {}) { const X = D.ROSTER[id]; if (!X) return o; return { ...o, name: X.name, roster: id, ...(X.cls && D.CLASSES[X.cls] ? { cls: X.cls } : {}) }; }
export function genOpponent(run, floor, worthTarget, o = {}) {
  const X = o.roster ? D.ROSTER[o.roster] : null; if (X?.purse > 0) worthTarget = X.purse;
  const rng = run.rng, cls = o.cls || rng.pick(Object.keys(D.CLASSES)), K = D.CLASSES[cls], f = clamp(floor, 1, 4);
  const tip = { ...K.tip }, c = { charisma: 0, cunning: 0, conviction: 0 }, bvd = { ...K.bvd };
  for (const [k, v] of Object.entries(D.JACKETS[X?.jacket]?.mods || {})) { if (k in tip) tip[k] += v; else if (k in c) c[k] += v; else if (k in bvd) bvd[k] += v; } // its jacket
  if (floor >= 2) tip.proficiency++; if (floor >= 3) tip.ingenuity++; if (floor >= 4) tip.trickery++;
  const why = { balance: [[tx('run.class', { name: K.name }), K.bvd.balance]].filter((x) => x[1]), versatility: [[tx('run.class', { name: K.name }), K.bvd.versatility]].filter((x) => x[1]), depth: [[tx('run.class', { name: K.name }), K.bvd.depth]].filter((x) => x[1]) };
  if (o.boss) { if (floor === 2 || floor === 3) tip[K.primary]++; bvd.balance++; why.balance.push([tx('run.high-roller'), 1]); }
  if (o.weak) { tip.trickery = 1; tip.proficiency = 1; tip.ingenuity = 1; }
  const B0 = D.BASE_DIMS, dims = { cols: o.cols || B0.cols, stackMax: Math.max(1, B0.stackMax + bvd.balance), meterRows: Math.max(1, B0.meterRows + bvd.versatility), barRows: Math.max(1, B0.barRows + bvd.depth) };
  const pools = [null, ['d4', 'd6'], ['d6', 'd8'], ['d6', 'd8', 'd10'], ['d8', 'd8', 'd10', 'd10', 'd20']];
  // its own starting Pouch and Book when the roster gives them; otherwise dice and tricks for the floor
  const ownDice = !o.weak && X?.dice && Object.values(X.dice).some((n) => n > 0) ? Object.entries(X.dice).flatMap(([type, n]) => Array.from({ length: n }, () => type)).filter((k) => D.DICE[k]) : null;
  const dice = ownDice ? ownDice.map((type) => mkDie(run, type)) : Array.from({ length: o.weak ? 3 : 5 + f * 2 + (o.boss ? 2 : 0) }, () => mkDie(run, o.weak ? 'd4' : rng.pick(pools[f])));
  const kit = D.ROLLERS[D.rollerOf(cls)]?.tricks || ['charge'], ownTricks = !o.weak && X?.tricks?.length ? X.tricks.filter((id) => D.TRICKS[id]) : null;
  const q = o.q || Math.min(3, f); let ids = o.weak ? ['charge'] : ownTricks ? [...ownTricks] : [...kit];
  if (!o.weak && !ownTricks) { const extra = rng.shuffle(D.TRICK_IDS.filter((id) => !ids.includes(id) && (!D.TRICKS[id].cls || D.TRICKS[id].cls === cls))); ids = ids.concat(extra.slice(0, f + (o.boss ? 1 : 0))); }
  const tricks = ids.map((id) => mkTrick(run, id, q, { foil: (o.boss ? rng.int(2) : 0) + (o.foil || 0) }));
  // chips: a little petty cash in 1¢ for bidding, the rest in the biggest chips the floor allows
  const md = o.maxDenom || maxDenom(floor), cap = barCapacity(dims);
  let W = worthTarget;
  let petty = Math.min(W, Math.max(6, Math.round(cap * 0.12)));
  // the big chip: up to 10¢ as before, or the smallest bigger one that fits the worth into the position
  const allowed = D.DENOM_VALUES.filter((v) => v <= md), fits = (v) => petty + Math.ceil(Math.max(0, W - petty) / v) <= cap;
  let big = Math.max(...allowed.filter((v) => v <= 10)); if (!fits(big)) big = allowed.find((v) => v > big && fits(v)) || Math.max(...allowed);
  let nBig = big > 1 ? Math.floor((W - petty) / big) : 0;
  if (nBig + petty > cap) { nBig = cap - petty; }
  if (big === 1) { petty = Math.min(W, cap); nBig = 0; }
  const groups = [{ value: big, count: nBig }, { value: 1, count: petty }].filter((g) => g.count > 0);
  if (K.deploy === 'end') groups.reverse();
  if (o.cols) why.note = tx('run.a-bar-table-only');
  for (const [id, n] of Object.entries(X?.chips || {})) if (n > 0 && D.SHOP_CHIPS[id]) groups.push({ value: 1, count: n, resist: id }); // its own chips
  const drink = X?.drink ? D.DRINKS.find((d) => d.id === X.drink) : null;
  return { name: o.name || rng.pick(D.OPPONENTS), title: o.title || '', cls, floor, ai: true, tip, c, dims, why, deploy: K.deploy, dice, tricks,
    plan: { chips: groups, spacing: X?.deploy?.spacing || 'row', stacking: X?.deploy?.stacking || 'maxed', ...(X?.layout?.length ? { layout: fitLayout(X.layout, dims) } : {}) },
    worth: X?.layout?.length ? layoutWorth(fitLayout(X.layout, dims)) : nBig * big + petty,
    roster: o.roster || null, sign: X?.sign || null, trait: X?.boss || o.boss ? X?.trait || bossTraitByName(o.name) : null, boss: !!(o.boss || X?.boss), wallet: X?.wallet || null, drink: drink ? { ...drink } : null,
    behave: { ...D.DEFAULT_BEHAVE, ...(X?.behave || {}) }, phases: X?.phases ? JSON.parse(JSON.stringify(X.phases)) : null };
}

// ---------- floors ----------
export function enterFloor(run, floor) {
  const rng = run.rng, F = D.FLOORS[floor], names = rng.shuffle(D.OPPONENTS);
  // roster entries take their seats in the shuffled name order, so an unchanged roster deals the floor as before
  const byName = new Map(names.map((n, i) => [n, i])), pool = rosterFor(floor, null).sort((x, y) => (byName.get(D.ROSTER[x].name) ?? 1e9) - (byName.get(D.ROSTER[y].name) ?? 1e9)), seat = (i) => { const k = pool.findIndex((id) => !D.ROSTER[id].tables || D.ROSTER[id].tables.includes(i)); return k < 0 ? null : pool.splice(k, 1)[0]; };
  const bosses = rosterFor(floor, 'boss');
  run.floor = floor; run.phase = 'floor'; run.suiteKey = false;
  run.fs = {
    tables: F.worth.map((w, i) => ({ opp: genOpponent(run, floor, Math.round(w * (0.9 + rng.next() * 0.2)), rosterOpts(seat(i), { name: names[i] })), beaten: false, seen: i === 0, felt: rng.pick(D.FELT_POOL) })),
    boss: { opp: genOpponent(run, floor, F.boss, bosses.length ? rosterOpts(rng.pick(bosses), { boss: true, title: tx('run.high-roller') }) : { boss: true, name: rng.pick(D.BOSSES[floor]), title: tx('run.high-roller') }), beaten: false, felt: 'royal' },
    bossOpen: false, lastWin: null, ddStreak: 0, tiers: { challenge: 0, cheat: 0 },
    shop: null, restocks: 0, bought: 0, secret: null, pack: null,
    lounge: genLounge(run, floor), book: genBook(run, floor), searched: false, dice: null,
  };
  run.fs.shop = genShelf(run);
  run.news = [tx('run.floor', { floor, name: F.name, line: F.line })];
  addPass(run, floor); // each floor's pass goes in the wallet (taking the lowest one's slot when the wallet is full)
  return run.fs;
}
// The floor is a short path: table 1 first, then a choice between tables 2 and 3 (beating one closes the
// other), then the High Roller.
export const choiceMade = (run) => run.fs.tables.slice(1).some((t) => t.beaten);
export function tableState(run, i) {
  const t = run.fs.tables[i];
  if (t.beaten) return 'beaten';
  if (i === 0) return 'open';
  if (!run.fs.tables[0].beaten) return 'later';
  return choiceMade(run) ? 'passed' : 'open';
}
export const tableOpen = (run, i) => tableState(run, i) === 'open';
// how many more tables stand between you and the High Roller
export const tablesLeft = (run) => (run.fs.tables[0].beaten ? 0 : 1) + (choiceMade(run) ? 0 : 1);

function genShelf(run) {
  const rng = run.rng, f = run.floor, out = [];
  const own = new Set(run.tricks.map((t) => t.id));
  for (const cls of ['hustler', 'rascal', 'technician', null]) {
    const pool = D.TRICK_IDS.filter((id) => D.TRICKS[id].cls === cls); const fresh = pool.filter((id) => !own.has(id));
    const id = rng.pick(fresh.length ? fresh : pool); const S = D.TUNING.shops, q = clamp(f + (rng.chance(S.shelfUp) ? 1 : 0) - (rng.chance(S.shelfDown) ? 1 : 0), 1, 4);
    out.push({ key: run.nextId++, trick: mkTrick(run, id, q, { wear: D.WEAR.excellent }), cost: S.trickPrice * f * q }); // off the shelf: Excellent
  }
  return out;
}
export const restockCost = (run) => price(run, 'trader', D.TUNING.shops.restock * (run.floor + run.fs.restocks));
export function restock(run) { if (!spend(run, restockCost(run), tx('run.trick-trader-restock'))) return false; run.fs.restocks++; run.fs.shop = genShelf(run); return true; }
export function buyTrick(run, key) {
  const it = run.fs.shop.find((x) => x.key === key); if (!it || !spend(run, price(run, 'trader', it.cost), tx('run.bought', { name: D.TRICKS[it.trick.id].name }))) return false;
  run.fs.shop = run.fs.shop.filter((x) => x !== it); run.tricks.push(it.trick); run.fs.bought++;
  if (run.fs.bought >= 5 && !hasCard(run, 'membership')) { run.cards.push('membership'); run.news.push(tx('run.the-trick-trader-slides')); }
  return true;
}
// Foil packs: no more upgrades at the Trader; better tricks come in better sets. Five tricks of the set's quality,
// all Mint (each may be Gem Mint); four plain prints (some Foil) and one rarer: a Misprint, a Reprint or a high foil.
export const packOpen = (run, q) => run.floor >= D.PACKS[q].floor;
export const packCost = (run, q) => price(run, 'trader', D.TUNING.shops.packPrice * q * Math.max(1, run.floor));
const STEP_DIE = ['d4', 'd6', 'd8'];
function misprint(rng, id) {
  const die = D.TRICKS[id].die, k = STEP_DIE.indexOf(die), good = rng.chance(0.75); // most misprints come out better
  if (rng.chance(0.5) && k >= 0 && STEP_DIE[k + (good ? 1 : -1)]) return { die: STEP_DIE[k + (good ? 1 : -1)] };
  return { trait: good ? 1 + rng.int(3) : -1 };
}
export function rollPack(run, q) {
  const rng = run.rng, pool = D.TRICK_IDS.filter((id) => !D.TRICKS[id].cls || D.TRICKS[id].cls === run.cls || rng.chance(0.3));
  const S = D.TUNING.shops;
  return Array.from({ length: S.packSize }, (_, k) => {
    const id = rng.pick(pool), o = { wear: D.WEAR.mint, gem: rng.chance(S.gemChance) };
    if (k < S.packSize - 1) { if (rng.chance(S.packFoil)) o.foil = 1; }
    else { const r = rng.next(); if (r < 0.35) { o.rar = 'misprint'; o.mis = misprint(rng, id); } else if (r < 0.65) o.rar = 'reprint'; else o.foil = rng.chance(0.25 + 0.1 * q) ? 3 : 2; }
    return mkTrick(run, id, q, o);
  });
}
export function buyPack(run, q) {
  if (!D.PACKS[q] || !packOpen(run, q) || !spend(run, packCost(run, q), tx('run.opened-a-foil-pack', { name: D.PACKS[q].name }))) return null;
  const got = rollPack(run, q); run.tricks.push(...got); run.fs.pack = { q, uids: got.map((t) => t.uid) }; return got;
}
// what a trick sells for: its quality and the floor, times its condition (Poor does not sell)
export const trickValue = (run, t) => Math.round(25 * Math.max(1, run.floor) * t.q * D.CONDITIONS[D.condOf(t)].sell);
export const canSell = (t) => D.condOf(t) !== 'poor';
export function sellTrick(run, uid) {
  const i = run.tricks.findIndex((x) => x.uid === uid); if (i < 0 || run.tricks.length <= 1 || !canSell(run.tricks[i])) return false;
  const v = trickValue(run, run.tricks[i]); ledger(run, tx('run.sold', { name: D.TRICKS[run.tricks[i].id].name }), v); run.tricks.splice(i, 1); run.purse += v; return true;
}
// a Poor trick cannot be sold: the Trader trashes it for you
export function trashTrick(run, uid) {
  const i = run.tricks.findIndex((x) => x.uid === uid); if (i < 0 || run.tricks.length <= 1 || canSell(run.tricks[i])) return false;
  run.tricks.splice(i, 1); return true;
}
export function secretShelf(run) {
  if (!run.fs.secret) { const rng = run.rng; const id = rng.pick(D.TRICK_IDS);
    run.fs.secret = [{ key: run.nextId++, die: 'd10', cost: 5000 }, { key: run.nextId++, die: 'd10', cost: 5000 }, { key: run.nextId++, die: 'd20', cost: 100000 },
      { key: run.nextId++, trick: mkTrick(run, id, 4, { foil: 1, wear: D.WEAR.mint }), cost: 10000 }]; }
  return run.fs.secret;
}
export function buySecret(run, key) {
  const it = run.fs.secret?.find((x) => x.key === key); if (!it || !spend(run, it.cost, tx('run.secret-shelf'))) return false;
  if (it.die) run.dice.push(mkDie(run, it.die)); else run.tricks.push(it.trick);
  run.fs.secret = run.fs.secret.filter((x) => x !== it); return true;
}

// Diesmith: melt dice and cast a new one (forge.js). The old upgrades are retired; they live on as Bone dice.
export const forgeCost = (run, type, dyes = []) => price(run, 'diesmith', D.DICE[type].forge.chips + dyePrice(dyes));
export const forgeFloor = (type) => D.DICE[type].forge.floor;
// the whole plan for a forge on this floor with this pouch (see forge.js forgePlan). melt: die ids
export function forgePlanFor(run, type, melt, dyes = []) {
  const dice = melt.map((id) => run.dice.find((d) => d.id === id)).filter(Boolean);
  return forgePlan({ type, melt: dice, dyes, floor: run.floor, pouch: D.MELT.castFromPouch ? run.dice : null });
}
// the pouch dice this forge would roll into the cast (and lose)
export const castRollers = (run, type, melt, dyes = []) => forgePlanFor(run, type, melt, dyes).rolled.filter(Boolean);
// why this forge cannot happen right now, or null. melt: die ids
export function forgeWhy(run, type, melt, dyes = []) {
  if (run.floor < forgeFloor(type)) return tx('run.the-diesmith-casts-s', { type, forgeFloor: forgeFloor(type) });
  if (melt.some((id) => !run.dice.some((d) => d.id === id))) return tx('run.pick-dice-from-your');
  const why = forgePlanFor(run, type, melt, dyes).why; if (why) return why;
  if (run.purse < forgeCost(run, type, dyes)) return tx('shop.cantAfford');
  return null;
}
// Melt the dice, pay, cast. Returns { die, log, rolled } or null.
export function forge(run, type, melt, dyes = []) {
  if (forgeWhy(run, type, melt, dyes)) return null;
  const P = forgePlanFor(run, type, melt, dyes), dice = melt.map((id) => run.dice.find((d) => d.id === id)), mat = castOut(P.castKey);
  spend(run, forgeCost(run, type, dyes), tx('run.cast-a', { name: D.MATERIALS[mat].name, type }));
  const rolled = P.rolled.filter(Boolean);
  const { faces, log } = castFaces(run.rng, type, P.castKey, P.played, D.MELT.castFromPouch ? P.rolled : null);
  run.dice = run.dice.filter((d) => !dice.includes(d) && !rolled.includes(d));
  const die = { ...mkDie(run, type, mat), faces: faces.map((v) => ({ v })), cast: P.castKey, dyes: [...P.played] };
  run.dice.push(die); return { die, log, rolled };
}
export function sellDie(run, id) {
  const i = run.dice.findIndex((d) => d.id === id); if (i < 0 || run.dice.length <= 1) return false;
  const v = dieSellValue(run.dice[i]); ledger(run, tx('run.sold-a', { dieName: dieName(run.dice[i]) }), v); run.dice.splice(i, 1); run.purse += v; return true;
}
export const RETIRED = tx('run.the-diesmith-no-longer');
export const dieUpgradeBlock = () => RETIRED;
export const upgradeDie = () => false;
// Dice Shop: plain Glass, Plastic and Metal dice, and Bone dice that carry a trait (content/dice.js)
export const dieSellValue = (d) => Math.round(D.DICE[d.type].sell * (d.mat === 'bone' ? D.DICE_SHOP.boneMult / 2 : D.DICE_SHOP.mat[d.mat || D.DEFAULT_MAT] || 1));
const diePrice = (floor, type, mat) => Math.round(D.DICE_SHOP.base[type] * (mat === 'bone' ? D.DICE_SHOP.boneMult : D.DICE_SHOP.mat[mat] || 1) * (D.DICE_SHOP.floorMult[floor] ?? 1));
export function genDiceShop(run, floor = run.floor) {
  const rng = run.rng, S = D.DICE_SHOP, types = D.COMPLEXITY.filter((t) => (S.from[t] || 1) <= floor);
  const basic = Array.from({ length: S.basic }, (_, i) => { const mat = D.BASIC_MATS[i % D.BASIC_MATS.length], type = rng.pick(types);
    return { key: run.nextId++, die: { type, mat, up: [] }, cost: diePrice(floor, type, mat) }; });
  const bone = Array.from({ length: S.bone }, () => { const type = rng.pick(types), id = rng.pick(Object.keys(D.BONE));
    return { key: run.nextId++, die: boneDie({}, type, id, rng), cost: diePrice(floor, type, 'bone') }; });
  return basic.concat(bone).sort((a, b) => D.DICE[a.die.type].faces - D.DICE[b.die.type].faces || (a.die.mat === 'bone') - (b.die.mat === 'bone'));
}
export const diceShop = (run) => { if (!run.fs.dice) run.fs.dice = genDiceShop(run); return run.fs.dice; }; // stocked on the first visit to each floor's Dice Shop
export const dieCost = (run, it) => price(run, 'dice', it.cost);
export function buyShopDie(run, key) {
  const it = diceShop(run).find((x) => x.key === key); if (!it || !spend(run, dieCost(run, it), tx('run.bought-a', { dieName: dieName(it.die) }))) return false;
  run.dice.push({ ...it.die, id: run.nextId++, up: [...it.die.up], tgt: it.die.tgt && [...it.die.tgt], faces: it.die.faces?.map((f) => ({ ...f })) });
  run.fs.dice = run.fs.dice.filter((x) => x !== it); return true;
}

// Chip Exchange: shop chips are priced by their tier (D.CHIP_TIERS) and unlocked by the tier's floor
export const owned = (run, id) => run.chips[id] || 0;
export const shopChipOpen = (run, id) => run.floor >= D.shopFloor(id);
export function buyShopChip(run, id) {
  if (!D.soldInShop(id) || !shopChipOpen(run, id) || !spend(run, D.shopPrice(id), tx('run.bought-a-2', { name: D.SHOP_CHIPS[id].name }))) return false; // chips a trick or the table makes are not sold
  run.chips[id] = owned(run, id) + 1; return true;
}
export const buyResist = buyShopChip;

// ---------- lounge ----------
function drinkMods(run, d) {
  const all = ['trickery', 'ingenuity', 'proficiency', 'charisma', 'cunning', 'conviction'], rng = run.rng;
  if (d.stat === 'random') return { [rng.pick(all)]: d.amt };
  if (d.stat === 'tip') return Object.fromEntries(rng.shuffle(all).slice(0, 3).map((k) => [k, d.amt]));
  if (d.stat === 'all') return Object.fromEntries(all.map((k) => [k, d.amt]));
  return { [d.stat]: d.amt };
}
const DRINK_FLOOR = [1, 0.2, 0.4, 0.7, 1]; // drinks get pricier floor by floor instead of jumping 5× at floor 2
function genLounge(run, floor) {
  const rng = run.rng; const basic = rng.shuffle(D.DRINKS.slice(0, 6)); const list = [basic[0], basic[1]];
  list.push(floor >= 4 && rng.chance(0.5) ? D.DRINKS[8] : floor >= 2 ? rng.pick([D.DRINKS[6], D.DRINKS[7]]) : basic[2]);
  const happy = rng.chance(0.2);
  return { happy, challenged: false, drinks: list.map((d) => ({ ...d, mods: drinkMods(run, d), cost: Math.round(d.cost * (happy ? 0.5 : 1) * (DRINK_FLOOR[floor] ?? 1)) })),
    challenger: genOpponent(run, floor, D.TUNING.tables.barChallengerWorth * maxDenom(floor), { cols: D.TUNING.tables.barCols, name: rng.pick(D.OPPONENTS), title: 'Barfly', q: Math.max(1, Math.min(3, floor) - 1) }) };
}
export const drinkCost = (run, d) => (run.punches >= D.TUNING.shops.freeDrinkPunches ? 0 : price(run, 'lounge', d.cost));
function pourDrink(run, d) { run.drink = { id: d.id, name: d.name, verb: d.verb, sips: d.sips, max: d.sips, mods: d.mods }; }
export function buyDrink(run, id) {
  const d = run.fs.lounge.drinks.find((x) => x.id === id); if (!d) return false; const cost = drinkCost(run, d);
  if (!spend(run, cost, tx('run.bought-a-2', { name: d.name }))) return false;
  if (cost === 0) run.punches = 0; else if (hasCard(run, 'punch')) run.punches++;
  pourDrink(run, d); return true;
}

// ---------- sports book ----------
function oddsFor(p) { const fair = (1 / p - 1) * D.TUNING.book.houseEdge; let best = D.ODDS[D.ODDS.length - 1]; for (const o of D.ODDS) if (o[1] <= fair) { best = o; break; } return { pay: best[1], label: best[2] }; }
function genBook(run, floor) {
  const rng = run.rng; const events = rng.shuffle(D.SPORTS).slice(0, 5).map((sp) => {
    let field;
    if (sp.field === 2) { const p = 0.25 + rng.next() * 0.5; const names = sp.unit === 'team' ? rng.shuffle(D.TEAM_WORDS[0]).slice(0, 2).map((a) => `${a} ${rng.pick(D.TEAM_WORDS[1])}`) : rng.shuffle(D.RACER_WORDS).slice(0, 2); field = [{ name: names[0], p }, { name: names[1], p: 1 - p }]; }
    else { const ws = Array.from({ length: sp.field }, (_, i) => Math.pow(0.72, i) * (0.6 + rng.next() * 0.8)); const tot = sum(ws); const names = rng.shuffle(D.RACER_WORDS); field = ws.map((w, i) => ({ name: names[i], p: w / tot })); }
    return { key: run.nextId++, sport: sp.id, field: field.map((x) => ({ ...x, ...oddsFor(x.p) })), bet: null };
  });
  return { events, min: 10 * floor * floor };
}
export function placeBet(run, key, pick, stake) {
  const ev = run.fs.book.events.find((e) => e.key === key); if (!ev || ev.bet || stake < run.fs.book.min) return false;
  if (!spend(run, stake, tx('run.bet-on', { name: ev.field[pick].name }))) return false; ev.bet = { pick, stake }; return true;
}
// games are played while you are at the table
export function resolveBets(run) {
  const out = [];
  for (const ev of run.fs?.book.events || []) {
    if (!ev.bet || ev.done) continue;
    const winner = run.rng.weighted(ev.field.map((_, i) => i), (i) => ev.field[i].p); ev.done = true; ev.winner = winner;
    const sp = D.SPORTS.find((s) => s.id === ev.sport), mine = ev.field[ev.bet.pick];
    if (winner === ev.bet.pick) { const pay = Math.round(ev.bet.stake * (1 + mine.pay)); run.purse += pay; ledger(run, tx('run.bet-won', { name: sp.name }), pay); out.push(tx('run.wins-your-ticket-pays', { name: sp.name, name2: mine.name, label: mine.label, pay: pay.toLocaleString() })); }
    else out.push(tx('run.wins-your-ticket-on', { name: sp.name, name2: ev.field[winner].name, name3: mine.name }));
  }
  return out;
}
export function searchFloor(run) {
  if (run.fs.searched) return null; run.fs.searched = true;
  const pool = D.FIND_CARDS.filter((id) => !hasCard(run, id)); const id = run.rng.pick(pool.length ? pool : ['trading']);
  addCard(run, id); return id;
}

// ---------- wagers, tilts, position ----------
// tilts are on (1) or off (0)
// The test table (Build mode): a throwaway run and bout, never saved. o: { cls, floor, tricks: [ids], q, dice: { d6: 7 },
// purse, roster (an opponent id, or null for a generated one), rules: true for match rules, false for a sandbox }
export function testTable(o) {
  const floor = clamp(o.floor || 1, 1, 4), run = newRun(o.cls || 'hustler', 'standard', o.seed || 7);
  run.phase = 'floor'; enterFloor(run, floor); run.purse = Math.max(10, o.purse || 500);
  if (o.tricks?.length) run.tricks = o.tricks.filter((id) => D.TRICKS[id]).map((id) => mkTrick(run, id, clamp(o.q || 1, 1, 4)));
  if (o.dice && Object.keys(o.dice).length) run.dice = Object.entries(o.dice).flatMap(([type, n]) => (D.DICE[type] ? Array.from({ length: n }, () => mkDie(run, type)) : []));
  const worth = D.FLOORS[floor].worth[0];
  run.fs.tables[0].opp = genOpponent(run, floor, worth, o.roster && D.ROSTER[o.roster] ? { name: D.ROSTER[o.roster].name, roster: o.roster, ...(D.ROSTER[o.roster].cls ? { cls: D.ROSTER[o.roster].cls } : {}), ...(D.ROSTER[o.roster].boss ? { boss: true } : {}) } : {});
  const { bout, ctx } = startTable(run, newPrep(run, 'table', 0));
  if (!o.rules) { bout.rules.sandbox = true; bout.rules.maxTurns = 999; }
  return { bout, ctx: { ...ctx, kind: 'test', test: true, sandbox: !o.rules }, run };
}
export const newPrep = (run, kind, idx) => ({ kind, idx, tilts: Object.fromEntries(Object.keys(D.TILTS).map((k) => [k, 0])), dd: false });
export const tiltOpen = (run, key) => (run.floor || 1) >= D.TILTS[key].floor;
export function setTilt(run, prep, key, on) { if (on && !tiltOpen(run, key)) return false; prep.tilts[key] = on ? 1 : 0; return true; }
// the tilts' net share: + for Challenges, − for Cheats
export const tiltNet = (prep) => sum(Object.entries(prep.tilts), ([k, n]) => (n ? (D.TILTS[k].kind === 'challenge' ? 1 : -1) * D.TILTS[k].mult : 0));
// what a won table pays for its tilts (a House bounty for Challenges, a House cut for Cheats) and for staked shop chips
export const tiltPay = (ctx) => Math.round(D.TUNING.wager.tiltWorthShare * (ctx.tiltNet || 0) * (ctx.opp?.worth || 0));
export const chipStake = (resist) => sum(Object.entries(resist || {}), ([id, n]) => (D.SHOP_CHIPS[id] && D.soldInShop(id) ? n * D.shopPrice(id) : 0));
export const chipStakePay = (ctx) => (D.SHOP_CHIP_STAKE ? Math.round(chipStake(ctx.resist) * (ctx.mult - 1)) : 0);
export function multiplier(run, prep) {
  const W = D.TUNING.wager, base = prep.kind === 'boss' ? W.boss : W.base; let m = base;
  for (const [k, n] of Object.entries(prep.tilts)) if (n) m += (D.TILTS[k].kind === 'challenge' ? 1 : -1) * D.TILTS[k].mult;
  m = clamp(m, 1, Math.max(3, base));
  if (prep.dd) m = Math.min(W.doubleDownMax, m * 2);
  return Math.round(m * 100) / 100;
}
// default chip mix: fill the Stake with the best chips the purse affords, keeping some 1¢ chips to bid with
// `reserve`: spaces kept for shop chips
export function autoCounts(run, dims, purse = run.purse, reserve = 0) {
  const cap = Math.max(0, barCapacity(dims) - reserve), all = denomsFor(chipFloor(run));
  const counts = noCounts(); let slots = cap, money = purse;
  const ones = Math.min(slots, money, Math.max(6, Math.round(cap * 0.15)));
  // chips up to 10¢ as before; bigger ones only as far as the purse needs them to fit in the Stake (more, smaller stacks)
  const fits = (d) => ones + Math.ceil(Math.max(0, money - ones) / d) <= cap, small = Math.max(...all.filter((v) => v <= 10));
  const top = fits(small) ? small : all.find((v) => v > small && fits(v)) || Math.max(...all), denoms = all.filter((v) => v <= top).sort((a, b) => b - a); counts[1] = ones; slots -= ones; money -= ones;
  for (const v of denoms) { if (v === 1) continue; const n = Math.min(slots, Math.floor(money / v)); counts[v] += n; slots -= n; money -= n * v; }
  const more = Math.min(slots, money); counts[1] += more;
  return counts;
}
// the saved chip mix, or a fresh one if it no longer fits the purse or the position
export function validCounts(run, dims) {
  if (validLayout(run, dims)) return layoutCounts(run.plan.layout);
  const c = run.plan.counts, shop = sum(Object.entries(run.plan.resist || {}), ([k, n]) => Math.min(n, owned(run, k)) * (D.SHOP_CHIPS[k]?.place === 'space' ? dims.stackMax : D.SHOP_CHIPS[k]?.place === 'big' ? 3 * dims.stackMax + 1 : D.SHOP_CHIPS[k]?.place === 'sky' ? 0 : 1)) // a Tree needs a whole space, a Big chip four
    + run.cards.filter((id) => D.CARDS[id]?.resist).length; // and room for Resist chips
  if (c && planWorth(c) <= run.purse && sum(Object.values(c)) + shop <= barCapacity(dims) && planWorth(c) > 0) return c;
  return autoCounts(run, dims, run.purse, shop);
}
// The shape of a Roller's or an opponent's position before the table changes it: its class, its jacket, and (for a
// High Roller) the extra chip a stack takes. The Build-mode Stake editors draw from this, so they always show the
// right number of rows and stack height for whatever the class and gear add up to.
export function posDims({ cls, jacket, boss } = {}) {
  const K = D.CLASSES[cls] || D.CLASSES.hustler, bvd = { ...K.bvd };
  for (const [k, v] of Object.entries(D.JACKETS[jacket]?.mods || {})) if (k in bvd) bvd[k] += v;
  if (boss) bvd.balance++;
  const B0 = D.BASE_DIMS; return { cols: B0.cols, stackMax: Math.max(1, B0.stackMax + bvd.balance), meterRows: Math.max(1, B0.meterRows + bvd.versatility), barRows: Math.max(1, B0.barRows + bvd.depth) };
}
const itemWorth = (it) => (typeof it === 'number' ? it : 1);
export const layoutWorth = (layout) => sum(layout || [], (sp) => sum(sp.chips || [], itemWorth));
// A laid-out position fitted to a position and a purse: spaces outside it and chips over a stack's height are left
// out; and if the purse cannot cover all of it, it is built again from the bottom up (every stack's first chip, front
// to back, then every second chip...) for as long as the next chip can be afforded.
export function fitLayout(layout, dims, purse = Infinity) {
  const inside = (layout || []).filter((sp) => sp.r >= 0 && sp.r < dims.barRows && sp.c >= 0 && sp.c < dims.cols).map((sp) => ({ r: sp.r, c: sp.c, chips: (sp.chips || []).slice(0, dims.stackMax) }));
  if (layoutWorth(inside) <= purse) return inside.filter((sp) => sp.chips.length);
  const order = inside.slice().sort((a, b) => a.r - b.r || a.c - b.c), out = order.map((sp) => ({ r: sp.r, c: sp.c, chips: [] }));
  let spent = 0;
  fill: for (let lvl = 0; lvl < dims.stackMax; lvl++) for (let i = 0; i < order.length; i++) { const it = order[i].chips[lvl]; if (it === undefined) continue;
    if (spent + itemWorth(it) > purse) break fill; spent += itemWorth(it); out[i].chips.push(it); }
  return out.filter((sp) => sp.chips.length);
}
// A painted position (click and hold in the planner): [{ r, c, chips: [values] }], r counted from the Stake's front.
// Its counts are what is painted; it holds only if the purse covers it and every stack fits.
export const layoutCounts = (layout) => { const c = noCounts(); for (const sp of layout || []) for (const v of sp.chips) if (typeof v === 'number') c[v] = (c[v] || 0) + 1; return c; };
// The position laid out for this bout: the one you set (your Roller's to begin with), fitted to the position and
// the purse you have now (filled from the bottom up when the purse falls short). null when nothing of it is left.
export function validLayout(run, dims) {
  const L = run.plan.layout; if (!L?.length) return null;
  const F = fitLayout(L.map((sp) => ({ ...sp, chips: sp.chips.filter((v) => typeof v === 'number') })), dims, run.purse);
  return planWorth(layoutCounts(F)) > 0 ? F : null;
}
export const planWorth = (counts) => sum(Object.entries(counts), ([v, n]) => v * n);
export const planCount = (counts, resist) => sum(Object.values(counts)) + sum(Object.values(resist || {}));
function planGroups(run, counts, resist) {
  const order = D.CLASSES[run.cls].deploy === 'end' ? D.DENOM_VALUES : D.DENOM_VALUES.slice().reverse();
  const groups = Object.entries(resist || {}).filter(([, n]) => n > 0).map(([el, n]) => ({ value: 1, count: n, resist: el }));
  for (const v of order) if (counts[v] > 0) groups.push({ value: v, count: counts[v] });
  return groups;
}

// ---------- bouts ----------
function playerSpec(run, counts, extra = {}, dimsOverride) {
  const st = rollerStats(run, extra), K = D.CLASSES[run.cls];
  return { name: 'You', title: K.name, cls: run.cls, roller: run.roller || D.rollerOf(run.cls), trait: run.trait || null, crown: crownWorn(run), sign: D.ROLLERS[run.roller]?.sign || null, tip: st.tip, c: st.c, dims: dimsOverride || st.dims, why: dimsOverride ? { note: tx('run.a-bar-table-one') } : dimsWhy(run, extra), deploy: K.deploy, tricks: run.tricks, dice: run.dice,
    plan: { chips: planGroups(run, counts, extra.resist), spacing: run.plan.spacing, stacking: run.plan.stacking, ...(validLayout(run, dimsOverride || st.dims) ? { layout: validLayout(run, dimsOverride || st.dims) } : {}), resistChips: run.cards.map((id) => D.CARDS[id]?.resist).filter(Boolean) }, drink: run.drink && run.drink.sips > 0 ? run.drink : null, ...extra.side };
}
const committed = (bout) => sum(bout.sides[0].grid.flat().flatMap((c) => c.chips).filter((ch) => ch.kind === 'std' && !ch.resist), (ch) => ch.value);

// ---------- passes ----------
// the floor a pass in the wallet takes you to; coming back to a saved run without one, the Bouncer stops you
export const passFloor = (run) => run.pass || 0;
// A wallet holds up to its `passes` (WALLETS, tuned in Build mode's tables), each in a pass slot that cards never use.
// Reaching a floor adds its pass; a full wallet gives up its lowest pass for it. run.pass is the highest one held.
export const passCap = (id) => Math.max(1, Math.round(D.WALLETS[id]?.passes ?? 1));
export const passesOf = (run) => { const top = run.pass || 0, list = (run.passes || []).filter((f) => f > 0 && f <= top);
  if (top && !list.includes(top)) list.push(top); return list.sort((a, b) => b - a); };
export function addPass(run, f) {
  if (!(f > 0)) return; const list = passesOf(run); if (!list.includes(f)) list.push(f);
  list.sort((a, b) => b - a); run.passes = list.slice(0, passCap(run.wallet)); run.pass = run.passes[0] || 0;
}
export const needsBouncer = (run) => run.phase === 'floor' && run.floor >= 1 && passFloor(run) < run.floor;
// after the Doorman, a pass kept from the last run skips the floor checks up to its floor
export const startFloor = (run) => Math.max(1, Math.min(4, passFloor(run)));
export function startBouncer(run) {
  const opp = genOpponent(run, 1, 30, { name: tx('run.the-bouncer'), title: 'Bouncer', cls: 'hustler', q: 1 });
  const st = rollerStats(run); const n = Math.min(30, barCapacity(st.dims));
  const bout = createBout({ seed: run.rng.int(2 ** 31), a: playerSpec(run, { ...noCounts(), 1: n }), b: opp, rules: { maxDenom: 1 } });
  return { bout, ctx: { kind: 'bouncer', opp, felt: 'house', wager: 0, mult: 1, committed: n } };
}
export function startIntro(run) {
  const opp = genOpponent(run, 1, 18, { weak: true, name: tx('run.low-ball'), title: 'Doorman', cls: 'technician' });
  const st = rollerStats(run); const n = Math.min(30, barCapacity(st.dims));
  const bout = createBout({ seed: run.rng.int(2 ** 31), a: playerSpec(run, { ...noCounts(), 1: n }), b: opp, rules: { maxDenom: 1 } });
  return { bout, ctx: { kind: 'intro', opp, felt: 'house', wager: 0, mult: 1, committed: n } };
}
export function startTable(run, prep) {
  const entry = prep.kind === 'boss' ? run.fs.boss : run.fs.tables[prep.idx], t = prep.tilts;
  const on = (k) => (t[k] ? 1 : 0); // a tilt that is on opens the bout once, then the House may play it again as the bout goes
  const extra = { position: on('position'), resist: { ...run.plan.resist }, side: { tilts: Object.fromEntries(Object.keys(D.TILTS).filter((k) => t[k]).map((k) => [k, true])), positionTilt: on('position'), holes: on('hazard'), creatures: on('creature'), spawners: on('spawner'),
    shields: on('shield'), familiars: on('familiar'), interventions: on('intervention'), calamities: on('calamity') ? [run.rng.pick(Object.keys(D.CALAMITIES))] : [] } };
  const st = rollerStats(run, extra); const counts = validCounts(run, st.dims);
  for (const el of Object.keys(extra.resist)) extra.resist[el] = Math.min(extra.resist[el], owned(run, el));
  const bout = createBout({ seed: run.rng.int(2 ** 31), a: playerSpec(run, counts, extra), b: entry.opp, rules: { maxDenom: maxDenom(run.floor), felt: prep.kind === 'boss' ? 'royal' : D.feltId(entry.felt) } });
  const com = committed(bout);
  return { bout, ctx: { kind: prep.kind, idx: prep.idx, opp: entry.opp, felt: prep.kind === 'boss' ? 'royal' : D.feltId(entry.felt), prep, wager: Math.max(0, run.purse - com), mult: multiplier(run, prep), tiltNet: tiltNet(prep), committed: com, resist: extra.resist } };
}
export function startLounge(run, drinkId) {
  const L = run.fs.lounge, st = rollerStats(run), d = L.drinks.find((x) => x.id === drinkId);
  const dims = { cols: D.TUNING.tables.barCols, stackMax: Math.max(2, st.dims.stackMax - 1), meterRows: Math.max(1, st.dims.meterRows - 1), barRows: Math.max(2, st.dims.barRows - 1) };
  const n = Math.min(16, barCapacity(dims)), md = maxDenom(run.floor), counts = noCounts();
  counts[1] = Math.min(4, n); counts[md] += n - counts[1]; // house chips: a few 1¢ to bid with, the rest in the floor's biggest chip
  const bout = createBout({ seed: run.rng.int(2 ** 31), a: playerSpec(run, counts, {}, dims), b: L.challenger, rules: { maxDenom: md, maxTurns: 20 } });
  L.challenged = true;
  return { bout, ctx: { kind: 'lounge', opp: L.challenger, felt: 'house', drink: d, wager: 0, mult: 1, committed: 0 } };
}
export function startAscent(run) {
  const A = run.ascent, opp = A.ladder[A.step].opp, st = rollerStats(run); const counts = validCounts(run, st.dims);
  const bout = createBout({ seed: run.rng.int(2 ** 31), a: playerSpec(run, counts, { resist: { ...run.plan.resist } }), b: opp, rules: { maxDenom: maxDenom(D.ASCENT_FLOOR), maxTurns: 50 } });
  const com = committed(bout);
  return { bout, ctx: { kind: 'ascent', opp, felt: 'paradise', wager: 0, mult: 1, committed: com, resist: run.plan.resist } };
}

// Turn a finished bout into chips. Returns the breakdown and, on a win, the prizes on offer.
// Dice upgrades are permanent, including faces that change with use (Rig, Enchant, Encase): copy the bout's dice
// back to the run. Upgrade chip effects were rolled on throwaway copies and never get here.
function keepDiceState(run, bout) {
  const s = bout.sides[0], all = [...s.pouch, ...s.tray, ...s.run.flatMap((e) => e.dice), ...(s.tapped?.dice || []).map((x) => x.die)];
  for (const d of run.dice) { const x = all.find((y) => y.id === d.id); if (x?.faces) d.faces = x.faces.map((f) => ({ ...f })); }
  const tricks = [...s.book, ...s.run.map((e) => e.trick), ...(s.tapped?.tricks || []).map((x) => x.trick)]; // the wear from this bout's plays
  for (const t of run.tricks) { const x = tricks.find((y) => y.uid === t.uid); if (x && x.wear != null) t.wear = x.wear; }
}
export function settle(run, ctx, bout) {
  keepDiceState(run, bout);
  const sm = summary(bout, 0), rng = run.rng, lines = [], res = { win: sm.win, lines, prizes: null, news: [], sm };
  run.stats.bouts++; run.stats.turns += sm.turns; if (sm.win) run.stats.wins++; else run.stats.losses++;
  if (run.drink) { run.drink.sips = bout.sides[0].drink ? bout.sides[0].drink.sips : run.drink.sips; if (run.drink.sips <= 0) run.drink = null; }
  if (ctx.kind === 'intro') {
    if (sm.win) { run.purse = (run.worth0 ?? 200) + sm.oppFees; addPass(run, 1); lines.push([tx('run.welcome-stake-from-the'), run.worth0 ?? 200], [tx('run.fees-your-opponent-paid'), sm.oppFees], [run.pass > 1 ? tx('run.your-gets-you-past', { name: D.PASSES[run.pass].name }) : tx('run.the-doorman-hands-you'), 0]); ledger(run, tx('run.intro-bout'), run.purse); }
    else lines.push([tx('run.the-doorman-shrugs-try'), 0]);
    res.total = run.purse; return res;
  }
  if (ctx.kind === 'bouncer') { // no stake either way: only the way back in
    if (sm.win) { addPass(run, 1); lines.push([tx('run.the-bouncer-steps-aside'), 0]); }
    else lines.push([tx('run.the-bouncer-will-not'), 0]);
    res.total = run.purse; return res;
  }
  if (ctx.kind === 'lounge') {
    const d = ctx.drink;
    if (sm.win) { pourDrink(run, d); lines.push([tx('run.buys-you-a', { name: ctx.opp.name, name2: d.name }), 0]); }
    else if (D.TUNING.penalty.barLossPaysDrink) { const cost = Math.min(run.purse, price(run, 'lounge', d.cost)); run.purse -= cost; ledger(run, tx('run.lost-a-bar-bout'), -cost); lines.push([tx('run.you-buy-a', { name: ctx.opp.name, name2: d.name }), -cost]); }
    res.total = run.purse; return res;
  }
  for (const [el, n] of Object.entries(ctx.resist || {})) run.chips[el] = Math.max(0, owned(run, el) - n + (sm.win ? sm.resist[el] || 0 : 0));
  if (run.rest && run.rest.bouts > 0) run.rest.bouts--;
  const start = run.purse;
  if (ctx.kind === 'ascent') {
    const safe = run.purse - ctx.committed;
    if (sm.win) { run.purse = safe + sm.survivors + sm.gold + sm.ownFees + sm.pendingBids + sm.oppFees + sm.opportunity + sm.nest + sm.seq + (sm.made || 0);
      lines.push([tx('run.chips-kept-off-the'), safe], [tx('run.chips-left-in-your'), sm.survivors], [tx('run.your-fees-restored'), sm.ownFees + sm.pendingBids], [tx('run.s-fees', { name: ctx.opp.name }), sm.oppFees], [tx('run.gold-opportunity-and-nest'), sm.gold + sm.opportunity + sm.nest + sm.seq + (sm.made || 0)], [tx('run.bids-lost-to-the'), -sm.bids + sm.pendingBids]);
      run.ascent.step++; if (run.ascent.step >= run.ascent.ladder.length) run.phase = 'paradise';
    } else { run.purse = safe; lines.push([tx('run.chips-kept-off-the'), safe], [tx('run.position-lost'), -ctx.committed]); run.phase = 'fallen'; }
    res.total = run.purse; ledger(run, sm.win ? tx('run.ascent-beat', { name: ctx.opp.name }) : tx('run.ascent-lost-to', { name: ctx.opp.name }), run.purse - start); return res;
  }
  // Bounty chips still on your table pay their worth and a Unique Prize, win or lose
  const bounty = sum(sm.bounties || [], (x) => x.value);
  for (const x of sm.bounties || []) res.news.push(tx('run.bounty-chip-cashed-in', { name: D.CREATURES[x.creature].name, value: x.value }));
  // table or High Roller
  const entry = ctx.kind === 'boss' ? run.fs.boss : run.fs.tables[ctx.idx];
  const wager = sm.intervened ? Math.floor(ctx.wager * (1 - D.TUNING.penalty.interventionShare)) : ctx.wager;
  if (sm.win) {
    const base = sm.survivors + sm.gold + sm.ownFees + sm.pendingBids + sm.opportunity + sm.nest + sm.seq + (sm.made || 0) + bounty + wager;
    const tilt = tiltPay(ctx), chipsWon = chipStakePay(ctx);
    const winnings = Math.max(0, sm.oppFees + Math.round(wager * (ctx.mult - 1)) + tilt + chipsWon);
    lines.push([tx('run.chips-left-in-your'), sm.survivors], [tx('run.your-fees-restored-from'), sm.ownFees + sm.pendingBids]);
    if (sm.gold) lines.push([tx('run.gold-chips-pay-double'), sm.gold]);
    if (sm.opportunity) lines.push([tx('run.a-chip-for-every'), sm.opportunity]);
    if (sm.nest) lines.push([tx('run.nest-egg-chips-hatch'), sm.nest]);
    if (sm.seq) lines.push([tx('run.fibonacci-and-prime-chips'), sm.seq]);
    if (sm.made) lines.push([tx('run.made-chips-count-back'), sm.made]);
    if (bounty) lines.push([tx('run.bounty-chips-cashed-in'), bounty]);
    lines.push([tx('run.wager-returned'), wager]);
    if (sm.intervened) lines.push([`Intervention took ${Math.round(D.TUNING.penalty.interventionShare * 100)}% of your wager`, -(ctx.wager - wager)]);
    lines.push([tx('run.fees-paid-to-the', { name: ctx.opp.name }), sm.oppFees], [tx('run.wager-winnings', { mult: ctx.mult }), Math.round(wager * (ctx.mult - 1))]);
    if (chipsWon) lines.push([tx('run.shop-chips-staked', { chipStake: chipStake(ctx.resist), mult: ctx.mult }), chipsWon]);
    if (tilt) lines.push([tilt > 0 ? tx('run.house-bounty-for-your') : tx('run.house-cut-for-your'), tilt]);
    lines.push([tx('run.bids-lost-to-the'), -(sm.bids - sm.pendingBids)]);
    if (sm.destroyed) lines.push([tx('run.chips-destroyed-by-hazards'), -sm.destroyed]);
    entry.beaten = true; if (ctx.kind === 'boss' && run.floor >= 4 && !hasCard(run, 'paradise')) { run.cards.push('paradise'); res.news.push(tx('run.the-last-high-roller')); }
    if (ctx.kind === 'table' && ctx.idx === 0) { run.fs.tables[1].seen = run.fs.tables[2].seen = true; res.news.push(tx('run.table-1-is-closed')); }
    else if (ctx.kind === 'table') { const other = run.fs.tables[3 - ctx.idx]; other.passed = true; res.news.push(tx('run.you-chose-table-at', { idx: ctx.idx + 1, name: other.opp.name, v: 4 - ctx.idx })); }
    res.base = base; res.winnings = winnings;
    res.prizes = { dice: rng.shuffle(ctx.opp.dice).slice(0, 3).map((d) => ({ ...d })), tricks: rng.shuffle(ctx.opp.tricks).slice(0, 2).map((t) => ({ ...t })) };
    if (ctx.kind === 'table') {
      if (ctx.prep.dd) { run.fs.ddStreak++; run.stats.dd++; run.fs.bossOpen = true; run.suiteKey = true; if (!hasCard(run, 'suite')) run.cards.push('suite'); res.news.push(tx('run.double-down-won-a')); }
      run.fs.lastWin = { tilts: { ...ctx.prep.tilts }, mult: ctx.mult };
      if (!tablesLeft(run) && !run.fs.bossOpen) { run.fs.bossOpen = true; res.news.push(tx('run.the-high-roller-is')); }
    } else { res.news.push(tx('run.is-dethroned-the-stairs', { name: ctx.opp.name }));
      // a High Roller's business card: yours to keep, and to play by (one at a time, picked on the floor)
      // and their crown: yours to keep, and to wear from your suite (style only)
      run.crownCase = run.crownCase || []; run.crownCase.push({ floor: ctx.opp.floor || run.floor, from: ctx.opp.name, roster: ctx.opp.roster || null });
      res.news.push(tx('run.crown-claimed', { name: ctx.opp.name }));
      const card = ctx.opp.trait; if (card && D.BOSS_TRAITS[card]) { run.bizCards = run.bizCards || []; if (!run.bizCards.includes(card)) run.bizCards.push(card); if (!run.trait) run.trait = card;
        res.news.push(tx('run.biz-card-kept', { name: ctx.opp.name, trait: D.BOSS_TRAITS[card].name })); } }
  } else {
    run.purse = bounty;
    lines.push([tx('run.chips-in-your-position'), -ctx.committed], ['Wager', -ctx.wager]);
    if (bounty) lines.push([tx('run.bounty-chips-cashed-in'), bounty]);
    const lost = rng.shuffle(run.dice).slice(0, Math.min(D.TUNING.penalty.diceTaken, Math.max(0, run.dice.length - 1)));
    run.dice = run.dice.filter((d) => !lost.includes(d)); if (lost.length) lines.push([tx('run.dice-taken', { join: lost.map((d) => d.type).join(', ') }), 0]);
    if (run.fs) run.fs.lastWin = null;
    ledger(run, tx('run.lost-to', { name: ctx.opp.name }), -start);
  }
  res.news.push(...resolveBets(run));
  res.total = sm.win ? res.base + res.winnings : run.purse;
  return res;
}
// You always keep the winnings. Then one prize: 'die' (bonus money and one die), 'dice' (two dice), 'glean' (a trick)
export const prizeBonus = (ctx) => Math.round((ctx.opp?.worth || 0) * D.PRIZES.bonus);
export function claimPrize(run, ctx, res, choice, picks) {
  const start = run.purse, bets = run.purse; // bets already paid into the purse by settle
  const total = res.base + res.winnings + (choice === 'die' ? prizeBonus(ctx) : 0);
  if (choice === 'glean') { const t = res.prizes.tricks[picks[0]]; run.tricks.push(mkTrick(run, t.id, t.q, printOf(t))); }
  else for (const i of picks.slice(0, choice === 'die' ? 1 : 2)) run.dice.push(mkDie(run, res.prizes.dice[i].type));
  // settle() left the pre-bout purse in place apart from bet payouts; replace the staked part with the result
  run.purse = total + (bets - ctx.committed - ctx.wager);
  run.stats.won += Math.max(0, run.purse - start); ledger(run, tx('run.beat', { name: ctx.opp.name }), run.purse - start);
  return run.purse;
}
export const brokeHint = (run) => (run.purse < D.FLOORS[run.floor].cut ? tx('run.a-smart-roller-knows') : '');

// ---------- suite, gift shop, ascent ----------
export function suiteOffer(run) {
  const rng = run.rng, f = run.floor, pool = D.TRICK_IDS.filter((id) => !D.TRICKS[id].cls || D.TRICKS[id].cls === run.cls);
  return [mkTrick(run, rng.pick(pool), clamp(f, 1, 4)), mkTrick(run, rng.pick(pool), clamp(f, 1, 4), { foil: 1 })];
}
export function goToBed(run, penthouse) { run.rest = penthouse ? { bouts: 2, amt: 2 } : { bouts: 1, amt: 1 }; }
export function nextAfterBoss(run) { return run.floor >= 4 ? 'penthouse' : run.suiteKey ? 'suite' : 'floor'; }

export function netWorth(run) { return run.purse + sum(run.dice, (d) => D.DICE[d.type].sell) + sum(run.tricks, (t) => trickValue(run, t)); }
export function buildAscent(run, meta) {
  const worths = [1100, 1300, 1500, 1800, 2200], nominal = [1e6, 1e7, 1e9, 1e11, 1e12];
  const ladder = D.ASCENT_NAMES.map((name, i) => ({ name, networth: nominal[i], legend: true,
    opp: genOpponent(run, 4, worths[i], { boss: i >= 3, name, title: ['Millionaire', 'Millionaire', 'Billionaire', 'Billionaire', 'Trillionaire'][i], q: 4, foil: Math.floor(i / 2), maxDenom: maxDenom(D.ASCENT_FLOOR) }) }));
  for (const bld of meta.ladder || []) {
    const opp = genOpponent(run, 4, clamp(bld.worth, 600, 2000), { cls: bld.cls, name: bld.name, title: tx('run.remnant-roller'), q: 4, maxDenom: maxDenom(D.ASCENT_FLOOR) });
    opp.tricks = bld.tricks.map((t) => mkTrick(run, t.id, t.q, { ...printOf(t), foil: t.foil || t.up || 0 })); opp.dice = bld.dice.map((d) => ({ ...mkDie(run, d.type), up: d.up || [], faces: d.faces }));
    ladder.push({ name: bld.name, networth: bld.networth, legend: false, opp });
  }
  ladder.sort((a, b) => a.networth - b.networth);
  const step = clamp(ladder.filter((l) => l.networth <= netWorth(run)).length, 0, Math.max(0, ladder.length - 3));
  run.ascent = { ladder, step, start: step }; run.phase = 'ascent'; run.floor = 5; run.fs = null; run.cards = []; run.jacket = 'standard';
  return run.ascent;
}
// the business card you play by: one of the High Rollers' cards you have won (null: none)
// wear one of the crowns you have claimed (index into run.crownCase), or none (null): it shows on your sign
export function wearCrown(run, i) { if (i != null && !run.crownCase?.[i]) return false; run.wearing = i ?? null; return true; }
export const crownWorn = (run) => (run.wearing != null ? run.crownCase?.[run.wearing] || null : null);
export function carryCard(run, id) { if (id && !(run.bizCards || []).includes(id)) return false; run.trait = id || null; return true; }
export const jacketFits = (cls, id) => !D.JACKETS[id].cls || D.JACKETS[id].cls === cls;
export const jacketAvailable = (run, id) => D.JACKETS[id].level <= Math.max(0, run.floor - 1);
export function buyJacket(run, meta, id) {
  const J = D.JACKETS[id]; if (meta.jackets.includes(id) || !jacketAvailable(run, id)) return false;
  let need = J.price; const fromAtm = meta.debit ? Math.min(meta.atm, Math.max(0, need - run.purse)) : 0;
  if (run.purse + fromAtm < need) return false;
  meta.atm -= fromAtm; run.purse -= need - fromAtm; meta.jackets.push(id); ledger(run, tx('run.gift-shop-jacket', { name: J.name }), -(need - fromAtm)); saveMeta(meta); return true;
}
export function deposit(run, meta) { if (!meta.debit && !hasCard(run, 'debit')) return 0; meta.debit = true; const n = run.purse; meta.atm += n; run.purse = 0; if (n) ledger(run, tx('run.atm-deposit'), -n); saveMeta(meta); return n; }
export const walletAvailable = (run, meta, id) => { const Wl = D.WALLETS[id]; return Wl.level <= Math.max(0, run.floor - 1) && (!Wl.crown || meta.crowns > 0); };
export function buyWallet(run, meta, id) {
  const Wl = D.WALLETS[id]; if (meta.wallets.includes(id) || !walletAvailable(run, meta, id)) return false;
  const fromAtm = meta.debit ? Math.min(meta.atm, Math.max(0, Wl.price - run.purse)) : 0;
  if (run.purse + fromAtm < Wl.price) return false;
  meta.atm -= fromAtm; run.purse -= Wl.price - fromAtm; meta.wallets.push(id); ledger(run, tx('run.gift-shop-wallet', { name: Wl.name }), -(Wl.price - fromAtm)); saveMeta(meta); return true;
}
// In the alley you are robbed. Two of your best dice decide whether you hold on to your wallet and its cards.
export function alleyRoll(run) {
  const dice = run.dice.slice().sort((a, b) => D.DICE[b.type].faces - D.DICE[a.type].faces).slice(0, 2).map((d) => ({ type: d.type, up: d.up, faces: d.faces, value: rollDie(run.rng, boutCopy(d)) }));
  const total = dice.reduce((n, d) => n + d.value, 0), need = walletOf(run).keep, cards = walletCards(run);
  const passes = passesOf(run), pass = passes[0] || 0; return { dice, total, need, kept: total >= need && (cards.length > 0 || pass > 0), cards, pass, passes };
}
// leaving through the alley ends the run
export function endRun(run, meta, name = 'You', kept = [], keptPass = 0) {
  meta.kept = kept; meta.keptPass = keptPass; // a wallet held on to in the alley keeps its passes (a floor, or a list of them)
  if (hasCard(run, 'debit')) meta.debit = true;
  meta.runs++; meta.best = Math.max(meta.best, run.floor);
  const reached = run.phase === 'paradise' || run.phase === 'fallen' || run.phase === 'ascent';
  if (run.phase === 'paradise') meta.crowns++;
  if (reached) {
    meta.ladder.push({ name: `${name} #${meta.runs}`, cls: run.cls, networth: netWorth(run), worth: Math.min(2000, Math.max(600, run.purse)), tricks: run.tricks.map(({ id, q, foil, rar, mis }) => ({ id, q, foil, rar, mis })), dice: run.dice.map(({ type, up, faces }) => ({ type, up, faces })) });
    if (meta.ladder.length > 12) meta.ladder.shift();
  }
  saveMeta(meta); clearRun();
  return { floor: run.floor, phase: run.phase, stats: run.stats, ledger: run.ledger, networth: netWorth(run) };
}

// a dry run of the deployment, for the position planner
// how an opponent will be laid out when the bout starts (their deployment is fixed before you sit down)
export function previewOpponent(opp) { return createBout({ seed: 7, a: opp, b: opp }).sides[1]; }
export function previewPosition(run, counts, extra = {}) {
  const dummy = { name: '', cls: run.cls, tip: { trickery: 1, ingenuity: 1, proficiency: 1 }, c: { charisma: 0, cunning: 0, conviction: 0 }, dims: { cols: 5, stackMax: 1, meterRows: 1, barRows: 1 }, deploy: 'start', tricks: [], dice: [], plan: { chips: [], spacing: 'row', stacking: 'maxed' } };
  return createBout({ seed: 7, a: playerSpec(run, counts, { position: extra.position, resist: extra.resist }), b: dummy }).sides[0];
}
