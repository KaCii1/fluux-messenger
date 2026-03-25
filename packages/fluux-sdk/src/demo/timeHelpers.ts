/**
 * Time-offset helpers for building demo data with relative timestamps.
 *
 * @packageDocumentation
 * @module Demo
 */

/** Returns a Date that is `minutes` minutes in the past. */
export function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60_000)
}

/** Returns a Date that is `hours` hours in the past. */
export function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 3_600_000)
}

/** Returns a Date that is `days` days in the past. */
export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000)
}
