// Commitment before a bout (wager, tilts, position) and the settlement after it.
import { h, syncList, toast, btn, tween, wait, pulse, swapText, openPanel, closePanel, paint, guided } from './core.js';
import { app, hud, oppTip, trickTag, diceSummary } from './app.js';
import { chipEl, chipSig, chipGlyph, chipTip, dieEl, dieTip, statTip, trickTip, trickChip, trickLook, trickWord, jacketEl, drinkEl } from './parts.js';
import { signOf, dressSign } from './sign.js';
import * as D from '../data.js';
import * as R from '../run.js';
import { barCapacity } from '../bout.js';
import * as B from '../bout.js';
import { cents, sum } from '../util.js';
import { t } from '../text.js';

// ---------- drawing a position ----------
// A position drawn as it sits at the table: its spaces and real chip stacks (the same chips as the table, no numbers;
// hover for what is in a stack). Yours faces the Stage on the right (Stake left, Bet right); theirs is mirrored.
// Keeps its elements between draws so chips scale on and off as the position changes.
export function positionView({ CH = 46, SZ = 24, maxW = 400, mirror = false, lift = 3 } = {}) {
  let CW = 48, rows = 0, side = null;
  const board = h('div', { class: `mboard ${mirror ? 'mirror' : ''}`, style: { transition: 'width .45s cubic-bezier(.22,.8,.24,1)', height: `${5 * CH + 16}px` } });
  const chips = new Map(), cells = new Map(), labels = [h('div', { class: 'mlabel', text: t('prep.label.stake') }), h('div', { class: 'mlabel', text: t('prep.label.bet') })];
  board.append(...labels); for (const l of labels) { l.style.top = `${5 * CH + 3}px`; l.style.transition = 'left .45s, width .45s'; }
  const xOf = (r) => (mirror ? r : rows - 1 - r) * CW;
  function draw(sd) {
    side = sd; rows = sd.rows; const m = sd.dims.meterRows, want = new Set(); CW = Math.max(30, Math.min(56, Math.floor(maxW / rows))); board.style.width = `${rows * CW}px`;
    for (let r = 0; r < rows; r++) for (let col = 0; col < 5; col++) { const k = `${r}-${col}`; want.add(k); let ce = cells.get(k); const x = xOf(r), y = col * CH;
      if (!ce) { ce = h('div', { class: 'mcell', style: { height: `${CH - 3}px`, opacity: 0, transition: 'transform .45s cubic-bezier(.22,.8,.24,1), width .45s, opacity .4s, background-color .4s' } }); ce.style.transform = `translate(${x}px, ${y}px) scale(.6)`; board.prepend(ce); cells.set(k, ce); void ce.offsetWidth; }
      ce.classList.toggle('meter', r < m); ce.classList.toggle('alt', (r + col) % 2 === 1); ce.style.width = `${CW - 3}px`; ce.style.opacity = 1; ce.style.transform = `translate(${x}px, ${y}px)`;
      const stack = sd.grid[r][col].chips; ce._tip = stack.length ? () => t('prep.stack.tip', { n: stack.length, chips: stack.slice().reverse().map((ch) => chipGlyph(ch)).join(' · '), amt: cents(sum(stack, (ch) => (ch.kind === 'std' && !ch.resist ? ch.value : 0))) }) : null;
      ce.classList.toggle('has-tip', !!stack.length); }
    for (const [k, ce] of cells) if (!want.has(k)) { ce.style.opacity = 0; cells.delete(k); setTimeout(() => ce.remove(), 450); }
    const sw = (rows - m) * CW, bw = m * CW;
    labels[0].style.left = mirror ? `${bw}px` : '0px'; labels[0].style.width = `${sw}px`; labels[1].style.left = mirror ? '0px' : `${sw}px`; labels[1].style.width = `${bw}px`;
    const seen = new Set();
    for (let r = 0; r < rows; r++) for (let col = 0; col < 5; col++) sd.grid[r][col].chips.forEach((ch, lvl) => { const k = `${r}-${col}-${lvl}`, sig = chipSig(ch); seen.add(k); let e = chips.get(k);
      const x = xOf(r) + (CW - 3 - SZ) / 2, y = col * CH + CH - 3 - SZ - 2 - lvl * lift;
      if (!e) { e = h('div', { class: `chip ${SZ <= 18 ? 'xs' : 'sm'} ${sig}` }, h('i', { text: chipGlyph(ch) })); e.style.width = e.style.height = `${SZ}px`; e.style.opacity = 0; e.style.transform = `translate(${x}px, ${y - 14}px) scale(.3)`; board.append(e); chips.set(k, e); void e.offsetWidth; }
      if (e._sig !== sig) { e._sig = sig; e.className = `chip ${SZ <= 18 ? 'xs' : 'sm'} ${sig}`; e.firstChild.textContent = chipGlyph(ch); }
      e.style.zIndex = 10 + col * 20 + lvl; e.style.opacity = 1; e.style.transform = `translate(${x}px, ${y}px)`; });
    for (const [k, e] of chips) if (!seen.has(k)) { const tf = e.style.transform.replace(/ scale\([^)]*\)/, ''); e.style.opacity = 0; e.style.transform = `${tf} scale(.2)`; chips.delete(k); setTimeout(() => e.remove(), 450); }
  }
  // the space under a pointer: { r, c } in the side's rows, or null
  const at = (ev) => { if (!side) return null; const rect = board.getBoundingClientRect(), k = rect.width / board.offsetWidth, x = (ev.clientX - rect.left) / k, y = (ev.clientY - rect.top) / k;
    const i = Math.floor(x / CW), r = mirror ? i : rows - 1 - i, c = Math.floor(y / CH); return r < 0 || r >= rows || c < 0 || c > 4 ? null : { key: `${r}-${c}`, r, c }; };
  return { board, draw, at };
}

