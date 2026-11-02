/* global document, getComputedStyle, localStorage -- exécutés dans le navigateur */
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
const url = process.env.E2E_URL ?? 'http://127.0.0.1:4174/';
const fixture = readFileSync(new URL('../tests/fixtures/r51-p5-w2.json', import.meta.url), 'utf8');
const shots = process.argv[2];
if (shots) mkdirSync(shots, { recursive: true });
const browser = await chromium.launch();
try {
  for (const width of [360, 390]) {
    const ctx = await browser.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
    const page = await ctx.newPage();
    await page.addLocatorHandler(page.locator('[data-checkin-form]'), async () => { await page.locator('[data-checkin-form]').getByRole('button', { name: 'Passer' }).click(); });
    await page.addInitScript((state) => localStorage.setItem('rekka-beta:kairo.state', state), fixture);
    await page.clock.install({ time: new Date('2026-10-12T07:30:00+02:00') }); await page.clock.resume();
    await page.goto(url);
    await page.getByRole('button', { name: 'Planning', exact: true }).click();
    await page.locator('[data-planning-catalog] button[data-request="2026-10-12.strength.1"]').click();
    await page.getByRole('button', { name: 'Commencer la séance' }).click();
    const input = page.locator('input[placeholder="12–20"]').first();
    await input.waitFor();
    await input.scrollIntoViewIfNeeded();
    const fit = await input.evaluate((el) => {
      const css = getComputedStyle(el, '::placeholder');
      const canvas = document.createElement('canvas'); const ctx2d = canvas.getContext('2d');
      if (!ctx2d) return false;
      ctx2d.font = `${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
      return ctx2d.measureText(el.placeholder).width <= el.clientWidth;
    });
    const objective = input.locator('xpath=../..').locator('.k-set-label span');
    const visible = await objective.evaluate((el) => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight && getComputedStyle(el).textOverflow !== 'ellipsis');
    if (!fit || !visible) throw new Error(`${width}: plage 12–20 tronquée (champ=${String(fit)}, objectif=${String(visible)})`);
    if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) throw new Error(`${width}: débordement horizontal`);
    if (shots) await page.screenshot({ path: `${shots}/${width}-12-20.png` });
    console.log(`OK ${width}: prescription réelle 12–20 visible dans le champ et l’objectif`);
    await ctx.close();
  }
} finally { await browser.close(); }
