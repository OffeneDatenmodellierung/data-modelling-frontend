/**
 * Shared pending changes notifier
 *
 * Breaks the circular dependency between sketchStore/knowledgeStore/decisionStore
 * and workspaceStore. These stores need to call setPendingChanges(true) on the
 * workspace store, but importing workspaceStore directly creates a cycle.
 *
 * workspaceStore registers a callback here on init; other stores call
 * markPendingChanges() which is a synchronous, zero-dependency call.
 */

let _onPendingChanges: (() => void) | null = null;

/**
 * Called by workspaceStore to register its setPendingChanges callback.
 */
export function registerPendingChangesCallback(cb: () => void): void {
  _onPendingChanges = cb;
}

/**
 * Called by other stores to mark workspace as having pending changes.
 * Safe to call before workspaceStore has registered (no-op).
 */
export function markPendingChanges(): void {
  _onPendingChanges?.();
}
