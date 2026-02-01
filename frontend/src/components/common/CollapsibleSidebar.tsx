/**
 * Collapsible Sidebar Component
 * A reusable sidebar that can be collapsed/expanded to give more space to main content
 */

import React, { useState, useCallback, ReactNode } from 'react';

export interface CollapsibleSidebarProps {
  /** Content to render in the sidebar */
  children: ReactNode;
  /** Width of the sidebar when expanded (default: 320px / w-80) */
  width?: string;
  /** Whether the sidebar starts collapsed */
  defaultCollapsed?: boolean;
  /** Optional callback when collapse state changes */
  onCollapseChange?: (collapsed: boolean) => void;
  /** Additional CSS classes */
  className?: string;
  /** Title to show when collapsed (optional) */
  collapsedTitle?: string;
}

export const CollapsibleSidebar: React.FC<CollapsibleSidebarProps> = ({
  children,
  width = 'w-80',
  defaultCollapsed = false,
  onCollapseChange,
  className = '',
  collapsedTitle,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const toggleCollapse = useCallback(() => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    onCollapseChange?.(newState);
  }, [isCollapsed, onCollapseChange]);

  return (
    <div
      className={`relative flex-shrink-0 border-r border-gray-200 transition-all duration-200 ${
        isCollapsed ? 'w-10' : width
      } ${className}`}
    >
      {/* Toggle Button */}
      <button
        onClick={toggleCollapse}
        className="absolute -right-3 top-4 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 bg-white shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg
          className={`h-3 w-3 text-gray-600 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Content */}
      {isCollapsed ? (
        <div className="flex h-full flex-col items-center pt-12">
          {collapsedTitle && (
            <span
              className="text-xs font-medium text-gray-500 writing-mode-vertical"
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
            >
              {collapsedTitle}
            </span>
          )}
        </div>
      ) : (
        <div className="flex h-full flex-col overflow-hidden">{children}</div>
      )}
    </div>
  );
};
