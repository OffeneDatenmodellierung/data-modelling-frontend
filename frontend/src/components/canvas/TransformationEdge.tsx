/**
 * Transformation Edge Component
 * Custom edge for transformation links between tables
 * Styled differently from regular relationships with metadata tooltips
 */

import React, { useMemo } from 'react';
import { BaseEdge, EdgeProps, getBezierPath } from 'reactflow';
import type { TransformationLink } from '@/types/bpmn';

export interface TransformationEdgeData {
  transformationLink: TransformationLink;
}

export const TransformationEdge: React.FC<EdgeProps<TransformationEdgeData>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const metadata = data?.transformationLink?.metadata || {};
  const hasMetadata = Object.keys(metadata).length > 0;
  const bpmnElementId = data?.transformationLink?.bpmn_element_id;

  // Style transformation edges differently - dashed line, purple color
  const edgeStyle = useMemo(
    () => ({
      stroke: selected ? '#9333ea' : '#a855f7',
      strokeWidth: selected ? 3 : 2,
      strokeDasharray: '5,5',
    }),
    [selected]
  );

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={edgeStyle} />
      {/* Metadata tooltip */}
      {hasMetadata && (
        <g>
          <foreignObject
            x={labelX - 100}
            y={labelY - 20}
            width={200}
            height={40}
            className="pointer-events-none"
          >
            <div className="bg-purple-100 border border-purple-300 rounded px-2 py-1 text-xs shadow-lg">
              <div className="font-semibold text-purple-800">Transformation</div>
              {bpmnElementId && (
                <div className="text-purple-600">BPMN: {bpmnElementId}</div>
              )}
              {Object.entries(metadata).slice(0, 2).map(([key, value]) => (
                <div key={key} className="text-purple-700">
                  {key}: {String(value)}
                </div>
              ))}
            </div>
          </foreignObject>
        </g>
      )}
    </>
  );
};



