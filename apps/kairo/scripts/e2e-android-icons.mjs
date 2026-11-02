/* global navigator, caches, localStorage, indexedDB, fetch, Image */
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { cpSync, mkdtempSync, readFileSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const app = fileURLToPath(new URL('../', import.meta.url));
const next = resolve(app, 'dist-android-test');
const beta = resolve(app, 'dist-beta');
const temporary = mkdtempSync(join(tmpdir(), 'rekka-icon-update-'));
const previous = join(temporary, 'old');
cpSync(beta, previous, { recursive: true });
// Exact icon release currently installed (0d526ac), not the older K release.
const oldCommit = '0d526ac52e095f3dd4bc3d2e6a3c9278073ee883';
const oldFile = path => execFileSync('git', ['show', `${oldCommit}:${path}`], { cwd: app, maxBuffer: 10*1024*1024 });
const oldMetadata = JSON.parse(oldFile('apps/kairo/resources/android-test-icons/icons.json'));
const oldDir = 'icons/rekka-v2-city-v1';
mkdirSync(join(previous, oldDir), { recursive: true });
for (const name of Object.keys(oldMetadata.files)) writeFileSync(join(previous, oldDir, name), oldFile('apps/kairo/resources/android-test-icons/'+name));
const previousManifest = JSON.parse(readFileSync(join(previous, 'manifest.webmanifest')));
Object.assign(previousManifest, { id: './?kairo-channel=android-test', name: 'REKKA ESSAI', short_name: 'REKKA ESSAI', theme_color: '#071127', background_color: '#000000', icons: [48,72,96,192,512].map(size => ({src: `${oldDir}/icon-${size}.png`, sizes: `${size}x${size}`, type: 'image/png', purpose: 'any'})).concat([{src: `${oldDir}/icon-512-maskable.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable'}]) });
writeFileSync(join(previous, 'manifest.webmanifest'), JSON.stringify(previousManifest));
const oldCache = 'rekka-android-test-icons-'+oldMetadata.source_sha256.slice(0,12);
writeFileSync(join(previous, 'sw.js'), readFileSync(join(beta, 'sw.js'), 'utf8')
  .replace("const CACHE = 'rekka-beta-1';", `const CACHE = '${oldCache}';`)
  .replace("k.startsWith('rekka-beta-')", "k.startsWith('rekka-android-test-')")
  .replace(/c\.addAll\(\[[^\]]*\]\)/, `c.addAll(${JSON.stringify(['./','./index.html','./manifest.webmanifest',...Object.keys(oldMetadata.files).map(f=>'./'+oldDir+'/'+f)])})`));

const manifest = JSON.parse(readFileSync(join(next, 'manifest.webmanifest')));
const newCache = /const CACHE = '([^']+)'/.exec(readFileSync(join(next, 'sw.js'), 'utf8'))[1];
assert.notEqual(newCache, oldCache);
assert.equal(manifest.id, previousManifest.id);
assert.equal(manifest.scope, previousManifest.scope);
assert.equal(manifest.start_url, previousManifest.start_url);
assert.equal(manifest.name, 'REKKA ESSAI');
assert.equal(manifest.short_name, 'REKKA ESSAI');
for (const icon of manifest.icons) {
  assert.ok(!icon.src.startsWith('/') && !icon.src.includes('..'));
  const png = readFileSync(join(next, icon.src));
  const dimensions = `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`;
  assert.equal(dimensions, icon.sizes);
}
for (const name of ['icon.svg', 'icon-192.png', 'icon-512.png', 'icon-512-maskable.png']) {
  assert.ok(!existsSync(join(next, name)));
  for (const file of ['index.html', 'manifest.webmanifest', 'sw.js']) {
    const text = readFileSync(join(next, file), 'utf8');
    assert.ok(!text.includes(`./${name}`));
  }
}
let current = previous;
const types = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.css': 'text/css', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
function server(root) {
  return createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = resolve(root(), '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root()+'/')) { res.writeHead(403).end(); return; }
    try { res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream'); res.setHeader('Cache-Control', 'no-cache'); res.end(readFileSync(file)); }
    catch { res.writeHead(404).end(); }
  });
}
const a = server(() => beta); const b = server(() => current);
await Promise.all([new Promise(r => a.listen(0, '127.0.0.1', r)), new Promise(r => b.listen(0, '127.0.0.1', r))]);
const browser = await chromium.launch();
try {
  const context = await browser.newContext();
  const betaPage = await context.newPage(); const page = await context.newPage();
  await betaPage.goto(`http://127.0.0.1:${a.address().port}/`);
  await page.goto(`http://127.0.0.1:${b.address().port}/`);
  await Promise.all([betaPage.waitForFunction(() => !!navigator.serviceWorker.controller), page.waitForFunction(() => !!navigator.serviceWorker.controller)]);
  await betaPage.evaluate(() => localStorage.setItem('icon-update-probe', 'BETA intacte'));
  const betaBefore = await betaPage.evaluate(async () => ({ data: localStorage.getItem('icon-update-probe'), caches: (await caches.keys()).sort(), worker: navigator.serviceWorker.controller.scriptURL }));
  assert.ok((await page.evaluate(() => caches.keys())).includes(oldCache));
  await page.evaluate(async () => {
    localStorage.setItem('icon-update-probe', 'ESSAI intact');
    await new Promise((resolve, reject) => {
      const request = indexedDB.open('icon-update-probe', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('sentinels');
      request.onerror = reject;
      request.onsuccess = () => { const db = request.result; const tx = db.transaction('sentinels', 'readwrite'); tx.objectStore('sentinels').put('conserve', 'value'); tx.oncomplete = () => { db.close(); resolve(); }; };
    });
  });
  await page.waitForLoadState('networkidle');
  current = next;
  // Cache creation/deletion precedes clients.claim(). Await the actual controller
  // change before navigating, otherwise the old worker can repopulate its cache.
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    await new Promise((resolve, reject) => {
      navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
      registration.update().catch(reject);
    });
  });
  await page.waitForFunction(async old => (await caches.keys()).some(k => k.startsWith('rekka-android-test-icons-')) && !(await caches.keys()).includes(old), oldCache);
  await page.reload();
  const actual = await page.evaluate(async () => (await fetch('./manifest.webmanifest')).json());
  assert.deepEqual(actual, manifest);
  assert.ok(manifest.icons.every(icon => !icon.src.includes(oldDir+'/')));
  assert.equal(await page.evaluate(() => localStorage.getItem('icon-update-probe')), 'ESSAI intact');
  assert.equal(await page.evaluate(() => new Promise(resolve => { const r = indexedDB.open('icon-update-probe'); r.onsuccess = () => { const db = r.result; const g = db.transaction('sentinels').objectStore('sentinels').get('value'); g.onsuccess = () => { db.close(); resolve(g.result); }; }; })), 'conserve');
  const cached = await page.evaluate(async name => { const cache = await caches.open(name); return (await cache.keys()).map(r => new URL(r.url).pathname); }, newCache);
  for (const icon of manifest.icons) assert.ok(cached.includes('/'+icon.src));
  await context.setOffline(true);
  assert.deepEqual(await page.evaluate(async () => (await fetch('./manifest.webmanifest')).json()), manifest);
  for (const icon of manifest.icons) {
    const size = await page.evaluate(src => new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(`${image.naturalWidth}x${image.naturalHeight}`); image.onerror = reject; image.src = src; }), icon.src);
    assert.equal(size, icon.sizes);
  }
  assert.deepEqual(await betaPage.evaluate(async () => ({ data: localStorage.getItem('icon-update-probe'), caches: (await caches.keys()).sort(), worker: navigator.serviceWorker.controller.scriptURL })), betaBefore);
  console.log('OK : tailles PNG, manifeste, retrait ancien K, migration du worker, icones hors ligne, localStorage + IndexedDB conserves, BETA isolee.');
  await context.close();
} finally {
  await browser.close(); a.closeAllConnections(); b.closeAllConnections(); a.close(); b.close(); rmSync(temporary, { recursive: true, force: true });
}
