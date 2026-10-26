/**
 * KAIRO Design System — écran séance Musculation (présentation uniquement).
 * Données : prescription du moteur (`ProgrammeSessionView`) et saisies persistées (`log`), affichées telles quelles.
 * Actions : déléguées aux transitions app-core fournies par l'écran (`onRecord`, `onTogglePain`, `onEffort`) ; aucune prescription,
 * série, RIR, charge ni repos n'est calculé ou modifié ici.
 */
import { useState } from 'react';
import { approxMinutes, exerciseLabel, intensityLabel, setKindLabel } from '@hybridsport/app-core';
import type { ProgrammeSessionView, SessionItem, SetLog, SetPrescription } from '@hybridsport/app-core';
import { BLOCK_LABELS } from '../screens/Session.js';

type Block = ProgrammeSessionView['session']['blocks'][number];
export type SetsItem = SessionItem & { prescription: Extract<SessionItem['prescription'], { type: 'sets' }> };
const LIGHT_BLOCKS: readonly Block['kind'][] = ['warmup', 'cooldown'];
export const isSets = (it: SessionItem): it is SetsItem => it.prescription.type === 'sets';
const two = (n: number): string => String(n).padStart(2, '0');
/** Repos prescrit au format chrono (m:ss). */
const clockOf = (s: number): string => `${String(Math.floor(s / 60))}:${two(s % 60)}`;
const repsTarget = (r: SetPrescription['reps']): string => (typeof r === 'number' ? String(r) : `${String(r.min)}–${String(r.max)}`);

export interface StrengthWorkoutProps {
  readonly v: ProgrammeSessionView;
  readonly title: string;
  readonly eyebrow: string;
  readonly editable: boolean;
  readonly onRecord: (item: SessionItem, index: number, x: { done: boolean; reps?: number; loadKg?: number }) => void;
  readonly onTogglePain: (itemId: string) => void;
  /** S5 — effort observé (répétitions en réserve) de la dernière série validée ; `null` = effacer (effort inconnu). */
  readonly onEffort?: (itemId: string, setIndex: number, rir: number | null) => void;
  /** P1 — matériel indisponible : substitut validé par Strength ou refus explicite (app-core). */
  readonly onUnavailable?: (itemId: string) => void;
}

/** Ligne de série : SÉRIE 1 · REPS · KG · ○ — la valeur réellement saisie reste toujours lisible. */
export function SetLine({ set, label, saved, editable, current = false, onRecord }: {
  set: SetPrescription; label: string; saved: SetLog | undefined; editable: boolean;
  /** RC5.4 — série « en cours » (prochaine à faire de l'exercice courant) : état indépendant du TYPE de série. */
  current?: boolean;
  onRecord: (x: { done: boolean; reps?: number; loadKg?: number }) => void;
}) {
  const prescribedKg = set.intensity?.mode === 'load' ? set.intensity.kg : set.intensity?.mode === 'percent_of_reference' ? set.intensity.kgRounded : undefined;
  // Pré-remplissage : uniquement ce que le moteur a PRESCRIT exactement (reps fixes, charge prescrite) ; une plage jamais.
  const [reps, setReps] = useState<string>(saved?.reps !== undefined ? String(saved.reps) : typeof set.reps === 'number' ? String(set.reps) : '');
  const [kg, setKg] = useState<string>(saved?.loadKg !== undefined ? String(saved.loadKg) : prescribedKg !== undefined ? String(prescribedKg) : '');
  const done = saved?.done === true;
  const repsN = reps === '' ? undefined : Number(reps);
  const kgN = kg === '' ? undefined : Number(kg);
  const valid = repsN !== undefined && Number.isInteger(repsN) && repsN >= 0 && (kgN === undefined || (Number.isFinite(kgN) && kgN >= 0));
  const toggle = () => onRecord(done
    ? { done: false, ...(repsN !== undefined ? { reps: repsN } : {}), ...(kgN !== undefined ? { loadKg: kgN } : {}) }
    : { done: true, reps: repsN ?? 0, ...(kgN !== undefined ? { loadKg: kgN } : {}) });
  const warm = set.kind === 'rampup';
  const target = [`obj. ${repsTarget(set.reps)}`, set.optional ? 'facultative' : '', set.kind !== 'working' && !warm && set.kind !== 'backoff' ? setKindLabel(set.kind) : ''].filter(Boolean).join(' · ');
  const state = done ? 'done' : current && editable ? 'current' : 'todo';
  return (
    <div className={`k-set ${warm ? 'warm' : ''} ${done ? 'done' : ''} ${state === 'current' ? 'now' : ''}`} data-set-state={state} data-set-kind={set.kind} {...(state === 'current' ? { 'aria-current': 'step' as const } : {})}>
      <div className="k-set-label"><b>{state === 'current' ? <span className="k-set-now" aria-hidden="true">▸ </span> : null}{label}</b><span>{state === 'current' ? 'en cours · ' : ''}{target}</span></div>
      <label className="k-field">
        <input aria-label="Répétitions réalisées" inputMode="numeric" placeholder={typeof set.reps === 'number' ? '—' : repsTarget(set.reps)} value={reps} disabled={!editable || done} onChange={(e) => setReps(e.target.value.replace(/[^0-9]/g, ''))} />
        <small>REPS</small>
      </label>
      <label className="k-field">
        <input aria-label="Charge (kg)" inputMode="decimal" placeholder="—" value={kg} disabled={!editable || done} onChange={(e) => setKg(e.target.value.replace(',', '.').replace(/[^0-9.]/g, ''))} />
        <small>KG</small>
      </label>
      <button className={`k-check ${done ? 'on' : ''}`} aria-label={done ? 'Décocher la série' : 'Cocher la série'} aria-pressed={done} disabled={!editable || (!done && !valid)} onClick={toggle}>✓</button>
      {editable && !done && repsN === undefined && <small className="k-set-hint" data-reps-required>Saisissez les répétitions réalisées pour valider la série{typeof set.reps === 'number' ? '' : ` (objectif ${repsTarget(set.reps)})`}.</small>}
    </div>
  );
}

