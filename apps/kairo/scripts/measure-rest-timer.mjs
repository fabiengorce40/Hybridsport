/* global document, window, performance, PerformanceObserver, MutationObserver, localStorage, requestAnimationFrame */
/**
 * Mesure EN TEMPS RÉEL (aucune horloge simulée) des chronomètres de la séance Musculation V3.1 :
 * valeurs successivement affichées (repos et chronomètre global), instant réel de chaque changement, écart à la valeur
 * exacte recalculée depuis l'état persistant, intervalles entre changements, sauts, tâches longues, trames, visibilité.
 * Le processeur peut être ralenti (CDP) pour approcher un téléphone : REKKA_CPU=4 (défaut).
 * Ce n'est PAS un test sur Samsung : c'est un banc reproductible sous Chromium.
 * Usage : REKKA_DIST=<dist-beta> REKKA_MEASURE_S=60 node scripts/measure-rest-timer.mjs [rapport.json]
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const app = fileURLToPath(new URL('../', import.meta.url));
const root = resolve(process.env.REKKA_DIST ?? resolve(app, 'dist-beta'));
const seconds = Number(process.env.REKKA_MEASURE_S ?? 60);
const cpu = Number(process.env.REKKA_CPU ?? 4);
const out = process.argv[2];
const fixture = readFileSync(resolve(app, 'tests/fixtures/v3-sober.json'), 'utf8');
const KEY = 'rekka-beta:kairo.state';
const ID = '2026-10-05.strength.2';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const server = createServer((req, res) => {
  const p = resolve(root, `.${new URL(req.url, 'http://localhost').pathname.replace(/^\/$/, '/index.html')}`);
  if (!p.startsWith(`${root}/`)) { res.writeHead(403).end(); return; }
  try { res.setHeader('Content-Type', mime[extname(p)] ?? 'application/octet-stream'); res.end(readFileSync(p)); } catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${String(server.address().port)}/`;

/** Instrumentation installée dans la page : observe le texte des deux chronomètres. */
function install(key) {
  const w = window;
  w.__m = { rest: [], global: [], longtasks: [], frames: [], vis: [] };
  const exact = () => {
    const s = JSON.parse(localStorage.getItem(key));
    const log = Object.values(s.programmeLogs).find((l) => l.rest);
    const r = log?.rest;
    return r ? (r.pausedRemainingS ?? (Date.parse(r.endsAt) - Date.now()) / 1000) : null;
  };
  const watch = (sel, bucket, withExact) => {
    let last = null;
    const read = () => {
      const el = document.querySelector(sel);
      const text = el?.textContent?.trim() ?? null;
      if (text !== last) { last = text; w.__m[bucket].push({ t: performance.now(), wall: Date.now(), text, exact: withExact ? exact() : null }); }
    };
    new MutationObserver(read).observe(document.body, { subtree: true, childList: true, characterData: true });
    read();
  };
  watch('.v31-rest .k-rest-time', 'rest', true);
  watch('.k-elapsed[data-session-clock]', 'global', false);
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) w.__m.longtasks.push({ t: e.startTime, d: e.duration }); }).observe({ type: 'longtask', buffered: true }); } catch { /* indisponible */ }
  let prev = performance.now();
  const frame = (t) => { w.__m.frames.push(t - prev); prev = t; requestAnimationFrame(frame); };
  requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => w.__m.vis.push({ t: performance.now(), state: document.visibilityState }));
}

