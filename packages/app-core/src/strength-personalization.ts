/** Transport et édition non destructive. Les stratégies et doses appartiennent au moteur Strength. */
import { personalizedStrengthParams, readStrengthParams, strengthExperienceLevel, strengthMethod, zStrengthPersonalization } from '@hybridsport/strength';
import type { StrengthPersonalization } from '@hybridsport/strength';
import { zProgrammeState } from '@hybridsport/programme';
import type { AppState, Profile, ProfileInput } from './model.js';
import { zProfile } from './model.js';
import { personalizedStrengthContent, strengthContent } from './provisional-content.js';
import { AppError } from './errors.js';
import { addDays, weekStartOf } from './dates.js';
import type { Clock } from './app.js';
import { STIMULUS_BY_GOAL } from './planner.js';
export { STRENGTH_OUTCOMES, STRENGTH_ZONES, ZONE_INTENTIONS, zStrengthPersonalization } from '@hybridsport/strength';
export type { StrengthPersonalization, StrengthOutcome, StrengthZone } from '@hybridsport/strength';
export const personalizationParams = () => readStrengthParams(personalizedStrengthContent(strengthContent()).ruleset).values;
export const otherStrengthSports = (p: ProfileInput): string[] => (['running','hyrox','crosstraining'] as const).filter(s => p[s].enabled);
export const muscleLevel = (p: Profile): Profile['level'] => p.strength.personalization ? strengthExperienceLevel(p.strength.personalization,personalizationParams()) : p.level;
export function strengthParametersFor(p: Profile) {
  return personalizedStrengthParams(p.strength.personalization ? personalizationParams() : readStrengthParams(strengthContent().ruleset).values, p.strength.personalization,otherStrengthSports(p));
}
export function withStrengthPersonalization(p: ProfileInput, config: StrengthPersonalization): ProfileInput {
  const parsed = zStrengthPersonalization.parse(config);
  return { ...p, strength: { ...p.strength, goal: strengthMethod(parsed,personalizationParams()), personalization: parsed } };
}
export function defaultStrengthPersonalization(p: ProfileInput): StrengthPersonalization {
  // technical-constant: choix initiaux du formulaire, pas une dose prescrite ; à confirmer explicitement
  const initialMinutes = 60;
  return { version: 1, completed: false, outcome: p.strength.goal === 'hypertrophy' ? 'muscle' : p.strength.goal === 'strength' ? 'strength' : 'fitness', priorities: [],
    experience: { months: 0, regularSessions: 0, technique: 'learning' }, sessionMinutes: initialMinutes,
    days: p.availability.flatMap((m,i) => m>0 ? [i] : []), recovery: 'normal', avoidAreas: [], avoidExercises: [], likedExercises: [], painNow: false };
}
export function strengthPersonalizationSummary(p: ProfileInput) {
  const c = p.strength.personalization;
  if (!c) return null;
  const base = personalizationParams(); const rule = base['strength.personalization'];
  if (!rule) throw new Error('Politique absente');
  const method = strengthMethod(c,base); const level = strengthExperienceLevel(c,base);
  const params = personalizedStrengthParams(base,c,otherStrengthSports(p));
  return { method, level, strategy: rule.goals[c.outcome].strategy, policy: rule.version,
    volume: params['strength.volume'].weeklyRange[method]?.[level] ?? {},
    recoveryHours: rule.recoveryHours,
    conflict: c.outcome === 'strength' && c.priorities.some(z => z.intention !== 'strengthen') ? 'La force prime sur les mouvements principaux ; les intentions ciblées orientent les accessoires.' : 'Récupération et sécurité, puis objectif principal, puis zones dans votre ordre de priorité.',
    progression: 'Répétitions puis charge selon les séries réalisées et la marge d’effort ; aucune hausse automatique en cas de douleur ou de séance incomplète.',
    composition: ['silhouette','fat_loss','recomposition'].includes(c.outcome) ? 'Pas de perte de graisse localisée : l’aspect visuel dépend aussi de la composition corporelle globale, de l’alimentation et de la récupération.' : null };
}
/** Applique aux semaines à venir, jamais aux séances déjà planifiées, commencées ou terminées. */
export function updateStrengthPersonalization(state: AppState, input: ProfileInput, clock: Clock): AppState {
  if (!state.profile || !input.strength.personalization?.completed) throw new AppError('PROFILE_MISSING');
  const pBefore = state.profile;
  const draft = withStrengthPersonalization(input,input.strength.personalization);
  const p = zProfile.parse({ ...state.profile, strength: draft.strength, availability: draft.availability, equipment: { ...draft.equipment, confirmedAt: clock.now } });
  const weeks = Object.fromEntries(Object.entries(state.planner.weeks).map(([k,w]) => [k, { ...w, strengthProfile: w.strengthProfile ?? pBefore }]));
  const ps = state.programmeState;
  const stimulus = STIMULUS_BY_GOAL[p.strength.goal];
  let appliesFrom = addDays(weekStartOf(clock.today),p.availability.length);
  while (weeks[appliesFrom]) appliesFrom=addDays(appliesFrom,p.availability.length);
  const programmeState = ps ? zProgrammeState.parse({ ...ps, definition: { ...ps.definition,
    sports: ps.definition.sports.map(s => s.sport === 'strength' ? { ...s, sessionsPerWeek: p.strength.sessionsPerWeek, intent: { ...s.intent, stimulus, objective: `objective.${stimulus}` } } : s),
    goals: ps.definition.goals.map(g => g.sport === 'strength' ? { ...g, goal: p.strength.goal } : g),
  }, audit: [...ps.audit, { at: clock.now, weekIndex: null, reason: { code: 'KAIRO.STRENGTH_PERSONALIZATION_UPDATED', params: { appliesFrom, preservedWeeks: Object.keys(weeks).length } } }] }) : ps;
  return { ...state, profile: p, planner: { ...state.planner,weeks }, programmeState };
}

export function strengthExerciseOptions() {
  return [...strengthContent().catalog.exercises()].filter(e => e.status === 'active' && e.disciplines.includes('strength')).map(e => ({ id: e.id, name: e.canonicalName.fr ?? e.id }));
}
export function strengthAvoidAreaOptions(): string[] {
  return [...new Set([...strengthContent().catalog.exercises()].flatMap(e => e.painSensitiveAreas))].sort();
}

/** Profil de la dernière génération de la semaine ; jamais celui d'une édition future non appliquée. */
export function strengthProfileForWeek(state:AppState,weekStart:string):Profile|null {
 const w=state.planner.weeks[weekStart];
 return [...(w?.requests??[])].reverse().find(r=>r.sport==='strength'&&r.strengthProfile)?.strengthProfile??w?.strengthProfile??state.profile;
}
