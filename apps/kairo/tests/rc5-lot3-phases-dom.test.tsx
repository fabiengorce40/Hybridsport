// @vitest-environment jsdom
/**
 * Reprise RC5 — lot 3 (repris de RC5.4 lot A) : PHASES des séries Musculation, du backend réel au DOM.
 * - phases lues sur le seul type de série prescrit par le moteur (`kind`), titres explicites (jamais la couleur seule) ;
 * - mêmes séries, mêmes indices, même prescription ; saisie, validation, RIR, repos et chronomètre global inchangés ;
 * - montées en charge validées JAMAIS comptées comme séries de travail (exposition de progression) ;
 * - exercice à une seule phase et séances antérieures : affichage historique, aucune classification inventée ;
 * - persistance au rechargement et à l'export / import.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createBeta0Programme, emptyState, EQUIPMENT_PRESETS, exerciseLabel, exportState, loadState, MemoryStorage, saveState, selectProgrammeSession, STORAGE_KEY } from '@hybridsport/app-core';
import type { AppState, Clock } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';
import { setPhases } from '../src/workout/StrengthWorkout.js';

afterEach(cleanup);
let now = '2026-10-05T07:30:00.000Z';
const clock = (): Clock => ({ today: now.slice(0, 10), now });
const fullGym = EQUIPMENT_PRESETS.find((p) => p.id === 'preset.full_gym')?.equipment ?? [];

function seeded(): MemoryStorage {
  const storage = new MemoryStorage();
  saveState(storage, createBeta0Programme(emptyState(), {
    displayName: '', level: 'intermediate', priorities: ['strength'], strength: { enabled: true, goal: 'hypertrophy', sessionsPerWeek: 4 },
    running: { enabled: false, population: 'P_R1', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' },
    crosstraining: { enabled: false }, hyrox: { enabled: false }, equipment: { presetId: 'preset.full_gym', items: [...fullGym] },
    availability: [60, 60, 60, 60, 60, 0, 60], excludedExercises: [], acceptedProvisionalAt: '2026-10-04T10:00:00Z',
  }, clock(), {}));
  return storage;
}
const saved = (storage: MemoryStorage): AppState => {
  const r = loadState(storage, now);
  if (r.status !== 'ok') throw new Error(r.status);
  return r.state;
};
const mount = (storage: MemoryStorage) => render(<StoreProvider storage={storage} clock={clock}><App /></StoreProvider>);
const start = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Commencer la séance' }));
  fireEvent.click(screen.getByRole('button', { name: 'Commencer la séance' }));
  fireEvent.click(within(screen.getByRole('dialog', { name: 'Avant de commencer' })).getByRole('button', { name: 'Passer' }));
};
const validate = (line: HTMLElement) => {
  const reps = within(line).getByLabelText('Répétitions réalisées') as HTMLInputElement;
  if (reps.value === '') fireEvent.change(reps, { target: { value: '8' } });
  const kg = within(line).getByLabelText('Charge (kg)') as HTMLInputElement;
  if (kg.value === '') fireEvent.change(kg, { target: { value: '40' } });
  fireEvent.click(within(line).getByRole('button', { name: 'Cocher la série' }));
};
const bench = () => screen.getByRole('region', { name: new RegExp(`: ${exerciseLabel('ex.bench_press')}$`) });
const groups = (section: HTMLElement) => ({
  warm: within(section).getByRole('group', { name: /^Montée en charge,/ }),
  work: within(section).getByRole('group', { name: /^Séries de travail,/ }),
});

describe('RC5 lot 3 — regroupement des phases', () => {
  const w = { reps: 8, restAfterS: 90 } as const;
  it('regroupement contigu par type prescrit, indices d’origine conservés ; recul seulement s’il est prescrit', () => {
    expect(setPhases([{ kind: 'rampup', ...w }, { kind: 'rampup', ...w }, { kind: 'working', ...w }, { kind: 'working', ...w }])).toEqual([{ phase: 'warmup', indices: [0, 1] }, { phase: 'work', indices: [2, 3] }]);
    expect(setPhases([{ kind: 'rampup', ...w }, { kind: 'top_set', ...w }, { kind: 'backoff', ...w }, { kind: 'backoff', ...w }])).toEqual([{ phase: 'warmup', indices: [0] }, { phase: 'work', indices: [1] }, { phase: 'backoff', indices: [2, 3] }]);
    expect(setPhases([{ kind: 'working', ...w }, { kind: 'amrap', ...w }])).toEqual([{ phase: 'work', indices: [0, 1] }]);
  });
  it('aucune série ajoutée ni retirée : chaque indice apparaît une fois, dans l’ordre', () => {
    const sets = [{ kind: 'rampup', ...w }, { kind: 'working', ...w }, { kind: 'rampup', ...w }, { kind: 'backoff', ...w }] as const;
    expect(setPhases(sets).flatMap((p) => p.indices)).toEqual([0, 1, 2, 3]);
  });
});

describe('RC5 lot 3 — séance réelle', () => {
  it('titres de phase, prescription intacte, nombre de séries inchangé, montées hors exposition de progression', () => {
    now = '2026-10-05T07:30:00.000Z';
    const storage = seeded();
    mount(storage);
    start();
    const requestId = Object.keys(saved(storage).programmeLogs)[0] ?? '';
    const before = selectProgrammeSession(saved(storage), requestId)?.session;
    const item = before?.blocks.flatMap((b) => b.items).find((i) => i.exerciseId === 'ex.bench_press');
    if (item?.prescription.type !== 'sets') throw new Error('développé couché attendu');
    const { warm, work } = groups(bench());
    expect(within(warm).getByText('Montée en charge')).toBeTruthy();
    expect(within(work).getByText('Séries de travail')).toBeTruthy();
    // Nombre total de séries inchangé, types conformes à la prescription.
    const kinds = item.prescription.sets.map((x) => x.kind);
    expect(bench().querySelectorAll('.k-set')).toHaveLength(kinds.length);
    expect([...bench().querySelectorAll('.k-set')].map((x) => x.getAttribute('data-set-kind'))).toEqual(kinds);
    expect([...warm.querySelectorAll('.k-set')].every((x) => x.getAttribute('data-set-kind') === 'rampup')).toBe(true);
    expect([...work.querySelectorAll('.k-set')].every((x) => x.getAttribute('data-set-kind') !== 'rampup')).toBe(true);
    // Plus de doublon « N séries de montée avant le travail » dans les consignes (le titre de phase le dit).
    expect(within(bench()).queryByText(/de montée avant le travail/)).toBeNull();
    // Validation de toutes les montées puis d'une série de travail : repos lancé, chronomètre global présent.
    for (const line of [...warm.querySelectorAll('.k-set')] as HTMLElement[]) validate(line);
    const w1 = work.querySelector('.k-set') as HTMLElement;
    validate(w1);
    expect(screen.getByRole('timer', { name: 'Chrono de repos' })).toBeTruthy();
    expect(screen.getByRole('timer', { name: 'Chronomètre global' })).toBeTruthy();
    // Modification : décocher puis recocher la série de travail.
    const firstWork = kinds.findIndex((k) => k !== 'rampup');
    fireEvent.click(within(w1).getByRole('button', { name: 'Décocher la série' }));
    expect(saved(storage).programmeLogs[requestId]?.sets.find((x) => x.setIndex === firstWork && x.itemId === item.id)?.done).toBe(false);
    validate(w1);
    expect(saved(storage).programmeLogs[requestId]?.sets.find((x) => x.setIndex === firstWork && x.itemId === item.id)?.done).toBe(true);
    // Prescription inchangée.
    expect(selectProgrammeSession(saved(storage), requestId)?.session).toEqual(before);
    // Fin de séance : l'exposition de progression ne contient QUE la série de travail validée.
    fireEvent.click(screen.getByRole('button', { name: 'Terminer la séance' }));
    const sheet = screen.getByRole('dialog', { name: 'Fin de séance' });
    fireEvent.click(within(sheet).getByRole('radio', { name: 'J’ai adapté la séance' }));
    fireEvent.click(within(sheet).getByRole('button', { name: 'Enregistrer' }));
    const expo = saved(storage).strength.exposures.filter((x) => x.exerciseId === 'ex.bench_press');
    expect(expo).toHaveLength(1);
    expect(expo[0]?.sets).toHaveLength(1);
    // Séance terminée : phases toujours affichées, séries en lecture seule.
    const done = groups(bench());
    expect(done.warm.querySelectorAll('.k-set.done')).toHaveLength(kinds.filter((k) => k === 'rampup').length);
  });

  it('persistance : rechargement et export / import, phases et séries validées identiques', async () => {
    now = '2026-10-05T07:30:00.000Z';
    const storage = seeded();
    mount(storage);
    start();
    validate(groups(bench()).warm.querySelector('.k-set') as HTMLElement);
    const text = storage.getItem(STORAGE_KEY);
    cleanup();
    mount(storage);
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre la séance' }));
    expect(groups(bench()).warm.querySelector('.k-set')?.classList.contains('done')).toBe(true);
    expect(storage.getItem(STORAGE_KEY)).toBe(text);
    // Import de la même sauvegarde sur un autre appareil.
    const exported = exportState(saved(storage));
    cleanup();
    mount(seeded());
    fireEvent.click(screen.getByRole('button', { name: 'Réglages' }));
    fireEvent.change(screen.getByLabelText('Fichier de données à importer'), { target: { files: [new File([exported], 's.json', { type: 'application/json' })] } });
    await waitFor(() => expect(screen.getByText('Données importées.')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Accueil' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre la séance' }));
    expect(groups(bench()).warm.querySelector('.k-set')?.classList.contains('done')).toBe(true);
  });

  it('séances terminées d’une ancienne version (fixture v2) : séries identiques, titres de phase seulement si le moteur a prescrit plusieurs types', () => {
    now = '2026-10-12T09:00:00.000Z';
    const storage = new MemoryStorage();
    const raw = readFileSync(join(import.meta.dirname, 'fixtures/r51-p5-w2.json'), 'utf8');
    storage.setItem(STORAGE_KEY, raw);
    mount(storage);
    const state = saved(storage);
    const strengthDone = Object.values(state.programmeLogs).filter((l) => l.sport === 'strength' && l.finishedAt);
    expect(strengthDone.length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Historique' }));
    const cards = document.querySelectorAll('button.button-card').length;
    expect(cards).toBeGreaterThan(0);
    let checked = 0;
    let single = 0;
    for (let k = 0; k < cards; k++) {
      fireEvent.click(document.querySelectorAll('button.button-card')[k] as HTMLElement);
      // Séance affichée : celle dont les exercices (identifiant, nombre de séries) correspondent tous à l'écran.
      const shown = [...document.querySelectorAll('section.k-ex')].map((x) => ({ id: x.id.slice(3), sets: x.querySelectorAll('.k-set').length, phased: x.querySelectorAll('[data-phase]').length > 0 }));
      if (shown.length === 0) { fireEvent.click(screen.getByRole('button', { name: 'Retour' })); continue; }
      const items = strengthDone.map((l) => (selectProgrammeSession(state, l.requestId)?.session.blocks.flatMap((b) => b.items) ?? []).flatMap((it) => (it.prescription.type === 'sets' ? [{ id: it.id, sets: it.prescription.sets }] : [])));
      const match = items.find((its) => its.length === shown.length && shown.every((x) => its.some((it) => it.id === x.id && it.sets.length === x.sets)));
      expect(match).toBeDefined();
      for (const x of shown) {
        const it = match?.find((y) => y.id === x.id);
        if (!it) throw new Error('exercice attendu');
        const multi = setPhases(it.sets).length > 1;
        expect(x.phased).toBe(multi);
        checked += 1;
        if (!multi) single += 1;
      }
      fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
    }
    expect(checked).toBeGreaterThan(0);
    expect(single).toBeGreaterThan(0);
    // Ancienne donnée : séances, séries et performances conservées à l'identique (seul le format est migré).
    const after = saved(storage);
    const original = JSON.parse(raw) as AppState;
    expect(after.programmeLogs).toEqual(original.programmeLogs);
    expect(after.strength.exposures).toEqual(original.strength.exposures);
  });
});
