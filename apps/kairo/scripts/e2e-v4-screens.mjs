/* global document, window, getComputedStyle, localStorage */
/**
 * REKKA V4 Playfield Pro — captures et contrôles des SEPT écrans sur la build BÊTA réellement compilée (`dist-beta`),
 * avec la fixture FICTIVE du dépôt (`tests/fixtures/v3-sober.json`, profil de démonstration).
 * Contrôles à chaque largeur : thème actif, aucun ancien marqueur V3 visible (#DCFF35, magnésie), aucun défilement
 * horizontal, commandes visibles ≥ 44 × 44 px, contraste du texte principal.
 * Usage : node scripts/e2e-v4-screens.mjs [dossier de captures]   (REKKA_DIST pour une autre build)
 */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = fileURLToPath(new URL('../', import.meta.url));
const root = resolve(process.env.REKKA_DIST ?? resolve(app, 'dist-beta'));
const shots = process.argv[2];
if (shots) mkdirSync(shots, { recursive: true });
const fixture = JSON.parse(readFileSync(resolve(app, 'tests/fixtures/v3-sober.json'), 'utf8'));
if (process.env.REKKA_DETAIL_ONLY === '1') {
  const requests = fixture.planner.weeks['2026-10-05'].requests;
  const exercise = requests.flatMap(request => request.record?.data?.session?.blocks ?? [])
    .flatMap(block => block.items).find(item => item.id === 'v3.upper.0');
  assert.equal(exercise?.exerciseId, 'ex.db_bench_press');
  exercise.exerciseId = 'ex.bench_press';
}
const KEY = 'rekka-beta:kairo.state';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const server = createServer((req, res) => {
  const p = resolve(root, `.${new URL(req.url, 'http://localhost').pathname.replace(/^\/$/, '/index.html')}`);
  if (!p.startsWith(`${root}/`)) { res.writeHead(403).end(); return; }
  try { res.setHeader('Content-Type', mime[extname(p)] ?? 'application/octet-stream'); res.end(readFileSync(p)); } catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${String(server.address().port)}/`;
const ok = (m) => console.log(`ok  ${m}`);

/** Audit de l'écran visible : débordement, cibles tactiles, couleurs abandonnées, contraste des textes. */
const audit = (page) => page.evaluate(() => {
  const lum = (c) => { const m = /rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?\)/.exec(c); if (!m) return null; const a = m[4] === undefined ? 1 : Number(m[4]); const ch = [m[1], m[2], m[3]].map((x) => { const v = Number(x) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return { l: 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2], a }; };
  const bgOf = (e) => { for (let x = e; x; x = x.parentElement) { const c = getComputedStyle(x).backgroundColor; const v = lum(c); if (v && v.a > 0.9) return v.l; if (getComputedStyle(x).backgroundImage !== 'none') return null; } return lum(getComputedStyle(document.body).backgroundColor)?.l ?? 1; };
  // Visible = dans la fenêtre ET au premier plan (le point central n'est pas recouvert par une autre couche).
  const visible = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); if (!(r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && Number(s.opacity) > 0 && !e.closest('[hidden],.sr-only,details:not([open]) > :not(summary)') && r.bottom > 0 && r.top < window.innerHeight)) return false; const x = Math.min(window.innerWidth - 1, Math.max(0, r.left + r.width / 2)); const y = Math.min(window.innerHeight - 1, Math.max(0, r.top + r.height / 2)); const hit = document.elementFromPoint(x, y); return !!hit && (hit === e || e.contains(hit) || hit.contains(e)); };
  const path = (e) => { const c = (x) => `${x.tagName.toLowerCase()}${x.className && typeof x.className === 'string' ? `.${x.className.trim().split(/\s+/).slice(0, 2).join('.')}` : ''}`; return `${e.parentElement ? `${c(e.parentElement)} > ` : ''}${c(e)}`; };
  const small = [...document.querySelectorAll('button, input, select, a[href], summary, [role="button"]')].filter(visible)
    .filter((e) => { const r = e.getBoundingClientRect(); const lab = e.closest('label')?.getBoundingClientRect(); /* case dans un libellé cliquable ≥ 44 px : la cible est le libellé */ if (lab && lab.height >= 44 && lab.width >= 44) return false; return r.width < 44 || r.height < 44; })
    .map((e) => `${(e.getAttribute('aria-label') ?? e.textContent ?? '').trim().slice(0, 28)} ${String(Math.round(e.getBoundingClientRect().width))}×${String(Math.round(e.getBoundingClientRect().height))} ${path(e)}`);
  const neon = [...document.querySelectorAll('body *')].filter(visible).filter((e) => { const s = getComputedStyle(e); return [s.color, s.backgroundColor, s.borderTopColor, s.fill, s.stroke].some((c) => c === 'rgb(220, 255, 53)'); }).map(path);
  const magnesia = [...document.querySelectorAll('body *')].some((e) => getComputedStyle(e).backgroundImage.includes('magnesie'));
  const lowContrast = [...document.querySelectorAll('h1,h2,h3,p,span,strong,small,label,button,li,dd,dt,td,th')].filter(visible).filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
    .map((e) => { const fg = lum(getComputedStyle(e).color); const bg = bgOf(e); if (!fg || bg === null) return null; const [a, b] = [fg.l, bg].sort((x, y) => y - x); const ratio = (a + 0.05) / (b + 0.05); const big = Number.parseFloat(getComputedStyle(e).fontSize) >= 18.66; return ratio < (big ? 3 : 4.5) ? `${e.textContent.trim().slice(0, 24)} (${ratio.toFixed(2)}) ${path(e)}` : null; }).filter(Boolean);
  return { theme: document.documentElement.dataset.rekkaTheme ?? null, hscroll: document.documentElement.scrollWidth > window.innerWidth + 1, small, neon, magnesia, lowContrast };
});

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const report = {};
try {
  for (const width of [390, 360, 412, 1024]) {
    const W = `${String(width)} px`;
    const height = process.env.REKKA_HOME_ONLY === '1' && (width === 390 || width === 360)
      ? Math.round(width * 1536 / 728)
      : width === 360 ? 740 : width === 1024 ? 900 : 844;
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: width === 390 ? 2 : 1, locale: 'fr-FR', timezoneId: 'Europe/Paris', isMobile: width < 1000, hasTouch: width < 1000 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.clock.install({ time: new Date('2026-10-07T08:00:00Z') });
    await page.clock.pauseAt(new Date('2026-10-07T08:01:00Z'));
    await page.addInitScript(({ k, f }) => { if (localStorage.getItem(k) === null) localStorage.setItem(k, f); }, { k: KEY, f: JSON.stringify(fixture) });
    report[W] = {};
    const screen = async (name) => {
      await page.waitForTimeout(250);
      const a = await audit(page);
      report[W][name] = a;
      if (shots && (width === 390 || width === 360)) {
        await page.screenshot({ path: `${shots}/${String(width)}-${name}.png`, animations: 'disabled' });
        await page.screenshot({ path: `${shots}/${String(width)}-${name}-full.png`, animations: 'disabled', fullPage: true });
      }
      assert.equal(a.theme, 'playfield-pro', `${W} ${name} : thème Playfield Pro actif`);
      assert.equal(a.hscroll, false, `${W} ${name} : défilement horizontal`);
      assert.equal(a.magnesia, false, `${W} ${name} : fond de magnésie V3`);
      return a;
    };
    await page.goto(url);
    await page.locator('.v3-home').waitFor();
    const homeAudit = await screen('1-accueil');
    if (process.env.REKKA_HOME_ONLY === '1') {
      const geometry = await page.evaluate(() => {
        const selectors = {
          app: '.v3-home', logo: '.pf-logo', greeting: '.pf-greeting h1', subtitle: '.pf-greeting p',
          hero: '.v3-today', tag: '.pf-hero-tag', title: '.pf-hero-open strong', date: '.pf-hero-meta',
          series: '.pf-hero-series > strong', segments: '.pf-hero-series-dots', cta: '.v3-today > .btn.primary',
          kpi: '.pf-home-metrics', week: '.pf-home-week', weekTitle: '.pf-home-week > .row > strong',
          strength: '.pf-week-sport[data-sport="strength"]', running: '.pf-week-sport[data-sport="running"]',
          nav: '.tabbar', activeTab: '.tabbar .on',
        };
        return Object.fromEntries(Object.entries(selectors).map(([key, selector]) => {
          const rect = document.querySelector(selector).getBoundingClientRect();
          return [key, { x: rect.x, y: rect.y, w: rect.width, h: rect.height }];
        }));
      });
      if (shots) writeFileSync(`${shots}/${width}-home-geometry.json`, JSON.stringify(geometry, null, 2));
      const home = page.locator('.v3-home');
      for (const label of ['Bonjour, Alex', 'Haut du corps B', '18:30', '0/7 séries', '3/5', '2/3', '1/2']) {
        assert.ok((await home.innerText()).includes(label), `${W} : fixture ${label}`);
      }
      assert.deepEqual(homeAudit.small, [], `${W} : cibles tactiles`);
      const nav = page.getByRole('navigation', { name: 'Navigation principale' });
      if (width <= 390) {
        const gap = geometry.nav.y - geometry.week.y - geometry.week.h;
        assert.ok(gap >= 0, `${W} : navigation sur le bloc semaine (${gap}px)`);
        await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
        const scroll = await page.evaluate(() => ({ y: window.scrollY, available: document.documentElement.scrollHeight - window.innerHeight }));
        assert.ok(scroll.available <= 1 || scroll.y >= scroll.available - 1, `${W} : défilement vertical`);
        assert.ok(await nav.getByRole('button', { name: 'Planning', exact: true }).isVisible());
      }
      await nav.getByRole('button', { name: 'Planning', exact: true }).click();
      await home.waitFor({ state: 'hidden' });
      await nav.getByRole('button', { name: 'Accueil', exact: true }).click();
      await home.waitFor();
      assert.deepEqual(errors, []);
      ok(`${W} : accueil compilé, thème actif, aucun défilement horizontal`);
      await ctx.close();
      continue;
    }
    await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: 'Planning', exact: true }).click();
    await screen('4-planning');
    if (shots && (width === 390 || width === 360)) {
      const planningGeometry = await page.evaluate(() => {
        const selectors = { heading: '.pf-planning-heading', tabs: '[data-planning-controls] .view-switch', board: '.pf-planning-week', firstDay: '.pf-planning-day', firstSession: '.pf-planning-session', weekPicker: '.pf-week-picker' };
        return Object.fromEntries(Object.entries(selectors).map(([name, selector]) => {
          const element = document.querySelector(selector);
          if (!element) return [name, null];
          const r = element.getBoundingClientRect();
          return [name, { x: +r.x.toFixed(2), y: +r.y.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) }];
        }));
      });
      writeFileSync(`${shots}/${String(width)}-planning-geometry.json`, JSON.stringify(planningGeometry, null, 2));
      assert.ok(planningGeometry.board?.width > 0, `${W} : Planning visible`);
      assert.ok(planningGeometry.tabs?.width > 0, `${W} : onglets du Planning visibles`);
    }

    await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: /Progression/ }).click();
    await screen('3-progression');
    await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: 'Profil', exact: true }).click();
    await screen('7-profil');
    assert.equal(await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button').count(), 4, 'V4 : 4 onglets comme la planche');
    await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: 'Planning', exact: true }).click();
    await page.locator('.pf-planning-week .pf-planning-day[data-date="2026-10-07"] .pf-planning-session[data-sport="strength"]').click();
    await page.locator('.pf-preview-open').first().click();
    await page.locator('[data-exercise-detail]').waitFor();
    await screen('5-detail-exercice');
    if (process.env.REKKA_DETAIL_ONLY === '1') {
      const geometry = await page.evaluate(() => {
        const selectors = {
          page: '.pf-exercise-page', header: '.pf-exercise-bar',
          title: '.pf-exercise-identity', exerciseName: '.pf-exercise-identity h1',
          panel: '.pf-exercise-panel', atlas: '.pf-exercise-atlas',
          tabs: '.pf-exercise-switch', info: '.pf-exercise-info',
          demo: '.pf-exercise-demo',
        };
        return Object.fromEntries(Object.entries(selectors).map(([name, selector]) => {
          const element = document.querySelector(selector);
          if (!element) return [name, null];
          const r = element.getBoundingClientRect();
          const round = (n) => Math.round(n * 100) / 100;
          return [name, { x: round(r.x), y: round(r.y), width: round(r.width), height: round(r.height) }];
        }));
      });
      if (shots && (width === 390 || width === 360)) {
        writeFileSync(`${shots}/${String(width)}-detail-geometry.json`, JSON.stringify(geometry, null, 2));
      }
      assert.ok(geometry.atlas?.width > 0 && geometry.atlas?.height > 0, `${W} : atlas visible`);
      assert.ok(Math.abs(geometry.atlas.width / geometry.atlas.height - 835 / 478) < 0.02,
        `${W} : proportions du cadre atlas conformes à la référence`);
      assert.ok(geometry.tabs?.width > 0 && geometry.info?.width > 0, `${W} : onglets et consignes visibles`);
      const detailOverflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(detailOverflow <= 1, `${W} : aucun débordement horizontal sur Détail exercice (${detailOverflow}px)`);
      const tabButtons = page.locator('.pf-exercise-switch button');
      for (const button of await tabButtons.all()) {
        const rect = await button.boundingBox();
        assert.ok(rect && rect.height >= 44, `${W} : onglet accessible à au moins 44 px`);
      }
    }
    await page.getByRole('button', { name: 'Historique', exact: true }).click();
    assert.ok(await page.getByRole('region', { name: 'Historique' }).isVisible());
    await page.getByRole('button', { name: 'Conseils', exact: true }).click();
    assert.ok(await page.getByRole('region', { name: 'Conseils' }).isVisible());
    await page.getByRole('button', { name: /Retour à la liste/ }).click();
    if (process.env.REKKA_DETAIL_ONLY === '1') {
      await page.locator('.pf-preview-open').nth(1).click();
      const detail = page.locator('[data-exercise-detail]');
      assert.notEqual(await detail.getAttribute('data-exercise-detail'), 'ex.bench_press');
      assert.equal(await detail.locator('.pf-exercise-atlas img, img.pf-exercise-atlas').count(), 0);
      await screen('5-detail-variante');
      assert.deepEqual(errors, []);
      await ctx.close();
      continue;
    }
    await page.getByRole('button', { name: 'Commencer la séance', exact: true }).click();
    await page.locator('[data-checkin-form]').getByRole('button', { name: 'Passer', exact: true }).click();
    await page.locator('.v31-workout').waitFor();
    await screen('2-seance-en-cours');
    // Geometry evidence for the real strength UI; no mocked screenshot or edited fixture.
    const workoutGeometry = await page.evaluate(() => {
      const selectors = { page: '.v31-workout[data-sport="strength"]', header: '.v31-sticky-top', session: '.v31-session-bar', overview: '.v31-overview', exercise: '.v3-exercise.v31-exercise[data-expanded="true"]', illustration: '.pf-exercise-illustration', series: '.v31-series-row', next: '.pf-next-inline' };
      const rounded = value => Math.round(value * 100) / 100;
      return Object.fromEntries(Object.entries(selectors).map(([key, selector]) => {
        const el = document.querySelector(selector);
        if (!el) return [key, null];
        const rect = el.getBoundingClientRect();
        return [key, { x:rounded(rect.x), y:rounded(rect.y), width:rounded(rect.width), height:rounded(rect.height) }];
      }));
    });
    if (shots && (width === 360 || width === 390)) writeFileSync(`${shots}/${width}-workout-geometry.json`, JSON.stringify(workoutGeometry, null, 2));
    assert.ok(workoutGeometry.session?.height >= 44, `${W} : bandeau séance visible`);
    assert.ok(workoutGeometry.exercise?.width > 0, `${W} : carte exercice visible`);
    // The active exercise must be measurable. Fail explicitly instead of generating
    // a misleading screenshot when a selector no longer matches the real DOM.
    assert.ok(workoutGeometry.illustration?.width > 0, `${W} : illustration du développé couché présente`);
    assert.ok(workoutGeometry.series?.width > 0, `${W} : première ligne de série présente`);
    assert.ok(workoutGeometry.series.width <= workoutGeometry.exercise.width + 1, `${W} : série contenue dans la carte`);
    if (process.env.REKKA_WORKOUT_ONLY === '1') {
      const layout = await page.evaluate(() => {
        const selectors = {
          toolbar: '.v31-toolbar', title: '.v31-toolbar h1', session: '.v31-session-bar',
          overview: '.v31-overview', progress: '.v31-progress',
          exercise: '.v31-exercise[data-expanded="true"]',
          illustration: '.pf-exercise-illustration', columnLabels: '.pf-set-columns',
          firstSet: '.v31-series-row', nextExercise: '.pf-next-inline',
        };
        const rect = (selector) => {
          const el = document.querySelector(selector);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const round = v => Math.round(v * 100) / 100;
          return { x:round(r.x), y:round(r.y), width:round(r.width), height:round(r.height) };
        };
        return Object.fromEntries(Object.entries(selectors).map(([name, selector]) => [name,rect(selector)]));
      });
      if (shots) writeFileSync(`${shots}/${width}-workout-layout.json`, JSON.stringify(layout, null, 2));
      for (const key of ['toolbar', 'session', 'overview', 'exercise', 'illustration', 'firstSet']) {
        assert.ok(layout[key]?.width > 0, `${W} : bloc obligatoire non mesurable : ${key}`);
      }
      const auditWorkout = await audit(page);
      assert.equal(auditWorkout.hscroll, false, `${W} : débordement horizontal de la séance`);
    }

    const row = page.locator('.v3-exercise[data-expanded="true"] .v31-series-row').first();
    const kgInput = row.getByLabel(/^Charge \(kg\)/);
    const repsInput = row.getByLabel(/^Répétitions réalisées/);
    const kgBefore = await kgInput.inputValue();
    await row.getByRole('button', { name: /Augmenter charge/ }).click();
    assert.equal(Number(await kgInput.inputValue()), (Number(kgBefore || 0) + 2.5), `${W} : +2,5 kg dans le brouillon`);
    await row.getByRole('button', { name: /Diminuer charge/ }).click();
    assert.equal(Number(await kgInput.inputValue()), Number(kgBefore || 0), `${W} : retour à la charge initiale`);
    const repsBefore = await repsInput.inputValue();
    await row.getByRole('button', { name: /Augmenter répétitions/ }).click();
    assert.equal(Number(await repsInput.inputValue()), Number(repsBefore || 0) + 1, `${W} : +1 répétition dans le brouillon`);
    await row.getByRole('button', { name: /Diminuer répétitions/ }).click();
    assert.equal(Number(await repsInput.inputValue()), Number(repsBefore || 0), `${W} : retour aux répétitions initiales`);
    await kgInput.click();
    await row.getByLabel(/^Charge \(kg\)/).fill('24');
    await row.getByLabel(/^Répétitions réalisées/).fill('10');
    await screen('2b-saisie');
    await row.getByRole('button', { name: 'Cocher la série', exact: true }).click();
    await page.waitForTimeout(400);
    if (process.env.REKKA_EXERCISE_ART_ONLY === '1') {
      const firstArt = page.locator('[data-workout-art]');
      const category = await firstArt.getAttribute('data-workout-art');
      assert.equal(category, 'upper');
      const logsBefore = await page.evaluate(k => JSON.parse(localStorage.getItem(k)).programmeLogs, KEY);
      const navigationBefore = await page.evaluate(() => performance.timeOrigin);
      await page.locator('.pf-next-inline').click();
      assert.equal(await firstArt.getAttribute('data-workout-art'), category);
      assert.deepEqual(await page.evaluate(k => JSON.parse(localStorage.getItem(k)).programmeLogs, KEY), logsBefore);
      assert.equal(await page.evaluate(() => performance.timeOrigin), navigationBefore);
      assert.deepEqual(errors, []);
      console.log('OK: illustration de séance stable, navigation et données intactes');
      await ctx.close();
      continue;
    }
    await screen('2c-serie-validee-repos');
    const total = await page.evaluate((k) => Object.values(JSON.parse(localStorage.getItem(k)).programmeLogs).find((l) => l.rest)?.rest.totalS, KEY);
    await page.clock.runFor(Math.round(total / 2) * 1000 + 50);
    const frac = Number(await page.locator('.v31-rest').getAttribute('data-rest-fraction'));
    assert.ok(Math.abs(frac - 0.5) < 0.02, `${W} : anneau ≈ 50 % (${String(frac)})`);
    await screen('2d-repos-50');
    await page.evaluate(() => { const s = document.querySelector('.overlay') ?? document.scrollingElement; s.scrollTop = 100000; window.scrollTo(0, 100000); });
    await page.waitForTimeout(200);
    assert.ok(await page.getByRole('timer', { name: 'Chronomètre global' }).isVisible() && await page.getByRole('timer', { name: 'Chrono de repos' }).isVisible(), `${W} : chronomètres visibles après défilement`);
    await screen('2e-defilement');
    if (process.env.REKKA_WORKOUT_ONLY === '1') {
      assert.deepEqual(errors, [], `${W} : erreurs JavaScript pendant la séance`);
      ok(`${W} : séance en cours mesurée et contrôles de séries/repos validés`);
      await ctx.close();
      continue;
    }
    await page.locator('.v31-finish').click();
    const fin = page.getByRole('dialog', { name: 'Fin de séance' });
    await fin.waitFor();
    await screen('6a-confirmation-fin');
    await fin.getByRole('radio', { name: /J’ai adapté la séance/ }).click();
    await fin.getByRole('button', { name: 'Enregistrer' }).click();
    await page.getByText('Séance terminée').first().waitFor();
    await page.evaluate(() => { const s = document.querySelector('.overlay') ?? document.scrollingElement; s.scrollTop = 0; window.scrollTo(0, 0); });
    if (process.env.REKKA_PROBE) console.log('PROBE', await page.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); const b = getComputedStyle(e).backgroundColor; return r.top < 200 && r.height > 40 && r.width > 300 && /rgb\((1[0-9]|2[0-9]|3[0-9]), /.test(b); }).map((e) => `${e.tagName}.${String(e.className)} ${getComputedStyle(e).backgroundColor}`).slice(0, 6)));
    await screen('6-bilan');
    // Progression après la séance de démonstration : données réellement enregistrées (aucune courbe fictive).
    await page.getByRole('button', { name: 'Retour', exact: true }).first().click().catch(() => {});
    await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: /Progression/ }).click();
    await screen('3b-progression-apres-seance');
    assert.deepEqual(errors, []);
    ok(`${W} : sept écrans parcourus, thème actif, aucune magnésie, aucun défilement horizontal`);
    await ctx.close();
  }
  for (const [w, screens] of Object.entries(report)) for (const [n, a] of Object.entries(screens)) {
    console.log(`${w} ${n} | cibles<44 : ${String(a.small.length)}${a.small.length ? ` [${a.small.slice(0, 6).join(' ; ')}]` : ''} | néon V3 : ${String(a.neon.length)}${a.neon.length ? ` [${a.neon.slice(0, 3).join(' ; ')}]` : ''} | contraste faible : ${String(a.lowContrast.length)}${a.lowContrast.length ? ` [${a.lowContrast.slice(0, 8).join(' ; ')}]` : ''}`);
  }
  if (process.env.REKKA_EXERCISE_ART_ONLY !== '1') console.log(process.env.REKKA_HOME_ONLY === '1' ? 'E2E V4 ACCUEIL OK' : process.env.REKKA_DETAIL_ONLY === '1' ? 'E2E V4 DÉTAIL OK' : 'E2E V4 SEPT ÉCRANS OK');
} finally {
  await browser.close();
  server.close();
}
