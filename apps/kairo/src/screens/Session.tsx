import { useEffect, useState } from 'react';
import {
  approxMinutes, AUTHORITY_LABELS, DIFFICULTY_LABELS, durationLabel, exerciseLabel, finishSession, intensityLabel, PAIN_AREAS, paceLabel, reasonMessage, recordRun, recordSet, repsLabel, setKindLabel, setKindShort, startSession, togglePainItem,
} from '@hybridsport/app-core';
import type { AppState, Feedback, GeneratedSession, SessionItem, SessionLog, SetPrescription } from '@hybridsport/app-core';
import { useStore } from '../store.js';
import { RestTimer } from '../RestTimer.js';
import type { RestState } from '../RestTimer.js';
import { AuthorityBadge, formatDate, Notice, sessionTitle, sportLabel, Topbar } from '../ui.js';

const rpeLabel = (r: { min: number; max: number }): string => (r.min === r.max ? String(r.min) : `${String(r.min)}–${String(r.max)}`);

type RunPrescription = Extract<SessionItem['prescription'], { type: 'run_structure' }>;
type RunSeg = RunPrescription['segments'][number];
const RECOVERY_MODES: Record<string, string> = { jog: 'trottinée', walk: 'marchée', standing: 'à l’arrêt' };

function targetLine(t: RunSeg['target'], test: boolean): string {
  const rpe = t.effort && 'rpe' in t.effort ? t.effort.rpe : undefined;
  const effort = rpe ? (test ? `Effort maximal (${rpeLabel(rpe)}/10)` : rpe.min === rpe.max ? `Effort ≤ ${String(rpe.max)}/10` : `Effort ${rpeLabel(rpe)}/10`) : '';
  // Allure affichée SEULEMENT quand elle est la cible prescrite (priorité allure) ; jamais la borne d'estimation d'un test.
  const pace = t.priority === 'pace' && t.pace ? `allure ${paceLabel(t.pace.secPerKm.min)}–${paceLabel(t.pace.secPerKm.max)} /km` : '';
  return [pace, effort].filter(Boolean).join(' · ');
}

function RunStructureView({ p, archetypeId }: { p: RunPrescription; archetypeId: string }) {
  const test = archetypeId === 'running.test';
  const paced = p.segments.some((x) => x.target.priority === 'pace');
  const row = (key: string, title: string, value: string, sub: string) => (
    <div key={key} className="set"><div className="idx">{title}</div><div className="target">{value}<div className="sub">{sub}</div></div></div>
  );
  return (
    <div className="stack" style={{ padding: '0 16px 16px' }}>
      {p.segments.map((seg) => {
        switch (seg.kind) {
          case 'warmup': case 'cooldown': case 'preparation':
            return row(seg.id, seg.kind === 'warmup' ? 'Échauf.' : seg.kind === 'cooldown' ? 'Retour' : 'Prépa.', 'durationS' in seg.dose ? durationLabel(seg.dose.durationS) : `${String(seg.dose.distanceM / 1000)} km`, targetLine(seg.target, false));
          case 'steady':
            return row(seg.id, test ? 'Test' : 'Course', 'durationS' in seg.dose ? durationLabel(seg.dose.durationS) : `${String(seg.dose.distanceM / 1000)} km`, targetLine(seg.target, test));
          case 'repeat':
            return row(seg.id, 'Travail', `${String(seg.reps)} × ${'durationS' in seg.work ? durationLabel(seg.work.durationS) : `${String(seg.work.distanceM)} m`}`,
              [targetLine(seg.target, false), `récupération ${'durationS' in seg.recovery.dose ? durationLabel(seg.recovery.dose.durationS) : `${String(seg.recovery.dose.distanceM)} m`} ${RECOVERY_MODES[seg.recovery.mode] ?? ''}`].filter(Boolean).join(' · '));
        }
      })}
      <div className="tiny">
        {test
          ? 'Sur un parcours mesuré (piste, parcours connu ou montre), le plus vite possible et régulièrement. Notez ensuite le temps du test seul : il fixe l’intensité de vos séances de qualité, jamais leur volume. La durée estimée s’appuie seulement sur vos courses récentes.'
          : archetypeId === 'running.easy' || archetypeId === 'running.long'
            ? 'Effort facile, conversation possible. Durée = votre dernière durée réalisée ; +1 min seulement après deux séances bien tolérées. Aucune allure : la règle d’allure facile n’est pas validée.'
            : `${paced ? 'Allure issue de votre performance de référence de 3 à 5 km (marge selon sa fiabilité) ; l’effort reste le garde-fou.' : 'Cible à l’effort perçu : aucune allure validée pour ce type de séance ou sans référence fiable.'} Structure reprise de votre dernière séance (ou première séance après test) ; +1 répétition seulement après deux séances bien tolérées.`}
      </div>
    </div>
  );
}

