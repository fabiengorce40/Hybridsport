import { useEffect, useState } from 'react';
import {
  approxMinutes, AUTHORITY_LABELS, DIFFICULTY_LABELS, durationLabel, exerciseLabel, finishSession, intensityLabel, PAIN_AREAS, reasonMessage, recordRun, recordSet, repsLabel, setKindLabel, setKindShort, startSession, togglePainItem,
} from '@hybridsport/app-core';
import type { AppState, Feedback, GeneratedSession, SessionItem, SessionLog, SetPrescription } from '@hybridsport/app-core';
import { useStore } from '../store.js';
import { RestTimer } from '../RestTimer.js';
import type { RestState } from '../RestTimer.js';
import { AuthorityBadge, formatDate, Notice, sessionTitle, sportLabel, Topbar } from '../ui.js';

const rpeLabel = (r: { min: number; max: number }): string => (r.min === r.max ? String(r.min) : `${String(r.min)}–${String(r.max)}`);

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

function FeedbackSheet({ run, onCancel, onSubmit }: { run: boolean; onCancel: () => void; onSubmit: (f: Feedback, r?: SessionLog['run']) => void }) {
  const [difficulty, setDifficulty] = useState<Feedback['difficulty'] | null>(null);
  const [pain, setPain] = useState(false);
  const [areas, setAreas] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [minutes, setMinutes] = useState('');
  const [completion, setCompletion] = useState<'COMPLETED' | 'PARTIAL'>('COMPLETED');
  const runOk = !run || (Number(minutes) > 0);
  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label="Fin de séance">
      <div className="sheet">
        <h2 style={{ margin: 0 }}>Fin de séance</h2>
        {run && (
          <div className="stack-3">
            <label className="field">Durée réellement courue (minutes)
              <input inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/[^0-9]/g, ''))} placeholder="ex. 35" />
            </label>
            <div className="row">
              <button type="button" className={`chip ${completion === 'COMPLETED' ? 'on' : ''}`} onClick={() => setCompletion('COMPLETED')}>Séance complète</button>
              <button type="button" className={`chip ${completion === 'PARTIAL' ? 'on' : ''}`} onClick={() => setCompletion('PARTIAL')}>Interrompue</button>
            </div>
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
          <button className="btn primary block" disabled={!difficulty || !runOk} onClick={() => difficulty && onSubmit({ difficulty, pain, painAreas: areas, note }, run ? { realizedDurationS: Number(minutes) * 60, completion } : undefined)}>Enregistrer</button>
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
                  {p.type === 'run_structure' && p.segments.map((seg) => (
                    <div key={seg.id} className="stack" style={{ padding: '0 16px 16px' }}>
                      {seg.kind === 'steady' && 'durationS' in seg.dose && <div className="stat"><div className="v">{durationLabel(seg.dose.durationS)}</div><div className="l">Course continue</div></div>}
                      {seg.kind === 'steady' && seg.target.effort && 'rpe' in seg.target.effort && <div className="small">Effort perçu : {rpeLabel(seg.target.effort.rpe)} sur 10 (facile, conversation possible).</div>}
                      <div className="tiny">Aucune allure n’est prescrite : la règle d’allure n’est pas validée. Durée = dernière durée réalisée, jamais augmentée.</div>
                    </div>
                  ))}
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
        <FeedbackSheet run={run} onCancel={() => setFinishing(false)} onSubmit={(f, r) => {
          const ok = store.apply((s, c) => finishSession(r ? recordRun(s, sessionKey, r) : s, sessionKey, f, c));
          if (ok) { setFinishing(false); setRest(null); }
        }} />
      )}
    </>
  );
}
