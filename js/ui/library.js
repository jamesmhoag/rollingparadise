// The Library: every chip, trick, die, card, drink, wallet, jacket and felt in the game, with its numbers,
// how it looks on the table, and its upgrades. Opens from the title screen, the floor, the commitment screen
// and the bout. During a run, what you own is marked.
import { h, openPanel, closePanel, btn } from './core.js';
import { app } from './app.js';
import { upgrade as upgradeFaces, suggestFace, dieName } from '../dice.js';
import { chipEl, chipTip, dieEl, dieTip, faceStrip, trickTip, trickWords, trickLook, cardEl, cardTip, passEl, walletEl, jacketEl, jacketTip, drinkEl, feltEl } from './parts.js';
import * as D from '../data.js';
import { CHIP_LIST } from '../chiplist.js';
import { TRAITS, traitsOf, traitsHtml, flyerTraits } from '../traits.js';
import { multOf, traitOf } from '../bout.js';
import { cents } from '../util.js';
import { t as tx } from '../text.js';

const TABS = [['chips', 'Chips'], ['list', tx('library.chip-list')], ['traits', 'Traits'], ['tricks', 'Tricks'], ['dice', 'Dice'], ['cards', 'Cards'], ['drinks', 'Drinks'], ['wallets', 'Wallets'], ['jackets', 'Jackets'], ['felts', 'Felts']];
let tab = 'chips';

const sec = (title, sub) => h('div', { class: 'lib-sec' }, h('h3', { text: title }), sub ? h('p', { class: 'sub', html: sub }) : null);
// one entry: the piece as it looks, then its data
function entry(vis, name, lines, o = {}) {
  return h('div', { class: `lib-e ${o.own ? 'own' : ''} ${o.wide ? 'wide' : ''}`, tip: o.tip },
    h('div', { class: 'vis' }, vis), h('div', { class: 'txt' }, h('b', { html: name }), ...lines.filter(Boolean).map((l) => h('p', { html: l })), o.own ? h('span', { class: 'own-t', text: typeof o.own === 'string' ? o.own : 'Owned' }) : null));
}
const dim = (t) => `<span class="dim">${t}</span>`;
const fx = (m) => '×' + (m % 1 ? m.toFixed(2).replace(/0$/, '') : m);
const tagOf = (t) => h('span', { class: `tag-t trick ${trickLook(t)}`, style: { '--tc': D.TYPES[D.TRICKS[t.id].type].color } }, D.TRICKS[t.id].name, h('span', { class: 'q', html: trickWords(t) }));
const tipped = (el, fn) => { el._tip = fn; el.classList.add('has-tip'); return el; };
const noUpgrades = (what) => sec('Upgrades', tx('library.have-no-upgrades-yet', { what }));

// what the current run (or the saved profile) has
function ownership(noRun) {
  const run = noRun ? null : app.run, meta = app.meta || { jackets: [], wallets: [] };
  return {
    run, meta,
    trick: (id) => (run ? run.tricks.filter((t) => t.id === id).length : 0),
    die: (type) => (run ? run.dice.filter((d) => d.type === type).length : 0),
    card: (id) => !!run && run.cards.includes(id),
    shop: (id) => (run ? run.chips[id] || 0 : 0),
    jacket: (id) => (meta.jackets || []).includes(id), jacketOn: (id) => !!run && run.jacket === id,
    wallet: (id) => (meta.wallets || []).includes(id), walletOn: (id) => !!run && run.wallet === id,
    drink: (id) => !!run && run.drink?.id === id,
  };
}

