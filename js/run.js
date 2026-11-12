// A run: one Roller climbing the Royal Paradise. Everything outside a bout lives here —
// floors, opponents, shops, the lounge, the sports book, wagers and tilts, winnings and the Ascent.
import { RNG, sum, clamp } from './util.js';
import * as D from './data.js';
import { createBout, summary, barCapacity } from './bout.js';
import { rollDie, boutCopy, upgrade as upgradeFaces, canUpgrade } from './dice.js';

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
  for (const box of [run.chips, run.plan?.resist]) { if (!box) continue;
    for (const [old, now] of Object.entries(D.SHOP_RENAMES)) if (old in box) { if (now) box[now] = (box[now] || 0) + box[old]; delete box[old]; } }
}
export function loadRun() {
  try { const raw = store()?.getItem(RUN_KEY); if (!raw) return null; const run = JSON.parse(raw); const s = run.rng; run.rng = new RNG(0); run.rng.s = s; migrate(run); return run; } catch { return null; }
}

const mkTrick = (run, id, q = 1, up = 0) => ({ uid: run.nextId++, id, q, up });
const mkDie = (run, type) => ({ id: run.nextId++, type, up: [] });
const ledger = (run, label, amt) => { run.ledger.push({ label, amt, floor: run.floor }); if (run.ledger.length > 200) run.ledger.shift(); };
export const hasCard = (run, id) => run.cards.includes(id);
// wallet: benefit cards take a slot, passes do not
export const walletCards = (run) => run.cards.filter((id) => !D.PASS_CARDS.includes(id));
export const walletOf = (run) => D.WALLETS[run.wallet] || D.WALLETS.worn_cloth;
export const walletFull = (run) => walletCards(run).length >= walletOf(run).slots;
// returns false and holds the card as pending when the wallet has no room
export function addCard(run, id) {
  if (hasCard(run, id)) return true;
  if (!D.PASS_CARDS.includes(id) && walletFull(run)) { run.pendingCard = id; return false; }
  run.cards.push(id); return true;
}
export function resolvePending(run, dropId) {
  const id = run.pendingCard; run.pendingCard = null; if (!id || !dropId) return;
  run.cards = run.cards.filter((x) => x !== dropId); run.cards.push(id);
}
export function dropCard(run, id) { if (!hasCard(run, id) || D.PASS_CARDS.includes(id) || (id === 'royal' && run.floor < 1)) return false; run.cards = run.cards.filter((x) => x !== id); return true; }
// the Membership Card carries the Trader's discount as well; the two do not stack
export const price = (run, shop, base) => Math.max(1, Math.round(base * (hasCard(run, `discount_${shop}`) || (shop === 'trader' && hasCard(run, 'membership')) ? 0.9 : 1)));
function spend(run, amt, label) { if (run.purse < amt) return false; run.purse -= amt; run.stats.spent += amt; ledger(run, label, -amt); return true; }

export function newRun(cls, jacketReq = 'standard', seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0, gear = {}) {
  const jacket = jacketFits(cls, jacketReq) ? jacketReq : 'standard'; // a level 0 jacket only fits the class it was cut for
  const run = { v: 1, rng: new RNG(seed), seed, cls, jacket, wallet: gear.wallet || 'worn_cloth', pendingCard: null, floor: 0, purse: 0, nextId: 1, dice: [], tricks: [], chips: {},
    drink: null, cards: [], punches: 0, rest: null, suiteKey: false, phase: 'intro', fs: null, bets: [], news: [], ledger: [], ascent: null,
    plan: { spacing: 'row', stacking: 'maxed', counts: null, resist: {} },
    stats: { bouts: 0, wins: 0, losses: 0, spent: 0, won: 0, turns: 0, dd: 0 } };
  const K = D.CLASSES[cls];
  for (const [type, n] of Object.entries(K.dice)) for (let i = 0; i < n; i++) run.dice.push(mkDie(run, type));
  run.tricks = K.tricks.map((id) => mkTrick(run, id));
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
  const K = D.CLASSES[run.cls], v = { ...K.tip, ...K.c, ...K.bvd };
  const add = (mods) => { for (const [k, n] of Object.entries(mods || {})) v[k] = (v[k] || 0) + n; };
  add(D.JACKETS[run.jacket]?.mods); for (const id of run.cards) add(D.CARDS[id]?.mods);
  if (run.rest && run.rest.bouts > 0) add({ [K.primary]: run.rest.amt });
  const bvdKeys = ['balance', 'versatility', 'depth'];
  for (let i = 0; i < (extra.position || 0); i++) v[bvdKeys[i % 3]] += 1;
  const dims = { cols: D.BASE_DIMS.cols, stackMax: Math.max(1, D.BASE_DIMS.stackMax + v.balance), meterRows: Math.max(1, D.BASE_DIMS.meterRows + v.versatility), barRows: Math.max(1, D.BASE_DIMS.barRows + v.depth) };
  return { v, dims, tip: { trickery: Math.max(1, v.trickery), ingenuity: Math.max(1, v.ingenuity), proficiency: Math.max(1, v.proficiency) },
    c: { charisma: Math.max(0, v.charisma), cunning: Math.max(0, v.cunning), conviction: Math.max(0, v.conviction) } };
}
export const maxDenom = (floor) => Math.max(...D.DENOMS.filter((d) => d.floor <= Math.max(1, floor)).map((d) => d.value));
export const denomsFor = (floor) => D.DENOMS.filter((d) => d.floor <= Math.max(1, floor)).map((d) => d.value);
export const noCounts = () => Object.fromEntries(D.DENOM_VALUES.map((v) => [v, 0]));
// the floor a run's chips come from: the Ascent opens every chip
export const chipFloor = (run) => (run.phase === 'ascent' ? D.ASCENT_FLOOR : run.floor || 1);

