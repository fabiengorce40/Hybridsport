/* global document, window, getComputedStyle, localStorage, Event -- exécutés dans la page */
/**
 * REKKA V3.1 — séance Musculation en cours (build BÊTA V3 réelle, `dist-beta-v3`), données fictives du dépôt.
 * Contrôles : liste complète des exercices (prescription réelle), cartes dépliables, saisie directe (clavier numérique),
 * coche au pinceau, chronomètre global dans l'en-tête fixe, repos flottant dont l'anneau = temps restant / durée du
 * repos (pause, +15 s, changement d'onglet, rechargement), aucune série voisine modifiée, cibles ≥ 44 px, aucun
 * défilement horizontal, valeurs longues, fin de séance avec confirmation.
 * Usage : node scripts/e2e-v31-live-session.mjs [dossier de captures]   (largeurs : 360, 390, 412, 1024)
 */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = fileURLToPath(new URL('../', import.meta.url));
const root = resolve(process.env.REKKA_DIST ?? resolve(app, 'dist-beta-v3'));
const shots = process.argv[2];
if (shots) mkdirSync(shots, { recursive: true });
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
const ok = (m) => console.log(`ok  ${m}`);

const stored = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '{}'), KEY);
const scrollerOf = (page) => page.evaluate(() => {
  let e = document.querySelector('.v31-workout');
  while (e && e !== document.body) { const o = getComputedStyle(e).overflowY; if ((o === 'auto' || o === 'scroll') && e.scrollHeight > e.clientHeight) return e.className; e = e.parentElement; }
  return 'document';
});
const scrollTo = (page, y) => page.evaluate((top) => {
  let e = document.querySelector('.v31-workout');
  while (e && e !== document.body) { const o = getComputedStyle(e).overflowY; if ((o === 'auto' || o === 'scroll') && e.scrollHeight > e.clientHeight) { e.scrollTop = top; return; } e = e.parentElement; }
  window.scrollTo(0, top);
}, y);
/** Anneau : proportion affichée, angle effacé du masque, et proportion attendue recalculée depuis l'état persistant. */
const ring = (page) => page.evaluate((k) => {
  const el = document.querySelector('.v31-rest');
  if (!el) return null;
  const mask = el.querySelector('.v31-rest-progress').style.maskImage || el.querySelector('.v31-rest-progress').style.webkitMaskImage;
  const degs = [...mask.matchAll(/(-?[0-9.]+)deg/g)].map((m) => Number(m[1]));
  const erased = degs.length >= 2 ? degs[1] : Number.NaN; // conic-gradient(transparent 0deg E°, opaque E° 360°)
  const s = JSON.parse(localStorage.getItem(k));
  const log = Object.values(s.programmeLogs).find((l) => l.rest);
  const r = log.rest;
  const remaining = r.pausedRemainingS ?? Math.ceil((Date.parse(r.endsAt) - Date.now()) / 1000);
  return { shown: Number(el.getAttribute('data-rest-fraction')), erased, expected: Math.max(0, Math.min(1, remaining / r.totalS)), remaining, totalS: r.totalS, paused: el.getAttribute('data-paused') === 'true', text: el.querySelector('.k-rest-time').textContent };
}, KEY);
const ringCoherent = (x, tag) => {
  assert.ok(x, `${tag} : chrono de repos affiché`);
  assert.ok(Math.abs(x.shown - x.expected) < 0.006, `${tag} : proportion ${String(x.shown)} ≠ attendue ${String(x.expected)}`);
  assert.ok(Math.abs(x.erased - (1 - x.shown) * 360) < 0.6, `${tag} : angle effacé ${String(x.erased)}° ≠ ${String((1 - x.shown) * 360)}°`);
};

