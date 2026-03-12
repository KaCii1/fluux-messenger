/**
 * XMPPClient vCard Tests
 *
 * Tests for fetchVCard() method (XEP-0054 vcard-temp):
 * - Parsing full name, organisation, email, country
 * - Handling missing fields
 * - Handling errors
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { XMPPClient } from '../XMPPClient'
import {
  createMockXmppClient,
  createMockStores,
  createMockElement,
  type MockXmppClient,
  type MockStoreBindings,
} from '../test-utils'

let mockXmppClientInstance: MockXmppClient

const { mockClientFactory, mockXmlFn } = vi.hoisted(() => {
  let clientInstance: MockXmppClient | null = null
  return {
    mockClientFactory: Object.assign(
      vi.fn(() => clientInstance),
      {
        _setInstance: (instance: MockXmppClient | any) => { clientInstance = instance },
      }
    ),
    mockXmlFn: vi.fn((name: string, attrs?: Record<string, string>, ...children: unknown[]) => ({
      name,
      attrs: attrs || {},
      children,
      toString: () => `<${name}/>`,
    })),
  }
})

vi.mock('@xmpp/client', () => ({
  client: mockClientFactory,
  xml: mockXmlFn,
}))

vi.mock('@xmpp/debug', () => ({
  default: vi.fn(),
}))

describe('XMPPClient fetchVCard', () => {
  let xmppClient: XMPPClient
  let mockStores: MockStoreBindings

  beforeEach(async () => {
    vi.useFakeTimers()
    mockXmppClientInstance = createMockXmppClient()
    mockClientFactory.mockClear()
    mockClientFactory._setInstance(mockXmppClientInstance)

    mockStores = createMockStores()
    xmppClient = new XMPPClient({ debug: false })
    xmppClient.bindStores(mockStores)

    // Connect the client
    const connectPromise = xmppClient.connect({
      jid: 'user@example.com',
      password: 'secret',
      server: 'example.com',
      skipDiscovery: true,
    })
    mockXmppClientInstance._emit('online', { jid: { toString: () => 'user@example.com/resource' } })
    await connectPromise
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('should return all vCard fields when present', async () => {
    const vcardResponse = createMockElement('iq', { type: 'result' }, [
      {
        name: 'vCard',
        attrs: { xmlns: 'vcard-temp' },
        children: [
          { name: 'FN', text: 'Alice Smith' },
          {
            name: 'ORG',
            children: [{ name: 'ORGNAME', text: 'Acme Corp' }],
          },
          {
            name: 'EMAIL',
            children: [{ name: 'USERID', text: 'alice@acme.com' }],
          },
          {
            name: 'ADR',
            children: [{ name: 'CTRY', text: 'France' }],
          },
        ],
      },
    ])

    mockXmppClientInstance.iqCaller.request.mockResolvedValue(vcardResponse)

    const result = await xmppClient.profile.fetchVCard('alice@example.com')

    expect(result).toEqual({
      fullName: 'Alice Smith',
      org: 'Acme Corp',
      email: 'alice@acme.com',
      country: 'France',
    })
  })

  it('should return partial vCard when only some fields are present', async () => {
    const vcardResponse = createMockElement('iq', { type: 'result' }, [
      {
        name: 'vCard',
        attrs: { xmlns: 'vcard-temp' },
        children: [
          { name: 'FN', text: 'Bob Jones' },
        ],
      },
    ])

    mockXmppClientInstance.iqCaller.request.mockResolvedValue(vcardResponse)

    const result = await xmppClient.profile.fetchVCard('bob@example.com')

    expect(result).toEqual({
      fullName: 'Bob Jones',
      org: undefined,
      email: undefined,
      country: undefined,
    })
  })

  it('should return null when vCard has no relevant fields', async () => {
    const vcardResponse = createMockElement('iq', { type: 'result' }, [
      {
        name: 'vCard',
        attrs: { xmlns: 'vcard-temp' },
        children: [
          {
            name: 'PHOTO',
            children: [{ name: 'BINVAL', text: 'base64data' }],
          },
        ],
      },
    ])

    mockXmppClientInstance.iqCaller.request.mockResolvedValue(vcardResponse)

    const result = await xmppClient.profile.fetchVCard('charlie@example.com')

    expect(result).toBeNull()
  })

  it('should return null when vCard element is missing', async () => {
    const emptyResponse = createMockElement('iq', { type: 'result' })

    mockXmppClientInstance.iqCaller.request.mockResolvedValue(emptyResponse)

    const result = await xmppClient.profile.fetchVCard('missing@example.com')

    expect(result).toBeNull()
  })

  it('should return null on IQ error', async () => {
    mockXmppClientInstance.iqCaller.request.mockRejectedValue(
      new Error('item-not-found')
    )

    const result = await xmppClient.profile.fetchVCard('error@example.com')

    expect(result).toBeNull()
  })

  it('should work with occupant JID (room@conf/nick)', async () => {
    const vcardResponse = createMockElement('iq', { type: 'result' }, [
      {
        name: 'vCard',
        attrs: { xmlns: 'vcard-temp' },
        children: [
          { name: 'FN', text: 'Room User' },
          {
            name: 'ORG',
            children: [{ name: 'ORGNAME', text: 'Some Org' }],
          },
        ],
      },
    ])

    mockXmppClientInstance.iqCaller.request.mockResolvedValue(vcardResponse)

    const result = await xmppClient.profile.fetchVCard('room@conference.example.com/nick')

    expect(result).toEqual({
      fullName: 'Room User',
      org: 'Some Org',
      email: undefined,
      country: undefined,
    })

    // Verify IQ was sent
    expect(mockXmppClientInstance.iqCaller.request).toHaveBeenCalled()
  })
})
