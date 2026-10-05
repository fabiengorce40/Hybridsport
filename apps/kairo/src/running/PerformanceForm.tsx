/**
 * Saisie d'une OBSERVATION Course (performance réalisée ou Critical Speed mesurée ailleurs), au format du contrat
 * Running (`DeclaredPerformance`). Aucun calcul : seule la lecture d'un chrono ou d'une allure tapés au clavier.
 */
import { useState } from 'react';
import type { DeclaredPerformance } from '@hybridsport/app-core';

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

/** « 45:00 » ou « 1:35:20 » → secondes ; null si illisible. */
export function parseChrono(text: string): number | null {
  const parts = text.trim().split(':');
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null;
  const n = parts.map(Number);
  const [h, m, s] = n.length === 3 ? n as [number, number, number] : [0, n[0] ?? 0, n[1] ?? 0];
  if (m >= 60 && n.length === 3) return null;
  if (s >= 60) return null;
  const total = h * 3600 + m * 60 + s;
  return total > 0 ? total : null;
}

export function PerformanceForm({ today, onAdd, onCancel }: { today: string; onAdd: (p: DeclaredPerformance) => void; onCancel?: () => void }) {
  const [kind, setKind] = useState<Kind>('TIME_TRIAL');
  const [distance, setDistance] = useState<number | 'other'>(5000);
  const [otherKm, setOtherKm] = useState('');
  const [chrono, setChrono] = useState('');
  const [date, setDate] = useState('');
  const [measured, setMeasured] = useState(true);
  const [conditions, setConditions] = useState<'NORMAL' | 'ATYPICAL' | 'UNKNOWN'>('NORMAL');
  const [interruption, setInterruption] = useState<'NONE' | 'YES' | 'UNKNOWN'>('NONE');
  const [pace, setPace] = useState('');
  const [trials, setTrials] = useState('');
  const [model, setModel] = useState('HYPERBOLIC_2_PARAMETERS');
  const cs = kind === 'CRITICAL_SPEED_TEST';
  const distanceM = distance === 'other' ? (otherKm === '' ? null : Number(otherKm) * 1000) : distance;
  const durationS = parseChrono(chrono);
  const paceS = parseChrono(pace);
  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= today;
  const ok = dateOk && (cs ? paceS !== null && Number(trials) >= 1 && Number.isInteger(Number(trials)) : distanceM !== null && Number.isFinite(distanceM) && distanceM > 0 && durationS !== null);
  const submit = () => {
    if (!ok) return;
    const common = { date, conditions, interruptionSince: interruption };
    onAdd(cs
      ? { kind, ...common, paceSecPerKm: paceS ?? 0, trials: Number(trials), model }
      : { kind, ...common, distanceM: distanceM ?? 0, durationS: durationS ?? 0, measuredCourse: measured });
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
          <label className="field">Chrono (min:s ou h:min:s)<input inputMode="numeric" value={chrono} onChange={(e) => setChrono(e.target.value.replace(/[^0-9:]/g, ''))} placeholder="45:00" /></label>
          <label className="check"><input type="checkbox" checked={measured} onChange={(e) => setMeasured(e.target.checked)} />Distance mesurée (piste, course officielle, parcours étalonné)</label>
        </>
      ) : (
        <>
          <label className="field">Allure à la Critical Speed (min:s par km)<input inputMode="numeric" value={pace} onChange={(e) => setPace(e.target.value.replace(/[^0-9:]/g, ''))} placeholder="4:30" /></label>
          <label className="field">Nombre d’essais du test<input inputMode="numeric" value={trials} onChange={(e) => setTrials(e.target.value.replace(/[^0-9]/g, ''))} placeholder="3" /></label>
          <label className="field">Modèle utilisé
            <select value={model} onChange={(e) => setModel(e.target.value)}>
              <option value="HYPERBOLIC_2_PARAMETERS">Modèle à 2 paramètres (hyperbolique)</option>
              <option value="DEVICE_OR_LAB_UNSPECIFIED">Fourni par l’appareil ou le laboratoire</option>
            </select>
          </label>
        </>
      )}
      <label className="field">Date de réalisation<input type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} /></label>
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
        <button type="button" className="btn primary block" disabled={!ok} onClick={submit}>Ajouter cette performance</button>
      </div>
    </div>
  );
}
