/**
 * Contrôles propres à la musculation (spec strength 06 §20), EXÉCUTÉS PAR LE CORE (validateur et
 * réparation, via SportEngine.checks) : le moteur ne s'auto-valide pas. Chaque contrôle a sa fiche de
 * règle dans le ruleset ; les seuils viennent du ruleset.
 * STR-V1 (couverture des emplacements requis) est garanti par construction et par un test de propriété :
 * la séance ne porte pas l'archétype, le CORE ne peut donc pas le revérifier. STR-V8 (séries de référence
 * maximales répétées) est sans objet en V1 : le moteur ne prescrit aucune série de référence maximale.
 */
import type { Exercise, SessionDraft, SetPrescription, Violation } from '@hybridsport/domain';
import type { SessionCheck } from '@hybridsport/engine';
import { readStrengthParam } from './params.js';
import { strengthReasons } from './codes.js';
import { levelIndex } from './util.js';

const V = '1.0.0';
export const STRENGTH_RULES = {
  sessionCap: { id: 'strength.v2.session_cap', version: V },
  intensity: { id: 'strength.v3.intensity_coherence', version: V },
  rampup: { id: 'strength.v4.rampup_placement', version: V },
  loadMode: { id: 'strength.v5.load_mode', version: V },
  noviceTechnical: { id: 'strength.v6.novice_technical', version: V },
  maxEffort: { id: 'strength.v7.max_effort', version: V },
} as const;

type Rule = (typeof STRENGTH_RULES)[keyof typeof STRENGTH_RULES];
const violation = (rule: Rule, nature: Violation['nature'], id: string, detail: string): Violation => ({
  ruleId: rule.id, ruleVersion: rule.version, nature, level: 'hard', target: { kind: 'exercise', id },
  reason: strengthReasons.emit('RULE.VIOLATION', { ruleId: rule.id, detail }),
});
const items = (s: SessionDraft) => s.blocks.flatMap((b) => b.items.map((it) => ({ block: b, it })));
const setsOf = (p: SessionDraft['blocks'][number]['items'][number]['prescription']): readonly SetPrescription[] => (p.type === 'sets' ? p.sets : []);
const repsMax = (r: SetPrescription['reps']): number => (typeof r === 'number' ? r : r.max);

const sessionCap: SessionCheck = {
  rule: STRENGTH_RULES.sessionCap, layer: 'A1', nature: 'SAFETY',
  evaluate: ({ session, ctx, catalog, ruleset }) => {
    const vol = readStrengthParam(ruleset, 'strength.volume');
    const cap = readStrengthParam(ruleset, 'strength.volume.sessionCap')[ctx.athleteLevel];
    const per: Record<string, number> = {};
    for (const { it } of items(session)) {
      const e = catalog.exercise(it.exerciseId);
      if (!e) continue;
      const w = setsOf(it.prescription).filter((s) => s.kind !== 'rampup' && s.optional !== true).length;
      for (const [g, muscles] of Object.entries(vol.muscleGroups)) {
        if (muscles.some((m) => e.muscles.primary.includes(m))) per[g] = (per[g] ?? 0) + w;
        else if (muscles.some((m) => e.muscles.secondary.includes(m))) per[g] = (per[g] ?? 0) + w * vol.secondaryWeight;
      }
    }
    return { violations: Object.entries(per).filter(([, v]) => v > cap).sort().map(([g, v]) => violation(STRENGTH_RULES.sessionCap, 'SAFETY', session.id, `${g}: ${String(v)} > ${String(cap)}`)), repairs: [] };
  },
};

const intensity: SessionCheck = {
  rule: STRENGTH_RULES.intensity, layer: 'A4', nature: 'TECHNICAL',
  evaluate: ({ session, ruleset }) => {
    const table = readStrengthParam(ruleset, 'strength.load').pctByRepsToFailure;
    const out: Violation[] = [];
    for (const { it } of items(session)) for (const s of setsOf(it.prescription)) {
      if (s.intensity?.mode !== 'percent_of_reference') continue;
      const rir = s.intensity.effort && 'rir' in s.intensity.effort ? s.intensity.effort.rir : 0;
      const max = table[String(Math.round(repsMax(s.reps) + rir))];
      if (max === undefined || s.intensity.fraction > max) out.push(violation(STRENGTH_RULES.intensity, 'TECHNICAL', it.id, `${String(repsMax(s.reps))} reps à ${String(s.intensity.fraction)} incohérent`));
    }
    return { violations: out, repairs: [] };
  },
};

