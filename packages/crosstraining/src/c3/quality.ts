/**
 * Q1 — DIAGNOSTIC DE QUALITÉ d'une séance Cross-training C3 DÉJÀ COMPOSÉE (lecture seule : aucun format, mouvement,
 * dose, charge ou durée choisi ou modifié). Critères Cross-training ici ; contrat et verdict du CORE.
 *
 * VARIÉTÉ ≠ COHÉRENCE ≠ QUALITÉ : une séance différente de la précédente (variété, vérifiable) n'est pas pour autant
 * cohérente avec son stimulus (gouverné, non approuvé), ni une bonne séance (aucune plage de qualité approuvée).
 * DÉMONTRABLE aujourd'hui : intégrité, appartenance du format aux formats gouvernés du stimulus, redondances de
 * famille / pattern, répétition exacte de la dernière séance, totaux et nombre de tours estimés (calcul). Le reste
 * (dose, durée, densité, technicité) repose sur des valeurs `ct.*` non approuvées ⇒ UNRESOLVED.
 */
import type { LoadedCatalog, QualityAssessment, QualityBasis, QualityCriterion, QualityEnvironment, RecordedEstimate } from '@hybridsport/engine';
import { assessment, genericCriteria, governedCriterion } from '@hybridsport/engine';
import type { SessionDraft } from '@hybridsport/domain';
import type { CtGovernance } from '../governance/state.js';
import { ctPrescriptionOf } from './record.js';
import { SECONDS_PER_MINUTE } from './parameters.js';

export interface C3QualityInput {
  readonly catalog: LoadedCatalog;
  readonly governance: CtGovernance;
  readonly env?: QualityEnvironment;
  readonly estimate?: RecordedEstimate;
  readonly reasons?: readonly { readonly code: string; readonly params: Readonly<Record<string, unknown>> }[];
}

/** Base d'une valeur C3 : maturité DÉCLARÉE du registre (jamais un texte). */
export function ctBasisOf(governance: CtGovernance, parameterId: string, env: QualityEnvironment = undefined): QualityBasis {
  const p = governance.parameters.find((x) => x.parameterId === parameterId);
  if (!p || p.value.status === 'unresolved') return 'UNRESOLVED';
  if (p.maturity === 'PRODUCTION_ELIGIBLE') return 'APPROVED';
  if (env) return env;
  return p.maturity === 'EXPERT_PROPOSED' || p.maturity === 'EXPERT_APPROVED' ? 'EXPERT' : 'PROVISIONAL';
}
const valueOf = (g: CtGovernance, id: string): unknown => { const p = g.parameters.find((x) => x.parameterId === id); return p?.value.status === 'candidate' ? p.value.value : undefined; };
type Rate = { fast: number; typical: number; slow: number };

