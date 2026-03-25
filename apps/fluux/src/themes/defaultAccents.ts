import type { AccentPreset } from './types'

/**
 * Universal accent presets used when a theme doesn't provide its own.
 * Each preset includes dark and light HSL values tuned for good contrast
 * on typical dark/light backgrounds.
 */
export const DEFAULT_ACCENT_PRESETS: AccentPreset[] = [
  {
    name: 'Blue',
    dark:  { h: 217, s: 92, l: 76 },
    light: { h: 217, s: 92, l: 50 },
  },
  {
    name: 'Purple',
    dark:  { h: 267, s: 84, l: 81 },
    light: { h: 267, s: 83, l: 58 },
  },
  {
    name: 'Pink',
    dark:  { h: 316, s: 72, l: 86 },
    light: { h: 316, s: 72, l: 49 },
  },
  {
    name: 'Red',
    dark:  { h: 343, s: 81, l: 75 },
    light: { h: 343, s: 81, l: 47 },
  },
  {
    name: 'Orange',
    dark:  { h: 23, s: 92, l: 75 },
    light: { h: 23, s: 92, l: 50 },
  },
  {
    name: 'Yellow',
    dark:  { h: 41, s: 86, l: 83 },
    light: { h: 41, s: 86, l: 42 },
  },
  {
    name: 'Green',
    dark:  { h: 115, s: 54, l: 76 },
    light: { h: 115, s: 54, l: 40 },
  },
  {
    name: 'Teal',
    dark:  { h: 170, s: 57, l: 73 },
    light: { h: 170, s: 57, l: 38 },
  },
  {
    name: 'Sky',
    dark:  { h: 189, s: 71, l: 73 },
    light: { h: 189, s: 71, l: 40 },
  },
  {
    name: 'Lavender',
    dark:  { h: 232, s: 97, l: 85 },
    light: { h: 232, s: 97, l: 58 },
  },
]
