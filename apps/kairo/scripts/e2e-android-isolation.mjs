/* global localStorage, navigator, caches, location, fetch -- code exécuté dans les pages Chromium */
/** Test local avec deux origines réellement distinctes ; aucun service distant. */
import { chromium } from 'playwright';
const beta = process.env.E2E_BETA_URL ?? 'http://127.0.0.1:4174/';
const test = process.env.E2E_TEST_URL ?? 'http://127.0.0.1:4175/';
if (new URL(beta).origin === new URL(test).origin) throw new Error('Origines identiques : isolation impossible.');
const browser = await chromium.launch();
try {
  const context = await browser.newContext();
  const a = await context.newPage(); const b = await context.newPage();
  await a.goto(beta); await b.goto(test);
  await Promise.all([a.evaluate(() => navigator.serviceWorker.ready), b.evaluate(() => navigator.serviceWorker.ready)]);
  await Promise.all([a.reload(), b.reload()]);
  await Promise.all([a.waitForFunction(() => Boolean(navigator.serviceWorker.controller)), b.waitForFunction(() => Boolean(navigator.serviceWorker.controller))]);
  const manifestA = await a.evaluate(async () => (await fetch('./manifest.webmanifest')).json());
  const manifestB = await b.evaluate(async () => (await fetch('./manifest.webmanifest')).json());
  if (manifestA.name !== 'REKKA BÊTA' || manifestB.name !== 'REKKA V2 ESSAI' || manifestA.id === manifestB.id) throw new Error('Identités PWA incohérentes.');
  await a.evaluate(() => localStorage.setItem('rekka-beta:kairo.state', 'BETA-unique'));
  await b.evaluate(() => localStorage.setItem('rekka-beta:kairo.state', 'TEST-unique'));
  const before = await a.evaluate(async () => ({ value: localStorage.getItem('rekka-beta:kairo.state'), cache: (await caches.keys()).sort(), worker: navigator.serviceWorker.controller?.scriptURL, origin: location.origin }));
  const isolated = await b.evaluate(async () => ({ value: localStorage.getItem('rekka-beta:kairo.state'), cache: await caches.keys(), worker: navigator.serviceWorker.controller?.scriptURL, origin: location.origin }));
  if (before.value !== 'BETA-unique' || isolated.value !== 'TEST-unique' || before.origin === isolated.origin || !before.cache.includes('rekka-beta-1') || !isolated.cache.includes('rekka-android-test-1')) throw new Error('Stockage ou caches non isolés.');
  await b.evaluate(async () => { const registration = await navigator.serviceWorker.getRegistration(); if (!registration) throw new Error('Service worker absent'); await registration.update(); });
  const afterUpdate = await a.evaluate(async () => ({ value: localStorage.getItem('rekka-beta:kairo.state'), cache: (await caches.keys()).sort(), worker: navigator.serviceWorker.controller?.scriptURL, origin: location.origin }));
  if (JSON.stringify(before) !== JSON.stringify(afterUpdate)) throw new Error('La mise à jour du test a modifié la BÊTA.');
  await b.evaluate(async () => { localStorage.clear(); for (const key of await caches.keys()) await caches.delete(key); for (const reg of await navigator.serviceWorker.getRegistrations()) await reg.unregister(); });
  const after = await a.evaluate(async () => ({ value: localStorage.getItem('rekka-beta:kairo.state'), cache: (await caches.keys()).sort(), worker: navigator.serviceWorker.controller?.scriptURL, origin: location.origin }));
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('La suppression sur l’origine de test a modifié la BÊTA.');
  console.log('OK deux origines : manifestes, localStorage, caches, service workers et suppression côté test isolés');
  await context.close();
} finally { await browser.close(); }
