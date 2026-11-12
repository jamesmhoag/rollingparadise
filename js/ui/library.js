// The Library: every chip, trick, die, card, drink, wallet, jacket and felt in the game, with its numbers,
// how it looks on the table, and its upgrades. Opens from the title screen, the floor, the commitment screen
// and the bout. During a run, what you own is marked.
import { h, openPanel, closePanel, btn } from './core.js';
import { app } from './app.js';
import { upgrade as upgradeFaces, suggestFace } from '../dice.js';
import { chipEl, chipTip, dieEl, dieTip, faceStrip, trickTip, pips, trickLook, upInfo, cardEl, cardTip, walletEl, jacketEl, jacketTip, drinkEl, feltEl } from './parts.js';
import * as D from '../data.js';
import { CHIP_LIST } from '../chiplist.js';
import { TRAITS, traitsOf, traitsHtml, flyerTraits } from '../traits.js';
import { multOf, traitOf } from '../bout.js';
import { cents } from '../util.js';

const TABS = [['chips', 'Chips'], ['list', 'Chip list'], ['traits', 'Traits'], ['tricks', 'Tricks'], ['dice', 'Dice'], ['cards', 'Cards'], ['drinks', 'Drinks'], ['wallets', 'Wallets'], ['jackets', 'Jackets'], ['felts', 'Felts']];
let tab = 'chips';

const sec = (title, sub) => h('div', { class: 'lib-sec' }, h('h3', { text: title }), sub ? h('p', { class: 'sub', html: sub }) : null);
// one entry: the piece as it looks, then its data
function entry(vis, name, lines, o = {}) {
  return h('div', { class: `lib-e ${o.own ? 'own' : ''} ${o.wide ? 'wide' : ''}`, tip: o.tip },
    h('div', { class: 'vis' }, vis), h('div', { class: 'txt' }, h('b', { html: name }), ...lines.filter(Boolean).map((l) => h('p', { html: l })), o.own ? h('span', { class: 'own-t', text: typeof o.own === 'string' ? o.own : 'Owned' }) : null));
}
const dim = (t) => `<span class="dim">${t}</span>`;
const fx = (m) => '×' + (m % 1 ? m.toFixed(2).replace(/0$/, '') : m);
const tagOf = (t) => h('span', { class: `tag-t trick ${trickLook(t)}`, style: { '--tc': D.TYPES[D.TRICKS[t.id].type].color } }, D.TRICKS[t.id].name, h('span', { class: 'q', html: pips(t) }));
const tipped = (el, fn) => { el._tip = fn; el.classList.add('has-tip'); return el; };
const noUpgrades = (what) => sec('Upgrades', `${what} have no upgrades yet. When they do, they will be drawn on the piece itself, the way dice and tricks are.`);

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
  opp: 'Earned for each roll you leave unused (Cunning). Fence turns Debt into them.',
  block: 'Every Insurance trick\'s Trait adds them; Block adds them by the roll; Settle and Fence bonuses add two; the Shield tilt starts you with a stack.',
  counter: 'Block\'s bonus (every die even) makes them instead of Block chips.',
  debt: 'Every Expense: fees go out as Debt first, then the House settles.',
  flower: 'A Seed chip on a stack of 2 or more sprouts into one when the bout starts.',
  petal: 'Bloomed by a Flower each turn.',
  clay: 'Bought at the Chip Exchange.',
  brick: 'Fire on a Clay chip bakes it.',
  tree: 'Bought at the Chip Exchange; planted on an empty space.',
  wood: 'A felled Tree.',
  dynamite: 'Fuse (Technician) lights a stack of it on an empty space near its target.',
  hard: 'Brace (Insurance, Technician).', sticky: 'Gum Up (Correction, Rascal), on an opponent\'s stack.', hive: 'The Familiar tilt, one play in three, on an empty space.', little: 'Bought at the Chip Exchange.',
  egg: 'A Dragon lays them on its Roost (the Spawner tilt). Edible.', hat: 'Conjure (Correction, Technician), and one in three Hazard tilts.', doom: 'Foretell (Correction), on an opponent\'s front stacks.', volcano: 'The Volcano Calamity.',
};

