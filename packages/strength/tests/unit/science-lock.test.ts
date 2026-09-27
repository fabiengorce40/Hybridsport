/**
 * Phase 4F — verrou scientifique provisoire (§J) : tests F1–F20. Le ruleset 0.2.0 et le ruleset 4E
 * (PHASE_4E_BASELINE) restent reproductibles ; les corrections 4F sont portées par le ruleset 0.4.0.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { asISODateTime } from '@hybridsport/domain';
import type { SessionDraft, SessionItem, SetPrescription } from '@hybridsport/domain';
import { canonicalStringify } from '@hybridsport/engine';
import {
  assessMeasured, continuityMode, decideLoad, DECLARED_STRENGTH_PARAMETERS, PARAMETER_PROVENANCE, productionReadiness, proposeStrength, readStrengthParams,
  SCIENCE_REGISTRY, scientificGate, scientificLock, validateScienceRegistry,
} from '../../src/index.js';
import type { MeasuredObservation, ScienceRegistry, StrengthTrack } from '../../src/index.js';
import { engineInput, envFor, NOW, run, scenario, strengthCatalog, strengthRuleset } from '../fixtures/harness.js';
import type { Scenario } from '../fixtures/harness.js';
import { GOLDENS } from '../fixtures/goldens.js';
import { goldenOutcome, goldenRecord } from '../fixtures/golden-record.js';
import { candidateScenario, LOCK_RULESET, lockScenario } from '../fixtures/science.js';
import { strengthLockRulesetDocument } from '../fixtures/ruleset.js';

const CATALOG = strengthCatalog();
const P = readStrengthParams(LOCK_RULESET).values;
const RULES = P['strength.prescriptionConfidence'];
if (!RULES) throw new Error('PrescriptionConfidence');
const S = (k: string): Scenario => { const g = GOLDENS[k]; if (!g) throw new Error(k); return g.scenario; };
const ok = (o: ReturnType<typeof run>): SessionDraft => { if (o.result.status !== 'ok') throw new Error(o.result.status); return o.result.value; };
const items = (s: SessionDraft): SessionItem[] => s.blocks.filter((b) => b.kind !== 'warmup' && b.kind !== 'cooldown').flatMap((b) => b.items);
const work = (it: SessionItem): SetPrescription[] => (it.prescription.type === 'sets' ? it.prescription.sets.filter((x) => x.kind !== 'rampup') : []);
const daysAgo = (d: number) => new Date(Date.parse(NOW) - d * 86400000).toISOString().replace('.000', '');
const obs = (value: number, d: number, withRir = true): MeasuredObservation => ({ value, at: daysAgo(d), withRir });
const golden = (dir: string, k: string) => readFileSync(join(import.meta.dirname, `../golden/${dir}/${k}.txt`), 'utf8');
const chest = (s: SessionDraft) => items(s).reduce((a, it) => a + (CATALOG.exercise(it.exerciseId)?.muscles.primary.includes('chest') ? work(it).length : 0), 0);

/** Séances successives (tous les 2 jours) : l'historique et les empreintes de chaque séance nourrissent la suivante. */
function sequence(s0: Scenario, n: number): { sessions: SessionDraft[]; bySlot: Map<string, Set<string>> } {
  const bySlot = new Map<string, Set<string>>();
  const sessions: SessionDraft[] = [];
  let s = s0;
  for (let k = 0; k < n; k++) {
    const at = asISODateTime(daysAgo(-2 * k));
    const o = run({ ...s, now: at });
    const session = ok(o);
    sessions.push(session);
    for (const it of items(session)) { const slot = it.refs?.slotId ?? ''; bySlot.set(slot, (bySlot.get(slot) ?? new Set()).add(it.exerciseId)); }
    const done = items(session).map((it) => ({ exerciseId: it.exerciseId, at, sets: work(it).map(() => ({ reps: 8, rir: 3 })) }));
    s = { ...s, context: { ...s.context, recentExposures: [...(s.context.recentExposures ?? []), ...done] }, history: [...(s.history ?? []), ...(o.fingerprint ? [{ fingerprint: o.fingerprint, at, status: 'completed' as const, repetitionIntents: [] }] : [])] };
  }
  return { sessions, bySlot };
}
const stable = (bySlot: Map<string, Set<string>>, re: RegExp) => [...bySlot].filter(([slot]) => re.test(slot)).every(([, exs]) => exs.size === 1);

