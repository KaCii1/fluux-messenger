/**
 * Poll utility functions — pure functions for building, parsing, and tallying polls.
 *
 * Polls use XEP-0444 reactions as the voting mechanism. Each poll option
 * maps to a numbered emoji, and voting = sending a reaction with that emoji.
 *
 * @packageDocumentation
 * @module Poll
 */

import type { Element } from '@xmpp/client'
import type { PollData, PollOption, PollSettings, PollClosedData } from './types/message-base'

/** The numbered emoji set used for poll options (index 0 = 1️⃣, etc.) */
export const POLL_OPTION_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'] as const

/** Maximum number of poll options */
export const MAX_POLL_OPTIONS = POLL_OPTION_EMOJIS.length

/** Default poll settings */
export const DEFAULT_POLL_SETTINGS: PollSettings = {
  allowMultiple: false,
}

/**
 * Build PollData from a question and option labels.
 */
export function buildPollData(
  question: string,
  optionLabels: string[],
  settings: Partial<PollSettings> = {},
): PollData {
  if (optionLabels.length < 2 || optionLabels.length > MAX_POLL_OPTIONS) {
    throw new Error(`Poll must have 2-${MAX_POLL_OPTIONS} options, got ${optionLabels.length}`)
  }

  const options: PollOption[] = optionLabels.map((label, i) => ({
    emoji: POLL_OPTION_EMOJIS[i],
    label,
  }))

  return {
    question,
    options,
    settings: { ...DEFAULT_POLL_SETTINGS, ...settings },
  }
}

/**
 * Build the text fallback body for legacy clients.
 *
 * @example
 * ```
 * 📊 Poll: What for lunch?
 * 1️⃣ Pizza
 * 2️⃣ Sushi
 * 3️⃣ Tacos
 * ```
 */
export function buildPollFallbackBody(question: string, optionLabels: string[]): string {
  const header = `📊 Poll: ${question}`
  const lines = optionLabels.map((label, i) => `${POLL_OPTION_EMOJIS[i]} ${label}`)
  return [header, ...lines].join('\n')
}

/**
 * Parse a `<poll xmlns="urn:fluux:poll:0">` element into PollData.
 */
export function parsePollElement(pollEl: Element): PollData | null {
  const questionText = pollEl.getChildText('question')
  if (!questionText) return null

  const optionEls = pollEl.getChildren('option')
  if (optionEls.length < 2) return null

  const options: PollOption[] = optionEls
    .map((el) => ({
      emoji: el.attrs.emoji as string,
      label: el.getText() || '',
    }))
    .filter((opt) => opt.emoji && opt.label)

  if (options.length < 2) return null

  const allowMultiple = pollEl.attrs['allow-multiple'] === 'true'

  return {
    question: questionText,
    options,
    settings: { allowMultiple },
  }
}

/**
 * Result entry for a single poll option.
 */
export interface PollTally {
  /** The option emoji */
  emoji: string
  /** The option label */
  label: string
  /** List of voter identifiers (JIDs or nicks) */
  voters: string[]
  /** Number of votes */
  count: number
}

/**
 * Tally poll results from a reactions map.
 *
 * Returns one entry per option with voter list and count,
 * in the same order as the poll options.
 */
export function tallyPollResults(
  poll: PollData,
  reactions: Record<string, string[]> | undefined,
): PollTally[] {
  return poll.options.map((opt) => {
    const voters = reactions?.[opt.emoji] ?? []
    return {
      emoji: opt.emoji,
      label: opt.label,
      voters,
      count: voters.length,
    }
  })
}

/**
 * Get the total number of unique voters across all options.
 */
export function getTotalVoters(
  poll: PollData,
  reactions: Record<string, string[]> | undefined,
): number {
  const uniqueVoters = new Set<string>()
  for (const opt of poll.options) {
    const voters = reactions?.[opt.emoji]
    if (voters) {
      for (const voter of voters) {
        uniqueVoters.add(voter)
      }
    }
  }
  return uniqueVoters.size
}

/**
 * Enforce single-vote mode: when voting for a new option,
 * remove any other poll-option emojis from the current reaction set.
 * Non-poll emojis (like 👍) are preserved.
 *
 * @param currentReactions - The user's current reaction emojis on this message
 * @param newVote - The poll-option emoji being voted for
 * @param pollEmojis - The set of emojis used by this poll's options
 * @returns The filtered emoji array to send as the new reaction set
 */
export function enforceSingleVote(
  currentReactions: string[],
  newVote: string,
  pollEmojis: string[],
): string[] {
  const pollEmojiSet = new Set(pollEmojis)

  // Keep non-poll emojis, remove all poll emojis
  const nonPollReactions = currentReactions.filter((emoji) => !pollEmojiSet.has(emoji))

  // Check if we're toggling off the current vote
  const isTogglingOff = currentReactions.includes(newVote)
  if (isTogglingOff) {
    return nonPollReactions
  }

  // Add the new vote
  return [...nonPollReactions, newVote]
}

/**
 * Enforce multi-vote mode: toggle the voted emoji in the current reaction set.
 * This is the standard reaction toggle behavior.
 *
 * @param currentReactions - The user's current reaction emojis on this message
 * @param toggledEmoji - The poll-option emoji being toggled
 * @returns The updated emoji array
 */
export function enforceMultiVote(
  currentReactions: string[],
  toggledEmoji: string,
): string[] {
  if (currentReactions.includes(toggledEmoji)) {
    return currentReactions.filter((e) => e !== toggledEmoji)
  }
  return [...currentReactions, toggledEmoji]
}

/**
 * Check whether a user has voted on a poll.
 *
 * @param poll - The poll data
 * @param reactions - The message's reactions map
 * @param myId - The current user's identifier (JID or nick)
 * @returns True if the user has voted for at least one option
 */
export function hasVotedOnPoll(
  poll: PollData,
  reactions: Record<string, string[]> | undefined,
  myId: string,
): boolean {
  return poll.options.some((opt) => reactions?.[opt.emoji]?.includes(myId))
}

/**
 * Get the option emojis for a poll.
 */
export function getPollOptionEmojis(poll: PollData): string[] {
  return poll.options.map((opt) => opt.emoji)
}

/**
 * Parse a `<poll-closed xmlns="urn:fluux:poll:0">` element into PollClosedData.
 *
 * Sent by the poll creator to freeze and broadcast the final result.
 */
export function parsePollClosedElement(el: Element): PollClosedData | null {
  const pollMessageId = el.attrs['message-id']
  if (!pollMessageId) return null

  const question = el.getChildText('question')
  if (!question) return null

  const tallyEls = el.getChildren('tally')
  const results = tallyEls
    .map((t) => ({
      emoji: t.attrs.emoji as string,
      count: parseInt(t.attrs.count as string, 10) || 0,
    }))
    .filter((r) => r.emoji)

  return { question, pollMessageId, results }
}
