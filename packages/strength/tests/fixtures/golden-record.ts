/**
 * Enregistrement complet d'une séance golden (spec 4B étape 17) : entrées (intention, contexte, profil,
 * graine), séance, prescriptions, reason codes de la séance retenue, empreinte, durée et validation.
 */
import type { ReasonCode } from '@hybridsport/domain';
import { readStrengthParams } from '../../src/index.js';
import { run, strengthCatalog, strengthRuleset } from './harness.js';
import type { Scenario } from './harness.js';
import { renderSession } from './render.js';

const PARAMS = readStrengthParams(strengthRuleset()).values;
const CATALOG = strengthCatalog();

export function goldenOutcome(s: Scenario) {
  const o = run(s);
  const sessionId = o.result.status === 'ok' ? o.result.value.id : undefined;
  const entries = o.trace.entries.filter((e) => sessionId !== undefined && e.subject.id === sessionId);
  const reasons: ReasonCode[] = entries.flatMap((e) => e.reasons);
  const estimated = entries.filter((e) => e.step === 'duration').flatMap((e) => e.reasons).find((r) => r.code === 'DURATION.ESTIMATED');
  const p50S = estimated ? Number(estimated.params.p50S) : undefined;
  const p90S = estimated ? Number(estimated.params.p90S) : undefined;
  const validation = entries.filter((e) => e.step === 'validate').map((e) => e.decision).at(-1);
  const durationDecision = entries.filter((e) => e.step === 'duration').map((e) => e.decision).at(-1);
  return { outcome: o, sessionId, reasons, p50S, p90S, validation, durationDecision };
}

export function goldenRecord(title: string, s: Scenario): { json: unknown; text: string } {
  const g = goldenOutcome(s);
  const o = g.outcome;
  const session = o.result.status === 'ok' ? o.result.value : undefined;
  const json = {
    title,
    input: { seed: s.seed, profile: s.profile, state: s.state ?? 'STATE (normal)', intent: s.intent, context: s.context, history: s.history ?? [] },
    result: o.result.status === 'error' ? { status: 'error', code: o.result.error.code, reasons: o.result.error.reasons.map((r) => ({ code: r.code, params: r.params })) } : { status: o.result.status },
    session,
    reasons: g.reasons.map((r) => ({ code: r.code, params: r.params })),
    fingerprint: o.fingerprint,
    duplicate: o.duplicate?.classification,
    duration: { p50S: g.p50S, p90S: g.p90S, decision: g.durationDecision, availableS: s.intent.availableTimeS, targetS: s.intent.targetDurationS },
    validation: g.validation,
    trace: o.trace.entries.map((e) => `${e.step}:${e.subject.id}:${e.decision}`),
  };
  const archetype = PARAMS['strength.archetypes'].find((a) => a.id === s.intent.archetypeId);
  const roleOf = (slotId: string | undefined) => archetype?.slots.find((x) => x.id === slotId)?.role;
  const c = s.context;
  const header = [
    `# ${title}`,
    `contexte : niveau ${s.profile.athleteLevel} · objectif ${JSON.stringify(c.goal)} · archétype ${s.intent.archetypeId} · stimulus ${s.intent.stimulus} · phase ${c.phase?.kind ?? 'accumulation'}`,
    `temps : disponible ${String(Math.round(s.intent.availableTimeS / 60))} min · cible ${String(Math.round(s.intent.targetDurationS / 60))} min · matériel : ${s.profile.availableEquipment.join(', ')}`,
    `semaine : ${c.week?.known === false ? 'inconnue' : 'connue'} · voisines : ${(c.week?.neighbors ?? []).map((n) => `${n.discipline}/${n.stimulus} ${n.priority} à ${String(n.hoursFromThisSession)} h ${JSON.stringify(n.demand)}`).join(' ; ') || 'aucune'}`,
    `historique : ${String(c.recentExposures?.length ?? 0)} exposition(s) · tracks : ${(c.tracks ?? []).map((t) => `${t.trackId}=${t.exerciseId}@${t.slotId}`).join(', ') || 'aucune'} · ancres déclarées : ${s.intent.repetitionIntents?.flatMap((r) => (r.kind === 'progression_anchor' ? [r.trackId] : [])).join(', ') || 'aucune'}`,
    `résultat : ${o.result.status}${o.result.status === 'error' ? ` ${o.result.error.code}` : ''} · validation : ${g.validation ?? '—'} · durée : ${g.durationDecision ?? '—'} · p50 ${g.p50S !== undefined ? String(Math.round(g.p50S / 60)) : '—'} min · p90 ${g.p90S !== undefined ? String(Math.round(g.p90S / 60)) : '—'} min`,
  ];
  const exposure: Record<string, number> = {};
  for (const it of session ? session.blocks.flatMap((b) => b.items) : []) {
    const e = CATALOG.exercise(it.exerciseId);
    const w = it.prescription.type === 'sets' ? it.prescription.sets.filter((x) => x.kind !== 'rampup' && x.optional !== true).length : it.prescription.type === 'hold' ? it.prescription.sets : it.prescription.type === 'intervals' ? it.prescription.reps : 0;
    if (!e || w === 0) continue;
    for (const [grp, muscles] of Object.entries(PARAMS['strength.volume'].muscleGroups)) {
      if (muscles.some((m) => e.muscles.primary.includes(m))) exposure[grp] = (exposure[grp] ?? 0) + w;
      else if (muscles.some((m) => e.muscles.secondary.includes(m))) exposure[grp] = (exposure[grp] ?? 0) + w * PARAMS['strength.volume'].secondaryWeight;
    }
  }
  const omissions = g.reasons.filter((r) => r.code === 'SELECT.SLOT_OMITTED' || r.code === 'PLAN.STRUCTURE_LOWERED' || r.code === 'SELECT.PATTERN_FALLBACK' || r.code === 'SELECT.SUBSTITUTION' || r.code === 'PROGRESSION.ANCHOR_NOT_APPLICABLE' || r.code === 'DOSE.SESSION_CAP_APPLIED')
    .map((r) => `${r.code} ${Object.entries(r.params).map(([k, v]) => `${k}=${Array.isArray(v) ? v.join('+') : String(v)}`).join(' ')}`);
  const text = [...header,
    session ? renderSession(session, g.reasons, undefined, roleOf) : o.result.status === 'error' ? o.result.error.reasons.map((r) => `  ${r.code} ${JSON.stringify(r.params)}`).join('\n') : '',
    `exposition musculaire (séries difficiles E1, secondaire × ${String(PARAMS['strength.volume'].secondaryWeight)}) : ${Object.entries(exposure).sort().map(([k, v]) => `${k} ${String(v)}`).join(' · ') || '—'}`,
    `omissions / adaptations : ${omissions.length > 0 ? '' : 'aucune'}`, ...omissions.map((x) => `  - ${x}`)].join('\n');
  return { json, text: `${text}\n` };
}
