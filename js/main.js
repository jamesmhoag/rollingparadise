// Entry point: boots the stage, owns navigation between screens.
import { h, fit, initTips, go, btn, toast, closePanel, openPanel, guided } from './ui/core.js';
import { app } from './ui/app.js';
import { jacketTip } from './ui/parts.js';
import { hubScene } from './ui/floor.js';
import { prepScene, resultScene } from './ui/prep.js';
import { suiteScene, giftScene, ascentScene, summaryScene, alleyScene, walletTip } from './ui/endgame.js';
import { boutScene } from './ui/boutview.js';
import { openLibrary } from './ui/library.js';
import { initSpin } from './ui/spin.js';
import { initMusic, boutMusic, endBoutMusic } from './ui/music.js';
import { initSfx } from './ui/sfx.js';
import { buildScene } from './ui/build.js';
import { loadDraft } from './build/draft.js';
import * as D from './data.js';
import { startCard } from './ui/rollercard.js';
import { devOn, setDev } from './ui/dev.js';
import * as R from './run.js';
import { cents } from './util.js';
import { t } from './text.js';

const nav = app.nav;
nav.title = () => go(titleScene);
nav.select = () => go(selectScene);
nav.build = (o) => go((root) => buildScene(root, o));
// the test table: a throwaway bout from Build mode, back to Build when you leave; nothing touches your run
nav.test = (o) => { const { bout, ctx } = R.testTable(o); if (window.RP) window.RP.bout = bout; boutMusic(bout, musicAt(ctx)); go((root) => boutScene(root, bout, ctx, () => { endBoutMusic(); nav.build({ tool: 'test' }); })); };
nav.hub = () => go(hubScene);
nav.prep = (kind, idx) => go((root) => prepScene(root, kind, idx));
// the bout music: the floor's table loop, or its High Roller's (the Ascent is floor 5, its last climb the boss);
// a drink in the lounge keeps the lounge band
function musicAt(ctx) {
  const run = app.run, asc = ctx.kind === 'ascent', floor = asc ? D.ASCENT_FLOOR : Math.min(4, Math.max(1, run?.floor || 1));
  const boss = ctx.kind === 'boss' || (asc && run?.ascent && run.ascent.step >= run.ascent.ladder.length - 1);
  const place = asc ? t('music.ascent') : D.FLOORS[floor].name;
  return { floor, boss, where: boss ? t('music.highRoller', { place }) : place };
}
nav.bout = ({ bout, ctx }) => go((root) => { if (window.RP) window.RP.bout = bout; if (ctx.kind !== 'lounge') boutMusic(bout, musicAt(ctx)); boutScene(root, bout, ctx, () => { endBoutMusic(); const res = R.settle(app.run, ctx, bout); go((r) => resultScene(r, ctx, res)); }); });
// a bout already decided (developer mode's Clear and Lose): straight to its settlement
nav.result = ({ bout, ctx }) => { const res = R.settle(app.run, ctx, bout); go((r) => resultScene(r, ctx, res)); };
nav.intro = () => nav.bout(R.startIntro(app.run));
nav.bouncer = () => nav.bout(R.startBouncer(app.run));
nav.lounge = (drinkId) => nav.bout(R.startLounge(app.run, drinkId));
nav.suite = (penthouse) => go((root) => suiteScene(root, penthouse));
nav.gift = () => go(giftScene);
nav.ascent = () => { R.saveRun(app.run); go(ascentScene); };
nav.summary = () => go(summaryScene);
nav.alley = () => go(alleyScene);

