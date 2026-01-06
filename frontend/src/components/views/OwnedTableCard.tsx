/**
 * Owned Table Card Component
 * Table card for tables owned by the current domain
 * Uses bold colors matching data level
 */

import React from 'react';
import type { Table } from '@/types/table';
import { TableStatusBadge } from './TableStatusBadge';

export interface OwnedTableCardProps {
  table: Table;
  onClick?: () => void;
  selected?: boolean;
}

export const OwnedTableCard: React.FC<OwnedTableCardProps> = ({ table, onClick, selected }) => {
  const dataLevel = table.data_level || 'operational';

  // Bold colors for owned tables
  const boldColors = {
    operational: 'bg-blue-600 text-white',
    bronze: 'bg-amber-600 text-white',
    silver: 'bg-gray-400 text-white',
    gold: 'bg-yellow-500 text-white',
  };

  return (
    <div
      onClick={onClick}
      className={`
        border-2 rounded-lg shadow-md cursor-pointer
        transition-all hover:shadow-lg
        ${selected ? 'border-blue-600 ring-2 ring-blue-200' : 'border-gray-300'}
      `}
      role="button"
      tabIndex={0}
      aria-label={`Table: ${table.name}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.();
        }
      }}
    >
      {/* Title bar with bold color */}
      <div className={`px-3 py-2 ${boldColors[dataLevel]} rounded-t-lg flex items-center justify-between`}>
        <span className="font-semibold">{table.name}</span>
        <TableStatusBadge dataLevel={dataLevel} size="sm" />
      </div>
      
      {/* Content area */}
      <div className="p-3 bg-white rounded-b-lg">
        {table.description && (
          <div className="text-sm text-gray-600 mb-2">{table.description}</div>
        )}
        {table.owner && (
          <div className="text-xs text-gray-500">
            Owner: {table.owner.name || table.owner.email}
          </div>
        )}
      </div>
    </div>
  );
};



