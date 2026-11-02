/* global document, window */
/**
 * Reprise 3A — jours Musculation après les disponibilités générales, Chromium 360 et 390 px (onboarding réel, données
 * fictives) : plus de jours dans l'assistant ; grille puis jours ; proposition = jours disponibles, suivie tant que rien
 * n'est choisi ; préférence conservée et incompatibilité signalée jusqu'à l'accord ; fréquence et récupération
 * expliquées ; aucun débordement horizontal.
 * Usage : E2E_URL=<build BÊTA> E2E_REKKA_V2=1 node scripts/e2e-strength-days.mjs [dossier de captures]
 */
import { chromium } from 'playwright';
import { completeStrengthPersonalization } from './lib/strength-onboarding.mjs';

const URL_ = process.env.E2E_URL ?? 'http://127.0.0.1:4174/';
const shots = process.argv[2];
const fail = (m) => { console.error(`ÉCHEC : ${m}`); process.exit(1); };
const check = (c, m) => { if (!c) fail(m); console.log(`ok  ${m}`); };
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const browser = await chromium.launch();
try {
  for (const width of [360, 390]) {
    const tag = `[${String(width)} px]`;
    const page = await browser.newPage({ viewport: { width, height: 800 }, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.clock.install({ time: new Date('2026-10-05T07:30:00+02:00') });
    await page.goto(URL_);
    await page.getByLabel(/J’ai compris/).check();
    await page.getByRole('button', { name: 'Commencer' }).click();
    await page.getByRole('radio', { name: /^Musculation Séances/ }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();
    check(await completeStrengthPersonalization(page, { sessionsPerWeek: 3, onStage: async (stage, w) => {
      if (stage === 4) check(await w.getByRole('group', { name: 'Jours possibles pour la musculation' }).count() === 0 && await w.locator('[data-strength-days-later]').isVisible(), `${tag} assistant : jours Musculation renvoyés après les disponibilités`);
    } }), `${tag} personnalisation complétée`);
    await page.getByRole('button', { name: 'Continuer' }).click();
    const group = page.getByRole('group', { name: 'Jours possibles pour la musculation' });
    const checked = () => group.getByRole('checkbox').evaluateAll((bs) => bs.flatMap((b, i) => (b.checked ? [i] : [])));
    const set = async (d, m) => page.getByLabel(`Temps disponible le ${d}`).selectOption(m);
    const gridFirst = await page.evaluate(() => {
      const grid = document.querySelector('[aria-label="Temps disponible le Lundi"]');
      const days = document.querySelector('[data-strength-days]');
      return Boolean(grid && days && (grid.compareDocumentPosition(days) & 4));
    });
    check(gridFirst, `${tag} étape Disponibilités : grille générale, puis jours Musculation`);
    check(JSON.stringify(await checked()) === '[0,2,4,5]' && await page.locator('[data-strength-days-proposal]').isVisible(), `${tag} proposition = jours disponibles par défaut (lundi, mercredi, vendredi, samedi)`);
    await set('Mardi', '60');
    check(JSON.stringify(await checked()) === '[0,1,2,4,5]', `${tag} proposition suivie quand un jour devient disponible`);
    if (shots) await page.screenshot({ path: `${shots}/3a-${String(width)}-01-proposition.png`, fullPage: true });
    await group.getByLabel('Samedi', { exact: true }).uncheck();
    await set('Lundi', '0');
    check(JSON.stringify(await checked()) === '[0,1,2,4]' && await page.locator('[data-strength-days-incompatible]').isVisible() && await page.getByRole('button', { name: 'Continuer' }).isDisabled(), `${tag} choix fait puis lundi retiré : signalé, conservé, étape bloquée`);
    if (shots) await page.screenshot({ path: `${shots}/3a-${String(width)}-02-incompatible.png`, fullPage: true });
    await page.getByRole('button', { name: 'Retirer Lundi des jours Musculation' }).click();
    check(JSON.stringify(await checked()) === '[1,2,4]' && !(await page.getByRole('button', { name: 'Continuer' }).isDisabled()), `${tag} retrait confirmé par l’utilisateur`);
    for (const [i, d] of DAYS.entries()) await set(d, i <= 2 ? '60' : '0');
    // Vendredi choisi devient indisponible : signalé, retrait seulement sur action.
    check(JSON.stringify(await checked()) === '[1,2,4]' && await page.locator('[data-strength-days-incompatible]').isVisible(), `${tag} vendredi devenu indisponible : signalé, non retiré d’office`);
    await page.getByRole('button', { name: 'Retirer Vendredi des jours Musculation' }).click();
    await group.getByLabel('Lundi', { exact: true }).check();
    check(JSON.stringify(await checked()) === '[0,1,2]' && /au plus 2 séances Musculation par semaine respectent 36 h/.test(await page.locator('[data-strength-days-recovery]').innerText()), `${tag} jours consécutifs : récupération expliquée (2 séances sur 3)`);
    if (shots) await page.screenshot({ path: `${shots}/3a-${String(width)}-03-recuperation.png`, fullPage: true });
    check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${tag} aucun débordement horizontal`);
    const blocks = await page.locator('[data-strength-days] .check').evaluateAll((ls) => ls.map((l) => l.getBoundingClientRect().height));
    check(blocks.every((h) => h >= 44), `${tag} cases des jours : cibles tactiles ≥ 44 px (${blocks.map((h) => String(Math.round(h))).join(',')} px)`);
    check(errors.length === 0, `${tag} aucune erreur de page (${errors.join(' | ')})`);
    await page.close();
  }
  console.log('E2E JOURS MUSCULATION OK');
} finally {
  await browser.close();
}
