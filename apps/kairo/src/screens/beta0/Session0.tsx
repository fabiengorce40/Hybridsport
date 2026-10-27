import { REKKA_V2, VisualHeader } from '../../rekka/visual.js';
/**
 * Séance du programme Beta 0. Strength : exercices, séries, saisie réelle (répétitions, charge), validation série par
 * série, chrono de repos automatique (repos PRESCRIT, échéance persistée). Running : type, rôle, structure prescrite
 * par le moteur. Fin de séance : saisie réelle → `finishProgrammeSession` (→ recordSessionExecution).
 */
import { useEffect, useState } from 'react';
import {
  approxMinutes, controlRest, maintainedInterference, startAssessment, durationLabel, exerciseLabel, finishProgrammeSession, recordProgrammeSet, recordProgrammeSetEffort, reportEquipmentUnavailable, runPlayerPosition, runPlayerSteps, selectProgrammeSession, strengthInsightOf, toggleProgrammePainItem,
  adaptationVolumeDeficit,
} from '@hybridsport/app-core';
import type { FinishInput, ProgrammeSessionView, SessionItem, SetPrescription } from '@hybridsport/app-core';
import { useStore } from '../../store.js';
import { RestTimer0 } from '../../RestTimer0.js';
import { formatDate, Notice, sessionDay, startLabel, Topbar } from '../../ui.js';
import { interferenceWarningText, isTest, maintainedText, manualStartText, sessionTitle, qualityVerdictText, roleName, sportName, STATUS_LABELS } from '../../present.js';
import { FieldFeedbackCard } from '../../field/FieldFeedback.js';
import { BLOCK_LABELS, RunStructureView, SetRow } from '../Session.js';
import { StrengthWorkout } from '../../workout/StrengthWorkout.js';
import { CrossTrainingWorkout } from '../../workout/CrossTrainingWorkout.js';
import { AdaptationNotice, useStartFlow } from '../../precheck/PreSessionCheck.js';
import { StrengthInsightPanel } from '../../strength/StrengthInsight.js';
import { HyroxWorkout } from '../../workout/HyroxWorkout.js';
import { ExperimentalBadge } from './common.js';
import { DurationInput } from '../../running/DurationInput.js';
import { durationFromParts, EMPTY_DURATION } from '../../running/duration.js';
import type { DurationParts } from '../../running/duration.js';
import { formatChrono, partsFromSeconds } from '../../running/duration.js';
import { RunPlayer } from '../../running/RunPlayer.js';

type Completion = FinishInput['completion'];
const COMPLETIONS: readonly { id: Completion; label: string }[] = [
  { id: 'completed_as_prescribed', label: 'Tout s’est passé comme prévu' },
  { id: 'modified', label: 'J’ai adapté la séance' },
  { id: 'abandoned', label: 'J’ai arrêté la séance' },
];

/** RC3.5 — repères du lecteur pour la fin de séance : affichés, jamais appliqués sans geste de l'utilisateur. */
interface PlayerSummary { readonly activeS: number; readonly skipped: number; readonly notReached: number; readonly testElapsedS: number | null }
function playerSummary(v: ProgrammeSessionView, now: string): PlayerSummary | null {
  const steps = runPlayerSteps(v);
  const rp = v.log?.runPlayer;
  if (!steps || !rp) return null;
  const pos = runPlayerPosition(rp, steps, now);
  const test = rp.marks.find((m) => m.end === 'distance_validated' && steps.some((x) => x.key === m.key && x.segmentKind === 'steady'));
  return { activeS: pos.activeS, skipped: rp.marks.filter((m) => m.end === 'skipped').length, notReached: steps.length - pos.index, testElapsedS: test ? test.elapsedS : null };
}

/** RC4.1 — difficulté ressentie (Course), vocabulaire du contrat Running ; facultative (absente ⇒ inconnue). */
type RunDifficulty = NonNullable<FinishInput['difficulty']>;
const RUN_DIFFICULTIES: readonly { id: RunDifficulty; label: string }[] = [
  { id: 'EASIER', label: 'Plus facile que prévu' },
  { id: 'AS_EXPECTED', label: 'Comme prévu' },
  { id: 'HARDER', label: 'Plus difficile que prévu' },
  { id: 'MUCH_HARDER', label: 'Beaucoup plus difficile' },
];

