/**
 * CONTENU PROVISOIRE de KAIRO V0 — point d'entrée UNIQUE.
 *
 * Aucun ruleset ni catalogue de production n'existe dans le dépôt. Les seuls contenus disponibles sont les
 * fixtures des tests des moteurs : valeurs `provisional`, statut `draft`, contenus G1 FICTIFS. Ils sont
 * importés ici SANS copie ni modification, et chaque séance qui en dépend porte l'autorité `provisional`
 * (Strength) ou `simulation` (Running). Décision utilisateur du 2026-09-28 (docs/kairo/V0-ROADMAP.md §2).
 */
import { loadCatalog, loadRuleset } from '@hybridsport/engine';
import type { LoadedCatalog, LoadedRuleset } from '@hybridsport/engine';
import { strengthLockRulesetDocument } from '../../strength/tests/fixtures/ruleset.js';
import { STRENGTH_PRESETS, strengthCatalogDocument } from '../../strength/tests/fixtures/catalog.js';
import { strengthF6CatalogDocument, strengthF6RulesetDocument } from '../../strength/tests/fixtures/f6.js';
import { testRulesetDocumentWithDuplicate } from '../../engine/tests/fixtures/ruleset.js';
import { testCatalogDocument } from '../../engine/tests/fixtures/catalog.js';

export interface ContentSource {
  readonly ruleset: LoadedRuleset;
  readonly catalog: LoadedCatalog;
  /** Statut de gouvernance du contenu : jamais `production` en V0. */
  readonly authority: 'provisional';
  readonly origin: string;
}

function load(rulesetDoc: Parameters<typeof loadRuleset>[0], catalogDoc: Parameters<typeof loadCatalog>[0], origin: string): ContentSource {
  const r = loadRuleset(rulesetDoc);
  if (!r.ok) throw new Error(`Contenu provisoire invalide (${origin}) : ruleset`);
  const c = loadCatalog(catalogDoc);
  if (!c.ok) throw new Error(`Contenu provisoire invalide (${origin}) : catalogue`);
  return { ruleset: r.ruleset, catalog: c.catalog, authority: 'provisional', origin };
}

let strength: ContentSource | undefined;
let strengthLock: ContentSource | undefined;
let running: ContentSource | undefined;

/**
 * Contenu Strength COURANT (planification des nouvelles semaines) : ruleset verrouillé 4F + surcouche RC4.5 F6
 * (mollets à temps résiduel) et catalogue de test Strength F6.
 */
export function strengthContent(): ContentSource {
  strength ??= load(strengthF6RulesetDocument(), strengthF6CatalogDocument(), 'fixtures:strength-f6-0.5.0');
  return strength;
}

/** Contenu Strength ANTÉRIEUR conservé (avant F6) : ruleset verrouillé PROVISOIREMENT (4F) et catalogue de test. */
function strengthLockContent(): ContentSource {
  strengthLock ??= load(strengthLockRulesetDocument(), strengthCatalogDocument(), 'fixtures:strength-lock-0.4.0');
  return strengthLock;
}

/**
 * RC4.5 (F6-V) — REGISTRE DE CONTENU VERSIONNÉ : contenu Strength d'une version PERSISTÉE (provenance d'une séance),
 * pour régénérer une séance existante avec ses règles d'origine (jamais rétroactivement avec le contenu courant).
 * Version inconnue ⇒ `undefined` (la séance n'est alors pas régénérable fidèlement : chemin « non reproductible »).
 */
export function strengthContentFor(rulesetVersion: string, catalogVersion: string): ContentSource | undefined {
  return [strengthContent(), strengthLockContent()].find((c) => c.ruleset.version === rulesetVersion && c.catalog.version === catalogVersion);
}

/** Ruleset de test du CORE (avec les paramètres d'anti-doublon, provisoires) et catalogue de test : ceux des tests Running. */
export function runningContent(): ContentSource {
  running ??= load(testRulesetDocumentWithDuplicate(), testCatalogDocument(), 'fixtures:core-test-duplicate');
  return running;
}

/** Préréglages de matériel du catalogue de test (identifiants et noms fournis par le catalogue). */
export const EQUIPMENT_PRESETS: readonly { readonly id: string; readonly name: string; readonly equipment: readonly string[] }[] =
  STRENGTH_PRESETS.map((p) => ({ id: p.id, name: p.name, equipment: [...p.equipment] }));
