/**
 * Viewer Redirect Page
 *
 * In viewer mode, this page auto-redirects to the configured
 * GitHub repo workspace. Used as the landing page and catch-all.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getViewerConfig } from '@/services/viewerMode';

const ViewerRedirect: React.FC = () => {
  const navigate = useNavigate();
  const config = getViewerConfig();

  useEffect(() => {
    const path = config.workspacePath || '_root_';
    const url = `/workspace/github/${config.owner}/${config.repo}/${config.branch}/${path}`;
    navigate(url, { replace: true });
  }, [navigate, config]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading viewer...</p>
      </div>
    </div>
  );
};

export default ViewerRedirect;
