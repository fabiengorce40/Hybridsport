/**
 * C3 — SIMULATION 4 SEMAINES (SIMULATION_ONLY / TEST_ONLY), pipeline CORE réel avec analyse anti-doublon du CORE.
 * Semaine type : lundi mixte, mercredi capacité aérobie, vendredi mixte. Perturbations : abandon (S2 mercredi),
 * douleur genou P2 (S3 lundi), rameur indisponible (S4). Rapport : __reports__/c3-simulation-4w.md.
 */
import { describe, expect, it } from 'vitest';
import { asISODateTime } from '@hybridsport/domain';
import type { FingerprintHistoryEntry } from '@hybridsport/domain';
import { CT_CODES } from '../../src/index.js';
import type { CtStimulus, RealizedCtSession } from '../../src/index.js';
import { realizedFrom, runC3Detailed } from '../c3-fixtures.js';
import { coreContext } from '../fixtures.js';
import { PROFILE_GYM, STATE_FRESH, pain } from '../../../engine/tests/harness/requests.js';
import { EQUIPMENT } from '../../../engine/tests/fixtures/catalog.js';
import { testRuleset } from '../../../engine/tests/fixtures/load.js';
import { testRulesetDocumentWithDuplicate } from '../../../engine/tests/fixtures/ruleset.js';
import { writeReport } from './report.js';

const FULL = EQUIPMENT.map((e) => e.id);
// technical-constant: SIMULATION_ONLY — calendrier (jours du mois d'octobre 2026, lundi / mercredi / vendredi)
const WEEKS = [[5, 7, 9], [12, 14, 16], [19, 21, 23], [26, 28, 30]] as const;
const PLAN: readonly CtStimulus[] = ['mixed_modal_medium', 'aerobic_capacity', 'mixed_modal_medium'];
// technical-constant: SIMULATION_ONLY — 60 min disponibles
const AVAILABLE_S = 3600;
const day = (d: number, h: string) => `2026-10-${String(d).padStart(2, '0')}T${h}:00Z`;

interface Row { week: number; date: string; stimulus: string; status: string; format: string; movements: string; identical: string; duplicate: string; note: string }

