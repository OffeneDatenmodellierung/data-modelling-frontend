/**
 * Logical Table Card Component
 * Logical-level table card for ETL View
 * Shows keys and relationships
 */

import React from 'react';
import type { Table } from '@/types/table';

export interface LogicalTableCardProps {
  table: Table;
  onClick?: () => void;
  selected?: boolean;
}

export const LogicalTableCard: React.FC<LogicalTableCardProps> = ({ table, onClick, selected }) => {
  // Show only keys (primary keys and foreign keys)
  const keyColumns = table.columns.filter(
    (col) => col.is_primary_key || col.is_foreign_key
  );

  return (
    <div
      onClick={onClick}
      className={`
        bg-white border-2 rounded-lg shadow-sm p-3 cursor-pointer
        transition-all hover:shadow-md min-w-[200px]
        ${selected ? 'border-blue-600 ring-2 ring-blue-200' : 'border-gray-200'}
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
      <div className="font-semibold text-gray-900 mb-2">{table.name}</div>
      {keyColumns.length > 0 ? (
        <div className="space-y-1">
          {keyColumns.map((col) => (
            <div key={col.id} className="flex items-center gap-2 text-sm">
              {col.is_primary_key && (
                <span className="text-yellow-600 font-bold text-xs">PK</span>
              )}
              {col.is_foreign_key && (
                <span className="text-green-600 font-bold text-xs">FK</span>
              )}
              <span className="text-gray-700">{col.name}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-gray-400 italic">No keys</div>
      )}
    </div>
  );
};



