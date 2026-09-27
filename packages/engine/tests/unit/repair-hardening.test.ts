/**
 * Phase 3.5 — durcissement du RepairEngine (spec 09 §2).
 * Les contrôles « de discipline » ci-dessous sont des sondes de test (extraChecks) qui provoquent
 * volontairement des cycles, des chaînes de réparations et des suggestions malveillantes.
 */
import { describe, expect, it } from 'vitest';
import type { RepairAction, SessionDraft, SessionDraftInput } from '@hybridsport/domain';
import { canonicalStringify, createCoreRegistry, repairSession, validateSession } from '../../src/index.js';
import type { SessionCheck, ValidationContext, ValidatorDeps } from '../../src/index.js';
import { baseContext, deps, presetEquipment } from '../fixtures/context.js';
import { testCatalog, testRuleset } from '../fixtures/load.js';
import { param, rule, testRulesetDocument } from '../fixtures/ruleset.js';
import { session, strengthSessionInput } from '../fixtures/sessions.js';

const reasons = createCoreRegistry();
const opts = { seed: 'repair-hardening' };
const exercisesOf = (s: SessionDraft) => s.blocks.flatMap((b) => b.items.map((i) => i.exerciseId));
const base = strengthSessionInput();

/** Ruleset de test enrichi des fiches des sondes, avec un plafond de tentatives au choix. */
function probeDeps(checks: SessionCheck[], maxAttempts?: number): ValidatorDeps {
  const doc = testRulesetDocument();
  const parameters = maxAttempts === undefined ? doc.parameters
    : doc.parameters.map((p) => (p.id === 'core.repair.maxAttemptsPerSession' ? param('core.repair.maxAttemptsPerSession', maxAttempts, 'G4') : p));
  const rules = [...doc.rules, ...checks.map((c) => rule(c.rule.id, { nature: 'PROGRAMMING_HEURISTIC', category: 'structure' }))];
  return { catalog: testCatalog(), ruleset: testRuleset({ ...doc, parameters, rules }), engineVersion: deps().engineVersion, extraChecks: checks };
}

/** Sonde : l'exercice `from` est refusé (HARD) et la sonde suggère `repair` pour l'item concerné. */
function probe(id: string, from: string, repair: (itemId: string) => RepairAction | undefined): SessionCheck {
  return {
    rule: { id, version: '1.0.0' }, layer: 'A3', nature: 'PROGRAMMING_HEURISTIC',
    evaluate: ({ session: s }) => {
      const hits = s.blocks.flatMap((b) => b.items).filter((i) => i.exerciseId === from);
      return {
        violations: hits.map((i) => ({ ruleId: id, ruleVersion: '1.0.0', nature: 'PROGRAMMING_HEURISTIC' as const, level: 'hard' as const, target: { kind: 'exercise' as const, id: i.id }, reason: reasons.emit('RULE.VIOLATION', { ruleId: id, detail: from }) })),
        repairs: hits.flatMap((i) => { const r = repair(i.id); return r ? [r] : []; }),
      };
    },
  };
}
const replaceBy = (to: string) => (itemId: string): RepairAction => ({ kind: 'replace_exercise', itemId, candidates: [to] });

