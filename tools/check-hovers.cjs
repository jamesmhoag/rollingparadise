// Every hover in the game has guidance. This walks every screen in a headless browser, finds each element with a
// hover, and fails on any that has no guidance entry (so it would show only its Context hover).
//
//   npm run check:hovers          (serves the game on a spare port, needs Playwright's Chromium)
//
// Fix a failure by adding an entry to js/content/guidance.js: a class rule in GUIDE_BY_CLASS, `labels` for a
// button, or a `guide` prop / guided(el, key) where the element is made.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..'), PORT = 8700 + Math.floor(Math.random() * 200);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const missing = new Map(), errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  let seen = 0;
  const take = async (where) => {
    const rows = await p.evaluate(async () => {
      const core = await import('/js/ui/core.js'), G = (await import('/js/content/guidance.js')).GUIDE;
      return [...document.querySelectorAll('*')].filter((e) => e._tip).map((e) => {
        let k = null; try { k = core.guideKeyOf(e); } catch { /* counted as missing */ }
        return { ok: !!(k && G[k]), key: k, sig: `${e.tagName.toLowerCase()}.${[...e.classList].filter((c) => c !== 'has-tip').slice(0, 3).join('.')}`, text: (e.textContent || '').trim().slice(0, 30) };
      });
    });
    seen += rows.length;
    for (const r of rows) if (!r.ok) { const x = missing.get(r.sig) || { n: 0, where: new Set(), ex: new Set(), key: r.key }; x.n++; x.where.add(where); if (x.ex.size < 3) x.ex.add(r.text); missing.set(r.sig, x); }
  };
  const step = async (where, fn, wait = 900) => { try { await fn(); await p.waitForTimeout(wait); await take(where); } catch (e) { errors.push(`${where}: ${e.message.split('\n')[0]}`); } };
  const ev = (fn, arg) => p.evaluate(fn, arg);

  await p.goto(`http://localhost:${PORT}/?debug`); await p.waitForTimeout(1500); await take('title');
  await step('select', () => ev(() => window.RP.nav.select()));
  await step('library', () => ev(() => window.RP.nav.title()).then(() => p.waitForTimeout(500)).then(() => p.getByRole('button', { name: 'Library' }).first().click()));
  for (const tab of await p.locator('.lib-tabs button, .tabs button').all()) await step('library tab', () => tab.click(), 250);
  await step('floor', () => ev(() => { const { app, R } = window.RP; app.run = R.newRun('hustler', 'standard', 7); R.enterFloor(app.run, 2); app.run.purse = 3000; window.RP.nav.hub(); }), 1300);
  for (const room of ['smith', 'dice', 'trader', 'exchange', 'lounge', 'book', 'kit', 'search']) {
    await step(`room ${room}`, async () => { await ev(() => window.RP.nav.hub()); await p.waitForTimeout(600); const el = p.locator(`.room.r-${room}`); if (await el.count()) await el.first().click({ timeout: 3000 }); });
  }
  await step('prep', () => ev(() => window.RP.nav.prep('table', 0)), 1200);
  await step('bout', () => ev(() => { const { app, R } = window.RP; window.RP.nav.bout(R.startTable(app.run, R.newPrep(app.run, 'table', 0))); }), 2000);
  await step('bout, later turns', async () => { for (let k = 0; k < 5; k++) await ev(async () => { const ai = await import('/js/ai.js'), B = await import('/js/bout.js'), bt = window.RP.bout; if (!bt || bt.over) return; ai.autoTurn(bt); for (const _ of B.resolve(bt)); }); }, 1500); // eslint-disable-line no-unused-vars
  await step('result', () => ev(async () => { const { app, R } = window.RP; const { bout, ctx } = R.startTable(app.run, R.newPrep(app.run, 'table', 0)); bout.over = true; bout.winner = 0; const res = R.settle(app.run, ctx, bout);
    const m = await import('/js/ui/prep.js'); const root = document.getElementById('scene-layer'); root.replaceChildren(); m.resultScene(root, ctx, res); }), 2500);
  await step('suite', () => ev(() => window.RP.nav.suite(false)));
  await step('penthouse', () => ev(() => window.RP.nav.suite(true)));
  await step('gift shop', () => ev(() => window.RP.nav.gift()));
  await step('ascent', () => ev(() => { const { app, R } = window.RP; R.buildAscent?.(app.run, app.meta); window.RP.nav.ascent(); }));
  await step('alley', () => ev(() => { window.RP.app.run.phase = 'alley'; window.RP.nav.alley(); }), 4000);
  await step('summary', () => ev(() => { const { app, R } = window.RP; R.endRun?.(app.run, app.meta, 'You', 'alley'); window.RP.nav.summary(); }), 1200);
  for (const tool of ['tricks', 'chips', 'classes', 'roster', 'tuner', 'test', 'tables']) await step(`build ${tool}`, () => ev((t) => window.RP.nav.build({ tool: t }), tool));
  await step('test table', () => ev(() => window.RP.nav.test({ cls: 'hustler', floor: 2, q: 1, tricks: ['charge', 'block'], dice: { d6: 6 }, purse: 300, roster: null, rules: false })), 2000);

  await b.close(); server.close();
  console.log(`checked ${seen} hovers across every screen`);
  if (errors.length) console.log(`screens that could not be checked:\n  ${[...new Set(errors)].join('\n  ')}`);
  if (missing.size) {
    console.log(`FAIL ${missing.size} kind(s) of hover with no guidance:`);
    for (const [sig, x] of [...missing].sort((a, c) => c[1].n - a[1].n)) console.log(`  ${String(x.n).padStart(4)} ${sig}${x.key ? ` (key ${x.key} has no entry)` : ''} [${[...x.where].join(', ')}] e.g. ${[...x.ex].join(' | ')}`);
    process.exit(1);
  }
  console.log('ok, every hover has guidance');
  process.exit(errors.length ? 1 : 0);
})();