function chipsTab(own) {
  const out = [sec('Royal Paradise chips', 'The basic value chips. Your purse is changed into these when you set your position.')];
  for (const d of D.DENOMS) { const ch = { kind: 'std', value: d.value };
    out.push(entry(tipped(chipEl(ch), () => chipTip(ch)), D.denomName(d.value) + (d.name ? ` · ${cents(d.value)}` : ''), [d.floor >= D.ASCENT_FLOOR ? 'Dealt in the Paradise Ascent.' : `Dealt from floor ${d.floor}.`, d.value > 1 ? `Bid it and the trick lingers ${d.value - 1} turn${d.value > 2 ? 's' : ''}.` : 'Bids without lingering.', dim(d.value > 1 ? `A fee under ${d.value}¢ leaves Debt on it instead of paying it.` : 'Any fee of 1¢ or more pays it.')])); }
  out.push(sec('Chip upgrades', 'Changes made to a chip on the table, drawn on the chip.'));
  const gold = { kind: 'std', value: 5, gold: true };
  out.push(entry([chipEl({ kind: 'std', value: 5 }), h('span', { class: 'dim', text: '→' }), tipped(chipEl(gold), () => chipTip(gold))], 'Gold', ['Made by Gild (and sometimes a Fairy). Glows gold.', 'Cannot be bid. Pays double if it survives the bout.']));
  const frz = { kind: 'std', value: 7, frozen: true }, fea = { kind: 'std', value: 2, feather: 2 };
  out.push(entry([chipEl({ kind: 'std', value: 5 }), chipEl({ kind: 'std', value: 2 }), h('span', { class: 'dim', text: '→' }), tipped(chipEl(frz), () => chipTip(frz))], 'Frozen', ['Made by Chill: chips frozen into one, worth their sum.', D.CHIPS.frozen.text]));
  out.push(entry([chipEl({ kind: 'std', value: 2 }), h('span', { class: 'dim', text: '→' }), tipped(chipEl(fea), () => chipTip(fea))], 'Feather', ['Made by Float, for a few turns.', D.CHIPS.feather.text]));
  out.push(sec('Shop chips', `Sold at the Chip Exchange because no trick, tilt or table effect makes them. Priced by tier: ${D.CHIP_TIERS.slice(1).map((t) => `<span class="tier" style="--tc:${t.color}">${t.name}</span> ${cents(t.price)}${t.floor > 1 ? ` from floor ${t.floor}` : ''}`).join(' ')}. Each is worth 1¢, goes at the base of a stack, is not wagered, and comes back after a win if it survives.`));
  for (const id of D.SHOP_IDS().sort((a, b) => D.SHOP_CHIPS[a].tier - D.SHOP_CHIPS[b].tier)) {
    const X = D.SHOP_CHIPS[id], T = D.CHIP_TIERS[X.tier], ch = { kind: 'std', value: 1, resist: id }, vars = Object.entries(X.vars || {});
    out.push(entry(tipped(chipEl(ch), () => chipTip(ch)), `${X.name} <span class="tier" style="--tc:${T.color}">${T.name}</span>`,
      [D.shopText(id), `${cents(D.shopPrice(id))} · from floor ${D.shopFloor(id)}${X.place === 'top' ? ' · goes on top' : ''}`, vars.length ? dim(`Tuning: ${vars.map(([k, v]) => `${k} ${v}`).join(', ')}`) : null, X.list ? dim(`From the chip list: ${X.list}`) : null], { own: own.shop(id) ? `Own ${own.shop(id)}` : null }));
  }
  out.push(sec('Effect chips made by tricks', 'Investments, Insurances and Corrections that work over several turns put their effect on the table as a chip: the trick places it on a stack (or a Meter space) when it plays, and the chip does its work in that trick\'s phase each turn until it wears off. They take stack height, have no worth and cannot be bid; a fee that reaches one, or empties its stack, knocks it off. They are not sold and stay at the table.'));
  for (const [id, X] of Object.entries(D.SHOP_CHIPS)) { const mk = D.makerOf(id); if (!mk) continue; const T = D.TRICKS[mk], ch = { kind: 'fx', value: 0, resist: id, shop: id, life: T.make.life[0], maker: mk };
    out.push(entry(tipped(chipEl(ch), () => chipTip(ch)), X.name, [D.shopText(id), `Made by <b>${T.name}</b> (${D.TYPES[T.type].name}${T.cls ? ', ' + D.CLASSES[T.cls].name : ''}): ${T.make.n[1] < 99 ? `${T.make.n[0]}, +1 per ${T.make.n[1]} rolled` : 'one'} on its target, for ${T.make.life[0] >= 99 ? 'the bout' : `${T.make.life[0]} turn${T.make.life[0] > 1 ? 's' : ''}, +1 per ${T.make.life[1]} rolled`}.`])); }
  out.push(sec('Chips made at the table', 'They appear during a bout, from tricks, tilts, creatures and other chips, and are gone when it ends. None of them is sold.'));
  for (const id of ['honey']) { const X = D.SHOP_CHIPS[id], ch = { kind: 'food', value: 0, shop: id, resist: id };
    out.push(entry(tipped(chipEl(ch), () => chipTip(ch)), X.name, [D.shopText(id), dim(`Made by: ${D.madeBy(id)} (from a Hive).`)])); }
  for (const k of ['opp', 'block', 'counter', 'debt', 'flower', 'petal', 'clay', 'brick', 'tree', 'wood', 'dynamite', 'hard', 'sticky', 'hive', 'little', 'egg', 'hat', 'doom', 'volcano']) { const ch = { kind: k, value: k === 'opp' ? 1 : k === 'debt' ? 3 : k === 'sticky' ? 3 : 0, ...(k === 'hard' ? { life: 3 } : {}), ...(D.INSTANCE_SHIELDS.includes(k) ? { hits: k === 'egg' ? 5 : 1 } : {}) };
    out.push(entry(tipped(chipEl(ch), () => chipTip(ch)), D.CHIPS[k].name, [D.CHIPS[k].text, dim(`Made by: ${BOUT_CHIPS[k]}`)])); }
  for (const ch of [{ kind: 'std', value: 72, gold: true, treasure: true }, { kind: 'std', value: 1, gold: true, cursed: true }]) out.push(entry(tipped(chipEl(ch), () => chipTip(ch)), ch.cursed ? 'Cursed chip' : 'Treasure chip', [ch.cursed ? D.CHIPS.cursed.text : D.CHIPS.treasure.text, dim('Made by: a sunk Ghost Ship.')]));
  out.push(sec('Creatures', `Chips over the table. Each fee instance on one takes a hit; the last drives it off for a Bounty chip of ${D.BOUNTY_PER_HIT}¢ a hit.`));
  for (const [k, C] of Object.entries(D.CREATURES)) out.push(entry(h('span', { class: 'list-icon', text: C.glyph }), C.name, [C.text, traitsHtml(flyerTraits(k))]));
  out.push(sec('Orbital chips', 'Weather and vehicles in the sky above the flying layer. Weather comes with the table\'s felt; vehicles with Calamities.'));
  for (const [k, O] of Object.entries(D.ORBITALS)) out.push(entry(h('span', { class: 'list-icon', text: O.glyph }), O.name, [O.text, dim(`Comes with: ${Object.values(D.FELTS).filter((F) => F.weather?.includes(k)).map((F) => F.name + ' tables').join(', ') || (k === 'sun' ? 'the Sun chip' : 'a Calamity')}.`), traitsHtml(flyerTraits(k, true))]));
  out.push(sec('Hazard chips', 'Left by Expenses with an element. A shop chip of the matching colour makes a stack immune.'));
  for (const k of ['burn', 'acid', 'shock', 'corrupt', 'poison', 'boom', 'frost', 'lava']) { const ch = { kind: k, value: 0 }, by = leftBy(k), cure = Object.keys(D.SHOP_CHIPS).find((x) => D.resistsOf(x).includes(k));
    out.push(entry(tipped(chipEl(ch), () => chipTip(ch)), D.CHIPS[k].name, [D.CHIPS[k].text, dim(`Left by: ${by.join(', ') || 'creatures and calamities'}${k === 'burn' ? ', the Dragon, Inferno and Volcano' : ''}.${cure ? ` Stopped by the ${D.SHOP_CHIPS[cure].name}.` : ''}`)])); }
  return out;
}

