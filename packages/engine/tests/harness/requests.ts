import { zPainReport } from '@hybridsport/domain';
import type { PainReportInput, SessionDraftInput } from '@hybridsport/domain';
import { fromArray } from '../../src/index.js';
import type { CorePipelineRequest, CoreProfile, CoreState } from '../../src/index.js';
import { presetEquipment } from '../fixtures/context.js';
import { strengthSessionInput, set } from '../fixtures/sessions.js';

export const PROFILE_GYM: CoreProfile = {
  athleteLevel: 'intermediate', eligibility: 'eligible', declarations: [], healthDataConsent: true,
  restrictions: [], excludedExercises: [], availableEquipment: presetEquipment('preset.commercial_gym'),
};

export const STATE_FRESH: CoreState = { readiness: 'normal', activePain: [], painHistory: 'available', dayAvailable: true };

/** Variante « machines » de la séance de référence (candidat alternatif). */
export function machineVariant(): SessionDraftInput {
  const base = strengthSessionInput();
  return {
    ...base, id: 'session.test.upper_machines',
    blocks: [base.blocks[0]!, { id: 'b.main', kind: 'strength', role: 'primary', format: 'sets', grouping: 'straight',
      items: [{ id: 'i.press', exerciseId: 'ex.machine_chest_press', prescription: { type: 'sets', sets: [set('working', 8, 120), set('working', 8, 120), set('working', 8, 120)] } }] }, base.blocks[2]!],
  };
}

export const pain = (p: Partial<PainReportInput>) => zPainReport.parse({ id: 'pain.h', level: 'P2', bodyAreas: ['shoulder'], context: 'check_in', reportedAt: '2026-09-28T07:00:00Z', persisted: true, rulesetRef: '0.1.0-test', ...p });

/** Requêtes représentatives du banc (PROFILE + STATE + candidats fournis). */
export const REQUESTS: Readonly<Record<string, CorePipelineRequest>> = {
  nominal: { profile: PROFILE_GYM, state: STATE_FRESH, candidates: [
    { session: strengthSessionInput(), optimization: fromArray([0.8, 0.7, 0.5, 0, 0.5, 0.2]) },
    { session: machineVariant(), optimization: fromArray([0.78, 0.6, 0.9, 0, 0.5, 0.4]) },
  ] },
  dumbbells_only: { profile: { ...PROFILE_GYM, availableEquipment: presetEquipment('preset.dumbbells_only') }, state: STATE_FRESH, candidates: [
    { session: strengthSessionInput(), optimization: fromArray([0.8, 0.7, 0.5, 0, 0.5, 0.2]) },
  ] },
  pain_p2_no_consent: { profile: { ...PROFILE_GYM, healthDataConsent: false }, state: { ...STATE_FRESH, readiness: 'unknown', painHistory: 'unavailable', activePain: [pain({ persisted: false, bodyAreas: ['shoulder'], level: 'P2' })] }, candidates: [
    { session: strengthSessionInput(), optimization: fromArray([0.8, 0.7, 0.5, 0, 0.5, 0.2]) },
  ] },
  out_of_scope: { profile: { ...PROFILE_GYM, eligibility: 'excluded' }, state: STATE_FRESH, candidates: [
    { session: strengthSessionInput(), optimization: fromArray([1, 1, 1, 1, 1, 1]) },
  ] },
  p4: { profile: PROFILE_GYM, state: { ...STATE_FRESH, activePain: [pain({ level: 'P4', bodyAreas: [] })] }, candidates: [
    { session: strengthSessionInput(), optimization: fromArray([1, 1, 1, 1, 1, 1]) },
  ] },
};
