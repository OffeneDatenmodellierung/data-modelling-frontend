/**
 * GitHub File Browser Component
 * Browse and view files in the connected GitHub repository
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useGitHubStore, selectIsConnected, selectConnectionInfo } from '@/stores/githubStore';
import { githubProvider } from '@/services/github/githubProvider';
import type { GitHubContent } from '@/types/github';

export interface GitHubFileBrowserProps {
  className?: string;
  onFileSelect?: (path: string, content: string) => void;
  fileFilter?: (file: GitHubContent) => boolean;
}

interface BreadcrumbItem {
  name: string;
  path: string;
}

export const GitHubFileBrowser: React.FC<GitHubFileBrowserProps> = ({
  className = '',
  onFileSelect,
  fileFilter,
}) => {
  const isConnected = useGitHubStore(selectIsConnected);
  const connectionInfo = useGitHubStore(selectConnectionInfo);

  const [currentPath, setCurrentPath] = useState('');
  const [contents, setContents] = useState<GitHubContent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<GitHubContent | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  // Load directory contents
  const loadDirectory = useCallback(async (path: string) => {
    setIsLoading(true);
    setError(null);
    setSelectedFile(null);
    setFileContent(null);

    try {
      const items = await githubProvider.listDirectory(path);
      // Sort: directories first, then files, alphabetically
      items.sort((a, b) => {
        if (a.type === 'dir' && b.type !== 'dir') return -1;
        if (a.type !== 'dir' && b.type === 'dir') return 1;
        return a.name.localeCompare(b.name);
      });
      setContents(items);
      setCurrentPath(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load directory');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load file content
  const loadFile = useCallback(
    async (file: GitHubContent) => {
      setIsLoadingFile(true);
      setSelectedFile(file);
      setFileContent(null);

      try {
        const content = await githubProvider.getFileContent(file.path);
        setFileContent(content);
        onFileSelect?.(file.path, content || '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file');
      } finally {
        setIsLoadingFile(false);
      }
    },
    [onFileSelect]
  );

  // Load root directory on mount/connection change
  useEffect(() => {
    if (isConnected) {
      loadDirectory('');
    }
  }, [isConnected, loadDirectory]);

  // Build breadcrumbs
  const breadcrumbs = useMemo((): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [{ name: 'root', path: '' }];
    if (currentPath) {
      const parts = currentPath.split('/');
      let accumulatedPath = '';
      for (const part of parts) {
        accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;
        items.push({ name: part, path: accumulatedPath });
      }
    }
    return items;
  }, [currentPath]);

  // Filter contents if filter provided
  const filteredContents = useMemo(() => {
    if (!fileFilter) return contents;
    return contents.filter((item) => item.type === 'dir' || fileFilter(item));
  }, [contents, fileFilter]);

  // Handle item click
  const handleItemClick = useCallback(
    (item: GitHubContent) => {
      if (item.type === 'dir') {
        loadDirectory(item.path);
      } else if (item.type === 'file') {
        loadFile(item);
      }
    },
    [loadDirectory, loadFile]
  );

  // Handle breadcrumb click
  const handleBreadcrumbClick = useCallback(
    (path: string) => {
      loadDirectory(path);
    },
    [loadDirectory]
  );

  // Get file icon based on extension
  const getFileIcon = (name: string, type: string): React.ReactNode => {
    if (type === 'dir') {
      return (
        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>
      );
    }

    const ext = name.split('.').pop()?.toLowerCase();
    let color = 'text-gray-400';

    if (['yaml', 'yml', 'json'].includes(ext || '')) {
      color = 'text-yellow-500';
    } else if (['md', 'mdx'].includes(ext || '')) {
      color = 'text-blue-400';
    } else if (['ts', 'tsx', 'js', 'jsx'].includes(ext || '')) {
      color = 'text-blue-500';
    }

    return (
      <svg className={`w-5 h-5 ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    );
  };

  if (!isConnected) {
    return (
      <div className={`p-4 text-center text-gray-500 ${className}`}>
        Connect a GitHub repository to browse files
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-gray-700">{connectionInfo?.fullName}</span>
          <span className="text-gray-400">/</span>
          <span className="text-gray-500">{connectionInfo?.branch}</span>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="px-4 py-2 border-b border-gray-200 flex items-center gap-1 text-sm overflow-x-auto">
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.path}>
            {index > 0 && <span className="text-gray-400">/</span>}
            <button
              onClick={() => handleBreadcrumbClick(crumb.path)}
              className={`hover:text-blue-600 ${
                index === breadcrumbs.length - 1 ? 'font-medium text-gray-900' : 'text-gray-600'
              }`}
            >
              {crumb.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <svg className="w-6 h-6 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-600">{error}</div>
        ) : filteredContents.length === 0 ? (
          <div className="p-4 text-center text-gray-500">This directory is empty</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredContents.map((item) => (
              <button
                key={item.sha}
                onClick={() => handleItemClick(item)}
                className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-left ${
                  selectedFile?.path === item.path ? 'bg-blue-50' : ''
                }`}
              >
                {getFileIcon(item.name, item.type)}
                <span className="flex-1 truncate text-sm text-gray-900">{item.name}</span>
                {item.type === 'file' && (
                  <span className="text-xs text-gray-400">
                    {item.size > 1024 ? `${(item.size / 1024).toFixed(1)} KB` : `${item.size} B`}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* File Preview */}
      {selectedFile && (
        <div className="border-t border-gray-200 bg-gray-50">
          <div className="px-4 py-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{selectedFile.name}</span>
            <button
              onClick={() => {
                setSelectedFile(null);
                setFileContent(null);
              }}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto border-t border-gray-200 bg-white">
            {isLoadingFile ? (
              <div className="p-4 text-center text-gray-500">Loading file...</div>
            ) : fileContent !== null ? (
              <pre className="p-4 text-xs font-mono text-gray-700 whitespace-pre-wrap overflow-x-auto">
                {fileContent.slice(0, 5000)}
                {fileContent.length > 5000 && (
                  <span className="text-gray-400">... (truncated)</span>
                )}
              </pre>
            ) : (
              <div className="p-4 text-center text-gray-500">Unable to load file content</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
