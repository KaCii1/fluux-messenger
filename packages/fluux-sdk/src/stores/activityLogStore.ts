import { createStore } from 'zustand/vanilla'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import type {
  ActivityEvent,
  ActivityEventInput,
  ActivityEventType,
  ActivityResolution,
} from '../core/types/activity'
import { generateUUID } from '../utils/uuid'
import { buildScopedStorageKey } from '../utils/storageScope'

const STORAGE_KEY_BASE = 'fluux:activity-log'
const MAX_EVENTS = 500

function getScopedStorageKey(jid?: string | null): string {
  return buildScopedStorageKey(STORAGE_KEY_BASE, jid)
}

/**
 * Activity log state interface.
 *
 * Manages a persistent, historical feed of notable events such as
 * subscription requests, room invitations, reactions to own messages,
 * and system notifications. Events can be actionable (require user
 * response) or informational (read-only history).
 *
 * @remarks
 * Most applications should use the `useActivityLog` hook instead of
 * accessing this store directly.
 *
 * @category Stores
 */
interface ActivityLogState {
  /** All logged events, newest first */
  events: ActivityEvent[]
  /** Set of muted ActivityEventType values */
  mutedTypes: Set<ActivityEventType>

  // Actions
  /** Add an event to the activity log. Returns the created event with generated ID. */
  addEvent: (input: ActivityEventInput) => ActivityEvent
  /** Mark a single event as read */
  markRead: (eventId: string) => void
  /** Mark all events as read */
  markAllRead: () => void
  /** Resolve an actionable event (accepted/rejected/dismissed) */
  resolveEvent: (eventId: string, resolution: ActivityResolution) => void
  /** Find an event by matching a predicate */
  findEvent: (predicate: (event: ActivityEvent) => boolean) => ActivityEvent | undefined
  /** Remove a single event */
  removeEvent: (eventId: string) => void
  /** Mute an event type (events still logged but marked as muted) */
  muteType: (type: ActivityEventType) => void
  /** Unmute an event type */
  unmuteType: (type: ActivityEventType) => void
  /** Check if an event type is muted */
  isMuted: (type: ActivityEventType) => boolean
  /** Count of unread, non-muted events */
  unreadCount: () => number
  /** Reset the store */
  reset: () => void
}

const initialState = {
  events: [] as ActivityEvent[],
  mutedTypes: new Set<ActivityEventType>(),
}

export const activityLogStore = createStore<ActivityLogState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...initialState,

        addEvent: (input) => {
          const state = get()
          const event: ActivityEvent = {
            ...input,
            id: generateUUID(),
            read: false,
            muted: state.mutedTypes.has(input.type),
          }
          set({
            events: [event, ...state.events].slice(0, MAX_EVENTS),
          })
          return event
        },

        markRead: (eventId) => {
          set((state) => ({
            events: state.events.map((e) =>
              e.id === eventId ? { ...e, read: true } : e
            ),
          }))
        },

        markAllRead: () => {
          set((state) => ({
            events: state.events.map((e) =>
              e.read ? e : { ...e, read: true }
            ),
          }))
        },

        resolveEvent: (eventId, resolution) => {
          set((state) => ({
            events: state.events.map((e) =>
              e.id === eventId ? { ...e, resolution, read: true } : e
            ),
          }))
        },

        findEvent: (predicate) => {
          return get().events.find(predicate)
        },

        removeEvent: (eventId) => {
          set((state) => ({
            events: state.events.filter((e) => e.id !== eventId),
          }))
        },

        muteType: (type) => {
          set((state) => {
            const newMuted = new Set(state.mutedTypes)
            newMuted.add(type)
            return { mutedTypes: newMuted }
          })
        },

        unmuteType: (type) => {
          set((state) => {
            const newMuted = new Set(state.mutedTypes)
            newMuted.delete(type)
            return { mutedTypes: newMuted }
          })
        },

        isMuted: (type) => {
          return get().mutedTypes.has(type)
        },

        unreadCount: () => {
          return get().events.filter((e) => !e.read && !e.muted).length
        },

        reset: () => {
          try {
            localStorage.removeItem(getScopedStorageKey())
          } catch {
            // Ignore storage errors
          }
          set(initialState)
        },
      }),
      {
        name: STORAGE_KEY_BASE,
        storage: {
          getItem: () => {
            try {
              const str = localStorage.getItem(getScopedStorageKey())
              if (!str) return null
              const parsed = JSON.parse(str)
              // Restore Date objects in events
              if (parsed.state?.events) {
                parsed.state.events = parsed.state.events.map(
                  (e: ActivityEvent) => ({
                    ...e,
                    timestamp: new Date(e.timestamp),
                  })
                )
              }
              // Restore Set from array
              if (parsed.state?.mutedTypes) {
                parsed.state.mutedTypes = new Set(parsed.state.mutedTypes)
              }
              return parsed
            } catch {
              return null
            }
          },
          setItem: (_name, value) => {
            try {
              const state = value.state as ActivityLogState
              const serialized = {
                events: state.events,
                mutedTypes: Array.from(state.mutedTypes),
              }
              localStorage.setItem(
                getScopedStorageKey(),
                JSON.stringify({ state: serialized })
              )
            } catch {
              // Ignore storage errors
            }
          },
          removeItem: () => {
            try {
              localStorage.removeItem(getScopedStorageKey())
            } catch {
              // Ignore storage errors
            }
          },
        },
        partialize: (state) => ({
          events: state.events,
          mutedTypes: state.mutedTypes,
        } as unknown as ActivityLogState),
      }
    )
  )
)

export type { ActivityLogState }
