/**
 * Saisie d'une OBSERVATION Course (performance réalisée ou Critical Speed mesurée ailleurs), au format du contrat
 * Running (`DeclaredPerformance`). Aucun calcul sportif : chrono et allure sont saisis par composants (h, min, s) au
 * clavier numérique puis assemblés en secondes ; toute saisie refusée est expliquée.
 */
import { useState } from 'react';
import type { DeclaredPerformance } from '@hybridsport/app-core';
import { DurationInput } from './DurationInput.js';
import { durationFromParts, EMPTY_DURATION } from './duration.js';
import type { DurationParts } from './duration.js';

type Kind = DeclaredPerformance['kind'];
const KINDS: readonly { id: Kind; label: string; detail: string }[] = [
  { id: 'RACE_RESULT', label: 'Course officielle', detail: 'Résultat d’une course chronométrée' },
  { id: 'TIME_TRIAL', label: 'Chrono personnel', detail: 'Effort maximal seul, ex. un test sur piste' },
  { id: 'CRITICAL_SPEED_TEST', label: 'Critical Speed mesurée', detail: 'Valeur issue d’un test dédié (laboratoire, appareil, coach)' },
];
/** Distances officielles proposées (définitions d'épreuves), plus une saisie libre. */
const DISTANCES: readonly { m: number; label: string }[] = [
  { m: 3000, label: '3 km' }, { m: 5000, label: '5 km' }, { m: 10000, label: '10 km' }, { m: 21097.5, label: 'Semi' }, { m: 42195, label: 'Marathon' },
];

