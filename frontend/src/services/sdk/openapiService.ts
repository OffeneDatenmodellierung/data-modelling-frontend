/**
 * OpenAPI Service
 * Handles OpenAPI specification import/export operations
 * Supports both online (via API) and offline (via WASM SDK) modes
 */

import { apiClient } from '../api/apiClient';
import { sdkModeDetector } from './sdkMode';
import { sdkLoader } from './sdkLoader';
import * as yaml from 'js-yaml';

export interface OpenAPISpec {
  openapi?: string;
  swagger?: string; // Legacy Swagger 2.0
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: Record<string, unknown>;
  components?: Record<string, unknown>;
  [key: string]: unknown;
}

class OpenAPIService {
  /**
   * Parse OpenAPI YAML/JSON content
   * Uses API when online, WASM SDK when offline
   */
  async parse(content: string, format: 'yaml' | 'json' = 'yaml'): Promise<OpenAPISpec> {
    const isOnline = await sdkModeDetector.checkOnlineMode();
    
    if (isOnline) {
      try {
        const response = await apiClient.getClient().post('/api/v1/import/openapi', {
          content,
          format,
        });
        return response.data as OpenAPISpec;
      } catch (error) {
        console.warn('API import failed, falling back to SDK', error);
        // Fall through to SDK
      }
    }

    // Offline mode or API failure - use SDK
    try {
      const sdk = await sdkLoader.load();
      if (sdk && typeof sdk.parse_openapi === 'function') {
        const resultJson = sdk.parse_openapi(content, format);
        return JSON.parse(resultJson) as OpenAPISpec;
      }
    } catch (error) {
      console.warn('SDK parse failed, using fallback parser', error);
    }

    // Fallback: Use js-yaml or JSON parser
    if (format === 'yaml') {
      return yaml.load(content) as OpenAPISpec;
    } else {
      return JSON.parse(content) as OpenAPISpec;
    }
  }

  /**
   * Convert OpenAPISpec to YAML/JSON
   * Uses API when online, WASM SDK when offline
   */
  async toFormat(spec: OpenAPISpec, format: 'yaml' | 'json' = 'yaml'): Promise<string> {
    const isOnline = await sdkModeDetector.checkOnlineMode();
    
    if (isOnline) {
      try {
        const response = await apiClient.getClient().post('/api/v1/export/openapi', {
          spec,
          format,
        });
        return response.data.content as string;
      } catch (error) {
        console.warn('API export failed, falling back to SDK', error);
        // Fall through to SDK
      }
    }

    // Offline mode or API failure - use SDK
    try {
      const sdk = await sdkLoader.load();
      if (sdk && typeof sdk.export_openapi === 'function') {
        return sdk.export_openapi(JSON.stringify(spec), format);
      }
    } catch (error) {
      console.warn('SDK export failed, using fallback serializer', error);
    }

    // Fallback: Use js-yaml or JSON serializer
    if (format === 'yaml') {
      return yaml.dump(spec);
    } else {
      return JSON.stringify(spec, null, 2);
    }
  }

  /**
   * Convert OpenAPI spec to ODCS tables (extract data models)
   */
  async toODCSTables(spec: OpenAPISpec): Promise<any[]> {
    const isOnline = await sdkModeDetector.checkOnlineMode();
    
    if (isOnline) {
      try {
        const response = await apiClient.getClient().post('/api/v1/import/openapi/to-odcs', {
          spec,
        });
        return response.data.tables || [];
      } catch (error) {
        console.warn('API conversion failed, falling back to SDK', error);
        // Fall through to SDK
      }
    }

    // Offline mode or API failure - use SDK
    try {
      const sdk = await sdkLoader.load();
      if (sdk && typeof sdk.openapi_to_odcs === 'function') {
        const resultJson = sdk.openapi_to_odcs(JSON.stringify(spec));
        const result = JSON.parse(resultJson);
        return result.tables || [];
      }
    } catch (error) {
      console.warn('SDK conversion failed', error);
    }

    // Fallback: Basic extraction from OpenAPI components/schemas
    const tables: any[] = [];
    if (spec.components?.schemas) {
      const schemas = spec.components.schemas as Record<string, unknown>;
      for (const [name, schema] of Object.entries(schemas)) {
        // Basic table extraction (simplified)
        tables.push({
          name,
          schema,
        });
      }
    }
    return tables;
  }
}

export const openapiService = new OpenAPIService();