// coming back to a saved run without the pass for your floor: the Bouncer stops you at the door
function bouncerPanel(run) {
  openPanel(h('div', { class: 'col' }, h('h2', { text: t('bouncer.title') }),
    h('p', { class: 'sub', text: t('bouncer.text', { wallet: run.pass ? t('bouncer.passOnly', { pass: D.PASSES[run.pass].name }) : t('bouncer.noPass'), floor: D.FLOORS[run.floor].name }) }),
    h('div', { class: 'row' }, btn(t('bouncer.face'), () => { closePanel(true); nav.bouncer(); }, null, 'go'), btn(t('bouncer.later'), () => closePanel()))));
}
// who, where and how much, for the saved run
const runWhere = (run) => ({ who: D.heroName(run.cls, run.roller), where: run.phase === 'ascent' ? t('title.where.ascent') : t('title.where.floor', { floor: run.floor }), purse: cents(run.purse) });
// developer mode's switch, at the foot of the title menu
function devToggle() { const b = btn(t(devOn() ? 'title.dev.on' : 'title.dev.off'), () => { setDev(!devOn()); nav.title(); }, t('title.dev.tip'), `sign-btn dev-toggle ${devOn() ? 'on' : ''}`); return guided(b, 'dev'); }
function titleScene(root) {
  const meta = app.meta = R.loadMeta(), saved = R.loadRun();
  const resume = saved && ['floor', 'ascent'].includes(saved.phase);
  // drifting neon motes; positions are fixed per load so the scene is calm, not noisy
  const motes = Array.from({ length: 26 }, (_, i) => h('span', { class: 'mote', style: { left: `${(i * 37 + 11) % 100}%`, '--mc': i % 3 ? 'var(--gold)' : 'var(--pink)', '--d': `${7 + (i * 13) % 9}s`, '--w': `${-((i * 7) % 12)}s`, '--dx': `${((i * 29) % 120) - 60}px` } }));
  const sign = h('div', { class: 'sign', tip: t('title.sign.tip') }, h('div', { class: 'glow' }),
    h('img', { class: 'l-pink', src: D.IMAGES.logoPink, alt: '', draggable: 'false' }), h('img', { class: 'l-cyan', src: D.IMAGES.logoCyan, alt: 'Rolling Paradise', draggable: 'false' }), h('img', { class: 'l-dice', src: D.IMAGES.logoDice, alt: '', draggable: 'false' }));
  // the sign lights one of two ways, by the flip of a chip; whichever did not open the title plays once when it has
  // sat idle a while (no pointer or key for TITLE_IDLE). ?title=parts or ?title=whole in the address picks one.
  const asked = new URLSearchParams(location.search).get('title'), byParts = asked ? asked === 'parts' : Math.random() < 0.5;
  if (byParts) lightByParts(sign);
  const scene = h('div', { class: 'title' }, h('div', { class: 'sky' }), h('div', { class: 'gridfloor' }), ...motes, h('div', { class: 'inner' },
    h('div', { class: 'hotel neon-c', text: t('title.hotel') }), sign,
    h('p', { class: 'tagline neon-p', text: t('title.tagline') }),
    h('div', { class: 'menu' },
      resume ? btn(t('title.continue'), () => { app.run = saved; if (R.needsBouncer(saved)) return bouncerPanel(saved); saved.phase === 'ascent' ? nav.ascent() : nav.hub(); }, t('title.continue.tip', runWhere(saved)), 'sign-btn') : null,
      btn(t('title.new'), () => (resume ? openPanel(h('div', { class: 'col' }, h('h2', { text: t('title.new.confirm') }),
        h('p', { text: t('title.new.inProgress', runWhere(saved)) }),
        h('p', { class: 'sub', text: t('title.new.warn') }),
        h('div', { class: 'row' }, btn(t('title.new.keep'), () => closePanel(), null, 'go'), btn(t('title.new.over'), () => { R.clearRun(); closePanel(true); nav.select(); }, null, 'danger')))) : nav.select()), resume ? t('title.new.tip') : null, resume ? 'sign-btn p' : 'sign-btn'),
      btn(t('title.howto'), () => howTo(), null, 'sign-btn p'),
      btn(t('title.library'), () => openLibrary(null, { title: true }), t('title.library.tip'), 'sign-btn'),
      btn(t('title.build'), () => nav.build(), t('title.build.tip'), 'sign-btn p'),
      devToggle()),
    h('div', { class: 'stats records' },
      [[t('title.rec.runs'), meta.runs, t('title.rec.runs.tip')], [t('title.rec.best'), meta.best > 4 ? t('title.rec.ascent') : meta.best || '—', t('title.rec.best.tip')], [t('title.rec.crowns'), meta.crowns, t('title.rec.crowns.tip')], [t('title.rec.jackets'), meta.jackets.length, t('title.rec.jackets.tip')], [t('title.rec.wallets'), (meta.wallets || []).length, t('title.rec.wallets.tip')], [t('title.rec.atm'), cents(meta.atm), t('title.rec.atm.tip')]]
        .map(([a, b, t]) => h('span', { class: 'stat', tip: `<b>${a}</b><p>${t}</p>` }, h('em', { text: a }), h('b', { text: b }))))));
  root.append(scene);
  let idle = 0; const wake = () => { clearTimeout(idle); idle = setTimeout(() => { if (!sign.isConnected) return; for (const ev of ['pointermove', 'pointerdown', 'keydown', 'wheel']) scene.removeEventListener(ev, wake);
    byParts ? relight(sign) : switchOff(sign, () => lightByParts(sign)); }, TITLE_IDLE); };
  for (const ev of ['pointermove', 'pointerdown', 'keydown', 'wheel']) scene.addEventListener(ev, wake, { passive: true });
  wake();
}
// The title sign's two ways of lighting. All at once: the pink tube, then the cyan, then the dice strike on (style.css
// .sign .l-*). A tube at a time: ROLLING letter by letter, one die then the other, Paradise's letters but the s, then
// the s with the swash and the palm's trunk as one stroke, then the fronds one by one (D.TITLE_PARTS, cut from the
// same three images, so the lit sign is the same picture either way).
const TITLE_IDLE = 40000;
function lightByParts(sign) {
  sign.querySelector('.tparts')?.remove(); sign.classList.remove('lit', 'off'); sign.classList.add('by-parts');
  // the pause before each part: a beat between the letters, longer where the sign moves on to the next piece
  const gap = (p) => (p.layer === 'dice' ? 0.42 : p.part === 'P' ? 0.45 : p.part === 'trunk' ? 0.32 : p.part === 'leaf1' ? 0.55 : /^leaf/.test(p.part) ? 0.17 : 0.21);
  const at = new Map(); let t = 0.3;
  D.TITLE_PARTS.forEach((p, i) => { if (p.with) return; if (i) t += gap(p); at.set(p.part, t); });
  const delay = (p) => at.get(p.with || p.part);
  // stacked as the three images are (pink under cyan under the dice); each strikes on at its own moment
  const order = ['pink', 'cyan', 'dice'], parts = [...D.TITLE_PARTS].sort((a, b) => order.indexOf(a.layer) - order.indexOf(b.layer));
  sign.append(h('div', { class: 'tparts' }, ...parts.map((p) => h('img', { class: `tp tp-${p.layer}${p.part === 'trunk' ? ' tp-long' : ''}`, src: p.src, alt: '', draggable: 'false', style: { animationDelay: `${delay(p).toFixed(2)}s` } }))));
  // once the last frond is on, the whole sign takes over (the same picture) and buzzes as it always does
  setTimeout(() => { if (!sign.isConnected) return; sign.classList.add('lit'); requestAnimationFrame(() => { sign.classList.remove('by-parts'); sign.querySelector('.tparts')?.remove(); }); }, (t + 0.8) * 1000);
}
// the whole sign buzzes out, then the next way of lighting it starts
function switchOff(sign, then) { sign.classList.add('off'); setTimeout(() => sign.isConnected && then(), 900); }
function relight(sign) { switchOff(sign, () => { sign.classList.remove('off', 'lit'); for (const img of sign.querySelectorAll(':scope > img')) { img.style.animation = 'none'; void img.offsetWidth; img.style.animation = ''; } }); }

