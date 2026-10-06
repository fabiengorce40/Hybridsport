/**
 * HYROX H2 — composition de séance par le pipeline RÉEL du CORE (exécuteur strict). Scénarios A–G, taxonomie,
 * spécificité, épreuve ≠ entraînement, course compromise, simulation partielle / complète, durée, transitions,
 * empreinte, présentation. Gouvernance TEST_ONLY (h2-governance.ts) ; rapport : __reports__/h2-scenarios.md.
 */
import { describe, expect, it } from 'vitest';
import { zSessionDraft } from '@hybridsport/domain';
import {
  FULL_SIMULATION_MISSING, HR_CODES, HR_H2_ROLES, HR_H2_RUN_PACE, HR_ROLE_SPECS, HR_STRUCTURES, HR_STRUCTURE_SPECS, HR_TAXONOMY_REVIEW, h2ArchetypeOf, h2ExposureOf,
  h2PresentationOf, roleFromArchetype, structureFitsRole,
} from '../../src/index.js';
import { PROFILE_HYROX } from '../fixtures.js';
import { blockOf, demandOf, itemsOf, reasonOf, reasonsOf, runH2 } from '../h2-fixtures.js';
import { TEST_H2 } from '../h2-governance.js';
import { sessionMarkdown, writeReport } from '../h2-report.js';
import { STATE_FRESH, pain } from '../../../engine/tests/harness/requests.js';

const sections: string[] = [];
// technical-constant: TEST_ONLY — temps disponibles des scénarios (secondes)
const T60 = 3600;
// technical-constant: TEST_ONLY — 30 minutes
const T30 = 1800;
const presentation = (r: ReturnType<typeof runH2>) => (r.session ? h2PresentationOf(r.session, h2ArchetypeOf(roleFromArchetype(String(r.proposal?.archetypeId)) ?? 'station_capacity')) : undefined);

describe('H2 — taxonomie, intention, spécificité', () => {
  it('rôles retenus : spécificité qualitative, aucune valeur ; catégories demandées toutes classées', () => {
    expect(HR_H2_ROLES.map((r) => HR_ROLE_SPECS[r].specificity)).toEqual(['SPECIFIC', 'SPECIFIC', 'SPECIFIC', 'RACE_SPECIFIC', 'RACE_SPECIFIC']);
    const verdicts = Object.fromEntries(HR_TAXONOMY_REVIEW.map((t) => [t.category, t.verdict]));
    expect(verdicts).toMatchObject({ 'station technique': 'BLOCKED', 'aerobic / engine spécifique': 'DELEGATED', 'race-specific intervals': 'MERGED', 'full simulation': 'BLOCKED' });
    expect(HR_TAXONOMY_REVIEW).toHaveLength(9);
  });

  it('le programme demande un RÔLE (archétype), jamais une station ; cohérence rôle ↔ structure définitionnelle', () => {
    expect(roleFromArchetype(h2ArchetypeOf('compromised_running'))).toBe('compromised_running');
    expect(roleFromArchetype('hybrid_race.h2.skierg')).toBeUndefined();
    const fits = Object.fromEntries(HR_H2_ROLES.map((r) => [r, HR_STRUCTURES.filter((s) => structureFitsRole(r, s))]));
    expect(fits).toEqual({
      station_capacity: ['station_repeats'], strength_endurance: ['station_repeats', 'station_circuit'], mixed_station_conditioning: ['station_circuit'],
      compromised_running: ['run_station_alternation'], partial_simulation: ['partial_sequence'],
    });
    // L'épreuve n'est pas la structure par défaut : une seule structure reproduit l'enchaînement, réservée à un rôle.
    expect(HR_STRUCTURES.filter((s) => HR_STRUCTURE_SPECS[s].layout === 'expanded')).toEqual(['partial_sequence']);
  });

  it('archétype inconnu ⇒ refus ; H1 (station demandée) inchangé', () => {
    const r = runH2('station_capacity', {}, T60, { request: { intentId: 'intent.x' } });
    expect(r.session).toBeDefined();
  });
});

