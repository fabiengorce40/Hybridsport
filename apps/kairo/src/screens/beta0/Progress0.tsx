/**
 * Chantier C — écran Progression (présentation seulement) : projection de `progressView`, lecture pure des données
 * persistées. Aucune progression inventée : HYROX et Cross-training n'affichent que des faits (nombre, durées, dates).
 */
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { durationLabel, exerciseLabel, paceLabel, progressView } from '@hybridsport/app-core';
import type { ProgressView, SimpleSportProgress, Sport } from '@hybridsport/app-core';
import { useStore } from '../../store.js';
import { formatDateShort } from '../../ui.js';
import './progress0.css';

// technical-constant: nombre de séances / semaines listées sous un graphique (lisibilité mobile)
const LAST_SHOWN = 5;
// technical-constant: dimensions du repère SVG du mini-graphique (unités internes, mis à l'échelle en CSS)
const SPARK_W = 300;
// technical-constant: dimensions du repère SVG du mini-graphique
const SPARK_H = 64;
// technical-constant: marge intérieure du mini-graphique
const SPARK_PAD = 6;
// technical-constant: conversion mètres → kilomètres (affichage)
const M_PER_KM = 1000;

const kgFmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
const kg = (x: number): string => `${kgFmt.format(x)} kg`;
const km = (m: number): string => `${kgFmt.format(m / M_PER_KM)} km`;
const signedKg = (x: number): string => `${x > 0 ? '+' : x < 0 ? '−' : '±'}${kgFmt.format(Math.abs(x))} kg`;

/** Mini-graphique en ligne (SVG, sans bibliothèque) ; alternative textuelle complète dans `label`. */
export function Sparkline({ values, label, sport }: { values: readonly number[]; label: string; sport: Sport }) {
  if (values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => (values.length === 1 ? SPARK_W / 2 : SPARK_PAD + (i * (SPARK_W - 2 * SPARK_PAD)) / (values.length - 1));
  const y = (v: number) => (max === min ? SPARK_H / 2 : SPARK_H - SPARK_PAD - ((v - min) * (SPARK_H - 2 * SPARK_PAD)) / span);
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg className="pv-spark" data-sport={sport} viewBox={`0 0 ${String(SPARK_W)} ${String(SPARK_H)}`} role="img" aria-label={label}>
      <title>{label}</title>
      {values.length > 1 && <polyline points={points} fill="none" />}
      {values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={3} />)}
    </svg>
  );
}

function Section({ sport, title, children }: { sport: Sport; title: string; children: ReactNode }) {
  const id = `pv-${sport}`;
  return (
    <section className="pv-section" data-sport={sport} aria-labelledby={id}>
      <h2 id={id} className="pv-title">{title}</h2>
      {children}
    </section>
  );
}

function StrengthPanel({ view }: { view: ProgressView['strength'] }) {
  const [picked, setPicked] = useState<string | null>(null);
  if (view.exercises.length === 0) return <p className="pv-empty">Aucune séance de musculation réalisée pour l’instant. Tes séries saisies apparaîtront ici.</p>;
  const ex = view.exercises.find((e) => e.exerciseId === picked) ?? view.exercises[0];
  if (!ex) return null;
  const name = exerciseLabel(ex.exerciseId);
  const loads = ex.sessions.flatMap((s) => (s.topLoadKg !== undefined ? [s.topLoadKg] : []));
  const loadedSessions = ex.sessions.filter((s) => s.topLoadKg !== undefined);
  return (
    <>
      <div className="pv-chips" role="group" aria-label="Choisir un exercice">
        {view.exercises.map((e) => (
          <button key={e.exerciseId} type="button" className="pv-chip" aria-pressed={e.exerciseId === ex.exerciseId} onClick={() => setPicked(e.exerciseId)}>
            {exerciseLabel(e.exerciseId)}{e.main ? <span className="pv-tag"> · principal</span> : null}
          </button>
        ))}
      </div>
      <div className="pv-card" data-progress-exercise={ex.exerciseId}>
        <h3 className="pv-sub">{name}</h3>
        {loads.length > 0 ? (
          <>
            <Sparkline sport="strength" values={loads} label={`${name} : charge maximale par séance, ${loadedSessions.map((s) => `${formatDateShort(s.date)} ${kg(s.topLoadKg ?? 0)}`).join(', ')}`} />
            <dl className="pv-kv">
              <div><dt>Première</dt><dd className="num">{kg(ex.trend.firstTopLoadKg ?? 0)}</dd></div>
              <div><dt>Dernière</dt><dd className="num">{kg(ex.trend.lastTopLoadKg ?? 0)}</dd></div>
              <div><dt>Évolution</dt><dd className="num">{ex.trend.deltaKg !== undefined ? signedKg(ex.trend.deltaKg) : '—'}</dd></div>
              <div><dt>Séances</dt><dd className="num">{ex.trend.sessions}</dd></div>
            </dl>
          </>
        ) : <p className="pv-note">Aucune charge saisie pour cet exercice : seules les répétitions sont suivies.</p>}
        <ul className="pv-list" aria-label={`Dernières séances : ${name}`}>
          {ex.sessions.slice(-LAST_SHOWN).reverse().map((s) => (
            <li key={s.requestId} className="num">
              <span>{formatDateShort(s.date)}</span>
              <span>{s.topLoadKg !== undefined ? `${kg(s.topLoadKg)} · ` : ''}{s.bestReps} rép. max · {s.setsDone} série{s.setsDone > 1 ? 's' : ''}{s.volumeKg > 0 ? ` · ${kg(s.volumeKg)}` : ''}</span>
            </li>
          ))}
        </ul>
      </div>
      <h3 className="pv-sub">Par semaine (tous exercices)</h3>
      <ul className="pv-list" aria-label="Séries et volume par semaine">
        {view.weeks.slice(-LAST_SHOWN).reverse().map((w) => (
          <li key={w.weekStart} className="num"><span>Sem. {w.isoWeek}</span><span>{w.setsDone} série{w.setsDone > 1 ? 's' : ''}{w.volumeKg > 0 ? ` · ${kg(w.volumeKg)}` : ''}</span></li>
        ))}
      </ul>
    </>
  );
}