// which tricks leave each hazard
const leftBy = (el) => Object.values(D.TRICKS).filter((t) => t.element === el).map((t) => t.name);
const BOUT_CHIPS = {
  opp: tx('library.earned-for-each-roll'),
  block: tx('library.every-insurance-trick-s'),
  counter: tx('library.block-s-bonus-every'),
  debt: tx('library.every-expense-fees-go'),
  flower: tx('library.a-seed-chip-on'),
  petal: tx('library.bloomed-by-a-flower'),
  clay: tx('library.bought-at-the-chip'),
  brick: tx('library.fire-on-a-clay'),
  tree: tx('library.bought-at-the-chip-2'),
  wood: tx('library.a-felled-tree'),
  dynamite: tx('library.fuse-technician-lights-a'),
  hard: tx('library.brace-insurance-technician'), sticky: tx('library.gum-up-correction-rascal'), hive: tx('library.the-familiar-tilt-one'), little: tx('library.bought-at-the-chip'),
  egg: tx('library.a-dragon-lays-them'), hat: tx('library.conjure-correction-technician-and'), doom: tx('library.foretell-correction-on-an'), volcano: tx('library.the-volcano-calamity'),
};

function chipsTab(own) {
  const out = [sec(tx('library.royal-paradise-chips'), tx('library.the-basic-value-chips'))];
  for (const d of D.DENOMS) { const ch = { kind: 'std', value: d.value };
    out.push(entry(tipped(chipEl(ch), () => chipTip(ch)), D.denomName(d.value) + (d.name ? ` · ${cents(d.value)}` : ''), [d.floor >= D.ASCENT_FLOOR ? tx('floor.dealt-in-the-paradise') : tx('floor.dealt-from-floor', { floor: d.floor }), d.value > 1 ? tx('library.bid-it-and-the', { value: d.value - 1, v: d.value > 2 ? 's' : '' }) : tx('library.bids-without-lingering'), dim(d.value > 1 ? tx('library.a-fee-under-leaves', { value: d.value }) : tx('library.any-fee-of-1'))])); }
  out.push(sec(tx('library.chip-upgrades'), tx('library.changes-made-to-a')));
  const gold = { kind: 'std', value: 5, gold: true };
  out.push(entry([chipEl({ kind: 'std', value: 5 }), h('span', { class: 'dim', text: '→' }), tipped(chipEl(gold), () => chipTip(gold))], 'Gold', [tx('library.made-by-gild-and'), tx('library.cannot-be-bid-pays')]));
  const frz = { kind: 'std', value: 7, frozen: true }, fea = { kind: 'std', value: 2, feather: 2 };
  out.push(entry([chipEl({ kind: 'std', value: 5 }), chipEl({ kind: 'std', value: 2 }), h('span', { class: 'dim', text: '→' }), tipped(chipEl(frz), () => chipTip(frz))], 'Frozen', [tx('library.made-by-chill-chips'), D.CHIPS.frozen.text]));
  out.push(entry([chipEl({ kind: 'std', value: 2 }), h('span', { class: 'dim', text: '→' }), tipped(chipEl(fea), () => chipTip(fea))], 'Feather', [tx('library.made-by-float-for'), D.CHIPS.feather.text]));
  out.push(sec(tx('library.shop-chips'), tx('library.sold-at-the-chip', { join: D.CHIP_TIERS.slice(1).map((t) => `<span class="tier" style="--tc:${t.color}">${t.name}</span> ${cents(t.price)}${t.floor > 1 ? ` from floor ${t.floor}` : ''}`).join(' ') })));
  for (const id of D.SHOP_IDS().sort((a, b) => D.SHOP_CHIPS[a].tier - D.SHOP_CHIPS[b].tier)) {
    const X = D.SHOP_CHIPS[id], T = D.CHIP_TIERS[X.tier], ch = { kind: 'std', value: 1, resist: id }, vars = Object.entries(X.vars || {});
    out.push(entry(tipped(chipEl(ch), () => chipTip(ch)), `${X.name} <span class="tier" style="--tc:${T.color}">${T.name}</span>`,
      [D.shopText(id), tx('library.from-floor', { shopPrice: cents(D.shopPrice(id)), shopFloor: D.shopFloor(id), v: X.place === 'top' ? tx('library.goes-on-top') : '' }), vars.length ? dim(tx('library.tuning', { join: vars.map(([k, v]) => `${k} ${v}`).join(', ') })) : null, X.list ? dim(tx('library.from-the-chip-list', { list: X.list })) : null], { own: own.shop(id) ? tx('library.own', { shop: own.shop(id) }) : null }));
  }
  out.push(sec(tx('library.effect-chips-made-by'), tx('library.investments-insurances-and-corrections')));
  for (const [id, X] of Object.entries(D.SHOP_CHIPS)) { const mk = D.makerOf(id); if (!mk) continue; const T = D.TRICKS[mk], ch = { kind: 'fx', value: 0, resist: id, shop: id, life: T.make.life[0], maker: mk };
    out.push(entry(tipped(chipEl(ch), () => chipTip(ch)), X.name, [D.shopText(id), tx('library.made-by-on-its', { name: T.name, name2: D.TYPES[T.type].name, v: T.cls ? ', ' + D.CLASSES[T.cls].name : '', v2: T.make.n[1] < 99 ? tx('library.1-per-rolled', { n: T.make.n[0], n2: T.make.n[1] }) : 'one', v3: T.make.life[0] >= 99 ? 'the bout' : tx('library.1-per-rolled-2', { life: T.make.life[0], life2: T.make.life[1] }) })])); }
  out.push(sec(tx('library.chips-made-at-the'), tx('library.they-appear-during-a')));
  for (const id of ['honey', 'steal']) { const X = D.SHOP_CHIPS[id], ch = id === 'honey' ? { kind: 'food', value: 0, shop: id, resist: id } : { kind: 'fx', value: 0, shop: id, resist: id, life: 99, amt: 2 };
    out.push(entry(tipped(chipEl(ch), () => chipTip(ch)), X.name, [D.shopText(id), dim(tx('library.made-by', { madeBy: D.madeBy(id), v: id === 'honey' ? tx('library.from-a-hive') : '' }))])); }
  for (const k of ['opp', 'block', 'counter', 'debt', 'flower', 'petal', 'clay', 'brick', 'tree', 'wood', 'dynamite', 'hard', 'sticky', 'hive', 'little', 'egg', 'hat', 'doom', 'volcano']) { const ch = { kind: k, value: k === 'opp' ? 1 : k === 'debt' ? 3 : k === 'sticky' ? 3 : 0, ...(k === 'hard' ? { life: 3 } : {}), ...(D.INSTANCE_SHIELDS.includes(k) ? { hits: k === 'egg' ? 5 : 1 } : {}) };
    out.push(entry(tipped(chipEl(ch), () => chipTip(ch)), D.CHIPS[k].name, [D.CHIPS[k].text, dim(tx('library.made-by-2', { BOUTCHIPS: BOUT_CHIPS[k] }))])); }
  for (const ch of [{ kind: 'std', value: 72, gold: true, treasure: true }, { kind: 'std', value: 1, gold: true, cursed: true }]) out.push(entry(tipped(chipEl(ch), () => chipTip(ch)), ch.cursed ? tx('library.cursed-chip') : tx('library.treasure-chip'), [ch.cursed ? D.CHIPS.cursed.text : D.CHIPS.treasure.text, dim(tx('library.made-by-a-sunk'))]));
  out.push(sec('Creatures', tx('library.chips-over-the-table', { BOUNTYPERHIT: D.BOUNTY_PER_HIT })));
  for (const [k, C] of Object.entries(D.CREATURES)) out.push(entry(h('span', { class: 'list-icon', text: C.glyph }), C.name, [C.text, traitsHtml(flyerTraits(k))]));
  out.push(sec(tx('library.orbital-chips'), tx('library.weather-and-vehicles-in')));
  for (const [k, O] of Object.entries(D.ORBITALS)) out.push(entry(h('span', { class: 'list-icon', text: O.glyph }), O.name, [O.text, dim(tx('library.comes-with', { v: Object.values(D.FELTS).filter((F) => F.weather?.includes(k)).map((F) => F.name + ' tables').join(', ') || (k === 'sun' ? 'the Sun chip' : 'a Calamity') })), traitsHtml(flyerTraits(k, true))]));
  out.push(sec(tx('library.hazard-chips'), tx('library.left-by-expenses-with')));
  for (const k of ['burn', 'acid', 'shock', 'corrupt', 'poison', 'boom', 'frost', 'lava']) { const ch = { kind: k, value: 0 }, by = leftBy(k), cure = Object.keys(D.SHOP_CHIPS).find((x) => D.resistsOf(x).includes(k));
    out.push(entry(tipped(chipEl(ch), () => chipTip(ch)), D.CHIPS[k].name, [D.CHIPS[k].text, dim(tx('library.left-by', { v: by.join(', ') || 'creatures and calamities', v2: k === 'burn' ? tx('library.the-dragon-inferno-and') : '', v3: cure ? tx('library.stopped-by-the', { name: D.SHOP_CHIPS[cure].name }) : '' }))])); }
  return out;
}