const BLOCK_LABELS: Record<string, string> = { warmup: 'Échauffement', activation: 'Activation', strength: 'Force', accessory: 'Accessoires', running: 'Course', conditioning: 'Conditioning', cooldown: 'Retour au calme', skill: 'Technique', finisher: 'Finisher', hybrid_station_work: 'Stations' };

function SetRow({ item, set, index, workingNumber, log, editable, onRecord }: {
  item: SessionItem; set: SetPrescription; index: number; workingNumber: number; log: SessionLog | undefined; editable: boolean;
  onRecord: (index: number, v: { done: boolean; reps?: number; loadKg?: number }) => void;
}) {
  const saved = log?.sets.find((x) => x.itemId === item.id && x.setIndex === index);
  const prescribedKg = set.intensity?.mode === 'load' ? set.intensity.kg : set.intensity?.mode === 'percent_of_reference' ? set.intensity.kgRounded : undefined;
  // Pré-remplissage : uniquement ce que le moteur a PRESCRIT exactement (reps fixes, charge prescrite) ; une plage n'est jamais pré-remplie.
  const [reps, setReps] = useState<string>(saved?.reps !== undefined ? String(saved.reps) : typeof set.reps === 'number' ? String(set.reps) : '');
  const [kg, setKg] = useState<string>(saved?.loadKg !== undefined ? String(saved.loadKg) : prescribedKg !== undefined ? String(prescribedKg) : '');
  const done = saved?.done === true;
  const repsN = reps === '' ? undefined : Number(reps);
  const kgN = kg === '' ? undefined : Number(kg);
  const valid = repsN !== undefined && Number.isInteger(repsN) && repsN >= 0 && (kgN === undefined || (Number.isFinite(kgN) && kgN >= 0));
  const toggle = () => onRecord(index, done ? { done: false, ...(repsN !== undefined ? { reps: repsN } : {}), ...(kgN !== undefined ? { loadKg: kgN } : {}) } : { done: true, reps: repsN ?? 0, ...(kgN !== undefined ? { loadKg: kgN } : {}) });
  return (
    <div className={`set ${set.kind === 'rampup' ? 'rampup' : ''} ${done ? 'done' : ''}`}>
      <div className="idx" title={setKindLabel(set.kind)}>{set.kind === 'working' ? String(workingNumber) : setKindShort(set.kind)}</div>
      <div className="target">
        {repsLabel(set.reps)}{set.optional ? ' · facultative' : ''}
        <div className="sub">{intensityLabel(set)}{set.restAfterS > 0 ? ` · repos ${durationLabel(set.restAfterS)}` : ''}</div>
      </div>
      <input aria-label="Répétitions réalisées" inputMode="numeric" placeholder="reps" value={reps} disabled={!editable || done} onChange={(e) => setReps(e.target.value.replace(/[^0-9]/g, ''))} />
      <input aria-label="Charge (kg)" inputMode="decimal" placeholder="kg" value={kg} disabled={!editable || done} onChange={(e) => setKg(e.target.value.replace(',', '.').replace(/[^0-9.]/g, ''))} />
      <button className={`tick ${done ? 'on' : ''}`} aria-label={done ? 'Décocher la série' : 'Cocher la série'} aria-pressed={done} disabled={!editable || (!done && !valid)} onClick={toggle}>✓</button>
    </div>
  );
}

