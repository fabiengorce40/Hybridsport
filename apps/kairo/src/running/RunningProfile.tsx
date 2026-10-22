/**
 * Profil Course : performances observées (saisie, historique complet) et ce que le MOTEUR Running en déduit.
 * Tout ce qui est affiché vient de `selectRunningProfile` (app-core → moteur) ; aucune métrique calculée ici.
 */
import { useState } from 'react';
import { declarePerformanceAndRetry, DIFFICULTY_LABELS, logTrainingRun, paceLabel, requalifyRunningPerformance, RUNNING_GOAL_LABELS, requestRunningTest, selectRunningProfile } from '@hybridsport/app-core';
import type { DeclaredPerformance, Feedback, KeySessionAccess, ReferenceView, RunningProfileView } from '@hybridsport/app-core';
import { useStore } from '../store.js';
import { formatDate, Notice } from '../ui.js';
import { PerformanceForm } from './PerformanceForm.js';
import type { PerformanceEntry } from './PerformanceForm.js';
import { FreeRunEntry } from './FreeRunForm.js';
import { formatChrono } from './duration.js';

const TYPE_LABELS: Readonly<Record<string, string>> = {
  RACE_RESULT: 'Course officielle', TIME_TRIAL: 'Chrono', CRITICAL_SPEED_TEST: 'Critical Speed', LAB_THRESHOLD: 'Seuil (laboratoire)', FIELD_THRESHOLD: 'Seuil (terrain)',
  VMA_TEST: 'Test VMA', VO2MAX_TEST: 'Test VO₂max', TRAINING_OBSERVATION: 'Observation d’entraînement', RPE_BASED: 'Effort perçu', CALIBRATION_RESULT: 'Calibration', USER_DECLARED: 'Déclaration',
};
const SOURCE_LABELS: Readonly<Record<string, string>> = { USER_DECLARED: 'déclarée par vous', APP_RECORDED: 'test KAIRO', IMPORTED: 'importée', LAB: 'laboratoire', COACH: 'coach' };
const DECISION_LABELS: Readonly<Record<string, string>> = {
  INTENSITY_TARGETING: 'repère d’intensité', THRESHOLD_BOUNDARY: 'seuil', SEVERE_DOMAIN: 'séances VO₂', RACE_SPECIFIC_PACE: 'allure de l’objectif',
};
const CONFIDENCE_LABELS: Readonly<Record<string, string>> = { HIGH: 'fiabilité élevée', MEDIUM: 'fiabilité moyenne', LOW: 'fiabilité faible', NONE: 'inutilisable' };
const PACE_CAUSES: Readonly<Record<string, string>> = {
  ANCHOR_REFERENCE_MISSING: 'il faut une course ou un chrono récent de 3 à 5 km',
  NO_WEARABLE: 'sans montre GPS, la cible reste à l’effort',
  PACE_TARGETS_DISABLED: 'les cibles d’allure ne sont pas activées',
  ANCHOR_UNRESOLVED: 'la règle d’allure n’est pas disponible',
  WIDTH_UNRESOLVED: 'la règle d’allure n’est pas disponible',
  REFERENCE_CONFIDENCE_INSUFFICIENT: 'la référence n’est pas assez fiable (ancienne, conditions atypiques…)',
  NOT_PACED_BY_RULE: 'ces séances se font à l’effort',
};
const DOMAIN_LABELS: Readonly<Record<string, string>> = { EASY_LOW: 'Facile', STEADY: 'Soutenu', THRESHOLD_LIKE: 'Seuil', SEVERE: 'VO₂ / sévère', TEST: 'Test' };
const TEST_STATUS: Readonly<Record<string, string>> = {
  requested: 'demandé', scheduled: 'programmé', not_planned: 'non planifié (créneau trop court ou course récente avec distance manquante)', content_unavailable: 'indisponible', completed: 'réalisé', result_missing: 'non réalisé',
};

