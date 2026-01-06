/**
 * Table View Actions Component
 * Provides Create/Import Table button for Process, Operational, and Analytical views
 */

import React, { useState } from 'react';
import { useModelStore } from '@/stores/modelStore';
import { CreateTableDialog } from '@/components/table/CreateTableDialog';

export interface TableViewActionsProps {
  workspaceId: string;
  domainId: string;
}

export const TableViewActions: React.FC<TableViewActionsProps> = ({ workspaceId, domainId }) => {
  const { currentView, selectedSystemId, setSelectedTable } = useModelStore();
  const [showCreateTableDialog, setShowCreateTableDialog] = useState(false);

  // Only show in Process, Operational, and Analytical views
  if (currentView !== 'process' && currentView !== 'operational' && currentView !== 'analytical') {
    return null;
  }

  // Require a system to be selected
  if (!selectedSystemId) {
    return null;
  }

  const handleCreate = () => {
    setShowCreateTableDialog(true);
  };

  return (
    <>
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={handleCreate}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-lg hover:bg-blue-700 flex items-center gap-2"
          title="Create or import a table"
        >
          <span>+</span>
          <span>Create/Import Table</span>
        </button>
      </div>

      {/* Create/Import Table Dialog */}
      <CreateTableDialog
        workspaceId={workspaceId}
        domainId={domainId}
        isOpen={showCreateTableDialog}
        onClose={() => setShowCreateTableDialog(false)}
        onCreated={(tableId) => {
          setShowCreateTableDialog(false);
          // Select the newly created table to open the edit dialog
          setSelectedTable(tableId);
        }}
      />
    </>
  );
};

