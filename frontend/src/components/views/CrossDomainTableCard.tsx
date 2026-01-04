/**
 * Cross-Domain Table Card Component
 * View-only table card for tables from other domains
 * Uses dotted border and pastel shades
 */

import React from 'react';
import type { Table } from '@/types/table';
import { TableStatusBadge } from './TableStatusBadge';

export interface CrossDomainTableCardProps {
  table: Table;
  onClick?: () => void;
  selected?: boolean;
}

export const CrossDomainTableCard: React.FC<CrossDomainTableCardProps> = ({
  table,
  onClick,
  selected,
}) => {
  const dataLevel = table.data_level || 'operational';

  // Pastel color shades for cross-domain tables
  const pastelColors = {
    operational: 'bg-blue-50 border-blue-200',
    bronze: 'bg-amber-50 border-amber-200',
    silver: 'bg-gray-50 border-gray-200',
    gold: 'bg-yellow-50 border-yellow-200',
  };

  return (
    <div
      onClick={onClick}
      className={`
        border-2 border-dashed rounded-lg shadow-sm p-3 cursor-pointer
        transition-all hover:shadow-md opacity-75
        ${pastelColors[dataLevel]}
        ${selected ? 'ring-2 ring-blue-200' : ''}
      `}
      role="button"
      tabIndex={0}
      aria-label={`Read-only table: ${table.name}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.();
        }
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="font-semibold text-gray-700">{table.name}</div>
        <div className="flex items-center gap-1">
          <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded" title="Read-only">
            RO
          </span>
          <TableStatusBadge dataLevel={dataLevel} size="sm" />
        </div>
      </div>
      {table.description && (
        <div className="text-xs text-gray-500 line-clamp-2" title={table.description}>
          {table.description}
        </div>
      )}
    </div>
  );
};



