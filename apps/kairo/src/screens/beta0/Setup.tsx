/**
 * Onboarding Beta 0 : profil → sports (musculation, course, les deux) → objectifs et fréquence → disponibilités →
 * priorité, matériel, durée du programme → création du programme réel (app-core `createBeta0Programme`).
 * Aussi utilisé pour créer un programme depuis un profil V0 existant, ou le recréer (workflow explicite).
 */
import { useEffect, useState } from 'react';
import { createBeta0Programme, DIFFICULTY_LABELS, normalizeInstant, previewBeta0Recreation, recreateBeta0Programme, RUNNING_GOAL_LABELS, STRENGTH_GOAL_LABELS } from '@hybridsport/app-core';
import type { Beta0ProgrammeOptions, DeclaredPerformance, Feedback, ProfileInput } from '@hybridsport/app-core';
import { PerformanceForm } from '../../running/PerformanceForm.js';
import { performanceText } from '../../running/RunningProfile.js';

import { useStore } from '../../store.js';
import { AvailabilitySection, defaultProfile, EquipmentSection, GoalsSection } from '../../ProfileForm.js';
import { formatDate, Notice } from '../../ui.js';

type Choice = 'strength' | 'running' | 'hybrid';
const CHOICES: readonly { id: Choice; title: string; detail: string }[] = [
  { id: 'strength', title: 'Musculation', detail: 'Séances de force guidées, série par série' },
  { id: 'running', title: 'Course', detail: 'Footing, séances clés, tests chronométrés' },
  { id: 'hybrid', title: 'Musculation + Course', detail: 'Les deux, répartis dans votre semaine' },
];
const STEPS = ['Bienvenue', 'Sports', 'Objectifs', 'Disponibilités', 'Programme'];

const choiceOf = (p: ProfileInput): Choice | null => (p.strength.enabled && p.running.enabled ? 'hybrid' : p.strength.enabled ? 'strength' : p.running.enabled ? 'running' : null);
function withChoice(p: ProfileInput, c: Choice, first: 'strength' | 'running'): ProfileInput {
  const strength = c !== 'running';
  const running = c !== 'strength';
  const priorities = c === 'hybrid' ? (first === 'strength' ? ['strength', 'running'] : ['running', 'strength']) as ProfileInput['priorities'] : [c];
  return { ...p, strength: { ...p.strength, enabled: strength }, running: { ...p.running, enabled: running }, crosstraining: { enabled: false }, hyrox: { enabled: false }, priorities };
}

