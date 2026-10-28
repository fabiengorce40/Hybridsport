/* global navigator, localStorage -- expressions exécutées dans la page */
/* Contrôle limité : une page déjà chargée peut redémarrer hors ligne avec le service worker. */
import { chromium } from 'playwright';
const url = process.env.E2E_URL ?? 'http://127.0.0.1:4174/';
const browser = await chromium.launch();
try {
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
