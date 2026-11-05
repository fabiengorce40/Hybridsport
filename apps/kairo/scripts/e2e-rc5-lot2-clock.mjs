/* global localStorage, document, window, Event, Buffer */
/**
 * Reprise RC5 — lot 2 : chronomètre GLOBAL unique de séance Musculation dans un vrai navigateur (Chromium, 360 et 390 px),
 * build BÊTA (`apps/kairo/dist-android-test`), données fictives du dépôt uniquement.
 * Vérifie : démarrage au lancement effectif ; pause volontaire JAMAIS relancée par la validation d'une série ; arrière-plan
 * et verrouillage (horloge avancée, `visibilitychange`) ; rechargement ; fermeture / réouverture ; chrono de repos et chrono
 * global simultanés ; deux onglets ; fin de séance pendant une pause ; durées figées identiques après rechargement et après
 * export / import ; aucune erreur JavaScript ; aucun défilement horizontal.
 * Usage : node apps/kairo/scripts/e2e-rc5-lot2-clock.mjs (build attendue : `pnpm kairo:build:beta` puis prepare-android-test).
 */
import { chromium } from 'playwright';
import { openCommands, nextSetLine, openProfilePanel } from './lib/v3-ui.mjs';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const app = fileURLToPath(new URL('../', import.meta.url));
const dist = resolve(process.env.REKKA_DIST ?? resolve(app, 'dist-android-test'));
/** Données antérieures au lot 2 : séances terminées SANS durée figée (`timing`) ni chrono (`clock`). */
const fixture = (() => {
  const st = JSON.parse(readFileSync(resolve(app, 'tests/fixtures/r51-p5-w2.json'), 'utf8'));
  for (const l of Object.values(st.programmeLogs)) { delete l.timing; delete l.clock; }
  return JSON.stringify(st);
})();
const KEY = 'rekka-beta:kairo.state';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const path = resolve(dist, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (!path.startsWith(`${dist}/`)) { res.writeHead(403).end(); return; }
  try { res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream', 'cache-control': 'no-cache' }).end(readFileSync(path)); } catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${String(server.address().port)}/`;
const ok = (m) => console.log(`ok  ${m}`);

const raw = (page) => page.evaluate((k) => localStorage.getItem(k), KEY);
const stored = async (page) => JSON.parse((await raw(page)) ?? '{}');
const openLog = async (page) => Object.values((await stored(page)).programmeLogs ?? {}).find((l) => l.sport === 'strength' && !l.finishedAt);
const logById = async (page, id) => (await stored(page)).programmeLogs?.[id];
const timer = (page) => page.getByRole('timer', { name: 'Chronomètre global' });
const elapsed = async (page) => { await openCommands(page); return Number(await timer(page).getAttribute('data-elapsed-s')); };
const paused = async (page) => { await openCommands(page); return (await timer(page).getAttribute('data-paused')) === 'true'; };
const noHScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
/** Avance l'horloge de la page comme une mise en veille, puis simule le retour au premier plan. */
async function background(page, mmss) {
  await page.clock.fastForward(mmss);
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForTimeout(300);
}

async function openTab(context) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  await page.getByRole('navigation', { name: 'Navigation principale' }).waitFor();
  return { page, errors };
}
async function resumeSession(page) {
  await page.getByRole('button', { name: 'Reprendre la séance', exact: true }).first().click();
  await page.locator('[data-live-workout="v3"], .k-workout').first().waitFor();
  await openCommands(page);
  await timer(page).waitFor();
}
/** Coche la première série non validée (répétitions et charge remplies si vides). */
async function checkNextSet(page) {
  const before = await page.getByRole('button', { name: 'Décocher la série', exact: true }).count();
  const line = await nextSetLine(page);
  const reps = line.getByLabel('Répétitions réalisées');
  if (await reps.inputValue() === '') await reps.fill('8');
  const load = line.getByLabel('Charge (kg)');
  if (await load.count() && await load.inputValue() === '') await load.fill('20');
  await line.getByRole('button', { name: 'Cocher la série', exact: true }).click();
  await page.waitForFunction((n) => document.querySelectorAll('[aria-label="Décocher la série"]').length > n, before);
}

const browser = await chromium.launch();
try {
  for (const width of [360, 390]) {
    const W = `${String(width)} px`;
    const context = await browser.newContext({ viewport: { width, height: 800 }, isMobile: true, hasTouch: true, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
    await context.addInitScript(({ k, f }) => { if (localStorage.getItem(k) === null) localStorage.setItem(k, f); }, { k: KEY, f: fixture });
    await context.clock.install({ time: new Date('2026-10-12T09:00:00+02:00') });
    let { page, errors } = await openTab(context);
    const allErrors = [errors];

    // 1. Lancement effectif : aucun chrono avant ; démarrage depuis le Planning.
    await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: 'Planning', exact: true }).click();
    await page.getByRole('button', { name: /^Musculation :/ }).first().click();
    assert.equal(await timer(page).count(), 0);
    await page.getByRole('button', { name: 'Commencer la séance' }).first().click();
    const check = page.locator('[data-checkin-form]');
    if (await check.count()) await check.getByRole('button', { name: 'Passer', exact: true }).click();
    const main = page.getByRole('button', { name: 'Démarrer le bloc principal', exact: true });
    if (await main.count()) await main.click();
    await page.locator('[data-live-workout="v3"], .k-workout').first().waitFor();
    await openCommands(page);
    await timer(page).waitFor();
    const id = (await openLog(page)).requestId;
    assert.ok((await elapsed(page)) <= 2);
    assert.equal((await logById(page, id)).clock, undefined, 'aucune écriture du chrono avant une pause');
    ok(`${W} : chrono global démarré au lancement effectif, rien d’écrit tant qu’il n’y a pas de pause`);

    // 2. Arrière-plan / écran verrouillé 10 min : temps compté une fois.
    const e0 = await elapsed(page);
    await background(page, '10:00');
    const e1 = await elapsed(page);
    assert.ok(e1 - e0 >= 600 && e1 - e0 <= 602, `${String(e0)} → ${String(e1)}`);
    ok(`${W} : 10 min d’arrière-plan comptées une seule fois (${String(e0)} → ${String(e1)} s)`);

    // 3. Repos + chrono global simultanés ; pause globale sans toucher au repos.
    await checkNextSet(page);
    const rest = page.getByRole('timer', { name: 'Chrono de repos' });
    await rest.waitFor();
    await openCommands(page);
    assert.ok(await timer(page).isVisible());
    const restBefore = (await logById(page, id)).rest;
    await page.getByRole('button', { name: 'Mettre en pause le chronomètre global' }).click();
    await page.getByRole('button', { name: 'Reprendre le chronomètre global' }).waitFor();
    assert.deepEqual((await logById(page, id)).rest, restBefore);
    assert.ok(await rest.isVisible());
    ok(`${W} : chrono de repos et chrono global simultanés ; la pause globale ne touche pas au repos`);

    // 4. RÈGLE IMPÉRATIVE : série validée pendant la pause → pause conservée.
    const pausedAt = (await logById(page, id)).clock.pausedAt;
    const ep = await elapsed(page);
    await background(page, '03:00');
    await checkNextSet(page);
    assert.equal(await paused(page), true);
    assert.equal((await logById(page, id)).clock.pausedAt, pausedAt);
    await background(page, '02:00');
    assert.equal(await elapsed(page), ep);
    ok(`${W} : série validée pendant la pause — chrono toujours en pause, temps figé à ${String(ep)} s`);

    // 5. Rechargement pendant la pause : état identique octet pour octet, pause conservée.
    const before = await raw(page);
    await page.reload();
    await page.getByRole('navigation', { name: 'Navigation principale' }).waitFor();
    assert.equal(await raw(page), before);
    await resumeSession(page);
    assert.equal(await paused(page), true);
    assert.equal(await elapsed(page), ep);
    ok(`${W} : rechargement pendant la pause — données identiques, pause et temps conservés`);

    // 6. Deux onglets : la reprise dans l'onglet 2 est relue par l'onglet 1 (aucune double reprise).
    const t2 = await openTab(context);
    allErrors.push(t2.errors);
    await resumeSession(t2.page);
    assert.equal(await paused(t2.page), true);
    await t2.page.getByRole('button', { name: 'Reprendre le chronomètre global' }).click();
    await page.getByText('Données mises à jour depuis un autre onglet.').waitFor();
    await openCommands(page);
    await page.getByRole('button', { name: 'Mettre en pause le chronomètre global' }).waitFor();
    const afterResume = (await logById(page, id)).clock;
    assert.equal(afterResume.pausedAt, undefined);
    assert.ok(afterResume.pausedS >= 300 && afterResume.pausedS < 305, String(afterResume.pausedS));
    await t2.page.close();
    ok(`${W} : deux onglets — reprise faite dans un onglet, relue dans l’autre, pause comptée une fois (${String(Math.round(afterResume.pausedS))} s)`);

    // 7. Fermeture / réouverture de l'application : le temps a continué.
    const ec = await elapsed(page);
    await page.close();
    await context.clock.fastForward('04:00');
    ({ page, errors } = await openTab(context));
    allErrors.push(errors);
    await resumeSession(page);
    const er = await elapsed(page);
    assert.ok(er - ec >= 240 && er - ec <= 245, `${String(ec)} → ${String(er)}`);
    ok(`${W} : fermeture puis réouverture — 4 min comptées (${String(ec)} → ${String(er)} s)`);

    // 8. Fin de séance PENDANT une pause : pause close, durées figées.
    await openCommands(page);
    await page.getByRole('button', { name: 'Mettre en pause le chronomètre global' }).click();
    await page.getByRole('button', { name: 'Reprendre le chronomètre global' }).waitFor();
    const frozen = await elapsed(page);
    await background(page, '06:00');
    await page.getByRole('button', { name: 'Terminer la séance' }).click();
    await page.getByRole('radio', { name: 'J’ai adapté la séance' }).click();
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await page.getByText('Séance terminée').first().waitFor();
    const done = await logById(page, id);
    assert.equal(done.timing.activeS, frozen);
    assert.equal(done.clock.pausedAt, undefined);
    assert.equal(await timer(page).count(), 0);
    const finishedText = await page.locator('[data-finished-duration]').innerText();
    assert.match(finishedText, /pauses/);
    assert.ok(await noHScroll(page));
    ok(`${W} : fin pendant la pause — durée active figée ${String(done.timing.activeS)} s, pauses ${String(done.timing.pausedS)} s (« ${finishedText} »)`);

    // 9. Durées identiques après rechargement et après export / import.
    await background(page, '30:00');
    await page.reload();
    await page.getByRole('navigation', { name: 'Navigation principale' }).waitFor();
    assert.deepEqual((await logById(page, id)).timing, done.timing);
    await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: 'Progression', exact: true }).click();
    const meta = await page.locator('[data-history-meta]').first().innerText();
    const exported = await raw(page);
    // Import sur un autre appareil (contexte vierge, données d'origine) : même séance, mêmes durées, même affichage.
    const other = await browser.newContext({ viewport: { width, height: 800 }, isMobile: true, hasTouch: true, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
    await other.addInitScript(({ k, f }) => { if (localStorage.getItem(k) === null) localStorage.setItem(k, f); }, { k: KEY, f: fixture });
    await other.clock.install({ time: new Date('2026-10-13T20:00:00+02:00') });
    const dev = await openTab(other);
    allErrors.push(dev.errors);
    await dev.page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: 'Profil', exact: true }).click();
    await openProfilePanel(dev.page);
    await dev.page.getByLabel('Fichier de données à importer').setInputFiles({ name: 'sauvegarde.json', mimeType: 'application/json', buffer: Buffer.from(exported) });
    { const ok = dev.page.getByRole('button', { name: 'Remplacer mes données' }); await Promise.race([ok.waitFor().then(() => ok.click()).catch(() => {}), dev.page.getByText('Données importées.', { exact: true }).waitFor().catch(() => {})]); } // import confirmé (FAST TRACK V1) ; anciennes builds : import direct
    await dev.page.getByText('Données importées.').waitFor();
    assert.deepEqual((await logById(dev.page, id)).timing, done.timing);
    await dev.page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: 'Progression', exact: true }).click();
    assert.equal(await dev.page.locator('[data-history-meta]').first().innerText(), meta);
    assert.ok(await noHScroll(dev.page));
    await other.close();
    ok(`${W} : durées identiques après rechargement et après export / import (« ${meta} »)`);

    // 10. Séances historiques de la fixture (sans durée figée) : inchangées.
    const fx = JSON.parse(fixture).programmeLogs;
    const s = await stored(page);
    for (const [k, l] of Object.entries(fx)) assert.deepEqual(s.programmeLogs[k], l, `séance historique ${k} modifiée`);
    ok(`${W} : ${String(Object.keys(fx).length)} séances historiques sans durée figée relues à l’identique (aucun recalcul)`);

    assert.deepEqual(allErrors.flat(), []);
    ok(`${W} : aucune erreur JavaScript`);
    await context.close();
  }
  console.log('E2E RC5 LOT 2 CHRONOMÈTRE OK');
} finally {
  await browser.close();
  server.close();
}
