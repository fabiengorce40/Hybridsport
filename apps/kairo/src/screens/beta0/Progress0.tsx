import { SOBER_V3 } from '../../sober/flag.js';
import { PLAYFIELD_V4 } from '../../playfield/flag.js';
import { placedOf, weekOf } from './common.js';
import { isDone } from '../../present.js';
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
  if (PLAYFIELD_V4) {
    // No invented training points: labels, line and gradient use only real recorded values.
    const chartTop = 20, chartBottom = 105, chartW = 300;
    const axisMin = Math.floor(min / 5) * 5;
    const axisMax = Math.max(axisMin + 5, Math.ceil(max / 5) * 5);
    const xAt = (i:number) => values.length === 1 ? 165 : 52 + i * (chartW - 74)/(values.length-1);
    const yAt = (v:number) => chartBottom - ((v-axisMin)/(axisMax-axisMin))*(chartBottom-chartTop);
    const chartPts = values.map((v,i)=>`${xAt(i).toFixed(2)},${yAt(v).toFixed(2)}`).join(' ');
    const areaPts = values.length>1 ? `${xAt(0)},${chartBottom} ${chartPts} ${xAt(values.length-1)},${chartBottom}` : '';
    const ticks = Array.from({length:4},(_,i) => axisMin + (axisMax-axisMin)*i/3);
    const lastIndex = values.length-1;
    const lastValue = values[lastIndex] ?? 0;
    return <svg className="pv-spark pf-spark-chart" data-sport={sport} viewBox="0 0 300 148" role="img" aria-label={label}>
      <title>{label}</title>
      <defs><linearGradient id={`pf-progress-shade-${sport}`} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#1647C8" stopOpacity=".24"/><stop offset="1" stopColor="#1647C8" stopOpacity=".04"/>
      </linearGradient></defs>
      {ticks.map((tick,i)=><g key={i}>
        <line x1="45" x2="290" y1={yAt(tick)} y2={yAt(tick)} stroke="#E5EAF2" strokeWidth="1"/>
        <text x="38" y={yAt(tick)+3} fontSize="10" fill="#0e1b35" textAnchor="end">{kgFmt.format(tick)} kg</text>
      </g>)}
      {values.length>1 && <>
        <polygon points={areaPts} fill={`url(#pf-progress-shade-${sport})`}/>
        <polyline points={chartPts} fill="none" stroke="#1647C8" strokeWidth="3.3" strokeLinejoin="round" strokeLinecap="round"/>
      </>}
      {values.map((v,i)=><g key={i}>
        <circle cx={xAt(i)} cy={yAt(v)} r="4.4" fill="#fff" stroke="#1647C8" strokeWidth="2.8"/>
        <text x={xAt(i)} y="126" fill="#0e1b35" fontSize="11" fontWeight="750" textAnchor="middle">S{i+1}</text>
      </g>)}
      <g transform={`translate(${Math.min(244,Math.max(38,xAt(lastIndex)-44))},${Math.max(0,yAt(lastValue)-28)})`}>
        <rect x="0" y="0" width="58" height="23" rx="12" fill="#0b2f83"/>
        <text x="29" y="15" textAnchor="middle" fill="white" fontSize="11" fontWeight="800">{kgFmt.format(lastValue)} kg</text>
      </g>
    </svg>;
  }
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
  const [metric, setMetric] = useState<'load'|'reps'|'volume'>('load');
  const [picked, setPicked] = useState<string | null>(null);
  if (view.exercises.length === 0) return <p className="pv-empty">Aucune séance de musculation réalisée pour l’instant. Tes séries saisies apparaîtront ici.</p>;
  const ex = view.exercises.find((e) => e.exerciseId === picked) ?? view.exercises[0];
  if (!ex) return null;
  const name = exerciseLabel(ex.exerciseId);
  const loads = ex.sessions.flatMap((s) => (s.topLoadKg !== undefined ? [s.topLoadKg] : []));
  const loadedSessions = ex.sessions.filter((s) => s.topLoadKg !== undefined);
  return (
    <>
      {SOBER_V3 ? <label className="v3-exercise-picker"><span className="sr-only">Choisir un exercice</span><select value={ex.exerciseId} onChange={e=>setPicked(e.target.value)}>{view.exercises.map(e=><option key={e.exerciseId} value={e.exerciseId}>{exerciseLabel(e.exerciseId)}</option>)}</select></label> : <div className="pv-chips" role="group" aria-label="Choisir un exercice">
        {view.exercises.map((e) => (
          <button key={e.exerciseId} type="button" className="pv-chip" aria-pressed={e.exerciseId === ex.exerciseId} onClick={() => setPicked(e.exerciseId)}>
            {exerciseLabel(e.exerciseId)}{e.main ? <span className="pv-tag"> · principal</span> : null}
          </button>
        ))}
      </div>}
      <div className="pv-card" data-progress-exercise={ex.exerciseId}>
        {PLAYFIELD_V4 && <div className="pf-progress-chart-title">
          <h3>{metric==='load'?'Évolution des charges':metric==='reps'?'Évolution des répétitions':'Évolution du volume'}</h3>
          <p>{name} · {ex.sessions.length} séance{ex.sessions.length>1?'s':''} enregistrée{ex.sessions.length>1?'s':''}</p>
        </div>}
        {!SOBER_V3 && <h3 className="pv-sub">{name}</h3>}
        {SOBER_V3 && <div className="v3-metric-tabs" role="group" aria-label="Indicateur">{([['load','Charge'],['reps','Répétitions'],['volume','Volume']] as const).map(([id,label])=><button key={id} aria-pressed={metric===id} onClick={()=>setMetric(id)}>{label}</button>)}</div>}
        {SOBER_V3 && metric!=='load' && <Sparkline sport="strength" values={ex.sessions.map(s=>metric==='reps'?s.bestReps:s.volumeKg)} label={`${name} : ${metric==='reps'?'répétitions maximales':'volume en kg'} par séance : ${ex.sessions.map(s=>`${formatDateShort(s.date)} ${metric==='reps'?s.bestReps:s.volumeKg}`).join(', ')}`}/>}

        {loads.length > 0 ? (
          <>
            {(!SOBER_V3 || metric==='load') && <Sparkline sport="strength" values={loads} label={`${name} : charge maximale par séance, ${loadedSessions.map((s) => `${formatDateShort(s.date)} ${kg(s.topLoadKg ?? 0)}`).join(', ')}`} />}
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
  const [selectedSport,setSelectedSport] = useState<Sport>('strength');
  const [period,setPeriod] = useState<'week'|'month'|'year'>('week');
  const today = clock().today;
  const view = useMemo(() => progressView(state, { today }), [state, today]);
  const p = state.profile;
  // Données de référence disponibles uniquement en mode développement et sur demande explicite.
  // Jamais persistées, et inaccessibles dans une compilation de production.
  const visualFixture = import.meta.env.DEV && typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('rekka_visual_fixture') === 'progression';
  // V4: real registered data and canonical week selector only.
  const week = weekOf(state, today);
  const placed = placedOf(week?.days ?? []);
  const doneWeek = placed.filter(s => isDone(s.display)).length;
  const percentWeek = placed.length ? Math.round(doneWeek / placed.length * 100) : 0;
  // A session may contain several exercises: count its requestId only once.
  const strengthRecords = new Map<string, string>();
  view.strength.exercises.forEach(ex => ex.sessions.forEach(s => strengthRecords.set(s.requestId, s.date)));
  const allRecords = [
    ...[...strengthRecords].map(([id,date]) => ({ id:`strength:${id}`, date, sport:'strength' as const })),
    ...view.running.sessions.map(s => ({ id:`running:${s.sessionId}`, date:s.date, sport:'running' as const })),
    ...view.hyrox.sessions.map(s => ({ id:`hyrox:${s.id}`, date:s.date, sport:'hyrox' as const })),
    ...view.crosstraining.sessions.map(s => ({ id:`crosstraining:${s.id}`, date:s.date, sport:'crosstraining' as const })),
  ];
  const monday = new Date(`${today}T00:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay()+6)%7));
  const weekStart = monday.toISOString().slice(0,10);
  const inPeriod = (date: string) => period==='week' ? date >= weekStart && date <= today
    : period==='month' ? date.slice(0,7)===today.slice(0,7) && date <= today
    : date.slice(0,4)===today.slice(0,4) && date <= today;
  const scopedRecords = allRecords.filter(s=>inPeriod(s.date));
  const scopedCount = scopedRecords.length;
  const periodTitle = period==='week' ? 'cette semaine' : period==='month' ? 'ce mois-ci' : 'cette année';
  const scopeValue = period==='week' ? `${percentWeek}%` : String(scopedCount);
  const actualSports = [
    { id:'strength', name:'Musculation', count:scopedRecords.filter(s=>s.sport==='strength').length, color:'#0759EE' },
    { id:'running', name:'Course', count:scopedRecords.filter(s=>s.sport==='running').length, color:'#FA6A58' },
    { id:'hyrox', name:'HYROX', count:scopedRecords.filter(s=>s.sport==='hyrox').length, color:'#FDCB32' },
    { id:'crosstraining', name:'Cross-training', count:scopedRecords.filter(s=>s.sport==='crosstraining').length, color:'#7965C9' },
  ];
  const chartExercise = view.strength.exercises.find(e=>e.main && e.sessions.some(s=>s.topLoadKg!==undefined))
    ?? view.strength.exercises.find(e=>e.sessions.some(s=>s.topLoadKg!==undefined));
  const chartPoints = chartExercise?.sessions.filter(s=>s.topLoadKg!==undefined).slice(-6) ?? [];
  const observedDurationS = view.running.sessions.filter(s=>inPeriod(s.date)).reduce((n,s)=>n+s.durationS,0)
    + [...view.hyrox.sessions, ...view.crosstraining.sessions].filter(s=>inPeriod(s.date)).reduce((n,s)=>n+(s.durationS??0),0);
  const knownDurationCount = view.running.sessions.filter(s=>inPeriod(s.date)).length
    + [...view.hyrox.sessions, ...view.crosstraining.sessions].filter(s=>inPeriod(s.date) && s.durationS!==undefined).length;
  const activeSports = actualSports.filter(s=>s.count>0).length;
  const displayPercent = visualFixture ? 60 : percentWeek;
  const displayCount = visualFixture ? 3 : doneWeek;
  const displayPlanned = visualFixture ? 5 : placed.length;
  const displaySports = visualFixture ? [
    { id: 'strength', name: 'Musculation', count: 6, color: '#0759EE' },
    { id: 'running', name: 'Course', count: 3, color: '#FA6A58' },
    { id: 'hyrox', name: 'HYROX / CT', count: 1, color: '#FDCB32' },
  ] : actualSports;
  const displayTotal = displaySports.reduce((sum, sport) => sum + sport.count, 0);
  let displayCursor = 0;
  const displayRing = displayTotal ? `conic-gradient(${displaySports.filter(s=>s.count>0).map(s=>{
    const start = displayCursor;
    displayCursor += s.count / displayTotal * 100;
    return `${s.color} ${start}% ${displayCursor}%`;
  }).join(', ')})` : '#E6EAF3';
  const has: Record<Sport, boolean> = {
    strength: view.strength.exercises.length > 0, running: view.running.sessions.length > 0, hyrox: view.hyrox.sessionsDone > 0, crosstraining: view.crosstraining.sessionsDone > 0,
  };
  // Section affichée si le sport est déclaré au profil ou si des données existent.
  const shown = SECTIONS.filter((x) => has[x.sport] || (p ? p[x.sport].enabled : false));
  return (
    <div className="pv" data-progress-view>
      {PLAYFIELD_V4 && <section className="pf-progress-dashboard" aria-label="Bilan de progression" data-visual-fixture={visualFixture ? 'progression' : undefined}>
         <div className="pf-progress-period" role="group" aria-label="Période de progression">
           {([['week','Semaine'],['month','Mois'],['year','Année']] as const).map(([id,label])=>
             <button type="button" key={id} aria-pressed={period===id} onClick={()=>setPeriod(id)}>{label}</button>)}
         </div>
         <div className="pf-progress-week">
           <div className="pf-progress-ring" role="img"
             aria-label={period==='week' ? `${displayPercent} % des séances planifiées réalisées cette semaine` : `${scopedCount} séance(s) enregistrées ${periodTitle}`}
             style={{background:period==='week' ? `conic-gradient(#FDCB32 0% ${displayPercent}%, #E4E8F0 ${displayPercent}% 100%)` : '#E4E8F0'}}>
             <span>{visualFixture && period==='week' ? '60 %' : scopeValue}</span>
           </div>
           <div className="pf-progress-week-copy"><strong>{period==='week' ? `${displayCount} / ${displayPlanned} séances` : `${scopedCount} séance${scopedCount>1?'s':''}`}</strong><span>{periodTitle}</span>
             {visualFixture && period==='week' ? <small className="pf-progress-trend">↑ +10 % vs semaine précédente</small> : <small className="pf-progress-subnote">{period==='week' ? 'Séances planifiées validées' : 'Séances réellement enregistrées'}</small>}
           </div>
         </div>
         <div className="pf-progress-facts">
           <div><span className="pf-progress-fact-icon pf-progress-fact-icon--coral" aria-hidden="true">♨</span><strong>{visualFixture ? '1 240' : scopedCount}</strong><small>{visualFixture ? 'kcal · référence visuelle' : 'séances réalisées'}</small></div>
           <div><span className="pf-progress-fact-icon" aria-hidden="true">⏱</span><strong>{visualFixture ? '5h40' : knownDurationCount ? durationLabel(observedDurationS) : '—'}</strong><small>durée mesurée{knownDurationCount ? ' (partielle)' : ''}</small></div>
           <div><span className="pf-progress-fact-icon pf-progress-fact-icon--yellow" aria-hidden="true">★</span><strong>{visualFixture ? '+2,5 %' : activeSports}</strong><small>{visualFixture ? 'performances · référence visuelle' : `sport${activeSports>1?'s':''} pratiqué${activeSports>1?'s':''}`}</small></div>
         </div>
         <div className="pf-progress-distribution">
           <strong>Répartition par sport</strong>
           <div className="pf-progress-distribution-body">
             <div className="pf-progress-donut" role="img" aria-label={`Répartition de ${displayTotal} séances par sport`} style={{background:displayRing}}>
               {!displayTotal && <span>0</span>}
             </div>
             <div className="pf-progress-legend">
               {displaySports.filter(s=>s.count>0).map(s=><div key={s.id}>
                 <i style={{background:s.color}} aria-hidden="true"/><span>{s.name}</span><strong>{Math.round(s.count/displayTotal*100)} %</strong>
               </div>)}
               {!displayTotal && <span className="pf-progress-no-data">Aucune séance sur cette période</span>}
             </div>
           </div>
         </div>
         <div className="pf-progress-chart-card">
           <h2>Évolution des charges</h2>
           {visualFixture ? <><p>Développé couché (série de référence)</p><Sparkline sport="strength" values={[77,79,82,81.5,84,85]} label="Fixture graphique de référence : charges de démonstration" /><span className="pf-progress-chart-last">85 kg · référence visuelle</span></> : chartExercise && chartPoints.length ? <>
             <p>{exerciseLabel(chartExercise.exerciseId)} (charge maximale par séance)</p>
             <Sparkline sport="strength" values={chartPoints.map(s=>s.topLoadKg ?? 0)} label={`${exerciseLabel(chartExercise.exerciseId)} : ${chartPoints.map(s=>`${formatDateShort(s.date)} ${kg(s.topLoadKg ?? 0)}`).join(', ')}`} />
             <span className="pf-progress-chart-last">Dernière : {kg(chartPoints[chartPoints.length-1]?.topLoadKg ?? 0)}</span>
           </> : <p className="pf-progress-no-data">Les charges enregistrées apparaîtront ici après tes premières séries de travail.</p>}
         </div>
       </section>}
       {view.empty && !visualFixture && <p className="pv-empty" data-progress-empty>Aucune séance réalisée pour l’instant. Termine une séance pour suivre ta progression ici.</p>}
      {SOBER_V3 && <div className="v3-sport-tabs" role="group" aria-label="Sport de progression">{SECTIONS.map(x=><button key={x.sport} data-sport={x.sport} aria-pressed={selectedSport===x.sport} onClick={()=>setSelectedSport(x.sport)}>{x.title}</button>)}</div>}
      {(SOBER_V3 ? SECTIONS.filter(x=>x.sport===selectedSport) : shown).map((x) => (
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
