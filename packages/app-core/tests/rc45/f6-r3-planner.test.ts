/**
 * RC4.5 (F6, R3) — port Musculation du planificateur : les séries d'un emplacement à TEMPS RÉSIDUEL (mollets) ne
 * comptent ni dans la mesure par groupe de la garde G5 (`plannedGroupSets`), ni dans la signature / le volume des
 * séances jumelles de la variation intra-semaine. Un groupe servi seulement par un ajout résiduel ne fait donc jamais
 * refuser une organisation, et l'ajout ne change aucune décision du planificateur (banc RC4 : identique hors mollets).
 */
import { describe, expect, it } from 'vitest';
import { sessionPlannedHardSets } from '@hybridsport/strength';
import { readStrengthParams } from '@hybridsport/strength';
import { beta0Environment, buildPorts, portInputs, selectProgrammeSession, strengthContent } from '../../src/index.js';
import { PROFILES, simulateOnce } from '../rc4-audit/rc4-sim.js';

const RESIDUAL = ['fb.calves', 'lo.calves', 'fb.pull_c'];

describe('RC4.5 F6 — R3 (garde G5)', () => {
  it('séance avec mollets : séries de mollets absentes de la mesure G5, autres groupes identiques', () => {
    const spec = PROFILES.find((p) => p.id === 'P2');
    if (!spec) throw new Error('P2');
    const s = simulateOnce(spec).state;
    const p = s.profile;
    const ps = s.programmeState;
    if (!p || !ps) throw new Error('état');
    const { intent, goals } = portInputs(ps);
    const port = buildPorts(s, p, intent, beta0Environment(), goals).strength;
    const ids = Object.values(s.planner.weeks).flatMap((w) => w.requests).filter((r) => r.sport === 'strength' && r.status === 'planned').map((r) => r.requestId);
    const withCalves = ids.map((id) => selectProgrammeSession(s, id)?.session).filter((x) => x?.blocks.some((b) => b.items.some((i) => i.refs?.slotId === 'fb.calves')));
    expect(withCalves.length).toBeGreaterThan(0);
    const params = readStrengthParams(strengthContent().ruleset).values;
    for (const session of withCalves) {
      if (!session || !port?.plannedGroupSets) throw new Error('port');
      const all = sessionPlannedHardSets(session, params, strengthContent().catalog);
      const g5 = port.plannedGroupSets(session);
      expect(all.calves ?? 0).toBeGreaterThan(0);
      expect(g5.calves ?? 0).toBe(0);
      // Tous les emplacements à temps résiduel (mollets F6, tirage complémentaire L1b-4) sont hors de la mesure G5.
      const ordinary = { ...session, blocks: session.blocks.map((b) => ({ ...b, items: b.items.filter((i) => !RESIDUAL.includes(i.refs?.slotId ?? '')) })) };
      expect(g5).toEqual(Object.fromEntries(Object.entries(sessionPlannedHardSets(ordinary, params, strengthContent().catalog)).filter(([, n]) => n > 0)));
    }
  }, 120_000);
});
