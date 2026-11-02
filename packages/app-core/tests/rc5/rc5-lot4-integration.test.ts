/**
 * Reprise RC5 lot 4 — intégration (chemin réel de l'application) :
 * - récupération Haut/Bas A/B : séance de la même région à moins de `recoveryHours` REFUSÉE et signalée, jamais placée en
 *   silence ; région opposée acceptée ; profils Full Body inchangés ;
 * - versionnement : semaine générée par le contenu d'avant le lot 4 (L1b-4) conservée, relue et régénérée avec SON contenu ;
 *   séances commencées et terminées jamais réécrites ; nouvelles semaines en A/B ;
 * - export / import à l'identique ; aucune séance de force, forme générale ou fréquence 1–3 en A/B (D6).
 * Données de test (TEST_ONLY) : une exposition « veille » est ajoutée directement pour reproduire une séance déplacée.
 */
import { F6_CATALOG_VERSION } from '../../../strength/tests/fixtures/f6.js';
import { describe, expect, it } from 'vitest';
import {
  beta0Environment, createBeta0Programme, decodeState, emptyState, ensureBeta0Week, exportState, finishProgrammeSession, recordProgrammeSet, selectBeta0Week,
  selectProgrammeSession, sessionEnvironment, startProgrammeSession, strengthEnvironmentFor,
} from '../../src/index.js';
import type { AppState, Clock, ProfileInput } from '../../src/index.js';
import { P1 } from './lot4-profiles.js';

const W1 = '2026-10-05';
const W2 = '2026-10-12';
const at = (d: string, hm = '07:00'): Clock => ({ today: d, now: `${d}T${hm}:00.000Z` });
const strengthOf = (s: AppState, w: string) => (selectBeta0Week(s, w)?.sessions ?? []).filter((v) => v.sport === 'strength');
const archs = (s: AppState, w: string) => strengthOf(s, w).filter((v) => v.date).sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? -1 : 1)).map((v) => v.archetypeId);
const reqs = (s: AppState, w: string) => (s.planner.weeks[w]?.requests ?? []).filter((r) => r.sport === 'strength');
/** Exposition réelle d'une séance faite la veille (dimanche), sur un emplacement de la région donnée. */
const withYesterday = (s: AppState, slotId: string): AppState => ({ ...s, strength: { ...s.strength, exposures: [...s.strength.exposures, { exerciseId: 'ex.bench_press', at: '2026-10-11T18:00:00Z' as never, slotId, sets: [{ reps: 8, loadKg: 40 }] as never }] } });

describe('récupération des séances A/B (règle existante de 36 h, par région)', () => {
  const s1 = createBeta0Programme(emptyState(), P1.profile, at(W1), {});

  it('référence : semaine paire en ordre A (Haut A en premier), semaine impaire en ordre B (Haut B en premier)', () => {
    expect(archs(s1, W1)).toEqual(['str_upper_a', 'str_lower_a', 'str_upper_b', 'str_lower_b']);
    expect(archs(ensureBeta0Week(s1, at(W2, '06:00')), W2)).toEqual(['str_upper_b', 'str_lower_b', 'str_upper_a', 'str_lower_a']);
  });

  it('Haut fait la veille (dimanche) ⇒ Haut B du lundi REFUSÉ et signalé (cause `strength_recovery_window`) ; Bas et autres séances planifiés', () => {
    const s = ensureBeta0Week(withYesterday(s1, 'ua.main_push_h'), at(W2, '06:00'));
    const refused = reqs(s, W2).filter((r) => r.status !== 'planned');
    expect(refused).toHaveLength(1);
    expect(refused[0]?.reasons.some((x) => x.code === 'PLAN.PERSONALIZATION_BLOCKED' && x.params.cause === 'strength_recovery_window')).toBe(true);
    expect(archs(s, W2)).toEqual(['str_lower_b', 'str_upper_a', 'str_lower_a']);
  });

  it('Bas fait la veille ⇒ Haut B du lundi accepté (régions distinctes) : semaine complète', () => {
    const s = ensureBeta0Week(withYesterday(s1, 'la.main_knee'), at(W2, '06:00'));
    expect(archs(s, W2)).toEqual(['str_upper_b', 'str_lower_b', 'str_upper_a', 'str_lower_a']);
  });

  it('Full Body (ancien Haut `up.`, Bas `lo.`) fait la veille : comptés dans leur région, comme avant', () => {
    expect(reqs(ensureBeta0Week(withYesterday(s1, 'up.main_push_h'), at(W2, '06:00')), W2).filter((r) => r.status !== 'planned')).toHaveLength(1);
    expect(reqs(ensureBeta0Week(withYesterday(s1, 'fb.push_h'), at(W2, '06:00')), W2).filter((r) => r.status !== 'planned')).toHaveLength(1);
    expect(reqs(ensureBeta0Week(withYesterday(s1, 'lo.main_knee'), at(W2, '06:00')), W2).filter((r) => r.status !== 'planned')).toHaveLength(0);
  });
});

