/**
 * C4.3 — rapport COMPARATIF C4.2 → C4.3 (chemin app-core réel, Beta 0 TEST_ONLY) et AUDIT de séances concrètes.
 * Référence C4.2 figée AVANT les changements C4.3 (`__reports__/c42-baseline.json`, même matrice). L'intention
 * « force + conditionnement » n'était pas proposée en C4.2 (refus `CT_INTENT_UNKNOWN`, mesuré sur le commit C4.2).
 * Rapport : __reports__/c43-comparison.md. Garde-fous vérifiés : avancé jamais débloqué, aucune séance complète perdue,
 * matériel déclaré respecté, aucun exercice du bloc de force répété dans le conditionnement, ordre des blocs.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { CT_INTENT_LABELS, ctWorkoutOf, ensureBeta0Week, EQUIPMENT_PRESETS, finishProgrammeSession, recordProgrammeSet, selectProgrammeSession } from '../../src/index.js';
import type { AppState, ProfileInput } from '../../src/index.js';
import { strengthCatalogDocument } from '../../../strength/tests/fixtures/catalog.js';
import { at, create, ctSessions, decisions, fullGym, profile, request, startCt, week } from './ct-fixtures.js';
import { EQUIPMENTS, matrix, measure, MINUTES } from './c42-metrics.js';
import type { Cell, Matrix } from './c42-metrics.js';

const SC = 'crosstraining.strength_plus_conditioning';
const before = JSON.parse(readFileSync(new URL('./__reports__/c42-baseline.json', import.meta.url), 'utf8')) as Matrix;
const preset = (id: string) => EQUIPMENT_PRESETS.find((p) => p.id === id)?.equipment ?? [];
const fmt = (o: Readonly<Record<string, number>>) => Object.entries(o).sort().map(([k, v]) => `${k} ${String(v)}`).join(' · ') || '—';
const min = (s: number | null | undefined) => (s === null || s === undefined ? '—' : (s / 60).toFixed(1));
const sum = (m: Matrix, f: (k: string) => boolean, field: 'status' | 'formats') => {
  const out: Record<string, number> = {};
  for (const [k, c] of Object.entries(m)) if (f(k)) for (const [s, n] of Object.entries(c[field] ?? {})) out[s] = (out[s] ?? 0) + n;
  return out;
};
const cat = new Map(strengthCatalogDocument().exercises.map((e) => [e.id, e.equipment]));
const feasible = (id: string, eq: readonly string[]) => { const r = cat.get(id); return r === undefined || (r.allOf.every((x) => eq.includes(x)) && (r.anyOf.length === 0 || r.anyOf.some((x) => eq.includes(x)))); };
const short = (id: string) => id.replace(/^ex\./, '');

type Block = NonNullable<ReturnType<typeof selectProgrammeSession>>['session']['blocks'][number];
type Item = Block['items'][number];
function dose(it: Item): string {
  const p = it.prescription;
  if (p.type === 'timed') return (p.rounds ?? 1) > 1 ? `${String(p.rounds)}×${String(p.workS)} s` : `${String(p.workS)} s`;
  if (p.type === 'mobility') return `${String(p.seconds * (p.sides ?? 1))} s`;
  if (p.type === 'sets') return p.sets.map((x) => (typeof x.reps === 'number' ? String(x.reps) : `${String(x.reps.min)}-${String(x.reps.max)}`)).join('/');
  return p.type;
}
function strengthText(b: Block): string {
  return b.items.map((it) => {
    if (it.prescription.type !== 'sets') return short(it.exerciseId);
    const ss = it.prescription.sets;
    const ramp = ss.filter((x) => x.kind === 'rampup').length;
    const work = ss.filter((x) => x.kind !== 'rampup');
    const w = work[0];
    const eff = w?.intensity && 'effort' in w.intensity ? w.intensity.effort : undefined;
    const rir = eff && 'rir' in eff ? `RIR ${String(eff.rir)}` : eff && 'rpe' in eff ? `RPE ${String(eff.rpe)}` : '';
    return `${short(it.exerciseId)} : ${String(ramp)} montées + ${String(work.length)}×${w ? (typeof w.reps === 'number' ? String(w.reps) : `${String(w.reps.min)}-${String(w.reps.max)}`) : '?'} ${rir}, repos ${String(w?.restAfterS ?? 0)} s`;
  }).join(' ; ');
}

interface Audit { readonly label: string; readonly s: AppState; readonly id: string; readonly eq: readonly string[]; readonly availableS: number }
interface Row { readonly cells: readonly string[]; readonly flags: readonly string[]; readonly mains: readonly string[]; readonly strength: readonly string[] }

function auditRow(a: Audit, prev: Row | undefined): Row {
  const x = week(a.s, `${(selectProgrammeSession(a.s, a.id)?.date ?? '2026-10-05')}T07:30:00.000Z`)?.sessions.find((y) => y.requestId === a.id);
  const v = selectProgrammeSession(a.s, a.id);
  const intent = CT_INTENT_LABELS[x?.archetypeId ?? '']?.title ?? x?.archetypeId ?? '—';
  const reasons = request(a.s, a.id)?.reasons ?? [];
  if (!v || x?.placement !== 'planned') {
    const unresolved = decisions(a.s, a.id, 'STRENGTH_DELEGATION_UNRESOLVED')[0];
    const host = reasons.filter((r) => /C3_(NO_FORMAT|FORMAT_REJECTED)|C4_SESSION_STATUS/.test(r.code)).map((r) => String(r.params.cause ?? r.params.reason ?? '')).filter((c) => c !== '' && c !== 'undefined');
    const cause = [unresolved ? `délégation non résolue : ${String(unresolved.cause)}` : '', ...new Set(host)].filter(Boolean).slice(0, 3).join(' ; ') || String(x?.unplacedCause ?? 'refus');
    return { cells: [a.label, intent, '—', '—', '—', '—', '—', '—', '—', cause, x?.placement === 'composed_unplaced' ? 'NON PLACÉE' : 'REFUSÉE'], flags: [], mains: [], strength: [] };
  }
  const blocks = v.session.blocks;
  const st = blocks.find((b) => b.kind === 'strength');
  const cond = blocks.find((b) => b.kind === 'conditioning');
  const w = ctWorkoutOf(v.session);
  const wu = blocks.filter((b) => b.kind === 'warmup').map((b) => `${b.id.split('.c4.')[1] ?? b.kind} : ${b.items.map((i) => `${short(i.exerciseId)} ${dose(i)}`).join(', ')}`).join(' → ');
  const cd = blocks.filter((b) => b.kind === 'cooldown').flatMap((b) => b.items.map((i) => `${short(i.exerciseId)} ${dose(i)}`)).join(', ');
  const wod = w ? `${w.format} · ${w.items.map((i) => `${short(i.exerciseId)} ${String(i.quantity.value)}${i.quantity.kind === 'reps' ? '' : i.quantity.kind === 'calories' ? ' cal' : i.quantity.kind === 'distance_m' ? ' m' : ' s'}${i.loadKg !== undefined ? ` @${String(i.loadKg)} kg` : ''}`).join(', ')}` : '—';
  const c4 = x.composition?.c4;
  const est = x.estimatedDurationS;
  const del = decisions(a.s, a.id, 'STRENGTH_DELEGATED')[0];
  const fmtChosen = decisions(a.s, a.id, 'C3_FORMAT_CHOSEN')[0];
  const load = st
    ? `force ${String(st.items.reduce((n, it) => n + (it.prescription.type === 'sets' ? it.prescription.sets.filter((s) => s.kind !== 'rampup').length : 0), 0))} séries de travail ; structures protégées : ${String((del?.protectedStructures as string[] | undefined)?.join('+') || 'aucune')}`
    : 'pas de bloc de force';
  const why = [fmtChosen ? `format ${String(fmtChosen.format)} (${(fmtChosen.criteria as string[] | undefined)?.slice(0, 2).join(', ') ?? ''})` : '', del ? `force déléguée : ${String(del.archetypeId)} / règle ${String(del.ruleId)}` : ''].filter(Boolean).join(' ; ');
  const mains = [w?.format ?? '', ...(cond?.items.map((i) => i.exerciseId) ?? [])];
  const strength = st?.items.map((i) => i.exerciseId) ?? [];
  const flags: string[] = [];
  if (est !== null && est < 2700) flags.push('courte (< 45 min estimées)');
  if (est !== null && est > a.availableS) flags.push('INCOHÉRENTE : dépasse le temps disponible');
  if (strength.some((e) => mains.slice(1).includes(e))) flags.push('INCOHÉRENTE : exercice de force répété dans le WOD');
  if ([...strength, ...mains.slice(1)].some((e) => !feasible(e, a.eq))) flags.push('INCOHÉRENTE : matériel non déclaré');
  const ix = (k: string) => blocks.findIndex((b) => b.kind === k);
  if (st && ix('strength') > ix('conditioning')) flags.push('INCOHÉRENTE : force après le WOD');
  const specIx = blocks.findIndex((b) => b.id.endsWith('.c4.warmup_specific') || b.id.endsWith('.c4.warmup_buildups'));
  if (st && specIx >= 0 && specIx < ix('strength')) flags.push('INCOHÉRENTE : échauffement spécifique du WOD avant la force');
  if (prev && prev.mains.length > 0 && prev.mains.join() === mains.join()) flags.push('répétitive (même format et mêmes mouvements que la précédente)');
  if (prev && strength.length > 0 && prev.strength.join() === strength.join()) flags.push('force identique à la précédente');
  return {
    cells: [a.label, intent, wu || '—', st ? strengthText(st) : '—', wod, cd || '—', `${min(est)} min estimées (${min(c4?.plannedDurationS)} planifiées) / ${(a.availableS / 60).toFixed(0)} dispo`, load, why || '—', '', c4?.status ?? '—'],
    flags, mains, strength,
  };
}

/** Termine les séances CT d'une semaine (séries du bloc validées, résultat « adapté ») : historique réaliste. */
function completeWeek(s0: AppState, mon: string): AppState {
  let s = s0;
  for (const x of ctSessions(s, `${mon}T07:30:00.000Z`).filter((y) => y.placement === 'planned')) {
    const t = (h: string) => `${x.date}T${h}:00.000Z`;
    s = startCt(s, at(t('07:00')), x.requestId);
    for (const b of selectProgrammeSession(s, x.requestId)?.session.blocks.filter((y) => y.kind === 'strength') ?? []) {
      for (const it of b.items) if (it.prescription.type === 'sets') it.prescription.sets.forEach((p, i) => { s = recordProgrammeSet(s, at(t('07:20')), x.requestId, { itemId: it.id, setIndex: i, done: true, reps: typeof p.reps === 'number' ? p.reps : p.reps.min, loadKg: 40 }); });
    }
    const f = selectProgrammeSession(s, x.requestId)?.session.blocks.find((y) => y.kind === 'conditioning')?.format;
    const result = f === 'amrap' ? { kind: 'rounds_reps', rounds: 3, reps: 0 } : f === 'emom' ? { kind: 'emom', minutesCompleted: 1 } : f === 'for_time' ? { kind: 'capped_rounds', roundsCompleted: 1, partialReps: 0 } : { kind: 'total', durationS: 300 };
    s = finishProgrammeSession(s, at(t('08:00')), { requestId: x.requestId, completion: 'modified', pain: false, ct: { result } });
  }
  return s;
}

