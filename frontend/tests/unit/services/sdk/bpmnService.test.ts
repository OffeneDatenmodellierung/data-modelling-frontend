/**
 * Unit tests for BPMN Service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { bpmnService } from '@/services/sdk/bpmnService';
import { apiClient } from '@/services/api/apiClient';
import { sdkModeDetector } from '@/services/sdk/sdkMode';
import { sdkLoader } from '@/services/sdk/sdkLoader';
import type { BPMNProcess } from '@/types/bpmn';

// Mock dependencies
vi.mock('@/services/api/apiClient');
vi.mock('@/services/sdk/sdkMode');
vi.mock('@/services/sdk/sdkLoader');

const mockApiClient = vi.mocked(apiClient);
const mockSdkModeDetector = vi.mocked(sdkModeDetector);
const mockSdkLoader = vi.mocked(sdkLoader);

describe('BPMNService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const sampleBPMNXML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
                  id="Definitions_1">
  <bpmn:process id="Process_1" name="Test Process">
    <bpmn:startEvent id="StartEvent_1"/>
    <bpmn:task id="Task_1" name="Test Task"/>
    <bpmn:endEvent id="EndEvent_1"/>
  </bpmn:process>
</bpmn:definitions>`;

  const sampleBPMNProcess: BPMNProcess = {
    id: 'process-123',
    domain_id: 'domain-123',
    name: 'Test Process',
    bpmn_xml: sampleBPMNXML,
    created_at: '2024-01-01T00:00:00Z',
    last_modified_at: '2024-01-01T00:00:00Z',
  };

  describe('parseXML', () => {
    it('should parse BPMN XML using API when online', async () => {
      mockSdkModeDetector.isOnline.mockReturnValue(true);
      mockApiClient.post.mockResolvedValue({
        data: sampleBPMNProcess,
      });

      const result = await bpmnService.parseXML(sampleBPMNXML);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/import/bpmn', {
        content: sampleBPMNXML,
      });
      expect(result).toEqual(sampleBPMNProcess);
    });

    it('should fallback to SDK when API fails', async () => {
      mockSdkModeDetector.isOnline.mockReturnValue(true);
      mockApiClient.post.mockRejectedValue(new Error('API Error'));
      
      const mockSDK = {
        parse_bpmn_xml: vi.fn().mockReturnValue(
          JSON.stringify({
            id: 'process-123',
            domain_id: 'domain-123',
            name: 'Test Process',
            linked_assets: [],
            transformation_links: [],
            created_at: '2024-01-01T00:00:00Z',
            last_modified_at: '2024-01-01T00:00:00Z',
          })
        ),
      };
      mockSdkLoader.load.mockResolvedValue(mockSDK as any);

      const result = await bpmnService.parseXML(sampleBPMNXML);

      expect(mockSdkLoader.load).toHaveBeenCalled();
      expect(mockSDK.parse_bpmn_xml).toHaveBeenCalledWith(sampleBPMNXML);
      expect(result.bpmn_xml).toBe(sampleBPMNXML);
    });

    it('should parse BPMN XML using SDK when offline', async () => {
      mockSdkModeDetector.isOnline.mockReturnValue(false);
      
      const mockSDK = {
        parse_bpmn_xml: vi.fn().mockReturnValue(
          JSON.stringify({
            id: 'process-123',
            domain_id: 'domain-123',
            name: 'Test Process',
            linked_assets: [],
            transformation_links: [],
            created_at: '2024-01-01T00:00:00Z',
            last_modified_at: '2024-01-01T00:00:00Z',
          })
        ),
      };
      mockSdkLoader.load.mockResolvedValue(mockSDK as any);

      const result = await bpmnService.parseXML(sampleBPMNXML);

      expect(mockSdkLoader.load).toHaveBeenCalled();
      expect(result.bpmn_xml).toBe(sampleBPMNXML);
    });

    it('should return minimal structure when SDK is not available', async () => {
      mockSdkModeDetector.isOnline.mockReturnValue(false);
      mockSdkLoader.load.mockResolvedValue(null);

      const result = await bpmnService.parseXML(sampleBPMNXML);

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Untitled Process');
      expect(result.bpmn_xml).toBe(sampleBPMNXML);
    });

    it('should throw error for XML exceeding size limit', async () => {
      const largeXML = 'x'.repeat(11 * 1024 * 1024); // 11MB

      await expect(bpmnService.parseXML(largeXML)).rejects.toThrow('exceeds maximum size');
    });
  });

  describe('toXML / exportBPMNXML', () => {
    it('should return existing XML if present', async () => {
      const result = await bpmnService.toXML(sampleBPMNProcess);

      expect(result).toBe(sampleBPMNXML);
    });

    it('should export BPMN process using API when online', async () => {
      const processWithoutXML: BPMNProcess = {
        ...sampleBPMNProcess,
        bpmn_xml: undefined as any,
      };

      mockSdkModeDetector.isOnline.mockReturnValue(true);
      mockApiClient.post.mockResolvedValue({
        data: { content: sampleBPMNXML },
      });

      const result = await bpmnService.toXML(processWithoutXML);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/export/bpmn', {
        process: processWithoutXML,
      });
      expect(result).toBe(sampleBPMNXML);
    });

    it('should fallback to SDK when API fails', async () => {
      const processWithoutXML: BPMNProcess = {
        ...sampleBPMNProcess,
        bpmn_xml: undefined as any,
      };

      mockSdkModeDetector.isOnline.mockReturnValue(true);
      mockApiClient.post.mockRejectedValue(new Error('API Error'));
      
      const mockSDK = {
        export_to_bpmn_xml: vi.fn().mockReturnValue(sampleBPMNXML),
      };
      mockSdkLoader.load.mockResolvedValue(mockSDK as any);

      const result = await bpmnService.toXML(processWithoutXML);

      expect(mockSdkLoader.load).toHaveBeenCalled();
      expect(mockSDK.export_to_bpmn_xml).toHaveBeenCalled();
      expect(result).toBe(sampleBPMNXML);
    });

    it('should export BPMN process using SDK when offline', async () => {
      const processWithoutXML: BPMNProcess = {
        ...sampleBPMNProcess,
        bpmn_xml: undefined as any,
      };

      mockSdkModeDetector.isOnline.mockReturnValue(false);
      
      const mockSDK = {
        export_to_bpmn_xml: vi.fn().mockReturnValue(sampleBPMNXML),
      };
      mockSdkLoader.load.mockResolvedValue(mockSDK as any);

      const result = await bpmnService.toXML(processWithoutXML);

      expect(mockSdkLoader.load).toHaveBeenCalled();
      expect(result).toBe(sampleBPMNXML);
    });

    it('should throw error when SDK is not available', async () => {
      const processWithoutXML: BPMNProcess = {
        ...sampleBPMNProcess,
        bpmn_xml: undefined as any,
      };

      mockSdkModeDetector.isOnline.mockReturnValue(false);
      mockSdkLoader.load.mockResolvedValue(null);

      await expect(bpmnService.toXML(processWithoutXML)).rejects.toThrow(
        'BPMN XML export not available'
      );
    });

    it('should throw error for XML exceeding size limit', async () => {
      const largeXML = 'x'.repeat(11 * 1024 * 1024);
      const processWithLargeXML: BPMNProcess = {
        ...sampleBPMNProcess,
        bpmn_xml: largeXML,
      };

      await expect(bpmnService.toXML(processWithLargeXML)).rejects.toThrow(
        'exceeds maximum size'
      );
    });
  });

  describe('validateXML', () => {
    it('should validate XML using SDK when available', async () => {
      const mockSDK = {
        validate_bpmn_xml: vi.fn().mockReturnValue(
          JSON.stringify({ valid: true })
        ),
      };
      mockSdkLoader.load.mockResolvedValue(mockSDK as any);

      const result = await bpmnService.validateXML(sampleBPMNXML);

      expect(result.valid).toBe(true);
      expect(mockSDK.validate_bpmn_xml).toHaveBeenCalledWith(sampleBPMNXML);
    });

    it('should fallback to basic XML validation when SDK fails', async () => {
      mockSdkLoader.load.mockRejectedValue(new Error('SDK Error'));

      const result = await bpmnService.validateXML(sampleBPMNXML);

      expect(result.valid).toBe(true); // Valid XML should pass
    });

    it('should detect invalid XML', async () => {
      mockSdkLoader.load.mockRejectedValue(new Error('SDK Error'));

      const invalidXML = '<invalid><unclosed>';

      const result = await bpmnService.validateXML(invalidXML);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should throw error for XML exceeding size limit', async () => {
      const largeXML = 'x'.repeat(11 * 1024 * 1024);

      await expect(bpmnService.validateXML(largeXML)).rejects.toThrow(
        'exceeds maximum size'
      );
    });
  });
});