describe('versionnement : semaines d’avant le lot 4 conservées, nouvelles générations en A/B', () => {
  const env = beta0Environment();
  const legacy = strengthEnvironmentFor(env, '0.7.0-strength-l1b4', F6_CATALOG_VERSION);
  if (!legacy) throw new Error('contenu L1b-4 attendu au registre');
  // Semaine générée par le contenu d'avant le lot 4 (L1b-4), comme une semaine V2.x existante.
  const old = createBeta0Programme(emptyState(), P1.profile, at(W1), {}, legacy);

  it('semaine d’avant : Haut / Bas communs, provenance L1b-4 personnalisée (nom historique)', () => {
    expect(archs(old, W1)).toEqual(['str_upper', 'str_lower', 'str_upper', 'str_lower']);
    for (const r of reqs(old, W1)) expect((r.record?.data as { provenance?: { rulesetVersion?: string } }).provenance?.rulesetVersion).toBe('0.8.0-strength-personalization-v1');
  });

  it('rouverte avec le code du lot 4 : jamais recalculée en silence ; relue et régénérable avec SON contenu d’origine', () => {
    const again = ensureBeta0Week(old, at(W1, '12:00'));
    expect(again.planner.weeks[W1]).toEqual(old.planner.weeks[W1]);
    for (const r of reqs(old, W1)) expect(sessionEnvironment(old, r.requestId, env).strength?.content.ruleset.version).toBe('0.8.0-strength-personalization-v1');
  });

  it('séance commencée puis terminée dans la semaine d’avant : jamais réécrite ; semaine suivante en A/B', () => {
    const id = reqs(old, W1).find((r) => r.date === W1)?.requestId ?? '';
    const v = selectProgrammeSession(old, id);
    const item = v?.session.blocks.flatMap((b) => b.items).find((i) => i.prescription.type === 'sets');
    if (!item) throw new Error('séance attendue');
    let s = startProgrammeSession(old, at(W1, '08:00'), id, env, { painAnswer: 'no', fatigue: 'low', recovery: 'good' });
    s = recordProgrammeSet(s, at(W1, '08:10'), id, { itemId: item.id, setIndex: 0, done: true, reps: 8, loadKg: 40 });
    const started = JSON.stringify(s.programmeLogs[id]);
    s = finishProgrammeSession(s, at(W1, '09:00'), { requestId: id, completion: 'modified', pain: false });
    const finished = s.programmeLogs[id];
    expect(JSON.parse(started).sets).toEqual(finished?.sets);
    const next = ensureBeta0Week(s, at(W2, '06:00'));
    expect(next.programmeLogs[id]).toEqual(finished);
    expect(next.planner.weeks[W1]?.requests.find((r) => r.requestId === id)?.record).toEqual(s.planner.weeks[W1]?.requests.find((r) => r.requestId === id)?.record);
    expect(archs(next, W2)).toEqual(['str_upper_b', 'str_lower_b', 'str_upper_a', 'str_lower_a']);
    for (const r of reqs(next, W2).filter((x) => x.status === 'planned')) expect((r.record?.data as { provenance?: { rulesetVersion?: string } }).provenance?.rulesetVersion).toBe('0.8.0-strength-hautbas-ab.personalization-v1-1'); // lot 4.1 : politique 1.1
    // Export / import : identique, semaines d'avant et A/B comprises.
    const d = decodeState(exportState(next));
    expect(d.ok && d.state).toEqual(next);
  });
});

describe('D6 : rotation A/B réservée à l’hypertrophie à 4 séances', () => {
  const variant = (goal: 'strength' | 'general' | 'hypertrophy', n: number): string[] => {
    const p: ProfileInput = { ...P1.profile, strength: { ...P1.profile.strength, goal, sessionsPerWeek: n, personalization: undefined } } as ProfileInput;
    const { personalization: _p, ...strength } = p.strength;
    return [...new Set(archs(createBeta0Programme(emptyState(), { ...p, strength } as ProfileInput, at(W1), {}), W1))] as string[];
  };
  it('force et forme générale à 4 séances : Haut / Bas communs ; hypertrophie à 3 séances : Full Body', () => {
    expect(variant('strength', 4).sort()).toEqual(['str_lower', 'str_upper']);
    expect(variant('general', 4).sort()).toEqual(['str_lower', 'str_upper']);
    expect(variant('hypertrophy', 3)).toEqual(['str_full_body']);
    expect(variant('hypertrophy', 4).sort()).toEqual(['str_lower_a', 'str_lower_b', 'str_upper_a', 'str_upper_b']);
  });
});
