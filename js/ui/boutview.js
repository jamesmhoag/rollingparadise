// The table. Every chip, die, trick card and creature is one persistent element that is
// moved, faded or flipped to follow the bout state, so nothing ever pops between states.
import { h, tip, wait, tween, swapText, setOn, pulse, syncList, toast, btn, refreshTip, redrawTip, box, vc, detail, guided, stagePoint, rightClick, carry } from './core.js';
import { chipPainter } from './chippaint.js';
import { chipSig, chipGlyph, chipName, chipText, chipTip, dieTip, trickTip, trickWord, trickWords, statTip, drinkTip, dieMarks, dieDyes, dieStyle, dieClass, trickLook, feltStyle, seenAs, traitsOf, traitsHtml, dieEl, dress3d, chipEl, trickChip, flavorP } from './parts.js';
import { iconKids, iconFill } from './icons.js';
import { flyerTraits } from '../traits.js';
import { openLibrary } from './library.js';
import * as D from '../data.js';
import * as B from '../bout.js';
import { planPhase, drinkPhase, bestTarget, seen as seenBy } from '../ai.js';
import { sum } from '../util.js';
import { t as tt } from '../text.js';
import { facesOf, faceValue, dieName } from '../dice.js';
import { solidEl } from './solid.js';
import { signOf, dressSign, crownLookOf, killSign, celebrateSign } from './sign.js';
import { diceHtml, trickItem } from './trickcard.js';
import { sfx } from './sfx.js';
import { t as tx } from '../text.js';

// the table: the House's phase track runs along the top edge (y 100-124), the positions below it, and between them
// the Pit (right under the House's arms), each Roller's pot, and the ledger of bids and tapped pieces
// SPACE: the most a position's column is wide; a side with more columns shrinks them all to fit (up to 13 a side), and its
// chips shrink with them (CHIP is a chip's size in a SPACE_REF-wide column, so chips keep the same share of a space).
const TOP = 128, CH = 42, PX = 570, OX = 710, CHIP = 32, STAGE_Y = 100, SPACE = 46, SPACE_REF = 52;
// the Pit fills the gap between the two positions, all five rows of it: each Roller's columns of stacks on their own
// side, and the bottomless pit down the middle (bout.js pitDims)
const PIT = { left: PX, right: OX, top: TOP, bottom: TOP + 5 * CH };
const STAGE = [{ x: PX + 18, y: TOP + 2 * CH }, { x: OX - 50, y: TOP + 2 * CH }], HOUSE = { x: 624, y: 30 };
const fmtX = (m) => '×' + (m % 1 ? m.toFixed(2).replace(/0$/, '') : m);

