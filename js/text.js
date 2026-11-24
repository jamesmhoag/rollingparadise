// Game text. Every line the player reads is looked up by key in a language file (text/en.js), so wording can be
// changed in one place and the game can be translated by adding another language file.
//
//   t('floor.trader.sub', { n: 3 })  →  '3 tricks on the shelf.'
//
// In a line, {name} is replaced by vars.name, and {n|trick|tricks} picks the singular or plural by vars.n.
// A missing key shows the key itself (and is reported once in the console), so gaps are easy to spot.
import EN from './text/en.js';

export const LANGS = { en: EN };
let lang = 'en';
const warned = new Set();
export const setLang = (code) => { if (LANGS[code]) lang = code; return lang; };
export const getLang = () => lang;

export function fill(line, vars = {}) {
  return line.replace(/\{(\w+)(?:\|([^|}]*)\|([^}]*))?\}/g, (m, k, one, many) => {
    if (one !== undefined) return Number(vars[k]) === 1 ? one : many;
    return vars[k] !== undefined ? String(vars[k]) : m;
  });
}
export function t(key, vars) {
  const line = LANGS[lang][key] ?? EN[key];
  if (line === undefined) { if (!warned.has(key)) { warned.add(key); globalThis.console?.warn(`Missing text: ${key}`); } return key; }
  return fill(line, vars);
}
// every key in a language, for tools and tests
// whether a line exists (in the language in use, or English)
export const hasText = (key) => key in LANGS[lang] || key in EN;
export const keysOf = (code = 'en') => Object.keys(LANGS[code] || {});