function FinishSheet({ v, player, onCancel, onSubmit }: { v: ProgrammeSessionView; player: PlayerSummary | null; onCancel: () => void; onSubmit: (f: Omit<FinishInput, 'requestId'>) => void }) {
  const run = v.sport === 'running';
  const test = isTest(v.archetypeId);
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [pain, setPain] = useState(false);
  const [minutes, setMinutes] = useState('');
  const [km, setKm] = useState('');
  const [testTime, setTestTime] = useState<DurationParts>(EMPTY_DURATION);
  const [difficulty, setDifficulty] = useState<RunDifficulty | null>(null);
  const [tried, setTried] = useState(false);
  const distanceM = km === '' ? undefined : Number(km) * 1000;
  // Temps du TEST : exigé si la séance s'est passée comme prévu, facultatif sinon (validé dès qu'il est saisi).
  const testEntered = testTime.h !== '' || testTime.m !== '' || testTime.s !== '';
  const testR = durationFromParts(testTime, true, 'le temps du test');
  const testTimeS = test && testR.ok ? testR.seconds : undefined;
  const errors: Record<string, string> = {};
  if (!completion) errors.completion = 'Indiquez comment s’est passée la séance.';
  if (run && !(Number(minutes) > 0)) errors.minutes = 'Indiquez la durée réellement courue, en minutes.';
  if (run && distanceM !== undefined && !(Number.isFinite(distanceM) && distanceM > 0)) errors.km = 'Distance illisible.';
  if (run && test && !testR.ok && (testEntered || completion === 'completed_as_prescribed')) errors.test = testR.error;
  const show = (k: string) => (tried ? errors[k] ?? null : null);
  const Err = ({ k }: { k: string }) => (show(k) ? <div className="k-dur-error" role="alert">{show(k)}</div> : null);
  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label="Fin de séance">
      <div className="sheet">
        <h2 style={{ margin: 0 }}>Fin de séance</h2>
        <div className="stack" role="radiogroup" aria-label="Déroulement">
          {COMPLETIONS.map((c) => <button key={c.id} type="button" role="radio" aria-checked={completion === c.id} className={`option ${completion === c.id ? 'on' : ''}`} onClick={() => setCompletion(c.id)}><span className="t">{c.label}</span></button>)}
        </div>
        <Err k="completion" />
        {run && player && (
          <p className="small muted" style={{ margin: 0 }} data-finish-player>
            Lecteur : {formatChrono(player.activeS)} de temps actif (hors pauses){player.skipped > 0 ? ` · ${String(player.skipped)} étape${player.skipped > 1 ? 's' : ''} passée${player.skipped > 1 ? 's' : ''} avant la fin` : ''}{player.notReached > 0 ? ` · ${String(player.notReached)} étape${player.notReached > 1 ? 's' : ''} non atteinte${player.notReached > 1 ? 's' : ''}` : ''}. Repère seulement : indiquez ce que vous avez réellement fait.
          </p>
        )}
        {run && (
          <div className="stack-3">
            <label className="field">Durée totale courue (minutes)<input type="text" inputMode="numeric" pattern="[0-9]*" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/[^0-9]/g, ''))} placeholder="ex. 35" /></label>
            <Err k="minutes" />
            <label className="field">Distance (km, facultatif)<input inputMode="decimal" value={km} onChange={(e) => setKm(e.target.value.replace(',', '.').replace(/[^0-9.]/g, ''))} placeholder="ex. 5.2" /></label>
            <Err k="km" />
            <div className="stack" role="radiogroup" aria-label="Difficulté ressentie (facultatif)" data-run-difficulty>
              <div className="small">Difficulté ressentie <span className="muted">· facultatif</span></div>
              {RUN_DIFFICULTIES.map((d) => (
                <button key={d.id} type="button" role="radio" aria-checked={difficulty === d.id} className={`option ${difficulty === d.id ? 'on' : ''}`} onClick={() => setDifficulty(difficulty === d.id ? null : d.id)}><span className="t">{d.label}</span></button>
              ))}
              <div className="tiny">Sans réponse, la séance est enregistrée « ressenti inconnu » : la course ne progresse pas tant que deux séances ne sont pas déclarées bien tolérées.</div>
            </div>
            {test && (
              <div className="stack">
                <DurationInput label="Temps du test seul" value={testTime} onChange={setTestTime} withHours error={show('test')} />
                {player?.testElapsedS !== null && player?.testElapsedS !== undefined && player.testElapsedS > 0 && (
                  <button type="button" className="btn secondary" onClick={() => setTestTime(partsFromSeconds(player.testElapsedS ?? 0))}>Reprendre le temps du lecteur ({formatChrono(player.testElapsedS)})</button>
                )}
                <div className="tiny">Sans échauffement ni retour au calme{completion === 'completed_as_prescribed' ? '' : ' · facultatif'}.</div>
              </div>
            )}
          </div>
        )}
        <label className="check"><input type="checkbox" checked={pain} onChange={(e) => setPain(e.target.checked)} />J’ai ressenti une douleur</label>
        {pain && <Notice tone="danger">Signaler une douleur suspend la planification automatique jusqu’à ce que vous la déclariez disparue. Consultez un professionnel de santé si elle persiste.</Notice>}
        <div className="row">
          <button className="btn secondary" onClick={onCancel}>Annuler</button>
          <button className="btn primary block" onClick={() => { setTried(true); if (Object.keys(errors).length === 0 && completion) onSubmit({
            completion, pain,
            ...(run ? { run: { realizedDurationS: Number(minutes) * 60, ...(distanceM !== undefined ? { distanceM } : {}), ...(testTimeS !== undefined ? { testTimeS } : {}) } } : {}),
            ...(run && difficulty !== null ? { difficulty } : {}),
          }); }}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

