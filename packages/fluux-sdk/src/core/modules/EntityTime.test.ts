import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EntityTime, parseTzo, getBestResource } from './EntityTime'
import { createMockElement, createMockStores } from '../test-utils'
import type { Element } from '@xmpp/client'
import type { ModuleDependencies } from './BaseModule'
import type { ResourcePresence } from '../types'

describe('parseTzo', () => {
  it('parses positive offsets', () => {
    expect(parseTzo('+01:00')).toBe(60)
    expect(parseTzo('+05:30')).toBe(330)
    expect(parseTzo('+12:00')).toBe(720)
  })

  it('parses negative offsets', () => {
    expect(parseTzo('-05:00')).toBe(-300)
    expect(parseTzo('-03:30')).toBe(-210)
    expect(parseTzo('-12:00')).toBe(-720)
  })

  it('parses zero offsets', () => {
    expect(parseTzo('Z')).toBe(0)
    expect(parseTzo('+00:00')).toBe(0)
    expect(parseTzo('-00:00')).toBe(0)
  })

  it('returns 0 for invalid formats', () => {
    expect(parseTzo('invalid')).toBe(0)
    expect(parseTzo('')).toBe(0)
    expect(parseTzo('1:00')).toBe(0)
  })
})

describe('getBestResource', () => {
  it('returns null for empty map', () => {
    expect(getBestResource(new Map())).toBeNull()
  })

  it('returns the only resource when there is one', () => {
    const resources = new Map<string, ResourcePresence>([
      ['mobile', { show: null, priority: 0 }],
    ])
    expect(getBestResource(resources)).toBe('mobile')
  })

  it('picks the higher priority resource', () => {
    const resources = new Map<string, ResourcePresence>([
      ['mobile', { show: null, priority: 0 }],
      ['desktop', { show: null, priority: 10 }],
    ])
    expect(getBestResource(resources)).toBe('desktop')
  })

  it('picks the more available resource on priority tie', () => {
    const resources = new Map<string, ResourcePresence>([
      ['mobile', { show: 'away', priority: 5 }],
      ['desktop', { show: null, priority: 5 }],  // null = online, more available
    ])
    expect(getBestResource(resources)).toBe('desktop')
  })

  it('prefers higher priority over better availability', () => {
    const resources = new Map<string, ResourcePresence>([
      ['mobile', { show: 'dnd', priority: 10 }],
      ['desktop', { show: 'chat', priority: 0 }],
    ])
    expect(getBestResource(resources)).toBe('mobile')
  })
})