describe('baselines (F1, F2, F20)', () => {
  it('F1 — ruleset 0.2.0 inchangé (goldens de base identiques octet pour octet)', () => {
    for (const [k, g] of Object.entries(GOLDENS)) expect(goldenRecord(g.title, g.scenario).text, k).toBe(golden('__goldens__', k));
  });

  it('F2 — PHASE_4E_BASELINE reproductible : le ruleset 4E rejoue les goldens 4E à l’identique', () => {
    for (const [k, g] of Object.entries(GOLDENS)) expect(goldenRecord(g.title, candidateScenario(g.scenario)).text, k).toBe(golden('__goldens_v1__', k));
  });

  // Le bac à sable de Stryker réécrit des sources : l'empreinte n'y a pas de sens (comme les tests d'architecture).
  it.skipIf(process.env.STRENGTH_MUTATION_RUN === '1')('F20 — aucune modification du CORE (empreinte des sources de packages/engine et packages/domain)', async () => {
    const root = join(import.meta.dirname, '../../..');
    const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : []; });
    const digest = ['engine/src', 'domain/src'].flatMap((d) => files(join(root, d))).sort()
      .map((f) => `${createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 16)}  ${f.slice(root.length + 1)}`).join('\n');
    await expect(`${digest}\n`).toMatchFileSnapshot('../architecture/__reports__/core-source-digest.txt');
  });
});

describe('correction 2 — préservation du stimulus (F3–F5)', () => {
  it('F3 — S2 ne subit plus de perte accidentelle majeure du stimulus pectoral', () => {
    const v4e = ok(goldenOutcome(candidateScenario(S('S2'))).outcome);
    const v4f = ok(goldenOutcome(lockScenario(S('S2'))).outcome);
    const v0 = ok(goldenOutcome(S('S2')).outcome);
    expect(chest(v4e)).toBeLessThan(chest(v0));
    expect(chest(v4f)).toBe(chest(v0));
    expect(items(v4f).map((it) => it.exerciseId)).toContain('ex.pec_deck');
  });

  it('F4 — la préservation du stimulus est tracée (SELECT.STIMULUS_PRESERVED) avec l’optionnel retiré', () => {
    const o = goldenOutcome(lockScenario(S('S2')));
    const r = o.reasons.find((x) => x.code === 'SELECT.STIMULUS_PRESERVED');
    expect(r?.params).toMatchObject({ slot: 'up.iso_upper', exerciseId: 'ex.pec_deck', removedSlot: 'up.trunk', removedExerciseId: 'ex.cable_pallof_press', groups: ['chest'] });
    expect(o.reasons.some((x) => x.code === 'SELECT.SLOT_OMITTED' && x.params.slot === 'up.trunk' && x.params.cause === 'stimulus_preservation')).toBe(true);
    expect(o.reasons.some((x) => x.code === 'SELECT.SLOT_OMITTED' && x.params.slot === 'up.iso_upper' && x.params.cause === 'duration')).toBe(false);
  });

  it('F5 — aucun quota musculaire universel : pas d’échange sans perte disproportionnée, ni au prix de la seule couverture d’un groupe', () => {
    // S1 : un 2ᵉ exercice d'isolation haut du corps est omis faute de temps, mais l'échanger contre le mollet
    // retirerait la SEULE couverture des mollets : aucun échange.
    const s1 = goldenOutcome(lockScenario(S('S1')));
    expect(s1.reasons.some((x) => x.code === 'SELECT.SLOT_OMITTED' && x.params.slot === 'fb.iso_upper' && x.params.cause === 'duration')).toBe(true);
    expect(s1.reasons.some((x) => x.code === 'SELECT.STIMULUS_PRESERVED')).toBe(false);
    // Aucun échange dans les autres goldens (la règle n'agit que sur une perte disproportionnée).
    for (const k of ['S3', 'S4', 'S5', 'S6', 'S7']) expect(goldenOutcome(lockScenario(S(k))).reasons.some((x) => x.code === 'SELECT.STIMULUS_PRESERVED'), k).toBe(false);
    // Aucun identifiant de groupe musculaire dans le code du moteur : la règle est générale.
    const src = readFileSync(join(import.meta.dirname, '../../src/engine.ts'), 'utf8');
    for (const g of Object.keys(P['strength.volume'].muscleGroups)) expect(src.includes(`'${g}'`), g).toBe(false);
  });
});

