/**
 * REKKA V2 — prototype visuel isolé (lot V2-2) : Accueil, Planning (liste / grille), Séance Musculation (phases,
 * chronomètre global), Progression. Navigation Accueil / Planning / Séances / Progression / Profil. Données de
 * DÉMONSTRATION uniquement (demo-data.ts) : aucune lecture ni écriture de l'état de l'application, aucun moteur appelé.
 * L'état local (séries cochées, chronomètre) disparaît au rechargement : c'est une maquette, pas une fonctionnalité.
 */
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { SportIcon, SPORT_NAMES } from '../src/design/SportIcon.js';
import { DEMO_NOTICE, week } from './demo-data.js';
import { Scene } from './art/Scene.js';
import { Home } from './screens/Home.js';
import { Planning, StateBadge } from './screens/Planning.js';
import { Workout } from './screens/Workout.js';
import { Progress } from './screens/Progress.js';
import { Profile } from './screens/Profile.js';

export type ProtoTab = 'home' | 'plan' | 'sessions' | 'progress' | 'profile';
const TABS: readonly { id: ProtoTab; label: string; icon: string }[] = [
  { id: 'home', label: 'Accueil', icon: 'M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
  { id: 'plan', label: 'Planning', icon: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4' },
  { id: 'sessions', label: 'Séances', icon: 'M6 4h12v16H6zM9 8h6M9 12h6M9 16h4' },
  { id: 'progress', label: 'Progression', icon: 'M4 19V9M10 19V5M16 19v-7M22 19H2' },
  { id: 'profile', label: 'Profil', icon: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6' },
];


function DemoBanner() {
  return <div className="r-demo-banner" role="note" data-demo-banner>{DEMO_NOTICE}</div>;
}

/** Logo REKKA provisoire (texte) : le logo final est une ressource graphique à fournir. */
function TabBar({ tab, onChange }: { tab: ProtoTab; onChange: (t: ProtoTab) => void }) {
  return (
    <nav className="r-tabbar" aria-label="Navigation principale">
      {TABS.map((t) => (
        <button key={t.id} type="button" className="r-tab" aria-current={t.id === tab ? 'page' : undefined} onClick={() => onChange(t.id)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={t.icon} /></svg>
          {t.label}
        </button>
      ))}
    </nav>
  );
}


// ——— Écrans hors prototype

function Sessions({ onOpen }: { onOpen: () => void }) {
  const all = week.flatMap((d) => d.sessions.map((s) => ({ d, s })));
  return (
    <main className="p-page" aria-label="Séances">
      <header className="p-page-head">
        <Scene variant="mountain" label="Paysage de montagne (illustration provisoire)" />
        <h1 className="p-page-title">Séances</h1>
      </header>
      <div className="p-page-body">
        <p className="r-text-2" style={{ margin: 0 }}>Regroupera les séances à venir et l’historique (écran existant conservé, refonte dans un lot ultérieur).</p>
        <div className="p-plan-list">
          {all.map(({ d, s }) => (
            <button key={s.id} type="button" className={`p-plan-row ${s.state}`} data-sport={s.sport} onClick={s.sport === 'strength' ? onOpen : undefined} aria-label={`${d.day} ${d.date} : ${SPORT_NAMES[s.sport]}, ${s.title}`}>
              <span className="p-plan-date"><small>{d.day}</small><b>{d.date}</b></span>
              <SportIcon sport={s.sport} label={false} />
              <span className="p-plan-text"><b>{s.title}</b><span>{SPORT_NAMES[s.sport]} · ≈ {s.minutes} min</span></span>
              <StateBadge s={s.state} />
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}

export function Prototype({ initial = 'home' }: { initial?: ProtoTab | 'workout' }) {
  const [tab, setTab] = useState<ProtoTab>(initial === 'workout' ? 'home' : initial);
  const [inWorkout, setInWorkout] = useState(initial === 'workout');
  useEffect(() => { window.scrollTo?.(0, 0); }, [tab, inWorkout]);
  let body: ReactNode;
  if (inWorkout) body = <Workout onBack={() => setInWorkout(false)} />;
  else if (tab === 'home') body = <Home onStart={() => setInWorkout(true)} onPlanning={() => setTab('plan')} />;
  else if (tab === 'plan') body = <Planning onOpen={() => setInWorkout(true)} />;
  else if (tab === 'progress') body = <Progress />;
  else if (tab === 'sessions') body = <Sessions onOpen={() => setInWorkout(true)} />;
  else body = <Profile />;
  return (
    <div className="p-app">
      <DemoBanner />
      {body}
      <TabBar tab={inWorkout ? 'sessions' : tab} onChange={(t) => { setInWorkout(false); setTab(t); }} />
    </div>
  );
}
