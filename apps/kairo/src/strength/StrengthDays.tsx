/**
 * Reprise 3A — « Jours Musculation », toujours présentés APRÈS les disponibilités générales. Seuls les jours disponibles
 * peuvent être choisis. Un jour choisi devenu indisponible est signalé et retiré seulement sur action de l'utilisateur ;
 * les jours nouvellement disponibles ne sont jamais ajoutés d'office. Fréquence impossible : la raison est écrite.
 */
import { strengthDaysCheck, withStrengthDays } from '@hybridsport/app-core';
import type { ProfileInput } from '@hybridsport/app-core';
import { Notice, WEEKDAY_NAMES } from '../ui.js';
import './strength-personalization.css';

type Setter = (fn: (p: ProfileInput) => ProfileInput) => void;
const names = (days: readonly number[]): string => {
  const n = days.map((d) => WEEKDAY_NAMES[d] ?? '');
  return n.length <= 1 ? (n[0] ?? '') : `${n.slice(0, -1).join(', ')} et ${n.at(-1) ?? ''}`;
};

/** Raisons bloquantes de la section (affichées à côté du bouton de l'étape). */
export function strengthDaysBlockers(p: ProfileInput): string[] {
  const c = strengthDaysCheck(p);
  if (!c) return [];
  return [
    ...(c.incompatible.length > 0 ? [`Jours Musculation : ${names(c.incompatible)} n’${c.incompatible.length > 1 ? 'sont' : 'est'} plus disponible${c.incompatible.length > 1 ? 's' : ''} ; confirmez ${c.incompatible.length > 1 ? 'leur' : 'son'} retrait ou rendez ${c.incompatible.length > 1 ? 'ces jours' : 'ce jour'} disponible${c.incompatible.length > 1 ? 's' : ''}.`] : []),
    ...(c.incompatible.length === 0 && !c.enoughDays ? [`Jours Musculation : ${String(c.requested)} séances demandées pour ${String(c.usable.length)} jour${c.usable.length > 1 ? 's' : ''} choisi${c.usable.length > 1 ? 's' : ''} ; ajoutez des jours ou réduisez la fréquence.`] : []),
  ];
}

export function StrengthDaysSection({ p, set, proposal, onChoose }: { p: ProfileInput; set: Setter; proposal: boolean; onChoose: () => void }) {
  const c = strengthDaysCheck(p);
  if (!c) return null;
  const toggle = (d: number, on: boolean) => {
    const next = on ? [...c.chosen, d] : c.chosen.filter((x) => x !== d);
    if (next.length === 0) return;
    onChoose();
    set((x) => withStrengthDays(x, next));
  };
  const dropIncompatible = () => { onChoose(); set((x) => withStrengthDays(x, c.usable.length > 0 ? c.usable : c.available)); };
  const addNotChosen = () => { onChoose(); set((x) => withStrengthDays(x, [...c.chosen, ...c.notChosen])); };
  const missing = c.recovery ? c.requested - c.recovery.maxSessions : 0;
  return (
    <section className="stack" aria-label="Jours Musculation" data-strength-days>
      <h3 className="section-title">Jours Musculation</h3>
      <p className="small">Parmi vos jours disponibles, ceux où vous acceptez de placer de la Musculation. Une séance au plus par jour ; les autres sports peuvent aussi occuper ces jours.</p>
      {proposal && <Notice><span data-strength-days-proposal>Proposition : tous vos jours disponibles. Décochez ceux où vous ne souhaitez pas de Musculation.</span></Notice>}
      <div className="sp-zones" role="group" aria-label="Jours possibles pour la musculation">
        {WEEKDAY_NAMES.map((name, d) => {
          const available = c.available.includes(d);
          const checked = c.chosen.includes(d);
          return (
            <span key={name}>
              <label className="check">
                <input type="checkbox" checked={checked} disabled={!available && !checked} onChange={(e) => toggle(d, e.target.checked)} aria-describedby={available ? undefined : `strength-day-off-${String(d)}`} />
                {name}
              </label>
              {!available && <span className="tiny muted" id={`strength-day-off-${String(d)}`}> indisponible</span>}
            </span>
          );
        })}
      </div>
      {c.incompatible.length > 0 && (
        <Notice tone="warn">
          <span role="status" data-strength-days-incompatible>{names(c.incompatible)} {c.incompatible.length > 1 ? 'étaient choisis' : 'était choisi'} pour la Musculation mais {c.incompatible.length > 1 ? 'ne sont' : 'n’est'} plus disponible{c.incompatible.length > 1 ? 's' : ''} : aucune séance ne peut y être placée.</span>
          {c.usable.length > 0
            ? <button type="button" className="btn secondary" onClick={dropIncompatible}>Retirer {names(c.incompatible)} des jours Musculation</button>
            : <button type="button" className="btn secondary" onClick={dropIncompatible}>Choisir mes jours disponibles à la place ({names(c.available)})</button>}
        </Notice>
      )}
      {!proposal && c.incompatible.length === 0 && c.notChosen.length > 0 && (
        <p className="small" data-strength-days-not-chosen>Disponible{c.notChosen.length > 1 ? 's' : ''} mais sans Musculation : {names(c.notChosen)}. <button type="button" className="btn ghost" onClick={addNotChosen}>Ajouter {c.notChosen.length > 1 ? 'ces jours' : 'ce jour'}</button></p>
      )}
      {c.incompatible.length === 0 && !c.enoughDays && (
        <Notice tone="warn"><span role="status" data-strength-days-frequency>{String(c.requested)} séances Musculation demandées, mais {String(c.usable.length)} jour{c.usable.length > 1 ? 's' : ''} Musculation choisi{c.usable.length > 1 ? 's' : ''} : une séance au plus par jour. Ajoutez des jours ou réduisez la fréquence.</span></Notice>
      )}
      {c.incompatible.length === 0 && c.enoughDays && c.recovery && missing > 0 && (
        <Notice tone="warn"><span role="status" data-strength-days-recovery>Avec ces jours, au plus {String(c.recovery.maxSessions)} séance{c.recovery.maxSessions > 1 ? 's' : ''} Musculation par semaine respecte{c.recovery.maxSessions > 1 ? 'nt' : ''} {String(c.recovery.hours)} h de récupération entre deux Full Body (jamais deux jours de suite, ni dimanche puis lundi) : {String(missing)} séance{missing > 1 ? 's' : ''} sur {String(c.requested)} ne {missing > 1 ? 'seront' : 'sera'} pas placée{missing > 1 ? 's' : ''}. Choisissez des jours non consécutifs ou réduisez la fréquence.</span></Notice>
      )}
    </section>
  );
}
