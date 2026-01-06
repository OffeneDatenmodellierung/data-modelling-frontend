/**
 * Domain Selector Component
 * Displays current domain information (deprecated model-type selector removed)
 * View modes are now handled by ViewSelector component
 */

import React from 'react';
import { useModelStore } from '@/stores/modelStore';
import { HelpText } from '@/components/common/HelpText';

export interface DomainSelectorProps {
  workspaceId: string;
}

export const DomainSelector: React.FC<DomainSelectorProps> = () => {
  const { selectedDomainId, domains } = useModelStore();
  const selectedDomain = domains.find((d) => d.id === selectedDomainId);

  if (!selectedDomain) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
      <span className="text-sm font-medium text-gray-700">
        Domain: <span className="font-semibold">{selectedDomain.name}</span>
      </span>
      {selectedDomain.description && (
        <HelpText
          text={selectedDomain.description}
          title={`Domain: ${selectedDomain.name}`}
        />
      )}
    </div>
  );
};

