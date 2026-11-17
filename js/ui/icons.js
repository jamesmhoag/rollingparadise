// Icons, images and textures from the resource manifest (js/content/assets.js). An icon with a file (src) shows the
// file; one without shows its glyph, so the game looks the same until a file is added.
import { h } from './core.js';
import * as D from '../data.js';

export const iconSrc = (id) => D.ICONS[id]?.src || null;
export const iconGlyph = (id, fallback = '') => D.ICONS[id]?.glyph ?? fallback;
// the icon as children for an element: an <img> when it has a file, else its glyph as text
export const iconKids = (id, fallback = '') => { const src = iconSrc(id); return src ? [h('img', { class: 'ico', src, alt: '', draggable: 'false' })] : [iconGlyph(id, fallback)]; };
// fill an existing element with the icon (for elements that are reused frame to frame)
export function iconFill(el, id, fallback = '') {
  const src = iconSrc(id);
  if (src) { if (el.firstElementChild?.getAttribute?.('src') !== src) el.replaceChildren(h('img', { class: 'ico', src, alt: '', draggable: 'false' })); }
  else { const g = iconGlyph(id, fallback); if (el.textContent !== g || el.firstElementChild) el.textContent = g; }
  return el;
}
// style for an element whose text stays (a chip's glyph) but shows the file over it when there is one
export const iconStyle = (id) => { const src = iconSrc(id); return src ? { '--ico': `url("${src}")` } : {}; };
export const textureOf = (id) => D.TEXTURES[id] || null;
export const imageOf = (id) => D.IMAGES[id];
