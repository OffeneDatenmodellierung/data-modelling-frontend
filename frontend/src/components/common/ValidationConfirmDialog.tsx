/**
 * ValidationConfirmDialog Component
 * Confirmation dialog shown when validation errors exist before save/commit operations
 */

import React, { useEffect, useRef } from 'react';
import { trapFocus, generateAriaId } from '@/utils/accessibility';

export interface ValidationConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onViewIssues: () => void;
  errorCount: number;
  warningCount: number;
  title: string;
  message?: string;
  confirmLabel?: string;
}

export const ValidationConfirmDialog: React.FC<ValidationConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onViewIssues,
  errorCount,
  warningCount,
  title,
  message,
  confirmLabel = 'Proceed',
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = generateAriaId('validation-dialog-title');
  const descriptionId = generateAriaId('validation-dialog-description');

  useEffect(() => {
    if (!isOpen) return;

    // Trap focus when dialog opens
    const cleanup = dialogRef.current ? trapFocus(dialogRef.current) : undefined;

    // Focus first focusable element
    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Handle Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);

    return () => {
      cleanup?.();
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasErrors = errorCount > 0;
  const hasWarnings = warningCount > 0;

  const defaultMessage = hasErrors
    ? `There ${errorCount === 1 ? 'is' : 'are'} ${errorCount} validation error${errorCount === 1 ? '' : 's'} in the workspace.${
        hasWarnings
          ? ` Additionally, there ${warningCount === 1 ? 'is' : 'are'} ${warningCount} warning${warningCount === 1 ? '' : 's'}.`
          : ''
      }`
    : `There ${warningCount === 1 ? 'is' : 'are'} ${warningCount} validation warning${warningCount === 1 ? '' : 's'} in the workspace.`;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog container */}
      <div className="flex min-h-full items-center justify-center p-4">
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events */}
        <div
          ref={dialogRef}
          className="relative bg-white rounded-lg shadow-xl max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* Header with icon */}
          <div className="flex items-start gap-4 p-6 pb-4">
            {/* Warning/Error icon */}
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                hasErrors ? 'bg-red-100' : 'bg-yellow-100'
              }`}
            >
              {hasErrors ? (
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              )}
            </div>

            <div className="flex-1">
              <h3 id={titleId} className="text-lg font-semibold text-gray-900">
                {title}
              </h3>
              <p id={descriptionId} className="mt-2 text-sm text-gray-600">
                {message || defaultMessage}
              </p>

              {/* Issue counts */}
              <div className="mt-3 flex gap-3">
                {hasErrors && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {errorCount} error{errorCount !== 1 ? 's' : ''}
                  </span>
                )}
                {hasWarnings && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {warningCount} warning{warningCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-6 py-4 bg-gray-50 rounded-b-lg">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              onClick={onViewIssues}
              className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              View Issues
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                hasErrors
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  : 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
              }`}
            >
              {confirmLabel} Anyway
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