describe('C4.3 — rapport comparatif et audit', () => {
  it('matrice C4.2 → C4.3, force + conditionnement, variété, 12+ séances auditées ; garde-fous', () => {
    const after = matrix();
    const scM = matrix([SC]);
    const lines: string[] = ['# C4.3 — comparaison C4.2 → C4.3 (Beta 0, gouvernance TEST_ONLY)', '',
      '> Chemin app-core réel, matrice identique à C4.2 (intention × niveau × matériel ; chaque cellule cumule 45 / 60 / 75 min, 3 séances, semaine 1). Référence C4.2 figée avant les changements (`c42-baseline.json`). Durées en minutes, estimation du CORE. Aucune valeur n’est validée scientifiquement.', ''];

    lines.push('## Synthèse des statuts (5 intentions C4.2)', '', '| Périmètre | C4.2 | C4.3 |', '|---|---|---|');
    for (const [label, f] of [['tout', () => true], ['avec ergomètre', (k: string) => k.endsWith('|full')], ['sans ergomètre', (k: string) => k.endsWith('|no_erg')], ['débutant', (k: string) => k.includes('|beginner|')], ['intermédiaire', (k: string) => k.includes('|intermediate|')], ['avancé', (k: string) => k.includes('|advanced|')]] as const) {
      lines.push(`| ${label} | ${fmt(sum(before, f, 'status'))} | ${fmt(sum(after, f, 'status'))} |`);
    }
    lines.push('', '## Formats du bloc principal (séances planifiées)', '', '| Périmètre | C4.2 | C4.3 |', '|---|---|---|');
    for (const [label, f] of [['avec ergomètre', (k: string) => k.endsWith('|full')], ['sans ergomètre', (k: string) => k.endsWith('|no_erg')]] as const) {
      lines.push(`| ${label} | ${fmt(sum(before, f, 'formats'))} | ${fmt(sum(after, f, 'formats'))} |`);
    }
    lines.push('', '## Détail par profil', '', '| Intention · niveau · matériel | Statuts C4.2 | Statuts C4.3 | Formats C4.2 | Formats C4.3 | Estimée C4.2 | Estimée C4.3 |', '|---|---|---|---|---|---|---|');
    for (const [k, a] of Object.entries(after)) {
      const b = before[k];
      lines.push(`| ${k.replaceAll('|', ' · ')} | ${fmt(b?.status ?? {})} | ${fmt(a.status)} | ${fmt(b?.formats ?? {})} | ${fmt(a.formats ?? {})} | ${min(b?.estimatedS)} | ${min(a.estimatedS)} |`);
    }
    lines.push('', '## Force + conditionnement (nouvelle en C4.3 ; C4.2 : intention non proposée, `CT_INTENT_UNKNOWN`)', '', '| Niveau · matériel | Statuts C4.3 | Formats | Estimée | Bloc de force (moy.) | Principal (moy.) |', '|---|---|---|---|---|---|');
    for (const [k, a] of Object.entries(scM)) lines.push(`| ${k.split('|').slice(1).join(' · ')} | ${fmt(a.status)} | ${fmt(a.formats ?? {})} | ${min(a.estimatedS)} | ${min(a.blocks.strength ?? null)} | ${min(a.blocks.main ?? null)} |`);
    const presetsRow: string[] = [];
    for (const p of EQUIPMENT_PRESETS) {
      const c: Cell = measure(MINUTES.map((m) => create(profile({ ct: { intent: SC }, equipment: p.equipment, availability: [m, 0, m, 0, m, 0, 0] }))));
      presetsRow.push(`| ${p.id} (intermédiaire) | ${fmt(c.status)} | ${fmt(c.formats ?? {})} | ${min(c.estimatedS)} |`);
    }
    lines.push('', '| Matériel déclaré (préréglage) | Statuts | Formats | Estimée |', '|---|---|---|---|', ...presetsRow, '');

    // Garde-fous de la matrice.
    for (const [k, a] of Object.entries({ ...after, ...scM })) {
      if (k.includes('|advanced|')) expect(a.status.FULL_SESSION ?? 0).toBe(0);
      if (k.endsWith('|no_erg')) expect([...a.warmupMovements, ...a.mobility].filter((x) => x === 'ex.row_erg' || x === 'ex.skierg')).toEqual([]);
      if (before[k]) expect(a.status.FULL_SESSION ?? 0).toBeGreaterThanOrEqual(before[k]?.status.FULL_SESSION ?? 0);
    }

    // ——— Variété sur 4 semaines (sans ergomètre)
    lines.push('## Variété sur 4 semaines (séances terminées « adaptées »)', '', '| Profil | Formats | WOD distincts / séances | Blocs de force (exercices) | Statuts |', '|---|---|---|---|---|');
    for (const [label, p] of [
      ['mixte intermédiaire sans ergomètre', profile({ equipment: EQUIPMENTS.no_erg })],
      ['mixte débutant sans ergomètre', profile({ equipment: EQUIPMENTS.no_erg, level: 'beginner' })],
      ['force + conditionnement, salle complète', profile({ ct: { intent: SC } })],
    ] as const) {
      let s = create(p);
      const formats = new Set<string>(); const wods = new Set<string>(); const strengths: string[] = []; const sts: Record<string, number> = {}; let n = 0;
      for (const [k, d] of ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'].entries()) {
        if (k > 0) s = ensureBeta0Week(s, at(`${d}T07:30:00.000Z`));
        for (const x of ctSessions(s, `${d}T07:30:00.000Z`)) {
          const key = x.composition?.c4?.status ?? x.placement; sts[key] = (sts[key] ?? 0) + 1;
          if (x.placement !== 'planned') continue;
          const v = selectProgrammeSession(s, x.requestId);
          const cond = v?.session.blocks.find((b) => b.kind === 'conditioning');
          if (cond) { formats.add(cond.format === 'continuous' && cond.items[0]?.prescription.type === 'timed' && cond.items[0].prescription.rounds > 1 ? 'intervals' : cond.format); wods.add(cond.items.map((i) => i.exerciseId).join('+')); n += 1; }
          const st = v?.session.blocks.find((b) => b.kind === 'strength');
          if (st) strengths.push(st.items.map((i) => short(i.exerciseId)).join('+'));
        }
        s = completeWeek(s, d);
      }
      lines.push(`| ${label} | ${[...formats].sort().join(', ') || '—'} | ${String(wods.size)} / ${String(n)} | ${strengths.join(', ') || '—'} | ${fmt(sts)} |`);
    }
    lines.push('');

    // ——— Audit de séances concrètes
    const audits: Audit[] = [];
    const add = (label: string, p: ProfileInput, weeks = 1) => {
      let s = create(p);
      const avail = (d: string) => (p.availability[(new Date(`${d}T00:00:00Z`).getUTCDay() + 6) % 7] ?? 0) * 60;
      const mons = ['2026-10-05', '2026-10-12', '2026-10-19'].slice(0, weeks);
      for (const [k, d] of mons.entries()) {
        if (k > 0) { s = completeWeek(s, mons[k - 1] ?? d); s = ensureBeta0Week(s, at(`${d}T07:30:00.000Z`)); }
        const snapshot = s;
        for (const x of ctSessions(s, `${d}T07:30:00.000Z`)) audits.push({ label: `${label} · S${String(k + 1)} ${x.date ?? ''}`, s: snapshot, id: x.requestId, eq: p.equipment.items, availableS: x.date ? avail(x.date) : 0 });
      }
    };
    add('A. force+cond. intermédiaire, salle complète, 60 min', profile({ ct: { intent: SC } , availability: [60, 0, 60, 0, 60, 0, 0] }), 2);
    add('B. force+cond. intermédiaire, maison équipée, 45 min', profile({ ct: { intent: SC }, equipment: preset('preset.home_equipped'), availability: [45, 0, 45, 0, 45, 0, 0] }));
    add('C. force+cond. intermédiaire, salle complète, 75 min + Musculation 2/sem.', profile({ ct: { intent: SC }, strength: true, availability: [75, 75, 75, 75, 75, 0, 0] }));
    add('D. force+cond. débutant, salle complète', profile({ ct: { intent: SC }, level: 'beginner', availability: [60, 0, 60, 0, 60, 0, 0] }));
    add('E. force+cond. poids du corps', profile({ ct: { intent: SC }, equipment: preset('preset.bodyweight'), availability: [60, 0, 60, 0, 60, 0, 0] }));
    add('F. mixte intermédiaire sans ergomètre, 60 min', profile({ equipment: EQUIPMENTS.no_erg, availability: [60, 0, 60, 0, 60, 0, 0] }));
    add('G. mixte débutant sans ergomètre, 45 min', profile({ equipment: EQUIPMENTS.no_erg, level: 'beginner', availability: [45, 0, 45, 0, 45, 0, 0] }));
    add('H. aérobie intermédiaire sans ergomètre, 75 min', profile({ ct: { intent: 'crosstraining.aerobic_capacity' }, equipment: EQUIPMENTS.no_erg, availability: [75, 0, 75, 0, 75, 0, 0] }));
    add('I. endurance musculaire intermédiaire, salle complète, 45 min', profile({ ct: { intent: 'crosstraining.muscular_endurance' }, availability: [45, 0, 45, 0, 45, 0, 0] }));
    add('J. seuil débutant sans ergomètre, 60 min', profile({ ct: { intent: 'crosstraining.threshold' }, equipment: EQUIPMENTS.no_erg, level: 'beginner', availability: [60, 0, 60, 0, 60, 0, 0] }));

    lines.push('## Audit de séances concrètes', '', '| Séance | Objectif | Échauffement | Bloc de force | WOD | Retour au calme | Durée CORE | Charge / interférence | Justification | Signalements | Statut |', '|---|---|---|---|---|---|---|---|---|---|---|');
    const rows: Row[] = [];
    let prevKey = ''; let prev: Row | undefined;
    for (const a of audits) {
      const key = a.label.split(' · ')[0] ?? '';
      const r = auditRow(a, key === prevKey ? prev : undefined);
      rows.push(r); prevKey = key; prev = r;
      const cells = [...r.cells]; cells[9] = r.flags.join(' ; ') || (cells[9] || 'aucun');
      lines.push(`| ${cells.map((c) => c.replaceAll('|', '/')).join(' | ')} |`);
    }
    const planned = rows.filter((r) => r.cells[10] !== 'REFUSÉE' && r.cells[10] !== 'NON PLACÉE');
    const flagged = (re: RegExp) => planned.filter((r) => r.flags.some((f) => re.test(f))).length;
    lines.push('', `Séances auditées : ${String(rows.length)} (dont ${String(planned.length)} planifiées, ${String(rows.length - planned.length)} refusées avec cause). Signalements : incohérentes ${String(flagged(/INCOHÉRENTE/))}, courtes ${String(flagged(/courte/))}, répétitives ${String(flagged(/répétitive/))}, force identique à la précédente ${String(flagged(/force identique/))}.`, '');

    expect(rows.length).toBeGreaterThanOrEqual(12);
    expect(planned.length).toBeGreaterThanOrEqual(12);
    expect(flagged(/INCOHÉRENTE/)).toBe(0);
    expect(planned.filter((r) => r.strength.length > 0).length).toBeGreaterThan(0);
    // Aucune séance planifiée pour un niveau avancé ; aucun bloc de force sans matériel à charge externe.
    expect(rows.filter((r) => r.cells[0]?.startsWith('E.') && r.strength.length > 0)).toEqual([]);
    expect(fullGym.length).toBeGreaterThan(0);

    // ——— Cohérence multisport : semaine avec Musculation 2/sem. + force + conditionnement 3/sem.
    const ms = create(profile({ ct: { intent: SC }, strength: true, availability: [75, 75, 75, 75, 75, 0, 0] }));
    lines.push('## Cohérence multisport (Musculation 2/sem. + force + conditionnement 3/sem., semaine 1)', '', '| Date | Sport | Exercices de force (séance Musculation ou bloc délégué) | Séries de travail | Conditionnement |', '|---|---|---|---|---|');
    const msRows = (week(ms)?.sessions ?? []).slice().sort((p, q) => (p.date ?? '').localeCompare(q.date ?? ''));
    for (const x of msRows) {
      const v = selectProgrammeSession(ms, x.requestId);
      const strengthItems = (v?.session.blocks ?? []).filter((b) => b.kind === 'strength' || b.kind === 'accessory').flatMap((b) => b.items);
      const work = strengthItems.reduce((n, it) => n + (it.prescription.type === 'sets' ? it.prescription.sets.filter((q) => q.kind !== 'rampup').length : 0), 0);
      const cond = v?.session.blocks.find((b) => b.kind === 'conditioning');
      lines.push(`| ${x.date ?? '—'} | ${x.sport} | ${strengthItems.map((i) => short(i.exerciseId)).join(', ') || '—'} | ${String(work)} | ${cond ? `${cond.format} · ${cond.items.map((i) => short(i.exerciseId)).join(', ')}` : '—'} |`);
      if (x.sport === 'strength') expect(cond).toBeUndefined();
    }
    // Même exercice de force deux jours consécutifs entre sports (Musculation ↔ bloc délégué) : mesuré, NON RÉSOLU.
    const byDate = msRows.map((x) => ({ date: x.date ?? '', sport: x.sport, ex: (selectProgrammeSession(ms, x.requestId)?.session.blocks ?? []).filter((b) => b.kind === 'strength').flatMap((b) => b.items.map((i) => i.exerciseId)) }));
    const adjacent = byDate.flatMap((a) => byDate.filter((b) => b.sport !== a.sport && Date.parse(b.date) - Date.parse(a.date) === 86_400_000).flatMap((b) => a.ex.filter((e) => b.ex.includes(e)).map((e) => `${short(e)} (${a.date} ${a.sport} → ${b.date} ${b.sport})`)));
    lines.push('', `Même exercice de force à J+1 entre Musculation et bloc délégué : ${adjacent.length > 0 ? adjacent.join(' ; ') : 'aucun'} — aucune règle gouvernée n'interdit ce cas (M3 ne le signale pas, Strength ne compte que les expositions passées) : **NON RÉSOLU**, décision demandée.`);
    lines.push('', 'Les séances Musculation sont composées par le moteur Strength avec les blocs délégués de la semaine dans leur historique planifié (volume et alternance, `strength.weeklyVolumeAccounting`) ; à la réalisation, seules les séries réellement faites du bloc délégué alimentent les expositions Strength, jamais la progression (tracks).', '');

    writeFileSync(new URL('./__reports__/c43-comparison.md', import.meta.url).pathname, `${lines.join('\n')}\n`);
  }, 900_000);
});