function tricksTab(own) {
  const out = [];
  for (const [type, T] of Object.entries(D.TYPES)) {
    out.push(sec(`${T.name}s`, `${T.text} Trait when bid with no dice: ${T.traitText(1)}`));
    for (const [id, def] of Object.entries(D.TRICKS)) { if (def.type !== type) continue;
      const t = { id, q: 1, up: 0 }, n = own.trick(id);
      out.push(entry(tipped(tagOf(t), () => trickTip(t, own.run?.cls)), def.name,
        [`${def.cls ? D.CLASSES[def.cls].name : 'Any class'} · ${def.count}${def.die} · ${def.approach === 'none' ? 'no target' : `${def.approach}, ${D.DIST[def.dist].name}`}`, `<span class="k">Roll</span> ${def.roll.text}`, `<span class="k">Bonus</span> ${D.condText(def.bonus.cond)}: ${def.bonus.text}`, def.early ? dim(`Swift: plays with the ${D.TYPES[def.early].name}s.`) : null, def.arrange ? dim(`Arrangement: moves chips in ${def.side === 'opp' ? 'your opponent\'s' : 'your'} position (${def.arrange.replace('opp-', '')}).`) : null], { own: n ? (n > 1 ? `In your book ×${n}` : 'In your book') : null }));
    }
  }
  out.push(sec('Upgrades', `Quality (Common to Royal) sets the multiplier and is drawn as the frame; each of the ${D.TRICK_UPGRADE_MAX} Trick Trader upgrades adds +0.25 and a ▲, and gives the trick a moving foil. Upgrade cost: 100¢ × (1 + quality × (upgrades + 1)). Two upgrades per floor.`));
  const steps = [{ q: 1, up: 0 }, { q: 2, up: 0 }, { q: 3, up: 0 }, { q: 4, up: 0 }, { q: 4, up: 1 }, { q: 4, up: 2 }].map((x) => ({ id: 'charge', ...x }));
  for (const t of steps) out.push(entry(tipped(tagOf(t), () => trickTip(t, own.run?.cls)), `${D.QNAME[t.q]}${t.up ? ` · ${'▲'.repeat(t.up)} upgraded ${t.up}/${D.TRICK_UPGRADE_MAX}` : ''}`,
    [`Roll total ${fx(multOf(t))} · Trait ${traitOf(t)}`, dim(`Investments: ${fx(multOf({ ...t, id: 'stir' }))}. Upgrade from here: ${t.up < D.TRICK_UPGRADE_MAX ? cents(100 * (1 + t.q * (t.up + 1))) : 'maxed'}.`)]));
  out.push(entry(tagOf({ id: 'charge', q: 3, up: 1 }), 'What an upgrade says', [upInfo({ id: 'charge', q: 3, up: 1 })], { wide: true }));
  return out;
}