/** Résumé d'une performance saisie (affichage). */
export function performanceText(x: DeclaredPerformance): string {
  return x.kind === 'CRITICAL_SPEED_TEST'
    ? `Critical Speed ${formatChrono(x.paceSecPerKm)} /km`
    : `${x.kind === 'RACE_RESULT' ? 'course' : 'chrono'} ${km(x.distanceM)} en ${formatChrono(x.durationS)}`;
}
/** Résumé d'une saisie (performance ou sortie d'entraînement). */
export function entryText(x: PerformanceEntry): string {
  return x.type === 'performance' ? performanceText(x.value) : `sortie d’entraînement ${km(x.value.distanceM ?? 0)} en ${formatChrono(x.value.durationS)}`;
}

const km = (m: number): string => (m === 21097.5 ? 'Semi' : m === 42195 ? 'Marathon' : `${String(Math.round(m) / 1000).replace('.', ',')} km`);
const recency = (r: ReferenceView, w: RunningProfileView['recencyWeeks']): string => ({
  RECENT: `récente${w ? ` (≤ ${String(w.recent)} sem.)` : ''}`, AGING: `vieillissante${w ? ` (≤ ${String(w.aging)} sem.)` : ''}`, STALE: 'ancienne', FUTURE: 'date future', UNKNOWN: 'fraîcheur inconnue',
}[r.recency]);
const keyText = (k: KeySessionAccess): string => (k.status === 'available' ? 'disponibles' : k.status === 'test_required' ? 'un test récent est nécessaire' : 'non disponibles');
/** REKKA — ce que les données autorisent n'est jamais présenté comme programmé : la composition de l'objectif décide. */
const plannedText = (planned: boolean, goal: string): string => (planned ? '' : ` · non prévues par l’objectif « ${goal} » (footings)`);

