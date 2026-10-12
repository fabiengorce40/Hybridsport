/**
 * C4 — séance Cross-training complète dans l'application (Beta 0 EXPÉRIMENTALE, gouvernance TEST_ONLY) : statut lu
 * dans la trace persistée, temps disponible 45 / 60 / 75 min, validation manuelle des blocs persistée (rechargement),
 * chrono du bloc principal démarré explicitement, résultat inchangé, quatre semaines, pause douleur.
 */
import { describe, expect, it } from 'vitest';
import { compactHistory, controlCtTimer, ctElapsedS, DROPPABLE_CODES, ensureBeta0Week, expandFoldedReasons, exportBetaJournal, finishProgrammeSession, HISTORY_COMPACTED, PROVENANCE_FOLDED, recordCtBlock, selectProgrammeSession, startProgrammeSession } from '../../src/index.js';
import type { AppState } from '../../src/index.js';
import { at, create, ctSessions, MON1, profile, reload, startCt, week } from './ct-fixtures.js';

const T = (hm: string) => `2026-10-05T${hm}:00.000Z`;
const code = (f: () => unknown): string => { try { f(); return 'OK'; } catch (e) { return (e as { code?: string }).code ?? String(e); } };
const viewOf = (s: AppState, id: string) => week(s)?.sessions.find((x) => x.requestId === id);
const c4Of = (s: AppState, id: string) => viewOf(s, id)?.composition?.c4 ?? null;

describe('C4 — application', () => {
  it.each([45, 60, 75])('1. %i min disponibles : statut explicite ; séance complète ⇒ durée planifiée ≤ disponible, blocs présents', (min) => {
    const s = create(profile({ availability: [min, 0, min, 0, min, 0, 0] }));
    const xs = ctSessions(s).filter((x) => x.placement === 'planned');
    expect(xs.length).toBeGreaterThan(0);
    for (const x of xs) {
      const c4 = x.composition?.c4;
      expect(c4).not.toBeNull();
      if (c4?.status === 'FULL_SESSION') {
        expect(c4.plannedDurationS).toBeLessThanOrEqual(min * 60);
        expect(c4.blocks.length).toBeGreaterThan(0);
        expect(x.composition?.scope).toBe('FULL_SESSION');
      } else expect(x.composition?.scope).toBe('TRAINING_BLOCK');
    }
  });

  it('1b. durée ESTIMÉE par le CORE (transitions comprises) exposée, ≥ durée planifiée des blocs, position / cible lue', () => {
    const s = create();
    for (const x of ctSessions(s).filter((y) => y.composition?.c4?.status === 'FULL_SESSION')) {
      const c4 = x.composition?.c4;
      expect(c4?.estimatedDurationS).toBe(x.estimatedDurationS);
      expect(c4?.estimatedDurationS ?? 0).toBeGreaterThanOrEqual(c4?.plannedDurationS ?? Infinity);
      expect(['below', 'within', 'above']).toContain(c4?.estimatedPosition);
    }
  });

  it('2. 30 min : jamais de séance complète hors temps (bloc principal seul, cause tracée)', () => {
    const s = create(profile({ availability: [30, 0, 30, 0, 30, 0, 0] }));
    for (const x of ctSessions(s).filter((y) => y.placement === 'planned')) {
      expect(x.composition?.c4?.status).not.toBe('FULL_SESSION');
      expect(x.composition?.scope).toBe('TRAINING_BLOCK');
    }
  });

  it('3. démarrage : chrono du bloc principal NON démarré pendant l’échauffement ; démarrage explicite ; résultat inchangé', () => {
    let s = create();
    const id = ctSessions(s).find((x) => c4Of(s, x.requestId)?.status === 'FULL_SESSION')?.requestId ?? '';
    s = startProgrammeSession(s, at(T('07:00')), id);
    expect(s.programmeLogs[id]?.ct).toMatchObject({ runningSince: null, accumulatedS: 0 });
    s = controlCtTimer(s, at(T('07:12')), id, 'resume');
    const rt = s.programmeLogs[id]?.ct;
    if (!rt) throw new Error('chrono attendu');
    expect(ctElapsedS(rt, T('07:20'))).toBe(480);
  });

  it('4. validation manuelle des blocs : persistée, rechargement conservé, dé-validation, bloc principal / inconnu refusés', () => {
    let s = create();
    const id = ctSessions(s).find((x) => c4Of(s, x.requestId)?.status === 'FULL_SESSION')?.requestId ?? '';
    const blocks = c4Of(s, id)?.blocks ?? [];
    expect(blocks.length).toBeGreaterThan(1);
    expect(code(() => recordCtBlock(s, id, blocks[0]?.blockId ?? '', true))).not.toBe('OK');
    s = startProgrammeSession(s, at(T('07:00')), id);
    const first = blocks[0]?.blockId ?? '';
    s = recordCtBlock(s, id, first, true);
    s = recordCtBlock(s, id, first, true);
    s = reload(s, T('07:05'));
    expect(s.programmeLogs[id]?.ct?.blocksDone).toEqual([first]);
    s = recordCtBlock(s, id, first, false);
    expect(s.programmeLogs[id]?.ct?.blocksDone).toEqual([]);
    const mainId = selectProgrammeSession(s, id)?.session.blocks.find((b) => b.kind === 'conditioning')?.id ?? '';
    expect(code(() => recordCtBlock(s, id, mainId, true))).toBe('CT_BLOCK_UNKNOWN');
    expect(code(() => recordCtBlock(s, id, 'inconnu', true))).toBe('CT_BLOCK_UNKNOWN');
  });

  it('5. fin de séance : résultat du bloc principal enregistré comme en C3 ; validations des blocs conservées', () => {
    let s = create();
    const id = ctSessions(s).find((x) => c4Of(s, x.requestId)?.status === 'FULL_SESSION')?.requestId ?? '';
    const first = c4Of(s, id)?.blocks[0]?.blockId ?? '';
    s = startCt(s, at(T('07:00')), id);
    s = recordCtBlock(s, id, first, true);
    const format = viewOf(s, id)?.ctFormat;
    const result = format === 'amrap' ? { kind: 'rounds_reps', rounds: 4, reps: 0 } : null;
    s = finishProgrammeSession(s, at(T('07:40')), { requestId: id, completion: result ? 'completed_as_prescribed' : 'abandoned', pain: false, ct: result ? { result } : {} });
    expect(s.crosstraining.realized.find((r) => r.sessionId === id)?.prescription).toMatchObject({ format });
    expect(s.programmeLogs[id]?.ct?.blocksDone).toEqual([first]);
  });

  it('6. quatre semaines : chaque séance porte un statut C4 ; échauffement général = mouvement monostructural du bloc principal quand il y en a un', () => {
    let s = create();
    const mondays = ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'];
    const mains: string[] = [];
    for (const [k, d] of mondays.entries()) {
      if (k > 0) s = ensureBeta0Week(s, at(`${d}T07:30:00.000Z`));
      for (const x of ctSessions(s, `${d}T07:30:00.000Z`).filter((y) => y.placement === 'planned')) {
        const v = selectProgrammeSession(s, x.requestId);
        expect(x.composition?.c4).not.toBeNull();
        const main = v?.session.blocks.find((b) => b.kind === 'conditioning');
        mains.push(JSON.stringify(main?.items.map((i) => i.exerciseId)) + String(main?.format));
        const wu = v?.session.blocks.find((b) => b.id.endsWith('.c4.warmup_general'));
        const mono = main?.items.map((i) => i.exerciseId).filter((e) => e === 'ex.row_erg' || e === 'ex.skierg') ?? [];
        if (wu && mono.length > 0) expect(mono).toContain(wu.items[0]?.exerciseId);
        // Abandon : aucune progression simulée, la semaine suivante est composée avec cet historique.
        s = finishProgrammeSession(startProgrammeSession(s, at(`${d}T08:00:00.000Z`), x.requestId), at(`${d}T08:30:00.000Z`), { requestId: x.requestId, completion: 'abandoned', pain: false });
      }
    }
    // Variété du bloc principal (C3, inchangé par C4) sur 4 semaines.
    expect(new Set(mains).size).toBeGreaterThan(1);
  });

  it('7. pause douleur : démarrage refusé comme pour toute séance (aucune exception C4)', () => {
    let s = create();
    const [a, b] = ctSessions(s).filter((x) => x.placement === 'planned');
    if (!a || !b) throw new Error('deux séances attendues');
    s = finishProgrammeSession(startCt(s, at(T('07:00')), a.requestId), at(T('07:30')), { requestId: a.requestId, completion: 'abandoned', pain: true });
    expect(code(() => startProgrammeSession(s, at(MON1), b.requestId))).toBe('SAFETY_PAUSE_ACTIVE_PAIN');
  });
});

