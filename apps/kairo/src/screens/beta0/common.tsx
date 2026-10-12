/** Lectures et composants communs Beta 0 (présentation uniquement : projection de `selectBeta0Week`). */
import { approxMinutes, exerciseLabel, selectBeta0Week } from '@hybridsport/app-core';
import type { AppState, Beta0WeekView, SessionView } from '@hybridsport/app-core';
import { manualStartAssessment } from '@hybridsport/app-core';
import { useStartFlow } from '../../precheck/PreSessionCheck.js';
import { arbitrationText, sessionTitle, ctFormatName, isTest, manualStartText, notPlannedText, qualityShortText, roleName, sportName, STATUS_ICONS, STATUS_LABELS, unplacedText, weekPlanningText } from '../../present.js';
import { useStore } from '../../store.js';
import { formatDate, Notice } from '../../ui.js';
import { blockCardText, fullSessionCardText, isBlock, isFullC4 } from '../../field/BlockScope.js';
import type { DisplayStatus } from '../../present.js';

export interface SessionItemView extends SessionView { readonly display: DisplayStatus }

export interface DayItemView { readonly date: string; readonly sessions: readonly SessionItemView[] }

/**
 * Semaine du programme vue par l'interface : projection de `selectBeta0Week` (source canonique), avec le seul statut
 * d'interface « en cours » (séance commencée). Les jours (`days`) viennent du selector : une séance n'apparaît sur un
 * jour que si elle y est réellement placée.
 */
// technical-constant: nombre d'exercices principaux affichés sur une carte (lisibilité mobile)
const MAIN_SHOWN = 3;

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

/**
 * Ligne descriptive d'une carte : rôle, format, durée. FIELD TEST P0 — bloc d'entraînement Cross-training / HYROX :
 * « Bloc principal » et durée DU BLOC (jamais présentée comme la durée d'une séance complète, jamais la cible du créneau).
 */
function metaOf(v: SessionItemView): string {
  const block = isBlock(v.composition);
  // Bloc Cross-training : durée PRESCRITE du format (exacte), jamais l'estimation du CORE ni la cible du créneau.
  const blockS = block && v.sport === 'crosstraining' ? v.composition?.blockDurationS ?? null : null;
  // C4 — séance complète : durée PLANIFIÉE de l'ensemble des blocs (valeurs gouvernées), jamais la cible du créneau.
  // C4.1 — estimation du CORE (consignes et transitions comprises) si disponible, sinon durée planifiée des blocs.
  const fullS = v.sport === 'crosstraining' && isFullC4(v.composition) ? v.composition?.c4?.estimatedDurationS ?? v.composition?.c4?.plannedDurationS ?? null : null;
  const dur = fullS !== null ? `≈ ${approxMinutes(fullS)}` : v.hrTimeCapS !== null ? `time cap ${approxMinutes(v.hrTimeCapS)}`
    : blockS !== null ? approxMinutes(blockS)
    : v.estimatedDurationS !== null ? `≈ ${approxMinutes(v.estimatedDurationS)}`
      : !block && v.targetDurationS !== null ? `≈ ${approxMinutes(v.targetDurationS)}` : null;
  const fmt = ctFormatName(v.ctFormat);
  return [roleName(v.role), fullS !== null ? ['Séance complète', fmt].filter(Boolean).join(' · ') : block ? [v.sport === 'hyrox' ? 'Bloc HYROX' : 'Bloc principal', fmt].filter(Boolean).join(' ') : fmt, dur].filter(Boolean).join(' · ');
}

