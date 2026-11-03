/**
 * FAST TRACK V1 — comparaison LISIBLE d'une semaine actuelle et d'une semaine proposée (replanification confirmée) :
 * séances conservées, déplacées, remplacées, ajoutées, retirées, non planifiées. Pure : aucune écriture.
 */
import { prescribedArchetype } from './beta0.js';
import type { PersistedWeek } from './model.js';

type Request = PersistedWeek['requests'][number];
export type WeekChangeKind = 'kept' | 'moved' | 'replaced' | 'added' | 'removed' | 'unplaced';
export interface WeekChange {
  readonly kind: WeekChangeKind;
  readonly sport: Request['sport'];
  /** Date actuelle (absente pour une séance ajoutée ou non planifiée). */
  readonly from?: string;
  /** Date proposée (absente pour une séance retirée ou non planifiée). */
  readonly to?: string;
  readonly archetypeFrom?: string | null;
  readonly archetypeTo?: string | null;
  /** Catégorie du planificateur pour une séance non planifiée (cause lisible côté interface). */
  readonly category?: string;
  readonly requestId: string;
}

const planned = (w: PersistedWeek) => w.requests.filter((r) => r.status === 'planned' && r.date !== undefined);
const arch = (r: Request) => prescribedArchetype(r).archetypeId;

/** Classement déterministe : même sport et même date ⇒ conservée (même séance) ou remplacée ; même séance ailleurs ⇒ déplacée. */
export function weekChanges(before: PersistedWeek, after: PersistedWeek): readonly WeekChange[] {
  const left = planned(before); const right = planned(after);
  const usedR = new Set<string>(); const usedL = new Set<string>(); const out: WeekChange[] = [];
  const take = (l: Request, r: Request, kind: WeekChangeKind) => { usedL.add(l.requestId); usedR.add(r.requestId); out.push({ kind, sport: l.sport, ...(l.date ? { from: l.date } : {}), ...(r.date ? { to: r.date } : {}), archetypeFrom: arch(l), archetypeTo: arch(r), requestId: r.requestId }); };
  // 1. Même sport, même date, même séance.
  for (const l of left) { const r = right.find((x) => !usedR.has(x.requestId) && x.sport === l.sport && x.date === l.date && arch(x) === arch(l)); if (r) take(l, r, 'kept'); }
  // 2. Même sport, même séance, autre date.
  for (const l of left) { if (usedL.has(l.requestId)) continue; const r = right.find((x) => !usedR.has(x.requestId) && x.sport === l.sport && arch(x) === arch(l)); if (r) take(l, r, 'moved'); }
  // 3. Même sport, même date, autre séance.
  for (const l of left) { if (usedL.has(l.requestId)) continue; const r = right.find((x) => !usedR.has(x.requestId) && x.sport === l.sport && x.date === l.date); if (r) take(l, r, 'replaced'); }
  for (const l of left) if (!usedL.has(l.requestId)) out.push({ kind: 'removed', sport: l.sport, ...(l.date ? { from: l.date } : {}), archetypeFrom: arch(l), requestId: l.requestId });
  for (const r of right) if (!usedR.has(r.requestId)) out.push({ kind: 'added', sport: r.sport, ...(r.date ? { to: r.date } : {}), archetypeTo: arch(r), requestId: r.requestId });
  for (const r of after.requests.filter((x) => x.status !== 'planned')) out.push({ kind: 'unplaced', sport: r.sport, ...(r.category ? { category: r.category } : {}), requestId: r.requestId });
  const order = (c: WeekChange) => c.to ?? c.from ?? '9999';
  return out.sort((a, b) => (order(a) < order(b) ? -1 : order(a) > order(b) ? 1 : 0));
}
