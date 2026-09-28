/** Composants communs (présentation uniquement). */
import type { ReactNode } from 'react';
import { AUTHORITY_LABELS, RUNNING_ARCHETYPE_LABELS, SPORT_LABELS } from '@hybridsport/app-core';
import type { Authority, GeneratedSession, Sport } from '@hybridsport/app-core';

export type Tab = 'home' | 'plan' | 'run' | 'history' | 'profile';

const ICONS: Record<Tab, ReactNode> = {
  home: <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  plan: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  run: <><circle cx="14" cy="4.5" r="2" /><path d="m9 21 2.5-6 3 2.5V21M6 12l3-4 4 1 3 3 3 1M11.5 15 9 11" /></>,
  history: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
};
const TAB_LABELS: Record<Tab, string> = { home: 'Accueil', plan: 'Planning', run: 'Course', history: 'Historique', profile: 'Profil' };

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="tabbar" aria-label="Navigation principale">
      {(Object.keys(ICONS) as Tab[]).map((t) => (
        <button key={t} className={t === tab ? 'on' : ''} onClick={() => onChange(t)} aria-current={t === tab ? 'page' : undefined}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[t]}</svg>
          {TAB_LABELS[t]}
        </button>
      ))}
    </nav>
  );
}

export function AuthorityBadge({ authority }: { authority: Authority }) {
  return <span className={`badge ${authority}`} title={AUTHORITY_LABELS[authority]?.detail}>{AUTHORITY_LABELS[authority]?.badge}</span>;
}

/** Bannière permanente : aucune séance de KAIRO V0 n'est une prescription de production. */
export function AuthorityBanner() {
  return (
    <div className="authority-banner" role="note">
      <strong>V0 PROVISOIRE</strong>
      <span>Séances issues de règles non validées par des experts. Ne remplace pas un avis médical.</span>
    </div>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'danger' | 'sim'; children: ReactNode }) {
  return <div className={`notice ${tone === 'info' ? '' : tone}`} role={tone === 'danger' ? 'alert' : 'note'}>{children}</div>;
}

export const sportLabel = (s: Sport): string => SPORT_LABELS[s];

export function sessionTitle(g: GeneratedSession): string {
  if (g.sport === 'running') return RUNNING_ARCHETYPE_LABELS[g.archetypeId] ?? 'Course';
  return 'Full body';
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
export const weekdayShort = (i: number): string => WEEKDAYS[i] ?? '';
export const WEEKDAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export function formatDate(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
}

export function formatDateShort(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

export function Topbar({ title, onBack, right }: { title: string; onBack: () => void; right?: ReactNode }) {
  return (
    <div className="topbar">
      <button className="btn ghost" onClick={onBack} aria-label="Retour" style={{ padding: '0 8px', minHeight: 40 }}>←</button>
      <div className="title">{title}</div>
      {right}
    </div>
  );
}
