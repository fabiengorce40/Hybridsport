/**
 * État de l'application : chargement versionné, transitions via app-core uniquement, sauvegarde après
 * chaque transition. Aucun échec (lecture, écriture, action refusée) n'est silencieux.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppError, baselineOf, detectOverwrite, ensureBeta0Week, ensureCurrentWeek, guardedSave, isBeta0, loadState, MemoryStorage, resolveOverwrite, sameBaseline, STORAGE_KEY } from '@hybridsport/app-core';
import { SessionClocks } from './clock/session-clock.js';
import { ERROR_TEXT } from './present.js';
import { namespaced, STORAGE_NAMESPACE } from './channel.js';
import type { AppState, Baseline, Clock, KeyValueStorage, LoadResult, Overwrite } from '@hybridsport/app-core';

/** Horloge réelle (l'interface est la seule couche qui lit l'heure système). */
export function realClock(): Clock {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return { now: d.toISOString(), today: `${String(d.getFullYear())}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` };
}

function browserStorage(): { storage: KeyValueStorage; persistent: boolean } {
  try {
    const ls = window.localStorage;
    const probe = `${STORAGE_NAMESPACE}kairo.probe`;
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    // Canal BÊTA : clés préfixées (production : stockage tel quel, clés historiques).
    return { storage: namespaced(ls), persistent: true };
  } catch {
    return { storage: new MemoryStorage(), persistent: false };
  }
}

export interface Store {
  readonly state: AppState;
  readonly sessionClocks: SessionClocks;
  readonly load: LoadResult['status'];
  readonly loadInfo?: string;
  readonly persistent: boolean;
  readonly saveError?: string;
  readonly toast?: string;
  readonly clock: () => Clock;
  /** Applique une transition d'app-core ; renvoie false si elle est refusée (message affiché). */
  apply(f: (s: AppState, clock: Clock) => AppState): boolean;
  /** Recommencer (après lecture impossible : la sauvegarde illisible est déjà conservée à part). */
  reset(next: AppState): boolean;
  /** Données réécrites par une version non protégée (ancien onglet) : date de la dernière écriture protégée. */
  readonly overwrite?: { readonly savedAt: string };
  /** Choix de l'utilisateur après un écrasement ; la version écartée reste conservée sur l'appareil. */
  resolveOverwrite(choice: 'restore' | 'keep'): void;
  dismissToast(): void;
}

const Ctx = createContext<Store | null>(null);

export const ERROR_MESSAGES: Readonly<Record<string, string>> = ERROR_TEXT;

/**
 * Ouverture : chemin Beta 0 (programme créé) ⇒ semaines passées clôturées, semaine courante planifiée par le
 * Programme Engine ; sinon chemin V0 (repli / profil antérieur sans programme).
 */
export function openWeek(state: AppState, clock: Clock): AppState {
  return isBeta0(state) ? ensureBeta0Week(state, clock) : ensureCurrentWeek(state, clock);
}
const errorCode = (e: unknown): string => (e instanceof AppError ? e.code : (e as Error).message);

/** Message affiché quand une action est refusée parce qu'un autre onglet a enregistré entre-temps. */
export const CONFLICT_TEXT = 'Vos données ont été modifiées dans un autre onglet : elles ont été rechargées. Refaites l’action si besoin.';
export const RELOADED_TEXT = 'Données mises à jour depuis un autre onglet.';
export const PREMIGRATION_FAILED_TEXT = 'Vos données ont été mises au nouveau format, mais leur copie de sécurité n’a pas pu être enregistrée (stockage plein ?). Exportez vos données depuis Réglages.';
/** Délai de confirmation d'un écrasement apparent (écritures d'un autre onglet encore en cours). */
const OVERWRITE_CONFIRM_MS = 400;

/**
 * Reprise 2 — écritures GARDÉES (`write-guard.ts`) : un onglet n'écrit que si le stockage est celui qu'il a lu ou écrit
 * en dernier ; sinon rien n'est écrit, l'état à jour est relu et l'utilisateur est prévenu. Un écrasement par une
 * version non protégée est proposé à l'utilisateur au chargement (aucune écriture avant son choix).
 */
