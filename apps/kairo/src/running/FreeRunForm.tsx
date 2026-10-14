/**
 * RC3.3 — « Ajouter une course » : course réalisée HORS programme, enregistrée par le contrat existant `logFreeRun`
 * (app-core). Date et heure de départ, distance, durée, ressenti, commentaire. L'allure moyenne est CALCULÉE à partir de
 * la distance et de la durée saisies (rien n'est supposé) ; toute saisie refusée par app-core est expliquée.
 */
import { useState } from 'react';
import { DIFFICULTY_LABELS, durationLabel, FREE_RUN_NOTE_MAX, logFreeRun, paceLabel } from '@hybridsport/app-core';
import type { Feedback, FreeRunView } from '@hybridsport/app-core';
import { useStore } from '../store.js';
import { formatDate } from '../ui.js';
import { DurationInput } from './DurationInput.js';
import { durationFromParts, EMPTY_DURATION } from './duration.js';
import type { DurationParts } from './duration.js';

// technical-constant: mètres par kilomètre (conversion d'unité)
const M_PER_KM = 1000;

/** Instant ISO (UTC) d'une date et d'une heure saisies dans le fuseau de l'appareil ; null si illisible. */
function startInstant(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const d = new Date(`${date}T${time}:00`);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

export function FreeRunForm({ onDone, onCancel }: { onDone: (text: string) => void; onCancel: () => void }) {
  const store = useStore();
  const today = store.clock().today;
  const [date, setDate] = useState(today);
  const [time, setTime] = useState('');
  const [km, setKm] = useState('');
  const [dur, setDur] = useState<DurationParts>(EMPTY_DURATION);
  const [feel, setFeel] = useState<Feedback['difficulty'] | ''>('');
  const [note, setNote] = useState('');
  const d = durationFromParts(dur, true, 'la durée');
  const distanceM = km === '' ? undefined : Number(km) * M_PER_KM;
  const distanceOk = distanceM === undefined || (Number.isFinite(distanceM) && distanceM > 0);
  const start = startInstant(date, time);
  const pace = d.ok && distanceM !== undefined && distanceOk ? (d.seconds * M_PER_KM) / distanceM : null;
  const blockers = [
    ...(start ? [] : ['Indiquez la date et l’heure de départ.']),
    ...(date > today ? ['La date ne peut pas être dans le futur.'] : []),
    ...(d.ok ? [] : [d.error]),
    ...(distanceOk ? [] : ['Distance invalide : indiquez un nombre de kilomètres supérieur à zéro.']),
    ...(feel === '' ? ['Choisissez votre ressenti.'] : []),
  ];
  const save = () => {
    if (!start || !d.ok || feel === '') return;
    const ok = store.apply((s, c) => logFreeRun(s, {
      realizedDurationS: d.seconds, completion: 'COMPLETED', difficulty: feel, pain: false, startedAt: start,
      ...(distanceM !== undefined ? { distanceM } : {}), ...(note.trim() !== '' ? { note } : {}),
    }, c));
    if (ok) onDone(`Course enregistrée : ${durationLabel(d.seconds)}${distanceM !== undefined ? ` · ${(distanceM / M_PER_KM).toFixed(1)} km` : ''}${pace !== null ? ` · ${paceLabel(pace)} /km` : ''}.`);
  };
  return (
    <div className="card stack-3" role="form" aria-label="Ajouter une course" data-free-run-form>
      <h3>Ajouter une course</h3>
      <p className="tiny" style={{ margin: 0 }}>Une course faite hors programme. Elle rejoint votre historique de course et sert aux prochaines séances ; les séances déjà prévues ne changent pas.</p>
      <div className="row">
        <label className="field">Date<input type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label className="field">Heure de départ<input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
      </div>
      <label className="field">Distance (km)<input inputMode="decimal" value={km} placeholder="ex. 7,5 (facultatif)" onChange={(e) => setKm(e.target.value.replace(',', '.').replace(/[^0-9.]/g, ''))} /></label>
      <DurationInput label="Durée" value={dur} onChange={setDur} withHours error={null} />
      <div className="small" role="status" data-free-run-pace>
        {pace !== null ? <>Allure moyenne : <b className="num">{paceLabel(pace)} /km</b> (calculée à partir de la distance et de la durée)</> : 'Allure moyenne : indiquez la distance et la durée pour la calculer.'}
      </div>
      <label className="field">Ressenti
        <select value={feel} onChange={(e) => setFeel(e.target.value as Feedback['difficulty'])}>
          <option value="" disabled>Choisissez</option>
          {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      <label className="field">Commentaire (facultatif)<textarea value={note} maxLength={FREE_RUN_NOTE_MAX} rows={2} onChange={(e) => setNote(e.target.value)} /></label>
      {blockers.length > 0 && (
        <div className="notice warn" role="status" data-free-run-blockers>
          <div className="stack"><strong>Pour enregistrer :</strong><ul style={{ margin: 0, paddingLeft: 18 }}>{blockers.map((b) => <li key={b}>{b}</li>)}</ul></div>
        </div>
      )}
      <div className="row">
        <button type="button" className="btn secondary" onClick={onCancel}>Annuler</button>
        <button type="button" className="btn primary block" disabled={blockers.length > 0} onClick={save}>Enregistrer la course</button>
      </div>
    </div>
  );
}

/** Entrée « Ajouter une course » (bouton → formulaire → confirmation), partagée par l'Historique et le profil Course. */
export function FreeRunEntry() {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  if (open) return <FreeRunForm onDone={(t) => { setDone(t); setOpen(false); }} onCancel={() => setOpen(false)} />;
  return (
    <div className="stack">
      {done && <div className="notice" role="status" data-free-run-saved>{done}</div>}
      <button type="button" className="btn secondary" onClick={() => { setDone(null); setOpen(true); }}>Ajouter une course</button>
    </div>
  );
}

/** Carte d'une course libre dans l'historique (valeurs enregistrées ; allure calculée seulement si la distance existe). */
export function FreeRunCard({ r }: { r: FreeRunView }) {
  const start = new Date(r.startedAt);
  const hhmm = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
  return (
    <div className="card" data-free-run={r.sessionId}>
      <div className="row between"><span className="small muted">Course libre · {formatDate(localDate(start))} · {hhmm}</span><span className="badge neutral">Hors programme</span></div>
      <div className="small num">
        {durationLabel(r.durationS)}{r.distanceM !== null ? ` · ${(r.distanceM / M_PER_KM).toFixed(1)} km` : ''}{r.paceSecPerKm !== null ? ` · ${paceLabel(r.paceSecPerKm)} /km` : ''}
      </div>
      {r.difficulty !== 'UNKNOWN' && <div className="small">Ressenti : {DIFFICULTY_LABELS[r.difficulty] ?? ''}</div>}
      {r.note && <div className="small" data-free-run-note>« {r.note} »</div>}
    </div>
  );
}
const localDate = (d: Date): string => `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
