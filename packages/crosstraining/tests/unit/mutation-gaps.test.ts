/**
 * C1 — lacunes de comportement révélées par la mutation (Stryker, passe 1). Chaque test fixe un comportement
 * qui n'était vérifié par aucun autre : dépendances déclarées par capacité, approbation exacte, déduplication des
 * raisons, précision des traces de refus, contrat de charge et d'items, codes exposés à l'utilisateur.
 */
import { describe, expect, it } from 'vitest';
import {
  CT_CAPABILITIES, CT_CAPABILITY_IDS, CT_CODES, CT_FOUNDATION_DEFINITION, CT_REASON_CODES, CURRENT_CT_GOVERNANCE, archetypeIdOf, capabilityState,
  createCrossTrainingEngine, formatAdmissibility, parseCrossTrainingContext, registryIssues, resultIssues, stimulusFromArchetypeId,
} from '../../src/index.js';
import type { CtGovernance, CtParameter } from '../../src/index.js';
import { ctx, ctxInput, fullyValuedGovernance, realized, withCandidate } from '../fixtures.js';

const codes = (xs: readonly { code: string }[]) => xs.map((x) => x.code);

describe('dépendances déclarées par capacité (table relue)', () => {
  it('décisions, politiques G1 et dépendances techniques de chaque capacité et du socle', () => {
    const table = Object.fromEntries(CT_CAPABILITY_IDS.map((id) => [id, { d: CT_CAPABILITIES[id].decisions, g: CT_CAPABILITIES[id].g1Policies, t: CT_CAPABILITIES[id].technical }]));
    expect(table).toEqual({
      ctReplayHold: { d: ['CT-D15'], g: ['CT-G1-PAIN'], t: ['CT_CONTENT'] },
      ctBootstrapExposure: { d: ['CT-D4'], g: ['CT-G1-NOVICE', 'CT-G1-EXERTIONAL'], t: ['CT_CONTENT'] },
      ctCalibratedDose: { d: ['CT-D1', 'CT-D2', 'CT-D3', 'CT-D6', 'CT-D8'], g: [], t: ['CT_CONTENT'] },
      ctProgression: { d: ['CT-D5'], g: [], t: ['CT_CONTENT'] },
      ctFirstExposure: { d: ['CT-D1', 'CT-D4', 'CT-D6', 'CT-G1'], g: ['CT-G1-NOVICE', 'CT-G1-EXERTIONAL'], t: ['CT_CONTENT'] },
      ctLoadedMovements: { d: ['CT-D12'], g: [], t: ['CORE_EXT_C1', 'CT_CONTENT'] },
      ctTechnicalMovements: { d: ['CT-D7', 'CT-D13'], g: ['CT-G1-NOVICE'], t: ['CT_CONTENT'] },
      ctIntensityTargets: { d: ['CT-D9'], g: [], t: ['CORE_EXT_C1'] },
      ctBenchmarks: { d: ['CT-D14'], g: [], t: ['CT_CONTENT'] },
      ctWeeklyComposition: { d: ['CT-D10'], g: [], t: ['CT_CONTENT'] },
      ctHybridPlanning: { d: ['CT-D11'], g: [], t: ['GLOBAL_PLANNER'] },
      ctSessionComposition: { d: ['CT-D1', 'CT-D2', 'CT-D7', 'CT-D15', 'CT-D16'], g: ['CT-G1-PAIN', 'CT-G1-NOVICE', 'CT-G1-EXERTIONAL'], t: ['CT_CONTENT'] },
    });
    // Socle C2 : ni taxonomie (CT-D1) ni plafonds de volume (CT-D6) ; ils vivent dans les capacités qui en ont besoin.
    expect(CT_FOUNDATION_DEFINITION).toMatchObject({ parameters: ['ct.safety.novicePolicy', 'ct.return.protocol', 'ct.safety.novelEccentricVolume'], decisions: ['CT-G1'], g1Policies: ['CT-G1-PAIN', 'CT-G1-NOVICE', 'CT-G1-RETURN', 'CT-G1-EXERTIONAL'], technical: ['CT_CONTENT'] });
  });

  it('chaque dépendance déclarée bloque à elle seule sa capacité (décision en PRODUCTION, G1 et technique dans les deux modes)', () => {
    const full = fullyValuedGovernance();
    for (const id of CT_CAPABILITY_IDS) {
      const def = CT_CAPABILITIES[id];
      for (const d of def.decisions) {
        const g: CtGovernance = { ...full, decisions: { ...full.decisions, [d]: 'PENDING' } };
        expect(capabilityState(id, g, 'PRODUCTION', true).blockers, `${id}/${d}`).toEqual([d]);
        expect(capabilityState(id, g, 'CANDIDATE', true).enabled).toBe(true);
      }
      for (const p of def.g1Policies) {
        const g: CtGovernance = { ...full, g1Policies: { ...full.g1Policies, [p]: 'UNSIGNED' } };
        const s = capabilityState(id, g, 'CANDIDATE', true);
        expect(s.blockers, `${id}/${p}`).toEqual([p]);
        expect(s.reasons[0]?.params).toMatchObject({ cause: 'G1_UNSIGNED' });
        expect(s.reasons.at(-1)).toMatchObject({ code: CT_CODES.G1_POLICY_UNSIGNED, params: { policyId: p } });
      }
      for (const t of def.technical) {
        const g: CtGovernance = { ...full, technical: { ...full.technical, [t]: 'UNSATISFIED' } };
        const s = capabilityState(id, g, 'CANDIDATE', true);
        expect(s.blockers, `${id}/${t}`).toEqual([t]);
        expect(s.reasons.at(-1)).toMatchObject({ code: CT_CODES.TECHNICAL_DEPENDENCY, params: { dependencyId: t } });
      }
    }
  });
});

