// Commitment before a bout (wager, tilts, position) and the settlement after it.
import { h, syncList, toast, btn, tween, wait, pulse, swapText } from './core.js';
import { app, hud, oppTip, trickTag, diceSummary } from './app.js';
import { chipEl, chipSig, chipGlyph, chipTip, dieEl, dieTip, statTip, trickTip, pips } from './parts.js';
import * as D from '../data.js';
import * as R from '../run.js';
import { barCapacity } from '../bout.js';
import { cents } from '../util.js';

// ---------- position planner ----------
// A live preview of the Bar. Chips scale on and off as the mix changes.
export function planner(getExtra, onChange) {
  const run = app.run, CH = 46, SZ = 24; let CW = 48;
  const board = h('div', { class: 'mboard', style: { transition: 'width .45s cubic-bezier(.22,.8,.24,1)', height: `${5 * CH + 16}px` } });
  const chips = new Map(), cells = new Map(), labels = [h('div', { class: 'mlabel', text: 'BAR' }), h('div', { class: 'mlabel', text: 'METER' })];
  board.append(...labels); for (const l of labels) { l.style.top = `${5 * CH + 3}px`; l.style.transition = 'left .45s, width .45s'; }
  const info = h('div', { class: 'row wrap' }), denomBox = h('div', { class: 'col list' }), resistBox = h('div', { class: 'col list' });
  const seg = (key, opts) => { const el = h('div', { class: 'seg' }, opts.map(([v, label, tipText]) => btn(label, () => { run.plan[key] = v; update(); }, tipText))); el._sync = () => [...el.children].forEach((b, i) => b.classList.toggle('on', run.plan[key] === opts[i][0])); return el; };
  const spacing = seg('spacing', [['row', 'By row', '<b>By row</b><p>Fill one row across before starting the next.</p>'], ['column', 'By column', '<b>By column</b><p>Fill one column front to back before starting the next.</p>'], ['random', 'Random', '<b>Random</b><p>Spaces are filled in a random order.</p>']]);
  const stacking = seg('stacking', [['maxed', 'Maxed', '<b>Maxed</b><p>Each space is stacked to its full height before the next is started. Fewer, taller stacks.</p>'], ['balanced', 'Balanced', '<b>Balanced</b><p>One chip per space in turn. Wide and shallow.</p>'], ['random', 'Random', '<b>Random</b><p>Every chip lands on a random open space.</p>']]);
  const worthEl = h('b', { class: 'num gold-t' }), countEl = h('b', { class: 'num' });
  const K = D.CLASSES[run.cls];
  const el = h('div', { class: 'col' },
    h('div', { class: 'row between' }, h('h3', { text: 'Your position' }), h('span', { class: 'cap', tip: `<b>${K.name} deployment</b><p>Your chips are dealt out starting from the ${K.deploy === 'start' ? 'front left' : K.deploy === 'end' ? 'back right' : 'middle'} of your Bar. Colourful chips go down first, at the base of each stack.</p>`, text: `Deploys from the ${K.deploy === 'start' ? 'front' : K.deploy === 'end' ? 'back' : 'centre'}` })),
    h('div', { class: 'row', style: { alignItems: 'flex-start', gap: '16px' } }, board, h('div', { class: 'col grow' }, denomBox, resistBox)),
    h('div', { class: 'row wrap' }, h('span', { class: 'cap', text: 'Spacing' }), spacing, h('span', { class: 'cap', text: 'Stacking' }), stacking),
    h('div', { class: 'row wrap' }, info, btn('Auto', () => { run.plan.counts = R.autoCounts(run, dims()); update(); }, '<b>Auto</b><p>Fill the Bar with the most valuable chips your purse affords, keeping some 1¢ chips to bid with.</p>', 'small'),
      btn('Clear', () => { run.plan.counts = { 1: 0, 2: 0, 5: 0, 10: 0 }; update(); }, null, 'small')));
  info.append(h('span', { class: 'stat', tip: '<b>Position worth</b><p>The chips you put in your Bar. This is what you can lose to fees and what you have to bid with.</p>' }, h('em', { text: 'On the table' }), worthEl),
    h('span', { class: 'stat', tip: '<b>Bar capacity</b><p>Bar rows × 5 spaces × stack height.</p>' }, h('em', { text: 'Chips' }), countEl));
  const dims = () => R.rollerStats(run, getExtra()).dims;
  const total = () => R.planCount(run.plan.counts, run.plan.resist);
  function change(fn) { fn(); update(); }
  function bump(v, n, ev) { const step = ev.shiftKey ? 10 : 1, c = run.plan.counts, cap = barCapacity(dims()); let k = step * n;
    if (n > 0) k = Math.min(k, cap - total(), Math.floor((run.purse - R.planWorth(c)) / v)); else k = -Math.min(-k, c[v]);
    if (!k) { toast(n > 0 ? (cap - total() <= 0 ? 'Your Bar is full.' : 'Your purse does not stretch that far.') : 'None of those to remove.', 'warn'); return; }
    change(() => { c[v] += k; }); }
  function update() {
    const d = dims(), extra = getExtra(); let c = run.plan.counts;
    for (const k of Object.keys(run.plan.resist)) run.plan.resist[k] = Math.min(run.plan.resist[k], run.chips[k]);
    if (!c || R.planWorth(c) > run.purse || total() > barCapacity(d)) { run.plan.resist = { burn: 0, shock: 0, acid: 0 }; c = run.plan.counts = R.autoCounts(run, d); }
    const side = R.previewPosition(run, c, { position: extra.position, resist: run.plan.resist });
    // cells
    const rows = side.rows, m = side.dims.meterRows, want = new Set(); CW = Math.max(34, Math.min(56, Math.floor(400 / rows))); board.style.width = `${rows * CW}px`;
    for (let r = 0; r < rows; r++) for (let col = 0; col < 5; col++) { const k = `${r}-${col}`; want.add(k); let ce = cells.get(k);
      const x = (rows - 1 - r) * CW, y = col * CH;
      if (!ce) { ce = h('div', { class: 'mcell', style: { height: `${CH - 3}px`, opacity: 0, transition: 'transform .45s cubic-bezier(.22,.8,.24,1), width .45s, opacity .4s, background-color .4s' } }); ce.style.transform = `translate(${x}px, ${y}px) scale(.6)`; board.prepend(ce); cells.set(k, ce); void ce.offsetWidth; }
      ce.classList.toggle('meter', r < m); ce.style.width = `${CW - 3}px`; ce.style.opacity = 1; ce.style.transform = `translate(${x}px, ${y}px)`; }
    for (const [k, ce] of cells) if (!want.has(k)) { ce.style.opacity = 0; cells.delete(k); setTimeout(() => ce.remove(), 450); }
    labels[0].style.left = '0px'; labels[0].style.width = `${(rows - m) * CW}px`; labels[1].style.left = `${(rows - m) * CW}px`; labels[1].style.width = `${m * CW}px`;
    // chips
    const seen = new Set();
    for (let r = 0; r < rows; r++) for (let col = 0; col < 5; col++) side.grid[r][col].chips.forEach((ch, lvl) => { const k = `${r}-${col}-${lvl}`, sig = chipSig(ch); seen.add(k); let e = chips.get(k);
      const x = (rows - 1 - r) * CW + (CW - 3 - SZ) / 2, y = col * CH + CH - 3 - SZ - 2 - lvl * 3;
      if (!e) { e = h('div', { class: `chip sm ${sig}` }, h('i', { text: chipGlyph(ch) })); e.style.opacity = 0; e.style.transform = `translate(${x}px, ${y - 14}px) scale(.3)`; board.append(e); chips.set(k, e); void e.offsetWidth; }
      if (e._sig !== sig) { e._sig = sig; e.className = `chip sm ${sig}`; e.firstChild.textContent = chipGlyph(ch); }
      e.style.zIndex = 10 + col * 20 + lvl; e.style.opacity = 1; e.style.transform = `translate(${x}px, ${y}px)`; });
    for (const [k, e] of chips) if (!seen.has(k)) { const t = e.style.transform.replace(/ scale\([^)]*\)/, ''); e.style.opacity = 0; e.style.transform = `${t} scale(.2)`; chips.delete(k); setTimeout(() => e.remove(), 450); }
    // controls
    const denoms = D.DENOMS.filter((x) => x.floor <= Math.max(1, Math.min(4, run.floor || 1)) || run.phase === 'ascent');
    syncList(denomBox, denoms, (x) => x.value, (x) => { const n = h('b', { class: 'num' }); const row = h('div', { class: 'row' }, chipEl({ kind: 'std', value: x.value }), h('span', { class: 'grow', text: `${x.value}¢ chips` }),
      h('div', { class: 'stepper' }, btn('−', (ev) => bump(x.value, -1, ev), null, 'small'), n, btn('+', (ev) => bump(x.value, 1, ev), null, 'small'))); row._n = n; row._tip = () => `${chipTip({ kind: 'std', value: x.value })}<p class="dim">Hold Shift to change by 10.</p>`; row.classList.add('has-tip'); return row; },
    (row, x) => tween(row._n, c[x.value] || 0, undefined, 250));
    const owned = Object.keys(D.RESIST).filter((k) => run.chips[k] > 0);
    syncList(resistBox, owned, (k) => k, (k) => { const n = h('b', { class: 'num' }); const row = h('div', { class: 'row' }, chipEl({ kind: 'std', value: 1, resist: k }), h('span', { class: 'grow' }),
      h('div', { class: 'stepper' }, btn('−', () => change(() => { run.plan.resist[k] = Math.max(0, run.plan.resist[k] - 1); }), null, 'small'), n,
        btn('+', () => { if (run.plan.resist[k] >= run.chips[k]) return toast('You have no more of those.', 'warn'); if (total() >= barCapacity(dims())) return toast('Your Bar is full.', 'warn'); change(() => { run.plan.resist[k]++; }); }, null, 'small'))); row._n = n; row._tip = () => chipTip({ kind: 'std', value: 1, resist: k }); row.classList.add('has-tip'); return row; },
    (row, k) => { row.children[1].textContent = `${D.RESIST[k].name}s (own ${run.chips[k]})`; tween(row._n, run.plan.resist[k], undefined, 250); });
    spacing._sync(); stacking._sync();
    tween(worthEl, R.planWorth(c), cents, 300); tween(countEl, total(), (n) => `${Math.round(n)}/${barCapacity(d)}`, 300);
    onChange?.();
  }
  return { el, update, worth: () => R.planWorth(run.plan.counts) };
}

