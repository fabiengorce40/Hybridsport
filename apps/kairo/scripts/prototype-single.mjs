// REKKA V2 — prototype en UNE page autonome (lot V2-2) : JS, CSS et polices intégrés (data URI), aucune requête réseau,
// aucun service worker. À ouvrir directement dans un navigateur (fichier local ou pièce jointe), sans serveur.
// Usage : pnpm proto:build && node scripts/prototype-single.mjs <sortie.html>
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const dir = new URL('../dist-prototype/assets/', import.meta.url);
const files = readdirSync(dir);
const read = (f, enc) => readFileSync(new URL(f, dir), enc);
const js = files.filter((f) => f.endsWith('.js')).map((f) => read(f, 'utf8')).join('\n');
let css = files.filter((f) => f.endsWith('.css')).map((f) => read(f, 'utf8')).join('\n');
for (const f of files.filter((x) => x.endsWith('.woff2'))) css = css.split(`./${f}`).join(`data:font/woff2;base64,${read(f).toString('base64')}`).split(`/assets/${f}`).join(`data:font/woff2;base64,${read(f).toString('base64')}`);
if (/url\((?!data:)/.test(css)) throw new Error('ressource non intégrée dans le CSS');
const out = process.argv[2];
if (!out) throw new Error('chemin de sortie requis');
const page = [
  '<!doctype html>', '<html lang="fr" data-theme="v2">', '<head>', '<meta charset="UTF-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">', '<meta name="theme-color" content="#071827">',
  '<title>REKKA V2 — prototype</title>', `<style>${css}</style>`, '</head>', '<body>', '<div id="root"></div>',
  `<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>`, '</body>', '</html>',
].join('\n');
writeFileSync(out, page);
console.log(`${out} : ${String(Math.round(page.length / 1024))} ko`);
