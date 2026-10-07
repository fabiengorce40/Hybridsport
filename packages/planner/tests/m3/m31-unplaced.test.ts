/**
 * M3.1 — contrat du planificateur pour une demande NON PLACÉE : prescription conservée seulement si le moteur l'a
 * produite (créneaux insuffisants, interférence) ; refus du moteur ou règle non gouvernée ⇒ aucune prescription
 * (BLOCKED). M3 n'arbitre que des séances placées : une séance non placée n'est ni déplacée ni recomposée.
 */
import { describe, expect, it } from 'vitest';
import { planMultisportWeek, placementOf } from '../../src/index.js';
import type { SportPort } from '../../src/index.js';
import { clock, days, input, plannerGovernance, running, strength, STRUCTURE_IDS } from '../fixtures.js';
import { D, m3Ports, planM3 } from '../m3-fixtures.js';

const refusing = (port: SportPort): SportPort => ({ ...port, generate: () => ({ status: 'refused', reasons: [{ code: 'SAFETY.TEST.REFUSED', params: {} } as never] }) });

describe('M3.1 — non placée : composée ou bloquée', () => {
  it('41. créneaux insuffisants : prescription composée sur le jour disponible le plus long (référence, pas un placement)', () => {
    const w = planMultisportWeek(input([D.strength(1), D.running(3)], { days: days([60, 0, 90, 0, 0, 0, 0]) }), m3Ports(), plannerGovernance(), clock);
    const u = w.requests.filter((r) => placementOf(r) === 'COMPOSED_BUT_UNPLACED');
    expect(u.length).toBeGreaterThan(0);
    for (const r of u) {
      expect(r.status === 'unplaced' && r.composed?.referenceDate).toBe('2026-10-07');
      expect(r.intent?.archetypeId).toBeDefined();
      expect(w.days.some((d) => d.status === 'planned' && d.requestId === r.requestId)).toBe(false);
    }
  });
  it('42. interférence (fenêtre G4 de test étendue) : la génération rejetée est conservée, placement absent', () => {
    // technical-constant: TEST_ONLY — fenêtre G4 couvrant toute la semaine (heures)
    const wide = Object.fromEntries(STRUCTURE_IDS.map((s) => [s, 200]));
    const w = planMultisportWeek(input([D.strength(1), D.running(1)]), { strength: strength(), running: running() }, plannerGovernance(wide), clock);
    const r = w.requests.find((x) => x.sport === 'running');
    expect(r?.category).toBe('interference_conflict');
    expect(r && placementOf(r)).toBe('COMPOSED_BUT_UNPLACED');
  });
  it('43. règle d\'interférence non gouvernée : BLOCKED, aucune prescription', () => {
    const w = planMultisportWeek(input([D.strength(1), D.running(1)]), { strength: strength(), running: running() }, plannerGovernance(null), clock);
    for (const r of w.requests.filter((x) => x.status === 'unplaced')) expect(placementOf(r)).toBe('BLOCKED');
  });
  it('44. moteur qui refuse (sécurité) sur le créneau de référence : BLOCKED, refus tracé, rien d\'inventé', () => {
    const ports = { ...m3Ports(), running: refusing(running()) };
    const w = planMultisportWeek(input([D.strength(1), D.running(3)], { days: days([60, 0, 90, 0, 0, 0, 0]) }), ports, plannerGovernance(), clock);
    for (const r of w.requests.filter((x) => x.sport === 'running')) expect(placementOf(r)).toBe('BLOCKED');
  });
  it('45. M3 n\'arbitre jamais une séance non placée (ni déplacée, ni échangée, ni recomposée)', () => {
    const w = planM3([D.hyrox(2), D.running(2), D.strength(2), D.ct(1)], { minutes: [60, 60, 60, 0, 60, 60, 90], m3: { protectPriority: false } });
    const unplacedIds = w.requests.filter((r) => r.status !== 'planned').map((r) => r.requestId);
    const touched = (w.arbitration?.decisions ?? []).flatMap((d) => [d.requestId, d.partner ?? '']);
    expect(unplacedIds.some((id) => touched.includes(id))).toBe(false);
    expect(w.requests.filter((r) => placementOf(r) === 'COMPOSED_BUT_UNPLACED').length).toBeGreaterThan(0);
  });
});
