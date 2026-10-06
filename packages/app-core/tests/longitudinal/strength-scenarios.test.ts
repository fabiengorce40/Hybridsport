/**
 * Strength — scénarios longitudinaux de 4 semaines par le chemin réel de l'application (aucune séance injectée) :
 * A. Strength seul : hypertrophie, 4 séances / semaine, intermédiaire, salle complète ;
 * B. Strength + Running, priorité explicite (Strength puis Running), planificateur et moteur Running réels.
 * Rapports coach régénérés dans `__reports__/` (toMatchFileSnapshot) ; saisies de réalisation TEST_ONLY (s3-scenario.ts).
 */
import { describe, expect, it } from 'vitest';
import { createBeta0Programme, emptyState } from '../../src/index.js';
import type { AppState } from '../../src/index.js';
import { clock, profile } from '../fixtures.js';
import { drive, recordOf, report } from './s3-scenario.js';
import type { WeekRun } from './s3-scenario.js';

const W = ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'] as const;

const strengthOnly = (): AppState => createBeta0Programme(emptyState(), profile({
  priorities: ['strength'], strength: { enabled: true, goal: 'hypertrophy', sessionsPerWeek: 4 }, availability: [60, 60, 60, 60, 60, 0, 0],
}), clock(W[0]), {});
// technical-constant: TEST_ONLY — dernière course déclarée à l'inscription (durée s, distance m)
const LAST_RUN = { realizedDurationS: 1800, distanceM: 5000 };
const hybrid = (): AppState => createBeta0Programme(emptyState(), profile({
  priorities: ['strength', 'running'], strength: { enabled: true, goal: 'hypertrophy', sessionsPerWeek: 3 },
  running: { enabled: true, population: 'P_R2', goal: 'HALF_MARATHON', wearable: false, sessionsPerWeek: 3, returnState: 'NONE' },
  availability: [60, 45, 60, 45, 60, 90, 75],
}), clock(W[0]), { lastRun: { ...LAST_RUN, difficulty: 'AS_EXPECTED' } });

type Run = { final: AppState; weeks: WeekRun[] };
const strengthItems = (wk: WeekRun) => wk.week.requests.filter((r) => r.sport === 'strength' && r.status === 'planned').sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? -1 : 1))
  .map((r) => ({ r, arch: r.intent?.archetypeId ?? '', rec: recordOf(r) }));
const audit = (run: Run) => (run.final.programmeState?.audit ?? []).map((a) => a.reason);

/** Invariants longitudinaux S3 communs aux deux scénarios. */
function invariants(run: Run) {
  // 1. Graine STABLE : même archétype, même rang dans la semaine ⇒ même graine chaque semaine.
  const seeds = new Map<string, Set<string>>();
  for (const wk of run.weeks) {
    const occ = new Map<string, number>();
    for (const { arch, rec } of strengthItems(wk)) {
      const n = (occ.get(arch) ?? 0) + 1;
      occ.set(arch, n);
      const k = `${arch}#${n}`;
      seeds.set(k, new Set([...(seeds.get(k) ?? []), rec?.provenance.seed ?? '']));
    }
  }
  for (const [k, s] of seeds) expect([k, s.size]).toEqual([k, 1]);
  // 2. Une ancre active n'est jamais remplacée : l'exercice de chaque track d'ancre active est celui de son emplacement
  //    dans toute séance de son archétype planifiée après sa création (stabilité des exercices principaux).
  for (const t of run.final.strength.tracks.filter((x) => x.tier === 'anchor' && x.status === 'active')) {
    for (const wk of run.weeks.filter((x) => x.weekStart > t.openedAt.slice(0, 10))) {
      for (const { arch, rec } of strengthItems(wk).filter((x) => x.arch === t.archetypeId)) {
        const it = rec?.session.blocks.flatMap((b) => b.items).find((i) => i.refs?.slotId === t.slotId);
        if (it) expect([wk.weekStart, arch, t.slotId, it.exerciseId]).toEqual([wk.weekStart, arch, t.slotId, t.exerciseId]);
      }
    }
  }
  // 3. Une track n'est jamais déclarée « candidate » indéfiniment : dès la 2e semaine, les ancres actives sont déclarées.
  for (const wk of run.weeks.slice(1)) {
    for (const { r } of strengthItems(wk)) expect(r.reasons.some((x) => x.code === 'PLAN.WEEK_PRESCRIPTION')).toBe(true);
  }
  // 4. Aucune charge suivie ne baisse sans décision de régression tracée.
  const regressed = audit(run).filter((r) => r.code === 'PROGRESSION.REGRESSED').map((r) => r.params.trackId);
  const loadsOf = new Map<string, number[]>();
  for (const wk of run.weeks) for (const { rec } of strengthItems(wk)) for (const it of rec?.session.blocks.flatMap((b) => b.items) ?? []) {
    const id = it.refs?.progressionTrackId;
    const s = it.prescription.type === 'sets' ? it.prescription.sets.find((x) => x.kind !== 'rampup') : undefined;
    if (id && s?.intensity?.mode === 'load') loadsOf.set(id, [...(loadsOf.get(id) ?? []), s.intensity.kg]);
  }
  for (const [id, kgs] of loadsOf) if (!regressed.includes(id)) expect([id, kgs]).toEqual([id, [...kgs].sort((a, b) => a - b)]);
}

