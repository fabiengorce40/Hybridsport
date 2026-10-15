import { CT_INTENT_LABELS, ctIntentFeasibility, HR_GOAL_LABELS, HR_ROLE_LABELS, hyroxRoleFeasibility, programmeStatusAt, programmeTargetDate, programmeWeekIndex, RUNNING_GOAL_LABELS, selectBeta0Week, STRENGTH_GOAL_LABELS, strengthSupportedFrequencies } from '@hybridsport/app-core';
import { useMemo } from 'react';
import { useStore } from '../../store.js';
import { formatDate, Notice } from '../../ui.js';
import { sessionName, sportName } from '../../present.js';
import { ExperimentalBadge } from './common.js';
import { StrengthWeekCard } from '../../strength/StrengthInsight.js';
import { hrRestrictionText } from './HrFeasibility.js';

/**
 * Programme. « Modifier » ouvre l'assistant en PLEIN ÉCRAN (géré par l'App, sans barre de navigation) : il n'est jamais
 * rendu à l'intérieur de l'onglet, où la navigation fixe recouvrait ses actions (Retour / Continuer).
 */
export function Programme0({ onEdit }: { onEdit: () => void }) {
  const { state, clock } = useStore();
  const ps = state.programmeState;
  const p = state.profile;
  if (!ps || !p) return null;
  const d = ps.definition;
  const i = programmeWeekIndex(state, clock().today) ?? -1;
  const target = programmeTargetDate(d);
  // Cross-training : seul objectif Beta 0 = forme générale, avec l'intention déclarée ; HYROX : objectif déclaré.
  const goalText = (g: (typeof d.goals)[number]): string => (g.sport === 'strength' ? STRENGTH_GOAL_LABELS[g.goal] : g.sport === 'running' ? RUNNING_GOAL_LABELS[g.goal]
    : g.sport === 'hyrox' ? HR_GOAL_LABELS[g.goal] : g.sport === 'crosstraining' ? `Forme générale${CT_INTENT_LABELS[p.crosstraining.intent ?? '']?.title ? ` · ${CT_INTENT_LABELS[p.crosstraining.intent ?? '']?.title ?? ''}` : ''}` : undefined) ?? '';
  return (
    <div className="screen">
      <div className="row between"><h1 className="screen-title">Programme</h1><ExperimentalBadge /></div>
      <Notice tone="sim">Certaines règles de planification sont encore en cours de validation. Les séances ne sont pas des recommandations établies.</Notice>
      <div className="card">
        <div className="row between"><strong>Semaine actuelle</strong><span className="num">{programmeStatusAt(state, clock().today) === 'active' ? String(i + 1) : '—'}</span></div>
        <div className="small muted">Début : {formatDate(d.startWeek)}</div>
        {target ? <div className="small"><b>Objectif le {formatDate(target)}</b></div> : null}
        <p className="small" style={{ margin: 0 }}>{target ? 'Votre programme évolue semaine après semaine jusqu’à votre objectif.' : 'Votre programme évolue semaine après semaine, sans date de fin.'}</p>
      </div>
      {d.priorities.map((sp, k) => {
        const plan = d.sports.find((x) => x.sport === sp);
        const goal = d.goals.find((g) => g.sport === sp);
        return (
          <div key={sp} className="card">
            <div className="row between"><h3>{sportName(sp)}</h3>{d.priorities.length > 1 && <span className="badge neutral">Priorité {String(k + 1)}</span>}</div>
            <div className="small muted">Objectif : {goal ? goalText(goal) : '—'}{goal && 'targetDate' in goal && goal.targetDate ? ` · le ${formatDate(goal.targetDate)}` : ''}</div>
            <div className="small muted">{String(plan?.sessionsPerWeek ?? 0)} séance{(plan?.sessionsPerWeek ?? 0) > 1 ? 's' : ''} par semaine{plan?.composition === 'engine' ? ` · composition de la semaine par le moteur ${sportName(sp)}` : ''}</div>
            {sp === 'hyrox' && <><HyroxMode /><HrRoleCheck /></>}
            {sp === 'crosstraining' && <CtIntentCheck />}
            {sp === 'strength' && !strengthSupportedFrequencies().includes(plan?.sessionsPerWeek ?? 0) && (
              <Notice tone="warn"><span data-strength-frequency-unsupported>KAIRO ne sait pas encore composer {String(plan?.sessionsPerWeek ?? 0)} séances de musculation par semaine : aucune séance n’est inventée. Choisissez {String(Math.max(...strengthSupportedFrequencies()))} séances ou moins dans « Modifier ».</span></Notice>
            )}
          </div>
        );
      })}
      {p.strength.enabled && (() => { const w = selectBeta0Week(state, clock().today); return w ? <StrengthWeekCard weekStart={w.weekStart} /> : null; })()}
      <div className="section-title">Modifier</div>
      <p className="small muted" style={{ margin: 0 }}>Changer de sports, d’objectifs, de fréquence ou de disponibilités recrée le programme. Votre historique est conservé.</p>
      <button className="btn secondary" onClick={onEdit}>Modifier et recréer le programme</button>
    </div>
  );
}

