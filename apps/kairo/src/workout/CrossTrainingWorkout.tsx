/**
 * Séance Cross-training (C3.5) : projection de la prescription PERSISTÉE (`ctWorkoutOf`), jamais reconstruite.
 * Chrono horodaté côté app-core (pause / reprise explicites, survit au rechargement) ; l'affichage se rafraîchit chaque
 * seconde SANS écriture d'état. Chaque format a sa logique : continu (temps restant), intervalles (TRAVAIL / REPOS),
 * EMOM (minute en cours), AMRAP (tours + répétitions), for time (chrono écoulé, time cap, tours). Résultat structuré.
 */
import { useEffect, useState } from 'react';
import { CT_FORMAT_LABELS, CT_INTENT_LABELS, controlCtTimer, ctClock, ctElapsedS, ctWorkoutOf, exerciseLabel, finishProgrammeSession, recordCtProgress, startProgrammeSession } from '@hybridsport/app-core';
import type { CtWorkout, CtWorkoutItem, FinishInput, ProgrammeSessionView } from '@hybridsport/app-core';
import { useStore } from '../store.js';
import { formatDate, Notice, Topbar } from '../ui.js';
import { STATUS_LABELS } from '../present.js';
import { DurationInput } from '../running/DurationInput.js';
import { durationFromParts, formatChrono } from '../running/duration.js';
import type { DurationParts } from '../running/duration.js';

// technical-constant: rafraîchissement de l'AFFICHAGE du chrono (ms), aucune écriture d'état
const TICK_MS = 1000;
// technical-constant: secondes par minute / heure (découpage d'une durée pour la saisie)
const S_PER_MIN = 60;
// technical-constant: secondes par heure
const S_PER_H = 3600;

/** Dose dans son unité NATIVE (aucune conversion). */
export function doseLabel(q: CtWorkoutItem['quantity']): string {
  if (q.kind === 'reps') return `${String(q.value)} répétitions`;
  if (q.kind === 'calories') return `${String(q.value)} cal`;
  if (q.kind === 'distance_m') return `${String(q.value)} m`;
  return formatChrono(q.value);
}

function headline(w: CtWorkout): string {
  if (w.format === 'emom') return `${String(w.minutes)} min · chaque minute`;
  if (w.format === 'amrap') return `${formatChrono(w.totalS)} · max de tours`;
  if (w.format === 'for_time') return `${String(w.rounds)} tours · time cap ${formatChrono(w.timeCapS ?? w.totalS)}`;
  if (w.format === 'intervals') return `${String(w.rounds)} × ${formatChrono(w.workS ?? 0)} · récup ${formatChrono(w.restS ?? 0)}`;
  return `${formatChrono(w.totalS)} en continu`;
}

const partsOf = (s: number): DurationParts => ({ h: String(Math.floor(s / S_PER_H)), m: String(Math.floor((s % S_PER_H) / S_PER_MIN)), s: String(s % S_PER_MIN) });

/** Grand chrono adapté au format (lecture seule). */
function ClockFace({ w, elapsed, paused }: { w: CtWorkout; elapsed: number; paused: boolean }) {
  const c = ctClock(w, elapsed);
  let big = formatChrono(c.remainingS);
  let label = 'Temps restant';
  let sub: string | null = null;
  if (w.format === 'for_time') { big = formatChrono(c.elapsedS); label = 'Temps écoulé'; sub = `Time cap ${formatChrono(w.timeCapS ?? w.totalS)}`; }
  if (w.format === 'intervals' && c.phase) { big = formatChrono(c.phaseRemainingS ?? 0); label = c.phase === 'work' ? 'TRAVAIL' : 'RÉCUP'; sub = `Intervalle ${String(c.round)} / ${String(w.rounds)}`; }
  if (w.format === 'emom' && c.minute !== undefined) { big = formatChrono(c.minuteRemainingS ?? 0); label = `Minute ${String(c.minute)} / ${String(w.minutes)}`; sub = `Total restant ${formatChrono(c.remainingS)}`; }
  return (
    <div className={`k-ct-clock ${c.phase === 'rest' ? 'rest' : ''} ${c.over ? 'over' : ''}`} role="timer" aria-label="Chrono de la séance" aria-live="off">
      <div className="k-ct-clock-label">{paused ? 'EN PAUSE' : c.over ? (w.format === 'for_time' ? 'TIME CAP ATTEINT' : 'TEMPS ÉCOULÉ') : label}</div>
      <div className="k-ct-clock-big num">{big}</div>
      {sub && <div className="k-ct-clock-sub num">{sub}</div>}
    </div>
  );
}