/**
 * Séance du programme (les quatre sports) + FIELD TEST : ligne de qualité expérimentale (Q1, sans code) et, une fois la
 * séance terminée, retour terrain de l'utilisateur (observation seulement, aucune influence sur les moteurs).
 */
export function Session0({ requestId, onBack }: { requestId: string; onBack: () => void }) {
  const store = useStore();
  const v = selectProgrammeSession(store.state, requestId);
  const quality = qualityVerdictText(v?.quality ?? null);
  const done = v?.result !== null && v?.result !== undefined && v.log?.finishedAt !== undefined;
  // Séance pas encore commencée (planifiée ou non placée) : refus métier du jour réel affiché (app-core le fait respecter).
  const assessment = v && !v.log && !v.result ? startAssessment(store.state, store.clock(), requestId) : null;
  // RC4.5 (lot C) — interférence non bloquante : avertissement (maintien possible), jamais présenté comme un refus.
  const warning = assessment?.maintainable ? interferenceWarningText(assessment.conflicts, formatDate) : null;
  const refused = assessment && !assessment.maintainable ? manualStartText(assessment) : null;
  const maintained = v?.log ? maintainedInterference(store.state, requestId) : null;
  return (
    <>
      {REKKA_V2 && v && <VisualHeader title={sportName(v.sport)} sport={v.sport} />}
      <SessionBody requestId={requestId} onBack={onBack} />
      {v && (quality || done || refused || warning || maintained) && (
        <div className="field-after">
          {refused && <Notice tone="warn"><span role="status" data-manual-refused>{refused}</span></Notice>}
          {warning && <Notice tone="warn"><span role="status" data-manual-maintainable>{warning}</span></Notice>}
          {maintained && <p className="tiny" data-interference-maintained style={{ margin: 0 }}>{maintainedText(maintained)}</p>}
          {quality && <p className="tiny muted" data-quality={v.quality ?? undefined} style={{ margin: 0 }}>{quality}</p>}
          {done && <FieldFeedbackCard requestId={requestId} pain={v.log?.outcome?.pain === true} block={v.composition?.scope === 'TRAINING_BLOCK'} />}
        </div>
      )}
    </>
  );
}

