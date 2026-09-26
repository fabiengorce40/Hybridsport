import { isISODateTime, isSemVer } from '@hybridsport/domain';
import type { ISODateTime, SemVerString } from '@hybridsport/domain';

/** Tout artefact versionné injecté dans le moteur (ruleset, catalogue). */
export interface VersionedArtifact {
  readonly version: SemVerString;
}

/**
 * Contexte d'exécution : TOUT ce qui pourrait rendre le moteur non déterministe est injecté
 * (instant courant, fuseau, graine, versions). Le moteur ne lit ni horloge, ni hasard,
 * ni environnement, ni réseau, ni stockage.
 */
export interface EngineContext<R extends VersionedArtifact = VersionedArtifact, C extends VersionedArtifact = VersionedArtifact> {
  readonly now: ISODateTime;
  readonly timezone: string;
  readonly seed: string;
  readonly engineVersion: SemVerString;
  readonly ruleset: R;
  readonly catalog: C;
}

export interface ContextIssue {
  readonly field: string;
  readonly problem: string;
}

/** Vérifie un contexte candidat ; renvoie la liste des problèmes (vide si valide). */
export function checkEngineContext(input: {
  now: string;
  timezone: string;
  seed: string;
  engineVersion: string;
  ruleset: { version: string };
  catalog: { version: string };
}): ContextIssue[] {
  const issues: ContextIssue[] = [];
  if (!isISODateTime(input.now)) issues.push({ field: 'now', problem: 'instant ISO 8601 avec fuseau attendu' });
  if (input.timezone.trim() === '') issues.push({ field: 'timezone', problem: 'fuseau requis' });
  if (input.seed.trim() === '') issues.push({ field: 'seed', problem: 'graine requise' });
  if (!isSemVer(input.engineVersion)) issues.push({ field: 'engineVersion', problem: 'SemVer attendu' });
  if (!isSemVer(input.ruleset.version)) issues.push({ field: 'ruleset.version', problem: 'SemVer attendu' });
  if (!isSemVer(input.catalog.version)) issues.push({ field: 'catalog.version', problem: 'SemVer attendu' });
  return issues;
}
