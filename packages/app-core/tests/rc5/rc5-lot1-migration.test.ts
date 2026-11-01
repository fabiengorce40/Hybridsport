/**
 * Reprise RC5 — lot 1 : format v5 (migration additive depuis v1 à v4), copie de sécurité AVANT migration, version
 * incompatible refusée sans écriture, registre de contenus Strength sans collision de version (les semaines V2.1/V2.2
 * personnalisées restent relues avec leur contenu d'origine L1b-4).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createBeta0Programme, CURRENT_SCHEMA_VERSION, decodeState, defaultStrengthPersonalization, emptyState, LEGACY_PERSONALIZATION_VERSION, loadState,
  MemoryStorage, personalizedRulesetVersion, personalizedStrengthContent, PREMIGRATION_PREFIX, STORAGE_KEY, strengthContent, strengthContentFor,
  strengthContentRegistry, textHash, withStrengthPersonalization,
} from '../../src/index.js';
import type { AppState, ContentSource, KeyValueStorage } from '../../src/index.js';
import { clock, profile } from '../fixtures.js';

const NOW = '2026-11-01T09:00:00.000Z';
const FIXTURE = readFileSync(join(import.meta.dirname, '../rc45/fixtures/lotc-maintained-state.json'), 'utf8');
/** Même donnée réelle, déclarée en version n (v1 : sans propriétaire de semaine, comme le format v1). */
function asVersion(n: number): string {
  const raw = JSON.parse(FIXTURE) as Record<string, unknown> & { planner: { weeks: Record<string, Record<string, unknown>> } };
  const out = { ...raw, schemaVersion: n } as typeof raw;
  if (n === 1) out.planner = { ...raw.planner, weeks: Object.fromEntries(Object.entries(raw.planner.weeks).map(([k, w]) => { const { owner: _o, ...rest } = w; return [k, rest]; })) };
  return JSON.stringify(out);
}

describe('Reprise RC5 lot 1 — format v5 et migrations', () => {
  it('format courant = v5', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(5);
  });

  for (const v of [2, 3, 4]) {
    it(`v${String(v)} → v5 : données identiques hormis le numéro de version`, () => {
      const d = decodeState(asVersion(v));
      expect(d.ok).toBe(true);
      if (d.ok) expect(d.state).toEqual({ ...JSON.parse(FIXTURE), schemaVersion: CURRENT_SCHEMA_VERSION });
    });
  }

  it('v1 → v5 : chaîne complète (propriétaires de semaine déduits par v1 → v2, rien d’autre changé)', () => {
    const d = decodeState(asVersion(1));
    expect(d.ok && d.from).toBe(1);
    if (d.ok) {
      const { planner: p1, ...rest1 } = d.state;
      const { planner: p0, ...rest0 } = { ...(JSON.parse(FIXTURE) as AppState), schemaVersion: CURRENT_SCHEMA_VERSION };
      expect(rest1).toEqual(rest0);
      expect(Object.keys(p1.weeks)).toEqual(Object.keys(p0.weeks));
    }
  });

  it('copie de sécurité AVANT migration : texte d’origine exact, une seule copie par texte', () => {
    const s = new MemoryStorage();
    const v4 = asVersion(4);
    s.setItem(STORAGE_KEY, v4);
    const r1 = loadState(s, NOW);
    expect(r1).toMatchObject({ status: 'ok', migratedFrom: 4, premigrationKey: `${PREMIGRATION_PREFIX}v4.${textHash(v4)}` });
    expect(s.getItem(`${PREMIGRATION_PREFIX}v4.${textHash(v4)}`)).toBe(v4);
    // Rien d'écrit dans l'état lui-même au chargement (la donnée migrée n'est écrite qu'à la première sauvegarde).
    expect(s.getItem(STORAGE_KEY)).toBe(v4);
    loadState(s, '2026-11-02T09:00:00.000Z');
    expect(s.keys().filter((k) => k.startsWith(PREMIGRATION_PREFIX))).toHaveLength(1);
  });

  it('donnée déjà en v5 : aucune copie', () => {
    const s = new MemoryStorage();
    s.setItem(STORAGE_KEY, JSON.stringify(emptyState()));
    expect(loadState(s, NOW)).toEqual({ status: 'ok', state: emptyState() });
    expect(s.keys()).toEqual([STORAGE_KEY]);
  });

  it('copie impossible (stockage plein) : signalée, état lisible, aucune écriture', () => {
    const inner = new MemoryStorage();
    inner.setItem(STORAGE_KEY, asVersion(3));
    const full: KeyValueStorage = { getItem: (k) => inner.getItem(k), setItem: () => { throw new Error('QuotaExceededError'); } };
    const r = loadState(full, NOW);
    expect(r).toMatchObject({ status: 'ok', migratedFrom: 3, premigrationError: 'QuotaExceededError' });
    expect(inner.keys()).toEqual([STORAGE_KEY]);
  });

  it('version incompatible (plus récente) : refusée, rien n’est écrit ni copié', () => {
    const s = new MemoryStorage();
    const v6 = JSON.stringify({ ...JSON.parse(FIXTURE), schemaVersion: CURRENT_SCHEMA_VERSION + 1 });
    s.setItem(STORAGE_KEY, v6);
    expect(loadState(s, NOW)).toMatchObject({ status: 'newer_version', version: CURRENT_SCHEMA_VERSION + 1 });
    expect(s.keys()).toEqual([STORAGE_KEY]);
    expect(s.getItem(STORAGE_KEY)).toBe(v6);
  });

  it('v5 : chronomètre horodaté et durées RC5.4 acceptés (champs facultatifs)', () => {
    const state = JSON.parse(FIXTURE) as AppState;
    const [id, log] = Object.entries(state.programmeLogs)[0] ?? [];
    if (!id || !log) throw new Error('journal attendu dans la donnée de test');
    const withRc54 = { ...state, schemaVersion: CURRENT_SCHEMA_VERSION, programmeLogs: { ...state.programmeLogs, [id]: { ...log, clock: { pausedS: 30 }, timing: { activeS: 1800, pausedS: 30, plannedS: null } } } };
    const d = decodeState(JSON.stringify(withRc54));
    expect(d.ok).toBe(true);
    if (d.ok) expect(d.state.programmeLogs[id]).toMatchObject({ clock: { pausedS: 30 }, timing: { activeS: 1800 } });
  });
});

