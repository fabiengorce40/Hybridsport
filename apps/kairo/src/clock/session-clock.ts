/** Horloges limitées à cette instance de l'application : jamais lues ni écrites dans le stockage. */
export type SessionClockValue = { accumulated: number; runningSince: number | null; startedAt: string };
export class SessionClocks {
  private readonly values = new Map<string, SessionClockValue>();
  get(id: string, startedAt: string): SessionClockValue | null {
    const value = this.values.get(id);
    return value?.startedAt === startedAt ? value : null;
  }
  start(id: string, startedAt: string, now: number): void { this.values.set(id, { accumulated: 0, runningSince: now, startedAt }); }
  pause(id: string, startedAt: string, now: number): void {
    const v = this.get(id, startedAt);
    if (v && v.runningSince !== null) this.values.set(id, { ...v, accumulated: v.accumulated + Math.max(0, now - v.runningSince), runningSince: null });
  }
  resume(id: string, startedAt: string, now: number): void {
    const v = this.get(id, startedAt);
    if (v && v.runningSince === null) this.values.set(id, { ...v, runningSince: now });
  }
  elapsed(id: string, startedAt: string, now: number): number | null {
    const v = this.get(id, startedAt);
    return v ? v.accumulated + (v.runningSince === null ? 0 : Math.max(0, now - v.runningSince)) : null;
  }
  retain(logs: Record<string, { startedAt: string; finishedAt?: string }>): void {
    for (const [id, value] of this.values) {
      const log = logs[id];
      if (!log || log.finishedAt || log.startedAt !== value.startedAt) this.values.delete(id);
    }
  }
  clear(): void { this.values.clear(); }
}
