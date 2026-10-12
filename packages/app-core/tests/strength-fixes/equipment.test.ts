/**
 * P1 — matériel : exercices vérifiés contre le matériel DÉCLARÉ sur tous les préréglages (deux semaines, masse 3 et
 * 4 séances), machines jamais supposées, confirmation d'un profil antérieur sans rien écraser, « Matériel
 * indisponible » : substitut direct du contrat Strength (sans transfert de charge) ou refus explicite.
 */
import { describe, expect, it } from 'vitest';
import { confirmEquipment, ensureBeta0Week, EQUIPMENT_PRESETS, equipmentNeedsConfirmation, finishProgrammeSession, recordProgrammeSet, reportEquipmentUnavailable, selectHistory, selectProgrammeSession, startProgrammeSession, strengthContent } from '../../src/index.js';
import type { AppState } from '../../src/index.js';
import { at, code, create, eqOf, exercisesOf, massProfile, strengthIds } from './sf-fixtures.js';

const catalog = strengthContent().catalog;
const feasible = (ex: string, eq: readonly string[]) => { const e = catalog.exercise(ex); return e !== undefined && catalog.isFeasibleWith(e, new Set(eq)); };
const T = (d: string, hm = '18:00') => `${d}T${hm}:00.000Z`;

function twoWeeks(s0: AppState): AppState[] {
  return [s0, ensureBeta0Week(s0, at('2026-10-12T07:30:00.000Z'))];
}

