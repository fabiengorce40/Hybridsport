/**
 * Réalisations validées par les contrats des moteurs : HYROX (station) et Cross-training (C2), à partir de séances
 * RÉELLEMENT générées (H1 / C2). Prescription LUE dans la séance, résultat saisi, cohérences définitionnelles seules.
 * Valeurs : TEST_ONLY.
 */
import { describe, expect, it } from 'vitest';
import type { SessionDraft } from '@hybridsport/domain';
import { zHyroxStationExecution, createHyroxEngine, prescriptionOf, runHyroxH1, zHyroxContext } from '@hybridsport/hyrox';
import { zSessionDraft } from '@hybridsport/domain';
import { realizeCrossTrainingC2, realizeHyroxStation } from '../../src/index.js';
import { DOSES, TEST, hrCtx, hrRequest, hyroxCatalog, hyroxRuleset } from '../../../hyrox/tests/fixtures.js';
import { coreContext } from '../../../engine/tests/harness/context.js';
import { ALL_PORTS, input, plannerGovernance, clock, want } from '../fixtures.js';
import { planMultisportWeek } from '../../src/index.js';

const AT = '2026-10-06T18:00:00Z';
// technical-constant: TEST_ONLY — dose calories de test (station rameur)
const ROW_CAL = 15;
const DOSES_WITH_CAL = [...DOSES, { stationId: 'row', exerciseId: 'ex.row_erg', dose: { kind: 'calories', value: ROW_CAL }, reviewRef: 'TEST-ONLY' }];
function h1(station: string): SessionDraft {
  if (station === 'row') {
    // Le catalogue de test n'a aucun débit « cal/min » pour le rameur : le CORE ne peut pas estimer la durée d'une dose en
    // calories (UNKNOWN_REFERENCE, fail-closed). Contrat seul : prescription construite par la fonction RÉELLE de H1.
    const dose = DOSES_WITH_CAL.find((d) => d.stationId === 'row');
    return zSessionDraft.parse({ id: 's.row', discipline: 'hybrid_race', athleteLevel: 'intermediate', availableTimeS: 1800, targetDurationS: 900, toleranceProfile: 'mixed',
      blocks: [{ id: 'b', kind: 'hybrid_station_work', role: 'primary', format: 'continuous', items: [{ id: 'i', exerciseId: 'ex.row_erg', prescription: prescriptionOf(dose as never) }] }] });
  }
  const o = runHyroxH1(createHyroxEngine({ simulation: true }), hrRequest(hrCtx({ requestedStation: station }), 1800), coreContext('hr-exec', hyroxRuleset({ doses: DOSES_WITH_CAL }), hyroxCatalog()));
  if (o.result.status !== 'ok') throw new Error(JSON.stringify(o.result));
  return o.result.value;
}
const common = { sessionId: 's1', completedAt: AT, pain: 'NONE' as const };

