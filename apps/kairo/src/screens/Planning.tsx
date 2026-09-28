import { PLAN_NOTICES, RUNNING_ARCHETYPE_LABELS, SILENT_PLAN_NOTICES, SPORT_LABELS, UNPLACED_REASONS, weekdayIndex } from '@hybridsport/app-core';
import type { Sport } from '@hybridsport/app-core';
import { useStore } from '../store.js';
import { weekView } from '../derive.js';
import { formatDateShort, Notice, weekdayShort } from '../ui.js';
import { SessionCard } from './Home.js';

export function Planning({ onOpen, onEditProfile }: { onOpen: (key: string) => void; onEditProfile: () => void }) {
  const { state, clock } = useStore();
  const today = clock().today;
  const { days, weekStart } = weekView(state, today);
  const plan = state.plans[weekStart];
  const avail = state.profile?.availability ?? [];
  return (
    <div className="screen">
      <h1 className="screen-title">Planning</h1>
      <p className="small muted">Semaine du {Number(weekStart.slice(8))}/{weekStart.slice(5, 7)}. Une séance par jour au plus, uniquement les jours où vous êtes disponible.</p>

      {plan?.unplaced.map((u) => (
        <Notice key={u.sport} tone="warn">{String(u.count)} séance{u.count > 1 ? 's' : ''} de {SPORT_LABELS[u.sport as Sport].toLowerCase()} non placée{u.count > 1 ? 's' : ''} : {UNPLACED_REASONS[u.reason] ?? u.reason}.</Notice>
      ))}

      <div className="week">
        {days.map((d) => {
          const i = weekdayIndex(d.date);
          const past = d.date < today && !d.done && d.entry;
          return (
            <div key={d.date} className={`day ${d.date === today ? 'today' : ''}`}>
              <div className="d"><span className="w">{weekdayShort(i)}</span><span className="n num">{Number(d.date.slice(8))}</span></div>
              {d.entry ? (
                <div className="stack">
                  <SessionCard day={d} onOpen={onOpen} highlight={d.date === today} />
                  {past && <span className="tiny">Séance passée non réalisée.</span>}
                </div>
              ) : (
                <div className="rest">{(avail[i] ?? 0) > 0 ? 'Disponible — aucune séance' : 'Repos'}</div>
              )}
            </div>
          );
        })}
      </div>

      {plan && plan.dropped.length > 0 && (
        <Notice tone="warn">
          <div className="stack">
            <strong>Séances de course manquées, non compensées</strong>
            {plan.dropped.map((d) => <span key={`${d.date}${d.archetypeId}`} className="small">{formatDateShort(d.date)} · {RUNNING_ARCHETYPE_LABELS[d.archetypeId] ?? d.archetypeId}</span>)}
          </div>
        </Notice>
      )}
      {plan?.notices.filter((n) => !SILENT_PLAN_NOTICES.includes(n.code)).map((n) => <Notice key={JSON.stringify(n)} tone={n.code === 'PLAN.RECOVERY_RULE_UNGOVERNED' ? 'warn' : 'info'}>{PLAN_NOTICES[n.code]?.(n.params) ?? n.code}</Notice>)}
      <button className="btn secondary" onClick={onEditProfile}>Revoir mes contraintes</button>
    </div>
  );
}
