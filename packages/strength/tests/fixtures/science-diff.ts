/**
 * Diff BASE (ruleset 0.2.0) → CANDIDAT (ruleset scientifique V1) des goldens S1–S7 (phase 4E §J). Chaque
 * différence est calculée à partir des séances enregistrées, jamais écrite à la main ; son attribution
 * (preuve, plage prudente, reclassement d'heuristique, correction de défaut, politique produit / sécurité)
 * vient de la table `ATTRIBUTIONS`, et un test exige qu'aucune différence ne reste inexpliquée.
 */
import type { ReasonCode, SessionDraft, SessionItem, SetPrescription } from '@hybridsport/domain';
import { readStrengthParams } from '../../src/index.js';
import { goldenOutcome } from './golden-record.js';
import { strengthCatalog, strengthRuleset } from './harness.js';
import type { Scenario } from './harness.js';

const PARAMS = readStrengthParams(strengthRuleset()).values;
const CATALOG = strengthCatalog();

export type DiffKind = 'exercise' | 'order' | 'sets' | 'reps' | 'load' | 'effort' | 'rest' | 'rampup' | 'source' | 'warmup' | 'cooldown' | 'duration' | 'anchors' | 'omission' | 'volume' | 'interference' | 'confidence' | 'reasons';

export interface DiffEntry {
  readonly scenario: string;
  readonly kind: DiffKind;
  readonly subject: string;
  readonly before: string;
  readonly after: string;
}

const reps = (r: SetPrescription['reps']) => (typeof r === 'number' ? String(r) : `${String(r.min)}–${String(r.max)}`);
const eff = (e: unknown): string => {
  if (!e || typeof e !== 'object') return '—';
  const o = e as { rir?: number; rpe?: number };
  return o.rir !== undefined ? `RIR ${String(o.rir)}` : o.rpe !== undefined ? `RPE ${String(o.rpe)}` : '—';
};
function load(s: SetPrescription): string {
  const i = s.intensity;
  if (!i) return '—';
  switch (i.mode) {
    case 'load': return `${String(i.kg)} kg${i.certainty === 'suggested' ? ' suggérée' : ' prescrite'}`;
    case 'percent_of_reference': return `${String(i.kgRounded)} kg (${String(Math.round(i.fraction * 100))} % e1RM)`;
    case 'effort': return `à l’effort${i.indicativeKg ? ` (≈ ${String(i.indicativeKg.min)}–${String(i.indicativeKg.max)} kg)` : ''}`;
    case 'relative_to_working': return `${String(Math.round(i.fraction * 100))} % de la charge de travail`;
    case 'bodyweight': return 'poids du corps';
  }
}
const effort = (s: SetPrescription): string => (s.intensity && 'effort' in s.intensity ? eff(s.intensity.effort) : eff(s.rir !== undefined ? { rir: s.rir } : undefined));
const compress = (xs: readonly string[]): string => {
  const out: { v: string; n: number }[] = [];
  for (const x of xs) { const last = out.at(-1); if (last && last.v === x) last.n++; else out.push({ v: x, n: 1 }); }
  return out.map((o) => (o.n > 1 ? `${String(o.n)} × ${o.v}` : o.v)).join(' + ') || '—';
};

interface ItemView { exercise: string; sets: string; reps: string; load: string; effort: string; rest: string; rampup: string; source: string }
function view(it: SessionItem): ItemView {
  const p = it.prescription;
  if (p.type !== 'sets') {
    const summary = p.type === 'hold' ? `${String(p.sets)} × ${String(p.seconds)} s` : p.type === 'intervals' ? `${String(p.reps)} × intervalles` : p.type;
    return { exercise: it.exerciseId, sets: summary, reps: '—', load: '—', effort: '—', rest: p.type === 'hold' ? `${String(p.restS)} s` : p.type === 'intervals' ? `${String(p.recoveryS)} s` : '—', rampup: '—', source: it.refs?.prescriptionSource ?? '—' };
  }
  const work = p.sets.filter((s) => s.kind !== 'rampup');
  const ramp = p.sets.filter((s) => s.kind === 'rampup');
  return {
    exercise: it.exerciseId,
    sets: compress(work.map((s) => (s.kind === 'working' ? 'travail' : s.kind))),
    reps: compress(work.map((s) => reps(s.reps))),
    load: compress(work.map(load)),
    effort: compress(work.map(effort)),
    rest: compress(work.map((s) => `${String(s.restAfterS)} s`)),
    rampup: ramp.length === 0 ? 'aucune' : ramp.map((s) => `${reps(s.reps)} @ ${s.intensity?.mode === 'effort' ? eff(s.intensity.effort) : load(s)}`).join(' → '),
    source: it.refs?.prescriptionSource ?? '—',
  };
}

