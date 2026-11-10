// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { PlayfieldLogo } from '../src/playfield/PlayfieldLogo.js';

afterEach(cleanup);
const css = readFileSync(new URL('../src/playfield/playfield.css', import.meta.url), 'utf8');

it('affiche la marque REKKA en SVG original sans image de maquette', () => {
  const result = render(<PlayfieldLogo />);
  expect(screen.getByRole('img', { name: 'REKKA' })).toBeTruthy();
  expect(result.container.querySelector('svg.pf-logo-mark')).toBeTruthy();
  expect(result.container.querySelector('img')).toBeNull();
});

it('isole toutes les couleurs Playfield Pro derrière son attribut de thème', () => {
  expect(css).toContain('html[data-rekka-theme="playfield-pro"]');
  expect(css).toContain('#1647C8');
  expect(css).toContain('#FDCB32');
  expect(css).toContain('#FA6A58');
  expect(css).toContain('#FFF7EA');
  expect(css).toContain('#0E1B35');
});

it('n’utilise pas la vieille magnésie ni le jaune-vert comme nouvelle identité', () => {
  expect(css).not.toContain('magnesie-officielle');
  expect(css).not.toContain('#DCFF35');
});
