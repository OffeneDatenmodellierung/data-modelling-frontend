/**
 * Help Button Component
 * Toolbar button to open the help panel
 */

import React from 'react';
import { useHelpStore } from '@/stores/helpStore';
import { Tooltip } from '@/components/common/Tooltip';

interface HelpButtonProps {
  className?: string;
  showLabel?: boolean;
}

export const HelpButton: React.FC<HelpButtonProps> = ({ className = '', showLabel = true }) => {
  const { toggleHelp } = useHelpStore();

  return (
    <Tooltip content="Help (F1)" position="bottom">
      <button
        onClick={() => toggleHelp()}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors ${className}`}
        aria-label="Open help"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        {showLabel && <span>Help</span>}
      </button>
    </Tooltip>
  );
};

/**
 * Compact help button (icon only)
 */
export const HelpIconButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { toggleHelp } = useHelpStore();

  return (
    <Tooltip content="Help (F1)" position="bottom">
      <button
        onClick={() => toggleHelp()}
        className={`p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${className}`}
        aria-label="Open help"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
    </Tooltip>
  );
};
