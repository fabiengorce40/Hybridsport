/* global localStorage, document, window, navigator -- exécutés dans la page (page.evaluate) */
/**
 * RC5.4 — séance Musculation sur téléphone Android (Chromium, 360 et 390 px), build de production servie par
 * `vite preview` : phases des séries (montée en charge / travail), chronomètre global (affichage permanent, temps
 * horodaté), pause de séance distincte du repos, reprise après rechargement (fermeture de la PWA ou nouvelle version
 * chargée), hors ligne, fin de séance partielle, durée réelle et prévue dans l'historique, rapport prévu / réel.
 * Aucune donnée perdue : l'état enregistré est identique avant et après chaque rechargement.
 * Usage : node scripts/e2e-rc54.mjs [dossier de captures] — le serveur doit tourner sur E2E_URL.
 */
import { chromium } from 'playwright';

const URL_ = process.env.E2E_URL ?? 'http://localhost:4173/';
const shots = process.argv[2];
const fail = (m) => { console.error(`ÉCHEC : ${m}`); process.exit(1); };
const check = (cond, m) => { if (!cond) fail(m); console.log(`ok  ${m}`); };
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

for (const width of [360, 390]) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  const page = await ctx.newPage();
  await page.addLocatorHandler(page.locator('[data-checkin-form]'), async () => { await page.locator('[data-checkin-form]').getByRole('button', { name: 'Passer' }).click(); });
  await page.addLocatorHandler(page.locator('[data-equipment-missing]'), async () => { await page.getByLabel('Lieu d’entraînement').selectOption('preset.full_gym'); });
  await page.clock.install({ time: new Date('2026-10-05T07:30:00+02:00') });
  await page.clock.resume();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const shot = async (n) => { if (shots) await page.screenshot({ path: `${shots}/rc54-${String(width)}-${n}.png` }); };
  const raw = () => page.evaluate(() => localStorage.getItem('kairo.state'));
  const elapsed = async () => Number(await page.locator('[data-session-clock]').getAttribute('data-elapsed-s'));
  const noHScroll = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  const resumeHome = () => page.getByRole('button', { name: 'Reprendre la séance', exact: true }).click();

  // Programme (parcours d'accueil existant) puis séance Musculation.
  await page.goto(URL_);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.getByLabel(/J’ai compris/).check();
  await page.getByRole('button', { name: 'Commencer' }).click();
  await page.getByRole('radio', { name: /^Musculation \+ Course/ }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByLabel('Durée (min)').fill('30');
  await page.getByLabel('Distance (km)').fill('5');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByLabel('Temps disponible le Mardi').selectOption('60');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByRole('button', { name: 'Créer mon programme' }).click();
  await page.getByRole('navigation', { name: 'Navigation principale' }).waitFor();
  await page.getByRole('button', { name: 'Planning', exact: true }).click();
  await page.getByRole('button', { name: /^Musculation : / }).first().click();
  check(await page.locator('[data-session-clock]').count() === 0, `${String(width)} px : aucun chronomètre avant le lancement effectif`);
  await page.getByRole('button', { name: 'Commencer la séance' }).click();
  await page.locator('[data-session-clock]').waitFor();

  // Phases et états.
  const first = page.locator('section.k-ex').first();
  check(await first.getByRole('group', { name: /^Montée en charge,/ }).isVisible() && await first.getByRole('group', { name: /^Séries de travail,/ }).isVisible(), `${String(width)} px : phases « Montée en charge » et « Séries de travail » titrées`);
  check(await first.locator('.k-set[data-set-state="current"]').count() === 1, `${String(width)} px : une seule série « en cours »`);
  check(await noHScroll(), `${String(width)} px : aucun défilement horizontal`);
  const clockBox = await page.locator('[data-session-clock]').boundingBox();
  check(clockBox !== null && clockBox.y < 80 && clockBox.x + clockBox.width <= width, `${String(width)} px : chronomètre global dans la barre du haut, entièrement visible`);
  await shot('01-phases');

  // Validation des montées en charge et d'une série de travail : chrono de repos indépendant du chronomètre global.
  const warm = first.getByRole('group', { name: /^Montée en charge,/ });
  for (let i = 0; i < await warm.locator('.k-set').count(); i++) {
    const line = warm.locator('.k-set').nth(i);
    if (await line.getByLabel('Répétitions réalisées').inputValue() === '') await line.getByLabel('Répétitions réalisées').fill('5');
    if (await line.getByLabel('Charge (kg)').inputValue() === '') await line.getByLabel('Charge (kg)').fill('20');
    await line.getByRole('button', { name: 'Cocher la série' }).click();
  }
  const work1 = first.getByRole('group', { name: /^Séries de travail,/ }).locator('.k-set').first();
  if (await work1.getByLabel('Répétitions réalisées').inputValue() === '') await work1.getByLabel('Répétitions réalisées').fill('8');
  if (await work1.getByLabel('Charge (kg)').inputValue() === '') await work1.getByLabel('Charge (kg)').fill('40');
  await work1.getByRole('button', { name: 'Cocher la série' }).click();
  check(await page.getByRole('timer', { name: 'Chrono de repos' }).isVisible(), `${String(width)} px : chrono de repos démarré`);
  check(await page.locator('[data-session-clock]').isVisible(), `${String(width)} px : chronomètre global toujours visible avec le chrono de repos`);
  await shot('02-repos-et-chrono');

  // Arrière-plan / verrouillage 10 min : le temps continue (horodatages).
  const e0 = await elapsed();
  await page.clock.fastForward('10:00');
  await page.waitForTimeout(1200);
  const e1 = await elapsed();
  check(e1 - e0 >= 600 && e1 - e0 <= 605, `${String(width)} px : 10 min d’arrière-plan comptées une fois (${String(e0)} → ${String(e1)} s)`);

  // Pause de séance (distincte du repos), puis rechargement = fermeture de la PWA ou nouvelle version chargée.
  await page.getByRole('button', { name: 'Mettre la séance en pause (hors repos)' }).click();
  check(await page.getByText('Séance en pause').isVisible(), `${String(width)} px : « Séance en pause » affiché`);
  await shot('03-pause');
  const before = await raw();
  const ep = await elapsed();
  await page.clock.fastForward('05:00');
  await page.reload();
  check(await raw() === before, `${String(width)} px : rechargement en pleine séance — état enregistré identique octet pour octet`);
  await resumeHome();
  check(await elapsed() === ep, `${String(width)} px : pause conservée au redémarrage (temps figé ${String(ep)} s)`);
  check(await page.getByRole('button', { name: 'Décocher la série' }).count() >= 2, `${String(width)} px : séries validées conservées`);
  await page.getByRole('button', { name: 'Reprendre la séance après la pause' }).click();

  // Hors ligne : la séance reste utilisable (service worker), la saisie est enregistrée localement.
  await ctx.setOffline(true);
  await page.reload();
  await resumeHome();
  const work2 = page.locator('section.k-ex').first().getByRole('group', { name: /^Séries de travail,/ }).locator('.k-set').nth(1);
  if (await work2.getByLabel('Répétitions réalisées').inputValue() === '') await work2.getByLabel('Répétitions réalisées').fill('8');
  if (await work2.getByLabel('Charge (kg)').inputValue() === '') await work2.getByLabel('Charge (kg)').fill('40');
  await work2.getByRole('button', { name: 'Cocher la série' }).click();
  check(await work2.getAttribute('data-set-state') === 'done', `${String(width)} px : hors ligne, série validée et enregistrée`);
  await ctx.setOffline(false);

  // Navigation : quitter la séance et y revenir ne remet rien à zéro.
  const en = await elapsed();
  await page.getByRole('button', { name: 'Retour' }).click();
  await resumeHome();
  check(await elapsed() >= en, `${String(width)} px : navigation sans perte de temps`);

  // Fin de séance partielle, durée réelle et prévue, historique et rapport.
  await page.getByRole('button', { name: 'Terminer la séance' }).click();
  await page.getByRole('radio', { name: 'J’ai adapté la séance' }).click();
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await page.getByText('Séance terminée').first().waitFor();
  check(/prévue ≈ \d+ min/.test(await page.locator('[data-finished-duration]').innerText()), `${String(width)} px : fin de séance — durée réelle et prévue`);
  await shot('04-fin');
  await page.getByRole('button', { name: 'Retour' }).click();
  await page.getByRole('button', { name: 'Historique', exact: true }).click();
  check(/^Durée réelle .+ · prévue ≈ \d+ min/.test(await page.locator('[data-history-meta]').first().innerText()), `${String(width)} px : historique — durée réelle et prévue`);
  await page.locator('[data-duration-report] summary').click();
  check(/1 séance mesurée/.test(await page.locator('[data-duration-summary]').innerText()), `${String(width)} px : rapport prévu / réel`);
  check(await noHScroll(), `${String(width)} px : historique sans défilement horizontal`);
  await shot('05-historique-rapport');
  check(errors.length === 0, `${String(width)} px : aucune erreur JavaScript (${errors.join(' | ')})`);
  await ctx.close();
}
await browser.close();
console.log('E2E RC5.4 OK');
