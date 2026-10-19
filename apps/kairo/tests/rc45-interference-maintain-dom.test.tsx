// @vitest-environment jsdom
/**
 * RC4.5 (lot C, C-8) — interface : interférence NON BLOQUANTE ⇒ avertissement lisible (zones, séance voisine, aucun
 * code), deux boutons (« Maintenir quand même », « Choisir un autre jour ») ; le maintien passe ensuite par le contrôle
 * avant séance. Refus de sécurité (pause douleur) : aucun bouton de maintien. Séance maintenue : mention distincte du
 * ressenti.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { finishProgrammeSession, INTERFERENCE_ACCEPTED, loadState, MemoryStorage, saveState, startProgrammeSession } from '@hybridsport/app-core';
import type { AppState, Clock } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';
import { create, hrProfile } from '../../../packages/app-core/tests/hr/hr-fixtures.js';

afterEach(cleanup);
const now = '2026-10-05T18:00:00.000Z';
const clock = (): Clock => ({ today: now.slice(0, 10), now });
const U = '2026-10-05.running.2';
const FOUR = hrProfile({ strength: true, running: true, ct: true, hr: { focus: 'balanced', role: undefined, sessionsPerWeek: 1 }, availability: [60, 60, 60, 60, 60, 0, 0] });
const INTERNAL = /INTERFERENCE|planner\.|lower_knee|lower_hip|upper_push|structureWindows|acceptInterference/;
const saved = (st: MemoryStorage): AppState => { const r = loadState(st, now); if (r.status !== 'ok') throw new Error(r.status); return r.state; };
const mount = (st: MemoryStorage) => render(<StoreProvider storage={st} clock={clock}><App /></StoreProvider>);
const base = create(FOUR);
const seeded = (s: AppState): MemoryStorage => { const st = new MemoryStorage(); saveState(st, s); return st; };
const card = () => document.querySelector(`[data-unplaced="${U}"]`) as HTMLElement;

describe('RC4.5 lot C — avertissement d’interférence (DOM)', () => {
  it('avertissement lisible, « Choisir un autre jour » sans écriture, « Maintenir quand même » ⇒ contrôle ⇒ séance démarrée et tracée', () => {
    const st = seeded(base);
    mount(st);
    fireEvent.click(screen.getByRole('button', { name: /^Planning$/ }));
    const warn = card().querySelector('[data-manual-maintainable]');
    expect(warn?.textContent).toMatch(/Cette séance serait proche de votre séance de musculation du .+, qui sollicite aussi : .+\. Vous pouvez la maintenir quand même \(votre choix sera noté\) ou choisir un autre jour\./);
    expect(card().querySelector('[data-manual-refused]')).toBeNull();
    expect(card().textContent ?? '').not.toMatch(INTERNAL);
    const before = JSON.stringify(saved(st));
    fireEvent.click(within(card()).getByRole('button', { name: 'Faire maintenant' }));
    const dialog = screen.getByRole('dialog', { name: 'Interférence musculaire' });
    expect(dialog.textContent).toContain('une douleur ou un refus de sécurité empêche toujours le démarrage');
    expect(within(dialog).getAllByRole('button').map((b) => b.textContent)).toEqual(['Maintenir quand même', 'Choisir un autre jour']);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Choisir un autre jour' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(JSON.stringify(saved(st))).toBe(before);
    fireEvent.click(within(card()).getByRole('button', { name: 'Faire maintenant' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Interférence musculaire' })).getByRole('button', { name: 'Maintenir quand même' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Avant de commencer' })).getByRole('button', { name: 'Passer' }));
    const s = saved(st);
    expect(s.programmeLogs[U]?.startedAt).toBe('2026-10-05T18:00:00Z');
    expect(s.checkIns.at(-1)?.reasons.some((r) => r.code === INTERFERENCE_ACCEPTED)).toBe(true);
    expect(document.querySelector('[data-interference-maintained]')?.textContent).toMatch(/^Maintenue à votre demande malgré une interférence musculaire \(.+\)\. Ce n’est pas un ressenti/);
  });

  it('séance maintenue terminée : historique « maintenue malgré une interférence », distincte du ressenti', () => {
    const started = startProgrammeSession(base, clock(), U, undefined, undefined, { acceptInterference: true });
    const done = finishProgrammeSession(started, { today: '2026-10-05', now: '2026-10-05T19:00:00.000Z' }, { requestId: U, completion: 'completed_as_prescribed', pain: false, run: { realizedDurationS: 1500 } });
    mount(seeded(done));
    fireEvent.click(screen.getByRole('button', { name: /^Historique$/ }));
    const notes = [...document.querySelectorAll('[data-interference-maintained]')].map((x) => x.textContent);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toContain('seul votre retour de fin de séance indique si elle a été bien tolérée');
    expect(document.querySelector('[data-history-feedback]')).toBeNull();
  });

  it('pause douleur active : refus de sécurité, ni « Faire maintenant » ni maintien proposé', () => {
    const pained = finishProgrammeSession(startProgrammeSession(base, clock(), '2026-10-05.strength.1'), { today: '2026-10-05', now: '2026-10-05T19:00:00.000Z' }, { requestId: '2026-10-05.strength.1', completion: 'modified', pain: true });
    mount(seeded(pained));
    fireEvent.click(screen.getByRole('button', { name: /^Planning$/ }));
    expect(within(card()).queryByRole('button', { name: 'Faire maintenant' })).toBeNull();
    expect(card().querySelector('[data-manual-maintainable]')).toBeNull();
    expect(card().querySelector('[data-manual-refused]')?.textContent).toContain('pause douleur');
    expect(screen.queryByRole('button', { name: 'Maintenir quand même' })).toBeNull();
  });
});
