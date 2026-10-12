/**
 * P1 — MATÉRIEL DÉCLARÉ et MATÉRIEL INDISPONIBLE pendant la séance.
 *
 *   - Confirmation : un profil antérieur (présélection « Salle complète ») confirme son matériel EXPLICITEMENT ; rien
 *     n'est écrasé, rien n'est replanifié.
 *   - Matériel indisponible : l'exercice est remplacé par un substitut DIRECT du contrat Strength
 *     (`directSubstitutes` : substitutions DÉCLARÉES par le catalogue, invariants de prescription démontrés), faisable
 *     avec le matériel déclaré SANS le matériel de l'exercice, non exclu, et ne sollicitant aucune zone restreinte par
 *     le contrôle du jour. Aucun transfert de charge (contrat Strength) : une charge en kilos devient l'effort prescrit ;
 *     sans effort prescrit, la charge n'est pas transférable ⇒ refus. Aucun substitut ⇒ REFUS explicite, tracé.
 *   - Le remplacement est déterministe (`applySwaps`), relu à l'affichage ET à l'enregistrement de l'exécution.
 */
import { directSubstitutes } from '@hybridsport/strength';
import type { LoadedCatalog } from '@hybridsport/engine';
import type { Exercise, SessionDraft } from '@hybridsport/domain';
import type { AppState, ProgrammeLog, Reason } from './model.js';
import { AppError } from './errors.js';
import { normalizeInstant } from './dates.js';
import type { Clock } from './app.js';

/** Confirme le matériel déclaré (profil antérieur) sans modifier ni le matériel ni la planification. */
export function confirmEquipment(state: AppState, clock: Clock): AppState {
  const p = state.profile;
  if (!p) throw new AppError('PROFILE_MISSING');
  return { ...state, profile: { ...p, equipment: { ...p.equipment, confirmedAt: normalizeInstant(clock.now) } } };
}

/** Le profil doit-il confirmer son matériel (sport avec matériel, choix non confirmé) ? */
export function equipmentNeedsConfirmation(state: AppState): boolean {
  const p = state.profile;
  return p !== null && (p.strength.enabled || p.crosstraining.enabled || p.hyrox.enabled) && p.equipment.confirmedAt === undefined;
}

type Item = SessionDraft['blocks'][number]['items'][number];
type Sets = Extract<Item['prescription'], { type: 'sets' }>;

/** Prescription du substitut : séries, répétitions, repos inchangés ; une charge en kilos devient l'effort prescrit. */
export function substitutePrescription(p: Item['prescription']): Item['prescription'] | null {
  if (p.type !== 'sets') return p;
  const sets: Sets['sets'] = [];
  for (const s of p.sets) {
    const i = s.intensity;
    if (!i || i.mode === 'relative_to_working' || i.mode === 'bodyweight') { sets.push(s); continue; }
    if (i.mode === 'effort') { const { indicativeKg: _kg, ...rest } = i; sets.push({ ...s, intensity: rest }); continue; }
    if (!i.effort) return null;
    sets.push({ ...s, intensity: { mode: 'effort', effort: i.effort } });
  }
  return { ...p, sets };
}

/** Remplacements de la séance (ordre d'enregistrement), appliqués de façon déterministe. */
export function applySwaps(session: SessionDraft, swaps: ProgrammeLog['swaps']): SessionDraft {
  const done = (swaps ?? []).filter((w) => w.substituteId !== undefined);
  if (done.length === 0) return session;
  return {
    ...session,
    blocks: session.blocks.map((b) => ({
      ...b,
      items: b.items.map((it) => {
        const w = done.filter((x) => x.itemId === it.id).at(-1);
        if (!w?.substituteId) return it;
        const prescription = substitutePrescription(it.prescription);
        if (!prescription) return it;
        const { alternatives: _alt, refs, ...rest } = it;
        return { ...rest, exerciseId: w.substituteId, prescription, refs: { ...(refs?.slotId ? { slotId: refs.slotId } : {}), prescriptionSource: 'substitution', substitutedFrom: w.fromExerciseId } };
      }),
    })),
  };
}

const equipmentOf = (e: Exercise): string[] => [...e.equipment.allOf, ...e.equipment.anyOf];

/**
 * Matériel indisponible pour l'item `itemId` de la séance commencée : substitut validé, ou refus explicite.
 * `session` : séance affichée (planifiée ou adaptée, remplacements déjà appliqués) ; `restrictedAreas` : zones exclues
 * par le contrôle du jour.
 */
export function equipmentSwap(state: AppState, clock: Clock, log: ProgrammeLog, session: SessionDraft, itemId: string, catalog: LoadedCatalog, restrictedAreas: readonly string[]): ProgrammeLog {
  const p = state.profile;
  if (!p) throw new AppError('PROFILE_MISSING');
  if (log.finishedAt) throw new AppError('SESSION_FINISHED');
  const item = session.blocks.flatMap((b) => b.items).find((i) => i.id === itemId);
  if (!item || item.prescription.type !== 'sets') throw new AppError('SET_UNKNOWN');
  if (log.sets.some((x) => x.itemId === itemId && x.done)) throw new AppError('EQUIPMENT_SWAP_AFTER_SETS');
  const source = catalog.exercise(item.exerciseId);
  if (!source) throw new AppError('SET_UNKNOWN');
  const missing = equipmentOf(source);
  const available = new Set(p.equipment.items.filter((x) => !missing.includes(x)));
  const inSession = new Set(session.blocks.flatMap((b) => b.items.map((i) => i.exerciseId)));
  const verdicts = directSubstitutes(source, catalog).map((t) => ({
    t,
    why: !catalog.isFeasibleWith(t, available) ? 'equipment' : p.excludedExercises.includes(t.id) ? 'excluded' : inSession.has(t.id) ? 'already_in_session'
      : t.painSensitiveAreas.some((a) => restrictedAreas.includes(a)) ? 'pain_area' : null,
  }));
  const ok = verdicts.find((v) => v.why === null)?.t;
  const transferable = substitutePrescription(item.prescription) !== null;
  const at = normalizeInstant(clock.now);
  const reasons: Reason[] = ok && transferable
    ? [{ code: 'KAIRO.EQUIPMENT_SUBSTITUTED', params: { exerciseId: source.id, substituteId: ok.id, missing, contract: 'strength.substitution.direct' } }]
    : [{ code: 'KAIRO.EQUIPMENT_NO_VALIDATED_SUBSTITUTE', params: { exerciseId: source.id, missing, cause: !transferable ? 'load_not_transferable' : verdicts.length === 0 ? 'no_declared_substitute' : 'no_compatible_substitute', rejected: verdicts.map((v) => `${v.t.id}:${v.why ?? 'ok'}`) } }];
  const swap = { itemId, fromExerciseId: source.id, ...(ok && transferable ? { substituteId: ok.id } : {}), cause: 'equipment_unavailable' as const, at, reasons };
  return { ...log, swaps: [...(log.swaps ?? []), swap] };
}