// ---------- opponents ----------
export function genOpponent(run, floor, worthTarget, o = {}) {
  const rng = run.rng, cls = o.cls || rng.pick(Object.keys(D.CLASSES)), K = D.CLASSES[cls], f = clamp(floor, 1, 4);
  const tip = { ...K.tip }, c = { ...K.c }, bvd = { ...K.bvd };
  if (floor >= 2) tip.proficiency++; if (floor >= 3) tip.ingenuity++; if (floor >= 4) tip.trickery++;
  const why = { balance: [[`${K.name} class`, K.bvd.balance]].filter((x) => x[1]), versatility: [[`${K.name} class`, K.bvd.versatility]].filter((x) => x[1]), depth: [[`${K.name} class`, K.bvd.depth]].filter((x) => x[1]) };
  if (o.boss) { if (floor === 2 || floor === 3) tip[K.primary]++; bvd.balance++; why.balance.push(['High Roller', 1]); }
  if (o.weak) { tip.trickery = 1; tip.proficiency = 1; tip.ingenuity = 1; }
  const B0 = D.BASE_DIMS, dims = { cols: o.cols || B0.cols, stackMax: Math.max(1, B0.stackMax + bvd.balance), meterRows: Math.max(1, B0.meterRows + bvd.versatility), barRows: Math.max(1, B0.barRows + bvd.depth) };
  const pools = [null, ['d4', 'd6'], ['d6', 'd8'], ['d6', 'd8', 'd10'], ['d8', 'd8', 'd10', 'd10', 'd20']];
  const dice = Array.from({ length: o.weak ? 3 : 5 + f * 2 + (o.boss ? 2 : 0) }, () => mkDie(run, o.weak ? 'd4' : rng.pick(pools[f])));
  const q = o.q || Math.min(3, f); let ids = o.weak ? ['charge'] : [...K.tricks];
  if (!o.weak) { const extra = rng.shuffle(D.TRICK_IDS.filter((id) => !ids.includes(id) && (!D.TRICKS[id].cls || D.TRICKS[id].cls === cls))); ids = ids.concat(extra.slice(0, f + (o.boss ? 1 : 0))); }
  const tricks = ids.map((id) => mkTrick(run, id, q, (o.boss ? rng.int(2) : 0) + (o.up || 0)));
  // chips: a little petty cash in 1¢ for bidding, the rest in the biggest chips the floor allows
  const md = o.maxDenom || maxDenom(floor), cap = barCapacity(dims);
  let W = worthTarget;
  if (D.BOARD_RULES.scaleOppWorth) {
    const B1 = D.BASE_DIMS_DEFAULT, cap0 = barCapacity({ cols: o.cols || B1.cols, stackMax: Math.max(1, B1.stackMax + bvd.balance), barRows: Math.max(1, B1.barRows + bvd.depth) });
    W = Math.max(1, Math.round(W * cap / cap0));
  }
  let petty = Math.min(W, Math.max(6, Math.round(cap * 0.12)));
  // the big chip: up to 10¢ as before, or the smallest bigger one that fits the worth into the position
  const allowed = D.DENOM_VALUES.filter((v) => v <= md), fits = (v) => petty + Math.ceil(Math.max(0, W - petty) / v) <= cap;
  let big = Math.max(...allowed.filter((v) => v <= 10)); if (!fits(big)) big = allowed.find((v) => v > big && fits(v)) || Math.max(...allowed);
  let nBig = big > 1 ? Math.floor((W - petty) / big) : 0;
  if (nBig + petty > cap) { nBig = cap - petty; }
  if (big === 1) { petty = Math.min(W, cap); nBig = 0; }
  const groups = [{ value: big, count: nBig }, { value: 1, count: petty }].filter((g) => g.count > 0);
  if (K.deploy === 'end') groups.reverse();
  if (o.cols) why.note = 'A bar table: only three spaces wide.';
  return { name: o.name || rng.pick(D.OPPONENTS), title: o.title || '', cls, floor, boss: !!o.boss, ai: true, tip, c, dims, why, deploy: K.deploy, dice, tricks,
    plan: { chips: groups, spacing: 'row', stacking: 'maxed' }, worth: nBig * big + petty };
}

