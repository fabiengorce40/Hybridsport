/** Lectures et composants communs Beta 0 (présentation uniquement : projection de `selectBeta0Week`). */
import { approxMinutes, selectBeta0Week } from '@hybridsport/app-core';
import type { AppState, Beta0WeekView, SessionView } from '@hybridsport/app-core';
import { startProgrammeSession } from '@hybridsport/app-core';
import { arbitrationText, ctFormatName, isTest, notPlannedText, roleName, sessionName, sportName, STATUS_ICONS, STATUS_LABELS, unplacedText, weekPlanningText } from '../../present.js';
import { useStore } from '../../store.js';
import { formatDate, Notice } from '../../ui.js';
import type { DisplayStatus } from '../../present.js';

export interface SessionItemView extends SessionView { readonly display: DisplayStatus }

export interface DayItemView { readonly date: string; readonly sessions: readonly SessionItemView[] }

/**
 * Semaine du programme vue par l'interface : projection de `selectBeta0Week` (source canonique), avec le seul statut
 * d'interface « en cours » (séance commencée). Les jours (`days`) viennent du selector : une séance n'apparaît sur un
 * jour que si elle y est réellement placée.
 */
export function weekOf(state: AppState, today: string): (Omit<Beta0WeekView, 'days'> & { readonly items: readonly SessionItemView[]; readonly days: readonly DayItemView[] }) | null {
  const v = selectBeta0Week(state, today);
  if (!v) return null;
  // « En cours » : séance commencée non terminée (planifiée, ou non placée réalisée maintenant — M3.1).
  const started = (x: SessionView) => (x.status === 'planned' || (x.status === 'not_planned' && x.placement === 'composed_unplaced')) && state.programmeLogs[x.requestId] !== undefined;
  const display = (x: SessionView): SessionItemView => ({ ...x, display: started(x) ? 'in_progress' : x.status });
  return { ...v, items: v.sessions.map(display), days: v.days.map((d) => ({ date: d.date, sessions: d.sessions.map(display) })) };
}

/** Séances réellement placées dans la semaine (tous états), d'après les jours canoniques. */
export const placedOf = (days: readonly DayItemView[]): readonly SessionItemView[] => days.flatMap((d) => d.sessions);

/** Prochaine séance : en cours, sinon aujourd'hui ou la suivante non réalisée. */
export function nextOf(items: readonly SessionItemView[], today: string): SessionItemView | undefined {
  return items.find((x) => x.display === 'in_progress') ?? items.find((x) => x.display === 'planned' && (x.date ?? '') >= today);
}

export function StatusPill({ status }: { status: DisplayStatus }) {
  return <span className={`badge st-${status}`}><span aria-hidden="true">{STATUS_ICONS[status]} </span>{STATUS_LABELS[status]}</span>;
}

/** Semaine planifiée par une version précédente (conservée) ou replanifiée par la version courante. */
export function WeekPlanningNotice({ planning }: { planning: Beta0WeekView['planning'] }) {
  const text = weekPlanningText(planning);
  return text ? <Notice tone="sim"><span role="status">{text}</span></Notice> : null;
}

export function ExperimentalBadge() {
  return <span className="badge sim" title="Certaines règles de planification sont encore en cours de validation.">Beta expérimentale</span>;
}

export function SessionCard0({ v, onOpen, highlight = false }: { v: SessionItemView; onOpen: (id: string) => void; highlight?: boolean }) {
  const name = sessionName(v.sport, v.archetypeId, v.dataError);
  const role = roleName(v.role);
  if (v.display === 'not_planned' && v.placement === 'composed_unplaced') return <UnplacedCard v={v} onOpen={onOpen} />;
  if (v.display === 'not_planned') {
    return (
      <div className="card" aria-label={`${sportName(v.sport)} non planifiée`}>
        <div className="row between"><span className="small muted">{sportName(v.sport)}</span><StatusPill status="not_planned" /></div>
        <div className="small">{notPlannedText(v)}</div>
        <details className="tiny"><summary>Détail technique</summary>{v.notPlanned?.category}{v.notPlanned?.reason ? ` · ${v.notPlanned.reason.code}` : ''}</details>
      </div>
    );
  }
  return (
    <button className={`card button-card ${highlight ? 'accent' : ''}`} onClick={() => onOpen(v.requestId)} aria-label={`${sportName(v.sport)} : ${name}, ${STATUS_LABELS[v.display]}`}>
      <div className="row between">
        <span className="small muted">{sportName(v.sport)}</span>
        <span className="row">{isTest(v.archetypeId) && <span className="badge test">TEST</span>}<StatusPill status={v.display} /></span>
      </div>
      <h3>{name}</h3>
      <div className="small muted num">
        {[role, ctFormatName(v.ctFormat), v.hrTimeCapS !== null ? `time cap ${approxMinutes(v.hrTimeCapS)}` : (v.estimatedDurationS ?? v.targetDurationS) !== null ? `≈ ${approxMinutes(v.estimatedDurationS ?? v.targetDurationS ?? 0)}` : null, v.pain ? 'douleur signalée' : null].filter(Boolean).join(' · ')}
      </div>
      {v.arbitration && <div className="tiny muted" data-m3={v.arbitration.kind}>{arbitrationText(v, formatDate)}</div>}
    </button>
  );
}

/**
 * M3.1 — séance COMPOSÉE MAIS NON PLACÉE : prescription du moteur (nom, rôle, durée), cause lisible, « Voir la séance »
 * (workout normal en aperçu, prescription persistée) et « Faire maintenant » (exécution à l'heure réelle, même runtime).
 */
function UnplacedCard({ v, onOpen }: { v: SessionItemView; onOpen: (id: string) => void }) {
  const store = useStore();
  const name = sessionName(v.sport, v.archetypeId, v.dataError);
  const meta = [roleName(v.role), ctFormatName(v.ctFormat), v.hrTimeCapS !== null ? `time cap ${approxMinutes(v.hrTimeCapS)}` : (v.estimatedDurationS ?? v.targetDurationS) !== null ? `≈ ${approxMinutes(v.estimatedDurationS ?? v.targetDurationS ?? 0)}` : null].filter(Boolean).join(' · ');
  return (
    <div className="card" aria-label={`${sportName(v.sport)} : ${name}, non planifiée`} data-unplaced={v.requestId}>
      <div className="row between"><span className="small muted">{sportName(v.sport)}</span><StatusPill status="not_planned" /></div>
      <h3>{name}</h3>
      {meta && <div className="small muted num">{meta}</div>}
      <div className="small">{unplacedText(v)}</div>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        <button className="btn" onClick={() => onOpen(v.requestId)}>Voir la séance</button>
        <button className="btn primary" onClick={() => { store.apply((s, c) => startProgrammeSession(s, c, v.requestId)); onOpen(v.requestId); }}>Faire maintenant</button>
      </div>
    </div>
  );
}
