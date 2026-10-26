/**
 * REKKA V2 — prototype visuel isolé (lot V2-2) : Accueil, Planning (liste / grille), Séance Musculation (phases,
 * chronomètre global), Progression. Navigation Accueil / Planning / Séances / Progression / Profil. Données de
 * DÉMONSTRATION uniquement (demo-data.ts) : aucune lecture ni écriture de l'état de l'application, aucun moteur appelé.
 * L'état local (séries cochées, chronomètre) disparaît au rechargement : c'est une maquette, pas une fonctionnalité.
 */
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { SportIcon, SPORT_NAMES } from '../src/design/SportIcon.js';
import type { SportKey } from '../src/design/SportIcon.js';
import { DEMO_NOTICE, progression, week } from './demo-data.js';
import { Home } from './screens/Home.js';
import { Planning, StateBadge } from './screens/Planning.js';
import { Workout } from './screens/Workout.js';

export type ProtoTab = 'home' | 'plan' | 'sessions' | 'progress' | 'profile';
const TABS: readonly { id: ProtoTab; label: string; icon: string }[] = [
  { id: 'home', label: 'Accueil', icon: 'M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
  { id: 'plan', label: 'Planning', icon: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4' },
  { id: 'sessions', label: 'Séances', icon: 'M6 4h12v16H6zM9 8h6M9 12h6M9 16h4' },
  { id: 'progress', label: 'Progression', icon: 'M4 19V9M10 19V5M16 19v-7M22 19H2' },
  { id: 'profile', label: 'Profil', icon: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6' },
];

const kg = (n: number) => String(n).replace('.', ',');

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


// ——— Progression

function LineChart() {
  const { loads, weeks, label } = progression.squat;
  const W = 320; const H = 140; const pad = 28;
  const min = Math.min(...loads) - 5; const max = Math.max(...loads) + 5;
  const x = (i: number) => pad + (i * (W - pad - 8)) / (loads.length - 1);
  const y = (v: number) => H - pad - ((v - min) * (H - pad - 10)) / (max - min);
  const d = loads.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <figure className="p-chart" aria-label={`${label} : de ${kg(loads[0] ?? 0)} à ${kg(loads.at(-1) ?? 0)} kg en 8 semaines`}>
      <svg viewBox={`0 0 ${String(W)} ${String(H)}`} role="img" aria-hidden="true">
        {[0, 1, 2].map((g) => { const v = min + ((max - min) * g) / 2; return <g key={g}><line x1={pad} x2={W - 8} y1={y(v)} y2={y(v)} className="p-gridline" /><text x={4} y={y(v) + 4} className="p-axis">{Math.round(v)}</text></g>; })}
        <path d={`${d} L${x(loads.length - 1).toFixed(1)},${String(H - pad)} L${String(pad)},${String(H - pad)} Z`} className="p-area" />
        <path d={d} className="p-line" />
        {loads.map((v, i) => <circle key={weeks[i]} cx={x(i)} cy={y(v)} r={i === loads.length - 1 ? 5 : 3} className={i === loads.length - 1 ? 'p-dot last' : 'p-dot'} />)}
        {weeks.map((w, i) => <text key={w} x={x(i) - 8} y={H - 8} className="p-axis">{w}</text>)}
      </svg>
      <figcaption className="r-text-3">{label}</figcaption>
    </figure>
  );
}

function Progress() {
  const [sport, setSport] = useState<SportKey>('strength');
  return (
    <main className="r-screen" aria-label="Progression">
      <div className="r-stack" style={{ gap: 0 }}><span className="r-eyebrow">8 dernières semaines</span><h1 className="r-h1">Progression</h1></div>
      <div className="r-row p-scroll-x" role="group" aria-label="Discipline">
        {(['strength', 'running', 'hyrox', 'crosstraining'] as const).map((sp) => <button key={sp} type="button" className="r-chip" aria-pressed={sport === sp} onClick={() => setSport(sp)}>{SPORT_NAMES[sp]}</button>)}
      </div>
      {sport === 'strength' ? (
        <>
          <section className="p-stats" aria-label="Chiffres clés">
            <div className="r-card r-stat"><b>+12,5</b><span>kg au squat</span></div>
            <div className="r-card r-stat"><b>25</b><span>séances</span></div>
            <div className="r-card r-stat"><b>86 %</b><span>régularité</span></div>
          </section>
          <section className="r-card" aria-label="Évolution des charges"><LineChart /></section>
        </>
      ) : (
        <section className="r-card" aria-label="Indicateur indisponible" data-unavailable>
          <b>{SPORT_NAMES[sport]} : {sport === 'running' ? 'graphique des allures à venir' : 'aucun résultat enregistré'}</b>
          <span className="r-text-3">Indicateur non disponible dans le prototype. REKKA n’affiche jamais de chiffre sans séance réelle derrière.</span>
        </section>
      )}
      <section className="r-card" aria-label="Records confirmés">
        <h3 className="r-h3">Records confirmés</h3>
        {progression.records.map((r) => (
          <div key={r.label} className="r-row between p-record" data-sport={r.sport}>
            <span className="r-row"><SportIcon sport={r.sport} /><span className="r-stack" style={{ gap: 0 }}><b>{r.label}</b><span className="r-text-3">{r.when}</span></span></span>
            <span className="r-badge record r-num">{r.value}</span>
          </div>
        ))}
      </section>
      <section className="r-card" aria-label="Régularité">
        <h3 className="r-h3">Régularité</h3>
        <div className="p-reg" role="list">
          {progression.regularity.map(([d, p], i) => (
            <div key={`w${String(i)}`} role="listitem" className="p-reg-week" aria-label={`Semaine ${String(i + 1)} : ${String(d)} séances sur ${String(p)}`}>
              <i style={{ height: `${String(Math.round((d / p) * 100))}%` }} className={d === p ? 'full' : ''} />
              <small>S{i + 1}</small>
            </div>
          ))}
        </div>
      </section>
      <section className="r-stack" aria-label="Jalons">
        <h3 className="r-h3">Jalons</h3>
        {progression.badges.map((b) => (
          <article key={b.id} className={`r-card p-badge ${b.earned ? 'earned' : 'locked'}`} aria-label={`${b.title} : ${b.earned ? 'obtenu' : 'à venir'}`}>
            <span className="p-badge-mark" aria-hidden="true">{b.earned ? '★' : '☆'}</span>
            <span className="r-stack" style={{ gap: 2 }}><b>{b.title}</b><span className="r-text-3">{b.detail}</span></span>
            <span className={`r-badge ${b.earned ? 'success' : ''}`}>{b.earned ? 'Obtenu' : 'À venir'}</span>
          </article>
        ))}
      </section>
    </main>
  );
}

// ——— Écrans hors prototype

function Sessions({ onOpen }: { onOpen: () => void }) {
  const all = week.flatMap((d) => d.sessions.map((s) => ({ d, s })));
  return (
    <main className="r-screen" aria-label="Séances">
      <h1 className="r-h1">Séances</h1>
      <p className="r-text-2" style={{ margin: 0 }}>Regroupera les séances à venir et l’historique (écran existant conservé, refonte dans un lot ultérieur).</p>
      {all.map(({ d, s }) => (
        <button key={s.id} type="button" className="r-card p-mission" data-sport={s.sport} onClick={s.sport === 'strength' ? onOpen : undefined}>
          <div className="r-row" style={{ gap: 12 }}><SportIcon sport={s.sport} label={false} /><span className="r-stack" style={{ gap: 2, flex: 1 }}><b>{s.title}</b><span className="r-text-3">{d.day} {d.date} · {SPORT_NAMES[s.sport]}</span></span><StateBadge s={s.state} /></div>
        </button>
      ))}
    </main>
  );
}

function Profile() {
  return (
    <main className="r-screen" aria-label="Profil">
      <h1 className="r-h1">Profil</h1>
      <div className="r-card"><b>Hors prototype</b><span className="r-text-2">Regroupera profil, objectifs, disciplines, matériel, préférences, données et version. Les écrans existants (Programme, Réglages, Profil Course) sont conservés jusqu’à leur refonte.</span></div>
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
