/**
 * Empreinte à dimensions EXPLICITES (Cross-training C2) : `stimulus` et `energy` = valeur connue (forme historique)
 * OU `not_applicable` déclaré. Une clé absente reste une erreur. Comparaison : known ↔ known inchangée ; toute paire
 * contenant `not_applicable` est non comparable (null, exclue du dénominateur). session_record v5.
 */
import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA, NOT_APPLICABLE, asISODateTime, zSessionDraft, zSessionFingerprintV1 } from '@hybridsport/domain';
import type { SessionDraftInput, SessionFingerprint } from '@hybridsport/domain';
import { ENGINE_VERSION, MIGRATIONS, analyzeDuplicates, buildFingerprint, migrateToCurrent, similarityBreakdown, readDuplicateParams, toEnvelope } from '../../src/index.js';
import { testCatalog, testRuleset } from '../fixtures/load.js';
import { testRulesetDocumentWithDuplicate } from '../fixtures/ruleset.js';
import { session, strengthSessionInput } from '../fixtures/sessions.js';
import { fingerprintInputsFor } from '../fixtures/sport-engine.js';

const catalog = testCatalog();
const ruleset = testRuleset(testRulesetDocumentWithDuplicate());
const params = readDuplicateParams(ruleset, 'strength');
const BENCH = strengthSessionInput();
const NOW = asISODateTime('2026-09-28T08:00:00Z');

function fp(over: Record<string, unknown> = {}, id = BENCH.id, input: SessionDraftInput = BENCH): SessionFingerprint {
  const r = buildFingerprint(session({ ...input, id }), catalog, { ...fingerprintInputsFor(input), ...over });
  if (!r.ok) throw new Error(JSON.stringify(r.reasons));
  return r.fingerprint;
}

describe('construction', () => {
  it('not_applicable déclaré ⇒ conservé tel quel (aucune valeur inventée, aucune normalisation)', () => {
    const f = fp({ stimulus: NOT_APPLICABLE, energy: NOT_APPLICABLE });
    expect(f.stimulus).toEqual(NOT_APPLICABLE);
    expect(f.energy).toEqual(NOT_APPLICABLE);
  });

  it('valeur connue ⇒ comportement historique inchangé (parts normalisées, stimulus recopié)', () => {
    const f = fp({ energy: { low: 2, moderate: 3, high: 5 } });
    expect(f.energy).toEqual({ low: 0.2, moderate: 0.3, high: 0.5 });
    expect(f.stimulus).toBe(fingerprintInputsFor(BENCH).stimulus);
  });

  it('omission ⇒ erreur (jamais lue comme not_applicable) ; forme inconnue ⇒ erreur ; message précis de la branche connue', () => {
    const inputs = { ...fingerprintInputsFor(BENCH) } as Record<string, unknown>;
    delete inputs.energy;
    const r = buildFingerprint(session(BENCH), catalog, inputs);
    expect(r).toMatchObject({ ok: false, reasons: [{ code: 'TECHNICAL.SCHEMA_INVALID', params: { path: 'fingerprintInputs.energy', problem: 'Invalid input: expected object, received undefined' } }] });
    const weird = buildFingerprint(session(BENCH), catalog, { ...fingerprintInputsFor(BENCH), stimulus: { status: 'unknown' } });
    expect(weird.ok).toBe(false);
    const nan = buildFingerprint(session(BENCH), catalog, { ...fingerprintInputsFor(BENCH), energy: { low: Number.NaN, moderate: 1, high: 0 } });
    expect(nan).toMatchObject({ ok: false, reasons: [{ params: { path: 'fingerprintInputs.energy.low', problem: 'Invalid input: expected number, received NaN' } }] });
  });

  it('énergie connue nulle ⇒ refus inchangé', () => {
    const r = buildFingerprint(session(BENCH), catalog, { ...fingerprintInputsFor(BENCH), energy: { low: 0, moderate: 0, high: 0 } });
    expect(r).toMatchObject({ ok: false, reasons: [{ code: 'TECHNICAL.STRUCTURE_INVALID' }] });
  });
});