function tricksTab(own) {
  const out = [];
  for (const [type, T] of Object.entries(D.TYPES)) {
    out.push(sec(`${T.name}s`, tx('library.trait-when-bid-with', { text: T.text, traitText: T.traitText(1) })));
    for (const [id, def] of Object.entries(D.TRICKS)) { if (def.type !== type) continue;
      const t = { id, q: 1 }, n = own.trick(id);
      out.push(entry(tipped(tagOf(t), () => trickTip(t, own.run?.cls)), def.name,
        [`${def.cls ? D.CLASSES[def.cls].name : tx('maker.anyClass')} · ${def.count}${def.die} · ${def.approach === 'none' ? 'no target' : `${def.approach}, ${D.DIST[def.dist].name}`}`, tx('library.roll', { text: def.roll.text }), tx('library.bonus', { condText: D.condText(def.bonus.cond), text: def.bonus.text }), def.early ? dim(tx('library.swift-plays-with-the', { name: D.TYPES[def.early].name })) : null, def.arrange ? dim(tx('library.arrangement-moves-chips-in', { v: def.side === 'opp' ? 'your opponent\'s' : 'your', replace: def.arrange.replace('opp-', '') })) : null], { own: n ? (n > 1 ? tx('library.in-your-book', { n }) : tx('library.in-your-book-2')) : null }));
    }
  }
  out.push(sec('Quality', tx('library.quality-common-to-royal')));
  for (const q of [1, 2, 3, 4]) { const t = { id: 'charge', q };
    out.push(entry(tipped(tagOf(t), () => trickTip(t, own.run?.cls)), D.QNAME[q], [tx('library.roll-total-trait', { fx: fx(multOf(t)), traitOf: traitOf(t) }), dim(tx('library.investments', { fx: fx(multOf({ ...t, id: 'stir' })), qdieText: D.qdieText(q) }))])); }
  out.push(sec('Rarity', tx('library.how-a-trick-is')));
  const prints = [{ rar: 'basic' }, { rar: 'foil', foil: 1 }, { rar: 'foil', foil: 2 }, { rar: 'foil', foil: 3 }, { rar: 'misprint', mis: { die: 'd8' } }, { rar: 'misprint', mis: { trait: 2 } }, { rar: 'reprint' }].map((x) => ({ id: 'charge', q: 1, ...x }));
  for (const t of prints) out.push(entry(tipped(tagOf(t), () => trickTip(t, own.run?.cls)), t.foil ? D.FOIL[t.foil].name : D.RARITY[t.rar].name,
    [t.foil ? tx('library.roll-total-on-common', { fx: fx(multOf(t)), mult: D.FOIL[t.foil].mult }) : t.rar === 'misprint' ? tx('library.this-one', { text: D.RARITY.misprint.text, misText: D.misText(t) }) : t.rar === 'reprint' ? `${D.RARITY.reprint.text}` : D.RARITY.basic.text,
      t.rar === 'reprint' ? dim(Object.entries(D.REPRINT).map(([k, v]) => `${D.TYPES[k].name}: ${v.replace('Older rule: ', '')}`).join(' ')) : null].filter(Boolean)));
  out.push(sec('Condition', tx('library.condition-sets-only-what')));
  for (const [k, C] of Object.entries(D.CONDITIONS)) out.push(entry(h('b', { text: C.name }), C.sell ? `Sells at ${Math.round(C.sell * 100)}%` : tx('library.trash-only'),
    [k === 'gem' ? tx('library.only-out-of-foil') : k === 'mint' ? tx('library.every-trick-in-a') : k === 'excellent' ? tx('library.bought-off-the-trader') : k === 'good' ? tx('library.your-first-book-starts') : tx('library.wear-below-50')]));
  out.push(sec(tx('build.table.PACKS'), tx('library.sold-at-the-trick', { packPrice: cents(D.TUNING.shops.packPrice), join: D.PACKS.slice(1).map((P) => tx('library.floor', { name: P.name, floor: P.floor })).join(' · ') })));
  return out;
}

