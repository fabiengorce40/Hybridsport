/**
 * Strength S3 — conduite LONGITUDINALE d'un programme Beta 0 par le chemin réel de l'application (createBeta0Programme →
 * ensureBeta0Week → Global Planner → moteurs → recordSessionExecution → closeProgrammeWeekInApp), et rapport lisible
 * par un coach (tables markdown).
 *
 * Saisies de réalisation : TEST_ONLY (ce qu'un utilisateur taperait), jamais des valeurs du produit :
 * - séance « réalisée comme prescrit » : chaque série de travail faite, répétitions = borne HAUTE de la plage prescrite
 *   (cible d'un modèle à plage), charge = charge prescrite, RIR = RIR cible prescrit ;
 * - charge saisie quand la séance ne prescrit PAS de charge (première exposition, calibration à l'effort) :
 *   `TEST_ONLY_FIRST_LOAD_KG` ; aucune charge saisie pour un exercice au poids du corps ;
 * - RIR saisi quand la séance ne prescrit pas de RIR : `TEST_ONLY_DEFAULT_RIR`.
 * Aucune séance n'est injectée : seules les séances planifiées par le planificateur sont réalisées.
 */
import { migrateToCurrent } from '@hybridsport/engine';
import type { SessionDraft, SessionRecord, SetPrescription } from '@hybridsport/domain';
import { goalKey, readStrengthParams, sessionPlannedHardSets } from '@hybridsport/strength';
import { closeProgrammeWeekInApp, ensureBeta0Week, exerciseLabel, recordSessionExecution, strengthContent, strengthWeekVolume } from '../../src/index.js';
import type { AppState, PersistedWeek, SessionExecutionInput, SetLog } from '../../src/index.js';
import { clock } from '../fixtures.js';

// technical-constant: TEST_ONLY — charge saisie (kg) à la première exposition d'un exercice chargé sans charge prescrite
export const TEST_ONLY_FIRST_LOAD_KG = 40;
// technical-constant: TEST_ONLY — RIR saisi quand la série ne prescrit pas de RIR
export const TEST_ONLY_DEFAULT_RIR = 2;
// technical-constant: TEST_ONLY — distance saisie (m) pour une course réalisée
export const TEST_ONLY_RUN_DISTANCE_M = 6000;
// technical-constant: TEST_ONLY — temps saisi (s) pour un TEST de course
export const TEST_ONLY_RUN_TEST_TIME_S = 1500;

type Request = PersistedWeek['requests'][number];
export type Event = 'as_prescribed' | 'last_set_missed' | 'abandoned_half' | 'missed' | 'pain';

export interface Executed {
  readonly requestId: string;
  readonly sport: string;
  readonly date: string;
  readonly event: Event;
  /** Raisons d'audit produites par cette réalisation (ProgrammeEngine + ProgressionEngine Strength). */
  readonly audit: readonly { code: string; params: Record<string, unknown> }[];
  readonly sets: readonly SetLog[];
}

export interface WeekRun {
  readonly weekStart: string;
  readonly before: AppState;
  readonly week: PersistedWeek;
  readonly executed: readonly Executed[];
  /** Décisions de la frontière de semaine (reprise / clôture / revue) appliquées AVANT cette semaine. */
  readonly boundary: readonly { code: string; params: Record<string, unknown> }[];
}

export function recordOf(r: Request): SessionRecord | undefined {
  if (!r.record) return undefined;
  const d = migrateToCurrent<SessionRecord>(r.record);
  return d.ok ? d.value : undefined;
}

const work = (s: SetPrescription): boolean => s.kind !== 'rampup' && s.optional !== true;
const mainItems = (s: SessionDraft) => s.blocks.filter((b) => b.kind !== 'warmup' && b.kind !== 'cooldown').flatMap((b) => b.items);
export const rirOf = (p: SetPrescription): number | undefined => {
  const e = p.intensity && 'effort' in p.intensity ? p.intensity.effort : undefined;
  return e && 'rir' in e ? e.rir : p.rir;
};

