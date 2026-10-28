/** Aucun état n'est persisté : une nouvelle instance ne restaure jamais un ancien chrono. */
export type ClockInstant = { monotonic: number; wall: number };
export const clockInstant = (): ClockInstant => ({ monotonic: performance.now(), wall: Date.now() });
export type SessionClockValue = { accumulated: number; runningSince: ClockInstant | null; startedAt: string };
// Tolère l'imprécision de lecture des deux horloges ; ne déduit jamais quel temps est correct si elles divergent.
const MAX_CLOCK_DRIFT_MS = 2000;
export class SessionClocks {
  private readonly values = new Map<string, SessionClockValue>();
  get(id: string, startedAt: string): SessionClockValue | null {
    const value = this.values.get(id);
    return value?.startedAt === startedAt ? value : null;
  }
  start(id: string, startedAt: string, now: ClockInstant): void { this.values.set(id, { accumulated: 0, runningSince: now, startedAt }); }
  pause(id: string, startedAt: string, now: ClockInstant): void {
    const v = this.get(id, startedAt);
    if (!v || v.runningSince === null) return;
    const value = this.elapsed(id, startedAt, now);
    if (value !== null) this.values.set(id, { ...v, accumulated: value, runningSince: null });
  }
  resume(id: string, startedAt: string, now: ClockInstant): void {
    const v = this.get(id, startedAt);
    if (v && v.runningSince === null) this.values.set(id, { ...v, runningSince: now });
  }
  elapsed(id: string, startedAt: string, now: ClockInstant): number | null {
    const v = this.get(id, startedAt);
    if (!v) return null;
    if (v.runningSince === null) return v.accumulated;
    const mono = now.monotonic - v.runningSince.monotonic;
    const wall = now.wall - v.runningSince.wall;
    if (!Number.isFinite(mono) || !Number.isFinite(wall) || mono < 0 || wall < 0 || Math.abs(mono - wall) > MAX_CLOCK_DRIFT_MS) {
      this.values.delete(id);
      return null;
    }
    return v.accumulated + mono;
  }
  retain(logs: Record<string, { startedAt: string; finishedAt?: string }>): void {
    for (const [id, value] of this.values) {
      const log = logs[id];
      if (!log || log.finishedAt || log.startedAt !== value.startedAt) this.values.delete(id);
    }
  }
  clear(): void { this.values.clear(); }
}
