import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AuthProvider } from './components/auth/AuthProvider';
import { ToastContainer } from './components/common/Toast';
import { GlobalLoading } from './components/common/Loading';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { SDKErrorPage } from './components/common/SDKErrorPage';

import { useSDKModeStore } from './services/sdk/sdkMode';
import { sdkLoader, SDKLoadError } from './services/sdk/sdkLoader';
import { getPlatform } from './services/platform/platform';
import { initializeGitHubStore } from './stores/githubStore';
import Home from './pages/Home';
import ModelEditor from './pages/ModelEditor';
import AuthCallback from './pages/AuthCallback';
import NotFound from './pages/NotFound';

// Use HashRouter for Electron (file:// protocol) and BrowserRouter for web
const Router =
  typeof window !== 'undefined' && window.location.protocol === 'file:'
    ? HashRouter
    : BrowserRouter;

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  const { initialize } = useSDKModeStore();
  const [modeInitialized, setModeInitialized] = useState(false);
  const [sdkError, setSdkError] = useState<SDKLoadError | null>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  // Initialize SDK mode first
  useEffect(() => {
    const initMode = async () => {
      await initialize();
      setModeInitialized(true);
    };
    initMode();
  }, [initialize]);

  // Load SDK WASM - required for app to function
  useEffect(() => {
    if (!modeInitialized) {
      return; // Wait for mode initialization
    }

    const loadSDK = async () => {
      try {
        await sdkLoader.load();
        console.log('[App] SDK WASM loaded successfully');

        // Initialize GitHub store for browser mode (revalidate stored token)
        const isElectron = getPlatform() === 'electron';
        if (!isElectron) {
          initializeGitHubStore().catch((err) => {
            console.warn('[App] GitHub auth initialization failed:', err);
          });
        }

        setSdkLoaded(true);
      } catch (error) {
        console.error('[App] Failed to load SDK WASM:', error);
        if (error instanceof SDKLoadError) {
          setSdkError(error);
        } else {
          setSdkError(
            new SDKLoadError(
              error instanceof Error ? error.message : 'Unknown SDK loading error',
              error instanceof Error ? error : undefined
            )
          );
        }
      }
    };

    loadSDK();
  }, [modeInitialized]);

  // Show SDK error page if SDK failed to load
  if (sdkError) {
    return <SDKErrorPage error={sdkError} />;
  }

  // Show loading while SDK is initializing
  if (!sdkLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading data modelling SDK...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log to error reporting service in production
        if (import.meta.env.PROD) {
          // TODO: Integrate with error reporting service (e.g., Sentry, LogRocket)
          console.error('Application error:', error, errorInfo);
        }
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router>
            <div className="min-h-screen bg-gray-50">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/workspace/:workspaceId" element={<ModelEditor />} />
                {/* GitHub repo workspace URLs have encoded slashes that expand to multiple segments */}
                <Route path="/workspace/github/*" element={<ModelEditor />} />
                <Route path="/auth/complete" element={<AuthCallback />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <ToastContainer />
              <GlobalLoading />
            </div>
          </Router>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
