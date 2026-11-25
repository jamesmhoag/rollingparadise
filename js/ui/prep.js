// Commitment before a bout (wager, tilts, position) and the settlement after it.
import { h, syncList, toast, btn, tween, wait, pulse, swapText, openPanel, closePanel, paint, guided } from './core.js';
import { sfx } from './sfx.js';
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
// A position drawn as it sits at the table: its spaces and real chip stacks (the same chips, sized and stacked as at the
// table: a stack's first chip centred in its space, each one above it a little higher; no numbers, hover for what is
// in a stack), and under each zone the same marks as at the table: which rows hold a chip (and what that earns in
// Charisma, Cunning and Conviction, focus included) and which columns are held (what the end of a turn restores).
// Yours faces the Stage on the right (Stake left, Bet right); theirs is mirrored. Keeps its elements between draws so
// chips scale on and off as the position changes. Any side-like { rows, cls, dims, grid } can be drawn.
export function positionView({ CH = 46, maxW = 400, mirror = false } = {}) {
  let CW = 48, rows = 0, side = null, SZ = 30, lift = 4;
  const board = h('div', { class: `mboard ${mirror ? 'mirror' : ''}`, style: { transition: 'width .45s cubic-bezier(.22,.8,.24,1)' } });
  const chips = new Map(), cells = new Map();
  const zone = (k) => { const z = { rows: h('span', { class: `zm-rows ${k}`, guide: k === 'bet' ? 'bet-meter' : 'stake-rows', tip: () => rowsTip(k) }), bonus: h('em', { class: 'zm-bonus' }),
    cols: h('span', { class: `zm-cols ${k}`, guide: 'restore', tip: () => colsTip(k) }) };
    z.el = h('div', { class: `zone-label ${k}` }, h('b', { text: t(`prep.label.${k}`), guide: 'position-label' }), z.rows, z.bonus, z.cols); z.el.style.transition = 'left .45s, width .45s'; return z; };
  const Z = { stake: zone('stake'), bet: zone('bet') }; board.append(Z.stake.el, Z.bet.el);
  const xOf = (r) => (mirror ? r : rows - 1 - r) * CW;
  const rowsTip = (k) => { if (!side) return ''; const o = B.occupancy(side), held = (k === 'bet' ? o.betRows : o.stakeRows).filter((x) => x.n > 0).length, pc = D.primaryC(side.cls);
    return `${t(k === 'bet' ? 'prep.meter.bet.tip' : 'prep.meter.stake.tip', { stat: D.STATS[pc]?.name || '' })}<p class="v">${t('prep.meter.rows', { n: held, of: side.dims.cols })}</p>`; };
  const colsTip = (k) => { if (!side) return ''; const o = B.occupancy(side); return t(k === 'bet' ? 'prep.meter.cols.bet' : 'prep.meter.cols.stake', { n: k === 'bet' ? o.betColsOcc : o.stakeColsOcc, of: (k === 'bet' ? o.betCols : o.stakeCols).length }); };
  function draw(sd) {
    side = sd; rows = sd.rows; const m = sd.dims.meterRows, C = sd.dims.cols, want = new Set(); CW = Math.max(30, Math.min(56, Math.floor(maxW / rows)));
    SZ = Math.round(Math.min((CW - 3) * 0.82, (CH - 3) * 0.74)); lift = Math.max(2, SZ / 8);
    board.style.width = `${rows * CW}px`; board.style.height = `${C * CH + 18}px`;
    for (let r = 0; r < rows; r++) for (let col = 0; col < C; col++) { const k = `${r}-${col}`; want.add(k); let ce = cells.get(k); const x = xOf(r), y = col * CH;
      if (!ce) { ce = h('div', { class: 'mcell', style: { height: `${CH - 3}px`, opacity: 0, transition: 'transform .45s cubic-bezier(.22,.8,.24,1), width .45s, opacity .4s, background-color .4s' } }); ce.style.transform = `translate(${x}px, ${y}px) scale(.6)`; board.prepend(ce); cells.set(k, ce); void ce.offsetWidth; }
      ce.classList.toggle('meter', r < m); ce.classList.toggle('alt', (r + col) % 2 === 1); ce.style.width = `${CW - 3}px`; ce.style.opacity = 1; ce.style.transform = `translate(${x}px, ${y}px)`;
      const stack = sd.grid[r][col].chips; ce._tip = stack.length ? () => t('prep.stack.tip', { n: stack.length, chips: stack.slice().reverse().map((ch) => chipGlyph(ch)).join(' · '), amt: cents(sum(stack, (ch) => (ch.kind === 'std' && !ch.resist ? ch.value : 0))) }) : null;
      ce.classList.toggle('has-tip', !!stack.length); }
    for (const [k, ce] of cells) if (!want.has(k)) { ce.style.opacity = 0; cells.delete(k); setTimeout(() => ce.remove(), 450); }
    const sw = (rows - m) * CW, bw = m * CW, yl = C * CH + 2;
    Object.assign(Z.stake.el.style, { left: mirror ? `${bw}px` : '0px', width: `${sw}px`, top: `${yl}px` }); Object.assign(Z.bet.el.style, { left: mirror ? '0px' : `${sw}px`, width: `${bw}px`, top: `${yl}px` });
    const seen = new Set();
    for (let r = 0; r < rows; r++) for (let col = 0; col < C; col++) sd.grid[r][col].chips.forEach((ch, lvl) => { const k = `${r}-${col}-${lvl}`, sig = chipSig(ch); seen.add(k); let e = chips.get(k);
      // as at the table: the first chip centred in its space, each one above it lifted a little
      const x = xOf(r) + (CW - 3 - SZ) / 2, y = col * CH + (CH - 3 - SZ) / 2 - Math.min(lvl, 12) * lift;
      if (!e) { e = h('div', { class: `chip ${SZ <= 20 ? 'xs' : 'sm'} ${sig}` }, h('i', { text: chipGlyph(ch) })); e.style.opacity = 0; e.style.transform = `translate(${x}px, ${y - 14}px) scale(.3)`; board.append(e); chips.set(k, e); void e.offsetWidth; }
      if (e._sig !== sig || e._sz !== SZ) { e._sig = sig; e._sz = SZ; e.className = `chip ${SZ <= 20 ? 'xs' : 'sm'} ${sig}`; e.firstChild.textContent = chipGlyph(ch); e.style.width = e.style.height = `${SZ}px`; }
      e.style.zIndex = 10 + col * 20 + lvl; e.style.opacity = 1; e.style.transform = `translate(${x}px, ${y}px)`; });
    for (const [k, e] of chips) if (!seen.has(k)) { const tf = e.style.transform.replace(/ scale\([^)]*\)/, ''); e.style.opacity = 0; e.style.transform = `${tf} scale(.2)`; chips.delete(k); setTimeout(() => e.remove(), 450); }
    // the marks under each zone, as at the table
    const o = B.occupancy(sd), ob = B.occBonus(sd, o), focus = ob.parts.find((x) => x.zone === 'focus');
    for (const k of ['bet', 'stake']) { const M = Z[k], rs = k === 'bet' ? o.betRows : o.stakeRows, cs = k === 'bet' ? o.betCols : o.stakeCols, al = k === 'bet' ? o.betAligned : o.stakeAligned, part = ob.parts.find((x) => x.zone === k);
      M.rows.replaceChildren(...rs.map((x) => h('i', { class: x.n > 0 ? 'on' : '' }))); M.rows.classList.toggle('full', !!part); M.rows.classList.toggle('aligned', al >= 0);
      swapText(M.bonus, part ? `+${part.n + (focus ? focus.n : 0)} ${part.keys.length > 1 ? t('table.zm-all') : D.STATS[part.keys[0]].name}` : '');
      M.cols.replaceChildren(...(mirror ? cs : cs.slice().reverse()).map((x) => h('i', { class: `${x.n > 0 ? 'on' : ''}${x.r === al ? ' al' : ''}` }))); }
  }
  // the space under a pointer: { r, c } in the side's rows, or null
  const at = (ev) => { if (!side) return null; const rect = board.getBoundingClientRect(), k = rect.width / board.offsetWidth, x = (ev.clientX - rect.left) / k, y = (ev.clientY - rect.top) / k;
    const i = Math.floor(x / CW), r = mirror ? i : rows - 1 - i, c = Math.floor(y / CH); return r < 0 || r >= rows || c < 0 || c >= side.dims.cols ? null : { key: `${r}-${c}`, r, c }; };
  return { board, draw, at };
}
// A side to draw from a painted Stake layout ([{ r, c, chips }], r from the front of the Stake): the Bet's rows empty
export function layoutSide(layout, dims, cls) {
  const m = dims.meterRows, rows = m + dims.barRows, grid = Array.from({ length: rows }, () => Array.from({ length: dims.cols }, () => ({ chips: [] })));
  for (const sp of layout || []) { if (sp.r < 0 || sp.r >= dims.barRows || sp.c < 0 || sp.c >= dims.cols) continue;
    grid[m + sp.r][sp.c].chips = sp.chips.slice(0, dims.stackMax).map((it) => (typeof it === 'number' ? { kind: 'std', value: it } : { kind: 'std', value: 1, resist: it })); }
  return { rows, cls, dims, grid };
}