const browser = await chromium.launch();
try {
  for (const width of [360, 390, 412, 1024]) {
    const W = `${String(width)} px`;
    const height = width === 360 ? 640 : width === 1024 ? 900 : 844;
    const ctx = await browser.newContext({ viewport: { width, height }, locale: 'fr-FR', timezoneId: 'Europe/Paris', isMobile: width < 1000, hasTouch: width < 1000 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.clock.install({ time: new Date('2026-10-07T08:00:00Z') });
    await page.clock.pauseAt(new Date('2026-10-07T08:01:00Z'));
    await page.addInitScript(({ k, f }) => { if (localStorage.getItem(k) === null) localStorage.setItem(k, f); }, { k: KEY, f: fixture });
    const shot = async (name) => { if (shots && (width === 390 || width === 360)) await page.screenshot({ path: `${shots}/${String(width)}-${name}.png`, animations: 'disabled' }); };
    await page.goto(url);
    await page.getByRole('button', { name: 'Planning', exact: true }).click();
    await page.locator(`button[data-request="${ID}"]`).click();
    await page.getByRole('button', { name: 'Commencer la séance', exact: true }).click();
    await page.locator('[data-checkin-form]').getByRole('button', { name: 'Passer', exact: true }).click();
    await page.locator('.v31-workout').waitFor();

    // 1. Liste complète : un exercice et des séries exactement prescrits par le moteur.
    const cards = page.locator('.v31-exercise');
    const n = await cards.count();
    const perCard = await page.locator('.v31-exercise').evaluateAll((xs) => xs.map((x) => x.querySelectorAll('.v31-set').length));
    const counted = await page.locator('.v31-overview p span').innerText();
    assert.match(counted, new RegExp(`^${String(n)} exercices · 0/${String(perCard.reduce((a, b) => a + b, 0))} séries$`));
    assert.ok(n >= 2, 'séance à plusieurs exercices');
    // Chaque carte = un élément de prescription (aucun ajout) : les identifiants de séries saisies se rattachent aux items.
    const names = await page.locator('.v31-exercise-name strong').allInnerTexts();
    assert.equal(new Set(names).size, names.length);
    assert.equal(await page.locator('.v31-exercise[data-expanded="true"]').count(), 1);
    ok(`${W} : ${String(n)} exercices dans une seule liste (${perCard.join('/')} séries), un exercice déplié`);

    // Repliement / dépliement : les exercices repliés restent visibles.
    const firstSummary = cards.first().locator('.v31-exercise-summary');
    await firstSummary.click();
    assert.equal(await page.locator('.v31-exercise[data-expanded="true"]').count(), 0);
    assert.equal(await firstSummary.getAttribute('aria-expanded'), 'false');
    for (let i = 0; i < n; i++) assert.ok(await cards.nth(i).locator('.v31-exercise-summary').isVisible());
    await scrollTo(page, 0);
    await shot('01-seance-complete');
    await firstSummary.click();
    assert.equal(await firstSummary.getAttribute('aria-expanded'), 'true');
    await shot('02-exercice-deplie');
    ok(`${W} : carte repliée puis dépliée, tous les exercices restent visibles`);

    // 2. Saisie directe dans la ligne (aucune modale, aucun éditeur séparé), clavier numérique adapté.
    const ex = page.locator('.v31-exercise[data-expanded="true"]');
    const row1 = ex.locator('.v31-series-row').nth(0);
    const row2 = ex.locator('.v31-series-row').nth(1);
    const kg1 = row1.getByLabel(/^Charge \(kg\)/);
    const reps1 = row1.getByLabel(/^Répétitions réalisées/);
    assert.equal(await kg1.getAttribute('inputmode'), 'decimal');
    assert.equal(await reps1.getAttribute('inputmode'), 'numeric');
    const row2Before = { kg: await row2.getByLabel(/^Charge \(kg\)/).inputValue(), reps: await row2.getByLabel(/^Répétitions réalisées/).inputValue() };
    await kg1.click();
    assert.ok(await kg1.evaluate((e) => e === document.activeElement), 'le champ charge reçoit le focus (clavier) dans la ligne');
    assert.equal(await page.getByRole('dialog').count(), 0, 'aucune fenêtre intermédiaire');
    await kg1.fill('82,5');
    assert.equal(await kg1.inputValue(), '82.5', 'virgule décimale acceptée');
    await shot('03-saisie-charge');
    await reps1.click();
    assert.ok(await reps1.evaluate((e) => e === document.activeElement));
    await reps1.fill('7a');
    assert.equal(await reps1.inputValue(), '7', 'répétitions entières seulement');
    await shot('04-saisie-repetitions');
    assert.deepEqual({ kg: await row2.getByLabel(/^Charge \(kg\)/).inputValue(), reps: await row2.getByLabel(/^Répétitions réalisées/).inputValue() }, row2Before, 'série voisine inchangée');
    ok(`${W} : saisie directe charge (décimale) et répétitions (entières), aucune modale, série voisine intacte`);

    // Valeur longue : aucun débordement du champ ni de la page.
    const kg2 = row2.getByLabel(/^Charge \(kg\)/);
    await kg2.fill('1234.75');
    const fits = await kg2.evaluate((e) => e.scrollWidth <= e.clientWidth + 1);
    assert.ok(fits, 'charge longue lisible dans son champ');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await kg2.fill(row2Before.kg);
    ok(`${W} : valeur longue (1234.75 kg) contenue, aucun défilement horizontal`);

    // 3. Validation : coche au pinceau, données persistées de CETTE série seulement, repos flottant.
    const beforeSets = (await stored(page)).programmeLogs[ID].sets;
    await row1.getByRole('button', { name: 'Cocher la série', exact: true }).click();
    await page.waitForTimeout(350);
    assert.equal(await row1.getAttribute('data-done'), 'true');
    const check = await row1.locator('.v31-check-main').evaluate((p) => ({ off: getComputedStyle(p).strokeDashoffset, color: getComputedStyle(p).stroke }));
    assert.equal(Number.parseFloat(check.off), 0);
    assert.equal(check.color, 'rgb(220, 255, 53)');
    const afterSets = (await stored(page)).programmeLogs[ID].sets;
    const changed = afterSets.filter((s) => JSON.stringify(s) !== JSON.stringify(beforeSets.find((b) => b.itemId === s.itemId && b.setIndex === s.setIndex)));
    assert.equal(changed.length, 1);
    assert.equal(changed[0].done, true); assert.equal(changed[0].loadKg, 82.5); assert.equal(changed[0].reps, 7);
    assert.ok(await row1.getByLabel(/^Charge \(kg\)/).isVisible() && (await row1.getByLabel(/^Charge \(kg\)/).inputValue()) === '82.5', 'la coche ne masque pas la charge');
    await shot('05-serie-validee');
    ok(`${W} : coche jaune-vert au pinceau tracée, une seule série enregistrée (82.5 kg × 7)`);

    // 4. Repos flottant : début, ~50 %, pause, +15 s, onglet masqué, rechargement.
    const rest = page.getByRole('timer', { name: 'Chrono de repos' });
    await rest.waitFor();
    const r0 = await ring(page);
    ringCoherent(r0, `${W} début`);
    assert.equal(r0.shown, 1);
    const box = await rest.boundingBox();
    assert.ok(box.y + box.height <= height + 1 && box.y > height / 2, 'repos ancré en bas de l’écran');
    await shot('06-repos-debut');
    // +50 ms : l'affichage se met à jour juste APRÈS la frontière de seconde (alignement V3.1.1, marge de 15 ms).
    await page.clock.runFor(Math.round(r0.totalS / 2) * 1000 + 50);
    const r50 = await ring(page);
    ringCoherent(r50, `${W} mi-repos`);
    assert.ok(Math.abs(r50.shown - 0.5) <= 0.01, `≈ 50 % (${String(r50.shown)})`);
    await shot('07-repos-50');
    // Repère du tableau de spécification sur 60 s : 45 s ⇒ 75 % … reproduit à l'échelle du repos prescrit.
    await page.getByRole('button', { name: 'Mettre le repos en pause', exact: true }).click();
    const rp = await ring(page);
    await page.clock.runFor(5000);
    const rp2 = await ring(page);
    assert.ok(rp.paused && rp2.paused && rp.shown === rp2.shown && rp.text === rp2.text, 'pause : anneau et temps figés');
    ringCoherent(rp2, `${W} pause`);
    await shot('08-repos-pause');
    await page.getByRole('button', { name: 'Ajouter 15 secondes', exact: true }).click();
    const re = await ring(page);
    ringCoherent(re, `${W} +15 s en pause`);
    assert.equal(re.totalS, rp2.totalS + 15);
    assert.equal(re.remaining, rp2.remaining + 15);
    await page.getByRole('button', { name: 'Reprendre le repos', exact: true }).click();
    await page.clock.runFor(3050);
    ringCoherent(await ring(page), `${W} reprise`);
    const prescriptionAfter = (await stored(page)).programmeLogs[ID];
    assert.ok(prescriptionAfter, 'journal de séance présent');
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.clock.runFor(4050);
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    ringCoherent(await ring(page), `${W} retour d’onglet`);
    await page.reload();
    await page.getByRole('button', { name: 'Reprendre la séance', exact: true }).first().click();
    await rest.waitFor();
    ringCoherent(await ring(page), `${W} rechargement`);
    ok(`${W} : anneau = temps restant / repos (début 100 %, mi-repos ${String(r50.shown)}, pause figée, +15 s recalculé, onglet, rechargement)`);

    // 5. Défilement : en-tête (chronomètre global) et repos toujours visibles ; saisies conservées après rechargement.
    await scrollTo(page, 100000);
    await page.waitForTimeout(150);
    const global = page.getByRole('timer', { name: 'Chronomètre global' });
    const gb = await global.boundingBox();
    const rb = await rest.boundingBox();
    assert.ok(gb && gb.y >= 0 && gb.y < 140, 'chronomètre global visible dans l’en-tête fixe');
    assert.ok(rb && rb.y + rb.height <= height + 1 && rb.y >= 0, 'repos visible après défilement');
    const headerBottom = await page.locator('.v31-sticky-top').evaluate((e) => e.getBoundingClientRect().bottom);
    assert.ok(headerBottom <= rb.y, 'aucune collision en-tête / repos');
    const finish = page.locator('.v31-finish');
    const fb = await finish.boundingBox();
    assert.ok(fb.y + fb.height <= rb.y + 1, 'bouton « Terminer la séance » accessible au-dessus du repos en bas de liste');
    await shot('09-defilement');
    const saved = (await stored(page)).programmeLogs[ID].sets.find((s) => s.done);
    assert.equal(saved.loadKg, 82.5);
    ok(`${W} : défilement — chronomètre global et repos visibles, sans collision ; fin de séance atteignable`);

    // 6. Cibles tactiles et débordements.
    const small = await page.evaluate(() => [...document.querySelectorAll('.v31-workout button, .v31-workout input')]
      .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest('[hidden]') && !e.closest('.sr-only') && (r.width < 44 || r.height < 44); })
      .map((e) => `${e.getAttribute('aria-label') ?? e.textContent.trim().slice(0, 20)} ${String(Math.round(e.getBoundingClientRect().width))}×${String(Math.round(e.getBoundingClientRect().height))}`));
    assert.deepEqual(small, [], `cibles < 44 px : ${small.join(', ')}`);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    ok(`${W} : toutes les commandes ≥ 44 × 44 px, aucun défilement horizontal (défilement : ${await scrollerOf(page)})`);

    // 7. Fin de séance : jamais sans confirmation (séance partielle).
    await finish.click();
    const fin = page.getByRole('dialog', { name: 'Fin de séance' });
    await fin.waitFor();
    assert.equal((await stored(page)).programmeLogs[ID].finishedAt, undefined, 'rien d’enregistré avant confirmation');
    await fin.getByRole('radio', { name: /J’ai adapté la séance/ }).click();
    await fin.getByRole('button', { name: 'Enregistrer' }).click();
    await page.getByText('Séance terminée').first().waitFor();
    const fs = await stored(page);
    assert.ok(fs.programmeLogs[ID].finishedAt && fs.schemaVersion === 5);
    ok(`${W} : fin de séance partielle — formulaire de confirmation, puis enregistrement (schéma 5)`);
    assert.deepEqual(errors, []);
    await ctx.close();
  }
  console.log('E2E V3.1 SÉANCE ACTIVE OK');
} finally {
  await browser.close();
  server.close();
}