export function SessionCard0({ v, onOpen, highlight = false }: { v: SessionItemView; onOpen: (id: string) => void; highlight?: boolean }) {
  const name = sessionTitle(v);
  if (v.display === 'not_planned' && v.placement === 'composed_unplaced') return <UnplacedCard v={v} onOpen={onOpen} />;
  if (v.display === 'not_planned') {
    return (
      <div className="card" aria-label={`${sportName(v.sport)} non planifiée`}>
        <div className="row between"><span className="small muted">{sportName(v.sport)}</span><StatusPill status="not_planned" /></div>
        <div className="small">{notPlannedText(v)}</div>
      </div>
    );
  }
  return (
    <button className={`card button-card ${highlight ? 'accent' : ''}`} data-request={v.requestId} onClick={() => onOpen(v.requestId)} aria-label={`${sportName(v.sport)} : ${name}, ${STATUS_LABELS[v.display]}`}>
      <div className="row between">
        <span className="small muted">{sportName(v.sport)}</span>
        <span className="row">{isTest(v.archetypeId) && <span className="badge test">TEST</span>}<StatusPill status={v.display} /></span>
      </div>
      <h3>{name}</h3>
      <div className="small muted num">
        {[metaOf(v), v.pain ? 'douleur signalée' : null].filter(Boolean).join(' · ')}
      </div>
      {isBlock(v.composition) && <div className="tiny muted" data-block-scope="TRAINING_BLOCK">{blockCardText}</div>}
      {isFullC4(v.composition) && v.composition && <div className="tiny muted" data-block-scope="FULL_SESSION">{fullSessionCardText(v.composition)}</div>}
      {/* Strength : exercices principaux réellement prescrits (la variété A/B n'est pas masquée par le seul titre). */}
      {v.mainExercises.length > 0 && <div className="tiny muted" data-main-exercises>{v.mainExercises.slice(0, MAIN_SHOWN).map((x) => exerciseLabel(x)).join(' · ')}{v.mainExercises.length > MAIN_SHOWN ? ' …' : ''}</div>}
      {v.repeatFlagged && <div className="tiny" data-repeat-flagged>Identique à une séance récente : le moteur ne dispose pas d’autre option avec les règles actuelles.</div>}
      {v.arbitration && <div className="tiny muted" data-m3={v.arbitration.kind}>{arbitrationText(v, formatDate)}</div>}
      {qualityShortText(v.quality?.verdict) && <div className="tiny muted" data-quality={v.quality?.verdict}>{qualityShortText(v.quality?.verdict)}</div>}
    </button>
  );
}

/**
 * M3.1 — séance COMPOSÉE MAIS NON PLACÉE : prescription du moteur (nom, rôle, durée), cause lisible, « Voir la séance »
 * (workout normal en aperçu, prescription persistée) et « Faire maintenant » (exécution à l'heure réelle, même runtime).
 */
function UnplacedCard({ v, onOpen }: { v: SessionItemView; onOpen: (id: string) => void }) {
  const store = useStore();
  // P0 — « Faire maintenant » : contrôle pré-séance, puis ouverture de la séance démarrée.
  const flow = useStartFlow(onOpen);
  const name = sessionTitle(v);
  const meta = metaOf(v);
  // Séance déjà commencée (reprise) : jamais réévaluée ; sinon contrôle métier au jour réel (app-core, aucune règle ici).
  const startable = v.display === 'in_progress' ? { allowed: true, cause: null, conflicts: [] } : manualStartAssessment(store.state, store.clock(), v.requestId);
  return (
    <div className="card" aria-label={`${sportName(v.sport)} : ${name}, non planifiée`} data-unplaced={v.requestId}>
      <div className="row between"><span className="small muted">{sportName(v.sport)}</span><StatusPill status="not_planned" /></div>
      <h3>{name}</h3>
      {meta && <div className="small muted num">{meta}</div>}
      {isBlock(v.composition) && <div className="tiny muted" data-block-scope="TRAINING_BLOCK">{blockCardText}</div>}
      {isFullC4(v.composition) && v.composition && <div className="tiny muted" data-block-scope="FULL_SESSION">{fullSessionCardText(v.composition)}</div>}
      <div className="small">{unplacedText(v)}</div>
      {qualityShortText(v.quality?.verdict) && <div className="tiny muted" data-quality={v.quality?.verdict}>{qualityShortText(v.quality?.verdict)}</div>}
      <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        <button className="btn" onClick={() => onOpen(v.requestId)}>Voir la séance</button>
        {/* Q1 / P0 — « Faire maintenant » seulement si le contrôle métier du jour réel l'autorise (qualité, douleur, semaine, interférence). */}
        {startable.allowed && <button className="btn primary" onClick={() => flow.start(v.requestId)}>Faire maintenant</button>}
      </div>
      {!startable.allowed && manualStartText(startable) && <div className="small" role="status" data-manual-refused={startable.cause ?? undefined}>{manualStartText(startable)}</div>}
      {flow.sheet}
    </div>
  );
}
