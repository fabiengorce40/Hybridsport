/* global localStorage, document, fetch, navigator, window -- exécutés dans la page (page.evaluate) */
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
const strengthTitles = (p) => p.getByRole('button', { name: /^Musculation : / }).evaluateAll((bs) => bs.map((b) => (b.getAttribute('aria-label') ?? '').replace(/^Musculation : /, '').replace(/, [^,]+$/, '')));

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
  check(st.planner?.weeks?.['2026-10-05']?.planningVersion === 'beta0-s3', 'S1 programme pré-S1 : semaine persistée à la version courante');
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
  check(st.planner?.weeks?.['2026-10-05']?.planningVersion === 'beta0-s3' && reqs.every((r) => r.composition?.authority === 'provisional' && r.reasons.some((x) => x.code === 'PLAN.WEEK_COMPOSITION')), `reset Beta : AppState recomposé par S1 (${reqs.map((r) => `${r.date} ${r.intent?.archetypeId}`).join(', ')})`);
  await p.getByRole('button', { name: 'Planning', exact: true }).click();
  const after = await strengthTitles(p);
  const days = await p.locator('.week .day .n').allInnerTexts();
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