describe('EntityTime module', () => {
  let entityTime: EntityTime
  let mockStores: ReturnType<typeof createMockStores>
  let sendIQ: ReturnType<typeof vi.fn<ModuleDependencies['sendIQ']>>

  beforeEach(() => {
    mockStores = createMockStores()
    sendIQ = vi.fn<ModuleDependencies['sendIQ']>()

    entityTime = new EntityTime({
      stores: mockStores,
      sendStanza: vi.fn(),
      sendIQ,
      getCurrentJid: () => 'user@example.com',
      emit: vi.fn(),
      emitSDK: vi.fn(),
      getXmpp: () => null,
    })
  })

  describe('handle', () => {
    it('returns false for all stanzas (no incoming handling)', () => {
      const stanza = createMockElement('iq', { type: 'get' })
      expect(entityTime.handle(stanza)).toBe(false)
    })
  })

  describe('queryTime', () => {
    it('returns null when contact has no resources (offline)', async () => {
      mockStores.roster.getContact.mockReturnValue({
        jid: 'alice@example.com',
        name: 'Alice',
        presence: 'offline',
        subscription: 'both',
        resources: new Map(),
      })

      const result = await entityTime.queryTime('alice@example.com')
      expect(result).toBeNull()
      expect(sendIQ).not.toHaveBeenCalled()
    })

    it('returns null when contact is not found', async () => {
      mockStores.roster.getContact.mockReturnValue(undefined)

      const result = await entityTime.queryTime('nobody@example.com')
      expect(result).toBeNull()
    })

    it('sends IQ to best resource and parses response', async () => {
      mockStores.roster.getContact.mockReturnValue({
        jid: 'alice@example.com',
        name: 'Alice',
        presence: 'online',
        subscription: 'both',
        resources: new Map([
          ['mobile', { show: 'away', priority: 0 }],
          ['desktop', { show: null, priority: 5 }],
        ]),
      })

      const responseElement = createMockElement('iq', { type: 'result' }, [
        {
          name: 'time',
          attrs: { xmlns: 'urn:xmpp:time' },
          children: [
            { name: 'tzo', text: '+01:00' },
            { name: 'utc', text: '2026-03-16T14:30:00Z' },
          ],
        },
      ])
      sendIQ.mockResolvedValue(responseElement as unknown as Element)

      const result = await entityTime.queryTime('alice@example.com')

      expect(result).not.toBeNull()
      expect(result!.offsetMinutes).toBe(60)
      expect(result!.queriedAt).toBeGreaterThan(0)

      // Should have sent to the best resource (desktop, priority 5)
      const sentIQ = sendIQ.mock.calls[0][0]
      expect(sentIQ.attrs.to).toBe('alice@example.com/desktop')
    })

    it('returns cached result on second call', async () => {
      mockStores.roster.getContact.mockReturnValue({
        jid: 'alice@example.com',
        name: 'Alice',
        presence: 'online',
        subscription: 'both',
        resources: new Map([['web', { show: null, priority: 0 }]]),
      })

      const responseElement = createMockElement('iq', { type: 'result' }, [
        {
          name: 'time',
          attrs: { xmlns: 'urn:xmpp:time' },
          children: [
            { name: 'tzo', text: '-05:00' },
            { name: 'utc', text: '2026-03-16T09:30:00Z' },
          ],
        },
      ])
      sendIQ.mockResolvedValue(responseElement as unknown as Element)

      const first = await entityTime.queryTime('alice@example.com')
      const second = await entityTime.queryTime('alice@example.com')

      expect(first).toEqual(second)
      expect(sendIQ).toHaveBeenCalledTimes(1) // Only one IQ sent
    })

    it('returns null when sendIQ throws (feature not supported)', async () => {
      mockStores.roster.getContact.mockReturnValue({
        jid: 'alice@example.com',
        name: 'Alice',
        presence: 'online',
        subscription: 'both',
        resources: new Map([['web', { show: null, priority: 0 }]]),
      })

      sendIQ.mockRejectedValue(new Error('feature-not-implemented'))

      const result = await entityTime.queryTime('alice@example.com')
      expect(result).toBeNull()
    })

    it('returns null when response has no time element', async () => {
      mockStores.roster.getContact.mockReturnValue({
        jid: 'alice@example.com',
        name: 'Alice',
        presence: 'online',
        subscription: 'both',
        resources: new Map([['web', { show: null, priority: 0 }]]),
      })

      const responseElement = createMockElement('iq', { type: 'result' })
      sendIQ.mockResolvedValue(responseElement as unknown as Element)

      const result = await entityTime.queryTime('alice@example.com')
      expect(result).toBeNull()
    })

    it('avoids duplicate in-flight queries for same JID', async () => {
      mockStores.roster.getContact.mockReturnValue({
        jid: 'alice@example.com',
        name: 'Alice',
        presence: 'online',
        subscription: 'both',
        resources: new Map([['web', { show: null, priority: 0 }]]),
      })

      // Create a promise that we control
      let resolveIQ: (value: any) => void
      sendIQ.mockReturnValue(new Promise((resolve) => { resolveIQ = resolve }))

      // Start two queries simultaneously
      const promise1 = entityTime.queryTime('alice@example.com')
      const promise2 = entityTime.queryTime('alice@example.com')

      // Second call should return null (in-flight guard)
      const result2 = await promise2
      expect(result2).toBeNull()

      // Resolve the first query
      const responseElement = createMockElement('iq', { type: 'result' }, [
        {
          name: 'time',
          attrs: { xmlns: 'urn:xmpp:time' },
          children: [
            { name: 'tzo', text: '+02:00' },
            { name: 'utc', text: '2026-03-16T16:30:00Z' },
          ],
        },
      ])
      resolveIQ!(responseElement)

      const result1 = await promise1
      expect(result1).not.toBeNull()
      expect(result1!.offsetMinutes).toBe(120)

      // Only one IQ was sent
      expect(sendIQ).toHaveBeenCalledTimes(1)
    })
  })

  describe('clearCache', () => {
    it('clears cached results', async () => {
      mockStores.roster.getContact.mockReturnValue({
        jid: 'alice@example.com',
        name: 'Alice',
        presence: 'online',
        subscription: 'both',
        resources: new Map([['web', { show: null, priority: 0 }]]),
      })

      const responseElement = createMockElement('iq', { type: 'result' }, [
        {
          name: 'time',
          attrs: { xmlns: 'urn:xmpp:time' },
          children: [
            { name: 'tzo', text: '+01:00' },
            { name: 'utc', text: '2026-03-16T14:30:00Z' },
          ],
        },
      ])
      sendIQ.mockResolvedValue(responseElement as unknown as Element)

      await entityTime.queryTime('alice@example.com')
      expect(entityTime.getCached('alice@example.com')).not.toBeNull()

      entityTime.clearCache()
      expect(entityTime.getCached('alice@example.com')).toBeNull()
    })
  })

  describe('getCached', () => {
    it('returns null when no cached data', () => {
      expect(entityTime.getCached('alice@example.com')).toBeNull()
    })
  })
})
