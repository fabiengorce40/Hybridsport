/**
 * C4.2 — rapport COMPARATIF C4.1 → C4.2 (chemin app-core réel, Beta 0 TEST_ONLY). Référence C4.1 figée avant les
 * changements (`__reports__/c41-baseline.json`, même matrice). Rapport : __reports__/c42-comparison.md.
 * Garde-fous vérifiés : niveau avancé jamais débloqué, aucun ergomètre sans équipement, cohabitation multisport.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { ensureBeta0Week, finishProgrammeSession, selectProgrammeSession, startProgrammeSession } from '../../src/index.js';
import type { AppState } from '../../src/index.js';
import { at, create, ctSessions, profile, week } from './ct-fixtures.js';
import { EQUIPMENTS, matrix } from './c42-metrics.js';
import type { Cell, Matrix } from './c42-metrics.js';
import { create as createHr, hrProfile } from '../hr/hr-fixtures.js';

const before = JSON.parse(readFileSync(new URL('./__reports__/c41-baseline.json', import.meta.url), 'utf8')) as Matrix;
const min = (s: number | null) => (s === null ? '—' : (s / 60).toFixed(1));
const st = (c: Cell | undefined) => (c ? Object.entries(c.status).sort().map(([k, v]) => `${k.replace('FULL_SESSION', 'complète').replace('MAIN_BLOCK_ONLY', 'principal seul').replace('BLOCKED', 'bloquée')} ${String(v)}`).join(', ') : '—');
const sum = (m: Matrix, keyFilter: (k: string) => boolean) => {
  const out: Record<string, number> = {};
  for (const [k, c] of Object.entries(m)) if (keyFilter(k)) for (const [s, n] of Object.entries(c.status)) out[s] = (out[s] ?? 0) + n;
  return out;
};
const fmt = (o: Record<string, number>) => Object.entries(o).sort().map(([k, v]) => `${k} ${String(v)}`).join(' · ');

describe('C4.2 — rapport comparatif', () => {
  it('matrice, variété 4 semaines, restrictions, cohabitation ; garde-fous', () => {
    const after = matrix();
    const lines: string[] = ['# C4.2 — comparaison C4.1 → C4.2 (Beta 0, gouvernance TEST_ONLY)', '',
      '> Chemin app-core réel. Chaque cellule cumule 45 / 60 / 75 min disponibles (3 séances par semaine, semaine 1). Durées en minutes : « estimée » = estimation du CORE (consignes et transitions comprises), référence de la cible 45–75 min (S8). Aucune valeur n’est validée scientifiquement.', ''];

    // ——— Synthèses
    lines.push('## Synthèse des statuts', '', '| Périmètre | C4.1 | C4.2 |', '|---|---|---|');
    for (const [label, f] of [['tout', () => true], ['avec ergomètre', (k: string) => k.endsWith('|full')], ['sans ergomètre', (k: string) => k.endsWith('|no_erg')], ['débutant', (k: string) => k.includes('|beginner|')], ['intermédiaire', (k: string) => k.includes('|intermediate|')], ['avancé', (k: string) => k.includes('|advanced|')]] as const) {
      lines.push(`| ${label} | ${fmt(sum(before, f))} | ${fmt(sum(after, f))} |`);
    }
    lines.push('');

    // ——— Détail
    lines.push('## Détail par profil', '', '| Intention · niveau · matériel | Statuts C4.1 | Statuts C4.2 | Estimée C4.1 | Estimée C4.2 | Éch. général | Éch. spécifique | Principal | Retour au calme | Cible (C4.2) | Échauffement (C4.2) | Mobilité (C4.2) |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const [k, a] of Object.entries(after)) {
      const b = before[k];
      const blk = (x: string) => min(a.blocks[x] ?? null);
      lines.push(`| ${k.replaceAll('|', ' · ')} | ${st(b)} | ${st(a)} | ${min(b?.estimatedS ?? null)} | ${min(a.estimatedS)} | ${blk('warmup_general')} | ${blk('warmup_specific')} | ${blk('main')} | ${blk('cooldown')} | ${fmt(a.position) || '—'} | ${a.warmupMovements.join(', ') || '—'} | ${a.mobility.filter((x) => x.includes('mobility')).join(', ') || '—'} |`);
    }
    lines.push('');

    // Garde-fous : avancé jamais débloqué ; sans ergomètre, aucun ergomètre ; rien de pire qu'en C4.1 (aucune séance complète perdue).
    for (const [k, a] of Object.entries(after)) {
      if (k.includes('|advanced|')) expect(a.status.FULL_SESSION ?? 0).toBe(0);
      if (k.endsWith('|no_erg')) expect([...a.warmupMovements, ...a.mobility].filter((x) => x === 'ex.row_erg' || x === 'ex.skierg')).toEqual([]);
      expect(a.status.FULL_SESSION ?? 0).toBeGreaterThanOrEqual(before[k]?.status.FULL_SESSION ?? 0);
    }

    // ——— Variété sur 4 semaines (abandon simulé ⇒ aucune progression supposée)
    lines.push('## Variété sur 4 semaines (mixte, intermédiaire)', '', '| Matériel | Formats du bloc principal | Mouvements du bloc principal | Échauffement général | Mobilité | Statuts |', '|---|---|---|---|---|---|');
    for (const [eq, items] of Object.entries(EQUIPMENTS)) {
      let s = create(profile({ equipment: items }));
      const formats = new Set<string>(); const mains = new Set<string>(); const wus = new Set<string>(); const mobs = new Set<string>(); const sts: Record<string, number> = {};
      for (const [k, d] of ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'].entries()) {
        if (k > 0) s = ensureBeta0Week(s, at(`${d}T07:30:00.000Z`));
        for (const x of ctSessions(s, `${d}T07:30:00.000Z`)) {
          const key = x.composition?.c4?.status ?? x.placement;
          sts[key] = (sts[key] ?? 0) + 1;
          if (x.placement !== 'planned') continue;
          const v = selectProgrammeSession(s, x.requestId);
          for (const b of v?.session.blocks ?? []) {
            if (b.kind === 'conditioning') { formats.add(b.format); for (const i of b.items) mains.add(i.exerciseId); }
            if (b.id.endsWith('.c4.warmup_general')) for (const i of b.items) wus.add(i.exerciseId);
            if (b.kind === 'cooldown') for (const i of b.items) if (i.prescription.type === 'mobility') mobs.add(i.exerciseId);
          }
          s = finishProgrammeSession(startProgrammeSession(s, at(`${d}T08:00:00.000Z`), x.requestId), at(`${d}T08:30:00.000Z`), { requestId: x.requestId, completion: 'abandoned', pain: false });
        }
      }
      lines.push(`| ${eq} | ${[...formats].sort().join(', ')} | ${String(mains.size)} distincts | ${[...wus].sort().join(', ') || '—'} | ${[...mobs].sort().join(', ') || '—'} | ${fmt(sts)} |`);
      if (eq === 'full') expect(formats.size).toBeGreaterThan(1);
    }
    lines.push('');

    // ——— Restrictions et exclusions (sans ergomètre, intermédiaire)
    lines.push('## Restrictions (sans ergomètre, mixte intermédiaire)', '', '| Cas | Statuts | Échauffement général | Retour au calme |', '|---|---|---|---|');
    const cases: [string, AppState][] = [
      ['aucune', create(profile({ equipment: EQUIPMENTS.no_erg }))],
      ['jumping jacks exclus par l’utilisateur', create({ ...profile({ equipment: EQUIPMENTS.no_erg }), excludedExercises: ['ex.jumping_jack'] })],
      ['débutant (refus C3 préexistant : aucune dose débutant sans ergomètre) — le plafond d’impact est testé au niveau moteur', create(profile({ equipment: EQUIPMENTS.no_erg, level: 'beginner' }))],
    ];
    for (const [label, s] of cases) {
      const xs = ctSessions(s);
      const v = xs.find((x) => x.placement === 'planned');
      const ses = v ? selectProgrammeSession(s, v.requestId)?.session : undefined;
      const wg = ses?.blocks.find((b) => b.id.endsWith('.c4.warmup_general'))?.items.map((i) => i.exerciseId) ?? [];
      const cd = ses?.blocks.find((b) => b.kind === 'cooldown')?.items.map((i) => i.exerciseId) ?? [];
      lines.push(`| ${label} | ${fmt(xs.reduce<Record<string, number>>((o, x) => { const k = x.composition?.c4?.status ?? x.placement; o[k] = (o[k] ?? 0) + 1; return o; }, {}))} | ${wg.join(', ') || '—'} | ${cd.join(', ') || '—'} |`);
      if (label.startsWith('jumping')) expect(wg).not.toContain('ex.jumping_jack');
    }
    lines.push('');

    // ——— Cohabitation : 4 sports (Strength, Running, Cross-training, HYROX)
    const four = createHr(hrProfile({ strength: true, running: true, ct: true, hr: { focus: 'balanced', role: undefined, sessionsPerWeek: 1 }, availability: [60, 60, 60, 60, 60, 75, 45] }));
    const wk = week(four);
    const bySport: Record<string, string[]> = {};
    for (const x of wk?.sessions ?? []) (bySport[x.sport] ??= []).push(`${x.placement}${x.composition?.c4 ? `/${x.composition.c4.status}` : ''}`);
    lines.push('## Cohabitation (4 sports, semaine 1)', '', '| Sport | Séances |', '|---|---|', ...Object.entries(bySport).sort().map(([k, v]) => `| ${k} | ${v.join(', ')} |`), '',
      'Prescriptions Strength / Running / HYROX : strictement identiques avec un port Cross-training C3 seul ou C4.2 (`packages/planner/tests/c4/c4-multisport.test.ts`) ; mobilité Strength protégée par discipline (`packages/strength/tests/unit/discipline-mobility.test.ts`).', '');
    expect(bySport.strength?.length).toBeGreaterThan(0);

    // Rapport HISTORIQUE (C4.1 → C4.2) : réécrit seulement sur demande explicite (garde-fous toujours vérifiés).
    if (process.env.C42_REPORT !== undefined) writeFileSync(new URL('./__reports__/c42-comparison.md', import.meta.url).pathname, `${lines.join('\n')}\n`);
  }, 600_000);
});
