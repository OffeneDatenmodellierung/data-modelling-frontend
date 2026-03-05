/**
 * Metric View Node Component
 * ReactFlow node for displaying Databricks Metric Views (DBMV) on the canvas
 * Uses gold-to-purple gradient to distinguish from regular gold tables
 */

import React from 'react';
import { Handle, Position } from 'reactflow';
import type { MetricView } from '@/types/metricView';

export interface MetricViewNodeData {
  metricView: MetricView;
  nodeType: 'metric-view';
  onEdit?: (viewId: string) => void;
  onDelete?: (viewId: string) => void;
  onExport?: (viewId: string) => void;
  onView?: (viewId: string) => void;
  isShared?: boolean;
}

export interface MetricViewNodeProps {
  data: MetricViewNodeData;
  selected?: boolean;
}

export const MetricViewNode: React.FC<MetricViewNodeProps> = ({ data, selected }) => {
  const { metricView, onEdit, onDelete, onExport, onView, isShared = false } = data;
  const isMaterialized = metricView.view_type === 'materialized';

  // Gold-to-purple gradient for title bar
  const titleBarClass = isShared
    ? 'bg-gradient-to-r from-yellow-200 to-purple-200'
    : 'bg-gradient-to-r from-yellow-500 to-purple-400';

  const titleTextClass = isShared ? 'text-gray-700' : 'text-white';

  return (
    <div
      className={`
        bg-white rounded-lg shadow-md min-w-[200px] max-w-[250px] relative group
        ${isShared ? 'border-2 border-dashed border-purple-300' : 'border-2 border-solid border-purple-400'}
        ${selected ? 'border-blue-600 ring-2 ring-blue-200' : ''}
      `}
      role="group"
      aria-label={`Metric View: ${metricView.name}`}
    >
      {/* Connection handles - corners */}
      <Handle
        type="target"
        position={Position.Top}
        id="top-left"
        style={{ left: '0%' }}
        className="w-2 h-2"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top-right"
        style={{ left: '100%' }}
        className="w-2 h-2"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-left"
        style={{ left: '0%' }}
        className="w-2 h-2"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-right"
        style={{ left: '100%' }}
        className="w-2 h-2"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="src-top-left"
        style={{ left: '0%' }}
        className="w-2 h-2"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="src-top-right"
        style={{ left: '100%' }}
        className="w-2 h-2"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="src-bottom-left"
        style={{ left: '0%' }}
        className="w-2 h-2"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="src-bottom-right"
        style={{ left: '100%' }}
        className="w-2 h-2"
      />

      {/* Connection handles - top and bottom center */}
      <Handle
        type="target"
        position={Position.Top}
        id="top-center"
        style={{ left: '50%' }}
        className="w-2 h-2"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-center"
        style={{ left: '50%' }}
        className="w-2 h-2"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="src-top-center"
        style={{ left: '50%' }}
        className="w-2 h-2"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="src-bottom-center"
        style={{ left: '50%' }}
        className="w-2 h-2"
      />

      {/* Connection handles - left side */}
      <Handle
        type="target"
        position={Position.Left}
        id="left-top"
        style={{ top: '25%' }}
        className="w-2 h-2"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-center"
        style={{ top: '50%' }}
        className="w-2 h-2"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-bottom"
        style={{ top: '75%' }}
        className="w-2 h-2"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="src-left-top"
        style={{ top: '25%' }}
        className="w-2 h-2"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="src-left-center"
        style={{ top: '50%' }}
        className="w-2 h-2"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="src-left-bottom"
        style={{ top: '75%' }}
        className="w-2 h-2"
      />

      {/* Connection handles - right side */}
      <Handle
        type="target"
        position={Position.Right}
        id="right-top"
        style={{ top: '25%' }}
        className="w-2 h-2"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-center"
        style={{ top: '50%' }}
        className="w-2 h-2"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-bottom"
        style={{ top: '75%' }}
        className="w-2 h-2"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="src-right-top"
        style={{ top: '25%' }}
        className="w-2 h-2"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="src-right-center"
        style={{ top: '50%' }}
        className="w-2 h-2"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="src-right-bottom"
        style={{ top: '75%' }}
        className="w-2 h-2"
      />

      {/* Title bar with gold-to-purple gradient */}
      <div className={`px-3 py-2 ${titleBarClass} rounded-t-lg`}>
        <div className={`font-semibold text-sm truncate ${titleTextClass}`} title={metricView.name}>
          {metricView.name}
        </div>
      </div>

      {/* Edit/Delete/Export buttons */}
      {(onEdit || onDelete || onExport) && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <div className="flex gap-1">
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(metricView.id);
                }}
                className="p-1 bg-white rounded shadow text-blue-600 hover:text-blue-800"
                title="Edit Metric View"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
            )}
            {onExport && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onExport(metricView.id);
                }}
                className="p-1 bg-white rounded shadow text-green-600 hover:text-green-800"
                title="Export DBMV YAML"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(metricView.id);
                }}
                className="p-1 bg-white rounded shadow text-red-600 hover:text-red-800"
                title="Delete Metric View"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Node content */}
      <div
        className="p-3"
        onClick={onView ? () => onView(metricView.id) : undefined}
        style={onView ? { cursor: 'pointer' } : undefined}
      >
        {/* Type badge and materialization indicator */}
        <div className="mb-2 flex items-center gap-1 flex-wrap">
          <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-700">
            Metric View
          </span>
          {isMaterialized ? (
            <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-purple-600 text-white">
              Materialized
            </span>
          ) : (
            <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-yellow-100 text-yellow-800">
              Standard
            </span>
          )}
        </div>

        {/* Source table */}
        <div className="text-xs text-gray-500 mb-1 truncate" title={`Source: ${metricView.source}`}>
          Source: {metricView.source}
        </div>

        {/* Dimension and measure counts */}
        <div className="flex gap-3 text-xs text-gray-600">
          <span title={`${metricView.dimensions.length} dimension(s)`}>
            {metricView.dimensions.length} dim
          </span>
          <span title={`${metricView.measures.length} measure(s)`}>
            {metricView.measures.length} meas
          </span>
          {metricView.joins && metricView.joins.length > 0 && (
            <span title={`${metricView.joins.length} join(s)`}>{metricView.joins.length} join</span>
          )}
        </div>

        {/* Description */}
        {metricView.description && (
          <div className="text-xs text-gray-500 mt-1 line-clamp-2" title={metricView.description}>
            {metricView.description}
          </div>
        )}
      </div>
    </div>
  );
};
