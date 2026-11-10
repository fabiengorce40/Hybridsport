import type { ProgrammeSessionView } from '@hybridsport/app-core';
import { isSets } from '../workout/StrengthWorkout.js';
import type { SetsItem } from '../workout/StrengthWorkout.js';

const minutes = (s: number) => (s < 60 ? `${String(Math.round(s))} s` : `${String(Math.floor(s / 60))} min${s % 60 >= 30 ? ' 30' : ''}`);

/**
 * REKKA V4 — bilan d'une séance Musculation TERMINÉE. Uniquement des faits enregistrés : issue déclarée et douleur
 * (résultat), durée active figée (`log.timing`), séries réellement validées (journal). Les montées en charge sont
 * comptées à part (hors volume et progression). Aucun record, calorie, score ni objectif n'est calculé ou inventé.
 */
export function SessionSummary({ v, statusLabel }: { v: ProgrammeSessionView; statusLabel: string }) {
  const { log, result } = v;
  if (!log || !result) return null;
  const items = v.session.blocks.filter((b) => !['warmup', 'cooldown'].includes(b.kind)).flatMap((b) => b.items.filter(isSets)) as SetsItem[];
  const done = (item: SetsItem, i: number) => log.sets.some((s) => s.itemId === item.id && s.setIndex === i && s.done);
  let work = 0, workDone = 0, ramp = 0, rampDone = 0, exDone = 0;
  for (const item of items) {
    let all = true;
    item.prescription.sets.forEach((set, i) => {
      if (set.kind === 'rampup') { ramp += 1; if (done(item, i)) rampDone += 1; return; }
      work += 1;
      if (done(item, i)) workDone += 1; else if (!set.optional) all = false;
    });
    if (all) exDone += 1;
  }
  const painItems = log.painItems.length;
  return <section className="pf-summary" data-pf-summary aria-label="Bilan de séance">
    <header><h2>Bilan de séance</h2><span className="pf-summary-status" data-completion={result.completion}>{statusLabel}</span></header>
    <dl className="pf-summary-stats">
      <div><dt>Durée active</dt><dd>{log.timing ? minutes(log.timing.activeS) : '—'}</dd>{log.timing && log.timing.pausedS > 0 && <small>pauses {minutes(log.timing.pausedS)}</small>}</div>
      <div><dt>Séries de travail</dt><dd>{workDone}/{work}</dd></div>
      <div><dt>Exercices terminés</dt><dd>{exDone}/{items.length}</dd></div>
    </dl>
    {ramp > 0 && <p>Montées en charge : {rampDone}/{ramp} · hors volume et progression.</p>}
    <p className={result.pain || painItems > 0 ? 'pf-summary-warn' : undefined}>
      {result.pain ? 'Douleur signalée en fin de séance.' : 'Aucune douleur signalée en fin de séance.'}
      {painItems > 0 && ` Douleur notée sur ${String(painItems)} exercice${painItems > 1 ? 's' : ''}.`}
    </p>
    {result.completion === 'abandoned' && <p className="pf-summary-warn">Séance arrêtée : seules les séries validées sont enregistrées.</p>}
  </section>;
}
