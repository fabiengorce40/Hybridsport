/**
 * RC3 (préparation) — proposition TEST_ONLY de récupération intra-Musculation : représentation et garde-fous.
 * Aucune action sur une séance ; aucun délai universel ; jamais lue par l'application.
 */
import { describe, expect, it } from 'vitest';
import { beta0Environment } from '../../src/index.js';
import { DEMO_PROPOSAL, observeIntraStrength, UNRESOLVED_PROPOSAL, zIntraStrengthProposal } from './intra-strength.js';
import type { ForceSession } from './intra-strength.js';
import type { VolumeSplit } from './volume-split.js';

// Deux Full Body identiques (séries directes bas et haut du corps, RIR 2 = bande « hard »).
const FB: VolumeSplit = { direct: { quads: 4, chest: 3, back: 3 }, indirect: { glutes: 4, arms: 3 }, e1: {}, minRir: { quads: 2, chest: 2, back: 2 } };
const s = (id: string, at: string, split: VolumeSplit = FB, declared?: ForceSession['declared']): ForceSession => ({ id, at, split, ...(declared ? { declared } : {}) });

describe('RC3 — récupération intra-Musculation (proposition TEST_ONLY)', () => {
  it('S-1. deux Full Body consécutifs ≠ deux Full Body espacés : écart réel porté, statut différent', () => {
    const near = observeIntraStrength([s('a', '2026-10-05T18:00:00Z'), s('b', '2026-10-06T18:00:00Z')], DEMO_PROPOSAL);
    const far = observeIntraStrength([s('a', '2026-10-05T18:00:00Z'), s('b', '2026-10-08T18:00:00Z')], DEMO_PROPOSAL);
    expect(near.filter((o) => !o.indirectOnly).every((o) => o.hours === 24 && o.status === 'WITHIN_WINDOW')).toBe(true);
    expect(far.filter((o) => !o.indirectOnly).every((o) => o.hours === 72 && o.status === 'OUTSIDE_WINDOW')).toBe(true);
  });

  it('S-2. aucun délai universel : sans valeur validée, toute observation reste NON RÉSOLUE', () => {
    const obs = observeIntraStrength([s('a', '2026-10-05T18:00:00Z'), s('b', '2026-10-06T18:00:00Z')], UNRESOLVED_PROPOSAL);
    expect(obs.length).toBeGreaterThan(0);
    expect(obs.every((o) => o.status === 'UNRESOLVED' && o.requiredHours === null)).toBe(true);
  });

  it('S-3. l’intensité compte : RIR inconnu ⇒ bande inconnue (non résolue), RIR 0 ⇒ bande plus exigeante', () => {
    const unknown = observeIntraStrength([s('a', '2026-10-05T18:00:00Z', { ...FB, minRir: {} }), s('b', '2026-10-07T18:00:00Z')], DEMO_PROPOSAL);
    expect(unknown.filter((o) => !o.indirectOnly).every((o) => o.band === 'unknown' && o.status === 'UNRESOLVED')).toBe(true);
    const failure = observeIntraStrength([s('a', '2026-10-05T18:00:00Z', { ...FB, minRir: { quads: 0, chest: 0, back: 0 } }), s('b', '2026-10-07T18:00:00Z')], DEMO_PROPOSAL);
    expect(failure.filter((o) => !o.indirectOnly).every((o) => o.band === 'near_failure' && o.status === 'WITHIN_WINDOW')).toBe(true);
  });

  it('S-4. direct et indirect jamais confondus ; délai surchargeable par groupe', () => {
    const next = { direct: { glutes: 3 }, indirect: {}, e1: {}, minRir: { glutes: 2 } };
    const obs = observeIntraStrength([s('a', '2026-10-05T18:00:00Z'), s('b', '2026-10-06T18:00:00Z', next)], DEMO_PROPOSAL);
    expect(obs).toHaveLength(1);
    expect(obs[0]).toMatchObject({ group: 'glutes', prevDirect: 0, prevIndirect: 4, indirectOnly: true });
    const over = observeIntraStrength([s('a', '2026-10-05T18:00:00Z'), s('b', '2026-10-06T18:00:00Z')], { ...DEMO_PROPOSAL, groupOverrides: { quads: { hard: 12 } } });
    expect(over.find((o) => o.group === 'quads')?.status).toBe('OUTSIDE_WINDOW');
    expect(over.find((o) => o.group === 'chest')?.status).toBe('WITHIN_WINDOW');
  });

  it('S-5. fatigue déclarée tracée à côté, jamais convertie en heures ; séances non modifiées', () => {
    const a = s('a', '2026-10-05T18:00:00Z'); const b = s('b', '2026-10-08T18:00:00Z', FB, { fatigue: 'high', recovery: 'poor' });
    const before = JSON.stringify([a, b]);
    const obs = observeIntraStrength([a, b], DEMO_PROPOSAL);
    expect(obs.every((o) => o.status === 'OUTSIDE_WINDOW' || o.indirectOnly)).toBe(true);
    expect(obs[0]?.declared).toEqual({ fatigue: 'high', recovery: 'poor' });
    expect(JSON.stringify([a, b])).toBe(before);
  });

  it('S-6. gouvernance fermée : seulement TEST_ONLY et observation ; l’application ne porte aucune valeur', () => {
    expect(zIntraStrengthProposal.safeParse({ ...DEMO_PROPOSAL, status: 'APPROVED' }).success).toBe(false);
    expect(zIntraStrengthProposal.safeParse({ ...DEMO_PROPOSAL, action: 'lower_sets' }).success).toBe(false);
    expect(zIntraStrengthProposal.safeParse({ ...DEMO_PROPOSAL, indirect: 'add_to_direct' }).success).toBe(false);
    const ruleset = beta0Environment().strength?.content.ruleset;
    expect(ruleset?.parameter('strength.recovery.intraDiscipline')).toBeUndefined();
  });
});