function diceTab(own) {
  const out = [sec('Dice', 'Each die is drawn as its solid. Forge one at the Diesmith by melting your smallest dice.')];
  for (const [type, X] of Object.entries(D.DICE)) { const d = { type, up: [] }, n = own.die(type);
    out.push(entry(tipped(dieEl(d), () => dieTip(d)), type, [`Rolls 1–${X.faces}.`, `Forge: ${X.forge.dice} ${X.forge.dice > 1 ? 'dice' : 'die'} + ${cents(X.forge.chips)}, from floor ${X.forge.floor}.`, dim(`Sells for ${cents(X.sell)}.`)], { own: n ? `In your pouch ×${n}` : null })); }
  out.push(sec('Upgrades', `The workbook's ${Object.keys(D.DIE_UPGRADES).length} upgrades. Most change the faces when you buy them; ▲▼?☠ change how the die rolls. Each puts its own badge on the die. Up to ${D.DIE_UPGRADE_MAX} per die. Cost: 100¢ × floor × (1 + upgrades it already has). Faces shown on a d6, before → after (target face marked).`));
  const d6 = { type: 'd6', up: [] };
  for (const [u, U] of Object.entries(D.DIE_UPGRADES)) {
    const t = U.target ? suggestFace(d6, u) : 0, d = upgradeFaces({ type: 'd6', up: [] }, u, t, { int: () => 0 });
    out.push(entry([dieEl(d6), h('span', { class: 'dim', text: '→' }), tipped(dieEl(d), () => dieTip(d))], `<span style="color:${U.color}">${U.mark}</span> ${U.name}${U.floor > 1 ? ` <span class="dim">floor ${U.floor}+</span>` : ''}`,
      [D.upgradeText(u), `<span class="faces">${faceStrip(d6)}</span> → <span class="faces">${faceStrip(d)}</span>${U.target ? dim(` target face ${t + 1}`) : U.roll ? dim(' faces unchanged; works when rolled') : ''}`])); }
  const held = (own.run?.dice || []).filter((d) => d.up.length);
  if (held.length) { out.push(sec('Your upgraded dice')); for (const d of held) out.push(entry(tipped(dieEl(d), () => dieTip(d)), d.type, [d.up.map((u) => D.DIE_UPGRADES[u].name).join(', '), `<span class="faces">${faceStrip(d)}</span>`], { own: true })); }
  return out;
}

