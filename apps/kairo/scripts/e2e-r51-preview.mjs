/* global localStorage, document, fetch, navigator, caches, Response, getComputedStyle -- exécutés dans la page */
/**
 * REKKA R5.1 — PRÉVISUALISATION : vérification de l'ISOLATION de la build de prévisualisation
 * (`pnpm kairo:build:r51-preview`), du Planning Liste / Grille avec un état utilisateur IMPORTÉ par l'interface, puis
 * parcours E2E complet de l'application sur cette build.
 *
 *   1. Identité : bandeau, titre, manifeste (nom, identifiant, couleur), service worker propre à la prévisualisation.
 *   2. Stockage : même sur une origine PARTAGÉE avec des données de production (`kairo.state`, préférence d'affichage,
 *      cache `kairo-beta0-2`) et de TEST (`kairo-rc1-test:*`, cache `kairo-rc1-test-1`), la prévisualisation ne lit ni
 *      n'écrit aucune clé hors de son préfixe et ne supprime aucun cache d'un autre environnement.
 *   3. État utilisateur : import d'un export réel (format de `Exporter mes données`) par le bouton « Importer mes
 *      données » ; Liste / Grille, cartes, couleurs, textes, navigation, ouverture des séances ; séances, dates et
 *      progressions INCHANGÉES par l'usage de la grille.
 *   4. Origines séparées (`E2E_PROD_URL`, facultatif) : données de production invisibles et intactes.
 *   5. Réseau : aucune requête hors de l'origine testée.
 *   6. Parcours E2E complet (scripts/e2e.mjs) avec la clé de stockage du canal.
 *
 * Usage : E2E_URL=<url prévisualisation> [E2E_PROD_URL=<url production>] node scripts/e2e-r51-preview.mjs [captures]
 */
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const URL_ = process.env.E2E_URL ?? 'http://localhost:4174/';
const PROD_URL = process.env.E2E_PROD_URL;
const shots = process.argv[2];
const PREFIX = 'kairo-r51-preview:';
const LABEL = 'REKKA R5.1 — PRÉVISUALISATION';
const SENTINEL = JSON.stringify({ sentinel: 'PRODUCTION — ne jamais modifier', schemaVersion: 0 });
const TEST_SENTINEL = JSON.stringify({ sentinel: 'TEST — ne jamais modifier', schemaVersion: 0 });
const FOREIGN_KEYS = { 'kairo.state': SENTINEL, 'kairo.planning.view': 'list', 'kairo.runPlayer.sound': 'off', 'kairo-rc1-test:kairo.state': TEST_SENTINEL };
const USER_STATE = fileURLToPath(new URL('../tests/fixtures/r51-p5-w2.json', import.meta.url));
const fail = (m) => { console.error(`ÉCHEC : ${m}`); process.exit(1); };
const check = (cond, m) => { if (!cond) fail(m); console.log(`ok  ${m}`); };
const origin = new URL(URL_).origin;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const ctx = await browser.newContext({ viewport: { width: 360, height: 760 }, deviceScaleFactor: 2, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
const page = await ctx.newPage();
const foreign = [];
page.on('request', (r) => { const o = new URL(r.url()).origin; if (o !== origin && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) foreign.push(r.url()); });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
// Origine PARTAGÉE simulée : données de production et de TEST présentes AVANT le premier chargement.
await page.addInitScript(([keys]) => {
  for (const [k, v] of Object.entries(keys)) if (localStorage.getItem(k) === null) localStorage.setItem(k, v);
  caches.open('kairo-beta0-2').then((c) => c.put('./sentinel-production', new Response('production'))).catch(() => undefined);
  caches.open('kairo-rc1-test-1').then((c) => c.put('./sentinel-test', new Response('test'))).catch(() => undefined);
}, [FOREIGN_KEYS]);
await page.addLocatorHandler(page.locator('[data-checkin-form]'), async () => { await page.locator('[data-checkin-form]').getByRole('button', { name: 'Passer' }).click(); });
// Horloge : lundi 12 octobre 2026 (semaine 2 de l'état utilisateur importé).
await page.clock.install({ time: new Date('2026-10-12T07:30:00+02:00') });
await page.clock.resume();
const shot = async (n) => { if (shots) await page.screenshot({ path: `${shots}/${n}.png` }); };

// 1. Identité.
await page.goto(URL_);
const ribbon = page.locator('.k-test-ribbon');
check(await ribbon.isVisible() && (await ribbon.innerText()).includes(LABEL), `bandeau « ${LABEL} » visible`);
check(await page.title() === LABEL, 'titre de la page = identité de prévisualisation');
const manifest = await page.evaluate(async () => { const l = document.querySelector('link[rel=manifest]'); return l ? (await fetch(l.href)).json() : null; });
check(manifest?.name === LABEL && manifest.short_name === 'REKKA R5.1' && manifest.id === './?kairo-channel=r51-preview' && manifest.theme_color === '#3B2A7A', 'manifeste PWA : nom, nom court, identifiant et couleur propres à la prévisualisation');
const swText = await page.evaluate(async () => (await fetch('./sw.js', { cache: 'no-store' })).text());
check(swText.includes("const CACHE = 'kairo-r51-preview-1';") && swText.includes("k.startsWith('kairo-r51-preview-')") && !swText.includes("'kairo-beta0-2'"), 'service worker : cache propre, suppression limitée à ses propres caches');
check(await page.evaluate(async () => Boolean((await navigator.serviceWorker.ready).active)), 'service worker de prévisualisation actif');

// 2. État utilisateur importé par l'interface (onboarding minimal, puis Réglages → Importer mes données).
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
check(true, 'état utilisateur importé par « Importer mes données »');
const imported = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '{}'), `${PREFIX}kairo.state`);
const sessionsOf = (st) => JSON.stringify(Object.values(st.planner?.weeks ?? {}).flatMap((w) => w.requests.map((r) => [r.requestId, r.status, r.date, r.record ?? null])));
const progressionOf = (st) => JSON.stringify([st.strength?.tracks ?? [], st.programmeState?.results ?? [], st.programmeLogs ?? {}]);
check(Boolean(imported.profile) && Object.keys(imported.planner?.weeks ?? {}).length >= 2, `état importé sous la clé préfixée (${String(Object.keys(imported.planner?.weeks ?? {}).length)} semaines)`);