function FeedbackSheet({ run, test, onCancel, onSubmit }: { run: boolean; test: boolean; onCancel: () => void; onSubmit: (f: Feedback, r?: SessionLog['run']) => void }) {
  const [difficulty, setDifficulty] = useState<Feedback['difficulty'] | null>(null);
  const [pain, setPain] = useState(false);
  const [areas, setAreas] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [minutes, setMinutes] = useState('');
  const [completion, setCompletion] = useState<'COMPLETED' | 'PARTIAL'>('COMPLETED');
  const [km, setKm] = useState('');
  const [testMin, setTestMin] = useState('');
  const [testSec, setTestSec] = useState('');
  const distanceM = km === '' ? undefined : Number(km) * 1000;
  const testTimeS = testMin === '' && testSec === '' ? undefined : Number(testMin || '0') * 60 + Number(testSec || '0');
  const runOk = !run || (Number(minutes) > 0 && (distanceM === undefined || (Number.isFinite(distanceM) && distanceM > 0))
    && (!test || completion !== 'COMPLETED' || (testTimeS !== undefined && testTimeS > 0 && Number(testSec || '0') < 60)));
  const runLog = (): SessionLog['run'] => ({
    realizedDurationS: Number(minutes) * 60, completion,
    ...(!test && distanceM !== undefined ? { distanceM } : {}),
    ...(test && completion === 'COMPLETED' && testTimeS !== undefined ? { testTimeS } : {}),
  });
  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label="Fin de séance">
      <div className="sheet">
        <h2 style={{ margin: 0 }}>Fin de séance</h2>
        {run && (
          <div className="stack-3">
            <label className="field">Durée totale de la séance (minutes)
              <input inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/[^0-9]/g, ''))} placeholder="ex. 35" />
            </label>
            <div className="row">
              <button type="button" className={`chip ${completion === 'COMPLETED' ? 'on' : ''}`} onClick={() => setCompletion('COMPLETED')}>Faite comme prévue</button>
              <button type="button" className={`chip ${completion === 'PARTIAL' ? 'on' : ''}`} onClick={() => setCompletion('PARTIAL')}>Interrompue</button>
            </div>
            {test ? (
              completion === 'COMPLETED' && (
                <div className="stack">
                  <div className="small muted">Temps du test seul (sans échauffement ni retour au calme)</div>
                  <div className="row">
                    <label className="field">min<input aria-label="Minutes du test" inputMode="numeric" value={testMin} onChange={(e) => setTestMin(e.target.value.replace(/[^0-9]/g, ''))} placeholder="45" /></label>
                    <label className="field">s<input aria-label="Secondes du test" inputMode="numeric" value={testSec} onChange={(e) => setTestSec(e.target.value.replace(/[^0-9]/g, ''))} placeholder="00" /></label>
                  </div>
                </div>
              )
            ) : (
              <label className="field">Distance (km, facultatif)
                <input inputMode="decimal" value={km} onChange={(e) => setKm(e.target.value.replace(',', '.').replace(/[^0-9.]/g, ''))} placeholder="ex. 5.2" />
              </label>
            )}
          </div>
        )}
        <div className="stack">
          <div className="small muted">Ressenti par rapport à ce qui était prévu</div>
          {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => (
            <button type="button" key={k} className={`option ${difficulty === k ? 'on' : ''}`} onClick={() => setDifficulty(k as Feedback['difficulty'])}><span className="t">{v}</span></button>
          ))}
        </div>
        <label className="check"><input type="checkbox" checked={pain} onChange={(e) => setPain(e.target.checked)} />J’ai ressenti une douleur</label>
        {pain && (
          <>
            <Notice tone="danger">Une douleur suspend toutes les séances jusqu’à ce que vous la déclariez disparue. Consultez un professionnel si elle persiste.</Notice>
            <div className="row wrap">{Object.entries(PAIN_AREAS).map(([k, v]) => (
              <button type="button" key={k} className={`chip ${areas.includes(k) ? 'on' : ''}`} onClick={() => setAreas(areas.includes(k) ? areas.filter((a) => a !== k) : [...areas, k])}>{v}</button>
            ))}</div>
          </>
        )}
        <label className="field">Note (facultatif)<textarea maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} /></label>
        <div className="row">
          <button className="btn secondary" onClick={onCancel}>Annuler</button>
          <button className="btn primary block" disabled={!difficulty || !runOk} onClick={() => difficulty && onSubmit({ difficulty, pain, painAreas: areas, note }, run ? runLog() : undefined)}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

