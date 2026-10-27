/**
 * REKKA V2 — Séance Musculation du prototype (lot V2-2B). En-tête : chronomètre GLOBAL de séance et pause ; bandeau
 * de séance ; par exercice, phases titrées (montée en charge cyan, travail jaune-vert, back-off seulement s'il est
 * présent) et séries numérotées dont l'ÉTAT (à faire / en cours / validée) est indépendant du TYPE ; répétitions et
 * charges modifiables. Barre de REPOS distincte, dans le flux (elle ne masque jamais une série).
 * SIMULATION : rien n'est connecté au moteur ni enregistré ; chronomètres et saisies sont locaux à la page.
 */
import { useEffect, useState } from 'react';
import { MaskIcon, UI_ICONS } from '../../src/design/assets.js';
import { Ambience } from '../art/Ambience.js';
import { todayLabel, workout } from '../demo-data.js';
import type { DemoExercise, DemoSet } from '../demo-data.js';

const two = (n: number) => String(n).padStart(2, '0');
const clock = (s: number) => `${String(Math.floor(s / 60))}:${two(s % 60)}`;
const PHASE_TITLES: Readonly<Record<DemoSet['kind'], string>> = { warmup: 'Montée en charge', work: 'Séries de travail', backoff: 'Retour en charge (back-off)' };
const PHASE_NOTES: Readonly<Record<DemoSet['kind'], string>> = { warmup: 'approche · hors volume et progression', work: 'pour la progression', backoff: 'charge réduite' };

function phases(sets: readonly DemoSet[]): { kind: DemoSet['kind']; idx: number[] }[] {
  const out: { kind: DemoSet['kind']; idx: number[] }[] = [];
  sets.forEach((s, i) => { const last = out.at(-1); if (last?.kind === s.kind) last.idx.push(i); else out.push({ kind: s.kind, idx: [i] }); });
  return out;
}

