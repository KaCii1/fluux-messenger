/**
 * Shared utilities for lastMessage timestamp comparison and filtering.
 *
 * These functions help determine when to update the lastMessage preview
 * for conversations and rooms, used by both chatStore and roomStore.
 */

import type { RoomMessage } from '../../core/types'
import { ignoreStore, isMessageFromIgnoredUser } from '../ignoreStore'

/**
 * Generic interface for messages with an optional timestamp.
 * Both Message and RoomMessage satisfy this interface.
 */
export interface MessageWithTimestamp {
  timestamp?: Date
}

/**
 * Determines if a new message should replace an existing lastMessage.
 *
 * The new message should only replace the existing one if it has a newer timestamp.
 * This prevents older messages (e.g., from MAM pagination) from overwriting
 * more recent previews.
 *
 * @param existing - The current lastMessage (may be undefined)
 * @param newMessage - The candidate message to potentially use as lastMessage
 * @returns true if newMessage is newer and should replace existing
 *
 * @example
 * ```typescript
 * // In chatStore.updateLastMessagePreview
 * if (!shouldUpdateLastMessage(meta.lastMessage, newMessage)) {
 *   return state // Keep existing, new message is older
 * }
 *
 * // In roomStore.updateLastMessagePreview
 * if (!shouldUpdateLastMessage(room.lastMessage, newMessage)) {
 *   return state
 * }
 * ```
 */
export function shouldUpdateLastMessage<T extends MessageWithTimestamp>(
  existing: T | undefined,
  newMessage: T
): boolean {
  const existingTime = existing?.timestamp?.getTime() ?? 0
  const newTime = newMessage.timestamp?.getTime() ?? 0
  return newTime > existingTime
}

/**
 * Find the last message in an array that is not from an ignored user.
 *
 * Fast path: if the ignore list for the room is empty, returns the last
 * message immediately with zero filtering overhead.
 *
 * @param messages - Array of room messages (assumed sorted by timestamp)
 * @param roomJid - The room JID to look up ignored users for
 * @param nickToJidCache - Optional nick-to-JID cache for JID-based matching
 * @returns The last non-ignored message, or undefined if all are ignored
 */
export function findLastNonIgnoredMessage(
  messages: RoomMessage[],
  roomJid: string,
  nickToJidCache?: Map<string, string>,
): RoomMessage | undefined {
  if (messages.length === 0) return undefined

  const ignoredUsers = ignoreStore.getState().getIgnoredForRoom(roomJid)
  // Fast path: no ignored users, return last message directly
  if (ignoredUsers.length === 0) return messages[messages.length - 1]

  // Iterate backward to find the last non-ignored message
  for (let i = messages.length - 1; i >= 0; i--) {
    if (!isMessageFromIgnoredUser(ignoredUsers, messages[i], nickToJidCache)) {
      return messages[i]
    }
  }
  return undefined
}
