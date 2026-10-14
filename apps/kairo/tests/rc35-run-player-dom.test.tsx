// @vitest-environment jsdom
/**
 * RC3.5 — lecteur de séance Course (jsdom, backend réel) : contrôle avant séance puis lecteur ; étape en cours et
 * suivante ; temps restant (durée) ou écoulé (distance) ; enchaînement à l'échéance avec vibration ; Pause / Reprendre /
 * Étape suivante / Distance faite ; persistance au rechargement ; fin de séance jamais automatique ; repère du lecteur
 * repris dans la saisie du temps du test seulement sur geste explicite.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import {
  createBeta0Programme, emptyState, ensureBeta0Week, EQUIPMENT_PRESETS, finishProgrammeSession, loadState, MemoryStorage, saveState, selectBeta0Week, startProgrammeSession,
} from '@hybridsport/app-core';
import type { AppState, Clock, ProfileInput } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';

let now = '2026-10-05T07:30:00.000Z';
const clock = (): Clock => ({ today: now.slice(0, 10), now });
const fullGym = [...(EQUIPMENT_PRESETS.find((p) => p.id === 'preset.full_gym')?.equipment ?? [])];
const runner = (goal: ProfileInput['running']['goal']): ProfileInput => ({
  displayName: '', level: 'intermediate', priorities: ['running'], strength: { enabled: false, goal: 'general', sessionsPerWeek: 2 },
  running: { enabled: true, population: 'P_R2', goal, wearable: false, sessionsPerWeek: 3, returnState: 'NONE' },
  crosstraining: { enabled: false }, hyrox: { enabled: false }, equipment: { presetId: 'preset.full_gym', items: fullGym, confirmedAt: '2026-10-04T10:00:00Z' },
  availability: [60, 0, 60, 0, 60, 90, 0], excludedExercises: [], acceptedProvisionalAt: '2026-10-04T10:00:00Z',
});
const LAST = { realizedDurationS: 1800, difficulty: 'AS_EXPECTED' as const, distanceM: 5000 };
const mount = (storage: MemoryStorage) => render(<StoreProvider storage={storage} clock={clock}><App /></StoreProvider>);
const saved = (storage: MemoryStorage): AppState => {
  const r = loadState(storage, now);
  if (r.status !== 'ok') throw new Error(r.status);
  return r.state;
};
const plus = (iso: string, s: number) => new Date(Date.parse(iso) + s * 1000).toISOString();
/** Avance l'heure et laisse l'intervalle d'affichage rafraîchir l'écran. */
const elapse = (s: number) => { now = plus(now, s); act(() => { vi.advanceTimersByTime(300); }); };
const player = () => within(screen.getByRole('region', { name: 'Lecteur de séance' }));
const clockText = () => document.querySelector('[data-run-clock]')?.textContent;
const stepKey = () => document.querySelector('[data-run-step]')?.getAttribute('data-run-step');
const openFromPlanning = (name: RegExp) => {
  fireEvent.click(screen.getByRole('button', { name: 'Planning' }));
  const b = screen.queryAllByRole('button', { name })[0];
  if (!b) throw new Error(screen.getAllByRole('button').map((x) => x.getAttribute('aria-label') ?? x.textContent).join(' | '));
  fireEvent.click(b);
};
const startWithCheck = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Commencer la séance' }));
  fireEvent.click(within(screen.getByRole('dialog', { name: 'Avant de commencer' })).getByRole('button', { name: 'Passer' }));
};
const testDate = (s: AppState, today: string) => (selectBeta0Week(s, today)?.sessions ?? []).find((x) => x.archetypeId === 'running.test');

