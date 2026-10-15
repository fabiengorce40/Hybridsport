/**
 * RC4 — scénarios REPRODUCTIBLES des anomalies de l'audit sportif (docs/kairo/RC4-AUDIT.md). Lecture seule : chaque
 * test fige le comportement ACTUEL constaté (moteurs, planificateur et app-core inchangés). Une correction RC4 fera
 * échouer le test correspondant, qui sera alors réécrit avec le comportement attendu et validé.
 */
import { describe, expect, it, vi } from 'vitest';

// Simulations de 4 à 6 semaines par le chemin réel : délai par test élargi.
vi.setConfig({ testTimeout: 120_000 });
import {
  createBeta0Programme, emptyState, ensureBeta0Week, EQUIPMENT_PRESETS, finishProgrammeSession, hyroxRoleFeasibility, selectBeta0Week, selectProgrammeSession, startProgrammeSession,
} from '../../src/index.js';
import type { AppState, Clock, ProfileInput } from '../../src/index.js';
import { MONS, PROFILES, simulate } from './rc4-sim.js';

const spec = (id: string) => {
  const p = PROFILES.find((x) => x.id === id);
  if (!p) throw new Error(id);
  return p;
};
const ck = (d: string, hm = '08:00'): Clock => ({ today: d, now: `${d}T${hm}:00Z` });
const runStructures = (s: AppState, mon: string) => (selectBeta0Week(s, mon)?.sessions ?? []).filter((x) => x.sport === 'running').map((x) => {
  const p = selectProgrammeSession(s, x.requestId)?.session.blocks.flatMap((b) => b.items).find((i) => i.prescription.type === 'run_structure')?.prescription;
  if (p?.type !== 'run_structure') return `${x.status}`;
  return p.segments.map((g) => (g.kind === 'repeat' ? `${String(g.reps)}×${'durationS' in g.work ? String(g.work.durationS) : '?'}s` : `${g.kind}:${'durationS' in g.dose ? String(g.dose.durationS) : `${String(g.dose.distanceM)}m`}`)).join('+');
});

describe('F1 (RC4.1) — Course : le ressenti déclaré en fin de séance pilote la progression', () => {
  const p = spec('P4').profile;
  type Difficulty = 'EASIER' | 'AS_EXPECTED' | 'HARDER' | 'MUCH_HARDER';
  /** 4 semaines par le chemin Beta 0 réel (`finishProgrammeSession`) : toutes les courses faites comme prévu. */
  function run4(difficulty: Difficulty | null): AppState {
    let s = createBeta0Programme(emptyState(), p, ck(MONS[0], '07:00'), { lastRun: { realizedDurationS: 1800, difficulty: 'AS_EXPECTED', distanceM: 5000 }, requestTest: true });
    for (const [w, mon] of MONS.slice(0, 4).entries()) {
      if (w > 0) s = ensureBeta0Week(s, ck(mon, '06:00'));
      for (const v of (selectBeta0Week(s, mon)?.sessions ?? []).filter((x) => x.sport === 'running' && x.date !== null && x.placement === 'planned')) {
        const d = v.date ?? mon;
        s = startProgrammeSession(s, ck(d), v.requestId, undefined, { painAnswer: 'no' });
        const test = v.archetypeId === 'running.test';
        const run = { realizedDurationS: v.targetDurationS ?? 1800, distanceM: 6000, ...(test ? { testTimeS: 1500 } : {}) };
        s = finishProgrammeSession(s, ck(d, '09:00'), { requestId: v.requestId, completion: 'completed_as_prescribed', pain: false, run, ...(difficulty ? { difficulty } : {}) });
      }
    }
    return ensureBeta0Week(s, ck(MONS[4], '06:00'));
  }
  const programmeRuns = (s: AppState) => s.running.realized.filter((x) => !x.sessionId.startsWith('free:'));

  it('« comme prévu » : valeur persistée au contrat Running ; seuil et footings progressent après deux séances bien tolérées', () => {
    const s = run4('AS_EXPECTED');
    expect(programmeRuns(s).every((x) => x.unexpectedDifficulty === 'AS_EXPECTED')).toBe(true);
    expect(runStructures(s, MONS[4])).not.toEqual(runStructures(s, MONS[1]));
  });

  it('« plus facile que prévu » : même progression (séance tolérée)', () => {
    expect(runStructures(run4('EASIER'), MONS[4])).toEqual(runStructures(run4('AS_EXPECTED'), MONS[4]));
  });

  it('question ignorée : ressenti INCONNU, aucune progression artificielle (comportement antérieur conservé)', () => {
    const s = run4(null);
    expect(programmeRuns(s).every((x) => x.unexpectedDifficulty === 'UNKNOWN')).toBe(true);
    expect(runStructures(s, MONS[4])).toEqual(runStructures(s, MONS[1]));
  });

  it('« plus difficile » : aucune progression (séance non tolérée)', () => {
    const s = run4('HARDER');
    expect(programmeRuns(s).every((x) => x.unexpectedDifficulty === 'HARDER')).toBe(true);
    expect(runStructures(s, MONS[4])).not.toEqual(runStructures(run4('AS_EXPECTED'), MONS[4]));
  });
});

