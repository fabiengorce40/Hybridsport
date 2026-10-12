// @vitest-environment jsdom
/**
 * C4.3 — bloc de force DÉLÉGUÉ dans la séance Cross-training (backend réel → DOM) : carte du planning, ordre des blocs
 * (échauffement général → force → échauffement spécifique → bloc principal), saisie des séries (répétitions, charge),
 * chrono de repos persisté, douleur, bloc terminé quand toutes ses séries sont validées, rechargement, refus d'une fin
 * « comme prévu » incomplète, expositions Strength enregistrées.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createBeta0Programme, emptyState, EQUIPMENT_PRESETS, loadState, MemoryStorage, saveState } from '@hybridsport/app-core';
import type { AppState, Clock } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';

afterEach(cleanup);
let now = '2026-10-05T07:30:00.000Z';
const clock = (): Clock => ({ today: now.slice(0, 10), now });
const fullGym = EQUIPMENT_PRESETS.find((p) => p.id === 'preset.full_gym')?.equipment ?? [];

function seeded(): MemoryStorage {
  const storage = new MemoryStorage();
  saveState(storage, createBeta0Programme(emptyState(), {
    displayName: '', level: 'intermediate', priorities: ['crosstraining'], strength: { enabled: false, goal: 'general', sessionsPerWeek: 2 },
    running: { enabled: false, population: 'P_R1', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' },
    crosstraining: { enabled: true, sessionsPerWeek: 3, intent: 'crosstraining.strength_plus_conditioning', returnState: 'NONE' }, hyrox: { enabled: false },
    equipment: { presetId: 'preset.full_gym', items: [...fullGym] }, availability: [60, 0, 60, 0, 60, 0, 0], excludedExercises: [], acceptedProvisionalAt: '2026-10-04T10:00:00Z',
  }, clock(), {}));
  return storage;
}
const saved = (storage: MemoryStorage): AppState => {
  const r = loadState(storage, now);
  if (r.status !== 'ok') throw new Error(r.status);
  return r.state;
};
const mount = (storage: MemoryStorage) => render(<StoreProvider storage={storage} clock={clock}><App /></StoreProvider>);
const strengthBlock = () => document.querySelector('[data-c4-block="strength"]') as HTMLElement;
const checks = () => within(strengthBlock()).queryAllByRole('button', { name: 'Cocher la série' });

describe('bloc de force délégué (DOM)', () => {
  it('planning → séance : ordre, séries, repos, douleur, rechargement, fin refusée si incomplète, expositions', () => {
    now = '2026-10-05T07:30:00.000Z';
    const storage = seeded();
    mount(storage);
    fireEvent.click(screen.getByRole('button', { name: 'Planning' }));
    const card = screen.getAllByRole('button', { name: /^Cross-training : Force \+ conditionnement/ })[0] as HTMLElement;
    expect(card.textContent).toContain('bloc de force (moteur Musculation)');
    fireEvent.click(card);
    expect(screen.getByRole('heading', { name: 'Force + conditionnement', level: 1 })).toBeTruthy();
    // Ordre : échauffement général → force → échauffement spécifique / accélérations → bloc principal.
    const order = [...document.querySelectorAll('[data-c4-block], [data-c4-main]')].map((x) => x.getAttribute('data-c4-block') ?? 'main');
    expect(order[0]).toBe('warmup_general');
    expect(order.indexOf('strength')).toBeLessThan(order.indexOf('main'));
    const spec = order.indexOf('warmup_specific');
    if (spec >= 0) expect(spec).toBeGreaterThan(order.indexOf('strength'));
    expect(strengthBlock().textContent).toContain('Prescription du moteur Musculation');
    // Aucune validation manuelle globale du bloc de force.
    expect(within(strengthBlock()).queryByRole('button', { name: 'Marquer le bloc terminé' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Commencer la séance' }));
    const total = checks().length;
    expect(total).toBeGreaterThan(1);
    // Première série : charge saisie, validée ⇒ chrono de repos (persisté).
    const kg = within(strengthBlock()).getAllByLabelText('Charge (kg)')[0] as HTMLInputElement;
    fireEvent.change(kg, { target: { value: '40' } });
    fireEvent.click(checks()[0] as HTMLElement);
    expect(screen.getByRole('timer', { name: 'Chrono de repos' })).toBeTruthy();
    const log = () => Object.values(saved(storage).programmeLogs)[0];
    expect(log()?.sets).toEqual([expect.objectContaining({ setIndex: 0, done: true, loadKg: 40 })]);
    expect(log()?.rest).not.toBeNull();
    // Fin « comme prévu » avec des séries manquantes : refusée, message explicite, rien d'enregistré.
    fireEvent.click(screen.getByRole('button', { name: 'Terminer la séance' }));
    let sheet = screen.getByRole('dialog', { name: 'Fin de séance' });
    fireEvent.click(within(sheet).getByRole('radio', { name: 'Tout s’est passé comme prévu' }));
    fireEvent.click(within(sheet).getByRole('button', { name: 'Enregistrer' }));
    expect(saved(storage).crosstraining.realized).toHaveLength(0);
    expect(document.body.textContent).toContain('Toutes les séries n’ont pas été validées');
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Fin de séance' })).getByRole('button', { name: 'Annuler' }));
    cleanup();
    // Rechargement : série et repos conservés ; on termine les séries restantes.
    now = '2026-10-05T07:35:00.000Z';
    mount(storage);
    fireEvent.click(screen.getByRole('button', { name: 'Planning' }));
    fireEvent.click(screen.getAllByRole('button', { name: /^Cross-training : Force \+ conditionnement, En cours/ })[0] as HTMLElement);
    expect(checks()).toHaveLength(total - 1);
    while (checks().length > 0) fireEvent.click(checks()[0] as HTMLElement);
    expect(within(strengthBlock()).getByText('✓ Bloc terminé')).toBeTruthy();
    expect(document.querySelector('[data-c4-progress]')?.textContent).toMatch(/Blocs terminés : 1 \//);
    // Douleur signalée sur l'exercice de force ⇒ douleur de séance à la fin.
    fireEvent.click(within(strengthBlock()).getAllByRole('button', { name: /^Douleur sur / })[0] as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: 'Démarrer le bloc principal' }));
    now = '2026-10-05T07:50:00.000Z';
    fireEvent.click(screen.getByRole('button', { name: 'Terminer la séance' }));
    sheet = screen.getByRole('dialog', { name: 'Fin de séance' });
    fireEvent.click(within(sheet).getByRole('radio', { name: 'J’ai adapté la séance' }));
    fireEvent.click(within(sheet).getByRole('button', { name: 'Enregistrer' }));
    const s = saved(storage);
    expect(s.crosstraining.realized).toHaveLength(1);
    expect(s.strength.exposures.length).toBeGreaterThan(0);
    expect(s.strength.tracks).toEqual(saved(seeded()).strength.tracks);
    expect(log()?.outcome?.pain).toBe(true);
    expect(s.safety.activePain).not.toBeNull();
  });
});
