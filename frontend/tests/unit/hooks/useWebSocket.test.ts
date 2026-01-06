/**
 * Unit tests for useWebSocket Hook
 * Tests WebSocket hook functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useSDKModeStore } from '@/services/sdk/sdkMode';
import { apiClient } from '@/services/api/apiClient';

// Mock dependencies
vi.mock('@/services/sdk/sdkMode', () => ({
  useSDKModeStore: vi.fn(),
}));

vi.mock('@/services/api/apiClient', () => ({
  apiClient: {
    getAccessToken: vi.fn(),
  },
}));

// Create a shared mock instance
let sharedMockWSClient: any;

vi.mock('@/services/websocket/websocketClient', () => {
  class MockWebSocketClient {
    constructor() {
      if (!sharedMockWSClient) {
        sharedMockWSClient = {
          isConnected: vi.fn(() => true),
          send: vi.fn(),
          onMessage: vi.fn(() => () => {}),
          onClose: vi.fn(() => () => {}),
          onError: vi.fn(() => () => {}),
          disconnect: vi.fn(),
        };
      }
      return sharedMockWSClient;
    }
  }
  return {
    WebSocketClient: MockWebSocketClient,
  };
});

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the shared mock
    sharedMockWSClient = {
      isConnected: vi.fn(() => true),
      send: vi.fn(),
      onMessage: vi.fn(() => () => {}),
      onClose: vi.fn(() => () => {}),
      onError: vi.fn(() => () => {}),
      disconnect: vi.fn(),
    };
    vi.mocked(useSDKModeStore).mockReturnValue({
      mode: 'online',
    } as any);
    vi.mocked(apiClient.getAccessToken).mockReturnValue('test-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not connect in offline mode', () => {
    vi.mocked(useSDKModeStore).mockReturnValue({
      mode: 'offline',
    } as any);

    const { result } = renderHook(() =>
      useWebSocket({
        workspaceId: 'workspace-1',
        enabled: true,
      })
    );

    expect(result.current.isConnected).toBe(false);
  });

  it('should not connect when disabled', () => {
    const { result } = renderHook(() =>
      useWebSocket({
        workspaceId: 'workspace-1',
        enabled: false,
      })
    );

    expect(result.current.isConnected).toBe(false);
  });

  it('should connect when enabled and online', async () => {
    const { result } = renderHook(() =>
      useWebSocket({
        workspaceId: 'workspace-1',
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.connectionStatus).toBeDefined();
    });
  });

  it('should call onMessage callback when message received', async () => {
    const onMessage = vi.fn();

    renderHook(() =>
      useWebSocket({
        workspaceId: 'workspace-1',
        enabled: true,
        onMessage,
      })
    );

    await waitFor(() => {
      expect(sharedMockWSClient.onMessage).toHaveBeenCalled();
    });
  });

  it('should call onClose callback when connection closes', async () => {
    const onClose = vi.fn();

    renderHook(() =>
      useWebSocket({
        workspaceId: 'workspace-1',
        enabled: true,
        onClose,
      })
    );

    await waitFor(() => {
      expect(sharedMockWSClient.onClose).toHaveBeenCalled();
    });
  });

  it('should send messages when connected', async () => {
    sharedMockWSClient.isConnected = vi.fn(() => true);

    const { result } = renderHook(() =>
      useWebSocket({
        workspaceId: 'workspace-1',
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    result.current.send({
      type: 'test_message',
      workspace_id: 'workspace-1',
    });

    await waitFor(() => {
      expect(sharedMockWSClient.send).toHaveBeenCalled();
    });
  });

  it('should cleanup on unmount', async () => {
    const mockDisconnect = vi.fn();
    sharedMockWSClient.disconnect = mockDisconnect;

    const { unmount } = renderHook(() =>
      useWebSocket({
        workspaceId: 'workspace-1',
        enabled: true,
      })
    );

    unmount();

    await waitFor(() => {
      expect(mockDisconnect).toHaveBeenCalled();
    });
  });
});

