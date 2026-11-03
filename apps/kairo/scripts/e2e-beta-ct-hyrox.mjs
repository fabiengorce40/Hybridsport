/* global localStorage -- exécuté dans la page */
/**
 * FAST TRACK V1 — E2E HYROX et Cross-training (sports EXPÉRIMENTAUX de la V1) sur la build BÊTA :
 * 1. accès : les deux sports sont proposés et marqués « Expérimental » à l'accueil ;
 * 2. garde-fous : après une coupure déclarée, aucune règle de reprise n'est validée ⇒ avertissement, et le programme
 *    créé ne contient AUCUNE séance HYROX planifiée (refus explicite, jamais une prescription inventée) ;
 * 3. parcours complets existants (séance, chronomètres, pause, rechargement, persistance, historique, refus après
 *    douleur) : `e2e-parcours.mjs cross` et `hyrox`.
 * Usage : E2E_URL=<url BÊTA> node scripts/e2e-beta-ct-hyrox.mjs
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const URL_ = process.env.E2E_URL ?? 'http://127.0.0.1:4174/';
const fail = (m) => { console.error(`ÉCHEC : ${m}`); process.exit(1); };
const check = (cond, m) => { if (!cond) fail(m); console.log(`ok  ${m}`); };

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  const p = await ctx.newPage();
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  await p.clock.install({ time: new Date('2026-10-05T07:30:00+02:00') });
  await p.clock.resume();
  await p.goto(URL_);
  await p.getByLabel(/J’ai compris/).check();
  await p.getByRole('button', { name: 'Commencer' }).click();
  for (const sport of ['Cross-training', 'HYROX']) {
    const radio = p.getByRole('radio', { name: new RegExp(`^${sport}`) });
    check((await radio.innerText()).includes('Expérimental'), `${sport} proposé et marqué « Expérimental »`);
  }
  await p.getByRole('radio', { name: /^Musculation \+ Course/ }).click();
  check(await p.getByLabel(/Ajouter HYROX \(expérimental\)/).isVisible(), 'ajout HYROX signalé expérimental');
  check(await p.getByLabel(/Ajouter du Cross-training \(expérimental\)/).isVisible(), 'ajout Cross-training signalé expérimental');
  // Garde-fou : HYROX après une coupure ⇒ aucune séance proposée.
  await p.getByRole('radio', { name: /^HYROX/ }).click();
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.getByLabel('Niveau d’entraînement général').selectOption('intermediate');
  await p.getByRole('radio', { name: /^Endurance de force/ }).click();
  await p.getByRole('radio', { name: /^Préparer une course HYROX/ }).click();
  await p.getByLabel('Séances HYROX par semaine').selectOption('2');
  await p.getByLabel('Coupure récente du HYROX').selectOption('LONG');
  check(await p.getByText(/aucune règle de reprise HYROX n’est encore validée : aucune séance ne sera proposée/).isVisible(), 'coupure : avertissement explicite (règle de reprise non validée)');
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.getByRole('button', { name: 'Créer mon programme' }).click();
  await p.getByRole('navigation', { name: 'Navigation principale' }).waitFor();
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem('rekka-beta:kairo.state') ?? localStorage.getItem('kairo.state') ?? '{}'));
  const reqs = Object.values(st.planner?.weeks ?? {}).flatMap((w) => w.requests ?? []).filter((r) => r.sport === 'hyrox');
  check(reqs.length > 0 && reqs.every((r) => r.status !== 'planned'), `coupure : ${String(reqs.length)} demande(s) HYROX refusée(s), aucune séance planifiée`);
  check(errors.length === 0, `aucune erreur JavaScript (${errors.join(' | ')})`);
  await ctx.close();
} finally { await browser.close(); }

for (const name of ['cross', 'hyrox']) {
  const r = spawnSync(process.execPath, [fileURLToPath(new URL('./e2e-parcours.mjs', import.meta.url)), name], { stdio: 'inherit', env: process.env, timeout: 120000 });
  check(r.status === 0, `parcours ${name} : séance, chronomètres, pause, rechargement, historique, garde-fous`);
}
console.log('E2E HYROX ET CROSS-TRAINING BÊTA OK');
