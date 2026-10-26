/**
 * REKKA V2 — Planning du prototype (lot V2-2B) : bascule Liste / Grille, semaine et sélecteur de jours, une carte
 * compacte par jour (pictogramme et couleur de discipline, durée, état ÉCRIT dans un badge ; plus de légende séparée).
 * Grille : une ligne par jour. Toutes les séances restent consultables. Données de démonstration.
 */
import { useState } from 'react';
import { SportIcon, SPORT_NAMES } from '../../src/design/SportIcon.js';
import { Scene } from '../art/Scene.js';
import { STATE_LABELS, STATE_MARKS, week } from '../demo-data.js';
import type { DemoSession } from '../demo-data.js';

export function StateBadge({ s }: { s: DemoSession['state'] }) {
  return <span className={`p-state ${s}`} data-state={s}><span aria-hidden="true">{STATE_MARKS[s]}</span> {STATE_LABELS[s]}</span>;
}

function RestIcon() {
  return <span className="r-sport-icon p-rest-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 15.5A8 8 0 1 1 8.5 4a6.5 6.5 0 0 0 11.5 11.5z" /></svg></span>;
}

export function Planning({ onOpen }: { onOpen: () => void }) {
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [day, setDay] = useState<string | null>(null);
  const today = week.find((d) => d.sessions.some((s) => s.state === 'today'))?.day;
  const shown = day ? week.filter((d) => d.day === day) : week;
  return (
    <main className="p-page" aria-label="Planning">
      <header className="p-page-head">
        <Scene variant="mountain" label="Paysage de montagne (illustration provisoire)" />
        <h1 className="p-page-title">Planning</h1>
      </header>
      <div className="p-page-body">
        <div className="p-segment" role="group" aria-label="Affichage du planning">
          <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>Liste</button>
          <button type="button" aria-pressed={view === 'grid'} onClick={() => setView('grid')}>Grille</button>
        </div>
        <div className="p-weeknav">
          <button type="button" className="p-round" aria-label="Semaine précédente (simulation)">‹</button>
          <b>Semaine du 26 octobre</b>
          <button type="button" className="p-round" aria-label="Semaine suivante (simulation)">›</button>
        </div>
        <div className="p-days" role="group" aria-label="Filtrer par jour">
          {week.map((d) => (
            <button key={d.day} type="button" className={`p-day ${d.day === today ? 'today' : ''}`} aria-pressed={day === d.day} onClick={() => setDay(day === d.day ? null : d.day)} aria-label={`${d.day} ${d.date}${d.day === today ? ', aujourd’hui' : ''}`}>
              <small>{d.day.slice(0, 1)}</small><b>{d.date}</b>
            </button>
          ))}
        </div>
        {day && <button type="button" className="r-btn ghost p-link" onClick={() => setDay(null)}>Voir toute la semaine</button>}

        {view === 'list' ? (
          <div className="p-plan-list" data-view="list">
            {shown.map((d) => (
              d.sessions.length === 0 ? (
                <div key={d.day} className="p-plan-row rest" aria-label={`${d.day} ${d.date} : repos`}>
                  <span className="p-plan-date"><small>{d.day}</small><b>{d.date}</b></span>
                  <RestIcon />
                  <span className="p-plan-text"><b>Repos</b><span>Récupération</span></span>
                </div>
              ) : d.sessions.map((s) => (
                <button key={s.id} type="button" className={`p-plan-row ${s.state}`} data-sport={s.sport} onClick={s.sport === 'strength' ? onOpen : undefined} aria-label={`${d.day} ${d.date} : ${SPORT_NAMES[s.sport]}, ${s.title}, ${STATE_LABELS[s.state]}`}>
                  <span className="p-plan-date"><small>{d.day}</small><b>{d.date}</b></span>
                  <SportIcon sport={s.sport} label={false} />
                  <span className="p-plan-text"><b>{SPORT_NAMES[s.sport]}</b><span>{s.title}</span><span className="r-num">≈ {s.minutes} min{s.note ? ` · ${s.note}` : ''}</span></span>
                  <StateBadge s={s.state} />
                </button>
              ))
            ))}
          </div>
        ) : (
          <div className="p-grid" data-view="grid" role="table" aria-label="Semaine en grille">
            {shown.map((d) => (
              <div key={d.day} className={`p-grid-row ${d.day === today ? 'today' : ''}`} role="row">
                <span className="p-grid-day" role="rowheader">{d.day}<small>{d.date}</small></span>
                <div className="p-grid-cells" role="cell">
                  {d.sessions.length === 0 ? <span className="p-grid-rest">Repos</span> : d.sessions.map((s) => (
                    <span key={s.id} className={`p-grid-cell ${s.state}`} data-sport={s.sport}>
                      <SportIcon sport={s.sport} label={false} />
                      <span className="p-grid-text"><b>{s.title}</b><small>{SPORT_NAMES[s.sport]} · {s.minutes} min</small></span>
                      <StateBadge s={s.state} />
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