describe('correction 3 — interférence : mécanisme soutenu, ampleur heuristique (F6, F7)', () => {
  it('F6 — MODERATE (RIR + 2) reste explicitement heuristique, dans le registre et dans la trace', () => {
    const split = PARAMETER_PROVENANCE.find((p) => p.parameterId === 'strength.interference.assessment')?.evidenceSplit;
    expect(split).toMatchObject({ mechanism: 'CONTEXT_DEPENDENT', magnitude: 'PROGRAMMING_HEURISTIC' });
    const basis = goldenOutcome(lockScenario(S('S4'))).reasons.filter((r) => r.code === 'PLAN.INTERFERENCE_BASIS');
    expect(basis.find((r) => r.params.action === 'rir_only')?.params).toMatchObject({ level: 'MODERATE', mechanism: 'CONTEXT_DEPENDENT', magnitude: 'PROGRAMMING_HEURISTIC' });
    // Présenter l'ampleur comme soutenue est refusé par la validation du registre.
    const forced: ScienceRegistry = { ...SCIENCE_REGISTRY, parameters: SCIENCE_REGISTRY.parameters.map((p) => (p.parameterId === 'strength.interference.assessment' ? { ...p, status: 'SUPPORTED_WITH_RANGE' } : p)) };
    expect(validateScienceRegistry(forced, DECLARED_STRENGTH_PARAMETERS).map((i) => i.code)).toContain('FALSE_PRECISION');
  });

  it('F7 — modifier un bin temporel ne modifie pas le niveau de preuve déclaré (bins opérationnels, pas biologiques)', () => {
    const a = P['strength.interference.assessment'];
    if (!a) throw new Error('assessment');
    const shifted = strengthRuleset(strengthLockRulesetDocument({}, { 'strength.interference.assessment': { ...a, proximityBands: [{ maxHours: 18, delta: 1 }, { maxHours: 30, delta: 0 }, { maxHours: 60, delta: -1 }] } }));
    const basis = (ruleset = LOCK_RULESET) => goldenOutcome({ ...S('S4'), ruleset }).reasons.filter((r) => r.code === 'PLAN.INTERFERENCE_BASIS').map((r) => [r.params.mechanism, r.params.magnitude]);
    expect(basis(shifted).length).toBeGreaterThan(0);
    for (const b of [...basis(), ...basis(shifted)]) expect(b).toEqual(['CONTEXT_DEPENDENT', 'PROGRAMMING_HEURISTIC']);
  });
});