/**
 * RC5.4 — PHASES d'un exercice, lues sur le TYPE de série prescrit par le moteur (aucune série recalculée) : montée en
 * charge (`rampup`, jamais comptée comme série effective), travail (`working`, `top_set`, `amrap`), retour en charge
 * (`backoff`, seulement s'il est prescrit). Les indices d'origine sont conservés (saisies et validation inchangées).
 */
export type SetPhase = 'warmup' | 'work' | 'backoff';
export const phaseOf = (s: SetPrescription): SetPhase => (s.kind === 'rampup' ? 'warmup' : s.kind === 'backoff' ? 'backoff' : 'work');
export function setPhases(sets: readonly SetPrescription[]): { phase: SetPhase; indices: number[] }[] {
  const out: { phase: SetPhase; indices: number[] }[] = [];
  sets.forEach((s, i) => { const ph = phaseOf(s); const last = out.at(-1); if (last?.phase === ph) last.indices.push(i); else out.push({ phase: ph, indices: [i] }); });
  return out;
}
const PHASE_TITLES: Readonly<Record<SetPhase, string>> = { warmup: 'Montée en charge', work: 'Séries de travail', backoff: 'Retour en charge (back-off)' };
const PHASE_NOTES: Readonly<Record<SetPhase, string>> = { warmup: 'approche · hors volume et progression', work: 'comptent pour la progression', backoff: 'charge réduite après le travail' };

/**
 * RC5.4 — adaptation FIABLE d'un exercice : changements calculés au démarrage par le contrôle avant séance et persistés
 * avec la séance (`sets:<ex>:3>2`, `rir:<ex>:2>3`, `added:<ex>`). Texte d'explication, ou null si l'exercice est inchangé.
 */
export function adaptationText(changes: readonly string[], exerciseId: string): string | null {
  const parts = changes.flatMap((c) => {
    const [kind, ex, delta] = c.split(':');
    if (ex !== exerciseId) return [];
    const [a, b] = (delta ?? '').split('>');
    if (kind === 'sets') return [`${String(a)} → ${String(b)} séries de travail`];
    if (kind === 'rir') return [`effort visé : ${String(a)} → ${String(b)} reps en réserve`];
    if (kind === 'added') return ['exercice ajouté'];
    return [];
  });
  return parts.length > 0 ? `Adaptée au contrôle avant séance : ${parts.join(' ; ')}.` : null;
}

function setLabels(sets: readonly SetPrescription[]): string[] {
  let warm = 0;
  let work = 0;
  let back = 0;
  return sets.map((s) => (s.kind === 'rampup' ? `Montée ${String(++warm)}` : s.kind === 'backoff' ? `Back-off ${String(++back)}` : `Série ${String(++work)}`));
}

