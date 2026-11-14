import { useState } from 'react';
import type { ReactNode } from 'react';
import { exerciseLabel } from '@hybridsport/app-core';
import type { StrengthExerciseProgress } from '@hybridsport/app-core';
import chestAnatomy from './assets/chest-anatomy.webp';
import { exerciseDetails } from './exercise-details.js';
import './exercise-detail.css';

const tabs = [['infos', 'Infos'], ['historique', 'Historique'], ['conseils', 'Conseils']] as const;

export function ExerciseDetail({ id, onBack, prescription, history }: {
  id: string;
  onBack: () => void;
  prescription: ReactNode;
  history?: StrengthExerciseProgress | undefined;
}) {
  const [tab, setTab] = useState<(typeof tabs)[number][0]>('infos');
  const content = exerciseDetails[id];
  const hasAtlas = id === 'ex.bench_press';
  return <main className="pf-exercise-page" data-exercise-detail={id}>
    <header className="pf-exercise-bar">
      <button type="button" onClick={onBack} aria-label="Retour à la liste d’exercices">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12H3m8-8-8 8 8 8" /></svg>
      </button>
      <strong>Détail exercice</strong>
      <details className="pf-exercise-menu">
        <summary aria-label="Plus d’options"><svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="4" cy="12" r="2.4"/><circle cx="12" cy="12" r="2.4"/><circle cx="20" cy="12" r="2.4"/>
        </svg></summary>
        <div>{prescription}</div>
      </details>
    </header>
    <div className="pf-exercise-identity">
      <svg viewBox="0 0 56 48" aria-hidden="true">
        <path d="M19 24h18" /><rect x="10" y="6" width="9" height="36" rx="4"/>
        <rect x="37" y="6" width="9" height="36" rx="4"/><path d="M10 14H6a4 4 0 0 0-4 4v12a4 4 0 0 0 4 4h4m36-20h4a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4h-4"/>
      </svg>
      <div><h1>{exerciseLabel(id)}</h1>
        <p>{content ? [content.primary, content.secondary].filter(Boolean).join(' · ') : 'Cartographie musculaire à documenter'}</p>
      </div>
    </div>
    <div className="pf-exercise-panel">
      {hasAtlas ? <img className="pf-exercise-atlas" src={chestAnatomy} width="662" height="411"
        alt="Vue antérieure. Pectoraux et avant des épaules mis en évidence." /> :
        <div className="pf-exercise-atlas pf-exercise-unavailable">
          <strong>Illustration anatomique indisponible</strong>
          {content && <span>Vue recommandée : {content.view}</span>}
        </div>}
      <div className="pf-exercise-switch" role="group" aria-label="Rubrique de l’exercice">
        {tabs.map(([key, label]) => <button type="button" key={key} aria-pressed={tab === key} onClick={() => setTab(key)}>{label}</button>)}
      </div>
      {tab === 'infos' && <section aria-label="Infos" className="pf-exercise-info">
        {content ? <ul>{content.cues.map(cue => <li key={cue}>{cue}</li>)}</ul> : <p>Consignes techniques à documenter pour cet exercice.</p>}
        <div className="pf-exercise-demo" role="note"><svg viewBox="0 0 48 48" aria-hidden="true" fill="none"><circle cx="24" cy="24" r="21" fill="#fffdf8"/><path d="M20 14l15 10-15 10z" fill="#0e1b35"/></svg><span>Démonstration vidéo non disponible</span></div>
      </section>}
      {tab === 'historique' && <section aria-label="Historique" className="pf-exercise-copy">
        {history?.sessions.length ? <>
          <ul>{[...history.sessions].reverse().map(session => <li key={session.requestId}>
            <time dateTime={session.date}>{session.date.split('-').reverse().join('/')}</time>
            {' · '}{session.setsDone} séries · {session.bestReps} reps max
            {session.topLoadKg !== undefined && <> · {session.topLoadKg} kg max</>}
          </li>)}</ul>
          {history.trend.deltaKg !== undefined && <p>Évolution de la charge maximale : {history.trend.deltaKg > 0 ? '+' : ''}{history.trend.deltaKg} kg</p>}
        </> : <p>Aucune série de travail enregistrée pour cet exercice.</p>}
      </section>}
      {tab === 'conseils' && <section aria-label="Conseils" className="pf-exercise-copy">
        {content ? <><p>{content.tip}</p><dl><dt>Muscles principaux</dt><dd>{content.primary}</dd>
          {content.secondary && <><dt>Muscles secondaires</dt><dd>{content.secondary}</dd></>}</dl></> :
          <p>Conseils techniques à documenter pour cet exercice.</p>}
      </section>}
    </div>
  </main>;
}
