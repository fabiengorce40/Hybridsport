// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { strengthContent } from '@hybridsport/app-core';
import { ExerciseDetail } from '../src/playfield/ExerciseDetail.js';
import { exerciseDetails } from '../src/playfield/exercise-details.js';

afterEach(cleanup);

it('affiche le développé couché, l’atlas officiel et les commandes de la page', () => {
  const back = vi.fn();
  render(<ExerciseDetail id="ex.bench_press" onBack={back} prescription={<p>Repos 90 s</p>} />);
  expect(screen.getByRole('heading', { name: 'Développé couché' })).toBeTruthy();
  expect(screen.getByRole('img', { name: /Pectoraux/ })).toBeTruthy();
  expect(screen.getByText('Banc horizontal')).toBeTruthy();
  expect(screen.getByText('Démonstration vidéo non disponible')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /vidéo/i })).toBeNull();
  expect(screen.getByText('Repos 90 s').closest('details')?.open).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: /Retour/ }));
  expect(back).toHaveBeenCalledTimes(1);
});

it.each(Object.entries(exerciseDetails).filter(([id]) => id !== 'ex.bench_press'))(
  'affiche le contenu propre à %s sans lui attribuer un atlas d’un autre mouvement',
  (id, description) => {
    if (!description) throw new Error('Fiche manquante');
    render(<ExerciseDetail id={id} onBack={() => {}} prescription={null} />);
    expect(screen.getByText(description.cues[0]!)).toBeTruthy();
    expect(screen.queryByText('Banc horizontal')).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Conseils' }));
    expect(screen.getByText(description.primary, { selector: 'dd' })).toBeTruthy();
    expect(screen.getByText(description.tip)).toBeTruthy();
  },
);

it('affiche exclusivement les mesures fournies par la projection de progression', () => {
  render(<ExerciseDetail id="ex.bench_press" onBack={() => {}} prescription={null} history={{
    exerciseId: 'ex.bench_press', main: true, trend: { sessions: 1 },
    sessions: [{ requestId: 'strength-1', date: '2026-11-07', setsDone: 3, bestReps: 8, topLoadKg: 70, volumeKg: 1680 }],
  }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Historique' }));
  expect(screen.getByRole('region', { name: 'Historique' }).textContent).toContain('07/11/2026 · 3 séries · 8 reps max · 70 kg max');
  fireEvent.click(screen.getByRole('button', { name: 'Infos' }));
  expect(screen.getByText('Banc horizontal')).toBeTruthy();
});

it('utilise uniquement des identifiants du catalogue de musculation', () => {
  const catalogue = strengthContent().catalog.exercises();
  const ids = new Set(catalogue.map(exercise => exercise.id));
  expect(Object.keys(exerciseDetails).filter(id => !ids.has(id))).toEqual([]);
  process.stdout.write(`Catalogue : ${ids.size} entrées, ${Object.keys(exerciseDetails).length} fiches, 1 atlas, 0 vidéo.\n`);
});
