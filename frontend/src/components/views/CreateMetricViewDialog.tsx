/**
 * Create Metric View Dialog
 * Dialog for creating a new DBMV metric view manually or importing from DBMV YAML
 */

import React, { useState, useEffect } from 'react';
import { DraggableModal } from '@/components/common/DraggableModal';
import { useModelStore } from '@/stores/modelStore';
import { useUIStore } from '@/stores/uiStore';
import { dbmvService } from '@/services/sdk/dbmvService';
import type { MetricView, MetricViewType } from '@/types/metricView';

export interface CreateMetricViewDialogProps {
  domainId: string;
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (viewId: string) => void;
}

export const CreateMetricViewDialog: React.FC<CreateMetricViewDialogProps> = ({
  domainId,
  isOpen,
  onClose,
  onCreated,
}) => {
  const { addMetricView, selectedSystemId, updateSystem } = useModelStore();
  const { addToast } = useUIStore();
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMode, setImportMode] = useState(false);
  const [importYaml, setImportYaml] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [source, setSource] = useState('');
  const [viewType, setViewType] = useState<MetricViewType>('standard');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setImportMode(false);
      setImportYaml('');
      setImportFile(null);
      setName('');
      setSource('');
      setViewType('standard');
      setDescription('');
      setError(null);
    }
  }, [isOpen]);

  const linkToSystem = (viewIds: string[]) => {
    if (!selectedSystemId) return;
    const system = useModelStore.getState().systems.find((s) => s.id === selectedSystemId);
    if (!system) return;
    const updatedIds = [...new Set([...(system.metric_view_ids || []), ...viewIds])];
    updateSystem(selectedSystemId, { metric_view_ids: updatedIds });
  };

  const handleImport = async () => {
    if (!importYaml.trim() && !importFile) {
      addToast({
        type: 'error',
        message: 'Please paste DBMV YAML content or select a file',
      });
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const content = importYaml.trim() || (importFile ? await importFile.text() : '');
      const views = await dbmvService.parseYAML(content);

      if (views.length === 0) {
        setError('No metric views found in the provided YAML');
        return;
      }

      const centerX = window.innerWidth / 2 - 200;
      const centerY = window.innerHeight / 2 - 150;
      const newViewIds: string[] = [];

      views.forEach((view, index) => {
        const importedView: MetricView = {
          ...view,
          id: view.id || crypto.randomUUID(),
          domain_id: domainId,
          name: view.name || 'Untitled Metric View',
          position_x: view.position_x ?? centerX + index * 30,
          position_y: view.position_y ?? centerY + index * 30,
          width: view.width ?? 200,
          height: view.height ?? 150,
          created_at: view.created_at || new Date().toISOString(),
          last_modified_at: new Date().toISOString(),
        };

        addMetricView(importedView);
        newViewIds.push(importedView.id);
      });

      linkToSystem(newViewIds);

      addToast({
        type: 'success',
        message: `Imported ${views.length} metric view${views.length !== 1 ? 's' : ''}`,
      });

      if (onCreated && newViewIds[0]) {
        onCreated(newViewIds[0]);
      }

      setImportYaml('');
      setImportFile(null);
      setError(null);

      await new Promise((resolve) => setTimeout(resolve, 100));
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import DBMV metric view';
      setError(errorMessage);
      addToast({ type: 'error', message: errorMessage });
    } finally {
      setIsImporting(false);
    }
  };

  const handleCreate = async () => {
    setError(null);

    if (!name.trim()) {
      setError('Metric view name is required');
      return;
    }

    if (!source.trim()) {
      setError('Source table is required');
      return;
    }

    setIsCreating(true);
    try {
      const { generateUUID } = await import('@/utils/validation');
      const centerX = window.innerWidth / 2 - 200;
      const centerY = window.innerHeight / 2 - 150;

      const view: MetricView = {
        id: generateUUID(),
        domain_id: domainId,
        name: name.trim(),
        view_type: viewType,
        source: source.trim(),
        description: description.trim() || undefined,
        dimensions: [],
        measures: [],
        position_x: centerX,
        position_y: centerY,
        width: 200,
        height: 150,
        created_at: new Date().toISOString(),
        last_modified_at: new Date().toISOString(),
      };

      addMetricView(view);
      linkToSystem([view.id]);

      addToast({
        type: 'success',
        message: `Metric view "${view.name}" created successfully`,
      });

      setName('');
      setSource('');
      setViewType('standard');
      setDescription('');
      setError(null);

      if (onCreated) {
        onCreated(view.id);
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create metric view';
      setError(errorMessage);
      addToast({ type: 'error', message: errorMessage });
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isCreating && name.trim() && source.trim()) {
      handleCreate();
    }
  };

  return (
    <DraggableModal
      isOpen={isOpen}
      onClose={onClose}
      title={importMode ? 'Import Metric View' : 'Create Metric View'}
      size="lg"
      initialPosition={{
        x: window.innerWidth / 2 - 400,
        y: window.innerHeight / 2 - 300,
      }}
    >
      <div className="space-y-4 max-h-[80vh] overflow-y-auto">
        {/* Mode Toggle */}
        <div className="flex gap-2 border-b pb-3">
          <button
            type="button"
            onClick={() => {
              setImportMode(false);
              setImportYaml('');
              setImportFile(null);
              setError(null);
            }}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded ${
              !importMode
                ? 'bg-amber-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Create New
          </button>
          <button
            type="button"
            onClick={() => {
              setImportMode(true);
              setName('');
              setSource('');
              setViewType('standard');
              setDescription('');
              setError(null);
            }}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded ${
              importMode ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Import
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {importMode ? (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="dbmv-import-file"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Load DBMV YAML File (Optional)
              </label>
              <input
                id="dbmv-import-file"
                type="file"
                accept=".yaml,.yml"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setImportFile(file);
                  if (file) {
                    file
                      .text()
                      .then((text) => setImportYaml(text))
                      .catch(() => addToast({ type: 'error', message: 'Failed to read file' }));
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label
                htmlFor="dbmv-import-yaml"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Or Paste DBMV YAML Content
              </label>
              <textarea
                id="dbmv-import-yaml"
                value={importYaml}
                onChange={(e) => {
                  setImportYaml(e.target.value);
                  setImportFile(null);
                }}
                placeholder="Paste your DBMV YAML here..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-sm"
                rows={15}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                disabled={isImporting}
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                className="px-4 py-2 text-sm bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isImporting || (!importYaml.trim() && !importFile)}
              >
                {isImporting ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="mv-name" className="block text-sm font-medium text-gray-700 mb-2">
                Metric View Name *
              </label>
              <input
                id="mv-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="e.g., Sales Revenue Metrics"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  error && !name.trim() ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isCreating}
              />
            </div>

            <div>
              <label htmlFor="mv-source" className="block text-sm font-medium text-gray-700 mb-2">
                Source Table *
              </label>
              <input
                id="mv-source"
                type="text"
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  setError(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="e.g., catalog.schema.sales_facts"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  error && !source.trim() ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isCreating}
              />
            </div>

            <div>
              <label htmlFor="mv-type" className="block text-sm font-medium text-gray-700 mb-2">
                View Type *
              </label>
              <select
                id="mv-type"
                value={viewType}
                onChange={(e) => setViewType(e.target.value as MetricViewType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                disabled={isCreating}
              >
                <option value="standard">Standard</option>
                <option value="materialized">Materialized</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="mv-description"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Description (Optional)
              </label>
              <textarea
                id="mv-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe the purpose of this metric view"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                rows={3}
                disabled={isCreating}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 text-sm bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isCreating || !name.trim() || !source.trim()}
              >
                {isCreating ? 'Creating...' : 'Create Metric View'}
              </button>
            </div>
          </>
        )}
      </div>
    </DraggableModal>
  );
};