let testBrush = null; // the test table's chip, kept between visits
export function boutScene(root, bout, ctx, onDone) {
  const [me, opp] = bout.sides;
  const cw = bout.sides.map((s) => Math.min(SPACE, Math.floor((PX - 30) / s.rows))), ck = cw.map((w) => w / SPACE_REF); // column width, chip scale
  const ui = { held: [], cursor: null, peek: null, peekPhase: null, handAim: new Set(), mode: null, die: null, entry: null, locked: false, speed: globalThis.RP_FAST || 1, first: true, sel: new Set(), flips: [], hand: [], card: null, point: null, spent: new Set() }; // RP_FAST: set by automated playthroughs
  // sel: Pouch dice picked for the throw · flips: stacks whose top chip is picked to flip · hand: the bid chips picked up, one {r,c} per chip (a stack picked twice gives its top two) · card: trick under the pointer · point: the chip under the pointer in a stack
  const els = { chips: new Map(), dice: new Map(), cards: new Map(), cells: [[], []], creatures: new Map(), stage: new Map() };
  const layer = h('div', { class: 'bout-layer' });
  root.classList.add('bout');
  // the table's felt: for now it only sets the colour
  const feltBg = h('div', { class: 'table-felt', style: feltStyle(ctx?.felt || 'felt'), tip: () => { const F = D.feltOf(ctx?.felt || 'felt'); return tx('table.felt-no-board-effect', { name: F.name, line: F.line }) + flavorP('FELTS', D.feltId(ctx?.felt || 'felt')); } });
  root.append(feltBg);
  const fxLayer = h('div', { class: 'fx-chips' }); root.append(fxLayer); // effect chips lie on the table, under the stacks

  // ---------- geometry ----------
  const cellPos = (side, r, c) => ({ x: side === 0 ? PX - (r + 1) * cw[0] : OX + r * cw[1], y: TOP + c * CH, w: cw[side] });
  const chipPos = (side, r, c, lvl) => { const p = cellPos(side, r, c), k = ck[side]; return { x: p.x + p.w / 2 - CHIP / 2, y: p.y + CH - 5 - CHIP * (1 + k) / 2 - Math.min(lvl, 12) * 4 * k, z: 20 + c * 40 + lvl, k }; };
  // Under the table, two mirrored halves: yours on the left (Book · Run · dice), theirs on the right (dice · Run ·
  // Book), so both Rolls sit side by side in the middle. A Book or dice column folds to a thin spine when there is
  // nothing to do with it and gives its width to the Run. Click your spine, or press B or D, to peek inside.
  // Their Book and Pouch stay closed (you only see how many): their Roll, tricks, dice and bids are shown as they land.
  const sideOf = (si) => bout.sides[si];
  const bookOpen = (si = 0) => si === 0 && bout.phase === 'draw';
  const diceOpen = (si = 0) => { const s = sideOf(si); return (bout.phase === 'roll' && !s.thrown) || s.tray.length > 0; };
  const RUN_Y = 478, TITLE_Y = 466, DICE_Y = 452, CARD_H = 230, G = 10, BOOK_W = 180, DICE_W = 196, SPINE = 28;
  const HALF = [{ l: 14, r: 630 }, { l: 650, r: 1266 }];
  const ckey = (si, uid) => (si ? 'o' + uid : uid), dkey = (si, id) => (si ? 'o' + id : id); // their ids are counted apart from yours
  function runSpan(si = 0) {
    const s = sideOf(si), H = HALF[si], b = bookOpen(si) ? BOOK_W : SPINE, d = diceOpen(si) ? DICE_W : SPINE, n = s.run.length, room = H.r - H.l - b - d - 2 * G;
    const w = Math.min(122, Math.floor((room + 6) / Math.max(1, n)) - 6), W = n ? n * (w + 6) - 6 : Math.min(room, 320);
    if (si === 0) { const dice = H.r - d, x = dice - G - W; return { l: x, r: x + W, w: W, cw: w, dice, book: H.l }; } // yours leans on your dice
    const x = H.l + d + G; return { l: x, r: x + W, w: W, cw: w, dice: H.l, book: H.r - b }; // theirs mirrors it
  }
  const diceAt = (si = 0) => { const R = runSpan(si); return si === 0 && !diceOpen() && ui.peek === 'dice' ? R.dice - 200 : R.dice; }; // where a dice column starts
  function cardLayout() {
    const out = new Map();
    [0, 1].forEach((si) => { const R = runSpan(si); sideOf(si).run.forEach((e, i) => out.set(ckey(si, e.uid), { si, x: R.l + i * (R.cw + 6), y: RUN_Y, w: R.cw, h: CARD_H, open: true, e })); });
    const peek = ui.peek === 'book', tapT = B.tappedInOrder(me).tricks.map((x) => x.trick), shelf = [...me.book, ...tapT], step = Math.min(42, Math.floor(CARD_H / Math.max(1, shelf.length)));
    shelf.forEach((t, i) => out.set(t.uid, bookOpen() ? { si: 0, x: 16, y: RUN_Y + i * step, w: BOOK_W - 4, h: Math.min(38, step - 3), open: false, t }
      : peek ? { si: 0, x: 50, y: RUN_Y + i * step, w: BOOK_W - 4, h: Math.min(38, step - 3), open: false, t, peek: true }
        : { si: 0, x: 16, y: RUN_Y + 12 + i * 3, w: 26, h: 24, open: false, t, folded: true }));
    return out;
  }
  // dice on a trick sit in one row; past three they close up (overlapping) so any number fits the card
  const dieSlot = (cl, i, n = 3) => { const step = n <= 3 ? 36 : Math.max(10, Math.min(36, (cl.w - 44) / (n - 1))); return { x: cl.x + 7 + i * step, y: cl.y + 50 }; };
  // a dice column, top-aligned with the Run: the Roll's tray, then the Pouch (titles sit on the row above)
  // just under the commit button, five dice a row. The roll keeps dice from turn to turn, so it grows a row at a
  // time and the Pouch moves down under it.
  const trayRows = (si = 0) => Math.max(2, Math.ceil(sideOf(si).tray.length / 5));
  const DY = { tray: DICE_Y, get pouch() { return DICE_Y + trayRows() * 36 + 14; }, get dice() { return this.pouch + 18; } };
  const pouchSlot = (i, n) => { const x0 = diceAt() + 6;
    if (!diceOpen() && ui.peek !== 'dice') return { x: runSpan().dice + 3, y: DICE_Y + 22 + Math.min(i, 30) * 6, folded: true }; // folded into its spine
    if (bout.phase === 'roll' && me.thrown && ui.peek !== 'dice') return { x: x0 + Math.min(i, 30) * Math.min(10, 150 / Math.max(1, n)), y: DY.dice + 4 - (i % 2) * 2 }; // thrown: the rest of the Pouch closes up
    const per = n > 15 ? 6 : 5, st = n > 15 ? 30 : 36; return { x: x0 + (i % per) * st, y: DY.dice + Math.floor(i / per) * st }; };
  const traySlot = (i, si = 0) => ({ x: diceAt(si) + 10 + (i % 5) * 36, y: DY.tray + 8 + Math.floor(i / 5) * 36 }); // the roll: a row per five dice kept
  // the Stage: what each Roller has paid, stacked in front of the House
  // the Pit: each Roller's lost chips, in the order they were lost, filling two stacks on their own side, then rising
  // the Pit: a space a row in each of a side's columns, the front column by the middle; a chip sits where it landed
  // (rec.col, rec.row) at its height in that stack. One with no place (a Pit without a limit that has run out of
  // spaces) rests on the rim of the middle.
  const PD = B.pitDims(bout), pitW = (PIT.right - PIT.left) / (2 * PD.cols + 1), pitK = Math.min(0.78, (pitW - 2) / CHIP);
  const pitColX = (si, col) => PIT.left + (si === 0 ? PD.cols - 1 - col : PD.cols + 1 + col) * pitW;
  const pitSlot = (si, rec, lvl) => { const mid = rec.col == null, x = mid ? PIT.left + PD.cols * pitW : pitColX(si, rec.col), row = mid ? (lvl % PD.rows) : rec.row;
    return { x: x + pitW / 2 - CHIP / 2, y: TOP + row * CH + CH - 5 - CHIP * (1 + pitK) / 2 - Math.min(mid ? 0 : lvl, 12) * 3 * pitK, z: 30 + row * 20 + lvl, s: pitK }; };
  // a trick's bid pile sits just right of its BID ring: the ring (or the card) adds a bid, the pile gives its top chip back
  function bidSpot(el) { const s = el?.querySelector('.bidslot'); return s ? { x: s.offsetLeft + (s.offsetWidth - CHIP) / 2, y: s.offsetTop + (s.offsetHeight - CHIP) / 2 } : { x: 46, y: 80 }; } // the pile stacks in the space

  // ---------- static frame ----------
  const worthEl = [h('b', { class: 'num' }), h('b', { class: 'num' })], stageEl = [h('b', { class: 'num' }), h('b', { class: 'num' })];
  const owesEl = [h('span', { class: 'owes-t' }), h('span', { class: 'owes-t' })];
  const owedBy = (s) => sum(s.grid.flat(), B.debtOf);
  const worthTip = (s) => () => tx('table.worth-the-chips-in', { worth: B.worth(s), v: s.idx ? 'their' : 'your', v2: owedBy(s) ? tx('table.of-debt-is-waiting', { owedBy: owedBy(s), v: s.idx ? 'their' : 'your' }) : '' });
  const badgeBox = [h('div', { class: 'badges' }), h('div', { class: 'badges right' })];
  // the three planning phases, shown as steps: the current one is lit, finished ones are dimmed
  const STEPS = [
    ['draw', 'Draw', 'trickery', 'charisma', tx('table.click-tricks-in-your')],
    ['roll', 'Roll', 'proficiency', 'conviction', tx('table.pick-the-dice-to')],
    ['bid', 'Bid', 'ingenuity', 'cunning', tx('table.click-your-stacks-to')],
    ['aim', 'Bluff', null, null, tx('table.the-bids-are-out')]];
  const pill = {}, pillEl = {};
  // what passing a step gives: draws, rolls and bids left unused are made into chips on your Bet when it is passed
  const REWARD_CHIP = { draw: (n) => tx('table.a-steal-chip-it', { n }), roll: (n) => tx('table.power-to-your-roll', { n }), bid: (n) => tx('table.opportunity', { n }) };
  function rewardLine(ph) {
    const w = B.rewardOf(me, ph); if (!w) return '';
    const i = PH_ORDER.indexOf(ph), at = PH_ORDER.indexOf(bout.phase), passed = at < 0 || at > i;
    if (passed) return w.unused ? tx('table.passed-with-of-unused', { unused: w.unused, total: w.total, ph: REWARD_CHIP[ph](w.n) }) : tx('table.passed-with-all-of');
    return w.n ? tx('table.with-unused-and-the', { v: at === i ? tx('table.pass-now') : tx('table.pass-this-step'), unused: w.unused, ph: REWARD_CHIP[ph](w.n) }) : tx('table.leave-some-unused-and', { ph: REWARD_CHIP[ph](B.cOf(me, B.REWARD[ph].c)) });
  }
  const PH_ORDER = ['draw', 'roll', 'bid', 'aim'];
  const pillTip = (k, c, what, ph) => () => !k ? tx('table.bluff', { what }) : tx('table.left-unused-you-see', { statTip: statTip(k, B.tipOf(me, k)) + statSplit(B.statParts(me, k)), rewardLine: rewardLine(ph), replace: statTip(c, B.cOf(me, c)).replace(/<b>.*?<\/b>/, '') + statSplit(B.statParts(me, c)) + cccGate(me), what, name: opp.name });
  // where a stat's value comes from: the class base, gear (jacket, cards, the run), and each temporary change
  const signed = (n) => `${n >= 0 ? '+' : '−'}${Math.abs(n)}`;
  const statSplit = (P) => `<p class="statsplit">${tx('table.stat-base', { n: P.base })} · ${tx('table.stat-gear', { n: signed(P.gear) })}${P.temp.map((x) => ` · <span class="${x.n > 0 ? 'temp-up' : 'temp-down'}">${x.from} ${signed(x.n)}</span>`).join('')} = <b>${P.total}</b></p>`;
  const cccGate = (s) => { const P = B.occBonus(s).parts; return P.length ? `<p class="dim">${P.map((x) => tx(x.zone === 'focus' ? 'table.ccc-focus' : x.zone === 'bet' ? 'table.ccc-bet' : 'table.ccc-stake', { n: x.n, stat: x.keys.map((k) => D.STATS[k].name).join(', ') })).join(' ')}</p>` : `<p class="bad-t">${tx('table.ccc-off')}</p>`; };
  const tempCls = (el, P) => { el.classList.toggle('temp', P.tempN !== 0 || P.temp.length > 0); el.classList.toggle('temp-up', P.tempN > 0); el.classList.toggle('temp-down', P.tempN < 0); };
  let oppPills = null, houseSign = null;
  // the House's sign wears a ring of casino bulbs: they twinkle while the Rollers plan, chase while the House plays,
  // and flash at the big moments (a turn opening, last call, a big loss, the end of the bout)
  const BULBS = []; { const W = 184, H = 58, step = 11.5;
    for (let x = 0; x <= W; x += step) BULBS.push([x, 0]); for (let y = step; y <= H; y += step) BULBS.push([W, y]);
    for (let x = W - step; x >= 0; x -= step) BULBS.push([x, H]); for (let y = H - step; y > 0; y -= step) BULBS.push([0, y]); }
  const marquee = h('div', { class: 'marquee idle' }, BULBS.map(([x, y], i) => h('i', { style: { left: x + 'px', top: y + 'px', '--i': i, '--n': BULBS.length } })));
  let lightsBase = 'idle', flashing = false, lightsT = 0;
  function lights(mode, ms) { clearTimeout(lightsT); flashing = true; marquee.className = `marquee ${mode}`; if (ms) lightsT = setTimeout(() => { flashing = false; marquee.className = `marquee ${lightsBase}`; }, ms); }
  function lightsAt(base) { lightsBase = base; if (!flashing) marquee.className = `marquee ${base}`; }
  // each Roller's name as a neon sign: the name in script, their class (or title) in capitals under it. The colours
  // are D.NEON's, set in Build mode: a tube colour and a glow colour for the frame, the name and the class.
  const nameSign = (name, cls, tipFn) => h('div', { class: 'name nsign', tip: tipFn }, h('b', { class: 'neon-name', text: name }), h('span', { class: 'neon-class', text: cls }));
  // the signs: yours, theirs (their own if their roster entry has one) and the House's, all built the same way (sign.js)
  // a High Roller wears its floor's crown; you wear one you have claimed, in the colours of the sign it came off
  const crownOf = (c) => (c ? { level: c.floor, look: crownLookOf(signOf('them', D.ROSTER[c.roster]?.sign)), fit: c.fit } : null);
  const signs = { you: () => ({ ...signOf('you', me.sign), crown: crownOf(me.crown) }), them: () => ({ ...signOf('them', opp.sign), crown: opp.boss ? { level: Math.max(1, Math.min(4, opp.floor || 1)) } : null }), house: () => signOf('house') };
  // a seat's sign has a fixed slot: if its name (with its crown, symbol and frame) doesn't fit, the name is set smaller
  function fitSeat(el) {
    const fit = () => { el.style.removeProperty('--name-fs'); const n = el.querySelector('.neon-name'); if (!n) return;
      const cs = getComputedStyle(n), nk = parseFloat(cs.getPropertyValue('--nk')) || 1; let fs = (parseFloat(cs.fontSize) || 27) / nk; // in the slot's own size, before the face's scale
      // spilling over the slot either way (content is centred in it, so it can spill upward as well as down)
      const spills = () => { const R0 = el.getBoundingClientRect(); return [...el.children].filter((c) => !c.matches('svg, .badges')).some((c) => { const q = c.getBoundingClientRect(); return q.height && (q.top < R0.top - 1 || q.bottom > R0.bottom + 1); }); };
      while (fs > 16 && spills()) { fs -= 1; el.style.setProperty('--name-fs', `${fs}px`); }
      el._signRedraw?.(); };
    // after the seat is on the page and the script face has loaded (until then nothing can be measured)
    requestAnimationFrame(() => requestAnimationFrame(fit)); document.fonts?.ready?.then(() => requestAnimationFrame(fit));
  }
  function paintNeon() {
    const S = { you: signs.you(), them: signs.them(), house: signs.house() };
    for (const [who, N] of Object.entries(S)) for (const part of ['border', 'name', 'cls']) N[part].forEach((c, i) => root.style.setProperty(`--${who}-${part}${i + 1}`, c));
    root.style.setProperty('--you', S.you.name[0]); root.style.setProperty('--them', S.them.name[0]);
    const [mine, theirs] = [root.querySelector('.who.me .plate'), root.querySelector('.who.them .plate')]; // the name plate is the sign: one fixed size, the name and class only
    if (mine) dressSign(mine, S.you, 'you'); if (theirs) dressSign(theirs, S.them, 'them'); if (houseSign) dressSign(houseSign, S.house, 'house');
    for (const el of [mine, theirs]) if (el) fitSeat(el);
    marquee.style.display = S.house.frame === 'bulbs' ? '' : 'none'; }
  const header = h('div', { class: 'bout-head' },
    h('div', { class: 'who me' }, h('div', { class: 'plate' }, nameSign(D.ROLLERS[me.roller || D.rollerOf(me.cls)]?.name || D.CLASSES[me.cls].name, D.CLASSES[me.cls].name, () => tx('table.sign-tip', { name: D.heroName(me.cls, me.roller), cls: D.CLASSES[me.cls].name }))),
      h('div', { class: 'worth', tip: worthTip(me) }, 'Worth ', worthEl[0], '¢', owesEl[0]),
      h('div', { class: 'pills steps' }, STEPS.map(([k, name, stat, reward, what], i) => (pillEl[k] = h('span', { class: 'pill step', tip: pillTip(stat, reward, what, k) },
        h('em', { text: String(i + 1) }), ` ${name} `, (pill[k] = h('span'))))))),
    h('div', { class: 'mid' }, (houseSign = h('div', { class: 'house-sign', tip: tx('table.the-house-every-chip') }, marquee,
      h('div', { class: 'hs-name', text: tx('table.house-sign') }),
      h('div', { class: 'turn', tip: () => tx('table.turn-both-rollers-plan', { turn: bout.turn, LASTCALL: B.LAST_CALL + 1, maxTurns: bout.rules.maxTurns }) }, 'Turn ', h('b', { class: 'num turn-n', text: '1' }))))),
    h('div', { class: `who them${opp.boss ? ' boss' : ''}` }, h('div', { class: 'worth', tip: worthTip(opp) }, 'Worth ', worthEl[1], '¢', owesEl[1]),
      h('div', { class: 'plate' }, nameSign(opp.name, D.CLASSES[opp.cls].name, () => tx('table.sign-tip', { name: opp.title ? `${opp.name}, ${opp.title}` : opp.name, cls: D.CLASSES[opp.cls].name }))), // the class line names its class, High Rollers' too
      (oppPills = h('div', { class: 'pills' }, ['trickery', 'proficiency', 'ingenuity', 'charisma', 'cunning', 'conviction'].map((k) =>
        h('span', { class: 'pill small', 'data-k': k, tip: () => statTip(k, k in opp.tip ? B.tipOf(opp, k) : B.cOf(opp, k)) + statSplit(B.statParts(opp, k)) + (k in opp.tip ? '' : cccGate(opp)) }, `${D.STATS[k].name} `, h('b', { text: k in opp.tip ? opp.tip[k] : B.cOf(opp, k) })))))));
  // the middle of the table: the Pit right under the House's arms, each Roller's pot under it, then a ledger per
  // Roller of what is bid on tricks this turn and what is tapped (waiting to be restored)
  const ledEl = [0, 1].map((si) => ({ bid: h('b', { class: 'num' }), on: h('small'), tap: h('span', { class: 'led-tap' }) }));
  const goneEl = [h('b', { class: 'num' }), h('b', { class: 'num' })];
  const pitTip = () => tx('table.the-pit-every-chip') + tx('table.pit-room', { cols: PD.cols, max: PD.stackMax, mine: B.pitRoom(bout, 0), theirs: B.pitRoom(bout, 1), goneMine: sum(B.goneOf(bout, 0), (x) => x.value), goneTheirs: sum(B.goneOf(bout, 1), (x) => x.value) }) + (PD.bottomless ? '' : tx('table.pit-no-limit'));
  const stageBox = h('div', { class: 'stage-box' },
    h('div', { class: 'pit grid', style: { left: PIT.left + 'px', width: PIT.right - PIT.left + 'px', top: PIT.top + 'px', height: PIT.bottom - PIT.top + 'px', '--pw': pitW + 'px', '--ph': CH + 'px' }, tip: pitTip },
      h('span', { class: 'pit-t', text: tx('table.pit') }),
      h('div', { class: `pit-void${PD.bottomless ? '' : ' shut'}`, style: { left: PD.cols * pitW + 'px', width: pitW + 'px' } })));
  // each Roller's field, beside their name plate: what they have lost to the Pit (and for good), what they have bid
  // this turn, and what is tapped
  const fieldEl = [0, 1].map((si) => h('div', { class: `field s${si}`, tip: () => ledgerTip(si) },
    h('span', { class: 'fld', tip: pitTip }, h('em', { text: tx('table.field-pit') }), stageEl[si], '¢'),
    h('span', { class: 'fld gone', tip: pitTip }, h('em', { text: tx('table.field-gone') }), goneEl[si], '¢'),
    h('span', { class: 'fld' }, h('em', { text: tx('table.ledger-bid') }), ledEl[si].bid, '¢', ledEl[si].on),
    h('span', { class: 'fld' }, h('em', { text: tx('table.ledger-tapped') }), ledEl[si].tap)));
  function ledgerTip(si) {
    const s = bout.sides[si], bids = s.run.filter((e) => e.state === 'bid' && e.bid.length);
    return tx('table.ledger-tip', { who: si ? opp.name : tx('end.you'), list: bids.map((e) => `${trickItem(e.trick).outerHTML} ${sum(e.bid, (ch) => ch.value)}¢`).join(' ') || tx('table.ledger-none'), t: s.tapped.tricks.length, d: s.tapped.dice.length });
  }
  function syncLedger() {
    bout.sides.forEach((s, si) => { const bids = s.run.filter((e) => e.state === 'bid' && e.bid.length), L = ledEl[si];
      tween(L.bid, sum(bids, (e) => sum(e.bid, (ch) => ch.value)));
      swapText(L.on, bids.length ? tx('table.ledger-on', { n: bids.length }) : tx('table.ledger-none'));
      const tt0 = s.tapped.tricks.length, td = s.tapped.dice.length;
      L.tap.replaceChildren(...(tt0 + td ? [h('span', { class: 'led-n', text: `${tt0}` }), h('i', { class: 'led-card' }), h('span', { class: 'led-n', text: ` ${td}` }), ...s.tapped.dice.slice(0, 3).map((x) => dieEl(x.die, '', 'mini'))] : [h('small', { text: tx('table.ledger-none') })])); });
  }
  // the action feed: always on screen, newest line at the bottom, with the House's phase tracker above it
  const PHASES = [['bids', 'Bids', '#ffd76a'], ...['investment', 'insurance', 'expense', 'correction'].map((k) => [k, D.TYPES[k].name + 's', D.TYPES[k].color]), ['house', 'House', '#ffd76a']];
  const phaseEls = {};
  // Two sets of neon signs on one track: the Rollers' steps (Draw, Roll, Bid, Bluff), each lit as it is played, then
  // the House's phases, which flip in over them one by one when the House takes over and light up as it plays them
  const PLAN = [['draw', 'Draw', '#6ef0ff'], ['roll', 'Roll', '#7dff9e'], ['bid', 'Bid', '#ffd76a'], ['aim', 'Bluff', '#ff6edc']], planEls = {};
  const phasesEl = h('div', { class: 'phases', tip: tx('table.phase-track') },
    h('div', { class: 'ph-set ph-plan' }, PLAN.map(([k, name, color], i) => (planEls[k] = h('span', { style: { '--pc': color, '--i': i } }, h('em', { text: String(i + 1) }), name)))),
    h('div', { class: 'ph-set ph-house' }, PHASES.map(([k, name, color], i) => (phaseEls[k] = h('span', { style: { '--pc': color, '--i': i }, guide: 'phase:' + k,
      tip: k === 'bids' ? tx('table.bids-first-the-house') : k === 'house' ? tx('table.house-last-hazards-creatures') : tx('table.both-rollers-play-together', { name, text: D.TYPES[k].text, toLowerCase: name.toLowerCase() }) }, h('em', { text: String(i + 1) }), name)))));
  // The feed keeps the whole match in one list. Short, it shows the last few rows; History opens the same list to
  // every row of the bout, by turn, scrolled to the latest (Esc or History again closes it).
  const feedLines = h('div', { class: 'feed-lines list' });
  const histBtn = btn(tx('table.history'), () => toggleHistory(), () => tx('table.match-history', { v: feedEl.classList.contains('open') ? tx('table.close-the-history') : tx('table.open-every-action-of') }), 'small hist');
  { const l = PX - me.rows * cw[0], r = OX + opp.rows * cw[1]; phasesEl.style.cssText = `left:${l}px;width:${r - l}px;top:${STAGE_Y + 1}px`; } // the phase track runs along the top edge of both positions
  const feedEl = h('div', { class: 'feed' }, h('div', { class: 'feed-head' }, histBtn), feedLines);
  const feed = []; let feedN = 0, prompt = '';
  // The feed is a table: a row per phase, headed by the phase and a note on what it does, with what each side
  // resolved in that phase in its own column. Things that cannot be put together take more rows for that side;
  // the same line repeated is shown once with a count. House lines that belong to neither side span both columns.
  const PH_LABEL = { draw: 'Draw', roll: 'Roll', bid: 'Bid', aim: 'Bluff', bids: 'Bids', investment: 'Investment', insurance: 'Insurance', expense: 'Expense', correction: 'Correction', house: 'House', drink: 'Drink', resolve: 'Play' };
  const PH_NOTE = { draw: 'tricks shown from the Book', roll: 'dice picked and rolled', bid: 'chips bid on tricks', aim: tx('table.dice-placed-bid-tricks'), bids: 'the House takes the bids', investment: tx('table.investments-play'), insurance: tx('table.insurances-play'), expense: tx('table.expenses-charge-fees'), correction: tx('table.corrections-play'), house: 'the House settles the table', drink: 'drinks and food', resolve: 'the turn plays' };
  function feedRows(list) {
    const groups = [];
    for (const x of list) { const g = groups[groups.length - 1]; if (g && g.turn === x.turn && g.phase === x.phase) g.items.push(x); else groups.push({ turn: x.turn, phase: x.phase, items: [x] }); }
    const rows = [];
    for (const g of groups) {
      const col = { you: [], them: [], house: [] }, notes = [];
      for (const x of g.items) {
        if (x.cls === 'house' && /^The House calls /.test(x.text)) { notes.push(x.text); continue; } // the call is the row header
        const list0 = col[x.cls] || col.house, same = list0.find((y) => y.text === x.text);
        if (same) { same.n++; same.cells = [...same.cells, ...(x.cells || [])]; same.k = x.k; } else list0.push({ text: x.text, n: 1, cells: x.cells || [], k: x.k });
      }
      const n = Math.max(col.you.length, col.them.length), key = `${g.turn}:${g.phase}:${g.items[0].k}`;
      const head = { label: PH_LABEL[g.phase] || g.phase, note: PH_NOTE[g.phase] || '', turn: g.turn };
      let first = true;
      for (const hz of col.house) { rows.push({ k: `${key}:h${hz.k}`, head: first ? head : null, gh: head, house: hz, turn: g.turn, last: hz.k }); first = false; }
      for (let i = 0; i < n; i++) { rows.push({ k: `${key}:${i}`, head: first ? head : null, gh: head, you: col.you[i], them: col.them[i], turn: g.turn, last: Math.max(col.you[i]?.k || 0, col.them[i]?.k || 0) }); first = false; }
      if (first) rows.push({ k: `${key}:0`, head, turn: g.turn, note: notes.length > 0, last: g.items[g.items.length - 1].k }); // only the call: the header says it all
    }
    return rows;
  }
  const cellTxt = (x) => (x ? `${x.text}${x.n > 1 ? ` ×${x.n}` : ''}` : '');
  function rowEl(row) {
    const hd = row.head ? h('div', { class: 'f-ph', tip: tx('table.turn', { label: row.head.label, turn: row.head.turn, note: row.head.note }) }, h('b', { text: row.head.label }), h('small', { text: row.head.note })) : h('div', { class: 'f-ph cont' });
    const cell = (x, cls) => h('div', { class: `f-c ${cls}${x ? '' : ' empty'}`, onmouseenter: () => review(x?.cells), onmouseleave: () => review(null) }, cellTxt(x));
    if (row.house) return h('div', { class: 'f-row' }, hd, cell(row.house, 'house span'));
    return h('div', { class: 'f-row' }, hd, cell(row.you, 'you'), cell(row.them, 'them'));
  }
  function renderFeed() {
    const open = feedEl.classList.contains('open'), all = feedRows(feed), items = [];
    if (open) { let turn = null; for (const r of all) { if (r.turn !== turn) { turn = r.turn; items.push({ k: `turn:${turn}`, turn }); } items.push({ k: r.k, row: r }); } }
    else for (const [i, r] of all.slice(prompt ? -3 : -4).entries()) items.push({ k: r.k, row: i === 0 && !r.head ? { ...r, head: r.gh } : r }); // the top row always names its phase
    if (prompt && !open) items.push({ k: 'prompt', text: prompt });
    if (open && !items.length) items.push({ k: 'empty', text: tx('table.nothing-has-happened-yet') });
    const sig = (x) => x.k + (x.row ? `:${cellTxt(x.row.you)}|${cellTxt(x.row.them)}|${cellTxt(x.row.house)}|${!!x.row.head}` : '');
    const atEnd = feedLines.scrollHeight - feedLines.scrollTop - feedLines.clientHeight < 30;
    syncList(feedLines, items, sig, (x) => (x.row ? rowEl(x.row) : x.turn != null ? h('div', { class: 'f-row turn' }, h('div', { class: 'f-ph', text: tx('table.turn-2', { turn: x.turn }) }), h('div', { class: 'f-c', text: tx('end.you') }), h('div', { class: 'f-c', text: opp.name })) : h('div', { class: 'feed-line prompt' })),
      (el, x) => { if (!x.row && x.turn == null) swapText(el, x.text); el.classList.toggle('now', x === items[items.length - 1]); });
    if (open && atEnd) feedLines.scrollTop = feedLines.scrollHeight;
  }
  function toggleHistory(open = !feedEl.classList.contains('open')) {
    feedEl.classList.toggle('open', open); feedLines.classList.toggle('scroll', open); histBtn.classList.toggle('on', open); if (!open) review(null);
    renderFeed(); if (open) feedLines.scrollTop = feedLines.scrollHeight;
  }
  let reviewing = [];
  function review(cells) { for (const el of reviewing) el.classList.remove('review'); reviewing = (cells || []).map((x) => els.cells[x.side]?.[x.r]?.[x.c]).filter(Boolean); for (const el of reviewing) el.classList.add('review'); }
  const feedPush = (text, who, cells = [], phase = bout.phase) => { feed.push({ k: ++feedN, text, cls: who === 0 ? 'you' : who === 1 ? 'them' : 'house', turn: bout.turn, phase, cells }); renderFeed(); };
  const setPrompt = (text) => { if (prompt === text) return; prompt = text; renderFeed(); };
  function setPhase(ph) { const at = PHASES.findIndex((x) => x[0] === ph); PHASES.forEach(([k], i) => { phaseEls[k].classList.toggle('on', i === at); phaseEls[k].classList.toggle('done', at >= 0 && i < at); }); }
  // the House's two arms: the left one works your side of the table, the right one your opponent's.
  // Each points at what it is resolving, and both move together when a phase is played.
  const phaseCall = h('div', { class: 'phase-call' });
  let callT = 0;
  function neonCall(text, color, ms = 1500) { clearTimeout(callT); phaseCall.textContent = text; phaseCall.style.setProperty('--pc', color); phaseCall.classList.remove('in'); void phaseCall.offsetWidth; phaseCall.classList.add('in'); callT = setTimeout(() => phaseCall.classList.remove('in'), ms / ui.speed); }
  function turnSign() { sfx('turn'); const last = me.heat > 1; neonCall(tx(last ? 'table.turn-call-last' : 'table.turn-call', { turn: bout.turn }), last ? '#ff4d6a' : '#6ef0ff'); lights('flash', 1300); }
  const arms = [0, 1].map((i) => { const piv = { x: i ? 726 : 554, y: 74 }, rest = i ? 62 : 118, el = h('div', { class: `stick arm${i}`, style: { left: `${piv.x}px`, top: `${piv.y - 2.5}px`, width: '30px', transform: `rotate(${rest}deg)` } }); let ang = rest; // the arms hang from the sign's lower corners
    return { el, to(x, y) { const dx = x - piv.x, dy = y - piv.y; let a = Math.atan2(dy, dx) * 180 / Math.PI; while (a - ang > 180) a -= 360; while (a - ang < -180) a += 360; ang = a;
      el.style.width = `${Math.max(30, Math.hypot(dx, dy) - 8)}px`; el.style.transform = `rotate(${a}deg)`; el.classList.add('live'); },
      rest() { let a = rest; while (a - ang > 180) a -= 360; while (a - ang < -180) a += 360; ang = a; el.style.width = '30px'; el.style.transform = `rotate(${a}deg)`; el.classList.remove('live'); }, tap() { pulse(el, 'tap'); } }; });
  let calling = [];
  const callEl = (st) => (st.uid == null ? null : els.cards.get(ckey(st.who, st.uid)));
  function setCalling(parts) { const next = parts.map(callEl).filter(Boolean); for (const el of calling) if (!next.includes(el)) el.classList.remove('calling'); for (const el of next) el.classList.add('calling'); calling = next; }
  function trickPoint(st) { if (st.uid == null) return null; const cl = cardLayout().get(ckey(st.who, st.uid)); return cl ? { x: cl.x + cl.w / 2, y: cl.y + 12 } : null; }
  const runEmpty = h('div', { class: 'run-empty', tip: tx('table.run-tricks-you-have'), text: tx('table.your-run-click-a') });
  const oppEmpty = h('div', { class: 'run-empty', tip: tx('table.s-run-the-tricks', { name: opp.name }), text: tx('table.their-run-empty', { name: opp.name }) });
  const sipBtn = btn(tx('table.sip'), () => { const why = B.canSip(bout, me); if (why) return nope(why, sipBtn); act(() => { B.sip(bout, me); toast(tx('table.you-sip-your-it', { name: me.drink.name })); }); }, () => (me.drink ? tx('table.sip-once-a-round', { drinkTip: drinkTip(me.drink) }) : ''), 'small');
  const undoBtn = btn(tx('table.undo-2'), () => act(() => { sfx('undo'); B.resetPlan(bout, me); ui.sel.clear(); ui.flips = []; ui.hand = []; ui.handAim.clear(); setMode(null); if (bout.phase === 'aim') aimBest(); }),
    () => tx('table.undo', { v: bout.phase === 'draw' ? tx('table.put-back-the-tricks') : bout.phase === 'roll' ? (me.thrown ? tx('table.take-the-dice-off') : tx('table.clear-the-dice-and')) : tx('table.take-back-the-bids') }), 'small');
  const speedBtn = guided(btn('1×', () => { ui.speed = ui.speed === 1 ? 2 : ui.speed === 2 ? 4 : 1; swapText(speedBtn, `${ui.speed}×`); }, tx('table.speed-how-fast-the'), 'small'), 'btn:speed');
  const commitBtn = btn(tx('table.roll'), () => commit(), () => commitTip(), 'big');
  const trayBox = h('div', { class: 'tray-box', text: tx('table.draw-then-press-roll') }), trayCap = h('div', { class: 'tray-cap' });
  // the spines the Book and the dice fold into, and the panel a peek opens over the Run
  const togglePeek = (k) => { ui.peek = ui.peek === k ? null : k; ui.peekPhase = bout.phase; sync(); };
  const spines = {
    book: h('button', { class: 'spine book', onclick: () => togglePeek('book'), tip: () => tx('table.spine-book', { n: me.book.length, list: me.book.map((t) => `<span class="tag-t" style="--tc:${D.TYPES[D.defOf(t).type].color}">${D.defOf(t).name}</span>`).join(' ') || tx('table.spine-empty') }) },
      h('span', { class: 'sp-t' }), h('span', { class: 'sp-marks' })),
    dice: h('button', { class: 'spine dice', onclick: () => togglePeek('dice'), tip: () => tx('table.spine-dice', { n: me.pouch.length, list: me.pouch.map((d) => dieName(d)).join(', ') || tx('table.spine-empty') }) },
      h('span', { class: 'sp-t' }), h('span', { class: 'sp-marks' })) };
  const peekPanels = { book: h('div', { class: 'peek-panel book', onclick: () => togglePeek('book') }), dice: h('div', { class: 'peek-panel dice', onclick: () => togglePeek('dice') }) };
  let ztRoll, ztPouch, ztRun;
  const kitTip = () => tx('table.s-kit-in-their', { name: opp.name, bookN: opp.book.length, pouchN: opp.pouch.length });
  const them = { tray: h('div', { class: 'tray-box them' }), roll: h('div', { class: 'zone-title zt-dice them', style: { top: DICE_Y - 14 + 'px' }, text: tx('table.their-roll'),
    tip: () => tx('table.s-roll', { name: opp.name, vc: vc(tx('table.the-dice-they-threw', { join: opp.tray.map((d) => d.value).join(', ') || '—' }), tx('table.their-throw-placed-in')) }) }),
    pouch: h('div', { class: 'zone-title zt-dice them', style: { top: DY.pouch + 'px' }, tip: kitTip }), run: h('div', { class: 'zone-title', style: { top: TITLE_Y + 'px' }, tip: tx('table.s-run-the-tricks', { name: opp.name }), text: tx('table.their-run') }),
    dspine: h('div', { class: 'spine dice them', tip: kitTip }, h('span', { class: 'sp-t' })), bspine: h('div', { class: 'spine book them', tip: kitTip }, h('span', { class: 'sp-t' })) };
  // the match history sits up top, yours on the House's left and theirs on its right; each Roller's name, Worth,
  // steps and badges sit above their own plays, under the table, with the commit button between the two
  const seats = [...header.querySelectorAll('.who')]; for (const el of seats) el.classList.add('seat');
  seats[0].append(fieldEl[0]); seats[1].append(fieldEl[1]);
  const frameEls = [header, ...seats, stageBox, phasesEl, feedEl, runEmpty, oppEmpty,
    h('div', { class: 'zone-title zt-book', style: { left: '16px', top: TITLE_Y + 'px' }, tip: tx('table.book-tricks-you-own'), text: tx('table.book') }),
    (ztRun = h('div', { class: 'zone-title', style: { top: TITLE_Y + 'px' }, tip: tx('table.run-tricks-you-have'), text: tx('table.your-run') })),
    (ztRoll = h('div', { class: 'zone-title zt-dice', style: { top: DICE_Y - 14 + 'px' }, tip: tx('table.the-roll-everything-you'), text: tx('table.the-roll') })), trayBox, trayCap,
    (ztPouch = h('div', { class: 'zone-title zt-dice', style: { top: DY.pouch + 'px' }, tip: tx('table.pouch-your-dice-in'), text: tx('table.pouch') })),
    peekPanels.book, peekPanels.dice, spines.book, spines.dice, ...Object.values(them),
    h('div', { class: 'controls' }, sipBtn, undoBtn, commitBtn, speedBtn)];
  feedEl.firstChild.prepend(btn(tx('title.library'), () => openLibrary(), tx('table.library-every-chip-trick'), 'small lib-btn'));
  const banner = h('div', { class: 'banner' });
  const fcLayer = h('div', { class: 'fc-layer' }); // fee forecasts and Debt tags over the stacks
  root.append(...frameEls, layer, fcLayer, arms[0].el, arms[1].el, phaseCall, banner);
  if (ctx?.test) root.append(testTools());
  // table-sized weather: a see-through sheet over each position (snow for a Blizzard, light for the Sun or Moon)
  const weatherEls = bout.sides.map((s, si) => { const a = cellPos(si, si === 0 ? s.rows - 1 : 0, 0), w = s.rows * cw[si];
    const el = h('div', { class: 'weather', style: { left: a.x + 'px', top: TOP + 'px', width: w + 'px', height: s.dims.cols * CH + 'px' } },
      ...Array.from({ length: 26 }, (_, i) => h('i', { style: { left: `${(i * 37) % 100}%`, animationDelay: `${-(i * 0.73) % 6}s`, animationDuration: `${4 + (i % 5)}s` } })));
    root.insertBefore(el, layer); return el; });

  const zoneMeters = [{}, {}];
  // cells, laid on two printed felt zones per position, like a casino layout: the Bet (front rows, by the Pit) on
  // green felt, the Stake (back rows) on red felt, each chequered space by space and named in the felt
  bout.sides.forEach((s, si) => {
    const m0 = s.dims.meterRows, zone = (k, r0, n) => { const a = cellPos(si, si === 0 ? r0 + n - 1 : r0, 0);
      root.insertBefore(h('div', { class: `zone-band ${k} s${si}`, style: { left: a.x - 3 + 'px', top: TOP - 3 + 'px', width: n * cw[si] + 6 + 'px', height: s.dims.cols * CH + 6 + 'px', '--cw': cw[si] + 'px', '--ch': CH + 'px' } },
        h('span', { class: 'zb-print', text: tx(k === 'bet' ? 'prep.label.bet' : 'prep.label.stake') })), fxLayer); }; // under the effect chips
    zone('bet', 0, m0); zone('stake', m0, s.dims.barRows);
    for (let r = 0; r < s.rows; r++) { els.cells[si][r] = [];
      for (let c = 0; c < s.dims.cols; c++) {
        const p = cellPos(si, r, c);
        const el = h('div', { class: `cell ${r < s.dims.meterRows ? 'meter' : 'bar'}`, 'data-at': `${si}:${r}:${c}`, style: { left: p.x + 'px', top: p.y + 'px', width: p.w + 'px', height: CH + 'px' },
          onclick: () => clickCell(si, r, c), ondblclick: () => eatCell(si, r, c), onmouseenter: () => hoverCell(si, r, c), onmouseleave: () => { hoverCell(si, -1, -1); pointAt(null); }, onmousemove: (ev) => pointAt(ev, si, r, c), tip: () => cellTip(si, r, c) });
        els.cells[si][r][c] = el; root.insertBefore(el, layer);
      } }
    const m = s.dims.meterRows, x0 = cellPos(si, si === 0 ? m - 1 : 0, 0).x, x1 = cellPos(si, si === 0 ? s.rows - 1 : m, 0).x;
    const yl = TOP + s.dims.cols * CH + 6;
    // each zone's label carries its own state, under the spaces it is about: which rows hold a chip (what that earns in
    // Charisma, Cunning and Conviction) and which columns are held (what the end of the turn restores)
    const zm = (k) => { const rows = h('span', { class: `zm-rows ${k}`, guide: k === 'bet' ? 'bet-meter' : 'stake-rows', tip: () => rowsTip(s, k) }), bonus = h('em', { class: 'zm-bonus' }),
      cols = h('span', { class: `zm-cols ${k}`, guide: 'restore', tip: () => restoreTip(s, k) }); zoneMeters[si][k] = { rows, bonus, cols }; return [rows, bonus, cols]; };
    root.insertBefore(h('div', { class: `zone-label bet${m * cw[si] < 130 ? ' narrow' : ''}`, style: { left: x0 + 'px', width: m * cw[si] + 'px', top: yl + 'px' } }, h('b', { text: tx('prep.label.bet'), guide: 'position-label', tip: () => positionTip(s, 'meter') }), ...zm('bet')), layer);
    root.insertBefore(h('div', { class: `zone-label stake${s.dims.barRows * cw[si] < 130 ? ' narrow' : ''}`, style: { left: x1 + 'px', width: s.dims.barRows * cw[si] + 'px', top: yl + 'px' } }, h('b', { text: tx('prep.label.stake'), guide: 'position-label', tip: () => positionTip(s, 'bar') }), ...zm('stake')), layer);
  });

  // ---------- tooltips ----------
  // How a position's size comes from its Roller's attributes. Depth runs away from the Stage (rows), width
  // runs along it (lanes), height is how tall a stack may grow.
  const BASE = D.BASE_DIMS;
  function srcList(s, k) { const w = s.why?.[k] || []; return w.length ? w.map(([src, n]) => `${n > 0 ? '+' : ''}${n} ${src}`).join(', ') : 'no bonuses'; }
  function positionTip(s, zone) {
    const d = s.dims, who = s.idx ? s.name + "'s" : 'Your', bal = d.stackMax - BASE.stackMax, ver = d.meterRows - BASE.meterRows, dep = d.barRows - BASE.barRows;
    const meter = zone === 'meter', rows = meter ? d.meterRows : d.barRows, base = meter ? BASE.meterRows : BASE.barRows, extra = meter ? ver : dep, stat = meter ? 'Versatility' : 'Depth', k = meter ? 'versatility' : 'depth';
    const role = meter ? tx('table.the-front-rows-nearest')
      : tx('table.the-back-rows-the');
    const cap = rows * d.cols * d.stackMax;
    return tx('table.deep-wide-high-holds', { who, v: meter ? 'Bet' : 'Stake', rows, cols: d.cols, stackMax: d.stackMax, cap, role, base, v2: extra >= 0 ? '+' : '−', extra: Math.abs(extra), stat, srcList: srcList(s, k), stackMax2: BASE.stackMax, v3: bal >= 0 ? '+' : '−', bal: Math.abs(bal), srcList2: srcList(s, 'balance'), v4: s.why?.note ? `<p class="dim">${s.why.note}</p>` : '', v5: meter ? tx('table.the-stake-behind-it', { barRows: d.barRows, barRows2: BASE.barRows }) : tx('table.the-bet-in-front', { meterRows: d.meterRows, meterRows2: BASE.meterRows }) });
  }
  function cellTip(si, r, c) {
    const s = bout.sides[si], cell = s.grid[r][c], zone = r < s.dims.meterRows ? 'Bet' : 'Stake';
    if (cell.black) return `<b>${D.CALAMITIES.blackhole.name}</b><p>${D.CALAMITIES.blackhole.text}</p>`;
    if (cell.roost) { const eggs = cell.chips.filter((ch) => ch.kind === 'egg'); return tx('table.dragon-roost', { v: eggs.length ? tx('table.line', { eggN: eggs.length }) : '', v2: eggs.length ? tx('table.no-dragon-comes-while', { join: eggs.map((e) => `${e.prog || 0}/5`).join(', '), v: s.idx ? 'its owner' : 'you' }) : tx('table.every-third-turn-it') }); }
    if (cell.link) return cellTip(si, cell.link.r, cell.link.c);
    if (cell.puddle && !cell.chips.length) return tx('table.no-thickness-the-bottom', { chipName: chipName(cell.puddle), v: cell.puddle.ice ? tx('table.frozen-over-it-thaws') : tx('table.water-on-an-empty'), v2: cell.hole ? tx('table.it-fills-a-hole') : '' });
    if (cell.worm && !cell.chips.length) return `<b>${D.CALAMITIES.wormhole.name}</b><p>${D.CALAMITIES.wormhole.text}</p>`;
    if (cell.volcano > 0) return tx('table.left', { name: D.CALAMITIES.volcano.name, volcano: cell.volcano, text: D.CALAMITIES.volcano.text });
    if (cell.hole) return tx('table.hole-nothing-can-be');
    const dimLine = tx('table.row-of-lane-of', { zone, v: zone === 'Bet' ? r + 1 : r - s.dims.meterRows + 1, v2: zone === 'Bet' ? s.dims.meterRows : s.dims.barRows, c: c + 1, cols: s.dims.cols, toUpperCase: zone.toUpperCase() });
    if (!cell.chips.length) return tx('table.empty-space-holds-up', { zone, stackMax: s.dims.stackMax, stackMax2: D.BASE_DIMS.stackMax, stackMax3: s.dims.stackMax - D.BASE_DIMS.stackMax, fxTip: fxTip(si, r, c), dimLine });
    // the stack report first, then the top chip, then the chip under the pointer (move up and down the space to point
    // at each chip: the bottom of the space is the bottom of the stack)
    const groups = []; for (let i = cell.chips.length - 1; i >= 0; i--) { const ch = seenAs(cell.chips[i], si), g = groups[groups.length - 1]; if (g && g.sig === chipSig(ch)) { g.n++; g.lo = i; } else groups.push({ sig: chipSig(ch), ch, n: 1, hi: i, lo: i }); }
    const ti = cell.chips.length - 1, top = seenAs(cell.chips[ti], si), debt = B.debtOf(cell), next = B.debtTarget(cell), hard = B.hardOf(cell), full = B.capacityLeft(s, cell) <= 0;
    const pi = ui.point && ui.point.si === si && ui.point.r === r && ui.point.c === c ? Math.min(ui.point.i, ti) : ti, pt = seenAs(cell.chips[pi], si);
    const sec = (who, ch) => `<div class="chip-sec"><span class="who">${who}</span><b>${chipName(ch)}</b><p>${chipText(ch)}</p>${traitsHtml(traitsOf(ch, { cell }), { title: tx('table.properties') })}</div>`;
    return tx('table.stack-high-worth', { zone, solidCount: B.solidCount(cell), stackMax: s.dims.stackMax, v: full ? ' (full)' : '', cellWorth: B.cellWorth(cell), v2: debt ? tx('table.owes', { debt }) : '', v3: full ? `<p class="keep dim">${vc(tx('table.full-nothing-more-can'), tx('table.full-nothing-more-fits'))}</p>` : '', v4: hard > 0 ? tx('table.hardened-for-more-each', { hard }) : '', v5: B.lifted(cell) ? tx('table.lifted-by-a-heli') : '', v6: cell.anchor ? tx('table.covers-spaces-by', { v: cell.anchor.n || 2 }) : '', v7: cell.cut ? tx('table.a-dormant-volcano-left', { cut: cell.cut }) : '', v8: debt && next ? tx('table.owes-debt-only-pays', { debt, value: next.value, value2: next.value - debt }) : '', v9: debt ? `<p class="dim">${DEBT_RULE}</p>` : '', join: groups.map((g) => `<li class="${pi <= g.hi && pi >= g.lo ? 'pt' : ''}"><span class="chip static mini ${g.sig}"><i>${chipGlyph(g.ch)}</i></span> ${g.n} × ${chipName(g.ch)}${g.hi === ti ? ' <span class="n">top</span>' : ''}</li>`).join(''), v10: cell.puddle ? tx('table.bottom-no-thickness', { chipGlyph: chipGlyph(cell.puddle), chipName: chipName(cell.puddle), v: B.grounded(cell) ? tx('table.grounds-the-frozen-chips') : '' }) : '', v11: si === 0 && !B.canEat(bout, me, r, c) ? (() => { const f = B.foodOf(me, r, c); return tx('table.double-click-to-eat', { label: f.label, join: Object.entries(f.mods).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${D.STATS[k].name}`).join(', '), v: f.turns > 1 ? ` for ${f.turns} turns` : ' this turn' }); })() : '', sec: sec('Top', top), v12: pi !== ti ? (chipSig(pt) === chipSig(top) && chipName(pt) === chipName(top) ? tx('table.pointer-of-from-the', { pi: pi + 1, ti: ti + 1 }) : sec(tx('table.pointer-of-from-the-2', { pi: pi + 1, ti: ti + 1 }), pt)) : `<p class="dim">${vc(tx('table.move-the-pointer-down'), '')}</p>`, fxTip: fxTip(si, r, c), dimLine });
  }
  // which chip of a stack the pointer is on: the space's height is shared out over the chips, bottom to top
  function pointAt(ev, si, r, c) {
    let next = null;
    if (ev) { const cell = bout.sides[si].grid[r][c], n = cell.chips.length;
      if (n && !cell.link) { const rc = ev.currentTarget.getBoundingClientRect(), f = Math.min(0.999, Math.max(0, (rc.bottom - ev.clientY) / rc.height)); const i = Math.floor(f * n); next = { si, r, c, i, id: cell.chips[i].id }; } }
    if ((ui.point?.id ?? null) === (next?.id ?? null) && ui.point?.i === next?.i) return;
    if (ui.point) els.chips.get(ui.point.id)?.classList.remove('pointed');
    ui.point = next; if (next) els.chips.get(next.id)?.classList.add('pointed');
    redrawTip();
  }
  const DEBT_RULE = tx('table.how-debt-works-a');
  function cardTip(uid) {
    const tp = me.tapped.tricks.find((x) => x.trick.uid === uid), e = me.run.find((x) => x.uid === uid), t = e ? e.trick : me.book.find((x) => x.uid === uid) || tp?.trick; if (!t) return '';
    const rv = tp && (me.revive || []).find((x) => x.uid === uid);
    let live = tp ? `<p class="live">${rv ? tx('table.tapped-revived', { v: B.bidVal(rv.ch), base: (rv.base > 0 ? '+' : '') + rv.base }) : B.restorePlan(bout, me).tricks.includes(uid) ? tx('table.tapped-will-restore') : tx('table.tapped-wont-restore') + tx('table.tapped-can-revive', { cost: B.reviveCost(t), roman: D.QROMAN[B.reviveCost(t)] || B.reviveCost(t) })}</p>` : '';
    if (!tp && !e && t.base) live += `<p class="live">${tx('table.trick-base', { base: (t.base > 0 ? '+' : '') + t.base })}</p>`;
    if (e) { const def = D.TRICKS[t.id];
      const P = B.totalParts(me, e);
      const parts = [P.dice.length ? tx('table.tip-dice', { join: P.dice.join(' + '), n: P.diceSum }) : '', P.bid ? tx('table.tip-bid', { n: P.bid }) : '', P.base ? tx('table.tip-base', { n: (P.base > 0 ? '+' : '') + P.base }) : '', P.power ? tx('table.power', { power: P.power }) : '', P.venge ? tx('table.vengeance', { venge: P.venge }) : '', P.plus ? tx('table.tip-mis', { plus: P.plus }) : ''].filter(Boolean).join(', ') + (P.mult !== 1 ? tx('table.quality', { v: +P.mult.toFixed(2) }) : '') + (P.heat !== 1 ? tx('table.last-call', { toFixed: P.heat.toFixed(2) }) : '') + (P.double ? tx('table.2-bonus') : '');
      live = `<p class="live">${parts ? tx('table.tip-total', { parts, total: P.total }) : ''}${B.bonusMet(me, e) ? tx('table.bonus-met') : ''}${e.paid ? tx('table.paid-to-the-house', { join: e.paid.join(' + ') }) : ''}
        ${tx('table.tip-bonus-dice', { n: B.bonusDice(e).length, count: def.count, die: D.defOf(t).die })}
        ${e.state === 'play' ? (e.stack?.length ? tx('table.tip-lingers', { n: e.stack.length }) : tx('table.tip-in-play')) : e.state === 'bid' ? tx('table.tip-bid-on', { n: e.stack?.length || 0 }) : tx('table.tip-needs-bid')}</p>`;
      const fc = e.target ? B.forecastFee(bout, me, e, e.target) : null;
      if (fc && def.type === 'expense') live += tx('table.at-the-marked-target', { fcSummary: fcSummary(fc) }); }
    return trickTip(t, me.cls, live);
  }

  // ---------- element factories ----------
  function mkChip(ch) { const el = h('div', { class: `chip ${chipSig(ch)}` }, h('i', { text: chipGlyph(ch) })); el._sig = chipSig(ch); layer.append(el); return el; }
  // ---------- the toss ----------
  // Thrown dice leave the Pouch together, arc up over the roll and tumble down onto it as their real solids (solid.js),
  // each face showing the die's own value, and land with the rolled value toward you. Heavier dice (more faces) fly lower.
  let tossN = 0;
  function toss(el, d, value, from, to, k) {
    const dur = 950 / ui.speed, delay = (k % 8) * 70 / ui.speed;
    let body, land;
    if (d.chip) { // a flipped chip spins as a coin
      const cs = getComputedStyle(el), dc = cs.getPropertyValue('--dc').trim() || '#efe6cf', sh = cs.getPropertyValue('--sh').trim() || 'none', S = 30;
      body = h('div', { class: 'toss-cube', style: { width: S + 'px', height: S + 'px' } }, ...[value, d.chip.value].map((v, i) => h('div', { class: 'toss-face', style: { transform: `rotateY(${i * 180}deg) translateZ(1px)`, '--dc': dc, '--sh': sh }, text: String(v) })));
      land = null;
    } else {
      const labels = facesOf(d).map(faceValue); let at = labels.findIndex((v) => v === value); if (at < 0) { at = 0; labels[0] = value; } // a roll that changed the value shows it
      const sol = solidEl(d, 30, labels); body = sol.el; const final = sol.faceFront(at), ax = [[1, 0.4, 0.2], [0.3, 1, 0.5], [0.6, 0.2, 1]][k % 3], turns = 2 + (k % 2);
      land = (e) => sol.setRotation(new DOMMatrix().rotateAxisAngleSelf(ax[0], ax[1], ax[2], 360 * turns * (1 - e)).multiplySelf(final));
      land(0);
    }
    const box3 = h('div', { class: 'toss', style: { zIndex: 1300 } }, body); layer.append(box3);
    el.classList.add('tossing');
    const faces = D.DICE[d.type]?.faces || 6, lift = Math.max(50, 130 - faces * 3), mx = (from.x + to.x) / 2, top = Math.min(from.y, to.y) - lift;
    const pos = (x, y, sc = 1) => `translate(${x}px, ${y}px) scale(${sc})`;
    const done = () => { el.classList.remove('tossing'); box3.remove(); };
    box3.animate([{ transform: pos(from.x, from.y, 0.9) }, { transform: pos(mx, top, 1.25), offset: 0.42 }, { transform: pos(to.x, to.y, 1), offset: 0.72 }, { transform: pos(to.x, to.y - 12, 1.04), offset: 0.84 }, { transform: pos(to.x, to.y, 1) }],
      { duration: dur, delay, easing: 'cubic-bezier(.3,.1,.4,1)', fill: 'both' }).finished.then(done, done);
    if (land) { const t0 = performance.now() + delay, spinFor = dur * 0.84;
      const step = (now) => { if (!box3.isConnected) return; const t = Math.min(1, Math.max(0, (now - t0) / spinFor)); land(1 - Math.pow(1 - t, 3)); if (t < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step); }
    else body.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(720deg)' }], { duration: dur * 0.84, delay, easing: 'cubic-bezier(.2,.6,.3,1)', fill: 'both' });
  }
  function mkDie(d, si = 0) {
    const el = h('div', { class: `die ${d.chip ? 'flipc' : d.type} ${d.chip ? '' : dieClass(d)}`, style: d.chip ? {} : dieStyle(d), ...(si ? {} : { 'data-die': d.id }), onclick: si ? null : () => clickDie(d.id) }, h('i', { text: d.type.slice(1) }), d.chip ? null : dieMarks(d), d.chip ? null : dieDyes(d));
    if (!d.chip) el._die = d;
    if (si) { el.classList.add('theirs'); tip(el, () => { const on = B.holderOf(opp, d.id), live = on ? on.dice.find((x) => x.id === d.id) : opp.tray.find((x) => x.id === d.id), v = live ? live.value : '?';
      return d.chip ? tx('table.flipped-chip-landed-on', { value: d.chip.value, v, where: '' }) : dieTip(d, tx('table.rolled', { value: v })); }); layer.append(el); return el; }
    tip(el, () => {
      const on = B.holderOf(me, d.id), live = on ? on.dice.find((x) => x.id === d.id) : me.tray.find((x) => x.id === d.id);
      const tp = me.tapped.dice.find((x) => x.die.id === d.id);
      if (tp) return dieTip(d, B.restorePlan(bout, me).dice.includes(d.id) ? tx('table.tapped-will-restore') : tx('table.tapped-wont-restore'));
      const where = on ? tx('table.on', { name: D.TRICKS[on.trick.id].name, v: B.canMove(bout, me, d.id) ? tx('table.click-to-take-it') : tx('table.it-stays-until-the') }) : live ? tx('table.click-it-then-click') : tx('table.click-to-roll-it');
      if (d.chip) return tx('table.flipped-chip-landed-on', { value: d.chip.value, v: live ? live.value : '?', where });
      return dieTip(d, `${live ? tx('table.rolled', { value: live.value }) : ''}${where}`); });
    layer.append(el); return el;
  }
  // a trick's card shows the chip it makes (or what stands for its effect) beside its name, and its Bonus
  // requirement as a gold badge: how many dice of which size
  const illus = (def) => { const ch = trickChip(def); return ch ? h('span', { class: 'c-illus' }, chipEl(ch, 'mini')) : null; };
  // the Bonus requirement: its dice, laid out in the trick's pattern (trickcard.js)
  const bonusReq = (t, def) => h('span', { class: 'req bonus-req', html: diceHtml(t, def, 'mini'), tip: tx('table.bonus-req-tip', { count: def.count, die: def.die, cond: D.condText(def.bonus.cond), text: def.bonus.text }) });
  // id: what a click, hover or tip on the card means. A card on the Run stands for its entry (e.uid): on a stack the
  // top copy's own uid is not on the Run, so a card that answered to it could not be bid on or aimed.
  function mkCard(t, si = 0, id = t.uid) {
    const def = D.defOf(t), T = D.TYPES[def.type];
    const el = h('div', { class: `tcard ${trickLook(t)}${si ? ' theirs' : ''}`, style: { '--tc': T.color }, ...(si ? {} : { 'data-card': id, onclick: (ev) => clickCard(id, ev), onmouseenter: () => { ui.card = id; marks(); }, onmouseleave: () => { if (ui.card === id) { ui.card = null; marks(); } } }) },
      h('div', { class: 'c-compact' }, illus(def), h('b', { class: 'tk-name', text: def.name }), h('span', { class: 'q', html: trickWord(t) }), bonusReq(t, def)),
      h('div', { class: 'c-open' },
        h('div', { class: 'c-name' }, illus(def), h('b', { class: 'tk-name', text: def.name }), h('span', { class: 'c-stack', 'data-act': 'split', tip: () => stackTip(id) }), h('span', { class: 'q', html: trickWord(t) })),
        h('div', { class: 'c-type' }, T.name, h('span', { class: `xm ${t.foil ? 'up' : ''}`, text: ` ${fmtX(B.multOf(t))}` }), h('span', { class: 'qd', tip: tx('table.quality-2', { QNAME: D.QNAME[t.q], qdieText: D.qdieText(t.q) }) }), h('span', { class: 'tgt', text: 'aim', 'data-act': 'target', tip: tx('table.aim-change-where-this') })),
        h('div', { class: 'c-dice' }), // the dice on it are drawn over this row
        h('div', { class: 'c-bid' }, h('span', { class: 'bidslot', tip: tx('table.bid-space-tip') }), h('div', { class: 'c-math' })), // the roll breakdown sits beside the bid pile
        h('div', { class: 'c-text' }, h('p', {}, h('em', { text: tx('table.roll-2') }), def.roll.text), h('p', { class: 'bonus', tip: tx('table.bonus-dice-tip', { count: def.count, die: def.die }) }, h('em', { text: tx('table.bonus') }), h('span', { class: 'c-need', html: diceHtml(t, def).replace(/class="tk-slot /g, 'class="tk-slot need ') }), def.bonus.text)),
        h('div', { class: 'c-total' }, h('span', { class: 'state' }), h('b', { class: 'num' }))));
    el._tuid = t.uid; tip(el, () => (si ? oppCardTip(id) : cardTip(id))); layer.append(el); return el;
  }
  function stackTip(uid) { const e = [...me.run, ...opp.run].find((x) => x.uid === uid || x.trick.uid === uid); if (!e?.stack?.length) return '';
    return tx('table.stack-tip', { n: 1 + e.stack.length, more: e.stack.length, list: [e.trick, ...e.stack].map((x) => trickWords(x) || D.RARITY.basic.name).join(' → ') }); }
  function oppCardTip(uid) {
    const e = opp.run.find((x) => x.uid === uid); if (!e) return '';
    return trickTip(e.trick, opp.cls, `<p class="live">${e.dice.length ? tx('table.dice-roll-total-2', { join: e.dice.map((d) => d.value).join(' + '), previewTotal: B.previewTotal(opp, e) }) : tx('table.no-dice-on-it')}${e.state === 'bid' ? tx('table.bid-on-it-plays') : e.state === 'play' ? tx('table.in-play-2') : tx('table.shown-not-bid')}</p>`);
  }
  // (--hv: how much the thing grows under the pointer. It is part of this transform, after the move, so the thing grows
  // where it stands; the `scale` property would scale the move too and throw it across the table.)
  const place = (el, x, y, extra = '') => { el.classList.add('placed'); el.style.transform = `translate(${x}px, ${y}px) ${extra} scale(var(--hv, 1))`; };
  function spawn(el, x, y, extra, delay = 0) { // put an element at a starting state without animating, then release it
    el.style.transition = 'none'; el.style.opacity = '0'; place(el, x, y, extra); void el.offsetWidth; el.style.transition = ''; el.style.transitionDelay = delay ? tx('table.ms', { delay }) : '';
    if (delay) setTimeout(() => { el.style.transitionDelay = ''; }, delay + 700);
  }

  // ---------- lit and spent ----------
  // A spent piece leaving the table (their tricks and dice, a played copy of a stack) slides to where it is kept,
  // shrinking and fading on the way, then goes. Yours stay on the table as tapped pieces and simply move there.
  function toPile(el, pile) {
    const L = layer.getBoundingClientRect(), r = pile?.getBoundingClientRect(), k = L.width / (layer.offsetWidth || L.width || 1) || 1;
    if (r?.width) { el.style.transition = 'transform .75s var(--ease), opacity .55s ease-in .25s'; place(el, (r.left - L.left) / k, (r.top - L.top) / k, 'scale(.3)'); }
    el.style.pointerEvents = 'none'; el.style.opacity = '0'; setTimeout(() => el.remove(), 900);
  }
  // sparks off a box (a card's edge, a die): a white flash, then streaks thrown outward from points round its edge
  function sparks(x, y, w, hgt, color, n, r = 9) {
    const out = [h('div', { class: 'spark-flash', style: { width: w + 'px', height: hgt + 'px', transform: `translate(${x}px, ${y}px)`, '--sc': color, '--r': r + 'px' } })];
    for (let i = 0; i < n; i++) {
      const per = 2 * (w + hgt), p = Math.random() * per; let px, py, nx, ny; // a point on the edge and its outward direction
      if (p < w) { px = x + p; py = y; nx = 0; ny = -1; } else if (p < w + hgt) { px = x + w; py = y + p - w; nx = 1; ny = 0; } else if (p < 2 * w + hgt) { px = x + w - (p - w - hgt); py = y + hgt; nx = 0; ny = 1; } else { px = x; py = y + hgt - (p - 2 * w - hgt); nx = -1; ny = 0; }
      const a = Math.atan2(ny, nx) + (Math.random() - 0.5) * 1.6, d = 22 + Math.random() * 46, dx = Math.cos(a) * d, dy = Math.sin(a) * d + 10 + Math.random() * 16; // thrown out, then falling
      out.push(h('i', { class: 'spark', style: { '--x': px + 'px', '--y': py + 'px', '--dx': dx.toFixed(1) + 'px', '--dy': dy.toFixed(1) + 'px', '--rot': `${(Math.atan2(dy, dx) * 180 / Math.PI - 90).toFixed(0)}deg`,
        '--len': `${7 + Math.random() * 10}px`, '--t': `${0.45 + Math.random() * 0.35}s`, '--w': `${(Math.random() * 0.18).toFixed(2)}s`, '--sc': color } }));
    }
    layer.append(...out); setTimeout(() => out.forEach((s) => s.remove()), 1300);
  }
  // a trick that has played goes out: sparks off its edge and its dice, its tube buzzes out and it greys (style.css
  // .spent), and it waits so until the House taps it, when it slides to the tapped pile
  function spend(k) {
    const el = els.cards.get(k), si = k === String(k) && k.startsWith('o') ? 1 : 0, e = sideOf(si).run.find((x) => ckey(si, x.uid) === k); if (!el || !e || ui.spent.has(k)) return false;
    ui.spent.add(k); const cl = cardLayout().get(k), color = D.TYPES[D.defOf(e.trick).type]?.color || '#fff';
    if (cl && !cl.folded) sparks(cl.x, cl.y - 12, cl.w, cl.h, color, 24); // (a card in play stands 12px forward)
    for (const d of e.dice) { const de = els.dice.get(dkey(si, d.id)), m = de && /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(de.style.transform); if (m) sparks(+m[1] + 3, +m[2] + 3, 26, 26, color, 6, 4); }
    return true;
  }

  // ---------- sync: make the screen match the state ----------
  // Effect chips: laid out per side, biggest first; chips of one size stack on one anchor, sizes never overlap.
  const fxEls = new Map(); let fxAt = new Map();
  function layoutEffects() {
    const placed = []; fxAt = new Map();
    bout.sides.forEach((s, si) => {
      const tokens = B.effectChips(bout, s), groups = new Map();
      for (const t of tokens) { const n = Math.min(t.size, s.rows, s.dims.cols), g = `${t.zone}:${n}`; if (!groups.has(g)) groups.set(g, { zone: t.zone, n, list: [] }); groups.get(g).list.push(t); }
      const used = new Set(), m = s.dims.meterRows;
      for (const g of [...groups.values()].sort((x, y) => y.n - x.n)) {
        const rowsPref = g.zone === 'meter' ? [...Array(s.rows).keys()] : [...Array(s.rows).keys()].reverse();
        let at = null;
        for (const r0 of rowsPref) { if (r0 + g.n > s.rows) continue; if (g.zone === 'meter' && r0 >= m && at) break;
          for (let c0 = 0; c0 + g.n <= s.dims.cols && !at; c0++) { let ok = true; for (let dr = 0; dr < g.n && ok; dr++) for (let dc = 0; dc < g.n && ok; dc++) if (used.has(`${r0 + dr}:${c0 + dc}`)) ok = false; if (ok) at = { r: r0, c: c0 }; }
          if (at) break; }
        if (!at) continue;
        for (let dr = 0; dr < g.n; dr++) for (let dc = 0; dc < g.n; dc++) { const k = `${si}:${at.r + dr}:${at.c + dc}`; used.add(`${at.r + dr}:${at.c + dc}`); fxAt.set(k, [...(fxAt.get(k) || []), ...g.list]); }
        g.list.forEach((t, lvl) => placed.push({ ...t, si, r: at.r, c: at.c, n: g.n, lvl }));
      }
    });
    const keep = new Set();
    for (const t of placed) {
      const k = `${t.si}:${t.key}`; keep.add(k); let el = fxEls.get(k);
      if (!el) { el = h('div', { class: `fxchip ${t.good ? 'good' : 'bad'}` }, h('i'), h('b'), h('small')); fxLayer.append(el); fxEls.set(k, el); el.style.opacity = '0'; requestAnimationFrame(() => { el.style.opacity = ''; }); }
      const rr = t.si === 0 ? t.r + t.n - 1 : t.r, p = cellPos(t.si, rr, t.c), w = t.n * cw[t.si], hh = t.n * CH, pad = 4 + (3 - t.n);
      Object.assign(el.style, { left: `${p.x + pad}px`, top: `${p.y + pad - t.lvl * 5}px`, width: `${w - pad * 2}px`, height: `${hh - pad * 2}px`, zIndex: 1 + t.lvl });
      el.className = `fxchip s${t.n} ${t.good ? 'good' : 'bad'}`; iconFill(el.children[0], 'chip:' + t.key, t.glyph); el.children[1].textContent = t.value === '' ? '' : String(t.value); el.children[2].textContent = t.name;
    }
    for (const [k, el] of fxEls) if (!keep.has(k)) { el.style.opacity = '0'; fxEls.delete(k); setTimeout(() => el.remove(), 400); }
  }
  const fxTip = (si, r, c) => { const list = fxAt.get(`${si}:${r}:${c}`) || []; return list.length ? tx('table.effects', { join: list.map((t) => `<b style="color:${t.good ? 'var(--good)' : 'var(--bad)'}">${t.name}${t.value !== '' ? ' ' + t.value : ''}</b><span class="v">: ${t.text}</span>`).join('; ') }) : ''; };
  // folds: which columns are folded, what their spines show, and where the Run (and the feed above it) reaches
  function syncFolds() {
    if (ui.peek && (ui.peekPhase !== bout.phase || (ui.peek === 'book' ? bookOpen() : diceOpen()))) ui.peek = null; // a peek lasts while its column stays folded, in the phase it was opened
    const fb = !bookOpen(), fd = !diceOpen();
    root.classList.toggle('fold-book', fb); root.classList.toggle('fold-dice', fd);
    root.classList.toggle('peek-book', ui.peek === 'book'); root.classList.toggle('peek-dice', ui.peek === 'dice');
    spines.book.classList.toggle('peeking', ui.peek === 'book'); spines.dice.classList.toggle('peeking', ui.peek === 'dice');
    const tapN = (n) => (n ? ` · ${tx('table.tapped-n', { n })}` : '');
    swapText(spines.book.children[0], `${tx('table.book')} ${me.book.length}${tapN(me.tapped.tricks.length)}`); swapText(spines.dice.children[0], `${tx('table.pouch')} ${me.pouch.length}${tapN(me.tapped.dice.length)}`);
    syncList(spines.book.children[1], me.book, (t) => t.uid, (t) => h('i', { style: { '--tc': D.TYPES[D.defOf(t).type].color } }), () => {});
    syncList(spines.dice.children[1], me.pouch.slice(0, 12), (d) => `${d.id}:${d.mat || ''}`, (d) => dieEl(d, '', 'mini'), () => {});
    // your half: the Run leans on your dice column, by the middle of the screen
    const R = runSpan(), dx = diceAt();
    runEmpty.style.left = R.l + 'px'; runEmpty.style.width = R.w + 'px'; ztRun.style.left = R.l + 6 + 'px';
    for (const el of [ztRoll, ztPouch]) el.style.left = dx + 6 + 'px';
    trayBox.style.left = dx + 'px'; trayCap.style.left = dx + 84 + 'px'; trayBox.style.height = trayRows(0) * 36 + 8 + 'px'; ztPouch.style.top = DY.pouch + 'px';
    spines.dice.style.left = R.dice + 'px'; peekPanels.dice.style.left = R.dice - 212 + 'px';
    // their half, mirrored: dice by the middle, then their Run, their Book (closed) at the far edge
    const O = runSpan(1), od = diceOpen(1);
    oppEmpty.style.left = O.l + 'px'; oppEmpty.style.width = O.w + 'px'; oppEmpty.style.opacity = opp.run.length ? 0 : 1; them.run.style.left = O.l + 6 + 'px';
    for (const el of [them.roll, them.pouch]) el.style.left = O.dice + 6 + 'px';
    them.tray.style.left = O.dice + 'px'; them.tray.style.height = trayRows(1) * 36 + 8 + 'px'; them.pouch.style.top = DICE_Y + trayRows(1) * 36 + 14 + 'px'; them.dspine.style.left = O.dice + 'px'; them.bspine.style.left = O.book + 'px';
    for (const el of [them.roll, them.pouch, them.tray]) el.classList.toggle('away', !od); them.dspine.classList.toggle('away', od);
    them.tray.classList.toggle('has', opp.tray.length > 0);
    swapText(them.pouch, `${tx('table.pouch')} ${opp.pouch.length}`); swapText(them.dspine.firstChild, `${tx('table.pouch')} ${opp.pouch.length}`); swapText(them.bspine.firstChild, `${tx('table.book')} ${opp.book.length}`);
  }
  function sync(fx = {}) {
    const plan = B.restorePlan(bout, me); // the live restore preview: follows the board after every action
    syncFolds(); syncLedger(); syncMeters(); queueMicrotask(drawHand);
    layoutEffects();
    const cards = cardLayout();
    // trick cards
    for (const [uid, cl] of cards) {
      const t = cl.e ? cl.e.trick : cl.t, s = sideOf(cl.si), mine = cl.si === 0; let el = els.cards.get(uid);
      if (el && cl.e && el._tuid !== t.uid) { if (el.classList.contains('spent')) toPile(el, cl.si ? them.bspine : spines.book); else el.remove(); els.cards.delete(uid); el = null; } // the next copy of a stack is on top: its own print
      if (!el) { el = mkCard(t, cl.si, cl.e ? cl.e.uid : t.uid); els.cards.set(uid, el); spawn(el, cl.x, cl.y + 20, ''); el.style.width = cl.w + 'px'; el.style.height = cl.h + 'px'; void el.offsetWidth; }
      el.style.opacity = cl.folded ? '0' : '1'; el.style.pointerEvents = cl.folded ? 'none' : ''; place(el, cl.x, cl.y); el.style.width = cl.w + 'px'; el.style.height = cl.h + 'px';
      el.classList.toggle('open', cl.open); el.style.zIndex = cl.peek ? 9 : cl.open ? 3 : 2;
      const e = cl.e; el.classList.toggle('narrow', cl.open && cl.w < 104);
      el.classList.toggle('bid', !!e && e.state === 'bid'); el.classList.toggle('inplay', !!e && e.state === 'play');
      // lit: bid on, so it is going to play (a neon tube round it); spent: it has played and gone out (see spend)
      const spent = !!e && ui.spent.has(uid), lit = !!e && !spent && (e.state === 'bid' || e.state === 'play');
      if (lit && !el.classList.contains('lit') && !ui.first) sfx('lit', 0, { pan: cl.si ? 0.5 : -0.3 });
      el.classList.toggle('lit', lit); el.classList.toggle('spent', spent);
      if (mine) {
        el.classList.toggle('can', !e ? !ui.locked && !B.canDraw(bout, me, uid) : false);
        const tapped = !e && !me.book.some((x) => x.uid === uid); el.classList.toggle('tapped', tapped); el.classList.toggle('restoring', tapped && plan.tricks.includes(uid));
        const htop = ui.hand[ui.hand.length - 1]; // a chip in hand can bring a tapped trick back
        el.classList.toggle('reviving', tapped && plan.revived.includes(uid));
        if (tapped) el.classList.toggle('pick', bout.phase === 'bid' && !!htop && !B.canRevive(bout, me, uid, htop.r, htop.c));
        if (e) el.classList.toggle('pick', ui.mode === 'die' ? !B.canPlace(bout, me, ui.die, e) : ui.hand.length > 0 && !B.canBidMany(bout, me, e, ui.hand));
        el.classList.toggle('active', !!e && ui.entry === e.uid && ui.mode === 'target');
      }
      if (e) {
        const def = D.TRICKS[t.id], met = B.bonusMet(s, e);
        el.querySelector('.bonus').classList.toggle('met', met); el.querySelector('.bonus').classList.toggle('na', !!def.cls && def.cls !== s.cls);
        el.querySelector('.tgt').classList.toggle('on', mine && e.state === 'bid' && B.needsTarget(e));
        const xm = el.querySelector('.xm'), qd = el.querySelector('.qd'), qs = B.qState(e), et = B.effTrick(e); // Upgrade chips and the quality die change the multiplier as it stands
        swapText(xm, ` ${fmtX(B.multOf(et))}`); xm.classList.toggle('up', (et.foil || 0) > 0); xm.classList.toggle('dud', qs === 'dud');
        swapText(qd, e.qroll != null ? `${D.QDIE[t.q].die}:${e.qroll}` : ''); qd.classList.toggle('dud', qs === 'dud'); qd.classList.toggle('hot', qs === 'hot');
        const stackN = (e.stack || []).length;
        swapText(el.querySelector('.state'), e.state === 'play' ? (stackN ? tx('table.state-lingers', { n: stackN }) : tx('table.state-in-play')) : e.state === 'bid' ? tx('table.state-bid', { n: e.bidValue }) : tx('table.state-needs-bid'));
        swapText(el.querySelector('.c-stack'), stackN ? `⧉ ×${stackN + 1}` : ''); el.classList.toggle('stacked', stackN > 0); el.style.setProperty('--stack', Math.min(3, stackN));
        // the BID ring stays beside the pile: BID while empty, + once bid (each chip bid adds its value)
        const live = e.dice.length || e.state !== 'shown';
        tween(el.querySelector('.c-total .num'), B.previewTotal(s, e), (n) => (live ? '= ' + Math.round(n) : ''));
        const P = B.totalParts(s, e), bits = e.dice.length ? [P.dice.join('+')] : [];
        if (live) { if (P.bid) bits.push(tx('table.bid-plus', { n: P.bid })); if (P.base) bits.push(tx('table.base-plus', { n: (P.base > 0 ? '+' : '') + P.base })); if (P.power) bits.push(tx('table.pow', { power: P.power })); if (P.venge) bits.push(tx('table.venge', { venge: P.venge })); if (P.plus) bits.push(tx('table.mis-plus', { plus: P.plus })); if (P.mult !== 1) bits.push(`×${+P.mult.toFixed(2)}`); if (P.heat !== 1) bits.push(tx('table.call', { toFixed: P.heat.toFixed(2) })); if (P.double) bits.push('×2'); }
        swapText(el.querySelector('.c-math'), bits.join(' '));
        const nb = B.bonusDice(e).length; [...el.querySelectorAll('.c-need .need')].forEach((x, i) => x.classList.toggle('full', i < nb)); // the Bonus dice in, one pip each
      }
    }
    for (const [uid, el] of els.cards) if (!cards.has(uid)) { els.cards.delete(uid); if (el.classList.contains('spent')) toPile(el, them.bspine); else { el.style.opacity = '0'; setTimeout(() => el.remove(), 500); } } // their spent tricks slide to their Book

    // dice: Pouch (unrolled), Rolled tray (value showing, not placed yet), or on a trick
    const wantDice = new Map(), tapD = B.tappedInOrder(me).dice.map((x) => x.die), nPD = me.pouch.length + tapD.length;
    me.pouch.forEach((d, i) => { const p = pouchSlot(i, nPD); wantDice.set(d.id, { ...p, y: p.y - (ui.sel.has(d.id) ? 7 : 0), d, picked: ui.sel.has(d.id) }); });
    tapD.forEach((d, i) => wantDice.set(d.id, { ...pouchSlot(me.pouch.length + i, nPD), d, tapped: true, restoring: plan.dice.includes(d.id) }));
    me.tray.forEach((d, i) => wantDice.set(d.id, { ...traySlot(i), d, value: d.value, rolled: true }));
    const glow = (si, e) => { const k = ckey(si, e.uid), sp = ui.spent.has(k); return { spent: sp, lit: !sp && (e.state === 'bid' || e.state === 'play'), lc: D.TYPES[D.defOf(e.trick).type]?.color }; }; // dice on a trick light and go out with it
    for (const e of me.run) { const cl = cards.get(e.uid), bd = new Set(B.bonusDice(e).map((x) => x.id)), g = glow(0, e); e.dice.forEach((d, i) => wantDice.set(d.id, { ...dieSlot(cl, i, e.dice.length), d, value: d.value, rolled: true, on: true, bonus: bd.has(d.id), ...g })); }
    opp.tray.forEach((d, i) => wantDice.set(dkey(1, d.id), { ...traySlot(i, 1), d, value: d.value, rolled: true, si: 1 })); // their roll lands as the Bid opens
    for (const e of opp.run) { const cl = cards.get(ckey(1, e.uid)), bd = new Set(B.bonusDice(e).map((x) => x.id)), g = glow(1, e); e.dice.forEach((d, i) => wantDice.set(dkey(1, d.id), { ...dieSlot(cl, i, e.dice.length), bonus: bd.has(d.id), d, value: d.value, rolled: true, on: true, si: 1, ...g })); }
    for (const [id, w] of wantDice) {
      let el = els.dice.get(id); if (!el) { el = mkDie(w.d, w.si); els.dice.set(id, el); const from = (w.d.chip && els.flipFrom?.get(id)) || { x: w.x, y: w.y - 16 }; spawn(el, from.x, from.y, 'scale(.4)'); }
      const from = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(el.style.transform);
      el.style.opacity = w.folded ? '0' : '1'; el.style.pointerEvents = w.folded ? 'none' : ''; place(el, w.x, w.y, w.folded ? 'scale(.5)' : ''); el.style.zIndex = w.on ? 6 : ui.peek === 'dice' ? 9 : 4; el.classList.toggle('on', !!w.on); el.classList.toggle('rolled', !!w.rolled); el.classList.toggle('sel', (ui.mode === 'die' && ui.die === id) || !!w.picked);
      el.classList.toggle('fixed', !!w.on && (!!w.si || !B.canMove(bout, me, id))); el.classList.toggle('tapped', !!w.tapped); el.classList.toggle('restoring', !!w.restoring); el.classList.toggle('bonusd', !!w.bonus);
      el.classList.toggle('lit', !!w.lit); el.classList.toggle('spent', !!w.spent); if (w.lc) el.style.setProperty('--lc', w.lc);
      const label = el.firstChild, text = w.rolled ? String(w.value) : w.d.type.slice(1);
      if (!w.d.chip && el._text !== text) dress3d(el, w.d, w.rolled ? w.value : undefined);
      if (w.rolled && !el._rolled) { label.textContent = text; sfx('roll'); toss(el, w.d, w.value, from ? { x: +from[1], y: +from[2] } : { x: w.x, y: w.y + 90 }, { x: w.x, y: w.y }, tossN++); }
      else if (label.textContent !== text && !el.classList.contains('rolling')) label.textContent = text;
      el._text = text; el._rolled = !!w.rolled;
    }
    els.flipFrom = null;
    for (const [id, el] of els.dice) if (!wantDice.has(id)) { els.dice.delete(id); if (el.classList.contains('spent')) toPile(el, them.dspine.classList.contains('away') ? them.pouch : them.dspine); else { el.style.opacity = '0'; setTimeout(() => el.remove(), 500); } } // their spent dice slide to their Pouch
    trayBox.classList.toggle('has', me.tray.length > 0); trayBox.classList.toggle('ready', bout.phase === 'roll' && !me.thrown);
    swapText(trayBox, bout.phase === 'draw' ? (me.tray.length ? '' : tx('table.draw-then-press-roll')) : bout.phase === 'roll' && !me.thrown && !me.tray.length ? (selCount() ? tx('table.picked-press-bid', { selCount: selCount() }) : tx('table.pick-up-to-dice', { tipOf: B.tipOf(me, 'proficiency') })) : me.tray.length ? '' : bout.phase === 'aim' ? tx('table.all-placed') : tx('table.rolled-for-this-turn'));
    trayCap.textContent = `thrown ${me.used.roll}/${B.tipOf(me, 'proficiency')}${me.tray.length ? tx('table.in-the-roll', { trayN: me.tray.length }) : ''}`;

    // chips
    const want = new Map();
    bout.sides.forEach((s, si) => { for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.dims.cols; c++) { const cell = s.grid[r][c];
      const fn = cell.anchor?.n || 2; // a Big chip or Volcano covers 2×2; big made chips 2, 3 or 5 a side
      if (cell.anchor && r + fn - 1 < s.rows && c + fn - 1 < s.dims.cols) { const a = cellPos(si, r, c), b2 = cellPos(si, r + fn - 1, c + fn - 1), cx = (a.x + b2.x) / 2 + a.w / 2, cy = (a.y + b2.y) / 2 + CH / 2;
        cell.chips.forEach((ch, lvl) => want.set(ch.id, { x: cx - CHIP / 2, y: cy - CHIP / 2 + 10 * ck[si] - Math.min(lvl, 12) * 5 * ck[si], z: 20 + c * 40 + lvl, ch: seenAs(ch, si), side: si, s: (ch.big || ch.kind === 'volcano' ? 1.9 : B.footOf(ch) > 1 ? B.footOf(ch) * 0.95 : 1) * ck[si] })); }
      else cell.chips.forEach((ch, lvl) => { if (ch.mat) { const n = ch.mat.n, a = cellPos(si, ch.mat.r, ch.mat.c), b2 = cellPos(si, ch.mat.r + n - 1, ch.mat.c + n - 1); // a flat chip lies under its whole footprint
          want.set(ch.id, { x: (a.x + b2.x) / 2 + a.w / 2 - CHIP / 2, y: (a.y + b2.y) / 2 + CH / 2 - CHIP / 2, z: 2, ch: seenAs(ch, si), side: si, s: n * 0.95 * ck[si], mat: true }); return; }
        want.set(ch.id, { ...chipPos(si, r, c, lvl - (cell.chips[0]?.mat ? 1 : 0)), ch: seenAs(ch, si), side: si }); }); } });
    // bids pile on their trick's BID ring (click the pile to take its top chip back; click the card to bid more)
    [0, 1].forEach((si) => { for (const e of sideOf(si).run) { const k = ckey(si, e.uid), cl = cards.get(k); if (!cl || !e.bid.length) continue; const sp = bidSpot(els.cards.get(k));
      e.bid.forEach((ch, i) => want.set(ch.id, { x: cl.x + sp.x, y: cl.y + sp.y - i * 3, z: 900 + i, ch, side: si, unbid: si ? null : e.uid })); } });
    [0, 1].forEach((si) => (sideOf(si).revive || []).forEach((x, i) => { if (x.paid) return; const cl = si === 0 ? cards.get(x.uid) : null, R = runSpan(si);
      const at = cl && !cl.folded ? { x: cl.x + cl.w - CHIP - 2, y: cl.y + (cl.h - CHIP) / 2 } : { x: (si === 0 ? R.book : R.book - 6) + i * 5, y: RUN_Y - 22 - i * 3 };
      want.set(x.ch.id, { ...at, z: 905 + i, ch: x.ch, side: si, unrevive: si ? null : x.uid }); }));
    const flipIds = new Set(ui.flips.map(({ r, c }) => B.bidChip(me, r, c)?.id)), handIds = new Set((B.handChips(me, ui.hand) || []).map((x) => x.ch.id));
    // the Pit: every chip each Roller has lost, as it was
    [0, 1].forEach((si) => { const list = B.pitOf(bout, si), hts = new Map(); list.forEach((ch, k) => { const key = ch.col == null ? 'mid' : ch.col + ':' + ch.row, lvl = hts.get(key) || 0; hts.set(key, lvl + 1); void k;
      want.set(ch.id, { ...pitSlot(si, ch, lvl), ch, side: si, pit: true }); }); });
    let n = 0;
    for (const [id, w] of want) {
      let el = els.chips.get(id); const sc = w.s || w.k || 1, extra = sc !== 1 ? `scale(${+sc.toFixed(3)})` : '';
      if (!el) { el = mkChip(w.ch); els.chips.set(id, el);
        if (fx[id] === 'from-stage' || fx[id] === 'from-pit') spawn(el, STAGE[w.side].x, STAGE[w.side].y, 'scale(.5)');
        else if (fx[id] === 'debt') spawn(el, HOUSE.x, HOUSE.y + 30, 'scale(.5)'); // Debt is dealt out by the House
        else if (fx[id] === 'spawn' && !ui.first && !w.pit) { spawn(el, w.x, w.y - 34, 'scale(.8)'); sfx('spawn'); sfx('land', 250, { pan: w.side ? 0.5 : -0.3 }); } // made chips appear just above their space, then land
        else if (ui.first) spawn(el, w.x, w.y - 46, '', Math.min(900, n * 5));
        else spawn(el, w.x, w.y, 'scale(.1)'); n++; }
      if (!ui.first && el._at && (Math.abs(el._at[0] - w.x) > 30 || Math.abs(el._at[1] - w.y) > 30) && !w.pit && bout.phase === 'resolve') sfx('move', 0, { pan: w.side ? 0.5 : -0.3 }); // the board moves chips: heard
      el._at = [w.x, w.y];
      el._side = w.side; el.style.opacity = '1'; el.style.zIndex = w.z; place(el, w.x, w.y, extra); el.classList.toggle('inpit', !!w.pit); el.classList.toggle('mat', !!w.mat);
      if (w.pit) el._tip = () => tx('table.on-turn', { chipTip: chipTip(w.ch), v: w.ch.from === 'bid' ? tx('table.bid-to-the-house') : tx('table.lost-to-a-fee'), turn: w.ch.turn });
      el.classList.toggle('flipsel', flipIds.has(id)); el.classList.toggle('bidsel', handIds.has(id)); el.classList.toggle('handsel', handIds.has(id));
      el.classList.toggle('pointed', ui.point?.id === id);
      const unb = (w.unbid || w.unrevive) && bout.phase === 'bid' && !ui.locked; el.classList.toggle('unbid', !!unb); el.onclick = unb ? (ev) => { ev.stopPropagation(); if (w.unrevive) clickTapped(w.unrevive, el); else clickBidChip(w.unbid, id); } : null; if (unb) el._tip = () => tx('table.bid-3', { value: B.bidVal(w.ch), vc: vc(tx('table.click-to-take-this'), tx('table.click-to-take-it-2')) }); else if (el._tip) { delete el._tip; el.classList.remove('has-tip'); }
      const sig = chipSig(w.ch);
      if (el._sig !== sig) { el._sig = sig; pulse(el, 'mutate'); setTimeout(() => { el.className = `chip ${sig} mutate`; el.firstChild.textContent = chipGlyph(w.ch); }, 170); }
    }
    for (const [id, el] of els.chips) if (!want.has(id)) {
      const how = fx[id] || 'void', m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(el.style.transform), x = +m[1], y = +m[2];
      el.style.zIndex = 950; el.style.opacity = '0';
      if (how === 'stage') { sfx('pay', 0, { pan: el._side ? 0.5 : -0.3 }); el.classList.add('paying'); place(el, STAGE[el._side].x, STAGE[el._side].y, 'scale(.6)'); }
      else if (how === 'house') { el.classList.add('paying'); place(el, HOUSE.x, HOUSE.y, 'scale(.5)'); }
      else if (how === 'gone') { sfx('pay', 0, { pan: 0 }); el.classList.add('falling'); place(el, (PIT.left + PIT.right) / 2 - CHIP / 2, y, 'scale(.12) rotate(200deg)'); } // no room left in the Pit: down the middle, for good
      else if (how === 'abduct') place(el, x, y - 190, 'scale(.7)');
      else place(el, x, y - 6, 'scale(.1) rotate(140deg)');
      els.chips.delete(id); setTimeout(() => el.remove(), 620);
    }
    ui.first = false;
    // (the Pit's chips are drawn with the other chips above)

    // cells, creatures, numbers
    const tags = [];
    bout.sides.forEach((s, si) => { for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.dims.cols; c++) { const el = els.cells[si][r][c], cell = s.grid[r][c], debt = B.debtOf(cell); el.classList.toggle('hole', !!cell.hole); el.classList.toggle('hard', B.hardOf(cell) > 0); el.classList.toggle('puddle', !!cell.puddle); el.classList.toggle('puddle-under', !!cell.puddle && cell.chips.length > 0); el.classList.toggle('ice', !!cell.puddle?.ice); el.classList.toggle('link', !!cell.link || !!cell.anchor); el.classList.toggle('cut', !!cell.cut); el.classList.toggle('lifted', B.lifted(cell)); el.classList.toggle('black', !!cell.black); el.classList.toggle('worm', !!cell.worm); el.classList.toggle('roost', !!cell.roost); el.classList.toggle('egg', !!cell.roost && cell.chips.some((ch) => ch.kind === 'egg')); el.classList.toggle('food', si === 0 && !B.canEat(bout, me, r, c)); el.classList.toggle('volcano', cell.volcano > 0); el.classList.toggle('owes', debt > 0);
      if (debt) { const next = B.debtTarget(cell); tags.push({ k: `${si}:${r}:${c}`, si, r, c, text: next ? tx('table.of', { debt, value: next.value }) : `owes ${debt}` }); } } });
    syncTags(tags);
    // creatures fly over the stacks, bees with them; orbital chips (weather, vehicles) ride above them
    const flyers = [...bout.creatures.map((cr) => ({ key: 'c' + cr.id, side: cr.side, r: cr.r, c: cr.c, gone: cr.gone, late: cr.arrive > bout.turn, icon: 'creature:' + cr.kind, glyph: D.CREATURES[cr.kind].glyph, cls: `creature cr-${cr.kind}`,
      tip: () => `<b>${D.CREATURES[cr.kind].name}</b>${flavorP('CREATURES', cr.kind)}${D.CREATURES[cr.kind].hits ? tx('table.of-hits-left', { hits: D.CREATURES[cr.kind].hits - (cr.dmg || 0), hits2: D.CREATURES[cr.kind].hits }) : ''}<p>${D.CREATURES[cr.kind].text}</p>${cr.hold?.length ? tx('table.holds-of-stolen-gold', { sum: sum(cr.hold, (x) => x.value) }) : ''}${traitsHtml(flyerTraits(cr.kind))}` })),
      ...bout.sides.flatMap((s) => s.bees.map((bee) => ({ key: 'b' + bee.id, side: s.idx, r: bee.r, c: bee.c, icon: 'creature:bee', glyph: '🐝', cls: 'creature bee', tip: tx('table.bumble-bee-left-a', { life: bee.life }) }))),
      ...bout.sides.flatMap((s) => s.sky.filter((o) => D.ORBITALS[o.kind].size !== 'table').map((o) => ({ key: 's' + o.id, side: s.idx, r: o.r, c: o.c, icon: 'orbital:' + o.kind, glyph: D.ORBITALS[o.kind].glyph, cls: `creature orbital or-${o.kind}`, out: o.c < 0,
        tip: () => `<b>${D.ORBITALS[o.kind].name}</b>${o.str ? tx('table.strength', { str: o.str }) : ''}<p>${D.ORBITALS[o.kind].text}</p>${flavorP('ORBITALS', o.kind)}${traitsHtml(flyerTraits(o.kind, true))}` })))];
    const live = new Set();
    for (const f of flyers) {
      let el = els.creatures.get(f.key); const on = f.r >= 0 && !f.out, p = on ? cellPos(f.side, f.r, Math.max(0, f.c)) : { x: f.side === 0 ? 300 : 960, y: 44, w: 40 };
      if (!el) { if (f.gone || f.late) continue; el = h('div', { class: f.cls, tip: f.tip }, ...iconKids(f.icon, f.glyph)); layer.append(el); els.creatures.set(f.key, el); spawn(el, p.x, -40, ''); }
      live.add(f.key);
      if (f.gone) { el.style.opacity = '0'; place(el, p.x + (f.side === 0 ? -200 : 200), -60); els.creatures.delete(f.key); setTimeout(() => el.remove(), 800); continue; }
      el.style.opacity = '1'; place(el, p.x + p.w / 2 - 16, p.y - (f.cls.includes('orbital') ? 26 : f.cls.includes('bee') ? 2 : 14));
    }
    for (const [key, el] of els.creatures) if (!live.has(key)) { el.style.opacity = '0'; els.creatures.delete(key); setTimeout(() => el.remove(), 800); }
    bout.sides.forEach((s, si) => { const big = s.sky.filter((o) => D.ORBITALS[o.kind].size === 'table'), w = weatherEls[si];
      for (const k of ['blizzard', 'sun', 'moon']) w.classList.toggle(k, big.some((o) => o.kind === k));
      w._tip = big.length ? () => big.map((o) => `<b>${D.ORBITALS[o.kind].name}</b>${o.str ? tx('table.strength', { str: o.str }) : ''}<p>${D.ORBITALS[o.kind].text}</p>`).join('') : null; });
    bout.sides.forEach((s, si) => { const owed = owedBy(s); swapText(owesEl[si], owed ? tx('table.owes-2', { owed }) : ''); tween(worthEl[si], B.worth(s)); tween(stageEl[si], sum(B.pitOf(bout, si), (ch) => ch.value)); { const g = sum(B.goneOf(bout, si), (x) => x.value); tween(goneEl[si], g); goneEl[si].parentElement.classList.toggle('some', g > 0); } syncList(badgeBox[si], badges(s), (x) => x.k, (x) => h('span', { class: `badge ${x.cls || ''}`, tip: x.tip, ...(GUIDE_BADGE[x.k] ? { guide: GUIDE_BADGE[x.k] } : {}) }), (el, x) => { swapText(el, x.text); el.className = `badge ${x.cls || ''}`; }); });
    swapText(root.querySelector('.turn-n'), String(bout.turn));
    for (const el of oppPills.children) { const k = el.dataset.k, P = B.statParts(opp, k); swapText(el.lastChild, String(P.total)); tempCls(el, P); }
    const at = B.PHASES.indexOf(bout.phase);
    STEPS.forEach(([k, , stat], i) => { swapText(pill[k], stat ? `${B.rewardOf(me, k).unused}/${B.tipOf(me, stat)}` : tx('table.to-aim', { filterN: me.run.filter((x) => x.state === 'bid' && B.needsTarget(x)).length })); pillEl[k].classList.toggle('now', i === at && !ui.locked); pillEl[k].classList.toggle('done', at < 0 || i < at);
      if (stat) tempCls(pillEl[k], B.statParts(me, stat));
 });
    setOn(sipBtn, !ui.locked && !B.canSip(bout, me)); sipBtn.classList.toggle('gone', !me.drink);
    runEmpty.style.opacity = me.run.length ? 0 : 1;
    setOn(undoBtn, !ui.locked && (bout.phase === 'draw' ? me.used.draw > 0 : bout.phase === 'roll' ? selCount() > 0 : bout.phase === 'bid' ? me.used.bid > 0 : bout.phase === 'aim' ? B.placedThisTurn(bout, me) || ui.handAim.size > 0 : false));
    if (bout.phase === 'roll' && !me.thrown && !ui.locked) B.setPick(bout, me, [...ui.sel], ui.flips.slice());
    setOn(commitBtn, !ui.locked); swapText(commitBtn, commitLabel()); commitBtn.classList.toggle('go', commitReady()); commitBtn.classList.toggle('wait', !commitReady());
    const w = !ui.locked && B.rewardOf(me, bout.phase === 'roll' ? 'roll' : bout.phase); // what passing this step keeps
    commitBtn.dataset.kept = w && w.n ? (bout.phase === 'draw' ? tx('table.keeps-steal', { n: w.n }) : bout.phase === 'roll' ? tx('table.keeps-power', { n: w.n }) : tx('table.keeps-opp', { n: w.n })) : ''; commitBtn.classList.toggle('allused', !!(w && !w.unused));
    // the phase signs: the Rollers' step lit while it is played (earlier ones stay warm), the House's set while it plays
    const housePlays = !!ui.playing || bout.phase === 'resolve' || bout.phase === 'drink', pAt = PLAN.findIndex((x) => x[0] === bout.phase);
    phasesEl.classList.toggle('house-on', housePlays);
    PLAN.forEach(([k], i) => { planEls[k].classList.toggle('on', i === pAt); planEls[k].classList.toggle('done', pAt >= 0 && i < pAt); });
    lightsAt(housePlays ? 'chase' : me.heat > 1 ? 'idle hot' : 'idle');
    for (const ph of ['draw', 'roll', 'bid', 'aim', 'drink', 'resolve']) root.classList.toggle('ph-' + ph, bout.phase === ph); root.classList.toggle('locked', ui.locked); root.classList.toggle('thrown', !!me.thrown);
    marks(); refreshTip();
  }
  const selCount = () => ui.sel.size + ui.flips.length;
  // the button names the next step: Roll (end drawing), Bid (throw the picked dice as the Bid opens), Bluff, Play
  const commitLabel = () => (bout.phase === 'drink' ? tx('table.next-turn') : bout.phase === 'draw' ? 'Roll' : bout.phase === 'roll' ? 'Bid' : bout.phase === 'bid' ? 'Bluff' : 'Play');
  const commitReady = () => !B.needOf(bout, me);
  function commitTip() {
    const need = B.needOf(bout, me), w = B.rewardOf(me, bout.phase), n = selCount();
    if (bout.phase === 'drink') return tx('table.next-turn-2', { vc: vc(tx('table.close-the-drink-phase'), tx('table.end-the-round')) });
    const keeps = w ? (w.n ? tx('table.passing-now-leaves-of', { unused: w.unused, total: w.total, v: REWARD_CHIP[bout.phase](w.n) }) : tx('table.all-used-passing-keeps')) : '';
    const what = bout.phase === 'draw' ? [tx('table.done-drawing-move-on'), tx('table.done-drawing')]
      : bout.phase === 'roll' ? [tx('table.roll-and-move-on', { v: n ? `the ${n} picked ${n === 1 ? 'die' : 'dice'}${ui.flips.length ? tx('table.a-flipped-chip', { flipN: ui.flips.length }) : ''}` : 'nothing' }), tx('table.roll-then-bid', { n })] : bout.phase === 'bid' ? [tx('table.done-bidding-the-bids'), tx('table.show-the-bids')] : [tx('table.commit-the-turn-the'), tx('table.commit-the-turn')];
    return `<b>${commitLabel()}</b><p>${vc(...what)}</p>${keeps}${need ? `<p class="bad keep">${need}</p>` : tx('table.then-you-see-what', { name: opp.name })}`;
  }
  // Debt tags: what each stack owes against the chip it is working towards
  const tagEls = new Map();
  function syncTags(tags) {
    const keep = new Set(tags.map((t) => t.k));
    for (const [k, el] of tagEls) if (!keep.has(k)) { el.remove(); tagEls.delete(k); }
    for (const t of tags) { let el = tagEls.get(t.k); if (!el) { el = h('div', { class: 'debt-tag' }); fcLayer.append(el); tagEls.set(t.k, el); }
      const p = cellPos(t.si, t.r, t.c); el.style.left = p.x + 'px'; el.style.top = p.y + CH - 12 + 'px'; el.style.width = p.w + 'px'; el.textContent = t.text; }
  }
  const GUIDE_BADGE = { rst: 'restore', full: 'bet-meter', ccc: 'stake-rows' };
  function badges(s) {
    const out = [], st = s.status, add = (k, text, t, cls) => out.push({ k, text, tip: t, cls });
    if (s.heat > 1 && s.idx === 0) add('heat', `Last call ×${s.heat.toFixed(2)}`, `<b>Last call</b><p>From turn ${B.LAST_CALL + 1} the House raises the stakes: every Expense is multiplied, and the multiplier grows each turn.</p>`, 'bad');
    if (B.powerAhead(s)) add('pow', `Power ${B.powerAhead(s)}`, tx('table.power-badge'), 'good');
    if (st.resist) add('res', `Resist ${st.resist}`, '<b>Resist</b><p>Every fee charged is reduced by this much.</p>', 'good');
    if (st.evade != null) add('eva', `Evade >${st.evade}`, '<b>Evade</b><p>Fees larger than this miss entirely.</p>', 'good');
    if (st.reflect) add('ref', `Reflect ${st.reflect}`, '<b>Reflect</b><p>This much of the next fee is sent back.</p>', 'good');
    if (s.mods.enfeeble) add('enf', `Enfeebled ${s.mods.enfeeble}`, '<b>Enfeebled</b><p>Roll effects lose this much this turn.</p>', 'bad');
    if (s.drink) add('drk', `${s.drink.name} ×${s.drink.sips}`, () => drinkTip(s.drink));
    for (const k of Object.keys(s.turnBonus)) if (s.turnBonus[k]) add('tb' + k, `${signed(s.turnBonus[k])} ${D.STATS[k].name}`, () => statTip(k, B.tipOf(s, k)) + statSplit(B.statParts(s, k)), s.turnBonus[k] > 0 ? 'good' : 'bad');
    const P = B.restorePlan(bout, s), o = P.o;
    if (s.familiars) add('fam', `Familiar ×${s.familiars}`, `<b>Familiar</b><p>${D.TILTS.familiar.text}</p>`, 'good');
    if (s.interventions) add('int', 'Intervention', `<b>Intervention</b><p>${D.TILTS.intervention.text}</p>`, 'good');
    if (s.spawners) add('spn', `Spawner ×${s.spawners}`, `<b>Spawner</b><p>${D.TILTS.spawner.text}</p>`, 'bad');
    s.calamities.forEach((cid, i) => add('cal' + i, D.CALAMITIES[cid].name, `<b>${D.CALAMITIES[cid].name}</b><p>${D.CALAMITIES[cid].text}</p>${flavorP('CALAMITIES', cid)}`, 'bad'));
    return out;
  }
  root.querySelector('.who.me').append(badgeBox[0]); root.querySelector('.who.them').append(badgeBox[1]);
  // Each zone's meters (made with the zone labels, under the position): a dot per row, lit when a chip holds that row of
  // this zone, with what holding every row earns; a bar per column, lit when held (each restores a trick on the Bet, a
  // die on the Stake). Columns run as they do on the table, so yours mirror theirs.
  function rowsTip(s, k) {
    const o = B.occupancy(s), bet = k === 'bet', rows = bet ? o.betRows : o.stakeRows, held = rows.filter((x) => x.n > 0).length, al = bet ? o.betAligned : o.stakeAligned;
    const T = { covered: 1, focus: 1, ...D.TUNING.occupancy }, P = B.occBonus(s, o).parts, part = P.find((x) => x.zone === k), focus = P.find((x) => x.zone === 'focus'), keys = bet ? B.CCC : [D.primaryC(s.cls)];
    return tx(bet ? 'table.rows-bet-tip' : 'table.rows-stake-tip', { n: held, of: rows.length, covered: T.covered, focus: T.focus, stat: keys.map((x) => D.STATS[x].name).join(', '),
      now: part ? tx(focus ? 'table.rows-now-aligned' : 'table.rows-now', { n: part.n + (focus ? focus.n : 0), stat: keys.map((x) => D.STATS[x].name).join(', ') }) : tx('table.rows-now-none') }) + (!focus && part ? `<p class="dim">${tx('table.rows-align-hint', { focus: T.focus })}</p>` : '');
  }
  function restoreTip(s, k) {
    const p = B.restorePlan(bout, s), o = p.o, bet = k === 'bet';
    return tx(bet ? 'table.restore-bet-tip' : 'table.restore-stake-tip', { n: bet ? o.betColsOcc : o.stakeColsOcc, of: bet ? o.betCols.length : o.stakeCols.length, tapped: bet ? s.tapped.tricks.length : s.tapped.dice.length, back: bet ? p.tricks.length : p.dice.length });
  }
  function syncMeters() {
    bout.sides.forEach((s, si) => { const Z = zoneMeters[si], o = B.occupancy(s), ob = B.occBonus(s, o);
      const order = (rs) => (si === 0 ? rs.slice().reverse() : rs); // your columns run outward to the left, theirs to the right
      for (const k of ['bet', 'stake']) { const M = Z[k]; if (!M) continue;
        const rows = k === 'bet' ? o.betRows : o.stakeRows, cols = k === 'bet' ? o.betCols : o.stakeCols, al = k === 'bet' ? o.betAligned : o.stakeAligned, part = ob.parts.find((x) => x.zone === k), focus = ob.parts.find((x) => x.zone === 'focus');
        M.rows.replaceChildren(...rows.map((x) => h('i', { class: x.n > 0 ? 'on' : '' }))); M.rows.classList.toggle('full', !!part); M.rows.classList.toggle('aligned', al >= 0);
        // a narrow zone has no room for the stat's name beside its dots and bars: it shows the amount, and the hover names it
        const wide = (k === 'bet' ? s.dims.meterRows : s.dims.barRows) * cw[si] >= 170;
        swapText(M.bonus, part ? `+${part.n + (focus ? focus.n : 0)}${wide ? ` ${part.keys.length > 1 ? tx('table.zm-all') : D.STATS[part.keys[0]].name}` : ''}` : '');
        M.cols.replaceChildren(...order(cols).map((x) => h('i', { class: `${x.n > 0 ? 'on' : ''}${x.r === al ? ' al' : ''}` })));
      } });
  }

  // board highlights for the current mode
  let hover = null;
  function marks() {
    const cls = ['ok', 'aff', 'tgt', 'origin', 'sel', 'soft', 'pend-me', 'pend-opp', 'full-tgt']; for (const side of els.cells) for (const rowEls of side) for (const el of rowEls) el.classList.remove(...cls);
    const mark = (si, r, c, k) => els.cells[si][r]?.[c]?.classList.add(k);
    // every space an aimed trick will touch, marked `k`: → the trick and the side it is aimed at
    const markAim = (e, k) => { const def = D.TRICKS[e.trick.id], t = bout.sides[e.target.side]; for (const x of B.affected(bout, t, def, e.target, e.dice.length)) mark(t.idx, x.r, x.c, k); return { def, t }; };
    for (const e of me.run) if (e.state === 'bid' && B.needsTarget(e) && e.target) { const { t } = markAim(e, 'tgt'); mark(t.idx, e.target.r, e.target.c, 'origin'); }
    for (const el of fcLayer.querySelectorAll('.pend')) el.remove();
    bout.sides.forEach((s, si) => { for (const e of s.run) if (e.state === 'play' && e.target && B.needsTarget(e)) { // known to both sides once played
      const { def, t } = markAim(e, si ? 'pend-opp' : 'pend-me');
      const p = cellPos(t.idx, e.target.r, e.target.c); fcLayer.append(h('div', { class: `pend ${si ? 'opp' : 'me'}`, style: { left: p.x + 'px', top: p.y + 2 + 'px', width: p.w + 'px' }, text: `${def.name} ${e.stack.length + 1}↻` })); } });
    const e = me.run.find((x) => x.uid === ui.entry);
    if (!ui.locked && bout.phase === 'roll' && !me.thrown) { for (const f of B.flippable(me)) mark(0, f.r, f.c, 'soft'); for (const f of ui.flips) mark(0, f.r, f.c, 'sel'); }
    if (!ui.locked && bout.phase === 'bid' && ui.mode !== 'target') { for (const f of B.biddable(me)) mark(0, f.r, f.c, ui.hand.length ? 'soft' : 'ok'); for (const f of ui.hand) mark(0, f.r, f.c, 'sel'); }
    let fc = null, land = null, soft = false;
    if (ui.mode === 'target' && e) {
      const valid = B.validTargets(bout, me, e); for (const v of valid) mark(v.side, v.r, v.c, 'ok');
      const def0 = D.TRICKS[e.trick.id], ts = B.targetSide(bout, me, def0); if (ts && B.addsChips(def0)) for (let r = 0; r < ts.rows; r++) for (let c = 0; c < ts.dims.cols; c++) if (B.solidCount(ts.grid[r][c]) && B.capacityLeft(ts, ts.grid[r][c]) <= 0) mark(ts.idx, r, c, 'full-tgt');
      const at = hover && valid.some((v) => v.side === hover.side && v.r === hover.r && v.c === hover.c) ? hover : e.target;
      if (at) { for (const x of B.affected(bout, bout.sides[at.side], D.TRICKS[e.trick.id], at, e.dice.length)) mark(at.side, x.r, x.c, 'aff'); fc = B.forecastFee(bout, me, e, at); land = B.landing(bout, me, e, at); }
    } else if (!ui.locked) { // hovering a trick that is bid and aimed: show what its fee would do
      const he = me.run.find((x) => x.uid === ui.card);
      if (he && he.state === 'bid' && he.target) fc = B.forecastFee(bout, me, he, he.target);
      if (ui.card != null) { land = landingFor(ui.card); soft = !(he && he.state !== 'shown'); } // any trick under the pointer shows where its chips would go
    }
    showForecast(fc); showLanding(land, soft);
    root.classList.toggle('m-bid', bout.phase === 'bid' && !ui.locked && ui.mode !== 'target'); root.classList.toggle('m-target', ui.mode === 'target'); root.classList.toggle('m-die', ui.mode === 'die');
  }
  // Where chips will land: over each space a trick's chips go to, a ghost of the chip and how many (once the roll is
  // known). Shown for the trick being aimed, and for any trick under the pointer, in the Book, on the Run or in play.
  const landEls = new Map();
  function showLanding(list, soft) {
    const keep = new Set((list || []).map((x) => `${x.side}:${x.r}:${x.c}`));
    for (const [k, el] of landEls) if (!keep.has(k)) { el.remove(); landEls.delete(k); }
    for (const x of list || []) {
      const k = `${x.side}:${x.r}:${x.c}`; let el = landEls.get(k); if (!el) { el = h('div', { class: 'land' }); fcLayer.append(el); landEls.set(k, el); }
      const p = cellPos(x.side, x.r, x.c); el.classList.toggle('soft', !!soft);
      el.style.left = p.x + 'px'; el.style.top = p.y + 'px'; el.style.width = p.w + 'px'; el.style.height = CH + 'px';
      el.innerHTML = `<i></i><b>${x.n ? '+' + x.n : '+'}</b>`;
    }
  }
  // the entry a hovered card stands for: on the Run, itself; in the Book, as it would be once bid (aimed at its first valid target)
  function landingFor(uid) {
    const e = me.run.find((x) => x.uid === uid);
    if (e) { const at = e.target || B.validTargets(bout, me, e)[0] || null; return at ? B.landing(bout, me, e, at) : []; }
    const t = me.book.find((x) => x.uid === uid) || me.tapped.tricks.find((x) => x.trick.uid === uid)?.trick; if (!t) return [];
    const ghost = { uid: -1, trick: t, dice: [], bid: [], bidValue: 0, target: null, state: 'bid', stack: [] }, at = B.validTargets(bout, me, ghost)[0] || null;
    return at ? B.landing(bout, me, ghost, at) : [];
  }
  // fee forecast: over each stack it touches, what is paid, what stays as Debt, and what carries down the lane
  const fcEls = new Map(); let fcNow = null;
  function showForecast(list) {
    fcNow = list; const keep = new Set((list || []).map((x) => `${x.r}:${x.c}`));
    for (const [k, el] of fcEls) if (!keep.has(k)) { el.remove(); fcEls.delete(k); }
    for (const x of list || []) {
      const k = `${x.r}:${x.c}`; let el = fcEls.get(k); if (!el) { el = h('div', { class: 'fc' }); fcLayer.append(el); fcEls.set(k, el); }
      const p = cellPos(1, x.r, x.c), bits = [];
      if (x.paid) bits.push(`<b class="paid">−${x.paid}</b>`);
      if (x.blocked) bits.push(`<b class="blk">${x.blocked}▣</b>`);
      if (x.owed) bits.push(tx('table.owed', { owed: x.owed }));
      if (x.carryOut) bits.push(`<b class="carry">${x.carryOut}→</b>`);
      if (x.lost) bits.push(tx('table.wasted', { lost: x.lost }));
      if (!bits.length) bits.push(`<b class="miss">${x.fee ? '0' : '—'}</b>`);
      el.classList.toggle('in', !!x.carryIn && !x.fee);
      el.style.left = p.x + 'px'; el.style.top = p.y + 'px'; el.style.width = p.w + 'px'; el.innerHTML = bits.join('');
    }
  }
  function fcSummary(list) {
    const fee = sum(list, (x) => x.fee), paid = sum(list, (x) => x.paid), chips = list.flatMap((x) => x.paidChips), owed = sum(list, (x) => x.owed), carried = sum(list, (x) => x.carryOut), blocked = sum(list, (x) => x.blocked), lost = sum(list, (x) => x.lost);
    const bits = [tx('table.paid', { paid, v: chips.length ? ` (${chips.join(' + ')})` : '' })];
    if (blocked) bits.push(tx('table.blocked', { blocked }));
    if (carried) bits.push(tx('table.overkill-carried-down-the', { carried }));
    if (owed) bits.push(tx('table.left-as-debt', { owed }));
    if (lost) bits.push(tx('table.overkill-wasted-no-stack', { lost }));
    return tx('table.a-fee', { fee, join: bits.join(', ') });
  }
  function hint() {
    if (ui.locked) return;
    const e = me.run.find((x) => x.uid === ui.entry), name = e ? D.TRICKS[e.trick.id].name : '';
    const sel = ui.mode === 'die' ? me.tray.find((d) => d.id === ui.die) : null, left = B.tipOf(me, 'ingenuity') - me.used.bid;
    const hand = B.handChips(me, ui.hand) || [], handV = sum(hand, (x) => B.bidVal(x.ch));
    let text;
    const say = (v, c) => vc(v, c);
    if (bout.phase === 'drink') { setPrompt(say(tx('table.drink-phase-sip-your', { v: me.drink ? '' : ' (none)' }), tx('table.sip-eat-then-next'))); return; }
    if (bout.phase === 'draw') text = !B.canAct(bout, me) ? say(tx('table.nothing-to-draw-press'), tx('table.nothing-to-draw-roll')) : me.used.draw ? say(tx('table.draw-more-or-press'), tx('table.draw-more-or-roll')) : say(tx('table.step-1-draw-click'), tx('table.draw-a-trick'));
    else if (bout.phase === 'roll') text = !B.canAct(bout, me) ? say(tx('table.nothing-you-can-roll'), tx('table.nothing-to-roll-bid')) : selCount() ? say(tx('table.picked-pick-more-up', { selCount: selCount(), tipOf: B.tipOf(me, 'proficiency') }), tx('table.picked-bid', { selCount: selCount(), tipOf: B.tipOf(me, 'proficiency') })) : say(tx('table.step-2-roll-pick', { v: me.tray.length ? tx('table.still-in-the-roll', { trayN: me.tray.length, v: me.tray.length === 1 ? 'die is' : 'dice are' }) : '' }), tx('table.pick-up-to-dice-2', { tipOf: B.tipOf(me, 'proficiency') }));
    else if (ui.mode === 'die') text = say(tx('table.click-a-trick-to', { v: sel ? tx('table.you-rolled', { value: sel.value }) : '' }), tx('table.pick-a-trick', { v: sel ? sel.value + ': ' : '' }));
    else if (bout.phase === 'aim' && ui.mode !== 'target' && B.trayPlaceable(me)) text = say(tx('table.the-bluff-put-your'), tx('table.place-your-dice'));
    else if (bout.phase === 'aim' && ui.mode !== 'target') { const left = me.run.filter((x) => x.state === 'bid' && B.needsTarget(x)); text = left.length ? say(tx('table.the-bluff-the-bids', { v: left.length === 1 ? 'your trick is' : 'each trick is', join: left.map((x) => `${D.TRICKS[x.trick.id].name} → ${where(x.target)}`).join(', ') }), tx('table.aimed-at-the-best')) : say(tx('table.nothing-to-aim-press'), 'Play.'); }
    else if (ui.mode === 'target') text = say(tx('table.pick-where-lands-or', { name, v: fcNow ? ' Forecast: ' + fcSummary(fcNow) : '' }), tx('table.aim', { name }));
    else if (hand.length) text = say(tx('table.in-your-hand-click', { join: hand.map((x) => B.bidVal(x.ch)).join(' + '), handN: hand.length, handV, left: left - hand.length }), tx('table.hand-pick-a-trick', { handV, handN: hand.length }));
    else text = left <= 0 ? say(tx('table.out-of-bids-press'), tx('table.out-of-bids-bluff')) : me.used.bid ? say(tx('table.bid-again-left-click', { left }), tx('table.left-or-bluff', { left })) : say(tx('table.step-3-bid-click'), tx('table.bid-a-chip-on'));
    setPrompt(text);
  }
  // ---------- the hand ----------
  // What you have picked up rides with the pointer: dice for the throw (and chips to flip), chips to bid, rolled dice
  // to put on a trick. The ones you hold dim where they lie. Click a trick (or the roll, to throw) to put the hand
  // down; right-click lets go of everything in it.
  const handEl = h('div', { class: 'hand-cursor' }); root.append(handEl);
  function heldItems() {
    if (bout.phase === 'roll' && !me.thrown) return [...me.pouch.filter((d) => ui.sel.has(d.id)).map((d) => ({ d })), ...ui.flips.map((f) => ({ ch: B.bidChip(me, f.r, f.c) })).filter((x) => x.ch)];
    if (bout.phase === 'bid') return (B.handChips(me, ui.hand) || []).map((x) => ({ ch: x.ch }));
    if (bout.phase === 'aim') return ui.held.map((id) => me.tray.find((d) => d.id === id)).filter(Boolean).map((d) => ({ d, v: d.value }));
    return [];
  }
  function drawHand() {
    const items = ui.locked ? [] : heldItems(); handEl.classList.toggle('on', items.length > 0 && !!ui.cursor); handEl.classList.toggle('stack', bout.phase === 'bid');
    handEl.replaceChildren(...items.slice(0, 12).map((x, i) => { const el = x.d ? dieEl(x.d, x.v ?? '', 'mini') : chipEl(x.ch, 'mini'); el.style.setProperty('--i', i); return el; }));
    for (const el of els.dice.values()) el.classList.toggle('inhand', false); for (const el of els.chips.values()) el.classList.toggle('inhand', false);
    for (const x of items) (x.d ? els.dice.get(x.d.id) : els.chips.get(x.ch.id))?.classList.add('inhand');
    trayBox.classList.toggle('drop', bout.phase === 'roll' && !me.thrown && items.length > 0); trayBox.dataset.drop = tx('table.roll-here', { n: items.length });
  }
  const moveHand = () => { if (ui.cursor) handEl.style.transform = `translate(${ui.cursor.x + 14}px, ${ui.cursor.y + 10}px)`; };
  root.addEventListener('mousemove', (ev) => { const was = !!ui.cursor; ui.cursor = stagePoint(ev); moveHand(); if (!was) drawHand(); });
  root.addEventListener('mouseleave', () => { ui.cursor = null; handEl.classList.remove('on'); });
  // put the hand down: what moves starts from the pointer and settles where it goes
  function fromHand(list) {
    if (!ui.cursor) return;
    for (const el of list) { if (!el) continue; el.style.transition = 'none'; el.style.transform = `translate(${ui.cursor.x - 16}px, ${ui.cursor.y - 16}px) scale(.8)`; void el.offsetWidth; el.style.transition = '';
      el.classList.add('landing'); setTimeout(() => el.classList.remove('landing'), 900); }
  }
  function letGo() {
    if (!heldItems().length) return false;
    act(() => { if (bout.phase === 'roll') { ui.sel.clear(); ui.flips = []; } if (bout.phase === 'bid') ui.hand = []; if (bout.phase === 'aim') setMode(null); });
    return true;
  }
  rightClick.take = () => root.isConnected && letGo();
  // the roll takes the handful you picked up: click it to throw (the same as pressing the button)
  trayBox.onclick = () => { if (bout.phase === 'roll' && !me.thrown && selCount()) commit(); };
  function setMode(mode, v) { if (mode !== 'die') ui.held = []; else if (v != null && !ui.held.includes(v)) ui.held = [v]; ui.mode = mode; ui.die = mode === 'die' ? ui.held[0] ?? v : null; ui.entry = mode === 'target' || mode === 'bid' ? v : null; } // 'bid': a trick picked to bid onto, chip by chip
  function act(fn) { if (ui.locked) return; fn(); sync(); hint(); }
  const nope = (msg, el) => { toast(msg, 'warn'); sfx('refuse'); if (el) pulse(el, 'shake'); };

  // ---------- input ----------
  function clickCard(uid, ev) {
    if (ui.locked) return;
    const e = me.run.find((x) => x.uid === uid), el = els.cards.get(uid);
    if (!e && bout.phase === 'bid' && me.tapped.tricks.some((x) => x.trick.uid === uid)) return clickTapped(uid, el);
    if (e && ev?.target?.dataset?.act === 'split' && e.stack?.length) { const why = B.canUnstack(bout, me, uid); if (why) return nope(why, el); sfx('card'); return act(() => B.unstack(bout, me, uid)); } // the ⧉ mark takes the top copy off to play on its own
    if (!e) { const why = B.canDraw(bout, me, uid); if (why) return nope(why, el);
      const t = me.book.find((x) => x.uid === uid), onto = !ev?.shiftKey && me.run.find((x) => B.canStackOn(me, t, x)); // a copy stacks on the one shown (Shift: draw it apart)
      sfx(onto ? 'stack' : 'card'); return act(() => B.draw(bout, me, uid, onto ? onto.uid : null)); }
    if (bout.phase === 'draw') { const why = B.canUndraw(bout, me, uid); if (why) return nope(why === 'Only a trick drawn this turn can go back to the Book.' ? tx('table.that-trick-was-drawn') : why, el); return act(() => B.undraw(bout, me, uid)); }
    if (bout.phase === 'roll') return nope(tx('table.pick-dice-from-your'), el);
    if (ui.mode === 'die') { const why = B.canPlace(bout, me, ui.die, e); if (why) return nope(why, el);
      const ids = []; // the handful goes on, one size: what does not fit stays in your hand
      for (const id of ui.held) { const d = me.tray.find((x) => x.id === id); const sz = B.sizeOn(e) || (ids.length ? me.tray.find((x) => x.id === ids[0])?.type : null);
        if (!B.canPlace(bout, me, id, e) && (!sz || d?.chip || d?.type === sz)) ids.push(id); }
      fromHand(ids.map((id) => els.dice.get(id))); ids.forEach((_, i) => setTimeout(() => sfx('die'), 120 + i * 90)); sfx('step', 120);
      return act(() => { for (const id of ids) B.place(bout, me, id, e); aimBest(); const rest = ui.held.filter((id) => !ids.includes(id) && me.tray.some((d) => d.id === id)); if (rest.length) { ui.held = rest; ui.die = rest[0]; } else setMode(null); }); }
    if (bout.phase === 'aim') { if (e.state === 'bid' && B.needsTarget(e)) { sfx('pick'); return act(() => { ui.hand = []; setMode('target', uid); }); }
      if (me.tray.length) return nope(tx('table.click-a-die-in'), el);
      return nope(e.state === 'bid' ? tx('table.that-trick-needs-no') : tx('table.only-tricks-you-bid'), el); }
    if (ev.target.dataset.act === 'target' && e.state === 'bid') return nope(tx('table.aim-in-the-bluff'), el);
    if (e.state === 'play') return nope(tx('table.that-trick-is-already'), el);
    if (!ui.hand.length) return nope(me.used.bid >= B.tipOf(me, 'ingenuity') ? tx('table.no-bids-left-this') : tx('table.pick-up-a-chip-first'), el); // pick chips up from your stacks first
    bidOne(e, el);
  }
  function clickDie(id) {
    if (ui.locked) return;
    const el = els.dice.get(id);
    if (me.pouch.some((d) => d.id === id)) { // pick it for the throw
      if (bout.phase !== 'roll' || me.thrown) return nope(bout.phase === 'draw' ? tx('table.press-roll-first-then') : me.thrown ? tx('table.you-have-rolled-this') : tx('table.rolling-is-over-for'), el);
      if (ui.sel.has(id)) return act(() => ui.sel.delete(id));
      if (selCount() >= B.tipOf(me, 'proficiency')) return nope(tx('table.you-can-roll-this', { tipOf: B.tipOf(me, 'proficiency') }), el);
      sfx('die'); sfx('pick'); return act(() => ui.sel.add(id));
    }
    if (me.tray.some((d) => d.id === id)) {
      // every bid placed: a click on a rolled die shows the bids and opens the Bluff with that die in hand
      if (bout.phase === 'bid' && !ui.hand.length && !B.needOf(bout, me) && (me.used.bid >= B.tipOf(me, 'ingenuity') || !B.biddable(me).length || !(me.run.some((x) => x.state !== 'play') || B.revivable(bout, me).length)))
        return commit().then(() => { if (bout.phase === 'aim' && !ui.locked && me.tray.some((d) => d.id === id)) act(() => { ui.held = [id]; ui.mode = 'die'; ui.die = id; }); });
      if (bout.phase !== 'aim') return nope(tx('table.dice-go-on-tricks'), el); // gather a handful from the roll
      return act(() => { const k = ui.held.indexOf(id); if (k >= 0) ui.held.splice(k, 1); else ui.held.push(id); if (ui.held.length) { ui.mode = 'die'; ui.die = ui.held[0]; } else setMode(null); }); }
    if (!B.canMove(bout, me, id)) return nope(B.holderOf(me, id)?.state === 'play' ? tx('table.that-trick-is-in') : bout.phase !== 'aim' && B.holderOf(me, id)?.dice.find((d) => d.id === id)?.t === bout.turn ? tx('table.dice-are-moved-in') : tx('table.that-die-was-placed'), el);
    sfx('undo'); act(() => { ui.hand = []; B.unplace(bout, me, id); aimBest(); }); // back to the roll, where it came from
  }
  function clickCell(si, r, c) {
    if (ui.locked) return;
    if (ui.sandbox?.op) return; // the test table's chip tools paint on press (see testTools)
    const cellEl = els.cells[si][r][c], e = me.run.find((x) => x.uid === ui.entry);
    if (ui.mode === 'target' && e) {
      if (B.setTarget(bout, me, e, { side: si, r, c })) { sfx('aim'); return act(() => { ui.handAim.add(e.uid); setMode(null); }); }
      if (si !== 0 || !B.bidChip(me, r, c)) return nope(tx('table.not-a-valid-target'), cellEl);
      setMode(null); // a click on your own stack picks up a chip instead
    }
    if (bout.phase === 'roll' && !me.thrown) {
      if (si !== 0) return;
      const k = ui.flips.findIndex((f) => f.r === r && f.c === c);
      if (k >= 0) return act(() => ui.flips.splice(k, 1));
      const ch = B.bidChip(me, r, c);
      if (ch?.kind !== 'std') return nope(tx('table.only-an-uncovered-standard'), cellEl);
      if (B.worth(me) - ch.value - sum(ui.flips, (f) => B.bidChip(me, f.r, f.c).value) <= 0) return nope(tx('table.that-is-your-last'), cellEl);
      if (selCount() >= B.tipOf(me, 'proficiency')) return nope(tx('table.you-can-roll-this-2', { tipOf: B.tipOf(me, 'proficiency') }), cellEl);
      sfx('chip'); return act(() => ui.flips.push({ r, c }));
    }
    if (bout.phase === 'aim' && ui.mode !== 'target' && si >= 0) { // click a trick's marked target to move it
      const mine0 = me.run.filter((x) => x.state === 'bid' && B.needsTarget(x) && x.target && x.target.side === si && x.target.r === r && x.target.c === c);
      if (mine0.length) { const k = (mine0.findIndex((x) => x.uid === ui.lastAim) + 1) % mine0.length; ui.lastAim = mine0[k].uid; return act(() => setMode('target', mine0[k].uid)); }
    }
    if (bout.phase === 'bid') {
      if (si !== 0) return nope(tx('table.bid-a-chip-from'), cellEl);
      // a hand of chips: each click on a stack picks up its next chip; a stack with nothing more to give is let go
      const more = [...ui.hand, { r, c }], hand = B.handChips(me, more), left = B.tipOf(me, 'ingenuity') - me.used.bid;
      const drop = () => act(() => { ui.hand = ui.hand.filter((x) => x.r !== r || x.c !== c); });
      if (!hand) return ui.hand.some((x) => x.r === r && x.c === c) ? drop() : nope(tx('table.only-uncovered-standard-or'), cellEl);
      if (more.length > left) return ui.hand.some((x) => x.r === r && x.c === c) ? drop() : nope(left <= 0 ? tx('table.no-bids-left-this-2') : tx('table.your-hand-is-full', { left }), cellEl);
      if (B.worth(me) - sum(hand, (x) => B.bidVal(x.ch)) <= 0) return nope(tx('table.that-is-your-last-2'), cellEl);
      sfx('chip'); return act(() => { ui.hand = more; if (more.length === 1 && !ui.peek && B.revivable(bout, me).length) { ui.peek = 'book'; ui.peekPhase = bout.phase; } }); // the Book opens: a chip can bring a tapped trick back
    }
  }
  // ---------- press and carry ----------
  // Everything a click puts in place can be carried there instead, and a carry says where: a trick from your Book onto
  // the Run (on its own) or onto a copy of itself there (stacked); the top copy of a stack off it, onto the Run; a
  // drawn trick back to the Book; a chip from your Stake onto a trick (a bid) or a tapped trick (bringing it back); a
  // rolled die onto a trick; a bid trick onto the space it aims at. Each drop runs the same steps as the clicks do.
  const plain = (more = {}) => ({ target: { dataset: {} }, shiftKey: false, ...more }), onRun = (id) => me.run.some((x) => x.uid === id);
  // which of your zones a pointer is over, under the table: the Book (left), the Run (between the Book and your dice)
  const zoneAt = (ev) => { const p = stagePoint(ev), R = runSpan(0), edge = R.book + (bookOpen(0) ? BOOK_W : SPINE); return p.y < RUN_Y - 24 ? null : p.x < edge ? 'book' : p.x < R.dice ? 'run' : null; };
  carry(root, {
    source(el) {
      if (ui.locked || ui.sandbox?.op) return null;
      const card = el.closest?.('[data-card]'); if (card) return { kind: 'card', id: Number(card.dataset.card), el: card, split: el.dataset?.act === 'split' };
      const die = el.closest?.('[data-die]'); if (die) return me.tray.some((d) => String(d.id) === die.dataset.die) && bout.phase === 'aim' ? { kind: 'die', id: me.tray.find((d) => String(d.id) === die.dataset.die).id, el: die } : null;
      const cell = el.closest?.('[data-at]'); if (!cell || bout.phase !== 'bid') return null;
      const [si, r, c] = cell.dataset.at.split(':').map(Number), ch = si === 0 ? B.bidChip(me, r, c) : null, chEl = ch && els.chips.get(ch.id);
      return chEl ? { kind: 'chip', r, c, el: chEl } : null;
    },
    target(el, ev, src) {
      const card = el.closest?.('[data-card]'), id = card ? Number(card.dataset.card) : null;
      if (src.kind === 'chip' || src.kind === 'die') return card && id !== src.id && (onRun(id) || (src.kind === 'chip' && me.tapped.tricks.some((x) => x.trick.uid === id))) ? { kind: 'card', id, el: card } : null;
      if (onRun(src.id)) { // a trick on the Run: off its stack, back to the Book, or onto the space it aims at
        const cell = el.closest?.('[data-at]'), e = me.run.find((x) => x.uid === src.id);
        if (cell && bout.phase === 'aim' && e.state === 'bid' && B.needsTarget(e)) { const [si, r, c] = cell.dataset.at.split(':').map(Number); return { kind: 'cell', si, r, c, el: cell }; }
        const z = zoneAt(ev); return z === 'book' ? (bout.phase === 'draw' ? { kind: 'book', el: spines.book } : null) : z === 'run' && e.stack?.length ? { kind: 'run', el: ztRun } : null;
      }
      if (!me.book.some((t) => t.uid === src.id)) return null; // a trick in the Book: onto a copy of itself, or onto the Run on its own
      if (card && onRun(id) && B.canStackOn(me, me.book.find((t) => t.uid === src.id), me.run.find((x) => x.uid === id))) return { kind: 'card', id, el: card };
      return zoneAt(ev) === 'run' ? { kind: 'run', el: me.run.length ? ztRun : runEmpty } : null;
    },
    drop(src, t) {
      if (src.kind === 'chip') { const n = ui.hand.length; if (!ui.hand.some((x) => x.r === src.r && x.c === src.c)) clickCell(0, src.r, src.c); if (ui.hand.length > n || ui.hand.some((x) => x.r === src.r && x.c === src.c)) clickCard(t.id, plain()); return; }
      if (src.kind === 'die') { if (!ui.held.includes(src.id)) clickDie(src.id); if (ui.held.includes(src.id)) clickCard(t.id, plain()); return; }
      if (t.kind === 'cell') { if (ui.mode !== 'target' || ui.entry !== src.id) clickCard(src.id, plain()); if (ui.mode === 'target') clickCell(t.si, t.r, t.c); return; }
      if (t.kind === 'book') return clickCard(src.id, plain());
      if (onRun(src.id)) return clickCard(src.id, plain({ target: { dataset: { act: 'split' } } })); // the top copy comes off its stack
      const stackOn = t.kind === 'card' ? t.id : null, why = B.canDraw(bout, me, src.id); if (why) return nope(why, src.el);
      sfx(stackOn ? 'stack' : 'card'); act(() => B.draw(bout, me, src.id, stackOn)); // onto that copy, or on its own
    },
  });
  // A tapped trick in the Bid phase: with a chip in hand, bid it to bring the trick back at this turn's restore;
  // with an empty hand, take that bid back.
  function clickTapped(uid, el) {
    if (!ui.hand.length) { if ((me.revive || []).some((x) => x.uid === uid)) { sfx('undo'); return act(() => B.unrevive(bout, me, uid)); }
      const why = B.canRevive(bout, me, uid); return nope(why || tx('table.revive-pick-chip'), el); }
    bidFromHand(el, (r, c) => B.canRevive(bout, me, uid, r, c), (r, c) => B.revive(bout, me, uid, r, c));
  }
  // The hand is a stack of chips: a bid takes one, the top of the stack (the last picked up; a stack gives its top
  // chip first). can(r, c) → why not, or null; place(r, c) makes the bid.
  function bidFromHand(el, can, place) {
    const top = ui.hand[ui.hand.length - 1], k = ui.hand.findIndex((x) => x.r === top.r && x.c === top.c);
    const why = can(top.r, top.c); if (why) return nope(why, el);
    const ch = B.bidChip(me, top.r, top.c); fromHand([els.chips.get(ch?.id)]); sfx('bid');
    act(() => { place(top.r, top.c); ui.hand.splice(k, 1); });
  }
  // each click on a trick bids one chip from the hand
  const bidOne = (e, el) => bidFromHand(el, (r, c) => B.canBid(bout, me, e, r, c), (r, c) => B.bid(bout, me, e, r, c));
  // click undo: a chip bid this turn goes back to its stack (not while you hold chips: then the click bids one more)
  function clickBidChip(uid, chipId) {
    if (ui.locked) return; const e = me.run.find((x) => x.uid === uid);
    if (ui.hand.length && e) return bidOne(e, els.chips.get(chipId)); chipId = e?.bid[e.bid.length - 1]?.id ?? chipId; // a pile gives back its top chip
    const why = B.canUnbid(bout, me, e, chipId);
    if (why) return nope(why, els.chips.get(chipId));
    act(() => { B.unbid(bout, me, e, chipId); ui.hand = []; });
  }
  // food on top of one of your stacks: double-click to eat it
  function eatCell(si, r, c) {
    if (ui.locked || si !== 0) return;
    const why = B.canEat(bout, me, r, c); if (why) return;
    act(() => { const f = B.eat(bout, me, r, c); toast(tx('table.you-eat', { label: f.label, join: Object.entries(f.mods).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${D.STATS[k].name}`).join(', '), v: f.turns > 1 ? ` for ${f.turns} turns` : ' this turn' })); });
  }
  function hoverCell(si, r, c) { hover = r < 0 ? null : { side: si, r, c }; if (ui.mode === 'target') { marks(); hint(); } }
  const onKey = (ev) => { if (ev.target?.closest?.('input, textarea, select')) return;
    if (ev.key === 'Escape' && ui.peek) { ui.peek = null; return sync(); }
    if ((ev.key === 'b' || ev.key === 'B') && !bookOpen()) return togglePeek('book'); // B: peek at the Book
    if ((ev.key === 'd' || ev.key === 'D') && !diceOpen()) return togglePeek('dice'); // D: peek at the dice
    if (ev.key === 'Escape' && feedEl.classList.contains('open')) return toggleHistory(false); if (ev.key === 'Escape' && (ui.mode || ui.hand.length)) act(() => { setMode(null); ui.hand = []; }); };
  document.addEventListener('keydown', onKey);
  const onDetail = () => { if (root.isConnected) hint(); else detail.listeners.delete(onDetail); }; detail.listeners.add(onDetail);

  // ---------- committing a phase ----------
  // Rolling is one throw: the dice you picked are thrown as the Roll closes and the Bid opens (both sides at once).
  function pickToEngine() {
    if (bout.phase !== 'roll' || me.thrown) return;
    B.setPick(bout, me, [...ui.sel], ui.flips.slice());
    els.flipFrom = new Map(ui.flips.map(({ r, c }) => { const ch = B.bidChip(me, r, c); return ['c' + ch.id, chipPos(0, r, c, me.grid[r][c].chips.indexOf(ch))]; }));
  }
  // Lock in this phase. Only now does the opponent make the same move, blind to yours (it sees your table as
  // it was when the phase opened), and only then are both shown.
  async function commit() {
    if (ui.locked || bout.over) return;
    if (bout.phase === 'drink') return closeDrink();
    pickToEngine();
    const why = B.needOf(bout, me); if (why) return nope(why, commitBtn);
    ui.locked = true; setMode(null); ui.hand = []; ui.sel.clear(); ui.flips = []; prompt = ''; renderFeed(); sfx('confirm');
    const phase = bout.phase, before = ui.spyBefore || new Set(opp.run.map((e) => e.uid)), own = mine(phase), ownCells = phase === 'aim' ? me.run.filter((e) => e.state === 'bid' && e.target).map((e) => e.target) : [];
    if (own) feedPush(own, 0, ownCells, phase);
    if (ui.spied !== spyKey()) planPhase(bout, opp); ui.spied = null; ui.spyBefore = null;
    const r0 = (bout.rewards || []).length;
    if (!B.advance(bout)) B.advance(bout, true);
    sync(); reveal(phase, before); if (bout.phase !== 'resolve' && !bout.over) sfx('phase', 520);
    for (const w of (bout.rewards || []).slice(r0)) feedPush(w.text.charAt(0).toUpperCase() + w.text.slice(1), w.side, w.cells, w.phase);
    await wait(420 / ui.speed);
    ui.locked = false;
    if (bout.phase === 'resolve') return playTurn();
    spyPhase();
    if (bout.phase === 'aim') { ui.handAim.clear(); aimBest(); } // nothing is picked for you: you choose even the first die
    sync(); hint(); autoSkip();
  }
  // The Bluff opens with every trick that needs a target aimed at its best one: most impact, least waste, judged on
  // the table as you can see it. Change any of them by clicking the trick, or its target, then a new space.
  function aimBest() {
    const view = seenBy(bout, me);
    for (const e of me.run) if (e.state === 'bid' && B.needsTarget(e) && !ui.handAim.has(e.uid)) { const t = bestTarget(view, me, e, { noise: false }); if (t) B.setTarget(bout, me, e, t); }
  }
  // A phase you cannot act in at all (nothing to draw, no room or nothing to roll, nothing to bid, nothing to aim) is
  // skipped on its own; a whole turn can pass this way. Unused draws, rolls and bids still pay their rewards.
  const SKIP = { draw: ['draw', 'Draw'], roll: ['roll', 'Roll'], bid: ['bid', 'Bid'], aim: ['aim', 'Bluff'] };
  function autoSkip() {
    if (ui.locked || bout.over || ui.skipping || !SKIP[bout.phase] || B.canAct(bout, me) || B.needOf(bout, me)) return;
    const [verb, name] = SKIP[bout.phase], key = `${bout.turn}:${bout.phase}`;
    feedPush(tx('table.nothing-you-can-this', { verb, name }), 0, [], bout.phase); ui.skipping = key;
    setTimeout(() => { if (ui.skipping !== key) return; ui.skipping = null; if (root.isConnected && !ui.locked && `${bout.turn}:${bout.phase}` === key) commit(); }, 650 / ui.speed);
  }
  const names = (list) => (list.length < 2 ? list.join('') : tx('table.and', { join: list.slice(0, -1).join(', '), list: list[list.length - 1] }));
  const where = (t) => (t ? tx('table.lane', { v: t.side === 0 ? 'your' : 'their', v2: t.r < bout.sides[t.side].dims.meterRows ? 'Bet' : 'Stake', c: t.c + 1 }) : 'nothing');
  // what you locked in this phase, for the match history
  function mine(phase) {
    const tn = (e) => D.TRICKS[e.trick.id].name;
    if (phase === 'draw') { const d = me.run.filter((e) => e.drawn === bout.turn).map(tn); return d.length ? tx('table.you-draw', { names: names(d) }) : tx('table.you-draw-nothing'); }
    if (phase === 'roll') return ''; // the throw is shown as the Bid opens (see reveal)
    if (phase === 'bid') { const bids = me.run.filter((e) => e.state === 'bid'); return bids.length ? tx('table.you-bid', { names: names(bids.map((e) => tx('table.on-2', { join: e.bid.map((ch) => ch.value).join(' + '), tn: tn(e) }))) }) : tx('table.you-bid-nothing'); }
    const on = placed(me), aims = me.run.filter((e) => e.state === 'bid' && B.needsTarget(e));
    return [on.length ? tx('table.you-put', { names: names(on) }) : '', aims.length ? `aim ${names(aims.map((e) => tx('table.at', { tn: tn(e), where: where(e.target) })))}` : ''].filter(Boolean).join('; ').replace(/^aim/, 'You aim') + (on.length || aims.length ? '.' : '');
  }
  // dice put on tricks this turn, as feed text: '4 + 2 on Charge'
  const placed = (s) => s.run.map((e) => ({ e, ds: e.dice.filter((d) => d.t === bout.turn) })).filter((x) => x.ds.length).map((x) => tx('table.on-3', { join: x.ds.map((d) => d.value).join(' + '), name: D.TRICKS[x.e.trick.id].name }));
  const thrown = (s) => s.tray.filter((d) => d.t === bout.turn).map((d) => d.value);
  // the opponent's moves are heard from across the table as they are shown
  function oppSound(phase) {
    if (phase === 'draw') { if (opp.run.some((e) => e.drawn === bout.turn)) sfx('opp-draw', 250); }
    else if (phase === 'roll') { if (thrown(opp).length) sfx('opp-roll', 200); }
    else if (phase === 'bid') { if (opp.run.some((e) => e.state === 'bid')) sfx('opp-bid', 250); }
    else if (phase === 'aim') { if (placed(opp).length) { sfx('die', 150, { pan: 0.55 }); sfx('opp-aim', 380); } }
  }
  function reveal(phase, before) {
    const tn = (e) => D.TRICKS[e.trick.id].name; let text;
    if (phase === 'roll') { const mineT = thrown(me); if (mineT.length) feedPush(tx('table.you-roll', { join: mineT.join(', ') }), 0, [], phase); } // both throws land as the Bid opens
    if (phase === 'draw') { const fresh = opp.run.filter((e) => !before.has(e.uid)).map(tn); text = fresh.length ? tx('table.draws', { name: opp.name, names: names(fresh) }) : tx('table.draws-nothing', { name: opp.name }); }
    else if (phase === 'roll') { const t = thrown(opp); text = t.length ? tx('table.rolls', { name: opp.name, join: t.join(', ') }) : tx('table.rolls-nothing', { name: opp.name }); }
    else if (phase === 'aim') { const on = placed(opp); text = tx('table.where-they-aim-you', { v: on.length ? tx('table.puts', { name: opp.name, names: names(on) }) : tx('table.places-no-dice', { name: opp.name }) }); }
    else { const bids = opp.run.filter((e) => e.state === 'bid'); text = bids.length ? tx('table.bids', { name: opp.name, names: names(bids.map((e) => tx('table.on-4', { bidValue: e.bidValue, tn: tn(e) }))) }) : tx('table.bids-nothing', { name: opp.name }); }
    feedPush(text, 1, [], phase); oppSound(phase);
    for (const e of opp.run) { const el = els.cards.get(ckey(1, e.uid)); if (el) pulse(el, 'reveal'); }
  }

  // ---------- resolution ----------
  // The House works through the turn one call at a time: it names the phase, points the stick
  // at the trick being played, then at where it lands, and only then does the table change.
  // the House's plays sound like what they are: the element a trick carries, else its type; creatures, hazards,
  // misses and bonuses have their own
  const ELEMENT_SOUND = ['burn', 'shock', 'frost', 'acid', 'boom', 'poison', 'corrupt', 'lava'];
  function stepSound(st, parts) {
    const p = parts.find((x) => x.kind === 'play') || parts[0]; if (!p) return;
    if (p.kind === 'creature') return sfx('creature');
    if (p.kind === 'hazard') return sfx('hazard');
    if (p.kind === 'miss') return sfx('miss');
    if (p.kind === 'bonus' || p.kind === 'familiar') return sfx('bonus');
    if (p.kind !== 'play') return;
    const e = p.uid != null ? bout.sides.flatMap((s) => s.run).find((x) => x.uid === p.uid) : null, def = e ? D.TRICKS[e.trick.id] : null;
    const el = def?.element === 'lava' ? 'burn' : def?.element;
    sfx(el && ELEMENT_SOUND.includes(def.element) ? el : (def?.type || p.phase || 'expense'));
  }
  async function playTurn() {
    if (ui.locked || bout.over) return;
    ui.locked = true; ui.playing = true; setMode(null); prompt = ''; renderFeed(); sync();
    let worth0 = bout.sides.map((x) => B.worth(x));
    const bigLoss = () => { const w = bout.sides.map((x) => B.worth(x)), hit = w.some((v, i) => worth0[i] - v >= Math.max(4, worth0[i] * 0.2)); worth0 = w; if (hit) lights('flash', 1100); };
    let n = 0; const pace = (ms) => wait(ms / ui.speed / (n > 40 ? 1.6 : 1));
    const flash = (st) => { for (const x of st.cells) { const el = els.cells[x.side][x.r]?.[x.c]; if (el) pulse(el, st.kind === 'miss' ? 'flash-miss' : st.kind === 'play' ? 'flash-aim' : st.kind === 'debt' ? 'flash-miss' : 'flash-hit'); } };
    const cellPoint = (x) => { const p = cellPos(x.side, x.r, x.c); return { x: p.x + p.w / 2, y: p.y + CH / 2 }; };
    const both = (fn) => arms.forEach(fn);
    const call = async (text, color) => { phaseCall.textContent = text; phaseCall.style.setProperty('--pc', color); phaseCall.classList.add('in'); await pace(620); both((a) => a.tap()); await pace(620); phaseCall.classList.remove('in'); await pace(260); };
    // the tricks played in a phase go out together once it is over: before the next call, the settle or the tapping
    const played = new Set();
    const spendPlayed = async () => { const any = [...played].filter(spend).length; played.clear(); if (!any) return; sfx('spent'); sync(); await pace(760); };
    for (const st of B.resolve(bout)) { n++;
      if (['phase', 'settle', 'return', 'turn', 'drink', 'over'].includes(st.kind)) await spendPlayed();
      if (st.kind === 'turn' || st.kind === 'drink') { sync(st.fx); break; }
      setPhase(st.phase);
      if (st.kind === 'return') { setCalling([]); ui.spent.clear(); sync(st.fx); await pace(760); continue; } // the spent pieces slide to the tapped piles
      // a paired step carries one action from each Roller: both arms move and both lines are posted together
      const parts = st.kind === 'pair' ? st.parts : [st];
      setCalling(parts);
      for (const p of parts) if (p.text) feedPush(p.text, p.who, p.cells, p.phase || st.phase || 'house');
      if (st.kind === 'phase') { marquee.style.setProperty('--lc', D.TYPES[st.phase].color); const bx = box(phaseEls[st.phase]); arms[0].to(bx.x + bx.w / 2 - 14, bx.y + bx.h + 4); arms[1].to(bx.x + bx.w / 2 + 14, bx.y + bx.h + 4); await call(D.TYPES[st.phase].name + 's', D.TYPES[st.phase].color); continue; }
      if (st.kind === 'settle') { arms[0].to(STAGE[0].x + 16, STAGE[0].y + 16); arms[1].to(STAGE[1].x + 16, STAGE[1].y + 16); await call('Settle', '#ffd76a'); continue; }
      if (st.kind === 'bid') { const L = cardLayout(), at = (si) => { const e = sideOf(si).run.find((x) => x.bid.length), cl = e && L.get(ckey(si, e.uid)); return cl ? { x: cl.x + 60, y: cl.y + 90 } : { x: si ? 900 : 380, y: 520 }; };
        const p0 = at(0), p1 = at(1); arms[0].to(p0.x, p0.y); arms[1].to(p1.x, p1.y); await pace(560); sync(st.fx); arms[0].to(PX + 36, PIT.bottom - 20); arms[1].to(OX - 36, PIT.bottom - 20); await pace(820); continue; }
      const armOf = (p) => arms[p.who ?? p.cells[0]?.side ?? 0];
      const tps = parts.map((p) => (p.kind === 'play' ? trickPoint(p) : null));
      if (tps.some(Boolean)) { parts.forEach((p, i) => tps[i] && armOf(p).to(tps[i].x, tps[i].y)); await pace(600); parts.forEach((p, i) => tps[i] && armOf(p).tap()); await pace(320); }
      let moved = false;
      parts.forEach((p, i) => { const c0 = p.cells[0];
        if (c0) { const pt = cellPoint(c0); armOf(p).to(pt.x, pt.y); moved = true; }
        else if (!tps[i] && p.who != null) { armOf(p).to(p.who === 0 ? 190 : 1090, 78); moved = true; } });
      if (moved) await pace(560);
      sync(st.fx); parts.forEach(flash); bigLoss(); stepSound(st, parts);
      for (const p of parts) if (p.kind === 'play' && p.uid != null) played.add(ckey(p.who ?? 0, p.uid));
      const fees = parts.filter((p) => p.kind === 'fee' && p.cells[0]);
      if (fees.length) { await pace(240); for (const p of fees) armOf(p).to(STAGE[p.cells[0].side].x + 16, STAGE[p.cells[0].side].y + 14); } // rake what was paid to the Stage
      await pace(st.kind === 'over' ? 1000 : parts.some((p) => p.text) ? (parts.length > 1 ? 980 : 780) : 340);
    }
    await spendPlayed(); ui.spent.clear();
    setCalling([]); setPhase(null); both((a) => a.rest()); ui.playing = false; marquee.style.removeProperty('--lc');
    if (bout.over) return finish();
    ui.locked = false;
    if (bout.phase === 'drink' && !B.drinkUseful(bout, me)) return closeDrink(); // nothing to sip or eat: straight on
    sync(); hint();
  }
  // The Drink phase: sip once, eat once, then the next turn. Your opponent drinks when you move on.
  function closeDrink() { drinkPhase(bout, opp); B.nextTurn(bout); setMode(null); spyPhase(); sync(); hint(); turnSign(); autoSkip(); }
  // a Spy on top of one of your stacks: your opponent makes this phase's plays now, and you see them
  const spyKey = () => `${bout.turn}:${bout.phase}`;
  function spyPhase() {
    if (!B.spying(me) || !B.PHASES.includes(bout.phase) || ui.spied === spyKey()) return;
    ui.spyBefore = new Set(opp.run.map((e) => e.uid)); planPhase(bout, opp); ui.spied = spyKey();
    const tn = (e) => D.TRICKS[e.trick.id].name, at = where;
    const seen = bout.phase === 'draw' ? opp.run.filter((e) => !ui.spyBefore.has(e.uid)).map(tn) : bout.phase === 'roll' ? [tx('table.to-throw', { diceN: opp.pick.dice.length + opp.pick.flips.length })]
      : bout.phase === 'bid' ? opp.run.filter((e) => e.state === 'bid').map((e) => tx('table.on-4', { bidValue: e.bidValue, tn: tn(e) })) : [...placed(opp), ...opp.run.filter((e) => e.state === 'bid' && e.target).map((e) => tx('table.at-2', { tn: tn(e), at: at(e.target) }))];
    feedPush(tx('table.your-spy', { name: opp.name, v: bout.phase === 'aim' ? 'aims' : bout.phase + 's', v2: seen.length ? names(seen) : 'nothing' }), 1);
  }
  // ---------- the test table's tools (Build mode) ----------
  // The chip painter (chippaint.js), on the table itself: its tools start switched off (the table is being played),
  // its rack opens from the chip shown in the bar. A space is any space of either position; the chip pointed at in
  // its stack is the one Insert, Change and Remove work on.
  function testTools() {
    const P = chipPainter({ surface: root, idle: true, items: chipChoices, look: (it) => it.look, tip: (it) => chipTip(it.look), pick: { get: () => testBrush, set: (v) => { testBrush = v; } },
      targetAt: (ev) => { const el = ev.target.closest?.('[data-at]'); if (!el) return null; const [si, r, c] = el.dataset.at.split(':').map(Number); const pt = ui.point && ui.point.si === si && ui.point.r === r && ui.point.c === c ? ui.point.id : null;
        return { key: `${el.dataset.at}:${pt ?? ''}`, si, r, c, id: pt }; },
      apply: (at, op, it) => { if (!B.sandboxChip(bout, at.si, at.r, at.c, it.what, op, at.id)) return tt('test.tools.cannot'); ui.point = null; sync(); return null; },
      warn: (msg, at) => nope(msg, els.cells[at.si][at.r][at.c]) });
    ui.sandbox = P.state;
    const tray = h('div', { class: 'test-rack', hidden: 'hidden' }, P.rack), brush = btn('', () => { tray.hidden = !tray.hidden; }, tt('test.tools.brush.tip'), 'small rack-open'); guided(brush, 'brush');
    const show = () => brush.replaceChildren(chipEl(P.state.it.look)); P.rack.addEventListener('click', () => { show(); tray.hidden = true; }); show();
    const leave = btn(tt('test.tools.leave'), () => onDone(), tt('test.tools.leave.tip'), 'small danger');
    return h('div', { class: 'test-tools' }, h('b', { text: tt(ctx.sandbox ? 'test.tools.sandbox' : 'test.tools.rules') }), brush, P.tools, leave, tray);
  }
  // what the test table's rack holds: every chip the game has, each as { key, what (for the engine), look (to draw) }
  function chipChoices() {
    const it = (key, what, look) => ({ key, what, look }), k = (kind) => it(`k:${kind}`, { kind }, { kind, value: 0 });
    return [{ cap: tt('test.tools.table') }, ...D.DENOM_VALUES.map((v) => it(`std:${v}`, { kind: 'std', value: v }, { kind: 'std', value: v })), it('debt', { kind: 'debt', value: 1 }, { kind: 'stray', value: 1 }), ...D.LAY_TABLE.map(k),
      { cap: tt('test.tools.hazards') }, ...D.LAY_HAZARDS.map(k),
      ...(Object.keys(D.MADE_CHIPS).length ? [{ cap: tt('test.tools.made') }, ...Object.entries(D.MADE_CHIPS).map(([id, M]) => it(`made:${id}`, D.layWhat(id), { kind: 'made', model: id, value: M.value || 0, name: M.name }))] : []),
      { cap: tt('test.tools.effect') }, ...Object.keys(D.SHOP_CHIPS).map((id) => it(`shop:${id}`, D.layWhat(id), { kind: 'fx', value: 0, shop: id, resist: id }))];
  }
  async function finish() {
    document.removeEventListener('keydown', onKey); if (rightClick.take) rightClick.take = null;
    // One thing at a time. First the table's own moment: the call, the loser's sign sparking out and going dark, the
    // winner's sign taking its lap. Nothing else comes up over it. Only when that has played does the match's readout
    // (the card with Continue) come in; the settlement follows from there.
    const win = bout.winner === 0; ui.locked = true; setMode(null); ui.hand = []; prompt = ''; renderFeed(); showForecast(null); showLanding(null);
    const [mineEl, theirsEl] = [root.querySelector('.who.me .plate'), root.querySelector('.who.them .plate')];
    sfx(win ? 'win' : 'lose'); lights('flash'); neonCall(tx(win ? 'table.win-call' : 'table.lose-call'), win ? '#7dff9e' : '#ff4d6a', 2600);
    killSign(win ? theirsEl : mineEl); celebrateSign(win ? mineEl : theirsEl, 3000); sfx('spent', 250, { pan: win ? 0.5 : -0.3 }); sfx('spent', 900, { pan: win ? 0.5 : -0.3 }); // the sign sparks and buzzes out
    await wait(3100 / ui.speed);
    banner.append(h('div', { class: `banner-card ${win ? 'win' : 'lose'}` }, h('h1', { text: win ? tx('table.the-table-is-yours') : tx('table.broke') }),
      h('p', { text: win ? tx('table.is-out-of-worth', { name: opp.name, turn: bout.turn }) : tx('table.takes-everything-on-the', { name: opp.name }) }),
      btn(tx('title.continue'), () => onDone(), null, 'big go')));
    requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add('in')));
  }

  paintNeon();
  if (globalThis.RP) globalThis.RP.table = { sync, commit, finish }; // ?debug: for automated playthroughs and checks (tools/)
  requestAnimationFrame(() => { spyPhase(); sync(); hint(); turnSign(); autoSkip(); });
  void ctx; void sum;
}
