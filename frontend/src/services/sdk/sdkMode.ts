/**
 * SDK Mode Detection and Management
 * Determines whether to use API (online) or WASM SDK (offline)
 * Mode is controlled by VITE_OFFLINE_MODE environment variable (defaults to true/offline)
 */

import { create } from 'zustand';

export type SDKMode = 'online' | 'offline';

interface SDKModeState {
  mode: SDKMode;
  isManualOverride: boolean; // Always false in offline-only mode
  getMode: () => SDKMode;
  setMode: (mode: SDKMode, manual?: boolean) => void;
  checkOnlineMode: () => Promise<boolean>;
  initialize: () => void;
}

/**
 * Get offline mode from environment variable
 * VITE_OFFLINE_MODE defaults to 'true' (offline mode)
 * Set VITE_OFFLINE_MODE=false to enable online mode
 */
function getOfflineModeFromEnv(): boolean {
  const envValue = import.meta.env.VITE_OFFLINE_MODE;
  // Default to offline mode if not set or empty
  if (envValue === undefined || envValue === '' || envValue === null) {
    return true; // Default to offline
  }
  // Check if explicitly set to 'false' (case-insensitive)
  return envValue.toLowerCase() !== 'false';
}

/**
 * Get current SDK mode based on environment variable
 * Defaults to offline mode
 */
function getSDKMode(): SDKMode {
  // Check environment variable first
  const isOfflineMode = getOfflineModeFromEnv();
  
  if (isOfflineMode) {
    console.log('[SDKMode] Offline mode enabled via VITE_OFFLINE_MODE environment variable');
    return 'offline';
  }
  
  // Also check if we're in Electron offline mode (production build with file:// protocol)
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    console.log('[SDKMode] Electron offline mode detected (file:// protocol)');
    return 'offline';
  }
  
  console.log('[SDKMode] Online mode enabled via VITE_OFFLINE_MODE=false');
  return 'online';
}

// Zustand store for SDK mode state (no persistence - always reads from env)
export const useSDKModeStore = create<SDKModeState>()((set, get) => ({
  mode: getSDKMode(), // Initialize from environment variable
  isManualOverride: false, // Always false in offline-only mode
  
  getMode: () => {
    // Always read from environment variable
    const mode = getSDKMode();
    set({ mode });
    return mode;
  },
  
  setMode: (mode: SDKMode, manual: boolean = false) => {
    // In offline-only mode, always set to offline
    const actualMode = getOfflineModeFromEnv() ? 'offline' : mode;
    set({ mode: actualMode, isManualOverride: manual });
  },
  
  checkOnlineMode: async (): Promise<boolean> => {
    // In offline-only mode, always return false
    return !getOfflineModeFromEnv();
  },
  
  initialize: () => {
    // Initialize mode from environment variable
    const mode = getSDKMode();
    set({ mode, isManualOverride: false });
    console.log(`[SDKMode] Initialized mode: ${mode} (from VITE_OFFLINE_MODE=${import.meta.env.VITE_OFFLINE_MODE ?? 'not set (defaults to offline)'})`);
  },
}));

// Backward compatibility - check if online mode is available
export const sdkModeDetector = {
  checkOnlineMode: async (): Promise<boolean> => {
    const mode = useSDKModeStore.getState().getMode();
    return mode === 'online';
  },
  getMode: async (): Promise<SDKMode> => {
    return useSDKModeStore.getState().getMode();
  },
};