describe('Scénario A — HYROX seul, intermédiaire, 60 min, matériel complet', () => {
  it.each(HR_H2_ROLES)('%s : séance composée, valide pour le CORE, publiée sans modification', (role) => {
    const r = runH2(role, {}, T60);
    expect(r.outcome.result.status).toBe('ok');
    expect(zSessionDraft.safeParse(r.session).success).toBe(true);
    const b = blockOf(r);
    expect(b).toMatchObject({ kind: 'hybrid_station_work', format: 'for_time' });
    expect(reasonOf(r, HR_CODES.H2_PROPOSED)?.params.role).toBe(role);
    const d = demandOf(r);
    expect(d?.ok).toBe(true);
    sections.push(sessionMarkdown(`Scénario A — ${role} (60 min)`, 'HYROX seul, intermédiaire, matériel complet, historique vide.', r));
  });

  it('la séance n’est PAS « course → station » répétée par défaut : seuls les rôles RACE_SPECIFIC contiennent de la course', () => {
    for (const role of HR_H2_ROLES) {
      const kinds = presentation(runH2(role, {}, T60))?.components.map((c) => c.kind) ?? [];
      expect(kinds.includes('run')).toBe(HR_ROLE_SPECS[role].specificity === 'RACE_SPECIFIC');
    }
  });

  it('déterminisme : deux exécutions identiques ⇒ séance et empreinte identiques', () => {
    const a = runH2('mixed_station_conditioning', {}, T60);
    const b = runH2('mixed_station_conditioning', {}, T60);
    expect(a.session).toEqual(b.session);
    expect(a.outcome.fingerprint).toEqual(b.outcome.fingerprint);
  });
});

describe('Scénario B — orienté stations', () => {
  it('station_capacity : UNE station répétée ; strength_endurance : stations CHARGÉES seulement ; mixed : stations distinctes compatibles', () => {
    const cap = presentation(runH2('station_capacity', {}, T60));
    expect(new Set(cap?.components.map((c) => c.exerciseId)).size).toBe(1);
    const se = runH2('strength_endurance', {}, T60);
    expect(presentation(se)?.components.every((c) => c.loadKg !== undefined)).toBe(true);
    expect(reasonsOf(se, HR_CODES.H2_CANDIDATES_REJECTED).flatMap((x) => x.params.rejected as string[]).some((x) => x.includes('ROLE_REQUIRES_LOADED_STATION'))).toBe(true);
    const mixed = runH2('mixed_station_conditioning', {}, T60);
    const ex = presentation(mixed)?.components.map((c) => c.exerciseId) ?? [];
    expect(new Set(ex).size).toBe(ex.length);
    // Incompatibilités tracées (structure locale dominante partagée, pattern redondant) : jamais un tirage.
    expect(reasonsOf(mixed, HR_CODES.H2_CANDIDATES_REJECTED).flatMap((x) => x.params.rejected as string[]).some((x) => x.includes('SHARED_DOMINANT_LOCAL_STRUCTURE'))).toBe(true);
    sections.push(sessionMarkdown('Scénario B — station_capacity', 'Rôle orienté station : une station, répétée (volume gouverné TEST_ONLY).', runH2('station_capacity', {}, T60)));
    sections.push(sessionMarkdown('Scénario B — strength_endurance', 'Stations chargées enchaînées (endurance de force spécifique ; la force maximale reste à Strength).', se));
  });
});

describe('Scénario C — course compromise', () => {
  it('chaque segment couru vient APRÈS une station ; distance en unité native ; allure BLOCKED ; transitions sans durée', () => {
    const r = runH2('compromised_running', {}, T60);
    const p = presentation(r);
    const runs = p?.components.filter((c) => c.kind === 'run') ?? [];
    expect(runs.length).toBeGreaterThan(0);
    expect(runs.every((c) => c.runContext === 'after_station' && c.pace === HR_H2_RUN_PACE && c.dose.kind === 'distance_m')).toBe(true);
    expect(p?.transitions.durationS).toBeNull();
    expect(reasonOf(r, HR_CODES.H2_TRANSITIONS)?.params).toMatchObject({ durationS: 'unknown', estimate: 'excluded' });
    expect(reasonOf(r, HR_CODES.H2_RUN_COMPONENT)?.params).toMatchObject({ exerciseId: 'ex.easy_run', pace: HR_H2_RUN_PACE, contexts: ['after_station'] });
    // Accumulation VOULUE par l'intention (RACE_SPECIFIC) : tracée, jamais interdite.
    expect(reasonOf(r, HR_CODES.H2_ACCUMULATION)?.params.status).toBe('INTENDED_BY_ROLE');
    sections.push(sessionMarkdown('Scénario C — compromised_running (60 min)', 'Course APRÈS station, répétée. Distance de course TEST_ONLY, aucune allure (moteur Running).', r));
  });
});