function howTo() {
  const p = (t, s) => h('div', {}, h('h3', { text: t }), h('p', { class: 'sub', text: s }));
  openPanel(h('div', { class: 'col' }, h('div', { class: 'row between' }, h('h2', { text: t('howto.title') }), btn(t('howto.done'), () => closePanel(), null, 'small go')),
    p(t('howto.goal.title'), t('howto.goal.text')),
    p(t('howto.turn.title'), t('howto.turn.text')),
    p(t('howto.blind.title'), t('howto.blind.text')),
    p(t('howto.house.title'), t('howto.house.text')),
    p(t('howto.tricks.title'), t('howto.tricks.text')),
    p(t('howto.holdback.title'), t('howto.holdback.text')),
    p(t('howto.debt.title'), t('howto.debt.text')),
    p(t('howto.stage.title'), t('howto.stage.text')),
    p(t('howto.between.title'), t('howto.between.text')),
    p(t('howto.unclear.title'), t('howto.unclear.text'))));
}

function selectScene(root) {
  const meta = app.meta; let who = Object.keys(D.ROLLERS)[0], jacket = 'standard', wallet = meta.wallets.includes(meta.lastWallet) ? meta.lastWallet : 'worn_cloth';
  const cards = h('div', { class: 'cols3' }), jackets = h('div', { class: 'row wrap' });
  // each Roller you can walk in as: its name, its Class's attributes, and what it starts with
  const pickRoller = (rid) => { who = rid; const X = D.ROLLERS[rid]; if (X.jacket && meta.jackets.includes(X.jacket) && R.jacketFits(X.cls, X.jacket)) jacket = X.jacket; else if (!R.jacketFits(X.cls, jacket)) jacket = 'standard';
    if (X.wallet && meta.wallets.includes(X.wallet)) wallet = X.wallet; sync(); };
  const els = Object.entries(D.ROLLERS).filter(([, X]) => D.CLASSES[X.cls]).map(([rid]) => { const el = startCard(rid, () => pickRoller(rid));
    el._id = rid; return el; });
  cards.append(...els);
  const jb = meta.jackets.map((id) => { const b = guided(btn(`🧥 ${D.JACKETS[id].name}`, () => { jacket = id; sync(); }, () => { const K = D.CLASSES[D.ROLLERS[who].cls]; return jacketTip(id, { ...K.tip, ...K.c, ...K.bvd }) + `<p class="dim">${t('select.jacket.against', { cls: K.name })}</p>`; }, 'small'), 'jacket'); b._id = id; return b; });
  jackets.append(h('span', { class: 'cap', text: t('select.jacket') }), ...jb);
  const wb = meta.wallets.map((id) => { const b = guided(btn(`👛 ${D.WALLETS[id].name}`, () => { wallet = id; sync(); }, () => walletTip(id), 'small'), 'wallet'); b._id = id; return b; });
  const keptEl = h('span', { class: 'sub fade-t' });
  jackets.append(h('span', { class: 'cap', style: { marginLeft: '18px' }, text: t('select.wallet') }), ...wb, keptEl);
  function sync() { for (const el of els) el.classList.toggle('sel', el._id === who); for (const b of jb) b.classList.toggle('on', b._id === jacket); for (const b of wb) b.classList.toggle('on', b._id === wallet);
    const k = (meta.kept || []).slice(0, D.WALLETS[wallet].slots); keptEl.textContent = k.length ? t('select.kept', { cards: k.map((c) => D.CARDS[c].name).join(', ') }) : ''; }
  sync();
  root.append(h('div', { class: 'page', style: { top: 0, padding: '22px 40px' } }, h('div', { class: 'row between' }, h('div', {}, h('h1', { text: t('select.title') }), h('p', { class: 'sub', text: t('select.sub') })),
    h('div', { class: 'row' }, btn(t('select.back'), () => nav.title()), btn(t('select.walkIn'), () => { app.run = R.newRun(who, jacket, undefined, { wallet, kept: meta.kept, pass: meta.keptPass }); meta.kept = []; meta.keptPass = 0; meta.lastWallet = wallet; R.saveMeta(meta); nav.intro().then(() => { if (app.meta.seenHow) return toast(t('select.doorman')); app.meta.seenHow = true; R.saveMeta(app.meta); howTo(); }); }, t('select.walkIn.tip'), 'big go'))),
    h('div', { style: { marginTop: '16px' } }, cards), h('div', { style: { marginTop: '14px' } }, jackets)));
}

