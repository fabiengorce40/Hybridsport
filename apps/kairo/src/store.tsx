/**
 * État de l'application : chargement versionné, transitions via app-core uniquement, sauvegarde après
 * chaque transition. Aucun échec (lecture, écriture, action refusée) n'est silencieux.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppError, ensureBeta0Week, ensureCurrentWeek, isBeta0, loadState, MemoryStorage, saveState } from '@hybridsport/app-core';
import { ERROR_TEXT } from './present.js';
import type { AppState, Clock, KeyValueStorage, LoadResult } from '@hybridsport/app-core';

/** Horloge réelle (l'interface est la seule couche qui lit l'heure système). */
export function realClock(): Clock {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return { now: d.toISOString(), today: `${String(d.getFullYear())}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` };
}

function browserStorage(): { storage: KeyValueStorage; persistent: boolean } {
  try {
    const ls = window.localStorage;
    const probe = 'kairo.probe';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return { storage: ls, persistent: true };
  } catch {
    return { storage: new MemoryStorage(), persistent: false };
  }
}

export interface Store {
  readonly state: AppState;
  readonly load: LoadResult['status'];
  readonly loadInfo?: string;
  readonly persistent: boolean;
  readonly saveError?: string;
  readonly toast?: string;
  readonly clock: () => Clock;
  /** Applique une transition d'app-core ; renvoie false si elle est refusée (message affiché). */
  apply(f: (s: AppState, clock: Clock) => AppState): boolean;
  /** Recommencer (après lecture impossible : la sauvegarde illisible est déjà conservée à part). */
  reset(next: AppState): void;
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

export function StoreProvider({ children, storage: injected, clock = realClock }: { children: ReactNode; storage?: KeyValueStorage; clock?: () => Clock }) {
  const backend = useRef(injected ? { storage: injected, persistent: true } : browserStorage());
  const initial = useRef<{ result: LoadResult; state: AppState; openError?: string } | null>(null);
  if (!initial.current) {
    const result = loadState(backend.current.storage, clock().now);
    let state = result.state;
    let openError: string | undefined;
    if (result.status === 'ok') {
      try { state = openWeek(state, clock()); } catch (e) { openError = errorCode(e); }
    }
    initial.current = { result, state, ...(openError ? { openError } : {}) };
  }
  const [state, setState] = useState<AppState>(initial.current.state);
  const [load, setLoad] = useState<LoadResult['status']>(initial.current.result.status);
  const [saveError, setSaveError] = useState<string>();
  const [toast, setToast] = useState<string | undefined>(() => { const c = initial.current?.openError; return c ? ERROR_MESSAGES[c] ?? 'La semaine n’a pas pu être préparée.' : undefined; });
  const stateRef = useRef(state);

  const commit = useCallback((next: AppState) => {
    stateRef.current = next;
    setState(next);
    const r = saveState(backend.current.storage, next);
    setSaveError(r.ok ? undefined : r.error);
  }, []);

  const apply = useCallback((f: (s: AppState, c: Clock) => AppState): boolean => {
    try {
      commit(f(stateRef.current, clock()));
      return true;
    } catch (e) {
      const code = errorCode(e);
      setToast(ERROR_MESSAGES[code] ?? 'Action impossible pour le moment.');
      return false;
    }
  }, [clock, commit]);

  const reset = useCallback((next: AppState) => { setLoad('ok'); commit(next); }, [commit]);

  // Ouverture : la semaine préparée (clôture, planification) est enregistrée immédiatement.
  useEffect(() => {
    const init = initial.current;
    if (init && init.result.status === 'ok' && init.state !== init.result.state) commit(init.state);
  }, [commit]);

  // Retour au premier plan (autre jour, semaine suivante) : même ouverture qu'au chargement, sans bruit si inchangé.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || load !== 'ok') return;
      try { const next = openWeek(stateRef.current, clock()); if (next !== stateRef.current) commit(next); } catch { /* conservé tel quel */ }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [clock, commit, load]);

  const info = initial.current.result;
  const loadInfo = info.status === 'unreadable' ? `${info.problem} — copie conservée sous « ${info.backupKey} »` : info.status === 'newer_version' ? `version ${String(info.version)}` : undefined;
  const value = useMemo<Store>(() => ({
    state, load, persistent: backend.current.persistent, clock, apply, reset, dismissToast: () => setToast(undefined),
    ...(loadInfo ? { loadInfo } : {}), ...(saveError ? { saveError } : {}), ...(toast ? { toast } : {}),
  }), [state, load, loadInfo, saveError, toast, clock, apply, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider manquant');
  return s;
}
