/**
 * Strength S5 — scénario C : PREUVES LONGITUDINALES sur plusieurs expositions du même mouvement, par les seules
 * fonctions du moteur (`classifyExposure`, `updateTrack`) et les valeurs du ruleset. Chaque exposition réalise la
 * prescription COURANTE de la track (charge prescrite) ; seules varient les répétitions et le RIR saisis (TEST_ONLY).
 * Montre ce que la track MÉMORISE entre les expositions (e1RM, nature de l'estimation, réussites exactes consécutives,
 * prescription suivante) et quand une hausse est — ou n'est pas — décidée. Rapport : `__reports__/evidence-longitudinal.md`.
 */
import { describe, expect, it } from 'vitest';
import type { Exercise, ISODateTime, SetPrescription } from '@hybridsport/domain';
import { classifyExposure, readStrengthParams, updateTrack } from '../../src/index.js';
import type { ExecutedItem, PerformedSet, StrengthTrack } from '../../src/index.js';
import { NOW, strengthCatalog, strengthRuleset } from '../fixtures/harness.js';

const P = readStrengthParams(strengthRuleset()).values;
const CATALOG = strengthCatalog();
const ex = (id: string): Exercise => { const e = CATALOG.exercise(id); if (!e) throw new Error(id); return e; };
// technical-constant: TEST_ONLY — nombre d'expositions simulées par cas
const EXPOSURES = 8;

type Exposure = { reps: number; rir?: number };
interface Case { readonly id: string; readonly title: string; readonly track: StrengthTrack; readonly exercise: string; readonly each: (k: number) => Exposure }

/** Prescription de la track au format d'une série de travail (charge prescrite si connue). */
function prescribed(t: StrengthTrack): SetPrescription[] {
  const n = t.nextPrescription;
  if (!n) return [];
  return Array.from({ length: n.sets }, () => ({
    kind: 'working' as const, reps: n.reps, restAfterS: 120,
    intensity: n.loadKg !== undefined ? { mode: 'load' as const, kg: n.loadKg, certainty: 'prescribed' as const, effort: { rir: n.rir ?? 0 } } : { mode: 'bodyweight' as const, effort: { rir: n.rir ?? 0 } },
  }));
}

function run(c: Case): { rows: string[]; tracks: StrengthTrack[]; codes: string[][] } {
  let t = c.track;
  const rows: string[] = [];
  const tracks: StrengthTrack[] = [];
  const codes: string[][] = [];
  for (let k = 0; k < EXPOSURES; k++) {
    const e = c.each(k);
    const rx = prescribed(t);
    const n = t.nextPrescription;
    const performed: PerformedSet[] = rx.map(() => ({ reps: e.reps, ...(n?.loadKg !== undefined ? { loadKg: n.loadKg } : {}), ...(e.rir !== undefined ? { rir: e.rir } : {}) }));
    const x: ExecutedItem = { exerciseId: c.exercise, prescribed: rx, performed, sessionCompleted: true, sessionStatus: 'completed' };
    const cls = classifyExposure(x, P);
    const u = updateTrack(t, x, cls, ex(c.exercise), P, 'accumulation');
    const repsTxt = typeof n?.reps === 'number' ? String(n.reps) : `${String(n?.reps.min)}–${String(n?.reps.max)}`;
    const next = u.track.nextPrescription;
    const nextTxt = `${typeof next?.reps === 'number' ? String(next.reps) : `${String(next?.reps.min)}–${String(next?.reps.max)}`}${next?.loadKg !== undefined ? ` @ ${String(next.loadKg)} kg` : ' PDC'}`;
    const decision = u.reasons.map((r) => (r.code === 'PROGRESSION.HELD' ? `maintien (${String(r.params.cause)})` : r.code === 'PROGRESSION.ADVANCED' ? `**+${r.params.variable === 'load' ? 'charge' : 'reps'}**` : r.code === 'PROGRESSION.DECISION_BLOCKED' ? `BLOCKED ${String(r.params.situation)}` : r.code === 'PROGRESSION.METHOD_UNGOVERNED' ? `BLOCKED méthode PDC (effort ${String(r.params.effort)})` : r.code.replace('PROGRESSION.', ''))).join(' ; ');
    rows.push(`| ${String(k + 1)} | ${repsTxt}${n?.loadKg !== undefined ? ` @ ${String(n.loadKg)} kg` : ' PDC'} · RIR ${String(n?.rir ?? '—')} | ${String(e.reps)} reps · RIR ${e.rir !== undefined ? String(e.rir) : 'inconnu'} | ${cls} | ${u.track.e1rmKg !== undefined ? `${String(Math.round(u.track.e1rmKg * 100) / 100)} (${u.track.evidence?.e1rmBasis ?? '—'})` : '—'} | ${String(u.track.evidence?.exactStreak ?? 0)} | ${decision} | ${nextTxt} |`);
    tracks.push(u.track);
    codes.push(u.reasons.map((r) => r.code));
    t = u.track;
  }
  return { rows, tracks, codes };
}