const strengthItems = (s: SessionDraft) => s.blocks.filter((b) => b.kind !== 'warmup' && b.kind !== 'cooldown').flatMap((b) => b.items);
const mobility = (s: SessionDraft, kind: 'warmup' | 'cooldown') => {
  const it = s.blocks.find((b) => b.kind === kind)?.items[0];
  return it && it.prescription.type === 'mobility' ? `${String(Math.round(it.prescription.seconds / 60))} min` : 'absent';
};
function exposure(s: SessionDraft): Record<string, number> {
  const out: Record<string, number> = {};
  for (const it of s.blocks.flatMap((b) => b.items)) {
    const e = CATALOG.exercise(it.exerciseId);
    const w = it.prescription.type === 'sets' ? it.prescription.sets.filter((x) => x.kind !== 'rampup' && x.optional !== true).length : it.prescription.type === 'hold' ? it.prescription.sets : it.prescription.type === 'intervals' ? it.prescription.reps : 0;
    if (!e || w === 0) continue;
    for (const [grp, muscles] of Object.entries(PARAMS['strength.volume'].muscleGroups)) {
      if (muscles.some((m) => e.muscles.primary.includes(m))) out[grp] = (out[grp] ?? 0) + w;
      else if (muscles.some((m) => e.muscles.secondary.includes(m))) out[grp] = (out[grp] ?? 0) + w * PARAMS['strength.volume'].secondaryWeight;
    }
  }
  return out;
}
const count = (rs: readonly ReasonCode[]) => { const m = new Map<string, number>(); for (const r of rs) m.set(r.code, (m.get(r.code) ?? 0) + 1); return m; };
const fmt = (r: ReasonCode) => Object.entries(r.params).map(([k, v]) => `${k}=${Array.isArray(v) ? v.join('+') : String(v)}`).join(' ');

export interface ScenarioComparison {
  readonly scenario: string;
  readonly entries: readonly DiffEntry[];
  readonly before: { readonly p50: number; readonly p90: number };
  readonly after: { readonly p50: number; readonly p90: number };
  readonly confidence: readonly string[];
  readonly interference: readonly string[];
}

