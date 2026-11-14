// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { ExerciseIllustration } from '../src/playfield/ExerciseIllustration.js';

afterEach(cleanup);

it('sépare les variantes barre et haltères par identifiant exact', () => {
  const { rerender } = render(<ExerciseIllustration exerciseId="ex.bench_press"/>);
  expect(screen.getByRole('img', { name: /à la barre/ }).tagName).toBe('IMG');
  rerender(<ExerciseIllustration exerciseId="ex.db_bench_press"/>);
  expect(screen.getByRole('img', { name: /deux haltères/ }).getAttribute('data-equipment')).toBe('dumbbells');
  expect(screen.queryByRole('img', { name: /à la barre/ })).toBeNull();
});

it.each(['ex.pull_up', 'ex.machine_row', 'ex.back_squat', 'ex.goblet_squat', 'ex.unknown_bench_press'])(
  'affiche un visuel neutre pour %s sans lui attribuer un autre mouvement',
  exerciseId => {
    render(<ExerciseIllustration exerciseId={exerciseId}/>);
    expect(screen.getByText('Illustration indisponible')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  },
);
