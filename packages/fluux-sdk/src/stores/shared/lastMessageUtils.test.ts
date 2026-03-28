import { describe, expect, it, beforeEach, vi } from 'vitest'

// Mock localStorage (needed by ignoreStore persist middleware)
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })

// Mock persist middleware as a pass-through so ignoreStore works without real storage
vi.mock('zustand/middleware', () => ({
  persist: (fn: unknown) => fn,
}))

import { shouldUpdateLastMessage, findLastNonIgnoredMessage } from './lastMessageUtils'
import { ignoreStore } from '../ignoreStore'
import type { RoomMessage } from '../../core/types'

describe('shouldUpdateLastMessage', () => {
  it('should return true when existing is undefined', () => {
    const newMessage = { timestamp: new Date('2024-01-15T10:00:00Z') }
    expect(shouldUpdateLastMessage(undefined, newMessage)).toBe(true)
  })

  it('should return true when new message is newer', () => {
    const existing = { timestamp: new Date('2024-01-15T09:00:00Z') }
    const newMessage = { timestamp: new Date('2024-01-15T10:00:00Z') }
    expect(shouldUpdateLastMessage(existing, newMessage)).toBe(true)
  })

  it('should return false when new message is older', () => {
    const existing = { timestamp: new Date('2024-01-15T10:00:00Z') }
    const newMessage = { timestamp: new Date('2024-01-15T09:00:00Z') }
    expect(shouldUpdateLastMessage(existing, newMessage)).toBe(false)
  })

  it('should return false when timestamps are equal', () => {
    const timestamp = new Date('2024-01-15T10:00:00Z')
    const existing = { timestamp }
    const newMessage = { timestamp: new Date(timestamp.getTime()) }
    expect(shouldUpdateLastMessage(existing, newMessage)).toBe(false)
  })

  it('should return true when existing has no timestamp but new message does', () => {
    const existing = {} // No timestamp
    const newMessage = { timestamp: new Date('2024-01-15T10:00:00Z') }
    expect(shouldUpdateLastMessage(existing, newMessage)).toBe(true)
  })

  it('should return false when neither has a timestamp', () => {
    const existing = {}
    const newMessage = {}
    expect(shouldUpdateLastMessage(existing, newMessage)).toBe(false)
  })

  it('should handle messages with additional properties', () => {
    const existing = {
      id: 'old-1',
      body: 'Old message',
      timestamp: new Date('2024-01-15T09:00:00Z'),
    }
    const newMessage = {
      id: 'new-1',
      body: 'New message',
      timestamp: new Date('2024-01-15T10:00:00Z'),
    }
    expect(shouldUpdateLastMessage(existing, newMessage)).toBe(true)
  })
})

describe('findLastNonIgnoredMessage', () => {
  const roomJid = 'room@conference.example.com'

  function makeRoomMessage(overrides: Partial<RoomMessage> & { nick: string }): RoomMessage {
    return {
      type: 'groupchat',
      id: `msg-${overrides.nick}-${Date.now()}`,
      roomJid,
      from: `${roomJid}/${overrides.nick}`,
      body: `Message from ${overrides.nick}`,
      timestamp: new Date(),
      isOutgoing: false,
      ...overrides,
    }
  }

  beforeEach(() => {
    ignoreStore.getState().reset()
  })

  it('should return the last message when no users are ignored', () => {
    const messages = [
      makeRoomMessage({ nick: 'alice', id: 'msg-1' }),
      makeRoomMessage({ nick: 'bob', id: 'msg-2' }),
    ]
    expect(findLastNonIgnoredMessage(messages, roomJid)).toBe(messages[1])
  })

  it('should return undefined for empty array', () => {
    expect(findLastNonIgnoredMessage([], roomJid)).toBeUndefined()
  })

  it('should skip ignored user and return previous message', () => {
    ignoreStore.getState().addIgnored(roomJid, { identifier: 'bob', displayName: 'Bob' })
    const messages = [
      makeRoomMessage({ nick: 'alice', id: 'msg-1' }),
      makeRoomMessage({ nick: 'bob', id: 'msg-2' }),
    ]
    expect(findLastNonIgnoredMessage(messages, roomJid)).toBe(messages[0])
  })

  it('should return undefined when all messages are from ignored users', () => {
    ignoreStore.getState().addIgnored(roomJid, { identifier: 'alice', displayName: 'Alice' })
    ignoreStore.getState().addIgnored(roomJid, { identifier: 'bob', displayName: 'Bob' })
    const messages = [
      makeRoomMessage({ nick: 'alice', id: 'msg-1' }),
      makeRoomMessage({ nick: 'bob', id: 'msg-2' }),
    ]
    expect(findLastNonIgnoredMessage(messages, roomJid)).toBeUndefined()
  })

  it('should match by occupantId when available', () => {
    ignoreStore.getState().addIgnored(roomJid, { identifier: 'occ-123', displayName: 'Bad User' })
    const messages = [
      makeRoomMessage({ nick: 'alice', id: 'msg-1' }),
      makeRoomMessage({ nick: 'differentnick', id: 'msg-2', occupantId: 'occ-123' }),
    ]
    expect(findLastNonIgnoredMessage(messages, roomJid)).toBe(messages[0])
  })

  it('should match by JID via nickToJidCache', () => {
    ignoreStore.getState().addIgnored(roomJid, { identifier: 'bad@example.com', displayName: 'Bad' })
    const cache = new Map([['sneaky', 'bad@example.com']])
    const messages = [
      makeRoomMessage({ nick: 'alice', id: 'msg-1' }),
      makeRoomMessage({ nick: 'sneaky', id: 'msg-2' }),
    ]
    expect(findLastNonIgnoredMessage(messages, roomJid, cache)).toBe(messages[0])
  })

  it('should skip multiple consecutive ignored messages', () => {
    ignoreStore.getState().addIgnored(roomJid, { identifier: 'spam1', displayName: 'Spam1' })
    ignoreStore.getState().addIgnored(roomJid, { identifier: 'spam2', displayName: 'Spam2' })
    const messages = [
      makeRoomMessage({ nick: 'alice', id: 'msg-1' }),
      makeRoomMessage({ nick: 'spam1', id: 'msg-2' }),
      makeRoomMessage({ nick: 'spam2', id: 'msg-3' }),
    ]
    expect(findLastNonIgnoredMessage(messages, roomJid)).toBe(messages[0])
  })

  it('should not filter messages from other rooms', () => {
    ignoreStore.getState().addIgnored('other-room@conference.example.com', { identifier: 'bob', displayName: 'Bob' })
    const messages = [
      makeRoomMessage({ nick: 'bob', id: 'msg-1' }),
    ]
    // Bob is ignored in another room, not this one
    expect(findLastNonIgnoredMessage(messages, roomJid)).toBe(messages[0])
  })
})