function RunningPanel({ view }: { view: ProgressView['running'] }) {
  if (view.sessions.length === 0) return <p className="pv-empty">Aucune course réalisée pour l’instant. Tes courses du programme et tes courses libres apparaîtront ici.</p>;
  const durations = view.sessions.map((s) => s.durationS);
  return (
    <>
      <Sparkline sport="running" values={durations} label={`Durée par course : ${view.sessions.map((s) => `${formatDateShort(s.date)} ${durationLabel(s.durationS)}`).join(', ')}`} />
      <ul className="pv-list" aria-label="Dernières courses">
        {view.sessions.slice(-LAST_SHOWN).reverse().map((s) => (
          <li key={s.sessionId} className="num" data-progress-run={s.sessionId}>
            <span>{formatDateShort(s.date)}{s.source === 'free' ? ' · libre' : ''}</span>
            <span>{durationLabel(s.durationS)}{s.distanceM !== undefined ? ` · ${km(s.distanceM)}` : ''}{s.paceSPerKm !== undefined ? ` · ${paceLabel(s.paceSPerKm)} /km` : ''}</span>
          </li>
        ))}
      </ul>
      <p className="pv-note">Allure affichée seulement pour une course complète dont la distance est connue.</p>
      {view.weeks.length > 0 && (
        <>
          <h3 className="pv-sub">Régularité</h3>
          <ul className="pv-list" aria-label="Courses par semaine">
            {view.weeks.slice(-LAST_SHOWN).reverse().map((w) => (
              <li key={w.weekStart} className="num"><span>Sem. {w.isoWeek}</span><span>{w.done} faite{w.done > 1 ? 's' : ''}{w.planned !== null ? ` / ${String(w.planned)} prévue${w.planned > 1 ? 's' : ''}` : ''}</span></li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function SimplePanel({ view, name }: { view: SimpleSportProgress; name: string }) {
  const last = view.sessions[view.sessions.length - 1];
  return (
    <>
      {view.sessionsDone === 0 ? <p className="pv-empty">Aucune séance {name} réalisée pour l’instant.</p> : (
        <dl className="pv-kv">
          <div><dt>Séances faites</dt><dd className="num">{view.sessionsDone}</dd></div>
          <div><dt>Durée mesurée</dt><dd className="num">{view.totalDurationS !== null ? durationLabel(view.totalDurationS) : '—'}</dd></div>
          {last && <div><dt>Dernière</dt><dd className="num">{formatDateShort(last.date)}</dd></div>}
        </dl>
      )}
      <p className="pv-note">Sport expérimental : le suivi de progression n’est pas disponible, seules les séances réalisées sont comptées.</p>
    </>
  );
}

const SECTIONS: readonly { readonly sport: Sport; readonly title: string }[] = [
  { sport: 'strength', title: 'Musculation' }, { sport: 'running', title: 'Course' }, { sport: 'hyrox', title: 'HYROX' }, { sport: 'crosstraining', title: 'Cross-training' },
];

export function Progress0() {
  const { state, clock } = useStore();
  const today = clock().today;
  const view = useMemo(() => progressView(state, { today }), [state, today]);
  const p = state.profile;
  const has: Record<Sport, boolean> = {
    strength: view.strength.exercises.length > 0, running: view.running.sessions.length > 0, hyrox: view.hyrox.sessionsDone > 0, crosstraining: view.crosstraining.sessionsDone > 0,
  };
  // Section affichée si le sport est déclaré au profil ou si des données existent.
  const shown = SECTIONS.filter((x) => has[x.sport] || (p ? p[x.sport].enabled : false));
  return (
    <div className="pv" data-progress-view>
      {view.empty && <p className="pv-empty" data-progress-empty>Aucune séance réalisée pour l’instant. Termine une séance pour suivre ta progression ici.</p>}
      {shown.map((x) => (
        <Section key={x.sport} sport={x.sport} title={x.title}>
          {x.sport === 'strength' && <StrengthPanel view={view.strength} />}
          {x.sport === 'running' && <RunningPanel view={view.running} />}
          {x.sport === 'hyrox' && <SimplePanel view={view.hyrox} name="HYROX" />}
          {x.sport === 'crosstraining' && <SimplePanel view={view.crosstraining} name="de cross-training" />}
        </Section>
      ))}
    </div>
  );
}
