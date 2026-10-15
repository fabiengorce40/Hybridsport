/**
 * RC4 — matrice d'audit (6 profils × 6 semaines, chemin réel) régénérée à chaque exécution :
 * `__reports__/rc4-matrice.md`. Observation seulement : aucune assertion de qualité sportive (les constats
 * reproductibles sont dans rc4-findings.test.ts).
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { PROFILES, simulate } from './rc4-sim.js';
import type { SessionRow, SimOut } from './rc4-sim.js';

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
  const sims = PROFILES.map((p) => simulate(p));
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
