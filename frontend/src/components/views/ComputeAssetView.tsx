/**
 * Compute Asset View Component
 * View for managing CADS compute assets (AI/ML/App models)
 */

import React, { useState } from 'react';
import { useModelStore } from '@/stores/modelStore';
import { EditorModal } from '@/components/editors/EditorModal';
import { ComputeAssetEditor } from '@/components/asset/ComputeAssetEditor';
import { bpmnService } from '@/services/sdk/bpmnService';
import { useUIStore } from '@/stores/uiStore';
import type { ComputeAsset } from '@/types/cads';

export interface ComputeAssetViewProps {
  workspaceId: string;
  domainId: string;
}

export const ComputeAssetView: React.FC<ComputeAssetViewProps> = ({ domainId }) => {
  const { computeAssets, bpmnProcesses, updateComputeAsset, removeComputeAsset } = useModelStore();
  const { addToast } = useUIStore();
  const [showBPMNEditor, setShowBPMNEditor] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editingAssetForModal, setEditingAssetForModal] = useState<ComputeAsset | undefined>(undefined);

  const handleSaveBPMN = async (xml: string, name: string) => {
    if (!editingAssetId) return;
    const asset = computeAssets.find((a) => a.id === editingAssetId);
    if (!asset) return;

    try {
      const process = await bpmnService.parseXML(xml);
      
      // Update or create BPMN process
      if (asset.bpmn_link) {
        // Update existing linked process
        useModelStore.getState().updateBPMNProcess(asset.bpmn_link, {
          ...process,
          id: asset.bpmn_link,
          name: name.trim() || process.name || 'Untitled Process',
        });
      } else {
        // Create new process and link to asset
        const newProcess = {
          ...process,
          id: typeof crypto !== 'undefined' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
          name: name.trim() || process.name || 'Untitled Process',
          domain_id: domainId,
        };
        useModelStore.getState().addBPMNProcess(newProcess);
        updateComputeAsset(asset.id, { bpmn_link: newProcess.id });
      }
      
      setShowBPMNEditor(false);
      setEditingAssetId(null);
      
      addToast({
        type: 'success',
        message: 'BPMN process saved and linked to compute asset',
      });
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to save BPMN process',
      });
    }
  };

  const domainAssets = computeAssets.filter((a) => a.domain_id === domainId);

  const handleCreate = () => {
    setEditingAssetForModal(undefined);
    setShowEditor(true);
  };

  const handleEdit = (asset: ComputeAsset) => {
    setEditingAssetForModal(asset);
    setShowEditor(true);
  };

  const handleDelete = (assetId: string) => {
    if (confirm('Are you sure you want to delete this compute asset?')) {
      removeComputeAsset(assetId);
    }
  };

  return (
    <>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Compute Assets</h2>
          <button
            onClick={handleCreate}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            + Create Asset
          </button>
        </div>
        
        {domainAssets.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No compute assets in this domain</p>
            <button
              onClick={handleCreate}
              className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Create your first compute asset
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {domainAssets.map((asset) => {
              const linkedBPMN = asset.bpmn_link
                ? bpmnProcesses.find((p) => p.id === asset.bpmn_link)
                : null;

              return (
                <div
                  key={asset.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{asset.name}</h3>
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded capitalize">
                        {asset.type}
                      </span>
                      {asset.status && (
                        <span
                          className={`
                            text-xs px-2 py-1 rounded capitalize
                            ${
                              asset.status === 'production'
                                ? 'bg-green-100 text-green-800'
                                : asset.status === 'deprecated'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }
                          `}
                        >
                          {asset.status}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(asset)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(asset.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {asset.description && (
                    <p className="text-sm text-gray-600 mb-2">{asset.description}</p>
                  )}
                  
                  {asset.engineering_team && (
                    <p className="text-xs text-gray-500 mb-1">Team: {asset.engineering_team}</p>
                  )}
                  
                  {asset.source_repo && (
                    <a
                      href={asset.source_repo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 mb-2 block"
                    >
                      Source Repository
                    </a>
                  )}
                  
                  {asset.bpmn_link && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-500">BPMN Process:</span>
                      <button
                        onClick={() => {
                          setEditingAssetId(asset.id);
                          setShowBPMNEditor(true);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        {linkedBPMN?.name || 'View Process'}
                      </button>
                    </div>
                  )}
                  
                  {!asset.bpmn_link && (
                    <button
                      onClick={() => {
                        setEditingAssetId(asset.id);
                        setShowBPMNEditor(true);
                      }}
                      className="mt-2 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Create BPMN Process
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BPMN Editor Modal */}
      {editingAssetId && (
        <EditorModal
          type="bpmn"
          isOpen={showBPMNEditor}
          onClose={() => {
            setShowBPMNEditor(false);
            setEditingAssetId(null);
          }}
          title={`Edit BPMN Process: ${
            computeAssets.find((a) => a.id === editingAssetId)?.name || 'Unknown'
          }`}
          size="full"
          bpmnProps={{
            xml: computeAssets
              .find((a) => a.id === editingAssetId)
              ?.bpmn_link
              ? bpmnProcesses.find(
                  (p) => p.id === computeAssets.find((a) => a.id === editingAssetId)?.bpmn_link
                )?.bpmn_xml
              : undefined,
            name: computeAssets
              .find((a) => a.id === editingAssetId)
              ?.bpmn_link
              ? bpmnProcesses.find(
                  (p) => p.id === computeAssets.find((a) => a.id === editingAssetId)?.bpmn_link
                )?.name
              : undefined,
            onSave: handleSaveBPMN,
          }}
        />
      )}

      {/* Asset Editor Modal */}
      <ComputeAssetEditor
        asset={editingAssetForModal}
        domainId={domainId}
        isOpen={showEditor}
        onClose={() => {
          setShowEditor(false);
          setEditingAssetForModal(undefined);
        }}
      />
    </>
  );
};

