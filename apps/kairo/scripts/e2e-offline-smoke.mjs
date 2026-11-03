/* global navigator, localStorage, caches, document -- expressions exécutées dans la page */
/* Hors ligne : 1) PREMIÈRE visite seule (aucun second chargement en ligne) puis redémarrage hors ligne, écran de départ
   complet (images et polices comprises) ; 2) page déjà chargée, redémarrage hors ligne, donnée locale conservée. */
import { chromium } from 'playwright';
const url = process.env.E2E_URL ?? 'http://127.0.0.1:4174/';
const browser = await chromium.launch();
try {
  {
    const first = await browser.newContext({ serviceWorkers: 'allow' });
    const p = await first.newPage();
    const failed = [];
    const loaded = new Set();
    p.on('requestfailed', (r) => failed.push(r.url()));
    p.on('requestfinished', (r) => { if (new URL(r.url()).pathname.includes('/assets/')) loaded.add(r.url()); });
    await p.goto(url);
    await p.evaluate(() => navigator.serviceWorker.ready);
    await p.waitForLoadState('networkidle');
    // Indépendant du cache HTTP (que l'hébergeur peut interdire et qu'un appareil peut évincer) : chaque fichier chargé
    // par la première visite doit être dans le cache du service worker.
    const missing = await p.evaluate(async (urls) => { const out = []; for (const u of urls) if (!(await caches.match(u))) out.push(u); return out; }, [...loaded]);
    if (loaded.size === 0 || missing.length > 0) throw Error(`première visite : fichiers absents du cache du service worker (${String(missing.length)}/${String(loaded.size)}) ${missing.slice(0, 3).join(', ')}`);
    await first.setOffline(true);
    await p.reload();
    await p.getByRole('button', { name: 'Commencer', exact: true }).waitFor();
    await p.evaluate(() => document.fonts.ready);
    const local = failed.filter((u) => u.startsWith(new URL(url).origin));
    if (local.length > 0) throw Error(`hors ligne dès la première visite : fichiers manquants ${local.join(', ')}`);
    console.log('OK première visite puis redémarrage hors ligne, aucun fichier manquant');
    await first.close();
  }
  const context = await browser.newContext({ serviceWorkers: 'allow' });
  const page = await context.newPage();
  await page.goto(url);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.evaluate(() => localStorage.setItem('rekka-beta:offline-sentinel', 'preuve'));
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: 'Commencer', exact: true }).waitFor();
  if (await page.evaluate(() => localStorage.getItem('rekka-beta:offline-sentinel')) !== 'preuve') throw Error('donnée perdue');
  console.log('OK PWA rechargée hors ligne, sentinelle conservée');
  await context.close();
} finally { await browser.close(); }