// ---------- painting a Stake ----------
// One painter for every Stake in the game and in Build mode: a rack of chips beside the position (click one to paint
// with it), click a space to set it down (hold to stack, sweep to cover more), and the right button paints in
// reverse: click, hold or sweep to take top chips off. Restore and Clear sit above it.
// opts: items() the rack's chips (values, or effect chip ids) with left(it) how many are left (effect chips);
// canAdd(L, sp, it) → null or a warning; set(L) store; head: extra header elements
export function stakePainter({ dims, cls, layout, items, left = () => null, canAdd = () => null, set, done, onDraw, maxW = 400, CH = 46, title, head = [], pick }) {
  const V = positionView({ maxW, CH }), rack = h('div', { class: 'col rack' });
  let L = JSON.parse(JSON.stringify(layout || [])), warned = false;
  const brush = { it: pick?.get?.() ?? null };
  function drawRack() {
    const list = items(); if (!list.includes(brush.it)) brush.it = list[0]; pick?.set?.(brush.it);
    rack.replaceChildren(...list.map((it) => { const ch = typeof it === 'number' ? { kind: 'std', value: it } : { kind: 'std', value: 1, resist: it }, n = left(it);
      const b = guided(btn('', () => { brush.it = it; drawRack(); }, () => (typeof it === 'number' ? t('prep.brush.tip', { amt: cents(it) }) : `${chipTip(ch)}${n != null ? t('prep.brush.effect', { n }) : ''}`), `rack-chip ${brush.it === it ? 'on' : ''}`), 'brush');
      b.append(chipEl(ch)); if (n != null) b.append(h('small', { class: 'num', text: n })); return b; }));
  }
  const D0 = () => (typeof dims === 'function' ? dims() : dims);
  function redraw() { const d = D0(); L = L.filter((sp) => sp.chips.length); V.draw(onDraw?.(L) || layoutSide(L, d, cls)); drawRack(); // a rack of up to three columns beside the board; a longer one runs in rows above it
    const per = Math.max(1, Math.floor(parseFloat(V.board.style.height) / 46)), wide = rack.children.length > per * 3; rack.classList.toggle('wide', wide);
    rack.style.maxHeight = wide ? '' : V.board.style.height; if (api.el && wide !== (rack.parentNode === api.el)) { if (wide) api.el.insertBefore(rack, main); else main.prepend(rack); } }
  function apply(at, first, erase) {
    if (first) warned = false; const d = D0(), m = d.meterRows, warn = (msg) => { if (msg && !warned) toast(msg, 'warn'); warned = true; };
    if (at.r < m) return warn(t('prep.paint.bet'));
    const br = at.r - m; let sp = L.find((x) => x.r === br && x.c === at.c);
    if (erase) { if (!sp?.chips.length) return; sp.chips.pop(); sfx('undo'); }
    else { if (!sp) { sp = { r: br, c: at.c, chips: [] }; L.push(sp); }
      if (sp.chips.length >= d.stackMax) return warn(t('prep.stackFull'));
      const why = canAdd(L, sp, brush.it); if (why) return warn(why);
      sp.chips.push(brush.it); sfx('chip'); }
    L = L.filter((x) => x.chips.length); set(L); redraw();
  }
  paint(V.board, V.at, apply, 170, () => done?.(), { right: true });
  let main = null; const api = { get: () => L, put: (x) => { L = JSON.parse(JSON.stringify(x || [])); set(L); redraw(); done?.(); }, redraw };
  const clearBtn = btn(t('prep.clear'), () => api.put([]), t('prep.clear.tip'), 'small');
  main = h('div', { class: 'row', style: { alignItems: 'flex-start', gap: '12px' } }, rack, V.board);
  api.el = h('div', { class: 'col planner' }, h('div', { class: 'row between' }, h('div', { class: 'row' }, title ? h('h3', { text: title }) : null, ...head, clearBtn)), main, h('span', { class: 'sub', text: t('prep.paint.how') }));
  redraw(); return api;
}

