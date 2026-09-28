// @vitest-environment jsdom
/**
 * Tests fonctionnels de l'interface (jsdom) : parcours onboarding → planning → séance → séries → feedback →
 * historique, persistance à la réouverture, règles d'affichage (aucune séance vide, aucune saisie inventée).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryStorage, STORAGE_KEY } from '@hybridsport/app-core';
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
});
