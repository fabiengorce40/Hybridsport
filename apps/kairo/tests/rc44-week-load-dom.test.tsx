// @vitest-environment jsdom
/**
 * RC4.4 — lots B et D dans l'interface (backend réel → DOM) : avertissements de charge du Planning (7 jours sur 7,
 * plus longue suite, interférences non résolues, sans code interne) ; séries retirées par un allègement au démarrage
 * (par groupe musculaire, non redistribuées).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createBeta0Programme, emptyState, EQUIPMENT_PRESETS, MemoryStorage, saveState, selectBeta0Week, weekLoadWarnings } from '@hybridsport/app-core';
import type { Clock } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';
import { PROFILES } from '../../../packages/app-core/tests/rc4-audit/rc4-sim.js';

afterEach(cleanup);
const now = '2026-10-05T07:30:00.000Z';
const clock = (): Clock => ({ today: now.slice(0, 10), now });
const gym = EQUIPMENT_PRESETS.find((p) => p.id === 'preset.commercial_gym')?.equipment ?? [];
const INTERNAL = /M3_|lower_knee|lower_hip|locomotor|GLOBAL_PLACEMENT|PLAN\.|RECOVERY\.|TEST_ONLY/;
const mount = (s: MemoryStorage) => render(<StoreProvider storage={s} clock={clock}><App /></StoreProvider>);

describe('RC4.4 — avertissements du Planning', () => {
  it('quatre sports, 7 jours sur 7 : avertissement explicite, interférences lisibles, aucune séance retirée', () => {
    const p5 = PROFILES.find((x) => x.id === 'P5');
    if (!p5) throw new Error('P5');
    const s = createBeta0Programme(emptyState(), p5.profile, clock(), { ...(p5.lastRun ? { lastRun: p5.lastRun } : {}) });
    const kinds = weekLoadWarnings(s, '2026-10-05').map((w) => w.kind);
    expect(kinds).toContain('seven_days');
    const storage = new MemoryStorage();
    saveState(storage, s);
    mount(storage);
    fireEvent.click(screen.getByRole('button', { name: 'Planning' }));
    const box = document.querySelector('[data-week-warnings]');
    expect(box?.textContent).toContain('Charge de la semaine à surveiller');
    expect(document.querySelector('[data-week-warning="seven_days"]')?.textContent).toContain('7 jours d’entraînement sur 7');
    expect(document.querySelector('[data-week-warning="seven_days"]')?.textContent).toContain('n’est pas optimale');
    for (const k of kinds) expect(document.querySelector(`[data-week-warning="${k}"]`)).toBeTruthy();
    if (kinds.includes('multisport_conflict')) expect(document.querySelector('[data-week-warning="multisport_conflict"]')?.textContent).toMatch(/sollicitent (genoux|hanches|poussées|tirages|préhension|tronc|bas du dos)/);
    expect(box?.textContent ?? '').not.toMatch(INTERNAL);
    expect((selectBeta0Week(s, '2026-10-05')?.sessions ?? []).filter((x) => x.placement === 'planned')).toHaveLength(7);
  });

  it('semaine sans suite de jours ni conflit : aucun bandeau', () => {
    const storage = new MemoryStorage();
    const s = createBeta0Programme(emptyState(), {
      displayName: '', level: 'intermediate', priorities: ['strength'], strength: { enabled: true, goal: 'hypertrophy', sessionsPerWeek: 3 },
      running: { enabled: false, population: 'P_R1', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' },
      crosstraining: { enabled: false }, hyrox: { enabled: false },
      equipment: { presetId: 'preset.commercial_gym', items: [...gym], confirmedAt: '2026-10-04T10:00:00.000Z' }, availability: [75, 0, 75, 0, 75, 0, 0], excludedExercises: [], acceptedProvisionalAt: '2026-10-04T10:00:00Z',
    }, clock(), {});
    expect(weekLoadWarnings(s, '2026-10-05')).toEqual([]);
    saveState(storage, s);
    mount(storage);
    fireEvent.click(screen.getByRole('button', { name: 'Planning' }));
    expect(document.querySelector('[data-week-warnings]')).toBeNull();
  });
});

describe('RC4.4 — séries retirées par un allègement au démarrage', () => {
  it('genou P2 : groupes et séries retirées affichés, sans redistribution annoncée', () => {
    const storage = new MemoryStorage();
    saveState(storage, createBeta0Programme(emptyState(), {
      displayName: '', level: 'intermediate', priorities: ['strength'], strength: { enabled: true, goal: 'hypertrophy', sessionsPerWeek: 3 },
      running: { enabled: false, population: 'P_R1', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' },
      crosstraining: { enabled: false }, hyrox: { enabled: false },
      equipment: { presetId: 'preset.commercial_gym', items: [...gym], confirmedAt: '2026-10-04T10:00:00.000Z' }, availability: [75, 0, 75, 0, 75, 0, 0], excludedExercises: [], acceptedProvisionalAt: '2026-10-04T10:00:00Z',
    }, clock(), {}));
    mount(storage);
    fireEvent.click(screen.getByRole('button', { name: 'Planning' }));
    fireEvent.click(screen.getAllByRole('button', { name: /^Musculation/ })[0] as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: 'Commencer la séance' }));
    const dialog = () => screen.getByRole('dialog', { name: 'Avant de commencer' });
    const radio = (group: string, name: string) => fireEvent.click(within(within(dialog()).getByRole('radiogroup', { name: group })).getByRole('radio', { name }));
    radio('Avez-vous une douleur en ce moment ?', 'Oui');
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Genou' }));
    radio('Intensité · Genou', 'Douleur qui gêne certains mouvements');
    radio('Fatigue aujourd’hui', 'Faible');
    radio('Récupération depuis la dernière séance', 'Bonne');
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Valider et commencer' }));
    const d = document.querySelector('[data-volume-deficit]');
    expect(d?.textContent).toContain('non redistribuées');
    expect(d?.textContent).toMatch(/Quadriceps −\d/);
    expect(d?.textContent ?? '').not.toMatch(/quads|hamstrings|glutes/);
  });
});
