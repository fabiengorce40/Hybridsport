/**
 * Registre scientifique du StrengthEngine, version 1.0.0 (ruleset scientifique V1 candidat).
 */
import { STRENGTH_OPTIONAL_PARAMETER_SCHEMAS, STRENGTH_PARAMETER_SCHEMAS } from '../params.js';
import type { ScienceRegistry } from './types.js';
import { SCIENCE_SOURCES } from './sources.js';
import { SCIENCE_PRINCIPLES } from './principles.js';
import { PARAMETER_PROVENANCE, SCIENCE_RULESET_VERSION } from './provenance.js';

export * from './types.js';
export * from './validate.js';
export { SCIENCE_SOURCES } from './sources.js';
export { SCIENCE_PRINCIPLES } from './principles.js';
export { PARAMETER_PROVENANCE, SCIENCE_RULESET_VERSION } from './provenance.js';

export const SCIENCE_REGISTRY_VERSION = '1.0.0';

export const SCIENCE_REGISTRY: ScienceRegistry = {
  version: SCIENCE_REGISTRY_VERSION, rulesetVersion: SCIENCE_RULESET_VERSION,
  sources: SCIENCE_SOURCES, principles: SCIENCE_PRINCIPLES, parameters: PARAMETER_PROVENANCE,
};

/** Paramètres `strength.*` déclarés (obligatoires et facultatifs) avec leur gouvernance : périmètre de la provenance. */
export const DECLARED_STRENGTH_PARAMETERS = [
  ...Object.entries(STRENGTH_PARAMETER_SCHEMAS).map(([id, s]) => ({ id, governance: s.governance })),
  ...Object.entries(STRENGTH_OPTIONAL_PARAMETER_SCHEMAS).map(([id, s]) => ({ id, governance: s.governance })),
].sort((a, b) => (a.id < b.id ? -1 : 1));