function oppBox(opp, label) {
  return h('div', { class: 'box col', tip: () => oppTip(opp) }, h('span', { class: 'cap', text: label }), h('h2', { text: opp.name }),
    h('p', { class: 'sub', text: `${opp.title ? opp.title + ' · ' : ''}${D.CLASSES[opp.cls].name} · ${cents(opp.worth)} on the table` }),
    h('div', { class: 'stats' }, ['trickery', 'ingenuity', 'proficiency'].map((k) => h('span', { class: 'stat', tip: () => statTip(k, opp.tip[k]) }, h('em', { text: D.STATS[k].short }), h('b', { text: opp.tip[k] })))),
    h('p', { class: 'sub', text: diceSummary(opp.dice) }), h('div', { class: 'inv' }, opp.tricks.map((t) => trickTag(t, opp.cls))));
}

// ---------- commitment ----------
export function prepScene(root, kind, idx) {
  const run = app.run, fs = run.fs, entry = kind === 'boss' ? fs.boss : fs.tables[idx], opp = entry.opp, prep = R.newPrep(run, kind, idx);
  entry.seen = true;
  const H = hud(D.FLOORS[run.floor].name, kind === 'boss' ? 'Head table · High Roller' : `Table ${idx + 1} · ${entry.felt} felt`);
  const multEl = h('div', { class: 'mult num' }), wagerEl = h('b', { class: 'num gold-t' }), winEl = h('b', { class: 'num good' }), posEl = h('b', { class: 'num' });
  const tiltBox = h('div', { class: 'col' }), tierBox = h('div', { class: 'row wrap' });
  const P = planner(() => ({ position: prep.tilts.position }), sync);
  const ddBtn = btn('Double Down', () => { prep.dd = !prep.dd; if (prep.dd) for (const [k, T] of Object.entries(D.TILTS)) prep.tilts[k] = T.kind === 'challenge' ? Math.min(fs.lastWin.tilts[k] || 0, R.tiltCap(run, k)) : 0; P.update(); },
    '<b>Double Down</b><p>Only after a win. Doubles the wager multiplier (up to ×6) with the same Challenge tilts as your last bout and no Cheat tilts. Win it and the High Roller sees you next, and a Suite Key Card is yours.</p>');
  const rows = Object.entries(D.TILTS).map(([k, T]) => { const n = h('b', { class: 'num' });
    const minus = btn('−', () => { prep.tilts[k] = Math.max(0, prep.tilts[k] - 1); P.update(); }, null, 'small'), plus = btn('+', () => { if (prep.tilts[k] >= R.tiltCap(run, k)) return toast(R.tiltCap(run, k) ? 'That is every slot your unlocked tiers allow.' : `Unlock a ${T.kind} tier first.`, 'warn'); prep.tilts[k]++; P.update(); }, null, 'small');
    const el = h('div', { class: `tilt ${T.kind}`, tip: () => `<b>${T.name}</b> <span class="dim">${T.kind === 'challenge' ? 'Challenge tilt — raises the multiplier' : 'Cheat tilt — lowers the multiplier'}</span><p>${T.text}</p><p class="dim">Slots by tier: ${T.cap.join(' / ')}. Each slot is worth ${D.TILT_TIERS.map((t) => t.inc).join(' / ')} of multiplier by tier.</p>` }, h('span', {}, `${T.kind === 'challenge' ? '+' : '−'} ${T.name}`), h('div', { class: 'stepper' }, minus, n, plus));
    return { k, el, n, minus, plus }; });
  tiltBox.append(...rows.map((r) => r.el));
  const tierBtn = (tk) => { const b = btn('', () => { if (!R.unlockTier(run, tk)) { toast('You cannot afford that tier.', 'warn'); pulse(b, 'shake'); } P.update(); }, () => `<b>Unlock ${tk} tier ${fs.tiers[tk] + 1}</b><p>Opens more ${tk === 'challenge' ? 'Challenge' : 'Cheat'} tilt slots for the rest of this floor.</p>`, 'small'); return b; };
  const tb = { challenge: tierBtn('challenge'), cheat: tierBtn('cheat') }; tierBox.append(tb.challenge, tb.cheat);
  const go = btn('Sit down', () => { if (P.worth() < 1) return toast('Put at least one chip in your position.', 'warn'); app.nav.bout(R.startTable(run, prep)); }, '<b>Sit down</b><p>Starts the bout. Once you sit you cannot go back to the shops, and every chip not in your position is wagered.</p>', 'big go');

  function sync() {
    H.update();
    const m = R.multiplier(run, prep), worth = P.worth(), wager = Math.max(0, run.purse - worth);
    tween(multEl, m, (n) => `×${n.toFixed(2)}`, 400); tween(posEl, worth, cents, 300); tween(wagerEl, wager, cents, 300); tween(winEl, Math.round(wager * m), cents, 400);
    for (const r of rows) { tween(r.n, prep.tilts[r.k], undefined, 200); r.plus.classList.toggle('off', prep.dd || prep.tilts[r.k] >= R.tiltCap(run, r.k)); r.minus.classList.toggle('off', prep.dd || prep.tilts[r.k] <= 0); }
    for (const tk of ['challenge', 'cheat']) { const n = fs.tiers[tk], T = D.TILT_TIERS[n]; swapText(tb[tk], T ? `Unlock ${tk} tier ${n + 1} · ${cents(T[tk])}` : `${tk} tiers maxed`); tb[tk].classList.toggle('off', !T || run.purse < T[tk]); }
    ddBtn.classList.toggle('on', prep.dd); ddBtn.classList.toggle('gone', !(kind === 'table' && fs.lastWin));
  }
  tiltBox.className = 'tilts';
  root.append(H.el, h('div', { class: 'page', style: { display: 'grid', gridTemplateColumns: '1fr 290px', gap: '16px' } },
    h('div', { class: 'col' }, h('div', { class: 'box' }, P.el),
      h('div', { class: 'box col' }, h('div', { class: 'row between' }, h('span', { class: 'cap', tip: '<b>Tilts</b><p>Challenge tilts make the bout harder and raise your wager multiplier. Cheat tilts make it easier and lower it. Unlock a tier to open its slots; tiers last for the floor.</p>', text: 'Tilt the bout' }), tierBox), tiltBox)),
    h('div', { class: 'col' }, oppBox(opp, 'Across the table'),
      h('div', { class: 'box col', tip: `<b>Wager</b><p>Every chip you do not put in your position is wagered. Win and it comes back multiplied; lose and it is gone. Table bouts start at ×${D.WAGER_BASE}, High Rollers at ×${D.WAGER_BOSS}.</p>` },
        h('div', { class: 'row between' }, h('span', { class: 'cap', text: 'Wager multiplier' }), multEl),
        h('div', { class: 'line' }, h('span', { text: 'In your position' }), posEl), h('div', { class: 'line' }, h('span', { text: 'Wagered' }), wagerEl), h('div', { class: 'line' }, h('span', { text: 'Wager pays on a win' }), winEl)),
      ddBtn, go, btn('Back to the floor', () => app.nav.hub(), null, ''),
      h('p', { class: 'sub', text: 'Lose and you forfeit the position, the wager and two random dice.' }))));
  P.update();
}