export function PerformanceForm({ today, onAdd, onCancel }: { today: string; onAdd: (p: DeclaredPerformance) => void; onCancel?: () => void }) {
  const [kind, setKind] = useState<Kind>('TIME_TRIAL');
  const [distance, setDistance] = useState<number | 'other'>(5000);
  const [otherKm, setOtherKm] = useState('');
  const [chrono, setChrono] = useState<DurationParts>(EMPTY_DURATION);
  const [date, setDate] = useState('');
  const [measured, setMeasured] = useState(true);
  const [conditions, setConditions] = useState<'NORMAL' | 'ATYPICAL' | 'UNKNOWN'>('NORMAL');
  const [interruption, setInterruption] = useState<'NONE' | 'YES' | 'UNKNOWN'>('NONE');
  const [pace, setPace] = useState<DurationParts>(EMPTY_DURATION);
  const [tried, setTried] = useState(false);
  const [trials, setTrials] = useState('');
  const [model, setModel] = useState('HYPERBOLIC_2_PARAMETERS');
  const cs = kind === 'CRITICAL_SPEED_TEST';
  const distanceM = distance === 'other' ? (otherKm === '' ? null : Number(otherKm) * 1000) : distance;
  // Heures proposées dès 10 km (ou distance libre) : la performance peut dépasser une heure.
  const withHours = distance === 'other' || (typeof distance === 'number' && distance >= 10000);
  const duration = durationFromParts(chrono, withHours, 'le chrono');
  const paceR = durationFromParts(pace, false, 'l’allure');
  const errors: Record<string, string> = {};
  if (!cs && (distanceM === null || !Number.isFinite(distanceM) || distanceM <= 0)) errors.distance = 'Indiquez une distance supérieure à zéro.';
  if (!cs && !duration.ok) errors.chrono = duration.error;
  if (cs && !paceR.ok) errors.pace = paceR.error;
  if (cs && !(Number(trials) >= 1 && Number.isInteger(Number(trials)))) errors.trials = 'Indiquez le nombre d’essais (au moins 1).';
  if (date === '') errors.date = 'Indiquez la date de réalisation.';
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.date = 'Date illisible.';
  else if (date > today) errors.date = 'La date ne peut pas être dans le futur.';
  const show = (k: string) => (tried ? errors[k] ?? null : null);
  const submit = () => {
    setTried(true);
    if (Object.keys(errors).length > 0) return;
    const common = { date, conditions, interruptionSince: interruption };
    onAdd(cs
      ? { kind, ...common, paceSecPerKm: paceR.ok ? paceR.seconds : 0, trials: Number(trials), model }
      : { kind, ...common, distanceM: distanceM ?? 0, durationS: duration.ok ? duration.seconds : 0, measuredCourse: measured });
  };
  return (
    <div className="card perf-form" aria-label="Ajouter une performance">
      <div className="stack" role="radiogroup" aria-label="Type de performance">
        {KINDS.map((k) => (
          <button key={k.id} type="button" role="radio" aria-checked={kind === k.id} className={`option ${kind === k.id ? 'on' : ''}`} onClick={() => { setKind(k.id); setMeasured(k.id === 'RACE_RESULT' || measured); }}>
            <div><div className="t">{k.label}</div><div className="tiny">{k.detail}</div></div>
          </button>
        ))}
      </div>
      {!cs ? (
        <>
          <div className="row wrap" role="radiogroup" aria-label="Distance">
            {DISTANCES.map((d) => <button key={d.m} type="button" role="radio" aria-checked={distance === d.m} className={`chip ${distance === d.m ? 'on' : ''}`} onClick={() => setDistance(d.m)}>{d.label}</button>)}
            <button type="button" role="radio" aria-checked={distance === 'other'} className={`chip ${distance === 'other' ? 'on' : ''}`} onClick={() => setDistance('other')}>Autre</button>
          </div>
          {distance === 'other' && <label className="field">Distance (km)<input inputMode="decimal" value={otherKm} onChange={(e) => setOtherKm(e.target.value.replace(',', '.').replace(/[^0-9.]/g, ''))} placeholder="ex. 8" /></label>}
          {show('distance') && <div className="k-dur-error" role="alert">{show('distance')}</div>}
          <DurationInput label="Chrono" value={chrono} onChange={setChrono} withHours={withHours} error={show('chrono')} />
          <label className="check"><input type="checkbox" checked={measured} onChange={(e) => setMeasured(e.target.checked)} />Distance mesurée (piste, course officielle, parcours étalonné)</label>
        </>
      ) : (
        <>
          <DurationInput label="Allure à la Critical Speed (par km)" value={pace} onChange={setPace} withHours={false} error={show('pace')} />
          <label className="field">Nombre d’essais du test<input type="text" inputMode="numeric" pattern="[0-9]*" value={trials} onChange={(e) => setTrials(e.target.value.replace(/[^0-9]/g, ''))} placeholder="3" /></label>
          {show('trials') && <div className="k-dur-error" role="alert">{show('trials')}</div>}
          <label className="field">Modèle utilisé
            <select value={model} onChange={(e) => setModel(e.target.value)}>
              <option value="HYPERBOLIC_2_PARAMETERS">Modèle à 2 paramètres (hyperbolique)</option>
              <option value="DEVICE_OR_LAB_UNSPECIFIED">Fourni par l’appareil ou le laboratoire</option>
            </select>
          </label>
        </>
      )}
      <label className="field">Date de réalisation<input type="date" max={today} value={date} aria-invalid={show('date') ? true : undefined} onChange={(e) => setDate(e.target.value)} /></label>
      {show('date') && <div className="k-dur-error" role="alert">{show('date')}</div>}
      <label className="field">Conditions
        <select value={conditions} onChange={(e) => setConditions(e.target.value as typeof conditions)}>
          <option value="NORMAL">Normales</option>
          <option value="ATYPICAL">Atypiques (chaleur, vent, dénivelé…)</option>
          <option value="UNKNOWN">Je ne sais pas</option>
        </select>
      </label>
      <label className="field">Arrêt de la course depuis ?
        <select value={interruption} onChange={(e) => setInterruption(e.target.value as typeof interruption)}>
          <option value="NONE">Non</option>
          <option value="YES">Oui</option>
          <option value="UNKNOWN">Je ne sais pas</option>
        </select>
      </label>
      <div className="row">
        {onCancel && <button type="button" className="btn secondary" onClick={onCancel}>Annuler</button>}
        <button type="button" className="btn primary block" onClick={submit}>Ajouter cette performance</button>
      </div>
    </div>
  );
}
