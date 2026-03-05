/**
 * Type definitions for Databricks Metric Views (DBMV)
 * Based on SDK 2.4.0 dbmv-schema.json and Databricks metric view YAML spec v1.1
 */

export type MetricViewType = 'standard' | 'materialized';

export interface MetricViewDimension {
  name: string;
  expr: string;
  comment?: string;
}

export interface MetricViewMeasure {
  name: string;
  expr: string; // supports MEASURE() function for composability
  comment?: string;
  filter?: string; // FILTER (WHERE ...) for conditional aggregation
}

export interface MaterializedViewSpec {
  name: string;
  type: 'aggregated' | 'unaggregated';
  dimensions?: string[];
  measures?: string[];
}

export interface Materialization {
  schedule?: string;
  mode?: 'relaxed' | string;
  materialized_views?: MaterializedViewSpec[];
}

export interface MetricViewJoin {
  table: string;
  on: string;
  type?: 'inner' | 'left' | 'right' | 'full';
}

export interface MetricView {
  id: string; // UUID
  domain_id: string; // UUID
  name: string; // max 255 chars
  view_type: MetricViewType;
  version?: string; // e.g. "1.1"
  source: string; // source table or view name
  description?: string;
  filter?: string; // global filter expression
  dimensions: MetricViewDimension[];
  measures: MetricViewMeasure[];
  joins?: MetricViewJoin[];
  materialization?: Materialization; // only for materialized views
  tags?: string[];
  custom_properties?: Record<string, unknown>;

  // Canvas positioning
  position_x?: number;
  position_y?: number;
  width?: number; // default 200
  height?: number; // default 150

  // Timestamps
  created_at: string;
  last_modified_at: string;
}