describe('C3 — simulation 4 semaines', () => {
  it('variété sans hasard, historique, anti-doublon, douleur, matériel, stabilité, taille de l’état', () => {
    const history: RealizedCtSession[] = [];
    const fingerprints: FingerprintHistoryEntry[] = [];
    const rows: Row[] = [];
    const ruleset = testRuleset(testRulesetDocumentWithDuplicate());
    for (const [w, days] of WEEKS.entries()) {
      for (const [k, d] of days.entries()) {
        const stimulus = PLAN[k] as CtStimulus;
        const injured = w === 2 && k === 0;
        const noRower = w === 3;
        const abandoned = w === 1 && k === 1;
        const r = runC3Detailed({
          stimulus, availableTimeS: AVAILABLE_S, seed: `sim:${String(w)}:${String(k)}`, history: [...fingerprints],
          profile: { ...PROFILE_GYM, availableEquipment: noRower ? FULL.filter((e) => e !== 'rower') : FULL },
          state: injured ? { ...STATE_FRESH, activePain: [pain({ bodyAreas: ['knee'], reportedAt: day(d, '06:00') })] } : STATE_FRESH,
          ctx: { sessionHistory: [...history] },
        }, { now: asISODateTime(day(d, '07:00')), ruleset: coreContext('x', ruleset).ruleset });
        const c = r.compose;
        const ok = r.outcome.result.status === 'ok' && c?.ok === true;
        const repeat = c?.ok ? c.proposal.reasons.some((x) => x.code === CT_CODES.C3_REPEAT_UNAVOIDABLE) : false;
        rows.push({
          week: w + 1, date: day(d, '07:00').slice(0, 10), stimulus, status: ok ? 'publiée' : 'refusée',
          format: c?.ok ? c.plan.format : '—', movements: c?.ok ? c.plan.items.map((i) => i.exerciseId.replace('ex.', '')).join(' + ') : (c?.ok === false ? c.reasons.filter((x) => x.code.endsWith('C3_NO_FORMAT') || x.code.endsWith('C3_HISTORY_NEGATIVE')).map((x) => JSON.stringify(x.params)).join(' ') : ''),
          identical: c?.ok ? c.plan.identicalToLast.join('+') || '—' : '—', duplicate: r.outcome.duplicate?.classification ?? '—',
          note: [injured ? 'douleur genou P2' : '', noRower ? 'sans rameur' : '', abandoned ? 'séance ABANDONNÉE' : '', repeat ? 'répétition inévitable tracée' : ''].filter(Boolean).join(', '),
        });
        if (!ok || !c?.ok) continue;
        const id = `ct.sim.${String(w)}.${String(k)}`;
        history.push(realizedFrom(c, id, day(d, '08:00'), abandoned ? { completion: 'abandoned', result: { kind: 'abandoned' } } : {}));
        if (r.outcome.fingerprint) fingerprints.push({ fingerprint: r.outcome.fingerprint, at: asISODateTime(day(d, '08:00')), status: 'completed', repetitionIntents: [] });
      }
    }

    // Invariants
    const published = rows.filter((x) => x.status === 'publiée');
    expect(published.length).toBeGreaterThanOrEqual(10);
    // Aucune séance identique à tous les niveaux à la précédente du même stimulus, sauf répétition tracée.
    expect(rows.filter((x) => x.identical === 'format+movements+dose' && !x.note.includes('répétition'))).toEqual([]);
    // Après l'abandon (S2 mercredi), la séance suivante n'en reprend aucun mouvement.
    const abandonedRow = rows.find((x) => x.note.includes('ABANDONNÉE'));
    const next = rows[rows.indexOf(abandonedRow as Row) + 1];
    for (const m of (abandonedRow?.movements ?? '').split(' + ')) expect(next?.movements.split(' + ')).not.toContain(m);
    // Douleur genou : aucun mouvement sensible au genou ce jour-là (ou refus explicite).
    const injuredRow = rows.find((x) => x.note.includes('douleur'));
    expect(['air_squat', 'reverse_lunge_bw', 'box_jump', 'wall_ball'].some((m) => injuredRow?.movements.split(' + ').includes(m))).toBe(false);
    // Sans rameur : aucun rameur.
    expect(rows.filter((x) => x.note.includes('sans rameur')).every((x) => !x.movements.includes('row_erg'))).toBe(true);
    // Variété : plusieurs formats par stimulus mixte.
    expect(new Set(rows.filter((x) => x.stimulus === 'mixed_modal_medium' && x.status === 'publiée').map((x) => x.format)).size).toBeGreaterThanOrEqual(2);

    // Rapport
    const usage = new Map<string, number>();
    for (const x of published) for (const m of x.movements.split(' + ')) usage.set(m, (usage.get(m) ?? 0) + 1);
    const formats = new Map<string, number>();
    for (const x of published) formats.set(`${x.stimulus}/${x.format}`, (formats.get(`${x.stimulus}/${x.format}`) ?? 0) + 1);
    const size = JSON.stringify(history).length;
    writeReport(new URL('./__reports__/c3-simulation-4w.md', import.meta.url).pathname, 'Cross-training C3 — simulation 4 semaines', [
      '| Sem. | Date | Stimulus | Statut | Format | Mouvements / cause | Identique à la précédente | Anti-doublon CORE | Note |', '|---|---|---|---|---|---|---|---|---|',
      ...rows.map((x) => `| ${String(x.week)} | ${x.date} | ${x.stimulus} | ${x.status} | ${x.format} | ${x.movements} | ${x.identical} | ${x.duplicate} | ${x.note} |`),
      '', '## Usage des mouvements', '', ...[...usage.entries()].sort((a, b) => b[1] - a[1]).map(([m, n]) => `- ${m} : ${String(n)}`),
      '', '## Formats par stimulus', '', ...[...formats.entries()].sort().map(([f, n]) => `- ${f} : ${String(n)}`),
      '', '## État', '', `- Historique réalisé CT (contrat \`zRealizedCtSession\`) : ${String(history.length)} séances, ${String(size)} octets JSON (${String(Math.round(size / history.length))} octets / séance).`,
      `- Empreintes CORE : ${String(fingerprints.length)} (${String(JSON.stringify(fingerprints).length)} octets JSON).`, '',
    ]);
  });
});