// ---------- the position planner ----------
// Your Stake, painted by hand: it starts from the position you had last (your Roller's own, the first time) and you
// add to it or take from it before each bout. Pick a chip from the rack beside it and click a space (hold to stack,
// sweep to cover more); right-click takes the top chip off. Restore puts back what you sat down with last time (as far
// as your purse goes now: filled from the bottom of each stack up); Clear takes everything off.
let brushPick = null; // the chip you paint with, kept between visits
export function planner(getExtra, onChange, { maxW = 400 } = {}) {
  const run = app.run, V = positionView({ maxW });
  const rack = h('div', { class: 'col rack' }), meters = h('div', { class: 'col pos-meters' });
  const worthEl = h('b', { class: 'num gold-t' }), countEl = h('b', { class: 'num' });
  const K = D.CLASSES[run.cls], dims = () => R.rollerStats(run, getExtra()).dims;
  const restoreBtn = btn(t('prep.restore'), () => { const from = run.plan.sat || D.ROLLERS[run.roller]?.layout || null; run.plan.layout = from ? JSON.parse(JSON.stringify(from)) : null; if (!from) run.plan.layout = autoLayout(); update(); toast(t('prep.restored')); }, () => t('prep.restore.tip'), 'small');
  const clearBtn = btn(t('prep.clear'), () => { run.plan.layout = []; update(); }, t('prep.clear.tip'), 'small');
  const el = h('div', { class: 'col planner' },
    h('div', { class: 'row between' }, h('div', { class: 'row' }, h('h3', { text: t('prep.position') }), restoreBtn, clearBtn),
      h('span', { class: 'cap', guide: 'prep:deploy', tip: t('prep.deploy.tip', { name: K.name, from: t(`prep.deploy.at.${K.deploy === 'start' || K.deploy === 'end' ? K.deploy : 'mid'}`) }), text: t(`prep.deploy.${K.deploy === 'start' || K.deploy === 'end' ? K.deploy : 'mid'}`) })),
    h('div', { class: 'row', style: { alignItems: 'flex-start', gap: '12px' } }, rack, V.board, meters),
    h('div', { class: 'row wrap' }, h('span', { class: 'stat', tip: t('prep.worth.tip') }, h('em', { text: t('prep.worth') }), worthEl), h('span', { class: 'stat', tip: t('prep.capacity.tip') }, h('em', { text: t('prep.capacity') }), countEl),
      h('span', { class: 'sub', text: t('prep.paint.how') })));
  let side = null, warned = false, warnedShort = false, erasing = false;
  // the rack: every chip you can lay (your denominations, and the effect chips you own, with how many are left)
  const items = () => [...D.DENOMS.filter((x) => x.floor <= R.chipFloor(run)).map((x) => x.value), ...Object.keys(D.SHOP_CHIPS).filter((k) => R.owned(run, k) > 0)];
  const usedOf = (k) => sum(run.plan.layout || [], (sp) => sp.chips.filter((x) => x === k).length);
  function drawRack() {
    const list = items(); if (!list.includes(brushPick)) brushPick = list[0];
    rack.replaceChildren(...list.map((it) => { const b = guided(btn('', () => { brushPick = it; drawRack(); }, () => (typeof it === 'number' ? t('prep.brush.tip', { amt: cents(it) }) : `${chipTip({ kind: 'std', value: 1, resist: it })}${t('prep.brush.effect', { n: R.owned(run, it) - usedOf(it) })}`), `rack-chip ${brushPick === it ? 'on' : ''}`), 'brush');
      b.append(chipEl(typeof it === 'number' ? { kind: 'std', value: it } : { kind: 'std', value: 1, resist: it })); if (typeof it !== 'number') b.append(h('small', { class: 'num', text: R.owned(run, it) - usedOf(it) })); return b; }));
  }
  // the Stake as shown, as a painted layout (effect chips included)
  const layoutNow = (sd) => { const m = sd.dims.meterRows, out = []; for (let r = m; r < sd.rows; r++) for (let c = 0; c < 5; c++) { const chips = sd.grid[r][c].chips.filter((ch) => ch.kind === 'std' || ch.resist).map((ch) => (ch.resist ? ch.resist : ch.value)); if (chips.length) out.push({ r: r - m, c, chips }); } return out; };
  // the first time there is nothing to start from: the House's own suggestion, laid out
  function autoLayout() { const d = dims(), saved = run.plan.layout; run.plan.layout = null; const sd = R.previewPosition(run, R.autoCounts(run, d), { position: getExtra().position, resist: {} }); run.plan.layout = saved; return layoutNow(sd); }
  V.board.addEventListener('pointerdown', (ev) => { erasing = ev.button === 2; }, true);
  V.board.addEventListener('contextmenu', (ev) => ev.preventDefault());
  function paintAt(at, first) {
    if (first) warned = false;
    const d = dims(), m = d.meterRows, warn = (msg) => { if (!warned) toast(msg, 'warn'); warned = true; };
    if (at.r < m) return warn(t('prep.paint.bet'));
    run.plan.layout = layoutNow(side); // you change the position as it stands for this bout
    const L = run.plan.layout, br = at.r - m; let sp = L.find((x) => x.r === br && x.c === at.c);
    if (erasing) { if (!sp?.chips.length) return; sp.chips.pop(); }
    else {
      if (!sp) { sp = { r: br, c: at.c, chips: [] }; L.push(sp); }
      const it = brushPick;
      if (sp.chips.length >= d.stackMax) return warn(t('prep.stackFull'));
      if (typeof it === 'number' && R.planWorth(R.layoutCounts(L)) + it > run.purse) return warn(t('prep.purseShort'));
      if (typeof it !== 'number' && usedOf(it) >= R.owned(run, it)) return warn(t('prep.noMore'));
      if (sum(L, (x) => x.chips.length) >= barCapacity(d)) return warn(t('prep.stakeFull'));
      sp.chips.push(it);
    }
    run.plan.layout = L.filter((x) => x.chips.length);
    update();
  }
  paint(V.board, V.at, paintAt);
  // the meters: what the position holds of each zone's rows, and what that earns (as at the table)
  function drawMeters(sd) {
    const o = B.occupancy(sd), k = D.primaryC(run.cls), stakeAll = o.stakeRows.every((x) => x.n > 0), focus = o.stakeAligned >= 0;
    const dots = (rows) => h('span', { class: 'rowdots' }, ...rows.map((x) => h('i', { class: x.n > 0 ? 'on' : '' })));
    meters.replaceChildren(
      h('div', { class: 'pmeter', tip: t('prep.meter.stake.tip', { stat: D.STATS[k].name }) }, h('span', { class: 'cap', text: t('prep.label.stake') }), dots(o.stakeRows),
        h('b', { class: stakeAll ? 'good-t' : 'dim', text: stakeAll ? `+1 ${D.STATS[k].name}` : t('prep.meter.rows', { n: o.stakeRows.filter((x) => x.n > 0).length }) }),
        h('small', { class: focus ? 'good-t' : 'dim', text: t(focus ? 'prep.meter.focus' : 'prep.meter.nofocus') })),
      h('div', { class: 'pmeter', tip: t('prep.meter.bet.tip') }, h('span', { class: 'cap', text: t('prep.label.bet') }), dots(o.betRows), h('b', { class: 'dim', text: t('prep.meter.bet') })));
  }
  function update() {
    const d = dims(), extra = getExtra();
    for (const k of Object.keys(run.plan.resist || {})) run.plan.resist[k] = Math.min(run.plan.resist[k] || 0, R.owned(run, k));
    if (!run.plan.layout) run.plan.layout = autoLayout();
    const fitted = R.validLayout(run, d) || [];
    if (R.layoutWorth(fitted) < R.layoutWorth(run.plan.layout) && !warnedShort) { warnedShort = true; toast(t('prep.paintShort'), 'warn'); }
    run.plan.counts = R.layoutCounts(fitted);
    run.plan.resist = {}; for (const sp of fitted) for (const x of sp.chips) if (typeof x !== 'number') run.plan.resist[x] = (run.plan.resist[x] || 0) + 1;
    side = R.previewPosition(run, run.plan.counts, { position: extra.position, resist: run.plan.resist });
    V.draw(side); drawMeters(side); drawRack();
    tween(worthEl, R.planWorth(run.plan.counts), cents, 300); tween(countEl, sum(fitted, (sp) => sp.chips.length), (n) => `${Math.round(n)}/${barCapacity(d)}`, 300);
    onChange?.();
  }
  return { el, update, worth: () => R.planWorth(run.plan.counts) };
}