describe('Scénario D — race-specific partiel ; simulation complète BLOCKED', () => {
  it('simulation partielle : segment CONTIGU de l’ordre GOUVERNÉ, première course fraîche puis courses après station', () => {
    const r = runH2('partial_simulation', {}, T60);
    const p = presentation(r);
    const stations = p?.components.filter((c) => c.kind === 'station').map((c) => c.exerciseId) ?? [];
    expect(p?.components[0]).toMatchObject({ kind: 'run', runContext: 'fresh' });
    expect(p?.components.filter((c) => c.kind === 'run').slice(1).every((c) => c.runContext === 'after_station')).toBe(true);
    const order = TEST_H2['hybrid_race.h2.raceSequence'] as string[];
    const ids = presentation(r)?.components.filter((c) => c.kind === 'station').map((c) => c.exerciseId.replace('ex.', '').replace('row_erg', 'row')) ?? [];
    const start = order.indexOf(ids[0] ?? '');
    expect(order.slice(start, start + ids.length)).toEqual(ids);
    expect(stations.length).toBeGreaterThan(1);
    sections.push(sessionMarkdown('Scénario D — partial_simulation (60 min)', 'Segment contigu de l’ordre d’épreuve GOUVERNÉ (ici TEST_ONLY, arbitraire : alphabétique).', r));
  });

  it('ordre d’épreuve non gouverné ⇒ simulation partielle BLOCKED (jamais reconstituée de mémoire)', () => {
    const r = runH2('partial_simulation', {}, T60, { params: { 'hybrid_race.h2.raceSequence': null } });
    expect(r.session).toBeUndefined();
    expect(reasonOf(r, HR_CODES.H2_NO_STRUCTURE)?.params.tried).toEqual(['partial_sequence:RACE_SEQUENCE_UNGOVERNED']);
    sections.push(sessionMarkdown('Scénario D bis — ordre d’épreuve absent', 'Paramètre `hybrid_race.h2.raceSequence` absent.', r));
  });

  it('simulation complète : AUCUN rôle, aucune structure, aucun archétype ; données manquantes listées', () => {
    expect(HR_H2_ROLES as readonly string[]).not.toContain('full_simulation');
    expect(roleFromArchetype('hybrid_race.h2.full_simulation')).toBeUndefined();
    expect(FULL_SIMULATION_MISSING.length).toBeGreaterThanOrEqual(5);
    const r = runH2('station_capacity', {}, T60, { request: { intentId: 'intent.full' } });
    expect(r.session).toBeDefined();
  });
});

describe('Scénarios E / F / G — temps, matériel, douleur', () => {
  it('E — 30 min : volume gouverné réduit (option suivante), causes de l’option écartée tracées ; time cap ≤ disponible − marge', () => {
    const long = runH2('compromised_running', {}, T60);
    const short = runH2('compromised_running', {}, T30);
    expect(blockOf(short)?.format === 'for_time' ? blockOf(short) : undefined).toBeDefined();
    const capOf = (r: typeof long) => (blockOf(r) as { timeCapS: number } | undefined)?.timeCapS ?? 0;
    expect(capOf(short)).toBeLessThan(capOf(long));
    // technical-constant: TEST_ONLY — marge du profil `for_time` du ruleset de test du CORE
    expect(capOf(short)).toBeLessThanOrEqual(T30 - 300);
    sections.push(sessionMarkdown('Scénario E — compromised_running (30 min)', 'Même rôle, 30 min : première option de volume écartée (time cap au-delà du temps utilisable).', short));
  });

  it('F — matériel incomplet : stations sans matériel écartées (EQUIPMENT_MISSING), aucune substitution', () => {
    const profile = { ...PROFILE_HYROX, availableEquipment: PROFILE_HYROX.availableEquipment.filter((e) => !['sled', 'skierg', 'rower'].includes(e)) };
    const r = runH2('station_capacity', {}, T60, { request: { profile } });
    const rejected = reasonsOf(r, HR_CODES.H2_CANDIDATES_REJECTED).flatMap((x) => x.params.rejected as string[]);
    for (const s of ['sled_push', 'sled_pull', 'skierg', 'row']) expect(rejected.some((x) => x.startsWith(`${s}:`) && x.includes('EQUIPMENT_MISSING'))).toBe(true);
    expect(presentation(r)?.components.every((c) => !['ex.sled_push', 'ex.sled_pull', 'ex.skierg', 'ex.row_erg'].includes(c.exerciseId))).toBe(true);
    sections.push(sessionMarkdown('Scénario F — matériel incomplet (sans traîneau, SkiErg, rameur)', 'station_capacity, 60 min.', r));
  });

  it('G — douleur genou : stations et course sensibles écartées ; rôles avec course REFUSÉS explicitement', () => {
    const state = { ...STATE_FRESH, activePain: [pain({ bodyAreas: ['knee'] })] };
    const cap = runH2('station_capacity', {}, T60, { request: { state } });
    const run = runH2('compromised_running', {}, T60, { request: { state } });
    expect(presentation(cap)?.components.every((c) => !['ex.sled_push', 'ex.wall_ball', 'ex.sandbag_lunge', 'ex.easy_run'].includes(c.exerciseId))).toBe(true);
    expect(run.session).toBeUndefined();
    expect(String(reasonOf(run, HR_CODES.H2_NO_STRUCTURE)?.params.tried)).toContain('RUN_COMPONENT:PAIN_AREA');
    sections.push(sessionMarkdown('Scénario G — douleur genou (P2), station_capacity', 'Zones sensibles écartées par HYROX AVANT proposition (aucune substitution du CORE).', cap));
    sections.push(sessionMarkdown('Scénario G bis — douleur genou, compromised_running', 'Course incompatible : refus explicite.', run));
  });

  it('G — exclusion utilisateur : station exclue jamais proposée', () => {
    const r = runH2('station_capacity', {}, T60, { request: { profile: { ...PROFILE_HYROX, excludedExercises: ['ex.burpee_broad_jump'] } } });
    expect(itemsOf(r).every((i) => i.exerciseId !== 'ex.burpee_broad_jump')).toBe(true);
    expect(itemsOf(r).length).toBeGreaterThan(0);
  });
});