// 3. Planning Liste / Grille avec cet état.
await page.getByRole('button', { name: 'Planning', exact: true }).click();
check(await page.locator('[data-planning-catalog]').isVisible() && await page.getByRole('button', { name: 'Liste' }).getAttribute('aria-pressed') === 'true', 'Planning : liste par défaut (catalogue par sport)');
await shot('preview-01-liste');
await page.getByRole('button', { name: 'Grille' }).click();
await page.locator('[data-planning-grid]').waitFor();
const days = await page.locator('[data-agenda-day]').evaluateAll((ds) => ds.map((d) => d.getAttribute('data-agenda-day')));
check(days.length === 7 && days[0] === '2026-10-12' && days[6] === '2026-10-18', `grille : sept jours du lundi au dimanche (${days.join(' ')})`);
check(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 0, 'grille : aucun débordement horizontal de la page');
const cards = await page.locator('.agenda-card').evaluateAll((cs) => cs.map((c) => ({ sport: c.getAttribute('data-sport'), color: getComputedStyle(c).borderLeftColor, sportText: c.querySelector('.agenda-sport')?.textContent ?? '', name: c.querySelector('.agenda-name')?.textContent ?? '', dur: c.querySelector('.agenda-dur')?.textContent ?? '', status: c.querySelector('.badge')?.textContent ?? '' })));
check(cards.length === 7 && cards.every((c) => c.sportText && c.name && /min/.test(c.dur) && c.status), `grille : ${String(cards.length)} cartes avec sport, nom, durée et statut`);
check(new Set(cards.map((c) => c.sport)).size === 4 && new Set(cards.map((c) => c.color)).size === 4, `grille : quatre sports, quatre couleurs (${[...new Set(cards.map((c) => `${c.sport}=${c.color}`))].join(' ; ')})`);
await shot('preview-02-grille');
const first = page.locator('.agenda-card').first();
const id = await first.getAttribute('data-request');
await first.click();
await page.locator('.overlay').waitFor();
const opened = await page.locator('.overlay').innerText();
await page.getByRole('button', { name: 'Retour' }).first().click();
await page.getByRole('button', { name: 'Liste' }).click();
await page.locator(`[data-planning-catalog] button[data-request="${id}"]`).click();
check(await page.locator('.overlay').innerText() === opened, 'ouverture d’une séance : même fiche depuis la grille et depuis la liste');
await page.getByRole('button', { name: 'Retour' }).first().click();
await page.getByRole('button', { name: 'Grille' }).click();
await page.getByRole('button', { name: 'Semaine précédente' }).click();
check(await page.locator('[data-agenda-day]').first().getAttribute('data-agenda-day') === '2026-10-05', 'navigation : semaine précédente affichée');
await shot('preview-03-semaine1');
await page.getByRole('button', { name: 'Revenir à la semaine en cours' }).click();
await page.reload();
await page.getByRole('button', { name: 'Planning', exact: true }).click();
check(await page.locator('[data-planning-grid]').isVisible(), 'mode Grille mémorisé après rechargement');
const after = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '{}'), `${PREFIX}kairo.state`);
check(sessionsOf(after) === sessionsOf(imported) && progressionOf(after) === progressionOf(imported), 'séances, dates et progressions de l’état importé INCHANGÉES après usage de la grille');

