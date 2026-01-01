/**
 * Unit tests for WorkspaceSettings Component
 * Tests workspace settings and permission management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { WorkspaceSettings } from '@/components/workspace/WorkspaceSettings';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { workspaceService } from '@/services/api/workspaceService';
import type { Workspace } from '@/types/workspace';

// Mock dependencies
vi.mock('@/stores/workspaceStore', () => ({
  useWorkspaceStore: vi.fn(),
}));

vi.mock('@/services/api/workspaceService', () => ({
  workspaceService: {
    updateWorkspace: vi.fn(),
    convertToShared: vi.fn(),
    convertToPersonal: vi.fn(),
    addCollaborator: vi.fn(),
    removeCollaborator: vi.fn(),
    updateCollaboratorAccess: vi.fn(),
    getCollaborators: vi.fn(),
  },
}));

describe('WorkspaceSettings', () => {
  const mockWorkspace: Workspace = {
    id: 'workspace-1',
    name: 'Test Workspace',
    type: 'personal',
    owner_id: 'user-1',
    created_at: '2025-01-01T00:00:00Z',
    last_modified_at: '2025-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useWorkspaceStore).mockReturnValue({
      workspaces: [mockWorkspace],
      currentWorkspaceId: 'workspace-1',
      updateWorkspaceRemote: vi.fn(),
    } as any);
    // Mock getCollaborators to return empty array by default
    vi.mocked(workspaceService.getCollaborators).mockResolvedValue([]);
  });

  it('should render workspace name input', () => {
    render(<WorkspaceSettings workspaceId="workspace-1" />);

    const nameInput = screen.getByLabelText(/name/i) || screen.getByDisplayValue('Test Workspace');
    expect(nameInput).toBeInTheDocument();
  });

  it('should update workspace name when input changes', async () => {
    const mockUpdateWorkspace = vi.fn().mockResolvedValue({ ...mockWorkspace, name: 'New Name' });
    vi.mocked(useWorkspaceStore).mockReturnValue({
      workspaces: [mockWorkspace],
      currentWorkspaceId: 'workspace-1',
      updateWorkspaceRemote: mockUpdateWorkspace,
    } as any);

    render(<WorkspaceSettings workspaceId="workspace-1" />);

    const nameInput = screen.getByLabelText(/name/i) || screen.getByDisplayValue('Test Workspace');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    fireEvent.blur(nameInput);

    await waitFor(() => {
      expect(mockUpdateWorkspace).toHaveBeenCalledWith('workspace-1', { name: 'New Name' });
    });
  });

  it('should show convert to shared button for personal workspaces', () => {
    render(<WorkspaceSettings workspaceId="workspace-1" />);

    expect(screen.getByText(/convert to shared|make shared/i)).toBeInTheDocument();
  });

  it('should show convert to personal button for shared workspaces', () => {
    const sharedWorkspace = { ...mockWorkspace, type: 'shared' as const };
    vi.mocked(useWorkspaceStore).mockReturnValue({
      workspaces: [sharedWorkspace],
      currentWorkspaceId: 'workspace-1',
    } as any);

    render(<WorkspaceSettings workspaceId="workspace-1" />);

    expect(screen.getByText(/convert to personal|make personal/i)).toBeInTheDocument();
  });

  it('should call convertToShared when convert button is clicked', async () => {
    const mockConvertToShared = vi.fn().mockResolvedValue({ ...mockWorkspace, type: 'shared' });
    vi.mocked(workspaceService.convertToShared).mockResolvedValue(mockConvertToShared as any);

    render(<WorkspaceSettings workspaceId="workspace-1" />);

    const convertButton = screen.getByText(/convert to shared|make shared/i);
    fireEvent.click(convertButton);

    await waitFor(() => {
      expect(workspaceService.convertToShared).toHaveBeenCalledWith('workspace-1');
    });
  });

  it('should show collaborators section for shared workspaces', () => {
    const sharedWorkspace = { ...mockWorkspace, type: 'shared' as const };
    vi.mocked(useWorkspaceStore).mockReturnValue({
      workspaces: [sharedWorkspace],
      currentWorkspaceId: 'workspace-1',
    } as any);

    render(<WorkspaceSettings workspaceId="workspace-1" />);

    expect(screen.getByText(/collaborators|permissions/i)).toBeInTheDocument();
  });

  it('should allow adding collaborators', async () => {
    const sharedWorkspace = { ...mockWorkspace, type: 'shared' as const };
    vi.mocked(useWorkspaceStore).mockReturnValue({
      workspaces: [sharedWorkspace],
      currentWorkspaceId: 'workspace-1',
    } as any);
    vi.mocked(workspaceService.addCollaborator).mockResolvedValue(undefined);
    vi.mocked(workspaceService.getCollaborators).mockResolvedValue([]);

    await act(async () => {
      render(<WorkspaceSettings workspaceId="workspace-1" />);
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/collaborator email/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByPlaceholderText(/collaborator email/i);
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'collaborator@example.com' } });
    });

    const addButton = screen.getByText(/add/i);
    await act(async () => {
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      expect(workspaceService.addCollaborator).toHaveBeenCalledWith('workspace-1', 'collaborator@example.com', 'edit');
    });
  });

  it('should allow removing collaborators', async () => {
    const sharedWorkspace = { ...mockWorkspace, type: 'shared' as const };
    vi.mocked(useWorkspaceStore).mockReturnValue({
      workspaces: [sharedWorkspace],
      currentWorkspaceId: 'workspace-1',
    } as any);
    vi.mocked(workspaceService.removeCollaborator).mockResolvedValue(undefined);
    vi.mocked(workspaceService.getCollaborators).mockResolvedValue([
      { email: 'collaborator1@example.com', access_level: 'edit' },
      { email: 'collaborator2@example.com', access_level: 'read' },
    ]);

    await act(async () => {
      render(<WorkspaceSettings workspaceId="workspace-1" />);
    });

    await waitFor(() => {
      expect(screen.getByText('collaborator1@example.com')).toBeInTheDocument();
    });

    const removeButtons = screen.getAllByLabelText(/remove/i);
    await act(async () => {
      fireEvent.click(removeButtons[0]);
    });

    await waitFor(() => {
      expect(workspaceService.removeCollaborator).toHaveBeenCalledWith('workspace-1', 'collaborator1@example.com');
    });
  });

  it('should allow updating collaborator access level', async () => {
    const sharedWorkspace = { ...mockWorkspace, type: 'shared' as const };
    vi.mocked(useWorkspaceStore).mockReturnValue({
      workspaces: [sharedWorkspace],
      currentWorkspaceId: 'workspace-1',
    } as any);
    vi.mocked(workspaceService.updateCollaboratorAccess).mockResolvedValue(undefined);
    // Mock getCollaborators to return updated list after the change
    vi.mocked(workspaceService.getCollaborators)
      .mockResolvedValueOnce([
        { email: 'collaborator1@example.com', access_level: 'edit' },
      ])
      .mockResolvedValueOnce([
        { email: 'collaborator1@example.com', access_level: 'read' },
      ]);

    await act(async () => {
      render(<WorkspaceSettings workspaceId="workspace-1" />);
    });

    await waitFor(() => {
      expect(screen.getByText('collaborator1@example.com')).toBeInTheDocument();
    });

    // Find the select element for the collaborator - should be in the collaborators list
    const collaboratorEmail = screen.getByText('collaborator1@example.com');
    const collaboratorRow = collaboratorEmail.closest('.flex.items-center.justify-between');
    expect(collaboratorRow).toBeInTheDocument();
    
    const collaboratorSelect = collaboratorRow?.querySelector('select') as HTMLSelectElement;
    expect(collaboratorSelect).toBeDefined();
    expect(collaboratorSelect.value).toBe('edit');
    
    // Change the select value
    await act(async () => {
      fireEvent.change(collaboratorSelect, { target: { value: 'read' } });
    });

    await waitFor(() => {
      expect(workspaceService.updateCollaboratorAccess).toHaveBeenCalledWith('workspace-1', 'collaborator1@example.com', 'read');
    }, { timeout: 3000 });
  });
});

