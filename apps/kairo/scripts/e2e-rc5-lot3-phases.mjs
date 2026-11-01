/* global localStorage, document, window, getComputedStyle */
/**
 * Reprise RC5 — lot 3 : phases des séries Musculation dans un vrai navigateur (Chromium mobile, 360 et 390 px), build
 * BÊTA (`apps/kairo/dist-android-test`, ou `REKKA_DIST`), données fictives du dépôt uniquement.
 * Vérifie : titres « Montée en charge » / « Séries de travail » (et « Séries de recul » si prescrites) ; mêmes séries que la
 * prescription persistée ; saisie et validation ; repos et chronomètre global présents ; rechargement ; séance terminée ;
 * cibles tactiles ≥ 44 px ; aucun défilement horizontal ; aucune erreur JavaScript.
 * `REKKA_CAPTURE_ONLY=1` : captures seulement (build antérieure, pour comparaison « avant »).
 * Usage : node apps/kairo/scripts/e2e-rc5-lot3-phases.mjs [dossier de captures] [préfixe]
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const app = fileURLToPath(new URL('../', import.meta.url));
const dist = resolve(process.env.REKKA_DIST ?? resolve(app, 'dist-android-test'));
const shots = process.argv[2];
const prefix = process.argv[3] ?? 'apres';
const captureOnly = process.env.REKKA_CAPTURE_ONLY === '1';
const fixture = readFileSync(resolve(app, 'tests/fixtures/r51-p5-w2.json'), 'utf8');
const KEY = 'rekka-beta:kairo.state';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const path = resolve(dist, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (!path.startsWith(`${dist}/`)) { res.writeHead(403).end(); return; }
  try { res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream', 'cache-control': 'no-cache' }).end(readFileSync(path)); } catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${String(server.address().port)}/`;
const ok = (m) => console.log(`ok  ${m}`);
const stored = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '{}'), KEY);
const noHScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

const browser = await chromium.launch();
try {
  for (const width of [360, 390]) {
    const W = `${String(width)} px`;
    // Samsung Galaxy (Android, Chrome) : viewport CSS 360 × 780 (S8–S23) et 390 px.
    const context = await browser.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
    await context.addInitScript(({ k, f }) => { if (localStorage.getItem(k) === null) localStorage.setItem(k, f); }, { k: KEY, f: fixture });
    await context.clock.install({ time: new Date('2026-10-12T09:00:00+02:00') });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const shot = async (n, loc) => { if (shots) await (loc ?? page).screenshot({ path: `${shots}/${prefix}-${String(width)}-${n}.png` }); };
    await page.goto(url);
    await page.getByRole('navigation', { name: 'Navigation principale' }).waitFor();
    await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: 'Planning', exact: true }).click();
    await page.getByRole('button', { name: /^Musculation :/ }).first().click();
    await page.getByRole('button', { name: 'Commencer la séance' }).first().click();
    const check = page.locator('[data-checkin-form]');
    if (await check.count()) await check.getByRole('button', { name: 'Passer', exact: true }).click();
    const main = page.getByRole('button', { name: 'Démarrer le bloc principal', exact: true });
    if (await main.count()) await main.click();
    await page.getByRole('timer', { name: 'Chronomètre global' }).waitFor();
    // Premier exercice qui comporte des montées en charge (prescrites par le moteur).
    const section = page.locator('section.k-ex').filter({ has: page.locator('[data-set-kind="rampup"], .k-set.warm') }).first();
    await section.scrollIntoViewIfNeeded();
    await shot('01-exercice', section);
    if (captureOnly) { await context.close(); continue; }

    const id = Object.values((await stored(page)).programmeLogs).find((l) => l.sport === 'strength' && !l.finishedAt).requestId;
    const st = await stored(page);
    const req = Object.values(st.planner.weeks).flatMap((w) => w.requests).find((r) => r.requestId === id);
    assert.ok(req);
    const warm = section.getByRole('group', { name: /^Montée en charge,/ });
    const work = section.getByRole('group', { name: /^Séries de travail,/ });
    assert.ok(await warm.getByText('Montée en charge', { exact: true }).isVisible());
    assert.ok(await work.getByText('Séries de travail', { exact: true }).isVisible());
    const kinds = await section.locator('.k-set').evaluateAll((xs) => xs.map((x) => x.getAttribute('data-set-kind')));
    assert.ok(kinds.includes('rampup') && kinds.some((k) => k !== 'rampup'));
    assert.equal(await warm.locator('.k-set').count() + await work.locator('.k-set').count() + await section.locator('[data-phase="backoff"] .k-set').count(), kinds.length);
    ok(`${W} : phases titrées, ${String(kinds.length)} séries (${kinds.join(', ')}) — aucune ajoutée ni retirée`);

    // Cibles tactiles et lisibilité.
    const small = await section.locator('button.k-check, input').evaluateAll((xs) => xs.filter((x) => { const r = x.getBoundingClientRect(); return r.height < 44 && x.tagName === 'BUTTON'; }).length);
    assert.equal(small, 0);
    const headFont = await warm.locator('.k-phase-title').evaluate((x) => Number.parseFloat(getComputedStyle(x).fontSize));
    assert.ok(headFont >= 11);
    assert.ok(await noHScroll(page));
    ok(`${W} : boutons de validation ≥ 44 px, titres lisibles (${String(headFont)} px), aucun défilement horizontal`);

    // Validation : montées puis une série de travail ; repos et chrono global présents ; RIR proposé.
    const sets = section.locator('.k-set');
    for (let i = 0; i < await warm.locator('.k-set').count(); i++) {
      const line = warm.locator('.k-set').nth(i);
      if (await line.getByLabel('Répétitions réalisées').inputValue() === '') await line.getByLabel('Répétitions réalisées').fill('5');
      if (await line.getByLabel('Charge (kg)').inputValue() === '') await line.getByLabel('Charge (kg)').fill('20');
      await line.getByRole('button', { name: 'Cocher la série' }).click();
    }
    const w1 = work.locator('.k-set').first();
    if (await w1.getByLabel('Répétitions réalisées').inputValue() === '') await w1.getByLabel('Répétitions réalisées').fill('8');
    if (await w1.getByLabel('Charge (kg)').inputValue() === '') await w1.getByLabel('Charge (kg)').fill('40');
    await w1.getByRole('button', { name: 'Cocher la série' }).click();
    await page.getByRole('timer', { name: 'Chrono de repos' }).waitFor();
    assert.ok(await page.getByRole('timer', { name: 'Chronomètre global' }).isVisible());
    await section.scrollIntoViewIfNeeded();
    await shot('02-validation', section);
    const done = (await stored(page)).programmeLogs[id].sets.filter((x) => x.done).length;
    assert.equal(done, await sets.locator('.k-check.on').count());
    ok(`${W} : montées et série de travail validées (${String(done)}), repos lancé, chronomètre global présent`);

    // Rechargement : mêmes phases, mêmes validations.
    await page.reload();
    await page.getByRole('button', { name: 'Reprendre la séance', exact: true }).first().click();
    await page.getByRole('timer', { name: 'Chronomètre global' }).waitFor();
    const again = page.locator(`[id="${await section.getAttribute('id')}"]`);
    assert.equal(await again.locator('.k-check.on').count(), done);
    assert.equal(await again.getByRole('group', { name: /^Montée en charge,/ }).count(), 1);
    ok(`${W} : rechargement — phases et séries validées conservées`);

    // Fin de séance : exposition = séries de TRAVAIL seules ; phases toujours lisibles.
    const exposBefore = (await stored(page)).strength.exposures.length;
    await page.getByRole('button', { name: 'Terminer la séance' }).click();
    await page.getByRole('radio', { name: 'J’ai adapté la séance' }).click();
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await page.getByText('Séance terminée').first().waitFor();
    const after = await stored(page);
    assert.ok(after.programmeLogs[id].finishedAt);
    // Seules séries validées : les montées de cet exercice et UNE série de travail → une seule série exposée.
    const newSets = after.strength.exposures.slice(exposBefore).flatMap((x) => x.sets ?? []);
    assert.equal(newSets.length, 1, JSON.stringify(after.strength.exposures.slice(exposBefore)));
    await again.scrollIntoViewIfNeeded();
    await shot('03-terminee', again);
    assert.ok(await noHScroll(page));
    assert.deepEqual(errors, []);
    ok(`${W} : séance terminée — phases lisibles, montées hors exposition, aucune erreur JavaScript`);
    await context.close();
  }
  console.log(captureOnly ? 'CAPTURES OK' : 'E2E RC5 LOT 3 PHASES OK');
} finally {
  await browser.close();
  server.close();
}
