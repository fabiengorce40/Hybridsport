import type { ProgrammeSessionView } from '@hybridsport/app-core';
import { isSets } from '../workout/StrengthWorkout.js';
import type { SetsItem } from '../workout/StrengthWorkout.js';

const minutes = (s: number) => (s < 60 ? `${String(Math.round(s))} s` : `${String(Math.floor(s / 60))} min${s % 60 >= 30 ? ' 30' : ''}`);

/**
 * REKKA V4 — bilan d'une séance Musculation TERMINÉE. Uniquement des faits enregistrés : issue déclarée et douleur
 * (résultat), durée active figée (`log.timing`), séries réellement validées (journal). Les montées en charge sont
 * comptées à part (hors volume et progression). Aucun record, calorie, score ni objectif n'est calculé ou inventé.
 */
export function SessionSummary({ v, statusLabel, onReturn }: { v: ProgrammeSessionView; statusLabel: string; onReturn: () => void }) {
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
  return <section className="pf-summary pf-summary-board" data-pf-summary aria-label="Bilan de séance">
    <div className="pf-summary-celebration" role="status">
      <div className="pf-summary-seal" aria-hidden="true"><svg viewBox="0 0 112 112">
        <path fill="#ffcb08" d="M56 1C67 1 70 15 81 15c13 0 16 7 16 19 0 10 14 13 14 22S99 69 99 80c0 13-7 17-20 17-10 0-13 14-23 14S43 98 32 98c-13 0-18-7-18-20C14 68 1 65 1 56s13-14 13-24c0-13 7-17 19-17C43 15 46 1 56 1Z"/>
        <path d="m36 58 13 13 27-30" fill="none" stroke="#0e1b35" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
      </svg></div>
      <h2>Séance terminée !</h2>
      <span className="pf-summary-status" data-completion={result.completion}>{statusLabel}</span>
    </div>
    <header><h3>Bilan de séance</h3></header>
    <dl className="pf-summary-stats">
      <div><span className="pf-summary-stat-icon" aria-hidden="true">◴</span><dt>Durée active</dt><dd>{log.timing ? minutes(log.timing.activeS) : '—'}</dd>{log.timing && log.timing.pausedS > 0 && <small>pauses {minutes(log.timing.pausedS)}</small>}</div>
      <div><span className="pf-summary-stat-icon pf-summary-stat-icon--blue" aria-hidden="true">☑</span><dt>Séries de travail</dt><dd>{workDone}/{work}</dd></div>
      <div><span className="pf-summary-stat-icon pf-summary-stat-icon--orange" aria-hidden="true">◉</span><dt>Exercices terminés</dt><dd>{exDone}/{items.length}</dd></div>
    </dl>
    <div className="pf-summary-insight" role="note">
      <span aria-hidden="true">◎</span>
      <div><strong>{result.completion==='abandoned'?'Séance arrêtée':'Entraînement enregistré !'}</strong>
        <small>{result.completion==='abandoned'?'Les séries validées restent dans ton historique.':'Toutes les statistiques viennent de tes performances enregistrées.'}</small>
      </div>
    </div>
    <button type="button" className="pf-summary-open" onClick={() => {
      const details = document.getElementById('pf-finished-details') as HTMLDetailsElement | null;
      if (details) { details.open = true; details.scrollIntoView({ behavior:'smooth', block:'start' }); }
    }}>Voir le bilan détaillé <span aria-hidden="true">›</span></button>
    <button type="button" className="pf-summary-back" onClick={onReturn}>Retour à l’accueil</button>
        {ramp > 0 && <p>Montées en charge : {rampDone}/{ramp} · hors volume et progression.</p>}
    <p className={result.pain || painItems > 0 ? 'pf-summary-warn' : undefined}>
      {result.pain ? 'Douleur signalée en fin de séance.' : 'Aucune douleur signalée en fin de séance.'}
      {painItems > 0 && ` Douleur notée sur ${String(painItems)} exercice${painItems > 1 ? 's' : ''}.`}
    </p>
    {result.completion === 'abandoned' && <p className="pf-summary-warn">Séance arrêtée : seules les séries validées sont enregistrées.</p>}
  </section>;
}
