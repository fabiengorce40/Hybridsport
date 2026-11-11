// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { PlayfieldLogo } from '../src/playfield/PlayfieldLogo.js';
import { PlayfieldBenchArt } from '../src/playfield/ExerciseArt.js';
import { PlayfieldAnatomy } from '../src/playfield/PlayfieldAnatomy.js';
import { PLAYFIELD_TABS } from '../src/ui.js';

afterEach(cleanup);
const css = readFileSync('apps/kairo/src/playfield/playfield.css', 'utf8');

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

// ── Lot A–C : isolation du drapeau et bilan de séance (données enregistrées seulement). ──
import { selectProgrammeSession, zAppState, normalizeInstant } from '@hybridsport/app-core';
import { PLAYFIELD_V4 } from '../src/playfield/flag.js';
import { SessionSummary } from '../src/playfield/SessionSummary.js';

it('sans drapeau de build explicite, Playfield Pro reste inactif (V3.1, production, ESSAI, builds historiques)', () => {
  expect(import.meta.env.VITE_REKKA_SKIN).toBeUndefined();
  expect(PLAYFIELD_V4).toBe(false);
});

it('le bilan ne compte que les séries réellement validées ; montées à part ; douleur déclarée telle quelle', () => {
  const state = zAppState.parse(JSON.parse(readFileSync('apps/kairo/tests/fixtures/v3-sober.json', 'utf8')));
  const base = selectProgrammeSession(state, '2026-10-05.strength.2');
  if (!base) throw Error('fixture');
  const item = base.session.blocks.flatMap((b) => b.items).find((i) => i.prescription.type === 'sets');
  if (!item || item.prescription.type !== 'sets') throw Error('fixture');
  const sets = [{ kind: 'rampup' as const, reps: 5, restAfterS: 60 }, { kind: 'working' as const, reps: 10, restAfterS: 120 }, { kind: 'working' as const, reps: 10, restAfterS: 120 }];
  const one = { ...item, prescription: { type: 'sets' as const, sets } };
  const v = {
    ...base,
    session: { ...base.session, blocks: [{ id: 'b', kind: 'strength' as const, role: 'primary' as const, optional: false, format: 'sets' as const, grouping: 'straight' as const, items: [one], levers: [] }] },
    log: { requestId: base.requestId, sport: 'strength' as const, startedAt: normalizeInstant('2026-10-07T08:00:00Z'), finishedAt: normalizeInstant('2026-10-07T08:40:00Z'), sets: [{ itemId: one.id, setIndex: 0, done: true, reps: 5 }, { itemId: one.id, setIndex: 1, done: true, reps: 10, loadKg: 40 }], painItems: [one.id], rest: null, timing: { activeS: 2280, pausedS: 120 } },
    result: { requestId: base.requestId, weekIndex: 0, sport: 'strength' as const, date: '2026-10-07', completion: 'modified' as const, pain: true, provenance: 'declared' as const, recordedAt: normalizeInstant('2026-10-07T08:40:00Z') },
  } as unknown as Parameters<typeof SessionSummary>[0]['v'];
  const r = render(<SessionSummary v={v} statusLabel="Adaptée" />);
  const text = r.container.textContent ?? '';
  expect(text).toContain('Séries de travail1/2');
  expect(text).toContain('Exercices terminés0/1');
  expect(text).toContain('Montées en charge : 1/1 · hors volume et progression.');
  expect(text).toContain('38 min');
  expect(text).toContain('Douleur signalée en fin de séance.');
  expect(text).toContain('Douleur notée sur 1 exercice.');
  expect(text).not.toMatch(/record|calorie|kcal|score/i);
});

it('V4 fidelity keeps the approved palette isolated and removes the old neon identity', () => {
  const fidelity = readFileSync('apps/kairo/src/playfield/fidelity.css', 'utf8');
  expect(fidelity).toContain('html[data-rekka-theme="playfield-pro"]');
  expect(fidelity).toContain('#1647C8');
  expect(fidelity).toContain('#FDCB32');
  expect(fidelity).not.toContain('#DCFF35');
  expect(fidelity).not.toContain('magnesie-officielle');
  expect(fidelity).toContain('.v31-rest-main');
  expect(fidelity).toContain('.pf-week-sports');
});

it('V4 differentiates a straight barbell from two independent dumbbells', () => {
  const r = render(<PlayfieldBenchArt dumbbells />);
  expect(screen.getByRole('img', { name: /deux haltères indépendants/i })).toBeTruthy();
  expect(r.container.querySelector('svg[data-equipment="dumbbells"]')).toBeTruthy();
  expect(r.container.querySelectorAll('g[transform*="translate"]').length).toBe(2);
  r.rerender(<PlayfieldBenchArt dumbbells={false} />);
  expect(screen.getByRole('img', { name: /barre olympique.*disques alignés/i })).toBeTruthy();
  expect(r.container.querySelector('svg[data-equipment="barbell"]')).toBeTruthy();
  expect(r.container.querySelectorAll('g[transform*="translate"]').length).toBe(2);
  expect(r.container.querySelector('img')).toBeNull();
});

it('la navigation Playfield officielle offre exactement quatre onglets réels', () => {
  expect(PLAYFIELD_TABS).toEqual(['home', 'plan', 'history', 'settings']);
});

it('le détail de séance a une illustration anatomique accessible et réutilisable', () => {
  const r = render(<PlayfieldAnatomy target="chest"/>);
  const chest = screen.getByRole('img', {name:/pectoraux/i});
  expect(chest.getAttribute('src')).toMatch(/chest-anatomy/);
  expect(chest.getAttribute('width')).toBe('662');
  expect(chest.getAttribute('height')).toBe('411');

  r.rerender(<PlayfieldAnatomy target="shoulders"/>);
  expect(screen.getByRole('img', {name:/illustration indicative du haut du corps/i})).toBeTruthy();
  expect(r.container.querySelectorAll('svg')).toHaveLength(1);
  expect(r.container.querySelector('img')).toBeNull();
});

it('la couche Playfield de référence est bien indépendante de l’identité historique', () => {
  const reference = readFileSync('apps/kairo/src/playfield/reference.css', 'utf8');
  expect(reference).toContain('html[data-rekka-theme="playfield-pro"]');
  for(const c of ['#1647C8','#FDCB32','#FA6A58','#FFF7EA','#0E1B35'])expect(reference).toContain(c);
  for(const selector of ['.pf-stepper','.pf-next-exercise','.pf-progress-period','.pf-planning-week','.pf-detail-toolbar','.pf-summary-celebration','.pf-profile-heading'])expect(reference).toContain(selector);
  expect(reference).not.toContain('#DCFF35');
  expect(reference).not.toContain('magnesie-officielle');
});