describe('P1 — matériel', () => {
  it('1. tous les préréglages, masse 3 et 4 séances, deux semaines : chaque exercice est faisable avec le matériel DÉCLARÉ', () => {
    let checked = 0;
    for (const preset of EQUIPMENT_PRESETS) {
      for (const sessions of [3, 4]) {
        const p = massProfile({ sessions, multisport: sessions === 3, preset: preset.id });
        for (const [k, s] of twoWeeks(create(p)).entries()) {
          for (const id of strengthIds(s, k === 0 ? '2026-10-05' : '2026-10-12')) for (const ex of exercisesOf(s, id)) {
            checked += 1;
            expect({ preset: preset.id, ex, ok: feasible(ex, p.equipment.items) }).toMatchObject({ ok: true });
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
  }, 120_000);

  it('2. machines spécifiques jamais supposées : pec deck, élévations latérales machine, hack squat absents hors salle complète', () => {
    for (const preset of EQUIPMENT_PRESETS.filter((x) => x.id !== 'preset.full_gym')) {
      const s = create(massProfile({ sessions: 4, multisport: false, preset: preset.id }));
      const all = strengthIds(s).flatMap((id) => exercisesOf(s, id));
      expect(all.filter((e) => ['ex.pec_deck', 'ex.machine_lateral_raise', 'ex.hack_squat'].includes(e))).toEqual([]);
    }
  });

  it('3. profil antérieur sans confirmation : demande de confirmation ; confirmer ne change ni le matériel ni la planification', () => {
    const s0 = create(massProfile());
    expect(equipmentNeedsConfirmation(s0)).toBe(true);
    const s1 = confirmEquipment(s0, at(T('2026-10-05', '08:00')));
    expect(equipmentNeedsConfirmation(s1)).toBe(false);
    expect(s1.profile?.equipment.items).toEqual(s0.profile?.equipment.items);
    expect(s1.planner).toBe(s0.planner);
  });

  it('4. presse pectoraux machine indisponible ⇒ substitut DIRECT faisable sans la machine, sans charge transférée', () => {
    const s0 = create(massProfile({ preset: 'preset.commercial_gym' }));
    const id = strengthIds(s0).find((x) => exercisesOf(s0, x).includes('ex.machine_chest_press')) ?? '';
    expect(id).not.toBe('');
    const d = selectProgrammeSession(s0, id)?.date ?? '2026-10-05';
    let s = startProgrammeSession(s0, at(T(d)), id);
    const item = selectProgrammeSession(s, id)?.session.blocks.flatMap((b) => b.items).find((i) => i.exerciseId === 'ex.machine_chest_press');
    s = reportEquipmentUnavailable(s, at(T(d, '18:02')), id, item?.id ?? '');
    const swap = s.programmeLogs[id]?.swaps?.at(-1);
    expect(swap?.substituteId).toBeDefined();
    const sub = swap?.substituteId ?? '';
    expect(catalog.exercise(sub)?.equipment.allOf.includes('chest_press_machine')).toBe(false);
    expect(feasible(sub, eqOf('preset.commercial_gym').filter((x) => x !== 'chest_press_machine'))).toBe(true);
    const after = selectProgrammeSession(s, id)?.session.blocks.flatMap((b) => b.items).find((i) => i.id === item?.id);
    expect(after?.exerciseId).toBe(sub);
    expect(after?.refs).toMatchObject({ prescriptionSource: 'substitution', substitutedFrom: 'ex.machine_chest_press' });
    expect(JSON.stringify(after?.prescription)).not.toMatch(/"kg"|indicativeKg|kgRounded/);
    expect(after?.prescription.type === 'sets' && item?.prescription.type === 'sets' ? after.prescription.sets.length : -1).toBe(item?.prescription.type === 'sets' ? item.prescription.sets.length : -2);
  });

  it('5. exercice sans substitut déclaré ⇒ REFUS explicite tracé, exercice conservé ; après une série validée ⇒ refusé', () => {
    const s0 = create(massProfile({ sessions: 4, multisport: false, preset: 'preset.full_gym' }));
    const id = strengthIds(s0).find((x) => exercisesOf(s0, x).includes('ex.pec_deck')) ?? '';
    expect(id).not.toBe('');
    const d = selectProgrammeSession(s0, id)?.date ?? '2026-10-05';
    let s = startProgrammeSession(s0, at(T(d)), id);
    const items = selectProgrammeSession(s, id)?.session.blocks.flatMap((b) => b.items) ?? [];
    const pec = items.find((i) => i.exerciseId === 'ex.pec_deck');
    s = reportEquipmentUnavailable(s, at(T(d, '18:02')), id, pec?.id ?? '');
    const swap = s.programmeLogs[id]?.swaps?.at(-1);
    expect(swap?.substituteId).toBeUndefined();
    expect(swap?.reasons[0]).toMatchObject({ code: 'KAIRO.EQUIPMENT_NO_VALIDATED_SUBSTITUTE', params: { exerciseId: 'ex.pec_deck', cause: 'no_declared_substitute' } });
    expect(exercisesOf(s, id)).toContain('ex.pec_deck');
    const other = items.find((i) => i.prescription.type === 'sets' && i.id !== pec?.id);
    s = recordProgrammeSet(s, at(T(d, '18:05')), id, { itemId: other?.id ?? '', setIndex: 0, done: true, reps: 6, loadKg: 40 });
    expect(code(() => reportEquipmentUnavailable(s, at(T(d, '18:06')), id, other?.id ?? ''))).toBe('EQUIPMENT_SWAP_AFTER_SETS');
  });

  it('6. séance terminée avec un substitut : exposition Strength et historique au nom du substitut ; persistance', () => {
    const s0 = create(massProfile({ preset: 'preset.commercial_gym' }));
    const id = strengthIds(s0).find((x) => exercisesOf(s0, x).includes('ex.machine_chest_press')) ?? '';
    const d = selectProgrammeSession(s0, id)?.date ?? '2026-10-05';
    let s = startProgrammeSession(s0, at(T(d)), id);
    const item = selectProgrammeSession(s, id)?.session.blocks.flatMap((b) => b.items).find((i) => i.exerciseId === 'ex.machine_chest_press');
    s = reportEquipmentUnavailable(s, at(T(d, '18:02')), id, item?.id ?? '');
    const sub = s.programmeLogs[id]?.swaps?.at(-1)?.substituteId ?? '';
    for (const b of selectProgrammeSession(s, id)?.session.blocks ?? []) for (const it of b.items) if (it.prescription.type === 'sets') it.prescription.sets.forEach((p, i) => { s = recordProgrammeSet(s, at(T(d, '18:20')), id, { itemId: it.id, setIndex: i, done: true, reps: typeof p.reps === 'number' ? p.reps : p.reps.min, loadKg: 20 }); });
    s = finishProgrammeSession(s, at(T(d, '19:00')), { requestId: id, completion: 'completed_as_prescribed', pain: false });
    expect(s.strength.exposures.some((e) => e.exerciseId === sub)).toBe(true);
    expect(s.strength.exposures.some((e) => e.exerciseId === 'ex.machine_chest_press' && e.at.startsWith(d))).toBe(false);
    expect(selectHistory(s).find((h) => h.requestId === id)?.sets.some((x) => x.itemId === item?.id)).toBe(true);
  });
});
