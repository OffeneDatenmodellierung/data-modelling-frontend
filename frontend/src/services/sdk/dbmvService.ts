/**
 * DBMV Service
 * Handles Databricks Metric View format operations
 * Supports both online (via API) and offline (via WASM SDK) modes
 */

import { sdkModeDetector } from './sdkMode';
import { sdkLoader } from './sdkLoader';
import { apiClient } from '../api/apiClient';
import * as yaml from 'js-yaml';
import type { MetricView } from '@/types/metricView';

class DBMVService {
  /**
   * Parse DBMV YAML content to MetricView object(s)
   * Accepts both full DBMV document (multiple views) and single view YAML
   */
  async parseYAML(yamlContent: string): Promise<MetricView[]> {
    const isOnline = await sdkModeDetector.checkOnlineMode();

    if (isOnline) {
      try {
        const response = await apiClient.getClient().post('/api/v1/import/dbmv', {
          content: yamlContent,
        });
        const data = response.data;
        return Array.isArray(data) ? data : [data];
      } catch (error) {
        console.warn('[DBMVService] API import failed, falling back to SDK', error);
      }
    }

    // Offline mode or API failure - use SDK
    try {
      const sdk = await sdkLoader.load();
      if (sdk && typeof sdk.parse_dbmv_yaml === 'function') {
        const resultJson = sdk.parse_dbmv_yaml(yamlContent);
        const parsed = JSON.parse(resultJson);
        // SDK may return a document with metric_views array or a single view
        if (parsed.metric_views && Array.isArray(parsed.metric_views)) {
          return parsed.metric_views.map((mv: any) => this.mapToMetricView(mv));
        }
        if (Array.isArray(parsed)) {
          return parsed.map((mv: any) => this.mapToMetricView(mv));
        }
        return [this.mapToMetricView(parsed)];
      }
    } catch (error) {
      console.warn('[DBMVService] SDK parse failed, using fallback parser', error);
    }

    // Fallback: Use js-yaml parser
    return this.fallbackParse(yamlContent);
  }

  /**
   * Export a single MetricView to YAML (for card-level export)
   * Returns just the single view definition without the document wrapper
   */
  async toSingleViewYAML(view: MetricView): Promise<string> {
    try {
      const sdk = await sdkLoader.load();
      if (sdk && typeof sdk.export_to_dbmv_yaml === 'function') {
        return sdk.export_to_dbmv_yaml(JSON.stringify(view));
      }
    } catch (error) {
      console.warn('[DBMVService] SDK export failed, using fallback serializer', error);
    }

    // Fallback: Use js-yaml serializer
    return yaml.dump(this.mapToDBMVYAML(view));
  }

  /**
   * Export multiple MetricViews to full DBMV document YAML
   * Used for system-grouped file save (one .dbmv.yaml per system)
   */
  async toYAML(views: MetricView[]): Promise<string> {
    try {
      const sdk = await sdkLoader.load();
      if (sdk && typeof sdk.export_to_dbmv_yaml === 'function') {
        // Wrap in document format for multi-view export
        const document = {
          metric_views: views,
        };
        return sdk.export_to_dbmv_yaml(JSON.stringify(document));
      }
    } catch (error) {
      console.warn('[DBMVService] SDK export failed, using fallback serializer', error);
    }

    // Fallback: Use js-yaml serializer with document wrapper
    const document = {
      metric_views: views.map((v) => this.mapToDBMVYAML(v)),
    };
    return yaml.dump(document, { lineWidth: -1 });
  }

  /**
   * Fallback parser using js-yaml
   * Handles both full document (with metric_views array) and single view YAML
   */
  private fallbackParse(yamlContent: string): MetricView[] {
    const parsed = yaml.load(yamlContent) as any;

    if (!parsed) {
      return [];
    }

    // Full document format: { metric_views: [...] }
    if (parsed.metric_views && Array.isArray(parsed.metric_views)) {
      return parsed.metric_views.map((mv: any) => this.mapToMetricView(mv));
    }

    // Single view format
    return [this.mapToMetricView(parsed)];
  }

