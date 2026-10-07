// @vitest-environment jsdom
/**
 * FIELD TEST — interface : retour terrain après une séance terminée (formulaire, enregistrement unique, résumé),
 * historique (ressenti, durée réelle), accueil (séance supplémentaire disponible), Programme (HYROX Équilibré expliqué),
 * Réglages (KAIRO FIELD TEST, Journal Beta). Aucun code interne affiché.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createBeta0Programme, emptyState, finishProgrammeSession, loadState, MemoryStorage, saveState, selectBeta0Week, startProgrammeSession } from '@hybridsport/app-core';
import type { AppState, Clock } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';
import { hrProfile } from '../../../packages/app-core/tests/hr/hr-fixtures.js';

afterEach(cleanup);
const now = '2026-10-05T07:30:00.000Z';
const clock = (): Clock => ({ today: now.slice(0, 10), now });
const CODES = /UNRESOLVED|TEST_ONLY|SIMULATION_ONLY|USER_REPORTED|manual_from_unplaced|composed_unplaced|hybrid_race|str_full|running\.easy/;
const FOUR = hrProfile({ strength: true, running: true, ct: true, hr: { focus: 'balanced', role: undefined, sessionsPerWeek: 1 }, availability: [60, 60, 60, 60, 60, 0, 0] });
const create = (): AppState => createBeta0Programme(emptyState(), FOUR, clock(), { lastRun: { realizedDurationS: 1800, difficulty: 'AS_EXPECTED' } });
function mount(s: AppState): MemoryStorage {
  const st = new MemoryStorage();
  saveState(st, s);
  render(<StoreProvider storage={st} clock={clock}><App /></StoreProvider>);
  return st;
}
const tab = (name: string) => fireEvent.click(within(screen.getByRole('navigation', { name: 'Navigation principale' })).getByRole('button', { name }));
function strengthDone(): AppState {
  const s0 = create();
  const id = selectBeta0Week(s0, '2026-10-05')?.sessions.find((x) => x.sport === 'strength' && x.placement === 'planned')?.requestId ?? '';
  return finishProgrammeSession(startProgrammeSession(s0, clock(), id), clock(), { requestId: id, completion: 'modified', pain: false });
}

describe('FIELD TEST — interface', () => {
  it('retour terrain : formulaire après la fin, vide ⇒ non enregistrable, enregistrement unique, historique', () => {
    const st = mount(strengthDone());
    tab('Historique');
    fireEvent.click(screen.getAllByRole('button', { name: /Full body/ })[0] as HTMLElement);
    const card = screen.getByLabelText('Retour terrain');
    const save = within(card).getByRole('button', { name: 'Enregistrer mon ressenti' });
    expect((save as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(within(within(card).getByRole('radiogroup', { name: 'Difficulté ressentie' })).getByRole('radio', { name: 'Difficile' }));
    fireEvent.change(within(card).getByLabelText(/Commentaire/), { target: { value: 'Dernière série très dure' } });
    fireEvent.click(save);
    expect(screen.queryByRole('button', { name: 'Enregistrer mon ressenti' })).toBeNull();
    expect(screen.getByLabelText('Retour terrain').textContent).toContain('difficulté difficile');
    const saved = loadState(st, now);
    const log = Object.values(saved.state.programmeLogs)[0];
    expect(log?.field).toMatchObject({ provenance: 'USER_REPORTED_FIELD_FEEDBACK', difficulty: 'hard', comment: 'Dernière série très dure' });
    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(document.body.textContent).toContain('Ressenti : difficulté difficile');
    expect(document.body.textContent).toContain('Durée réelle');
    expect(document.body.textContent ?? '').not.toMatch(CODES);
  });
  it('« Plus tard » : aucun retour écrit (absence ≠ valeur)', () => {
    const st = mount(strengthDone());
    tab('Historique');
    fireEvent.click(screen.getAllByRole('button', { name: /Full body/ })[0] as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: 'Plus tard' }));
    expect(screen.queryByLabelText('Retour terrain')).toBeNull();
    expect(Object.values(loadState(st, now).state.programmeLogs)[0]?.field).toBeUndefined();
  });
  it('accueil : séance prévue conservée + « 1 séance supplémentaire disponible » ouvrable', () => {
    mount(create());
    expect(screen.getByRole('button', { name: 'Commencer la séance' })).toBeTruthy();
    const extra = screen.getByLabelText('Séances supplémentaires disponibles');
    expect(extra.textContent).toContain('1 séance supplémentaire disponible');
    fireEvent.click(within(extra).getByRole('button', { name: /^Voir : Course/ }));
    expect(screen.getByRole('button', { name: 'Faire maintenant' })).toBeTruthy();
  });
  it('Programme : HYROX Équilibré expliqué simplement, objectifs Cross-training / HYROX affichés', () => {
    mount(create());
    tab('Programme');
    const t = document.body.textContent ?? '';
    expect(t).toContain('Mode : Équilibré');
    expect(t).toContain('KAIRO alterne différents types de séances HYROX au fil des semaines.');
    expect(t).not.toMatch(/scientifiquement/);
    expect(t).toContain('Préparer une course HYROX');
    expect(t).toContain('Forme générale · Mixte');
  });
  it('Réglages : KAIRO FIELD TEST (version, planification) et Journal Beta sans code interne', () => {
    mount(strengthDone());
    tab('Réglages');
    const card = screen.getByLabelText('KAIRO FIELD TEST');
    expect(card.textContent).toContain('Beta expérimentale');
    expect(card.textContent).toContain('Planification beta0-m31');
    fireEvent.click(screen.getByRole('button', { name: /Journal Beta/ }));
    expect(screen.getByLabelText('Résumé du journal').textContent).toContain('1 réalisées');
    expect(screen.getByRole('button', { name: 'Exporter le journal Beta (JSON)' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Exporter le journal Beta (texte)' })).toBeTruthy();
    expect(document.body.textContent ?? '').not.toMatch(CODES);
  });
  it('planning : qualité courte « Séance expérimentale », jamais présentée comme une erreur', () => {
    mount(create());
    tab('Planning');
    const lines = Array.from(document.querySelectorAll('[data-quality]'));
    expect(lines.length).toBeGreaterThan(0);
    for (const l of lines) expect(l.textContent).toBe('Séance expérimentale');
    expect(document.body.textContent ?? '').not.toMatch(/erreur|UNRESOLVED/i);
  });
});
