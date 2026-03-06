/**
 * Metric View Card Component
 * Compact card for displaying Databricks Metric Views in Systems View
 */

import React from 'react';
import type { MetricView } from '@/types/metricView';

export interface MetricViewCardProps {
  metricView: MetricView;
  onClick?: () => void;
  onEdit?: (viewId: string) => void;
  onDelete?: (viewId: string) => void;
  onExport?: (viewId: string) => void;
  selected?: boolean;
}

export const MetricViewCard: React.FC<MetricViewCardProps> = ({
  metricView,
  onClick,
  onEdit,
  onDelete,
  onExport,
  selected = false,
}) => {
  const isMaterialized = metricView.view_type === 'materialized';

  return (
    <div
      className={`
        bg-white border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow group relative
        ${selected ? 'border-blue-500 ring-1 ring-blue-200' : 'border-purple-200'}
      `}
      onClick={onClick}
    >
      {/* Gold-to-purple gradient bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 to-purple-400 rounded-t-lg" />

      {/* Action buttons */}
      {(onEdit || onDelete || onExport) && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(metricView.id);
              }}
              className="p-1 bg-white rounded shadow text-blue-600 hover:text-blue-800 text-xs"
              title="Edit"
            >
              Edit
            </button>
          )}
          {onExport && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExport(metricView.id);
              }}
              className="p-1 bg-white rounded shadow text-green-600 hover:text-green-800 text-xs"
              title="Export DBMV YAML"
            >
              Export
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(metricView.id);
              }}
              className="p-1 bg-white rounded shadow text-red-600 hover:text-red-800 text-xs"
              title="Delete"
            >
              Del
            </button>
          )}
        </div>
      )}

      {/* Name */}
      <div className="font-medium text-sm text-gray-900 truncate mt-1" title={metricView.name}>
        {metricView.name}
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1 mt-1 flex-wrap">
        <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-100 text-purple-700">
          Metric View
        </span>
        {isMaterialized ? (
          <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-600 text-white">
            Materialized
          </span>
        ) : (
          <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded bg-yellow-100 text-yellow-800">
            Standard
          </span>
        )}
      </div>

      {/* Source and counts */}
      <div className="text-xs text-gray-500 mt-1 truncate" title={`Source: ${metricView.source}`}>
        {metricView.source}
      </div>
      <div className="flex gap-2 text-[10px] text-gray-400 mt-0.5">
        <span>{metricView.dimensions.length} dim</span>
        <span>{metricView.measures.length} meas</span>
      </div>

      {/* Description */}
      {metricView.description && (
        <div className="text-xs text-gray-500 mt-1 line-clamp-1" title={metricView.description}>
          {metricView.description}
        </div>
      )}
    </div>
  );
};