// ---------- the position planner ----------
// Your Stake, painted by hand: it starts from the position you had last (your Roller's own, the first time) and you
// add to it or take from it before each bout. Restore puts back what you sat down with last time (as far as your purse
// goes now: filled from the bottom of each stack up); Clear takes everything off.
let brushPick = null; // the chip you paint with, kept between visits
export function planner(getExtra, onChange, { maxW = 400 } = {}) {
  const run = app.run, worthEl = h('b', { class: 'num gold-t' }), countEl = h('b', { class: 'num' });
  const K = D.CLASSES[run.cls], dims = () => R.rollerStats(run, getExtra()).dims;
  const usedOf = (L, k) => sum(L || [], (sp) => sp.chips.filter((x) => x === k).length);
  let warnedShort = false, P = null;
  // the first time there is nothing to start from: the House's own suggestion, laid out
  const layoutNow = (sd) => { const m = sd.dims.meterRows, out = []; for (let r = m; r < sd.rows; r++) for (let c = 0; c < sd.dims.cols; c++) { const chips = sd.grid[r][c].chips.filter((ch) => ch.kind === 'std' || ch.resist).map((ch) => (ch.resist ? ch.resist : ch.value)); if (chips.length) out.push({ r: r - m, c, chips }); } return out; };
  function autoLayout() { const d = dims(), saved = run.plan.layout; run.plan.layout = null; const sd = R.previewPosition(run, R.autoCounts(run, d), { position: getExtra().position, resist: {} }); run.plan.layout = saved; return layoutNow(sd); }
  if (!run.plan.layout) run.plan.layout = autoLayout();
  const restoreBtn = btn(t('prep.restore'), () => { const from = run.plan.sat || D.ROLLERS[run.roller]?.layout || null; P.put(from || autoLayout()); toast(t('prep.restored')); }, () => t('prep.restore.tip'), 'small');
  P = stakePainter({ dims, cls: run.cls, layout: run.plan.layout, maxW, title: t('prep.position'), head: [restoreBtn],
    pick: { get: () => brushPick, set: (v) => { brushPick = v; } },
    items: () => [...D.DENOMS.filter((x) => x.floor <= R.chipFloor(run)).map((x) => x.value), ...Object.keys(D.SHOP_CHIPS).filter((k) => R.owned(run, k) > 0)],
    left: (it) => (typeof it === 'number' ? null : R.owned(run, it) - usedOf(run.plan.layout, it)),
    canAdd: (L, sp, it) => { const d = dims(); if (typeof it === 'number' && R.planWorth(R.layoutCounts(L)) + it > run.purse) return t('prep.purseShort');
      if (typeof it !== 'number' && usedOf(L, it) >= R.owned(run, it)) return t('prep.noMore'); if (sum(L, (x) => x.chips.length) >= barCapacity(d)) return t('prep.stakeFull'); return null; },
    set: (L) => { run.plan.layout = L; },
    // what is drawn is the position as it will sit down: fitted to your purse and position, effect chips included
    onDraw: () => { const d = dims(), extra = getExtra();
      for (const k of Object.keys(run.plan.resist || {})) run.plan.resist[k] = Math.min(run.plan.resist[k] || 0, R.owned(run, k));
      const fitted = R.validLayout(run, d) || [];
      if (R.layoutWorth(fitted) < R.layoutWorth(run.plan.layout) && !warnedShort) { warnedShort = true; toast(t('prep.paintShort'), 'warn'); }
      run.plan.counts = R.layoutCounts(fitted);
      run.plan.resist = {}; for (const sp of fitted) for (const x of sp.chips) if (typeof x !== 'number') run.plan.resist[x] = (run.plan.resist[x] || 0) + 1;
      const side = R.previewPosition(run, run.plan.counts, { position: extra.position, resist: run.plan.resist });
      tween(worthEl, R.planWorth(run.plan.counts), cents, 300); tween(countEl, sum(fitted, (sp) => sp.chips.length), (n) => `${Math.round(n)}/${barCapacity(d)}`, 300);
      queueMicrotask(() => onChange?.()); return side; } });
  P.el.firstChild.append(h('span', { class: 'cap', guide: 'prep:deploy', tip: t('prep.deploy.tip', { name: K.name, from: t(`prep.deploy.at.${K.deploy === 'start' || K.deploy === 'end' ? K.deploy : 'mid'}`) }), text: t(`prep.deploy.${K.deploy === 'start' || K.deploy === 'end' ? K.deploy : 'mid'}`) }));
  P.el.append(h('div', { class: 'row wrap' }, h('span', { class: 'stat', tip: t('prep.worth.tip') }, h('em', { text: t('prep.worth') }), worthEl), h('span', { class: 'stat', tip: t('prep.capacity.tip') }, h('em', { text: t('prep.capacity') }), countEl)));
  return { el: P.el, update: () => P.redraw(), worth: () => R.planWorth(run.plan.counts) };
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
  const V = positionView({ CH: 34, maxW: 380, mirror: true }); if (sd) V.draw(sd);
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