function diceTab(own) {
  const out = [sec('Dice', tx('library.each-die-is-drawn', { castPerFace: D.MELT.castPerFace, meltPerFace: D.MELT.meltPerFace }))];
  for (const [type, X] of Object.entries(D.DICE)) { const d = { type, up: [] }, n = own.die(type);
    out.push(entry(tipped(dieEl(d), () => dieTip(d)), type, [tx('library.rolls-1', { faces: X.faces }), D.COMPLEXITY.includes(type) ? tx('library.cast-volume-from-floor', { faces: X.faces * D.MELT.castPerFace, chips: cents(X.forge.chips), floor: X.forge.floor }) : tx('library.not-cast-by-the'), dim(tx('library.melts-to-sells-for', { faces: X.faces * D.MELT.meltPerFace, sell: cents(X.sell) }))], { own: n ? tx('library.in-your-pouch', { n }) : null })); }
  out.push(sec('Materials', Object.values(D.MATERIALS).map((M) => `<b>${M.name}</b>: ${M.text}`).join('<br>')));
  out.push(sec('Casts', tx('library.what-melts-together-decides')));
  for (const C of Object.values(D.CASTS)) out.push(entry(h('span', { class: 'dim', text: C.mats.map((m) => D.MATERIALS[m].name).join(' + ') }), C.name, [C.text, dim(tx('library.rolls', { dice: C.dice }))]));
  out.push(sec(tx('build.table.DIAMOND'), D.DIAMOND.map((P) => `<b>${P.name}</b> (${P.when}): ${P.text}`).join('<br>')));
  out.push(sec('Dyes', tx('library.up-to-per-cast', { maxDyes: D.MELT.maxDyes })));
  for (const Y of Object.values(D.DYES)) out.push(entry(h('span', { class: 'dim', text: Y.from ? Y.from.map((k) => D.DYES[k].name.replace(/ dye$/, '')).join(' + ') : cents(Y.price) }), `<span style="color:${Y.color}">●</span> ${Y.name}`, [Y.text, dim(tx('library.rolls-from-your-pouch', { dice: Y.dice, v: Y.from ? tx('library.made-by-putting-both') : '' }))]));
  out.push(sec(tx('build.table.BONE'), tx('library.sold-at-the-dice')));
  const d6 = { type: 'd6', up: [] };
  for (const [u, U] of Object.entries(D.DIE_UPGRADES)) {
    const t = U.target ? suggestFace(d6, u) : 0, d = upgradeFaces({ type: 'd6', up: [] }, u, t, { int: () => 0 });
    out.push(entry([dieEl(d6), h('span', { class: 'dim', text: '→' }), tipped(dieEl(d), () => dieTip(d))], `<span style="color:${U.color}">${U.mark}</span> ${Object.values(D.BONE).find((B) => B.up === u)?.name || U.name}`,
      [D.upgradeText(u), `<span class="faces">${faceStrip(d6)}</span> → <span class="faces">${faceStrip(d)}</span>${U.target ? dim(` target face ${t + 1}`) : U.roll ? dim(tx('library.faces-unchanged-works-when')) : ''}`])); }
  const held = (own.run?.dice || []).filter((d) => d.up.length || d.cast);
  if (held.length) { out.push(sec(tx('library.your-cast-and-carved'))); for (const d of held) out.push(entry(tipped(dieEl(d), () => dieTip(d)), dieName(d), [d.cast ? `${D.CASTS[d.cast].name}${(d.dyes || []).length ? ', ' + d.dyes.map((k) => D.DYES[k].name).join(', ') : ''}` : d.up.map((u) => D.DIE_UPGRADES[u].name).join(', '), `<span class="faces">${faceStrip(d)}</span>`], { own: true })); }
  return out;
}

