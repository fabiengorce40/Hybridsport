import { loadCatalog, loadRuleset } from '../../src/index.js';
import type { LoadedCatalog, LoadedRuleset } from '../../src/index.js';
import { testCatalogDocument } from './catalog.js';
import { testRulesetDocument } from './ruleset.js';

export function testRuleset(doc = testRulesetDocument()): LoadedRuleset {
  const r = loadRuleset(doc);
  if (!r.ok) throw new Error(`Ruleset de test invalide : ${r.issues.map((i) => JSON.stringify(i.params)).join(' | ')}`);
  return r.ruleset;
}

export function testCatalog(doc = testCatalogDocument()): LoadedCatalog {
  const r = loadCatalog(doc);
  if (!r.ok) throw new Error(`Catalogue de test invalide : ${r.issues.map((i) => JSON.stringify(i.params)).join(' | ')}`);
  return r.catalog;
}
