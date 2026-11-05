/* global document -- exécuté dans le navigateur via page.evaluate */
/* Parcours autonome : séance réelle Musculation, repos et reprise après rechargement, 360/390 px. */
import { completeStrengthPersonalization } from './lib/strength-onboarding.mjs';
import { chromium } from 'playwright';
import { isV3, openCommands, closeCommands } from './lib/v3-ui.mjs';
import { mkdirSync } from 'node:fs';
const url = process.env.E2E_URL ?? 'http://127.0.0.1:4174/';
const shots = process.argv[2];
if (shots) mkdirSync(shots, { recursive: true });
const browser = await chromium.launch();
try {
  for (const width of [360, 390]) {
    const ctx = await browser.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addLocatorHandler(page.locator('[data-checkin-form]'), async () => { await page.locator('[data-checkin-form]').getByRole('button', { name: 'Passer' }).click(); });
    await page.addLocatorHandler(page.locator('[data-equipment-missing]'), async () => { await page.getByLabel('Lieu d’entraînement').selectOption('preset.full_gym'); });
    await page.clock.install({ time: new Date('2026-10-05T07:30:00+02:00') });
    await page.clock.resume();
    await page.goto(url);
    await page.getByLabel(/J’ai compris/).check();
    await page.getByRole('button', { name: 'Commencer' }).click();
    await page.getByRole('radio', { name: /^Musculation \+ Course/ }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();
    // V2.1/V2.2 : personnalisation Musculation obligatoire (7 étapes), choix explicites.
    if (!(await completeStrengthPersonalization(page))) throw new Error('personnalisation Musculation attendue');
    await page.getByLabel('Durée (min)').fill('30');
    await page.getByLabel('Distance (km)').fill('5');
    await page.getByRole('button', { name: 'Continuer' }).click();
    await page.getByLabel('Temps disponible le Mardi').selectOption('60');
    await page.getByRole('button', { name: 'Continuer' }).click();
    await page.getByRole('button', { name: 'Créer mon programme' }).click();
    await page.getByRole('button', { name: 'Planning', exact: true }).click();
    await page.getByRole('button', { name: /^Musculation : Full body/ }).first().click();
    await page.getByRole('button', { name: 'Commencer la séance' }).click();
    await page.locator('[data-live-workout="v3"], .k-workout').first().waitFor();
    await openCommands(page);
    await page.getByRole('button', { name: 'Mettre en pause le chronomètre global' }).click();
    const global = page.getByRole('timer', { name: 'Chronomètre global' });
    const globalPaused = await global.innerText();
    await page.waitForTimeout(1200);
    if (await global.innerText() !== globalPaused) throw new Error(`${width}: le chrono global en pause évolue`);
    const other = await ctx.newPage();
    await other.goto(url);
    await other.getByRole('button', { name: 'Reprendre la séance' }).click();
    await other.locator('[data-live-workout="v3"], .k-workout').first().waitFor();
    await openCommands(other);
    // RC5 lot 2 : chronomètre enregistré — le second onglet affiche la même pause, au même temps.
    if (await other.getByRole('timer', { name: 'Chronomètre global' }).innerText() !== globalPaused) throw new Error(`${width}: le second onglet ne relit pas la pause`);
    await other.close();
    if (await global.innerText() !== globalPaused) throw new Error(`${width}: le second onglet a changé le chrono de la première page`);
    await page.getByRole('button', { name: 'Reprendre le chronomètre global' }).click();
    await closeCommands(page);
    const reps = page.getByLabel('Répétitions réalisées').first();
    const kg = page.getByLabel('Charge (kg)').first();
    await reps.fill('6'); await kg.fill('42.5');
    await page.getByRole('button', { name: 'Cocher la série' }).first().click();
    const timer = page.getByRole('timer', { name: 'Chrono de repos' });
    await timer.waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Mettre le repos en pause' }).click();
    const paused = await timer.locator('.k-rest-time').innerText();
    await page.waitForTimeout(1200);
    if (await timer.locator('.k-rest-time').innerText() !== paused) throw new Error(`${width}: le repos en pause évolue`);
    await page.getByRole('button', { name: 'Ajouter 15 secondes' }).click();
    await page.getByRole('button', { name: 'Reprendre le repos' }).click();
    const series = page.getByRole('button', { name: 'Décocher la série' }).first();
    await series.scrollIntoViewIfNeeded();
    await openCommands(page);
    if (!await page.getByRole('timer', { name: 'Chronomètre global' }).isVisible()) throw new Error(`${width}: temps écoulé non visible`);
    await closeCommands(page);
    const smallNavigation = await page.locator('.k-nav-dot, .v3-exercise-nav button').evaluateAll((buttons) => buttons.filter((button) => button.getBoundingClientRect().height < 44 || button.getBoundingClientRect().width < 44).length);
    if (smallNavigation > 0) throw new Error(`${width}: ${smallNavigation} cibles de navigation trop petites`);
    if (shots) await page.screenshot({ path: `${shots}/${width}-seance-en-cours.png` });
    if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) throw new Error(`${width}: débordement horizontal`);
    await page.reload();
    await page.getByRole('button', { name: 'Reprendre la séance' }).click();
    await page.getByRole('button', { name: 'Décocher la série' }).first().waitFor();
    await page.getByRole('timer', { name: 'Chrono de repos' }).waitFor();
    // RC5 lot 2 : le chronomètre global est relu après rechargement (aucune remise à zéro proposée).
    await openCommands(page);
    await page.getByRole('timer', { name: 'Chronomètre global' }).waitFor();
    if (await page.getByText(/Le temps précédent ne peut pas être récupéré/).count()) throw new Error(`${width}: remise à zéro proposée au rechargement`);
    if (await page.getByRole('timer', { name: 'Chronomètre global' }).getAttribute('data-paused') !== 'false') throw new Error(`${width}: chronomètre global non relu en cours`);
    // V3 : l'éditeur affiche la série choisie ; la série validée est rouverte pour relire ses valeurs.
    if (await isV3(page)) { await closeCommands(page); await page.locator('.v3-exercise:not([hidden]) .v3-series-select').first().click(); }
    if (await page.getByLabel('Répétitions réalisées').first().inputValue() !== '6' || await page.getByLabel('Charge (kg)').first().inputValue() !== '42.5') throw new Error(`${width}: valeurs de série non conservées`);
    if (errors.length) throw new Error(`${width}: ${errors.join('; ')}`);
    console.log(`OK ${width}: série réelle, charge, repos, pause, +15 s, reprise et rechargement`);
    await ctx.close();
  }
} finally { await browser.close(); }
