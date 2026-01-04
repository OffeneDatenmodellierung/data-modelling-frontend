/**
 * SDK Mode Detection and Management
 * Determines whether to use API (online) or WASM SDK (offline)
 * Supports manual override via user toggle
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SDKMode = 'online' | 'offline';

interface SDKModeState {
  mode: SDKMode;
  isManualOverride: boolean; // True if user manually set the mode
  setMode: (mode: SDKMode, manual?: boolean) => void;
  checkOnlineMode: () => Promise<boolean>;
  getMode: () => Promise<SDKMode>;
  initialize: () => Promise<void>;
}

class SDKModeDetector {
  /**
   * Check if we're online and API is available
   * NOTE: This method should NOT be called directly - use the store's checkOnlineMode() which respects manual override
   */
  async checkOnlineMode(): Promise<boolean> {
    // Check manual override before making API call
    const state = useSDKModeStore.getState();
    if (state.isManualOverride && state.mode === 'offline') {
      console.log('[SDKMode] Skipping API check - manually set to offline mode');
      return false;
    }
    
    // Also check if we're in Electron offline mode (production build with file:// protocol)
    if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
      // In Electron production build, we're in offline mode
      console.log('[SDKMode] Electron offline mode detected (file:// protocol) - skipping API check');
      return false;
    }

    try {
      // Determine API URL:
      // - If VITE_API_BASE_URL is set and is a full URL (starts with http:// or https://), use it
      // - Otherwise, use relative URL which will be proxied by Nginx (Docker) or direct (dev)
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      let healthUrl: string;
      
      // Check if apiBaseUrl exists, is not empty, and is a full URL
      if (apiBaseUrl && apiBaseUrl.trim() !== '' && (apiBaseUrl.startsWith('http://') || apiBaseUrl.startsWith('https://'))) {
        // Full URL provided (development mode or explicit config)
        healthUrl = `${apiBaseUrl}/api/v1/health`;
      } else {
        // Relative URL - will be proxied by Nginx in Docker or hit directly in dev
        healthUrl = '/api/v1/health';
      }
      
      console.log('[SDKMode] Checking API availability at:', healthUrl, 'env VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
      const response = await fetch(healthUrl, {
        method: 'GET',
        mode: 'cors', // Explicitly allow CORS
        credentials: 'omit', // Don't send cookies
        signal: AbortSignal.timeout(5000), // 5 second timeout (increased from 2s)
      });
      const isOk = response.ok;
      console.log('[SDKMode] API health check result:', isOk, 'status:', response.status, 'statusText:', response.statusText);
      return isOk;
    } catch (error) {
      console.error('[SDKMode] API health check failed:', error);
      return false;
    }
  }

  /**
   * Get current SDK mode (checks API availability if not manually overridden)
   */
  async getMode(): Promise<SDKMode> {
    const state = useSDKModeStore.getState();
    
    // If user manually set mode to offline, return immediately without API check
    if (state.isManualOverride && state.mode === 'offline') {
      return 'offline';
    }
    
    // If user manually set mode to online, verify API is available
    if (state.isManualOverride && state.mode === 'online') {
      const isOnline = await this.checkOnlineMode();
      if (!isOnline) {
        console.warn('[SDKMode] Manual online mode but API unavailable - switching to offline');
        useSDKModeStore.setState({ mode: 'offline', isManualOverride: false });
        return 'offline';
      }
      return 'online';
    }
    
    // Otherwise, check API availability
    const isOnline = await this.checkOnlineMode();
    const detectedMode = isOnline ? 'online' : 'offline';
    
    // Update store with detected mode
    useSDKModeStore.setState({ mode: detectedMode, isManualOverride: false });
    
    return detectedMode;
  }

  /**
   * Set mode manually (user override)
   */
  setMode(mode: SDKMode, manual: boolean = true): void {
    useSDKModeStore.setState({ mode, isManualOverride: manual });
  }

  /**
   * Check if WASM SDK is available
   */
  async isWASMAvailable(): Promise<boolean> {
    try {
      // Check if WASM module can be loaded
      // This will be implemented when WASM build is ready
      return false; // Placeholder - will check actual WASM availability
    } catch {
      return false;
    }
  }

  /**
   * Initialize mode on app start
   */
  async initialize(): Promise<void> {
    const state = useSDKModeStore.getState();
    
    // If manual override exists and mode is offline, skip API check
    if (state.isManualOverride && state.mode === 'offline') {
      console.log('[SDKMode] Using manual offline mode override - skipping API check');
      return;
    }
    
    // If manual override exists but mode is online, still check API availability
    if (state.isManualOverride && state.mode === 'online') {
      // Verify API is actually available
      const isOnline = await this.checkOnlineMode();
      if (!isOnline) {
        console.warn('[SDKMode] Manual online mode set but API unavailable - switching to offline');
        useSDKModeStore.setState({ mode: 'offline', isManualOverride: false });
      }
      return;
    }
    
    // Otherwise, detect mode
    await this.getMode();
  }
}

// Zustand store for SDK mode state (persisted to localStorage)
export const useSDKModeStore = create<SDKModeState>()(
  persist(
    (set) => ({
      mode: 'offline', // Default to offline for safety
      isManualOverride: false,
      
      setMode: (mode: SDKMode, manual: boolean = true) => {
        set({ mode, isManualOverride: manual });
      },
      
      checkOnlineMode: async () => {
        const state = useSDKModeStore.getState();
        // If manually set to offline, don't check API
        if (state.isManualOverride && state.mode === 'offline') {
          return false;
        }
        const detector = new SDKModeDetector();
        return detector.checkOnlineMode();
      },
      
      getMode: async () => {
        // Check store state first - if manually set to offline, return immediately
        const state = useSDKModeStore.getState();
        if (state.isManualOverride && state.mode === 'offline') {
          return 'offline';
        }
        const detector = new SDKModeDetector();
        return detector.getMode();
      },
      
      initialize: async () => {
        const detector = new SDKModeDetector();
        await detector.initialize();
      },
    }),
    {
      name: 'sdk-mode-storage',
      partialize: (state) => ({ 
        mode: state.mode, 
        isManualOverride: state.isManualOverride 
      }),
    }
  )
);

// Singleton instance for backward compatibility
export const sdkModeDetector = new SDKModeDetector();

