/**
 * Séance du programme Beta 0. Strength : exercices, séries, saisie réelle (répétitions, charge), validation série par
 * série, chrono de repos automatique (repos PRESCRIT, échéance persistée). Running : type, rôle, structure prescrite
 * par le moteur. Fin de séance : saisie réelle → `finishProgrammeSession` (→ recordSessionExecution).
 */
import { useEffect, useState } from 'react';
import {
  approxMinutes, controlRest, durationLabel, exerciseLabel, finishProgrammeSession, recordProgrammeSet, selectProgrammeSession, startProgrammeSession, toggleProgrammePainItem,
} from '@hybridsport/app-core';
import type { FinishInput, ProgrammeSessionView, SessionItem, SetPrescription } from '@hybridsport/app-core';
import { useStore } from '../../store.js';
import { RestTimer0 } from '../../RestTimer0.js';
import { formatDate, Notice, Topbar } from '../../ui.js';
import { isTest, roleName, sessionName, sportName, STATUS_LABELS } from '../../present.js';
import { BLOCK_LABELS, RunStructureView, SetRow } from '../Session.js';
import { StrengthWorkout } from '../../workout/StrengthWorkout.js';
import { ExperimentalBadge } from './common.js';

type Completion = FinishInput['completion'];
const COMPLETIONS: readonly { id: Completion; label: string }[] = [
  { id: 'completed_as_prescribed', label: 'Tout s’est passé comme prévu' },
  { id: 'modified', label: 'J’ai adapté la séance' },
  { id: 'abandoned', label: 'J’ai arrêté la séance' },
];

function FinishSheet({ v, onCancel, onSubmit }: { v: ProgrammeSessionView; onCancel: () => void; onSubmit: (f: Omit<FinishInput, 'requestId'>) => void }) {
  const run = v.sport === 'running';
  const test = isTest(v.archetypeId);
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [pain, setPain] = useState(false);
  const [minutes, setMinutes] = useState('');
  const [km, setKm] = useState('');
  const [testMin, setTestMin] = useState('');
  const [testSec, setTestSec] = useState('');
  const distanceM = km === '' ? undefined : Number(km) * 1000;
  const testTimeS = testMin === '' && testSec === '' ? undefined : Number(testMin || '0') * 60 + Number(testSec || '0');
  const testOk = !test || completion !== 'completed_as_prescribed' || (testTimeS !== undefined && testTimeS > 0 && Number(testSec || '0') < 60);
  const runOk = !run || (Number(minutes) > 0 && (distanceM === undefined || (Number.isFinite(distanceM) && distanceM > 0)) && testOk);
  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label="Fin de séance">
      <div className="sheet">
        <h2 style={{ margin: 0 }}>Fin de séance</h2>
        <div className="stack" role="radiogroup" aria-label="Déroulement">
          {COMPLETIONS.map((c) => <button key={c.id} type="button" role="radio" aria-checked={completion === c.id} className={`option ${completion === c.id ? 'on' : ''}`} onClick={() => setCompletion(c.id)}><span className="t">{c.label}</span></button>)}
        </div>
        {run && (
          <div className="stack-3">
            <label className="field">Durée totale courue (minutes)<input inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/[^0-9]/g, ''))} placeholder="ex. 35" /></label>
            <label className="field">Distance (km, facultatif)<input inputMode="decimal" value={km} onChange={(e) => setKm(e.target.value.replace(',', '.').replace(/[^0-9.]/g, ''))} placeholder="ex. 5.2" /></label>
            {test && (
              <div className="stack">
                <div className="small muted">Temps du test seul (sans échauffement ni retour au calme){completion === 'completed_as_prescribed' ? '' : ', facultatif'}</div>
                <div className="row">
                  <label className="field">min<input aria-label="Minutes du test" inputMode="numeric" value={testMin} onChange={(e) => setTestMin(e.target.value.replace(/[^0-9]/g, ''))} placeholder="25" /></label>
                  <label className="field">s<input aria-label="Secondes du test" inputMode="numeric" value={testSec} onChange={(e) => setTestSec(e.target.value.replace(/[^0-9]/g, ''))} placeholder="00" /></label>
                </div>
              </div>
            )}
          </div>
        )}
        <label className="check"><input type="checkbox" checked={pain} onChange={(e) => setPain(e.target.checked)} />J’ai ressenti une douleur</label>
        {pain && <Notice tone="danger">Signaler une douleur suspend la planification automatique jusqu’à ce que vous la déclariez disparue. Consultez un professionnel de santé si elle persiste.</Notice>}
        <div className="row">
          <button className="btn secondary" onClick={onCancel}>Annuler</button>
          <button className="btn primary block" disabled={!completion || !runOk} onClick={() => completion && onSubmit({
            completion, pain,
            ...(run ? { run: { realizedDurationS: Number(minutes) * 60, ...(distanceM !== undefined ? { distanceM } : {}), ...(test && testTimeS !== undefined && testTimeS > 0 ? { testTimeS } : {}) } } : {}),
          })}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