// the Gift Shop stocks gear of level n once you leave from floor n + 1 or higher
const shopFrom = (level) => (!level ? '' : level >= 4 ? ', leaving from the Ascent' : `, leaving from floor ${level + 1} or higher`);
const cardKind = (id) => (D.PASS_CARDS.includes(id) ? 'Pass: does not take a wallet slot' : D.STARTER_CARDS.includes(id) ? 'Starter: two are dealt into your wallet' : D.FIND_CARDS.includes(id) ? 'Found in the dodgy corner' : 'Takes a wallet slot');
function cardsTab(own) {
  const out = [sec('Cards', 'Benefit cards ride in your wallet; passes clip to your lanyard.')];
  for (const id of Object.keys(D.CARDS)) out.push(entry(tipped(cardEl(id), () => cardTip(id)), D.CARDS[id].name, [D.CARDS[id].text, dim(cardKind(id))], { own: own.card(id) ? 'In your wallet' : null }));
  out.push(noUpgrades('Cards'));
  return out;
}

const DRINK_STAT = { random: 'one random attribute, chosen when it is poured', tip: 'three random attributes, chosen when it is poured', all: 'every attribute' };
function drinksTab(own) {
  const out = [sec('Drinks', 'Sip one before a turn for its bonus that turn. The glass empties as you sip.')];
  for (const d of D.DRINKS) {
    const stat = D.STATS[d.stat] ? D.STATS[d.stat].name : DRINK_STAT[d.stat];
    out.push(entry([drinkEl(d), d.sips > 1 ? drinkEl(d, Math.ceil(d.sips / 2), d.sips) : null, drinkEl(d, 0, d.sips)], `${d.name} <span class="dim">${d.verb}</span>`,
      [`+${d.amt} ${stat} per sip · ${d.sips} sip${d.sips > 1 ? 's' : ''}`, dim(`${cents(d.cost)} (a fifth of that on floor 1, half in happy hour).`)], { own: own.drink(d.id) ? `In your hand, ${own.run.drink.sips} left` : null }));
  }
  out.push(noUpgrades('Drinks'));
  return out;
}

function walletsTab(own) {
  const out = [sec('Wallets', 'The slots are drawn on the front; the number is what your two biggest dice must roll in the alley to keep its cards for your next run.')];
  for (const [id, Wl] of Object.entries(D.WALLETS)) out.push(entry(walletEl(id), Wl.name,
    [`${Wl.slots} slot${Wl.slots > 1 ? 's' : ''} · keep on ${Wl.keep}+`, Wl.price ? `${cents(Wl.price)} in the Gift Shop${shopFrom(Wl.level)}${Wl.crown ? ', once you hold a Crown' : ''}.` : 'Free from the start.'],
    { own: own.walletOn(id) ? 'Carrying' : own.wallet(id) ? 'Unlocked' : null }));
  out.push(noUpgrades('Wallets'));
  return out;
}

function jacketsTab(own) {
  const out = [sec('Jackets', 'A jacket shifts your attributes for the whole run. Its trade-off is printed on the hem.')];
  for (const [id, J] of Object.entries(D.JACKETS)) out.push(entry(tipped(jacketEl(id), () => jacketTip(id)), `${J.name} <span class="dim">${J.effect}</span>`,
    [Object.entries(J.mods).map(([k, n]) => `${n > 0 ? '+' : ''}${n} ${D.STATS[k].name}`).join(', ') || 'No modifiers', J.price ? `${cents(J.price)} in the Gift Shop${shopFrom(J.level)}.` : 'Free from the start.'],
    { own: own.jacketOn(id) ? 'Wearing' : own.jacket(id) ? 'Unlocked' : null }));
  out.push(noUpgrades('Jackets'));
  return out;
}

function feltsTab(own) {
  const out = [sec('Felts', 'Each table on a floor is dealt a felt. For now a felt only colours the table; board effects come later.')];
  const here = new Set(own.run?.fs ? own.run.fs.tables.map((t) => D.feltId(t.felt)) : []);
  for (const [id, F] of Object.entries(D.FELTS)) out.push(entry(feltEl(id), F.name, [F.line, dim(F.pool === false ? 'Not dealt to random tables.' : 'Dealt to random tables.'), dim('Board effect: none yet.')], { own: here.has(id) ? 'On this floor' : null }));
  out.push(noUpgrades('Felts'));
  return out;
}

