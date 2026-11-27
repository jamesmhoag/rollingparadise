// Developer mode: a way through the main game without grinding out the wins, for testing floors, wagers, rewards and
// what comes after them. Switched on from the title screen (it stays on in this browser), or with ?dev in the address.
//
//   the DEV button    in the top bar of the floor, the pre-bout page and your suite, and in the alley: set your purse
//                     to any amount, jump to a floor, seat the High Roller
//   at a table        beside Sit down: Clear it (a win, with a number of ¢ lost on the way) or Lose it, settled at once
//                     with the tilts and Double Down you have set, then the usual settlement: pick your prize as if you
//                     had played it. A cleared table opens the next one, so a Double Down on the second works as in play
//
// Nothing here changes the content or the rules: it sets up a run's state and calls the same settlement the game does.
import { h, btn, toast, openPanel, closePanel, guided } from './core.js';
import { numIn } from './form.js';
import { app } from './app.js';
import * as D from '../data.js';
import * as R from '../run.js';
import { cents } from '../util.js';
import { t } from '../text.js';

const KEY = 'rollingparadise.dev';
const store = () => { try { return globalThis.localStorage || null; } catch { return null; } };
export const devOn = () => { try { return store()?.getItem(KEY) === '1' || new URLSearchParams(globalThis.location?.search || '').has('dev'); } catch { return false; } };
export const setDev = (on) => { try { if (on) store()?.setItem(KEY, '1'); else store()?.removeItem(KEY); } catch { /* storage unavailable */ } return devOn(); };

// a whole number kept in `box.v` as it is typed
const num = (box) => { const el = numIn(box.v, (v) => { box.v = v; }, { min: 0, whole: true, blank: 0 }); el.classList.add('dev-num'); return el; };
// the panel: purse, floor, the High Roller. `redraw` puts the screen you are on back up with the new state
export function devPanel(redraw = () => {}) {
  const run = app.run; if (!run) return;
  const want = { v: run.purse }, purse = num(want), done = (msg) => { closePanel(true); R.saveRun(run); toast(msg); redraw(); };
  const onFloor = run.phase === 'floor' && run.fs;
  openPanel(h('div', { class: 'col dev-panel' }, h('h2', { text: t('dev.title') }), h('p', { class: 'sub', text: t('dev.sub') }),
    h('div', { class: 'b-field' }, h('label', { text: t('dev.purse') }), purse, btn(t('dev.set'), () => { run.purse = want.v; done(t('dev.purse.done', { purse: cents(run.purse) })); }, null, 'small go')),
    h('div', { class: 'row wrap' }, ...[100, 1000, 10000, 1000000].map((n) => btn(`+${cents(n)}`, () => { run.purse += n; done(t('dev.purse.done', { purse: cents(run.purse) })); }, null, 'small'))),
    onFloor ? h('div', { class: 'b-field' }, h('label', { text: t('dev.floor') }), h('div', { class: 'row' }, ...[1, 2, 3, 4].map((f) => btn(String(f), () => { R.enterFloor(run, f); closePanel(true); R.saveRun(run); toast(t('dev.floor.done', { name: D.FLOORS[f].name })); app.nav.hub(); }, null, `small ${f === run.floor ? 'on' : ''}`)))) : null,
    onFloor && !R.bossReady(run) ? h('div', { class: 'b-field' }, h('label', { text: t('dev.boss') }), btn(t('dev.boss.seat'), () => { run.fs.bossOpen = true; done(t('dev.boss.done', { name: run.fs.boss.opp.name })); }, null, 'small')) : null,
    h('div', { class: 'row' }, btn(t('dev.close'), () => closePanel(), null, 'small'))));
}
// the DEV button for a screen's top bar (nothing when developer mode is off)
export function devButton(redraw) { if (!devOn() || !app.run) return null; const b = btn(t('dev.btn'), () => devPanel(redraw), null, 'small dev-btn'); return guided(b, 'dev'); }
// beside Sit down: settle this table now, as a win (with ¢ lost on the way) or a loss, with the tilts and Double Down set
export function devPrepRow(prep) {
  if (!devOn()) return null;
  const loss = { v: 0 }, lost = num(loss), go = (win) => app.nav.result(R.autoClear(app.run, prep, { win, lost: loss.v }));
  const row = h('div', { class: 'row dev-row' }, h('span', { class: 'cap', text: t('dev.btn') }), h('label', { class: 'sub', text: t('dev.lost') }), lost,
    btn(t('dev.clear'), () => go(true), null, 'small go'), btn(t('dev.lose'), () => go(false), null, 'small danger'));
  return guided(row, 'dev');
}
