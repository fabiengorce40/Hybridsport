/**
 * RC4.6 (lot 1, B4) — CONTRÔLE des adaptations au démarrage des séances de Musculation dont les entrées croisées sont
 * persistées (`crossInputs`) : douleur, fatigue, conflit musculaire, modification du programme et reprise.
 *
 * Pour chaque cas :
 * - le programme PLANIFIÉ reste identique (semaines, enregistrements, entrées croisées : octet pour octet) ;
 * - l'adaptation est EXPLICABLE : décision et raisons du contrôle avant séance ; chaque changement est d'un type attendu
 *   pour sa cause (fatigue : RIR + 1 seulement ; douleur : exercices retirés sensibles pour la zone déclarée, ajoutés
 *   non sensibles) ; un report porte ses besoins bloquants ;
 * - l'adaptation est REPRODUCTIBLE : même résultat deux fois, après enregistrement / relecture, et après « Modifier » ;
 *   la régénération lit les entrées croisées persistées (`crossSource: 'persisted'`), jamais un repli.
 *
 * Conflit musculaire : P5 (quatre sports) porte des emplacements omis pour interférence (`SELECT.SLOT_OMITTED`,
 * cause `interference`) ; ils restent omis dans la séance adaptée. Les séances de Musculation de ces profils sont toutes
 * placées : le maintien volontaire d'interférence (lot C, séances non placées) n'y intervient pas.
 */
import { describe, expect, it } from 'vitest';
import {
  beta0Environment, MemoryStorage, recreateBeta0Programme, regenerateSession, saveState, loadState, selectProgrammeSession, startProgrammeSession, STORAGE_KEY, strengthContent, UNKNOWN_CORE_STATE,
} from '../../src/index.js';
import type { AppState, CheckInInput } from '../../src/index.js';
import { simulate } from '../rc4-audit/rc4-sim.js';
import type { ProfileSpec } from '../rc4-audit/rc4-sim.js';
import { PROFILE } from '../consolidation/sim4.js';
import { qualityProfiles } from './quality-bench.js';
import { at, reload } from '../hr/hr-fixtures.js';

const env = beta0Environment();
const WEEK2 = '2026-10-12';
type Req = AppState['planner']['weeks'][string]['requests'][number];
const CASES: readonly (readonly [string, CheckInInput | undefined])[] = [
  ['inconnu', undefined],
  ['fatigue', { painAnswer: 'no', fatigue: 'high', recovery: 'poor' }],
  ['douleur genou P2', { painAnswer: 'yes', pains: [{ area: 'knee', level: 'P2' }] }],
  ['douleur épaule P1', { painAnswer: 'yes', pains: [{ area: 'shoulder', level: 'P1' }] }],
  ['douleur épaule P2', { painAnswer: 'yes', pains: [{ area: 'shoulder', level: 'P2' }] }],
];
const CONS: ProfileSpec = { id: 'CONS', label: 'Consolidation (Musculation 3×, CT force 1×)', profile: PROFILE };
const P5 = qualityProfiles().find((p) => p.id === 'P5') as ProfileSpec;
/** État à la planification de la semaine 2 (semaine 1 réalisée par la simulation). */
function week2(spec: ProfileSpec): AppState {
  let out: AppState | undefined;
  simulate(spec, 2, env, (state, monday) => { if (monday === WEEK2) out = state; });
  if (!out) throw new Error(spec.id);
  return out;
}
const STATES = { CONS: week2(CONS), P5: week2(P5) } as const;
const strengthOf = (s: AppState): Req[] => (s.planner.weeks[WEEK2]?.requests ?? []).filter((r) => r.sport === 'strength' && r.status === 'planned' && r.date !== undefined);
/** Programme planifié : toutes les semaines, demandes complètes (enregistrement, entrées croisées, raisons). */
const canon = (x: unknown): unknown => (Array.isArray(x) ? x.map(canon) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => [k, canon(v)])) : x);
/** Comparaison au contenu (ordre des clés normalisé : la relecture validée peut réordonner les propriétés). */
const planned = (s: AppState): string => JSON.stringify(canon(s.planner));
const start = (s: AppState, r: Req, ci: CheckInInput | undefined): AppState => startProgrammeSession(s, at(`${r.date ?? ''}T17:00:00.000Z`), r.requestId, env, ci);
/** Résultat du démarrage : contrôle avant séance (sans identifiant horodaté) et journal ouvert. */
const outcome = (s: AppState, r: Req) => { const c = s.checkIns.at(-1); return JSON.stringify([c?.decision, c?.reasons, c?.readiness, s.programmeLogs[r.requestId] ?? null]); };
const sensitive = (ex: string): readonly string[] => strengthContent().catalog.exercise(ex)?.painSensitiveAreas ?? [];
const FALLBACKS = ['KAIRO.CHECKIN_READINESS_PERSISTED', 'KAIRO.CHECKIN_PERSISTED_ADAPTED', 'KAIRO.CHECKIN_SESSION_RECOMPOSED'];