// Isolation : clés et caches des autres environnements.
const store = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)])));
for (const [k, v] of Object.entries(FOREIGN_KEYS)) check(store[k] === v, `clé « ${k} » d’un autre environnement INCHANGÉE (octet pour octet)`);
check(Object.keys(store).every((k) => k.startsWith(PREFIX) || k in FOREIGN_KEYS), `aucune clé écrite hors du préfixe (${Object.keys(store).filter((k) => !(k in FOREIGN_KEYS)).join(', ')})`);
check(store[`${PREFIX}kairo.planning.view`] === 'grid', 'préférence Liste / Grille enregistrée sous la clé préfixée');
const cacheKeys = await page.evaluate(async () => caches.keys());
check(cacheKeys.includes('kairo-beta0-2') && cacheKeys.includes('kairo-rc1-test-1'), 'caches de production et de TEST non supprimés');
check(cacheKeys.filter((k) => k !== 'kairo-beta0-2' && k !== 'kairo-rc1-test-1').every((k) => k.startsWith('kairo-r51-preview-')), `caches de la prévisualisation préfixés (${cacheKeys.join(', ')})`);

// 4. Origines séparées.
if (PROD_URL) {
  const c2 = await browser.newContext({ viewport: { width: 360, height: 640 } });
  const p2 = await c2.newPage();
  await p2.goto(PROD_URL);
  const before = await p2.evaluate(() => localStorage.getItem('kairo.state'));
  await p2.goto(URL_);
  check(!(await p2.evaluate(() => Object.keys(localStorage))).includes('kairo.state'), `origine de prévisualisation (${origin}) ≠ origine de production (${new URL(PROD_URL).origin}) : stockage non partagé`);
  await p2.goto(PROD_URL);
  check(await p2.evaluate(() => localStorage.getItem('kairo.state')) === before, 'données de la production intactes après passage par la prévisualisation');
  check(!(await p2.locator('.k-test-ribbon').count()), 'la build de production n’affiche pas le bandeau de prévisualisation');
  await c2.close();
}

// 5. Réseau.
check(foreign.length === 0, `aucune requête hors de l’origine de prévisualisation (${foreign.join(', ') || 'aucune'})`);
check(errors.length === 0, `aucune erreur de page (${errors.join(' | ')})`);
await browser.close();

// 6. Parcours E2E complet sur la build de prévisualisation (clé de stockage du canal).
const src = fileURLToPath(new URL('./e2e.mjs', import.meta.url));
const gen = fileURLToPath(new URL('./.e2e-r51-preview.generated.mjs', import.meta.url));
const code = readFileSync(src, 'utf8');
const occurrences = code.split("'kairo.state'").length - 1;
check(occurrences > 0, `parcours complet : ${String(occurrences)} accès à la clé d’état redirigés vers « ${PREFIX}kairo.state »`);
writeFileSync(gen, code.replaceAll("'kairo.state'", `'${PREFIX}kairo.state'`));
const r = spawnSync(process.execPath, [gen, ...(shots ? [shots] : [])], { stdio: 'inherit', env: { ...process.env, E2E_URL: URL_ } });
rmSync(gen, { force: true });
if (r.status !== 0) fail('parcours E2E complet sur la build de prévisualisation');
console.log('E2E R5.1 PRÉVISUALISATION OK');
