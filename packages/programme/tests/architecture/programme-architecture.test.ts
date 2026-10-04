/**
 * Programme Engine — architecture : il dépend du planificateur (et du CORE pour la gouvernance), jamais d'un moteur
 * sportif ; seul app-core le consomme ; aucune logique sportive (exercice, dose, charge, allure, mouvement, station),
 * aucun appel moteur direct, aucun placement ni interférence (le planificateur les possède) ; aucun nombre caché.
 */
import { describe, expect, it } from 'vitest';
import { collectImports, findBypassIdentifiers, findClockAndRandomUsage, findForbiddenGlobals, findUnjustifiedNumericLiterals, loadCoreSources } from '../../../engine/tests/architecture/source-scanner.js';

const pg = loadCoreSources(['packages/programme/src']);
const lower = loadCoreSources(['packages/domain/src', 'packages/engine/src', 'packages/strength/src', 'packages/running/src', 'packages/crosstraining/src', 'packages/hyrox/src', 'packages/planner/src']);
const code = (f: { text: string }) => f.text.split('\n').filter((l) => !/^\s*(\*|\/\/|\/\*\*)/.test(l)).join('\n');

describe('frontières', () => {
  it('n’importe que du relatif, le CORE, le planificateur et zod', () => {
    const allowed = ['@hybridsport/domain', '@hybridsport/engine', '@hybridsport/planner', 'zod'];
    expect(collectImports(pg).filter(({ module }) => !(module.startsWith('./') || allowed.includes(module)))).toEqual([]);
  });

  it('ni le CORE, ni les moteurs, ni le planificateur ne dépendent du programme', () => {
    expect(collectImports(lower).filter(({ module }) => module.includes('programme'))).toEqual([]);
  });

  it('aucune horloge, aucun hasard, aucun global interdit, aucune API de contournement', () => {
    expect(findClockAndRandomUsage(pg)).toEqual([]);
    expect(findForbiddenGlobals(pg)).toEqual([]);
    expect(findBypassIdentifiers(pg)).toEqual([]);
  });
});

describe('aucune logique sportive dans le Programme Engine', () => {
  it('aucun littéral numérique non justifié (aucun seuil d’adhérence, aucune progression, aucune durée d’horizon)', () => {
    expect(findUnjustifiedNumericLiterals(pg, [])).toEqual([]);
  });

  it('aucun exercice, prescription, charge, allure, dose ou station choisis ; aucun appel moteur ni validation', () => {
    const text = pg.map(code).join('\n');
    expect(text).not.toMatch(/exerciseId|prescription|\bkg\b|loadKg|pace|distanceM|workS|requestedStation|runSportSession|validateSession|repairSession|estimateDuration|deriveSessionDemand/);
  });

  it('placement, interférence et appels moteurs restent au planificateur (un seul appel : planMultisportWeek)', () => {
    const text = pg.map(code).join('\n');
    expect(text).not.toMatch(/structureWindows|conflictsOf|neighbours|ports\[/);
    expect(text.match(/planMultisportWeek\(/g)).toHaveLength(1);
  });

  it('toute décision porte sa provenance : aucune décision construite hors de decide() / BLOCKED', () => {
    const engine = pg.find((f) => f.path.endsWith('engine.ts'));
    expect(code(engine ?? { text: '' })).toMatch(/decide\(sp, facts, policy, POLICY_PARAMETER\)/);
    expect(code(engine ?? { text: '' })).not.toMatch(/decision:\s*'(HOLD|PROGRESS|REGRESS|REASSESS)'/);
  });
});