describe('comparaison', () => {
  const known = fp();
  const na = fp({ stimulus: NOT_APPLICABLE, energy: NOT_APPLICABLE }, 's.na');
  const na2 = fp({ stimulus: NOT_APPLICABLE, energy: NOT_APPLICABLE }, 's.na2');

  it('known ↔ known : composantes calculées comme avant', () => {
    const b = similarityBreakdown(known, fp({}, 's.k2'), params);
    expect(b.stimulus).toBe(1);
    expect(b.energy).toBe(1);
  });

  it('not_applicable ↔ not_applicable et known ↔ not_applicable : non comparables (null), jamais une égalité', () => {
    expect(similarityBreakdown(na, na2, params)).toMatchObject({ stimulus: null, energy: null });
    expect(similarityBreakdown(known, na, params)).toMatchObject({ stimulus: null, energy: null });
    expect(similarityBreakdown(na, known, params)).toMatchObject({ stimulus: null, energy: null });
  });

  it('une dimension non comparable est exclue du dénominateur : séances identiques restent à 1', () => {
    const r = analyzeDuplicates(na, [{ fingerprint: na2, at: asISODateTime('2026-09-27T08:00:00Z'), status: 'completed', repetitionIntents: [] }], [], ruleset, NOW);
    expect(r.comparisons[0]?.similarity).toBe(1);
    expect(r.comparisons[0]?.breakdown).toMatchObject({ stimulus: null, energy: null });
  });
});

describe('session_record v5 / v6 (empreinte explicite)', () => {
  const provenance = { engineVersion: ENGINE_VERSION, rulesetVersion: '0.1.0-test', catalogVersion: '0.1.0-test', seed: 'seed-fp', traceId: 't0123456789abcdef' } as const;
  const record = (fingerprint: SessionFingerprint) => ({ session: zSessionDraft.parse(BENCH), provenance, fingerprint: { status: 'available', value: fingerprint }, durationEstimate: { availability: 'UNAVAILABLE_LEGACY' } });

  it('version courante : écriture puis lecture d’une empreinte not_applicable, distincte d’une empreinte connue', () => {
    expect(CURRENT_SCHEMA.session_record.version).toBe(6);
    const r = migrateToCurrent<{ fingerprint: { value: SessionFingerprint } }>(toEnvelope('session_record', record(fp({ stimulus: NOT_APPLICABLE, energy: NOT_APPLICABLE }))));
    expect(r.ok && r.value.fingerprint.value.energy).toEqual(NOT_APPLICABLE);
    const k = migrateToCurrent<{ fingerprint: { value: SessionFingerprint } }>(toEnvelope('session_record', record(fp())));
    expect(k.ok && k.value.fingerprint.value.energy).toEqual(fp().energy);
  });

  it('ancien record v4 (empreinte connue) ⇒ migré à l’identique, valeurs toujours connues', () => {
    const old = { kind: 'session_record', schemaVersion: 4, data: record(fp()) };
    const r = migrateToCurrent<{ fingerprint: { value: SessionFingerprint } }>(old);
    expect(r.ok && r.applied).toEqual(['session_record:4→5', 'session_record:5→6']);
    expect(r.ok && zSessionFingerprintV1.safeParse(r.value.fingerprint.value).success).toBe(true);
  });

  it('record v4 portant not_applicable ⇒ combinaison malformée refusée ; lecteur v4 ⇒ refuse un record v5', () => {
    const bad = migrateToCurrent({ kind: 'session_record', schemaVersion: 4, data: record(fp({ energy: NOT_APPLICABLE })) });
    expect(!bad.ok && bad.reasons[0]).toMatchObject({ code: 'TECHNICAL.MIGRATION_FAILED', params: { from: 4, to: 5 } });
    const v4Reader = { session_record: { version: 4, schema: CURRENT_SCHEMA.session_record.schema } };
    const r = migrateToCurrent(toEnvelope('session_record', record(fp())), MIGRATIONS.slice(0, 3), v4Reader);
    expect(!r.ok && r.reasons[0]).toMatchObject({ code: 'TECHNICAL.SCHEMA_VERSION_UNSUPPORTED', params: { version: 6, current: 4 } });
  });

  it('schéma v4 historique : refuse not_applicable (le sens d’un ancien record ne change pas)', () => {
    expect(zSessionFingerprintV1.safeParse(fp({ energy: NOT_APPLICABLE })).success).toBe(false);
    expect(zSessionFingerprintV1.safeParse(fp()).success).toBe(true);
  });
});
