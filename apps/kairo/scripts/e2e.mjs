/* global localStorage, document, fetch, navigator, window -- exécutés dans la page (page.evaluate) */
/**
 * Parcours Beta 0 de bout en bout dans Chromium (viewport téléphone) sur la build de production servie par
 * `vite preview` : manifest + service worker → onboarding hybride → programme → planning → séance Musculation (séries
 * réelles, chrono de repos persistant : pause, +15 s, rechargement) → fin de séance → historique → séance Course →
 * douleur → levée → fermeture / réouverture (persistance). Horloge du navigateur fixée au lundi 2026-10-05 puis
 * libre (le temps s'écoule normalement).
 * Usage : node scripts/e2e.mjs [dossier de captures] — le serveur doit tourner sur E2E_URL.
 */
import { chromium } from 'playwright';

const URL_ = process.env.E2E_URL ?? 'http://localhost:4173/';
const shots = process.argv[2];
const fail = (m) => { console.error(`ÉCHEC : ${m}`); process.exit(1); };
const check = (cond, m) => { if (!cond) fail(m); console.log(`ok  ${m}`); };

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
const page = await ctx.newPage();
await page.clock.install({ time: new Date('2026-10-05T07:30:00+02:00') });
await page.clock.resume();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const shot = async (n) => { if (shots) await page.screenshot({ path: `${shots}/${n}.png`, fullPage: false }); };
const text = () => page.locator('body').innerText();
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('kairo.state') ?? '{}'));

// PWA : manifest et service worker.
await page.goto(URL_);
const manifest = await page.evaluate(async () => { const l = document.querySelector('link[rel=manifest]'); return l ? (await fetch(l.href)).json() : null; });
check(manifest?.display === 'standalone' && manifest.icons.some((i) => i.sizes === '512x512'), 'manifest : standalone, icônes 192/512');
const sw = await page.evaluate(async () => { const r = await navigator.serviceWorker.ready; return Boolean(r.active); });
check(sw, 'service worker actif (hors ligne après le premier chargement)');
check(await page.evaluate(() => window.isSecureContext), `contexte sécurisé (${new URL(URL_).protocol.replace(':', '')})`);
// Installabilité selon Chrome lui-même (manifest, icônes, service worker, HTTPS ou localhost).
const cdp = await ctx.newCDPSession(page);
const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
check(installabilityErrors.length === 0, `installable comme PWA selon Chrome (${JSON.stringify(installabilityErrors)})`);

// Onboarding hybride.
await shot('01-bienvenue');
check(await page.getByText('BETA EXPÉRIMENTALE').first().isVisible(), 'statut expérimental visible dès l’accueil');
const start = page.getByRole('button', { name: 'Commencer' });
check(await start.isDisabled(), 'impossible de continuer sans accepter l’avertissement');
await page.getByLabel(/J’ai compris/).check();
await start.click();
check(!(await text()).includes('HYROX') && !(await text()).includes('Cross-training'), 'Cross-training et HYROX absents');
await page.getByRole('radio', { name: /^Musculation \+ Course/ }).click();
await shot('02-sports');
await page.getByRole('button', { name: 'Continuer' }).click();
await page.getByLabel('Durée (min)').fill('30');
await page.getByLabel('Distance (km)').fill('5');
await shot('03-objectifs');
await page.getByRole('button', { name: 'Continuer' }).click();
await page.getByLabel('Temps disponible le Mardi').selectOption('60');
await page.getByRole('button', { name: 'Continuer' }).click();
await shot('04-programme');
await page.getByRole('button', { name: 'Créer mon programme' }).click();
await page.getByRole('navigation', { name: 'Navigation principale' }).waitFor();
await shot('05-accueil');
check((await text()).includes('Commencer la séance'), 'accueil : prochaine séance et action principale');

await page.getByRole('button', { name: 'Planning', exact: true }).click();
await shot('06-planning');
const t = await text();
check(t.includes('Musculation') && t.includes('Course'), 'planning hybride : musculation et course');
check(!/str_full_body|running\.|WEEK_|COMPOSITION/.test(t), 'aucun code interne affiché');

