/**
 * CADS Service
 * Handles CADS (Compute Asset Definition Standard) format operations
 * Supports both online (via API) and offline (via WASM SDK) modes
 */

import { apiClient } from '../api/apiClient';
import { sdkModeDetector } from './sdkMode';
import { sdkLoader } from './sdkLoader';
import * as yaml from 'js-yaml';
import type { ComputeAsset } from '@/types/cads';

class CADSService {
  /**
   * Parse CADS YAML content to ComputeAsset object
   * Uses API when online, WASM SDK when offline
   */
  async parseYAML(yamlContent: string): Promise<ComputeAsset> {
    const isOnline = await sdkModeDetector.checkOnlineMode();
    
    if (isOnline) {
      try {
        const response = await apiClient.getClient().post('/api/v1/import/cads', {
          content: yamlContent,
        });
        return response.data as ComputeAsset;
      } catch (error) {
        console.warn('API import failed, falling back to SDK', error);
        // Fall through to SDK
      }
    }

    // Offline mode or API failure - use SDK
    try {
      const sdk = await sdkLoader.load();
      if (sdk && typeof sdk.parse_cads_yaml === 'function') {
        const resultJson = sdk.parse_cads_yaml(yamlContent);
        return JSON.parse(resultJson) as ComputeAsset;
      }
    } catch (error) {
      console.warn('SDK parse failed, using fallback parser', error);
    }

    // Fallback: Use js-yaml parser
    const parsed = yaml.load(yamlContent) as any;
    return this.mapToComputeAsset(parsed);
  }

  /**
   * Convert ComputeAsset to CADS YAML
   * Uses API when online, WASM SDK when offline
   */
  async toYAML(asset: ComputeAsset): Promise<string> {
    const isOnline = await sdkModeDetector.checkOnlineMode();
    
    if (isOnline) {
      try {
        const response = await apiClient.getClient().post('/api/v1/export/cads', {
          asset,
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
      if (sdk && typeof sdk.export_to_cads_yaml === 'function') {
        return sdk.export_to_cads_yaml(JSON.stringify(asset));
      }
    } catch (error) {
      console.warn('SDK export failed, using fallback serializer', error);
    }

    // Fallback: Use js-yaml serializer
    return yaml.dump(asset);
  }

  /**
   * Map parsed YAML to ComputeAsset type
   */
  private mapToComputeAsset(parsed: any): ComputeAsset {
    return {
      id: parsed.id || crypto.randomUUID(),
      domain_id: parsed.domain_id || '',
      name: parsed.name || '',
      type: parsed.type || 'app',
      description: parsed.description,
      owner: parsed.owner,
      engineering_team: parsed.engineering_team,
      source_repo: parsed.source_repo,
      bpmn_link: parsed.bpmn_link,
      dmn_link: parsed.dmn_link,
      bpmn_models: parsed.bpmn_models,
      dmn_models: parsed.dmn_models,
      openapi_specs: parsed.openapi_specs,
      status: parsed.status || 'development',
      kind: parsed.kind,
      custom_properties: parsed.custom_properties,
      created_at: parsed.created_at || new Date().toISOString(),
      last_modified_at: parsed.last_modified_at || new Date().toISOString(),
    };
  }
}

export const cadsService = new CADSService();

