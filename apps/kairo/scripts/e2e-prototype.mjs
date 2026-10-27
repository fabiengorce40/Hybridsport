/* global document, window, localStorage, getComputedStyle */
/**
 * REKKA V2 — prototype isolé (lot V2-2) dans Chromium mobile (360 et 390 px) : bandeau « démonstration » visible sur
 * chaque écran, navigation à 5 onglets, Accueil → Séance, Planning liste / grille, phases et validation d'une série,
 * chronomètre et pause, Progression (graphique, records, jalons, indicateur indisponible), aucun défilement horizontal,
 * polices V2 chargées depuis le prototype lui-même, aucune requête externe, aucune écriture dans le stockage local,
 * aucune erreur. Lot V2-2B : ressources du kit (logo SVG, illustrations WebP, badges, décorations) chargées, aucune
 * capture ni maquette affichée, décorations sans capture des touchers. Captures dans le dossier donné.
 * Usage : node scripts/e2e-prototype.mjs [dossier de captures] — serveur du prototype sur E2E_URL.
 */
import { chromium } from 'playwright';

const URL_ = process.env.E2E_URL ?? 'http://localhost:4180/';
const shots = process.argv[2];
const fail = (m) => { console.error(`ÉCHEC : ${m}`); process.exit(1); };
const check = (cond, m) => { if (!cond) fail(m); console.log(`ok  ${m}`); };
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