  /**
   * Map parsed YAML to MetricView type
   */
  private mapToMetricView(parsed: any): MetricView {
    const now = new Date().toISOString();
    const hasMaterialization =
      parsed.materialization && parsed.materialization.materialized_views?.length > 0;

    return {
      id: parsed.id || crypto.randomUUID(),
      domain_id: parsed.domain_id || '',
      name: parsed.name || '',
      view_type: hasMaterialization ? 'materialized' : parsed.view_type || 'standard',
      version: parsed.version || '1.1',
      source: parsed.source || '',
      description: parsed.description || parsed.comment || undefined,
      filter: parsed.filter || undefined,
      dimensions: Array.isArray(parsed.dimensions)
        ? parsed.dimensions.map((d: any) => ({
            name: d.name || '',
            expr: d.expr || '',
            comment: d.comment || undefined,
          }))
        : [],
      measures: Array.isArray(parsed.measures)
        ? parsed.measures.map((m: any) => ({
            name: m.name || '',
            expr: m.expr || '',
            comment: m.comment || undefined,
            filter: m.filter || undefined,
          }))
        : [],
      joins: Array.isArray(parsed.joins)
        ? parsed.joins.map((j: any) => ({
            table: j.table || '',
            on: j.on || '',
            type: j.type || undefined,
          }))
        : undefined,
      materialization: parsed.materialization
        ? {
            schedule: parsed.materialization.schedule,
            mode: parsed.materialization.mode,
            materialized_views: Array.isArray(parsed.materialization.materialized_views)
              ? parsed.materialization.materialized_views.map((mv: any) => ({
                  name: mv.name || '',
                  type: mv.type || 'aggregated',
                  dimensions: mv.dimensions,
                  measures: mv.measures,
                }))
              : undefined,
          }
        : undefined,
      tags: parsed.tags,
      custom_properties: parsed.custom_properties || parsed.customProperties,
      position_x: parsed.position_x,
      position_y: parsed.position_y,
      width: parsed.width,
      height: parsed.height,
      created_at: parsed.created_at || now,
      last_modified_at: parsed.last_modified_at || now,
    };
  }

  /**
   * Map MetricView to DBMV YAML-compatible format
   */
  private mapToDBMVYAML(view: MetricView): Record<string, unknown> {
    const result: Record<string, unknown> = {
      version: view.version || '1.1',
      name: view.name,
      source: view.source,
    };

    if (view.description) result.comment = view.description;
    if (view.filter) result.filter = view.filter;

    if (view.dimensions.length > 0) {
      result.dimensions = view.dimensions.map((d) => {
        const dim: Record<string, unknown> = { name: d.name, expr: d.expr };
        if (d.comment) dim.comment = d.comment;
        return dim;
      });
    }

    if (view.measures.length > 0) {
      result.measures = view.measures.map((m) => {
        const measure: Record<string, unknown> = { name: m.name, expr: m.expr };
        if (m.comment) measure.comment = m.comment;
        if (m.filter) measure.filter = m.filter;
        return measure;
      });
    }

    if (view.joins && view.joins.length > 0) {
      result.joins = view.joins.map((j) => {
        const join: Record<string, unknown> = { table: j.table, on: j.on };
        if (j.type) join.type = j.type;
        return join;
      });
    }

    if (view.materialization) {
      result.materialization = {
        ...(view.materialization.schedule && { schedule: view.materialization.schedule }),
        ...(view.materialization.mode && { mode: view.materialization.mode }),
        ...(view.materialization.materialized_views && {
          materialized_views: view.materialization.materialized_views,
        }),
      };
    }

    if (view.tags && view.tags.length > 0) result.tags = view.tags;
    if (view.custom_properties) result.custom_properties = view.custom_properties;

    // Preserve ID for round-trip
    result.id = view.id;

    return result;
  }
}

export const dbmvService = new DBMVService();
