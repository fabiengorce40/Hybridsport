/**
 * H2 — CONTRAT DE PRÉSENTATION (pour H2.5, aucune interface ici) et EXPOSITION, lus dans la séance PERSISTÉE sans
 * catalogue : la structure est portée par l'identifiant de bloc, la nature de chaque composante (station / course) par
 * le préfixe d'item. Aucune réinterprétation : une séance hors contrat H2 ⇒ `undefined`.
 */
import { asISODateTime } from '@hybridsport/domain';
import type { SessionDraft } from '@hybridsport/domain';
import type { H2Exposure } from '../model.js';
import { H2_BLOCK_MARK, H2_ITEM_MARK, H2_ITEM_PREFIX, HR_H2_RUN_PACE } from './compose.js';
import type { H2RunContext } from './compose.js';
import { HR_ROLE_SPECS, HR_STRUCTURES, roleFromArchetype } from './taxonomy.js';
import type { HrRole, HrSpecificity, HrStructure } from './taxonomy.js';

export interface H2Component {
  readonly itemId: string;
  readonly kind: 'station' | 'run';
  readonly exerciseId: string;
  /** Dose dans l'unité NATIVE (distance, répétitions, calories, durée) — jamais convertie. */
  readonly dose: { readonly kind: 'distance_m' | 'reps' | 'calories' | 'duration_s'; readonly value: number };
  readonly loadKg?: number;
  /** Course : fraîche ou après station ; allure BLOCKED (moteur Running). */
  readonly runContext?: H2RunContext;
  readonly pace?: typeof HR_H2_RUN_PACE;
}

export interface H2Presentation {
  readonly role: HrRole;
  readonly specificity: HrSpecificity;
  readonly structure: HrStructure;
  readonly rounds: number;
  /** Plafond PRESCRIT (jamais une cible de performance). */
  readonly timeCapS: number;
  readonly components: readonly H2Component[];
  /** Transitions entre composantes : nombre connu, durée INCONNUE (jamais affichée comme une valeur). */
  readonly transitions: { readonly count: number; readonly durationS: null };
}

const kindOfItem = (itemId: string): H2Component['kind'] | undefined => {
  const at = itemId.lastIndexOf(H2_ITEM_MARK);
  const tag = at < 0 ? '' : itemId.slice(at + H2_ITEM_MARK.length);
  return (Object.keys(H2_ITEM_PREFIX) as H2Component['kind'][]).find((k) => new RegExp(`^${H2_ITEM_PREFIX[k]}\\d+$`).test(tag));
};
const structureOfBlock = (blockId: string): HrStructure | undefined => {
  const at = blockId.lastIndexOf(H2_BLOCK_MARK);
  return at < 0 ? undefined : HR_STRUCTURES.find((s) => s === blockId.slice(at + H2_BLOCK_MARK.length));
};

/** Présentation d'une séance H2 persistée, ou `undefined` si la séance n'est pas une séance H2 intacte. */
export function h2PresentationOf(session: SessionDraft, archetypeId: string): H2Presentation | undefined {
  const role = roleFromArchetype(archetypeId);
  const block = session.blocks[0];
  if (!role || session.blocks.length !== 1 || !block || block.format !== 'for_time') return undefined;
  const structure = structureOfBlock(block.id);
  if (!structure) return undefined;
  const components: H2Component[] = [];
  for (const [k, it] of block.items.entries()) {
    const kind = kindOfItem(it.id);
    const p = it.prescription;
    const load = 'load' in p && p.load ? { loadKg: p.load.kg } : {};
    let dose: H2Component['dose'] | undefined;
    if (p.type === 'distance') dose = { kind: 'distance_m', value: p.distanceM };
    else if (p.type === 'reps') dose = { kind: 'reps', value: p.reps };
    else if (p.type === 'calories') dose = { kind: 'calories', value: p.calories };
    else if (p.type === 'timed') dose = { kind: 'duration_s', value: p.workS * p.rounds };
    if (!kind || !dose) return undefined;
    const previous = k === 0 ? undefined : block.items[k - 1];
    const run = kind === 'run' ? { runContext: (previous && kindOfItem(previous.id) === 'station') || (k === 0 && block.rounds > 1 && kindOfItem(block.items[block.items.length - 1]?.id ?? '') === 'station') ? 'after_station' as const : 'fresh' as const, pace: HR_H2_RUN_PACE } : {};
    components.push({ itemId: it.id, kind, exerciseId: it.exerciseId, dose, ...load, ...run });
  }
  return { role, specificity: HR_ROLE_SPECS[role].specificity, structure, rounds: block.rounds, timeCapS: block.timeCapS, components, transitions: { count: components.length * block.rounds - 1, durationS: null } };
}

/** Exposition (variété) d'une séance H2 prévue ou réalisée : rôle, structure, mouvements dans l'ordre. */
export function h2ExposureOf(session: SessionDraft, archetypeId: string, sessionId: string, at: string): H2Exposure | undefined {
  const p = h2PresentationOf(session, archetypeId);
  return p ? { sessionId, at: asISODateTime(at), role: p.role, structure: p.structure, exercises: p.components.map((c) => c.exerciseId) } : undefined;
}