// ---------- settlement ----------
export function resultScene(root, ctx, res) {
  const run = app.run, win = res.win, opp = ctx.opp;
  const lines = h('div', { class: 'list' }), totalEl = h('span', { class: 'total num' }), newsEl = h('ul', { class: 'news list' });
  const titles = { intro: win ? 'Welcome to the Royal Paradise' : 'Not yet', lounge: win ? 'Drinks are on them' : 'This round is on you', ascent: win ? 'One step higher' : 'The fall' };
  const cont = btn('Continue', () => next(), null, 'big go off');
  const prizeBox = h('div', { class: 'cols3 fade-t' }); let choice = null, picks = [], claimed = !res.prizes;
  const left = h('div', { class: 'col', style: { width: res.prizes ? '430px' : '560px' } },
    h('h1', { text: titles[ctx.kind] || (win ? `${opp.name} is broke` : 'You are broke') }), h('p', { class: 'sub', text: win ? `Settled after ${res.sm.turns} turn${res.sm.turns > 1 ? 's' : ''}${res.sm.timeout ? ' — last call' : ''}.` : D.FLOORS[run.floor]?.line && ctx.kind !== 'intro' ? 'Losing is not a reward. You lost; you deserve nothing.' : 'Sit back down and try again.' }),
    h('div', { class: 'box' }, lines, h('div', { class: 'row between', style: { marginTop: '10px' } }, h('span', { class: 'cap', text: 'Purse' }), totalEl)), newsEl, h('div', { class: 'row' }, cont));
  root.append(h('div', { class: 'page', style: { top: 0, display: 'flex', gap: '24px', justifyContent: 'center', alignItems: 'center' } }, left, res.prizes ? h('div', { class: 'col', style: { width: '700px' } }, h('h2', { text: 'Choose your prize' }), h('p', { class: 'sub', text: 'Pick one offer, then what you want from it.' }), prizeBox, h('div', { class: 'row' }, h('span', { class: 'grow' }), claimBtn())) : null));

  function claimBtn() { const b = btn('Claim', () => { if (claimed) return; claimed = true; R.claimPrize(run, ctx, res, choice, picks); tween(totalEl, run.purse, cents, 900); prizeBox.classList.add('off'); b.classList.add('off'); cont.classList.remove('off'); toast('Prize claimed.'); }, null, 'go off'); claimBtn.el = b; return b; }
  const need = () => (choice === 'dice' ? 2 : 1);
  function renderPrizes() {
    const P = res.prizes, offers = [
      { k: 'die', title: 'Winnings and a die', sub: `Keep the table winnings: ${cents(res.winnings)}. Take one of their dice.`, kind: 'dice' },
      { k: 'dice', title: 'Two dice', sub: 'Take two of their dice and leave the table winnings behind.', kind: 'dice' },
      { k: 'glean', title: 'Glean a trick', sub: 'Take no winnings and no dice. Learn one of their tricks.', kind: 'tricks' }];
    syncList(prizeBox, offers, (o) => o.k, (o) => { const opts = h('div', { class: 'row wrap', style: { minHeight: '38px' } });
      const el = h('div', { class: 'pick-card', onclick: () => { if (claimed || choice === o.k) return; choice = o.k; picks = []; renderPrizes(); } }, h('h3', { text: o.title }), h('p', { class: 'sub', text: o.sub }), opts);
      (o.kind === 'dice' ? P.dice : P.tricks).forEach((x, i) => { const e = o.kind === 'dice' ? dieEl(x) : trickTag(x, run.cls); if (o.kind === 'dice') { e._tip = () => dieTip(x); e.classList.add('has-tip'); } e.classList.add('clickable'); e.style.transition = 'transform .3s, box-shadow .3s, opacity .3s';
        e.onclick = (ev) => { if (claimed) return; ev.stopPropagation(); if (choice !== o.k) { choice = o.k; picks = []; } const at = picks.indexOf(i); if (at >= 0) picks.splice(at, 1); else { if (picks.length >= need()) picks.shift(); picks.push(i); } renderPrizes(); }; e._i = i; opts.append(e); });
      el._opts = opts; return el; },
    (el, o) => { el.classList.toggle('sel', choice === o.k); for (const e of el._opts.children) { const on = choice === o.k && picks.includes(e._i); e.style.transform = on ? 'translateY(-5px) scale(1.12)' : ''; e.style.boxShadow = on ? '0 0 0 3px var(--gold)' : ''; e.style.opacity = choice && choice !== o.k ? 0.45 : 1; } });
    if (!claimed) { tween(totalEl, res.base + (choice === 'die' || !choice ? res.winnings : 0) + betPay, cents, 500); claimBtn.el?.classList.toggle('off', !choice || picks.length !== need()); }
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
    if (ctx.kind === 'intro') { if (!win) return app.nav.intro(); R.enterFloor(run, 1); return app.nav.hub(); }
    if (ctx.kind === 'lounge') return app.nav.hub();
    if (ctx.kind === 'ascent') return run.phase === 'ascent' ? app.nav.ascent() : app.nav.summary();
    if (ctx.kind === 'boss' && win) { const to = R.nextAfterBoss(run); if (to === 'floor') { R.enterFloor(run, run.floor + 1); return app.nav.hub(); } return app.nav.suite(to === 'penthouse'); }
    if (!win && R.brokeHint(run)) toast(R.brokeHint(run), 'warn');
    app.nav.hub();
  }
  totalEl._v = ctx.kind === 'intro' ? 0 : res.prizes ? ctx.committed + ctx.wager + betPay : undefined; totalEl.textContent = cents(totalEl._v ?? run.purse);
  setTimeout(reveal, 550);
  void trickTip; void pips;
}
