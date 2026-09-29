/**
 * Validation structurelle QUALITATIVE (carte §13 point 6), sans aucune valeur sportive :
 * - représentabilité d'un mouvement : un mouvement chargé ne peut pas être prescrit tant que le CORE ne sait
 *   pas porter une charge dans un bloc de conditioning (RFC CORE-EXT-C1, non autorisée) ;
 * - admissibilité d'un format pour un stimulus : lue dans `ct.stimulus.admissibleFormats` ; non résolue ou
 *   illisible ⇒ refus (jamais une table implicite).
 */
import { z } from 'zod';
import type { Exercise, ReasonCode } from '@hybridsport/domain';
import { CT_FORMATS, CT_STIMULI } from './model.js';
import type { CtFormat, CtMode, CtStimulus } from './model.js';
import { CT_CODES, ctReasons } from './codes.js';
import { resolveParameter } from './governance/parameters.js';
import type { CtGovernance } from './governance/state.js';

/** Seul modèle de charge représentable sans charge externe : le poids du corps (charge ajoutée absente). */
const UNLOADED_MODEL = 'bodyweight_plus';

export type Representability = { readonly representable: true } | { readonly representable: false; readonly reasons: readonly ReasonCode[] };

export function movementRepresentability(exercise: Pick<Exercise, 'id' | 'loadable' | 'loadModel'>, governance: CtGovernance): Representability {
  if (!exercise.loadable) return { representable: true };
  const loadModel = exercise.loadModel ?? 'unspecified';
  if (loadModel === UNLOADED_MODEL) return { representable: true };
  const reasons: ReasonCode[] = [ctReasons.emit(CT_CODES.MOVEMENT_LOAD_UNREPRESENTABLE, { exerciseId: exercise.id, loadModel })];
  if (governance.technical.CORE_EXT_C1 !== 'SATISFIED') reasons.push(ctReasons.emit(CT_CODES.TECHNICAL_DEPENDENCY, { dependencyId: 'CORE_EXT_C1' }));
  // Même avec CORE-EXT-C1, C1 ne sait prescrire aucune charge : le refus demeure.
  return { representable: false, reasons };
}

const ADMISSIBLE_FORMATS_ID = 'ct.stimulus.admissibleFormats';
/** Forme attendue de la valeur (quand un expert l'aura décidée) : stimulus → formats admissibles. */
const zAdmissibleFormats = z.partialRecord(z.enum(CT_STIMULI), z.array(z.enum(CT_FORMATS)));

export type FormatAdmissibility =
  | { readonly status: 'admissible'; readonly reasons: readonly ReasonCode[] }
  | { readonly status: 'inadmissible'; readonly reasons: readonly ReasonCode[] }
  | { readonly status: 'unresolved'; readonly reasons: readonly ReasonCode[] };

export function formatAdmissibility(stimulus: CtStimulus, format: CtFormat, governance: CtGovernance, mode: CtMode): FormatAdmissibility {
  const refusal = (extra: readonly ReasonCode[]): FormatAdmissibility => ({
    status: 'unresolved',
    reasons: [ctReasons.emit(CT_CODES.FORMAT_ADMISSIBILITY_UNRESOLVED, { stimulus, format, parameterId: ADMISSIBLE_FORMATS_ID }), ...extra],
  });
  const r = resolveParameter(governance.parameters, ADMISSIBLE_FORMATS_ID, mode);
  if (r.status === 'unresolved') return refusal(r.reasons);
  const table = zAdmissibleFormats.safeParse(r.value);
  if (!table.success) return refusal([...r.reasons, ctReasons.emit(CT_CODES.UNRESOLVED_PARAMETER, { parameterId: ADMISSIBLE_FORMATS_ID, cause: 'UNREADABLE', mode })]);
  const formats = table.data[stimulus];
  // Stimulus absent de la table décidée ⇒ non résolu pour ce stimulus (jamais « tous les formats »).
  if (formats === undefined) return refusal([...r.reasons, ctReasons.emit(CT_CODES.UNRESOLVED_PARAMETER, { parameterId: ADMISSIBLE_FORMATS_ID, cause: 'STIMULUS_ABSENT', mode })]);
  return { status: formats.includes(format) ? 'admissible' : 'inadmissible', reasons: r.reasons };
}
