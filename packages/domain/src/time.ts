import type { Brand } from './ids.js';

/**
 * Instant ISO 8601 avec fuseau (ex. "2026-09-28T18:00:00Z"). Le domaine ne lit jamais
 * l'horloge système : l'instant courant est injecté via EngineContext.now.
 */
export type ISODateTime = Brand<string, 'ISODateTime'>;
/** Date calendaire ISO (ex. "2026-09-28"). */
export type ISODate = Brand<string, 'ISODate'>;

const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isISODateTime(value: string): value is ISODateTime {
  return ISO_DATETIME.test(value) && !Number.isNaN(Date.parse(value));
}

export function isISODate(value: string): value is ISODate {
  return ISO_DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function asISODateTime(value: string): ISODateTime {
  if (!isISODateTime(value)) throw new TypeError(`Instant ISO invalide : "${value}"`);
  return value;
}

export function asISODate(value: string): ISODate {
  if (!isISODate(value)) throw new TypeError(`Date ISO invalide : "${value}"`);
  return value;
}

/** Millisecondes epoch d'un instant ISO (fonction pure : Date.parse d'une chaîne donnée). */
export function toEpochMs(value: ISODateTime): number {
  return Date.parse(value);
}

/** Heures écoulées entre deux instants (b − a). */
export function hoursBetween(a: ISODateTime, b: ISODateTime): number {
  const MS_PER_HOUR = 3_600_000; // technical-constant: conversion d'unités
  return (toEpochMs(b) - toEpochMs(a)) / MS_PER_HOUR;
}

/** Durée en secondes (nombre fini ≥ 0). */
export type Seconds = number;
