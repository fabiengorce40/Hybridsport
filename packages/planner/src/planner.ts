/**
 * Global Planner V1 — orchestration multisport ÉTROITE et déterministe. Il n'est pas un moteur sportif : il place
 * des demandes de séances et appelle le moteur de chaque discipline, qui reste seul auteur du contenu.
 *
 * FILTRES (durs) :
 *   G1 port de moteur disponible pour le sport demandé ;
 *   G2 jour déclaré disponible (minutes > 0) ;
 *   G3 au plus UNE séance par jour (double séance non gouvernée : contrat V0 conservé) ;
 *   G4 interférence inter-disciplines : deux séances de disciplines DIFFÉRENTES sollicitant la même structure
 *      (dérivée du catalogue par la table gouvernée) doivent être séparées d'au moins l'écart GOUVERNÉ
 *      `planner.interference.structureWindows` ; paramètre absent, structure non gouvernée ou structures non
 *      dérivables ⇒ conflit (fail-closed) ;
 *   G5 refus du moteur conservé tel quel (aucune substitution, aucune autre dose, aucun autre sport à sa place).
 * ORDRE (départage, jamais un filtre) : priorité DÉCLARÉE des sports (tour de rôle), puis jour le plus éloigné des
 * séances déjà placées, puis jour le plus tôt — critères du planificateur V0.
 * Aucun nombre de récupération, d'espacement, de volume ou de priorité n'est écrit ici.
 */
import type { ReasonCode, SessionDraft } from '@hybridsport/domain';
import type { LoadedRuleset } from '@hybridsport/engine';
import { GP_CODES, gpReasons } from './codes.js';
import { readPlannerParam } from './governance.js';
import { zPlannerInput } from './model.js';
import type { DayResult, PlannedWeek, PlannerClock, PlannerInput, PlannerSport, RequestResult } from './model.js';
import type { SportPort, StructuresResult } from './ports.js';

// technical-constant: millisecondes par heure (conversion d'unités)
const MS_PER_HOUR = 3_600_000;
const STRUCTURE_RULE = 'planner.interference.structureWindows';

export type SportPorts = Partial<Readonly<Record<PlannerSport, SportPort>>>;

interface Placed { readonly sport: PlannerSport; readonly date: string; readonly structures: StructuresResult; readonly label: string }

