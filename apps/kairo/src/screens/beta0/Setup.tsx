/**
 * Onboarding Beta 0 : profil → sports (musculation, course, les deux) → objectifs et fréquence → disponibilités →
 * priorité, matériel, durée du programme → création du programme réel (app-core `createBeta0Programme`).
 * Aussi utilisé pour créer un programme depuis un profil V0 existant, ou le recréer (workflow explicite).
 */
import { useEffect, useMemo, useState } from 'react';
import { createBeta0Programme, ctIntentFeasibility, hyroxRoleFeasibility, strengthSupportedFrequencies, CT_INTENT_LABELS, DIFFICULTY_LABELS, HR_BALANCED_LABEL, HR_GOAL_LABELS, HR_ROLE_LABELS, normalizeInstant, previewBeta0Recreation, recreateBeta0Programme, RETURN_STATE_LABELS, RUNNING_GOAL_LABELS, STRENGTH_GOAL_LABELS } from '@hybridsport/app-core';
import type { Beta0ProgrammeOptions, CtIntentFeasibility, DeclaredPerformance, Feedback, HrRoleFeasibility, ProfileInput } from '@hybridsport/app-core';
import { HrFeasibilityNotice } from './HrFeasibility.js';
import { PerformanceForm } from '../../running/PerformanceForm.js';
import { performanceText } from '../../running/RunningProfile.js';

import { useStore } from '../../store.js';
import { AvailabilitySection, defaultProfile, EquipmentSection, equipmentChosen, GoalsSection, needsEquipment } from '../../ProfileForm.js';
import { formatDate, Notice } from '../../ui.js';

type Choice = 'strength' | 'running' | 'hybrid' | 'crosstraining' | 'hyrox';
const CHOICES: readonly { id: Choice; title: string; detail: string }[] = [
  { id: 'strength', title: 'Musculation', detail: 'Séances de force guidées, série par série' },
  { id: 'running', title: 'Course', detail: 'Footing, séances clés, tests chronométrés' },
  { id: 'hybrid', title: 'Musculation + Course', detail: 'Les deux, répartis dans votre semaine' },
  { id: 'crosstraining', title: 'Cross-training', detail: 'AMRAP, EMOM, intervalles, for time — composés pour vous' },
  { id: 'hyrox', title: 'HYROX', detail: 'Stations et course enchaînées — séances composées pour vous' },
];
// Choix de saisie (comme les autres sports) : nombre de séances Cross-training / HYROX par semaine.
const CT_SESSION_CHOICES = [1, 2, 3, 4, 5, 6];
const HR_SESSION_CHOICES = CT_SESSION_CHOICES;
const STEPS = ['Bienvenue', 'Sports', 'Objectifs', 'Disponibilités', 'Programme'];

const choiceOf = (p: ProfileInput): Choice | null => (p.strength.enabled && p.running.enabled ? 'hybrid' : p.strength.enabled ? 'strength' : p.running.enabled ? 'running' : p.crosstraining.enabled ? 'crosstraining' : p.hyrox.enabled ? 'hyrox' : null);
/**
 * Sports choisis. Cross-training et HYROX : seuls, ou AJOUTÉS aux autres (après eux dans l'ordre de priorité déclaré).
 * Leurs déclarations sont conservées si on les désactive puis les réactive. Aucune valeur HYROX n'est supposée
 * (rôle et objectif choisis par l'utilisateur).
 */