// ---------- the workbook's chip list, every row ----------
const STATUS = { built: ['Built', 'var(--good)'], partial: ['Partly built', 'var(--amber)'], needs: ['Needs detail', 'var(--bad)'] };
const LIST_ICON = { 'UFO Chip': '🛸', 'Mothership Chip': '👾', 'Fairy Chip': '🧚', 'Unicorn Chip': '🦄', 'Dragon Chip': '🐉', 'Mole Chip': '🐭', 'Black Hole Chip': '🕳', 'Volcano Chip': '🌋', 'Tornado Chip': '🌪', 'Hole Chip': '◯', 'Hardened p¢ Chip': '⛊', 'Cloud Chip': '☁', 'Blizzard Chip': '❄', 'Ghost Chip': '👻', 'Ghost Ship Chip': '🏴‍☠️', 'Puddle Chip': '💧', 'Bumble Bee Chip': '🐝', 'B 52¢ Chip': '✈', 'Dragon Roost Chip': '🪺', 'Worm Hole Chip': '🌀', 'Heavy Chip': '?', 'Metal Chip': '?' };
let listFilter = 'all';
function listTab(own, rerender) {
  const n = (st) => CHIP_LIST.filter((x) => st === 'all' || x.status === st).length;
  const filters = h('div', { class: 'lib-tabs lib-sec' }, [['all', 'All'], ['built', 'Built'], ['partial', 'Partly built'], ['needs', 'Needs detail']].map(([k, label]) => {
    const b = btn(`${label} ${n(k)}`, () => { listFilter = k; rerender(); }, null, 'small'); if (k === listFilter) b.classList.add('on'); return b; }));
  const out = [sec('The chip list', `All ${CHIP_LIST.length} rows of the workbook's chip list (<code>docs/CHIP-LIST.tsv</code>): <b style="color:var(--good)">${n('built')} built</b>, <b style="color:var(--amber)">${n('partial')} partly built</b> (in the game in another form, or with a gap), <b style="color:var(--bad)">${n('needs')} need detail</b> before they can be made. Each red card says what is missing.`), filters];
  for (const x of CHIP_LIST) {
    if (listFilter !== 'all' && x.status !== listFilter) continue;
    const [label, color] = STATUS[x.status];
    const vis = x.show ? tipped(chipEl(x.show), () => chipTip(x.show)) : LIST_ICON[x.name] ? h('span', { class: 'list-icon', text: LIST_ICON[x.name] }) : h('span', { class: 'chip static k-missing' }, h('i', { text: '?' }));
    const meta = [x.type, x.permanence, x.placement, x.source].filter(Boolean).join(' · ');
    const el = entry(vis, `${x.name} <span class="tier" style="--tc:${color}">${label}</span>`, [x.text ? `<span class="dim">List:</span> ${x.text}` : '<span class="dim">List: no description.</span>', meta ? dim(meta) : null,
      `<span style="color:${color}">${x.status === 'needs' ? '' : 'In the game: '}${x.note}</span>`, x.show ? traitsHtml(traitsOf(x.show)) : x.list ? traitsHtml(Object.entries(x.list).map(([k, v]) => ({ k, v, ...TRAITS[k] }))) : null], { own: x.show?.resist && own.shop(x.show.resist) ? `Own ${own.shop(x.show.resist)}` : null });
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
  const out = [sec('Chip traits', `Every chip's information lists its traits. <b style="color:var(--gold)">List traits</b> (solid outline) are the chip list's columns; <b style="color:var(--sky)">derived traits</b> (dashed) are how the engine treats chips but are not on the list yet. A derived trait that says it overlaps a list one may be redundant.`)];
  for (const [k, T] of Object.entries(TRAITS)) { const names = [...has.get(k)];
    out.push(entry(h('span', { class: `trait ${T.derived ? 'der' : 'lst'}`, text: T.name }), `${T.name} <span class="dim">${T.derived ? 'derived' : 'list'}</span>`, [T.text, dim(`${names.length} chip${names.length === 1 ? '' : 's'}${names.length ? ': ' + names.slice(0, 14).join(', ') + (names.length > 14 ? '…' : '') : ''}`)])); }
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
    h('p', { class: 'sub', text: own.run ? 'Everything in the game, as it looks on the table. What you own is marked in green.' : 'Everything in the game, as it looks on the table. Hover any piece for its full text.' })), btn('Close', () => closePanel(), null, 'small')), tabs, body), { wide: true });
}
