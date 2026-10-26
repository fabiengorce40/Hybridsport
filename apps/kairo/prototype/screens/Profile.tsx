/**
 * REKKA V2 — Profil du prototype (lot V2-2B) : en-tête d'ambiance (illustration du kit, à valider), avatar PROVISOIRE, objectifs par
 * discipline, disciplines actives, accès à l'historique et aux réglages (écrans existants). AUCUN niveau ni XP : le
 * « niveau 28 » de la maquette est purement illustratif et n'est pas une spécification. Données de démonstration.
 */
import { useState } from 'react';
import { SportIcon, SPORT_NAMES } from '../../src/design/SportIcon.js';
import { BADGES } from '../../src/design/assets.js';
import { Ambience } from '../art/Ambience.js';
import { athlete, profileDemo, progression } from '../demo-data.js';

type Tab = 'goals' | 'stats' | 'badges';

export function Profile() {
  const [tab, setTab] = useState<Tab>('goals');
  return (
    <main className="p-page" aria-label="Profil">
      <header className="p-profile-head">
        <Ambience art="objectifs" />
        <div className="r-row between p-profile-top">
          <h1 className="p-page-title">Profil</h1>
          <button type="button" className="p-icon-btn round" aria-label="Réglages (écran existant)">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="p-identity">
          <span className="p-avatar" role="img" aria-label="Avatar provisoire" data-placeholder="avatar">{athlete.name.slice(0, 1)}</span>
          <div className="r-stack" style={{ gap: 2 }}>
            <b className="p-identity-name">{athlete.name}</b>
            <span className="r-text-2">Membre depuis {profileDemo.since}</span>
            <span className="r-text-3">4 disciplines actives</span>
          </div>
        </div>
      </header>
      <div className="p-page-body">
        <div className="p-segment three" role="tablist" aria-label="Sections du profil">
          {([['goals', 'Objectifs'], ['stats', 'Stats'], ['badges', 'Badges']] as const).map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}
        </div>
        {tab === 'goals' && (
          <section className="p-goals" aria-label="Objectifs">
            {profileDemo.goals.map((g) => (
              <div key={g.title} className="p-goal" data-sport={g.sport}>
                <SportIcon sport={g.sport} />
                <span className="p-record2-text"><b>{g.title}</b><span>{SPORT_NAMES[g.sport]} · {g.detail}</span></span>
              </div>
            ))}
          </section>
        )}
        {tab === 'stats' && (
          <section className="p-metrics" aria-label="Statistiques">
            <div className="p-metric"><b className="r-num">38</b><span>séances</span></div>
            <div className="p-metric"><b className="r-num">31 h</b><span>d’entraînement</span></div>
            <div className="p-metric"><b className="r-num">3</b><span>records</span></div>
          </section>
        )}
        {tab === 'badges' && (
          <section className="p-goals" aria-label="Badges">
            {progression.badges.map((b) => <div key={b.id} className={`p-goal ${b.earned ? '' : 'locked'}`}><img className="p-badge-img" src={BADGES[b.badge]} alt="" aria-hidden="true" /><span className="p-record2-text"><b>{b.title}</b><span>{b.earned ? 'Obtenu' : 'À venir'} · {b.detail}</span></span></div>)}
          </section>
        )}
        <section aria-label="Mes disciplines">
          <h2 className="p-section-title">Mes disciplines</h2>
          <div className="p-disc">
            {profileDemo.disciplines.map((d) => (
              <div key={d.sport} className="p-disc-tile" data-sport={d.sport} aria-label={`${SPORT_NAMES[d.sport]} : ${String(d.done)} séances sur ${String(d.planned)} ce mois`}>
                <span className="p-disc-art" aria-hidden="true"><SportIcon sport={d.sport} label={false} /></span>
                <b>{SPORT_NAMES[d.sport]}</b>
                <span className="p-disc-bar"><i style={{ width: `${String(Math.round((d.done / d.planned) * 100))}%` }} /></span>
                <small className="r-num">{d.done}/{d.planned} ce mois</small>
              </div>
            ))}
          </div>
          <span className="r-text-3 p-fine">Visuels de disciplines provisoires (pictogrammes) : les illustrations finales sont à fournir.</span>
        </section>
        <div className="p-links">
          <button type="button" className="r-btn secondary block">Historique des séances (écran existant)</button>
          <button type="button" className="r-btn secondary block">Réglages et données (écran existant)</button>
        </div>
      </div>
    </main>
  );
}