describe('HYROX : réalisation de station (prescription ≠ résultat)', () => {
  it.each([
    ['sled_push', { kind: 'distance_m', value: TEST.sledM }, TEST.sledKg, TEST.sledM],
    ['wall_ball', { kind: 'reps', value: TEST.wallBallReps }, TEST.wallBallKg, TEST.wallBallReps],
    ['row', { kind: 'calories', value: ROW_CAL }, undefined, ROW_CAL],
    ['farmers_carry', { kind: 'duration_s', value: TEST.carryS }, TEST.carryKg, TEST.carryS],
    ['skierg', { kind: 'distance_m', value: TEST.skiM }, undefined, TEST.skiM],
  ] as const)('%s : dose %j, charge prescrite %s, résultat mesuré séparé', (station, dose, loadKg, achieved) => {
    const r = realizeHyroxStation(h1(station), { ...common, completion: 'completed_as_prescribed', stationId: station, result: { achieved, elapsedS: 90 } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.prescription).toEqual({ dose, ...(loadKg === undefined ? {} : { loadKg }) });
    expect(r.value.result).toEqual({ kind: 'completed', achieved, elapsedS: 90 });
    // Relisible : même valeur après sérialisation, validée par le contrat du moteur.
    expect(zHyroxStationExecution.parse(JSON.parse(JSON.stringify(r.value)))).toEqual(r.value);
  });

  it('cohérences définitionnelles : quantité < dose « telle que prescrite » ⇒ refus ; « modifiée » admise ; abandon ⇔ résultat abandonné', () => {
    const s = h1('sled_push');
    expect(realizeHyroxStation(s, { ...common, completion: 'completed_as_prescribed', stationId: 'sled_push', result: { achieved: TEST.sledM - 10 } }).ok).toBe(false);
    expect(realizeHyroxStation(s, { ...common, completion: 'modified', stationId: 'sled_push', result: { achieved: TEST.sledM - 10 } }).ok).toBe(true);
    expect(realizeHyroxStation(s, { ...common, completion: 'abandoned', stationId: 'sled_push', result: { achieved: 20 } })).toMatchObject({ ok: true, value: { completion: 'abandoned', result: { kind: 'abandoned', achieved: 20 } } });
  });

  it('charge : autre charge que prescrite ⇒ pas « telle que prescrite » ; charge saisie sur une station sans charge ⇒ refus', () => {
    expect(realizeHyroxStation(h1('sled_push'), { ...common, completion: 'completed_as_prescribed', stationId: 'sled_push', result: { achieved: TEST.sledM, actualLoadKg: TEST.sledKg - 10 } }).ok).toBe(false);
    expect(realizeHyroxStation(h1('sled_push'), { ...common, completion: 'modified', stationId: 'sled_push', result: { achieved: TEST.sledM, actualLoadKg: TEST.sledKg - 10 } }).ok).toBe(true);
    expect(realizeHyroxStation(h1('skierg'), { ...common, completion: 'modified', stationId: 'skierg', result: { achieved: TEST.skiM, actualLoadKg: 10 } }).ok).toBe(false);
  });

  it('frontière du moteur : l’historique est validé dans le contexte H1 (transporté, non exploité) ; un historique malformé est refusé', () => {
    const r = realizeHyroxStation(h1('skierg'), { ...common, completion: 'completed_as_prescribed', stationId: 'skierg', result: { achieved: TEST.skiM } });
    if (!r.ok) throw new Error('réalisation attendue');
    expect(zHyroxContext.parse({ ...hrCtx(), sessionHistory: [r.value] }).sessionHistory).toEqual([r.value]);
    expect(zHyroxContext.safeParse({ ...hrCtx(), sessionHistory: [{ ...r.value, result: { kind: 'completed' } }] }).success).toBe(false);
    // Même prescription H1 avec ou sans historique : aucune progression HYROX inventée.
    const run = (h: unknown[]) => runHyroxH1(createHyroxEngine({ simulation: true }), hrRequest({ ...hrCtx({ requestedStation: 'skierg' }), sessionHistory: h } as never, 1800), coreContext('hr-exec', hyroxRuleset({ doses: DOSES_WITH_CAL }), hyroxCatalog()));
    const a = run([]);
    const b = run([r.value]);
    expect(a.result.status === 'ok' && b.result.status === 'ok' && b.result.value.blocks).toEqual(a.result.status === 'ok' ? a.result.value.blocks : null);
  });
});

describe('Cross-training C2 : réalisation au contrat C2', () => {
  const c2 = (): SessionDraft => {
    const w = planMultisportWeek(input([want('crosstraining', 1)]), ALL_PORTS(), plannerGovernance(), clock);
    const r = w.requests[0];
    if (r?.status !== 'planned') throw new Error('séance C2 attendue');
    return r.session;
  };
  const workS = (s: SessionDraft) => { const p = s.blocks[0]?.items[0]?.prescription; return p?.type === 'timed' ? p.workS : 0; };

  it('telle que prescrite : prescription continue lue dans la séance, résultat total séparé, complétion du contrat C2', () => {
    const s = c2();
    const r = realizeCrossTrainingC2(s, { ...common, completion: 'completed_as_prescribed', stimulus: 'mixed_modal_medium', tolerance: 'tolerated', result: { durationS: workS(s) } });
    expect(r).toMatchObject({ ok: true, value: { completion: 'completed_as_prescribed', prescription: { format: 'continuous', durationS: workS(s) }, result: { kind: 'total', durationS: workS(s) }, pain: 'NONE', tolerance: 'tolerated' } });
  });

  it('modified ⇒ « completed » ; abandoned ⇒ résultat abandonné ; durée réalisée manquante « telle que prescrite » ⇒ refus ; stimulus hors contrat ⇒ refus', () => {
    const s = c2();
    expect(realizeCrossTrainingC2(s, { ...common, completion: 'modified', stimulus: 'mixed_modal_medium', result: { durationS: 60 } })).toMatchObject({ ok: true, value: { completion: 'completed' } });
    expect(realizeCrossTrainingC2(s, { ...common, completion: 'abandoned', stimulus: 'mixed_modal_medium' })).toMatchObject({ ok: true, value: { completion: 'abandoned', result: { kind: 'abandoned' } } });
    expect(realizeCrossTrainingC2(s, { ...common, completion: 'completed_as_prescribed', stimulus: 'mixed_modal_medium', result: {} }).ok).toBe(false);
    expect(realizeCrossTrainingC2(s, { ...common, completion: 'completed_as_prescribed', stimulus: 'stim.crosstraining.metcon', result: { durationS: workS(s) } }).ok).toBe(false);
  });
});
