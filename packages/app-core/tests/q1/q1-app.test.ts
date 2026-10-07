/**
 * Q1 — diagnostic de qualité par le chemin RÉEL de l'application (Beta 0, valeurs SIMULATION_ONLY) : scénarios E
 * (HYROX BALANCED sur plusieurs semaines), H (douleur), I (séance abandonnée) ; garde « Faire maintenant » (une qualité
 * BLOQUÉE n'est jamais exécutable, placée ou non) ; persistance compacte ; BALANCED n'améliore aucun verdict.
 */
import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { decodeState, ensureBeta0Week, exportState, recordSessionExecution, selectBeta0Week, selectProgrammeSession, startProgrammeSession } from '../../src/index.js';
import type { AppState, SessionView } from '../../src/index.js';
import { at, create, doHr, hrProfile, reload } from '../hr/hr-fixtures.js';

const MON = '2026-10-05T07:30:00.000Z';
const views = (s: AppState, d = '2026-10-05') => selectBeta0Week(s, d)?.sessions ?? [];
const reject = (f: () => unknown): string => { try { f(); return 'OK'; } catch (e) { return (e as { code?: string }).code ?? String(e); } };
const lines: string[] = ['# Q1 — diagnostic de qualité dans l’application (Beta 0)', '', '> Valeurs SIMULATION_ONLY. Le diagnostic est lu, jamais recalculé par l’interface.', ''];
/** Force un verdict persisté (simulation d'une prescription BLOQUÉE) : donnée du contrat, jamais une séance réécrite. */
function forceBlocked(s: AppState, requestId: string): AppState {
  const weeks = Object.fromEntries(Object.entries(s.planner.weeks).map(([k, w]) => [k, { ...w, requests: w.requests.map((r) => (r.requestId === requestId && r.quality ? { ...r, quality: { ...r.quality, verdict: 'BLOCKED' as const } } : r)) }]));
  return { ...s, planner: { weeks } };
}

