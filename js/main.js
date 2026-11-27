// Entry point: boots the stage, owns navigation between screens.
import { h, fit, initTips, go as show, btn, toast, closePanel, openPanel, guided, watchText } from './ui/core.js';
import { walletLook, jacketLook, drinkLook } from './content/finishes.js';
import { app } from './ui/app.js';
import { jacketTip } from './ui/parts.js';
import { hubScene } from './ui/floor.js';
import { prepScene, resultScene } from './ui/prep.js';
import { suiteScene, giftScene, ascentScene, summaryScene, alleyScene, walletTip } from './ui/endgame.js';
import { boutScene } from './ui/boutview.js';
import { openLibrary } from './ui/library.js';
import { initSpin } from './ui/spin.js';
import { initMusic, boutMusic, endBoutMusic, titleMusic, prefetchLoops } from './ui/music.js';
import { initSfx, prefetchSfx } from './ui/sfx.js';
import { pacer } from './ui/idle.js';
import { FONTS } from './content/assets.js';
import { buildScene } from './ui/build.js';
import { loadDraft } from './build/draft.js';
import * as D from './data.js';
import { startCard } from './ui/rollercard.js';
import { titleSign } from './ui/titlesign.js';
import { initThings } from './ui/thing.js';
import * as B from './bout.js';
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
  titleMusic(true); // the band plays the theme out front
  const meta = app.meta = R.loadMeta(), saved = R.loadRun();
  const resume = saved && ['floor', 'ascent'].includes(saved.phase);
  // drifting neon motes; positions are fixed per load so the scene is calm, not noisy
  const motes = Array.from({ length: 26 }, (_, i) => h('span', { class: 'mote', style: { left: `${(i * 37 + 11) % 100}%`, '--mc': i % 3 ? 'var(--gold)' : 'var(--pink)', '--d': `${7 + (i * 13) % 9}s`, '--w': `${-((i * 7) % 12)}s`, '--dx': `${((i * 29) % 120) - 60}px` } }));
  // the sign lights tube by tube; left alone a while (no pointer or key for TITLE_IDLE) it goes dark and lights again
  const S = titleSign({ label: t('boot.name') }), sign = S.el; sign.tip = t('title.sign.tip'); S.light();
  warmth.steady = () => S.steady() && !document.querySelector('.panel, .modal'); // (and nothing open over it)
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
      btn(t('title.library'), () => ready().then(() => openLibrary(null, { title: true })), t('title.library.tip'), 'sign-btn'),
      btn(t('title.build'), () => nav.build(), t('title.build.tip'), 'sign-btn p'),
      devToggle()),
    h('div', { class: 'stats records' },
      [[t('title.rec.runs'), meta.runs, t('title.rec.runs.tip')], [t('title.rec.best'), meta.best > 4 ? t('title.rec.ascent') : meta.best || '—', t('title.rec.best.tip')], [t('title.rec.crowns'), meta.crowns, t('title.rec.crowns.tip')], [t('title.rec.jackets'), meta.jackets.length, t('title.rec.jackets.tip')], [t('title.rec.wallets'), (meta.wallets || []).length, t('title.rec.wallets.tip')], [t('title.rec.atm'), cents(meta.atm), t('title.rec.atm.tip')]]
        .map(([a, b, t]) => h('span', { class: 'stat', tip: `<b>${a}</b><p>${t}</p>` }, h('em', { text: a }), h('b', { text: b }))))));
  root.append(scene);
  let idle = 0; const wake = () => { clearTimeout(idle); idle = setTimeout(() => { if (!sign.isConnected) return; S.off(() => { S.light(); wake(); }); }, TITLE_IDLE); };
  for (const ev of ['pointermove', 'pointerdown', 'keydown', 'wheel']) scene.addEventListener(ev, wake, { passive: true });
  wake();
  // make the game ready behind the title: the heavy things from the first frame on, the sounds once the sign has begun to light
  if (!noCurtain()) requestAnimationFrame(() => setTimeout(warm, 0)); setTimeout(idleLoad, 900);
}
const TITLE_IDLE = 40000;

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

