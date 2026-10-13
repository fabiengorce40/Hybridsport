/**
 * Version candidate — simulation 4 semaines, PLUSIEURS configurations, chemin réel de l'application (Beta 0) :
 *   A. prise de masse prioritaire (Musculation 3×, Course 2×, Cross-training 1× force + conditionnement, salle commerciale) ;
 *   B. profil hybride (Course prioritaire 3×, Musculation 2×, Cross-training 1×) ;
 *   C. salle complète (A, préréglage `preset.full_gym`) ;
 *   D. matériel limité (A, haltères seulement) ;
 *   E. récupération dégradée (A, fatigue élevée et mauvaise récupération déclarées à CHAQUE séance, sans douleur).
 * Invariants vérifiés (sécurité, issue explicite, aucune hausse de séries) ; le reste est OBSERVÉ et rapporté
 * (__reports__/multi-config-4-semaines.md) pour une revue humaine : des tests verts ne prouvent pas la qualité sportive.
 */
import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ProfileInput } from '../../src/index.js';
import { PROFILE, simulate } from './sim4.js';
import type { PlanFn, SimResult } from './sim4.js';
import { eqOf } from '../strength-fixes/sf-fixtures.js';

const withPreset = (preset: string): ProfileInput => ({ ...PROFILE, equipment: { presetId: preset, items: eqOf(preset) } });
const HYBRID: ProfileInput = {
  ...PROFILE, priorities: ['running', 'strength', 'crosstraining'],
  strength: { ...PROFILE.strength, sessionsPerWeek: 2 }, running: { ...PROFILE.running, sessionsPerWeek: 3 },
};
const DEGRADED: PlanFn = () => ({ ci: { painAnswer: 'no', fatigue: 'high', recovery: 'poor' }, label: 'Non · fatigue élevée · récupération mauvaise' });

const CONFIGS: readonly { readonly key: string; readonly name: string; readonly profile?: ProfileInput; readonly plan?: PlanFn }[] = [
  { key: 'A', name: 'Prise de masse prioritaire (salle commerciale)' },
  { key: 'B', name: 'Profil hybride (Course prioritaire 3×, Musculation 2×, CT 1×)', profile: HYBRID },
  { key: 'C', name: 'Salle complète', profile: withPreset('preset.full_gym') },
  { key: 'D', name: 'Matériel limité (haltères seulement)', profile: withPreset('preset.dumbbells_only') },
  { key: 'E', name: 'Récupération dégradée à chaque séance', plan: DEGRADED },
];
const results = new Map<string, SimResult>(CONFIGS.map((c) => [c.key, simulate({ ...(c.profile ? { profile: c.profile } : {}), ...(c.plan ? { plan: c.plan } : {}) })]));
const r = (k: string): SimResult => { const x = results.get(k); if (!x) throw new Error(k); return x; };
const n = (x: number) => String(Math.round(x * 10) / 10);
const LOWER = ['quads', 'hamstrings', 'calves', 'glutes'];

