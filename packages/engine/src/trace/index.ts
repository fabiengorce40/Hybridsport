export * from './registry.js';
export * from './core-codes.js';
export * from './trace.js';
export * from './schema-issue.js';

import { ReasonCodeRegistry } from './registry.js';
import { CORE_REASON_CODES } from './core-codes.js';

/** Registre des codes du CORE (les moteurs de discipline l'étendront). */
export function createCoreRegistry(extra: ConstructorParameters<typeof ReasonCodeRegistry>[0] = []): ReasonCodeRegistry {
  return new ReasonCodeRegistry([...CORE_REASON_CODES, ...extra]);
}
