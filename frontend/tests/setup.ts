import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Mock localStorage for tests
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(() => null),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock the apiClient module to prevent fetch issues during test teardown
vi.mock('@/services/api/apiClient', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: null }),
    post: vi.fn().mockResolvedValue({ data: null }),
    put: vi.fn().mockResolvedValue({ data: null }),
    delete: vi.fn().mockResolvedValue({ data: null }),
    setTokens: vi.fn(),
    clearTokens: vi.fn(),
    getAccessToken: vi.fn(() => null),
    isAuthenticated: vi.fn(() => false),
  },
}));

// Mock workspaceService to prevent API calls during store imports
vi.mock('@/services/api/workspaceService', () => ({
  workspaceService: {
    listWorkspaces: vi.fn().mockResolvedValue([]),
    getWorkspace: vi.fn().mockResolvedValue(null),
    createWorkspace: vi.fn().mockResolvedValue(null),
    updateWorkspace: vi.fn().mockResolvedValue(null),
    deleteWorkspace: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock githubRepoSync to prevent dynamic import issues during test teardown
// This module imports knowledgeService and decisionService which can cause
// "Closing rpc while fetch was pending" errors when tests complete
vi.mock('@/utils/githubRepoSync', () => ({
  isGitHubRepoMode: vi.fn().mockResolvedValue(false),
  syncKnowledgeArticleToGitHub: vi.fn().mockResolvedValue(undefined),
  deleteKnowledgeArticleFromGitHub: vi.fn().mockResolvedValue(undefined),
  syncDecisionRecordToGitHub: vi.fn().mockResolvedValue(undefined),
  deleteDecisionRecordFromGitHub: vi.fn().mockResolvedValue(undefined),
}));

// Cleanup after each test
afterEach(() => {
  cleanup();
});