// The opening curtain: a full-screen drape with the hotel's sign while the dice are made ready (every size in every
// material, built once so the first close look at one does not stall), then it parts on the title. Any key or click
// parts it early; the rest of the dice are then built as they are met. ?curtain=0 skips it (automated playthroughs).
function curtain() {
  if (new URLSearchParams(location.search).get('curtain') === '0' || globalThis.RP_FAST) return;
  const bar = h('i'), line = h('div', { class: 'cur-line', text: t('boot.dice') });
  const el = h('div', { class: 'curtain' }, h('div', { class: 'cur-in' }, h('div', { class: 'cur-sub', text: t('title.hotel') }), h('div', { class: 'cur-name', text: t('boot.name') }), h('div', { class: 'cur-bar' }, bar), line));
  document.body.append(el);
  let open = false; const part = () => { if (open) return; open = true; el.classList.add('open'); setTimeout(() => el.remove(), 1400); removeEventListener('keydown', part); el.removeEventListener('pointerdown', part); };
  addEventListener('keydown', part); el.addEventListener('pointerdown', part);
  const t0 = performance.now();
  import('./ui/dice3d.js').then((M3) => M3.preload((x) => { bar.style.width = `${Math.round(x * 100)}%`; if (x >= 1) line.textContent = t('boot.ready'); }))
    .catch(() => {}).finally(() => setTimeout(part, Math.max(250, 900 - (performance.now() - t0)))); // never a flash: the drape hangs at least a moment
}
window.addEventListener('resize', fit);
loadDraft(); // your build-mode changes, live in this browser
curtain();
fit(); initTips(); initSpin(); initMusic(document.getElementById('stage'), { run: () => app.run, tip: (what, title) => R.tipBand(app.run, what, title) }); initSfx(document.getElementById('stage'));
app.meta = R.loadMeta();
nav.title();
if (new URLSearchParams(location.search).has('debug')) window.RP = { app, R, D, nav };