function withChoice(p: ProfileInput, c: Choice, first: 'strength' | 'running', ct = p.crosstraining.enabled, hr = p.hyrox.enabled): ProfileInput {
  const strength = c === 'strength' || c === 'hybrid';
  const running = c === 'running' || c === 'hybrid';
  const withCt = c === 'crosstraining' || (ct && c !== 'hyrox');
  const withHr = c === 'hyrox' || hr;
  const base = c === 'hybrid' ? (first === 'strength' ? ['strength', 'running'] : ['running', 'strength']) : c === 'crosstraining' || c === 'hyrox' ? [] : [c];
  const priorities = [...base, ...(withCt ? ['crosstraining'] : []), ...(withHr ? ['hyrox'] : [])] as ProfileInput['priorities'];
  const declared = { sessionsPerWeek: p.crosstraining.sessionsPerWeek ?? 2, returnState: p.crosstraining.returnState ?? 'NONE', ...(p.crosstraining.intent ? { intent: p.crosstraining.intent } : {}) };
  const h = p.hyrox;
  const hrDeclared = { sessionsPerWeek: h.sessionsPerWeek ?? 2, returnState: h.returnState ?? 'NONE', ...(h.role ? { role: h.role } : {}), ...(h.focus ? { focus: h.focus } : {}), ...(h.goal ? { goal: h.goal } : {}) };
  return { ...p, strength: { ...p.strength, enabled: strength }, running: { ...p.running, enabled: running }, crosstraining: { enabled: withCt, ...declared }, hyrox: { enabled: withHr, ...hrDeclared }, priorities };
}

