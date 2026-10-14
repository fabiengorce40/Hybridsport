/**
 * Retour terrain RC1 TEST : le chrono démarre à 1:00 après une série de MONTÉE EN CHARGE alors que l'exercice affiche
 * un repos de 2:30. Comportement PRÉVU : la montée en charge a son propre repos (paramètre gouverné
 * `strength.rampup.restS`), distinct du repos des séries de travail (dose). Ces tests verrouillent que chaque validation
 * démarre le chrono sur le repos prescrit de LA série validée, que la nature de la série est conservée pour
 * l'affichage, et que le chrono survit à l'enregistrement / rechargement. Aucune règle sportive n'est testée ici.
 */
import { describe, expect, it } from 'vitest';
import { controlRest, loadState, recordProgrammeSet, restRemainingS, saveState, selectBeta0Week, selectProgrammeSession, startProgrammeSession } from '../../src/index.js';
import type { AppState, KeyValueStorage, ProfileInput } from '../../src/index.js';
import { at, create, massProfile } from '../strength-fixes/sf-fixtures.js';

const GOALS = ['strength', 'hypertrophy', 'general'] as const;
const memory = (): KeyValueStorage => { const m = new Map<string, string>(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); } }; };

/** Première séance Musculation dont un exercice comporte des séries de montée en charge. */
function rampupCase(goal: (typeof GOALS)[number]) {
  const p = { ...massProfile({ multisport: false }), strength: { enabled: true, goal, sessionsPerWeek: 3 } } as ProfileInput;
  const s0 = create(p);
  for (const v of (selectBeta0Week(s0, '2026-10-05')?.sessions ?? []).filter((x) => x.sport === 'strength')) {
    if (v.date === null) continue;
    const s = startProgrammeSession(s0, at(`${v.date}T18:00:00.000Z`), v.requestId);
    const item = selectProgrammeSession(s, v.requestId)?.session.blocks.flatMap((b) => b.items)
      .find((i) => i.prescription.type === 'sets' && i.prescription.sets.some((x) => x.kind === 'rampup') && i.prescription.sets.some((x) => x.kind !== 'rampup'));
    const date: string = v.date;
    if (item?.prescription.type === 'sets') return { s, id: v.requestId, date, item, sets: item.prescription.sets };
  }
  throw new Error(`aucune montée en charge (${goal})`);
}
const T = (date: string, hms: string) => at(`${date}T${hms}.000Z`);
const restOf = (s: AppState, id: string) => { const r = s.programmeLogs[id]?.rest; if (!r) throw new Error('aucun chrono'); return r; };

