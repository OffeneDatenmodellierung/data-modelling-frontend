/**
 * Confirm Dialog Component
 * A dialog with customizable action buttons (e.g., Save, Don't Save, Cancel)
 */

import React from 'react';
import { Dialog } from './Dialog';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  actions: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    autoClose?: boolean;
  }>;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  title,
  message,
  actions,
}) => {
  const handleAction = (action: ConfirmDialogProps['actions'][0]) => {
    action.onClick();
    if (action.autoClose !== false) {
      onClose();
    }
  };

  const getButtonClasses = (variant: string = 'secondary') => {
    const baseClasses = 'px-4 py-2 text-sm font-medium rounded-md transition-colors min-w-[100px]';
    switch (variant) {
      case 'primary':
        return `${baseClasses} bg-blue-600 text-white hover:bg-blue-700`;
      case 'danger':
        return `${baseClasses} bg-red-600 text-white hover:bg-red-700`;
      case 'secondary':
      default:
        return `${baseClasses} bg-gray-100 text-gray-700 hover:bg-gray-200`;
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title} size="sm" showCloseButton={false}>
      <div className="space-y-4">
        <p className="text-sm text-gray-700">{message}</p>
        
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleAction(action)}
              className={getButtonClasses(action.variant)}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </Dialog>
  );
};


