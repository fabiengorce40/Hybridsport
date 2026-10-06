/**
 * C3.5 — BOUCLE MOTEUR → TERRAIN → MOTEUR, par le chemin RÉEL de l'application (aucun mock d'historique) :
 *   C3 compose A (programme Beta 0) → A persistée → A exécutée (chrono, tours, résultat structuré) → rechargement →
 *   semaine suivante : C3 compose B → B reçoit A (historique réalisé lu depuis l'état) → décisions de B influencées par A.
 * Rapport : __reports__/c35-loop.md.
 */
import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { controlCtTimer, ensureBeta0Week, recordCtProgress, selectHistory, selectProgrammeSession, startProgrammeSession, finishProgrammeSession } from '../../src/index.js';
import type { AppState } from '../../src/index.js';
import { at, create, ctSessions, decisions, fullGym, MON1, MON2, profile, reload } from './ct-fixtures.js';

const fmt = (v: unknown) => JSON.stringify(v);
const request0 = (s: AppState, id: string) => decisions(s, id, 'C3_FORMAT_REJECTED');
function describeSession(s: AppState, id: string, title: string): string[] {
  const v = selectProgrammeSession(s, id);
  const block = v?.session.blocks.find((b) => b.kind === 'conditioning');
  const chosen = decisions(s, id, 'C3_FORMAT_CHOSEN')[0];
  return [
    `### ${title}`, '',
    `- Intention : \`${v?.archetypeId ?? '—'}\` · date ${v?.date ?? '—'}`,
    `- Format : \`${block?.format ?? '—'}\` (${fmt(chosen?.criteria)})`,
    `- Mouvements : ${(block?.items ?? []).map((i) => `${i.exerciseId} ${fmt(i.prescription)}`).join(' ; ')}`,
    `- Historique vu par C3 : ${fmt(decisions(s, id, 'C3_HISTORY')[0])}`,
    ...decisions(s, id, 'C3_FORMAT_REJECTED').map((d) => `- Format écarté : ${fmt(d)}`),
    ...decisions(s, id, 'C3_MOVEMENT_SELECTED').map((d) => `- Mouvement : ${String(d.role)} → ${String(d.exerciseId)} (${fmt(d.criteria)})`),
    ...decisions(s, id, 'C3_HISTORY_NEGATIVE').map((d) => `- Historique négatif : ${fmt(d)}`),
    '',
  ];
}

