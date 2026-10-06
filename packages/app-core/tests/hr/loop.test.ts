/**
 * H2.5 — BOUCLE MOTEUR → TERRAIN → MOTEUR, par le chemin RÉEL de l'application (aucun mock d'historique) :
 *   H2 compose A (programme Beta 0) → A persistée → A ouverte, exécutée (chrono, étapes, charge réelle) → résultat
 *   enregistré → rechargement → historique → semaine suivante : H2 compose B → B reçoit A (réalisation lue depuis l'état)
 *   → décisions de B influencées par A (variété, mémoire négative), et ce qui ne l'est pas faute de politique.
 * Rapport : __reports__/h25-loop.md.
 */
import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { clearPain, controlHrTimer, ensureBeta0Week, finishProgrammeSession, recordHrLoad, selectHistory, selectProgrammeSession, setHrSteps, startProgrammeSession } from '../../src/index.js';
import type { AppState } from '../../src/index.js';
import { at, create, decisions, hrProfile, hrSessions, MON2, reload, workoutOf } from './hr-fixtures.js';

const fmt = (v: unknown) => JSON.stringify(v);
/** Samedi de la semaine 1 et lundi de la semaine 2 (fenêtre de récence H2 TEST_ONLY : 7 jours). */
const SAT1 = '2026-10-10';

function describeSession(s: AppState, id: string, title: string): string[] {
  const w = workoutOf(s, id);
  const v = selectProgrammeSession(s, id);
  return [
    `### ${title}`, '',
    `- Rôle : \`${v?.archetypeId ?? '—'}\` (${w?.specificity ?? '—'}) · date ${v?.date ?? '—'} · structure \`${w?.structure ?? '—'}\` · ${String(w?.rounds)} tour(s) · time cap ${String(w?.timeCapS)} s`,
    `- Composantes (un tour) : ${(w?.components ?? []).map((c) => `${c.kind === 'run' ? `course ${String(c.dose.value)} m (${c.runContext ?? ''}, allure non prescrite)` : `${c.exerciseId} ${String(c.dose.value)} ${c.dose.kind}${c.loadKg !== undefined ? ` @ ${String(c.loadKg)} kg` : ''}`}`).join(' → ')}`,
    `- Historique vu par H2 : ${fmt(decisions(s, id, 'H2_HISTORY')[0])}`,
    ...decisions(s, id, 'H2_STRUCTURE_CHOSEN').map((d) => `- Structure : ${fmt(d)}`),
    ...decisions(s, id, 'H2_STATION_SELECTED').map((d) => `- Station ${String(d.position)} : ${String(d.stationId)} (${fmt(d.criteria)})`),
    ...decisions(s, id, 'H2_HISTORY_NEGATIVE').map((d) => `- Mémoire négative : ${fmt(d)}`),
    '',
  ];
}

const plannedHr = (s: AppState, now?: string) => hrSessions(s, now).filter((x) => x.status === 'planned');