/** Saisie TEST_ONLY « comme prescrit » de toutes les séries de travail de la séance. */
export function asPrescribed(session: SessionDraft): SetLog[] {
  return mainItems(session).flatMap((it) => (it.prescription.type !== 'sets' ? [] : it.prescription.sets.flatMap((p, i) => {
    if (!work(p)) return [];
    const reps = typeof p.reps === 'number' ? p.reps : p.reps.max;
    const kg = p.intensity?.mode === 'load' ? p.intensity.kg : p.intensity?.mode === 'percent_of_reference' ? p.intensity.kgRounded
      : p.intensity?.mode === 'bodyweight' ? undefined : TEST_ONLY_FIRST_LOAD_KG;
    return [{ itemId: it.id, setIndex: i, done: true, reps, ...(kg !== undefined ? { loadKg: kg } : {}), rir: rirOf(p) ?? TEST_ONLY_DEFAULT_RIR }];
  })));
}

function strengthInput(session: SessionDraft, requestId: string, event: Event): SessionExecutionInput {
  const all = asPrescribed(session);
  if (event === 'last_set_missed') {
    // Dernière série de travail du PREMIER exercice (exercice principal) non réalisée.
    const first = all[0]?.itemId;
    const last = all.filter((x) => x.itemId === first).at(-1);
    return { requestId, sport: 'strength', completion: 'modified', pain: 'NONE', sets: all.filter((x) => x !== last) };
  }
  if (event === 'abandoned_half') return { requestId, sport: 'strength', completion: 'abandoned', pain: 'NONE', sets: all.slice(0, Math.ceil(all.length / 2)) };
  if (event === 'pain') return { requestId, sport: 'strength', completion: 'modified', pain: 'P2', sets: all };
  return { requestId, sport: 'strength', completion: 'completed_as_prescribed', pain: 'NONE', sets: all };
}

function runInput(r: Request, session: SessionDraft): SessionExecutionInput {
  const isTest = r.intent?.archetypeId === 'running.test';
  return { requestId: r.requestId, sport: 'running', completion: 'completed_as_prescribed', pain: 'NONE', run: { realizedDurationS: session.targetDurationS, distanceM: TEST_ONLY_RUN_DISTANCE_M, ...(isTest ? { testTimeS: TEST_ONLY_RUN_TEST_TIME_S } : {}) } };
}

/**
 * Conduit `weeks` semaines consécutives : planification par `ensureBeta0Week` (chemin de l'application), réalisation de
 * chaque séance planifiée selon `events` (défaut : comme prescrit), clôture de la semaine. `events[requestId]` absent ⇒
 * comme prescrit. Une séance `missed` n'est pas saisie (manquée dérivée à la clôture).
 */
export function drive(s0: AppState, weekStarts: readonly string[], events: (w: number, r: Request, k: number) => Event = () => 'as_prescribed'): { final: AppState; weeks: WeekRun[] } {
  let s = s0;
  const weeks: WeekRun[] = [];
  for (const [w, start] of weekStarts.entries()) {
    const auditBefore = s.programmeState?.audit.length ?? 0;
    if (w > 0) s = ensureBeta0Week(s, clock(start));
    const boundary = (s.programmeState?.audit ?? []).slice(auditBefore).map((a) => a.reason).filter((r) => r.code.startsWith('PROGRESSION.'));
    const week = s.planner.weeks[start];
    if (!week) throw new Error(`semaine non planifiée : ${start}`);
    const before = s;
    const executed: Executed[] = [];
    const reqs = week.requests.filter((r) => r.status === 'planned').sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? -1 : 1));
    for (const [k, r] of reqs.entries()) {
      const rec = recordOf(r);
      if (!rec || !r.date) throw new Error(`séance illisible : ${r.requestId}`);
      const event = r.sport === 'strength' ? events(w, r, k) : 'as_prescribed';
      if (event === 'missed') { executed.push({ requestId: r.requestId, sport: r.sport, date: r.date, event, audit: [], sets: [] }); continue; }
      const input = r.sport === 'strength' ? strengthInput(rec.session, r.requestId, event) : runInput(r, rec.session);
      const n = s.programmeState?.audit.length ?? 0;
      s = recordSessionExecution(s, clock(r.date, '18:00:00'), input);
      // Pause douleur : levée explicite par l'utilisateur avant la séance suivante (chemin de l'application, TEST_ONLY).
      if (event === 'pain') s = { ...s, safety: { activePain: null } };
      executed.push({ requestId: r.requestId, sport: r.sport, date: r.date, event, audit: (s.programmeState?.audit ?? []).slice(n).map((a) => a.reason), sets: input.sport === 'strength' ? input.sets ?? [] : [] });
    }
    s = closeProgrammeWeekInApp(s, clock(weekStarts[w + 1] ?? nextMonday(start)));
    weeks.push({ weekStart: start, before, week, executed, boundary });
  }
  return { final: s, weeks };
}