describe('F2 — Course libre longue : elle devient la dose des footings et vide la semaine suivante', () => {
  it('P4 : 80 min libres le dimanche ⇒ semaines suivantes : 2 courses sur 3 non planifiées (TIME_EXCEEDED), mode entretien, séance clé perdue', () => {
    const r = simulate(spec('P4'), 5);
    const w4 = selectBeta0Week(r.state, MONS[3])?.sessions.filter((x) => x.sport === 'running') ?? [];
    expect(w4.filter((x) => x.notPlanned?.reason?.code === 'PLAN.RUNNING.TIME_EXCEEDED')).toHaveLength(2);
    expect(w4.filter((x) => x.status !== 'not_planned').map((x) => x.archetypeId)).toEqual(['running.easy']);
    const key = r.state.planner.weeks[MONS[3]]?.requests.find((q) => q.sport === 'running' && q.status === 'planned');
    expect(key?.reasons.some((x) => x.code === 'PLAN.RUNNING.WEEK_MAINTENANCE_MODE')).toBe(true);
    // Témoin : sans la course libre, la semaine garde ses trois courses, seuil compris.
    const ref = simulate({ ...spec('P4'), freeRuns: [] }, 4);
    expect((selectBeta0Week(ref.state, MONS[3])?.sessions ?? []).filter((x) => x.sport === 'running').map((x) => x.archetypeId)).toEqual(['running.threshold', 'running.easy', 'running.easy']);
  });
});

describe('F3 — Charge des courses libres ignorée par les autres sports', () => {
  it('Musculation du lundi identique avec ou sans 90 min de course libre la veille', () => {
    const base = { ...spec('P2'), checkIn: undefined };
    const a = simulate({ ...base, freeRuns: [] }, 2);
    const b = simulate({ ...base, freeRuns: [{ week: 0, day: '2026-10-11', durationS: 5400, distanceM: 15000 }] }, 2);
    const mon = (r: ReturnType<typeof simulate>) => r.sessions.filter((x) => x.week === 2 && x.sport === 'strength').map((x) => ({ d: x.date, red: x.reductions, g: x.groups }));
    expect(b.state.running.realized).toHaveLength(1);
    expect(mon(b)).toEqual(mon(a));
  });
});

