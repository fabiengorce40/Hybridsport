/** Erreur applicative codée (module sans dépendance : importable partout sans cycle). */
export class AppError extends Error {
  constructor(readonly code: string) { super(code); }
}
