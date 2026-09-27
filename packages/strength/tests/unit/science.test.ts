/**
 * Ruleset scientifique V1 (phase 4E §K) : tests 1–20, plus propriétés et relations métamorphiques.
 * Chaque test cite son numéro (K1…K20) ; le ruleset 0.2.0 reste la référence de reproductibilité.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { asISODateTime } from '@hybridsport/domain';
import type { SessionDraft, SessionItem, SetPrescription } from '@hybridsport/domain';
import { canonicalStringify } from '@hybridsport/engine';
import {
  anchorReviewDue, assessMeasured, assessNeighborStructure, closureCause, decideLoad, DECLARED_STRENGTH_PARAMETERS, loadKnowledge, loweredStructures,
  assessTransferred, promoteParameter, proposeStrength, readStrengthParams, SCIENCE_REGISTRY, SCIENCE_REGISTRY_VERSION, SCIENCE_RULESET_VERSION, scientificGate, validateScienceRegistry,
} from '../../src/index.js';
import type { MeasuredObservation, ParameterProvenance, ScienceRegistry, StrengthContextInput, StrengthTrack } from '../../src/index.js';
import { engineInput, envFor, NOW, run, scenario, strengthCatalog, strengthRuleset } from '../fixtures/harness.js';
import { GOLDENS } from '../fixtures/goldens.js';
import { goldenOutcome, goldenRecord } from '../fixtures/golden-record.js';
import { CANDIDATE_RULESET, candidateScenario } from '../fixtures/science.js';
import { strengthScientificRulesetDocument } from '../fixtures/ruleset.js';

const CATALOG = strengthCatalog();
const BASELINE = strengthRuleset();
const P = readStrengthParams(CANDIDATE_RULESET).values;
const P0 = readStrengthParams(BASELINE).values;
const RULES = P['strength.prescriptionConfidence'];
if (!RULES) throw new Error('ruleset candidat sans PrescriptionConfidence');
const ex = (id: string) => { const e = CATALOG.exercise(id); if (!e) throw new Error(id); return e; };
const daysAgo = (d: number, h = 8) => new Date(Date.parse(NOW) - d * 86400000 + (h - 8) * 3600000).toISOString().replace('.000', '');
const obs = (value: number, d: number, withRir = true): MeasuredObservation => ({ value, at: daysAgo(d), withRir });
const items = (s: SessionDraft): SessionItem[] => s.blocks.filter((b) => b.kind !== 'warmup' && b.kind !== 'cooldown').flatMap((b) => b.items);
const work = (it: SessionItem): SetPrescription[] => (it.prescription.type === 'sets' ? it.prescription.sets.filter((x) => x.kind !== 'rampup') : []);
const ok = (o: ReturnType<typeof run>): SessionDraft => { if (o.result.status !== 'ok') throw new Error(o.result.status); return o.result.value; };
const codes = (o: ReturnType<typeof goldenOutcome>) => o.reasons.map((r) => r.code);
const NEW_CODES = ['DATA.SCIENCE_REGISTRY', 'DOSE.LOAD.CONFIDENCE', 'DOSE.LOAD.FROM_SPECIFIC', 'PLAN.INTERFERENCE_ASSESSED', 'PLAN.INTERFERENCE_SIGNAL', 'PROGRESSION.REVIEW_DUE'];

describe('registre scientifique : provenance, statuts, G1 (K1–K3)', () => {
  it('K1 — aucun paramètre déclaré sans provenance complète ; aucune anomalie de registre', () => {
    const ids = SCIENCE_REGISTRY.parameters.map((p) => p.parameterId).sort();
    expect(ids).toEqual(DECLARED_STRENGTH_PARAMETERS.map((d) => d.id));
    expect(validateScienceRegistry(SCIENCE_REGISTRY, DECLARED_STRENGTH_PARAMETERS)).toEqual([]);
    // Retirer une provenance ou vider un champ est détecté.
    const missing: ScienceRegistry = { ...SCIENCE_REGISTRY, parameters: SCIENCE_REGISTRY.parameters.slice(1) };
    expect(validateScienceRegistry(missing, DECLARED_STRENGTH_PARAMETERS).map((i) => i.code)).toContain('MISSING_PROVENANCE');
    const empty: ScienceRegistry = { ...SCIENCE_REGISTRY, parameters: SCIENCE_REGISTRY.parameters.map((p, i) => (i === 0 ? { ...p, uncertainty: ' ' } : p)) };
    expect(validateScienceRegistry(empty, DECLARED_STRENGTH_PARAMETERS).map((i) => i.code)).toContain('EMPTY_FIELD');
    const ghost: ScienceRegistry = { ...SCIENCE_REGISTRY, parameters: SCIENCE_REGISTRY.parameters.map((p, i) => (i === 0 ? { ...p, claims: [...p.claims, { id: 'C.X', statement: 'x', status: 'CONTEXT_DEPENDENT', sourceIds: ['SRC.INVENTEE'], valueDetermining: false }], sourceIds: [...p.sourceIds, 'SRC.INVENTEE'] } : p)) };
    expect(validateScienceRegistry(ghost, DECLARED_STRENGTH_PARAMETERS).map((i) => i.code)).toContain('UNKNOWN_SOURCE');
  });

  it('K2 — aucune valeur provisoire présentée comme SUPPORTED ; aucun statut plus fort que la valeur ne le permet', () => {
    for (const p of SCIENCE_REGISTRY.parameters) {
      expect(p.status, p.parameterId).not.toBe('SUPPORTED');
      expect(p.provisional || p.status === 'TECHNICAL', p.parameterId).toBe(true);
    }
    const volume = SCIENCE_REGISTRY.parameters.find((p) => p.parameterId === 'strength.volume') as ParameterProvenance;
    // Le mécanisme (dose–réponse) est soutenu ; forcer la VALEUR en SUPPORTED est refusé.
    const forced: ScienceRegistry = { ...SCIENCE_REGISTRY, parameters: SCIENCE_REGISTRY.parameters.map((p) => (p === volume ? { ...p, status: 'SUPPORTED' } : p)) };
    expect(validateScienceRegistry(forced, DECLARED_STRENGTH_PARAMETERS).map((i) => i.code)).toEqual(expect.arrayContaining(['FALSE_PRECISION', 'PROVISIONAL_AS_SUPPORTED']));
    const ctx: ScienceRegistry = { ...SCIENCE_REGISTRY, parameters: SCIENCE_REGISTRY.parameters.map((p) => (p === volume ? { ...p, status: 'CONTEXT_DEPENDENT' } : p)) };
    expect(validateScienceRegistry(ctx, DECLARED_STRENGTH_PARAMETERS).map((i) => i.code)).toContain('FALSE_PRECISION');
    expect(() => promoteParameter(volume, 'SUPPORTED')).toThrow(/provisoire/);
    // Aucune revendication ne s'appuie sur la source à l'identité partielle et au contenu inconnu.
    const cited = [...SCIENCE_REGISTRY.parameters.flatMap((p) => p.sourceIds), ...SCIENCE_REGISTRY.principles.flatMap((p) => p.sourceIds)];
    expect(cited).not.toContain('SRC.WARMUP_HIGHLOAD');
  });

  it('K3 — un G1 ne peut être promu sans visa de sécurité formel', () => {
    const g1 = SCIENCE_REGISTRY.parameters.filter((p) => p.governance === 'G1');
    expect(g1.map((p) => p.parameterId).sort()).toEqual(['strength.maxEffort.threshold', 'strength.novice.technicalUnderFatigue', 'strength.selection.skillCeiling', 'strength.volume.sessionCap']);
    for (const p of g1) {
      expect(p.status).toBe('SAFETY_SIGNOFF_REQUIRED');
      expect(p.safetySignoffRequired).toBe(true);
      expect(() => promoteParameter(p, 'PRODUCT_GUARDRAIL')).toThrow(/visa de sécurité/);
      const promoted: ScienceRegistry = { ...SCIENCE_REGISTRY, parameters: SCIENCE_REGISTRY.parameters.map((x) => (x === p ? { ...x, status: 'PRODUCT_GUARDRAIL' } : x)) };
      expect(validateScienceRegistry(promoted, DECLARED_STRENGTH_PARAMETERS).map((i) => i.code)).toContain('G1_PROMOTED_WITHOUT_SIGNOFF');
    }
    // Avec un visa formel de sécurité, la promotion devient possible (et reste validée).
    const cap = g1.find((p) => p.parameterId === 'strength.volume.sessionCap') as ParameterProvenance;
    const signed = promoteParameter(cap, 'PRODUCT_GUARDRAIL', [{ role: 'medical_advisor', name: 'Visa fictif de test', date: '2026-09-27', verdict: 'approved', scope: 'safety' }]);
    expect(signed.status).toBe('PRODUCT_GUARDRAIL');
    // Gate : PASS_PROVISIONAL (jamais PASS_PRODUCTION sans visas et lectures intégrales).
    const g = scientificGate(SCIENCE_REGISTRY, DECLARED_STRENGTH_PARAMETERS);
    expect(g.gate).toBe('PASS_PROVISIONAL');
    expect(g.readiness.blockers.map((b) => b.code)).toEqual(expect.arrayContaining(['G1_SIGNOFF_MISSING', 'PROVISIONAL_VALUE', 'SOURCE_NOT_READ']));
  });
});

describe('PrescriptionConfidence ordinale et hiérarchie de charge (K4–K9)', () => {
  const benchScenario = (exposures: StrengthContextInput['recentExposures'], ruleset = CANDIDATE_RULESET) =>
    scenario({ archetype: 'str_upper', stimulus: 'strength_volume', ruleset, context: { recentExposures: exposures } });

  it('K4 — l’e1RM générique (Epley) est un repli : jamais au-dessus d’une donnée spécifique récente fiable', () => {
    const exposures = [
      { exerciseId: 'ex.bench_press', at: daysAgo(3), sets: [{ loadKg: 100, reps: 6, rir: 2 }] },
      { exerciseId: 'ex.bench_press', at: daysAgo(10), sets: [{ loadKg: 110, reps: 8, rir: 1 }, { loadKg: 110, reps: 8, rir: 1 }] },
    ];
    const env = envFor(benchScenario(exposures));
    const d = decideLoad(ex('ex.bench_press'), 6, 2, env);
    expect(d.intensity).toMatchObject({ mode: 'load', kg: 100 });
    expect(d.reasons.map((r) => r.code)).toContain('DOSE.LOAD.FROM_SPECIFIC');
    // Ruleset 0.2.0 : l'e1RM générique (plus élevé) fait foi — preuve que la hiérarchie a changé.
    const legacy = decideLoad(ex('ex.bench_press'), 6, 2, envFor(benchScenario(exposures, BASELINE)));
    expect(legacy.intensity.mode).toBe('percent_of_reference');
    expect(legacy.workingKg ?? 0).toBeGreaterThan(100);
    // Sans observation spécifique (reps trop éloignées), repli tracé sur l'e1RM.
    const fallback = decideLoad(ex('ex.bench_press'), 3, 2, env);
    expect(fallback.reasons.map((r) => r.code)).not.toContain('DOSE.LOAD.FROM_SPECIFIC');
  });

  it('K5 — une donnée ancienne perd de la confiance (frais > vieillissant > ancien > expiré)', () => {
    const at = (d: number) => [obs(100, d), obs(101, d), obs(100, d + 3), obs(102, d + 3)];
    const level = (d: number) => assessMeasured(at(d), { now: NOW, level: 'intermediate', conflict: false }, P, RULES).level;
    expect(level(5)).toBe('high');
    expect(level(60)).toBe('medium');
    expect(level(200)).toBe('low');
    expect(level(400)).toBe('none');
  });

  it('K6 — des observations incohérentes ne sont jamais HIGH', () => {
    const a = assessMeasured([obs(100, 2), obs(100, 2), obs(125, 5), obs(126, 5)], { now: NOW, level: 'advanced', conflict: false }, P, RULES);
    expect(a.factors.consistency).toBe('inconsistent');
    expect(a.level).not.toBe('high');
  });

  it('K7 — deux observations ne garantissent pas HIGH (règle « 1 = medium, 2 = high » abandonnée)', () => {
    expect(assessMeasured([obs(100, 2), obs(100, 5)], { now: NOW, level: 'advanced', conflict: false }, P, RULES).level).toBe('medium');
    // Même avec quatre observations, une seule séance ne suffit pas.
    expect(assessMeasured([obs(100, 2), obs(100, 2), obs(101, 2), obs(100, 2)], { now: NOW, level: 'advanced', conflict: false }, P, RULES).level).toBe('medium');
  });

  it('K8 — un RIR incertain (absent, ou niveau débutant) réduit la confiance', () => {
    const base = [obs(100, 2), obs(101, 2), obs(100, 5), obs(100, 5)];
    expect(assessMeasured(base, { now: NOW, level: 'advanced', conflict: false }, P, RULES).level).toBe('high');
    expect(assessMeasured([...base.slice(1), obs(100, 2, false)], { now: NOW, level: 'advanced', conflict: false }, P, RULES).level).toBe('medium');
    expect(assessMeasured(base, { now: NOW, level: 'beginner', conflict: false }, P, RULES).factors.rir).toBe('uncertain');
    expect(assessMeasured(base, { now: NOW, level: 'beginner', conflict: false }, P, RULES).level).toBe('medium');
    // Conflit avec une capacité déclarée : un cran de moins.
    expect(assessMeasured(base, { now: NOW, level: 'advanced', conflict: true }, P, RULES).level).toBe('medium');
  });

  it('K9 — l’historique spécifique de l’exercice prime sur le transfert (jamais HIGH par transfert)', () => {
    // Même avec une seule série propre, la donnée spécifique de l'exercice fait foi (aucun transfert consulté).
    const env = envFor(benchScenario([{ exerciseId: 'ex.bench_press', at: daysAgo(1), sets: [{ loadKg: 70, reps: 8, rir: 2 }] }]));
    const k = loadKnowledge(ex('ex.bench_press'), env);
    expect(k.source).toBe('measured');
    expect(k.assessment?.factors.transfer).toBe(false);
    // Une donnée transférée d'un exercice équivalent n'est jamais HIGH, même depuis une référence HIGH.
    const peer = assessMeasured([obs(100, 2), obs(101, 2), obs(100, 5), obs(100, 5)], { now: NOW, level: 'advanced', conflict: false }, P, RULES);
    expect(peer.level).toBe('high');
    for (const penalty of [0, 1]) {
      const t = assessTransferred(peer, penalty);
      expect(t.level).not.toBe('high');
      expect(t.factors.transfer).toBe(true);
    }
  });
});

describe('ancres, anti-doublon, interférence (K10–K14)', () => {
  const track = (o: Partial<StrengthTrack> = {}): StrengthTrack => ({ trackId: 't.sq', tier: 'anchor', exerciseId: 'ex.back_squat', archetypeId: 'str_lower', slotId: 'lo.main_knee', model: 'autoregulated', status: 'active', openedAt: asISODateTime(daysAgo(140)), consecutiveSuccess: 1, consecutiveBelow: 0, consecutiveHolds: 0, ...o });
  const base = { now: NOW, mesocycleEnded: false, stagnant: false, inadmissible: false, level: 'intermediate' as const };

  it('K10 — une ancre n’est pas tournée seulement à cause du nombre de semaines (horizon de revue)', () => {
    expect(closureCause(track(), base, P0)).toBe('max_weeks');
    expect(closureCause(track(), base, P)).toBeUndefined();
    const review = anchorReviewDue(track(), base, P);
    expect(review.due).toBe(true);
    expect(review.reasons.map((r) => r.code)).toEqual(['PROGRESSION.REVIEW_DUE']);
    expect(anchorReviewDue(track({ openedAt: asISODateTime(daysAgo(10)) }), base, P).due).toBe(false);
    // Les raisons traçables restent des causes de clôture.
    expect(closureCause(track(), { ...base, stagnant: true }, P)).toBe('stagnation');
    expect(closureCause(track(), { ...base, level: 'advanced', mesocycleEnded: true }, P)).toBe('mesocycle_end');
  });

  it('K11 — l’anti-doublon respecte progression_anchor : la répétition déclarée des ancres n’est pas un doublon accidentel', () => {
    const s = candidateScenario(GOLDENS.S5?.scenario ?? (() => { throw new Error('S5'); })());
    const first = run(s);
    const fp = first.fingerprint;
    if (!fp) throw new Error('empreinte');
    const again = run({ ...s, history: [{ fingerprint: fp, at: asISODateTime(daysAgo(3)), status: 'completed', repetitionIntents: s.intent.repetitionIntents ?? [] }] });
    const session = ok(again);
    const dup = again.trace.entries.filter((e) => e.step === 'duplicate').flatMap((e) => e.reasons);
    // Les ancres déclarées sont reconnues comme répétitions PLANIFIÉES (ici stagnantes : mêmes marqueurs),
    // jamais comme doublon accidentel ; la séance reste valide et garde ses ancres.
    expect(dup.filter((r) => r.code.startsWith('DUPLICATE.PLANNED')).map((r) => r.params.intent).sort()).toEqual(['progression_anchor:track.rdl', 'progression_anchor:track.squat']);
    expect(again.trace.entries.filter((e) => e.step === 'validate').at(-1)?.decision).toBe('VALID');
    const main = items(session).filter((it) => it.refs?.anchor === 'declared').map((it) => it.exerciseId).sort();
    expect(main).toEqual(['ex.back_squat', 'ex.romanian_deadlift']);
    // Comportement du CORE inchangé par le ruleset V1 (même classification qu'en 0.2.0).
    const legacy = GOLDENS.S5?.scenario;
    if (legacy) {
      const l1 = run(legacy);
      const l2 = run({ ...legacy, history: [{ fingerprint: l1.fingerprint ?? fp, at: asISODateTime(daysAgo(3)), status: 'completed', repetitionIntents: legacy.intent.repetitionIntents ?? [] }] });
      expect(l2.duplicate?.classification).toBe(again.duplicate?.classification);
    }
  });

  const neighbor = (hours: number, o: Partial<StrengthContextInput['week']['neighbors'][number]> = {}) => ({ discipline: 'running' as const, stimulus: 'run_intervals_vo2', priority: 'key' as const, hoursFromThisSession: hours, demand: { lower_knee: 'high' as const }, ...o });
  const A = P['strength.interference.assessment'];
  if (!A) throw new Error('assessment');

  it('K12 — 36 h n’est plus une frontière binaire (35 h et 37 h : même évaluation ; 0.2.0 : bascule)', () => {
    expect(assessNeighborStructure(neighbor(35), 'lower_knee', A)).toBe(assessNeighborStructure(neighbor(37), 'lower_knee', A));
    const inter = (h: number, ruleset = CANDIDATE_RULESET) => loweredStructures(engineInput(scenario({ ruleset, context: { week: { otherStrengthSessions: [], neighbors: [neighbor(h)], known: true } } })), readStrengthParams(ruleset).values);
    expect(inter(35, BASELINE).lowered.has('lower_knee')).toBe(true);
    expect(inter(37, BASELINE).lowered.has('lower_knee')).toBe(false);
    expect(inter(35).rirOnly.has('lower_knee')).toBe(inter(37).rirOnly.has('lower_knee'));
    // Large fenêtre de recherche : une voisine à 60 h est encore évaluée (LOW, trace seulement).
    expect(inter(60).assessments.map((a) => a.level)).toEqual(['LOW']);
  });

  it('K13 — endurance facile ≠ intervalles clés', () => {
    const easy = assessNeighborStructure(neighbor(20, { stimulus: 'run_easy', priority: 'standard', demand: { lower_knee: 'low' } }), 'lower_knee', A);
    const key = assessNeighborStructure(neighbor(20, { demand: { lower_knee: 'high', locomotor_impact: 'high' } }), 'lower_knee', A);
    expect(easy).toBe('NONE');
    expect(key).toBe('VERY_HIGH');
    expect(assessNeighborStructure(neighbor(20), 'lower_knee', A)).toBe('HIGH');
  });

  it('K14 — le recouvrement structurel change l’évaluation : signal au planificateur seulement si la séance sollicite la structure', () => {
    const week = { otherStrengthSessions: [], neighbors: [neighbor(8, { demand: { lower_knee: 'high', locomotor_impact: 'high' } })], known: true };
    const signal = (archetype: string, stimulus: string) => {
      const r = proposeStrength(engineInput(scenario({ archetype, stimulus, ruleset: CANDIDATE_RULESET, context: { week } })));
      return r.status === 'proposals' ? (r.proposals[0]?.reasons ?? []).filter((x) => x.code === 'PLAN.INTERFERENCE_SIGNAL') : [];
    };
    expect(signal('str_upper', 'strength_volume')).toEqual([]);
    const lower = signal('str_full_body', 'strength_general');
    expect(lower.length).toBe(1);
    expect(lower[0]?.params).toMatchObject({ structure: 'lower_knee', level: 'VERY_HIGH' });
  });
});

describe('priorités de durée, novice, déterminisme, versions (K15–K20)', () => {
  const S = (k: string) => { const g = GOLDENS[k]; if (!g) throw new Error(k); return g.scenario; };

  it('K15 — un accessoire optionnel est retiré avant qu’un repos principal ne soit réduit', () => {
    const o = goldenOutcome(candidateScenario(S('S6')));
    const s = ok(o.outcome);
    const main = items(s).find((it) => it.refs?.slotId?.startsWith('fb.main_'));
    const cell = P['strength.dose.base'].general?.primary?.compound_high_load;
    if (!main || !cell) throw new Error('S6');
    // technical-constant: milieu de la plage de repos (profil de test)
    expect(work(main).every((x) => x.restAfterS === (cell.restS.min + cell.restS.max) / 2)).toBe(true);
    expect(o.reasons.some((r) => r.code === 'SELECT.SLOT_OMITTED' && r.params.cause === 'duration' && String(r.params.slot).startsWith('fb.'))).toBe(true);
    // 0.2.0 : le repos du principal était réduit au minimum en même temps que les autres.
    const legacy = ok(goldenOutcome(S('S6')).outcome);
    const legacyMain = items(legacy).find((it) => it.refs?.slotId?.startsWith('fb.main_'));
    expect(work(legacyMain as SessionItem).every((x) => x.restAfterS === cell.restS.min)).toBe(true);
  });

  it('K16 — le retour au calme peut disparaître sous contrainte de durée (et reste présent quand le temps le permet)', () => {
    const tight = goldenOutcome(candidateScenario(S('S6')));
    expect(ok(tight.outcome).blocks.some((b) => b.kind === 'cooldown')).toBe(false);
    expect(tight.reasons.some((r) => r.code === 'SELECT.SLOT_OMITTED' && r.params.slot === 'i.cooldown')).toBe(true);
    const roomy = goldenOutcome(candidateScenario(S('S5')));
    expect(ok(roomy.outcome).blocks.some((b) => b.kind === 'cooldown')).toBe(true);
  });

  it('K17 — la montée spécifique lourde reste prioritaire sous contrainte de durée', () => {
    const s5 = S('S5');
    // technical-constant: 50 minutes disponibles, marge de 360 s (profil de test)
    const short = { ...s5, intent: { ...s5.intent, availableTimeS: 3000, targetDurationS: 2640 } };
    const o = goldenOutcome(candidateScenario(short));
    const session = ok(o.outcome);
    const squat = items(session).find((it) => it.exerciseId === 'ex.back_squat');
    const ramp = squat?.prescription.type === 'sets' ? squat.prescription.sets.filter((x) => x.kind === 'rampup') : [];
    expect(ramp.length).toBeGreaterThanOrEqual(3);
    expect(o.reasons.some((r) => r.code === 'SELECT.SLOT_OMITTED' && r.params.cause === 'duration')).toBe(true);
    // Charge suggérée (confiance MEDIUM) : la montée spécifique garde plusieurs paliers.
    const rdl = items(ok(goldenOutcome(candidateScenario(s5)).outcome)).find((it) => it.exerciseId === 'ex.romanian_deadlift');
    expect(rdl?.prescription.type === 'sets' ? rdl.prescription.sets.filter((x) => x.kind === 'rampup').length : 0).toBeGreaterThanOrEqual(2);
  });

  it('K18 — novice : pas de variété artificielle (même exercice par emplacement ; alternance A/B systématique des groupes de choix ; ancres répétées)', () => {
    const s0 = candidateScenario(scenario({ level: 'novice', archetype: 'str_full_body', stimulus: 'strength_general', minutes: 45, context: { goal: { primary: { goal: 'general' } } } }));
    const bySlot = new Map<string, Set<string>>();
    let s = s0;
    const mains: string[] = [];
    for (let k = 0; k < 4; k++) {
      const o = run({ ...s, now: asISODateTime(daysAgo(-2 * k)) });
      const session = ok(o);
      for (const it of items(session)) { const slot = it.refs?.slotId ?? ''; bySlot.set(slot, (bySlot.get(slot) ?? new Set()).add(it.exerciseId)); }
      mains.push(items(session).find((it) => it.refs?.slotId?.startsWith('fb.main_'))?.exerciseId ?? '');
      const done = items(session).map((it) => ({ exerciseId: it.exerciseId, at: daysAgo(-2 * k), sets: work(it).map(() => ({ reps: 8, rir: 3 })) }));
      s = { ...s, context: { ...s.context, recentExposures: [...(s.context.recentExposures ?? []), ...done] }, history: [...(s.history ?? []), ...(o.fingerprint ? [{ fingerprint: o.fingerprint, at: asISODateTime(daysAgo(-2 * k)), status: 'completed' as const, repetitionIntents: [] }] : [])] };
    }
    // Aucun emplacement principal ou secondaire ne change d'exercice d'une séance à l'autre.
    for (const [slot, exs] of bySlot) if (/^fb\.(main_|push_|pull_)/.test(slot)) expect(exs.size, slot).toBe(1);
    // Alternance A/B/A/B (systématique, jamais aléatoire).
    expect(mains[0]).toBe(mains[2]);
    expect(mains[1]).toBe(mains[3]);
    // Une ancre déclarée revient à chaque séance.
    const track: StrengthTrack = { trackId: 't.nov', tier: 'anchor', exerciseId: 'ex.goblet_squat', archetypeId: 'str_full_body', slotId: 'fb.main_knee', model: 'linear_load', status: 'active', openedAt: asISODateTime(daysAgo(7)), consecutiveSuccess: 0, consecutiveBelow: 0, consecutiveHolds: 0 };
    const anchored = { ...s0, intent: { ...s0.intent, repetitionIntents: [{ kind: 'progression_anchor' as const, trackId: 't.nov' }] }, context: { ...s0.context, tracks: [track] } };
    for (const k of [0, 1, 2]) expect(items(ok(run({ ...anchored, now: asISODateTime(daysAgo(-2 * k)) }))).map((it) => it.exerciseId)).toContain('ex.goblet_squat');
  });

  it('K19 — déterminisme : même entrée ⇒ même séance, octet pour octet (graines et durées aléatoires)', () => {
    fc.assert(fc.property(fc.constantFrom(...Object.keys(GOLDENS)), fc.string({ minLength: 1, maxLength: 8 }), (k, seed) => {
      const s = candidateScenario({ ...S(k), seed });
      expect(canonicalStringify(goldenRecord(k, s).json)).toBe(canonicalStringify(goldenRecord(k, s).json));
    }), { seed: 4242, numRuns: 20 });
  });

  it('K20 — l’ancien ruleset reste reproductible par version : goldens 0.2.0 identiques, aucune politique 4E active', () => {
    for (const [k, g] of Object.entries(GOLDENS)) {
      const r = goldenRecord(g.title, g.scenario);
      expect(r.text, k).toBe(readFileSync(join(import.meta.dirname, `../golden/__goldens__/${k}.txt`), 'utf8'));
      const o = goldenOutcome(g.scenario);
      for (const c of NEW_CODES) expect(codes(o), `${k} ${c}`).not.toContain(c);
    }
    // Versions tracées : ruleset, moteur, registre, graine.
    const cand = proposeStrength(engineInput(candidateScenario(S('S5'))));
    const old = proposeStrength(engineInput(S('S5')));
    if (cand.status !== 'proposals' || old.status !== 'proposals') throw new Error('S5');
    const pc = cand.proposals[0];
    const po = old.proposals[0];
    expect(pc?.provenance).toMatchObject({ rulesetVersion: SCIENCE_RULESET_VERSION, engineVersion: '0.2.0' });
    expect(po?.provenance.rulesetVersion).toBe('0.2.0-strength-test');
    expect(pc?.reasons.find((r) => r.code === 'DATA.SCIENCE_REGISTRY')?.params).toEqual({ version: SCIENCE_REGISTRY_VERSION });
    expect(pc?.parametersUsed.map((p) => p.id)).toContain('strength.science.registryVersion');
    expect(po?.parametersUsed.map((p) => p.id)).not.toContain('strength.science.registryVersion');
    expect(pc?.provenance.seed).toBe(po?.provenance.seed);
  });
});

describe('propriétés et relations métamorphiques (4E §K)', () => {
  const levels = ['none', 'low', 'moderate', 'high'] as const;
  const L = ['NONE', 'LOW', 'MODERATE', 'HIGH', 'VERY_HIGH'];
  const A = P['strength.interference.assessment'];
  if (!A) throw new Error('assessment');
  const arb = fc.record({ h: fc.integer({ min: -72, max: 72 }), d: fc.constantFrom(...levels), pr: fc.constantFrom('key' as const, 'standard' as const, 'optional' as const), imp: fc.constantFrom(...levels) });
  const n = (x: { h: number; d: (typeof levels)[number]; pr: 'key' | 'standard' | 'optional'; imp: (typeof levels)[number] }) => ({ discipline: 'running' as const, stimulus: 's', priority: x.pr, hoursFromThisSession: x.h, demand: { lower_knee: x.d, locomotor_impact: x.imp } });

  it('interférence monotone : plus proche, plus exigeante ou plus importante ⇒ jamais un niveau plus faible', () => {
    fc.assert(fc.property(arb, (x) => {
      const lv = L.indexOf(assessNeighborStructure(n(x), 'lower_knee', A));
      const closer = { ...x, h: Math.trunc(x.h / (1 + 1)) };
      expect(L.indexOf(assessNeighborStructure(n(closer), 'lower_knee', A))).toBeGreaterThanOrEqual(lv);
      const di = levels.indexOf(x.d);
      if (di < levels.length - 1) expect(L.indexOf(assessNeighborStructure(n({ ...x, d: levels[di + 1] ?? x.d }), 'lower_knee', A))).toBeGreaterThanOrEqual(lv);
      expect(L.indexOf(assessNeighborStructure(n({ ...x, pr: 'key' }), 'lower_knee', A))).toBeGreaterThanOrEqual(lv);
      // Symétrie avant / après la séance.
      expect(assessNeighborStructure(n({ ...x, h: -x.h }), 'lower_knee', A)).toBe(assessNeighborStructure(n(x), 'lower_knee', A));
    }), { seed: 7, numRuns: 300 });
  });

  it('confiance : ajouter une observation incohérente ou retirer le RIR ne l’augmente jamais ; l’ordre des observations est sans effet', () => {
    const order = ['none', 'low', 'medium', 'high'];
    fc.assert(fc.property(fc.array(fc.record({ v: fc.integer({ min: 90, max: 110 }), d: fc.integer({ min: 0, max: 120 }), r: fc.boolean() }), { minLength: 1, maxLength: 8 }), fc.constantFrom('intermediate' as const, 'advanced' as const), (xs, level) => {
      const o = xs.map((x) => obs(x.v, x.d, x.r));
      const a = order.indexOf(assessMeasured(o, { now: NOW, level, conflict: false }, P, RULES).level);
      expect(order.indexOf(assessMeasured([...o, obs(200, 1)], { now: NOW, level, conflict: false }, P, RULES).level)).toBeLessThanOrEqual(Math.max(a, order.indexOf('medium')));
      expect(order.indexOf(assessMeasured(o.map((y) => ({ ...y, withRir: false })), { now: NOW, level, conflict: false }, P, RULES).level)).toBeLessThanOrEqual(a);
      expect(assessMeasured([...o].reverse(), { now: NOW, level, conflict: false }, P, RULES)).toEqual(assessMeasured(o, { now: NOW, level, conflict: false }, P, RULES));
    }), { seed: 11, numRuns: 200 });
  });

  it('politiques 4E retirées une à une : chaque paramètre facultatif absent restaure le comportement 0.2.0 de son domaine', () => {
    const S = (k: string) => { const g = GOLDENS[k]; if (!g) throw new Error(k); return g.scenario; };
    const without = strengthRuleset(strengthScientificRulesetDocument({}, { 'strength.session.durationPriority': null }));
    const s6 = ok(run({ ...S('S6'), ruleset: without }));
    expect(s6.blocks.some((b) => b.kind === 'warmup')).toBe(true);
    const legacy = ok(run(S('S6')));
    expect(s6.blocks.find((b) => b.kind === 'warmup')?.items[0]?.prescription).toEqual(legacy.blocks.find((b) => b.kind === 'warmup')?.items[0]?.prescription);
  });
});
