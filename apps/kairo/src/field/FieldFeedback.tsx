/**
 * FIELD TEST — retour terrain après une séance TERMINÉE (tous sports, contrat générique). Observations de l'utilisateur
 * uniquement : elles sont stockées avec la séance (`USER_REPORTED_FIELD_FEEDBACK`) et ne modifient jamais les séances.
 */
import { useState } from 'react';
import { FIELD_COMMENT_MAX, fieldFeedbackOf, fieldFeedbackText, recordFieldFeedback } from '@hybridsport/app-core';
import type { FieldFeedbackInput } from '@hybridsport/app-core';
import { useStore } from '../store.js';

const DIFFICULTY: readonly [NonNullable<FieldFeedbackInput['difficulty']>, string][] = [['very_easy', 'Très facile'], ['easy', 'Facile'], ['adapted', 'Adaptée'], ['hard', 'Difficile'], ['very_hard', 'Très difficile']];
const TOLERANCE: readonly [NonNullable<FieldFeedbackInput['tolerance']>, string][] = [['good', 'Bonne'], ['medium', 'Moyenne'], ['poor', 'Mauvaise']];
const CONTENT: readonly [NonNullable<FieldFeedbackInput['contentAmount']>, string][] = [['much_too_short', 'Beaucoup trop court'], ['too_short', 'Trop court'], ['adapted', 'Adapté'], ['too_long', 'Trop long'], ['much_too_long', 'Beaucoup trop long']];
const FULL: readonly [NonNullable<FieldFeedbackInput['fullSessionAdequacy']>, string][] = [['very_insufficient', 'Très insuffisant'], ['insufficient', 'Insuffisant'], ['adapted', 'Adapté'], ['too_loaded', 'Trop chargé']];
const DURATION: readonly [NonNullable<FieldFeedbackInput['perceivedDuration']>, string][] = [['too_short', 'Trop courte'], ['adapted', 'Adaptée'], ['too_long', 'Trop longue']];

function Choices<T extends string>({ label, options, value, onChange }: { label: string; options: readonly [T, string][]; value: T | undefined; onChange: (v: T | undefined) => void }) {
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="small">{label}</div>
      <div className="field-chips" role="radiogroup" aria-label={label}>
        {options.map(([k, t]) => (
          <button key={k} type="button" role="radio" aria-checked={value === k} className={`chip ${value === k ? 'on' : ''}`} onClick={() => onChange(value === k ? undefined : k)}>{t}</button>
        ))}
      </div>
    </div>
  );
}

export function FieldFeedbackCard({ requestId, pain, block = false }: { requestId: string; pain: boolean; block?: boolean }) {
  const store = useStore();
  const saved = fieldFeedbackOf(store.state, requestId);
  const [f, setF] = useState<FieldFeedbackInput>({});
  const [skipped, setSkipped] = useState(false);
  if (saved) {
    return (
      <div className="card" aria-label="Retour terrain" data-field-feedback="saved">
        <strong>Votre retour terrain</strong>
        <span className="small">{fieldFeedbackText(saved)}</span>
        <span className="tiny muted">Enregistré pour le test terrain. Il ne modifie pas vos séances.</span>
      </div>
    );
  }
  if (skipped) return null;
  const empty = [f.difficulty, f.tolerance, f.perceivedDuration, f.contentAmount, f.fullSessionAdequacy].every((x) => x === undefined) && (f.comment ?? '').trim() === '';
  return (
    <div className="card" aria-label="Retour terrain" data-field-feedback="form">
      <strong>Votre retour terrain</strong>
      <span className="tiny muted">Facultatif. Ces observations servent au test terrain : elles ne modifient pas vos séances.</span>
      <Choices label="Difficulté ressentie" options={DIFFICULTY} value={f.difficulty} onChange={(difficulty) => setF({ ...f, difficulty })} />
      <Choices label="Tolérance" options={TOLERANCE} value={f.tolerance} onChange={(tolerance) => setF({ ...f, tolerance })} />
      {block ? (
        <>
          {/* Bloc Cross-training / HYROX : le contenu prescrit n'est pas une séance complète (FIELD TEST P0). */}
          <Choices label="Ce contenu vous a semblé" options={CONTENT} value={f.contentAmount} onChange={(contentAmount) => setF({ ...f, contentAmount })} />
          <Choices label="Pour une séance complète, le contenu vous a semblé" options={FULL} value={f.fullSessionAdequacy} onChange={(fullSessionAdequacy) => setF({ ...f, fullSessionAdequacy })} />
        </>
      ) : <Choices label="La durée de la séance vous a semblé" options={DURATION} value={f.perceivedDuration} onChange={(perceivedDuration) => setF({ ...f, perceivedDuration })} />}
      <div className="small">Douleur : {pain ? 'signalée à la fin de la séance' : 'aucune signalée'}</div>
      <label className="field">Commentaire (facultatif)
        <textarea rows={3} maxLength={FIELD_COMMENT_MAX} value={f.comment ?? ''} onChange={(e) => setF({ ...f, comment: e.target.value })} placeholder="Ce qui vous a semblé étrange, trop dur, trop facile…" />
      </label>
      <div className="row">
        <button type="button" className="btn ghost" onClick={() => setSkipped(true)}>Plus tard</button>
        <button type="button" className="btn primary block" disabled={empty} onClick={() => { store.apply((s, c) => recordFieldFeedback(s, c, requestId, f)); }}>Enregistrer mon ressenti</button>
      </div>
    </div>
  );
}
