/**
 * Phase 3.5 — versionnement des schémas sérialisés : V1 → migration → schéma courant → validation.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { CURRENT_SCHEMA } from '@hybridsport/domain';
import type { SessionRecord } from '@hybridsport/domain';
import { canonicalStringify, MIGRATIONS, migrateToCurrent, migrationRegistryIssues, toEnvelope } from '../../src/index.js';
import type { MigrationStep } from '../../src/index.js';
import { deepFreeze } from '../fixtures/context.js';
import { session, strengthSessionInput } from '../fixtures/sessions.js';
import { machineVariant } from '../harness/requests.js';

const provenance = { engineVersion: '0.1.0', rulesetVersion: '0.1.0-test', catalogVersion: '0.1.0', seed: 'seed-v1', traceId: 't0123456789abcdef' } as const;
const v1 = (s: unknown = session()) => ({ kind: 'session_record', schemaVersion: 1, data: { session: s, provenance } });

describe('migrations — registre', () => {
  it('le registre du CORE est complet : une étape n → n+1 jusqu’à la version courante', () => {
    expect(migrationRegistryIssues()).toEqual([]);
    expect(CURRENT_SCHEMA.session_record.version).toBe(3);
  });

  it('trou, doublon ou saut de version dans un registre ⇒ détectés', () => {
    expect(migrationRegistryIssues([])).toEqual(['session_record : aucune migration 1 → 2', 'session_record : aucune migration 2 → 3']);
    const [step, step2] = [MIGRATIONS[0]!, MIGRATIONS[1]!];
    expect(migrationRegistryIssues([step, step, step2])).toEqual(['session_record : plusieurs migrations depuis 1']);
    expect(migrationRegistryIssues([{ ...step, to: 3 }, step2])).toEqual(['session_record : migration 1 → 3 (un pas à la fois)']);
  });
});

describe('migrations — V1 sérialisée → version courante → validation', () => {
  it('une séance V1 est migrée, validée par le schéma courant, sans empreinte inventée', () => {
    const r = migrateToCurrent<SessionRecord>(v1());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.fromVersion).toBe(1);
    expect(r.applied).toEqual(['session_record:1→2', 'session_record:2→3']);
    expect(r.value.fingerprint).toEqual({ status: 'unavailable', reason: 'migrated_from_v1' });
    expect(canonicalStringify(r.value.session)).toBe(canonicalStringify(session()));
    expect(r.value.provenance).toEqual(provenance);
  });

  it('donnée déjà à la version courante ⇒ aucune migration, validation seule (aller-retour d’écriture)', () => {
    const record: SessionRecord = { session: session(), provenance, fingerprint: { status: 'unavailable', reason: 'duplicate_analysis_inactive' } };
    const r = migrateToCurrent<SessionRecord>(JSON.parse(JSON.stringify(toEnvelope('session_record', record))));
    expect(r.ok && r.applied).toEqual([]);
    if (r.ok) expect(canonicalStringify(r.value)).toBe(canonicalStringify(record));
  });

  it('version future inconnue ⇒ refus explicite (jamais une lecture « au mieux »)', () => {
    const r = migrateToCurrent({ kind: 'session_record', schemaVersion: 4, data: {} });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasons[0]).toMatchObject({ code: 'TECHNICAL.SCHEMA_VERSION_UNSUPPORTED', params: { version: 4, current: 3 } });
  });

  it('enveloppe invalide, type inconnu, version nulle ⇒ TECHNICAL', () => {
    for (const bad of [null, {}, { kind: 'plan', schemaVersion: 1, data: {} }, { kind: 'session_record', schemaVersion: 0, data: {} }, { kind: 'session_record', schemaVersion: 1.5, data: {} }]) {
      const r = migrateToCurrent(bad);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reasons.every((x) => x.category === 'technical')).toBe(true);
    }
  });

  it('donnée V1 invalide (séance corrompue) ⇒ refus à la validation du schéma courant', () => {
    const r = migrateToCurrent(v1({ id: 'x', blocks: [] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasons[0]?.code).toBe('TECHNICAL.SCHEMA_INVALID');
    const noProvenance = migrateToCurrent({ kind: 'session_record', schemaVersion: 1, data: { session: session() } });
    expect(!noProvenance.ok && noProvenance.reasons[0]?.code).toBe('TECHNICAL.MIGRATION_FAILED');
  });

  it('une migration qui modifierait le contenu sportif est REFUSÉE', () => {
    const cheating: MigrationStep = {
      ...MIGRATIONS[0]!,
      migrate: (data) => {
        const d = data as { session: { availableTimeS: number }; provenance: unknown };
        return { ok: true, data: { ...d, session: { ...d.session, availableTimeS: d.session.availableTimeS + 60 }, fingerprint: { status: 'unavailable', reason: 'migrated_from_v1' } } };
      },
    };
    const r = migrateToCurrent(v1(), [cheating]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasons[0]).toMatchObject({ code: 'TECHNICAL.MIGRATION_FAILED', params: { problem: 'la migration modifie le contenu sportif' } });
  });

  it('migration absente du registre fourni ⇒ refus explicite', () => {
    const r = migrateToCurrent(v1(), []);
    expect(!r.ok && r.reasons[0]?.params.problem).toBe('migration absente du registre');
  });

  it('déterministe et sans effet de bord : entrée gelée intacte, même sortie octet pour octet', () => {
    const input = deepFreeze(v1());
    const snapshot = canonicalStringify(input);
    const a = migrateToCurrent(input);
    const b = migrateToCurrent(input);
    expect(canonicalStringify(a)).toBe(canonicalStringify(b));
    expect(canonicalStringify(input)).toBe(snapshot);
  });

  it('propriété : pour toute séance V1 valide, la migration préserve exactement la séance', () => {
    const pool = [strengthSessionInput(), machineVariant(), strengthSessionInput({ availableTimeS: 3600, targetDurationS: 3240 })];
    fc.assert(fc.property(fc.constantFrom(...pool), fc.string({ minLength: 1, maxLength: 12 }), (input, seed) => {
      const s = session(input);
      const r = migrateToCurrent<SessionRecord>({ kind: 'session_record', schemaVersion: 1, data: { session: s, provenance: { ...provenance, seed } } });
      expect(r.ok).toBe(true);
      if (r.ok) expect(canonicalStringify(r.value.session)).toBe(canonicalStringify(s));
    }), { numRuns: 50 });
  });
});

describe('migrations — v2 → v3 (CORE-EXT-1) et lecteur ancien', () => {
  const record = (s: unknown) => ({ session: s, provenance, fingerprint: { status: 'unavailable', reason: 'duplicate_analysis_inactive' } });
  const extended = () => {
    const base = strengthSessionInput();
    const main = base.blocks[1]!;
    const bench = main.items[0]!;
    return session({ ...base, blocks: [base.blocks[0]!, { ...main, items: [{ ...bench,
      refs: { slotId: 'slot.push', prescriptionSource: 'base_profile' },
      prescription: { type: 'sets', sets: [
        { kind: 'rampup', reps: 5, restAfterS: 60, intensity: { mode: 'relative_to_working', fraction: 0.5 } },
        { kind: 'working', reps: { min: 6, max: 8 }, restAfterS: 150, intensity: { mode: 'effort', effort: { rir: 2 } } },
        { kind: 'working', reps: { min: 6, max: 8 }, restAfterS: 150, intensity: { mode: 'effort', effort: { rir: 2 } }, optional: true },
      ] } }] } as typeof main, base.blocks[2]!] });
  };

  it('une donnée v2 est migrée à l’identique (séance canoniquement inchangée)', () => {
    const r = migrateToCurrent<SessionRecord>({ kind: 'session_record', schemaVersion: 2, data: record(session()) });
    expect(r.ok && r.applied).toEqual(['session_record:2→3']);
    if (r.ok) expect(canonicalStringify(r.value.session)).toBe(canonicalStringify(session()));
  });

  it('une donnée v3 avec les nouveaux champs est lue par le lecteur courant', () => {
    const r = migrateToCurrent<SessionRecord>(JSON.parse(JSON.stringify(toEnvelope('session_record', record(extended())))));
    expect(r.ok).toBe(true);
    if (r.ok) expect(canonicalStringify(r.value.session)).toBe(canonicalStringify(extended()));
  });

  it('lecteur ancien (v2) : une donnée v3 est REFUSÉE explicitement, jamais lue en ignorant ses champs', () => {
    const oldReader = { session_record: { version: 2, schema: CURRENT_SCHEMA.session_record.schema } };
    const r = migrateToCurrent(toEnvelope('session_record', record(extended())), MIGRATIONS.slice(0, 1), oldReader);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasons[0]).toMatchObject({ code: 'TECHNICAL.SCHEMA_VERSION_UNSUPPORTED', params: { version: 3, current: 2 } });
    expect(migrationRegistryIssues(MIGRATIONS.slice(0, 1), oldReader)).toEqual([]);
  });
});
