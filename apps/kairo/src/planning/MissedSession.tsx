/**
 * FAST TRACK V1 — séance manquée ou à reporter : options CALCULÉES par app-core (jours admis : disponibles, libres, sans
 * conflit de récupération), aperçu « avant / après », confirmation explicite. Rien n'est écrit avant la confirmation.
 */
import { useState } from 'react';
import { beta0Environment, declareSessionMissed, missedSessionOptions, postponeSession } from '@hybridsport/app-core';
import { useStore } from '../store.js';
import { Notice } from '../ui.js';

const day = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const CAUSE: Readonly<Record<string, string>> = { unavailable: 'jour non disponible', too_short: 'durée disponible insuffisante pour cette séance', occupied: 'une autre séance est déjà prévue', recovery: 'récupération insuffisante' };

export function MissedSessionCard({ requestId }: { requestId: string }) {
  const store = useStore();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<string | null>(null);
  const [declaring, setDeclaring] = useState(false);
  const [message, setMessage] = useState('');
  const o = open ? missedSessionOptions(store.state, store.clock(), requestId, beta0Environment()) : null;
  if (!open) {
    return (
      <section className="card" aria-label="Séance manquée ou à reporter">
        <button className="btn ghost block" onClick={() => setOpen(true)}>Séance manquée ou à reporter ?</button>
        {message && <p className="small" role="status">{message}</p>}
      </section>
    );
  }
  if (!o) return <section className="card"><p className="small" role="status">Cette séance ne peut plus être déclarée ni reportée (commencée, enregistrée ou semaine terminée).</p></section>;
  const act = (ok: string) => {
    let failure = '';
    const done = store.apply((s, c) => { try { return target ? postponeSession(s, c, requestId, target, beta0Environment()) : declareSessionMissed(s, c, requestId, beta0Environment()); } catch (e) { failure = (e as Error).message === 'POSTPONE_NOT_ALLOWED' ? 'Ce jour n’est plus compatible. Choisissez à nouveau.' : 'Action impossible. Rien n’a été modifié.'; throw e; } });
    setOpen(false); setTarget(null); setDeclaring(false);
    setMessage(done ? ok : failure);
  };
  return (
    <section className="card stack-3" aria-label="Séance manquée ou à reporter">
      <h3>Séance manquée ou à reporter</h3>
      {o.postponeBlocked === 'ACTIVE_PAIN'
        ? <Notice tone="warn">Pause douleur active : aucun report n’est proposé. Vous pouvez seulement la déclarer non réalisée.</Notice>
        : o.postpone.length === 0
          ? <p className="small">Aucun autre jour de cette semaine ne permet de la reporter sans enfreindre vos disponibilités ou la récupération.</p>
          : (
            <fieldset className="stack-2">
              <legend className="small">Reporter à (jours compatibles avec vos disponibilités et la récupération) :</legend>
              {o.postpone.map((d) => <label key={d} className="small"><input type="radio" name={`postpone-${requestId}`} checked={target === d} onChange={() => { setTarget(d); setDeclaring(false); }} /> {day(d)}</label>)}
            </fieldset>
          )}
      {o.refused.length > 0 && <details className="small"><summary>Jours non proposés</summary><ul>{o.refused.map((r) => <li key={r.date}>{day(r.date)} : {CAUSE[r.cause]}</li>)}</ul></details>}
      {target && (
        <div aria-label="Aperçu du report">
          <p className="small"><b>Planning actuel :</b> {day(o.date)} · <b>Planning proposé :</b> {day(target)}. Contenu de la séance inchangé ; les autres séances ne bougent pas.</p>
          <div className="row">
            <button className="btn ghost" onClick={() => setTarget(null)}>Conserver mon planning</button>
            <button className="btn primary" onClick={() => act(`Séance reportée au ${day(target)}.`)}>Appliquer le report</button>
          </div>
        </div>
      )}
      {!target && !declaring && <button className="btn secondary block" onClick={() => setDeclaring(true)}>Je ne l’ai pas faite</button>}
      {declaring && (
        <div aria-label="Confirmer la séance non réalisée">
          <p className="small">Elle restera <b>non réalisée</b> dans l’historique. Aucune performance ni progression n’est enregistrée, et elle n’est pas rattrapée automatiquement : la récupération des prochaines séances est préservée.</p>
          <div className="row">
            <button className="btn ghost" onClick={() => setDeclaring(false)}>Annuler</button>
            <button className="btn danger" onClick={() => act('Séance enregistrée comme non réalisée.')}>Confirmer : non réalisée</button>
          </div>
        </div>
      )}
      <button className="btn ghost block" onClick={() => { setOpen(false); setTarget(null); setDeclaring(false); }}>Fermer</button>
      {message && <p className="small" role="status">{message}</p>}
    </section>
  );
}