function Unavailable({ g, onBack, onEditProfile }: { g: GeneratedSession; onBack: () => void; onEditProfile: () => void }) {
  const reasons = g.outcome.status === 'unavailable' ? g.outcome.reasons : [];
  return (
    <>
      <Topbar title={sportLabel(g.sport)} onBack={onBack} />
      <div className="screen">
        <span className="badge unavailable" style={{ alignSelf: 'flex-start' }}>AUCUNE SÉANCE VALIDE</span>
        <h1 className="screen-title">{formatDate(g.date)}</h1>
        <p className="muted">Le moteur n’a produit aucune séance valide. Aucune séance de remplacement n’est inventée.</p>
        <div className="stack">{reasons.map((r, i) => <Notice key={`${r.code}${String(i)}`} tone="warn"><div className="stack"><span>{reasonMessage(r)}</span><span className="tiny">{r.code}</span></div></Notice>)}</div>
        <button className="btn secondary" onClick={onEditProfile}>Revoir mes contraintes</button>
      </div>
    </>
  );
}

export function SessionScreen({ sessionKey, onBack, onEditProfile }: { sessionKey: string; onBack: () => void; onEditProfile: () => void }) {
  const store = useStore();
  const g = store.state.sessions[sessionKey];
  const log = store.state.logs[sessionKey];
  const [rest, setRest] = useState<RestState | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!log || log.finishedAt) return undefined;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - Date.parse(log.startedAt)) / 1000)), 1000);
    return () => clearInterval(t);
  }, [log]);
  if (!g) return <><Topbar title="Séance" onBack={onBack} /><div className="empty">Séance introuvable.</div></>;
  if (g.outcome.status !== 'ok') return <Unavailable g={g} onBack={onBack} onEditProfile={onEditProfile} />;
  const session = g.outcome.session;
  const started = log !== undefined;
  const finished = log?.finishedAt !== undefined;
  const editable = started && !finished;
  const run = g.sport === 'running';
  const est = g.outcome.estimate;

  const record = (item: SessionItem, set: SetPrescription, index: number, v: { done: boolean; reps?: number; loadKg?: number }) => {
    const ok = store.apply((s: AppState) => recordSet(s, sessionKey, { itemId: item.id, setIndex: index, ...v }));
    if (ok && v.done && set.restAfterS > 0) setRest({ endsAt: Date.now() + set.restAfterS * 1000, totalS: set.restAfterS, label: exerciseLabel(item.exerciseId) });
  };
  const totalWork = session.blocks.flatMap((b) => b.items).reduce((a, it) => a + (it.prescription.type === 'sets' ? it.prescription.sets.length : 0), 0);
  const doneCount = log?.sets.filter((x) => x.done).length ?? 0;

  return (
    <>
      <Topbar title={sessionTitle(g)} onBack={onBack} right={<AuthorityBadge authority={g.authority} />} />
      <div className="screen">
        <div className="session-header">
          <span className="small muted">{sportLabel(g.sport)} · {formatDate(g.date)}</span>
          <h1 className="screen-title" style={{ marginTop: 0 }}>{sessionTitle(g)}</h1>
          <div className="row wrap small muted num">
            {est && <span>≈ {approxMinutes(est.p50S)}{approxMinutes(est.p90S) !== approxMinutes(est.p50S) ? ` (max ${approxMinutes(est.p90S)})` : ''}</span>}
            <span>· {durationLabel(session.availableTimeS)} disponibles</span>
            {!run && <span>· {String(doneCount)}/{String(totalWork)} séries</span>}
            {editable && <span>· {durationLabel(elapsed)} écoulées</span>}
          </div>
          <Notice tone={g.authority === 'simulation' ? 'sim' : 'warn'}><span>{AUTHORITY_LABELS[g.authority]?.detail} <span className="tiny">Ruleset {g.rulesetVersion}.</span></span></Notice>
          {finished && <Notice><span>Séance terminée{log?.feedback ? ` · ${DIFFICULTY_LABELS[log.feedback.difficulty] ?? ''}` : ''}.</span></Notice>}
        </div>

        {session.blocks.map((b) => (
          <div key={b.id} className="stack-3">
            <div className="block-title"><div className="section-title">{BLOCK_LABELS[b.kind] ?? b.kind}</div>{b.format === 'sets' && b.grouping !== 'straight' ? <span className="tiny">{b.grouping === 'superset' ? 'Superset' : 'Circuit'}</span> : null}</div>
            {b.items.map((it) => {
              const p = it.prescription;
              const painful = log?.painItems.includes(it.id) === true;
              return (
                <div key={it.id} className="exercise">
                  <div className="exercise-head">
                    <div className="stack" style={{ gap: 4 }}>
                      <h4>{exerciseLabel(it.exerciseId)}</h4>
                      {it.refs?.prescriptionSource === 'calibration' && <span className="tiny">Première exposition : choisissez une charge qui respecte l’effort indiqué.</span>}
                      {it.refs?.anchor === 'declared' && <span className="tiny">Exercice de référence : progression suivie.</span>}
                      {it.alternatives && it.alternatives.length > 0 && <span className="tiny">Alternatives prévues : {it.alternatives.map(exerciseLabel).join(', ')}</span>}
                    </div>
                    {editable && p.type === 'sets' && <button className={`chip ${painful ? 'on' : ''}`} style={{ minHeight: 34, fontSize: 12 }} onClick={() => store.apply((s) => togglePainItem(s, sessionKey, it.id))} aria-pressed={painful}>Douleur</button>}
                  </div>
                  {p.type === 'sets' && (
                    <>
                      <div className="set-head"><span>Série</span><span>Cible</span><span>Reps</span><span>Kg</span><span /></div>
                      {p.sets.map((set, i) => <SetRow key={`${it.id}.${String(i)}`} item={it} set={set} index={i} workingNumber={p.sets.slice(0, i + 1).filter((x) => x.kind !== 'rampup').length} log={log} editable={editable} onRecord={(idx, v) => record(it, set, idx, v)} />)}
                    </>
                  )}
                  {p.type === 'mobility' && <div className="set"><div className="idx">—</div><div className="target">{durationLabel(p.seconds)}{p.sides > 1 ? ` × ${String(p.sides)} côtés` : ''}</div></div>}
                  {p.type === 'run_structure' && <RunStructureView p={p} archetypeId={g.archetypeId} />}
                </div>
              );
            })}
          </div>
        ))}

        {!started && <button className="btn primary block" onClick={() => store.apply((s, c) => startSession(s, sessionKey, c))}>Démarrer la séance</button>}
        {editable && <button className="btn primary block" onClick={() => setFinishing(true)}>Terminer la séance</button>}
      </div>
      <RestTimer rest={rest} onChange={setRest} />
      {finishing && (
        <FeedbackSheet run={run} test={g.archetypeId === 'running.test'} onCancel={() => setFinishing(false)} onSubmit={(f, r) => {
          const ok = store.apply((s, c) => finishSession(r ? recordRun(s, sessionKey, r) : s, sessionKey, f, c));
          if (ok) { setFinishing(false); setRest(null); }
        }} />
      )}
    </>
  );
}
