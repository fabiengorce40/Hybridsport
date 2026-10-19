/**
 * RC4 — matrice d'audit (6 profils × 6 semaines, chemin réel) régénérée à chaque exécution :
 * `__reports__/rc4-matrice.md`. Observation seulement : aucune assertion de qualité sportive (les constats
 * reproductibles sont dans rc4-findings.test.ts). RC4.4 (lot A) : identité V0 et gain G5 vérifiés ici, sur les mêmes
 * simulations (calculées une fois par fichier, RC4.5 C4).
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { weekLoadWarnings } from '../../src/index.js';
import type { WeekLoadWarning } from '../../src/index.js';
import { MONS, PROFILES, simulateOnce } from './rc4-sim.js';
import type { SessionRow, SimOut } from './rc4-sim.js';

// Simulations de 6 semaines par le chemin réel : délai par test élargi.
vi.setConfig({ testTimeout: 300_000 });

const DAY_MS = 86_400_000;
const GROUPS = ['quads', 'hamstrings', 'glutes', 'calves', 'chest', 'back', 'shoulders', 'arms', 'core'] as const;
const short = (s: SessionRow) => `${s.sport === 'strength' ? 'M' : s.sport === 'running' ? 'C' : s.sport === 'crosstraining' ? 'CT' : 'HX'}:${(s.archetype ?? '—').split('.').pop() ?? ''}${s.variant ?? ''}`;
const hard = (s: SessionRow) => s.sport !== 'running' || /test|threshold|severe|long|interval|hills/.test(s.archetype ?? '');

function profileSection(r: SimOut): string[] {
  const out = [`## ${r.spec.id} — ${r.spec.label}`, ''];
  out.push('| sem. | calendrier (lun → dim) | repos | jours consécutifs max | enchaînements durs J/J+1 | non planifiées |', '|---|---|---|---|---|---|');
  for (const w of r.weeks) {
    const rows = r.sessions.filter((s) => s.week === w.week && s.date).sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? -1 : 1));
    const mon = Date.parse(w.monday);
    const byDay = Array.from({ length: 7 }, (_, i) => rows.filter((s) => Date.parse(s.date ?? '') === mon + i * DAY_MS));
    let run = 0; let max = 0;
    for (const d of byDay) { run = d.length > 0 ? run + 1 : 0; max = Math.max(max, run); }
    const pairs = rows.flatMap((a, i) => { const b = rows[i + 1]; return b && Date.parse(b.date ?? '') - Date.parse(a.date ?? '') <= DAY_MS && hard(a) && hard(b) ? [`${short(a)}→${short(b)}`] : []; });
    const np = r.sessions.filter((s) => s.week === w.week && !s.date);
    out.push(`| S${String(w.week)} | ${byDay.map((d) => (d.length ? d.map(short).join('+') : '—')).join(' ; ')} | ${String(byDay.filter((d) => d.length === 0).length)} | ${String(max)} | ${String(pairs.length)} | ${np.map((s) => s.notPlanned ?? s.status).join(', ') || '—'} |`);
  }
  out.push('');
  if (r.sessions.some((s) => s.sport === 'strength')) {
    out.push('Volume Musculation prévu (séries de travail / semaine, moyenne S1–S6 ; cible – borne haute) :', '');
    out.push(`| ${GROUPS.join(' | ')} |`, `|${GROUPS.map(() => '---').join('|')}|`);
    out.push(`| ${GROUPS.map((g) => { const v = r.weeks.map((w) => w.volume.find((x) => x.group === g)).filter((x) => x !== undefined); const avg = v.reduce((n, x) => n + x.planned, 0) / Math.max(1, v.length); return `${avg.toFixed(1)} (${String(v[0]?.target ?? '—')}–${String(v[0]?.high ?? '—')})`; }).join(' | ')} |`, '');
  }
  const runs = r.sessions.filter((s) => s.sport === 'running');
  if (runs.length) {
    out.push('Course (structure prescrite par semaine) :', '');
    for (const w of r.weeks) out.push(`- S${String(w.week)} : ${runs.filter((s) => s.week === w.week).map((s) => `${(s.archetype ?? 'non planifiée').split('.').pop() ?? ''} ${s.run ?? s.notPlanned ?? ''}${s.runPaced ? ' (allure)' : ''}`).join(' ; ')}`);
    out.push('');
  }
  const other = r.sessions.filter((s) => s.sport === 'crosstraining' || s.sport === 'hyrox');
  if (other.length) {
    out.push('Cross-training / HYROX :', '');
    for (const s of other) out.push(`- S${String(s.week)} ${s.date ?? '—'} ${short(s)} (${String(s.targetMin ?? '—')} min) : ${(s.content ?? s.notPlanned ?? '').replace(/\|/g, '/')}`);
    out.push('');
  }
  const adapted = r.sessions.filter((s) => s.checkIn !== '—' && s.checkIn !== 'no/low');
  if (adapted.length) {
    out.push('Contrôles avant séance scénarisés :', '');
    for (const s of adapted) out.push(`- S${String(s.week)} ${s.date ?? ''} ${short(s)} : ${s.checkIn} → ${s.adapted}`);
    out.push('');
  }
  if (r.errors.length) out.push('Erreurs de simulation :', '', ...r.errors.map((e) => `- ${e}`), '');
  return out;
}

it('RC4 — matrice 6 profils × 6 semaines (chemin réel)', () => {
  const sims = PROFILES.map((p) => simulateOnce(p));
  const lines = [
    '# RC4 — Matrice d\'audit multisport (générée)',
    '',
    'Chemin réel Beta 0, 6 semaines, réalisations conformes entre les semaines (voir `rc4-sim.ts`). Abréviations : M Musculation, C Course, CT Cross-training, HX HYROX ; « — » jour sans séance.',
    '',
    ...sims.flatMap(profileSection),
  ];
  writeFileSync(join(import.meta.dirname, '__reports__', 'rc4-matrice.md'), `${lines.join('\n')}\n`);
  expect(sims.every((r) => r.errors.length === 0)).toBe(true);
}, 600_000);

const spec = (id: string) => {
  const p = PROFILES.find((x) => x.id === id);
  if (!p) throw new Error(id);
  return p;
};
const kind = <K extends WeekLoadWarning['kind']>(w: readonly WeekLoadWarning[], k: K) => w.find((x): x is Extract<WeekLoadWarning, { kind: K }> => x.kind === k);
/** Tout ce que le banc observe, sans l'état persisté (qui porte la trace de simulation G5). */
const observed = (r: SimOut) => ({ sessions: r.sessions, weeks: r.weeks, errors: r.errors });