describe('Strength — scénario A : Strength seul, 4 semaines', () => {
  const run = drive(strengthOnly(), W, (w, _r, k) => (w === 2 && k === 3 ? 'last_set_missed' : 'as_prescribed'));

  it('composition : 2 Haut du corps + 2 Bas du corps chaque semaine (règle candidate S1, inchangée)', () => {
    for (const wk of run.weeks) expect(strengthItems(wk).map((x) => x.arch).sort()).toEqual(['str_lower', 'str_lower', 'str_upper', 'str_upper']);
  });

  it('invariants : graine stable, ancres conservées, aucune baisse de charge non tracée', () => invariants(run));

  it('ancres créées à la 1re semaine puis DÉCLARÉES et appliquées ; progression réelle appliquée et tracée', () => {
    const anchors = run.final.strength.tracks.filter((t) => t.tier === 'anchor');
    expect(anchors.length).toBeGreaterThan(0);
    for (const wk of run.weeks.slice(1)) {
      const declared = strengthItems(wk).flatMap(({ rec }) => rec?.session.blocks.flatMap((b) => b.items).filter((i) => i.refs?.anchor === 'declared') ?? []);
      expect(declared.length).toBeGreaterThan(0);
    }
    const a = audit(run);
    expect(a.some((r) => r.code === 'PROGRESSION.ADVANCED' && r.params.variable === 'reps')).toBe(true);
    expect(a.some((r) => r.code === 'PROGRESSION.ADVANCED' && r.params.variable === 'load')).toBe(true);
    // Série manquée (séance modifiée, semaine 3) : classée par le moteur, jamais lue comme « comme prescrit ».
    const w3 = run.weeks[2]?.executed.find((e) => e.event === 'last_set_missed');
    expect(w3?.audit.some((r) => r.code === 'PROGRESSION.EXPOSURE_CLASSIFIED' && r.params.exposure !== 'on_target' && r.params.exposure !== 'above') ?? false).toBe(true);
  });

  it('rapport coach (4 semaines)', async () => {
    await expect(report(run, {
      title: 'Strength (S4) — Scénario A : Strength seul, hypertrophie, 4 séances / semaine, intermédiaire, salle complète',
      intro: [
        'Chemin réel : createBeta0Programme → ensureBeta0Week → Global Planner → StrengthEngine → recordSessionExecution → closeProgrammeWeekInApp.',
        'Réalisations TEST_ONLY : comme prescrit (répétitions = borne haute, charge prescrite, RIR cible) ; charge de première exposition 40 kg (TEST_ONLY) ;',
        'semaine 3, 4e séance : dernière série du premier exercice non réalisée (séance « modifiée »). ⚓ = ancre déclarée (exercice maintenu, progression appliquée).',
        'Colonne « Exercice » : comparaison avec la dernière séance du même archétype ayant le même emplacement ; « critère » = critère décisif du moteur.',
      ],
    })).toMatchFileSnapshot('__reports__/strength-scenario-a.md');
  });
});

describe('Strength — scénario B : Strength + Running (priorité Strength puis Running), 4 semaines', () => {
  const run = drive(hybrid(), W);

  it('planificateur et moteurs réels : Strength et Running planifiés chaque semaine, aucune séance injectée', () => {
    for (const wk of run.weeks) {
      const sports = wk.week.requests.filter((r) => r.status === 'planned').map((r) => r.sport);
      expect(sports.filter((x) => x === 'strength').length).toBeGreaterThan(0);
      expect(sports.filter((x) => x === 'running').length).toBeGreaterThan(0);
      // Toute séance réalisée est une séance planifiée de la semaine.
      for (const e of wk.executed) expect(wk.week.requests.some((r) => r.requestId === e.requestId && r.status === 'planned')).toBe(true);
    }
  });

  it('invariants : graine stable, ancres conservées, aucune baisse de charge non tracée', () => invariants(run));

  it('interaction Running : les voisines Running parviennent au moteur Strength (seconde passe), décisions tracées', () => {
    const strength = run.weeks.flatMap((wk) => strengthItems(wk));
    expect(strength.some(({ r }) => (r.neighbourContext?.neighbours.length ?? 0) > 0)).toBe(true);
  });

  it('rapport coach (4 semaines)', async () => {
    await expect(report(run, {
      title: 'Strength (S4) — Scénario B : Strength (3 / semaine, hypertrophie) + Running (3 / semaine, semi-marathon), priorité Strength',
      intro: [
        'Chemin réel : createBeta0Programme (dernière course déclarée TEST_ONLY) → ensureBeta0Week → Global Planner (deux passes, voisines) → StrengthEngine + RunningEngine.',
        'Réalisations TEST_ONLY : Strength comme prescrit ; Running durée prescrite, 6 000 m. ⚓ = ancre déclarée.',
      ],
    })).toMatchFileSnapshot('__reports__/strength-scenario-b.md');
  });
});
