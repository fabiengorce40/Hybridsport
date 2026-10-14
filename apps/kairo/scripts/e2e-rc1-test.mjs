/* global localStorage, document, fetch, navigator, caches, Response -- exécutés dans la page */
/**
 * KAIRO RC1 — TEST : vérification de l'ISOLATION de la build de test (`pnpm kairo:build:rc1-test`), puis parcours E2E
 * complet de l'application sur cette build.
 *
 *   1. Identité : bandeau « KAIRO RC3 — TEST », titre, manifeste (nom, identifiant, couleur), service worker de test.
 *   2. Stockage : même sur une origine PARTAGÉE avec des données « production » (clé `kairo.state` et cache
 *      `kairo-beta0-2` préexistants), la build de test ne lit ni n'écrit aucune clé hors de son préfixe et ne supprime
 *      aucun cache de production.
 *   3. Origines séparées (`E2E_PROD_URL`, facultatif) : les données de la production ne sont pas visibles du test.
 *   4. Réseau : aucune requête vers une autre origine que celle de l'application testée.
 *   5. Parcours E2E complet (scripts/e2e.mjs) avec la clé de stockage du canal de test.
 *
 * Usage : E2E_URL=<url build test> [E2E_PROD_URL=<url build production>] node scripts/e2e-rc1-test.mjs [captures]
 */
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const URL_ = process.env.E2E_URL ?? 'http://localhost:4174/';
const PROD_URL = process.env.E2E_PROD_URL;
const shots = process.argv[2];
const PREFIX = 'kairo-rc1-test:';
const LABEL = 'KAIRO RC3 — TEST';
const SENTINEL = JSON.stringify({ sentinel: 'PRODUCTION — ne jamais modifier', schemaVersion: 0 });
const fail = (m) => { console.error(`ÉCHEC : ${m}`); process.exit(1); };
const check = (cond, m) => { if (!cond) fail(m); console.log(`ok  ${m}`); };
const origin = new URL(URL_).origin;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
const page = await ctx.newPage();
const foreign = [];
page.on('request', (r) => { const o = new URL(r.url()).origin; if (o !== origin && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) foreign.push(r.url()); });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
// Origine PARTAGÉE simulée : données « production » présentes AVANT le premier chargement de la build de test.
await page.addInitScript(([s]) => {
  if (localStorage.getItem('kairo.state') === null) localStorage.setItem('kairo.state', s);
  if (localStorage.getItem('kairo.unreadable.prod') === null) localStorage.setItem('kairo.unreadable.prod', 'copie production');
  caches.open('kairo-beta0-2').then((c) => c.put('./sentinel-production', new Response('production'))).catch(() => undefined);
}, [SENTINEL]);
// Lieu d’entraînement désormais choisi explicitement (même gestionnaire que scripts/e2e.mjs).
await page.addLocatorHandler(page.locator('[data-equipment-missing]'), async () => { await page.getByLabel('Lieu d’entraînement').selectOption('preset.full_gym'); });
await page.clock.install({ time: new Date('2026-10-05T07:30:00+02:00') });
await page.clock.resume();

// 1. Identité.
await page.goto(URL_);
const ribbon = page.locator('.k-test-ribbon');
check(await ribbon.isVisible() && (await ribbon.innerText()).includes(LABEL), `bandeau « ${LABEL} » visible`);
check(await page.title() === LABEL, 'titre de la page = identité de test');
const manifest = await page.evaluate(async () => { const l = document.querySelector('link[rel=manifest]'); return l ? (await fetch(l.href)).json() : null; });
check(manifest?.name === LABEL && manifest.short_name === 'KAIRO TEST' && manifest.id === './?kairo-channel=rc1-test' && manifest.theme_color === '#8A1C1C', 'manifeste PWA : nom, nom court, identifiant et couleur propres au test');
const swText = await page.evaluate(async () => (await fetch('./sw.js', { cache: 'no-store' })).text());
check(swText.includes("const CACHE = 'kairo-rc1-test-1';") && swText.includes("k.startsWith('kairo-rc1-test-')") && !swText.includes("'kairo-beta0-2'"), 'service worker : cache propre au test, suppression limitée à ses propres caches');
check(await page.evaluate(async () => Boolean((await navigator.serviceWorker.ready).active)), 'service worker de test actif');
const cdp = await ctx.newCDPSession(page);
const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
check(installabilityErrors.length === 0, `installable comme PWA selon Chrome (${JSON.stringify(installabilityErrors)})`);
if (shots) await page.screenshot({ path: `${shots}/test-01-accueil.png` });

