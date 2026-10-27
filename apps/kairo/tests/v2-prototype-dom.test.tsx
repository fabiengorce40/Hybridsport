// @vitest-environment jsdom
/**
 * REKKA V2 — prototype isolé (lot V2-2) : 4 écrans de référence navigables, bandeau « démonstration » toujours visible,
 * navigation Accueil / Planning / Séances / Progression / Profil, Planning liste / grille, phases et état des séries,
 * chronomètre annoncé comme simulation, indicateur indisponible présenté comme tel. ISOLATION : le prototype n'importe
 * ni app-core, ni le magasin de l'application, ni aucun moteur, et n'écrit rien dans le stockage local.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { Prototype } from '../prototype/Prototype.js';
import logoPrimary from '../prototype/art/visual/logo-brush.svg';
import artAccueil from '../prototype/art/visual/accueil.webp';
import badgeObjectif from '../src/assets/rekka-v2/badges/objectif-atteint.svg';

afterEach(cleanup);
const nav = () => screen.getByRole('navigation', { name: 'Navigation principale' });
const go = (name: string) => fireEvent.click(within(nav()).getByRole('button', { name }));

describe('REKKA V2 — prototype', () => {
  it('isolation : aucun import de l’application ni des moteurs (seulement le design system)', () => {
    // Environnement jsdom : `import.meta.url` n'est pas un chemin de fichier ; dossier résolu depuis la racine du dépôt.
    const dir = [join(process.cwd(), 'apps/kairo/prototype/'), join(process.cwd(), 'prototype/')].find((d) => existsSync(d)) ?? '';
    for (const f of readdirSync(dir).filter((x) => /\.tsx?$/.test(x))) {
      const imports = [...readFileSync(join(dir, f), 'utf8').matchAll(/from '([^']+)'/g)].map((m) => m[1] ?? '');
      for (const i of imports) expect([f, i.startsWith('@hybridsport') || /src\/(store|App|screens|workout)/.test(i)]).toEqual([f, false]);
    }
  });

  it('Accueil : bandeau démonstration, logo et illustration du kit, navigation à 5 onglets', () => {
    render(<Prototype />);
    expect(screen.getByRole('note').textContent).toMatch(/données de démonstration/);
    expect(within(nav()).getAllByRole('button').map((b) => b.textContent)).toEqual(['Accueil', 'Planning', 'Séances', 'Progression', 'Profil']);
    // Logo du kit (fichier SVG, nom accessible) ; 烈火 et la devise en TEXTE HTML, jamais dans une image.
    expect(screen.getByRole('img', { name: 'REKKA' }).getAttribute('src')).toBe(logoPrimary);
    expect(screen.getByText('烈火').getAttribute('lang')).toBe('ja');
    expect(screen.getByText('Nourris ta flamme.')).toBeTruthy();
    // Illustration anime autonome, avec texte alternatif.
    const hero = screen.getByRole('img', { name: /Ville néon cyberpunk/ });
    expect(hero.getAttribute('src')).toBe(artAccueil);
    expect(hero.closest('[data-art="accueil"]')).not.toBeNull();
    expect(screen.queryByText('Illustration à valider')).toBeNull();
    // Aucune image de maquette ni capture : seules des ressources du kit (SVG / WebP).
    for (const img of document.querySelectorAll('img')) expect(img.getAttribute('src') ?? '').not.toMatch(/\.png|references/);
    // Pictogrammes de navigation : masques `currentColor`, décoratifs (le libellé texte nomme l'onglet).
    expect(nav().querySelectorAll('.r-mask-icon[aria-hidden="true"]').length).toBe(5);
    expect(within(nav()).getByRole('button', { name: 'Accueil' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('region', { name: 'Séance du jour' })).toBeTruthy();
    expect(within(screen.getByRole('navigation', { name: 'Disciplines' })).getAllByRole('button').length).toBe(4);
    expect(within(screen.getByRole('region', { name: 'Ma semaine' })).getAllByRole('listitem').length).toBe(7);
  });

  it('Planning : liste puis grille (une ligne par jour), états écrits', () => {
    render(<Prototype />);
    go('Planning');
    expect(document.querySelector('[data-view="list"]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Grille' }));
    expect(screen.getByRole('button', { name: 'Grille' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('table', { name: 'Semaine en grille' }).querySelectorAll('[role="row"]').length).toBe(7);
    expect(screen.getAllByText(/Déplacée/).length).toBeGreaterThan(0);
  });

  it('Séance : phases titrées, une série en cours, validation, chronomètre de simulation et pause', () => {
    render(<Prototype />);
    fireEvent.click(screen.getByRole('button', { name: 'Commencer la séance' }));
    const squat = screen.getByRole('region', { name: /: Squat barre$/ });
    expect(within(squat).getByRole('group', { name: /^Montée en charge,/ })).toBeTruthy();
    expect(within(squat).getByRole('group', { name: /^Séries de travail,/ })).toBeTruthy();
    const current = () => document.querySelectorAll('.r-set[data-state="current"]');
    expect(current().length).toBe(1);
    // Montées validées : la première série de TRAVAIL est en cours.
    expect(current()[0]?.getAttribute('data-kind')).toBe('work');
    fireEvent.click(within(current()[0] as HTMLElement).getByRole('button', { name: /^Cocher/ }));
    expect(current()[0]?.getAttribute('data-kind')).toBe('work');
    // État indépendant du type : décocher une montée la remet « en cours ».
    fireEvent.click(screen.getByRole('button', { name: 'Décocher la série 3, Squat barre (simulation)' }));
    expect(current()[0]?.getAttribute('data-kind')).toBe('warmup');
    // Charges et répétitions modifiables (simulation locale).
    const reps = within(current()[0] as HTMLElement).getByLabelText(/^Répétitions, série 3/) as HTMLInputElement;
    fireEvent.change(reps, { target: { value: '4' } });
    expect(reps.value).toBe('4');
    expect(screen.getByRole('timer', { name: /^Repos \(simulation\)/ })).toBeTruthy();
    const clock = document.querySelector('[data-proto-clock]');
    expect(clock?.getAttribute('aria-label')).toMatch(/simulation/);
    fireEvent.click(screen.getByRole('button', { name: 'Mettre la séance en pause (simulation)' }));
    expect(clock?.textContent).toMatch(/En pause/);
    expect(within(nav()).getByRole('button', { name: 'Séances' }).getAttribute('aria-current')).toBe('page');
    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(screen.getByRole('main', { name: 'Accueil' })).toBeTruthy();
  });

  it('Progression : graphique, records, jalons ; indicateur indisponible présenté comme tel ; aucun stockage', () => {
    render(<Prototype />);
    go('Progression');
    expect(screen.getByRole('region', { name: 'Évolution des charges' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Records confirmés' })).toBeTruthy();
    expect(screen.getAllByRole('article', { name: /: (obtenu|à venir)$/ }).length).toBe(3);
    // Badges du kit : jalon verrouillé grisé ET libellé « À venir » (jamais la couleur seule).
    const locked = screen.getByRole('article', { name: /: à venir$/ });
    expect(locked.className).toMatch(/locked/);
    expect(locked.querySelector('img.p-badge-img')?.getAttribute('src')).toBe(badgeObjectif);
    expect(locked.textContent).toMatch(/À venir/);
    expect(screen.getByRole('group', { name: 'Discipline' }).hasAttribute('data-scroll-x')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'HYROX' }));
    expect(document.querySelector('[data-unavailable]')?.textContent).toMatch(/non disponible/);
    go('Séances');
    go('Progression');
    fireEvent.click(screen.getByRole('button', { name: 'Musculation' }));
    fireEvent.click(screen.getByRole('button', { name: '4 semaines' }));
    expect(screen.getByRole('button', { name: '4 semaines' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('figure').getAttribute('aria-label')).toMatch(/de 67,5 à 72,5 kg/);
    go('Profil');
    const profile = screen.getByRole('main', { name: 'Profil' });
    // Aucun niveau ni XP inventé (le « niveau 28 » de la maquette est illustratif).
    expect(profile.textContent).not.toMatch(/niveau|XP/i);
    expect(screen.getByRole('img', { name: 'Avatar de démonstration' })).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Objectifs' })).getAllByText(/Musculation|Course|HYROX|Cross-training/).length).toBe(4);
    fireEvent.click(screen.getByRole('tab', { name: 'Badges' }));
    expect(screen.getByRole('region', { name: 'Badges' })).toBeTruthy();
    expect(window.localStorage.length).toBe(0);
  });
});
