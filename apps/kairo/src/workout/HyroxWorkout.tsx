/**
 * Séance HYROX (H2.5) : projection de la prescription PERSISTÉE (`hrWorkoutOfView`), jamais reconstruite. Une séance
 * HYROX est un ENCHAÎNEMENT : l'écran montre OÙ en est l'athlète, CE QU'IL FAIT MAINTENANT et CE QUI VIENT ENSUITE.
 * Chrono horodaté côté app-core (pause / reprise explicites, survit au rechargement) ; l'affichage se rafraîchit chaque
 * seconde SANS écriture d'état. Time cap = plafond (jamais une cible). Course : distance seule, allure non prescrite.
 * Transitions : aucune durée affichée (inconnue). Résultat structuré validé par le moteur (terminée / time cap / arrêt).
 */
import { useEffect, useState } from 'react';
import { controlHrTimer, exerciseLabel, finishProgrammeSession, HR_ROLE_LABELS, HR_STRUCTURE_LABELS, hrClock, hrElapsedS, hrProgress, hrWorkoutOfView, recordHrLoad, setHrSteps, startProgrammeSession } from '@hybridsport/app-core';
import type { FinishInput, HrStep, HrWorkout, HyroxComponent, ProgrammeSessionView } from '@hybridsport/app-core';
import { useStore } from '../store.js';
import { Notice, sessionDay, startLabel, Topbar } from '../ui.js';
import { STATUS_LABELS } from '../present.js';
import { formatChrono } from '../running/duration.js';

// technical-constant: rafraîchissement de l'AFFICHAGE du chrono (ms), aucune écriture d'état
const TICK_MS = 1000;
// technical-constant: pourcentage (barre de progression)
const PERCENT = 100;

/** Dose dans son unité NATIVE (aucune conversion). */
export function hrDoseLabel(d: HyroxComponent['dose']): string {
  if (d.kind === 'reps') return `${String(d.value)} répétitions`;
  if (d.kind === 'calories') return `${String(d.value)} cal`;
  if (d.kind === 'distance_m') return `${String(d.value)} m`;
  return formatChrono(d.value);
}
const kindLabel = (c: HyroxComponent) => (c.kind === 'run' ? 'Course' : 'Station');
const stepName = (s: HrStep) => (s.component.kind === 'run' ? 'Course' : exerciseLabel(s.component.exerciseId));

/** Résultat enregistré, lisible (la donnée source reste structurée). */
export function hrResultText(result: Readonly<Record<string, unknown>> | null, items: number): string {
  if (!result) return 'Résultat enregistré';
  const n = (k: string) => (typeof result[k] === 'number' ? (result[k] as number) : 0);
  const where = `${String(n('roundsCompleted'))} tour${n('roundsCompleted') > 1 ? 's' : ''} complet${n('roundsCompleted') > 1 ? 's' : ''} + ${String(n('itemsCompletedInRound'))}/${String(items)} étape${items > 1 ? 's' : ''}`;
  if (result.kind === 'completed') return `Terminée en ${formatChrono(n('elapsedS'))}`;
  if (result.kind === 'time_capped') return `Time cap atteint · ${where}`;
  if (result.kind === 'abandoned') return `Arrêtée · ${where}`;
  return 'Résultat enregistré';
}

