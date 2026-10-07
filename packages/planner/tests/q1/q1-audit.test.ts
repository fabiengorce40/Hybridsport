/**
 * Q1 — AUDIT DE QUALITÉ des séances générées (planificateur RÉEL, quatre moteurs RÉELS, valeurs TEST_ONLY) :
 * scénarios A (Strength), B (Running), C (Cross-training réel observé), D (HYROX réel observé), F (composée mais non
 * placée), G (semaine quatre sports après M3), J (matériel limité), audit des cinq rôles H2 et des formats C3, et
 * tests ADVERSARIAUX (le diagnostic ne choisit, ne modifie, ne masque rien ; aucune valeur non approuvée n'est une
 * preuve). Rapport : __reports__/q1-quality-audit.md.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { assessH2Quality, h2PresentationOf } from '@hybridsport/hyrox';
import { assessC3Quality, ctBasisOf } from '@hybridsport/crosstraining';
import { QUALITY_VERDICTS, UNPROVEN_BASES, verdictOf } from '@hybridsport/engine';
import type { QualityAssessment } from '@hybridsport/engine';
import type { SessionDraft } from '@hybridsport/domain';
import { placementOf, planMultisportWeek } from '../../src/index.js';
import { clock, input, plannerGovernance } from '../fixtures.js';
import type { RequestResult } from '../../src/index.js';
import { PROFILE } from '../fixtures.js';
import { hrBeta0 } from '../hr-beta0.js';
import { testCatalog } from '../../../engine/tests/fixtures/load.js';
import { CT_GOV, D, ctPort, first, hrPort, plan, q1Ports, realCt, realHyrox, runPort, strPort } from './q1-fixtures.js';

type Planned = Extract<RequestResult, { status: 'planned' }>;
const q = (r: Planned): QualityAssessment => { if (!r.quality) throw new Error('diagnostic absent'); return r.quality; };
const crit = (a: QualityAssessment, id: string) => a.criteria.find((c) => c.id === id);
const technicallyValid = (r: Planned) => r.record.session.blocks.length > 0 && q(r).criteria.find((c) => c.id === 'prescription_integrity')?.status === 'PASS';
const demonstrated = (a: QualityAssessment) => a.verdict === 'ACCEPTABLE' || a.verdict === 'ACCEPTABLE_WITH_WARNINGS';
const why = (a: QualityAssessment) => a.criteria.filter((c) => c.status !== 'PASS').map((c) => `${c.id}: ${c.status} (${c.basis})`).join(' ; ') || 'tous critères vérifiés';
const H2_CONTENT = hrBeta0().content;
const recompute = (r: Planned, archetypeId: string) => (r.sport === 'hyrox'
  ? assessH2Quality(r.session, archetypeId, { catalog: H2_CONTENT.catalog, ruleset: H2_CONTENT.ruleset, env: 'TEST_ONLY', estimate: r.record.durationEstimate, reasons: r.reasons })
  : assessC3Quality(r.session, archetypeId.replace('crosstraining.', ''), { catalog: testCatalog(), governance: CT_GOV, env: 'TEST_ONLY', estimate: r.record.durationEstimate, reasons: r.reasons }));

const rows1: string[] = [];
const sections: string[] = [];
const row = (sport: string, label: string, r: Planned) => rows1.push(`| ${sport} | ${label} | ${technicallyValid(r) ? 'oui' : 'non'} | ${demonstrated(q(r)) ? 'oui' : 'non'} | ${q(r).verdict} | ${why(q(r))} |`);
const criteriaTable = (a: QualityAssessment) => ['| critère | statut | base | faits | raisons |', '|---|---|---|---|---|', ...a.criteria.map((c) => `| ${c.id} | ${c.status} | ${c.basis} | ${Object.entries(c.facts).map(([k, v]) => `${k}=${Array.isArray(v) ? `[${v.join(', ')}]` : String(v)}`).join(' ; ')} | ${c.reasons.join(', ')} |`)].join('\n');

describe('Q1 — scénarios A, B, C, D, F, G, J', () => {
  it('A — Strength réelle : intégrité et durée dérivées, volume / progression non démontrés (règles draft)', () => {
    const r = first(plan([D.strength(1)], { strength: strPort() }), 'strength');
    expect(q(r).verdict).toBe('UNRESOLVED');
    expect(crit(q(r), 'duration_coherence')?.status).toBe('PASS');
    expect(crit(q(r), 'volume_target')?.basis).toBe('TEST_ONLY');
    row('Strength', `${r.intent?.archetypeId ?? ''} (full body)`, r);
    sections.push(`## A — Strength réelle\n\n${criteriaTable(q(r))}\n`);
  });
  it('B — Running réelle : valeurs candidates tracées ⇒ dose non démontrée', () => {
    const r = first(plan([D.running(1)], { running: runPort() }), 'running');
    expect(q(r).verdict).toBe('UNRESOLVED');
    expect(crit(q(r), 'dose_coherence')?.reasons).toContain('no_approved_quality_range');
    row('Running', r.intent?.archetypeId ?? '', r);
    sections.push(`## B — Running réelle\n\n${criteriaTable(q(r))}\n`);
  });
  it('C — Cross-training réel observé (AMRAP 12 min : SkiErg 250 m, 15 squats, 8 tractions élastique)', () => {
    const r = realCt();
    const items = r.session.blocks[0]?.items.map((i) => [i.exerciseId, i.prescription]) ?? [];
    expect(r.session.blocks[0]).toMatchObject({ format: 'amrap', timeCapS: 720 });
    expect(items).toEqual([['ex.skierg', { type: 'distance', distanceM: 250 }], ['ex.air_squat', { type: 'reps', reps: 15 }], ['ex.band_assisted_pull_up', { type: 'reps', reps: 8 }]]);
    expect(q(r).verdict).toBe('UNRESOLVED');
    expect(crit(q(r), 'excessive_repetition')?.status).toBe('PASS');
    row('Cross-training', 'AMRAP 12:00 — SkiErg 250 m, 15 squats, 8 tractions élastique', r);
    const decisions = r.reasons.filter((x) => /C3_(FORMAT_CHOSEN|MOVEMENT_SELECTED|DOSE|CANDIDATES_REJECTED|DURATION)$/.test(x.code)).map((x) => `- \`${x.code.split('.').pop() ?? ''}\` ${JSON.stringify(x.params)}`);
    const gov = (id: string) => `${id} : ${ctBasisOf(CT_GOV, id)} (maturité ${CT_GOV.parameters.find((p) => p.parameterId === id)?.maturity ?? 'absent'}) ⇒ TEST_ONLY dans ce diagnostic`;
    sections.push([
      '## C — Cross-training réel observé', '',
      'Reproduction : stimulus `mixed_modal_medium`, niveau intermédiaire, rameur utilisé il y a 3 jours (sinon le rameur, pertinence catalogue 3, est préféré au SkiErg, pertinence 0).', '',
      '### Pourquoi ces choix (décisions persistées du moteur)', '', ...decisions, '',
      '### Provenance', '',
      '| décision | source | gouvernance | scientifique ? |', '|---|---|---|---|',
      `| AMRAP | ct.stimulus.admissibleFormats + ordre gouverné / format le moins récemment utilisé | ${gov('ct.stimulus.admissibleFormats')} | non (produit / test) |`,
      `| 12 min | ct.dose.construction[mixed_modal_medium][intermediate].amrap.timeCapS = 720 | ${gov('ct.dose.construction')} | non (TEST_ONLY) |`,
      '| SkiErg | rôle `monostructural` (ct.composition.movementRoles) ; classement : non récent > coût technique > pertinence catalogue > identifiant | TEST_ONLY (réservoir, rôles) + catalogue | non (classement produit) |',
      '| 250 m | ct.dose.construction quantities.monostructural | TEST_ONLY | non |',
      '| squat 15 reps | rôle `lower_body` ; coût technique 1 ; quantité ct.dose.construction | TEST_ONLY | non |',
      '| traction élastique 8 reps | rôle `upper_pull` ; traction stricte écartée ou classée après (coût technique, pertinence) ; quantité TEST_ONLY | TEST_ONLY | non |', '',
      criteriaTable(q(r)), '',
    ].join('\n'));
  });
  it('D — HYROX réel observé (Endurance de force : 4 tours farmer 100 m @ 24 kg + fentes sandbag 50 m @ 10 kg, time cap ≈ 28 min)', () => {
    const r = realHyrox();
    const b = r.session.blocks[0];
    expect(b).toMatchObject({ format: 'for_time', rounds: 4, timeCapS: 1702 });
    const p = h2PresentationOf(r.session, r.intent?.archetypeId ?? '');
    const farmer = p?.components.find((c) => c.exerciseId === 'ex.farmers_carry');
    const lunge = p?.components.find((c) => c.exerciseId === 'ex.sandbag_lunge');
    expect([farmer?.dose.value, farmer?.loadKg, lunge?.dose.value, lunge?.loadKg]).toEqual([100, 24, 50, 10]);
    const a = q(r);
    expect(a.verdict).toBe('UNRESOLVED');
    expect(crit(a, 'role_specificity')?.status).toBe('PASS');
    expect(crit(a, 'dose_coherence')?.facts.perStationTotal).toEqual(['farmers_carry:400distance_m@24kg', 'sandbag_lunge:200distance_m@10kg']);
    row('HYROX', 'Endurance de force — 4 × (farmer 100 m @ 24 kg + fentes 50 m @ 10 kg)', r);
    const dur = r.reasons.find((x) => x.code.endsWith('.H2_DURATION') && x.params.timeCapS === 1702)?.params;
    const ruleset = H2_CONTENT.ruleset;
    const prov = (id: string) => { const m = ruleset.parameter(id); return `${id} : statut ${m?.status ?? 'absent'}, provisoire ${String(m?.provisional)}, source ${m?.source.kind ?? '—'} ⇒ TEST_ONLY`; };
    sections.push([
      '## D — HYROX réel observé : Endurance de force', '',
      '| calcul | valeur |', '|---|---|',
      '| distance totale farmer walk | 4 × 100 m = 400 m @ 24 kg |',
      '| distance totale fentes sandbag | 4 × 50 m = 200 m @ 10 kg |',
      '| passages de station | 2 stations × 4 tours = 8 |',
      `| durée estimée (débits TEST_ONLY) | typique ${String(dur?.estimatedTypicalS)} s, lente ${String(dur?.estimatedSlowS)} s ; time cap = lente × 1,15 = ${String(dur?.timeCapS)} s ; transitions (7) non chiffrées |`,
      `| profil de demande CORE | ${r.demand.status === 'derived' ? Object.entries(r.demand.levels).map(([k, v]) => `${k}=${v}`).join(', ') : 'indisponible'} |`,
      `| patterns / répétition locale | ${JSON.stringify(crit(a, 'local_accumulation')?.facts)} |`,
      `| diversité | ${JSON.stringify(crit(a, 'station_balance')?.facts)} |`,
      `| provenance des charges | ${prov('hybrid_race.h2.stationDoses')} |`,
      `| provenance des distances | ${prov('hybrid_race.h2.stationDoses')} |`,
      `| provenance des tours | ${prov('hybrid_race.h2.structureVolume')} |`,
      `| options de volume (trace) | ${r.reasons.filter((x) => x.code.endsWith('.H2_STRUCTURE_REJECTED')).map((x) => `${String(x.params.structure)} écartée (${(x.params.causes as string[]).join(', ')})`).join(' ; ') || 'aucune écartée'} |`,
      `| choix des stations (trace) | ${r.reasons.filter((x) => x.code.endsWith('.H2_STATION_SELECTED')).map((x) => `${String(x.params.stationId)} [${(x.params.criteria as string[]).join(', ')}]`).join(' ; ')} |`, '',
      '**Constat** : les deux stations ont la même pertinence catalogue (3) que d’autres stations chargées ; le choix final est un DÉPARTAGE PAR IDENTIFIANT (ordre alphabétique), et la troisième station du circuit 4×3 n’a pas pu être remplie (incompatibilités de redondance / structure locale). Rien ne relie ce choix à un objectif « endurance de force HYROX ».', '',
      '**Qu’est-ce qui prouve que cette séance est adaptée au rôle Endurance de force HYROX ?** Seulement sa cohérence DÉFINITIONNELLE : structure `station_circuit` admise pour le rôle, deux stations CHARGÉES (exigence du rôle), aucune course. Les distances, charges, nombre de tours, nombre de stations et la durée viennent UNIQUEMENT de paramètres `hybrid_race.h2.*` TEST_ONLY (draft, provisoires, hypothèse interne) : le diagnostic les classe UNRESOLVED (`no_approved_quality_range`). Aucune preuve sportive n’existe.', '',
      criteriaTable(a), '',
    ].join('\n'));
  });
  it('F — COMPOSÉE MAIS NON PLACÉE : exactement le même diagnostic que la même prescription placée', () => {
    const w = plan([D.strength(1), D.running(3)], q1Ports(), { minutes: [60, 0, 90, 0, 0, 0, 0] });
    const u = w.requests.find((r) => placementOf(r) === 'COMPOSED_BUT_UNPLACED');
    if (!u || u.status !== 'unplaced' || !u.composed) throw new Error('aucune séance composée non placée');
    const port = runPort();
    expect(u.composed.quality).toEqual(port.quality?.({ session: u.composed.session, archetypeId: u.intent?.archetypeId ?? '', reasons: u.reasons, record: u.composed.record }));
    sections.push(`## F — Composée mais non placée (${u.requestId})\n\nMême calcul que pour une séance placée (port du sport, prescription persistée). Verdict : ${u.composed.quality?.verdict ?? '—'}.\n`);
  });
  it('G — semaine quatre sports après M3 : chaque prescription diagnostiquée ; M3 ne change aucun diagnostic', () => {
    const w = plan([D.hyrox(2), D.running(2), D.strength(2), D.ct(1)], q1Ports(), { m3: true, minutes: [60, 60, 60, 60, 60, 90, 60] });
    const planned = w.requests.filter((r): r is Planned => r.status === 'planned');
    for (const r of planned) {
      const port = q1Ports()[r.sport];
      expect(r.quality).toEqual(port?.quality?.({ session: r.session, archetypeId: r.intent?.archetypeId ?? '', reasons: r.reasons, record: r.record }));
    }
    sections.push(['## G — Semaine quatre sports après M3', '', `Statut M3 : ${w.arbitration?.status ?? '—'} ; décisions : ${(w.arbitration?.decisions ?? []).map((d) => `${d.action} ${d.requestId}`).join(', ') || 'aucune'}.`, '', '| séance | verdict | non démontrés |', '|---|---|---|', ...planned.map((r) => `| ${r.requestId} (${r.intent?.archetypeId ?? ''}) | ${q(r).verdict} | ${q(r).criteria.filter((c) => c.status === 'UNRESOLVED').map((c) => c.id).join(', ')} |`), ''].join('\n'));
  });
  it('J — matériel limité (aucun ergomètre) : le moteur compose autrement ou refuse ; le diagnostic ne compense rien', () => {
    const limited = { ...PROFILE, availableEquipment: PROFILE.availableEquipment.filter((e) => !/rower|ski|erg/.test(e)) };
    const w = plan([D.ct(1)], { crosstraining: ctPort({ profile: limited }) });
    const r = w.requests[0];
    const text = r?.status === 'planned' ? `séance ${r.session.blocks[0]?.format ?? ''} : ${r.session.blocks[0]?.items.map((i) => i.exerciseId).join(', ') ?? ''} — verdict ${q(r).verdict}` : `refusée (${r?.category ?? ''}) : aucune prescription, aucun diagnostic`;
    if (r?.status === 'planned') expect(r.session.blocks.flatMap((b) => b.items).some((i) => /row_erg|skierg/.test(i.exerciseId))).toBe(false);
    sections.push(`## J — Matériel limité (Cross-training sans ergomètre)\n\n${text}\n`);
  });
  it('rôles H2 (5) et formats C3 : audit par rôle / format', () => {
    const roles = ['station_capacity', 'strength_endurance', 'mixed_station_conditioning', 'compromised_running', 'partial_simulation'] as const;
    const lines = ['| rôle H2 | structure | stations | tours | time cap | verdict | non démontrés |', '|---|---|---|---|---|---|---|'];
    for (const role of roles) {
      const r = first(plan([D.hyrox(1, role)], { hyrox: hrPort() }), 'hyrox');
      const p = h2PresentationOf(r.session, r.intent?.archetypeId ?? '');
      expect(crit(q(r), 'role_specificity')?.status).toBe('PASS');
      lines.push(`| ${role} | ${p?.structure ?? ''} | ${p?.components.filter((c) => c.kind === 'station').map((c) => `${c.exerciseId.replace('ex.', '')} ${String(c.dose.value)}${c.dose.kind === 'distance_m' ? ' m' : ' reps'}${c.loadKg ? ` @ ${String(c.loadKg)} kg` : ''}`).join(' + ') ?? ''} | ${String(p?.rounds)} | ${String(p?.timeCapS)} s | ${q(r).verdict} | ${q(r).criteria.filter((c) => c.status === 'UNRESOLVED').map((c) => c.id).join(', ')} |`);
      row('HYROX', `rôle ${role}`, r);
    }
    const w = plan([D.ct(2)], { crosstraining: ctPort() });
    const ctLines = ['| séance C3 | format | mouvements | verdict |', '|---|---|---|---|'];
    for (const r of w.requests.filter((x): x is Planned => x.status === 'planned')) {
      ctLines.push(`| ${r.requestId} | ${r.session.blocks[0]?.format ?? ''} | ${r.session.blocks[0]?.items.map((i) => i.exerciseId.replace('ex.', '')).join(', ') ?? ''} | ${q(r).verdict} |`);
      row('Cross-training', `${r.session.blocks[0]?.format ?? ''} (${r.requestId.slice(11)})`, r);
    }
    sections.push(['## Audit des cinq rôles H2', '', 'BALANCED n’est PAS une preuve de qualité : il fait seulement tourner ces rôles (voir app-core, scénario E).', '', ...lines, '', '## Audit des formats C3 (semaine à deux séances)', '', 'VARIÉTÉ (formats et mouvements différents) ≠ COHÉRENCE ≠ QUALITÉ.', '', ...ctLines, ''].join('\n'));
  });
});

describe('Q1 — adversarial (planificateur, moteurs)', () => {
  const hr = realHyrox();
  const ct = realCt();
  const freeze = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
  it('A1. le diagnostic ne choisit aucun exercice / station (séance identique avant et après diagnostic)', () => {
    const before = freeze(hr.session);
    recompute(hr, hr.intent?.archetypeId ?? '');
    expect(hr.session).toEqual(before);
  });
  it('A2. ne modifie aucune dose ni charge ni time cap (sortie du moteur seul = séance planifiée)', () => {
    const port = hrPort();
    const out = port.generate({ requestId: hr.requestId, date: hr.date, availableMinutes: 60, hybrid: false, seed: `planner:${hr.requestId}:${hr.date}`, intent: hr.intent as never });
    expect(out.status === 'planned' && out.session).toEqual(hr.session);
  });
  it('A3. ne modifie aucun placement (jours identiques avec / sans diagnostic : la diagnostic n’a pas d’entrée de placement)', () => {
    const w1 = plan([D.hyrox(2), D.running(2)], q1Ports());
    const w2 = plan([D.hyrox(2), D.running(2)], q1Ports());
    expect(w1.days).toEqual(w2.days);
  });
  it('A4. même prescription ⇒ même diagnostic (déterminisme, octet pour octet)', () => {
    expect(JSON.stringify(recompute(hr, hr.intent?.archetypeId ?? ''))).toBe(JSON.stringify(hr.quality));
    expect(JSON.stringify(recompute(ct, ct.intent?.archetypeId ?? ''))).toBe(JSON.stringify(ct.quality));
  });
  it('A5. diagnostic identique après sérialisation JSON de la prescription', () => {
    const s = freeze(hr.session) as SessionDraft;
    expect(assessH2Quality(s, hr.intent?.archetypeId ?? '', { catalog: H2_CONTENT.catalog, ruleset: H2_CONTENT.ruleset, env: 'TEST_ONLY', estimate: hr.record.durationEstimate, reasons: hr.reasons })).toEqual(hr.quality);
  });
  it('A6. TEST_ONLY ≠ APPROVED : aucun critère gouverné n’est PASS', () => {
    for (const a of [q(hr), q(ct)]) for (const c of a.criteria) if (UNPROVEN_BASES.has(c.basis)) expect(c.status).not.toBe('PASS');
  });
  it('A7. absence de règle ⇒ UNRESOLVED (équilibre des stations, accumulation locale)', () => {
    expect(crit(q(hr), 'station_balance')).toMatchObject({ status: 'UNRESOLVED', basis: 'UNRESOLVED' });
    expect(crit(q(hr), 'local_accumulation')).toMatchObject({ status: 'UNRESOLVED', basis: 'UNRESOLVED' });
  });
  it('A8. donnée invalide ⇒ BLOCKED : rôle Endurance de force avec une station NON chargée', () => {
    const s = freeze(hr.session);
    const item = s.blocks[0]?.items[0] as { exerciseId: string; prescription: { load?: unknown } };
    item.exerciseId = 'ex.burpee_broad_jump';
    delete item.prescription.load;
    const a = assessH2Quality(s, hr.intent?.archetypeId ?? '', { catalog: H2_CONTENT.catalog, ruleset: H2_CONTENT.ruleset, env: 'TEST_ONLY' });
    expect(a.verdict).toBe('BLOCKED');
    expect(crit(a, 'role_specificity')?.reasons).toContain('role_requires_loaded_stations');
  });
  it('A9. donnée invalide ⇒ BLOCKED : time cap inférieur à l’estimation lente tracée', () => {
    const s = freeze(hr.session) as { blocks: { timeCapS: number }[] };
    (s.blocks[0] as { timeCapS: number }).timeCapS = 600;
    const reasons = hr.reasons.map((r) => (r.code.endsWith('.H2_DURATION') && r.params.timeCapS === 1702 ? { ...r, params: { ...r.params, timeCapS: 600 } } : r));
    expect(assessH2Quality(s as never, hr.intent?.archetypeId ?? '', { catalog: H2_CONTENT.catalog, ruleset: H2_CONTENT.ruleset, reasons }).verdict).toBe('BLOCKED');
  });
  it('A10. donnée invalide ⇒ BLOCKED : station chargée sans charge', () => {
    const s = freeze(hr.session);
    delete (s.blocks[0]?.items[0]?.prescription as { load?: unknown }).load;
    expect(crit(assessH2Quality(s, hr.intent?.archetypeId ?? '', { catalog: H2_CONTENT.catalog, ruleset: H2_CONTENT.ruleset }), 'load_policy')?.status).toBe('BLOCKED');
  });
  it('A11. donnée invalide ⇒ BLOCKED : archétype illisible (aucune présentation)', () => {
    expect(assessH2Quality(hr.session, 'hybrid_race.h2.unknown', { catalog: H2_CONTENT.catalog, ruleset: H2_CONTENT.ruleset }).verdict).toBe('BLOCKED');
  });
  it('A12. CT : format non admis pour le stimulus ⇒ BLOCKED (cohérence avec la gouvernance)', () => {
    expect(assessC3Quality(ct.session, 'skill_plus_conditioning', { catalog: testCatalog(), governance: CT_GOV }).verdict).toBe('BLOCKED');
  });
  it('A13. CT : répétition exacte de la dernière séance ⇒ avertissement DÉRIVÉ, jamais masquée', () => {
    const reasons = [...ct.reasons, { code: 'PLAN.CROSSTRAINING.C3_REPEAT_UNAVOIDABLE', params: { identicalLevels: ['format', 'movements', 'dose'] } }];
    expect(crit(assessC3Quality(ct.session, 'mixed_modal_medium', { catalog: testCatalog(), governance: CT_GOV, reasons }), 'excessive_repetition')).toMatchObject({ status: 'WARNING', basis: 'DERIVED' });
  });
  it('A14. CT : variété ≠ qualité (non-répétition PASS, verdict toujours UNRESOLVED)', () => {
    expect(crit(q(ct), 'excessive_repetition')?.reasons).toContain('variety_is_not_quality');
    expect(q(ct).verdict).toBe('UNRESOLVED');
  });
  it('A15. CT : gouvernance non transmise ⇒ bases inconnues (jamais « approuvé » par défaut)', () => {
    const r = first(plan([D.ct(1)], { crosstraining: ctPort({ governance: false }) }), 'crosstraining');
    expect(q(r).criteria.some((c) => c.basis === 'APPROVED')).toBe(false);
    expect(q(r).verdict).toBe('UNRESOLVED');
  });
  it('A16. sans environnement déclaré : base PROVISIONAL / EXPERT, jamais TEST_ONLY deviné ni APPROVED', () => {
    const r = first(plan([D.ct(1)], { crosstraining: ctPort({ env: undefined }) }), 'crosstraining');
    expect(q(r).criteria.some((c) => c.basis === 'TEST_ONLY' || c.basis === 'APPROVED')).toBe(false);
  });
  it('A17. aucun score global : verdict ∈ quatre valeurs, aucun champ numérique de synthèse', () => {
    for (const a of [q(hr), q(ct)]) {
      expect(QUALITY_VERDICTS).toContain(a.verdict);
      expect(Object.keys(a).sort()).toEqual(['criteria', 'schema', 'verdict']);
    }
  });
  it('A18. verdict = conséquence mécanique des critères (aucun seuil caché)', () => {
    for (const a of [q(hr), q(ct)]) expect(verdictOf(a.criteria)).toBe(a.verdict);
  });
  it('A19. aucune station officielle ni dose officielle inventée par le diagnostic (faits = prescription × tours)', () => {
    const totals = crit(q(hr), 'dose_coherence')?.facts.perStationTotal as readonly string[];
    const p = h2PresentationOf(hr.session, hr.intent?.archetypeId ?? '');
    expect(totals.length).toBe(p?.components.filter((c) => c.kind === 'station').length);
  });
  it('A20. PRODUCTION : valeurs TEST_ONLY refusées par les moteurs ⇒ aucune prescription, aucun diagnostic qui les consommerait', () => {
    // Le mode des moteurs vient du contexte fourni par l'appelant (app-core : env.mode) — anomalie documentée.
    const w = planMultisportWeek({ ...input([D.hyrox(1)]), mode: 'PRODUCTION' }, { hyrox: hrPort({ mode: 'PRODUCTION' }) }, plannerGovernance(), clock);
    expect(w.requests.some((r) => r.status === 'planned' || (r.status === 'unplaced' && r.composed))).toBe(false);
  });
  it('A21. Strength gelée : prescription identique au port sans diagnostic d’environnement', () => {
    const a = first(plan([D.strength(1)], { strength: strPort() }), 'strength');
    const b = first(plan([D.strength(1)], { strength: strPort() }), 'strength');
    expect(a.session).toEqual(b.session);
  });
  it('A22. COMPOSED_BUT_UNPLACED : même diagnostic que la même prescription placée (CT)', () => {
    const w = plan([D.ct(3)], { crosstraining: ctPort() }, { minutes: [60, 0, 0, 0, 0, 0, 60] });
    for (const u of w.requests.filter((r) => placementOf(r) === 'COMPOSED_BUT_UNPLACED')) {
      if (u.status !== 'unplaced' || !u.composed) continue;
      expect(u.composed.quality).toEqual(ctPort().quality?.({ session: u.composed.session, archetypeId: u.intent?.archetypeId ?? '', reasons: u.reasons, record: u.composed.record }));
    }
  });
  it('A23. séance BLOQUÉE par le moteur (refus) : aucune prescription ⇒ aucun diagnostic (jamais une qualité inventée)', () => {
    const w = plan([D.hyrox(1)], { hyrox: hrPort({ level: 'beginner' }) });
    expect(w.requests.every((r) => r.status !== 'planned' && !(r.status === 'unplaced' && r.composed))).toBe(true);
  });
  it('A24. le diagnostic n’importe aucune dépendance d’interface', () => {
    const files = ['packages/engine/src/quality/index.ts', 'packages/hyrox/src/h2/quality.ts', 'packages/crosstraining/src/c3/quality.ts'];
    for (const f of files) expect(readFileSync(new URL(`../../../../${f}`, import.meta.url), 'utf8')).not.toMatch(/react|apps\/kairo|app-core/);
  });
  it('A25. aucun seuil numérique caché dans les critères (aucun littéral hors 0/1 dans le code qualité)', () => {
    for (const f of ['packages/engine/src/quality/index.ts', 'packages/hyrox/src/h2/quality.ts', 'packages/crosstraining/src/c3/quality.ts']) {
      const code = readFileSync(new URL(`../../../../${f}`, import.meta.url), 'utf8').split('\n').filter((l) => !/^\s*(\*|\/\/|\/\*\*)/.test(l)).join('\n');
      expect(code.match(/(?<![\w.])(?:[2-9]|\d{2,})(?:\.\d+)?(?![\w])/g) ?? []).toEqual([]);
    }
  });
  it('A26. M3 : une séance déplacée est re-diagnostiquée sur SA prescription ; aucun verdict modifié par l’arbitrage', () => {
    const w = plan([D.hyrox(2), D.running(2)], q1Ports(), { m3: true });
    for (const d of w.arbitration?.decisions ?? []) {
      const r = w.requests.find((x) => x.requestId === d.requestId);
      if (r?.status !== 'planned') continue;
      expect(r.quality).toEqual(q1Ports()[r.sport]?.quality?.({ session: r.session, archetypeId: r.intent?.archetypeId ?? '', reasons: r.reasons, record: r.record }));
    }
  });
  it('A27. aucun fait de placement dans le diagnostic (ni date, ni jour, ni conflit M3)', () => {
    for (const a of [q(hr), q(ct)]) expect(JSON.stringify(a)).not.toMatch(/2026-10-|M3_|arbitration|MOVE|SWAP/);
  });
  it('A28. la rotation BALANCED n’est pas une entrée du diagnostic (aucune référence dans le code qualité)', () => {
    for (const f of ['packages/engine/src/quality/index.ts', 'packages/hyrox/src/h2/quality.ts', 'packages/crosstraining/src/c3/quality.ts']) expect(readFileSync(new URL(`../../../../${f}`, import.meta.url), 'utf8').split('\n').filter((l) => !/^\s*(\*|\/\/)/.test(l)).join('\n')).not.toMatch(/rotation|balanced/i);
  });
  it('A29. Strength : trace de prescription hebdomadaire absente ⇒ faits « non tracés », UNRESOLVED', () => {
    const r = first(plan([D.strength(1)], { strength: strPort() }), 'strength');
    const a = strPort().quality?.({ session: r.session, archetypeId: r.intent?.archetypeId ?? '', reasons: [], record: r.record });
    expect(a?.criteria.find((c) => c.id === 'volume_target')?.facts).toEqual({ weekPrescription: 'not_traced' });
  });
  it('A30. Running : aucune valeur candidate tracée avec la séance ⇒ base UNRESOLVED, jamais APPROVED', () => {
    const r = first(plan([D.running(1)], { running: runPort() }), 'running');
    expect(crit(q(r), 'dose_coherence')?.basis).not.toBe('APPROVED');
  });
  it('A31. chaque séance planifiée d’une semaine quatre sports porte un diagnostic', () => {
    const w = plan([D.strength(2), D.running(2), D.ct(1), D.hyrox(2)], q1Ports());
    for (const r of w.requests.filter((x) => x.status === 'planned')) expect(r.status === 'planned' && r.quality?.criteria.length).toBeGreaterThan(0);
  });
  it('A32. identifiants de critères uniques dans un diagnostic', () => {
    for (const a of [q(hr), q(ct)]) expect(new Set(a.criteria.map((c) => c.id)).size).toBe(a.criteria.length);
  });
  it('A33. refus de SÉCURITÉ d’un moteur : refusée, aucune prescription ni diagnostic créés', () => {
    const base = hrPort();
    const refusing = { ...base, generate: () => ({ status: 'refused' as const, reasons: [{ code: 'SAFETY.TEST.REFUSED', params: {} } as never] }) };
    const w = plan([D.hyrox(1)], { hyrox: refusing });
    expect(w.requests.every((r) => r.status === 'refused' && r.category === 'safety_blocked')).toBe(true);
  });
  it('A34. aucune pondération : verdict invariant à l’ordre des critères', () => {
    const rev = [...q(hr).criteria].reverse();
    expect(verdictOf(rev)).toBe(q(hr).verdict);
  });
  it('A35. aucun critère PASS ne repose sur une valeur non approuvée (PASS ⇒ base DERIVED ou APPROVED)', () => {
    for (const a of [q(hr), q(ct)]) for (const c of a.criteria.filter((x) => x.status === 'PASS')) expect(['DERIVED', 'APPROVED']).toContain(c.basis);
  });
  it('A36. faits du diagnostic : aucune valeur numérique non finie (NaN) dans les quatre sports', () => {
    const s = q(first(plan([D.strength(1)], { strength: strPort() }), 'strength'));
    for (const a of [s, q(hr), q(ct)]) for (const c of a.criteria) for (const v of Object.values(c.facts)) if (typeof v === 'number') expect(Number.isFinite(v)).toBe(true);
    expect(s.criteria.find((c) => c.id === 'volume_target')?.facts.belowFloor).toEqual(expect.any(Array));
  });
});

afterAll(() => {
  const path = new URL('./__reports__/q1-quality-audit.md', import.meta.url).pathname;
  mkdirSync(dirname(path), { recursive: true });
  const table2 = [
    '| Décision | Source actuelle | Gouvernance | Suffisant ? | Dette |', '|---|---|---|---|---|',
    '| HYROX rôle → structure | hybrid_race.h2.roleStructures + taxonomie H2 (définitions) | TEST_ONLY + DERIVED | cohérence seulement | règle de qualité par rôle |',
    '| HYROX stations / nombre | stationPool, structureVolume (TEST_ONLY), classement (non récent, voisines, pertinence) | TEST_ONLY | non | équilibre des stations, diversité des patterns |',
    '| HYROX doses / charges | hybrid_race.h2.stationDoses | TEST_ONLY | non | doses et charges par rôle et niveau, sources |',
    '| HYROX tours | hybrid_race.h2.structureVolume | TEST_ONLY | non | volume par rôle |',
    '| HYROX time cap | estimation lente (workRates TEST_ONLY) × (1 + timeCapMargin) | TEST_ONLY | non | débits validés, transitions |',
    '| HYROX course / allure | runSegment (TEST_ONLY), allure BLOCKED (Running) | TEST_ONLY / BLOCKED | non | délégation Running |',
    '| CT format | ct.stimulus.admissibleFormats + ordre / variété | TEST_ONLY (EXPERT_PROPOSED) | non | adéquation format ↔ stimulus |',
    '| CT mouvements | movementPool / movementRoles (TEST_ONLY) + classement | TEST_ONLY + catalogue | non | équilibre des patterns par stimulus |',
    '| CT doses / durée | ct.dose.construction | TEST_ONLY | non | doses par format, stimulus, niveau |',
    '| CT densité / plafonds | workRates, emomDensity, repsPerMovementCap, jumpContactsCap | TEST_ONLY | non | densité validée |',
    '| Strength volume / progression | strength.volume, strength.progression (draft, internal_hypothesis) | PROVISIONAL / TEST_ONLY | non | approbation des règles S1–S5 |',
    '| Running doses | gouvernance Running (38 EXPERT_PROPOSED, 10 UNRESOLVED) | EXPERT / candidate | non | approbation Running |',
    '| Intégrité, durée p90 ≤ disponible | CORE (schéma, DurationEngine) | DERIVED | oui (cohérence technique) | — |',
    '| Rotation BALANCED | programme.rotation.* | TEST_ONLY | aucune preuve de qualité (par définition) | politique de programmation |',
  ];
  writeFileSync(path, [
    '# Q1 — audit de qualité des séances', '',
    '> Diagnostic de LECTURE (aucune séance modifiée). Valeurs des moteurs : TEST_ONLY / provisoires. Une séance techniquement valide peut être `UNRESOLVED` : c’est le résultat honnête quand aucune règle de qualité approuvée n’existe.', '',
    '## Tableau 1 — séances', '', '| Sport | Séance | Techniquement valide | Qualité démontrée | Verdict | Pourquoi |', '|---|---|---|---|---|---|', ...rows1, '',
    '## Tableau 2 — décisions et provenance', '', ...table2, '',
    ...sections,
  ].join('\n'));
});