// the Gift Shop stocks gear of level n once you leave from floor n + 1 or higher
const shopFrom = (level) => (!level ? '' : level >= 4 ? tx('library.leaving-from-the-ascent') : tx('library.leaving-from-floor-or', { level: level + 1 }));
const cardKind = (id) => (D.LANYARD_CARDS.includes(id) ? tx('library.lanyard-does-not-take') : D.STARTER_CARDS.includes(id) ? tx('library.starter-two-are-dealt') : D.FIND_CARDS.includes(id) ? tx('library.found-in-the-dodgy') : tx('library.takes-a-wallet-slot'));
function cardsTab(own) {
  const out = [sec('Cards', tx('library.benefit-cards-ride-in'))];
  for (const id of Object.keys(D.CARDS)) out.push(entry(tipped(cardEl(id), () => cardTip(id)), D.CARDS[id].name, [D.CARDS[id].text, dim(cardKind(id))], { own: own.card(id) ? tx('library.in-your-wallet') : null }));
  out.push(sec('Passes', tx('library.passes-are-not-cards')));
  for (let f = 1; f < D.PASSES.length; f++) out.push(entry(passEl(f), D.PASSES[f].name, [D.PASSES[f].text], { own: own.run?.pass === f ? tx('library.in-your-wallet') : null }));
  out.push(noUpgrades('Cards'));
  return out;
}

