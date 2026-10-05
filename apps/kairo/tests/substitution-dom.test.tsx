// @vitest-environment jsdom
/**
 * Strength S2 — séance Musculation réelle (backend réel) jusqu'au DOM : React affiche UNIQUEMENT les alternatives
 * validées par le moteur ; aucune ⇒ aucune mention ; une ⇒ singulier ; plusieurs ⇒ « compatibles ».
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createBeta0Programme, emptyState, EQUIPMENT_PRESETS, exerciseLabel, MemoryStorage, saveState } from '@hybridsport/app-core';
import type { Clock } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';
import { alternativesText } from '../src/workout/StrengthWorkout.js';

afterEach(cleanup);
const clock = (): Clock => ({ today: '2026-10-05', now: '2026-10-05T07:30:00.000Z' });
const fullGym = EQUIPMENT_PRESETS.find((p) => p.id === 'preset.full_gym')?.equipment ?? [];

describe('alternatives dans la séance', () => {
  it('séance Haut du corps : pec deck sans alternative ; rowing machine → une alternative ; développé couché → alternatives compatibles', () => {
    const storage = new MemoryStorage();
    saveState(storage, createBeta0Programme(emptyState(), {
      displayName: '', level: 'intermediate', priorities: ['strength'], strength: { enabled: true, goal: 'hypertrophy', sessionsPerWeek: 4 },
      running: { enabled: false, population: 'P_R1', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' },
      crosstraining: { enabled: false }, hyrox: { enabled: false }, equipment: { presetId: 'preset.full_gym', items: [...fullGym] },
      availability: [60, 60, 60, 60, 60, 0, 60], excludedExercises: [], acceptedProvisionalAt: '2026-10-04T10:00:00Z',
    }, clock(), {}));
    render(<StoreProvider storage={storage} clock={clock}><App /></StoreProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Commencer la séance' }));
    fireEvent.click(screen.getByRole('button', { name: 'Commencer la séance' }));
    const section = (id: string) => screen.getByRole('region', { name: new RegExp(`: ${exerciseLabel(id)}$`) }).textContent ?? '';
    expect(section('ex.pec_deck')).not.toMatch(/Alternative/);
    expect(section('ex.bench_press')).toContain(`Alternatives prévues (compatibles) : ${exerciseLabel('ex.db_bench_press')}, ${exerciseLabel('ex.machine_chest_press')}.`);
    expect(section('ex.machine_row')).toContain(`Alternative prévue : ${exerciseLabel('ex.seated_cable_row')}.`);
  });

  it('texte : aucune ⇒ vide ; une ⇒ singulier ; plusieurs ⇒ « compatibles » (aucun calcul dans React)', () => {
    expect(alternativesText([])).toBe('');
    expect(alternativesText(['ex.leg_press'])).toBe(`Alternative prévue : ${exerciseLabel('ex.leg_press')}.`);
    expect(alternativesText(['ex.goblet_squat', 'ex.leg_press'])).toMatch(/^Alternatives prévues \(compatibles\) : /);
  });
});
