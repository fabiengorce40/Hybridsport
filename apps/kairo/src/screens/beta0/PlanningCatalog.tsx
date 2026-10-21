/**
 * R5.2 — Planning en LISTE : catalogue des séances regroupées par sport (Musculation, Cross-training, HYROX, Course à
 * pied), triées par date dans chaque catégorie, sur la semaine affichée ou deux semaines. Présentation seule : les séances
 * sont celles des jours canoniques de `selectBeta0Week` (semaines déjà planifiées uniquement, rien n'est inventé) et les
 * courses libres celles de `selectFreeRuns` ; le clic ouvre la même fiche que la grille. Aucune donnée n'est modifiée.
 */
import { useState } from 'react';
import { addDays, selectFreeRuns } from '@hybridsport/app-core';
import type { AppState, FreeRunView } from '@hybridsport/app-core';
import { durationLabel } from '@hybridsport/app-core';
import { STATUS_LABELS } from '../../present.js';
import { formatDateShort, Notice } from '../../ui.js';
import { FREE_RUN_TYPE_LABELS } from '../../running/FreeRunForm.js';
import { SessionCard0 } from './common.js';
import type { DayItemView, SessionItemView } from './common.js';
import type { DisplayStatus } from '../../present.js';

export type CatalogPeriod = 'week' | 'two_weeks';
type Sport = 'strength' | 'crosstraining' | 'hyrox' | 'running';
const SPORTS: readonly Sport[] = ['strength', 'crosstraining', 'hyrox', 'running'];
const CATEGORY_LABELS: Readonly<Record<Sport, string>> = { strength: 'Musculation', crosstraining: 'Cross-training', hyrox: 'HYROX', running: 'Course à pied' };
// technical-constant: index du dernier jour d'une semaine (lundi = 0, dimanche = 6)
const LAST_DAY = 6;

/** Jour LOCAL (fuseau de l'appareil) d'un instant ISO, au format AAAA-MM-JJ (même lecture que l'Historique). */
function localDay(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const dayLabel = (date: string): string => { const t = formatDateShort(date); return t.charAt(0).toUpperCase() + t.slice(1); };

type Entry = { readonly kind: 'session'; readonly date: string; readonly v: SessionItemView } | { readonly kind: 'free'; readonly date: string; readonly r: FreeRunView };

export interface CatalogWeek { readonly weekStart: string; readonly days: readonly DayItemView[] }

export function PlanningCatalog({ state, weeks, period, onPeriod, nextMissing, onOpen }: {
  state: AppState; weeks: readonly CatalogWeek[]; period: CatalogPeriod; onPeriod: (p: CatalogPeriod) => void; nextMissing: string | null; onOpen: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<Sport>>(new Set());
  const from = weeks[0]?.weekStart ?? '';
  const to = addDays(weeks.at(-1)?.weekStart ?? from, LAST_DAY);
  const sessions: Entry[] = weeks.flatMap((w) => w.days.flatMap((d) => d.sessions.map((v): Entry => ({ kind: 'session', date: d.date, v }))));
  // Courses libres DÉJÀ enregistrées sur la période (date connue seulement) : hors programme, jamais une séance prévue.
  const free: Entry[] = selectFreeRuns(state).filter((r) => !r.dateUnknown).map((r): Entry => ({ kind: 'free', date: localDay(r.startedAt), r })).filter((e) => e.date >= from && e.date <= to);
  const p = state.profile;
  const enabled = (s: Sport): boolean => Boolean(p?.[s]?.enabled);
  const all = [...sessions, ...free];
  const groups = SPORTS.map((sport) => ({ sport, entries: all.filter((e) => (e.kind === 'free' ? sport === 'running' : e.v.sport === sport)).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)) }))
    .filter((g) => g.entries.length > 0 || enabled(g.sport));
  const toggle = (s: Sport) => setCollapsed((c) => { const n = new Set(c); if (n.has(s)) n.delete(s); else n.add(s); return n; });
  return (
    <div className="stack-3" data-planning-catalog data-period={period}>
      <div className="view-switch" role="group" aria-label="Période de la liste">
        <button type="button" aria-pressed={period === 'week'} onClick={() => onPeriod('week')}>Cette semaine</button>
        <button type="button" aria-pressed={period === 'two_weeks'} onClick={() => onPeriod('two_weeks')}>2 semaines</button>
      </div>
      <p className="small muted" data-catalog-range>Du {formatDateShort(from)} au {formatDateShort(to)} · séances regroupées par sport, dans l’ordre des dates.</p>
      {nextMissing && <Notice><span data-catalog-next-missing>La semaine du {formatDateShort(nextMissing)} n’est pas encore planifiée : aucune séance n’y est affichée.</span></Notice>}
      {groups.map(({ sport, entries }) => {
        const open = !collapsed.has(sport);
        const done = entries.filter((e) => e.kind === 'free' || e.v.display === 'completed_as_prescribed' || e.v.display === 'modified').length;
        const count = `${String(entries.length)} séance${entries.length > 1 ? 's' : ''}${done > 0 ? ` · ${String(done)} réalisée${done > 1 ? 's' : ''}` : ''}`;
        return (
          <section key={sport} className={`catalog-group sport-${sport}`} data-catalog-sport={sport}>
            <h2 className="catalog-title">
              <button type="button" className="catalog-toggle" aria-expanded={open} aria-controls={`catalog-${sport}`} aria-label={`Catégorie ${CATEGORY_LABELS[sport]} : ${count}`} onClick={() => toggle(sport)}>
                <span className="catalog-name">{CATEGORY_LABELS[sport]}</span>
                <span className="catalog-count small muted" data-catalog-count>{count}</span>
                <span className="catalog-chevron" aria-hidden="true">{open ? '▾' : '▸'}</span>
              </button>
            </h2>
            {open && (
              <div id={`catalog-${sport}`} className="stack" data-catalog-items>
                {entries.length === 0 && <div className="catalog-empty small muted" data-catalog-empty>Aucune séance prévue sur la période.</div>}
                {entries.map((e) => (
                  <div key={e.kind === 'session' ? e.v.requestId : e.r.sessionId} data-catalog-entry data-date={e.date}>
                    {e.kind === 'session' ? <SessionCard0 v={e.v} onOpen={onOpen} dateLabel={dayLabel(e.date)} /> : <FreeRunItem r={e.r} date={e.date} />}
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

/** Course libre enregistrée : réalisée hors programme (aucune fiche de séance prévue à ouvrir). */
function FreeRunItem({ r, date }: { r: FreeRunView; date: string }) {
  const status: DisplayStatus = 'completed_as_prescribed';
  return (
    <div className="card" data-free-run={r.sessionId} data-status="free_run" aria-label={`Course libre, ${dayLabel(date)}, ${durationLabel(r.durationS)}, réalisée hors programme`}>
      <div className="row between"><span className="small catalog-date" data-catalog-date>{dayLabel(date)}</span><span className="badge neutral">Hors programme</span></div>
      <h3>Course libre{r.type ? ` · ${FREE_RUN_TYPE_LABELS[r.type]}` : ''}</h3>
      <div className="small muted num">{durationLabel(r.durationS)} · {STATUS_LABELS[status]}</div>
    </div>
  );
}
