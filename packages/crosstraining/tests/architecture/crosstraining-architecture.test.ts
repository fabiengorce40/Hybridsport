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
 * ses tests, et l'empreinte de sources F20 de Strength qui la constate. Running et Strength `src` : aucun changement.
 * Toute autre modification de ces paquets échoue ici.
 */
const CT_C2_AUTHORIZED_CORE_CHANGES = [
  'packages/domain/src/duplicate.ts',
  'packages/domain/src/serialization.ts',
  // HYROX H1 : charge générique facultative sur les doses hors séries (session_record v6).
  'packages/domain/src/session.ts',
  'packages/engine/src/duplicate/analysis.ts',
  'packages/engine/src/duplicate/fingerprint.ts',
  'packages/engine/src/migration/migrations.ts',
  'packages/engine/tests/unit/core-ext-r1.test.ts',
  'packages/engine/tests/unit/duplicate.test.ts',
  'packages/engine/tests/unit/fingerprint-explicit.test.ts',
  'packages/engine/tests/unit/item-load.test.ts',
  'packages/engine/tests/unit/migration.test.ts',
  'packages/strength/tests/architecture/__reports__/core-source-digest.txt',
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
    expect(changed.filter((f) => f.startsWith('packages/running/') || f.startsWith('packages/strength/src/'))).toEqual([]);
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

  it('propositions : UNE seule source (le chemin C2) ; le moteur ne valide ni ne calcule jamais de durée', () => {
    const text = ct.map((f) => f.text).join('\n');
    const emitters = ct.filter((f) => /status:\s*'proposals'/.test(f.text)).map((f) => f.path);
    expect(emitters).toEqual(['packages/crosstraining/src/engine.ts']);
    expect(text.match(/status:\s*'proposals'/g)).toHaveLength(1);
    expect(text).not.toMatch(/validateSession|zSessionDraft|estimateDuration|DurationEngine/);
    expect(collectImports(ct).filter(({ module }) => module.includes('duration'))).toEqual([]);
  });
});