// ---------- the opponent, as they will sit down ----------
const bookCard = (tr, cls) => { const def = D.defOf(tr), T = D.TYPES[def.type], ch = trickChip(def);
  return h('div', { class: `bookcard ${trickLook(tr)}`, style: { '--tc': T.color }, tip: () => trickTip(tr, cls) }, ch ? chipEl(ch, 'mini') : null, h('b', { text: def.name }), h('span', { class: 'q', html: trickWord(tr) }),
    h('span', { class: 'req' }, h('em', { text: '★' }), `${def.count}×`, dieEl({ type: def.die, up: [] }, '', 'mini'))); };
function oppPanel(opp) {
  const sign = h('div', { class: 'who them neon-sample prep-sign' }, h('div', { class: 'name nsign' }, h('b', { class: 'neon-name', text: opp.name }), h('span', { class: 'neon-class', text: D.CLASSES[opp.cls].name })));
  requestAnimationFrame(() => dressSign(sign, { ...signOf('them', opp.sign), crown: opp.boss ? { level: Math.max(1, Math.min(4, opp.floor || 1)) } : null }, 'them'));
  const T = opp.trait ? D.BOSS_TRAITS[opp.trait] : null;
  const gear = h('div', { class: 'row wrap gear' },
    opp.jacket && D.JACKETS[opp.jacket] ? jacketEl(opp.jacket) : h('span', { class: 'gear-none', text: t('prep.opp.nojacket') }),
    opp.drink ? drinkEl(opp.drink) : h('span', { class: 'gear-none', text: t('prep.opp.nodrink') }),
    T ? h('span', { class: 'gcard bizcard', guide: 'boss-trait', tip: () => t('trait.card-tip', { name: opp.name, title: T.title, trait: T.name, rule: B.traitRule(T), flavor: T.flavor }) }, h('em', { text: t('table.biz-card') }), h('b', { text: T.name })) : null);
  let sd = null; try { sd = R.previewOpponent(opp); } catch { sd = null; }
  const V = positionView({ CH: 30, SZ: 19, maxW: 380, mirror: true, lift: 2 }); if (sd) V.draw(sd);
  return h('div', { class: 'box col opp-panel', guide: 'opponent' },
    h('div', { class: 'row between' }, h('span', { class: 'cap', text: t('prep.across') }), h('span', { class: 'sub', guide: 'opponent', tip: () => oppTip(opp), text: `${opp.title ? opp.title + ' · ' : ''}${t('prep.opp.line', { cls: D.CLASSES[opp.cls].name, amt: cents(opp.worth) })}` })),
    h('div', { class: 'row', style: { alignItems: 'center', gap: '14px' } }, sign, gear),
    h('span', { class: 'cap', text: t('prep.theirs') }), sd ? V.board : h('p', { class: 'sub', text: '—' }),
    h('span', { class: 'cap', text: t('prep.theirBook', { dice: diceSummary(opp.dice) }) }), h('div', { class: 'bookcards' }, opp.tricks.map((tr) => bookCard(tr, opp.cls))));
}

