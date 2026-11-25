// A miniature Stake for Build mode: the red-checkered rows of a Roller's or an opponent's position, sized to what
// its class and gear give it (posDims: rows front to back, five columns, the stack height), with chips set on and
// taken off by hand. Pick a chip from the rack, then click a space to set one down (hold, or sweep across spaces, to
// keep going); right-click a space, or use the eraser, to take its top chip off. A Roller's is the position it starts
// a run with (and that the player changes before each bout); an opponent's is the position it sits down with.
import { h } from './core.js';
import { stakePainter } from './prep.js';
import * as D from '../data.js';
import * as R from '../run.js';
import { t } from '../text.js';

const brushOf = { roller: 1, opponent: 1 };

// dims: the position (R.posDims); layout: [{ r, c, chips }]; set(layout | null): store it; done(): after a stroke;
// effects: whether effect chips may be laid (opponents) or only plain chips (Rollers); cls: its class (for the marks)
export function stakeBoard({ dims, layout, set, done, effects = false, who = 'opponent', cls = null }) {
  const rows = dims.barRows, cap = dims.stackMax;
  const outside = (layout || []).reduce((n, sp) => n + (sp.r >= rows || sp.c >= dims.cols ? sp.chips.length : Math.max(0, sp.chips.length - cap)), 0);
  const worthEl = h('b', { class: 'num gold-t' }), countEl = h('b', { class: 'num' });
  const P = stakePainter({ dims, cls, layout, maxW: 420, CH: 46,
    pick: { get: () => brushOf[who], set: (v) => { brushOf[who] = v; } },
    items: () => [...D.DENOM_VALUES, ...(effects ? Object.keys(D.SHOP_CHIPS) : [])],
    set: (L) => { set(L.length ? L : null); const f = R.fitLayout(L, dims); worthEl.textContent = `${R.layoutWorth(f)}¢`; countEl.textContent = `${f.reduce((n, sp) => n + sp.chips.length, 0)} / ${rows * dims.cols * cap}`; },
    done });
  { const f = R.fitLayout(layout || [], dims); worthEl.textContent = `${R.layoutWorth(f)}¢`; countEl.textContent = `${f.reduce((n, sp) => n + sp.chips.length, 0)} / ${rows * dims.cols * cap}`; }
  return h('div', { class: 'col sb-wrap' }, P.el,
    h('div', { class: 'row wrap' }, h('span', { class: 'stat', tip: t('stake.worth.tip') }, h('em', { text: t('stake.worth') }), worthEl), h('span', { class: 'stat', tip: t('stake.chips.tip') }, h('em', { text: t('stake.chips') }), countEl)),
    outside ? h('p', { class: 'sub warn-t', text: t('stake.outside', { n: outside }) }) : null,
    h('p', { class: 'sub', text: t(`stake.note.${who}`, { rows, cap }) }));
}
