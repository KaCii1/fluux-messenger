/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useConsole } from './useConsole'
import { consoleStore } from '../stores'
import { XMPPProvider } from '../provider'

// Wrapper component that provides XMPP context
function wrapper({ children }: { children: ReactNode }) {
  return <XMPPProvider>{children}</XMPPProvider>
}

describe('useConsole hook', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Reset store state before each test
    consoleStore.getState().reset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  /** Flush the batching timer so pending entries appear in the store. */
  function flushBatch() {
    act(() => { vi.advanceTimersByTime(200) })
  }

  describe('state reactivity', () => {
    it('should reflect isOpen state from store', () => {
      const { result } = renderHook(() => useConsole(), { wrapper })

      expect(result.current.isOpen).toBe(false)

      act(() => {
        consoleStore.getState().setOpen(true)
      })

      expect(result.current.isOpen).toBe(true)
    })

    it('should reflect height state from store', () => {
      const { result } = renderHook(() => useConsole(), { wrapper })

      // Default height is 300
      expect(result.current.height).toBe(300)

      act(() => {
        consoleStore.getState().setHeight(500)
      })

      expect(result.current.height).toBe(500)
    })

    it('should reflect entries from store after batch flush', () => {
      const { result } = renderHook(() => useConsole(), { wrapper })

      expect(result.current.entries).toHaveLength(0)

      act(() => {
        consoleStore.getState().addPacket('incoming', '<message>Hello</message>')
      })

      flushBatch()

      expect(result.current.entries).toHaveLength(1)
      expect(result.current.entries[0].type).toBe('incoming')
      expect(result.current.entries[0].content).toBe('<message>Hello</message>')
    })

  })

  describe('toggle action', () => {
    it('should toggle isOpen state', () => {
      const { result } = renderHook(() => useConsole(), { wrapper })

      expect(result.current.isOpen).toBe(false)

      act(() => {
        result.current.toggle()
      })

      expect(result.current.isOpen).toBe(true)

      act(() => {
        result.current.toggle()
      })

      expect(result.current.isOpen).toBe(false)
    })
  })

  describe('setOpen action', () => {
    it('should set isOpen to true', () => {
      const { result } = renderHook(() => useConsole(), { wrapper })

      act(() => {
        result.current.setOpen(true)
      })

      expect(result.current.isOpen).toBe(true)
    })

    it('should set isOpen to false', () => {
      const { result } = renderHook(() => useConsole(), { wrapper })

      // First open it
      act(() => {
        result.current.setOpen(true)
      })

      expect(result.current.isOpen).toBe(true)

      // Then close it
      act(() => {
        result.current.setOpen(false)
      })

      expect(result.current.isOpen).toBe(false)
    })
  })

  describe('setHeight action', () => {
    it('should set height', () => {
      const { result } = renderHook(() => useConsole(), { wrapper })

      act(() => {
        result.current.setHeight(400)
      })

      expect(result.current.height).toBe(400)
    })

    it('should allow any positive height value', () => {
      const { result } = renderHook(() => useConsole(), { wrapper })

      act(() => {
        result.current.setHeight(100)
      })
      expect(result.current.height).toBe(100)

      act(() => {
        result.current.setHeight(1000)
      })
      expect(result.current.height).toBe(1000)
    })
  })

  describe('clearEntries action', () => {
    it('should clear all entries', () => {
      const { result } = renderHook(() => useConsole(), { wrapper })

      // Add some entries and flush
      act(() => {
        consoleStore.getState().addPacket('incoming', '<message/>')
        consoleStore.getState().addPacket('outgoing', '<iq/>')
        consoleStore.getState().addEvent('Connected', 'connection')
      })
      flushBatch()

      expect(result.current.entries).toHaveLength(3)

      act(() => {
        result.current.clearEntries()
      })

      expect(result.current.entries).toHaveLength(0)
    })
  })

  describe('entry types', () => {
    it('should handle incoming packets', () => {
      const { result } = renderHook(() => useConsole(), { wrapper })

      act(() => {
        consoleStore.getState().addPacket('incoming', '<message from="alice@example.com"/>')
      })
      flushBatch()

      const entry = result.current.entries[0]
      expect(entry.type).toBe('incoming')
      expect(entry.content).toContain('alice@example.com')
      expect(entry.timestamp).toBeInstanceOf(Date)
      expect(entry.id).toBeDefined()
    })

    it('should handle outgoing packets', () => {
      const { result } = renderHook(() => useConsole(), { wrapper })

      act(() => {
        consoleStore.getState().addPacket('outgoing', '<message to="bob@example.com"/>')
      })
      flushBatch()

      const entry = result.current.entries[0]
      expect(entry.type).toBe('outgoing')
      expect(entry.content).toContain('bob@example.com')
    })

    it('should handle event entries', () => {
      const { result } = renderHook(() => useConsole(), { wrapper })

      act(() => {
        consoleStore.getState().addEvent('Connection established', 'connection')
      })
      flushBatch()

      const entry = result.current.entries[0]
      expect(entry.type).toBe('event')
      expect(entry.content).toBe('Connection established')
      expect(entry.eventCategory).toBe('connection')
    })

    it('should handle different event categories', () => {
      const { result } = renderHook(() => useConsole(), { wrapper })

      act(() => {
        consoleStore.getState().addEvent('Connected', 'connection')
        consoleStore.getState().addEvent('Error occurred', 'error')
        consoleStore.getState().addEvent('SM ack received', 'sm')
        consoleStore.getState().addEvent('Presence sent', 'presence')
      })
      flushBatch()

      expect(result.current.entries[0].eventCategory).toBe('connection')
      expect(result.current.entries[1].eventCategory).toBe('error')
      expect(result.current.entries[2].eventCategory).toBe('sm')
      expect(result.current.entries[3].eventCategory).toBe('presence')
    })
  })

  describe('entry limit', () => {
    it('should limit entries to MAX_ENTRIES (2000)', () => {
      const { result } = renderHook(() => useConsole(), { wrapper })

      // Add more than 2000 entries
      act(() => {
        for (let i = 0; i < 2010; i++) {
          consoleStore.getState().addPacket('incoming', `<message id="${i}"/>`)
        }
      })
      flushBatch()

      expect(result.current.entries).toHaveLength(2000)
      // Should keep the most recent entries
      expect(result.current.entries[1999].content).toContain('id="2009"')
    })
  })

  describe('batching', () => {
    it('should batch multiple entries into a single store update', () => {
      const { result } = renderHook(() => useConsole(), { wrapper })

      act(() => {
        consoleStore.getState().addPacket('incoming', '<message id="1"/>')
        consoleStore.getState().addPacket('incoming', '<message id="2"/>')
        consoleStore.getState().addPacket('incoming', '<message id="3"/>')
      })

      // Before flush, entries should still be empty
      expect(result.current.entries).toHaveLength(0)

      flushBatch()

      // After flush, all three arrive together
      expect(result.current.entries).toHaveLength(3)
    })
  })

  describe('multiple renders', () => {
    it('should maintain consistency across multiple hook renders', () => {
      const { result: result1 } = renderHook(() => useConsole(), { wrapper })
      const { result: result2 } = renderHook(() => useConsole(), { wrapper })

      act(() => {
        result1.current.setOpen(true)
        result1.current.setHeight(600)
      })

      // Both hooks should see the same state
      expect(result2.current.isOpen).toBe(true)
      expect(result2.current.height).toBe(600)
    })
  })
})
