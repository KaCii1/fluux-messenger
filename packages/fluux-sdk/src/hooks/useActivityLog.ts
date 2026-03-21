import { useCallback, useMemo } from 'react'
import { activityLogStore } from '../stores'
import { useActivityLogStore } from '../react/storeHooks'
import type { ActivityEvent, ActivityEventType, ActivityResolution } from '../core/types/activity'

/**
 * Hook for accessing the activity log — a persistent, historical feed
 * of notable events (subscription requests, room invitations, reactions,
 * system notifications).
 *
 * @returns Activity log state and actions
 *
 * @example Displaying unread activity count
 * ```tsx
 * function ActivityBadge() {
 *   const { unreadCount } = useActivityLog()
 *   if (unreadCount === 0) return null
 *   return <span className="badge">{unreadCount}</span>
 * }
 * ```
 *
 * @example Listing recent events
 * ```tsx
 * function ActivityFeed() {
 *   const { events, markRead } = useActivityLog()
 *   return (
 *     <ul>
 *       {events.map(event => (
 *         <li key={event.id} onClick={() => markRead(event.id)}>
 *           {event.type}: {JSON.stringify(event.payload)}
 *         </li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 *
 * @category Hooks
 */
export function useActivityLog() {
  const events = useActivityLogStore((s) => s.events)
  const mutedTypes = useActivityLogStore((s) => s.mutedTypes)

  const unreadCount = useMemo(
    () => events.filter((e) => !e.read && !e.muted).length,
    [events]
  )

  const actionableEvents = useMemo(
    () => events.filter((e) => e.kind === 'actionable' && e.resolution === 'pending'),
    [events]
  )

  const markRead = useCallback((eventId: string) => {
    activityLogStore.getState().markRead(eventId)
  }, [])

  const markAllRead = useCallback(() => {
    activityLogStore.getState().markAllRead()
  }, [])

  const resolveEvent = useCallback((eventId: string, resolution: ActivityResolution) => {
    activityLogStore.getState().resolveEvent(eventId, resolution)
  }, [])

  const muteType = useCallback((type: ActivityEventType) => {
    activityLogStore.getState().muteType(type)
  }, [])

  const unmuteType = useCallback((type: ActivityEventType) => {
    activityLogStore.getState().unmuteType(type)
  }, [])

  return useMemo(
    () => ({
      events,
      unreadCount,
      actionableEvents,
      mutedTypes,
      markRead,
      markAllRead,
      resolveEvent,
      muteType,
      unmuteType,
    }),
    [events, unreadCount, actionableEvents, mutedTypes, markRead, markAllRead, resolveEvent, muteType, unmuteType]
  )
}

export type { ActivityEvent, ActivityEventType, ActivityResolution }