describe('correction 4 — continuité novice / débutant (F8–F12)', () => {
  const base = (level: 'novice' | 'beginner' | 'intermediate', week = 2) => lockScenario(scenario({ level, archetype: 'str_full_body', stimulus: 'strength_general', minutes: 45, context: { goal: { primary: { goal: 'general' } }, phase: { kind: 'accumulation', weekInMesocycle: week, mesocycleLength: 4 } } }));

  it('F8 — novice : forte continuité (même en début de cycle), chaque emplacement garde son exercice', () => {
    for (const week of [1, 2]) expect(stable(sequence(base('novice', week), 4).bySlot, /^fb\./), `semaine ${String(week)}`).toBe(true);
  });

  it('F9 — débutant : continuité préférée hors début de cycle', () => {
    expect(stable(sequence(base('beginner'), 4).bySlot, /^fb\./)).toBe(true);
    const env = envFor(base('beginner'));
    expect(continuityMode(CATALOG.exercise('ex.goblet_squat') ?? (() => { throw new Error('ex'); })(), env)).toBe('repeat');
  });

  it('F10 — débutant : rotation possible pour une raison explicite (non aimé, stagnation, variation planifiée, début de cycle)', () => {
    const e = CATALOG.exercise('ex.goblet_squat');
    if (!e) throw new Error('ex');
    const b = base('beginner');
    expect(continuityMode(e, envFor({ ...b, context: { ...b.context, preferences: { liked: [], disliked: ['ex.goblet_squat'] } } }))).toBe('avoid');
    const stagnant: StrengthTrack = { trackId: 't.g', tier: 'tracked', exerciseId: 'ex.goblet_squat', archetypeId: 'str_full_body', slotId: 'fb.main_knee', model: 'double_progression', status: 'active', openedAt: asISODateTime(daysAgo(30)), consecutiveSuccess: 0, consecutiveBelow: 0, consecutiveHolds: P['strength.progression'].stagnationHolds };
    expect(continuityMode(e, envFor({ ...b, context: { ...b.context, tracks: [stagnant] } }))).toBe('avoid');
    expect(continuityMode(e, envFor({ ...b, intent: { ...b.intent, plannerNotes: ['planned_variation'] } }))).toBe('rotate');
    expect(continuityMode(e, envFor(base('beginner', 1)))).toBe('rotate');
    // En séance : un exercice non aimé n'est pas reconduit par la continuité.
    const first = sequence(base('beginner'), 1).sessions[0] as SessionDraft;
    const repeated = items(first).find((it) => it.refs?.slotId?.startsWith('fb.push_'))?.exerciseId ?? '';
    const s2 = { ...base('beginner'), context: { ...base('beginner').context, preferences: { liked: [], disliked: [repeated] }, recentExposures: items(first).map((it) => ({ exerciseId: it.exerciseId, at: daysAgo(2), sets: [{ reps: 8, rir: 3 }] })) } };
    expect(items(ok(run(s2))).map((it) => it.exerciseId)).not.toContain(repeated);
  });

  it('F11 — intermédiaire : pas de verrou de continuité (variation contrôlée)', () => {
    const e = CATALOG.exercise('ex.goblet_squat');
    if (!e) throw new Error('ex');
    expect(continuityMode(e, envFor(base('intermediate')))).toBe('rotate');
  });

  it('F12 — progression_anchor reste prioritaire sur l’anti-doublon (ruleset 4F)', () => {
    const s = lockScenario(S('S5'));
    const first = run(s);
    const again = run({ ...s, history: [{ fingerprint: first.fingerprint ?? (() => { throw new Error('fp'); })(), at: asISODateTime(daysAgo(3)), status: 'completed', repetitionIntents: s.intent.repetitionIntents ?? [] }] });
    const dup = again.trace.entries.filter((e) => e.step === 'duplicate').flatMap((e) => e.reasons);
    expect(dup.filter((r) => r.code.startsWith('DUPLICATE.PLANNED')).map((r) => r.params.intent).sort()).toEqual(['progression_anchor:track.rdl', 'progression_anchor:track.squat']);
    expect(items(ok(again)).filter((it) => it.refs?.anchor === 'declared').map((it) => it.exerciseId).sort()).toEqual(['ex.back_squat', 'ex.romanian_deadlift']);
  });
});

describe('PrescriptionConfidence et hiérarchie de charge (F13, F14)', () => {
  it('F13 — HIGH impossible avec des observations incohérentes (deux, ou même quatre sur deux séances)', () => {
    expect(assessMeasured([obs(100, 2), obs(130, 5)], { now: NOW, level: 'advanced', conflict: false }, P, RULES).level).not.toBe('high');
    expect(assessMeasured([obs(100, 2), obs(100, 2), obs(130, 5), obs(131, 5)], { now: NOW, level: 'advanced', conflict: false }, P, RULES).level).not.toBe('high');
    expect(assessMeasured([obs(100, 2), obs(101, 2), obs(100, 5), obs(102, 5)], { now: NOW, level: 'advanced', conflict: false }, P, RULES).level).toBe('high');
  });

  it('F14 — Epley reste un repli : une donnée spécifique récente fiable fait foi (ruleset 4F)', () => {
    const exposures = [
      { exerciseId: 'ex.bench_press', at: daysAgo(3), sets: [{ loadKg: 100, reps: 6, rir: 2 }] },
      { exerciseId: 'ex.bench_press', at: daysAgo(10), sets: [{ loadKg: 110, reps: 8, rir: 1 }, { loadKg: 110, reps: 8, rir: 1 }] },
    ];
    const d = decideLoad(CATALOG.exercise('ex.bench_press') ?? (() => { throw new Error('ex'); })(), 6, 2, envFor(scenario({ archetype: 'str_upper', stimulus: 'strength_volume', ruleset: LOCK_RULESET, context: { recentExposures: exposures } })));
    expect(d.intensity).toMatchObject({ mode: 'load', kg: 100 });
    expect(d.reasons.map((r) => r.code)).toContain('DOSE.LOAD.FROM_SPECIFIC');
  });
});