/**
 * HYROX : mode choisi (Équilibré ou un type de séance) et types proposés cette semaine. Équilibré n'est PAS présenté
 * comme scientifiquement équilibré (non établi) : KAIRO alterne seulement les types de séances au fil des semaines.
 */
function HyroxMode() {
  const { state, clock } = useStore();
  const hr = state.profile?.hyrox;
  if (!hr?.enabled) return null;
  const week = selectBeta0Week(state, clock().today);
  const types = [...new Set((week?.sessions ?? []).filter((x) => x.sport === 'hyrox' && x.placement !== 'blocked').map((x) => sessionName(x.sport, x.archetypeId, x.dataError)))];
  return (
    <div className="stack" style={{ gap: 4 }} aria-label="Mode HYROX">
      {hr.focus === 'balanced'
        ? <><div className="small"><b>Mode : Équilibré</b></div><div className="small muted">KAIRO alterne différents types de séances HYROX au fil des semaines.</div></>
        : <div className="small"><b>Type de séance : {HR_ROLE_LABELS[hr.role ?? '']?.title ?? '—'}</b></div>}
      {types.length > 0 && <div className="small muted">Cette semaine : {types.join(', ')}</div>}
    </div>
  );
}

/**
 * RC3.2 A3 — profil EXISTANT : l'intention Cross-training enregistrée est-elle réalisable avec le profil actuel ? Sonde
 * du moteur réel (aucune table) ; irréalisable ⇒ avis et intentions réalisables, à choisir dans « Modifier ».
 */
function CtIntentCheck() {
  const { state, clock } = useStore();
  const p = state.profile;
  const key = p && (p.crosstraining.returnState ?? 'NONE') === 'NONE' ? JSON.stringify([p.level, p.equipment.items, p.availability, p.crosstraining.intent]) : null;
  const feasibility = useMemo(() => (key && p ? ctIntentFeasibility(p, clock()) : null), [key]);
  const chosen = feasibility?.find((c) => c.intent === p?.crosstraining.intent);
  if (!chosen || chosen.status !== 'infeasible') return null;
  const options = (feasibility ?? []).filter((c) => c.status === 'feasible').map((c) => `« ${CT_INTENT_LABELS[c.intent]?.title ?? c.intent} »`);
  return (
    <Notice tone="warn">
      <span data-ct-infeasible-programme={chosen.intent}>
        L’intention « {CT_INTENT_LABELS[chosen.intent]?.title ?? chosen.intent} » ne peut pas être composée avec votre profil actuel : aucune séance de Cross-training n’est proposée.{' '}
        {options.length > 0 ? `Réalisables avec ce profil : ${options.join(', ')} — à choisir dans « Modifier ».` : 'Aucune intention n’est réalisable avec ce profil : modifiez le matériel, le niveau ou les disponibilités dans « Modifier ».'}
      </span>
    </Notice>
  );
}

/**
 * RC4.2 — profil EXISTANT : types de séance HYROX réalisables avec le profil actuel (sonde du moteur réel, aucune
 * table). Affiché seulement si le moteur refuse au moins un type : types impossibles et leur restriction, impact sur
 * le type choisi ou le mode Équilibré ; les changements se font dans « Modifier ».
 */
function HrRoleCheck() {
  const { state, clock } = useStore();
  const p = state.profile;
  const key = p?.hyrox.enabled && (p.hyrox.returnState ?? 'NONE') === 'NONE' ? JSON.stringify([p.level, p.equipment.items, p.availability, p.hyrox.goal, p.hyrox.role, p.hyrox.focus]) : null;
  const feasibility = useMemo(() => (key && p ? hyroxRoleFeasibility(p, clock()) : null), [key]);
  const ko = (feasibility ?? []).filter((r) => r.status === 'infeasible');
  if (!p || ko.length === 0) return null;
  const ok = (feasibility ?? []).filter((r) => r.status === 'feasible').map((r) => `« ${HR_ROLE_LABELS[r.role]?.title ?? r.role} »`);
  const balanced = p.hyrox.focus === 'balanced';
  const chosenKo = !balanced && ko.some((r) => r.role === p.hyrox.role);
  return (
    <Notice tone="warn">
      <div className="stack" style={{ gap: 4 }} data-hr-infeasible-programme={chosenKo ? 'chosen' : balanced ? 'balanced' : 'other'}>
        <span>{ok.length > 0 ? `Types de séance HYROX réalisables avec votre profil : ${ok.join(', ')}.` : 'Aucun type de séance HYROX n’est réalisable avec votre profil actuel : aucune séance HYROX n’est proposée.'}</span>
        <span className="tiny">Impossibles : {ko.map((r) => `« ${HR_ROLE_LABELS[r.role]?.title ?? r.role} » (${hrRestrictionText(r)})`).join(' ; ')}.</span>
        {chosenKo && <span>Le type choisi ne peut pas être composé : aucune séance HYROX n’est proposée. Choisissez un type réalisable dans « Modifier ».</span>}
        {balanced && ok.length > 0 && <span>Mode « Équilibré » : les semaines où le programme retient un type impossible, cette séance HYROX n’est pas proposée.</span>}
      </div>
    </Notice>
  );
}