describe('C4.1 — regroupement de provenance des semaines anciennes (sans perte)', () => {
  it('8. semaine compactée : provenance regroupée, restitution EXACTE (contenu et ordre), idempotence, export restitué', () => {
    let s = create();
    s = ensureBeta0Week(s, at('2026-10-12T07:30:00.000Z'));
    const before = structuredClone(s.planner.weeks['2026-10-05']?.requests.filter((r) => r.sport === 'crosstraining') ?? []);
    s = ensureBeta0Week(s, at('2026-10-19T07:30:00.000Z'));
    s = reload(s, '2026-10-19T08:00:00.000Z');
    const after = s.planner.weeks['2026-10-05']?.requests.filter((r) => r.sport === 'crosstraining') ?? [];
    expect(after.length).toBe(before.length);
    for (const [i, r] of after.entries()) {
      const orig = (before[i]?.reasons ?? []).filter((x) => !DROPPABLE_CODES.has(x.code));
      expect(r.reasons.some((x) => x.code === PROVENANCE_FOLDED)).toBe(true);
      expect(r.reasons.filter((x) => x.code.endsWith('.CANDIDATE_VALUE_USED'))).toEqual([]);
      expect(expandFoldedReasons(r.reasons).filter((x) => x.code !== HISTORY_COMPACTED)).toEqual(orig);
      expect(JSON.stringify(r.reasons).length).toBeLessThan(JSON.stringify(orig).length);
    }
    expect(compactHistory(s)).toBe(s);
    const j = JSON.parse(exportBetaJournal(s, { build: 'x', builtAt: null, exportedAt: '2026-10-19T09:00:00.000Z' })) as { weeks: { requests: { requestId: string; reasons: { code: string }[] }[] }[] };
    const exported = j.weeks.flatMap((w) => w.requests).find((r) => r.requestId === after[0]?.requestId);
    expect(exported?.reasons.some((x) => x.code === PROVENANCE_FOLDED)).toBe(false);
    expect(exported?.reasons.some((x) => x.code.endsWith('.CANDIDATE_VALUE_USED'))).toBe(true);
  });
});
