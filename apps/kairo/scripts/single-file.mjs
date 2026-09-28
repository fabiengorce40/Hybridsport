// Aperçu autonome : une seule page (JS et CSS intégrés), sans service worker ni manifeste.
// Usage : VITE_TARGET=single vite build --outDir dist-single && node scripts/single-file.mjs <sortie.html>
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const dir = new URL('../dist-single/', import.meta.url);
const assets = readdirSync(new URL('assets/', dir));
const js = assets.filter((f) => f.endsWith('.js')).map((f) => readFileSync(new URL(`assets/${f}`, dir), 'utf8')).join('\n');
const css = assets.filter((f) => f.endsWith('.css')).map((f) => readFileSync(new URL(`assets/${f}`, dir), 'utf8')).join('\n');
const out = process.argv[2];
if (!out) throw new Error('chemin de sortie requis');
const page = [
  '<title>KAIRO</title>',
  '<meta name="theme-color" content="#0B0B0D">',
  `<style>${css}</style>`,
  '<div id="root"></div>',
  `<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>`,
].join('\n');
writeFileSync(out, page);
console.log(`${out} : ${String(Math.round(page.length / 1024))} ko`);
