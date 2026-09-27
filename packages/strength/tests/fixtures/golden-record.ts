/**
 * Enregistrement complet d'une séance golden (spec 4B étape 17) : entrées (intention, contexte, profil,
 * graine), séance, prescriptions, reason codes de la séance retenue, empreinte, durée et validation.
 */
import type { ReasonCode } from '@hybridsport/domain';
import { run } from './harness.js';
import type { Scenario } from './harness.js';
import { renderSession } from './render.js';

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
  const text = [`# ${title}`, `résultat : ${o.result.status}${o.result.status === 'error' ? ` ${o.result.error.code}` : ''} · validation : ${g.validation ?? '—'} · durée : ${g.durationDecision ?? '—'}`,
    session ? renderSession(session, g.reasons, g.p50S) : o.result.status === 'error' ? o.result.error.reasons.map((r) => `  ${r.code} ${JSON.stringify(r.params)}`).join('\n') : ''].join('\n');
  return { json, text: `${text}\n` };
}
