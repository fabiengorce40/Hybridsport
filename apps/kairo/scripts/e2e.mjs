/**
 * Parcours de bout en bout dans Chromium (viewport téléphone) sur la build de production servie par
 * `vite preview` : onboarding → planning → séance réelle → séries cochées → chrono de repos → fin de
 * séance → feedback → historique → fermeture / réouverture (persistance) → course simulée.
 * Usage : node scripts/e2e.mjs [dossier de captures] — le serveur doit tourner sur E2E_URL.
 */
import { chromium } from 'playwright';

const URL_ = process.env.E2E_URL ?? 'http://localhost:4173/';
const shots = process.argv[2];
const fail = (m) => { console.error(`ÉCHEC : ${m}`); process.exit(1); };
const check = (cond, m) => { if (!cond) fail(m); console.log(`ok  ${m}`); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'fr-FR' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const shot = async (n) => { if (shots) await page.screenshot({ path: `${shots}/${n}.png`, fullPage: false }); };
const text = () => page.locator('body').innerText();

await page.goto(URL_);
await shot('01-welcome');
check(await page.getByText('V0 PROVISOIRE').first().isVisible(), 'bannière provisoire visible dès l’accueil');
const start = page.getByRole('button', { name: 'Commencer' });
check(await start.isDisabled(), 'impossible de continuer sans accepter l’avertissement');
await page.getByLabel(/J’ai compris/).check();
await start.click();
await page.getByRole('button', { name: /Musculation/ }).click();
await page.getByRole('button', { name: /HYROX/ }).click();
await shot('02-sports');
await page.getByRole('button', { name: 'Continuer' }).click();
await page.getByRole('button', { name: 'Masse musculaire' }).click();
await page.getByRole('button', { name: 'Continuer' }).click();
await page.getByRole('button', { name: 'Continuer' }).click();
await shot('03-materiel');
await page.getByRole('button', { name: 'Générer mon planning' }).click();
await page.getByRole('navigation', { name: 'Navigation principale' }).waitFor();
await shot('04-accueil');
check((await text()).includes('HYROX : aucun moteur'), 'HYROX signalé indisponible, jamais planifié');

await page.getByRole('button', { name: 'Planning', exact: true }).click();
await shot('05-planning');
const cards = page.locator('.card.button-card');
check(await cards.count() >= 1, 'planning : au moins une séance réelle');
check(!(await text()).includes('INDISPONIBLE'), 'planning musculation : aucune carte vide ou indisponible');
await cards.first().click();
await page.getByRole('button', { name: 'Démarrer la séance' }).waitFor();
await shot('06-seance');
check((await text()).includes('Valeurs provisoires non validées'), 'séance : provenance provisoire affichée');
await page.getByRole('button', { name: 'Démarrer la séance' }).click();
const ticks = page.getByRole('button', { name: 'Cocher la série', exact: true });
const reps = page.getByLabel('Répétitions réalisées');
const kg = page.getByLabel('Charge (kg)');
// Remplit et coche les 4 premières séries (les plages de répétitions ne sont jamais pré-remplies).
for (let i = 0; i < 4; i++) {
  if ((await reps.nth(i).inputValue()) === '') await reps.nth(i).fill('10');
  if ((await kg.nth(i).inputValue()) === '') await kg.nth(i).fill('40');
  await ticks.nth(0).click();
}
check(await page.getByRole('timer', { name: 'Chrono de repos' }).isVisible(), 'chrono de repos flottant démarré après une série');
await shot('07-series-chrono');
await page.getByRole('button', { name: 'Passer' }).click();
await page.getByRole('button', { name: 'Terminer la séance' }).click();
await page.getByRole('button', { name: 'Comme prévu' }).click();
await shot('08-feedback');
await page.getByRole('button', { name: 'Enregistrer' }).click();
await page.getByText('Séance terminée').first().waitFor();
await page.getByRole('button', { name: 'Retour' }).click();
await page.getByRole('button', { name: 'Historique', exact: true }).click();
await shot('09-historique');
check((await text()).includes('4 séries'), 'historique : 4 séries enregistrées');
check(/progression suivie/i.test(await text()), 'historique : progression suivie créée par le moteur');

// Fermeture / réouverture : tout est conservé.
await page.reload();
await page.getByRole('button', { name: 'Historique', exact: true }).click();
check((await text()).includes('4 séries'), 'réouverture : séance terminée et séries conservées');

// Course : activer, constater le refus multisport exact, puis la simulation après une course enregistrée (course seule).
await page.getByRole('button', { name: 'Profil', exact: true }).click();
await page.getByRole('button', { name: /Musculation/ }).click();
await page.getByRole('button', { name: /HYROX/ }).click();
await page.getByRole('button', { name: /Course à pied/ }).click();
await page.getByRole('button', { name: 'Enregistrer et replanifier' }).click();
await page.getByRole('button', { name: 'Course', exact: true }).click();
check((await text()).includes('Aucune dose de course établie'), 'course sans historique : refus exact (aucune dose inventée)');
await page.getByLabel('Durée (minutes)').fill('30');
await page.getByLabel(/Distance \(km/).fill('5');
await page.getByRole('button', { name: 'Enregistrer la course' }).click();
check((await text()).includes('5.0 km'), 'course libre : distance enregistrée (allure observée, jamais une cible)');
await page.getByText('SIMULATION').first().waitFor();
await shot('10-course');
await page.locator('.card.button-card').first().click();
await shot('11-seance-course');
check((await text()).includes('30 min'), 'séance de course simulée : dernière durée réalisée (30 min), aucune hausse sans deux séances tolérées');
check((await text()).includes('Aucune allure : la règle d’allure facile n’est pas validée'), 'séance de course facile : aucune allure');
check((await text()).includes('Footing facile'), 'séance de course : titre par type de séance');

check(errors.length === 0, `aucune erreur console (${errors.join(' | ')})`);
await browser.close();
console.log('E2E OK');
