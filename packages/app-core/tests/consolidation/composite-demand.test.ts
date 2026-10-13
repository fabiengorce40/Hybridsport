/**
 * Revue R1 — demande COMPOSITE d'une séance Cross-training portant un bloc de force délégué (règle TEST_ONLY
 * `planner.crosstraining.compositeDemand.test-0`) : normalisation par discipline, absence de double comptage, refus
 * quand une table manque, PRODUCTION non concernée, aucune règle ⇒ comportement antérieur, Beta 0 seule porteuse.
 */
import { describe, expect, it } from 'vitest';
import { DEMAND_NORMALIZATION_PARAMETER, deriveDemandProfile, deriveSessionDemand } from '@hybridsport/engine';
import type { LoadedRuleset } from '@hybridsport/engine';
import type { SessionDraft } from '@hybridsport/domain';
import { compositeDemandOf, demandOf } from '@hybridsport/planner';
import { appPlannerEnvironment, beta0Environment, BETA0_CT_COMPOSITE_DEMAND, buildPorts, portInputs, selectProgrammeSession } from '../../src/index.js';
import { create, massProfile } from '../strength-fixes/sf-fixtures.js';

const env = beta0Environment();
const ct = env.crosstraining?.content;
if (!ct) throw new Error('contenu Cross-training absent');
const content = ct;
const state = create({ ...massProfile({ preset: 'preset.commercial_gym' }), crosstraining: { enabled: true, sessionsPerWeek: 1, intent: 'crosstraining.strength_plus_conditioning', returnState: 'NONE' } } as never);
const session = selectProgrammeSession(state, '2026-10-05.crosstraining.1')?.session as SessionDraft;
const delegated = session.blocks.filter((b) => b.kind === 'strength');
const host = session.blocks.filter((b) => b.kind !== 'strength');
const rule = BETA0_CT_COMPOSITE_DEMAND;

/** Ruleset dont la table de normalisation est remplacée (`undefined` : paramètre absent). */
function withTable(table: unknown): LoadedRuleset {
  const r = Object.create(content.ruleset) as LoadedRuleset & { parameter: LoadedRuleset['parameter'] };
  const orig = content.ruleset.parameter.bind(content.ruleset);
  r.parameter = ((id: string) => (id === DEMAND_NORMALIZATION_PARAMETER ? (table === undefined ? undefined : { ...orig(id), value: table }) : orig(id))) as LoadedRuleset['parameter'];
  return r;
}