describe('Q1 — application', () => {
  it('E — HYROX BALANCED sur trois semaines : rôles variés, verdict identique par rôle ; BALANCED ne prouve rien', () => {
    let s = create(hrProfile({ hr: { focus: 'balanced', role: undefined, sessionsPerWeek: 2 } }), MON);
    const rows = ['| semaine | rôle | verdict | non démontrés |', '|---|---|---|---|'];
    const byRole = new Map<string, string>();
    for (const m of ['2026-10-05', '2026-10-12', '2026-10-19']) {
      if (m !== '2026-10-05') s = ensureBeta0Week(s, at(`${m}T07:30:00.000Z`));
      for (const v of views(s, m).filter((x) => x.sport === 'hyrox' && x.placement === 'planned')) {
        rows.push(`| ${m} | ${v.archetypeId ?? ''} | ${v.quality?.verdict ?? '—'} | ${String(v.quality?.unproven ?? 0)} |`);
        expect(v.quality?.verdict).toBe('UNRESOLVED');
        byRole.set(v.archetypeId ?? '', v.quality?.verdict ?? '');
        s = doHr(s, v.requestId, `${v.date ?? m}T18:00:00.000Z`, `${v.date ?? m}T18:40:00.000Z`, 'all', { completion: 'completed_as_prescribed', pain: false, hr: { timeCapReached: false } } as never);
      }
    }
    expect(byRole.size).toBeGreaterThanOrEqual(4);
    // Même rôle spécialisé ⇒ même verdict : la rotation n'est pas une entrée du diagnostic.
    for (const role of byRole.keys()) {
      const spec = create(hrProfile({ hr: { role } }), MON);
      expect(views(spec).find((x) => x.sport === 'hyrox')?.quality?.verdict).toBe(byRole.get(role));
    }
    lines.push('## E — HYROX BALANCED (3 semaines)', '', 'BALANCED fait tourner les rôles ; il ne change AUCUN verdict (même rôle spécialisé ⇒ même verdict).', '', ...rows, '');
  });

  it('H — douleur : planification suspendue, aucune prescription ⇒ aucun diagnostic ; la douleur n’est jamais masquée', () => {
    let s = create(hrProfile({ hr: { role: 'hybrid_race.h2.station_capacity' } }), MON);
    s = { ...s, safety: { activePain: { reportedAt: '2026-10-05T08:00:00Z' as never, areas: [], sessionKey: 'x' } } };
    const next = ensureBeta0Week(s, at('2026-10-12T07:30:00.000Z'));
    expect(next.planner.weeks['2026-10-12']).toBeUndefined();
    expect(next.safety.activePain).not.toBeNull();
    lines.push('## H — Douleur', '', 'Pause centrale de la planification : aucune séance, aucun diagnostic produit pendant la pause. La qualité ne lève ni ne masque la douleur.', '');
  });

  it('I — séance abandonnée : le diagnostic persisté de la prescription est inchangé ; l’abandon ne devient pas un succès', () => {
    let s = create(hrProfile({ hr: { role: 'hybrid_race.h2.station_capacity' } }), MON);
    const v = views(s).find((x) => x.sport === 'hyrox' && x.placement === 'planned') as SessionView;
    const before = v.quality;
    s = doHr(s, v.requestId, `${v.date ?? ''}T18:00:00.000Z`, `${v.date ?? ''}T18:20:00.000Z`, 1, { completion: 'abandoned', pain: false } as never);
    const after = views(s).find((x) => x.requestId === v.requestId);
    expect(after?.quality).toEqual(before);
    expect(after?.status).toBe('abandoned');
    lines.push('## I — Séance abandonnée', '', `Verdict persisté inchangé (${before?.verdict ?? '—'}) ; résultat « abandonnée », jamais compté comme réalisé.`, '');
  });

  it('Q-A1. une prescription de qualité BLOQUÉE n’est jamais démarrable (placée)', () => {
    const s0 = create(hrProfile({ hr: { role: 'hybrid_race.h2.station_capacity' } }), MON);
    const v = views(s0).find((x) => x.placement === 'planned') as SessionView;
    const s = forceBlocked(s0, v.requestId);
    expect(reject(() => startProgrammeSession(s, at(MON), v.requestId))).toBe('QUALITY_BLOCKED');
  });
  it('Q-A2. « Faire maintenant » ne contourne jamais une qualité BLOQUÉE (composée mais non placée)', () => {
    const s0 = create(hrProfile({ hr: { focus: 'balanced', role: undefined, sessionsPerWeek: 2 }, availability: [60, 0, 0, 0, 0, 0, 0] }), MON);
    const u = views(s0).find((x) => x.placement === 'composed_unplaced') as SessionView;
    expect(u).toBeDefined();
    expect(reject(() => startProgrammeSession(forceBlocked(s0, u.requestId), at(MON), u.requestId))).toBe('QUALITY_BLOCKED');
    // UNRESOLVED : règle produit EXISTANTE de la Beta 0 (séances provisoires acceptées) ⇒ exécutable.
    expect(reject(() => startProgrammeSession(s0, at(MON), u.requestId))).toBe('OK');
  });
  it('Q-A3. même prescription placée / non placée ⇒ même verdict (rôle identique)', () => {
    const s0 = create(hrProfile({ hr: { role: 'hybrid_race.h2.station_capacity', sessionsPerWeek: 2 }, availability: [60, 0, 0, 0, 0, 0, 0] }), MON);
    const placed = views(s0).find((x) => x.placement === 'planned');
    const unplaced = views(s0).find((x) => x.placement === 'composed_unplaced');
    expect(unplaced?.quality?.verdict).toBe(placed?.quality?.verdict);
  });
  it('Q-A4. diagnostic identique après export / import et rechargement', () => {
    const s0 = create(hrProfile({ hr: { role: 'hybrid_race.h2.strength_endurance' } }), MON);
    const d = decodeState(exportState(s0));
    expect(d.ok && views(d.state).map((x) => x.quality)).toEqual(views(s0).map((x) => x.quality));
    expect(views(reload(s0, MON)).map((x) => x.quality)).toEqual(views(s0).map((x) => x.quality));
  });
  it('Q-A5. Beta 0 : bases SIMULATION_ONLY (jamais TEST_ONLY ni APPROVED dans l’application)', () => {
    const s0 = create(hrProfile({ hr: { role: 'hybrid_race.h2.strength_endurance' } }), MON);
    const crit = Object.values(s0.planner.weeks).flatMap((w) => w.requests).flatMap((r) => r.quality?.criteria ?? []);
    expect(crit.length).toBeGreaterThan(0);
    expect(crit.some((x) => x.endsWith('|SIMULATION_ONLY'))).toBe(true);
    expect(crit.some((x) => x.endsWith('|APPROVED') || x.endsWith('|TEST_ONLY'))).toBe(false);
  });
  it('Q-A6. persistance compacte : verdict + `critère|statut|base`, aucun fait recopié', () => {
    const s0 = create(hrProfile({ hr: { role: 'hybrid_race.h2.strength_endurance' } }), MON);
    const r = Object.values(s0.planner.weeks).flatMap((w) => w.requests).find((x) => x.quality);
    expect(Object.keys(r?.quality ?? {}).sort()).toEqual(['criteria', 'verdict']);
    expect(r?.quality?.criteria.every((x) => x.split('|').length === 3)).toBe(true);
  });
  it('Q-A7. la vue de séance expose le verdict, jamais un score', () => {
    const s0 = create(hrProfile({ hr: { role: 'hybrid_race.h2.strength_endurance' } }), MON);
    const v = selectProgrammeSession(s0, (views(s0)[0] as SessionView).requestId);
    expect(v?.quality).toBe('UNRESOLVED');
  });
  it('Q-A8. un résultat enregistré ne change jamais le diagnostic persisté (abandon ≠ succès, aucune réécriture)', () => {
    const s0 = create(hrProfile({ hr: { role: 'hybrid_race.h2.station_capacity' } }), MON);
    const v = views(s0).find((x) => x.placement === 'planned') as SessionView;
    const s1 = recordSessionExecution(startProgrammeSession(s0, at(MON), v.requestId), at(MON), { requestId: v.requestId, sport: 'hyrox', completion: 'abandoned', pain: 'NONE', progress: { stepsCompleted: 1, elapsedS: 300, timeCapReached: false } });
    expect(views(s1).find((x) => x.requestId === v.requestId)?.quality).toEqual(v.quality);
    const path = new URL('./__reports__/q1-app.md', import.meta.url).pathname;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, lines.join('\n'));
  });
});
