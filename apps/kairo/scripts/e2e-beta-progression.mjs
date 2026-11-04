/* global localStorage -- exécuté dans la page */
/**
 * FAST TRACK V1 — politique de progression `progression-stab-1` ACTIVE sur la BÊTA (décision D2) :
 * une vraie séance Musculation (toutes les séries saisies et cochées, « comme prévu ») se termine SANS blocage ; chaque
 * décision de progression enregistrée porte l'identifiant de la politique ; l'état reste au format 5, relu après
 * rechargement, et l'historique affiche la séance.
 * Usage : E2E_URL=<url BÊTA> node scripts/e2e-beta-progression.mjs
 */
import { chromium } from 'playwright';
import { completeStrengthPersonalization, EXPERIENCE } from './lib/strength-onboarding.mjs';

const URL_ = process.env.E2E_URL ?? 'http://127.0.0.1:4174/';
const fail = (m) => { console.error(`ÉCHEC : ${m}`); process.exit(1); };
const check = (cond, m) => { if (!cond) fail(m); console.log(`ok  ${m}`); };

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.addLocatorHandler(page.locator('[data-checkin-form]'), async () => { await page.locator('[data-checkin-form]').getByRole('button', { name: 'Passer' }).click(); });
  await page.clock.install({ time: new Date('2026-10-05T08:00:00+02:00') });
  await page.clock.resume();
  const read = () => page.evaluate(() => { const k = Object.keys(localStorage).find((x) => x.endsWith('kairo.state') && !x.includes('.state.')); return k ? JSON.parse(localStorage.getItem(k) ?? 'null') : null; });

  await page.goto(URL_);
  await page.getByLabel(/J’ai compris/).check();
  await page.getByRole('button', { name: 'Commencer', exact: true }).click();
  await page.getByRole('radio', { name: /^Musculation Séances/ }).click();
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  if (!(await completeStrengthPersonalization(page, { experience: EXPERIENCE.intermediate, sessionsPerWeek: 3 }))) fail('personnalisation Musculation attendue');
  while (await page.getByRole('button', { name: 'Continuer', exact: true }).count()) await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await page.getByRole('button', { name: 'Créer mon programme', exact: true }).click();
  await page.getByRole('navigation', { name: 'Navigation principale' }).waitFor();

  // Séance Musculation n° `nth` du planning : séries saisies et cochées, fin « comme prévu » (ou adaptée si demandé).
  async function doSession(nth) {
    await page.getByRole('button', { name: 'Planning', exact: true }).click();
    await page.getByRole('button', { name: /^Musculation :/ }).nth(nth).click();
    await page.getByRole('button', { name: 'Commencer la séance', exact: true }).click();
    const main = page.getByRole('button', { name: 'Démarrer le bloc principal', exact: true });
    if (await main.count()) await main.click();
    const v3=await page.locator('[data-live-workout="v3"]').count()>0;
    let guard=0;
    for(;;){
      if(v3){
        if(!(await page.locator('.v3-series-row[data-done="false"]').count()))break;
        if((guard+=1)>80)fail('trop de séries');
        const exercise=page.locator('.v3-exercise:not([hidden])');
        await exercise.locator('.v3-series-row[data-done="false"] .v3-series-select').first().click();
        const reps=exercise.getByLabel('Répétitions réalisées',{exact:true});if((await reps.inputValue())==='')await reps.fill('8');
        const kg=exercise.getByLabel('Charge (kg)',{exact:true});if((await kg.inputValue())==='')await kg.fill('20');
        await page.getByRole('button',{name:'Valider la série active',exact:true}).click();
      }else{
        const row=page.locator('.k-set:not(.done)').filter({has:page.getByRole('button',{name:'Cocher la série',exact:true})}).first();
        if(!(await row.count()))break;if((guard+=1)>80)fail('trop de séries');
        const reps=row.getByLabel('Répétitions réalisées');if(await reps.count()&&(await reps.inputValue())==='')await reps.fill('8');
        const kg=row.getByLabel('Charge (kg)');if(await kg.count()&&(await kg.inputValue())==='')await kg.fill('20');
        await row.getByRole('button',{name:'Cocher la série',exact:true}).click();
      }
      const skip=page.getByRole('button',{name:'Passer',exact:true});if(await skip.count())await skip.first().click();
    }
    if(v3)await page.getByRole('button',{name:'Commandes de séance',exact:true}).click();
    await page.getByRole('button', { name: 'Terminer la séance', exact: true }).click();
    const asPlanned = page.getByRole('radio', { name: 'Tout s’est passé comme prévu', exact: true });
    if (await asPlanned.count()) await asPlanned.click(); else await page.getByRole('radio', { name: 'J’ai adapté la séance', exact: true }).click();
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await page.getByText('Séance terminée', { exact: true }).first().waitFor();
    await page.getByRole('button', { name: 'Retour', exact: true }).click();
  }
  await doSession(0);
  check(true, 'séance 1 terminée et enregistrée (suivis de charge créés, aucun blocage)');
  // Deuxième séance (même rotation, deux jours plus tard) : premières DÉCISIONS de progression sur les suivis créés.
  await page.clock.setSystemTime(new Date('2026-10-07T08:00:00+02:00'));
  await page.reload();
  await page.getByRole('navigation', { name: 'Navigation principale' }).waitFor();
  await doSession(1);
  check(true, 'séance 2 terminée et enregistrée (aucun blocage en fin de séance)');
  // Troisième séance (vendredi) : mêmes emplacements que la première ⇒ décisions de progression sur ses suivis.
  await page.clock.setSystemTime(new Date('2026-10-09T08:00:00+02:00'));
  await page.reload();
  await page.getByRole('navigation', { name: 'Navigation principale' }).waitFor();
  await doSession(2);
  check(true, 'séance 3 terminée et enregistrée (décisions de progression, aucun blocage en fin de séance)');

  const s = await read();
  const decisions = (s?.programmeState?.audit ?? []).filter((a) => a.reason.code === 'PROGRESSION.EXPOSURE_CLASSIFIED');
  check(s?.schemaVersion === 5, 'données au format 5');
  if (process.env.E2E_DEBUG) console.log('DBG', JSON.stringify({ codes: (s?.programmeState?.audit ?? []).map((a) => a.reason.code), results: s?.programmeState?.results, logs: Object.values(s?.programmeLogs ?? {}).map((l) => ({ sets: l.sets?.length, done: l.sets?.filter((x) => x.done).length })) }).slice(0, 1500));
  check(decisions.length > 0 && decisions.every((a) => a.reason.params.progressionPolicy === 'progression-stab-1'), `${String(decisions.length)} décision(s) de progression tracée(s) « progression-stab-1 »`);
  check((s?.programmeState?.results ?? []).length === 3 && (s?.strength?.tracks ?? []).length > 0, 'résultat enregistré, suivis de charge créés');
  await page.reload();
  await page.getByRole('navigation', { name: 'Navigation principale' }).waitFor();
  const again = await read();
  check(JSON.stringify(again?.programmeState?.audit) === JSON.stringify(s?.programmeState?.audit), 'rechargement : décisions relues à l’identique');
  await page.getByRole('button', { name: 'Progression', exact: true }).click();
  check((await page.locator('body').innerText()).includes('Musculation'), 'historique / progression : séance visible');
  check(errors.length === 0, `aucune erreur JavaScript (${errors.join(' | ')})`);
  console.log('E2E PROGRESSION BÊTA OK');
} finally { await browser.close(); }
