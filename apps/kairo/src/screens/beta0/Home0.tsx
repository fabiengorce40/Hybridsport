import { programmeStatusAt, weekdayIndex } from '@hybridsport/app-core';
import { useStore } from '../../store.js';
import { formatDate, Notice, weekdayShort } from '../../ui.js';
import { isDone, sportName, STATUS_LABELS } from '../../present.js';
import { nextOf, placedOf, SessionCard0, weekOf } from './common.js';
import type { DayItemView } from './common.js';

export function PainPause({ onGo }: { onGo: () => void }) {
  return (
    <Notice tone="danger">
      <div className="stack">
        <strong>La planification automatique est suspendue car une douleur a été signalée.</strong>
        <span>Consultez un professionnel de santé si elle persiste. Quand elle a disparu, levez la pause dans les réglages.</span>
        <button className="btn secondary" onClick={onGo}>Ouvrir les réglages</button>
      </div>
    </Notice>
  );
}

/** Explication quand la semaine courante n'a pas de séance planifiée (programme pas commencé, terminé, pause). */
export function NoWeek({ today }: { today: string }) {
  const { state } = useStore();
  const ps = state.programmeState;
  if (!ps) return null;
  const situation = programmeStatusAt(state, today);
  const ended = situation === 'ended';
  const text = situation === 'not_started' ? `Votre programme commence le ${formatDate(ps.definition.startWeek)}.`
    : ended ? 'Votre objectif est atteint : le programme est terminé. Vous pouvez en créer un nouveau depuis l’onglet Programme.'
      : state.safety.activePain ? 'Aucune séance n’est planifiée cette semaine tant que la pause douleur est active.'
        : 'Aucune séance n’a pu être planifiée cette semaine.';
  return <div className="card"><h3>Pas de séance cette semaine</h3><p className="small muted" style={{ margin: 0 }}>{text}</p></div>;
}

/** Résumé textuel du mini-calendrier (les états ne sont jamais portés par la seule couleur). */
const stripSummary = (days: readonly DayItemView[]): string => {
  const marked = days.filter((d) => d.sessions.length > 0).map((d) => `${formatDate(d.date)} : ${d.sessions.map((x) => `${sportName(x.sport)}, ${STATUS_LABELS[x.display]}`).join(' ; ')}`);
  return marked.length > 0 ? marked.join('. ') : 'Aucune séance cette semaine.';
};

export function Home0({ onOpen, onGo }: { onOpen: (id: string) => void; onGo: (t: 'plan' | 'settings') => void }) {
  const { state, clock } = useStore();
  const today = clock().today;
  const week = weekOf(state, today);
  const planned = placedOf(week?.days ?? []);
  const next = nextOf(planned, today);
  const done = planned.filter((x) => isDone(x.display)).length;
  const name = state.profile?.displayName;
  return (
    <div className="screen">
      <div className="hero">
        <div className="hero-brand">KAI<span>RO</span></div>
        <p className="small">{formatDate(today)}</p>
        <h1>{name ? `${name}, ` : ''}{next ? (next.date === today ? 'c’est le moment.' : 'prochaine séance.') : 'rien de prévu.'}</h1>
        {next && <SessionCard0 v={next} onOpen={onOpen} highlight />}
        {next && (
          <button className="btn primary block" onClick={() => onOpen(next.requestId)}>
            {next.display === 'in_progress' ? 'Reprendre la séance' : next.date === today ? 'Commencer la séance' : `Voir la séance de ${formatDate(next.date ?? today).split(' ')[0] ?? ''}`}
          </button>
        )}
      </div>

      {state.safety.activePain && <PainPause onGo={() => onGo('settings')} />}

      {week && planned.length > 0 && (
        <div className="card" aria-label="Progression de la semaine">
          <div className="row between"><strong>Cette semaine</strong><span className="num">{done} / {planned.length} séances</span></div>
          <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={planned.length} aria-valuenow={done} aria-label="Séances terminées"><div style={{ width: `${String(Math.round((done / planned.length) * 100))}%` }} /></div>
          <button className="weekstrip" style={{ background: 'none', border: 0, padding: 0 }} onClick={() => onGo('plan')} aria-label={`Ouvrir le planning. ${stripSummary(week.days)}`}>
            {week.days.map(({ date: d, sessions: s }) => (
              <div key={d} data-date={d} data-sessions={s.length} className={`c ${s.length > 0 ? 'has' : ''} ${d === today ? 'today' : ''}`} aria-hidden="true">
                <div className="tiny">{weekdayShort(weekdayIndex(d))}</div>
                <div className="num" style={{ fontWeight: 800 }}>{Number(d.slice(8))}</div>
                {s.length > 0
                  ? <div className="dots">{s.map((x) => <span key={x.requestId} className={`dot st-${x.display}`} title={STATUS_LABELS[x.display]} />)}</div>
                  : <div className="dot off" />}
              </div>
            ))}
          </button>
        </div>
      )}
      {!next && week && planned.length > 0 && <div className="card"><h3>Semaine bouclée</h3><p className="small muted" style={{ margin: 0 }}>Plus aucune séance prévue cette semaine. La suivante sera préparée lundi.</p></div>}
      {(!week || planned.length === 0) && <NoWeek today={today} />}
    </div>
  );
}
