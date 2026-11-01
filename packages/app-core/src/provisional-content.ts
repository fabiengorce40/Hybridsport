import { PERSONALIZATION_V1 } from '../../strength/content/personalization-v1.js';
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
import { strengthL1V3RulesetDocument } from '../../strength/tests/fixtures/l1v3.js';
import { strengthL1B4RulesetDocument } from '../../strength/tests/fixtures/l1b4.js';
import { strengthHautBasAbRulesetDocument } from '../../strength/tests/fixtures/hautbas-ab.js';
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
let strengthAb: ContentSource | undefined;
let strengthL1V3: ContentSource | undefined;
let strengthF6: ContentSource | undefined;
let strengthLock: ContentSource | undefined;
let running: ContentSource | undefined;

/**
 * Contenu Strength COURANT (planification des nouvelles semaines) : ruleset verrouillé 4F + surcouche RC4.5 F6
 * (mollets à temps résiduel) + surcouche RC4.6 L1-V3 (une isolation du haut du corps en Full Body) + surcouche RC4.6
 * L1b-4 (tirage complémentaire à temps résiduel) + surcouche Reprise RC5 lot 4 (archétypes Haut A/B et Bas A/B, membre
 * préféré, replis conservés), catalogue de test Strength F6. Les archétypes existants sont inchangés.
 */
export function strengthContent(): ContentSource {
  strengthAb ??= load(strengthHautBasAbRulesetDocument(), strengthF6CatalogDocument(), 'fixtures:strength-hautbas-ab-0.8.0');
  return strengthAb;
}

/**
 * Contenu Strength RC4.6 L1b-4 : contenu courant jusqu'au lot 4 de la reprise RC5, puis conservé au registre. Base de la personnalisation
 * V2.1/V2.2 (semaines générées sous la version `0.8.0-strength-personalization-v1`).
 */
function strengthL1B4Content(): ContentSource {
  strength ??= load(strengthL1B4RulesetDocument(), strengthF6CatalogDocument(), 'fixtures:strength-l1b4-0.7.0');
  return strength;
}

/** Contenu Strength ANTÉRIEUR conservé (RC4.6 L1-V3, avant L1b-4). */
function strengthL1V3Content(): ContentSource {
  strengthL1V3 ??= load(strengthL1V3RulesetDocument(), strengthF6CatalogDocument(), 'fixtures:strength-l1v3-0.6.0');
  return strengthL1V3;
}

/** Contenu Strength ANTÉRIEUR conservé (RC4.5 F6, avant L1-V3) : ruleset F6 et catalogue de test F6. */
function strengthF6Content(): ContentSource {
  strengthF6 ??= load(strengthF6RulesetDocument(), strengthF6CatalogDocument(), 'fixtures:strength-f6-0.5.0');
  return strengthF6;
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
/**
 * Reprise RC5 (lot 1) — registre COMPLET des contenus Strength relisibles : contenu courant et sa personnalisation,
 * puis chaque contenu antérieur et (s'il a servi de base) sa personnalisation. Une version persistée désigne UN seul
 * contenu (vérifié par test) : les semaines déjà générées sont relues avec leurs règles d'origine.
 */
export function strengthContentRegistry(): readonly ContentSource[] {
  return [strengthContent(), personalizedStrengthContent(strengthContent()), strengthL1B4Content(), personalizedStrengthContent(strengthL1B4Content()), strengthL1V3Content(), strengthF6Content(), strengthLockContent()];
}

export function strengthContentFor(rulesetVersion: string, catalogVersion: string): ContentSource | undefined {
  return strengthContentRegistry().find((c) => c.ruleset.version === rulesetVersion && c.catalog.version === catalogVersion);
}

/** Ruleset de test du CORE (avec les paramètres d'anti-doublon, provisoires) et catalogue de test : ceux des tests Running. */
export function runningContent(): ContentSource {
  running ??= load(testRulesetDocumentWithDuplicate(), testCatalogDocument(), 'fixtures:core-test-duplicate');
  return running;
}

/** Préréglages de matériel du catalogue de test (identifiants et noms fournis par le catalogue). */
export const EQUIPMENT_PRESETS: readonly { readonly id: string; readonly name: string; readonly equipment: readonly string[] }[] =
  STRENGTH_PRESETS.map((p) => ({ id: p.id, name: p.name, equipment: [...p.equipment] }));

/** Contenu V2.1 distinct, uniquement pour les profils qui ont choisi la personnalisation. */
const personalContentCache = new WeakMap<LoadedRuleset, ContentSource>();
/** Version historique de la personnalisation V2.1/V2.2, construite sur L1b-4 : conservée telle quelle (semaines existantes). */
export const LEGACY_PERSONALIZATION_VERSION = '0.8.0-strength-personalization-v1';
/**
 * Reprise RC5 (lot 1, corrigé au lot 4) — version d'un contenu personnalisé DÉRIVÉE de sa base : `<base>.personalization-v1`
 * (identifiant de pré-version SemVer ; le `+` initial était refusé par le chargeur, jamais chargé ni persisté). Seule la
 * base L1b-4 garde le nom historique, pour que les semaines V2.1/V2.2 restent relues avec leur contenu d'origine. Sans
 * cette règle, la personnalisation d'une nouvelle base (RC5.1) porterait le MÊME nom qu'un contenu différent.
 */
export function personalizedRulesetVersion(base: ContentSource): string {
  return base.ruleset.version === strengthL1B4Content().ruleset.version && base.catalog.version === strengthL1B4Content().catalog.version
    ? LEGACY_PERSONALIZATION_VERSION
    : `${base.ruleset.version}.personalization-v1`;
}

export function personalizedStrengthContent(base: ContentSource): ContentSource {
  if (base.ruleset.parameter('strength.personalization')) return base;
  const cached = personalContentCache.get(base.ruleset);
  if (cached) return cached;
  const doc = base.ruleset.document;
  const r = loadRuleset({ ...doc, rulesetVersion: personalizedRulesetVersion(base), parameters: [...doc.parameters, {
    id: 'strength.personalization', value: PERSONALIZATION_V1, governance: 'G2', version: '1.0.0', modifiedAt: '2026-10-29', status: 'draft', confidence: 'provisional', provisional: true,
    source: { kind: 'internal_hypothesis' }, justification: 'V2.1 CANDIDATE : politique de personnalisation expérimentale, jamais approuvée en production.',
  }] } as Parameters<typeof loadRuleset>[0]);
  if (!r.ok) throw new Error('Contenu personnalisé Strength invalide');
  const out = { ...base, ruleset: r.ruleset, origin: 'fixtures:strength-personalization-v1' };
  personalContentCache.set(base.ruleset,out);
  return out;
}