export function compareScenario(k: string, baseline: Scenario, candidate: Scenario): ScenarioComparison {
  const b = goldenOutcome(baseline);
  const c = goldenOutcome(candidate);
  if (b.outcome.result.status !== 'ok' || c.outcome.result.status !== 'ok') throw new Error(`${k} : séance absente`);
  const sb = b.outcome.result.value;
  const sc = c.outcome.result.value;
  const entries: DiffEntry[] = [];
  const add = (kind: DiffKind, subject: string, before: string, after: string) => { if (before !== after) entries.push({ scenario: k, kind, subject, before, after }); };
  const ib = new Map(strengthItems(sb).map((it) => [it.id, it]));
  const ic = new Map(strengthItems(sc).map((it) => [it.id, it]));
  add('order', 'séance', strengthItems(sb).map((it) => it.exerciseId).join(' → '), strengthItems(sc).map((it) => it.exerciseId).join(' → '));
  for (const id of [...new Set([...ib.keys(), ...ic.keys()])].sort()) {
    const x = ib.get(id);
    const y = ic.get(id);
    if (!x || !y || x.exerciseId !== y.exerciseId) { add('exercise', id, x?.exerciseId ?? 'absent', y?.exerciseId ?? 'absent'); continue; }
    const vx = view(x);
    const vy = view(y);
    const subj = `${id} ${x.exerciseId}`;
    add('sets', subj, vx.sets, vy.sets);
    add('reps', subj, vx.reps, vy.reps);
    add('load', subj, vx.load, vy.load);
    add('effort', subj, vx.effort, vy.effort);
    add('rest', subj, vx.rest, vy.rest);
    add('rampup', subj, vx.rampup, vy.rampup);
    add('source', subj, vx.source, vy.source);
  }
  add('warmup', 'échauffement général', mobility(sb, 'warmup'), mobility(sc, 'warmup'));
  add('cooldown', 'retour au calme', mobility(sb, 'cooldown'), mobility(sc, 'cooldown'));
  const min = (s?: number) => (s === undefined ? '—' : `${String(Math.round(s / 60))} min`);
  add('duration', 'p50', min(b.p50S), min(c.p50S));
  add('duration', 'p90', min(b.p90S), min(c.p90S));
  add('duration', 'décision', b.durationDecision ?? '—', c.durationDecision ?? '—');
  const anchors = (s: SessionDraft) => strengthItems(s).filter((it) => it.refs?.anchor === 'declared').map((it) => it.refs?.progressionTrackId ?? '').sort().join(', ') || 'aucune';
  add('anchors', 'ancres appliquées', anchors(sb), anchors(sc));
  const omit = (rs: readonly ReasonCode[]) => new Set(rs.filter((r) => r.code === 'SELECT.SLOT_OMITTED').map((r) => `${String(r.params.slot)}:${String(r.params.cause)}`));
  const ob = omit(b.reasons);
  const oc = omit(c.reasons);
  for (const o of [...new Set([...ob, ...oc])].sort()) add('omission', o, ob.has(o) ? 'omis' : '—', oc.has(o) ? 'omis' : '—');
  const eb = exposure(sb);
  const ec = exposure(sc);
  for (const g of [...new Set([...Object.keys(eb), ...Object.keys(ec)])].sort()) add('volume', g, String(eb[g] ?? 0), String(ec[g] ?? 0));
  const lowered = (rs: readonly ReasonCode[]) => new Set(rs.filter((r) => r.code === 'PLAN.STRUCTURE_LOWERED').map((r) => `${String(r.params.structure)}`));
  const lb = lowered(b.reasons);
  const lc = lowered(c.reasons);
  for (const s of [...new Set([...lb, ...lc])].sort()) add('interference', `abaissement complet ${s}`, lb.has(s) ? 'oui' : 'non', lc.has(s) ? 'oui' : 'non');
  const rirOnly = (rs: readonly ReasonCode[]) => new Map(rs.filter((r) => r.code === 'DOSE.MODIFIED' && String(r.params.modifier).startsWith('interference_rir:')).map((r) => [String(r.params.exerciseId), `+${String(r.params.rirDelta)} (${String(r.params.modifier).split('|')[0] ?? ''})`]));
  const rb = rirOnly(b.reasons);
  const rc = rirOnly(c.reasons);
  for (const x of [...new Set([...rb.keys(), ...rc.keys()])].sort()) add('interference', `RIR seulement ${x}`, rb.get(x) ?? 'aucun', rc.get(x) ?? 'aucun');
  const signals = (rs: readonly ReasonCode[]) => new Map(rs.filter((r) => r.code === 'PLAN.INTERFERENCE_SIGNAL').map((r) => [String(r.params.structure), `${String(r.params.level)} (${String(r.params.overlap)})`]));
  const gb = signals(b.reasons);
  const gc = signals(c.reasons);
  for (const x of [...new Set([...gb.keys(), ...gc.keys()])].sort()) add('interference', `signal ${x}`, gb.get(x) ?? 'aucun', gc.get(x) ?? 'aucun');
  // Confiance : niveau ordinal (DOSE.LOAD.CONFIDENCE) s'il existe, sinon confiance historique portée par la raison de charge.
  const confidence = (rs: readonly ReasonCode[]) => {
    const m = new Map(rs.filter((r) => ['DOSE.LOAD.FROM_E1RM', 'DOSE.LOAD.FROM_HISTORY', 'DOSE.LOAD.FROM_SPECIFIC'].includes(r.code)).map((r) => [String(r.params.exerciseId), String(r.params.confidence)]));
    for (const r of rs.filter((x) => x.code === 'DOSE.LOAD.CONFIDENCE')) m.set(String(r.params.exerciseId), String(r.params.level));
    return m;
  };
  const kb = confidence(b.reasons);
  const kc = confidence(c.reasons);
  for (const x of [...new Set([...kb.keys(), ...kc.keys()])].sort()) add('confidence', x, kb.get(x) ?? '—', kc.get(x) ?? '—');
  const conf = c.reasons.filter((r) => r.code === 'DOSE.LOAD.CONFIDENCE');
  const cb = count(b.reasons);
  const cc = count(c.reasons);
  for (const code of [...new Set([...cb.keys(), ...cc.keys()])].sort()) add('reasons', code, String(cb.get(code) ?? 0), String(cc.get(code) ?? 0));
  return {
    scenario: k, entries,
    before: { p50: b.p50S ?? 0, p90: b.p90S ?? 0 }, after: { p50: c.p50S ?? 0, p90: c.p90S ?? 0 },
    confidence: conf.map((r) => `${String(r.params.exerciseId)} : ${String(r.params.level)} (${fmt(r)})`),
    interference: c.reasons.filter((r) => r.code === 'PLAN.INTERFERENCE_ASSESSED' || r.code === 'PLAN.INTERFERENCE_SIGNAL').map((r) => `${r.code} ${fmt(r)}`),
  };
}