export function planMultisportWeek(raw: PlannerInput, ports: SportPorts, governance: LoadedRuleset | undefined, clock: PlannerClock): PlannedWeek {
  const input = zPlannerInput.parse(raw);
  const hybrid = input.demands.length > 1;
  const windows = readPlannerParam(governance, 'planner.interference.structureWindows', input.mode);
  const hoursOf = (d: string): number => Date.parse(clock.instantOf(d)) / MS_PER_HOUR;
  const dates = input.days.map((d) => d.date);
  const minutes = new Map(input.days.map((d) => [d.date, d.availableMinutes]));

  // Historique : séances antérieures, structures dérivées par le port de leur discipline (sinon : non dérivables).
  const unknownStructures = (sport: PlannerSport): StructuresResult => ({ ok: false, reasons: [gpReasons.emit(GP_CODES.STRUCTURES_UNAVAILABLE, { sport, cause: 'ENGINE_UNAVAILABLE' })] });
  const placed: Placed[] = input.recent.map((r) => ({ sport: r.sport, date: r.date, structures: ports[r.sport]?.structures(r.session as SessionDraft) ?? unknownStructures(r.sport), label: 'history' }));

  /** Conflits G4 d'une séance candidate avec les séances placées d'AUTRES disciplines. */
  const conflictsOf = (sport: PlannerSport, date: string, own: StructuresResult): ReasonCode[] => {
    const out: ReasonCode[] = [];
    for (const p of placed) {
      if (p.sport === sport) continue;
      const gapHours = Math.abs(hoursOf(date) - hoursOf(p.date));
      const base = { sport, date, withSport: p.sport, withDate: p.date, gapHours };
      if (!own.ok || !p.structures.ok) { out.push(gpReasons.emit(GP_CODES.INTERFERENCE_CONFLICT, { ...base, structure: '*', rule: 'STRUCTURES_UNAVAILABLE' })); continue; }
      const theirs = new Set(p.structures.structures);
      for (const s of own.structures.filter((x) => theirs.has(x))) {
        if (!windows.ok) { out.push(gpReasons.emit(GP_CODES.INTERFERENCE_CONFLICT, { ...base, structure: s, rule: `${STRUCTURE_RULE}:UNAVAILABLE` })); continue; }
        const required = windows.value[s];
        if (required === undefined) out.push(gpReasons.emit(GP_CODES.INTERFERENCE_CONFLICT, { ...base, structure: s, rule: `${STRUCTURE_RULE}:UNGOVERNED_STRUCTURE` }));
        else if (gapHours < required) out.push(gpReasons.emit(GP_CODES.INTERFERENCE_CONFLICT, { ...base, structure: s, rule: `${STRUCTURE_RULE}@${windows.version}` }));
      }
    }
    return out;
  };

  // Demandes en tour de rôle selon l'ordre DÉCLARÉ.
  const max = Math.max(0, ...input.demands.map((d) => d.sessions));
  const requests: { requestId: string; sport: PlannerSport }[] = [];
  for (let k = 1; k <= max; k++) for (const d of input.demands) if (k <= d.sessions) requests.push({ requestId: `${input.weekStart}.${d.sport}.${String(k)}`, sport: d.sport });

  const taken = new Map<string, { sport: PlannerSport; requestId: string }>();
  const results: RequestResult[] = [];
  const conflicts: ReasonCode[] = [];
  for (const r of requests) {
    const port = ports[r.sport];
    if (!port) { results.push({ ...r, status: 'unplaced', reasons: [gpReasons.emit(GP_CODES.ENGINE_UNAVAILABLE, { sport: r.sport })] }); continue; }
    const takenIdx = [...taken.keys()].map((x) => dates.indexOf(x));
    const gap = (d: string): number => (takenIdx.length === 0 ? 0 : Math.min(...takenIdx.map((i) => Math.abs(i - dates.indexOf(d)))));
    const candidates = dates.filter((d) => !taken.has(d) && (minutes.get(d) ?? 0) > 0)
      .sort((a, b) => gap(b) - gap(a) || (a < b ? -1 : 1));
    if (candidates.length === 0) { results.push({ ...r, status: 'unplaced', reasons: [gpReasons.emit(GP_CODES.NOT_ENOUGH_DAYS, { sport: r.sport, requestId: r.requestId })] }); continue; }
    let done = false;
    const tried: string[] = [];
    for (const date of candidates) {
      tried.push(date);
      const out = port.generate({ requestId: r.requestId, date, availableMinutes: minutes.get(date) ?? 0, hybrid, seed: `planner:${r.requestId}:${date}` });
      if (out.status === 'refused') {
        results.push({ ...r, status: 'refused', date, reasons: [gpReasons.emit(GP_CODES.ENGINE_REFUSED, { sport: r.sport, requestId: r.requestId, date }), ...out.reasons] });
        done = true;
        break;
      }
      const structures = port.structures(out.session);
      const found = conflictsOf(r.sport, date, structures);
      conflicts.push(...found, ...(structures.ok ? [] : structures.reasons));
      if (found.length > 0) continue;
      taken.set(date, r);
      placed.push({ sport: r.sport, date, structures, label: r.requestId });
      results.push({ ...r, status: 'planned', date, session: out.session, ...(out.fingerprint ? { fingerprint: out.fingerprint } : {}), reasons: [gpReasons.emit(GP_CODES.PLACED, { sport: r.sport, requestId: r.requestId, date }), ...out.reasons] });
      done = true;
      break;
    }
    if (!done) results.push({ ...r, status: 'unplaced', reasons: [gpReasons.emit(GP_CODES.INTERFERENCE_UNRESOLVED, { sport: r.sport, requestId: r.requestId, triedDates: tried })] });
  }

  const days: DayResult[] = input.days.map((d) => {
    const t = taken.get(d.date);
    if (t) return { date: d.date, availableMinutes: d.availableMinutes, status: 'planned', sport: t.sport, requestId: t.requestId };
    return { date: d.date, availableMinutes: d.availableMinutes, status: 'empty', reason: gpReasons.emit(GP_CODES.DAY_EMPTY, { date: d.date, cause: d.availableMinutes === 0 ? 'UNAVAILABLE' : 'NO_SESSION_PLACED' }) };
  });
  const governanceReasons = hybrid ? windows.reasons : [];
  return { weekStart: input.weekStart, mode: input.mode, hybrid, days, requests: results, conflicts, governance: governanceReasons };
}
