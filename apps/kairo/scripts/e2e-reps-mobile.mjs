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
    await page.locator('[data-live-workout="v3"], .k-workout').first().waitFor();
    const v3 = await page.locator('[data-live-workout="v3"]').count() > 0;
    const input = page.locator(v3 ? '.v3-exercise[data-expanded="true"] input[placeholder="12–20"]' : 'input[placeholder="12–20"]').first();
    if (v3) {
      // V3 : seul l'éditeur de la série choisie porte la plage ; on parcourt exercices et séries jusqu'à la trouver.
      const nav = page.getByRole('navigation', { name: 'Exercices' }).getByRole('button');
      search: for (let e = 0; e < await nav.count(); e++) {
        await nav.nth(e).click();
        const selects = page.locator('.v3-exercise[data-expanded="true"] .v3-series-select');
        for (let i = 0; i < await selects.count(); i++) { await selects.nth(i).click(); if (await input.count() && await input.isVisible()) break search; }
      }
    }
    await input.waitFor();
    await input.scrollIntoViewIfNeeded();
    const fit = await input.evaluate((el) => {
      const css = getComputedStyle(el, '::placeholder');
      const canvas = document.createElement('canvas'); const ctx2d = canvas.getContext('2d');
      if (!ctx2d) return false;
      ctx2d.font = `${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
      return ctx2d.measureText(el.placeholder).width <= el.clientWidth;
    });
    const objective = v3 ? input.locator('xpath=../../..').locator('.v31-set-prescription') : input.locator('xpath=../..').locator('.k-set-label span');
    if (v3 && !/12–20/.test(await objective.innerText())) throw new Error(`${width}: objectif 12–20 absent de la prescription`);
    const visible = await objective.evaluate((el) => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight && getComputedStyle(el).textOverflow !== 'ellipsis');
    if (!fit || !visible) throw new Error(`${width}: plage 12–20 tronquée (champ=${String(fit)}, objectif=${String(visible)})`);
    if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) throw new Error(`${width}: débordement horizontal`);
    if (shots) await page.screenshot({ path: `${shots}/${width}-12-20.png` });
    console.log(`OK ${width}: prescription réelle 12–20 visible dans le champ et l’objectif`);
    await ctx.close();
  }
} finally { await browser.close(); }
