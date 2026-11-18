// Build mode › Neon: the colours each Roller's sign wears at the table (D.NEON). Each part of the sign (the frame
// around your seat, the script name, the class under it) takes two colours: the tube's own and the glow it throws.
import { h, btn } from './core.js';
import * as D from '../data.js';
import * as B from '../build/draft.js';
import { t } from '../text.js';

const PARTS = ['border', 'name', 'cls'];
const SAMPLE = { you: () => [D.CLASSES.hustler?.hero || 'Owl', D.CLASSES.hustler?.name || 'Hustler'], them: () => ['Low Ball', 'Doorman'] };

export function neonMaker(redraw) {
  const P = (who, part) => `NEON.${who}.${part}`;
  const vars = (who) => Object.fromEntries(Object.entries(D.NEON[who]).flatMap(([part, pair]) => pair.map((c, i) => [`--${who}-${part}${i + 1}`, c])));
  const sample = (who) => { const [name, cls] = SAMPLE[who]();
    return h('div', { class: `who ${who === 'you' ? 'me' : 'them'} neon-sample`, style: vars(who) }, h('div', { class: 'name nsign' }, h('b', { class: 'neon-name', text: name }), h('span', { class: 'neon-class', text: cls }))); };
  const pick = (who, part, i) => h('label', { class: 'neon-in' }, h('input', { type: 'color', value: D.NEON[who][part][i],
    onchange: (e) => { const pair = [...D.NEON[who][part]]; pair[i] = e.target.value; B.setValue(P(who, part), pair); redraw(); } }), h('small', { text: t(i ? 'neon.glow' : 'neon.core') }));
  const row = (who, part) => h('div', { class: `b-field ${B.changed(P(who, part)) ? 'ch' : ''}` }, h('label', { text: t(`neon.${part}`) }), h('div', { class: 'row' }, pick(who, part, 0), pick(who, part, 1)),
    P(who, part) in B.draft.changes ? btn('↺', () => { B.revert(P(who, part)); redraw(); }, t('build.revert.tip', { was: JSON.stringify(B.draft.orig[P(who, part)]) }), 'small b-revert') : h('span'));
  return h('div', { class: 'col neon-maker' }, h('p', { class: 'sub', text: t('neon.sub') }),
    ...['you', 'them'].map((who) => h('div', { class: 'neon-side' }, h('h3', { text: t(`neon.${who}`) }), sample(who), ...PARTS.map((part) => row(who, part)))));
}
