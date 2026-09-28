/** Dates civiles (AAAA-MM-JJ) et instants ISO, sans horloge système : l'instant courant est toujours injecté. */
import { asISODateTime } from '@hybridsport/domain';
import type { ISODateTime } from '@hybridsport/domain';

// technical-constant: conversion calendaire
const MS_PER_DAY = 86_400_000;

const toMs = (date: string): number => Date.parse(`${date}T00:00:00Z`);
// technical-constant: longueur de la date ISO AAAA-MM-JJ
const fromMs = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

export function addDays(date: string, days: number): string {
  return fromMs(toMs(date) + days * MS_PER_DAY);
}

/** Jour de la semaine, lundi = 0 … dimanche = 6. */
export function weekdayIndex(date: string): number {
  // technical-constant: getUTCDay renvoie 0 pour dimanche ; décalage vers lundi = 0
  return (new Date(toMs(date)).getUTCDay() + 6) % 7;
}

export function weekStartOf(date: string): string {
  return addDays(date, -weekdayIndex(date));
}

export function daysBetween(a: string, b: string): number {
  return Math.round((toMs(b) - toMs(a)) / MS_PER_DAY);
}

/**
 * Instant de référence d'une séance planifiée, transmis au moteur comme `now` (déterministe) : midi UTC du
 * jour, qui reste le même jour civil en Europe.
 */
export function sessionInstant(date: string): ISODateTime {
  return asISODateTime(`${date}T12:00:00Z`);
}

/** Normalise un instant (sans millisecondes) au format accepté par les moteurs. */
export function normalizeInstant(iso: string): ISODateTime {
  // technical-constant: longueur de l’instant ISO sans millisecondes
  return asISODateTime(`${iso.slice(0, 19)}Z`);
}

export function dateOf(instant: string): string {
  // technical-constant: longueur de la date ISO AAAA-MM-JJ
  return instant.slice(0, 10);
}
