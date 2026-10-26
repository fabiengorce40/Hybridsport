/**
 * REKKA V2 — Accueil du prototype (lot V2-2B) : univers illustré (scène vectorielle provisoire) séparé de
 * l'interface ; logo provisoire, accueil, séance du jour actionnable, accès aux 4 disciplines, résumé de semaine.
 * Tous les éléments d'interface sont de vrais composants, jamais incrustés dans l'image. Données de démonstration.
 */
import { SportIcon, SPORT_NAMES } from '../../src/design/SportIcon.js';
import { Scene } from '../art/Scene.js';
import { Wordmark } from '../brand/Wordmark.js';
import { athlete, todayLabel, week, weekSummary, workout } from '../demo-data.js';

const SPORTS = ['strength', 'running', 'hyrox', 'crosstraining'] as const;

export function Home({ onStart, onPlanning }: { onStart: () => void; onPlanning: () => void }) {
  const maxMin = Math.max(...weekSummary.days.map((d) => d.minutes), 1);
  return (
    <main className="p-home" aria-label="Accueil">
      <section className="p-hero" aria-label="Bannière REKKA">
        <Scene variant="city" label="Paysage cyberpunk et fantasy : ville néon au coucher du soleil (illustration provisoire)" />
        <span className="r-badge demo p-hero-tag" data-placeholder-tag>Illustration provisoire</span>
        <div className="p-hero-brand"><Wordmark /></div>
        <div className="p-hero-text">
          <h1 className="p-hello">Salut {athlete.name},</h1>
          <p>Une nouvelle journée pour nourrir ta flamme.</p>
        </div>
      </section>

      <div className="p-home-body">
        <section className="p-today" aria-label="Séance du jour" data-sport="strength">
          <span className="r-sport-icon p-today-icon" data-sport="strength" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" /></svg>
          </span>
          <div className="p-today-text">
            <span className="r-eyebrow">Séance du jour · {todayLabel}</span>
            <h2 className="p-today-title">{workout.title}</h2>
            <span className="r-text-2 r-num">≈ {workout.plannedMin} min · {workout.exercises.length} exercices</span>
          </div>
          <span className="p-today-sport">Musculation</span>
          <button type="button" className="p-play" onClick={onStart} aria-label="Commencer la séance">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
          </button>
        </section>

        <nav className="p-sport-tiles" aria-label="Disciplines">
          {SPORTS.map((sp) => {
            const next = week.flatMap((d) => d.sessions.map((s) => ({ d, s }))).find(({ s }) => s.sport === sp && s.state !== 'done' && s.state !== 'cancelled');
            return (
              <button key={sp} type="button" className="p-sport-tile" data-sport={sp} onClick={onPlanning} aria-label={`${SPORT_NAMES[sp]} : ${next ? `${next.d.day}, ${next.s.title}` : 'rien de prévu'}`}>
                <SportIcon sport={sp} label={false} />
                <span>{SPORT_NAMES[sp]}</span>
              </button>
            );
          })}
        </nav>

        <section className="p-week" aria-label="Ma semaine">
          <div className="r-row between"><h2 className="p-section-title">Ma semaine</h2><button type="button" className="r-btn ghost p-link" onClick={onPlanning}>Planning</button></div>
          <div className="p-week-stats">
            <div className="p-wstat"><b className="r-num">{weekSummary.sessions.done} / {weekSummary.sessions.planned}</b><span>séances</span></div>
            <div className="p-wstat"><b className="r-num">{weekSummary.durationLabel}</b><span>durée</span></div>
            <div className="p-wstat"><b className="r-num">{weekSummary.regularity} %</b><span>régularité</span></div>
          </div>
          <div className="p-week-bars" role="list" aria-label="Minutes d’entraînement par jour">
            {weekSummary.days.map((d, i) => (
              <div key={`${d.day}${String(i)}`} role="listitem" className="p-wbar" {...(d.sport ? { 'data-sport': d.sport } : {})} aria-label={`${d.day} : ${d.minutes > 0 ? `${String(d.minutes)} min${d.sport ? `, ${SPORT_NAMES[d.sport]}` : ''}` : d.sport ? `${SPORT_NAMES[d.sport]} prévue` : 'repos'}`}>
                <i className={d.minutes > 0 ? 'done' : d.sport ? 'planned' : 'rest'} style={{ height: `${String(d.minutes > 0 ? Math.max(18, Math.round((d.minutes / maxMin) * 100)) : d.sport ? 14 : 6)}%` }} />
                <small>{d.day}</small>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
