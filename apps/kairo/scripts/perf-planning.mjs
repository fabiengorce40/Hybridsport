/* global localStorage -- exécuté dans la page (addInitScript) */
/**
 * RC4.5 (C2) — coût de planification d'une semaine dans l'application réelle (build de production, `vite preview`),
 * processeur ralenti par Chromium (×1, ×4 : profil mobile intermédiaire de référence, ×6 : entrée de gamme).
 *
 * Méthode : un état RC4 en fin de semaine 1 (`PERF_SEED_DIR`, écrit par `rc4-audit/perf-seeds.test.ts`) est ouvert le
 * lundi de la semaine 2 : l'ouverture clôture la semaine 1 et PLANIFIE la semaine 2 (synchrone, avant le premier
 * affichage). Puis la page est rechargée : semaine déjà planifiée. Coût de planification = différence des deux temps
 * jusqu'à l'affichage de l'application (médiane de `RUNS` essais).
 * Usage : PERF_SEED_DIR=… node scripts/perf-planning.mjs — le serveur doit tourner sur E2E_URL.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const URL_ = process.env.E2E_URL ?? 'http://localhost:4173/';
const SEEDS = process.env.PERF_SEED_DIR;
if (!SEEDS) { console.error('PERF_SEED_DIR manquant'); process.exit(1); }
const PROFILES = (process.env.PERF_PROFILES ?? 'P1,P1b,P2,P3,P4,P5').split(',');
const RATES = (process.env.PERF_RATES ?? '1,4,6').split(',').map(Number);
const RUNS = Number(process.env.PERF_RUNS ?? '3');
const MONDAY = '2026-10-12T07:30:00+02:00';

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

async function once(seed, rate) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR', timezoneId: 'Europe/Paris', serviceWorkers: 'block' });
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date(MONDAY) });
  await page.clock.pauseAt(new Date(MONDAY));
  await page.addInitScript((s) => { if (!localStorage.getItem('kairo.seeded')) { localStorage.setItem('kairo.state', s); localStorage.setItem('kairo.seeded', '1'); } }, seed);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const open = async (go) => {
    const t0 = Date.now();
    await go();
    await page.getByRole('button', { name: 'Planning', exact: true }).waitFor({ state: 'visible', timeout: 120_000 });
    return Date.now() - t0;
  };
  const withPlanning = await open(() => page.goto(URL_));
  const planned = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('kairo.state') ?? '{}').planner?.weeks ?? {}).includes('2026-10-12'));
  const already = await open(() => page.reload());
  await ctx.close();
  if (errors.length > 0) throw new Error(errors.join(' | '));
  if (!planned) throw new Error('semaine 2 non planifiée à l’ouverture');
  return { withPlanning, already };
}

console.log('| profil | CPU | ouverture avec planification (ms) | ouverture semaine déjà planifiée (ms) | coût de planification (ms) |');
console.log('|---|---|---|---|---|');
for (const id of PROFILES) {
  const seed = readFileSync(join(SEEDS, `${id}.json`), 'utf8');
  for (const rate of RATES) {
    const runs = [];
    for (let i = 0; i < RUNS; i += 1) runs.push(await once(seed, rate));
    const a = median(runs.map((r) => r.withPlanning));
    const b = median(runs.map((r) => r.already));
    console.log(`| ${id} | ×${String(rate)} | ${String(a)} | ${String(b)} | ${String(median(runs.map((r) => r.withPlanning - r.already)))} |`);
  }
}
await browser.close();
