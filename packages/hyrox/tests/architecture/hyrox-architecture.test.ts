/**
 * H1 — architecture du HyroxEngine :
 * - dépendances : relatif, @hybridsport/domain, @hybridsport/engine, zod ; aucun moteur ne dépend de HYROX et HYROX
 *   ne dépend d'aucun autre moteur (Running, Strength, Cross-training) ;
 * - aucune valeur sportive ni de compétition en dur ; aucun débit du catalogue lu ; aucune horloge ni hasard ;
 * - propositions émises par le SEUL chemin H1 ; le moteur ne valide ni ne calcule de durée ;
 * - le CORE ne contient aucune sémantique HYROX nouvelle (station, division, sled…) : l'extension est générique.
 */
import { describe, expect, it } from 'vitest';
import { collectImports, findBypassIdentifiers, findClockAndRandomUsage, findForbiddenGlobals, findUnjustifiedNumericLiterals, loadCoreSources } from '../../../engine/tests/architecture/source-scanner.js';

const hr = loadCoreSources(['packages/hyrox/src']);
const others = loadCoreSources(['packages/domain/src', 'packages/engine/src', 'packages/strength/src', 'packages/running/src', 'packages/crosstraining/src', 'packages/app-core/src']);

describe('frontières', () => {
  it('HYROX n’importe que du relatif, @hybridsport/domain, @hybridsport/engine et zod (aucun autre moteur)', () => {
    const bad = collectImports(hr).filter(({ module }) => !(module.startsWith('./') || module.startsWith('../') || ['@hybridsport/domain', '@hybridsport/engine', 'zod'].includes(module)));
    expect(bad).toEqual([]);
  });

  it('ni le CORE, ni Running, ni Strength, ni Cross-training, ni app-core ne dépendent de HYROX', () => {
    expect(collectImports(others).filter(({ module }) => module.includes('hyrox'))).toEqual([]);
  });

  it('aucune horloge, aucun hasard, aucun global interdit, aucune API de contournement', () => {
    expect(findClockAndRandomUsage(hr)).toEqual([]);
    expect(findForbiddenGlobals(hr)).toEqual([]);
    expect(findBypassIdentifiers(hr)).toEqual([]);
  });
});

describe('aucune valeur cachée', () => {
  it('aucun littéral numérique non justifié (hors 0 et 1)', () => {
    expect(findUnjustifiedNumericLiterals(hr, [])).toEqual([]);
  });

  it('aucune lecture des débits du catalogue ni de charges / distances de compétition', () => {
    const hits = hr.flatMap((f) => f.text.split('\n').flatMap((l, i) => (/\.workRate\b|byLevel|secondsPerRep|\bkg\s*[:=]\s*\d|\b(division|pro|open|doubles)\b\s*[:=]/i.test(l) && !/^\s*(\*|\/\/|\/\*\*)/.test(l) ? [`${f.path}:${String(i + 1)}: ${l.trim()}`] : [])));
    expect(hits).toEqual([]);
  });

  it('propositions : UNE seule source (le chemin H1) ; le moteur ne valide ni ne calcule jamais de durée', () => {
    const text = hr.map((f) => f.text).join('\n');
    expect(hr.filter((f) => /status:\s*'proposals'/.test(f.text)).map((f) => f.path)).toEqual(['packages/hyrox/src/engine.ts']);
    expect(text.match(/status:\s*'proposals'/g)).toHaveLength(1);
    expect(text).not.toMatch(/validateSession|zSessionDraft|estimateDuration|DurationEngine/);
  });

  it('CORE : aucune sémantique HYROX introduite (la charge `load` est générique ; « hyrox » absent du code, hors commentaires)', () => {
    const core = loadCoreSources(['packages/domain/src', 'packages/engine/src']);
    const code = core.flatMap((f) => f.text.split('\n').flatMap((l, i) => (/hyrox/i.test(l) && !/^\s*(\*|\/\/|\/\*\*)/.test(l) ? [`${f.path}:${String(i + 1)}`] : [])));
    expect(code).toEqual([]);
  });
});
