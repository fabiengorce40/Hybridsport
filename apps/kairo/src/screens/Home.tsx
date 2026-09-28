import { approxMinutes, PLAN_NOTICES, primaryReason, reasonMessage, RUNNING_ROLE_LABELS, weekdayIndex } from '@hybridsport/app-core';
import { useStore } from '../store.js';
import { recommended, weekStats, weekView } from '../derive.js';
import type { DayView } from '../derive.js';
import { AuthorityBadge, formatDate, Notice, sessionTitle, sportLabel, weekdayShort } from '../ui.js';

export function SessionCard({ day, onOpen, highlight = false }: { day: DayView; onOpen: (key: string) => void; highlight?: boolean }) {
  const g = day.session;
  if (!g || !day.entry) return null;
  const key = day.entry.key;
  if (g.outcome.status !== 'ok') {
    const r = primaryReason(g.outcome.reasons);
    return (
      <button className="card button-card" onClick={() => onOpen(key)} aria-label={`${sportLabel(g.sport)} indisponible`}>
        <div className="row between"><span className="small muted">{sportLabel(g.sport)}</span><span className="badge unavailable">INDISPONIBLE</span></div>
        <div className="small">{r ? reasonMessage(r) : 'Aucune séance valide.'}</div>
      </button>
    );
  }
  const items = g.outcome.session.blocks.flatMap((b) => b.items).filter((i) => i.prescription.type !== 'mobility');
  const est = g.outcome.estimate;
  return (
    <button className={`card button-card ${highlight ? 'accent' : ''}`} onClick={() => onOpen(key)}>
      <div className="row between">
        <span className="small muted">{sportLabel(g.sport)}</span>
        <span className="row">{day.done ? <span className="badge done">TERMINÉE</span> : day.started ? <span className="badge neutral">EN COURS</span> : null}<AuthorityBadge authority={g.authority} /></span>
      </div>
      <h3>{sessionTitle(g)}</h3>
      <div className="small muted num">
        {g.sport === 'strength' ? `${String(items.length)} exercices` : (RUNNING_ROLE_LABELS[day.entry.role ?? ''] ?? 'Course')}
        {est ? ` · ≈ ${approxMinutes(est.p50S)}` : ''}
        {` · ${String(day.entry.availableMinutes)} min disponibles`}
      </div>
    </button>
  );
}

export function Home({ onOpen, onGo }: { onOpen: (key: string) => void; onGo: (t: 'plan' | 'profile' | 'run') => void }) {
  const { state, clock } = useStore();
  const today = clock().today;
  const next = recommended(state, today);
  const stats = weekStats(state, today);
  const { days, weekStart } = weekView(state, today);
  const plan = state.plans[weekStart];
  const name = state.profile?.displayName;
  return (
    <div className="screen">
      <div className="hero">
        <div className="hero-brand">KAI<span>RO</span></div>
        <p className="small">{formatDate(today)}</p>
        <h1>{name ? `${name}, ` : ''}{next ? (next.date === today ? 'c’est le moment.' : 'prochaine séance.') : 'rien de prévu.'}</h1>
        {next && <SessionCard day={next} onOpen={onOpen} highlight />}
        {next && next.session?.outcome.status === 'ok' && (
          <button className="btn primary block" onClick={() => onOpen(next.entry?.key ?? '')}>{next.started ? 'Reprendre la séance' : next.date === today ? 'Démarrer la séance' : `Voir la séance de ${formatDate(next.date).split(' ')[0] ?? ''}`}</button>
        )}
      </div>

      {state.safety.activePain && (
        <Notice tone="danger">
          <div className="stack">
            <strong>Séances suspendues : douleur signalée.</strong>
            <span>Consultez un professionnel de santé. Quand la douleur a disparu, levez la pause dans votre profil.</span>
            <button className="btn secondary" onClick={() => onGo('profile')}>Ouvrir le profil</button>
          </div>
        </Notice>
      )}

      <div className="stats">
        <div className="stat"><div className="v">{stats.done}<span className="muted small">/{stats.planned}</span></div><div className="l">Séances</div></div>
        <div className="stat"><div className="v">{stats.minutes}</div><div className="l">Minutes</div></div>
        <div className="stat"><div className="v">{stats.sets}</div><div className="l">Séries</div></div>
      </div>

      <div className="section-title">Cette semaine</div>
      <button className="weekstrip" style={{ background: 'none', border: 0, padding: 0 }} onClick={() => onGo('plan')} aria-label="Ouvrir le planning">
        {days.map((d) => (
          <div key={d.date} className={`c ${d.entry ? 'has' : ''} ${d.date === today ? 'today' : ''}`}>
            <div className="tiny">{weekdayShort(weekdayIndex(d.date))}</div>
            <div className="num" style={{ fontWeight: 800 }}>{Number(d.date.slice(8))}</div>
            <div className={`dot ${d.done ? 'done' : d.session?.outcome.status === 'ok' ? '' : 'off'}`} />
          </div>
        ))}
      </button>

      {plan?.notices.filter((n) => n.code === 'PLAN.ENGINE_UNAVAILABLE').map((n) => <Notice key={JSON.stringify(n)}>{PLAN_NOTICES[n.code]?.(n.params) ?? n.code}</Notice>)}
      {!next && (
        <div className="card">
          <h3>Aucune séance disponible cette semaine</h3>
          <p className="small muted">Le planning explique pourquoi. Vous pouvez revoir vos disponibilités, votre matériel ou vos sports.</p>
          <button className="btn secondary" onClick={() => onGo('plan')}>Voir le planning</button>
        </div>
      )}
    </div>
  );
}