/** Compteur à gros boutons (− / +), valeur absolue persistée à chaque appui. */
function Stepper({ label, value, onChange, disabled }: { label: string; value: number; onChange: (n: number) => void; disabled?: boolean }) {
  return (
    <div className="k-ct-stepper" role="group" aria-label={label}>
      <span className="k-ct-stepper-label">{label}</span>
      <button type="button" className="k-ct-step" aria-label={`${label} : moins un`} disabled={disabled || value === 0} onClick={() => onChange(value - 1)}>−</button>
      <output className="k-ct-step-value num" aria-live="polite">{value}</output>
      <button type="button" className="k-ct-step plus" aria-label={`${label} : plus un`} disabled={disabled} onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}

type Completion = FinishInput['completion'];
const COMPLETIONS: readonly { id: Completion; label: string }[] = [
  { id: 'completed_as_prescribed', label: 'Tout s’est passé comme prévu' },
  { id: 'modified', label: 'J’ai adapté la séance' },
  { id: 'abandoned', label: 'J’ai arrêté la séance' },
];

/** Fin de séance : résultat STRUCTURÉ selon le format (contrat du moteur), charges réelles, douleur. */
function CtFinishSheet({ w, elapsed, rounds0, reps0, onCancel, onSubmit }: {
  w: CtWorkout; elapsed: number; rounds0: number; reps0: number; onCancel: () => void; onSubmit: (f: Omit<FinishInput, 'requestId'>) => void;
}) {
  const c = ctClock(w, elapsed);
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [pain, setPain] = useState(false);
  const [rounds, setRounds] = useState(rounds0);
  const [reps, setReps] = useState(reps0);
  const [minutes, setMinutes] = useState(c.completedMinutes ?? 0);
  const [intervals, setIntervals] = useState(c.completedIntervals ?? 0);
  const [finishedFT, setFinishedFT] = useState(!c.over);
  const [time, setTime] = useState<DurationParts>(partsOf(Math.min(elapsed, w.totalS)));
  const [loads, setLoads] = useState<Record<string, string>>({});
  const [tried, setTried] = useState(false);
  const timeR = durationFromParts(time, true, 'le temps réalisé');

  let result: Record<string, unknown> | null = null;
  let incomplete = false;
  const errors: string[] = [];
  if (w.format === 'amrap') result = { kind: 'rounds_reps', rounds, reps };
  if (w.format === 'emom') { result = { kind: 'emom', minutesCompleted: minutes }; incomplete = minutes < (w.minutes ?? 0); if (minutes > (w.minutes ?? 0)) errors.push('Plus de minutes que prévu.'); }
  if (w.format === 'intervals') { result = { kind: 'intervals', intervalsCompleted: intervals }; incomplete = intervals < (w.rounds ?? 0); if (intervals > (w.rounds ?? 0)) errors.push('Plus d’intervalles que prévu.'); }
  if (w.format === 'continuous') { result = timeR.ok ? { kind: 'total', durationS: timeR.seconds } : null; incomplete = timeR.ok && timeR.seconds < w.totalS; }
  if (w.format === 'for_time') {
    if (finishedFT) { result = timeR.ok ? { kind: 'time', completionS: timeR.seconds } : null; if (timeR.ok && timeR.seconds > (w.timeCapS ?? w.totalS)) errors.push('Temps supérieur au time cap : indiquez « Time cap atteint ».'); }
    else { result = { kind: 'capped_rounds', roundsCompleted: rounds, partialReps: reps }; incomplete = true; if (rounds >= (w.rounds ?? 0)) errors.push('Tous les tours réalisés : indiquez votre temps.'); }
  }
  if (!completion) errors.push('Indiquez comment s’est passée la séance.');
  if (completion !== 'abandoned' && result === null) errors.push(timeR.ok ? 'Résultat manquant.' : timeR.error);
  if (completion === 'completed_as_prescribed' && incomplete) errors.push('Le résultat montre une séance incomplète (ou au time cap) : choisissez « J’ai adapté la séance ».');
  const loaded = w.items.filter((i) => i.loadKg !== undefined);
  const performedLoads = loaded.flatMap((i) => { const v = Number((loads[i.exerciseId] ?? '').replace(',', '.')); return loads[i.exerciseId] && v > 0 ? [{ exerciseId: i.exerciseId, kg: v }] : []; });

  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label="Fin de séance">
      <div className="sheet">
        <h2 style={{ margin: 0 }}>Fin de séance</h2>
        <div className="stack" role="radiogroup" aria-label="Déroulement">
          {COMPLETIONS.map((x) => <button key={x.id} type="button" role="radio" aria-checked={completion === x.id} className={`option ${completion === x.id ? 'on' : ''}`} onClick={() => setCompletion(x.id)}><span className="t">{x.label}</span></button>)}
        </div>
        {completion !== 'abandoned' && (
          <div className="stack-3">
            <div className="section-title" style={{ marginTop: 0 }}>Résultat</div>
            {w.format === 'amrap' && <><Stepper label="Tours complets" value={rounds} onChange={setRounds} /><Stepper label="Répétitions en plus" value={reps} onChange={setReps} /></>}
            {w.format === 'emom' && <Stepper label="Minutes réalisées" value={minutes} onChange={setMinutes} />}
            {w.format === 'intervals' && <Stepper label="Intervalles réalisés" value={intervals} onChange={setIntervals} />}
            {w.format === 'for_time' && (
              <div className="stack" role="radiogroup" aria-label="Fin du for time">
                <button type="button" role="radio" aria-checked={finishedFT} className={`option ${finishedFT ? 'on' : ''}`} onClick={() => setFinishedFT(true)}><span className="t">Terminé avant le time cap</span></button>
                <button type="button" role="radio" aria-checked={!finishedFT} className={`option ${!finishedFT ? 'on' : ''}`} onClick={() => setFinishedFT(false)}><span className="t">Time cap atteint</span></button>
              </div>
            )}
            {(w.format === 'continuous' || (w.format === 'for_time' && finishedFT)) && <DurationInput label={w.format === 'for_time' ? 'Temps réalisé' : 'Durée réalisée'} value={time} onChange={setTime} withHours error={tried && !timeR.ok ? timeR.error : null} />}
            {w.format === 'for_time' && !finishedFT && <><Stepper label="Tours complets" value={rounds} onChange={setRounds} /><Stepper label="Répétitions du tour en cours" value={reps} onChange={setReps} /></>}
            {loaded.map((i) => (
              <label key={i.exerciseId} className="field">Charge réellement utilisée · {exerciseLabel(i.exerciseId)} (prévu {String(i.loadKg)} kg, facultatif)
                <input inputMode="decimal" value={loads[i.exerciseId] ?? ''} placeholder={String(i.loadKg)} onChange={(e) => setLoads({ ...loads, [i.exerciseId]: e.target.value.replace(/[^0-9.,]/g, '') })} />
              </label>
            ))}
          </div>
        )}
        <label className="check"><input type="checkbox" checked={pain} onChange={(e) => setPain(e.target.checked)} />J’ai ressenti une douleur</label>
        {pain && <Notice tone="danger">Signaler une douleur suspend la planification automatique jusqu’à ce que vous la déclariez disparue. Consultez un professionnel de santé si elle persiste.</Notice>}
        {tried && errors.length > 0 && <div className="k-dur-error" role="alert">{errors[0]}</div>}
        <div className="row">
          <button className="btn secondary" onClick={onCancel}>Annuler</button>
          <button className="btn primary block" onClick={() => {
            setTried(true);
            if (errors.length > 0 || !completion) return;
            onSubmit({ completion, pain, ct: { ...(completion !== 'abandoned' && result ? { result } : {}), ...(performedLoads.length > 0 ? { performedLoads } : {}) } });
          }}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

/** Résultat enregistré, lisible (donnée source structurée ; « 7+12 » n'est qu'un affichage). */
export function ctResultText(result: Readonly<Record<string, unknown>> | null): string {
  if (!result) return 'Arrêtée';
  const n = (k: string) => (typeof result[k] === 'number' ? (result[k] as number) : 0);
  switch (result.kind) {
    case 'rounds_reps': return `${String(n('rounds'))} tours + ${String(n('reps'))} rép.`;
    case 'time': return `Temps ${formatChrono(n('completionS'))}`;
    case 'capped_rounds': return `Time cap · ${String(n('roundsCompleted'))} tours + ${String(n('partialReps'))} rép.`;
    case 'emom': return `${String(n('minutesCompleted'))} minutes réalisées`;
    case 'intervals': return `${String(n('intervalsCompleted'))} intervalles réalisés`;
    case 'total': return `Durée ${formatChrono(n('durationS'))}`;
    default: return 'Résultat enregistré';
  }
}

export function CrossTrainingWorkout({ v, onBack }: { v: ProgrammeSessionView; onBack: () => void }) {
  const store = useStore();
  const [finishing, setFinishing] = useState(false);
  const [, setTick] = useState(0);
  const w = ctWorkoutOf(v.session);
  const log = v.log;
  const rt = log?.ct;
  const finished = v.result !== null;
  const editable = log !== null && !finished && log.finishedAt === undefined && rt !== undefined;
  const runningClock = editable && rt.runningSince !== null;
  useEffect(() => {
    if (!runningClock) return undefined;
    const t = setInterval(() => setTick((x) => x + 1), TICK_MS);
    return () => clearInterval(t);
  }, [runningClock]);
  const intent = v.archetypeId ? CT_INTENT_LABELS[v.archetypeId]?.title : undefined;
  if (!w) return <><Topbar title="Cross-training" onBack={onBack} /><div className="empty">Séance Cross-training illisible : elle n’est pas reconstruite. Exportez vos données pour diagnostic.</div></>;
  const elapsed = rt ? ctElapsedS(rt, store.clock().now) : 0;
  const counters = w.format === 'amrap' || w.format === 'for_time';
  const outcome = log?.outcome?.ct;
  return (
    <>
      <Topbar title="" onBack={onBack} right={v.experimental ? <span className="k-pill" title="Séance composée par le moteur Cross-training en environnement expérimental (valeurs de test, non approuvées).">Beta</span> : undefined} />
      <div className={`k-workout k-ct ${!log && !finished ? 'with-dock' : ''}`}>
        <header className="k-ct-head">
          <div className="k-ct-eyebrow">Cross-training · {formatDate(v.date)}</div>
          <h1 className="k-ct-title">{intent ?? 'Cross-training'}</h1>
          <div className="row wrap"><span className="k-pill accent">{CT_FORMAT_LABELS[w.format] ?? w.format}</span><span className="k-ct-headline num">{headline(w)}</span></div>
          {finished && <span className="k-pill done">✓ {STATUS_LABELS[v.result?.completion ?? 'completed_as_prescribed']}</span>}
        </header>

        {editable && <ClockFace w={w} elapsed={elapsed} paused={rt.runningSince === null} />}

        <section aria-label="Mouvements" className="k-ct-moves">
          <div className="k-ct-moves-title">{w.format === 'emom' ? 'Chaque minute' : w.format === 'for_time' || w.format === 'amrap' ? 'Un tour' : 'Mouvement'}</div>
          <ol className="k-ct-list">
            {w.items.map((it) => (
              <li key={it.itemId} className="k-ct-move">
                <span className="k-ct-move-name">{exerciseLabel(it.exerciseId)}</span>
                <span className="k-ct-move-dose num">{w.format === 'intervals' ? `${formatChrono(it.quantity.value)} / intervalle` : doseLabel(it.quantity)}{it.loadKg !== undefined ? ` · ${String(it.loadKg)} kg` : ''}</span>
              </li>
            ))}
          </ol>
        </section>

        {editable && counters && (
          <section aria-label="Progression" className="stack">
            <Stepper label="Tours complets" value={rt.rounds} onChange={(n) => store.apply((s) => recordCtProgress(s, v.requestId, { rounds: n, partialReps: 0 }))} />
            <Stepper label="Répétitions du tour en cours" value={rt.partialReps} onChange={(n) => store.apply((s) => recordCtProgress(s, v.requestId, { partialReps: n }))} />
          </section>
        )}

        {finished && (
          <div className="k-light"><span className="k-light-kind">Résultat</span><span className="k-light-name">{ctResultText(outcome?.result ?? null)}</span><span className="k-light-dose num">{formatChrono(outcome?.elapsedS ?? 0)}</span></div>
        )}

        {editable && (
          <div className="row">
            {rt.runningSince !== null
              ? <button className="k-cta ghost" onClick={() => store.apply((s, c) => controlCtTimer(s, c, v.requestId, 'pause'))}>Pause</button>
              : <button className="k-cta" onClick={() => store.apply((s, c) => controlCtTimer(s, c, v.requestId, 'resume'))}>Reprendre</button>}
          </div>
        )}
        {editable && <button className="k-cta ghost" onClick={() => setFinishing(true)}>Terminer la séance</button>}
        {!log && !finished && <div className="k-dock"><button className="k-cta" onClick={() => store.apply((s, c) => startProgrammeSession(s, c, v.requestId))}>Commencer la séance</button></div>}
      </div>
      {finishing && editable && (
        <CtFinishSheet w={w} elapsed={elapsed} rounds0={rt.rounds} reps0={rt.partialReps} onCancel={() => setFinishing(false)} onSubmit={(f) => {
          if (store.apply((s, c) => finishProgrammeSession(s, c, { requestId: v.requestId, ...f }))) setFinishing(false);
        }} />
      )}
    </>
  );
}
