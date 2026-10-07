/**
 * C1/C2 — architecture du CrossTrainingEngine :
 * - dépendances : relatif, @hybridsport/domain, @hybridsport/engine, zod ; personne ne dépend du Cross-training ;
 * - aucune valeur sportive en dur (aucun littéral numérique hors 0 / 1 non justifié) ; aucune valeur de fixture du
 *   catalogue lue ; aucun débit de mouvement lu (l'estimation reste au CORE) ;
 * - propositions émises par le SEUL chemin C2 (corridor strict) ; sinon no_valid_proposal ; aucune horloge ni hasard ;
 * - Running et Strength inchangés depuis la baseline Course acceptée ; CORE inchangé hors évolution C2 autorisée.
 */
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { collectImports, findBypassIdentifiers, findClockAndRandomUsage, findForbiddenGlobals, findUnjustifiedNumericLiterals, loadCoreSources } from '../../../engine/tests/architecture/source-scanner.js';

const ct = loadCoreSources(['packages/crosstraining/src']);
const others = loadCoreSources(['packages/domain/src', 'packages/engine/src', 'packages/strength/src', 'packages/running/src', 'packages/app-core/src']);
/** Baseline acceptée (gate Course) : aucun fichier de ces paquets ne doit changer pour le Cross-training… */
const ACCEPTED_BASELINE = '1d37a50';
/**
 * … SAUF la liste FERMÉE de l'évolution CORE autorisée pour C2 (empreinte à dimensions explicites, session_record v5)
 * et pour HYROX H1 (charge générique facultative hors séries, session_record v6),
 * ses tests, et l'empreinte de sources F20 de Strength qui la constate, plus les lots Strength S1 (composition hebdomadaire) et S2 (contrat de substitution).
 * Running `src` : aucun changement.
 * Toute autre modification de ces paquets échoue ici.
 */
/**
 * Lot Strength S1 (hors Cross-training, liste FERMÉE) : composition hebdomadaire PROPRE au moteur Strength, codes associés,
 * et prise en compte des expositions PRÉVUES de la semaine (empreintes `planned`) dans l'alternance des groupes de choix.
 */
const STRENGTH_S1_CHANGES = [
  'packages/strength/src/composition.ts',
  'packages/strength/src/codes.ts',
  'packages/strength/src/engine.ts',
  'packages/strength/src/index.ts',
  'packages/strength/tests/unit/composition.test.ts',
];
/**
 * Lot Strength S2 (hors Cross-training, liste FERMÉE) : contrat de substitution directe du moteur Strength, alternatives
 * des séances issues de ce contrat (goldens : seul le champ `alternatives` change), audit du catalogue et garde.
 */
const GOLDEN_SETS = ['__goldens__', '__goldens_4f__', '__goldens_v1__'];
// technical-constant: scénarios golden S1–S7 (identifiants de fichiers)
const GOLDEN_IDS = [1, 2, 3, 4, 5, 6, 7];
const STRENGTH_S2_CHANGES = [
  'packages/strength/src/substitution.ts',
  'packages/strength/tests/substitution/audit.ts',
  'packages/strength/tests/unit/substitution-contract.test.ts',
  'packages/strength/tests/architecture/__reports__/substitution-audit.md',
  ...GOLDEN_SETS.flatMap((d) => GOLDEN_IDS.map((i) => `packages/strength/tests/golden/${d}/S${String(i)}.json`)),
];
/**
 * Lot Strength S3 (hors Cross-training, liste FERMÉE) : programmation longitudinale — prescription hebdomadaire
 * (week-prescription.ts), trace des groupes de choix (archetypes.ts, engine.ts, codes.ts), preuve de progression
 * `load_deviation` (progression.ts) ; goldens : seule la raison `SELECT.CHOICE_GROUP` est ajoutée (listés en S2).
 */