/** Déclarations HYROX : type de séance (rôles que H2 sait composer), objectif, fréquence, coupure récente. */
function HrSection({ p, set, feasibility }: { p: ProfileInput; set: (f: (x: ProfileInput) => ProfileInput) => void; feasibility: readonly HrRoleFeasibility[] | null }) {
  const hr = p.hyrox;
  const statusOf = (k: string) => feasibility?.find((r) => r.role === k)?.status;
  const upd = (x: Partial<ProfileInput['hyrox']>) => set((y) => ({ ...y, hyrox: { ...y.hyrox, ...x } }));
  const balanced = hr.focus === 'balanced';
  return (
    <div className="card">
      <h3>HYROX</h3>
      <div className="stack" role="radiogroup" aria-label="Type de séance HYROX">
        {/* M3.1 — Équilibré : le programme varie les rôles (focus du programme, pas un rôle H2). Recommandé pour préparer une course. */}
        <button type="button" role="radio" aria-checked={balanced} className={`option ${balanced ? 'on' : ''}`} onClick={() => upd({ focus: 'balanced' })}>
          <div><div className="t">{HR_BALANCED_LABEL.title}{hr.goal === 'RACE_PREPARATION' ? ' · recommandé' : ''}</div><div className="tiny">{HR_BALANCED_LABEL.detail}</div></div>
        </button>
        {Object.entries(HR_ROLE_LABELS).map(([k, v]) => (
          <button key={k} type="button" role="radio" aria-checked={!balanced && hr.role === k} className={`option ${!balanced && hr.role === k ? 'on' : ''}`} onClick={() => upd({ role: k, focus: 'specialized' })} data-hr-feasibility={statusOf(k) ?? 'unchecked'}>
            <div><div className="t">{v.title}</div><div className="tiny">{v.detail}</div>{statusOf(k) === 'infeasible' && <div className="tiny"><b>Irréalisable avec votre profil actuel</b></div>}</div>
          </button>
        ))}
      </div>
      <HrFeasibilityNotice p={p} set={set} feasibility={feasibility} />
      {!feasibility && (hr.returnState ?? 'NONE') === 'NONE' && <p className="tiny" style={{ margin: 0 }} data-hr-feasibility-pending>Les types de séance réalisables seront vérifiés par le moteur HYROX dès que votre matériel sera choisi (dernière étape).</p>}
      <div className="stack" role="radiogroup" aria-label="Objectif HYROX">
        {Object.entries(HR_GOAL_LABELS).map(([k, v]) => (
          // Préparer une course : Équilibré proposé par défaut tant qu'aucun type n'a été choisi (jamais un choix écrasé).
          <button key={k} type="button" role="radio" aria-checked={hr.goal === k} className={`option ${hr.goal === k ? 'on' : ''}`} onClick={() => upd({ goal: k as NonNullable<ProfileInput['hyrox']['goal']>, ...(k === 'RACE_PREPARATION' && hr.focus === undefined && hr.role === undefined ? { focus: 'balanced' as const } : {}) })}><span className="t">{v}</span></button>
        ))}
      </div>
      <label className="field">Séances HYROX par semaine
        <select value={hr.sessionsPerWeek ?? ''} onChange={(e) => upd({ sessionsPerWeek: Number(e.target.value) })}>
          {HR_SESSION_CHOICES.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <label className="field">Coupure récente du HYROX
        <select value={hr.returnState ?? ''} onChange={(e) => upd({ returnState: e.target.value as NonNullable<ProfileInput['hyrox']['returnState']> })}>
          {Object.entries(RETURN_STATE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      {hr.returnState !== undefined && hr.returnState !== 'NONE' && <Notice tone="warn">Après une coupure, aucune règle de reprise HYROX n’est encore validée : aucune séance ne sera proposée.</Notice>}
      <p className="tiny" style={{ margin: 0 }}>Chaque séance (structure, stations, doses, course) est composée par le moteur HYROX à partir de ce type de séance (Équilibré : un type différent choisi par le programme au fil des semaines), de votre matériel et de votre historique. L’objectif est transmis sans modifier les doses. Version expérimentale : valeurs de test, aucune simulation complète de course.</p>
    </div>
  );
}

/** Déclarations Cross-training : intention (archétypes que C3 sait composer), fréquence, coupure récente. */
/** RC3.2 A3 — facteurs lus dans la trace du moteur Cross-training, en clair. */
const CT_FACTOR_LABELS: Readonly<Record<string, string>> = { time: 'le temps disponible par jour', equipment: 'le matériel déclaré', level: 'le niveau déclaré', safety: 'la coupure déclarée' };
const ctFactorsText = (c: CtIntentFeasibility): string => {
  const f = c.factors.map((x) => CT_FACTOR_LABELS[x]).filter(Boolean);
  return f.length > 0 ? `En cause : ${f.join(', ')}.` : 'Le moteur ne précise pas quel paramètre bloque : matériel, niveau ou temps disponible.';
};

/**
 * RC3.2 A3 — intention Cross-training IRRÉALISABLE avec le profil déclaré (sonde du moteur réel) : avertissement
 * explicite et options RÉELLEMENT réalisables pour ce profil (aucune table, aucune intention imposée).
 */
export function CtFeasibilityNotice({ p, set, feasibility }: { p: ProfileInput; set: (f: (x: ProfileInput) => ProfileInput) => void; feasibility: readonly CtIntentFeasibility[] | null }) {
  const chosen = feasibility?.find((c) => c.intent === p.crosstraining.intent);
  if (!p.crosstraining.enabled || !chosen || chosen.status !== 'infeasible') return null;
  const options = (feasibility ?? []).filter((c) => c.status === 'feasible');
  const title = CT_INTENT_LABELS[chosen.intent]?.title ?? chosen.intent;
  return (
    <Notice tone="warn">
      <div className="stack" data-ct-infeasible-notice={chosen.intent}>
        <span role="status">Cross-training « {title} » : le moteur ne peut composer aucune séance avec votre profil actuel. {ctFactorsText(chosen)} Aucune séance de Cross-training ne serait proposée.</span>
        {options.length > 0
          ? (
            <>
              <span>Options réalisables avec ce profil :</span>
              <div className="row wrap" role="group" aria-label="Intentions Cross-training réalisables">
                {options.map((c) => (
                  <button key={c.intent} type="button" className="btn secondary" onClick={() => set((y) => ({ ...y, crosstraining: { ...y.crosstraining, intent: c.intent } }))}>Choisir « {CT_INTENT_LABELS[c.intent]?.title ?? c.intent} »</button>
                ))}
              </div>
              <span className="tiny">Vous pouvez aussi modifier votre matériel{p.crosstraining.intent === 'crosstraining.strength_plus_conditioning' ? ' (matériel à charges)' : ''}, votre niveau ou vos disponibilités.</span>
            </>
          )
          : <span>Aucune intention Cross-training n’est réalisable avec ce profil pour l’instant : modifiez le matériel, le niveau ou les disponibilités, ou retirez le Cross-training.</span>}
      </div>
    </Notice>
  );
}

function CtSection({ p, set, feasibility }: { p: ProfileInput; set: (f: (x: ProfileInput) => ProfileInput) => void; feasibility: readonly CtIntentFeasibility[] | null }) {
  const ct = p.crosstraining;
  const upd = (x: Partial<ProfileInput['crosstraining']>) => set((y) => ({ ...y, crosstraining: { ...y.crosstraining, ...x } }));
  const statusOf = (k: string) => feasibility?.find((c) => c.intent === k)?.status;
  return (
    <div className="card">
      <h3>Cross-training</h3>
      <div className="stack" role="radiogroup" aria-label="Intention Cross-training">
        {Object.entries(CT_INTENT_LABELS).map(([k, v]) => (
          <button key={k} type="button" role="radio" aria-checked={ct.intent === k} className={`option ${ct.intent === k ? 'on' : ''}`} onClick={() => upd({ intent: k })} data-ct-feasibility={statusOf(k) ?? 'unchecked'}>
            <div><div className="t">{v.title}</div><div className="tiny">{v.detail}</div>{statusOf(k) === 'infeasible' && <div className="tiny"><b>Irréalisable avec votre profil actuel</b></div>}</div>
          </button>
        ))}
      </div>
      <CtFeasibilityNotice p={p} set={set} feasibility={feasibility} />
      {!feasibility && <p className="tiny" style={{ margin: 0 }} data-ct-feasibility-pending>La faisabilité de l’intention sera vérifiée par le moteur dès que votre matériel sera choisi (dernière étape).</p>}
      <label className="field">Séances de Cross-training par semaine
        <select value={ct.sessionsPerWeek ?? ''} onChange={(e) => upd({ sessionsPerWeek: Number(e.target.value) })}>
          {CT_SESSION_CHOICES.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <label className="field">Coupure récente du Cross-training
        <select value={ct.returnState ?? ''} onChange={(e) => upd({ returnState: e.target.value as NonNullable<ProfileInput['crosstraining']['returnState']> })}>
          {Object.entries(RETURN_STATE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      {ct.returnState !== undefined && ct.returnState !== 'NONE' && <Notice tone="warn">Après une coupure, aucune règle de reprise Cross-training n’est encore validée : aucune séance ne sera proposée.</Notice>}
      <p className="tiny" style={{ margin: 0 }}>Chaque séance (format, mouvements, doses) est composée par le moteur Cross-training à partir de cette intention, de votre matériel et de votre historique. Version expérimentale : valeurs de test.</p>
    </div>
  );
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
  // RC3.4 — date RÉELLE de la dernière course, facultative (absente : comportement antérieur, aucune date inventée).
  const [runDate, setRunDate] = useState('');
  const [perfs, setPerfs] = useState<DeclaredPerformance[]>([]);
  const [addingPerf, setAddingPerf] = useState(false);
  const [noChrono, setNoChrono] = useState(false);
  const choice = choiceOf(p);
  const set = (f: (x: ProfileInput) => ProfileInput) => setP(f);
  const first = p.priorities[0] === 'running' ? 'running' : 'strength';
  const km = runKm === '' ? undefined : Number(runKm);
  const runDateOk = runDate === '' || (/^\d{4}-\d{2}-\d{2}$/.test(runDate) && runDate <= store.clock().today);
  const lastRunOk = (runMin === '' ? runKm === '' && runDate === '' : Number(runMin) > 0 && (km === undefined || (Number.isFinite(km) && km > 0))) && runDateOk;
  const dateOk = targetDate === '' || (/^\d{4}-\d{2}-\d{2}$/.test(targetDate) && targetDate >= store.clock().today);
  const dated = p.running.enabled && p.running.goal !== 'GENERAL_RUNNING' && targetDate !== '' && dateOk;
  const ctOk = !p.crosstraining.enabled || (p.crosstraining.intent !== undefined && p.crosstraining.sessionsPerWeek !== undefined && p.crosstraining.returnState !== undefined);
  const hrOk = !p.hyrox.enabled || ((p.hyrox.focus === 'balanced' || p.hyrox.role !== undefined) && p.hyrox.goal !== undefined && p.hyrox.sessionsPerWeek !== undefined && p.hyrox.returnState !== undefined);
  const strengthOk = !p.strength.enabled || strengthSupportedFrequencies().includes(p.strength.sessionsPerWeek);
  const canNext = step === 0 ? accepted : step === 1 ? choice !== null : step === 2 ? lastRunOk && dateOk && ctOk && hrOk && strengthOk : step === 3 ? p.availability.some((m) => m > 0) : true;
  // RC3.2 A3 — faisabilité des intentions Cross-training, sondée auprès du moteur réel dès que le matériel est connu
  // (recalculée quand le niveau, le matériel ou les disponibilités changent ; coupure déclarée : avis dédié).
  const ctProbeKey = p.crosstraining.enabled && equipmentChosen(p) && (p.crosstraining.returnState ?? 'NONE') === 'NONE' ? JSON.stringify([p.level, p.equipment.items, p.availability]) : null;
  const ctFeasibility = useMemo(() => (ctProbeKey ? ctIntentFeasibility(p, store.clock()) : null), [ctProbeKey]);
  // RC4.2 — HYROX : même sonde du moteur réel, par type de séance (niveau, matériel, disponibilités déclarés).
  const hrProbeKey = p.hyrox.enabled && equipmentChosen(p) && (p.hyrox.returnState ?? 'NONE') === 'NONE' ? JSON.stringify([p.level, p.equipment.items, p.availability, p.hyrox.goal]) : null;
  const hrFeasibility = useMemo(() => (hrProbeKey ? hyroxRoleFeasibility(p, store.clock()) : null), [hrProbeKey]);
  // RC3.2 — bouton désactivé : TOUJOURS expliqué (ce qui manque, où le saisir).
  const missing = (label: string, fields: readonly [boolean, string][]) => { const m = fields.filter(([ok]) => !ok).map(([, f]) => f); return m.length > 0 ? [`${label} : ${m.join(', ')}.`] : []; };
  const blockers: string[] = step === 0 ? (accepted ? [] : ['Cochez « J’ai compris » pour commencer.'])
    : step === 1 ? (choice === null ? ['Choisissez au moins un sport.'] : [])
      : step === 2 ? [
        ...(lastRunOk ? [] : [runDateOk ? 'Dernière course : indiquez la durée en minutes (la distance ou la date seules ne suffisent pas), ou videz ces champs.' : 'Dernière course : la date ne peut pas être dans le futur.']),
        ...(dateOk ? [] : ['Date de l’objectif : choisissez une date à venir, ou laissez le champ vide.']),
        ...(strengthOk ? [] : ['Musculation : choisissez un nombre de séances pris en charge.']),
        ...(p.crosstraining.enabled ? missing('Cross-training', [[p.crosstraining.intent !== undefined, 'choisissez une intention'], [p.crosstraining.sessionsPerWeek !== undefined, 'le nombre de séances par semaine'], [p.crosstraining.returnState !== undefined, 'indiquez une éventuelle coupure récente']]) : []),
        ...(p.hyrox.enabled ? missing('HYROX', [[p.hyrox.focus === 'balanced' || p.hyrox.role !== undefined, 'choisissez un type de séance'], [p.hyrox.goal !== undefined, 'choisissez un objectif'], [p.hyrox.sessionsPerWeek !== undefined, 'le nombre de séances par semaine'], [p.hyrox.returnState !== undefined, 'indiquez une éventuelle coupure récente']]) : []),
      ]
        : step === 3 ? (p.availability.some((m) => m > 0) ? [] : ['Indiquez au moins un jour disponible.'])
          : [
            ...(preview?.sessionInProgress != null ? ['Une séance est en cours : terminez-la ou abandonnez-la avant de recréer le programme.'] : []),
            ...(needsEquipment(p) && !equipmentChosen(p) ? ['Matériel : choisissez votre lieu d’entraînement.'] : []),
          ];

  const create = () => {
    const o: Beta0ProgrammeOptions = {
      ...(p.running.enabled && perfs.length > 0 ? { performances: perfs } : {}),
      ...(p.running.enabled && perfs.length === 0 && noChrono ? { requestTest: true } : {}),
      ...(p.running.enabled && targetDate && p.running.goal !== 'GENERAL_RUNNING' ? { runningTargetDate: targetDate } : {}),
      ...(p.running.enabled && runMin !== '' ? { lastRun: { realizedDurationS: Number(runMin) * 60, ...(km !== undefined ? { distanceM: km * 1000 } : {}), difficulty: runFeel, ...(runDate !== '' ? { date: runDate } : {}) } } : {}),
    };
    // P1 — matériel : choix explicite CONFIRMÉ (horodaté) ; sans sport à matériel et sans choix, aucun matériel supposé.
    const withEquipment = (c: { now: string }): ProfileInput => needsEquipment(p)
      ? { ...p, equipment: { ...p.equipment, confirmedAt: normalizeInstant(c.now) } }
      : equipmentChosen(p) ? p : { ...p, equipment: { presetId: 'preset.none', items: [] } };
    const ok = store.apply((s, c) => mode === 'recreate'
      ? recreateBeta0Programme(s, withEquipment(c), c, o)
      : createBeta0Programme(s, { ...withEquipment(c), acceptedProvisionalAt: existing ? p.acceptedProvisionalAt : normalizeInstant(c.now) }, c, o));
    if (ok) onDone?.();
  };

  return (
    <div className="screen wizard">
      {step === 0 ? (
        <div className="hero" style={{ minHeight: 280 }}>
          <div className="hero-brand">KAI<span>RO</span></div>
          <h1>Entraîne-toi.<br />Sans rien inventer.</h1>
          <p>Musculation, course, Cross-training, HYROX : un programme construit par des moteurs d’entraînement, semaine après semaine.</p>
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
            <button key={c.id} type="button" role="radio" aria-checked={choice === c.id} className={`option ${choice === c.id ? 'on' : ''}`} onClick={() => setP(withChoice(p, c.id, first, c.id === 'crosstraining' ? true : p.crosstraining.enabled && choice !== 'crosstraining', c.id === 'hyrox' ? true : p.hyrox.enabled && choice !== 'hyrox'))}>
              <div><div className="t">{c.title}</div><div className="tiny">{c.detail}</div></div>
            </button>
          ))}
          {choice !== null && choice !== 'crosstraining' && choice !== 'hyrox' && (
            <label className="check"><input type="checkbox" checked={p.crosstraining.enabled} onChange={(e) => setP(withChoice(p, choice, first, e.target.checked))} />Ajouter du Cross-training</label>
          )}
          {choice !== null && choice !== 'hyrox' && (
            <label className="check"><input type="checkbox" checked={p.hyrox.enabled} onChange={(e) => setP(withChoice(p, choice, first, p.crosstraining.enabled, e.target.checked))} />Ajouter HYROX</label>
          )}
        </div>
      )}

      {step === 2 && (
        <>
          <label className="field">Prénom (facultatif)<input type="text" value={p.displayName} maxLength={40} onChange={(e) => setP({ ...p, displayName: e.target.value })} /></label>
          <GoalsSection p={p} set={set} beta0 />
          {p.crosstraining.enabled && <CtSection p={p} set={set} feasibility={ctFeasibility} />}
          {p.hyrox.enabled && <HrSection p={p} set={set} feasibility={hrFeasibility} />}
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
              {perfs.length === 0 && noChrono && (runMin === '' || runKm === '') && (
                <p className="tiny" data-test-needs-distance style={{ margin: 0 }}>Le test a besoin d’une course récente AVEC sa distance (ci-dessous). Sans elle, une course facile sera prévue à la place et vous pourrez redemander le test plus tard.</p>
              )}
              <h3>Votre dernière course</h3>
              <p className="tiny" style={{ margin: 0 }}>Les séances de course reprennent ce que vous avez réellement couru. Sans course récente, elles ne pourront pas être proposées.</p>
              <div className="row">
                <label className="field">Durée (min)<input inputMode="numeric" value={runMin} placeholder="ex. 30" onChange={(e) => setRunMin(e.target.value.replace(/[^0-9]/g, ''))} /></label>
                <label className="field">Distance (km)<input inputMode="decimal" value={runKm} placeholder="facultatif" onChange={(e) => setRunKm(e.target.value.replace(',', '.').replace(/[^0-9.]/g, ''))} /></label>
              </div>
              <label className="field">Date de cette course (facultatif)<input type="date" max={store.clock().today} value={runDate} onChange={(e) => setRunDate(e.target.value)} /></label>
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
          {(p.strength.enabled || p.crosstraining.enabled || p.hyrox.enabled) && <><div className="section-title">Matériel</div><EquipmentSection p={p} set={set} /></>}
          <CtFeasibilityNotice p={p} set={set} feasibility={ctFeasibility} />
          <HrFeasibilityNotice p={p} set={set} feasibility={hrFeasibility} />
          <div className="card">
            <h3>Récapitulatif</h3>
            <div className="small muted">
              {[p.strength.enabled && `Musculation · ${STRENGTH_GOAL_LABELS[p.strength.goal] ?? ''} · ${String(p.strength.sessionsPerWeek)}/sem.`, p.running.enabled && `Course · ${RUNNING_GOAL_LABELS[p.running.goal] ?? ''} · ${String(p.running.sessionsPerWeek)}/sem.`, p.crosstraining.enabled && `Cross-training · ${CT_INTENT_LABELS[p.crosstraining.intent ?? '']?.title ?? ''} · ${String(p.crosstraining.sessionsPerWeek ?? '')}/sem.`, p.hyrox.enabled && `HYROX · ${p.hyrox.focus === 'balanced' ? HR_BALANCED_LABEL.title : HR_ROLE_LABELS[p.hyrox.role ?? '']?.title ?? ''} · ${HR_GOAL_LABELS[p.hyrox.goal ?? ''] ?? ''} · ${String(p.hyrox.sessionsPerWeek ?? '')}/sem.`].filter(Boolean).join(' — ')}
            </div>
            <div className="small muted">{String(p.availability.filter((m) => m > 0).length)} jours disponibles par semaine</div>
            {dated ? <div className="small"><b>Objectif {RUNNING_GOAL_LABELS[p.running.goal]} le {formatDate(targetDate)}</b></div> : null}
            <p className="small" style={{ margin: 0 }}>{dated ? 'Votre programme évolue semaine après semaine jusqu’à votre objectif.' : 'Votre programme évolue semaine après semaine, sans date de fin.'} Chaque semaine est construite à partir de ce que vous avez réellement fait.</p>
          </div>
          {preview && <RecreationNotice preview={preview} />}
        </>
      )}

      {blockers.length > 0 && (
        <div className="notice warn" role="status" id="next-blockers" data-next-blockers>
          <div className="stack">
            <strong>Pour continuer :</strong>
            <ul style={{ margin: 0, paddingLeft: 18 }}>{blockers.map((b) => <li key={b}>{b}</li>)}</ul>
          </div>
        </div>
      )}
      <div className="wizard-actions" role="group" aria-label="Navigation de l’assistant">
        {(step > (existing ? 1 : 0)) && <button className="btn secondary" onClick={() => setStep(step - 1)}>Retour</button>}
        {step === (existing ? 1 : 0) && onCancel && <button className="btn secondary" onClick={onCancel}>Annuler</button>}
        {step < STEPS.length - 1
          ? <button className="btn primary block" disabled={!canNext} aria-describedby={blockers.length > 0 ? 'next-blockers' : undefined} onClick={() => setStep(step + 1)}>{step === 0 ? 'Commencer' : 'Continuer'}</button>
          : <button className="btn primary block" disabled={blockers.length > 0} onClick={create}>{mode === 'recreate' ? 'Recréer mon programme' : 'Créer mon programme'}</button>}
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
