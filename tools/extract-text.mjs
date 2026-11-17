// Move the English a file writes straight into the code into js/text/en.js, as keyed lines.
//
//   node tools/extract-text.mjs <prefix> <file.js…> [--dry]
//
// Every string or template literal that reads as player-facing English becomes tx('<prefix>.<slug>', { vars }), and
// the line goes into en.js under a section for the prefix. In a template, ${expr} becomes {name} (named after what
// it shows: ${def.name} → {name}, ${cents(J.price)} → {price}), and a hand-built plural such as
// `turn${n === 1 ? '' : 's'}` becomes {n|turn|turns}. A line that en.js already holds word for word reuses its key.
//
// Left alone: import paths, object keys, ids and classes (lowercase words), CSS, anything the code compares a value
// against anywhere in js/ (so 'Power' stays if some code tests x === 'Power'), arguments to t()/tt()/tx(), console
// and DOM calls. Check the result with npm test and by eye; the tool is a first pass, not a judge.
import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

const [prefix, ...rest] = process.argv.slice(2);
const dry = rest.includes('--dry'), files = rest.filter((f) => f !== '--dry');
if (!prefix || !files.length) { console.log('usage: node tools/extract-text.mjs <prefix> <file.js…> [--dry]'); process.exit(1); }
const ROOT = process.cwd(), EN = path.join(ROOT, 'js/text/en.js');
const parse = (src) => acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module', ranges: true });