export const CAUSES = {
  evidence: 'preuve (mécanisme soutenu par le registre)',
  conservative_range: 'plage prudente',
  heuristic_reclassification: 'reclassement d’heuristique',
  bug_fix: 'correction de défaut',
  product_safety_policy: 'politique produit / sécurité',
} as const;
export type Cause = keyof typeof CAUSES;

export interface Attribution {
  readonly scenario: string;
  readonly kind: DiffKind | '*';
  readonly subject: RegExp;
  readonly cause: Cause;
  readonly why: string;
}

const DURATION_POLICY = 'Priorités de durée V1 (`strength.session.durationPriority`, principes P12–P13) : l’échauffement général au-delà du minimum et le retour au calme ne passent qu’après les optionnels.';
const CONFIDENCE = 'PrescriptionConfidence ordinale (`strength.prescriptionConfidence`) : une seule séance observée ne suffit plus pour HIGH (règle « 1 exposition avec RIR = high » abandonnée ; RIR imprécis d’environ une répétition, Halperin 2022). La charge ne change pas, seule sa certitude baisse.';

/** Attribution de CHAQUE différence base → candidat (première règle correspondante). */
export const ATTRIBUTIONS: readonly Attribution[] = [
  // Traçabilité (versionnement 4E §L).
  { scenario: '*', kind: 'reasons', subject: /^DATA\.SCIENCE_REGISTRY$/, cause: 'product_safety_policy', why: 'Version du registre scientifique tracée dans chaque séance (reproductibilité, 4E §L).' },
  // Politique de durée : échauffement, retour au calme, optionnels ajoutés dans le temps libéré.
  { scenario: '*', kind: 'warmup', subject: /./, cause: 'product_safety_policy', why: DURATION_POLICY },
  { scenario: '*', kind: 'cooldown', subject: /./, cause: 'product_safety_policy', why: DURATION_POLICY },
  { scenario: '*', kind: 'omission', subject: /^i\.(cooldown|warmup_extra):duration$/, cause: 'product_safety_policy', why: DURATION_POLICY },
  { scenario: 'S1', kind: '*', subject: /^(séance|fb\.iso_upper\.1|shoulders|DOSE\.LOAD\.CALIBRATION|DOSE\.MODIFIED|DOSE\.VOLUME_ALLOCATED|SELECT\.EXERCISE\.CHOSEN|SELECT\.FILTERED|SELECT\.SLOT_OMITTED)$/, cause: 'product_safety_policy',
    why: `${DURATION_POLICY} Le temps libéré accueille le premier optionnel suivant de l’ordre existant (élévations latérales, calibration à l’effort).` },
  { scenario: 'S2', kind: '*', subject: /^(séance|up\.iso_upper\.2|up\.trunk\.1|up\.iso_upper:duration|up\.trunk:duration|chest|core|shoulders|SELECT\.SLOT_OMITTED|DURATION\.SHORTER_ACCEPTED)$/, cause: 'product_safety_policy',
    why: `${DURATION_POLICY} Le temps libéré sert d’abord l’emplacement optionnel « tronc » (étape 2, ordre existant), avant le 2ᵉ exercice d’isolation (étape 3) : le pec deck sort, le Pallof entre. Point de revue : l’ordre des étapes décide ici du volume pectoraux (5 → 2).` },
  { scenario: 'S6', kind: 'reasons', subject: /^SELECT\.SLOT_OMITTED$/, cause: 'product_safety_policy', why: DURATION_POLICY },
  { scenario: 'S6', kind: 'rest', subject: /^fb\.main_knee\.1 /, cause: 'product_safety_policy', why: 'Ordre de priorité 4E §I (repos du travail principal = priorité 2) : sous contrainte de temps, le repos du principal n’est plus réduit tant que la séance tient autrement (`primaryRest: reduce_last`, principe P5).' },
  // Confiance ordinale et hiérarchie de référence.
  { scenario: '*', kind: 'confidence', subject: /./, cause: 'conservative_range', why: CONFIDENCE },
  { scenario: '*', kind: 'reasons', subject: /^DOSE\.LOAD\.CONFIDENCE$/, cause: 'conservative_range', why: 'Facteurs de la PrescriptionConfidence tracés (récence, observations, séances, cohérence, RIR, conflit, transfert).' },
  { scenario: 'S2', kind: 'load', subject: /./, cause: 'conservative_range', why: CONFIDENCE },
  { scenario: 'S5', kind: 'load', subject: /ex\.leg_curl$/, cause: 'conservative_range', why: CONFIDENCE },
  { scenario: 'S5', kind: '*', subject: /^(lo\.sec_hip\.1 ex\.romanian_deadlift|DOSE\.LOAD\.FROM_E1RM|DOSE\.LOAD\.FROM_SPECIFIC)$/, cause: 'heuristic_reclassification',
    why: 'Epley et `pctByRepsToFailure` reclassés en repli : l’observation récente spécifique (120 kg × 8 à RIR 2, cible 6–8 à RIR 2) fait foi (`strength.load.specificObservation`) ; même charge, certitude « suggérée » (confiance MEDIUM, une séance) ; montée spécifique conservée en relatif (`strength.rampup.estimatedPolicy`, P9).' },
  { scenario: 'S7', kind: '*', subject: /^(up\.main_push_h\.1 ex\.bench_press|DOSE\.LOAD\.FROM_E1RM|DOSE\.LOAD\.FROM_HISTORY)$/, cause: 'conservative_range',
    why: `${CONFIDENCE} Aucune observation spécifique (8 répétitions observées pour une cible de 6) : l’e1RM générique reste le repli, en charge suggérée ; montée spécifique conservée en relatif (P9).` },
  // Interférence graduée.
  { scenario: 'S3', kind: '*', subject: /^(sp\.main_hip\.1 ex\.db_rdl|RIR seulement ex\.db_rdl|DOSE\.MODIFIED)$/, cause: 'conservative_range',
    why: 'InterferenceAssessment : intervalles clés à 20 h, demande MODÉRÉE sur la hanche ⇒ MODERATE ⇒ effort seulement (RIR + 2 existant de la structure), sans série retirée. En 0.2.0, seule une demande HAUTE comptait.' },
  { scenario: 'S3', kind: '*', subject: /^(signal lower_knee|PLAN\.INTERFERENCE_SIGNAL)$/, cause: 'product_safety_policy',
    why: 'Demande HAUTE sur le genou + impact locomoteur haut à 20 h d’une séance clé ⇒ VERY_HIGH : signal structuré au planificateur (recouvrement : optionnels retirés), qui reste seul à décider (frontière GlobalPlanner).' },
  { scenario: 'S4', kind: '*', subject: /^(sp\.main_single\.1 ex\.walking_lunge_db|RIR seulement ex\.(walking_lunge_db|sandbag_lunge)|DOSE\.MODIFIED)$/, cause: 'conservative_range',
    why: 'InterferenceAssessment : séance HYROX clé à 18 h, demande MODÉRÉE sur le genou ⇒ MODERATE ⇒ effort seulement (RIR + 2), sans retrait. En 0.2.0, seule la demande HAUTE (préhension) comptait.' },
  { scenario: '*', kind: 'reasons', subject: /^PLAN\.INTERFERENCE_ASSESSED$/, cause: 'product_safety_policy', why: 'Évaluation de chaque couple (voisine, structure) tracée : matrice transparente.' },
  // Conséquences de durée.
  { scenario: '*', kind: 'duration', subject: /./, cause: 'product_safety_policy', why: 'Conséquence des changements ci-dessus sur l’estimation du CORE (aucune règle de durée modifiée).' },
];

