/**
 * FIELD TEST — Journal Beta : ce qui a été prescrit, fait et ressenti, séance par séance (lecture de l'état persisté,
 * aucun calcul sportif), et export du journal (JSON + texte lisible) pour l'analyse après le test terrain.
 */
import { approxMinutes, betaJournalText, durationLabel, exerciseLabel, exportBetaJournal, fieldFeedbackText, realDurationS, selectBetaJournal } from '@hybridsport/app-core';
import type { BetaJournalEntry } from '@hybridsport/app-core';
import { useStore } from '../store.js';
import { download } from '../screens/Profile.js';
import { BUILD_DATE, BUILD_ID } from '../version.js';
import { arbitrationText, ctFormatName, qualityShortText, sessionName, sportName, STATUS_LABELS } from '../present.js';
import { formatDate, Notice, Topbar } from '../ui.js';

const PLACEMENT: Readonly<Record<string, string>> = { planned: 'Planifiée', composed_unplaced: 'Non planifiée (séance disponible)', blocked: 'Non proposée' };
const NOT_PROPOSED: Readonly<Record<string, string>> = {
  slot_unavailable: 'aucun créneau', interference_conflict: 'trop proche d’une autre séance', governance_blocked: 'règles non disponibles', safety_blocked: 'par précaution',
  engine_refused: 'aucune séance valide', invalid_intent: 'programme incomplet', engine_unavailable: 'sport indisponible', programme_intent_incomplete: 'programme incomplet',
};

/** Ligne lisible d'une séance du journal (aucun code interne). */
function JournalRow({ e }: { e: BetaJournalEntry }) {
  const name = sessionName(e.sport, e.archetypeId);
  const dur = realDurationS(e.execution);
  const p = e.prescription;
  const presc = p ? [ctFormatName(p.ctFormat), p.hrTimeCapS !== null ? `time cap ${approxMinutes(p.hrTimeCapS)}` : p.estimatedDurationS !== null ? `≈ ${approxMinutes(p.estimatedDurationS)}` : null, p.exercises.slice(0, 4).map((x) => exerciseLabel(x)).join(' + ') + (p.exercises.length > 4 ? '…' : '')].filter(Boolean).join(' · ') : null;
  const status = e.status === 'in_progress' ? 'En cours' : STATUS_LABELS[e.status];
  const m3 = e.m3 ? arbitrationText({ arbitration: e.m3 }, formatDate) : null;
  return (
    <div className="card" data-journal={e.requestId} style={{ gap: 4 }}>
      <div className="row between"><span className="small muted">{e.date ? formatDate(e.date) : 'Sans jour'} · {sportName(e.sport)}</span><span className="badge neutral">{status}</span></div>
      <strong className="small">{e.placement === 'blocked' ? `${sportName(e.sport)} : non proposée${e.refusal ? ` (${NOT_PROPOSED[e.refusal.category] ?? 'refus'})` : ''}` : name}</strong>
      <span className="tiny muted">{PLACEMENT[e.placement]}{e.provenance === 'manual_from_unplaced' ? ' · faite manuellement (« Faire maintenant »)' : ''}</span>
      {presc && <span className="tiny">Prescrit : {presc}</span>}
      {e.execution?.finishedAt && <span className="tiny">Réalisé : {status}{dur !== null ? ` · ${durationLabel(dur)}` : ''}{e.execution.pain ? ' · douleur signalée' : ''}</span>}
      {e.feedback && <span className="tiny">Ressenti : {fieldFeedbackText(e.feedback)}</span>}
      {qualityShortText(e.quality?.verdict) && <span className="tiny muted">{qualityShortText(e.quality?.verdict)}</span>}
      {m3 && <span className="tiny muted">{m3}</span>}
    </div>
  );
}

export function JournalBeta({ onBack }: { onBack: () => void }) {
  const store = useStore();
  const entries = selectBetaJournal(store.state);
  const single = import.meta.env.VITE_TARGET === 'single';
  const meta = () => ({ build: BUILD_ID, builtAt: BUILD_DATE, exportedAt: store.clock().now });
  const done = entries.filter((e) => e.execution?.finishedAt).length;
  const withFeedback = entries.filter((e) => e.feedback).length;
  return (
    <>
      <Topbar title="Journal Beta" onBack={onBack} />
      <div className="screen">
        <Notice tone="sim"><span>Résumé du test terrain : séances prescrites, réalisées et votre ressenti. Exportez-le pour le transmettre.</span></Notice>
        <div className="small" aria-label="Résumé du journal">{String(entries.length)} séances au programme · {String(done)} réalisées · {String(withFeedback)} retours terrain</div>
        {single
          ? <Notice tone="warn">Aperçu : export indisponible dans cette page d’aperçu.</Notice>
          : (
            <div className="stack">
              <button className="btn primary" onClick={() => download(`kairo-journal-beta-${store.clock().today}.json`, exportBetaJournal(store.state, meta()))}>Exporter le journal Beta (JSON)</button>
              <button className="btn secondary" onClick={() => download(`kairo-journal-beta-${store.clock().today}.txt`, betaJournalText(store.state, meta()), 'text/plain;charset=utf-8')}>Exporter le journal Beta (texte)</button>
            </div>
          )}
        {entries.length === 0 && <div className="empty">Aucune séance pour l’instant.</div>}
        {[...entries].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || b.requestId.localeCompare(a.requestId)).map((e) => <JournalRow key={e.requestId} e={e} />)}
      </div>
    </>
  );
}