export function StoreProvider({ children, storage: injected, clock = realClock }: { children: ReactNode; storage?: KeyValueStorage; clock?: () => Clock }) {
  const backend = useRef(injected ? { storage: injected, persistent: true } : browserStorage());
  const initial = useRef<{ result: LoadResult; state: AppState; baseline: Baseline; overwrite: Overwrite | null; openError?: string } | null>(null);
  if (!initial.current) {
    const overwrite = detectOverwrite(backend.current.storage);
    const baseline = baselineOf(backend.current.storage);
    const result = loadState(backend.current.storage, clock().now);
    let state = result.state;
    let openError: string | undefined;
    if (result.status === 'ok' && !overwrite) {
      try { state = openWeek(state, clock()); } catch (e) { openError = errorCode(e); }
    }
    initial.current = { result, state, baseline, overwrite, ...(openError ? { openError } : {}) };
  }
  const [state, setState] = useState<AppState>(initial.current.state);
  const [load, setLoad] = useState<LoadResult['status']>(initial.current.result.status);
  const [overwrite, setOverwrite] = useState<Overwrite | null>(initial.current.overwrite);
  const [saveError, setSaveError] = useState<string>();
  const [toast, setToast] = useState<string | undefined>(() => {
    const init = initial.current;
    // Reprise RC5 (D3) : copie avant migration impossible (stockage plein…) — signalé, jamais silencieux.
    if (init?.result.status === 'ok' && init.result.premigrationError) return PREMIGRATION_FAILED_TEXT;
    const c = init?.openError;
    return c ? ERROR_MESSAGES[c] ?? 'La semaine n’a pas pu être préparée.' : undefined;
  });
  const stateRef = useRef(state);
  const baselineRef = useRef<Baseline>(initial.current.baseline);
  const overwriteRef = useRef<Overwrite | null>(initial.current.overwrite);
  const clocks = useRef(new SessionClocks());

  /**
   * Relit l'état enregistré (après un conflit ou une écriture d'un autre onglet) ; aucune écriture. Un autre onglet peut
   * être au milieu de ses trois écritures (copie, marque, état) : un écrasement apparent est donc CONFIRMÉ après un court
   * délai avant d'être proposé à l'utilisateur.
   */
  const reload = useCallback((confirmed = false) => {
    const storage = backend.current.storage;
    const found = detectOverwrite(storage);
    if (found && !confirmed) { setTimeout(() => reload(true), OVERWRITE_CONFIRM_MS); return; }
    baselineRef.current = baselineOf(storage);
    if (found) { overwriteRef.current = found; setOverwrite(found); return; }
    const result = loadState(storage, clock().now);
    if (result.status !== 'ok') { setLoad(result.status); return; }
    clocks.current.retain(result.state.programmeLogs);
    stateRef.current = result.state;
    setState(result.state);
  }, [clock]);

  /** Écriture gardée ; `false` si un autre onglet a écrit entre-temps (rien n'est écrit, l'état à jour est relu). */
  const commit = useCallback((next: AppState): boolean => {
    if (overwriteRef.current) return false;
    const r = guardedSave(backend.current.storage, next, baselineRef.current, clock().now);
    if (!r.ok && r.reason === 'conflict') { reload(); setToast(CONFLICT_TEXT); return false; }
    clocks.current.retain(next.programmeLogs);
    stateRef.current = next;
    setState(next);
    if (r.ok) baselineRef.current = r.baseline;
    setSaveError(r.ok ? undefined : r.error);
    return true;
  }, [clock, reload]);

  const apply = useCallback((f: (s: AppState, c: Clock) => AppState): boolean => {
    try {
      return commit(f(stateRef.current, clock()));
    } catch (e) {
      const code = errorCode(e);
      setToast(ERROR_MESSAGES[code] ?? 'Action impossible pour le moment.');
      return false;
    }
  }, [clock, commit]);

  // Pour un remplacement complet, conserver l'état courant si la sauvegarde échoue.
  const reset = useCallback((next: AppState): boolean => {
    if (overwriteRef.current) return false;
    const result = guardedSave(backend.current.storage, next, baselineRef.current, clock().now);
    if (!result.ok) {
      if (result.reason === 'conflict') { reload(); setToast(CONFLICT_TEXT); } else setSaveError(result.error);
      return false;
    }
    baselineRef.current = result.baseline;
    clocks.current.clear();
    stateRef.current = next;
    setState(next);
    setSaveError(undefined);
    setLoad('ok');
    return true;
  }, [clock, reload]);

  const chooseAfterOverwrite = useCallback((choice: 'restore' | 'keep') => {
    const found = overwriteRef.current;
    if (!found) return;
    baselineRef.current = resolveOverwrite(backend.current.storage, found, choice, clock().now);
    overwriteRef.current = null;
    setOverwrite(null);
    reload();
    // Puis même ouverture qu'au chargement (semaine préparée), en écriture gardée.
    try { const next = openWeek(stateRef.current, clock()); if (next !== stateRef.current) commit(next); } catch { /* conservé tel quel */ }
  }, [clock, commit, reload]);

  // Autre onglet : toute écriture de l'état ou de sa marque déclenche une relecture (navigateur seulement).
  useEffect(() => {
    if (injected) return undefined;
    const onStorage = (e: StorageEvent) => {
      // L'état est écrit EN DERNIER (après copie et marque) : seul son événement signale une écriture complète.
      if (e.key !== null && !e.key.endsWith(STORAGE_KEY)) return;
      if (sameBaseline(baselineOf(backend.current.storage), baselineRef.current)) return;
      reload();
      setToast(RELOADED_TEXT);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [injected, reload]);

  // Ouverture : la semaine préparée (clôture, planification) est enregistrée immédiatement.
  useEffect(() => {
    const init = initial.current;
    if (init && init.result.status === 'ok' && !init.overwrite && init.state !== init.result.state) commit(init.state);
  }, [commit]);

  // Retour au premier plan (autre jour, semaine suivante) : même ouverture qu'au chargement, sans bruit si inchangé.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || load !== 'ok' || overwriteRef.current) return;
      // Données changées pendant l'absence (autre onglet) : relues AVANT de préparer la semaine.
      if (!sameBaseline(baselineOf(backend.current.storage), baselineRef.current)) { reload(); return; }
      try { const next = openWeek(stateRef.current, clock()); if (next !== stateRef.current) commit(next); } catch { /* conservé tel quel */ }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [clock, commit, load]);

  const info = initial.current.result;
  const loadInfo = info.status === 'unreadable' ? `${info.problem} — copie conservée sous « ${info.backupKey} »` : info.status === 'newer_version' ? `version ${String(info.version)}` : undefined;
  const value = useMemo<Store>(() => ({
    state, load, sessionClocks: clocks.current, persistent: backend.current.persistent, clock, apply, reset, dismissToast: () => setToast(undefined),
    resolveOverwrite: chooseAfterOverwrite,
    ...(loadInfo ? { loadInfo } : {}), ...(saveError ? { saveError } : {}), ...(toast ? { toast } : {}), ...(overwrite ? { overwrite: { savedAt: overwrite.savedAt } } : {}),
  }), [state, load, loadInfo, saveError, toast, overwrite, clock, apply, reset, chooseAfterOverwrite]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider manquant');
  return s;
}
