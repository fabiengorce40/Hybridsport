/**
 * RC4.5 (D2, R-A) — diagnostic de reproductibilité : classes distinctes, indicateur des divergences du planificateur,
 * lecture seule. Parcours réel (profil de consolidation, 4 semaines) : diagnostic juste avant chaque séance Musculation
 * (les séances antérieures de la semaine sont réalisées), comme au démarrage.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { beta0Environment, diagnoseReproducibility, ensureBeta0Week, finishProgrammeSession, recordProgrammeSet, regenerateSession, selectBeta0Week, selectProgrammeSession, sessionChanges, startProgrammeSession, UNKNOWN_CORE_STATE, weekReproducibility } from '../../src/index.js';
import type { AppState, SessionReproducibility } from '../../src/index.js';
import { MONS, PROFILE } from '../consolidation/sim4.js';
import { at, create } from '../strength-fixes/sf-fixtures.js';

const env = beta0Environment();
const T = (d: string, hm = '18:00') => `${d}T${hm}:00.000Z`;
// technical-constant: TEST_ONLY — charge saisie illustrative
const KG = 40;

interface Step { readonly diag: SessionReproducibility; readonly startPathReproducible: boolean; readonly stateUnchanged: boolean }
function journey(): { steps: Step[]; weeks: ReturnType<typeof weekReproducibility>[] } {
  let s: AppState = create(PROFILE, T(MONS[0] as string, '07:30'));
  const steps: Step[] = [];
  const weeks: ReturnType<typeof weekReproducibility>[] = [];
  for (const [w, mon] of MONS.entries()) {
    if (w > 0) s = ensureBeta0Week(s, at(T(mon, '07:30')));
    weeks.push(weekReproducibility(s, mon, env, 'strength'));
    for (const v of (selectBeta0Week(s, mon)?.sessions ?? []).filter((x) => x.placement === 'planned' && x.date && x.sport === 'strength').sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? -1 : 1))) {
      const before = JSON.stringify(s);
      const diag = diagnoseReproducibility(s, v.requestId, env);
      const stateUnchanged = JSON.stringify(s) === before;
      // Garde des chemins de démarrage (inchangée) : régénération sur l'état courant.
      const planned = selectProgrammeSession(s, v.requestId)?.session;
      const base = regenerateSession(s, v.requestId, UNKNOWN_CORE_STATE, env);
      const startPathReproducible = base.status === 'planned' && planned !== undefined && sessionChanges(planned, base.record.session).length === 0;
      steps.push({ diag, startPathReproducible, stateUnchanged });
      const d = v.date as string;
      let x = startProgrammeSession(s, at(T(d)), v.requestId, env, { painAnswer: 'no', fatigue: 'low', recovery: 'good' });
      for (const b of selectProgrammeSession(x, v.requestId)?.session.blocks ?? []) for (const it of b.items) if (it.prescription.type === 'sets') it.prescription.sets.forEach((p, i) => { x = recordProgrammeSet(x, at(T(d, '18:20')), v.requestId, { itemId: it.id, setIndex: i, done: true, reps: typeof p.reps === 'number' ? p.reps : p.reps.min, loadKg: KG }); });
      s = finishProgrammeSession(x, at(T(d, '19:15')), { requestId: v.requestId, completion: 'completed_as_prescribed', pain: false } as never);
    }
  }
  return { steps, weeks };
}

describe('RC4.5 R-A — diagnostic de reproductibilité', () => {
  const { steps, weeks } = journey();

  it('lecture seule : l’état n’est jamais modifié par le diagnostic', () => {
    expect(steps.every((x) => x.stateUnchanged)).toBe(true);
  });

  it('cohérent avec la garde des chemins de démarrage (inchangée) : « contenu identique maintenant » ⇔ classes identical / progression', () => {
    for (const x of steps) expect(x.startPathReproducible, x.diag.requestId).toBe(x.diag.class === 'identical' || x.diag.class === 'progression_since_planning');
  });

  it('classes distinctes et indicateur des divergences du planificateur (profil de consolidation, 12 séances)', () => {
    const by = (c: string) => steps.filter((x) => x.diag.class === c).map((x) => x.diag.requestId);
    expect(steps).toHaveLength(12);
    expect(by('history_since_planning')).toEqual(['2026-10-05.strength.2', '2026-10-05.strength.3']);
    // RC4.6 (B4) — entrées croisées persistées : les 6 divergences du planificateur d'avant B4 (blocs de force Cross-training
    // relus dans leur version FINALE au lieu de la version lue) disparaissent ; preuve du repli : rc46/b4-cross-inputs.test.ts.
    // RC5.3 R4 — les expositions à prescription modifiée réalisées SANS RIR saisi (signal inexploitable) ne font plus
    // progresser la track : les séances 2 des semaines 3 et 4 restent identiques à leur planification.
    expect(by('identical')).toEqual(['2026-10-05.strength.1', '2026-10-12.strength.1', '2026-10-19.strength.1', '2026-10-19.strength.2', '2026-10-26.strength.1', '2026-10-26.strength.2']);
    expect(by('progression_since_planning')).toEqual(['2026-10-12.strength.2', '2026-10-12.strength.3', '2026-10-19.strength.3', '2026-10-26.strength.3']);
    expect(by('planner_divergence')).toEqual([]);
    // Une divergence du planificateur persiste depuis l'état de planification ; un écart d'historique non.
    for (const x of steps.filter((y) => y.diag.class === 'planner_divergence')) expect(x.diag.changesAtPlanning.length).toBeGreaterThan(0);
    for (const x of steps.filter((y) => y.diag.class === 'history_since_planning')) { expect(x.diag.changesNow.length).toBeGreaterThan(0); expect(x.diag.changesAtPlanning).toEqual([]); }
  });

  it('indicateur de semaine à la planification (aucune séance réalisée) : aucun écart d’historique, divergences du planificateur seules', () => {
    // Mesuré : dès la planification (aucune séance de la semaine réalisée), les divergences sont exactement celles
    // classées « planificateur » au démarrage : elles ne dépendent pas de l'historique de la semaine.
    const atPlanning = weeks.flatMap((w) => w.sessions.filter((x) => x.class === 'planner_divergence').map((x) => x.requestId));
    expect(atPlanning).toEqual(steps.filter((x) => x.diag.class === 'planner_divergence').map((x) => x.diag.requestId));
    for (const w of weeks) {
      expect(w.counts.history_since_planning).toBe(0);
      expect(w.counts.progression_since_planning + w.counts.identical + w.plannerDivergences + w.counts.not_regenerable).toBe(w.sessions.length);
      expect(w.contentReproducible).toBe(w.sessions.length - w.plannerDivergences - w.counts.not_regenerable);
    }
  });

  it('diagnostic seulement : aucun module de l’application (chemins de démarrage compris) ne l’utilise', () => {
    const dir = new URL('../../src/', import.meta.url);
    const users = readdirSync(dir).filter((f) => f.endsWith('.ts') && f !== 'reproducibility.ts' && f !== 'index.ts' && /reproducibility\.js|diagnoseReproducibility|weekReproducibility/.test(readFileSync(new URL(f, dir), 'utf8')));
    expect(users).toEqual([]);
  });
});
