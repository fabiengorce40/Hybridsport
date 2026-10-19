/**
 * RC4.5 (F6) — CONTENU PROVISOIRE versionné « mollets » : SURCOUCHE déclarative du ruleset verrouillé (4F) et du
 * catalogue de test Strength, qui restent inchangés et reproductibles à l'identique (registre de contenu versionné
 * d'app-core). Composition validée (F6-1, F6-2) :
 * - schéma `calf_raise` (région bas du corps, non locomoteur), attribué aux deux exercices de mollets : ils ne sont
 *   plus en concurrence avec le leg curl et le leg extension (`isolation_lower`) ;
 * - besoin `calves` sans repli de substitution ;
 * - emplacements `fb.calves` (Full Body) et `lo.calves` (Bas du corps) : accessoire facultatif, suivi, à TEMPS
 *   RÉSIDUEL (R1) et jusqu'à la cible hebdomadaire (R2) ; retirés quand une voisine abaisse genou / hanche ;
 * - dernier de `optionalOrder` et de `needPriority` (cohérence ; R1 l'ajoute de toute façon en dernier).
 * Aucune version au poids du corps (F6-3) : sans machine à mollets ni haltères, l'emplacement est omis.
 */
import type { CatalogDocumentInput, RulesetDocumentInput } from '@hybridsport/domain';
import { strengthCatalogDocument } from './catalog.js';
import { strengthLockRulesetDocument } from './ruleset.js';

export const F6_RULESET_VERSION = '0.5.0-strength-f6';
export const F6_CATALOG_VERSION = '0.3.0-strength-test-f6';
const F6_PARAM_VERSION = '0.5.0';
const CALF_EXERCISES = ['ex.machine_calf_raise', 'ex.db_calf_raise'];
const CALVES = 'calves';
/** Emplacements F6 : après l'emplacement de tronc de l'archétype (bloc accessoire). */
const F6_SLOTS: Readonly<Record<string, string>> = { str_full_body: 'fb.calves', str_lower: 'lo.calves' };

type Json = Record<string, unknown>;

export function strengthF6CatalogDocument(): CatalogDocumentInput {
  const base = strengthCatalogDocument();
  return {
    ...base,
    catalogVersion: F6_CATALOG_VERSION,
    taxonomy: { ...base.taxonomy, patterns: [...base.taxonomy.patterns, { id: 'calf_raise', region: 'lower', isLocomotor: false }] },
    exercises: base.exercises.map((e) => (CALF_EXERCISES.includes(e.id) ? { ...e, patterns: { ...e.patterns, primary: 'calf_raise' } } : e)),
  };
}

/** Valeur F6 d'un paramètre `strength.*` (surcouche pure de la valeur verrouillée). */
function overlay(id: string, v: unknown): unknown {
  switch (id) {
    case 'strength.needs': return { ...(v as Json), [CALVES]: { requirement: { pattern: 'calf_raise' } } };
    case 'strength.archetypes': return (v as Json[]).map((a) => {
      const slotId = F6_SLOTS[String(a.id)];
      if (!slotId) return a;
      return { ...a, slots: [...(a.slots as Json[]), { id: slotId, blockId: 'b.accessory', need: CALVES, role: 'accessory', status: 'optional', count: { min: 1, max: 1 }, modalityPreference: 'stability', anchorable: false, trackable: true, fill: 'residual_time', untilWeeklyTarget: true }] };
    });
    case 'strength.goals': return Object.fromEntries(Object.entries(v as Record<string, Json>).map(([k, g]) => [k, { ...g, needPriority: [...(g.needPriority as string[]), CALVES] }]));
    case 'strength.stimuli': return Object.fromEntries(Object.entries(v as Record<string, Json>).map(([k, st]) => [k, { ...st, optionalOrder: [...(st.optionalOrder as string[]), CALVES] }]));
    case 'strength.interference': {
      const x = v as Json & { perStructure: Record<string, Json & { dropOptionalNeeds: string[] }> };
      return { ...x, perStructure: Object.fromEntries(Object.entries(x.perStructure).map(([s, p]) => [s, s === 'lower_knee' || s === 'lower_hip' ? { ...p, dropOptionalNeeds: [...p.dropOptionalNeeds, CALVES] } : p])) };
    }
    case 'strength.substitution.fallbackNeeds': return { ...(v as Json), [CALVES]: [] };
    default: return undefined;
  }
}

export function strengthF6RulesetDocument(): RulesetDocumentInput {
  const base = strengthLockRulesetDocument();
  return {
    ...base,
    rulesetVersion: F6_RULESET_VERSION,
    parameters: base.parameters.map((p) => {
      const value = overlay(p.id, p.value);
      return value === undefined ? p : { ...p, value: value as typeof p.value, version: F6_PARAM_VERSION, modifiedAt: '2026-10-19', justification: `RC4.5 (F6) — emplacement facultatif dédié aux mollets à temps résiduel (R1, R2) ; surcouche de ${String(base.rulesetVersion)}.` };
    }),
  };
}
