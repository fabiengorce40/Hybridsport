/* global localStorage, document, Event, navigator */
/**
 * Intégration RC5 → BÊTA — MISE À JOUR RÉELLE d'un utilisateur de la BÊTA publiée, données fictives uniquement.
 * Build A = BÊTA publiée (REKKA_OLD_DIST, commit REKKA_OLD_BUILD, format 2) ; build B = candidate (REKKA_NEW_DIST, commit
 * REKKA_NEW_BUILD, format 5). Même origine, même service worker de canal, `version.json` servi par build.
 * 1. A : création du programme par l'ANCIEN parcours, import d'un état utilisateur (séances faites, charges, expositions) ;
 *    export de référence.
 * 2. B publiée pendant que la page est ouverte : bandeau « Nouvelle version », « Mettre à jour », B exécutée.
 * 3. Données : export de B identique à celui de A (hors numéro de format) ; copie EXACTE du texte d'avant migration
 *    conservée (`kairo.premigration.*`) ; identité REKKA conservée ; Planning et historique lisibles.
 * 4. Retour arrière : A rouverte sur ces données v5 affiche « Mise à jour requise » et ne les modifie pas.
 * Usage : REKKA_OLD_DIST=… REKKA_OLD_BUILD=… REKKA_NEW_DIST=… REKKA_NEW_BUILD=… REKKA_OLD_FIXTURE=… node scripts/e2e-beta-rc5-upgrade.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve } from 'node:path';
import { chromium } from 'playwright';

const env = (k) => { const v = process.env[k]; if (!v) throw new Error(`${k} requis`); return v; };
const OLD = resolve(env('REKKA_OLD_DIST')); const NEW = resolve(env('REKKA_NEW_DIST'));
const OLD_BUILD = env('REKKA_OLD_BUILD').slice(0, 7); const NEW_BUILD = env('REKKA_NEW_BUILD').slice(0, 7);
const FIXTURE = resolve(env('REKKA_OLD_FIXTURE'));
const PREFIX = 'rekka-beta:'; const KEY = `${PREFIX}kairo.state`;
const check = (cond, m) => { assert.ok(cond, m); console.log(`ok  ${m}`); };

let current = OLD; let build = OLD_BUILD;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json' };
const server = createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  res.setHeader('Cache-Control', 'no-cache');
  if (pathname === '/version.json') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ commit: build, channel: 'beta' })); return; }
  const path = resolve(current, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (!path.startsWith(`${current}/`)) { res.writeHead(403).end(); return; }
  try { res.setHeader('Content-Type', types[extname(path)] ?? 'application/octet-stream'); res.end(readFileSync(path)); } catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const URL_ = `http://127.0.0.1:${String(server.address().port)}/`;

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.addLocatorHandler(page.locator('[data-checkin-form]'), async () => { await page.locator('[data-checkin-form]').getByRole('button', { name: 'Passer' }).click(); });
  await page.clock.install({ time: new Date('2026-10-12T07:30:00+02:00') });
  await page.clock.resume();
  const exportData = async () => {
    await page.getByRole('button', { name: /^(Réglages|Profil)$/ }).click();
    const ev = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exporter mes données', exact: true }).click();
    return JSON.parse(readFileSync(await (await ev).path(), 'utf8'));
  };

  // 1. Build A : ancien parcours de création, puis import d'un état utilisateur riche.
  await page.goto(URL_);
  check(await page.locator('.k-test-ribbon').getAttribute('data-beta-build') === OLD_BUILD, `build A exécutée (${OLD_BUILD})`);
  await page.getByLabel(/J’ai compris/).check();
  await page.getByRole('button', { name: 'Commencer' }).click();
  await page.getByRole('radio', { name: /^Musculation \+ Course/ }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByLabel('Durée (min)').fill('30');
  await page.getByLabel('Distance (km)').fill('5');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.addLocatorHandler(page.locator('[data-equipment-missing]'), async () => { await page.getByLabel('Lieu d’entraînement').selectOption('preset.full_gym'); });
  await page.getByRole('button', { name: 'Créer mon programme' }).click();
  await page.getByRole('navigation', { name: 'Navigation principale' }).waitFor();
  await page.getByRole('button', { name: /^(Réglages|Profil)$/ }).click();
  await page.getByLabel('Fichier de données à importer').setInputFiles(FIXTURE);
  { const ok = page.getByRole('button', { name: 'Remplacer mes données' }); await Promise.race([ok.waitFor().then(() => ok.click()).catch(() => {}), page.getByText('Données importées.', { exact: true }).waitFor().catch(() => {})]); } // import confirmé (FAST TRACK V1) ; anciennes builds : import direct
  await page.getByText('Données importées.').waitFor();
  const baseline = await exportData();
  const storedBefore = await page.evaluate((k) => localStorage.getItem(k), KEY);
  check(baseline.schemaVersion === 2 && Object.keys(baseline.programmeLogs ?? {}).length > 0 && (baseline.strength?.exposures?.length ?? 0) > 0, `A : format 2, ${String(Object.keys(baseline.programmeLogs).length)} séances journalisées, ${String(baseline.strength.exposures.length)} expositions, ${String(baseline.strength.tracks.length)} suivis`);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);

  // 2. Publication de B pendant que la page est ouverte : bandeau, « Mettre à jour ».
  current = NEW; build = NEW_BUILD;
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.getByText(/Nouvelle version de (KAIRO|REKKA) disponible/).waitFor({ timeout: 30000 });
  check(true, 'bandeau « Nouvelle version disponible » affiché par la build A');
  await page.getByRole('button', { name: 'Mettre à jour' }).click();
  // Attendre la page RECHARGÉE (sinon l'ancienne page, encore affichée, serait lue) ; limite = échec visible.
  await page.waitForFunction((old) => { const r = document.querySelector('.k-test-ribbon'); return r !== null && r.getAttribute('data-beta-build') !== old; }, OLD_BUILD, { timeout: 60000 }).catch(() => undefined);
  await page.waitForLoadState('load');
  await page.locator('.k-test-ribbon').waitFor();
  check(await page.locator('.k-test-ribbon').getAttribute('data-beta-build') === NEW_BUILD, `build B exécutée après « Mettre à jour » (${OLD_BUILD} → ${NEW_BUILD})`);
  await page.getByRole('navigation', { name: 'Navigation principale' }).waitFor();
  check(await page.evaluate(() => document.documentElement.dataset.rekka === 'v2'), 'identité visuelle REKKA conservée');

  // 3. Données : identiques hors format, copie d'avant migration, Planning lisible.
  const migrated = await exportData();
  check(migrated.schemaVersion === 5, 'B : format 5');
  assert.deepEqual({ ...migrated, schemaVersion: 2 }, baseline);
  check(true, 'export de B identique à celui de A (séances, charges, expositions, suivis, profil, journaux), hors numéro de format');
  const copies = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('rekka-beta:kairo.premigration.')).map((k) => localStorage.getItem(k)));
  check(copies.includes(storedBefore), 'copie EXACTE du texte d’avant migration conservée');
  await page.getByRole('button', { name: 'Planning', exact: true }).click();
  check((await page.locator('main, .screen').first().innerText()).length > 0, 'Planning affiché après la mise à jour');
  await page.reload(); await page.getByRole('navigation', { name: 'Navigation principale' }).waitFor();
  check(JSON.stringify(await exportData()) === JSON.stringify(migrated), 'rechargement : données identiques');
  assert.deepEqual(errors, []);
  check(true, 'aucune erreur JavaScript');
  const finalStored = await page.evaluate((k) => localStorage.getItem(k), KEY);
  await ctx.close();

  // 4. Retour arrière : l'ancienne build refuse les données v5 sans les modifier.
  current = OLD; build = OLD_BUILD;
  const old = await browser.newContext({ locale: 'fr-FR' }); const oldPage = await old.newPage();
  await oldPage.addInitScript(({ k, v }) => { if (localStorage.getItem(k) === null) localStorage.setItem(k, v); }, { k: KEY, v: finalStored });
  await oldPage.goto(URL_);
  await oldPage.getByRole('heading', { name: 'Mise à jour requise', exact: true }).waitFor();
  check(await oldPage.evaluate((k) => localStorage.getItem(k), KEY) === finalStored, 'retour arrière vers A : « Mise à jour requise », données v5 inchangées');
  await old.close();
  console.log('E2E MISE À JOUR BÊTA RC5 OK');
} finally { await browser.close(); server.closeAllConnections(); server.close(); }