const bench = (o: Partial<StrengthTrack> = {}): StrengthTrack => ({
  trackId: 'track.bench', tier: 'anchor', exerciseId: 'ex.bench_press', archetypeId: 'str_upper', slotId: 'up.main_push_h', model: 'autoregulated', status: 'active', openedAt: NOW as ISODateTime,
  consecutiveSuccess: 0, consecutiveBelow: 0, consecutiveHolds: 0, cycleStartLoadKg: 40, nextPrescription: { sets: 3, reps: 6, loadKg: 40, rir: 2 }, ...o,
});
// e1RM de départ : 40 kg × 6 à RIR 2 observé (formule du ruleset : charge × (1 + (reps + RIR) / 30)).
const START = 40 * (1 + 8 / 30);

const CASES: readonly Case[] = [
  { id: 'A', title: 'Réussite exacte, RIR connu (= cible)', exercise: 'ex.bench_press', track: bench({ e1rmKg: START, evidence: { exactStreak: 0, effortKnown: 0, effortUnknown: 0, e1rmBasis: 'observed' } }), each: () => ({ reps: 6, rir: 2 }) },
  { id: 'B', title: 'Réussite exacte, RIR inconnu', exercise: 'ex.bench_press', track: bench({ e1rmKg: 40 * (1 + 6 / 30), evidence: { exactStreak: 0, effortKnown: 0, effortUnknown: 0, e1rmBasis: 'lower_bound' } }), each: () => ({ reps: 6 }) },
  { id: 'C1', title: 'Meilleur RIR que prévu (+1 : RIR 3)', exercise: 'ex.bench_press', track: bench({ e1rmKg: START }), each: () => ({ reps: 6, rir: 3 }) },
  { id: 'C2', title: 'Meilleur RIR que prévu (+2 : RIR 4)', exercise: 'ex.bench_press', track: bench({ e1rmKg: START }), each: () => ({ reps: 6, rir: 4 }) },
  { id: 'D1', title: 'Plus de répétitions que prévu (8 au lieu de 6), RIR inconnu', exercise: 'ex.bench_press', track: bench({ e1rmKg: START }), each: () => ({ reps: 8 }) },
  { id: 'D2', title: 'Plus de répétitions que prévu (10 au lieu de 6), RIR inconnu', exercise: 'ex.bench_press', track: bench({ e1rmKg: START }), each: () => ({ reps: 10 }) },
  { id: 'E', title: 'Amélioration progressive sous le pas de charge (RIR 2 → 3 → 3 → 4 → 4…)', exercise: 'ex.bench_press', track: bench({ e1rmKg: START }), each: (k) => ({ reps: 6, rir: [2, 3, 3, 4, 4, 4, 4, 4][k] ?? 4 }) },
  { id: 'H', title: 'Effort observé une séance sur deux (RIR 2 saisi, puis rien)', exercise: 'ex.bench_press', track: bench({ e1rmKg: START, evidence: { exactStreak: 0, effortKnown: 0, effortUnknown: 0, e1rmBasis: 'observed' } }), each: (k) => (k % 2 === 0 ? { reps: 6, rir: 2 } : { reps: 6 }) },
  { id: 'F1', title: 'Double progression (accessoire), réussite exacte RIR connu', exercise: 'ex.leg_curl', track: bench({ trackId: 'track.curl', tier: 'tracked', exerciseId: 'ex.leg_curl', slotId: 'lo.iso_lower', model: 'double_progression', repRange: { min: 10, max: 15 }, cycleStartLoadKg: 40, nextPrescription: { sets: 3, reps: { min: 10, max: 15 }, loadKg: 40, rir: 1 } }), each: () => ({ reps: 15, rir: 1 }) },
  { id: 'F2', title: 'Double progression (accessoire), réussite exacte RIR inconnu', exercise: 'ex.leg_curl', track: bench({ trackId: 'track.curl', tier: 'tracked', exerciseId: 'ex.leg_curl', slotId: 'lo.iso_lower', model: 'double_progression', repRange: { min: 10, max: 15 }, cycleStartLoadKg: 40, nextPrescription: { sets: 3, reps: { min: 10, max: 15 }, loadKg: 40, rir: 1 } }), each: () => ({ reps: 15 }) },
  { id: 'G1', title: 'Tractions en haut de plage, RIR 4 (réserve)', exercise: 'ex.pull_up', track: bench({ trackId: 'track.pullup', exerciseId: 'ex.pull_up', slotId: 'up.pull_v', model: 'double_progression', repRange: { min: 8, max: 12 }, cycleStartLoadKg: undefined, nextPrescription: { sets: 3, reps: { min: 12, max: 12 }, rir: 2 } }), each: () => ({ reps: 12, rir: 4 }) },
  { id: 'G2', title: 'Tractions en haut de plage, RIR 0 (à l’échec)', exercise: 'ex.pull_up', track: bench({ trackId: 'track.pullup', exerciseId: 'ex.pull_up', slotId: 'up.pull_v', model: 'double_progression', repRange: { min: 8, max: 12 }, cycleStartLoadKg: undefined, nextPrescription: { sets: 3, reps: { min: 12, max: 12 }, rir: 2 } }), each: () => ({ reps: 12, rir: 0 }) },
  { id: 'G3', title: 'Tractions en haut de plage, RIR inconnu', exercise: 'ex.pull_up', track: bench({ trackId: 'track.pullup', exerciseId: 'ex.pull_up', slotId: 'up.pull_v', model: 'double_progression', repRange: { min: 8, max: 12 }, cycleStartLoadKg: undefined, nextPrescription: { sets: 3, reps: { min: 12, max: 12 }, rir: 2 } }), each: () => ({ reps: 12 }) },
];

