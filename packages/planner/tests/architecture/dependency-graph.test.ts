/**
 * Graphe de dépendances des paquets (règle d'architecture) :
 *
 *   apps/kairo → app-core → planner → { strength, running, crosstraining, hyrox } → engine → domain
 *                    └──────→ strength, running (chemin V0 historique), engine, domain
 *
 * Aucune dépendance inverse, aucun cycle ; le planificateur ne dépend pas d'app-core ; les moteurs ne dépendent ni du
 * planificateur, ni d'app-core, ni les uns des autres ; le CORE (domain, engine) ne dépend d'aucun moteur. Les imports
 * des sources sont cohérents avec les package.json (aucune dépendance cachée).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { collectImports, loadCoreSources, REPO_ROOT } from '../../../engine/tests/architecture/source-scanner.js';

const PACKAGES: Readonly<Record<string, string>> = {
  domain: 'packages/domain', engine: 'packages/engine', strength: 'packages/strength', running: 'packages/running', crosstraining: 'packages/crosstraining',
  hyrox: 'packages/hyrox', planner: 'packages/planner', 'app-core': 'packages/app-core', kairo: 'apps/kairo',
};
const SCOPE = '@hybridsport/';
const depsOf = (dir: string): string[] => {
  const pkg = JSON.parse(readFileSync(join(REPO_ROOT, dir, 'package.json'), 'utf8')) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string>; peerDependencies?: Record<string, string> };
  return Object.keys({ ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies }).filter((k) => k.startsWith(SCOPE)).map((k) => k.slice(SCOPE.length)).sort();
};
const graph = Object.fromEntries(Object.entries(PACKAGES).map(([n, d]) => [n, depsOf(d)]));

/** Couches autorisées (liste fermée). */
const ALLOWED: Readonly<Record<string, readonly string[]>> = {
  domain: [],
  engine: ['domain'],
  strength: ['domain', 'engine'],
  running: ['domain', 'engine'],
  crosstraining: ['domain', 'engine'],
  hyrox: ['domain', 'engine'],
  planner: ['crosstraining', 'domain', 'engine', 'hyrox', 'running', 'strength'],
  'app-core': ['domain', 'engine', 'planner', 'running', 'strength'],
  kairo: ['app-core'],
};

describe('graphe de dépendances', () => {
  it('chaque paquet ne dépend que de ses couches autorisées (liste fermée)', () => {
    for (const [n, deps] of Object.entries(graph)) expect(deps.filter((d) => !(ALLOWED[n] ?? []).includes(d)), n).toEqual([]);
  });

  it('aucun cycle (tri topologique complet)', () => {
    const indeg = new Map(Object.keys(graph).map((n) => [n, (graph[n] ?? []).length]));
    const order: string[] = [];
    let ready = [...indeg].filter(([, d]) => d === 0).map(([n]) => n);
    while (ready.length > 0) {
      const n = ready.shift() ?? '';
      order.push(n);
      for (const [m, deps] of Object.entries(graph)) if (deps.includes(n)) { indeg.set(m, (indeg.get(m) ?? 0) - 1); if (indeg.get(m) === 0) ready = [...ready, m]; }
    }
    expect(order.sort()).toEqual(Object.keys(graph).sort());
  });

  it('dépendances inverses interdites : planificateur ↛ app-core ; moteurs ↛ planificateur, app-core, autre moteur ; CORE ↛ moteurs', () => {
    expect(graph.planner).not.toContain('app-core');
    for (const e of ['strength', 'running', 'crosstraining', 'hyrox']) expect((graph[e] ?? []).filter((d) => !['domain', 'engine'].includes(d)), e).toEqual([]);
    expect([...(graph.domain ?? []), ...(graph.engine ?? [])].filter((d) => d !== 'domain')).toEqual([]);
  });

  it('les imports des sources sont déclarés dans package.json (aucune dépendance cachée) ; app-core n’importe ni CT ni HYROX', () => {
    for (const [n, dir] of Object.entries(PACKAGES)) {
      if (n === 'kairo') continue;
      const imported = [...new Set(collectImports(loadCoreSources([`${dir}/src`])).map((x) => x.module).filter((m) => m.startsWith(SCOPE)).map((m) => m.slice(SCOPE.length).split('/')[0] ?? ''))].sort();
      expect(imported.filter((m) => !(graph[n] ?? []).includes(m)), n).toEqual([]);
    }
    const app = collectImports(loadCoreSources(['packages/app-core/src'])).map((x) => x.module);
    expect(app.filter((m) => /crosstraining|hyrox/.test(m))).toEqual([]);
  });
});
