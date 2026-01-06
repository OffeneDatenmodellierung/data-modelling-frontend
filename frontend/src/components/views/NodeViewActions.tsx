/**
 * Node View Actions Component
 * Provides Create/Import Node button for Process View
 */

import React, { useState } from 'react';
import { useModelStore } from '@/stores/modelStore';
import { CreateNodeDialog } from './CreateNodeDialog';
import { Tooltip } from '@/components/common/Tooltip';

export interface NodeViewActionsProps {
  domainId: string;
}

export const NodeViewActions: React.FC<NodeViewActionsProps> = ({ domainId }) => {
  const { currentView, selectedSystemId } = useModelStore();
  const [showCreateNodeDialog, setShowCreateNodeDialog] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Only show in Process View
  if (currentView !== 'process') {
    return null;
  }

  // Require a system to be selected
  if (!selectedSystemId) {
    return null;
  }

  const handleCreate = () => {
    setShowCreateNodeDialog(true);
  };

  return (
    <>
      <div className="absolute top-4 right-4 z-10" style={{ transform: 'translateX(-200px)' }}>
        <div className="relative">
          <button
            onClick={handleCreate}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg shadow-lg hover:bg-purple-700 flex items-center gap-2"
            title="Create or import an AI/ML/App node (CADS node)"
          >
            <span>+</span>
            <span>Create/Import Node</span>
          </button>
          {showTooltip && (
            <Tooltip
              content="Add AI, ML, or App nodes to this system. These are CADS (Compute Asset Definition Standard) nodes that represent compute assets."
              position="bottom"
            >
              <span />
            </Tooltip>
          )}
        </div>
      </div>

      {/* Create/Import Node Dialog */}
      <CreateNodeDialog
        domainId={domainId}
        isOpen={showCreateNodeDialog}
        onClose={() => setShowCreateNodeDialog(false)}
        onCreated={() => {
          setShowCreateNodeDialog(false);
        }}
      />
    </>
  );
};