describe('R1 — demande composite (revue)', () => {
  it('CD-0. pré-condition : la séance CT porte un bloc délégué Strength en séries ; demande non composite indisponible (unité non normalisée)', () => {
    expect(delegated.length).toBeGreaterThan(0);
    expect(delegated.every((b) => b.items.every((i) => i.prescription.type === 'sets'))).toBe(true);
    const plain = demandOf(session, content, 'crosstraining', 'CANDIDATE');
    expect(plain.status).toBe('unavailable');
    if (plain.status === 'unavailable') expect(plain.reasons[0]?.params).toMatchObject({ cause: 'UNIT_NOT_NORMALIZED', detail: 'crosstraining:working_set' });
  });

  it('CD-1. normalisation par discipline : hôte par la table `crosstraining`, bloc par la table `strength` (séries de travail × perUnit gouverné)', () => {
    const h = deriveSessionDemand({ ...session, blocks: host }, content.catalog, content.ruleset);
    const b = deriveSessionDemand({ ...session, discipline: 'strength', blocks: delegated }, content.catalog, content.ruleset);
    expect(h.ok && b.ok).toBe(true);
    if (!h.ok || !b.ok) return;
    const table = content.ruleset.parameter(DEMAND_NORMALIZATION_PARAMETER)?.value as Record<string, Record<string, { perUnit: number; intensityBand: string }>>;
    const ws = table.strength?.working_set;
    for (const [k, it] of delegated.flatMap((x) => x.items).entries()) {
      const sets = it.prescription.type === 'sets' ? it.prescription.sets.filter((q) => q.kind !== 'rampup' && q.optional !== true).length : 0;
      expect(b.items[k]).toMatchObject({ exerciseId: it.exerciseId, doseUnits: sets * (ws?.perUnit ?? Number.NaN), intensityBand: ws?.intensityBand });
    }
    const out = compositeDemandOf(session, content, 'crosstraining', 'CANDIDATE', rule);
    expect(out).toEqual({ status: 'derived', levels: deriveDemandProfile([...h.items, ...b.items], content.catalog, content.ruleset).levels });
  });

  it('CD-2. aucun double comptage : chaque item d’entraînement compté une fois ; scores = hôte + bloc, structure par structure', () => {
    const h = deriveSessionDemand({ ...session, blocks: host }, content.catalog, content.ruleset);
    const b = deriveSessionDemand({ ...session, discipline: 'strength', blocks: delegated }, content.catalog, content.ruleset);
    if (!h.ok || !b.ok) throw new Error('dérivation');
    const training = session.blocks.filter((x) => x.kind !== 'warmup' && x.kind !== 'cooldown').flatMap((x) => x.items.map((i) => i.exerciseId)).sort();
    expect([...h.items, ...b.items].map((i) => i.exerciseId).sort()).toEqual(training);
    const all = deriveDemandProfile([...h.items, ...b.items], content.catalog, content.ruleset).scores;
    for (const [s, v] of Object.entries(all)) expect(v).toBeCloseTo((h.profile.scores[s] ?? 0) + (b.profile.scores[s] ?? 0), 9);
  });

  it('CD-3. table absente ⇒ refus explicite (jamais de valeur inventée)', () => {
    const tbl = content.ruleset.parameter(DEMAND_NORMALIZATION_PARAMETER)?.value as Record<string, unknown>;
    const noStrength = { ...content, ruleset: withTable(Object.fromEntries(Object.entries(tbl).filter(([k]) => k !== 'strength'))) };
    const a = compositeDemandOf(session, noStrength, 'crosstraining', 'CANDIDATE', rule);
    expect(a.status).toBe('unavailable');
    if (a.status === 'unavailable') expect(a.reasons[0]?.params).toMatchObject({ cause: 'DISCIPLINE_NOT_NORMALIZED', detail: 'strength' });
    const none = compositeDemandOf(session, { ...content, ruleset: withTable(undefined) }, 'crosstraining', 'CANDIDATE', rule);
    expect(none.status).toBe('unavailable');
    if (none.status === 'unavailable') expect(none.reasons[0]?.params).toMatchObject({ cause: 'PARAMETER_MISSING' });
  });

  it('CD-4. PRODUCTION : la règle TEST_ONLY n’est jamais appliquée (demande non composite, table non approuvée refusée)', () => {
    const p = compositeDemandOf(session, content, 'crosstraining', 'PRODUCTION', rule);
    expect(p).toEqual(demandOf(session, content, 'crosstraining', 'PRODUCTION'));
    expect(p.status).toBe('unavailable');
  });

  it('CD-5. sans bloc délégué : identique à la demande d’origine ; bloc `strength` non entièrement en séries : laissé à l’hôte', () => {
    const plain = { ...session, blocks: host };
    expect(compositeDemandOf(plain, content, 'crosstraining', 'CANDIDATE', rule)).toEqual(demandOf(plain, content, 'crosstraining', 'CANDIDATE'));
    const odd = { ...session, blocks: [...host, { ...(delegated[0] as object), items: [{ ...(delegated[0]?.items[0] as object), prescription: { type: 'reps', reps: 10 } }] } as never] };
    expect(compositeDemandOf(odd, content, 'crosstraining', 'CANDIDATE', rule)).toEqual(demandOf(odd, content, 'crosstraining', 'CANDIDATE'));
  });

  it('CD-6. portée : seule la Beta 0 (CANDIDATE, beta0_experimental) porte la règle ; l’environnement applicatif par défaut ne l’a pas', () => {
    expect(env.crosstraining?.compositeDemand).toEqual(rule);
    expect(rule.status).toBe('TEST_ONLY');
    expect(env.mode).toBe('CANDIDATE');
    expect((appPlannerEnvironment() as { crosstraining?: unknown }).crosstraining).toBeUndefined();
    // Port Cross-training construit SANS la règle : comportement antérieur (indisponible).
    const { intent, goals } = portInputs(state.programmeState as never);
    const ports = buildPorts(state, state.profile as never, intent, { ...env, crosstraining: { ...env.crosstraining, compositeDemand: undefined } as never }, goals);
    expect(ports.crosstraining?.demand(session, 'CANDIDATE').status).toBe('unavailable');
    const withRule = buildPorts(state, state.profile as never, intent, env, goals);
    expect(withRule.crosstraining?.demand(session, 'CANDIDATE').status).toBe('derived');
  });
});
