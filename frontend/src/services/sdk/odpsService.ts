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
   * Convert DataProduct to ODPS-compliant format
   */
  private convertToODPSFormat(product: DataProduct, domainName?: string): any {
    // Map status values to ODPS enum values
    const mapStatus = (status?: string): string => {
      switch (status) {
        case 'published':
          return 'active';
        case 'draft':
          return 'draft';
        case 'deprecated':
          return 'deprecated';
        default:
          return 'draft';
      }
    };

    // Convert description string to ODPS description object
    let descriptionObj: any = undefined;
    if (product.description) {
      descriptionObj = {
        purpose: product.description,
      };
    }

    // Convert input_ports to inputPorts with proper structure
    // InputPort requires: name, version, contractId
    const inputPorts = product.input_ports?.filter(port => port.name && port.table_id).map(port => ({
      name: port.name,
      version: '1.0.0', // Default version if not provided
      contractId: port.table_id,
      ...(port.description && { description: port.description }),
    })) || [];

    // Convert output_ports to outputPorts with proper structure
    // OutputPort requires: name, version (contractId is optional)
    const outputPorts = product.output_ports?.filter(port => port.name).map(port => ({
      name: port.name,
      version: '1.0.0', // Default version if not provided
      ...(port.table_id && { contractId: port.table_id }),
      ...(port.description && { description: port.description }),
    })) || [];

    // Convert custom_properties Record to array format
    const customProperties = product.custom_properties 
      ? Object.entries(product.custom_properties).map(([property, value]) => ({
          property,
          value,
        }))
      : undefined;

    // Convert support object to array format
    // Support requires: channel, url
    const support = product.support && (product.support.slack_channel || product.support.documentation_url) ? [{
      channel: product.support.slack_channel || 'general',
      url: product.support.documentation_url || (product.support.slack_channel ? `https://slack.com/channels/${product.support.slack_channel}` : 'https://example.com'),
      ...(product.support.contact && { description: product.support.contact }),
      ...(product.support.slack_channel && { tool: 'slack' }),
    }] : undefined;

    // Build ODPS-compliant product
    const odpsProduct: any = {
      apiVersion: 'v1.0.0',
      kind: 'DataProduct',
      id: product.id,
      name: product.name,
      status: mapStatus(product.status),
    };

    // Add optional fields only if they have values
    if (domainName) {
      odpsProduct.domain = domainName;
    }

    if (descriptionObj) {
      odpsProduct.description = descriptionObj;
    }

    if (inputPorts.length > 0) {
      odpsProduct.inputPorts = inputPorts;
    }

    if (outputPorts.length > 0) {
      odpsProduct.outputPorts = outputPorts;
    }

    if (customProperties && customProperties.length > 0) {
      odpsProduct.customProperties = customProperties;
    }

    if (support && support.length > 0) {
      odpsProduct.support = support;
    }

    if (product.team) {
      odpsProduct.team = {
        name: product.team,
      };
    }

    return odpsProduct;
  }

  /**
   * Convert DataProduct to ODPS YAML
   * Uses API when online, WASM SDK when offline
   */
  async toYAML(product: DataProduct, domainName?: string): Promise<string> {
    // Convert to ODPS-compliant format first
    const odpsProduct = this.convertToODPSFormat(product, domainName);
    
    const isOnline = await sdkModeDetector.checkOnlineMode();
    
    if (isOnline) {
      try {
        const response = await apiClient.getClient().post('/api/v1/export/odps', {
          product: odpsProduct,
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
        return sdk.export_to_odps_yaml(JSON.stringify(odpsProduct));
      }
    } catch (error) {
      console.warn('SDK export failed, using fallback serializer', error);
    }

    // Fallback: Use js-yaml serializer with ODPS-compliant format
    return yaml.dump(odpsProduct, {
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
    });
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

    // Handle team as either string or object (ODPS format)
    let team: string | undefined;
    if (typeof parsed.team === 'string') {
      team = parsed.team;
    } else if (parsed.team && typeof parsed.team === 'object') {
      // Convert team object to string (use name if available)
      team = parsed.team.name || parsed.tenant || undefined;
    } else {
      team = parsed.tenant;
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
      team,
      status: parsed.status || 'draft',
      custom_properties: parsed.custom_properties,
      created_at: parsed.created_at || new Date().toISOString(),
      last_modified_at: parsed.last_modified_at || new Date().toISOString(),
    };
  }
}

export const odpsService = new ODPSService();

