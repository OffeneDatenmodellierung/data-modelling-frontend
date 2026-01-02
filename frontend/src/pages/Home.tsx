/**
 * Home Page
 * Workspace selection and creation
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useSDKModeStore } from '@/services/sdk/sdkMode';
import { sdkModeDetector } from '@/services/sdk/sdkMode';
import { OnlineOfflineToggle } from '@/components/common/OnlineOfflineToggle';
import { localFileService } from '@/services/storage/localFileService';
import { useUIStore } from '@/stores/uiStore';
import { isElectron } from '@/services/platform/platform';
import { electronAuthService } from '@/services/api/electronAuthService';
import { WorkspaceList } from '@/components/workspace/WorkspaceList';
import { WorkspaceSelector } from '@/components/workspace/WorkspaceSelector';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, login } = useAuth();
  const { workspaces, setCurrentWorkspace, addWorkspace, fetchWorkspaces, isLoading: workspacesLoading, createWorkspace } = useWorkspaceStore();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { mode, initialize } = useSDKModeStore();
  const [modeLoading, setModeLoading] = useState(true);
  const [isCheckingLogin, setIsCheckingLogin] = useState(false);
  const { addToast } = useUIStore();

  // Initialize mode on mount
  useEffect(() => {
    const initMode = async () => {
      await initialize();
      setModeLoading(false);
    };
    initMode();
  }, [initialize]);

  // Load workspaces when authenticated and online
  useEffect(() => {
    if (isAuthenticated && mode === 'online' && !workspacesLoading) {
      fetchWorkspaces();
    }
  }, [isAuthenticated, mode, fetchWorkspaces, workspacesLoading]);

  // Show loading while checking mode and auth
  if (isLoading || modeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Handle opening local workspace folder in offline mode
  const handleOpenLocalFolder = async () => {
    try {
      const files = await localFileService.pickFolder();
      if (!files || files.length === 0) {
        return; // User cancelled
      }

      addToast({
        type: 'info',
        message: 'Loading workspace from folder...',
      });

      const workspace = await localFileService.loadWorkspaceFromFolder(files);
      
      // Add workspace to store if not already present
      const existingWorkspace = workspaces.find((w) => w.id === workspace.id);
      if (!existingWorkspace) {
        addWorkspace(workspace);
      }
      
      // Set as current workspace
      setCurrentWorkspace(workspace.id);
      
      addToast({
        type: 'success',
        message: `Opened workspace: ${workspace.name}`,
      });

      // Navigate to workspace editor
      navigate(`/workspace/${workspace.id}`);
    } catch (error) {
      console.error('Failed to open local folder:', error);
      addToast({
        type: 'error',
        message: `Failed to open folder: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  };

  // In offline mode, skip authentication requirement
  if (mode === 'offline') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900">Data Modelling Application</h1>
              <OnlineOfflineToggle />
            </div>
            <p className="mt-2 text-sm text-gray-600">Offline Mode - Working locally without API</p>
          </div>
        </header>
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-6 flex gap-4 items-center">
              <WorkspaceSelector />
              <button
                onClick={handleOpenLocalFolder}
                className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Open Workspace Folder
              </button>
              <button
                onClick={() => setShowCreateDialog(true)}
                className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                New Workspace
              </button>
            </div>
            
            {/* Workspace List */}
            <WorkspaceList onWorkspaceSelect={(workspaceId) => navigate(`/workspace/${workspaceId}`)} />
            
            {/* Create Workspace Dialog for offline mode */}
            {showCreateDialog && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full">
                  <h2 className="text-xl font-bold mb-4">Create New Workspace</h2>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target as HTMLFormElement);
                      const name = formData.get('name') as string;
                      const type = formData.get('type') as 'personal' | 'shared';
                      
                      try {
                        const workspace = {
                          id: `offline-${Date.now()}`,
                          name,
                          type,
                          owner_id: 'offline-user',
                          created_at: new Date().toISOString(),
                          last_modified_at: new Date().toISOString(),
                        };
                        addWorkspace(workspace);
                        setShowCreateDialog(false);
                        navigate(`/workspace/${workspace.id}`);
                      } catch (error) {
                        addToast({
                          type: 'error',
                          message: 'Failed to create workspace',
                        });
                      }
                    }}
                  >
                    <div className="mb-4">
                      <label htmlFor="workspace-name-offline" className="block text-sm font-medium text-gray-700 mb-2">
                        Workspace Name
                      </label>
                      <input
                        id="workspace-name-offline"
                        name="name"
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="mb-4">
                      <label htmlFor="workspace-type-offline" className="block text-sm font-medium text-gray-700 mb-2">
                        Workspace Type
                      </label>
                      <select
                        id="workspace-type-offline"
                        name="type"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="personal">Personal</option>
                        <option value="shared">Shared</option>
                      </select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCreateDialog(false)}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Create
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // In online mode, require authentication
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <div className="mb-4">
            <OnlineOfflineToggle />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Data Modelling Application</h1>
          <p className="text-gray-600 mb-6">Online mode requires authentication. Please log in to continue.</p>
          <button
            onClick={async (e) => {
              e.preventDefault();
              if (isCheckingLogin) return; // Prevent multiple clicks
              
              setIsCheckingLogin(true);
              
              try {
                // First check health endpoint
                const isOnline = await sdkModeDetector.checkOnlineMode();
                
                if (!isOnline) {
                  addToast({
                    type: 'error',
                    message: 'API server is not available. Please switch to offline mode or ensure the API server is running.',
                  });
                  setIsCheckingLogin(false);
                  return;
                }
                
                // Use desktop OAuth flow for Electron, web flow for browser
                if (isElectron()) {
                  try {
                    addToast({
                      type: 'info',
                      message: 'Opening GitHub authentication in your browser...',
                    });
                    
                    // Use desktop OAuth flow
                    const tokens = await electronAuthService.completeDesktopAuth();
                    
                    // Login with tokens
                    await login(tokens);
                    
                    addToast({
                      type: 'success',
                      message: 'Successfully authenticated!',
                    });
                  } catch (authError) {
                    addToast({
                      type: 'error',
                      message: `Authentication failed: ${authError instanceof Error ? authError.message : 'Unknown error'}`,
                    });
                    console.error('Desktop auth failed:', authError);
                  } finally {
                    setIsCheckingLogin(false);
                  }
                } else {
                  // Browser: Use web OAuth flow
                  try {
                    // Dynamically determine the frontend URL (origin only - API will append /auth/complete)
                    const frontendOrigin = window.location.origin;
                    
                    // Use relative URL which will be proxied by Nginx
                    // Pass only the origin - API will append /auth/complete to it
                    const authEndpoint = `/api/v1/auth/github/login?redirect_uri=${encodeURIComponent(frontendOrigin)}`;
                    
                    const response = await fetch(authEndpoint, {
                      method: 'HEAD',
                      signal: AbortSignal.timeout(2000),
                      redirect: 'manual', // Don't follow redirects, just check if endpoint exists
                    });
                    
                    // If we get a redirect (302/301), OK, or even 405 (method not allowed), the endpoint exists
                    if (response.status === 302 || response.status === 301 || response.ok || response.status === 405) {
                      // Endpoint exists, proceed with login
                      window.location.href = authEndpoint;
                    } else if (response.status === 404) {
                      addToast({
                        type: 'error',
                        message: 'GitHub OAuth endpoint not found (404). Please check your API server configuration or switch to offline mode.',
                      });
                      setIsCheckingLogin(false);
                    } else {
                      // Other error - try anyway, might work
                      console.warn('Unexpected response from auth endpoint:', response.status);
                      window.location.href = authEndpoint;
                    }
                  } catch (fetchError) {
                    // Fetch failed - endpoint doesn't exist or server error
                    addToast({
                      type: 'error',
                      message: 'Cannot reach authentication endpoint. The API server may not be running or the endpoint is not configured. Please switch to offline mode or start the API server.',
                    });
                    console.error('Auth endpoint check failed:', fetchError);
                    setIsCheckingLogin(false);
                  }
                }
              } catch (error) {
                // Network error or timeout - API is likely not available
                addToast({
                  type: 'error',
                  message: 'Cannot connect to API server. Please switch to offline mode or ensure the API server is running.',
                });
                console.error('API check failed:', error);
                setIsCheckingLogin(false);
              }
            }}
            disabled={isCheckingLogin}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isCheckingLogin ? 'Checking API...' : 'Login with GitHub'}
          </button>
          <p className="mt-4 text-sm text-gray-500 text-center">
            Or switch to offline mode to work without authentication
          </p>
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            <p className="font-semibold mb-1">API Server Required</p>
            <p className="text-xs">
              Make sure the API server is running on {import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Data Modelling Application</h1>
            <OnlineOfflineToggle />
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6 flex gap-4 items-center">
            <WorkspaceSelector />
            <button
              onClick={() => setShowCreateDialog(true)}
              className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              New Workspace
            </button>
          </div>
          
          {/* Workspace List */}
          <WorkspaceList onWorkspaceSelect={(workspaceId) => navigate(`/workspace/${workspaceId}`)} />
          
          {/* Create Workspace Dialog */}
          {showCreateDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <h2 className="text-xl font-bold mb-4">Create New Workspace</h2>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target as HTMLFormElement);
                    const name = formData.get('name') as string;
                    const type = formData.get('type') as 'personal' | 'shared';
                    
                    try {
                      const workspace = await createWorkspace({
                        name,
                        type,
                      });
                      setShowCreateDialog(false);
                      navigate(`/workspace/${workspace.id}`);
                    } catch (error) {
                      addToast({
                        type: 'error',
                        message: 'Failed to create workspace',
                      });
                    }
                  }}
                >
                  <div className="mb-4">
                    <label htmlFor="workspace-name" className="block text-sm font-medium text-gray-700 mb-2">
                      Workspace Name
                    </label>
                    <input
                      id="workspace-name"
                      name="name"
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="workspace-type" className="block text-sm font-medium text-gray-700 mb-2">
                      Workspace Type
                    </label>
                    <select
                      id="workspace-type"
                      name="type"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="personal">Personal</option>
                      <option value="shared">Shared</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateDialog(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Create
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Home;

