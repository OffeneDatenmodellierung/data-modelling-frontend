/**
 * Unit tests for useCollaboration Hook
 * Tests collaboration hook functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCollaboration } from '@/hooks/useCollaboration';
import { useSDKModeStore } from '@/services/sdk/sdkMode';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { useModelStore } from '@/stores/modelStore';
import { apiClient } from '@/services/api/apiClient';

// Mock dependencies
vi.mock('@/services/sdk/sdkMode', () => ({
  useSDKModeStore: vi.fn(),
}));

vi.mock('@/stores/collaborationStore', () => ({
  useCollaborationStore: vi.fn(),
}));

vi.mock('@/stores/modelStore', () => ({
  useModelStore: vi.fn(),
}));

vi.mock('@/services/api/apiClient', () => ({
  apiClient: {
    getAccessToken: vi.fn(),
  },
}));

// Create a mock instance that will be reused
const createMockCollaborationService = () => ({
  isConnected: vi.fn(() => true),
  sendTableUpdate: vi.fn(),
  sendRelationshipUpdate: vi.fn(),
  sendPresenceUpdate: vi.fn(),
  onTableUpdate: vi.fn(() => () => {}),
  onRelationshipUpdate: vi.fn(() => () => {}),
  onPresenceUpdate: vi.fn(() => () => {}),
  onConflict: vi.fn(() => () => {}),
  disconnect: vi.fn(),
});

let mockServiceInstance: ReturnType<typeof createMockCollaborationService>;

vi.mock('@/services/websocket/collaborationService', () => {
  class MockCollaborationService {
    constructor() {
      mockServiceInstance = createMockCollaborationService();
      return mockServiceInstance;
    }
  }
  return {
    CollaborationService: MockCollaborationService,
  };
});

describe('useCollaboration', () => {
  const mockSetConnectionStatus = vi.fn();
  const mockUpdateParticipantPresence = vi.fn();
  const mockAddConflict = vi.fn();
  const mockUpdateTable = vi.fn();
  const mockUpdateRelationship = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSDKModeStore).mockReturnValue({
      mode: 'online',
    } as any);
    vi.mocked(useCollaborationStore).mockReturnValue({
      setConnectionStatus: mockSetConnectionStatus,
      updateParticipantPresence: mockUpdateParticipantPresence,
      addConflict: mockAddConflict,
    } as any);
    vi.mocked(useModelStore).mockReturnValue({
      updateTable: mockUpdateTable,
      updateRelationship: mockUpdateRelationship,
    } as any);
    vi.mocked(apiClient.getAccessToken).mockReturnValue('test-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not initialize in offline mode', () => {
    vi.mocked(useSDKModeStore).mockReturnValue({
      mode: 'offline',
    } as any);

    const { result } = renderHook(() =>
      useCollaboration({
        workspaceId: 'workspace-1',
        enabled: true,
      })
    );

    expect(result.current.isConnected).toBe(false);
  });

  it('should not initialize when disabled', () => {
    const { result } = renderHook(() =>
      useCollaboration({
        workspaceId: 'workspace-1',
        enabled: false,
      })
    );

    expect(result.current.isConnected).toBe(false);
  });

  it('should initialize collaboration service when enabled', async () => {
    renderHook(() =>
      useCollaboration({
        workspaceId: 'workspace-1',
        enabled: true,
      })
    );

    await waitFor(() => {
      // Check that the service was created and isConnected was called
      expect(mockServiceInstance).toBeDefined();
      expect(mockServiceInstance.isConnected).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('should send table update', async () => {
    const { result } = renderHook(() =>
      useCollaboration({
        workspaceId: 'workspace-1',
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(mockServiceInstance).toBeDefined();
    });

    result.current.sendTableUpdate('table-1', { name: 'Updated Table' });

    expect(mockServiceInstance.sendTableUpdate).toHaveBeenCalledWith('table-1', { name: 'Updated Table' });
  });

  it('should send relationship update', async () => {
    const { result } = renderHook(() =>
      useCollaboration({
        workspaceId: 'workspace-1',
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(mockServiceInstance).toBeDefined();
    });

    result.current.sendRelationshipUpdate('rel-1', { source_cardinality: '1' });

    expect(mockServiceInstance.sendRelationshipUpdate).toHaveBeenCalledWith('rel-1', { source_cardinality: '1' });
  });

  it('should send presence update', async () => {
    const { result } = renderHook(() =>
      useCollaboration({
        workspaceId: 'workspace-1',
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(mockServiceInstance).toBeDefined();
    });

    result.current.sendPresenceUpdate({ x: 100, y: 200 }, ['table-1']);

    expect(mockServiceInstance.sendPresenceUpdate).toHaveBeenCalledWith({ x: 100, y: 200 }, ['table-1']);
  });

  it('should cleanup on unmount', async () => {
    const { unmount } = renderHook(() =>
      useCollaboration({
        workspaceId: 'workspace-1',
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(mockServiceInstance).toBeDefined();
    });

    unmount();

    await waitFor(() => {
      expect(mockServiceInstance.disconnect).toHaveBeenCalled();
    });
  });
});

