/**
 * Systems View Actions Component
 * Provides Create/Import System button for Systems view
 */

import React, { useState } from 'react';
import { CreateSystemDialog } from '@/components/system/CreateSystemDialog';
import { useModelStore } from '@/stores/modelStore';

export interface SystemsViewActionsProps {
  domainId: string;
}

export const SystemsViewActions: React.FC<SystemsViewActionsProps> = ({ domainId }) => {
  const [showCreateSystemDialog, setShowCreateSystemDialog] = useState(false);

  const handleCreate = () => {
    setShowCreateSystemDialog(true);
  };

  return (
    <>
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={handleCreate}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg shadow-lg hover:bg-indigo-700 flex items-center gap-2"
          title="Create or import a system (database, schema, namespace)"
        >
          <span>+</span>
          <span>Create/Import System</span>
        </button>
      </div>

      {/* Create System Dialog */}
      <CreateSystemDialog
        domainId={domainId}
        isOpen={showCreateSystemDialog}
        onClose={() => setShowCreateSystemDialog(false)}
        onCreated={(systemId) => {
          setShowCreateSystemDialog(false);
          // Optionally select the system
          useModelStore.getState().setSelectedSystem(systemId);
        }}
      />
    </>
  );
};


