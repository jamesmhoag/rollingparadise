// The table. Every chip, die, trick card and creature is one persistent element that is
// moved, faded or flipped to follow the bout state, so nothing ever pops between states.
import { h, tip, wait, tween, swapText, setOn, pulse, syncList, toast, btn, refreshTip, box } from './core.js';
import { chipSig, chipGlyph, chipName, chipText, dieTip, trickTip, pips, statTip, drinkTip } from './parts.js';
import * as D from '../data.js';
import * as B from '../bout.js';
import { planTurn } from '../ai.js';
import { sum } from '../util.js';

const TOP = 100, CH = 50, PX = 590, OX = 690, CHIP = 32;
const STAGE = [{ x: 624, y: 286 }, { x: 624, y: 150 }], HOUSE = { x: 624, y: 30 };

export function boutScene(root, bout, ctx, onDone) {
  const [me, opp] = bout.sides;
  const cw = bout.sides.map((s) => Math.min(52, Math.floor(540 / s.rows)));
  const ui = { mode: null, die: null, entry: null, flipAt: null, locked: false, speed: globalThis.RP_FAST || 1, first: true }; // RP_FAST: set by automated playthroughs
  const els = { chips: new Map(), dice: new Map(), cards: new Map(), cells: [[], []], creatures: new Map() };
  const layer = h('div', { class: 'bout-layer' });
  root.classList.add('bout');

  // ---------- geometry ----------
  const cellPos = (side, r, c) => ({ x: side === 0 ? PX - (r + 1) * cw[0] : OX + r * cw[1], y: TOP + c * CH, w: cw[side] });
  const chipPos = (side, r, c, lvl) => { const p = cellPos(side, r, c); return { x: p.x + p.w / 2 - CHIP / 2, y: p.y + CH - CHIP - 5 - lvl * 4, z: 20 + c * 40 + lvl }; };
  function cardLayout() {
    const out = new Map(), n = me.run.length, w = Math.min(122, Math.floor(626 / Math.max(1, n)) - 6);
    me.run.forEach((e, i) => out.set(e.uid, { x: 248 + i * (w + 6), y: 466, w, h: 242, open: true, e }));
    const step = Math.min(34, Math.floor(262 / Math.max(1, me.book.length)));
    me.book.forEach((t, i) => out.set(t.uid, { x: 16, y: 444 + i * step, w: 220, h: Math.min(30, step - 3), open: false, t }));
    return out;
  }
  const dieSlot = (cl, i) => ({ x: cl.x + 8 + (i % 3) * 36, y: cl.y + 46 });
  const pouchSlot = (i, n) => { const per = n > 20 ? 6 : 5, st = n > 20 ? 30 : 36; return { x: 888 + (i % per) * st, y: 446 + Math.floor(i / per) * st }; };

  // ---------- static frame ----------
  const worthEl = [h('b', { class: 'num' }), h('b', { class: 'num' })], stageEl = [h('b', { class: 'num' }), h('b', { class: 'num' })];
  const badgeBox = [h('div', { class: 'badges' }), h('div', { class: 'badges right' })];
  const pill = { draw: h('span'), roll: h('span'), bid: h('span') };
  const pillTip = (k, c, what) => () => `${statTip(k, B.tipOf(me, k))}<p class="dim">Left unused: ${statTip(c, B.cOf(me, c)).replace(/<b>.*?<\/b>/, '')}</p><p>${what}</p>`;
  const header = h('div', { class: 'bout-head' },
    h('div', { class: 'who me' }, h('div', { class: 'name' }, h('b', { text: 'You' }), h('span', { class: 'dim', text: ` ${D.CLASSES[me.cls].name}` })),
      h('div', { class: 'worth', tip: '<b>Worth</b><p>The value of the chips in your position, less any Debt. Reach zero and you are broke: the bout is lost.</p>' }, 'Worth ', worthEl[0], '¢'),
      h('div', { class: 'pills' },
        h('span', { class: 'pill', tip: pillTip('trickery', 'conviction', 'Click a trick in your Book to draw it onto your Run.') }, 'Draw ', pill.draw),
        h('span', { class: 'pill', tip: pillTip('proficiency', 'cunning', 'Click a die in your Pouch, then a shown trick.') }, 'Roll ', pill.roll),
        h('span', { class: 'pill', tip: pillTip('ingenuity', 'charisma', 'Click the Bid slot on a shown trick, then one of your stacks.') }, 'Bid ', pill.bid))),
    h('div', { class: 'mid' }, h('div', { class: 'turn', tip: () => `<b>Turn ${bout.turn}</b><p>Both Rollers plan, then every effect plays in order: Investments, Insurances, Expenses, Corrections.</p><p>Last call: from turn ${B.LAST_CALL + 1} every Expense is multiplied, more each turn. At turn ${bout.rules.maxTurns} the most Worth wins.</p>` }, 'Turn ', h('b', { class: 'num turn-n', text: '1' })),
      h('div', { class: 'house', tip: '<b>The House</b><p>Every chip you bid is paid to the House and is gone for good.</p>', text: 'THE HOUSE' })),
    h('div', { class: 'who them' }, h('div', { class: 'name' }, h('b', { text: opp.name }), h('span', { class: 'dim', text: ` ${opp.title || ''} · ${D.CLASSES[opp.cls].name}` })),
      h('div', { class: 'worth' }, 'Worth ', worthEl[1], '¢'),
      h('div', { class: 'pills' }, ['trickery', 'proficiency', 'ingenuity', 'charisma', 'cunning', 'conviction'].map((k) =>
        h('span', { class: 'pill small', tip: () => statTip(k, k in opp.tip ? B.tipOf(opp, k) : B.cOf(opp, k)) }, `${D.STATS[k].short} `, h('b', { text: k in opp.tip ? opp.tip[k] : opp.c[k] }))))));
  const stageBox = h('div', { class: 'stage-box' },
    h('div', { class: 'pot', style: { top: '128px' }, tip: `<b>${opp.name}'s fees on the Stage</b><p>Chips they have paid. Win the bout and they are yours. Charisma steals from here.</p>` }, h('em', { text: 'THEIRS' }), stageEl[1], '¢'),
    h('div', { class: 'stage-label', text: 'STAGE' }),
    h('div', { class: 'pot', style: { top: '264px' }, tip: '<b>Your fees on the Stage</b><p>Chips you have paid. Gather or steal them back during the bout. Win and they are all restored; lose and your opponent keeps them.</p>' }, h('em', { text: 'YOURS' }), stageEl[0], '¢'));
  // the action feed: always on screen, newest line at the bottom, with the House's phase tracker above it
  const PHASES = [['bids', 'Bids', '#ffd76a'], ...['investment', 'insurance', 'expense', 'correction'].map((k) => [k, D.TYPES[k].name + 's', D.TYPES[k].color]), ['house', 'House', '#ffd76a']];
  const phaseEls = {};
  const phasesEl = h('div', { class: 'phases' }, PHASES.map(([k, name, color]) => (phaseEls[k] = h('span', { style: { '--pc': color }, text: name,
    tip: k === 'bids' ? '<b>Bids</b><p>First the House collects every chip bid this turn.</p>' : k === 'house' ? '<b>House</b><p>Last: hazards, creatures and calamities act, then rewards for unused draws, rolls and bids are paid.</p>' : `<b>${name}</b><p>${D.TYPES[k].text}</p>` }))));
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
  // the House's stick: points at whatever is being resolved and rakes fees to the Stage
  const stick = h('div', { class: 'stick' }), phaseCall = h('div', { class: 'phase-call' }), PIV = { x: 640, y: 62 };
  let ang = 0, calling = null;
  function stickTo(x, y) { const dx = x - PIV.x, dy = y - PIV.y; let a = Math.atan2(dy, dx) * 180 / Math.PI; while (a - ang > 180) a -= 360; while (a - ang < -180) a += 360; ang = a;
    stick.style.width = `${Math.max(30, Math.hypot(dx, dy) - 8)}px`; stick.style.transform = `rotate(${a}deg)`; stick.classList.add('live'); }
  function stickRest() { ang = 0; stick.style.width = '70px'; stick.style.transform = 'rotate(0deg)'; stick.classList.remove('live'); }
  function setCalling(st) { const el = !st || st.uid == null ? null : st.who === 0 ? els.cards.get(st.uid) : [...oppRun.children].find((x) => x._key === st.uid); if (el === calling) return; calling?.classList.remove('calling'); el?.classList.add('calling'); calling = el || null; }
  function trickPoint(st) { if (st.uid == null) return null; if (st.who === 0) { const cl = cardLayout().get(st.uid); return cl ? { x: cl.x + cl.w / 2, y: cl.y + 12 } : null; } const el = [...oppRun.children].find((x) => x._key === st.uid); if (!el) return null; const bx = box(el); return { x: bx.x + 8, y: bx.y + bx.h / 2 }; }
  const runEmpty = h('div', { class: 'run-empty', tip: '<b>Run</b><p>Tricks you have shown. They stay until you bid on them and they finish playing.</p>', text: 'Your Run. Click a trick in your Book to draw it here.' });
  const flipBtn = btn('Flip', () => act(() => setMode(ui.mode === 'flip' ? null : 'flip')), '<b>Flip a chip</b><p>Flip a standard chip from the top of one of your stacks onto a shown trick. It lands as 0 or its worth and counts as a die of any type. It uses a roll, and the chip returns to your Meter once the trick has played.</p>', 'small');
  const sipBtn = btn('Sip', () => act(() => { if (B.sip(bout, me)) toast(`You sip your ${me.drink.name}.`); }), () => (me.drink ? drinkTip(me.drink) : ''), 'small');
  const undoBtn = btn('Undo', () => act(() => { B.resetPlan(bout, me); setMode(null); }), '<b>Undo</b><p>Take back everything you planned this turn. Dice keep the values they rolled.</p>', 'small');
  const speedBtn = btn('1×', () => { ui.speed = ui.speed === 1 ? 2 : ui.speed === 2 ? 4 : 1; swapText(speedBtn, `${ui.speed}×`); }, '<b>Speed</b><p>How fast the House works through a turn: 1×, 2× or 4×.</p>', 'small');
  const playBtn = btn('Pass', () => playTurn(), () => `<b>${planned() ? 'Play' : 'Pass'}</b><p>End your planning. ${planned() ? 'Every bid trick plays.' : 'Nothing is bid, so you only collect rewards for unused actions.'}</p>`, 'big');
  const frameEls = [header, stageBox, feedEl, runEmpty,
    h('div', { class: 'zone-title', style: { left: '16px', top: '418px' }, tip: '<b>Book</b><p>Tricks you own. Click one to draw it onto your Run. Tricks return here once played.</p>', text: 'BOOK' }),
    h('div', { class: 'zone-title', style: { left: '888px', top: '418px' }, tip: '<b>Pouch</b><p>Your dice. A die on a trick stays there until the trick has played.</p>', text: 'POUCH' }),
    h('div', { class: 'zone-title', style: { left: '1082px', top: '418px' }, tip: `<b>${opp.name}'s Run</b><p>The tricks they are showing, with the dice and bids on them. Plan around it.</p>`, text: 'THEIR RUN' }),
    h('div', { class: 'controls' }, sipBtn, flipBtn, undoBtn, speedBtn, playBtn)];
  const oppRun = h('div', { class: 'opp-run' });
  const banner = h('div', { class: 'banner' });
  root.append(...frameEls, oppRun, layer, stick, phaseCall, banner);

  // cells
  bout.sides.forEach((s, si) => {
    for (let r = 0; r < s.rows; r++) { els.cells[si][r] = [];
      for (let c = 0; c < s.dims.cols; c++) {
        const p = cellPos(si, r, c);
        const el = h('div', { class: `cell ${r < s.dims.meterRows ? 'meter' : 'bar'}`, style: { left: p.x + 'px', top: p.y + 'px', width: p.w + 'px', height: CH + 'px' },
          onclick: () => clickCell(si, r, c), onmouseenter: () => hoverCell(si, r, c), onmouseleave: () => hoverCell(si, -1, -1), tip: () => cellTip(si, r, c) });
        els.cells[si][r][c] = el; root.insertBefore(el, layer);
      } }
    const m = s.dims.meterRows, x0 = cellPos(si, si === 0 ? m - 1 : 0, 0).x, x1 = cellPos(si, si === 0 ? s.rows - 1 : m, 0).x;
    root.insertBefore(h('div', { class: 'zone-label', style: { left: x0 + 'px', width: m * cw[si] + 'px', top: TOP + 5 * CH + 4 + 'px' }, text: 'METER',
      tip: '<b>Meter</b><p>The front rows. Only chips gained during the bout land here: Blocks, Opportunity chips and chips recovered from the Stage. Fees hit the front first.</p>' }), layer);
    root.insertBefore(h('div', { class: 'zone-label', style: { left: x1 + 'px', width: s.dims.barRows * cw[si] + 'px', top: TOP + 5 * CH + 4 + 'px' }, text: 'BAR',
      tip: '<b>Bar</b><p>The chips committed before the bout. They must survive to the end.</p>' }), layer);
  });

  // ---------- tooltips ----------
  function cellTip(si, r, c) {
    const s = bout.sides[si], cell = s.grid[r][c], zone = r < s.dims.meterRows ? 'Meter' : 'Bar';
    if (cell.hole) return `<b>Hole</b><p>Nothing can be placed here.</p>`;
    if (!cell.chips.length) return `<b>Empty ${zone} space</b><p>Holds up to ${s.dims.stackMax} chips.</p>`;
    const groups = []; for (let i = cell.chips.length - 1; i >= 0; i--) { const ch = cell.chips[i], g = groups[groups.length - 1]; if (g && g.sig === chipSig(ch)) g.n++; else groups.push({ sig: chipSig(ch), ch, n: 1 }); }
    const top = cell.chips[cell.chips.length - 1];
    return `<b>${zone} stack</b> <span class="dim">${B.solidCount(cell)}/${s.dims.stackMax} high · worth ${B.cellWorth(cell)}¢</span>
      ${cell.hard > 0 ? `<p class="good">Hardened for ${cell.hard} more turn${cell.hard > 1 ? 's' : ''}: each fee takes only one chip.</p>` : ''}
      <ul class="stack">${groups.map((g) => `<li><span class="chip static mini ${g.sig}"><i>${chipGlyph(g.ch)}</i></span> ${g.n} × ${chipName(g.ch)}</li>`).join('')}</ul>
      <p class="dim">Top: ${chipText(top)}</p>`;
  }
  function cardTip(uid) {
    const e = me.run.find((x) => x.uid === uid), t = e ? e.trick : me.book.find((x) => x.uid === uid); if (!t) return '';
    let live = '';
    if (e) { const def = D.TRICKS[t.id];
      live = `<p class="live">${e.dice.length ? `Dice ${e.dice.map((d) => d.value).join(' + ')} → roll total <b>${B.previewTotal(me, e)}</b>${B.bonusMet(me, e) ? ' · <span class="good">bonus met</span>' : ''}` : 'No dice yet: a bid plays the Trait only.'}
        ${e.state === 'play' ? `<br>In play${e.lingerLeft ? `, roll effect in ${e.lingerLeft} turn${e.lingerLeft > 1 ? 's' : ''}` : ''}.` : e.bidValue > 1 ? `<br>A ${e.bidValue}¢ bid lingers ${e.bidValue - 1} turn${e.bidValue > 2 ? 's' : ''}: +${(e.bidValue - 1) * Math.max(1, e.dice.length)} to the roll.` : ''}</p>`;
      if (!e.dice.length && def.type !== 'expense') live += ''; }
    return trickTip(t, me.cls, live);
  }

  // ---------- element factories ----------
  function mkChip(ch) { const el = h('div', { class: `chip ${chipSig(ch)}` }, h('i', { text: chipGlyph(ch) })); el._sig = chipSig(ch); layer.append(el); return el; }
  function mkDie(d) {
    const el = h('div', { class: `die ${d.chip ? 'flipc' : d.type} ${d.up.length ? 'upg' : ''}`, onclick: () => clickDie(d.id) }, h('i', { text: d.type.slice(1) }));
    tip(el, () => { if (d.chip) return `<b>Flipped ${d.chip.value}¢ chip</b><p>Landed on <b>${d.value}</b>. It counts as a die of any type. The chip returns to your Meter once the trick has played.</p>`; const on = me.run.find((e) => e.dice.some((x) => x.id === d.id)); return dieTip(d, on ? `Rolled ${on.dice.find((x) => x.id === d.id).value} on ${D.TRICKS[on.trick.id].name}.` : 'Click to pick it up, then click a shown trick to roll it.'); });
    layer.append(el); return el;
  }
  function mkCard(t) {
    const def = D.TRICKS[t.id], T = D.TYPES[def.type];
    const el = h('div', { class: 'tcard', style: { '--tc': T.color }, onclick: (ev) => clickCard(t.uid, ev) },
      h('div', { class: 'c-compact' }, h('b', { text: def.name }), h('span', { class: 'req', text: `${def.count}${def.die}` }), h('span', { class: 'q', html: pips(t) })),
      h('div', { class: 'c-open' },
        h('div', { class: 'c-name' }, h('b', { text: def.name }), h('span', { class: 'q', html: pips(t) })),
        h('div', { class: 'c-type', text: T.name }),
        h('div', { class: 'c-slots' }, Array.from({ length: def.count }, () => h('span', { class: 'slot', text: def.die }))),
        h('div', { class: 'c-bid' }, h('span', { class: 'bidslot', text: 'BID', 'data-act': 'bid' }), h('span', { class: 'tgt', text: 'target', 'data-act': 'target' })),
        h('div', { class: 'c-text' }, h('p', {}, h('em', { text: 'Roll ' }), def.roll.text), h('p', { class: 'bonus' }, h('em', { text: 'Bonus ' }), def.bonus.text)),
        h('div', { class: 'c-total' }, h('span', { class: 'state' }), h('b', { class: 'num' }))));
    tip(el, () => cardTip(t.uid)); layer.append(el); return el;
  }
  const place = (el, x, y, extra = '') => { el.style.transform = `translate(${x}px, ${y}px) ${extra}`; };
  function spawn(el, x, y, extra, delay = 0) { // put an element at a starting state without animating, then release it
    el.style.transition = 'none'; el.style.opacity = '0'; place(el, x, y, extra); void el.offsetWidth; el.style.transition = ''; el.style.transitionDelay = delay ? `${delay}ms` : '';
    if (delay) setTimeout(() => { el.style.transitionDelay = ''; }, delay + 700);
  }

  // ---------- sync: make the screen match the state ----------
  function sync(fx = {}) {
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
      el.classList.toggle('pick', !!e && ((ui.mode === 'die' && !B.canRoll(bout, me, ui.die, e)) || (ui.mode === 'fliptrick' && !B.canFlip(bout, me, ui.flipAt.r, ui.flipAt.c, e))));
      el.classList.toggle('active', !!e && ui.entry === e.uid && (ui.mode === 'bid' || ui.mode === 'target'));
      if (e) {
        const def = D.TRICKS[t.id], met = B.bonusMet(me, e);
        el.querySelector('.bonus').classList.toggle('met', met); el.querySelector('.bonus').classList.toggle('na', !!def.cls && def.cls !== me.cls);
        el.querySelector('.tgt').classList.toggle('on', e.state === 'bid' && B.needsTarget(e));
        swapText(el.querySelector('.state'), e.state === 'play' ? (e.lingerLeft ? `lingers ${e.lingerLeft}` : 'in play') : e.state === 'bid' ? (e.bidValue > 1 ? `lingers ${e.bidValue - 1}` : 'plays now') : e.dice.length ? 'needs a bid' : 'shown');
        tween(el.querySelector('.c-total .num'), B.previewTotal(me, e), (n) => (e.dice.length ? '= ' + Math.round(n) : ''));
        [...el.querySelectorAll('.slot')].forEach((sl, i) => sl.classList.toggle('full', i < e.dice.length));
      }
    }
    for (const [uid, el] of els.cards) if (!cards.has(uid)) { el.style.opacity = '0'; els.cards.delete(uid); setTimeout(() => el.remove(), 500); }

    // dice
    const wantDice = new Map(); me.pouch.forEach((d, i) => wantDice.set(d.id, { ...pouchSlot(i, me.pouch.length), d }));
    for (const e of me.run) { const cl = cards.get(e.uid); e.dice.forEach((d, i) => wantDice.set(d.id, { ...dieSlot(cl, i), d, value: d.value, on: true })); }
    for (const [id, w] of wantDice) {
      let el = els.dice.get(id); if (!el) { el = mkDie(w.d); els.dice.set(id, el); spawn(el, w.x, w.y - 16, 'scale(.4)'); }
      el.style.opacity = '1'; place(el, w.x, w.y); el.classList.toggle('on', !!w.on); el.classList.toggle('sel', ui.mode === 'die' && ui.die === id);
      const label = el.firstChild, text = w.on ? String(w.value) : w.d.type.slice(1);
      if (w.on && !el._on) { el.classList.add('rolling'); let n = 0; const f = D.DICE[w.d.type].faces; const iv = setInterval(() => { label.textContent = w.d.chip ? (Math.random() < 0.5 ? 0 : w.d.chip.value) : 1 + Math.floor(Math.random() * f); if (++n > 7) { clearInterval(iv); label.textContent = text; el.classList.remove('rolling'); } }, 55); }
      else if (label.textContent !== text && !el.classList.contains('rolling')) label.textContent = text;
      el._on = !!w.on;
    }
    for (const [id, el] of els.dice) if (!wantDice.has(id)) { el.style.opacity = '0'; els.dice.delete(id); setTimeout(() => el.remove(), 500); }

    // chips
    const want = new Map();
    bout.sides.forEach((s, si) => { for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.dims.cols; c++) s.grid[r][c].chips.forEach((ch, lvl) => want.set(ch.id, { ...chipPos(si, r, c, lvl), ch, side: si })); });
    for (const e of me.run) { const cl = cards.get(e.uid); e.bid.forEach((ch, i) => want.set(ch.id, { x: cl.x + 9 + i * 12, y: cl.y + 87, z: 900 + i, ch, side: 0 })); }
    const ostep = Math.min(48, Math.floor(216 / Math.max(1, opp.run.length))); oppRun.style.setProperty('--oh', `${ostep - 6}px`);
    opp.run.forEach((e, k) => e.bid.forEach((ch, i) => want.set(ch.id, { x: 1226 - i * 10, y: 446 + k * ostep + (ostep - 6) / 2 - 16, z: 900 + i, ch, side: 1, s: Math.min(0.7, (ostep - 8) / 32) })));
    let n = 0;
    for (const [id, w] of want) {
      let el = els.chips.get(id); const extra = w.s ? `scale(${w.s})` : '';
      if (!el) { el = mkChip(w.ch); els.chips.set(id, el);
        if (fx[id] === 'from-stage') spawn(el, STAGE[w.side].x, STAGE[w.side].y, 'scale(.5)');
        else if (ui.first) spawn(el, w.x, w.y - 46, '', Math.min(900, n * 5));
        else spawn(el, w.x, w.y, 'scale(.1)'); n++; }
      el._side = w.side; el.style.opacity = '1'; el.style.zIndex = w.z; place(el, w.x, w.y, extra);
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

    // cells, creatures, numbers
    bout.sides.forEach((s, si) => { for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.dims.cols; c++) { const el = els.cells[si][r][c], cell = s.grid[r][c]; el.classList.toggle('hole', cell.hole); el.classList.toggle('hard', cell.hard > 0); } });
    for (const cr of bout.creatures) {
      let el = els.creatures.get(cr.id); const s = bout.sides[cr.side];
      const p = cr.r >= 0 ? cellPos(cr.side, cr.r, cr.c) : { x: cr.side === 0 ? 300 : 960, y: 44, w: 40 };
      if (!el) { if (cr.gone || cr.arrive > bout.turn) continue; el = h('div', { class: 'creature', text: D.CREATURES[cr.kind].glyph, tip: `<b>${D.CREATURES[cr.kind].name}</b><p>${D.CREATURES[cr.kind].text}</p>` }); layer.append(el); els.creatures.set(cr.id, el); spawn(el, p.x, -40, ''); }
      if (cr.gone) { el.style.opacity = '0'; place(el, p.x + (cr.side === 0 ? -200 : 200), -60); els.creatures.delete(cr.id); setTimeout(() => el.remove(), 800); continue; }
      void s; el.style.opacity = '1'; place(el, p.x + p.w / 2 - 16, p.y - 14);
    }
    bout.sides.forEach((s, si) => { tween(worthEl[si], B.worth(s)); tween(stageEl[si], bout.stage.paid[si]); syncList(badgeBox[si], badges(s), (x) => x.k, (x) => h('span', { class: `badge ${x.cls || ''}`, tip: x.tip }), (el, x) => swapText(el, x.text)); });
    swapText(root.querySelector('.turn-n'), String(bout.turn));
    for (const [k, stat] of [['draw', 'trickery'], ['roll', 'proficiency'], ['bid', 'ingenuity']]) swapText(pill[k], `${Math.max(0, B.tipOf(me, stat) - me.used[k])}/${B.tipOf(me, stat)}`);
    syncList(oppRun, opp.run, (e) => e.uid, (e) => { const def = D.TRICKS[e.trick.id]; return h('div', { class: 'orow', style: { '--tc': D.TYPES[def.type].color }, tip: () => trickTip(e.trick, opp.cls, `<p class="live">${e.dice.length ? `Dice ${e.dice.map((d) => d.value).join(' + ')} → roll total <b>${B.previewTotal(opp, e)}</b>` : 'No dice on it.'}${e.state === 'bid' ? '<br>Bid on: it plays this turn.' : e.state === 'play' ? '<br>In play.' : '<br>Shown, not bid.'}</p>`) }, h('b', { text: def.name }), h('span', { class: 'odice' }), h('span', { class: 'ostate' })); },
      (el, e) => { swapText(el.querySelector('.odice'), e.dice.map((d) => d.value).join(' ')); swapText(el.querySelector('.ostate'), e.state === 'bid' ? 'bid' : e.state === 'play' ? (e.lingerLeft ? `lingers ${e.lingerLeft}` : 'in play') : 'shown'); el.classList.toggle('bid', e.state !== 'shown'); });
    setOn(sipBtn, !ui.locked && !!me.drink && me.drink.sips > 0 && !me.sipped); sipBtn.classList.toggle('gone', !me.drink);
    runEmpty.style.opacity = me.run.length ? 0 : 1; setOn(flipBtn, !ui.locked && me.run.some((e) => e.state === 'shown')); flipBtn.classList.toggle('on', ui.mode === 'flip' || ui.mode === 'fliptrick');
    setOn(undoBtn, !ui.locked && (me.used.draw + me.used.roll + me.used.bid > 0)); setOn(playBtn, !ui.locked);
    swapText(playBtn, planned() ? 'Play' : 'Pass'); playBtn.classList.toggle('go', planned());
    marks(); refreshTip();
  }
  const planned = () => me.run.some((e) => e.state === 'bid');
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
    const cls = ['ok', 'aff', 'tgt', 'origin']; for (const side of els.cells) for (const rowEls of side) for (const el of rowEls) el.classList.remove(...cls);
    const mark = (si, r, c, k) => els.cells[si][r]?.[c]?.classList.add(k);
    for (const e of me.run) if (e.state === 'bid' && B.needsTarget(e) && e.target) {
      const def = D.TRICKS[e.trick.id], t = bout.sides[e.target.side];
      for (const x of B.affected(bout, t, def, e.target, e.dice.length)) mark(t.idx, x.r, x.c, 'tgt'); mark(t.idx, e.target.r, e.target.c, 'origin');
    }
    const e = me.run.find((x) => x.uid === ui.entry);
    if (ui.mode === 'flip') { for (let r = 0; r < me.rows; r++) for (let c = 0; c < me.dims.cols; c++) if (B.bidChip(me, r, c)?.kind === 'std') mark(0, r, c, 'ok'); }
    if (ui.mode === 'bid') { for (let r = 0; r < me.rows; r++) for (let c = 0; c < me.dims.cols; c++) if (B.bidChip(me, r, c)) mark(0, r, c, 'ok'); }
    if (ui.mode === 'target' && e) {
      const valid = B.validTargets(bout, me, e); for (const v of valid) mark(v.side, v.r, v.c, 'ok');
      if (hover && valid.some((v) => v.side === hover.side && v.r === hover.r && v.c === hover.c)) for (const x of B.affected(bout, bout.sides[hover.side], D.TRICKS[e.trick.id], hover, e.dice.length)) mark(hover.side, x.r, x.c, 'aff');
    }
    root.classList.toggle('m-bid', ui.mode === 'bid' || ui.mode === 'flip'); root.classList.toggle('m-target', ui.mode === 'target'); root.classList.toggle('m-die', ui.mode === 'die');
  }
  function hint() {
    if (ui.locked) return;
    const e = me.run.find((x) => x.uid === ui.entry), name = e ? D.TRICKS[e.trick.id].name : '';
    setPrompt(ui.mode === 'die' ? 'Click a shown trick to roll the die onto it.'
      : ui.mode === 'flip' ? 'Click one of your stacks to flip its top chip: it lands as 0 or its worth and counts as a die.'
      : ui.mode === 'fliptrick' ? 'Click the shown trick the flipped chip should land on.'
      : ui.mode === 'bid' ? `Click one of your stacks to bid its top chip on ${name}. A 1¢ chip plays it now; bigger chips linger.`
      : ui.mode === 'target' ? `Pick where ${name} lands, or keep the marked space.`
      : !me.run.length ? 'Draw a trick from your Book to begin.'
      : me.run.some((x) => x.state === 'shown' && x.dice.length) ? 'A loaded trick still needs a bid to play.'
      : planned() ? 'Ready. Press Play, or keep planning.' : 'Roll dice onto a shown trick, then bid a chip on it.');
  }
  function setMode(mode, v) { ui.mode = mode; ui.die = mode === 'die' ? v : null; ui.entry = mode === 'bid' || mode === 'target' ? v : null; ui.flipAt = mode === 'fliptrick' ? v : null; }
  function act(fn) { if (ui.locked) return; fn(); sync(); hint(); }
  const nope = (msg, el) => { toast(msg, 'warn'); if (el) pulse(el, 'shake'); };

  // ---------- input ----------
  function clickCard(uid, ev) {
    if (ui.locked) return;
    const e = me.run.find((x) => x.uid === uid), el = els.cards.get(uid);
    if (!e) { const why = B.canDraw(bout, me, uid); if (why) return nope(why, el); return act(() => B.draw(bout, me, uid)); }
    if (ui.mode === 'die') { const why = B.canRoll(bout, me, ui.die, e); if (why) return nope(why, el); return act(() => { B.roll(bout, me, ui.die, e); setMode(null); }); }
    if (ui.mode === 'fliptrick') { const at = ui.flipAt, why = B.canFlip(bout, me, at.r, at.c, e); if (why) return nope(why, el); return act(() => { B.flip(bout, me, at.r, at.c, e); setMode(null); }); }
    if (ev.target.dataset.act === 'target' && e.state === 'bid') return act(() => setMode('target', uid));
    if (e.state === 'play') return nope('That trick is already in play.', el);
    if (me.used.bid >= B.tipOf(me, 'ingenuity')) { if (e.state === 'bid' && B.needsTarget(e)) return act(() => setMode('target', uid)); return nope('No bids left this turn (Ingenuity).', el); }
    act(() => setMode(ui.mode === 'bid' && ui.entry === uid ? null : 'bid', uid));
  }
  function clickDie(id) {
    if (ui.locked) return;
    if (!me.pouch.some((d) => d.id === id)) return;
    const fits = me.run.filter((e) => !B.canRoll(bout, me, id, e));
    if (!fits.length) return nope(me.run.some((e) => e.state === 'shown') ? B.canRoll(bout, me, id, me.run.find((e) => e.state === 'shown')) : 'Draw a trick first: a die needs a shown trick to roll onto.', els.dice.get(id));
    if (fits.length === 1) return act(() => { B.roll(bout, me, id, fits[0]); setMode(null); });
    act(() => setMode(ui.mode === 'die' && ui.die === id ? null : 'die', id));
  }
  function clickCell(si, r, c) {
    if (ui.locked) return;
    if (ui.mode === 'flip') {
      if (si !== 0) return nope('Flip a chip from your own position.');
      if (B.bidChip(me, r, c)?.kind !== 'std') return nope('Only an uncovered standard chip on top of a stack can be flipped.', els.cells[si][r][c]);
      if (B.worth(me) - B.bidChip(me, r, c).value <= 0) return nope('That is your last chip.', els.cells[si][r][c]);
      const fits = me.run.filter((x) => !B.canFlip(bout, me, r, c, x));
      if (!fits.length) return nope(me.run.length ? B.canFlip(bout, me, r, c, me.run.find((x) => x.state === 'shown') || me.run[0]) : 'Draw a trick first.', els.cells[si][r][c]);
      if (fits.length === 1) return act(() => { B.flip(bout, me, r, c, fits[0]); setMode(null); });
      return act(() => setMode('fliptrick', { r, c }));
    }
    const e = me.run.find((x) => x.uid === ui.entry);
    if (ui.mode === 'bid' && e) {
      if (si !== 0) return nope('Bid a chip from your own position.');
      const why = B.canBid(bout, me, e, r, c); if (why) return nope(why, els.cells[si][r][c]);
      if (B.worth(me) - B.bidChip(me, r, c).value <= 0) return nope('That is your last chip. Bid it and you are broke.', els.cells[si][r][c]);
      return act(() => { B.bid(bout, me, e, r, c); setMode(B.needsTarget(e) && B.validTargets(bout, me, e).length > 1 ? 'target' : null, e.uid); });
    }
    if (ui.mode === 'target' && e) { if (!B.setTarget(bout, me, e, { side: si, r, c })) return nope('Not a valid target for that trick.', els.cells[si][r][c]); return act(() => setMode(null)); }
  }
  function hoverCell(si, r, c) { hover = r < 0 ? null : { side: si, r, c }; if (ui.mode === 'target') marks(); }
  const onKey = (ev) => { if (ev.key === 'Escape' && ui.mode) act(() => setMode(null)); };
  document.addEventListener('keydown', onKey);

  // ---------- resolution ----------
  // The House works through the turn one call at a time: it names the phase, points the stick
  // at the trick being played, then at where it lands, and only then does the table change.
  async function playTurn() {
    if (ui.locked || bout.over) return;
    ui.locked = true; setMode(null); me.ready = true; prompt = ''; renderFeed(); sync();
    let n = 0; const pace = (ms) => wait(ms / ui.speed / (n > 40 ? 1.6 : 1));
    const flash = (st) => { for (const x of st.cells) { const el = els.cells[x.side][x.r]?.[x.c]; if (el) pulse(el, st.kind === 'miss' ? 'flash-miss' : st.kind === 'play' ? 'flash-aim' : 'flash-hit'); } };
    const cellPoint = (x) => { const p = cellPos(x.side, x.r, x.c); return { x: p.x + p.w / 2, y: p.y + CH / 2 }; };
    for (const st of B.resolve(bout)) { n++;
      if (st.kind === 'turn') { sync(st.fx); break; }
      setPhase(st.phase);
      if (st.kind === 'return') { setCalling(null); sync(st.fx); await pace(520); continue; }
      setCalling(st);
      if (st.text) feedPush(st.text, st.who);
      if (st.kind === 'phase') {
        const bx = box(phaseEls[st.phase]); stickTo(bx.x + bx.w / 2, bx.y + bx.h + 4);
        phaseCall.textContent = D.TYPES[st.phase].name + 's'; phaseCall.style.setProperty('--pc', D.TYPES[st.phase].color); phaseCall.classList.add('in');
        await pace(620); pulse(stick, 'tap'); await pace(620); phaseCall.classList.remove('in'); await pace(260); continue;
      }
      if (st.kind === 'bid') { stickTo(560, 476); await pace(560); sync(st.fx); stickTo(712, 66); await pace(820); continue; }
      const tp = st.kind === 'play' ? trickPoint(st) : null;
      if (tp) { stickTo(tp.x, tp.y); await pace(600); pulse(stick, 'tap'); await pace(320); }
      const c0 = st.cells[0];
      if (c0) { const p = cellPoint(c0); stickTo(p.x, p.y); await pace(560); }
      else if (!tp && st.who != null) { stickTo(st.who === 0 ? 190 : 1090, 78); await pace(460); }
      sync(st.fx); flash(st);
      if (st.kind === 'fee' && c0) { await pace(220); stickTo(STAGE[c0.side].x + 16, STAGE[c0.side].y + 14); } // rake what was paid to the Stage
      await pace(st.kind === 'over' ? 1000 : st.text ? 780 : 340);
    }
    setCalling(null); setPhase(null); stickRest();
    if (bout.over) return finish();
    planTurn(bout, opp); ui.locked = false; sync(); hint();
  }
  async function finish() {
    document.removeEventListener('keydown', onKey);
    const win = bout.winner === 0; await wait(500);
    banner.append(h('div', { class: `banner-card ${win ? 'win' : 'lose'}` }, h('h1', { text: win ? 'The table is yours' : 'Broke' }),
      h('p', { text: win ? `${opp.name} is out of Worth after ${bout.turn} turn${bout.turn > 1 ? 's' : ''}.` : `${opp.name} takes everything on the table.` }),
      btn('Continue', () => onDone(), null, 'big go')));
    requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add('in')));
  }

  planTurn(bout, opp);
  requestAnimationFrame(() => { sync(); hint(); });
  void ctx; void sum;
}