// Séance Musculation.
await page.getByRole('button', { name: /^Musculation : Full body/ }).first().click();
await page.getByRole('button', { name: 'Commencer la séance' }).click();
const reps = page.getByLabel('Répétitions réalisées');
const kg = page.getByLabel('Charge (kg)');
await reps.nth(0).fill('6');
await kg.nth(0).fill('42.5');
await page.getByRole('button', { name: 'Cocher la série', exact: true }).first().click();
const timer = page.getByRole('timer', { name: 'Chrono de repos' });
check(await timer.isVisible(), 'chrono de repos démarré automatiquement');
await page.mouse.wheel(0, 2000);
check(await timer.isVisible(), 'chrono toujours visible après défilement');
await shot('07-serie-chrono');
await page.getByRole('button', { name: 'Mettre le repos en pause' }).click();
const paused = await timer.locator('.k-rest-time').innerText();
await page.waitForTimeout(1500);
check(await timer.locator('.k-rest-time').innerText() === paused, 'pause : le temps restant ne bouge plus');
await page.getByRole('button', { name: 'Ajouter 15 secondes' }).click();
await page.getByRole('button', { name: 'Reprendre le repos' }).click();
// Rechargement en pleine séance : série validée et chrono conservés.
await page.reload();
await page.getByRole('button', { name: 'Reprendre la séance' }).click();
check(await page.getByRole('button', { name: 'Décocher la série' }).count() === 1, 'rechargement : la série validée est conservée, aucune autre supposée faite');
check(await page.getByRole('timer', { name: 'Chrono de repos' }).isVisible(), 'rechargement : chrono conservé (échéance horodatée)');
await page.getByRole('button', { name: 'Passer' }).click();
await page.getByRole('button', { name: 'Terminer la séance' }).click();
await page.getByRole('radio', { name: 'J’ai adapté la séance' }).click();
await shot('08-fin');
await page.getByRole('button', { name: 'Enregistrer' }).click();
await page.getByText('Séance terminée').first().waitFor();
await page.getByRole('button', { name: 'Retour' }).click();
await page.getByRole('button', { name: 'Historique', exact: true }).click();
await shot('09-historique');
check((await text()).includes('6 × 42.5 kg'), 'historique : série réellement saisie (6 × 42,5 kg)');

// Séance Course.
await page.getByRole('button', { name: 'Planning', exact: true }).click();
await page.getByRole('button', { name: /^Course : / }).first().click();
await shot('10-course');
await page.getByRole('button', { name: 'Commencer la séance' }).click();
await page.getByRole('button', { name: 'Terminer la séance' }).click();
await page.getByRole('radio', { name: 'Tout s’est passé comme prévu' }).click();
await page.getByLabel(/Durée totale courue/).fill('31');
await page.getByLabel(/Distance/).fill('5.3');
await page.getByLabel('J’ai ressenti une douleur').check();
await page.getByRole('button', { name: 'Enregistrer' }).click();
await page.getByRole('button', { name: 'Retour' }).click();
await page.getByRole('button', { name: 'Accueil', exact: true }).click();
check((await text()).includes('La planification automatique est suspendue car une douleur a été signalée.'), 'douleur : planification suspendue affichée');
await shot('11-douleur');
await page.getByRole('button', { name: 'Ouvrir les réglages' }).click();
await page.getByRole('button', { name: 'La douleur a disparu' }).click();
await page.getByRole('button', { name: 'Je confirme' }).click();

// Fermeture / réouverture.
await page.reload();
await page.getByRole('button', { name: 'Historique', exact: true }).click();
const h = await text();
check(h.includes('6 × 42.5 kg') && h.includes('31 min · 5.3 km'), 'réouverture : historique Musculation et Course conservé');
const st = await state();
check(st.programmeState?.results?.length === 2, 'état : deux réalisations enregistrées par le programme');
check(st.safety?.activePain === null, 'état : pause douleur levée');

check(errors.length === 0, `aucune erreur console (${errors.join(' | ')})`);
await browser.close();
console.log('E2E OK');