describe('Reprise RC5 lot 1 — contenus Strength versionnés', () => {
  // Lot 4 : le contenu courant est `0.8.0-strength-hautbas-ab` ; L1b-4 reste au registre.
  const l1b4 = (): ContentSource => { const c = strengthContentRegistry().find((x) => x.ruleset.version === '0.7.0-strength-l1b4'); if (!c) throw new Error('L1b-4 attendu au registre'); return c; };

  it('personnalisation sur L1b-4 : nom historique conservé (prescriptions V2.1/V2.2 inchangées)', () => {
    expect(personalizedRulesetVersion(l1b4())).toBe(LEGACY_PERSONALIZATION_VERSION);
    expect(personalizedStrengthContent(l1b4()).ruleset.version).toBe(LEGACY_PERSONALIZATION_VERSION);
  });

  it('personnalisation d’une AUTRE base (contenu courant du lot 4) : version dérivée, jamais le nom historique', () => {
    const other = strengthContent();
    expect(other.ruleset.version).toBe('0.8.0-strength-hautbas-ab');
    // Lot 4.1 : la base courante est personnalisée par la politique 1.1 (allocation `primary_need`) — nom DISTINCT de
    // celui de la politique 1.0 (`.personalization-v1`, jamais publié hors du poste local) pour que la provenance désigne
    // sans ambiguïté la règle appliquée.
    expect(personalizedRulesetVersion(other)).toBe(`${other.ruleset.version}.personalization-v1-1`);
    // Lot 4 : le nom dérivé doit être CHARGEABLE (SemVer) — le contenu personnalisé de cette base se construit.
    expect(personalizedStrengthContent(other).ruleset.version).toBe(`${other.ruleset.version}.personalization-v1-1`);
    expect(personalizedRulesetVersion(other)).not.toBe(LEGACY_PERSONALIZATION_VERSION);
  });

  it('registre : une version persistée désigne UN seul contenu (aucune collision)', () => {
    const byVersion = new Map<string, unknown>();
    for (const c of strengthContentRegistry()) {
      const key = `${c.ruleset.version}|${c.catalog.version}`;
      const doc = JSON.stringify(c.ruleset.document);
      const seen = byVersion.get(key);
      if (seen !== undefined) expect([key, seen === doc]).toEqual([key, true]);
      byVersion.set(key, doc);
    }
  });

  it('semaine personnalisée générée aujourd’hui (lot 4) : version dérivée du contenu courant enregistrée, relue avec le même contenu', () => {
    const base = profile({ priorities: ['strength'], availability: [90, 0, 90, 0, 90, 0, 0], strength: { enabled: true, goal: 'hypertrophy', sessionsPerWeek: 3 } });
    const p = withStrengthPersonalization(base, { ...defaultStrengthPersonalization(base), completed: true, outcome: 'muscle', experience: { months: 24, regularSessions: 3, technique: 'confident' } });
    const s = createBeta0Programme(emptyState(), p, clock(), {});
    const records = Object.values(s.planner.weeks).flatMap((w) => w.requests).filter((r) => r.sport === 'strength' && r.status === 'planned');
    expect(records.length).toBeGreaterThan(0);
    for (const r of records) {
      const prov = (r.record as { data?: { provenance?: { rulesetVersion: string; catalogVersion: string } } } | undefined)?.data?.provenance;
      expect(prov?.rulesetVersion).toBe('0.8.0-strength-hautbas-ab.personalization-v1-1');
      const content = strengthContentFor(prov?.rulesetVersion ?? '', prov?.catalogVersion ?? '');
      expect(content?.ruleset.document).toEqual(personalizedStrengthContent(strengthContent()).ruleset.document);
    }
  });

  it('semaine V2.1/V2.2 enregistrée sous le nom historique : toujours relue avec le contenu personnalisé L1b-4 d’origine', () => {
    const catalog = strengthContent().catalog.version;
    expect(strengthContentFor(LEGACY_PERSONALIZATION_VERSION, catalog)?.ruleset.document).toEqual(personalizedStrengthContent(l1b4()).ruleset.document);
    // Les deux contenus personnalisés sont distincts : aucune semaine historique n'est relue avec la rotation A/B.
    expect(JSON.stringify(personalizedStrengthContent(l1b4()).ruleset.document)).not.toEqual(JSON.stringify(personalizedStrengthContent(strengthContent()).ruleset.document));
  });
});