export function attribute(e: DiffEntry): Attribution | undefined {
  return ATTRIBUTIONS.find((a) => (a.scenario === '*' || a.scenario === e.scenario) && (a.kind === '*' || a.kind === e.kind) && a.subject.test(e.subject));
}

/** Phase 4F : classification des différences 0.2.0 → 4E → 4F (§K). */
export type Classification = 'UNCHANGED' | '4E_CHANGE_RETAINED' | '4F_CORRECTION' | 'UNEXPECTED';

export interface Correction4F {
  readonly scenario: string;
  readonly kind: DiffKind | '*';
  readonly subject: RegExp;
  readonly correction: 'C1_REGISTRE' | 'C2_STIMULUS' | 'C3_INTERFERENCE' | 'C4_CONTINUITE';
  readonly why: string;
}

const C2 = 'Préservation du stimulus (`strength.session.stimulusPreservation`) : le pec deck (isolation haut du corps, priorité de stimulus supérieure) omis faute de temps remplace le Pallof (tronc, priorité inférieure) ; sans lui, les pectoraux perdaient la majorité de leur dose (3 séries du pec deck ≥ 2 séries des autres exercices) ; le tronc reste couvert (gainage secondaire). Le temps libéré permet ensuite le retour au calme (politique de durée 4E inchangée).';

