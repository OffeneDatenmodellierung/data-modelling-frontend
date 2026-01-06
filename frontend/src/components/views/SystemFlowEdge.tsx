/**
 * System Flow Edge Component
 * Represents data flow between systems in Systems View
 */

import React from 'react';
import { BaseEdge, EdgeProps } from 'reactflow';

export interface SystemFlowEdgeData {
  flowType: 'data' | 'transformation';
  label?: string;
}

export const SystemFlowEdge: React.FC<EdgeProps<SystemFlowEdgeData>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  data,
}) => {
  const { flowType, label } = data || {};

  // Create smooth edge path
  const edgePath = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;

  const edgeStyle = {
    ...style,
    stroke: flowType === 'transformation' ? '#f59e0b' : '#3b82f6',
    strokeWidth: 2,
    strokeDasharray: flowType === 'transformation' ? '5,5' : undefined,
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={edgeStyle}
      />
      {label && (
        <text
          x={(sourceX + targetX) / 2}
          y={(sourceY + targetY) / 2}
          className="text-xs fill-gray-600 pointer-events-none"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {label}
        </text>
      )}
    </>
  );
};

