/**
 * M3.1 — politique de ROTATION (« équilibré ») TEST_ONLY, source UNIQUE (tests du programme, et Beta 0 expérimentale
 * où elle est marquée SIMULATION_ONLY). Aucune valeur approuvée : `draft`, provisoire ; une lecture PRODUCTION la
 * refuse (fail-closed). Candidates HYROX = les cinq rôles H2 existants, dans l'ordre de la taxonomie H2, pour les deux
 * objectifs : AUCUNE préférence sportive n'est encodée (ni pondération, ni rôle « par défaut ») ; le choix ne lit que
 * l'historique du programme (moins récemment réalisé, puis moins récemment assigné).
 */
import { HYROX_ROLES, hyroxRoleArchetype } from '@hybridsport/planner';
import type { LoadedRuleset } from '@hybridsport/engine';
import { testRuleset } from '../../engine/tests/fixtures/load.js';
import { param, testRulesetDocument } from '../../engine/tests/fixtures/ruleset.js';

const HYROX_CANDIDATES = HYROX_ROLES.map((role) => ({ archetypeId: hyroxRoleArchetype(role), stimulus: `stim.${hyroxRoleArchetype(role)}` }));
export const ROTATION_TEST_CANDIDATES = { hyrox: { GENERAL: HYROX_CANDIDATES, RACE_PREPARATION: HYROX_CANDIDATES } };
export const ROTATION_TEST_SELECTION = { order: ['least_recently_executed', 'least_recently_assigned'], executedCompletions: ['completed_as_prescribed', 'modified'] };
export const ROTATION_SIMULATION_IDS = ['programme.rotation.candidates', 'programme.rotation.selection'] as const;

export function rotationParameters(extra: Record<string, unknown> = {}, o: { omit?: readonly string[]; values?: Readonly<Record<string, unknown>> } = {}) {
  return [
    param('programme.rotation.candidates', ROTATION_TEST_CANDIDATES as never, 'G2', extra),
    param('programme.rotation.selection', ROTATION_TEST_SELECTION as never, 'G2', extra),
  ].filter((p) => !(o.omit ?? []).includes(p.id)).map((p) => (o.values && p.id in o.values ? { ...p, value: o.values[p.id] as never } : p));
}

/** Gouvernance du programme TEST_ONLY contenant SEULEMENT la politique de rotation (aucune décision d'adaptation). */
export function rotationGovernance(extra: Record<string, unknown> = {}, o: Parameters<typeof rotationParameters>[1] = {}): LoadedRuleset {
  const doc = testRulesetDocument();
  return testRuleset({ ...doc, parameters: [...doc.parameters, ...rotationParameters(extra, o)] });
}
