/** Prépare une copie locale d'une build beta ; ce script ne publie rien. */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const source = resolve('dist-beta');
const target = resolve('dist-android-test');
if (!existsSync(`${source}/sw.js`) || !existsSync(`${source}/manifest.webmanifest`)) throw Error('Construire d’abord la build BÊTA locale.');
const sw = readFileSync(`${source}/sw.js`, 'utf8');
if (!sw.includes("const CACHE = 'rekka-beta-1';") || !sw.includes("k.startsWith('rekka-beta-')")) throw Error('Build source BÊTA non reconnue.');
const html = readFileSync(`${source}/index.html`, 'utf8');
if (!html.includes('<title>REKKA BÊTA</title>')) throw Error('Identité BÊTA source manquante.');
const commit = process.env.GITHUB_SHA ?? '';
if (!/^[a-f0-9]{40}$/i.test(commit)) throw Error('GITHUB_SHA complet requis pour la build et version.json.');
const entry = /<script type="module" crossorigin src="\.\/(assets\/[^"/]+\.js)"><\/script>/.exec(html)?.[1];
if (!entry || !readFileSync(`${source}/${entry}`, 'utf8').includes(commit.slice(0, 7))) throw Error('Le commit ne correspond pas à la build source.');
rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });
const manifest = JSON.parse(readFileSync(`${target}/manifest.webmanifest`, 'utf8'));
const iconsRoot = resolve('resources/android-test-icons');
const metadata = JSON.parse(readFileSync(`${iconsRoot}/icons.json`, 'utf8'));
const iconDir = `icons/${metadata.asset_version}-${metadata.revision}`;
mkdirSync(`${target}/${iconDir}`, { recursive: true });
for (const [file, hash] of Object.entries(metadata.files)) {
  const bytes = readFileSync(`${iconsRoot}/${file}`);
  if (createHash('sha256').update(bytes).digest('hex') !== hash) throw Error(`Icône altérée : ${file}`);
  cpSync(`${iconsRoot}/${file}`, `${target}/${iconDir}/${file}`);
}
const icons = [48, 72, 96, 192, 512].map((size) => ({ src: `${iconDir}/icon-${size}.png`, sizes: `${size}x${size}`, type: 'image/png', purpose: 'any' }));
for (const size of [192, 512]) icons.push({ src: `${iconDir}/icon-${size}-maskable.png`, sizes: `${size}x${size}`, type: 'image/png', purpose: 'maskable' });
Object.assign(manifest, { id: './?kairo-channel=android-test', name: 'REKKA ESSAI', short_name: 'REKKA ESSAI', description: 'REKKA V2 — essai Android isolé', theme_color: '#071127', background_color: '#071127', icons });
writeFileSync(`${target}/manifest.webmanifest`, `${JSON.stringify(manifest, null, 2)}\n`);
const nextHtml = html.replace('<title>REKKA BÊTA</title>', '<title>REKKA ESSAI</title>')
  .replace(/<meta name="theme-color" content="[^"]*"\s*\/>/, '<meta name="theme-color" content="#071127" />')
  .replace('<link rel="icon" href="./icon.svg" type="image/svg+xml" />', `<link rel="icon" href="./${iconDir}/icon-48.png" sizes="48x48" type="image/png" /><link rel="icon" href="./favicon.ico" sizes="16x16 32x32 48x48" />`)
  .replace('<link rel="apple-touch-icon" href="./icon-192.png" />', `<link rel="apple-touch-icon" href="./${iconDir}/icon-180.png" sizes="180x180" />`);
if (nextHtml.includes('./icon.svg') || nextHtml.includes('./icon-192.png')) throw Error('Ancienne référence HTML active.');
writeFileSync(`${target}/index.html`, nextHtml);
cpSync(`${iconsRoot}/favicon.ico`, `${target}/favicon.ico`);
for (const name of ['icon.svg', 'icon-192.png', 'icon-512.png', 'icon-512-maskable.png']) rmSync(`${target}/${name}`, { force: true });
const precache = ['./', './index.html', './manifest.webmanifest', './favicon.ico', ...Object.keys(metadata.files).map((file) => `./${iconDir}/${file}`)];
const nextSw = sw.replace("const CACHE = 'rekka-beta-1';", `const CACHE = 'rekka-android-test-icons-${metadata.revision}-${commit.slice(0, 12)}';`)
  .replace("k.startsWith('rekka-beta-')", "k.startsWith('rekka-android-test-')")
  .replace(/c\.addAll\(\[[^\]]*\]\)/, `c.addAll(${JSON.stringify(precache)})`)
  .replace("req.mode === 'navigate'", "(req.mode === 'navigate' || new URL(req.url).pathname.endsWith('/manifest.webmanifest'))");
if (nextSw.includes('rekka-beta-') || nextSw.includes('./icon.svg')) throw Error('Ancienne référence worker active.');
writeFileSync(`${target}/sw.js`, nextSw);
writeFileSync(`${target}/_headers`, '/manifest.webmanifest\n  Cache-Control: no-cache\n/sw.js\n  Cache-Control: no-cache\n/index.html\n  Cache-Control: no-cache\n/icons/*\n  Cache-Control: public, max-age=31536000, immutable\n');
writeFileSync(`${target}/version.json`, `${JSON.stringify({ commit, channel: 'android-test' })}\n`);
console.log(`Copie ESSAI préparée : ${target}. Icônes officielles et cache isolés, identité PWA conservée.`);
