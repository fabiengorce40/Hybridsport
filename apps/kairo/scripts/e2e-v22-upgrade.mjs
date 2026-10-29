/* global localStorage, indexedDB, navigator, caches */
/** Isolated V2.1→V2.2 browser upgrade, fictitious repository fixture ONLY. */
import { Buffer } from 'node:buffer';
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const app=fileURLToPath(new URL('../',import.meta.url));
const next=resolve(app,'dist-android-test');
const legacy=resolve(process.env.REKKA_LEGACY_DIST??resolve(app,'dist-legacy-android'));
const fixture=JSON.parse(readFileSync(resolve(app,'tests/fixtures/r51-p5-w2.json')));
const key='rekka-beta:kairo.state';
const oldSw=readFileSync(resolve(legacy,'sw.js'),'utf8');const nextSw=readFileSync(resolve(next,'sw.js'),'utf8');
assert.notEqual(oldSw,nextSw,'A code release must update the worker even if icons are identical');
const cacheOf=sw=>/const CACHE = '([^']+)'/.exec(sw)[1];
const oldCache=cacheOf(oldSw);const newCache=cacheOf(nextSw);assert.notEqual(oldCache,newCache);
assert.deepEqual(JSON.parse(readFileSync(resolve(legacy,'manifest.webmanifest'))),JSON.parse(readFileSync(resolve(next,'manifest.webmanifest'))),'Manifest and corrected icons must be preserved');
let current=legacy;
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const server=createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;const path=resolve(current,'.'+(pathname==='/'?'/index.html':pathname));if(!path.startsWith(current+'/')){res.writeHead(403).end();return;}try{res.setHeader('Content-Type',types[extname(path)]??'application/octet-stream');res.setHeader('Cache-Control','no-cache');res.end(readFileSync(path));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/`;
const browser=await chromium.launch();
async function exported(page){await page.getByRole('button',{name:/^(Profil|Réglages)$/}).click();const event=page.waitForEvent('download');await page.getByRole('button',{name:'Exporter mes données',exact:true}).click();return JSON.parse(readFileSync(await(await event).path(),'utf8'));}
try{
 for(const version of [1,2,3]){
  current=legacy;const context=await browser.newContext({viewport:{width:360,height:800},locale:'fr-FR',timezoneId:'Europe/Paris'});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const raw=JSON.parse(JSON.stringify(fixture));raw.schemaVersion=version;
  if(version===1)for(const week of Object.values(raw.planner.weeks))delete week.owner;
  await page.addInitScript(({key,raw})=>{if(localStorage.getItem(key)===null){localStorage.setItem(key,JSON.stringify(raw));localStorage.setItem('kairo.state','FOREIGN-ORIGIN-SENTINEL');}}, {key,raw});
  await page.clock.install({time:new Date('2026-10-12T09:00:00+02:00')});await page.clock.resume();await page.goto(url);await page.getByRole('navigation',{name:'Navigation principale'}).waitFor();
  const baseline=await exported(page);assert.equal(baseline.schemaVersion,3);assert.deepEqual(baseline.strength,fixture.strength);assert.deepEqual(baseline.programmeLogs,fixture.programmeLogs);
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  await page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('rekka-v21-upgrade-probe',1);r.onupgradeneeded=()=>r.result.createObjectStore('data');r.onerror=reject;r.onsuccess=()=>{const db=r.result;const tx=db.transaction('data','readwrite');tx.objectStore('data').put('kept','sentinel');tx.oncomplete=()=>{db.close();resolve();};};}));
  await page.waitForLoadState('networkidle');current=next;
  await page.evaluate(async()=>{const registration=await navigator.serviceWorker.getRegistration();await new Promise((resolve,reject)=>{navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true});registration.update().catch(reject);});});
  await page.reload();await page.getByRole('navigation',{name:'Navigation principale'}).waitFor();
  const migrated=await exported(page);assert.deepEqual(migrated,{...baseline,schemaVersion:4});
  assert.equal(await page.evaluate(()=>localStorage.getItem('kairo.state')),'FOREIGN-ORIGIN-SENTINEL');
  assert.equal(await page.evaluate(()=>new Promise(resolve=>{const r=indexedDB.open('rekka-v21-upgrade-probe');r.onsuccess=()=>{const db=r.result;const g=db.transaction('data').objectStore('data').get('sentinel');g.onsuccess=()=>{db.close();resolve(g.result);};};})),'kept');
  const cachesNow=await page.evaluate(()=>caches.keys());assert.ok(cachesNow.includes(newCache));assert.ok(!cachesNow.includes(oldCache));
  // Persist the v4 export via the actual import path, only in this throwaway context.
  await page.getByLabel('Fichier de données à importer').setInputFiles({name:'fictitious-v4-roundtrip.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(migrated))});
  await page.getByText('Données importées.',{exact:true}).waitFor();assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key),migrated);
  assert.deepEqual(errors,[]);await context.close();
  // The exact currently published v2 app must refuse this v4 data and never overwrite it.
  current=legacy;const oldContext=await browser.newContext();const oldPage=await oldContext.newPage();const serialized=JSON.stringify(migrated);
  await oldPage.addInitScript(({key,serialized})=>localStorage.setItem(key,serialized),{key,serialized});await oldPage.goto(url);await oldPage.getByRole('heading',{name:'Mise à jour requise',exact:true}).waitFor();assert.equal(await oldPage.evaluate(key=>localStorage.getItem(key),key),serialized);await oldContext.close();
  console.log(`PASS upgrade v${version}→v4: exact rich data/export roundtrip, IndexedDB, worker, icons, old v3 rejects v4 without overwrite.`);
 }
}finally{await browser.close();server.closeAllConnections();server.close();}
