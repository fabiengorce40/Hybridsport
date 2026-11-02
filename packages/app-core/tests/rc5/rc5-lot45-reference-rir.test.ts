/**
 * Reprise RC5 lot 4.5 (chantier A) — RIR de RÉFÉRENCE lié à la prescription réellement associée à la séance.
 * Avant 4.5 :
 * - `createTrack` lisait la cellule de dose BRUTE : le RIR de référence d'un accessoire personnalisé (leg curl : 1) ou
 *   d'un principal multisport (squat : 2) différait du RIR réellement prescrit (2 ; plancher multisport 4) ;
 * - la lecture R4 (simulation) reconstruisait la référence depuis la track.
 * Depuis 4.5 : la référence est calculée depuis l'INSTANTANÉ du profil figé avec la semaine et le contenu de la
 * PROVENANCE de la séance (versions du ruleset et du catalogue) — jamais le profil courant d'un profil personnalisé —,
 * tracée sur `PROGRESSION.EXPOSURE_CLASSIFIED` (`prescribedRir`, `referenceRir`, `referenceSource`). Aucun schéma modifié
 * (format v5). Données anciennes sans instantané : référence `unknown`, jamais inventée. Tracks existantes : jamais
 * réécrites.
 */
import { describe, expect, it } from 'vitest';
import { decodeState, exportState } from '../../src/index.js';
import type { AppState, ProfileInput, StrengthPersonalization } from '../../src/index.js';
import { simulate } from '../rc4-audit/rc4-sim.js';
import type { ProfileSpec } from '../rc4-audit/rc4-sim.js';
import { lot41Athlete } from './lot41-bench.js';
import { lot41Specs } from './lot41-bench.js';
import { P1, profileOf } from './lot4-profiles.js';