export const CORRECTIONS_4F: readonly Correction4F[] = [
  { scenario: 'S2', kind: '*', subject: /^(séance|up\.iso_upper\.2|up\.trunk\.1|up\.iso_upper:duration|up\.trunk:stimulus_preservation|i\.cooldown:duration|retour au calme|chest|core|shoulders|p50|p90|décision|DURATION\.SHORTER_ACCEPTED|SELECT\.EXERCISE\.CHOSEN|SELECT\.SLOT_OMITTED|SELECT\.STIMULUS_PRESERVED)$/, correction: 'C2_STIMULUS', why: C2 },
  { scenario: '*', kind: 'reasons', subject: /^PLAN\.INTERFERENCE_BASIS$/, correction: 'C3_INTERFERENCE', why: 'Trace de la base de preuve de chaque ajustement d’interférence : mécanisme CONTEXT_DEPENDENT, ampleur PROGRAMMING_HEURISTIC (lues dans le registre, indépendantes des bins). Aucun changement de prescription.' },
];

export interface ThreeWayRow {
  readonly scenario: string;
  readonly kind: DiffKind;
  readonly subject: string;
  readonly v020: string;
  readonly v4e: string;
  readonly v4f: string;
  readonly classification: Exclude<Classification, 'UNCHANGED'>;
  readonly why: string;
}

export function threeWay(k: string, s020: Scenario, s4e: Scenario, s4f: Scenario): { rows: ThreeWayRow[]; d1: ScenarioComparison; d2: ScenarioComparison } {
  const d1 = compareScenario(k, s020, s4e);
  const d2 = compareScenario(k, s4e, s4f);
  const key = (e: DiffEntry) => `${e.kind}|${e.subject}`;
  const in2 = new Map(d2.entries.map((e) => [key(e), e]));
  const in1 = new Map(d1.entries.map((e) => [key(e), e]));
  const rows: ThreeWayRow[] = [];
  for (const e of d2.entries) {
    const c = CORRECTIONS_4F.find((x) => (x.scenario === '*' || x.scenario === k) && (x.kind === '*' || x.kind === e.kind) && x.subject.test(e.subject));
    rows.push({ scenario: k, kind: e.kind, subject: e.subject, v020: in1.get(key(e))?.before ?? e.before, v4e: e.before, v4f: e.after, classification: c ? '4F_CORRECTION' : 'UNEXPECTED', why: c ? `${c.correction} — ${c.why}` : 'AUCUNE ATTRIBUTION' });
  }
  for (const e of d1.entries) if (!in2.has(key(e))) rows.push({ scenario: k, kind: e.kind, subject: e.subject, v020: e.before, v4e: e.after, v4f: e.after, classification: '4E_CHANGE_RETAINED', why: attribute(e)?.why ?? 'AUCUNE ATTRIBUTION 4E' });
  return { rows, d1, d2 };
}
