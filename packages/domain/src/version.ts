/** Versions sémantiques (moteur, ruleset, catalogue, schéma). */
export type SemVerString = `${number}.${number}.${number}${string}`;

export interface SemVer {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly prerelease?: string;
}

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?$/;

export function parseSemVer(value: string): SemVer | undefined {
  const m = SEMVER.exec(value);
  if (!m) return undefined;
  const [, major, minor, patch, prerelease] = m;
  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    ...(prerelease !== undefined ? { prerelease } : {}),
  };
}

export function isSemVer(value: string): value is SemVerString {
  return parseSemVer(value) !== undefined;
}

/** Compare deux versions : négatif si a < b, 0 si égales, positif si a > b. */
export function compareSemVer(a: string, b: string): number {
  const pa = parseSemVer(a);
  const pb = parseSemVer(b);
  if (!pa || !pb) throw new TypeError(`Version invalide : "${pa ? b : a}"`);
  if (pa.major !== pb.major) return pa.major - pb.major;
  if (pa.minor !== pb.minor) return pa.minor - pb.minor;
  if (pa.patch !== pb.patch) return pa.patch - pb.patch;
  if (pa.prerelease === pb.prerelease) return 0;
  if (pa.prerelease === undefined) return 1;
  if (pb.prerelease === undefined) return -1;
  return pa.prerelease < pb.prerelease ? -1 : 1;
}

/** Versions qui accompagnent toute sortie du moteur (spec 10 §2). */
export interface EngineVersions {
  readonly engineVersion: SemVerString;
  readonly rulesetVersion: SemVerString;
  readonly catalogVersion: SemVerString;
}