describe('C3.5 — moteur → terrain → moteur', () => {
  const lines: string[] = ['# C3.5 — boucle moteur → terrain → moteur', '', '> Chemin réel app-core (Beta 0 expérimental, gouvernance C3 TEST_ONLY). Aucun historique simulé.', ''];

  it('A terminée (AMRAP) ⇒ B la voit et diffère (format le moins récemment utilisé, mouvements frais)', () => {
    let s = create();
    const A = ctSessions(s)[0];
    if (!A) throw new Error('séance A attendue');
    lines.push(...describeSession(s, A.requestId, 'A — composée par C3 (semaine 1)'));
    // Exécution réelle : départ 07:30, 2 tours, 5 répétitions, pause / reprise, fin 07:45.
    s = startProgrammeSession(s, at(MON1), A.requestId);
    s = recordCtProgress(s, A.requestId, { rounds: 2 });
    s = recordCtProgress(s, A.requestId, { partialReps: 5 });
    s = controlCtTimer(s, at('2026-10-05T07:35:00.000Z'), A.requestId, 'pause');
    s = reload(s, '2026-10-05T07:36:00.000Z');
    s = controlCtTimer(s, at('2026-10-05T07:37:00.000Z'), A.requestId, 'resume');
    const result = { kind: 'rounds_reps', rounds: 2, reps: 5 };
    s = finishProgrammeSession(s, at('2026-10-05T07:45:00.000Z'), { requestId: A.requestId, completion: 'completed_as_prescribed', pain: false, ct: { result } });
    s = reload(s, '2026-10-05T08:00:00.000Z');
    const realized = s.crosstraining.realized[0];
    expect(realized).toMatchObject({ sessionId: A.requestId, stimulus: 'mixed_modal_medium', result, completion: 'completed_as_prescribed', pain: 'NONE' });
    expect(selectHistory(s)[0]?.ct?.result).toEqual(result);
    lines.push(`- Résultat réel de A : ${fmt(realized?.result)} · chrono ${String(s.programmeLogs[A.requestId]?.outcome?.ct?.elapsedS)} s (pause d'1 min exclue)`, '');
    // Semaine suivante : ouverture de l'application (clôture S1, planification S2) → B.
    s = ensureBeta0Week(s, at(MON2));
    const B = ctSessions(s, MON2)[0];
    if (!B) throw new Error('séance B attendue');
    lines.push(...describeSession(s, B.requestId, 'B — composée par C3 (semaine 2), en connaissance de A'));
    const seen = decisions(s, B.requestId, 'C3_HISTORY')[0];
    const aMoves = (selectProgrammeSession(s, A.requestId)?.session.blocks[0]?.items ?? []).map((i) => i.exerciseId);
    expect(seen?.sameStimulus).toBeGreaterThanOrEqual(1);
    for (const m of aMoves) expect(seen?.recentMovements).toContain(m);
    const bFormat = selectProgrammeSession(s, B.requestId)?.session.blocks[0]?.format;
    expect(bFormat).not.toBe(selectProgrammeSession(s, A.requestId)?.session.blocks[0]?.format);
    expect(decisions(s, B.requestId, 'C3_FORMAT_CHOSEN')[0]?.criteria).toContain('not_used_in_window');
    lines.push(`- **Influence de A sur B** : B lit A (${String(seen?.sameStimulus)} séance(s) du stimulus, mouvements récents ${fmt(seen?.recentMovements)}), choisit un format non utilisé dans la fenêtre (\`${String(bFormat)}\`, critère \`not_used_in_window\`).`, '');
  });

  it('A abandonnée ⇒ politique C3 (TEST_ONLY) : B écarte les mouvements de A, décision persistée', () => {
    // Salle complète + SkiErg : une alternative monostructurale existe (sinon : voir le test suivant).
    let s = create(profile({ equipment: [...fullGym, 'skierg'] }));
    const A = ctSessions(s)[0];
    if (!A) throw new Error('séance A attendue');
    s = startProgrammeSession(s, at(MON1), A.requestId);
    s = finishProgrammeSession(s, at('2026-10-05T07:40:00.000Z'), { requestId: A.requestId, completion: 'abandoned', pain: false });
    expect(s.crosstraining.realized[0]).toMatchObject({ completion: 'abandoned', result: { kind: 'abandoned' } });
    s = ensureBeta0Week(reload(s, '2026-10-05T08:00:00.000Z'), at(MON2));
    const B = ctSessions(s, MON2)[0];
    if (!B) throw new Error('séance B attendue');
    const neg = decisions(s, B.requestId, 'C3_HISTORY_NEGATIVE')[0];
    expect(neg).toMatchObject({ sessionId: A.requestId, causes: ['abandoned'], action: 'exclude_movements' });
    const aMoves = (selectProgrammeSession(s, A.requestId)?.session.blocks[0]?.items ?? []).map((i) => i.exerciseId);
    const bMoves = (selectProgrammeSession(s, B.requestId)?.session.blocks[0]?.items ?? []).map((i) => i.exerciseId);
    for (const m of aMoves) expect(bMoves).not.toContain(m);
    lines.push('### Variante — A abandonnée', '', `- Décision persistée de B : ${fmt(neg)}`, `- Mouvements de A : ${aMoves.join(', ')} ; mouvements de B : ${bMoves.join(', ')} (aucun en commun)`, '');
  });

  it('TERRAIN : abandon + catalogue pauvre ⇒ semaine suivante refusée EXPLICITEMENT ; levée à la fin de la fenêtre de récence', () => {
    let s = create();
    const A = ctSessions(s)[0];
    if (!A) throw new Error('séance A attendue');
    s = startProgrammeSession(s, at(MON1), A.requestId);
    s = finishProgrammeSession(s, at('2026-10-05T07:40:00.000Z'), { requestId: A.requestId, completion: 'abandoned', pain: false });
    s = ensureBeta0Week(s, at(MON2));
    const refused = ctSessions(s, MON2);
    expect(refused.every((x) => x.status === 'not_planned' && x.notPlanned?.category === 'engine_refused')).toBe(true);
    const neg = decisions(s, refused[0]?.requestId ?? '', 'C3_HISTORY_NEGATIVE')[0] ?? request0(s, refused[0]?.requestId ?? '');
    lines.push('### Terrain — abandon avec la salle complète Beta 0 (rameur seul ergomètre)', '', `- Semaine 2 : ${String(refused.length)} séance(s) CT refusée(s) explicitement (\`engine_refused\`, formats écartés tracés) : ${fmt(neg)}`);
    // Semaine 4 (au-delà de la fenêtre TEST_ONLY de 14 j) : l'abandon n'a plus d'effet, la composition reprend.
    s = ensureBeta0Week(s, at('2026-10-26T07:30:00.000Z'));
    const w4 = ctSessions(s, '2026-10-26T07:30:00.000Z');
    expect(w4.some((x) => x.status === 'planned')).toBe(true);
    lines.push(`- Semaine 4 (fenêtre de récence dépassée) : ${String(w4.filter((x) => x.status === 'planned').length)} séance(s) planifiée(s).`, '');
    const path = new URL('./__reports__/c35-loop.md', import.meta.url).pathname;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, lines.join('\n'));
  });
});