// ---------- commitment ----------
export function prepScene(root, kind, idx) {
  const run = app.run, fs = run.fs, entry = kind === 'boss' ? fs.boss : fs.tables[idx], opp = entry.opp, prep = R.newPrep(run, kind, idx);
  entry.seen = true;
  const H = hud(D.FLOORS[run.floor].name, kind === 'boss' ? t('prep.sub.boss') : t('prep.sub.table', { n: idx + 1, felt: D.feltOf(entry.felt).name }));
  const multEl = h('div', { class: 'mult num' }), wagerEl = h('b', { class: 'num gold-t' }), winEl = h('b', { class: 'num good' }), posEl = h('b', { class: 'num' });
  const tiltBox = h('div', { class: 'tilts' });
  const P = planner(() => ({ position: prep.tilts.position }), sync, { maxW: 360 });
  const ddBtn = btn(t('prep.dd'), () => { prep.dd = !prep.dd; if (prep.dd) for (const [k, T] of Object.entries(D.TILTS)) prep.tilts[k] = T.kind === 'challenge' && fs.lastWin.tilts[k] && R.tiltOpen(run, k) ? 1 : 0; P.update(); },
    t('prep.dd.tip'), 'small');
  // each tilt is on or off; while on, the House may play it during the bout
  const rows = Object.entries(D.TILTS).map(([k, T]) => {
    const tg = btn(t('prep.off'), () => { if (prep.dd) return toast(t('prep.dd.locked'), 'warn'); if (!R.setTilt(run, prep, k, !prep.tilts[k])) return toast(t('prep.tilt.opens', { floor: T.floor }), 'warn'); P.update(); }, null, 'small');
    const el = h('div', { class: `tilt ${T.kind}`, tip: () => `<b>${T.name}</b> <span class="dim">${t(`prep.tilt.${T.kind === 'challenge' ? 'challenge' : 'cheat'}`, { mult: T.mult, pct: Math.round(T.mult * 100) })}</span><p>${T.text}</p>${T.base || T.per ? t(`prep.tilt.chance.${T.kind === 'challenge' ? 'challenge' : 'cheat'}`, { base: Math.round(T.base * 100), per: Math.round(T.per * 100) }) : ''}${R.tiltOpen(run, k) ? '' : `<p class="bad">${t('prep.tilt.opens', { floor: T.floor })}</p>`}` },
      h('span', {}, `${T.kind === 'challenge' ? '⚠' : '✚'} ${T.name}`), h('span', { class: 'dim', text: `${T.kind === 'challenge' ? '+' : '−'}${T.mult}` }), tg);
    return { k, el, tg }; });
  tiltBox.append(...rows.map((r) => r.el));
  // sitting down starts the bout; getting up goes back to the floor (both always in view, at the foot of the page)
  const go = btn(t('prep.sit'), () => { if (P.worth() < 1) return toast(t('prep.needChip'), 'warn'); R.rememberSeat(run); app.nav.bout(R.startTable(run, prep)); }, t('prep.sit.tip'), 'big go');
  const up = btn(t('prep.getup'), () => app.nav.hub(), t('prep.back.tip'), 'big');
  function sync() {
    H.update();
    const m = R.multiplier(run, prep), worth = P.worth(), wager = Math.max(0, run.purse - worth);
    tween(multEl, m, (n) => `×${n.toFixed(2)}`, 400); tween(posEl, worth, cents, 300); tween(wagerEl, wager, cents, 300); const extra = R.tiltPay({ tiltNet: R.tiltNet(prep), opp }) + Math.round(R.chipStake(run.plan.resist) * (m - 1));
    tween(winEl, Math.max(0, Math.round(wager * m) + extra), cents, 400);
    for (const r of rows) { const on = !!prep.tilts[r.k]; swapText(r.tg, t(on ? 'prep.on' : 'prep.off')); r.tg.classList.toggle('on', on); r.tg.classList.toggle('off', prep.dd || !R.tiltOpen(run, r.k)); r.el.classList.toggle('lit', on); }
    ddBtn.classList.toggle('on', prep.dd); ddBtn.classList.toggle('gone', !(kind === 'table' && fs.lastWin));
  }
  root.append(H.el, h('div', { class: 'page prep-page' },
    h('div', { class: 'prep-main' },
      h('div', { class: 'col' }, h('div', { class: 'box' }, P.el),
        h('div', { class: 'box col' }, h('div', { class: 'row between' }, h('span', { class: 'cap', guide: 'prep:tilts', tip: t('prep.tilts.tip'), text: t('prep.tilts') }), ddBtn), tiltBox)),
      h('div', { class: 'col' }, oppPanel(opp))),
    h('div', { class: 'box prep-bar', guide: 'wager', tip: t('prep.wager.tip', { base: D.TUNING.wager.base, boss: D.TUNING.wager.boss }) },
      h('div', { class: 'row', style: { gap: '22px', alignItems: 'baseline' } }, h('span', { class: 'cap', text: t('prep.wager.mult') }), multEl,
        h('span', { class: 'line' }, h('span', { text: t('prep.wager.pos') }), posEl), h('span', { class: 'line' }, h('span', { text: t('prep.wager.amt') }), wagerEl), h('span', { class: 'line' }, h('span', { text: t('prep.wager.pays') }), winEl)),
      h('div', { class: 'row' }, h('span', { class: 'sub', text: t('prep.lose') }), up, go))));
  P.update();
}

