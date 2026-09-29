/**
 * C1 — architecture du CrossTrainingEngine :
 * - dépendances : relatif, @hybridsport/domain, @hybridsport/engine, zod ; personne ne dépend du Cross-training ;
 * - aucune valeur sportive en dur (aucun littéral numérique hors 0 / 1 non justifié) ; aucune valeur de fixture du
 *   catalogue lue ; aucun débit de mouvement lu (l'estimation reste au CORE) ;
 * - une seule sortie possible : no_valid_proposal ; aucune horloge ni hasard ;
 * - Running, Strength et le CORE inchangés depuis la baseline Course acceptée.
 */
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { collectImports, findBypassIdentifiers, findClockAndRandomUsage, findForbiddenGlobals, findUnjustifiedNumericLiterals, loadCoreSources } from '../../../engine/tests/architecture/source-scanner.js';

const ct = loadCoreSources(['packages/crosstraining/src']);
const others = loadCoreSources(['packages/domain/src', 'packages/engine/src', 'packages/strength/src', 'packages/running/src', 'packages/app-core/src']);
/** Baseline acceptée (gate Course) : aucun fichier de ces paquets ne doit changer pour le Cross-training. */
const ACCEPTED_BASELINE = '1d37a50';

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

  it('CORE, Running et Strength inchangés depuis la baseline acceptée', () => {
    let diff: string;
    try {
      diff = execFileSync('git', ['diff', '--name-only', ACCEPTED_BASELINE, '--', 'packages/domain', 'packages/engine', 'packages/running', 'packages/strength'], { encoding: 'utf8' });
    } catch {
      // Historique indisponible (clone superficiel) : la vérification ne peut pas conclure — elle échoue plutôt que de passer.
      throw new Error(`baseline ${ACCEPTED_BASELINE} introuvable : vérification impossible`);
    }
    expect(diff.trim()).toBe('');
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

  it('le moteur n’émet jamais de proposition ni ne calcule de durée', () => {
    const text = ct.map((f) => f.text).join('\n');
    expect(text).not.toMatch(/status:\s*'proposals'/);
    expect(text).not.toMatch(/validateSession|zSessionDraft|estimateDuration|DurationEngine/);
    expect(collectImports(ct).filter(({ module }) => module.includes('duration'))).toEqual([]);
  });
});