describe('F4 / F5 / F6 — Volume Musculation (objectif prise de masse)', () => {
  const avg = (r: ReturnType<typeof simulate>, g: string) => r.weeks.reduce((n, w) => n + (w.volume.find((x) => x.group === g)?.planned ?? 0), 0) / r.weeks.length;
  it('F4 : bas du corps sacrifié par la course voisine (P1) ; sans course (P2), proche de la cible', () => {
    const p1 = simulate(spec('P1'));
    const p2 = simulate(spec('P2'));
    expect(avg(p1, 'quads')).toBeLessThan(5);
    expect(avg(p2, 'quads')).toBeGreaterThan(10);
    expect(p1.sessions.filter((x) => x.sport === 'strength' && x.reductions.some((y) => y.startsWith('running@') && y.includes(':lower_knee:full'))).length).toBeGreaterThan(10);
    expect(p1.weeks.every((w) => w.volumeStatus === 'partially_satisfied')).toBe(true);
  });
  it('F5 : bras au-dessus de la borne haute signalés « atteints » (aucun statut de dépassement)', () => {
    const p2 = simulate(spec('P2'), 2);
    const arms = p2.weeks[1]?.volume.find((x) => x.group === 'arms');
    expect(arms?.planned).toBeGreaterThan(arms?.high ?? Infinity);
    expect(arms?.status).toBe('achieved');
  });
  it('F6 : mollets jamais programmés (0 série toutes les semaines, avec ou sans autre sport)', () => {
    for (const id of ['P1', 'P1b', 'P2', 'P3', 'P5']) expect(simulate(spec(id), 3).weeks.every((w) => (w.volume.find((x) => x.group === 'calves')?.planned ?? 0) === 0)).toBe(true);
  }, 120_000);
});

describe('F7 / F8 — Progression et variation Musculation', () => {
  it('F7 : exercice principal à répétitions fixes, effort déclaré RIR cible + 2 pendant 6 semaines ⇒ 2 paliers de 2,5 kg seulement', () => {
    const r = simulate({ ...spec('P2'), rirOffset: 2 });
    const loads = [...new Set(r.sessions.filter((x) => x.sport === 'strength').flatMap((x) => x.exercises.filter((e) => e.id === 'back_squat').map((e) => e.load)))];
    expect(loads).toEqual(['effort', '40 kg', '42.5 kg']);
  });
  it('F8 : variation intra-semaine perdue après la semaine 1 (Haut/Bas : même séance deux fois)', () => {
    const r = simulate(spec('P1b'), 3);
    expect(r.sessions.filter((x) => x.week === 1 && x.sport === 'strength').map((x) => `${x.archetype ?? ''}${x.variant ?? ''}`)).toEqual(['str_upperA', 'str_lowerA', 'str_upperB', 'str_lowerB']);
    expect(r.sessions.filter((x) => x.week === 3 && x.sport === 'strength').map((x) => `${x.archetype ?? ''}${x.variant ?? ''}`)).toEqual(['str_upperA', 'str_lowerA', 'str_upperA', 'str_lowerA']);
  });
});

describe('F9 / F10 / F11 — Organisation de la semaine multisport', () => {
  const days = (r: ReturnType<typeof simulate>, w: number) => new Set(r.sessions.filter((x) => x.week === w && x.date).map((x) => x.date)).size;
  it('F9 : Full Body à J et J+1 chaque semaine (mercredi–jeudi), jours libres disponibles', () => {
    const r = simulate(spec('P2'), 3);
    for (const w of [1, 2, 3]) {
      const d = r.sessions.filter((x) => x.week === w && x.sport === 'strength').map((x) => Date.parse(x.date ?? ''));
      expect(d.some((x, i) => i > 0 && x - (d[i - 1] ?? 0) === 86_400_000)).toBe(true);
    }
  });
  it('F10 : quatre sports, 7 jours disponibles ⇒ 7 jours d’entraînement sur 7, six semaines de suite', () => {
    const r = simulate(spec('P5'));
    for (const w of [1, 2, 3, 4, 5, 6]) expect(days(r, w)).toBe(7);
  });
  it('F11 : conflits multisport détectés mais laissés en place chaque semaine (aucun jour libre) ; CT la veille du seuil signalé une semaine sur deux seulement', () => {
    const r = simulate(spec('P5'));
    for (const w of [1, 2, 3, 4, 5, 6]) expect(r.sessions.some((x) => x.week === w && x.arbitration?.startsWith('conflict'))).toBe(true);
    const ct = r.sessions.filter((x) => x.sport === 'crosstraining');
    const pairs = r.sessions.filter((x) => x.archetype === 'running.threshold' && ct.some((c) => c.date && x.date && Date.parse(x.date) - Date.parse(c.date) === 86_400_000));
    expect(pairs.length).toBeGreaterThanOrEqual(4);
    expect(pairs.filter((x) => x.arbitration === null).length).toBeGreaterThan(0);
    expect(pairs.filter((x) => x.arbitration?.startsWith('conflict')).length).toBeGreaterThan(0);
  });
});