describe('intégrité et résolution', () => {
  const base = CURRENT_CT_GOVERNANCE.parameters[0] as CtParameter;
  it('une approbation d’un AUTRE état ne vaut pas approbation de la maturité déclarée', () => {
    const p: CtParameter = { ...withCandidate(base), maturity: 'EXPERT_APPROVED', approvals: [{ state: 'PRODUCT_APPROVED', role: 'r', reference: 'x' }] };
    expect(registryIssues([p])).toEqual([`${base.parameterId} : maturité EXPERT_APPROVED sans approbation`]);
    expect(registryIssues([{ ...p, approvals: [{ state: 'EXPERT_APPROVED', role: 'r', reference: 'x' }] }])).toEqual([]);
  });

  it('identifiants ancrés : préfixe ct. et décision CT-Dn / CT-G1 exacts', () => {
    for (const parameterId of ['xct.a', 'ct.a!', 'ct.']) expect(registryIssues([{ ...base, parameterId }]), parameterId).toHaveLength(1);
    for (const decisionId of ['XCT-D1', 'CT-D1x', 'CT-D123', 'CT-G2']) expect(registryIssues([{ ...base, decisionId }]), decisionId).toHaveLength(1);
  });

  it('gouvernance au schéma invalide : chemin et message de chaque anomalie', () => {
    const issues = createIssues({ ...CURRENT_CT_GOVERNANCE, rulesetLocked: 'non' });
    expect(issues).toMatch(/Gouvernance Cross-training invalide : rulesetLocked : /);
  });

  it('plusieurs anomalies sont toutes listées, séparées par « ; »', () => {
    const dup = CURRENT_CT_GOVERNANCE.parameters.slice(0, 2);
    expect(createIssues({ ...CURRENT_CT_GOVERNANCE, parameters: [...CURRENT_CT_GOVERNANCE.parameters, ...dup] })).toBe(
      `Gouvernance Cross-training invalide : ${String(dup[0]?.parameterId)} : identifiant dupliqué ; ${String(dup[1]?.parameterId)} : identifiant dupliqué`,
    );
  });

  it('admissibilité non résolue : trace exacte (aucune raison « illisible » ajoutée à une absence de valeur)', () => {
    const r = formatAdmissibility('threshold', 'emom', CURRENT_CT_GOVERNANCE, 'CANDIDATE');
    expect(codes(r.reasons)).toEqual([CT_CODES.FORMAT_ADMISSIBILITY_UNRESOLVED, CT_CODES.UNRESOLVED_PARAMETER]);
  });
});