/** REKKA — requalification CONFIRMÉE d'une performance déclarée en sortie d'entraînement (rien sans confirmation). */
export function RequalifyAction({ r }: { r: ReferenceView }) {
  const store = useStore();
  const [open, setOpen] = useState(false);
  const [feel, setFeel] = useState<Feedback['difficulty'] | 'UNKNOWN'>('UNKNOWN');
  if (!open) return <button type="button" className="btn ghost" data-requalify={r.referenceId} onClick={() => setOpen(true)}>Ce n’était pas un effort maximal</button>;
  return (
    <div className="stack" role="group" aria-label="Requalifier en sortie d’entraînement" data-requalify-confirm>
      <p className="small" style={{ margin: 0 }}>Cette course deviendra une <b>sortie d’entraînement</b> : elle restera dans votre historique, ne servira plus de référence (allure VO₂, seuil, séances clés) et servira de base aux footings selon son ancienneté. Les séances de course refusées cette semaine seront retentées.</p>
      <label className="field">Ressenti de cette sortie
        <select value={feel} onChange={(e) => setFeel(e.target.value as typeof feel)}>
          <option value="UNKNOWN">Je ne sais plus</option>
          {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      <div className="row">
        <button type="button" className="btn secondary" onClick={() => setOpen(false)}>Annuler</button>
        <button type="button" className="btn primary block" onClick={() => { if (store.apply((s, c) => requalifyRunningPerformance(s, c, r.referenceId, { confirmed: true, ...(feel !== 'UNKNOWN' ? { difficulty: feel } : {}) }))) setOpen(false); }}>Confirmer : c’était une sortie</button>
      </div>
    </div>
  );
}

function ReferenceRow({ r, w, fresh = false }: { r: ReferenceView; w: RunningProfileView['recencyWeeks']; fresh?: boolean }) {
  return (
    <div className={`card ${fresh ? 'accent' : ''}`} style={{ gap: 4 }} aria-label={`${TYPE_LABELS[r.type] ?? r.type} du ${formatDate(r.date.slice(0, 10))}`}>
      <div className="row between">
        <strong>{r.requalified ? 'Sortie d’entraînement' : TYPE_LABELS[r.type] ?? r.type}{r.distanceM !== null ? ` · ${km(r.distanceM)}` : ''}</strong>
        <span className={`badge ${r.recency === 'RECENT' ? 'done' : 'neutral'}`}>{recency(r, w)}</span>
      </div>
      <div className="small num">
        {r.durationS !== null ? formatChrono(r.durationS) : null}
        {r.paceSecPerKm !== null ? `${r.durationS !== null ? ' · ' : ''}${paceLabel(r.paceSecPerKm)} /km` : null}
        {r.trials !== null ? ` · ${String(r.trials)} essais` : ''}
      </div>
      <div className="tiny">{formatDate(r.date.slice(0, 10))} · {SOURCE_LABELS[r.source] ?? r.source}{r.selectedFor.length > 0 ? ` · retenue pour : ${r.selectedFor.map((d) => DECISION_LABELS[d] ?? d).join(', ')}` : ''}</div>
      {r.requalified && <div className="tiny" data-requalified>Requalifiée en sortie d’entraînement le {formatDate(r.requalified.at.slice(0, 10))} : n’est plus une référence de performance.</div>}
      {r.requalifiable && <RequalifyAction r={r} />}
    </div>
  );
}

/** Ce que le moteur déduit des références (uniquement ses résultats, sinon « données manquantes »). */
export function ComputedProfile({ v, goal }: { v: RunningProfileView; goal?: string }) {
  const pace = v.severePace;
  const anchor = pace.status === 'pace' ? v.references.find((r) => r.referenceId === pace.referenceId) : undefined;
  const g = goal ?? '';
  return (
    <div className="stack-3">
      <div className="card">
        <h3>Séances clés</h3>
        <div className="small">Seuil : {keyText(v.keySessions.threshold)}{plannedText(v.plannedByGoal.threshold, g)}</div>
        <div className="small">VO₂ / intervalles : {keyText(v.keySessions.severe)}{plannedText(v.plannedByGoal.severe, g)}</div>
        <div className="tiny">Sans test maximal, vos séances restent guidées par l’effort perçu et progressent selon vos ressentis.</div>
      </div>
      <div className="card">
        <h3>Allure des séances VO₂</h3>
        {pace.status === 'pace'
          ? <div className="small num"><b>{paceLabel(pace.minSecPerKm)}–{paceLabel(pace.maxSecPerKm)} /km</b> · {CONFIDENCE_LABELS[pace.confidence]}{anchor ? ` · estimée depuis votre ${(TYPE_LABELS[anchor.type] ?? anchor.type).toLowerCase()} du ${formatDate(anchor.date.slice(0, 10))}` : ''}</div>
          : <div className="small">Non calculable : {pace.causes.map((c) => PACE_CAUSES[c] ?? c).join(' ; ')}. Les séances restent guidées par l’effort.</div>}
      </div>
      <div className="card">
        <h3>Critical Speed</h3>
        {v.criticalSpeed.status === 'declared'
          ? <div className="small num"><b>{paceLabel(v.criticalSpeed.paceSecPerKm)} /km</b> · mesurée le {formatDate(v.criticalSpeed.date.slice(0, 10))}{v.criticalSpeed.trials !== null ? ` · ${String(v.criticalSpeed.trials)} essais` : ''}</div>
          : <div className="small">Données manquantes. KAIRO ne calcule pas de Critical Speed : elle doit venir d’un test dédié. Aucun modèle validé ne la déduit de vos chronos.</div>}
      </div>
      <div className="card">
        <h3>Domaines d’intensité</h3>
        {v.effortDomains.status !== 'unavailable' ? (
          <>
            <div className="small">Repères d’effort perçu (échelle 0–10){v.effortDomains.status === 'candidate' ? ', valeurs en cours de validation' : ''} :</div>
            <div className="small num">{Object.entries(v.effortDomains.bands).map(([k, b]) => `${DOMAIN_LABELS[k] ?? k} ${b.min !== undefined ? String(b.min) : '0'}–${b.max !== undefined ? String(b.max) : '10'}`).join(' · ')}</div>
          </>
        ) : <div className="small">Non disponibles.</div>}
        <div className="tiny">Aucune zone d’allure : aucune règle validée ne les définit encore.</div>
      </div>
      <div className="card">
        <h3>Prédiction de chrono</h3>
        <div className="small">Non disponible : aucun modèle de performance validé ne convertit un chrono d’une distance à l’autre.</div>
      </div>
      {v.conflicts.length > 0 && <Notice tone="warn">Certaines performances à la même distance se contredisent : un test de calibration sera proposé.</Notice>}
    </div>
  );
}

export function RunningProfileScreen({ onBack }: { onBack?: () => void }) {
  const store = useStore();
  const today = store.clock().today;
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState<{ text: string; id: string } | null>(null);
  const v = selectRunningProfile(store.state, today);
  const p = store.state.profile;
  const goal = store.state.programmeState?.definition.goals.find((g) => g.sport === 'running');
  if (!v || !p) return <div className="screen"><h1 className="screen-title">Profil Course</h1><div className="empty">La course n’est pas activée.</div></div>;
  const add = (x: PerformanceEntry) => {
    const before = new Set(store.state.running.references.map((r) => r.referenceId));
    let id = '';
    // REKKA — sortie d'entraînement : course réalisée (jamais une référence) ; dans les deux cas, refus de la semaine retentés.
    const ok = store.apply((s, c) => {
      if (x.type === 'training') return logTrainingRun(s, c, x.value);
      const next = declarePerformanceAndRetry(s, c, x.value);
      id = next.running.references.find((r) => !before.has(r.referenceId))?.referenceId ?? '';
      return next;
    });
    if (ok) { setAdding(false); setAdded({ text: entryText(x), id }); }
  };
  const testOpen = v.test?.status === 'requested' || v.test?.status === 'scheduled';
  return (
    <div className="screen">
      <div className="row between"><h1 className="screen-title">Profil Course</h1>{onBack && <button className="btn ghost" onClick={onBack}>Fermer</button>}</div>

      <div className="section-title">Niveau actuel</div>
      {v.references.length === 0 && <div className="empty small">Aucune performance enregistrée.</div>}
      {added && <Notice><span role="status">{added.id === '' ? 'Sortie ajoutée' : 'Performance ajoutée'} : {added.text}.</span></Notice>}
      {v.references.map((r) => <ReferenceRow key={r.referenceId} r={r} w={v.recencyWeeks} fresh={r.referenceId === added?.id} />)}
      {adding ? <PerformanceForm today={today} onAdd={add} onCancel={() => setAdding(false)} /> : <button className="btn secondary" onClick={() => setAdding(true)}>Ajouter une performance</button>}
      {store.state.programmeState && (
        testOpen
          ? <Notice>Test chronométré {TEST_STATUS[v.test?.status ?? ''] ?? ''} : il apparaîtra dans votre planning.</Notice>
          : <button className="btn secondary" onClick={() => store.apply((s, c) => requestRunningTest(s, c))}>Je n’ai pas de chrono récent : programmer un test</button>
      )}
      {v.test && !testOpen && <div className="tiny">Dernier test : {TEST_STATUS[v.test.status] ?? v.test.status}.</div>}

      <div className="section-title">Courses hors programme</div>
      <p className="tiny" style={{ margin: 0 }}>Une course faite en dehors du programme compte dans votre historique. Avec sa distance, elle fournit l’allure observée qui permet de programmer un test chronométré.</p>
      <FreeRunEntry />

      <div className="section-title">Objectif</div>
      <div className="card" style={{ gap: 4 }}>
        <strong>{RUNNING_GOAL_LABELS[p.running.goal]}</strong>
        <div className="small muted">{goal && 'targetDate' in goal && goal.targetDate ? `le ${formatDate(goal.targetDate)}` : 'sans date'}</div>
        <div className="tiny">L’objectif n’est jamais utilisé comme une performance réalisée.</div>
      </div>

      <div className="section-title">Ce que KAIRO en déduit</div>
      <ComputedProfile v={v} goal={RUNNING_GOAL_LABELS[p.running.goal]} />
    </div>
  );
}
