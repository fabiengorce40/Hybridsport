import { DIFFICULTY_LABELS, durationLabel, exerciseLabel, PAIN_AREAS } from '@hybridsport/app-core';
import { useStore } from '../store.js';
import { completedSessions } from '../derive.js';
import { AuthorityBadge, formatDate, sessionTitle, sportLabel } from '../ui.js';

export function History({ onOpen }: { onOpen: (key: string) => void }) {
  const { state } = useStore();
  const done = completedSessions(state);
  const anchors = state.strength.tracks.filter((t) => t.status !== 'closed');
  return (
    <div className="screen">
      <h1 className="screen-title">Historique</h1>
      {done.length === 0 && <div className="empty">Aucune séance terminée pour l’instant.</div>}
      {done.map(({ key, session, finishedAt }) => {
        const log = state.logs[key];
        const sets = log?.sets.filter((x) => x.done) ?? [];
        const volume = sets.reduce((a, x) => a + (x.reps ?? 0) * (x.loadKg ?? 0), 0);
        const mins = log?.run ? log.run.realizedDurationS / 60 : log ? (Date.parse(finishedAt) - Date.parse(log.startedAt)) / 60_000 : 0;
        return (
          <button key={key} className="card button-card" onClick={() => onOpen(key)}>
            <div className="row between"><span className="small muted">{sportLabel(session.sport)} · {formatDate(session.date)}</span><AuthorityBadge authority={session.authority} /></div>
            <h3>{sessionTitle(session)}</h3>
            <div className="small muted num">
              {durationLabel(Math.round(mins) * 60)}
              {session.sport === 'strength' ? ` · ${String(sets.length)} séries${volume > 0 ? ` · ${String(Math.round(volume))} kg soulevés` : ''}` : ''}
              {log?.feedback ? ` · ${DIFFICULTY_LABELS[log.feedback.difficulty] ?? ''}` : ''}
            </div>
            {log?.feedback?.pain && <div className="small" style={{ color: 'var(--danger)' }}>Douleur signalée{log.feedback.painAreas.length > 0 ? ` : ${log.feedback.painAreas.map((a) => PAIN_AREAS[a] ?? a).join(', ')}` : ''}</div>}
            {log?.feedback?.note && <div className="tiny">« {log.feedback.note} »</div>}
          </button>
        );
      })}
      {anchors.length > 0 && (
        <>
          <div className="section-title">Progression suivie (moteur Strength)</div>
          {anchors.map((t) => (
            <div key={t.trackId} className="card" style={{ gap: 4 }}>
              <div className="row between"><strong>{exerciseLabel(t.exerciseId)}</strong><span className="badge neutral">{t.status === 'suspended' ? 'SUSPENDU' : t.tier === 'anchor' ? 'RÉFÉRENCE' : 'SUIVI'}</span></div>
              {t.nextPrescription && (
                <div className="small muted num">Prochaine cible : {String(t.nextPrescription.sets)} × {typeof t.nextPrescription.reps === 'number' ? String(t.nextPrescription.reps) : `${String(t.nextPrescription.reps.min)}–${String(t.nextPrescription.reps.max)}`}{t.nextPrescription.loadKg ? ` @ ${String(t.nextPrescription.loadKg)} kg` : ''}</div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