for (const width of [360, 390]) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 3, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36', isMobile: true, hasTouch: true, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  const page = await ctx.newPage();
  const errors = [];
  const external = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', (r) => { if (!r.url().startsWith(new URL(URL_).origin) && !r.url().startsWith('data:')) external.push(r.url()); });
  const w = String(width);
  const shot = async (n, full = false) => { if (shots) await page.screenshot({ path: `${shots}/v2-${w}-${n}.png`, fullPage: full }); };
  const noHScroll = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  const banner = async (where) => check(await page.locator('[data-demo-banner]').isVisible(), `${w} px · ${where} : bandeau « données de démonstration » visible`);
  const tab = (name) => page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name, exact: true });

  // Accueil
  await page.goto(URL_);
  await page.getByRole('main', { name: 'Accueil' }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await banner('Accueil');
  check(await page.evaluate(() => document.documentElement.dataset.theme) === 'v2', `${w} px : thème V2 actif`);
  check(await page.evaluate(() => document.fonts.check("800 20px 'REKKA Barlow Condensed'") && document.fonts.check("400 15px 'REKKA Inter'")), `${w} px : polices V2 locales chargées`);
  const loaded = (sel) => page.locator(sel).first().evaluate((i) => i.complete && i.naturalWidth > 0);
  check(await page.getByRole('img', { name: 'REKKA' }).isVisible() && await loaded('.p-hero-logo'), `${w} px : logo du kit affiché (SVG)`);
  check(await loaded('[data-art="accueil"] img'), `${w} px : illustration anime WebP chargée`);
  check(await page.evaluate(() => [...document.images].every((i) => !/\.png|references/.test(i.src))), `${w} px : aucune capture ni maquette PNG affichée`);
  check(await page.evaluate(() => [...document.querySelectorAll('.p-deco-corner, .p-divider')].every((d) => getComputedStyle(d).pointerEvents === 'none' && Number(getComputedStyle(d).opacity) <= 0.6)), `${w} px : décorations discrètes, sans capture des touchers`);
  const cta = await page.getByRole('button', { name: 'Commencer la séance' }).boundingBox();
  check(cta !== null && await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('button')?.getAttribute('aria-label'), { x: cta.x + cta.width / 2, y: cta.y + cta.height / 2 }) === 'Commencer la séance', `${w} px : action principale non masquée par une décoration`);
  const tabs = await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button').evaluateAll((b) => b.map((x) => x.getBoundingClientRect()).map((r) => Math.min(r.width, r.height)));
  check(tabs.every((m) => m >= 44), `${w} px : onglets ≥ 44 px (${tabs.map((m) => String(Math.round(m))).join(', ')})`);
  check(cta !== null && cta.y + cta.height <= 800, `${w} px : action principale visible sans défilement (y = ${String(Math.round(cta?.y ?? 0))})`);
  check(await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button').allInnerTexts().then((t) => t.join('|')) === 'Accueil|Planning|Séances|Progression|Profil', `${w} px : navigation Accueil / Planning / Séances / Progression / Profil`);
  check(await noHScroll(), `${w} px : Accueil sans défilement horizontal`);
  await shot('01-accueil');
  await shot('01-accueil-complet', true);

  // Planning
  await tab('Planning').click();
  await page.getByRole('main', { name: 'Planning' }).waitFor();
  await banner('Planning');
  check(await page.locator('[data-view="list"]').isVisible(), `${w} px : Planning en liste par défaut`);
  const states = (await page.locator('.p-state').allTextContents()).join('|');
  check(['Réalisée', 'Prévue', 'Déplacée', 'Annulée'].every((x) => states.includes(x)), `${w} px : états prévu / réalisé / déplacé / annulé écrits (pas seulement en couleur)`);
  check(await noHScroll(), `${w} px : Planning liste sans défilement horizontal`);
  await shot('02-planning-liste');
  await page.getByRole('button', { name: 'Grille' }).click();
  check(await page.locator('[data-view="grid"]').isVisible() && await page.getByRole('button', { name: 'Grille' }).getAttribute('aria-pressed') === 'true', `${w} px : bascule en grille`);
  check(await page.locator('.p-grid-row').count() === 7, `${w} px : grille, une ligne par jour`);
  check(await noHScroll(), `${w} px : Planning grille sans défilement horizontal`);
  await shot('03-planning-grille');

  // Séance
  await tab('Accueil').click();
  await page.getByRole('button', { name: 'Commencer la séance' }).click();
  await page.getByRole('main', { name: 'Séance Musculation' }).waitFor();
  await banner('Séance');
  const squat = page.getByRole('region', { name: /: Squat barre$/ });
  check(await squat.getByRole('group', { name: /^Montée en charge,/ }).isVisible() && await squat.getByRole('group', { name: /^Séries de travail,/ }).isVisible(), `${w} px : phases « Montée en charge » / « Séries de travail » titrées`);
  check(await page.getByRole('group', { name: /^Retour en charge/ }).count() === 1 && await page.locator('[data-illustrative]').count() === 1, `${w} px : back-off présenté comme exemple visuel identifié`);
  check(await page.locator('[data-adapted-tag]').count() === 1, `${w} px : exercice adapté signalé par un texte`);
  const clockBox = await page.locator('[data-proto-clock]').boundingBox();
  check(clockBox !== null && clockBox.y < 140 && clockBox.x + clockBox.width <= width, `${w} px : chronomètre global dans la barre du haut, visible`);
  check((await page.locator('[data-proto-clock]').getAttribute('aria-label'))?.includes('simulation') === true, `${w} px : chronomètre annoncé comme simulation`);
  const cur = page.locator('.r-set[data-state="current"]');
  check(await cur.count() === 1 && await cur.getAttribute('data-kind') === 'work', `${w} px : une seule série en cours (1re série de travail, montées validées)`);
  const curBox = await cur.boundingBox();
  const restBox = await page.locator('.p-restbar').boundingBox();
  check(curBox !== null && restBox !== null && curBox.y + curBox.height <= restBox.y, `${w} px : la série en cours n’est pas masquée par la barre de repos`);
  await cur.getByRole('button', { name: /^Cocher/ }).click();
  await page.getByRole('button', { name: 'Décocher la série 3, Squat barre (simulation)' }).click();
  check(await page.locator('.r-set[data-state="current"]').getAttribute('data-kind') === 'warmup', `${w} px : état indépendant du type (montée décochée → en cours)`);
  const cur2 = await page.locator('.r-set[data-state="current"]').boundingBox();
  check(cur2 !== null && restBox !== null && cur2.y + cur2.height <= restBox.y && cur2.y >= 60, `${w} px : nouvelle série en cours amenée au-dessus de la barre de repos`);
  check(await noHScroll(), `${w} px : Séance sans défilement horizontal`);
  await shot('04-seance');
  await page.getByRole('button', { name: 'Mettre la séance en pause (simulation)' }).click();
  check((await page.locator('[data-proto-clock]').innerText()).includes('En pause'), `${w} px : pause de séance libellée, distincte du repos`);
  check((await page.getByRole('timer').getAttribute('aria-label'))?.startsWith('Repos (simulation)') === true, `${w} px : repos distinct du chronomètre global`);
  await squat.getByRole('group', { name: /^Séries de travail,/ }).scrollIntoViewIfNeeded();
  await shot('05-seance-pause-travail');
  await page.getByRole('button', { name: 'Retour' }).click();

  // Progression
  await tab('Progression').click();
  await page.getByRole('main', { name: 'Progression' }).waitFor();
  await banner('Progression');
  check(await page.getByRole('region', { name: 'Évolution des charges' }).isVisible() && await page.getByRole('region', { name: 'Records confirmés' }).isVisible() && await page.getByRole('region', { name: 'Jalons' }).isVisible(), `${w} px : graphique, records, jalons`);
  check(await noHScroll(), `${w} px : Progression sans défilement horizontal`);
  const chips = page.getByRole('group', { name: 'Discipline' });
  check(await chips.evaluate((c) => c.scrollWidth <= c.clientWidth) && (await chips.getByRole('button').evaluateAll((b) => b.every((x) => x.getBoundingClientRect().height >= 44))), `${w} px : quatre filtres visibles, cibles ≥ 44 px`);
  check(await page.locator('.p-badge2.locked .p-badge-img').evaluate((i) => getComputedStyle(i).filter.includes('grayscale')) && ((await page.locator('.p-badge2.locked').textContent()) ?? '').includes('À venir'), `${w} px : badge verrouillé grisé et libellé « À venir »`);
  await shot('06-progression');
  await shot('06-progression-complet', true);
  await page.getByRole('button', { name: 'HYROX', exact: true }).click();
  check(await page.locator('[data-unavailable]').isVisible(), `${w} px : indicateur indisponible présenté comme tel`);
  await tab('Séances').click();
  await page.getByRole('main', { name: 'Séances' }).waitFor();
  await shot('07-seances');
  await tab('Profil').click();
  await page.getByRole('main', { name: 'Profil' }).waitFor();
  await banner('Profil');
  check(!/niveau|XP/i.test(await page.getByRole('main', { name: 'Profil' }).innerText()), `${w} px : Profil sans niveau ni XP inventé`);
  check(await page.getByRole('img', { name: 'Avatar de démonstration' }).isVisible(), `${w} px : avatar provisoire identifié`);
  check(await noHScroll(), `${w} px : Profil sans défilement horizontal`);
  await shot('08-profil');
  check(true, `${w} px : 5 onglets navigables`);

  // Canonical review captures: initial screen state, with its header visible.
  if (shots) for (const screen of ['accueil', 'planning', 'seance', 'progression', 'profil']) {
    await page.goto(`${URL_}?ecran=${screen}`);
    await page.evaluate(() => document.fonts.ready);
    await page.locator('main').waitFor();
    await page.locator('.p-ambience img').first().evaluate((img) => img.decode());
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot(`review-${screen}`);
  }

  check(await page.evaluate(() => localStorage.length) === 0, `${w} px : aucune donnée écrite dans le stockage local`);
  check(external.length === 0, `${w} px : aucune requête externe (${external.join(', ')})`);
  check(errors.length === 0, `${w} px : aucune erreur (${errors.join(' | ')})`);
  await ctx.close();
}
await browser.close();
console.log('E2E PROTOTYPE V2 OK');
