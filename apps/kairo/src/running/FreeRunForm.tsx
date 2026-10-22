/**
 * Course libre (hors programme) : saisie (RC3.3), correction et suppression (RC3.4), par les contrats app-core
 * `logFreeRun` / `updateFreeRun` / `deleteFreeRun`. Date et heure de départ, distance, durée, ressenti, commentaire,
 * douleur facultative (pause douleur existante). L'allure moyenne est CALCULÉE à partir de la distance et de la durée
 * saisies ; une course n'est jamais transformée en performance de référence.
 */
import { useState } from 'react';
import { deleteFreeRun, DIFFICULTY_LABELS, durationLabel, FREE_RUN_NOTE_MAX, logFreeRun, PAIN_AREAS, paceLabel, programmeRunsOn, retryRefusedRunning, updateFreeRun } from '@hybridsport/app-core';
import type { Feedback, FreeRunType, FreeRunView } from '@hybridsport/app-core';
import { useStore } from '../store.js';
import { formatDate } from '../ui.js';
import { DurationInput } from './DurationInput.js';
import { durationFromParts, EMPTY_DURATION } from './duration.js';
import type { DurationParts } from './duration.js';

// technical-constant: mètres par kilomètre (conversion d'unité)
const M_PER_KM = 1000;
// technical-constant: secondes par heure / par minute (conversion d'unité)
const S_PER_H = 3600;
// technical-constant: secondes par minute (conversion d'unité)
const S_PER_MIN = 60;

