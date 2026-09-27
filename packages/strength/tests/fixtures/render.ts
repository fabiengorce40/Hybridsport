/**
 * Rendu LISIBLE d'une séance générée (revue humaine des goldens, spec 4B étape 23) :
 * exercice, séries × reps, charge / RIR / RPE, repos, rôle, raison de sélection.
 */
import type { ReasonCode, SessionDraft, SessionItem, SetPrescription } from '@hybridsport/domain';

const reps = (r: SetPrescription['reps']): string => (typeof r === 'number' ? String(r) : `${String(r.min)}–${String(r.max)}`);
function intensity(s: SetPrescription): string {
  const i = s.intensity;
  const eff = (e?: { rir?: number; rpe?: number }) => (e ? ('rir' in e && e.rir !== undefined ? `RIR ${String(e.rir)}` : `RPE ${String((e as { rpe: number }).rpe)}`) : '');
  if (!i) return s.rir !== undefined ? `RIR ${String(s.rir)}` : '';
  switch (i.mode) {
    case 'load': return `${String(i.kg)} kg${i.certainty === 'suggested' ? ' (suggérée)' : ''}${i.effort ? ` · ${eff(i.effort)}` : ''}`;
    case 'percent_of_reference': return `${String(i.kgRounded)} kg (${String(Math.round(i.fraction * 100))} % e1RM)${i.effort ? ` · ${eff(i.effort)}` : ''}`;
    case 'effort': return `${eff(i.effort)}${i.indicativeKg ? ` (≈ ${String(i.indicativeKg.min)}–${String(i.indicativeKg.max)} kg)` : ''}`;
    case 'relative_to_working': return `${String(Math.round(i.fraction * 100))} % de la charge de travail`;
    case 'bodyweight': return `poids du corps${i.addedKg ? ` + ${String(i.addedKg)} kg` : ''}${i.effort ? ` · ${eff(i.effort)}` : ''}`;
  }
}

function nonSets(p: Exclude<SessionItem['prescription'], { type: 'sets' }>): string {
  switch (p.type) {
    case 'mobility': return `mobilité ${String(Math.round(p.seconds / 60))} min`;
    case 'hold': return `${String(p.sets)} × ${String(p.seconds)} s tenue · repos ${String(p.restS)} s`;
    case 'intervals': return `${String(p.reps)} × ${'distanceM' in p.work ? `${String(p.work.distanceM)} m` : `${String(p.work.timeS)} s`} · repos ${String(p.recoveryS)} s`;
    default: return p.type;
  }
}

export function renderSession(session: SessionDraft, reasons: readonly ReasonCode[], p50S?: number, roleOf: (slotId: string | undefined) => string | undefined = () => undefined): string {
  const why = new Map<string, string>();
  for (const r of reasons) if (r.code === 'SELECT.EXERCISE.CHOSEN') why.set(String(r.params.exerciseId), String(r.params.decidingCriterion));
  const lines: string[] = [];
  for (const b of session.blocks) {
    lines.push(`  [${b.kind} · ${b.role}${b.format === 'sets' && b.grouping !== 'straight' ? ` · ${b.grouping}` : ''}]`);
    for (const it of b.items) {
      if (it.prescription.type !== 'sets') { lines.push(`    ${it.exerciseId}  (${it.refs?.slotId ?? it.prescription.type}) — ${nonSets(it.prescription)}`); continue; }
      const sets = it.prescription.sets;
      const ramp = sets.filter((s) => s.kind === 'rampup');
      const work = sets.filter((s) => s.kind !== 'rampup');
      const groups: string[] = [];
      for (const s of work) {
        const label = `${s.kind === 'working' ? '' : `${s.kind} `}${reps(s.reps)} · ${intensity(s)} · repos ${String(s.restAfterS)} s${s.optional ? ' (facultative)' : ''}`;
        const last = groups.at(-1);
        if (last && last.endsWith(`× ${label}`)) groups[groups.length - 1] = last.replace(/^(\d+)/, (n) => String(Number(n) + 1));
        else groups.push(`1 × ${label}`);
      }
      const refs = it.refs;
      const tags = [refs?.slotId, roleOf(refs?.slotId) ? `rôle ${roleOf(refs?.slotId) ?? ''}` : undefined, refs?.anchor ? `ancre:${refs.anchor}` : undefined, refs?.progressionTrackId ? `track ${refs.progressionTrackId}` : undefined, refs?.prescriptionSource, refs?.substitutedFrom ? `remplace ${refs.substitutedFrom}` : undefined].filter(Boolean).join(' · ');
      lines.push(`    ${it.exerciseId}  (${tags}) — choix : ${why.get(it.exerciseId) ?? '—'}`);
      if (ramp.length > 0) lines.push(`      montée : ${ramp.map((s) => `${reps(s.reps)} @ ${intensity(s)}`).join(' → ')}`);
      for (const g of groups) lines.push(`      ${g}`);
    }
  }
  if (p50S !== undefined) lines.push(`  Durée estimée (p50) : ${String(Math.round(p50S / 60))} min`);
  return lines.join('\n');
}