describe('RC4.6 B4 — adaptations au démarrage (programme planifié intact, explicables, reproductibles)', () => {
  for (const [name, s0] of Object.entries(STATES)) {
    it(`${name} : régénération depuis les entrées croisées persistées (aucun repli)`, () => {
      const rs = strengthOf(s0);
      expect(rs.length).toBe(3);
      for (const r of rs) {
        expect(r.crossInputs?.v).toBe(1);
        const g = regenerateSession(s0, r.requestId, UNKNOWN_CORE_STATE, env);
        expect(g.status === 'planned' && g.crossSource, r.requestId).toBe('persisted');
      }
    });

    for (const [label, ci] of CASES) {
      it(`${name} — ${label} : programme planifié identique ; adaptation explicable et reproductible (deux fois, après relecture)`, () => {
        const before = planned(s0);
        for (const r of strengthOf(s0)) {
          const a = start(s0, r, ci);
          expect(planned(a), r.requestId).toBe(before);
          const c = a.checkIns.at(-1);
          const log = a.programmeLogs[r.requestId];
          const codes = (c?.reasons ?? []).map((x) => x.code);
          for (const f of FALLBACKS) expect(codes, r.requestId).not.toContain(f);
          // Explicable : décision, raisons, changements typés selon la cause.
          const changes = log?.adaptation?.changes ?? [];
          if (c?.decision === 'adapted') {
            expect(codes).toContain('KAIRO.CHECKIN_SESSION_ADAPTED');
            expect(changes.length).toBeGreaterThan(0);
          } else expect(changes).toEqual([]);
          if (c?.decision === 'postponed') {
            expect(codes).toContain('KAIRO.CHECKIN_SESSION_NOT_ADAPTABLE');
            expect(codes).toContain('SELECT.BLOCKING_NEED');
            expect(log).toBeUndefined();
          }
          if (label === 'inconnu') expect(c?.decision).toBe('unchanged');
          if (label === 'fatigue') {
            expect(c?.decision).toBe('adapted');
            for (const x of changes) expect(x, r.requestId).toMatch(/^rir:ex\.[a-z_]+:(\d)>(\d)$/);
            for (const x of changes) { const [, , from, to] = x.split(':').flatMap((p) => p.split('>')); expect(Number(to) - Number(from)).toBe(1); }
          }
          if (ci?.pains) {
            const area = ci.pains[0]?.area ?? '';
            for (const x of changes) {
              const [kind, ex] = x.split(':');
              expect(['removed', 'added'], x).toContain(kind);
              if (kind === 'removed') expect(sensitive(ex ?? ''), x).toContain(area);
              if (kind === 'added') expect(sensitive(ex ?? ''), x).not.toContain(area);
            }
            const session = selectProgrammeSession(a, r.requestId)?.session;
            for (const b of session?.blocks ?? []) for (const it of b.items) if (c?.decision === 'adapted') expect(sensitive(it.exerciseId), it.exerciseId).not.toContain(area);
          }
          // Reproductible : deux démarrages, et démarrage après enregistrement / relecture de l'état.
          expect(outcome(start(s0, r, ci), r)).toBe(outcome(a, r));
          expect(outcome(start(reload(s0, `${r.date ?? ''}T06:00:00.000Z`), r, ci), r)).toBe(outcome(a, r));
        }
      });
    }
  }

  it('conflit musculaire (P5) : emplacements omis pour interférence au planning, jamais réintroduits par l’adaptation', () => {
    const s0 = STATES.P5;
    const omitted = (reasons: readonly { code: string; params: Record<string, unknown> }[]) => reasons.filter((x) => x.code === 'SELECT.SLOT_OMITTED' && x.params.cause === 'interference').map((x) => String(x.params.slot)).sort();
    let seen = 0;
    let adapted = 0;
    for (const r of strengthOf(s0)) {
      const plannedOmitted = omitted(r.reasons);
      if (plannedOmitted.length === 0) continue;
      seen += 1;
      for (const [, ci] of CASES) {
        const a = start(s0, r, ci);
        if (!a.programmeLogs[r.requestId]?.adaptation) continue;
        adapted += 1;
        const slots = new Set((selectProgrammeSession(a, r.requestId)?.session.blocks ?? []).flatMap((b) => b.items.map((i) => i.refs?.slotId ?? '')));
        for (const x of plannedOmitted) expect(slots.has(x), `${r.requestId} ${x}`).toBe(false);
      }
    }
    expect(adapted).toBeGreaterThan(0);
    expect(seen).toBe(3);
  });

  it('modification (« Modifier » le programme, semaine non commencée) : semaine replanifiée identique, adaptations identiques', () => {
    const s0 = STATES.CONS;
    const c = { today: WEEK2, now: `${WEEK2}T06:30:00.000Z` };
    const m = recreateBeta0Programme(s0, PROFILE, c, {});
    const week = (s: AppState) => JSON.stringify(s.planner.weeks[WEEK2]?.requests.map((r) => [r.requestId, r.record ?? null, r.crossInputs ?? null]));
    expect(week(m)).toBe(week(s0));
    for (const r of strengthOf(m)) {
      expect(r.crossInputs?.v).toBe(1);
      for (const [, ci] of CASES) expect(outcome(start(m, r, ci), r), r.requestId).toBe(outcome(start(s0, r, ci), r));
    }
  });

  it('reprise : séance adaptée commencée, état enregistré puis relu ; reprise sans nouveau contrôle, adaptation conservée', () => {
    const s0 = STATES.CONS;
    for (const r of strengthOf(s0)) {
      const a = start(s0, r, CASES[1]?.[1]);
      expect(a.programmeLogs[r.requestId]?.adaptation).toBeDefined();
      const st = new MemoryStorage();
      expect(saveState(st, a).ok).toBe(true);
      const l = loadState(st, `${r.date ?? ''}T17:30:00.000Z`);
      expect(l.status).toBe('ok');
      if (l.status !== 'ok') continue;
      expect(JSON.stringify(l.state.programmeLogs[r.requestId])).toBe(JSON.stringify(a.programmeLogs[r.requestId]));
      const resumed = startProgrammeSession(l.state, at(`${r.date ?? ''}T17:35:00.000Z`), r.requestId, env, { painAnswer: 'yes', pains: [{ area: 'knee', level: 'P2' }] });
      expect(resumed).toBe(l.state);
      expect(planned(resumed)).toBe(planned(s0));
      expect(st.getItem(STORAGE_KEY)).not.toBeNull();
    }
  });
});
