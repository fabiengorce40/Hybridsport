/**
 * Reprise RC5 lot 4.1 — contrats du moteur Strength pour l'allocation de volume `primary_need` (politique de
 * personnalisation 1.1) : champ FACULTATIF (politique 1.0 strictement inchangée), valeur fermée, contexte hebdomadaire
 * facultatif, raison `DOSE.VOLUME_LIMITED` déclarée (interne, information). Le comportement est vérifié sur le chemin réel
 * (app-core `rc5-lot41-volume.test.ts`, banc `rc5-lot41-simulations.test.ts`).
 */
import { describe, expect, it } from 'vitest';
import { STRENGTH_REASON_CODES, zPersonalizationPolicy, zStrengthContext } from '../../src/index.js';
import { PERSONALIZATION_V1, PERSONALIZATION_V1_1 } from '../../content/personalization-v1.js';

describe('politique de personnalisation : allocation', () => {
  it('1.0 (sans allocation) et 1.1 (`primary_need`) valides ; toute autre valeur refusée', () => {
    expect(zPersonalizationPolicy.safeParse(PERSONALIZATION_V1).success).toBe(true);
    expect(zPersonalizationPolicy.safeParse(PERSONALIZATION_V1_1).success).toBe(true);
    expect(zPersonalizationPolicy.safeParse({ ...PERSONALIZATION_V1, allocation: 'max_need' }).success).toBe(false);
  });
  it('1.1 ne diffère de 1.0 que par la version et l’allocation', () => {
    const { allocation, version, ...a } = PERSONALIZATION_V1_1;
    const { version: v0, ...b } = PERSONALIZATION_V1;
    expect(a).toEqual(b);
    expect(allocation).toBe('primary_need');
    expect(version).not.toBe(v0);
  });
});

describe('contexte : séries de la semaine civile', () => {
  const hard = zStrengthContext.shape.hardSets;
  it('facultatives (contexte historique valide sans elles), positives, strictes', () => {
    expect(hard.safeParse({ d7: { chest: 3 } }).success).toBe(true);
    expect(hard.safeParse({ d7: { chest: 3 }, week: { chest: 2 } }).success).toBe(true);
    expect(hard.safeParse({ d7: {}, week: { chest: -1 } }).success).toBe(false);
    expect(hard.safeParse({ d7: {}, month: {} }).success).toBe(false);
  });
});

describe('raison `DOSE.VOLUME_LIMITED`', () => {
  it('déclarée : interne, information, paramètres exercice / groupe / groupe limitant / voulu / permis', () => {
    const d = STRENGTH_REASON_CODES.find((c) => c.code === 'DOSE.VOLUME_LIMITED');
    expect(d?.audience).toBe('internal');
    expect(d?.categories).toEqual(['information']);
    expect(Object.keys(d?.params ?? {}).sort()).toEqual(['allowed', 'by', 'exerciseId', 'group', 'wanted']);
  });
});