// technical-constant: échelle de saisie des répétitions en réserve proposée (valeurs EXACTES, aucune borne « + »)
const RIR_CHOICES = [0, 1, 2, 3, 4, 5] as const;
const targetRirOf = (s: SetPrescription | undefined): number | undefined => {
  const e = s?.intensity && 'effort' in s.intensity ? s.intensity.effort : undefined;
  return e && 'rir' in e ? e.rir : s?.rir;
};

/**
 * S5 — Effort observé : répétitions en réserve de la DERNIÈRE série validée de l'exercice (ce que lit le moteur), en
 * une rangée de pastilles, facultatif. Aucune pastille = effort inconnu (jamais 0). Re-toucher la pastille choisie
 * efface la saisie. Indépendant du chrono : la saisie n'enregistre aucune série.
 */
export function EffortRow({ name, setLabel, setIndex, itemId, target, value, editable, onEffort }: {
  name: string; setLabel: string; setIndex: number; itemId: string; target: number | undefined; value: number | undefined; editable: boolean;
  onEffort: (itemId: string, setIndex: number, rir: number | null) => void;
}) {
  return (
    <div className="k-effort" role="group" aria-label={`Répétitions en réserve, ${name}, ${setLabel}`}>
      <div className="k-effort-label">
        <b>Reps en réserve</b>
        <span>{setLabel}{target !== undefined ? ` · cible ${String(target)}` : ''} · facultatif</span>
      </div>
      <div className="k-effort-chips">
        {RIR_CHOICES.map((n) => (
          <button key={n} type="button" className={`chip ${value === n ? 'on' : ''}`} aria-pressed={value === n} aria-label={`${String(n)} répétition${n > 1 ? 's' : ''} en réserve`} disabled={!editable}
            onClick={() => onEffort(itemId, setIndex, value === n ? null : n)}>{n}</button>
        ))}
      </div>
    </div>
  );
}

/**
 * P1 — après une série validée, la série suivante à faire est amenée au-dessus du chrono de repos flottant (marge de
 * défilement `.k-set`), jamais laissée sous lui. Affichage seulement.
 */
function revealNextSet(): void {
  requestAnimationFrame(() => {
    const next = [...document.querySelectorAll('.k-set:not(.done)')].find((x) => x.querySelector('.k-check') !== null);
    next?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  });
}

