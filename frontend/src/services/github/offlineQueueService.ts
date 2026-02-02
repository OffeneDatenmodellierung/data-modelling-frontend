/**
 * Offline Queue Service
 *
 * IndexedDB-backed service for storing pending changes when offline
 * and caching file contents for offline access.
 */

import type {
  PendingChange,
  FileCache,
  GitHubRepoWorkspace,
  RecentWorkspace,
} from '@/types/github-repo';

// ============================================================================
// Database Configuration
// ============================================================================

const DB_NAME = 'dm-github-workspace';
const DB_VERSION = 1;

const STORES = {
  PENDING_CHANGES: 'pendingChanges',
  FILE_CACHE: 'fileCache',
  WORKSPACES: 'workspaces',
  RECENT_WORKSPACES: 'recentWorkspaces',
} as const;

// ============================================================================
// Database Initialization
// ============================================================================

let dbPromise: Promise<IDBDatabase> | null = null;

function getDatabase(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Pending changes store
      if (!db.objectStoreNames.contains(STORES.PENDING_CHANGES)) {
        const changeStore = db.createObjectStore(STORES.PENDING_CHANGES, {
          keyPath: 'id',
        });
        changeStore.createIndex('workspaceId', 'workspaceId', { unique: false });
        changeStore.createIndex('path', 'path', { unique: false });
        changeStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // File cache store
      if (!db.objectStoreNames.contains(STORES.FILE_CACHE)) {
        const cacheStore = db.createObjectStore(STORES.FILE_CACHE, {
          keyPath: ['workspaceId', 'path'],
        });
        cacheStore.createIndex('workspaceId', 'workspaceId', { unique: false });
        cacheStore.createIndex('cachedAt', 'cachedAt', { unique: false });
      }

      // Workspaces store
      if (!db.objectStoreNames.contains(STORES.WORKSPACES)) {
        db.createObjectStore(STORES.WORKSPACES, { keyPath: 'id' });
      }

      // Recent workspaces store
      if (!db.objectStoreNames.contains(STORES.RECENT_WORKSPACES)) {
        const recentStore = db.createObjectStore(STORES.RECENT_WORKSPACES, {
          keyPath: 'id',
        });
        recentStore.createIndex('lastOpened', 'lastOpened', { unique: false });
      }
    };
  });

  return dbPromise;
}

// ============================================================================
// Pending Changes
// ============================================================================

/**
 * Add a pending change to the queue
 */
export async function addPendingChange(change: PendingChange): Promise<void> {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PENDING_CHANGES, 'readwrite');
    const store = tx.objectStore(STORES.PENDING_CHANGES);

    // Check if there's already a pending change for this path
    const index = store.index('path');
    const pathRequest = index.getAll(change.path);

    pathRequest.onsuccess = () => {
      const existingChanges = pathRequest.result.filter(
        (c: PendingChange) => c.workspaceId === change.workspaceId
      );

      // If there's an existing change for this path, update it
      if (existingChanges.length > 0) {
        const existing = existingChanges[0] as PendingChange;
        // If we're deleting after creating, just remove the pending change
        if (existing.action === 'create' && change.action === 'delete') {
          const deleteRequest = store.delete(existing.id);
          deleteRequest.onsuccess = () => resolve();
          deleteRequest.onerror = () => reject(deleteRequest.error);
        } else {
          // Otherwise update the existing change
          const updatedChange: PendingChange = {
            ...existing,
            action: change.action,
            content: change.content,
            timestamp: change.timestamp,
          };
          const updateRequest = store.put(updatedChange);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        }
      } else {
        // No existing change, add new one
        const addRequest = store.add(change);
        addRequest.onsuccess = () => resolve();
        addRequest.onerror = () => reject(addRequest.error);
      }
    };

    pathRequest.onerror = () => reject(pathRequest.error);
  });
}

/**
 * Get all pending changes for a workspace
 */
