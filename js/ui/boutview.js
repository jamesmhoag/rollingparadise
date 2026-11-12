// The table. Every chip, die, trick card and creature is one persistent element that is
// moved, faded or flipped to follow the bout state, so nothing ever pops between states.
import { h, tip, wait, tween, swapText, setOn, pulse, syncList, toast, btn, refreshTip, box, vc, detail } from './core.js';
import { chipSig, chipGlyph, chipName, chipText, dieTip, trickTip, pips, statTip, drinkTip, dieMarks, dieClass, trickLook, feltStyle, seenAs, traitsOf, traitsHtml } from './parts.js';
import { flyerTraits } from '../traits.js';
import { openLibrary } from './library.js';
import * as D from '../data.js';
import * as B from '../bout.js';
import { planPhase, drinkPhase } from '../ai.js';
import { sum } from '../util.js';

const TOP = 100, CH = 50, PX = 590, OX = 690, CHIP = 32;
const STAGE = [{ x: 624, y: 284 }, { x: 624, y: 178 }], HOUSE = { x: 624, y: 30 };
const fmtX = (m) => '×' + (m % 1 ? m.toFixed(2).replace(/0$/, '') : m);

export function boutScene(root, bout, ctx, onDone) {
  const [me, opp] = bout.sides;
  const cw = bout.sides.map((s) => Math.min(52, Math.floor(540 / s.rows)));
  const ui = { mode: null, die: null, entry: null, locked: false, speed: globalThis.RP_FAST || 1, first: true, sel: new Set(), flips: [], chip: null, card: null }; // RP_FAST: set by automated playthroughs
  // sel: Pouch dice picked for the throw · flips: stacks whose top chip is picked to flip · chip: the stack picked to bid from · card: trick under the pointer
  const els = { chips: new Map(), dice: new Map(), cards: new Map(), cells: [[], []], creatures: new Map(), stage: new Map() };
  const layer = h('div', { class: 'bout-layer' });
  root.classList.add('bout');
  // the table's felt: for now it only sets the colour
  const feltBg = h('div', { class: 'table-felt', style: feltStyle(ctx?.felt || 'felt'), tip: () => { const F = D.feltOf(ctx?.felt || 'felt'); return `<b>${F.name} felt</b><p>${F.line}</p><p class="dim">No board effect yet.</p>`; } });
  root.append(feltBg);
  const fxLayer = h('div', { class: 'fx-chips' }); root.append(fxLayer); // effect chips lie on the table, under the stacks

  // ---------- geometry ----------
  const cellPos = (side, r, c) => ({ x: side === 0 ? PX - (r + 1) * cw[0] : OX + r * cw[1], y: TOP + c * CH, w: cw[side] });
  const chipPos = (side, r, c, lvl) => { const p = cellPos(side, r, c); return { x: p.x + p.w / 2 - CHIP / 2, y: p.y + CH - CHIP - 5 - Math.min(lvl, 12) * 4, z: 20 + c * 40 + lvl }; };
  function cardLayout() {
    const out = new Map(), n = me.run.length, w = Math.min(122, Math.floor(626 / Math.max(1, n)) - 6);
    me.run.forEach((e, i) => out.set(e.uid, { x: 248 + i * (w + 6), y: 466, w, h: 242, open: true, e }));
    const step = Math.min(34, Math.floor(262 / Math.max(1, me.book.length)));
    me.book.forEach((t, i) => out.set(t.uid, { x: 16, y: 444 + i * step, w: 220, h: Math.min(30, step - 3), open: false, t }));
    return out;
  }
  const dieSlot = (cl, i) => ({ x: cl.x + 7 + (i % 3) * 36, y: cl.y + 50 + Math.floor(i / 3) * 36 });
  const pouchSlot = (i, n) => { const per = n > 15 ? 6 : 5, st = n > 15 ? 30 : 36; return { x: 888 + (i % per) * st, y: 544 + Math.floor(i / per) * st }; };
  const traySlot = (i) => ({ x: 892 + (i % 5) * 36, y: 442 + Math.floor(i / 5) * 36 }); // the roll: room for two rows of dice
  // the Stage: what each Roller has paid, stacked in front of the House
  const stageDenoms = (si) => { let n = bout.stage.paid[si]; const out = []; for (const v of [10, 5, 2, 1]) while (n >= v && out.length < 16) { out.push(v); n -= v; } return out; };
  const stageSlot = (si, k, n) => ({ x: (n > 8 ? 606 : 624) + Math.floor(k / 8) * 36, y: STAGE[si].y - (k % 8) * 5, z: 10 + k });

  // ---------- static frame ----------
  const worthEl = [h('b', { class: 'num' }), h('b', { class: 'num' })], stageEl = [h('b', { class: 'num' }), h('b', { class: 'num' })];
  const owesEl = [h('span', { class: 'owes-t' }), h('span', { class: 'owes-t' })];
  const owedBy = (s) => sum(s.grid.flat(), B.debtOf);
  const worthTip = (s) => () => `<b>Worth ${B.worth(s)}¢</b><p>The chips in ${s.idx ? 'their' : 'your'} position, less any Debt on them. Reach zero and the bout is lost.</p>${owedBy(s) ? `<p class="bad">${owedBy(s)}¢ of Debt is waiting on ${s.idx ? 'their' : 'your'} stacks. It is already taken off Worth; the chips go to the Stage once each stack's Debt covers its top chip.</p>` : ''}`;
  const badgeBox = [h('div', { class: 'badges' }), h('div', { class: 'badges right' })];
  // the three planning phases, shown as steps: the current one is lit, finished ones are dimmed
  const STEPS = [
    ['draw', 'Draw', 'trickery', 'conviction', 'Click tricks in your Book to show them on your Run. Draw at least one, then press Roll. Rolling ends drawing for the turn.'],
    ['roll', 'Roll', 'proficiency', 'cunning', 'Pick the dice to roll from your Pouch (and any top chips to flip), then press Roll: they all land in the roll together, once a turn. Put at least one on a trick and leave the rest, then press Bid. You can still move these dice between tricks until you press Play.'],
    ['bid', 'Bid', 'ingenuity', 'charisma', 'Click one of your stacks to pick up its top chip, then click a trick to bid it. Repeat until you are out of bids; a trick can take several. Bid at least one chip, then press Bluff. Until the turn plays you can move this turn’s dice between tricks, and Undo takes back your bids.'],
    ['aim', 'Bluff', null, null, 'The bids are out: you see what your opponent bid on, they see yours. Now aim each bid trick: click a trick, then a space. Their aims stay hidden until the House plays them. Then press Play.']];
  const pill = {}, pillEl = {};
  const pillTip = (k, c, what) => () => !k ? `<b>Bluff</b><p>${what}</p>` : `${statTip(k, B.tipOf(me, k))}<p class="dim">Left unused: ${statTip(c, B.cOf(me, c)).replace(/<b>.*?<\/b>/, '')}</p><p>${what}</p><p class="dim">You see this part of ${opp.name}'s turn only after you lock in yours.</p>`;
  const header = h('div', { class: 'bout-head' },
    h('div', { class: 'who me' }, h('div', { class: 'name' }, h('b', { text: 'You' }), h('span', { class: 'dim', text: ` ${D.CLASSES[me.cls].name}` })),
      h('div', { class: 'worth', tip: worthTip(me) }, 'Worth ', worthEl[0], '¢', owesEl[0]),
      h('div', { class: 'pills steps' }, STEPS.map(([k, name, stat, reward, what], i) => (pillEl[k] = h('span', { class: 'pill step', tip: pillTip(stat, reward, what) },
        h('em', { text: String(i + 1) }), ` ${name} `, (pill[k] = h('span'))))))),
    h('div', { class: 'mid' }, h('div', { class: 'turn', tip: () => `<b>Turn ${bout.turn}</b><p>Both Rollers plan, then every effect plays in order: Investments, Insurances, Expenses, Corrections.</p><p>Last call: from turn ${B.LAST_CALL + 1} every Expense is multiplied, more each turn. At turn ${bout.rules.maxTurns} the most Worth wins.</p>` }, 'Turn ', h('b', { class: 'num turn-n', text: '1' })),
      h('div', { class: 'house', tip: '<b>The House</b><p>Every chip you bid is paid to the House and is gone for good.</p>', text: 'THE HOUSE' })),
    h('div', { class: 'who them' }, h('div', { class: 'name' }, h('b', { text: opp.name }), h('span', { class: 'dim', text: ` ${opp.title || ''} · ${D.CLASSES[opp.cls].name}` })),
      h('div', { class: 'worth', tip: worthTip(opp) }, 'Worth ', worthEl[1], '¢', owesEl[1]),
      h('div', { class: 'pills' }, ['trickery', 'proficiency', 'ingenuity', 'charisma', 'cunning', 'conviction'].map((k) =>
        h('span', { class: 'pill small', tip: () => statTip(k, k in opp.tip ? B.tipOf(opp, k) : B.cOf(opp, k)) }, `${D.STATS[k].short} `, h('b', { text: k in opp.tip ? opp.tip[k] : opp.c[k] }))))));
  const stageBox = h('div', { class: 'stage-box' },
    h('div', { class: 'pot', style: { top: '102px' }, tip: `<b>${opp.name}'s fees on the Stage</b><p>Chips they have paid, stacked in front of the House. Win the bout and they are yours. Charisma steals from here.</p>` }, h('em', { text: 'THEIRS ' }), stageEl[1], '¢'),
    h('div', { class: 'stage-label', text: 'STAGE' }),
    h('div', { class: 'pot', style: { top: '324px' }, tip: '<b>Your fees on the Stage</b><p>Chips you have paid, stacked in front of the House. Gather or steal them back during the bout. Win and they are all restored; lose and your opponent keeps them.</p>' }, h('em', { text: 'YOURS ' }), stageEl[0], '¢'));
  // the action feed: always on screen, newest line at the bottom, with the House's phase tracker above it
  const PHASES = [['bids', 'Bids', '#ffd76a'], ...['investment', 'insurance', 'expense', 'correction'].map((k) => [k, D.TYPES[k].name + 's', D.TYPES[k].color]), ['house', 'House', '#ffd76a']];
  const phaseEls = {};
  const phasesEl = h('div', { class: 'phases' }, PHASES.map(([k, name, color]) => (phaseEls[k] = h('span', { style: { '--pc': color }, text: name,
    tip: k === 'bids' ? '<b>Bids</b><p>First the House collects every chip bid this turn.</p>' : k === 'house' ? '<b>House</b><p>Last: hazards, creatures and calamities act, then rewards for unused draws, rolls and bids are paid.</p>' : `<b>${name}</b><p>${D.TYPES[k].text}</p><p class="dim">Both Rollers' ${name.toLowerCase()} play together. Each is worked out from the table as it stood when the phase was called, so nothing played in a phase changes anything else in that phase.</p>` }))));
  const feedLines = h('div', { class: 'feed-lines list' });
  const feedEl = h('div', { class: 'feed', tip: () => `<b>Table talk</b><ul>${bout.log.slice(-14).map((l) => `<li>${l}</li>`).join('') || '<li>Nothing yet.</li>'}</ul>` }, phasesEl, feedLines);
  const feed = []; let feedN = 0, prompt = '';
  function renderFeed() {
    const items = feed.slice(prompt ? -3 : -4); if (prompt) items.push({ k: 'prompt', text: prompt, cls: 'prompt' });
    syncList(feedLines, items, (x) => x.k, (x) => h('div', { class: `feed-line ${x.cls}` }), (el, x) => { swapText(el, x.text); el.classList.toggle('now', x === items[items.length - 1]); });
  }
  const feedPush = (text, who) => { feed.push({ k: ++feedN, text, cls: who === 0 ? 'you' : who === 1 ? 'them' : 'house' }); if (feed.length > 30) feed.shift(); renderFeed(); };
  const setPrompt = (text) => { if (prompt === text) return; prompt = text; renderFeed(); };
  function setPhase(ph) { const at = PHASES.findIndex((x) => x[0] === ph); PHASES.forEach(([k], i) => { phaseEls[k].classList.toggle('on', i === at); phaseEls[k].classList.toggle('done', at >= 0 && i < at); }); }
  // the House's two arms: the left one works your side of the table, the right one your opponent's.
  // Each points at what it is resolving, and both move together when a phase is played.
  const phaseCall = h('div', { class: 'phase-call' });
  const arms = [0, 1].map((i) => { const el = h('div', { class: `stick arm${i}`, style: { left: `${i ? 668 : 612}px` } }), piv = { x: i ? 668 : 612, y: 62 }, rest = i ? 0 : 180; let ang = rest;
    return { el, to(x, y) { const dx = x - piv.x, dy = y - piv.y; let a = Math.atan2(dy, dx) * 180 / Math.PI; while (a - ang > 180) a -= 360; while (a - ang < -180) a += 360; ang = a;
      el.style.width = `${Math.max(30, Math.hypot(dx, dy) - 8)}px`; el.style.transform = `rotate(${a}deg)`; el.classList.add('live'); },
      rest() { let a = rest; while (a - ang > 180) a -= 360; while (a - ang < -180) a += 360; ang = a; el.style.width = '60px'; el.style.transform = `rotate(${a}deg)`; el.classList.remove('live'); }, tap() { pulse(el, 'tap'); } }; });
  let calling = [];
  const callEl = (st) => (st.uid == null ? null : st.who === 0 ? els.cards.get(st.uid) : [...oppRun.children].find((x) => x._key === st.uid));
  function setCalling(parts) { const next = parts.map(callEl).filter(Boolean); for (const el of calling) if (!next.includes(el)) el.classList.remove('calling'); for (const el of next) el.classList.add('calling'); calling = next; }
  function trickPoint(st) { if (st.uid == null) return null; if (st.who === 0) { const cl = cardLayout().get(st.uid); return cl ? { x: cl.x + cl.w / 2, y: cl.y + 12 } : null; } const el = [...oppRun.children].find((x) => x._key === st.uid); if (!el) return null; const bx = box(el); return { x: bx.x + 8, y: bx.y + bx.h / 2 }; }
  const runEmpty = h('div', { class: 'run-empty', tip: '<b>Run</b><p>Tricks you have shown. They stay until you bid on them and they finish playing.</p>', text: 'Your Run. Click a trick in your Book to draw it here.' });
  const sipBtn = btn('Sip', () => { const why = B.canSip(bout, me); if (why) return nope(why, sipBtn); act(() => { B.sip(bout, me); toast(`You sip your ${me.drink.name}: it works next turn.`); }); }, () => (me.drink ? `${drinkTip(me.drink)}<p class="dim">Sip once a round, in the Drink phase at the end of the round. It works next turn.</p>` : ''), 'small');
  const undoBtn = btn('Undo', () => act(() => { B.resetPlan(bout, me); ui.sel.clear(); ui.flips = []; ui.chip = null; setMode(null); }),
    () => `<b>Undo</b><p>${bout.phase === 'draw' ? 'Put back the tricks you drew this turn.' : bout.phase === 'roll' ? (me.thrown ? 'Take the dice off your tricks and back into the roll. The throw itself stands: rolling is once a turn.' : 'Clear the dice and chips you picked to roll.') : 'Take back the bids you made this turn.'}</p>`, 'small');
  const speedBtn = btn('1×', () => { ui.speed = ui.speed === 1 ? 2 : ui.speed === 2 ? 4 : 1; swapText(speedBtn, `${ui.speed}×`); }, '<b>Speed</b><p>How fast the House works through a turn: 1×, 2× or 4×.</p>', 'small');
  const commitBtn = btn('Roll', () => commit(), () => commitTip(), 'big');
  const trayBox = h('div', { class: 'tray-box', text: 'Draw, then press Roll' });
  const frameEls = [header, stageBox, feedEl, runEmpty,
    h('div', { class: 'zone-title', style: { left: '16px', top: '418px' }, tip: '<b>Book</b><p>Tricks you own. Click one to draw it onto your Run. Tricks return here once played.</p>', text: 'BOOK' }),
    h('div', { class: 'zone-title', style: { left: '888px', top: '418px' }, tip: '<b>The roll</b><p>Everything you roll this turn lands here together, showing its value. Click a die, then the shown trick it should go on; click a die on a trick to take it back. At least one must go on a trick. Dice you leave here go back to your Pouch when you press Bid.</p>', text: 'THE ROLL' }), trayBox,
    h('div', { class: 'zone-title', style: { left: '888px', top: '524px' }, tip: '<b>Pouch</b><p>Your dice. In the Roll phase, click dice to pick them (up to your Proficiency), then press Roll. You can also pick the top chip of a stack to flip: it lands as 0 or its worth, counts as a die of any type, and comes back to your Meter afterwards.</p>', text: 'POUCH' }),
    h('div', { class: 'zone-title', style: { left: '1082px', top: '418px' }, tip: `<b>${opp.name}'s Run</b><p>The tricks they are showing, with the dice and bids on them. You see what they draw, roll and bid each phase only once you have locked in the same phase: neither of you sees the other's move until both have made it.</p>`, text: 'THEIR RUN' }),
    h('div', { class: 'controls' }, sipBtn, undoBtn, speedBtn, commitBtn),
    btn('Library', () => openLibrary(), '<b>Library</b><p>Every chip, trick, die, card, drink, wallet, jacket and felt, and the upgrades for each.</p>', 'small lib-btn')];
  const oppRun = h('div', { class: 'opp-run' });
  const banner = h('div', { class: 'banner' });
  const fcLayer = h('div', { class: 'fc-layer' }); // fee forecasts and Debt tags over the stacks
  root.append(...frameEls, oppRun, layer, fcLayer, arms[0].el, arms[1].el, phaseCall, banner);
  // table-sized weather: a see-through sheet over each position (snow for a Blizzard, light for the Sun or Moon)
  const weatherEls = bout.sides.map((s, si) => { const a = cellPos(si, si === 0 ? s.rows - 1 : 0, 0), w = s.rows * cw[si];
    const el = h('div', { class: 'weather', style: { left: a.x + 'px', top: TOP + 'px', width: w + 'px', height: s.dims.cols * CH + 'px' } },
      ...Array.from({ length: 26 }, (_, i) => h('i', { style: { left: `${(i * 37) % 100}%`, animationDelay: `${-(i * 0.73) % 6}s`, animationDuration: `${4 + (i % 5)}s` } })));
    root.insertBefore(el, layer); return el; });

  // cells
  bout.sides.forEach((s, si) => {
    for (let r = 0; r < s.rows; r++) { els.cells[si][r] = [];
      for (let c = 0; c < s.dims.cols; c++) {
        const p = cellPos(si, r, c);
        const el = h('div', { class: `cell ${r < s.dims.meterRows ? 'meter' : 'bar'}`, style: { left: p.x + 'px', top: p.y + 'px', width: p.w + 'px', height: CH + 'px' },
          onclick: () => clickCell(si, r, c), ondblclick: () => eatCell(si, r, c), onmouseenter: () => hoverCell(si, r, c), onmouseleave: () => hoverCell(si, -1, -1), tip: () => cellTip(si, r, c) });
        els.cells[si][r][c] = el; root.insertBefore(el, layer);
      } }
    const m = s.dims.meterRows, x0 = cellPos(si, si === 0 ? m - 1 : 0, 0).x, x1 = cellPos(si, si === 0 ? s.rows - 1 : m, 0).x;
    root.insertBefore(h('div', { class: 'zone-label', style: { left: x0 + 'px', width: m * cw[si] + 'px', top: TOP + 5 * CH + 4 + 'px' }, text: 'METER', tip: () => positionTip(s, 'meter') }), layer);
    root.insertBefore(h('div', { class: 'zone-label', style: { left: x1 + 'px', width: s.dims.barRows * cw[si] + 'px', top: TOP + 5 * CH + 4 + 'px' }, text: 'BAR', tip: () => positionTip(s, 'bar') }), layer);
  });

  // ---------- tooltips ----------
  // How a position's size comes from its Roller's attributes. Depth runs away from the Stage (rows), width
  // runs along it (lanes), height is how tall a stack may grow.
  const BASE = D.BASE_DIMS;
  function srcList(s, k) { const w = s.why?.[k] || []; return w.length ? w.map(([src, n]) => `${n > 0 ? '+' : ''}${n} ${src}`).join(', ') : 'no bonuses'; }
  function positionTip(s, zone) {
    const d = s.dims, who = s.idx ? s.name + "'s" : 'Your', bal = d.stackMax - BASE.stackMax, ver = d.meterRows - BASE.meterRows, dep = d.barRows - BASE.barRows;
    const meter = zone === 'meter', rows = meter ? d.meterRows : d.barRows, base = meter ? BASE.meterRows : BASE.barRows, extra = meter ? ver : dep, stat = meter ? 'Versatility' : 'Depth', k = meter ? 'versatility' : 'depth';
    const role = meter ? 'The front rows, nearest the Stage. Only chips gained during the bout land here: Blocks, Opportunity chips, recovered chips, flipped chips coming home. Fees hit the front first, so the Meter shields your Bar.'
      : 'The back rows. The chips you committed before the bout, and they must survive to the end. Shop chips sit at the base of these stacks.';
    const cap = rows * d.cols * d.stackMax;
    return `<b>${who} ${meter ? 'Meter' : 'Bar'}</b> <span class="dim">${rows} deep × ${d.cols} wide × ${d.stackMax} high · holds ${cap}</span>
      <p class="v">${role}</p>
      <ul><li><b>Depth ${rows} rows</b> = ${base} base ${extra >= 0 ? '+' : '−'} ${Math.abs(extra)} ${stat}<span class="v"> (from ${srcList(s, k)})</span></li>
      <li><b>Width ${d.cols} lanes</b><span class="v">: the same for every Roller. Each lane runs from the Stage to the edge; overkill only travels down its own lane.</span></li>
      <li><b>Height ${d.stackMax} chips</b> = ${BASE.stackMax} base ${bal >= 0 ? '+' : '−'} ${Math.abs(bal)} Balance<span class="v"> (from ${srcList(s, 'balance')}). Shared by the Meter and the Bar.</span></li></ul>
      ${s.why?.note ? `<p class="dim">${s.why.note}</p>` : ''}
      <p class="dim">${meter ? `The Bar behind it is ${d.barRows} deep (${BASE.barRows} base + Depth).` : `The Meter in front is ${d.meterRows} deep (${BASE.meterRows} base + Versatility).`} Raise Balance, Versatility and Depth with your class, jacket, cards and the Position tilt.</p>`;
  }
  function cellTip(si, r, c) {
    const s = bout.sides[si], cell = s.grid[r][c], zone = r < s.dims.meterRows ? 'Meter' : 'Bar';
    if (cell.black) return `<b>${D.CALAMITIES.blackhole.name}</b><p>${D.CALAMITIES.blackhole.text}</p>`;
    if (cell.roost) { const eggs = cell.chips.filter((ch) => ch.kind === 'egg'); return `<b>Dragon Roost</b>${eggs.length ? ` <span class="dim">${eggs.length} egg${eggs.length > 1 ? 's' : ''}</span>` : ''}<p>${eggs.length ? `No Dragon comes while an egg sits here. Each egg takes 2 hatch steps a turn here (${eggs.map((e) => `${e.prog || 0}/5`).join(', ')}) and hatches a Dragon at ${s.idx ? 'its owner' : 'you'}; break it first (5 whole fees) or play a trick totalling 10 or more to hatch it at your opponent.` : 'Every third turn it calls a Dragon, which burns a chip and lays an egg here.'}</p>`; }
    if (cell.link) return cellTip(si, cell.link.r, cell.link.c);
    if (cell.puddle && !cell.chips.length) return `<b>${cell.puddle.ice ? 'Iced-over Puddle' : 'Puddle'}</b><p>${cell.puddle.ice ? 'Frozen. It thaws under the Sun or in the rain.' : 'Water on an empty space. Nothing can be played here until it dries, after a turn without water.'}</p>${cell.hole ? '<p class="dim">It fills a Hole: Wood can float here.</p>' : ''}`;
    if (cell.worm && !cell.chips.length) return `<b>${D.CALAMITIES.wormhole.name}</b><p>${D.CALAMITIES.wormhole.text}</p>`;
    if (cell.volcano > 0) return `<b>${D.CALAMITIES.volcano.name}</b> <span class="dim">${cell.volcano} turn${cell.volcano > 1 ? 's' : ''} left</span><p>${D.CALAMITIES.volcano.text}</p>`;
    if (cell.hole) return `<b>Hole</b><p>Nothing can be placed here. It does not move.</p>`;
    const dimLine = `<p class="dim">${zone} row ${zone === 'Meter' ? r + 1 : r - s.dims.meterRows + 1} of ${zone === 'Meter' ? s.dims.meterRows : s.dims.barRows}, lane ${c + 1} of ${s.dims.cols}. Hover the ${zone.toUpperCase()} label for how the position's size is set.</p>`;
    if (!cell.chips.length) return `<b>Empty ${zone} space</b><p>Holds up to ${s.dims.stackMax} chips (${D.BASE_DIMS.stackMax} + ${s.dims.stackMax - D.BASE_DIMS.stackMax} Balance).</p>${fxTip(si, r, c)}${dimLine}`;
    const groups = []; for (let i = cell.chips.length - 1; i >= 0; i--) { const ch = seenAs(cell.chips[i], si), g = groups[groups.length - 1]; if (g && g.sig === chipSig(ch)) g.n++; else groups.push({ sig: chipSig(ch), ch, n: 1 }); }
    const top = seenAs(cell.chips[cell.chips.length - 1], si), debt = B.debtOf(cell), next = B.debtTarget(cell), hard = B.hardOf(cell);
    return `<b>${zone} stack</b> <span class="dim">${B.solidCount(cell)}/${s.dims.stackMax} high · worth ${B.cellWorth(cell)}¢${debt ? ` · owes ${debt}¢` : ''}</span>
      ${hard > 0 ? `<p class="good">Hardened for ${hard} more turn${hard > 1 ? 's' : ''}: each fee takes only one chip.</p>` : ''}
      ${B.lifted(cell) ? '<p class="good">Lifted by a Heli-Chipter: flying, and it plays from the bottom.</p>' : ''}${cell.anchor ? '<p class="dim">Covers two spaces by two.</p>' : ''}${cell.cut ? `<p class="dim">A dormant Volcano left it ${cell.cut} lower.</p>` : ''}
      ${debt && next ? `<p class="bad">Owes ${debt}¢. Debt only pays whole chips, so the ${next.value}¢ chip it sits on goes to the Stage once the Debt reaches ${next.value}¢: ${next.value - debt}¢ more, from any later fee or hazard.</p>` : ''}
      ${debt ? `<p class="dim">${DEBT_RULE}</p>` : ''}
      <ul class="stack">${groups.map((g) => `<li><span class="chip static mini ${g.sig}"><i>${chipGlyph(g.ch)}</i></span> ${g.n} × ${chipName(g.ch)}</li>`).join('')}</ul>
      ${si === 0 && !B.canEat(bout, me, r, c) ? (() => { const f = B.foodOf(me, r, c); return `<p class="good keep">Double-click to eat ${f.label}: ${Object.entries(f.mods).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${D.STATS[k].name}`).join(', ')}${f.turns > 1 ? ` for ${f.turns} turns` : ' this turn'}.</p>`; })() : ''}
      <p class="dim">Top: ${chipText(top)}</p>${traitsHtml(traitsOf(top, { cell }))}${fxTip(si, r, c)}${dimLine}`;
  }
  const DEBT_RULE = 'How Debt works: a fee is paid from the top of the stack it lands on, one whole chip at a time. What cannot cover the next chip stays on that stack as Debt and already counts against Worth. If the stack runs out of chips, the rest (overkill) moves to the next stack behind it in the same lane (the line of stacks running from the Stage to the edge of the table). It never spreads to another lane, and with no stack behind it is wasted.';
  function cardTip(uid) {
    const e = me.run.find((x) => x.uid === uid), t = e ? e.trick : me.book.find((x) => x.uid === uid); if (!t) return '';
    let live = '';
    if (e) { const def = D.TRICKS[t.id];
      const P = B.totalParts(me, e);
      live = `<p class="live">${e.dice.length ? `Dice ${P.dice.join(' + ')} = ${P.diceSum}${P.linger ? `, +${P.linger} linger (${e.state === 'play' ? 'the bid' : `a ${e.bidValue}¢ bid`}: ${P.turns} turn${P.turns > 1 ? 's' : ''} × ${e.dice.length} dice)` : ''}${P.power ? `, +${P.power} Power` : ''}${P.venge ? `, +${P.venge} Vengeance` : ''}${P.mult !== 1 ? `, ×${+P.mult.toFixed(2)} quality` : ''}${P.heat !== 1 ? `, ×${P.heat.toFixed(2)} last call` : ''}${P.double ? ', ×2 bonus' : ''} → roll total <b>${P.total}</b>${e.paid ? `<br>Paid ${e.paid.join(' + ')}¢ to the House.` : ''}${B.bonusMet(me, e) ? ' · <span class="good">bonus met</span>' : ''}` : 'No dice yet: a bid plays the Trait only.'}
        ${e.state === 'play' ? `<br>In play${e.lingerLeft ? `, roll effect in ${e.lingerLeft} turn${e.lingerLeft > 1 ? 's' : ''}` : ''}.` : e.bidValue > 1 ? `<br>A ${e.bidValue}¢ bid lingers ${e.bidValue - 1} turn${e.bidValue > 2 ? 's' : ''}: +${(e.bidValue - 1) * Math.max(1, e.dice.length)} to the roll.` : ''}
        ${e.state !== 'play' ? '<br><span class="dim">It can take more bids this turn: each 1¢ over the first adds a turn of linger.</span>' : ''}</p>`;
      const fc = e.target ? B.forecastFee(bout, me, e, e.target) : null;
      if (fc && def.type === 'expense') live += `<p class="live">At the marked target, as the table stands now: ${fcSummary(fc)}</p>`; }
    return trickTip(t, me.cls, live);
  }

  // ---------- element factories ----------
  function mkChip(ch) { const el = h('div', { class: `chip ${chipSig(ch)}` }, h('i', { text: chipGlyph(ch) })); el._sig = chipSig(ch); layer.append(el); return el; }
  function mkDie(d) {
    const el = h('div', { class: `die ${d.chip ? 'flipc' : d.type} ${d.chip ? '' : dieClass(d)}`, onclick: () => clickDie(d.id) }, h('i', { text: d.type.slice(1) }), d.chip ? null : dieMarks(d));
    tip(el, () => {
      const on = B.holderOf(me, d.id), live = on ? on.dice.find((x) => x.id === d.id) : me.tray.find((x) => x.id === d.id);
      const where = on ? `On ${D.TRICKS[on.trick.id].name}. ${B.canMove(bout, me, d.id) ? 'Click to take it back and place it elsewhere.' : 'It stays until the trick has played.'}` : live ? 'Click it, then click the shown trick it should go on.' : 'Click to roll it. You see the value before you decide where it goes.';
      if (d.chip) return `<b>Flipped ${d.chip.value}¢ chip</b><p>Landed on <b>${live ? live.value : '?'}</b>. It counts as a die of any type. The chip returns to your Meter afterwards.</p><p>${where}</p>`;
      return dieTip(d, `${live ? `Rolled <b>${live.value}</b>. ` : ''}${where}`); });
    layer.append(el); return el;
  }
  function mkCard(t) {
    const def = D.TRICKS[t.id], T = D.TYPES[def.type];
    const el = h('div', { class: `tcard ${trickLook(t)}`, style: { '--tc': T.color }, onclick: (ev) => clickCard(t.uid, ev), onmouseenter: () => { ui.card = t.uid; marks(); }, onmouseleave: () => { if (ui.card === t.uid) { ui.card = null; marks(); } } },
      h('div', { class: 'c-compact' }, h('b', { text: def.name }), h('span', { class: 'req', text: `${def.count}${def.die}` }), h('span', { class: 'q', html: pips(t) })),
      h('div', { class: 'c-open' },
        h('div', { class: 'c-name' }, h('b', { text: def.name }), h('span', { class: 'q', html: pips(t) })),
        h('div', { class: 'c-type' }, T.name, h('span', { class: `xm ${t.up ? 'up' : ''}`, text: ` ${fmtX(B.multOf(t))}${'▲'.repeat(t.up || 0)}` }), h('span', { class: 'tgt', text: 'aim', 'data-act': 'target', tip: '<b>Aim</b><p>Change where this trick lands. While aiming, each stack shows what the fee would pay (gold), leave as Debt (red) and carry to the stack behind (pink).</p>' })),
        h('div', { class: 'c-slots' }, Array.from({ length: def.count }, () => h('span', { class: 'slot', text: def.die }))),
        h('div', { class: 'c-bid' }, h('span', { class: 'bidslot', text: 'BID', 'data-act': 'bid' })),
        h('div', { class: 'c-text' }, h('p', {}, h('em', { text: 'Roll ' }), def.roll.text), h('p', { class: 'bonus' }, h('em', { text: 'Bonus ' }), def.bonus.text)),
        h('div', { class: 'c-math' }), h('div', { class: 'c-paid' }),
        h('div', { class: 'c-total' }, h('span', { class: 'state' }), h('b', { class: 'num' }))));
    tip(el, () => cardTip(t.uid)); layer.append(el); return el;
  }
  const place = (el, x, y, extra = '') => { el.style.transform = `translate(${x}px, ${y}px) ${extra}`; };
  function spawn(el, x, y, extra, delay = 0) { // put an element at a starting state without animating, then release it
    el.style.transition = 'none'; el.style.opacity = '0'; place(el, x, y, extra); void el.offsetWidth; el.style.transition = ''; el.style.transitionDelay = delay ? `${delay}ms` : '';
    if (delay) setTimeout(() => { el.style.transitionDelay = ''; }, delay + 700);
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
      el.className = `fxchip s${t.n} ${t.good ? 'good' : 'bad'}`; el.children[0].textContent = t.glyph; el.children[1].textContent = t.value === '' ? '' : String(t.value); el.children[2].textContent = t.name;
    }
    for (const [k, el] of fxEls) if (!keep.has(k)) { el.style.opacity = '0'; fxEls.delete(k); setTimeout(() => el.remove(), 400); }
  }
  const fxTip = (si, r, c) => { const list = fxAt.get(`${si}:${r}:${c}`) || []; return list.length ? `<p class="keep"><span class="k">Effects</span> ${list.map((t) => `<b style="color:${t.good ? 'var(--good)' : 'var(--bad)'}">${t.name}${t.value !== '' ? ' ' + t.value : ''}</b><span class="v">: ${t.text}</span>`).join('; ')}</p>` : ''; };
  function sync(fx = {}) {
    layoutEffects();
    const cards = cardLayout();
    // trick cards
    for (const [uid, cl] of cards) {
      const t = cl.e ? cl.e.trick : cl.t; let el = els.cards.get(uid);
      if (!el) { el = mkCard(t); els.cards.set(uid, el); spawn(el, cl.x, cl.y + 20, ''); el.style.width = cl.w + 'px'; el.style.height = cl.h + 'px'; void el.offsetWidth; }
      el.style.opacity = '1'; place(el, cl.x, cl.y); el.style.width = cl.w + 'px'; el.style.height = cl.h + 'px';
      el.classList.toggle('open', cl.open); el.style.zIndex = cl.open ? 3 : 2;
      const e = cl.e; el.classList.toggle('narrow', cl.open && cl.w < 104);
      el.classList.toggle('bid', !!e && e.state === 'bid'); el.classList.toggle('inplay', !!e && e.state === 'play');
      el.classList.toggle('can', !e ? !ui.locked && !B.canDraw(bout, me, uid) : false);
      el.classList.toggle('pick', !!e && (ui.mode === 'die' ? !B.canPlace(bout, me, ui.die, e) : !!ui.chip && !B.canBid(bout, me, e, ui.chip.r, ui.chip.c)));
      el.classList.toggle('active', !!e && ui.entry === e.uid && (ui.mode === 'bid' || ui.mode === 'target'));
      if (e) {
        const def = D.TRICKS[t.id], met = B.bonusMet(me, e);
        el.querySelector('.bonus').classList.toggle('met', met); el.querySelector('.bonus').classList.toggle('na', !!def.cls && def.cls !== me.cls);
        el.querySelector('.tgt').classList.toggle('on', e.state === 'bid' && B.needsTarget(e));
        swapText(el.querySelector('.state'), e.state === 'play' ? (e.lingerLeft ? `lingers ${e.lingerLeft}` : 'in play') : e.state === 'bid' ? `${e.bidValue}¢ bid · ${e.bidValue > 1 ? `lingers ${e.bidValue - 1}` : 'plays now'}` : e.dice.length ? 'needs a bid' : 'shown');
        // bids sit in a row; the slot after them stays open so another chip can join (each 1¢ more lingers a turn longer)
        const slot = el.querySelector('.bidslot'), nb = e.bid.length;
        slot.style.marginLeft = nb ? `${10 * nb + 26}px` : '0px'; swapText(slot, nb ? '+' : 'BID');
        tween(el.querySelector('.c-total .num'), B.previewTotal(me, e), (n) => (e.dice.length ? '= ' + Math.round(n) : ''));
        const P = B.totalParts(me, e), bits = e.dice.length ? [P.dice.join('+')] : [];
        if (e.dice.length) { if (P.linger) bits.push(`+${P.linger} linger`); if (P.power) bits.push(`+${P.power} pow`); if (P.venge) bits.push(`+${P.venge} venge`); if (P.mult !== 1) bits.push(`×${+P.mult.toFixed(2)}`); if (P.heat !== 1) bits.push(`×${P.heat.toFixed(2)} call`); if (P.double) bits.push('×2'); }
        swapText(el.querySelector('.c-math'), bits.join(' '));
        swapText(el.querySelector('.c-paid'), e.state === 'play' && e.paid ? `paid ${e.paid.join('+')}¢${e.lingerLeft ? ` · ${e.lingerLeft} to go` : ''}` : '');
        [...el.querySelectorAll('.slot')].forEach((sl, i) => sl.classList.toggle('full', i < e.dice.length));
      }
    }
    for (const [uid, el] of els.cards) if (!cards.has(uid)) { el.style.opacity = '0'; els.cards.delete(uid); setTimeout(() => el.remove(), 500); }

    // dice: Pouch (unrolled), Rolled tray (value showing, not placed yet), or on a trick
    const wantDice = new Map(); me.pouch.forEach((d, i) => { const p = pouchSlot(i, me.pouch.length); wantDice.set(d.id, { ...p, y: p.y - (ui.sel.has(d.id) ? 7 : 0), d, picked: ui.sel.has(d.id) }); });
    me.tray.forEach((d, i) => wantDice.set(d.id, { ...traySlot(i), d, value: d.value, rolled: true }));
    for (const e of me.run) { const cl = cards.get(e.uid); e.dice.forEach((d, i) => wantDice.set(d.id, { ...dieSlot(cl, i), d, value: d.value, rolled: true, on: true })); }
    for (const [id, w] of wantDice) {
      let el = els.dice.get(id); if (!el) { el = mkDie(w.d); els.dice.set(id, el); const from = (w.d.chip && els.flipFrom?.get(id)) || { x: w.x, y: w.y - 16 }; spawn(el, from.x, from.y, 'scale(.4)'); }
      el.style.opacity = '1'; place(el, w.x, w.y); el.style.zIndex = w.on ? 6 : 4; el.classList.toggle('on', !!w.on); el.classList.toggle('rolled', !!w.rolled); el.classList.toggle('sel', (ui.mode === 'die' && ui.die === id) || !!w.picked);
      el.classList.toggle('fixed', !!w.on && !B.canMove(bout, me, id));
      const label = el.firstChild, text = w.rolled ? String(w.value) : w.d.type.slice(1);
      if (w.rolled && !el._rolled) { el.classList.add('rolling'); let n = 0; const f = D.DICE[w.d.type].faces; const iv = setInterval(() => { label.textContent = w.d.chip ? (Math.random() < 0.5 ? 0 : w.d.chip.value) : 1 + Math.floor(Math.random() * f); if (++n > 7) { clearInterval(iv); label.textContent = el._text; el.classList.remove('rolling'); } }, 55); }
      else if (label.textContent !== text && !el.classList.contains('rolling')) label.textContent = text;
      el._text = text; el._rolled = !!w.rolled;
    }
    els.flipFrom = null;
    for (const [id, el] of els.dice) if (!wantDice.has(id)) { el.style.opacity = '0'; els.dice.delete(id); setTimeout(() => el.remove(), 500); }
    trayBox.classList.toggle('has', me.tray.length > 0); trayBox.classList.toggle('ready', bout.phase === 'roll' && !me.thrown);
    swapText(trayBox, bout.phase === 'draw' ? 'Draw, then press Roll' : bout.phase === 'roll' && !me.thrown ? (selCount() ? `${selCount()} picked: press Roll` : `Pick up to ${B.tipOf(me, 'proficiency')} dice below, then Roll`) : me.tray.length ? '' : bout.phase === 'roll' ? 'All placed' : 'Rolled for this turn');

    // chips
    const want = new Map();
    bout.sides.forEach((s, si) => { for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.dims.cols; c++) { const cell = s.grid[r][c];
      if (cell.anchor && r + 1 < s.rows && c + 1 < s.dims.cols) { const a = cellPos(si, r, c), b2 = cellPos(si, r + 1, c + 1), cx = (a.x + b2.x) / 2 + a.w / 2, cy = (a.y + b2.y) / 2 + CH / 2;
        cell.chips.forEach((ch, lvl) => want.set(ch.id, { x: cx - CHIP / 2, y: cy - CHIP / 2 + 10 - Math.min(lvl, 12) * 5, z: 20 + c * 40 + lvl, ch: seenAs(ch, si), side: si, s: ch.big || ch.kind === 'volcano' ? 1.9 : 0 })); }
      else cell.chips.forEach((ch, lvl) => want.set(ch.id, { ...chipPos(si, r, c, lvl), ch: seenAs(ch, si), side: si })); } });
    for (const e of me.run) { const cl = cards.get(e.uid); e.bid.forEach((ch, i) => want.set(ch.id, { x: cl.x + 9 + i * 10, y: cl.y + 87, z: 900 + i, ch, side: 0 })); }
    const flipIds = new Set(ui.flips.map(({ r, c }) => B.bidChip(me, r, c)?.id)), bidId = ui.chip && B.bidChip(me, ui.chip.r, ui.chip.c)?.id;
    const ostep = Math.min(48, Math.floor(216 / Math.max(1, opp.run.length))); oppRun.style.setProperty('--oh', `${ostep - 6}px`);
    opp.run.forEach((e, k) => e.bid.forEach((ch, i) => want.set(ch.id, { x: 1226 - i * 10, y: 446 + k * ostep + (ostep - 6) / 2 - 16, z: 900 + i, ch, side: 1, s: Math.min(0.7, (ostep - 8) / 32) })));
    let n = 0;
    for (const [id, w] of want) {
      let el = els.chips.get(id); const extra = w.s ? `scale(${w.s})` : '';
      if (!el) { el = mkChip(w.ch); els.chips.set(id, el);
        if (fx[id] === 'from-stage') spawn(el, STAGE[w.side].x, STAGE[w.side].y, 'scale(.5)');
        else if (fx[id] === 'debt') spawn(el, HOUSE.x, HOUSE.y + 30, 'scale(.5)'); // Debt is dealt out by the House
        else if (ui.first) spawn(el, w.x, w.y - 46, '', Math.min(900, n * 5));
        else spawn(el, w.x, w.y, 'scale(.1)'); n++; }
      el._side = w.side; el.style.opacity = '1'; el.style.zIndex = w.z; place(el, w.x, w.y, extra);
      el.classList.toggle('flipsel', flipIds.has(id)); el.classList.toggle('bidsel', bidId === id);
      const sig = chipSig(w.ch);
      if (el._sig !== sig) { el._sig = sig; pulse(el, 'mutate'); setTimeout(() => { el.className = `chip ${sig} mutate`; el.firstChild.textContent = chipGlyph(w.ch); }, 170); }
    }
    for (const [id, el] of els.chips) if (!want.has(id)) {
      const how = fx[id] || 'void', m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(el.style.transform), x = +m[1], y = +m[2];
      el.style.zIndex = 950; el.style.opacity = '0';
      if (how === 'stage') { el.classList.add('paying'); place(el, STAGE[el._side].x, STAGE[el._side].y, 'scale(.6)'); }
      else if (how === 'house') { el.classList.add('paying'); place(el, HOUSE.x, HOUSE.y, 'scale(.5)'); }
      else if (how === 'abduct') place(el, x, y - 190, 'scale(.7)');
      else place(el, x, y - 6, 'scale(.1) rotate(140deg)');
      els.chips.delete(id); setTimeout(() => el.remove(), 620);
    }
    ui.first = false;
    // Stage stacks
    const wantStage = new Map(); [0, 1].forEach((si) => { const dn = stageDenoms(si); dn.forEach((v, k) => wantStage.set(`${si}-${k}`, { ...stageSlot(si, k, dn.length), v })); });
    for (const [key, w] of wantStage) {
      let el = els.stage.get(key); const sig = `k-std v${w.v}`;
      if (!el) { el = h('div', { class: `chip staged ${sig}` }, h('i', { text: String(w.v) })); el._sig = sig; layer.append(el); els.stage.set(key, el); spawn(el, w.x, w.y - 10, 'scale(.2)', ui.locked ? 420 : 0); }
      el.style.opacity = '1'; el.style.zIndex = w.z; place(el, w.x, w.y);
      if (el._sig !== sig) { el._sig = sig; pulse(el, 'mutate'); setTimeout(() => { el.className = `chip staged ${sig} mutate`; el.firstChild.textContent = String(w.v); }, 170); }
    }
    for (const [key, el] of els.stage) if (!wantStage.has(key)) { el.style.opacity = '0'; const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(el.style.transform); place(el, +m[1], +m[2] - 8, 'scale(.2)'); els.stage.delete(key); setTimeout(() => el.remove(), 620); }

    // cells, creatures, numbers
    const tags = [];
    bout.sides.forEach((s, si) => { for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.dims.cols; c++) { const el = els.cells[si][r][c], cell = s.grid[r][c], debt = B.debtOf(cell); el.classList.toggle('hole', !!cell.hole); el.classList.toggle('hard', B.hardOf(cell) > 0); el.classList.toggle('puddle', !!cell.puddle && !cell.chips.length); el.classList.toggle('ice', !!cell.puddle?.ice); el.classList.toggle('link', !!cell.link || !!cell.anchor); el.classList.toggle('cut', !!cell.cut); el.classList.toggle('lifted', B.lifted(cell)); el.classList.toggle('black', !!cell.black); el.classList.toggle('worm', !!cell.worm); el.classList.toggle('roost', !!cell.roost); el.classList.toggle('egg', !!cell.roost && cell.chips.some((ch) => ch.kind === 'egg')); el.classList.toggle('food', si === 0 && !B.canEat(bout, me, r, c)); el.classList.toggle('volcano', cell.volcano > 0); el.classList.toggle('owes', debt > 0);
      if (debt) { const next = B.debtTarget(cell); tags.push({ k: `${si}:${r}:${c}`, si, r, c, text: next ? `${debt} of ${next.value}¢` : `owes ${debt}` }); } } });
    syncTags(tags);
    // creatures fly over the stacks, bees with them; orbital chips (weather, vehicles) ride above them
    const flyers = [...bout.creatures.map((cr) => ({ key: 'c' + cr.id, side: cr.side, r: cr.r, c: cr.c, gone: cr.gone, late: cr.arrive > bout.turn, glyph: D.CREATURES[cr.kind].glyph, cls: `creature cr-${cr.kind}`,
      tip: () => `<b>${D.CREATURES[cr.kind].name}</b>${D.CREATURES[cr.kind].hits ? ` <span class="dim">${D.CREATURES[cr.kind].hits - (cr.dmg || 0)} of ${D.CREATURES[cr.kind].hits} hits left</span>` : ''}<p>${D.CREATURES[cr.kind].text}</p>${cr.hold?.length ? `<p class="bad">Holds ${sum(cr.hold, (x) => x.value)}¢ of stolen Gold.</p>` : ''}${traitsHtml(flyerTraits(cr.kind))}` })),
      ...bout.sides.flatMap((s) => s.bees.map((bee) => ({ key: 'b' + bee.id, side: s.idx, r: bee.r, c: bee.c, glyph: '🐝', cls: 'creature bee', tip: `<b>Bumble Bee</b> <span class="dim">${bee.life} turn${bee.life === 1 ? '' : 's'} left</span><p>A familiar from a Hive. It stings creatures over its table and pollinates Flowers into Honey.</p>` }))),
      ...bout.sides.flatMap((s) => s.sky.filter((o) => D.ORBITALS[o.kind].size !== 'table').map((o) => ({ key: 's' + o.id, side: s.idx, r: o.r, c: o.c, glyph: D.ORBITALS[o.kind].glyph, cls: `creature orbital or-${o.kind}`, out: o.c < 0,
        tip: () => `<b>${D.ORBITALS[o.kind].name}</b>${o.str ? ` <span class="dim">strength ${o.str}</span>` : ''}<p>${D.ORBITALS[o.kind].text}</p>${traitsHtml(flyerTraits(o.kind, true))}` })))];
    const live = new Set();
    for (const f of flyers) {
      let el = els.creatures.get(f.key); const on = f.r >= 0 && !f.out, p = on ? cellPos(f.side, f.r, Math.max(0, f.c)) : { x: f.side === 0 ? 300 : 960, y: 44, w: 40 };
      if (!el) { if (f.gone || f.late) continue; el = h('div', { class: f.cls, text: f.glyph, tip: f.tip }); layer.append(el); els.creatures.set(f.key, el); spawn(el, p.x, -40, ''); }
      live.add(f.key);
      if (f.gone) { el.style.opacity = '0'; place(el, p.x + (f.side === 0 ? -200 : 200), -60); els.creatures.delete(f.key); setTimeout(() => el.remove(), 800); continue; }
      el.style.opacity = '1'; place(el, p.x + p.w / 2 - 16, p.y - (f.cls.includes('orbital') ? 26 : f.cls.includes('bee') ? 2 : 14));
    }
    for (const [key, el] of els.creatures) if (!live.has(key)) { el.style.opacity = '0'; els.creatures.delete(key); setTimeout(() => el.remove(), 800); }
    bout.sides.forEach((s, si) => { const big = s.sky.filter((o) => D.ORBITALS[o.kind].size === 'table'), w = weatherEls[si];
      for (const k of ['blizzard', 'sun', 'moon']) w.classList.toggle(k, big.some((o) => o.kind === k));
      w._tip = big.length ? () => big.map((o) => `<b>${D.ORBITALS[o.kind].name}</b>${o.str ? ` <span class="dim">strength ${o.str}</span>` : ''}<p>${D.ORBITALS[o.kind].text}</p>`).join('') : null; });
    bout.sides.forEach((s, si) => { const owed = owedBy(s); swapText(owesEl[si], owed ? ` · owes ${owed}¢` : ''); tween(worthEl[si], B.worth(s)); tween(stageEl[si], bout.stage.paid[si]); syncList(badgeBox[si], badges(s), (x) => x.k, (x) => h('span', { class: `badge ${x.cls || ''}`, tip: x.tip }), (el, x) => swapText(el, x.text)); });
    swapText(root.querySelector('.turn-n'), String(bout.turn));
    const at = B.PHASES.indexOf(bout.phase);
    STEPS.forEach(([k, , stat], i) => { swapText(pill[k], stat ? `${Math.max(0, B.tipOf(me, stat) - me.used[k])}/${B.tipOf(me, stat)}` : `${me.run.filter((x) => x.state === 'bid' && B.needsTarget(x)).length} to aim`); pillEl[k].classList.toggle('now', i === at && !ui.locked); pillEl[k].classList.toggle('done', at < 0 || i < at); });
    syncList(oppRun, opp.run, (e) => e.uid, (e) => { const def = D.TRICKS[e.trick.id]; return h('div', { class: 'orow', style: { '--tc': D.TYPES[def.type].color }, tip: () => trickTip(e.trick, opp.cls, `<p class="live">${e.dice.length ? `Dice ${e.dice.map((d) => d.value).join(' + ')} → roll total <b>${B.previewTotal(opp, e)}</b>` : 'No dice on it.'}${e.state === 'bid' ? '<br>Bid on: it plays this turn.' : e.state === 'play' ? '<br>In play.' : '<br>Shown, not bid.'}</p>`) }, h('b', { text: def.name }), h('span', { class: 'odice' }), h('span', { class: 'ostate' })); },
      (el, e) => { swapText(el.querySelector('.odice'), e.dice.map((d) => d.value).join(' ')); swapText(el.querySelector('.ostate'), e.state === 'bid' ? 'bid' : e.state === 'play' ? (e.lingerLeft ? `lingers ${e.lingerLeft}` : 'in play') : 'shown'); el.classList.toggle('bid', e.state !== 'shown'); });
    setOn(sipBtn, !ui.locked && !B.canSip(bout, me)); sipBtn.classList.toggle('gone', !me.drink);
    runEmpty.style.opacity = me.run.length ? 0 : 1;
    setOn(undoBtn, !ui.locked && (bout.phase === 'draw' ? me.used.draw > 0 : bout.phase === 'roll' ? selCount() > 0 || B.placedThisTurn(bout, me) : me.used.bid > 0));
    setOn(commitBtn, !ui.locked); swapText(commitBtn, commitLabel()); commitBtn.classList.toggle('go', commitReady()); commitBtn.classList.toggle('wait', !commitReady());
    for (const ph of ['draw', 'roll', 'bid', 'aim', 'drink', 'resolve']) root.classList.toggle('ph-' + ph, bout.phase === ph); root.classList.toggle('locked', ui.locked); root.classList.toggle('thrown', !!me.thrown);
    marks(); refreshTip();
  }
  const selCount = () => ui.sel.size + ui.flips.length;
  const throwing = () => bout.phase === 'roll' && !me.thrown && B.canAct(bout, me);
  // the button names the next action: Roll (end drawing), Roll n (throw), Bid (end rolling), Play (end the turn)
  const commitLabel = () => (bout.phase === 'drink' ? 'Next turn' : bout.phase === 'draw' ? 'Roll' : bout.phase === 'roll' ? (throwing() ? `Roll${selCount() ? ' ' + selCount() : ''}` : 'Bid') : bout.phase === 'bid' ? 'Bluff' : 'Play');
  const commitReady = () => (throwing() ? selCount() > 0 : !B.needOf(bout, me));
  function commitTip() {
    const need = throwing() ? (selCount() ? null : 'Pick at least one die (or a top chip to flip) first.') : B.needOf(bout, me);
    if (bout.phase === 'drink') return `<b>Next turn</b><p>${vc('Close the Drink phase. What you sipped or ate works from the next turn. Your opponent drinks now too.', 'End the round')}</p>`;
    const what = bout.phase === 'draw' ? ['Done drawing: move on to rolling.', 'Done drawing'] : throwing() ? ['Roll every picked die (and flip every picked chip) at once. You roll once a turn.', 'Throw the picked dice'] 
      : bout.phase === 'roll' ? ['Done rolling: move on to bidding. Dice left in the roll go back to your Pouch. Dice on tricks can still be moved until you press Play.', 'Done rolling'] : bout.phase === 'bid' ? ['Done bidding: the bids are shown to both sides, then you aim (the Bluff).', 'Show the bids'] : ['Commit the turn. The House collects every bid and plays it, aimed where you set.', 'Commit the turn'];
    return `<b>${commitLabel()}</b><p>${vc(...what)}</p>${need ? `<p class="bad keep">${need}</p>` : `<p class="dim">Then you see what ${opp.name} did in this phase.</p>`}`;
  }
  // Debt tags: what each stack owes against the chip it is working towards
  const tagEls = new Map();
  function syncTags(tags) {
    const keep = new Set(tags.map((t) => t.k));
    for (const [k, el] of tagEls) if (!keep.has(k)) { el.remove(); tagEls.delete(k); }
    for (const t of tags) { let el = tagEls.get(t.k); if (!el) { el = h('div', { class: 'debt-tag' }); fcLayer.append(el); tagEls.set(t.k, el); }
      const p = cellPos(t.si, t.r, t.c); el.style.left = p.x + 'px'; el.style.top = p.y + CH - 12 + 'px'; el.style.width = p.w + 'px'; el.textContent = t.text; }
  }
  function badges(s) {
    const out = [], st = s.status, add = (k, text, t, cls) => out.push({ k, text, tip: t, cls });
    if (s.heat > 1 && s.idx === 0) add('heat', `Last call ×${s.heat.toFixed(2)}`, `<b>Last call</b><p>From turn ${B.LAST_CALL + 1} the House raises the stakes: every Expense is multiplied, and the multiplier grows each turn.</p>`, 'bad');
    if (s.power) add('pow', `Power ${s.power}`, '<b>Power</b><p>Added to the next roll effect, then spent.</p>', 'good');
    if (st.resist) add('res', `Resist ${st.resist}`, '<b>Resist</b><p>Every fee charged is reduced by this much.</p>', 'good');
    if (st.evade != null) add('eva', `Evade >${st.evade}`, '<b>Evade</b><p>Fees larger than this miss entirely.</p>', 'good');
    if (st.reflect) add('ref', `Reflect ${st.reflect}`, '<b>Reflect</b><p>This much of the next fee is sent back.</p>', 'good');
    if (s.mods.enfeeble) add('enf', `Enfeebled ${s.mods.enfeeble}`, '<b>Enfeebled</b><p>Roll effects lose this much this turn.</p>', 'bad');
    if (s.drink) add('drk', `${s.drink.name} ×${s.drink.sips}`, () => drinkTip(s.drink));
    for (const k of Object.keys(s.turnBonus)) add('tb' + k, `+${s.turnBonus[k]} ${D.STATS[k].name}`, 'From your drink, this turn only.', 'good');
    if (s.familiars) add('fam', `Familiar ×${s.familiars}`, `<b>Familiar</b><p>${D.TILTS.familiar.text}</p>`, 'good');
    if (s.interventions) add('int', 'Intervention', `<b>Intervention</b><p>${D.TILTS.intervention.text}</p>`, 'good');
    if (s.spawners) add('spn', `Spawner ×${s.spawners}`, `<b>Spawner</b><p>${D.TILTS.spawner.text}</p>`, 'bad');
    s.calamities.forEach((cid, i) => add('cal' + i, D.CALAMITIES[cid].name, `<b>${D.CALAMITIES[cid].name}</b><p>${D.CALAMITIES[cid].text}</p>`, 'bad'));
    return out;
  }
  root.querySelector('.who.me').append(badgeBox[0]); root.querySelector('.who.them').append(badgeBox[1]);

  // board highlights for the current mode
  let hover = null;
  function marks() {
    const cls = ['ok', 'aff', 'tgt', 'origin', 'sel', 'soft', 'pend-me', 'pend-opp']; for (const side of els.cells) for (const rowEls of side) for (const el of rowEls) el.classList.remove(...cls);
    const mark = (si, r, c, k) => els.cells[si][r]?.[c]?.classList.add(k);
    for (const e of me.run) if (e.state === 'bid' && B.needsTarget(e) && e.target) {
      const def = D.TRICKS[e.trick.id], t = bout.sides[e.target.side];
      for (const x of B.affected(bout, t, def, e.target, e.dice.length)) mark(t.idx, x.r, x.c, 'tgt'); mark(t.idx, e.target.r, e.target.c, 'origin');
    }
    for (const el of fcLayer.querySelectorAll('.pend')) el.remove();
    bout.sides.forEach((s, si) => { for (const e of s.run) if (e.state === 'play' && e.lingerLeft > 0 && e.target && B.needsTarget(e)) { // known to both sides once played
      const def = D.TRICKS[e.trick.id], t = bout.sides[e.target.side];
      for (const x of B.affected(bout, t, def, e.target, e.dice.length)) mark(t.idx, x.r, x.c, si ? 'pend-opp' : 'pend-me');
      const p = cellPos(t.idx, e.target.r, e.target.c); fcLayer.append(h('div', { class: `pend ${si ? 'opp' : 'me'}`, style: { left: p.x + 'px', top: p.y + 2 + 'px', width: p.w + 'px' }, text: `${def.name} ${e.lingerLeft}↻` })); } });
    const e = me.run.find((x) => x.uid === ui.entry);
    if (!ui.locked && bout.phase === 'roll' && !me.thrown) { for (const f of B.flippable(me)) mark(0, f.r, f.c, 'soft'); for (const f of ui.flips) mark(0, f.r, f.c, 'sel'); }
    if (!ui.locked && bout.phase === 'bid' && ui.mode !== 'target') { for (const f of B.biddable(me)) mark(0, f.r, f.c, ui.chip ? 'soft' : 'ok'); if (ui.chip) mark(0, ui.chip.r, ui.chip.c, 'sel'); }
    let fc = null;
    if (ui.mode === 'target' && e) {
      const valid = B.validTargets(bout, me, e); for (const v of valid) mark(v.side, v.r, v.c, 'ok');
      const at = hover && valid.some((v) => v.side === hover.side && v.r === hover.r && v.c === hover.c) ? hover : e.target;
      if (at) { for (const x of B.affected(bout, bout.sides[at.side], D.TRICKS[e.trick.id], at, e.dice.length)) mark(at.side, x.r, x.c, 'aff'); fc = B.forecastFee(bout, me, e, at); }
    } else if (!ui.locked) { // hovering a trick that is bid and aimed: show what its fee would do
      const he = me.run.find((x) => x.uid === ui.card);
      if (he && he.state === 'bid' && he.target) fc = B.forecastFee(bout, me, he, he.target);
    }
    showForecast(fc);
    root.classList.toggle('m-bid', bout.phase === 'bid' && !ui.locked && ui.mode !== 'target'); root.classList.toggle('m-target', ui.mode === 'target'); root.classList.toggle('m-die', ui.mode === 'die');
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
      if (x.owed) bits.push(`<b class="owed">${x.owed} owed</b>`);
      if (x.carryOut) bits.push(`<b class="carry">${x.carryOut}→</b>`);
      if (x.lost) bits.push(`<b class="miss">${x.lost} wasted</b>`);
      if (!bits.length) bits.push(`<b class="miss">${x.fee ? '0' : '—'}</b>`);
      el.classList.toggle('in', !!x.carryIn && !x.fee);
      el.style.left = p.x + 'px'; el.style.top = p.y + 'px'; el.style.width = p.w + 'px'; el.innerHTML = bits.join('');
    }
  }
  function fcSummary(list) {
    const fee = sum(list, (x) => x.fee), paid = sum(list, (x) => x.paid), chips = list.flatMap((x) => x.paidChips), owed = sum(list, (x) => x.owed), carried = sum(list, (x) => x.carryOut), blocked = sum(list, (x) => x.blocked), lost = sum(list, (x) => x.lost);
    const bits = [`${paid}¢ paid${chips.length ? ` (${chips.join(' + ')})` : ''}`];
    if (blocked) bits.push(`${blocked} blocked`);
    if (carried) bits.push(`${carried}¢ overkill carried down the lane`);
    if (owed) bits.push(`${owed}¢ left as Debt`);
    if (lost) bits.push(`${lost}¢ overkill wasted (no stack behind)`);
    return `a ${fee}¢ fee: ${bits.join(', ')}.`;
  }
  function hint() {
    if (ui.locked) return;
    const e = me.run.find((x) => x.uid === ui.entry), name = e ? D.TRICKS[e.trick.id].name : '';
    const sel = ui.mode === 'die' ? me.tray.find((d) => d.id === ui.die) : null, left = B.tipOf(me, 'ingenuity') - me.used.bid;
    const chip = ui.chip && B.bidChip(me, ui.chip.r, ui.chip.c);
    let text;
    const say = (v, c) => vc(v, c);
    if (bout.phase === 'drink') { setPrompt(say(`Drink phase: sip your drink${me.drink ? '' : ' (none)'} and double-click one food chip on top of a stack, once each. They work next turn. Then press Next turn.`, 'Sip / eat, then Next turn.')); return; }
    if (bout.phase === 'draw') text = !B.canAct(bout, me) ? say('Nothing to draw. Press Roll to move on.', 'Nothing to draw: Roll.') : me.used.draw ? say('Draw more, or press Roll. Rolling ends drawing.', 'Draw more, or Roll.') : say('Step 1 · Draw: click a trick in your Book to show it on your Run.', 'Draw a trick.');
    else if (bout.phase === 'roll' && !me.thrown) text = !B.canAct(bout, me) ? say('Nothing you can roll onto. Press Bid to move on.', 'Nothing to roll onto: Bid.') : selCount() ? say(`${selCount()} picked. Pick more (up to ${B.tipOf(me, 'proficiency')}) or press Roll: they all land in the roll together.`, `${selCount()}/${B.tipOf(me, 'proficiency')} picked: Roll.`) : say('Step 2 · Roll: pick dice from your Pouch (or a glowing top chip to flip), then press Roll. You roll once a turn.', `Pick up to ${B.tipOf(me, 'proficiency')} dice.`);
    else if (ui.mode === 'die') text = say(`${sel ? `You rolled ${sel.value}. ` : ''}Click a shown trick to put it on, or click another die.${bout.phase === 'bid' ? ' Dice left in the roll go back to your Pouch when you press Play.' : ''}`, `${sel ? sel.value + ': ' : ''}pick a trick.`);
    else if (bout.phase === 'roll') text = !B.placedThisTurn(bout, me) && B.canAct(bout, me) ? say('Put at least one die from the roll on a trick. Click a die, then the trick.', 'Put a die on a trick.') : say('Move dice between tricks, or press Bid. Dice left in the roll go back to your Pouch.', 'Move dice, or Bid.');
    else if (bout.phase === 'aim' && ui.mode !== 'target') { const left = me.run.filter((x) => x.state === 'bid' && B.needsTarget(x)); text = left.length ? say(`The Bluff: the bids are out. Click a bid trick to aim it (${left.map((x) => D.TRICKS[x.trick.id].name).join(', ')}), or keep the marked spaces, then press Play.`, 'Aim, then Play.') : say('Nothing to aim. Press Play.', 'Play.'); }
    else if (ui.mode === 'target') text = say(`Pick where ${name} lands, or keep the marked space.${fcNow ? ' Forecast: ' + fcSummary(fcNow) : ''}`, `Aim ${name}.`);
    else if (chip) text = say(`Picked up a ${chip.value}¢ chip. Click a trick to bid it — one that already has a bid can take another.`, `${chip.value}¢ chip: pick a trick.`);
    else text = left <= 0 ? say('Out of bids. Move dice if you like, then press Bluff.', 'Out of bids: Bluff.') : me.used.bid ? say(`Bid again (${left} left): click a stack, then a trick. You can still move this turn's dice. Or press Bluff.`, `${left} bid${left > 1 ? 's' : ''} left, or Bluff.`) : say('Step 3 · Bid: click one of your stacks to pick up its top chip, then click a trick. Until you press Play you can still move this turn\'s dice between tricks.', 'Bid a chip on a trick.');
    setPrompt(text);
  }
  function setMode(mode, v) { ui.mode = mode; ui.die = mode === 'die' ? v : null; ui.entry = mode === 'target' ? v : null; }
  function act(fn) { if (ui.locked) return; fn(); sync(); hint(); }
  const nope = (msg, el) => { toast(msg, 'warn'); if (el) pulse(el, 'shake'); };

  // ---------- input ----------
  function clickCard(uid, ev) {
    if (ui.locked) return;
    const e = me.run.find((x) => x.uid === uid), el = els.cards.get(uid);
    if (!e) { const why = B.canDraw(bout, me, uid); if (why) return nope(why, el); return act(() => B.draw(bout, me, uid)); }
    if (bout.phase === 'draw') return nope('That trick is already on your Run. Press Roll to start rolling.', el);
    if (bout.phase === 'roll') {
      if (ui.mode === 'die') { const why = B.canPlace(bout, me, ui.die, e); if (why) return nope(why, el); return act(() => { B.place(bout, me, ui.die, e); const next = me.tray[0]; setMode(next ? 'die' : null, next?.id); }); }
      return nope(me.thrown ? 'Click a die in the roll first, then the trick.' : 'Pick dice from your Pouch and roll them first.', el);
    }
    if (ui.mode === 'die') { const why = B.canPlace(bout, me, ui.die, e); if (why) return nope(why, el); return act(() => { B.place(bout, me, ui.die, e); setMode(null); }); }
    if (bout.phase === 'aim') { if (e.state === 'bid' && B.needsTarget(e)) return act(() => { ui.chip = null; setMode('target', uid); }); return nope(e.state === 'bid' ? 'That trick needs no aim.' : 'Only tricks you bid on are aimed.', el); }
    if (ev.target.dataset.act === 'target' && e.state === 'bid') return nope('Aim in the Bluff, once the bids are out.', el);
    if (e.state === 'play') return nope('That trick is already in play.', el);
    if (!ui.chip) return nope(me.used.bid >= B.tipOf(me, 'ingenuity') ? 'No bids left this turn (Ingenuity). Press Bluff.' : 'Pick up a chip first: click one of your stacks, then this trick.', el);
    const { r, c } = ui.chip, why = B.canBid(bout, me, e, r, c); if (why) return nope(why, el);
    act(() => { B.bid(bout, me, e, r, c); ui.chip = null; setMode(null); });
  }
  function clickDie(id) {
    if (ui.locked) return;
    const el = els.dice.get(id);
    if (me.pouch.some((d) => d.id === id)) { // pick it for the throw
      if (bout.phase !== 'roll' || me.thrown) return nope(bout.phase === 'draw' ? 'Press Roll first, then pick the dice to roll.' : me.thrown ? 'You have rolled this turn. Rolling is one throw.' : 'Rolling is over for this turn.', el);
      if (ui.sel.has(id)) return act(() => ui.sel.delete(id));
      if (selCount() >= B.tipOf(me, 'proficiency')) return nope(`You can roll ${B.tipOf(me, 'proficiency')} this turn (Proficiency).`, el);
      return act(() => ui.sel.add(id));
    }
    if (me.tray.some((d) => d.id === id)) return act(() => setMode(ui.mode === 'die' && ui.die === id ? null : 'die', id));
    if (!B.canMove(bout, me, id)) return nope(B.holderOf(me, id)?.state === 'play' ? 'That trick is in play: its dice stay until it has played.' : 'That die was placed on an earlier turn and stays on its trick.', el);
    act(() => { ui.chip = null; B.unplace(bout, me, id); setMode('die', id); });
  }
  function clickCell(si, r, c) {
    if (ui.locked) return;
    const cellEl = els.cells[si][r][c], e = me.run.find((x) => x.uid === ui.entry);
    if (ui.mode === 'target' && e) {
      if (B.setTarget(bout, me, e, { side: si, r, c })) return act(() => setMode(null));
      if (si !== 0 || !B.bidChip(me, r, c)) return nope('Not a valid target for that trick.', cellEl);
      setMode(null); // a click on your own stack picks up a chip instead
    }
    if (bout.phase === 'roll' && !me.thrown) {
      if (si !== 0) return;
      const k = ui.flips.findIndex((f) => f.r === r && f.c === c);
      if (k >= 0) return act(() => ui.flips.splice(k, 1));
      const ch = B.bidChip(me, r, c);
      if (ch?.kind !== 'std') return nope('Only an uncovered standard chip on top of a stack can be flipped.', cellEl);
      if (B.worth(me) - ch.value - sum(ui.flips, (f) => B.bidChip(me, f.r, f.c).value) <= 0) return nope('That is your last chip.', cellEl);
      if (selCount() >= B.tipOf(me, 'proficiency')) return nope(`You can roll ${B.tipOf(me, 'proficiency')} this turn (Proficiency). A flip uses a roll.`, cellEl);
      return act(() => ui.flips.push({ r, c }));
    }
    if (bout.phase === 'bid') {
      if (si !== 0) return nope('Bid a chip from your own position.', cellEl);
      if (ui.chip && ui.chip.r === r && ui.chip.c === c) return act(() => { ui.chip = null; });
      const ch = B.bidChip(me, r, c);
      if (!ch) return nope('Only an uncovered standard or Opportunity chip on top of a stack can be bid.', cellEl);
      if (me.used.bid >= B.tipOf(me, 'ingenuity')) return nope('No bids left this turn (Ingenuity).', cellEl);
      if (B.worth(me) - ch.value <= 0) return nope('That is your last chip. Bid it and you are broke.', cellEl);
      return act(() => { ui.chip = { r, c }; });
    }
  }
  // food on top of one of your stacks: double-click to eat it
  function eatCell(si, r, c) {
    if (ui.locked || si !== 0) return;
    const why = B.canEat(bout, me, r, c); if (why) return;
    act(() => { const f = B.eat(bout, me, r, c); toast(`You eat ${f.label}: ${Object.entries(f.mods).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${D.STATS[k].short}`).join(', ')}${f.turns > 1 ? ` for ${f.turns} turns` : ' this turn'}.`); });
  }
  function hoverCell(si, r, c) { hover = r < 0 ? null : { side: si, r, c }; if (ui.mode === 'target') { marks(); hint(); } }
  const onKey = (ev) => { if (ev.key === 'Escape' && (ui.mode || ui.chip)) act(() => { setMode(null); ui.chip = null; }); };
  document.addEventListener('keydown', onKey);
  const onDetail = () => { if (root.isConnected) hint(); else detail.listeners.delete(onDetail); }; detail.listeners.add(onDetail);

  // ---------- committing a phase ----------
  // Rolling is one throw: the commit button throws first, then locks the rolls in.
  function doThrow() {
    const ids = [...ui.sel], flips = ui.flips.slice(), why = B.canThrow(bout, me, ids, flips);
    if (why) return nope(why, commitBtn);
    els.flipFrom = new Map(flips.map(({ r, c }) => { const ch = B.bidChip(me, r, c); return ['c' + ch.id, chipPos(0, r, c, me.grid[r][c].chips.indexOf(ch))]; }));
    act(() => { B.throwDice(bout, me, ids, flips); ui.sel.clear(); ui.flips = []; const first = me.tray.find((d) => me.run.some((x) => !B.canPlace(bout, me, d.id, x))); setMode(first ? 'die' : null, first?.id); });
  }
  // Lock in this phase. Only now does the opponent make the same move, blind to yours (it sees your table as
  // it was when the phase opened), and only then are both shown.
  async function commit() {
    if (ui.locked || bout.over) return;
    if (bout.phase === 'drink') return closeDrink();
    if (throwing()) return doThrow();
    const why = B.needOf(bout, me); if (why) return nope(why, commitBtn);
    ui.locked = true; setMode(null); ui.chip = null; ui.sel.clear(); ui.flips = []; prompt = ''; renderFeed();
    const phase = bout.phase, before = ui.spyBefore || new Set(opp.run.map((e) => e.uid));
    if (ui.spied !== spyKey()) planPhase(bout, opp); ui.spied = null; ui.spyBefore = null;
    if (!B.advance(bout)) B.advance(bout, true);
    sync(); reveal(phase, before);
    await wait(420 / ui.speed);
    ui.locked = false;
    if (bout.phase === 'resolve') return playTurn();
    spyPhase();
    if (bout.phase === 'aim') { const first = me.run.find((x) => x.state === 'bid' && B.needsTarget(x) && B.validTargets(bout, me, x).length > 1); if (first) setMode('target', first.uid); }
    sync(); hint();
  }
  const names = (list) => (list.length < 2 ? list.join('') : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`);
  function reveal(phase, before) {
    const tn = (e) => D.TRICKS[e.trick.id].name; let text;
    if (phase === 'draw') { const fresh = opp.run.filter((e) => !before.has(e.uid)).map(tn); text = fresh.length ? `${opp.name} draws ${names(fresh)}.` : `${opp.name} draws nothing.`; }
    else if (phase === 'roll') { const on = opp.run.map((e) => ({ e, ds: e.dice.filter((d) => d.t === bout.turn) })).filter((x) => x.ds.length); text = on.length ? `${opp.name} rolls ${names(on.map((x) => `${x.ds.map((d) => d.value).join(' + ')} onto ${tn(x.e)}`))}.` : `${opp.name} rolls nothing onto a trick.`; }
    else if (phase === 'aim') text = `${opp.name} has aimed. Where, you see when the House plays it.`;
    else { const bids = opp.run.filter((e) => e.state === 'bid'); text = bids.length ? `${opp.name} bids ${names(bids.map((e) => `${e.bidValue}¢ on ${tn(e)}`))}.` : `${opp.name} bids nothing.`; }
    feedPush(text, 1);
    for (const el of oppRun.children) if (!el._leaving) pulse(el, 'reveal');
  }

  // ---------- resolution ----------
  // The House works through the turn one call at a time: it names the phase, points the stick
  // at the trick being played, then at where it lands, and only then does the table change.
  async function playTurn() {
    if (ui.locked || bout.over) return;
    ui.locked = true; setMode(null); prompt = ''; renderFeed(); sync();
    let n = 0; const pace = (ms) => wait(ms / ui.speed / (n > 40 ? 1.6 : 1));
    const flash = (st) => { for (const x of st.cells) { const el = els.cells[x.side][x.r]?.[x.c]; if (el) pulse(el, st.kind === 'miss' ? 'flash-miss' : st.kind === 'play' ? 'flash-aim' : st.kind === 'debt' ? 'flash-miss' : 'flash-hit'); } };
    const cellPoint = (x) => { const p = cellPos(x.side, x.r, x.c); return { x: p.x + p.w / 2, y: p.y + CH / 2 }; };
    const both = (fn) => arms.forEach(fn);
    const call = async (text, color) => { phaseCall.textContent = text; phaseCall.style.setProperty('--pc', color); phaseCall.classList.add('in'); await pace(620); both((a) => a.tap()); await pace(620); phaseCall.classList.remove('in'); await pace(260); };
    for (const st of B.resolve(bout)) { n++;
      if (st.kind === 'turn' || st.kind === 'drink') { sync(st.fx); break; }
      setPhase(st.phase);
      if (st.kind === 'return') { setCalling([]); sync(st.fx); await pace(520); continue; }
      // a paired step carries one action from each Roller: both arms move and both lines are posted together
      const parts = st.kind === 'pair' ? st.parts : [st];
      setCalling(parts);
      for (const p of parts) if (p.text) feedPush(p.text, p.who);
      if (st.kind === 'phase') { const bx = box(phaseEls[st.phase]); arms[0].to(bx.x + bx.w / 2 - 14, bx.y + bx.h + 4); arms[1].to(bx.x + bx.w / 2 + 14, bx.y + bx.h + 4); await call(D.TYPES[st.phase].name + 's', D.TYPES[st.phase].color); continue; }
      if (st.kind === 'settle') { arms[0].to(STAGE[0].x + 16, STAGE[0].y + 16); arms[1].to(STAGE[1].x + 16, STAGE[1].y + 16); await call('Settle', '#ffd76a'); continue; }
      if (st.kind === 'bid') { arms[0].to(560, 476); arms[1].to(1090, 470); await pace(560); sync(st.fx); arms[0].to(HOUSE.x - 30, 70); arms[1].to(HOUSE.x + 60, 70); await pace(820); continue; }
      const armOf = (p) => arms[p.who ?? p.cells[0]?.side ?? 0];
      const tps = parts.map((p) => (p.kind === 'play' ? trickPoint(p) : null));
      if (tps.some(Boolean)) { parts.forEach((p, i) => tps[i] && armOf(p).to(tps[i].x, tps[i].y)); await pace(600); parts.forEach((p, i) => tps[i] && armOf(p).tap()); await pace(320); }
      let moved = false;
      parts.forEach((p, i) => { const c0 = p.cells[0];
        if (c0) { const pt = cellPoint(c0); armOf(p).to(pt.x, pt.y); moved = true; }
        else if (!tps[i] && p.who != null) { armOf(p).to(p.who === 0 ? 190 : 1090, 78); moved = true; } });
      if (moved) await pace(560);
      sync(st.fx); parts.forEach(flash);
      const fees = parts.filter((p) => p.kind === 'fee' && p.cells[0]);
      if (fees.length) { await pace(240); for (const p of fees) armOf(p).to(STAGE[p.cells[0].side].x + 16, STAGE[p.cells[0].side].y + 14); } // rake what was paid to the Stage
      await pace(st.kind === 'over' ? 1000 : parts.some((p) => p.text) ? (parts.length > 1 ? 980 : 780) : 340);
    }
    setCalling([]); setPhase(null); both((a) => a.rest());
    if (bout.over) return finish();
    ui.locked = false;
    if (bout.phase === 'drink' && !B.drinkUseful(bout, me)) return closeDrink(); // nothing to sip or eat: straight on
    sync(); hint();
  }
  // The Drink phase: sip once, eat once, then the next turn. Your opponent drinks when you move on.
  function closeDrink() { drinkPhase(bout, opp); B.nextTurn(bout); setMode(null); spyPhase(); sync(); hint(); }
  // a Spy on top of one of your stacks: your opponent makes this phase's plays now, and you see them
  const spyKey = () => `${bout.turn}:${bout.phase}`;
  function spyPhase() {
    if (!B.spying(me) || !B.PHASES.includes(bout.phase) || ui.spied === spyKey()) return;
    ui.spyBefore = new Set(opp.run.map((e) => e.uid)); planPhase(bout, opp); ui.spied = spyKey();
    const tn = (e) => D.TRICKS[e.trick.id].name, at = (t) => (t ? `${t.side === 0 ? 'your' : 'their'} ${t.r < bout.sides[t.side].dims.meterRows ? 'Meter' : 'Bar'} lane ${t.c + 1}` : 'nothing');
    const seen = bout.phase === 'draw' ? opp.run.filter((e) => !ui.spyBefore.has(e.uid)).map(tn) : bout.phase === 'roll' ? opp.run.filter((e) => e.dice.some((d) => d.t === bout.turn)).map((e) => `${e.dice.map((d) => d.value).join('+')} on ${tn(e)}`)
      : bout.phase === 'bid' ? opp.run.filter((e) => e.state === 'bid').map((e) => `${e.bidValue}¢ on ${tn(e)}`) : opp.run.filter((e) => e.state === 'bid' && e.target).map((e) => `${tn(e)} at ${at(e.target)}`);
    feedPush(`Your Spy: ${opp.name} ${bout.phase === 'aim' ? 'aims' : bout.phase + 's'} ${seen.length ? names(seen) : 'nothing'}.`, 1);
  }
  async function finish() {
    document.removeEventListener('keydown', onKey);
    const win = bout.winner === 0; await wait(500);
    banner.append(h('div', { class: `banner-card ${win ? 'win' : 'lose'}` }, h('h1', { text: win ? 'The table is yours' : 'Broke' }),
      h('p', { text: win ? `${opp.name} is out of Worth after ${bout.turn} turn${bout.turn > 1 ? 's' : ''}.` : `${opp.name} takes everything on the table.` }),
      btn('Continue', () => onDone(), null, 'big go')));
    requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add('in')));
  }

  requestAnimationFrame(() => { spyPhase(); sync(); hint(); });
  void ctx; void sum;
}
