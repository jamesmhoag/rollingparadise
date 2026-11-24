// A miniature Stake for Build mode: the red-checkered rows of a Roller's or an opponent's position, sized to what
// its class and gear give it (posDims: rows front to back, five columns, the stack height), with chips set on and
// taken off by hand. Pick a chip from the rack, then click a space to set one down (hold, or sweep across spaces, to
// keep going); right-click a space, or use the eraser, to take its top chip off. A Roller's is the position it starts
// a run with (and that the player changes before each bout); an opponent's is the position it sits down with.
import { h, btn, paint, guided } from './core.js';
import { chipEl } from './parts.js';
import * as D from '../data.js';
import * as R from '../run.js';
import { t } from '../text.js';
import { sfx } from './sfx.js';

const CW = 62, CH = 54, LIFT = 6; // a space's width (one row) and height (one column); each chip in a stack sits higher
let brushOf = { roller: 1, opponent: 1 };

// dims: the position (R.posDims); layout: [{ r, c, chips }]; set(layout | null): store it; done(): after a stroke;
// effects: whether effect chips may be laid (opponents) or only plain chips (Rollers)
export function stakeBoard({ dims, layout, set, done, effects = false, who = 'opponent' }) {
  const rows = dims.barRows, cols = dims.cols, cap = dims.stackMax;
  let L = JSON.parse(JSON.stringify(layout || []));
  const outside = L.reduce((n, sp) => n + (sp.r >= rows || sp.c >= cols ? sp.chips.length : Math.max(0, sp.chips.length - cap)), 0);
  const board = h('div', { class: 'stakeboard', style: { width: `${rows * CW + 30}px`, height: `${cols * CH}px` } });
  const bet = h('div', { class: 'sb-bet', text: t('stake.bet'), style: { left: `${rows * CW + 4}px`, height: `${cols * CH}px` } });
  board.append(bet);
  // the spaces: row r counts from the front (beside the Bet) to the back; columns run down
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) board.append(h('div', { class: `sb-cell ${(r + c) % 2 ? 'dark' : ''}`, style: { left: `${(rows - 1 - r) * CW}px`, top: `${c * CH}px`, width: `${CW - 2}px`, height: `${CH - 2}px` } }));
  const chips = new Map(), worthEl = h('b', { class: 'num gold-t' }), countEl = h('b', { class: 'num' });
  const itemChip = (it) => (typeof it === 'number' ? { kind: 'std', value: it } : { kind: 'std', value: 1, resist: it });
  function draw(animate) {
    const seen = new Set();
    for (const sp of L) { if (sp.r >= rows || sp.c >= cols) continue;
      sp.chips.slice(0, cap).forEach((it, lvl) => { const k = `${sp.r}-${sp.c}-${lvl}`; seen.add(k); let e = chips.get(k);
        const x = (rows - 1 - sp.r) * CW + (CW - 2 - 32) / 2, y = sp.c * CH + (CH - 2 - 32) / 2 + Math.min(12, (cap - 1) * LIFT / 2) - lvl * Math.min(LIFT, 24 / Math.max(1, cap - 1));
        if (e && e._it !== it) { e.remove(); e = null; }
        if (!e) { e = chipEl(itemChip(it)); e._it = it; e.classList.remove('static'); e.classList.add('sb-chip'); board.append(e); chips.set(k, e);
          if (animate) { e.style.transform = `translate(${x}px, ${y - 26}px) scale(1.15)`; e.style.opacity = '0'; void e.offsetWidth; } }
        e.style.zIndex = 10 + sp.c * 20 + lvl; e.style.opacity = '1'; e.style.transform = `translate(${x}px, ${y}px)`; }); }
    for (const [k, e] of chips) if (!seen.has(k)) { e.style.opacity = '0'; e.style.transform = `${e.style.transform.replace(/ scale\([^)]*\)/, '')} translateY(-22px) scale(.8)`; chips.delete(k); setTimeout(() => e.remove(), 380); }
    worthEl.textContent = `${R.layoutWorth(R.fitLayout(L, dims))}¢`;
    countEl.textContent = `${L.reduce((n, sp) => n + (sp.r < rows && sp.c < cols ? Math.min(cap, sp.chips.length) : 0), 0)} / ${rows * cols * cap}`;
  }
  const store = () => { L = L.filter((sp) => sp.chips.length); set(L.length ? L : null); };
  const spaceAt = (ev) => { const rect = board.getBoundingClientRect(), k = rect.width / board.offsetWidth, x = (ev.clientX - rect.left) / k, y = (ev.clientY - rect.top) / k;
    const r = rows - 1 - Math.floor(x / CW), c = Math.floor(y / CH); return r < 0 || r >= rows || c < 0 || c >= cols ? null : { key: `${r}-${c}`, r, c }; };
  function apply(at, erase) {
    let sp = L.find((x) => x.r === at.r && x.c === at.c);
    if (erase || brushOf[who] === 'erase') { if (!sp?.chips.length) return; sp.chips.pop(); sfx('undo'); }
    else { if (!sp) { sp = { r: at.r, c: at.c, chips: [] }; L.push(sp); } if (sp.chips.length >= cap) return; sp.chips.push(brushOf[who]); sfx('chip'); }
    store(); draw(true);
  }
  paint(board, spaceAt, (at) => apply(at, false), 200, () => done?.());
  board.addEventListener('contextmenu', (ev) => { ev.preventDefault(); const at = spaceAt(ev); if (at) { apply(at, true); done?.(); } });
  // the rack: plain chips, effect chips (opponents), and the eraser
  const rack = h('div', { class: 'seg brushes sb-rack' });
  const items = [...D.DENOM_VALUES, ...(effects ? Object.keys(D.SHOP_CHIPS) : []), 'erase'];
  if (!items.includes(brushOf[who])) brushOf[who] = 1;
  function drawRack() {
    rack.replaceChildren(...items.map((it) => { const b = btn(it === 'erase' ? '⌫' : '', () => { brushOf[who] = it; drawRack(); },
      it === 'erase' ? t('stake.erase.tip') : typeof it === 'number' ? t('stake.chip.tip', { v: it }) : t('stake.effect.tip', { name: D.SHOP_CHIPS[it].name }), `small ${brushOf[who] === it ? 'on' : ''}`);
      if (it !== 'erase') b.append(chipEl(itemChip(it), 'sm')); return guided(b, 'brush'); }));
  }
  drawRack(); draw(false);
  return h('div', { class: 'col sb-wrap' }, rack, h('div', { class: 'sb-scroll' }, board),
    h('div', { class: 'row wrap' }, h('span', { class: 'stat' }, h('em', { text: t('stake.worth') }), worthEl), h('span', { class: 'stat' }, h('em', { text: t('stake.chips') }), countEl),
      L.length ? btn(t('stake.clear'), () => { L = []; store(); draw(true); done?.(); }, null, 'small') : null),
    outside ? h('p', { class: 'sub warn-t', text: t('stake.outside', { n: outside }) }) : null,
    h('p', { class: 'sub', text: t(`stake.note.${who}`, { rows, cap }) }));
}