const STRENGTH_S3_CHANGES = [
  'packages/strength/src/week-prescription.ts',
  'packages/strength/src/archetypes.ts',
  'packages/strength/src/progression.ts',
  'packages/strength/tests/unit/progression.test.ts',
  'packages/strength/tests/unit/s3-longitudinal.test.ts',
];
/**
 * Lot Strength S4 (hors Cross-training, liste FERMÉE) : continuité déclarée (context.ts, model.ts, engine.ts,
 * selection.ts), alternatives par instance d'emplacement, priorité des sports tracée, preuve d'exposition et décisions
 * bloquées (progression.ts), bilan de volume (week-prescription.ts) ; rapports de simulation P1 / P3 (écarts dus aux
 * alternatives par instance).
 */
const STRENGTH_S4_CHANGES = [
  'packages/strength/src/context.ts',
  'packages/strength/src/model.ts',
  'packages/strength/src/selection.ts',
  'packages/strength/tests/unit/s4-continuity-evidence.test.ts',
  'packages/strength/tests/longitudinal/__reports__/P1.md',
  'packages/strength/tests/longitudinal/__reports__/P3.md',
];
/**
 * Lot Strength S5 (hors Cross-training, liste FERMÉE) : effort observé / inconnu (jamais RIR 0 supposé dans la
 * progression), preuve centralisée, historique longitudinal des preuves dans la track ; scénario C (preuves sur
 * plusieurs expositions) et son rapport.
 */
const STRENGTH_S5_CHANGES = [
  'packages/strength/tests/longitudinal/evidence-longitudinal.test.ts',
  'packages/strength/tests/longitudinal/__reports__/evidence-longitudinal.md',
];
const CT_C2_AUTHORIZED_CORE_CHANGES = [
  'packages/domain/src/duplicate.ts',
  'packages/domain/src/serialization.ts',
  // HYROX H1 : charge générique facultative sur les doses hors séries (session_record v6).
  'packages/domain/src/session.ts',
  'packages/engine/src/duplicate/analysis.ts',
  'packages/engine/src/duplicate/fingerprint.ts',
  'packages/engine/src/migration/migrations.ts',
  // Frontière de sécurité générique : aucune charge transférée à un substitut par la réparation.
  'packages/engine/src/repair/repair.ts',
  'packages/engine/src/trace/core-codes.ts',
  'packages/engine/tests/unit/repair-load-transfer.test.ts',
  // Frontière d'allure (réparation) et profil de demande standard (normalisation gouvernée facultative).
  'packages/engine/tests/unit/repair-pace-transfer.test.ts',
  'packages/engine/src/catalog/index.ts',
  'packages/engine/src/catalog/session-demand.ts',
  'packages/engine/src/rules/core-parameters.ts',
  'packages/engine/tests/unit/session-demand.test.ts',
  'packages/engine/tests/unit/core-ext-r1.test.ts',
  'packages/engine/tests/unit/duplicate.test.ts',
  'packages/engine/tests/unit/fingerprint-explicit.test.ts',
  'packages/engine/tests/unit/item-load.test.ts',
  'packages/engine/tests/unit/migration.test.ts',
  'packages/strength/tests/architecture/__reports__/core-source-digest.txt',
  // CORE « demand repetition » (eab25cf) : tours `for_time` comptés dans le profil de demande — tests génériques.
  'packages/engine/tests/unit/session-demand-repetition.test.ts',
  // Q1 : contrat GÉNÉRIQUE de diagnostic de qualité (lecture seule d'une prescription ; aucune règle sportive).
  'packages/engine/src/index.ts',
  'packages/engine/src/quality/index.ts',
  'packages/engine/tests/unit/quality.test.ts',
  ...STRENGTH_S1_CHANGES,
  ...STRENGTH_S2_CHANGES,
  ...STRENGTH_S3_CHANGES,
  ...STRENGTH_S4_CHANGES,
  ...STRENGTH_S5_CHANGES,
];

