/**
 * ODPS Service
 * Handles ODPS (Open Data Product Standard) format operations
 * Supports both online (via API) and offline (via WASM SDK) modes
 */

import { apiClient } from '../api/apiClient';
import { sdkModeDetector } from './sdkMode';
import { sdkLoader } from './sdkLoader';
import * as yaml from 'js-yaml';
import type { DataProduct } from '@/types/odps';

class ODPSService {
  /**
   * Parse ODPS YAML content to DataProduct object
   * Uses API when online, WASM SDK when offline
   */
  async parseYAML(yamlContent: string): Promise<DataProduct> {
    const isOnline = await sdkModeDetector.checkOnlineMode();
    
    if (isOnline) {
      try {
        const response = await apiClient.getClient().post('/api/v1/import/odps', {
          content: yamlContent,
        });
        return response.data as DataProduct;
      } catch (error) {
        console.warn('API import failed, falling back to SDK', error);
        // Fall through to SDK
      }
    }

    // Offline mode or API failure - use SDK
    try {
      const sdk = await sdkLoader.load();
      if (sdk && typeof sdk.parse_odps_yaml === 'function') {
        const resultJson = sdk.parse_odps_yaml(yamlContent);
        return JSON.parse(resultJson) as DataProduct;
      }
    } catch (error) {
      console.warn('SDK parse failed, using fallback parser', error);
    }

    // Fallback: Use js-yaml parser
    const parsed = yaml.load(yamlContent) as any;
    return this.mapToDataProduct(parsed);
  }

  /**
   * Convert DataProduct to ODPS YAML
   * Uses API when online, WASM SDK when offline
   */
  async toYAML(product: DataProduct): Promise<string> {
    const isOnline = await sdkModeDetector.checkOnlineMode();
    
    if (isOnline) {
      try {
        const response = await apiClient.getClient().post('/api/v1/export/odps', {
          product,
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
      if (sdk && typeof sdk.export_to_odps_yaml === 'function') {
        return sdk.export_to_odps_yaml(JSON.stringify(product));
      }
    } catch (error) {
      console.warn('SDK export failed, using fallback serializer', error);
    }

    // Fallback: Use js-yaml serializer
    return yaml.dump(product);
  }

  /**
   * Map parsed YAML to DataProduct type
   */
  private mapToDataProduct(parsed: any): DataProduct {
    // Handle description as either string or object (ODPS v1.0.0 format)
    let description: string | undefined;
    if (typeof parsed.description === 'string') {
      description = parsed.description;
    } else if (parsed.description && typeof parsed.description === 'object') {
      // Convert object description to formatted string
      const parts: string[] = [];
      if (parsed.description.purpose) parts.push(`Purpose: ${parsed.description.purpose}`);
      if (parsed.description.limitations) parts.push(`Limitations: ${parsed.description.limitations}`);
      if (parsed.description.usage) parts.push(`Usage: ${parsed.description.usage}`);
      description = parts.length > 0 ? parts.join('\n\n') : undefined;
    }

    return {
      id: parsed.id || crypto.randomUUID(),
      domain_id: parsed.domain_id || parsed.domain || '',
      name: parsed.name || '',
      description,
      linked_tables: parsed.linked_tables || [],
      input_ports: parsed.input_ports,
      output_ports: parsed.output_ports,
      support: parsed.support,
      team: parsed.team || parsed.tenant,
      status: parsed.status || 'draft',
      custom_properties: parsed.custom_properties,
      created_at: parsed.created_at || new Date().toISOString(),
      last_modified_at: parsed.last_modified_at || new Date().toISOString(),
    };
  }
}

export const odpsService = new ODPSService();

