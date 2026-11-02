/**
 * Reprise RC5 lot 4.5 (chantier B, étape B1) — AUDIT PAR EXPOSITION, moteur réel (rapport `lot45-exposure-audit.md`) :
 * pour chaque exposition d'un exercice principal : prescription (charge, répétitions, RIR prescrit), référence durable et
 * allègement (adaptation multisport), performance réalisée, écart au RIR prescrit, validité de l'estimation de capacité
 * (répétitions jusqu'à l'échec dans la plage du ruleset), classement, décision et charge de l'exposition suivante.
 * Lecture : une séance ALLÉGÉE n'est pas un échec ; un RIR réalisé inférieur au prescrit signifie un effort plus dur que
 * prévu, pas à lui seul une perte de capacité.
 */
import { describe, expect, it } from 'vitest';
import { readStrengthParams } from '@hybridsport/strength';
import { strengthContent } from '../../src/index.js';
import type { AppState } from '../../src/index.js';
import { simulate } from '../rc4-audit/rc4-sim.js';
import type { ProfileSpec } from '../rc4-audit/rc4-sim.js';
import { variantEnv } from './lot42-bench.js';
import { B_VARIANTS, lot45Scenarios } from './lot45-bench.js';
import { WEEKS } from './lot4-profiles.js';

const L = readStrengthParams(strengthContent().ruleset).values['strength.load'];
type Row = { readonly date: string; readonly kg: string; readonly presc: string; readonly ref: string; readonly lightened: boolean; readonly done: string; readonly rtf: string; readonly valid: string; readonly cls: string; readonly reading: string; readonly decision: string; readonly next: string };

/** Lecture d'une exposition (catégorie demandée par le lot 4.5). */
function reading(cls: string, lightened: boolean, valid: boolean, effort: string): string {
  if (effort === 'unknown') return 'effort non saisi : données insuffisantes';
  if (cls === 'below' && lightened) return 'séance allégée, effort plus dur que la cible allégée (pas un échec démontré)';
  if (cls === 'below') return 'sous-performance face à la prescription';
  if (!valid) return 'réussite, estimation de capacité hors plage (non interprétable)';
  return lightened ? 'séance allégée réussie' : 'réussite';
}

export function exposureAudit(state: AppState, exerciseId: string): Row[] {
  const audit = state.programmeState?.audit ?? [];
  const exps = state.strength.exposures.filter((x) => x.exerciseId === exerciseId);
  const rows: Row[] = [];
  let k = 0;
  for (let i = 0; i < audit.length; i++) {
    const a = audit[i];
    if (!a || a.reason.code !== 'PROGRESSION.EXPOSURE_CLASSIFIED' || a.reason.params.exerciseId !== exerciseId) continue;
    const p = a.reason.params as Record<string, string>;
    const decisions: string[] = [];
    for (let j = i + 1; j < audit.length; j++) {
      const b = audit[j];
      if (!b || b.reason.code === 'PROGRESSION.EXPOSURE_CLASSIFIED' || b.at !== a.at) break;
      if (b.reason.params.trackId === p.trackId) decisions.push(`${b.reason.code.slice('PROGRESSION.'.length)}${b.reason.params.cause ? `:${String(b.reason.params.cause)}` : ''}`);
    }
    // Exposition correspondante (même instant) et suivante (charge réellement prescrite ensuite).
    const idx = exps.findIndex((x, n) => n >= k && x.at === a.at);
    const e = idx >= 0 ? exps[idx] : undefined;
    if (idx >= 0) k = idx + 1;
    const last = e?.sets.at(-1);
    const rtf = last && last.rir !== undefined ? last.reps + last.rir : undefined;
    const valid = rtf !== undefined && rtf >= L.validRepRange.min && rtf <= L.validRepRange.max;
    const lightened = p.referenceRir !== 'n/a' && Number(p.prescribedRir) > Number(p.referenceRir);
    rows.push({
      date: a.at.slice(0, 10), kg: String(e?.sets[0]?.loadKg ?? '—'), presc: p.prescribedRir ?? '—', ref: p.referenceRir ?? '—', lightened,
      done: last ? `${String(last.reps)} × ${String(last.loadKg ?? '—')} kg, RIR ${String(last.rir ?? '—')}` : '—', rtf: rtf === undefined ? '—' : String(rtf), valid: rtf === undefined ? '—' : valid ? 'oui' : 'NON',
      cls: p.exposure ?? '—', reading: reading(p.exposure ?? '', lightened, valid, p.effort ?? ''), decision: decisions.join(', ') || '—', next: String(exps[idx + 1]?.sets[0]?.loadKg ?? '—'),
    });
  }
  return rows;
}

const CASES: readonly { readonly scenario: string; readonly variant: string; readonly exercise: string }[] = [
  { scenario: 'E-RUN', variant: 'A', exercise: 'ex.back_squat' },
  { scenario: 'E-RUN', variant: 'B-CLAMP', exercise: 'ex.back_squat' },
  { scenario: 'E-FPERS', variant: 'A', exercise: 'ex.back_squat' },
  { scenario: 'E-HYX', variant: 'A', exercise: 'ex.back_squat' },
  { scenario: 'E-PROG', variant: 'A', exercise: 'ex.leg_curl' },
];

describe('lot 4.5 — audit par exposition (moteur réel)', () => {
  const states = new Map<string, AppState>();
  const stateOf = (sc: string, v: string) => {
    const key = `${sc}|${v}`;
    const hit = states.get(key);
    if (hit) return hit;
    const spec = lot45Scenarios().find((x) => x.id === sc) as ProfileSpec;
    const variant = B_VARIANTS.find((x) => x.id === v);
    if (!variant) throw new Error(v);
    const s = simulate(spec, WEEKS, variantEnv(variant)).state;
    states.set(key, s);
    return s;
  };
  it('rapport reproductible', async () => {
    const out = ['# Reprise RC5 lot 4.5 — audit par exposition (moteur réel, 12 semaines)', '',
      `Plage de validité de l'estimation (ruleset actif, inchangée) : ${String(L.validRepRange.min)} à ${String(L.validRepRange.max)} répétitions jusqu'à l'échec. RIR prescrit : première série de travail (montées exclues). Référence : RIR durable de la prescription (lot 4.5).`, ''];
    for (const c of CASES) {
      out.push(`## ${c.scenario} — ${c.variant} — ${c.exercise}`, '', '| Date | Charge | RIR prescrit | Référence | Allégée | Réalisé (dernière série) | Répétitions jusqu’à l’échec | Estimation valide | Classement | Lecture | Décision | Charge suivante |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
      for (const r of exposureAudit(stateOf(c.scenario, c.variant), c.exercise)) out.push(`| ${r.date} | ${r.kg} | ${r.presc} | ${r.ref} | ${r.lightened ? 'oui' : 'non'} | ${r.done} | ${r.rtf} | ${r.valid} | ${r.cls} | ${r.reading} | ${r.decision} | ${r.next} |`);
      out.push('');
    }
    await expect(`${out.join('\n')}\n`).toMatchFileSnapshot('__reports__/lot45-exposure-audit.md');
  }, 600_000);
  it('aucune référence au-dessus du RIR prescrit ; toute exposition d’un principal a une référence établie', () => {
    for (const c of CASES.filter((x) => x.variant === 'A')) for (const r of exposureAudit(stateOf(c.scenario, c.variant), c.exercise)) {
      expect(r.ref).not.toBe('n/a');
      expect(Number(r.ref)).toBeLessThanOrEqual(Number(r.presc));
    }
  }, 600_000);
});
