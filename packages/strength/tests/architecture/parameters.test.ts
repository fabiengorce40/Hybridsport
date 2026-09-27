/**
 * Étape 22 : valeurs sportives uniquement dans le ruleset (ici, fixtures de test) ; liste des paramètres
 * EFFECTIVEMENT consommés par le moteur, enregistrée pour le rapport, avec leur classe de gouvernance.
 */
import { describe, expect, it } from 'vitest';
import { proposeStrength, STRENGTH_PARAMETER_SCHEMAS } from '../../src/index.js';
import { engineInput, scenario } from '../fixtures/harness.js';

describe('paramètres consommés (étape 22)', () => {
  it('chaque proposition déclare ses paramètres (id + version) ; tous les paramètres strength déclarés sont consommés', async () => {
    const r = proposeStrength(engineInput(scenario()));
    expect(r.status).toBe('proposals');
    if (r.status !== 'proposals') return;
    const used = r.proposals[0]?.parametersUsed ?? [];
    const ids = used.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const pid of Object.keys(STRENGTH_PARAMETER_SCHEMAS)) expect(ids, pid).toContain(pid);
    const table = used.map((p) => `${p.id.padEnd(44)} v${p.version}  ${(STRENGTH_PARAMETER_SCHEMAS as Record<string, { governance: string }>)[p.id]?.governance ?? 'CORE'}`).sort().join('\n');
    await expect(`${table}\n`).toMatchFileSnapshot('./__reports__/parameters-used.txt');
  });

  it('aucun paramètre G1 sans sens prudent ni référence approuvée (le CORE refuse le ruleset sinon)', () => {
    const g1 = Object.entries(STRENGTH_PARAMETER_SCHEMAS).filter(([, s]) => s.governance === 'G1').map(([id]) => id).sort();
    expect(g1).toEqual(['strength.maxEffort.threshold', 'strength.novice.technicalUnderFatigue', 'strength.selection.skillCeiling', 'strength.volume.sessionCap']);
  });
});
