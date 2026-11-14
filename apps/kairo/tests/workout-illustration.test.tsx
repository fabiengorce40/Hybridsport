// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { WorkoutIllustration } from '../src/playfield/WorkoutIllustration.js';

afterEach(cleanup);

it.each([
  ['str_upper', 'Haut du corps'],
  ['str_lower', 'Bas du corps'],
  ['str_upper_a', 'Haut du corps'],
  ['str_upper_b', 'Haut du corps'],
  ['str_lower_a', 'Bas du corps'],
  ['str_lower_b', 'Bas du corps'],
  ['str_full_body', 'Full body'],
])('affiche le visuel de séance %s', (archetypeId, label) => {
  render(<WorkoutIllustration archetypeId={archetypeId}/>);
  expect(screen.getByRole('img', { name: label })).toBeTruthy();
});

it('ne devine pas une catégorie quand l’identifiant manque', () => {
  render(<WorkoutIllustration archetypeId={null}/>);
  expect(screen.queryByRole('img')).toBeNull();
});
