import { asISODateTime } from '@hybridsport/domain';
import { ENGINE_VERSION } from '../../src/index.js';
import type { EngineContext, LoadedCatalog, LoadedRuleset } from '../../src/index.js';
import { testCatalog, testRuleset } from '../fixtures/load.js';

/** Contexte injecté du banc de test : instant, fuseau et graine explicites (aucune horloge système). */
export function coreContext(seed = 'harness-seed', ruleset: LoadedRuleset = testRuleset(), catalog: LoadedCatalog = testCatalog()): EngineContext<LoadedRuleset, LoadedCatalog> {
  return { now: asISODateTime('2026-09-28T08:00:00Z'), timezone: 'Europe/Paris', seed, engineVersion: ENGINE_VERSION, ruleset, catalog };
}