const nextMonday = (d: string): string => new Date(Date.parse(`${d}T00:00:00Z`) + 7 * 86_400_000).toISOString().slice(0, 10);

// ——— Rapport coach

const p = () => readStrengthParams(strengthContent().ruleset).values;
const fmtReps = (r: SetPrescription['reps']): string => (typeof r === 'number' ? `${r}` : r.min === r.max ? `${r.min}` : `${r.min}–${r.max}`);
function fmtLoad(s: SetPrescription | undefined): string {
  const i = s?.intensity;
  if (!i) return '—';
  if (i.mode === 'load') return `${i.kg} kg`;
  if (i.mode === 'percent_of_reference') return `${i.kgRounded} kg (${Math.round(i.fraction * 100)} % e1RM)`;
  if (i.mode === 'bodyweight') return i.addedKg ? `PDC + ${i.addedKg} kg` : 'poids du corps';
  if (i.mode === 'effort') return 'à l’effort (calibration)';
  return i.mode;
}
const SOURCE: Record<string, string> = { calibration: 'calibration', history: 'historique', track: 'track', base_profile: 'profil de base', transfer: 'transfert' };

const reasonOf = (r: Request, code: string, pred: (x: Record<string, unknown>) => boolean = () => true) => r.reasons.filter((x) => x.code === code && pred(x.params));

/** Libellé coach de la décision de progression produite par la réalisation de cet exercice. */
function progressionCell(e: Executed | undefined, trackId: string | undefined, exerciseId: string): string {
  if (!e) return '—';
  if (e.event === 'missed') return 'séance manquée : rien appliqué';
  const created = e.audit.find((a) => a.code === 'PROGRESSION.TRACK_CREATED' && a.params.exerciseId === exerciseId);
  const tid = trackId ?? (created?.params.trackId as string | undefined);
  const mine = e.audit.filter((a) => a.params.trackId === tid && tid !== undefined);
  const parts = mine.map((a) => {
    if (a.code === 'PROGRESSION.EXPOSURE_CLASSIFIED') return `exposition ${String(a.params.exposure)}${a.params.success === 'exact' ? ' (réussite exacte)' : a.params.success === 'exceeded' ? ' (dépassée)' : ''}`;
    if (a.code === 'PROGRESSION.ADVANCED') return `**progression ${a.params.variable === 'load' ? 'charge' : a.params.variable === 'reps' ? 'répétitions' : String(a.params.variable)}**`;
    if (a.code === 'PROGRESSION.HELD') return `maintien (${a.params.cause})`;
    if (a.code === 'PROGRESSION.REGRESSED') return '**régression**';
    if (a.code === 'PROGRESSION.SUSPENDED') return `suspendue (${a.params.cause})`;
    if (a.code === 'PROGRESSION.TRACK_CREATED') return `track ${a.params.tier === 'anchor' ? 'd’ancre' : 'suivie'} créée`;
    if (a.code === 'PROGRESSION.CAP_REACHED') return 'plafond atteint';
    if (a.code === 'PROGRESSION.DECISION_BLOCKED') return 'réussite exacte : hausse non gouvernée (BLOCKED)';
    if (a.code === 'PROGRESSION.METHOD_UNGOVERNED') return 'haut de plage au poids du corps : méthode non gouvernée (BLOCKED)';
    return a.code;
  });
  return parts.length > 0 ? parts.join(' ; ') : 'aucune track (accessoire non suivi)';
}