describe('F12 (RC4.2) — HYROX : restrictions de niveau, de matériel et de temps annoncées par la sonde du moteur', () => {
  const hyroxProfile = (level: ProfileInput['level']): ProfileInput => ({
    ...spec('P3').profile, level, priorities: ['hyrox'], strength: { enabled: false, goal: 'general', sessionsPerWeek: 2 },
    hyrox: { enabled: true, sessionsPerWeek: 3, focus: 'balanced', goal: 'RACE_PREPARATION', returnState: 'NONE' } as ProfileInput['hyrox'],
    equipment: { presetId: 'preset.hybrid_race_gym', items: [...(EQUIPMENT_PRESETS.find((x) => x.id === 'preset.hybrid_race_gym')?.equipment ?? [])], confirmedAt: '2026-10-04T10:00:00Z' },
  });
  it('débutant : moteur inchangé (aucune séance, LEVEL_NOT_ELIGIBLE) ET la sonde l’annonce pour chaque type, attribué au niveau', () => {
    const s = createBeta0Programme(emptyState(), hyroxProfile('beginner'), ck(MONS[0], '07:00'), {});
    expect((selectBeta0Week(s, MONS[0])?.sessions ?? []).map((x) => x.notPlanned?.reason?.code)).toEqual(['SAFETY.HYROX.LEVEL_NOT_ELIGIBLE', 'SAFETY.HYROX.LEVEL_NOT_ELIGIBLE', 'SAFETY.HYROX.LEVEL_NOT_ELIGIBLE']);
    const f = hyroxRoleFeasibility(hyroxProfile('beginner'), ck(MONS[0]));
    expect(f.every((c) => c.status === 'infeasible' && c.factors.join() === 'level')).toBe(true);
  });
  it('avancé : un rôle sur trois toujours refusé par le moteur (inchangé) ; la sonde annonce les types impossibles et leur restriction', () => {
    const s = createBeta0Programme(emptyState(), hyroxProfile('advanced'), ck(MONS[0], '07:00'), {});
    const blocked = (selectBeta0Week(s, MONS[0])?.sessions ?? []).filter((x) => x.notPlanned?.reason?.code === 'PLAN.HYROX.H2_NO_STRUCTURE');
    expect(blocked).toHaveLength(1);
    const ko = hyroxRoleFeasibility(hyroxProfile('advanced'), ck(MONS[0])).filter((c) => c.status === 'infeasible');
    expect(ko.map((c) => `${c.role.split('.').pop() ?? ''}:${c.factors.join('+')}`)).toEqual(['mixed_station_conditioning:equipment', 'compromised_running:time']);
    expect(ko.map((c) => c.role)).toContain(`hybrid_race.h2.${String(blocked[0]?.notPlanned?.reason?.params.role)}`);
  });
});

describe('F13 — Cross-training et HYROX sans progression sur 6 semaines', () => {
  it('mêmes contenus HYROX à rôle égal (capacité stations : 5 × SkiErg, cap 15 min en S1, S3, S5)', () => {
    const r = simulate(spec('P3'));
    const cap = r.sessions.filter((x) => x.archetype === 'hybrid_race.h2.station_capacity').map((x) => x.content);
    expect(new Set(cap).size).toBe(1);
  });
  it('Cross-training : le contenu du samedi est identique d’une semaine sur l’autre (for time, mêmes mouvements)', () => {
    const r = simulate(spec('P2'));
    const sat = r.sessions.filter((x) => x.sport === 'crosstraining' && x.ctFormat === 'for_time').map((x) => x.content?.split(' | ').find((b) => b.startsWith('conditioning')));
    expect(sat.length).toBeGreaterThanOrEqual(5);
    expect(new Set(sat.slice(1)).size).toBe(1);
  });
});