describe('registre 1.1.0 (F15–F18)', () => {
  it('F15 — un G1 non signé reste bloquant pour la production', () => {
    const r = productionReadiness(SCIENCE_REGISTRY);
    expect(r.blockers.filter((b) => b.code === 'G1_SIGNOFF_MISSING').map((b) => b.subject).sort()).toEqual(['strength.maxEffort.threshold', 'strength.novice.technicalUnderFatigue', 'strength.selection.skillCeiling', 'strength.volume.sessionCap']);
    expect(scientificGate(SCIENCE_REGISTRY, DECLARED_STRENGTH_PARAMETERS).gate).toBe('PASS_PROVISIONAL');
    // Même avec toutes les sources lues en texte intégral et aucune valeur provisoire, un G1 non signé bloque.
    const ideal: ScienceRegistry = { ...SCIENCE_REGISTRY, sources: SCIENCE_REGISTRY.sources.map((s) => ({ ...s, verificationLevel: 'FULL_TEXT_VERIFIED' as const, identityVerification: 'CONFIRMED' as const })), parameters: SCIENCE_REGISTRY.parameters.map((p) => ({ ...p, provisional: false })) };
    expect(productionReadiness(ideal).blockers.map((b) => b.code)).toEqual(['G1_SIGNOFF_MISSING', 'G1_SIGNOFF_MISSING', 'G1_SIGNOFF_MISSING', 'G1_SIGNOFF_MISSING']);
  });

  it('STRENGTH_SCIENTIFIC_LOCK_V1 : LOCKED_PROVISIONAL aujourd’hui ; FAIL si le registre est incohérent ; LOCKED_PRODUCTION impossible sans visas G1', () => {
    expect(scientificLock(SCIENCE_REGISTRY, DECLARED_STRENGTH_PARAMETERS).lock).toBe('LOCKED_PROVISIONAL');
    const broken: ScienceRegistry = { ...SCIENCE_REGISTRY, parameters: SCIENCE_REGISTRY.parameters.slice(1) };
    expect(scientificLock(broken, DECLARED_STRENGTH_PARAMETERS).lock).toBe('FAIL');
    const signed = (p: ScienceRegistry['parameters'][number]) => (p.governance === 'G1' ? { ...p, signoffs: [{ role: 'medical_advisor' as const, name: 'test', date: '2026-09-28', verdict: 'approved' as const, scope: 'safety' as const }] } : p);
    // Sources lues en texte intégral (celles dont des résultats sont extraits ; les autres restent IDENTITY_ONLY et non citées).
    const ideal: ScienceRegistry = { ...SCIENCE_REGISTRY, sources: SCIENCE_REGISTRY.sources.map((s) => (s.findings.length > 0 ? { ...s, verificationLevel: 'FULL_TEXT_VERIFIED' as const, identityVerification: 'CONFIRMED' as const } : s)), parameters: SCIENCE_REGISTRY.parameters.map((p) => ({ ...p, provisional: false })) };
    expect(scientificLock(ideal, DECLARED_STRENGTH_PARAMETERS).lock).toBe('LOCKED_PROVISIONAL');
    expect(scientificLock({ ...ideal, parameters: ideal.parameters.map(signed) }, DECLARED_STRENGTH_PARAMETERS).lock).toBe('LOCKED_PRODUCTION');
  });

  it('F16 — une source ABSTRACT_VERIFIED n’équivaut pas à FULL_TEXT_VERIFIED', () => {
    const at = (level: 'ABSTRACT_VERIFIED' | 'FULL_TEXT_VERIFIED'): ScienceRegistry => ({ ...SCIENCE_REGISTRY, sources: SCIENCE_REGISTRY.sources.map((s) => (s.id === 'SRC.PELLAND_2026' ? { ...s, verificationLevel: level } : s)) });
    const blocked = (r: ScienceRegistry) => productionReadiness(r).blockers.some((b) => b.code === 'SOURCE_NOT_FULL_TEXT' && b.subject === 'SRC.PELLAND_2026');
    expect(blocked(at('ABSTRACT_VERIFIED'))).toBe(true);
    expect(blocked(at('FULL_TEXT_VERIFIED'))).toBe(false);
    // Aucune source n'est présentée comme lue au-delà d'un résumé de recherche.
    for (const s of SCIENCE_REGISTRY.sources) expect(['IDENTITY_ONLY', 'SEARCH_SUMMARY'], s.id).toContain(s.verificationLevel);
  });

  it('F17 — une source IDENTITY_ONLY ne peut pas soutenir seule un statut SUPPORTED', () => {
    const src = SCIENCE_REGISTRY.sources.find((s) => s.id === 'SRC.CURRIER_2023_NMA');
    expect(src?.verificationLevel).toBe('IDENTITY_ONLY');
    const withClaim: ScienceRegistry = { ...SCIENCE_REGISTRY, parameters: SCIENCE_REGISTRY.parameters.map((p) => (p.parameterId === 'strength.topSet' ? { ...p, sourceIds: ['SRC.CURRIER_2023_NMA'], evidenceType: 'network_meta_analysis', claims: [{ id: 'C.X', statement: 'x', status: 'SUPPORTED', sourceIds: ['SRC.CURRIER_2023_NMA'], valueDetermining: false }] } : p)) };
    expect(validateScienceRegistry(withClaim, DECLARED_STRENGTH_PARAMETERS).map((i) => i.code)).toEqual(expect.arrayContaining(['CLAIM_UNSUPPORTED', 'SOURCE_WITHOUT_CONTENT']));
    const principle: ScienceRegistry = { ...SCIENCE_REGISTRY, principles: SCIENCE_REGISTRY.principles.map((p) => (p.id === 'P1.FORCE' ? { ...p, sourceIds: ['SRC.CURRIER_2023_NMA'] } : p)) };
    expect(validateScienceRegistry(principle, DECLARED_STRENGTH_PARAMETERS).map((i) => i.code)).toContain('PRINCIPLE_UNSUPPORTED');
  });

  it('F18 — chaque paramètre actif du ruleset 4F a une provenance et un statut ; registre sans anomalie', () => {
    const r = proposeStrength(engineInput(lockScenario(S('S5'))));
    if (r.status !== 'proposals') throw new Error('S5');
    const used = (r.proposals[0]?.parametersUsed ?? []).map((p) => p.id).filter((id) => id.startsWith('strength.'));
    for (const id of used) {
      const p = SCIENCE_REGISTRY.parameters.find((x) => x.parameterId === id);
      expect(p?.status, id).toBeDefined();
    }
    expect(used.length).toBe(DECLARED_STRENGTH_PARAMETERS.length);
    expect(validateScienceRegistry(SCIENCE_REGISTRY, DECLARED_STRENGTH_PARAMETERS)).toEqual([]);
  });
});

describe('déterminisme (F19)', () => {
  it('F19 — graine + entrées + ruleset identiques ⇒ sortie identique (ruleset 4F)', () => {
    fc.assert(fc.property(fc.constantFrom(...Object.keys(GOLDENS)), fc.string({ minLength: 1, maxLength: 8 }), (k, seed) => {
      const s = lockScenario({ ...S(k), seed });
      const a = run(s);
      const b = run(s);
      expect(canonicalStringify({ r: a.result, t: a.trace.entries, f: a.fingerprint })).toBe(canonicalStringify({ r: b.result, t: b.trace.entries, f: b.fingerprint }));
    }), { seed: 4343, numRuns: 20 });
  });
});