describe('Strength S5 — scénario C : preuves longitudinales (plusieurs expositions)', () => {
  const results = new Map(CASES.map((c) => [c.id, run(c)]));
  const loads = (id: string) => (results.get(id)?.tracks ?? []).map((t) => t.nextPrescription?.loadKg);

  it('A — réussite exacte, RIR connu : la charge ne monte jamais ; la série de réussites exactes est mémorisée et BLOQUÉE', () => {
    expect(new Set(loads('A'))).toEqual(new Set([40]));
    expect(results.get('A')?.tracks.at(-1)?.evidence).toMatchObject({ exactStreak: EXPOSURES, effortKnown: EXPOSURES, effortUnknown: 0, e1rmBasis: 'observed' });
    expect(results.get('A')?.codes.flat()).toContain('PROGRESSION.DECISION_BLOCKED');
  });

  it('B — réussite exacte, RIR inconnu : borne inférieure jamais abaissée, aucune hausse inventée, BLOQUÉE « effort inconnu »', () => {
    expect(new Set(loads('B'))).toEqual(new Set([40]));
    const e1rm = (results.get('B')?.tracks ?? []).map((t) => t.e1rmKg ?? 0);
    expect(e1rm).toEqual([...e1rm].sort((a, b) => a - b));
    expect(results.get('B')?.tracks.at(-1)?.evidence).toMatchObject({ exactStreak: EXPOSURES, effortUnknown: EXPOSURES, effortKnown: 0, e1rmBasis: 'lower_bound' });
  });

  it('C — meilleur RIR : +1 ne franchit jamais le pas (estimation plafonnée), +2 finit par franchir le pas (mémorisé dans la track)', () => {
    expect(new Set(loads('C1'))).toEqual(new Set([40]));
    expect(loads('C2').some((kg) => (kg ?? 0) > 40)).toBe(true);
    expect(loads('C2')[0]).toBe(40);
  });

  it('D — plus de répétitions sans RIR : 8 au lieu de 6 ne prouve rien de plus que la prescription ; 10 au lieu de 6 suffit (borne)', () => {
    expect(new Set(loads('D1'))).toEqual(new Set([40]));
    expect(loads('D2').some((kg) => (kg ?? 0) > 40)).toBe(true);
  });

  it('E — amélioration sous le pas : le gain est MÉMORISÉ dans l’e1RM lissé de la track (jamais perdu), mais 8 expositions ne suffisent pas à franchir le pas', () => {
    const e1 = (results.get('E')?.tracks ?? []).map((t) => t.e1rmKg ?? 0);
    expect(e1).toEqual([...e1].sort((a, b) => a - b));
    expect(e1.at(-1) ?? 0).toBeGreaterThan(START);
    expect(new Set(loads('E'))).toEqual(new Set([40]));
  });

  it('H — effort observé puis inconnu : l’estimation n’est jamais tirée vers le bas (avant S5 : médiane avec un RIR 0 supposé, 50,67 → 49,33)', () => {
    const e1 = (results.get('H')?.tracks ?? []).map((t) => t.e1rmKg ?? 0);
    expect(Math.min(...e1)).toBeGreaterThanOrEqual(START - 1e-9);
    expect(results.get('H')?.tracks.at(-1)?.evidence).toMatchObject({ effortKnown: EXPOSURES / 2, effortUnknown: EXPOSURES / 2 });
  });

  it('F — double progression intacte : réussite exacte ⇒ progression (reps puis charge), RIR connu ou non', () => {
    for (const id of ['F1', 'F2']) expect(results.get(id)?.codes.flat()).toContain('PROGRESSION.ADVANCED');
  });

  it('G — poids du corps : la réserve (RIR 4) est distinguée ; à l’échec (RIR 0) l’exposition est un échec, pas une « méthode à choisir »', () => {
    expect(results.get('G1')?.codes[0]).toEqual(['PROGRESSION.METHOD_UNGOVERNED']);
    expect(results.get('G2')?.codes[0]).not.toContain('PROGRESSION.METHOD_UNGOVERNED');
    expect(results.get('G3')?.codes[0]).toEqual(['PROGRESSION.METHOD_UNGOVERNED']);
  });

  it('rapport', async () => {
    const lines = [
      '# Strength S5 — Scénario C : preuves longitudinales', '',
      'Chaque exposition réalise la prescription courante de la track (charge prescrite) ; seuls varient les répétitions et le RIR saisis (TEST_ONLY).',
      `Ruleset : e1RM = charge × (1 + (reps + RIR) / ${String(P['strength.load'].e1rmDivisor)}) ; lissage = médiane (estimation de la track, mesure) ; charge suivante = arrondi inférieur au pas de ${String(P['strength.load.defaultIncrements'].barbell)} kg de e1RM × pctByRepsToFailure[reps + RIR], au plus +1 pas ; preuves requises (autorégulé) = ${String(P['strength.progression'].evidenceRequired.autoregulated)}.`, '',
      ...CASES.flatMap((c) => [`## ${c.id} — ${c.title}`, '', '| # | Prescription | Réalisé | Classe | e1RM mémorisé (nature) | Réussites exactes consécutives | Décision | Prescription suivante |', '|---|---|---|---|---|---|---|---|', ...(results.get(c.id)?.rows ?? []), '']),
    ];
    await expect(`${lines.join('\n')}\n`).toMatchFileSnapshot('__reports__/evidence-longitudinal.md');
  });
});
