import { approxMinutes, durationLabel, exerciseLabel, strengthDurationReport, fieldFeedbackText, HR_STRUCTURE_LABELS, maintainedInterference, selectFieldHistory, selectFreeRuns, selectProgrammeSession } from '@hybridsport/app-core';
import { FreeRunCard, FreeRunEntry } from '../../running/FreeRunForm.js';
import type { HistoryEntry } from '@hybridsport/app-core';
import { useStore } from '../../store.js';
import { formatDate } from '../../ui.js';
import { ctFormatName, isTest, maintainedText, sessionName, sportName } from '../../present.js';
import { ctResultText } from '../../workout/CrossTrainingWorkout.js';
import { hrResultText } from '../../workout/HyroxWorkout.js';
import { StatusPill } from './common.js';

/** Séries réellement saisies, regroupées par exercice (libellés du catalogue). */
function StrengthLines({ e }: { e: HistoryEntry }) {
  const { state } = useStore();
  const items = selectProgrammeSession(state, e.requestId)?.session.blocks.flatMap((b) => b.items) ?? [];
  const byItem = new Map<string, string[]>();
  for (const x of e.sets) byItem.set(x.itemId, [...(byItem.get(x.itemId) ?? []), `${String(x.reps ?? 0)}${x.loadKg !== undefined ? ` × ${String(x.loadKg)} kg` : ''}`]);
  if (byItem.size === 0) return <div className="tiny">Aucune série saisie.</div>;
  return (
    <div className="stack" style={{ gap: 2 }}>
      {[...byItem].map(([itemId, sets]) => {
        const it = items.find((i) => i.id === itemId);
        return <div key={itemId} className="small num"><b>{it ? exerciseLabel(it.exerciseId) : 'Exercice'}</b> · {sets.join(' · ')}</div>;
      })}
    </div>
  );
}

export function History0({ onOpen }: { onOpen: (id: string) => void }) {
  const { state } = useStore();
  const entries = selectFieldHistory(state);
  // RC3.3 — courses libres (contrat Running), intercalées par date avec les séances du programme ; jamais dupliquées.
  const freeRuns = selectFreeRuns(state);
  const items = [...entries.map((e) => ({ day: e.date, e, r: null })), ...freeRuns.map((r) => ({ day: localDay(r.startedAt), e: null, r }))]
    .sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
  return (
    <div className="screen">
      <h1 className="screen-title">Historique</h1>
      {/* RC3.4 — aussi pour un profil HYROX sans Course : historique de course seulement, sans effet sur HYROX. */}
      {/* RC4.3 (R3) : une course libre compte dans la récupération, même sans sport Course déclaré. */}
      {state.profile && <FreeRunEntry />}
      <DurationReportCard />
      {entries.length === 0 && freeRuns.length === 0 && <div className="empty">Aucune séance terminée pour l’instant.</div>}
      {items.map(({ e, r }) => (r ? <FreeRunCard key={r.sessionId} r={r} /> : e && (
        <button key={e.requestId} className="card button-card" onClick={() => onOpen(e.requestId)}>
          <div className="row between"><span className="small muted">{sportName(e.sport)} · {formatDate(e.date)}</span><StatusPill status={e.completion} /></div>
          <h3>{sessionName(e.sport, e.archetypeId)}{isTest(e.archetypeId) ? ' · TEST' : ''}</h3>
          {e.sport === 'strength' && e.completion !== 'missed' && <StrengthLines e={e} />}
          {e.run && (
            <div className="small muted num">
              {durationLabel(e.run.realizedDurationS)}{e.run.distanceM !== undefined ? ` · ${(e.run.distanceM / 1000).toFixed(1)} km` : ''}
              {e.run.testTimeS !== undefined ? ` · test ${durationLabel(e.run.testTimeS)}${e.testReference ? ' (référence enregistrée)' : ''}` : ''}
            </div>
          )}
          {e.ct && (
            <div className="small muted num">
              {ctFormatName(e.ct.format)} · {e.ct.exercises.map((x) => exerciseLabel(x)).join(' + ')}
              <div><b>{ctResultText(e.ct.result)}</b></div>
            </div>
          )}
          {e.hr && (
            <div className="small muted num">
              {HR_STRUCTURE_LABELS[e.hr.structure] ?? 'HYROX'}{e.hr.rounds > 1 ? ` · ${String(e.hr.rounds)} tours` : ''} · {e.hr.stations.map((x) => exerciseLabel(x)).join(' + ')}{e.hr.runSegments > 0 ? ` + ${String(e.hr.runSegments)} course${e.hr.runSegments > 1 ? 's' : ''}` : ''}
              <div><b>{hrResultText(e.hr.result, e.hr.itemsPerRound)}</b></div>
              {e.hr.performedLoads.length > 0 && <div>Charges réelles saisies : {String(e.hr.performedLoads.length)}</div>}
            </div>
          )}
          {e.composition?.scope === 'TRAINING_BLOCK' && <div className="tiny muted" data-block-scope="TRAINING_BLOCK">Bloc d’entraînement (pas une séance complète)</div>}
          {(e.durationS !== null || e.manual) && <div className="tiny muted num" data-history-meta>{[e.durationS !== null ? `Durée réelle ${durationLabel(e.durationS)}${e.plannedDurationS !== null ? ` · prévue ≈ ${approxMinutes(e.plannedDurationS)}` : ''}` : null, e.manual ? 'Faite hors planning (séance non planifiée)' : null].filter(Boolean).join(' · ')}</div>}
          {e.feedback && <div className="small" data-history-feedback>Ressenti : {fieldFeedbackText(e.feedback)}</div>}
          {/* RC4.5 (lot C) — maintien volontaire, distinct du ressenti déclaré. */}
          {maintainedInterference(state, e.requestId) && <div className="tiny muted" data-interference-maintained>{maintainedText(maintainedInterference(state, e.requestId) ?? [])}</div>}
          {e.pain && <div className="small" style={{ color: 'var(--danger)' }}>⚠ Douleur signalée</div>}
        </button>
      )))}
    </div>
  );
}

