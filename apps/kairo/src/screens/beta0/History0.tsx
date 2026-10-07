import { durationLabel, exerciseLabel, fieldFeedbackText, HR_STRUCTURE_LABELS, selectFieldHistory, selectProgrammeSession } from '@hybridsport/app-core';
import type { HistoryEntry } from '@hybridsport/app-core';
import { useStore } from '../../store.js';
import { formatDate } from '../../ui.js';
import { ctFormatName, isTest, sessionName, sportName } from '../../present.js';
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
  return (
    <div className="screen">
      <h1 className="screen-title">Historique</h1>
      {entries.length === 0 && <div className="empty">Aucune séance terminée pour l’instant.</div>}
      {entries.map((e) => (
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
          {(e.durationS !== null || e.manual) && <div className="tiny muted num" data-history-meta>{[e.durationS !== null ? `Durée réelle ${durationLabel(e.durationS)}` : null, e.manual ? 'Faite hors planning (séance non planifiée)' : null].filter(Boolean).join(' · ')}</div>}
          {e.feedback && <div className="small" data-history-feedback>Ressenti : {fieldFeedbackText(e.feedback)}</div>}
          {e.pain && <div className="small" style={{ color: 'var(--danger)' }}>⚠ Douleur signalée</div>}
        </button>
      ))}
    </div>
  );
}
