// @vitest-environment jsdom
/**
 * P0 — contrôle pré-séance dans l'interface (backend réel → DOM) : « Commencer » ouvre TOUJOURS le contrôle pour un
 * nouveau démarrage ; genou P2 ⇒ séance adaptée (bandeau, changements) ; épaule P2 sur un Full Body ⇒ séance reportée
 * (raisons, non démarrée) ; signal général ⇒ pause douleur ; « Passer » ⇒ état inconnu ; reprise ⇒ aucun contrôle.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createBeta0Programme, emptyState, EQUIPMENT_PRESETS, loadState, MemoryStorage, saveState } from '@hybridsport/app-core';
import type { AppState, Clock } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';

afterEach(cleanup);
const now = '2026-10-05T07:30:00.000Z';
const clock = (): Clock => ({ today: now.slice(0, 10), now });
const gym = EQUIPMENT_PRESETS.find((p) => p.id === 'preset.commercial_gym')?.equipment ?? [];

function seeded(): MemoryStorage {
  const storage = new MemoryStorage();
  saveState(storage, createBeta0Programme(emptyState(), {
    displayName: '', level: 'intermediate', priorities: ['strength'], strength: { enabled: true, goal: 'hypertrophy', sessionsPerWeek: 3 },
    running: { enabled: false, population: 'P_R1', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' },
    crosstraining: { enabled: false }, hyrox: { enabled: false },
    equipment: { presetId: 'preset.commercial_gym', items: [...gym], confirmedAt: '2026-10-04T10:00:00.000Z' }, availability: [75, 0, 75, 0, 75, 0, 0], excludedExercises: [], acceptedProvisionalAt: '2026-10-04T10:00:00Z',
  }, clock(), {}));
  return storage;
}
const saved = (s: MemoryStorage): AppState => { const r = loadState(s, now); if (r.status !== 'ok') throw new Error(r.status); return r.state; };
const mount = (s: MemoryStorage) => render(<StoreProvider storage={s} clock={clock}><App /></StoreProvider>);
const openStrength = (k: number) => {
  fireEvent.click(screen.getByRole('button', { name: 'Planning' }));
  fireEvent.click(screen.getAllByRole('button', { name: /^Musculation/ })[k] as HTMLElement);
};
const openFirstStrength = () => openStrength(0);
const dialog = () => screen.getByRole('dialog', { name: 'Avant de commencer' });
const radio = (group: string, name: string) => fireEvent.click(within(within(dialog()).getByRole('radiogroup', { name: group })).getByRole('radio', { name }));

describe('contrôle pré-séance (DOM)', () => {
  it('genou P2 ⇒ séance adaptée et démarrée ; contrôle persisté ; reprise sans nouveau contrôle', () => {
    const storage = seeded();
    mount(storage);
    openFirstStrength();
    fireEvent.click(screen.getByRole('button', { name: 'Commencer la séance' }));
    expect(dialog()).toBeTruthy();
    expect(saved(storage).programmeLogs).toEqual({});
    radio('Avez-vous une douleur en ce moment ?', 'Oui');
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Genou' }));
    radio('Intensité · Genou', 'Douleur qui gêne certains mouvements');
    radio('Fatigue aujourd’hui', 'Faible');
    radio('Récupération depuis la dernière séance', 'Bonne');
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Valider et commencer' }));
    expect(screen.queryByRole('dialog', { name: 'Avant de commencer' })).toBeNull();
    const note = document.querySelector('[data-adaptation]');
    expect(note?.textContent).toContain('Séance adaptée à votre état du jour');
    expect(note?.textContent).toContain('genou');
    expect(note?.textContent).toMatch(/retiré|ajouté/);
    const s = saved(storage);
    expect(Object.keys(s.programmeLogs)).toHaveLength(1);
    expect(s.checkIns.at(-1)).toMatchObject({ answered: true, decision: 'adapted', pains: [{ area: 'knee', level: 'P2' }], fatigue: 'low', recovery: 'good' });
    cleanup();
    mount(storage);
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre la séance' }));
    expect(screen.queryByRole('dialog', { name: 'Avant de commencer' })).toBeNull();
    expect(document.querySelector('[data-adaptation]')).toBeTruthy();
    expect(saved(storage).checkIns).toHaveLength(1);
  });

  it('épaule P2 sur un Full Body ⇒ séance reportée (raisons lisibles), non démarrée, aucune pause', () => {
    const storage = seeded();
    mount(storage);
    openFirstStrength();
    fireEvent.click(screen.getByRole('button', { name: 'Commencer la séance' }));
    radio('Avez-vous une douleur en ce moment ?', 'Oui');
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Épaule' }));
    radio('Intensité · Épaule', 'Douleur qui gêne certains mouvements');
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Valider et commencer' }));
    const d = document.querySelector('[data-checkin-decision="postponed"]');
    expect(d?.textContent).toContain('Séance reportée');
    expect(d?.textContent).toContain('Aucun exercice compatible');
    expect(d?.textContent).not.toMatch(/SELECT\.|KAIRO\.|ex\./);
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Fermer' }));
    const s = saved(storage);
    expect(s.programmeLogs).toEqual({});
    expect(s.safety.activePain).toBeNull();
    expect(screen.getByRole('button', { name: 'Commencer la séance' })).toBeTruthy();
  });

  it('signal général ⇒ pause douleur activée, message de sécurité, aucune séance démarrée', () => {
    const storage = seeded();
    mount(storage);
    openFirstStrength();
    fireEvent.click(screen.getByRole('button', { name: 'Commencer la séance' }));
    radio('Avez-vous une douleur en ce moment ?', 'Oui');
    fireEvent.click(within(dialog()).getByLabelText('Signal général inquiétant (pas seulement une zone)'));
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Valider et commencer' }));
    expect(document.querySelector('[data-checkin-decision="paused"]')?.textContent).toContain('professionnel de santé');
    expect(saved(storage).safety.activePain).not.toBeNull();
    expect(saved(storage).programmeLogs).toEqual({});
  });

  it('« Passer » ⇒ état inconnu enregistré, séance planifiée inchangée et démarrée ; douleur sans zone ⇒ validation refusée', () => {
    const storage = seeded();
    mount(storage);
    openFirstStrength();
    fireEvent.click(screen.getByRole('button', { name: 'Commencer la séance' }));
    radio('Avez-vous une douleur en ce moment ?', 'Oui');
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Valider et commencer' }));
    expect(within(dialog()).getByRole('alert').textContent).toContain('au moins une zone');
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Passer' }));
    const s = saved(storage);
    expect(s.checkIns.at(-1)).toMatchObject({ answered: false, readiness: 'unknown', decision: 'unchanged' });
    expect(Object.keys(s.programmeLogs)).toHaveLength(1);
    expect(document.querySelector('[data-adaptation]')).toBeNull();
  });

  it('question douleur sans réponse ⇒ validation refusée (message), rien démarré ni enregistré — jamais « aucune douleur »', () => {
    const storage = seeded();
    mount(storage);
    openFirstStrength();
    fireEvent.click(screen.getByRole('button', { name: 'Commencer la séance' }));
    radio('Fatigue aujourd’hui', 'Faible');
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Valider et commencer' }));
    expect(within(dialog()).getByRole('alert').textContent).toContain('Répondez à la question douleur');
    const s = saved(storage);
    expect(s.programmeLogs).toEqual({});
    expect(s.checkIns).toEqual([]);
    radio('Avez-vous une douleur en ce moment ?', 'Non');
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Valider et commencer' }));
    expect(saved(storage).checkIns.at(-1)).toMatchObject({ answered: true, painStatus: 'none', fatigue: 'low' });
  });

  it('douleur connue : rappelée, présélectionnée sur « Oui », conservée par « Passer » (séance adaptée, mention affichée)', () => {
    const storage = seeded();
    mount(storage);
    openFirstStrength();
    fireEvent.click(screen.getByRole('button', { name: 'Commencer la séance' }));
    radio('Avez-vous une douleur en ce moment ?', 'Oui');
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Genou' }));
    radio('Intensité · Genou', 'Douleur qui gêne certains mouvements');
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Valider et commencer' }));
    cleanup();
    mount(storage);
    openStrength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Commencer la séance' }));
    const known = document.querySelector('[data-checkin-known]');
    expect(known?.textContent).toContain('Douleur déjà signalée');
    expect(known?.textContent).toContain('genou');
    expect(within(dialog()).getByText(/la douleur déjà signalée reste prise en compte/)).toBeTruthy();
    radio('Avez-vous une douleur en ce moment ?', 'Oui');
    expect(within(dialog()).getByRole('button', { name: 'Genou' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Passer' }));
    const c = saved(storage).checkIns.at(-1);
    expect(c).toMatchObject({ answered: false, painStatus: 'unknown', pains: [], knownPains: [expect.objectContaining({ area: 'knee', level: 'P2' })] });
    if (c?.decision === 'adapted') expect(document.querySelector('[data-adaptation]')?.textContent).toContain('douleur déjà signalée : genou');
    else expect(document.querySelector('[data-checkin-decision="postponed"]')).toBeTruthy();
  });
});
