/**
 * KAIRO Design System — écran séance Musculation (présentation uniquement).
 * Données : prescription du moteur (`ProgrammeSessionView`) et saisies persistées (`log`), affichées telles quelles.
 * Actions : déléguées aux transitions app-core fournies par l'écran (`onRecord`, `onTogglePain`) ; aucune prescription,
 * série, RIR, charge ni repos n'est calculé ou modifié ici.
 */
import { useState } from 'react';
import { approxMinutes, exerciseLabel, intensityLabel, setKindLabel } from '@hybridsport/app-core';
import type { ProgrammeSessionView, SessionItem, SetLog, SetPrescription } from '@hybridsport/app-core';
import { BLOCK_LABELS } from '../screens/Session.js';

type Block = ProgrammeSessionView['session']['blocks'][number];
type SetsItem = SessionItem & { prescription: Extract<SessionItem['prescription'], { type: 'sets' }> };
const LIGHT_BLOCKS: readonly Block['kind'][] = ['warmup', 'cooldown'];
const isSets = (it: SessionItem): it is SetsItem => it.prescription.type === 'sets';
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
}

/** Ligne de série : SÉRIE 1 · REPS · KG · ○ — la valeur réellement saisie reste toujours lisible. */
export function SetLine({ set, label, saved, editable, onRecord }: {
  set: SetPrescription; label: string; saved: SetLog | undefined; editable: boolean;
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
  const target = [`obj. ${repsTarget(set.reps)}`, set.optional ? 'facultative' : '', set.kind !== 'working' && !warm ? setKindLabel(set.kind) : ''].filter(Boolean).join(' · ');
  return (
    <div className={`k-set ${warm ? 'warm' : ''} ${done ? 'done' : ''}`}>
      <div className="k-set-label"><b>{label}</b><span>{target}</span></div>
      <label className="k-field">
        <input aria-label="Répétitions réalisées" inputMode="numeric" placeholder="—" value={reps} disabled={!editable || done} onChange={(e) => setReps(e.target.value.replace(/[^0-9]/g, ''))} />
        <small>REPS</small>
      </label>
      <label className="k-field">
        <input aria-label="Charge (kg)" inputMode="decimal" placeholder="—" value={kg} disabled={!editable || done} onChange={(e) => setKg(e.target.value.replace(',', '.').replace(/[^0-9.]/g, ''))} />
        <small>KG</small>
      </label>
      <button className={`k-check ${done ? 'on' : ''}`} aria-label={done ? 'Décocher la série' : 'Cocher la série'} aria-pressed={done} disabled={!editable || (!done && !valid)} onClick={toggle}>✓</button>
    </div>
  );
}

function setLabels(sets: readonly SetPrescription[]): string[] {
  let warm = 0;
  let work = 0;
  return sets.map((s) => (s.kind === 'rampup' ? `Montée ${String(++warm)}` : `Série ${String(++work)}`));
}

/** Carte exercice : nom dominant ; consignes et douleur en second plan. */
export function ExerciseCard({ number, item, block, log, editable, current, onRecord, onTogglePain }: {
  number: number; item: SetsItem; block: Block; log: ProgrammeSessionView['log']; editable: boolean; current: boolean;
  onRecord: StrengthWorkoutProps['onRecord']; onTogglePain: (itemId: string) => void;
}) {
  const sets = item.prescription.sets;
  const working = sets.filter((s) => s.kind !== 'rampup');
  const warmups = sets.length - working.length;
  const first = working[0] ?? sets[0];
  const labels = setLabels(sets);
  const saved = (i: number) => log?.sets.find((x) => x.itemId === item.id && x.setIndex === i);
  const complete = sets.every((_, i) => saved(i)?.done === true);
  const painful = log?.painItems.includes(item.id) === true;
  const name = exerciseLabel(item.exerciseId);
  const effort = first ? intensityLabel(first) : '';
  const notes = [
    effort ? `Intensité : ${effort}.` : '',
    warmups > 0 ? `${String(warmups)} série${warmups > 1 ? 's' : ''} de montée avant le travail.` : '',
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
      <div className="k-sets">
        {sets.map((set, i) => <SetLine key={`${item.id}.${String(i)}`} set={set} label={labels[i] ?? ''} saved={saved(i)} editable={editable} onRecord={(x) => onRecord(item, i, x)} />)}
      </div>
      {(notes.length > 0 || editable) && (
        <div className="k-ex-foot">
          {notes.length > 0 ? (
            <details className="k-details">
              <summary>Consignes</summary>
              <ul>{notes.map((n) => <li key={n}>{n}</li>)}</ul>
            </details>
          ) : <span />}
          {editable && <button className="k-link" aria-pressed={painful} aria-label={`Douleur sur ${name}`} onClick={() => onTogglePain(item.id)}>{painful ? 'Douleur signalée' : 'Signaler une douleur'}</button>}
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

export function StrengthWorkout({ v, title, eyebrow, editable, onRecord, onTogglePain }: StrengthWorkoutProps) {
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
        <ExerciseCard key={item.id} number={k + 1} item={item} block={block} log={log} editable={editable} current={k === currentIdx} onRecord={onRecord} onTogglePain={onTogglePain} />
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
