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
  check(st.planner?.weeks?.['2026-10-05']?.planningVersion === 'beta0-m3', 'S1 programme pré-S1 : semaine persistée à la version courante');
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
  check(st.planner?.weeks?.['2026-10-05']?.planningVersion === 'beta0-m3' && reqs.every((r) => r.composition?.authority === 'provisional' && r.reasons.some((x) => x.code === 'PLAN.WEEK_COMPOSITION')), `reset Beta : AppState recomposé par S1 (${reqs.map((r) => `${r.date} ${r.intent?.archetypeId}`).join(', ')})`);
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