describe('Lot A — placement global G5 sur le chemin Beta 0 (6 semaines)', () => {
  for (const id of ['P1b', 'P2', 'P4', 'P5']) {
    it(`${id} : strictement identique à V0 (G5 désactivé) — calendrier, séances, volumes, courses`, () => {
      expect(observed(simulateOnce(spec(id)))).toEqual(observed(simulateOnce(spec(id), MONS.length, false)));
    });
  }
  it('P3 : Full Body J/J+1 et jours consécutifs en baisse, aucune séance retirée, Course absente (inchangée)', () => {
    const v0 = simulateOnce(spec('P3'), MONS.length, false);
    const g5 = simulateOnce(spec('P3'));
    const fb = (r: SimOut) => MONS.reduce((n, mon) => n + (kind(weekLoadWarnings(r.state, mon), 'full_body_consecutive')?.pairs.length ?? 0), 0);
    expect(fb(g5)).toBeLessThan(fb(v0));
    expect(g5.sessions.filter((x) => x.placement === 'planned')).toHaveLength(v0.sessions.filter((x) => x.placement === 'planned').length);
    const moved = Object.values(g5.state.planner.weeks).flatMap((w) => w.requests).flatMap((r) => r.reasons).filter((x) => x.code === 'PLAN.PLANNER.GLOBAL_PLACEMENT_APPLIED');
    expect(moved.length).toBeGreaterThan(0);
    expect(moved.every((x) => Number(x.params.fullBodyAfter) < Number(x.params.fullBodyBefore))).toBe(true);
  });
});
