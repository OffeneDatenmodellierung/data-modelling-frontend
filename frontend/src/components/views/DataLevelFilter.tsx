/**
 * Data Level Filter Component
 * Filter selector for Operational/Analytical data levels
 */

import React from 'react';
import { useModelStore, type DataLevel } from '@/stores/modelStore';

export interface DataLevelFilterProps {
  viewMode: 'operational' | 'analytical';
}

const OPERATIONAL_LEVELS: DataLevel[] = ['operational'];
const ANALYTICAL_LEVELS: DataLevel[] = ['bronze', 'silver', 'gold'];

export const DataLevelFilter: React.FC<DataLevelFilterProps> = ({ viewMode }) => {
  const { selectedDataLevel, setSelectedDataLevel } = useModelStore();

  const levels = viewMode === 'operational' ? OPERATIONAL_LEVELS : ANALYTICAL_LEVELS;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200">
      <span className="text-sm font-medium text-gray-700">Filter:</span>
      <button
        onClick={() => setSelectedDataLevel(null)}
        className={`
          px-3 py-1 text-sm rounded transition-colors
          ${selectedDataLevel === null
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
          }
        `}
      >
        All
      </button>
      {levels.map((level) => (
        <button
          key={level}
          onClick={() => setSelectedDataLevel(level)}
          className={`
            px-3 py-1 text-sm rounded transition-colors capitalize
            ${selectedDataLevel === level
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }
          `}
        >
          {level}
        </button>
      ))}
    </div>
  );
};