export interface ReportOptions { readonly title: string; readonly intro: readonly string[] }

export function report(run: { final: AppState; weeks: WeekRun[] }, o: ReportOptions): string {
  const params = p();
  const catalog = strengthContent().catalog;
  const prof = run.final.profile;
  if (!prof) throw new Error('profil absent');
  const range = params['strength.volume'].weeklyRange[goalKey({ goal: prof.strength.goal } as never)]?.[prof.level] ?? {};
  const out: string[] = [`# ${o.title}`, '', ...o.intro, ''];
  // Exercices de chaque emplacement de chaque archétype lors de la DERNIÈRE séance de cet archétype (toutes semaines
  // confondues) ; un emplacement répété est comparé comme un ensemble (l'ordre des instances n'est pas un changement).
  const lastInSlot = new Map<string, readonly string[]>();
  for (const [w, wk] of run.weeks.entries()) {
    out.push(`## Semaine ${w + 1} — ${wk.weekStart}`, '');
    if (wk.boundary.length > 0) out.push(`Frontière de semaine (ProgressionEngine) : ${wk.boundary.map((b) => `${b.code}(${Object.values(b.params).join(', ')})`).join(' ; ')}`, '');
    const reqs = wk.week.requests.filter((r) => r.status === 'planned').sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? -1 : 1));
    const refused = wk.week.requests.filter((r) => r.status !== 'planned');
    if (refused.length > 0) out.push(`Demandes non planifiées : ${refused.map((r) => `${r.sport} ${r.status} (${r.category})`).join(' ; ')}`, '');
    out.push('| Jour | Séance | Exercice | Séries × reps | RIR cible | Charge | Source | Exercice vs semaine précédente | Décision de progression après la séance |', '|---|---|---|---|---|---|---|---|---|');
    const occ = new Map<string, number>();
    const planned: Record<string, number> = {};
    const realized: Record<string, number> = {};
    const notes: string[] = [];
    for (const r of reqs) {
      const rec = recordOf(r);
      if (!rec) continue;
      const exec = wk.executed.find((e) => e.requestId === r.requestId);
      const arch = r.intent?.archetypeId ?? '?';
      if (r.sport !== 'strength') {
        out.push(`| ${r.date} | ${arch} (${r.composition?.role ?? '—'}) | ${Math.round(rec.session.targetDurationS / 60)} min | — | — | — | — | — | réalisée (TEST_ONLY) |`);
        continue;
      }
      const n = (occ.get(arch) ?? 0) + 1;
      occ.set(arch, n);
      const wp = reasonOf(r, 'PLAN.WEEK_PRESCRIPTION')[0]?.params;
      const lowered = reasonOf(r, 'PLAN.STRUCTURE_LOWERED').map((x) => `${x.params.structure} (${x.params.cause})`);
      const omitted = reasonOf(r, 'SELECT.SLOT_OMITTED').map((x) => `${x.params.slot} (${x.params.cause})`);
      notes.push(`- ${r.date} ${arch} #${n} — graine \`${rec.provenance.seed}\` ; ancres déclarées : ${(wp?.anchors as string[] | undefined)?.map((x) => exerciseLabel(x)).join(', ') || 'aucune'} ; sous le plancher (prévu + réalisé avant la séance) : ${(wp?.belowFloor as string[] | undefined)?.join(', ') || 'aucun'} ; au haut ou au-delà : ${(wp?.atOrAboveHigh as string[] | undefined)?.join(', ') || 'aucun'}${lowered.length ? ` ; structures abaissées : ${lowered.join(', ')}` : ''}${omitted.length ? ` ; emplacements omis : ${omitted.join(', ')}` : ''}${exec && exec.event !== 'as_prescribed' ? ` ; **réalisation : ${exec.event}**` : ''}`);
      for (const [g, v] of Object.entries(sessionPlannedHardSets(rec.session, params, catalog))) planned[g] = (planned[g] ?? 0) + v;
      if (exec && exec.event !== 'missed') {
        const done = new Set(exec.sets.filter((x) => x.done).map((x) => `${x.itemId}#${x.setIndex}`));
        const realizedSession: SessionDraft = { ...rec.session, blocks: rec.session.blocks.map((b) => ({ ...b, items: b.items.map((it) => (it.prescription.type !== 'sets' ? it : { ...it, prescription: { ...it.prescription, sets: it.prescription.sets.filter((s, i) => !work(s) || done.has(`${it.id}#${i}`)) } })) })) };
        for (const [g, v] of Object.entries(sessionPlannedHardSets(realizedSession, params, catalog))) realized[g] = (realized[g] ?? 0) + v;
      }
      for (const it of mainItems(rec.session)) {
        const sets = it.prescription.type === 'sets' ? it.prescription.sets.filter(work) : [];
        const first = sets[0];
        const slot = it.refs?.slotId ?? it.id;
        const chosen = reasonOf(r, 'SELECT.EXERCISE.CHOSEN', (x) => x.slot === slot)[0]?.params.decidingCriterion;
        const before = lastInSlot.get(`${arch}|${slot}`);
        const nowIds = mainItems(rec.session).filter((x) => (x.refs?.slotId ?? x.id) === slot).map((x) => x.exerciseId);
        const gone = (before ?? []).filter((x) => !nowIds.includes(x));
        const status = before === undefined ? 'première exposition de l’emplacement'
          : before.includes(it.exerciseId) ? 'conservé'
          : gone.length === 0 ? `ajouté (instance supplémentaire de l’emplacement ; critère : ${String(chosen ?? '—')})` : `**changé** (était ${gone.map((x) => exerciseLabel(x)).join(', ')} ; critère : ${String(chosen ?? '—')})`;
        const anchor = it.refs?.anchor === 'declared' ? ' ⚓' : '';
        const dose = it.prescription.type === 'sets' ? `${sets.length} × ${first ? fmtReps(first.reps) : '—'}` : it.prescription.type;
        out.push(`| ${r.date} | ${arch} #${n} | ${exerciseLabel(it.exerciseId)}${anchor} | ${dose} | ${first ? rirOf(first) ?? '—' : '—'} | ${fmtLoad(first)} | ${SOURCE[it.refs?.prescriptionSource ?? ''] ?? it.refs?.prescriptionSource ?? '—'} | ${status} | ${progressionCell(exec, it.refs?.progressionTrackId, it.exerciseId)} |`);
      }
      for (const it of mainItems(rec.session)) {
        const slot = it.refs?.slotId ?? it.id;
        lastInSlot.set(`${arch}|${slot}`, mainItems(rec.session).filter((x) => (x.refs?.slotId ?? x.id) === slot).map((x) => x.exerciseId));
      }
    }
    out.push('', 'Séances Strength :', '', ...notes, '');
    const groups = Object.keys(params['strength.volume'].muscleGroups).sort();
    // S4 — bilan de volume du moteur Strength (cible du ruleset, prévu, statut, contraintes de la semaine).
    const vol = strengthWeekVolume(wk.before, wk.weekStart);
    const statusOf = new Map((vol?.groups ?? []).map((g) => [g.group, g.status]));
    out.push('| Groupe | Cible (plancher) | Haut | Prévu (séries dures E1) | Réalisé | Statut |', '|---|---|---|---|---|---|');
    for (const g of groups) {
      const pl = planned[g] ?? 0;
      const re = realized[g] ?? 0;
      if (pl === 0 && range[g] === undefined) continue;
      out.push(`| ${g} | ${range[g]?.floor ?? '—'} | ${range[g]?.high ?? '—'} | ${round(pl)} | ${round(re)} | ${statusOf.get(g) ?? '—'} |`);
    }
    if (vol) out.push('', `Objectif de volume de la semaine : **${vol.status}** (${String(vol.plannedSessions)}/${String(vol.requestedSessions)} séances). Contraintes tracées : ${vol.constraints.map((c) => `${c.cause} (${c.detail})`).join(' ; ') || 'aucune'}.`);
    const prio = wk.week.requests.flatMap((r) => r.reasons).find((x) => x.code === 'PLAN.SPORT_PRIORITY')?.params;
    if (prio) out.push('', `Priorité déclarée (programme) : ${(prio.order as string[]).join(' > ')} ; reçue par Strength : rang ${String(prio.strengthRank)} ; voisines : ${(prio.neighbours as string[]).join(', ') || 'aucune'} ; politique : ${String(prio.policy)}.`);
    const blocked = wk.executed.flatMap((e) => e.audit).filter((a) => a.code === 'PROGRESSION.DECISION_BLOCKED' || a.code === 'PROGRESSION.METHOD_UNGOVERNED');
    if (blocked.length > 0) out.push('', `Décisions bloquées (après réalisation) : ${[...new Map(blocked.map((b) => [`${b.code}|${String(b.params.trackId)}`, b])).values()].map((b) => `${b.code === 'PROGRESSION.METHOD_UNGOVERNED' ? `poids du corps en haut de plage (${exerciseLabel(String(b.params.exerciseId))}) : méthodes possibles ${(b.params.methods as string[]).join(', ')}, aucune gouvernée` : `réussite exacte sans marge (${String(b.params.model)}, RIR ${String(b.params.rir)}) : hausse non gouvernée`}`).join(' ; ')}.`);
    out.push('');
  }
  out.push(...summary(run));
  return `${out.join('\n')}\n`;
}