// ---------- floors ----------
export function enterFloor(run, floor) {
  const rng = run.rng, F = D.FLOORS[floor], names = rng.shuffle(D.OPPONENTS);
  run.floor = floor; run.phase = 'floor'; run.suiteKey = false;
  run.fs = {
    tables: F.worth.map((w, i) => ({ opp: genOpponent(run, floor, Math.round(w * (0.9 + rng.next() * 0.2)), { name: names[i] }), beaten: false, seen: i === 0, felt: rng.pick(D.FELT_POOL) })),
    boss: { opp: genOpponent(run, floor, F.boss, { boss: true, name: rng.pick(D.BOSSES[floor]), title: 'High Roller' }), beaten: false, felt: 'royal' },
    bossOpen: false, lastWin: null, ddStreak: 0, tiers: { challenge: 0, cheat: 0 },
    shop: null, restocks: 0, bought: 0, upgrades: 2, secret: null,
    lounge: genLounge(run, floor), book: genBook(run, floor), searched: false,
  };
  run.fs.shop = genShelf(run);
  run.news = [`Floor ${floor}: ${F.name}. ${F.line}`];
  if (floor === 1 && !hasCard(run, 'royal')) addCard(run, 'royal'); // a full wallet has to drop a card for it
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
    const id = rng.pick(fresh.length ? fresh : pool); const q = clamp(f + (rng.chance(0.2) ? 1 : 0) - (rng.chance(0.25) ? 1 : 0), 1, 4);
    out.push({ key: run.nextId++, trick: mkTrick(run, id, q), cost: 50 * f * q });
  }
  return out;
}
export const restockCost = (run) => price(run, 'trader', 100 * (run.floor + run.fs.restocks));
export function restock(run) { if (!spend(run, restockCost(run), 'Trick Trader restock')) return false; run.fs.restocks++; run.fs.shop = genShelf(run); return true; }
export function buyTrick(run, key) {
  const it = run.fs.shop.find((x) => x.key === key); if (!it || !spend(run, price(run, 'trader', it.cost), `Bought ${D.TRICKS[it.trick.id].name}`)) return false;
  run.fs.shop = run.fs.shop.filter((x) => x !== it); run.tricks.push(it.trick); run.fs.bought++;
  if (run.fs.bought >= 5 && !hasCard(run, 'membership')) { run.cards.push('membership'); run.news.push('The Trick Trader slides you a Membership Card. The Secret Shelf is open.'); }
  return true;
}
export const upgradeCost = (run, t) => price(run, 'trader', 50 * (1 + t.q * (t.up + 1)));
export function upgradeTrick(run, uid) {
  const t = run.tricks.find((x) => x.uid === uid); if (!t || t.up >= 2 || run.fs.upgrades <= 0) return false;
  if (!spend(run, upgradeCost(run, t), `Upgraded ${D.TRICKS[t.id].name}`)) return false; t.up++; run.fs.upgrades--; return true;
}
export const trickValue = (run, t) => 25 * Math.max(1, run.floor) * t.q;
export function sellTrick(run, uid) {
  const i = run.tricks.findIndex((x) => x.uid === uid); if (i < 0 || run.tricks.length <= 1) return false;
  const v = trickValue(run, run.tricks[i]); ledger(run, `Sold ${D.TRICKS[run.tricks[i].id].name}`, v); run.tricks.splice(i, 1); run.purse += v; return true;
}
export function secretShelf(run) {
  if (!run.fs.secret) { const rng = run.rng; const id = rng.pick(D.TRICK_IDS);
    run.fs.secret = [{ key: run.nextId++, die: 'd10', cost: 5000 }, { key: run.nextId++, die: 'd10', cost: 5000 }, { key: run.nextId++, die: 'd20', cost: 100000 },
      { key: run.nextId++, trick: mkTrick(run, id, 4, 1), cost: 10000 }]; }
  return run.fs.secret;
}
export function buySecret(run, key) {
  const it = run.fs.secret?.find((x) => x.key === key); if (!it || !spend(run, it.cost, 'Secret Shelf')) return false;
  if (it.die) run.dice.push(mkDie(run, it.die)); else run.tricks.push(it.trick);
  run.fs.secret = run.fs.secret.filter((x) => x !== it); return true;
}