/** Parcours : chaque étape de la séquence prescrite, état visible (faite / en cours / à venir). */
function Rail({ w, done }: { w: HrWorkout; done: number | null }) {
  return (
    <ol className="k-hr-rail" aria-label="Parcours de la séance">
      {w.steps.map((s) => {
        const state = done === null ? 'todo' : s.index < done ? 'done' : s.index === done ? 'now' : 'todo';
        const roundHead = w.rounds > 1 && s.position === 1;
        return (
          <li key={s.index} className={`k-hr-step ${s.component.kind} ${state}`} aria-current={state === 'now' ? 'step' : undefined}>
            {roundHead && <div className="k-hr-round">Tour {String(s.round)} / {String(w.rounds)}</div>}
            <span className="k-hr-dot" aria-hidden="true">{state === 'done' ? '✓' : s.component.kind === 'run' ? '↗' : '■'}</span>
            <span className="k-hr-step-name">{stepName(s)}</span>
            <span className="k-hr-step-dose num">{hrDoseLabel(s.component.dose)}{s.component.loadKg !== undefined ? ` · ${String(s.component.loadKg)} kg` : ''}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Charge réellement utilisée (station chargée) : saisie, enregistrée à la validation du champ. */
function LoadInput({ c, value, onCommit }: { c: HyroxComponent; value: number | undefined; onCommit: (kg: number | null) => void }) {
  const [text, setText] = useState(value === undefined ? '' : String(value));
  useEffect(() => { setText(value === undefined ? '' : String(value)); }, [value]);
  const commit = () => {
    const t = text.trim().replace(',', '.');
    if (t === '') { if (value !== undefined) onCommit(null); return; }
    const kg = Number(t);
    if (Number.isFinite(kg) && kg > 0 && kg !== value) onCommit(kg);
  };
  return (
    <label className="k-hr-load">
      <span>Charge prévue <b className="num">{String(c.loadKg)} kg</b> · réellement utilisée</span>
      <input inputMode="decimal" aria-label={`Charge réellement utilisée · ${exerciseLabel(c.exerciseId)}`} value={text} placeholder={String(c.loadKg)}
        onChange={(e) => setText(e.target.value.replace(/[^0-9.,]/g, ''))} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
    </label>
  );
}

type Ending = 'completed_as_prescribed' | 'modified' | 'time_cap' | 'abandoned';

/** Fin de séance : seules les issues COHÉRENTES avec la progression enregistrée sont proposées. */
function HrFinishSheet({ finished, capReached, onCancel, onSubmit }: { finished: boolean; capReached: boolean; onCancel: () => void; onSubmit: (f: Omit<FinishInput, 'requestId'>) => void }) {
  const [ending, setEnding] = useState<Ending | null>(null);
  const [pain, setPain] = useState(false);
  const options: { id: Ending; label: string }[] = finished
    ? [{ id: 'completed_as_prescribed', label: 'Tout s’est passé comme prévu' }, { id: 'modified', label: 'J’ai adapté la séance (charges, mouvements)' }, { id: 'abandoned', label: 'J’ai arrêté la séance' }]
    : [...(capReached ? [{ id: 'time_cap' as const, label: 'Time cap atteint avant la fin' }] : []), { id: 'abandoned', label: 'J’ai arrêté la séance' }];
  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label="Fin de séance">
      <div className="sheet">
        <h2 style={{ margin: 0 }}>Fin de séance</h2>
        {!finished && <p className="small muted" style={{ margin: 0 }}>Toutes les étapes ne sont pas validées : la séance est enregistrée avec votre progression réelle{capReached ? '' : ' (le time cap n’est pas atteint)'}.</p>}
        <div className="stack" role="radiogroup" aria-label="Déroulement">
          {options.map((x) => <button key={x.id} type="button" role="radio" aria-checked={ending === x.id} className={`option ${ending === x.id ? 'on' : ''}`} onClick={() => setEnding(x.id)}><span className="t">{x.label}</span></button>)}
        </div>
        <label className="check"><input type="checkbox" checked={pain} onChange={(e) => setPain(e.target.checked)} />J’ai ressenti une douleur</label>
        {pain && <Notice tone="danger">Signaler une douleur suspend la planification automatique jusqu’à ce que vous la déclariez disparue. Consultez un professionnel de santé si elle persiste.</Notice>}
        <div className="row">
          <button className="btn secondary" onClick={onCancel}>Annuler</button>
          <button className="btn primary block" disabled={ending === null} onClick={() => {
            if (!ending) return;
            onSubmit({ completion: ending === 'time_cap' ? 'modified' : ending, pain, hr: { timeCapReached: ending === 'time_cap' } });
          }}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

export function HyroxWorkout({ v, onBack }: { v: ProgrammeSessionView; onBack: () => void }) {
  const store = useStore();
  const [finishing, setFinishing] = useState(false);
  const [, setTick] = useState(0);
  const w = hrWorkoutOfView(v);
  const log = v.log;
  const rt = log?.hr;
  const finished = v.result !== null;
  const editable = log !== null && !finished && log.finishedAt === undefined && rt !== undefined;
  const runningClock = editable && rt.runningSince !== null;
  useEffect(() => {
    if (!runningClock) return undefined;
    const t = setInterval(() => setTick((x) => x + 1), TICK_MS);
    return () => clearInterval(t);
  }, [runningClock]);
  const role = v.archetypeId ? HR_ROLE_LABELS[v.archetypeId]?.title : undefined;
  if (!w) return <><Topbar title="HYROX" onBack={onBack} /><div className="empty">Séance HYROX illisible : elle n’est pas reconstruite. Exportez vos données pour diagnostic.</div></>;
  const elapsed = rt ? hrElapsedS(rt, store.clock().now) : 0;
  const clock = hrClock(w, elapsed);
  const prog = hrProgress(w, rt?.steps ?? 0);
  const cur = prog.current;
  const loadOf = (itemId: string) => rt?.loads.find((l) => l.itemId === itemId)?.kg;
  const outcome = log?.outcome?.hr;
  return (
    <>
      <Topbar title="" onBack={onBack} right={v.experimental ? <span className="k-pill" title="Séance composée par le moteur HYROX en environnement expérimental (valeurs de test, non approuvées).">Beta</span> : undefined} />
      <div className={`k-workout k-hr ${!log && !finished ? 'with-dock' : ''}`}>
        <header className="k-ct-head">
          <div className="k-ct-eyebrow">HYROX · {sessionDay(v)}</div>
          <h1 className="k-ct-title">{role ?? 'HYROX'}</h1>
          <div className="row wrap">
            <span className="k-pill accent">{HR_STRUCTURE_LABELS[w.structure] ?? 'Séance HYROX'}</span>
            {w.rounds > 1 && <span className="k-pill num">{String(w.rounds)} tours</span>}
            <span className="k-pill num">Time cap {formatChrono(w.timeCapS)}</span>
          </div>
          {finished && <span className="k-pill done">✓ {STATUS_LABELS[v.result?.completion ?? 'completed_as_prescribed']}</span>}
        </header>

        {editable && (
          <div className={`k-ct-clock ${clock.capReached ? 'over' : ''}`} role="timer" aria-label="Chrono de la séance" aria-live="off">
            <div className="k-ct-clock-label">{rt.runningSince === null ? 'EN PAUSE' : clock.capReached ? 'TIME CAP ATTEINT' : 'TEMPS ÉCOULÉ'}</div>
            <div className="k-ct-clock-big num">{formatChrono(clock.elapsedS)}</div>
            <div className="k-ct-clock-sub num">{clock.capReached ? 'Enregistrez votre progression réelle' : `Time cap ${formatChrono(w.timeCapS)} · plafond, pas un objectif`}</div>
          </div>
        )}

        {editable && (
          <section aria-label="Étape en cours" className="stack">
            <div className="k-progress" aria-hidden="true"><i style={{ width: `${String(Math.round((prog.done / prog.total) * PERCENT))}%` }} /></div>
            <div className="k-hr-count num" aria-live="polite">{prog.finished ? `Séquence terminée · ${String(prog.total)} / ${String(prog.total)} étapes` : `Étape ${String(prog.done + 1)} / ${String(prog.total)}${w.rounds > 1 ? ` · tour ${String(prog.round)} / ${String(w.rounds)}` : ''}`}</div>
            {cur ? (
              <div className={`k-hr-now ${cur.component.kind}`} aria-label="Maintenant">
                <div className="k-hr-now-kind">Maintenant · {kindLabel(cur.component)}</div>
                <div className="k-hr-now-name">{stepName(cur)}</div>
                <div className="k-hr-now-dose num">{hrDoseLabel(cur.component.dose)}{cur.component.loadKg !== undefined ? ` · ${String(cur.component.loadKg)} kg prévus` : ''}</div>
                {cur.component.kind === 'run' && <div className="k-hr-now-note">Allure libre : aucune allure n’est prescrite{cur.component.runContext === 'after_station' ? ' · course après station' : ' · course au départ'}</div>}
                {cur.component.kind === 'station' && cur.component.loadKg !== undefined && (
                  <LoadInput c={cur.component} value={loadOf(cur.component.itemId)} onCommit={(kg) => store.apply((s) => recordHrLoad(s, v.requestId, cur.component.itemId, kg))} />
                )}
              </div>
            ) : <div className="k-hr-now done"><div className="k-hr-now-name">Toutes les étapes sont validées</div><div className="k-hr-now-note">Terminez la séance pour l’enregistrer.</div></div>}
            {prog.next && <div className="k-light"><span className="k-light-kind">Ensuite · {kindLabel(prog.next.component)}</span><span className="k-light-name">{stepName(prog.next)}</span><span className="k-light-dose num">{hrDoseLabel(prog.next.component.dose)}</span></div>}
            <div className="row">
              <button className="k-cta ghost k-hr-back" disabled={prog.done === 0} onClick={() => store.apply((s) => setHrSteps(s, v.requestId, prog.done - 1))} aria-label="Revenir à l’étape précédente">Retour</button>
              <button className="k-cta" disabled={prog.finished} onClick={() => store.apply((s) => setHrSteps(s, v.requestId, prog.done + 1))}>{prog.next ? 'Étape faite → suivante' : 'Dernière étape faite'}</button>
            </div>
            <p className="tiny" style={{ margin: 0 }}>Transitions non chronométrées : passez à l’étape suivante quand vous y êtes.</p>
          </section>
        )}

        {finished && (
          <section className="stack" aria-label="Résultat">
            <div className="k-light"><span className="k-light-kind">Résultat</span><span className="k-light-name">{hrResultText(outcome?.result ?? null, w.components.length)}</span><span className="k-light-dose num">{formatChrono(outcome?.elapsedS ?? 0)}</span></div>
            {(outcome?.performedLoads ?? []).map((l) => {
              const c = w.components.find((x) => x.itemId === l.itemId);
              return c ? <div key={l.itemId} className="small muted num">{exerciseLabel(c.exerciseId)} : {String(c.loadKg)} kg prévus → {String(l.kg)} kg réalisés</div> : null;
            })}
          </section>
        )}

        <section aria-label={log ? 'Parcours' : 'Programme de la séance'}>
          <div className="k-ct-moves-title">{w.rounds > 1 ? `Parcours · ${String(w.rounds)} tours` : 'Parcours'}</div>
          <Rail w={w} done={editable ? prog.done : null} />
        </section>

        {editable && (
          <div className="row">
            {rt.runningSince !== null
              ? <button className="k-cta ghost" onClick={() => store.apply((s, c) => controlHrTimer(s, c, v.requestId, 'pause'))}>Pause</button>
              : <button className="k-cta" onClick={() => store.apply((s, c) => controlHrTimer(s, c, v.requestId, 'resume'))}>Reprendre</button>}
          </div>
        )}
        {editable && <button className="k-cta ghost" onClick={() => setFinishing(true)}>Terminer la séance</button>}
        {!log && !finished && <div className="k-dock"><button className="k-cta" onClick={() => store.apply((s, c) => startProgrammeSession(s, c, v.requestId))}>{startLabel(v)}</button></div>}
      </div>
      {finishing && editable && (
        <HrFinishSheet finished={prog.finished} capReached={clock.capReached} onCancel={() => setFinishing(false)} onSubmit={(f) => {
          if (store.apply((s, c) => finishProgrammeSession(s, c, { requestId: v.requestId, ...f }))) setFinishing(false);
        }} />
      )}
    </>
  );
}