const DRINK_STAT = { random: tx('library.one-random-attribute-chosen'), tip: tx('library.three-random-attributes-chosen'), all: 'every attribute' };
function drinksTab(own) {
  const out = [sec('Drinks', tx('library.sip-one-before-a'))];
  for (const d of D.DRINKS) {
    const stat = D.STATS[d.stat] ? D.STATS[d.stat].name : DRINK_STAT[d.stat];
    out.push(entry([drinkEl(d), d.sips > 1 ? drinkEl(d, Math.ceil(d.sips / 2), d.sips) : null, drinkEl(d, 0, d.sips)], `${d.name} <span class="dim">${d.verb}</span>`,
      [tx('library.per-sip', { amt: d.amt, stat, sips: d.sips }), dim(tx('library.a-fifth-of-that', { cost: cents(d.cost) }))], { own: own.drink(d.id) ? tx('library.in-your-hand-left', { sips: own.run.drink.sips }) : null }));
  }
  out.push(noUpgrades('Drinks'));
  return out;
}

function walletsTab(own) {
  const out = [sec('Wallets', tx('library.the-slots-are-drawn'))];
  for (const [id, Wl] of Object.entries(D.WALLETS)) out.push(entry(walletEl(id), Wl.name,
    [tx('library.keep-on', { slots: Wl.slots, keep: Wl.keep }), Wl.price ? tx('library.in-the-gift-shop', { price: cents(Wl.price), shopFrom: shopFrom(Wl.level), v: Wl.crown ? tx('library.once-you-hold-a') : '' }) : tx('library.free-from-the-start')],
    { own: own.walletOn(id) ? 'Carrying' : own.wallet(id) ? 'Unlocked' : null }));
  out.push(noUpgrades('Wallets'));
  return out;
}