describe('Version candidate — 4 semaines, 5 configurations', () => {
  it.each(CONFIGS.map((c) => c.key))('M-1. %s : sécurité (aucune zone exclue), issue explicite pour chaque séance, aucune hausse de séries', (k) => {
    const x = r(k);
    expect(x.sessions.length).toBeGreaterThan(0);
    for (const s of x.sessions) {
      expect(s.violations).toEqual([]);
      expect(['réalisée', 'non démarrée (report)', 'manquée', 'pause douleur']).toContain(s.execution);
      for (const c of s.changes.filter((y) => y.startsWith('sets:'))) { const [a, b] = (c.split(':')[2] ?? '').split('>').map(Number); expect(b ?? 0).toBeLessThanOrEqual(a ?? 0); }
    }
  });

  it('M-2. E : la dose est allégée selon la règle TEST_ONLY quand la séance est reproductible, jamais alourdie ; sinon non appliquée et tracée', () => {
    const x = r('E');
    const strength = x.sessions.filter((s) => s.sport === 'strength' && s.execution === 'réalisée');
    for (const s of strength) {
      if (s.decision === 'adapted') expect(s.changes.every((c) => c.startsWith('rir:') || c.startsWith('sets:'))).toBe(true);
      for (const c of s.changes.filter((y) => y.startsWith('rir:'))) { const [a, b] = (c.split(':')[2] ?? '').split('>').map(Number); expect(b ?? 0).toBeGreaterThanOrEqual(a ?? 0); }
    }
  });

  it('M-3. rapport', () => {
    const L: string[] = ['# Version candidate — simulation 4 semaines, 5 configurations', '',
      '> Chemin réel de l’application (Beta 0, règles TEST_ONLY / SIMULATION_ONLY existantes + `planner.crosstraining.compositeDemand.test-0`). Disponibilités lun 75 · mar 60 · mer 75 · jeu 60 · ven 75 · sam 90 · dim 0 min. Réponses au contrôle : scénario de la consolidation (A–D), fatigue élevée + récupération mauvaise à chaque séance (E). **Ces chiffres sont des observations à relire, pas une preuve de qualité sportive.**', '',
      '## Synthèse', '', '| config. | séances placées | réalisées | reportées | manquées | adaptées (régén. / persistée / recomposée) | non appliqué | Musculation reproductible | violations | arbitrage M3 | paires de force à J+1 |', '|---|---|---|---|---|---|---|---|---|---|---|'];
    for (const c of CONFIGS) {
      const x = r(c.key);
      const cnt = (f: (s: SimResult['sessions'][number]) => boolean) => x.sessions.filter(f).length;
      L.push(`| ${c.key}. ${c.name} | ${String(x.sessions.length)} | ${String(cnt((s) => s.execution === 'réalisée'))} | ${String(cnt((s) => s.decision === 'postponed'))} | ${String(cnt((s) => s.execution === 'manquée'))} | ${String(cnt((s) => s.adaptation.startsWith('régénérée')))} / ${String(cnt((s) => s.adaptation.startsWith('séance persistée')))} / ${String(cnt((s) => s.adaptation.startsWith('recomposée')))} | ${String(cnt((s) => s.reasons.includes('ADAPTATION_NOT_APPLIED')))} | ${String(cnt((s) => s.sport === 'strength' && s.reproducible === 'oui'))} / ${String(cnt((s) => s.sport === 'strength'))} | ${String(x.sessions.reduce((a, s) => a + s.violations.length, 0))} | ${x.weeks.map((w) => w.m3.status).join(' / ')} | ${String(x.weeks.reduce((a, w) => a + w.recovery.length, 0))} |`);
    }
    L.push('', '## Volumes planifiés par groupe (moyenne des 4 semaines, séries de travail / plancher expérimental ; ⚠ sous le plancher, ▲ au-dessus du haut)', '');
    const groups = [...new Set(CONFIGS.flatMap((c) => r(c.key).weeks.flatMap((w) => Object.keys(w.planned))))].sort();
    L.push(`| groupe | plancher / haut | ${CONFIGS.map((c) => c.key).join(' | ')} |`, `|---|---|${CONFIGS.map(() => '---').join('|')}|`);
    for (const g of groups) {
      const ref = r('A').weeks[0]?.planned[g];
      L.push(`| ${g}${LOWER.includes(g) ? ' (bas du corps)' : ''} | ${String(ref?.target ?? '—')} / ${String(ref?.high ?? '—')} | ${CONFIGS.map((c) => {
        const ws = r(c.key).weeks.map((w) => w.planned[g]).filter((v) => v !== undefined);
        if (ws.length === 0) return '—';
        const avg = ws.reduce((a, v) => a + v.planned, 0) / ws.length;
        const t = ws[0]?.target ?? null; const h = ws[0]?.high ?? null;
        return `${n(avg)}${t !== null && avg < t ? ' ⚠' : ''}${h !== null && avg > h ? ' ▲' : ''}`;
      }).join(' | ')} |`);
    }
    L.push('', '## Durées (somme hebdomadaire estimée des séances prévues, min ; disponible : 435 min)', '', `| config. | S1 | S2 | S3 | S4 |`, '|---|---|---|---|---|');
    for (const c of CONFIGS) L.push(`| ${c.key} | ${[1, 2, 3, 4].map((w) => String(r(c.key).sessions.filter((s) => s.week === w).reduce((a, s) => a + (s.plannedEstMin ?? 0), 0))).join(' | ')} |`);
    L.push('', '## Reports et ajustements non appliqués', '');
    for (const c of CONFIGS) {
      const x = r(c.key);
      const lines = x.sessions.filter((s) => s.decision === 'postponed' || s.reasons.includes('ADAPTATION_NOT_APPLIED')).map((s) => `  - S${String(s.week)} ${s.date.slice(5)} ${s.sport} (${s.declared}) : ${s.decision} — ${s.reasons.join(', ')}`);
      L.push(`- **${c.key}** : ${lines.length === 0 ? 'aucun' : ''}`, ...lines);
    }
    L.push('', '## Qualité des séances — semaine 2, exercices de force/accessoires exécutés (relecture humaine)', '');
    for (const c of CONFIGS) {
      L.push(`### ${c.key}. ${c.name}`, '');
      for (const s of r(c.key).sessions.filter((y) => y.week === 2)) {
        const ex = s.exercises.filter((e) => ['strength', 'accessory', 'conditioning', 'running'].includes(e.block)).map((e) => `${e.id}${e.block === 'conditioning' ? ' (cond.)' : ''}`);
        L.push(`- ${s.date.slice(5)} ${s.sport} — ${s.title} — ${s.execution}${s.decision === 'adapted' ? ` (adaptée : ${s.changes.join(', ')})` : ''} : ${ex.join(', ') || '—'}`);
      }
      L.push('');
    }
    const path = new URL('./__reports__/multi-config-4-semaines.md', import.meta.url).pathname;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, L.join('\n'));
    expect(L.length).toBeGreaterThan(20);
  });
});
