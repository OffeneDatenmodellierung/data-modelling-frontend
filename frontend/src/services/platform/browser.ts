/**
 * Browser-specific platform implementations
 */

import { getPlatform } from './platform';
import JSZip from 'jszip';

/**
 * File System Access API directory handle cache
 * Stores directory handles for auto-save functionality
 */
const directoryHandleCache: Map<string, FileSystemDirectoryHandle> = new Map();

/**
 * IndexedDB database for persisting directory handles across browser sessions
 */
const DB_NAME = 'dm-directory-handles';
const DB_VERSION = 1;
const STORE_NAME = 'handles';

/**
 * Open IndexedDB database for directory handle storage
 */
async function openHandleDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[BrowserFileService] Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'workspaceId' });
        console.log('[BrowserFileService] Created IndexedDB object store for directory handles');
      }
    };
  });
}

/**
 * Browser file operations using File API and File System Access API
 */
export const browserFileService = {
  /**
   * Read file using File API
   */
  async readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('File read error'));
      reader.readAsText(file);
    });
  },

  /**
   * Create download link for file
   */
  downloadFile(content: string, filename: string, mimeType: string = 'text/yaml'): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Open file picker
   */
  async pickFile(accept: string = '.yaml,.yml,.json'): Promise<File | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0] || null;
        resolve(file);
      };
      input.click();
    });
  },

  /**
   * Open folder picker (directory)
   * Returns FileList with all files in the selected directory tree
   */
  async pickFolder(): Promise<FileList | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.webkitdirectory = true; // Enable directory selection
      input.onchange = (e) => {
        const files = (e.target as HTMLInputElement).files;
        resolve(files);
      };
      input.oncancel = () => {
        resolve(null);
      };
      input.click();
    });
  },

  /**
   * Request directory access using File System Access API
   * Returns a directory handle that can be used for saving files
   */
  async requestDirectoryAccess(workspaceName: string): Promise<FileSystemDirectoryHandle | null> {
    // Check if File System Access API is supported
    if (!('showDirectoryPicker' in window)) {
      console.warn('[BrowserFileService] File System Access API not supported');
      return null;
    }

    try {
      const handle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents',
      });

      // Cache the handle for this workspace
      directoryHandleCache.set(workspaceName, handle);
      console.log('[BrowserFileService] Directory access granted:', workspaceName);
      return handle;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('[BrowserFileService] User cancelled directory picker');
      } else {
        console.error('[BrowserFileService] Failed to request directory access:', error);
      }
      return null;
    }
  },

  /**
   * Get cached directory handle for a workspace
   * First checks in-memory cache, then falls back to IndexedDB
   */
  getCachedDirectoryHandle(workspaceName: string): FileSystemDirectoryHandle | undefined {
    return directoryHandleCache.get(workspaceName);
  },

  /**
   * Save directory handle to IndexedDB for persistence across browser sessions
   */
  async saveDirectoryHandle(workspaceId: string, handle: FileSystemDirectoryHandle): Promise<void> {
    try {
      const db = await openHandleDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      await new Promise<void>((resolve, reject) => {
        const request = store.put({ workspaceId, handle });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      // Also cache in memory
      directoryHandleCache.set(workspaceId, handle);

      db.close();
      console.log('[BrowserFileService] Saved directory handle for workspace:', workspaceId);
    } catch (error) {
      console.error('[BrowserFileService] Failed to save directory handle:', error);
      throw error;
    }
  },

  /**
   * Load directory handle from IndexedDB
   * Returns null if not found or if handle is invalid
   */
  async loadDirectoryHandle(workspaceId: string): Promise<FileSystemDirectoryHandle | null> {
    // First check in-memory cache
    const cached = directoryHandleCache.get(workspaceId);
    if (cached) {
      return cached;
    }

    try {
      const db = await openHandleDB();
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      const result = await new Promise<
        { workspaceId: string; handle: FileSystemDirectoryHandle } | undefined
      >((resolve, reject) => {
        const request = store.get(workspaceId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      db.close();

      if (result?.handle) {
        // Cache in memory for future access
        directoryHandleCache.set(workspaceId, result.handle);
        console.log('[BrowserFileService] Loaded directory handle from IndexedDB:', workspaceId);
        return result.handle;
      }

      return null;
    } catch (error) {
      console.error('[BrowserFileService] Failed to load directory handle:', error);
      return null;
    }
  },

  /**
   * Remove directory handle from IndexedDB
   */
  async removeDirectoryHandle(workspaceId: string): Promise<void> {
    try {
      const db = await openHandleDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      await new Promise<void>((resolve, reject) => {
        const request = store.delete(workspaceId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      // Also remove from memory cache
      directoryHandleCache.delete(workspaceId);

      db.close();
      console.log('[BrowserFileService] Removed directory handle for workspace:', workspaceId);
    } catch (error) {
      console.error('[BrowserFileService] Failed to remove directory handle:', error);
    }
  },

  /**
   * Verify directory handle permission
   * Returns 'granted', 'denied', or 'prompt'
   */
  async verifyDirectoryPermission(
    handle: FileSystemDirectoryHandle,
    mode: 'read' | 'readwrite' = 'readwrite'
  ): Promise<PermissionState> {
    try {
      // Check if queryPermission is available
      if ('queryPermission' in handle && typeof handle.queryPermission === 'function') {
        const permission = await (handle as any).queryPermission({ mode });
        return permission;
      }

      // Fallback: try to access the directory to check permissions
      try {
        await handle.getDirectoryHandle('.', { create: false });
        return 'granted';
      } catch {
        return 'prompt';
      }
    } catch (error) {
      console.error('[BrowserFileService] Failed to verify permission:', error);
      return 'denied';
    }
  },

  /**
   * Request permission for a directory handle
   * Returns true if permission was granted
   */
  async requestDirectoryPermission(
    handle: FileSystemDirectoryHandle,
    mode: 'read' | 'readwrite' = 'readwrite'
  ): Promise<boolean> {
    try {
      if ('requestPermission' in handle && typeof handle.requestPermission === 'function') {
        const permission = await (handle as any).requestPermission({ mode });
        return permission === 'granted';
      }

      // Fallback: try to access the directory
      try {
        await handle.getDirectoryHandle('.', { create: false });
        return true;
      } catch {
        return false;
      }
    } catch (error) {
      console.error('[BrowserFileService] Failed to request permission:', error);
      return false;
    }
  },

  /**
   * Read all files from a directory handle recursively
   * Returns an array of File objects with webkitRelativePath set
   */
  async readFilesFromHandle(handle: FileSystemDirectoryHandle): Promise<File[]> {
    const files: File[] = [];

    async function readDirectory(
      dirHandle: FileSystemDirectoryHandle,
      path: string = ''
    ): Promise<void> {
      // Use entries() with type assertion for async iterator (File System Access API)
      const entries = (dirHandle as any).entries() as AsyncIterable<[string, FileSystemHandle]>;

      for await (const [name, entry] of entries) {
        const entryPath = path ? `${path}/${name}` : name;

        if (entry.kind === 'file') {
          const fileHandle = entry as FileSystemFileHandle;
          const file = await fileHandle.getFile();

          // Create a new File with webkitRelativePath set
          // This mimics the structure returned by <input webkitdirectory>
          Object.defineProperty(file, 'webkitRelativePath', {
            value: entryPath,
            writable: false,
          });

          files.push(file);
        } else if (entry.kind === 'directory') {
          const subDirHandle = entry as FileSystemDirectoryHandle;
          await readDirectory(subDirHandle, entryPath);
        }
      }
    }

    try {
      await readDirectory(handle);
      console.log(`[BrowserFileService] Read ${files.length} files from directory handle`);
      return files;
    } catch (error) {
      console.error('[BrowserFileService] Failed to read files from handle:', error);
      throw error;
    }
  },

  /**
   * Save file to directory using File System Access API
   */
  async saveFileToDirectory(
    directoryHandle: FileSystemDirectoryHandle,
    filename: string,
    content: string,
    _mimeType: string = 'text/yaml'
  ): Promise<void> {
    try {
      // Create file handle (creates file if it doesn't exist)
      const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });

      // Get writable stream
      const writable = await fileHandle.createWritable();

      // Write content
      await writable.write(content);

      // Close the file
      await writable.close();

      console.log(`[BrowserFileService] Saved file: ${filename}`);
    } catch (error) {
      console.error(`[BrowserFileService] Failed to save file ${filename}:`, error);
      throw error;
    }
  },

  /**
   * Save multiple files to a directory structure
   * Creates subdirectories as needed
   */
  async saveFilesToDirectory(
    directoryHandle: FileSystemDirectoryHandle,
    files: Array<{ path: string; content: string; mimeType?: string }>
  ): Promise<void> {
    for (const file of files) {
      const pathParts = file.path.split('/');
      let currentHandle = directoryHandle;

      // Navigate/create subdirectories
      for (let i = 0; i < pathParts.length - 1; i++) {
        const dirName = pathParts[i];
        if (!dirName) continue;
        try {
          currentHandle = await currentHandle.getDirectoryHandle(dirName, { create: true });
        } catch (error) {
          console.error(`[BrowserFileService] Failed to create directory ${dirName}:`, error);
          throw error;
        }
      }

      // Save file
      const filename = pathParts[pathParts.length - 1];
      if (!filename) {
        throw new Error('Invalid file path: missing filename');
      }
      await this.saveFileToDirectory(
        currentHandle,
        filename,
        file.content,
        file.mimeType || 'text/yaml'
      );
    }
  },

  /**
   * Create and download a ZIP file containing multiple files
   */
  async downloadZip(
    files: Array<{ path: string; content: string }>,
    zipFilename: string
  ): Promise<void> {
    const zip = new JSZip();

    // Add all files to ZIP
    for (const file of files) {
      zip.file(file.path, file.content);
    }

    // Generate ZIP blob
    const blob = await zip.generateAsync({ type: 'blob' });

    // Download ZIP
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = zipFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log(`[BrowserFileService] Downloaded ZIP: ${zipFilename} (${files.length} files)`);
  },
};

/**
 * Browser platform detection
 */
export function isBrowserPlatform(): boolean {
  return getPlatform() === 'browser';
}
