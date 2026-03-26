/**
 * Tutorial step definitions — each maps to a stepId fired by the animation timeline.
 *
 * Text content (content / actionHint) lives in the tutorial i18n namespace
 * (see locales/*.ts), keyed by step id. The fields on TutorialStep are optional
 * fallbacks only.
 *
 * Selectors target stable attributes:
 *   - [data-nav="<view>"] on sidebar nav buttons (via IconRailNavLink)
 *   - [aria-label="..."] on action buttons
 *   - Tailwind utility classes for structural elements (message images, scroll containers)
 */

import type { TutorialStep } from './types'

export const TUTORIAL_STEPS: TutorialStep[] = [
  // ── Act 1: Conversation basics ──────────────────────────────────────
  {
    id: 'lightbox-hint',
    targetSelector: 'main img.max-w-full',
    position: 'bottom',
    completionTrigger: { type: 'dom-appears', selector: '.fixed.inset-0.bg-black\\/90' },
    maxWaitMs: 45_000,
  },

  // ── Act 2: Rich media ──────────────────────────────────────────────
  {
    id: 'image-lightbox',
    targetSelector: 'main img.max-w-full',
    position: 'bottom',
    completionTrigger: { type: 'dom-appears', selector: '.fixed.inset-0.bg-black\\/90' },
    maxWaitMs: 45_000,
  },
  {
    id: 'file-upload-hint',
    targetSelector: 'button[aria-label*="ttach"], button[aria-label*="ichier"]',
    position: 'top',
    completionTrigger: { type: 'timeout', ms: 8_000 },
    maxWaitMs: 30_000,
  },

  // ── Act 3: Rooms & activity ─────────────────────────────────────────
  {
    id: 'poll-hint',
    targetSelector: '[data-nav="rooms"]',
    position: 'right',
    completionTrigger: { type: 'timeout', ms: 12_000 },
    maxWaitMs: 30_000,
  },
  {
    id: 'activity-log-hint',
    targetSelector: '[data-nav="events"]',
    position: 'right',
    completionTrigger: { type: 'click', selector: '[data-nav="events"]' },
    maxWaitMs: 30_000,
  },

  // ── Act 4: Search, mentions & keyboard ──────────────────────────────
  {
    id: 'search-hint',
    targetSelector: '[data-nav="search"]',
    position: 'right',
    completionTrigger: { type: 'click', selector: '[data-nav="search"]' },
    maxWaitMs: 45_000,
  },
  {
    id: 'mention-hint',
    targetSelector: '[data-nav="rooms"]',
    position: 'right',
    completionTrigger: { type: 'timeout', ms: 10_000 },
    maxWaitMs: 30_000,
  },
  {
    id: 'keyboard-shortcuts-hint',
    targetSelector: 'body',
    position: 'bottom',
    completionTrigger: { type: 'dom-appears', selector: '[role="dialog"]' },
    maxWaitMs: 30_000,
  },

  // ── Act 5: Customization & moderation ───────────────────────────────
  {
    id: 'theme-hint',
    targetSelector: '[data-nav="settings"]',
    position: 'right',
    completionTrigger: { type: 'navigate', hash: '#/settings' },
    maxWaitMs: 45_000,
  },
  {
    id: 'language-hint',
    targetSelector: '[data-nav="settings"]',
    position: 'right',
    completionTrigger: { type: 'timeout', ms: 12_000 },
    maxWaitMs: 30_000,
  },
  {
    id: 'message-deletion-hint',
    targetSelector: '[data-nav="rooms"]',
    position: 'right',
    completionTrigger: { type: 'timeout', ms: 10_000 },
    maxWaitMs: 30_000,
  },
  {
    id: 'muc-management-hint',
    targetSelector: '[data-nav="rooms"]',
    position: 'right',
    completionTrigger: { type: 'dom-appears', selector: '[role="dialog"]' },
    maxWaitMs: 30_000,
  },
  {
    id: 'room-members-hint',
    targetSelector: '[data-nav="rooms"]',
    position: 'right',
    completionTrigger: { type: 'dom-appears', selector: '[role="dialog"]' },
    maxWaitMs: 30_000,
  },

  // ── Act 6: Admin & developer tools ──────────────────────────────────
  {
    id: 'admin-hint',
    targetSelector: '[data-nav="admin"]',
    position: 'right',
    completionTrigger: { type: 'click', selector: '[data-nav="admin"]' },
    maxWaitMs: 30_000,
  },
  {
    id: 'xmpp-console-hint',
    targetSelector: '[data-nav="settings"]',
    position: 'right',
    completionTrigger: { type: 'timeout', ms: 10_000 },
    maxWaitMs: 30_000,
  },
  {
    id: 'history-hint',
    targetSelector: 'main .overflow-y-auto',
    position: 'top',
    completionTrigger: { type: 'timeout', ms: 10_000 },
    maxWaitMs: 30_000,
  },
  {
    id: 'tour-complete',
    targetSelector: 'body',
    position: 'bottom',
    completionTrigger: { type: 'timeout', ms: 15_000 },
    maxWaitMs: 20_000,
  },
]

/** Lookup a tutorial step by ID. */
export function getTutorialStep(stepId: string): TutorialStep | undefined {
  return TUTORIAL_STEPS.find(s => s.id === stepId)
}
