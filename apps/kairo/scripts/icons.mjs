// Génère les icônes PNG de la PWA à partir de public/icon.svg (Chromium de Playwright, aucun outil externe).
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const svg = readFileSync(new URL('../public/icon.svg', import.meta.url), 'utf8');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();
for (const [size, file, pad] of [[192, 'icon-192.png', 0], [512, 'icon-512.png', 0], [512, 'icon-512-maskable.png', 0.1]]) {
  await page.setViewportSize({ width: size, height: size });
  const inner = Math.round(size * (1 - 2 * pad));
  await page.setContent(`<html><body style="margin:0;background:#0B0B0D;display:grid;place-items:center;width:${size}px;height:${size}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</body></html>`);
  await page.screenshot({ path: new URL(`../public/${file}`, import.meta.url).pathname, omitBackground: false });
}
await browser.close();
console.log('icônes générées');
