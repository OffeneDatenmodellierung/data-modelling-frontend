/**
 * Type definitions for Data Flow entities
 * Legacy types - deprecated, replaced by BPMN processes
 * Kept for backward compatibility during migration
 */

export interface DataFlowDiagram {
  id: string;
  workspace_id: string;
  domain_id: string;
  name: string;
  description?: string;
  created_at: string;
  last_modified_at: string;
}

export interface DataFlowNode {
  id: string;
  diagram_id: string;
  type: DataFlowNodeType;
  sub_type?: DataFlowNodeSubType;
  name: string;
  position_x: number;
  position_y: number;
  metadata?: Record<string, unknown>;
}

export interface DataFlowConnection {
  id: string;
  diagram_id: string;
  source_node_id: string;
  target_node_id: string;
  label?: string;
  metadata?: Record<string, unknown>;
}

export type DataFlowNodeType = 'source' | 'target' | 'processor' | 'storage';

// Extended node types for specific implementations
export type DataFlowNodeSubType =
  | 'database'
  | 'kafka_topic'
  | 'api'
  | 'processor'
  | 'target'
  | 'source'
  | 'storage';

