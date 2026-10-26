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

  it('Accueil : bandeau démonstration, provisoires identifiés, navigation à 5 onglets', () => {
    render(<Prototype />);
    expect(screen.getByRole('note').textContent).toMatch(/données de démonstration/);
    expect(within(nav()).getAllByRole('button').map((b) => b.textContent)).toEqual(['Accueil', 'Planning', 'Séances', 'Progression', 'Profil']);
    // Logo et illustration : ressources PROVISOIRES identifiées (nom accessible et étiquette visible).
    expect(screen.getByRole('img', { name: /Logo provisoire/ })).toBeTruthy();
    expect(screen.getByRole('img', { name: /illustration provisoire/ })).toBeTruthy();
    expect(screen.getByText('Illustration provisoire')).toBeTruthy();
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
    expect(current()[0]?.getAttribute('data-kind')).toBe('warmup');
    fireEvent.click(within(current()[0] as HTMLElement).getByRole('button'));
    expect(current()[0]?.getAttribute('data-kind')).toBe('work');
    const clock = document.querySelector('[data-proto-clock]');
    expect(clock?.getAttribute('aria-label')).toMatch(/simulation/);
    fireEvent.click(screen.getByRole('button', { name: 'Pause séance' }));
    expect(clock?.textContent).toMatch(/Séance en pause/);
    expect(screen.queryByRole('navigation', { name: 'Navigation principale' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(screen.getByRole('main', { name: 'Accueil' })).toBeTruthy();
  });

  it('Progression : graphique, records, jalons ; indicateur indisponible présenté comme tel ; aucun stockage', () => {
    render(<Prototype />);
    go('Progression');
    expect(screen.getByRole('region', { name: 'Évolution des charges' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Records confirmés' })).toBeTruthy();
    expect(screen.getAllByRole('article', { name: /: (obtenu|à venir)$/ }).length).toBe(3);
    fireEvent.click(screen.getByRole('button', { name: 'HYROX' }));
    expect(document.querySelector('[data-unavailable]')?.textContent).toMatch(/non disponible/);
    go('Séances');
    go('Profil');
    expect(screen.getByRole('main', { name: 'Profil' })).toBeTruthy();
    expect(window.localStorage.length).toBe(0);
  });
});