// The heavy things (every die in every material, every material's shaders, every wallet's and jacket's body) are made
// ready once. While the title is up they are made behind it, a piece at a time, each only when the sign is lit and
// steady and the player is not touching anything (ui/idle.js): what moves on the title then is drawn off the main
// thread, so nothing is seen of it, and a player who lingers never sees a loading bar. One who leaves the title
// before it is done sees the bar for what is left: the title stays as it is, its menu gives way to the bar, the rest
// is made at full speed, and they go on when it is done. ?curtain=0 skips all of it (automated playthroughs): things
// are then built as they are met.
const warmth = { p: null, pacer: null, x: 0, line: 'boot.dice', done: false, show: null, wait: null, steady: null }; // steady(): may work go on behind the screen now (the title's sign says)
const noCurtain = () => new URLSearchParams(location.search).get('curtain') === '0' || globalThis.RP_FAST;
function warm() {
  if (warmth.p) return warmth.p;
  const P = warmth.pacer = pacer({ steady: () => !!warmth.steady?.() }), at = (from, share) => (x) => { warmth.x = from + x * share; warmth.show?.(); };
  return (warmth.p = (async () => {
    // (the renderer itself, the one piece too big for an idle moment, starts here: as the title first appears, before its sign has lit)
    try { const [M3, G3] = await Promise.all([import('./ui/dice3d.js'), import('./ui/gear3d.js')]);
      await M3.preload(at(0, 0.6), { pace: P.pace }); warmth.line = 'boot.gear'; warmth.show?.();
      await G3.prepare([...Object.entries(D.WALLETS).map(([id, W]) => ({ kind: 'wallet', look: walletLook(id, W) })), ...Object.entries(D.JACKETS).map(([id, J]) => ({ kind: 'jacket', look: jacketLook(id, J) })), ...D.DRINKS.map((d) => ({ kind: 'drink', look: drinkLook(d) }))], at(0.6, 0.4), P.pace);
    } catch { /* no renderer: the drawn looks stand */ }
    warmth.done = true; warmth.x = 1; warmth.line = 'boot.ready'; warmth.show?.();
  })());
}
// the title's idle time: the heavy things, and (fetched only, at low priority, one at a time) the sounds the first
// table will want: the sound effects' samples and the first loop's layers. Fonts every sign may ask for come too.
let idled = false;
function idleLoad() {
  if (idled || noCurtain()) return; idled = true;
  const saved = R.loadRun(), floor = saved?.phase === 'ascent' ? D.ASCENT_FLOOR : Math.min(4, Math.max(1, saved?.floor || 1));
  prefetchSfx().then(() => prefetchLoops(floor)).catch(() => {});
  for (const F of Object.values(FONTS)) document.fonts?.load?.(`16px "${F.family}"`).catch(() => {});
}
function ready() {
  if (noCurtain()) return (warmth.p ||= Promise.resolve());
  const p = warm(); if (warmth.done) return p;
  if (warmth.wait) return warmth.wait; // (already waiting on it: one bar)
  const bar = h('i'), line = h('div', { class: 'load-line' }), el = h('div', { class: 'title-load' }, h('div', { class: 'load-bar' }, bar), line);
  const inner = document.querySelector('.title .inner'); inner?.classList.add('loading'); inner?.append(el);
  warmth.show = () => { bar.style.width = `${Math.round(warmth.x * 100)}%`; line.textContent = t(warmth.line); }; warmth.show();
  warmth.pacer.hurry(); // the player is waiting now: the rest at full speed
  return (warmth.wait = p.then(async () => {
    await new Promise((r) => setTimeout(r, 180));
    el.remove(); inner?.classList.remove('loading'); warmth.show = null; // (the title may still be the scene: the Library opens over it, and its menu must be there on the way back)
  }));
}
// every way off the title waits on it (the theme plays on while you choose who walks in, then gives way to the lounge's set)
const go = (scene) => (scene === titleScene ? show(scene) : ready().then(() => { if (scene !== selectScene) titleMusic(false); return show(scene); }));
window.addEventListener('resize', fit);
loadDraft(); // your build-mode changes, live in this browser
fit(); initTips(); watchText(); initSpin(); initThings(); initMusic(document.getElementById('stage'), { run: () => app.run, tip: (what, title) => R.tipBand(app.run, what, title) }); initSfx(document.getElementById('stage'));
app.meta = R.loadMeta();
nav.title();
if (new URLSearchParams(location.search).has('debug')) window.RP = { app, R, D, nav, B, warmth };