const two = (n: number) => String(n).padStart(2, '0');
const localDate = (d: Date): string => `${String(d.getFullYear())}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
const localTime = (d: Date): string => `${two(d.getHours())}:${two(d.getMinutes())}`;

/** Instant ISO (UTC) d'une date et d'une heure saisies dans le fuseau de l'appareil ; null si illisible. */
function startInstant(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const d = new Date(`${date}T${time}:00`);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}
const partsOf = (s: number): DurationParts => ({ h: String(Math.floor(s / S_PER_H)), m: String(Math.floor((s % S_PER_H) / S_PER_MIN)), s: String(Math.round(s % S_PER_MIN)) });

/** RC4.3 — types déclarables (facultatifs) : « Non précisé » par défaut, jamais une intensité supposée. */
type Kind = 'unspecified' | 'easy' | 'long' | 'quality';
const KINDS: readonly { readonly id: Kind; readonly label: string }[] = [
  { id: 'unspecified', label: 'Non précisé' }, { id: 'easy', label: 'Footing facile' }, { id: 'long', label: 'Sortie longue' }, { id: 'quality', label: 'Séance de qualité' },
];
const QUALITY: readonly { readonly id: Extract<FreeRunType, 'threshold' | 'interval' | 'hills'>; readonly label: string }[] = [
  { id: 'threshold', label: 'Seuil' }, { id: 'interval', label: 'Fractionné' }, { id: 'hills', label: 'Côtes' },
];
/** Libellé du type déclaré (historique). */
export const FREE_RUN_TYPE_LABELS: Readonly<Record<FreeRunType, string>> = { easy: 'Footing facile', long: 'Sortie longue', threshold: 'Qualité · seuil', interval: 'Qualité · fractionné', hills: 'Qualité · côtes' };
const kindOf = (t: FreeRunType | null | undefined): Kind => (t === 'easy' || t === 'long' ? t : t ? 'quality' : 'unspecified');

/** Distinction affichée partout : historique d'entraînement, jamais une performance de référence. */
export const REFERENCE_NOTE = 'Historique d’entraînement : une course libre n’est jamais utilisée comme performance de référence. Un chrono réalisé à fond (course officielle, chrono personnel) se déclare dans Profil Course → « Ajouter une performance ».';

export function FreeRunForm({ initial, onDone, onCancel }: { initial?: FreeRunView; onDone: (text: string) => void; onCancel: () => void }) {
  const store = useStore();
  const today = store.clock().today;
  const p = store.state.profile;
  const start0 = initial ? new Date(initial.startedAt) : null;
  // Course d'onboarding sans date réelle : date laissée VIDE (inconnue) tant que l'utilisateur n'en saisit pas une.
  const [date, setDate] = useState(initial ? (initial.dateUnknown ? '' : initial.timeKnown ? localDate(start0 as Date) : initial.completedAt.slice(0, 10)) : today);
  const [time, setTime] = useState(initial?.timeKnown && !initial.dateUnknown && start0 ? localTime(start0) : '');
  const [km, setKm] = useState(initial?.distanceM != null ? String(initial.distanceM / M_PER_KM) : '');
  const [dur, setDur] = useState<DurationParts>(initial ? partsOf(initial.durationS) : EMPTY_DURATION);
  const [feel, setFeel] = useState<Feedback['difficulty'] | ''>(initial && initial.difficulty !== 'UNKNOWN' ? initial.difficulty : '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [pain, setPain] = useState(false);
  const [areas, setAreas] = useState<string[]>([]);
  const [kind, setKind] = useState<Kind>(kindOf(initial?.type));
  const [quality, setQuality] = useState<FreeRunType | null>(initial?.type && kindOf(initial.type) === 'quality' ? initial.type : null);
  const [extra, setExtra] = useState(false);
  const type: FreeRunType | undefined = kind === 'unspecified' ? undefined : kind === 'quality' ? (quality ?? undefined) : kind;
  const keepUnknownDate = initial?.dateUnknown === true && date === '' && time === '';
  const d = durationFromParts(dur, true, 'la durée');
  const distanceM = km === '' ? undefined : Number(km) * M_PER_KM;
  const distanceOk = distanceM === undefined || (Number.isFinite(distanceM) && distanceM > 0);
  // RC4.3 — l'heure est facultative (saisie et correction) : sans heure, seule la date est enregistrée (convention de jour
  // de l'application, heure jamais inventée) ; l'avertissement « même jour » s'applique alors.
  const dateOnly = time === '' && date !== '';
  // RC4.3 — même jour qu'une course du programme réalisée, sans heure : annuler ou confirmer une activité supplémentaire
  // (aucune fusion). Date inchangée d'une course corrigée : déjà acceptée.
  const sameDay = time === '' && /^\d{4}-\d{2}-\d{2}$/.test(date) && !(initial && date === initial.completedAt.slice(0, 10)) && programmeRunsOn(store.state, date).length > 0;
  const start = startInstant(date, time);
  const pace = d.ok && distanceM !== undefined && distanceOk ? (d.seconds * M_PER_KM) / distanceM : null;
  const blockers = [
    ...(start || keepUnknownDate || (dateOnly && /^\d{4}-\d{2}-\d{2}$/.test(date)) ? [] : ['Indiquez la date (l’heure de départ est facultative).']),
    ...(kind === 'quality' && quality === null ? ['Précisez la séance de qualité : seuil, fractionné ou côtes.'] : []),
    ...(sameDay && !extra ? ['Une course du programme est déjà enregistrée ce jour-là : annulez la saisie ou confirmez une activité supplémentaire.'] : []),
    ...(date > today ? ['La date ne peut pas être dans le futur.'] : []),
    ...(d.ok ? [] : [d.error]),
    ...(distanceOk ? [] : ['Distance invalide : indiquez un nombre de kilomètres supérieur à zéro.']),
    ...(feel === '' ? ['Choisissez votre ressenti.'] : []),
  ];
  const save = () => {
    if (!d.ok || feel === '' || (!start && !dateOnly && !keepUnknownDate)) return;
    const when = start ? { startedAt: start } : keepUnknownDate ? {} : { completedOn: date };
    const common = { realizedDurationS: d.seconds, difficulty: feel, ...when, ...(distanceM !== undefined ? { distanceM } : {}), ...(type !== undefined ? { type } : {}), ...(sameDay && extra ? { confirmedExtra: true } : {}) };
    // REKKA — la course réalisée est la donnée qui manquait souvent aux footings : séances refusées retentées aussitôt.
    const ok = initial
      ? store.apply((s, c) => retryRefusedRunning(updateFreeRun(s, initial.sessionId, { ...common, note }, c), c).state)
      : store.apply((s, c) => retryRefusedRunning(logFreeRun(s, { ...common, completion: 'COMPLETED', pain, ...(pain ? { painAreas: areas } : {}), ...(note.trim() !== '' ? { note } : {}) }, c), c).state);
    if (ok) onDone(`${initial ? 'Course corrigée' : 'Course enregistrée'} : ${durationLabel(d.seconds)}${distanceM !== undefined ? ` · ${(distanceM / M_PER_KM).toFixed(1)} km` : ''}${pace !== null ? ` · ${paceLabel(pace)} /km` : ''}.`);
  };
  const title = initial ? 'Corriger la course' : 'Ajouter une course';
  return (
    <div className="card stack-3" role="form" aria-label={title} data-free-run-form>
      <h3>{title}</h3>
      <p className="tiny" style={{ margin: 0 }}>Une course faite hors programme. Elle rejoint votre historique de course et sert aux prochaines séances ; les séances déjà prévues ne changent pas.</p>
      {p && !p.running.enabled && <p className="tiny" style={{ margin: 0 }} data-free-run-no-running>Votre programme ne comprend pas de course : elle rejoint votre historique et compte dans la récupération de vos autres séances (au démarrage d’une séance de la semaine, et à la planification de la semaine suivante).</p>}
      <p className="tiny" style={{ margin: 0 }} data-free-run-reference-note>{REFERENCE_NOTE}</p>
      <div className="row">
        <label className="field">Date<input type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label className="field">Heure de départ (facultative)<input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
      </div>
      {keepUnknownDate
        ? <p className="tiny" style={{ margin: 0 }} data-free-run-date-unknown>Date inconnue (course déclarée à l’inscription) : laissez la date vide pour la garder inconnue ; elle ne compte pas comme fatigue récente.</p>
        : dateOnly && <p className="tiny" style={{ margin: 0 }}>Heure inconnue : seule la date est enregistrée.</p>}
      {sameDay && (
        <div className="notice warn" role="alertdialog" aria-label="Course du programme le même jour" data-free-run-same-day>
          <div className="stack">
            <span>Une course du programme est déjà enregistrée ce jour-là. S’agit-il de la même course ? Elle ne sera jamais fusionnée automatiquement.</span>
            {extra
              ? <span className="small" data-free-run-extra-confirmed>Activité supplémentaire confirmée.</span>
              : (
                <div className="row wrap">
                  <button type="button" className="btn secondary" onClick={onCancel}>Annuler la saisie</button>
                  <button type="button" className="btn secondary" onClick={() => setExtra(true)}>Confirmer une activité supplémentaire</button>
                </div>
              )}
          </div>
        </div>
      )}
      <div className="stack" role="radiogroup" aria-label="Type de course (facultatif)" data-free-run-type>
        <div className="small">Type de course (facultatif)</div>
        <div className="row wrap">
          {KINDS.map((k) => <button key={k.id} type="button" role="radio" aria-checked={kind === k.id} className={`chip ${kind === k.id ? 'on' : ''}`} onClick={() => { setKind(k.id); if (k.id !== 'quality') setQuality(null); }}>{k.label}</button>)}
        </div>
        {kind === 'quality' && (
          <div className="row wrap" role="radiogroup" aria-label="Séance de qualité">
            {QUALITY.map((q) => <button key={q.id} type="button" role="radio" aria-checked={quality === q.id} className={`chip ${quality === q.id ? 'on' : ''}`} onClick={() => setQuality(q.id)}>{q.label}</button>)}
          </div>
        )}
        <span className="tiny">{kind === 'unspecified' ? 'Sans précision, aucune intensité n’est supposée.' : 'Une sortie longue ou de qualité compte dans la charge, sans jamais devenir la référence de durée ou de structure de vos séances programmées.'}</span>
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
      {initial
        ? initial.pain && <p className="tiny" style={{ margin: 0 }}>Douleur déclarée avec cette course : elle n’est pas modifiable ici (la pause douleur se lève dans les Réglages).</p>
        : (
          <div className="stack" data-free-run-pain>
            <label className="check"><input type="checkbox" checked={pain} onChange={(e) => setPain(e.target.checked)} />Douleur pendant ou après cette course</label>
            {pain && (
              <>
                <div className="row wrap" role="group" aria-label="Zones douloureuses (facultatif)">
                  {Object.entries(PAIN_AREAS).map(([k, v]) => (
                    <button key={k} type="button" className={`chip ${areas.includes(k) ? 'on' : ''}`} aria-pressed={areas.includes(k)} onClick={() => setAreas(areas.includes(k) ? areas.filter((x) => x !== k) : [...areas, k])}>{v}</button>
                  ))}
                </div>
                <div className="notice warn" role="status">Une douleur déclarée met la planification en pause (pause douleur) jusqu’à ce que vous la leviez dans les Réglages. Consultez un professionnel de santé si elle persiste.</div>
              </>
            )}
          </div>
        )}
      {blockers.length > 0 && (
        <div className="notice warn" role="status" data-free-run-blockers>
          <div className="stack"><strong>Pour enregistrer :</strong><ul style={{ margin: 0, paddingLeft: 18 }}>{blockers.map((b) => <li key={b}>{b}</li>)}</ul></div>
        </div>
      )}
      <div className="row">
        <button type="button" className="btn secondary" onClick={onCancel}>Annuler</button>
        <button type="button" className="btn primary block" disabled={blockers.length > 0} onClick={save}>{initial ? 'Enregistrer la correction' : 'Enregistrer la course'}</button>
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

/**
 * Carte d'une course libre dans l'historique (valeurs enregistrées ; allure calculée seulement si la distance existe ;
 * heure affichée seulement si elle est connue). « Corriger » / « Supprimer » (confirmation explicite).
 */
export function FreeRunCard({ r }: { r: FreeRunView }) {
  const store = useStore();
  const [mode, setMode] = useState<'view' | 'edit' | 'confirm-delete'>('view');
  const [done, setDone] = useState<string | null>(null);
  if (mode === 'edit') return <FreeRunForm initial={r} onDone={(t) => { setDone(t); setMode('view'); }} onCancel={() => setMode('view')} />;
  const start = new Date(r.startedAt);
  const when = r.dateUnknown ? 'date non renseignée (déclarée à l’inscription)' : r.timeKnown ? `${formatDate(localDate(start))} · ${localTime(start)}` : `${formatDate(r.completedAt.slice(0, 10))} · heure non renseignée`;
  return (
    <div className="card" data-free-run={r.sessionId}>
      <div className="row between"><span className="small muted">Course libre · {when}</span><span className="badge neutral">Hors programme</span></div>
      <div className="small num">
        {durationLabel(r.durationS)}{r.distanceM !== null ? ` · ${(r.distanceM / M_PER_KM).toFixed(1)} km` : ''}{r.paceSecPerKm !== null ? ` · ${paceLabel(r.paceSecPerKm)} /km` : ''}
      </div>
      <div className="small" data-free-run-type-label>Type : {r.type ? FREE_RUN_TYPE_LABELS[r.type] : 'non précisé'}</div>
      {r.difficulty !== 'UNKNOWN' && <div className="small">Ressenti : {DIFFICULTY_LABELS[r.difficulty] ?? ''}</div>}
      {r.note && <div className="small" data-free-run-note>« {r.note} »</div>}
      {r.pain && <div className="small" style={{ color: 'var(--danger)' }}>⚠ Douleur signalée</div>}
      <div className="tiny muted">Historique d’entraînement (pas une performance de référence)</div>
      {done && <div className="notice" role="status" data-free-run-saved>{done}</div>}
      {mode === 'confirm-delete'
        ? (
          <div className="notice warn" role="alertdialog" aria-label="Supprimer cette course">
            <div className="stack">
              <span>Supprimer cette course ? Elle est retirée de votre historique de course avec son commentaire. Les séances déjà prévues ne changent pas{r.pain ? ' et la pause douleur éventuelle reste active' : ''}.</span>
              <div className="row">
                <button type="button" className="btn secondary" onClick={() => setMode('view')}>Annuler</button>
                <button type="button" className="btn danger" onClick={() => { store.apply((s) => deleteFreeRun(s, r.sessionId)); }}>Supprimer définitivement</button>
              </div>
            </div>
          </div>
        )
        : (
          <div className="row">
            <button type="button" className="btn ghost" onClick={() => setMode('edit')} aria-label={`Corriger la course du ${when}`}>Corriger</button>
            <button type="button" className="btn ghost" onClick={() => setMode('confirm-delete')} aria-label={`Supprimer la course du ${when}`}>Supprimer</button>
          </div>
        )}
    </div>
  );
}
