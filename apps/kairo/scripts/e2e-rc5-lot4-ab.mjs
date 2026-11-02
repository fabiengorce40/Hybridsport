/* global document, window, localStorage */
/**
 * Reprise RC5 lot 4 — rotation Haut A / Bas A / Haut B / Bas B dans un vrai navigateur (Chromium mobile, 360 et 390 px),
 * onboarding réel (« Développer mes muscles », 4 séances), données fictives. Vérifie : Planning et séances nommés
 * « Haut du corps A / Bas du corps A / Haut du corps B / Bas du corps B » ; principaux orientés (poussée et tirage
 * horizontaux en Haut A, verticaux en Haut B ; genou en Bas A, hanche en Bas B) ; séance démarrée, série validée, phases
 * et chronomètre présents ; rechargement et hors ligne sans perte ; aucun débordement ; aucune erreur JavaScript.
 * Usage : E2E_URL=<build BÊTA> E2E_REKKA_V2=1 node scripts/e2e-rc5-lot4-ab.mjs [dossier de captures]
 */
import { chromium } from 'playwright';
import { completeStrengthPersonalization, EXPERIENCE } from './lib/strength-onboarding.mjs';

const URL_ = process.env.E2E_URL ?? 'http://127.0.0.1:4174/';
const KEY = 'rekka-beta:kairo.state';
const shots = process.argv[2];
const fail = (m) => { console.error(`ÉCHEC : ${m}`); process.exit(1); };
const check = (c, m) => { if (!c) fail(m); console.log(`ok  ${m}`); };
const TITLES = ['Haut du corps A', 'Bas du corps A', 'Haut du corps B', 'Bas du corps B'];
const browser = await chromium.launch();
try {
  for (const width of [360, 390]) {
    const tag = `[${String(width)} px]`;
    const context = await browser.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.clock.install({ time: new Date('2026-10-05T07:30:00+02:00') });
    await page.goto(URL_);
    await page.evaluate(async () => { await window.navigator.serviceWorker?.ready; });
    await page.getByLabel(/J’ai compris/).check();
    await page.getByRole('button', { name: 'Commencer' }).click();
    await page.getByRole('radio', { name: /^Musculation Séances/ }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();
    check(await completeStrengthPersonalization(page, { outcome: 'Développer mes muscles', sessionsPerWeek: 4, experience: EXPERIENCE.intermediate }), `${tag} personnalisation : développer mes muscles, 4 séances`);
    await page.getByRole('button', { name: 'Continuer' }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();
    await page.getByRole('button', { name: 'Créer mon programme' }).click();
    await page.getByRole('navigation', { name: 'Navigation principale' }).waitFor();

    // Planning : quatre séances nommées A/B, dans l'ordre Haut A, Bas A, Haut B, Bas B (semaine paire).
    await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: 'Planning', exact: true }).click();
    const names = await page.getByRole('button', { name: /^Musculation : / }).evaluateAll((bs) => bs.map((b) => (b.getAttribute('aria-label') ?? '').replace(/^Musculation : /, '').split(',')[0]));
    check(JSON.stringify(names) === JSON.stringify(TITLES), `${tag} Planning : ${names.join(' · ')}`);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${tag} Planning sans débordement horizontal`);
    if (shots) await page.screenshot({ path: `${shots}/lot4-${String(width)}-01-planning.png`, fullPage: true });

    // Orientation des principaux (données persistées : premier exercice de force de chaque séance).
    const mains = await page.evaluate((k) => {
      const st = JSON.parse(localStorage.getItem(k) ?? '{}');
      return Object.values(st.planner.weeks).flatMap((w) => w.requests).filter((r) => r.sport === 'strength' && r.status === 'planned').map((r) => {
        const items = r.record.data.session.blocks.filter((b) => b.kind !== 'warmup' && b.kind !== 'cooldown').flatMap((b) => b.items);
        return [r.intent.archetypeId, items.slice(0, 2).map((i) => i.refs?.slotId ?? '')];
      });
    }, KEY);
    const slotsOf = (a) => mains.find((m) => m[0] === a)?.[1] ?? [];
    check(/main_push_h/.test(slotsOf('str_upper_a')[0]) && /pull_h/.test(slotsOf('str_upper_a')[1]), `${tag} Haut A : poussée puis tirage horizontaux (${slotsOf('str_upper_a').join(', ')})`);
    check(/main_push_v/.test(slotsOf('str_upper_b')[0]) && /pull_v/.test(slotsOf('str_upper_b')[1]), `${tag} Haut B : poussée puis tirage verticaux (${slotsOf('str_upper_b').join(', ')})`);
    check(/main_knee/.test(slotsOf('str_lower_a')[0]) && /main_hip/.test(slotsOf('str_lower_b')[0]), `${tag} Bas A : genou ; Bas B : hanche`);

    // Séance Haut A : titre, phases, chronomètre, validation d'une série.
    await page.getByRole('button', { name: /^Musculation : Haut du corps A/ }).click();
    check(await page.getByText('Haut du corps A').first().isVisible(), `${tag} séance « Haut du corps A » ouverte`);
    await page.getByRole('button', { name: 'Commencer la séance' }).first().click();
    const checkin = page.locator('[data-checkin-form]');
    if (await checkin.count()) await checkin.getByRole('button', { name: 'Passer', exact: true }).click();
    await page.getByRole('timer', { name: 'Chronomètre global' }).waitFor();
    const line = page.locator('.k-set').filter({ has: page.getByRole('button', { name: 'Cocher la série', exact: true }) }).first();
    if (await line.getByLabel('Répétitions réalisées').inputValue() === '') await line.getByLabel('Répétitions réalisées').fill('8');
    if (await line.getByLabel('Charge (kg)').inputValue() === '') await line.getByLabel('Charge (kg)').fill('30');
    await line.getByRole('button', { name: 'Cocher la série', exact: true }).click();
    await page.getByRole('timer', { name: 'Chrono de repos' }).waitFor();
    check(await page.locator('[data-phase]').count() > 0 || await page.locator('.k-set').count() > 0, `${tag} séries affichées (phases du lot 3 si prescrites)`);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${tag} séance sans débordement horizontal`);
    if (shots) await page.screenshot({ path: `${shots}/lot4-${String(width)}-02-haut-a.png` });

    // Rechargement puis hors ligne : séance, série et nom conservés.
    const before = await page.evaluate((k) => localStorage.getItem(k), KEY);
    await page.reload();
    await page.getByRole('navigation', { name: 'Navigation principale' }).waitFor();
    check(await page.evaluate((k) => localStorage.getItem(k), KEY) === before, `${tag} rechargement : données identiques octet pour octet`);
    await context.setOffline(true);
    await page.reload();
    await page.getByRole('button', { name: 'Reprendre la séance', exact: true }).first().click();
    check(await page.getByRole('button', { name: 'Décocher la série', exact: true }).count() >= 1 && await page.getByText('Haut du corps A').first().isVisible(), `${tag} hors ligne : séance Haut A reprise, série conservée`);
    await context.setOffline(false);
    check(errors.length === 0, `${tag} aucune erreur JavaScript (${errors.join(' | ')})`);
    await context.close();
  }
  console.log('E2E RC5 LOT 4 ROTATION A/B OK');
} finally {
  await browser.close();
}