describe('H2.5 — moteur → terrain → moteur', () => {
  const lines: string[] = ['# H2.5 — boucle moteur → terrain → moteur (HYROX)', '', '> Chemin réel app-core (Beta 0 expérimental, gouvernance H2 TEST_ONLY). Aucun historique simulé.', ''];

  it('A réalisée (charge réelle ≠ prescrite, pause, rechargement) ⇒ B la voit : stations de A évitées (contrefactuel sans A : reprises)', () => {
    let s = create(hrProfile());
    const A = plannedHr(s)[0];
    if (!A?.date) throw new Error('séance A attendue');
    const day = A.date;
    lines.push(...describeSession(s, A.requestId, 'A — composée par H2 (semaine 1)'));
    const w = workoutOf(s, A.requestId);
    if (!w) throw new Error('séance H2 lisible attendue');
    const loaded = w.components.find((c) => c.kind === 'station' && c.loadKg !== undefined);
    // Exécution réelle (le soir) : étapes validées une à une, pause, rechargement, reprise, charge réelle, fin.
    s = startProgrammeSession(s, at(`${day}T18:00:00.000Z`), A.requestId);
    for (let k = 1; k <= 3; k += 1) s = setHrSteps(s, A.requestId, k);
    s = controlHrTimer(s, at(`${day}T18:12:00.000Z`), A.requestId, 'pause');
    s = reload(s, `${day}T18:20:00.000Z`);
    expect(s.programmeLogs[A.requestId]?.hr).toMatchObject({ steps: 3, runningSince: null, accumulatedS: 720 });
    s = controlHrTimer(s, at(`${day}T18:20:00.000Z`), A.requestId, 'resume');
    if (loaded?.loadKg !== undefined) s = recordHrLoad(s, A.requestId, loaded.itemId, loaded.loadKg - 4);
    s = setHrSteps(s, A.requestId, w.steps.length);
    s = finishProgrammeSession(s, at(`${day}T18:44:00.000Z`), { requestId: A.requestId, completion: 'modified', pain: false, hr: { timeCapReached: false } });
    s = reload(s, `${day}T19:00:00.000Z`);
    const realized = s.hyrox.realized.find((r) => r.sessionId === A.requestId);
    expect(realized).toMatchObject({ role: 'compromised_running', completion: 'completed', result: { kind: 'completed', elapsedS: 2160 } });
    if (loaded?.loadKg !== undefined) expect(realized?.performedLoads).toEqual([{ itemId: loaded.itemId, kg: loaded.loadKg - 4 }]);
    expect(selectHistory(s).find((e) => e.requestId === A.requestId)?.hr?.result).toMatchObject({ kind: 'completed' });
    lines.push(`- Résultat réel de A : ${fmt(realized?.result)} · charges réelles ${fmt(realized?.performedLoads ?? [])} · pause de 8 min exclue du chrono`, '');
    // Semaine suivante : ouverture de l'application (clôture S1, planification S2) → B.
    const counterfactual = ensureBeta0Week({ ...s, hyrox: { realized: [] } }, at(MON2));
    s = ensureBeta0Week(s, at(MON2));
    const B = plannedHr(s, MON2)[0];
    const B0 = plannedHr(counterfactual, MON2)[0];
    if (!B || !B0) throw new Error('séance B attendue');
    lines.push(...describeSession(s, B.requestId, 'B — composée par H2 (semaine 2), en connaissance de A'));
    const seen = decisions(s, B.requestId, 'H2_HISTORY')[0];
    const aStations = [...new Set(w.steps.flatMap((x) => (x.stationId ? [x.stationId] : [])))];
    expect(seen?.sameRole).toBeGreaterThanOrEqual(1);
    for (const st of aStations) expect(seen?.recentStations).toContain(st);
    const bStations = decisions(s, B.requestId, 'H2_STATION_SELECTED').map((d) => String(d.stationId));
    const b0Stations = decisions(counterfactual, B0.requestId, 'H2_STATION_SELECTED').map((d) => String(d.stationId));
    expect(bStations.some((x) => aStations.includes(x))).toBe(false);
    // Contrefactuel : MÊME état sans la réalisation de A ⇒ H2 reprend les stations de A. La différence vient de A.
    expect(b0Stations.some((x) => aStations.includes(x))).toBe(true);
    // Aucune progression : la distance de course de B est la distance gouvernée, comme dans A.
    expect(workoutOf(s, B.requestId)?.components.find((c) => c.kind === 'run')?.dose).toEqual(w.components.find((c) => c.kind === 'run')?.dose);
    lines.push(
      `- **Influencé par A** : B lit A (${String(seen?.sameRole)} séance(s) du rôle dans la fenêtre, stations récentes ${fmt(seen?.recentStations)}) et choisit des stations fraîches : ${bStations.join(', ')}. Contrefactuel (même état SANS la réalisation de A) : ${b0Stations.join(', ')}.`,
      '- **Non influencé (aucune politique gouvernée)** : doses et distance de course identiques (aucune progression), charge réelle de A non lue pour prescrire (aucune adaptation H3), temps réalisé non interprété, structure imposée par le rôle.', '',
    );
  });

  it('A abandonnée ⇒ politique H2 (TEST_ONLY) : B écarte les stations de A, décision persistée', () => {
    let s = create(hrProfile());
    const A = plannedHr(s).find((x) => x.date === SAT1);
    if (!A) throw new Error('séance A attendue');
    s = startProgrammeSession(s, at(`${SAT1}T08:00:00.000Z`), A.requestId);
    s = setHrSteps(s, A.requestId, 2);
    s = finishProgrammeSession(s, at(`${SAT1}T08:15:00.000Z`), { requestId: A.requestId, completion: 'abandoned', pain: false });
    expect(s.hyrox.realized[0]).toMatchObject({ completion: 'abandoned', result: { kind: 'abandoned', roundsCompleted: 0, itemsCompletedInRound: 2 } });
    s = ensureBeta0Week(reload(s, `${SAT1}T09:00:00.000Z`), at(MON2));
    const B = plannedHr(s, MON2)[0];
    if (!B) throw new Error('séance B attendue');
    const neg = decisions(s, B.requestId, 'H2_HISTORY_NEGATIVE')[0];
    expect(neg).toMatchObject({ sessionId: A.requestId, causes: ['abandoned'], action: 'exclude_stations' });
    const aStations = decisions(s, A.requestId, 'H2_STATION_SELECTED').map((d) => d.stationId);
    const bStations = decisions(s, B.requestId, 'H2_STATION_SELECTED').map((d) => d.stationId);
    for (const st of aStations) expect(bStations).not.toContain(st);
    lines.push('### Variante — A abandonnée', '', `- Résultat de A : ${fmt(s.hyrox.realized[0]?.result)}`, `- Décision persistée de B : ${fmt(neg)}`, `- Stations de A : ${aStations.join(', ')} ; stations de B : ${bStations.join(', ')} (aucune en commun)`, '');
  });

  it('A avec douleur ⇒ pause douleur (système central) ; après levée, H2 refuse EXPLICITEMENT (politique TEST_ONLY « refuse »)', () => {
    let s = create(hrProfile());
    const A = plannedHr(s).find((x) => x.date === SAT1);
    if (!A) throw new Error('séance A attendue');
    s = startProgrammeSession(s, at(`${SAT1}T08:00:00.000Z`), A.requestId);
    s = setHrSteps(s, A.requestId, 1);
    s = finishProgrammeSession(s, at(`${SAT1}T08:10:00.000Z`), { requestId: A.requestId, completion: 'abandoned', pain: true });
    expect(s.hyrox.realized[0]).toMatchObject({ pain: 'REPORTED', completion: 'abandoned' });
    expect(s.safety.activePain?.sessionKey).toBe(A.requestId);
    s = reload(s, `${SAT1}T09:00:00.000Z`);
    // Semaine 2 ouverte pendant la pause douleur : rien n'est planifié.
    const paused = ensureBeta0Week(s, at(MON2));
    expect(hrSessions(paused, MON2)).toEqual([]);
    // Levée explicite par l'utilisateur, puis ouverture : H2 voit la douleur de A et refuse (fail-closed, tracé).
    s = ensureBeta0Week(clearPain(paused, at(MON2)), at(MON2));
    const w2 = hrSessions(s, MON2);
    expect(w2.length).toBeGreaterThan(0);
    expect(w2.filter((x) => x.date === null || x.date <= '2026-10-17').every((x) => x.status === 'not_planned')).toBe(true);
    const neg = (s.planner.weeks['2026-10-12']?.requests ?? []).flatMap((r) => r.reasons).find((r) => r.code === 'SAFETY.HYROX.H2_HISTORY_NEGATIVE');
    expect(neg?.params).toMatchObject({ sessionId: A.requestId, causes: expect.arrayContaining(['pain']), action: 'refuse' });
    lines.push('### Variante — douleur', '', `- A : abandon + douleur (\`REPORTED\`) → pause douleur centrale.`, `- Après levée : séances HYROX de la semaine 2 refusées explicitement : ${fmt(neg?.params)}`, '');
    const path = new URL('./__reports__/h25-loop.md', import.meta.url).pathname;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, lines.join('\n'));
  });
});
