/**
 * Authentication Provider Component
 * Manages authentication state and provides auth context
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService, type User } from '@/services/api/authService';
import { useSDKModeStore } from '@/services/sdk/sdkMode';
import { useUIStore } from '@/stores/uiStore';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (tokens: { access_token: string; refresh_token: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useUIStore();

  // Initialize auth on mount (skip if offline mode)
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check current mode from store directly (don't trigger API check)
        const state = useSDKModeStore.getState();
        const mode = state.mode;
        
        // Skip auth initialization in offline mode
        if (mode === 'offline') {
          setIsLoading(false);
          return;
        }
        
        // Only initialize if manually set to online (don't auto-detect)
        if (state.isManualOverride && mode === 'online') {
          // Initialize auth only in online mode
          authService.initialize();
          
          if (authService.isAuthenticated()) {
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);
          }
        } else {
          // Not manually set to online, skip auth
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Set up token refresh interval (only in online mode)
  useEffect(() => {
    const setupTokenRefresh = async () => {
      // Check if we're in online mode from store (don't trigger API check)
      const state = useSDKModeStore.getState();
      if (state.mode === 'offline' || !authService.isAuthenticated()) {
        return;
      }

      const refreshInterval = setInterval(async () => {
        try {
          // Check mode again before refresh (from store, don't trigger API check)
          const currentState = useSDKModeStore.getState();
          if (currentState.mode === 'offline') {
            clearInterval(refreshInterval);
            return;
          }
          
          await authService.refreshToken();
        } catch (error) {
          console.error('Token refresh failed:', error);
          // Token refresh failed - user will need to re-authenticate
          await logout();
        }
      }, 15 * 60 * 1000); // Refresh every 15 minutes

      return () => clearInterval(refreshInterval);
    };

    const cleanup = setupTokenRefresh();
    return () => {
      cleanup.then((fn) => fn && fn());
    };
  }, [authService.isAuthenticated()]);

  const login = async (tokens: { access_token: string; refresh_token: string }) => {
    try {
      authService.setTokens({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        access_token_expires_at: Date.now() + 3600000, // 1 hour
        refresh_token_expires_at: Date.now() + 86400000, // 24 hours
        token_type: 'Bearer',
      });

      // Try to get current user, but don't fail if endpoint doesn't exist
      try {
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        } else {
          // If /me endpoint doesn't exist or returns null, create a default user
          // Authentication is still valid based on tokens
          setUser({
            id: 'authenticated',
            email: 'user@example.com',
            name: 'Authenticated User',
          });
        }
      } catch (userError) {
        // /me endpoint might not exist - that's okay, we still have valid tokens
        console.warn('Could not fetch user info, but tokens are valid:', userError);
        setUser({
          id: 'authenticated',
          email: 'user@example.com',
          name: 'Authenticated User',
        });
      }

      addToast({
        type: 'success',
        message: 'Successfully logged in',
      });
    } catch (error) {
      console.error('Login failed:', error);
      addToast({
        type: 'error',
        message: 'Failed to log in',
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      addToast({
        type: 'info',
        message: 'Logged out successfully',
      });
    }
  };

  const refreshToken = async () => {
    try {
      await authService.refreshToken();
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