type Trace = { readonly weekIndex: number | null; readonly params: Record<string, unknown> };
const traces = (s: AppState): Trace[] => (s.programmeState?.audit ?? []).filter((a) => a.reason.code === 'PROGRESSION.EXPOSURE_CLASSIFIED').map((a) => ({ weekIndex: a.weekIndex, params: a.reason.params as Record<string, unknown> }));
const run = (spec: ProfileSpec, weeks: number): AppState => simulate(spec, weeks).state;
const track = (s: AppState, exerciseId: string) => s.strength.tracks.find((t) => t.exerciseId === exerciseId && t.status !== 'closed');
const run2 = { priorities: ['strength', 'running'], running: { enabled: true, population: 'P_R2', goal: 'TEN_K', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' } } as Partial<ProfileInput>;
const RUN: ProfileSpec = lot41Athlete({ id: 'A-RUN', label: 'Musculation 4× + Course 2×', profile: profileOf(run2, { days: [0, 1, 3, 4] }), lastRun: { realizedDurationS: 1800, difficulty: 'AS_EXPECTED', distanceM: 5000 } });

describe('hypertrophie 4× (profil personnalisé, sans autre sport) : référence = RIR réellement prescrit', () => {
  const s = run(lot41Athlete(P1), 3);
  const ts = traces(s);
  it('toutes les expositions suivies : source « profil de la prescription », référence = RIR prescrit (aucune séance allégée)', () => {
    expect(ts.length).toBeGreaterThan(0);
    for (const t of ts) expect([t.params.exerciseId, t.params.referenceSource, t.params.referenceRir]).toEqual([t.params.exerciseId, 'prescription_profile', t.params.prescribedRir]);
  });
  it('accessoire personnalisé (leg curl) : RIR de référence de la track = RIR prescrit (2), et non la cellule brute (1)', () => {
    const t = track(s, 'ex.leg_curl');
    expect(t?.nextPrescription?.rir).toBe(2);
    expect(ts.filter((x) => x.params.exerciseId === 'ex.leg_curl').every((x) => x.params.prescribedRir === '2')).toBe(true);
  });
  it('principal : RIR 2 prescrit, référence 2', () => {
    const sq = ts.filter((x) => x.params.exerciseId === 'ex.back_squat');
    expect(sq.length).toBeGreaterThan(0);
    for (const x of sq) expect([x.params.prescribedRir, x.params.referenceRir]).toEqual(['2', '2']);
  });
});

describe('multisport (Course) : plancher durable 4, séances Bas allégées à 6 par interférence', () => {
  const s = run(RUN, 3);
  const ts = traces(s);
  it('référence durable 4 (prudence multisport de la cellule personnalisée) ; RIR prescrit 4 ou 6 ; jamais une référence au-dessus du prescrit', () => {
    const rirs = new Set(ts.map((x) => `${String(x.params.prescribedRir)}/${String(x.params.referenceRir)}`));
    expect(rirs.has('6/4')).toBe(true);
    expect(rirs.has('4/4')).toBe(true);
    for (const x of ts) expect(Number(x.params.referenceRir)).toBeLessThanOrEqual(Number(x.params.prescribedRir));
  });
  it('principal multisport : RIR de référence de la track = 4 (avant 4.5 : 2, cellule brute)', () => {
    expect(track(s, 'ex.back_squat')?.nextPrescription?.rir).toBe(4);
  });
});

describe('série lourde et séries de retour (top set / back-off)', () => {
  it('objectif force : la première série de travail (série lourde) porte le RIR prescrit, identique à la référence', () => {
    const force = lot41Specs().find((x) => x.id === 'L41-FORCE') as ProfileSpec;
    const s = run(force, 3);
    const tops = s.planner.weeks && Object.values(s.planner.weeks).flatMap((w) => w.requests).flatMap((r) => ((r.record?.data as { session?: { blocks: { items: { exerciseId: string; prescription: { type: string; sets?: { kind: string; intensity?: { effort?: { rir?: number } } }[] } }[] }[] } } | undefined)?.session?.blocks ?? []).flatMap((b) => b.items))
      .filter((it) => it.prescription.type === 'sets' && (it.prescription.sets ?? []).some((z) => z.kind === 'top_set'));
    console.log('TOPS', tops.length);
    if (tops.length > 0) for (const it of tops) {
      const sets = (it.prescription.sets ?? []).filter((z) => z.kind !== 'rampup');
      // Série lourde et séries de retour : même effort prescrit ; les montées en charge restent exclues.
      expect(new Set(sets.map((z) => z.intensity?.effort?.rir)).size).toBe(1);
    }
    // Référence durable 2 ; RIR prescrit 3 seulement sur les séances de CALIBRATION de la semaine 1 (générées le lundi, avant
    // la création du suivi) : la référence n'est jamais au-dessus du RIR prescrit.
    for (const t of traces(s)) expect(Number(t.params.referenceRir)).toBeLessThanOrEqual(Number(t.params.prescribedRir));
    expect(traces(s).filter((t) => t.params.prescribedRir !== t.params.referenceRir).every((t) => t.weekIndex === 0)).toBe(true);
  });
});

describe('profil modifié APRÈS la prescription, données anciennes, rechargement', () => {
  const base = run(lot41Athlete(P1), 2);
  const week1 = (s: AppState) => traces(s).filter((t) => t.weekIndex === 1);
  it('profil modifié sans replanification (récupération limitée ⇒ prudence) : la référence reste celle du profil de la prescription', () => {
    const changed = run({ ...lot41Athlete(P1), afterPlanned: (w, s) => {
      if (w !== 1 || !s.profile) return s;
      const pers = s.profile.strength.personalization as StrengthPersonalization;
      return { ...s, profile: { ...s.profile, strength: { ...s.profile.strength, personalization: { ...pers, recovery: 'limited' } } } } as AppState;
    } } as ProfileSpec, 2);
    expect(week1(changed).map((t) => [t.params.exerciseId, t.params.referenceRir, t.params.referenceSource])).toEqual(week1(base).map((t) => [t.params.exerciseId, t.params.referenceRir, t.params.referenceSource]));
  });
  it('séance ancienne sans instantané du profil : référence « unknown » (jamais inventée), décisions de progression identiques', () => {
    const legacy = run({ ...lot41Athlete(P1), afterPlanned: (w, s) => {
      if (w !== 1) return s;
      const weeks = Object.fromEntries(Object.entries(s.planner.weeks).map(([k, wk]) => [k, { ...wk, strengthProfile: undefined, requests: wk.requests.map((r) => ({ ...r, strengthProfile: undefined })) }]));
      return { ...s, planner: { ...s.planner, weeks } } as unknown as AppState;
    } } as ProfileSpec, 2);
    const w1 = week1(legacy);
    expect(w1.length).toBeGreaterThan(0);
    for (const t of w1) expect([t.params.referenceRir, t.params.referenceSource]).toEqual(['n/a', 'unknown']);
    expect(legacy.strength.tracks).toEqual(base.strength.tracks);
  });
  it('track existante avec une référence ancienne : jamais réécrite (continuité de la progression)', () => {
    // Principal suivi dès la semaine 1 ; sa référence est remplacée par une valeur « ancienne » avant la semaine 2.
    const legacyTrack = run({ ...lot41Athlete(P1), afterPlanned: (w, s) => (w !== 1 ? s : { ...s, strength: { ...s.strength, tracks: s.strength.tracks.map((t) => (t.exerciseId === 'ex.back_squat' && t.nextPrescription ? { ...t, nextPrescription: { ...t.nextPrescription, rir: 1 } } : t)) } }) } as ProfileSpec, 2);
    expect(track(legacyTrack, 'ex.back_squat')?.nextPrescription?.rir).toBe(1);
  });
  it('export / import (rechargement) : état identique, traces comprises', () => {
    const d = decodeState(exportState(base));
    expect(d.ok && d.state).toEqual(base);
  });
});
