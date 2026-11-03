// @vitest-environment jsdom
/**
 * Chantier C — écran Progression (jsdom, backend réel) : sections par sport, mini-graphiques accessibles (valeurs en
 * alternative textuelle), choix de l'exercice au clavier, allure seulement si fiable, états vides.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import {
  createBeta0Programme, emptyState, EQUIPMENT_PRESETS, finishProgrammeSession, logFreeRun, MemoryStorage, recordProgrammeSet, saveState, selectBeta0Week,
  selectProgrammeSession, startProgrammeSession,
} from '@hybridsport/app-core';
import type { AppState, Clock, ProfileInput } from '@hybridsport/app-core';
import { Progress0 } from '../src/screens/beta0/Progress0.js';
import { StoreProvider } from '../src/store.js';

afterEach(cleanup);
const MONDAY = '2026-10-05';
const SUNDAY = '2026-10-11';
const at = (today: string, time = '07:30:00'): Clock => ({ today, now: `${today}T${time}.000Z` });
const fullGym = [...(EQUIPMENT_PRESETS.find((p) => p.id === 'preset.full_gym')?.equipment ?? [])];
const hybrid = (o: Partial<ProfileInput> = {}): ProfileInput => ({
  displayName: '', level: 'intermediate', priorities: ['strength', 'running'], strength: { enabled: true, goal: 'strength', sessionsPerWeek: 2 },
  running: { enabled: true, population: 'P_R2', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' },
  crosstraining: { enabled: false }, hyrox: { enabled: false }, equipment: { presetId: 'preset.full_gym', items: fullGym, confirmedAt: '2026-10-04T10:00:00Z' },
  availability: [60, 45, 60, 0, 60, 90, 75], excludedExercises: [], acceptedProvisionalAt: '2026-10-04T10:00:00Z', ...o,
});
const mount = (s: AppState, today = SUNDAY) => {
  const storage = new MemoryStorage();
  saveState(storage, s);
  return render(<StoreProvider storage={storage} clock={() => at(today)}><Progress0 /></StoreProvider>);
};

function withData(): { s: AppState; exerciseLabels: number } {
  let s = createBeta0Programme(emptyState(), hybrid(), at(MONDAY), { lastRun: { realizedDurationS: 1800, difficulty: 'AS_EXPECTED' } });
  const week = selectBeta0Week(s, MONDAY)?.sessions ?? [];
  const st = week.find((v) => v.sport === 'strength' && v.status === 'planned' && v.date);
  const run = week.find((v) => v.sport === 'running' && v.status === 'planned' && v.date);
  if (!st?.date || !run?.date) throw new Error('séances attendues');
  s = startProgrammeSession(s, at(st.date, '18:00:00'), st.requestId);
  const items = (selectProgrammeSession(s, st.requestId)?.session.blocks ?? []).filter((b) => b.kind !== 'warmup' && b.kind !== 'cooldown').flatMap((b) => b.items).filter((i) => i.prescription.type === 'sets');
  for (const it of items.slice(0, 2)) {
    if (it.prescription.type !== 'sets') continue;
    it.prescription.sets.forEach((_, i) => { s = recordProgrammeSet(s, at(st.date ?? MONDAY, '18:01:00'), st.requestId, { itemId: it.id, setIndex: i, done: true, reps: 5, loadKg: 60 }); });
  }
  s = finishProgrammeSession(s, at(st.date, '19:00:00'), { requestId: st.requestId, completion: 'modified', pain: false });
  s = finishProgrammeSession(s, at(run.date, '19:00:00'), { requestId: run.requestId, completion: 'completed_as_prescribed', pain: false, run: { realizedDurationS: 1800, distanceM: 6000 } });
  s = logFreeRun(s, { realizedDurationS: 1500, completion: 'COMPLETED', difficulty: 'AS_EXPECTED', pain: false, startedAt: `${MONDAY}T06:00:00Z` }, at(MONDAY, '08:00:00'));
  return { s, exerciseLabels: new Set(items.slice(0, 2).map((i) => i.exerciseId)).size };
}

describe('Progression — avec données', () => {
  it('sections Musculation / Course, sparkline étiquetée, choix d’exercice, allure fiable seulement, sports non déclarés absents', () => {
    const { s, exerciseLabels } = withData();
    mount(s);
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Musculation', 'Course']);
    expect(document.querySelector('[data-progress-empty]')).toBeNull();
    const strength = within(screen.getByRole('region', { name: 'Musculation' }));
    const chips = within(strength.getByRole('group', { name: 'Choisir un exercice' })).getAllByRole('button');
    expect(chips).toHaveLength(exerciseLabels);
    expect(chips[0]?.getAttribute('aria-pressed')).toBe('true');
    expect(strength.getAllByRole('img')[0]?.getAttribute('aria-label')).toMatch(/charge maximale par séance, .*60 kg/);
    expect(strength.getByText('Première').nextElementSibling?.textContent).toBe('60 kg');
    expect(strength.getByRole('list', { name: 'Séries et volume par semaine' }).textContent).toMatch(/Sem\. 41.*séries · .*kg/);
    if (chips[1]) {
      fireEvent.click(chips[1]);
      expect(chips[1].getAttribute('aria-pressed')).toBe('true');
      expect(chips[0]?.getAttribute('aria-pressed')).toBe('false');
    }
    const running = within(screen.getByRole('region', { name: 'Course' }));
    expect(running.getByRole('img').getAttribute('aria-label')).toMatch(/^Durée par course : .*30 min.*25 min|^Durée par course : .*25 min.*30 min/);
    const rows = running.getByRole('list', { name: 'Dernières courses' }).querySelectorAll('li');
    const text = [...rows].map((r) => r.textContent ?? '');
    expect(text.find((t) => t.includes('6 km'))).toMatch(/30 min · 6 km · 5:00 \/km/);
    expect(text.find((t) => t.includes('libre'))).not.toMatch(/\/km/);
    expect(running.getByRole('list', { name: 'Courses par semaine' }).textContent).toMatch(/Sem\. 41.*2 faites \/ 2 prévues/);
    expect(screen.queryByRole('region', { name: 'HYROX' })).toBeNull();
  });
});

describe('Progression — états vides', () => {
  it('programme sans séance réalisée : message global et vide par sport déclaré', () => {
    mount(createBeta0Programme(emptyState(), hybrid(), at(MONDAY), {}), MONDAY);
    expect(document.querySelector('[data-progress-empty]')?.textContent).toMatch(/Aucune séance réalisée pour l’instant/);
    expect(within(screen.getByRole('region', { name: 'Musculation' })).getByText(/Aucune séance de musculation réalisée/)).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Course' })).getByText(/Aucune course réalisée/)).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('Cross-training réalisé hors programme : compteur et note « sport expérimental », aucune progression', () => {
    mount({ ...emptyState(), crosstraining: { realized: [{ sessionId: 'ct-1', completedAt: '2026-10-06T18:00:00Z', completion: 'completed_as_prescribed' }] } });
    const ct = within(screen.getByRole('region', { name: 'Cross-training' }));
    expect(ct.getByText('Séances faites').nextElementSibling?.textContent).toBe('1');
    expect(ct.getByText('Durée mesurée').nextElementSibling?.textContent).toBe('—');
    expect(ct.getByText(/suivi de progression n’est pas disponible/)).toBeTruthy();
  });
});