/**
 * RC5.4 — durées PRÉVUES et RÉELLES des séances de Musculation (observation) : synthèse et détail par séance. Masqué
 * tant qu'aucune séance de Musculation n'est terminée.
 */
function DurationReportCard() {
  const { state } = useStore();
  const r = strengthDurationReport(state);
  if (r.rows.length === 0) return null;
  const s = r.summary;
  const pct = (x: number) => `${x >= 1 ? '+' : '−'}${String(Math.round(Math.abs(x - 1) * 100))} %`;
  const signed = (d: number) => `${d >= 0 ? '+' : '−'}${durationLabel(Math.abs(d))}`;
  return (
    <details className="card" data-duration-report>
      <summary className="row between"><b>Durées prévues et réelles</b><span className="small muted">Musculation</span></summary>
      <p className="small" style={{ margin: '8px 0' }} data-duration-summary>
        {s.sessions === 0 ? 'Aucune séance mesurée par le chronomètre de séance pour l’instant.'
          : `${String(s.sessions)} séance${s.sessions > 1 ? 's' : ''} mesurée${s.sessions > 1 ? 's' : ''} · écart médian ${signed(s.medianDeltaS ?? 0)} · réel / prévu ${pct(s.meanRatio ?? 1)} en moyenne · ${String(s.onTarget)} à ± 15 % de la prévision`}
      </p>
      <div className="stack" style={{ gap: 4 }}>
        {r.rows.map((x) => (
          <div key={x.requestId} className="small num row between" data-duration-row={x.source}>
            <span>{formatDate(x.date)}</span>
            <span>{x.plannedS !== null ? `prévue ≈ ${approxMinutes(x.plannedS)}` : 'prévue inconnue'} · réelle {durationLabel(x.actualS)}{x.source === 'wall' ? ' (horloge, non mesurée)' : ''}{x.ratio !== null ? ` (${pct(x.ratio)})` : ''}</span>
          </div>
        ))}
      </div>
      <p className="tiny muted" style={{ margin: '8px 0 0' }}>Durée réelle : chronomètre de séance, pauses manuelles exclues. Observation seulement : aucune règle d’entraînement n’en dépend.</p>
    </details>
  );
}

/** Jour LOCAL (fuseau de l'appareil) d'un instant ISO, au format AAAA-MM-JJ. */
function localDay(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