// Diesmith
export const forgeCost = (run, type) => price(run, 'diesmith', D.DICE[type].forge.chips);
// dice given up in a forge: the cheapest ones you own
export function forgeFodder(run, type) {
  const n = D.DICE[type].forge.dice; const sorted = run.dice.slice().sort((a, b) => D.DICE[a.type].faces - D.DICE[b.type].faces || a.up.length - b.up.length);
  return sorted.length > n ? sorted.slice(0, n) : null; // must keep at least one die
}
export function forge(run, type) {
  const f = D.DICE[type].forge; if (run.floor < f.floor) return false; const fodder = forgeFodder(run, type); if (!fodder) return false;
  if (!spend(run, forgeCost(run, type), `Forged a ${type}`)) return false;
  run.dice = run.dice.filter((d) => !fodder.includes(d)); run.dice.push(mkDie(run, type)); return true;
}
export function sellDie(run, id) {
  const i = run.dice.findIndex((d) => d.id === id); if (i < 0 || run.dice.length <= 1) return false;
  const v = D.DICE[run.dice[i].type].sell; ledger(run, `Sold a ${run.dice[i].type}`, v); run.dice.splice(i, 1); run.purse += v; return true;
}
export const dieUpgradeCost = (run, d) => price(run, 'diesmith', 60 * Math.max(1, run.floor) * (1 + d.up.length));
// why an upgrade cannot go on a die right now, or null
export function dieUpgradeBlock(run, d, up) {
  const U = D.DIE_UPGRADES[up]; if (!U) return 'No such upgrade.';
  if (run.floor < (U.floor || 1)) return `The Diesmith offers ${U.name} from floor ${U.floor}.`;
  return canUpgrade(d, up, D.DIE_UPGRADE_MAX);
}
// `face`: the target face for upgrades that take one
export function upgradeDie(run, id, up, face = 0) {
  const d = run.dice.find((x) => x.id === id); if (!d || dieUpgradeBlock(run, d, up)) return false;
  if (!spend(run, dieUpgradeCost(run, d), `${D.DIE_UPGRADES[up].name} on a ${d.type}`)) return false;
  upgradeFaces(d, up, face, run.rng); return true;
}
// Chip Exchange: shop chips are priced by their tier (D.CHIP_TIERS) and unlocked by the tier's floor
export const owned = (run, id) => run.chips[id] || 0;
export const shopChipOpen = (run, id) => run.floor >= D.shopFloor(id);
export function buyShopChip(run, id) {
  if (!D.soldInShop(id) || !shopChipOpen(run, id) || !spend(run, D.shopPrice(id), `Bought a ${D.SHOP_CHIPS[id].name}`)) return false; // chips a trick or the table makes are not sold
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
    challenger: genOpponent(run, floor, 14 * maxDenom(floor), { cols: 3, name: rng.pick(D.OPPONENTS), title: 'Barfly', q: Math.max(1, Math.min(3, floor) - 1) }) };
}
export const drinkCost = (run, d) => (run.punches >= 5 ? 0 : price(run, 'lounge', d.cost));
function pourDrink(run, d) { run.drink = { id: d.id, name: d.name, verb: d.verb, sips: d.sips, max: d.sips, mods: d.mods }; }
export function buyDrink(run, id) {
  const d = run.fs.lounge.drinks.find((x) => x.id === id); if (!d) return false; const cost = drinkCost(run, d);
  if (!spend(run, cost, `Bought a ${d.name}`)) return false;
  if (cost === 0) run.punches = 0; else if (hasCard(run, 'punch')) run.punches++;
  pourDrink(run, d); return true;
}