// 2. Parcours court : onboarding → programme → séance Musculation (une série cochée) ⇒ écritures dans le stockage.
await page.getByLabel(/J’ai compris/).check();
await page.getByRole('button', { name: 'Commencer' }).click();
await page.getByRole('radio', { name: /^Musculation \+ Course/ }).click();
await page.getByRole('button', { name: 'Continuer' }).click();
await page.getByLabel('Durée (min)').fill('30');
await page.getByLabel('Distance (km)').fill('5');
await page.getByRole('button', { name: 'Continuer' }).click();
await page.getByRole('button', { name: 'Continuer' }).click();
await page.getByRole('button', { name: 'Créer mon programme' }).click();
await page.getByRole('navigation', { name: 'Navigation principale' }).waitFor();
check(await ribbon.isVisible(), 'bandeau toujours visible après l’onboarding');
if (shots) await page.screenshot({ path: `${shots}/test-02-programme.png` });
await page.reload();
await page.getByRole('navigation', { name: 'Navigation principale' }).waitFor();
check(true, 'programme conservé après rechargement (stockage du test)');

const store = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)])));
check(store['kairo.state'] === SENTINEL, 'clé de production « kairo.state » INCHANGÉE (octet pour octet)');
check(store['kairo.unreadable.prod'] === 'copie production', 'copie de sauvegarde de production inchangée');
const own = Object.keys(store).filter((k) => k.startsWith(PREFIX));
check(own.includes(`${PREFIX}kairo.state`) && Boolean(JSON.parse(store[`${PREFIX}kairo.state`]).profile), 'état du test enregistré sous sa propre clé préfixée');
check(Object.keys(store).every((k) => k.startsWith(PREFIX) || k === 'kairo.state' || k === 'kairo.unreadable.prod'), `aucune autre clé écrite hors du préfixe (${Object.keys(store).join(', ')})`);
const cacheKeys = await page.evaluate(async () => caches.keys());
check(cacheKeys.includes('kairo-beta0-2'), 'cache de production non supprimé par le service worker de test');
check(cacheKeys.filter((k) => k !== 'kairo-beta0-2').every((k) => k.startsWith('kairo-rc1-test-')), `caches du test préfixés (${cacheKeys.join(', ')})`);

// 3. Origines séparées : données de la production invisibles depuis le test.
if (PROD_URL) {
  const c2 = await browser.newContext({ viewport: { width: 360, height: 640 } });
  const p2 = await c2.newPage();
  await p2.goto(PROD_URL);
  await p2.evaluate((s) => localStorage.setItem('kairo.state', s), SENTINEL);
  await p2.goto(URL_);
  const seen = await p2.evaluate(() => Object.keys(localStorage));
  check(!seen.includes('kairo.state'), `origine du test (${origin}) ≠ origine de production (${new URL(PROD_URL).origin}) : stockage non partagé`);
  await p2.goto(PROD_URL);
  check(await p2.evaluate((s) => localStorage.getItem('kairo.state') === s, SENTINEL), 'données de la production intactes après passage par le test');
  check(!(await p2.locator('.k-test-ribbon').count()), 'la build de production n’affiche pas le bandeau de test');
  await c2.close();
}

// 4. Réseau.
check(foreign.length === 0, `aucune requête hors de l’origine de test (${foreign.join(', ') || 'aucune'})`);
check(errors.length === 0, `aucune erreur de page (${errors.join(' | ')})`);
await browser.close();

// 5. Parcours E2E complet sur la build de test (clé de stockage du canal).
const src = fileURLToPath(new URL('./e2e.mjs', import.meta.url));
const gen = fileURLToPath(new URL('./.e2e-rc1-test.generated.mjs', import.meta.url));
const code = readFileSync(src, 'utf8');
const occurrences = code.split("'kairo.state'").length - 1;
check(occurrences > 0, `parcours complet : ${String(occurrences)} accès à la clé d’état redirigés vers « ${PREFIX}kairo.state »`);
writeFileSync(gen, code.replaceAll("'kairo.state'", `'${PREFIX}kairo.state'`));
const r = spawnSync(process.execPath, [gen, ...(shots ? [shots] : [])], { stdio: 'inherit', env: { ...process.env, E2E_URL: URL_ } });
rmSync(gen, { force: true });
if (r.status !== 0) fail('parcours E2E complet sur la build de test');
console.log('E2E RC1 TEST OK');