function jacketsTab(own) {
  const out = [sec('Jackets', tx('library.a-jacket-shifts-your'))];
  for (const [id, J] of Object.entries(D.JACKETS)) out.push(entry(tipped(jacketEl(id), () => jacketTip(id)), `${J.name} <span class="dim">${J.effect}</span>`,
    [Object.entries(J.mods).map(([k, n]) => `${n > 0 ? '+' : ''}${n} ${D.STATS[k].name}`).join(', ') || tx('library.no-modifiers'), J.price ? tx('library.in-the-gift-shop-2', { price: cents(J.price), shopFrom: shopFrom(J.level) }) : tx('library.free-from-the-start')],
    { own: own.jacketOn(id) ? 'Wearing' : own.jacket(id) ? 'Unlocked' : null }));
  out.push(noUpgrades('Jackets'));
  return out;
}

function feltsTab(own) {
  const out = [sec('Felts', tx('library.each-table-on-a'))];
  const here = new Set(own.run?.fs ? own.run.fs.tables.map((t) => D.feltId(t.felt)) : []);
  for (const [id, F] of Object.entries(D.FELTS)) out.push(entry(feltEl(id), F.name, [F.line, dim(F.pool === false ? tx('library.not-dealt-to-random') : tx('library.dealt-to-random-tables')), dim(tx('library.board-effect-none-yet'))], { own: here.has(id) ? tx('library.on-this-floor') : null }));
  out.push(noUpgrades('Felts'));
  return out;
}

