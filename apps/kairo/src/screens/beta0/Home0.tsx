import { addDays, weekdayIndex } from '@hybridsport/app-core';
import { useStore } from '../../store.js';
import { formatDate, Notice, weekdayShort } from '../../ui.js';
import { isDone } from '../../present.js';
import { nextOf, SessionCard0, weekOf } from './common.js';

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
  const end = addDays(ps.definition.startWeek, ps.definition.horizonWeeks * 7);
  const text = today < ps.definition.startWeek ? `Votre programme commence le ${formatDate(ps.definition.startWeek)}.`
    : today >= end ? 'Votre programme est terminé. Vous pouvez en créer un nouveau depuis l’onglet Programme.'
      : state.safety.activePain ? 'Aucune séance n’est planifiée cette semaine tant que la pause douleur est active.'
        : 'Aucune séance n’a pu être planifiée cette semaine.';
  return <div className="card"><h3>Pas de séance cette semaine</h3><p className="small muted" style={{ margin: 0 }}>{text}</p></div>;
}

export function Home0({ onOpen, onGo }: { onOpen: (id: string) => void; onGo: (t: 'plan' | 'settings') => void }) {
  const { state, clock } = useStore();
  const today = clock().today;
  const week = weekOf(state, today);
  const items = week?.items ?? [];
  const next = nextOf(items, today);
  const planned = items.filter((x) => x.display !== 'not_planned');
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
          <button className="weekstrip" style={{ background: 'none', border: 0, padding: 0 }} onClick={() => onGo('plan')} aria-label="Ouvrir le planning">
            {Array.from({ length: 7 }, (_, i) => addDays(week.weekStart, i)).map((d) => {
              const s = items.filter((x) => x.date === d);
              return (
                <div key={d} className={`c ${s.length > 0 ? 'has' : ''} ${d === today ? 'today' : ''}`}>
                  <div className="tiny">{weekdayShort(weekdayIndex(d))}</div>
                  <div className="num" style={{ fontWeight: 800 }}>{Number(d.slice(8))}</div>
                  <div className={`dot ${s.some((x) => isDone(x.display)) ? 'done' : s.length > 0 ? '' : 'off'}`} />
                </div>
              );
            })}
          </button>
        </div>
      )}
      {!next && week && planned.length > 0 && <div className="card"><h3>Semaine bouclée</h3><p className="small muted" style={{ margin: 0 }}>Plus aucune séance prévue cette semaine. La suivante sera préparée lundi.</p></div>}
      {(!week || planned.length === 0) && <NoWeek today={today} />}
    </div>
  );
}
