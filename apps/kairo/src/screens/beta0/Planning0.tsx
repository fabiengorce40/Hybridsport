import { useState } from 'react';
import { addDays, beta0Integrity, weekdayIndex, weekLoadWarnings } from '@hybridsport/app-core';
import type { AppState, WeekLoadWarning } from '@hybridsport/app-core';
import { sessionName, STRUCTURE_LABELS } from '../../present.js';
import { useStore } from '../../store.js';
import { formatDate, formatDateShort, Notice, weekdayShort } from '../../ui.js';
import { ExperimentalBadge, placedOf, RunningTestFallbackNotice, SessionCard0, weekOf, WeekPlanningNotice } from './common.js';
import type { SessionItemView } from './common.js';
import { NoWeek, PainPause } from './Home0.js';
import { WeekAgenda } from './WeekAgenda.js';

/** R5.1 — mode d'affichage du Planning, mémorisé par lecteur (préférence d'interface, jamais une donnée sportive). */
export type PlanningView = 'list' | 'grid';
export const PLANNING_VIEW_KEY = 'kairo.planning.view';
const readView = (): PlanningView => { try { return localStorage.getItem(PLANNING_VIEW_KEY) === 'grid' ? 'grid' : 'list'; } catch { return 'list'; } };
const writeView = (v: PlanningView): void => { try { localStorage.setItem(PLANNING_VIEW_KEY, v); } catch { /* préférence non conservée */ } };

/** Index des semaines du programme réellement planifiées (persistées), dans l'ordre. */
const existingWeeks = (state: AppState): number[] => (state.programmeState?.weeks ?? []).filter((w) => state.planner.weeks[w.plannerRef] !== undefined).map((w) => w.weekIndex).sort((a, b) => a - b);