beforeEach(() => { vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] }); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('RC3.5 — lecteur de séance Course', () => {
  it('TEST : échauffement en durée, test en DISTANCE (temps écoulé, validation manuelle), retour au calme ; fin déclarée par l’utilisateur ; temps du lecteur repris sur geste', () => {
    now = '2026-10-05T07:30:00.000Z';
    const storage = new MemoryStorage();
    const s0 = createBeta0Programme(emptyState(), runner('TEN_K'), clock(), { requestTest: true, lastRun: LAST });
    saveState(storage, s0);
    const t = testDate(s0, '2026-10-05');
    now = `${t?.date ?? ''}T08:00:00.000Z`;
    mount(storage);
    openFromPlanning(/Test chronométré/);
    // Avant le départ : pas de lecteur, la structure prescrite seule.
    expect(screen.queryByRole('region', { name: 'Lecteur de séance' })).toBeNull();
    startWithCheck();
    expect(player().getByText('Étape 1 / 3')).toBeTruthy();
    expect(player().getByText('Échauffement')).toBeTruthy();
    expect(document.querySelector('[data-run-next]')?.textContent).toBe('Ensuite : Test · 10 km');
    fireEvent.click(player().getByRole('button', { name: 'Lancer le minuteur' }));
    expect(clockText()).toBe('10:00');
    elapse(250);
    expect(clockText()).toBe('5:50');
    elapse(350);
    expect(stepKey()).toBe('test/1/1/single');
    expect(player().getByText('TEMPS ÉCOULÉ')).toBeTruthy();
    expect(document.querySelector('[data-run-distance-note]')?.textContent).toMatch(/Distance non mesurée par l’application/);
    // L'allure observée (borne d'estimation) n'est jamais affichée comme cible.
    expect(screen.getByLabelText('Étape en cours').textContent).not.toMatch(/\/km/);
    // 3 heures plus tard : toujours sur le test (aucune durée déduite d'une allure).
    elapse(3 * 3600);
    expect(stepKey()).toBe('test/1/1/single');
    expect(clockText()).toBe('3:00:00');
    // Retour à un temps réaliste : rechargement à 45 min de test.
    cleanup();
    now = plus(`${t?.date ?? ''}T08:00:00.000Z`, 600 + 2700);
    mount(storage);
    openFromPlanning(/Test chronométré/);
    expect(clockText()).toBe('45:00');
    fireEvent.click(player().getByRole('button', { name: 'Distance faite' }));
    expect(stepKey()).toBe('cooldown/1/1/single');
    expect(saved(storage).programmeLogs[t?.requestId ?? '']?.runPlayer?.marks).toEqual([expect.objectContaining({ key: 'test/1/1/single', end: 'distance_validated', elapsedS: 2700 })]);
    // Fin du déroulé : rien n'est enregistré automatiquement.
    elapse(300);
    expect(player().getByText('Toutes les étapes sont passées')).toBeTruthy();
    expect(saved(storage).programmeState?.results.find((r) => r.requestId === t?.requestId)).toBeUndefined();
    fireEvent.click(player().getByRole('button', { name: 'Terminer la séance' }));
    const sheet = within(screen.getByRole('dialog', { name: 'Fin de séance' }));
    expect(document.querySelector('[data-finish-player]')?.textContent).toMatch(/Lecteur : 1:00:00 de temps actif \(hors pauses\)\. Repère seulement/);
    // Champ vide tant que l'utilisateur ne reprend pas le temps du lecteur.
    expect((sheet.getByLabelText('Temps du test seul : minutes') as HTMLInputElement).value).toBe('');
    fireEvent.click(sheet.getByRole('button', { name: 'Reprendre le temps du lecteur (45:00)' }));
    expect((sheet.getByLabelText('Temps du test seul : minutes') as HTMLInputElement).value).toBe('45');
    fireEvent.click(sheet.getByRole('radio', { name: 'Tout s’est passé comme prévu' }));
    fireEvent.change(sheet.getByLabelText(/Durée totale courue/), { target: { value: '60' } });
    fireEvent.click(sheet.getByRole('button', { name: 'Enregistrer' }));
    expect(saved(storage).running.references).toEqual([expect.objectContaining({ type: 'TIME_TRIAL', values: expect.objectContaining({ distanceM: 10000, durationS: 2700 }) })]);
    expect(screen.queryByRole('region', { name: 'Lecteur de séance' })).toBeNull();
  });

  it('séance de seuil : répétitions et récupérations, vibration à l’échéance, Pause / Reprendre, rechargement, Étape suivante ; Annuler la fin ne termine rien', () => {
    const vibrate = vi.fn(() => true);
    vi.stubGlobal('navigator', Object.assign(Object.create(navigator) as Navigator, { vibrate }));
    now = '2026-10-05T07:30:00.000Z';
    let s = createBeta0Programme(emptyState(), runner('TEN_K'), clock(), { requestTest: true, lastRun: LAST });
    const t = testDate(s, '2026-10-05');
    const tc = (h: string): Clock => ({ today: t?.date ?? '', now: `${t?.date ?? ''}T${h}Z` });
    s = startProgrammeSession(s, tc('08:00:00'), t?.requestId ?? '');
    s = finishProgrammeSession(s, tc('09:00:00'), { requestId: t?.requestId ?? '', completion: 'completed_as_prescribed', pain: false, run: { realizedDurationS: 3600, testTimeS: 2700 } });
    now = '2026-10-12T07:00:00.000Z';
    s = ensureBeta0Week(s, clock());
    const key = (selectBeta0Week(s, '2026-10-12')?.sessions ?? []).find((x) => x.archetypeId === 'running.threshold');
    now = `${key?.date ?? ''}T08:00:00.000Z`;
    const storage = new MemoryStorage();
    saveState(storage, s);
    mount(storage);
    openFromPlanning(/Seuil/);
    startWithCheck();
    expect(player().getByText('Étape 1 / 7')).toBeTruthy();
    fireEvent.click(player().getByRole('button', { name: 'Lancer le minuteur' }));
    elapse(600);
    expect(stepKey()).toBe('work/1/1/work');
    expect(player().getByText('Répétition 1 / 3')).toBeTruthy();
    expect(screen.getByLabelText('Étape en cours').textContent).toMatch(/Effort 5–6\/10/);
    expect(document.querySelector('[data-run-next]')?.textContent).toBe('Ensuite : Récupération trottinée · 1 min');
    expect(vibrate).toHaveBeenCalledTimes(1);
    // Pause : temps figé, même après 20 minutes.
    elapse(100);
    fireEvent.click(player().getByRole('button', { name: 'Pause' }));
    expect(player().getByText('EN PAUSE')).toBeTruthy();
    elapse(1200);
    expect(clockText()).toBe('3:20');
    // Rechargement pendant la pause : même étape, même temps.
    cleanup();
    mount(storage);
    openFromPlanning(/Seuil/);
    expect(stepKey()).toBe('work/1/1/work');
    expect(clockText()).toBe('3:20');
    fireEvent.click(player().getByRole('button', { name: 'Reprendre' }));
    elapse(200);
    expect(stepKey()).toBe('work/1/1/recovery');
    expect(player().getByText('Récupération trottinée')).toBeTruthy();
    expect(vibrate).toHaveBeenCalledTimes(2);
    // Étape suivante (geste de l'utilisateur) : pas de vibration, étape passée tracée.
    fireEvent.click(player().getByRole('button', { name: 'Étape suivante' }));
    expect(player().getByText('Répétition 2 / 3')).toBeTruthy();
    expect(vibrate).toHaveBeenCalledTimes(2);
    expect(Object.values(saved(storage).programmeLogs).find((l) => l.runPlayer)?.runPlayer?.marks).toEqual([expect.objectContaining({ key: 'work/1/1/recovery', end: 'skipped' })]);
    // Terminer puis Annuler : la séance reste en cours.
    fireEvent.click(player().getByRole('button', { name: 'Terminer la séance' }));
    expect(document.querySelector('[data-finish-player]')?.textContent).toMatch(/1 étape passée avant la fin · 4 étapes non atteintes/);
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Fin de séance' })).getByRole('button', { name: 'Annuler' }));
    expect(screen.getByRole('region', { name: 'Lecteur de séance' })).toBeTruthy();
    expect(saved(storage).programmeState?.results.some((r) => r.requestId === key?.requestId)).toBe(false);
  });

  it('course facile (non structurée) : une seule étape « Course continue », sans étape suivante ; son coupable ; préférence conservée', () => {
    now = '2026-10-05T07:30:00.000Z';
    const storage = new MemoryStorage();
    saveState(storage, createBeta0Programme(emptyState(), runner('TEN_K'), clock(), { lastRun: LAST }));
    mount(storage);
    openFromPlanning(/Footing facile/);
    startWithCheck();
    expect(player().getByText('Étape 1 / 1')).toBeTruthy();
    expect(player().getByText('Course continue')).toBeTruthy();
    expect(document.querySelector('[data-run-next]')).toBeNull();
    expect(clockText()).toBe('30:00');
    fireEvent.click(player().getByRole('button', { name: 'Son activé' }));
    expect(player().getByRole('button', { name: 'Son coupé' }).getAttribute('aria-pressed')).toBe('false');
    expect(document.querySelector('[data-run-wake]')?.textContent).toMatch(/ne peut pas garder l’écran allumé/);
  });
});