export function Session0({ requestId, onBack }: { requestId: string; onBack: () => void }) {
  const store = useStore();
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
  const { session, log, result } = v;
  const name = sessionName(v.sport, v.archetypeId);
  const role = roleName(v.role);
  const test = isTest(v.archetypeId);
  const started = log !== null;
  const finished = result !== null;
  const editable = started && !finished && log.finishedAt === undefined;
  const now = () => store.clock().now;
  const elapsed = log && !finished ? Math.max(0, Math.floor((Date.parse(now()) - Date.parse(log.startedAt)) / 1000)) : 0;
  const record = (item: SessionItem, _set: SetPrescription | undefined, index: number, x: { done: boolean; reps?: number; loadKg?: number }) =>
    store.apply((s, c) => recordProgrammeSet(s, c, requestId, { itemId: item.id, setIndex: index, ...x }));

  const finishSheet = finishing && (
    <FinishSheet v={v} onCancel={() => setFinishing(false)} onSubmit={(f) => {
      if (store.apply((s, c) => finishProgrammeSession(s, c, { requestId, ...f }))) setFinishing(false);
    }} />
  );
  const timer = editable && <RestTimer0 rest={log.rest} now={now} onAction={(a) => store.apply((s, c) => controlRest(s, c, requestId, a))} />;

  if (v.sport === 'strength') {
    return (
      <>
        <Topbar title="" onBack={onBack} right={v.experimental ? <span className="k-pill" title="Certaines règles de planification sont encore en cours de validation.">Beta</span> : undefined} />
        <div className={`k-workout ${editable && log.rest ? 'with-timer' : ''} ${!started && !finished ? 'with-dock' : ''}`}>
          <StrengthWorkout
            v={v} title={name} eyebrow={`${sportName(v.sport)} · ${formatDate(v.date)}${editable ? ` · ${String(Math.floor(elapsed / 60))}:${String(elapsed % 60).padStart(2, '0')}` : ''}`} editable={editable}
            onRecord={(item, index, x) => record(item, undefined, index, x)}
            onTogglePain={(itemId) => store.apply((s) => toggleProgrammePainItem(s, requestId, itemId))}
          />
          {finished && <div className="k-light"><span className="k-pill done">✓ {STATUS_LABELS[result.completion]}</span><span className="k-light-name">Séance terminée</span></div>}
          {!started && !finished && <div className="k-dock"><button className="k-cta" onClick={() => store.apply((s, c) => startProgrammeSession(s, c, requestId))}>Commencer la séance</button></div>}
          {editable && <button className="k-cta ghost" onClick={() => setFinishing(true)}>Terminer la séance</button>}
        </div>
        {timer}
        {finishSheet}
      </>
    );
  }

  return (
    <>
      <Topbar title={name} onBack={onBack} right={v.experimental ? <ExperimentalBadge /> : undefined} />
      <div className={`screen ${editable && log.rest ? 'with-timer' : ''}`}>
        <div className="session-header">
          <span className="small muted">{sportName(v.sport)} · {formatDate(v.date)}</span>
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

        {!started && !finished && <button className="btn primary block" onClick={() => store.apply((s, c) => startProgrammeSession(s, c, requestId))}>Commencer la séance</button>}
        {editable && <button className="btn primary block" onClick={() => setFinishing(true)}>Terminer la séance</button>}
      </div>
      {timer}
      {finishSheet}
    </>
  );
}
