// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { WorkoutIllustration } from '../src/playfield/WorkoutIllustration.js';

afterEach(cleanup);

it('affiche trois ressources distinctes pour les zones et partage le visuel entre variantes', () => {
  const { rerender } = render(<WorkoutIllustration archetypeId="str_upper_a"/>);
  const upper = screen.getByRole('img', { name: 'Haut du corps' }).getAttribute('src');
  rerender(<WorkoutIllustration archetypeId="str_upper_b"/>);
  expect(screen.getByRole('img', { name: 'Haut du corps' }).getAttribute('src')).toBe(upper);
  rerender(<WorkoutIllustration archetypeId="str_lower_b"/>);
  const lower = screen.getByRole('img', { name: 'Bas du corps' }).getAttribute('src');
  rerender(<WorkoutIllustration archetypeId="str_full_body"/>);
  const full = screen.getByRole('img', { name: 'Full Body' }).getAttribute('src');
  expect(new Set([upper, lower, full]).size).toBe(3);
});

it.each([null, 'str_support', 'ex.bench_press', 'toString'])(
  'utilise une composition neutre pour %s',
  archetypeId => {
    const { container } = render(<WorkoutIllustration archetypeId={archetypeId}/>);
    expect(container.querySelector('[data-workout-art="neutral"]')).not.toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
  },
);