describe('frontières', () => {
  it('Cross-training n’importe que du relatif, @hybridsport/domain, @hybridsport/engine et zod', () => {
    const bad = collectImports(ct).filter(({ module }) => !(module.startsWith('./') || module.startsWith('../') || ['@hybridsport/domain', '@hybridsport/engine', 'zod'].includes(module)));
    expect(bad).toEqual([]);
  });

  it('ni le CORE, ni Running, ni Strength, ni app-core ne dépendent du Cross-training', () => {
    expect(collectImports(others).filter(({ module }) => module.includes('crosstraining'))).toEqual([]);
  });

  it('aucune horloge, aucun hasard, aucun global interdit, aucune API de contournement', () => {
    expect(findClockAndRandomUsage(ct)).toEqual([]);
    expect(findForbiddenGlobals(ct)).toEqual([]);
    expect(findBypassIdentifiers(ct)).toEqual([]);
  });

  it('CORE, Running et Strength inchangés depuis la baseline acceptée, hors évolution CORE C2 autorisée (liste fermée)', () => {
    let diff: string;
    try {
      diff = execFileSync('git', ['diff', '--name-only', ACCEPTED_BASELINE, '--', 'packages/domain', 'packages/engine', 'packages/running', 'packages/strength'], { encoding: 'utf8' });
    } catch {
      // Historique indisponible (clone superficiel) : la vérification ne peut pas conclure — elle échoue plutôt que de passer.
      throw new Error(`baseline ${ACCEPTED_BASELINE} introuvable : vérification impossible`);
    }
    const changed = diff.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    expect(changed.filter((f) => !CT_C2_AUTHORIZED_CORE_CHANGES.includes(f))).toEqual([]);
    expect(changed.filter((f) => f.startsWith('packages/running/') || (f.startsWith('packages/strength/src/') && !STRENGTH_S1_CHANGES.includes(f) && !STRENGTH_S2_CHANGES.includes(f) && !STRENGTH_S3_CHANGES.includes(f) && !STRENGTH_S4_CHANGES.includes(f) && !STRENGTH_S5_CHANGES.includes(f)))).toEqual([]);
  });
});

describe('aucune valeur cachée', () => {
  it('aucun littéral numérique non justifié (hors 0 et 1)', () => {
    expect(findUnjustifiedNumericLiterals(ct, [])).toEqual([]);
  });

  it('aucune lecture des débits du catalogue ni des hypothèses de spec (40–45 s, 1:1 à 1:3, % e1RM)', () => {
    const hits = ct.flatMap((f) => f.text.split('\n').flatMap((l, i) => (/\.workRate\b|byLevel|p90Slow|\bp50\b|secondsPerRep|\b4[05]\s*s\b|1:[123]\b|e1rm\s*[*×]/i.test(l) && !/^\s*(\*|\/\/|\/\*\*)/.test(l) ? [`${f.path}:${String(i + 1)}: ${l.trim()}`] : [])));
    expect(hits).toEqual([]);
  });

  it('C3 : terme générique « Cross-training », aucun nom propriétaire ni benchmark nommé, aucun tirage aléatoire', () => {
    const hits = ct.flatMap((f) => f.text.split('\n').flatMap((l, i) => (/crossfit|\bwod\b|\b(fran|murph|cindy|grace|helen|diane|karen|annie|jackie)\b/i.test(l) ? [`${f.path}:${String(i + 1)}`] : [])));
    expect(hits).toEqual([]);
    expect(ct.map((f) => f.text).join('\n')).not.toMatch(/Math\.random|shuffle|randomInt/);
  });

  it('propositions : UNE seule source (le chemin C2) ; le moteur ne valide ni ne calcule jamais de durée', () => {
    const text = ct.map((f) => f.text).join('\n');
    const emitters = ct.filter((f) => /status:\s*'proposals'/.test(f.text)).map((f) => f.path);
    expect(emitters).toEqual(['packages/crosstraining/src/engine.ts']);
    // C2 et C3 partagent l'unique émetteur (`accepted`) : une proposition au plus.
    expect(text.match(/status:\s*'proposals'/g)).toHaveLength(1);
    expect(text).not.toMatch(/validateSession|zSessionDraft|estimateDuration|DurationEngine/);
    expect(collectImports(ct).filter(({ module }) => module.includes('duration'))).toEqual([]);
  });
});