describe('RepairEngine — boucles, cycles et bornes', () => {
  it('une réparation qui recrée une violation DIFFÉRENTE est revalidée et réparée à son tour', () => {
    // row → pulldown (sonde 1) ; pulldown → machine_row (sonde 2) : deux violations successives distinctes.
    const d = probeDeps([probe('probe.a', 'ex.db_row', replaceBy('ex.lat_pulldown')), probe('probe.b', 'ex.lat_pulldown', replaceBy('ex.machine_row'))]);
    const out = repairSession(session(), baseContext(), d, opts);
    expect(out.result.status).toBe('ok');
    if (out.result.status === 'ok') expect(exercisesOf(out.result.value)).toContain('ex.machine_row');
    expect(out.attempts).toBe(2);
    const validations = out.trace.entries.filter((e) => e.step === 'validate').map((e) => e.decision);
    expect(validations).toEqual(['INVALID', 'INVALID', 'VALID']);
  });

  it('cycle A → B → A : détecté par l’ensemble des états visités, arrêt explicite NO_VALID_SOLUTION', () => {
    const d = probeDeps([probe('probe.a', 'ex.db_row', replaceBy('ex.machine_row')), probe('probe.b', 'ex.machine_row', replaceBy('ex.db_row'))], 10);
    const out = repairSession(session(), baseContext(), d, opts);
    expect(out.result.status === 'error' && out.result.error.code).toBe('NO_VALID_SOLUTION');
    // A (invalide) → B (invalide) → A déjà visité : arrêt sans épuiser les 10 tentatives.
    expect(out.trace.entries.filter((e) => e.step === 'validate')).toHaveLength(2);
    expect(out.attempts).toBe(2);
  });

  it('état déjà visité : une réparation sans effet n’est pas retentée en boucle', () => {
    // Candidat vide : l'action ne change rien ⇒ état identique ⇒ arrêt immédiat.
    const d = probeDeps([probe('probe.noop', 'ex.db_row', (itemId) => ({ kind: 'replace_exercise', itemId, candidates: [] }))], 10);
    const out = repairSession(session(), baseContext(), d, opts);
    expect(out.result.status === 'error' && out.result.error.code).toBe('NO_VALID_SOLUTION');
    expect(out.trace.entries.filter((e) => e.step === 'validate')).toHaveLength(1);
  });

  it('plafond de tentatives : chaîne d’états tous invalides ⇒ REPAIR_EXHAUSTED après exactement N tentatives', () => {
    const chain = ['ex.db_row', 'ex.machine_row', 'ex.seated_cable_row', 'ex.lat_pulldown', 'ex.pull_up'];
    const checks = chain.slice(0, -1).map((from, i) => probe(`probe.c${i}`, from, replaceBy(chain[i + 1]!)));
    checks.push(probe('probe.end', 'ex.pull_up', replaceBy('ex.band_assisted_pull_up')));
    const d = probeDeps(checks, 3);
    const out = repairSession(session(), baseContext(), d, opts);
    expect(out.result.status === 'error' && out.result.error.code).toBe('REPAIR_EXHAUSTED');
    expect(out.attempts).toBe(3);
    expect(out.result.status === 'error' && out.result.error.reasons[0]?.code).toBe('REPAIR.EXHAUSTED');
    expect(out.trace.entries.filter((e) => e.step === 'validate')).toHaveLength(4); // proposition + 3 réparations
  });

  it('aucune réparation disponible ⇒ NO_VALID_SOLUTION (et non REPAIR_EXHAUSTED), aucune tentative comptée', () => {
    for (const max of [1, 3]) {
      const d = probeDeps([probe('probe.none', 'ex.db_row', () => undefined)], max);
      const out = repairSession(session(), baseContext(), d, opts);
      expect(out.result.status === 'error' && out.result.error.code).toBe('NO_VALID_SOLUTION');
      expect(out.attempts).toBe(0);
    }
  });

  it('violation HARD impossible à réparer (jour indisponible) ⇒ erreur explicite, jamais publiée', () => {
    const out = repairSession(session(), baseContext({ dayAvailable: false }), deps(), opts);
    expect(out.result.status).toBe('error');
    if (out.result.status === 'error') {
      expect(out.result.error.code).toBe('NO_VALID_SOLUTION');
      expect(out.result.error.reasons.map((r) => r.code)).toContain('FEASIBILITY.DAY_UNAVAILABLE');
    }
  });

  it('régénération : au plus une fois, puis revalidée ; le temps disponible de la proposition est imposé', () => {
    const d = probeDeps([probe('probe.none', 'ex.db_row', () => undefined)]);
    const calls: string[][] = [];
    const regenerated = session(strengthSessionInput({ id: 'session.regen', availableTimeS: 9999, targetDurationS: 9000, blocks: [base.blocks[0]!, base.blocks[1]!] }));
    const out = repairSession(session(), baseContext(), d, { ...opts, regenerate: (ex) => { calls.push([...ex]); return regenerated; } });
    expect(calls).toHaveLength(1);
    expect(out.result.status).toBe('ok');
    if (out.result.status === 'ok') {
      expect(out.result.value.id).toBe('session.regen');
      expect(out.result.value.availableTimeS).toBe(2100); // jamais plus de temps que ce que l'athlète a
      expect(out.result.value.targetDurationS).toBe(1740);
    }
  });
});

