/**
 * RC4.2 — faisabilité des types de séance HYROX, lue du MOTEUR RÉEL (`hyroxRoleFeasibility`, aucune table) : types
 * réellement réalisables, restrictions de niveau, de matériel ou de temps lues dans la trace du refus, et types
 * impossibles. Rien n'est prescrit ici, aucun refus n'est contourné : on explique seulement ce que le moteur refuse.
 */
import { HR_BALANCED_LABEL, HR_ROLE_LABELS } from '@hybridsport/app-core';
import type { HrRoleFeasibility, ProfileInput } from '@hybridsport/app-core';
import { Notice } from '../../ui.js';

const HR_FACTOR_LABELS: Readonly<Record<string, string>> = {
  level: 'niveau déclaré (non éligible pour ce type)',
  equipment: 'stations composables insuffisantes avec le matériel et le niveau déclarés',
  time: 'durée de séance hors du temps disponible déclaré',
  safety: 'coupure déclarée',
};
const titleOf = (role: string): string => HR_ROLE_LABELS[role]?.title ?? role;
/** Restriction lue dans la trace du moteur ; non attribuable ⇒ dit tel quel, jamais deviné. */
export const hrRestrictionText = (r: HrRoleFeasibility): string => {
  const f = r.factors.map((x) => HR_FACTOR_LABELS[x]).filter(Boolean);
  return f.length > 0 ? f.join(' ; ') : 'le moteur ne précise pas quel paramètre bloque';
};

/**
 * Bilan complet pour l'onboarding et la modification du profil. `feasibility` nul : matériel pas encore choisi ou
 * coupure déclarée (la sonde ne tourne pas) ⇒ rien n'est affirmé.
 */
export function HrFeasibilityNotice({ p, set, feasibility }: { p: ProfileInput; set: (f: (x: ProfileInput) => ProfileInput) => void; feasibility: readonly HrRoleFeasibility[] | null }) {
  if (!p.hyrox.enabled || !feasibility) return null;
  const ok = feasibility.filter((r) => r.status === 'feasible');
  const ko = feasibility.filter((r) => r.status === 'infeasible');
  const balanced = p.hyrox.focus === 'balanced';
  const chosen = balanced ? null : feasibility.find((r) => r.role === p.hyrox.role) ?? null;
  const blocked = (chosen?.status === 'infeasible') || (balanced && ok.length === 0);
  return (
    <Notice tone={ko.length > 0 ? 'warn' : 'info'}>
      <div className="stack" data-hr-feasibility-notice={blocked ? 'blocked' : ko.length > 0 ? 'restricted' : 'all'}>
        <span role="status">
          {ok.length > 0
            ? <>Types de séance HYROX réalisables avec votre profil : <b data-hr-feasible-roles>{ok.map((r) => titleOf(r.role)).join(', ')}</b>.</>
            : <b data-hr-feasible-roles="">Aucun type de séance HYROX n’est réalisable avec votre profil actuel : aucune séance HYROX ne serait proposée.</b>}
        </span>
        {ko.length > 0 && (
          <>
            <span>Impossibles avec ce profil :</span>
            <ul className="tiny" style={{ margin: 0, paddingLeft: 18 }} data-hr-infeasible-roles>
              {ko.map((r) => <li key={r.role} data-hr-infeasible-role={r.role}><b>{titleOf(r.role)}</b> — {hrRestrictionText(r)}.</li>)}
            </ul>
          </>
        )}
        {chosen?.status === 'infeasible' && <span data-hr-chosen-infeasible={chosen.role}>Le type choisi « {titleOf(chosen.role)} » ne peut pas être composé : aucune séance HYROX ne serait proposée.</span>}
        {balanced && ko.length > 0 && ok.length > 0 && <span data-hr-balanced-impact>Mode « {HR_BALANCED_LABEL.title} » : les semaines où le programme retient un type impossible, cette séance HYROX n’est pas proposée.</span>}
        {blocked && ok.length > 0 && (
          <div className="row wrap" role="group" aria-label="Types de séance HYROX réalisables">
            {ok.map((r) => (
              <button key={r.role} type="button" className="btn secondary" onClick={() => set((y) => ({ ...y, hyrox: { ...y.hyrox, role: r.role, focus: 'specialized' } }))}>Choisir « {titleOf(r.role)} »</button>
            ))}
          </div>
        )}
        {ko.length > 0 && <span className="tiny">Vous pouvez aussi modifier votre niveau, votre matériel ou vos disponibilités.</span>}
      </div>
    </Notice>
  );
}