/** Carte exercice : nom dominant ; consignes et douleur en second plan. */
export function ExerciseCard({ number, item, block, log, editable, current, adaptation = null, onRecord, onTogglePain, onEffort, onUnavailable }: {
  number: number; item: SetsItem; block: Block; log: ProgrammeSessionView['log']; editable: boolean; current: boolean;
  /** RC5.4 — explication de l'adaptation de cet exercice (contrôle avant séance), null s'il est inchangé. */
  adaptation?: string | null;
  onRecord: StrengthWorkoutProps['onRecord']; onTogglePain: (itemId: string) => void; onEffort?: StrengthWorkoutProps['onEffort']; onUnavailable?: StrengthWorkoutProps['onUnavailable'];
}) {
  const sets = item.prescription.sets;
  const working = sets.filter((s) => s.kind !== 'rampup');
  const first = working[0] ?? sets[0];
  const labels = setLabels(sets);
  const saved = (i: number) => log?.sets.find((x) => x.itemId === item.id && x.setIndex === i);
  const complete = sets.every((_, i) => saved(i)?.done === true);
  const painful = log?.painItems.includes(item.id) === true;
  // P1 — dernier remplacement de cet exercice (matériel indisponible) : substitut validé, ou refus explicite.
  const swap = (log?.swaps ?? []).filter((x) => x.itemId === item.id).at(-1);
  const refused = swap !== undefined && swap.substituteId === undefined;
  const anyDone = sets.some((_, i) => saved(i)?.done === true);
  const name = exerciseLabel(item.exerciseId);
  const effort = first ? intensityLabel(first) : '';
  // Dernière série de TRAVAIL validée : celle dont l'effort est lu par le moteur.
  const lastDone = sets.map((x, i) => ({ x, i })).filter(({ x, i }) => x.kind !== 'rampup' && x.optional !== true && saved(i)?.done === true).at(-1);
  const savedRir = lastDone ? saved(lastDone.i)?.rir : undefined;
  // RC5.4 — série « en cours » : première série non validée de l'exercice courant.
  const nextIdx = sets.findIndex((_, i) => saved(i)?.done !== true);
  const notes = [
    effort ? `Intensité : ${effort}.` : '',
    item.refs?.prescriptionSource === 'calibration' ? 'Première fois : choisissez une charge qui respecte l’intensité indiquée.' : '',
    // Substituts DIRECTS validés par le moteur Strength (contrat de substitution) : affichés tels quels, jamais calculés ici.
    alternativesText(item.alternatives ?? []),
  ].filter(Boolean);
  return (
    <section id={`ex-${item.id}`} className={`k-ex ${current ? 'current' : ''} ${complete ? 'complete' : ''}`} aria-label={`Exercice ${two(number)} : ${name}`}>
      <div className="k-ex-head">
        <span className="k-ex-num">{two(number)}</span>
        <div style={{ minWidth: 0 }}>
          <h2 className="k-ex-name">{name}</h2>
          <div className="k-ex-sub">
            {BLOCK_LABELS[block.kind] ?? 'Bloc'}<span className="sep">·</span>{working.length} série{working.length > 1 ? 's' : ''}
            {first && first.restAfterS > 0 ? <><span className="sep">·</span>repos {clockOf(first.restAfterS)}</> : null}
            {block.format === 'sets' && block.grouping !== 'straight' ? <><span className="sep">·</span>{block.grouping === 'superset' ? 'superset' : 'circuit'}</> : null}
          </div>
        </div>
      </div>
      {swap?.substituteId && <div className="small" data-swap="substituted">Remplace {exerciseLabel(swap.fromExerciseId)} (matériel indisponible) · même séries et répétitions, charge à choisir selon l’effort indiqué.</div>}
      {refused && <div className="small" role="status" data-swap="refused">Matériel indisponible : aucun exercice de remplacement validé par KAIRO. Passez cet exercice ; la séance sera enregistrée comme adaptée.</div>}
      <div className="k-sets">
        {setPhases(sets).map(({ phase, indices }) => (
          <div key={`${item.id}.${phase}.${String(indices[0])}`} className={`k-phase ${phase}`} data-phase={phase} role="group" aria-label={`${PHASE_TITLES[phase]}, ${name}`}>
            <div className="k-phase-head">
              <b>{PHASE_TITLES[phase]}</b>
              <span>{indices.length} série{indices.length > 1 ? 's' : ''} · {PHASE_NOTES[phase]}</span>
              {phase === 'work' && adaptation && <span className="k-phase-tag" data-adapted-tag>Adaptée</span>}
            </div>
            {phase === 'work' && adaptation && <div className="k-phase-adapt" data-adapted>{adaptation}</div>}
            {indices.map((i) => {
              const set = sets[i] as SetPrescription;
              return <SetLine key={`${item.id}.${String(i)}`} set={set} label={labels[i] ?? ''} saved={saved(i)} editable={editable} current={current && i === nextIdx} onRecord={(x) => { onRecord(item, i, x); if (x.done) revealNextSet(); }} />;
            })}
          </div>
        ))}
      </div>
      {lastDone && onEffort && (editable || savedRir !== undefined) && (
        <EffortRow name={name} setLabel={labels[lastDone.i] ?? ''} setIndex={lastDone.i} itemId={item.id} target={targetRirOf(lastDone.x)} value={savedRir} editable={editable} onEffort={onEffort} />
      )}
      {(notes.length > 0 || editable) && (
        <div className="k-ex-foot">
          {notes.length > 0 ? (
            <details className="k-details">
              <summary>Consignes</summary>
              <ul>{notes.map((n) => <li key={n}>{n}</li>)}</ul>
            </details>
          ) : <span />}
          <span className="row wrap" style={{ gap: 12 }}>
            {editable && onUnavailable && !anyDone && !refused && <button className="k-link" aria-label={`Matériel indisponible pour ${name}`} onClick={() => onUnavailable(item.id)}>Matériel indisponible</button>}
            {editable && <button className="k-link" aria-pressed={painful} aria-label={`Douleur sur ${name}`} onClick={() => onTogglePain(item.id)}>{painful ? 'Douleur signalée' : 'Signaler une douleur'}</button>}
          </span>
        </div>
      )}
    </section>
  );
}

/** Bloc léger (échauffement, retour au calme) : une ligne compacte par élément. */
function LightBlock({ block }: { block: Block }) {
  return (
    <>
      {block.items.map((it) => {
        const p = it.prescription;
        const dose = p.type === 'mobility' ? `${clockOf(p.seconds)}${p.sides > 1 ? ` × ${String(p.sides)}` : ''}` : p.type === 'sets' ? `${String(p.sets.length)} × ${repsTarget(p.sets[0]?.reps ?? 0)}` : '';
        return (
          <div key={it.id} className="k-light">
            <span className="k-light-kind">{BLOCK_LABELS[block.kind] ?? ''}</span>
            <span className="k-light-name">{exerciseLabel(it.exerciseId)}</span>
            <span className="k-light-dose">{dose}</span>
          </div>
        );
      })}
    </>
  );
}

