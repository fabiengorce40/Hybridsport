/** Couche déterministe V2.1 : mêmes pipeline, contrôles CORE et progression. */
import type { Exercise, Level } from '@hybridsport/domain';
import type { StrengthParams, DoseCell } from './params.js';
import type { StrengthPersonalization } from './personalization-contract.js';

export function strengthExperienceLevel(p: StrengthPersonalization, params: StrengthParams): Level {
  const rule = params['strength.personalization'];
  if (!rule) throw new Error('Politique de personnalisation absente');
  const e = p.experience;
  if (e.months < rule.noviceMonths || e.regularSessions === 0 || e.technique === 'learning') return 'novice';
  if (e.months < rule.beginnerMonths || e.regularSessions < rule.regularMinimum) return 'beginner';
  return e.months >= rule.advancedMonths && e.technique === 'advanced' ? 'advanced' : 'intermediate';
}
export function strengthMethod(p: StrengthPersonalization, params: StrengthParams): 'hypertrophy' | 'strength' | 'general' {
  const rule = params['strength.personalization'];
  if (!rule) throw new Error('Politique de personnalisation absente');
  // Un souhait explicite de volume ciblé emploie l'hypertrophie, même sans prise de masse générale.
  return p.outcome !== 'strength' && p.priorities.some(z => z.intention === 'volume') ? 'hypertrophy' : rule.goals[p.outcome].method;
}
export const focusZone = (slotId: string): string | undefined => slotId.split('.focus.')[1];
export function focusAccepts(e: Exercise, slotId: string, params: StrengthParams): boolean {
  const zone = focusZone(slotId);
  return zone === undefined || (params['strength.personalization']?.zones[zone]?.muscles ?? []).some(m => e.muscles.primary.includes(m));
}

/** Les bornes G1 ne sont jamais relevées ; les besoins requis et les moteurs voisins restent inchangés. */
export function personalizedStrengthParams(base: StrengthParams, p?: StrengthPersonalization, otherSports: readonly string[] = []): StrengthParams {
  if (!p) return base;
  const rule = base['strength.personalization'];
  if (!rule) throw new Error('Politique de personnalisation absente');
  const factor = rule.goals[p.outcome].volumeFactor * (p.recovery === 'limited' ? rule.limitedFactor : 1) * (otherSports.length > 0 ? rule.hybridFactor : 1);
  const targetGroups = new Set(p.priorities.flatMap(x => rule.zones[x.zone]?.groups ?? []));
  const volume = base['strength.volume'];
  const weeklyRange = Object.fromEntries(Object.entries(volume.weeklyRange).map(([goal, levels]) => [goal,
    Object.fromEntries(Object.entries(levels).map(([level, groups]) => [level, Object.fromEntries(Object.entries(groups).map(([group, r]) => {
      const extra = targetGroups.has(group) ? (r.high-r.floor)*rule.priorityFraction / Math.max(1,p.priorities.length) : 0;
      const high = Math.max(1, Math.floor(r.high*factor));
      return [group, { floor: Math.min(high, Math.max(1, Math.round((r.floor+extra)*factor))), high }];
    }))]))
  ])) as StrengthParams['strength.volume']['weeklyRange'];
  const needs = { ...base['strength.needs'] };
  const priorities = p.priorities.flatMap(x => rule.zones[x.zone]?.needs ?? []);
  const focusNeeds = p.priorities.map(x => `focus_${x.zone}`);
  for (const zone of p.priorities) needs[`focus_${zone.zone}`] = { requirement: { region: rule.zones[zone.zone]?.region, movementTypes: ['strength','isometric'] } };
  const archetypes = base['strength.archetypes'].map(a => {
    if (a.usage === 'block') return a;
    const compatible = p.priorities.filter(x => a.id !== 'str_upper' || rule.zones[x.zone]?.region !== 'lower').filter(x => a.id !== 'str_lower' || rule.zones[x.zone]?.region !== 'upper');
    return { ...a, slots: [...a.slots, ...compatible.map(x => ({ id: `${a.id}.focus.${x.zone}`, blockId: 'b.accessory', need: `focus_${x.zone}`, role: 'accessory' as const, status: 'optional' as const, count: { min: 1, max: 1 }, modalityPreference: 'stability' as const, anchorable: false, trackable: true, untilWeeklyTarget: true }))] };
  });
  return { ...base, 'strength.volume': { ...volume, weeklyRange }, 'strength.needs': needs, 'strength.archetypes': archetypes,
    'strength.goals': Object.fromEntries(Object.entries(base['strength.goals']).map(([k,v]) => [k,{ ...v, needPriority: [...new Set([...priorities,...focusNeeds,...v.needPriority])] }])),
    'strength.stimuli': Object.fromEntries(Object.entries(base['strength.stimuli']).map(([k,v]) => [k,{ ...v, optionalOrder: [...focusNeeds,...v.optionalOrder] }])),
  };
}

/** Plages propres à l'intention, effort prudent et budget de récupération, sans charge arbitraire. */
export function personalizedDoseCell(cell: DoseCell, e: Exercise, role: string, params: StrengthParams, p?: StrengthPersonalization, otherSports: readonly string[] = []): DoseCell {
  const rule = params['strength.personalization'];
  if (!p || !rule) return cell;
  const priority = p.priorities.find(x => rule.zones[x.zone]?.muscles.some(m => e.muscles.primary.includes(m)));
  // La force principale prime sur une intention accessoire contradictoire.
  const specific = priority && !(p.outcome === 'strength' && role === 'primary') ? rule.intentions[priority.intention] : undefined;
  const cautious = strengthExperienceLevel(p, params) === 'novice' || p.recovery === 'limited' || otherSports.length > 0;
  const max = cautious ? Math.min(cell.sets.max, rule.noviceSetsMax) : cell.sets.max;
  return { ...cell,
    sets: { min: Math.min(cell.sets.min,max), max },
    reps: specific?.reps ?? cell.reps,
    rir: Math.max(cell.rir,specific?.rir ?? 0,cautious ? rule.cautiousRir : 0),
    restS: { min: Math.max(cell.restS.min,specific?.restMinS ?? 0), max: Math.max(cell.restS.max,specific?.restMinS ?? 0) },
  };
}