// ---------- the workbook's chip list, every row ----------
const STATUS = { built: ['Built', 'var(--good)'], partial: [tx('library.partly-built'), 'var(--amber)'], needs: [tx('library.needs-detail'), 'var(--bad)'] };
const LIST_ICON = { 'UFO Chip': '🛸', 'Mothership Chip': '👾', 'Fairy Chip': '🧚', 'Unicorn Chip': '🦄', 'Dragon Chip': '🐉', 'Mole Chip': '🐭', 'Black Hole Chip': '🕳', 'Volcano Chip': '🌋', 'Tornado Chip': '🌪', 'Hole Chip': '◯', 'Hardened p¢ Chip': '⛊', 'Cloud Chip': '☁', 'Blizzard Chip': '❄', 'Ghost Chip': '👻', 'Ghost Ship Chip': '🏴‍☠️', 'Puddle Chip': '💧', 'Bumble Bee Chip': '🐝', 'B 52¢ Chip': '✈', 'Dragon Roost Chip': '🪺', 'Worm Hole Chip': '🌀', 'Heavy Chip': '?', 'Metal Chip': '?' };
let listFilter = 'all';
function listTab(own, rerender) {
  const n = (st) => CHIP_LIST.filter((x) => st === 'all' || x.status === st).length;
  const filters = h('div', { class: 'lib-tabs lib-sec' }, [['all', 'All'], ['built', 'Built'], ['partial', tx('library.partly-built')], ['needs', tx('library.needs-detail')]].map(([k, label]) => {
    const b = btn(`${label} ${n(k)}`, () => { listFilter = k; rerender(); }, null, 'small'); if (k === listFilter) b.classList.add('on'); return b; }));
  const out = [sec(tx('library.the-chip-list'), tx('library.all-rows-of-the', { CHIPLISTN: CHIP_LIST.length, n: n('built'), n2: n('partial'), n3: n('needs') })), filters];
  for (const x of CHIP_LIST) {
    if (listFilter !== 'all' && x.status !== listFilter) continue;
    const [label, color] = STATUS[x.status];
    const vis = x.show ? tipped(chipEl(x.show), () => chipTip(x.show)) : LIST_ICON[x.name] ? h('span', { class: 'list-icon', text: LIST_ICON[x.name] }) : h('span', { class: 'chip static k-missing' }, h('i', { text: '?' }));
    const meta = [x.type, x.permanence, x.placement, x.source].filter(Boolean).join(' · ');
    const el = entry(vis, `${x.name} <span class="tier" style="--tc:${color}">${label}</span>`, [x.text ? tx('library.list', { text: x.text }) : tx('library.list-no-description'), meta ? dim(meta) : null,
      `<span style="color:${color}">${x.status === 'needs' ? '' : tx('library.in-the-game')}${x.note}</span>`, x.show ? traitsHtml(traitsOf(x.show)) : x.list ? traitsHtml(Object.entries(x.list).map(([k, v]) => ({ k, v, ...TRAITS[k] }))) : null], { own: x.show?.resist && own.shop(x.show.resist) ? tx('library.own', { shop: own.shop(x.show.resist) }) : null });
    el.classList.add(`st-${x.status}`); out.push(el);
  }
  return out;
}
// every trait, where it comes from, and which chips carry it
function traitsTab() {
  const samples = [...CHIP_LIST.filter((x) => x.show).map((x) => ({ name: x.name, ch: x.show })),
    ...['hard', 'sticky', 'hive', 'little', 'egg', 'hat', 'doom', 'volcano'].map((k) => ({ name: D.CHIPS[k].name, ch: { kind: k, value: 0, hits: 1, life: 2 } }))];
  const has = new Map(Object.keys(TRAITS).map((k) => [k, new Set()]));
  for (const x of samples) for (const t of traitsOf(x.ch)) has.get(t.k)?.add(x.name);
  for (const x of CHIP_LIST) for (const k of Object.keys(x.list || {})) has.get(k)?.add(x.name);
  const out = [sec(tx('library.chip-traits'), tx('library.every-chip-s-information'))];
  for (const [k, T] of Object.entries(TRAITS)) { const names = [...has.get(k)];
    out.push(entry(h('span', { class: `trait ${T.derived ? 'der' : 'lst'}`, text: T.name }), `${T.name} <span class="dim">${T.derived ? 'derived' : 'list'}</span>`, [T.text, dim(tx('library.line', { nameN: names.length, v: names.length ? ': ' + names.slice(0, 14).join(', ') + (names.length > 14 ? '…' : '') : '' }))])); }
  return out;
}
const BUILD = { traits: traitsTab, list: listTab, chips: chipsTab, tricks: tricksTab, dice: diceTab, cards: cardsTab, drinks: drinksTab, wallets: walletsTab, jackets: jacketsTab, felts: feltsTab };

// o.title: opened from the title screen, so no run is in progress and only unlocked gear is marked
export function openLibrary(start, o = {}) {
  if (start) tab = start;
  const body = h('div', { class: 'lib-body' }), tabs = h('div', { class: 'lib-tabs' });
  const own = ownership(o.title);
  const tabBtns = TABS.map(([k, name]) => { const b = btn(name, () => { tab = k; render(); }, null, 'small'); b._k = k; return b; });
  tabs.append(...tabBtns);
  function render() { for (const b of tabBtns) b.classList.toggle('on', b._k === tab); body.replaceChildren(...BUILD[tab](own, render)); body.parentElement?.parentElement?.scrollTo?.({ top: 0 }); }
  render();
  openPanel(h('div', { class: 'lib' }, h('div', { class: 'row between' }, h('div', {}, h('h2', { text: 'Library' }),
    h('p', { class: 'sub', text: own.run ? tx('library.everything-in-the-game') : tx('library.everything-in-the-game-2') })), btn('Close', () => closePanel(), null, 'small')), tabs, body), { wide: true });
}
