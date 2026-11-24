// Entry point: boots the stage, owns navigation between screens.
import { h, fit, initTips, go, btn, toast, closePanel, openPanel, guided } from './ui/core.js';
import { app } from './ui/app.js';
import { statRow, jacketTip, dieEl, dieTip, trickTip } from './ui/parts.js';
import { hubScene } from './ui/floor.js';
import { prepScene, resultScene } from './ui/prep.js';
import { suiteScene, giftScene, ascentScene, summaryScene, alleyScene, walletTip } from './ui/endgame.js';
import { boutScene } from './ui/boutview.js';
import { openLibrary } from './ui/library.js';
import { initSpin } from './ui/spin.js';
import { initMusic } from './ui/music.js';
import { initSfx } from './ui/sfx.js';
import { buildScene } from './ui/build.js';
import { loadDraft } from './build/draft.js';
import * as D from './data.js';
import * as R from './run.js';
import { cents } from './util.js';
import { t } from './text.js';

const nav = app.nav;
nav.title = () => go(titleScene);
nav.select = () => go(selectScene);
nav.build = (o) => go((root) => buildScene(root, o));
// the test table: a throwaway bout from Build mode, back to Build when you leave; nothing touches your run
nav.test = (o) => { const { bout, ctx } = R.testTable(o); if (window.RP) window.RP.bout = bout; go((root) => boutScene(root, bout, ctx, () => nav.build({ tool: 'test' }))); };
nav.hub = () => go(hubScene);
nav.prep = (kind, idx) => go((root) => prepScene(root, kind, idx));
nav.bout = ({ bout, ctx }) => go((root) => { if (window.RP) window.RP.bout = bout; boutScene(root, bout, ctx, () => { const res = R.settle(app.run, ctx, bout); go((r) => resultScene(r, ctx, res)); }); });
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
const runWhere = (run) => ({ who: D.heroName(run.cls), where: run.phase === 'ascent' ? t('title.where.ascent') : t('title.where.floor', { floor: run.floor }), purse: cents(run.purse) });
function titleScene(root) {
  const meta = app.meta = R.loadMeta(), saved = R.loadRun();
  const resume = saved && ['floor', 'ascent'].includes(saved.phase);
  // drifting neon motes; positions are fixed per load so the scene is calm, not noisy
  const motes = Array.from({ length: 26 }, (_, i) => h('span', { class: 'mote', style: { left: `${(i * 37 + 11) % 100}%`, '--mc': i % 3 ? 'var(--gold)' : 'var(--pink)', '--d': `${7 + (i * 13) % 9}s`, '--w': `${-((i * 7) % 12)}s`, '--dx': `${((i * 29) % 120) - 60}px` } }));
  const sign = h('div', { class: 'sign', tip: t('title.sign.tip') }, h('div', { class: 'glow' }),
    h('img', { class: 'l-pink', src: D.IMAGES.logoPink, alt: '', draggable: 'false' }), h('img', { class: 'l-cyan', src: D.IMAGES.logoCyan, alt: 'Rolling Paradise', draggable: 'false' }), h('img', { class: 'l-dice', src: D.IMAGES.logoDice, alt: '', draggable: 'false' }));
  root.append(h('div', { class: 'title' }, h('div', { class: 'sky' }), h('div', { class: 'gridfloor' }), ...motes, h('div', { class: 'inner' },
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
      btn(t('title.build'), () => nav.build(), t('title.build.tip'), 'sign-btn p')),
    h('div', { class: 'stats records' },
      [[t('title.rec.runs'), meta.runs, t('title.rec.runs.tip')], [t('title.rec.best'), meta.best > 4 ? t('title.rec.ascent') : meta.best || '—', t('title.rec.best.tip')], [t('title.rec.crowns'), meta.crowns, t('title.rec.crowns.tip')], [t('title.rec.jackets'), meta.jackets.length, t('title.rec.jackets.tip')], [t('title.rec.wallets'), (meta.wallets || []).length, t('title.rec.wallets.tip')], [t('title.rec.atm'), cents(meta.atm), t('title.rec.atm.tip')]]
        .map(([a, b, t]) => h('span', { class: 'stat', tip: `<b>${a}</b><p>${t}</p>` }, h('em', { text: a }), h('b', { text: b })))))));
}

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
  const meta = app.meta; let cls = 'hustler', jacket = 'standard', wallet = meta.wallets.includes(meta.lastWallet) ? meta.lastWallet : 'worn_cloth';
  const cards = h('div', { class: 'cols3' }), jackets = h('div', { class: 'row wrap' });
  const els = Object.entries(D.CLASSES).map(([id, K]) => {
    const dice = Object.entries(K.dice).flatMap(([type, n]) => Array.from({ length: n }, () => type));
    const el = h('button', { class: 'pick-card', style: { '--cc': K.color }, onclick: () => { cls = id; sync(); } },
      h('h2', { text: K.hero }), h('p', { class: 'cap', text: t('select.hero.the', { cls: K.name }) }), h('p', { class: 'sub', text: D.classRule(id) }), D.flavorOf('CLASSES', id) ? h('p', { class: 'sub flavor', text: D.flavorOf('CLASSES', id) }) : null,
      h('span', { class: 'cap', text: t('select.eachTurn') }), statRow(K.tip, ['trickery', 'ingenuity', 'proficiency']),
      h('span', { class: 'cap', text: t('select.unused') }), h('p', { class: 'sub', text: t('select.unused.rows', { stat: D.STATS[D.primaryC(id)].name }) }),
      h('span', { class: 'cap', text: t('select.position') }), statRow(K.bvd, ['balance', 'versatility', 'depth']),
      h('span', { class: 'cap', text: t('select.pouch') }), h('div', { class: 'dicebox' }, dice.map((type) => { const d = dieEl({ type }); d._tip = () => dieTip({ type }); d.classList.add('has-tip'); return d; })),
      h('span', { class: 'cap', text: t('select.book') }), h('div', { class: 'inv' }, K.tricks.map((tid) => { const t = { id: tid, q: 1 }; return h('span', { class: 'tag-t', style: { '--tc': D.TYPES[D.TRICKS[tid].type].color }, tip: () => trickTip(t, id) }, D.TRICKS[tid].name); })));
    el._id = id; return el; });
  cards.append(...els);
  const jb = meta.jackets.map((id) => { const b = guided(btn(`🧥 ${D.JACKETS[id].name}`, () => { jacket = id; sync(); }, () => { const K = D.CLASSES[cls]; return jacketTip(id, { ...K.tip, ...K.c, ...K.bvd }) + `<p class="dim">${t('select.jacket.against', { cls: K.name })}</p>`; }, 'small'), 'jacket'); b._id = id; return b; });
  jackets.append(h('span', { class: 'cap', text: t('select.jacket') }), ...jb);
  const wb = meta.wallets.map((id) => { const b = guided(btn(`👛 ${D.WALLETS[id].name}`, () => { wallet = id; sync(); }, () => walletTip(id), 'small'), 'wallet'); b._id = id; return b; });
  const keptEl = h('span', { class: 'sub fade-t' });
  jackets.append(h('span', { class: 'cap', style: { marginLeft: '18px' }, text: t('select.wallet') }), ...wb, keptEl);
  function sync() { for (const el of els) el.classList.toggle('sel', el._id === cls); for (const b of jb) b.classList.toggle('on', b._id === jacket); for (const b of wb) b.classList.toggle('on', b._id === wallet);
    const k = (meta.kept || []).slice(0, D.WALLETS[wallet].slots); keptEl.textContent = k.length ? t('select.kept', { cards: k.map((c) => D.CARDS[c].name).join(', ') }) : ''; }
  sync();
  root.append(h('div', { class: 'page', style: { top: 0, padding: '22px 40px' } }, h('div', { class: 'row between' }, h('div', {}, h('h1', { text: t('select.title') }), h('p', { class: 'sub', text: t('select.sub') })),
    h('div', { class: 'row' }, btn(t('select.back'), () => nav.title()), btn(t('select.walkIn'), () => { app.run = R.newRun(cls, jacket, undefined, { wallet, kept: meta.kept, pass: meta.keptPass }); meta.kept = []; meta.keptPass = 0; meta.lastWallet = wallet; R.saveMeta(meta); nav.intro().then(() => { if (app.meta.seenHow) return toast(t('select.doorman')); app.meta.seenHow = true; R.saveMeta(app.meta); howTo(); }); }, t('select.walkIn.tip'), 'big go'))),
    h('div', { style: { marginTop: '16px' } }, cards), h('div', { style: { marginTop: '14px' } }, jackets)));
}

window.addEventListener('resize', fit);
loadDraft(); // your build-mode changes, live in this browser
fit(); initTips(); initSpin(); initMusic(document.getElementById('stage')); initSfx(document.getElementById('stage'));
app.meta = R.loadMeta();
nav.title();
if (new URLSearchParams(location.search).has('debug')) window.RP = { app, R, D, nav };
