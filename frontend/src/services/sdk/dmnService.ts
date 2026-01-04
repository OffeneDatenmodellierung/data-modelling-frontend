/**
 * DMN Service
 * Handles DMN 1.3 XML format operations
 * Supports both online (via API) and offline (via WASM SDK) modes
 */

import { apiClient } from '../api/apiClient';
import { sdkModeDetector } from './sdkMode';
import { sdkLoader } from './sdkLoader';
import type { DMNDecision } from '@/types/dmn';

const MAX_DMN_SIZE = 10 * 1024 * 1024; // 10MB

class DMNService {
  /**
   * Validate DMN XML size
   */
  private validateSize(xml: string): void {
    if (xml.length > MAX_DMN_SIZE) {
      throw new Error(`DMN XML exceeds maximum size of ${MAX_DMN_SIZE / 1024 / 1024}MB`);
    }
  }

  /**
   * Parse DMN XML content to DMNDecision object
   * Uses API when online, WASM SDK when offline
   */
  async parseXML(xmlContent: string): Promise<DMNDecision> {
    this.validateSize(xmlContent);
    
    const isOnline = await sdkModeDetector.checkOnlineMode();
    
    if (isOnline) {
      try {
        const response = await apiClient.getClient().post('/api/v1/import/dmn', {
          content: xmlContent,
        });
        return response.data as DMNDecision;
      } catch (error) {
        console.warn('API import failed, falling back to SDK', error);
        // Fall through to SDK
      }
    }

    // Offline mode or API failure - use SDK
    try {
      const sdk = await sdkLoader.load();
      if (sdk && typeof sdk.parse_dmn_xml === 'function') {
        const resultJson = sdk.parse_dmn_xml(xmlContent);
        const parsed = JSON.parse(resultJson);
        return {
          id: parsed.id || crypto.randomUUID(),
          domain_id: parsed.domain_id || '',
          name: parsed.name || '',
          dmn_xml: xmlContent, // Preserve original XML
          created_at: parsed.created_at || new Date().toISOString(),
          last_modified_at: parsed.last_modified_at || new Date().toISOString(),
        };
      }
    } catch (error) {
      console.warn('SDK parse failed', error);
      throw new Error('Failed to parse DMN XML: ' + (error instanceof Error ? error.message : String(error)));
    }

    // If SDK not available, return minimal structure with XML
    return {
      id: crypto.randomUUID(),
      domain_id: '',
      name: 'Untitled Decision',
      dmn_xml: xmlContent,
      created_at: new Date().toISOString(),
      last_modified_at: new Date().toISOString(),
    };
  }

  /**
   * Convert DMNDecision to DMN XML
   * Uses API when online, WASM SDK when offline
   */
  async toXML(decision: DMNDecision): Promise<string> {
    // If we already have XML, return it
    if (decision.dmn_xml) {
      this.validateSize(decision.dmn_xml);
      return decision.dmn_xml;
    }

    const isOnline = await sdkModeDetector.checkOnlineMode();
    
    if (isOnline) {
      try {
        const response = await apiClient.getClient().post('/api/v1/export/dmn', {
          decision,
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
      if (sdk && typeof sdk.export_to_dmn_xml === 'function') {
        return sdk.export_to_dmn_xml(JSON.stringify(decision));
      }
    } catch (error) {
      console.warn('SDK export failed', error);
      throw new Error('Failed to export DMN XML: ' + (error instanceof Error ? error.message : String(error)));
    }

    throw new Error('DMN XML export not available - SDK not loaded');
  }

  /**
   * Validate DMN XML syntax
   */
  async validateXML(xmlContent: string): Promise<{ valid: boolean; errors?: string[] }> {
    this.validateSize(xmlContent);
    
    try {
      const sdk = await sdkLoader.load();
      if (sdk && typeof sdk.validate_dmn_xml === 'function') {
        const resultJson = sdk.validate_dmn_xml(xmlContent);
        return JSON.parse(resultJson);
      }
    } catch (error) {
      console.warn('SDK validation failed', error);
    }

    // Basic XML validation
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlContent, 'text/xml');
      const errors = Array.from(doc.querySelectorAll('parsererror')).map((e) => e.textContent || 'Parse error');
      return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }
}

export const dmnService = new DMNService();

