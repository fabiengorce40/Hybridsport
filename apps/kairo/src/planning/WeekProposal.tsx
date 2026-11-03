/**
 * FAST TRACK V1 — replanification CONFIRMÉE : « Planning actuel / Planning proposé », changements lisibles, conflits de
 * récupération, puis « Conserver mon planning » ou « Appliquer le nouveau planning ». Rien n'est écrit avant le choix.
 */
import { useState } from 'react';
import { applyStaleWeekProposal, beta0Environment, keepStaleWeek, staleWeekProposal } from '@hybridsport/app-core';
import type { PersistedWeek, StaleWeekProposal, WeekChange, WeekLoadWarning } from '@hybridsport/app-core';
import { sessionName, sportName } from '../present.js';
import { useStore } from '../store.js';
import { Notice } from '../ui.js';

const day = (d?: string) => (d ? new Date(`${d}T12:00:00Z`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }) : '');
const title = (sport: string, a?: string | null) => (a ? sessionName(sport, a) : sportName(sport));
const UNPLACED: Readonly<Record<string, string>> = {
  slot_unavailable: 'aucun jour disponible compatible', interference_conflict: 'conflit avec un autre sport', safety_blocked: 'contrainte de sécurité',
  governance_blocked: 'règle non validée pour cette combinaison', engine_unavailable: 'moteur indisponible',
};
/** Une ligne lisible par changement (aucune décision ici : la classification vient d'app-core). */
export function changeText(c: WeekChange): string {
  const s = sportName(c.sport);
  switch (c.kind) {
    case 'kept': return `Conservée : ${title(c.sport, c.archetypeTo)} (${s}), ${day(c.to)}`;
    case 'moved': return `Déplacée : ${title(c.sport, c.archetypeTo)} (${s}), ${day(c.from)} → ${day(c.to)}`;
    case 'replaced': return `Remplacée : ${day(c.to)}, ${title(c.sport, c.archetypeFrom)} → ${title(c.sport, c.archetypeTo)} (${s})`;
    case 'added': return `Ajoutée : ${title(c.sport, c.archetypeTo)} (${s}), ${day(c.to)}`;
    case 'removed': return `Retirée : ${title(c.sport, c.archetypeFrom)} (${s}), ${day(c.from)}`;
    case 'unplaced': return `Non planifiée : ${s}${c.category ? ` — ${UNPLACED[c.category] ?? 'aucune prescription compatible'}` : ''}`;
  }
}
export function warningText(w: WeekLoadWarning): string {
  if (w.kind === 'consecutive') return `${String(w.days)} jours consécutifs d’entraînement : récupération à surveiller.`;
  if (w.kind === 'multisport_conflict') return `${String(w.items.length)} conflit(s) de récupération musculaire entre sports.`;
  if (w.kind === 'full_body_consecutive') return 'Des séances corps entier sont placées sur des jours consécutifs.';
  return 'Aucun jour de repos dans la semaine.';
}
function WeekList({ week, label }: { week: PersistedWeek; label: string }) {
  const rows = week.requests.filter((r) => r.status === 'planned').sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? -1 : 1));
  return (
    <section aria-label={label}>
      <h4>{label}</h4>
      <ul className="small">{rows.map((r) => <li key={r.requestId}>{day(r.date)} · {sportName(r.sport)}{r.intent?.archetypeId ? ` · ${sessionName(r.sport, r.intent.archetypeId)}` : ''}</li>)}</ul>
    </section>
  );
}
/** Vue de comparaison partagée (semaine obsolète, recalcul Musculation). */
export function WeekCompare({ before, after, changes, warningsBefore, warningsAfter }: { before: PersistedWeek; after: PersistedWeek; changes: readonly WeekChange[]; warningsBefore: readonly WeekLoadWarning[]; warningsAfter: readonly WeekLoadWarning[] }) {
  const shown = changes.filter((c) => c.kind !== 'kept');
  const kept = changes.length - shown.length;
  const fresh = warningsAfter.filter((w) => !warningsBefore.some((b) => JSON.stringify(b) === JSON.stringify(w)));
  return (
    <div className="stack-3" aria-label="Comparaison des plannings">
      <WeekList week={before} label="Planning actuel" />
      <WeekList week={after} label="Planning proposé" />
      <section aria-label="Changements proposés">
        <h4>Changements</h4>
        <p className="small">{String(kept)} séance(s) conservée(s) à l’identique.</p>
        {shown.length === 0 ? <p className="small">Aucun autre changement.</p> : <ul className="small">{shown.map((c) => <li key={`${c.kind}.${c.requestId}`}>{changeText(c)}</li>)}</ul>}
      </section>
      {warningsAfter.length > 0 && (
        <section aria-label="Récupération">
          <h4>Récupération</h4>
          <ul className="small">{warningsAfter.map((w, i) => <li key={i}>{warningText(w)}{fresh.includes(w) ? ' (nouveau avec ce planning)' : ''}</li>)}</ul>
        </section>
      )}
    </div>
  );
}

const ERRORS: Readonly<Record<string, string>> = { REPLAN_STALE: 'Vos données ont changé depuis l’aperçu. Rouvrez la proposition.', REPLAN_NOT_ALLOWED: 'Cette semaine ne peut plus être modifiée.' };

/** Semaine planifiée par une version précédente et non commencée : proposition, jamais d'application automatique. */
export function StaleWeekProposalCard() {
  const store = useStore();
  const [proposal, setProposal] = useState<StaleWeekProposal | null>(null);
  const [message, setMessage] = useState('');
  const open = () => {
    setMessage('');
    try {
      const p = staleWeekProposal(store.state, store.clock(), beta0Environment());
      if (!p) { setMessage('Aucune proposition : votre planning est à jour.'); return; }
      setProposal(p);
    } catch { setMessage('La proposition ne peut pas être calculée. Votre planning reste inchangé.'); }
  };
  const decide = (apply: boolean) => {
    let failure = '';
    const ok = store.apply((s, c) => {
      try {
        if (apply) { if (!proposal) throw new Error('REPLAN_STALE'); return applyStaleWeekProposal(s, proposal, c, beta0Environment()); }
        return keepStaleWeek(s, c, beta0Environment());
      } catch (e) { failure = ERRORS[(e as Error).message] ?? 'Action impossible. Votre planning reste inchangé.'; throw e; }
    });
    setProposal(null);
    setMessage(ok ? (apply ? 'Nouveau planning appliqué. Historique, charges et performances conservés.' : 'Planning conservé tel quel.') : failure);
  };
  return (
    <section className="card" aria-label="Nouveau planning proposé" data-stale-week>
      <h3>Nouveau planning proposé</h3>
      <p className="small">Une nouvelle version de REKKA peut organiser cette semaine autrement. Aucune séance n’a commencé. <strong>Rien n’est modifié sans votre accord.</strong></p>
      {!proposal && <button className="btn secondary block" onClick={open}>Voir la proposition</button>}
      {proposal && (
        <>
          <WeekCompare before={proposal.before} after={proposal.after} changes={proposal.changes} warningsBefore={proposal.warningsBefore} warningsAfter={proposal.warningsAfter} />
          <Notice>Les séances réalisées, l’historique, les charges et les performances ne sont jamais modifiés.</Notice>
          <div className="row">
            <button className="btn ghost" onClick={() => decide(false)}>Conserver mon planning</button>
            <button className="btn primary" onClick={() => decide(true)}>Appliquer le nouveau planning</button>
          </div>
        </>
      )}
      {message && <p className="small" role="status">{message}</p>}
    </section>
  );
}