// ---------- values the code compares against, anywhere: never move those ----------
const compared = new Set();
const allJs = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? allJs(path.join(dir, e.name)) : e.name.endsWith('.js') ? [path.join(dir, e.name)] : []));
for (const f of allJs(path.join(ROOT, 'js'))) {
  let ast; try { ast = parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
  walk.simple(ast, {
    BinaryExpression(n) { if (['===', '!==', '==', '!='].includes(n.operator)) for (const x of [n.left, n.right]) if (x.type === 'Literal' && typeof x.value === 'string') compared.add(x.value); },
    SwitchCase(n) { if (n.test?.type === 'Literal') compared.add(n.test.value); },
    CallExpression(n) { const p = n.callee.property?.name; if (['includes', 'indexOf', 'startsWith', 'endsWith', 'has'].includes(p) && n.arguments[0]?.type === 'Literal') compared.add(n.arguments[0].value);
      if (p === 'includes' && n.callee.object?.type === 'ArrayExpression') for (const e of n.callee.object.elements) if (e?.type === 'Literal') compared.add(e.value); },
  });
}

// ---------- what reads as English ----------
const SKIP_KEYS = new Set(['class', 'className', 'id', 'type', 'key', 'k', 'kind', 'src', 'href', 'value', 'mode', 'dir', 'color', 'cls', 'side', 'approach', 'chip', 'deploy',
  'convert', 'place', 'on', 'to', 'model', 'shop', 'fx', 'from', 'pit', 'sig', 'icon', 'tag', 'guide', 'style', 'what', 'why', 'state', 'phase', 'zone', 'who', 'tool', 'at', 'role', 'name_id']);
const SKIP_CALLS = new Set(['t', 'tt', 'tx', 'getItem', 'setItem', 'removeItem', 'querySelector', 'querySelectorAll', 'getElementById', 'setProperty', 'getAttribute', 'setAttribute', 'removeAttribute',
  'addEventListener', 'removeEventListener', 'toggle', 'add', 'remove', 'contains', 'require', 'import', 'warn', 'log', 'error', 'info', 'debug', 'matchMedia', 'createElement', 'closest', 'dispatchEvent',
  'subPath', 'getPath', 'setPath', 'splitPath', 'deletePath', 'changed', 'revert', 'animate', 'pulse', 'toFixed', 'split', 'join', 'replace', 'match', 'test', 'localeCompare', 'padStart']);
const strip = (s) => s.replace(/<[^>]*>/g, ' ').replace(/\{[^}]*\}/g, ' X ').replace(/\s+/g, ' ').trim();
function english(text) {
  const plain = strip(text);
  if (!/[A-Za-z]{2}/.test(plain) || !/\s/.test(plain)) return false;
  if (/(^|\s|\})(px|%|deg|rgba?\(|var\(--|translate|scale\(|cubic-bezier|calc\()/.test(text) || /\dpx\b/.test(text) || /^[#.]/.test(text)) return false;
  if (/^[a-z0-9_:.\- ]+$/.test(plain)) return false; // classes and ids: lowercase words
  return /^[A-Z¢0-9+\-−×★✦⚠✚•·…(“"']/.test(plain) || /[.,:;!?¢—–]/.test(plain) || /<[a-z]/.test(text);
}

// ---------- naming ----------
const camel = (s) => s.replace(/[^A-Za-z0-9]+(.)/g, (_, c) => c.toUpperCase()).replace(/^[^A-Za-z]+/, '');
function nameOf(expr, src) {
  const n = expr.type === 'ChainExpression' ? expr.expression : expr;
  if (n.type === 'Identifier') return n.name;
  if (n.type === 'MemberExpression') { const p = n.computed ? null : n.property.name; if (p === 'length') { const o = nameOf(n.object, src); return o ? o.replace(/s$/, '') + 'N' : 'n'; } if (p) return p; return nameOf(n.object, src); }
  if (n.type === 'CallExpression') { const c = n.callee.property?.name || n.callee.name; if (['cents', 'round', 'abs', 'floor', 'ceil', 'max', 'min', 'String', 'Number', 'toLocaleString', 'cap', 'join'].includes(c) && n.arguments[0]) return nameOf(n.arguments[0], src) || c; if (c === 'join' || c === 'toLocaleString') return nameOf(n.callee.object, src); return c ? camel(c) : null; }
  if (n.type === 'BinaryExpression' && ['+', '-', '*'].includes(n.operator)) return nameOf(n.left, src);
  return null;
}
const slug = (text) => strip(text).toLowerCase().replace(/x\b/g, '').replace(/[^a-z0-9 ]+/g, ' ').trim().split(/\s+/).filter(Boolean).slice(0, 4).join('-') || 'line';

// ---------- the language file ----------
const enSrc = fs.readFileSync(EN, 'utf8');
const existing = new Map(); for (const m of enSrc.matchAll(/^\s*("[^"]+"):\s*(".*"),\s*$/gm)) { try { existing.set(JSON.parse(m[2]), JSON.parse(m[1])); } catch { /* not a plain line */ } }
const keysTaken = new Set([...existing.values()]), added = [];
function keyFor(text, hint) {
  if (existing.has(text)) return existing.get(text);
  const fresh = added.find((x) => x.text === text); if (fresh) return fresh.key;
  let base = `${prefix}.${hint || slug(text)}`, key = base, i = 2; while (keysTaken.has(key)) key = `${base}-${i++}`;
  keysTaken.add(key); added.push({ key, text }); return key;
}

// ---------- the pass over one file ----------
const PLURAL = /^(===|!==|==|!=|>|<=)$/;
function pluralOf(e) { // `${n === 1 ? '' : 's'}` and friends: { subject, one, many }
  const n = e.type === 'ConditionalExpression' ? e : null; if (!n || n.test.type !== 'BinaryExpression' || !PLURAL.test(n.test.operator)) return null;
  const one1 = n.test.right.type === 'Literal' && n.test.right.value === 1; if (!one1) return null;
  const a = n.consequent, b = n.alternate; if (a.type !== 'Literal' || b.type !== 'Literal' || typeof a.value !== 'string' || typeof b.value !== 'string' || !/^[\w ]{0,8}$/.test(a.value + b.value)) return null;
  const sameOne = ['===', '==', '<='].includes(n.test.operator);
  return { subject: n.test.left, one: sameOne ? a.value : b.value, many: sameOne ? b.value : a.value };
}
function convertFile(file) {
  const src = fs.readFileSync(file, 'utf8'), ast = parse(src), picks = [];
  walk.ancestor(ast, {
    Literal(n, _s, anc) { if (typeof n.value === 'string' && candidate(n, anc) && english(n.value)) picks.push(n); },
    TemplateLiteral(n, _s, anc) { const p = anc[anc.length - 2]; if (p?.type === 'TaggedTemplateExpression') return; const txt = n.quasis.map((q) => q.value.cooked).join('{x}'); if (candidate(n, anc) && english(txt)) picks.push(n); },
  });
  function candidate(n, anc) {
    const p = anc[anc.length - 2], gp = anc[anc.length - 3];
    if (!p) return false;
    if (n.type === 'Literal' && compared.has(n.value)) return false;
    if (['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration', 'ImportExpression'].includes(p.type)) return false;
    if (p.type === 'Property' && p.key === n) return false;
    if (p.type === 'Property' && SKIP_KEYS.has(p.key.name || p.key.value)) return false;
    if (p.type === 'MemberExpression' && p.property === n) return false;
    if (p.type === 'BinaryExpression' && ['===', '!==', '==', '!=', 'in'].includes(p.operator)) return false;
    if (p.type === 'SwitchCase') return false;
    const call = p.type === 'CallExpression' ? p : p.type === 'ArrayExpression' && gp?.type === 'CallExpression' ? null : null;
    if (call) { const c = call.callee.property?.name || call.callee.name; if (SKIP_CALLS.has(c)) return false; if (c === 'h' && call.arguments[0] === n) return false; if (call.callee.object?.name === 'console') return false; }
    for (const a of anc) if (a.type === 'CallExpression' && ['t', 'tt', 'tx'].includes(a.callee.name)) return false;
    for (const a of anc) if (a.type === 'Property' && ['style', 'class'].includes(a.key?.name || a.key?.value)) return false; // inside a style or class object
    return true;
  }
  if (!picks.length) return { file, n: 0 };
  // generate replacements, innermost first, by containment
  const byStart = picks.slice().sort((a, b) => a.start - b.start || b.end - a.end);
  const inside = (o, n) => o !== n && o.start <= n.start && n.end <= o.end;
  const gen = new Map();
  const sliceWith = (start, end) => { // source between start and end with converted picks inside replaced
    const kids = byStart.filter((p) => p.start >= start && p.end <= end && !byStart.some((o) => o !== p && o.start >= start && o.end <= end && inside(o, p)));
    let out = '', at = start; for (const k of kids) { out += src.slice(at, k.start) + render(k); at = k.end; } return out + src.slice(at, end); };
  function render(n) {
    if (gen.has(n)) return gen.get(n);
    let text = '', vars = [];
    const varFor = (expr) => { const code = sliceWith(expr.start, expr.end), was = vars.find((v) => v.code === code); if (was) return was.name;
      let name = camel(nameOf(expr, src) || 'v') || 'v'; if (['n'].includes(name) === false && /^\d/.test(name)) name = 'v' + name; let nm = name, i = 2; while (vars.some((v) => v.name === nm)) nm = `${name}${i++}`; vars.push({ name: nm, code }); return nm; };
    if (n.type === 'Literal') text = n.value;
    else n.quasis.forEach((q, i) => {
      text += q.value.cooked.replace(/[{}]/g, (c) => (c === '{' ? '(' : ')'));
      const e = n.expressions[i]; if (!e) return;
      const pl = pluralOf(e);
      if (pl) { const s = varFor(pl.subject), m = /([A-Za-z]+)$/.exec(text);
        if (m && /^\w{0,4}$/.test(pl.one) && /^\w{0,4}$/.test(pl.many) && !/\s/.test(pl.one + pl.many)) { text = text.slice(0, -m[1].length) + `{${s}|${m[1]}${pl.one}|${m[1]}${pl.many}}`; } else text += `{${s}|${pl.one}|${pl.many}}`; return; }
      text += `{${varFor(e)}}`;
    });
    const key = keyFor(text);
    const out = vars.length ? `tx('${key}', { ${vars.map((v) => (v.code === v.name ? v.name : `${v.name}: ${v.code}`)).join(', ')} })` : `tx('${key}')`;
    gen.set(n, out); return out;
  }
  const top = byStart.filter((p) => !byStart.some((o) => inside(o, p)));
  let out = '', at = 0; for (const p of top) { out += src.slice(at, p.start) + render(p); at = p.end; } out += src.slice(at);
  // the import
  const rel = path.relative(path.dirname(file), path.join(ROOT, 'js/text.js')).replace(/\\/g, '/');
  if (!/import \{[^}]*\bt as tx\b[^}]*\} from/.test(out)) { const imps = [...out.matchAll(/^import .*;\n/gm)], last = imps[imps.length - 1]; const line = `import { t as tx } from '${rel.startsWith('.') ? rel : './' + rel}';\n`; out = last ? out.slice(0, last.index + last[0].length) + line + out.slice(last.index + last[0].length) : line + out; }
  if (!dry) fs.writeFileSync(file, out);
  return { file, n: picks.length };
}

const done = files.map(convertFile);
if (added.length && !dry) {
  const lines = added.map(({ key, text }) => `  ${JSON.stringify(key)}: ${JSON.stringify(text)},\n`).join('');
  const i = enSrc.trimEnd().lastIndexOf('};');
  fs.writeFileSync(EN, `${enSrc.slice(0, i).trimEnd()}\n  // ---------- ${prefix} (moved from the code by tools/extract-text.mjs) ----------\n${lines}};\n`);
}
for (const d of done) console.log(`${d.file}: ${d.n} literal${d.n === 1 ? '' : 's'}`);
console.log(`${added.length} new line${added.length === 1 ? '' : 's'} in js/text/en.js${dry ? ' (dry run: nothing written)' : ''}`);
if (dry) for (const a of added.slice(0, 60)) console.log(`  ${a.key}: ${a.text}`);
