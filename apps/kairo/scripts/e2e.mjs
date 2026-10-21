/* global localStorage, document, fetch, navigator, window, getComputedStyle -- exécutés dans la page (page.evaluate) */
/**
 * Parcours Beta 0 de bout en bout dans Chromium (viewport téléphone) sur la build de production servie par
 * `vite preview` : manifest + service worker → onboarding hybride → programme → planning → séance Musculation (séries
 * réelles, chrono de repos persistant : pause, +15 s, rechargement) → fin de séance → historique → séance Course →
 * douleur → levée → fermeture / réouverture (persistance). Horloge du navigateur fixée au lundi 2026-10-05 puis
 * libre (le temps s'écoule normalement).
 * Usage : node scripts/e2e.mjs [dossier de captures] — le serveur doit tourner sur E2E_URL.
 */
import { readFileSync } from 'node:fs';
import { chromium, devices } from 'playwright';

const URL_ = process.env.E2E_URL ?? 'http://localhost:4173/';
const shots = process.argv[2];
const fail = (m) => { console.error(`ÉCHEC : ${m}`); process.exit(1); };
const check = (cond, m) => { if (!cond) fail(m); console.log(`ok  ${m}`); };
// C4 — séance Cross-training complète : le chrono du bloc principal démarre sur commande explicite (après l'échauffement).
/** Correctifs Musculation — parcours existants : contrôle pré-séance passé (état inconnu) s'il est ouvert. */
async function passCheck(pg) {
  const f = pg.locator('[data-checkin-form]');
  await f.waitFor({ state: 'visible', timeout: 1500 }).catch(() => {});
  // Le gestionnaire automatique peut l'avoir déjà passé : clic tolérant, puis attente de la fermeture.
  if (await f.count()) await f.getByRole('button', { name: 'Passer' }).click({ timeout: 3000 }).catch(() => {});
  await f.waitFor({ state: 'hidden', timeout: 5000 });
}
async function startMain(p) { await passCheck(p); const b = p.getByRole('button', { name: 'Démarrer le bloc principal' }); if (await b.count() > 0) await b.click(); }

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
// Correctifs Musculation (P0 / P1) — parcours EXISTANTS : le contrôle pré-séance est passé (« Passer » = état inconnu)
// et le lieu d'entraînement, désormais choisi explicitement, reprend l'ancienne valeur (« Salle complète »). Les
// scénarios dédiés (`manualChecks: true`) testent la feuille de contrôle et le choix du matériel eux-mêmes.
async function autoHandlers(pg) {
  await pg.addLocatorHandler(pg.locator('[data-checkin-form]'), async () => { await pg.locator('[data-checkin-form]').getByRole('button', { name: 'Passer' }).click(); });
  await pg.addLocatorHandler(pg.locator('[data-equipment-missing]'), async () => { await pg.getByLabel('Lieu d’entraînement').selectOption('preset.full_gym'); });
}
{
  const rawNewContext = browser.newContext.bind(browser);
  browser.newContext = async (o = {}) => {
    const { manualChecks, ...rest } = o;
    const c = await rawNewContext(rest);
    if (!manualChecks) { const rawNewPage = c.newPage.bind(c); c.newPage = async () => { const pg = await rawNewPage(); await autoHandlers(pg); return pg; }; }
    return c;
  };
}
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
check((await text()).includes('HYROX') && (await text()).includes('Cross-training'), 'HYROX (H2.5) et Cross-training (C3.5) proposés');
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
await passCheck(page);
await startMain(page);
const reps = page.getByLabel('Répétitions réalisées');
const kg = page.getByLabel('Charge (kg)');
await reps.nth(0).fill('6');
await kg.nth(0).fill('42.5');
await page.getByRole('button', { name: 'Cocher la série' }).first().click();
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
await passCheck(page);
await startMain(page);
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

// ——— Strength S1 dans le navigateur, jusqu'au DOM (horloge fixée au lundi 2026-10-05).
async function freshPage(initState, time = '2026-10-05T07:30:00+02:00') {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  const p = await c.newPage();
  await p.clock.install({ time: new Date(time) });
  await p.clock.resume();
  if (initState) await p.addInitScript((s) => { if (!localStorage.getItem('kairo.state')) localStorage.setItem('kairo.state', s); }, initState);
  await p.goto(URL_);
  return { c, p };
}
const strengthTitles = (p) => p.getByRole('button', { name: /^Musculation : / }).evaluateAll((bs) => bs.map((b) => (b.getAttribute('aria-label') ?? '').replace(/^Musculation : /, '').replace(/, [^,]+$/, '').replace(/ [A-Z]$/, '')));

// A — programme NEUF après S1, 4 séances de musculation créées depuis l'onboarding.
{
  const { c, p } = await freshPage();
  await p.getByLabel(/J’ai compris/).check();
  await p.getByRole('button', { name: 'Commencer' }).click();
  await p.getByRole('radio', { name: /^Musculation Séances/ }).click();
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.locator('.card', { has: p.getByRole('heading', { name: 'Musculation' }) }).getByLabel('Séances par semaine').selectOption('4');
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.getByRole('button', { name: 'Créer mon programme' }).click();
  await p.getByRole('button', { name: 'Planning', exact: true }).click();
  const titles = await strengthTitles(p);
  check(titles.length === 4 && titles.every((x, i) => (x === 'Haut du corps' || x === 'Bas du corps') && (i === 0 || x !== titles[i - 1])), `S1 programme neuf : 4 séances Haut / Bas en alternance dans le DOM (${titles.join(', ')})`);
  await c.close();
}

// B — programme créé AVANT S1 (AppState réel pré-S1) ouvert un lundi : semaine non commencée régénérée.
{
  const pre = readFileSync(new URL('../../../packages/app-core/tests/fixtures/pre-s1-state.json', import.meta.url), 'utf8');
  const { c, p } = await freshPage(pre);
  await p.getByRole('button', { name: 'Planning', exact: true }).click();
  const titles = await strengthTitles(p);
  check(titles.join(',') === 'Haut du corps,Bas du corps,Haut du corps,Bas du corps', `S1 programme pré-S1 : semaine régénérée dans le DOM (${titles.join(', ')})`);
  check((await p.locator('body').innerText()).includes('replanifiée avec la nouvelle version de KAIRO'), 'S1 programme pré-S1 : avis de replanification visible');
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem('kairo.state') ?? '{}'));
  check(st.planner?.weeks?.['2026-10-05']?.planningVersion === 'beta0-m31', 'S1 programme pré-S1 : semaine persistée à la version courante');
  await c.close();
}

// C — outil de test Beta : programme pré-S1 ouvert un mercredi (séance de lundi passée : semaine conservée), reset confirmé,
// nouveau programme composé par S1 ; lecture de l'AppState puis du DOM ; dates uniques.
{
  const pre = readFileSync(new URL('../../../packages/app-core/tests/fixtures/pre-s1-state.json', import.meta.url), 'utf8');
  const { c, p } = await freshPage(pre, '2026-10-07T09:00:00+02:00');
  await p.getByRole('button', { name: 'Planning', exact: true }).click();
  const before = await strengthTitles(p);
  check(before.join(',') === 'Full body,Full body,Full body,Full body' && (await p.locator('body').innerText()).includes('version précédente de KAIRO'), `reset Beta : avant, semaine pré-S1 conservée et signalée (${before.join(', ')})`);
  await p.getByRole('button', { name: 'Réglages', exact: true }).click();
  await p.getByRole('button', { name: 'Recréer mon programme de test' }).click();
  check(await p.getByRole('button', { name: 'Effacer et recréer' }).isDisabled(), 'reset Beta : impossible sans confirmation explicite');
  await p.getByLabel(/Je comprends que ces données seront définitivement effacées/).check();
  await p.getByRole('button', { name: 'Effacer et recréer' }).click();
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem('kairo.state') ?? '{}'));
  const reqs = (st.planner?.weeks?.['2026-10-05']?.requests ?? []).filter((r) => r.sport === 'strength' && r.status === 'planned');
  check(st.planner?.weeks?.['2026-10-05']?.planningVersion === 'beta0-m31' && reqs.every((r) => r.composition?.authority === 'provisional' && r.reasons.some((x) => x.code === 'PLAN.WEEK_COMPOSITION')), `reset Beta : AppState recomposé par S1 (${reqs.map((r) => `${r.date} ${r.intent?.archetypeId}`).join(', ')})`);
  await p.getByRole('button', { name: 'Planning', exact: true }).click();
  const after = await strengthTitles(p);
  // R5.2 — vue chronologique = grille (la liste est un catalogue par sport).
  await p.getByRole('button', { name: 'Grille' }).click();
  const days = await p.locator('[data-agenda-day] .agenda-date .n').allInnerTexts();
  await p.getByRole('button', { name: 'Liste' }).click();
  check(after.join(',') === 'Haut du corps,Bas du corps' && new Set(days).size === days.length && days.length === 7, `reset Beta : DOM recomposé, aucune date dupliquée (${after.join(', ')} ; ${days.join(' ')})`);
  await c.close();
}