function createIssues(governance: unknown): string {
  try {
    createCrossTrainingEngine({ governance: governance as CtGovernance });
    return 'aucune erreur';
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

describe('moteur : raisons dédupliquées, socle actif sans trace de blocage', () => {
  const input = (discipline: ReturnType<typeof ctx>) => ({
    intent: { archetypeId: archetypeIdOf('threshold') }, discipline,
    ruleset: { version: '1.0.0' }, catalog: { version: '1.0.0' }, context: { seed: 's', now: '2026-10-05T08:00:00Z', engineVersion: '0.1.0' },
  }) as unknown as Parameters<ReturnType<typeof createCrossTrainingEngine>['propose']>[0];

  it('un même paramètre bloquant plusieurs capacités n’est rapporté qu’une fois', () => {
    const r = createCrossTrainingEngine().propose(input(ctx()));
    if (r.status !== 'no_valid_proposal') throw new Error('proposition');
    const keys = r.reasons.map((x) => JSON.stringify([x.code, x.params]));
    expect(new Set(keys).size).toBe(keys.length);
    // ct.stimulus.catalog bloque le calibrage ET la première exposition par stimulus : une seule raison.
    expect(r.reasons.filter((x) => x.code === CT_CODES.UNRESOLVED_PARAMETER && x.params.parameterId === 'ct.stimulus.catalog')).toHaveLength(1);
    // Les listes de paramètres sont conservées telles quelles.
    expect(r.reasons.find((x) => x.code === CT_CODES.DOSE_SOURCE_UNAVAILABLE)?.params.capabilities).toEqual(['ctReplayHold', 'ctBootstrapExposure', 'ctCalibratedDose', 'ctFirstExposure']);
  });

  it('valeurs candidates partout, tout décidé et signé (simulation) : seul PRESCRIPTION_NOT_IMPLEMENTED (le socle actif n’ajoute rien)', () => {
    const full = fullyValuedGovernance();
    const g: CtGovernance = { ...full, rulesetLocked: false, parameters: CURRENT_CT_GOVERNANCE.parameters.map((p) => withCandidate(p)) };
    const r = createCrossTrainingEngine({ governance: g, simulation: true }).propose(input(ctx()));
    if (r.status !== 'no_valid_proposal') throw new Error('proposition');
    expect(codes(r.reasons)).toEqual([CT_CODES.PRESCRIPTION_NOT_IMPLEMENTED]);
  });
});

describe('contrat de contexte : précisions', () => {
  const bad = (o: Record<string, unknown>) => {
    const r = parseCrossTrainingContext(ctxInput({ sessionHistory: [realized(o)] as never }));
    return r.ok ? [] : r.reasons.map((x) => `${String(x.params.path)} : ${String(x.params.problem)}`);
  };
  const item = { exerciseId: 'e', quantity: { kind: 'reps', value: 5 } };

  it('chaque type de quantité, chaque format et chaque type de résultat cohérent est ACCEPTÉ par le parseur', () => {
    for (const quantity of [{ kind: 'reps', value: 5 }, { kind: 'calories', value: 12 }, { kind: 'distance_m', value: 250 }, { kind: 'duration_s', value: 30 }]) {
      expect(bad({ prescription: { format: 'amrap', durationS: 600, items: [{ exerciseId: 'e', quantity }] } }), quantity.kind).toEqual([]);
    }
    const pairs: [Record<string, unknown>, Record<string, unknown>][] = [
      [{ format: 'for_time', rounds: 3, timeCapS: 600, items: [item] }, { kind: 'time', completionS: 540 }],
      [{ format: 'for_time', rounds: 3, timeCapS: 600, items: [item] }, { kind: 'capped', repsCompleted: 40 }],
      [{ format: 'amrap', durationS: 600, items: [item] }, { kind: 'rounds_reps', rounds: 4, reps: 2 }],
      [{ format: 'emom', minutes: 10, items: [item] }, { kind: 'emom', minutesCompleted: 9 }],
      [{ format: 'intervals', rounds: 6, workS: 40, restS: 20, items: [item] }, { kind: 'intervals', intervalsCompleted: 6 }],
      [{ format: 'continuous', durationS: 1200, items: [item] }, { kind: 'total', calories: 250 }],
      [{ format: 'continuous', durationS: 1200, items: [item] }, { kind: 'total', distanceM: 4000 }],
      [{ format: 'continuous', durationS: 1200, items: [item] }, { kind: 'total', durationS: 1200 }],
    ];
    // « Tel que prescrit » exige une mesure qui le prouve : capped ⇒ jamais ; continu ⇒ durée réalisée requise.
    const completionOf = (p: Record<string, unknown>, r: Record<string, unknown>) => (r.kind === 'capped' || (p.format === 'continuous' && r.durationS === undefined) || (p.format === 'emom' && Number(r.minutesCompleted) < Number(p.minutes)) ? 'completed' : 'completed_as_prescribed');
    for (const [prescription, result] of pairs) expect(bad({ prescription, result, completion: completionOf(prescription, result) }), `${String(prescription.format)}/${String(result.kind)}`).toEqual([]);
  });

  it('chaque format exige au moins un item', () => {
    const empty = [
      { format: 'for_time', rounds: 1, items: [] }, { format: 'amrap', durationS: 60, items: [] }, { format: 'emom', minutes: 5, items: [] },
      { format: 'intervals', rounds: 2, workS: 30, restS: 30, items: [] }, { format: 'continuous', durationS: 60, items: [] },
    ];
    for (const prescription of empty) expect(bad({ prescription, result: { kind: 'abandoned' }, completion: 'abandoned' }), prescription.format).toHaveLength(1);
    expect(bad({ prescription: { format: 'emom', minutes: 5, items: [item, item] }, result: { kind: 'emom', minutesCompleted: 5 } })).toEqual([]);
  });

  it('charge prescrite : seule la forme external_kg positive est acceptée ; variante prescrite acceptée', () => {
    const withItem = (it: unknown) => bad({ prescription: { format: 'amrap', durationS: 600, items: [it] } });
    expect(withItem({ ...item, load: { kind: 'external_kg', value: 9 } })).toEqual([]);
    expect(withItem({ ...item, variantOf: 'ex.pull_up' })).toEqual([]);
    expect(withItem({ ...item, load: { kind: 'percent_e1rm', value: 0.5 } })).toHaveLength(1);
    expect(withItem({ ...item, load: { kind: 'external_kg', value: 0 } })).toHaveLength(1);
    expect(withItem({ ...item, load: {} }).length).toBeGreaterThan(0);
  });

  it('messages des contrôles : instant ISO ; nombre non fini refusé', () => {
    expect(bad({ completedAt: 'hier' })).toEqual(['disciplineContext.sessionHistory.0.completedAt : instant ISO attendu']);
    expect(bad({ prescription: { format: 'amrap', durationS: Number.POSITIVE_INFINITY, items: [item] } }).join()).toMatch(/received Infinity/);
  });

  it('résultat « capped » hors for_time : une seule incohérence (le format), jamais « sans time cap »', () => {
    expect(resultIssues({ format: 'emom', minutes: 5, items: [{ exerciseId: 'e', quantity: { kind: 'reps', value: 5 } }] }, { kind: 'capped', repsCompleted: 3 })).toEqual(['résultat capped incompatible avec le format emom']);
  });
});

describe('codes et correspondance d’archétype', () => {
  it('identifiant d’archétype exact, aller et retour', () => {
    expect(archetypeIdOf('threshold')).toBe('crosstraining.threshold');
    expect(stimulusFromArchetypeId('crosstraining.threshold')).toBe('threshold');
    expect(stimulusFromArchetypeId('threshold')).toBeUndefined();
  });

  it('audience et sévérité des codes (seuls les refus lisibles par l’utilisateur sont « user »)', () => {
    const table = Object.fromEntries(CT_REASON_CODES.map((d) => [d.code, `${d.audience}/${d.severity}/${d.categories.join('+')}`]));
    expect(table).toEqual({
      [CT_CODES.UNRESOLVED_PARAMETER]: 'internal/error/technical+business_hard',
      [CT_CODES.CANDIDATE_VALUE_USED]: 'internal/warning/information',
      [CT_CODES.CAPABILITY_DISABLED]: 'internal/notice/feasibility+information',
      [CT_CODES.G1_POLICY_UNSIGNED]: 'internal/error/safety',
      [CT_CODES.TECHNICAL_DEPENDENCY]: 'internal/error/technical',
      [CT_CODES.HYBRID_PLANNER_UNAVAILABLE]: 'user/error/feasibility',
      [CT_CODES.ARCHETYPE_UNKNOWN]: 'internal/error/technical',
      [CT_CODES.DOSE_SOURCE_UNAVAILABLE]: 'user/error/feasibility',
      [CT_CODES.PRESCRIPTION_NOT_IMPLEMENTED]: 'internal/info/information',
      [CT_CODES.SIMULATION_REQUIRED]: 'internal/error/business_hard',
      [CT_CODES.MOVEMENT_LOAD_UNREPRESENTABLE]: 'internal/error/feasibility',
      [CT_CODES.FORMAT_ADMISSIBILITY_UNRESOLVED]: 'internal/error/business_hard',
      [CT_CODES.RETURN_NOT_SUPPORTED]: 'user/error/safety',
      [CT_CODES.BOOTSTRAP_UNAVAILABLE]: 'user/error/feasibility',
      [CT_CODES.MOVEMENT_INELIGIBLE]: 'user/error/safety+feasibility',
      [CT_CODES.REPLAY_SOURCE_INADMISSIBLE]: 'user/error/feasibility',
      [CT_CODES.VOLUME_GUARD_REQUIRED]: 'internal/error/safety',
      [CT_CODES.C2_PROPOSED]: 'internal/info/information',
      [CT_CODES.C2_MODIFIED_BY_CORE]: 'internal/error/business_hard',
      [CT_CODES.C3_INTENT]: 'internal/info/information',
      [CT_CODES.C3_STIMULUS_OUT_OF_SCOPE]: 'user/error/feasibility',
      [CT_CODES.C3_PARAMETER_UNREADABLE]: 'internal/error/technical+business_hard',
      [CT_CODES.C3_STRUCTURE]: 'internal/info/information',
      [CT_CODES.C3_BLOCK_NOT_GENERATED]: 'internal/notice/information',
      [CT_CODES.C3_STRUCTURE_UNAVAILABLE]: 'user/error/feasibility',
      [CT_CODES.C3_HISTORY]: 'internal/info/information',
      [CT_CODES.C3_HISTORY_NEGATIVE]: 'internal/notice/safety',
      [CT_CODES.C3_NEIGHBOURS]: 'internal/info/information',
      [CT_CODES.C3_FORMAT_REJECTED]: 'internal/notice/information',
      [CT_CODES.C3_NO_FORMAT]: 'user/error/feasibility',
      [CT_CODES.C3_FORMAT_CHOSEN]: 'internal/info/information',
      [CT_CODES.C3_CANDIDATES_REJECTED]: 'internal/info/information',
      [CT_CODES.C3_MOVEMENT_SELECTED]: 'internal/info/information',
      [CT_CODES.C3_DOSE]: 'internal/info/information',
      [CT_CODES.C3_DURATION]: 'internal/info/information',
      [CT_CODES.C3_DENSITY]: 'internal/info/information',
      [CT_CODES.C3_REPEAT_UNAVOIDABLE]: 'internal/notice/information',
      [CT_CODES.C3_PROPOSED]: 'internal/info/information',
    });
  });
});
