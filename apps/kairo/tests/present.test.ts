/** Présentation Beta 0 : libellés des archétypes Strength composés par le moteur et refus de composition expliqué. */
import { describe, expect, it } from 'vitest';
import type { SessionView } from '@hybridsport/app-core';
import { checkInReasonsText, notPlannedText, roleName, sessionName } from '../src/present.js';

describe('présentation Strength S1', () => {
  it('libellés lisibles des archétypes composés (aucun identifiant technique) ; le rôle de rotation n’est pas affiché', () => {
    expect(['str_full_body', 'str_upper', 'str_lower'].map((a) => sessionName('strength', a))).toEqual(['Full body', 'Haut du corps', 'Bas du corps']);
    expect(roleName('ROTATION')).toBeNull();
  });

  it('composition Strength non gouvernée : explication compréhensible (Course : message générique inchangé)', () => {
    const v = (sport: 'strength' | 'running'): SessionView => ({
      requestId: 'r', sport, date: null, status: 'not_planned', targetDurationS: null, estimatedDurationS: null, archetypeId: null, dataError: null, role: null, ctFormat: null, hrTimeCapS: null, compositionAuthority: null, compositionRule: null, pain: false, arbitration: null, globalPlacement: null, placement: 'blocked', unplacedCause: null, manual: false, quality: null, composition: null, repeatFlagged: false, mainExercises: [],
      notPlanned: { category: 'governance_blocked', display: 'governance_blocked', reason: { code: 'RULE.PLANNER.COMPOSITION_UNRESOLVED', params: {} }, triedDate: null },
    });
    expect(notPlannedText(v('strength'))).toMatch(/réduisez la fréquence de musculation/);
    expect(notPlannedText(v('running'))).toBe('Les règles nécessaires pour planifier cette séance ne sont pas encore disponibles.');
  });

  it('RC3.1 A8 — donnée manquante : « une information manque » + quoi saisir ; jamais « règles indisponibles »', () => {
    const v = (sport: 'running' | 'hyrox', display: string, reason: { code: string; params: Record<string, unknown> }, category = 'governance_blocked'): SessionView => ({
      requestId: 'r', sport, date: null, status: 'not_planned', targetDurationS: null, estimatedDurationS: null, archetypeId: null, dataError: null, role: null, ctFormat: null, hrTimeCapS: null, compositionAuthority: null, compositionRule: null, pain: false, arbitration: null, globalPlacement: null, placement: 'blocked', unplacedCause: null, manual: false, quality: null, composition: null, repeatFlagged: false, mainExercises: [],
      notPlanned: { category, display, reason, triedDate: null },
    });
    const anchor = notPlannedText(v('running', 'missing_data', { code: 'DOSE.RUNNING.DOSE_ANCHOR_UNAVAILABLE', params: { cause: 'NO_REALIZED_SESSION' } }));
    // REKKA — information nommée, raison, ce qui suffit (une sortie ordinaire) et demande conservée.
    expect(anchor).toBe('Une information manque pour construire cette séance. Il manque votre dernière course réelle (durée, et si possible distance et date) : le footing reprend ce que vous avez vraiment couru, sans durée inventée. Une sortie d’entraînement suffit, aucun test maximal n’est nécessaire. La séance reste en attente et sera planifiée dès que cette course sera enregistrée.');
    expect(anchor).not.toMatch(/règles/);
    expect(notPlannedText(v('running', 'missing_data', { code: 'DOSE.RUNNING.TEST_REFUSED', params: { cause: 'OBSERVED_PACE_UNAVAILABLE' } }))).toMatch(/course récente avec sa distance/);
    const tried = (t: string) => ({ code: 'PLAN.HYROX.H2_NO_STRUCTURE', params: { role: 'x', tried: [t] } });
    expect(notPlannedText(v('hyrox', 'engine_refused', tried('run_station_alternation:3x2:EXCEEDS_AVAILABLE_TIME'), 'engine_refused'))).toMatch(/temps disponible ce jour-là : augmentez/);
    expect(notPlannedText(v('hyrox', 'engine_refused', tried('run_station_alternation:3x2:STATIONS_UNFILLED:1/2'), 'engine_refused'))).toMatch(/matériel déclaré/);
  });

  it('RC3.1 A1 — état du jour sur la séance prévue : effort allégé expliqué, série en moins non appliquée signalée, refus par exercice en clair', () => {
    const t = checkInReasonsText([
      { code: 'KAIRO.CHECKIN_READINESS_PERSISTED', params: { requestId: 'r', readiness: 'reduce', rirDelta: 1, adjusted: 3, covered: 0, refused: 1, setsDeltaNotApplied: -1 } },
      { code: 'KAIRO.CHECKIN_READINESS_EXERCISE_REFUSED', params: { requestId: 'r', exerciseId: 'ex.bench_press', cause: 'load_derived_from_effort' } },
    ]);
    expect(t[0]).toMatch(/effort visé allégé sur la séance prévue \(mêmes exercices, séries et charges\)\. La règle prévoit aussi une série de moins : elle n’est pas appliquée/);
    expect(t[1]).toMatch(/: effort non ajusté \(sa charge est calculée à partir de l’effort : elle n’est jamais modifiée ici\)\.$/);
    expect(t.join(' ')).not.toMatch(/load_derived|KAIRO/);
    expect(checkInReasonsText([{ code: 'KAIRO.CHECKIN_ADAPTATION_NOT_APPLIED', params: { cause: 'readiness_not_applicable_persisted' } }])[0]).toMatch(/aucun exercice de cette séance ne peut être allégé sans changer sa charge/);
  });
});
