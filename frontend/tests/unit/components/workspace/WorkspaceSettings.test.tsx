/**
 * Unit tests for WorkspaceSettings Component
 * Tests workspace settings and permission management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

    render(<WorkspaceSettings workspaceId="workspace-1" />);

    const addButton = screen.getByText(/add collaborator|invite/i);
    fireEvent.click(addButton);

    const emailInput = screen.getByPlaceholderText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'collaborator@example.com' } });

    const submitButton = screen.getByText(/add|invite/i);
    fireEvent.click(submitButton);

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

    render(<WorkspaceSettings workspaceId="workspace-1" />);

    const removeButton = screen.getAllByLabelText(/remove|delete/i)[0];
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(workspaceService.removeCollaborator).toHaveBeenCalled();
    });
  });

  it('should allow updating collaborator access level', async () => {
    const sharedWorkspace = { ...mockWorkspace, type: 'shared' as const };
    vi.mocked(useWorkspaceStore).mockReturnValue({
      workspaces: [sharedWorkspace],
      currentWorkspaceId: 'workspace-1',
    } as any);
    vi.mocked(workspaceService.updateCollaboratorAccess).mockResolvedValue(undefined);

    render(<WorkspaceSettings workspaceId="workspace-1" />);

    const accessSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(accessSelect, { target: { value: 'read' } });

    await waitFor(() => {
      expect(workspaceService.updateCollaboratorAccess).toHaveBeenCalled();
    });
  });
});

