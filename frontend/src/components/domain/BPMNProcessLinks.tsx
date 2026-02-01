/**
 * BPMN Process Links Component
 * Shows BPMN processes for the current domain as clickable links
 */

import React, { useState } from 'react';
import { useModelStore } from '@/stores/modelStore';
import { useUIStore } from '@/stores/uiStore';
import { EditorModal } from '@/components/editors/EditorModal';
import { bpmnService } from '@/services/sdk/bpmnService';

export interface BPMNProcessLinksProps {
  domainId: string;
}

export const BPMNProcessLinks: React.FC<BPMNProcessLinksProps> = ({ domainId }) => {
  const { bpmnProcesses, updateBPMNProcess } = useModelStore();
  const { addToast } = useUIStore();
  const [showBPMNEditor, setShowBPMNEditor] = useState(false);
  const [editingProcessId, setEditingProcessId] = useState<string | null>(null);

  const domainProcesses = bpmnProcesses.filter((p) => p.domain_id === domainId);

  if (domainProcesses.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-gray-500">BPMN:</span>
        {domainProcesses.map((process) => (
          <button
            key={process.id}
            onClick={() => {
              setEditingProcessId(process.id);
              setShowBPMNEditor(true);
            }}
            className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            title={`Edit ${process.name}`}
          >
            {process.name}
          </button>
        ))}
      </div>

      {/* BPMN Editor Modal */}
      {editingProcessId && (
        <EditorModal
          type="bpmn"
          isOpen={showBPMNEditor}
          onClose={() => {
            setShowBPMNEditor(false);
            setEditingProcessId(null);
          }}
          title={`Edit BPMN Process: ${bpmnProcesses.find((p) => p.id === editingProcessId)?.name || ''}`}
          size="full"
          bpmnProps={{
            xml: bpmnProcesses.find((p) => p.id === editingProcessId)?.bpmn_xml,
            name: bpmnProcesses.find((p) => p.id === editingProcessId)?.name,
            onSave: async (xml: string, name: string) => {
              try {
                const process = await bpmnService.parseXML(xml);
                updateBPMNProcess(editingProcessId, {
                  ...process,
                  id: editingProcessId,
                  name: name.trim() || process.name || 'Untitled Process',
                });
                addToast({
                  type: 'success',
                  message: 'BPMN process saved successfully',
                });
                setShowBPMNEditor(false);
                setEditingProcessId(null);
              } catch (error) {
                addToast({
                  type: 'error',
                  message: error instanceof Error ? error.message : 'Failed to save BPMN process',
                });
              }
            },
          }}
        />
      )}
    </>
  );
};