export function Setup({ initial, mode = 'create', onDone, onCancel }: { initial?: ProfileInput; mode?: 'create' | 'recreate'; onDone?: () => void; onCancel?: () => void }) {
  const store = useStore();
  const existing = initial !== undefined;
  const [step, setStep] = useState(existing ? 1 : 0);
  const [accepted, setAccepted] = useState(existing);
  const [p, setP] = useState<ProfileInput>(() => initial ? withChoice(initial, choiceOf(initial) ?? 'strength', initial.priorities[0] === 'running' ? 'running' : 'strength') : defaultProfile(normalizeInstant(store.clock().now)));
  // Modification : conséquences calculées par app-core (jamais ici) ; date d'objectif actuelle préremplie.
  const preview = mode === 'recreate' ? previewBeta0Recreation(store.state, store.clock().today) : null;
  const [targetDate, setTargetDate] = useState(preview?.runningTargetDate ?? '');
  useEffect(() => { window.scrollTo(0, 0); }, [step]);
  const [runMin, setRunMin] = useState('');
  const [runKm, setRunKm] = useState('');
  const [runFeel, setRunFeel] = useState<Feedback['difficulty']>('AS_EXPECTED');
  const [perfs, setPerfs] = useState<DeclaredPerformance[]>([]);
  const [addingPerf, setAddingPerf] = useState(false);
  const [noChrono, setNoChrono] = useState(false);
  const choice = choiceOf(p);
  const set = (f: (x: ProfileInput) => ProfileInput) => setP(f);
  const first = p.priorities[0] === 'running' ? 'running' : 'strength';
  const km = runKm === '' ? undefined : Number(runKm);
  const lastRunOk = runMin === '' ? runKm === '' : Number(runMin) > 0 && (km === undefined || (Number.isFinite(km) && km > 0));
  const dateOk = targetDate === '' || (/^\d{4}-\d{2}-\d{2}$/.test(targetDate) && targetDate >= store.clock().today);
  const dated = p.running.enabled && p.running.goal !== 'GENERAL_RUNNING' && targetDate !== '' && dateOk;
  const canNext = step === 0 ? accepted : step === 1 ? choice !== null : step === 2 ? lastRunOk && dateOk : step === 3 ? p.availability.some((m) => m > 0) : true;

  const create = () => {
    const o: Beta0ProgrammeOptions = {
      ...(p.running.enabled && perfs.length > 0 ? { performances: perfs } : {}),
      ...(p.running.enabled && perfs.length === 0 && noChrono ? { requestTest: true } : {}),
      ...(p.running.enabled && targetDate && p.running.goal !== 'GENERAL_RUNNING' ? { runningTargetDate: targetDate } : {}),
      ...(p.running.enabled && runMin !== '' ? { lastRun: { realizedDurationS: Number(runMin) * 60, ...(km !== undefined ? { distanceM: km * 1000 } : {}), difficulty: runFeel } } : {}),
    };
    const ok = store.apply((s, c) => mode === 'recreate'
      ? recreateBeta0Programme(s, p, c, o)
      : createBeta0Programme(s, { ...p, acceptedProvisionalAt: existing ? p.acceptedProvisionalAt : normalizeInstant(c.now) }, c, o));
    if (ok) onDone?.();
  };

  return (
    <div className="screen wizard">
      {step === 0 ? (
        <div className="hero" style={{ minHeight: 280 }}>
          <div className="hero-brand">KAI<span>RO</span></div>
          <h1>Entraîne-toi.<br />Sans rien inventer.</h1>
          <p>Musculation et course : un programme construit par des moteurs d’entraînement, semaine après semaine.</p>
        </div>
      ) : (
        <>
          <div className="steps" aria-hidden="true">{STEPS.slice(1).map((s, i) => <span key={s} className={i < step ? 'on' : ''} />)}</div>
          <h1 className="screen-title">{STEPS[step]}</h1>
        </>
      )}

      {step === 0 && (
        <div className="stack-3">
          <Notice tone="sim">
            <div className="stack">
              <strong>Beta expérimentale</strong>
              <span>Les séances viennent de moteurs testés, mais certaines valeurs et règles de planification sont encore en cours de validation. Ce ne sont pas des recommandations établies.</span>
              <span>KAIRO ne remplace pas un avis médical. En cas de douleur, arrêtez et consultez.</span>
              <span>Vos données restent sur cet appareil (pas de compte, pas de synchronisation).</span>
            </div>
          </Notice>
          <label className="check"><input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />J’ai compris : version expérimentale, je m’entraîne sous ma responsabilité.</label>
        </div>
      )}

      {step === 1 && (
        <div className="stack" role="radiogroup" aria-label="Sports">
          {CHOICES.map((c) => (
            <button key={c.id} type="button" role="radio" aria-checked={choice === c.id} className={`option ${choice === c.id ? 'on' : ''}`} onClick={() => setP(withChoice(p, c.id, first))}>
              <div><div className="t">{c.title}</div><div className="tiny">{c.detail}</div></div>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <>
          <label className="field">Prénom (facultatif)<input type="text" value={p.displayName} maxLength={40} onChange={(e) => setP({ ...p, displayName: e.target.value })} /></label>
          <GoalsSection p={p} set={set} beta0 />
          {p.running.enabled && (
            <div className="card">
              {p.running.goal !== 'GENERAL_RUNNING' && (
                <label className="field">Date de l’objectif {RUNNING_GOAL_LABELS[p.running.goal]} (facultatif)
                  <input type="date" min={store.clock().today} value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
                </label>
              )}
              <p className="tiny" style={{ margin: 0 }}>L’objectif décrit ce que vous visez ; il n’est jamais utilisé comme un chrono déjà réalisé.</p>
            </div>
          )}
          {p.running.enabled && (
            <div className="card">
              <h3>Niveau actuel</h3>
              <div className="section-title" style={{ marginTop: 0 }}>Performances récentes</div>
              {mode === 'recreate' && store.state.running.references.length > 0 && <p className="tiny" style={{ margin: 0 }}>Vos {String(store.state.running.references.length)} performance{store.state.running.references.length > 1 ? 's' : ''} déjà enregistrée{store.state.running.references.length > 1 ? 's sont conservées' : ' est conservée'} (Réglages → Profil Course). Ajoutez seulement les nouvelles.</p>}
              {perfs.length === 0 && !addingPerf && <p className="tiny" style={{ margin: 0 }}>Un chrono récent (course officielle ou chrono personnel) permet de débloquer les séances clés et des cibles d’allure.</p>}
              {perfs.map((x, i) => (
                <div key={`${x.kind}${String(i)}`} className="row between small">
                  <span>{performanceText(x)}</span>
                  <button type="button" className="btn ghost" aria-label={`Retirer ${performanceText(x)}`} onClick={() => setPerfs(perfs.filter((_, j) => j !== i))}>Retirer</button>
                </div>
              ))}
              {addingPerf
                ? <PerformanceForm today={store.clock().today} onAdd={(x) => { setPerfs([...perfs, x]); setAddingPerf(false); setNoChrono(false); }} onCancel={() => setAddingPerf(false)} />
                : <button type="button" className="btn secondary" onClick={() => setAddingPerf(true)}>Ajouter une performance</button>}
              {perfs.length === 0 && (
                <label className="check"><input type="checkbox" checked={noChrono} onChange={(e) => setNoChrono(e.target.checked)} />Je n’ai pas de chrono récent : programmer un test chronométré</label>
              )}
              <h3>Votre dernière course</h3>
              <p className="tiny" style={{ margin: 0 }}>Les séances de course reprennent ce que vous avez réellement couru. Sans course récente, elles ne pourront pas être proposées.</p>
              <div className="row">
                <label className="field">Durée (min)<input inputMode="numeric" value={runMin} placeholder="ex. 30" onChange={(e) => setRunMin(e.target.value.replace(/[^0-9]/g, ''))} /></label>
                <label className="field">Distance (km)<input inputMode="decimal" value={runKm} placeholder="facultatif" onChange={(e) => setRunKm(e.target.value.replace(',', '.').replace(/[^0-9.]/g, ''))} /></label>
              </div>
              {runMin !== '' && (
                <label className="field">Ressenti
                  <select value={runFeel} onChange={(e) => setRunFeel(e.target.value as Feedback['difficulty'])}>
                    {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
              )}
            </div>
          )}
        </>
      )}

      {step === 3 && (
        <>
          <p className="muted small">Temps disponible par jour. Une séance au plus par jour, jamais plus longue que ce temps.</p>
          <AvailabilitySection p={p} set={set} />
        </>
      )}

      {step === 4 && (
        <>
          {choice === 'hybrid' && (
            <div className="stack" role="radiogroup" aria-label="Priorité">
              <div className="section-title">Priorité si les jours manquent</div>
              {(['strength', 'running'] as const).map((s) => (
                <button key={s} type="button" role="radio" aria-checked={first === s} className={`option ${first === s ? 'on' : ''}`} onClick={() => setP(withChoice(p, 'hybrid', s))}>
                  <div className="t">Priorité {s === 'strength' ? 'Musculation' : 'Course'}</div>
                </button>
              ))}
            </div>
          )}
          {p.strength.enabled && <><div className="section-title">Matériel</div><EquipmentSection p={p} set={set} /></>}
          <div className="card">
            <h3>Récapitulatif</h3>
            <div className="small muted">
              {[p.strength.enabled && `Musculation · ${STRENGTH_GOAL_LABELS[p.strength.goal] ?? ''} · ${String(p.strength.sessionsPerWeek)}/sem.`, p.running.enabled && `Course · ${RUNNING_GOAL_LABELS[p.running.goal] ?? ''} · ${String(p.running.sessionsPerWeek)}/sem.`].filter(Boolean).join(' — ')}
            </div>
            <div className="small muted">{String(p.availability.filter((m) => m > 0).length)} jours disponibles par semaine</div>
            {dated ? <div className="small"><b>Objectif {RUNNING_GOAL_LABELS[p.running.goal]} le {formatDate(targetDate)}</b></div> : null}
            <p className="small" style={{ margin: 0 }}>{dated ? 'Votre programme évolue semaine après semaine jusqu’à votre objectif.' : 'Votre programme évolue semaine après semaine, sans date de fin.'} Chaque semaine est construite à partir de ce que vous avez réellement fait.</p>
          </div>
          {preview && <RecreationNotice preview={preview} />}
        </>
      )}

      <div className="wizard-actions" role="group" aria-label="Navigation de l’assistant">
        {(step > (existing ? 1 : 0)) && <button className="btn secondary" onClick={() => setStep(step - 1)}>Retour</button>}
        {step === (existing ? 1 : 0) && onCancel && <button className="btn secondary" onClick={onCancel}>Annuler</button>}
        {step < STEPS.length - 1
          ? <button className="btn primary block" disabled={!canNext} onClick={() => setStep(step + 1)}>{step === 0 ? 'Commencer' : 'Continuer'}</button>
          : <button className="btn primary block" disabled={preview?.sessionInProgress != null} onClick={create}>{mode === 'recreate' ? 'Recréer mon programme' : 'Créer mon programme'}</button>}
      </div>
    </div>
  );
}

/** Conséquences EXACTES de la modification (aperçu app-core), affichées avant validation. */
function RecreationNotice({ preview }: { preview: ReturnType<typeof previewBeta0Recreation> }) {
  if (preview.sessionInProgress) return <Notice tone="danger"><span>Une séance est en cours : terminez-la avant de modifier le programme. Rien ne sera modifié.</span></Notice>;
  return (
    <Notice tone="warn">
      <div className="stack">
        <strong>Ce qui va se passer</strong>
        {preview.currentWeek === 'kept'
          ? <span>Cette semaine est commencée : elle est conservée telle quelle et ses séances restantes restent disponibles. Le nouveau programme s’applique à partir du lundi {formatDate(preview.appliesFrom).split(' ').slice(1).join(' ')}.</span>
          : <span>Aucune séance n’a encore été enregistrée cette semaine : elle est replanifiée dès aujourd’hui avec le nouveau programme.{preview.pastSessionsDropped > 0 ? ` ${String(preview.pastSessionsDropped)} séance${preview.pastSessionsDropped > 1 ? 's' : ''} prévue${preview.pastSessionsDropped > 1 ? 's' : ''} à une date déjà passée et non réalisée${preview.pastSessionsDropped > 1 ? 's' : ''} ${preview.pastSessionsDropped > 1 ? 'sont retirées' : 'est retirée'} (ni faite${preview.pastSessionsDropped > 1 ? 's' : ''}, ni manquée${preview.pastSessionsDropped > 1 ? 's' : ''}).` : ''}</span>}
        <span>Conservés : séances déjà réalisées, historique, performances déclarées et courses libres.</span>
      </div>
    </Notice>
  );
}
