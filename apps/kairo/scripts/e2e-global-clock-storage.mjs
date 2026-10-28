/* global localStorage -- exécuté dans le navigateur */
/** Test du stockage auxiliaire dans un profil Chromium jetable, sans modifier l'application ni ses sauvegardes. */
import { chromium } from 'playwright';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const url = process.env.E2E_URL ?? 'http://127.0.0.1:5174/';
const profile = mkdtempSync(join(tmpdir(), 'rekka-clock-'));
const startedAt = '2026-10-05T08:00:00.000Z';
const session = { requestId: '2026-10-05.strength.1', startedAt, active: true };
async function open() {
  const context = await chromium.launchPersistentContext(profile, { viewport: { width: 360, height: 800 } });
  await context.route('**/__clock_fixture', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Test local de stockage</title>' }));
  const page = context.pages()[0] ?? await context.newPage();
  await page.goto(new URL('__clock_fixture', url).href);
  return { context, page };
}
let context;
try {
  let page;
  ({ context, page } = await open());
  const first = await page.evaluate(async (s) => {
    const clock = await import('/src/clock/global-clock.ts');
    localStorage.setItem('kairo.state', 'ancien-contenu-inchangé');
    const paused = clock.controlClock(localStorage, s, '2026-10-05T08:10:00.000Z', 'pause');
    return { paused, unchanged: localStorage.getItem('kairo.state') === 'ancien-contenu-inchangé' };
  }, session);
  if (!first.paused.ok || !first.unchanged) throw new Error('Pause ou isolation de la sauvegarde échouée');
  await page.reload();
  const afterReload = await page.evaluate(async (s) => {
    const clock = await import('/src/clock/global-clock.ts'); const read = clock.readClock(localStorage, s);
    return read.ok ? clock.elapsedMs(s, read.snapshot, '2026-10-05T08:30:00.000Z') : null;
  }, session);
  if (afterReload !== 600000) throw new Error('Pause non conservée au rechargement');
  await context.close(); context = undefined;
  ({ context, page } = await open());
  const reopened = await page.evaluate(async (s) => {
    const clock = await import('/src/clock/global-clock.ts');
    const before = clock.readClock(localStorage, s);
    const resumed = clock.controlClock(localStorage, s, '2026-10-05T08:30:00.000Z', 'resume');
    const elapsed = resumed.ok ? clock.elapsedMs(s, resumed.snapshot, '2026-10-05T08:35:00.000Z') : null;
    const closed = clock.readClock(localStorage, { ...s, active: false });
    return { before, resumed, elapsed, closed, unchanged: localStorage.getItem('kairo.state') === 'ancien-contenu-inchangé' };
  }, session);
  if (!reopened.before.ok || !reopened.resumed.ok || reopened.elapsed !== 900000 || !reopened.closed.ok || reopened.closed.snapshot !== null || !reopened.unchanged) throw new Error('Réouverture, reprise ou clôture incohérente');
  await context.close(); context = undefined;
  console.log('OK stockage auxiliaire Chromium : pause, rechargement, fermeture/réouverture, reprise, clôture et sauvegarde historique inchangée');
} finally {
  if (context) await context.close().catch(() => {});
  rmSync(profile, { recursive: true, force: true });
}
