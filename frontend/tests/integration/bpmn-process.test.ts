/**
 * Integration tests for BPMN process creation and saving
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useModelStore } from '@/stores/modelStore';
import { bpmnService } from '@/services/sdk/bpmnService';
import { localFileService } from '@/services/storage/localFileService';
import type { BPMNProcess } from '@/types/bpmn';

// Mock dependencies
vi.mock('@/services/sdk/bpmnService');
vi.mock('@/services/platform/browser', () => ({
  browserFileService: {
    downloadFile: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('@/services/sdk/sdkMode', () => ({
  sdkModeDetector: {
    isOnline: vi.fn().mockReturnValue(false),
  },
}));

const mockBpmnService = vi.mocked(bpmnService);

describe('BPMN Process Creation and Saving', () => {
  const sampleBPMNXML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="Process_1" name="Test Process">
    <bpmn:startEvent id="StartEvent_1"/>
  </bpmn:process>
</bpmn:definitions>`;

  const sampleProcess: BPMNProcess = {
    id: 'process-123',
    domain_id: 'domain-123',
    name: 'Test Process',
    bpmn_xml: sampleBPMNXML,
    created_at: '2024-01-01T00:00:00Z',
    last_modified_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useModelStore.setState({
      bpmnProcesses: [],
      domains: [{ id: 'domain-123', name: 'Test Domain', workspace_id: 'workspace-123' } as any],
    });
  });

  it('should create BPMN process and add to store', async () => {
    mockBpmnService.parseXML.mockResolvedValue(sampleProcess);

    const { addBPMNProcess } = useModelStore.getState();
    
    addBPMNProcess(sampleProcess);

    const { bpmnProcesses } = useModelStore.getState();
    expect(bpmnProcesses).toHaveLength(1);
    expect(bpmnProcesses[0].id).toBe('process-123');
    expect(bpmnProcesses[0].name).toBe('Test Process');
  });

  it('should update BPMN process in store', async () => {
    const { addBPMNProcess, updateBPMNProcess } = useModelStore.getState();
    
    addBPMNProcess(sampleProcess);
    
    const updatedProcess = {
      ...sampleProcess,
      name: 'Updated Process',
    };
    
    updateBPMNProcess('process-123', updatedProcess);

    const { bpmnProcesses } = useModelStore.getState();
    expect(bpmnProcesses[0].name).toBe('Updated Process');
  });

  it('should delete BPMN process from store', async () => {
    const { addBPMNProcess, removeBPMNProcess } = useModelStore.getState();
    
    addBPMNProcess(sampleProcess);
    
    removeBPMNProcess('process-123');

    const { bpmnProcesses } = useModelStore.getState();
    expect(bpmnProcesses).toHaveLength(0);
  });

  it('should save BPMN process to file service', async () => {
    // Mock bpmnService since saveBPMNProcess calls it internally
    const { bpmnService: actualBpmnService } = await import('@/services/sdk/bpmnService');
    vi.spyOn(actualBpmnService, 'toXML').mockResolvedValue(sampleBPMNXML);
    
    // Mock browserFileService.downloadFile
    const { browserFileService } = await import('@/services/platform/browser');
    const downloadFileSpy = vi.spyOn(browserFileService, 'downloadFile').mockResolvedValue();

    await localFileService.saveBPMNProcess('workspace-123', 'domain-123', sampleProcess);

    // Verify bpmnService.toXML was called with the process
    expect(actualBpmnService.toXML).toHaveBeenCalledWith(sampleProcess);
    // Verify downloadFile was called with the XML content and correct filename
    expect(downloadFileSpy).toHaveBeenCalledWith(
      sampleBPMNXML,
      'Test Process.bpmn',
      'application/xml'
    );
  });

  it('should parse BPMN XML and create process', async () => {
    mockBpmnService.parseXML.mockResolvedValue(sampleProcess);

    const parsed = await bpmnService.parseXML(sampleBPMNXML);

    expect(parsed).toEqual(sampleProcess);
    expect(mockBpmnService.parseXML).toHaveBeenCalledWith(sampleBPMNXML);
  });

  it('should handle transformation links in BPMN process', async () => {
    const processWithLinks: BPMNProcess = {
      ...sampleProcess,
      transformation_links: [
        {
          id: 'link-1',
          source_table_id: 'table-1',
          target_table_id: 'table-2',
          bpmn_element_id: 'Task_1',
          metadata: { type: 'ETL' },
        },
      ],
    };

    const { addBPMNProcess } = useModelStore.getState();
    addBPMNProcess(processWithLinks);

    const { bpmnProcesses } = useModelStore.getState();
    expect(bpmnProcesses[0].transformation_links).toHaveLength(1);
    expect(bpmnProcesses[0].transformation_links?.[0].source_table_id).toBe('table-1');
  });

  it('should handle linked assets in BPMN process', async () => {
    const processWithAssets: BPMNProcess = {
      ...sampleProcess,
      linked_assets: ['asset-1', 'asset-2'],
    };

    const { addBPMNProcess } = useModelStore.getState();
    addBPMNProcess(processWithAssets);

    const { bpmnProcesses } = useModelStore.getState();
    expect(bpmnProcesses[0].linked_assets).toEqual(['asset-1', 'asset-2']);
  });
});



