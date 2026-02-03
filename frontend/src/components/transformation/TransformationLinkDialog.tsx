/**
 * Transformation Link Dialog
 * Allows creating/editing transformation links between tables with BPMN element references
 */

import React, { useState, useEffect } from 'react';
import { DraggableModal } from '@/components/common/DraggableModal';
import { useModelStore } from '@/stores/modelStore';
import { useUIStore } from '@/stores/uiStore';
import type { TransformationLink } from '@/types/bpmn';

export interface TransformationLinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sourceTableId: string;
  targetTableId: string;
  bpmnProcessId?: string;
  existingLink?: TransformationLink;
  onSave: (link: TransformationLink) => void;
}

export const TransformationLinkDialog: React.FC<TransformationLinkDialogProps> = ({
  isOpen,
  onClose,
  sourceTableId,
  targetTableId,
  bpmnProcessId,
  existingLink,
  onSave,
}) => {
  const { tables, bpmnProcesses } = useModelStore();
  const { addToast } = useUIStore();
  const [bpmnElementId, setBpmnElementId] = useState<string>(existingLink?.bpmn_element_id || '');
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [metadataKey, setMetadataKey] = useState('');
  const [metadataValue, setMetadataValue] = useState('');

  const sourceTable = tables.find((t) => t.id === sourceTableId);
  const targetTable = tables.find((t) => t.id === targetTableId);
  const bpmnProcess = bpmnProcessId ? bpmnProcesses.find((p) => p.id === bpmnProcessId) : null;

  // Extract BPMN elements from XML (simplified - in production, parse XML properly)
  const bpmnElements: Array<{ id: string; name: string; type: string }> = [];
  if (bpmnProcess?.bpmn_xml) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(bpmnProcess.bpmn_xml, 'text/xml');
      // Extract tasks, gateways, events
      const tasks = Array.from(doc.querySelectorAll('bpmn\\:task, task')).map((el) => ({
        id: el.getAttribute('id') || '',
        name: el.getAttribute('name') || el.getAttribute('id') || '',
        type: 'task',
      }));
      const gateways = Array.from(doc.querySelectorAll('bpmn\\:gateway, gateway')).map((el) => ({
        id: el.getAttribute('id') || '',
        name: el.getAttribute('name') || el.getAttribute('id') || '',
        type: 'gateway',
      }));
      bpmnElements.push(...tasks, ...gateways);
    } catch (error) {
      console.warn('Failed to parse BPMN XML for elements:', error);
    }
  }

  useEffect(() => {
    if (existingLink) {
      setBpmnElementId(existingLink.bpmn_element_id || '');
      setMetadata((existingLink.metadata || {}) as Record<string, string>);
    } else {
      setBpmnElementId('');
      setMetadata({});
    }
  }, [existingLink]);

  const handleAddMetadata = () => {
    if (metadataKey.trim() && metadataValue.trim()) {
      setMetadata({ ...metadata, [metadataKey.trim()]: metadataValue.trim() });
      setMetadataKey('');
      setMetadataValue('');
    }
  };

  const handleRemoveMetadata = (key: string) => {
    const updated = { ...metadata };
    delete updated[key];
    setMetadata(updated);
  };

  const handleSave = () => {
    if (!sourceTableId || !targetTableId) {
      addToast({
        type: 'error',
        message: 'Source and target tables are required',
      });
      return;
    }

    const link: TransformationLink = {
      id: existingLink?.id || crypto.randomUUID(),
      source_table_id: sourceTableId,
      target_table_id: targetTableId,
      bpmn_element_id: bpmnElementId || undefined,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    };

    onSave(link);
    onClose();
  };

  return (
    <DraggableModal
      isOpen={isOpen}
      onClose={onClose}
      title={existingLink ? 'Edit Transformation Link' : 'Create Transformation Link'}
      size="md"
    >
      <div className="space-y-4">
        {/* Table Information */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Tables</h3>
          <div className="bg-gray-50 rounded p-3 space-y-1">
            <div>
              <span className="text-xs text-gray-500">Source:</span>
              <span className="ml-2 text-sm font-medium">{sourceTable?.name || sourceTableId}</span>
            </div>
            <div>
              <span className="text-xs text-gray-500">Target:</span>
              <span className="ml-2 text-sm font-medium">{targetTable?.name || targetTableId}</span>
            </div>
          </div>
        </div>

        {/* BPMN Process Selection */}
        {bpmnProcess && (
          <div>
            <label
              htmlFor="bpmn-element-select"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              BPMN Process Element (Optional)
            </label>
            <select
              id="bpmn-element-select"
              value={bpmnElementId}
              onChange={(e) => setBpmnElementId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">None</option>
              {bpmnElements.map((el) => (
                <option key={el.id} value={el.id}>
                  {el.name} ({el.type})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Link this transformation to a specific BPMN element (task, gateway, etc.)
            </p>
          </div>
        )}

        {/* Metadata */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Transformation Metadata</h3>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={metadataKey}
                onChange={(e) => setMetadataKey(e.target.value)}
                placeholder="Key"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={metadataValue}
                onChange={(e) => setMetadataValue(e.target.value)}
                placeholder="Value"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddMetadata}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Add
              </button>
            </div>
            {Object.keys(metadata).length > 0 && (
              <div className="space-y-1">
                {Object.entries(metadata).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between bg-gray-50 rounded p-2"
                  >
                    <span className="text-sm">
                      <span className="font-medium">{key}:</span> {value}
                    </span>
                    <button
                      onClick={() => handleRemoveMetadata(key)}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {existingLink ? 'Update' : 'Create'} Link
          </button>
        </div>
      </div>
    </DraggableModal>
  );
};