/** S4 — récapitulatif chiffré (stabilité, progression, décisions bloquées, taille de l'état persisté). */
function summary(run: { final: AppState; weeks: WeekRun[] }): string[] {
  const audit = run.weeks.flatMap((w) => w.executed.flatMap((e) => e.audit));
  const count = (code: string, pred: (p: Record<string, unknown>) => boolean = () => true) => audit.filter((a) => a.code === code && pred(a.params)).length;
  const weekReasons = run.weeks.flatMap((w) => w.week.requests.flatMap((r) => r.reasons));
  const keptN = weekReasons.filter((x) => x.code === 'SELECT.CONTINUITY_KEPT').reduce((a, x) => a + (x.params.exercises as string[]).length, 0);
  const replaced = weekReasons.filter((x) => x.code === 'SELECT.CONTINUITY' && x.params.outcome === 'replaced');
  const causes = [...replaced.reduce((m, x) => m.set(String(x.params.cause), (m.get(String(x.params.cause)) ?? 0) + 1), new Map<string, number>())].sort().map(([c, n]) => `${c} ×${String(n)}`);
  return [
    '## Récapitulatif', '',
    `- Continuité : ${String(keptN)} exercices en place conservés par la continuité déclarée (hors ancres déclarées), ${String(replaced.length)} remplacés (${causes.join(', ') || '—'}).`,
    `- Progression : répétitions ×${String(count('PROGRESSION.ADVANCED', (p) => p.variable === 'reps'))}, charge ×${String(count('PROGRESSION.ADVANCED', (p) => p.variable === 'load'))}, maintiens ×${String(count('PROGRESSION.HELD'))}, régressions ×${String(count('PROGRESSION.REGRESSED'))}.`,
    `- Preuves : réussites exactes ×${String(count('PROGRESSION.EXPOSURE_CLASSIFIED', (p) => p.success === 'exact'))}, dépassements ×${String(count('PROGRESSION.EXPOSURE_CLASSIFIED', (p) => p.success === 'exceeded'))}, sans preuve ×${String(count('PROGRESSION.EXPOSURE_CLASSIFIED', (p) => p.success === 'none'))}.`,
    `- Décisions bloquées : réussite exacte ×${String(count('PROGRESSION.DECISION_BLOCKED'))}, poids du corps ×${String(count('PROGRESSION.METHOD_UNGOVERNED'))}.`,
    `- État persisté (JSON compact, saveState) après ${String(run.weeks.length)} semaines : ${String(Math.round(JSON.stringify(run.final).length / 1024))} Ko.`,
    '',
  ];
}
const round = (x: number): string => `${Math.round(x * 10) / 10}`;