function SessionBody({ requestId, onBack }: { requestId: string; onBack: () => void }) {
  const store = useStore();
  // P0 — tout NOUVEAU démarrage passe par le contrôle pré-séance (reprise d'une séance commencée : directe).
  const flow = useStartFlow();
  const [finishing, setFinishing] = useState(false);
  const [, setTick] = useState(0);
  const v = selectProgrammeSession(store.state, requestId);
  const running = v?.log !== null && v?.log !== undefined && v.result === null;
  // Rafraîchissement de l'affichage du temps écoulé (calculé depuis l'horodatage de début, jamais compté).
  useEffect(() => {
    if (!running) return undefined;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [running]);
  if (!v) return <><Topbar title="Séance" onBack={onBack} /><div className="empty">Séance introuvable.</div></>;
  // Cross-training : séance propre au format (prescription persistée lue, jamais de repli Strength ni legacy).
  if (v.sport === 'crosstraining') return <CrossTrainingWorkout v={v} onBack={onBack} />;
  // HYROX : séance propre (enchaînement de la prescription persistée), jamais de repli Strength, Cross-training ou legacy.
  if (v.sport === 'hyrox') return <HyroxWorkout v={v} onBack={onBack} />;
  const { session, log, result } = v;
  const name = sessionTitle({ ...v, strengthVariant: v.sport === 'strength' ? strengthInsightOf(store.state, requestId)?.insight.variant ?? null : null });
  const role = roleName(v.role);
  const test = isTest(v.archetypeId);
  const started = log !== null;
  const finished = result !== null;
  const editable = started && !finished && log.finishedAt === undefined;
  const now = () => store.clock().now;
  // RC3.5 — lecteur de séance Course : étapes de la séance persistée (adaptée au contrôle avant séance le cas échéant).
  const playerSteps = v.sport === 'running' ? runPlayerSteps(v) : null;
  const elapsed = log && !finished ? Math.max(0, Math.floor((Date.parse(now()) - Date.parse(log.startedAt)) / 1000)) : 0;
  const record = (item: SessionItem, _set: SetPrescription | undefined, index: number, x: { done: boolean; reps?: number; loadKg?: number }) =>
    store.apply((s, c) => recordProgrammeSet(s, c, requestId, { itemId: item.id, setIndex: index, ...x }));

  const finishSheet = finishing && (
    <FinishSheet v={v} player={playerSummary(v, now())} onCancel={() => setFinishing(false)} onSubmit={(f) => {
      if (store.apply((s, c) => finishProgrammeSession(s, c, { requestId, ...f }))) setFinishing(false);
    }} />
  );
  const timer = editable && <RestTimer0 rest={log.rest} now={now} onAction={(a) => store.apply((s, c) => controlRest(s, c, requestId, a))} />;

  if (v.sport === 'strength') {
    return (
      <>
        <Topbar title="" onBack={onBack} right={v.experimental ? <span className="k-pill" title="Certaines règles de planification sont encore en cours de validation.">Beta</span> : undefined} />
        <div className={`k-workout ${editable && log.rest ? 'with-timer' : ''} ${!started && !finished ? 'with-dock' : ''}`}>
          <AdaptationNotice v={v} deficit={adaptationVolumeDeficit(store.state, requestId)} />
          <StrengthInsightPanel requestId={requestId} />
          <StrengthWorkout
            v={v} title={name} eyebrow={`${sportName(v.sport)} · ${sessionDay(v)}${editable ? ` · ${String(Math.floor(elapsed / 60))}:${String(elapsed % 60).padStart(2, '0')}` : ''}`} editable={editable}
            onRecord={(item, index, x) => record(item, undefined, index, x)}
            onTogglePain={(itemId) => store.apply((s) => toggleProgrammePainItem(s, requestId, itemId))}
            onEffort={(itemId, setIndex, rir) => store.apply((s) => recordProgrammeSetEffort(s, requestId, itemId, setIndex, rir))}
            onUnavailable={(itemId) => store.apply((s, c) => reportEquipmentUnavailable(s, c, requestId, itemId))}
          />
          {finished && <div className="k-light"><span className="k-pill done">✓ {STATUS_LABELS[result.completion]}</span><span className="k-light-name">Séance terminée</span></div>}
          {!started && !finished && <div className="k-dock"><button className="k-cta" onClick={() => flow.start(requestId)}>{startLabel(v)}</button></div>}
          {editable && <button className="k-cta ghost" onClick={() => setFinishing(true)}>Terminer la séance</button>}
        </div>
        {timer}
        {finishSheet}
        {flow.sheet}
      </>
    );
  }

  return (
    <>
      <Topbar title={name} onBack={onBack} right={v.experimental ? <ExperimentalBadge /> : undefined} />
      <div className={`screen ${editable && log.rest ? 'with-timer' : ''}`}>
        <div className="session-header">
          <span className="small muted">{sportName(v.sport)} · {sessionDay(v)}</span>
          <h1 className="screen-title" style={{ marginTop: 0 }}>{name}</h1>
          <div className="row wrap">
            {test && <span className="badge test">TEST CHRONOMÉTRÉ</span>}
            {role && !test && <span className="badge neutral">{role}</span>}
            {finished && <span className="badge done">✓ {STATUS_LABELS[result.completion]}</span>}
          </div>
          <div className="row wrap small muted num">
            <span>≈ {approxMinutes(v.estimatedDurationS ?? session.targetDurationS)}</span>
            {editable && <span>· {durationLabel(elapsed)} écoulées</span>}
          </div>
          {finished && <Notice><span>Séance terminée{log?.outcome?.run ? ` · ${durationLabel(log.outcome.run.realizedDurationS)}` : ''}.</span></Notice>}
        </div>

        {editable && playerSteps && <RunPlayer v={v} steps={playerSteps} test={test} onFinish={() => setFinishing(true)} />}

        {session.blocks.map((b) => (
          <div key={b.id} className="stack-3">
            <div className="block-title"><div className="section-title">{BLOCK_LABELS[b.kind] ?? 'Bloc'}</div>{b.format === 'sets' && b.grouping !== 'straight' ? <span className="tiny">{b.grouping === 'superset' ? 'Superset' : 'Circuit'}</span> : null}</div>
            {b.items.map((it) => {
              const p = it.prescription;
              const painful = log?.painItems.includes(it.id) === true;
              return (
                <div key={it.id} className="exercise">
                  <div className="exercise-head">
                    <div className="stack" style={{ gap: 4 }}>
                      <h4>{p.type === 'run_structure' ? name : exerciseLabel(it.exerciseId)}</h4>
                      {it.refs?.prescriptionSource === 'calibration' && <span className="tiny">Première fois : choisissez une charge qui respecte l’effort indiqué.</span>}
                    </div>
                    {editable && p.type === 'sets' && <button className={`chip ${painful ? 'on' : ''}`} style={{ minHeight: 44, fontSize: 12 }} onClick={() => store.apply((s) => toggleProgrammePainItem(s, requestId, it.id))} aria-pressed={painful} aria-label={`Douleur sur ${exerciseLabel(it.exerciseId)}`}>Douleur</button>}
                  </div>
                  {p.type === 'sets' && (
                    <>
                      <div className="set-head"><span>Série</span><span>Cible</span><span>Reps</span><span>Kg</span><span /></div>
                      {p.sets.map((set, i) => <SetRow key={`${it.id}.${String(i)}`} item={it} set={set} index={i} workingNumber={p.sets.slice(0, i + 1).filter((x) => x.kind !== 'rampup').length} saved={log?.sets.find((x) => x.itemId === it.id && x.setIndex === i)} editable={editable} onRecord={(idx, x) => record(it, set, idx, x)} />)}
                    </>
                  )}
                  {p.type === 'mobility' && <div className="set"><div className="idx">—</div><div className="target">{durationLabel(p.seconds)}{p.sides > 1 ? ` × ${String(p.sides)} côtés` : ''}</div></div>}
                  {p.type === 'run_structure' && <RunStructureView p={p} archetypeId={v.archetypeId ?? ''} />}
                </div>
              );
            })}
          </div>
        ))}

        {!started && !finished && <button className="btn primary block" onClick={() => flow.start(requestId)}>{startLabel(v)}</button>}
        {editable && !playerSteps && <button className="btn primary block" onClick={() => setFinishing(true)}>Terminer la séance</button>}
      </div>
      {timer}
      {finishSheet}
      {flow.sheet}
    </>
  );
}
