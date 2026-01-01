/**
 * Retry Dialog Component
 * Allows users to retry failed operations
 */

import React from 'react';
import { Dialog } from './Dialog';

export interface RetryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  error: Error | string | null;
  operation: string;
  retryCount?: number;
  maxRetries?: number;
}

export const RetryDialog: React.FC<RetryDialogProps> = ({
  isOpen,
  onClose,
  onRetry,
  error,
  operation,
  retryCount = 0,
  maxRetries = 5,
}) => {
  const errorMessage = error instanceof Error ? error.message : error || 'Unknown error';
  const canRetry = retryCount < maxRetries;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Operation Failed">
      <div className="p-4">
        <div className="mb-4">
          <p className="text-sm text-gray-700 mb-2">
            <strong>Operation:</strong> {operation}
          </p>
          <p className="text-sm text-red-600 mb-2">
            <strong>Error:</strong> {errorMessage}
          </p>
          {retryCount > 0 && (
            <p className="text-xs text-gray-500">
              Retry attempts: {retryCount} / {maxRetries}
            </p>
          )}
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600">
            {canRetry
              ? 'Would you like to retry this operation?'
              : 'Maximum retry attempts reached. The operation data is held in memory. You can try again manually or export your work.'}
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            {canRetry ? 'Cancel' : 'Close'}
          </button>
          {canRetry && (
            <button
              onClick={() => {
                onRetry();
                onClose();
              }}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          )}
          {!canRetry && (
            <button
              onClick={() => {
                // Export work option
                onClose();
              }}
              className="px-4 py-2 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              Export Work
            </button>
          )}
        </div>
      </div>
    </Dialog>
  );
};