export function Workout({ onBack }: { onBack: () => void }) {
  const [done, setDone] = useState<ReadonlySet<string>>(new Set(['squat.0', 'squat.1', 'squat.2']));
  const [values, setValues] = useState<Readonly<Record<string, { reps: string; kg: string }>>>({});
  const [elapsed, setElapsed] = useState(24 * 60 + 36);
  const [paused, setPaused] = useState(false);
  const [rest, setRest] = useState(90);
  const [restPaused, setRestPaused] = useState(false);
  useEffect(() => {
    const t = setInterval(() => {
      if (!paused) setElapsed((x) => x + 1);
      if (!restPaused) setRest((x) => Math.max(0, x - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [paused, restPaused]);
  const all = workout.exercises.flatMap((e) => e.sets.map((_, i) => `${e.id}.${String(i)}`));
  const current = all.find((k) => !done.has(k));
  const toggle = (k: string) => { setDone((d) => { const n = new Set(d); if (n.has(k)) n.delete(k); else { n.add(k); setRest(90); } return n; }); };
  // La série EN COURS est toujours amenée au-dessus de la barre de repos (marge de défilement réservée en CSS).
  // Calcul explicite (les marges `scroll-margin-*` du CSS réservent l'en-tête et la barre de repos) : `scrollIntoView`
  // en mode `nearest` ne les respecte pas de façon fiable selon le conteneur.
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('.p-set2[aria-current="step"]');
    if (!el || typeof window.scrollBy !== 'function') return;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const below = r.bottom + parseFloat(cs.scrollMarginBottom || '0') - window.innerHeight;
    const above = parseFloat(cs.scrollMarginTop || '0') - r.top;
    if (below > 0) window.scrollBy({ top: below });
    else if (above > 0) window.scrollBy({ top: -above });
  }, [current]);
  const exDone = workout.exercises.filter((e) => e.sets.every((_, i) => done.has(`${e.id}.${String(i)}`))).length;
  return (
    <main aria-label="Séance Musculation" className="p-workout2">
      <header className="p-wk-top">
        <button type="button" className="p-icon-btn" onClick={onBack} aria-label="Retour">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7M8 12h12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="p-wk-clock" data-proto-clock aria-label={`Chronomètre de séance (simulation) ${clock(elapsed)}${paused ? ', séance en pause' : ''}`}>
          <MaskIcon src={UI_ICONS.chrono} className="p-wk-clock-icon" /><span>{paused ? 'En pause' : 'Séance'}</span><b className="r-num">{clock(elapsed)}</b><span>· ≈ {workout.plannedMin} min</span>
        </div>
        <button type="button" className="p-icon-btn round" aria-pressed={paused} onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Reprendre la séance (simulation)' : 'Mettre la séance en pause (simulation)'}>
          {paused ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" /></svg> : <MaskIcon src={UI_ICONS.pause} />}
        </button>
      </header>

      <section className="p-wk-banner" aria-label="Séance">
        <Ambience art="bilan" />
        <div className="p-wk-eyebrow-row"><span className="p-wk-eyebrow">Musculation · {todayLabel}</span><span className="r-badge demo p-wk-tag" data-placeholder-tag>Illustration provisoire</span></div>
        <h1 className="p-wk-title">{workout.title}</h1>
        <span className="r-text-2 r-num">{workout.exercises.length} exercices · {all.length} séries · {done.size} validées</span>
        <div className="p-wk-progress"><div className="r-progress" role="progressbar" aria-label="Séries validées" aria-valuemin={0} aria-valuemax={all.length} aria-valuenow={done.size}><i style={{ width: `${String(Math.round((done.size / all.length) * 100))}%` }} /></div><span className="r-num">{exDone} / {workout.exercises.length}</span></div>
      </section>

      <p className="p-sim-note" role="note">Simulation : saisies et chronomètres non enregistrés, aucun calcul du moteur.</p>

      <div className="p-wk-list">
        {workout.exercises.map((e, n) => <ExerciseCard key={e.id} e={e} n={n + 1} done={done} current={current} values={values} onToggle={toggle} onValue={(k, v) => setValues((x) => ({ ...x, [k]: { ...(x[k] ?? { reps: '', kg: '' }), ...v } }))} />)}
        <button type="button" className="r-btn secondary block">Terminer la séance (simulation)</button>
      </div>

      <div className="p-restbar" role="timer" aria-label={`Repos (simulation) ${clock(rest)}${restPaused ? ', en pause' : ''}`}>
        <MaskIcon src={UI_ICONS.chrono} className="p-restbar-icon" />
        <span className="p-restbar-time"><small>Repos</small><b className="r-num">{two(Math.floor(rest / 60))}:{two(rest % 60)}</b></span>
        <button type="button" className="p-restbar-main" aria-label={restPaused ? 'Reprendre le repos (simulation)' : 'Mettre le repos en pause (simulation)'} onClick={() => setRestPaused((p) => !p)}>
          {restPaused ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" /></svg> : <MaskIcon src={UI_ICONS.pause} />}
        </button>
        <button type="button" className="p-restbar-plus" onClick={() => setRest((r) => r + 10)} aria-label="Ajouter 10 secondes au repos (simulation)">+10 s</button>
      </div>
    </main>
  );
}

function ExerciseCard({ e, n, done, current, values, onToggle, onValue }: {
  e: DemoExercise; n: number; done: ReadonlySet<string>; current: string | undefined; values: Readonly<Record<string, { reps: string; kg: string }>>;
  onToggle: (k: string) => void; onValue: (k: string, v: Partial<{ reps: string; kg: string }>) => void;
}) {
  return (
    <section className="p-ex" aria-label={`Exercice ${two(n)} : ${e.name}`}>
      <div className="p-ex-head">
        <span className="p-ex-num" aria-hidden="true">{two(n)}</span>
        <div className="p-ex-name"><h2>{e.name}</h2><span className="r-text-3">repos {e.rest}</span></div>
      </div>
      <div className="p-ex-muscles" aria-label="Muscles sollicités">{e.muscles.map((m) => <span key={m}>{m}</span>)}</div>
      {phases(e.sets).map((p) => (
        <div key={`${e.id}.${p.kind}`} className="p-phase2" data-phase={p.kind} role="group" aria-label={`${PHASE_TITLES[p.kind]}, ${e.name}`}>
          <div className="p-phase2-head"><b>{PHASE_TITLES[p.kind]}</b><span>{p.idx.length} série{p.idx.length > 1 ? 's' : ''} · {PHASE_NOTES[p.kind]}</span>{p.kind === 'work' && e.adapted && <span className="r-badge" data-adapted-tag>Adaptée</span>}</div>
          {p.kind === 'work' && e.adapted && <div className="p-adapt">{e.adapted}</div>}
          {p.kind === 'backoff' && e.illustrative && <div className="p-adapt" data-illustrative>{e.illustrative}</div>}
          {p.idx.map((i) => {
            const s = e.sets[i] as DemoSet;
            const k = `${e.id}.${String(i)}`;
            const state = done.has(k) ? 'done' : current === k ? 'current' : 'todo';
            const v = values[k];
            return (
              <div key={k} className="r-set p-set2" data-state={state} data-kind={s.kind} {...(state === 'current' ? { 'aria-current': 'step' as const } : {})}>
                <span className="p-set-idx" aria-label={`Série ${String(i + 1)}${state === 'current' ? ', en cours' : state === 'done' ? ', validée' : ''}`}>{i + 1}</span>
                <label className="p-set-field"><input inputMode="numeric" aria-label={`Répétitions, série ${String(i + 1)} (simulation)`} value={v?.reps ?? String(s.reps)} onChange={(ev) => onValue(k, { reps: ev.target.value.replace(/[^0-9]/g, '') })} disabled={state === 'done'} /><small>reps</small></label>
                <label className="p-set-field"><input inputMode="decimal" aria-label={`Charge en kg, série ${String(i + 1)} (simulation)`} value={v?.kg ?? String(s.kg).replace('.', ',')} onChange={(ev) => onValue(k, { kg: ev.target.value.replace(/[^0-9,.]/g, '') })} disabled={state === 'done'} /><small>kg</small></label>
                <button type="button" className="r-set-check" aria-pressed={state === 'done'} aria-label={`${state === 'done' ? 'Décocher' : 'Cocher'} la série ${String(i + 1)}, ${e.name} (simulation)`} onClick={() => onToggle(k)}><MaskIcon src={UI_ICONS.check} /></button>
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}
