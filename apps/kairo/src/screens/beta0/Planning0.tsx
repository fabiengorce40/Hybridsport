import { weekdayIndex } from '@hybridsport/app-core';
import { useStore } from '../../store.js';
import { formatDate, Notice, weekdayShort } from '../../ui.js';
import { ExperimentalBadge, SessionCard0, weekOf, WeekPlanningNotice } from './common.js';
import { NoWeek, PainPause } from './Home0.js';

export function Planning0({ onOpen, onGo }: { onOpen: (id: string) => void; onGo: (t: 'settings') => void }) {
  const { state, clock } = useStore();
  const today = clock().today;
  const week = weekOf(state, today);
  const avail = state.profile?.availability ?? [];
  const unplanned = week?.items.filter((x) => x.display === 'not_planned') ?? [];
  return (
    <div className="screen">
      <div className="row between"><h1 className="screen-title">Planning</h1>{week?.experimental && <ExperimentalBadge />}</div>
      {state.safety.activePain && <PainPause onGo={() => onGo('settings')} />}
      {!week || week.items.length === 0 ? <NoWeek today={today} /> : (
        <>
          <WeekPlanningNotice planning={week.planning} />
          <p className="small muted">Semaine {week.weekIndex + 1}{week.programme.targetDate ? ` · objectif le ${formatDate(week.programme.targetDate)}` : ''} · du {Number(week.weekStart.slice(8))}/{week.weekStart.slice(5, 7)}. Une séance par jour au plus.</p>
          <div className="week">
            {week.days.map(({ date: d, sessions: s }) => {
              const wd = weekdayIndex(d);
              return (
                <div key={d} className={`day ${d === today ? 'today' : ''}`}>
                  <div className="d"><span className="w">{weekdayShort(wd)}</span><span className="n num">{Number(d.slice(8))}</span></div>
                  {s.length > 0
                    ? <div className="stack">{s.map((x) => <SessionCard0 key={x.requestId} v={x} onOpen={onOpen} highlight={d === today} />)}</div>
                    : <div className="rest">{(avail[wd] ?? 0) > 0 ? 'Disponible, aucune séance' : 'Repos'}</div>}
                </div>
              );
            })}
          </div>
          {unplanned.length > 0 && (
            <>
              <div className="section-title">Non planifiées</div>
              {unplanned.map((x) => <SessionCard0 key={x.requestId} v={x} onOpen={onOpen} />)}
            </>
          )}
          {week.experimental && <Notice tone="sim">Certaines règles de planification sont encore en cours de validation.</Notice>}
        </>
      )}
    </div>
  );
}
