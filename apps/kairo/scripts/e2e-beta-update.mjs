/* global localStorage, document, Event -- exécutés dans la page */
/**
 * REKKA BÊTA — MISE À JOUR sans perte de données : la BÊTA (build A) est utilisée (programme créé, état utilisateur
 * importé, préférences), puis une NOUVELLE build B est publiée (commande `E2E_REBUILD_CMD` : reconstruit `dist-beta` avec
 * un autre commit, écrit `version.json`, relance le serveur). La page ouverte détecte la nouvelle version (bandeau
 * « Nouvelle version disponible »), l'utilisateur appuie sur « Mettre à jour » : la build B s'exécute (commit affiché)
 * et TOUTES les données de la BÊTA (clés préfixées) sont identiques octet pour octet.
 *
 * Usage : E2E_URL=<url> E2E_REBUILD_CMD="<commande>" E2E_NEW_BUILD=<commit B> node scripts/e2e-beta-update.mjs
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const URL_ = process.env.E2E_URL ?? 'http://localhost:4174/';
const NEW_BUILD = (process.env.E2E_NEW_BUILD ?? '').slice(0, 7);
const PREFIX = 'rekka-beta:';
const USER_STATE = fileURLToPath(new URL('../tests/fixtures/r51-p5-w2.json', import.meta.url));
const fail = (m) => { console.error(`ÉCHEC : ${m}`); process.exit(1); };
const check = (cond, m) => { if (!cond) fail(m); console.log(`ok  ${m}`); };
if (!process.env.E2E_REBUILD_CMD || !NEW_BUILD) fail('E2E_REBUILD_CMD et E2E_NEW_BUILD requis');

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
const page = await ctx.newPage();
await page.addLocatorHandler(page.locator('[data-checkin-form]'), async () => { await page.locator('[data-checkin-form]').getByRole('button', { name: 'Passer' }).click(); });
await page.clock.install({ time: new Date('2026-10-12T07:30:00+02:00') });
await page.clock.resume();
const dump = () => page.evaluate((p) => Object.fromEntries(Object.keys(localStorage).filter((k) => k.startsWith(p)).sort().map((k) => [k, localStorage.getItem(k)])), PREFIX);

// Build A : utilisation réelle.
await page.goto(URL_);
const oldBuild = await page.locator('.k-test-ribbon').getAttribute('data-beta-build');
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
await page.getByRole('button', { name: 'Réglages', exact: true }).click();
await page.getByLabel('Fichier de données à importer').setInputFiles(USER_STATE);
await page.getByText('Données importées.').waitFor();
await page.getByRole('button', { name: 'Planning', exact: true }).click();
await page.getByRole('button', { name: 'Grille' }).click();
await page.getByRole('button', { name: '2 semaines' }).count();
const before = await dump();
check(Object.keys(before).length >= 2 && Boolean(before[`${PREFIX}kairo.state`]), `build A (${String(oldBuild)}) : données BÊTA présentes (${Object.keys(before).join(', ')})`);

// Publication de la build B pendant que la page est ouverte.
const r = spawnSync('sh', ['-c', process.env.E2E_REBUILD_CMD], { stdio: 'inherit' });
check(r.status === 0, 'nouvelle build B publiée');
// Retour au premier plan : la page relit version.json et propose la mise à jour.
await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
await page.getByText(/Nouvelle version de KAIRO disponible/).waitFor({ timeout: 30000 });
check(true, 'bandeau « Nouvelle version disponible » affiché');
await page.getByRole('button', { name: 'Mettre à jour' }).click();
await page.waitForLoadState('load');
await page.locator('.k-test-ribbon').waitFor();
const shown = await page.locator('.k-test-ribbon').getAttribute('data-beta-build');
check(shown === NEW_BUILD && shown !== oldBuild, `build B exécutée après « Mettre à jour » (${String(oldBuild)} → ${String(shown)})`);
await page.getByRole('navigation', { name: 'Navigation principale' }).waitFor();
const after = await dump();
check(JSON.stringify(after) === JSON.stringify(before), `données BÊTA identiques octet pour octet après la mise à jour (${String(Object.keys(after).length)} clés)`);
await page.getByRole('button', { name: 'Planning', exact: true }).click();
check(await page.locator('[data-planning-grid]').isVisible(), 'préférence Grille conservée après la mise à jour');
await browser.close();
console.log('E2E MISE À JOUR BÊTA OK');