const rampup: SessionCheck = {
  rule: STRENGTH_RULES.rampup, layer: 'A3', nature: 'PROGRAMMING_HEURISTIC',
  evaluate: ({ session, catalog }) => {
    const out: Violation[] = [];
    for (const { it } of items(session)) {
      const sets = setsOf(it.prescription);
      const e = catalog.exercise(it.exerciseId);
      const ramps = sets.filter((s) => s.kind === 'rampup');
      if (ramps.length === 0 || !e) continue;
      if (!e.compound) out.push(violation(STRENGTH_RULES.rampup, 'PROGRAMMING_HEURISTIC', it.id, 'montée en charge sur un exercice d’isolation'));
      const firstWork = sets.findIndex((s) => s.kind !== 'rampup');
      if (firstWork >= 0 && sets.slice(firstWork).some((s) => s.kind === 'rampup')) out.push(violation(STRENGTH_RULES.rampup, 'PROGRAMMING_HEURISTIC', it.id, 'montée en charge après une série de travail'));
      const work = sets[firstWork]?.intensity;
      const workKg = work?.mode === 'load' ? work.kg : work?.mode === 'percent_of_reference' ? work.kgRounded : undefined;
      if (workKg !== undefined && ramps.some((r) => r.intensity?.mode === 'load' && r.intensity.kg >= workKg)) out.push(violation(STRENGTH_RULES.rampup, 'PROGRAMMING_HEURISTIC', it.id, 'montée en charge ≥ charge de travail'));
    }
    return { violations: out, repairs: [] };
  },
};

const loadMode: SessionCheck = {
  rule: STRENGTH_RULES.loadMode, layer: 'A4', nature: 'TECHNICAL',
  evaluate: ({ session, catalog }) => {
    const out: Violation[] = [];
    for (const { it } of items(session)) {
      const e = catalog.exercise(it.exerciseId);
      if (!e) continue;
      for (const s of setsOf(it.prescription)) {
        const m = s.intensity?.mode;
        if ((m === 'load' || m === 'percent_of_reference' || m === 'relative_to_working') && !e.loadable) out.push(violation(STRENGTH_RULES.loadMode, 'TECHNICAL', it.id, `charge prescrite sur un exercice non chargeable (${e.id})`));
      }
    }
    return { violations: out, repairs: [] };
  },
};

const noviceTechnical: SessionCheck = {
  rule: STRENGTH_RULES.noviceTechnical, layer: 'A1', nature: 'SAFETY',
  evaluate: ({ session, ctx, catalog, ruleset }) => {
    const p = readStrengthParam(ruleset, 'strength.novice.technicalUnderFatigue');
    if (!p.levels.includes(ctx.athleteLevel)) return { violations: [], repairs: [] };
    const technical = items(session).filter(({ it }) => (catalog.exercise(it.exerciseId)?.cost.technical ?? 0) >= p.minTechnical);
    const out: Violation[] = [];
    if (technical.length > p.maxPerSession) out.push(violation(STRENGTH_RULES.noviceTechnical, 'SAFETY', session.id, `${String(technical.length)} exercices techniques > ${String(p.maxPerSession)}`));
    for (const { block, it } of technical) if (block.role !== 'primary') out.push(violation(STRENGTH_RULES.noviceTechnical, 'SAFETY', it.id, 'exercice technique hors du travail principal (sous fatigue)'));
    return { violations: out, repairs: [] };
  },
};

const maxEffort: SessionCheck = {
  rule: STRENGTH_RULES.maxEffort, layer: 'A1', nature: 'SAFETY',
  evaluate: ({ session, ctx, catalog, ruleset }) => {
    const threshold = readStrengthParam(ruleset, 'strength.maxEffort.threshold');
    const eligible = (e: Exercise) => e.maxEffortEligibility !== undefined && levelIndex(ctx.athleteLevel) >= levelIndex(e.maxEffortEligibility.minLevel);
    const out: Violation[] = [];
    for (const { it } of items(session)) {
      const e = catalog.exercise(it.exerciseId);
      if (!e) continue;
      const heavy = setsOf(it.prescription).some((s) => s.kind === 'top_set' || (s.intensity?.mode === 'percent_of_reference' && s.intensity.fraction >= threshold));
      if (heavy && !eligible(e)) out.push(violation(STRENGTH_RULES.maxEffort, 'SAFETY', it.id, `effort maximal non éligible (${e.id})`));
    }
    return { violations: out, repairs: [] };
  },
};

export const STRENGTH_CHECKS: readonly SessionCheck[] = [sessionCap, intensity, rampup, loadMode, noviceTechnical, maxEffort];