// ---------- settlement ----------
export function resultScene(root, ctx, res) {
  const run = app.run, win = res.win, opp = ctx.opp;
  const lines = h('div', { class: 'list' }), totalEl = h('span', { class: 'total num' }), newsEl = h('ul', { class: 'news list' });
  const special = ['intro', 'bouncer', 'lounge', 'ascent'].includes(ctx.kind);
  const cont = btn(t('title.continue'), () => next(), null, 'big go off');
  const prizeBox = h('div', { class: 'cols3 fade-t' }); let choice = null, picks = [], claimed = !res.prizes;
  const left = h('div', { class: 'col', style: { width: res.prizes ? '430px' : '560px' } },
    h('h1', { text: special ? t(`result.head.${ctx.kind}.${win ? 'win' : 'lose'}`) : win ? t('result.head.win', { name: opp.name }) : t('result.head.lose') }), h('p', { class: 'sub', text: win ? t(res.sm.timeout ? 'result.settled.last' : 'result.settled', { n: res.sm.turns }) : D.FLOORS[run.floor]?.line && !['intro', 'bouncer'].includes(ctx.kind) ? t('result.deserve') : t('result.again') }),
    h('div', { class: 'box' }, lines, h('div', { class: 'row between', style: { marginTop: '10px' } }, h('span', { class: 'cap', text: t('result.purse') }), totalEl)), newsEl, h('div', { class: 'row' }, cont));
  root.append(h('div', { class: 'page', style: { top: 0, display: 'flex', gap: '24px', justifyContent: 'center', alignItems: 'center' } }, left, res.prizes ? h('div', { class: 'col', style: { width: '700px' } }, h('h2', { text: t('result.prize') }), h('p', { class: 'sub', text: t('result.prize.sub', { amt: cents(res.winnings) }) }), prizeBox, h('div', { class: 'row' }, h('span', { class: 'grow' }), claimBtn())) : null));

  function claimBtn() { const b = btn(t('result.claim'), () => { if (claimed) return; claimed = true; R.claimPrize(run, ctx, res, choice, picks); tween(totalEl, run.purse, cents, 900); prizeBox.classList.add('off'); b.classList.add('off'); cont.classList.remove('off'); toast(t('result.claimed')); }, null, 'go off'); claimBtn.el = b; return b; }
  const need = () => (choice === 'dice' ? 2 : 1);
  function renderPrizes() {
    const P = res.prizes, offers = [
      { k: 'die', title: t('result.prize.die'), sub: t('result.prize.die.sub', { amt: cents(R.prizeBonus(ctx)) }), kind: 'dice' },
      { k: 'dice', title: t('result.prize.dice'), sub: t('result.prize.dice.sub'), kind: 'dice' },
      { k: 'glean', title: t('result.prize.glean'), sub: t('result.prize.glean.sub'), kind: 'tricks' }];
    syncList(prizeBox, offers, (o) => o.k, (o) => { const opts = h('div', { class: 'row wrap', style: { minHeight: '38px' } });
      const el = h('div', { class: 'pick-card', onclick: () => { if (claimed || choice === o.k) return; choice = o.k; picks = []; renderPrizes(); } }, h('h3', { text: o.title }), h('p', { class: 'sub', text: o.sub }), opts);
      (o.kind === 'dice' ? P.dice : P.tricks).forEach((x, i) => { const e = o.kind === 'dice' ? dieEl(x) : trickTag(x, run.cls); if (o.kind === 'dice') { e._tip = () => dieTip(x); e.classList.add('has-tip'); } e.classList.add('clickable'); e.style.transition = 'transform .3s, box-shadow .3s, opacity .3s';
        e.onclick = (ev) => { if (claimed) return; ev.stopPropagation(); if (choice !== o.k) { choice = o.k; picks = []; } const at = picks.indexOf(i); if (at >= 0) picks.splice(at, 1); else { if (picks.length >= need()) picks.shift(); picks.push(i); } renderPrizes(); }; e._i = i; opts.append(e); });
      el._opts = opts; return el; },
    (el, o) => { el.classList.toggle('sel', choice === o.k); for (const e of el._opts.children) { const on = choice === o.k && picks.includes(e._i); e.style.transform = on ? 'translateY(-5px) scale(1.12)' : ''; e.style.boxShadow = on ? '0 0 0 3px var(--gold)' : ''; e.style.opacity = choice && choice !== o.k ? 0.45 : 1; } });
    if (!claimed) { tween(totalEl, res.base + res.winnings + (choice === 'die' ? R.prizeBonus(ctx) : 0) + betPay, cents, 500); claimBtn.el?.classList.toggle('off', !choice || picks.length !== need()); }
  }
  const betPay = res.prizes ? run.purse - ctx.committed - ctx.wager : 0;
  async function reveal() {
    const shown = [];
    for (const [label, amt] of res.lines) { shown.push({ label, amt, k: shown.length });
      syncList(lines, shown, (l) => l.k, (l) => h('div', { class: 'line' }, h('span', { text: l.label }), h('span', { class: `amt ${l.amt > 0 ? 'pos' : l.amt < 0 ? 'neg' : ''}`, text: l.amt ? `${l.amt > 0 ? '+' : '−'}${cents(Math.abs(l.amt))}` : '' }))); await wait(170); }
    tween(totalEl, res.prizes ? res.base + res.winnings + betPay : run.purse, cents, 900);
    syncList(newsEl, res.news.map((text, k) => ({ text, k })), (n) => n.k, (n) => h('li', { text: n.text }));
    if (run.fs && !reveal.done) { reveal.done = true; run.news.push(...res.news); }
    if (res.prizes) renderPrizes(); else cont.classList.remove('off');
  }
  function next() {
    if (!claimed) return;
    if (run.purse > D.PURSE_LIMIT) { run.phase = 'ripped'; return app.nav.summary(); } // the purse rips
    if (ctx.kind === 'intro') { if (!win) return app.nav.intro(); const f = R.startFloor(run); if (f <= 1) { R.enterFloor(run, 1); return app.nav.hub(); }
      // a pass kept from the last run takes you past the floor checks: up to its floor, or start at the bottom anyway
      const go = (to) => { closePanel(true); R.enterFloor(run, to); app.nav.hub(); };
      const ups = R.passesOf(run).filter((x) => x > 1); // each pass held is a floor the elevator can take you to
      return openPanel(h('div', { class: 'col' }, h('h2', { text: t('result.pass', { name: ups.map((x) => D.PASSES[x].name).join(', ') }) }), h('p', { class: 'sub', text: t('result.pass.sub', { n: ups.length, floor: D.FLOORS[f].name }) }),
        h('div', { class: 'row wrap' }, ...ups.map((x, i) => btn(t('result.pass.up', { floor: D.FLOORS[x].name }), () => go(x), null, i ? '' : 'go')), btn(t('result.pass.bottom', { floor: D.FLOORS[1].name }), () => go(1)))), { modal: true }); }
    if (ctx.kind === 'bouncer') { if (!win) return app.nav.bouncer(); R.enterFloor(run, 1); return app.nav.hub(); }
    if (ctx.kind === 'lounge') return app.nav.hub();
    if (ctx.kind === 'ascent') return run.phase === 'ascent' ? app.nav.ascent() : app.nav.summary();
    if (ctx.kind === 'boss' && win) { const to = R.nextAfterBoss(run); if (to === 'floor') { R.enterFloor(run, run.floor + 1); return app.nav.hub(); } return app.nav.suite(to === 'penthouse'); }
    if (!win && R.brokeHint(run)) toast(R.brokeHint(run), 'warn');
    app.nav.hub();
  }
  totalEl._v = ctx.kind === 'intro' ? 0 : ctx.kind === 'bouncer' ? run.purse : res.prizes ? ctx.committed + ctx.wager + betPay : undefined; totalEl.textContent = cents(totalEl._v ?? run.purse);
  setTimeout(reveal, 550);
  void trickTip;
}