// ---------- sports book ----------
function oddsFor(p) { const fair = (1 / p - 1) * 0.95; let best = D.ODDS[D.ODDS.length - 1]; for (const o of D.ODDS) if (o[1] <= fair) { best = o; break; } return { pay: best[1], label: best[2] }; }
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
  if (!spend(run, stake, `Bet on ${ev.field[pick].name}`)) return false; ev.bet = { pick, stake }; return true;
}
// games are played while you are at the table
export function resolveBets(run) {
  const out = [];
  for (const ev of run.fs?.book.events || []) {
    if (!ev.bet || ev.done) continue;
    const winner = run.rng.weighted(ev.field.map((_, i) => i), (i) => ev.field[i].p); ev.done = true; ev.winner = winner;
    const sp = D.SPORTS.find((s) => s.id === ev.sport), mine = ev.field[ev.bet.pick];
    if (winner === ev.bet.pick) { const pay = Math.round(ev.bet.stake * (1 + mine.pay)); run.purse += pay; ledger(run, `${sp.name} bet won`, pay); out.push(`${sp.name}: ${mine.name} wins! Your ${mine.label} ticket pays ${pay.toLocaleString()}¢.`); }
    else out.push(`${sp.name}: ${ev.field[winner].name} wins. Your ticket on ${mine.name} is worthless.`);
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
export const newPrep = (run, kind, idx) => ({ kind, idx, tilts: Object.fromEntries(Object.keys(D.TILTS).map((k) => [k, 0])), dd: false });
export const tiltOpen = (run, key) => (run.floor || 1) >= D.TILTS[key].floor;
export function setTilt(run, prep, key, on) { if (on && !tiltOpen(run, key)) return false; prep.tilts[key] = on ? 1 : 0; return true; }
// the tilts' net share: + for Challenges, − for Cheats
export const tiltNet = (prep) => sum(Object.entries(prep.tilts), ([k, n]) => (n ? (D.TILTS[k].kind === 'challenge' ? 1 : -1) * D.TILTS[k].mult : 0));
// what a won table pays for its tilts (a House bounty for Challenges, a House cut for Cheats) and for staked shop chips
export const tiltPay = (ctx) => Math.round(D.TILT_WORTH_SHARE * (ctx.tiltNet || 0) * (ctx.opp?.worth || 0));
export const chipStake = (resist) => sum(Object.entries(resist || {}), ([id, n]) => (D.SHOP_CHIPS[id] && D.soldInShop(id) ? n * D.shopPrice(id) : 0));
export const chipStakePay = (ctx) => (D.SHOP_CHIP_STAKE ? Math.round(chipStake(ctx.resist) * (ctx.mult - 1)) : 0);
export function multiplier(run, prep) {
  const base = prep.kind === 'boss' ? D.WAGER_BOSS : D.WAGER_BASE; let m = base;
  for (const [k, n] of Object.entries(prep.tilts)) if (n) m += (D.TILTS[k].kind === 'challenge' ? 1 : -1) * D.TILTS[k].mult;
  m = clamp(m, 1, Math.max(3, base));
  if (prep.dd) m = Math.min(D.DD_MAX, m * 2);
  return Math.round(m * 100) / 100;
}
// default chip mix: fill the Bar with the best chips the purse affords, keeping some 1¢ chips to bid with
// `reserve`: spaces kept for shop chips
export function autoCounts(run, dims, purse = run.purse, reserve = 0) {
  const cap = Math.max(0, barCapacity(dims) - reserve), all = denomsFor(chipFloor(run));
  const counts = noCounts(); let slots = cap, money = purse;
  const ones = Math.min(slots, money, Math.max(6, Math.round(cap * 0.15)));
  // chips up to 10¢ as before; bigger ones only as far as the purse needs them to fit in the Bar (more, smaller stacks)
  const fits = (d) => ones + Math.ceil(Math.max(0, money - ones) / d) <= cap, small = Math.max(...all.filter((v) => v <= 10));
  const top = fits(small) ? small : all.find((v) => v > small && fits(v)) || Math.max(...all), denoms = all.filter((v) => v <= top).sort((a, b) => b - a); counts[1] = ones; slots -= ones; money -= ones;
  for (const v of denoms) { if (v === 1) continue; const n = Math.min(slots, Math.floor(money / v)); counts[v] += n; slots -= n; money -= n * v; }
  const more = Math.min(slots, money); counts[1] += more;
  return counts;
}
// the saved chip mix, or a fresh one if it no longer fits the purse or the position
export function validCounts(run, dims) {
  const c = run.plan.counts, shop = sum(Object.entries(run.plan.resist || {}), ([k, n]) => Math.min(n, owned(run, k)) * (D.SHOP_CHIPS[k]?.place === 'space' ? dims.stackMax : D.SHOP_CHIPS[k]?.place === 'big' ? 3 * dims.stackMax + 1 : D.SHOP_CHIPS[k]?.place === 'sky' ? 0 : 1)) // a Tree needs a whole space, a Big chip four
    + run.cards.filter((id) => D.CARDS[id]?.resist).length; // and room for Resist chips
  if (c && planWorth(c) <= run.purse && sum(Object.values(c)) + shop <= barCapacity(dims) && planWorth(c) > 0) return c;
  return autoCounts(run, dims, run.purse, shop);
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
  return { name: 'You', title: K.name, cls: run.cls, tip: st.tip, c: st.c, dims: dimsOverride || st.dims, why: dimsOverride ? { note: 'A bar table: one size smaller than your usual position in every direction.' } : dimsWhy(run, extra), deploy: K.deploy, tricks: run.tricks, dice: run.dice,
    plan: { chips: planGroups(run, counts, extra.resist), spacing: run.plan.spacing, stacking: run.plan.stacking, resistChips: run.cards.map((id) => D.CARDS[id]?.resist).filter(Boolean) }, drink: run.drink && run.drink.sips > 0 ? run.drink : null, ...extra.side };
}
const committed = (bout) => sum(bout.sides[0].grid.flat().flatMap((c) => c.chips).filter((ch) => ch.kind === 'std' && !ch.resist), (ch) => ch.value);

export function startIntro(run) {
  const opp = genOpponent(run, 1, 18, { weak: true, name: 'Low Ball', title: 'Doorman', cls: 'technician' });
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
  const dims = { cols: 3, stackMax: Math.max(2, st.dims.stackMax - 1), meterRows: Math.max(1, st.dims.meterRows - 1), barRows: Math.max(2, st.dims.barRows - 1) };
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
  const s = bout.sides[0], all = [...s.pouch, ...s.tray, ...s.run.flatMap((e) => e.dice)];
  for (const d of run.dice) { const x = all.find((y) => y.id === d.id); if (x?.faces) d.faces = x.faces.map((f) => ({ ...f })); }
}
export function settle(run, ctx, bout) {
  keepDiceState(run, bout);
  const sm = summary(bout, 0), rng = run.rng, lines = [], res = { win: sm.win, lines, prizes: null, news: [], sm };
  run.stats.bouts++; run.stats.turns += sm.turns; if (sm.win) run.stats.wins++; else run.stats.losses++;
  if (run.drink) { run.drink.sips = bout.sides[0].drink ? bout.sides[0].drink.sips : run.drink.sips; if (run.drink.sips <= 0) run.drink = null; }
  if (ctx.kind === 'intro') {
    if (sm.win) { run.purse = 200 + sm.oppFees; lines.push(['Welcome stake from the House', 200], ['Fees your opponent paid', sm.oppFees]); ledger(run, 'Intro bout', run.purse); }
    else lines.push(['The doorman shrugs. Try again.', 0]);
    res.total = run.purse; return res;
  }
  if (ctx.kind === 'lounge') {
    const d = ctx.drink;
    if (sm.win) { pourDrink(run, d); lines.push([`${ctx.opp.name} buys you a ${d.name}`, 0]); }
    else { const cost = Math.min(run.purse, price(run, 'lounge', d.cost)); run.purse -= cost; ledger(run, 'Lost a bar bout', -cost); lines.push([`You buy ${ctx.opp.name} a ${d.name}`, -cost]); }
    res.total = run.purse; return res;
  }
  for (const [el, n] of Object.entries(ctx.resist || {})) run.chips[el] = Math.max(0, owned(run, el) - n + (sm.win ? sm.resist[el] || 0 : 0));
  if (run.rest && run.rest.bouts > 0) run.rest.bouts--;
  const start = run.purse;
  if (ctx.kind === 'ascent') {
    const safe = run.purse - ctx.committed;
    if (sm.win) { run.purse = safe + sm.survivors + sm.gold + sm.ownFees + sm.pendingBids + sm.oppFees + sm.opportunity + sm.nest + sm.seq;
      lines.push(['Chips kept off the table', safe], ['Chips left in your position', sm.survivors], ['Your fees, restored', sm.ownFees + sm.pendingBids], [`${ctx.opp.name}'s fees`, sm.oppFees], ['Gold, Opportunity and Nest Egg bonus', sm.gold + sm.opportunity + sm.nest + sm.seq], ['Bids lost to the House', -sm.bids + sm.pendingBids]);
      run.ascent.step++; if (run.ascent.step >= run.ascent.ladder.length) run.phase = 'paradise';
    } else { run.purse = safe; lines.push(['Chips kept off the table', safe], ['Position lost', -ctx.committed]); run.phase = 'fallen'; }
    res.total = run.purse; ledger(run, sm.win ? `Ascent: beat ${ctx.opp.name}` : `Ascent: lost to ${ctx.opp.name}`, run.purse - start); return res;
  }
  // Bounty chips still on your table pay their worth and a Unique Prize, win or lose
  const bounty = sum(sm.bounties || [], (x) => x.value);
  for (const x of sm.bounties || []) res.news.push(`${D.CREATURES[x.creature].name} Bounty chip cashed in: ${x.value}¢.`);
  // table or High Roller
  const entry = ctx.kind === 'boss' ? run.fs.boss : run.fs.tables[ctx.idx];
  const wager = sm.intervened ? Math.floor(ctx.wager / 2) : ctx.wager;
  if (sm.win) {
    const base = sm.survivors + sm.gold + sm.ownFees + sm.pendingBids + sm.opportunity + sm.nest + sm.seq + bounty + wager;
    const tilt = tiltPay(ctx), chipsWon = chipStakePay(ctx);
    const winnings = Math.max(0, sm.oppFees + Math.round(wager * (ctx.mult - 1)) + tilt + chipsWon);
    lines.push(['Chips left in your position', sm.survivors], ['Your fees, restored from the Stage', sm.ownFees + sm.pendingBids]);
    if (sm.gold) lines.push(['Gold chips pay double', sm.gold]);
    if (sm.opportunity) lines.push(['A chip for every Opportunity chip', sm.opportunity]);
    if (sm.nest) lines.push(['Nest Egg chips hatch', sm.nest]);
    if (sm.seq) lines.push(['Fibonacci and Prime chips grew', sm.seq]);
    if (bounty) lines.push(['Bounty chips cashed in', bounty]);
    lines.push(['Wager returned', wager]);
    if (sm.intervened) lines.push(['Intervention took half your wager', -(ctx.wager - wager)]);
    lines.push([`Fees ${ctx.opp.name} paid to the table`, sm.oppFees], [`Wager winnings ×${ctx.mult}`, Math.round(wager * (ctx.mult - 1))]);
    if (chipsWon) lines.push([`Shop chips staked (${chipStake(ctx.resist)}¢) ×${ctx.mult}`, chipsWon]);
    if (tilt) lines.push([tilt > 0 ? 'House bounty for your Challenges' : 'House cut for your Cheats', tilt]);
    lines.push(['Bids lost to the House', -(sm.bids - sm.pendingBids)]);
    if (sm.destroyed) lines.push(['Chips destroyed by hazards', -sm.destroyed]);
    entry.beaten = true; if (ctx.kind === 'boss' && run.floor >= 4 && !hasCard(run, 'paradise')) { run.cards.push('paradise'); res.news.push('The last High Roller hands over a Paradise Card. The Ascent is open to you.'); }
    if (ctx.kind === 'table' && ctx.idx === 0) { run.fs.tables[1].seen = run.fs.tables[2].seen = true; res.news.push('Table 1 is closed. Tables 2 and 3 are open: pick one. Beat it and the other closes.'); }
    else if (ctx.kind === 'table') { const other = run.fs.tables[3 - ctx.idx]; other.passed = true; res.news.push(`You chose table ${ctx.idx + 1}. ${other.opp.name} at table ${4 - ctx.idx} packs up.`); }
    res.base = base; res.winnings = winnings;
    res.prizes = { dice: rng.shuffle(ctx.opp.dice).slice(0, 3).map((d) => ({ ...d })), tricks: rng.shuffle(ctx.opp.tricks).slice(0, 2).map((t) => ({ ...t })) };
    if (ctx.kind === 'table') {
      if (ctx.prep.dd) { run.fs.ddStreak++; run.stats.dd++; run.fs.bossOpen = true; run.suiteKey = true; if (!hasCard(run, 'suite')) run.cards.push('suite'); res.news.push('Double Down won! A Suite Key Card is yours and the High Roller will see you now.'); }
      run.fs.lastWin = { tilts: { ...ctx.prep.tilts }, mult: ctx.mult };
      if (!tablesLeft(run) && !run.fs.bossOpen) { run.fs.bossOpen = true; res.news.push('The High Roller is waiting at the head table.'); }
    } else { res.news.push(`${ctx.opp.name} is dethroned. The stairs are open.`); }
  } else {
    run.purse = bounty;
    lines.push(['Chips in your position', -ctx.committed], ['Wager', -ctx.wager]);
    if (bounty) lines.push(['Bounty chips cashed in', bounty]);
    const lost = rng.shuffle(run.dice).slice(0, Math.min(2, Math.max(0, run.dice.length - 1)));
    run.dice = run.dice.filter((d) => !lost.includes(d)); if (lost.length) lines.push([`Dice taken: ${lost.map((d) => d.type).join(', ')}`, 0]);
    if (run.fs) run.fs.lastWin = null;
    ledger(run, `Lost to ${ctx.opp.name}`, -start);
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
  if (choice === 'glean') { const t = res.prizes.tricks[picks[0]]; run.tricks.push(mkTrick(run, t.id, t.q, t.up)); }
  else for (const i of picks.slice(0, choice === 'die' ? 1 : 2)) run.dice.push(mkDie(run, res.prizes.dice[i].type));
  // settle() left the pre-bout purse in place apart from bet payouts; replace the staked part with the result
  run.purse = total + (bets - ctx.committed - ctx.wager);
  run.stats.won += Math.max(0, run.purse - start); ledger(run, `Beat ${ctx.opp.name}`, run.purse - start);
  return run.purse;
}
export const brokeHint = (run) => (run.purse < D.FLOORS[run.floor].cut ? 'A smart Roller knows when to cut their losses. The exit is through the Gift Shop.' : '');

// ---------- suite, gift shop, ascent ----------
export function suiteOffer(run) {
  const rng = run.rng, f = run.floor, pool = D.TRICK_IDS.filter((id) => !D.TRICKS[id].cls || D.TRICKS[id].cls === run.cls);
  return [mkTrick(run, rng.pick(pool), clamp(f, 1, 4), 0), mkTrick(run, rng.pick(pool), clamp(f, 1, 4), 1)];
}
export function goToBed(run, penthouse) { run.rest = penthouse ? { bouts: 2, amt: 2 } : { bouts: 1, amt: 1 }; }
export function nextAfterBoss(run) { return run.floor >= 4 ? 'penthouse' : run.suiteKey ? 'suite' : 'floor'; }

export function netWorth(run) { return run.purse + sum(run.dice, (d) => D.DICE[d.type].sell) + sum(run.tricks, (t) => trickValue(run, t)); }
export function buildAscent(run, meta) {
  const worths = [1100, 1300, 1500, 1800, 2200], nominal = [1e6, 1e7, 1e9, 1e11, 1e12];
  const ladder = D.ASCENT_NAMES.map((name, i) => ({ name, networth: nominal[i], legend: true,
    opp: genOpponent(run, 4, worths[i], { boss: i >= 3, name, title: ['Millionaire', 'Millionaire', 'Billionaire', 'Billionaire', 'Trillionaire'][i], q: 4, up: Math.floor(i / 2), maxDenom: maxDenom(D.ASCENT_FLOOR) }) }));
  for (const bld of meta.ladder || []) {
    const opp = genOpponent(run, 4, clamp(bld.worth, 600, 2000), { cls: bld.cls, name: bld.name, title: 'Remnant Roller', q: 4, maxDenom: maxDenom(D.ASCENT_FLOOR) });
    opp.tricks = bld.tricks.map((t) => mkTrick(run, t.id, t.q, t.up)); opp.dice = bld.dice.map((d) => ({ ...mkDie(run, d.type), up: d.up || [], faces: d.faces }));
    ladder.push({ name: bld.name, networth: bld.networth, legend: false, opp });
  }
  ladder.sort((a, b) => a.networth - b.networth);
  const step = clamp(ladder.filter((l) => l.networth <= netWorth(run)).length, 0, Math.max(0, ladder.length - 3));
  run.ascent = { ladder, step, start: step }; run.phase = 'ascent'; run.floor = 5; run.fs = null; run.cards = []; run.jacket = 'standard';
  return run.ascent;
}
export const jacketFits = (cls, id) => !D.JACKETS[id].cls || D.JACKETS[id].cls === cls;
export const jacketAvailable = (run, id) => D.JACKETS[id].level <= Math.max(0, run.floor - 1);
export function buyJacket(run, meta, id) {
  const J = D.JACKETS[id]; if (meta.jackets.includes(id) || !jacketAvailable(run, id)) return false;
  let need = J.price; const fromAtm = meta.debit ? Math.min(meta.atm, Math.max(0, need - run.purse)) : 0;
  if (run.purse + fromAtm < need) return false;
  meta.atm -= fromAtm; run.purse -= need - fromAtm; meta.jackets.push(id); ledger(run, `Gift Shop: ${J.name} jacket`, -(need - fromAtm)); saveMeta(meta); return true;
}
export function deposit(run, meta) { if (!meta.debit && !hasCard(run, 'debit')) return 0; meta.debit = true; const n = run.purse; meta.atm += n; run.purse = 0; if (n) ledger(run, 'ATM deposit', -n); saveMeta(meta); return n; }
export const walletAvailable = (run, meta, id) => { const Wl = D.WALLETS[id]; return Wl.level <= Math.max(0, run.floor - 1) && (!Wl.crown || meta.crowns > 0); };
export function buyWallet(run, meta, id) {
  const Wl = D.WALLETS[id]; if (meta.wallets.includes(id) || !walletAvailable(run, meta, id)) return false;
  const fromAtm = meta.debit ? Math.min(meta.atm, Math.max(0, Wl.price - run.purse)) : 0;
  if (run.purse + fromAtm < Wl.price) return false;
  meta.atm -= fromAtm; run.purse -= Wl.price - fromAtm; meta.wallets.push(id); ledger(run, `Gift Shop: ${Wl.name} wallet`, -(Wl.price - fromAtm)); saveMeta(meta); return true;
}
// In the alley you are robbed. Two of your best dice decide whether you hold on to your wallet and its cards.
export function alleyRoll(run) {
  const dice = run.dice.slice().sort((a, b) => D.DICE[b.type].faces - D.DICE[a.type].faces).slice(0, 2).map((d) => ({ type: d.type, up: d.up, faces: d.faces, value: rollDie(run.rng, boutCopy(d)) }));
  const total = dice.reduce((n, d) => n + d.value, 0), need = walletOf(run).keep, cards = walletCards(run);
  return { dice, total, need, kept: total >= need && cards.length > 0, cards };
}
// leaving through the alley ends the run
export function endRun(run, meta, name = 'You', kept = []) {
  meta.kept = kept;
  if (hasCard(run, 'debit')) meta.debit = true;
  meta.runs++; meta.best = Math.max(meta.best, run.floor);
  const reached = run.phase === 'paradise' || run.phase === 'fallen' || run.phase === 'ascent';
  if (run.phase === 'paradise') meta.crowns++;
  if (reached) {
    meta.ladder.push({ name: `${name} #${meta.runs}`, cls: run.cls, networth: netWorth(run), worth: Math.min(2000, Math.max(600, run.purse)), tricks: run.tricks.map(({ id, q, up }) => ({ id, q, up })), dice: run.dice.map(({ type, up, faces }) => ({ type, up, faces })) });
    if (meta.ladder.length > 12) meta.ladder.shift();
  }
  saveMeta(meta); clearRun();
  return { floor: run.floor, phase: run.phase, stats: run.stats, ledger: run.ledger, networth: netWorth(run) };
}

// a dry run of the deployment, for the position planner
export function previewPosition(run, counts, extra = {}) {
  const dummy = { name: '', cls: run.cls, tip: { trickery: 1, ingenuity: 1, proficiency: 1 }, c: { charisma: 0, cunning: 0, conviction: 0 }, dims: { cols: 5, stackMax: 1, meterRows: 1, barRows: 1 }, deploy: 'start', tricks: [], dice: [], plan: { chips: [], spacing: 'row', stacking: 'maxed' } };
  return createBout({ seed: 7, a: playerSpec(run, counts, { position: extra.position, resist: extra.resist }), b: dummy }).sides[0];
}