export function Planning0({ onOpen, onGo }: { onOpen: (id: string) => void; onGo: (t: 'settings') => void }) {
  const { state, clock } = useStore();
  const today = clock().today;
  const [view, setView] = useState<PlanningView>(readView);
  const [shown, setShown] = useState<number | null>(null);
  const current = weekOf(state, today);
  const weeks = existingWeeks(state);
  const week = shown === null || shown === current?.weekIndex ? current : weekOf(state, today, shown);
  const pos = week ? weeks.indexOf(week.weekIndex) : -1;
  const choose = (v: PlanningView) => { setView(v); writeView(v); };
  const avail = state.profile?.availability ?? [];
  // Hors des jours : non planifiées (bloquées ou composées), y compris une non placée commencée ou réalisée hors planning.
  const onDays = new Set(placedOf(week?.days ?? []).map((x) => x.requestId));
  const unplanned = week?.items.filter((x) => !onDays.has(x.requestId)) ?? [];
  return (
    <div className="screen">
      <div className="row between"><h1 className="screen-title">Planning</h1>{week?.experimental && <ExperimentalBadge />}</div>
      {state.safety.activePain && <PainPause onGo={() => onGo('settings')} />}
      <IntegrityNotice issues={beta0Integrity(state)} />
      {current && (
        <div className="stack-3" data-planning-controls>
          <div className="view-switch" role="group" aria-label="Affichage du planning">
            <button type="button" aria-pressed={view === 'list'} onClick={() => choose('list')}>Liste</button>
            <button type="button" aria-pressed={view === 'grid'} onClick={() => choose('grid')}>Grille</button>
          </div>
          {week && (
            <nav className="week-nav" aria-label="Semaines du programme">
              <button type="button" className="nav" aria-label="Semaine précédente" disabled={pos <= 0} onClick={() => setShown(weeks[pos - 1] ?? null)}>‹</button>
              <div className="label" aria-live="polite" data-week-shown={week.weekStart}>Semaine {week.weekIndex + 1}{week === current ? ' · en cours' : ''}<span className="tiny">du {formatDateShort(week.weekStart)} au {formatDateShort(addDays(week.weekStart, LAST_DAY))}</span></div>
              <button type="button" className="nav" aria-label="Semaine suivante" disabled={pos < 0 || pos >= weeks.length - 1} onClick={() => setShown(weeks[pos + 1] ?? null)}>›</button>
            </nav>
          )}
          {week !== current && <button type="button" className="btn ghost" onClick={() => setShown(null)}>Revenir à la semaine en cours</button>}
        </div>
      )}
      {!week || week.items.length === 0 ? <NoWeek today={today} /> : (
        <>
          <WeekPlanningNotice planning={week.planning} />
          <RunningTestFallbackNotice fallback={week.runningTestFallback} />
          <WeekLoadNotice warnings={weekLoadWarnings(state, week.weekStart)} items={week.items} />
          {view === 'grid' ? <WeekAgenda days={week.days} today={today} availability={avail} onOpen={onOpen} /> : (<>
            {/* Vue LISTE : inchangée. */}
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
          </>)}
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

// technical-constant: index du dernier jour d'une semaine (lundi = 0, dimanche = 6)
const LAST_DAY = 6;

const dayLabel = (d: string): string => `${weekdayShort(weekdayIndex(d)).toLowerCase()} ${String(Number(d.slice(8)))}`;

/**
 * RC4.4 (lot B) — avertissements de charge de la semaine, calculés par app-core (aucune séance retirée). Une semaine sans
 * repos ou avec des Full Body à J/J+1 n'est jamais présentée comme optimale.
 */
export function WeekLoadNotice({ warnings, items }: { warnings: readonly WeekLoadWarning[]; items: readonly SessionItemView[] }) {
  if (warnings.length === 0) return null;
  const nameOf = (id: string): string => { const x = items.find((i) => i.requestId === id); return x ? `${sessionName(x.sport, x.archetypeId, x.dataError)}${x.date ? ` (${dayLabel(x.date)})` : ''}` : 'séance de la semaine précédente'; };
  const warn = warnings.some((w) => w.kind !== 'consecutive');
  const lines = warnings.map((w) => {
    switch (w.kind) {
      case 'seven_days': return { key: w.kind, text: `${String(w.days)} jours d’entraînement sur 7${w.freeRuns > 0 ? ' (courses libres comprises)' : ''} : aucune journée de repos cette semaine. Cette organisation n’est pas optimale ; vous pouvez réduire le nombre de séances dans « Modifier ».` };
      case 'consecutive': return { key: w.kind, text: `Plus longue suite : ${String(w.days)} jours d’entraînement consécutifs (du ${dayLabel(w.from)} au ${dayLabel(w.to)}${w.acrossWeeks ? ', semaine précédente comprise' : ''}).` };
      case 'full_body_consecutive': return { key: w.kind, text: `Full Body à J et J+1 : ${w.pairs.map((p) => `${dayLabel(p.first)} et ${dayLabel(p.second)}`).join(' ; ')}${w.noBetterPlacement ? ' — aucun autre placement ne les sépare sans dégrader le reste de la semaine.' : '.'}` };
      case 'multisport_conflict': return { key: w.kind, text: `Interférence non résolue : ${w.items.map((c) => `${nameOf(c.requestId)} et ${nameOf(c.withRequestId)} sollicitent ${STRUCTURE_LABELS[c.structure] ?? c.structure}`).join(' ; ')}.` };
    }
  });
  return (
    <Notice tone={warn ? 'warn' : 'info'}>
      <div className="stack" data-week-warnings>
        <strong>{warn ? 'Charge de la semaine à surveiller' : 'Charge de la semaine'}</strong>
        <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>{lines.map((l) => <li key={l.key} data-week-warning={l.key}>{l.text}</li>)}</ul>
      </div>
    </Notice>
  );
}

/** Incohérence des données persistées : affichée telle quelle (jamais masquée ni corrigée dans l'interface). */
function IntegrityNotice({ issues }: { issues: ReturnType<typeof beta0Integrity> }) {
  if (issues.length === 0) return null;
  return (
    <Notice tone="danger">
      <span>Incohérence de données détectée dans le planning. Exportez vos données (Réglages) et transmettez le fichier pour diagnostic.</span>
      <details className="tiny"><summary>Détail technique</summary>{issues.map((i) => JSON.stringify(i)).join(' ; ')}</details>
    </Notice>
  );
}
