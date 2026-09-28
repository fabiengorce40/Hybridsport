// @vitest-environment jsdom
/**
 * Tests fonctionnels de l'interface (jsdom) : parcours onboarding → planning → séance → séries → feedback →
 * historique, persistance à la réouverture, règles d'affichage (aucune séance vide, aucune saisie inventée).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { completeOnboarding, EQUIPMENT_PRESETS, emptyState, logFreeRun, MemoryStorage, saveState, STORAGE_KEY } from '@hybridsport/app-core';
import type { Clock } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';

afterEach(cleanup);
const clock = (): Clock => ({ today: '2026-10-05', now: '2026-10-05T07:30:00.000Z' });
const mount = (storage: MemoryStorage) => render(<StoreProvider storage={storage} clock={clock}><App /></StoreProvider>);
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

function onboard(storage: MemoryStorage, sports: RegExp[] = [/Musculation/]) {
  mount(storage);
  expect(screen.getByRole('button', { name: 'Commencer' })).toHaveProperty('disabled', true);
  fireEvent.click(screen.getByLabelText(/J’ai compris/));
  click('Commencer');
  for (const s of sports) click(s);
  click('Continuer'); click('Continuer'); click('Continuer');
  click('Générer mon planning');
}

describe('interface KAIRO', () => {
  it('onboarding : avertissement obligatoire, puis accueil avec une séance réelle recommandée et la bannière provisoire', () => {
    onboard(new MemoryStorage());
    expect(screen.getAllByText('V0 PROVISOIRE').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Démarrer la séance' })).toBeTruthy();
    expect(screen.getAllByText('PROVISOIRE').length).toBeGreaterThan(0);
  });

  it('séance : plages de répétitions jamais pré-remplies ; case désactivée tant que les reps ne sont pas saisies ; reps fixes pré-remplies', () => {
    onboard(new MemoryStorage());
    click('Démarrer la séance');
    click('Démarrer la séance');
    const reps = screen.getAllByLabelText('Répétitions réalisées') as HTMLInputElement[];
    const ticks = screen.getAllByRole('button', { name: 'Cocher la série' }) as HTMLButtonElement[];
    const rangeIdx = reps.findIndex((r) => r.value === '');
    expect(rangeIdx).toBeGreaterThan(-1);
    expect(ticks[rangeIdx]?.disabled).toBe(true);
    fireEvent.change(reps[rangeIdx]!, { target: { value: '9' } });
    expect((screen.getAllByRole('button', { name: 'Cocher la série' })[rangeIdx] as HTMLButtonElement).disabled).toBe(false);
    expect(reps.some((r) => r.value !== '' && Number(r.value) > 0)).toBe(true);
  });

  it('parcours complet : séries cochées → chrono de repos → fin de séance → historique ; réouverture : tout est conservé', () => {
    const storage = new MemoryStorage();
    onboard(storage);
    click('Démarrer la séance');
    click('Démarrer la séance');
    for (let i = 0; i < 3; i++) {
      const reps = screen.getAllByLabelText('Répétitions réalisées') as HTMLInputElement[];
      const idx = reps.findIndex((r) => !r.disabled);
      if (reps[idx]?.value === '') fireEvent.change(reps[idx], { target: { value: '8' } });
      fireEvent.click(screen.getAllByRole('button', { name: 'Cocher la série' })[0]!);
    }
    expect(screen.getByRole('timer', { name: 'Chrono de repos' })).toBeTruthy();
    click('Terminer la séance');
    const dialog = screen.getByRole('dialog', { name: 'Fin de séance' });
    expect((within(dialog).getByRole('button', { name: 'Enregistrer' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Comme prévu' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));
    expect(screen.getAllByText(/Séance terminée/).length).toBeGreaterThan(0);
    click('Retour');
    click('Historique');
    expect(screen.getByText(/3 séries/)).toBeTruthy();
    const saved = storage.getItem(STORAGE_KEY);
    expect(saved).toContain('"finishedAt"');
    cleanup();
    mount(storage);
    click('Historique');
    expect(screen.getByText(/3 séries/)).toBeTruthy();
  });

  it('course seule sans course réalisée : carte « indisponible » avec la raison, jamais une séance inventée ; ouverture : aucun bouton Démarrer', () => {
    onboard(new MemoryStorage(), [/Course à pied/]);
    click('Planning');
    const cards = screen.getAllByRole('button', { name: /Course à pied indisponible/ });
    expect(cards.length).toBeGreaterThan(0);
    fireEvent.click(cards[0]!);
    expect(screen.getByText('AUCUNE SÉANCE VALIDE')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Démarrer la séance' })).toBeNull();
    expect(screen.getAllByText(/Aucune dose de course établie/).length).toBeGreaterThan(0);
  });

  it('données illisibles : écran de récupération, copie conservée, rien d’écrasé', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, '{"schemaVersion":1,"profile":"x"}');
    mount(storage);
    expect(screen.getByText('Données illisibles')).toBeTruthy();
    expect(storage.getItem(STORAGE_KEY)).toBe('{"schemaVersion":1,"profile":"x"}');
    expect(storage.keys().some((k) => k.startsWith('kairo.unreadable.'))).toBe(true);
  });

  it('Course : test chronométré — 10 km à l’effort maximal, aucune allure affichée ; temps du test exigé ; référence enregistrée', () => {
    const storage = new MemoryStorage();
    const c0: Clock = { today: '2026-10-05', now: '2026-10-05T05:00:00Z' };
    let s = completeOnboarding(emptyState(), {
      displayName: '', level: 'intermediate', priorities: ['running'],
      strength: { enabled: false, goal: 'general', sessionsPerWeek: 1 },
      running: { enabled: true, population: 'P_R3', goal: 'TEN_K', wearable: true, sessionsPerWeek: 3, returnState: 'NONE' },
      crosstraining: { enabled: false }, hyrox: { enabled: false },
      equipment: { presetId: 'preset.full_gym', items: [...(EQUIPMENT_PRESETS.find((p) => p.id === 'preset.full_gym')?.equipment ?? [])] },
      availability: [60, 0, 60, 0, 60, 90, 0], excludedExercises: [], acceptedProvisionalAt: '2026-10-04T10:00:00Z',
    }, c0);
    s = logFreeRun(s, { realizedDurationS: 1800, completion: 'COMPLETED', difficulty: 'AS_EXPECTED', pain: false, distanceM: 5000 }, { today: '2026-10-05', now: '2026-10-05T06:00:00Z' });
    expect(saveState(storage, s).ok).toBe(true);
    const saturday = (): Clock => ({ today: '2026-10-10', now: '2026-10-10T07:30:00.000Z' });
    render(<StoreProvider storage={storage} clock={saturday}><App /></StoreProvider>);
    click('Démarrer la séance');
    expect(screen.getAllByText('Test chronométré').length).toBeGreaterThan(0);
    expect(screen.getByText('10 km')).toBeTruthy();
    expect(screen.getByText(/Effort maximal \(9–10\/10\)/)).toBeTruthy();
    expect(screen.queryByText(/\/km/)).toBeNull();
    click('Démarrer la séance');
    click('Terminer la séance');
    const sheet = within(screen.getByRole('dialog', { name: 'Fin de séance' }));
    fireEvent.change(sheet.getByLabelText(/Durée totale/), { target: { value: '75' } });
    fireEvent.click(sheet.getByRole('button', { name: /Comme prévu/ }));
    expect((sheet.getByRole('button', { name: 'Enregistrer' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(sheet.getByLabelText('Minutes du test'), { target: { value: '45' } });
    expect((sheet.getByRole('button', { name: 'Enregistrer' }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(sheet.getByRole('button', { name: 'Enregistrer' }));
    const saved = JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}') as { running: { references: { type: string; values: { distanceM: number; durationS: number } }[] } };
    expect(saved.running.references).toEqual([expect.objectContaining({ type: 'TIME_TRIAL', values: { distanceM: 10000, durationS: 2700 } })]);
  });
});
