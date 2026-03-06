/**
 * Metric View Actions Component
 * Provides Create/Import Metric View button for Analytical View
 */

import React, { useState } from 'react';
import { useModelStore } from '@/stores/modelStore';
import { CreateMetricViewDialog } from './CreateMetricViewDialog';
import { Tooltip } from '@/components/common/Tooltip';

export interface MetricViewActionsProps {
  domainId: string;
}

export const MetricViewActions: React.FC<MetricViewActionsProps> = ({ domainId }) => {
  const { currentView, selectedSystemId } = useModelStore();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Only show in Analytical View
  if (currentView !== 'analytical') {
    return null;
  }

  // Require a system to be selected
  if (!selectedSystemId) {
    return null;
  }

  return (
    <>
      <div className="absolute top-28 right-4 z-10">
        <div className="relative">
          <button
            onClick={() => setShowCreateDialog(true)}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className="p-2 text-white bg-amber-600 rounded-lg shadow-lg hover:bg-amber-700 flex items-center justify-center"
            title="Create or import a Databricks Metric View (DBMV)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </button>
          {showTooltip && (
            <Tooltip
              content="Add metric views to this system. These are DBMV (Databricks Metric View) resources with dimensions, measures, and optional materialization."
              position="left"
            >
              <span />
            </Tooltip>
          )}
        </div>
      </div>

      <CreateMetricViewDialog
        domainId={domainId}
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreated={() => setShowCreateDialog(false)}
      />
    </>
  );
};
