/**
 * R5.1 — Planning en GRILLE : agenda hebdomadaire, une ligne par jour (lundi → dimanche), jour et date dans une colonne
 * fixe à gauche, cartes de séances côte à côte à droite. Présentation seule : projection de `selectBeta0Week` (mêmes
 * jours, mêmes séances, même action au clic que la liste) ; aucune séance, date ni progression n'est modifiée.
 * Mobile : seule la rangée de cartes d'un jour défile horizontalement si ses séances ne tiennent pas ; la page jamais.
 */
import { weekdayIndex } from '@hybridsport/app-core';
import { isTest, sessionTitle, sportName, STATUS_LABELS } from '../../present.js';
import { WEEKDAY_NAMES, weekdayShort } from '../../ui.js';
import { durationText, StatusPill } from './common.js';
import type { DayItemView, SessionItemView } from './common.js';

/** Couleur d'interface par sport (identité REKKA) ; le nom du sport est toujours écrit sur la carte. */
const SPORT_CLASS: Readonly<Record<string, string>> = { strength: 'sport-strength', running: 'sport-running', crosstraining: 'sport-crosstraining', hyrox: 'sport-hyrox' };

const monthShort = (date: string): string => new Date(`${date}T12:00:00Z`).toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' });
const dayLong = (date: string): string => `${WEEKDAY_NAMES[weekdayIndex(date)] ?? ''} ${String(Number(date.slice(8)))} ${new Date(`${date}T12:00:00Z`).toLocaleDateString('fr-FR', { month: 'long', timeZone: 'UTC' })}`;

export function WeekAgenda({ days, today, availability, onOpen }: { days: readonly DayItemView[]; today: string; availability: readonly number[]; onOpen: (id: string) => void }) {
  return (
    <ul className="agenda" aria-label="Semaine en grille, un jour par ligne" data-planning-grid>
      {days.map(({ date, sessions }) => {
        const wd = weekdayIndex(date);
        const rest = (availability[wd] ?? 0) > 0 ? 'Disponible, aucune séance' : 'Repos';
        const count = sessions.length === 0 ? rest : `${String(sessions.length)} séance${sessions.length > 1 ? 's' : ''}`;
        return (
          <li key={date} className={`agenda-day ${date === today ? 'today' : ''}`} data-agenda-day={date} aria-current={date === today ? 'date' : undefined}>
            <span className="sr-only" data-agenda-day-label>{`${dayLong(date)}${date === today ? ', aujourd’hui' : ''} : ${count}`}</span>
            <div className="agenda-date" aria-hidden="true">
              <span className="w">{weekdayShort(wd)}</span>
              <span className="n num">{Number(date.slice(8))}</span>
              <span className="m">{monthShort(date)}</span>
            </div>
            {sessions.length > 0
              ? <ul className="agenda-cards" aria-label={`Séances du ${dayLong(date)}`}>{sessions.map((v) => <li key={v.requestId}><AgendaCard v={v} onOpen={onOpen} /></li>)}</ul>
              : <div className="agenda-rest" data-agenda-rest>{rest}</div>}
          </li>
        );
      })}
    </ul>
  );
}

/** Carte compacte : sport, nom de séance, durée, statut ; clic = ouverture de la séance (même action que la liste). */
function AgendaCard({ v, onOpen }: { v: SessionItemView; onOpen: (id: string) => void }) {
  const name = sessionTitle(v);
  const dur = durationText(v);
  return (
    <button type="button" className={`agenda-card ${SPORT_CLASS[v.sport] ?? 'sport-other'}`} data-request={v.requestId} data-sport={v.sport} data-status={v.display}
      onClick={() => onOpen(v.requestId)} aria-label={`${sportName(v.sport)} : ${name}${dur ? `, ${dur}` : ''}, ${STATUS_LABELS[v.display]}`}>
      <span className="agenda-sport">{sportName(v.sport)}{isTest(v.archetypeId) && <span className="badge test">TEST</span>}</span>
      <span className="agenda-name">{name}</span>
      {dur && <span className="agenda-dur num">{dur}</span>}
      <StatusPill status={v.display} />
    </button>
  );
}
