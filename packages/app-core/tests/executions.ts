/**
 * Saisies de réalisation SIMULÉES pour les tests (ce qu'un utilisateur taperait) : TEST_ONLY. L'application ne déduit
 * jamais ces valeurs ; ici, le test les fournit explicitement à partir de la séance affichée.
 */
import { migrateToCurrent } from '@hybridsport/engine';
import type { SessionDraft, SessionRecord } from '@hybridsport/domain';
import type { AppState, SetLog } from '../src/index.js';

export function plannedSession(state: AppState, requestId: string): SessionDraft {
  for (const w of Object.values(state.planner.weeks)) {
    const r = w.requests.find((x) => x.requestId === requestId);
    if (r?.record) {
      const d = migrateToCurrent<SessionRecord>(r.record);
      if (d.ok) return d.value.session;
    }
  }
  throw new Error(`séance planifiée introuvable : ${requestId}`);
}

/** Séries de travail saisies comme faites : répétitions = cible (borne basse d'une plage), charge et RIR saisis. */
export function workSetsDone(state: AppState, requestId: string, o: { loadKg?: number; rir?: number; skipLast?: boolean } = {}): SetLog[] {
  const out: SetLog[] = [];
  for (const b of plannedSession(state, requestId).blocks) {
    if (b.kind === 'warmup' || b.kind === 'cooldown') continue;
    for (const it of b.items) {
      if (it.prescription.type !== 'sets') continue;
      it.prescription.sets.forEach((p, i) => {
        if (p.kind === 'rampup' || p.optional === true) return;
        const reps = typeof p.reps === 'number' ? p.reps : p.reps.min;
        const kg = p.intensity?.mode === 'load' ? p.intensity.kg : o.loadKg;
        out.push({ itemId: it.id, setIndex: i, done: true, reps, ...(kg !== undefined ? { loadKg: kg } : {}), ...(o.rir !== undefined ? { rir: o.rir } : {}) });
      });
    }
  }
  return o.skipLast ? out.slice(0, -1) : out;
}
