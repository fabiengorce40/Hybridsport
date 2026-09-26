import type { CompressionLever, SessionBlock, SessionDraft, SessionItem } from '@hybridsport/domain';

export interface LeverSteps {
  readonly reduceRestS: number;
  readonly shortenConditioningS: number;
  readonly reduceRunS: number;
  readonly reduceRunM: number;
}

export interface LeverRef { readonly blockId: string; readonly lever: CompressionLever }

const PROTECTED_KINDS = new Set(['warmup', 'cooldown']);

/** L'échauffement et le retour au calme ne portent jamais de levier (spec 07 §3.3). */
export function leverDeclarationIssues(session: SessionDraft): string[] {
  const out: string[] = [];
  for (const b of session.blocks) {
    if (PROTECTED_KINDS.has(b.kind) && b.levers.length > 0) out.push(`${b.id} : levier interdit sur un bloc ${b.kind}`);
    for (const l of b.levers) {
      if (l.kind === 'reduce_main_volume' && b.role !== 'primary') out.push(`${b.id} : reduce_main_volume réservé au bloc principal`);
      if (l.kind === 'drop_optional_block' && !b.optional) out.push(`${b.id} : drop_optional_block sur un bloc non optionnel`);
    }
  }
  return out;
}

// technical-constant: rang structurel des rôles (ordre de compression), pas une valeur sportive
const ROLE_ORDER: Record<SessionBlock['role'], number> = { support: 1, secondary: 2, primary: 3 };

/**
 * Ordre d'application par défaut : blocs optionnels d'abord, puis support, puis secondaires, le
 * principal en dernier ; à l'intérieur d'un bloc, l'ordre déclaré. reduce_main_volume toujours à la fin.
 */
export function defaultLeverPlan(session: SessionDraft): LeverRef[] {
  const rank = (b: SessionBlock): number => (b.optional ? 0 : ROLE_ORDER[b.role]);
  const blocks = session.blocks.map((b, i) => ({ b, i })).sort((x, y) => rank(x.b) - rank(y.b) || x.i - y.i);
  const plan: LeverRef[] = [];
  const last: LeverRef[] = [];
  for (const { b } of blocks) for (const lever of b.levers) (lever.kind === 'reduce_main_volume' ? last : plan).push({ blockId: b.id, lever });
  return [...plan, ...last];
}

function mapBlock(s: SessionDraft, id: string, f: (b: SessionBlock) => SessionBlock | undefined): SessionDraft {
  return { ...s, blocks: s.blocks.flatMap((b) => (b.id === id ? (f(b) ? [f(b) as SessionBlock] : []) : [b])) };
}

function withItems(b: SessionBlock, items: SessionItem[]): SessionBlock {
  return { ...b, items } as SessionBlock;
}

function reduceOneSet(b: SessionBlock, min: number): SessionBlock | null {
  let bestIdx = -1;
  let bestCount = min;
  b.items.forEach((it, i) => {
    if (it.prescription.type === 'sets') {
      const working = it.prescription.sets.filter((s) => s.kind !== 'rampup').length;
      if (working > bestCount) { bestCount = working; bestIdx = i; }
    }
  });
  if (bestIdx < 0) return null;
  const items = b.items.map((it, i) => {
    if (i !== bestIdx || it.prescription.type !== 'sets') return it;
    const sets = [...it.prescription.sets];
    const lastWorking = sets.findLastIndex((s) => s.kind !== 'rampup');
    sets.splice(lastWorking, 1);
    return { ...it, prescription: { ...it.prescription, sets } };
  });
  return withItems(b, items);
}

/**
 * Applique UN pas d'un levier. Renvoie la séance modifiée, ou null si le levier est épuisé.
 * Fonctions pures ; aucun levier n'ajoute de travail.
 */
export function applyLeverStep(session: SessionDraft, ref: LeverRef, steps: LeverSteps): SessionDraft | null {
  const block = session.blocks.find((b) => b.id === ref.blockId);
  if (!block) return null;
  const l = ref.lever;
  switch (l.kind) {
    case 'drop_optional_block':
      return block.optional ? mapBlock(session, block.id, () => undefined) : null;
    case 'reduce_sets':
    case 'reduce_main_volume': {
      const next = reduceOneSet(block, l.min);
      return next ? mapBlock(session, block.id, () => next) : null;
    }
    case 'superset_accessories': {
      // technical-constant: un superset exige au moins deux exercices (définition structurelle)
      if (block.format !== 'sets' || block.grouping !== 'straight' || block.items.length < 2) return null;
      return mapBlock(session, block.id, (b) => ({ ...b, grouping: 'superset' }) as SessionBlock);
    }
    case 'reduce_rest': {
      let changed = false;
      const items = block.items.map((it) => {
        if (it.prescription.type !== 'sets') return it;
        const sets = it.prescription.sets.map((s) => {
          const r = Math.max(l.floorS, s.restAfterS - steps.reduceRestS);
          if (r < s.restAfterS) changed = true;
          return { ...s, restAfterS: r };
        });
        return { ...it, prescription: { ...it.prescription, sets } };
      });
      return changed ? mapBlock(session, block.id, (b) => withItems(b, items)) : null;
    }
    case 'drop_accessory':
      return block.items.length > Math.max(l.keepAtLeast, 1) ? mapBlock(session, block.id, (b) => withItems(b, b.items.slice(0, -1))) : null;
    case 'shorten_conditioning': {
      if (block.format === 'amrap' && block.timeCapS - steps.shortenConditioningS >= l.minS) return mapBlock(session, block.id, (b) => ({ ...b, timeCapS: block.timeCapS - steps.shortenConditioningS }) as SessionBlock);
      // technical-constant: conversion minutes → secondes
      const SEC = 60;
      if (block.format === 'emom' && (block.minutes - 1) * SEC >= l.minS) return mapBlock(session, block.id, (b) => ({ ...b, minutes: block.minutes - 1 }) as SessionBlock);
      if (block.format === 'for_time' && block.rounds > 1) return mapBlock(session, block.id, (b) => ({ ...b, rounds: block.rounds - 1 }) as SessionBlock);
      return null;
    }
    case 'reduce_run_volume': {
      const idx = block.items.findIndex((it) =>
        (it.prescription.type === 'timed' && it.prescription.workS - steps.reduceRunS >= (l.minS ?? steps.reduceRunS))
        || (it.prescription.type === 'distance' && it.prescription.distanceM - steps.reduceRunM >= (l.minM ?? steps.reduceRunM)));
      if (idx < 0) return null;
      const items = block.items.map((it, i) => {
        if (i !== idx) return it;
        const p = it.prescription;
        if (p.type === 'timed') return { ...it, prescription: { ...p, workS: p.workS - steps.reduceRunS } };
        if (p.type === 'distance') return { ...it, prescription: { ...p, distanceM: p.distanceM - steps.reduceRunM } };
        return it;
      });
      return mapBlock(session, block.id, (b) => withItems(b, items));
    }
  }
}