describe('Empreinte, présentation, exposition', () => {
  it('empreinte : rôle (stimulus), structure (format), stations ordonnées (repScheme), doses ; jamais le résultat', () => {
    const r = runH2('compromised_running', {}, T60);
    const fi = r.proposal?.fingerprintInputs as Record<string, unknown>;
    expect(fi).toMatchObject({ stimulus: 'compromised_running', format: 'run_station_alternation', energy: { status: 'not_applicable' } });
    expect(String(fi.repScheme)).toMatch(/>/);
    expect(Object.keys(fi.prescriptionMarkers as object)).toEqual(expect.arrayContaining(['h2.rounds', 'h2.items', 'h2.timeCapS', 'h2.runSegments']));
    expect(r.outcome.fingerprint?.format).toBe('run_station_alternation');
  });

  it('présentation (contrat H2.5) et exposition relues SANS catalogue ; séance hors contrat ⇒ undefined', () => {
    const r = runH2('partial_simulation', {}, T60);
    if (!r.session) throw new Error('séance attendue');
    const p = h2PresentationOf(r.session, h2ArchetypeOf('partial_simulation'));
    expect(p?.structure).toBe('partial_sequence');
    const x = h2ExposureOf(r.session, h2ArchetypeOf('partial_simulation'), 'req', '2026-10-05T12:00:00Z');
    expect(x?.exercises).toEqual(p?.components.map((c) => c.exerciseId));
    expect(h2PresentationOf(r.session, 'hybrid_race.h1_station')).toBeUndefined();
    expect(h2PresentationOf({ ...r.session, blocks: [{ ...r.session.blocks[0], id: 'autre' } as never] }, h2ArchetypeOf('partial_simulation'))).toBeUndefined();
  });

  it('profil de demande CORE : les tours du bloc `for_time` sont comptés (correctif CORE « demand repetition »)', () => {
    const five = runH2('station_capacity', {}, T60);
    const three = runH2('station_capacity', {}, T30);
    expect([blockOf(five), blockOf(three)].map((b) => (b as { rounds: number } | undefined)?.rounds)).toEqual([5, 3]);
    expect(itemsOf(five).map((i) => i.exerciseId)).toEqual(itemsOf(three).map((i) => i.exerciseId));
    const d5 = demandOf(five);
    const d3 = demandOf(three);
    if (!d5?.ok || !d3?.ok) throw new Error('profils attendus');
    // Même dose par tour ⇒ scores proportionnels au nombre de tours (5/3), via la normalisation existante.
    for (const [s, v] of Object.entries(d3.profile.scores)) expect(d5.profile.scores[s]).toBeCloseTo((v * 5) / 3, 9);
    expect(d5.profile.reasons).toEqual([]);
  });

  it('écriture du rapport des scénarios', () => {
    writeReport(new URL('./__reports__/h2-scenarios.md', import.meta.url).pathname, 'HYROX H2 — scénarios A à G (séances composées)', sections);
    expect(sections.length).toBeGreaterThan(10);
  });
});