describe('repos montée en charge vs séries de travail (retour terrain RC1 TEST)', () => {
  for (const goal of GOALS) {
    it(`${goal} : repos de montée ≠ repos de travail, tous deux PRESCRITS par le moteur`, () => {
      const { sets } = rampupCase(goal);
      const ramp = sets.filter((x) => x.kind === 'rampup').map((x) => x.restAfterS);
      const work = sets.filter((x) => x.kind !== 'rampup').map((x) => x.restAfterS);
      expect(new Set(ramp).size).toBe(1);
      expect(ramp[0]).toBeGreaterThan(0);
      expect(Math.min(...work.filter((x) => x > 0))).toBeGreaterThan(ramp[0] ?? 0);
    });

    it(`${goal} : chaque validation démarre le chrono sur le repos de LA série validée`, () => {
      const c = rampupCase(goal);
      let s = c.s;
      let minute = 1;
      c.sets.forEach((set, setIndex) => {
        const hms = `18:${String(minute).padStart(2, '0')}:00`;
        minute += 4;
        s = recordProgrammeSet(s, T(c.date, hms), c.id, { itemId: c.item.id, setIndex, done: true, reps: typeof set.reps === 'number' ? set.reps : set.reps.max, loadKg: 40 });
        if (set.restAfterS === 0) return;
        const r = restOf(s, c.id);
        expect(r.totalS).toBe(set.restAfterS);
        expect(r.setKind).toBe(set.kind === 'rampup' ? 'rampup' : 'working');
        expect(r.exerciseId).toBe(c.item.exerciseId);
        expect(restRemainingS(r, `${c.date}T${hms}Z`)).toBe(set.restAfterS);
      });
    });
  }

  it('montée en charge : chrono conservé (durée, nature, échéance) après enregistrement et rechargement, pause et +15 s', () => {
    const c = rampupCase('strength');
    const iRamp = c.sets.findIndex((x) => x.kind === 'rampup');
    const ramp = c.sets[iRamp]?.restAfterS ?? 0;
    let s = recordProgrammeSet(c.s, T(c.date, '18:01:00'), c.id, { itemId: c.item.id, setIndex: iRamp, done: true, reps: 8, loadKg: 30 });
    const storage = memory();
    expect(saveState(storage, s)).toEqual({ ok: true });
    const loaded = loadState(storage, `${c.date}T18:01:20Z`);
    expect(loaded.status).toBe('ok');
    expect(loaded.state.programmeLogs[c.id]?.rest).toEqual(s.programmeLogs[c.id]?.rest);
    expect(restRemainingS(restOf(loaded.state, c.id), `${c.date}T18:01:20Z`)).toBe(ramp - 20);
    s = controlRest(loaded.state, T(c.date, '18:01:30'), c.id, 'pause');
    expect(restOf(s, c.id)).toMatchObject({ setKind: 'rampup', pausedRemainingS: ramp - 30, totalS: ramp });
    s = controlRest(s, T(c.date, '18:02:00'), c.id, 'extend');
    s = controlRest(s, T(c.date, '18:02:00'), c.id, 'resume');
    expect(restOf(s, c.id).setKind).toBe('rampup');
    expect(restRemainingS(restOf(s, c.id), `${c.date}T18:02:00Z`)).toBe(ramp - 30 + 15);
  });

  it('série de travail validée APRÈS la montée : le chrono de montée est remplacé par le repos de travail (persisté)', () => {
    const c = rampupCase('strength');
    const iRamp = c.sets.findIndex((x) => x.kind === 'rampup');
    const iWork = c.sets.findIndex((x) => x.kind !== 'rampup');
    const work = c.sets[iWork]?.restAfterS ?? 0;
    let s = recordProgrammeSet(c.s, T(c.date, '18:01:00'), c.id, { itemId: c.item.id, setIndex: iRamp, done: true, reps: 8, loadKg: 30 });
    s = recordProgrammeSet(s, T(c.date, '18:02:00'), c.id, { itemId: c.item.id, setIndex: iWork, done: true, reps: 5, loadKg: 60 });
    const storage = memory();
    saveState(storage, s);
    const r = restOf(loadState(storage, `${c.date}T18:03:00Z`).state, c.id);
    expect(r).toMatchObject({ totalS: work, setKind: 'working', exerciseId: c.item.exerciseId });
    expect(restRemainingS(r, `${c.date}T18:03:00Z`)).toBe(work - 60);
  });

  it('état enregistré AVANT ce champ (chrono sans « setKind ») : relu tel quel, sans erreur', () => {
    const c = rampupCase('strength');
    const s = recordProgrammeSet(c.s, T(c.date, '18:01:00'), c.id, { itemId: c.item.id, setIndex: 0, done: true, reps: 8, loadKg: 30 });
    const { setKind: _k, ...legacy } = restOf(s, c.id);
    const old: AppState = { ...s, programmeLogs: { ...s.programmeLogs, [c.id]: { ...(s.programmeLogs[c.id] as NonNullable<AppState['programmeLogs'][string]>), rest: legacy } } };
    const storage = memory();
    expect(saveState(storage, old)).toEqual({ ok: true });
    const loaded = loadState(storage, `${c.date}T18:01:10Z`);
    expect(loaded.status).toBe('ok');
    expect(loaded.state.programmeLogs[c.id]?.rest).toEqual(legacy);
  });
});
