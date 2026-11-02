/**
 * REKKA V2 — prototype visuel isolé (lot V2-2) : Accueil, Planning (liste / grille), Séance Musculation (phases,
 * chronomètre global), Progression. Navigation Accueil / Planning / Séances / Progression / Profil. Données de
 * DÉMONSTRATION uniquement (demo-data.ts) : aucune lecture ni écriture de l'état de l'application, aucun moteur appelé.
 * L'état local (séries cochées, chronomètre) disparaît au rechargement : c'est une maquette, pas une fonctionnalité.
 */
import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { SportIcon, SPORT_NAMES } from './art/SportIcon.js';
import { DEMO_NOTICE, week } from './demo-data.js';
import { Ambience } from './art/Ambience.js';
import { MaskIcon, NAV_ICONS } from '../src/design/assets.js';
import { Home } from './screens/Home.js';
import { Planning, StateBadge } from './screens/Planning.js';
import { Workout } from './screens/Workout.js';
import { Progress } from './screens/Progress.js';
import { Profile } from './screens/Profile.js';

export type ProtoTab = 'home' | 'plan' | 'sessions' | 'progress' | 'profile';
const TABS: readonly { id: ProtoTab; label: string; icon: string }[] = [
  { id: 'home', label: 'Accueil', icon: NAV_ICONS.accueil },
  { id: 'plan', label: 'Planning', icon: NAV_ICONS.planning },
  { id: 'sessions', label: 'Séances', icon: NAV_ICONS.seances },
  { id: 'progress', label: 'Progression', icon: NAV_ICONS.progression },
  { id: 'profile', label: 'Profil', icon: NAV_ICONS.profil },
];


/** Bandeau toujours visible ; sa hauteur (1 ou 2 lignes selon la largeur) est publiée en `--p-demo-h` pour que les
 *  en-têtes collants (Séance) se placent juste en dessous au lieu d'être masqués. */
function DemoBanner() {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const app = el?.parentElement;
    if (!el || !app) return undefined;
    const sync = () => { app.style.setProperty('--p-demo-h', `${String(el.offsetHeight)}px`); };
    sync();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return <div ref={ref} className="r-demo-banner" role="note" data-demo-banner>{DEMO_NOTICE}</div>;
}

/** Barre d'onglets : pictogrammes du kit en masque `currentColor` (la couleur suit l'état actif). */
function TabBar({ tab, onChange }: { tab: ProtoTab; onChange: (t: ProtoTab) => void }) {
  return (
    <nav className="r-tabbar" aria-label="Navigation principale">
      {TABS.map((t) => (
        <button key={t.id} type="button" className="r-tab" aria-current={t.id === tab ? 'page' : undefined} onClick={() => onChange(t.id)}>
          <MaskIcon src={t.icon} className="r-tab-icon" />
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
        <Ambience art="bilan" />
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
  // Retour en haut à chaque écran, AVANT les effets des écrans (la Séance amène ensuite la série en cours en vue).
  useLayoutEffect(() => { window.scrollTo?.(0, 0); }, [tab, inWorkout]);
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
