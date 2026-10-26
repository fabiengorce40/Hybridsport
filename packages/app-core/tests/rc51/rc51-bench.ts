/**
 * RC5.1 — banc Haut A/B et Bas A/B : 8 profils RC4.6 + profils complémentaires (Musculation 4× avec HYROX, avec
 * Cross-training, haltères seuls, objectif force, objectif forme générale), 6 semaines, chemin réel de l'application.
 * Lecture seule : mesures (volumes, fréquence, mouvements principaux et charges, durées, reproductibilité) et sonde de
 * démarrage (douleur genou P2, fatigue, course libre, inconnu) en semaine 2. Exécutée à l'identique avant et après RC5.1.
 */
import { migrateToCurrent } from '@hybridsport/engine';
import type { SessionRecord } from '@hybridsport/domain';
import type { AppState } from '../../src/index.js';
import { referenceEnvironment, simulate } from '../rc4-audit/rc4-sim.js';
import type { ProfileSpec } from '../rc4-audit/rc4-sim.js';
import { measureProfile, qualityProfiles, summarize } from '../rc46/quality-bench.js';
import { probe } from '../rc45/probe-starts.js';

/** Profils complémentaires RC5.1 (dérivés de S4, Musculation 4× hypertrophie, et des profils RC4 multisports). */
export function rc51Profiles(): ProfileSpec[] {
  const q = qualityProfiles();
  const of = (id: string) => q.find((p) => p.id === id) as ProfileSpec;
  const s4 = of('S4');
  return [
    ...q,
    { id: 'S4H', label: 'Musculation 4× + HYROX 2×', profile: { ...s4.profile, priorities: ['strength', 'hyrox'], hyrox: of('P3').profile.hyrox } },
    { id: 'S4C', label: 'Musculation 4× + Cross-training 2×', profile: { ...s4.profile, priorities: ['strength', 'crosstraining'], crosstraining: of('P2').profile.crosstraining } },
    { id: 'S4D', label: 'Musculation 4×, haltères seuls', profile: { ...s4.profile, equipment: { presetId: 'preset.dumbbells_only', items: ['dumbbells', 'bench'], confirmedAt: '2026-10-04T10:00:00Z' } } },
    { id: 'S4F', label: 'Musculation 4×, objectif force', profile: { ...s4.profile, strength: { ...s4.profile.strength, goal: 'strength' } } },
    { id: 'S4G', label: 'Musculation 4×, objectif forme générale (mixte)', profile: { ...s4.profile, strength: { ...s4.profile.strength, goal: 'general' } } },
  ] as ProfileSpec[];
}

export interface Rc51Session { readonly id: string; readonly week: string; readonly date: string | null; readonly arch: string | null; readonly items: readonly (readonly [string, string, number])[]; readonly p50: number | null; readonly avail: number | null }
export interface Rc51Measure {
  readonly id: string;
  readonly summary: ReturnType<typeof summarize>;
  readonly sessions: readonly Rc51Session[];
  /** Mouvement principal → charges prescrites par exposition (kg ; null : calibration / effort). */
  readonly mains: Readonly<Record<string, readonly (number | null)[]>>;
  /** Sonde de démarrage en semaine 2 : (cas, décision) → nombre. */
  readonly starts: Readonly<Record<string, number>>;
}

export function rc51Measure(spec: ProfileSpec): Rc51Measure {
  const env = referenceEnvironment();
  const q = measureProfile(spec, env);
  const mains: Record<string, (number | null)[]> = {};
  for (const s of q.sessions) for (const i of s.items) if (/\.main_/.test(i.slot)) (mains[i.ex] ??= []).push(i.load);
  let w2: AppState | undefined;
  const final = simulate(spec, 6, env, (st, monday) => { if (monday === '2026-10-12') w2 = st; }).state;
  const sessions = Object.entries(final.planner.weeks).sort(([a], [b]) => (a < b ? -1 : 1)).flatMap(([w, wk]) => wk.requests.filter((r) => r.sport === 'strength' && r.status === 'planned').map((r): Rc51Session => {
    const d = r.record ? migrateToCurrent<SessionRecord>(r.record) : null;
    const s = d?.ok ? d.value.session : null;
    return {
      id: r.requestId, week: w, date: r.date ?? null, arch: r.intent?.archetypeId ?? null,
      items: (s?.blocks ?? []).filter((b) => b.kind !== 'warmup' && b.kind !== 'cooldown').flatMap((b) => b.items.map((i) => [i.refs?.slotId ?? '', i.exerciseId.replace('ex.', ''), i.prescription.type === 'sets' ? i.prescription.sets.filter((x) => x.kind !== 'rampup' && x.optional !== true).length : 0] as const)),
      p50: d?.ok && d.value.durationEstimate.availability === 'AVAILABLE' ? Math.round(d.value.durationEstimate.p50 / 60) : null,
      avail: wk.days.find((x) => x.date === r.date)?.availableMinutes ?? null,
    };
  }));
  const starts: Record<string, number> = {};
  if (w2) for (const [k, v] of Object.entries(probe(w2))) { const key = `${k.split('|')[1] ?? ''}:${v.decision}`; starts[key] = (starts[key] ?? 0) + 1; }
  return { id: spec.id, summary: summarize(q), sessions, mains, starts };
}
