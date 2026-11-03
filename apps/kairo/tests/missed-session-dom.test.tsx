// @vitest-environment jsdom
/**
 * FAST TRACK V1 — séance manquée : « Je ne l'ai pas faite » (confirmé) ⇒ non réalisée ; report : aperçu puis « Appliquer
 * le report » ; rien n'est écrit avant la confirmation.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createBeta0Programme, emptyState, EQUIPMENT_PRESETS, MemoryStorage, saveState, STORAGE_KEY } from '@hybridsport/app-core';
import type { AppState, Clock, ProfileInput } from '@hybridsport/app-core';
import { Session0 } from '../src/screens/beta0/Session0.js';
import { StoreProvider } from '../src/store.js';

afterEach(cleanup);
const MON = '2026-10-05';
const at = (d: string): Clock => ({ today: d, now: `${d}T07:30:00.000Z` });
const profile: ProfileInput = {
  displayName: '', level: 'intermediate', priorities: ['strength'],
  strength: { enabled: true, goal: 'hypertrophy', sessionsPerWeek: 2 },
  running: { enabled: false, population: 'P_R2', goal: 'HALF_MARATHON', wearable: false, sessionsPerWeek: 3, returnState: 'NONE' },
  crosstraining: { enabled: false }, hyrox: { enabled: false },
  equipment: { presetId: 'preset.full_gym', items: [...(EQUIPMENT_PRESETS.find((p) => p.id === 'preset.full_gym')?.equipment ?? [])] },
  availability: [60, 60, 60, 60, 60, 60, 60], excludedExercises: [], acceptedProvisionalAt: '2026-10-04T10:00:00Z',
};
function setup() {
  const s = createBeta0Programme(emptyState(), profile, at(MON), {});
  const storage = new MemoryStorage(); saveState(storage, s);
  const r = (s.planner.weeks[MON]?.requests ?? []).find((x) => x.status === 'planned' && x.date === MON) ?? (s.planner.weeks[MON]?.requests ?? []).find((x) => x.status === 'planned');
  if (!r) throw new Error('séance attendue');
  render(<StoreProvider storage={storage} clock={() => at(MON)}><Session0 requestId={r.requestId} onBack={() => undefined} /></StoreProvider>);
  return { storage, r, saved: () => JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}') as AppState };
}

describe('séance manquée (interface)', () => {
  it('« Je ne l’ai pas faite » : confirmation obligatoire, puis non réalisée', () => {
    const { r, saved } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Séance manquée ou à reporter ?' }));
    fireEvent.click(screen.getByRole('button', { name: 'Je ne l’ai pas faite' }));
    expect(saved().programmeState?.results.length ?? 0).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer : non réalisée' }));
    expect(saved().programmeState?.results.find((x) => x.requestId === r.requestId)?.completion).toBe('missed');
  });
  it('report : aperçu, « Conserver mon planning » n’écrit rien, « Appliquer le report » déplace la séance', () => {
    const { r, saved } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Séance manquée ou à reporter ?' }));
    const radios = screen.getAllByRole('radio');
    expect(radios.length).toBeGreaterThan(0);
    fireEvent.click(radios[0] as HTMLElement);
    expect(screen.getByLabelText('Aperçu du report')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Conserver mon planning' }));
    expect(saved().planner.weeks[MON]?.requests.find((x) => x.requestId === r.requestId)?.date).toBe(r.date);
    fireEvent.click(screen.getAllByRole('radio')[0] as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: 'Appliquer le report' }));
    expect(saved().planner.weeks[MON]?.requests.find((x) => x.requestId === r.requestId)?.date).not.toBe(r.date);
    expect(screen.getByText(/Séance reportée au/)).toBeTruthy();
  });
});
