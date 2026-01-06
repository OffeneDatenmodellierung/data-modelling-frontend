/**
 * Table Card Component
 * Conceptual-level table card for Systems View
 * Shows title, color based on data_level, and description
 */

import React from 'react';
import type { Table } from '@/types/table';
import type { QualityTier } from '@/types/table';

export interface TableCardProps {
  table: Table;
  onClick?: () => void;
  onEdit?: (tableId: string) => void;
  onDelete?: (tableId: string) => void;
  onExport?: (tableId: string) => void;
  onBPMNClick?: (tableId: string) => void;
  hasBPMNLink?: boolean;
  selected?: boolean;
}

const getDataLevelColor = (dataLevel?: QualityTier): string => {
  switch (dataLevel) {
    case 'operational':
      return 'bg-blue-500';
    case 'bronze':
      return 'bg-amber-600';
    case 'silver':
      return 'bg-gray-400';
    case 'gold':
      return 'bg-yellow-400';
    default:
      return 'bg-gray-300';
  }
};

const getDataLevelLabel = (dataLevel?: QualityTier): string => {
  switch (dataLevel) {
    case 'operational':
      return 'Operational';
    case 'bronze':
      return 'Bronze';
    case 'silver':
      return 'Silver';
    case 'gold':
      return 'Gold';
    default:
      return 'Operational';
  }
};

export const TableCard: React.FC<TableCardProps> = ({ 
  table, 
  onClick, 
  onEdit, 
  onDelete, 
  onExport, 
  onBPMNClick,
  hasBPMNLink = false,
  selected 
}) => {
  // Get data level from table (can be in data_level or metadata.quality_tier)
  const dataLevel: QualityTier = (table.data_level || 
    (table.metadata?.quality_tier as QualityTier) || 
    'operational') as QualityTier;
  
  const colorClass = getDataLevelColor(dataLevel);
  const levelLabel = getDataLevelLabel(dataLevel);

  return (
    <div
      onClick={onClick}
      className={`
        relative bg-white border-2 rounded-lg shadow-sm cursor-pointer
        transition-all hover:shadow-md overflow-hidden group
        ${selected ? 'border-blue-600 ring-2 ring-blue-200' : 'border-gray-200'}
      `}
      role="button"
      tabIndex={0}
      aria-label={`Table: ${table.name} (${levelLabel})`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.();
        }
      }}
    >
      {/* Color bar indicating data level */}
      <div className={`h-1 ${colorClass}`} title={`Data Level: ${levelLabel}`} />
      
      {/* Card content */}
      <div className="p-3">
        {/* Title */}
        <div className="font-semibold text-gray-900 mb-1 truncate" title={table.name}>
          {table.name}
        </div>
        
        {/* Data level badge and BPMN indicator */}
        <div className="mb-2 flex items-center gap-1 flex-wrap">
          <span 
            className={`inline-block px-2 py-0.5 text-xs font-medium rounded text-white ${colorClass}`}
            title={`Data Level: ${levelLabel}`}
          >
            {levelLabel}
          </span>
          {/* BPMN Model Indicator */}
          {hasBPMNLink && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onBPMNClick?.(table.id);
              }}
              className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
              title="Click to view BPMN process model"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              BPMN
            </button>
          )}
        </div>
        
        {/* Description */}
        {table.description && (
          <div 
            className="text-xs text-gray-500 line-clamp-2" 
            title={table.description}
          >
            {table.description}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        {onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(table.id); }}
            className="p-1 bg-white rounded shadow text-blue-600 hover:text-blue-800"
            title="Edit Table"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}
        {onExport && (
          <button
            onClick={(e) => { e.stopPropagation(); onExport(table.id); }}
            className="p-1 bg-white rounded shadow text-green-600 hover:text-green-800"
            title="Export Table"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(table.id); }}
            className="p-1 bg-white rounded shadow text-red-600 hover:text-red-800"
            title="Delete Table"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};