// D — « Modifier le programme » sur smartphone Android (petit écran Galaxy S9+, puis Pixel 7) : programme pré-S1 dont la
// semaine est COMMENCÉE (séance de lundi terminée), ouvert le mercredi. Actions de l'assistant toujours visibles et
// cliquables (Playwright refuse un clic sur un élément recouvert), retour sans perte, validation, rechargement, semaine
// commencée protégée, première nouvelle semaine composée par Strength S1.
for (const deviceName of ['Galaxy S9+', 'Pixel 7']) {
  const started = readFileSync(new URL('../../../packages/app-core/tests/fixtures/pre-s1-started-state.json', import.meta.url), 'utf8');
  const c = await browser.newContext({ ...devices[deviceName], locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  const p = await c.newPage();
  await p.clock.install({ time: new Date('2026-10-07T09:00:00+02:00') });
  await p.clock.resume();
  await p.addInitScript((s) => { if (!localStorage.getItem('kairo.state')) localStorage.setItem('kairo.state', s); }, started);
  await p.goto(URL_);
  const tag = `[${deviceName}]`;
  const vh = p.viewportSize()?.height ?? 0;
  const actionsVisible = async (name) => {
    const b = p.getByRole('group', { name: 'Navigation de l’assistant' }).getByRole('button', { name });
    const box = await b.boundingBox();
    return box !== null && box.y >= 0 && box.y + box.height <= vh && await b.isVisible() && await b.isEnabled();
  };
  await p.getByRole('button', { name: 'Programme', exact: true }).click();
  await p.getByRole('button', { name: 'Modifier et recréer le programme' }).click();
  check(await p.getByRole('navigation', { name: 'Navigation principale' }).count() === 0, `${tag} modifier : assistant plein écran, sans barre de navigation`);
  await p.getByRole('radio', { name: /^Musculation \+ Course/ }).click();
  check(await p.getByRole('radio', { name: /^Musculation \+ Course/ }).getAttribute('aria-checked') === 'true', `${tag} sports : Musculation + Course sélectionné`);
  check(await actionsVisible('Continuer'), `${tag} sports : Continuer visible dans l’écran et cliquable`);
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.getByLabel('Prénom (facultatif)').fill('Fabien');
  await p.mouse.wheel(0, 4000);
  check(await actionsVisible('Continuer') && await actionsVisible('Retour'), `${tag} objectifs (défilé) : Retour et Continuer toujours visibles`);
  await p.getByRole('button', { name: 'Continuer' }).click();
  check(await actionsVisible('Continuer'), `${tag} disponibilités : Continuer visible`);
  await p.getByRole('button', { name: 'Retour' }).click();
  check(await p.getByLabel('Prénom (facultatif)').inputValue() === 'Fabien', `${tag} retour arrière : valeurs conservées`);
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.getByRole('button', { name: 'Continuer' }).click();
  const recap = await p.locator('body').innerText();
  check(recap.includes('Cette semaine est commencée') && recap.includes('lundi 12 octobre'), `${tag} récapitulatif : semaine commencée conservée, nouveau programme dès le 12 octobre`);
  check(await actionsVisible('Recréer mon programme'), `${tag} dernière étape : validation visible et cliquable`);
  await p.getByRole('button', { name: 'Recréer mon programme' }).click();
  await p.getByRole('navigation', { name: 'Navigation principale' }).waitFor();
  await p.reload();
  await p.getByRole('button', { name: 'Planning', exact: true }).click();
  const titles = await strengthTitles(p);
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem('kairo.state') ?? '{}'));
  const week = st.planner?.weeks?.['2026-10-05'];
  check(st.profile?.displayName === 'Fabien' && st.programmeState?.audit?.some((a) => a.reason.code === 'KAIRO.PROGRAMME_RECREATED'), `${tag} rechargement : programme modifié persisté`);
  check(titles.length === 4 && titles.every((x) => x === 'Full body') && week?.requests?.find((r) => r.requestId === '2026-10-05.strength.1') && st.programmeState?.results?.some((r) => r.requestId === '2026-10-05.strength.1'), `${tag} semaine commencée protégée : reprise telle quelle, séance réalisée conservée (${titles.join(', ')})`);
  const saved = JSON.stringify(st);
  await c.close();
  // Semaine suivante (lundi 12) : même stockage, nouvelle ouverture.
  const c2 = await browser.newContext({ ...devices[deviceName], locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  const p2 = await c2.newPage();
  await p2.clock.install({ time: new Date('2026-10-12T08:00:00+02:00') });
  await p2.clock.resume();
  await p2.addInitScript((s) => { if (!localStorage.getItem('kairo.state')) localStorage.setItem('kairo.state', s); }, saved);
  await p2.goto(URL_);
  await p2.getByRole('button', { name: 'Planning', exact: true }).click();
  const next = await strengthTitles(p2);
  const st2 = await p2.evaluate(() => JSON.parse(localStorage.getItem('kairo.state') ?? '{}'));
  const reqs = (st2.planner?.weeks?.['2026-10-12']?.requests ?? []).filter((r) => r.sport === 'strength');
  check(next.join(',') === 'Haut du corps,Bas du corps,Haut du corps,Bas du corps' && reqs.every((r) => r.reasons.some((x) => x.code === 'PLAN.WEEK_COMPOSITION')), `${tag} semaine suivante : composée par Strength S1 (${next.join(', ')})`);
  await c2.close();
}

// E — Strength S5 : EFFORT observé (répétitions en réserve) sur petit écran Android (Galaxy S9+). Séance Musculation,
// première série de travail validée, RIR choisi puis modifié sans perturber le chrono, rechargement, fin de séance,
// semaine suivante générée : l'observation parvient à Strength (track à e1RM observé). Aucun RIR ⇒ jamais 0.
{
  const pre = readFileSync(new URL('../../../packages/app-core/tests/fixtures/pre-s1-state.json', import.meta.url), 'utf8');
  const c = await browser.newContext({ ...devices['Galaxy S9+'], locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  const p = await c.newPage();
  await p.clock.install({ time: new Date('2026-10-05T07:30:00+02:00') });
  await p.clock.resume();
  await p.addInitScript((x) => { if (!localStorage.getItem('kairo.state')) localStorage.setItem('kairo.state', x); }, pre);
  await p.goto(URL_);
  const tag = '[S5 effort, Galaxy S9+]';
  const st = () => p.evaluate(() => JSON.parse(localStorage.getItem('kairo.state') ?? '{}'));
  await p.getByRole('button', { name: /^Musculation : Haut du corps/ }).first().click();
  await p.getByRole('button', { name: 'Commencer la séance' }).click();
  await passCheck(p);
  await startMain(p);
  const ex = p.locator('section.k-ex').first();
  const line = ex.locator('.k-set:not(.warm)').first();
  await line.getByLabel('Répétitions réalisées').fill('6');
  if ((await line.getByLabel('Charge (kg)').inputValue()) === '') await line.getByLabel('Charge (kg)').fill('40');
  check(await ex.getByRole('group', { name: /Répétitions en réserve/ }).count() === 0, `${tag} aucune saisie d’effort avant une série de travail validée`);
  await line.getByRole('button', { name: 'Cocher la série' }).click();
  const timer = p.getByRole('timer', { name: 'Chrono de repos' });
  check(await timer.isVisible(), `${tag} chrono de repos démarré par la validation de la série`);
  const restBefore = Object.values((await st()).programmeLogs ?? {})[0]?.rest;
  const effort = ex.getByRole('group', { name: /Répétitions en réserve/ });
  check(await effort.isVisible(), `${tag} pastilles « reps en réserve » sous la série validée`);
  // Playwright refuse un clic sur un élément recouvert (barre de navigation, chrono) : le clic prouve l'accessibilité.
  await effort.getByRole('button', { name: '2 répétitions en réserve' }).click();
  await effort.getByRole('button', { name: '3 répétitions en réserve' }).click();
  if (shots) { await effort.scrollIntoViewIfNeeded(); await p.screenshot({ path: `${shots}/s5-effort-galaxy.png` }); }
  const log1 = Object.values((await st()).programmeLogs ?? {})[0];
  check(log1?.sets?.some((x) => x.done && x.rir === 3), `${tag} RIR saisi puis modifié : 3 enregistré`);
  check(JSON.stringify(log1?.rest) === JSON.stringify(restBefore) && await timer.isVisible(), `${tag} chrono inchangé par la saisie d’effort`);
  await p.reload();
  await p.getByRole('button', { name: 'Reprendre la séance' }).click();
  check(await p.locator('section.k-ex').first().getByRole('button', { name: '3 répétitions en réserve' }).getAttribute('aria-pressed') === 'true', `${tag} rechargement : RIR observé conservé et réaffiché`);
  const nav = p.getByRole('navigation', { name: 'Navigation principale' });
  check(await nav.count() === 0 || !(await nav.isVisible()), `${tag} séance plein écran : aucune barre de navigation par-dessus les pastilles`);
  await p.getByRole('button', { name: 'Terminer la séance' }).click();
  await p.getByRole('radio', { name: 'J’ai adapté la séance' }).click();
  await p.getByRole('button', { name: 'Enregistrer' }).click();
  await p.getByText('Séance terminée').first().waitFor();
  const done = await st();
  const exposure = (done.strength?.exposures ?? []).find((x) => x.sets.some((z) => z.rir === 3));
  check(Boolean(exposure), `${tag} exposition enregistrée avec l’effort observé (RIR 3), aucun RIR inventé pour les autres séries`);
  check((done.strength?.exposures ?? []).every((x) => x.sets.every((z) => z.rir === undefined || z.rir === 3)), `${tag} séries sans saisie : effort inconnu (aucun RIR 0 écrit)`);
  const track = (done.strength?.tracks ?? []).find((t) => t.exerciseId === exposure?.exerciseId);
  check(track?.evidence?.e1rmBasis === 'observed', `${tag} track créée avec un e1RM OBSERVÉ (effort connu)`);
  const saved = JSON.stringify(done);
  await c.close();
  // Semaine suivante (lundi 12) : Strength reçoit l'observation (ancre déclarée, prescription issue de la track).
  const { c: c2, p: p2 } = await freshPage(saved, '2026-10-12T07:30:00+02:00');
  const next = await p2.evaluate(() => JSON.parse(localStorage.getItem('kairo.state') ?? '{}'));
  const reqs = (next.planner?.weeks?.['2026-10-12']?.requests ?? []).filter((r) => r.sport === 'strength');
  check(reqs.some((r) => r.reasons.some((x) => x.code === 'PLAN.WEEK_PRESCRIPTION' && (x.params.anchors ?? []).includes(exposure?.exerciseId))), `${tag} semaine suivante : l’exercice observé est ancré et déclaré à Strength`);
  check(await p2.getByRole('button', { name: /^Musculation : / }).count() > 0, `${tag} semaine suivante affichée`);
  await c2.close();
}


// F / G — Cross-training C3.5 sur PETIT écran Android (360 × 640) : onboarding Cross-training, séance C3 du planning,
// AMRAP (chrono, tours, pause, rechargement, fin, historique) puis EMOM (minutes, pause, rechargement, abandon).
// Horloge Playwright : avance contrôlée (aucune attente réelle de 12 minutes).
{
  const c = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  const p = await c.newPage();
  const perrors = [];
  p.on('pageerror', (e) => perrors.push(e.message));
  await p.clock.install({ time: new Date('2026-10-05T07:30:00+02:00') });
  await p.clock.resume();
  await p.goto(URL_);
  const tag = '[CT 360×640]';
  const st = () => p.evaluate(() => JSON.parse(localStorage.getItem('kairo.state') ?? '{}'));
  await p.getByLabel(/J’ai compris/).check();
  await p.getByRole('button', { name: 'Commencer' }).click();
  await p.getByRole('radio', { name: /^Cross-training/ }).click();
  await p.getByRole('button', { name: 'Continuer' }).click();
  check(await p.getByRole('button', { name: 'Continuer' }).isDisabled(), `${tag} intention Cross-training exigée (aucune valeur supposée)`);
  await p.getByRole('radio', { name: /^Mixte/ }).click();
  await p.getByLabel('Séances de Cross-training par semaine').selectOption('3');
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.getByRole('button', { name: 'Créer mon programme' }).click();
  await p.getByRole('navigation', { name: 'Navigation principale' }).waitFor();
  await p.getByRole('button', { name: 'Planning', exact: true }).click();
  const cards = p.getByRole('button', { name: /^Cross-training : Mixte/ });
  check(await cards.count() >= 2, `${tag} séances Cross-training C3 visibles dans le planning`);
  const pt = await p.locator('body').innerText();
  check(!/crosstraining\.|C3_|mixed_modal/.test(pt), `${tag} aucun code interne affiché`);
  check(pt.includes('AMRAP') && pt.includes('EMOM') && pt.includes('For time'), `${tag} semaine variée composée par C3 : AMRAP, EMOM, For time`);
  if (shots) await p.screenshot({ path: `${shots}/ct-01-planning.png` });

  // F — AMRAP
  await p.locator('.card', { hasText: 'AMRAP' }).first().click();
  check(await p.getByRole('heading', { name: 'Mixte', level: 1 }).isVisible() && (await p.locator('body').innerText()).includes('max de tours'), `${tag} AMRAP ouvert : intention, format, durée`);
  check(await p.getByLabel('Répétitions réalisées').count() === 0, `${tag} aucun repli Strength (pas de séries)`);
  await p.getByRole('button', { name: 'Commencer la séance' }).click();
  await passCheck(p);
  await startMain(p);
  const timer = p.getByRole('timer', { name: 'Chrono de la séance' });
  check(await timer.isVisible(), `${tag} chrono démarré`);
  await p.getByRole('button', { name: 'Tours complets : plus un' }).click();
  await p.getByRole('button', { name: 'Tours complets : plus un' }).click();
  for (let k = 0; k < 3; k += 1) await p.getByRole('button', { name: 'Répétitions du tour en cours : plus un' }).click();
  await p.clock.fastForward('03:00');
  await p.getByRole('button', { name: 'Pause' }).click();
  if (shots) await p.screenshot({ path: `${shots}/ct-02-amrap-pause.png` });
  const before = Object.values((await st()).programmeLogs ?? {})[0]?.ct;
  check(before?.rounds === 2 && before.partialReps === 3 && before.runningSince === null && before.accumulatedS >= 180, `${tag} pause : cumul figé, tours et répétitions persistés (${JSON.stringify(before)})`);
  await p.clock.fastForward('10:00');
  await p.reload();
  await p.getByRole('button', { name: 'Planning', exact: true }).click();
  await p.locator('.card', { hasText: 'En cours' }).first().click();
  check((await timer.innerText()).includes('EN PAUSE'), `${tag} rechargement : chrono toujours en pause, pas remis à zéro`);
  check((await p.getByRole('group', { name: 'Tours complets' }).innerText()).includes('2'), `${tag} rechargement : score conservé`);
  await p.getByRole('button', { name: 'Reprendre' }).click();
  await p.clock.fastForward('09:00');
  await p.getByRole('button', { name: 'Terminer la séance' }).click();
  const sheet = p.getByRole('dialog', { name: 'Fin de séance' });
  await sheet.getByRole('radio', { name: 'Tout s’est passé comme prévu' }).click();
  await sheet.getByRole('button', { name: 'Enregistrer' }).click();
  const done = await st();
  check(done.crosstraining?.realized?.[0]?.result?.kind === 'rounds_reps' && done.crosstraining.realized[0].result.rounds === 2 && done.crosstraining.realized[0].result.reps === 3, `${tag} résultat STRUCTURÉ enregistré dans l’historique du moteur`);
  await p.reload();
  await p.getByRole('button', { name: 'Historique', exact: true }).click();
  const h = await p.locator('body').innerText();
  check(h.includes('2 tours + 3 rép.') && h.includes('AMRAP'), `${tag} historique visible après rechargement`);
  if (shots) await p.screenshot({ path: `${shots}/ct-03-historique.png` });

  // G — EMOM : transition de minute, pause, rechargement, abandon.
  await p.getByRole('button', { name: 'Planning', exact: true }).click();
  await p.locator('.card', { hasText: 'EMOM' }).first().click();
  await p.getByRole('button', { name: 'Commencer la séance' }).click();
  await passCheck(p);
  await startMain(p);
  check((await timer.innerText()).includes('Minute 1'), `${tag} EMOM : minute 1`);
  await p.clock.fastForward('01:05');
  await p.waitForTimeout(1200);
  check((await timer.innerText()).includes('Minute 2'), `${tag} EMOM : passage à la minute 2`);
  if (shots) await p.screenshot({ path: `${shots}/ct-04-emom.png` });
  await p.getByRole('button', { name: 'Pause' }).click();
  await p.reload();
  await p.getByRole('button', { name: 'Planning', exact: true }).click();
  await p.locator('.card', { hasText: 'En cours' }).first().click();
  const t2 = await timer.innerText();
  check(t2.includes('EN PAUSE'), `${tag} EMOM : pause conservée après rechargement`);
  await p.getByRole('button', { name: 'Reprendre' }).click();
  await p.getByRole('button', { name: 'Terminer la séance' }).click();
  await sheet.getByRole('radio', { name: 'J’ai arrêté la séance' }).click();
  await sheet.getByRole('button', { name: 'Enregistrer' }).click();
  const after = await st();
  check(after.crosstraining?.realized?.length === 2 && after.crosstraining.realized[1].completion === 'abandoned', `${tag} EMOM abandonné : persisté, distinct d’une séance terminée`);
  await p.reload();
  check(Object.values((await st()).programmeLogs ?? {}).every((l) => l.finishedAt), `${tag} rechargement après fin : aucune séance redevenue en cours`);
  // H — For time : time cap atteint, progression partielle, douleur signalée (présence seule).
  await p.getByRole('button', { name: 'Planning', exact: true }).click();
  await p.locator('.card', { hasText: 'For time' }).first().click();
  await p.getByRole('button', { name: 'Commencer la séance' }).click();
  await passCheck(p);
  await startMain(p);
  check((await timer.innerText()).includes('Temps écoulé') && (await timer.innerText()).includes('Time cap'), `${tag} For time : chrono écoulé et time cap affichés`);
  await p.getByRole('button', { name: 'Tours complets : plus un' }).click();
  await p.getByRole('button', { name: 'Répétitions du tour en cours : plus un' }).click();
  const writes0 = JSON.stringify((await st()).programmeLogs);
  await p.clock.fastForward('30:00');
  await p.waitForTimeout(1200);
  check(JSON.stringify((await st()).programmeLogs) === writes0, `${tag} 30 min de chrono : aucune écriture d’état (horodatage seul)`);
  check((await timer.innerText()).includes('TIME CAP ATTEINT'), `${tag} For time : time cap atteint signalé (descriptif)`);
  await p.getByRole('button', { name: 'Terminer la séance' }).click();
  await sheet.getByRole('radio', { name: 'Time cap atteint' }).click();
  await sheet.getByRole('radio', { name: 'Tout s’est passé comme prévu' }).click();
  await sheet.getByRole('button', { name: 'Enregistrer' }).click();
  check(await sheet.getByRole('alert').isVisible(), `${tag} time cap déclaré « comme prévu » : incohérence signalée, rien d’enregistré`);
  await sheet.getByRole('radio', { name: 'J’ai adapté la séance' }).click();
  await sheet.getByLabel('J’ai ressenti une douleur').check();
  await sheet.getByRole('button', { name: 'Enregistrer' }).click();
  const ft = (await st()).crosstraining?.realized?.[2];
  check(ft?.result?.kind === 'capped_rounds' && ft.result.roundsCompleted === 1 && ft.result.partialReps === 1 && ft.completion === 'completed', `${tag} time cap : progression en tours enregistrée, séance « adaptée » (jamais un échec)`);
  check(ft?.pain === 'REPORTED' && (await st()).safety?.activePain !== null, `${tag} douleur signalée : transmise au moteur et pause douleur centrale`);
  check(perrors.length === 0, `${tag} aucune erreur de page (${perrors.join(' | ')})`);
  const savedCt = await p.evaluate(() => localStorage.getItem('kairo.state'));
  await c.close();

  // Boucle moteur → terrain → moteur : semaine suivante (douleur levée), la génération lit les séances réalisées.
  const c2 = await browser.newContext({ viewport: { width: 360, height: 640 }, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  const p2 = await c2.newPage();
  await p2.clock.install({ time: new Date('2026-10-12T07:30:00+02:00') });
  await p2.clock.resume();
  const lifted = JSON.parse(savedCt ?? '{}');
  lifted.safety = { activePain: null };
  await p2.addInitScript((x) => { if (!localStorage.getItem('kairo.state')) localStorage.setItem('kairo.state', x); }, JSON.stringify(lifted));
  await p2.goto(URL_);
  await p2.getByRole('navigation', { name: 'Navigation principale' }).waitFor();
  const next = await p2.evaluate(() => JSON.parse(localStorage.getItem('kairo.state') ?? '{}'));
  const ftId = ft?.sessionId;
  const reqs = (next.planner?.weeks?.['2026-10-12']?.requests ?? []).filter((r) => r.sport === 'crosstraining');
  const neg = reqs.flatMap((r) => r.reasons).find((x) => x.code === 'SAFETY.CROSSTRAINING.C3_HISTORY_NEGATIVE')?.params;
  // Politique d'historique TEST_ONLY : douleur ⇒ refus. C3 a lu l'exécution RÉELLE (séance For time, douleur signalée).
  check(reqs.length > 0 && neg?.sessionId === ftId && (neg.causes ?? []).includes('pain') && neg.action === 'refuse', `${tag} semaine suivante : C3 lit la séance réellement exécutée (${JSON.stringify(neg)})`);
  check(reqs.every((r) => r.status !== 'planned'), `${tag} semaine suivante : refus EXPLICITE (aucune séance inventée)`);
  await p2.getByRole('button', { name: 'Planning', exact: true }).click();
  const p2t = await p2.locator('body').innerText();
  check(/non planifiée/i.test(p2t) && p2t.includes('par précaution'), `${tag} refus visible dans le planning (« non planifiée, par précaution »)`);
  await c2.close();
}

// HYROX H2.5 — séances composées par H2, sur petits écrans Android (360 × 640, puis 412 × 915). Horloge Playwright
// contrôlée. A : endurance de force (stations chargées, charge réelle, pause, rechargement, fin, historique) ;
// B : course compromise (ordre station → course, étape active, course sans allure, transitions non chronométrées) ;
// C : time cap atteint (progression partielle, jamais « comme prévu ») ; D : abandon + douleur, génération suivante.
async function hrOnboard(p, role, sessions = '2') {
  await p.getByLabel(/J’ai compris/).check();
  await p.getByRole('button', { name: 'Commencer' }).click();
  await p.getByRole('radio', { name: /^HYROX/ }).click();
  await p.getByRole('button', { name: 'Continuer' }).click();
  const blocked = await p.getByRole('button', { name: 'Continuer' }).isDisabled();
  await p.getByLabel('Niveau d’entraînement général').selectOption('intermediate');
  await p.getByRole('radio', { name: new RegExp(`^${role}`) }).click();
  await p.getByRole('radio', { name: /^Préparer une course HYROX/ }).click();
  await p.getByLabel('Séances HYROX par semaine').selectOption(sessions);
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.getByRole('button', { name: 'Créer mon programme' }).click();
  await p.getByRole('navigation', { name: 'Navigation principale' }).waitFor();
  return blocked;
}
const hrState = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('kairo.state') ?? '{}'));
const HR_INTERNAL = /hybrid_race|ex\.[a-z]|after_station|run_station|BLOCKED|station_capacity|compromised_running|strength_endurance|TEST_ONLY|H2_/;
async function hrNoOverlap(p, tag) {
  const r = await p.evaluate(() => {
    const btns = [...document.querySelectorAll('.k-hr button, .k-dock button')].map((b) => b.getBoundingClientRect()).filter((b) => b.height > 0);
    // Bouton principal réellement au premier plan (ni barre de navigation, ni autre élément par-dessus).
    const dockUnderNav = [...document.querySelectorAll('.k-dock button')].filter((b) => { const r0 = b.getBoundingClientRect(); const el = document.elementFromPoint(r0.left + r0.width / 2, r0.top + r0.height / 2); return !(el && b.contains(el)) || r0.bottom > window.innerHeight; }).length;
    return { scroll: document.documentElement.scrollWidth > window.innerWidth + 1, small: btns.filter((b) => b.height < 44).length, dockUnderNav };
  });
  check(!r.scroll && r.small === 0 && r.dockUnderNav === 0, `${tag} aucun défilement horizontal, contrôles ≥ 44 px, bouton principal au-dessus de la barre de navigation (${JSON.stringify(r)})`);
}
{
  // ——— A : endurance de force (360 × 640)
  const c = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  const p = await c.newPage();
  const perrors = [];
  p.on('pageerror', (e) => perrors.push(e.message));
  await p.clock.install({ time: new Date('2026-10-05T07:30:00+02:00') });
  await p.clock.resume();
  await p.goto(URL_);
  const tag = '[HYROX A 360×640]';
  check(await hrOnboard(p, 'Endurance de force'), `${tag} type de séance HYROX exigé (aucune valeur supposée)`);
  await p.getByRole('button', { name: 'Planning', exact: true }).click();
  const cards = p.getByRole('button', { name: /^HYROX : Endurance de force/ });
  check(await cards.count() >= 1, `${tag} séances HYROX visibles dans le planning`);
  const pt = await p.locator('body').innerText();
  check(!HR_INTERNAL.test(pt), `${tag} aucun code interne affiché dans le planning`);
  check(/time cap/i.test(pt), `${tag} carte : time cap affiché`);
  const wk = Object.values((await hrState(p)).planner?.weeks ?? {})[0];
  check((wk?.simulation ?? []).includes('hybrid_race.h2.testGovernance'), `${tag} provenance : semaine marquée SIMULATION_ONLY HYROX`);
  if (shots) await p.screenshot({ path: `${shots}/hr-01-planning.png` });
  await cards.first().click();
  check(await p.getByRole('heading', { name: 'Endurance de force', level: 1 }).isVisible(), `${tag} HYROX Workout ouvert (rôle lisible)`);
  check(await p.getByLabel('Répétitions réalisées').count() === 0 && await p.getByRole('group', { name: 'Tours complets' }).count() === 0, `${tag} aucun repli Strength ni Cross-training`);
  check(await p.getByRole('list', { name: 'Parcours de la séance' }).isVisible(), `${tag} parcours prescrit visible avant départ`);
  await hrNoOverlap(p, tag);
  await p.getByRole('button', { name: 'Commencer la séance' }).click();
  await passCheck(p);
  await startMain(p);
  const timer = p.getByRole('timer', { name: 'Chrono de la séance' });
  check((await timer.innerText()).includes('plafond'), `${tag} time cap présenté comme un plafond, pas un objectif`);
  const nowCard = p.getByLabel('Maintenant');
  check(/station/i.test(await nowCard.innerText()) && /kg prévus/i.test(await nowCard.innerText()), `${tag} étape en cours : station chargée, charge prescrite`);
  const load = p.getByLabel(/Charge réellement utilisée/);
  const prescribed = Number(await load.getAttribute('placeholder'));
  await load.fill(String(prescribed - 2));
  await load.blur();
  if (shots) await p.screenshot({ path: `${shots}/hr-02-station.png` });
  await p.getByRole('button', { name: /Étape faite/ }).click();
  await p.clock.fastForward('04:00');
  await p.getByRole('button', { name: 'Pause' }).click();
  const before = Object.values((await hrState(p)).programmeLogs ?? {})[0]?.hr;
  check(before?.steps === 1 && before.runningSince === null && before.accumulatedS >= 240 && before.loads?.[0]?.kg === prescribed - 2, `${tag} pause : chrono figé, position et charge réelle persistées (${JSON.stringify(before)})`);
  await p.clock.fastForward('10:00');
  await p.reload();
  await p.getByRole('button', { name: 'Planning', exact: true }).click();
  await p.locator('.card', { hasText: 'En cours' }).first().click();
  check((await timer.innerText()).includes('EN PAUSE'), `${tag} rechargement : chrono toujours en pause`);
  check(/Étape 2 \//.test(await p.locator('body').innerText()), `${tag} rechargement : position conservée (étape 2)`);
  await p.getByRole('button', { name: 'Reprendre' }).click();
  for (let k = 0; k < 40 && await p.getByRole('button', { name: /[ÉéEe]tape faite/ }).isEnabled(); k += 1) await p.getByRole('button', { name: /[ÉéEe]tape faite/ }).click();
  check(await p.getByText('Toutes les étapes sont validées').isVisible(), `${tag} toutes les étapes validées`);
  await p.clock.fastForward('15:00');
  await p.getByRole('button', { name: 'Terminer la séance' }).click();
  const sheet = p.getByRole('dialog', { name: 'Fin de séance' });
  await sheet.getByRole('radio', { name: /J’ai adapté la séance/ }).click();
  await sheet.getByRole('button', { name: 'Enregistrer' }).click();
  const doneA = (await hrState(p)).hyrox?.realized?.[0];
  check(doneA?.result?.kind === 'completed' && doneA.completion === 'completed' && doneA.performedLoads?.[0]?.kg === prescribed - 2, `${tag} résultat structuré : terminée, charge réelle ≠ prescrite enregistrée`);
  check((await p.locator('body').innerText()).includes('prévus →'), `${tag} prescrit vs réalisé affiché`);
  await p.reload();
  await p.getByRole('button', { name: 'Historique', exact: true }).click();
  const hA = await p.locator('body').innerText();
  check(hA.includes('Terminée en') && hA.includes('HYROX') && !HR_INTERNAL.test(hA), `${tag} historique après rechargement : HYROX, résultat, aucun code interne`);
  if (shots) await p.screenshot({ path: `${shots}/hr-03-historique.png` });
  check(perrors.length === 0, `${tag} aucune erreur de page (${perrors.join(' | ')})`);
  await c.close();
}
{
  // ——— B / C : course compromise puis time cap (412 × 915)
  const c = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.6, isMobile: true, hasTouch: true, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  const p = await c.newPage();
  const perrors = [];
  p.on('pageerror', (e) => perrors.push(e.message));
  await p.clock.install({ time: new Date('2026-10-05T07:30:00+02:00') });
  await p.clock.resume();
  await p.goto(URL_);
  const tag = '[HYROX B 412×915]';
  await hrOnboard(p, 'Course compromise');
  await p.getByRole('button', { name: 'Planning', exact: true }).click();
  await p.getByRole('button', { name: /^HYROX : Course compromise/ }).first().click();
  const rail = await p.locator('.k-hr-step').evaluateAll((xs) => xs.map((x) => (x.classList.contains('run') ? 'run' : 'station')));
  check(rail.length >= 4 && rail.every((k, i) => k === (i % 2 === 0 ? 'station' : 'run')), `${tag} ordre prescrit : station → course → station → course (${rail.join(',')})`);
  await p.getByRole('button', { name: 'Commencer la séance' }).click();
  await passCheck(p);
  await startMain(p);
  const timer = p.getByRole('timer', { name: 'Chrono de la séance' });
  const nowCard = p.getByLabel('Maintenant');
  check(/station/i.test(await nowCard.innerText()), `${tag} étape 1 : station`);
  await p.getByRole('button', { name: /Étape faite/ }).click();
  const runText = await nowCard.innerText();
  check(/course/i.test(runText) && runText.includes('Allure libre') && !/\/km|min\/km/.test(runText), `${tag} étape 2 : course, distance seule, aucune allure inventée`);
  check((await p.locator('body').innerText()).includes('Transitions non chronométrées'), `${tag} transitions : aucune durée affichée`);
  if (shots) await p.screenshot({ path: `${shots}/hr-04-course.png` });
  await p.clock.fastForward('06:00');
  await p.reload();
  await p.getByRole('button', { name: 'Planning', exact: true }).click();
  await p.locator('.card', { hasText: 'En cours' }).first().click();
  check(!(await timer.innerText()).includes('EN PAUSE') && /Étape 2 \//.test(await p.locator('body').innerText()), `${tag} rechargement chrono en marche : position et chrono conservés`);
  for (let k = 0; k < 40 && await p.getByRole('button', { name: /[ÉéEe]tape faite/ }).isEnabled(); k += 1) await p.getByRole('button', { name: /[ÉéEe]tape faite/ }).click();
  await p.getByRole('button', { name: 'Terminer la séance' }).click();
  const sheet = p.getByRole('dialog', { name: 'Fin de séance' });
  await sheet.getByRole('radio', { name: 'Tout s’est passé comme prévu' }).click();
  await sheet.getByRole('button', { name: 'Enregistrer' }).click();
  const b = (await hrState(p)).hyrox?.realized?.[0];
  check(b?.result?.kind === 'completed' && b.completion === 'completed_as_prescribed' && b.structure === 'run_station_alternation', `${tag} séance terminée comme prévu, enregistrée`);

  // C — time cap atteint sur la seconde séance de la semaine.
  const tagC = '[HYROX C time cap]';
  await p.reload();
  await p.getByRole('button', { name: 'Planning', exact: true }).click();
  await p.locator('.card', { hasText: 'Prévue' }).filter({ hasText: 'Course compromise' }).first().click();
  await p.getByRole('button', { name: 'Commencer la séance' }).click();
  await passCheck(p);
  await startMain(p);
  await p.getByRole('button', { name: /Étape faite/ }).click();
  await p.getByRole('button', { name: /Étape faite/ }).click();
  await p.getByRole('button', { name: /Étape faite/ }).click();
  const writes0 = JSON.stringify((await hrState(p)).programmeLogs);
  // Au-delà de tout time cap possible du créneau (95 min) : aucune attente réelle.
  await p.clock.fastForward(95 * 60 * 1000);
  await p.waitForTimeout(1200);
  check(JSON.stringify((await hrState(p)).programmeLogs) === writes0, `${tagC} 95 min de chrono : aucune écriture d’état (horodatage seul)`);
  check((await timer.innerText()).includes('TIME CAP ATTEINT'), `${tagC} time cap atteint signalé (descriptif)`);
  await p.getByRole('button', { name: 'Terminer la séance' }).click();
  check(await sheet.getByRole('radio', { name: 'Tout s’est passé comme prévu' }).count() === 0, `${tagC} séance incomplète : « comme prévu » non proposé`);
  await sheet.getByRole('radio', { name: /Time cap atteint/ }).click();
  await sheet.getByRole('button', { name: 'Enregistrer' }).click();
  const capped = (await hrState(p)).hyrox?.realized?.[1];
  check(capped?.result?.kind === 'time_capped' && capped.result.roundsCompleted === 0 && capped.result.itemsCompletedInRound === 3 && capped.completion === 'completed', `${tagC} résultat : time cap, 0 tour + 3 étapes (jamais un échec, jamais « comme prévu »)`);
  await p.reload();
  await p.getByRole('button', { name: 'Historique', exact: true }).click();
  check((await p.locator('body').innerText()).includes('Time cap atteint · 0 tour complet + 3/4 étapes'), `${tagC} historique : time cap et progression lisibles`);
  check(perrors.length === 0, `${tag} aucune erreur de page (${perrors.join(' | ')})`);
  await c.close();
}
{
  // ——— D : abandon + douleur (programme créé un mercredi), puis génération de la semaine suivante.
  const c = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  const p = await c.newPage();
  await p.clock.install({ time: new Date('2026-10-07T09:00:00+02:00') });
  await p.clock.resume();
  await p.goto(URL_);
  const tag = '[HYROX D abandon + douleur]';
  await hrOnboard(p, 'Course compromise');
  await p.getByRole('button', { name: 'Planning', exact: true }).click();
  await p.getByRole('button', { name: /^HYROX : Course compromise/ }).first().click();
  await p.getByRole('button', { name: 'Commencer la séance' }).click();
  await passCheck(p);
  await startMain(p);
  await p.getByRole('button', { name: /Étape faite/ }).click();
  await p.getByRole('button', { name: /Étape faite/ }).click();
  await p.clock.fastForward('09:00');
  await p.getByRole('button', { name: 'Terminer la séance' }).click();
  const sheet = p.getByRole('dialog', { name: 'Fin de séance' });
  await sheet.getByRole('radio', { name: 'J’ai arrêté la séance' }).click();
  await sheet.getByLabel('J’ai ressenti une douleur').check();
  await sheet.getByRole('button', { name: 'Enregistrer' }).click();
  const d = await hrState(p);
  const ab = d.hyrox?.realized?.[0];
  check(ab?.completion === 'abandoned' && ab.result?.kind === 'abandoned' && ab.result.itemsCompletedInRound === 2 && ab.pain === 'REPORTED' && d.safety?.activePain !== null, `${tag} abandon persisté (progression conservée), douleur centrale`);
  await p.reload();
  await p.getByRole('button', { name: 'Historique', exact: true }).click();
  const h = await p.locator('body').innerText();
  check(h.includes('Arrêtée') && h.includes('Douleur signalée'), `${tag} historique : arrêtée, douleur signalée`);
  const saved = await p.evaluate(() => localStorage.getItem('kairo.state'));
  await c.close();
  const c2 = await browser.newContext({ viewport: { width: 360, height: 640 }, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  const p2 = await c2.newPage();
  await p2.clock.install({ time: new Date('2026-10-12T07:30:00+02:00') });
  await p2.clock.resume();
  const lifted = JSON.parse(saved ?? '{}');
  lifted.safety = { activePain: null };
  await p2.addInitScript((x) => { if (!localStorage.getItem('kairo.state')) localStorage.setItem('kairo.state', x); }, JSON.stringify(lifted));
  await p2.goto(URL_);
  await p2.getByRole('navigation', { name: 'Navigation principale' }).waitFor();
  const next = await hrState(p2);
  const reqs = (next.planner?.weeks?.['2026-10-12']?.requests ?? []).filter((r) => r.sport === 'hyrox');
  const neg = reqs.flatMap((r) => r.reasons).find((x) => x.code === 'SAFETY.HYROX.H2_HISTORY_NEGATIVE')?.params;
  check(reqs.length > 0 && neg?.sessionId === ab?.sessionId && (neg.causes ?? []).includes('pain') && neg.action === 'refuse', `${tag} génération suivante : H2 lit la séance réellement exécutée (${JSON.stringify(neg)})`);
  check(reqs.every((r) => r.status !== 'planned'), `${tag} semaine suivante : refus EXPLICITE (aucune séance inventée)`);
  await p2.getByRole('button', { name: 'Planning', exact: true }).click();
  check(/non planifiée/i.test(await p2.locator('body').innerText()), `${tag} refus visible dans le planning`);
  await c2.close();
}

// ——— M3.1 : séances composées mais non placées + HYROX Équilibré (360 × 640, mobile)
async function m31Onboard(p, { type, sessions, openDays, level = 'intermediate' }) {
  await p.getByLabel(/J’ai compris/).check();
  await p.getByRole('button', { name: 'Commencer' }).click();
  await p.getByRole('radio', { name: /^HYROX/ }).click();
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.getByLabel('Niveau d’entraînement général').selectOption(level);
  await p.getByRole('radio', { name: /^Préparer une course HYROX/ }).click();
  if (type) await p.getByRole('radio', { name: new RegExp(`^${type}`) }).click();
  await p.getByLabel('Séances HYROX par semaine').selectOption(sessions);
  await p.getByRole('button', { name: 'Continuer' }).click();
  for (const [i, d] of ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].entries()) await p.getByLabel(`Temps disponible le ${d}`).selectOption(openDays.includes(i) ? '60' : '0');
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.getByRole('button', { name: 'Créer mon programme' }).click();
  await p.getByRole('navigation', { name: 'Navigation principale' }).waitFor();
}
async function mobileFit(p, tag) {
  const r = await p.evaluate(() => {
    const btns = [...document.querySelectorAll('[data-unplaced] button')];
    const hidden = btns.filter((b) => { b.scrollIntoView({ block: 'center' }); const r0 = b.getBoundingClientRect(); const el = document.elementFromPoint(r0.left + r0.width / 2, r0.top + r0.height / 2); return !(el && b.contains(el)); }).length;
    return { scroll: document.documentElement.scrollWidth > window.innerWidth + 1, buttons: btns.length, hidden, small: btns.filter((b) => b.getBoundingClientRect().height < 44).length };
  });
  check(!r.scroll && r.buttons >= 2 && r.hidden === 0 && r.small === 0, `${tag} carte non planifiée lisible : CTA visibles (aucun sous la barre de navigation), ≥ 44 px, aucun défilement horizontal (${JSON.stringify(r)})`);
}
{
  const c = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  const p = await c.newPage();
  const perrors = [];
  p.on('pageerror', (e) => perrors.push(e.message));
  await p.clock.install({ time: new Date('2026-10-05T07:30:00+02:00') });
  await p.clock.resume();
  await p.goto(URL_);
  const tag = '[M3.1 A/D 360×640]';
  // Programme : Équilibré visible et compréhensible ; Continuer accessible.
  await p.getByLabel(/J’ai compris/).check();
  await p.getByRole('button', { name: 'Commencer' }).click();
  await p.getByRole('radio', { name: /^HYROX/ }).click();
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.getByRole('radio', { name: /^Préparer une course HYROX/ }).click();
  const eq = p.getByRole('radio', { name: /^Équilibré/ });
  check(await eq.isVisible() && (await eq.innerText()).includes('Varier') && await eq.getAttribute('aria-checked') === 'true', `${tag} Programme : Équilibré visible, expliqué, proposé par défaut pour préparer une course`);
  const cont = p.getByRole('button', { name: 'Continuer' });
  await cont.scrollIntoViewIfNeeded();
  check(await cont.isEnabled() && await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${tag} Programme : Continuer accessible, aucun défilement horizontal`);
  await p.reload();
  await m31Onboard(p, { sessions: '2', openDays: [0] });
  await p.getByRole('button', { name: 'Planning', exact: true }).click();
  const card = p.locator('[data-unplaced]').first();
  const ct = await card.innerText();
  check(/non planifiée/i.test(ct) && ct.includes('KAIRO n’a pas trouvé de créneau compatible cette semaine') && /time cap/i.test(ct) && !HR_INTERNAL.test(ct), `${tag} semaine saturée : séance composée mais non placée, nom, time cap, cause lisible, aucun code`);
  await mobileFit(p, tag);
  if (shots) await p.screenshot({ path: `${shots}/m31-unplaced-card.png` });
  const st0 = await hrState(p);
  const req0 = (st0.planner?.weeks?.['2026-10-05']?.requests ?? []).filter((r) => r.sport === 'hyrox');
  const un = req0.find((r) => r.status === 'unplaced' && r.composedFor);
  const pl = req0.find((r) => r.status === 'planned');
  check(un && pl && un.intent?.archetypeId !== pl.intent?.archetypeId, `${tag} D : Équilibré + M3 — un rôle placé (${pl?.intent?.archetypeId}), un autre composé mais non placé (${un?.intent?.archetypeId})`);
  // Voir : workout normal en aperçu, prescription persistée.
  await card.getByRole('button', { name: 'Voir la séance' }).click();
  const body = await p.locator('body').innerText();
  check(/non planifiée/i.test(body) && await p.getByRole('list', { name: 'Parcours de la séance' }).isVisible() && await p.getByRole('button', { name: 'Faire maintenant' }).isVisible(), `${tag} Voir : workout HYROX en aperçu (« non planifiée »), « Faire maintenant »`);
  check(JSON.stringify((await hrState(p)).planner) === JSON.stringify(st0.planner), `${tag} Voir : aucune recomposition, aucune écriture`);
  await p.getByRole('button', { name: 'Faire maintenant' }).click();
  await passCheck(p);
  await p.getByRole('button', { name: /Étape faite/ }).click();
  await p.clock.fastForward('05:00');
  await p.reload();
  await p.getByRole('button', { name: 'Planning', exact: true }).click();
  await p.locator('.card', { hasText: 'En cours' }).first().click();
  check(/Étape 2 \//.test(await p.locator('body').innerText()), `${tag} rechargement : séance non placée reprise à l’étape 2`);
  for (let k = 0; k < 40 && await p.getByRole('button', { name: /[ÉéEe]tape faite/ }).isEnabled(); k += 1) await p.getByRole('button', { name: /[ÉéEe]tape faite/ }).click();
  await p.getByRole('button', { name: 'Terminer la séance' }).click();
  const sheet = p.getByRole('dialog', { name: 'Fin de séance' });
  await sheet.getByRole('radio', { name: 'Tout s’est passé comme prévu' }).click();
  await sheet.getByRole('button', { name: 'Enregistrer' }).click();
  const st1 = await hrState(p);
  const res = st1.programmeState?.results?.find((r) => r.requestId === un?.requestId);
  const realized = st1.hyrox?.realized?.find((r) => r.sessionId === un?.requestId);
  check(res?.provenance === 'manual_from_unplaced' && res.date === '2026-10-05' && realized?.role === un?.intent?.archetypeId?.replace('hybrid_race.h2.', ''), `${tag} terminée : provenance manual_from_unplaced, jour réel, rôle réalisé = rôle non placé (${realized?.role})`);
  check(st1.planner?.weeks?.['2026-10-05']?.requests?.find((r) => r.requestId === un?.requestId)?.status === 'unplaced', `${tag} aucun placement réécrit`);
  await p.reload();
  await p.getByRole('button', { name: 'Historique', exact: true }).click();
  check((await p.locator('body').innerText()).includes('Terminée en'), `${tag} historique : séance réalisée visible`);
  const saved = await p.evaluate(() => localStorage.getItem('kairo.state'));
  check(perrors.length === 0, `${tag} aucune erreur de page (${perrors.join(' | ')})`);
  await c.close();
  // Génération suivante (C) : le programme lit le rôle réalisé ; rôles variés au fil des semaines.
  const c2 = await browser.newContext({ viewport: { width: 360, height: 640 }, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  const p2 = await c2.newPage();
  await p2.clock.install({ time: new Date('2026-10-12T07:30:00+02:00') });
  await p2.clock.resume();
  await p2.addInitScript((x) => { if (!localStorage.getItem('kairo.state')) localStorage.setItem('kairo.state', x); }, saved);
  await p2.goto(URL_);
  await p2.getByRole('navigation', { name: 'Navigation principale' }).waitFor();
  const st2 = await hrState(p2);
  const w1 = (st2.planner?.weeks?.['2026-10-05']?.requests ?? []).filter((r) => r.sport === 'hyrox').map((r) => r.intent?.archetypeId);
  const w2 = (st2.planner?.weeks?.['2026-10-12']?.requests ?? []).filter((r) => r.sport === 'hyrox').map((r) => r.intent?.archetypeId);
  check(w2.length === 2 && new Set([...w1, ...w2]).size === 4, `[M3.1 C] Équilibré fréquence 2 : quatre rôles différents sur deux semaines (${[...w1, ...w2].join(', ')})`);
  check(!w2.includes(un?.intent?.archetypeId), `[M3.1 C] le rôle réalisé manuellement est lu comme réalisé (non reproposé en premier)`);
  await c2.close();
}
{
  // B — séance BLOQUÉE (débutant : gouvernance H2 TEST_ONLY) : aucune possibilité de l'exécuter.
  const { c, p } = await freshPage();
  await m31Onboard(p, { sessions: '2', openDays: [0, 2, 4], level: 'beginner' });
  await p.getByRole('button', { name: 'Planning', exact: true }).click();
  const t = await p.locator('body').innerText();
  check(/non planifiée/i.test(t) && await p.getByRole('button', { name: 'Faire maintenant' }).count() === 0 && await p.getByRole('button', { name: 'Voir la séance' }).count() === 0 && await p.locator('[data-unplaced]').count() === 0, '[M3.1 B] séance bloquée : ni « Voir » ni « Faire maintenant », jamais exécutable');
  await c.close();
}

// ——— FIELD TEST DAY (360 × 640, mobile) : nouveau profil quatre sports, HYROX Équilibré, programme, planning, Strength
// (commencer, recharger, terminer, retour terrain), historique, Cross-training, HYROX, séance non placée (Voir, Faire
// maintenant), Journal Beta, export JSON + texte, rechargement complet : tout est conservé. Uniquement par l'interface.
{
  const c = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'fr-FR', timezoneId: 'Europe/Paris', acceptDownloads: true });
  const p = await c.newPage();
  const perrors = [];
  p.on('pageerror', (e) => perrors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') perrors.push(m.text()); });
  await p.clock.install({ time: new Date('2026-10-05T07:30:00+02:00') });
  await p.clock.resume();
  await p.goto(URL_);
  const tag = '[FIELD TEST DAY 360×640]';
  const st = () => p.evaluate(() => JSON.parse(localStorage.getItem('kairo.state') ?? '{}'));
  const body = () => p.locator('body').innerText();
  const CODES = /hybrid_race|ex\.[a-z]|str_full|running\.[a-z]|crosstraining\.|UNRESOLVED|TEST_ONLY|SIMULATION_ONLY|USER_REPORTED|manual_from_unplaced|composed_unplaced/;
  const nav = (name) => p.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name, exact: true }).click();
  const fit = async (t) => {
    const r = await p.evaluate(() => {
      const btns = [...document.querySelectorAll('.overlay button, .screen button')].filter((b) => b.getBoundingClientRect().height > 0);
      const covered = btns.filter((b) => { b.scrollIntoView({ block: 'center' }); const r0 = b.getBoundingClientRect(); const el = document.elementFromPoint(r0.left + r0.width / 2, r0.top + r0.height / 2); return !(el && (b.contains(el) || el.contains(b))); }).length;
      window.scrollTo(0, 0);
      return { scroll: document.documentElement.scrollWidth > window.innerWidth + 1, covered };
    });
    check(!r.scroll && r.covered === 0, `${tag} ${t} : aucun défilement horizontal, aucun bouton sous la barre de navigation (${JSON.stringify(r)})`);
  };
  const feedback = async (o) => {
    const card = p.getByLabel('Retour terrain');
    await card.waitFor();
    if (o.difficulty) await card.getByRole('radiogroup', { name: 'Difficulté ressentie' }).getByRole('radio', { name: o.difficulty, exact: true }).click();
    if (o.tolerance) await card.getByRole('radiogroup', { name: 'Tolérance' }).getByRole('radio', { name: o.tolerance, exact: true }).click();
    if (o.duration) await card.getByRole('radiogroup', { name: 'La durée de la séance vous a semblé' }).getByRole('radio', { name: o.duration, exact: true }).click();
    if (o.comment) await card.getByLabel(/Commentaire/).fill(o.comment);
    await card.getByRole('button', { name: 'Enregistrer mon ressenti' }).click();
    await p.locator('[data-field-feedback="saved"]').waitFor();
  };
  // 1–4. Nouveau profil, quatre sports, HYROX Équilibré, programme.
  await p.getByLabel(/J’ai compris/).check();
  await p.getByRole('button', { name: 'Commencer' }).click();
  await p.getByRole('radio', { name: /^Musculation \+ Course/ }).click();
  await p.getByLabel('Ajouter du Cross-training').check();
  await p.getByLabel('Ajouter HYROX').check();
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.getByRole('radio', { name: /^Mixte/ }).click();
  await p.getByLabel('Séances de Cross-training par semaine').selectOption('1');
  await p.getByLabel('Niveau d’entraînement général').selectOption('intermediate');
  await p.getByRole('radio', { name: /^Préparer une course HYROX/ }).click();
  check(await p.getByRole('radio', { name: /^Équilibré/ }).getAttribute('aria-checked') === 'true', `${tag} HYROX Équilibré sélectionné`);
  await p.getByLabel('Séances HYROX par semaine').selectOption('1');
  await p.getByLabel('Durée (min)').fill('30');
  await p.getByLabel('Distance (km)').fill('5');
  await p.getByRole('button', { name: 'Continuer' }).click();
  for (const [i, d] of ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].entries()) await p.getByLabel(`Temps disponible le ${d}`).selectOption(i < 5 ? '60' : '0');
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.getByRole('button', { name: 'Créer mon programme' }).click();
  await p.getByRole('navigation', { name: 'Navigation principale' }).waitFor();
  const home = await body();
  check(home.includes('Commencer la séance') && home.includes('1 séance supplémentaire disponible'), `${tag} accueil : prochaine séance + « 1 séance supplémentaire disponible »`);
  await nav('Programme');
  const prog = await body();
  check(prog.includes('Mode : Équilibré') && prog.includes('KAIRO alterne différents types de séances HYROX au fil des semaines.') && !/scientifiquement/.test(prog), `${tag} programme : Équilibré expliqué simplement (jamais « scientifiquement équilibré »)`);
  // 5. Planning : quatre sports, jours uniques, aucune séance en double, séance non placée distincte, aucun code.
  await nav('Planning');
  const plan = await body();
  check(['Musculation', 'Course', 'Cross-training', 'HYROX'].every((x) => plan.includes(x)) && !CODES.test(plan), `${tag} planning : quatre sports, aucun code interne`);
  // R5.2 — jours uniques lus dans la grille (vue chronologique), puis retour à la liste.
  await p.getByRole('button', { name: 'Grille' }).click();
  const days = await p.locator('[data-agenda-day] .agenda-date .n').allInnerTexts();
  const cards = await p.locator('[data-planning-grid] [data-request]').evaluateAll((xs) => xs.map((x) => x.getAttribute('data-request')));
  await p.getByRole('button', { name: 'Liste' }).click();
  check(days.length === 7 && new Set(days).size === 7 && cards.length === 5 && new Set(cards).size === cards.length, `${tag} planning : 7 jours uniques, aucune séance affichée deux fois (${days.join(' ')})`);
  check(await p.locator('[data-unplaced]').count() === 1 && /non planifiée/i.test(await p.locator('[data-unplaced]').innerText()) && plan.includes('Séance expérimentale'), `${tag} séance non placée distincte (NON PLANIFIÉE + raison), qualité « Séance expérimentale »`);
  await fit('planning');
  if (shots) await p.screenshot({ path: `${shots}/ft-01-planning.png`, fullPage: true });
  // 6–11. Strength : commencer, recharger, terminer, retour terrain, historique.
  await p.getByRole('button', { name: /^Musculation : / }).first().click();
  await p.getByRole('button', { name: 'Commencer la séance' }).click();
  await passCheck(p);
  await startMain(p);
  const line = p.locator('section.k-ex').first().locator('.k-set:not(.warm)').first();
  await line.getByLabel('Répétitions réalisées').fill('8');
  if ((await line.getByLabel('Charge (kg)').inputValue()) === '') await line.getByLabel('Charge (kg)').fill('30');
  await line.getByRole('button', { name: 'Cocher la série' }).click();
  await p.reload();
  await p.getByRole('button', { name: 'Reprendre la séance' }).click();
  check(await p.getByRole('button', { name: 'Décocher la série' }).count() === 1, `${tag} Strength : rechargement, série conservée`);
  await p.getByRole('button', { name: 'Terminer la séance' }).click();
  await p.getByRole('radio', { name: 'J’ai adapté la séance' }).click();
  await p.getByRole('button', { name: 'Enregistrer' }).click();
  await p.getByText('Séance terminée').first().waitFor();
  check((await body()).includes('Séance expérimentale : structure compatible'), `${tag} séance : explication courte de la qualité expérimentale (aucun code)`);
  // Rechargement AVANT retour terrain : le formulaire est toujours proposé (rien de perdu, rien de supposé).
  await p.reload();
  await nav('Historique');
  await p.locator('.card', { hasText: 'Adaptée' }).first().click();
  check(await p.locator('[data-field-feedback="form"]').isVisible(), `${tag} rechargement avant retour : formulaire de retour toujours proposé`);
  if (shots) await p.screenshot({ path: `${shots}/ft-02-feedback.png`, fullPage: true });
  await feedback({ difficulty: 'Adaptée', tolerance: 'Bonne', duration: 'Trop longue', comment: 'Charges cohérentes, séance un peu longue.' });
  const s1 = await st();
  const f1 = Object.values(s1.programmeLogs).find((l) => l.sport === 'strength')?.field;
  check(f1?.provenance === 'USER_REPORTED_FIELD_FEEDBACK' && f1.difficulty === 'adapted' && f1.tolerance === 'good' && f1.perceivedDuration === 'too_long', `${tag} retour terrain stocké avec la séance, provenance USER_REPORTED_FIELD_FEEDBACK`);
  check(await p.getByRole('button', { name: 'Enregistrer mon ressenti' }).count() === 0, `${tag} double retour impossible (formulaire remplacé par le résumé)`);
  await p.getByRole('button', { name: 'Retour' }).click();
  check(await p.getByRole('navigation', { name: 'Navigation principale' }).isVisible(), `${tag} navigation après fin de séance : retour à l’onglet, barre visible`);
  const h1 = await body();
  check(h1.includes('Ressenti : difficulté adaptée') && h1.includes('Durée réelle') && h1.includes('« Charges cohérentes'), `${tag} historique : durée réelle, ressenti, commentaire`);
  // 12–14. Cross-training.
  await nav('Planning');
  await p.getByRole('button', { name: /^Cross-training : / }).first().click();
  await p.getByRole('button', { name: 'Commencer la séance' }).click();
  await passCheck(p);
  await startMain(p);
  const w0 = JSON.stringify((await st()).programmeLogs);
  await p.clock.fastForward('05:00');
  await p.waitForTimeout(1200);
  check(JSON.stringify((await st()).programmeLogs) === w0, `${tag} Cross-training : 5 min de chrono sans aucune écriture d’état`);
  const plus = p.getByRole('button', { name: /plus un/ }).first();
  if (await plus.count() > 0) await plus.click();
  await p.clock.fastForward('10:00');
  await p.getByRole('button', { name: 'Terminer la séance' }).click();
  const sheet = p.getByRole('dialog', { name: 'Fin de séance' });
  await sheet.getByRole('radio', { name: 'J’ai adapté la séance' }).click();
  await sheet.getByRole('button', { name: 'Enregistrer' }).click();
  await feedback({ difficulty: 'Difficile' });
  // 15–17. HYROX.
  await p.getByRole('button', { name: 'Retour' }).click();
  await nav('Planning');
  await p.getByRole('button', { name: /^HYROX : / }).first().click();
  await p.getByRole('button', { name: 'Commencer la séance' }).click();
  await passCheck(p);
  await startMain(p);
  for (let k = 0; k < 40 && await p.getByRole('button', { name: /[ÉéEe]tape faite/ }).isEnabled(); k += 1) await p.getByRole('button', { name: /[ÉéEe]tape faite/ }).click();
  await p.clock.fastForward('12:00');
  await p.getByRole('button', { name: 'Terminer la séance' }).click();
  await sheet.getByRole('radio', { name: /J’ai adapté la séance/ }).click();
  await sheet.getByRole('button', { name: 'Enregistrer' }).click();
  await feedback({ tolerance: 'Moyenne', comment: 'Stations enchaînées, transitions non chronométrées : OK.' });
  await p.getByRole('button', { name: 'Retour' }).click();
  // 18–22. Séance non placée : P0 — lundi (Musculation le même jour), interférence signalée (RC4.5 lot C : avertissement
  // maintenable, jamais un démarrage sans confirmation ; parcours du maintien : scénario LOT C) ; samedi
  // (aucun conflit gouverné) : Voir, Faire maintenant, terminer, retour.
  await nav('Planning');
  const un0 = p.locator('[data-unplaced]').first();
  check(await un0.locator('[data-manual-refused]').count() === 0 && /Cette séance serait proche de votre séance/.test(await un0.locator('[data-manual-maintainable]').innerText()), `${tag} P0 : interférence gouvernée au jour réel signalée (avertissement maintenable, lot C), raison lisible`);
  await p.clock.setSystemTime(new Date('2026-10-10T09:00:00+02:00'));
  await p.reload();
  await nav('Planning');
  const un = p.locator('[data-unplaced]').first();
  const unId = await un.getAttribute('data-unplaced');
  const before = JSON.stringify((await st()).planner);
  await un.getByRole('button', { name: 'Voir la séance' }).click();
  check(/non planifiée/i.test(await body()) && await p.getByRole('button', { name: 'Faire maintenant' }).isVisible(), `${tag} Voir : aperçu de la séance non placée, « Faire maintenant »`);
  check(JSON.stringify((await st()).planner) === before, `${tag} Voir : aucune écriture`);
  await p.getByRole('button', { name: 'Faire maintenant' }).click();
  await passCheck(p);
  await p.getByRole('button', { name: 'Terminer la séance' }).click();
  await p.getByRole('radio', { name: 'Tout s’est passé comme prévu' }).click();
  await p.getByLabel(/Durée totale courue/).fill('28');
  await p.getByRole('button', { name: 'Enregistrer' }).click();
  await feedback({ difficulty: 'Facile', duration: 'Adaptée' });
  const s2 = await st();
  const res = s2.programmeState.results.find((r) => r.requestId === unId);
  check(res?.provenance === 'manual_from_unplaced' && res.date === '2026-10-10' && s2.planner.weeks['2026-10-05'].requests.find((r) => r.requestId === unId)?.status === 'unplaced', `${tag} Faire maintenant : date réelle, provenance manuelle, aucun faux placement`);
  check(s2.running.realized.some((r) => r.sessionId === unId), `${tag} Faire maintenant : exécution transmise au moteur Running`);
  await p.getByRole('button', { name: 'Retour' }).click();
  // 23–24. Journal Beta + export.
  await nav('Réglages');
  check((await p.getByLabel('KAIRO FIELD TEST').innerText()).includes('Planification beta0-m31'), `${tag} Réglages : KAIRO FIELD TEST, version, planification`);
  await p.getByRole('button', { name: /Journal Beta/ }).click();
  const jt = await body();
  check(jt.includes('4 réalisées') && jt.includes('4 retours terrain') && jt.includes('faite manuellement') && !CODES.test(jt), `${tag} Journal Beta : 4 séances réalisées, 4 retours, provenance manuelle lisible, aucun code`);
  await fit('journal');
  if (shots) await p.screenshot({ path: `${shots}/ft-03-journal.png`, fullPage: true });
  const [dl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Exporter le journal Beta (JSON)' }).click()]);
  const j = JSON.parse(readFileSync(await dl.path(), 'utf8'));
  const done = j.journal.filter((e) => e.execution?.finishedAt);
  check(j.kind === 'kairo.field_journal' && j.planningVersion === 'beta0-m31' && done.length === 4 && done.every((e) => e.feedback?.provenance === 'USER_REPORTED_FIELD_FEEDBACK' && e.quality?.verdict && e.prescription), `${tag} export JSON : 4 séances avec prescription, exécution, retour terrain, qualité Q1`);
  check(j.journal.some((e) => e.provenance === 'manual_from_unplaced') && j.weeks.length === 1 && j.profile && j.profile.displayName === undefined && j.programme?.audit, `${tag} export JSON : séance manuelle, semaines, profil sans prénom, décisions du programme`);
  const [dt] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Exporter le journal Beta (texte)' }).click()]);
  const txt = readFileSync(await dt.path(), 'utf8');
  check(txt.startsWith('KAIRO FIELD TEST') && txt.includes('retour terrain : difficulté difficile'), `${tag} export texte lisible`);
  // 25–26. Rechargement complet : tout est conservé.
  const saved = JSON.stringify(await st());
  await p.reload();
  await nav('Historique');
  const h2 = await body();
  // RC3.3 : l'historique liste aussi les courses libres (leur propre « Ressenti ») ; on compte les retours terrain des séances.
  check(await p.locator('[data-history-feedback]').count() === 4 && h2.includes('Faite hors planning'), `${tag} rechargement : historique, 4 retours, séance hors planning`);
  const after = await st();
  check(JSON.stringify(after.programmeLogs) === JSON.stringify(JSON.parse(saved).programmeLogs) && after.programmeState.results.length === 4, `${tag} rechargement : séances, retours et résultats intacts`);
  check(perrors.length === 0, `${tag} aucune erreur de page (${perrors.join(' | ')})`);
  await c.close();
}

// ——— FIELD TEST P0 (360 × 640) : un bloc n'est pas une séance complète. Cross-training (AMRAP) puis HYROX (endurance de
// force) : carte « Bloc principal », aucune fausse durée totale, mention dans la séance, réalisation, retour terrain
// (contenu / séance complète), historique, Journal Beta, export (FULL_SESSION_COMPOSITION_UNRESOLVED).
async function p0Block(p, { tag, cardName, label, missing, content, full, shot }) {
  const st = () => p.evaluate(() => JSON.parse(localStorage.getItem('kairo.state') ?? '{}'));
  await p.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: 'Planning', exact: true }).click();
  const card = p.getByRole('button', { name: cardName }).first();
  const ct = await card.innerText();
  const mins = [...ct.matchAll(/(\d+) min/g)].map((m) => Number(m[1]));
  check(ct.includes(label) && ct.includes('Bloc d’entraînement : pas une séance complète') && mins.every((m) => m <= 45), `${tag} carte : « ${label} », mention bloc, durée du bloc seulement (${ct.replace(/\n/g, ' | ')})`);
  await card.click();
  check((await p.locator('[data-block-label]').innerText()).length > 0 && /bloc principal uniquement/i.test(await p.locator('.k-block-note').innerText()) && (await p.locator('.k-block-note').innerText()).includes(missing), `${tag} séance : bloc identifié, éléments non composés nommés (${missing})`);
  if (shots) await p.screenshot({ path: `${shots}/${shot}.png` });
  await p.getByRole('button', { name: 'Commencer la séance' }).click();
  await passCheck(p);
  await startMain(p);
  const steps = p.getByRole('button', { name: /[ÉéEe]tape faite/ });
  for (let k = 0; k < 40 && await steps.count() > 0 && await steps.isEnabled(); k += 1) await steps.click();
  await p.clock.fastForward('12:00');
  await p.getByRole('button', { name: 'Terminer la séance' }).click();
  const sheet = p.getByRole('dialog', { name: 'Fin de séance' });
  await sheet.getByRole('radio', { name: /J’ai adapté la séance/ }).click();
  await sheet.getByRole('button', { name: 'Enregistrer' }).click();
  const fbc = p.getByLabel('Retour terrain');
  await fbc.waitFor();
  check(await fbc.getByRole('radiogroup', { name: 'La durée de la séance vous a semblé' }).count() === 0, `${tag} retour : aucune question « durée de la séance » pour un bloc`);
  await fbc.getByRole('radiogroup', { name: 'Ce contenu vous a semblé' }).getByRole('radio', { name: content, exact: true }).click();
  await fbc.getByRole('radiogroup', { name: 'Pour une séance complète, le contenu vous a semblé' }).getByRole('radio', { name: full, exact: true }).click();
  await fbc.getByRole('button', { name: 'Enregistrer mon ressenti' }).click();
  await p.locator('[data-field-feedback="saved"]').waitFor();
  const field = Object.values((await st()).programmeLogs).find((l) => l.field?.contentAmount)?.field;
  check(field?.provenance === 'USER_REPORTED_FIELD_FEEDBACK' && field.contentAmount && field.fullSessionAdequacy, `${tag} retour « contenu / séance complète » stocké (${JSON.stringify(field)})`);
  await p.getByRole('button', { name: 'Retour' }).click();
  await p.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: 'Historique', exact: true }).click();
  const h = await p.locator('body').innerText();
  check(h.includes('Bloc d’entraînement (pas une séance complète)') && h.includes(`contenu ${content.toLowerCase()}`), `${tag} historique : bloc d’entraînement, ressenti du contenu`);
  await p.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: 'Réglages', exact: true }).click();
  await p.getByRole('button', { name: /Journal Beta/ }).click();
  check((await p.locator('body').innerText()).includes('Bloc d’entraînement seulement : séance complète non composée par KAIRO'), `${tag} Journal Beta : bloc d’entraînement signalé`);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Exporter le journal Beta (JSON)' }).click()]);
  const j = JSON.parse(readFileSync(await dl.path(), 'utf8'));
  const e = j.journal.find((x) => x.feedback?.contentAmount);
  check(e?.composition?.scope === 'TRAINING_BLOCK' && e.composition.status === 'FULL_SESSION_COMPOSITION_UNRESOLVED', `${tag} export : FULL_SESSION_COMPOSITION_UNRESOLVED (${JSON.stringify(e?.composition)})`);
}
// ——— C4 (360 × 640) : séance Cross-training COMPLÈTE EXPÉRIMENTALE — carte, blocs (objectif, durée, exercices, doses),
// validation manuelle des blocs persistée au rechargement, chrono du bloc principal démarré explicitement, fin, export.
async function c4Full(p, tag) {
  const st = () => p.evaluate(() => JSON.parse(localStorage.getItem('kairo.state') ?? '{}'));
  await p.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: 'Planning', exact: true }).click();
  const card = p.getByRole('button', { name: /^Cross-training : Mixte/ }).first();
  const ct = await card.innerText();
  check(ct.includes('Séance complète expérimentale') && !ct.includes('pas une séance complète'), `${tag} carte : séance complète expérimentale, durée planifiée (${ct.replace(/\n/g, ' | ')})`);
  await card.click();
  // textContent : libellés en capitales par la feuille de style (le texte source reste vérifié).
  const body = await p.locator('body').textContent() ?? '';
  check(((await p.locator('[data-c4-status]').textContent()) ?? '').includes('Séance complète expérimentale') && body.includes('non validées scientifiquement'), `${tag} séance : statut expérimental explicite`);
  check(await p.locator('[data-c4-block="warmup_general"]').isVisible() && await p.locator('[data-c4-block="cooldown"]').count() === 1 && body.includes('Échauffement général') && body.includes('Retour au calme'), `${tag} blocs détaillés : échauffement, bloc principal, retour au calme`);
  if (shots) await p.screenshot({ path: `${shots}/c4-ct-seance.png`, fullPage: true });
  await p.getByRole('button', { name: 'Commencer la séance' }).click();
  await passCheck(p);
  const timer = p.getByRole('timer', { name: 'Chrono de la séance' });
  check(((await timer.textContent()) ?? '').includes('PRÊT'), `${tag} chrono du bloc principal non démarré pendant l’échauffement`);
  const marks = p.locator('[data-c4-block^="warmup"]').getByRole('button', { name: 'Marquer le bloc terminé' });
  const nw = await marks.count();
  for (let k = 0; k < nw; k += 1) await marks.first().click();
  const fit = await p.evaluate(() => ({ scroll: document.documentElement.scrollWidth > window.innerWidth + 1, small: [...document.querySelectorAll('[data-c4-block] button')].filter((b) => b.getBoundingClientRect().height < 44).length }));
  check(!fit.scroll && fit.small === 0, `${tag} mobile : aucun défilement horizontal, boutons de bloc ≥ 44 px (${JSON.stringify(fit)})`);
  const prog = await p.locator('[data-c4-progress]').innerText();
  check(nw >= 1 && prog.includes(`${String(nw)} /`), `${tag} progression : ${prog}`);
  await p.reload();
  await p.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: 'Planning', exact: true }).click();
  await p.locator('.card', { hasText: 'En cours' }).first().click();
  check((await p.locator('[data-c4-progress]').innerText()) === prog && ((await timer.textContent()) ?? '').includes('PRÊT'), `${tag} rechargement : blocs validés et chrono conservés`);
  await p.getByRole('button', { name: 'Démarrer le bloc principal' }).click();
  await p.clock.fastForward('05:00');
  await p.waitForTimeout(1200);
  check(!((await timer.textContent()) ?? '').includes('PRÊT'), `${tag} bloc principal démarré explicitement`);
  if (shots) await p.screenshot({ path: `${shots}/c4-ct-bloc-principal.png` });
  await p.getByRole('button', { name: 'Terminer la séance' }).click();
  const sheet = p.getByRole('dialog', { name: 'Fin de séance' });
  await sheet.getByRole('radio', { name: /J’ai adapté la séance/ }).click();
  await sheet.getByRole('button', { name: 'Enregistrer' }).click();
  await p.getByLabel('Retour terrain').waitFor();
  const s1 = await st();
  const log = Object.values(s1.programmeLogs ?? {})[0];
  check(log?.ct?.blocksDone?.length === nw && log.outcome?.ct?.elapsedS >= 300 && s1.crosstraining?.realized?.length === 1, `${tag} fin : blocs validés et résultat du bloc principal persistés (${JSON.stringify(log?.ct)})`);
  await p.getByRole('button', { name: 'Retour' }).click();
  await p.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: 'Réglages', exact: true }).click();
  await p.getByRole('button', { name: /Journal Beta/ }).click();
  const [dl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Exporter le journal Beta (JSON)' }).click()]);
  const j = JSON.parse(readFileSync(await dl.path(), 'utf8'));
  const e = j.journal.find((x) => x.sport === 'crosstraining' && x.composition?.c4);
  check(e?.composition?.scope === 'FULL_SESSION' && e.composition.c4.status === 'FULL_SESSION' && e.composition.c4.blocks.length >= 2, `${tag} export : statut C4 FULL_SESSION et blocs (${JSON.stringify(e?.composition?.c4?.status)})`);
}
// ——— C4.3 (360 × 640) : bloc de force DÉLÉGUÉ dans la séance Cross-training — ordre des blocs, saisie des séries
// (charge), chrono de repos, bloc terminé quand toutes les séries sont validées, rechargement, fin, expositions Strength.
async function c43Strength(p, tag) {
  const st = () => p.evaluate(() => JSON.parse(localStorage.getItem('kairo.state') ?? '{}'));
  await p.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: 'Planning', exact: true }).click();
  const card = p.getByRole('button', { name: /^Cross-training : Force \+ conditionnement/ }).first();
  const ct = await card.innerText();
  check(ct.includes('bloc de force (moteur Musculation)'), `${tag} carte : bloc de force annoncé (${ct.replace(/\n/g, ' | ')})`);
  await card.click();
  const order = await p.evaluate(() => [...document.querySelectorAll('[data-c4-block], [data-c4-main]')].map((x) => x.getAttribute('data-c4-block') ?? 'main'));
  const si = order.indexOf('strength');
  const sp = order.indexOf('warmup_specific');
  check(order[0] === 'warmup_general' && si > 0 && si < order.indexOf('main') && (sp < 0 || sp > si), `${tag} ordre : échauffement général → force → échauffement spécifique → bloc principal (${order.join(' > ')})`);
  if (shots) await p.screenshot({ path: `${shots}/c43-ct-force.png`, fullPage: true });
  await p.getByRole('button', { name: 'Commencer la séance' }).click();
  await passCheck(p);
  const block = p.locator('[data-c4-block="strength"]');
  await block.getByLabel('Charge (kg)').first().fill('40');
  await block.getByRole('button', { name: 'Cocher la série', exact: true }).first().click();
  const rest = p.getByRole('timer', { name: 'Chrono de repos' });
  check(await rest.isVisible(), `${tag} chrono de repos démarré après la série`);
  const fit = await p.evaluate(() => ({ scroll: document.documentElement.scrollWidth > window.innerWidth + 1, small: [...document.querySelectorAll('[data-c4-block="strength"] .k-check')].filter((b) => b.getBoundingClientRect().height < 44).length }));
  check(!fit.scroll && fit.small === 0, `${tag} mobile : aucun défilement horizontal, cases de série ≥ 44 px (${JSON.stringify(fit)})`);
  if (shots) await p.screenshot({ path: `${shots}/c43-ct-force-repos.png` });
  await p.reload();
  await p.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: 'Planning', exact: true }).click();
  await p.locator('.card', { hasText: 'En cours' }).first().click();
  check(await p.locator('[data-c4-block="strength"] .k-check.on').count() === 1 && await rest.isVisible(), `${tag} rechargement : série validée et repos conservés`);
  while (await block.getByRole('button', { name: 'Cocher la série', exact: true }).count() > 0) {
    if (await rest.isVisible()) await rest.getByRole('button', { name: /^(Passer|OK)$/ }).click();
    await block.getByRole('button', { name: 'Cocher la série', exact: true }).first().click();
  }
  check(await block.getByText('✓ Bloc terminé').isVisible(), `${tag} bloc de force terminé quand toutes ses séries sont validées`);
  if (await rest.isVisible()) await rest.getByRole('button', { name: /^(Passer|OK)$/ }).click();
  await p.getByRole('button', { name: 'Démarrer le bloc principal' }).click();
  await p.clock.fastForward('05:00');
  await p.getByRole('button', { name: 'Terminer la séance' }).click();
  const sheet = p.getByRole('dialog', { name: 'Fin de séance' });
  await sheet.getByRole('radio', { name: /J’ai adapté la séance/ }).click();
  await sheet.getByRole('button', { name: 'Enregistrer' }).click();
  await p.getByLabel('Retour terrain').waitFor();
  const s1 = await st();
  check(s1.crosstraining?.realized?.length === 1 && (s1.strength?.exposures?.length ?? 0) > 0, `${tag} fin : résultat enregistré, séries du bloc dans les expositions Strength (${String(s1.strength?.exposures?.length)})`);
}
for (const sport of ['ct', 'ct_strength', 'hyrox']) {
  const c = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'fr-FR', timezoneId: 'Europe/Paris', acceptDownloads: true });
  const p = await c.newPage();
  const perrors = [];
  p.on('pageerror', (e) => perrors.push(e.message));
  await p.clock.install({ time: new Date('2026-10-05T07:30:00+02:00') });
  await p.clock.resume();
  await p.goto(URL_);
  if (sport === 'ct') {
    await p.getByLabel(/J’ai compris/).check();
    await p.getByRole('button', { name: 'Commencer' }).click();
    await p.getByRole('radio', { name: /^Cross-training/ }).click();
    await p.getByRole('button', { name: 'Continuer' }).click();
    await p.getByRole('radio', { name: /^Mixte/ }).click();
    await p.getByLabel('Séances de Cross-training par semaine').selectOption('1');
    await p.getByRole('button', { name: 'Continuer' }).click();
    await p.getByRole('button', { name: 'Continuer' }).click();
    await p.getByRole('button', { name: 'Créer mon programme' }).click();
    await p.getByRole('navigation', { name: 'Navigation principale' }).waitFor();
    await c4Full(p, '[C4 Cross-training 360×640]');
  } else if (sport === 'ct_strength') {
    await p.getByLabel(/J’ai compris/).check();
    await p.getByRole('button', { name: 'Commencer' }).click();
    await p.getByRole('radio', { name: /^Cross-training/ }).click();
    await p.getByRole('button', { name: 'Continuer' }).click();
    await p.getByLabel('Niveau d’entraînement général').selectOption('intermediate');
    await p.getByRole('radio', { name: /^Force \+ conditionnement/ }).click();
    await p.getByLabel('Séances de Cross-training par semaine').selectOption('1');
    await p.getByRole('button', { name: 'Continuer' }).click();
    for (const d of ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']) await p.getByLabel(`Temps disponible le ${d}`).selectOption('60');
    await p.getByRole('button', { name: 'Continuer' }).click();
    await p.getByRole('button', { name: 'Créer mon programme' }).click();
    await p.getByRole('navigation', { name: 'Navigation principale' }).waitFor();
    await c43Strength(p, '[C4.3 force + conditionnement 360×640]');
  } else {
    await hrOnboard(p, 'Endurance de force', '1');
    await p0Block(p, { tag: '[P0 HYROX 360×640]', cardName: /^HYROX : Endurance de force/, label: 'Bloc HYROX', missing: 'le retour au calme', content: 'Beaucoup trop court', full: 'Très insuffisant', shot: 'p0-hyrox-bloc' });
  }
  check(perrors.length === 0, `[P0 ${sport}] aucune erreur de page (${perrors.join(' | ')})`);
  await c.close();
}

// ——— CORRECTIFS MUSCULATION (360 × 640, mobile) : pratiquant multisport prise de masse 3 séances/semaine + course +
// Cross-training. Matériel choisi explicitement (aucune présélection), Full Body A/B lisibles, contrôle pré-séance
// (genou P2 ⇒ séance adaptée ; épaule P2 ⇒ reportée), matériel indisponible, saisie des séries (contraste, aide,
// chrono jamais par-dessus la série suivante), rechargement, fin, historique.
{
  const c = await browser.newContext({ manualChecks: true, viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  const p = await c.newPage();
  const perrors = [];
  p.on('pageerror', (e) => perrors.push(e.message));
  await p.clock.install({ time: new Date('2026-10-05T07:30:00+02:00') });
  await p.clock.resume();
  await p.goto(URL_);
  const tag = '[MUSCULATION 360×640]';
  const st = () => p.evaluate(() => JSON.parse(localStorage.getItem('kairo.state') ?? '{}'));
  const snap = async (n) => { if (shots) await p.screenshot({ path: `${shots}/mu-${n}.png` }); };
  await p.getByLabel(/J’ai compris/).check();
  await p.getByRole('button', { name: 'Commencer' }).click();
  await p.getByRole('radio', { name: /^Musculation \+ Course/ }).click();
  await p.getByLabel('Ajouter du Cross-training').check();
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.getByLabel('Niveau d’entraînement général').selectOption('intermediate');
  await p.getByRole('button', { name: 'Masse musculaire' }).click();
  const freq = p.getByLabel('Séances par semaine').first();
  const opts = await freq.locator('option').evaluateAll((os) => os.map((o) => ({ v: o.value, d: o.disabled, t: o.textContent })));
  check(opts.filter((o) => o.d).map((o) => o.v).join(',') === '5,6' && opts.some((o) => /pas encore pris en charge/.test(o.t ?? '')), `${tag} 5 et 6 séances affichées comme non prises en charge (${JSON.stringify(opts.map((o) => o.t))})`);
  await freq.selectOption('3');
  await p.getByRole('radio', { name: /^Mixte/ }).click();
  await p.getByLabel('Séances de Cross-training par semaine').selectOption('1');
  await p.getByLabel('Durée (min)').fill('30');
  await p.getByRole('button', { name: 'Continuer' }).click();
  for (const [i, d] of ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].entries()) await p.getByLabel(`Temps disponible le ${d}`).selectOption(i === 6 ? '0' : i === 5 ? '90' : '75');
  await p.getByRole('button', { name: 'Continuer' }).click();
  const create = p.getByRole('button', { name: 'Créer mon programme' });
  check(await create.isDisabled() && await p.locator('[data-equipment-missing]').isVisible(), `${tag} aucun matériel présélectionné : création bloquée tant que le lieu n’est pas choisi`);
  await snap('01-materiel-a-choisir');
  await p.getByLabel('Lieu d’entraînement').selectOption('preset.commercial_gym');
  await p.locator('[data-equipment-summary] summary').click();
  const eqText = await p.locator('[data-equipment-summary]').innerText();
  check(!/Pec deck|Hack squat|Élévations latérales/.test(eqText), `${tag} salle commerciale : aucune machine pec deck / hack squat supposée (${eqText.slice(0, 80)}…)`);
  await snap('02-materiel-choisi');
  await create.click();
  await p.getByRole('navigation', { name: 'Navigation principale' }).waitFor();
  const s0 = await st();
  check(typeof s0.profile?.equipment?.confirmedAt === 'string' && s0.profile.equipment.presetId === 'preset.commercial_gym', `${tag} matériel confirmé (horodaté)`);
  check(!(await p.locator('[data-equipment-confirm]').count()), `${tag} aucun bandeau de confirmation pour un profil neuf`);
  await p.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: 'Planning', exact: true }).click();
  const cards = await p.getByRole('button', { name: /^Musculation : / }).evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label') ?? ''));
  check(cards.length === 3 && cards.every((x) => /Full body [A-C]/.test(x)) && new Set(cards.map((x) => /Full body ([A-C])/.exec(x)?.[1])).size >= 2, `${tag} 3 × Full Body, variantes visibles (${cards.map((x) => x.split(',')[0]).join(' | ')})`);
  await snap('03-planning-variantes');
  // Séance 1 : genou P2 ⇒ séance adaptée.
  await p.getByRole('button', { name: /^Musculation : / }).first().click();
  check(await p.locator('[data-strength-insight]').isVisible(), `${tag} séance : variante, mouvements dominants et groupes sollicités expliqués`);
  await p.getByRole('button', { name: 'Commencer la séance' }).click();
  const dlg = p.getByRole('dialog', { name: 'Avant de commencer' });
  check(await dlg.isVisible() && Object.keys((await st()).programmeLogs ?? {}).length === 0, `${tag} « Commencer » ⇒ contrôle pré-séance, rien démarré avant réponse`);
  await snap('04-controle-pre-seance');
  // Question douleur sans réponse : validation refusée, jamais lue comme « aucune douleur ».
  await dlg.getByRole('button', { name: 'Valider et commencer' }).click();
  check(/Répondez à la question douleur/.test(await dlg.getByRole('alert').innerText()) && Object.keys((await st()).programmeLogs ?? {}).length === 0 && ((await st()).checkIns ?? []).length === 0, `${tag} question douleur sans réponse ⇒ validation refusée, rien enregistré`);
  await dlg.getByRole('radiogroup', { name: 'Avez-vous une douleur en ce moment ?' }).getByRole('radio', { name: 'Oui' }).click();
  await dlg.getByRole('button', { name: 'Genou' }).click();
  await dlg.getByRole('radiogroup', { name: 'Intensité · Genou' }).getByRole('radio', { name: 'Douleur qui gêne certains mouvements' }).click();
  await dlg.getByRole('radiogroup', { name: 'Fatigue aujourd’hui' }).getByRole('radio', { name: 'Faible' }).click();
  await snap('05-controle-genou');
  await dlg.getByRole('button', { name: 'Valider et commencer' }).click();
  const adapt = p.locator('[data-adaptation]');
  check(await adapt.isVisible() && /genou/.test(await adapt.innerText()), `${tag} genou P2 ⇒ séance adaptée, changements affichés (${(await adapt.innerText()).replace(/\n/g, ' | ').slice(0, 160)})`);
  await snap('06-seance-adaptee');
  const s1 = await st();
  check(s1.checkIns?.at(-1)?.decision === 'adapted' && s1.checkIns.at(-1).pains[0]?.area === 'knee', `${tag} contrôle persisté (décision adaptée)`);
  // Case de validation : contraste, surface tactile ; aide sur les répétitions obligatoires.
  const chk = await p.locator('.k-check').first().evaluate((b) => { const cs = window.getComputedStyle(b); const r = b.getBoundingClientRect(); return { border: cs.borderTopColor, w: r.width, h: r.height }; });
  check(chk.w >= 44 && chk.h >= 44 && chk.border !== 'rgb(36, 36, 40)', `${tag} case de série ≥ 44 px, bordure contrastée (${JSON.stringify(chk)})`);
  const hint = p.locator('[data-reps-required]').first();
  if (await hint.count()) check(/Saisissez les répétitions/.test(await hint.innerText()), `${tag} répétitions obligatoires expliquées`);
  // Matériel indisponible (si l'exercice est présent) : substitut validé ou refus explicite.
  const unav = p.getByRole('button', { name: /^Matériel indisponible pour / }).first();
  if (await unav.count()) {
    await unav.click();
    const sw = p.locator('[data-swap]').first();
    check(await sw.isVisible(), `${tag} matériel indisponible ⇒ ${await sw.getAttribute('data-swap')} (${(await sw.innerText()).slice(0, 90)})`);
    await snap('07-materiel-indisponible');
  }
  // Première série : répétitions + charge, validée ⇒ repos ; la série suivante n'est jamais sous le chrono.
  const firstLine = p.locator('.k-set').filter({ has: p.getByRole('button', { name: 'Cocher la série', exact: true }) }).first();
  const reps = firstLine.getByLabel('Répétitions réalisées');
  if ((await reps.inputValue()) === '') await reps.fill('8');
  await firstLine.getByLabel('Charge (kg)').fill('40');
  await firstLine.getByRole('button', { name: 'Cocher la série', exact: true }).click();
  const rest = p.getByRole('timer', { name: 'Chrono de repos' });
  await rest.waitFor();
  await p.waitForTimeout(700);
  const cover = await p.evaluate(() => {
    const t = document.querySelector('.k-rest')?.getBoundingClientRect();
    const next = [...document.querySelectorAll('.k-set:not(.done)')].find((x) => x.querySelector('.k-check'));
    const r = next?.getBoundingClientRect();
    return t && r ? { timerTop: Math.round(t.top), nextBottom: Math.round(r.bottom), nextTop: Math.round(r.top) } : null;
  });
  check(cover !== null && cover.nextBottom <= cover.timerTop && cover.nextTop >= 0, `${tag} série suivante visible au-dessus du chrono flottant (${JSON.stringify(cover)})`);
  await snap('08-repos-serie-suivante-visible');
  const pageEnd = await p.evaluate(() => { const sc = document.querySelector('.overlay') ?? document.scrollingElement; sc?.scrollTo?.(0, 1e6); window.scrollTo(0, 1e6); return true; });
  await p.waitForTimeout(400);
  const hidden = await p.evaluate(() => { const t = document.querySelector('.k-rest')?.getBoundingClientRect(); if (!t) return -1; return [...document.querySelectorAll('.k-workout button, .k-workout input')].filter((e) => { const r = e.getBoundingClientRect(); return r.height > 0 && r.bottom > t.top && r.top < t.bottom; }).length; });
  check(pageEnd && hidden === 0, `${tag} bas de page : aucun contrôle sous le chrono (${String(hidden)})`);
  // Rechargement : série, charge et chrono conservés.
  await p.reload();
  await p.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: 'Planning', exact: true }).click();
  await p.locator('.card', { hasText: 'En cours' }).first().click();
  const s2 = await st();
  const log = Object.values(s2.programmeLogs ?? {})[0];
  check(log?.sets?.some((x) => x.done && x.loadKg === 40) && (await rest.isVisible()) && (await p.locator('[data-adaptation]').isVisible()), `${tag} rechargement : série (40 kg), chrono et séance adaptée conservés`);
  await p.getByRole('button', { name: 'Terminer la séance' }).click();
  const fin = p.getByRole('dialog', { name: 'Fin de séance' });
  await fin.getByRole('radio', { name: /J’ai adapté la séance/ }).click();
  await fin.getByRole('button', { name: 'Enregistrer' }).click();
  await p.getByLabel('Retour terrain').waitFor();
  await p.getByRole('button', { name: 'Retour' }).click();
  await p.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: 'Historique', exact: true }).click();
  check(/40 kg|40 ?kg/.test(await p.locator('body').innerText()) || ((await st()).strength?.exposures?.length ?? 0) > 0, `${tag} historique : performance enregistrée`);
  // Séance 2 : épaule P2 ⇒ séance reportée (raisons lisibles), non démarrée.
  await p.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: 'Planning', exact: true }).click();
  await p.getByRole('button', { name: /^Musculation : .*Prévue/ }).first().click();
  await p.getByRole('button', { name: /Commencer la séance|Faire maintenant/ }).last().click();
  // Douleur connue (genou, séance 1) : rappelée, et présélectionnée sur « Oui ».
  const knownNote = dlg.locator('[data-checkin-known]');
  check(await knownNote.isVisible() && /genou/.test(await knownNote.innerText()), `${tag} douleur connue rappelée au contrôle suivant (${(await knownNote.innerText()).replace(/\n/g, ' | ').slice(0, 120)})`);
  await dlg.getByRole('radiogroup', { name: 'Avez-vous une douleur en ce moment ?' }).getByRole('radio', { name: 'Oui' }).click();
  check(await dlg.getByRole('button', { name: 'Genou' }).getAttribute('aria-pressed') === 'true', `${tag} « Oui » : douleur connue présélectionnée`);
  await snap('11-douleur-connue');
  await dlg.getByRole('button', { name: 'Épaule' }).click();
  await dlg.getByRole('radiogroup', { name: 'Intensité · Épaule' }).getByRole('radio', { name: 'Douleur qui gêne certains mouvements' }).click();
  await dlg.getByRole('button', { name: 'Valider et commencer' }).click();
  const post = p.locator('[data-checkin-decision]');
  await post.waitFor();
  const decision = await post.getAttribute('data-checkin-decision');
  check((decision === 'postponed' || decision === 'paused') && !/SELECT\.|KAIRO\.|ex\./.test(await post.innerText()), `${tag} épaule P2 ⇒ ${String(decision)}, raisons sans code (${(await post.innerText()).replace(/\n/g, ' | ').slice(0, 160)})`);
  await snap('09-epaule-reportee');
  await dlg.getByRole('button', { name: 'Fermer' }).click();
  // Programme : volume de la semaine (repère, jamais augmenté) et récupération entre séances de force.
  await p.getByRole('button', { name: 'Retour' }).click().catch(() => {});
  await p.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: 'Programme', exact: true }).click();
  check(await p.locator('[data-week-volume]').isVisible() && /n’augmente pas le volume automatiquement/.test(await p.locator('[data-week-volume]').innerText()), `${tag} programme : volume hebdomadaire par groupe, aucune hausse automatique`);
  if (await p.locator('[data-week-recovery]').count()) check(/pas encore de règle validée/.test(await p.locator('[data-week-recovery]').innerText()), `${tag} récupération : séances de force rapprochées signalées (non résolu)`);
  await snap('10-programme-volume');
  check(perrors.length === 0, `${tag} aucune erreur de page (${perrors.join(' | ')})`);
  await c.close();
}

// RC4.5 (lot C, C-9) — « Faire maintenant » avec interférence musculaire NON BLOQUANTE : avertissement ⇒ « Choisir un
// autre jour » (rien d'écrit) ⇒ « Maintenir quand même » ⇒ contrôle avant séance ⇒ séance démarrée, maintien tracé ;
// puis pause douleur active : aucun maintien proposé. États de départ écrits par app-core (tests rc45).
{
  const tag = '[LOT C]';
  const fx = (n) => readFileSync(new URL(`../../../packages/app-core/tests/rc45/fixtures/${n}.json`, import.meta.url), 'utf8');
  const U = '2026-10-05.running.2';
  const { c, p } = await freshPage(fx('lotc-e2e-base'), '2026-10-05T20:00:00+02:00');
  const perrors = [];
  p.on('pageerror', (e) => perrors.push(e.message));
  await p.getByRole('button', { name: 'Planning', exact: true }).click();
  const card = p.locator(`[data-unplaced="${U}"]`);
  const warn = card.locator('[data-manual-maintainable]');
  check(await warn.isVisible() && /Cette séance serait proche de votre séance de musculation/.test(await warn.innerText()) && !/INTERFERENCE|lower_|planner\./.test(await card.innerText()), `${tag} avertissement lisible sur la carte (${(await warn.innerText()).slice(0, 120)})`);
  const before = await p.evaluate(() => localStorage.getItem('kairo.state'));
  await card.getByRole('button', { name: 'Faire maintenant' }).click();
  const dlg = p.getByRole('dialog', { name: 'Interférence musculaire' });
  check(await dlg.getByRole('button', { name: 'Maintenir quand même' }).isVisible() && await dlg.getByRole('button', { name: 'Choisir un autre jour' }).isVisible(), `${tag} deux choix explicites`);
  await dlg.getByRole('button', { name: 'Choisir un autre jour' }).click();
  check(await dlg.count() === 0 && await p.evaluate(() => localStorage.getItem('kairo.state')) === before, `${tag} « Choisir un autre jour » : rien d’écrit`);
  await card.getByRole('button', { name: 'Faire maintenant' }).click();
  await dlg.getByRole('button', { name: 'Maintenir quand même' }).click();
  // Contrôle avant séance : passé par le gestionnaire automatique des parcours (« Passer »), sinon ici.
  await p.getByRole('dialog', { name: 'Avant de commencer' }).getByRole('button', { name: 'Passer' }).click({ timeout: 3000 }).catch(() => {});
  await p.locator('[data-interference-maintained]').waitFor();
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem('kairo.state') ?? '{}'));
  const ci = st.checkIns.at(-1);
  check(Boolean(st.programmeLogs[U]?.startedAt) && ci.decision === 'unchanged' && ci.reasons.some((r) => r.code === 'KAIRO.MANUAL_START_INTERFERENCE_ACCEPTED'), `${tag} maintien : séance démarrée, choix tracé dans le contrôle (décision « unchanged »)`);
  check(/Ce n’est pas un ressenti/.test(await p.locator('[data-interference-maintained]').innerText()), `${tag} séance maintenue ≠ bien tolérée (mention distincte)`);
  await p.reload();
  check(await p.getByRole('dialog').count() === 0, `${tag} rechargement : reprise sans nouvel avertissement`);
  await c.close();
  const { c: c2, p: p2 } = await freshPage(fx('lotc-e2e-pained'), '2026-10-05T20:00:00+02:00');
  await p2.getByRole('button', { name: 'Planning', exact: true }).click();
  const card2 = p2.locator(`[data-unplaced="${U}"]`);
  check(await card2.getByRole('button', { name: 'Faire maintenant' }).count() === 0 && await card2.locator('[data-manual-maintainable]').count() === 0 && /pause douleur/.test(await card2.locator('[data-manual-refused]').innerText()), `${tag} pause douleur : aucun maintien proposé`);
  check(perrors.length === 0, `${tag} aucune erreur de page (${perrors.join(' | ')})`);
  await c2.close();
}

// R5.1 — Planning en GRILLE (agenda hebdomadaire, une ligne par jour) sur téléphone, 360 et 390 px : sélecteur
// Liste / Grille, sept jours dans l'ordre, cartes (sport, nom, durée, statut, couleur), aucun débordement de page, défilement
// limité à la ligne d'un jour, jour et date toujours visibles, textes lisibles, clic et clavier, mode mémorisé.
{
  const tag = '[R5.1]';
  const fx = (n) => readFileSync(new URL(`../tests/fixtures/${n}.json`, import.meta.url), 'utf8');
  const WEEK = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'];
  for (const width of [360, 390]) {
    for (const fixture of ['r51-p5-w2', 'r51-multi-day']) {
      const c = await browser.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 2, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
      const p = await c.newPage();
      const perrors = [];
      p.on('pageerror', (e) => perrors.push(e.message));
      await p.clock.install({ time: new Date('2026-10-12T07:30:00+02:00') });
      await p.clock.resume();
      await p.addInitScript((s) => { if (!localStorage.getItem('kairo.state')) localStorage.setItem('kairo.state', s); }, fx(fixture));
      await p.goto(URL_);
      const t = `${tag} ${String(width)} px ${fixture}`;
      await p.getByRole('button', { name: 'Planning', exact: true }).click();
      check(await p.locator('[data-planning-catalog]').isVisible() && await p.getByRole('button', { name: 'Liste' }).getAttribute('aria-pressed') === 'true', `${t} : liste par défaut`);
      if (shots && fixture === 'r51-p5-w2') await p.screenshot({ path: `${shots}/r51-${String(width)}-liste.png` });
      await p.getByRole('button', { name: 'Grille' }).click();
      await p.locator('[data-planning-grid]').waitFor();
      const days = await p.locator('[data-agenda-day]').evaluateAll((ds) => ds.map((d) => d.getAttribute('data-agenda-day')));
      check(JSON.stringify(days) === JSON.stringify(WEEK), `${t} : sept jours, du lundi au dimanche (${days.join(' ')})`);
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(overflow <= 0, `${t} : aucun débordement horizontal de la page (${String(overflow)} px)`);
      const geo = await p.evaluate(() => Array.from(document.querySelectorAll('[data-agenda-day]')).map((d) => {
        const date = d.querySelector('.agenda-date').getBoundingClientRect();
        const row = d.querySelector('.agenda-cards');
        const cards = Array.from(d.querySelectorAll('.agenda-card')).map((card) => {
          const parts = Array.from(card.children).map((x) => x.getBoundingClientRect());
          const overlap = parts.some((a, i) => parts.slice(i + 1).some((b) => a.bottom > b.top + 1 && b.bottom > a.top + 1 && a.right > b.left + 1 && b.right > a.left + 1));
          const clipped = Array.from(card.querySelectorAll('.agenda-sport, .agenda-dur, .badge')).some((x) => x.scrollWidth > x.clientWidth + 1);
          const name = card.querySelector('.agenda-name');
          return { overlap, clipped, nameLines: Math.round(name.scrollHeight / parseFloat(getComputedStyle(name).lineHeight)), color: getComputedStyle(card).borderLeftColor, sport: card.getAttribute('data-sport'), w: card.getBoundingClientRect().width };
        });
        return { day: d.getAttribute('data-agenda-day'), dateLeft: date.left, dateRight: date.right, scrollable: row ? row.scrollWidth > row.clientWidth + 1 : false, cards };
      }));
      check(geo.every((g) => g.dateLeft >= 0 && g.dateRight <= width), `${t} : jour et date visibles sur chaque ligne`);
      const cards = geo.flatMap((g) => g.cards);
      check(cards.length >= 7 && cards.every((x) => !x.overlap && !x.clipped), `${t} : ${String(cards.length)} cartes, aucun texte superposé ni coupé`);
      check(cards.every((x) => x.nameLines <= 2), `${t} : noms de séance sur deux lignes au plus (${cards.map((x) => x.nameLines).join(',')})`);
      const colors = new Map(cards.map((x) => [x.sport, x.color]));
      check(colors.size === 4 && new Set(colors.values()).size === 4, `${t} : couleur distincte par sport (${[...colors].map(([k, v]) => `${k}=${v}`).join(' ; ')})`);
      if (fixture === 'r51-multi-day') {
        const busy = geo.find((g) => g.cards.length === 3);
        check(Boolean(busy) && busy.scrollable, `${t} : trois séances le même jour, côte à côte, ligne défilante (${busy?.day})`);
        const row = p.locator(`[data-agenda-day="${busy.day}"] .agenda-cards`);
        await row.evaluate((r) => { r.scrollLeft = r.scrollWidth; });
        const after = await p.evaluate((d) => { const el = document.querySelector(`[data-agenda-day="${d}"] .agenda-date`).getBoundingClientRect(); return { left: el.left, right: el.right, page: document.documentElement.scrollWidth - document.documentElement.clientWidth }; }, busy.day);
        check(after.left >= 0 && after.right <= width && after.page <= 0, `${t} : après défilement de la ligne, le jour reste visible et la page ne déborde pas`);
        if (shots) await p.screenshot({ path: `${shots}/r51-${String(width)}-grille-multi.png` });
        await row.evaluate((r) => { r.scrollLeft = 0; });
      } else if (shots) await p.screenshot({ path: `${shots}/r51-${String(width)}-grille.png`, fullPage: true });
      // Clic : même action que la liste (ouverture de la séance), puis clavier (Entrée) sur une carte.
      const first = p.locator('.agenda-card').first();
      const id = await first.getAttribute('data-request');
      await first.click();
      await p.locator('.overlay').waitFor();
      const opened = await p.locator('.overlay').innerText();
      await p.getByRole('button', { name: 'Retour' }).first().click();
      await p.getByRole('button', { name: 'Liste' }).click();
      await p.locator(`[data-planning-catalog] button[data-request="${id}"]`).click();
      check(await p.locator('.overlay').innerText() === opened, `${t} : la carte de la grille ouvre la même séance que la liste`);
      await p.getByRole('button', { name: 'Retour' }).first().click();
      await p.getByRole('button', { name: 'Grille' }).click();
      await p.locator('.agenda-card').first().focus();
      await p.keyboard.press('Enter');
      check(await p.locator('.overlay').isVisible(), `${t} : carte activable au clavier`);
      await p.getByRole('button', { name: 'Retour' }).first().click();
      // Navigation entre semaines existantes.
      await p.getByRole('button', { name: 'Semaine précédente' }).click();
      check(await p.locator('[data-agenda-day]').first().getAttribute('data-agenda-day') === '2026-10-05', `${t} : semaine précédente affichée en grille`);
      await p.getByRole('button', { name: 'Revenir à la semaine en cours' }).click();
      // Mode mémorisé après rechargement.
      await p.reload();
      await p.getByRole('button', { name: 'Planning', exact: true }).click();
      check(await p.locator('[data-planning-grid]').isVisible() && await p.getByRole('button', { name: 'Grille' }).getAttribute('aria-pressed') === 'true', `${t} : mode Grille mémorisé après rechargement`);
      check(perrors.length === 0, `${t} : aucune erreur de page (${perrors.join(' | ')})`);
      await c.close();
    }
  }
}
// R5.2 — Planning en LISTE : catalogue par sport sur téléphone (360 et 390 px). Ordre des catégories, aucun débordement,
// textes lisibles, catégories repliables, période « Cette semaine / 2 semaines » (aucune semaine inventée), ouverture des
// séances identique à la grille, période mémorisée.
{
  const tag = '[R5.2]';
  const fx = readFileSync(new URL('../tests/fixtures/r51-p5-w2.json', import.meta.url), 'utf8');
  for (const width of [360, 390]) {
    const c = await browser.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 2, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
    const p = await c.newPage();
    const perrors = [];
    p.on('pageerror', (e) => perrors.push(e.message));
    await p.clock.install({ time: new Date('2026-10-12T07:30:00+02:00') });
    await p.clock.resume();
    await p.addInitScript((s) => { if (!localStorage.getItem('kairo.state')) localStorage.setItem('kairo.state', s); }, fx);
    await p.goto(URL_);
    const t = `${tag} ${String(width)} px`;
    await p.getByRole('button', { name: 'Planning', exact: true }).click();
    await p.locator('[data-planning-catalog]').waitFor();
    const order = await p.locator('[data-catalog-sport]').evaluateAll((gs) => gs.map((g) => g.getAttribute('data-catalog-sport')));
    check(order.join(',') === 'strength,crosstraining,hyrox,running', `${t} : catégories Musculation, Cross-training, HYROX, Course à pied (${order.join(', ')})`);
    const layout = async () => p.evaluate(() => ({
      page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      clipped: Array.from(document.querySelectorAll('[data-planning-catalog] .card, [data-planning-catalog] .catalog-toggle')).filter((el) => el.scrollWidth > el.clientWidth + 1).length,
      overlap: Array.from(document.querySelectorAll('[data-planning-catalog] .card .row.between')).filter((row) => { const [a, b] = Array.from(row.children).map((x) => x.getBoundingClientRect()); return a && b && a.right > b.left + 1 && a.bottom > b.top + 1 && b.bottom > a.top + 1; }).length,
    }));
    const l1 = await layout();
    check(l1.page <= 0 && l1.clipped === 0 && l1.overlap === 0, `${t} : aucun débordement de page, aucun texte coupé ni superposé (${JSON.stringify(l1)})`);
    const n = await p.locator('[data-planning-catalog] [data-request]').count();
    const dated = await p.locator('[data-planning-catalog] [data-request] [data-catalog-date]').count();
    check(n === 7 && dated === 7, `${t} : 7 séances de la semaine, chacune avec son jour et sa date`);
    if (shots) await p.screenshot({ path: `${shots}/r52-${String(width)}-liste.png`, fullPage: true });
    // Repli / dépli.
    const toggle = p.getByRole('button', { name: /^Catégorie Musculation : / });
    await toggle.click();
    check(await toggle.getAttribute('aria-expanded') === 'false' && await p.locator('[data-catalog-sport="strength"] [data-request]').count() === 0, `${t} : Musculation repliée`);
    if (shots) await p.screenshot({ path: `${shots}/r52-${String(width)}-replie.png` });
    await toggle.click();
    check(await p.locator('[data-catalog-sport="strength"] [data-request]').count() > 0, `${t} : Musculation dépliée`);
    // Période : 2 semaines depuis la semaine en cours (semaine suivante non planifiée ⇒ avis, rien d'inventé).
    await p.getByRole('button', { name: '2 semaines' }).click();
    check(await p.locator('[data-planning-catalog] [data-request]').count() === 7 && await p.locator('[data-catalog-next-missing]').isVisible(), `${t} : 2 semaines, semaine suivante non planifiée signalée, aucune séance inventée`);
    await p.getByRole('button', { name: 'Semaine précédente' }).click();
    const both = await p.locator('[data-planning-catalog] [data-request]').count();
    const sorted = await p.locator('[data-catalog-sport]').evaluateAll((gs) => gs.every((g) => { const d = Array.from(g.querySelectorAll('[data-catalog-entry]')).map((e) => e.getAttribute('data-date')); return d.join() === [...d].sort().join(); }));
    check(both === 14 && sorted, `${t} : semaines 1 et 2 ensemble (${String(both)} séances), triées par date dans chaque sport`);
    const l2 = await layout();
    check(l2.page <= 0 && l2.clipped === 0 && l2.overlap === 0, `${t} : 2 semaines sans débordement ni texte coupé (${JSON.stringify(l2)})`);
    if (shots) await p.screenshot({ path: `${shots}/r52-${String(width)}-2-semaines.png`, fullPage: true });
    // Ouverture : même fiche que depuis la grille.
    const first = p.locator('[data-planning-catalog] button[data-request]').first();
    const id = await first.getAttribute('data-request');
    await first.click();
    await p.locator('.overlay').waitFor();
    const opened = await p.locator('.overlay').innerText();
    await p.getByRole('button', { name: 'Retour' }).first().click();
    await p.getByRole('button', { name: 'Grille' }).click();
    await p.locator(`.agenda-card[data-request="${id}"]`).click();
    check(await p.locator('.overlay').innerText() === opened, `${t} : la liste ouvre la même fiche que la grille`);
    await p.getByRole('button', { name: 'Retour' }).first().click();
    await p.getByRole('button', { name: 'Liste' }).click();
    await p.reload();
    await p.getByRole('button', { name: 'Planning', exact: true }).click();
    check(await p.locator('[data-planning-catalog]').getAttribute('data-period') === 'two_weeks', `${t} : période « 2 semaines » mémorisée après rechargement`);
    check(perrors.length === 0, `${t} : aucune erreur de page (${perrors.join(' | ')})`);
    await c.close();
  }
}

// Version réellement servie : identifiant de build affiché dans Réglages = version.json publié (site déployé seulement).
{
  const { c, p } = await freshPage(readFileSync(new URL('../../../packages/app-core/tests/fixtures/pre-s1-state.json', import.meta.url), 'utf8'));
  const published = await p.evaluate(async () => { try { const r = await fetch('./version.json', { cache: 'no-store' }); return r.ok ? (await r.json()).commit : null; } catch { return null; } });
  await p.getByRole('button', { name: 'Réglages', exact: true }).click();
  const shown = await p.getByLabel('Version de l’application').innerText();
  if (published) check(shown === `Version : ${published.slice(0, 7)}`, `version affichée = version publiée (${shown} / ${published.slice(0, 7)})`);
  else console.log(`--  version.json absent (build locale) : ${shown}`);
  await c.close();
}

await browser.close();
console.log('E2E OK');