export function StrengthWorkout({ v, title, eyebrow, editable, onRecord, onTogglePain, onEffort, onUnavailable }: StrengthWorkoutProps) {
  const { session, log } = v;
  const main = session.blocks.filter((b) => !LIGHT_BLOCKS.includes(b.kind)).flatMap((b) => b.items.filter(isSets).map((item) => ({ block: b, item })));
  // Séries des exercices (hors échauffement / retour au calme, comme le contrat d'exécution).
  const allSets = main.flatMap(({ item }) => item.prescription.sets.map((_, i) => ({ id: item.id, i })));
  const isDone = (id: string, i: number) => log?.sets.some((x) => x.itemId === id && x.setIndex === i && x.done) === true;
  const doneCount = allSets.filter((x) => isDone(x.id, x.i)).length;
  const exDone = (it: SetsItem) => it.prescription.sets.every((_, i) => isDone(it.id, i));
  const currentIdx = log ? main.findIndex(({ item }) => !exDone(item)) : -1;
  const pct = allSets.length > 0 ? Math.round((doneCount / allSets.length) * 100) : 0;
  const go = (id: string) => document.getElementById(`ex-${id}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  return (
    <>
      <header className="k-head">
        <span className="k-eyebrow">{eyebrow}</span>
        <h1 className="k-title">{title}</h1>
        <div className="k-meta">
          <span>≈ <strong>{approxMinutes(v.estimatedDurationS ?? session.targetDurationS)}</strong></span>
          <span className="sep">·</span>
          <strong>{`${String(doneCount)}/${String(allSets.length)} séries`}</strong>
        </div>
        <div className="k-progress" role="progressbar" aria-label="Séries validées" aria-valuemin={0} aria-valuemax={allSets.length} aria-valuenow={doneCount}><i style={{ width: `${String(pct)}%` }} /></div>
      </header>

      {main.length > 1 && (
        <nav className="k-nav" aria-label="Exercices">
          <span className="k-nav-count">{currentIdx >= 0 ? <><b>{currentIdx + 1}</b> / {main.length}</> : `${String(main.length)} exercices`}</span>
          <div className="k-nav-dots">
            {main.map(({ item }, k) => (
              <button key={item.id} className={`k-nav-dot ${k === currentIdx ? 'current' : ''} ${exDone(item) ? 'done' : ''}`} aria-label={`Aller à l’exercice ${String(k + 1)} : ${exerciseLabel(item.exerciseId)}${exDone(item) ? ', terminé' : ''}`} onClick={() => go(item.id)}>
                {exDone(item) ? '✓' : two(k + 1)}
              </button>
            ))}
          </div>
        </nav>
      )}

      {session.blocks.filter((b) => b.kind === 'warmup').map((b) => <LightBlock key={b.id} block={b} />)}
      {main.map(({ block, item }, k) => (
        <ExerciseCard key={item.id} number={k + 1} item={item} block={block} log={log} editable={editable} current={k === currentIdx} adaptation={adaptationText(v.adaptation?.changes ?? [], item.exerciseId)} onRecord={onRecord} onTogglePain={onTogglePain} {...(onEffort ? { onEffort } : {})} {...(onUnavailable ? { onUnavailable } : {})} />
      ))}
      {session.blocks.filter((b) => !LIGHT_BLOCKS.includes(b.kind)).flatMap((b) => b.items.filter((it) => !isSets(it)).map((it) => ({ b, it }))).map(({ b, it }) => <LightBlock key={it.id} block={{ ...b, items: [it] } as Block} />)}
      {session.blocks.filter((b) => b.kind === 'cooldown').map((b) => <LightBlock key={b.id} block={b} />)}
    </>
  );
}

/** Texte des alternatives reçues du moteur : aucune ⇒ rien ; une ⇒ au singulier ; plusieurs ⇒ « compatibles ». */
export function alternativesText(ids: readonly string[]): string {
  if (ids.length === 0) return '';
  if (ids.length === 1) return `Alternative prévue : ${exerciseLabel(ids[0] ?? '')}.`;
  return `Alternatives prévues (compatibles) : ${ids.map(exerciseLabel).join(', ')}.`;
}
