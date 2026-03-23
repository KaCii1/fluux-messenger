import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import type { Message, RoomMessage } from '../core/types'
import { setStorageScopeJid, _resetStorageScopeForTesting } from './storageScope'

// Must import after fake-indexeddb/auto
import {
  initSearchIndex,
  indexMessage,
  indexMessages,
  removeMessage,
  updateMessage,
  search,
  closeSearchIndex,
  tokenize,
  _resetDBForTesting,
} from './searchIndex'

// =============================================================================
// Test helpers
// =============================================================================

function createChatMessage(conversationId: string, overrides: Partial<Message> = {}): Message {
  return {
    type: 'chat',
    id: `msg-${Math.random().toString(36).slice(2)}`,
    conversationId,
    from: 'user@example.com',
    body: 'Test message',
    timestamp: new Date(),
    isOutgoing: false,
    ...overrides,
  }
}

function createRoomMessage(roomJid: string, overrides: Partial<RoomMessage> = {}): RoomMessage {
  return {
    type: 'groupchat',
    id: `room-msg-${Math.random().toString(36).slice(2)}`,
    roomJid,
    from: `${roomJid}/user`,
    body: 'Test room message',
    timestamp: new Date(),
    isOutgoing: false,
    nick: 'user',
    ...overrides,
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('searchIndex', () => {
  beforeEach(() => {
    _resetStorageScopeForTesting()
    globalThis.indexedDB = new IDBFactory()
    _resetDBForTesting()
    setStorageScopeJid('test@example.com')
  })

  afterEach(async () => {
    await closeSearchIndex()
  })

  // ===========================================================================
  // tokenize
  // ===========================================================================

  describe('tokenize', () => {
    it('should split text into lowercase tokens', () => {
      expect(tokenize('Hello World')).toEqual(['hello', 'world'])
    })

    it('should drop single-character tokens', () => {
      expect(tokenize('I am a test')).toEqual(['am', 'test'])
    })

    it('should handle punctuation', () => {
      expect(tokenize('hello, world! how are you?')).toEqual(['hello', 'world', 'how', 'are', 'you'])
    })

    it('should handle empty string', () => {
      expect(tokenize('')).toEqual([])
    })

    it('should handle unicode text', () => {
      expect(tokenize('café résumé')).toEqual(['café', 'résumé'])
    })

    it('should split on hyphens and underscores', () => {
      expect(tokenize('well-known under_score')).toEqual(['well', 'known', 'under', 'score'])
    })
  })

  // ===========================================================================
  // indexMessage + search
  // ===========================================================================

  describe('indexMessage and search', () => {
    it('should index a chat message and find it by keyword', async () => {
      const msg = createChatMessage('alice@example.com', {
        body: 'Hello world from Alice',
      })

      await indexMessage(msg)

      const results = await search('hello')
      expect(results).toHaveLength(1)
      expect(results[0].body).toBe('Hello world from Alice')
      expect(results[0].conversationId).toBe('alice@example.com')
      expect(results[0].isRoom).toBe(false)
    })

    it('should index a room message and find it', async () => {
      const msg = createRoomMessage('room@conference.example.com', {
        body: 'Meeting notes for today',
        stanzaId: 'stanza-123',
      })

      await indexMessage(msg)

      const results = await search('meeting')
      expect(results).toHaveLength(1)
      expect(results[0].conversationId).toBe('room@conference.example.com')
      expect(results[0].isRoom).toBe(true)
    })

    it('should find messages matching ALL query terms (AND logic)', async () => {
      await indexMessage(createChatMessage('alice@example.com', {
        body: 'The quick brown fox',
      }))
      await indexMessage(createChatMessage('bob@example.com', {
        body: 'The quick red car',
      }))

      const results = await search('quick brown')
      expect(results).toHaveLength(1)
      expect(results[0].body).toBe('The quick brown fox')
    })

    it('should support prefix matching on the last query term', async () => {
      await indexMessage(createChatMessage('alice@example.com', {
        body: 'conversation about coffee',
      }))

      const results = await search('coff')
      expect(results).toHaveLength(1)
      expect(results[0].body).toBe('conversation about coffee')
    })

    it('should support prefix matching with multi-word queries', async () => {
      await indexMessage(createChatMessage('alice@example.com', {
        body: 'quarterly report deadline approaching',
      }))
      await indexMessage(createChatMessage('bob@example.com', {
        body: 'quarterly earnings report',
      }))

      // 'quarterly' exact, 'rep' prefix → matches both
      const results = await search('quarterly rep')
      expect(results).toHaveLength(2)
    })

    it('should return empty for non-matching query', async () => {
      await indexMessage(createChatMessage('alice@example.com', {
        body: 'Hello world',
      }))

      const results = await search('nonexistent')
      expect(results).toHaveLength(0)
    })

    it('should return empty for empty query', async () => {
      await indexMessage(createChatMessage('alice@example.com', {
        body: 'Hello world',
      }))

      const results = await search('')
      expect(results).toHaveLength(0)
    })

    it('should return empty for single-char query', async () => {
      await indexMessage(createChatMessage('alice@example.com', {
        body: 'Hello world',
      }))

      // Single char tokens are filtered out
      const results = await search('h')
      expect(results).toHaveLength(0)
    })

    it('should be case-insensitive', async () => {
      await indexMessage(createChatMessage('alice@example.com', {
        body: 'HELLO World',
      }))

      const results = await search('hello')
      expect(results).toHaveLength(1)
    })
  })

  // ===========================================================================
  // Result ordering and limits
  // ===========================================================================

  describe('result ordering and limits', () => {
    it('should sort results by timestamp descending (newest first)', async () => {
      const older = new Date('2024-01-01T10:00:00Z')
      const newer = new Date('2024-06-01T10:00:00Z')

      await indexMessage(createChatMessage('alice@example.com', {
        id: 'old-msg',
        body: 'hello from the past',
        timestamp: older,
      }))
      await indexMessage(createChatMessage('alice@example.com', {
        id: 'new-msg',
        body: 'hello from the future',
        timestamp: newer,
      }))

      const results = await search('hello')
      expect(results).toHaveLength(2)
      expect(results[0].timestamp).toBe(newer.getTime())
      expect(results[1].timestamp).toBe(older.getTime())
    })

    it('should respect limit option', async () => {
      for (let i = 0; i < 10; i++) {
        await indexMessage(createChatMessage('alice@example.com', {
          id: `msg-${i}`,
          body: `test message number ${i}`,
          timestamp: new Date(Date.now() - i * 1000),
        }))
      }

      const results = await search('test', { limit: 3 })
      expect(results).toHaveLength(3)
    })
  })

  // ===========================================================================
  // Conversation filtering
  // ===========================================================================

  describe('conversation filtering', () => {
    it('should filter results by conversationId', async () => {
      await indexMessage(createChatMessage('alice@example.com', {
        body: 'secret plans for lunch',
      }))
      await indexMessage(createChatMessage('bob@example.com', {
        body: 'secret meeting agenda',
      }))

      const results = await search('secret', { conversationId: 'alice@example.com' })
      expect(results).toHaveLength(1)
      expect(results[0].conversationId).toBe('alice@example.com')
    })

    it('should filter room messages by roomJid', async () => {
      await indexMessage(createRoomMessage('dev@conference.example.com', {
        body: 'deploy the feature branch',
        stanzaId: 'stanza-1',
      }))
      await indexMessage(createRoomMessage('general@conference.example.com', {
        body: 'deploy to production',
        stanzaId: 'stanza-2',
      }))

      const results = await search('deploy', { conversationId: 'dev@conference.example.com' })
      expect(results).toHaveLength(1)
      expect(results[0].conversationId).toBe('dev@conference.example.com')
    })
  })

  // ===========================================================================
  // Idempotency and deduplication
  // ===========================================================================

  describe('idempotency', () => {
    it('should not duplicate when indexing the same message twice', async () => {
      const msg = createChatMessage('alice@example.com', {
        id: 'same-id',
        body: 'Hello world',
      })

      await indexMessage(msg)
      await indexMessage(msg)

      const results = await search('hello')
      expect(results).toHaveLength(1)
    })
  })

  // ===========================================================================
  // Skipped messages
  // ===========================================================================

  describe('message filtering', () => {
    it('should skip messages with no body', async () => {
      await indexMessage(createChatMessage('alice@example.com', {
        body: '',
      }))

      const results = await search('')
      expect(results).toHaveLength(0)
    })

    it('should skip retracted messages', async () => {
      await indexMessage(createChatMessage('alice@example.com', {
        body: 'This was retracted',
        isRetracted: true,
      }))

      const results = await search('retracted')
      expect(results).toHaveLength(0)
    })

    it('should skip noStore messages', async () => {
      await indexMessage(createChatMessage('alice@example.com', {
        body: 'Ephemeral message',
        noStore: true,
      }))

      const results = await search('ephemeral')
      expect(results).toHaveLength(0)
    })
  })

  // ===========================================================================
  // removeMessage
  // ===========================================================================

  describe('removeMessage', () => {
    it('should remove a message from the index', async () => {
      const msg = createChatMessage('alice@example.com', {
        body: 'Temporary message',
      })

      await indexMessage(msg)
      expect(await search('temporary')).toHaveLength(1)

      await removeMessage(msg)
      expect(await search('temporary')).toHaveLength(0)
    })

    it('should not affect other messages when removing one', async () => {
      const msg1 = createChatMessage('alice@example.com', {
        body: 'Keep this hello',
      })
      const msg2 = createChatMessage('bob@example.com', {
        body: 'Remove this hello',
      })

      await indexMessage(msg1)
      await indexMessage(msg2)
      expect(await search('hello')).toHaveLength(2)

      await removeMessage(msg2)
      const results = await search('hello')
      expect(results).toHaveLength(1)
      expect(results[0].conversationId).toBe('alice@example.com')
    })

    it('should handle removing non-existent message gracefully', async () => {
      const msg = createChatMessage('alice@example.com', {
        body: 'Never indexed',
      })

      // Should not throw
      await removeMessage(msg)
    })
  })

  // ===========================================================================
  // updateMessage
  // ===========================================================================

  describe('updateMessage', () => {
    it('should update the body of a corrected message', async () => {
      const msg = createChatMessage('alice@example.com', {
        id: 'correctable',
        body: 'Original text',
      })

      await indexMessage(msg)
      expect(await search('original')).toHaveLength(1)

      const corrected = { ...msg, body: 'Corrected text', isEdited: true }
      await updateMessage(corrected)

      expect(await search('original')).toHaveLength(0)
      expect(await search('corrected')).toHaveLength(1)
    })
  })

  // ===========================================================================
  // indexMessages (batch)
  // ===========================================================================

  describe('indexMessages (batch)', () => {
    it('should index multiple messages in one call', async () => {
      const messages = [
        createChatMessage('alice@example.com', { body: 'Batch message one' }),
        createChatMessage('alice@example.com', { body: 'Batch message two' }),
        createChatMessage('bob@example.com', { body: 'Batch message three' }),
      ]

      await indexMessages(messages)

      const results = await search('batch')
      expect(results).toHaveLength(3)
    })

    it('should skip non-indexable messages in batch', async () => {
      const messages = [
        createChatMessage('alice@example.com', { body: 'Valid message' }),
        createChatMessage('alice@example.com', { body: '', }), // empty body
        createChatMessage('alice@example.com', { body: 'Retracted', isRetracted: true }),
        createChatMessage('alice@example.com', { body: 'No store', noStore: true }),
      ]

      await indexMessages(messages)

      const results = await search('message')
      expect(results).toHaveLength(1)
    })

    it('should handle empty array', async () => {
      await indexMessages([])
      // Should not throw
    })
  })

  // ===========================================================================
  // Multi-account isolation
  // ===========================================================================

  describe('multi-account isolation', () => {
    it('should isolate search indexes per account', async () => {
      // Index as alice
      setStorageScopeJid('alice@example.com')
      _resetDBForTesting()
      await indexMessage(createChatMessage('friend@example.com', {
        body: 'Alice private message',
      }))

      // Switch to bob
      await closeSearchIndex()
      setStorageScopeJid('bob@example.com')
      _resetDBForTesting()
      await indexMessage(createChatMessage('friend@example.com', {
        body: 'Bob private message',
      }))

      // Search as bob should only find bob's message
      const bobResults = await search('private')
      expect(bobResults).toHaveLength(1)
      expect(bobResults[0].body).toBe('Bob private message')

      // Switch back to alice
      await closeSearchIndex()
      setStorageScopeJid('alice@example.com')
      _resetDBForTesting()
      const aliceResults = await search('private')
      expect(aliceResults).toHaveLength(1)
      expect(aliceResults[0].body).toBe('Alice private message')
    })
  })

  // ===========================================================================
  // Mixed chat and room messages
  // ===========================================================================

  describe('mixed message types', () => {
    it('should search across both chat and room messages', async () => {
      await indexMessage(createChatMessage('alice@example.com', {
        body: 'project update from DM',
      }))
      await indexMessage(createRoomMessage('dev@conference.example.com', {
        body: 'project update from room',
        stanzaId: 'stanza-room-1',
      }))

      const results = await search('project update')
      expect(results).toHaveLength(2)

      const roomResult = results.find((r) => r.isRoom)
      const chatResult = results.find((r) => !r.isRoom)
      expect(roomResult).toBeDefined()
      expect(chatResult).toBeDefined()
    })
  })

  // ===========================================================================
  // initSearchIndex
  // ===========================================================================

  describe('initSearchIndex', () => {
    it('should create the database without errors', async () => {
      await closeSearchIndex()
      _resetDBForTesting()
      await expect(initSearchIndex('user@example.com')).resolves.not.toThrow()
    })
  })
})