const parseClock = (s) => { const m = /^(\+)?(\d+):(\d{2})/.exec(s ?? ''); return m ? (m[1] ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : null; };
function analyse(events, label) {
  const ev = events.filter((e) => parseClock(e.text) !== null);
  const steps = []; const gaps = []; const errs = [];
  for (let i = 1; i < ev.length; i++) {
    steps.push(parseClock(ev[i - 1].text) - parseClock(ev[i].text));
    gaps.push(ev[i].t - ev[i - 1].t);
  }
  for (const e of ev) if (e.exact !== null) errs.push(parseClock(e.text) - Math.ceil(e.exact));
  const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null; };
  return {
    label, changes: ev.length,
    stepCounts: steps.reduce((o, s) => ({ ...o, [String(Math.abs(s))]: (o[String(Math.abs(s))] ?? 0) + 1 }), {}),
    jumps: steps.filter((s) => Math.abs(s) >= 2).length,
    gapMs: { min: Math.round(Math.min(...gaps)), p50: Math.round(q(gaps, 0.5)), p95: Math.round(q(gaps, 0.95)), max: Math.round(Math.max(...gaps)) },
    lateVsExact: errs.length ? { mismatches: errs.filter((x) => x !== 0).length, values: [...new Set(errs)] } : null,
  };
}

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  await ctx.addInitScript(({ k, f }) => { if (localStorage.getItem(k) === null) localStorage.setItem(k, f); }, { k: KEY, f: fixture });
  // Date décalée d'un écart FIXE vers la semaine de la fixture : le temps s'écoule réellement ; minuteries,
  // requestAnimationFrame et rendu restent ceux du navigateur (aucune horloge simulée).
  await ctx.addInitScript((target) => {
    const Real = Date; const offset = target - Real.now();
    class Shifted extends Real { constructor(...a) { if (a.length === 0) super(Real.now() + offset); else super(...a); } static now() { return Real.now() + offset; } }
    globalThis.Date = Shifted;
  }, Date.parse('2026-10-07T08:01:00Z'));
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  await page.goto(url);
  await page.getByRole('button', { name: 'Planning', exact: true }).click();
  await page.locator(`button[data-request="${ID}"]`).click();
  await page.getByRole('button', { name: 'Commencer la séance', exact: true }).click();
  await page.locator('[data-checkin-form]').getByRole('button', { name: 'Passer', exact: true }).click();
  const row = page.locator('.v3-exercise[data-expanded="true"] .v31-series-row').first();
  await row.getByLabel(/^Répétitions réalisées/).fill('8');
  await row.getByLabel(/^Charge \(kg\)/).fill('20');
  await row.getByRole('button', { name: 'Cocher la série', exact: true }).click();
  await page.locator('.v31-rest').waitFor();
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  await page.evaluate(install, KEY);
  const report = { cpuThrottle: cpu, seconds, phases: [] };
  const phase = async (label, ms, action) => {
    await page.evaluate(() => { const m = window.__m; m.rest = m.rest.slice(-1); m.global = m.global.slice(-1); m.longtasks = []; m.frames = []; });
    const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
    const t0 = Date.now();
    const a = await metrics();
    if (action) await action();
    await page.waitForTimeout(ms);
    const b = await metrics();
    const m = await page.evaluate(() => window.__m);
    // Travail du fil principal pendant la phase (ms) : script, recalcul des styles, mise en page, tâches.
    const work = Object.fromEntries(['ScriptDuration', 'RecalcStyleDuration', 'LayoutDuration', 'TaskDuration'].map((k) => [k, Math.round((b[k] - a[k]) * 1000)]));
    work.styleRecalcs = b.RecalcStyleCount - a.RecalcStyleCount; work.layouts = b.LayoutCount - a.LayoutCount;
    const frames = m.frames.filter((f) => f > 0);
    report.phases.push({
      label, realMs: Date.now() - t0,
      rest: analyse(m.rest, 'repos'), global: analyse(m.global, 'global'),
      longTasks: { count: m.longtasks.length, totalMs: Math.round(m.longtasks.reduce((a, b) => a + b.d, 0)), maxMs: Math.round(Math.max(0, ...m.longtasks.map((x) => x.d))) },
      frames: { count: frames.length, over50ms: frames.filter((f) => f > 50).length, maxMs: Math.round(Math.max(0, ...frames)) },
      mainThread: work,
      visibility: m.vis,
    });
  };
  await phase(`repos au premier plan (${String(seconds)} s)`, seconds * 1000);
  await phase('pause 5 s', 5000, () => page.getByRole('button', { name: 'Mettre le repos en pause', exact: true }).click());
  await phase('reprise + 15 s, 10 s', 10000, async () => { await page.getByRole('button', { name: 'Reprendre le repos', exact: true }).click(); await page.getByRole('button', { name: 'Ajouter 15 secondes', exact: true }).click(); });
  // Suspension réelle de la page (gel du cycle de vie, comme un écran verrouillé), 8 s, puis reprise.
  await phase('gel 8 s puis reprise, 6 s', 6000, async () => {
    await cdp.send('Page.setWebLifecycleState', { state: 'frozen' });
    await sleep(8000);
    await cdp.send('Page.setWebLifecycleState', { state: 'active' });
  });
  await page.reload();
  await page.getByRole('button', { name: 'Reprendre la séance', exact: true }).first().click();
  await page.locator('.v31-rest').waitFor();
  await page.evaluate(install, KEY);
  await phase('après rechargement, 10 s', 10000);
  console.log(JSON.stringify(report, null, 1));
  if (out) writeFileSync(out, JSON.stringify(report, null, 2));
} finally {
  await browser.close();
  server.close();
}