describe('RepairEngine — actions restantes', () => {
  it('drop_block (règle de discipline) : le bloc visé est retiré puis la séance revalidée', () => {
    const d = probeDeps([probe('probe.drop', 'ex.cable_fly', () => ({ kind: 'drop_block', blockId: 'b.acc' }))]);
    const out = repairSession(session(), baseContext(), d, opts);
    expect(out.result.status).toBe('ok');
    if (out.result.status === 'ok') expect(out.result.value.blocks.map((b) => b.id)).toEqual(['b.warmup', 'b.main']);
  });

  it('reduce_sets / reduce_rest sans règle de discipline : aucun effet, arrêt explicite (jamais de boucle)', () => {
    const d = probeDeps([probe('probe.sets', 'ex.db_row', (itemId) => ({ kind: 'reduce_sets', itemId, minSets: 1 }))], 5);
    const out = repairSession(session(), baseContext(), d, opts);
    expect(out.result.status === 'error' && out.result.error.code).toBe('NO_VALID_SOLUTION');
  });

  it('régénération qui ne propose rien ⇒ NO_VALID_SOLUTION, une seule tentative comptée', () => {
    const d = probeDeps([probe('probe.none', 'ex.db_row', () => undefined)], 3);
    const out = repairSession(session(), baseContext(), d, { ...opts, regenerate: () => null });
    expect(out.result.status === 'error' && out.result.error.code).toBe('NO_VALID_SOLUTION');
    expect(out.attempts).toBe(1);
  });
});

describe('RepairEngine — ce que la réparation ne peut jamais faire', () => {
  it('une action inconnue (ex. « lever une restriction ») est sans effet : restriction maintenue, échec explicite', () => {
    const malicious = probe('probe.evil', 'ex.db_row', () => ({ kind: 'remove_restriction', restriction: 'no_overhead' }) as unknown as RepairAction);
    const ctx = baseContext({ restrictions: ['no_overhead'] });
    const snapshot = canonicalStringify(ctx);
    const out = repairSession(session(), ctx, probeDeps([malicious], 5), opts);
    expect(out.result.status).toBe('error');
    expect(canonicalStringify(ctx)).toBe(snapshot);
  });

  it('une suggestion vers un exercice nécessitant du matériel absent est rejetée à la revalidation', () => {
    // La sonde propose un exercice à la barre alors que seuls des haltères sont disponibles.
    const d = probeDeps([probe('probe.bad', 'ex.db_row', replaceBy('ex.seated_cable_row'))]);
    const ctx = baseContext({ availableEquipment: presetEquipment('preset.dumbbells_only') });
    const out = repairSession(session(), ctx, d, opts);
    if (out.result.status === 'ok') {
      expect(exercisesOf(out.result.value)).not.toContain('ex.seated_cable_row');
      expect(validateSession(out.result.value, ctx, d).report.status).not.toBe('INVALID');
    }
    const decisions = out.trace.entries.filter((e) => e.step === 'validate');
    expect(decisions.length).toBeGreaterThan(1);
  });

  it('une réparation qui exigerait plus de temps que disponible n’est jamais acceptée (temps invariant)', () => {
    // Remplacer par un exercice plus long ne peut pas « allonger » le temps disponible.
    const long: SessionDraftInput = strengthSessionInput({ availableTimeS: 1500, targetDurationS: 1200 });
    const out = repairSession(session(long), baseContext(), deps(), opts);
    if (out.result.status === 'ok') {
      expect(out.result.value.availableTimeS).toBe(1500);
      expect(validateSession(out.result.value, baseContext(), deps()).report.errors).toEqual([]);
    } else {
      expect(out.result.status).toBe('error');
    }
  });

  it('le contexte (restrictions, matériel, exclusions) n’est jamais modifié par la réparation', () => {
    const ctx: ValidationContext = Object.freeze(baseContext({ restrictions: Object.freeze(['no_overhead']) as unknown as string[], excludedExercises: Object.freeze(['ex.cable_fly']) as unknown as string[] }));
    const snapshot = canonicalStringify(ctx);
    const out = repairSession(session(), ctx, deps(), opts);
    expect(canonicalStringify(ctx)).toBe(snapshot);
    if (out.result.status === 'ok') expect(exercisesOf(out.result.value)).not.toContain('ex.cable_fly');
  });
});