export async function getPendingChanges(workspaceId: string): Promise<PendingChange[]> {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PENDING_CHANGES, 'readonly');
    const store = tx.objectStore(STORES.PENDING_CHANGES);
    const index = store.index('workspaceId');
    const request = index.getAll(workspaceId);

    request.onsuccess = () => {
      // Sort by timestamp
      const changes = request.result as PendingChange[];
      changes.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      resolve(changes);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a specific pending change
 */
export async function getPendingChange(changeId: string): Promise<PendingChange | null> {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PENDING_CHANGES, 'readonly');
    const store = tx.objectStore(STORES.PENDING_CHANGES);
    const request = store.get(changeId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Remove a pending change
 */
export async function removePendingChange(changeId: string): Promise<void> {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PENDING_CHANGES, 'readwrite');
    const store = tx.objectStore(STORES.PENDING_CHANGES);
    const request = store.delete(changeId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all pending changes for a workspace
 */
export async function clearPendingChanges(workspaceId: string): Promise<void> {
  const changes = await getPendingChanges(workspaceId);
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PENDING_CHANGES, 'readwrite');
    const store = tx.objectStore(STORES.PENDING_CHANGES);

    let completed = 0;
    const total = changes.length;

    if (total === 0) {
      resolve();
      return;
    }

    for (const change of changes) {
      const request = store.delete(change.id);
      request.onsuccess = () => {
        completed++;
        if (completed === total) {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    }
  });
}

/**
 * Get count of pending changes for a workspace
 */
export async function getPendingChangeCount(workspaceId: string): Promise<number> {
  const changes = await getPendingChanges(workspaceId);
  return changes.length;
}

// ============================================================================
// File Cache
// ============================================================================

/**
 * Cache a file's content
 */
export async function cacheFile(file: FileCache): Promise<void> {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.FILE_CACHE, 'readwrite');
    const store = tx.objectStore(STORES.FILE_CACHE);
    const request = store.put(file);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a cached file
 */
export async function getCachedFile(workspaceId: string, path: string): Promise<FileCache | null> {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.FILE_CACHE, 'readonly');
    const store = tx.objectStore(STORES.FILE_CACHE);
    const request = store.get([workspaceId, path]);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all cached files for a workspace
 */
export async function getCachedFiles(workspaceId: string): Promise<FileCache[]> {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.FILE_CACHE, 'readonly');
    const store = tx.objectStore(STORES.FILE_CACHE);
    const index = store.index('workspaceId');
    const request = index.getAll(workspaceId);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all cached files for a workspace
 */
export async function clearFileCache(workspaceId: string): Promise<void> {
  const files = await getCachedFiles(workspaceId);
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.FILE_CACHE, 'readwrite');
    const store = tx.objectStore(STORES.FILE_CACHE);

    let completed = 0;
    const total = files.length;

    if (total === 0) {
      resolve();
      return;
    }

    for (const file of files) {
      const request = store.delete([file.workspaceId, file.path]);
      request.onsuccess = () => {
        completed++;
        if (completed === total) {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    }
  });
}

/**
 * Update cached file with new content (for local edits)
 */
export async function updateCachedFileContent(
  workspaceId: string,
  path: string,
  content: string
): Promise<void> {
  const existing = await getCachedFile(workspaceId, path);
  if (existing) {
    await cacheFile({
      ...existing,
      content,
      // Keep the same SHA since this is a local edit
    });
  }
}

// ============================================================================
// Workspace Persistence
// ============================================================================

/**
 * Save workspace state
 */
export async function saveWorkspace(workspace: GitHubRepoWorkspace): Promise<void> {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.WORKSPACES, 'readwrite');
    const store = tx.objectStore(STORES.WORKSPACES);
    const request = store.put(workspace);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a saved workspace
 */
export async function getWorkspace(workspaceId: string): Promise<GitHubRepoWorkspace | null> {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.WORKSPACES, 'readonly');
    const store = tx.objectStore(STORES.WORKSPACES);
    const request = store.get(workspaceId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete a workspace
 */
export async function deleteWorkspace(workspaceId: string): Promise<void> {
  const db = await getDatabase();

  // Also clear related data
  await clearPendingChanges(workspaceId);
  await clearFileCache(workspaceId);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.WORKSPACES, 'readwrite');
    const store = tx.objectStore(STORES.WORKSPACES);
    const request = store.delete(workspaceId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * List all saved workspaces
 */
export async function listWorkspaces(): Promise<GitHubRepoWorkspace[]> {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.WORKSPACES, 'readonly');
    const store = tx.objectStore(STORES.WORKSPACES);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ============================================================================
// Recent Workspaces
// ============================================================================

/**
 * Add or update a recent workspace entry
 */
export async function addRecentWorkspace(workspace: RecentWorkspace): Promise<void> {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.RECENT_WORKSPACES, 'readwrite');
    const store = tx.objectStore(STORES.RECENT_WORKSPACES);
    const request = store.put(workspace);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get recent workspaces, sorted by last opened
 */
export async function getRecentWorkspaces(limit = 10): Promise<RecentWorkspace[]> {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.RECENT_WORKSPACES, 'readonly');
    const store = tx.objectStore(STORES.RECENT_WORKSPACES);
    const index = store.index('lastOpened');
    const request = index.openCursor(null, 'prev'); // Descending order

    const results: RecentWorkspace[] = [];

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor && results.length < limit) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Remove a recent workspace entry
 */
export async function removeRecentWorkspace(workspaceId: string): Promise<void> {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.RECENT_WORKSPACES, 'readwrite');
    const store = tx.objectStore(STORES.RECENT_WORKSPACES);
    const request = store.delete(workspaceId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all recent workspaces
 */
export async function clearRecentWorkspaces(): Promise<void> {
  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.RECENT_WORKSPACES, 'readwrite');
    const store = tx.objectStore(STORES.RECENT_WORKSPACES);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique ID for pending changes
 */
export function generateChangeId(): string {
  return `change-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate a workspace ID from repo info
 */
export function generateWorkspaceId(owner: string, repo: string, branch: string): string {
  return `${owner}/${repo}/${branch}`;
}

/**
 * Check if there are any pending changes
 */
export async function hasPendingChanges(workspaceId: string): Promise<boolean> {
  const count = await getPendingChangeCount(workspaceId);
  return count > 0;
}

/**
 * Clear all data (for testing or reset)
 */
export async function clearAllData(): Promise<void> {
  const db = await getDatabase();

  const stores = [
    STORES.PENDING_CHANGES,
    STORES.FILE_CACHE,
    STORES.WORKSPACES,
    STORES.RECENT_WORKSPACES,
  ];

  for (const storeName of stores) {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// ============================================================================
// Exports
// ============================================================================

export const offlineQueueService = {
  // Pending changes
  addPendingChange,
  getPendingChanges,
  getPendingChange,
  removePendingChange,
  clearPendingChanges,
  getPendingChangeCount,
  hasPendingChanges,

  // File cache
  cacheFile,
  getCachedFile,
  getCachedFiles,
  clearFileCache,
  updateCachedFileContent,

  // Workspaces
  saveWorkspace,
  getWorkspace,
  deleteWorkspace,
  listWorkspaces,

  // Recent workspaces
  addRecentWorkspace,
  getRecentWorkspaces,
  removeRecentWorkspace,
  clearRecentWorkspaces,

  // Utilities
  generateChangeId,
  generateWorkspaceId,
  clearAllData,
};
