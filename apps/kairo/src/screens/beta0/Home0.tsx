import { REKKA_V2, RekkaBrand, SportLinks } from '../../rekka/visual.js';
import { confirmEquipment, equipmentLabel, equipmentNeedsConfirmation, EQUIPMENT_PRESETS, programmeStatusAt, weekdayIndex } from '@hybridsport/app-core';
import { useStore } from '../../store.js';
import { formatDate, Notice, weekdayShort } from '../../ui.js';
import { isDone, sessionName, sportName, STATUS_LABELS } from '../../present.js';
import { nextOf, placedOf, RunningTestFallbackNotice, SessionCard0, weekOf, WeekPlanningNotice } from './common.js';
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

/**
 * P1 — profil antérieur dont le matériel n'a jamais été confirmé (ancienne présélection) : demande de confirmation,
 * rien n'est écrasé ni replanifié ; « Modifier » ouvre l'assistant de modification du programme.
 */
export function EquipmentConfirm({ onEdit }: { onEdit: () => void }) {
  const store = useStore();
  if (!equipmentNeedsConfirmation(store.state)) return null;
  const e = store.state.profile?.equipment;
  const name = EQUIPMENT_PRESETS.find((x) => x.id === e?.presetId)?.name ?? 'Matériel personnalisé';
  return (
    <Notice tone="warn">
      <div className="stack" data-equipment-confirm>
        <strong>Vérifiez votre matériel</strong>
        <span>Vos séances supposent : {name}. KAIRO ne doit jamais supposer qu’une machine est disponible.</span>
        <details className="k-details"><summary>Matériel déclaré ({String(e?.items.length ?? 0)})</summary><p className="small" style={{ margin: 0 }}>{(e?.items ?? []).map((id) => equipmentLabel(id)).sort((a, b) => a.localeCompare(b, 'fr')).join(' · ')}</p></details>
        <div className="row wrap">
          <button className="btn primary" onClick={() => store.apply((s, c) => confirmEquipment(s, c))}>C’est bien mon matériel</button>
          <button className="btn secondary" onClick={onEdit}>Modifier mon matériel</button>
        </div>
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

export function Home0({ onOpen, onGo, onEditProgramme }: { onOpen: (id: string) => void; onGo: (t: 'plan' | 'settings') => void; onEditProgramme?: () => void }) {
  const { state, clock } = useStore();
  const today = clock().today;
  const week = weekOf(state, today);
  const planned = placedOf(week?.days ?? []);
  const next = nextOf(planned, today);
  const done = planned.filter((x) => isDone(x.display)).length;
  const name = state.profile?.displayName;
  // Pause douleur : aucune nouvelle séance (politique app-core) ; la reprise d'une séance commencée reste proposée.
  const paused = state.safety.activePain !== null;
  const extra = (week?.items ?? []).filter((x) => x.placement === 'composed_unplaced' && (x.display === 'not_planned' || x.display === 'in_progress'));
  return (
    <div className="screen">
      <div className="hero">
        {REKKA_V2 ? <RekkaBrand /> : <div className="hero-brand">KAI<span>RO</span></div>}
        <p className="small">{formatDate(today)}</p>
        <h1>{name ? `${name}, ` : ''}{next ? (next.date === today ? 'c’est le moment.' : 'prochaine séance.') : 'rien de prévu.'}</h1>
        {next && <SessionCard0 v={next} onOpen={onOpen} highlight />}
        {next && (
          <button className="btn primary block" onClick={() => onOpen(next.requestId)}>
            {next.display === 'in_progress' ? 'Reprendre la séance' : next.date === today && !paused ? 'Commencer la séance' : `Voir la séance${next.date === today ? '' : ` de ${formatDate(next.date ?? today).split(' ')[0] ?? ''}`}`}
          </button>
        )}
      </div>

      {REKKA_V2 && <SportLinks onPlanning={() => onGo('plan')} />}
      {/* FIELD TEST — séances composées mais non placées : visibles sans remplacer la séance prévue. */}
      {extra.length > 0 && (
        <div className="card" aria-label="Séances supplémentaires disponibles" data-extra={extra.length}>
          <strong>{extra.length === 1 ? '1 séance supplémentaire disponible' : `${String(extra.length)} séances supplémentaires disponibles`}</strong>
          <span className="tiny muted">Non planifiée cette semaine faute de créneau compatible : vous pouvez la faire quand vous voulez.</span>
          {extra.map((x) => (
            <button key={x.requestId} className="btn secondary" onClick={() => onOpen(x.requestId)}>
              {x.display === 'in_progress' ? 'Reprendre' : 'Voir'} : {sportName(x.sport)} · {sessionName(x.sport, x.archetypeId, x.dataError)}
            </button>
          ))}
        </div>
      )}

      <EquipmentConfirm onEdit={() => onEditProgramme?.()} />
      {state.safety.activePain && <PainPause onGo={() => onGo('settings')} />}
      {week && <WeekPlanningNotice planning={week.planning} />}
      {week && <RunningTestFallbackNotice fallback={week.runningTestFallback} />}

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