describe('RepairEngine — régressions nommées et issues', () => {
  it('RÉGRESSION lot 12 — la réparation ne vide jamais la séance (tous les items retirés)', () => {
    // Tous les exercices sont exclus et sans substitut : l'issue n'est jamais une séance vide « valide ».
    const all = exercisesOf(session());
    const ctx = baseContext({ excludedExercises: [...all, 'ex.db_bench_press', 'ex.machine_chest_press', 'ex.push_up', 'ex.incline_push_up', 'ex.seated_cable_row', 'ex.machine_row', 'ex.lat_pulldown'] });
    const out = repairSession(session(), ctx, deps(), opts);
    expect(out.result.status).not.toBe('ok');
    if (out.result.status === 'ok') expect(out.result.value.blocks.length).toBeGreaterThan(0);
  });

  it('RÉGRESSION lot 14 — la réparation ne retire jamais la dernière partie principale (séance « échauffement seul »)', () => {
    const ctx = baseContext({ areaRestrictions: [{ area: 'shoulder', action: 'exclude', painLevel: 'P2' }] });
    const out = repairSession(session(), ctx, deps(), opts);
    expect(out.result.status).toBe('rest_recommended');
    // Et quelle que soit l'issue, aucune séance publiée sans bloc principal.
    if (out.result.status === 'ok') expect(out.result.value.blocks.some((b) => b.role === 'primary')).toBe(true);
  });

  it('séance sans travail principal : refusée par le validateur, jamais « réparée » en séance valide', () => {
    const warmOnly = session(strengthSessionInput({ blocks: [base.blocks[0]!] }));
    const v = validateSession(warmOnly, baseContext(), deps());
    expect(v.report.status).toBe('INVALID');
    expect(v.report.errors.some((e) => e.nature === 'TECHNICAL')).toBe(true);
    const out = repairSession(warmOnly, baseContext(), deps(), opts);
    expect(out.result.status === 'error' && out.result.error.code).toBe('NO_VALID_SOLUTION');
  });

  it('convergence vers REST_RECOMMENDED : cause tracée, trace cohérente avec le résultat', () => {
    const ctx = baseContext({ areaRestrictions: [{ area: 'shoulder', action: 'exclude', painLevel: 'P2' }] });
    const out = repairSession(session(), ctx, deps(), opts);
    expect(out.result.status).toBe('rest_recommended');
    if (out.result.status === 'rest_recommended') {
      expect(out.result.reasons[0]).toMatchObject({ code: 'REPAIR.REST_RECOMMENDED', params: { cause: 'SAFETY.PAIN.ZONE_RESTRICTED' } });
      expect(out.result.trace.traceId).toBe(out.trace.traceId);
    }
  });

  it('convergence vers NO_VALID_SOLUTION : jamais REST_RECOMMENDED pour une violation non liée à la douleur', () => {
    const out = repairSession(session(), baseContext({ dayAvailable: false }), deps(), opts);
    expect(out.result.status).toBe('error');
    const custom = repairSession(session(), baseContext({ dayAvailable: false }), deps(), { ...opts, restIsValid: () => true });
    expect(custom.result.status).toBe('rest_recommended');
  });

  it('plusieurs réparations admissibles : résultat déterministe et indépendant de l’ordre des listes du contexte', () => {
    const ctxA = baseContext({ availableEquipment: presetEquipment('preset.dumbbells_only') });
    const ctxB = baseContext({ availableEquipment: [...presetEquipment('preset.dumbbells_only')].reverse() });
    const a = repairSession(session(), ctxA, deps(), opts);
    const b = repairSession(session(), ctxA, deps(), opts);
    const c = repairSession(session(), ctxB, deps(), opts);
    expect(canonicalStringify(a)).toBe(canonicalStringify(b));
    expect(a.result.status).toBe('ok');
    if (a.result.status === 'ok' && c.result.status === 'ok') expect(canonicalStringify(c.result.value)).toBe(canonicalStringify(a.result.value));
  });
});
