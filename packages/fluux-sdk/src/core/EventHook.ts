/**
 * Obsidian-inspired EventHook base class for modular event processing.
 *
 * EventHooks provide a lifecycle-managed way to subscribe to SDK events
 * and store changes. All subscriptions registered via `registerEvent()`
 * or `registerStoreSubscription()` are automatically cleaned up when
 * the hook is unloaded.
 *
 * @example Creating a custom event hook
 * ```typescript
 * class MyHook extends EventHook {
 *   readonly id = 'my-hook'
 *   readonly name = 'My Custom Hook'
 *
 *   onload(): void {
 *     this.registerEvent('chat:message', ({ message }) => {
 *       console.log('New message:', message.body)
 *     })
 *   }
 * }
 *
 * // Register with client
 * client.registerHook(new MyHook(client))
 * ```
 *
 * @packageDocumentation
 * @module Core/EventHook
 */

import type { XMPPClient } from './XMPPClient'
import type { SDKEvents, SDKEventHandler } from './types/sdk-events'

/**
 * Base class for event hooks (Obsidian-inspired plugin pattern).
 *
 * Subclass this to create modular event processors that subscribe to
 * SDK events with automatic lifecycle cleanup. Register hooks on
 * `XMPPClient` via `client.registerHook(hook)`.
 *
 * @category Core
 */
export abstract class EventHook {
  /** Unique identifier for this hook */
  abstract readonly id: string
  /** Human-readable name */
  abstract readonly name: string

  /** The XMPPClient instance this hook is bound to */
  protected client: XMPPClient

  private _subscriptions: Array<() => void> = []

  constructor(client: XMPPClient) {
    this.client = client
  }

  /**
   * Subscribe to an SDK event with automatic cleanup on unload.
   *
   * @param event - The SDK event name to subscribe to
   * @param handler - The event handler function
   */
  protected registerEvent<K extends keyof SDKEvents>(
    event: K,
    handler: SDKEventHandler<K>
  ): void {
    const unsub = this.client.subscribe(event, handler)
    this._subscriptions.push(unsub)
  }

  /**
   * Register a store subscription or other cleanup function.
   * Will be called automatically on unload.
   *
   * @param unsubscribe - Cleanup function to call on unload
   */
  protected registerStoreSubscription(unsubscribe: () => void): void {
    this._subscriptions.push(unsubscribe)
  }

  /**
   * Called when the hook is loaded/activated.
   * Override this to set up event subscriptions and initialize state.
   */
  abstract onload(): void

  /**
   * Called when the hook is unloaded/deactivated.
   * Base implementation cleans up all registered subscriptions.
   * Override to add custom cleanup logic (call `super.onunload()` first).
   */
  onunload(): void {
    for (const unsub of this._subscriptions) {
      unsub()
    }
    this._subscriptions = []
  }
}
