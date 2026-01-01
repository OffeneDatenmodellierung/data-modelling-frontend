/**
 * Domain Selector Component
 * Allows switching between Conceptual, Logical, and Physical model types
 */

import React from 'react';
import { useModelStore } from '@/stores/modelStore';
import { useUIStore } from '@/stores/uiStore';
import type { ModelType } from '@/types/workspace';
import { formatModelType } from '@/utils/formatting';
import { HelpText } from '@/components/common/HelpText';

export interface DomainSelectorProps {
  workspaceId: string;
  onModelTypeChange?: (modelType: ModelType) => void;
}

export const DomainSelector: React.FC<DomainSelectorProps> = ({
  onModelTypeChange,
}) => {
  const { domains, selectedDomainId, setSelectedDomain } = useModelStore();
  const { addToast } = useUIStore();

  const modelTypes: ModelType[] = ['conceptual', 'logical', 'physical'];
  const currentDomain = domains.find((d) => d.id === selectedDomainId);
  const currentModelType = currentDomain?.model_type || 'conceptual';

  const handleModelTypeChange = (modelType: ModelType) => {
    // Find or create domain for this model type
    const domain = domains.find((d) => d.model_type === modelType);
    if (domain) {
      setSelectedDomain(domain.id);
      onModelTypeChange?.(modelType);
    } else {
      // Domain for this model type doesn't exist - show message to user
      console.warn(`Domain for model type ${modelType} not found`);
      addToast({
        type: 'info',
        message: `Please create a ${formatModelType(modelType)} domain first`,
      });
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
      <label htmlFor="model-type-selector" className="text-sm font-medium text-gray-700">
        Model Type:
      </label>
      <select
        id="model-type-selector"
        value={currentModelType}
        onChange={(e) => handleModelTypeChange(e.target.value as ModelType)}
        className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Select model type"
      >
        {modelTypes.map((type) => (
          <option key={type} value={type}>
            {formatModelType(type)}
          </option>
        ))}
      </select>
      <HelpText
        text="Conceptual models show high-level entities. Logical models add attributes and relationships. Physical models include data types and constraints."
        title="Model Types"
      />
    </div>
  );
};