export function assessC3Quality(session: SessionDraft, stimulus: string, x: C3QualityInput): QualityAssessment {
  const generic = genericCriteria(session, x.estimate);
  const p = ctPrescriptionOf(session);
  if (!p) return assessment([...generic, { id: 'stimulus_coherence', status: 'BLOCKED', basis: 'DERIVED', facts: { stimulus }, reasons: ['prescription_unreadable'] }]);
  const b = (id: string): QualityBasis => ctBasisOf(x.governance, id, x.env);
  const ex = (id: string) => x.catalog.exercise(id);
  const level = session.athleteLevel;
  const criteria: QualityCriterion[] = [...generic];

  // Format ↔ stimulus : appartenance aux formats GOUVERNÉS du stimulus (cohérence interne) ; justesse non démontrée.
  const admissible = (valueOf(x.governance, 'ct.stimulus.admissibleFormats') as Record<string, readonly string[]> | undefined)?.[stimulus];
  const domain = (valueOf(x.governance, 'ct.stimulus.timeDomains') as Record<string, { minS: number; maxS: number }> | undefined)?.[stimulus];
  const blockS = p.format === 'amrap' || p.format === 'continuous' ? p.durationS : p.format === 'emom' ? p.minutes * SECONDS_PER_MINUTE : p.format === 'for_time' ? p.timeCapS ?? 0 : p.rounds * p.workS + Math.max(0, p.rounds - 1) * p.restS;
  criteria.push(admissible !== undefined && !admissible.includes(p.format)
    ? { id: 'stimulus_coherence', status: 'BLOCKED', basis: 'DERIVED', facts: { stimulus, format: p.format, admissibleFormats: [...admissible] }, reasons: ['format_not_admissible_for_stimulus'] }
    : governedCriterion('stimulus_coherence', [b('ct.stimulus.admissibleFormats'), b('ct.stimulus.timeDomains')], {
      stimulus, format: p.format, blockS, timeDomain: domain ? `${String(domain.minS)}-${String(domain.maxS)}s` : 'undecided',
    }, ['format_source:ct.stimulus.admissibleFormats', 'duration_source:ct.dose.construction']));

  // Équilibre des mouvements : faits (régions, patterns, familles) ; redondance = avertissement DÉRIVÉ.
  const es = p.items.map((i) => ex(i.exerciseId));
  const patterns = es.map((e) => e?.patterns.primary ?? 'unknown');
  const families = es.map((e) => e?.family ?? 'unknown');
  const redundant = [...new Set([...patterns.filter((v, i) => patterns.indexOf(v) !== i), ...families.filter((v, i) => families.indexOf(v) !== i)])];
  criteria.push({
    id: 'movement_balance', status: redundant.length > 0 ? 'WARNING' : 'UNRESOLVED', basis: redundant.length > 0 ? 'DERIVED' : 'UNRESOLVED',
    facts: { movements: p.items.map((i) => i.exerciseId), primaryPatterns: patterns, movementTypes: es.map((e) => e?.movementType ?? 'unknown'), redundant },
    reasons: redundant.length > 0 ? ['redundant_pattern_or_family'] : ['no_redundancy', 'no_governed_balance_rule'],
  });

  // Dose : quantités prescrites ; tours / volume total ESTIMÉS (calcul sur débits gouvernés non approuvés).
  const rates = valueOf(x.governance, 'ct.estimation.workRates') as Record<string, { unit: string; rate: Record<string, Rate> }> | undefined;
  const round = (k: keyof Rate): number | undefined => {
    let t = 0;
    for (const it of p.items) {
      const r = rates?.[it.exerciseId];
      const lv = r && r.unit === it.quantity.kind ? r.rate[level] : undefined;
      if (!lv) return undefined;
      t += (it.quantity.value / lv[k]) * SECONDS_PER_MINUTE;
    }
    return t;
  };
  const fast = round('fast');
  const slow = round('slow');
  const roundsRange = p.format === 'amrap' && fast !== undefined && slow !== undefined ? `${(blockS / slow).toFixed(1)}-${(blockS / fast).toFixed(1)}` : 'not_applicable';
  criteria.push(governedCriterion('dose_coherence', [b('ct.dose.construction'), b('ct.estimation.workRates')], {
    quantities: p.items.map((i) => `${i.exerciseId}:${String(i.quantity.value)}${i.quantity.kind}`), estimatedRoundsSlowToFast: roundsRange,
    estimatedRoundS: slow === undefined || fast === undefined ? 'unknown' : `${fast.toFixed(0)}-${slow.toFixed(0)}`,
  }, ['dose_source:ct.dose.construction']));

  // Densité : nature du format (auto-régulée, exacte) ; plafonds gouvernés non approuvés.
  criteria.push(governedCriterion('density_coherence', [b('ct.estimation.workRates'), ...(p.format === 'emom' ? [b('ct.format.emomDensity')] : []), ...(p.format === 'intervals' ? [b('ct.stimulus.workRestRatios')] : [])], {
    format: p.format, density: p.format === 'amrap' || p.format === 'for_time' ? 'self_paced' : 'prescribed',
  }));

  // Répétition : identité EXACTE avec la dernière séance du stimulus (décision tracée) — la variété n'est pas la qualité.
  const repeat = (x.reasons ?? []).some((r) => r.code.endsWith('.C3_REPEAT_UNAVOIDABLE'));
  criteria.push({ id: 'excessive_repetition', status: repeat ? 'WARNING' : 'PASS', basis: 'DERIVED', facts: { identicalToLast: repeat }, reasons: [repeat ? 'identical_to_last_session' : 'not_identical_to_last_session', 'variety_is_not_quality'] });

  // Technicité sous fatigue : faits catalogue ; plafond gouverné non approuvé.
  criteria.push(governedCriterion('technicality_under_fatigue', [b('ct.safety.technicalUnderFatigue')], { maxTechnicalCost: Math.max(0, ...es.map((e) => e?.cost.technical ?? 0)) }));
  return assessment(criteria);
}
