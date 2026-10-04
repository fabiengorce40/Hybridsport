/**
 * Extension générique minimale (HYROX H1) : charge externe facultative `load: { kg, certainty }` sur les doses HORS
 * séries (`reps`, `distance`, `calories`, `timed`). Le CORE la transporte sans l'interpréter : ni la durée, ni la
 * validation, ni l'empreinte ne la lisent. session_record v6. Valeurs de charge : DONNÉES DE TEST.
 */
import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA, zPrescription, zSessionDraft } from '@hybridsport/domain';
import type { SessionDraftInput } from '@hybridsport/domain';
import { ENGINE_VERSION, MIGRATIONS, buildFingerprint, estimateDuration, migrateToCurrent, readDurationParams, toEnvelope } from '../../src/index.js';
import { testCatalog, testRuleset } from '../fixtures/load.js';

// technical-constant: TEST_ONLY — charge et doses de test
const KG = 20;
const load = { kg: KG, certainty: 'prescribed' as const };
const catalog = testCatalog();
const ruleset = testRuleset();

const one = (exerciseId: string, prescription: unknown): SessionDraftInput => ({
  id: 's.load', discipline: 'hybrid_race', athleteLevel: 'intermediate', availableTimeS: 3600, targetDurationS: 1800, toleranceProfile: 'mixed',
  blocks: [{ id: 'b', kind: 'hybrid_station_work', role: 'primary', format: 'continuous', items: [{ id: 'i', exerciseId, prescription: prescription as never }] }],
});

describe('schéma', () => {
  it('charge acceptée sur reps, distance, calories, timed ; forme historique (sans charge) inchangée', () => {
    for (const p of [{ type: 'reps', reps: 10, load }, { type: 'distance', distanceM: 50, load }, { type: 'calories', calories: 10, load }, { type: 'timed', workS: 60, load }]) {
      expect(zPrescription.safeParse(p).success, p.type).toBe(true);
    }
    expect(zPrescription.parse({ type: 'distance', distanceM: 50 })).toEqual({ type: 'distance', distanceM: 50 });
  });

  it('charge invalide refusée : kg ≤ 0, non fini, certitude inconnue, champ en trop ; aucune charge sur hold, mobility, intervals', () => {
    for (const l of [{ kg: 0, certainty: 'prescribed' }, { kg: Number.POSITIVE_INFINITY, certainty: 'prescribed' }, { kg: KG, certainty: 'maybe' }, { kg: KG, certainty: 'prescribed', effort: { rpe: 8 } }]) {
      expect(zPrescription.safeParse({ type: 'reps', reps: 10, load: l }).success).toBe(false);
    }
    expect(zPrescription.safeParse({ type: 'hold', seconds: 30, load }).success).toBe(false);
    expect(zPrescription.safeParse({ type: 'mobility', seconds: 30, load }).success).toBe(false);
  });
});

describe('le CORE ne lit pas la charge', () => {
  it('durée estimée identique avec et sans charge (estimation = données du catalogue)', () => {
    const params = readDurationParams(ruleset);
    for (const [ex, p] of [['ex.sled_push', { type: 'distance', distanceM: 50 }], ['ex.wall_ball', { type: 'reps', reps: 20 }], ['ex.farmers_carry', { type: 'timed', workS: 60 }]] as const) {
      const a = estimateDuration(zSessionDraft.parse(one(ex, p)), catalog, params);
      const b = estimateDuration(zSessionDraft.parse(one(ex, { ...p, load })), catalog, params);
      expect(b, ex).toEqual(a);
    }
  });

  it('empreinte identique avec et sans charge (la charge n’est pas une dimension de similarité)', () => {
    const inputs = { archetypeId: 'a', stimulus: 's', energy: { low: 1, moderate: 0, high: 0 }, volumeByItem: { i: 1 }, prescriptionMarkers: {} };
    const a = buildFingerprint(zSessionDraft.parse(one('ex.sled_push', { type: 'distance', distanceM: 50 })), catalog, inputs);
    const b = buildFingerprint(zSessionDraft.parse(one('ex.sled_push', { type: 'distance', distanceM: 50, load })), catalog, inputs);
    expect(b).toEqual(a);
  });
});

describe('session_record v6', () => {
  const provenance = { engineVersion: ENGINE_VERSION, rulesetVersion: '0.1.0-test', catalogVersion: '0.1.0-test', seed: 'seed-load', traceId: 't0123456789abcdef' } as const;
  const record = (s: SessionDraftInput) => ({ session: zSessionDraft.parse(s), provenance, fingerprint: { status: 'unavailable', reason: 'duplicate_analysis_inactive' }, durationEstimate: { availability: 'UNAVAILABLE_LEGACY' } });
  const loaded = one('ex.sled_push', { type: 'distance', distanceM: 50, load });

  it('version courante 6 : écriture puis lecture d’une séance chargée, charge conservée', () => {
    expect(CURRENT_SCHEMA.session_record.version).toBe(6);
    const r = migrateToCurrent<{ session: { blocks: { items: { prescription: unknown }[] }[] } }>(toEnvelope('session_record', record(loaded)));
    expect(r.ok && r.value.session.blocks[0]?.items[0]?.prescription).toEqual({ type: 'distance', distanceM: 50, load });
  });

  it('donnée v5 sans charge ⇒ migrée à l’identique ; donnée v5 portant une charge ⇒ combinaison malformée refusée', () => {
    const ok = migrateToCurrent({ kind: 'session_record', schemaVersion: 5, data: record(one('ex.sled_push', { type: 'distance', distanceM: 50 })) });
    expect(ok.ok && ok.applied).toEqual(['session_record:5→6']);
    const bad = migrateToCurrent({ kind: 'session_record', schemaVersion: 5, data: record(loaded) });
    expect(!bad.ok && bad.reasons[0]).toMatchObject({ code: 'TECHNICAL.MIGRATION_FAILED', params: { from: 5, to: 6 } });
  });

  it('lecteur v5 ⇒ refuse explicitement une donnée v6', () => {
    const v5Reader = { session_record: { version: 5, schema: CURRENT_SCHEMA.session_record.schema } };
    const r = migrateToCurrent(toEnvelope('session_record', record(loaded)), MIGRATIONS.slice(0, 4), v5Reader);
    expect(!r.ok && r.reasons[0]).toMatchObject({ code: 'TECHNICAL.SCHEMA_VERSION_UNSUPPORTED', params: { version: 6, current: 5 } });
  });
});
