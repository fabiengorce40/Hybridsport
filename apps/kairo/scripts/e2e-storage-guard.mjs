/* global localStorage, document */
/**
 * Reprise 2 — sécurité des données dans un vrai navigateur (Chromium, 360 px), données fictives du dépôt uniquement.
 * A. Deux onglets de la MÊME version : la série validée dans l'onglet 1 est relue par l'onglet 2 (événement `storage`),
 *    qui la conserve et ajoute la sienne ; aucune écriture n'efface l'autre.
 * B. Onglet d'une ANCIENNE version non protégée (V2.1, build de référence) resté ouvert après la mise à jour : son
 *    écriture remplace celle de la nouvelle version ; au rechargement, l'écrasement est proposé, la restauration rend la
 *    série, et la version écartée reste sur l'appareil.
 * Usage : REKKA_LEGACY_DIST=<dist-android-test V2.1> node apps/kairo/scripts/e2e-storage-guard.mjs
 * (build courante attendue dans apps/kairo/dist-android-test : `pnpm kairo:build:beta` puis prepare-android-test).
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const app = fileURLToPath(new URL('../', import.meta.url));
const next = resolve(app, 'dist-android-test');
const legacy = resolve(process.env.REKKA_LEGACY_DIST ?? resolve(app, 'dist-legacy-android'));
const fixture = readFileSync(resolve(app, 'tests/fixtures/r51-p5-w2.json'), 'utf8');
const KEY = 'rekka-beta:kairo.state';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' };
let current = next;
const server = createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const path = resolve(current, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (!path.startsWith(`${current}/`)) { res.writeHead(403).end(); return; }
  try { res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream', 'cache-control': 'no-cache' }).end(readFileSync(path)); } catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${String(server.address().port)}/`;
const ok = (m) => console.log(`ok  ${m}`);
const stored = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '{}'), KEY);
const doneSets = (st) => Object.values(st.programmeLogs ?? {}).flatMap((l) => l.sets.filter((x) => x.done));
/** Séries validées dans les données fictives au départ (historique de la fixture). */
const BASE = doneSets(JSON.parse(fixture)).length;

async function openTab(context) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  await page.getByRole('navigation', { name: 'Navigation principale' }).waitFor();
  return { page, errors };
}
/** Démarre (ou reprend) la première séance Musculation du Planning et valide une série de plus. */
async function validateOneSet(page) {
  const resume = page.getByRole('button', { name: 'Reprendre la séance', exact: true });
  if (await resume.count()) await resume.first().click();
  else {
    await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: 'Planning', exact: true }).click();
    await page.getByRole('button', { name: /^Musculation :/ }).first().click();
    await page.getByRole('button', { name: 'Commencer la séance' }).first().click();
  }
  const check = page.locator('[data-checkin-form]');
  if (await check.count()) await check.getByRole('button', { name: 'Passer', exact: true }).click();
  const main = page.getByRole('button', { name: 'Démarrer le bloc principal', exact: true });
  if (await main.count()) await main.click();
  const before = await page.getByRole('button', { name: 'Décocher la série', exact: true }).count();
  await page.getByRole('button', { name: 'Cocher la série', exact: true }).first().click();
  await page.waitForFunction((n) => document.querySelectorAll('[aria-label="Décocher la série"]').length > n, before);
}

const browser = await chromium.launch();
try {
  // A — deux onglets de la même version.
  {
    current = next;
    const context = await browser.newContext({ viewport: { width: 360, height: 800 }, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
    await context.addInitScript(({ k, f }) => { if (localStorage.getItem(k) === null) localStorage.setItem(k, f); }, { k: KEY, f: fixture });
    await context.clock.install({ time: new Date('2026-10-12T09:00:00+02:00') });
    const t1 = await openTab(context);
    const t2 = await openTab(context);
    await validateOneSet(t1.page);
    assert.equal(doneSets(await stored(t1.page)).length, BASE + 1);
    await t2.page.getByText('Données mises à jour depuis un autre onglet.').waitFor();
    ok('A : l’onglet 2 relit automatiquement la série validée dans l’onglet 1');
    await validateOneSet(t2.page);
    const after = await stored(t2.page);
    assert.equal(doneSets(after).length, BASE + 2, 'les deux séries doivent être conservées');
    ok(`A : l’onglet 2 ajoute sa série sans effacer celle de l’onglet 1 (${String(BASE)} + 2 séries)`);
    assert.deepEqual([...t1.errors, ...t2.errors], []);
    await context.close();
  }
  // B — ancienne version non protégée restée ouverte après la mise à jour.
  {
    current = legacy;
    const context = await browser.newContext({ viewport: { width: 360, height: 800 }, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
    await context.addInitScript(({ k, f }) => { if (localStorage.getItem(k) === null) localStorage.setItem(k, f); }, { k: KEY, f: fixture });
    await context.clock.install({ time: new Date('2026-10-12T09:00:00+02:00') });
    const old = await openTab(context);
    current = next;
    const fresh = await openTab(context);
    await validateOneSet(fresh.page);
    const good = await stored(fresh.page);
    assert.equal(doneSets(good).length, BASE + 1);
    assert.equal(good.schemaVersion, 4);
    await fresh.page.close();
    // L'ancien onglet (V2.1, état en mémoire sans la série) démarre la même séance : écriture non protégée.
    await old.page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: 'Planning', exact: true }).click();
    await old.page.getByRole('button', { name: /^Musculation :/ }).first().click();
    await old.page.getByRole('button', { name: 'Commencer la séance' }).first().click();
    const check = old.page.locator('[data-checkin-form]');
    if (await check.count()) await check.getByRole('button', { name: 'Passer', exact: true }).click();
    const clobbered = await stored(old.page);
    assert.equal(doneSets(clobbered).length, BASE, 'scénario : l’ancienne version efface la série (risque reproduit)');
    ok('B : risque reproduit — l’onglet V2.1 a réécrit les données sans la série');
    await old.page.close();
    const back = await openTab(context).catch(async () => null);
    const page = back?.page ?? (await context.pages())[0];
    await page.getByRole('heading', { name: 'Données remplacées par une autre version' }).waitFor();
    assert.equal(doneSets(await stored(page)).length, BASE, 'aucune écriture avant le choix');
    ok('B : écrasement détecté au chargement, choix proposé, rien d’écrit avant le choix');
    await page.getByRole('button', { name: /^Restaurer les données enregistrées/ }).click();
    await page.getByRole('navigation', { name: 'Navigation principale' }).waitFor();
    const restored = await stored(page);
    assert.equal(doneSets(restored).length, BASE + 1);
    const kept = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('rekka-beta:kairo.state.replaced.')));
    assert.equal(kept.length, 1);
    ok('B : restauration — série retrouvée, version écartée conservée sur l’appareil');
    await context.close();
  }
  console.log('E2E SÉCURITÉ DES DONNÉES OK');
} finally {
  await browser.close();
  server.close();
}
